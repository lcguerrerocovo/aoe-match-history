#!/bin/bash
set -e

echo "📊 Running indexing mode..."

# Debug: Check PATH and Meilisearch binary
echo "PATH: $PATH"
echo "Checking Meilisearch binary..."
ls -la /usr/local/bin/meilisearch || echo "Meilisearch not found in /usr/local/bin"
which meilisearch || echo "Meilisearch not found in PATH"

# Start Meilisearch in the background
/usr/local/bin/meilisearch --master-key=masterKey --no-analytics --log-level=WARN --http-addr=localhost:7700 --snapshot-dir=/meili_data/snapshots &
MEILI_PID=$!

# Wait for Meilisearch to be ready
echo "Waiting for Meilisearch to start..."
sleep 5
echo "Meilisearch should be ready now!"

# Use the SKIP_GCS_UPLOAD environment variable if set, otherwise default to true for local testing
export SKIP_GCS_UPLOAD=${SKIP_GCS_UPLOAD:-true}

# Log current configuration
echo "📊 Current Configuration:"
echo "  SKIP_GCS_UPLOAD: $SKIP_GCS_UPLOAD"
echo "  START_PROFILE_ID: ${START_PROFILE_ID:-1}"
echo "  MAX_CONSECUTIVE_EMPTY_BATCHES: ${MAX_CONSECUTIVE_EMPTY_BATCHES:-5}"

# Run the indexing script
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