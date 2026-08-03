#!/usr/bin/env bash
# Launch Cursor desktop on eat-the-sounds (AppImage — no sudo needed).
set -euo pipefail
APPIMAGE="${APPIMAGE:-$HOME/Downloads/Cursor-3.7.36-x86_64.AppImage}"
# Open canonical workspace (game source lives here; eat-the-sounds/ is git mirror)
PROJECT="${PROJECT:-$HOME}"
chmod +x "$APPIMAGE"
exec "$APPIMAGE" --no-sandbox "$PROJECT"