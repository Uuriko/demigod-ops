# Agent tooling for Grok — 2026-07-13

## Session start (always)
```bash
bin/dg-start                 # brief + ship-status + lock
# or
npm run demigod:start
cat /tmp/dg-busy/AGENT-BRIEF.md
```

## Foot lock
```bash
DG_LOCK_OWNER=grok node demigod-foot-lock.mjs claim --why 'v184 polish'
# edit demigod-foot-core.js
node demigod-foot-lock.mjs release --owner grok
# or wrap:
DG_LOCK_OWNER=grok bin/dg-lock node --check demigod-foot-core.js
```

Files: `/tmp/dg-busy/foot-lock.json` + `foot-lock.txt` (dashboard reads these).

## Ship state
```bash
node demigod-ship-status.mjs
node demigod-ship-status.mjs --strict   # exit 1 if not live==disk
# snapshot: /tmp/dg-busy/ship-status.json
```

Stages: disk_ok → disk_syntax → footer_lite_points_cdn → manifest_matches_disk → live_reachable → live_matches_manifest → live_matches_disk_ver

## Dashboard
http://127.0.0.1:9878/  
`/api/agent-brief` · `/api/actions` · `/api/status`

## Fable
`bin/df` now injects AGENT-BRIEF + ship-status into the prompt when available.
