import { logger, getMatchDbPool } from './config';
import { withAuthRetry, getAuthenticatedPlayerService } from './authService';
import { getGameVersion, reportEmptyResults, reportNonEmptyResults } from './gameVersion';
import { getCivMap, getGameType, getMapMap, resolveMap } from './matchProcessing';
import { decodeOptions, decodeSlotInfo } from './decoders';
import type { HandlerResponse, LiveMatch, LiveMatchPlayer } from './types';

const log = logger.child({ module: 'LiveMatches' });

const PAGE_SIZE = 200;
const FAST_PAGES = 5; // return after 5 pages (~1000 matches) for fast initial render
const MAX_PAGES = 15; // fetch up to 3000 matches in background
const CACHE_TTL_MS = 25_000; // fresh: serve immediately
const CACHE_STALE_TTL_MS = 60_000; // stale: serve while revalidating in background

interface CacheEntry {
    data: LiveMatch[];
    timestamp: number;
    generation: number;
    phase: 'fast' | 'complete';
}

interface FetchResult {
    matches: LiveMatch[];
    exhausted: boolean;
}

let cache: CacheEntry | null = null;
let pendingFetch: Promise<FetchResult> | null = null;
let fetchGeneration = 0;


/**
 * Normalize the positional array response from findObservableAdvertisements
 * into typed LiveMatch objects.
 *
 * The response format is [statusCode, matches[][], players[][]].
 * Field positions verified against real API responses (2026-03-28).
 */
async function normalizeMatches(
    rawMatches: unknown[][],
    rawPlayers: unknown[][],
): Promise<LiveMatch[]> {
    const civMap = await getCivMap();
    const mapMap = await getMapMap();

    // Build player lookup by profile_id from the players array.
    // Player array positions:
    // [0]=rank, [1]=profile_id, [2]=platform_user_id (e.g. "/steam/765..."),
    // [3]=avatar, [4]=name, [5]=clan_tag, [6]=statgroup_id, [7]=total_games,
    // [8]=unknown, [9]=unknown, [10]=unknown, [11]=steam_id, [12]=platform_id, [13]=aliases
    //
    // NOTE: [7] is total games played, NOT ELO rating (verified 2026-03-28 by
    // cross-referencing with getPersonalStat). Ratings are fetched from PostgreSQL.
    const playerMap = new Map<number, {
        name: string;
        steam_id?: string;
    }>();

    for (const p of rawPlayers) {
        const profileId = p[1] as number;
        playerMap.set(profileId, {
            name: (p[4] as string) || `Player ${profileId}`,
            steam_id: p[11] != null ? String(p[11]) : undefined,
        });
    }

    // Match array positions (verified):
    // [0]=match_id, [1]=big_id, [2]=lobby_id_str, [3]=leader_profile_id,
    // [4]=game_type (always 1 for standard), [5]=lobby_name, [6]=match_name,
    // [7]=has_password, [8]=map_filename (e.g. "Arabia.rms"), [9]=compressed_data,
    // [10]=rating_type, [11]=num_players, [12]=compressed_player_summary,
    // [13]=matchtype_id (maps to getGameType: 6=RM1v1, 7/8/9=RMTeam, 26=EW1v1, etc.),
    // [14]=player_roster (nested arrays), [15]=ranked_flag,
    // [16]=unknown, [17]=unknown, [18]=unknown, [19]=unknown, [20]=unknown,
    // [21]=start_time (unix seconds), [22]=server_code, [23]=server_name
    //
    // Roster entry format: [match_id, profile_id, unknown, statgroup_id, civ_id, team_id, ip_address]

    const matches: LiveMatch[] = [];

    for (let i = 0; i < rawMatches.length; i++) {
        const m = rawMatches[i];
        try {
            const matchId = m[0] as number;
            const rawOptions = (m[9] as string) || '';
            const startTime = m[21] as number;
            const serverName = (m[23] as string) || '';
            const numPlayers = (m[11] as number) || 0;
            const matchTypeId = (m[13] as number) || 0;

            let mapDisplayName = 'Unknown Map';
            let mapId = 0;
            try {
                const options = decodeOptions(rawOptions);
                const resolved = resolveMap(mapMap, { options });
                if (resolved.name) mapDisplayName = resolved.name;
                if (resolved.id) mapId = resolved.id;
            } catch {
                // Options decode can fail for some matches
            }
            const gameType = getGameType(matchTypeId) || `Type ${matchTypeId}`;

            // Decode slot info from compressed player summary for color assignments
            const colorMap = new Map<number, number>();
            try {
                const slotInfo = decodeSlotInfo((m[12] as string) || '') as Array<{
                    'profileInfo.id': number;
                    metaData?: { colorId?: number | null } | null;
                }>;
                for (const slot of slotInfo) {
                    const colorId = (slot.metaData as { colorId?: number | null } | null)?.colorId;
                    if (colorId != null) {
                        colorMap.set(slot['profileInfo.id'], colorId);
                    }
                }
            } catch {
                // Slot info decode can fail — colors will default to 0
            }

            // Extract players from the roster
            // Each entry: [match_id, profile_id, unknown, statgroup_id, civ_id, team_id, ip]
            const roster = m[14];
            const matchPlayers: LiveMatchPlayer[] = [];

            if (Array.isArray(roster)) {
                for (const entry of roster) {
                    if (!Array.isArray(entry) || entry.length < 6) continue;

                    const profileId = entry[1] as number;
                    const civId = entry[4] as number;
                    const teamId = entry[5] as number;

                    const playerInfo = playerMap.get(profileId);
                    const civName = civMap[String(civId)] || civId;

                    matchPlayers.push({
                        name: playerInfo?.name || `Player ${profileId}`,
                        profile_id: profileId,
                        rating: null,
                        civ: civName,
                        team: teamId,
                        color_id: colorMap.get(profileId) ?? 0,
                        steam_id: playerInfo?.steam_id,
                    });
                }
            }

            matches.push({
                match_id: matchId,
                map: mapDisplayName,
                map_id: mapId,
                matchtype_id: matchTypeId,
                game_type: gameType,
                num_players: numPlayers || matchPlayers.length,
                start_time: startTime,
                server: serverName,
                players: matchPlayers,
            });
        } catch (err) {
            log.warn({ error: (err as Error).message, matchIndex: i }, 'Failed to normalize match, skipping');
        }
    }

    matches.sort((a, b) => b.start_time - a.start_time);
    return matches;
}

