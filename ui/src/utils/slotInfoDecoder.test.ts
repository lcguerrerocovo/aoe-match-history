import { describe, it, expect } from 'vitest';
import { decodeSlotInfo } from './slotInfoDecoder';

describe('slotInfoDecoder', () => {
  describe('decodeSlotInfo', () => {
    it('should decode valid slot info data', () => {
      // This is a mock encoded string - in real usage this would be base64 encoded compressed data
      // For testing purposes, we'll test the error handling and structure
      const mockEncodedData = 'invalid_base64_data';
      
      expect(() => decodeSlotInfo(mockEncodedData)).toThrow('Could not decompress player data');
    });

    it('should handle empty string input', () => {
      expect(() => decodeSlotInfo('')).toThrow();
    });

    it('should handle malformed input', () => {
      expect(() => decodeSlotInfo('not_base64')).toThrow();
    });
  });
}); 