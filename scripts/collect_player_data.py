#!/usr/bin/env python3
"""
Player Data Collection Script

Collects player data from the AoE2 API using GetPersonalStat endpoint.
Rate limited to stay under 50 RPS, saves data after each call.
Uses async requests for improved performance.
"""

import json
import time
import asyncio
import aiohttp
import shutil
from datetime import datetime
from pathlib import Path
import logging

# Configuration
API_BASE_URL = "https://aoe-api.worldsedgelink.com/community/leaderboard/GetPersonalStat"
OUTPUT_FILE = "data/collected_players.jsonl"  # JSONL format for appending
ENHANCED_OUTPUT_FILE = "data/collected_players_enhanced.jsonl"  # Enhanced version
LOG_FILE = "data/collection.log"
RATE_LIMIT_RPS = 50  # Requests per second limit
CONCURRENT_REQUESTS = 25  # Number of concurrent requests (should be < RPS for safety)

# Headers matching your existing requests
HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'aoe2-site'
}

# Sequential collection settings
START_PROFILE_ID = 1
BATCH_SIZE = 200  # Query 200 IDs at a time
MAX_CONSECUTIVE_EMPTY_BATCHES = 50  # Stop after 50 consecutive batches with no valid players

class RateLimiter:
    """Async rate limiter to control requests per second"""
    def __init__(self, max_rate: float):
        self.max_rate = max_rate
        self.min_interval = 1.0 / max_rate
        self.last_called = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.time()
            time_passed = now - self.last_called
            if time_passed < self.min_interval:
                sleep_time = self.min_interval - time_passed
                await asyncio.sleep(sleep_time)
            self.last_called = time.time()

def setup_logging():
    """Setup logging configuration"""
    Path("data").mkdir(exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILE),
            logging.StreamHandler()
        ]
    )

async def fetch_player_data(session: aiohttp.ClientSession, rate_limiter: RateLimiter, profile_ids):
    """
    Async fetch player data for one or more profile IDs from the API
    
    Args:
        session: aiohttp session
        rate_limiter: Rate limiter instance
        profile_ids (list): List of profile IDs to fetch
        
    Returns:
        list: List of player data dictionaries, or None if failed
    """
    # Try single quotes format like working example: ['1','2','3']
    if len(profile_ids) == 1:
        ids_param = f"['{profile_ids[0]}']"
    else:
        ids_str = "','".join(str(pid) for pid in profile_ids)
        ids_param = f"['{ids_str}']"
    
    url = f"{API_BASE_URL}?title=age2&profile_ids={ids_param}"
    id_range = f"{profile_ids[0]}-{profile_ids[-1]}"
    
    # Apply rate limiting
    await rate_limiter.acquire()
    
    try:
        logging.info(f"Fetching data for {len(profile_ids)} profile_ids: {id_range}")
        
        async with session.get(url, headers=HEADERS, timeout=10) as response:
            if response.status != 200:
                logging.error(f"HTTP {response.status} for profile_ids {id_range}")
                return None
                
            data = await response.json()
            
            # Check API result - only process if SUCCESS
            result = data.get('result', {})
            if result.get('message') != 'SUCCESS':
                logging.warning(f"API returned non-SUCCESS for profile_ids {id_range}: {result.get('message', 'Unknown')}")
                return None
                
            # Extract all players from all statGroups
            stat_groups = data.get('statGroups', [])
            if not stat_groups:
                logging.warning(f"No statGroups found for profile_ids {id_range}")
                return None
                
            # Process leaderboard stats to get match counts and last match dates
            leaderboard_stats = data.get('leaderboardStats', [])
            statgroup_data = {}  # statgroup_id -> {total_matches, last_match_date}
            
            for lb_stat in leaderboard_stats:
                statgroup_id = lb_stat.get('statgroup_id')
                if not statgroup_id:
                    continue
                    
                wins = lb_stat.get('wins', 0)
                losses = lb_stat.get('losses', 0)
                last_match = lb_stat.get('lastmatchdate', 0)
                
                if statgroup_id not in statgroup_data:
                    statgroup_data[statgroup_id] = {'total_matches': 0, 'last_match_date': 0}
                
                # Sum matches across leaderboards
                statgroup_data[statgroup_id]['total_matches'] += (wins + losses)
                
                # Keep most recent match date
                if last_match > statgroup_data[statgroup_id]['last_match_date']:
                    statgroup_data[statgroup_id]['last_match_date'] = last_match
            
            # Extract player data with enhanced info
            all_players = []
            for stat_group in stat_groups:
                members = stat_group.get('members', [])
                for member in members:
                    statgroup_id = member.get('personal_statgroup_id')
                    enhanced_data = statgroup_data.get(statgroup_id, {'total_matches': 0, 'last_match_date': 0})
                    
                    # Add collection metadata and enhanced stats to each player
                    member['collected_at'] = datetime.utcnow().isoformat()
                    member['source_api'] = 'GetPersonalStat'
                    member['total_matches'] = enhanced_data['total_matches']
                    member['last_match_date'] = enhanced_data['last_match_date'] if enhanced_data['last_match_date'] > 0 else None
                    
                    all_players.append(member)
            
            if not all_players:
                logging.warning(f"No players found in any statGroup for profile_ids {id_range}")
                return None
                
            logging.info(f"Successfully collected {len(all_players)} players from profile_ids {id_range}")
            return all_players
                
    except asyncio.TimeoutError:
        logging.error(f"Timeout for profile_ids {id_range}")
        return None
    except aiohttp.ClientError as e:
        logging.error(f"Request failed for profile_ids {id_range}: {e}")
        return None
    except json.JSONDecodeError as e:
        logging.error(f"JSON decode failed for profile_ids {id_range}: {e}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error for profile_ids {id_range}: {e}")
        return None

