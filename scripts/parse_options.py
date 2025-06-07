#!/usr/bin/env python3
import base64
import zlib
import re
import json
import argparse
import sys

def extract_pairs(encoded: str):
    # 1) Base64 → zlib
    try:
        blob = base64.b64decode(encoded)
        data = zlib.decompress(blob, wbits=15)
    except Exception as e:
        print("first decode/decompress failed:", e, file=sys.stderr)
        return {}

    # 2) strip surrounding quotes if present
    text = data.decode('utf-8', errors='ignore')
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1]

    # 3) inner Base64 → raw bytes
    try:
        raw = base64.b64decode(text)
    except Exception as e:
        print("inner Base64 decode failed:", e, file=sys.stderr)
        return {}

    # 4) regex out all “digits:alphanum+” segments
    pairs = re.findall(rb'(\d+):([0-9A-Za-z+/=]+)', raw)
    return { k.decode(): v.decode() for k, v in pairs }

if __name__ == "__main__":
    p = argparse.ArgumentParser(
        description="Pull out number:value pairs from your AoE2 blob"
    )
    p.add_argument("blob", help="The eNpF… string you have")
    args = p.parse_args()

    result = extract_pairs(args.blob)
    if not result:
        print("No data extracted.", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result, indent=2))