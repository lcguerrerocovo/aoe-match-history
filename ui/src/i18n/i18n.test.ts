import { describe, it, expect } from 'vitest';
import { createInstance, type i18n as I18nType } from 'i18next';
import { i18nConfig, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from './index';

async function freshInstance(lng: string): Promise<I18nType> {
  const inst = createInstance();
  await inst.init({ ...i18nConfig, lng, detection: undefined });
  return inst;
}

describe('i18n configuration', () => {
  it('supports exactly en, es, de, it', () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(['en', 'es', 'de', 'it']);
  });

  it('names every language natively', () => {
    expect(LANGUAGE_NAMES).toEqual({
      en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano',
    });
  });

  it('falls back to en for an unsupported language', async () => {
    const inst = await freshInstance('pt-BR');
    expect(inst.resolvedLanguage).toBe('en');
    expect(inst.t('common.loading')).toBe('Loading...');
  });

  it.each([
    ['es-MX', 'es'],
    ['de-AT', 'de'],
    ['it-CH', 'it'],
  ])('collapses region variant %s to %s', async (input, expected) => {
    const inst = await freshInstance(input);
    expect(inst.resolvedLanguage).toBe(expected);
  });
});

describe('pluralization', () => {
  const expected: Record<string, [string, string, string]> = {
    en: ['0 matches', '1 match', '2 matches'],
    es: ['0 partidas', '1 partida', '2 partidas'],
    de: ['0 Partien', '1 Partie', '2 Partien'],
    it: ['0 partite', '1 partita', '2 partite'],
  };

  it.each(SUPPORTED_LANGUAGES)('resolves live.count for %s at n=0,1,2', async (lng) => {
    const inst = await freshInstance(lng);
    const got = [0, 1, 2].map(n => inst.t('live.count', { count: n }));
    expect(got).toEqual(expected[lng]);
  });
});
