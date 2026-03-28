import { logger, getMatchDbPool } from './config';
import { withAuthRetry, getAuthenticatedPlayerService } from './authService';
import { getGameVersion } from './gameVersion';
import { getCivMap, getGameType } from './matchProcessing';
import type { HandlerResponse, LiveMatch, LiveMatchPlayer } from './types';

const log = logger.child({ module: 'LiveMatches' });

const PAGE_SIZE = 200;
const MAX_PAGES = 5; // 1000 matches max
const CACHE_TTL_MS = 25_000; // serve cached results for 25s (UI polls every 30s)

let cachedResponse: { data: LiveMatch[]; timestamp: number } | null = null;
let pendingFetch: Promise<LiveMatch[]> | null = null;

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

/**
 * Fetch the most recent ELO rating for each profile_id from PostgreSQL.
 * Returns a map of profile_id → rating. Gracefully returns empty map if DB unavailable.
 */
async function fetchPlayerRatings(profileIds: number[]): Promise<Map<number, number>> {
    const pool = getMatchDbPool();
    if (!pool || profileIds.length === 0) return new Map();

    const BATCH_SIZE = 500;
    const ratings = new Map<number, number>();

    try {
        // Run batched queries in parallel to reduce latency over SSH tunnel
        const batches: number[][] = [];
        for (let i = 0; i < profileIds.length; i += BATCH_SIZE) {
            batches.push(profileIds.slice(i, i + BATCH_SIZE));
        }

        // match_id is sequential (higher = more recent), so we can avoid
        // the expensive JOIN on match.start_time and use match_id instead
        const results = await Promise.all(batches.map(batch =>
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

        for (const result of results) {
            for (const row of result.rows) {
                ratings.set(Number(row.profile_id), row.new_rating);
            }
        }

        log.info({ found: ratings.size, requested: profileIds.length, batches: batches.length }, 'Fetched player ratings from DB');
        return ratings;
    } catch (err) {
        log.warn({ error: (err as Error).message }, 'Failed to fetch player ratings from DB');
        return ratings; // return partial results
    }
}

/**
 * Fetch all live matches with pagination, normalize, and enrich with ELO ratings.
 * Results are cached in memory and concurrent requests are coalesced.
 */
async function fetchAllLiveMatches(): Promise<LiveMatch[]> {
    const gameVersion = await getGameVersion();
    log.info({ gameVersion }, 'Fetching all live matches (paginated)');

    const allRawMatches: unknown[][] = [];
    const seenMatchIds = new Set<number>();
    const seenPlayerIds = new Set<number>();
    const allRawPlayers: unknown[][] = [];
    let page = 0;

    while (page < MAX_PAGES) {
        const start = page * PAGE_SIZE;
        const result = await withAuthRetry(async () => {
            const svc = await getAuthenticatedPlayerService();
            return svc.findObservableAdvertisements(gameVersion, PAGE_SIZE, start);
        });

        if (!result.success || !result.data) {
            if (page === 0) {
                log.warn({ error: result.error }, 'Failed to fetch live matches');
                return [];
            }
            log.warn({ error: result.error, page }, 'Failed to fetch page, using partial results');
            break;
        }

        const { matches: pageMatches, players: pagePlayers } = result.data;

        // Deduplicate matches by match_id across pages
        for (const m of pageMatches) {
            const mid = m[0] as number;
            if (!seenMatchIds.has(mid)) {
                seenMatchIds.add(mid);
                allRawMatches.push(m);
            }
        }

        for (const p of pagePlayers) {
            const pid = p[1] as number;
            if (!seenPlayerIds.has(pid)) {
                seenPlayerIds.add(pid);
                allRawPlayers.push(p);
            }
        }

        log.info({ page, pageMatches: pageMatches.length, totalSoFar: allRawMatches.length }, 'Fetched live matches page');

        if (pageMatches.length < PAGE_SIZE) break;
        page++;
    }

    const matches = await normalizeMatches(allRawMatches, allRawPlayers);

    // Enrich players with ELO ratings from PostgreSQL
    const allProfileIds = [...new Set(matches.flatMap(m => m.players.map(p => p.profile_id)))];
    const ratings = await fetchPlayerRatings(allProfileIds);
    for (const match of matches) {
        for (const player of match.players) {
            const rating = ratings.get(player.profile_id);
            if (rating != null) player.rating = rating;
        }
    }

    log.info({ matchCount: matches.length, pages: page + 1 }, 'Live matches normalized');
    return matches;
}

/**
 * Get cached live matches, fetching fresh data if cache is stale.
 * Concurrent requests share the same in-flight fetch.
 */
async function getCachedLiveMatches(): Promise<LiveMatch[]> {
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL_MS) {
        log.debug({ age: Date.now() - cachedResponse.timestamp, matchCount: cachedResponse.data.length }, 'Serving cached live matches');
        return cachedResponse.data;
    }

    // Coalesce concurrent requests — share the same in-flight fetch
    if (!pendingFetch) {
        pendingFetch = fetchAllLiveMatches()
            .then(data => {
                cachedResponse = { data, timestamp: Date.now() };
                return data;
            })
            .finally(() => { pendingFetch = null; });
    }

    return pendingFetch;
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

    const headers = {
        'Cache-Control': 'public, max-age=30',
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
    const matches = await getCachedLiveMatches();
    return { data: matches, headers };
}
