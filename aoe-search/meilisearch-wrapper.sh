#!/bin/bash
set -e
set -o pipefail

# Meilisearch Wrapper Script
# Handles Docker restart with snapshot import and settings application

MEILI_MASTER_KEY=${MEILI_MASTER_KEY:-$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_master_key" -H "Metadata-Flavor: Google" 2>/dev/null || echo "a-default-dev-only-master-key")}
MEILI_URL="http://localhost:7700"

echo "--- Meilisearch Wrapper Script ---"

# Function to wait for Meilisearch to be ready
wait_for_meilisearch() {
    echo "⏳ Waiting for Meilisearch to be ready..."
    for i in {1..60}; do
        if curl -f "$MEILI_URL/health" >/dev/null 2>&1; then
            echo "✅ Meilisearch is ready"
            return 0
        fi
        echo "Waiting for Meilisearch... (attempt $i/60)"
        sleep 3
    done
    echo "❌ Meilisearch failed to start"
    return 1
}

# Function to wait for critical tasks to complete
wait_for_critical_tasks() {
    echo "⏳ Waiting for critical tasks to complete..."
    
    for i in {1..60}; do
        # Get critical tasks (documentAddition, indexCreation, settingsUpdate)
        local critical_tasks=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/tasks" | jq -r '.results[] | select((.type == "documentAddition" or .type == "indexCreation" or .type == "settingsUpdate") and (.status == "enqueued" or .status == "processing")) | .uid' | head -5)
        
        if [ -z "$critical_tasks" ]; then
            echo "✅ No critical tasks found"
            return 0
        else
            echo "⏳ Waiting for critical tasks: $critical_tasks"
            sleep 5
        fi
    done
    
    echo "❌ Critical tasks did not complete in time"
    return 1
}

# Function to check if Meilisearch is ready for search
check_search_ready() {
    echo "🔍 Checking if Meilisearch is ready for search..."
    
    # Check if index exists and has documents
    local doc_count=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/indexes/players/stats" | jq -r '.numberOfDocuments // 0')
    
    # Ensure doc_count is a number
    if [[ ! "$doc_count" =~ ^[0-9]+$ ]]; then
        doc_count=0
    fi
    
    if [ "$doc_count" -gt 0 ]; then
        echo "✅ Index has $doc_count documents - ready for search"
        return 0
    else
        echo "⚠️ Index has no documents yet"
        return 1
    fi
}

# Function to create index if it doesn't exist
create_index() {
    echo "🔧 Checking if players index exists..."
    local index_exists=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/indexes/players" 2>/dev/null | jq -r '.uid // empty')
    
    if [ -z "$index_exists" ]; then
        echo "Creating players index..."
        # Extract index creation config (only uid + primaryKey)
        local index_config=$(cat /mnt/stateful_partition/meilisearch/config/meilisearch_config.json 2>/dev/null | jq -c '{uid: .uid, primaryKey: .primaryKey}' || echo '{"uid": "players", "primaryKey": "profile_id"}')
        
        local create_response=$(curl -X POST "$MEILI_URL/indexes" \
            -H "Authorization: Bearer $MEILI_MASTER_KEY" \
            -H 'Content-Type: application/json' \
            --data-binary "$index_config")
        
        local task_uid=$(echo "$create_response" | jq -r '.taskUid // empty')
        if [ -n "$task_uid" ]; then
            echo "⏳ Waiting for index creation..."
            until [ "$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/tasks/$task_uid" | jq -r '.status')" = "succeeded" ]; do
                sleep 3
            done
            echo "✅ Index created"
        fi
    else
        echo "✅ Index already exists"
    fi
}



# Function to setup config file
setup_config() {
    echo "📋 Setting up Meilisearch config..."
    
    # Create config directory
    mkdir -p /mnt/stateful_partition/meilisearch/config
    
    # Copy config file if it exists in current directory
    if [ -f "./meilisearch_config.json" ]; then
        cp ./meilisearch_config.json /mnt/stateful_partition/meilisearch/config/
        echo "✅ Config file copied to persistent storage"
    else
        echo "⚠️ No config file found in current directory"
    fi
}

# Function to apply settings
apply_settings() {
    echo "🔧 Applying index settings..."
    
    # Extract settings config (everything except uid + primaryKey) - same as deployment workflow
    local settings_config=$(cat /mnt/stateful_partition/meilisearch/config/meilisearch_config.json 2>/dev/null | jq -c 'del(.uid, .primaryKey)' || echo '{}')
    
    echo "📋 Settings config: $settings_config"
    
    local settings_response=$(curl -X PATCH "$MEILI_URL/indexes/players/settings" \
        -H "Authorization: Bearer $MEILI_MASTER_KEY" \
        -H 'Content-Type: application/json' \
        --data-binary "$settings_config")
    
    local task_uid=$(echo "$settings_response" | jq -r '.taskUid // empty')
    if [ -n "$task_uid" ]; then
        echo "⏳ Waiting for settings to apply..."
        for i in {1..20}; do
            local task_status=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/tasks/$task_uid" | jq -r '.status')
            if [ "$task_status" = "succeeded" ]; then
                echo "✅ Settings applied successfully"
                return 0
            elif [ "$task_status" = "failed" ]; then
                echo "❌ Settings application failed"
                return 1
            else
                echo "Settings still applying... (attempt $i/20)"
                sleep 3
            fi
        done
        echo "⚠️ Settings application timed out, but continuing..."
    else
        echo "⚠️ No settings task created, settings may already be applied"
    fi
}

# Function to verify final state
verify_state() {
    echo "🔍 Verifying final state..."
    
    local doc_count=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/indexes/players/stats" | jq -r '.numberOfDocuments // 0')
    local sortable_attrs=$(curl -s -H "Authorization: Bearer $MEILI_MASTER_KEY" "$MEILI_URL/indexes/players/settings" | jq -r '.sortableAttributes // []' | jq length)
    
    echo "📊 Documents: $doc_count"
    echo "📝 Sortable attributes: $sortable_attrs"
    
    # Check if snapshot was loaded from persistent storage
    if [ -f '/mnt/stateful_partition/meilisearch/snapshots/latest.fingerprint.txt' ]; then
        local current_fingerprint=$(cat /mnt/stateful_partition/meilisearch/snapshots/latest.fingerprint.txt)
        echo "✅ Snapshot loaded with fingerprint: $current_fingerprint"
    else
        echo "⚠️ No fingerprint file found"
    fi
    
    # Verify both snapshot data and configuration
    if [ "$doc_count" -gt 0 ] && [ "$sortable_attrs" -gt 0 ]; then
        echo "✅ Wrapper completed successfully - $doc_count documents loaded with proper configuration"
        return 0
    else
        echo "❌ Deployment issue: documents=$doc_count, sortable_attrs=$sortable_attrs"
        return 1
    fi
}



# Function to import snapshot after settings are applied
import_snapshot() {
    if [ -f "/mnt/stateful_partition/meilisearch/snapshots/latest.snapshot" ]; then
        echo "📦 Importing snapshot..."
        echo "📁 Snapshot file: /mnt/stateful_partition/meilisearch/snapshots/latest.snapshot"
        echo "📏 Snapshot size: $(ls -lh /mnt/stateful_partition/meilisearch/snapshots/latest.snapshot | awk '{print $5}')"
        
        # Stop and remove current container
        docker stop meilisearch 2>/dev/null || true
        docker rm meilisearch 2>/dev/null || true
        
        # Clean data directory for snapshot import
        echo "🧹 Cleaning data directory for snapshot import..."
        rm -rf /mnt/stateful_partition/meilisearch/data/*
        
        # Start new container with snapshot import
        local container_id=$(docker run -d \
            --name meilisearch \
            --restart unless-stopped \
            -p 7700:7700 \
            -e MEILI_ENV=production \
            -e MEILI_MASTER_KEY="$MEILI_MASTER_KEY" \
            -v /mnt/stateful_partition/meilisearch/data:/meili_data \
            -v /mnt/stateful_partition/meilisearch/snapshots:/meili_data/snapshots \
            getmeili/meilisearch:v1.7 \
            meilisearch --import-snapshot /meili_data/snapshots/latest.snapshot)
        
        echo "📦 Container started with ID: $container_id"
        
        # Check container logs for any errors
        sleep 5
        echo "📋 Container logs:"
        docker logs meilisearch --tail 10
    else
        echo "⚠️ No snapshot found, skipping import"
    fi
}

# Main execution
main() {
    echo "🚀 Starting Meilisearch wrapper..."
    
    # Stop and remove existing container
    echo "🔄 Stopping existing container..."
    docker stop meilisearch 2>/dev/null || true
    docker rm meilisearch 2>/dev/null || true
    
    # Import snapshot (which now includes settings)
    import_snapshot
    
    # Wait for snapshot import to complete
    wait_for_critical_tasks || exit 1
    
    # Wait for Meilisearch to be ready
    wait_for_meilisearch || exit 1
    
    # Check if ready for search
    check_search_ready || exit 1
    
    # Verify final state
    verify_state || exit 1
    
    echo "🎉 Meilisearch wrapper completed successfully!"
}

# Run main function
main "$@" 