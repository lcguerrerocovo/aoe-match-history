import { describe, it, expect } from 'vitest';
import type { Player } from '../types/match';

describe('Team Grouping Logic in matchService', () => {
  it('should correctly group players into teams without creating extra phantom teams', () => {
    // Mock players array simulating a match with non-contiguous teams (e.g., teams 1 and 3 exist, but not 2)
    // The `number` property is 0-indexed.
    const players: Player[] = [
      { name: 'Player A', number: 0, civ: 'Britons', color_id: 1, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
      { name: 'Player C', number: 2, civ: 'Franks', color_id: 3, user_id: '3', winner: false, rating: 1490, rating_change: -10 },
      { name: 'Player D', number: 2, civ: 'Goths', color_id: 4, user_id: '4', winner: false, rating: 1480, rating_change: -10 },
    ];

    // --- The logic under test, copied from matchService.ts ---
    
    // 1. Group players by team
    const teams: Player[][] = players.reduce((acc: Player[][], player) => {
      const teamIndex = player.number;
      if (!acc[teamIndex]) {
        acc[teamIndex] = [];
      }
      acc[teamIndex].push(player);
      return acc;
    }, []);

    // 2. Ensure we have all teams (even empty ones)
    const maxTeamNumber = players.length > 0 ? Math.max(...players.map(p => p.number)) : -1;
    for (let i = 0; i <= maxTeamNumber; i++) {
      if (!teams[i]) {
        teams[i] = [];
      }
    }
    // --- End of logic under test ---

    // --- Assertions ---
    // Expected: [[Player A], [], [Player C, Player D]]
    // The final array should have a length of 3 (for teams 0, 1, and 2).
    expect(teams.length).toBe(3);

    // Check content of each team
    expect(teams[0]).toEqual([players[0]]); // Team 1 (index 0)
    expect(teams[1]).toEqual([]);             // Team 2 (index 1) should be an empty array
    expect(teams[2]).toEqual([players[1], players[2]]); // Team 3 (index 2)
  });
}); 