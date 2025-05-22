# Project Context: AoE2 APM Static Site Generator

## Purpose
This project automatically fetches, processes, and visualizes Age of Empires II: Definitive Edition (AoE2:DE) recorded games (recs) for your own matches. It generates a static website with detailed APM (actions per minute) charts and match/player summaries.

## Workflow
1. **Polling and Downloading Recs:**
   - Polls the official RelicLink API for recent matches.
   - Filters for your own games and downloads the rec files.
   - Saves match metadata (including rec URLs) in a JSON file.
   - Downloads recs as zip files, using the server-provided filename.
   - Extracts the actual rec file from the zip.

2. **Parsing and Chart Generation:**
   - Parses all recs and generates APM charts for each match and player.
   - Uses `prepare_rec` and `plot_apm` functions from `utils/aoe_rec.py` and `utils/viz.py`.
   - Exports charts as HTML and embeds them in per-match pages.
   - All player charts for a match use the same x-axis (minutes) for comparison, even if some players quit early.

3. **Site Structure and Metadata:**
   - Main index: `site/index.html`.
   - Per-match directories: `site/matches/{match_id}/` with `match.html` and per-player chart files.
   - Index groups matches by day in collapsible sections, sorted by most recent.
   - Each match page displays: type, team size, map, duration, teams, players, winner, start time, and APM charts.

4. **Civilization Mapping:**
   - Civilization names are sourced from [Siege Engineers 100.json](https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json).
   - The mapping is constructed dynamically from the `civilizations` key in `100.json`.
   - Civ names are shown for each player in summaries and charts.

5. **Winner/Team Logic:**
   - The winning team is determined by the `winner` field in the player dicts from `get_players()`.
   - `get_played()` is used only for the match start time.
   - All summary and chart pages clearly indicate the winning team and player civs.

## Key Design Choices
- **Separation of Concerns:**
  - Notebooks and exploratory analysis remain in the original repo.
  - The static site generator and supporting scripts/utilities are moved to a new, productionized repo.
- **Static Site Output:**
  - All HTML is generated statically; no server is required to browse the site.
- **Extensibility:**
  - Civ mapping is easily updatable by replacing `100.json`.
  - The workflow supports new recs and new civs with minimal changes.
- **Reproducibility:**
  - All scripts are designed to be run from the command line or via cron.
  - Outputs are deterministic and can be regenerated at any time.

## API and Data References
- **RelicLink API:** Used for polling match history and downloading recs.
  - https://app.swaggerhub.com/apis/simonsan/RelicLinkCommunityAPI_OA3/0.1#/
- **Siege Engineers Civ Reference:**
  - [100.json](https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json)
- **mgz Python Library:** Used for parsing AoE2:DE rec files.
 - https://github.com/happyleavesaoc/python-mgz
- mgx-format (AoE2 replay action types):
  - https://github.com/stefan-kolb/aoc-mgx-format/tree/master/spec/body/actions
- **Bokeh/Chartify:** Used for generating interactive APM charts.


## File/Directory Overview
- `generate_apm_site.py`: Main script to generate the static site.
- `aoe2_poller.py`: Script to poll and download new recs.
- `utils/aoe_rec.py`: Functions for parsing recs and extracting match/player summaries.
- `utils/viz.py`: Functions for generating APM charts.
- `100.json`: Civilization mapping (source: Siege Engineers).
- `site/`: Generated static site output.
- `recs/`: Downloaded and extracted rec files.
- `requirements.txt`: Python dependencies.

## Usage
- Run `aoe2_poller.py` to fetch new recs.
- Run `generate_apm_site.py` to parse recs and generate/update the static site.
- Open `site/index.html` in your browser to view the results.

## Notes
- The original repo also contains Jupyter notebooks for exploratory analysis. These are not included in the new site repo.
- All design decisions, API endpoints, and civ mappings are documented here for future reference and onboarding. 