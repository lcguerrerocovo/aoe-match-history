-- Up Migration

-- These indexes were added manually in production before being captured in
-- source-controlled migrations. Keep the definitions here so fresh databases
-- and future restores match the live schema.
CREATE INDEX IF NOT EXISTS idx_match_type_start_team
ON match(match_type_id, start_time)
WHERE winning_team IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_player_rating_lookup
ON match_player(profile_id, match_id DESC)
INCLUDE (new_rating)
WHERE new_rating IS NOT NULL AND new_rating > 0;

-- Down Migration

DROP INDEX IF EXISTS idx_match_player_rating_lookup;
DROP INDEX IF EXISTS idx_match_type_start_team;