def save_players_batch(players_data, output_file=OUTPUT_FILE):
    """
    Append multiple players to the output file in JSONL format
    
    Args:
        players_data (list): List of enhanced player data dictionaries to save
        output_file (str): File path to write to
    """
    try:
        with open(output_file, 'a', encoding='utf-8') as f:
            for player_data in players_data:
                json.dump(player_data, f, ensure_ascii=False)
                f.write('\n')
        logging.info(f"Saved batch of {len(players_data)} players to {output_file}")
    except Exception as e:
        logging.error(f"Failed to save batch of players: {e}")

def load_existing_profile_ids():
    """
    Load already collected profile IDs to avoid duplicates
    
    Returns:
        tuple: (set of existing IDs, highest ID found)
    """
    existing_ids = set()
    max_id = 0
    
    logging.info(f"Checking for existing data file: {OUTPUT_FILE}")
    
    if Path(OUTPUT_FILE).exists():
        file_size = Path(OUTPUT_FILE).stat().st_size
        logging.info(f"Found existing file, size: {file_size} bytes")
        
        try:
            line_count = 0
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    line_count += 1
                    if line_count % 10000 == 0:
                        logging.info(f"Processed {line_count} lines, current max_id: {max_id}")
                    
                    if line.strip():
                        # Only parse what we need - much faster than full JSON
                        line_data = line.strip()
                        if '"profile_id":' in line_data:
                            # Extract just profile_id with minimal parsing
                            try:
                                start = line_data.find('"profile_id":') + 13
                                end = line_data.find(',', start)
                                if end == -1:  # Last field
                                    end = line_data.find('}', start)
                                profile_id = int(line_data[start:end].strip())
                                existing_ids.add(profile_id)
                                max_id = max(max_id, profile_id)
                            except (ValueError, IndexError):
                                # Fall back to full JSON parsing for this line
                                data = json.loads(line_data)
                                profile_id = data.get('profile_id')
                                if profile_id:
                                    existing_ids.add(profile_id)
                                    max_id = max(max_id, profile_id)
                        
            logging.info(f"Found {len(existing_ids)} existing profile IDs, highest ID: {max_id}")
        except Exception as e:
            logging.warning(f"Could not load existing data: {e}")
    else:
        logging.info("No existing data file found")
    
    return existing_ids, max_id

