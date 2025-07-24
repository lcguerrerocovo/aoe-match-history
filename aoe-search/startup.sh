#!/bin/bash
set -e
set -o pipefail

echo "--- Meilisearch VM Startup Script ---"

# --- Configuration ---
MEILI_MASTER_KEY=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_master_key" -H "Metadata-Flavor: Google" || echo "a-default-dev-only-master-key")
MEILI_CONFIG=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_config" -H "Metadata-Flavor: Google" 2>/dev/null || echo "")

# --- 1. System Setup ---
echo "Setting up system..."

# Ensure Docker is running
systemctl start docker || echo "Docker start failed, but continuing..."

# Install jq if needed
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    curl -L https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 -o /usr/local/bin/jq
    chmod +x /usr/local/bin/jq
fi

# --- 2. Create Directories ---
echo "Creating persistent directories..."
mkdir -p /mnt/stateful_partition/meilisearch/data
mkdir -p /mnt/stateful_partition/meilisearch/snapshots
chmod 755 /mnt/stateful_partition/meilisearch/data
chmod 755 /mnt/stateful_partition/meilisearch/snapshots

# --- 3. Clean Database Directory ---
echo "Cleaning database directory..."
rm -rf /mnt/stateful_partition/meilisearch/data/*

# --- 4. Start Meilisearch ---
echo "Starting Meilisearch..."

# Stop and remove existing container if it exists
docker stop meilisearch 2>/dev/null || true
docker rm meilisearch 2>/dev/null || true

docker run -d \
  --name meilisearch \
  --restart unless-stopped \
  -p 7700:7700 \
  -e MEILI_ENV=production \
  -e MEILI_MASTER_KEY=${MEILI_MASTER_KEY} \
  -v /mnt/stateful_partition/meilisearch/data:/meili_data \
  -v /mnt/stateful_partition/meilisearch/snapshots:/meili_data/snapshots \
  getmeili/meilisearch:v1.7.3

echo "✅ Meilisearch container started"

echo "✅ Startup script completed"
echo "--- Startup Script Finished ---"