---
name: player-indexing
description: Use when collecting player data from the Relic API, running the indexing job, reindexing Meilisearch, or when search results are stale or incomplete
---

# Player Data Collection & Indexing

## Overview

Player data flows through a pipeline: **Relic API** → `collect_player_data.py` → JSONL file → `upload_to_firestore.py` → **Firestore** → `jobs/indexing` → **Meilisearch**. The collection script pulls player records from the AoE2 Relic API, Firestore stores the canonical dataset, and a Cloud Run job indexes players into Meilisearch for fast typo-tolerant search on the site.

## Collecting Player Data

The `scripts/collect_player_data.py` script gathers player information from the Relic API:

```bash
# Ensure Python environment is active
pyenv activate aoe-match-history

# Collect player data (rate-limited at 50 RPS, 25 concurrent workers)
python scripts/collect_player_data.py

# Resume from a specific player ID after interruption
python scripts/collect_player_data.py --resume-from-id 12345
```

Behavior:
- Processes players in batches of 200 IDs per API request
- Rate-limited to 50 requests per second with 25 concurrent workers
- Automatically resumes from interruptions
- Outputs JSONL file: `player_data_YYYYMMDD_HHMMSS.jsonl`
- Filters out players with 0 matches

## Uploading to Firestore

After collection, upload the JSONL file to Firestore:

```bash
python scripts/upload_to_firestore.py player_data_YYYYMMDD_HHMMSS.jsonl
```

Behavior:
- 8 concurrent workers, batches of 500 players
- Overwrites existing records with updated data
- Shows real-time progress with worker distribution
- Handles ~1M players efficiently

## Meilisearch Indexing Job

The Cloud Run job reads from Firestore and indexes players into Meilisearch. Deploy and run from `jobs/indexing/`:

```bash
# Deploy the indexing job
cd jobs/indexing
./build_and_deploy_indexer.sh

# Run with default settings (collects active players, creates snapshot)
gcloud run jobs execute meilisearch-jobs/indexing --region=us-central1

# Run with custom parameters
gcloud run jobs execute meilisearch-jobs/indexing --region=us-central1 \
  --set-env-vars="API_BATCH_SIZE=200,CONCURRENT_REQUESTS=35,ACTIVE_YEARS=2.5"
```

After reindexing, purge the Cloudflare search cache (see the `cloudflare-cdn` skill) so the site picks up the new data immediately.

## Data Structure

Player records in Firestore contain:

| Field | Description |
|-------|-------------|
| `profile_id` | Unique player identifier |
| `name` | Display name |
| `name_no_special` | Cleaned name for prefix search |
| `name_tokens` | Array of tokens for partial name matching |
| `total_matches` | Total match count |
| `country` | 2-letter ISO country code |
| `last_match_date` | Timestamp of last match |
| `clan` | Clan information (if available) |

## Local Development

**Option A: Production Firestore data**
```bash
cd ui
npm run dev:all:prod    # Connects to production Firestore
```

**Option B: Emulator with test data**
```bash
cd ui
npm run dev:all         # Local emulator, auto-seeded with test players
```

The emulator is automatically seeded with test players for development and testing.

## Firestore Index Management

Player search uses composite indexes defined in `firestore.indexes.json`:

| Index | Fields | Purpose |
|-------|--------|---------|
| Prefix search | `name_no_special` + `total_matches` | "gl" matches "GL.TheViper" |
| Token search | `name_tokens` + `total_matches` | "viper" matches "GL.TheViper" |

Deploy index changes:
```bash
firebase deploy --only firestore:indexes
```
Index builds take 5-15 minutes.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Stale search results | Meilisearch index outdated | Re-run the indexing job, then purge Cloudflare search cache |
| Empty search results | Index missing or empty | Check document count: `curl -H "Authorization: Bearer $KEY" http://MEILI_HOST:7700/indexes/players/stats` |
| Collection script hangs | Rate limit or network issue | Restart with `--resume-from-id` using the last logged ID |
| Upload fails midway | Firestore write errors | Re-run the upload script; it overwrites existing records safely |
| Search misses known player | Player has 0 matches or was filtered | Check the JSONL output for the player's profile_id |
| Index build pending | Firestore composite index still building | Wait 5-15 min after `firebase deploy --only firestore:indexes` |
