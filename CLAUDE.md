# AoE2 Match History — aoe2.site

Personal project: Age of Empires 2 match history viewer. Live at **https://aoe2.site**.

## Architecture

```
ui/                  React frontend (Vite + TypeScript + Chakra UI)
functions/proxy/     TypeScript API proxy on Cloud Run (Relic API, Steam, Meilisearch, Firestore, PostgreSQL)
functions/apm/       Python Cloud Function — replay parsing for APM stats (mgz library)
data/                Static data files deployed to GCS (rl_api_mappings.json, 100.json)
jobs/indexing/       Cloud Run Job — collects players from Relic API, indexes to Meilisearch
jobs/collector/      Cloud Run Job — collects match history from Relic API to PostgreSQL
aoe-search/          Meilisearch VM config (e2-micro, snapshot import, startup scripts)
aoe-match-db/        PostgreSQL VM config (e2-medium, backup cron, firewall rules)
scripts/             Utility scripts (player collection, data filtering, tunneling, cleanup)
```

**Infra:** GCS bucket (`aoe2.site`) behind Cloudflare CDN, Cloud Run (proxy), Cloud Function Gen2 (APM), Meilisearch on GCE VM, PostgreSQL on GCE VM (match history), Firestore for session/match caching.

## Commands

### UI (from `ui/`)
```bash
npm run dev              # Vite dev server
npm run dev:all          # UI + proxy + firestore emulator + APM function
npm run build            # Production build (tsc + vite)
npm run lint             # ESLint
npm run lint:fix         # ESLint autofix
npm run type-check       # TypeScript check
npm test                 # Vitest (non-interactive)
npm run test:watch       # Vitest watch mode
npm run cy:run           # Cypress component tests (headless)
npm run cy:open          # Cypress interactive
npm run test:all         # Vitest + Cypress + proxy tests in parallel
```

### Proxy (from `functions/proxy/`)
```bash
npm run build            # TypeScript compile to dist/
npm run dev              # Build + local dev on :8080
npm test                 # Jest tests (ts-jest, no build needed)
```

### APM Function (from `functions/apm/`)
```bash
python -m functions_framework --target=aoe2_apm_processor --port=5001
pytest test_main.py -v           # Run APM tests
```

### Match Collector (from `jobs/collector/`)
```bash
pnpm run build           # Compile TypeScript to dist/
pnpm start               # Run compiled output
pnpm run dev             # Watch mode (recompile on change)
pnpm run migrate:up      # Apply database migrations (requires DATABASE_URL)
pnpm run migrate:down    # Roll back last migration
```

### Local Dev (full stack)
```bash
# Terminal 1: SSH tunnels to VMs
bash scripts/tunnel-meilisearch.sh
bash scripts/tunnel-postgres.sh

# Terminal 2: Everything else
cd ui && npm run dev:all
```

## Deployment

Push to `master` triggers GitHub Actions. Main deployment (`deploy.yml`) runs three parallel jobs plus a post-deploy step:
1. **build-and-deploy** — lint, test (vitest + cypress + proxy jest), build, upload assets + data to GCS
2. **deploy-proxy-function** — deploy Cloud Run service with secrets
3. **deploy-apm-function** — pytest, deploy Cloud Function Gen2
4. **clear-cloudflare-cache** — selective cache purge based on changed paths (runs after jobs 1 + 2)

Separate path-triggered workflows:
- **deploy-collector-job.yml** — build Docker image, deploy Cloud Run Job, schedule every 3 hours (`jobs/collector/**`)
- **deploy-indexing-job.yml** — build Docker image, deploy Cloud Run Job, schedule every 6 hours (`jobs/indexing/**`)

## Key Data Files

- `data/rl_api_mappings.json` — Civ ID → name, map ID → name mappings for the Relic API. Updated manually when new civs/maps are added to the game.
- `data/100.json` — Reference/leaderboard data

## Environment Variables

See `functions/proxy/CLAUDE.md` for proxy-specific vars. UI uses:
- `VITE_AOE_API_URL` — API base URL (`/api` in tests, `https://api.aoe2.site` in prod)

## Conventions

- Node 20 (see `.nvmrc`), Python 3.11 for cloud functions
- UI tests: Vitest for units, Cypress for component integration
- Proxy tests: Jest with ts-jest (test files stay as `.js`)
- APM tests: pytest
- Use `ui/src/theme/breakpoints.ts` + `useLayoutConfig()` for responsive layouts
- Use `theme.ts` color tokens — never hardcode colors
- Assets (maps, civ_icons, logos) are gitignored — served from GCS/CDN, not the repo
- Pre-commit hooks run relevant tests based on changed files
- When adding or removing routes in the router config (`ui/src/main.tsx`), update the view mapping in `.claude/commands/ui-review.md`
- The dev overlay depends on `@vitejs/plugin-react` (Babel transform) for component `displayName`s. Do not switch to `@vitejs/plugin-react-swc` without verifying the overlay still resolves component names.

## Gotchas

- Relic API responses use `[statusCode, data]` arrays, not standard HTTP status codes
- Options and SlotInfo in match data are double-base64 + zlib encoded
- Single shared Relic auth session stored in Firestore — not multi-tenant
- Meilisearch version (1.7.3) pinned across 3 files — use `scripts/check-versions.sh` to verify
- `ui/src/assets/` is gitignored — assets live in GCS bucket, not the repo
- Relic API uses uint32 sentinel values (`0xFFFFFFFF` = 4294967295) for "unset" fields — these exceed PostgreSQL's signed int32 max. Use `clampInt()` in collector's `db.ts` to convert to null before INSERT.
