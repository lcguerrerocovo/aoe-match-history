/**
 * Top bar overlap check.
 *
 * The theme toggle is absolutely positioned at the far right of the top bar, so
 * anything placed at the end of the right-aligned nav row can end up underneath
 * it. This captures the bar at each breakpoint and reports any pair of controls
 * whose bounding boxes intersect.
 *
 * Usage: tsx scripts/check-topbar-overlap.ts [--locale=de] [--path=/live]
 */
import { chromium, type Page } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'screenshots', 'topbar');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 1366 },
  mobile: { width: 390, height: 844 },
};

// Target the controls themselves, not their wrappers: the language switcher and
// theme toggle now share a container, so comparing wrappers would always report
// a parent/child intersection.
const SELECTORS: Record<string, string> = {
  switcher: '[data-testid="language-switcher"] button',
  desktopSearch: '[data-testid="desktop-layout"] input',
  navInsights: '[data-testid="desktop-layout"] a[href="/stats"]',
  themeToggle: 'button[aria-label^="Switch to"]',
  mobileSearch: '[data-testid="mobile-search"] input',
};

function arg(name: string, fallback: string): string {
  const f = process.argv.find(a => a.startsWith(`--${name}=`));
  return f ? f.split('=')[1] : fallback;
}

async function boxes(page: Page) {
  const out: Record<string, { x: number; y: number; w: number; h: number } | null> = {};
  for (const [name, sel] of Object.entries(SELECTORS)) {
    // Several controls render twice (desktop + mobile branch); only one is
    // visible at a given breakpoint, so find that one rather than the first.
    const all = page.locator(sel);
    out[name] = null;
    for (let i = 0; i < (await all.count()); i++) {
      const el = all.nth(i);
      if (!(await el.isVisible())) continue;
      const b = await el.boundingBox();
      if (b) { out[name] = { x: b.x, y: b.y, w: b.width, h: b.height }; break; }
    }
  }
  return out;
}

function intersects(a: { x: number; y: number; w: number; h: number }, b: typeof a) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

async function main() {
  const locale = arg('locale', 'en');
  const path = arg('path', '/live');
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  let problems = 0;

  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ colorScheme: 'light', locale, viewport });
    await context.addInitScript((l: string) => window.localStorage.setItem('i18nextLng', l), locale);
    const page = await context.newPage();
    await page.goto(`http://localhost:5173${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);

    const b = await boxes(page);
    const present = Object.entries(b).filter(([, v]) => v !== null) as [string, NonNullable<typeof b[string]>][];

    const clashes: string[] = [];
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        if (intersects(present[i][1], present[j][1])) {
          clashes.push(`${present[i][0]} ∩ ${present[j][0]}`);
        }
      }
    }

    const missing = Object.keys(SELECTORS).filter(k => b[k] === null);
    if (clashes.length) problems++;

    console.log(`\n${clashes.length ? '✗' : '✓'} ${name} (${viewport.width}px, ${locale})`);
    for (const [n, v] of present) {
      console.log(`    ${n.padEnd(15)} x=${Math.round(v.x)} y=${Math.round(v.y)} w=${Math.round(v.w)} h=${Math.round(v.h)}`);
    }
    if (missing.length) console.log(`    not rendered: ${missing.join(', ')}`);
    for (const c of clashes) console.log(`    OVERLAP: ${c}`);

    const bar = page.locator('[data-testid="topbar-root"]').first();
    if (await bar.count()) {
      await bar.screenshot({ path: join(OUT, `${name}-${locale}.png`) });
    } else {
      await page.screenshot({ path: join(OUT, `${name}-${locale}.png`), clip: { x: 0, y: 0, width: viewport.width, height: 160 } });
    }
    await context.close();
  }

  await browser.close();
  console.log(`\n${problems === 0 ? 'No overlaps' : `${problems} viewport(s) with overlap`}. Screenshots in screenshots/topbar/`);
}

main();
