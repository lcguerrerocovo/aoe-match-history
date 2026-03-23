#!/bin/bash
# Setup a worktree for local development.
# Copies gitignored files (assets, .env) from the main repo and installs deps.
#
# Usage:
#   From the worktree directory:
#     bash scripts/setup-worktree.sh
#
#   Or specify the master repo path:
#     bash scripts/setup-worktree.sh /path/to/main/repo

set -euo pipefail

MASTER="${1:-/Users/luisg/Development/personal/aoe-match-history}"
WT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Setting up worktree: $WT"
echo "Copying from master: $MASTER"
echo ""

# Validate master exists
if [ ! -d "$MASTER" ]; then
  echo "Error: Master repo not found at $MASTER"
  echo "Usage: $0 [/path/to/main/repo]"
  exit 1
fi

# Copy gitignored dev files
echo "Copying proxy .env..."
cp "$MASTER/functions/proxy/.env" "$WT/functions/proxy/.env"

echo "Copying UI assets..."
cp -R "$MASTER/ui/src/assets/" "$WT/ui/src/assets/"

# Install dependencies
echo ""
echo "Installing UI dependencies..."
(cd "$WT/ui" && npm install --silent)

echo "Installing proxy dependencies..."
(cd "$WT/functions/proxy" && npm install --silent)

echo "Installing APM function dependencies..."
(cd "$WT/functions/apm" && pip install -q -r requirements.txt)

echo ""
echo "Done! To start the dev server:"
echo "  cd ui && npm run dev:all"
echo ""
echo "For full stack (match data), also start tunnels:"
echo "  bash scripts/tunnel-meilisearch.sh"
echo "  bash scripts/tunnel-postgres.sh"
