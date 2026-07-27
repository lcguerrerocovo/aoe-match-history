import type { LiveMatchPlayer } from '../types/liveMatch';

// Mirrors rating_leaderboard_mapping in PostgreSQL (collector migration
// 1775000000000): match_type_id → ranked leaderboard_id.
const MATCH_TYPE_TO_LEADERBOARD: Record<number, number> = {
  2: 1, // DM 1v1
  3: 2, 4: 2, 5: 2, // DM Team
  6: 3, // RM 1v1
  7: 4, 8: 4, 9: 4, // RM Team
  26: 13, // EW 1v1
  27: 14, 28: 14, 29: 14, // EW Team
  18: 19, // QM RM
  19: 20, 20: 20, 21: 20, // QM RM Team
  11: 21, // QM EW
  12: 22, 13: 22, 14: 22, // QM EW Team
};

/**
 * Current rating on the leaderboard a live match is ranked on, from the
 * player's personal stats. Null for unranked match types or when the player
 * has never played that ladder.
 */
export function getLeaderboardRatingForMatchType(
  stats: { leaderboard_id: number; rating: number }[] | undefined,
  matchTypeId: number,
): number | null {
  const leaderboardId = MATCH_TYPE_TO_LEADERBOARD[matchTypeId];
  if (leaderboardId == null || !stats) return null;
  return stats.find(s => s.leaderboard_id === leaderboardId)?.rating ?? null;
}

export function groupByTeam(players: LiveMatchPlayer[]): LiveMatchPlayer[][] {
  const map = new Map<number, LiveMatchPlayer[]>();
  for (const p of players) {
    if (!map.has(p.team)) map.set(p.team, []);
    map.get(p.team)!.push(p);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}
