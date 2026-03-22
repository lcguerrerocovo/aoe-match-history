#!/bin/bash
# Standalone backup script — also embedded in startup.sh for cron installation.
# This copy exists for manual runs: bash backup.sh
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
