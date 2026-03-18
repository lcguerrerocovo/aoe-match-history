import { log, STEAM_API_KEY } from './config';
import type { HandlerResponse } from './types';

export async function handleSteamAvatar(steamId: string): Promise<HandlerResponse<{ avatarUrl: string | null }>> {
  log.debug({ steamId }, 'handleSteamAvatar called');
  if (!STEAM_API_KEY) {
    log.error('STEAM_API_KEY environment variable is not set');
    throw new Error('STEAM_API_KEY environment variable is not set');
  }
  const targetUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  log.debug({ targetUrl }, 'Fetching Steam avatar');
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'aoe2-site'
      }
    });
    if (!response.ok) {
      log.warn({ status: response.status, statusText: response.statusText }, 'Steam API returned error for avatar');
      return {
        data: { avatarUrl: null },
        headers: {
          'Cache-Control': 'public, max-age=600',
          'Vary': 'Accept-Encoding'
        }
      };
    }
    const data = await response.json() as { response?: { players?: Array<{ avatarfull?: string }> } };
    log.debug({ data }, 'Steam API response for avatar');
    const avatarUrl = data.response?.players?.[0]?.avatarfull ?? null;
    log.debug({ avatarUrl }, 'Extracted avatarUrl');
    return {
      data: { avatarUrl },
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    log.error({ error: (error as Error).message, stack: (error as Error).stack }, 'Error in handleSteamAvatar');
    return {
      data: { avatarUrl: null },
      headers: {
        'Cache-Control': 'public, max-age=600',
        'Vary': 'Accept-Encoding'
      }
    };
  }
}
