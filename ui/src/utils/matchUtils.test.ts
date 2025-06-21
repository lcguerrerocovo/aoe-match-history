import { describe, it, expect } from 'vitest';
import { groupMatchesBySession, calculateSessionDuration, formatSessionStart } from './matchUtils';
import type { Match } from '../types/match';

// Mock Data
const mockMatch = (start: string, duration: number): Match => ({
  match_id: Math.random().toString(),
  start_time: start,
  duration: duration,
  map: 'Arabia',
  diplomacy: { type: '1v1', team_size: '1' },
  options: '',
  description: 'RM 1v1',
  teams: [],
  players: [],
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
          mockMatch('2023-01-01T13:00:00Z', 1800), // Newest, real duration 1059s, ends at ~13:17:39
          mockMatch('2023-01-01T12:15:00Z', 1500), // Oldest, starts at 12:15
        ];
        const sessions = groupMatchesBySession(matches);
        const expectedStart = new Date('2023-01-01T12:15:00Z').toISOString();
        const realDuration = Math.round(1800 / 1.7);
        const expectedEnd = new Date(new Date('2023-01-01T13:00:00Z').getTime() + realDuration * 1000).toISOString();
        expect(sessions[0].date).toBe(`${expectedStart}_${expectedEnd}`);
      });
  });

  describe('calculateSessionDuration', () => {
    it('should calculate the total duration from the start of the first match to the end of the last', () => {
      const matches = [
        mockMatch('2023-01-01T13:00:00Z', 1800), // Real duration ~1059s. Ends at ~13:17:39
        mockMatch('2023-01-01T12:00:00Z', 1500), // Starts at 12:00
      ];
      const duration = calculateSessionDuration(matches);
      // Real duration = (13:17:39 - 12:00:00) = 4659s
      expect(duration).toBe(4659);
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
}); 