async def process_batch_group(session: aiohttp.ClientSession, rate_limiter: RateLimiter, batch_group, existing_ids):
    """
    Process a group of batches concurrently
    
    Args:
        session: aiohttp session
        rate_limiter: Rate limiter instance
        batch_group: List of batch_ids lists to process
        existing_ids: Set of already collected profile IDs
        
    Returns:
        tuple: (successful_collections, failed_collections, collected_players)
    """
    tasks = []
    for batch_ids in batch_group:
        # Skip IDs already collected
        new_batch_ids = [pid for pid in batch_ids if pid not in existing_ids]
        if new_batch_ids:
            task = fetch_player_data(session, rate_limiter, new_batch_ids)
            tasks.append((task, new_batch_ids))
    
    if not tasks:
        return 0, 0, []
    
    # Execute all tasks concurrently
    results = await asyncio.gather(*[task for task, _ in tasks], return_exceptions=True)
    
    successful_collections = 0
    failed_collections = 0
    all_collected_players = []
    
    for (task, batch_ids), result in zip(tasks, results):
        id_range = f"{batch_ids[0]}-{batch_ids[-1]}" if batch_ids else "empty"
        
        if isinstance(result, Exception):
            logging.error(f"Task failed for profile_ids {id_range}: {result}")
            failed_collections += 1
        elif result is None:
            failed_collections += 1
        else:
            successful_collections += len(result)
            all_collected_players.extend(result)
    
    return successful_collections, failed_collections, all_collected_players

