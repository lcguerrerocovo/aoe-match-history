-- Up Migration
DROP TABLE IF EXISTS match_raw;

-- Down Migration
CREATE TABLE match_raw (
    match_id BIGINT PRIMARY KEY REFERENCES match(match_id),
    raw_json JSONB NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
