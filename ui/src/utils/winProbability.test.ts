import { describe, it, expect } from 'vitest';
import { calculateWinProbability } from './winProbability';
import type { LiveMatchPlayer } from '../types/liveMatch';

function player(rating: number | null): LiveMatchPlayer {
  return { name: 'p', profile_id: 1, rating, civ: '0', team: 1, color_id: 1 };
}

describe('calculateWinProbability', () => {
  it('returns 50-50 for equal ratings', () => {
    const result = calculateWinProbability([
      [player(1500)],
      [player(1500)],
    ]);
    expect(result).toEqual([50, 50]);
  });

  it('favors higher-rated team', () => {
    const result = calculateWinProbability([
      [player(1700)],
      [player(1500)],
    ]);
    expect(result).not.toBeNull();
    expect(result![0]).toBeGreaterThan(50);
    expect(result![0] + result![1]).toBe(100);
  });

  it('uses average team rating for team games', () => {
    const result = calculateWinProbability([
      [player(1600), player(1400)],
      [player(1500), player(1500)],
    ]);
    expect(result).toEqual([50, 50]);
  });

  it('returns null if any player has null rating', () => {
    const result = calculateWinProbability([
      [player(1500), player(null)],
      [player(1500), player(1500)],
    ]);
    expect(result).toBeNull();
  });

  it('returns null if any player has 0 rating', () => {
    const result = calculateWinProbability([
      [player(1500), player(0)],
      [player(1500), player(1500)],
    ]);
    expect(result).toBeNull();
  });

  it('returns null for non-2-team matches', () => {
    expect(calculateWinProbability([[player(1500)]])).toBeNull();
    expect(calculateWinProbability([])).toBeNull();
  });

  it('handles 400 ELO difference correctly (~91%)', () => {
    const result = calculateWinProbability([
      [player(1900)],
      [player(1500)],
    ]);
    expect(result![0]).toBeGreaterThanOrEqual(90);
    expect(result![0]).toBeLessThanOrEqual(92);
  });
});
