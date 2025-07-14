#!/bin/bash
set -e

echo "🚀 Running Cloud Run indexer locally..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

# Use the correct Artifact Registry path
IMAGE_NAME="us-central1-docker.pkg.dev/aoe2-site/meilisearch/meilisearch-indexer"
echo "🔨 Using image: $IMAGE_NAME"

# Create test data subset (first 10 records)
echo "📝 Creating test data subset..."
head -n 2500 ../../data/active_players.jsonl > ../../data/test_players.jsonl
echo "📊 Test data: $(wc -l < ../../data/test_players.jsonl) records"

# Pull the image
echo "📥 Pulling image from registry..."
docker pull "$IMAGE_NAME"

# Run the container with local entrypoint
echo "🏃 Running indexer container..."
docker run --rm \
    --platform linux/amd64 \
    --entrypoint /bin/bash \
    -v "$(pwd)/entrypoint-local.sh:/entrypoint.sh" \
    -v "$(pwd)/../../data/test_players.jsonl:/active_players.jsonl" \
    -v "$(pwd)/../../meili_data:/meili_data" \
    -v "$HOME/.config/gcloud:/root/.config/gcloud" \
    -e MEILI_HTTP_ADDR="http://localhost:7700" \
    -e MEILI_MASTER_KEY="masterKey" \
    "$IMAGE_NAME" \
    -c "chmod +x /entrypoint.sh && /entrypoint.sh"

rm -f ../../data/test_players.jsonl
echo "✅ Local run complete!" 
