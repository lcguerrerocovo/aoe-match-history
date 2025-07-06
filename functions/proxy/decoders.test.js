const { decodeOptions, decodeSlotInfo, decompressZlib, doubleBase64Decode } = require('./decoders');

describe('decoders util', () => {
  describe('decodeOptions', () => {
    it('returns empty object for invalid input', () => {
      expect(decodeOptions('invalid')).toEqual({});
    });
    it('returns empty object for empty string', () => {
      expect(decodeOptions('')).toEqual({});
    });
    it('returns empty object for malformed base64', () => {
      expect(decodeOptions('not_base64_string')).toEqual({});
    });
    it('handles non-string input gracefully', () => {
      // @ts-ignore intentional invalid input
      expect(decodeOptions(null)).toEqual({});
    });
  });

  describe('decodeSlotInfo', () => {
    it('throws on invalid base64', () => {
      expect(() => decodeSlotInfo('not_base64')).toThrow();
    });

    it('decodes a real slotinfo string and parses metaData', () => {
      // Same real slotinfo payload used in legacy UI tests
      const validEncoded =
        'eNq9lFtPgzAUgP0tfUZDW8ot8WVuLBA3x9VtxocOuoxwGYFqosb/7kCNId7oC0/ntOe0Tb58PRBJdy+gqo/7NGd2uT9epAkwFU1VMNYk0HDK02NpT4GJJMAZLdpUlsCexp+F06qmMWtT0qZlds0eWf5RKLMF5fEheKq6jnN4uiYt2IrVVk0LtvC7vrTxGE2egAnf33xouu2CcTqlnAIT2JmFvdCauKGF3aiLMy/y2jiJAudmN3e4V+aH6Dn3NlkyX0bVxs+qdBc5zTa0rLbPXR+uuhhu/Z2Vrxczpzsf3MbGyrcvwav0nQWUDQUZEPVgwC8Y8DcYUB2XhitMI/mZxvoPGkSTDYRxDwYZYAZUxoWxgYIwgqW4GqpOCIGkBwMPMEORx4XhC5uRi5uhqwbUdbkHQx1ixshDIxCGUYmbgTREdL0/M5QhZoz8TUJRGMHkHzPuz94AjUr80g==';

      const players = decodeSlotInfo(validEncoded);
      expect(Array.isArray(players)).toBe(true);
      expect(players.length).toBeGreaterThan(0);

      const playerWithMeta = players.find(p => p.metaData);
      expect(playerWithMeta).toBeTruthy();
      expect(playerWithMeta.metaData).toHaveProperty('civId');
      expect(playerWithMeta.metaData).toHaveProperty('colorId');
      expect(playerWithMeta.metaData).toHaveProperty('teamId');
    });

    it('throws on empty string', () => {
      expect(() => decodeSlotInfo('')).toThrow();
    });
  });

  describe('decompressZlib', () => {
    it('throws on invalid base64', () => {
      expect(() => decompressZlib('not_base64')).toThrow();
    });
  });

  describe('doubleBase64Decode', () => {
    it('decodes two-layer base64', () => {
      const original = 'hello';
      const doubleEncoded = Buffer.from(Buffer.from(original).toString('base64')).toString('base64');
      expect(doubleBase64Decode(doubleEncoded)).toBe(original);
    });
  });
}); 