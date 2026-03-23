-- Up Migration

-- Covers ORDER BY start_time DESC, match_id DESC and cursor condition (start_time, match_id) < (?, ?)
CREATE INDEX idx_match_start_id ON match(start_time DESC, match_id DESC);

-- Covers WHERE profile_id = ? JOIN match ON match_id (index-only lookup for the join)
CREATE INDEX idx_player_profile_match ON match_player(profile_id, match_id);

-- Down Migration

DROP INDEX IF EXISTS idx_player_profile_match;
DROP INDEX IF EXISTS idx_match_start_id;
