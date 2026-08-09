#!/usr/bin/env python3
"""
Player Data Collection and Filtering Module

Combines player collection from API with inline filtering for active players.
Used by the indexing job to collect and filter player data before indexing.
"""

import json
import time
import os
import asyncio
import aiohttp
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional

# Configuration
API_BASE_URL = "https://aoe-api.worldsedgelink.com/community/leaderboard/GetPersonalStat"
LEADERBOARD_API = "https://aoe-api.worldsedgelink.com/community/leaderboard/getLeaderBoard2"
# Option B (hybrid ID source): union the leaderboard (all RANKED players, by rank
# — active + inactive-ranked) with PG `collection_state` (players who've appeared
# in collected matches — active, any mode, incl. unranked/quick-match). GetPersonalStat
# then gives all-mode total_matches for the union. Replaces the old blind 1..26M
# profile-ID sweep + MAX_CONSECUTIVE_EMPTY_BATCHES early-exit (which bailed on sparse
# high IDs -> missed players with 0 total_matches). LEADERBOARD_IDS default 3,4 =
# RM 1v1 + RM Team (same as the collector's scanAllLeaderboards).
LEADERBOARD_IDS = [int(x) for x in os.getenv('LEADERBOARD_IDS', '3,4').split(',') if x.strip()]
LEADERBOARD_PAGE_SIZE = 200

# Environment variable configuration with defaults

# Aggressive defaults for Cloud Run Jobs (4Gi RAM, 2 CPU, 1 hour timeout)
RATE_LIMIT_RPS = int(os.getenv('RATE_LIMIT_RPS', '50'))  # API rate limit is 50 RPS
CONCURRENT_REQUESTS = int(os.getenv('CONCURRENT_REQUESTS', '40'))  # Aggressive - double the concurrency
API_BATCH_SIZE = int(os.getenv('API_BATCH_SIZE', '200'))  # API maximum batch size
MAX_CONSECUTIVE_EMPTY_BATCHES = int(os.getenv('MAX_CONSECUTIVE_EMPTY_BATCHES', '3'))  # Faster stopping
ACTIVE_YEARS = float(os.getenv('ACTIVE_YEARS', '2.5'))
MIN_MATCHES = int(os.getenv('MIN_MATCHES', '1'))
TIMEOUT_SECONDS = int(os.getenv('TIMEOUT_SECONDS', '8'))  # Faster timeout
START_PROFILE_ID = int(os.getenv('START_PROFILE_ID', '1'))  # Start from ID 1 (active players exist throughout range)

# Headers matching your existing requests
HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'aoe2-site'
}

class RateLimiter:
    """Async rate limiter to control requests per second"""
    def __init__(self, max_rate: float):
        self.max_rate = max_rate
        self.min_interval = 1.0 / max_rate
        self.last_called = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.time()
            time_passed = now - self.last_called
            if time_passed < self.min_interval:
                sleep_time = self.min_interval - time_passed
                await asyncio.sleep(sleep_time)
            self.last_called = time.time()

def is_recently_active(last_match_date_value: Optional[int], years_threshold: float = ACTIVE_YEARS) -> bool:
    """
    Check if a player has been active within the specified number of years.
    
    Args:
        last_match_date_value: Integer timestamp or null
        years_threshold: Number of years to consider "recently active"
        
    Returns:
        True if player is recently active, False otherwise
    """
    if not last_match_date_value or last_match_date_value == 0:
        return False
    
    try:
        # Convert integer timestamp to datetime
        last_match_date = datetime.fromtimestamp(last_match_date_value, tz=timezone.utc)
        current_date = datetime.now(timezone.utc)
        
        # Calculate the threshold date
        threshold_date = current_date.replace(year=current_date.year - int(years_threshold))
        
        # Debug logging for first few players
        if last_match_date_value <= 10:  # Only log first 10 players
            logging.debug(f"Date check: last_match={last_match_date} ({last_match_date_value}), threshold={threshold_date}, active={last_match_date >= threshold_date}")
        
        return last_match_date >= threshold_date
    except (ValueError, TypeError, OSError) as e:
        # If we can't parse the timestamp, assume they're not recently active
        logging.debug(f"Date parsing error for {last_match_date_value}: {e}")
        return False

