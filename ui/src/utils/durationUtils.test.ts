import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration } from './durationUtils';

describe('durationUtils', () => {
  describe('parseDuration', () => {
    it('should parse HH:MM:SS format', () => {
      expect(parseDuration('01:30:45')).toBe(5445); // 1*3600 + 30*60 + 45
    });

    it('should handle numeric input', () => {
      expect(parseDuration(3600)).toBe(3600);
    });

    it('should return 0 for invalid string', () => {
      expect(parseDuration('invalid')).toBe(0);
    });

    it('should return 0 for non-string/non-number input', () => {
      // @ts-ignore - Testing invalid input
      expect(parseDuration(null)).toBe(0);
    });

    it('should handle short duration', () => {
      expect(parseDuration('00:05:30')).toBe(330); // 5*60 + 30
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(65)).toBe('01:05'); // 1 minute 5 seconds
      expect(formatDuration(3661)).toBe('01:01:01'); // 1 hour 1 minute 1 second
      expect(formatDuration(0)).toBe('00:00'); // 0 seconds
    });

    it('should handle hours correctly', () => {
      expect(formatDuration(3600)).toBe('01:00:00'); // 1 hour
      expect(formatDuration(7325)).toBe('02:02:05'); // 2 hours 2 minutes 5 seconds
    });

    it('should handle large durations', () => {
      expect(formatDuration(36661)).toBe('10:11:01'); // 10 hours 11 minutes 1 second
    });

    it('should pad single digits with zeros', () => {
      expect(formatDuration(305)).toBe('05:05'); // 5 minutes 5 seconds
      expect(formatDuration(3605)).toBe('01:00:05'); // 1 hour 5 seconds
    });
  });
}); 