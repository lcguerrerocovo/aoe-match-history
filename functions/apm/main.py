# Cloud Function entrypoint for APM processing
import time
import io
import json
import os
from datetime import datetime, timezone
import requests
import logging
from mgz.model import parse_match, serialize  # imported here to avoid cost if not needed

# Configure root logger to display info-level logs with timestamps
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')




def _categorize(cmd):
    # mgz actions may expose an Enum (`type`) or raw string (`action`).
    raw = (
        getattr(cmd, "type", None)
        or getattr(cmd, "action", None)
        or getattr(cmd, "operation", None)
    )

    if raw is None:
        return "OTHER"

    if isinstance(raw, str):
        key = raw
    else:
        # Enum or unknown object – try `.name`, else str()
        key = getattr(raw, "name", str(raw))

    return key


def apm_handler(request):
    """Cloud Function entry point for APM processing."""
    # Handle CORS preflight requests
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    # Only allow POST requests
    if request.method != 'POST':
        return (json.dumps({"error": "Method not allowed"}), 405, {'Content-Type': 'application/json'})
    
    try:
        data = request.get_json(force=True)
    except Exception:
        return (json.dumps({"error": "Invalid JSON"}), 400, {'Content-Type': 'application/json'})

    match_id = data.get("gameId")
    profile_id = data.get("profileId")
    replay_data_b64 = data.get("replayData")
    if not match_id or not profile_id:
        return (json.dumps({"error": "Missing gameId or profileId"}), 400, {'Content-Type': 'application/json'})
    match_id = str(match_id)
    profile_id = str(profile_id)

    logging.info("APM request received", extra={"gameId": match_id, "profileId": profile_id, "hasReplayData": bool(replay_data_b64)})

    if replay_data_b64:
        # Use provided replay data (base64-encoded) — no need to re-download
        import base64
        try:
            raw = base64.b64decode(replay_data_b64)
        except Exception as exc:
            return (json.dumps({"error": f"Invalid base64 replayData: {exc}"}), 400, {'Content-Type': 'application/json'})
    else:
        # Fallback: download replay from aoe.ms (backwards compatibility)
        url = f"https://aoe.ms/replay/?gameId={match_id}&profileId={profile_id}"
        logging.info("Downloading replay (no replayData provided)", extra={"url": url})
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code != 200:
                return (json.dumps({"error": f"Replay fetch status {resp.status_code}"}), 404, {'Content-Type': 'application/json'})
            raw = resp.content
        except Exception as exc:
            return (json.dumps({"error": f"Failed to fetch replay: {exc}"}), 502, {'Content-Type': 'application/json'})

    try:
        # Some AoE2 services wrap the replay in a .zip container. If the payload
        # is a valid ZIP, extract the first entry before handing it to mgz.
        data_buf = io.BytesIO(raw)
        try:
            import zipfile
            if zipfile.is_zipfile(data_buf):
                with zipfile.ZipFile(data_buf) as zf:
                    # Grab the first file inside (there is usually only one)
                    first_name = zf.namelist()[0]
                    raw_record = zf.read(first_name)
                    data_buf = io.BytesIO(raw_record)
            else:
                # Not a zip – reset pointer for reading below
                data_buf.seek(0)
        except Exception as zip_exc:
            # If zip detection fails, fall back to original bytes
            logging.warning("ZIP detection failed", extra={"error": str(zip_exc)})
            data_buf.seek(0)

        # Parse replay using mgz.model which is the supported public API
        replay = parse_match(data_buf)
        # `parse_match` returns a Match object whose `actions` list already contains
        # normalized command objects. This is the most stable API exposed by the
        # mgz package and avoids relying on any deprecated helpers such as
        # `mgz.parse()` which was removed in recent versions.
        commands = replay.actions

        # Emit a concise summary of the match for debugging/inspection
        try:
            match_summary = {
                "guid": getattr(replay, "guid", None),
                "dataset": getattr(replay, "dataset", None),
                "duration_ms": getattr(replay, "duration", None),
                "map": getattr(replay, "map", {}).get("name") if getattr(replay, "map", None) else None,
                "players": [
                    {
                        "number": p.number,
                        "name": getattr(p, "name", None),
                        "civilization": getattr(p, "civilization", None),
                        "winner": getattr(p, "winner", None),
                    }
                    for p in getattr(replay, "players", [])
                ],
            }
            # Additionally include first 300 chars of serialized replay for quick inspection
            try:
                serialized = serialize(replay)
                match_summary["serialized_snippet"] = str(serialized)[:300]
            except Exception:
                pass
            logging.debug("Replay summary", extra={"summary": match_summary})
        except Exception as meta_exc:
            # Metadata extraction failure should not block main processing
            logging.warning("Failed to build replay summary", extra={"error": str(meta_exc)})
    except Exception as exc:
        return (json.dumps({"error": f"Failed to parse replay: {exc}"}), 400, {'Content-Type': 'application/json'})

    if not commands:
        return (json.dumps({"error": "No commands found"}), 400, {'Content-Type': 'application/json'})

    # Map in-game player number → persistent profile_id (if available)
    id_map = {
        p.number: str(getattr(p, "profile_id", p.number)) for p in getattr(replay, "players", [])
    }

    actions_by_player: dict[str, dict[int, dict[str, int]]] = {}

    # AoE2 engine runs at 20 simulation steps ("frames") per real-time second. Use that
    FRAME_RATE = 20  # frames per second
    FRAMES_PER_MIN = FRAME_RATE * 60

    for cmd in commands:
        player_attr = getattr(cmd, "player", None)
        if isinstance(player_attr, int):
            pid = player_attr
        elif player_attr is None:
            continue
        else:
            pid = getattr(player_attr, "number", None)
            if pid is None:
                continue
        if pid <= 0:
            continue

        player_key = id_map.get(pid, str(pid))

        ts_val = getattr(cmd, "timestamp", None)
        if ts_val is not None:
            import datetime as _dt
            if isinstance(ts_val, _dt.timedelta):
                minute = int(ts_val.total_seconds() / 60)
            elif isinstance(ts_val, (int, float)):
                # Heuristic: if value looks like ms (large), convert; otherwise assume seconds
                minute = int((ts_val / 1000 if ts_val > 10000 else ts_val) / 60)
            else:
                minute = 0
        else:
            # Fallback to simulation frame number
            frame = getattr(cmd, "frame", None) or getattr(cmd, "ct", None)
            if isinstance(frame, int) and frame >= 0:
                minute = int((frame // FRAMES_PER_MIN))
            else:
                minute = 0
        category = _categorize(cmd)

        p = actions_by_player.setdefault(player_key, {})
        bucket = p.setdefault(minute, {})
        bucket[category] = bucket.get(category, 0) + 1

    # Ensure each minute bucket has a correct 'total' equal to sum of category counts
    for pid, minutes in actions_by_player.items():
        for minute, vals in minutes.items():
            vals["total"] = sum(count for k, count in vals.items() if k != "total")

    # Convert buckets to list form sorted by minute
    players_out = {
        pid: [
            {"minute": int(m), **vals} for m, vals in sorted(minutes.items())
        ]
        for pid, minutes in actions_by_player.items()
    }

    # --- Compute average APM per player over entire game ---
    # Replay duration can be milliseconds or timedelta
    try:
        duration_raw = getattr(replay, "duration", 0)
        
        # Handle different duration formats
        if hasattr(duration_raw, 'total_seconds'):
            # It's a timedelta object
            duration_seconds = duration_raw.total_seconds()
            duration_ms = int(duration_seconds * 1000)
        elif isinstance(duration_raw, (int, float)):
            # It's already in milliseconds
            duration_ms = int(duration_raw)
        else:
            duration_ms = 0
        
        if duration_ms > 0:
            game_minutes = max(1, int(duration_ms / 1000 / 60))
        else:
            # Fallback: calculate from the highest minute bucket
            max_minute = 0
            for pid, buckets in actions_by_player.items():
                if buckets:
                    max_minute = max(max_minute, max(buckets.keys()))
            game_minutes = max(1, max_minute + 1)  # +1 because minutes are 0-indexed
        
        logging.info(f"Game duration: {duration_ms}ms ({game_minutes} minutes)")
    except Exception as e:
        logging.error(f"Error calculating game minutes: {e}")
        game_minutes = None

    avg_apm_by_player: dict[str, int] = {}
    if game_minutes:
        for pid, buckets in actions_by_player.items():
            total_actions = sum(
                vals.get("total", 0) for vals in buckets.values()
            )
            avg_apm = int(round(total_actions / game_minutes))
            avg_apm_by_player[pid] = avg_apm
            logging.info(f"Player {pid}: {avg_apm} APM ({total_actions} actions)")
    else:
        logging.warning("Could not calculate game minutes, skipping averages")

    response_data = {
        "matchId": match_id,
        "profileId": profile_id,
        "processedAt": int(time.time() * 1000),
        "apm": {
            "players": players_out,
            "averages": avg_apm_by_player,
        }
    }
    
    # Add CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    return (json.dumps(response_data), 200, headers)

# Cloud Function entry point
def aoe2_apm_processor(request):
    return apm_handler(request)

# For local development with functions-framework
if __name__ == '__main__':
    import functions_framework
    functions_framework.start(target="aoe2_apm_processor", port=5001) 