// In-memory rating cache: "profileId" or "profileId:matchTypeIds" → { rating (null = known miss), timestamp }
const ratingCache = new Map<string, { rating: number | null; ts: number }>();
const RATING_CACHE_TTL_MS = 90_000; // 90s — ratings only change when a match finishes

/**
 * Fetch the most recent ELO rating for each profile_id from PostgreSQL.
 * Uses an in-memory per-player cache to avoid repeated DB queries.
 * When matchTypeIds is provided, only considers ratings from those match types
 * (e.g. [6] for 1v1, [7,8,9] for team) to avoid showing TG rating in a 1v1 match.
 * Returns a map of profile_id → rating. Gracefully returns empty map if DB unavailable.
 */
async function fetchPlayerRatings(profileIds: number[], matchTypeIds?: number[]): Promise<Map<number, number>> {
    const pool = getMatchDbPool();
    if (!pool || profileIds.length === 0) return new Map();

    const now = Date.now();
    const results = new Map<number, number>();
    const uncached: number[] = [];
    const cacheKeySuffix = matchTypeIds ? `:${matchTypeIds.join(',')}` : '';

    for (const id of profileIds) {
        const entry = ratingCache.get(`${id}${cacheKeySuffix}`);
        if (entry && now - entry.ts < RATING_CACHE_TTL_MS) {
            if (entry.rating !== null) results.set(id, entry.rating);
        } else {
            uncached.push(id);
        }
    }

    if (uncached.length === 0) {
        log.info({ cached: results.size, total: profileIds.length }, 'All ratings served from cache');
        return results;
    }

    const BATCH_SIZE = 5000;

    try {
        const batches: number[][] = [];
        for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
            batches.push(uncached.slice(i, i + BATCH_SIZE));
        }

        const query = matchTypeIds
            ? `SELECT p.profile_id, m.new_rating
               FROM unnest($1::int[]) AS p(profile_id)
               CROSS JOIN LATERAL (
                   SELECT mp.new_rating
                   FROM match_player mp
                   JOIN match mt ON mt.match_id = mp.match_id
                   WHERE mp.profile_id = p.profile_id
                     AND mp.new_rating IS NOT NULL
                     AND mp.new_rating > 0
                     AND mt.match_type_id = ANY($2)
                   ORDER BY mp.match_id DESC
                   LIMIT 1
               ) m`
            : `SELECT p.profile_id, m.new_rating
               FROM unnest($1::int[]) AS p(profile_id)
               CROSS JOIN LATERAL (
                   SELECT new_rating
                   FROM match_player mp
                   WHERE mp.profile_id = p.profile_id
                     AND mp.new_rating IS NOT NULL
                     AND mp.new_rating > 0
                   ORDER BY mp.match_id DESC
                   LIMIT 1
               ) m`;

        const dbResults = await Promise.all(batches.map(batch =>
            pool.query<{ profile_id: string; new_rating: number }>(
                query,
                matchTypeIds ? [batch, matchTypeIds] : [batch],
            ),
        ));

        const foundIds = new Set<number>();
        for (const result of dbResults) {
            for (const row of result.rows) {
                const id = Number(row.profile_id);
                results.set(id, row.new_rating);
                ratingCache.set(`${id}${cacheKeySuffix}`, { rating: row.new_rating, ts: now });
                foundIds.add(id);
            }
        }

        // Cache misses so we don't re-query players with no match history
        for (const id of uncached) {
            if (!foundIds.has(id)) {
                ratingCache.set(`${id}${cacheKeySuffix}`, { rating: null, ts: now });
            }
        }

        log.info({ found: results.size, misses: uncached.length - foundIds.size, fromCache: profileIds.length - uncached.length, fromDb: uncached.length, batches: batches.length }, 'Fetched player ratings');
        return results;
    } catch (err) {
        log.warn({ error: (err as Error).message, stack: (err as Error).stack }, 'Failed to fetch player ratings from DB');
        return results; // return cached + partial DB results
    }
}

