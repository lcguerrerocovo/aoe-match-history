import i18n from './index';

/** Active BCP-47 locale for Intl formatting. Falls back to 'en' before init. */
export function getLocale(): string {
  return i18n.resolvedLanguage ?? 'en';
}
