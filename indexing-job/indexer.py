#!/usr/bin/env python3
"""
Index Player Data to Meilisearch from JSONL file - Cloud Run Version

This script is adapted from the original scripts/index_from_jsonl.py for Cloud Run environment.
It runs against a local Meilisearch instance and creates a snapshot for hot-swapping.
"""

import json
import os
import logging
import meilisearch
import sys
from pathlib import Path
from datetime import datetime, timezone
import requests
import time

# --- Configuration ---
INDEX_NAME = "players"
BATCH_SIZE = 2500
MEILI_URL = "http://localhost:7700"
MEILI_MASTER_KEY = "masterKey"

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_player_data(player_data):
    """Processes a single player record into a clean document for Meilisearch."""
    
    profile_id = player_data.get('profile_id')
    name = player_data.get('name')
    alias = player_data.get('alias')
    
    if not profile_id or not (name or alias):
        return None
        
    return {
        'profile_id': profile_id,
        'name': name,
        'alias': alias,
        'country': player_data.get('country', ''),
        'clanlist_name': player_data.get('clanlist_name', ''),
        'total_matches': player_data.get('total_matches', 0),
        'last_match_date': player_data.get('last_match_date')
    }

def wait_for_meilisearch():
    """Wait for Meilisearch to be ready."""
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{MEILI_URL}/health")
            if response.status_code == 200:
                health_data = response.json()
                if health_data.get('status') == 'available':
                    logging.info("✅ Meilisearch is ready!")
                    return True
        except:
            pass
        logging.info(f"Waiting for Meilisearch... (attempt {attempt + 1}/{max_attempts})")
        time.sleep(2)
    
    logging.error("❌ Meilisearch failed to start")
    return False

def create_snapshot():
    """Create a snapshot and return the snapshot file path."""
    try:
        logging.info("Creating snapshot...")
        response = requests.post(
            f"{MEILI_URL}/snapshots",
            headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"}
        )
        
        if response.status_code == 200:
            snapshot_data = response.json()
            task_uid = snapshot_data.get('taskUid')
            
            # Wait for snapshot to complete
            logging.info(f"Waiting for snapshot task {task_uid} to complete...")
            for _ in range(60):  # Wait up to 2 minutes
                task_response = requests.get(
                    f"{MEILI_URL}/tasks/{task_uid}",
                    headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"}
                )
                if task_response.status_code == 200:
                    task_info = task_response.json()
                    if task_info.get('status') == 'succeeded':
                        logging.info("✅ Snapshot created successfully!")
                        return True
                    elif task_info.get('status') == 'failed':
                        logging.error(f"❌ Snapshot failed: {task_info}")
                        return False
                time.sleep(2)
            
            logging.error("❌ Snapshot task timed out")
            return False
        else:
            logging.error(f"❌ Failed to create snapshot: {response.status_code}")
            return False
            
    except Exception as e:
        logging.error(f"❌ Error creating snapshot: {e}")
        return False

