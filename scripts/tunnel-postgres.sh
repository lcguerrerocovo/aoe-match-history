#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SA_KEY="$REPO_ROOT/.gcp-sa-key.json"

# Configuration
VM_NAME="${MATCH_DB_VM_NAME:-aoe-match-db}"
ZONE="${GCP_ZONE:-us-central1-a}"
PROJECT_ID="${GCP_PROJECT_ID:-aoe2-site}"
LOCAL_PORT="5432"
REMOTE_PORT="5432"

# Activate service account if key exists
if [ -f "$SA_KEY" ]; then
    gcloud auth activate-service-account --key-file="$SA_KEY" --project="$PROJECT_ID" --quiet 2>/dev/null
fi

echo "Setting up SSH tunnel to PostgreSQL VM..."
echo "   VM: $VM_NAME"
echo "   Zone: $ZONE"
echo "   Local port: $LOCAL_PORT"

# Check if tunnel is already running
if lsof -i :$LOCAL_PORT > /dev/null 2>&1; then
    echo "Port $LOCAL_PORT is already in use. Stopping existing tunnel..."
    lsof -ti :$LOCAL_PORT | xargs kill -9
    sleep 2
fi

# Start SSH tunnel
gcloud compute ssh "$VM_NAME" \
    --zone="$ZONE" \
    --project="$PROJECT_ID" \
    --ssh-flag="-L $LOCAL_PORT:localhost:$REMOTE_PORT" \
    --ssh-flag="-N" \
    --ssh-flag="-f" \
    --quiet

echo "SSH tunnel established: localhost:$LOCAL_PORT -> $VM_NAME:$REMOTE_PORT"
echo ""
echo "To stop the tunnel, run:"
echo "  lsof -ti :$LOCAL_PORT | xargs kill -9"
