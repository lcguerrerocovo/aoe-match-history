# Meilisearch VM — Search Infrastructure

GCE e2-micro VM running Meilisearch v1.7.3 in Docker. Provides typo-tolerant player name search for the UI via the proxy.

## How It Works

Snapshot-driven: the indexing job builds the search index, creates a snapshot, uploads to GCS. The VM imports the latest snapshot on boot.

```
indexing-job → GCS snapshot → VM imports → proxy queries → UI search
```

## Scripts

- `deploy-vm.sh` — Creates/updates the GCE VM (e2-micro, cos-stable, 10GB disk). Sets firewall rules (7700 internal-only, 22 public SSH).
- `startup.sh` — VM boot script: fetches master key from metadata, starts Meilisearch Docker container.
- `meilisearch-wrapper.sh` — Post-boot orchestration: imports snapshot, applies settings, verifies index has documents.
- `meilisearch_config.json` — Index settings (searchable: `alias`, filterable: country/clan/matches/date, ranking prioritizes exactness then match count). **Must stay in sync with `indexing-job/meilisearch_config.json`.**

## Deployment

```bash
export MEILI_MASTER_KEY="..." GCP_PROJECT_ID="aoe2-site"
bash aoe-search/deploy-vm.sh
```

No CI pipeline — deployed manually when VM config changes. Day-to-day data updates come through snapshots from the indexing job.

## Updating Meilisearch Version

Version v1.7.3 is pinned in 3 files — use `scripts/check-versions.sh` to verify consistency:
1. `aoe-search/startup.sh`
2. `aoe-search/meilisearch-wrapper.sh`
3. `indexing-job/Dockerfile.indexer`

## Local Dev

SSH tunnel to the production VM for local proxy/UI development:
```bash
bash scripts/tunnel-meilisearch.sh  # localhost:7700 → VM:7700
```

## Gotchas

- `MEILI_MASTER_KEY` is passed via GCP metadata — never log or commit it
- VM data lives on `/mnt/stateful_partition/` — survives restart but not VM deletion
- Startup script runs fresh every boot and cleans the data dir — state comes entirely from snapshots
- Firewall: port 7700 is internal-only (10.0.0.0/8), SSH is public
