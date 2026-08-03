#!/usr/bin/env bash
# Keep machine awake for Orca remote + Demigod agent swarm.
# Uses systemd-inhibit (blocks sleep/suspend/idle/shutdown/lid-close).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT/.keep-awake.pid"
LOG="$ROOT/keep-awake.log"

if [[ "${1:-}" == "stop" ]]; then
  if [[ -f "$PIDFILE" ]]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
    echo "keep-awake stopped"
  else
    echo "keep-awake not running"
  fi
  exit 0
fi

if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "keep-awake already running (pid $(cat "$PIDFILE"))"
  exit 0
fi

# GNOME / session: never auto-suspend or idle-lock while this laptop is an agent host
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing' 2>/dev/null || true
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing' 2>/dev/null || true
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0 2>/dev/null || true
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-timeout 0 2>/dev/null || true
gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null || true
gsettings set org.gnome.desktop.screensaver idle-activation-enabled false 2>/dev/null || true
gsettings set org.gnome.desktop.screensaver lock-enabled false 2>/dev/null || true
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

echo "Starting keep-awake — machine should not sleep while this runs."
echo "Stop with: $0 stop"

nohup systemd-inhibit \
  --what=idle:sleep:shutdown:handle-lid-switch \
  --who="demigod-orca-session" \
  --why="Orca remote + Demigod agent swarm; do not sleep" \
  --mode=block \
  sleep infinity >>"$LOG" 2>&1 &

echo $! >"$PIDFILE"
echo "keep-awake pid $(cat "$PIDFILE") — log: $LOG"
systemd-inhibit --list 2>/dev/null | grep -i demigod || true
