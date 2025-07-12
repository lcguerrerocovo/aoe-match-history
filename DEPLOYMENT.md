# Deployment Guide - Meilisearch Integration

## Prerequisites

1. **GitHub Secrets** - Add the following secrets to your GitHub repository:
   - `MEILISEARCH_API_KEY`: Your Meilisearch master key (e.g., `a-secure-master-key-change-this`)

2. **GCP Project** - Ensure you have access to the GCP project where the VM will be deployed

## Deployment Steps

### 1. Deploy Meilisearch VM Infrastructure

```bash
# Deploy the VM with Meilisearch
bash scripts/deploy-vm.sh

# Or with custom configuration
MEILI_MASTER_KEY="your-secure-key" bash scripts/deploy-vm.sh
```

This will:
- Create an e2-micro VM in `us-central1-a`
- Install Docker and Meilisearch
- Configure the search index
- Set up firewall rules
- Output the internal IP for the Cloud Function

### 2. Index Player Data

```bash
# Filter active players
python scripts/filter_active_players.py data/collected_players.jsonl data/active_players.jsonl

# Index to Meilisearch (replace with your VM's external IP)
export MEILI_HTTP_ADDR="http://<EXTERNAL_IP>:7700"
export MEILI_MASTER_KEY="your-secure-key"
python scripts/index_from_jsonl.py data/active_players.jsonl
```

### 3. Deploy Application

```bash
# Push to master to trigger GitHub Actions deployment
git push origin master
```

The GitHub Actions workflow will:
- Build and deploy the UI
- Deploy the Cloud Function with Meilisearch configuration
- Automatically detect the VM's internal IP
- Set the `MEILISEARCH_HOST` environment variable

### 4. Verify Deployment

```bash
# Test player search
curl "https://api.aoe2.site/api/player-search?name=theviper"

# Check Meilisearch health
curl "http://<EXTERNAL_IP>:7700/health"
```

## Environment Variables

### Production (GitHub Actions)
- `MEILISEARCH_HOST`: Automatically set to VM's internal IP
- `MEILISEARCH_API_KEY`: From GitHub secrets

### Local Development
- `MEILISEARCH_HOST`: `http://localhost:7700` (via SSH tunnel)
- `MEILISEARCH_API_KEY`: From `.env` file

## Troubleshooting

### VM Issues
```bash
# SSH into VM
gcloud compute ssh aoe-search --zone=us-central1-a

# Check Meilisearch logs
sudo docker logs meilisearch -f

# Restart Meilisearch
sudo docker restart meilisearch
```

### Cloud Function Issues
```bash
# Check function logs
gcloud functions logs read aoe2-api-proxy --region=us-central1

# Check environment variables
gcloud functions describe aoe2-api-proxy --region=us-central1
```

### Local Development Issues
```bash
# Start SSH tunnel
./scripts/tunnel-meilisearch.sh

# Check tunnel status
lsof -i :7700

# Test local connection
curl http://localhost:7700/health
```

## Security Notes

- The VM's external IP is only accessible via SSH tunnel for local development
- Production Cloud Functions use the internal IP for secure communication
- The master key should be changed from the default value
- Firewall rules restrict access to internal GCP services only 