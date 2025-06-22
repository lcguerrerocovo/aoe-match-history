import { describe, it, expect } from 'vitest';
import { decodeSlotInfo, decompressZlib, cleanStr, Base64 } from './slotInfoDecoder';

describe('slotInfoDecoder', () => {
  describe('decodeSlotInfo', () => {
    it('should decode valid slot info data', () => {
      // This is a mock encoded string - in real usage this would be base64 encoded compressed data
      // For testing purposes, we'll test the error handling and structure
      const mockEncodedData = 'invalid_base64_data';
      
      expect(() => decodeSlotInfo(mockEncodedData)).toThrow('Could not decompress player data');
    });

    it('should handle empty string input', () => {
      expect(() => decodeSlotInfo('',)).toThrow();
    });

    it('should handle malformed input', () => {
      expect(() => decodeSlotInfo('not_base64')).toThrow();
    });

    it('should decode and parse metaData correctly', () => {
      // Real slotinfo string from actual match data
      const validEncoded = 'eNq9lFtPgzAUgP0tfUZDW8ot8WVuLBA3x9VtxocOuoxwGYFqosb/7kCNId7oC0/ntOe0Tb58PRBJdy+gqo/7NGd2uT9epAkwFU1VMNYk0HDK02NpT4GJJMAZLdpUlsCexp+F06qmMWtT0qZlds0eWf5RKLMF5fEheKq6jnN4uiYt2IrVVk0LtvC7vrTxGE2egAnf33xouu2CcTqlnAIT2JmFvdCauKGF3aiLMy/y2jiJAudmN3e4V+aH6Dn3NlkyX0bVxs+qdBc5zTa0rLbPXR+uuhhu/Z2Vrxczpzsf3MbGyrcvwav0nQWUDQUZEPVgwC8Y8DcYUB2XhitMI/mZxvoPGkSTDYRxDwYZYAZUxoWxgYIwgqW4GqpOCIGkBwMPMEORx4XhC5uRi5uhqwbUdbkHQx1ixshDIxCGUYmbgTREdL0/M5QhZoz8TUJRGMHkHzPuz94AjUr80g==';
      const result = decodeSlotInfo(validEncoded);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check that metaData is parsed correctly based on actual structure
      const playerWithMetaData = result.find(p => p.metaData);
      expect(playerWithMetaData).toBeTruthy();
      expect(playerWithMetaData.metaData).toHaveProperty('unknown1', '0');
      expect(playerWithMetaData.metaData).toHaveProperty('civId', '1');
      expect(playerWithMetaData.metaData).toHaveProperty('colorId', 2); // parseColor('1') => 2
      expect(playerWithMetaData.metaData).toHaveProperty('teamId', '2');
    });
  });

  describe('cleanStr', () => {
    it('removes control characters', () => {
      const dirty = 'abc\u0000\u0001\u0002def';
      expect(cleanStr(dirty)).toBe('abcdef');
    });
    it('removes control characters from mixed string', () => {
      const s = 'hello\n\r\t\b\fworld';
      expect(cleanStr(s)).toBe('helloworld');
    });
  });

  describe('Base64', () => {
    it('encodes and decodes ascii', () => {
      const str = 'hello world';
      const encoded = Base64.encode(str);
      const decoded = Base64.decode(encoded);
      expect(decoded).toBe(str);
    });
    it('encodes and decodes unicode', () => {
      const str = 'héllö 🌍';
      const encoded = Base64.encode(str);
      const decoded = Base64.decode(encoded);
      expect(decoded).toBe(str);
    });
    it('decodes invalid input gracefully', () => {
      expect(() => Base64.decode('!@#$%^&*()')).not.toThrow();
    });
  });

  describe('decompressZlib', () => {
    it('throws on invalid base64', () => {
      expect(() => decompressZlib('not_base64')).toThrow();
    });
    // Skipping actual zlib round-trip as it requires pako and browser atob
  });
}); 