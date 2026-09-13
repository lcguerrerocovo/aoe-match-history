# UI — React Frontend

Vite + React 18 + TypeScript + Chakra UI v3.

## Routes

- `/` — `LandingPage` (player search)
- `/profile_id/:profileId` — `App` (match history for a player)
- `/match/:matchId` — `MatchPage` (single match detail with APM)
- `/live` — `LivePage` (live matches from observable advertisements)
- `/stats` — `StatsPage` (sub-tabs: Win Rates for civ win/pick rate charts, Team Positions for pocket/flank analysis)

When adding or removing routes, update the screenshot tool views in `scripts/take-screenshots.ts`.

## Component Hierarchy

```
App                              State owner: matches, filters, profile, stats
├── TopBar                       Nav bar with search + pulsing Live link
├── ProfileHeader                Player info + ranking cards (fixed sidebar on desktop)
├── ProfileLiveMatch             Live match banner (polls /api/live?profile_ids=, hidden when not in game)
│   └── LiveMatchCard            Shared card component (→ LiveMatchCard.tsx)
├── FilterBar                    Search, map/type dropdowns, sort toggle
└── MatchList/                   Accordion of date-grouped sessions
    ├── MatchList.tsx             Session grouping, accordion container, batch analysis hook
    ├── MatchCard.tsx             Single match row
    ├── MatchSummaryCard.tsx      Match header (map, type, result link, analysis indicator)
    ├── AnalysisIndicator.tsx     Passive indicator: none/processing/new/ready states with animations
    ├── MapCard.tsx               Diamond-rotated map thumbnail (list view)
    ├── TeamCard.tsx              Team layout with player rows
    ├── PlayerRating.tsx          Rating badge
    └── useBatchAnalysis.ts       Hook: batch trigger + sidecar polling (in hooks/)

MatchPage                        Single match detail
├── FullMatchSummaryCard/        Teams, players, ratings
│   ├── FullMatchSummaryCard.tsx
│   ├── PlayerAvatar.tsx         Steam avatar with link
│   ├── MapCard.tsx              Map thumbnail (detail view)
│   └── MatchDetails.tsx         Match metadata display
└── Analysis/                    APM analysis section
    ├── AnalysisSection.tsx      Container: owns view/player state, renders charts
    ├── AnalysisHeader.tsx       Title + ChartNav icon toggle
    ├── ChartNav.tsx             Icon segmented control (APM ↔ Actions)
    ├── ChartViewport.tsx        Fixed-height scroll frame (data-testid="chart-container")
    ├── PlayerBar.tsx            Unified player buttons (multi-toggle for APM, single-select for Actions)
    ├── AnalysisEmptyState.tsx   Inline loading/processing/unavailable states (no manual trigger)
    ├── useAutoAnalysis.ts      Hook: auto-trigger match analysis, polls /api/match-analysis
    └── index.ts                 Barrel export (AnalysisSection only)
        ├── → ApmChart.tsx       Pure APM line chart renderer (no legend/toggle)
        └── → ApmBreakdownChart/ Action breakdown (stacked bar)

ApmBreakdownChart/               APM chart with action breakdown
├── ApmBreakdownChart.tsx        Chart container (accepts selectedPlayerId, computes chartData)
├── ChartArea.tsx                Recharts area chart
├── ActionTypeLegend.tsx         Action type color legend
└── utils.ts                     Chart color/formatting helpers

LivePage                         Live matches page (auto-refresh, polls /api/live)
├── GameTypeTabs                 Filter tabs by game type category (RM 1v1, RM Team, etc.)
├── Civ filter (Input+datalist)  Typeahead civilization filter
├── ActivityPanel                Stats panel with clickable map bars, ELO histogram (shimmer skeleton while loading), and match freshness
└── VirtualMatchList             Window-scrolled virtualized card list (@tanstack/react-virtual)
    └── LiveMatchCard            Shared card component (→ LiveMatchCard.tsx)

LiveMatchCard.tsx                 Shared live match card (used by LivePage + ProfileLiveMatch)
├── LiveMatchCard                Card: dark header (game type, map, elapsed, LIVE pill), diamond map + teams with "vs", avg ELO footer, spectate CTA
├── PulsingDot                   Reusable animated red dot (used by LivePage header + TopBar Live links)
├── PlayerRow                    Player name + civ icon + rating in a live match
└── LiveMatchCardSkeleton        Skeleton placeholder matching card structure (dark header + diamond + rows)

StatsPage                        Insights page with tabbed sub-views (Win Rates + Team Positions)
├── WinRateChart                 Horizontal bar chart sorted by win rate (40–60% domain, 50% baseline)
├── PickRateChart                Horizontal bar chart sorted by pick rate
├── CivRowEl                     Single civ row: icon, name, bar, value, delta badge
├── DeltaBadge                   Patch-over-patch delta indicator (▲/▼)
├── CivIcon                      Civ emblem from CDN
└── InsightsTab                  Team Positions tab — pocket/flank win rates for 3v3/4v4
    └── FormationView            Diamond-map formation layout with position cards
        └── CivPositionCard      Single civ card showing win rate, games, Wilson score
```

