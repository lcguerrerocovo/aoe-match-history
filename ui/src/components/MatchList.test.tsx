import { describe, it, expect } from 'vitest';

describe('Alternating Background Logic', () => {
  it('should alternate background colors correctly across all teams', () => {
    // Test the global alternating logic that should be used in TeamCard
    const getBackgroundColor = (globalPlayerIndex: number) => {
      return globalPlayerIndex % 2 === 0 ? 'brand.cardBg' : 'brand.stoneLight';
    };

    // Test a match with 2 teams: Team 1 has 3 players, Team 2 has 2 players
    // Global indices: 0,1,2,3,4
    expect(getBackgroundColor(0)).toBe('brand.cardBg');      // Team 1, Player 1
    expect(getBackgroundColor(1)).toBe('brand.stoneLight'); // Team 1, Player 2
    expect(getBackgroundColor(2)).toBe('brand.cardBg');      // Team 1, Player 3
    expect(getBackgroundColor(3)).toBe('brand.stoneLight'); // Team 2, Player 1
    expect(getBackgroundColor(4)).toBe('brand.cardBg');      // Team 2, Player 2
  });

  it('should work for different team configurations', () => {
    const getBackgroundColor = (globalPlayerIndex: number) => {
      return globalPlayerIndex % 2 === 0 ? 'brand.cardBg' : 'brand.stoneLight';
    };

    // Test 1v1 match
    expect(getBackgroundColor(0)).toBe('brand.cardBg');      // Team 1, Player 1
    expect(getBackgroundColor(1)).toBe('brand.stoneLight'); // Team 2, Player 1

    // Test 2v2 match
    expect(getBackgroundColor(0)).toBe('brand.cardBg');      // Team 1, Player 1
    expect(getBackgroundColor(1)).toBe('brand.stoneLight'); // Team 1, Player 2
    expect(getBackgroundColor(2)).toBe('brand.cardBg');      // Team 2, Player 1
    expect(getBackgroundColor(3)).toBe('brand.stoneLight'); // Team 2, Player 2
  });

  it('should calculate team start indices correctly', () => {
    // Test the team start index calculation logic
    const calculateTeamStartIndex = (teams: number[], teamIndex: number) => {
      let teamStartIndex = 0;
      for (let i = 0; i < teamIndex; i++) {
        teamStartIndex += teams[i];
      }
      return teamStartIndex;
    };

    // Test with teams: [3, 2, 4] (3 players, 2 players, 4 players)
    expect(calculateTeamStartIndex([3, 2, 4], 0)).toBe(0);  // Team 1 starts at 0
    expect(calculateTeamStartIndex([3, 2, 4], 1)).toBe(3);  // Team 2 starts at 3
    expect(calculateTeamStartIndex([3, 2, 4], 2)).toBe(5);  // Team 3 starts at 5
  });
}); 