/**
 * Fetch pages from the Relic API, deduplicating matches and players.
 * Returns { matches, players, lastPage, exhausted } where exhausted=true
 * means the last page was partial (no more data).
 */
async function fetchPages(
    gameVersion: number,
    startPage: number,
    maxPage: number,
    seenMatchIds: Set<number>,
    seenPlayerIds: Set<number>,
): Promise<{ matches: unknown[][]; players: unknown[][]; lastPage: number; exhausted: boolean }> {
    const rawMatches: unknown[][] = [];
    const rawPlayers: unknown[][] = [];
    let page = startPage;

    while (page < maxPage) {
        const start = page * PAGE_SIZE;
        const result = await withAuthRetry(async () => {
            const svc = await getAuthenticatedPlayerService();
            return svc.findObservableAdvertisements(gameVersion, PAGE_SIZE, start);
        });

        if (!result.success || !result.data) {
            if (page === startPage && startPage === 0) {
                log.warn({ error: result.error }, 'Failed to fetch live matches');
                return { matches: [], players: [], lastPage: page, exhausted: true };
            }
            log.warn({ error: result.error, page }, 'Failed to fetch page, using partial results');
            break;
        }

        const { matches: pageMatches, players: pagePlayers } = result.data;

        for (const m of pageMatches) {
            const mid = m[0] as number;
            if (!seenMatchIds.has(mid)) {
                seenMatchIds.add(mid);
                rawMatches.push(m);
            }
        }

        for (const p of pagePlayers) {
            const pid = p[1] as number;
            if (!seenPlayerIds.has(pid)) {
                seenPlayerIds.add(pid);
                rawPlayers.push(p);
            }
        }

        log.info({ page, pageMatches: pageMatches.length, totalSoFar: rawMatches.length }, 'Fetched live matches page');

        if (pageMatches.length < PAGE_SIZE) {
            return { matches: rawMatches, players: rawPlayers, lastPage: page, exhausted: true };
        }
        page++;
    }

    return { matches: rawMatches, players: rawPlayers, lastPage: page - 1, exhausted: false };
}

/**
 * Fetch live matches in two phases:
 * 1. Fast phase: first FAST_PAGES pages (~400 matches) — returned immediately
 * 2. Background phase: remaining pages fetched async, merged into cache silently
 *    so the next refresh cycle serves the full dataset
 *
 * Returns { matches, exhausted } so the caller knows whether background pages
 * were started. The background phase writes directly to cache with phase: 'complete'.
 */
