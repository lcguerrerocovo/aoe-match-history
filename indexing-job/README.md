# Meilisearch Indexing Job

This directory contains the Cloud Run job for building and maintaining the Meilisearch index for player search functionality.

## Overview

The indexing job:
1. Collects and filters active players from the AOE API
2. Starts a local Meilisearch instance
3. Applies index settings from `meilisearch_config.json`
4. Indexes all players with searchable fields (name, clan, country)
5. Creates a snapshot of the index (includes settings)
6. Uploads the snapshot back to GCS for later restoration
7. **NEW**: Automatically triggers VM restart with latest snapshot

## Files

- `Dockerfile.indexer` - Alpine-based Docker image with Meilisearch and Google Cloud SDK
- `entrypoint.sh` - Main script that orchestrates the indexing process
- `indexer.py` - Python script that reads JSONL and indexes players into Meilisearch
- `build_and_deploy_indexer.sh` - Script to build and deploy the Cloud Run job
- `scripts/run-indexer.sh` - Local testing script with indexing and hot-swap modes
- `scripts/entrypoint-local.sh` - Local entrypoint script for testing

## Local Testing

You can test the indexing job locally using Docker with a comprehensive testing workflow that mirrors the production pipeline.

### Prerequisites for Local Testing

1. Docker installed and running
2. Google Cloud SDK authenticated (`gcloud auth login`)
3. Access to the Artifact Registry repository

### Enhanced Local Testing Workflow

The local test script provides a complete testing environment:

```bash
cd indexing-job/scripts
./run-indexer.sh
```

**What the enhanced local test does:**

1. **🧹 Clears existing data** - Removes any previous test data to start fresh
2. **🚀 Runs indexing job** - Collects player data from API and creates snapshot
3. **📦 Starts persistent container** - Imports the snapshot into a test Meilisearch instance
4. **📊 Verifies document count** - Confirms snapshot import worked correctly
5. **🧪 Keeps running for testing** - Container stays up until you press Ctrl+C
6. **🧹 Cleanup** - Removes everything when done

**Test Output Example:**
```
✅ Indexing job complete!
🚀 Starting persistent Meilisearch container with snapshot...
📦 Found timestamped snapshot: data.ms.snapshot
✅ Meilisearch container started successfully!
🌐 Access at: http://localhost:7700
🔑 Master key: a-secure-master-key-change-this

📊 Verifying document count...
✅ Snapshot import successful: 599 documents loaded

🛑 Press Ctrl+C to stop and cleanup
```

### Local Testing Parameters

You can customize the local test behavior using environment variables:

```bash
# Test with conservative rate limiting
RATE_LIMIT_RPS=20 CONCURRENT_REQUESTS=5 ./run-indexer.sh

# Test with different collection criteria
ACTIVE_YEARS=2.5 MIN_MATCHES=0 ./run-indexer.sh

# Test starting from a specific profile ID
START_PROFILE_ID=23000000 ./run-indexer.sh

# Test with quick stopping (for debugging)
MAX_CONSECUTIVE_EMPTY_BATCHES=3 ./run-indexer.sh
```

### Testing the Snapshot Functionality

The local test specifically validates:
- **Data collection** - API calls and filtering work correctly
- **Snapshot creation** - Meilisearch creates proper snapshot files
- **Snapshot import** - Documents are correctly restored from snapshot
- **Document count verification** - Ensures no data loss during snapshot process

### Manual Testing Commands

Once the persistent container is running, you can test manually:

```bash
# Check index stats
curl -H 'Authorization: Bearer a-secure-master-key-change-this' \
  http://localhost:7700/indexes/players/stats

# Search for players
curl -H 'Authorization: Bearer a-secure-master-key-change-this' \
  -H 'Content-Type: application/json' \
  -d '{"q":"test"}' \
  http://localhost:7700/indexes/players/search

# Health check
curl http://localhost:7700/health
```

**Note:** The local test environment uses the same Docker image and configuration as production, ensuring accurate testing of the entire pipeline.

## Usage

### Prerequisites

