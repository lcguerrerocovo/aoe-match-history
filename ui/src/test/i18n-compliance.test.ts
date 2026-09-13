import { promises as fs } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import process from 'node:process';

import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import de from '../i18n/locales/de.json';
// Aliased: a bare `it` would shadow Vitest's `it`.
import itLocale from '../i18n/locales/it.json';
import pt from '../i18n/locales/pt.json';
import zh from '../i18n/locales/zh.json';

const LOCALES: Record<string, unknown> = { es, de, it: itLocale, pt, zh };
const COMPONENTS_DIR = join(process.cwd(), 'src/components');

const SKIP_FILES = [
  // Inline SVG geometry, not user copy
  'Watermark.tsx',
];

async function componentFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await componentFiles(full));
    else if (/\.tsx$/.test(e.name) && !/\.cy\.|\.test\./.test(e.name) && !SKIP_FILES.includes(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Copy that is deliberately never translated. */
const ALLOWED_LITERALS = [
  // Game-mode abbreviations
  'RM 1v1', 'RM Team', 'EW 1v1', 'EW Team', 'QM RM', 'QM RM Team',
  'QM EW', 'QM EW Team', 'BR FFA', 'Other',
  // Domain acronyms and proper nouns
  'APM', 'ELO', 'Elo', 'Age of Empires', 'aoe2.site', 'Wilson score',
  // Tier names, which double as theme token keys
  'Gold', 'Silver', 'Bronze', 'Iron', 'Unranked',
];

function flatten(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k)
  );
}

function placeholders(value: string): string[] {
  return (value.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();
}

function lookup(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined),
    obj
  );
}

describe('locale completeness', () => {
  const enKeys = flatten(en).sort();

  it.each(Object.keys(LOCALES))('%s defines every key present in en', (lng) => {
    const missing = enKeys.filter(k => lookup(LOCALES[lng], k) === undefined);
    expect(missing, `${lng}.json is missing keys`).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s defines no keys absent from en', (lng) => {
    const orphans = flatten(LOCALES[lng]).filter(k => lookup(en, k) === undefined);
    expect(orphans, `${lng}.json has orphan keys`).toEqual([]);
  });
});

describe('plural key parity', () => {
  it.each(['en', ...Object.keys(LOCALES)])('%s pairs every _one with an _other', (lng) => {
    const resource = lng === 'en' ? en : LOCALES[lng];
    const keys = flatten(resource);
    const unpaired = keys
      .filter(k => k.endsWith('_one'))
      .map(k => k.replace(/_one$/, '_other'))
      .filter(other => !keys.includes(other));
    expect(unpaired, `${lng}.json has plural keys without _other`).toEqual([]);
  });
});

describe('interpolation parity', () => {
  it.each(Object.keys(LOCALES))('%s preserves every {{placeholder}} from en', (lng) => {
    const mismatches: string[] = [];
    for (const key of flatten(en)) {
      const source = lookup(en, key);
      const target = lookup(LOCALES[lng], key);
      if (typeof source !== 'string' || typeof target !== 'string') continue;
      const a = placeholders(source);
      const b = placeholders(target);
      if (a.join(',') !== b.join(',')) {
        mismatches.push(`${key}: en[${a.join(',')}] vs ${lng}[${b.join(',')}]`);
      }
    }
    expect(mismatches, `${lng}.json placeholder drift`).toEqual([]);
  });
});

describe('no hardcoded strings in components', () => {
  // Negative lookbehind on `=` so a `=> Promise<T>` type annotation is not
  // mistaken for JSX text. The leading class allows an em dash or middot so
  // sentence fragments appended to other copy are caught, and the body allows
  // `&`/`;` so an HTML entity such as `&gt;` does not truncate the match.
  const jsxText = /(?<!=)>\s*([A-Z—·][A-Za-z0-9 ,.'’!?:%&;\-()/\s]{2,})\s*</g;
  const textProp = /\b(placeholder|aria-label|title|alt)\s*=\s*"([^"]{3,})"/g;

  it('every migrated component routes user copy through t()', async () => {
    const offenders: string[] = [];

    for (const abs of await componentFiles(COMPONENTS_DIR)) {
      const rel = abs.slice(COMPONENTS_DIR.length + 1);
      const src = await fs.readFile(abs, 'utf8');
      const found = new Set<string>();
      let m: RegExpExecArray | null;

      while ((m = jsxText.exec(src))) {
        if (/[a-z]/.test(m[1])) found.add(m[1].trim().replace(/\s+/g, ' '));
      }
      while ((m = textProp.exec(src))) {
        found.add(m[2].trim());
      }

      for (const s of found) {
        if (!ALLOWED_LITERALS.includes(s)) offenders.push(`${rel}: "${s}"`);
      }
    }

    expect(offenders, 'hardcoded copy found — move it into en.json').toEqual([]);
  });
});
