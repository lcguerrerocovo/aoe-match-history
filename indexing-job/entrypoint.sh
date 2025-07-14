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
/usr/local/bin/meilisearch --master-key=masterKey --no-analytics --log-level=WARN --snapshot-dir=/meili_data/snapshots &
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

# Run the indexing script (handles indexing + snapshot creation)
echo "Starting indexing..."
python3 /indexer.py

# Check if Python script succeeded
if [ $? -ne 0 ]; then
    echo "Indexing failed"
    exit 1
fi

echo "✅ Job completed successfully!"

# Stop Meilisearch
echo "Stopping Meilisearch..."
kill $MEILI_PID

echo "Indexing job completed successfully!"