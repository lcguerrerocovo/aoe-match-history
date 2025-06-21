import { parseDuration } from './durationUtils';

export function sumDurations(matches: any[]): { totalGame: number; totalReal: number } {
  let totalGame = 0;
  let totalReal = 0;
  for (const match of matches) {
    const durationSec = parseDuration(match.duration);
    totalGame += durationSec;
    totalReal += Math.round(durationSec / 1.7);
  }
  return { totalGame, totalReal };
}

export function countByDiplomacy(matches: any[], profileId: string): Record<string, { matches: number; wins: number; losses: number; uncategorized: number }> {
  const byDiplo: Record<string, { matches: number; wins: number; losses: number; uncategorized: number }> = {};
  for (const match of matches) {
    const diplo = match.diplomacy?.type || 'Unknown';
    if (!byDiplo[diplo]) byDiplo[diplo] = { matches: 0, wins: 0, losses: 0, uncategorized: 0 };
    byDiplo[diplo].matches++;
    let found = false;
    for (const team of match.teams || []) {
      for (const player of team) {
        if (player && player.user_id === profileId) {
          if (typeof player.winner === 'boolean') {
            if (player.winner) byDiplo[diplo].wins++;
            else byDiplo[diplo].losses++;
            found = true;
          }
        }
      }
    }
    if (!found) byDiplo[diplo].uncategorized++;
  }
  return byDiplo;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  } else {
    return `${m}m`;
  }
}

export function formatDateTime(dt: string): string {
  // Parse UTC timestamp and convert to local time
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

export function formatDayDate(dateStr: string): string {
  // Parse UTC date and format for display
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
} 