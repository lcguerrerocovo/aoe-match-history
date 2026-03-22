#!/bin/bash
set -e

echo "🔍 Checking Meilisearch version consistency..."

# Define expected version
EXPECTED_VERSION="v1.7.3"
FILES_TO_CHECK=(
    "jobs/indexing/Dockerfile.indexer"
    "aoe-search/startup.sh"
    "aoe-search/meilisearch-wrapper.sh"
)

# Check each file
for file in "${FILES_TO_CHECK[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ File not found: $file"
        exit 1
    fi
    
    # Extract version from file
    version=$(grep -o "getmeili/meilisearch:[^[:space:]]*" "$file" | head -1 | cut -d: -f2)
    
    if [ "$version" = "$EXPECTED_VERSION" ]; then
        echo "✅ $file: $version"
    else
        echo "❌ $file: $version (expected $EXPECTED_VERSION)"
        exit 1
    fi
done

echo "🎉 All versions are consistent!" 