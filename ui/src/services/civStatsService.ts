import type { CivStatsData } from '../types/civStats';

export async function getCivStats(): Promise<CivStatsData> {
  const response = await fetch('/data/civ-stats.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch civ stats: ${response.status}`);
  }
  return response.json();
}