async function fetchAllLiveMatches(): Promise<FetchResult> {
    const myGeneration = ++fetchGeneration;
    const gameVersion = await getGameVersion();
    log.info({ gameVersion, generation: myGeneration }, 'Fetching live matches (fast phase)');

    const seenMatchIds = new Set<number>();
    const seenPlayerIds = new Set<number>();

    // Phase 1: fast pages
    const fast = await fetchPages(gameVersion, 0, FAST_PAGES, seenMatchIds, seenPlayerIds);
    const fastMatches = await normalizeMatches(fast.matches, fast.players);

    log.info({ matchCount: fastMatches.length, pages: fast.lastPage + 1, exhausted: fast.exhausted }, 'Fast phase complete');

    if (fastMatches.length === 0) {
        reportEmptyResults();
    } else {
        reportNonEmptyResults();
    }

    // If the fast pages didn't fill up, there are no more matches — done
    if (fast.exhausted) {
        return { matches: fastMatches, exhausted: true };
    }

    // Phase 2: fetch remaining pages in the background, merge into cache
    // Always start background fetch — generation counter prevents stale writes
    (async () => {
        try {
            const remaining = await fetchPages(gameVersion, FAST_PAGES, MAX_PAGES, seenMatchIds, seenPlayerIds);
            if (remaining.matches.length === 0) return;

            const remainingMatches = await normalizeMatches(remaining.matches, remaining.players);
            const fullData = [...fastMatches, ...remainingMatches];

            // Only update cache if no newer fetch cycle has started
            if (myGeneration === fetchGeneration) {
                cache = { data: fullData, timestamp: Date.now(), phase: 'complete', generation: myGeneration };
                log.info({
                    fastCount: fastMatches.length,
                    remainingCount: remainingMatches.length,
                    totalCount: fullData.length,
                }, 'Background pages merged into cache');
            } else {
                log.info({ myGeneration, currentGeneration: fetchGeneration }, 'Background pages discarded — newer fetch cycle exists');
            }
        } catch (err) {
            log.warn({ error: (err as Error).message }, 'Background page fetch failed');
        }
    })();

    return { matches: fastMatches, exhausted: false };
}

/**
 * Get cached live matches, fetching fresh data if cache is stale.
 * Concurrent requests share the same in-flight fetch.
 *
 * Cache lifecycle per generation:
 *   null → fast (immediate) → complete (background)
 * A newer generation resets to fast. complete → fast is impossible.
 */
async function getCachedLiveMatches(): Promise<{ matches: LiveMatch[]; partial: boolean }> {
    const now = Date.now();
    const age = cache ? now - cache.timestamp : Infinity;

    // Fresh cache — serve immediately
    if (cache && age < CACHE_TTL_MS) {
        log.debug({ age, matchCount: cache.data.length, phase: cache.phase }, 'Serving cached live matches');
        return { matches: cache.data, partial: cache.phase === 'fast' };
    }

    // Stale cache — serve immediately but trigger background refresh
    if (cache && age < CACHE_STALE_TTL_MS) {
        log.debug({ age, matchCount: cache.data.length }, 'Serving stale live matches, refreshing in background');
        if (!pendingFetch) {
            pendingFetch = fetchAllLiveMatches()
                .then(result => {
                    // Only write to cache if fast phase got everything (exhausted).
                    // If not exhausted, background pages will write phase: 'complete'
                    // directly to cache when they finish — no need to write fast-phase
                    // partial data over potentially-fuller stale data.
                    if (result.matches.length > 0 && result.exhausted) {
                        cache = { data: result.matches, timestamp: Date.now(), phase: 'complete', generation: fetchGeneration };
                    }
                    return result;
                })
                .catch(err => {
                    log.warn({ error: (err as Error).message }, 'Background live matches refresh failed');
                    return { matches: cache?.data ?? [], exhausted: true } as FetchResult;
                })
                .finally(() => { pendingFetch = null; });
        }
        return { matches: cache.data, partial: cache.phase === 'fast' };
    }

    // No cache or expired — must wait for fresh data
    if (!pendingFetch) {
        pendingFetch = fetchAllLiveMatches()
            .then(result => {
                if (result.matches.length > 0) {
                    // Don't downgrade complete → fast: if we already have more data
                    // from a previous complete fetch, keep it until background finishes
                    if (!result.exhausted && cache && cache.data.length > result.matches.length) {
                        // Update timestamp so the stale path triggers background refresh
                        cache = { ...cache, timestamp: Date.now() };
                    } else {
                        cache = {
                            data: result.matches,
                            timestamp: Date.now(),
                            phase: result.exhausted ? 'complete' : 'fast',
                            generation: fetchGeneration,
                        };
                    }
                }
                return result;
            })
            .finally(() => { pendingFetch = null; });
    }

    const result = await pendingFetch;
    return { matches: cache?.data ?? result.matches, partial: cache?.phase === 'fast' };
}

