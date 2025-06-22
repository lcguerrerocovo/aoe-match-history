import { describe, it, expect } from 'vitest';
import { getTier } from './tierUtils';

describe('tierUtils', () => {
  describe('getTier', () => {
    it('should return Gold tier for Elo >= 1600', () => {
      const tier = getTier(1700, 100);
      expect(tier.name).toBe('Gold');
      expect(tier.gradient).toBe('linear-gradient(to bottom, #FFD700, #D4AF37)');
      expect(tier.showCrown).toBe(true);
      expect(tier.explainer).toBe('Gold: 1600+ Elo');
    });

    it('should return Silver tier for Elo >= 1300 and < 1600', () => {
      const tier = getTier(1400, 500);
      expect(tier.name).toBe('Silver');
      expect(tier.gradient).toBe('linear-gradient(to bottom, #FFFFFF, #A0A0A0)');
      expect(tier.showCrown).toBe(true);
      expect(tier.explainer).toBe('Silver: 1300-1599 Elo');
    });

    it('should return Bronze tier for Elo >= 1000 and < 1300', () => {
      const tier = getTier(1100, 1000);
      expect(tier.name).toBe('Bronze');
      expect(tier.gradient).toBe('linear-gradient(to bottom, #CD7F32, #B87333)');
      expect(tier.showCrown).toBe(true);
      expect(tier.explainer).toBe('Bronze: 1000-1299 Elo');
    });

    it('should return Iron tier for Elo < 1000', () => {
      const tier = getTier(800, 5000);
      expect(tier.name).toBe('Iron');
      expect(tier.color).toBe('brand.gold');
      expect(tier.showCrown).toBe(false);
      expect(tier.explainer).toBe('Iron: 0-999 Elo');
    });

    it('should return Unranked tier for rank -1 regardless of Elo', () => {
      const tier = getTier(1700, -1);
      expect(tier.name).toBe('Unranked');
      expect(tier.color).toBe('brand.gold');
      expect(tier.showCrown).toBe(false);
      expect(tier.explainer).toBe('Unranked player');
    });

    it('should handle edge cases correctly', () => {
      expect(getTier(1600, 1).name).toBe('Gold');
      expect(getTier(1599, 1).name).toBe('Silver');
      expect(getTier(1300, 1).name).toBe('Silver');
      expect(getTier(1299, 1).name).toBe('Bronze');
      expect(getTier(1000, 1).name).toBe('Bronze');
      expect(getTier(999, 1).name).toBe('Iron');
    });
  });
}); 