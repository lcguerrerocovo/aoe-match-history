import pg from 'pg';
import pino from 'pino';

const { Pool } = pg;
const log = pino({ name: 'stats-postgres' });

const EXCLUDED_MAPS = ['Nomad', 'MegaRandom', 'Coastal Forest'];

export interface PositionRow {
  match_id: number;
  match_type_id: number;
  map_name: string;
  civilization_id: number;
  civilization_name: string;
  team_id: number;
  color_id: number;
  result_type: number;
  old_rating: number | null;
}

const POSITION_QUERY = `
SELECT
  m.match_id,
  m.match_type_id,
  m.map_name,
  mp.civilization_id,
  mp.civilization_name,
  mp.team_id,
  mp.color_id,
  mp.result_type,
  mp.old_rating
FROM match m
JOIN match_player mp ON m.match_id = mp.match_id
WHERE m.match_type_id IN (8, 9)
  AND m.start_time >= $1
  AND m.winning_team IS NOT NULL
  AND m.start_time IS NOT NULL
  AND m.map_name IS NOT NULL
  AND m.map_name NOT IN (${EXCLUDED_MAPS.map((_, i) => `$${i + 2}`).join(', ')})
  AND mp.civilization_id IS NOT NULL
  AND mp.team_id IS NOT NULL
  AND mp.color_id IS NOT NULL
  AND mp.result_type IN (0, 1)
ORDER BY m.match_id
`;

export async function queryPositionStats(
  databaseUrl: string,
  patchStartDate: string,
): Promise<PositionRow[]> {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });

  try {
    const patchStart = new Date(patchStartDate);
    log.info({ patchStart: patchStart.toISOString() }, 'Querying PostgreSQL for position stats');

    const params = [patchStart, ...EXCLUDED_MAPS];
    const result = await pool.query<PositionRow>(POSITION_QUERY, params);

    log.info({ rowCount: result.rows.length }, 'PostgreSQL query complete');
    return result.rows;
  } finally {
    await pool.end();
  }
}
