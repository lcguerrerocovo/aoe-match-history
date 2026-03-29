import { log, getMatchDbPool } from './config';
import { handleRawMatchHistory } from './matchHandlers';
import { processReplayForMatch } from './replayService';
import { analysisTracker } from './analysisTracker';
import type { HandlerResponse } from './types';

async function processRecentMatches(profileId: string): Promise<void> {
  log.info({ profileId }, 'Starting batch analysis');

  const historyResult = await handleRawMatchHistory(profileId);
  const matches = historyResult.data?.matchHistoryStats || [];
  if (!matches.length) {
    log.info({ profileId }, 'No matches found for batch analysis');
    return;
  }

  // Batch check which matches already have APM via PostgreSQL
  const matchIds = matches.map(m => String(m.id));
  const alreadyProcessed = new Set<string>();

  const pool = getMatchDbPool();
  if (pool) {
    try {
      const result = await pool.query<{ match_id: string }>(
        'SELECT match_id::text FROM match WHERE match_id = ANY($1) AND has_apm = TRUE',
        [matchIds.map(Number)]
      );
      for (const row of result.rows) {
        alreadyProcessed.add(row.match_id);
      }
    } catch (err) {
      log.warn({ err: (err as Error).message }, 'Batch has_apm check failed, falling back to process all');
    }
  }

  for (const rawMatch of matches) {
    const matchId = String(rawMatch.id);

    // Skip if already has APM
    if (alreadyProcessed.has(matchId)) {
      log.debug({ matchId }, 'Match already has APM, skipping');
      continue;
    }

    // Skip if already in-flight
    if (analysisTracker.isInFlight(matchId)) {
      log.debug({ matchId }, 'Match already in-flight, skipping');
      continue;
    }

    // Extract player IDs from raw match data (no handleMatch call needed)
    const playerIds = (rawMatch.matchhistoryreportresults || [])
      .map(r => String(r.profile_id))
      .filter(Boolean);

    if (!playerIds.length) continue;

    // Try to process replay for each player (skip availability check — just try downloading)
    let foundReplay = false;
    for (const pid of playerIds) {
      analysisTracker.markInFlight(matchId);
      try {
        const success = await processReplayForMatch(matchId, pid);
        if (success) {
          log.info({ matchId, profileId: pid }, 'Batch: replay processed successfully');
          foundReplay = true;
          break;
        }
      } catch (err) {
        log.warn({ matchId, pid, err: (err as Error).message }, 'Replay processing failed for player');
      } finally {
        analysisTracker.markDone(matchId);
      }
    }

    // Stop condition: no player in this match had a replay
    if (!foundReplay) {
      log.info({ matchId, profileId }, 'No replays found for match — stopping batch');
      break;
    }
  }

  log.info({ profileId }, 'Batch analysis complete');
}

export async function handleBatchAnalysis(profileId: string): Promise<HandlerResponse<{ started: boolean }>> {
  // Fire-and-forget — don't block the response
  processRecentMatches(profileId).catch(err => {
    log.error({ profileId, err: (err as Error).message }, 'Batch analysis failed');
  });

  return {
    data: { started: true },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  };
}
