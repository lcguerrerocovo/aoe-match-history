import type { PositionStatsData } from '../types/positionStats';

export async function getPositionStats(): Promise<PositionStatsData> {
  const response = await fetch('/data/position-stats.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch position stats: ${response.status}`);
  }
  return response.json();
}
