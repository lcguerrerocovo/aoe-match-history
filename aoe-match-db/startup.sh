#!/bin/bash
set -e
set -o pipefail

echo "--- PostgreSQL VM Startup Script ---"

# --- Configuration ---
DB_PASSWORD=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/db_password" -H "Metadata-Flavor: Google" || echo "changeme")
DB_NAME="aoe2_matches"
DB_USER="collector"

# --- 1. Install PostgreSQL 16 ---
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL 16..."
    apt-get update -qq
    apt-get install -y -qq gnupg2 lsb-release

    echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
    apt-get update -qq
    apt-get install -y -qq postgresql-16
    echo "PostgreSQL 16 installed"
else
    echo "PostgreSQL already installed"
fi

# --- 2. Configure PostgreSQL ---
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"

# Listen on all interfaces (Cloud Run connects via internal IP)
if ! grep -q "listen_addresses = '\*'" "$PG_CONF"; then
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
    echo "Configured listen_addresses = '*'"
fi

# Allow connections from GCP internal network (10.0.0.0/8)
if ! grep -q "10.0.0.0/8" "$PG_HBA"; then
    echo "host    $DB_NAME    $DB_USER    10.0.0.0/8    scram-sha-256" >> "$PG_HBA"
    echo "Added pg_hba rule for internal network"
fi

# Restart PostgreSQL to apply config
systemctl restart postgresql
echo "PostgreSQL restarted with updated config"

# --- 3. Create database and user ---
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Grant permissions
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;"
echo "Database '$DB_NAME' and user '$DB_USER' ready"

# --- 4. Install backup cron ---
BACKUP_SCRIPT="/opt/aoe-match-db/backup.sh"
mkdir -p /opt/aoe-match-db

cat > "$BACKUP_SCRIPT" << 'BACKUP_EOF'
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/pg_backups"
BUCKET="gs://aoe2-site-backups/pg"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Dump and compress
sudo -u postgres pg_dump aoe2_matches | gzip > "$BACKUP_DIR/aoe2_matches_${TIMESTAMP}.sql.gz"

# Upload to GCS
gsutil cp "$BACKUP_DIR/aoe2_matches_${TIMESTAMP}.sql.gz" "$BUCKET/"

# Clean up local file
rm -f "$BACKUP_DIR/aoe2_matches_${TIMESTAMP}.sql.gz"

# Delete backups older than retention period
CUTOFF=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d)
gsutil ls "$BUCKET/" | while read -r file; do
    FILE_DATE=$(echo "$file" | grep -oP '\d{8}(?=_)')
    if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF" ]; then
        gsutil rm "$file"
        echo "Deleted old backup: $file"
    fi
done

echo "Backup completed: aoe2_matches_${TIMESTAMP}.sql.gz"
BACKUP_EOF

chmod +x "$BACKUP_SCRIPT"

# Install cron job (daily at 04:00 UTC)
CRON_LINE="0 4 * * * $BACKUP_SCRIPT >> /var/log/pg_backup.log 2>&1"
EXISTING_CRON=$(crontab -l 2>/dev/null || true)
(echo "$EXISTING_CRON" | grep -v "$BACKUP_SCRIPT"; echo "$CRON_LINE") | crontab -
echo "Backup cron installed (daily 04:00 UTC)"

# --- 5. Install gsutil if not present ---
if ! command -v gsutil &> /dev/null; then
    echo "Installing Google Cloud SDK for gsutil..."
    apt-get install -y -qq apt-transport-https ca-certificates
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    apt-get update -qq
    apt-get install -y -qq google-cloud-cli
    echo "Google Cloud SDK installed"
fi

echo "--- Startup Script Finished ---"
