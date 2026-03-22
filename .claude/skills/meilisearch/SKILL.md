---
name: meilisearch
description: Use when deploying, managing, or troubleshooting Meilisearch search — VM setup, indexing jobs, container management, snapshot recovery, or when player search is broken/returning empty results
---

# Meilisearch Search Engine

## Overview

Meilisearch provides fast, typo-tolerant player search for aoe2.site. It runs as a Docker container on a GCE **e2-micro** VM (`aoe-search`) in `us-central1-a` (free tier compatible). The search index (`players`) stores player names, aliases, match counts, and activity dates collected from the Relic API via the indexing job.

- **VM**: `aoe-search` in `us-central1-a`
- **Port**: 7700
- **Meilisearch version**: 1.7.3 (pinned — check with `scripts/check-versions.sh`)
- **Data volume**: `/var/lib/meilisearch/data` on the VM, mounted into the container
- **Index config**: `aoe-search/meilisearch_config.json`

## Deployment

### Deploy the Search VM

```bash
# Deploy Meilisearch VM with automatic configuration
bash scripts/deploy.sh

# Or with custom master key
MEILI_MASTER_KEY="your-secure-key" bash scripts/deploy.sh
```

The deploy script creates the e2-micro VM, installs Docker, starts Meilisearch, configures the index from `aoe-search/meilisearch_config.json`, and sets up firewall rules for internal access.

### Deploy and Run Indexing Job

```bash
# Deploy the indexing job container
cd jobs/indexing && ./build_and_deploy_indexer.sh

# Run with default settings (collects active players, creates snapshot)
gcloud run jobs execute meilisearch-indexing-job --region=us-central1

# Run with custom parameters
gcloud run jobs execute meilisearch-indexing-job --region=us-central1 \
  --set-env-vars="API_BATCH_SIZE=200,CONCURRENT_REQUESTS=35,ACTIVE_YEARS=2.5"
```

### Update Proxy Environment Variables

After deploying a new VM, update the proxy's environment:
```
MEILISEARCH_HOST=http://<VM_INTERNAL_IP>:7700
MEILISEARCH_API_KEY=<master-key>
```

## Container Management

### SSH into the VM

```bash
gcloud compute ssh aoe-search --zone=us-central1-a
```

### Basic Container Commands

```bash
# Check running containers
sudo docker ps -a

# Health check
curl http://localhost:7700/health

# Health check with auth
curl -H "Authorization: Bearer $MASTER_KEY" http://localhost:7700/health

# Restart container
sudo docker restart meilisearch

# Restart with latest snapshot (bulletproof wrapper)
sudo bash /mnt/stateful_partition/meilisearch/meilisearch-wrapper.sh

# View container environment
sudo docker inspect meilisearch | grep -A 20 "Env"

# Check resource usage
sudo docker stats meilisearch
```

### Manual Container Start

If the container is missing or misconfigured:

```bash
# Stop and remove existing
sudo docker stop meilisearch 2>/dev/null || true
sudo docker rm meilisearch 2>/dev/null || true

# Get master key from VM metadata
MASTER_KEY=$(curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_master_key)

# Start with proper configuration
sudo docker run -d \
  --name meilisearch \
  --restart unless-stopped \
  -p 7700:7700 \
  -e MEILI_ENV=production \
  -e MEILI_MASTER_KEY=$MASTER_KEY \
  -v /var/lib/meilisearch/data:/meili_data \
  getmeili/meilisearch:v1.7
```

## Index Management

### Check Index Status

```bash
# Index statistics (document count, field distribution)
curl -H "Authorization: Bearer $MASTER_KEY" \
  http://localhost:7700/indexes/players/stats

# Index settings
curl -H "Authorization: Bearer $MASTER_KEY" \
  http://localhost:7700/indexes/players/settings
```

### Test Search

```bash
# Search from the VM
curl -X POST 'http://localhost:7700/indexes/players/search' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '{"q": "viper"}'

# Search from external IP (if firewall allows)
curl -X POST 'http://<EXTERNAL_IP>:7700/indexes/players/search' \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary '{"q": "viper"}'
```

### Clear and Reindex

