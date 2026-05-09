/**
 * Fetches AoE2:DE patch history from the Steam Web API and writes data/patches.json.
 * Uses ISteamNews/GetNewsForApp which has full history (not just recent RSS items).
 *
 * Usage: node scripts/fetch-patches.mjs
 */

import { writeFileSync } from 'fs';

const STEAM_NEWS_URL = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=813780&count=500&feeds=steam_community_announcements';
const OUTPUT_PATH = 'data/patches.json';

const resp = await fetch(STEAM_NEWS_URL);
if (!resp.ok) throw new Error(`Steam API returned ${resp.status}`);

const data = await resp.json();
const items = data?.appnews?.newsitems || [];
console.log(`Fetched ${items.length} news items from Steam API`);

const patches = new Map();

for (const item of items) {
  const title = item.title || '';
  const contents = item.contents || '';
  const date = new Date(item.date * 1000).toISOString().slice(0, 10);

  const classify = (t) => {
    if (/hotfix/i.test(t)) return 'hotfix';
    if (/minor/i.test(t)) return 'minor';
    return 'major';
  };

  // Check title for version
  const titleVersion = title.match(/(?:Update|Patch|Hotfix)\s+(\d{5,})/i);
  if (titleVersion) {
    const v = parseInt(titleVersion[1], 10);
    if (patches.has(v) === false) {
      patches.set(v, { version: v, date, title: title.trim(), type: classify(title) });
    }
  }

  // Check body for sub-updates (hotfixes buried in descriptions)
  for (const dv of [...contents.matchAll(/(?:Update|Patch|Hotfix)\s+(\d{5,})/gi)]) {
    const v = parseInt(dv[1], 10);
    if (patches.has(v) === false) {
      patches.set(v, { version: v, date, title: `Hotfix ${v}`, type: 'hotfix' });
    }
  }
}

const sorted = Array.from(patches.values()).sort((a, b) => a.version - b.version);

console.log(`\nFound ${sorted.length} patches:\n`);
for (const p of sorted) {
  console.log(`  ${p.version}  ${p.date}  [${p.type.padEnd(7)}]  ${p.title}`);
}

writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2) + '\n');
console.log(`\nWritten to ${OUTPUT_PATH}`);
