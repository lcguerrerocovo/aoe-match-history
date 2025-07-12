#!/bin/bash
set -e

# Configuration
VM_NAME="${SEARCH_VM_NAME:-aoe-search}"
ZONE="${GCP_ZONE:-us-central1-a}"
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
LOCAL_PORT="7700"
REMOTE_PORT="7700"

echo "🔗 Setting up SSH tunnel to Meilisearch VM..."
echo "   VM: $VM_NAME"
echo "   Zone: $ZONE"
echo "   Project: $PROJECT_ID"
echo "   Local port: $LOCAL_PORT"
echo "   Remote port: $REMOTE_PORT"

# Check if tunnel is already running
if lsof -i :$LOCAL_PORT > /dev/null 2>&1; then
    echo "⚠️  Port $LOCAL_PORT is already in use. Stopping existing tunnel..."
    lsof -ti :$LOCAL_PORT | xargs kill -9
    sleep 2
fi

# Start SSH tunnel
echo "🚀 Starting SSH tunnel..."
gcloud compute ssh "$VM_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT_ID" \
    --tunnel-through-iap \
    --ssh-flag="-L $LOCAL_PORT:localhost:$REMOTE_PORT" \
    --ssh-flag="-N" \
    --ssh-flag="-f" \
    --quiet

echo "✅ SSH tunnel established: localhost:$LOCAL_PORT -> $VM_NAME:$REMOTE_PORT"
echo "🔗 Meilisearch should now be available at: http://localhost:$LOCAL_PORT"
echo ""
echo "To stop the tunnel, run:"
echo "  lsof -ti :$LOCAL_PORT | xargs kill -9" 