async def main():
    """Main async collection loop"""
    setup_logging()
    
    logging.info("Starting async player data collection")
    logging.info(f"Rate limit: {RATE_LIMIT_RPS} requests per second")
    logging.info(f"Concurrent requests: {CONCURRENT_REQUESTS}")
    logging.info(f"Batch size: {BATCH_SIZE} IDs per request")
    logging.info(f"Output file: {OUTPUT_FILE}")
    
    # Load existing profile IDs and find where to resume
    existing_ids, max_existing_id = load_existing_profile_ids()
    
    # Start from highest collected ID + 1, or START_PROFILE_ID if no data exists
    current_id = max(START_PROFILE_ID, max_existing_id + 1) if max_existing_id > 0 else START_PROFILE_ID
    logging.info(f"Starting collection from profile_id: {current_id}")
    
    consecutive_empty_batches = 0
    successful_collections = 0
    failed_collections = 0
    batch_count = 0
    
    # Create rate limiter and aiohttp session
    rate_limiter = RateLimiter(RATE_LIMIT_RPS)
    timeout = aiohttp.ClientTimeout(total=30)
    
    async with aiohttp.ClientSession(timeout=timeout) as session:
        # Phase 1: Re-fetch existing players with enhanced data (compressed batches)
        existing_ids_list = sorted(list(existing_ids))
        logging.info(f"Phase 1: Re-fetching {len(existing_ids_list)} existing players with enhanced data...")
        
        # Clear/create the enhanced output file
        if Path(ENHANCED_OUTPUT_FILE).exists():
            Path(ENHANCED_OUTPUT_FILE).unlink()
        
        existing_batches = []
        for i in range(0, len(existing_ids_list), BATCH_SIZE):
            batch = existing_ids_list[i:i + BATCH_SIZE]
            existing_batches.append(batch)
        
        # Process existing players in compressed batches
        for i in range(0, len(existing_batches), CONCURRENT_REQUESTS):
            batch_group = existing_batches[i:i + CONCURRENT_REQUESTS]
            
            try:
                # Process batch group concurrently
                group_successful, group_failed, collected_players = await process_batch_group(
                    session, rate_limiter, batch_group, set()  # Don't skip any - we want to re-fetch
                )
                
                if collected_players:
                    # Sort players by profile_id before saving
                    collected_players.sort(key=lambda p: p['profile_id'])
                    
                    # Save to enhanced file during Phase 1
                    save_players_batch(collected_players, ENHANCED_OUTPUT_FILE)
                    
                    # Update counters
                    successful_collections += group_successful
                    batch_count += len(batch_group)
                    logging.info(f"Phase 1 - Batch group {i//CONCURRENT_REQUESTS + 1}: Enhanced {len(collected_players)} existing players")
                
                # Progress update
                if (i // CONCURRENT_REQUESTS + 1) % 5 == 0:
                    logging.info(f"Phase 1 Progress: {i//CONCURRENT_REQUESTS + 1} batch groups processed, {successful_collections} players enhanced")
                    
            except Exception as e:
                logging.error(f"Error processing existing player batch group: {e}")
                continue
        
        logging.info(f"Phase 1 completed: Enhanced {successful_collections} existing players")
        
        # Replace original file with enhanced version
        if Path(ENHANCED_OUTPUT_FILE).exists() and successful_collections > 0:
            shutil.move(ENHANCED_OUTPUT_FILE, OUTPUT_FILE)
            logging.info(f"Replaced original file with enhanced version: {OUTPUT_FILE}")
            
            # Reload existing_ids from the enhanced file
            existing_ids, max_existing_id = load_existing_profile_ids()
            current_id = max(START_PROFILE_ID, max_existing_id + 1) if max_existing_id > 0 else START_PROFILE_ID
            logging.info(f"Reloaded enhanced data: {len(existing_ids)} players, new current_id: {current_id}")
        
        # Phase 2: Continue sequential discovery from highest known ID
        logging.info(f"Phase 2: Starting sequential discovery from profile_id {current_id}")
        consecutive_empty_batches = 0
        
        while consecutive_empty_batches < MAX_CONSECUTIVE_EMPTY_BATCHES:
            # Create multiple batches for concurrent processing
            batch_group = []
            for _ in range(CONCURRENT_REQUESTS):
                if consecutive_empty_batches >= MAX_CONSECUTIVE_EMPTY_BATCHES:
                    break
                batch_ids = list(range(current_id, current_id + BATCH_SIZE))
                batch_group.append(batch_ids)
                current_id += BATCH_SIZE
            
            if not batch_group:
                break
            
            try:
                # Process batch group concurrently
                group_successful, group_failed, collected_players = await process_batch_group(
                    session, rate_limiter, batch_group, existing_ids
                )
                
                if collected_players:
                    # Sort players by profile_id before saving
                    collected_players.sort(key=lambda p: p['profile_id'])
                    
                    # Save entire batch group at once
                    save_players_batch(collected_players)
                    
                    # Update counters and existing IDs
                    successful_collections += group_successful
                    for player_data in collected_players:
                        existing_ids.add(player_data['profile_id'])
                    
                    consecutive_empty_batches = 0  # Reset counter on success
                    batch_count += len(batch_group)
                    logging.info(f"Phase 2 - Batch group {batch_count//CONCURRENT_REQUESTS}: Found {len(collected_players)} new players from {len(batch_group)} batches")
                else:
                    consecutive_empty_batches += len(batch_group)
                    failed_collections += group_failed
                    batch_count += len(batch_group)
                    logging.info(f"Phase 2 - Batch group {batch_count//CONCURRENT_REQUESTS}: No players found ({consecutive_empty_batches}/{MAX_CONSECUTIVE_EMPTY_BATCHES} empty)")
                
                # Progress update
                if (batch_count // CONCURRENT_REQUESTS) % 5 == 0:
                    logging.info(f"Phase 2 Progress: {batch_count} batches processed, {successful_collections} players collected, current ID: {current_id}")
                    
            except KeyboardInterrupt:
                logging.info("Collection interrupted by user")
                break
            except Exception as e:
                logging.error(f"Unexpected error processing batch group: {e}")
                failed_collections += len(batch_group)
                consecutive_empty_batches += len(batch_group)
                continue
    
    # Final summary
    logging.info("Collection completed!")
    logging.info(f"Total batches processed: {batch_count}")
    logging.info(f"Total players collected: {successful_collections}")
    logging.info(f"Final profile ID reached: {current_id}")
    logging.info(f"Data saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main()) 