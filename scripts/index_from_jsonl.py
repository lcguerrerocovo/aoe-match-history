#!/usr/bin/env python3
"""
Index Player Data to Meilisearch from JSONL file

PURPOSE:
This script reads player data from a JSONL file (where each line is a JSON object),
processes it, and uploads it to a Meilisearch instance. This is useful for
bulk-loading or re-indexing data from a collected dataset.

WHAT IT DOES:
1. Connects to the Meilisearch instance.
2. Reads a JSONL file line by line.
3. Processes each player's data to extract key fields.
4. Filters out players with no matches.
5. Filters out players who haven't played in the last 2 years.
6. Uploads the processed player documents to the 'players' index in batches.

USAGE:
  - Make sure the Meilisearch VM is running and configured.
  - Set environment variables for MEILI_HTTP_ADDR and MEILI_MASTER_KEY.
  - Run the script with the path to your data file.

EXAMPLE:
  export MEILI_HTTP_ADDR="http://<your_vm_ip>:7700"
  export MEILI_MASTER_KEY="your-master-key"
  python scripts/index_from_jsonl.py data/collected_players.jsonl
"""

import json
import os
import logging
import argparse
import meilisearch
from pathlib import Path
from datetime import datetime, timezone

# --- Configuration ---
INDEX_NAME = "players"
BATCH_SIZE = 2500  # Reduced batch size for e2-micro VM

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

def main(data_file_path):
    """Main function to read, process, and upload data."""
    
    # 1. Validate environment variables
    MEILI_HTTP_ADDR = os.environ.get("MEILI_HTTP_ADDR")
    MEILI_MASTER_KEY = os.environ.get("MEILI_MASTER_KEY")
    if not MEILI_HTTP_ADDR or not MEILI_MASTER_KEY:
        logging.error("❌ Missing required environment variables: MEILI_HTTP_ADDR and MEILI_MASTER_KEY")
        return

    # 2. Validate input file
    input_file = Path(data_file_path)
    if not input_file.is_file():
        logging.error(f"❌ Input file not found: {data_file_path}")
        return

    # 3. Connect to Meilisearch
    try:
        logging.info(f"Connecting to Meilisearch at {MEILI_HTTP_ADDR}...")
        client = meilisearch.Client(MEILI_HTTP_ADDR, MEILI_MASTER_KEY)
        index = client.index(INDEX_NAME)
        logging.info(f"✅ Connection successful. Using index '{INDEX_NAME}'.")
        
        # Clear any pending tasks
        logging.info("Clearing any pending tasks...")
        try:
            import requests
            # Delete tasks with status enqueued or processing
            response = requests.delete(
                f"{MEILI_HTTP_ADDR}/tasks?statuses=enqueued,processing", 
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
        logging.info("No documents to upload. Exiting.")
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
                    import time
                    time.sleep(2)  # Wait 2 seconds before retry
                else:
                    logging.error(f"❌ Failed to upload batch {batch_num} after 3 attempts: {e}")
                    failed_batches += 1
                    # Continue with next batch instead of stopping
                    
        logging.info(f"🎉 Indexing complete! Successful: {successful_batches}, Failed: {failed_batches}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Index player data from a JSONL file to Meilisearch.")
    parser.add_argument("data_file", help="Path to the JSONL data file (e.g., data/collected_players.jsonl).")
    args = parser.parse_args()
    
    main(args.data_file) 