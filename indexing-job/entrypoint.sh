#!/bin/bash
set -e

# Debug: Check service account and GCS access
echo "Checking service account..."
gcloud auth list
echo "Testing GCS access..."
gsutil ls gs://aoe2-site-data/ || echo "GCS access failed"

# Debug: Check specific file access
echo "Testing specific file access..."
gsutil ls gs://aoe2-site-data/active_players.jsonl || echo "active_players.jsonl not found or no access"

# Debug: Check bucket permissions
echo "Checking bucket permissions..."
gsutil iam get gs://aoe2-site-data/ || echo "Cannot get bucket IAM"

# Debug: Check PATH and Meilisearch binary
echo "PATH: $PATH"
echo "Checking Meilisearch binary..."
ls -la /usr/local/bin/meilisearch || echo "Meilisearch not found in /usr/local/bin"
which meilisearch || echo "Meilisearch not found in PATH"

# Start Meilisearch in the background
/usr/local/bin/meilisearch --master-key=masterKey --no-analytics --log-level=WARN &
MEILI_PID=$!

# Wait for Meilisearch to be ready
echo "Waiting for Meilisearch to start..."
until curl -s http://localhost:7700/health | grep -q '"status":"available"'; do
  sleep 1
done
echo "Meilisearch is ready!"

# Download the JSONL file from GCS
echo "Downloading active_players.jsonl from GCS..."
gsutil cp gs://aoe2-site-data/active_players.jsonl /active_players.jsonl

# Run the indexing script
echo "Starting indexing..."
python3 /indexer.py

# Wait a moment for indexing to complete
sleep 5

# Trigger a snapshot
echo "Creating snapshot..."
curl -X POST 'http://localhost:7700/snapshot' -H 'Authorization: Bearer masterKey'

# Wait for snapshot to be created
sleep 10

# Upload snapshot to GCS
echo "Uploading snapshot to GCS..."
SNAPSHOT_FILE=$(ls /meili_data/snapshots/*.snapshot | head -1)
if [ -n "$SNAPSHOT_FILE" ]; then
    gsutil cp "$SNAPSHOT_FILE" gs://aoe2-site-data/meilisearch-snapshot-$(date +%Y%m%d-%H%M%S).snapshot
    echo "Snapshot uploaded successfully!"
else
    echo "No snapshot file found!"
    exit 1
fi

# Stop Meilisearch
echo "Stopping Meilisearch..."
kill $MEILI_PID

echo "Indexing job completed successfully!"