#!/usr/bin/env python3
"""
Upload Player Data to Firestore (Async Version)

Reads the collected player data and uploads it to Firestore
with processed names for efficient search.
Enhanced to include match count and last match date from leaderboardStats.
Optimized for concurrent processing and uploads.
"""

import json
import re
import logging
import asyncio
import argparse
from pathlib import Path
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
import wordninja

# Configuration
INPUT_FILE = "data/collected_players.jsonl"
COLLECTION_NAME = "players"
BATCH_SIZE = 500  # Firestore batch limit (max 500 operations)
CONCURRENT_UPLOADS = 8  # Increase workers for better distribution
CHUNK_SIZE = 10000  # Lines to process per chunk

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

def clean_for_search(text):
    """
    Clean text for search by removing all spaces and special characters
    - Convert to lowercase
    - Remove all non-alphanumeric characters (spaces, punctuation, etc.)
    
    Args:
        text (str): Input text to clean
        
    Returns:
        str: Cleaned text for search indexing
    """
    if not text:
        return ""
    # Remove all non-word characters (keeps only alphanumeric), convert to lowercase
    return re.sub(r'[^\w]', '', str(text).lower())

def tokenize_for_search(text):
    """
    Tokenize player name for improved search matching
    - Splits on common separators (dots, underscores, brackets, etc.)
    - Uses intelligent word segmentation for concatenated words
    - Handles clan tags like <NT>, [CLAN], etc.
    - Includes both full name and individual tokens
    
    Args:
        text (str): Player name to tokenize
        
    Returns:
        list: List of search tokens (cleaned and lowercased)
    """
    if not text:
        return []
    
    text = str(text).lower()
    tokens = []
    
    # Add the full cleaned name (existing behavior)
    full_clean = clean_for_search(text)
    if full_clean:
        tokens.append(full_clean)
    
    # Split on common separators: dots, brackets, underscores, spaces, hyphens
    # This regex captures: <>, [], (), {}, dots, underscores, hyphens, spaces
    import re
    parts = re.split(r'[<>\[\](){}._ -]+', text)
    
    # Process each part with word segmentation
    for part in parts:
        clean_part = clean_for_search(part)
        if clean_part and len(clean_part) >= 3:  # Min 3 chars to avoid noise
            tokens.append(clean_part)
            
            # Intelligent word segmentation for longer parts
            if len(clean_part) >= 6:  # Only segment longer strings
                word_segments = wordninja.split(clean_part)
                for segment in word_segments:
                    segment_clean = clean_for_search(segment)
                    if segment_clean and len(segment_clean) >= 3:
                        tokens.append(segment_clean)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_tokens = []
    for token in tokens:
        if token not in seen:
            seen.add(token)
            unique_tokens.append(token)
    
    return unique_tokens

