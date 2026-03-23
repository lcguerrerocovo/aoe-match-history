import pg from 'pg';
import pino from 'pino';
import { decodeOptions, decodeSlotInfo } from './decoders.js';
import type { RawMatch, RawProfile, IdNameMap, PlayerMetadata } from './types.js';

const { Pool } = pg;
const log = pino({ name: 'match-collector' });

const INT_MAX = 2147483647;
function clampInt(val: number | null | undefined): number | null {
  if (val == null || Number.isNaN(val) || val > INT_MAX || val < -INT_MAX) return null;
  return val;
}

interface ProcessedPlayer {
  matchId: number;
  profileId: number;
  civId: number | null;
  civName: string | null;
  teamId: number | null;
  colorId: number | null;
  resultType: number | null;
  oldRating: number | null;
  newRating: number | null;
  playerName: string | null;
  matchUrl: string | null;
  matchUrlSize: number | null;
}

export interface ProcessedMatch {
  matchId: number;
  mapId: number | null;
  mapName: string | null;
  matchTypeId: number | null;
  startTime: Date | null;
  completionTime: Date | null;
  duration: number | null;
  description: string | null;
  maxPlayers: number | null;
  options: Record<string, string>;
  slotInfoJson: string | null;
  winningTeam: number | null;
  rawJson: string;
  players: ProcessedPlayer[];
}

export function processMatch(
  match: RawMatch,
  profiles: RawProfile[],
  civMap: IdNameMap,
  mapMap: IdNameMap,
): ProcessedMatch {
  const options = decodeOptions(match.options);
  const mapIdStr = options['10'];
  const mapId = mapIdStr ? parseInt(mapIdStr, 10) : null;
  const mapName = mapId !== null ? (mapMap[mapId.toString()] || match.mapname) : match.mapname;

  let slotInfo: Array<{ 'profileInfo.id': number; metaData?: PlayerMetadata | string | null }> = [];
  try {
    slotInfo = decodeSlotInfo(match.slotinfo);
  } catch { /* slotinfo may be missing */ }

  const duration = match.completiontime > 0 && match.startgametime > 0
    ? match.completiontime - match.startgametime
    : null;

  const winningTeam = detectWinningTeam(match, slotInfo);

  const players: ProcessedPlayer[] = match.matchhistoryreportresults.map(result => {
    const playerSlot = slotInfo.find(p => p['profileInfo.id'] === result.profile_id);
    const metaData = playerSlot?.metaData as PlayerMetadata | null | undefined;
    const teamId = metaData?.teamId ? parseInt(metaData.teamId) : result.teamid + 1;
    const colorId = metaData?.colorId ?? 0;
    const civName = civMap[result.civilization_id.toString()] || null;
    const ratingEntry = match.matchhistorymember?.find(m => m.profile_id === result.profile_id);
    const profile = profiles.find(p => p.profile_id === result.profile_id);
    const matchUrl = match.matchurls?.find(u => u.profile_id === result.profile_id);

    return {
      matchId: match.id,
      profileId: result.profile_id,
      civId: clampInt(result.civilization_id),
      civName,
      teamId: clampInt(teamId),
      colorId: clampInt(colorId),
      resultType: clampInt(result.resulttype),
      oldRating: clampInt(ratingEntry?.oldrating),
      newRating: clampInt(ratingEntry?.newrating),
      playerName: profile?.alias || profile?.name || null,
      matchUrl: matchUrl?.url || null,
      matchUrlSize: clampInt(matchUrl?.size),
    };
  });

  return {
    matchId: match.id,
    mapId: clampInt(mapId),
    mapName,
    matchTypeId: clampInt(match.matchtype_id),
    startTime: match.startgametime > 0 ? new Date(match.startgametime * 1000) : null,
    completionTime: match.completiontime > 0 ? new Date(match.completiontime * 1000) : null,
    duration: clampInt(duration),
    description: match.description,
    maxPlayers: clampInt(match.maxplayers),
    options,
    slotInfoJson: slotInfo.length > 0 ? JSON.stringify(slotInfo) : null,
    winningTeam: clampInt(winningTeam),
    rawJson: JSON.stringify(match),
    players,
  };
}

