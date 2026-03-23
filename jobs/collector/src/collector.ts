import pino from 'pino';
import { scanAllLeaderboards, fetchMatchHistory } from './api.js';
import { getCivMap, getMapMap } from './mappings.js';
import { Database } from './db.js';

const log = pino({ name: 'match-collector' });

const BATCH_SIZE = 10;
const CONCURRENCY = parseInt(process.env.COLLECTOR_CONCURRENCY || '5', 10);

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

    // Step 5: Concurrent batch fetch and store
    let totalMatches = 0;
    let totalErrors = 0;
    let completedBatches = 0;
    const totalBatches = Math.ceil(changedProfiles.length / BATCH_SIZE);

    log.info({ totalBatches, concurrency: CONCURRENCY }, 'Starting concurrent collection');

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

          // Build lastMatchTimes map for this batch
          const batchLastMatchTimes = new Map<number, number>();
          for (const pid of batchProfileIds) {
            const t = leaderboardProfiles.get(pid);
            if (t !== undefined) batchLastMatchTimes.set(pid, t);
          }

          const matchStats = response.matchHistoryStats || [];
          const count = await this.db.upsertMatches(
            matchStats,
            response.profiles || [],
            batchProfileIds,
            batchLastMatchTimes,
            civMap,
            mapMap,
          );
          totalMatches += count;
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

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const rate = Math.round((changedProfiles.length) / (elapsed / 60));
    log.info({
      elapsed: `${elapsed}s`,
      profilesScanned: leaderboardProfiles.size,
      profilesChanged: changedProfiles.length,
      matchesStored: totalMatches,
      batchErrors: totalErrors,
      profilesPerMin: rate,
    }, 'Collection complete');
  }
}
