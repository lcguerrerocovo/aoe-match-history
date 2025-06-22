import { describe, it, expect } from 'vitest';
import { matchTypeIdToLeaderboardId, getGameType, getTier } from './gameUtils';

describe('gameUtils', () => {
  describe('matchTypeIdToLeaderboardId', () => {
    it('should return correct game types for known IDs', () => {
      expect(matchTypeIdToLeaderboardId(0)).toBe('Unranked');
      expect(matchTypeIdToLeaderboardId(2)).toBe('DM 1v1');
      expect(matchTypeIdToLeaderboardId(6)).toBe('RM 1v1');
      expect(matchTypeIdToLeaderboardId(10)).toBe('Battle Royale');
      expect(matchTypeIdToLeaderboardId(26)).toBe('EW 1v1');
    });

    it('should return correct team game types', () => {
      expect(matchTypeIdToLeaderboardId(3)).toBe('DM Team');
      expect(matchTypeIdToLeaderboardId(7)).toBe('RM Team');
      expect(matchTypeIdToLeaderboardId(27)).toBe('EW Team');
    });

    it('should return null for unknown IDs', () => {
      expect(matchTypeIdToLeaderboardId(999)).toBeNull();
      expect(matchTypeIdToLeaderboardId(-1)).toBeNull();
    });
  });

  describe('getGameType', () => {
    it('should delegate to matchTypeIdToLeaderboardId', () => {
      expect(getGameType(6)).toBe('RM 1v1');
      expect(getGameType(999)).toBeNull();
    });
  });

  describe('getTier', () => {
    it('should return Unranked for rank -1', () => {
      const tier = getTier(1500, -1);
      expect(tier.name).toBe('Unranked');
      expect(tier.showCrown).toBe(false);
    });

    it('should return Gold for 1600+ Elo', () => {
      const tier = getTier(1600, 100);
      expect(tier.name).toBe('Gold');
      expect(tier.showCrown).toBe(true);
      expect(tier.explainer).toBe('Gold: 1600+ Elo');
    });

    it('should return Silver for 1300-1599 Elo', () => {
      const tier = getTier(1500, 500);
      expect(tier.name).toBe('Silver');
      expect(tier.showCrown).toBe(true);
      expect(tier.explainer).toBe('Silver: 1300-1599 Elo');
    });

    it('should return Bronze for 1000-1299 Elo', () => {
      const tier = getTier(1200, 1000);
      expect(tier.name).toBe('Bronze');
      expect(tier.showCrown).toBe(true);
      expect(tier.explainer).toBe('Bronze: 1000-1299 Elo');
    });

    it('should return Iron for 0-999 Elo', () => {
      const tier = getTier(800, 2000);
      expect(tier.name).toBe('Iron');
      expect(tier.showCrown).toBe(false);
      expect(tier.explainer).toBe('Iron: 0-999 Elo');
    });
  });
}); 