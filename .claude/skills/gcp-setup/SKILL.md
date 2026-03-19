---
name: gcp-setup
description: Use when setting up GCP project infrastructure, configuring IAM roles/service accounts, creating GCS buckets, mapping Cloud Run custom domains, or troubleshooting deployment permissions
---

# GCP Infrastructure Setup

## Overview

aoe2.site runs on these GCP services in project `aoe2-site`:

| Service | Purpose | Region |
|---------|---------|--------|
| Cloud Run | API proxy (`aoe2-api-proxy`) | us-central1 |
| Cloud Storage | Static site hosting (`gs://aoe2.site`) | us-east1 |
| Firestore | Session management, player data cache | default |
| Compute Engine | Meilisearch search VM (`aoe-search`, e2-micro) | us-central1-a |
| Cloud Build | Container builds for Cloud Run deploys | — |

## Service Account & IAM Roles

Service account: `aoe2-site-bot@aoe2-site.iam.gserviceaccount.com`

### Required Roles

| Role | Purpose |
|------|---------|
| `roles/run.admin` | Deploy and manage Cloud Run services |
| `roles/storage.admin` | Upload build artifacts and data files to GCS |
| `roles/iam.serviceAccountUser` | Act as the service account during deploys |
| `roles/datastore.user` | Read/write Firestore (session, player data) |
| `roles/cloudbuild.builds.editor` | Build containers from source for Cloud Run |
| `roles/compute.instanceAdmin.v1` | Manage Meilisearch VM |
| `roles/compute.networkAdmin` | Manage firewall rules for Meilisearch VM |

### Grant All Roles

```bash
SA="serviceAccount:aoe2-site-bot@aoe2-site.iam.gserviceaccount.com"

for ROLE in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/datastore.user \
  roles/storage.admin \
  roles/cloudbuild.builds.editor \
  roles/compute.instanceAdmin.v1 \
  roles/compute.networkAdmin; do
  gcloud projects add-iam-policy-binding aoe2-site \
    --member="$SA" --role="$ROLE"
done
```

### Public API Access

The Cloud Run proxy must be publicly invocable:

```bash
gcloud run services add-iam-policy-binding aoe2-api-proxy \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

## GCS Bucket Setup

One-time setup for the static site bucket:

```bash
# Create bucket
gsutil mb -l us-east1 gs://aoe2.site

# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://aoe2.site

# Set website configuration (index.html as both main and error page for SPA routing)
gsutil web set -m index.html -e index.html gs://aoe2.site
```

## Cloud Run Custom Domain Mapping

Maps `api.aoe2.site` to the `aoe2-api-proxy` Cloud Run service. The region in the mapping **must match** the service region.

### Step-by-step

1. **Deploy Cloud Run service** to `us-central1` (handled by CI).

2. **Create domain mapping** (same region as the service):
   ```bash
   gcloud beta run domain-mappings create \
     --service=aoe2-api-proxy \
     --region=us-central1 \
     --domain=api.aoe2.site
   ```

3. **Add CNAME in Cloudflare** pointing to `ghs.googlehosted.com.`:

   | Type  | Name | Content               | Proxy Status |
   |-------|------|-----------------------|--------------|
   | CNAME | api  | ghs.googlehosted.com. | Proxied      |

   If certificate provisioning fails, temporarily set to "DNS only" until SSL is ready, then re-enable proxy.

4. **Wait for SSL certificate** (5-30 minutes). Check status:
   ```bash
   gcloud beta run domain-mappings describe \
     --region=us-central1 \
     --domain=api.aoe2.site
   ```
   Look for `type: Ready` and `type: CertificateProvisioned` with `status: 'True'`.

5. **Set Cloudflare SSL/TLS mode** to **Full** (not Full Strict, not Flexible). Ensure Universal SSL is enabled.

6. **Purge Cloudflare cache** after SSL is provisioned and proxy is enabled.

7. **Test:**
   ```bash
   curl -I https://api.aoe2.site/api/steam/avatar/76561198377637238
   ```

## GitHub Actions Secrets

These secrets must be configured in the GitHub repository for CI/CD:

| Secret | Purpose |
|--------|---------|
| `GCP_SA_KEY` | Service account JSON key for `aoe2-site-bot` — used for all GCP deploys |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Zone:Zone:Edit, Zone:Cache Purge) |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone ID for aoe2.site |
| `STEAM_API_KEY` | Steam Web API key — passed as Cloud Run env var |
| `RELIC_AUTH_STEAM_USER` | Steam username for Relic API auth |
| `RELIC_AUTH_STEAM_PASS` | Steam password for Relic API auth |
| `MEILISEARCH_API_KEY` | Meilisearch master key — passed as Cloud Run env var |

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 404 on `api.aoe2.site` | Domain mapping points to wrong region | Delete and recreate mapping with `--region=us-central1` |
| 525 SSL error | SSL/TLS mode wrong or cert not yet provisioned | Set Cloudflare to Full, set proxy to DNS-only until cert provisions, then re-enable |
| `CertificatePending` status | Google hasn't issued cert yet | Set Cloudflare proxy to DNS-only, wait, re-enable after cert is ready |
| Deploy fails with permission error | Missing IAM role on service account | Check roles listed above, grant missing ones |
| `could not build` in Cloud Run deploy | Missing `roles/cloudbuild.builds.editor` | Grant the Cloud Build role to the service account |
| GCS upload denied | Missing `roles/storage.admin` | Grant the storage admin role |
