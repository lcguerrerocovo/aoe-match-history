import { describe, it, expect } from 'vitest';
import { getLeaderboardName, calculateWinRate, calculatePercentile } from './leaderboardUtils';

describe('leaderboardUtils', () => {
  describe('getLeaderboardName', () => {
    it('should return correct names for known leaderboard IDs', () => {
      expect(getLeaderboardName(3)).toBe('RM 1v1');
      expect(getLeaderboardName(4)).toBe('RM Team');
      expect(getLeaderboardName(1)).toBe('DM 1v1');
      expect(getLeaderboardName(0)).toBe('Unranked');
    });

    it('should return UNR for unknown leaderboard IDs', () => {
      expect(getLeaderboardName(999)).toBe('UNR');
      expect(getLeaderboardName(-1)).toBe('UNR');
    });

    it('should handle all defined leaderboard types', () => {
      const knownIds = [0, 1, 2, 3, 4, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
      knownIds.forEach(id => {
        expect(getLeaderboardName(id)).not.toBe('UNR');
      });
    });
  });

  describe('calculateWinRate', () => {
    it('should calculate correct win rate', () => {
      expect(calculateWinRate(8, 2)).toBe('80.00'); // 8 wins, 2 losses = 80%
      expect(calculateWinRate(5, 5)).toBe('50.00'); // 5 wins, 5 losses = 50%
      expect(calculateWinRate(0, 10)).toBe('0.00'); // 0 wins, 10 losses = 0%
    });

    it('should handle zero games', () => {
      expect(calculateWinRate(0, 0)).toBe('0.00');
    });

    it('should handle decimal precision', () => {
      expect(calculateWinRate(1, 3)).toBe('25.00'); // 1 win, 3 losses = 25%
      expect(calculateWinRate(7, 3)).toBe('70.00'); // 7 wins, 3 losses = 70%
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate correct percentile', () => {
      expect(calculatePercentile(100, 1000)).toBe('90.0'); // Top 10%
      expect(calculatePercentile(500, 1000)).toBe('50.0'); // Top 50%
      expect(calculatePercentile(900, 1000)).toBe('10.0'); // Top 90%
    });

    it('should handle edge cases', () => {
      expect(calculatePercentile(-1, 1000)).toBe('0.0'); // Unranked
      expect(calculatePercentile(0, 0)).toBe('0.0'); // No players
      expect(calculatePercentile(1, 100)).toBe('99.0'); // Top 1%
    });

    it('should handle decimal precision', () => {
      expect(calculatePercentile(123, 1000)).toBe('87.7'); // 87.7th percentile
    });
  });
}); 