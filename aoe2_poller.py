import os
import time
import json
import requests
from pathlib import Path
from datetime import datetime, timedelta
import zipfile

# Config
PROFILE_ID = int(os.getenv('AOE2_PROFILE_ID', '4764337'))  # Set your profile ID
SEEN_FILE = Path('seen_matches.json')
RECS_DIR = Path('recs')
API_URL = os.getenv('AOE2_API_URL', 'https://aoe-api.reliclink.com/community/leaderboard/getRecentMatchHistory')


def load_seen_matches():
    if SEEN_FILE.exists():
        with open(SEEN_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_seen_matches(match_dict):
    with open(SEEN_FILE, 'w') as f:
        json.dump(match_dict, f, indent=2)

def fetch_matches():
    params = {
        'title': 'age2',
        'profile_ids': f'[{PROFILE_ID}]'
    }
    resp = requests.get(API_URL, params=params, verify=False)  # verify=False for SSL issues
    resp.raise_for_status()
    return resp.json()

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
        return str(fpath)
    except Exception as e:
        print(f"Failed to download rec for match {match_id}: {e}")
        return None

def main():
    seen = load_seen_matches()  # dict: match_id -> {profile_id, startgametime}
    print(f"Loaded {len(seen)} seen matches.")
    try:
        data = fetch_matches()
        now = int(time.time())
        one_month_ago = now - 86400 * 30
        matches = data.get('matchHistoryStats', [])
        # Filter matches from the last 30 days where our profile_id participated
        recent_matches = [
            m for m in matches
            if m.get('startgametime', 0) >= one_month_ago and any(r['profile_id'] == PROFILE_ID for r in m.get('matchhistoryreportresults', []))
        ]
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
                # Download rec
                download_rec(match_id, PROFILE_ID, start_ts)
                time.sleep(2)
            save_seen_matches(seen)
        else:
            print("No new matches in the last 30 days.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main() 