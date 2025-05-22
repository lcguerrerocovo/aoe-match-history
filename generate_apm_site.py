import os
from pathlib import Path
from utils.aoe_rec import prepare_rec, extract_match_summary
from utils.viz import plot_apm
import re
import shutil
from datetime import datetime
import zipfile
from bokeh.embed import components
from bs4 import BeautifulSoup
from collections import defaultdict
import json
import pandas as pd

SITE_DIR = Path('site')
MATCHES_DIR = SITE_DIR / 'matches'
INDEX_FILE = SITE_DIR / 'index.html'
RECS_DIR = Path('recs')

SITE_DIR.mkdir(exist_ok=True)
MATCHES_DIR.mkdir(exist_ok=True)

rec_files = list(RECS_DIR.glob('*.zip'))

entries = []

# Load civ mapping
with open('100.json') as f:
    data = json.load(f)
    civ_map = {str(cid): cinfo['name'] for cid, cinfo in data['civilizations'].items()}

def extract_rec(zip_path, match_id):
    out_path = RECS_DIR / f"{match_id}.aoe2record"
    if out_path.exists():
        return out_path
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for name in zf.namelist():
                if name.endswith('.mgz') or name.endswith('.aoe2record'):
                    zf.extract(name, RECS_DIR)
                    extracted_path = RECS_DIR / name
                    extracted_path.rename(out_path)
                    return out_path
        print(f"No .mgz or .aoe2record file found in {zip_path.name}")
        return None
    except Exception as e:
        print(f"Failed to extract {zip_path.name}: {e}")
        return None

def extract_match_summary(match_id):
    match_html = MATCHES_DIR / match_id / "match.html"
    if not match_html.exists():
        return None
    # Extract summary block from match.html (first 120 lines for safety)
    with open(match_html, "r", encoding="utf-8") as f:
        lines = f.readlines()[:120]
    # Find start time, type, map, duration, teams, winner
    summary = {"match_id": match_id}
    fields = ["start_time", "type", "map", "duration", "winner", "teams"]
    field_map = {
        "Start Time": "start_time",
        "Type": "type",
        "Map": "map",
        "Duration": "duration",
        "Winning Team": "winner",
        "Teams": "teams",
    }
    for line in lines:
        for label, key in field_map.items():
            if label in line:
                summary[key] = re.sub(r'<.*?>', '', line.split("</td><td>")[-1].replace("</td>", "").strip())
    # Ensure all fields are present
    for key in fields:
        if key not in summary:
            summary[key] = "?"
    return summary

