import { describe, it, expect } from 'vitest';
import { localizeCivName, localizeMapName, GAME_NAME_LOCALES } from './gameNames';

describe('game name localization', () => {
  it('covers the locales the extractor emits', () => {
    expect([...GAME_NAME_LOCALES]).toEqual(['en', 'es', 'de', 'it', 'zh', 'pt']);
  });

  it.each([
    ['Britons', 'de', 'Briten'],
    ['Britons', 'it', 'Britanni'],
    ['Britons', 'pt', 'Bretões'],
    ['Aztec', 'es', 'Aztecas'],
  ])('localizes civ %s into %s', (civ, locale, expected) => {
    expect(localizeCivName(civ, locale)).toBe(expected);
  });

  it.each([
    ['BlackForest', 'de', 'Schwarzwald'],
    ['BlackForest', 'it', 'Foresta Nera'],
    ['Arabia', 'pt', 'Arábia'],
  ])('localizes map %s into %s', (map, locale, expected) => {
    expect(localizeMapName(map, locale)).toBe(expected);
  });

  it('accepts the English display form as well as the API spelling', () => {
    // Call sites often hold "Black Forest" by the time a name reaches the view.
    expect(localizeMapName('Black Forest', 'de')).toBe('Schwarzwald');
    expect(localizeMapName('BlackForest', 'de')).toBe('Schwarzwald');
  });

  it('falls back to the base language for a region variant', () => {
    expect(localizeCivName('Britons', 'de-AT')).toBe('Briten');
  });

  it('falls back to the canonical English name for an unknown civ or map', () => {
    // This is the state between a patch adding content and the next extraction.
    expect(localizeCivName('Atlanteans', 'de')).toBe('Atlanteans');
    expect(localizeMapName('SomeNewMap', 'de')).toBe('Some New Map');
  });

  it('returns English names unchanged for the en locale', () => {
    expect(localizeCivName('Aztec', 'en')).toBe('Aztecs');
    expect(localizeMapName('BlackForest', 'en')).toBe('Black Forest');
  });

  it('handles empty and numeric input the way the resolvers do', () => {
    expect(localizeCivName(null, 'de')).toBe('');
    expect(localizeCivName(42, 'de')).toBe('');
    expect(localizeMapName('', 'de')).toBe('Unknown');
  });
});
