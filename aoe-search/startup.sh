#!/bin/bash
set -e
set -o pipefail

echo "--- Meilisearch VM Startup Script ---"

# --- Configuration ---
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
    curl -L https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 -o /usr/local/bin/jq || {
        echo "⚠️ Failed to install jq to /usr/local/bin. Trying /tmp/jq and adding to PATH temporarily."
        curl -L https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 -o /tmp/jq
        chmod +x /tmp/jq
        export PATH=$PATH:/tmp
    }
    [ -f "/usr/local/bin/jq" ] && chmod +x /usr/local/bin/jq
fi

# --- 2. Meilisearch Setup ---
echo "Creating directories for Meilisearch..."
# Use persistent storage location that survives reboots
mkdir -p /mnt/stateful_partition/meilisearch/data/snapshots
mkdir -p /var/lib/meilisearch/data
# Create symlink from ephemeral to persistent storage (remove target first to prevent recursive symlinks)
rm -rf /var/lib/meilisearch/data/snapshots
ln -sf /mnt/stateful_partition/meilisearch/data/snapshots /var/lib/meilisearch/data/snapshots
chmod 755 /mnt/stateful_partition/meilisearch
chmod 755 /mnt/stateful_partition/meilisearch/data
chmod 755 /mnt/stateful_partition/meilisearch/data/snapshots

# --- 3. Start Meilisearch ---
echo "Starting Meilisearch via Docker..."

# Check if container already exists and remove it
if docker ps -a --format "table {{.Names}}" | grep -q "^meilisearch$"; then
    echo "Removing existing meilisearch container..."
    docker stop meilisearch 2>/dev/null || true
    docker rm meilisearch 2>/dev/null || true
fi

# Check for existing snapshot and start accordingly
if [ -f "/var/lib/meilisearch/data/snapshots/latest.snapshot" ]; then
    echo "✅ Found existing snapshot, starting with snapshot import"
    
    # Remove existing database if it exists
    if [ -d "/var/lib/meilisearch/data/data.ms" ]; then
        echo "Removing existing database to import snapshot..."
        rm -rf /var/lib/meilisearch/data/data.ms
    fi
    
    # Start Meilisearch with snapshot import
    docker run -d \
      --name meilisearch \
      --restart unless-stopped \
      -p 7700:7700 \
      -e MEILI_ENV=production \
      -e MEILI_MASTER_KEY=${MEILI_MASTER_KEY} \
      -v /var/lib/meilisearch/data:/meili_data \
      getmeili/meilisearch:v1.7 \
      meilisearch --import-snapshot /meili_data/snapshots/latest.snapshot
    
    echo "✅ Meilisearch started with snapshot"
else
    echo "⚠️ No existing snapshot found, starting with empty index"
    
    # Start Meilisearch normally
    docker run -d \
      --name meilisearch \
      --restart unless-stopped \
      -p 7700:7700 \
      -e MEILI_ENV=production \
      -e MEILI_MASTER_KEY=${MEILI_MASTER_KEY} \
      -v /var/lib/meilisearch/data:/meili_data \
      getmeili/meilisearch:v1.7
fi

# --- 5. Meilisearch Configuration ---
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

# Set up index configuration (will skip if already exists from snapshot)
echo "📝 Setting up index configuration..."

# Check if index already exists (from snapshot import)
INDEX_RESPONSE=$(curl -s -H "Authorization: Bearer ${MEILI_MASTER_KEY}" http://localhost:7700/indexes/players 2>/dev/null)
if echo "$INDEX_RESPONSE" | grep -q '"indexUid":"players"'; then
    echo "✅ Index 'players' already exists (from snapshot)"
else
    echo "Creating new index and applying configuration..."
    
    # Fetch the index configuration from the VM's metadata
    if ! curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_config" -H "Metadata-Flavor: Google" > /var/lib/meilisearch/index_config.json; then
        echo "❌ Failed to fetch index configuration from metadata"
        exit 1
    fi

    # Extract primaryKey from the config to create the index first
    PRIMARY_KEY=$(grep -o '"primaryKey": *"[^"]*"' /var/lib/meilisearch/index_config.json | cut -d'"' -f4)

    echo "Creating index 'players' with primary key '${PRIMARY_KEY}'..."
    if ! curl -X POST 'http://localhost:7700/indexes' \
      -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
      -H 'Content-Type: application/json' \
      --data-binary "{\"uid\": \"players\", \"primaryKey\": \"${PRIMARY_KEY:-profile_id}\"}"; then
        echo "❌ Failed to create index"
        exit 1
    fi

    echo "Updating index settings..."
    # Create a settings-only config by removing uid and primaryKey fields
    jq 'del(.uid, .primaryKey)' /var/lib/meilisearch/index_config.json > /var/lib/meilisearch/settings_config.json

    # Use PATCH to apply settings to the existing index
    if ! curl -X PATCH "http://localhost:7700/indexes/players/settings" \
      -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
      -H 'Content-Type: application/json' \
      --data-binary @/var/lib/meilisearch/settings_config.json; then
        echo "❌ Failed to apply index settings"
        exit 1
    fi
fi

# Final verification
echo "Verifying setup..."
if curl -f "http://localhost:7700/health" > /dev/null 2>&1; then
    echo "✅ Meilisearch is healthy."
    
    # Check if index has data (for snapshot verification)
    DOC_COUNT=$(curl -s -H "Authorization: Bearer ${MEILI_MASTER_KEY}" http://localhost:7700/indexes/players/stats 2>/dev/null | jq -r '.numberOfDocuments // 0' 2>/dev/null || echo "0")
    echo "📊 Index contains $DOC_COUNT documents"
    
    if [ "$DOC_COUNT" -gt 0 ]; then
        echo "✅ Snapshot data loaded successfully"
    else
        echo "ℹ️ Index is empty (no snapshot imported or empty snapshot)"
    fi
    
    echo "✅ Startup script finished successfully."
else
    echo "❌ Meilisearch health check failed after setup"
    exit 1
fi

echo "--- Startup Script Finished ---"