def main():
    # Step 1: Find all rec files and process new ones, generate summary.json for each
    rec_files = list(RECS_DIR.glob('*.zip'))
    entries = []
    for zip_path in rec_files:
        m = re.match(r'.*?(\d+)\.zip$', zip_path.name)
        if not m:
            continue
        match_id = m.group(1)
        match_dir = MATCHES_DIR / match_id
        match_html = match_dir / "match.html"
        summary_json = match_dir / "summary.json"
        # If summary.json exists, skip parsing rec
        if summary_json.exists():
            with open(summary_json, 'r') as f:
                match_summary = json.load(f)
            dt = datetime.fromtimestamp(zip_path.stat().st_mtime)
            entries.append((dt, match_id, match_html.relative_to(SITE_DIR), match_summary))
            continue
        rec_path = extract_rec(zip_path, match_id)
        if not rec_path or not rec_path.exists():
            continue
        dt = datetime.fromtimestamp(zip_path.stat().st_mtime)
        print(f"Processing {rec_path.name}")
        try:
            df = prepare_rec(str(rec_path))
            if df.empty or 'relative_minute' not in df or df['relative_minute'].dropna().empty:
                print(f"Skipping {rec_path.name}: DataFrame is empty or missing relative_minute.")
                continue
            max_minute_val = df['relative_minute'].max()
            if pd.isna(max_minute_val):
                print(f"Skipping {rec_path.name}: max relative_minute is NaN.")
                continue
            max_minute = int(max_minute_val)
            from utils.aoe_rec import extract_match_summary as extract_summary_from_rec
            match_summary = extract_summary_from_rec(str(rec_path))
            if not match_summary or 'teams' not in match_summary or 'players' not in match_summary or 'winning_team' not in match_summary:
                print(f"Skipping {rec_path.name}: match_summary missing required keys.")
                continue
            match_dir.mkdir(parents=True, exist_ok=True)
            # Save summary.json
            with open(summary_json, 'w') as f:
                json.dump(match_summary, f)
            all_scripts = []
            all_divs = []
            for player in df['player'].unique():
                player_df = df[df['player'] == player]
                player_html = match_dir / f"{match_id}_{player}.html"
                plot_apm(player_df, output_html=str(player_html), max_minute=max_minute)
                with open(player_html) as f:
                    soup = BeautifulSoup(f.read(), 'html.parser')
                    all_scripts += [str(s) for s in soup.find_all('script')]
                    all_divs.append((player, str(soup.find('div', id=True))))
            teams = match_summary['teams']
            players = match_summary['players']
            winning_team = match_summary['winning_team']
            with open(match_html, 'w') as f:
                f.write('<html><head><title>APM Charts</title></head><body>\n')
                f.write(f'<h1>Match {match_id}</h1>\n')
                for script in all_scripts:
                    f.write(script)
                for idx, team in enumerate(teams):
                    is_winner = (winning_team == idx+1)
                    winner_span = '<span style="color:green">(Winner)</span>' if is_winner else ''
                    f.write(f'<h2>Team {idx+1} {winner_span}</h2>\n')
                    team_players = [p for p in players if p['number'] in team]
                    for p in team_players:
                        civ_name = civ_map.get(str(p.get('civilization')), '?')
                        name = p['name']
                        player = name
                        div = None
                        for pl, d in all_divs:
                            if pl == player:
                                div = d
                                break
                        winner_mark = ' <b>★</b>' if is_winner else ''
                        f.write(f'<div style="margin-bottom:30px;">')
                        f.write(f'<h3>{name} ({civ_name}){winner_mark}</h3>')
                        if div:
                            f.write(div)
                        f.write('</div>')
                f.write('</body></html>\n')
            entries.append((dt, match_id, match_html.relative_to(SITE_DIR), match_summary))
        except Exception as e:
            print(f"Failed to process {rec_path.name}: {e}")

    # Step 2: Build index.html from all summary.json files
    entries = []
    for match_dir in MATCHES_DIR.iterdir():
        if not match_dir.is_dir():
            continue
        summary_json = match_dir / "summary.json"
        match_html = match_dir / "match.html"
        if summary_json.exists():
            with open(summary_json, 'r') as f:
                match_summary = json.load(f)
            # Use mtime of the zip file if available, else fallback to summary file mtime
            match_id = match_dir.name
            zip_path = RECS_DIR / f"AgeIIDE_Replay_{match_id}.zip"
            if zip_path.exists():
                dt = datetime.fromtimestamp(zip_path.stat().st_mtime)
            else:
                dt = datetime.fromtimestamp(summary_json.stat().st_mtime)
            entries.append((dt, match_id, match_html.relative_to(SITE_DIR), match_summary))
    def parse_start_time(entry):
        summary = entry[3]
        st = summary.get('start_time', '?')
        try:
            return datetime.strptime(st, '%Y-%m-%d %H:%M UTC')
        except Exception:
            return datetime.min
    entries.sort(key=parse_start_time, reverse=True)
    # Group entries by date
    entries_by_date = defaultdict(list)
    for entry in entries:
        summary = entry[3]
        st = summary.get('start_time', '?')
        try:
            date_str = datetime.strptime(st, '%Y-%m-%d %H:%M UTC').strftime('%Y-%m-%d')
        except Exception:
            date_str = '?'  # Unknown date
        entries_by_date[date_str].append(entry)
    # Sort dates descending
    sorted_dates = sorted(entries_by_date.keys(), reverse=True)
    with open(INDEX_FILE, 'w') as f:
        f.write('<html><head><title>AOE Match History</title></head><body>\n')
        f.write('<h1>AOE2 Match History</h1>\n')
        for date_str in sorted_dates:
            day_entries = entries_by_date[date_str]
            f.write(f'<details><summary>{date_str} ({len(day_entries)} matches)</summary>\n')
            for dt, match_id, chart_rel_path, summary in day_entries:
                diplomacy = summary['diplomacy']
                map_info = summary['map']
                duration = summary['duration']
                winning_team = summary['winning_team']
                winning_team_players = summary.get('winning_team_players', [])
                start_time = summary.get('start_time', '?')
                teams = summary['teams']
                players = summary['players']
                f.write('<table border="1" style="margin-bottom:20px;">\n')
                f.write(f'<tr><th colspan="2">Match {match_id} | <a href="{chart_rel_path}">View Match Charts</a></th></tr>\n')
                f.write(f'<tr><td>Start Time</td><td>{start_time}</td></tr>\n')
                f.write(f'<tr><td>Type</td><td>{diplomacy.get("type","?")} ({diplomacy.get("team_size","?")})</td></tr>\n')
                f.write(f'<tr><td>Map</td><td>{map_info.get("name","?")} ({map_info.get("size","?")})</td></tr>\n')
                f.write(f'<tr><td>Duration</td><td>{duration}</td></tr>\n')
                if winning_team:
                    f.write(f'<tr><td>Winning Team</td><td>Team {winning_team}: {", ".join(winning_team_players)}</td></tr>\n')
                else:
                    f.write('<tr><td>Winning Team</td><td>?</td></tr>\n')
                # Teams and players
                f.write('<tr><td>Teams</td><td>')
                for idx, team in enumerate(teams):
                    is_winner = (winning_team == idx+1)
                    f.write(f'Team {idx+1}: ')
                    team_players = [p for p in players if p['number'] in team]
                    player_strs = []
                    for p in team_players:
                        civ_name = civ_map.get(str(p.get('civilization')), '?')
                        name = p['name']
                        # Mark winner with a star
                        if is_winner:
                            player_strs.append(f'<b>{name} ({civ_name})</b>')
                        else:
                            player_strs.append(f'{name} ({civ_name})')
                    f.write(", ".join(player_strs))
                    f.write('<br>')
                f.write('</td></tr>\n')
                f.write('</table>\n')
            f.write('</details>\n')
        f.write('</body></html>\n')

if __name__ == "__main__":
    main() 