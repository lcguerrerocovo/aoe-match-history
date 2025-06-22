import { describe, it, expect } from 'vitest';
import { decompressZlib, cleanStr, Base64 } from './slotInfoDecoder';

// parsePlayerMetadata is not exported, so we need to test it indirectly or temporarily export for test
// For now, we will test cleanStr, decompressZlib, and Base64 utilities

describe('slotInfoDecoder utils', () => {
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