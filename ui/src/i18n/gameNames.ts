import gameNames from './game-names.json';
import { normalizeCivDisplayName } from '../utils/civNameResolver';
import { normalizeMapDisplayName } from '../utils/mapNameResolver';

/**
 * Localized civ and map names, taken from the game's own string tables so they
 * match what a player sees in their client.
 *
 * This is presentation only. The canonical English names stay in place
 * everywhere else, because they are load-bearing: `resolveMapFilename` derives
 * CDN asset paths from them, `getCivAssetFilename` does the same for icons, and
 * `App.tsx` compares them to decide which matches a filter selects. Localising
 * at the source would break images, filters and URL state together.
 */

type NameEntry = Record<string, string>;

const CIVS = gameNames.civs as Record<string, NameEntry>;
const MAPS = gameNames.maps as Record<string, NameEntry>;

/** Locales the extracted data actually covers. */
export const GAME_NAME_LOCALES: readonly string[] = gameNames.locales;

const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Lookups keyed loosely, since the API spells names inconsistently. */
function buildIndex(source: Record<string, NameEntry>): Map<string, NameEntry> {
  const index = new Map<string, NameEntry>();
  for (const [canonical, entry] of Object.entries(source)) {
    index.set(key(canonical), entry);
    // Also index the English display form, which is what most call sites hold
    // by the time a name reaches the view.
    if (entry.en) index.set(key(entry.en), entry);
  }
  return index;
}

const civIndex = buildIndex(CIVS);
const mapIndex = buildIndex(MAPS);

function lookup(
  index: Map<string, NameEntry>,
  name: string | number | null | undefined,
  locale: string,
  fallback: (n: string | number | null | undefined) => string
): string {
  const english = fallback(name);
  if (!name) return english;

  const entry = index.get(key(String(name))) ?? index.get(key(english));
  if (!entry) return english;

  // Fall back through the base language (es-MX → es) before giving up.
  return entry[locale] ?? entry[locale.split('-')[0]] ?? entry.en ?? english;
}

/**
 * Civilization name for display. Falls back to the canonical English name when
 * the civ is missing from the extracted data — which happens between a game
 * patch adding a civ and the next run of scripts/extract-game-names.mjs.
 */
export function localizeCivName(
  name: string | number | null | undefined,
  locale: string
): string {
  return lookup(civIndex, name, locale, normalizeCivDisplayName);
}

/** Map name for display. Same fallback behaviour as `localizeCivName`. */
export function localizeMapName(
  name: string | null | undefined,
  locale: string
): string {
  return lookup(mapIndex, name, locale, (n) => normalizeMapDisplayName(n as string | null | undefined));
}
