import { describe, it, expect } from 'vitest';
import { groupByTeam } from './liveMatchUtils';
import type { LiveMatchPlayer } from '../types/liveMatch';

function makePlayer(overrides: Partial<LiveMatchPlayer> & Pick<LiveMatchPlayer, 'name' | 'profile_id' | 'team'>): LiveMatchPlayer {
  return { rating: null, civ: '0', ...overrides };
}

describe('groupByTeam', () => {
  it('groups players by team number', () => {
    const players = [
      makePlayer({ name: 'A', profile_id: 1, team: 0 }),
      makePlayer({ name: 'B', profile_id: 2, team: 1 }),
      makePlayer({ name: 'C', profile_id: 3, team: 0 }),
    ];
    const teams = groupByTeam(players);
    expect(teams).toHaveLength(2);
    expect(teams[0].map(p => p.name)).toEqual(['A', 'C']);
    expect(teams[1].map(p => p.name)).toEqual(['B']);
  });

  it('sorts teams by team number ascending', () => {
    const players = [
      makePlayer({ name: 'X', profile_id: 1, team: 2 }),
      makePlayer({ name: 'Y', profile_id: 2, team: 0 }),
      makePlayer({ name: 'Z', profile_id: 3, team: 1 }),
    ];
    const teams = groupByTeam(players);
    expect(teams).toHaveLength(3);
    expect(teams[0][0].name).toBe('Y'); // team 0
    expect(teams[1][0].name).toBe('Z'); // team 1
    expect(teams[2][0].name).toBe('X'); // team 2
  });

  it('returns empty array for empty input', () => {
    expect(groupByTeam([])).toEqual([]);
  });

  it('preserves player order within a team', () => {
    const players = [
      makePlayer({ name: 'First', profile_id: 1, team: 0 }),
      makePlayer({ name: 'Second', profile_id: 2, team: 0 }),
      makePlayer({ name: 'Third', profile_id: 3, team: 0 }),
    ];
    const teams = groupByTeam(players);
    expect(teams).toHaveLength(1);
    expect(teams[0].map(p => p.name)).toEqual(['First', 'Second', 'Third']);
  });
});
