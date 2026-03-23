import type pg from 'pg';
import { log } from './config';
import { groupPlayersIntoTeams, detectWinningTeams, getGameType } from './matchProcessing';
import type { ProcessedMatch, ProcessedPlayer } from './types';

interface MatchRow {
  match_id: string;
  map_id: number | null;
  map_name: string | null;
  match_type_id: number;
  start_time: Date | null;
  completion_time: Date | null;
  duration: number | null;
  description: string | null;
  max_players: number | null;
  winning_team: number | null;
}

interface PlayerRow {
  match_id: string;
  profile_id: string;
  civilization_id: number | null;
  civilization_name: string | null;
  team_id: number | null;
  color_id: number | null;
  result_type: number | null;
  old_rating: number | null;
  new_rating: number | null;
  player_name: string | null;
  matchurl: string | null;
  matchurl_size: number | null;
}

export interface FilterOptions {
  maps: { name: string; count: number }[];
  matchTypes: { ids: number[]; name: string; count: number }[];
}

export interface QueryMatchHistoryOptions {
  profileId: string;
  limit: number;
  cursor?: { startTime: string; matchId: string } | null;
  mapName?: string;
  matchTypeIds?: number[];
  sort?: 'asc' | 'desc';
  page?: number;
}

/**
 * Query distinct maps and match types for a player from PostgreSQL.
 * Used to populate filter dropdowns with counts.
 */
export async function queryFilterOptions(
  pool: pg.Pool,
  profileId: string,
): Promise<FilterOptions> {
  const [mapsResult, matchTypesResult] = await Promise.all([
    pool.query<{ map_name: string; count: string }>(
      `SELECT m.map_name, COUNT(*)::text AS count
       FROM match_player mp
       JOIN match m ON m.match_id = mp.match_id
       WHERE mp.profile_id = $1 AND m.map_name IS NOT NULL
       GROUP BY m.map_name
       ORDER BY COUNT(*) DESC`,
      [profileId],
    ),
    pool.query<{ match_type_id: number; count: string }>(
      `SELECT m.match_type_id, COUNT(*)::text AS count
       FROM match_player mp
       JOIN match m ON m.match_id = mp.match_id
       WHERE mp.profile_id = $1
       GROUP BY m.match_type_id
       ORDER BY COUNT(*) DESC`,
      [profileId],
    ),
  ]);

  const maps = mapsResult.rows.map(r => ({
    name: r.map_name,
    count: parseInt(r.count, 10),
  }));

  // Merge match type IDs that share the same display name (e.g. IDs 7,8,9 → "RM Team")
  const matchTypesByName = new Map<string, { ids: number[]; count: number }>();
  for (const r of matchTypesResult.rows) {
    const name = getGameType(r.match_type_id) || `Type ${r.match_type_id}`;
    const count = parseInt(r.count, 10);
    const existing = matchTypesByName.get(name);
    if (existing) {
      existing.ids.push(r.match_type_id);
      existing.count += count;
    } else {
      matchTypesByName.set(name, { ids: [r.match_type_id], count });
    }
  }
  const matchTypes = Array.from(matchTypesByName.entries()).map(([name, { ids, count }]) => ({
    ids,
    name,
    count,
  }));

  return { maps, matchTypes };
}

/**
 * Query match history for a player from PostgreSQL.
 * Supports cursor-based pagination and optional filters.
 * Falls back to OFFSET pagination when page is provided without cursor.
 */
