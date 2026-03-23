#!/usr/bin/env bash
# Show actual new matches ingested per collector run.
# Usage: bash scripts/collector-stats.sh [LIMIT]
#   LIMIT defaults to 10 (most recent runs)

set -euo pipefail

LIMIT="${1:-10}"

gcloud compute ssh aoe-match-db --zone=us-central1-a --command="sudo -u postgres psql -d aoe2_matches -c \"
WITH runs AS (
  SELECT
    date_trunc('hour', created_at) +
      INTERVAL '1 minute' * (EXTRACT(MINUTE FROM created_at)::int / 30 * 30) AS run_window,
    COUNT(*) AS new_matches,
    MIN(created_at) AS first_insert,
    MAX(created_at) AS last_insert
  FROM match
  GROUP BY 1
  HAVING COUNT(*) > 10
  ORDER BY 1 DESC
  LIMIT ${LIMIT}
)
SELECT
  to_char(run_window AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS run_start_utc,
  new_matches,
  to_char(last_insert - first_insert, 'HH24:MI:SS') AS duration,
  ROUND(new_matches / GREATEST(EXTRACT(EPOCH FROM last_insert - first_insert) / 60, 1))::int AS matches_per_min
FROM runs
ORDER BY run_window DESC;
\""
