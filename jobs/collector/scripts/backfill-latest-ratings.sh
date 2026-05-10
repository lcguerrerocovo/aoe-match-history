#!/usr/bin/env bash
set -euo pipefail

# Backfill player_latest_rating from historical match_player rows.
#
# Required:
#   DATABASE_URL=postgresql://...
#
# Optional:
#   BATCH_MATCHES=5000          Number of match rows scanned per batch
#   START_MATCH_ID=0            Resume point; scans match_id > START_MATCH_ID
#   END_MATCH_ID=               Optional inclusive upper bound
#   MAX_BATCHES=                Optional stop after N batches
#   STATEMENT_TIMEOUT_MS=120000 Per-batch timeout
#   SLEEP_SECONDS=0.1           Pause between batches

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

BATCH_MATCHES="${BATCH_MATCHES:-5000}"
START_MATCH_ID="${START_MATCH_ID:-0}"
END_MATCH_ID="${END_MATCH_ID:-}"
MAX_BATCHES="${MAX_BATCHES:-}"
STATEMENT_TIMEOUT_MS="${STATEMENT_TIMEOUT_MS:-120000}"
SLEEP_SECONDS="${SLEEP_SECONDS:-0.1}"

require_non_negative_integer() {
  local name="$1"
  local value="$2"
  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    echo "$name must be a non-negative integer" >&2
    exit 1
  fi
}

require_positive_integer() {
  local name="$1"
  local value="$2"
  require_non_negative_integer "$name" "$value"
  if [[ "$value" == "0" ]]; then
    echo "$name must be greater than 0" >&2
    exit 1
  fi
}

require_positive_integer "BATCH_MATCHES" "$BATCH_MATCHES"
require_non_negative_integer "START_MATCH_ID" "$START_MATCH_ID"
require_positive_integer "STATEMENT_TIMEOUT_MS" "$STATEMENT_TIMEOUT_MS"

if [[ -n "$END_MATCH_ID" ]]; then
  require_non_negative_integer "END_MATCH_ID" "$END_MATCH_ID"
fi

if [[ -n "$MAX_BATCHES" ]]; then
  require_positive_integer "MAX_BATCHES" "$MAX_BATCHES"
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c "
  SELECT COUNT(*) FROM rating_leaderboard_mapping;
" >/dev/null

last_match_id="$START_MATCH_ID"
batch_number=0
total_matches=0
total_rating_rows=0
total_candidates=0
total_changed=0

echo "Starting latest ratings backfill"
echo "  batch_matches=$BATCH_MATCHES"
echo "  start_match_id=$START_MATCH_ID"
echo "  end_match_id=${END_MATCH_ID:-none}"
echo "  max_batches=${MAX_BATCHES:-none}"
echo "  statement_timeout_ms=$STATEMENT_TIMEOUT_MS"

while true; do
  if [[ -n "$MAX_BATCHES" && "$batch_number" -ge "$MAX_BATCHES" ]]; then
    echo "Reached MAX_BATCHES=$MAX_BATCHES"
    break
  fi

  batch_started_at="$(date +%s)"

  result="$(
    psql "$DATABASE_URL" \
      -v ON_ERROR_STOP=1 \
      -v statement_timeout_ms="$STATEMENT_TIMEOUT_MS" \
      -v last_match_id="$last_match_id" \
      -v batch_matches="$BATCH_MATCHES" \
      -v end_match_id="$END_MATCH_ID" \
      -qAt \
      -F $'\t' \
      -c "
        SET statement_timeout = :'statement_timeout_ms';

        WITH batch_matches AS MATERIALIZED (
          SELECT match_id, match_type_id, start_time, completion_time
          FROM match
          WHERE match_id > :'last_match_id'::bigint
            AND (NULLIF(:'end_match_id', '') IS NULL OR match_id <= NULLIF(:'end_match_id', '')::bigint)
          ORDER BY match_id
          LIMIT :'batch_matches'::int
        ),
        ratings AS MATERIALIZED (
          SELECT
            mp.profile_id,
            rlm.leaderboard_id,
            mp.new_rating AS rating,
            mp.match_id AS source_match_id,
            COALESCE(m.completion_time, m.start_time, TO_TIMESTAMP(0)) AS source_time
          FROM batch_matches m
          JOIN rating_leaderboard_mapping rlm ON rlm.match_type_id = m.match_type_id
          JOIN match_player mp ON mp.match_id = m.match_id
          WHERE mp.new_rating IS NOT NULL
            AND mp.new_rating > 0
        ),
        ranked AS (
          SELECT
            profile_id,
            leaderboard_id,
            rating,
            source_match_id,
            source_time,
            ROW_NUMBER() OVER (
              PARTITION BY profile_id, leaderboard_id
              ORDER BY source_time DESC, source_match_id DESC
            ) AS rn
          FROM ratings
        ),
        upserted AS (
          INSERT INTO player_latest_rating (
            profile_id,
            leaderboard_id,
            rating,
            source_match_id,
            source_time,
            updated_at
          )
          SELECT
            profile_id,
            leaderboard_id,
            rating,
            source_match_id,
            source_time,
            NOW()
          FROM ranked
          WHERE rn = 1
          ON CONFLICT (profile_id, leaderboard_id) DO UPDATE SET
            rating = EXCLUDED.rating,
            source_match_id = EXCLUDED.source_match_id,
            source_time = EXCLUDED.source_time,
            updated_at = NOW()
          WHERE EXCLUDED.source_time > player_latest_rating.source_time
             OR (
               EXCLUDED.source_time = player_latest_rating.source_time
               AND EXCLUDED.source_match_id > player_latest_rating.source_match_id
             )
          RETURNING 1
        )
        SELECT
          (SELECT COUNT(*) FROM batch_matches)::int,
          (SELECT COUNT(*) FROM ratings)::int,
          (SELECT COUNT(*) FROM ranked WHERE rn = 1)::int,
          (SELECT COUNT(*) FROM upserted)::int,
          COALESCE((SELECT MAX(match_id)::text FROM batch_matches), :'last_match_id');
      "
  )"

  IFS=$'\t' read -r matches_scanned rating_rows_scanned candidate_rows rows_changed new_last_match_id <<< "$result"

  if [[ "$matches_scanned" == "0" ]]; then
    echo "No more matches to scan. Backfill complete."
    break
  fi

  batch_number=$((batch_number + 1))
  total_matches=$((total_matches + matches_scanned))
  total_rating_rows=$((total_rating_rows + rating_rows_scanned))
  total_candidates=$((total_candidates + candidate_rows))
  total_changed=$((total_changed + rows_changed))
  last_match_id="$new_last_match_id"
  batch_elapsed=$(( $(date +%s) - batch_started_at ))

  echo "batch=$batch_number last_match_id=$last_match_id matches=$matches_scanned rating_rows=$rating_rows_scanned candidates=$candidate_rows changed=$rows_changed elapsed_seconds=$batch_elapsed"
  echo "resume with: START_MATCH_ID=$last_match_id bash jobs/collector/scripts/backfill-latest-ratings.sh"

  if [[ "$SLEEP_SECONDS" != "0" ]]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo "Finished latest ratings backfill"
echo "  batches=$batch_number"
echo "  matches_scanned=$total_matches"
echo "  rating_rows_scanned=$total_rating_rows"
echo "  candidate_rows=$total_candidates"
echo "  rows_changed=$total_changed"
echo "  resume_from_match_id=$last_match_id"
