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

# --- 3. Stop and Remove Existing Container ---
echo "Cleaning up existing container..."
docker stop meilisearch 2>/dev/null || true
docker rm meilisearch 2>/dev/null || true

# --- 4. Start Meilisearch ---
echo "Starting Meilisearch..."
docker run -d \
  --name meilisearch \
  --restart unless-stopped \
  -p 7700:7700 \
  -e MEILI_ENV=production \
  -e MEILI_MASTER_KEY=${MEILI_MASTER_KEY} \
  -v /mnt/stateful_partition/meilisearch/data:/meili_data \
  -v /mnt/stateful_partition/meilisearch/snapshots:/meili_data/snapshots \
  getmeili/meilisearch:v1.7

echo "✅ Meilisearch container started"

# --- 5. Wait for Meilisearch to be Ready ---
echo "Waiting for Meilisearch to be ready..."
until curl -f http://localhost:7700/health > /dev/null 2>&1; do
    echo "Meilisearch starting..."
    sleep 3
done
echo "✅ Meilisearch is healthy"

# --- 6. Wait for All Tasks to Complete ---
echo "Waiting for all pending tasks to complete..."
for i in {1..60}; do
    PENDING_TASKS=$(curl -s -H "Authorization: Bearer ${MEILI_MASTER_KEY}" http://localhost:7700/tasks | jq -r '.results[] | select(.status == "enqueued" or .status == "processing") | .uid' | head -5)
    
    if [ -z "$PENDING_TASKS" ]; then
        echo "✅ No pending tasks found"
        break
    else
        echo "⏳ Waiting for tasks: $PENDING_TASKS"
        sleep 5
    fi
done

# --- 7. Create Index if Needed ---
echo "Checking if index exists..."
INDEX_EXISTS=$(curl -s -H "Authorization: Bearer ${MEILI_MASTER_KEY}" http://localhost:7700/indexes/players 2>/dev/null | jq -r '.uid // empty')

if [ -z "$INDEX_EXISTS" ]; then
    echo "Creating players index..."
    CREATE_RESPONSE=$(curl -X POST 'http://localhost:7700/indexes' \
      -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
      -H 'Content-Type: application/json' \
      --data-binary '{"uid": "players", "primaryKey": "profile_id"}')
    
    CREATE_TASK_UID=$(echo "$CREATE_RESPONSE" | jq -r '.taskUid // empty')
    if [ -n "$CREATE_TASK_UID" ]; then
        echo "⏳ Waiting for index creation..."
        until [ "$(curl -s -H "Authorization: Bearer ${MEILI_MASTER_KEY}" http://localhost:7700/tasks/$CREATE_TASK_UID | jq -r '.status')" = "succeeded" ]; do
            sleep 3
        done
        echo "✅ Index created"
    fi
else
    echo "✅ Index already exists"
fi

# --- 8. Initial Verification ---
echo "Initial verification..."
DOC_COUNT=$(curl -s -H "Authorization: Bearer ${MEILI_MASTER_KEY}" http://localhost:7700/indexes/players/stats | jq -r '.numberOfDocuments // 0')

echo "📊 Documents: $DOC_COUNT"
echo "✅ Startup script completed - settings will be applied after snapshot loading"

echo "--- Startup Script Finished ---"