Note: Two `MapCard` components exist — `MatchList/MapCard.tsx` (list view, smaller) and
`FullMatchSummaryCard/MapCard.tsx` (detail view, different layout). Not interchangeable.

Extracted subdirectories use barrel exports (`index.ts`) — import from the directory, not individual files.

## State Management

All state in `App.tsx` — no global store. Props drilled to children.
- Matches fetched via `getFullMatchHistory` (cursor-paginated, merges Relic API + PostgreSQL). Falls back to legacy `getMatches` if `/full` endpoint fails.
- Pagination: cursor-based via `nextCursor` + `hasMore` + `isLoadingMore` state in App.tsx. `currentPage` kept only as legacy fallback. "Load More" button in MatchList appends next batch.
- Server-side filtering: `selectedMap` and `selectedMatchType` trigger server-side filtered queries (DB only, no Relic merge). `serverFilterOptions` (maps + matchTypes with counts) returned on first request.
- Session grouping: matches within 90 minutes are grouped together
- Flat mode (no grouping) when any filter is active

### URL-aware state (required for new pages/filters)

Bind user-facing view state (filters, tabs, sort, search) to the URL via the shared `src/hooks/useUrlState.ts` hook so views are shareable and survive reload/back. Current: `/live` (`?type ?map ?elo ?civ`), `/stats/win-rates` + `/stats/team-positions` (`?matchType ?map ?elo ?view` / `?gameSize ?map ?elo`), `/profile_id/:id` (`?q ?map ?type ?sort`), `/match/:id` (`?view ?player`). Tabs as path segments via `useNavigate`.

Gotchas (caused real regressions):
1. **Batch multi-param changes into ONE `setSearchParams` updater** — each `useUrlState` setter is a separate navigation that clobbers the URL (only last survives). `setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set(...); p.delete(...); return p; }, { replace: true })`.
2. **Never put `setSearchParams` in effect/useCallback deps** — it's NOT stable in RR v7 (identity changes per URL change), so it re-fires effects on every filter change. Depend only on derived values + route params (`[profileId]`); updater form reads `prev` so stale identity is fine.
3. Guard async-validated filters with `if (data && ...)` so deep links (`?map=Arabia`) aren't wiped before data loads (`maps=[]`).
4. Setting a value to its default DELETES the param; for nullable/auto filters use `''` as default.
5. Adding a route/tab: update `scripts/take-screenshots.ts` + `.claude/commands/ui-review.md`, and `<Navigate>`-redirect old paths.

## Styling

- Theme: `src/theme/theme.ts` — `createSystem()` with 170+ semantic color tokens
- Light mode: warm parchment/sepia (Da Vinci Codex palette). Dark mode: dark charcoal
- Breakpoints: `src/theme/breakpoints.ts` — use `useLayoutConfig()` hook
- Never hardcode colors or breakpoints — always use theme tokens
- Desktop: profile header is fixed 320px sidebar. Mobile: stacked layout

## Asset Management

Assets are **not in the repo** (gitignored). Served from CDN.
- `AssetManager` class (`src/utils/assetManager.ts`) handles URL resolution
- Dev: `/src/assets/` (local via Vite plugin in `vite.config.ts`)
- Prod: `https://aoe2.site/assets/`
- Map images: smart filename resolution (tries rm_*, sm_*, rwm_* prefixes)
- Civ icons: lowercase + underscore normalized names
- 404 fallback: `cm_generic.png` for maps

## Testing

- **Vitest**: unit tests for utils/ and services/ — `npm test`
- **Cypress**: component tests (`*.cy.tsx`) for UI interactions — `npm run cy:run`
- Test setup: `src/test/setup.ts`, mock data in `src/test/mocks.ts`
- Coverage thresholds: 30% lines, 65% functions, 75% branches
- Always use `VITE_AOE_API_URL=/api` when running tests (set in npm scripts)
- Prevent interactive/watch mode in CI to avoid hanging

