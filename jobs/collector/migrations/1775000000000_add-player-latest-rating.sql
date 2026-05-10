-- Up Migration

CREATE TABLE IF NOT EXISTS player_latest_rating (
    profile_id BIGINT NOT NULL,
    leaderboard_id INT NOT NULL,
    rating INT NOT NULL,
    source_match_id BIGINT NOT NULL,
    source_time TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (profile_id, leaderboard_id)
);

CREATE TABLE IF NOT EXISTS rating_leaderboard_mapping (
    match_type_id INT PRIMARY KEY,
    leaderboard_id INT NOT NULL,
    label TEXT NOT NULL
);

INSERT INTO rating_leaderboard_mapping (match_type_id, leaderboard_id, label)
VALUES
    (2, 1, 'DM 1v1'),
    (3, 2, 'DM Team'),
    (4, 2, 'DM Team'),
    (5, 2, 'DM Team'),
    (6, 3, 'RM 1v1'),
    (7, 4, 'RM Team'),
    (8, 4, 'RM Team'),
    (9, 4, 'RM Team'),
    (26, 13, 'EW 1v1'),
    (27, 14, 'EW Team'),
    (28, 14, 'EW Team'),
    (29, 14, 'EW Team'),
    (18, 19, 'Quick Match RM'),
    (19, 20, 'Quick Match RM Team'),
    (20, 20, 'Quick Match RM Team'),
    (21, 20, 'Quick Match RM Team'),
    (11, 21, 'Quick Match EW'),
    (12, 22, 'Quick Match EW Team'),
    (13, 22, 'Quick Match EW Team'),
    (14, 22, 'Quick Match EW Team')
ON CONFLICT (match_type_id) DO UPDATE SET
    leaderboard_id = EXCLUDED.leaderboard_id,
    label = EXCLUDED.label;

-- Historical backfill is intentionally not part of this deploy migration.
-- The match_player and match tables are large enough that a full-table backfill
-- can exceed CI/DB connection limits. The collector populates this table for
-- newly fetched match histories after the schema and mapping exist.

-- Down Migration

DROP TABLE IF EXISTS player_latest_rating;
DROP TABLE IF EXISTS rating_leaderboard_mapping;
