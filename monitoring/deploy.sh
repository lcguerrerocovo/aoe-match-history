#!/bin/bash
set -e

PROJECT_ID="${GCP_PROJECT_ID:-aoe2-site}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NOTIFY_EMAIL="${ALERT_EMAIL:-lcguerrerocovo@gmail.com}"

echo "Deploying monitoring config to $PROJECT_ID"

# --- 1. Ensure notification channel exists ---
CHANNEL_ID=$(gcloud alpha monitoring channels list \
  --project="$PROJECT_ID" \
  --filter="labels.email_address='$NOTIFY_EMAIL'" \
  --format="value(name)" 2>/dev/null | head -1)

if [ -z "$CHANNEL_ID" ]; then
    echo "Creating notification channel for $NOTIFY_EMAIL..."
    CHANNEL_ID=$(gcloud alpha monitoring channels create \
      --display-name="Alert Email" \
      --type=email \
      --channel-labels="email_address=$NOTIFY_EMAIL" \
      --project="$PROJECT_ID" \
      --format="value(name)" 2>&1)
fi
echo "Notification channel: $CHANNEL_ID"

# --- 2. Sync alert policies ---
echo "Syncing alert policies..."
for policy_file in "$SCRIPT_DIR"/policies/*.json; do
    [ -f "$policy_file" ] || continue
    name=$(basename "$policy_file" .json)
    display=$(python3 -c "import json; print(json.load(open('$policy_file'))['displayName'])")

    # Check if policy already exists
    existing=$(gcloud alpha monitoring policies list \
      --project="$PROJECT_ID" \
      --filter="displayName='$display'" \
      --format="value(name)" 2>/dev/null | head -1)

    if [ -n "$existing" ]; then
        gcloud alpha monitoring policies update "$existing" \
          --policy-from-file="$policy_file" \
          --notification-channels="$CHANNEL_ID" \
          --project="$PROJECT_ID" \
          --quiet 2>/dev/null
        echo "  Updated: $display"
    else
        gcloud alpha monitoring policies create \
          --policy-from-file="$policy_file" \
          --notification-channels="$CHANNEL_ID" \
          --project="$PROJECT_ID" \
          --quiet 2>/dev/null
        echo "  Created: $display"
    fi
done

# --- 3. Sync uptime checks ---
echo "Syncing uptime checks..."
ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null)
API="https://monitoring.googleapis.com/v3/projects/$PROJECT_ID/uptimeCheckConfigs"

existing_checks=$(curl -s "$API" -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data.get('uptimeCheckConfigs', []):
    print(c['displayName'])
" 2>/dev/null)

for check_file in "$SCRIPT_DIR"/uptime-checks/*.json; do
    [ -f "$check_file" ] || continue
    display=$(python3 -c "import json; print(json.load(open('$check_file'))['displayName'])")

    if echo "$existing_checks" | grep -qF "$display"; then
        echo "  Exists: $display"
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "Content-Type: application/json" \
          -d @"$check_file")
        if [ "$status" = "200" ]; then
            echo "  Created: $display"
        else
            echo "  FAILED ($status): $display"
            exit 1
        fi
    fi
done

echo "Monitoring config deployed successfully"
