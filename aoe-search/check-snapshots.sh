#!/bin/bash
set -e

echo "🔍 Manual Snapshot Checker"
echo "=========================="

# Configuration
MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-a-secure-master-key-change-this}"
GCS_BUCKET="gs://aoe2-site-data"

echo "Checking for new snapshots in $GCS_BUCKET..."

# Get latest snapshot from GCS (sorted by timestamp)
LATEST_SNAPSHOT=$(gsutil ls ${GCS_BUCKET}/snapshots/*/data.snapshot 2>/dev/null | sort | tail -1 || echo "")

if [ -z "$LATEST_SNAPSHOT" ]; then
    echo "❌ No snapshots found in GCS"
    exit 1
fi

echo "📦 Found latest snapshot: $LATEST_SNAPSHOT"

# Extract snapshot directory and get fingerprint
SNAPSHOT_DIR=$(echo "$LATEST_SNAPSHOT" | sed 's|gs://aoe2-site-data/||' | sed 's|/data.snapshot||')
LATEST_FINGERPRINT_PATH="${GCS_BUCKET}/${SNAPSHOT_DIR}/fingerprint.txt"
METADATA_PATH="${GCS_BUCKET}/${SNAPSHOT_DIR}/metadata.json"

echo "📋 Snapshot directory: $SNAPSHOT_DIR"
echo "📋 Fingerprint path: $LATEST_FINGERPRINT_PATH"
echo "📋 Metadata path: $METADATA_PATH"

# Download fingerprint
TEMP_FINGERPRINT="/tmp/latest_fingerprint.txt"
if gsutil cp "$LATEST_FINGERPRINT_PATH" "$TEMP_FINGERPRINT" 2>/dev/null; then
    LATEST_FINGERPRINT=$(cat "$TEMP_FINGERPRINT")
    rm -f "$TEMP_FINGERPRINT"
    echo "📋 Latest snapshot fingerprint: $LATEST_FINGERPRINT"
else
    echo "❌ Could not download fingerprint"
    exit 1
fi

# Download metadata to get details
TEMP_METADATA="/tmp/snapshot-metadata.json"
if gsutil cp "$METADATA_PATH" "$TEMP_METADATA" 2>/dev/null; then
    DOC_COUNT=$(jq -r '.document_count // "unknown"' "$TEMP_METADATA" 2>/dev/null || echo "unknown")
    CREATED_AT=$(jq -r '.created_at // "unknown"' "$TEMP_METADATA" 2>/dev/null || echo "unknown")
    echo "📊 Snapshot details: $DOC_COUNT documents, created: $CREATED_AT"
    rm -f "$TEMP_METADATA"
else
    echo "⚠️  Could not download metadata"
fi

# Get current index fingerprint
CURRENT_FINGERPRINT=""
if [ -f "/var/lib/meilisearch/data/snapshots/latest.fingerprint.txt" ]; then
    CURRENT_FINGERPRINT=$(cat /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt)
    echo "📋 Current index fingerprint: $CURRENT_FINGERPRINT"
else
    echo "📋 No current fingerprint found"
fi

if [ "$CURRENT_FINGERPRINT" = "$LATEST_FINGERPRINT" ]; then
    echo "✅ Index is up to date (fingerprint: $LATEST_FINGERPRINT)"
    exit 0
fi

echo "🔄 New snapshot detected! Performing hot-swap..."

# Check if Meilisearch is running
if ! docker ps | grep -q meilisearch; then
    echo "❌ Meilisearch is not running"
    exit 1
fi

# Stop Meilisearch
echo "⏹️  Stopping Meilisearch..."
docker stop meilisearch

# Backup current files
if [ -f "/var/lib/meilisearch/data/snapshots/latest.snapshot" ]; then
    BACKUP_NAME="latest.snapshot.backup.$(date +%Y%m%d-%H%M%S)"
    mv /var/lib/meilisearch/data/snapshots/latest.snapshot "/var/lib/meilisearch/data/snapshots/$BACKUP_NAME"
    echo "💾 Backed up current snapshot as $BACKUP_NAME"
fi

if [ -f "/var/lib/meilisearch/data/snapshots/latest.fingerprint.txt" ]; then
    BACKUP_FINGERPRINT="latest.fingerprint.txt.backup.$(date +%Y%m%d-%H%M%S)"
    mv /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt "/var/lib/meilisearch/data/snapshots/$BACKUP_FINGERPRINT"
    echo "💾 Backed up current fingerprint as $BACKUP_FINGERPRINT"
fi

if [ -f "/var/lib/meilisearch/data/snapshots/latest.metadata.json" ]; then
    BACKUP_META="latest.metadata.json.backup.$(date +%Y%m%d-%H%M%S)"
    mv /var/lib/meilisearch/data/snapshots/latest.metadata.json "/var/lib/meilisearch/data/snapshots/$BACKUP_META"
    echo "💾 Backed up current metadata as $BACKUP_META"
fi

# Download and install new snapshot
echo "⬇️  Downloading latest snapshot..."
gsutil cp "$LATEST_SNAPSHOT" /var/lib/meilisearch/data/snapshots/latest.snapshot
echo "📥 Installed new snapshot"

# Download new fingerprint
echo "⬇️  Downloading fingerprint..."
gsutil cp "$LATEST_FINGERPRINT_PATH" /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt
echo "📥 Installed new fingerprint"

# Download new metadata
echo "⬇️  Downloading metadata..."
gsutil cp "$METADATA_PATH" /var/lib/meilisearch/data/snapshots/latest.metadata.json
echo "📥 Installed new metadata"

# Start Meilisearch
echo "▶️  Starting Meilisearch..."
docker start meilisearch

# Wait for Meilisearch to be healthy
echo "⏳ Waiting for Meilisearch to be healthy..."
for i in $(seq 1 30); do
    if curl -f http://localhost:7700/health > /dev/null 2>&1; then
        echo "✅ Meilisearch is healthy after hot-swap"
        break
    fi
    echo "   Waiting for Meilisearch... (attempt $i/30)"
    sleep 2
done

# Verify the hot-swap worked
if curl -f http://localhost:7700/health > /dev/null 2>&1; then
    echo "✅ Meilisearch is healthy after hot-swap"
else
    echo "❌ Hot-swap failed - Meilisearch is not responding"
    exit 1
fi

# Generate fingerprint from live index to verify hot-swap
echo "🔍 Verifying hot-swap by generating live index fingerprint..."
generate_live_fingerprint() {
    # Configuration
    MEILI_URL="http://localhost:7700"
    INDEX_NAME="players"
    
    # Get document count and update time
    STATS_RESPONSE=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/indexes/$INDEX_NAME/stats")
    if [ $? -ne 0 ]; then
        echo "❌ Failed to get index stats"
        return 1
    fi
    
    DOC_COUNT=$(echo "$STATS_RESPONSE" | jq -r '.numberOfDocuments // 0')
    UPDATED_AT=$(echo "$STATS_RESPONSE" | jq -r '.updatedAt // ""')
    
    if [ "$DOC_COUNT" = "null" ] || [ "$DOC_COUNT" = "0" ]; then
        echo "❌ No documents found in index"
        return 1
    fi
    
    echo "📊 Live index stats: $DOC_COUNT documents, updated: $UPDATED_AT"
    
    # Sample aliases from throughout the index for better coverage
    SAMPLE_ALIASES=""
    SAMPLE_SIZE=50  # Number of samples to take (increased for robustness)
    SAMPLE_INTERVAL=$((DOC_COUNT / SAMPLE_SIZE))
    
    echo "📊 Sampling $SAMPLE_SIZE aliases from $DOC_COUNT total (interval: $SAMPLE_INTERVAL)"
    
    for i in $(seq 0 $((SAMPLE_SIZE - 1))); do
        OFFSET=$((i * SAMPLE_INTERVAL))
        if [ $OFFSET -ge $DOC_COUNT ]; then
            break
        fi
        
        SAMPLE_RESPONSE=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/indexes/$INDEX_NAME/documents?limit=1&offset=$OFFSET&fields=alias")
        if [ $? -ne 0 ]; then
            echo "❌ Failed to get sample at offset $OFFSET"
            continue
        fi
        
        # Extract results array from response
        SAMPLE_DOCS=$(echo "$SAMPLE_RESPONSE" | jq -r '.results // .')
        if [ "$SAMPLE_DOCS" = "null" ]; then
            echo "❌ Failed to parse sample at offset $OFFSET"
            continue
        fi
        
        ALIAS=$(echo "$SAMPLE_DOCS" | jq -r '.[0] | .alias // empty')
        if [ -n "$ALIAS" ] && [ "$ALIAS" != "null" ]; then
            if [ -n "$SAMPLE_ALIASES" ]; then
                SAMPLE_ALIASES="${SAMPLE_ALIASES}_${ALIAS}"
            else
                SAMPLE_ALIASES="$ALIAS"
            fi
        fi
    done
    
    if [ -z "$SAMPLE_ALIASES" ]; then
        echo "❌ No valid aliases collected"
        return 1
    fi
    
    # Sort the aliases for consistency (convert to array, sort, join back)
    SAMPLE_ALIASES=$(echo "$SAMPLE_ALIASES" | tr '_' '\n' | sort | tr '\n' '_' | sed 's/_$//')
    
    # Create fingerprint data
    FINGERPRINT_DATA="${DOC_COUNT}_${SAMPLE_ALIASES}_${UPDATED_AT}"
    
    # Generate hash
    LIVE_FINGERPRINT=$(echo -n "$FINGERPRINT_DATA" | sha256sum | cut -d' ' -f1)
    
    echo "🔍 Generated live fingerprint: $LIVE_FINGERPRINT"
    echo "📋 Fingerprint data: $DOC_COUNT docs, aliases: $(echo "$SAMPLE_ALIASES" | cut -d'_' -f1-5)..."
    
    echo "$LIVE_FINGERPRINT"
}

# Generate fingerprint from live index
LIVE_FINGERPRINT=$(generate_live_fingerprint)
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate live fingerprint"
    exit 1
fi

# Compare live fingerprint with expected fingerprint
if [ "$LIVE_FINGERPRINT" = "$LATEST_FINGERPRINT" ]; then
    echo "🎉 Hot-swap verification successful!"
    echo "✅ Live index fingerprint matches expected fingerprint"
    echo "📊 New snapshot is now active and verified"
    echo "📋 Verified fingerprint: $LIVE_FINGERPRINT"
else
    echo "❌ Hot-swap verification failed!"
    echo "❌ Live fingerprint: $LIVE_FINGERPRINT"
    echo "❌ Expected fingerprint: $LATEST_FINGERPRINT"
    echo "❌ Fingerprints do not match - hot-swap may have failed"
    exit 1
fi 