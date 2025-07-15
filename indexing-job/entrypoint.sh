#!/bin/bash
set -e

# Debug: Check PATH and Meilisearch binary
echo "PATH: $PATH"
echo "Checking Meilisearch binary..."
ls -la /usr/local/bin/meilisearch || echo "Meilisearch not found in /usr/local/bin"
which meilisearch || echo "Meilisearch not found in PATH"

# Start Meilisearch in the background (let it use available memory)
/usr/local/bin/meilisearch --master-key=masterKey --no-analytics --log-level=WARN --snapshot-dir=/meili_data/snapshots &
MEILI_PID=$!

# Wait for Meilisearch to be ready
echo "Waiting for Meilisearch to start..."
until curl -s http://localhost:7700/health | grep -q '"status":"available"'; do
  sleep 1
done
echo "Meilisearch is ready!"

# Function to check if Meilisearch is still running
check_meilisearch() {
  if ! kill -0 $MEILI_PID 2>/dev/null; then
    echo "❌ Meilisearch process died unexpectedly"
    return 1
  fi
  if ! curl -s http://localhost:7700/health | grep -q '"status":"available"'; then
    echo "❌ Meilisearch is not responding"
    return 1
  fi
  return 0
}

# Download the JSONL file from GCS
echo "Downloading active_players.jsonl from GCS..."
gsutil cp gs://aoe2-site-data/active_players.jsonl /active_players.jsonl

# Check Meilisearch before starting indexing
if ! check_meilisearch; then
    echo "❌ Meilisearch is not running - cannot proceed with indexing"
    exit 1
fi

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