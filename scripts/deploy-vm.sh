#!/bin/bash
set -e

# --- Configuration ---
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
ZONE="${GCP_ZONE:-us-central1-a}"
VM_NAME="${SEARCH_VM_NAME:-aoe-search}"
MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-a-secure-master-key-change-this}"

# Config file paths
STARTUP_SCRIPT="./scripts/startup.sh"
MEILI_CONFIG="./scripts/meilisearch_config.json"

echo "🚀 Deploying Meilisearch VM..."
echo "   Project: $PROJECT_ID"
echo "   Zone:    $ZONE"
echo "   VM Name: $VM_NAME"

# Check if VM exists
if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" > /dev/null 2>&1; then
    echo "⚠️  VM $VM_NAME already exists. Updating metadata and restarting..."
    
    # Update metadata
    gcloud compute instances add-metadata "$VM_NAME" \
      --project="$PROJECT_ID" \
      --zone="$ZONE" \
      --metadata-from-file="startup-script=$STARTUP_SCRIPT,meili_config=$MEILI_CONFIG" \
      --metadata="meili_master_key=$MEILI_MASTER_KEY"
    
    # Restart to apply new startup script
    echo "🔄 Restarting VM to apply new configuration..."
    gcloud compute instances reset "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID"
    
else
    echo "📦 Creating new VM..."
    gcloud compute instances create "$VM_NAME" \
      --project="$PROJECT_ID" \
      --zone="$ZONE" \
      --machine-type="e2-micro" \
      --network-interface="network-tier=PREMIUM,subnet=default" \
      --maintenance-policy="MIGRATE" \
      --scopes="https://www.googleapis.com/auth/cloud-platform" \
      --tags="meilisearch-server" \
      --image-family="cos-stable" \
      --image-project="cos-cloud" \
      --boot-disk-size="10" \
      --boot-disk-type="pd-balanced" \
      --boot-disk-auto-delete \
      --labels="purpose=search,component=meilisearch,os=cos" \
      --metadata-from-file="startup-script=$STARTUP_SCRIPT,meili_config=$MEILI_CONFIG" \
      --metadata="meili_master_key=$MEILI_MASTER_KEY"
fi

# Create firewall rules
echo "🔒 Creating firewall rules..."
gcloud compute firewall-rules create allow-meilisearch-internal \
  --project="$PROJECT_ID" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:7700 \
  --source-ranges=10.0.0.0/8 \
  --target-tags=meilisearch-server \
  --description="Allow internal access to Meilisearch from Cloud Functions/Cloud Run" \
  --quiet || echo "Firewall rule may already exist"

gcloud compute firewall-rules create allow-meilisearch-ssh \
  --project="$PROJECT_ID" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=meilisearch-server \
  --description="Allow SSH access to Meilisearch VM" \
  --quiet || echo "SSH firewall rule may already exist"

# Get IPs
echo "⏳ Getting VM IPs..."
EXTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
INTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='get(networkInterfaces[0].networkIP)')

echo ""
echo "🎉 Meilisearch VM Deployed!"
echo "   External IP: $EXTERNAL_IP"
echo "   Internal IP: $INTERNAL_IP"
echo "   Master Key:  $MEILI_MASTER_KEY"
echo ""
echo "🔗 Test URL (wait ~1 min): http://$EXTERNAL_IP:7700/health"
echo ""
echo "📋 Next steps:"
echo "1. Wait 1-2 minutes for Meilisearch to fully start"
echo "2. Test: curl http://$EXTERNAL_IP:7700/health"
echo "3. Run: python scripts/index_from_jsonl.py data/active_players.jsonl"
echo "4. Deploy app: git push origin master (triggers GitHub Actions)" 