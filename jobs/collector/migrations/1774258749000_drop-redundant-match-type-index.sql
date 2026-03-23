-- Up Migration
-- idx_match_type(match_type_id) is fully covered by idx_match_type_id(match_type_id, match_id)
DROP INDEX IF EXISTS idx_match_type;

-- Down Migration
CREATE INDEX IF NOT EXISTS idx_match_type ON match(match_type_id);
