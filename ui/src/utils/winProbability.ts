import type { LiveMatchPlayer } from '../types/liveMatch';

function avgRating(players: LiveMatchPlayer[]): number | null {
  const ratings = players.map(p => p.rating).filter((r): r is number => r != null && r > 0);
  if (ratings.length !== players.length) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

export function calculateWinProbability(
  teams: LiveMatchPlayer[][],
): [number, number] | null {
  if (teams.length !== 2) return null;
  const ratingA = avgRating(teams[0]);
  const ratingB = avgRating(teams[1]);
  if (ratingA == null || ratingB == null) return null;

  const probA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return [Math.round(probA * 100), Math.round((1 - probA) * 100)];
}
