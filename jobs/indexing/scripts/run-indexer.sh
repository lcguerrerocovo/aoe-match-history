#!/bin/bash
set -e

# Check command line argument
BUILD=${1:-"true"}  # Default to "true" if no argument provided

echo "🔧 Build mode: $BUILD"

# Cleanup function
cleanup() {
  echo "🧹 Cleaning up test data..."
  echo "🛑 Stopping any running Meilisearch containers..."
  docker ps -q --filter ancestor=getmeili/meilisearch:v1.7.3 | xargs -r docker stop
  echo "🗑️ Removing test containers..."
  docker ps -a -q --filter ancestor=getmeili/meilisearch:v1.7.3 | xargs -r docker rm
  echo "📁 Removing test data directory..."
  rm -rf ../../meili_data
  echo "✅ Cleanup complete!"
}

# Clear existing data before testing
clear_test_data() {
  echo "🧹 Clearing existing test data..."
  rm -rf ../../meili_data
  echo "✅ Test data cleared - starting fresh"
}

trap cleanup EXIT

echo "🚀 Running Cloud Run indexer locally..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

# Use the correct Artifact Registry path
PROD_IMAGE="us-central1-docker.pkg.dev/aoe2-site/meilisearch/meilisearch-indexer"
LOCAL_IMAGE="meilisearch-indexer-local"

# Build the image from the Dockerfile (only if BUILD=true)
if [ "$BUILD" = "true" ]; then
    echo "📦 Building Docker image locally..."
    docker build -f ../Dockerfile.indexer -t "$LOCAL_IMAGE:latest" .. --network=host
    IMAGE_NAME="$LOCAL_IMAGE:latest"
else
    echo "📥 Pulling production image from Artifact Registry..."
    docker pull "$PROD_IMAGE"
    IMAGE_NAME="$PROD_IMAGE"
fi

echo "🔨 Using image: $IMAGE_NAME"

# Clear existing data to start fresh
clear_test_data

# Set test parameters for quick testing
export START_PROFILE_ID=${START_PROFILE_ID:-23300000}  # Start from high profile ID for testing
export MAX_CONSECUTIVE_EMPTY_BATCHES=${MAX_CONSECUTIVE_EMPTY_BATCHES:-3}  # Stop quickly for testing
export SKIP_GCS_UPLOAD=${SKIP_GCS_UPLOAD:-true}  # Skip GCS upload for local testing

# Conservative rate limiting for local testing
export BATCH_SIZE=${BATCH_SIZE:-200}  # Conservative rate limit for local testing
export RATE_LIMIT_RPS=${RATE_LIMIT_RPS:-20}  # Conservative rate limit for local testing
export CONCURRENT_REQUESTS=${CONCURRENT_REQUESTS:-5}  # Fewer concurrent requests for local testing
export TIMEOUT_SECONDS=${TIMEOUT_SECONDS:-15}  # Longer timeout for local testing

echo "📊 Test Configuration:"
echo "  START_PROFILE_ID: $START_PROFILE_ID"
echo "  MAX_CONSECUTIVE_EMPTY_BATCHES: $MAX_CONSECUTIVE_EMPTY_BATCHES"
echo "  SKIP_GCS_UPLOAD: $SKIP_GCS_UPLOAD"
echo "  RATE_LIMIT_RPS: $RATE_LIMIT_RPS"
echo "  CONCURRENT_REQUESTS: $CONCURRENT_REQUESTS"
echo "  TIMEOUT_SECONDS: $TIMEOUT_SECONDS"

# Run the container
echo "🏃 Running indexer container..."
echo "Current directory: $(pwd)"
echo "Indexer.py path: ../indexer.py"
echo "Indexer.py exists: $(test -f '../indexer.py' && echo 'YES' || echo 'NO')"
docker run --rm \
    --entrypoint /bin/bash \
    -v "$(pwd)/entrypoint-local.sh:/entrypoint.sh" \
    -v "$(pwd)/../../meili_data:/meili_data" \
    -v "$HOME/.config/gcloud:/root/.config/gcloud" \
    -e MEILI_HTTP_ADDR="http://localhost:7700" \
    -e MEILI_MASTER_KEY="a-secure-master-key-change-this" \
    -e SKIP_GCS_UPLOAD="$SKIP_GCS_UPLOAD" \
    -e START_PROFILE_ID="$START_PROFILE_ID" \
    -e MAX_CONSECUTIVE_EMPTY_BATCHES="$MAX_CONSECUTIVE_EMPTY_BATCHES" \
    -e RATE_LIMIT_RPS="$RATE_LIMIT_RPS" \
    -e CONCURRENT_REQUESTS="$CONCURRENT_REQUESTS" \
    -e TIMEOUT_SECONDS="$TIMEOUT_SECONDS" \
    -e BATCH_SIZE="$BATCH_SIZE" \
    -e GOOGLE_APPLICATION_CREDENTIALS="/root/.config/gcloud/application_default_credentials.json" \
    "$IMAGE_NAME" \
    -c "chmod +x /entrypoint.sh && /entrypoint.sh"

