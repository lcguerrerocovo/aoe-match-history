# AoE2 Match History - Frontend

React 18 + Vite + TypeScript + Chakra UI v3. DaVinci-inspired medieval theme with light/dark mode.

## Quick Start

```bash
npm install
npm run dev        # Development server at http://localhost:5173
npm run build      # Production build
```

## Component Architecture

```
<App />
├── <ProfileHeader />          # Fixed sidebar with player stats
├── <FilterBar />              # Search and filter controls
└── <MatchList />              # Session-grouped match accordion
    └── <MatchCard />          # Match row with map, teams, ratings
```

Extracted subdirectories with barrel exports (`index.ts`):
- **`MatchList/`** — Session grouping, accordion, match cards, teams, ratings, APM button
- **`FullMatchSummaryCard/`** — Single match detail view (teams, avatars, map, metadata)
- **`ApmBreakdownChart/`** — APM chart with player selector and action type legend

## Design System

- **Theme**: `src/theme/theme.ts` — 170+ semantic color tokens, card variants, slot recipes
- **Breakpoints**: `src/theme/breakpoints.ts` — use `useLayoutConfig()` hook
- **Rules**: Always use theme tokens (`brand.*`), never hardcode colors or breakpoints
- Card variants: `match`, `winner`/`loser`, `filter`, `summary`

## Testing

```bash
npm test              # Vitest unit tests
npm run cy:run        # Cypress component tests (headless)
npm run test:all      # Everything in parallel (vitest + cypress + proxy jest)
```

See `ui/CLAUDE.md` for full component hierarchy, state management details, asset management, and testing conventions.
