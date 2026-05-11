-- Up Migration

-- Speeds up live rating enrichment, which queries by leaderboard_id and a batch
-- of profile IDs.
CREATE INDEX IF NOT EXISTS idx_player_latest_rating_leaderboard_profile
ON player_latest_rating (leaderboard_id, profile_id)
INCLUDE (rating);

-- Down Migration

DROP INDEX IF EXISTS idx_player_latest_rating_leaderboard_profile;
