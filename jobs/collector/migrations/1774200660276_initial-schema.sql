-- Up Migration

CREATE TABLE match (
    match_id BIGINT PRIMARY KEY,
    map_id INT,
    map_name TEXT,
    match_type_id INT,
    start_time TIMESTAMPTZ,
    completion_time TIMESTAMPTZ,
    duration INT,
    description TEXT,
    max_players INT,
    options JSONB,
    slotinfo JSONB,
    winning_team INT,
    server_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_player (
    match_id BIGINT REFERENCES match(match_id),
    profile_id BIGINT NOT NULL,
    civilization_id INT,
    civilization_name TEXT,
    team_id INT,
    color_id INT,
    result_type INT,
    old_rating INT,
    new_rating INT,
    player_name TEXT,
    matchurl TEXT,
    matchurl_size INT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (match_id, profile_id)
);

CREATE TABLE match_raw (
    match_id BIGINT PRIMARY KEY REFERENCES match(match_id),
    raw_json JSONB NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collection_state (
    profile_id BIGINT PRIMARY KEY,
    last_match_time TIMESTAMPTZ,
    last_fetched_at TIMESTAMPTZ
);

CREATE INDEX idx_match_type ON match(match_type_id);
CREATE INDEX idx_match_start ON match(start_time);
CREATE INDEX idx_match_completion ON match(completion_time);
CREATE INDEX idx_match_type_id ON match(match_type_id, match_id);
CREATE INDEX idx_player_profile ON match_player(profile_id);

-- Down Migration

DROP INDEX IF EXISTS idx_player_profile;
DROP INDEX IF EXISTS idx_match_type_id;
DROP INDEX IF EXISTS idx_match_completion;
DROP INDEX IF EXISTS idx_match_start;
DROP INDEX IF EXISTS idx_match_type;
DROP TABLE IF EXISTS collection_state;
DROP TABLE IF EXISTS match_raw;
DROP TABLE IF EXISTS match_player;
DROP TABLE IF EXISTS match;
