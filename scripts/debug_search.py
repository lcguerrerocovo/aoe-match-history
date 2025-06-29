#!/usr/bin/env python3
"""
Debug Search Implementation
Test the search logic against actual Firestore data
"""

from google.cloud import firestore
import re

def clean_for_search(text):
    """Same function as in the proxy"""
    if not text:
        return ""
    # Remove all non-alphanumeric characters, convert to lowercase
    return re.sub(r'[^\w]', '', str(text).lower())

def test_search_logic():
    db = firestore.Client()
    players_ref = db.collection('players')
    
    # 1. Check a few sample documents to see the actual data structure
    print("=== Sample Documents ===")
    sample_docs = players_ref.limit(3).stream()
    for doc in sample_docs:
        data = doc.to_dict()
        print(f"Profile ID: {data.get('profile_id')}")
        print(f"Name: {data.get('name')}")
        print(f"Name no special: {data.get('name_no_special')}")
        print(f"Country: {data.get('country')}")
        print(f"Total matches: {data.get('total_matches')}")
        print("-" * 40)
    
    # 2. Test the clean_for_search function
    test_queries = ['daut', 'ds_biry', 'sh']
    print("\n=== Search Query Processing ===")
    for query in test_queries:
        clean_query = clean_for_search(query)
        print(f"'{query}' -> '{clean_query}'")
    
    # 3. Try direct Firestore queries
    print("\n=== Direct Firestore Search Test ===")
    for query in test_queries:
        clean_query = clean_for_search(query)
        if not clean_query:
            continue
            
        print(f"\nSearching for: '{clean_query}'")
        
        # Try the exact same query as the proxy
        snapshot = players_ref.where('name_no_special', '>=', clean_query).where('name_no_special', '<', clean_query + '\uf8ff').limit(10).stream()
        
        results = []
        for doc in snapshot:
            data = doc.to_dict()
            results.append({
                'name': data.get('name'),
                'name_no_special': data.get('name_no_special'),
                'matches': data.get('total_matches', 0)
            })
        
        print(f"Found {len(results)} results:")
        for result in results[:5]:  # Show first 5
            print(f"  - {result['name']} ({result['name_no_special']}) - {result['matches']} matches")
    
    # 4. Check if any names contain these substrings
    print("\n=== Substring Search Test ===")
    for query in ['daut', 'biry']:
        clean_query = clean_for_search(query)
        print(f"\nLooking for names containing '{clean_query}'...")
        
        # Get a sample of players and check manually
        sample_players = players_ref.limit(1000).stream()
        matches = []
        
        for doc in sample_players:
            data = doc.to_dict()
            name_no_special = data.get('name_no_special', '')
            if clean_query in name_no_special:
                matches.append({
                    'name': data.get('name'),
                    'name_no_special': name_no_special,
                    'matches': data.get('total_matches', 0)
                })
                if len(matches) >= 5:  # Stop after finding 5
                    break
        
        print(f"Found {len(matches)} matches in sample:")
        for match in matches:
            print(f"  - {match['name']} ({match['name_no_special']}) - {match['matches']} matches")

if __name__ == "__main__":
    test_search_logic() 