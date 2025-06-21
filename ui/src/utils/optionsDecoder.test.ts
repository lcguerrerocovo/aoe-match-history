import { describe, it, expect } from 'vitest';
import { decodeOptions } from './optionsDecoder';

describe('optionsDecoder', () => {
  describe('decodeOptions', () => {
    it('should return empty object for invalid input', () => {
      const result = decodeOptions('invalid_data');
      expect(result).toEqual({});
    });

    it('should return empty object for empty string', () => {
      const result = decodeOptions('');
      expect(result).toEqual({});
    });

    it('should handle malformed base64', () => {
      const result = decodeOptions('not_base64_string');
      expect(result).toEqual({});
    });

    it('should handle non-string input gracefully', () => {
      // @ts-ignore - Testing invalid input
      const result = decodeOptions(null);
      expect(result).toEqual({});
    });
  });
}); 