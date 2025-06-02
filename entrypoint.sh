#!/bin/sh
set -e

echo "Starting entrypoint script..."

echo "Running aoe2_poller.py..."
python aoe2_poller.py || echo "Warning: aoe2_poller.py failed but continuing..."

echo "Running generate_apm_site.py..."
python generate_apm_site.py || echo "Warning: generate_apm_site.py failed but continuing..."

echo "Running deploy_site.sh..."
sh /app/deploy_site.sh || echo "Warning: deploy_site.sh failed but continuing..."

echo "Entrypoint script completed."

# The site directory now contains both the React app and the match data
# It will be uploaded to GCS by the Python script 