def should_include_player(player_data: Dict) -> bool:
    """
    Determine if a player should be included in the filtered dataset.
    
    Args:
        player_data: Player data from API
        
    Returns:
        True if player should be included, False otherwise
    """
    profile_id = player_data.get('profile_id')
    total_matches = player_data.get('total_matches', 0)
    last_match_date = player_data.get('last_match_date')
    name = player_data.get('name')
    alias = player_data.get('alias')
    
    # Debug logging for first few players
    if profile_id and profile_id <= 10:  # Only log first 10 players
        logging.debug(f"Player {profile_id}: matches={total_matches}, last_match={last_match_date}, name='{name}', alias='{alias}'")
    
    # Must have minimum number of matches
    if total_matches < MIN_MATCHES:
        if profile_id and profile_id <= 10:
            logging.debug(f"Player {profile_id}: Excluded - insufficient matches ({total_matches} < {MIN_MATCHES})")
        return False

    # Must have basic required fields (searchable by name/alias)
    if not (profile_id and (name or alias)):
        if profile_id and profile_id <= 10:
            logging.debug(f"Player {profile_id}: Excluded - missing required fields")
        return False
    
    if profile_id and profile_id <= 10:
        logging.debug(f"Player {profile_id}: INCLUDED")
    return True

async def fetch_player_data(session: aiohttp.ClientSession, rate_limiter: RateLimiter, profile_ids: List[int]) -> Optional[List[Dict]]:
    """
    Async fetch player data for one or more profile IDs from the API
    
    Args:
        session: aiohttp session
        rate_limiter: Rate limiter instance
        profile_ids: List of profile IDs to fetch
        
    Returns:
        List of player data dictionaries, or None if failed
    """
    # Format profile IDs for API
    if len(profile_ids) == 1:
        ids_param = f"['{profile_ids[0]}']"
    else:
        ids_str = "','".join(str(pid) for pid in profile_ids)
        ids_param = f"['{ids_str}']"
    
    url = f"{API_BASE_URL}?title=age2&profile_ids={ids_param}"
    id_range = f"{profile_ids[0]}-{profile_ids[-1]}"
    
    # Apply rate limiting
    await rate_limiter.acquire()
    
    try:
        logging.info(f"Fetching data for {len(profile_ids)} profile_ids: {id_range}")
        
        async with session.get(url, headers=HEADERS, timeout=10) as response:
            if response.status != 200:
                logging.error(f"HTTP {response.status} for profile_ids {id_range}")
                return None
                
            data = await response.json()
            
            # Check API result - only process if SUCCESS
            result = data.get('result', {})
            if result.get('message') != 'SUCCESS':
                logging.warning(f"API returned non-SUCCESS for profile_ids {id_range}: {result.get('message', 'Unknown')}")
                return None
                
            # Extract all players from all statGroups
            stat_groups = data.get('statGroups', [])
            if not stat_groups:
                logging.warning(f"No statGroups found for profile_ids {id_range}")
                return None
                
            # Process leaderboard stats to get match counts and last match dates
            leaderboard_stats = data.get('leaderboardStats', [])
            statgroup_data = {}  # statgroup_id -> {total_matches, last_match_date}
            
            for lb_stat in leaderboard_stats:
                statgroup_id = lb_stat.get('statgroup_id')
                if not statgroup_id:
                    continue
                    
                wins = lb_stat.get('wins', 0)
                losses = lb_stat.get('losses', 0)
                last_match = lb_stat.get('lastmatchdate', 0)
                
                if statgroup_id not in statgroup_data:
                    statgroup_data[statgroup_id] = {'total_matches': 0, 'last_match_date': 0}
                
                # Sum matches across leaderboards
                statgroup_data[statgroup_id]['total_matches'] += (wins + losses)
                
                # Keep most recent match date
                if last_match > statgroup_data[statgroup_id]['last_match_date']:
                    statgroup_data[statgroup_id]['last_match_date'] = last_match
            
            # Extract player data with enhanced info and filter
            filtered_players = []
            for stat_group in stat_groups:
                members = stat_group.get('members', [])
                for member in members:
                    statgroup_id = member.get('personal_statgroup_id')
                    enhanced_data = statgroup_data.get(statgroup_id, {'total_matches': 0, 'last_match_date': 0})
                    
                    # Add enhanced stats to each player
                    member['total_matches'] = enhanced_data['total_matches']
                    member['last_match_date'] = enhanced_data['last_match_date'] if enhanced_data['last_match_date'] > 0 else 0
                    
                    # Filter players inline
                    if should_include_player(member):
                        filtered_players.append(member)
            
            if filtered_players:
                logging.info(f"Successfully collected {len(filtered_players)} active players from profile_ids {id_range}")
            else:
                logging.info(f"No active players found in profile_ids {id_range}")
                
            return filtered_players
                
    except asyncio.TimeoutError:
        logging.error(f"Timeout for profile_ids {id_range}")
        return None
    except aiohttp.ClientError as e:
        logging.error(f"Request failed for profile_ids {id_range}: {e}")
        return None
    except json.JSONDecodeError as e:
        logging.error(f"JSON decode failed for profile_ids {id_range}: {e}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error for profile_ids {id_range}: {e}")
        return None

