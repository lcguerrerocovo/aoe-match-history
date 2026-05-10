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

WITH ratings AS (
    SELECT
        mp.profile_id,
        rlm.leaderboard_id,
        mp.new_rating AS rating,
        mp.match_id AS source_match_id,
        COALESCE(m.completion_time, m.start_time, TO_TIMESTAMP(0)) AS source_time
    FROM match_player mp
    JOIN match m ON m.match_id = mp.match_id
    JOIN rating_leaderboard_mapping rlm ON rlm.match_type_id = m.match_type_id
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
)
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
   );

-- Down Migration

DROP TABLE IF EXISTS player_latest_rating;
DROP TABLE IF EXISTS rating_leaderboard_mapping;
