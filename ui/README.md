# AoE2 Match History - Frontend

A responsive React application for Age of Empires II match history with a medieval-themed design system. Built with TypeScript, Vite, and Chakra UI.

## Quick Start

```bash
npm install
npm run dev        # Development server at http://localhost:5173
npm run test       # Run unit tests
npm run cy:run     # Run Cypress component tests (headless)
npm run build      # Production build
```

## Component Architecture

### Main Application Structure

```
<App />
├── <ProfileHeader />          // Fixed sidebar with player stats
├── <FilterBar />              // Search and filter controls
└── <MatchList />              // Main content area
    └── <Accordion />
        └── <MatchGroup />     // Grouped by date
            └── <MatchCard />  // Individual match
```

### MatchCard Component Hierarchy

```
<MatchCard />                    // Main container with "match" theme variant
├── <MatchSummaryCard />         // Always visible: match info & link
└── <Box>                        // Responsive layout container
    ├── <MapCard />              // Map preview with diamond styling
    └── <TeamCard />             // Player teams and statistics
        └── <Card variant="winner|loser">  // Individual team cards
            └── <VStack />       // Player list with rating, civ icon, color bar
```

### Extracted Subdirectories

Three large components were extracted into subdirectories with barrel exports (`index.ts`):

- **`MatchList/`** — Session grouping, accordion, match cards, team layout, player ratings, APM button
- **`FullMatchSummaryCard/`** — Single match detail view (used by MatchPage): teams, players, avatars, map card, match metadata
- **`ApmBreakdownChart/`** — APM chart with player selector, Recharts area chart, action type legend

See `ui/CLAUDE.md` for the full file-level hierarchy.

### Landing Page Structure

```
<LandingPage />                 // Root route "/"
├── <BackgroundPattern />       // Subtle medieval texture
├── <Logo />                    // Clickable AoE2 logo
├── <SiteBranding />            // "aoe2.site" text
├── <CallToAction />            // "View My Matches" button
└── <DescriptionCard />         // Feature explanation
```

## Design System

### Theme Structure

Located in `src/theme/theme.ts` — `createTheme(isDark)` generates complete light/dark themes.

- **Semantic tokens**: Always use `brand.midnightBlue`, `brand.steel`, `brand.cardBg` — never hardcode colors
- **Component usage**: `<Text color="brand.midnightBlue">` or `theme.colors.brand.zoolanderBlue`
- **Theme compliance**: `npm test` enforces no hardcoded colors (violations fail CI)

Card variants: `match`, `winner`/`loser`, `filter`.

### Responsive Breakpoints

Located in `src/theme/breakpoints.ts` — use `useLayoutConfig()` hook.

| Breakpoint | MatchCard Layout | ProfileHeader | Key Constraint |
|------------|------------------|---------------|----------------|
| **Mobile** | Column (stacked) | Relative, full-width | 100vw |
| **iPad Pro** | Row (side-by-side) | Fixed sidebar | 520px accordion, 480px match |
| **Desktop** | Row (spacious) | Fixed sidebar | 740px content |

All layout values configured in `breakpoints.ts` — no hardcoded values in components.

## Testing Strategy

- **Vitest**: unit tests for utils/ and services/ — `npm test`
- **Cypress**: component tests (`*.cy.tsx`) for responsive layouts and UI interactions — `npm run cy:run`
- Test setup: `src/test/setup.ts`, mock data in `src/test/mocks.ts`

Key Cypress coverage: responsive layout direction changes, iPad Pro overflow prevention, accordion bounds compliance.

## Key Files

- **`src/theme/breakpoints.ts`** — All responsive configuration
- **`src/theme/theme.ts`** — Colors, card variants, styling
- **`src/components/MatchList/`** — Core match display (via barrel export)
- **`src/components/FullMatchSummaryCard/`** — Single match detail view
- **`src/components/ApmBreakdownChart/`** — APM visualization
- **`src/components/LandingPage.tsx`** — Homepage with logo
- **`*.cy.tsx`** — Responsive protection tests

## Maintenance Guidelines

- **Understand the breakpoint system** — don't hardcode values
- **Run iPad Pro tests** — prevent overflow regressions (`npm run cy:run`)
- **Edit layout values** in `src/theme/breakpoints.ts`, not in components
- **Common issues**: iPad overflow → check `matchWidth` in lg breakpoint; mobile layout → check base/sm config
