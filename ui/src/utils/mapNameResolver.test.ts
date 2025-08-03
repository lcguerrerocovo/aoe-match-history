import { describe, it, expect } from 'vitest';
import { 
  resolveMapFilename, 
  getMostLikelyMapFilename, 
  getAllPossibleMapFilenames,
  isMapFilename 
} from './mapNameResolver';

describe('mapNameResolver', () => {
  describe('resolveMapFilename', () => {
    it('should generate multiple filename patterns for camelCase names', () => {
      const patterns = resolveMapFilename('BlackForest');
      
      expect(patterns).toContain('rm_black-forest.png');
      expect(patterns).toContain('rm_black_forest.png');
      expect(patterns).toContain('black-forest.png');
      expect(patterns).toContain('sm_black-forest.png');
      expect(patterns).toContain('rwm_black-forest.png');
    });

    it('should handle simple names', () => {
      const patterns = resolveMapFilename('Arabia');
      
      expect(patterns).toContain('rm_arabia.png');
      expect(patterns).toContain('arabia.png');
      expect(patterns).toContain('sm_arabia.png');
    });

    it('should handle special cases with priority', () => {
      const patterns = resolveMapFilename('BlackForest');
      
      // Special cases should be at the beginning
      expect(patterns[0]).toBe('rm_black-forest.png');
      expect(patterns[1]).toBe('rm_black_forest.png');
      expect(patterns[2]).toBe('black-forest.png');
    });

    it('should handle space-separated map names', () => {
      const result = resolveMapFilename('my map');
      expect(result).toContain('rm_my_map.png');
      expect(result).toContain('rm_my-map.png');
      expect(result).toContain('my_map.png');
      expect(result).toContain('my-map.png');
    });

    it('should strip .rms extension from map names', () => {
      const result = resolveMapFilename('rm_enclosed.rms');
      expect(result).toContain('rm_rm_enclosed.png');
      expect(result).toContain('rm_enclosed.png');
      expect(result).not.toContain('rm_enclosed.rms.png');
    });

    it('should handle .rms2 extensions', () => {
      const result = resolveMapFilename('rm_goldenpit.rms2');
      expect(result).toContain('rm_rm_goldenpit.png');
      expect(result).toContain('rm_goldenpit.png');
      expect(result).not.toContain('rm_goldenpit.rms2.png');
    });
  });

  describe('getMostLikelyMapFilename', () => {
    it('should return rm_ pattern when available', () => {
      const filename = getMostLikelyMapFilename('BlackForest');
      expect(filename).toBe('rm_black-forest.png');
    });

    it('should fall back to first pattern when no rm_ pattern', () => {
      const filename = getMostLikelyMapFilename('SomeRandomMap');
      expect(filename).toBe('rm_some_random_map.png');
    });

    it('should return generic map for empty/invalid names', () => {
      const testCases = ['', '   ', '   \t\n  ', undefined as any, null as any];
      
      testCases.forEach(invalidName => {
        const filename = getMostLikelyMapFilename(invalidName);
        expect(filename).toBe('cm_generic.png');
      });
    });
  });

  describe('getAllPossibleMapFilenames', () => {
    it('should return all possible filenames', () => {
      const filenames = getAllPossibleMapFilenames('GoldRush');
      
      expect(filenames).toContain('rm_gold-rush.png');
      expect(filenames).toContain('rm_gold_rush.png');
      expect(filenames).toContain('gold-rush.png');
      expect(filenames).toContain('sm_gold-rush.png');
      expect(filenames).toContain('rwm_gold-rush.png');
    });
  });

  describe('isMapFilename', () => {
    it('should return true for matching filenames', () => {
      expect(isMapFilename('rm_black-forest.png', 'BlackForest')).toBe(true);
      expect(isMapFilename('black-forest.png', 'BlackForest')).toBe(true);
      expect(isMapFilename('sm_black-forest.png', 'BlackForest')).toBe(true);
    });

    it('should return false for non-matching filenames', () => {
      expect(isMapFilename('random.png', 'BlackForest')).toBe(false);
      expect(isMapFilename('rm_arabia.png', 'BlackForest')).toBe(false);
    });
  });

  describe('real-world examples', () => {
    it('should handle common AoE2 map names', () => {
      const testCases = [
        { apiName: 'Arabia', expected: 'rm_arabia.png' },
        { apiName: 'BlackForest', expected: 'rm_black-forest.png' },
        { apiName: 'GoldRush', expected: 'rm_gold-rush.png' },
        { apiName: 'Nomad', expected: 'rm_nomad.png' },
        { apiName: 'Arena', expected: 'rm_arena.png' },
        { apiName: 'TeamIslands', expected: 'rm_team-islands.png' },
        { apiName: 'SaltMarsh', expected: 'rm_salt-marsh.png' },
        { apiName: 'GhostLake', expected: 'rm_ghost-lake.png' },
        { apiName: 'CraterLake', expected: 'rm_crater-lake.png' },
        { apiName: 'Scandanavia', expected: 'rm_scandinavia.png' }, // Handles API typo
      ];

      testCases.forEach(({ apiName, expected }) => {
        const filename = getMostLikelyMapFilename(apiName);
        expect(filename).toBe(expected);
      });
    });

    it('should handle AmazonTunnel and other complex names', () => {
      const testCases = [
        { apiName: 'AmazonTunnel', expected: 'rm_amazon_tunnels.png' },
        { apiName: 'RealWorldAmazon', expected: 'rm_real_world_amazon.png' },
        { apiName: 'AmazonWarrior', expected: 'rm_amazon_warrior.png' },
        { apiName: 'AmazonArcher', expected: 'rm_amazon_archer.png' },
        { apiName: 'MountainRange', expected: 'rm_mountain_range.png' },
        { apiName: 'RiverDivide', expected: 'rm_river_divide.png' },
        { apiName: 'SacredSprings', expected: 'rm_sacred_springs.png' },
        { apiName: 'SeizeTheMountain', expected: 'rm_seize_the_mountain.png' },
        { apiName: 'AfricanClearing', expected: 'rm_african_clearing.png' },
        { apiName: 'CoastalForest', expected: 'rm_coastal_forest.png' },
      ];

      testCases.forEach(({ apiName, expected }) => {
        const filename = getMostLikelyMapFilename(apiName);
        expect(filename).toBe(expected);
      });
    });

    it('should generate all possible patterns for AmazonTunnel', () => {
      const patterns = resolveMapFilename('AmazonTunnel');
      
      // Should include various naming patterns
      expect(patterns).toContain('rm_amazon_tunnel.png');
      expect(patterns).toContain('rm_amazon-tunnel.png');
      expect(patterns).toContain('amazon_tunnel.png');
      expect(patterns).toContain('amazon-tunnel.png');
      expect(patterns).toContain('amazontunnel.png');
      expect(patterns).toContain('sm_amazon_tunnel.png');
      expect(patterns).toContain('rwm_amazon_tunnel.png');
    });
  });
}); 