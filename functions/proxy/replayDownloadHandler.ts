import { log, getFirestoreClient, SIMULATE_LATENCY_MS, sleep } from './config';
import { invokeExternalAPM, aoeMsLimiter, invokeExternalAPMWithBase64 } from './replayService';
import { handleMatch } from './matchHandlers';
import type { HandlerResponse } from './types';

interface ReplayDownloadResult {
  downloaded: boolean;
  error?: string;
  profileId?: string;
}

export async function handleReplayDownload(gameId: string, profileId: string, replayData?: string): Promise<HandlerResponse<ReplayDownloadResult>> {
  try {
    // Inject artificial latency for UI spinner demonstration
    if (SIMULATE_LATENCY_MS > 0) {
      await sleep(SIMULATE_LATENCY_MS);
    }

    // If replay data is provided by the client, skip aoe.ms download
    if (replayData) {
      // Validate base64 by decoding and checking round-trip length.
      // Buffer.from silently ignores invalid chars, so we verify the decoded
      // length matches what valid base64 of this input length should produce.
      const decoded = Buffer.from(replayData, 'base64');
      const expectedLen = Math.floor((replayData.replace(/=+$/, '').length * 3) / 4);
      if (decoded.length !== expectedLen) {
        return {
          data: { downloaded: false, error: 'Invalid replay data' },
          headers: { 'Cache-Control': 'private, max-age=0', 'Vary': 'Accept-Encoding' }
        };
      }

      if (decoded.length > 10 * 1024 * 1024) {
        return {
          data: { downloaded: false, error: 'Replay data too large' },
          headers: { 'Cache-Control': 'private, max-age=0', 'Vary': 'Accept-Encoding' }
        };
      }

      log.info({ gameId, profileId, size: decoded.length }, 'Processing client-provided replay data');

      const apmData = await invokeExternalAPMWithBase64(replayData, gameId, profileId);
      const apmSuccess = apmData !== null && !apmData.error;

      if (apmSuccess) {
        try {
          const db = getFirestoreClient();
          if (db) {
            const matchRef = db.collection('matches').doc(String(gameId));
            await matchRef.set({ apm: apmData }, { merge: true });
          }
        } catch (persistErr) {
          log.warn({ err: (persistErr as Error).message, gameId }, 'Failed to persist APM data');
        }
      }

      log.info({ gameId, profileId, apmSuccess }, 'Client-provided replay processed');
      return {
        data: {
          downloaded: apmSuccess,
          profileId,
          ...(!apmSuccess && apmData?.error ? { error: 'Replay could not be parsed' } : {})
        },
        headers: { 'Cache-Control': 'private, max-age=0', 'Vary': 'Accept-Encoding' }
      };
    }

    // Get match data to extract all player IDs
    const matchData = await handleMatch(gameId);
    if (!matchData.data || !matchData.data.players) {
      log.warn({ gameId }, 'No match data or players found for replay download');
      return {
        data: { downloaded: false, error: 'No match data found' },
        headers: {
          'Cache-Control': 'private, max-age=0',
          'Vary': 'Accept-Encoding'
        }
      };
    }

    // Extract all player IDs
    const playerIds = matchData.data.players.map(p => p.user_id?.toString()).filter(Boolean);
    log.info({ gameId, playerIds }, 'Attempting replay download for all players');

    // Try each player until we find one with available replay
    for (const pid of playerIds) {
      try {
        const url = `https://aoe.ms/replay/?gameId=${gameId}&profileId=${pid}`;
        log.info({ gameId, profileId: pid, url }, 'Fetching replay file');

        let response: Response | undefined;
        const maxRetries = 3;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (attempt > 0) {
            const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            log.info({ gameId, profileId: pid, attempt, delay }, 'Retrying replay download after backoff');
            await sleep(delay);
          }

          response = await aoeMsLimiter.run(() => fetch(url, {
            headers: {
              'Accept': 'application/octet-stream',
              'User-Agent': 'aoe2-site'
            }
          }));

          // Log response headers & status
          const respHeaders: Record<string, string> = {};
          response.headers.forEach((v, k) => { respHeaders[k] = v; });
          log.info({ gameId, profileId: pid, status: response.status, headers: respHeaders }, 'Replay fetch response');

          if (response.status !== 429) break;
          log.warn({ gameId, profileId: pid, attempt }, 'Replay download rate limited, retrying...');
        }

        if (response!.ok) {
          const buffer = await response!.arrayBuffer();
          const apmData = await invokeExternalAPM(buffer, gameId, pid);
          const apmSuccess = apmData !== null && !apmData.error;

          if (apmSuccess) {
            try {
              const db = getFirestoreClient();
              if (db) {
                const matchRef = db.collection('matches').doc(String(gameId));
                await matchRef.set({ apm: apmData }, { merge: true });
              }
            } catch (persistErr) {
              log.warn({ err: (persistErr as Error).message, gameId }, 'Failed to persist APM data');
            }
          }

          log.info({ gameId, profileId: pid, size: buffer.byteLength, apmSuccess }, 'Replay downloaded and APM processed');
          return {
            data: {
              downloaded: apmSuccess,
              profileId: pid,
              ...(!apmSuccess && apmData?.error ? { error: 'Replay could not be parsed' } : {})
            },
            headers: { 'Cache-Control': 'private, max-age=0', 'Vary': 'Accept-Encoding' }
          };
        }

        // Read small portion of body for debugging
        let bodySnippet = '';
        try {
          const text = await response!.text();
          bodySnippet = text.slice(0, 200);
        } catch {
          bodySnippet = '<non-text body>';
        }
        log.warn({ gameId, profileId: pid, status: response!.status, body: bodySnippet }, 'Replay download failed for player, trying next');
      } catch (error) {
        log.warn({ error: (error as Error).message, gameId, profileId: pid }, 'Replay download error for player, trying next');
      }
    }

    // If we get here, no player had a successful replay download
    log.warn({ gameId, playerIds }, 'Replay download failed for all players');
    return {
      data: { downloaded: false, error: 'No replay available for any player' },
      headers: {
        'Cache-Control': 'private, max-age=0',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    log.error({ error: (error as Error).message, gameId, profileId }, 'Replay download error');
    return {
      data: { downloaded: false, error: (error as Error).message },
      headers: {
        'Cache-Control': 'private, max-age=0',
        'Vary': 'Accept-Encoding'
      }
    };
  }
}
