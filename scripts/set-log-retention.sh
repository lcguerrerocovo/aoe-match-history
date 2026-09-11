#!/usr/bin/env bash
# Extends Cloud Logging _Default bucket retention to 365 days (GitHub issue #43).
#
# The 30-day default ages out all request-level API history. Server logs still
# cannot measure traffic (stats pages read JSON straight from GCS, CDN-cached
# views never reach the origin — that is what client-side analytics is for),
# but this preserves the request-level debugging/abuse history that they CAN
# see. At this site's volume (~32k entries/month) extended retention costs
# pennies/month.
#
# Run once; idempotent. Defaults to the aoe2-site project, 365 days.

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-aoe2-site}"
RETENTION_DAYS="${RETENTION_DAYS:-365}"

gcloud logging buckets update _Default \
  --project="$PROJECT_ID" \
  --location=global \
  --retention-days="$RETENTION_DAYS"
