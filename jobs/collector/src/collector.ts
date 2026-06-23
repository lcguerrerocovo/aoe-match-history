import pino from 'pino';
import { scanAllLeaderboards, fetchMatchHistory } from './api.js';
import { getCivMap, getCivMapForDateSync, getMapMap } from './mappings.js';
import { Database, processMatch } from './db.js';
import { RawArchive } from './raw-archive.js';

const log = pino({ name: 'match-collector' });

const BATCH_SIZE = 10;
const CONCURRENCY = parseInt(process.env.COLLECTOR_CONCURRENCY || '5', 10);

export class Collector {
  private db: Database;
  private archiveBucket: string;

  constructor(db: Database, archiveBucket: string) {
    this.db = db;
    this.archiveBucket = archiveBucket;
  }

  async run(): Promise<void> {
    const startTime = Date.now();

    // Step 1: Load civ/map mappings
    log.info('Loading civ/map mappings...');
    const [civMap, mapMap] = await Promise.all([getCivMap(), getMapMap()]);
    log.info({ civs: Object.keys(civMap).length, maps: Object.keys(mapMap).length }, 'Mappings loaded');

    const archive = new RawArchive(this.archiveBucket);

    // Step 2: Scan all ranked leaderboards
    log.info('Scanning ranked leaderboards...');
    const leaderboardProfiles = await scanAllLeaderboards();
    log.info({ totalProfiles: leaderboardProfiles.size }, 'Leaderboard scan complete');

    // Step 3: Get existing collection state (DB-optional — if DB is down, fetch all profiles)
    let dbAvailable = true;
    const allProfileIds = Array.from(leaderboardProfiles.keys());
    const collectionState = new Map<number, number>();

    try {
      log.info('Querying collection state...');
      const STATE_BATCH_SIZE = 5000;
      for (let i = 0; i < allProfileIds.length; i += STATE_BATCH_SIZE) {
        const batch = allProfileIds.slice(i, i + STATE_BATCH_SIZE);
        const batchState = await this.db.getCollectionState(batch);
        for (const [k, v] of batchState) {
          collectionState.set(k, v);
        }
      }
      log.info({ knownProfiles: collectionState.size }, 'Collection state loaded');
    } catch (err) {
      dbAvailable = false;
      log.warn({ err: (err as Error).message }, 'DB unavailable — will fetch all profiles and archive to GCS only');
    }

    // Step 4: Diff — find profiles that need fetching
    let changedProfiles: number[];
    if (dbAvailable) {
      changedProfiles = [];
      for (const [profileId, lastMatchTime] of leaderboardProfiles) {
        const lastFetched = collectionState.get(profileId);
        if (!lastFetched || lastMatchTime > lastFetched) {
          changedProfiles.push(profileId);
        }
      }
      log.info({
        changedProfiles: changedProfiles.length,
        unchangedProfiles: leaderboardProfiles.size - changedProfiles.length,
      }, 'Diff complete');
    } else {
      changedProfiles = allProfileIds;
      log.info({ changedProfiles: changedProfiles.length }, 'DB offline — fetching all leaderboard profiles');
    }

    if (changedProfiles.length === 0) {
      log.info('No profiles need updating. Done.');
      return;
    }

    // Step 5: Concurrent batch fetch and store
    let totalMatches = 0;
    let totalDbStored = 0;
    let totalErrors = 0;
    let completedBatches = 0;
    const totalBatches = Math.ceil(changedProfiles.length / BATCH_SIZE);

    log.info({ totalBatches, concurrency: CONCURRENCY, dbAvailable }, 'Starting concurrent collection');

    // Build all batch slices
    const batches: number[][] = [];
    for (let i = 0; i < changedProfiles.length; i += BATCH_SIZE) {
      batches.push(changedProfiles.slice(i, i + BATCH_SIZE));
    }

    // Process batches with bounded concurrency
    let batchIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        const idx = batchIndex++;
        if (idx >= batches.length) break;
        const batchProfileIds = batches[idx];

        try {
          const response = await fetchMatchHistory(batchProfileIds);

          const matchStats = response.matchHistoryStats || [];
          const profiles = response.profiles || [];

          // Archive raw matches to Parquet (always — independent of DB)
          for (const match of matchStats) {
            const pm = processMatch(match, profiles, getCivMapForDateSync(match.startgametime), mapMap);
            archive.append({
              match_id: pm.matchId,
              map_id: pm.mapId,
              map_name: pm.mapName,
              match_type_id: pm.matchTypeId,
              start_time: pm.startTime,
              completion_time: pm.completionTime,
              duration: pm.duration,
              max_players: pm.maxPlayers,
              player_count: pm.players.length,
              winning_team: pm.winningTeam,
              raw_json: pm.rawJson,
            });
          }
          totalMatches += matchStats.length;

          // Upsert to DB only if available
          if (dbAvailable) {
            try {
              const batchLastMatchTimes = new Map<number, number>();
              for (const pid of batchProfileIds) {
                const t = leaderboardProfiles.get(pid);
                if (t !== undefined) batchLastMatchTimes.set(pid, t);
              }

              const count = await this.db.upsertMatches(
                matchStats,
                profiles,
                batchProfileIds,
                batchLastMatchTimes,
                getCivMapForDateSync,
                mapMap,
              );
              totalDbStored += count;
            } catch (err) {
              log.warn({ err: (err as Error).message, batch: idx + 1 }, 'DB upsert failed — matches archived to GCS');
            }
          }
        } catch (err) {
          totalErrors++;
          log.error({
            err: (err as Error).message,
            batch: idx + 1,
            profileIds: batchProfileIds,
          }, 'Batch failed, skipping');
        }

        completedBatches++;
        if (completedBatches % 100 === 0 || completedBatches === totalBatches) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const rate = Math.round((completedBatches * BATCH_SIZE) / (elapsed / 60));
          log.info({
            batch: completedBatches,
            totalBatches,
            totalMatches,
            dbStored: totalDbStored,
            errors: totalErrors,
            elapsed: `${elapsed}s`,
            profilesPerMin: rate,
          }, 'Progress');
        }
      }
    };

    // Launch concurrent workers
    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    // Upload Parquet archive to GCS
    try {
      await archive.finalize();
    } catch (err) {
      log.error({ err: (err as Error).message }, 'Archive finalization failed');
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rate = Math.round((changedProfiles.length) / (elapsed / 60));
    log.info({
      elapsed: `${elapsed}s`,
      profilesScanned: leaderboardProfiles.size,
      profilesChanged: changedProfiles.length,
      matchesArchived: totalMatches,
      matchesStored: totalDbStored,
      dbAvailable,
      batchErrors: totalErrors,
      profilesPerMin: rate,
    }, 'Collection complete');

    if (dbAvailable && changedProfiles.length > 0 && totalDbStored === 0) {
      log.fatal({ profilesChanged: changedProfiles.length }, 'ALERT: Processed profiles but stored 0 matches');
    }

    if (totalErrors > 0) {
      const errorRate = totalMatches > 0 ? totalErrors / totalMatches : 1;
      if (errorRate > 0.1) {
        log.fatal({ totalErrors, totalMatches, errorRate: `${(errorRate * 100).toFixed(1)}%` }, 'ALERT: Match error rate exceeds 10%');
      }
    }
  }
}
