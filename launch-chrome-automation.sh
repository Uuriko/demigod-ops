#!/usr/bin/env bash
# Fast CDP Chrome for Demigod Webflow work (:9223).
# Prefers system/Flatpak Chrome; falls back to Playwright Chromium so agents
# are not blocked when Google Chrome is not installed yet.
set -euo pipefail
CDP_PORT="${CDP_PORT:-9223}"
PROFILE="${HOME}/.grok/chrome-automation"
LOG="/tmp/chrome-automation.log"
mkdir -p "$PROFILE"

pkill -f "remote-debugging-port=${CDP_PORT}" 2>/dev/null || true
sleep 0.5

resolve_chrome() {
  if command -v google-chrome-stable >/dev/null 2>&1; then
    echo "google-chrome-stable"
    return
  fi
  if command -v google-chrome >/dev/null 2>&1; then
    echo "google-chrome"
    return
  fi
  if command -v chromium-browser >/dev/null 2>&1; then
    echo "chromium-browser"
    return
  fi
  if command -v chromium >/dev/null 2>&1; then
    echo "chromium"
    return
  fi
  if flatpak list 2>/dev/null | grep -q com.google.Chrome; then
    echo "flatpak run com.google.Chrome"
    return
  fi
  # Playwright-bundled Chromium (present after npm playwright install)
  local pw
  pw="$(find "${HOME}/.cache/ms-playwright" -path '*/chrome-linux64/chrome' -type f 2>/dev/null | head -1 || true)"
  if [[ -n "$pw" && -x "$pw" ]]; then
    echo "$pw"
    return
  fi
  echo ""
}

CHROME_CMD="$(resolve_chrome)"
if [[ -z "$CHROME_CMD" ]]; then
  echo "No Chrome/Chromium found." | tee -a "$LOG"
  echo "Install: flatpak install --user flathub com.google.Chrome" | tee -a "$LOG"
  echo "   or:  npx playwright install chromium" | tee -a "$LOG"
  exit 1
fi

echo "Launching CDP Chrome :$CDP_PORT via: $CHROME_CMD" | tee -a "$LOG"

# shellcheck disable=SC2086
$CHROME_CMD \
  --user-data-dir="$PROFILE" \
  --remote-debugging-port="$CDP_PORT" \
  --remote-debugging-address=127.0.0.1 \
  --remote-allow-origins=* \
  --no-first-run \
  --no-default-browser-check \
  --disable-default-apps \
  --disable-popup-blocking \
  --disable-sync \
  --disable-background-networking \
  --disable-client-side-phishing-detection \
  --disable-component-update \
  --disable-domain-reliability \
  --disable-features=NetworkPrediction,Translate \
  --disable-hang-monitor \
  --disk-cache-size=1048576 \
  --media-cache-size=0 \
  --window-size=1600,1100 \
  --new-window \
  https://talentlink-sf.design.webflow.com/ \
  https://webflow.com/dashboard/sites/talentlink-sf/custom-code \
  https://www.trydemigod.com/ \
  >>"$LOG" 2>&1 &

for i in {1..40}; do
  if curl -sf --max-time 1 "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
    echo "Fast CDP ready :$CDP_PORT"
    exit 0
  fi
  sleep 1
done
echo "CDP timeout, check $LOG"
tail -30 "$LOG" 2>/dev/null || true
exit 1
