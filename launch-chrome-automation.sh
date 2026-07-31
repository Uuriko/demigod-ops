#!/usr/bin/env bash
set -euo pipefail
CDP_PORT="${CDP_PORT:-9223}"
PROFILE="${HOME}/.grok/chrome-automation"
LOG="/tmp/chrome-automation.log"
mkdir -p "$PROFILE"

pkill -f "remote-debugging-port=${CDP_PORT}" 2>/dev/null || true
sleep 0.5

CHROME_CMD=""
if command -v google-chrome-stable >/dev/null; then CHROME_CMD=google-chrome-stable
elif command -v google-chrome >/dev/null; then CHROME_CMD=google-chrome
elif flatpak list 2>/dev/null | grep -q com.google.Chrome; then CHROME_CMD="flatpak run com.google.Chrome"
else echo "No Chrome"; exit 1; fi

echo "Launching fast automation Chrome :$CDP_PORT" | tee -a "$LOG"

# Speed & automation focused flags (minimal UI overhead, stable CDP)
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

for i in {1..30}; do
  if curl -sf --max-time 1 "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
    echo "Fast CDP ready :$CDP_PORT"
    exit 0
  fi
  sleep 1
done
echo "CDP timeout, check $LOG"
exit 1
