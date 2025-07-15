#!/bin/bash
set -e

# Check command line argument
MODE=${1:-"index"}  # Default to "index" if no argument provided

echo "🔧 Running in mode: $MODE"

# Debug: Check PATH and Meilisearch binary
echo "PATH: $PATH"
echo "Checking Meilisearch binary..."
ls -la /usr/local/bin/meilisearch || echo "Meilisearch not found in /usr/local/bin"
which meilisearch || echo "Meilisearch not found in PATH"

if [ "$MODE" = "hotswap" ]; then
    echo "🧪 Testing hot-swap function with latest snapshot from GCS..."
    
    # Check if we have gcloud access
    echo "Checking gcloud authentication..."
    gcloud auth list || echo "No gcloud auth found"
    
    # Check if we can access GCS
    echo "Testing GCS access..."
    gsutil ls gs://aoe2-site-data/ || echo "GCS access failed"
    
    # Check if we can access the VM
    echo "Testing VM access..."
    gcloud compute instances describe aoe-search --zone=us-central1-a --project=aoe2-site --format='value(name)' || echo "VM access failed"
    
    # Import the hot-swap function from the indexer
    echo "Testing hot-swap function..."
    python3 -c "
import sys
sys.path.append('/')
from indexer import hot_swap_snapshot_to_vm
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

print('🔄 Testing hot-swap function...')
result = hot_swap_snapshot_to_vm()
if result:
    print('✅ Hot-swap test completed successfully!')
    sys.exit(0)
else:
    print('❌ Hot-swap test failed!')
    sys.exit(1)
"
    
    echo "✅ Hot-swap test complete!"
    exit 0
fi

# Default mode: run indexing
echo "📊 Running indexing mode..."

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