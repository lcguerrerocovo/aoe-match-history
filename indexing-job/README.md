# Meilisearch Indexing Job

This directory contains the Cloud Run job for building and maintaining the Meilisearch index for player search functionality.

## Overview

The indexing job:
1. Downloads `active_players.jsonl` from Google Cloud Storage
2. Starts a local Meilisearch instance
3. Indexes all players with searchable fields (name, clan, country)
4. Creates a snapshot of the index
5. Uploads the snapshot back to GCS for later restoration

## Files

- `Dockerfile.indexer` - Alpine-based Docker image with Meilisearch and Google Cloud SDK
- `entrypoint.sh` - Main script that orchestrates the indexing process
- `indexer.py` - Python script that reads JSONL and indexes players into Meilisearch
- `build_and_deploy_indexer.sh` - Script to build and deploy the Cloud Run job

## Usage

### Prerequisites

1. Ensure `active_players.jsonl` exists in `gs://aoe2-site-data/`
2. The service account (`aoe2-site-bot@aoe2-site.iam.gserviceaccount.com`) needs:
   - `roles/artifactregistry.admin` (for creating repositories and pushing images)
   - `roles/run.admin` (for deploying Cloud Run jobs)
   - `roles/cloudscheduler.admin` (for creating scheduled jobs)
   - `roles/storage.admin` (for accessing GCS)
3. Artifact Registry repository `meilisearch` should exist in `us-central1`

### Build and Deploy

```bash
cd indexing-job
chmod +x build_and_deploy_indexer.sh
./build_and_deploy_indexer.sh
```

### Run the Job

The job is automatically scheduled to run every 6 hours via Cloud Scheduler.

**Manual execution:**
```bash
gcloud run jobs execute meilisearch-indexing-job --region us-central1
```

**Check scheduler:**
```bash
gcloud scheduler jobs describe meilisearch-indexing-scheduler --location=us-central1
```

### Restore Snapshot on Production VM

After the job completes, download the latest snapshot from GCS and restore it:

```bash
# Download latest snapshot
gsutil ls gs://aoe2-site-data/meilisearch-snapshot-*.snapshot | tail -1 | xargs gsutil cp - /tmp/latest.snapshot

# Restore on production VM (stop Meilisearch first)
sudo systemctl stop meilisearch
sudo mv /tmp/latest.snapshot /var/lib/meilisearch/data/snapshots/
sudo systemctl start meilisearch
```

## Configuration

### Searchable Fields
- `name` - Player name
- `clanlist_name` - Clan name
- `country` - Country code

### Index Settings
- Ranking rules: words, typo, proximity, attribute, sort, exactness
- Batch size: 1000 players per batch
- Memory: 2GB
- CPU: 2 cores
- Timeout: 1 hour

## Troubleshooting

- Check Cloud Run job logs for detailed execution information
- Ensure GCS bucket permissions are correct
- Verify the JSONL file format matches expected schema
- Monitor snapshot creation and upload success 