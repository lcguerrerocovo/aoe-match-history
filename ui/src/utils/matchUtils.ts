import { parseDuration } from './durationUtils';
import type { Match, MatchGroup } from '../types/match';

export function groupMatchesBySession(matches: Match[]): MatchGroup[] {
  if (matches.length === 0) return [];
  
  // Sort matches by start time (newest first)
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  
  const sessions: MatchGroup[] = [];
  let currentSession: Match[] = [];
  
  for (const match of sortedMatches) {
    if (currentSession.length === 0) {
      // Start new session
      currentSession = [match];
    } else {
      // Check if this match is within 1 hour of the most recent match in the session
      const lastMatchTime = new Date(currentSession[currentSession.length - 1].start_time);
      const timeDiff = Math.abs(new Date(match.start_time).getTime() - lastMatchTime.getTime());
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (timeDiff <= oneHour) {
        // Add to current session
        currentSession.push(match);
      } else {
        // End current session and start new one
        const oldestMatchInSession = currentSession[currentSession.length - 1];
        const sessionStart = new Date(oldestMatchInSession.start_time);
        const newestMatchInSession = currentSession[0];
        const sessionEnd = new Date(new Date(newestMatchInSession.start_time).getTime() + (Math.round(parseDuration(newestMatchInSession.duration) / 1.7) * 1000));
        const sessionId = `${sessionStart.toISOString()}_${sessionEnd.toISOString()}`;
        sessions.push({ date: sessionId, matches: currentSession });
        
        currentSession = [match];
      }
    }
  }
  
  // Add the last session
  if (currentSession.length > 0) {
    const oldestMatchInSession = currentSession[currentSession.length - 1];
    const sessionStart = new Date(oldestMatchInSession.start_time);
    const newestMatchInSession = currentSession[0];
    const sessionEnd = new Date(new Date(newestMatchInSession.start_time).getTime() + (Math.round(parseDuration(newestMatchInSession.duration) / 1.7) * 1000));
    const sessionId = `${sessionStart.toISOString()}_${sessionEnd.toISOString()}`;
    sessions.push({ date: sessionId, matches: currentSession });
  }
  
  return sessions;
}

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
    
    // Look in the transformed players data
    if (match.players) {
      for (const player of match.players) {
        if (player.user_id.toString() === profileId) {
          if (typeof player.winner === 'boolean') {
            if (player.winner) {
              byDiplo[diplo].wins++;
            } else {
              byDiplo[diplo].losses++;
            }
            found = true;
          }
        }
      }
    }
    
    if (!found) {
      byDiplo[diplo].uncategorized++;
    }
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

export function formatSessionStart(sessionId: string): string {
  // Session ID format is "startISO_endISO"
  try {
    const [startIso, endIso] = sessionId.split('_');

    if (!endIso) {
      // Fallback for any single-value format that might still exist
      return new Date(sessionId).toLocaleString();
    }

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return sessionId;
    }

    // Check if session spans across days in the local timezone
    const isCrossDay = startDate.getDate() !== endDate.getDate();

    if (isCrossDay) {
      // Format: "Jun 14 10:01 PM → Jun 15 6:25 PM"
      const startFormatted = startDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      const endFormatted = endDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        year: 'numeric',
      });

      return `${startFormatted} → ${endFormatted}`;
    } else {
      // Format: "Jun 14, 2025 10:01 PM – 6:25 PM"
      const dateFormatted = startDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const startTimeFormatted = startDate.toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

      const endTimeFormatted = endDate.toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

      return `${dateFormatted} ${startTimeFormatted} – ${endTimeFormatted}`;
    }
  } catch (error) {
    return sessionId;
  }
}

export function calculateSessionDuration(matches: any[]): number {
  if (matches.length === 0) {
    return 0;
  }

  const sessionStartTime = new Date(matches[matches.length - 1].start_time).getTime();
  const lastMatch = matches[0];
  const lastMatchEndTime = new Date(lastMatch.start_time).getTime() + (Math.round(parseDuration(lastMatch.duration) / 1.7) * 1000);

  return Math.round((lastMatchEndTime - sessionStartTime) / 1000);
} 