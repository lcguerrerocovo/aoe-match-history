import { BigQuery } from '@google-cloud/bigquery';
import pino from 'pino';

const log = pino({ name: 'stats-bigquery' });

export interface StatsRow {
  patch: string;
  match_type_id: number;
  civ_id: number;
  map_id: number | null;
  wins: number;
  losses: number;
  total_picks: number;
  unique_matches: number;
}

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
    CAST(JSON_EXTRACT_SCALAR(p, '$.resulttype') AS INT64) AS result_type
  FROM deduped m,
    UNNEST(JSON_EXTRACT_ARRAY(m.raw_json, '$.matchhistoryreportresults')) AS p
)
SELECT
  patch,
  match_type_id,
  civ_id,
  map_id,
  COUNTIF(result_type = 1) AS wins,
  COUNTIF(result_type = 0) AS losses,
  COUNT(*) AS total_picks,
  COUNT(DISTINCT match_id) AS unique_matches
FROM player_results
WHERE civ_id IS NOT NULL
  AND result_type IN (0, 1)
GROUP BY patch, match_type_id, civ_id, map_id
ORDER BY patch, match_type_id, civ_id, map_id
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
    },
    types: {
      prev_start: 'TIMESTAMP',
      curr_start: 'TIMESTAMP',
      curr_end: 'TIMESTAMP',
    },
  });

  log.info({ rowCount: rows.length }, 'BigQuery query complete');

  return rows.map((row: Record<string, unknown>) => ({
    patch: row.patch as string,
    match_type_id: Number(row.match_type_id),
    civ_id: Number(row.civ_id),
    map_id: row.map_id != null ? Number(row.map_id) : null,
    wins: Number(row.wins),
    losses: Number(row.losses),
    total_picks: Number(row.total_picks),
    unique_matches: Number(row.unique_matches),
  }));
}
