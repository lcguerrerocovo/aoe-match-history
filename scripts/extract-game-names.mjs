#!/usr/bin/env node
/**
 * Extracts localized civilization and map names from an AoE2 DE install.
 *
 * The game ships one key-value string table per language. Two useful facts make
 * this a lookup rather than a translation job:
 *
 *   - A Relic API map ID IS the game's string ID, so all 168 maps resolve
 *     directly.
 *   - Civ names sit in one contiguous block, matched here by their English
 *     name (with a small alias table for the handful the API spells
 *     differently).
 *
 * Output is keyed by the API names the app already uses, so consumers never
 * touch string IDs. Only the names actually rendered are emitted — the raw
 * tables are ~8 MB across four languages versus ~19 KB for this.
 *
 * Re-run after a game patch that adds civs or maps, the same way
 * rl_api_mappings.json is maintained.
 *
 *   node scripts/extract-game-names.mjs [--resources <path>] [--out <path>]
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_RESOURCES = join(
  process.env.HOME ?? '',
  'Library/Application Support/CrossOver/Bottles/Windows 10/drive_c',
  'Program Files (x86)/Steam/steamapps/common/AoE2DE/resources'
);

/** Game language folder → the locale code this site uses. */
const LANGUAGES = {
  en: 'en',
  mx: 'es', // Latin American Spanish: the variant most AoE2 Spanish speakers play
  de: 'de',
  it: 'it',
  zh: 'zh', // Simplified (tw is Traditional)
  br: 'pt', // Brazilian Portuguese
};

/** API civ name → the name the game uses, where they disagree. */
const CIV_ALIASES = { Mayans: 'Maya' };

/** Civ names occupy a contiguous block; this brackets it generously. */
const CIV_BLOCK = { from: 10271, to: 10350 };

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function loadStrings(resources, lang) {
  const file = join(resources, lang, 'strings/key-value/key-value-strings-utf8.txt');
  if (!existsSync(file)) throw new Error(`missing string table: ${file}`);
  const table = new Map();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*(\d+)\s+"(.*)"\s*$/.exec(line);
    if (m) table.set(Number(m[1]), m[2]);
  }
  return table;
}

const normalize = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

function main() {
  const resources = arg('resources', DEFAULT_RESOURCES);
  const out = arg('out', join(ROOT, 'data/game-names.json'));

  if (!existsSync(resources)) {
    console.error(`AoE2 DE resources not found at:\n  ${resources}\n`);
    console.error('Pass --resources <path> pointing at the game\'s resources directory.');
    process.exit(1);
  }

  const tables = Object.fromEntries(
    Object.keys(LANGUAGES).map((lang) => [lang, loadStrings(resources, lang)])
  );
  const en = tables.en;
  const mappings = JSON.parse(readFileSync(join(ROOT, 'data/rl_api_mappings.json'), 'utf8'));

  // Maps: the API id is the string id.
  const mapIds = new Map();
  for (const [name, versions] of Object.entries(mappings.maps.aoe2)) {
    const id = versions['5'] ?? versions['4'] ?? versions['2'];
    if (en.has(id)) mapIds.set(name, id);
  }

  // Civs: match the API name against the English civ block.
  const byName = new Map();
  for (let id = CIV_BLOCK.from; id <= CIV_BLOCK.to; id++) {
    if (en.has(id)) byName.set(normalize(en.get(id)), id);
  }
  const civIds = new Map();
  for (const name of Object.keys(mappings.civs.aoe2)) {
    const n = normalize(CIV_ALIASES[name] ?? name);
    const id = byName.get(n) ?? byName.get(`${n}s`) ?? byName.get(n.replace(/s$/, ''));
    if (id) civIds.set(name, id);
  }

  const localize = (ids) => {
    const result = {};
    for (const [name, id] of ids) {
      const entry = {};
      for (const [lang, locale] of Object.entries(LANGUAGES)) {
        const value = tables[lang].get(id);
        if (value) entry[locale] = value;
      }
      result[name] = entry;
    }
    return result;
  };

  const payload = {
    description:
      'Localized civ and map names extracted from an AoE2 DE install by ' +
      'scripts/extract-game-names.mjs. Keyed by the names the Relic API uses. ' +
      'Regenerate after a patch that adds civs or maps.',
    locales: Object.values(LANGUAGES),
    civs: localize(civIds),
    maps: localize(mapIds),
  };

  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);

  const missingCivs = Object.keys(mappings.civs.aoe2).filter((c) => !civIds.has(c));
  const missingMaps = Object.keys(mappings.maps.aoe2).filter((m) => !mapIds.has(m));

  console.log(`civs  ${civIds.size}/${Object.keys(mappings.civs.aoe2).length}`);
  console.log(`maps  ${mapIds.size}/${Object.keys(mappings.maps.aoe2).length}`);
  console.log(`locales: ${Object.values(LANGUAGES).join(', ')}`);
  console.log(`wrote ${out}`);
  if (missingCivs.length) console.warn(`\nunmatched civs: ${missingCivs.join(', ')}`);
  if (missingMaps.length) console.warn(`unmatched maps: ${missingMaps.join(', ')}`);
  if (missingCivs.length || missingMaps.length) {
    console.warn('Add an alias to CIV_ALIASES, or check whether the game renamed them.');
  }
}

main();
