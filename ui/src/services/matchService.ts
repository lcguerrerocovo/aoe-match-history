import type { Match } from '../types/match';
import type { PersonalStats } from '../types/stats';
import type { PlayerSearchResult } from '../components/PlayerSearch';

const API_URL = import.meta.env.VITE_AOE_API_URL!;
const DEFAULT_PROFILE_ID = '4764337';

interface MatchData {
  id: string;
  name: string;
  matches: Match[];
}

// Simple match retrieval - cloud functions return fully processed data
export async function getMatch(matchId: string): Promise<Match> {
  // Add cache-busting parameter to ensure fresh data
  const timestamp = Date.now();
  const response = await fetch(`${API_URL}/match/${matchId}?t=${timestamp}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch match');
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format');
  }
  
  // Cloud functions return processed match data directly
  return await response.json();
}

// Simple match history retrieval - cloud functions return processed data
export async function getMatches(profileId: string = DEFAULT_PROFILE_ID): Promise<MatchData> {
  const response = await fetch(`${API_URL}/match-history/${profileId}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format');
  }
  
  // Cloud functions return processed match data directly
  return await response.json();
}

export interface FullMatchHistoryResponse {
  matches: Match[];
  hasMore: boolean;
}

export async function getFullMatchHistory(
  profileId: string,
  page: number = 1,
  limit: number = 50,
): Promise<FullMatchHistoryResponse> {
  const response = await fetch(
    `${API_URL}/match-history/${profileId}/full?page=${page}&limit=${limit}`,
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'aoe2-site'
      }
    }
  );
  if (!response.ok) {
    throw new Error('Failed to fetch full match history');
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format');
  }
  return await response.json();
}

export async function getPersonalStats(profileId: string): Promise<PersonalStats> {
  const response = await fetch(`${API_URL}/personal-stats/${profileId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch personal stats');
  }
  return response.json();
}

export function extractSteamId(name: string): string | null {
  const match = name.match(/\/steam\/(\d+)/);
  return match ? match[1] : null;
}

export async function getSteamAvatar(steamId: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${API_URL}/steam/avatar/${steamId}`);
    if (!response.ok) {
      console.error('Failed to fetch Steam avatar:', response.status);
      return undefined;
    }
    const data = await response.json();
    return data.avatarUrl;
  } catch (error) {
    console.error('Failed to fetch Steam avatar:', error);
    return undefined;
  }
}

export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  try {
    const response = await fetch(`${API_URL}/player-search?name=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform the response to match our PlayerSearchResult format
    return data.map((player: { id?: number; name: string; matches?: number }) => ({
      id: player.id?.toString(),
      name: player.name,
      matches: player.matches || 0
    }));
  } catch (error) {
    console.error('Player search error:', error);
    throw error;
  }
}

export async function checkReplayAvailability(gameId: string, profileId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/check-replay/${gameId}/${profileId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.available;
  } catch (error) {
    console.error('Failed to check replay availability:', error);
    return true; // Default to available on error
  }
}

// Check APM processing status
export async function checkApmStatus(gameId: string, profileId: string): Promise<{ hasSaveGame: boolean; isProcessed: boolean; state: 'greyStatus' | 'silverStatus' | 'bronzeStatus' }> {
  try {
    const response = await fetch(`${API_URL}/apm-status/${gameId}/${profileId}`);
    if (!response.ok) {
      console.error('APM status check failed', response.statusText);
      return { hasSaveGame: false, isProcessed: false, state: 'greyStatus' };
    }
    const data = await response.json();
    return {
      hasSaveGame: data.hasSaveGame || false,
      isProcessed: data.isProcessed || false,
      state: data.state || 'greyStatus'
    };
  } catch (e) {
    console.error('APM status check failed', e);
    return { hasSaveGame: false, isProcessed: false, state: 'greyStatus' };
  }
}

// Check APM status for any player in a match
export async function checkApmStatusForMatch(gameId: string): Promise<{ hasSaveGame: boolean; isProcessed: boolean; state: 'greyStatus' | 'silverStatus' | 'bronzeStatus'; profileId?: string }> {
  try {
    const response = await fetch(`${API_URL}/apm-status-match/${gameId}`);
    if (!response.ok) {
      console.error('APM status check for match failed', response.statusText);
      return { hasSaveGame: false, isProcessed: false, state: 'greyStatus' };
    }
    const data = await response.json();
    return {
      hasSaveGame: data.hasSaveGame || false,
      isProcessed: data.isProcessed || false,
      state: data.state || 'greyStatus',
      profileId: data.profileId
    };
  } catch (e) {
    console.error('APM status check for match failed', e);
    return { hasSaveGame: false, isProcessed: false, state: 'greyStatus' };
  }
}

// Trigger replay download & APM processing
// Downloads replay client-side from aoe.ms, then sends to proxy for APM processing
export async function downloadReplay(gameId: string, profileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Download replay directly (browser fetch, avoids shared Cloud Run IP rate limits)
    // Use api.ageofempires.com directly — aoe.ms 301-redirects here but without CORS headers,
    // which causes the browser to block the cross-origin redirect
    const replayUrl = `https://api.ageofempires.com/api/GameStats/AgeII/GetMatchReplay/?gameId=${gameId}&profileId=${profileId}&matchId=${gameId}`;
    let replayResponse: Response;
    try {
      replayResponse = await fetch(replayUrl);
    } catch {
      return { success: false, error: 'Failed to download replay' };
    }

    if (!replayResponse.ok) {
      const errorMsg = replayResponse.status === 429
        ? 'Replay server busy — try again later'
        : 'Replay not available';
      return { success: false, error: errorMsg };
    }

    // Step 2: Convert to base64
    const buffer = await replayResponse.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Step 3: Send to proxy for APM processing + Firestore persistence
    const response = await fetch(`${API_URL}/replay-download/${gameId}/${profileId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replayData: base64 })
    });

    if (!response.ok) {
      console.error('Replay processing request failed', response.statusText);
      return { success: false, error: 'Replay processing failed' };
    }

    const data = await response.json();
    return { success: data.downloaded || false, error: data.error };
  } catch (e) {
    console.error('Replay download/processing failed', e);
    return { success: false, error: 'Network error' };
  }
}