def upload_snapshot_to_gcs():
    """Upload the created snapshot to Google Cloud Storage."""
    try:
        import subprocess
        import glob
        
        # Find the snapshot file
        snapshot_files = glob.glob("/meili_data/snapshots/*.snapshot")
        if not snapshot_files:
            logging.error("❌ No snapshot files found")
            return False
            
        snapshot_file = snapshot_files[0]
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        gcs_path = f"gs://aoe2-site-data/meilisearch-snapshot-{timestamp}.snapshot"
        
        logging.info(f"Uploading snapshot to {gcs_path}...")
        result = subprocess.run([
            "gsutil", "cp", snapshot_file, gcs_path
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            logging.info("✅ Snapshot uploaded to GCS successfully!")
            return True
        else:
            logging.error(f"❌ Failed to upload snapshot: {result.stderr}")
            return False
            
    except Exception as e:
        logging.error(f"❌ Error uploading snapshot to GCS: {e}")
        return False

def main():
    """Main function to read, process, and upload data."""
    
    logging.info("Starting Meilisearch indexing job...")
    
    # 1. Wait for Meilisearch to be ready
    if not wait_for_meilisearch():
        return
    
    # 2. Validate input file
    input_file = Path('/active_players.jsonl')
    if not input_file.is_file():
        logging.error(f"❌ Input file not found: /active_players.jsonl")
        return

    # 3. Connect to Meilisearch
    try:
        logging.info(f"Connecting to Meilisearch at {MEILI_URL}...")
        client = meilisearch.Client(MEILI_URL, MEILI_MASTER_KEY)
        index = client.index(INDEX_NAME)
        logging.info(f"✅ Connection successful. Using index '{INDEX_NAME}'.")
        
        # Clear any pending tasks
        logging.info("Clearing any pending tasks...")
        try:
            response = requests.delete(
                f"{MEILI_URL}/tasks?statuses=enqueued,processing", 
                headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"}
            )
            if response.status_code == 200:
                logging.info("✅ Cleared pending tasks.")
            else:
                logging.warning(f"⚠️ Could not clear tasks: {response.status_code}")
        except Exception as e:
            logging.warning(f"⚠️ Could not clear tasks: {e}")
            
    except Exception as e:
        logging.error(f"❌ Could not connect to Meilisearch: {e}")
        return
        
    # 4. Read file and process documents
    documents = []
    total_processed = 0
    
    logging.info(f"Reading and processing data from {input_file}...")
    with open(input_file, 'r') as f:
        for i, line in enumerate(f):
            try:
                player_data = json.loads(line)
                total_processed += 1
                
                processed_doc = process_player_data(player_data)
                if processed_doc:
                    documents.append(processed_doc)
                        
            except json.JSONDecodeError:
                logging.warning(f"Skipping malformed JSON on line {i+1}")
                continue
    
    logging.info(f"✅ Processing complete:")
    logging.info(f"   Total processed: {total_processed:,}")
    logging.info(f"   To be indexed: {len(documents):,}")

    # 5. Upload to Meilisearch in batches
    if not documents:
        logging.info("No documents to upload.")
        return
        
    logging.info(f"Uploading {len(documents)} documents in batches of {BATCH_SIZE}...")
    successful_batches = 0
    failed_batches = 0
    
    for i in range(0, len(documents), BATCH_SIZE):
        batch = documents[i:i + BATCH_SIZE]
        batch_num = i//BATCH_SIZE + 1
        total_batches = (len(documents) + BATCH_SIZE - 1)//BATCH_SIZE
        
        for attempt in range(3):  # Retry up to 3 times
            try:
                task = index.add_documents(batch, primary_key='profile_id')
                client.wait_for_task(task.task_uid, timeout_in_ms=30000)  # 30 second timeout
                logging.info(f"  - Uploaded batch {batch_num}/{total_batches}")
                successful_batches += 1
                break
            except Exception as e:
                if attempt < 2:  # Not the last attempt
                    logging.warning(f"  - Retry {attempt + 1}/3 for batch {batch_num}: {e}")
                    time.sleep(2)  # Wait 2 seconds before retry
                else:
                    logging.error(f"❌ Failed to upload batch {batch_num} after 3 attempts: {e}")
                    failed_batches += 1
                    # Continue with next batch instead of stopping
                    
    logging.info(f"🎉 Indexing complete! Successful: {successful_batches}, Failed: {failed_batches}")
    
    # 6. Create snapshot
    if successful_batches > 0:
        if create_snapshot():
            logging.info("✅ Snapshot created successfully - ready for hot-swap!")
            if upload_snapshot_to_gcs():
                logging.info("✅ Job completed successfully!")
                sys.exit(0)
            else:
                logging.error("❌ Failed to upload snapshot to GCS")
                sys.exit(1)
        else:
            logging.error("❌ Failed to create snapshot")
            sys.exit(1)  # Exit with error code if snapshot fails
    else:
        logging.warning("⚠️ No successful batches - skipping snapshot creation")
        sys.exit(0)

if __name__ == "__main__":
    main() 