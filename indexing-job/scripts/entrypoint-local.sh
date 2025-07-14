#!/bin/bash
set -e

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

# Check if local file exists (mounted from host)
if [ -f "/active_players.jsonl" ]; then
    echo "Using local data file: /active_players.jsonl"
else
    echo "❌ Local data file not found: /active_players.jsonl"
    exit 1
fi

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