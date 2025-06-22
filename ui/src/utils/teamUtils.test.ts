import { describe, it, expect } from 'vitest';
import { groupPlayersIntoTeams, detectWinningTeams } from './teamUtils';
import type { Player } from '../types/match';

describe('teamUtils', () => {
  describe('groupPlayersIntoTeams', () => {
    it('should group players by team number', () => {
      const players: Player[] = [
        { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
        { name: 'B', number: 2, civ: 'Franks', color_id: 1, user_id: '2', winner: false, rating: 1490, rating_change: -10 },
        { name: 'C', number: 1, civ: 'Goths', color_id: 2, user_id: '3', winner: true, rating: 1480, rating_change: 10 },
      ];

      const teams = groupPlayersIntoTeams(players);
      expect(teams).toHaveLength(2);
      expect(teams[0]).toHaveLength(2); // Team 1: A, C
      expect(teams[1]).toHaveLength(1); // Team 2: B
    });

    it('should group by color_id when all players have same team number', () => {
      const players: Player[] = [
        { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
        { name: 'B', number: 1, civ: 'Franks', color_id: 1, user_id: '2', winner: true, rating: 1490, rating_change: 10 },
      ];

      const teams = groupPlayersIntoTeams(players);
      expect(teams).toHaveLength(2); // Different color_ids = different teams
      expect(teams[0]).toHaveLength(1); // color_id 0
      expect(teams[1]).toHaveLength(1); // color_id 1
    });

    it('should filter out empty teams', () => {
      const players: Player[] = [
        { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
        { name: 'C', number: 3, civ: 'Goths', color_id: 2, user_id: '3', winner: false, rating: 1480, rating_change: -10 },
      ];

      const teams = groupPlayersIntoTeams(players);
      expect(teams).toHaveLength(2); // Should not include empty team 2
    });
  });

  describe('detectWinningTeams', () => {
    it('should detect winning teams correctly', () => {
      const teams: Player[][] = [
        [
          { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
          { name: 'B', number: 1, civ: 'Franks', color_id: 1, user_id: '2', winner: true, rating: 1490, rating_change: 10 },
        ],
        [
          { name: 'C', number: 2, civ: 'Goths', color_id: 2, user_id: '3', winner: false, rating: 1480, rating_change: -10 },
        ],
      ];

      const { winningTeam, winningTeams } = detectWinningTeams(teams);
      expect(winningTeam).toBe(1);
      expect(winningTeams).toEqual([1]);
    });

    it('should handle no winning teams', () => {
      const teams: Player[][] = [
        [
          { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: false, rating: 1500, rating_change: -10 },
        ],
      ];

      const { winningTeam, winningTeams } = detectWinningTeams(teams);
      expect(winningTeam).toBeUndefined();
      expect(winningTeams).toEqual([]);
    });

    it('should handle multiple winning teams', () => {
      const teams: Player[][] = [
        [
          { name: 'A', number: 1, civ: 'Britons', color_id: 0, user_id: '1', winner: true, rating: 1500, rating_change: 10 },
        ],
        [
          { name: 'B', number: 2, civ: 'Franks', color_id: 1, user_id: '2', winner: true, rating: 1490, rating_change: 10 },
        ],
      ];

      const { winningTeam, winningTeams } = detectWinningTeams(teams);
      expect(winningTeam).toBe(1);
      expect(winningTeams).toEqual([1, 2]);
    });
  });
}); 