### Cypress + URL-state conventions (hard-won)
- **Asserting the router URL in component tests:** `cy.location()` returns the Cypress *runner* URL (e.g. `?specPath=...`), not the `MemoryRouter`'s in-memory URL. Mount a **spy component that renders a real hidden element** carrying the location, and assert on it:
  ```tsx
  const SearchSpy = () => {
    const loc = useLocation();
    return <span data-testid="url-search" data-search={loc.search} style={{ display: 'none' }} />;
  };
  // then: cy.get('[data-testid="url-search"]').invoke('attr','data-search').should('include', 'type=')
  ```
- **Never** use a spy that returns `null` + a module variable (`let lastSearch = ''`). In CI's Electron a null-returning component may not re-render after `setSearchParams`, the var stays stale, the assertion hangs/fails, and (with proper CI gating) it freezes the whole build step.
- **CI gates properly** (`deploy.yml` waits on each backgrounded test job's PID, not bare `wait`). So a hanging/failing Cypress test now actually blocks the deploy — keep tests fast and non-hanging.
- CI runs Cypress via `cy:run:ci` (Electron, no `--browser`); local `cy:run` uses Chrome. Tests must pass in **both** — avoid browser-specific behavior (the DOM-attr spy above is cross-browser).
- **Never `cy.clock().invoke('restore')` just to make a `.type()` test pass.** `LivePage.cy.tsx` `beforeEach` calls `cy.clock()` (fake timers) on purpose — it freezes LivePage's `setInterval`/`setTimeout` so they can't accumulate and SIGSEGV Electron in CI ("X connection error" / signal SIGSEGV). Restoring real timers in one test re-enables those intervals and crashes CI *after* the prior test passes (looks like the *next* test hung). For a `.type()` test under fake timers, use `cy.tick(100)` (or a few small ticks) to flush the mount fetch — the `.type()` re-render goes through React's MessageChannel scheduler, which `cy.clock()` does **not** mock, so it proceeds fine. Only the "gives up stale retries" test restores real timers, because it explicitly tests a `setTimeout`-based retry and un-registers before the interval runs.
- **Before "fixing" a flaky/hanging Cypress test, pull CI ground truth first:** `gh run list --json databaseId,headSha,conclusion` → find the last green commit → `git diff <green> -- <spec>` to see what actually changed. A plausible-looking timer fix can silently turn a hang into a SIGSEGV. The task premise ("X test hangs") can be stale or wrong; the green baseline is the source of truth.

## Internationalization

Six languages: `en`, `es`, `de`, `it`, `pt`, `zh`. i18next with bundled locale
files and browser language detection (`localStorage` → `navigator`, region
variants collapse, unsupported falls back to `en`).

- `src/i18n/index.ts` — runtime, `SUPPORTED_LANGUAGES`, `LANGUAGE_NAMES`
- `src/i18n/locales/<lang>.json` — UI copy
- `src/i18n/game-names.json` — civ and map names, **generated** by
  `scripts/extract-game-names.mjs` from a local AoE2 DE install; re-run after a
  patch adds civs or maps, the way `rl_api_mappings.json` is maintained
- `src/i18n/gameNames.ts` + `useGameNames()` — localized names for display
- `src/i18n/ordinal.ts` — rank ordinals (8375th / 8375º / 8375. / 第8375)

### Localize at render, never at the source

Canonical English civ and map names are load-bearing: `resolveMapFilename` and
`getCivAssetFilename` derive CDN paths from them, and `App.tsx` compares them to
decide which matches a filter selects. Localizing them at the source breaks
images, filters and URL state together. So:

- Use `useGameNames()` for anything rendered.
- Keep `<option value>` canonical; localize only the label.
- Game-mode codes (`RM 1v1`, `EW Team`) stay as-is.
- The proxy's `civNames.ts`/`mapNames.ts` stay English — they are DB lookup keys.

### The compliance test is the guard

`src/test/i18n-compliance.test.ts` runs in `npm test`, so it gates CI and the
pre-commit hook. It checks locale completeness, plural pairing, `{{placeholder}}`
parity, and scans all of `src/` for hardcoded user-facing copy.

**When sweeping for missed strings, run it first** — but know what it cannot see.
Every gap below was a real bug it missed:

| Blind spot | Example | Status |
|---|---|---|
| Config object values | `header: 'Board'` | now scanned |
| Bare string as JSX child | `cond ? 'Load More Matches' : …` | now scanned |
| Multi-line JSX text | a `<Text>` spanning 3 lines | now scanned |
| Leading punctuation / entities | `— see below`, `ELO &gt; 200` | now scanned |
| Outside `src/components` | `App.tsx` | now scanned (all of `src/`) |
| **Text adjacent to an expression** | `</Text> matches played · {duration}` | **still invisible** |

The last one needs a real JSX parser — any regex broad enough also matches
ordinary TypeScript (`} catch (e) {`). Check those by eye.

### Adapting the game's own terminology

The game's string tables carry its UI vocabulary, not just nouns. Comparing ours
against it corrected four terms (German `Volk` for civilization, `Landkarte` for
map; Spanish/Italian `Partida`/`Partita` for a match) and caught a Spanish word
sitting in the Italian file. The game is not automatically right, though —
reject its space-constrained abbreviations, its trailing-colon artifacts, and
its `flank`/`pocket` strings, which name the unit formation rather than the team
position.

### Gotchas

- Dates are composed **month-first in every Latin locale**
  (`formatMonthFirstDate`) because the session header drop-caps the first
  character and that only works on a letter. Chinese is exempt (numeric month)
  and the drop cap steps aside. This deliberately trades idiomatic word order
  for the manuscript styling — do not "fix" it back.
- `initAsync: false` is required: resources are bundled, and deferring init lets
  the first render show raw keys.
- Cypress `optimizeDeps.include` must list `react/jsx-dev-runtime`. It is
  injected by the JSX transform rather than imported, so Vite discovers it
  mid-run, re-optimizes, and loads a second React — surfacing as
  `Cannot read properties of null (reading 'useContext')`.
- Verify locale layout with `scripts/check-locale-layout.ts --locale=de` and
  `scripts/check-topbar-overlap.ts`. German is the longest; Chinese is the
  shortest and safest.

## Screenshot Tool

Playwright-based tool that captures all key views for visual review. Lives in `scripts/take-screenshots.ts`.

```bash
npm run screenshots           # Dev server only
npm run screenshots:prod      # Prod site only
npm run screenshots:compare   # Both side-by-side (screenshots/dev/ + screenshots/prod/)
```

Requires dev server running (`npm run dev:all` + Meilisearch tunnel) for dev captures.

**Current views captured** (each at desktop 1440x1400, tablet 1024x1366, and mobile 390x844):
- `landing` — landing page at rest
- `landing-search` — search dropdown with results
- `profile` — profile with match history
- `profile-search` — profile with TopBar search results
- `profile-expanded` — profile with accordion session expanded
- `live` — live matches page
- `stats` — civ statistics page
- `match` — match detail with APM view
- `match-actions` — match detail with Actions view

**When adding new views or interactive states**, add a corresponding entry to the `VIEWS` array in `scripts/take-screenshots.ts`. Each entry needs a `name`, `path`, `waitForSelector`, and optionally a `beforeCapture` function for interactions (typing, clicking tabs, expanding accordions).

## Key Services

- `matchService.ts` — API client (`getFullMatchHistory` for cursor-paginated + server-filtered history, `getMatches` legacy fallback, `getMatch`, `getPersonalStats`, replay/APM helpers)
- `liveMatchService.ts` — Live matches API client (`getLiveMatches`, `getLiveRatings`, `getLiveMatchForPlayer`)
- `playerSearchService.ts` — Player search API client (`searchPlayers`)
- `civStatsService.ts` — Civ stats fetcher (`getCivStats` — loads `civ-stats.json` from `/data/`)
- `positionStatsService.ts` — Position stats fetcher (`getPositionStats` — loads `position-stats.json` from `/data/`)

## Key Utils

- `matchUtils.ts` — session grouping, search, sorting, flat group creation
- `assetManager.ts` — CDN URL resolution for maps/civs/medals
- `mapNameResolver.ts` — API map name → image filename mapping
- `mappingUtils.ts` — civ/map ID lookups from `rl_api_mappings.json`
- `gameUtils.ts` — tier/rank calculations, game mode labels
- `teamUtils.ts` — team color assignment, win detection
- `colorUtils.ts` — contrast ratio calculation, optimal text color for backgrounds
- `playerColors.ts` — player color hex values (color_id to hex mapping)
- `timeUtils.ts` — relative time formatting, session timing display
- `winProbability.ts` — ELO-based win probability calculation (`calculateWinProbability(teams)`) used by `LiveMatchCard` to render a probability bar
