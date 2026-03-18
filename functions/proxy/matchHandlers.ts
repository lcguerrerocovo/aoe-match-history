import { log, getFirestoreClient } from './config';
import { processMatch } from './matchProcessing';
import type { HandlerResponse, RawMatchHistoryResponse, RawMatch, RawProfile, ProcessedMatch } from './types';

// Pure API call - just fetch and cache raw data
export async function handleRawMatchHistory(profileId: string): Promise<HandlerResponse<RawMatchHistoryResponse>> {
  const targetUrl = `https://aoe-api.worldsedgelink.com/community/leaderboard/getRecentMatchHistory/?title=age2&profile_ids=["${profileId}"]`;
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'aoe2-site'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json() as RawMatchHistoryResponse;

    // Save raw individual matches to Firebase with profiles data
    if (data.matchHistoryStats && data.matchHistoryStats.length > 0) {
      const db = getFirestoreClient();

      // Sort matches by start time (most recent first)
      const sortedMatches = [...data.matchHistoryStats].sort((a, b) => b.startgametime - a.startgametime);

      // Process matches in background with smart batching
      setImmediate(async () => {
        try {
          log.debug({ profileId, totalMatches: sortedMatches.length }, 'Starting smart async match storage');

          // Process in smaller batches of 5 matches at a time
          const BATCH_SIZE = 5;
          const DELAY_BETWEEN_BATCHES = 100;

          for (let i = 0; i < sortedMatches.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const currentBatch = sortedMatches.slice(i, i + BATCH_SIZE);

            currentBatch.forEach(match => {
              if (match.id) {
                try {
                  const matchRef = db.collection('matches').doc(match.id.toString());
                  const matchData = {
                    raw: match,
                    profiles: data.profiles,
                    updated: new Date().toISOString()
                  };

                  batch.set(matchRef, matchData, { merge: true });
                } catch (error) {
                  log.error({ error: (error as Error).message, matchId: match.id }, 'Error adding match to batch');
                }
              }
            });

            // Commit this batch
            await batch.commit();
            log.debug({
              profileId,
              batchNumber: Math.floor(i / BATCH_SIZE) + 1,
              totalBatches: Math.ceil(sortedMatches.length / BATCH_SIZE),
              matchesInBatch: currentBatch.length
            }, 'Batch committed successfully');

            // Small delay between batches to avoid overwhelming Firebase
            if (i + BATCH_SIZE < sortedMatches.length) {
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
          }

          log.info({ profileId, totalMatches: sortedMatches.length }, 'All matches stored successfully');
        } catch (error) {
          log.error({
            error: (error as Error).message,
            stack: (error as Error).stack,
            profileId
          }, 'Failed to save raw matches to Firebase (smart async)');
        }
      });

      log.debug('Smart storage queued for background processing');
    }

    return {
      data,
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    throw error;
  }
}

// Transformation route - fetch raw data and process
export async function handleMatchHistory(profileId: string): Promise<HandlerResponse<{ id: string; name: string; matches: ProcessedMatch[] }>> {
  try {
    // Always fetch fresh raw data and store individual matches
    log.info({ profileId }, 'Fetching raw match history');
    const rawResult = await handleRawMatchHistory(profileId);
    const data = rawResult.data;

    // Process matches from raw data
    const processedMatches = await Promise.all(
      data.matchHistoryStats.map(match => processMatch(match, data.profiles))
    );

    // Get profile info
    const profile = data.profiles.find(p => p.profile_id.toString() === profileId);
    const processedData = {
      id: profileId,
      name: profile?.alias || profileId,
      matches: processedMatches.sort((a, b) => b.start_time.localeCompare(a.start_time))
    };

    return {
      data: processedData,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    throw error;
  }
}

export async function handlePersonalStats(profileId: string): Promise<HandlerResponse<unknown>> {
  const targetUrl = `https://aoe-api.worldsedgelink.com/community/leaderboard/GetPersonalStat?title=age2&profile_ids=["${profileId}"]`;
  const response = await fetch(targetUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  if (!response.ok) {
    await response.text();
    throw new Error(`API responded with status ${response.status}`);
  }
  const data = await response.json();
  return {
    data,
    headers: {
      'Cache-Control': 'public, max-age=60',
      'Vary': 'Accept-Encoding'
    }
  };
}

// Raw match - just return cached raw data
export async function handleRawMatch(matchId: string): Promise<HandlerResponse<unknown>> {
  try {
    const db = getFirestoreClient();
    const matchRef = db.collection('matches').doc(matchId.toString());
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      throw new Error('Match not found');
    }

    const matchData = matchDoc.data()!;

    return {
      data: matchData.raw || matchData,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    throw error;
  }
}

// Processed match - apply transformation to cached raw data
export async function handleMatch(matchId: string): Promise<HandlerResponse<ProcessedMatch>> {
  try {
    log.info({ matchId, docId: matchId.toString() }, 'Attempting to load match');
    const db = getFirestoreClient();
    const matchRef = db.collection('matches').doc(matchId.toString());
    const matchDoc = await matchRef.get();
    log.info({ matchId, exists: matchDoc.exists }, 'Match document check');
    // Use stored data
    const docData = matchDoc.data()!;
    const rawMatch = docData.raw || docData;
    const profiles = docData.profiles || [];

    const processedMatch = await processMatch(rawMatch, profiles);

    // Attach APM data if available in Firestore doc
    const storedApm = docData ? docData.apm : undefined;
    log.info({ storedApm }, 'Stored APM data');
    if (storedApm) {
      // If storedApm has a nested 'apm' field, use that, otherwise use the whole object
      processedMatch.apm = storedApm.apm || storedApm;
    }

    return {
      data: processedMatch,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
  } catch (error) {
    throw error;
  }
}
