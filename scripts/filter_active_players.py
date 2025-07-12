#!/usr/bin/env python3
"""
Filter Active Players from JSONL Dataset

PURPOSE:
This script reads a large JSONL file and filters it to include only players who:
1. Have played at least one match (total_matches > 0)
2. Have been active in the last 2 years (last_match_date within 2 years)

This creates a much smaller, focused dataset for indexing into Meilisearch.

USAGE:
  python scripts/filter_active_players.py data/collected_players.jsonl data/active_players.jsonl
"""

import json
import argparse
import logging
from pathlib import Path
from datetime import datetime, timezone

# --- Configuration ---
ACTIVE_YEARS = 2  # Only include players active in the last N years

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def is_recently_active(last_match_date_value, years_threshold=ACTIVE_YEARS):
    """
    Check if a player has been active within the specified number of years.
    
    Args:
        last_match_date_value: Integer timestamp or null
        years_threshold (int): Number of years to consider "recently active"
        
    Returns:
        bool: True if player is recently active, False otherwise
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

def should_include_player(player_data):
    """
    Determine if a player should be included in the filtered dataset.
    
    Args:
        player_data (dict): Player data from JSONL
        
    Returns:
        bool: True if player should be included, False otherwise
    """
    # Must have at least one match
    if player_data.get('total_matches', 0) == 0:
        return False
    
    # Must be recently active
    if not is_recently_active(player_data.get('last_match_date')):
        return False
    
    # Must have basic required fields
    profile_id = player_data.get('profile_id')
    name = player_data.get('name')
    alias = player_data.get('alias')
    
    return bool(profile_id and (name or alias))

def main(input_file_path, output_file_path):
    """Main function to filter the dataset."""
    
    # 1. Validate input file
    input_file = Path(input_file_path)
    if not input_file.is_file():
        logging.error(f"Input file not found: {input_file_path}")
        return
    
    # 2. Prepare output file
    output_file = Path(output_file_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 3. Process the file
    total_processed = 0
    included_count = 0
    skipped_no_matches = 0
    skipped_inactive = 0
    skipped_invalid = 0
    
    logging.info(f"Filtering data from {input_file} to {output_file}...")
    
    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line_num, line in enumerate(infile, 1):
            try:
                player_data = json.loads(line)
                total_processed += 1
                
                if should_include_player(player_data):
                    # Write the player data to output file
                    json.dump(player_data, outfile)
                    outfile.write('\n')
                    included_count += 1
                else:
                    # Count why it was skipped
                    if player_data.get('total_matches', 0) == 0:
                        skipped_no_matches += 1
                    elif not is_recently_active(player_data.get('last_match_date')):
                        skipped_inactive += 1
                    else:
                        skipped_invalid += 1
                        
            except json.JSONDecodeError:
                logging.warning(f"Skipping malformed JSON on line {line_num}")
                continue
    
    # 4. Print summary
    logging.info("✅ Filtering complete!")
    logging.info(f"   Total processed:     {total_processed:,}")
    logging.info(f"   Included:            {included_count:,}")
    logging.info(f"   Skipped (no matches): {skipped_no_matches:,}")
    logging.info(f"   Skipped (inactive):   {skipped_inactive:,}")
    logging.info(f"   Skipped (invalid):    {skipped_invalid:,}")
    logging.info(f"   Output file:          {output_file}")
    
    # 5. Show file sizes
    input_size = input_file.stat().st_size / (1024 * 1024)  # MB
    output_size = output_file.stat().st_size / (1024 * 1024)  # MB
    reduction = ((input_size - output_size) / input_size) * 100
    
    logging.info(f"   Input file size:      {input_size:.1f} MB")
    logging.info(f"   Output file size:     {output_size:.1f} MB")
    logging.info(f"   Size reduction:       {reduction:.1f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Filter active players from a JSONL dataset."
    )
    parser.add_argument(
        "input_file", 
        help="Path to the input JSONL file (e.g., data/collected_players.jsonl)."
    )
    parser.add_argument(
        "output_file", 
        help="Path to the output JSONL file (e.g., data/active_players.jsonl)."
    )
    args = parser.parse_args()
    
    main(args.input_file, args.output_file) 