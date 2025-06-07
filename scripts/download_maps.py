import os
import json
import requests
from pathlib import Path

BASE_URL = 'https://frontend.cdn.aoe2companion.com/public/aoe2/de/maps/'
OUTPUT_DIR = Path(__file__).parent.parent / 'ui' / 'src' / 'assets' / 'maps'

# Create output directory if it doesn't exist
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
print(f'Saving maps to: {OUTPUT_DIR.absolute()}')

# Read map names from rl_api_mappings.json
with open(Path(__file__).parent.parent / 'data' / 'rl_api_mappings.json') as f:
    data = json.load(f)
    map_names = list(data['maps']['aoe2'].keys())

def get_filename_variants(map_name):
    # Convert camelCase to different formats
    name_lower = map_name.lower()
    name_underscore = ''.join(['_' + c.lower() if c.isupper() else c for c in map_name]).lstrip('_')
    name_hyphen = ''.join(['-' + c.lower() if c.isupper() else c for c in map_name]).lstrip('-')
    
    # Generate all variants
    variants = [
        f"rm_{name_underscore}.png",
        f"rm_{name_hyphen}.png",
        f"rm_{name_lower}.png",
        f"{name_underscore}.png",
        f"{name_hyphen}.png",
        f"{name_lower}.png"
    ]
    return variants

def download_file(filename, save_as):
    url = BASE_URL + filename
    output_path = OUTPUT_DIR / save_as
    
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f'Downloaded: {filename} -> {save_as}')
        return True
    except Exception as e:
        return False

def main():
    print('Starting downloads...')
    success_count = 0
    
    for map_name in map_names:
        print(f'\nTrying to download {map_name}...')
        variants = get_filename_variants(map_name)
        
        for variant in variants:
            if download_file(variant, f"{map_name}.png"):
                success_count += 1
                break
        else:
            print(f'Failed to download {map_name} with any variant')
    
    print(f'\nDownload complete! {success_count}/{len(map_names)} maps downloaded successfully.')

if __name__ == '__main__':
    main() 