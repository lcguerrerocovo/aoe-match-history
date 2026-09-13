/**
 * Ordinal rank for display: 8375th / 8375º / 8375. / 第8375.
 *
 * This is number formatting rather than copy, so it lives here instead of in
 * the locale files. Expressing it as a translation string does not work: the
 * English form needs a suffix that varies with the number (st/nd/rd/th) while
 * the others do not, so the locales would disagree on their placeholders.
 */

/** English suffix depends on the number, not just the locale. */
function englishSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function formatOrdinal(n: number, locale: string): string {
  const value = n.toLocaleString(locale);
  switch (locale.split('-')[0]) {
    case 'en':
      return `${value}${englishSuffix(n)}`;
    case 'es':
    case 'it':
    case 'pt':
      // Masculine ordinal indicator, the usual written form for a rank.
      return `${value}º`;
    case 'de':
      // German ordinals are written as the number followed by a period.
      return `${value}.`;
    case 'zh':
      // Chinese marks ordinals with a prefix.
      return `第${value}`;
    default:
      return value;
  }
}
