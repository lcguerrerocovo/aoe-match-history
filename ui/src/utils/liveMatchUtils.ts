import type { LiveMatchPlayer } from '../types/liveMatch';

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
