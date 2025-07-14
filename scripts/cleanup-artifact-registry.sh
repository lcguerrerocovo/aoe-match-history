#!/bin/bash
set -e

# Configuration
PROJECT_ID="aoe2-site"
REGION="us-central1"
REPOSITORY="meilisearch"
IMAGE_NAME="meilisearch-indexer"

echo "Cleaning up old Docker images from Artifact Registry..."

# Get all tags for the image
TAGS=$(gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME} --include-tags --format="value(tags)" | tr ',' '\n' | sort -u)

if [ -z "$TAGS" ]; then
    echo "No tags found for ${IMAGE_NAME}"
    exit 0
fi

echo "Found tags: $TAGS"

# Delete all tags except 'latest'
for TAG in $TAGS; do
    if [ "$TAG" != "latest" ]; then
        echo "Deleting tag: $TAG"
        gcloud artifacts docker images delete ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${TAG} --quiet || echo "Failed to delete tag: $TAG"
    else
        echo "Keeping tag: $TAG"
    fi
done

echo "Cleanup completed!" 