---
name: demigod-gates
description: Run Demigod verification gates after site/code changes. Use when editing demigod-foot-core, ship prep, blog, map, or when user says verify, gate, or check demigod.
disable-model-invocation: false
---

# Demigod gates

Always set worktree root first:

```bash
export DEMIGOD_ROOT="${DEMIGOD_ROOT:-$(pwd)}"
# Prefer Orca worktree, never silent /home/potter foot
cd "$DEMIGOD_ROOT"
```

## Smallest gate ladder (pick the lowest that covers the change)

1. **Blog only**  
   `node demigod-blog-quality.mjs && node demigod-blog-sync.mjs --check`

2. **Foot / CSS / product pages**  
   `npm run demigod:verify:source`  
   `node demigod-foot-smoke.mjs`  
   `node demigod-verify-board-honesty.mjs`

3. **Release identity / live lag**  
   `bin/dg truth` (or `--no-cache` after foot edits)

4. **Full site surface**  
   `node demigod-site-health.mjs`  
   `node demigod-live-honesty-audit.mjs`  
   `node demigod-route-mime.mjs`

5. **Ship readiness (no publish)**  
   `node demigod-ship.mjs prepare`

## Hard rules

- **Publish** only when the current user message explicitly authorizes it (`publish`, `ship to webflow`, etc.). Prepare alone is not publish.
- Foot lock: if held by a **dead** PID → `node demigod-foot-lock.mjs release --force`. Do not steal a live owner.
- Board must stay honest: sample seeds only; real=0 until real receipts.
- Never invent pilot warmth, hire counts, or SLA claims.

## Report format

Paste gate command + exit + last ~15 lines. State disk foot version vs live from `bin/dg truth`.
