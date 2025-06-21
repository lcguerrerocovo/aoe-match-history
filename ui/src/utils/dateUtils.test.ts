import { describe, it, expect } from 'vitest';
import { toISODateString } from './dateUtils';

describe('dateUtils', () => {
  describe('toISODateString', () => {
    it('should convert UTC date string with seconds', () => {
      const input = '2024-01-15 14:30:45 UTC';
      const expected = '2024-01-15T14:30:45Z';
      expect(toISODateString(input)).toBe(expected);
    });

    it('should add seconds when missing', () => {
      const input = '2024-01-15 14:30 UTC';
      const expected = '2024-01-15T14:30:00Z';
      expect(toISODateString(input)).toBe(expected);
    });

    it('should return unchanged string without UTC', () => {
      const input = '2024-01-15T14:30:45Z';
      expect(toISODateString(input)).toBe(input);
    });

    it('should handle non-UTC date strings', () => {
      const input = '2024-01-15 14:30:45';
      expect(toISODateString(input)).toBe(input);
    });
  });
}); 