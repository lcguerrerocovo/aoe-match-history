#!/bin/sh

set -e

echo "[deploy] Starting deployment..."

# Create site/matches directory if it doesn't exist
echo "[deploy] Ensuring site/matches directory exists"
mkdir -p site/matches

# Upload data files
echo "[deploy] Uploading match data"
gsutil -m cp -n -r data/matches/* gs://aoe2.site/data/matches/
gsutil -m cp -n -r site/matches/* gs://aoe2.site/site/matches/ || true

# Make files public
echo "[deploy] Setting public ACL on files"
gsutil -m acl ch -r -u AllUsers:R gs://aoe2.site/data/matches/ gs://aoe2.site/site/matches/

echo "[deploy] Completed."