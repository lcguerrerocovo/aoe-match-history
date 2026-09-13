import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeCivName, localizeMapName } from './gameNames';

/**
 * Civ and map names bound to the active UI language.
 *
 * Components should use this for anything they render; everything else — asset
 * paths, filter comparisons, URL state — keeps the canonical English name.
 */
export function useGameNames() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  const civName = useCallback(
    (name: string | number | null | undefined) => localizeCivName(name, locale),
    [locale]
  );

  const mapName = useCallback(
    (name: string | null | undefined) => localizeMapName(name, locale),
    [locale]
  );

  return { civName, mapName, locale };
}
