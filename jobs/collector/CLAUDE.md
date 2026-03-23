# Match Collector

Cloud Run Job that collects match history data from the Relic API and stores it in PostgreSQL.

## Commands

```bash
pnpm install             # Install dependencies (pnpm is canonical — CI uses frozen lockfile)
pnpm run build           # Compile TypeScript to dist/
pnpm start               # Run compiled output
pnpm run dev             # Watch mode (recompile on change)
```

## Migrations (node-pg-migrate)

```bash
DATABASE_URL=postgresql://collector:pass@host:5432/aoe2_matches pnpm run migrate:up    # Apply migrations
DATABASE_URL=postgresql://collector:pass@host:5432/aoe2_matches pnpm run migrate:down  # Roll back last migration
pnpm run migrate:create -- my-migration-name                                           # Create new migration file
```

Migration files live in `migrations/`. Schema changes should always go through a migration, never applied directly.

## Docker

The Dockerfile expects pre-built `dist/` and `node_modules/` — it does NOT run install or build.
CI handles this: `pnpm install → pnpm build → pnpm prune --prod → docker build`.

```bash
# Local: build first, then Docker
pnpm install && pnpm run build && pnpm prune --prod
docker build -t match-collector .
docker run -e DATABASE_URL=... match-collector
```

## Module Structure

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Entry point — wires up DB + Collector, handles errors |
| `src/collector.ts` | Orchestrator — scan → diff → fetch → store flow |
| `src/api.ts` | Relic API client — leaderboard scanning, match history fetching |
| `src/db.ts` | PostgreSQL layer — upsert matches/players, collection state |
| `src/raw-archive.ts` | Parquet archiver — buffers raw match JSON, writes to GCS |
| `src/decoders.ts` | Options/SlotInfo decoding (base64 + zlib), copied from proxy |
| `src/mappings.ts` | Civ/map ID resolution from CDN mappings file |
| `src/types.ts` | TypeScript interfaces for Relic API responses + leaderboard data |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `RATE_LIMIT_RPS` | 10 | Relic API requests/second (API limit is 50). **Prod: 40** |
| `COLLECTOR_CONCURRENCY` | 5 | Number of parallel batch workers. **Prod: 20** |
| `RAW_ARCHIVE_BUCKET` | `aoe2-site-backups` | GCS bucket for raw match Parquet archives |

Prod values are set in `deploy-collector-job.yml`, not via env var defaults.

## Running Locally

```bash
# Terminal 1: Open SSH tunnel to PostgreSQL VM
bash scripts/tunnel-postgres.sh

# Terminal 2: Build and run
pnpm run build
DATABASE_URL=postgresql://collector:pass@localhost:5432/aoe2_matches pnpm start
```
