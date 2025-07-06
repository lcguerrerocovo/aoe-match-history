import { parseDuration } from './timeUtils';
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

export function countByDiplomacy(matches: any[], profileId: string): Record<string, { matches: number; wins: number; losses: number; uncategorized: number; eloChange: number }> {
  const byDiplo: Record<string, { matches: number; wins: number; losses: number; uncategorized: number; eloChange: number }> = {};
  for (const match of matches) {
    const diplo = match.diplomacy?.type || 'Unknown';
    if (!byDiplo[diplo]) byDiplo[diplo] = { matches: 0, wins: 0, losses: 0, uncategorized: 0, eloChange: 0 };
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
          if (player.rating_change !== null) {
            byDiplo[diplo].eloChange += player.rating_change;
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

export function formatSessionTimingData(sessionId: string, timePlayedSec: number): { dateDisplay: string; timeRange: string; sessionDuration: string; timePlayed: string; isCrossDay: boolean } {
  // Session ID format is "startISO_endISO"
  try {
    const [startIso, endIso] = sessionId.split('_');

    if (!endIso) {
      // Fallback for any single-value format that might still exist
      const fallbackDate = new Date(sessionId).toLocaleString();
      return {
        dateDisplay: fallbackDate,
        timeRange: '',
        sessionDuration: '',
        timePlayed: formatDuration(timePlayedSec),
        isCrossDay: false
      };
    }

    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        dateDisplay: sessionId,
        timeRange: '',
        sessionDuration: '',
        timePlayed: formatDuration(timePlayedSec),
        isCrossDay: false
      };
    }

    // Calculate session duration
    const sessionDurationMs = endDate.getTime() - startDate.getTime();
    const sessionDurationSec = Math.floor(sessionDurationMs / 1000);

    // Check if session spans across days in the local timezone
    const isCrossDay = startDate.getDate() !== endDate.getDate();

    if (isCrossDay) {
      // Cross-day format
      const startDateFormatted = startDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      
      const endDateFormatted = endDate.toLocaleString(undefined, {
        day: 'numeric',
      });

      const startTimeFormatted = startDate.toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const endTimeFormatted = endDate.toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return {
        dateDisplay: `${startDateFormatted}–${endDateFormatted}`,
        timeRange: `${startTimeFormatted}–${endTimeFormatted}`,
        sessionDuration: formatDuration(sessionDurationSec),
        timePlayed: formatDuration(timePlayedSec),
        isCrossDay: true
      };
    } else {
      // Same-day format
      const dateFormatted = startDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Get hour periods for both times
      const startHourPeriod = startDate.getHours() >= 12 ? 'PM' : 'AM';
      const endHourPeriod = endDate.getHours() >= 12 ? 'PM' : 'AM';

      // Convert 24h to 12h for start time
      const startHour24 = startDate.getHours();
      const startHour12 = startHour24 === 0 ? 12 : startHour24 > 12 ? startHour24 - 12 : startHour24;
      const startMinute = startDate.getMinutes().toString().padStart(2, '0');
      const startTime12 = `${startHour12}:${startMinute}`;

      const endTimeFormatted = endDate.toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Only show AM/PM on end time if different from start, otherwise show on both
      const timeRange = startHourPeriod !== endHourPeriod 
        ? `${startTime12} ${startHourPeriod}–${endTimeFormatted}`
        : `${startTime12}–${endTimeFormatted}`;

      return {
        dateDisplay: dateFormatted,
        timeRange: timeRange,
        sessionDuration: formatDuration(sessionDurationSec),
        timePlayed: formatDuration(timePlayedSec),
        isCrossDay: false
      };
    }
  } catch (error) {
    return {
      dateDisplay: sessionId,
      timeRange: '',
      sessionDuration: '',
      timePlayed: formatDuration(timePlayedSec),
      isCrossDay: false
    };
  }
}

export function formatSessionStartWithTiming(sessionId: string, timePlayedSec: number): string {
  // Keep for backwards compatibility, but this should be deprecated
  const data = formatSessionTimingData(sessionId, timePlayedSec);
  return `${data.dateDisplay} | ${data.timeRange} | ${data.sessionDuration} | ${data.timePlayed}`;
}

export function formatSessionStart(sessionId: string): string {
  // Keep original function for backwards compatibility
  return formatSessionStartWithTiming(sessionId, 0);
}

export function calculateSessionDuration(matches: any[]): number {
  if (matches.length === 0) {
    return 0;
  }

  const firstMatch = matches[matches.length - 1]; // Oldest match
  const lastMatch = matches[0]; // Newest match

  const firstMatchStart = new Date(firstMatch.start_time);
  const lastMatchEnd = new Date(new Date(lastMatch.start_time).getTime() + (Math.round(parseDuration(lastMatch.duration) / 1.7) * 1000));

  return Math.floor((lastMatchEnd.getTime() - firstMatchStart.getTime()) / 1000);
}

export function searchMatches(matches: Match[], searchTerm: string): Match[] {
  if (!searchTerm.trim()) {
    return matches;
  }

  const term = searchTerm.toLowerCase().trim();
  
  return matches.filter(match => {
    // Search in map name
    if (match.map?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in match description/game type
    if (match.description?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in diplomacy type
    if (match.diplomacy?.type?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in match ID
    if (match.match_id?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in player names
    if (match.players?.some(player => 
      player.name?.toLowerCase().includes(term)
    )) {
      return true;
    }
    
    // Search in civilizations
    if (match.players?.some(player => 
      typeof player.civ === 'string' && player.civ.toLowerCase().includes(term)
    )) {
      return true;
    }
    
    return false;
  });
}

export function createFlatMatchGroup(matches: Match[]): MatchGroup[] {
  if (!matches.length) {
    return [];
  }
  
  return [{
    date: `Search Results (${matches.length})`,
    matches: matches
  }];
}

// Utility: sort matches by start_time ISO string timestamp
export function sortMatchesByStart(matches: Match[], direction: 'asc' | 'desc' = 'desc'): Match[] {
  return [...matches].sort((a, b) => {
    const aTime = new Date(a.start_time).getTime();
    const bTime = new Date(b.start_time).getTime();
    return direction === 'desc' ? bTime - aTime : aTime - bTime;
  });
}

export function sortMatchGroupsByDate(groups: MatchGroup[], direction: 'asc' | 'desc' = 'desc'): MatchGroup[] {
  return [...groups].sort((a, b) => {
    const aTime = new Date(a.date.split('_')[0]).getTime();
    const bTime = new Date(b.date.split('_')[0]).getTime();
    return direction === 'desc' ? bTime - aTime : aTime - bTime;
  });
} 