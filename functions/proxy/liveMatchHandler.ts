import { logger, getMatchDbPool } from './config';
import { withAuthRetry, getAuthenticatedPlayerService } from './authService';
import { getGameVersion } from './gameVersion';
import { getCivMap, getGameType } from './matchProcessing';
import type { HandlerResponse, LiveMatch, LiveMatchPlayer } from './types';

const log = logger.child({ module: 'LiveMatches' });

const PAGE_SIZE = 200;
const FAST_PAGES = 2; // return after 2 pages (~400 matches) for fast initial render
const MAX_PAGES = 10; // fetch up to 2000 matches in background
const CACHE_TTL_MS = 25_000; // fresh: serve immediately
const CACHE_STALE_TTL_MS = 60_000; // stale: serve while revalidating in background

let cachedResponse: { data: LiveMatch[]; timestamp: number; partial: boolean; generation: number } | null = null;
let pendingFetch: Promise<LiveMatch[]> | null = null;
let pendingBackgroundPages: Promise<void> | null = null;
let fetchGeneration = 0;

/**
 * Clean a raw map filename into a display name.
 * "Arabia.rms" → "Arabia", "Black_Forest.rms" → "Black Forest",
 * "megarandom.rms2" → "Megarandom", "my map" → "My Map"
 */
function cleanMapName(raw: string): string {
    return raw
        .replace(/\.rms2?$/i, '')  // strip .rms / .rms2 extension
        .replace(/_/g, ' ')        // underscores to spaces
        .replace(/\b\w/g, c => c.toUpperCase()); // title case
}

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
            const rawMapName = (m[8] as string) || '';
            const startTime = m[21] as number;
            const serverName = (m[23] as string) || '';
            const numPlayers = (m[11] as number) || 0;
            const matchTypeId = (m[13] as number) || 0;

            const mapDisplayName = cleanMapName(rawMapName) || 'Unknown Map';
            const gameType = getGameType(matchTypeId) || `Type ${matchTypeId}`;

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
                        rating: null, // populated from DB below
                        civ: civName,
                        team: teamId,
                        steam_id: playerInfo?.steam_id,
                    });
                }
            }

            // Group players into teams
            const teamMap = new Map<number, LiveMatchPlayer[]>();
            for (const player of matchPlayers) {
                if (!teamMap.has(player.team)) {
                    teamMap.set(player.team, []);
                }
                teamMap.get(player.team)!.push(player);
            }
            const teams = Array.from(teamMap.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([, v]) => v);

            matches.push({
                match_id: matchId,
                map: mapDisplayName,
                map_id: 0, // live API provides filenames, not IDs
                matchtype_id: matchTypeId,
                game_type: gameType,
                num_players: numPlayers || matchPlayers.length,
                start_time: startTime,
                server: serverName,
                teams,
                players: matchPlayers,
            });
        } catch (err) {
            log.warn({ error: (err as Error).message, matchIndex: i }, 'Failed to normalize match, skipping');
        }
    }

    return matches;
}

// In-memory rating cache: profile_id → { rating, timestamp }
const ratingCache = new Map<number, { rating: number; ts: number }>();
const RATING_CACHE_TTL_MS = 90_000; // 90s — ratings only change when a match finishes

/**
 * Fetch the most recent ELO rating for each profile_id from PostgreSQL.
 * Uses an in-memory per-player cache to avoid repeated DB queries.
 * Returns a map of profile_id → rating. Gracefully returns empty map if DB unavailable.
 */
