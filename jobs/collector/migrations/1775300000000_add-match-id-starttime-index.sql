/*  Up Migration */

-- Covering index so the search-index updater's "latest match per profile"
-- lookup (match_player.match_id -> match.start_time) can be served index-only
-- instead of doing one heap read into `match` per match_player row.
-- On the live DB (9.7M match rows) this dropped the 200-profile sample from
-- 8.4s (random heap reads, cold cache) to part of a 214ms plan (Index Only Scan).
-- Created CONCURRENTLY in prod already (2026-08-08); captured here so fresh DBs
-- match. Drop is safe (no query depends on this exact index for correctness).

CREATE INDEX IF NOT EXISTS idx_match_id_starttime
  ON match (match_id, start_time DESC);

/* Down Migration */

DROP INDEX IF EXISTS idx_match_id_starttime;
