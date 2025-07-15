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
from google.cloud import storage

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

def wait_for_tasks_completion():
    """Wait for all pending tasks to complete before creating snapshot."""
    try:
        logging.info("Waiting for all indexing tasks to complete...")
        max_wait_time = 300  # 5 minutes max wait
        wait_interval = 5    # Check every 5 seconds
        
        for _ in range(max_wait_time // wait_interval):
            response = requests.get(
                f"{MEILI_URL}/tasks?statuses=enqueued,processing",
                headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"},
                timeout=10
            )
            
            if response.status_code == 200:
                tasks = response.json().get('results', [])
                if not tasks:
                    logging.info("✅ All tasks completed!")
                    return True
                else:
                    pending_count = len(tasks)
                    logging.info(f"⏳ Waiting for {pending_count} tasks to complete...")
            else:
                logging.warning(f"⚠️ Could not check task status: {response.status_code}")
            
            time.sleep(wait_interval)
        
        logging.error("❌ Timeout waiting for tasks to complete")
        return False
        
    except Exception as e:
        logging.error(f"❌ Error waiting for tasks completion: {e}")
        return False

def check_meilisearch_running():
    """Check if Meilisearch is still running and accessible."""
    try:
        response = requests.get(f"{MEILI_URL}/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            return health_data.get('status') == 'available'
    except Exception as e:
        logging.error(f"❌ Meilisearch health check failed: {e}")
        return False
    return False

def create_snapshot():
    """Create a snapshot and return the snapshot file path."""
    try:
        logging.info("Creating snapshot...")
        response = requests.post(
            f"{MEILI_URL}/snapshots",
            headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"},
            timeout=30
        )
        
        if response.status_code in (200, 202):
            snapshot_data = response.json()
            task_uid = snapshot_data.get('taskUid')
            
            # Wait for snapshot to complete
            logging.info(f"Waiting for snapshot task {task_uid} to complete...")
            for _ in range(60):  # Wait up to 2 minutes
                task_response = requests.get(
                    f"{MEILI_URL}/tasks/{task_uid}",
                    headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"},
                    timeout=10
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

def generate_index_fingerprint():
    """Generate a fingerprint hash of the current index for comparison."""
    try:
        import requests
        
        # Get document count and update time
        stats_response = requests.get(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/stats",
            headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"},
            timeout=10
        )
        
        if stats_response.status_code != 200:
            logging.error(f"❌ Failed to get index stats: {stats_response.status_code}")
            return None
            
        try:
            stats = stats_response.json()
            if not isinstance(stats, dict):
                logging.error(f"❌ Stats response is not a dict: {type(stats)}")
                logging.error(f"❌ Stats response content: {stats}")
                return None
            doc_count = stats.get('numberOfDocuments', 0)
            updated_at = stats.get('updatedAt', '')
            logging.info(f"📊 Index stats: {doc_count} documents, updated: {updated_at}")
        except Exception as e:
            logging.error(f"❌ Failed to parse stats JSON: {e}")
            logging.error(f"❌ Stats response text: {stats_response.text}")
            return None
        
        # Check if index exists first
        index_info_response = requests.get(
            f"{MEILI_URL}/indexes/{INDEX_NAME}",
            headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"},
            timeout=10
        )
        logging.info(f"Index info response status: {index_info_response.status_code}")
        if index_info_response.status_code != 200:
            logging.error(f"❌ Index {INDEX_NAME} does not exist or is not accessible")
            logging.error(f"❌ Response: {index_info_response.text}")
            return None
            
        # Sample aliases from throughout the index for better coverage
        sample_aliases = []
        sample_size = 50  # Number of samples to take (increased for robustness)
        sample_interval = max(1, doc_count // sample_size)  # Space between samples
        
        logging.info(f"📊 Sampling {sample_size} aliases from {doc_count} total (interval: {sample_interval})")
        
        for i in range(sample_size):
            offset = i * sample_interval
            if offset >= doc_count:
                break
                
            sample_response = requests.get(
                f"{MEILI_URL}/indexes/{INDEX_NAME}/documents?limit=1&offset={offset}&fields=alias",
                headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"},
                timeout=10
            )
            
            if sample_response.status_code != 200:
                logging.error(f"❌ Failed to get sample at offset {offset}: {sample_response.status_code}")
                continue
                
            try:
                sample_json = sample_response.json()
                sample_docs = sample_json.get('results', sample_json) if isinstance(sample_json, dict) else sample_json
                if isinstance(sample_docs, list) and len(sample_docs) > 0:
                    alias = sample_docs[0].get('alias')
                    if alias:
                        sample_aliases.append(alias)
            except Exception as e:
                logging.error(f"❌ Failed to parse sample at offset {offset}: {e}")
                continue
        
        if not sample_aliases:
            logging.error("❌ No valid aliases collected")
            return None
            
        # Sort the aliases for consistency
        sample_aliases = sorted(sample_aliases)
        
        # Create fingerprint
        fingerprint_data = f"{doc_count}_{'_'.join(sample_aliases)}_{updated_at}"
        
        # Generate hash
        import hashlib
        fingerprint_hash = hashlib.sha256(fingerprint_data.encode()).hexdigest()
        
        logging.info(f"Generated index fingerprint: {fingerprint_hash}")
        logging.info(f"Fingerprint data: {doc_count} docs, aliases: {sample_aliases[:5]}...")
        
        return fingerprint_hash
        
    except Exception as e:
        logging.error(f"❌ Error generating index fingerprint: {e}")
        return None

def upload_snapshot_to_gcs():
    """Upload the created snapshot to Google Cloud Storage."""
    try:
        import subprocess
        import glob
        import os
        import json
        logging.info("Listing files in /meili_data/snapshots before upload:")
        try:
            files = os.listdir("/meili_data/snapshots")
            logging.info(files)
        except Exception as e:
            logging.error(f"Could not list /meili_data/snapshots: {e}")
        # Find the snapshot file
        snapshot_files = glob.glob("/meili_data/snapshots/*.snapshot")
        if not snapshot_files:
            logging.error("❌ No snapshot files found in /meili_data/snapshots. If running in Docker, ensure --snapshot-dir is set to /meili_data/snapshots and the volume is mounted.")
            return False
        snapshot_file = snapshot_files[0]
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        
        # Generate index fingerprint first (wait a bit for indexing to settle)
        logging.info("Waiting 5 seconds for indexing to fully complete before generating fingerprint...")
        time.sleep(5)
        fingerprint_hash = generate_index_fingerprint()
        if not fingerprint_hash:
            logging.error("❌ Could not generate index fingerprint - aborting upload")
            return False
        
        # Create directory structure: snapshots/{timestamp}/
        snapshot_dir = f"snapshots/{timestamp}"
        gcs_snapshot_path = f"gs://aoe2-site-data/{snapshot_dir}/data.snapshot"
        gcs_fingerprint_path = f"gs://aoe2-site-data/{snapshot_dir}/fingerprint.txt"
        gcs_metadata_path = f"gs://aoe2-site-data/{snapshot_dir}/metadata.json"
        
        logging.info(f"Uploading snapshot to {gcs_snapshot_path}...")
        process = subprocess.Popen(
            ["gsutil", "cp", snapshot_file, gcs_snapshot_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        for line in process.stdout:
            logging.info(f"gsutil: {line.strip()}")
        process.wait()
        if process.returncode == 0:
            logging.info("✅ Snapshot uploaded to GCS successfully!")
            
            # Create fingerprint marker file
            fingerprint_file = f"/tmp/fingerprint-{timestamp}.txt"
            with open(fingerprint_file, 'w') as f:
                f.write(fingerprint_hash)
            
            # Upload fingerprint marker
            fingerprint_process = subprocess.run([
                "gsutil", "cp", fingerprint_file, gcs_fingerprint_path
            ], capture_output=True, text=True, timeout=60)
            
            if fingerprint_process.returncode == 0:
                logging.info(f"✅ Fingerprint marker uploaded: {fingerprint_hash}")
            else:
                logging.warning(f"⚠️ Failed to upload fingerprint marker: {fingerprint_process.stderr}")
            
            os.remove(fingerprint_file)
            
            # Create metadata file
            metadata = {
                "fingerprint_hash": fingerprint_hash,
                "timestamp": timestamp,
                "snapshot_path": gcs_snapshot_path,
                "index_name": INDEX_NAME,
                "created_at": datetime.now().isoformat(),
                "document_count": None  # Will be filled from stats
            }
            
            # Get document count for metadata
            try:
                import requests
                stats_response = requests.get(
                    f"{MEILI_URL}/indexes/{INDEX_NAME}/stats",
                    headers={"Authorization": f"Bearer {MEILI_MASTER_KEY}"},
                    timeout=10
                )
                if stats_response.status_code == 200:
                    stats = stats_response.json()
                    metadata["document_count"] = stats.get('numberOfDocuments', 0)
            except Exception as e:
                logging.warning(f"Could not get document count: {e}")
            
            metadata_file = f"/tmp/snapshot-metadata-{timestamp}.json"
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Upload metadata
            metadata_process = subprocess.run([
                "gsutil", "cp", metadata_file, gcs_metadata_path
            ], capture_output=True, text=True, timeout=60)
            
            if metadata_process.returncode == 0:
                logging.info(f"✅ Metadata uploaded successfully")
                logging.info(f"📁 Snapshot stored in: {snapshot_dir}/")
                os.remove(metadata_file)
            else:
                logging.warning(f"⚠️ Failed to upload metadata: {metadata_process.stderr}")
                os.remove(metadata_file)
            
            return True
        else:
            logging.error(f"❌ Failed to upload snapshot, exit code: {process.returncode}")
            return False
    except Exception as e:
        logging.error(f"❌ Error uploading snapshot to GCS: {e}")
        return False

def download_active_players_file():
    """Download active_players.jsonl from GCS using Python client."""
    try:
        logging.info("Downloading active_players.jsonl from GCS using Python client...")
        
        # Initialize the GCS client (uses default credentials in Cloud Run)
        client = storage.Client()
        bucket = client.bucket('aoe2-site-data')
        blob = bucket.blob('active_players.jsonl')
        
        # Download the file
        blob.download_to_filename('/active_players.jsonl')
        logging.info("✅ Successfully downloaded active_players.jsonl")
        return True
        
    except Exception as e:
        logging.error(f"❌ Failed to download active_players.jsonl: {e}")
        return False

def main():
    """Main function to read, process, and upload data."""
    
    logging.info("Starting Meilisearch indexing job...")
    
    # 1. Wait for Meilisearch to be ready
    if not wait_for_meilisearch():
        logging.error("❌ Meilisearch not ready - exiting")
        sys.exit(1)
    
    # 2. Download the input file from GCS (skip if file already exists locally)
    input_file = Path('/active_players.jsonl')
    if input_file.exists():
        logging.info("📁 Using existing local file: /active_players.jsonl")
    else:
        logging.info("📥 Downloading file from GCS...")
        if not download_active_players_file():
            logging.error("❌ Failed to download input file - exiting")
            sys.exit(1)
    
    # 3. Validate input file
    input_file = Path('/active_players.jsonl')
    if not input_file.is_file():
        logging.error(f"❌ Input file not found: /active_players.jsonl")
        sys.exit(1)

    # 4. Connect to Meilisearch
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
        sys.exit(1)
        
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
        sys.exit(0)
        
    logging.info(f"Uploading {len(documents)} documents in batches of {BATCH_SIZE}...")
    successful_batches = 0
    
    for i in range(0, len(documents), BATCH_SIZE):
        batch = documents[i:i + BATCH_SIZE]
        batch_num = i//BATCH_SIZE + 1
        total_batches = (len(documents) + BATCH_SIZE - 1)//BATCH_SIZE
        
        try:
            task = index.add_documents(batch, primary_key='profile_id')
            client.wait_for_task(task.task_uid, timeout_in_ms=30000)  # 30 second timeout
            logging.info(f"  - Uploaded batch {batch_num}/{total_batches}")
            successful_batches += 1
        except Exception as e:
            logging.error(f"❌ Failed to upload batch {batch_num}: {e}")
            sys.exit(1)
                    
    logging.info(f"🎉 Indexing complete! Successful batches: {successful_batches}")
    
    # 6. Wait for all tasks to complete and create snapshot
    if successful_batches > 0:
        # Check if Meilisearch is still running before attempting snapshot
        if not check_meilisearch_running():
            logging.error("❌ Meilisearch is not running - cannot create snapshot")
            sys.exit(1)
        
        # Wait for all indexing tasks to complete
        if not wait_for_tasks_completion():
            logging.error("❌ Failed to wait for tasks completion")
            sys.exit(1)
        
        # Sleep to allow memory to stabilize
        logging.info("Sleeping for 10 seconds to allow memory to stabilize...")
        time.sleep(10)
        
        # Check Meilisearch health again after waiting
        if not check_meilisearch_running():
            logging.error("❌ Meilisearch is not running after waiting - cannot create snapshot")
            sys.exit(1)
            
        if create_snapshot():
            logging.info("✅ Snapshot created successfully!")
            
            # Check if we're running locally (skip GCS upload for local testing)
            if os.getenv('SKIP_GCS_UPLOAD') == 'true':
                logging.info("🏠 Running locally - skipping GCS upload")
                logging.info("✅ Job completed successfully!")
                sys.exit(0)
            else:
                if upload_snapshot_to_gcs():
                    logging.info("✅ Snapshot uploaded to GCS successfully!")
                    logging.info("✅ Job completed successfully! VM will handle hot-swap automatically.")
                    sys.exit(0)
                else:
                    logging.error("❌ Failed to upload snapshot to GCS")
                    sys.exit(1)
        else:
            logging.error("❌ Failed to create snapshot")
            sys.exit(1)
    else:
        logging.error("❌ No successful batches - exiting")
        sys.exit(1)

if __name__ == "__main__":
    main() 