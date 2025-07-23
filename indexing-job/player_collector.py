#!/usr/bin/env python3
"""
Player Data Collection and Filtering Module

Combines player collection from API with inline filtering for active players.
Used by the indexing job to collect and filter player data before indexing.
"""

import json
import time
import asyncio
import aiohttp
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional

# Configuration
API_BASE_URL = "https://aoe-api.worldsedgelink.com/community/leaderboard/GetPersonalStat"

# Environment variable configuration with defaults
import os

RATE_LIMIT_RPS = int(os.getenv('RATE_LIMIT_RPS', '50'))
CONCURRENT_REQUESTS = int(os.getenv('CONCURRENT_REQUESTS', '25'))
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '200'))
MAX_CONSECUTIVE_EMPTY_BATCHES = int(os.getenv('MAX_CONSECUTIVE_EMPTY_BATCHES', '5'))
ACTIVE_YEARS = float(os.getenv('ACTIVE_YEARS', '2.0'))
MIN_MATCHES = int(os.getenv('MIN_MATCHES', '1'))
TIMEOUT_SECONDS = int(os.getenv('TIMEOUT_SECONDS', '10'))

# Headers matching your existing requests
HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'aoe2-site'
}

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

def is_recently_active(last_match_date_value: Optional[int], years_threshold: int = ACTIVE_YEARS) -> bool:
    """
    Check if a player has been active within the specified number of years.
    
    Args:
        last_match_date_value: Integer timestamp or null
        years_threshold: Number of years to consider "recently active"
        
    Returns:
        True if player is recently active, False otherwise
    """
    if not last_match_date_value:
        return False
    
    try:
        # Convert integer timestamp to datetime
        last_match_date = datetime.fromtimestamp(last_match_date_value, tz=timezone.utc)
        current_date = datetime.now(timezone.utc)
        
        # Calculate the threshold date
        threshold_date = current_date.replace(year=current_date.year - years_threshold)
        
        return last_match_date >= threshold_date
    except (ValueError, TypeError, OSError):
        # If we can't parse the timestamp, assume they're not recently active
        return False

def should_include_player(player_data: Dict) -> bool:
    """
    Determine if a player should be included in the filtered dataset.
    
    Args:
        player_data: Player data from API
        
    Returns:
        True if player should be included, False otherwise
    """
    # Must have minimum number of matches
    if player_data.get('total_matches', 0) < MIN_MATCHES:
        return False
    
    # Must be recently active
    if not is_recently_active(player_data.get('last_match_date')):
        return False
    
    # Must have basic required fields
    profile_id = player_data.get('profile_id')
    name = player_data.get('name')
    alias = player_data.get('alias')
    
    return bool(profile_id and (name or alias))

async def fetch_player_data(session: aiohttp.ClientSession, rate_limiter: RateLimiter, profile_ids: List[int]) -> Optional[List[Dict]]:
    """
    Async fetch player data for one or more profile IDs from the API
    
    Args:
        session: aiohttp session
        rate_limiter: Rate limiter instance
        profile_ids: List of profile IDs to fetch
        
    Returns:
        List of player data dictionaries, or None if failed
    """
    # Format profile IDs for API
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
            
            # Extract player data with enhanced info and filter
            filtered_players = []
            for stat_group in stat_groups:
                members = stat_group.get('members', [])
                for member in members:
                    statgroup_id = member.get('personal_statgroup_id')
                    enhanced_data = statgroup_data.get(statgroup_id, {'total_matches': 0, 'last_match_date': 0})
                    
                    # Add enhanced stats to each player
                    member['total_matches'] = enhanced_data['total_matches']
                    member['last_match_date'] = enhanced_data['last_match_date'] if enhanced_data['last_match_date'] > 0 else None
                    
                    # Filter players inline
                    if should_include_player(member):
                        filtered_players.append(member)
            
            if filtered_players:
                logging.info(f"Successfully collected {len(filtered_players)} active players from profile_ids {id_range}")
            else:
                logging.info(f"No active players found in profile_ids {id_range}")
                
            return filtered_players
                
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

