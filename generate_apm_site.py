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
SITE_BUCKET = 'aoe2-match-history-site'

DATA_DIR.mkdir(exist_ok=True)
MATCHES_DATA_DIR.mkdir(exist_ok=True)

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

def download_file_from_gcs(bucket_name, blob_name, local_path):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    if blob.exists():
        blob.download_to_filename(local_path)
        print(f"Downloaded gs://{bucket_name}/{blob_name} to {local_path}")
        return True
    return False

def upload_dir_to_gcs(local_dir, bucket_name, dest_prefix=""):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    for root, _, files in os.walk(local_dir):
        for file in files:
            local_path = os.path.join(root, file)
            rel_path = os.path.relpath(local_path, local_dir)
            blob_path = os.path.join(dest_prefix, rel_path).replace("\\", "/")
            blob = bucket.blob(blob_path)
            blob.upload_from_filename(local_path)
            print(f"Uploaded {local_path} to gs://{bucket_name}/{blob_path}")

def main():
    # Download all summary.json files from site bucket if not present locally
    site_client = storage.Client()
    site_bucket = site_client.bucket(SITE_BUCKET)
    for blob in site_bucket.list_blobs(prefix='data/matches/'):
        if blob.name.endswith('.json'):
            match_id = os.path.basename(blob.name).replace('.json', '')
            local_file = MATCHES_DATA_DIR / f"{match_id}.json"
            if not local_file.exists():
                MATCHES_DATA_DIR.mkdir(parents=True, exist_ok=True)
                blob.download_to_filename(local_file)
                print(f"Downloaded {blob.name} to {local_file}")

    # Step 1: Find all rec files, download from GCS if not present
    recs_client = storage.Client()
    recs_bucket = recs_client.bucket(RECS_BUCKET)
    blobs = list(recs_bucket.list_blobs(prefix='recs/'))
    for blob in blobs:
        if blob.name.endswith('.zip'):
            match_id_match = re.match(r'.*?(\d+)\.zip$', os.path.basename(blob.name))
            if match_id_match:
                match_id = match_id_match.group(1)
                # Check if summary.json exists locally
                summary_json_local = MATCHES_DATA_DIR / f"{match_id}.json"
                if summary_json_local.exists():
                    continue  # Skip download and processing if file exists locally
                # Download rec if not present
                local_path = RECS_DIR / os.path.basename(blob.name)
                if not local_path.exists():
                    RECS_DIR.mkdir(exist_ok=True)
                    download_file_from_gcs(RECS_BUCKET, blob.name, local_path)
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
                        # Upload summary.json to site bucket
                        site_bucket.blob(f"data/matches/{match_id}.json").upload_from_filename(summary_json)
                        print(f"Uploaded data/matches/{match_id}.json to {SITE_BUCKET}")
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
                    # Upload summary.json to site bucket
                    site_bucket.blob(f"data/matches/{match_id}.json").upload_from_filename(summary_json)
                    print(f"Uploaded data/matches/{match_id}.json to {SITE_BUCKET}")
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
                                'civ': player.get('civilization') if isinstance(player, dict) else None
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