#!/usr/bin/env bash
# Agent dev environment — health, startup for Grok Build + Demigod (game paused).
set -euo pipefail
NODE_BIN="${HOME}/.nvm/versions/node/v24.17.0/bin"
BUN_BIN="${HOME}/.bun/bin"
export PATH="${NODE_BIN}:${BUN_BIN}:/usr/bin:${HOME}/.local/bin:/usr/local/bin:/bin"
unset PYENV_ROOT PYENV_SHELL PYENV_VERSION

ROOT="${HOME}"
CDP_PORT="${CDP_PORT:-9223}"
DEMIGOD_LIVE="${DEMIGOD_LIVE:-https://www.trydemigod.com}"
GAME_PORT="${GAME_PORT:-8765}"
CLI="orca-ide"

usage() {
  cat <<EOF
agent-dev.sh — one place for agent environment on this PC

  status          Full health dashboard (ports, agents, disk, Demigod verify)
  selftest        Check CDP tab counting against non-page targets
  ready           Morning ritual: CDP + cleanup + verify-live + workspace + DESK.json
  ship [verb]     Canonical ship path (defaults to read-only prepare)
  audit           Full laptop + Demigod audit → DEMIGOD-LAPTOP-AUDIT.json
  up              Start missing services: Chrome CDP (Demigod default)
  up --orca       Also ensure Orca desktop + tab workspace
  chrome          Launch Chrome CDP (Grok + Webflow + Demigod tabs)
  workspace       Open Demigod tabs (designer, live, Grok, forms)
  tabs-cleanup    Close duplicate/stale CDP tabs
  verify-demigod  npm run demigod:verify:all (needs CDP)
  archive         Move stale DEMIGOD-/HEAVY-/CURSOR- artifacts to ~/archive/agent-runs/
  path            Print agent PATH (node + bun + system bins)
  linux|laptop    dg-linux-config (status|setup-all|sysctl)
  cockpit-tmux    dg-tmux-cockpit
  game            [PAUSED] game HTTP server
  verify-game     [PAUSED] game verify

Examples:
  ~/agent-dev.sh ready          # start of day
  ~/agent-dev.sh ship           # before Webflow publish
  ~/agent-dev.sh audit
  bin/dg orca up
EOF
}

port_up() { ss -tln 2>/dev/null | grep -q ":$1 "; }

cdp_page_count() {
  node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{console.log(JSON.parse(d).filter(x=>x?.type==="page").length)}catch{console.log(0)}})'
}

tabs_selftest() {
  local got
  got="$(printf '%s' '[{"type":"page"},{"type":"iframe"},{"type":"service_worker"},{"type":"page"}]' | cdp_page_count)"
  [[ "$got" == 2 ]] || { echo "agent-dev tab-count selftest FAIL: got $got, want 2" >&2; return 1; }
  echo "agent-dev tab-count selftest PASS"
}

