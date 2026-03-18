---
name: aoe2-relic-api
description: Use when working with AoE2 match history API, updating civilization or map mappings, debugging API responses, adding new civs/maps, or adapting to game patches that add content. Also use when civ IDs show as numbers instead of names, or maps display as "Unknown".
---

# AoE2 Relic API Reference

## Overview

This project uses the **RelicLink / World's Edge API** (`aoe-api.worldsedgelink.com`) to fetch AoE2:DE match history, player stats, and player search. The API requires Steam authentication for some endpoints and uses custom encoding (base64 + zlib) for match data. Civilization and map IDs change across API versions, tracked in `data/rl_api_mappings.json`.

## Architecture

```
UI (React) → Cloud Function Proxy (functions/proxy/) → RelicLink API
                                                      → Steam API
                                                      → Meilisearch
```

- **Public endpoint** (no auth): `community/leaderboard/getRecentMatchHistory` — used for match history
- **Authenticated endpoints** (require session): `game/account/FindProfiles`, `game/Leaderboard/getRecentMatchHistory`
- **Static mappings**: `data/rl_api_mappings.json` served via CDN, maps numeric IDs to names

## Authentication Flow

```
Steam Login (username/password)
  → Get Encrypted App Ticket (AppID 813780, "RLINK")
  → POST aoe-api.worldsedgelink.com/game/login/platformlogin
  → Returns sessionId
  → Session stored in Firestore, reused for 30 min
```

Key files: `functions/proxy/relicAuth.js`, `functions/proxy/sessionManager.js`

## API Endpoints Used

### Public (no auth needed)
| Endpoint | Purpose | File |
|----------|---------|------|
| `community/leaderboard/getRecentMatchHistory?title=age2&profile_ids=["ID"]` | Match history | `functions/proxy/index.js` → `handleRawMatchHistory()` |
| `https://aoe.ms/replay/?gameId=X&profileId=Y` | Replay availability check | `functions/proxy/index.js` → `checkReplayAvailability()` |

### Authenticated (require session)
| Endpoint | Purpose | File |
|----------|---------|------|
| `game/login/platformlogin` | Get session | `functions/proxy/relicAuth.js` |
| `game/account/FindProfiles` | Player search | `functions/proxy/relicPlayerService.js` |
| `game/Leaderboard/getRecentMatchHistory` | Auth'd match history | `functions/proxy/relicPlayerService.js` |

### External
| Endpoint | Purpose |
|----------|---------|
| Steam `ISteamUser/GetPlayerSummaries/v0002` | Player avatars |
| Meilisearch `/indexes/players/search` | Fast player search |

## Data Encoding

Match responses include encoded fields that need decoding:

### Options field (match settings)
```
base64 → zlib inflate → strip quotes → base64 → key:value pairs
```
Decoded to `{ "10": mapId, ... }` — key `"10"` is the map ID.

### SlotInfo field (player details)
```
base64 → zlib inflate → skip to first comma → JSON parse → decode metaData per player
```
Each player's `metaData`: double base64 decode → parse control chars → extract `civId`, `colorId`, `teamId`.

Key file: `functions/proxy/decoders.js`

## Civilization & Map Mapping System

### Structure of `data/rl_api_mappings.json`

```json
{
  "civs": {
    "aoe2": {
      "CivName": {
        "1": numericId,  // API version 1
        "2": numericId,  // API version 2
        "3": numericId,  // API version 3
        "4": numericId,  // API version 4
        "5": numericId   // API version 5 (latest)
      }
    },
    "ror": { /* Return of Rome civs, same structure */ }
  },
  "maps": {
    "aoe2": { /* same structure as civs */ },
    "ror": { /* Return of Rome maps */ }
  }
}
```

- **Version keys ("1"-"5")**: Represent different API schema versions. The API has changed civ/map IDs across game patches.
- **Value `-1`**: Civ/map did not exist in that API version.
- **Value `-2`**: Map existed but ID unknown for that version.
- The code uses `Math.max(...versionNumbers)` to get the latest version's ID for lookups.

### How Mappings Are Used

Both the **Cloud Function** (`functions/proxy/index.js`) and the **UI** (`ui/src/utils/mappingUtils.ts`) build reverse lookup maps:

