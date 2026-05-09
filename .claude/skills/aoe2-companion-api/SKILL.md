---
name: aoe2-companion-api
description: Use when verifying civ/map data against a trusted source, cross-referencing match details, checking player match history from an external API, or when the Relic API data seems wrong and needs validation. The companion API has accurate civ names and match data.
---

# AoE2 Companion API Reference

## Overview

The [AoE2 Companion](https://github.com/denniske/aoe2companion) app maintains a public API at `data.aoe2companion.com` that provides match history with resolved civilization names, player ratings, and match metadata. Unlike the Relic API which uses numeric IDs, the companion API returns human-readable civ names (`civName`) making it useful for verifying our civ ID mappings.

## API Base URL

```
https://data.aoe2companion.com/api/
```

## Endpoints

### Get Matches by Profile

```
GET /api/matches?profile_ids=<profile_id>
```

**Parameters:**
- `profile_ids` (required) — numeric profile ID (single value, not array)
- `count` — number of matches to return (default 20, API caps at 20 regardless)

**Example:**
```bash
curl -s "https://data.aoe2companion.com/api/matches?profile_ids=199325"
```

**Response structure:**
```json
{
  "page": 1,
  "perPage": 20,
  "total": null,
  "matches": [
    {
      "matchId": 476425705,
      "started": "2026-05-09T04:53:40.000Z",
      "finished": "2026-05-09T05:19:08.000Z",
      "leaderboard": "rm_team",
      "leaderboardName": "Team Random Map",
      "name": "AUTOMATCH",
      "map": "rm_arena",
      "mapName": "Arena",
      "mapImageUrl": "https://backend.cdn.aoe2companion.com/public/aoe2/de/maps/rm_arena.png",
      "gameMode": "random_map",
      "population": 200,
      "speed": 2,
      "teams": [
        {
          "teamId": 1,
          "players": [
            {
              "profileId": 199325,
              "name": "Hera",
              "rating": 1697,
              "ratingDiff": 14,
              "civ": "gurjaras",
              "civName": "Gurjaras",
              "civImageUrl": "https://backend.cdn.aoe2companion.com/...",
              "color": 2,
              "colorHex": "#FF0000",
              "slot": 6,
              "won": true,
              "country": "ca"
            }
          ]
        }
      ]
    }
  ]
}
```

**Key player fields:**
- `civ` — lowercase slug (e.g., `"gurjaras"`)
- `civName` — display name (e.g., `"Gurjaras"`)
- `color` — player color number (1-8)
- `colorHex` — hex color string
- `rating` — current ELO rating
- `ratingDiff` — rating change from this match
- `won` — boolean win/loss

### No Direct Match Lookup

The API does **not** support looking up a match by match_id directly. You must query via `profile_ids` and search the returned matches for the one you want. Since the API only returns ~20 recent matches, old matches may not be accessible.

## Common Use Cases

### Verify Civ ID Mapping

When we suspect our `rl_api_mappings.json` has wrong civ IDs, find a match where the disputed civ was played:

1. Get a match_id and profile_id from BigQuery or live matches
2. Query the companion API: `GET /api/matches?profile_ids=<profile_id>`
3. Find the match in the response and check `civName`
4. Compare against what our mapping resolves

This is how we confirmed Muisca=58, Mapuche=59, Tupi=60 (our mappings had them at 56, 57, 58).

### Check Map Accuracy

The companion API returns `mapName` which is always accurate (unlike `findObservableAdvertisements` which returns unreliable filenames). Useful for verifying live match map data.

### Find All Civs a Player Has Used

```bash
curl -s "https://data.aoe2companion.com/api/matches?profile_ids=199325" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); \
  civs=set(); \
  [civs.add(p['civName']) for m in d['matches'] for t in m['teams'] for p in t['players']]; \
  print(sorted(civs))"
```

## Limitations

- **20 matches max** per request regardless of `count` parameter
- **No match_id lookup** — must search by profile_id
- **Recent matches only** — old matches (months ago) won't appear
- **No civ ID** in response — only civ slug and display name (no numeric ID)
- **Rate limiting** — unknown limits, use conservatively

## Source Code

- Repository: `github.com/denniske/aoe2companion`
- Civ data: `data/src/helper/civs.ts` and `dataset2/src/data/aoe2/civs.data.ts`
- The civ list in the source code uses array index positions, not Relic API IDs
- The app resolves civ names internally — the mapping between Relic IDs and names is not publicly exposed in the repo

## Reliability

The companion API is **more reliable than SiegeEngineers' 100.json** for current civ data. When 100.json had stale IDs for Muisca/Mapuche/Tupi, the companion API returned correct names. Use it as the primary verification source when our mappings seem wrong.