```bash
# Delete the index entirely
curl -X DELETE -H "Authorization: Bearer $MASTER_KEY" \
  http://localhost:7700/indexes/players

# Then re-run the indexing job
gcloud run jobs execute meilisearch-indexing-job --region=us-central1
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Empty search results | Index has 0 documents | Check stats endpoint; re-run indexing job |
| Container in development mode | Startup script failed or master key missing | Check startup logs and master key metadata |
| Random container names (not `meilisearch`) | Startup script didn't run | SSH in, run manual container start |
| No index found | Snapshot not imported or index creation failed | Check startup logs; recreate index manually |
| Authentication errors (403) | Master key mismatch | Verify key in VM metadata vs container env |
| Search returns stale players | Index not refreshed | Re-run indexing job, purge Cloudflare search cache |
| VM unreachable from proxy | Firewall rules missing | Check `gcloud compute firewall-rules list --filter="name~meilisearch"` |
| OOM / container killed | e2-micro memory limit hit | Check `docker stats`; reduce indexing batch size |

### Check VM Metadata

```bash
# Verify startup script is set
curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/attributes/startup-script

# Verify master key is set
curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_master_key
```

## Monitoring & Logs

### Startup Script Logs (check first for deployment issues)

```bash
# Real-time startup script execution
sudo journalctl -u google-startup-scripts.service -f

# Recent startup logs
sudo journalctl -u google-startup-scripts.service --since "1 hour ago"

# Check startup script status
sudo systemctl status google-startup-scripts.service
```

### Meilisearch Application Logs

```bash
# Real-time logs
sudo docker logs meilisearch -f

# Recent logs
sudo docker logs meilisearch --since "1h"

# Last 50 lines
sudo docker logs --tail 50 meilisearch
```

### System Logs

```bash
# All system logs
sudo journalctl --since "1 hour ago"

# Docker service logs
sudo journalctl -u docker.service
```

## Backup & Recovery

### Dumps

```bash
# Create a dump
curl -X POST -H "Authorization: Bearer $MASTER_KEY" \
  http://localhost:7700/dumps

# List available dumps
curl -H "Authorization: Bearer $MASTER_KEY" \
  http://localhost:7700/dumps

# Restore from dump
curl -X POST -H "Authorization: Bearer $MASTER_KEY" \
  -H "Content-Type: application/json" \
  --data-binary '{"dumpUid": "dump_uid_here"}' \
  http://localhost:7700/dumps/import
```

### Snapshots

The indexing job creates a snapshot after each successful run. The wrapper script (`/mnt/stateful_partition/meilisearch/meilisearch-wrapper.sh`) automatically imports the latest snapshot on restart.

To manually restart with the latest snapshot:
```bash
sudo bash /mnt/stateful_partition/meilisearch/meilisearch-wrapper.sh
```

## Configuration

### Search Index Settings

Defined in `aoe-search/meilisearch_config.json`:

| Setting | Value |
|---------|-------|
| Searchable fields | `name`, `alias` |
| Filterable fields | `country`, `total_matches`, `last_match_date` |
| Sortable fields | `total_matches`, `last_match_date` |
| Ranking rules | Prioritizes players with more matches and recent activity |
| Typo tolerance | Enabled |

### Performance Tuning (e2-micro)

The e2-micro VM has limited resources (1 GB RAM, 2 shared vCPUs). These settings are tuned for it:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Memory limit | 400 MB | For indexing operations |
| Indexing threads | 2 | Concurrent indexing threads |
| Batch size | 1000 | Documents per indexing batch |

### Firewall Rules

```bash
# List current rules
gcloud compute firewall-rules list --filter="name~meilisearch"

# Allow external access (testing only)
gcloud compute firewall-rules create allow-meilisearch-external \
  --direction=INGRESS --priority=1000 --network=default \
  --action=ALLOW --rules=tcp:7700 --source-ranges=0.0.0.0/0 \
  --target-tags=meilisearch-server \
  --description="Allow external access to Meilisearch (for testing)"

# Remove external access (production)
gcloud compute firewall-rules delete allow-meilisearch-external
```

### Local Development

To access the Meilisearch VM from local dev:
```bash
bash scripts/tunnel-meilisearch.sh
```
