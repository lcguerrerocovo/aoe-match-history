# Proxy — API Proxy Service (Cloud Run)

TypeScript Cloud Functions Framework service. Bridges the UI to Relic API, Steam API, Meilisearch, and Firestore.

## Module Structure

| File | Responsibility |
|------|---------------|
| `index.ts` | Route table, CORS, dispatcher entry point (`proxy`), re-exports for tests |
| `config.ts` | Logger (pino), env vars, `getFirestoreClient()` singleton, `sleep()` |
| `types.ts` | Shared TypeScript interfaces for all domain types |
| `authService.ts` | Relic authentication, session management, `ensureAuthenticated`, `getAuthenticatedPlayerService`, `withAuthRetry` |
| `steamHandler.ts` | Steam avatar lookup (`handleSteamAvatar`) |
| `matchHandlers.ts` | Automatch history handlers: raw/processed match history, personal stats, single match |
| `fullMatchHistoryHandler.ts` | Full match history handler: merges Relic API + PostgreSQL, deduplicates, paginates |
| `matchHistoryDb.ts` | PostgreSQL queries for historical match data, transforms DB rows to ProcessedMatch |
| `gameMatchHandlers.ts` | Authenticated single-player match history (Relic API), alias resolution |
| `replayDownloadHandler.ts` | Replay download → APM processing pipeline |
| `matchProcessing.ts` | Civ/map mappings, team grouping, match transformation (`processMatch`) |
| `playerSearch.ts` | Meilisearch + Firestore player search |
| `replayService.ts` | Replay availability checks, APM status, `invokeExternalAPM` |
| `decoders.ts` | Options/SlotInfo decoding (base64 + zlib) |
| `relicAuth.ts` | Steam → Relic authentication flow |
| `relicPlayerService.ts` | Authenticated Relic API calls |
| `sessionManager.ts` | Firestore-backed session persistence |

## Commands

```bash
npm run build    # TypeScript compile to dist/
npm run dev      # Build + local dev on :8080
npm test         # Jest tests (ts-jest, no build needed)
npm run test:watch
```

## API Endpoints

| Method | Path | Purpose | Cache |
|--------|------|---------|-------|
| GET | `/api/player-search?name=` | Meilisearch player search (Firestore fallback) | 30 min |
| GET | `/api/match-history/:profileId` | Processed automatch history | 5 min |
| GET | `/api/match-history/:profileId/full` | Full match history (Relic + PostgreSQL, paginated) | 5 min |
| GET | `/api/raw-match-history/:profileId` | Raw automatch history from Relic | 1 min |
| GET | `/api/gamematch-history/:profileIds` | Processed single-player history (authenticated) | 5 min |
| GET | `/api/raw-gamematch-history/:profileIds` | Raw authenticated history | 1 min |
| GET | `/api/match/:matchId` | Single match detail + APM data | no-cache |
| GET | `/api/raw-match/:matchId` | Raw cached match from Firestore | 24h |
| GET | `/api/personal-stats/:profileId` | Player stats from Relic | 1 min |
| GET | `/api/steam/avatar/:steamId` | Steam profile avatar | 24h |
| GET | `/api/check-replay/:gameId/:profileId` | Replay availability check | 5 min |
| GET | `/api/apm-status/:gameId/:profileId` | APM processing state (grey/silver/bronze) | no-cache |
| GET | `/api/apm-status-match/:gameId` | APM status across all players in a match | no-cache |
| POST | `/api/replay-download/:gameId/:profileId` | Download replay → APM processing. Accepts `{replayData}` body (client-side download) or falls back to server-side. | — |

## Authentication Flow

```
Steam credentials (env) → steam-user library → Encrypted App Ticket
→ Relic platformlogin → Session ID (cached in Firestore)
→ Authenticated API calls with sequential callNumber
```

- `RelicAuthClient` manages Steam → Relic auth with ticket reuse
- `SessionManager` wraps Firestore `relic_sessions/current_session` doc
- Single shared session — auto-clears on expiry, retries on 401

## Data Decoding

Match data from Relic uses custom encoding:
- **Options**: base64 → zlib → base64 → key:value pairs
- **SlotInfo**: base64 → zlib → JSON with nested base64 metadata
- **MetaData**: double base64, contains control chars replaced with `-`

Civ/map IDs resolved from `data/rl_api_mappings.json` (loaded lazily, cached in memory).

## Firestore Collections

- `relic_sessions` → single `current_session` doc (auth state)
- `matches` → doc per match ID (raw data + APM results)
- `players` → doc per profile_id (fallback search data)

## Environment Variables

```bash
RELIC_AUTH_STEAM_USER     # Steam account username
RELIC_AUTH_STEAM_PASS     # Steam account password
STEAM_API_KEY             # Steam Web API key (avatar lookups)
MEILISEARCH_HOST          # e.g. http://10.x.x.x:7700
MEILISEARCH_API_KEY       # Meilisearch master key
APM_API_URL               # Python APM function URL
NODE_ENV                  # development | production
LOG_LEVEL                 # pino log level (default: info)
FIRESTORE_EMULATOR_HOST   # localhost:8081 for local dev
DATABASE_URL              # PostgreSQL connection string for match history (optional — falls back to Relic API only)
SIMULATE_LATENCY_MS       # Artificial delay for UI testing (default: 1500)
```

## Gotchas

- Relic API returns `[statusCode, data]` arrays — status 0 = success
- CallNumber must be sequential per session — SessionManager handles this via Firestore increment
- Match storage is background-batched (5 at a time, 100ms delay) — response returns before storage completes
- Replay check: timeouts/errors treated as "available" (false-negative > false-positive)
- Team grouping: if all players share same team number, falls back to grouping by color_id (FFA handling)
- Module-level civ/map caches in `matchProcessing.ts` never invalidate during function lifetime
- `steam-user` lacks types — custom `steam-user.d.ts` declaration covers used methods
- Test files stay as `.js` — ts-jest `js-with-ts` preset handles interop
- Build output goes to `dist/` — Cloud Run serves from there via `--source=dist`
