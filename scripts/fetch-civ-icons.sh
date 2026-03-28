#!/usr/bin/env bash
#
# fetch-civ-icons.sh — Fetch civ emblem icons from SiegeEngineers/aoe2techtree
#
# Usage:
#   bash scripts/fetch-civ-icons.sh [--all] [--dry-run]
#
# Downloads full civ emblem/crest icons into ui/src/assets/civ_emblems/.
# These are the heraldic shield icons used in the match summary view.
#
# By default, only downloads emblems that are missing locally.
# --all     Re-download all emblems (overwrites existing)
# --dry-run Show what would be downloaded without downloading
#
# Source: https://github.com/SiegeEngineers/aoe2techtree/tree/master/img/Civs
#
# Note: Return of Rome civs (Assyrian, Babylonian, Choson, etc.) are NOT in the
# SiegeEngineers repo. The script copies mod icons as fallback for those.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EMBLEMS_DIR="$PROJECT_ROOT/ui/src/assets/civ_emblems"
ICONS_DIR="$PROJECT_ROOT/ui/src/assets/civ_icons"
MAPPINGS_FILE="$PROJECT_ROOT/data/rl_api_mappings.json"
BASE_URL="https://raw.githubusercontent.com/SiegeEngineers/aoe2techtree/master/img/Civs"

DOWNLOAD_ALL=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --all) DOWNLOAD_ALL=true ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

mkdir -p "$EMBLEMS_DIR"

# Map API civ name → local filename (must match assetManager.ts getCivIcon logic)
get_local_filename() {
  case "$1" in
    Aztec) echo "aztecs.png" ;;
    Hindustanis) echo "hindustanis.png" ;;
    Macedonians) echo "macedonians.png" ;;
    *) echo "$(echo "$1" | tr '[:upper:]' '[:lower:]').png" ;;
  esac
}

# Map API civ name → SiegeEngineers filename
get_remote_filename() {
  case "$1" in
    Aztec) echo "aztecs.png" ;;
    Hindustanis) echo "hindustanis.png" ;;
    *) echo "$(echo "$1" | tr '[:upper:]' '[:lower:]').png" ;;
  esac
}

# Civs NOT in SiegeEngineers repo (Return of Rome / classic AoE1 civs)
is_ror_civ() {
  case "$1" in
    Assyrians|Babylonians|Carthaginians|Choson|Egyptians|Greeks|Hittites|LacViet|Minoans|OldPersians|OldRomans|Palmyrans|Phoenicians|Shang|Sumerians|Yamato) return 0 ;;
    *) return 1 ;;
  esac
}

echo "=== AoE2 Civ Emblem Fetcher ==="
echo "Emblems dir: $EMBLEMS_DIR"
echo ""

# Extract civ names from mappings JSON
CIVS=$(python3 -c "
import json
with open('$MAPPINGS_FILE') as f:
    data = json.load(f)
for civ in sorted(data['civs']['aoe2'].keys()):
    print(civ)
")

downloaded=0
skipped=0
already_exists=0
failed=0

while IFS= read -r civ; do
  if is_ror_civ "$civ"; then
    skipped=$((skipped + 1))
    continue
  fi

  local_file="$EMBLEMS_DIR/$(get_local_filename "$civ")"
  remote_file="$(get_remote_filename "$civ")"
  remote_url="$BASE_URL/$remote_file"

  if [ -f "$local_file" ] && [ "$DOWNLOAD_ALL" = false ]; then
    already_exists=$((already_exists + 1))
    continue
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] Would download: $civ → $remote_file"
    downloaded=$((downloaded + 1))
    continue
  fi

  echo "Downloading: $civ → $remote_file"
  if curl -sfL "$remote_url" -o "$local_file"; then
    downloaded=$((downloaded + 1))
  else
    echo "  ⚠ Failed to download $remote_url"
    failed=$((failed + 1))
  fi
done <<< "$CIVS"

echo ""
echo "=== Summary ==="
echo "Downloaded:     $downloaded"
echo "Already exists: $already_exists"
echo "Skipped (RoR):  $skipped"
[ "$failed" -gt 0 ] && echo "Failed:         $failed"

# Copy mod icons as fallback ONLY for civs that have no emblem yet
# (i.e., RoR civs not in SiegeEngineers repo)
echo ""
echo "=== Fallback: copying mod icons for civs without emblems ==="
fallback=0

# All filenames we expect (from assetManager.test.ts + mappings)
ALL_EXPECTED="aztecs britons byzantines franks goths japanese mongols persians saracens teutons turks vikings chinese koreans spanish italians huns mayans incas indians ethiopians malians berbers malay burmese khmer vietnamese bulgarians tatars cumans lithuanians burgundians sicilians poles bohemians dravidians bengalis gurjaras romans armenians georgians khitans jurchens yamato spartans palmyran minoan macedonian lacviet choson celts slavs magyars portuguese phoenician sumerian egyptian greek roman persian hittite assyrian babylonian carthaginian athenians achaemenids shang wei shu wu mapuche muisca puru thracians tupi hindustanis"

for name in $ALL_EXPECTED; do
  emblem_file="$EMBLEMS_DIR/${name}.png"
  icon_file="$ICONS_DIR/${name}.png"

  # Only copy mod icon if NO emblem was downloaded for this civ
  if [ ! -f "$emblem_file" ] && [ -f "$icon_file" ]; then
    if [ "$DRY_RUN" = true ]; then
      echo "[dry-run] Would copy fallback: ${name}.png"
    else
      cp "$icon_file" "$emblem_file"
      echo "  Copied fallback: ${name}.png"
    fi
    fallback=$((fallback + 1))
  fi
done
echo "  Fallbacks copied: $fallback"

# Final missing check
echo ""
echo "=== Missing Icon Check ==="
missing_emblem=0
missing_icon=0

for name in $ALL_EXPECTED; do
  if [ ! -f "$EMBLEMS_DIR/${name}.png" ]; then
    echo "  MISSING emblem: ${name}.png"
    missing_emblem=$((missing_emblem + 1))
  fi
  if [ ! -f "$ICONS_DIR/${name}.png" ]; then
    echo "  MISSING mod icon: ${name}.png"
    missing_icon=$((missing_icon + 1))
  fi
done

if [ "$missing_emblem" -eq 0 ]; then
  echo "  All expected emblems present ✓"
else
  echo "  $missing_emblem emblem(s) still missing"
fi

if [ "$missing_icon" -gt 0 ]; then
  echo "  $missing_icon mod icon(s) missing (match list will use fallback text)"
fi
