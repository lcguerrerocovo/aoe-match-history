import type { PlayerSearchResult } from '../components/PlayerSearch';

const API_URL = import.meta.env.VITE_AOE_API_URL;

export class PlayerSearchService {
  async searchPlayers(query: string): Promise<PlayerSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const response = await fetch(
        `${API_URL}/player-search?name=${encodeURIComponent(query.trim())}`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Player search error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const playerSearchService = new PlayerSearchService();

// Export search function for direct use
export const searchPlayers = (query: string) => playerSearchService.searchPlayers(query); 