```javascript
// Build: numericId → civName (using latest version)
for (const [civName, versions] of Object.entries(mappings.civs.aoe2)) {
  const latestVersion = Math.max(...Object.keys(versions).map(Number));
  const civId = versions[latestVersion.toString()];
  civMap[civId.toString()] = civName;
}
```

### Match Type IDs

Defined in `functions/proxy/index.js` → `getGameType()` and `ui/src/utils/gameUtils.ts`:

| matchtype_id | Game Type |
|---|---|
| 0 | Unranked |
| 6 | RM 1v1 |
| 7-9 | RM Team |
| 2 | DM 1v1 |
| 3-5 | DM Team |
| 18 | Quick Match RM |
| 19-21 | Quick Match RM Team |
| 26 | EW 1v1 |
| 27-29 | EW Team |

## Discovering API Changes (New Civs/Maps)

### Step 1: Check the reference data source

Authoritative civ list with IDs:
```
https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json
```
This JSON has `[{ "name": "CivName", "id": numericId }, ...]` for all civs in the current game version.

### Step 2: Compare against current mappings

Compare civs in `100.json` against `data/rl_api_mappings.json` → `civs.aoe2`. Any civ in the reference but not in mappings needs to be added.

### Step 3: Verify IDs via live API

Fetch a recent match where the new civ was played:
```bash
curl "https://aoe-api.worldsedgelink.com/community/leaderboard/getRecentMatchHistory?title=age2&profile_ids=[\"PROFILE_ID\"]"
```
Decode the response's slotInfo to find `civilization_id` values and confirm they match the reference data.

### Step 4: Update mappings

Add new entry to `data/rl_api_mappings.json`:
```json
"NewCivName": {
  "1": -1,
  "2": -1,
  "3": -1,
  "4": -1,
  "5": numericIdFromReference
}
```
Use `-1` for versions before the civ existed. Use the ID from `100.json` for the latest version.

### Step 5: Add civ icon

Place `civname.png` (lowercase, no spaces) in `ui/src/assets/civ_icons/`.

Check `ui/src/utils/assetManager.ts` → `getCivIcon()` for special cases (e.g., `Aztec` → `aztecs.png`, `Lac Viet` → `lacviet.png`). Add a special case if the civ name doesn't normalize cleanly.

### Step 6: Purge CDN cache

After deploying updated `rl_api_mappings.json`:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"files": ["https://aoe2.site/data/rl_api_mappings.json"]}'
```

## Community Reference Links

These are tracked in `README.md` under "Data/API References":

- [RelicLink API Swagger](https://app.swaggerhub.com/apis/simonsan/RelicLinkCommunityAPI_OA3/0.1#/)
- [RecentMatchHistory docs](https://wiki.librematch.org/rlink/game/leaderboard/getrecentmatchhistory)
- [SiegeEngineers reference data](https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json)
- [edgelink-api-client](https://github.com/oliverfenwick90/edgelink-api-client/blob/main/src/util.ts#L3) — TypeScript API client reference
- [ageLANServer](https://github.com/luskaner/ageLANServer/) — alternative API implementation
- [librematch-collector](https://github.com/librematch/librematch-collector/) — slot metadata parsing, leaderboard mapping
- [aoe2companion](https://github.com/denniske/aoe2companion) — community app with similar API usage
- [librematch steam auth](https://github.com/librematch/librematch-steam_auth/blob/main/poc_steam_proxy/__init__.py)

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Civ shows as numeric ID | Missing from `rl_api_mappings.json` | Add civ with correct ID |
| Map shows as empty/unknown | Map ID not in mappings, or options key `"10"` missing | Add map to mappings |
| "Session expired" errors | Relic session >30 min old | Session auto-refreshes; check Firestore |
| Player search returns empty | Meilisearch index stale or auth failure | Re-index or check session |
| New civ icon not showing | Icon file missing or name mismatch | Add to `civ_icons/`, check `assetManager.ts` special cases |
| API returns garbled data | Encoding changed | Check `decoders.js`, compare with librematch-collector |

## Files to Touch When Adding New Civs

1. `data/rl_api_mappings.json` — add civ entry with version→ID mapping
2. `ui/src/assets/civ_icons/{name}.png` — add icon file
3. `ui/src/utils/assetManager.ts` — add special case if name doesn't normalize (optional)
4. Deploy and purge CDN cache
