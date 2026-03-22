# Match Collector

Cloud Run Job that collects match history data from the Relic API and stores it in PostgreSQL. This is a scaffold -- implementation coming in future sessions.

## Commands

```bash
npm install              # Install dependencies
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled output
npm run dev              # Watch mode (recompile on change)
```

## Docker

```bash
docker build -t match-collector .
docker run match-collector
```

## Status

Scaffold only. The following modules need implementation:
- API client for Relic match history endpoints
- PostgreSQL database layer (schema, queries, connection pooling)
- Collection orchestration (pagination, deduplication, scheduling)
