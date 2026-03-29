import { log, getFirestoreClient } from './config';
import { handleMatch } from './matchHandlers';
import { processReplayForMatch } from './replayService';
import { analysisTracker } from './analysisTracker';
import type { HandlerResponse, ApmData } from './types';

interface MatchAnalysisResponse {
  status: 'complete' | 'processing' | 'unavailable';
  apm?: ApmData;
}

export async function handleMatchAnalysis(matchId: string): Promise<HandlerResponse<MatchAnalysisResponse>> {
  const noCache = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  const matchData = await handleMatch(matchId);
  if (!matchData.data?.players?.length) {
    return { data: { status: 'unavailable' }, headers: noCache };
  }

  const match = matchData.data;

  // If APM data already exists, return it
  if (match.apm?.players && Object.keys(match.apm.players).length) {
    return { data: { status: 'complete', apm: match.apm }, headers: noCache };
  }

  // Check Firestore for noReplay marker
  const db = getFirestoreClient();
  if (db) {
    try {
      const doc = await db.collection('matches').doc(matchId).get();
      if (doc.exists && doc.data()?.noReplay) {
        return { data: { status: 'unavailable' }, headers: noCache };
      }
    } catch (err) {
      log.warn({ matchId, err: (err as Error).message }, 'noReplay check failed');
    }
  }

  // Already being processed by batch or a prior request
  if (analysisTracker.isInFlight(matchId)) {
    return { data: { status: 'processing' }, headers: noCache };
  }

  // Kick off background processing with high priority
  const playerIds = match.players.map(p => String(p.user_id)).filter(Boolean);
  analysisTracker.markInFlight(matchId);

  (async () => {
    try {
      for (const pid of playerIds) {
        const result = await processReplayForMatch(matchId, pid, { priority: true });
        if (result === 'success') {
          log.info({ matchId, profileId: pid }, 'Match analysis: processed');
          return;
        }
        if (result === 'rate_limited') {
          log.warn({ matchId }, 'Match analysis: rate limited');
          return;
        }
      }
      // No player had a replay — mark as noReplay
      log.info({ matchId }, 'Match analysis: no replay found, marking noReplay');
      if (db) {
        await db.collection('matches').doc(matchId).set({ noReplay: true }, { merge: true });
      }
    } catch (err) {
      log.error({ matchId, err: (err as Error).message }, 'Match analysis error');
    } finally {
      analysisTracker.markDone(matchId);
    }
  })();

  return { data: { status: 'processing' }, headers: noCache };
}
