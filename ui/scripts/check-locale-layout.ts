/**
 * Locale layout check.
 *
 * German copy runs ~30% longer than English, and several components clamp text
 * with noOfLines / nowrap / textOverflow. This loads each route at a narrow
 * viewport in a given locale and reports two objective failures:
 *
 *   - horizontal overflow: the page scrolls sideways
 *   - clipped text: an element's scrollWidth exceeds its clientWidth
 *
 * Usage: tsx scripts/check-locale-layout.ts [--locale=de] [--width=390]
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

const ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'live', path: '/live' },
  { name: 'stats-win-rates', path: '/stats/win-rates' },
  { name: 'stats-team-positions', path: '/stats/team-positions' },
];

function arg(name: string, fallback: string): string {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : fallback;
}

interface Clipped {
  text: string;
  tag: string;
  scrollWidth: number;
  clientWidth: number;
}

async function main() {
  const locale = arg('locale', 'en');
  const width = Number(arg('width', '390'));

  const browser = await chromium.launch();
  const context = await browser.newContext({
    colorScheme: 'light',
    locale,
    viewport: { width, height: 900 },
  });
  await context.addInitScript((lng: string) => {
    window.localStorage.setItem('i18nextLng', lng);
  }, locale);

  const page = await context.newPage();
  let problems = 0;

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
    // Let data land and the layout settle; networkidle never fires because the
    // live view polls on an interval.
    await page.waitForTimeout(4000);

    const lang = await page.evaluate(() => document.documentElement.lang);
    const sample = (await page.evaluate(() => document.body.innerText))
      .replace(/\s+/g, ' ').slice(0, 120);

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    const clipped: Clipped[] = await page.evaluate(() => {
      const out: Clipped[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
        const text = (el.textContent ?? '').trim();
        if (!text || el.children.length > 0) continue;
        if (el.scrollWidth > el.clientWidth + 1) {
          out.push({
            text: text.slice(0, 60),
            tag: el.tagName.toLowerCase(),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          });
        }
      }
      return out;
    });

    const bad = overflow > 0 || clipped.length > 0;
    if (bad) problems++;

    console.log(`\n${bad ? '✗' : '✓'} ${route.name} (${locale}, ${width}px)  [html lang=${lang}]`);
    console.log(`    rendered: ${sample}`);
    if (overflow > 0) console.log(`    horizontal overflow: ${overflow}px`);
    for (const c of clipped.slice(0, 10)) {
      console.log(`    clipped <${c.tag}> ${c.clientWidth}→${c.scrollWidth}px  "${c.text}"`);
    }
    if (clipped.length > 10) console.log(`    ...and ${clipped.length - 10} more`);
  }

  await browser.close();
  console.log(`\n${problems === 0 ? 'No layout problems' : `${problems} route(s) with problems`} in ${locale}.`);
}

main();
