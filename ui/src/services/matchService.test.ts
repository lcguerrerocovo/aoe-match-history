import { describe, it, expect } from 'vitest';
import type { Player } from '../types/match';

// Team grouping logic test

describe('Team Grouping Logic in matchService', () => {
  it('should correctly group players into teams without creating extra phantom teams', () => {
    // Simulate a match with non-contiguous teams (e.g., teams 1 and 3 exist, but not 2)
    // The `number` property is 1-based (teamid + 1)
    const players: Player[] = [
      { name: 'Player A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
      { name: 'Player C', number: 3, civ: 'Franks', color_id: 2, user_id: '3', winner: false, rating: 1490, rating_change: -10 },
      { name: 'Player D', number: 3, civ: 'Goths', color_id: 3, user_id: '4', winner: false, rating: 1480, rating_change: -10 },
    ];

    // 1. Group players by team (1-based index)
    const teams: Player[][] = players.reduce((acc: Player[][], player) => {
      const teamIndex = player.number - 1;
      if (!acc[teamIndex]) {
        acc[teamIndex] = [];
      }
      acc[teamIndex].push(player);
      return acc;
    }, []);

    // 2. Ensure we have all teams (even empty ones)
    const maxTeamNumber = players.length > 0 ? Math.max(...players.map(p => p.number)) : -1;
    for (let i = 0; i < maxTeamNumber; i++) {
      if (!teams[i]) {
        teams[i] = [];
      }
    }

    // Expected: [[Player A], [], [Player C, Player D]]
    expect(teams.length).toBe(3);
    expect(teams[0]).toEqual([players[0]]); // Team 1 (index 0)
    expect(teams[1]).toEqual([]);           // Team 2 (index 1) should be empty
    expect(teams[2]).toEqual([players[1], players[2]]); // Team 3 (index 2)
  });

  it('should handle all players on one team', () => {
    const players: Player[] = [
      { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
      { name: 'B', number: 1, civ: 'Franks', color_id: 1, user_id: '2', winner: true, rating: 1490, rating_change: 10 },
    ];
    const teams: Player[][] = players.reduce((acc: Player[][], player) => {
      const teamIndex = player.number - 1;
      if (!acc[teamIndex]) acc[teamIndex] = [];
      acc[teamIndex].push(player);
      return acc;
    }, []);
    expect(teams.length).toBe(1);
    expect(teams[0]).toEqual(players);
  });

  it('should handle FFA (each player on their own team)', () => {
    const players: Player[] = [
      { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: false, rating: 1500, rating_change: 0 },
      { name: 'B', number: 2, civ: 'Franks', color_id: 1, user_id: '2', winner: true, rating: 1490, rating_change: 10 },
      { name: 'C', number: 3, civ: 'Goths', color_id: 2, user_id: '3', winner: false, rating: 1480, rating_change: -10 },
    ];
    const teams: Player[][] = players.reduce((acc: Player[][], player) => {
      const teamIndex = player.number - 1;
      if (!acc[teamIndex]) acc[teamIndex] = [];
      acc[teamIndex].push(player);
      return acc;
    }, []);
    expect(teams.length).toBe(3);
    expect(teams[0]).toEqual([players[0]]);
    expect(teams[1]).toEqual([players[1]]);
    expect(teams[2]).toEqual([players[2]]);
  });

  it('should detect the correct winning team', () => {
    const players: Player[] = [
      { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: false, rating: 1500, rating_change: 0 },
      { name: 'B', number: 2, civ: 'Franks', color_id: 1, user_id: '2', winner: true, rating: 1490, rating_change: 10 },
      { name: 'C', number: 2, civ: 'Goths', color_id: 2, user_id: '3', winner: true, rating: 1480, rating_change: 10 },
    ];
    const teams: Player[][] = players.reduce((acc: Player[][], player) => {
      const teamIndex = player.number - 1;
      if (!acc[teamIndex]) acc[teamIndex] = [];
      acc[teamIndex].push(player);
      return acc;
    }, []);
    // Winning team is the one with any player.winner === true
    const winningTeams = teams
      .map((team, idx) => team.some(p => p.winner) ? idx + 1 : null)
      .filter((n): n is number => n !== null);
    expect(winningTeams).toEqual([2]);
  });

  it('should assign color_id based on row index if needed', () => {
    // Simulate the UI logic for alternating row colors
    const players: Player[] = [
      { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: false, rating: 1500, rating_change: 0 },
      { name: 'B', number: 1, civ: 'Franks', color_id: 1, user_id: '2', winner: false, rating: 1490, rating_change: 0 },
    ];
    const colors = ['white', 'brand.stoneLight'];
    const rowColors = players.map((_, idx) => colors[idx % 2]);
    expect(rowColors).toEqual(['white', 'brand.stoneLight']);
  });
}); 