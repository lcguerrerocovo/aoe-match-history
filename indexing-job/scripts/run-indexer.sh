#!/bin/bash
set -e

# Check command line argument
MODE=${1:-"index"}  # Default to "index" if no argument provided

echo "🔧 Running in mode: $MODE"

# Cleanup function
cleanup() {
  echo "🧹 Cleaning up test data..."
  rm -f ../../data/test_players.jsonl
  rm -rf ../../meili_data
  rm -f ../../data/latest_snapshot.snapshot
  echo "🛑 Stopping any running Meilisearch containers..."
  docker ps -q --filter ancestor=getmeili/meilisearch:v1.7.3 | xargs -r docker stop
}

# Only run cleanup for indexing mode
if [ "$MODE" = "index" ]; then
    trap cleanup EXIT
fi

echo "🚀 Running Cloud Run indexer locally in $MODE mode..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

# Use the correct Artifact Registry path
IMAGE_NAME="us-central1-docker.pkg.dev/aoe2-site/meilisearch/meilisearch-indexer"
echo "🔨 Using image: $IMAGE_NAME"

# Pull the image
echo "📥 Pulling image from registry..."
docker pull "$IMAGE_NAME"

# Prepare Docker run command
DOCKER_CMD="docker run --rm \
    --platform linux/amd64 \
    --entrypoint /bin/bash \
    -v \"$(pwd)/entrypoint-local.sh:/entrypoint.sh\" \
    -v \"$(pwd)/../indexer.py:/indexer.py\" \
    -v \"$HOME/.config/gcloud:/root/.config/gcloud\" \
    -e MEILI_HTTP_ADDR=\"http://localhost:7700\" \
    -e MEILI_MASTER_KEY=\"masterKey\" \
    \"$IMAGE_NAME\" \
    -c \"chmod +x /entrypoint.sh && /entrypoint.sh $MODE\""

if [ "$MODE" = "index" ]; then
    # Create test data subset (first 2500 records)
    echo "📝 Creating test data subset..."
    head -n 2500 ../../data/active_players.jsonl > ../../data/test_players.jsonl
    echo "📊 Test data: $(wc -l < ../../data/test_players.jsonl) records"
    
    # Add data volume mount for indexing mode
    DOCKER_CMD="docker run --rm \
        --platform linux/amd64 \
        --entrypoint /bin/bash \
        -v \"$(pwd)/entrypoint-local.sh:/entrypoint.sh\" \
        -v \"$(pwd)/../indexer.py:/indexer.py\" \
        -v \"$(pwd)/../../data/test_players.jsonl:/active_players.jsonl\" \
        -v \"$(pwd)/../../meili_data:/meili_data\" \
        -v \"$HOME/.config/gcloud:/root/.config/gcloud\" \
        -e MEILI_HTTP_ADDR=\"http://localhost:7700\" \
        -e MEILI_MASTER_KEY=\"masterKey\" \
        \"$IMAGE_NAME\" \
        -c \"chmod +x /entrypoint.sh && /entrypoint.sh $MODE\""

elif [ "$MODE" = "hotswap" ]; then
    # Download latest snapshot from GCS
    echo "📥 Downloading latest snapshot from GCS..."
    LATEST_SNAPSHOT=$(gsutil ls gs://aoe2-site-data/meilisearch-snapshot-*.snapshot | tail -1)
    if [ -z "$LATEST_SNAPSHOT" ]; then
        echo "❌ No snapshots found in GCS"
        exit 1
    fi
    
    echo "📦 Downloading: $LATEST_SNAPSHOT"
    gsutil cp "$LATEST_SNAPSHOT" ../../data/latest_snapshot.snapshot
    
    # Add snapshot volume mount for hot-swap mode
    DOCKER_CMD="docker run --rm \
        --platform linux/amd64 \
        --entrypoint /bin/bash \
        -v \"$(pwd)/entrypoint-local.sh:/entrypoint.sh\" \
        -v \"$(pwd)/../indexer.py:/indexer.py\" \
        -v \"$(pwd)/../../data/latest_snapshot.snapshot:/meili_data/snapshots/latest.snapshot\" \
        -v \"$HOME/.config/gcloud:/root/.config/gcloud\" \
        -e MEILI_HTTP_ADDR=\"http://localhost:7700\" \
        -e MEILI_MASTER_KEY=\"masterKey\" \
        \"$IMAGE_NAME\" \
        -c \"chmod +x /entrypoint.sh && /entrypoint.sh $MODE\""
fi

# Run the container
echo "🏃 Running indexer container in $MODE mode..."
eval $DOCKER_CMD

echo "✅ Local run complete!" 
