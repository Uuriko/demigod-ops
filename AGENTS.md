# ∴ EAT THE SOUNDS ∴ — Cursor Agent Rules

**Workspace:** `/home/potter` (canonical game source — no eat-the-sounds/ sync drift)  
**Project:** Vanilla HTML canvas game for [@ninjawhee](https://x.com/ninjawhee). No bundler, no React, no new npm deps.

**Live:** http://localhost:8765/ninjawhee-eat-the-sounds.html?v=cohesion3  
**Verify:** `npm run verify:all` from `/home/potter` (CDP `http://127.0.0.1:9223`)  
**GitHub:** https://github.com/Uuriko/eat-the-sounds (mirror in `eat-the-sounds/`)  
**Design truth:** `GAME-DESIGN-DOC.md`, `STORE-TILE-LAYOUT-PLAN.md`, `HEAVY-CURSOR-GAME-FEEDBACK.md`

## Soul-first constraints

- Preserve non-performative joy — cozy failure, whole-album listening, mirror/wings metaphor.
- Small scope only: one file per task, then verify.
- Never add a bundler, framework, or multiplayer.
- Code is truth: if design markdown conflicts with JS constants, JS wins.

## Architecture map

| File | Owns |
|------|------|
| `ninjawhee-eat-the-sounds.html` | Dialogue forests, rhythm engine, boot flow |
| `overworld.js` | DCSS snap movement, pads, NPCs, vinyl interact |
| `vinyl-echo-bridge.js` | Echo seeds, ghost slices, rhythm chart flavor |
| `vinyl-audio.js` | Procedural jazz previews (28s cap) |
| `store-ambient.js` | Store jazz — must stop when vinyl spins |
| `game-progress.js` | localStorage album %, tiers, inventory |
| `pause-journal.js` | Esc journal + quest entries |
| `pixel-gfx.js` / `heavy-dialogue-art.js` | Pixel art + Sarah portrait |

## Workflow (manual only — automation paused)

**Do not** auto-spawn cloud agents or `continuous-improve-loop.mjs` unless the user asks.

1. **Local Agent (preferred)** — edit files in `/home/potter`, one file per task.
2. **Cloud Agents (manual)** — repo `Uuriko/eat-the-sounds` only, not `crispy-garbanzo`.
3. After edits: `npm run verify:all` and bump `?v=` cache in HTML script tags.
4. Playtest MCP: chrome-devtools @ `:9223` — **close game tabs when done**.
5. **Visual truth:** always run `npm run demigod:capture:audit` + `npm run demigod:visual:pass` before/after Demigod edits; read screenshots in `audit-shots/` — do not ship on JSON alone.
5. Sync mirror: `node -e` or loop `sync` copies key files to `eat-the-sounds/` before git push.

## Audio exclusivity

Store ambient OR vinyl preview — never both loud. `syncAmbientAudio()` + `StoreAmbient.stopForMusic(0)` on spin.

## MCP

**chrome-devtools** only — `--browserUrl=http://127.0.0.1:9223`

## P0 backlog

1. Echo onboarding toast chain before Sarah gate  
2. Album % consequence in mirror choice UI  
3. Gold pad markers on vinyl pads  
4. Mirror choice Sarah tint + particles  
5. First-vinyl ghost slice + smile toast  
6. Bird → echo orb + Sarah line  
7. Album breakdown always on end screen