function detectWinningTeam(
  match: RawMatch,
  slotInfo: Array<{ 'profileInfo.id': number; metaData?: PlayerMetadata | string | null }>
): number | null {
  for (const result of match.matchhistoryreportresults) {
    if (result.resulttype === 1) {
      const playerSlot = slotInfo.find(p => p['profileInfo.id'] === result.profile_id);
      const metaData = playerSlot?.metaData as PlayerMetadata | null | undefined;
      const teamId = metaData?.teamId ? parseInt(metaData.teamId) : result.teamid + 1;
      return teamId;
    }
  }
  return null;
}

export class Database {
  private pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get collection_state for a batch of profile IDs.
   * Returns a map of profileId → last_fetched_at (Unix timestamp).
   */
  async getCollectionState(profileIds: number[]): Promise<Map<number, number>> {
    if (profileIds.length === 0) return new Map();

    const result = await this.pool.query<{ profile_id: string; last_fetched_at: Date }>(
      'SELECT profile_id, last_fetched_at FROM collection_state WHERE profile_id = ANY($1)',
      [profileIds]
    );

    const state = new Map<number, number>();
    for (const row of result.rows) {
      state.set(Number(row.profile_id), Math.floor(row.last_fetched_at.getTime() / 1000));
    }
    return state;
  }

  /**
   * Upsert a batch of matches from a single API response into the database.
   * Uses multi-row INSERTs for performance. Falls back to per-match SAVEPOINTs on failure.
   * Also updates collection_state for the fetched profiles.
   */
  async upsertMatches(
    matches: RawMatch[],
    profiles: RawProfile[],
    profileIds: number[],
    lastMatchTimes: Map<number, number>,
    civMap: IdNameMap,
    mapMap: IdNameMap,
  ): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Pre-process and deduplicate matches (same match can appear for multiple profiles in a batch)
      const allProcessed = matches.map(match => processMatch(match, profiles, civMap, mapMap));
      const seen = new Set<number>();
      const processed: ProcessedMatch[] = [];
      // Sort by match_id for consistent lock ordering (prevents deadlocks across concurrent workers)
      allProcessed.sort((a, b) => a.matchId - b.matchId);
      for (const m of allProcessed) {
        if (!seen.has(m.matchId)) {
          seen.add(m.matchId);
          processed.push(m);
        }
      }

      let upsertedCount: number;
      try {
        // Try batch insert (fast path)
        await client.query('SAVEPOINT batch');
        await this.batchInsertMatches(client, processed);
        await this.batchInsertPlayers(client, processed);
        await client.query('RELEASE SAVEPOINT batch');
        upsertedCount = processed.length;
      } catch (err) {
        // Batch failed — fall back to per-match inserts with SAVEPOINTs
        await client.query('ROLLBACK TO SAVEPOINT batch');
        log.warn({ err: (err as Error).message }, 'Batch insert failed, falling back to per-match');
        upsertedCount = await this.perMatchInsert(client, processed);
      }

      // Batch upsert collection_state
      await this.batchUpdateCollectionState(client, profileIds, lastMatchTimes);