async function fetchPlayerRatings(profileIds: number[]): Promise<Map<number, number>> {
    const pool = getMatchDbPool();
    if (!pool || profileIds.length === 0) return new Map();

    const now = Date.now();
    const results = new Map<number, number>();
    const uncached: number[] = [];

    for (const id of profileIds) {
        const entry = ratingCache.get(id);
        if (entry && now - entry.ts < RATING_CACHE_TTL_MS) {
            results.set(id, entry.rating);
        } else {
            uncached.push(id);
        }
    }

    if (uncached.length === 0) {
        log.info({ cached: results.size, total: profileIds.length }, 'All ratings served from cache');
        return results;
    }

    const BATCH_SIZE = 500;

    try {
        const batches: number[][] = [];
        for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
            batches.push(uncached.slice(i, i + BATCH_SIZE));
        }

        const dbResults = await Promise.all(batches.map(batch =>
            pool.query<{ profile_id: string; new_rating: number }>(
                `SELECT DISTINCT ON (profile_id)
                        profile_id, new_rating
                 FROM match_player
                 WHERE profile_id = ANY($1)
                   AND new_rating IS NOT NULL
                   AND new_rating > 0
                 ORDER BY profile_id, match_id DESC`,
                [batch],
            ),
        ));

        for (const result of dbResults) {
            for (const row of result.rows) {
                const id = Number(row.profile_id);
                results.set(id, row.new_rating);
                ratingCache.set(id, { rating: row.new_rating, ts: now });
            }
        }

        log.info({ found: results.size, fromCache: profileIds.length - uncached.length, fromDb: uncached.length, batches: batches.length }, 'Fetched player ratings');
        return results;
    } catch (err) {
        log.warn({ error: (err as Error).message }, 'Failed to fetch player ratings from DB');
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
 */
async function fetchAllLiveMatches(): Promise<LiveMatch[]> {
    const myGeneration = ++fetchGeneration;
    const gameVersion = await getGameVersion();
    log.info({ gameVersion, generation: myGeneration }, 'Fetching live matches (fast phase)');

    const seenMatchIds = new Set<number>();
    const seenPlayerIds = new Set<number>();

    // Phase 1: fast pages
    const fast = await fetchPages(gameVersion, 0, FAST_PAGES, seenMatchIds, seenPlayerIds);
    const fastMatches = await normalizeMatches(fast.matches, fast.players);

    log.info({ matchCount: fastMatches.length, pages: fast.lastPage + 1, exhausted: fast.exhausted }, 'Fast phase complete');

    // If the fast pages didn't fill up, there are no more matches — done
    if (fast.exhausted) {
        return fastMatches;
    }

    // Phase 2: fetch remaining pages in the background, merge into cache
    if (!pendingBackgroundPages) {
        pendingBackgroundPages = (async () => {
            try {
                const remaining = await fetchPages(gameVersion, FAST_PAGES, MAX_PAGES, seenMatchIds, seenPlayerIds);
                if (remaining.matches.length === 0) return;

                const remainingMatches = await normalizeMatches(remaining.matches, remaining.players);
                const fullData = [...fastMatches, ...remainingMatches];

                // Only update cache if no newer fetch cycle has started
                if (myGeneration === fetchGeneration) {
                    cachedResponse = { data: fullData, timestamp: Date.now(), partial: false, generation: myGeneration };
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
            } finally {
                pendingBackgroundPages = null;
            }
        })();
    }

    return fastMatches;
}

/**
 * Get cached live matches, fetching fresh data if cache is stale.
 * Concurrent requests share the same in-flight fetch.
 */
async function getCachedLiveMatches(): Promise<{ matches: LiveMatch[]; partial: boolean }> {
    const now = Date.now();
    const age = cachedResponse ? now - cachedResponse.timestamp : Infinity;

    // Fresh cache — serve immediately
    if (cachedResponse && age < CACHE_TTL_MS) {
        log.debug({ age, matchCount: cachedResponse.data.length, partial: cachedResponse.partial }, 'Serving cached live matches');
        return { matches: cachedResponse.data, partial: cachedResponse.partial };
    }

    // Stale cache — serve immediately but trigger background refresh
    if (cachedResponse && age < CACHE_STALE_TTL_MS) {
        log.debug({ age, matchCount: cachedResponse.data.length }, 'Serving stale live matches, refreshing in background');
        if (!pendingFetch) {
            pendingFetch = fetchAllLiveMatches()
                .then(data => {
                    if (data.length > 0) {
                        cachedResponse = { data, timestamp: Date.now(), partial: !!pendingBackgroundPages, generation: fetchGeneration };
                    }
                    return data;
                })
                .catch(err => {
                    log.warn({ error: (err as Error).message }, 'Background live matches refresh failed');
                    return cachedResponse?.data ?? [];
                })
                .finally(() => { pendingFetch = null; });
        }
        return { matches: cachedResponse.data, partial: cachedResponse.partial };
    }

    // No cache or expired — must wait for fresh data
    if (!pendingFetch) {
        pendingFetch = fetchAllLiveMatches()
            .then(data => {
                if (data.length > 0) {
                    cachedResponse = { data, timestamp: Date.now(), partial: !!pendingBackgroundPages, generation: fetchGeneration };
                }
                return data;
            })
            .finally(() => { pendingFetch = null; });
    }

    const matches = await pendingFetch;
    return { matches, partial: cachedResponse?.partial ?? false };
}

export async function handleLiveRatings(queryStringOrBody?: string | { profile_ids?: number[] }): Promise<HandlerResponse<Record<string, number>>> {
    const profileIds: number[] = [];

    if (typeof queryStringOrBody === 'object' && queryStringOrBody?.profile_ids) {
        // POST body: { profile_ids: [123, 456, ...] }
        profileIds.push(...queryStringOrBody.profile_ids.filter(id => typeof id === 'number' && id > 0));
    } else if (typeof queryStringOrBody === 'string') {
        // GET query string fallback
        const params = new URLSearchParams(queryStringOrBody.replace(/^\?/, ''));
        const raw = params.get('profile_ids');
        if (raw) {
            profileIds.push(...raw.split(',').map(Number).filter(id => !isNaN(id) && id > 0));
        }
    }

    if (profileIds.length === 0 || profileIds.length > 5000) {
        return {
            data: {},
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        };
    }

    const ratings = await fetchPlayerRatings(profileIds);

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
        const allProfileIds = [...new Set(matches.flatMap(m => m.players.map(p => p.profile_id)))];
        const ratings = await fetchPlayerRatings(allProfileIds);
        for (const match of matches) {
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

    // Short CDN TTL for empty responses — they're likely transient Relic API blips
    if (matches.length === 0) {
        headers['Cache-Control'] = 'public, s-maxage=5, max-age=3';
    }

    if (partial) {
        headers['X-Partial'] = '1';
    }

    return { data: matches, headers };
}
