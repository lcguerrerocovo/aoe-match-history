import { describe, it, expect } from 'vitest';
import { toISODateString, parseDuration, formatDuration } from './timeUtils';

describe('timeUtils', () => {
  describe('toISODateString', () => {
    it('should convert UTC date strings to ISO format', () => {
      expect(toISODateString('2023-01-01 12:00 UTC')).toBe('2023-01-01T12:00:00Z');
      expect(toISODateString('2023-01-01 12:00:30 UTC')).toBe('2023-01-01T12:00:30Z');
    });

    it('should return unchanged string if no UTC', () => {
      expect(toISODateString('2023-01-01T12:00:00Z')).toBe('2023-01-01T12:00:00Z');
      expect(toISODateString('2023-01-01 12:00')).toBe('2023-01-01 12:00');
    });
  });

  describe('parseDuration', () => {
    it('should parse HH:MM:SS format', () => {
      expect(parseDuration('01:30:45')).toBe(5445); // 1h 30m 45s
      expect(parseDuration('00:05:30')).toBe(330);  // 5m 30s
    });

    it('should handle numbers', () => {
      expect(parseDuration(3600)).toBe(3600);
      expect(parseDuration(0)).toBe(0);
    });

    it('should handle invalid input', () => {
      expect(parseDuration('invalid')).toBe(0);
      expect(parseDuration('')).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('should handle hours', () => {
      expect(formatDuration(3661)).toBe('01:01:01');
      expect(formatDuration(7200)).toBe('02:00:00');
    });
  });
}); 