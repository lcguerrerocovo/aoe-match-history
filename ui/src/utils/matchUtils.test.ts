import { describe, it, expect } from 'vitest';
import {
  groupMatchesBySession,
  calculateSessionDuration,
  formatSessionStart,
  countByDiplomacy,
  sortMatchesByStart,
  searchMatches,
  createFlatMatchGroup,
  sortMatchGroupsByDate,
  formatDuration,
  formatDateTime,
  formatDayDate,
  formatSessionTimingData,
  sumDurations,
} from './matchUtils';
import type { Match, Player } from '../types/match';

// Mock Data
const mockPlayer = (userId: string, ratingChange: number | null, winner: boolean): Player => ({
  user_id: userId,
  rating_change: ratingChange,
  winner: winner,
  name: `Player ${userId}`,
  civ: 'Britons',
  number: 1,
  color_id: 1,
  rating: 1000,
});

const mockMatch = (start: string, duration: number, players: Player[] = [], diplomacyType = '1v1'): Match => ({
  match_id: 'mock-match-' + start,
  start_time: start,
  duration: duration,
  map: 'Arabia',
  diplomacy: { type: diplomacyType, team_size: '1' },
  options: '',
  description: 'RM 1v1',
  teams: [],
  players: players,
  winning_team: 1,
});

