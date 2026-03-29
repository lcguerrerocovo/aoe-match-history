import { log, APM_API_URL, getFirestoreClient, getMatchDbPool } from './config';
import { createLimiter } from './concurrencyLimiter';
import type { Firestore } from '@google-cloud/firestore';
import type { ApmStatus, ApmData } from './types';

// Limit concurrent requests to aoe.ms to avoid 429s
export const aoeMsLimiter = createLimiter(2);

export async function checkReplayAvailability(gameId: string, profileId: string): Promise<boolean> {
  const maxRetries = 1;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      const replayUrl = `https://aoe.ms/replay/?gameId=${gameId}&profileId=${profileId}`;

      // Backoff between retries (2s, 4s) — longer delays since limiter already throttles
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount - 1)));
      }

      const response = await aoeMsLimiter.run(() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        return fetch(replayUrl, {
          method: 'GET',
          signal: controller.signal
        }).finally(() => clearTimeout(timeout));
      });

      // Handle rate limiting
      if (response.status === 429) {
        retryCount++;
        log.warn({ gameId, profileId, retryCount }, 'Rate limited, retrying...');
        continue;
      }

      // Only mark as unavailable if we get a clear 404/410/405 or "Match not found" response
      if (response.status === 404 || response.status === 410 || response.status === 405) {
        return false;
      }

      // For successful responses, check if content contains "Match not found"
      if (response.ok) {
        try {
          const responseText = await response.text();
          if (responseText.includes('Match not found')) {
            return false;
          }
          return true;
        } catch {
          return true;
        }
      }

      // For any other response, assume available
      return true;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        retryCount++;
        log.debug({ gameId, profileId, retryCount }, 'Request timeout, retrying...');
        if (retryCount <= maxRetries) {
          continue;
        }
        // Timeout exhausted — assume available (show silver) so user can try manually.
        return true;
      }

      retryCount++;
      log.debug({ error: (error as Error).message, gameId, profileId, retryCount }, 'Request failed, retrying...');

      if (retryCount > maxRetries) {
        log.debug({ gameId, profileId }, 'All retries failed - assuming available');
        return true;
      }
    }
  }

  return true;
}

interface CheckApmStatusDeps {
  getFirestoreClient?: () => Firestore;
  checkReplayAvailability?: (gameId: string, profileId: string) => Promise<boolean>;
}

export async function checkApmStatus(gameId: string, profileId: string, {
  getFirestoreClient: getFirestoreClientArg,
  checkReplayAvailability: checkReplayAvailabilityArg
}: CheckApmStatusDeps = {}): Promise<ApmStatus> {
  const getFirestoreClientFn = getFirestoreClientArg || getFirestoreClient;
  const checkReplayAvailabilityFn = checkReplayAvailabilityArg || checkReplayAvailability;
  try {
    // First check if APM data already exists in Firestore
    const db = getFirestoreClientFn();
    if (db) {
      const matchRef = db.collection('matches').doc(String(gameId));
      const matchDoc = await matchRef.get();
      if (matchDoc.exists) {
        const docData = matchDoc.data();
        // Check for the actual APM data (either nested or direct)
        const apmData = (docData as Record<string, unknown>)?.apm as Record<string, unknown> | undefined;
        const apmInner = apmData?.apm as ApmData | undefined || apmData as ApmData | undefined;
        if (apmInner && (apmInner as ApmData).players) {
          // APM data exists - return bronze state (processed)
          return {
            hasSaveGame: true,
            isProcessed: true,
            state: 'bronzeStatus'
          };
        }
      }
    }
    // If no APM data exists, check if save game is available
    const hasSaveGame = await checkReplayAvailabilityFn(gameId, profileId);
    if (hasSaveGame) {
      // Save game exists but not processed - return silver state
      return {
        hasSaveGame: true,
        isProcessed: false,
        state: 'silverStatus'
      };
    } else {
      // No save game and no processing - return grey state
      return {
        hasSaveGame: false,
        isProcessed: false,
        state: 'greyStatus'
      };
    }
  } catch (error) {
    log.error({ error: (error as Error).message, gameId, profileId }, 'APM status check error');
    return {
      hasSaveGame: false,
      isProcessed: false,
      state: 'greyStatus'
    };
  }
}

