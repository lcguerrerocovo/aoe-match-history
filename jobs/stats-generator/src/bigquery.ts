import { BigQuery } from '@google-cloud/bigquery';
import pino from 'pino';

const log = pino({ name: 'stats-bigquery' });

export interface StatsRow {
  patch: string;
  match_type_id: number;
  civ_id: number;
  map_id: number | null;
  elo_bracket: string;
  wins: number;
  losses: number;
  total_picks: number;
  unique_matches: number;
}

const MAX_ELO_GAP = 200;

const STATS_QUERY = `
WITH deduped AS (
  SELECT *
  FROM \`aoe2-site.matches.raw_matches\`
  WHERE match_type_id IN (6, 7, 8, 9)
    AND start_time >= @prev_start
    AND start_time < @curr_end
    AND start_time IS NOT NULL
    AND winning_team IS NOT NULL
  QUALIFY ROW_NUMBER() OVER (PARTITION BY match_id ORDER BY match_id) = 1
),
player_results AS (
  SELECT
    m.match_id,
    m.match_type_id,
    m.map_id,
    CASE
      WHEN m.start_time >= @curr_start THEN 'current'
      ELSE 'previous'
    END AS patch,
    CAST(JSON_EXTRACT_SCALAR(p, '$.civilization_id') AS INT64) AS civ_id,
    CAST(JSON_EXTRACT_SCALAR(p, '$.resulttype') AS INT64) AS result_type,
    CAST(JSON_EXTRACT_SCALAR(p, '$.profile_id') AS INT64) AS profile_id,
    CAST(JSON_EXTRACT_SCALAR(p, '$.teamid') AS INT64) AS team_id
  FROM deduped m,
    UNNEST(JSON_EXTRACT_ARRAY(m.raw_json, '$.matchhistoryreportresults')) AS p
),
player_ratings AS (
  SELECT
    m.match_id,
    CAST(JSON_EXTRACT_SCALAR(member, '$.profile_id') AS INT64) AS profile_id,
    CAST(JSON_EXTRACT_SCALAR(member, '$.oldrating') AS INT64) AS rating
  FROM deduped m,
    UNNEST(JSON_EXTRACT_ARRAY(m.raw_json, '$.matchhistorymember')) AS member
),
-- For 1v1: gap between the two players
-- For team: gap between average team ELOs
match_elo_gap AS (
  SELECT
    pr.match_id,
    pr.match_type_id,
    CASE
      WHEN pr.match_type_id = 6 THEN
        MAX(r.rating) - MIN(r.rating)
      ELSE
        ABS(
          AVG(CASE WHEN pr.team_id = 0 THEN r.rating END) -
          AVG(CASE WHEN pr.team_id = 1 THEN r.rating END)
        )
    END AS elo_gap
  FROM player_results pr
  JOIN player_ratings r ON pr.match_id = r.match_id AND pr.profile_id = r.profile_id
  WHERE r.rating > 0
  GROUP BY pr.match_id, pr.match_type_id
),
competitive_matches AS (
  SELECT match_id
  FROM match_elo_gap
  WHERE elo_gap <= @max_elo_gap OR elo_gap IS NULL
),
with_elo AS (
  SELECT
    pr.*,
    CASE
      WHEN r.rating IS NULL OR r.rating <= 0 THEN 'all'
      WHEN r.rating < 1000 THEN '<1000'
      WHEN r.rating < 1500 THEN '1000-1500'
      ELSE '1500+'
    END AS elo_bracket
  FROM player_results pr
  LEFT JOIN player_ratings r
    ON pr.match_id = r.match_id AND pr.profile_id = r.profile_id
  INNER JOIN competitive_matches cm
    ON pr.match_id = cm.match_id
)
SELECT
  patch,
  match_type_id,
  civ_id,
  map_id,
  elo_bracket,
  COUNTIF(result_type = 1) AS wins,
  COUNTIF(result_type = 0) AS losses,
  COUNT(*) AS total_picks,
  COUNT(DISTINCT match_id) AS unique_matches
FROM with_elo
WHERE civ_id IS NOT NULL
  AND result_type IN (0, 1)
GROUP BY patch, match_type_id, civ_id, map_id, elo_bracket
ORDER BY patch, match_type_id, civ_id, map_id, elo_bracket
`;

export async function queryCivStats(
  previousPatchDate: string,
  currentPatchDate: string,
): Promise<StatsRow[]> {
  const bq = new BigQuery({ projectId: 'aoe2-site' });

  const prevStart = new Date(previousPatchDate);
  const currStart = new Date(currentPatchDate);
  const currEnd = new Date();

  log.info({
    prevStart: prevStart.toISOString(),
    currStart: currStart.toISOString(),
    currEnd: currEnd.toISOString(),
  }, 'Querying BigQuery for civ stats');

  const [rows] = await bq.query({
    query: STATS_QUERY,
    params: {
      prev_start: bq.timestamp(prevStart),
      curr_start: bq.timestamp(currStart),
      curr_end: bq.timestamp(currEnd),
      max_elo_gap: MAX_ELO_GAP,
    },
    types: {
      prev_start: 'TIMESTAMP',
      curr_start: 'TIMESTAMP',
      curr_end: 'TIMESTAMP',
      max_elo_gap: 'INT64',
    },
  });

  log.info({ rowCount: rows.length }, 'BigQuery query complete');

  return rows.map((row: Record<string, unknown>) => ({
    patch: row.patch as string,
    match_type_id: Number(row.match_type_id),
    civ_id: Number(row.civ_id),
    map_id: row.map_id != null ? Number(row.map_id) : null,
    elo_bracket: row.elo_bracket as string,
    wins: Number(row.wins),
    losses: Number(row.losses),
    total_picks: Number(row.total_picks),
    unique_matches: Number(row.unique_matches),
  }));
}
