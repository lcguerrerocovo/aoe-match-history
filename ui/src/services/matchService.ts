import type { Match, ApmData } from '../types/match';
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

export interface FilterOptions {
  maps: { name: string; count: number }[];
  matchTypes: { ids: number[]; name: string; count: number }[];
}

export interface FullMatchHistoryResponse {
  matches: Match[];
  hasMore: boolean;
  nextCursor?: string;
  filterOptions?: FilterOptions;
}

export interface FullMatchHistoryOptions {
  limit?: number;
  cursor?: string;
  map?: string;
  matchType?: string;
  sort?: 'asc' | 'desc';
  page?: number;
}

export async function getFullMatchHistory(
  profileId: string,
  pageOrOptions?: number | FullMatchHistoryOptions,
  limitArg?: number,
): Promise<FullMatchHistoryResponse> {
  const params = new URLSearchParams();

  if (typeof pageOrOptions === 'number') {
    // Legacy signature: getFullMatchHistory(profileId, page, limit)
    params.set('page', pageOrOptions.toString());
    if (limitArg) params.set('limit', limitArg.toString());
  } else if (pageOrOptions) {
    const opts = pageOrOptions;
    if (opts.limit) params.set('limit', opts.limit.toString());
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.map) params.set('map', opts.map);
    if (opts.matchType !== undefined) params.set('matchType', opts.matchType.toString());
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.page) params.set('page', opts.page.toString());
  }

  const qs = params.toString();
  const url = `${API_URL}/match-history/${profileId}/full${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
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

// Auto-trigger analysis for a match (match detail page)
export interface MatchAnalysisResponse {
  status: 'complete' | 'processing' | 'unavailable';
  apm?: ApmData;
}

export async function getMatchAnalysis(matchId: string): Promise<MatchAnalysisResponse> {
  try {
    const response = await fetch(`${API_URL}/match-analysis/${matchId}`);
    if (!response.ok) {
      return { status: 'unavailable' };
    }
    return await response.json();
  } catch {
    return { status: 'unavailable' };
  }
}

// Check which matches have analysis (sidecar)
export async function getAnalysisStatus(matchIds: string[]): Promise<Set<string>> {
  if (!matchIds.length) return new Set();
  try {
    const response = await fetch(`${API_URL}/analysis-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchIds }),
    });
    if (!response.ok) return new Set();
    const data = await response.json();
    return new Set(data.analyzed || []);
  } catch {
    return new Set();
  }
}

// Trigger batch analysis (fire-and-forget)
export async function triggerBatchAnalysis(profileId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/process-recent/${profileId}`, {
      method: 'POST',
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.accepted && !data.debounced;
  } catch {
    return false;
  }
}


