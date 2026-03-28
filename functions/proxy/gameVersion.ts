import { logger } from './config';

const log = logger.child({ module: 'GameVersion' });

const STEAM_RSS_URL = 'https://store.steampowered.com/feeds/news/app/813780/';
const FALLBACK_VERSION = 170934;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cachedVersion: number | null = null;
let cacheTimestamp = 0;

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
        // Match <title>...Update NNNNNN...</title> — grab the first (most recent) one
        const match = xml.match(/<title>[^<]*Update\s+(\d+)[^<]*<\/title>/i);
        if (!match) {
            log.warn('No update version found in Steam RSS feed');
            return null;
        }
        const version = parseInt(match[1], 10);
        log.info({ version }, 'Resolved game version from Steam RSS');
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

    // Use cached value even if stale, or fall back to hardcoded
    if (cachedVersion) {
        log.warn({ cachedVersion }, 'Using stale cached version');
        return cachedVersion;
    }

    log.warn({ fallback: FALLBACK_VERSION }, 'Using fallback version');
    return FALLBACK_VERSION;
}
