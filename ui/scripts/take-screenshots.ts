import { chromium, type Page, type BrowserContext } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Configuration ---

const SOURCES = {
  dev: 'http://localhost:5173',
  prod: 'https://aoe2.site',
} as const;

const CONFIG = {
  outputDir: join(__dirname, '..', 'screenshots'),
  // Default IDs — update these to match your dev environment
  profileId: '4764337',
  matchId: '' as string, // Will be resolved from the profile's match history
  searchQuery: 'torna', // Query used for search screenshots
  viewports: {
    desktop: { width: 1440, height: 1400 },
    mobile: { width: 390, height: 844 },
  },
} as const;

type Source = keyof typeof SOURCES;

interface ViewConfig {
  name: string;
  path: string;
  /** CSS selector to wait for before capturing — confirms the view has rendered */
  waitForSelector: string;
  /** Use viewport-only capture instead of full-page (for fixed-position layouts) */
  viewportOnly?: (viewport: 'desktop' | 'mobile') => boolean;
  /** Actions to perform before capturing (e.g., type in search, click a tab) */
  beforeCapture?: (page: Page, viewport: 'desktop' | 'mobile') => Promise<void>;
}

function buildViews(): ViewConfig[] {
  return [
    {
      name: 'landing',
      path: '/',
      waitForSelector: 'input[placeholder]',
    },
    {
      name: 'landing-search',
      path: '/',
      waitForSelector: 'input[placeholder]',
      viewportOnly: () => true,
      beforeCapture: async (page) => {
        const input = await page.waitForSelector('input[placeholder]', { timeout: 5000 });
        await input.click();
        await input.fill(CONFIG.searchQuery);
        await page.waitForTimeout(1500);
      },
    },
    {
      name: 'profile',
      path: `/profile_id/${CONFIG.profileId}`,
      waitForSelector: '[data-testid="floating-box-container"]',
      viewportOnly: (vp) => vp === 'desktop',
    },
    {
      name: 'profile-search',
      path: `/profile_id/${CONFIG.profileId}`,
      waitForSelector: '[data-testid="floating-box-container"]',
      viewportOnly: () => true,
      beforeCapture: async (page, viewport) => {
        const searchSelector = viewport === 'mobile'
          ? '[data-testid="mobile-search"] input'
          : 'input[placeholder]';
        const input = await page.waitForSelector(searchSelector, { timeout: 5000 });
        await input.click();
        await input.fill(CONFIG.searchQuery);
        await page.waitForTimeout(1500);
      },
    },
    {
      name: 'profile-expanded',
      path: `/profile_id/${CONFIG.profileId}`,
      waitForSelector: '[data-testid="floating-box-container"]',
      viewportOnly: (vp) => vp === 'desktop',
      beforeCapture: async (page) => {
        const trigger = await page.waitForSelector('[data-scope="accordion"] button', { timeout: 5000 });
        await trigger.click();
        await page.waitForTimeout(500);
      },
    },
    {
      name: 'live',
      path: '/live',
      waitForSelector: '[data-testid="topbar-root"]',
    },
    {
      name: 'match',
      path: '', // Resolved dynamically
      waitForSelector: '[data-testid="enlarged-match-card"]',
    },
    {
      name: 'match-actions',
      path: '', // Resolved dynamically
      waitForSelector: '[data-testid="enlarged-match-card"]',
      beforeCapture: async (page) => {
        const actionsTab = await page.waitForSelector('button[data-value="actions"]', { timeout: 5000 }).catch(() => null)
          ?? await page.locator('button:has-text("Actions")').first().elementHandle();
        if (actionsTab) await actionsTab.click();
        await page.waitForTimeout(1000);
      },
    },
  ];
}

// --- Helpers ---

async function checkServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitAndCapture(
  page: Page,
  url: string,
  outputPath: string,
  view: ViewConfig,
  viewport: 'desktop' | 'mobile',
): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  try {
    await page.waitForSelector(view.waitForSelector, { timeout: 10000 });
  } catch {
    console.warn(`  ⚠ Selector "${view.waitForSelector}" not found — capturing anyway`);
  }

  await page.waitForTimeout(500);

  if (view.beforeCapture) {
    await view.beforeCapture(page, viewport);
  }

  const fullPage = view.viewportOnly ? !view.viewportOnly(viewport) : true;
  await page.screenshot({ path: outputPath, fullPage });
}

