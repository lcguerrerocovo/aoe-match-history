#!/bin/bash
set -e

APP_DIR="$HOME/Applications/AoE2URLHandler.app"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOTTLE="Windows 10"
HELPER_WIN_PATH='C:\\Program Files (x86)\\AOE URL Helper\\AOEURLHelper.exe'

# --- Find CrossOver installation ---
CX_WINE=""
CX_REL_PATH="Contents/SharedSupport/CrossOver/CrossOver-Hosted Application/wine"

for candidate in \
    "$HOME/Applications/CrossOver"*.app \
    "/Applications/CrossOver"*.app; do
    if [ -f "$candidate/$CX_REL_PATH" ]; then
        CX_WINE="$candidate/$CX_REL_PATH"
        echo "✅ Found CrossOver: $candidate"
        break
    fi
done

if [ -z "$CX_WINE" ]; then
    echo "❌ CrossOver not found in ~/Applications or /Applications."
    echo "   Install CrossOver first, then re-run this script."
    exit 1
fi

# Derive the relative path from $HOME for use inside AppleScript
CX_WINE_FROM_HOME="${CX_WINE#$HOME/}"

# --- Ensure AOEURLHelper.exe exists in the bottle ---
BOTTLES_DIR="$HOME/Library/Application Support/CrossOver/Bottles"
HELPER_DIR="$BOTTLES_DIR/$BOTTLE/drive_c/Program Files (x86)/AOE URL Helper"
HELPER_POSIX="$HELPER_DIR/AOEURLHelper.exe"
BUNDLED_HELPER="$SCRIPT_DIR/aoe2de-url-handler/AOEURLHelper.exe"

if [ ! -f "$HELPER_POSIX" ]; then
    if [ -f "$BUNDLED_HELPER" ]; then
        echo "📋 Installing AOEURLHelper.exe into bottle '$BOTTLE'..."
        mkdir -p "$HELPER_DIR"
        cp "$BUNDLED_HELPER" "$HELPER_POSIX"
        chmod +x "$HELPER_POSIX"
    else
        echo "❌ AOEURLHelper.exe not found in bottle or in $BUNDLED_HELPER"
        exit 1
    fi
fi

# --- Skip if already installed ---
if [ -d "$APP_DIR" ]; then
    echo "ℹ️  $APP_DIR already exists. Re-run with --force to reinstall."
    if [ "${1:-}" != "--force" ]; then
        exit 0
    fi
    echo "   --force specified, reinstalling..."
fi

# --- Build AppleScript handler ---
echo "📦 Creating AoE2 URL handler app..."

TMP_SCRIPT="$(mktemp "${TMPDIR:-/tmp}/aoe2handler.XXXXXX.applescript")"
cat > "$TMP_SCRIPT" << APPLESCRIPT
on open location theURL
	set cxWine to (POSIX path of (path to home folder)) & "$CX_WINE_FROM_HOME"
	set helperExe to "C:\\\\Program Files (x86)\\\\AOE URL Helper\\\\AOEURLHelper.exe"
	do shell script "logger -t AoE2URLHandler 'Opening: " & theURL & "'"
	do shell script quoted form of cxWine & " --bottle '$BOTTLE' " & quoted form of helperExe & " " & quoted form of theURL & " &>/dev/null &"
end open location
APPLESCRIPT

rm -rf "$APP_DIR"
osacompile -o "$APP_DIR" "$TMP_SCRIPT"
rm "$TMP_SCRIPT"

# --- Patch Info.plist to register aoe2de:// URL scheme ---
PLIST="$APP_DIR/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.luisg.aoe2urlhandler" "$PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.luisg.aoe2urlhandler" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :LSBackgroundOnly bool true" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string 'AoE2DE Protocol'" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string aoe2de" "$PLIST"

# --- Register with Launch Services ---
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_DIR"

echo "✅ Installed: $APP_DIR"
echo "   URL scheme 'aoe2de://' is now registered."
echo "   Test with: open 'aoe2de://1/476586115'"
