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

## Status

Scaffold with database schema. The following modules need implementation:
- API client for Relic match history endpoints
- PostgreSQL database layer (queries, connection pooling)
- Collection orchestration (pagination, deduplication, scheduling)
