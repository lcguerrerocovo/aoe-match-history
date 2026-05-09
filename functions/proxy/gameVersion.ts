import { logger } from './config';

const log = logger.child({ module: 'GameVersion' });

const STEAM_RSS_URL = 'https://store.steampowered.com/feeds/news/app/813780/';
const FALLBACK_VERSION = 175278;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cachedVersion: number | null = null;
let cacheTimestamp = 0;
let consecutiveEmpties = 0;

async function fetchVersionFromSteam(): Promise<number | null> {
    try {
        const response = await fetch(STEAM_RSS_URL, {
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            log.warn({ status: response.status }, 'Steam RSS fetch failed');
            return null;
        }
        const xml = await response.text();
        // Scan entire feed for version numbers: "Update NNNNNN", "Patch NNNNNN", etc.
        // Minor/hotfix updates sometimes only appear inside a description body,
        // not in their own <title>, so we take the highest version found.
        const matches = [...xml.matchAll(/(?:Update|Patch|Hotfix)\s+(\d{5,})/gi)];
        if (matches.length === 0) {
            log.warn('No update version found in Steam RSS feed');
            return null;
        }
        const version = Math.max(...matches.map(m => parseInt(m[1], 10)));
        log.info({ version, candidates: matches.length }, 'Resolved game version from Steam RSS');
        return version;
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to fetch Steam RSS');
        return null;
    }
}

export async function getGameVersion(): Promise<number> {
    const now = Date.now();
    if (cachedVersion && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedVersion;
    }

    const version = await fetchVersionFromSteam();
    if (version) {
        cachedVersion = version;
        cacheTimestamp = now;
        return version;
    }

    if (cachedVersion) {
        log.warn({ cachedVersion }, 'Using stale cached version');
        return cachedVersion;
    }

    log.warn({ fallback: FALLBACK_VERSION }, 'Using fallback version');
    return FALLBACK_VERSION;
}

/**
 * Called by the live match handler when the Relic API returns 0 matches.
 * After 3 consecutive empty responses, forces an RSS re-fetch on the next call
 * to pick up version changes the cache might be masking.
 */
export function reportEmptyResults(): void {
    consecutiveEmpties++;
    if (consecutiveEmpties >= 3 && cachedVersion) {
        log.warn(
            { consecutiveEmpties, staleCachedVersion: cachedVersion },
            'Multiple empty responses — invalidating cached game version',
        );
        cacheTimestamp = 0;
        consecutiveEmpties = 0;
    }
}

export function reportNonEmptyResults(): void {
    consecutiveEmpties = 0;
}
