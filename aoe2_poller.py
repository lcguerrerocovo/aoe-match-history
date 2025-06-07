import os
import time
import json
import requests
from pathlib import Path
from datetime import datetime, timedelta
import zipfile
from google.cloud import storage

# Config
PROFILE_ID = int(os.getenv('AOE2_PROFILE_ID', '4764337'))  # Set your profile ID
SEEN_FILE = Path('seen_matches.json')
RECS_DIR = Path('recs')
RECS_BUCKET = 'aoe2-recs'
API_URL = os.getenv('AOE2_API_URL', 'https://aoe-api.reliclink.com/community/leaderboard/getRecentMatchHistory')


def download_file_from_gcs(bucket_name, blob_name, local_path):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    if blob.exists():
        blob.download_to_filename(local_path)
        print(f"Downloaded gs://{bucket_name}/{blob_name} to {local_path}")
        return True
    return False

def load_seen_matches():
    # Try to download from GCS first
    if download_file_from_gcs(RECS_BUCKET, 'seen_matches.json', SEEN_FILE):
        with open(SEEN_FILE, 'r') as f:
            return json.load(f)
    if SEEN_FILE.exists():
        with open(SEEN_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_seen_matches(match_dict):
    with open(SEEN_FILE, 'w') as f:
        json.dump(match_dict, f, indent=2)
    # Upload to GCS
    upload_file_to_gcs(str(SEEN_FILE), RECS_BUCKET, 'seen_matches.json')

def fetch_matches():
    params = {
        'title': 'age2',
        'profile_ids': f'[{PROFILE_ID}]'
    }
    resp = requests.get(API_URL, params=params, verify=False)  # verify=False for SSL issues
    resp.raise_for_status()
    return resp.json()

def upload_file_to_gcs(local_path, bucket_name, dest_path=None):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(dest_path or Path(local_path).name)
    blob.upload_from_filename(local_path)
    print(f"Uploaded {local_path} to gs://{bucket_name}/{blob.name}")

def check_rec_in_gcs(bucket_name, match_id):
    print(f"Checking GCS for match {match_id}")
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    # Check both possible filename formats
    blob_name = f"recs/AgeIIDE_Replay_{match_id}.zip"
    blob = bucket.blob(blob_name)
    exists = blob.exists()
    print(f"GCS check result for {blob_name}: {exists}")
    return exists

def download_rec(match_id, profile_id, start_ts):
    RECS_DIR.mkdir(exist_ok=True)
    url = f"https://aoe.ms/replay/?gameId={match_id}&profileId={profile_id}"
    print(f"Downloading rec: {url}")
    headers = {
        "User-Agent": "Wget/1.21.1"
    }
    try:
        r = requests.get(url, allow_redirects=True, timeout=60, headers=headers)
        r.raise_for_status()
        # Try to get filename from Content-Disposition
        cd = r.headers.get('content-disposition')
        if cd and 'filename=' in cd:
            fname = cd.split('filename=')[1].split(';')[0].strip().strip('"')
        else:
            # Fallback: use the last part of the final URL
            fname = r.url.split('/')[-1]
        fpath = RECS_DIR / fname
        if fpath.exists():
            print(f"Rec already exists: {fpath}")
            return str(fpath)
        with open(fpath, 'wb') as f:
            f.write(r.content)
        print(f"Saved rec: {fpath}")
        # Upload to GCS with the correct filename format
        gcs_fname = f"AgeIIDE_Replay_{match_id}.zip"
        upload_file_to_gcs(str(fpath), RECS_BUCKET, f"recs/{gcs_fname}")
        return str(fpath)
    except Exception as e:
        print(f"Failed to download rec for match {match_id}: {e}")
        return None

def check_recs_in_gcs(bucket_name, match_ids):
    print(f"Checking GCS for {len(match_ids)} matches...")
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    
    # Get all existing recs in GCS
    existing_recs = set()
    for blob in bucket.list_blobs(prefix='recs/AgeIIDE_Replay_'):
        match_id = blob.name.split('_')[-1].replace('.zip', '')
        existing_recs.add(match_id)
    
    # Find missing recs
    missing_recs = []
    for match_id in match_ids:
        if match_id not in existing_recs:
            missing_recs.append(match_id)
            print(f"Rec missing in GCS for match {match_id}")
        else:
            print(f"Rec exists in GCS for match {match_id}")
    
    return missing_recs

def main():
    seen = load_seen_matches()  # dict: match_id -> {profile_id, startgametime}
    print(f"Loaded {len(seen)} seen matches.")
    try:
        print("Fetching matches from API...")
        data = fetch_matches()
        now = int(time.time())
        one_month_ago = now - 86400 * 30
        matches = data.get('matchHistoryStats', [])
        print(f"Found {len(matches)} total matches in API response")
        # Filter matches from the last 30 days where our profile_id participated
        recent_matches = [
            m for m in matches
            if m.get('startgametime', 0) >= one_month_ago and any(r['profile_id'] == PROFILE_ID for r in m.get('matchhistoryreportresults', []))
        ]
        print(f"Found {len(recent_matches)} recent matches")
        new_matches = [m for m in recent_matches if str(m['id']) not in seen]
        if new_matches:
            print(f"Found {len(new_matches)} new matches in the last 30 days.")
            for match in new_matches:
                match_id = str(match['id'])
                start_ts = match.get('startgametime', 0)
                # Save match info
                seen[match_id] = {
                    'profile_id': PROFILE_ID,
                    'startgametime': start_ts
                }
            save_seen_matches(seen)
        else:
            print("No new matches in the last 30 days.")

        # Get recent match IDs from seen matches
        recent_match_ids = [
            match_id for match_id, info in seen.items()
            if info['startgametime'] >= one_month_ago
        ]
        print(f"Found {len(recent_match_ids)} recent matches in seen_matches.json")

        # Check all recent matches in GCS at once
        missing_recs = check_recs_in_gcs(RECS_BUCKET, recent_match_ids)

        # Download all missing recs
        if missing_recs:
            print(f"Downloading {len(missing_recs)} missing recs...")
            for i, match_id in enumerate(missing_recs, 1):
                print(f"Downloading rec {i}/{len(missing_recs)} for match {match_id}...")
                match_info = seen[match_id]
                download_rec(match_id, match_info['profile_id'], match_info['startgametime'])
                time.sleep(2)
        else:
            print("All recs are present in GCS.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main() 