function safeJsonParse(str: string): unknown | null {
  try { return JSON.parse(str); } catch { return null; }
}

export async function invokeExternalAPM(buffer: ArrayBuffer, gameId: string, profileId: string): Promise<Record<string, unknown> | null> {
  if (!APM_API_URL) return null;
  try {
    // Send the replay data as base64 so the APM function doesn't need to re-download
    const base64Data = Buffer.from(buffer).toString('base64');
    const resp = await fetch(APM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, profileId, replayData: base64Data })
    });

    const responseText = await resp.text();

    if (!resp.ok) {
      log.warn({ status: resp.status, body: responseText }, 'APM service responded non-OK');
      return { error: `APM ${resp.status}`, body: safeJsonParse(responseText) || responseText };
    }

    return (safeJsonParse(responseText) as Record<string, unknown>) || { raw: responseText };
  } catch (e) {
    log.error({ err: (e as Error).message }, 'Failed to call APM service');
    return { error: (e as Error).message };
  }
}

export async function invokeExternalAPMWithBase64(base64Data: string, gameId: string, profileId: string): Promise<Record<string, unknown> | null> {
  if (!APM_API_URL) return null;
  try {
    const resp = await fetch(APM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, profileId, replayData: base64Data })
    });

    const responseText = await resp.text();

    if (!resp.ok) {
      log.warn({ status: resp.status, body: responseText }, 'APM service responded non-OK');
      return { error: `APM ${resp.status}`, body: safeJsonParse(responseText) || responseText };
    }

    return (safeJsonParse(responseText) as Record<string, unknown>) || { raw: responseText };
  } catch (e) {
    log.error({ err: (e as Error).message }, 'Failed to call APM service');
    return { error: (e as Error).message };
  }
}

/**
 * Download and process a replay for a specific match+player.
 * Persists APM data to Firestore and marks has_apm in PostgreSQL.
 * Returns true if replay was successfully processed.
 */
export async function processReplayForMatch(gameId: string, profileId: string): Promise<boolean> {
  const url = `https://aoe.ms/replay/?gameId=${gameId}&profileId=${profileId}`;

  let response: Response | undefined;
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }

    try {
      response = await aoeMsLimiter.run(() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        return fetch(url, {
          headers: { 'Accept': 'application/octet-stream', 'User-Agent': 'aoe2-site' },
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));
      });
    } catch (err) {
      log.debug({ gameId, profileId, attempt, err: (err as Error).message }, 'Replay fetch error');
      if (attempt === maxRetries) return false;
      continue;
    }

    if (response.status !== 429) break;
    log.warn({ gameId, profileId, attempt }, 'Rate limited on replay download, retrying');
  }

  if (!response || !response.ok) {
    return false;
  }

  const buffer = await response.arrayBuffer();
  const apmData = await invokeExternalAPM(buffer, gameId, profileId);
  const apmSuccess = apmData !== null && !apmData.error;

  if (apmSuccess) {
    // Persist to Firestore
    try {
      const db = getFirestoreClient();
      if (db) {
        await db.collection('matches').doc(String(gameId)).set({ apm: apmData }, { merge: true });
        log.info({ gameId, profileId }, 'APM data persisted to Firestore');
      }
    } catch (persistErr) {
      log.warn({ err: (persistErr as Error).message, gameId }, 'Failed to persist APM data to Firestore');
    }

    // Also mark has_apm in PostgreSQL for match list queries (fire-and-forget)
    const pool = getMatchDbPool();
    if (pool) {
      pool.query('UPDATE match SET has_apm = TRUE WHERE match_id = $1', [gameId])
        .catch((dbErr: Error) => log.warn({ gameId, err: dbErr.message }, 'Failed to update has_apm in PostgreSQL'));
    }
  }

  return apmSuccess;
}

export { safeJsonParse };
