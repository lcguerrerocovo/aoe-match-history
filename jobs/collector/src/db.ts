import pg from 'pg';
import pino from 'pino';
import { decodeOptions, decodeSlotInfo } from './decoders.js';
import type { RawMatch, RawProfile, IdNameMap, PlayerMetadata } from './types.js';

const { Pool } = pg;
const log = pino({ name: 'match-collector' });

export class Database {
  private pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
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
   * Also updates collection_state for the fetched profiles.
   * All within a single transaction.
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
    let upsertedCount = 0;

    try {
      await client.query('BEGIN');

      for (const match of matches) {
        try {
          // Decode options to get map_id
          const options = decodeOptions(match.options);
          const mapIdStr = options['10'];
          const mapId = mapIdStr ? parseInt(mapIdStr, 10) : null;
          const mapName = mapId !== null ? (mapMap[mapId.toString()] || match.mapname) : match.mapname;

          // Decode slotinfo for team/color data
          let slotInfo: Array<{ 'profileInfo.id': number; metaData?: PlayerMetadata | string | null }> = [];
          try {
            slotInfo = decodeSlotInfo(match.slotinfo);
          } catch { /* slotinfo may be missing */ }

          // Compute duration
          const duration = match.completiontime > 0 && match.startgametime > 0
            ? match.completiontime - match.startgametime
            : null;

          // Detect winning team
          const winningTeam = detectWinningTeam(match, slotInfo);

          // Upsert match
          await client.query(
            `INSERT INTO match (match_id, map_id, map_name, match_type_id, start_time, completion_time,
             duration, description, max_players, options, slotinfo, winning_team, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
             ON CONFLICT (match_id) DO UPDATE SET
               map_id = EXCLUDED.map_id,
               map_name = EXCLUDED.map_name,
               options = EXCLUDED.options,
               slotinfo = EXCLUDED.slotinfo,
               winning_team = EXCLUDED.winning_team,
               updated_at = NOW()`,
            [
              match.id,
              mapId,
              mapName,
              match.matchtype_id,
              match.startgametime > 0 ? new Date(match.startgametime * 1000) : null,
              match.completiontime > 0 ? new Date(match.completiontime * 1000) : null,
              duration,
              match.description,
              match.maxplayers,
              options,
              slotInfo.length > 0 ? JSON.stringify(slotInfo) : null,
              winningTeam,
            ]
          );

          // Upsert match_players
          for (const result of match.matchhistoryreportresults) {
            const playerSlot = slotInfo.find(p => p['profileInfo.id'] === result.profile_id);
            const metaData = playerSlot?.metaData as PlayerMetadata | null | undefined;
            const teamId = metaData?.teamId ? parseInt(metaData.teamId) : result.teamid + 1;
            const colorId = metaData?.colorId ?? 0;
            const civName = civMap[result.civilization_id.toString()] || null;

            const ratingEntry = match.matchhistorymember?.find(m => m.profile_id === result.profile_id);
            const profile = profiles.find(p => p.profile_id === result.profile_id);
            const matchUrl = match.matchurls?.find(u => u.profile_id === result.profile_id);

            await client.query(
              `INSERT INTO match_player (match_id, profile_id, civilization_id, civilization_name,
               team_id, color_id, result_type, old_rating, new_rating, player_name,
               matchurl, matchurl_size, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
               ON CONFLICT (match_id, profile_id) DO UPDATE SET
                 civilization_id = EXCLUDED.civilization_id,
                 civilization_name = EXCLUDED.civilization_name,
                 team_id = EXCLUDED.team_id,
                 color_id = EXCLUDED.color_id,
                 result_type = EXCLUDED.result_type,
                 old_rating = EXCLUDED.old_rating,
                 new_rating = EXCLUDED.new_rating,
                 player_name = EXCLUDED.player_name,
                 matchurl = EXCLUDED.matchurl,
                 matchurl_size = EXCLUDED.matchurl_size,
                 updated_at = NOW()`,
              [
                match.id,
                result.profile_id,
                result.civilization_id,
                civName,
                teamId,
                colorId,
                result.resulttype,
                ratingEntry?.oldrating ?? null,
                ratingEntry?.newrating ?? null,
                profile?.alias || profile?.name || null,
                matchUrl?.url || null,
                matchUrl?.size || null,
              ]
            );
          }

          // Upsert match_raw
          await client.query(
            `INSERT INTO match_raw (match_id, raw_json, version, created_at)
             VALUES ($1, $2, 1, NOW())
             ON CONFLICT (match_id) DO UPDATE SET
               raw_json = EXCLUDED.raw_json`,
            [match.id, JSON.stringify(match)]
          );

          upsertedCount++;
        } catch (err) {
          log.error({ err: (err as Error).message, matchId: match.id }, 'Failed to upsert match');
        }
      }

      // Update collection_state for all profiles in this batch
      for (const profileId of profileIds) {
        const lastMatchTime = lastMatchTimes.get(profileId);
        if (lastMatchTime) {
          await client.query(
            `INSERT INTO collection_state (profile_id, last_match_time, last_fetched_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (profile_id) DO UPDATE SET
               last_match_time = EXCLUDED.last_match_time,
               last_fetched_at = NOW()`,
            [profileId, new Date(lastMatchTime * 1000)]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return upsertedCount;
  }
}

/**
 * Detect the winning team number from match results and slot info.
 */
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
