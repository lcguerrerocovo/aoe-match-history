# UI — React Frontend

Vite + React 18 + TypeScript + Chakra UI v3.

## Routes

- `/` — `LandingPage` (player search)
- `/profile_id/:profileId` — `App` (match history for a player)
- `/match/:matchId` — `MatchPage` (single match detail with APM)
- `/live` — `LivePage` (live matches from observable advertisements)

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
    ├── MatchList.tsx             Session grouping, accordion container
    ├── MatchCard.tsx             Single match row
    ├── MatchSummaryCard.tsx      Match header (map, type, result link)
    ├── MapCard.tsx               Diamond-rotated map thumbnail (list view)
    ├── TeamCard.tsx              Team layout with player rows
    ├── PlayerRating.tsx          Rating badge
    └── AnalysisButton.tsx        Analysis trigger button

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
    ├── AnalysisEmptyState.tsx   Inline empty/generate/processing/error states
    ├── useApmGeneration.ts     Hook: status polling, replay download, generation trigger
    └── index.ts                 Barrel export (AnalysisSection only)
        ├── → ApmChart.tsx       Pure APM line chart renderer (no legend/toggle)
        └── → ApmBreakdownChart/ Action breakdown (stacked bar)

ApmBreakdownChart/               APM chart with action breakdown
├── ApmBreakdownChart.tsx        Chart container (accepts selectedPlayerId, uses ChartViewport)
├── ChartArea.tsx                Recharts area chart
├── ActionTypeLegend.tsx         Action type color legend
└── utils.ts                     Chart color/formatting helpers

LivePage                         Live matches page (auto-refresh, polls /api/live)
├── GameTypeTabs                 Filter tabs by game type category (RM 1v1, RM Team, etc.)
├── Civ filter (Input+datalist)  Typeahead civilization filter
├── ActivityPanel                Stats panel with clickable map bars, ELO histogram, and match freshness
└── LiveMatchCard                Shared card component (→ LiveMatchCard.tsx)

LiveMatchCard.tsx                 Shared live match card (used by LivePage + ProfileLiveMatch)
├── LiveMatchCard                Card: dark header (game type, map, elapsed, LIVE pill), diamond map + teams with "vs", avg ELO footer, spectate CTA
├── PulsingDot                   Reusable animated red dot (used by LivePage header + TopBar Live links)
├── PlayerRow                    Player name + civ icon + rating in a live match
└── LiveMatchCardSkeleton        Skeleton placeholder matching card structure (dark header + diamond + rows)
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

## Screenshot Tool

Playwright-based tool that captures all key views for visual review. Lives in `scripts/take-screenshots.ts`.

```bash
npm run screenshots           # Dev server only
npm run screenshots:prod      # Prod site only
npm run screenshots:compare   # Both side-by-side (screenshots/dev/ + screenshots/prod/)
```

Requires dev server running (`npm run dev:all` + Meilisearch tunnel) for dev captures.

**Current views captured** (each at desktop 1440x1400 + mobile 390x844):
- `landing` — landing page at rest
- `landing-search` — search dropdown with results
- `profile` — profile with match history
- `profile-search` — profile with TopBar search results
- `profile-expanded` — profile with accordion session expanded
- `live` — live matches page
- `match` — match detail with APM tab
- `match-actions` — match detail with Actions tab

**When adding new views or interactive states**, add a corresponding entry to the `VIEWS` array in `scripts/take-screenshots.ts`. Each entry needs a `name`, `path`, `waitForSelector`, and optionally a `beforeCapture` function for interactions (typing, clicking tabs, expanding accordions).

## Key Services

- `matchService.ts` — API client (`getFullMatchHistory` for cursor-paginated + server-filtered history, `getMatches` legacy fallback, `getMatch`, `getPersonalStats`, replay/APM helpers)
- `liveMatchService.ts` — Live matches API client (`getLiveMatches`, `getLiveMatchForPlayer`)
- `playerSearchService.ts` — Player search API client (`searchPlayers`)

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
