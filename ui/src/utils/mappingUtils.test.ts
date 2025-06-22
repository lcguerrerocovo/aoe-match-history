import { describe, it, expect } from 'vitest';
import { getLeaderboardName, calculateWinRate, calculatePercentile } from './mappingUtils';

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
}); 