#!/bin/bash
set -e
set -o pipefail

echo "--- Meilisearch VM Startup Script ---"

# --- Configuration ---
# This master key is set via metadata in the deploy script.
# Fallback to a default if not provided, but it should always be provided.
MEILI_MASTER_KEY=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_master_key" -H "Metadata-Flavor: Google" || echo "a-default-dev-only-master-key")

# --- 1. System Setup ---
echo "COS detected - Docker is pre-installed"
echo "Checking Docker status..."

# COS comes with Docker pre-installed, just ensure it's running
systemctl status docker || echo "Docker not running, starting it..."
systemctl start docker || echo "Docker start failed, but continuing..."

# Install jq if not available (COS might not have it)
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    # COS doesn't have a package manager, but we can download jq directly
    curl -L https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 -o /usr/local/bin/jq
    chmod +x /usr/local/bin/jq
fi

# --- 2. Meilisearch Setup ---
echo "Creating directories for Meilisearch..."
mkdir -p /var/lib/meilisearch/data
chmod 755 /var/lib/meilisearch
chmod 755 /var/lib/meilisearch/data

echo "Starting Meilisearch via Docker..."
docker run -d \
  --name meilisearch \
  --restart unless-stopped \
  -p 7700:7700 \
  -e MEILI_ENV=production \
  -e MEILI_MASTER_KEY=${MEILI_MASTER_KEY} \
  -v /var/lib/meilisearch/data:/meili_data \
  getmeili/meilisearch:v1.7

# --- 3. Meilisearch Configuration ---
echo "Waiting for Meilisearch to start..."
# Wait for the container to be running
until [ "$(docker inspect -f {{.State.Status}} meilisearch)" == "running" ]; do
    echo "Meilisearch container is starting..."
    sleep 3
done;

# Wait for the service to be responsive
echo "Waiting for Meilisearch to be responsive..."
until curl -f http://localhost:7700/health > /dev/null 2>&1; do
    echo "Meilisearch is starting..."
    sleep 3
done;
echo "✅ Meilisearch is healthy."

echo "Applying index configuration from metadata..."
# Fetch the index configuration from the VM's metadata
curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_config" -H "Metadata-Flavor: Google" > /var/lib/meilisearch/index_config.json

# Extract primaryKey from the config to create the index first
PRIMARY_KEY=$(grep -o '"primaryKey": *"[^"]*"' /var/lib/meilisearch/index_config.json | cut -d'"' -f4)

echo "Creating index 'players' with primary key '${PRIMARY_KEY}'..."
curl -X POST 'http://localhost:7700/indexes' \
  -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary "{\"uid\": \"players\", \"primaryKey\": \"${PRIMARY_KEY:-profile_id}\"}"

echo "Updating index settings..."
# Create a settings-only config by removing uid and primaryKey fields
jq 'del(.uid, .primaryKey)' /var/lib/meilisearch/index_config.json > /var/lib/meilisearch/settings_config.json

# Use PATCH to apply settings to the existing index
curl -X PATCH "http://localhost:7700/indexes/players/settings" \
  -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary @/var/lib/meilisearch/settings_config.json

echo "✅ Meilisearch setup and configuration complete."
echo "--- Startup Script Finished ---" 