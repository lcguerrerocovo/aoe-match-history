import { describe, expect, it } from 'vitest';
import { getCivAssetFilename, normalizeCivDisplayName } from './civNameResolver';

describe('civNameResolver', () => {
  it('normalizes display-only civ name variants', () => {
    expect(normalizeCivDisplayName('Aztecs')).toBe('Aztec');
    expect(normalizeCivDisplayName('LacViet')).toBe('Lac Viet');
    expect(normalizeCivDisplayName('Mapuche')).toBe('Mapuche');
  });

  it('does not decode numeric civ IDs in the UI', () => {
    expect(normalizeCivDisplayName(59)).toBe('');
    expect(normalizeCivDisplayName('59')).toBe('');
    expect(getCivAssetFilename(59, 'emblem')).toBe('unknown.png');
  });

  it('resolves asset filename differences from canonical civ names', () => {
    expect(getCivAssetFilename('Mapuche', 'emblem')).toBe('mapuche.png');
    expect(getCivAssetFilename('Aztec', 'emblem')).toBe('aztecs.png');
    expect(getCivAssetFilename('Hindustanis', 'icon')).toBe('indians.png');
    expect(getCivAssetFilename('Hindustanis', 'emblem')).toBe('hindustanis.png');
  });
});
