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
mkdir -p /var/lib/meilisearch/data/snapshots
chmod 755 /var/lib/meilisearch
chmod 755 /var/lib/meilisearch/data
chmod 755 /var/lib/meilisearch/data/snapshots

# --- 3. Download Latest Snapshot ---
echo "Checking for latest snapshot in GCS..."
LATEST_SNAPSHOT=$(gsutil ls gs://aoe2-site-data/snapshots/*/data.snapshot 2>/dev/null | sort | tail -1 || echo "")

if [ -n "$LATEST_SNAPSHOT" ]; then
    echo "Found latest snapshot: $LATEST_SNAPSHOT"
    echo "Downloading snapshot..."
    gsutil cp "$LATEST_SNAPSHOT" /var/lib/meilisearch/data/snapshots/latest.snapshot
    
    # Extract snapshot directory and download metadata/fingerprint
    SNAPSHOT_DIR=$(echo "$LATEST_SNAPSHOT" | sed 's|gs://aoe2-site-data/||' | sed 's|/data.snapshot||')
    FINGERPRINT_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/fingerprint.txt"
    METADATA_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/metadata.json"
    
    echo "Downloading fingerprint: $FINGERPRINT_PATH"
    gsutil cp "$FINGERPRINT_PATH" /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt 2>/dev/null || echo "No fingerprint found"
    
    echo "Downloading metadata: $METADATA_PATH"
    gsutil cp "$METADATA_PATH" /var/lib/meilisearch/data/snapshots/latest.metadata.json 2>/dev/null || echo "No metadata found"
    
    echo "✅ Snapshot downloaded successfully"
else
    echo "⚠️  No snapshots found in GCS, starting with empty index"
fi

echo "Starting Meilisearch via Docker..."
docker run -d \
  --name meilisearch \
  --restart unless-stopped \
  -p 7700:7700 \
  -e MEILI_ENV=production \
  -e MEILI_MASTER_KEY=${MEILI_MASTER_KEY} \
  -v /var/lib/meilisearch/data:/meili_data \
  getmeili/meilisearch:v1.7

# --- 4. Meilisearch Configuration ---
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

# If we have a snapshot, Meilisearch should have loaded it automatically
if [ -f "/var/lib/meilisearch/data/snapshots/latest.snapshot" ]; then
    echo "✅ Meilisearch started with snapshot data"
else
    echo "📝 Setting up empty index configuration..."
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
fi

# --- 5. Setup Snapshot Update Cron Job ---
echo "Setting up snapshot update cron job..."
cat > /var/lib/meilisearch/check_snapshots.sh << 'EOF'
#!/bin/bash
set -e

echo "$(date): Checking for new snapshots..."

# Get latest snapshot from GCS (sorted by timestamp)
LATEST_SNAPSHOT=$(gsutil ls gs://aoe2-site-data/snapshots/*/data.snapshot 2>/dev/null | sort | tail -1 || echo "")

if [ -z "$LATEST_SNAPSHOT" ]; then
    echo "No snapshots found in GCS"
    exit 0
fi

# Extract snapshot directory and get fingerprint
SNAPSHOT_DIR=$(echo "$LATEST_SNAPSHOT" | sed 's|gs://aoe2-site-data/||' | sed 's|/data.snapshot||')
LATEST_FINGERPRINT_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/fingerprint.txt"

echo "Latest snapshot directory: $SNAPSHOT_DIR"

# Download latest fingerprint
TEMP_FINGERPRINT="/tmp/latest_fingerprint.txt"
gsutil cp "$LATEST_FINGERPRINT_PATH" "$TEMP_FINGERPRINT" 2>/dev/null || {
    echo "Could not download fingerprint"
    exit 1
}

LATEST_FINGERPRINT=$(cat "$TEMP_FINGERPRINT")
rm -f "$TEMP_FINGERPRINT"

echo "Latest snapshot fingerprint: $LATEST_FINGERPRINT"

# Get current index fingerprint
CURRENT_FINGERPRINT=""
if [ -f "/var/lib/meilisearch/data/snapshots/latest.fingerprint.txt" ]; then
    CURRENT_FINGERPRINT=$(cat /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt)
fi

if [ "$CURRENT_FINGERPRINT" = "$LATEST_FINGERPRINT" ]; then
    echo "No new snapshot detected (fingerprint: $LATEST_FINGERPRINT)"
    exit 0
fi

echo "New snapshot detected! Performing hot-swap..."

# Stop Meilisearch
docker stop meilisearch

# Backup current files
if [ -f "/var/lib/meilisearch/data/snapshots/latest.snapshot" ]; then
    mv /var/lib/meilisearch/data/snapshots/latest.snapshot /var/lib/meilisearch/data/snapshots/latest.snapshot.backup.$(date +%Y%m%d-%H%M%S)
fi

if [ -f "/var/lib/meilisearch/data/snapshots/latest.fingerprint.txt" ]; then
    mv /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt.backup.$(date +%Y%m%d-%H%M%S)
fi

if [ -f "/var/lib/meilisearch/data/snapshots/latest.metadata.json" ]; then
    mv /var/lib/meilisearch/data/snapshots/latest.metadata.json /var/lib/meilisearch/data/snapshots/latest.metadata.json.backup.$(date +%Y%m%d-%H%M%S)
fi

# Download new snapshot
gsutil cp "$LATEST_SNAPSHOT" /var/lib/meilisearch/data/snapshots/latest.snapshot

# Download new fingerprint
gsutil cp "$LATEST_FINGERPRINT_PATH" /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt

# Download new metadata
METADATA_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/metadata.json"
gsutil cp "$METADATA_PATH" /var/lib/meilisearch/data/snapshots/latest.metadata.json

# Start Meilisearch
docker start meilisearch

# Wait for Meilisearch to be healthy
echo "Waiting for Meilisearch to be healthy..."
for i in $(seq 1 30); do
    if curl -f http://localhost:7700/health > /dev/null 2>&1; then
        echo "✅ Meilisearch is healthy after hot-swap"
        break
    fi
    echo "Waiting for Meilisearch... (attempt $i/30)"
    sleep 2
done

echo "✅ Hot-swap completed successfully!"
EOF

chmod +x /var/lib/meilisearch/check_snapshots.sh

# Add cron job to run every 2 days at midnight
(crontab -l 2>/dev/null; echo "0 0 */2 * * /var/lib/meilisearch/check_snapshots.sh >> /var/lib/meilisearch/snapshot_updates.log 2>&1") | crontab -

echo "✅ Meilisearch setup and configuration complete."
echo "✅ Snapshot update cron job configured (runs every 2 days at midnight)"
echo "--- Startup Script Finished ---" 