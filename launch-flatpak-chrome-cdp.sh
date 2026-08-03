#!/usr/bin/env bash
# Launch Google Chrome (Flatpak) with remote debugging + real sign-in support.
#
# Chrome blocks CDP on its "default" profile path. We use a sibling directory
# seeded from your Flatpak profile so Google / X sessions carry over.
set -euo pipefail

CDP_PORT="${CDP_PORT:-9223}"
GAME_URL="${GAME_URL:-http://localhost:8765/ninjawhee-eat-the-sounds.html}"
GROK_URL="${GROK_URL:-https://grok.com}"
FLATPAK_PROFILE="${FLATPAK_PROFILE:-$HOME/.var/app/com.google.Chrome/config/google-chrome}"
CDP_PROFILE="${CDP_PROFILE:-$HOME/.grok/chrome-heavy}"

echo "==> Stopping puppeteer Chromium (isolated profile, cannot sign in)..."
pkill -f 'chrome-linux64.*chrome-cdp-profile' 2>/dev/null || true
sleep 1

echo "==> Stopping existing Flatpak Chrome (needed to enable debugging port)..."
flatpak kill com.google.Chrome 2>/dev/null || true
pkill -f '/app/extra/chrome ' 2>/dev/null || true
sleep 2

if [ ! -f "${CDP_PROFILE}/Local State" ] && [ -d "${FLATPAK_PROFILE}" ]; then
  echo "==> First run: seeding CDP profile from your Flatpak Chrome (logins, bookmarks)..."
  mkdir -p "${CDP_PROFILE}"
  rsync -a \
    --exclude='SingletonLock' --exclude='SingletonSocket' --exclude='SingletonCookie' \
    --exclude='lockfile' --exclude='*/lockfile' \
    "${FLATPAK_PROFILE}/" "${CDP_PROFILE}/"
fi

echo "==> Launching Flatpak Google Chrome with CDP on port ${CDP_PORT}..."
echo "    CDP profile: ${CDP_PROFILE}"
nohup flatpak run com.google.Chrome \
  --user-data-dir="${CDP_PROFILE}" \
  --remote-debugging-port="${CDP_PORT}" \
  --remote-debugging-address=127.0.0.1 \
  "${GROK_URL}" \
  "${GAME_URL}" \
  >>/home/potter/HEAVY-CHROME-CDP.log 2>&1 &

for i in $(seq 1 20); do
  if curl -sf "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
    echo "==> CDP ready: http://127.0.0.1:${CDP_PORT}"
    echo "==> Opened: ${GROK_URL} and ${GAME_URL}"
    echo "==> This is your Chrome profile (Google / X sign-in should work)."
    echo "    Re-run this script anytime you need CDP; profile persists at:"
    echo "    ${CDP_PROFILE}"
    exit 0
  fi
  sleep 1
done

echo "CDP did not come up — tail /home/potter/HEAVY-CHROME-CDP.log"
tail -20 /home/potter/HEAVY-CHROME-CDP.log
exit 1