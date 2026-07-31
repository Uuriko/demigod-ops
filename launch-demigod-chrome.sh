#!/usr/bin/env bash
# Chrome CDP for Demigod website work (no game tab).
set -euo pipefail
CDP_PORT="${CDP_PORT:-9223}"
CDP_PROFILE="${CDP_PROFILE:-$HOME/.grok/chrome-heavy}"
FLATPAK_PROFILE="${FLATPAK_PROFILE:-$HOME/.var/app/com.google.Chrome/config/google-chrome}"

pkill -f 'chrome-linux64.*chrome-cdp-profile' 2>/dev/null || true
flatpak kill com.google.Chrome 2>/dev/null || true
pkill -f '/app/extra/chrome ' 2>/dev/null || true
sleep 2

if [ ! -f "${CDP_PROFILE}/Local State" ] && [ -d "${FLATPAK_PROFILE}" ]; then
  mkdir -p "${CDP_PROFILE}"
  rsync -a \
    --exclude='SingletonLock' --exclude='SingletonSocket' --exclude='SingletonCookie' \
    --exclude='lockfile' --exclude='*/lockfile' \
    "${FLATPAK_PROFILE}/" "${CDP_PROFILE}/"
fi

nohup flatpak run com.google.Chrome \
  --user-data-dir="${CDP_PROFILE}" \
  --remote-debugging-port="${CDP_PORT}" \
  --remote-debugging-address=127.0.0.1 \
  --remote-allow-origins=* \
  "https://grok.com" \
  "https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8" \
  "https://www.trydemigod.com/" \
  >>/home/potter/HEAVY-CHROME-CDP.log 2>&1 &

for i in $(seq 1 25); do
  if curl -sf "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
    echo "CDP ready: http://127.0.0.1:${CDP_PORT}"
    exit 0
  fi
  sleep 1
done
echo "CDP failed — see HEAVY-CHROME-CDP.log"
exit 1