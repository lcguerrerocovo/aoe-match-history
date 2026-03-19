import { chromium, type Page } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Configuration ---

const CONFIG = {
  baseUrl: 'http://localhost:5173',
  outputDir: join(__dirname, '..', 'screenshots'),
  // Default IDs — update these to match your dev environment
  profileId: '4764337',
  matchId: '' as string, // Will be resolved from the profile's match history
  searchQuery: 'torna', // Query used for search screenshots
  viewports: {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  },
} as const;

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

const VIEWS: ViewConfig[] = [
  {
    name: 'landing',
    path: '/',
    waitForSelector: 'input[placeholder]',
  },
  {
    name: 'landing-search',
    path: '/',
    waitForSelector: 'input[placeholder]',
    viewportOnly: () => true, // Search dropdown is a popover — full-page misses it
    beforeCapture: async (page) => {
      const input = await page.waitForSelector('input[placeholder]', { timeout: 5000 });
      await input.click();
      await input.fill(CONFIG.searchQuery);
      // Wait for search results to appear
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
    viewportOnly: () => true, // Search dropdown is a popover
    beforeCapture: async (page, viewport) => {
      // On mobile, the search is in the TopBar's mobile layout
      const searchSelector = viewport === 'mobile'
        ? '[data-testid="mobile-search"] input'
        : 'input[placeholder]';
      const input = await page.waitForSelector(searchSelector, { timeout: 5000 });
      await input.click();
      await input.fill(CONFIG.searchQuery);
      // Wait for search results to appear
      await page.waitForTimeout(1500);
    },
  },
  {
    name: 'profile-expanded',
    path: `/profile_id/${CONFIG.profileId}`,
    waitForSelector: '[data-testid="floating-box-container"]',
    viewportOnly: (vp) => vp === 'desktop',
    beforeCapture: async (page) => {
      // Click the first accordion trigger to expand a match session
      const trigger = await page.waitForSelector('[data-scope="accordion"] button', { timeout: 5000 });
      await trigger.click();
      // Wait for expand animation
      await page.waitForTimeout(500);
    },
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
      // Click the "Actions" tab — Chakra v3 uses data-value attribute
      const actionsTab = await page.waitForSelector('button[data-value="actions"]', { timeout: 5000 }).catch(() => null)
        // Fallback: find by text content
        ?? await page.locator('button:has-text("Actions")').first().elementHandle();
      if (actionsTab) await actionsTab.click();
      // Wait for the chart to render
      await page.waitForTimeout(1000);
    },
  },
];

// --- Helpers ---

async function checkDevServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
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

  // Wait for view-specific content to confirm React rendered
  try {
    await page.waitForSelector(view.waitForSelector, { timeout: 10000 });
  } catch {
    console.warn(`  ⚠ Selector "${view.waitForSelector}" not found — capturing anyway`);
  }

  // Settle time for CSS transitions and lazy renders
  await page.waitForTimeout(500);

  // Run any pre-capture interactions (search, tab clicks, etc.)
  if (view.beforeCapture) {
    await view.beforeCapture(page, viewport);
  }

  const fullPage = view.viewportOnly ? !view.viewportOnly(viewport) : true;
  await page.screenshot({ path: outputPath, fullPage });
}

async function resolveMatchId(page: Page): Promise<string> {
  const profileUrl = `${CONFIG.baseUrl}/profile_id/${CONFIG.profileId}`;
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

// --- Main ---

async function main() {
  console.log('Screenshot Tool — aoe2.site\n');

  const serverUp = await checkDevServer(CONFIG.baseUrl);
  if (!serverUp) {
    console.error(
      `✗ Dev server not running at ${CONFIG.baseUrl}\n` +
      '  Start it with: npm run dev:all (+ Meilisearch tunnel)',
    );
    process.exit(1);
  }
  console.log(`✓ Dev server reachable at ${CONFIG.baseUrl}`);

  await mkdir(CONFIG.outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    colorScheme: 'light',
  });

  try {
    const page = await context.newPage();

    // Resolve match ID from profile's match history
    let matchId = CONFIG.matchId;
    if (!matchId) {
      console.log('\nResolving match ID from profile...');
      matchId = await resolveMatchId(page);
      if (!matchId) {
        console.warn('⚠ No match ID found — match views will be skipped');
      } else {
        console.log(`✓ Using match ID: ${matchId}`);
      }
    }

    // Update match view paths
    const views = VIEWS.map((v) => {
      if (v.name === 'match' || v.name === 'match-actions') {
        return { ...v, path: matchId ? `/match/${matchId}` : '' };
      }
      return v;
    });

    const viewportEntries = Object.entries(CONFIG.viewports) as [
      'desktop' | 'mobile',
      { width: number; height: number },
    ][];

    let captured = 0;

    for (const view of views) {
      if (!view.path) {
        console.log(`\n⚠ Skipping ${view.name} — no path`);
        continue;
      }

      for (const [vpName, vpSize] of viewportEntries) {
        const filename = `${view.name}-${vpName}.png`;
        const outputPath = join(CONFIG.outputDir, filename);
        const url = `${CONFIG.baseUrl}${view.path}`;
        const fullPage = view.viewportOnly ? !view.viewportOnly(vpName) : true;

        console.log(`\n📸 ${filename}`);
        console.log(`   ${url} (${vpSize.width}x${vpSize.height}, fullPage=${fullPage})`);

        await page.setViewportSize(vpSize);

        try {
          await waitAndCapture(page, url, outputPath, view, vpName);
          console.log(`   ✓ Saved to ${outputPath}`);
          captured++;
        } catch (err) {
          console.error(`   ✗ Failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    console.log(`\n✓ Done — ${captured} screenshots saved to ${CONFIG.outputDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