status() {
  local lan
  lan="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  echo "=== Agent dev status ==="
  echo "Host:   $(hostname) · $(lsb_release -ds 2>/dev/null || uname -sr)"
  echo "LAN:    ${lan:-unknown}"
  echo "Disk:   $(df -h / | awk 'NR==2{print $3"/"$2" ("$5")"}')"
  echo "RAM:    $(free -h | awk '/^Mem:/{print $3"/"$2" avail "$7}')"
  echo ""
  echo "== Binaries =="
  for b in grok orca-ide cursor-agent gh node python3 claude; do
    if command -v "$b" >/dev/null 2>&1; then
      ver="$("$b" --version 2>/dev/null | head -1 || true)"
      echo "  ok  $b  ${ver}"
    else
      echo "  --  $b"
    fi
  done
  [[ -x "${HOME}/orca-linux.AppImage" ]] && echo "  ok  orca AppImage  $(cat "${HOME}/.orca/orca-version.txt" 2>/dev/null || echo unknown)"
  echo ""
  echo "== Services =="
  port_up "$CDP_PORT" && echo "  ok  Chrome CDP     :$CDP_PORT" || echo "  off Chrome CDP     :$CDP_PORT"
  port_up "$GAME_PORT" && echo "  --  Game server    :$GAME_PORT (paused project)" || echo "  off Game server    :$GAME_PORT (paused — not needed)"
  port_up 6768 && echo "  ok  Orca mobile    :6768" || echo "  off Orca           :6768"
  if "$CLI" status --json 2>/dev/null | grep -q '"reachable": true'; then
    echo "  ok  Orca runtime   reachable"
  else
    echo "  off Orca runtime   not reachable"
  fi
  echo ""
  echo "== Git ($(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || echo '?')) =="
  echo "  dirty files: $(git -C "$ROOT" status --short 2>/dev/null | wc -l)"
  local artifacts=0
  for _p in DEMIGOD HEAVY CURSOR; do
    artifacts=$((artifacts + $(find "$ROOT" -maxdepth 1 -type f -name "${_p}-*" 2>/dev/null | wc -l)))
  done
  echo "  root artifacts: ${artifacts} DEMIGOD/HEAVY/CURSOR files"
  echo ""
  echo "== Demigod =="
  if [[ -f "${ROOT}/DEMIGOD-VERIFY-LIVE.json" ]]; then
    node -e "const j=require('${ROOT}/DEMIGOD-VERIFY-LIVE.json');console.log('  verify:live',j.pass?'PASS':'FAIL','· forms',j.htmlScan?.formsOk??'?')" 2>/dev/null \
      || echo "  verify:live  (run npm run demigod:verify:live)"
  else
    echo "  verify:live  (not run yet)"
  fi
  if [[ -f "${ROOT}/demigod-foot-core.js" ]]; then
    local ver
    ver="$(grep -o 'dg-foot-v[0-9]*-core' "${ROOT}/demigod-foot-core.js" 2>/dev/null | head -1 || echo unknown)"
    echo "  foot-core    $ver"
  fi
  if command -v claude >/dev/null 2>&1; then
    local cver
    cver="$(claude --version 2>/dev/null | head -1 || echo 'installed')"
    echo "  claude-code  $cver  (CLI at ~/.local/bin/claude; run 'claude auth login' to auth)"
  else
    echo "  claude-code  (run the installer from https://claude.ai/code )"
  fi
  local tabs=0
  if port_up "$CDP_PORT"; then
    tabs="$(curl -sf "http://127.0.0.1:${CDP_PORT}/json/list" 2>/dev/null | cdp_page_count 2>/dev/null)" || tabs=0
  fi
  echo "  chrome tabs  ${tabs} (cleanup if >10: ~/agent-dev.sh tabs-cleanup)"
  echo ""
  echo "== Quick URLs =="
  echo "  Demigod: $DEMIGOD_LIVE"
  echo "  CDP:     http://127.0.0.1:$CDP_PORT"
}

chrome() {
  if port_up "$CDP_PORT"; then
    echo "Chrome CDP already on :$CDP_PORT"
    return 0
  fi
  chmod +x "${HOME}/launch-chrome-automation.sh" 2>/dev/null || true
  "${HOME}/launch-chrome-automation.sh"
}

game() {
  if port_up "$GAME_PORT"; then
    echo "Game server already on :$GAME_PORT"
    return 0
  fi
  echo "Starting game server on :$GAME_PORT ..."
  cd "$ROOT"
  nohup python3 -m http.server "$GAME_PORT" >/tmp/game-server.log 2>&1 &
  for _ in $(seq 1 10); do port_up "$GAME_PORT" && break; sleep 1; done
  port_up "$GAME_PORT" || { echo "Game server failed. See /tmp/game-server.log" >&2; exit 1; }
  echo "Game: http://localhost:${GAME_PORT}/ (paused project)"
}

orca_up() {
  "${ROOT}/bin/dg" orca up
}

workspace() {
  cd "$ROOT" && npm run demigod:workspace
}

tabs_cleanup() {
  cd "$ROOT" && npm run demigod:cleanup:tabs
}

