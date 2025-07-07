#!/usr/bin/env python3
"""
Script to delete the matches collection in batches to avoid Firestore transaction size limits.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import time

def delete_collection_in_batches(db, collection_path, batch_size=100):
    """
    Delete a collection in batches to avoid transaction size limits.
    
    Args:
        db: Firestore client
        collection_path: Path to the collection to delete
        batch_size: Number of documents to delete per batch
    """
    print(f"Starting deletion of collection: {collection_path}")
    
    # Get all documents in the collection
    docs = db.collection(collection_path).stream()
    doc_ids = [doc.id for doc in docs]
    
    if not doc_ids:
        print(f"No documents found in {collection_path}")
        return
    
    print(f"Found {len(doc_ids)} documents to delete")
    
    # Delete in batches
    total_deleted = 0
    for i in range(0, len(doc_ids), batch_size):
        batch = db.batch()
        batch_ids = doc_ids[i:i + batch_size]
        
        for doc_id in batch_ids:
            doc_ref = db.collection(collection_path).document(doc_id)
            batch.delete(doc_ref)
        
        # Commit the batch
        batch.commit()
        total_deleted += len(batch_ids)
        print(f"Deleted batch {i//batch_size + 1}: {len(batch_ids)} documents (Total: {total_deleted}/{len(doc_ids)})")
        
        # Small delay to avoid overwhelming Firestore
        time.sleep(0.1)
    
    print(f"Successfully deleted {total_deleted} documents from {collection_path}")

def main():
    # Initialize Firebase Admin SDK
    try:
        # Try to use default credentials (for deployed environments)
        firebase_admin.initialize_app()
    except ValueError:
        # If already initialized, that's fine
        pass
    
    db = firestore.client()
    
    # Delete the matches collection
    delete_collection_in_batches(db, 'matches')
    
    print("Collection deletion completed!")

if __name__ == "__main__":
    main() 