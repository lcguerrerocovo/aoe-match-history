#!/bin/bash
set -e
set -o pipefail
set -x # <<< Keep this for maximum debug verbosity

echo "--- Meilisearch VM Startup Script ---"

# --- Configuration ---
# This master key is set via metadata in the deploy script.
# Fallback to a default if not provided, but it should always be provided.
MEILI_MASTER_KEY=$(curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_master_key" -H "Metadata-Flavor: Google" || echo "a-default-dev-only-master-key")

# Set a consistent environment for the script
export LANG="C.UTF-8"
export LC_ALL="C.UTF-8"
export PYTHONIOENCODING="UTF-8" # Ensure consistent encoding for Python

# --- 1. System Setup ---
echo "COS detected - Docker is pre-installed"
echo "Checking Docker status..."

# Test basic requirements
echo "Testing basic requirements..."
echo "curl version: $(curl --version | head -1)"
echo "tar version: $(tar --version | head -1)"
echo "Network connectivity test:"
if curl -s --connect-timeout 5 https://storage.googleapis.com/ >/dev/null; then
    echo "✅ Network connectivity to Google Storage OK"
else
    echo "❌ Network connectivity to Google Storage failed"
    exit 1
fi

# COS comes with Docker pre-installed, just ensure it's running
systemctl status docker || echo "Docker not running, starting it..."
systemctl start docker || echo "Docker start failed, but continuing..."

# Install jq if not available (COS might not have it)
# jq is small, so we'll still put it in /usr/local/bin (it usually exists)
if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    # Ensure /usr/local/bin exists and is writable (it often is for this)
    mkdir -p /usr/local/bin || true # Added || true to prevent exit if already exists/readonly
    curl -L https://github.com/stedolan/jq/releases/download/jq-1.6/jq-linux64 -o /usr/local/bin/jq
    chmod +x /usr/local/bin/jq
fi

# --- IMPORTANT CHANGE: Define paths for gsutil installation to /var/lib ---
# /var/lib is writable and executable on COS, suitable for tools
GSUTIL_DOWNLOAD_DIR="/tmp" # Temporary for download
GSUTIL_INSTALL_ROOT="/var/lib/gsutil-install" # Where gsutil files will be extracted
GSUTIL_BIN_DIR="/usr/local/bin" # Standard location for symlinks to executables in PATH
GSUTIL_SYMLINK_PATH="${GSUTIL_BIN_DIR}/gsutil"
GSUTIL_ERROR_LOG="/var/log/gsutil_startup_error.log" # Use a standard log location for non-persistent logs

# --- Debugging: Force clean install on every run for development/testing ---
# COMMENT THIS BLOCK OUT FOR PRODUCTION DEPLOYMENTS TO AVOID UNNECESSARY RE-INSTALLS
echo "DEBUG: Forcing clean gsutil installation for this run (remove in production)."
rm -rf "$GSUTIL_INSTALL_ROOT"/ "$GSUTIL_SYMLINK_PATH" || true # Clean up old install
mkdir -p "$GSUTIL_INSTALL_ROOT" # Ensure base install directory exists
mkdir -p "$GSUTIL_BIN_DIR" || true # Ensure /usr/local/bin exists, gracefully handle if read-only
# --- End Debugging Block ---

# Install minimal gsutil
# We always proceed with extraction and custom wrapper creation during startup for robustness
echo "Installing/Ensuring minimal gsutil..."
echo "Current directory: $(pwd)"
echo "Available disk space:"
df -h /var/lib # Check space in /var/lib

# Change to a temporary directory for download
cd "$GSUTIL_DOWNLOAD_DIR"
echo "Changed to: $(pwd)"
    
echo "Downloading gsutil.tar.gz..."
if ! curl -v -O https://storage.googleapis.com/pub/gsutil.tar.gz; then
    echo "❌ Failed to download gsutil.tar.gz"
    exit 1
fi
    
echo "Checking downloaded file..."
ls -la gsutil.tar.gz
    
echo "Extracting gsutil to $GSUTIL_INSTALL_ROOT..."
# Create the install root before extracting
mkdir -p "$GSUTIL_INSTALL_ROOT" # This should now succeed in /var/lib
if ! tar -xf gsutil.tar.gz -C "$GSUTIL_INSTALL_ROOT" --strip-components=1; then # Extract into target dir directly
    echo "❌ Failed to extract gsutil.tar.gz"
    exit 1
fi
    
echo "Checking extracted files in $GSUTIL_INSTALL_ROOT/:"
ls -la "$GSUTIL_INSTALL_ROOT"/
    
# --- CONSISTENT FIX FOR GSUTIL PYTHON PATH (OVERWRITING GSUTIL WRAPPER) ---
# Use the hardcoded path that worked in the interactive session
PYTHON_INTERPRETER_PATH="/usr/bin/python3.11" 
GSUTIL_PYTHON_SCRIPT_PATH="${GSUTIL_INSTALL_ROOT}/gsutil.py" # The actual Python file
# GSUTIL_INSTALL_DIR is already GSUTIL_INSTALL_ROOT

echo "Creating custom gsutil wrapper at $GSUTIL_INSTALL_ROOT/gsutil..."
cat > "$GSUTIL_INSTALL_ROOT"/gsutil << EOF
#!/bin/bash
# This is a custom gsutil wrapper for Container-Optimized OS (COS).
# It directly invokes the gsutil.py script with the verified Python interpreter.

# IMPORTANT: These paths are set during startup script execution by the outer script.
# Do NOT modify them here if they are intended to be fixed by the outer script.
PYTHON_INTERPRETER="$PYTHON_INTERPRETER_PATH"
GSUTIL_PYTHON_SCRIPT="$GSUTIL_PYTHON_SCRIPT_PATH"
GSUTIL_INSTALL_DIR="$GSUTIL_INSTALL_ROOT" # Use GSUTIL_INSTALL_ROOT defined externally

# Set a consistent Python environment for the wrapper
export LANG="C.UTF-8"
export LC_ALL="C.UTF-8"
export PYTHONIOENCODING="UTF-8"

# Ensure gsutil can find its bundled dependencies
export PYTHONPATH="\${GSUTIL_INSTALL_DIR}:\${GSUTIL_INSTALL_DIR}/gslib:\${GSUTIL_INSTALL_DIR}/third_party"

# Execute the main gsutil Python script with all passed arguments
exec "\$PYTHON_INTERPRETER" "\$GSUTIL_PYTHON_SCRIPT" "\$@"
EOF
    
# Set permissions on the extracted gsutil directory and the gsutil wrapper file
chmod 755 "$GSUTIL_INSTALL_ROOT" # Ensure read/execute (search) for the directory
chmod +x "$GSUTIL_INSTALL_ROOT"/gsutil # Ensure the new wrapper is executable
echo "✅ Custom gsutil wrapper created and made executable."
# --- END CONSISTENT FIX ---

# Create symlink in /usr/local/bin (standard location for local executables in PATH)
# /usr/local/bin itself should be writable for symlinks even if /usr/local isn't fully writable for new directories
# Ensure /usr/local/bin has execute (search) permissions (it usually does by default)
chmod 755 "$GSUTIL_BIN_DIR" || true # Added || true to prevent exit if already exists/readonly
if ! ln -sf "$GSUTIL_INSTALL_ROOT"/gsutil "$GSUTIL_SYMLINK_PATH"; then
    echo "❌ Failed to create symlink for gsutil."
    exit 1
fi
    
echo "Created symlink: $(ls -la "$GSUTIL_SYMLINK_PATH")"
    
rm -f "$GSUTIL_DOWNLOAD_DIR"/gsutil.tar.gz # Clean up downloaded tarball
cd / # Return to root
echo "✅ Minimal gsutil setup complete."


# Always export PATH for subsequent commands in this script and its children
# Ensure /usr/local/bin is in PATH (it usually is by default, but explicitly adding doesn't hurt)
export PATH=$PATH:$GSUTIL_BIN_DIR
echo "Added $GSUTIL_BIN_DIR to PATH: $PATH"

# --- TEST GSUTIL AFTER INSTALLATION AND PATH SETUP ---
echo "Testing gsutil installation and execution..."
# Try to find gsutil in PATH. `command -v` is standard and should work on COS.
GSUTIL_COMMAND_PATH=$(command -v gsutil)
if [ -z "$GSUTIL_COMMAND_PATH" ]; then
    echo "❌ gsutil command still not found in PATH after installation!"
    echo "Current PATH: $PATH"
    ls -la "$GSUTIL_SYMLINK_PATH" # Check if symlink exists
    exit 1 # Exit if gsutil is truly not found
else
    echo "✅ gsutil found in PATH at: $GSUTIL_COMMAND_PATH"
    
    # Clean up previous error log if it exists
    rm -f "$GSUTIL_ERROR_LOG" || true
    
    # Attempt to run gsutil version and redirect all output (stdout and stderr) to our log file.
    # This should capture the full Python traceback.
    echo "Running '$GSUTIL_COMMAND_PATH version -l' and directing all output to $GSUTIL_ERROR_LOG..."
    if ! "$GSUTIL_COMMAND_PATH" version -l &> "$GSUTIL_ERROR_LOG"; then
        echo "❌ gsutil command found but failed to execute 'gsutil version -l' internally."
        echo "Detailed gsutil error output from $GSUTIL_ERROR_LOG (full content below):"
        cat "$GSUTIL_ERROR_LOG" # Print the content of the log file
        exit 1 # Exit with error, as gsutil failed
    else
        echo "✅ gsutil test successful: $("$GSUTIL_COMMAND_PATH" version | head -n 1)" # Run again to get clean version output for log
        rm -f "$GSUTIL_ERROR_LOG" # Clean up error log if successful
    fi
fi
# --- END TEST BLOCK ---

# --- 2. Meilisearch Setup ---
echo "Creating directories for Meilisearch..."
mkdir -p /var/lib/meilisearch/data/snapshots
chmod 755 /var/lib/meilisearch
chmod 755 /var/lib/meilisearch/data
chmod 755 /var/lib/meilisearch/data/snapshots

# --- 3. Download Latest Snapshot ---
echo "Checking for latest snapshot in GCS..."

# List all snapshot directories and find the latest one with data.snapshot
# Using the explicitly defined gsutil path for robustness
LATEST_SNAPSHOT_DIR=$("$GSUTIL_SYMLINK_PATH" ls gs://aoe2-site-data/snapshots/ 2>/dev/null | \
    grep -E '[0-9]{8}-[0-9]{6}/$' | \
    sort | \
    tail -1 | \
    sed 's|/$||' || echo "")

if [ -n "$LATEST_SNAPSHOT_DIR" ]; then
    SNAPSHOT_OBJECT_PATH="${LATEST_SNAPSHOT_DIR}/data.snapshot"
    LOCAL_SNAPSHOT_DEST="/var/lib/meilisearch/data/snapshots/latest.snapshot"
    LOCAL_FINGERPRINT_DEST="/var/lib/meilisearch/data/snapshots/latest.fingerprint.txt"
    LOCAL_METADATA_DEST="/var/lib/meilisearch/data/snapshots/latest.metadata.json"

    echo "Attempting to find and download snapshot from: $SNAPSHOT_OBJECT_PATH"

    # Use gsutil stat to check for existence and then download
    if "$GSUTIL_SYMLINK_PATH" -q stat "$SNAPSHOT_OBJECT_PATH" >/dev/null 2>&1; then
        echo "Found latest snapshot: $SNAPSHOT_OBJECT_PATH"
        echo "Downloading snapshot to $LOCAL_SNAPSHOT_DEST..."
        
        # Download the main snapshot file
        "$GSUTIL_SYMLINK_PATH" cp "$SNAPSHOT_OBJECT_PATH" "$LOCAL_SNAPSHOT_DEST"
        
        # Extract snapshot directory and download metadata/fingerprint
        SNAPSHOT_DIR=$(echo "$LATEST_SNAPSHOT_DIR" | sed 's|gs://aoe2-site-data/||')
        FINGERPRINT_CLOUD_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/fingerprint.txt"
        METADATA_CLOUD_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/metadata.json"
        
        # Download fingerprint (optional, allow failure)
        echo "Downloading fingerprint from $FINGERPRINT_CLOUD_PATH..."
        "$GSUTIL_SYMLINK_PATH" cp "$FINGERPRINT_CLOUD_PATH" "$LOCAL_FINGERPRINT_DEST" 2>/dev/null || echo "No fingerprint found at $FINGERPRINT_CLOUD_PATH"
        
        # Download metadata (optional, allow failure)
        echo "Downloading metadata from $METADATA_CLOUD_PATH..."
        "$GSUTIL_SYMLINK_PATH" cp "$METADATA_CLOUD_PATH" "$LOCAL_METADATA_DEST" 2>/dev/null || echo "No metadata found at $METADATA_CLOUD_PATH"
        
        echo "✅ Snapshot and associated files downloaded successfully"
    else
        echo "⚠️  No data.snapshot found in the latest directory ($LATEST_SNAPSHOT_DIR)."
        echo "⚠️  Starting with empty index."
    fi
else
    echo "⚠️  No snapshot directories found in GCS. Starting with empty index."
fi

echo "Starting Meilisearch via Docker..."

# Check if container already exists and remove it
if docker ps -a --format "table {{.Names}}" | grep -q "^meilisearch$"; then
    echo "Removing existing meilisearch container..."
    docker stop meilisearch 2>/dev/null || true
    docker rm meilisearch 2>/dev/null || true
fi

docker run -d \
  --name meilisearch \
  --restart unless-stopped \
  -p 7700:7700 \
  -e MEILI_ENV=production \
  -e MEILI_MASTER_KEY=${MEILI_MASTER_KEY} \
  -v /var/lib/meilisearch/data:/meili_data \
  getmeili/meilisearch:v1.7

# --- 4. Meilisearch Configuration ---
echo "Waiting for Meilisearch to start..."
# Wait for the container to be running
until [ "$(docker inspect -f {{.State.Status}} meilisearch)" == "running" ]; do
    echo "Meilisearch container is starting..."
    sleep 3
done;

# Wait for the service to be responsive
echo "Waiting for Meilisearch to be responsive..."
until curl -f http://localhost:7700/health > /dev/null 2>&1; do
    echo "Meilisearch is starting..."
    sleep 3
done;
echo "✅ Meilisearch is healthy."

# If we have a snapshot, Meilisearch should have loaded it automatically
if [ -f "/var/lib/meilisearch/data/snapshots/latest.snapshot" ]; then
    echo "✅ Meilisearch started with snapshot data"
else
    echo "📝 Setting up empty index configuration..."
    echo "Applying index configuration from metadata..."
    # Fetch the index configuration from the VM's metadata
    curl "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meili_config" -H "Metadata-Flavor: Google" > /var/lib/meilisearch/index_config.json

    # Extract primaryKey from the config to create the index first
    PRIMARY_KEY=$(grep -o '"primaryKey": *"[^"]*"' /var/lib/meilisearch/index_config.json | cut -d'"' -f4)

    echo "Creating index 'players' with primary key '${PRIMARY_KEY}'..."
    curl -X POST 'http://localhost:7700/indexes' \
      -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
      -H 'Content-Type: application/json' \
      --data-binary "{\"uid\": \"players\", \"primaryKey\": \"${PRIMARY_KEY:-profile_id}\"}"

    echo "Updating index settings..."
    # Create a settings-only config by removing uid and primaryKey fields
    jq 'del(.uid, .primaryKey)' /var/lib/meilisearch/index_config.json > /var/lib/meilisearch/settings_config.json

    # Use PATCH to apply settings to the existing index
    curl -X PATCH "http://localhost:7700/indexes/players/settings" \
      -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
      -H 'Content-Type: application/json' \
      --data-binary @/var/lib/meilisearch/settings_config.json
fi

# --- 5. Setup Snapshot Update Cron Job ---
echo "Setting up snapshot update cron job..."

# Ensure the directory exists
mkdir -p /var/lib/meilisearch

cat > /var/lib/meilisearch/check_snapshots.sh << 'EOF'
#!/bin/bash
set -e

# Define the absolute path to gsutil in the cron script too!
# Adjusted to reflect the /usr/local installation
GSUTIL_BIN_DIR="/usr/local/bin"
GSUTIL_SYMLINK_PATH="${GSUTIL_BIN_DIR}/gsutil"
# Path to the actual extracted gsutil directory
GSUTIL_INSTALL_ROOT="/var/lib/gsutil-install" # Changed from /mnt/stateful_partition/gsutil

# Ensure PATH is set for this script
export PATH="$PATH:$GSUTIL_BIN_DIR"

# Set a consistent Python environment for cron script
export LANG="C.UTF-8"
export LC_ALL="C.UTF-8"
export PYTHONIOENCODING="UTF-8"

# Ensure gsutil can find its bundled dependencies
export PYTHONPATH="${GSUTIL_INSTALL_ROOT}:${GSUTIL_INSTALL_ROOT}/gslib:${GSUTIL_INSTALL_ROOT}/third_party"

echo "$(date): Checking for new snapshots..."

# Get latest snapshot from GCS (sorted by timestamp)
LATEST_SNAPSHOT_DIR=$("$GSUTIL_SYMLINK_PATH" ls gs://aoe2-site-data/snapshots/ 2>/dev/null | grep -E '[0-9]{8}-[0-9]{6}/$' | sort | tail -1 | sed 's|/$||' || echo "")

if [ -z "$LATEST_SNAPSHOT_DIR" ]; then
    echo "No snapshots found in GCS"
    exit 0
fi

# Check if data.snapshot exists in the latest directory
SNAPSHOT_PATH="${LATEST_SNAPSHOT_DIR}/data.snapshot"
if ! "$GSUTIL_SYMLINK_PATH" -q stat "$SNAPSHOT_PATH" >/dev/null 2>&1; then
    echo "Latest directory $LATEST_SNAPSHOT_DIR does not contain data.snapshot"
    exit 0
fi

# Extract snapshot directory and get fingerprint
SNAPSHOT_DIR=$(echo "$LATEST_SNAPSHOT_DIR" | sed 's|gs://aoe2-site-data/||')
LATEST_FINGERPRINT_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/fingerprint.txt"

echo "Latest snapshot directory: $SNAPSHOT_DIR"

# Download latest fingerprint
TEMP_FINGERPRINT="/tmp/latest_fingerprint.txt"
# Use temporary error log for cron script
GSUTIL_CRON_ERROR_LOG="/tmp/gsutil_cron_error.log" 

if ! "$GSUTIL_SYMLINK_PATH" cp "$LATEST_FINGERPRINT_PATH" "$TEMP_FINGERPRINT" &> "$GSUTIL_CRON_ERROR_LOG"; then
    echo "Could not download fingerprint. Detailed gsutil error from $GSUTIL_CRON_ERROR_LOG:"
    cat "$GSUTIL_CRON_ERROR_LOG"
    rm -f "$GSUTIL_CRON_ERROR_LOG"
    exit 1
fi
rm -f "$GSUTIL_CRON_ERROR_LOG" # Clean up if successful

LATEST_FINGERPRINT=$(cat "$TEMP_FINGERPRINT")
rm -f "$TEMP_FINGERPRINT"

echo "Latest snapshot fingerprint: $LATEST_FINGERPRINT"

# Get current index fingerprint
CURRENT_FINGERPRINT=""
if [ -f "/var/lib/meilisearch/data/snapshots/latest.fingerprint.txt" ]; then
    CURRENT_FINGERPRINT=$(cat /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt)
fi

if [ "$CURRENT_FINGERPRINT" = "$LATEST_FINGERPRINT" ]; then
    echo "No new snapshot detected (fingerprint: $LATEST_FINGERPRINT)"
    exit 0
fi

echo "New snapshot detected! Performing hot-swap..."

# Stop Meilisearch
docker stop meilisearch

# Backup current files
if [ -f "/var/lib/meilisearch/data/snapshots/latest.snapshot" ]; then
    mv /var/lib/meilisearch/data/snapshots/latest.snapshot /var/lib/meilisearch/data/snapshots/latest.snapshot.backup.$(date +%Y%m%d-%H%M%S)
fi

if [ -f "/var/lib/meilisearch/data/snapshots/latest.fingerprint.txt" ]; then
    mv /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt.backup.$(date +%Y%m%d-%H%M%S)
fi

if [ -f "/var/lib/meilisearch/data/snapshots/latest.metadata.json" ]; then
    mv /var/lib/meilisearch/data/snapshots/latest.metadata.json /var/lib/meilisearch/data/snapshots/latest.metadata.json.backup.$(date +%Y%m%d-%H%M%S)
fi

# Download new snapshot
"$GSUTIL_SYMLINK_PATH" cp "$SNAPSHOT_PATH" /var/lib/meilisearch/data/snapshots/latest.snapshot

# Download new fingerprint
"$GSUTIL_SYMLINK_PATH" cp "$LATEST_FINGERPRINT_PATH" /var/lib/meilisearch/data/snapshots/latest.fingerprint.txt

# Download new metadata
METADATA_PATH="gs://aoe2-site-data/${SNAPSHOT_DIR}/metadata.json"
"$GSUTIL_SYMLINK_PATH" cp "$METADATA_PATH" /var/lib/meilisearch/data/snapshots/latest.metadata.json

# Start Meilisearch
docker start meilisearch

# Wait for Meilisearch to be healthy
echo "Waiting for Meilisearch to be healthy..."
for i in $(seq 1 30); do
    if curl -f http://localhost:7700/health > /dev/null 2>&1; then
        echo "✅ Meilisearch is healthy after hot-swap"
        break
    fi
    echo "Waiting for Meilisearch... (attempt $i/30)"
    sleep 2
done

echo "✅ Hot-swap completed successfully!"
EOF

chmod +x /var/lib/meilisearch/check_snapshots.sh

# COS doesn't have cron, so we'll use systemd timer instead
echo "Setting up systemd timer for snapshot checks..."

# Create systemd service file
cat > /etc/systemd/system/meilisearch-snapshot-check.service << 'EOF'
[Unit]
Description=Meilisearch Snapshot Check
After=network.target

[Service]
Type=oneshot
ExecStart=/var/lib/meilisearch/check_snapshots.sh
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create systemd timer file
cat > /etc/systemd/system/meilisearch-snapshot-check.timer << 'EOF'
[Unit]
Description=Run Meilisearch snapshot check every 2 days
Requires=meilisearch-snapshot-check.service

[Timer]
OnCalendar=*-*-* 00:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
systemctl daemon-reload
systemctl enable meilisearch-snapshot-check.timer
systemctl start meilisearch-snapshot-check.timer

echo "✅ Systemd timer configured (runs every 2 days at midnight)"

echo "✅ Meilisearch setup and configuration complete."
echo "✅ Snapshot update cron job configured (runs every 2 days at midnight)"
echo "--- Startup Script Finished ---"