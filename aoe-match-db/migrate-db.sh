#!/bin/bash
# Run database migrations against PostgreSQL via SSH tunnel.
# Usage: MATCH_DB_PASSWORD=... bash migrate-db.sh [up|down]
set -e

DIRECTION="${1:-up}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COLLECTOR_DIR="$SCRIPT_DIR/../jobs/collector"
TUNNEL_SCRIPT="$SCRIPT_DIR/../scripts/tunnel-postgres.sh"

if [ -z "$MATCH_DB_PASSWORD" ]; then
    echo "Error: MATCH_DB_PASSWORD environment variable is required"
    exit 1
fi

# Start tunnel if port 5432 isn't already forwarded
if ! lsof -i :5432 > /dev/null 2>&1; then
    echo "Starting SSH tunnel to PostgreSQL VM..."
    bash "$TUNNEL_SCRIPT"
    STARTED_TUNNEL=true
    sleep 2
else
    echo "Using existing tunnel on port 5432"
    STARTED_TUNNEL=false
fi

export DATABASE_URL="postgresql://collector:${MATCH_DB_PASSWORD}@localhost:5432/aoe2_matches"

echo "Running migrations ($DIRECTION)..."
cd "$COLLECTOR_DIR"
npx node-pg-migrate "$DIRECTION" --database-url-var DATABASE_URL --migrations-dir migrations
echo "Migrations complete"

if [ "$STARTED_TUNNEL" = true ]; then
    echo "Stopping SSH tunnel..."
    lsof -ti :5432 | xargs kill -9 2>/dev/null || true
fi
