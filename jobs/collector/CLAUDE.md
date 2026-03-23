# Match Collector

Cloud Run Job that collects match history data from the Relic API and stores it in PostgreSQL.

## Commands

```bash
npm install              # Install dependencies
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled output
npm run dev              # Watch mode (recompile on change)
```

## Migrations (node-pg-migrate)

```bash
DATABASE_URL=postgresql://collector:pass@host:5432/aoe2_matches npm run migrate:up    # Apply migrations
DATABASE_URL=postgresql://collector:pass@host:5432/aoe2_matches npm run migrate:down  # Roll back last migration
npm run migrate:create -- my-migration-name                                           # Create new migration file
```

Migration files live in `migrations/`. Schema changes should always go through a migration, never applied directly.

## Docker

```bash
docker build -t match-collector .
docker run match-collector
```

## Module Structure

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Entry point — wires up DB + Collector, handles errors |
| `src/collector.ts` | Orchestrator — scan → diff → fetch → store flow |
| `src/api.ts` | Relic API client — leaderboard scanning, match history fetching |
| `src/db.ts` | PostgreSQL layer — upsert matches/players/raw, collection state |
| `src/decoders.ts` | Options/SlotInfo decoding (base64 + zlib), copied from proxy |
| `src/mappings.ts` | Civ/map ID resolution from CDN mappings file |
| `src/types.ts` | TypeScript interfaces for Relic API responses + leaderboard data |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `RATE_LIMIT_RPS` | 10 | Relic API requests/second (API limit is 50) |
| `COLLECTOR_CONCURRENCY` | 5 | Number of parallel batch workers |

## Running Locally

```bash
# Terminal 1: Open SSH tunnel to PostgreSQL VM
bash scripts/tunnel-postgres.sh

# Terminal 2: Build and run
npm run build
DATABASE_URL=postgresql://collector:pass@localhost:5432/aoe2_matches npm start
```