async def process_batch_group(session: aiohttp.ClientSession, rate_limiter: RateLimiter, batch_group: List[List[int]]) -> tuple[int, int, List[Dict]]:
    """
    Process a group of batches concurrently
    
    Args:
        session: aiohttp session
        rate_limiter: Rate limiter instance
        batch_group: List of batch_ids lists to process
        
    Returns:
        tuple: (successful_collections, failed_collections, collected_players)
    """
    tasks = []
    for batch_ids in batch_group:
        task = fetch_player_data(session, rate_limiter, batch_ids)
        tasks.append((task, batch_ids))
    
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

def save_players_batch(players_data: List[Dict], output_file: str) -> None:
    """
    Append multiple players to the output file in JSONL format
    
    Args:
        players_data: List of player data dictionaries to save
        output_file: File path to write to
    """
    try:
        with open(output_file, 'a', encoding='utf-8') as f:
            for player_data in players_data:
                json.dump(player_data, f, ensure_ascii=False)
                f.write('\n')
        logging.info(f"Saved batch of {len(players_data)} players to {output_file}")
    except Exception as e:
        logging.error(f"Failed to save batch of players: {e}")

async def collect_active_players(output_file: str, start_profile_id: int = 1) -> tuple[int, int]:
    """
    Collect and filter active players from the API
    
    Args:
        output_file: Path to save the filtered players
        start_profile_id: Profile ID to start collection from
        
    Returns:
        tuple: (total_players_collected, final_profile_id_reached)
    """
    logging.info("Starting async player data collection and filtering")
    logging.info(f"Rate limit: {RATE_LIMIT_RPS} requests per second")
    logging.info(f"Concurrent requests: {CONCURRENT_REQUESTS}")
    logging.info(f"Batch size: {BATCH_SIZE} IDs per request")
    logging.info(f"Active years: {ACTIVE_YEARS}")
    logging.info(f"Min matches: {MIN_MATCHES}")
    logging.info(f"Timeout: {TIMEOUT_SECONDS} seconds")
    logging.info(f"Max empty batches: {MAX_CONSECUTIVE_EMPTY_BATCHES}")
    logging.info(f"Output file: {output_file}")
    logging.info(f"Starting from profile_id: {start_profile_id}")
    
    # Ensure output directory exists
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    
    # Clear output file
    with open(output_file, 'w') as f:
        pass  # Create empty file
    
    current_id = start_profile_id
    consecutive_empty_batches = 0
    successful_collections = 0
    failed_collections = 0
    batch_count = 0
    
    # Create rate limiter and aiohttp session
    rate_limiter = RateLimiter(RATE_LIMIT_RPS)
    timeout = aiohttp.ClientTimeout(total=TIMEOUT_SECONDS)
    
    async with aiohttp.ClientSession(timeout=timeout) as session:
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
                    session, rate_limiter, batch_group
                )
                
                if collected_players:
                    # Sort players by profile_id before saving
                    collected_players.sort(key=lambda p: p['profile_id'])
                    
                    # Save entire batch group at once
                    save_players_batch(collected_players, output_file)
                    
                    # Update counters
                    successful_collections += group_successful
                    consecutive_empty_batches = 0  # Reset counter on success
                    batch_count += len(batch_group)
                    logging.info(f"Batch group {batch_count//CONCURRENT_REQUESTS}: Found {len(collected_players)} active players from {len(batch_group)} batches")
                else:
                    consecutive_empty_batches += len(batch_group)
                    failed_collections += group_failed
                    batch_count += len(batch_group)
                    logging.info(f"Batch group {batch_count//CONCURRENT_REQUESTS}: No active players found ({consecutive_empty_batches}/{MAX_CONSECUTIVE_EMPTY_BATCHES} empty)")
                
                # Progress update
                if (batch_count // CONCURRENT_REQUESTS) % 5 == 0:
                    logging.info(f"Progress: {batch_count} batches processed, {successful_collections} active players collected, current ID: {current_id}")
                    
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
    logging.info(f"Total active players collected: {successful_collections}")
    logging.info(f"Final profile ID reached: {current_id}")
    logging.info(f"Data saved to: {output_file}")
    
    return successful_collections, current_id

if __name__ == "__main__":
    # For testing the module independently
    import sys
    
    output_file = sys.argv[1] if len(sys.argv) > 1 else "/tmp/active_players.jsonl"
    start_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    asyncio.run(collect_active_players(output_file, start_id)) 