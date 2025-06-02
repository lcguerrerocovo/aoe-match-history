#!/bin/sh
set -e

# Create CORS configuration file
cat > cors.json << EOF
[
  {
    "origin": ["http://localhost:4173", "http://localhost:5173", "https://aoe2-match-history-site.storage.googleapis.com"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Set CORS configuration
gsutil cors set cors.json gs://aoe2-match-history-site

# Build the site
cd ui && npm run build && cd ..

# Deploy the built files to GCS bucket
gsutil -m cp -r ui/dist/* gs://aoe2-match-history-site/

# Ensure data files are in the correct location
gsutil -m cp -n -r data/matches/* gs://aoe2-match-history-site/data/matches/
gsutil -m cp -n -r site/matches/* gs://aoe2-match-history-site/site/matches/
gsutil -m cp data/100.json gs://aoe2-match-history-site/data/100.json

# Force upload assets and index.json with no-cache
gsutil -m cp -r ui/dist/assets/* gs://aoe2-match-history-site/assets/
gsutil -h "Cache-Control:no-cache, max-age=0" cp data/matches/index.json gs://aoe2-match-history-site/data/matches/index.json

# Upload civ map with long cache (rarely changes)
gsutil -h "Cache-Control:public, max-age=86400" cp data/100.json gs://aoe2-match-history-site/data/100.json

# Set public access
gsutil -m acl ch -r -u AllUsers:R gs://aoe2-match-history-site/

# Clean up
rm cors.json 