audit() {
  cd "$ROOT" && node demigod-laptop-audit.mjs && "${ROOT}/bin/dg" home --json
}

up() {
  local want_orca=false
  [[ "${1:-}" == "--orca" ]] && want_orca=true
  chrome
  if $want_orca; then
    orca_up
    workspace || true
  fi
  echo ""
  status
}

archive() {
  local dest="${HOME}/archive/agent-runs/$(date +%Y-%m)"
  mkdir -p "$dest"
  local moved=0
  for pat in DEMIGOD HEAVY CURSOR; do
    for f in "${HOME}/${pat}-"*; do
      [[ -e "$f" ]] || continue
      case "$(basename "$f")" in
        DEMIGOD-AGENTS.md|DEMIGOD-WORKFLOW.md) continue ;;
      esac
      [[ "$f" == *.md ]] && continue
      mv "$f" "$dest/" && moved=$((moved + 1))
    done
  done
  echo "Archived $moved files → $dest"
}

artifact_count() {
  local n=0
  for pat in DEMIGOD HEAVY CURSOR; do
    for f in "${HOME}/${pat}-"*; do
      [[ -e "$f" && "$f" != *.md ]] && n=$((n + 1))
    done
  done
  echo "$n"
}

write_desk() {
  cd "$ROOT" && node demigod-write-desk.mjs
}

ready() {
  echo "== Demigod ready =="
  # laptop stack: power + dash units
  if [[ -x "${HOME}/bin/dg-linux-config" ]]; then
    [[ -x "${HOME}/.local/bin/power-ac-auto-profile" ]] && "${HOME}/.local/bin/power-ac-auto-profile" --once 2>/dev/null || true
    systemctl --user start demigod-dash.service 2>/dev/null || "${HOME}/bin/dg-dash" 2>/dev/null || true
  fi
  chrome
  tabs_cleanup || true
  local arts
  arts="$(artifact_count)"
  if [[ "$arts" -gt 2 ]]; then
    archive
  fi
  cd "$ROOT" && npm run demigod:verify:live
  workspace || true
  write_desk
  # tmux cockpit if available (non-blocking)
  if command -v dg-tmux-cockpit >/dev/null 2>&1; then
    dg-tmux-cockpit status >/dev/null 2>&1 || dg-tmux-cockpit new >/dev/null 2>&1 || true
    echo "  tmux        session dg (dg-tmux-cockpit)"
  fi
  date -Iseconds > "${HOME}/.demigod-ready"
  echo "  session stamp → ~/.demigod-ready"
  echo "  dash        http://127.0.0.1:9878/"
  echo ""
  status
  command -v dg-notify >/dev/null 2>&1 && dg-notify "Ready" "CDP + dash session up" || true
}

ship() {
  cd "$ROOT"
  if (($#)); then exec bin/dg ship "$@"; fi
  exec bin/dg ship prepare
}

clean_path() {
  printf '%s\n' "${NODE_BIN}:${BUN_BIN}:/usr/bin:${HOME}/.local/bin:/usr/local/bin:/bin:/usr/sbin:/sbin"
}

case "${1:-}" in
  status) status ;;
  selftest) tabs_selftest ;;
  ready) ready ;;
  ship) shift; ship "$@" ;;
  audit) audit ;;
  up) shift; up "${1:-}" ;;
  chrome) chrome ;;
  workspace) workspace ;;
  tabs-cleanup) tabs_cleanup ;;
  game) game ;;
  verify-game) echo "Game verify paused — reopen game in AGENTS.md first" >&2; exit 1 ;;
  verify-demigod) cd "$ROOT" && npm run demigod:verify:all ;;
  archive) archive ;;
  path) clean_path ;;
  linux|laptop) shift; exec "${HOME}/bin/dg-linux-config" "${@:-status}" ;;
  cockpit-tmux) exec dg-tmux-cockpit "${2:-attach}" ;;
  -h|--help|help|"") usage ;;
  *) echo "Unknown: $1" >&2; usage; exit 1 ;;
esac