1. Ensure `active_players.jsonl` exists in `gs://aoe2-site-data/`
2. The service account (`aoe2-site-bot@aoe2-site.iam.gserviceaccount.com`) needs:
   - `roles/artifactregistry.admin` (for creating repositories and pushing images)
   - `roles/run.admin` (for deploying Cloud Run jobs)
   - `roles/cloudscheduler.admin` (for creating scheduled jobs)
   - `roles/storage.admin` (for accessing GCS)
   - `roles/compute.viewer` (for accessing VM)
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

### Collection Parameters

| Parameter | Default | Description | Use Cases |
|-----------|---------|-------------|-----------|
| `RATE_LIMIT_RPS` | 50 | Requests per second limit | API rate limit (50 RPS) |
| `CONCURRENT_REQUESTS` | 20 | Number of concurrent API requests | Balanced for Cloud Run Jobs |
| `BATCH_SIZE` | 200 | Profile IDs per API request | Balanced for efficiency |
| `TIMEOUT_SECONDS` | 12 | HTTP request timeout | Balanced for network stability |
| `MAX_CONSECUTIVE_EMPTY_BATCHES` | 5 | Stop after N empty batch groups | Increase for more thorough collection |
| `START_PROFILE_ID` | 1 | Starting profile ID for collection | Active players exist throughout the ID range |

### Filtering Parameters

| Parameter | Default | Description | Use Cases |
|-----------|---------|-------------|-----------|
| `ACTIVE_YEARS` | 2.0 | Only include players active in last N years | Increase to 2.5-3.0 for more data |
| `MIN_MATCHES` | 1 | Minimum matches required | Set to 0 for all players, 5+ for active only |

### Standard Collection
```bash
# Use all defaults
gcloud run jobs execute meilisearch-indexing-job --region=us-central1
```

### Conservative Collection (slower, more reliable)
```bash
gcloud run jobs execute meilisearch-indexing-job --region=us-central1 \
  --set-env-vars="RATE_LIMIT_RPS=30,CONCURRENT_REQUESTS=10,BATCH_SIZE=100,TIMEOUT_SECONDS=20"
```

### Aggressive Collection (faster, more data)
```bash
gcloud run jobs execute meilisearch-indexing-job --region=us-central1 \
  --set-env-vars="RATE_LIMIT_RPS=50,CONCURRENT_REQUESTS=25,BATCH_SIZE=200,ACTIVE_YEARS=2.5,MIN_MATCHES=0,MAX_CONSECUTIVE_EMPTY_BATCHES=10"
```

### Retry Scenarios

#### API Rate Limiting
```bash
gcloud run jobs execute meilisearch-indexing-job --region=us-central1 \
  --set-env-vars="RATE_LIMIT_RPS=30,CONCURRENT_REQUESTS=10"
```

#### Network Issues
```bash
gcloud run jobs execute meilisearch-indexing-job --region=us-central1 \
  --set-env-vars="TIMEOUT_SECONDS=30,BATCH_SIZE=100,CONCURRENT_REQUESTS=10"
```

#### More Comprehensive Data
```bash
gcloud run jobs execute meilisearch-indexing-job --region=us-central1 \
  --set-env-vars="ACTIVE_YEARS=2.5,MIN_MATCHES=0"
```

#### Faster Collection (Skip Lower Ranges)
```bash
gcloud run jobs execute meilisearch-indexing-job --region=us-central1 \
  --set-env-vars="START_PROFILE_ID=20000000"
```

## Parameter Calculations

- **Empty batch groups**: 5 × 20 × 200 = 20,000 consecutive empty profile IDs
- **API calls per second**: 20 concurrent requests at 50 RPS = 2.5 requests per second per concurrent request
- **Collection speed**: ~60,000 profile IDs per minute at default settings (API rate limit)
- **Estimated runtime**: 
  - Starting from ID 1: ~1.4 hours for 50M IDs (exceeds Cloud Run timeout)


## Troubleshooting

- Check Cloud Run job logs for detailed execution information
- Ensure GCS bucket permissions are correct
- Verify the JSONL file format matches expected schema
- Monitor snapshot creation and upload success
- For local testing issues, ensure Docker is running and gcloud is authenticated 