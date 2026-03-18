# Indexing Job — Meilisearch Player Index Builder

Cloud Run Job that collects active AoE2 players from the Relic API, indexes them into Meilisearch, snapshots the index, and uploads to GCS. Runs every 6 hours via Cloud Scheduler.

## How It Works

1. `player_collector.py` — Async fetches player profiles from Relic API, filters by activity (last 2.5 years, ≥1 match)
2. `indexer.py` — Starts local Meilisearch in the container, indexes players in batches of 2,500, creates snapshot
3. Snapshot + metadata + fingerprint uploaded to `gs://aoe2-site-data/snapshots/`
4. Triggers VM restart so `aoe-search` imports the latest snapshot

## Running Locally

```bash
cd indexing-job/scripts
./run-indexer.sh          # Build image + run with conservative test settings
./run-indexer.sh false    # Pull prod image instead of building
```

Uses conservative defaults (high start ID, low concurrency, skips GCS upload).

## Deployment

Push to `master` with changes in `indexing-job/**` triggers `.github/workflows/deploy-indexing-job.yml`:
- Builds Docker image → Artifact Registry (`us-central1-docker.pkg.dev/aoe2-site/meilisearch/meilisearch-indexer`)
- Deploys/updates Cloud Run Job (4GB RAM, 2 CPU, 1hr timeout)
- Creates/updates Cloud Scheduler (`0 */6 * * *`)

Manual trigger: `gcloud run jobs execute meilisearch-indexing-job --region us-central1`

## Key Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `RATE_LIMIT_RPS` | 50 | Relic API requests/second |
| `CONCURRENT_REQUESTS` | 40 | Parallel API requests |
| `API_BATCH_SIZE` | 200 | Profile IDs per API request |
| `START_PROFILE_ID` | 1 | Starting profile ID |
| `ACTIVE_YEARS` | 2.5 | Include players active in last N years |
| `MIN_MATCHES` | 1 | Minimum matches to include |
| `MAX_CONSECUTIVE_EMPTY_BATCHES` | 3 | Stop after N empty batch groups |
| `SKIP_GCS_UPLOAD` | false | Skip GCS upload (local testing) |

## Files

- `Dockerfile.indexer` — Multi-stage Alpine build, includes Meilisearch v1.7.3
- `entrypoint.sh` — Production entrypoint: starts Meilisearch, runs indexer, handles cleanup
- `indexer.py` — Main indexing orchestrator (Meilisearch client, batching, snapshot, GCS upload)
- `player_collector.py` — Async Relic API client with rate limiting and filtering
- `meilisearch_config.json` — Index settings. **Must stay in sync with `aoe-search/meilisearch_config.json`.**
- `scripts/run-indexer.sh` — Local testing harness with snapshot verification

## Gotchas

- Meilisearch v1.7.3 pinned in `Dockerfile.indexer` — must match `aoe-search/` files, verify with `scripts/check-versions.sh`
- `meilisearch_config.json` is duplicated in `aoe-search/` — changes must be made in both places
- Collection stops after `MAX_CONSECUTIVE_EMPTY_BATCHES` empty groups, not a fixed profile ID range
- Fingerprint is SHA256 of sampled documents (50) — used to detect index changes
- VM restart failure is non-fatal; GCS upload failure is fatal