async def process_batch_group(session: aiohttp.ClientSession, rate_limiter: RateLimiter, batch_group: List[List[int]]) -> tuple[int, int, List[Dict]]:
    """
    Process a group of batches concurrently
    
    Args:
        session: aiohttp session
        rate_limiter: Rate limiter instance
        batch_group: List of batch_ids lists to process
        
    Returns:
        tuple: (successful_collections, failed_collections, collected_players)
    """
    tasks = []
    for batch_ids in batch_group:
        task = fetch_player_data(session, rate_limiter, batch_ids)
        tasks.append((task, batch_ids))
    
    if not tasks:
        return 0, 0, []
    
    # Execute all tasks concurrently
    results = await asyncio.gather(*[task for task, _ in tasks], return_exceptions=True)
    
    successful_collections = 0
    failed_collections = 0
    all_collected_players = []
    
    for (task, batch_ids), result in zip(tasks, results):
        id_range = f"{batch_ids[0]}-{batch_ids[-1]}" if batch_ids else "empty"
        
        if isinstance(result, Exception):
            logging.error(f"Task failed for profile_ids {id_range}: {result}")
            failed_collections += 1
        elif result is None:
            failed_collections += 1
        else:
            successful_collections += len(result)
            all_collected_players.extend(result)
    
    return successful_collections, failed_collections, all_collected_players

def save_players_batch(players_data: List[Dict], output_file: str) -> None:
    """
    Append multiple players to the output file in JSONL format
    
    Args:
        players_data: List of player data dictionaries to save
        output_file: File path to write to
    """
    try:
        with open(output_file, 'a', encoding='utf-8') as f:
            for player_data in players_data:
                json.dump(player_data, f, ensure_ascii=False)
                f.write('\n')
        logging.info(f"Saved batch of {len(players_data)} players to {output_file}")
    except Exception as e:
        logging.error(f"Failed to save batch of players: {e}")

