# AoE2 Match History & APM Static Site Generator

## Overview
This project fetches, processes, and visualizes Age of Empires II: Definitive Edition (AoE2:DE) recorded games (recs) for your own matches. It generates a static website with detailed APM (actions per minute) charts and match/player summaries.

## Features
- Polls the official RelicLink API for recent matches and downloads rec files
- Parses recs and generates interactive APM charts (Bokeh/Chartify)
- Static HTML site with per-match and per-player summaries
- Civilization mapping using Siege Engineers reference data
- Clear winner/team logic and match metadata
- Deterministic, reproducible outputs

## Directory Structure
- `generate_apm_site.py`: Main static site generator
- `aoe2_poller.py`: Polls and downloads new recs
- `utils/aoe_rec.py`: Rec parsing and summary extraction
- `utils/viz.py`: APM chart generation
- `100.json`: Civilization mapping
- `site/`: Generated static site
- `recs/`: Downloaded/extracted rec files
- `requirements.txt`: Python dependencies

## Setup
1. Clone the repository
2. (Recommended) Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. (Optional) Set up a cron job to automate polling and site generation

## Usage
1. Run the poller to fetch new recs:
```bash
python aoe2_poller.py
```
2. Generate/update the static site:
```bash
python generate_apm_site.py
```
3. Open `site/index.html` in your browser

## Data/API References
- RelicLink API: https://app.swaggerhub.com/apis/simonsan/RelicLinkCommunityAPI_OA3/0.1#/
- Civ mapping: [100.json](https://raw.githubusercontent.com/SiegeEngineers/aoc-reference-data/master/data/datasets/100.json)
- mgz Python library: https://github.com/happyleavesaoc/python-mgz

## Notes
- All HTML is generated statically; no server required
- Notebooks and exploratory analysis are not included in this repo 