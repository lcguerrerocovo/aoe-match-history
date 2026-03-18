# APM Processor — Cloud Function (Python)

Cloud Function Gen2 that parses AoE2 replay files and extracts APM (Actions Per Minute) data.

## How It Works

1. Receives `POST {gameId, profileId}`
2. Downloads replay from `https://aoe.ms/replay/?gameId=X&profileId=Y`
3. Handles ZIP-wrapped replays (extracts first entry)
4. Parses with `mgz.model.parse_match()` — the stable public API
5. Buckets actions by player and minute
6. Returns per-player per-minute action breakdown + average APM

## Running Locally

```bash
pip install -r requirements.txt
python -m functions_framework --target=aoe2_apm_processor --port=5001
```

Or via the UI dev command: `npm run dev:apm` (from `ui/`)

## Tests

Tests in `test_main.py` with shared fixtures in `conftest.py`:

```bash
pytest test_main.py -v              # Run all APM tests
pytest test_main.py -k TestCategorize -v  # Run specific test class
```

Uses pytest with `responses` for HTTP mocking. Fixtures provide MockRequest, MockAction, MockPlayer, MockMatch for unit testing without live HTTP or mgz parsing.

## Response Format

```json
{
  "matchId": "...",
  "profileId": "...",
  "processedAt": 1234567890000,
  "apm": {
    "players": {
      "<profileId>": [{"minute": 0, "total": 42, "MOVE": 10, ...}]
    },
    "averages": {"<profileId>": 55}
  }
}
```

## mgz & Game Update Compatibility

mgz breaks when AoE2 game updates change the replay format. **Current state:** using Kjir's fork because upstream PyPI doesn't support save version 67.x yet ([aoc-mgz#138](https://github.com/happyleavesaoc/aoc-mgz/issues/138)). When upstream catches up, revert `requirements.txt` to just `mgz`. When it breaks again, check [aoc-mgz issues](https://github.com/happyleavesaoc/aoc-mgz/issues) for forks with fixes and point `requirements.txt` at the fork (`mgz @ git+https://github.com/<user>/aoc-mgz.git@<branch>`).

## Gotchas

- Game engine runs at 20 frames/second — frame-based timing uses this constant
- Duration can be timedelta or milliseconds depending on mgz version
- Player numbers (in-game) mapped to profile_ids via replay metadata
- Action categories extracted from enum `.name`, string, or raw attribute — normalized via `_categorize()`
- Entry point is `apm_handler()`, but deployed as `aoe2_apm_processor` (wrapper)
