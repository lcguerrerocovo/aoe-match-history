#!/bin/bash
set -e

# --- Configuration ---
# MATCH_DB_PASSWORD: store in GitHub repo secrets, export locally when running this script.
# Same pattern as MEILI_MASTER_KEY for the aoe-search VM.
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
ZONE="${GCP_ZONE:-us-central1-a}"
VM_NAME="${MATCH_DB_VM_NAME:-aoe-match-db}"
DB_PASSWORD="${MATCH_DB_PASSWORD:?Must set MATCH_DB_PASSWORD (stored in GitHub repo secrets)}"

STARTUP_SCRIPT="./startup.sh"

echo "Deploying PostgreSQL VM..."
echo "   Project: $PROJECT_ID"
echo "   Zone:    $ZONE"
echo "   VM Name: $VM_NAME"

# Check if VM exists
if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" > /dev/null 2>&1; then
    echo "VM $VM_NAME already exists. Updating metadata and restarting..."

    gcloud compute instances add-metadata "$VM_NAME" \
      --project="$PROJECT_ID" \
      --zone="$ZONE" \
      --metadata-from-file="startup-script=$STARTUP_SCRIPT" \
      --metadata="db_password=$DB_PASSWORD"

    echo "Restarting VM to apply new configuration..."
    gcloud compute instances reset "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID"

else
    echo "Creating new VM..."
    gcloud compute instances create "$VM_NAME" \
      --project="$PROJECT_ID" \
      --zone="$ZONE" \
      --machine-type="e2-medium" \
      --network-interface="network-tier=PREMIUM,subnet=default" \
      --maintenance-policy="MIGRATE" \
      --scopes="https://www.googleapis.com/auth/cloud-platform" \
      --tags="postgres-server" \
      --image-family="debian-12" \
      --image-project="debian-cloud" \
      --boot-disk-size="20" \
      --boot-disk-type="pd-ssd" \
      --boot-disk-auto-delete \
      --labels="purpose=database,component=postgresql" \
      --metadata-from-file="startup-script=$STARTUP_SCRIPT" \
      --metadata="db_password=$DB_PASSWORD"
fi

# Create firewall rules
echo "Creating firewall rules..."
bash ./firewall.sh

# Get IPs
echo "Getting VM IPs..."
EXTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
INTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='get(networkInterfaces[0].networkIP)')

echo ""
echo "PostgreSQL VM Deployed!"
echo "   VM Name:     $VM_NAME"
echo "   External IP: $EXTERNAL_IP"
echo "   Internal IP: $INTERNAL_IP"
echo ""
echo "Connection string (internal):"
echo "   postgresql://collector:***@$INTERNAL_IP:5432/aoe2_matches"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for PostgreSQL to install and start"
echo "2. Test: psql postgresql://collector:***@$EXTERNAL_IP:5432/aoe2_matches"
echo "3. Run migrations: DATABASE_URL=postgresql://collector:\$MATCH_DB_PASSWORD@$INTERNAL_IP:5432/aoe2_matches bash migrate-db.sh"