export async function queryMatchHistory(
  pool: pg.Pool,
  profileId: string,
  page: number,
  limit: number,
  options?: Omit<QueryMatchHistoryOptions, 'profileId' | 'limit' | 'page'>,
): Promise<{ matches: ProcessedMatch[]; hasMore: boolean }> {
  const cursor = options?.cursor;
  const mapName = options?.mapName;
  const matchTypeIds = options?.matchTypeIds;
  const sort = options?.sort || 'desc';

  // Build dynamic WHERE clause
  const conditions: string[] = ['mp.profile_id = $1'];
  const params: (string | number | number[])[] = [profileId];
  let paramIndex = 2;

  if (mapName) {
    conditions.push(`m.map_name = $${paramIndex}`);
    params.push(mapName);
    paramIndex++;
  }

  if (matchTypeIds && matchTypeIds.length > 0) {
    conditions.push(`m.match_type_id = ANY($${paramIndex})`);
    params.push(matchTypeIds);
    paramIndex++;
  }

  if (cursor) {
    if (sort === 'desc') {
      conditions.push(`(m.start_time, m.match_id) < ($${paramIndex}, $${paramIndex + 1})`);
    } else {
      conditions.push(`(m.start_time, m.match_id) > ($${paramIndex}, $${paramIndex + 1})`);
    }
    params.push(cursor.startTime, cursor.matchId);
    paramIndex += 2;
  }

  const whereClause = conditions.join(' AND ');
  const orderDirection = sort === 'asc' ? 'ASC' : 'DESC';

  // Use OFFSET only when page is provided and no cursor
  const useCursor = !!cursor || !!(mapName || matchTypeIds);
  const offset = !useCursor && !cursor ? (page - 1) * limit : 0;

  params.push(limit + 1);
  const limitParam = `$${paramIndex}`;
  paramIndex++;

  let offsetClause = '';
  if (!cursor && !useCursor && offset > 0) {
    params.push(offset);
    offsetClause = `OFFSET $${paramIndex}`;
    paramIndex++;
  }

  const matchIdsQuery = `
    SELECT mp.match_id
    FROM match_player mp
    JOIN match m ON m.match_id = mp.match_id
    WHERE ${whereClause}
    ORDER BY m.start_time ${orderDirection}, m.match_id ${orderDirection}
    LIMIT ${limitParam} ${offsetClause}`;

  const matchIdsResult = await pool.query<{ match_id: string }>(
    matchIdsQuery,
    params,
  );

  const hasMore = matchIdsResult.rows.length > limit;
  const matchIds = matchIdsResult.rows.slice(0, limit).map(r => r.match_id);

  if (matchIds.length === 0) {
    return { matches: [], hasMore: false };
  }

  // Step 2: Get full match + player data for those match IDs
  const [matchesResult, playersResult] = await Promise.all([
    pool.query<MatchRow>(
      `SELECT match_id, map_id, map_name, match_type_id, start_time,
              completion_time, duration, description, max_players, winning_team
       FROM match
       WHERE match_id = ANY($1)`,
      [matchIds],
    ),
    pool.query<PlayerRow>(
      `SELECT match_id, profile_id, civilization_id, civilization_name,
              team_id, color_id, result_type, old_rating, new_rating,
              player_name, matchurl, matchurl_size
       FROM match_player
       WHERE match_id = ANY($1)`,
      [matchIds],
    ),
  ]);

  // Index players by match_id
  const playersByMatch = new Map<string, PlayerRow[]>();
  for (const row of playersResult.rows) {
    const id = row.match_id.toString();
    if (!playersByMatch.has(id)) playersByMatch.set(id, []);
    playersByMatch.get(id)!.push(row);
  }

  // Transform to ProcessedMatch[]
  const matches: ProcessedMatch[] = matchesResult.rows.map(match => {
    const matchId = match.match_id.toString();
    const playerRows = playersByMatch.get(matchId) || [];

    const players: ProcessedPlayer[] = playerRows.map(p => ({
      name: p.player_name || p.profile_id.toString(),
      civ: p.civilization_name || p.civilization_id || 0,
      number: p.team_id ?? 0,
      color_id: p.color_id ?? 0,
      user_id: parseInt(p.profile_id, 10),
      winner: p.result_type === 1,
      rating: p.new_rating,
      rating_change: p.old_rating != null && p.new_rating != null
        ? p.new_rating - p.old_rating
        : null,
      save_game_url: p.matchurl || null,
      save_game_size: p.matchurl_size || null,
      match_id: parseInt(matchId, 10),
      replay_available: null,
    }));

    const teams = groupPlayersIntoTeams(players);
    const { winningTeam, winningTeams } = detectWinningTeams(teams);
    const matchTypeIdVal = match.match_type_id;
    const startTime = match.start_time
      ? match.start_time.toISOString()
      : new Date(0).toISOString();

    return {
      match_id: matchId,
      map_id: match.map_id,
      start_time: startTime,
      description: match.description === 'AUTOMATCH'
        ? getGameType(matchTypeIdVal)
        : match.description,
      diplomacy: {
        type: getGameType(matchTypeIdVal) || 'Unknown',
        team_size: (match.max_players ?? 0).toString(),
      },
      map: match.map_name || 'Unknown',
      duration: match.duration ?? 0,
      teams,
      players,
      winning_team: winningTeam,
      winning_teams: winningTeams,
    };
  });

  // Sort to match query order
  if (sort === 'asc') {
    matches.sort((a, b) => a.start_time.localeCompare(b.start_time));
  } else {
    matches.sort((a, b) => b.start_time.localeCompare(a.start_time));
  }

  log.debug({ profileId, page, count: matches.length, hasMore }, 'PostgreSQL match history query');

  return { matches, hasMore };
}

