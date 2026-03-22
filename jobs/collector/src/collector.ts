import pino from 'pino';
import { scanAllLeaderboards, fetchMatchHistory } from './api.js';
import { getCivMap, getMapMap } from './mappings.js';
import { Database } from './db.js';

const log = pino({ name: 'match-collector' });

const BATCH_SIZE = 10;
const THROTTLE_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class Collector {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async run(): Promise<void> {
    const startTime = Date.now();

    // Step 1: Load civ/map mappings
    log.info('Loading civ/map mappings...');
    const [civMap, mapMap] = await Promise.all([getCivMap(), getMapMap()]);
    log.info({ civs: Object.keys(civMap).length, maps: Object.keys(mapMap).length }, 'Mappings loaded');

    // Step 2: Scan all ranked leaderboards
    log.info('Scanning ranked leaderboards...');
    const leaderboardProfiles = await scanAllLeaderboards();
    log.info({ totalProfiles: leaderboardProfiles.size }, 'Leaderboard scan complete');

    // Step 3: Get existing collection state
    log.info('Querying collection state...');
    const allProfileIds = Array.from(leaderboardProfiles.keys());

    // Query in batches of 5000 to avoid oversized queries
    const STATE_BATCH_SIZE = 5000;
    const collectionState = new Map<number, number>();
    for (let i = 0; i < allProfileIds.length; i += STATE_BATCH_SIZE) {
      const batch = allProfileIds.slice(i, i + STATE_BATCH_SIZE);
      const batchState = await this.db.getCollectionState(batch);
      for (const [k, v] of batchState) {
        collectionState.set(k, v);
      }
    }
    log.info({ knownProfiles: collectionState.size }, 'Collection state loaded');

    // Step 4: Diff — find profiles that need fetching
    const changedProfiles: number[] = [];
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

    if (changedProfiles.length === 0) {
      log.info('No profiles need updating. Done.');
      return;
    }

    // Step 5: Batch fetch and store match history
    let totalMatches = 0;
    let totalErrors = 0;
    let batchNum = 0;
    const totalBatches = Math.ceil(changedProfiles.length / BATCH_SIZE);

    for (let i = 0; i < changedProfiles.length; i += BATCH_SIZE) {
      batchNum++;
      const batchProfileIds = changedProfiles.slice(i, i + BATCH_SIZE);

      try {
        // Fetch match history for this batch
        const response = await fetchMatchHistory(batchProfileIds);

        if (response.matchHistoryStats && response.matchHistoryStats.length > 0) {
          // Build lastMatchTimes map for this batch
          const batchLastMatchTimes = new Map<number, number>();
          for (const pid of batchProfileIds) {
            const t = leaderboardProfiles.get(pid);
            if (t !== undefined) batchLastMatchTimes.set(pid, t);
          }

          // Upsert matches and update collection state in one transaction
          const count = await this.db.upsertMatches(
            response.matchHistoryStats,
            response.profiles,
            batchProfileIds,
            batchLastMatchTimes,
            civMap,
            mapMap,
          );
          totalMatches += count;

          if (batchNum % 50 === 0 || batchNum === totalBatches) {
            log.info({
              batch: batchNum,
              totalBatches,
              matchesThisBatch: count,
              totalMatches,
            }, 'Batch progress');
          }
        } else {
          // No matches returned — still update collection state so we don't re-fetch
          const batchLastMatchTimes = new Map<number, number>();
          for (const pid of batchProfileIds) {
            const t = leaderboardProfiles.get(pid);
            if (t !== undefined) batchLastMatchTimes.set(pid, t);
          }
          await this.db.upsertMatches([], response.profiles || [], batchProfileIds, batchLastMatchTimes, civMap, mapMap);
        }
      } catch (err) {
        totalErrors++;
        log.error({
          err: (err as Error).message,
          batch: batchNum,
          profileIds: batchProfileIds,
        }, 'Batch failed, skipping');
      }

      // Throttle between batches
      if (i + BATCH_SIZE < changedProfiles.length) {
        await sleep(THROTTLE_MS);
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log.info({
      elapsed: `${elapsed}s`,
      profilesScanned: leaderboardProfiles.size,
      profilesChanged: changedProfiles.length,
      matchesStored: totalMatches,
      batchErrors: totalErrors,
    }, 'Collection complete');
  }
}
