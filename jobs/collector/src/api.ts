import pino from 'pino';
import type { LeaderboardResponse, RawMatchHistoryResponse } from './types.js';

const log = pino({ name: 'match-collector' });

const RELIC_API = 'https://aoe-api.worldsedgelink.com';
const PAGE_SIZE = 200;
const THROTTLE_MS = 1000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(url: string, label: string): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'aoe2-site-collector'
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json() as T;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        log.error({ err, url, label, attempt }, 'Request failed after retries');
        throw err;
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      log.warn({ err: (err as Error).message, label, attempt, delay }, 'Retrying request');
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

export interface ScannedProfile {
  profileId: number;
  lastMatchTime: number; // Unix timestamp
}

/**
 * Scan a single ranked leaderboard, returning all profiles with their last match time.
 * Paginates through all pages at 200 entries per page with 1 req/s throttle.
 */
export async function scanLeaderboard(leaderboardId: number): Promise<ScannedProfile[]> {
  const profiles: ScannedProfile[] = [];
  let start = 1;
  let total = 0;

  log.info({ leaderboardId }, 'Starting leaderboard scan');

  do {
    const url = `${RELIC_API}/community/leaderboard/getLeaderBoard2?title=age2&platform=PC_STEAM&leaderboard_id=${leaderboardId}&start=${start}&count=${PAGE_SIZE}`;

    const data = await fetchWithRetry<LeaderboardResponse>(url, `leaderboard-${leaderboardId}-page-${start}`);

    if (start === 1) {
      total = data.rankTotal;
      log.info({ leaderboardId, total }, 'Leaderboard total entries');
    }

    // Build statgroup_id → profile_id lookup
    const sgToProfile = new Map<number, number>();
    for (const sg of data.statGroups) {
      if (sg.members && sg.members.length > 0) {
        sgToProfile.set(sg.id, sg.members[0].profile_id);
      }
    }

    // Extract profiles with last match times
    for (const entry of data.leaderboardStats) {
      const profileId = sgToProfile.get(entry.statgroup_id);
      if (profileId && entry.lastmatchdate > 0) {
        profiles.push({ profileId, lastMatchTime: entry.lastmatchdate });
      }
    }

    start += PAGE_SIZE;
    await sleep(THROTTLE_MS);
  } while (start <= total);

  log.info({ leaderboardId, profileCount: profiles.length }, 'Leaderboard scan complete');
  return profiles;
}

/**
 * Scan all ranked leaderboards (RM 1v1 + RM Team) and deduplicate.
 * When a profile appears on multiple leaderboards, keep the most recent lastMatchTime.
 */
export async function scanAllLeaderboards(): Promise<Map<number, number>> {
  const leaderboardIds = [3, 4]; // RM 1v1, RM Team
  const combined = new Map<number, number>();

  for (const lbId of leaderboardIds) {
    const profiles = await scanLeaderboard(lbId);
    for (const { profileId, lastMatchTime } of profiles) {
      const existing = combined.get(profileId);
      if (!existing || lastMatchTime > existing) {
        combined.set(profileId, lastMatchTime);
      }
    }
  }

  log.info({ uniqueProfiles: combined.size }, 'All leaderboards scanned and deduplicated');
  return combined;
}

/**
 * Fetch recent match history for a batch of profile IDs (max 10).
 * Uses the unauthenticated community endpoint.
 */
export async function fetchMatchHistory(profileIds: number[]): Promise<RawMatchHistoryResponse> {
  const idsParam = profileIds.map(id => `"${id}"`).join(',');
  const url = `${RELIC_API}/community/leaderboard/getRecentMatchHistory/?title=age2&profile_ids=[${idsParam}]`;

  const data = await fetchWithRetry<RawMatchHistoryResponse>(url, `match-history-batch-${profileIds.length}`);
  return data;
}
