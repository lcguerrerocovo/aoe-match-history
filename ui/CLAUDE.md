# UI — React Frontend

Vite + React 18 + TypeScript + Chakra UI v3.

## Routes

- `/` — `LandingPage` (player search)
- `/profile_id/:profileId` — `App` (match history for a player)
- `/match/:matchId` — `MatchPage` (single match detail with APM)

When adding or removing routes, update the screenshot tool views in `scripts/take-screenshots.ts`.

## Component Hierarchy

```
App                              State owner: matches, filters, profile, stats
├── TopBar                       Nav bar with search
├── ProfileHeader                Player info + ranking cards (fixed sidebar on desktop)
├── FilterBar                    Search, map/type dropdowns, sort toggle
└── MatchList/                   Accordion of date-grouped sessions
    ├── MatchList.tsx             Session grouping, accordion container
    ├── MatchCard.tsx             Single match row
    ├── MatchSummaryCard.tsx      Match header (map, type, result link)
    ├── MapCard.tsx               Diamond-rotated map thumbnail (list view)
    ├── TeamCard.tsx              Team layout with player rows
    ├── PlayerRating.tsx          Rating badge
    └── APMButton.tsx             APM trigger button

FullMatchSummaryCard/            Single match detail (used by MatchPage)
├── FullMatchSummaryCard.tsx     Teams, players, ratings
├── PlayerAvatar.tsx             Steam avatar with link
├── MapCard.tsx                  Map thumbnail (detail view)
└── MatchDetails.tsx             Match metadata display

ApmBreakdownChart/               APM chart with player breakdown
├── ApmBreakdownChart.tsx        Chart container + data processing
├── PlayerSelector.tsx           Player toggle checkboxes
├── ChartArea.tsx                Recharts area chart
├── ActionTypeLegend.tsx         Action type color legend
└── utils.ts                     Chart color/formatting helpers
```

Note: Two `MapCard` components exist — `MatchList/MapCard.tsx` (list view, smaller) and
`FullMatchSummaryCard/MapCard.tsx` (detail view, different layout). Not interchangeable.

Extracted subdirectories use barrel exports (`index.ts`) — import from the directory, not individual files.

## State Management

All state in `App.tsx` — no global store. Props drilled to children.
- Matches fetched via `getFullMatchHistory` (paginated, merges Relic API + PostgreSQL). Falls back to legacy `getMatches` if `/full` endpoint fails.
- Pagination: `currentPage`, `hasMore`, `isLoadingMore` state in App.tsx. "Load More" button in MatchList appends next page.
- Session grouping: matches within 1 hour are grouped together
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
- `match` — match detail with APM tab
- `match-actions` — match detail with Actions tab

**When adding new views or interactive states**, add a corresponding entry to the `VIEWS` array in `scripts/take-screenshots.ts`. Each entry needs a `name`, `path`, `waitForSelector`, and optionally a `beforeCapture` function for interactions (typing, clicking tabs, expanding accordions).

## Key Services

- `matchService.ts` — API client (`getFullMatchHistory` for paginated history, `getMatches` legacy fallback, `getMatch`, `getPersonalStats`, `searchPlayers`, replay/APM helpers)

## Key Utils

- `matchUtils.ts` — session grouping, search, sorting, flat group creation
- `assetManager.ts` — CDN URL resolution for maps/civs/medals
- `mapNameResolver.ts` — API map name → image filename mapping
- `mappingUtils.ts` — civ/map ID lookups from `rl_api_mappings.json`
- `gameUtils.ts` — tier/rank calculations, game mode labels
- `teamUtils.ts` — team color assignment, win detection
- `colorUtils.ts` — player color hex values
- `timeUtils.ts` — relative time formatting, session timing display
