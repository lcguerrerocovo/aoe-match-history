import i18next, { type InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';
import it from './locales/it.json';

export const SUPPORTED_LANGUAGES = ['en', 'es', 'de', 'it'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Native names — never translated, since a user hunting for their language
 *  cannot read the currently active one. */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = Object.freeze({
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
});

export const LOCALSTORAGE_KEY = 'i18nextLng';

/** Shared by the singleton below and by tests, which build detached
 *  instances from it with `detection` disabled. */
export const i18nConfig: InitOptions = {
  resources: {
    en: { translation: en },
    es: { translation: es },
    de: { translation: de },
    it: { translation: it },
  },
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  // Collapse region variants: es-MX -> es
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
};

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...i18nConfig,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LOCALSTORAGE_KEY,
    },
  });

function syncHtmlLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
}

syncHtmlLang(i18next.resolvedLanguage ?? 'en');
i18next.on('languageChanged', syncHtmlLang);

export default i18next;
