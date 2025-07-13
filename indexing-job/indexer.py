import requests
import json
import time

MEILI_URL = "http://localhost:7700"
HEADERS = {"X-Meili-API-Key": "masterKey"}

def create_index():
    """Create the players index with appropriate settings"""
    try:
        # Delete existing index if it exists
        requests.delete(f"{MEILI_URL}/indexes/players", headers=HEADERS)
        time.sleep(1)
    except:
        pass  # Index doesn't exist
    
    # Create new index
    response = requests.post(f"{MEILI_URL}/indexes", 
                           json={"uid": "players"}, 
                           headers=HEADERS)
    print(f"Created index: {response.json()}")

def configure_index():
    """Configure searchable attributes and ranking rules"""
    # Set searchable attributes
    searchable_attributes = ["name", "clanlist_name", "country"]
    response = requests.put(f"{MEILI_URL}/indexes/players/settings/searchable-attributes",
                          json=searchable_attributes,
                          headers=HEADERS)
    print(f"Set searchable attributes: {response.json()}")
    
    # Set ranking rules (optional - customize based on your needs)
    ranking_rules = ["words", "typo", "proximity", "attribute", "sort", "exactness"]
    response = requests.put(f"{MEILI_URL}/indexes/players/settings/ranking-rules",
                          json=ranking_rules,
                          headers=HEADERS)
    print(f"Set ranking rules: {response.json()}")

def index_players():
    """Read JSONL file and index players"""
    players = []
    
    print("Reading active_players.jsonl...")
    with open('/active_players.jsonl', 'r') as f:
        for line in f:
            if line.strip():
                player = json.loads(line)
                # Ensure we have required fields
                if 'name' in player and 'user_id' in player:
                    players.append(player)
    
    print(f"Found {len(players)} players to index")
    
    if not players:
        print("No players found in file!")
        return
    
    # Index players in batches
    batch_size = 1000
    for i in range(0, len(players), batch_size):
        batch = players[i:i + batch_size]
        response = requests.post(f"{MEILI_URL}/indexes/players/documents",
                               json=batch,
                               headers=HEADERS)
        print(f"Indexed batch {i//batch_size + 1}: {response.json()}")
        time.sleep(0.1)  # Small delay between batches
    
    print("Indexing completed!")

def main():
    print("Starting Meilisearch indexing job...")
    
    # Create index
    create_index()
    
    # Configure index settings
    configure_index()
    
    # Index the players
    index_players()
    
    print("Indexing job finished successfully!")

if __name__ == "__main__":
    main() 