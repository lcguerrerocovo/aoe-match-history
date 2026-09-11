#!/usr/bin/env bash
# Cloudflare WAF custom rules for aoe2.site — blocks scanner noise at the edge
# before requests reach Cloud Run (GitHub issue #45).
#
# 30 days of origin logs (Aug 6 – Sep 5, 2026) showed 61% of all origin requests
# were vulnerability scanners probing for PHP/WordPress paths that don't exist
# here. Every one returned 404/302 — burning request quota and billable instance
# time. Blocking at the edge drops ~61% of origin requests for free.
#
# Uses the Rulesets API (phase http_custom_firewall): the classic firewall rules
# API is deprecated (error 10020). PUT replaces the phase's rules with this set,
# so re-running is idempotent.
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...   # Zone:Firewall Services:Edit (or Zone:WAF:Edit)
#   export CLOUDFLARE_ZONE_ID=...     # aoe2.site zone id (GH secret has it)
#   bash scripts/deploy-waf-rules.sh

set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ZONE_ID:?Set CLOUDFLARE_ZONE_ID}"

API="https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}"

PAYLOAD=$(jq -n '{
  rules: [
    {
      action: "block",
      description: "PHP probes",
      expression: "ends_with(http.request.uri.path, \".php\")"
    },
    {
      action: "block",
      description: "Env file probes",
      expression: "http.request.uri.path contains \".env\""
    },
    {
      action: "block",
      description: "WordPress path probes",
      expression: "http.request.uri.path contains \"/wp-admin\" or http.request.uri.path contains \"/wp-content\" or http.request.uri.path contains \"/wp-includes\" or http.request.uri.path contains \"/wp-json\""
    },
    {
      action: "block",
      description: "AI crawlers",
      expression: "http.user_agent contains \"GPTBot\" or http.user_agent contains \"Applebot-Extended\""
    }
  ]
}')

RESULT=$(curl -sS -X PUT \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API}/rulesets/phases/http_custom_firewall/entrypoint" \
  --data "$PAYLOAD")

if echo "$RESULT" | jq -e '.success' > /dev/null; then
  echo "Deployed WAF custom rules (phase http_custom_firewall):"
  echo "$RESULT" | jq -r '.result.rules[] | "  \(.description) — \(.action) [enabled=\(.enabled)]"'
  echo "Verify in dashboard: Security -> WAF -> Custom rules"
else
  echo "FAILED:"
  echo "$RESULT" | jq '.errors'
  exit 1
fi
