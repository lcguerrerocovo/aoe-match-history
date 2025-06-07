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
from google.cloud import storage

DATA_DIR = Path('data')
MATCHES_DATA_DIR = DATA_DIR / 'matches'
RECS_DIR = Path('recs')
RECS_BUCKET = 'aoe2-recs'
SITE_BUCKET = 'aoe2.site'
SITE_DIR = Path('site')

DATA_DIR.mkdir(exist_ok=True)
MATCHES_DATA_DIR.mkdir(exist_ok=True)
SITE_DIR.mkdir(exist_ok=True)

rec_files = list(RECS_DIR.glob('*.zip'))

entries = []

# Load civ mapping
with open('data/100.json') as f:
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
    match_json = MATCHES_DATA_DIR / f"{match_id}.json"
    if not match_json.exists():
        return None
    with open(match_json, "r", encoding="utf-8") as f:
        return json.load(f)

def download_file_from_gcs(client, bucket_name, blob_name, local_path):
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    if blob.exists():
        blob.download_to_filename(local_path)
        print(f"Downloaded gs://{bucket_name}/{blob_name} to {local_path}")
        return True
    return False

def generate_apm_charts(df, match_id, match_summary):
    """Generate APM charts for each player in the match."""
    if not match_summary or 'players' not in match_summary:
        print(f"Skipping APM chart generation for match {match_id}: missing player data")
        return

    # Create match directory in site folder
    match_dir = SITE_DIR / 'matches' / match_id
    match_dir.mkdir(parents=True, exist_ok=True)

    # Generate individual player charts and collect their scripts and divs
    all_scripts = []
    all_divs = []
    for player in df['player'].unique():
        player_df = df[df['player'] == player]
        player_html = match_dir / f"{match_id}_{player}.html"
        plot_apm(player_df, output_html=str(player_html))
        with open(player_html) as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
            all_scripts += [str(s) for s in soup.find_all('script')]
            all_divs.append((player, str(soup.find('div', id=True))))

    # Generate the combined match HTML
    match_html = match_dir / "match.html"
    teams = match_summary['teams']
    players = match_summary['players']
    winning_team = match_summary['winning_team']

    with open(match_html, 'w') as f:
        f.write('<html><head><meta charset="UTF-8"><title>APM Charts</title></head><body>\n')
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

    # Clean up individual player HTML files
    for player in df['player'].unique():
        player_html = match_dir / f"{match_id}_{player}.html"
        if player_html.exists():
            player_html.unlink()

    print(f"Generated APM charts for match {match_id}")

def main():
    # Create a single storage client
    client = storage.Client()
    site_bucket = client.bucket(SITE_BUCKET)
    recs_bucket = client.bucket(RECS_BUCKET)

    # Download all summary.json files from site bucket if not present locally
    for blob in site_bucket.list_blobs(prefix='data/matches/'):
        if blob.name.endswith('.json'):
            match_id = os.path.basename(blob.name).replace('.json', '')
            local_file = MATCHES_DATA_DIR / f"{match_id}.json"
            if not local_file.exists():
                MATCHES_DATA_DIR.mkdir(parents=True, exist_ok=True)
                blob.download_to_filename(local_file)
                print(f"Downloaded {blob.name} to {local_file}")

    # Get all existing match.html files in GCS
    existing_matches = set()
    for blob in site_bucket.list_blobs(prefix='site/matches/'):
        if blob.name.endswith('/match.html'):
            match_id = blob.name.split('/')[2]  # site/matches/{match_id}/match.html
            existing_matches.add(match_id)

    # Step 1: Find all rec files, download from GCS if not present
    blobs = list(recs_bucket.list_blobs(prefix='recs/AgeIIDE_Replay_'))
    for blob in blobs:
        if blob.name.endswith('.zip'):
            match_id = os.path.basename(blob.name).replace('AgeIIDE_Replay_', '').replace('.zip', '')
            # Check if match.html exists in GCS
            if match_id in existing_matches:
                print(f"Skipping {match_id}: match.html already exists in GCS")
                continue
            # Check if summary.json exists locally
            summary_json_local = MATCHES_DATA_DIR / f"{match_id}.json"
            if not summary_json_local.exists():
                continue  # Skip if no summary.json
            # Download rec if not present
            local_path = RECS_DIR / os.path.basename(blob.name)
            if not local_path.exists():
                RECS_DIR.mkdir(exist_ok=True)
                download_file_from_gcs(client, RECS_BUCKET, blob.name, local_path)
            # Process rec and generate summary.json
            m = re.match(r'.*?(\d+)\.zip$', os.path.basename(blob.name))
            if not m:
                continue
            match_id = m.group(1)
            summary_json = MATCHES_DATA_DIR / f"{match_id}.json"
            rec_path = extract_rec(local_path, match_id)
            if not rec_path or not rec_path.exists():
                continue
            dt = datetime.fromtimestamp(local_path.stat().st_mtime)
            print(f"Processing {rec_path.name}")
            try:
                df = prepare_rec(str(rec_path))
                if df.empty or 'relative_minute' not in df or df['relative_minute'].dropna().empty:
                    print(f"Skipping {rec_path.name}: DataFrame is empty or missing relative_minute.")
                    # Try to generate summary from rec anyway
                    from utils.aoe_rec import extract_match_summary as extract_summary_from_rec
                    match_summary = extract_summary_from_rec(str(rec_path))
                    # Save summary.json
                    with open(summary_json, 'w') as f:
                        json.dump(match_summary, f)
                    # Generate APM charts
                    generate_apm_charts(df, match_id, match_summary)
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
                # Save summary.json
                with open(summary_json, 'w') as f:
                    json.dump(match_summary, f)
                # Generate APM charts
                generate_apm_charts(df, match_id, match_summary)
            except Exception as e:
                print(f"Error processing {rec_path.name}: {e}")
                continue

    # After seen_matches.json is generated, copy it to data/matches/index.json
    shutil.copyfile('seen_matches.json', 'data/matches/index.json')

    # --- Generate summary index.json ---
    summary_index = {}
    for match_file in os.listdir('data/matches'):
        if not match_file.endswith('.json') or match_file == 'index.json':
            continue
        match_id = match_file.replace('.json', '')
        with open(os.path.join('data/matches', match_file), 'r') as f:
            match = json.load(f)
            teams_summary = []
            if 'teams' in match and 'players' in match:
                for team in match['teams']:
                    team_players = []
                    for player_num in team:
                        player = next((p for p in match['players'] if (p.get('number') if isinstance(p, dict) else None) == player_num), None)
                        if player:
                            team_players.append({
                                'name': player['name'] if isinstance(player, dict) else player,
                                'civ': player.get('civilization') if isinstance(player, dict) else None,
                                'number': player.get('number') if isinstance(player, dict) else None,
                                'color_id': player.get('color_id') if isinstance(player, dict) else None,
                                'user_id': player.get('user_id') if isinstance(player, dict) else None,
                                'winner': player.get('winner') if isinstance(player, dict) else None,
                                'rate_snapshot': player.get('rate_snapshot') if isinstance(player, dict) else None,
                            })
                    teams_summary.append(team_players)
            summary_index[match_id] = {
                'match_id': match_id,
                'start_time': match.get('start_time'),
                'diplomacy': match.get('diplomacy'),
                'map': match.get('map', {}).get('name'),
                'duration': match.get('duration'),
                'teams': teams_summary,
                'winning_team': match.get('winning_team'),
            }
    with open('data/matches/index.json', 'w') as f:
        json.dump(summary_index, f)

if __name__ == "__main__":
    main() 