def read_pg_profile_ids() -> List[int]:
    """
    Option B: read profile_ids the collector has seen (players who've appeared in
    collected matches — active, any mode incl. unranked/quick-match). `collection_state`
    is one row per collected profile (~165k rows, ~40ms), far faster than
    SELECT DISTINCT profile_id FROM match_player (times out on 39.5M rows).
    Best-effort: if DATABASE_URL is unset or the query fails, return [] (the
    leaderboard source still covers all ranked players).
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        logging.info("DATABASE_URL not set — skipping PG collection_state source")
        return []
    try:
        import pg8000
        conn = pg8000.connect(db_url, timeout=15)
        try:
            cur = conn.execute("SELECT profile_id FROM collection_state")
            ids = [int(r[0]) for r in cur.fetchall()]
            logging.info(f"PG collection_state: {len(ids)} profile_ids (max id {max(ids) if ids else 0})")
            return ids
        finally:
            conn.close()
    except Exception as e:
        logging.warning(f"PG collection_state read failed (best-effort, ignored): {e}")
        return []


async def scan_leaderboards_for_profile_ids(session, rate_limiter: 'RateLimiter') -> List[int]:
    """
    Option B: source RANKED profile_ids from getLeaderBoard2 (rank-paginated). This
    returns the complete set of ranked players by rank (active + inactive-ranked),
    so there's no blind ID sweep / no early-exit / no missed high IDs. Scans
    LEADERBOARD_IDS (default 3,4 = RM 1v1 + RM Team) and dedupes.
    """
    profile_ids: set = set()
    for leaderboard_id in LEADERBOARD_IDS:
        start = 1
        total = 0
        logging.info(f"Scanning leaderboard {leaderboard_id} (rank-paginated)...")
        while True:
            url = (
                f"{LEADERBOARD_API}?title=age2&platform=PC_STEAM"
                f"&leaderboard_id={leaderboard_id}&start={start}&count={LEADERBOARD_PAGE_SIZE}"
            )
            await rate_limiter.acquire()
            try:
                async with session.get(url) as resp:
                    if resp.status != 200:
                        logging.warning(f"leaderboard {leaderboard_id} start={start}: HTTP {resp.status}; stopping this board")
                        break
                    data = await resp.json()
                    result = data.get('result', {})
                    if result.get('message') != 'SUCCESS':
                        logging.warning(f"leaderboard {leaderboard_id} start={start}: {result.get('message')}; stopping")
                        break
                    rank_total = data.get('rankTotal', 0) or 0
                    if not total:
                        total = rank_total
                        logging.info(f"leaderboard {leaderboard_id}: rankTotal={total}")
                    stat_groups = data.get('statGroups', []) or []
                    if not stat_groups:
                        break
                    for sg in stat_groups:
                        for m in (sg.get('members') or []):
                            pid = m.get('profile_id')
                            if pid is not None:
                                profile_ids.add(int(pid))
                    start += LEADERBOARD_PAGE_SIZE
                    if start > (total or start):  # done once we pass rankTotal
                        break
            except Exception as e:
                logging.error(f"leaderboard {leaderboard_id} start={start}: {e}; stopping this board")
                break
        logging.info(f"leaderboard {leaderboard_id}: scanned through start={start}")
    ids = sorted(profile_ids)
    logging.info(f"Leaderboard scan complete: {len(ids)} unique ranked profile_ids across {LEADERBOARD_IDS}")
    return ids


async def collect_active_players(output_file: str, start_profile_id: int = START_PROFILE_ID) -> tuple[int, int]:
    """
    Collect and filter players. Option B (hybrid ID source): union the leaderboard
    (all ranked players, by rank — active + inactive-ranked) with PG collection_state
    (players who've appeared in collected matches — active, any mode), then call
    GetPersonalStat for each to get all-mode total_matches (sum wins+losses across
    all leaderboards). No blind 1..26M sweep, no early-exit heuristic, no missed
    high IDs. The hybrid's max profile_id also reveals the effective "true max".
    """
    logging.info("Starting player data collection (hybrid: leaderboard + PG, Option B)")
    logging.info(f"Rate limit: {RATE_LIMIT_RPS} requests per second")
    logging.info(f"Concurrent requests: {CONCURRENT_REQUESTS}")
    logging.info(f"API batch size: {API_BATCH_SIZE} IDs per request")
    logging.info(f"Active years: {ACTIVE_YEARS}")
    logging.info(f"Min matches: {MIN_MATCHES}")
    logging.info(f"Leaderboard IDs (ranked source): {LEADERBOARD_IDS}")
    logging.info(f"Output file: {output_file}")

    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w'):
        pass  # Create empty file

    successful_collections = 0
    failed_collections = 0
    batch_count = 0

    rate_limiter = RateLimiter(RATE_LIMIT_RPS)
    timeout = aiohttp.ClientTimeout(total=TIMEOUT_SECONDS)

    async with aiohttp.ClientSession(timeout=timeout) as session:
        # 1. Source the profile IDs to fetch: leaderboard (ranked) + PG (active any-mode).
        leaderboard_ids = await scan_leaderboards_for_profile_ids(session, rate_limiter)
        pg_ids = read_pg_profile_ids()
        profile_ids = sorted(set(leaderboard_ids) | set(pg_ids))
        if not profile_ids:
            logging.error("No profile IDs from leaderboard or PG — aborting")
            return 0, 0
        logging.info(f"Hybrid ID source: {len(profile_ids)} unique profile_ids "
                     f"(leaderboard {len(leaderboard_ids)} + PG {len(pg_ids)}); "
                     f"max id {profile_ids[-1]} (effective 'true max')")

        # 2. Fetch all-mode stats for those IDs in batches (no early-exit; real list).
        i = 0
        total_ids = len(profile_ids)
        while i < total_ids:
            batch_group = []
            for _ in range(CONCURRENT_REQUESTS):
                if i >= total_ids:
                    break
                batch_group.append(profile_ids[i:i + API_BATCH_SIZE])
                i += API_BATCH_SIZE
            try:
                group_successful, group_failed, collected_players = await process_batch_group(
                    session, rate_limiter, batch_group
                )
                successful_collections += group_successful
                failed_collections += group_failed
                batch_count += len(batch_group)
                if collected_players:
                    collected_players.sort(key=lambda p: p['profile_id'])
                    save_players_batch(collected_players, output_file)
                if (batch_count // CONCURRENT_REQUESTS) % 5 == 0:
                    logging.info(f"Progress: {batch_count} batches, {successful_collections} players, {i}/{total_ids} IDs fetched")
            except KeyboardInterrupt:
                logging.info("Collection interrupted by user")
                break
            except Exception as e:
                logging.error(f"Unexpected error processing batch group: {e}")
                failed_collections += len(batch_group)
                continue

    final_id = profile_ids[-1] if profile_ids else 0
    logging.info("Collection completed!")
    logging.info(f"Total batches processed: {batch_count}")
    logging.info(f"Total players collected: {successful_collections}")
    logging.info(f"Hybrid IDs fetched: {len(profile_ids)} (max id: {final_id})")
    logging.info(f"Data saved to: {output_file}")
    return successful_collections, final_id

if __name__ == "__main__":
    # For testing the module independently
    import sys
    
    output_file = sys.argv[1] if len(sys.argv) > 1 else "/tmp/active_players.jsonl"
    start_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    asyncio.run(collect_active_players(output_file, start_id)) 