#!/bin/bash
set -e

# Check command line argument
BUILD=${1:-"true"}  # Default to "true" if no argument provided

echo "🔧 Build mode: $BUILD"

# Cleanup function
cleanup() {
  echo "🧹 Cleaning up test data..."
  rm -f ../../data/test_players.jsonl
  rm -rf ../../meili_data
  echo "🛑 Stopping any running Meilisearch containers..."
  docker ps -q --filter ancestor=getmeili/meilisearch:v1.7.3 | xargs -r docker stop
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
    docker build -f ../Dockerfile.indexer -t "$LOCAL_IMAGE" ..
    IMAGE_NAME="$LOCAL_IMAGE"
else
    echo "📥 Pulling production image from Artifact Registry..."
    docker pull "$PROD_IMAGE"
    IMAGE_NAME="$PROD_IMAGE"
fi

echo "🔨 Using image: $IMAGE_NAME"

# Create test data subset (first 2500 records)
echo "📝 Creating test data subset..."
head -n 2500 ../../data/active_players.jsonl > ../../data/test_players.jsonl
echo "📊 Test data: $(wc -l < ../../data/test_players.jsonl) records"

# Run the container
echo "🏃 Running indexer container..."
docker run --rm \
    --platform linux/amd64 \
    --entrypoint /bin/bash \
    -v "$(pwd)/entrypoint-local.sh:/entrypoint.sh" \
    -v "$(pwd)/../indexer.py:/indexer.py" \
    -v "$(pwd)/../../data/test_players.jsonl:/active_players.jsonl" \
    -v "$(pwd)/../../meili_data:/meili_data" \
    -v "$HOME/.config/gcloud:/root/.config/gcloud" \
    -e MEILI_HTTP_ADDR="http://localhost:7700" \
    -e MEILI_MASTER_KEY="masterKey" \
    -e SKIP_GCS_UPLOAD="true" \
    "$IMAGE_NAME" \
    -c "chmod +x /entrypoint.sh && /entrypoint.sh"

echo "✅ Local run complete!" 
