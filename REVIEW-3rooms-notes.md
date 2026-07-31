# Code Review: Overworld 3-Room Expansion

**Scope:** `overworld.js`, `pixel-gfx.js`, `ninjawhee-eat-the-sounds.html`  
**Verdict:** POLISH → fixes applied for ship-blocking passerby/timer desync and player overlap.

## Fixes applied post-review

- Pause `tickNPCs` while `dialogue-active` (passerby leave timer no longer races dialogue)
- Block NPC steps onto player tile in `stepNpcToward`
- Sarah stays at register until first talk (`talked.has('ninjawhee_return')`)
- Wander stuck-loop timeout clears target after 1.2s blocked
- `counter_knock` secret ignores Sarah occupancy

## Remaining polish (non-blocking)

- Mirror vinyl shelf tile is floor overlay only
- Dead exports in `pixel-gfx.js` (`drawStoreGuidePanel`, etc.)
- Optional camera smoothing at room boundaries