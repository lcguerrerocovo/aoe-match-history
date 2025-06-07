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

# Force no-cache on index.json
echo "[deploy] Forcing no-cache on index.json"
gsutil -h "Cache-Control:no-cache, max-age=0" \
  cp data/matches/index.json gs://aoe2.site/data/matches/index.json

# Make match data public
echo "[deploy] Setting public ACL on match data"
gsutil -m acl ch -r -u AllUsers:R gs://aoe2.site/index.html gs://aoe2.site/data/matches/ gs://aoe2.site/site/matches/

echo "[deploy] Completed."