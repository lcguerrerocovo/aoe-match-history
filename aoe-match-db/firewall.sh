#!/bin/bash
set -e

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"

echo "Creating firewall rules for PostgreSQL VM..."

# Allow PostgreSQL from internal GCP network (Cloud Run, Cloud Run Jobs)
gcloud compute firewall-rules create allow-postgres-internal \
  --project="$PROJECT_ID" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:5432 \
  --source-ranges=10.0.0.0/8 \
  --target-tags=postgres-server \
  --description="Allow internal access to PostgreSQL from Cloud Run/Cloud Run Jobs" \
  --quiet || echo "Firewall rule 'allow-postgres-internal' may already exist"

# Allow SSH for maintenance
gcloud compute firewall-rules create allow-postgres-ssh \
  --project="$PROJECT_ID" \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=postgres-server \
  --description="Allow SSH access to PostgreSQL VM" \
  --quiet || echo "Firewall rule 'allow-postgres-ssh' may already exist"

echo "Firewall rules configured"
