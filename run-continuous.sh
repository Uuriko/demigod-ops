#!/usr/bin/env bash
# Master launcher: keep machine awake + run improvement loop.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

chmod +x "$ROOT/keep-awake.sh" 2>/dev/null || true

pause_all() {
  pause_cursor
  node -e "
    const fs=require('fs');
    const p='$ROOT/LOOP-STATE.json';
    let s={};
    try { s=JSON.parse(fs.readFileSync(p,'utf8')); } catch(_){}
    s.automationPaused=true;
    s.automationPausedAt=new Date().toISOString();
    s.automationPausedReason='User requested full pause';
    s.phase='paused';
    s.pendingHeavy=false;
    s.pendingCursor=false;
    fs.writeFileSync(p, JSON.stringify(s,null,2));
  "
  "$ROOT/keep-awake.sh" stop 2>/dev/null || true
  if [[ -f "$ROOT/.continuous-loop.pid" ]]; then
    kill "$(cat "$ROOT/.continuous-loop.pid")" 2>/dev/null || true
    rm -f "$ROOT/.continuous-loop.pid"
    echo "continuous loop stopped"
  fi
  echo "All automation paused (loop, cursor, keep-awake). Game server :8765 unchanged."
}

resume_all() {
  node -e "
    const fs=require('fs');
    const p='$ROOT/LOOP-STATE.json';
    let s={};
    try { s=JSON.parse(fs.readFileSync(p,'utf8')); } catch(_){}
    s.automationPaused=false;
    s.automationResumedAt=new Date().toISOString();
    s.phase='idle';
    fs.writeFileSync(p, JSON.stringify(s,null,2));
  "
  echo "Automation unpaused. Start loop with: $0 start"
  echo "Cursor still paused until: $0 resume-cursor"
}

pause_cursor() {
  node -e "
    const fs=require('fs');
    const p='$ROOT/LOOP-STATE.json';
    let s={};
    try { s=JSON.parse(fs.readFileSync(p,'utf8')); } catch(_){}
    s.cursorPaused=true;
    s.cursorPausedAt=new Date().toISOString();
    s.cursorPausedReason='User requested pause';
    s.pendingCursor=false;
    fs.writeFileSync(p, JSON.stringify(s,null,2));
  "
  if [[ -f "$ROOT/.cursor-watchdog.pid" ]]; then
    kill "$(cat "$ROOT/.cursor-watchdog.pid")" 2>/dev/null || true
    rm -f "$ROOT/.cursor-watchdog.pid"
    echo "cursor watchdog stopped"
  fi
  echo "Cursor dispatch paused (playtest + audio audit + sync continue)"
}

resume_cursor() {
  node -e "
    const fs=require('fs');
    const p='$ROOT/LOOP-STATE.json';
    let s={};
    try { s=JSON.parse(fs.readFileSync(p,'utf8')); } catch(_){}
    s.cursorPaused=false;
    s.cursorResumedAt=new Date().toISOString();
    fs.writeFileSync(p, JSON.stringify(s,null,2));
  "
  if [[ -f "$ROOT/.cursor-watchdog.pid" ]] && kill -0 "$(cat "$ROOT/.cursor-watchdog.pid")" 2>/dev/null; then
    echo "cursor watchdog already running"
  else
    echo "Starting Cursor crash watchdog (every 90s)…"
    nohup node "$ROOT/cursor-crash-watchdog.mjs" >>"$ROOT/cursor-watchdog.log" 2>&1 &
    echo $! >"$ROOT/.cursor-watchdog.pid"
    echo "cursor watchdog pid $(cat "$ROOT/.cursor-watchdog.pid")"
  fi
  echo "Cursor dispatch resumed"
}

