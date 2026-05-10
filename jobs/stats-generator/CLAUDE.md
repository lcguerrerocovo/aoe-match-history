# Stats Generator

Cloud Run Job that queries BigQuery for civ win rate statistics, resolves civ/map names using version-aware mappings, and uploads the result as JSON to GCS. Uses `balance-patches.json` for patch boundaries and embeds per-civ balance changes into output; falls back to `patches.json` major-patch detection if balance config is unavailable.

## Commands

```bash
npm install              # Install dependencies
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled output
npm run dev              # Watch mode (recompile on change)
```

## Docker

The Dockerfile expects pre-built `dist/` and `node_modules/` -- it does NOT run install or build.
CI handles this: `npm ci -> npm build -> npm prune --production -> docker build`.

```bash
# Local: build first, then Docker
npm install && npm run build && npm prune --production
docker build -t stats-generator .
docker run stats-generator
```

## Module Structure

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Entry point -- calls generateStats(), handles errors |
| `src/stats.ts` | Orchestrator -- loads patches/mappings, queries BigQuery, builds output JSON, uploads to GCS |
| `src/bigquery.ts` | BigQuery query -- aggregates wins/losses/picks by civ, map, match type, ELO bracket, and patch period |
| `src/mappings.ts` | Version-aware civ/map name resolution -- loads patches.json + rl_api_mappings.json + balance-patches.json from CDN. `loadBalancePatches()` fetches curated balance config, `findBalancePatchBoundaries()` picks the two most recent entries as current/previous. Falls back to `findMajorPatches()` if balance config unavailable. |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OUTPUT_BUCKET` | `aoe2.site` | GCS bucket for output JSON |

No secrets required -- uses Application Default Credentials for BigQuery and GCS.

## Output

Writes `data/civ-stats.json` to the output GCS bucket. The file contains:
- `meta` -- generation timestamp, patch versions, ELO brackets, total pick counts (by match type + bracket)
- `1v1` -- per-civ stats for 1v1 ranked (match_type_id 6), keyed by ELO bracket
- `team` -- per-civ stats for team ranked (match_type_id 7, 8, 9), keyed by ELO bracket

ELO brackets: `all`, `<1000`, `1000-1500`, `1500-2000`, `2000+`. Each civ has `current` and `previous` patch period stats with win rate, pick rate, and per-map breakdowns.

## Data Sources

- **BigQuery**: `aoe2-site.matches.raw_matches` table (populated by the collector's Parquet archiver)
- **CDN**: `balance-patches.json` for patch boundaries and per-civ change summaries (primary), `patches.json` for fallback patch boundaries, `rl_api_mappings.json` for civ/map ID resolution