def display_tokenization_samples(all_players, limit=20):
    """
    Display tokenization results for sample players
    
    Args:
        all_players (list): List of all processed players
        limit (int): Number of samples to show
    """
    print("\n" + "="*80)
    print("TOKENIZATION SAMPLES")
    print("="*80)
    
    # Show a diverse sample
    sample_players = all_players[:limit] if len(all_players) <= limit else all_players[::len(all_players)//limit][:limit]
    
    for i, player in enumerate(sample_players, 1):
        name = player.get('name', 'Unknown')
        name_no_special = player.get('name_no_special', '')
        name_tokens = player.get('name_tokens', [])
        
        print(f"\n{i:2d}. Player: '{name}'")
        print(f"    Full cleaned: '{name_no_special}'")
        print(f"    Tokens: {name_tokens}")
        print(f"    Token count: {len(name_tokens)}")
        
        # Show which tokens are from word segmentation
        if len(name_tokens) > 2:  # More than just full + split tokens
            print(f"    📝 Includes word segmentation")
    
    print(f"\n📊 Total players processed: {len(all_players)}")
    print(f"📊 Average tokens per player: {sum(len(p.get('name_tokens', [])) for p in all_players) / len(all_players):.1f}")
    print("="*80)

def process_leaderboard_stats(api_response):
    """
    Process leaderboardStats to extract match counts and last match date
    
    Args:
        api_response (dict): Full API response with statGroups and leaderboardStats
        
    Returns:
        dict: Processed leaderboard data
    """
    leaderboard_stats = api_response.get('leaderboardStats', [])
    
    if not leaderboard_stats:
        return {
            'total_matches': 0,
            'last_match_date': None,
            'ratings': {}
        }
    
    total_wins = 0
    total_losses = 0
    last_match_timestamp = 0
    ratings = {}
    
    for lb_stat in leaderboard_stats:
        # Sum wins and losses
        wins = lb_stat.get('wins', 0)
        losses = lb_stat.get('losses', 0)
        total_wins += wins
        total_losses += losses
        
        # Track most recent match date
        last_match = lb_stat.get('lastmatchdate', 0)
        if last_match > last_match_timestamp:
            last_match_timestamp = last_match
        
        # Store rating info by leaderboard
        leaderboard_id = lb_stat.get('leaderboard_id')
        if leaderboard_id and lb_stat.get('rating'):
            ratings[str(leaderboard_id)] = {
                'rating': lb_stat.get('rating', 0),
                'rank': lb_stat.get('rank', 0),
                'wins': wins,
                'losses': losses
            }
    
    return {
        'total_matches': total_wins + total_losses,
        'last_match_date': last_match_timestamp if last_match_timestamp > 0 else None,
        'ratings': ratings
    }

def process_player_data(api_response):
    """
    Process a complete API response for Firestore storage
    
    Args:
        api_response (dict): Full API response from GetPersonalStat
        
    Returns:
        list: List of processed player documents ready for Firestore (filtered for active players only)
    """
    stat_groups = api_response.get('statGroups', [])
    leaderboard_data = process_leaderboard_stats(api_response)
    
    players = []
    total_processed = 0
    filtered_out = 0
    
    for stat_group in stat_groups:
        members = stat_group.get('members', [])
        for member in members:
            total_processed += 1
            
            # Extract basic info
            profile_id = member.get('profile_id')
            name = member.get('name', '')
            alias = member.get('alias', '')
            
            # Use alias if available, fallback to name
            display_name = alias or name
            
            if not profile_id or not display_name:
                logging.warning(f"Skipping player with missing data: {member}")
                filtered_out += 1
                continue
            
            # Skip players with no matches - they're not searchable/interesting
            if leaderboard_data['total_matches'] == 0:
                logging.debug(f"Skipping player {profile_id} ({display_name}) - no matches played")
                filtered_out += 1
                continue
            
            # Process name for search (enhanced with tokenization)
            name_no_special = clean_for_search(display_name)
            name_tokens = tokenize_for_search(display_name)
            
            # Build document with enhanced search structure
            doc = {
                'profile_id': int(profile_id),
                'name': str(display_name),                # Use alias for display
                'name_no_special': name_no_special,       # Single search index (backward compatible)
                'name_tokens': name_tokens,               # Array of searchable tokens
                'total_matches': leaderboard_data['total_matches'],
                'country': member.get('country', ''),
                'last_match_date': leaderboard_data['last_match_date'],  # Can be null
                'collected_at': api_response.get('collected_at', ''),
                'source_api': api_response.get('source_api', 'GetPersonalStat')
            }
            
            # Add clan info if available (for future use)
            clan = member.get('clanlist_name')
            if clan and clan.strip():
                doc['clan'] = str(clan).strip()
            
            players.append(doc)
    
    if total_processed > 0:
        included_count = len(players)
        logging.info(f"Processed {total_processed} players: {included_count} included, {filtered_out} filtered out (active players only)")
    
    return players

async def upload_worker(db, upload_queue, worker_id, shutdown_event):
    """
    Worker that uploads batches to Firestore
    
    Args:
        db: Firestore client
        upload_queue: Queue containing batches to upload
        worker_id (int): Worker identifier for logging
        shutdown_event: Event to signal workers to shutdown
    """
    uploaded_count = 0
    logging.info(f"Worker {worker_id}: Started and waiting for batches")
    
    # Yield control immediately to ensure fair worker startup
    await asyncio.sleep(0.001)
    
    while not shutdown_event.is_set():
        try:
            # Get batch from queue - use a reasonable timeout to check shutdown event periodically
            try:
                batch_docs = await asyncio.wait_for(upload_queue.get(), timeout=30.0)
            except asyncio.TimeoutError:
                # Check if we should shutdown, otherwise continue waiting
                continue
            
            if batch_docs is None:  # Sentinel value to stop worker
                logging.info(f"Worker {worker_id}: Received stop signal")
                upload_queue.task_done()
                break
            
            logging.debug(f"Worker {worker_id}: Got batch of {len(batch_docs)} players")
            
            # Log when worker gets work (not just completion)
            if uploaded_count == 0:
                logging.info(f"Worker {worker_id}: Processing first batch")
            elif uploaded_count % 1000 == 0:  # More frequent logging to track all workers
                logging.info(f"Worker {worker_id}: Processing batch (total: {uploaded_count + len(batch_docs)})")
            
            # Upload batch
            batch = db.batch()
            for doc in batch_docs:
                doc_ref = db.collection(COLLECTION_NAME).document(str(doc['profile_id']))
                batch.set(doc_ref, doc)
            
            # Commit the batch
            batch.commit()
            uploaded_count += len(batch_docs)
            
            # Mark task as done
            upload_queue.task_done()
            
            # Yield control to other workers to ensure fair scheduling
            await asyncio.sleep(0.001)
            
            # Less frequent logging to reduce noise
            if uploaded_count % 2500 == 0 or uploaded_count <= 500:
                logging.info(f"Worker {worker_id}: Uploaded batch of {len(batch_docs)} players (total: {uploaded_count})")
            
        except Exception as e:
            logging.error(f"Worker {worker_id} upload error: {e}")
            # Only call task_done if we actually got a task
            try:
                upload_queue.task_done()
            except ValueError:
                pass  # task_done called too many times
            continue
    
    logging.info(f"Worker {worker_id} finished: {uploaded_count} total uploads")
    return uploaded_count

async def load_existing_profile_ids_async(db):
    """
    Async version of loading existing profile IDs
    """
    existing_ids = set()
    
    try:
        # Get all documents in collection 
        docs = db.collection(COLLECTION_NAME).select(['profile_id']).stream()
        
        for doc in docs:
            data = doc.to_dict()
            if data and 'profile_id' in data:
                existing_ids.add(data['profile_id'])
        
        logging.info(f"Found {len(existing_ids)} existing players in Firestore")
    except Exception as e:
        logging.warning(f"Could not load existing data: {e}")
    
    return existing_ids

async def process_file_chunk(lines, start_line):
    """
    Process a chunk of lines from the file
    
    Args:
        lines (list): List of lines to process
        start_line (int): Starting line number for logging
        existing_firestore_ids (set): Set of profile IDs already in Firestore
        
    Returns:
        list: List of player documents ready for upload
    """
    enhanced_players = []
    processed_count = 0
    # Detailed counters
    skip_reasons = {
        'no_matches': 0,
        'missing_data': 0,
        'json_error': 0,
        'other_error': 0
    }

    
    for line_num, line in enumerate(lines, start_line):
        if not line.strip():
            continue
        
        processed_count += 1
        
        try:
            data = json.loads(line.strip())
            
            # Check if this is a raw API response or processed player data
            if 'statGroups' in data:
                # This is a full API response - process it
                processed_players = process_player_data(data)
                for player in processed_players:
                    enhanced_players.append(player)
            else:
                # This is already processed player data
                profile_id = data.get('profile_id')
                
                # Check skip reasons in order
                if not profile_id:
                    skip_reasons['missing_data'] += 1
                elif data.get('total_matches', 0) == 0:
                    skip_reasons['no_matches'] += 1
                else:
                    # Use alias if available, fallback to name
                    display_name = data.get('alias') or data.get('name', '')
                    
                    if not display_name:
                        skip_reasons['missing_data'] += 1
                        continue
                    
                    # Add search fields if missing (needed for Firestore search)
                    if 'name_no_special' not in data:
                        data['name_no_special'] = clean_for_search(display_name)
                    if 'name_tokens' not in data:
                        data['name_tokens'] = tokenize_for_search(display_name)
                    
                    # Build optimized document for Firestore
                    firestore_doc = {
                        'profile_id': int(profile_id),
                        'name': str(display_name),  # Use alias for display
                        'name_no_special': data['name_no_special'],
                        'name_tokens': data['name_tokens'],
                        'total_matches': data.get('total_matches', 0),
                        'country': data.get('country', ''),
                        'last_match_date': data.get('last_match_date')
                    }
                    
                    # Add clan if available
                    clan = data.get('clanlist_name')
                    if clan and clan.strip():
                        firestore_doc['clan'] = str(clan).strip()
                    
                    enhanced_players.append(firestore_doc)
                    
        except json.JSONDecodeError as e:
            logging.warning(f"Invalid JSON on line {line_num}: {e}")
            skip_reasons['json_error'] += 1
            continue
        except Exception as e:
            logging.error(f"Error processing line {line_num}: {e}")
            skip_reasons['other_error'] += 1
            continue
    
    if processed_count > 0:
        total_skipped = sum(skip_reasons.values())
        if total_skipped > 0:
            skip_breakdown = ", ".join([f"{count} {reason}" for reason, count in skip_reasons.items() if count > 0])
            logging.info(f"Chunk {start_line}-{start_line + len(lines)}: {len(enhanced_players)} ready, {total_skipped} skipped ({skip_breakdown})")
        else:
            logging.info(f"Chunk {start_line}-{start_line + len(lines)}: {len(enhanced_players)} ready, 0 skipped")
    
    return enhanced_players

async def main():
    """Main async upload process"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Upload players to Firestore with enhanced tokenization')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Show tokenization results without uploading to Firestore')
    parser.add_argument('--samples', type=int, default=50,
                        help='Number of tokenization samples to show in dry-run mode (default: 50)')
    args = parser.parse_args()
    
    setup_logging()
    
    if args.dry_run:
        logging.info("🔍 DRY RUN MODE: Testing tokenization without uploading")
        logging.info(f"Will show {args.samples} tokenization samples")
    else:
        logging.info("Starting async Firestore upload with leaderboard data")
        logging.info(f"Batch size: {BATCH_SIZE}")
        logging.info(f"Concurrent uploads: {CONCURRENT_UPLOADS}")
        logging.info(f"Chunk size: {CHUNK_SIZE}")
    
    logging.info(f"Input file: {INPUT_FILE}")
    logging.info(f"Collection: {COLLECTION_NAME}")
    
    # Initialize Firestore client (only if not dry run)
    db = None
    existing_firestore_ids = set()
    
    if not args.dry_run:
        try:
            db = firestore.Client()
            logging.info("Connected to Firestore")
            # Load existing profile IDs from Firestore
            existing_firestore_ids = await load_existing_profile_ids_async(db)
        except Exception as e:
            logging.error(f"Failed to connect to Firestore: {e}")
            return
    
    # Create upload queue with balanced size for better distribution (only if not dry-run)
    upload_queue = None
    shutdown_event = None
    
    if not args.dry_run:
        upload_queue = asyncio.Queue(maxsize=50)  # Balanced queue size to encourage competition
        shutdown_event = asyncio.Event()
    
    # Process file in chunks and collect all players first
    if not Path(INPUT_FILE).exists():
        logging.error(f"Input file not found: {INPUT_FILE}")
        return
    
    all_players = []
    total_processed = 0
    
    logging.info("Phase 1: Processing file and collecting all players...")
    
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            chunk_lines = []
            line_count = 0
            
            for line in f:
                chunk_lines.append(line)
                line_count += 1
                
                # Process chunk when it reaches CHUNK_SIZE
                if len(chunk_lines) >= CHUNK_SIZE:
                    # Process chunk asynchronously
                    start_line = line_count - len(chunk_lines) + 1
                    players = await process_file_chunk(chunk_lines, start_line)
                    
                    total_processed += len(chunk_lines)
                    all_players.extend(players)
                    
                    # Progress update
                    if total_processed % 50000 == 0:
                        logging.info(f"Processed {total_processed} lines, collected {len(all_players)} valid players")
                    
                    chunk_lines = []
            
            # Process final chunk
            if chunk_lines:
                start_line = line_count - len(chunk_lines) + 1
                players = await process_file_chunk(chunk_lines, start_line)
                total_processed += len(chunk_lines)
                all_players.extend(players)
        
        logging.info(f"Phase 1 completed: {total_processed} lines processed, {len(all_players)} players ready")
        
        # Handle dry-run mode
        if args.dry_run:
            display_tokenization_samples(all_players, args.samples)
            logging.info("🔍 DRY RUN completed - no data uploaded")
            return
        
        # Phase 2: Create batches and preload queue
        logging.info("Phase 2: Creating batches and preloading queue...")
        
        batches = []
        current_batch = []
        
        for player in all_players:
            current_batch.append(player)
            if len(current_batch) >= BATCH_SIZE:
                batches.append(current_batch.copy())
                current_batch = []
        
        # Add final partial batch if exists
        if current_batch:
            batches.append(current_batch.copy())
        
        logging.info(f"Created {len(batches)} batches for upload")
        
        # Phase 3: Start workers and preload queue with initial batches
        logging.info("Phase 3: Starting workers and distributing work...")
        
        # Preload queue with initial batches (up to queue size)
        initial_batches = min(len(batches), upload_queue.maxsize)
        for i in range(initial_batches):
            await upload_queue.put(batches[i])
        
        remaining_batches = batches[initial_batches:]
        logging.info(f"Preloaded {initial_batches} batches, {len(remaining_batches)} remaining")
        
        # Start upload workers with explicit scheduling
        workers = []
        for i in range(CONCURRENT_UPLOADS):
            worker = asyncio.create_task(upload_worker(db, upload_queue, i + 1, shutdown_event))
            workers.append(worker)
            # Small delay to ensure proper task scheduling
            await asyncio.sleep(0.001)
        
        logging.info(f"Started {CONCURRENT_UPLOADS} upload workers")
        
        # Give all workers a moment to initialize and start their first batch
        await asyncio.sleep(0.1)
        
        # Start the batch feeder task after workers are running
        batch_feeder_task = asyncio.create_task(
            feed_batches_to_queue(upload_queue, remaining_batches)
        )
        
        logging.info("Batch feeder started, workers should now be processing batches concurrently")
        
        # Wait for all batches to be processed
        await batch_feeder_task
        
        # Signal workers to stop by sending None values
        for _ in range(CONCURRENT_UPLOADS):
            await upload_queue.put(None)
        
        # Set shutdown event
        shutdown_event.set()
        
        # Wait for all workers to complete
        worker_results = await asyncio.gather(*workers, return_exceptions=True)
        
        # Calculate total uploaded
        total_actually_uploaded = sum(result for result in worker_results if isinstance(result, int))
        
        logging.info("Upload completed!")
        logging.info(f"Total lines processed: {total_processed}")
        logging.info(f"Total players uploaded: {total_actually_uploaded}")
        logging.info(f"Collection: {COLLECTION_NAME}")
        
    except Exception as e:
        logging.error(f"Error during processing: {e}")
        # Signal workers to stop
        shutdown_event.set()
        for _ in range(CONCURRENT_UPLOADS):
            try:
                upload_queue.put_nowait(None)
            except:
                pass

async def feed_batches_to_queue(upload_queue, batches):
    """
    Feed batches to the upload queue as workers consume them
    """
    for i, batch in enumerate(batches):
        await upload_queue.put(batch)
        
        # Log progress every 100 batches
        if (i + 1) % 100 == 0:
            logging.info(f"Fed {i + 1}/{len(batches)} additional batches to queue")
    
    logging.info(f"Finished feeding all {len(batches)} batches to queue")

if __name__ == "__main__":
    asyncio.run(main()) 