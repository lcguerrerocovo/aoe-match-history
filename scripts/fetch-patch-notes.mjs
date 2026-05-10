/**
 * Fetches AoE2:DE patch notes from the Steam News API and ageofempires.com blog,
 * converts to markdown, and saves to data/patch-notes/.
 *
 * Usage:
 *   node scripts/fetch-patch-notes.mjs              # Last 6 months (default)
 *   node scripts/fetch-patch-notes.mjs --months 12  # Last 12 months
 *   node scripts/fetch-patch-notes.mjs --all        # All patches
 *
 * Skips patches that already have saved notes. Use --force to overwrite.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const STEAM_NEWS_URL = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=813780&count=500&feeds=steam_community_announcements';
const BLOG_BASE = 'https://www.ageofempires.com/news/age-of-empires-ii-definitive-edition-update-';
const PATCHES_PATH = 'data/patches.json';
const NOTES_DIR = 'data/patch-notes';

const args = process.argv.slice(2);
const months = args.includes('--all') ? 9999 : parseInt(args[args.indexOf('--months') + 1] || '6', 10);
const force = args.includes('--force');

function htmlToMd(html) {
  const startIdx = html.indexOf('◆ Update') !== -1
    ? html.indexOf('◆ Update')
    : html.indexOf('<h2');

  const endMarkers = ['Become an Age Insider', 'Sign In</h', 'Europe\nGermany'];
  let endIdx = html.length;
  for (const marker of endMarkers) {
    const idx = html.indexOf(marker, startIdx);
    if (idx > 0 && idx < endIdx) endIdx = idx;
  }

  return html.slice(startIdx > 0 ? startIdx : 0, endIdx)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8216;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function bbcodeToMd(text) {
  return text
    .replace(/\[h1\](.*?)\[\/h1\]/gi, '# $1')
    .replace(/\[h2\](.*?)\[\/h2\]/gi, '## $1')
    .replace(/\[h3\](.*?)\[\/h3\]/gi, '### $1')
    .replace(/\[b\](.*?)\[\/b\]/gi, '**$1**')
    .replace(/\[i\](.*?)\[\/i\]/gi, '*$1*')
    .replace(/\[u\](.*?)\[\/u\]/gi, '$1')
    .replace(/\[strike\](.*?)\[\/strike\]/gi, '~~$1~~')
    .replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '[$2]($1)')
    .replace(/\[img\](.*?)\[\/img\]/gi, '![]($1)')
    .replace(/\[previewyoutube=.*?\].*?\[\/previewyoutube\]/gi, '')
    .replace(/\[list\]/gi, '')
    .replace(/\[olist\]/gi, '')
    .replace(/\[\/list\]/gi, '')
    .replace(/\[\/olist\]/gi, '')
    .replace(/\[\*\]/g, '- ')
    .replace(/\[table\].*?\[\/table\]/gis, '[table omitted]')
    .replace(/\[\/?[a-z]+.*?\]/gi, '')
    .replace(/\n{3,}/g, '\n\n');
}

async function main() {
  const patches = JSON.parse(readFileSync(PATCHES_PATH, 'utf8'));
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = patches.filter(p => p.date >= cutoffStr);
  console.log(`Patches in scope (last ${months} months): ${recent.length}`);

  mkdirSync(NOTES_DIR, { recursive: true });

  const toProcess = recent.filter(p => {
    const path = `${NOTES_DIR}/v${p.version}.md`;
    if (existsSync(path) && !force) {
      console.log(`  v${p.version} — already saved, skipping`);
      return false;
    }
    return true;
  });

  if (toProcess.length === 0) {
    console.log('\nAll patch notes already saved. Use --force to overwrite.');
    return;
  }

  console.log(`\nFetching ${toProcess.length} patch notes...`);

  // Fetch Steam News for BBCode fallback
  console.log('Fetching Steam News API...');
  const steamResp = await fetch(STEAM_NEWS_URL);
  if (!steamResp.ok) throw new Error(`Steam API returned ${steamResp.status}`);
  const steamData = await steamResp.json();
  const newsItems = steamData.appnews.newsitems;
  console.log(`  ${newsItems.length} news items fetched`);

  // Index news items by version
  const newsByVersion = {};
  for (const item of newsItems) {
    const title = item.title || '';
    const vMatch = title.match(/(?:Update|Patch|Hotfix|Minor Update)\s+(\d{5,})/i);
    if (vMatch) {
      const v = parseInt(vMatch[1], 10);
      if (!newsByVersion[v] || item.contents.length > newsByVersion[v].contents.length) {
        newsByVersion[v] = item;
      }
    }
  }

  // Identify which patches are "major" type and might have blog posts
  const majorTypes = new Set(['major']);

  for (const p of toProcess) {
    const ver = p.version;
    console.log(`\nProcessing v${ver} [${p.type}] ${p.date}...`);

    let content = null;
    let source = null;

    // Try blog post first for major patches
    if (majorTypes.has(p.type)) {
      const blogUrl = `${BLOG_BASE}${ver}/`;
      try {
        console.log(`  Trying blog: ${blogUrl}`);
        const blogResp = await fetch(blogUrl);
        if (blogResp.ok) {
          const html = await blogResp.text();
          if (html.length > 5000) {
            content = htmlToMd(html);
            source = blogUrl;
            console.log(`  Blog content: ${content.length} chars`);
          }
        }
      } catch (e) {
        console.log(`  Blog fetch failed: ${e.message}`);
      }
    }

    // Fallback to Steam News
    if (!content) {
      const steamItem = newsByVersion[ver];
      if (steamItem) {
        content = bbcodeToMd(steamItem.contents);
        source = 'steam';
        console.log(`  Steam content: ${content.length} chars`);
      } else {
        // Check if this version appears in another item's body (hotfix in parent)
        const parentItem = newsItems.find(i =>
          (i.contents || '').includes(String(ver)) && i.title !== `Hotfix ${ver}`
        );
        if (parentItem) {
          const parentMatch = parentItem.title.match(/(\d{5,})/);
          const parentVer = parentMatch ? parentMatch[1] : 'unknown';
          content = `Hotfix content is included in the parent patch notes: v${parentVer}.\nSee data/patch-notes/v${parentVer}.md`;
          source = `parent:v${parentVer}`;
          console.log(`  Hotfix stub → parent v${parentVer}`);
        } else {
          content = 'No patch notes found for this version.';
          source = 'none';
          console.log(`  WARNING: No content found`);
        }
      }
    }

    const frontmatter = [
      '---',
      `version: ${ver}`,
      `date: "${p.date}"`,
      `title: "${p.title.replace(/"/g, '\\"')}"`,
      `type: "${p.type}"`,
      `source: "${source}"`,
      '---',
    ].join('\n');

    writeFileSync(`${NOTES_DIR}/v${ver}.md`, `${frontmatter}\n\n${content}\n`);
    console.log(`  Saved ${NOTES_DIR}/v${ver}.md`);
  }

  console.log('\nDone.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