describe('matchUtils', () => {
  describe('groupMatchesBySession', () => {
    it('should group matches within one hour into a single session', () => {
      const matches = [
        mockMatch('2023-01-01T13:00:00Z', 1800), // 1:00 PM, 30min duration
        mockMatch('2023-01-01T12:30:00Z', 1200), // 12:30 PM, 20min duration
        mockMatch('2023-01-01T12:00:00Z', 1500), // 12:00 PM, 25min duration
      ];
      const sessions = groupMatchesBySession(matches);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].matches).toHaveLength(3);
    });

    it('should create two sessions for matches more than an hour apart', () => {
      const matches = [
        mockMatch('2023-01-01T15:00:00Z', 1800), // Session 1
        mockMatch('2023-01-01T12:30:00Z', 1200), // Session 2
        mockMatch('2023-01-01T12:00:00Z', 1500), // Session 2
      ];
      const sessions = groupMatchesBySession(matches);
      expect(sessions).toHaveLength(2);
      expect(sessions[0].matches).toHaveLength(1); // Newest session
      expect(sessions[1].matches).toHaveLength(2); // Older session
    });

    it('should handle sessions that span across midnight', () => {
      const matches = [
        mockMatch('2023-01-02T00:15:00Z', 1800), // Jan 2, 12:15 AM
        mockMatch('2023-01-01T23:45:00Z', 1200), // Jan 1, 11:45 PM
      ];
      const sessions = groupMatchesBySession(matches);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].matches).toHaveLength(2);
    });

    it('should correctly generate the session ID with full start and end times', () => {
        const matches = [
          mockMatch('2023-01-01T13:00:00Z', 1800), // Newest, real duration 3060s, ends at 13:51:00
          mockMatch('2023-01-01T12:15:00Z', 1500), // Oldest, starts at 12:15
        ];
        const sessions = groupMatchesBySession(matches);
        const expectedStart = new Date('2023-01-01T12:15:00Z').toISOString();
        const realDuration = Math.round(1800);
        const expectedEnd = new Date(new Date('2023-01-01T13:00:00Z').getTime() + realDuration * 1000).toISOString();
        expect(sessions[0].date).toBe(`${expectedStart}_${expectedEnd}`);
      });
  });

  describe('calculateSessionDuration', () => {
    it('should calculate the total duration from the start of the first match to the end of the last', () => {
      const matches = [
        mockMatch('2023-01-01T13:00:00Z', 1800), // Game duration 1800s, ends at 13:30:00
        mockMatch('2023-01-01T12:00:00Z', 1500), // Starts at 12:00
      ];
      const duration = calculateSessionDuration(matches);
      // Duration = (13:30:00 - 12:00:00) = 5400s
      expect(duration).toBe(5400);
    });
  });

  describe('formatSessionStart', () => {
    it('should format a same-day session correctly', () => {
      const startDate = new Date('2023-06-20T21:00:00Z');
      const endDate = new Date('2023-06-20T22:30:00Z');
      const sessionId = `${startDate.toISOString()}_${endDate.toISOString()}`;
      
      const formatted = formatSessionStart(sessionId);
      // This is a bit tricky as it depends on the test runner's locale.
      // We are just checking if it doesn't throw and produces a string.
      expect(typeof formatted).toBe('string');
    });
  });

  describe('countByDiplomacy', () => {
    it('should correctly sum wins, losses, and elo changes', () => {
      const profileId = '123';
      const matches = [
        mockMatch('2023-01-01T12:00:00Z', 1800, [
          mockPlayer('123', 15, true),
          mockPlayer('456', -15, false),
        ], '1v1'),
        mockMatch('2023-01-01T13:00:00Z', 1800, [
          mockPlayer('123', -12, false),
          mockPlayer('789', 12, true),
        ], '1v1'),
        mockMatch('2023-01-01T14:00:00Z', 1800, [
          mockPlayer('123', 10, true),
          mockPlayer('101', -10, false),
        ], 'RM Team'),
      ];

      const result = countByDiplomacy(matches, profileId);

      expect(result['1v1'].wins).toBe(1);
      expect(result['1v1'].losses).toBe(1);
      expect(result['1v1'].eloChange).toBe(3);

      expect(result['RM Team'].wins).toBe(1);
      expect(result['RM Team'].losses).toBe(0);
      expect(result['RM Team'].eloChange).toBe(10);
    });
  });

  describe('sortMatchesByStart', () => {
    it('should sort matches descending (newest first) by default', () => {
      const m1 = mockMatch('2023-01-01T10:00:00Z', 1000);
      const m2 = mockMatch('2023-01-01T12:00:00Z', 1000);
      const m3 = mockMatch('2023-01-01T11:00:00Z', 1000);
      const sorted = sortMatchesByStart([m1, m2, m3]);
      expect(sorted[0]).toBe(m2);
      expect(sorted[1]).toBe(m3);
      expect(sorted[2]).toBe(m1);
    });

    it('should sort matches ascending (oldest first) when direction is "asc"', () => {
      const m1 = mockMatch('2023-01-01T10:00:00Z', 1000);
      const m2 = mockMatch('2023-01-01T12:00:00Z', 1000);
      const m3 = mockMatch('2023-01-01T11:00:00Z', 1000);
      const sorted = sortMatchesByStart([m1, m2, m3], 'asc');
      expect(sorted[0]).toBe(m1);
      expect(sorted[1]).toBe(m3);
      expect(sorted[2]).toBe(m2);
    });
  });

  describe('searchMatches', () => {
    const matchWithDetails = (overrides: Partial<Match> = {}): Match => ({
      ...mockMatch('2023-01-01T12:00:00Z', 1800),
      ...overrides,
    });

    it('should return all matches when search term is empty', () => {
      const matches = [matchWithDetails(), matchWithDetails()];
      expect(searchMatches(matches, '')).toHaveLength(2);
      expect(searchMatches(matches, '   ')).toHaveLength(2);
    });

    it('should filter by map name (case-insensitive)', () => {
      const matches = [
        matchWithDetails({ map: 'Arabia' }),
        matchWithDetails({ map: 'Black Forest' }),
      ];
      expect(searchMatches(matches, 'arabia')).toHaveLength(1);
      expect(searchMatches(matches, 'FOREST')).toHaveLength(1);
    });

    it('should filter by description', () => {
      const matches = [
        matchWithDetails({ description: 'RM 1v1' }),
        matchWithDetails({ description: 'EW Team' }),
      ];
      expect(searchMatches(matches, 'ew')).toHaveLength(1);
    });

    it('should filter by diplomacy type', () => {
      const matches = [
        matchWithDetails({ diplomacy: { type: 'RM 1v1', team_size: '1' } }),
        matchWithDetails({ diplomacy: { type: 'EW Team', team_size: '2' } }),
      ];
      expect(searchMatches(matches, 'ew team')).toHaveLength(1);
    });

    it('should filter by match_id', () => {
      const matches = [
        matchWithDetails({ match_id: '12345' }),
        matchWithDetails({ match_id: '67890' }),
      ];
      expect(searchMatches(matches, '123')).toHaveLength(1);
    });

    it('should filter by player name', () => {
      const matches = [
        matchWithDetails({
          players: [
            mockPlayer('1', 10, true),
            { ...mockPlayer('2', -10, false), name: 'TheViper' },
          ],
        }),
        matchWithDetails({
          players: [mockPlayer('3', 5, true)],
        }),
      ];
      expect(searchMatches(matches, 'viper')).toHaveLength(1);
    });

    it('should filter by civ name (string civs only)', () => {
      const matches = [
        matchWithDetails({
          players: [
            { ...mockPlayer('1', 10, true), civ: 'Britons' },
          ],
        }),
        matchWithDetails({
          players: [
            { ...mockPlayer('2', -10, false), civ: 'Franks' },
          ],
        }),
      ];
      expect(searchMatches(matches, 'britons')).toHaveLength(1);
    });

    it('should not match numeric civ IDs', () => {
      const matches = [
        matchWithDetails({
          players: [
            { ...mockPlayer('1', 10, true), civ: 10 as unknown as string },
          ],
        }),
      ];
      expect(searchMatches(matches, '10')).toHaveLength(0);
    });
  });

  describe('createFlatMatchGroup', () => {
    it('should wrap matches in a single flat group', () => {
      const matches = [
        mockMatch('2023-01-01T12:00:00Z', 1800),
        mockMatch('2023-01-01T13:00:00Z', 1800),
      ];
      const groups = createFlatMatchGroup(matches);
      expect(groups).toHaveLength(1);
      expect(groups[0].date).toBe('flat');
      expect(groups[0].matches).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      expect(createFlatMatchGroup([])).toEqual([]);
    });
  });

  describe('sortMatchGroupsByDate', () => {
    it('should sort groups descending by default', () => {
      const groups = [
        { date: '2023-01-01T10:00:00Z_2023-01-01T12:00:00Z', matches: [] },
        { date: '2023-01-03T10:00:00Z_2023-01-03T12:00:00Z', matches: [] },
        { date: '2023-01-02T10:00:00Z_2023-01-02T12:00:00Z', matches: [] },
      ];
      const sorted = sortMatchGroupsByDate(groups);
      expect(sorted[0].date).toContain('2023-01-03');
      expect(sorted[1].date).toContain('2023-01-02');
      expect(sorted[2].date).toContain('2023-01-01');
    });

    it('should sort groups ascending when specified', () => {
      const groups = [
        { date: '2023-01-03T10:00:00Z_2023-01-03T12:00:00Z', matches: [] },
        { date: '2023-01-01T10:00:00Z_2023-01-01T12:00:00Z', matches: [] },
      ];
      const sorted = sortMatchGroupsByDate(groups, 'asc');
      expect(sorted[0].date).toContain('2023-01-01');
      expect(sorted[1].date).toContain('2023-01-03');
    });

    it('should not mutate the original array', () => {
      const groups = [
        { date: '2023-01-02T10:00:00Z_end', matches: [] },
        { date: '2023-01-01T10:00:00Z_end', matches: [] },
      ];
      const sorted = sortMatchGroupsByDate(groups);
      expect(sorted).not.toBe(groups);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only when under an hour', () => {
      expect(formatDuration(300)).toBe('5m');
      expect(formatDuration(0)).toBe('0m');
      expect(formatDuration(59)).toBe('0m');
      expect(formatDuration(60)).toBe('1m');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h 0m');
      expect(formatDuration(5400)).toBe('1h 30m');
    });
  });

  describe('formatDateTime', () => {
    it('should return a locale string for valid ISO input', () => {
      const result = formatDateTime('2023-06-20T15:30:00Z');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return the input for invalid date strings', () => {
      expect(formatDateTime('not-a-date')).toBe('not-a-date');
    });
  });

  describe('formatDayDate', () => {
    it('should format a valid date string', () => {
      const result = formatDayDate('2023-06-20');
      expect(typeof result).toBe('string');
      // Should contain "Jun" and "20" and "2023" regardless of locale
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/20/);
      expect(result).toMatch(/2023/);
    });

    it('should return the input for invalid date strings', () => {
      expect(formatDayDate('invalid')).toBe('invalid');
    });
  });

  describe('formatSessionTimingData', () => {
    it('should return structural data for a same-day session', () => {
      const start = '2023-06-20T14:00:00Z';
      const end = '2023-06-20T16:30:00Z';
      const sessionId = `${start}_${end}`;

      const result = formatSessionTimingData(sessionId, 7200);

      expect(result.isCrossDay).toBe(false);
      expect(result.timePlayed).toBe('2h 0m');
      expect(result.sessionDuration).toBe('2h 30m');
      expect(result.dateDisplay.length).toBeGreaterThan(0);
      expect(result.timeRange.length).toBeGreaterThan(0);
    });

    it('should detect cross-day sessions', () => {
      // Use dates far enough apart that they span days in any timezone
      const start = '2023-06-20T10:00:00Z';
      const end = '2023-06-21T14:00:00Z';
      const sessionId = `${start}_${end}`;

      const result = formatSessionTimingData(sessionId, 5400);

      expect(result.isCrossDay).toBe(true);
      expect(result.timePlayed).toBe('1h 30m');
      // 28 hours
      expect(result.sessionDuration).toBe('28h 0m');
    });

    it('should handle fallback for single-value session ID', () => {
      const result = formatSessionTimingData('2023-06-20T14:00:00Z', 3600);

      expect(result.isCrossDay).toBe(false);
      expect(result.timePlayed).toBe('1h 0m');
      expect(result.timeRange).toBe('');
      expect(result.sessionDuration).toBe('');
    });

    it('should handle invalid date strings gracefully', () => {
      const result = formatSessionTimingData('invalid_alsoInvalid', 600);

      expect(result.isCrossDay).toBe(false);
      expect(result.dateDisplay).toBe('invalid_alsoInvalid');
      expect(result.timeRange).toBe('');
      expect(result.timePlayed).toBe('10m');
    });
  });

  describe('sumDurations', () => {
    it('should sum game and real durations for numeric durations', () => {
      const matches = [
        mockMatch('2023-01-01T12:00:00Z', 1800),
        mockMatch('2023-01-01T13:00:00Z', 2400),
      ];
      const result = sumDurations(matches);
      expect(result.totalGame).toBe(4200);
      expect(result.totalReal).toBe(4200);
    });

    it('should return zeros for empty array', () => {
      const result = sumDurations([]);
      expect(result.totalGame).toBe(0);
      expect(result.totalReal).toBe(0);
    });
  });
}); 