# AoE2 Match History

Live at **https://aoe2.site**

A match history viewer for Age of Empires II: Definitive Edition. Search for players, browse match history with team compositions, civilization and map stats, and replay APM breakdowns.

## Features

- **Player Search** — fast typo-tolerant search powered by Meilisearch, backed by Relic API + Steam auth
- **Match History** — detailed stats, team compositions, civ/map info, filtering and sorting
- **APM Analysis** — replay parsing with per-player action-per-minute breakdowns
- **Medieval UI** — responsive parchment/charcoal theme with dark/light toggle

## Architecture

```
ui/                  React 18 + Vite + TypeScript + Chakra UI v3
functions/proxy/     TypeScript API proxy on Cloud Run (Relic API, Steam, Meilisearch)
functions/apm/       Python Cloud Function — replay parsing (mgz library)
data/                Static data files (civ/map mappings)
indexing-job/        Cloud Run Job — player collection + Meilisearch indexing
aoe-search/          Meilisearch VM config
scripts/             Utility scripts
```

**Infra:** GCS bucket behind Cloudflare CDN, Cloud Run (API proxy), Cloud Function Gen2 (APM), Meilisearch on GCE VM, Firestore for session/match caching.

**Deployment:** Push to `master` triggers GitHub Actions — lint, test, build, deploy UI to GCS, deploy proxy to Cloud Run, deploy APM function, selective Cloudflare cache purge.

## Quick Start

```bash
git clone https://github.com/lcguerrerocovo/aoe-match-history.git
cd aoe-match-history

# Frontend only (no API — uses mock data in tests)
cd ui
npm install
npm run dev

# Full stack (requires .env config, Meilisearch tunnel)
npm run dev:all
```

### Prerequisites

- Node.js 20 (see `.nvmrc`)
- Python 3.11 (for APM function and data scripts)
- Google Cloud SDK + Firebase CLI (for deployment and emulators)

### API Proxy Setup

Create `functions/proxy/.env` from the example:

```bash
cp functions/proxy/.env.example functions/proxy/.env
# Fill in: STEAM_API_KEY, RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS
```

Then start all services:

```bash
cd ui
npm run dev:all    # UI + proxy + Firestore emulator
```

For player search, you'll also need a Meilisearch tunnel:

```bash
bash scripts/tunnel-meilisearch.sh   # In a separate terminal
```

## Testing

```bash
cd ui
npm test              # Vitest unit tests
npm run cy:run        # Cypress component tests (headless)
npm run test:all      # Everything in parallel (vitest + cypress + proxy jest)
```

Proxy tests: `cd functions/proxy && npm test`
APM tests: `cd functions/apm && pytest test_main.py -v`

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/player-search?name={name}` | Search players |
| `GET /api/match-history/{profileId}` | Match history |
| `GET /api/personal-stats/{profileId}` | Player stats |
| `GET /api/match/{matchId}` | Single match detail |
| `GET /api/steam/avatar/{steamId}` | Steam avatar |
| `GET /api/apm-status/{gameId}/{profileId}` | APM availability |

## Documentation

- **[UI Development Guide](ui/README.md)** — component architecture, responsive design, theme system
- **[Style Guide](STYLE_GUIDE.md)** — DaVinci-inspired theme, color palette, design principles

## Development with Claude Code

This repo is set up for [Claude Code](https://claude.com/claude-code) assisted development. Operational knowledge (deployment, infrastructure management, troubleshooting) lives in `.claude/skills/` rather than this README:

| Skill | What it covers |
|---|---|
| `meilisearch` | VM deployment, container management, indexing, snapshot recovery |
| `gcp-setup` | IAM roles, service accounts, GCS buckets, Cloud Run domain mapping |
| `player-indexing` | Player data collection, Meilisearch reindexing, Firestore uploads |
| `cloudflare-cdn` | Cache purging, DNS config, CDN troubleshooting |
| `aoe2-relic-api` | Civ/map mappings, API encoding, adding new civs |

Skills are loaded on demand when relevant — ask Claude about any of these topics and the right skill activates automatically. You can also invoke them directly with `/skill-name`.

## Data/API References

- [RelicLink API](https://app.swaggerhub.com/apis/simonsan/RelicLinkCommunityAPI_OA3/0.1#/)
- [RecentMatchHistory (LibreMatch wiki)](https://wiki.librematch.org/rlink/game/leaderboard/getrecentmatchhistory)
- [Civ reference data (100.json)](https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json)
- [mgz replay parser](https://github.com/happyleavesaoc/python-mgz)
- [edgelink-api-client](https://github.com/oliverfenwick90/edgelink-api-client/blob/main/src/util.ts#L3)
- [librematch-collector](https://github.com/librematch/librematch-collector/) — slot metadata parsing, leaderboard mapping
- [aoe2companion](https://github.com/denniske/aoe2companion)
- [Steam Web API](https://steamwebapi.azurewebsites.net/)

## License

MIT
