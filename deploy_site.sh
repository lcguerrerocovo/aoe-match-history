#!/bin/sh
set -e

echo "[deploy] Starting deployment..."

# CORS configuration (unchanged)
cat > cors.json << EOF
[
  {
    "origin": [
      "http://localhost:4173",
      "http://localhost:5173",
      "https://aoe2-match-history-site.storage.googleapis.com",
      "https://aoe2.site"
    ],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set cors.json gs://aoe2.site

# Upload the already-built UI from /app/site
echo "[deploy] Uploading UI from /app/site to gs://aoe2.site/"
gsutil -m cp -r /app/site/* gs://aoe2.site/

# Upload data files
echo "[deploy] Uploading match data"
gsutil -m cp -n -r data/matches/* gs://aoe2.site/data/matches/
gsutil -m cp -n -r site/matches/* gs://aoe2.site/site/matches/
gsutil -m cp data/100.json gs://aoe2.site/data/100.json

# Force no-cache on index.json
echo "[deploy] Forcing no-cache on index.json"
gsutil -m cp -r /app/site/assets/* gs://aoe2.site/assets/
gsutil -h "Cache-Control:no-cache, max-age=0" \
  cp data/matches/index.json gs://aoe2.site/data/matches/index.json

# Upload civ map with long cache
echo "[deploy] Uploading civ map with long cache"
gsutil -h "Cache-Control:public, max-age=86400" cp data/100.json \
  gs://aoe2.site/data/100.json

# Make everything public
echo "[deploy] Setting public ACL on gs://aoe2.site"
gsutil -m acl ch -r -u AllUsers:R gs://aoe2.site/

# Cleanup
rm cors.json

echo "[deploy] Completed."