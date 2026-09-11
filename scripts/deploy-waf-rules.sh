#!/usr/bin/env bash
# Cloudflare WAF custom rules for aoe2.site — blocks scanner noise at the edge
# before requests reach Cloud Run (GitHub issue #45).
#
# 30 days of origin logs (Aug 6 – Sep 5, 2026) showed 61% of all origin requests
# were vulnerability scanners probing for PHP/WordPress paths that don't exist
# here. Every one returned 404/302 — burning request quota and billable instance
# time. Blocking at the edge drops ~61% of origin requests for free.
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...   # needs Zone:Firewall Services:Edit (or Zone:Edit)
#   export CLOUDFLARE_ZONE_ID=...     # same name as the GH Actions secret
#   bash scripts/deploy-waf-rules.sh
#
# Idempotent: skips rules whose description already exists. Free plan allows 5
# classic firewall rules; this uses 4, leaving one spare.

set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ZONE_ID:?Set CLOUDFLARE_ZONE_ID}"

API="https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}"

api() {
  curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
       -H "Content-Type: application/json" "$@"
}

RULES=(
  'PHP probes|ends_with(http.request.uri.path, ".php")'
  'Env file probes|http.request.uri.path contains ".env"'
  'WordPress path probes|http.request.uri.path contains "/wp-admin" or http.request.uri.path contains "/wp-content" or http.request.uri.path contains "/wp-includes" or http.request.uri.path contains "/wp-json"'
  'AI crawlers|http.user_agent contains "GPTBot" or http.user_agent contains "Applebot-Extended"'
)

echo "Fetching existing firewall rules..."
EXISTING=$(api "${API}/firewall/rules?per_page=100")
echo "${EXISTING}" | jq -e '.success' > /dev/null || { echo "API error: ${EXISTING}"; exit 1; }

for entry in "${RULES[@]}"; do
  DESC="${entry%%|*}"
  EXPR="${entry#*|}"

  if echo "${EXISTING}" | jq -e --arg d "${DESC}" '.result[] | select(.description == $d)' > /dev/null; then
    echo "skip: \"${DESC}\" already exists"
    continue
  fi

  RESULT=$(api -X POST "${API}/firewall/rules" \
    --data "$(jq -n --arg d "${DESC}" --arg e "${EXPR}" \
      '[{action: "block", description: $d, filter: {expression: $e}}]')")

  if echo "${RESULT}" | jq -e '.success' > /dev/null; then
    echo "created: \"${DESC}\" -> ${EXPR}"
  else
    echo "FAILED: \"${DESC}\""
    echo "${RESULT}" | jq '.errors'
    exit 1
  fi
done

echo "Done. Verify in dashboard: Security -> WAF -> Custom rules"
