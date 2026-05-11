#!/usr/bin/env bash
set -euo pipefail

# Resize the PostgreSQL VM boot disk and grow the root filesystem online.
#
# Usage:
#   bash aoe-match-db/resize-disk.sh 60
#
# Optional env:
#   GCP_PROJECT_ID=aoe2-site
#   GCP_ZONE=us-central1-a
#   MATCH_DB_VM_NAME=aoe-match-db
#   SKIP_SNAPSHOT=1        Skip the pre-resize snapshot
#   DRY_RUN=1              Print commands without executing changes

PROJECT_ID="${GCP_PROJECT_ID:-aoe2-site}"
ZONE="${GCP_ZONE:-us-central1-a}"
VM_NAME="${MATCH_DB_VM_NAME:-aoe-match-db}"
TARGET_SIZE_GB="${1:-}"
SKIP_SNAPSHOT="${SKIP_SNAPSHOT:-0}"
DRY_RUN="${DRY_RUN:-0}"

if [[ -z "$TARGET_SIZE_GB" || ! "$TARGET_SIZE_GB" =~ ^[0-9]+$ || "$TARGET_SIZE_GB" == "0" ]]; then
  echo "Usage: bash aoe-match-db/resize-disk.sh <target-size-gb>" >&2
  exit 1
fi

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf 'DRY_RUN:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

echo "Inspecting PostgreSQL VM disk..."
echo "  project: $PROJECT_ID"
echo "  zone:    $ZONE"
echo "  vm:      $VM_NAME"

BOOT_DISK_URL="$(gcloud compute instances describe "$VM_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --format='value(disks[0].source)')"
BOOT_DISK_NAME="${BOOT_DISK_URL##*/}"

if [[ -z "$BOOT_DISK_NAME" ]]; then
  echo "Could not determine boot disk for $VM_NAME" >&2
  exit 1
fi

read -r CURRENT_SIZE_GB DISK_TYPE_URL < <(gcloud compute disks describe "$BOOT_DISK_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --format='value(sizeGb,type)')
DISK_TYPE="${DISK_TYPE_URL##*/}"

if (( TARGET_SIZE_GB <= CURRENT_SIZE_GB )); then
  echo "Disk is already ${CURRENT_SIZE_GB}GB; target ${TARGET_SIZE_GB}GB is not larger."
  exit 0
fi

echo "Disk resize plan:"
echo "  disk:    $BOOT_DISK_NAME"
echo "  type:    $DISK_TYPE"
echo "  current: ${CURRENT_SIZE_GB}GB"
echo "  target:  ${TARGET_SIZE_GB}GB"

if [[ "$DISK_TYPE" == "pd-ssd" ]]; then
  awk -v current="$CURRENT_SIZE_GB" -v target="$TARGET_SIZE_GB" 'BEGIN {
    rate = 0.17;
    printf "  est monthly disk cost: $%.2f -> $%.2f (+$%.2f)\n", current * rate, target * rate, (target - current) * rate;
  }'
elif [[ "$DISK_TYPE" == "pd-balanced" ]]; then
  awk -v current="$CURRENT_SIZE_GB" -v target="$TARGET_SIZE_GB" 'BEGIN {
    rate = 0.10;
    printf "  est monthly disk cost: $%.2f -> $%.2f (+$%.2f)\n", current * rate, target * rate, (target - current) * rate;
  }'
fi

if [[ "$SKIP_SNAPSHOT" != "1" ]]; then
  SNAPSHOT_NAME="${BOOT_DISK_NAME}-before-resize-$(date +%Y%m%d-%H%M%S)"
  echo "Creating snapshot: $SNAPSHOT_NAME"
  run gcloud compute disks snapshot "$BOOT_DISK_NAME" \
    --project="$PROJECT_ID" \
    --zone="$ZONE" \
    --snapshot-names="$SNAPSHOT_NAME"
else
  echo "Skipping snapshot because SKIP_SNAPSHOT=1"
fi

echo "Resizing disk to ${TARGET_SIZE_GB}GB..."
run gcloud compute disks resize "$BOOT_DISK_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --size="${TARGET_SIZE_GB}GB" \
  --quiet

echo "Growing root partition and filesystem on $VM_NAME..."
run gcloud compute ssh "$VM_NAME" \
  --project="$PROJECT_ID" \
  --zone="$ZONE" \
  --command='set -euo pipefail
root_source="$(findmnt -n -o SOURCE /)"
root_parent="/dev/$(lsblk -no PKNAME "$root_source")"
root_part="$(lsblk -no PARTN "$root_source")"

if [[ -z "$root_parent" || -z "$root_part" ]]; then
  echo "Could not determine root disk/partition from $root_source" >&2
  exit 1
fi

echo "Before resize:"
df -h /
lsblk "$root_parent"

sudo growpart "$root_parent" "$root_part"

fs_type="$(findmnt -n -o FSTYPE /)"
if [[ "$fs_type" == "ext4" ]]; then
  sudo resize2fs "$root_source"
elif [[ "$fs_type" == "xfs" ]]; then
  sudo xfs_growfs /
else
  echo "Unsupported root filesystem type: $fs_type" >&2
  exit 1
fi

echo "After resize:"
df -h /
lsblk "$root_parent"'

echo "Resize complete."
