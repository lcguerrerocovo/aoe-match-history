import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLeaderboardName, calculateWinRate, calculatePercentile } from './mappingUtils';

// Mock fetch for getCivMap/getMapMap tests
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('mappingUtils', () => {
  describe('getLeaderboardName', () => {
    it('should return correct leaderboard names', () => {
      expect(getLeaderboardName(0)).toBe('Unranked');
      expect(getLeaderboardName(1)).toBe('DM 1v1');
      expect(getLeaderboardName(3)).toBe('RM 1v1');
      expect(getLeaderboardName(4)).toBe('RM Team');
      expect(getLeaderboardName(13)).toBe('EW 1v1');
      expect(getLeaderboardName(14)).toBe('EW Team');
    });

    it('should return UNR for unknown IDs', () => {
      expect(getLeaderboardName(999)).toBe('UNR');
      expect(getLeaderboardName(-1)).toBe('UNR');
    });
  });

  describe('calculateWinRate', () => {
    it('should calculate win rate correctly', () => {
      expect(calculateWinRate(10, 5)).toBe('66.67');
      expect(calculateWinRate(5, 10)).toBe('33.33');
      expect(calculateWinRate(0, 0)).toBe('0.00');
    });

    it('should handle edge cases', () => {
      expect(calculateWinRate(0, 5)).toBe('0.00');
      expect(calculateWinRate(5, 0)).toBe('100.00');
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate percentile correctly', () => {
      expect(calculatePercentile(100, 1000)).toBe('90.0');
      expect(calculatePercentile(500, 1000)).toBe('50.0');
      expect(calculatePercentile(900, 1000)).toBe('10.0');
    });

    it('should handle edge cases', () => {
      expect(calculatePercentile(-1, 1000)).toBe('0.0');
      expect(calculatePercentile(100, 0)).toBe('0.0');
      expect(calculatePercentile(0, 100)).toBe('100.0');
    });
  });

  describe('getCivMap', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset cached module state between tests by reimporting
      vi.resetModules();
    });

    it('should fetch and parse civ mappings', async () => {
      const mockMappings = {
        civs: {
          aoe2: {
            'Britons': { '1': 3, '2': 3 },
            'Franks': { '1': 4 },
          }
        },
        maps: { aoe2: {} }
      };
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMappings),
      });

      // Re-import to get fresh module state
      const { getCivMap: freshGetCivMap } = await import('./mappingUtils');
      const result = await freshGetCivMap();

      expect(fetchMock).toHaveBeenCalledWith('/data/rl_api_mappings.json');
      expect(result['3']).toBe('Britons');
      expect(result['4']).toBe('Franks');
    });

    it('should use the latest version ID as key', async () => {
      const mockMappings = {
        civs: {
          aoe2: {
            'Byzantines': { '1': 10, '3': 42 }, // version 3 is latest
          }
        },
        maps: { aoe2: {} }
      };
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMappings),
      });

      const { getCivMap: freshGetCivMap } = await import('./mappingUtils');
      const result = await freshGetCivMap();

      expect(result['42']).toBe('Byzantines');
      expect(result['10']).toBeUndefined();
    });

    it('should return empty object when civs.aoe2 is missing', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ civs: {}, maps: { aoe2: {} } }),
      });

      const { getCivMap: freshGetCivMap } = await import('./mappingUtils');
      const result = await freshGetCivMap();

      expect(result).toEqual({});
    });
  });

  describe('getMapMap', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.resetModules();
    });

    it('should fetch and parse map mappings', async () => {
      const mockMappings = {
        civs: { aoe2: {} },
        maps: {
          aoe2: {
            'Arabia': { '1': 9 },
            'Arena': { '1': 17 },
          }
        }
      };
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMappings),
      });

      const { getMapMap: freshGetMapMap } = await import('./mappingUtils');
      const result = await freshGetMapMap();

      expect(result['9']).toBe('Arabia');
      expect(result['17']).toBe('Arena');
    });

    it('should return empty object when maps.aoe2 is missing', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ civs: { aoe2: {} }, maps: {} }),
      });

      const { getMapMap: freshGetMapMap } = await import('./mappingUtils');
      const result = await freshGetMapMap();

      expect(result).toEqual({});
    });
  });
}); 