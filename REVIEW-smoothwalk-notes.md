# Review: Smooth Walk + Passerby Pass

**Verdict:** Ship after verification.

## Changes
- Sub-tile eased movement (smoothstep) for player + all NPCs (~310–430ms/step)
- BFS pathfinding on floor tiles only — no walking through shelves (`S`) or counter (`C`)
- Mutuals idle 5–15s before wandering; passersby linger 16–40s + optional browse
- 8 passerby poetic dialogues; ~34% get hint variants (no owner/name mentions)
- NPC ticks + motion update every frame (not every 2 frames)

## Fixes
- Player movement blocked during active step (no input stacking jerk)
- Camera follows `player.posX` for smooth scroll
- Path abort returns NPC to idle instead of stuck walk state