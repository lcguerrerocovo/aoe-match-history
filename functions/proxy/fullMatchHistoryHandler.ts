import { log, getMatchDbPool } from './config';
import { handleRawMatchHistory } from './matchHandlers';
import { processMatch } from './matchProcessing';
import { queryMatchHistory, queryFilterOptions } from './matchHistoryDb';
import type { FilterOptions } from './matchHistoryDb';
import type { HandlerResponse, ProcessedMatch } from './types';

interface FullMatchHistoryResponse {
  matches: ProcessedMatch[];
  hasMore: boolean;
  nextCursor?: string;
  filterOptions?: FilterOptions;
}

function encodeCursor(startTime: string, matchId: number): string {
  return Buffer.from(`${startTime}|${matchId}`).toString('base64');
}

function decodeCursor(cursor: string): { startTime: string; matchId: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString();
    const [startTime, matchId] = decoded.split('|');
    if (!startTime || !matchId) return null;
    return { startTime, matchId };
  } catch {
    return null;
  }
}

interface ParsedParams {
  page: number;
  limit: number;
  cursor: { startTime: string; matchId: string } | null;
  mapName?: string;
  matchTypeIds?: number[];
  sort: 'asc' | 'desc';
}

function parseQueryParams(queryString?: string): ParsedParams {
  const params = new URLSearchParams(queryString || '');
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const hasFilters = !!(params.get('map') || params.get('matchType'));
  const defaultLimit = hasFilters ? 1000 : 50;
  const maxLimit = hasFilters ? 1000 : 100;
  const limit = Math.min(maxLimit, Math.max(1, parseInt(params.get('limit') || String(defaultLimit), 10) || defaultLimit));

  const cursorParam = params.get('cursor');
  const cursor = cursorParam ? decodeCursor(cursorParam) : null;

  const mapParam = params.get('map');
  const mapName = mapParam || undefined;

  // matchType accepts comma-separated IDs (e.g. "7,8,9" for all RM Team variants)
  const matchTypeParam = params.get('matchType');
  let matchTypeIds: number[] | undefined;
  if (matchTypeParam) {
    matchTypeIds = matchTypeParam.split(',').map(Number).filter(n => !isNaN(n));
    if (matchTypeIds.length === 0) matchTypeIds = undefined;
  }

  const sortParam = params.get('sort');
  const sort: 'asc' | 'desc' = sortParam === 'asc' ? 'asc' : 'desc';

  return { page, limit, cursor, mapName, matchTypeIds, sort };
}

/**
 * Full match history endpoint.
 * Page 1 (no filters, no cursor): merges Relic API (fresh) + PostgreSQL (historical), deduplicates.
 * With filters or cursor: PostgreSQL only with cursor-based pagination.
 * Page 2+ (legacy): PostgreSQL only with OFFSET pagination.
 */
export async function handleFullMatchHistory(
  profileId: string,
  queryString?: string,
): Promise<HandlerResponse<FullMatchHistoryResponse>> {
  const { page, limit, cursor, mapName, matchTypeIds, sort } = parseQueryParams(queryString);
  const pool = getMatchDbPool();
  const hasFilters = !!(mapName || matchTypeIds);
  const hasCursor = !!cursor;
  const isFirstRequest = !hasCursor && page === 1;

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

  // DB-only path: filters active or cursor present (page 2+ with cursor)
  if (hasFilters || hasCursor) {
    const dbResultPromise = queryMatchHistory(pool, profileId, page, limit, {
      cursor: cursor || undefined,
      mapName,
      matchTypeIds,
      sort,
    });

    // Include filter options on first request (no cursor)
    const filterOptionsPromise = isFirstRequest
      ? queryFilterOptions(pool, profileId)
      : Promise.resolve(undefined);

    const [dbResult, filterOptions] = await Promise.all([dbResultPromise, filterOptionsPromise]);

    const responseData: FullMatchHistoryResponse = {
      matches: dbResult.matches,
      hasMore: dbResult.hasMore,
    };

    // Compute nextCursor from last match
    if (dbResult.hasMore && dbResult.matches.length > 0) {
      const lastMatch = dbResult.matches[dbResult.matches.length - 1];
      responseData.nextCursor = encodeCursor(lastMatch.start_time, parseInt(lastMatch.match_id, 10));
    }

    if (filterOptions) {
      responseData.filterOptions = filterOptions;
    }

    return {
      data: responseData,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vary': 'Accept-Encoding',
      },
    };
  }

  // Page 1, no filters, no cursor: merge Relic API + DB
  if (page === 1) {
    const [dbResult, relicResult, filterOptions] = await Promise.all([
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
      queryFilterOptions(pool, profileId),
    ]);

    // Deduplicate: Relic wins for overlapping match_ids
    const relicMatchIds = new Set(relicResult.map(m => m.match_id));
    const dbOnly = dbResult.matches.filter(m => !relicMatchIds.has(m.match_id));

    // Merge, sort, and paginate
    const merged = [...relicResult, ...dbOnly]
      .sort((a, b) => b.start_time.localeCompare(a.start_time));

    const paginated = merged.slice(0, limit);
    const hasMore = dbResult.hasMore || merged.length > limit;

    const responseData: FullMatchHistoryResponse = {
      matches: paginated,
      hasMore,
      filterOptions,
    };

    // Compute nextCursor from last match when there are more
    if (hasMore && paginated.length > 0) {
      const lastMatch = paginated[paginated.length - 1];
      responseData.nextCursor = encodeCursor(lastMatch.start_time, parseInt(lastMatch.match_id, 10));
    }

    return {
      data: responseData,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vary': 'Accept-Encoding',
      },
    };
  }

  // Page 2+ (legacy OFFSET pagination, no filters, no cursor)
  const dbResult = await queryMatchHistory(pool, profileId, page, limit);

  return {
    data: dbResult,
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Vary': 'Accept-Encoding',
    },
  };
}