case "${1:-start}" in
  pause-all)
    pause_all
    ;;
  resume-all)
    resume_all
    ;;
  pause-cursor)
    pause_cursor
    ;;
  resume-cursor)
    resume_cursor
    ;;
  stop)
    "$ROOT/keep-awake.sh" stop
    if [[ -f "$ROOT/.continuous-loop.pid" ]]; then
      kill "$(cat "$ROOT/.continuous-loop.pid")" 2>/dev/null || true
      rm -f "$ROOT/.continuous-loop.pid"
    fi
    if [[ -f "$ROOT/.cursor-watchdog.pid" ]]; then
      kill "$(cat "$ROOT/.cursor-watchdog.pid")" 2>/dev/null || true
      rm -f "$ROOT/.cursor-watchdog.pid"
    fi
    echo "continuous loop stopped"
    ;;
  once)
    "$ROOT/keep-awake.sh"
    node "$ROOT/continuous-improve-loop.mjs" --once
    ;;
  status)
    echo "=== keep-awake ==="
    [[ -f "$ROOT/.keep-awake.pid" ]] && kill -0 "$(cat "$ROOT/.keep-awake.pid")" 2>/dev/null && echo "running pid $(cat "$ROOT/.keep-awake.pid")" || echo "stopped"
    echo "=== loop ==="
    [[ -f "$ROOT/.continuous-loop.pid" ]] && kill -0 "$(cat "$ROOT/.continuous-loop.pid")" 2>/dev/null && echo "running pid $(cat "$ROOT/.continuous-loop.pid")" || echo "stopped"
    echo "=== cursor watchdog ==="
    [[ -f "$ROOT/.cursor-watchdog.pid" ]] && kill -0 "$(cat "$ROOT/.cursor-watchdog.pid")" 2>/dev/null && echo "running pid $(cat "$ROOT/.cursor-watchdog.pid")" || echo "stopped"
    echo "=== automation ==="
    node -e "try{const s=JSON.parse(require('fs').readFileSync('$ROOT/LOOP-STATE.json','utf8'));console.log('automation:',s.automationPaused?'paused':'active','| cursor:',s.cursorPaused?'paused':'active')}catch(_){console.log('unknown')}"
    echo "=== loop state ==="
    cat "$ROOT/LOOP-STATE.json" 2>/dev/null || echo "(no state yet)"
    tail -n 8 "$ROOT/continuous-loop.log" 2>/dev/null || true
    ;;
  start|*)
    # Ensure game server
    if ! curl -sf -o /dev/null --max-time 3 http://127.0.0.1:8765/; then
      echo "Starting HTTP server on 8765…"
      nohup python3 -m http.server 8765 --directory "$ROOT" >>"$ROOT/http-server.log" 2>&1 &
      echo $! >"$ROOT/.http-server.pid"
      sleep 1
    fi

    "$ROOT/keep-awake.sh"

    AUTO_PAUSED=no
    if [[ -f "$ROOT/LOOP-STATE.json" ]]; then
      AUTO_PAUSED=$(node -e "try{process.stdout.write(JSON.parse(require('fs').readFileSync('$ROOT/LOOP-STATE.json','utf8')).automationPaused?'yes':'no')}catch(_){process.stdout.write('no')}")
    fi
    if [[ "$AUTO_PAUSED" == "yes" ]]; then
      echo "Automation paused — not starting loop (run: $0 resume-all && $0 start)"
    elif [[ -f "$ROOT/.continuous-loop.pid" ]] && kill -0 "$(cat "$ROOT/.continuous-loop.pid")" 2>/dev/null; then
      echo "continuous loop already running (pid $(cat "$ROOT/.continuous-loop.pid"))"
    else
      echo "Starting continuous improve loop (daemon)…"
      echo "  log: $ROOT/continuous-loop.log"
      echo "  state: $ROOT/LOOP-STATE.json"
      echo "  stop: $0 stop"
      nohup node "$ROOT/continuous-improve-loop.mjs" >>"$ROOT/continuous-loop.log" 2>&1 &
      echo $! >"$ROOT/.continuous-loop.pid"
      echo "loop pid $(cat "$ROOT/.continuous-loop.pid")"
    fi

    CURSOR_PAUSED=false
    if [[ -f "$ROOT/LOOP-STATE.json" ]]; then
      CURSOR_PAUSED=$(node -e "try{process.stdout.write(JSON.parse(require('fs').readFileSync('$ROOT/LOOP-STATE.json','utf8')).cursorPaused?'yes':'no')}catch(_){process.stdout.write('no')}")
    fi
    if [[ "$CURSOR_PAUSED" == "yes" ]]; then
      echo "Cursor dispatch paused — skipping watchdog (run: $0 resume-cursor)"
    elif [[ -f "$ROOT/.cursor-watchdog.pid" ]] && kill -0 "$(cat "$ROOT/.cursor-watchdog.pid")" 2>/dev/null; then
      echo "cursor watchdog already running (pid $(cat "$ROOT/.cursor-watchdog.pid"))"
    else
      echo "Starting Cursor crash watchdog (every 90s)…"
      nohup node "$ROOT/cursor-crash-watchdog.mjs" >>"$ROOT/cursor-watchdog.log" 2>&1 &
      echo $! >"$ROOT/.cursor-watchdog.pid"
      echo "cursor watchdog pid $(cat "$ROOT/.cursor-watchdog.pid")"
    fi
    ;;
esac