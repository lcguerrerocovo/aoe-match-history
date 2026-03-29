import { log, getFirestoreClient } from './config';
import { handleRawMatchHistory } from './matchHandlers';
import { processReplayForMatch } from './replayService';
import { analysisTracker } from './analysisTracker';
import type { HandlerResponse } from './types';

const DEBOUNCE_MS = 10 * 60 * 1000; // 10 minutes
const lastBatchTrigger = new Map<string, number>();

// Exported for tests
export function _resetDebounce(): void {
  lastBatchTrigger.clear();
}

export async function handleBatchAnalysis(profileId: string): Promise<HandlerResponse<{ accepted: boolean; debounced?: boolean }>> {
  const noCache = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  // Server-side debounce
  const lastTrigger = lastBatchTrigger.get(profileId);
  if (lastTrigger && Date.now() - lastTrigger < DEBOUNCE_MS) {
    log.debug({ profileId }, 'Batch analysis debounced');
    return { data: { accepted: true, debounced: true }, headers: noCache };
  }
  lastBatchTrigger.set(profileId, Date.now());

  // Fire-and-forget
  processRecentMatches(profileId).catch(err => {
    log.error({ profileId, err: (err as Error).message }, 'Batch analysis failed');
  });

  return { data: { accepted: true }, headers: noCache };
}

async function processRecentMatches(profileId: string): Promise<void> {
  log.info({ profileId }, 'Starting batch analysis');

  const historyResult = await handleRawMatchHistory(profileId);
  const matches = historyResult.data?.matchHistoryStats || [];
  if (!matches.length) {
    log.info({ profileId }, 'No matches found for batch analysis');
    return;
  }

  // Check Firestore for existing analysis or known no-replay
  const matchIds = matches.map(m => String(m.id));
  const skipIds = new Set<string>();

  const db = getFirestoreClient();
  if (db) {
    try {
      const refs = matchIds.map(id => db.collection('matches').doc(id));
      const docs = await db.getAll(...refs);
      for (const doc of docs) {
        if (doc.exists) {
          const data = doc.data();
          if (data?.apm || data?.noReplay) {
            skipIds.add(doc.id);
          }
        }
      }
    } catch (err) {
      log.warn({ err: (err as Error).message }, 'Firestore batch check failed, processing all');
    }
  }

  // Build work list
  const workList: { matchId: string; playerIds: string[] }[] = [];
  for (const rawMatch of matches) {
    const matchId = String(rawMatch.id);
    if (skipIds.has(matchId)) continue;
    if (analysisTracker.isInFlight(matchId)) continue;

    const playerIds = (rawMatch.matchhistoryreportresults || [])
      .map(r => String(r.profile_id))
      .filter(Boolean);
    if (playerIds.length) workList.push({ matchId, playerIds });
  }

  if (!workList.length) {
    log.info({ profileId }, 'No matches need processing');
    return;
  }

  const processed = new Set<string>();

  // Pass 1: try profile owner
  for (const { matchId, playerIds } of workList) {
    if (!playerIds.includes(profileId)) continue;

    analysisTracker.markInFlight(matchId);
    try {
      const result = await processReplayForMatch(matchId, profileId);
      if (result === 'success') {
        processed.add(matchId);
        log.info({ matchId, profileId }, 'Batch pass 1: processed');
      } else if (result === 'rate_limited') {
        log.warn({ matchId }, 'Batch: rate limited, continuing');
      }
    } catch (err) {
      log.warn({ matchId, err: (err as Error).message }, 'Batch pass 1 failed');
    } finally {
      analysisTracker.markDone(matchId);
    }
  }

  // Pass 2: try one other player for unprocessed matches
  for (const { matchId, playerIds } of workList) {
    if (processed.has(matchId)) continue;

    const otherPlayer = playerIds.find(id => id !== profileId);
    if (!otherPlayer) continue;

    analysisTracker.markInFlight(matchId);
    try {
      const result = await processReplayForMatch(matchId, otherPlayer);
      if (result === 'success') {
        processed.add(matchId);
        log.info({ matchId, profileId: otherPlayer }, 'Batch pass 2: processed');
      }
    } catch (err) {
      log.warn({ matchId, err: (err as Error).message }, 'Batch pass 2 failed');
    } finally {
      analysisTracker.markDone(matchId);
    }
  }

  // Mark unprocessed matches as noReplay in Firestore
  if (db) {
    const noReplayIds = workList
      .filter(({ matchId }) => !processed.has(matchId))
      .map(({ matchId }) => matchId);

    for (const matchId of noReplayIds) {
      try {
        await db.collection('matches').doc(matchId).set({ noReplay: true }, { merge: true });
      } catch (err) {
        log.warn({ matchId, err: (err as Error).message }, 'Failed to mark noReplay');
      }
    }

    if (noReplayIds.length) {
      log.info({ profileId, noReplay: noReplayIds.length }, 'Marked matches as noReplay');
    }
  }

  log.info({ profileId, processed: processed.size, total: workList.length }, 'Batch analysis complete');
}
