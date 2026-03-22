#!/usr/bin/env bash
# Quick Relic API endpoint tests. All unauthenticated community endpoints.
#
# Usage:
#   bash scripts/relic-api-test.sh leaderboard          # RM 1v1 leaderboard (5 entries)
#   bash scripts/relic-api-test.sh leaderboard 4        # RM Team leaderboard
#   bash scripts/relic-api-test.sh leaderboard 3 50     # RM 1v1, 50 entries
#   bash scripts/relic-api-test.sh matches 196240       # Match history for profile
#   bash scripts/relic-api-test.sh stats 196240         # Personal stats for profile
#   bash scripts/relic-api-test.sh all                  # Hit all endpoints

set -euo pipefail

API="https://aoe-api.worldsedgelink.com"
HEADERS=(-H "Accept: application/json" -H "User-Agent: aoe2-site")

leaderboard() {
  local lb_id="${1:-3}"
  local count="${2:-5}"
  echo "--- getLeaderBoard2 (leaderboard_id=$lb_id, count=$count) ---"
  curl -s --globoff "${API}/community/leaderboard/getLeaderBoard2?title=age2&platform=PC_STEAM&leaderboard_id=${lb_id}&start=1&count=${count}" "${HEADERS[@]}" | python3 -m json.tool
}

matches() {
  local profile_id="${1:?Usage: matches <profile_id>}"
  echo "--- getRecentMatchHistory (profile_id=$profile_id) ---"
  curl -s --globoff "${API}/community/leaderboard/getRecentMatchHistory/?title=age2&profile_ids=[\"${profile_id}\"]" "${HEADERS[@]}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Profiles: {len(d.get(\"profiles\", []))}')
print(f'Matches: {len(d.get(\"matchHistoryStats\", []))}')
for m in d.get('matchHistoryStats', [])[:5]:
    print(f'  #{m[\"id\"]} type={m[\"matchtype_id\"]} map={m[\"mapname\"]} players={len(m.get(\"matchhistoryreportresults\", []))}')
"
}

stats() {
  local profile_id="${1:?Usage: stats <profile_id>}"
  echo "--- GetPersonalStat (profile_id=$profile_id) ---"
  curl -s --globoff "${API}/community/leaderboard/GetPersonalStat?title=age2&profile_ids=[\"${profile_id}\"]" "${HEADERS[@]}" | python3 -m json.tool
}

all() {
  local profile_id="${1:-196240}"
  leaderboard 3 2
  echo
  matches "$profile_id"
  echo
  stats "$profile_id"
}

cmd="${1:?Usage: relic-api-test.sh <leaderboard|matches|stats|all> [args...]}"
shift
"$cmd" "$@"