echo "✅ Indexing job complete!"

# Start persistent Meilisearch container with snapshot for testing
start_persistent_meilisearch() {
    echo "🚀 Starting persistent Meilisearch container with snapshot..."
    
    # Check if snapshot exists (Meilisearch creates data.snapshot or timestamped snapshots)
    if [ ! -d "../../meili_data/snapshots" ]; then
        echo "❌ No snapshots directory found at ../../meili_data/snapshots"
        echo "💡 The indexing job may have failed or not created a snapshot"
        return 1
    fi
    
    # Look for data.snapshot first (common Meilisearch naming)
    if [ -f "../../meili_data/snapshots/data.snapshot" ]; then
        SNAPSHOT_FILE="../../meili_data/snapshots/data.snapshot"
        echo "📦 Found data.snapshot: $(ls -lh "$SNAPSHOT_FILE")"
    else
        # Fall back to timestamped snapshots
        SNAPSHOT_FILE=$(ls -t ../../meili_data/snapshots/*.snapshot 2>/dev/null | head -1)
        if [ -z "$SNAPSHOT_FILE" ]; then
            echo "❌ No snapshot files found in ../../meili_data/snapshots/"
            echo "💡 Available files:"
            ls -la ../../meili_data/snapshots/ 2>/dev/null || echo "  (directory empty or not accessible)"
            return 1
        fi
        echo "📦 Found timestamped snapshot: $(ls -lh "$SNAPSHOT_FILE")"
    fi
    
    # Stop any existing containers
    docker stop meilisearch-test 2>/dev/null || true
    docker rm meilisearch-test 2>/dev/null || true
    
    # Start persistent container with snapshot
    docker run -d \
        --name meilisearch-test \
        -p 7700:7700 \
        -e MEILI_ENV=production \
        -e MEILI_MASTER_KEY="a-secure-master-key-change-this" \
        -v "$(pwd)/../../meili_data:/meili_data" \
        getmeili/meilisearch:v1.7.3 \
        meilisearch --import-snapshot "/meili_data/snapshots/$(basename "$SNAPSHOT_FILE")"
    
    echo "⏳ Waiting for Meilisearch to start..."
    sleep 10
    
    # Check if container is running
    if docker ps | grep -q meilisearch-test; then
        echo "✅ Meilisearch container started successfully!"
        echo "🌐 Access at: http://localhost:7700"
        echo "🔑 Master key: a-secure-master-key-change-this"
        
        # Verify document count
        echo ""
        echo "📊 Verifying document count..."
        sleep 5  # Give Meilisearch time to fully load
        
        # Get document count from the persistent container
        DOC_COUNT=$(curl -s -H 'Authorization: Bearer a-secure-master-key-change-this' http://localhost:7700/indexes/players/stats | jq -r '.numberOfDocuments // "unknown"')
        
        if [ "$DOC_COUNT" != "unknown" ] && [ "$DOC_COUNT" -gt 0 ]; then
            echo "✅ Snapshot import successful: $DOC_COUNT documents loaded"
        else
            echo "❌ Warning: No documents found in snapshot or error reading stats"
        fi
        
        echo ""
        echo "🛑 Press Ctrl+C to stop and cleanup"
        
        # Keep container running until user interrupts
        trap cleanup EXIT
        wait
    else
        echo "❌ Failed to start Meilisearch container"
        docker logs meilisearch-test
        return 1
    fi
}

# Start persistent container if indexing was successful
if [ $? -eq 0 ]; then
    start_persistent_meilisearch
else
    echo "❌ Indexing job failed, not starting persistent container"
    exit 1
fi 

