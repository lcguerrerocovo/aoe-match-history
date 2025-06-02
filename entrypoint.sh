#!/bin/sh
set -e

echo "[entrypoint] Starting entrypoint script..."

echo "[entrypoint] Running aoe2_poller.py..."
python aoe2_poller.py || echo "[warning] aoe2_poller.py failed but continuing..."

echo "[entrypoint] Running generate_apm_site.py..."
python generate_apm_site.py || echo "[warning] generate_apm_site.py failed but continuing..."

echo "[entrypoint] Running deploy_site.sh..."
sh /app/deploy_site.sh || echo "[warning] deploy_site.sh failed but continuing..."

echo "[entrypoint] Entrypoint script completed."

exec "$@"