async function resolveMatchId(page: Page, baseUrl: string): Promise<string> {
  const profileUrl = `${baseUrl}/profile_id/${CONFIG.profileId}`;
  await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });

  try {
    await page.waitForSelector('[data-testid="floating-box-container"]', { timeout: 10000 });
    await page.waitForTimeout(500);
  } catch {
    await page.waitForTimeout(2000);
  }

  const matchLink = await page.$('a[href*="/match/"]');
  if (matchLink) {
    const href = await matchLink.getAttribute('href');
    if (href) {
      const match = href.match(/\/match\/(\d+)/);
      if (match) return match[1];
    }
  }

  console.warn('  ⚠ Could not find a match link on the profile page');
  return '';
}

// --- Capture a full set of screenshots for one source ---

async function captureSource(
  context: BrowserContext,
  source: Source,
  baseUrl: string,
  outputDir: string,
): Promise<number> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📷 Capturing: ${source} (${baseUrl})`);
  console.log(`   Output: ${outputDir}`);
  console.log('='.repeat(50));

  await mkdir(outputDir, { recursive: true });

  const page = await context.newPage();
  let captured = 0;

  try {
    // Resolve match ID
    let matchId = CONFIG.matchId;
    if (!matchId) {
      console.log('\nResolving match ID from profile...');
      matchId = await resolveMatchId(page, baseUrl);
      if (!matchId) {
        console.warn('⚠ No match ID found — match views will be skipped');
      } else {
        console.log(`✓ Using match ID: ${matchId}`);
      }
    }

    // Build views with resolved match paths
    const views = buildViews().map((v) => {
      if (v.name === 'match' || v.name === 'match-actions') {
        return { ...v, path: matchId ? `/match/${matchId}` : '' };
      }
      return v;
    });

    const viewportEntries = Object.entries(CONFIG.viewports) as [
      'desktop' | 'mobile',
      { width: number; height: number },
    ][];

    for (const view of views) {
      if (!view.path) {
        console.log(`\n⚠ Skipping ${view.name} — no path`);
        continue;
      }

      for (const [vpName, vpSize] of viewportEntries) {
        const filename = `${view.name}-${vpName}.png`;
        const outputPath = join(outputDir, filename);
        const url = `${baseUrl}${view.path}`;
        const fullPage = view.viewportOnly ? !view.viewportOnly(vpName) : true;

        console.log(`\n📸 ${filename}`);
        console.log(`   ${url} (${vpSize.width}x${vpSize.height}, fullPage=${fullPage})`);

        await page.setViewportSize(vpSize);

        try {
          await waitAndCapture(page, url, outputPath, view, vpName);
          console.log(`   ✓ Saved`);
          captured++;
        } catch (err) {
          console.error(`   ✗ Failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  } finally {
    await page.close();
  }

  return captured;
}

// --- CLI ---

function parseArgs(): Source[] {
  const args = process.argv.slice(2);

  if (args.includes('--compare')) return ['dev', 'prod'];
  if (args.includes('--prod')) return ['prod'];
  return ['dev'];
}

function printUsage() {
  console.log(`Usage: tsx scripts/take-screenshots.ts [options]

Options:
  (none)      Capture dev server only (default)
  --prod      Capture production site only
  --compare   Capture both dev and prod for side-by-side comparison

Output:
  Single source  → screenshots/*.png
  --compare      → screenshots/dev/*.png + screenshots/prod/*.png
`);
}

// --- Main ---

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  const sources = parseArgs();
  const isCompare = sources.length > 1;

  console.log('Screenshot Tool — aoe2.site\n');

  // Check reachability
  for (const source of sources) {
    const url = SOURCES[source];
    const up = await checkServer(url);
    if (!up) {
      if (source === 'dev') {
        console.error(
          `✗ Dev server not running at ${url}\n` +
          '  Start it with: npm run dev:all (+ Meilisearch tunnel)',
        );
      } else {
        console.error(`✗ ${source} site not reachable at ${url}`);
      }
      process.exit(1);
    }
    console.log(`✓ ${source} reachable at ${url}`);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: 'light' });

  try {
    let totalCaptured = 0;

    for (const source of sources) {
      const baseUrl = SOURCES[source];
      const outputDir = isCompare
        ? join(CONFIG.outputDir, source)
        : CONFIG.outputDir;

      totalCaptured += await captureSource(context, source, baseUrl, outputDir);
    }

    console.log(`\n✓ Done — ${totalCaptured} screenshots captured`);

    if (isCompare) {
      console.log(`\nComparison ready:`);
      console.log(`  Dev:  ${join(CONFIG.outputDir, 'dev')}/`);
      console.log(`  Prod: ${join(CONFIG.outputDir, 'prod')}/`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