/**
 * Query a single match by match_id from PostgreSQL.
 * Returns a ProcessedMatch or null if not found.
 */
export async function querySingleMatch(
  pool: pg.Pool,
  matchId: string,
): Promise<ProcessedMatch | null> {
  const [matchResult, playersResult] = await Promise.all([
    pool.query<MatchRow>(
      `SELECT match_id, map_id, map_name, match_type_id, start_time,
              completion_time, duration, description, max_players, winning_team
       FROM match
       WHERE match_id = $1`,
      [matchId],
    ),
    pool.query<PlayerRow>(
      `SELECT match_id, profile_id, civilization_id, civilization_name,
              team_id, color_id, result_type, old_rating, new_rating,
              player_name, matchurl, matchurl_size
       FROM match_player
       WHERE match_id = $1`,
      [matchId],
    ),
  ]);

  if (matchResult.rows.length === 0) return null;

  const match = matchResult.rows[0];
  const mId = match.match_id.toString();

  const players: ProcessedPlayer[] = playersResult.rows.map(p => ({
    name: p.player_name || p.profile_id.toString(),
    civ: p.civilization_name || p.civilization_id || 0,
    number: p.team_id ?? 0,
    color_id: p.color_id ?? 0,
    user_id: parseInt(p.profile_id, 10),
    winner: p.result_type === 1,
    rating: p.new_rating,
    rating_change: p.old_rating != null && p.new_rating != null
      ? p.new_rating - p.old_rating
      : null,
    save_game_url: p.matchurl || null,
    save_game_size: p.matchurl_size || null,
    match_id: parseInt(mId, 10),
    replay_available: null,
  }));

  const teams = groupPlayersIntoTeams(players);
  const { winningTeam, winningTeams } = detectWinningTeams(teams);
  const matchTypeId = match.match_type_id;
  const startTime = match.start_time
    ? match.start_time.toISOString()
    : new Date(0).toISOString();

  return {
    match_id: mId,
    map_id: match.map_id,
    start_time: startTime,
    description: match.description === 'AUTOMATCH'
      ? getGameType(matchTypeId)
      : match.description,
    diplomacy: {
      type: getGameType(matchTypeId) || 'Unknown',
      team_size: (match.max_players ?? 0).toString(),
    },
    map: match.map_name || 'Unknown',
    duration: match.duration ?? 0,
    teams,
    players,
    winning_team: winningTeam,
    winning_teams: winningTeams,
  };
}