      await client.query('COMMIT');
      return upsertedCount;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async batchInsertMatches(client: pg.PoolClient, processed: ProcessedMatch[]): Promise<void> {
    if (processed.length === 0) return;
    const cols = 12;
    const placeholders: string[] = [];
    const values: unknown[] = [];
    for (let i = 0; i < processed.length; i++) {
      const off = i * cols;
      placeholders.push(`(${Array.from({ length: cols }, (_, j) => `$${off + j + 1}`).join(',')}, NOW(), NOW())`);
      const m = processed[i];
      values.push(
        m.matchId, m.mapId, m.mapName, m.matchTypeId,
        m.startTime, m.completionTime, m.duration, m.description,
        m.maxPlayers, m.options, m.slotInfoJson, m.winningTeam,
      );
    }
    await client.query(
      `INSERT INTO match (match_id, map_id, map_name, match_type_id, start_time, completion_time,
       duration, description, max_players, options, slotinfo, winning_team, created_at, updated_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (match_id) DO UPDATE SET
         map_id = EXCLUDED.map_id, map_name = EXCLUDED.map_name,
         options = EXCLUDED.options, slotinfo = EXCLUDED.slotinfo,
         winning_team = EXCLUDED.winning_team, updated_at = NOW()`,
      values,
    );
  }

  private async batchInsertPlayers(client: pg.PoolClient, processed: ProcessedMatch[]): Promise<void> {
    const allPlayers = processed.flatMap(m => m.players);
    if (allPlayers.length === 0) return;
    const cols = 12;
    const placeholders: string[] = [];
    const values: unknown[] = [];
    for (let i = 0; i < allPlayers.length; i++) {
      const off = i * cols;
      placeholders.push(`(${Array.from({ length: cols }, (_, j) => `$${off + j + 1}`).join(',')}, NOW())`);
      const p = allPlayers[i];
      values.push(
        p.matchId, p.profileId, p.civId, p.civName,
        p.teamId, p.colorId, p.resultType, p.oldRating,
        p.newRating, p.playerName, p.matchUrl, p.matchUrlSize,
      );
    }
    await client.query(
      `INSERT INTO match_player (match_id, profile_id, civilization_id, civilization_name,
       team_id, color_id, result_type, old_rating, new_rating, player_name,
       matchurl, matchurl_size, updated_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (match_id, profile_id) DO UPDATE SET
         civilization_id = EXCLUDED.civilization_id, civilization_name = EXCLUDED.civilization_name,
         team_id = EXCLUDED.team_id, color_id = EXCLUDED.color_id,
         result_type = EXCLUDED.result_type, old_rating = EXCLUDED.old_rating,
         new_rating = EXCLUDED.new_rating, player_name = EXCLUDED.player_name,
         matchurl = EXCLUDED.matchurl, matchurl_size = EXCLUDED.matchurl_size,
         updated_at = NOW()`,
      values,
    );
  }

  private async batchUpdateCollectionState(
    client: pg.PoolClient,
    profileIds: number[],
    lastMatchTimes: Map<number, number>,
  ): Promise<void> {
    const entries = profileIds
      .map(pid => ({ pid, time: lastMatchTimes.get(pid) }))
      .filter((e): e is { pid: number; time: number } => e.time !== undefined);
    if (entries.length === 0) return;

    const placeholders: string[] = [];
    const values: unknown[] = [];
    for (let i = 0; i < entries.length; i++) {
      const off = i * 2;
      placeholders.push(`($${off + 1}, $${off + 2}, NOW())`);
      values.push(entries[i].pid, new Date(entries[i].time * 1000));
    }
    await client.query(
      `INSERT INTO collection_state (profile_id, last_match_time, last_fetched_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT (profile_id) DO UPDATE SET
         last_match_time = EXCLUDED.last_match_time, last_fetched_at = NOW()`,
      values,
    );
  }

  /**
   * Fallback: insert matches one at a time with SAVEPOINTs for isolation.
   */
  private async perMatchInsert(client: pg.PoolClient, processed: ProcessedMatch[]): Promise<number> {
    let count = 0;
    for (let i = 0; i < processed.length; i++) {
      const m = processed[i];
      const sp = `sp_${i}`;
      try {
        await client.query(`SAVEPOINT ${sp}`);
        await this.batchInsertMatches(client, [m]);
        await this.batchInsertPlayers(client, [m]);
        await client.query(`RELEASE SAVEPOINT ${sp}`);
        count++;
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        log.error({ err: (err as Error).message, matchId: m.matchId }, 'Failed to upsert match');
      }
    }
    return count;
  }
}
