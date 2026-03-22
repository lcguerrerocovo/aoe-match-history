import { log, getMatchDbPool } from './config';
import { handleRawMatchHistory } from './matchHandlers';
import { processMatch } from './matchProcessing';
import { queryMatchHistory } from './matchHistoryDb';
import type { HandlerResponse, ProcessedMatch } from './types';

interface FullMatchHistoryResponse {
  matches: ProcessedMatch[];
  hasMore: boolean;
}

function parseQueryParams(queryString?: string): { page: number; limit: number } {
  const params = new URLSearchParams(queryString || '');
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '50', 10) || 50));
  return { page, limit };
}

/**
 * Full match history endpoint.
 * Page 1: merges Relic API (fresh) + PostgreSQL (historical), deduplicates.
 * Page 2+: PostgreSQL only (Relic API only has ~10 recent matches per type).
 */
export async function handleFullMatchHistory(
  profileId: string,
  queryString?: string,
): Promise<HandlerResponse<FullMatchHistoryResponse>> {
  const { page, limit } = parseQueryParams(queryString);
  const pool = getMatchDbPool();

  // Fallback: no DATABASE_URL configured — return Relic API matches only
  if (!pool) {
    log.warn('No DATABASE_URL configured, falling back to Relic API only');
    const rawResult = await handleRawMatchHistory(profileId);
    const data = rawResult.data;
    const processedMatches = await Promise.all(
      data.matchHistoryStats.map(match => processMatch(match, data.profiles)),
    );
    return {
      data: {
        matches: processedMatches.sort((a, b) => b.start_time.localeCompare(a.start_time)),
        hasMore: false,
      },
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vary': 'Accept-Encoding',
      },
    };
  }

  if (page === 1) {
    // Parallel fetch: PostgreSQL + Relic API
    const [dbResult, relicResult] = await Promise.all([
      queryMatchHistory(pool, profileId, page, limit),
      handleRawMatchHistory(profileId).then(async rawResult => {
        const data = rawResult.data;
        const processed = await Promise.all(
          data.matchHistoryStats.map(match => processMatch(match, data.profiles)),
        );
        return processed;
      }).catch(err => {
        log.error({ err: (err as Error).message, profileId }, 'Relic API fetch failed, using DB only');
        return [] as ProcessedMatch[];
      }),
    ]);

    // Deduplicate: Relic wins for overlapping match_ids
    const relicMatchIds = new Set(relicResult.map(m => m.match_id));
    const dbOnly = dbResult.matches.filter(m => !relicMatchIds.has(m.match_id));

    // Merge, sort, and paginate
    const merged = [...relicResult, ...dbOnly]
      .sort((a, b) => b.start_time.localeCompare(a.start_time));

    const paginated = merged.slice(0, limit);
    const hasMore = dbResult.hasMore || merged.length > limit;

    return {
      data: { matches: paginated, hasMore },
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vary': 'Accept-Encoding',
      },
    };
  }

  // Page 2+: PostgreSQL only
  const dbResult = await queryMatchHistory(pool, profileId, page, limit);

  return {
    data: dbResult,
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Vary': 'Accept-Encoding',
    },
  };
}
