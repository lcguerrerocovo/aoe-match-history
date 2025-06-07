#!/bin/sh
set -e

echo "[deploy] Starting deployment..."

# Clean up old match files
echo "[deploy] Cleaning up old match files"
gsutil -m rm -r gs://aoe2.site/matches/ || true

# Upload data files
echo "[deploy] Uploading match data"
gsutil -m cp -n -r data/matches/* gs://aoe2.site/data/matches/
gsutil -m cp -n -r site/matches/* gs://aoe2.site/site/matches/
gsutil -m cp data/100.json gs://aoe2.site/data/100.json

# Force no-cache on index.json
echo "[deploy] Forcing no-cache on index.json"
gsutil -h "Cache-Control:no-cache, max-age=0" \
  cp data/matches/index.json gs://aoe2.site/data/matches/index.json

# Upload civ map with long cache
echo "[deploy] Uploading civ map with long cache"
gsutil -h "Cache-Control:public, max-age=86400" cp data/100.json \
  gs://aoe2.site/data/100.json

# Make everything public
echo "[deploy] Setting public ACL on gs://aoe2.site"
gsutil -m acl ch -r -u AllUsers:R gs://aoe2.site/

echo "[deploy] Completed."