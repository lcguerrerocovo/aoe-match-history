#!/usr/bin/env python3
"""
Quick Firestore Query Script
"""

from google.cloud import firestore

def query_players():
    db = firestore.Client()
    
    players_ref = db.collection('players')
    
    print("=== Sample Players (Full Data) ===")
    # Get first 3 players and show all fields
    docs = players_ref.limit(3).stream()
    for i, doc in enumerate(docs, 1):
        data = doc.to_dict()
        print(f"\n--- Player {i} ---")
        for key, value in data.items():
            print(f"  {key}: {value}")
        print("-" * 40)
    
    print("\n=== Players with Most Matches ===")
    # Top players by matches
    top_players = players_ref.order_by('total_matches', direction=firestore.Query.DESCENDING).limit(10).stream()
    for doc in top_players:
        data = doc.to_dict()
        print(f"Name: {data.get('name')}, Matches: {data.get('total_matches')}, Country: {data.get('country')}")
    
    print("\n=== Search Example ===")
    # Search by name (you'll need to know a name)
    # search_results = players_ref.where('name', '==', 'SomePlayerName').stream()
    
    print("\n=== Players with Clans ===")
    # Players with clan info
    clan_players = players_ref.where('clan', '!=', '').limit(5).stream()
    for doc in clan_players:
        data = doc.to_dict()
        print(f"Name: {data.get('name')}, Clan: {data.get('clan')}, Matches: {data.get('total_matches')}")

def get_player_by_id(profile_id):
    """Get a single player by profile_id and show all fields"""
    db = firestore.Client()
    
    # Query by profile_id
    players_ref = db.collection('players')
    results = players_ref.where('profile_id', '==', int(profile_id)).limit(1).stream()
    
    for doc in results:
        data = doc.to_dict()
        print(f"\n=== Player {profile_id} - Complete Data ===")
        for key, value in sorted(data.items()):
            print(f"  {key}: {value}")
        return data
    
    print(f"Player with profile_id {profile_id} not found")
    return None

if __name__ == "__main__":
    query_players()
    
    # Uncomment to look up a specific player by ID
    # get_player_by_id(123456)  # Replace with actual profile_id 