export async function handleLiveRatings(queryStringOrBody?: string | { profile_ids?: number[]; match_type_ids?: number[] }): Promise<HandlerResponse<Record<string, number>>> {
    const profileIds: number[] = [];
    let matchTypeIds: number[] | undefined;

    if (typeof queryStringOrBody === 'object' && queryStringOrBody?.profile_ids) {
        // POST body: { profile_ids: [123, 456, ...], match_type_ids?: [6] }
        profileIds.push(...queryStringOrBody.profile_ids.filter(id => typeof id === 'number' && id > 0));
        if (queryStringOrBody.match_type_ids?.length) {
            matchTypeIds = queryStringOrBody.match_type_ids.filter(id => typeof id === 'number');
        }
    } else if (typeof queryStringOrBody === 'string') {
        // GET query string fallback
        const params = new URLSearchParams(queryStringOrBody.replace(/^\?/, ''));
        const raw = params.get('profile_ids');
        if (raw) {
            profileIds.push(...raw.split(',').map(Number).filter(id => !isNaN(id) && id > 0));
        }
    }

    if (profileIds.length === 0 || profileIds.length > 20000) {
        return {
            data: {},
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        };
    }

    const ratings = await fetchPlayerRatings(profileIds, matchTypeIds);

    const ratingsObj: Record<string, number> = {};
    ratings.forEach((rating, profileId) => {
        ratingsObj[String(profileId)] = rating;
    });

    return {
        data: ratingsObj,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=60, max-age=30',
        },
    };
}

export async function handleLiveMatches(queryString?: string): Promise<HandlerResponse<LiveMatch[]>> {
    // Parse optional profile_ids filter from query string
    const profileIds: number[] = [];
    if (queryString) {
        const params = new URLSearchParams(queryString.replace(/^\?/, ''));
        const raw = params.get('profile_ids');
        if (raw) {
            for (const id of raw.split(',')) {
                const n = Number(id.trim());
                if (!isNaN(n) && n > 0) profileIds.push(n);
            }
        }
    }

    const headers: Record<string, string> = {
        'Cache-Control': 'public, s-maxage=30, max-age=10',
        'Vary': 'Accept-Encoding',
    };

    // Profile-filtered queries: single API call, no cache
    if (profileIds.length > 0) {
        const gameVersion = await getGameVersion();
        log.info({ gameVersion, profileIds }, 'Fetching live matches for profile');

        const result = await withAuthRetry(async () => {
            const svc = await getAuthenticatedPlayerService();
            return svc.findObservableAdvertisements(gameVersion, PAGE_SIZE, 0, profileIds);
        });

        if (!result.success || !result.data) {
            log.warn({ error: result.error }, 'Failed to fetch live matches for profile');
            return { data: [], headers };
        }

        let matches = await normalizeMatches(result.data.matches, result.data.players);
        for (const match of matches) {
            const matchTypeIds = match.matchtype_id === 6 ? [6] : [7, 8, 9];
            const playerIds = match.players.map(p => p.profile_id);
            const ratings = await fetchPlayerRatings(playerIds, matchTypeIds);
            for (const player of match.players) {
                const rating = ratings.get(player.profile_id);
                if (rating != null) player.rating = rating;
            }
        }

        // Belt-and-suspenders: filter server-side in case Relic ignores profile_ids
        const idSet = new Set(profileIds);
        matches = matches.filter(m => m.players.some(p => idSet.has(p.profile_id)));

        log.info({ matchCount: matches.length }, 'Live matches for profile normalized');
        return { data: matches, headers };
    }

    // Unfiltered: use cached + paginated fetch
    const { matches, partial } = await getCachedLiveMatches();

    // Short CDN TTL for empty or partial responses — complete data is usually
    // available within seconds, so don't let CDN cache stale partial results
    if (matches.length === 0 || partial) {
        headers['Cache-Control'] = 'public, s-maxage=5, max-age=3';
    }

    if (partial) {
        headers['X-Partial'] = '1';
    }

    return { data: matches, headers };
}
