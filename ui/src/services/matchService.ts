import type { PersonalStats } from '../types/stats';
import type { PlayerSearchResult } from '../components/PlayerSearch';

const API_URL = import.meta.env.VITE_AOE_API_URL!;
const DEFAULT_PROFILE_ID = '4764337';

interface MatchData {
  id: string;
  name: string;
  matches: any[];
}

// Simple match retrieval - cloud functions return fully processed data
export async function getMatch(matchId: string): Promise<any> {
  const response = await fetch(`${API_URL}/match/${matchId}`, {
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
    return data.map((player: any) => ({
      id: player.id?.toString(),
      name: player.name,
      matches: player.matches || 0
    }));
  } catch (error) {
    console.error('Player search error:', error);
    throw error;
  }
}
