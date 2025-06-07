import os
from pathlib import Path
from google.cloud import storage

def upload_maps():
    # Initialize GCS client
    client = storage.Client()
    bucket = client.bucket('aoe2.site')
    
    # Get maps directory
    maps_dir = Path(__file__).parent.parent / 'ui' / 'src' / 'assets' / 'maps'
    
    # Upload each map file
    for map_file in maps_dir.glob('*.png'):
        blob = bucket.blob(f'assets/maps/{map_file.name}')
        blob.upload_from_filename(map_file)
        print(f'Uploaded {map_file.name}')

if __name__ == '__main__':
    upload_maps() 