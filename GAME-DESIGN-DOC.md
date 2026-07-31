# ∴ EAT THE SOUNDS ∴ — Game Design Document

**Version:** Code-truth snapshot · 2026-06-20  
**Primary deliverable:** `ninjawhee-eat-the-sounds.html` + 11 JS modules  
**North star (from `HEAVY-GAME-DESIGN-PASS.md`):** Every listen is a mirror — what wings do we grow together?

**How this doc was built:** Every line of the game was bundled (`GAME-CODE-COMPLETE-BUNDLE.txt` — 12,924 lines, 18 files) and sent to SuperGrok Heavy via structured digest + manifest. Heavy delivered the canonical 14-section pass in `GAME-DESIGN-DOC-HEAVY.md`. This file is the **expanded code-truth edition**: same structure, exhaustive `file:function` citations from the full bundle. Supporting artifacts: `GAME-CODE-MANIFEST.md`, `GAME-CODE-DESIGN-DIGEST.md`, `STORE-TILE-LAYOUT-PLAN.md`.

---

## 1. Vision & emotional thesis

∴ EAT THE SOUNDS ∴ is a browser-native hybrid: Undertale-style pixel dialogue, a DCSS-inspired jazz record store overworld, and a four-lane rhythm feast where listening becomes eating. The game is authored in the voice of Sarah Lin (@ninjawhee): late-night vinyl, whole albums, non-performative joy, and metamorphosis through shared sound.

The emotional contract is stated in code before gameplay begins. `QUOTES` in `ninjawhee-eat-the-sounds.html` anchors the thesis:

> *"when i was working at a jazz records store, favorite thing to do was to listen to entire albums and eat the sounds as you would a pizza"*

> *"in the groove we become pizza · in the mirror we become wings"*

Three metaphors braid the experience:

1. **Pizza** — rhythm hits are slices; combo and score are appetite, not performance anxiety.
2. **Album** — exploration (vinyl + NPCs), rhythm mastery, and wins compose a persistent "album %" (`game-progress.js`).
3. **Mirror** — the win-state asks what sound you keep; aftermath tiers tint the store you return to.

The game refuses skip-button energy. Store previews cap at 15 seconds per spin (`vinyl-audio.js` `STORE_PREVIEW_SEC`), but copy and systems constantly push whole-side listening. Patience is a mechanic, not a lecture.

SuperGrok Heavy's design pass (`HEAVY-GAME-DESIGN-PASS.md`) identifies the arc's strength: vinyl preview ↔ echo ↔ rhythm is tightly coupled (5/5 cohesion). The sag is visibility — players need clearer echo-to-rhythm payoff, which the code now addresses via ghost slices, echo orbs, and HUD copy in `vinyl-echo-bridge.js`.

---

## 2. Player fantasy & tone

**Fantasy:** You are a late-night visitor in a three-room jazz store modeled on Hear Records (Burlington Square). You befriend three mutuals (Orph, Simon, Honey), spin three vinyl spines (moon, shelter, mirror), collect echoes that seed a rhythm chart, then stand at Sarah's register to "drop the needle" and eat fifteen slices toward a mirror choice. Win or lose, you walk back into a store that remembers.

**Tone:** Warm, lowercase, elliptical. Poetic without purple prose. Humor is gentle (Simon's breadcrumbs, Honey's "3–7 business days to process rizz"). Failure is cozy — static tier copy says *"we still ate some sounds together"* (`endSong()` weak-run sting), not punitive.

**Palette (CSS `:root` + `pixel-gfx.js` `PAL`):**

| Token | Hex | Role |
|-------|-----|------|
| ink | `#0a0812` | Night store void |
| moon | `#e8e0f0` | Body text |
| gold | `#c9a84c` | Moon vinyl, UI chrome |
| rose | `#c45c7a` | Honey, tasty tier |
| teal | `#4a8f7a` | Simon, shelter, groove |
| purple | `#7b5ea7` | Orph, mirror, secrets |

**Typography:** Cormorant Garamond (poetry), Press Start 2P (pixel UI), Space Mono (stats). Hieroglyphs `∴𓅰𓅬` appear as watermark, combo birds, and secret toasts.

**Audience paths:**

| Player | Code-supported journey |
|--------|------------------------|
| First-time curious | Intro dialogue → overworld tutorial hints → first vinyl ghost slice → Sarah gate |
| Returning | `returning_visitor` intro branch, persisted album %, unlock tiers, secret vault |
| Perfectionist | Groove mode, echo-rich chart boosts, wings tier, mirror choice consequence on Sarah sprite |

---

## 3. Core loop

```
Boot intro (dialogue) → Overworld explore → Mutual talk + find quests + vinyl previews
    → Echo orbs accumulate (VinylEchoBridge) → Sarah register ready
    → Return dialogue → Rhythm feast (15 slices) → Mirror choice → Aftermath store return
    → Replay / secrets / album completion
```

**Session loop detail:**

1. **Listen** — Stand on gold glow pad, press Z to spin vinyl (`overworld.js` `playVinyl`). Preview plays procedurally composed jazz (`vinyl-audio.js` `ALBUMS`). Walking stops playback (`stopVinyl` → preview hush).
2. **Collect** — First preview per vinyl adds echo seed (+25 resonance). NPC talk adds bonus resonance (`NPC_BONUS`: orph 8, simon 6, honey 10). Bird guide +12.
3. **Discover** — Examine spots increment mutual find counts (storm/breadcrumb/heartbeat ×3 each). Items drop from examines (`store-items.js`).
4. **Gate** — Talk to orph, simon, honey → `mutualsComplete()` → Sarah counter glows → `onReturnReady` opens return dialogue tree.
5. **Eat** — Rhythm mode: D/F/J/K lanes, 15 goal slices, chart sections echo store vinyl order.
6. **Choose** — Mirror prompt: keep groove vs pass it on. Persists in `GameProgress.lastRun.grooveChoice`.
7. **Return** — `enterAftermathStore()` reloads overworld with tier visuals (`AFTERMATH_STYLE`).

**Persistent loop:** `GameProgress` (localStorage `eat-the-sounds-v1`) tracks vinyl listens, NPC met, wins, best slices, secrets, inventory, find quest. `StorePause` journal (`eat-sounds-journal-v2`) logs discoveries.

---

## 4. Act-by-act design

### Act 1 — Intro (Undertale dialogue)

**Module:** `DIALOGUE_FORESTS.intro` in `ninjawhee-eat-the-sounds.html`  
**Entry:** `bootGame()` → `openBootIntro()` → pixel Sarah on `heavy-dialogue-art.js` canvas.

Sarah welcomes the player into "the jazz records store inside the screen." Branching covers:

- How to eat sounds (D/F/J/K lanes, CHEW holds)
- Mirror foreshadowing
- Mutual introductions (orph/simon/honey)
- Veteran shortcut (`returning_visitor` → 3 choices max)

**Exit token:** `send_explore` → `__explore__` → `startOverworld({ freshFinds: true })`.

**Design intent:** Warm setup before mechanics. HEAVY pass notes intro can feel "menu-like before sound eating" — mitigated by `browse_first` path that sends players to store quickly.

### Act 2 — Store exploration

**Module:** `overworld.js` (`JazzStoreOverworld`)

Three rooms × 22 columns × 13 rows. Player spawns (10,10) facing north. Movement is DCSS-style: arrow/WASD, diagonal Q/E/Z/C, period to wait. No held-key repeat (`handleKeyUp` empty).

**Primary verbs:**

| Key | Action |
|-----|--------|
| Arrows / WASD | Move (10 aut orthogonal, 14 diagonal) |
| Z / Enter / Space | Interact (priority: bird → NPC → vinyl → examine → secret) |
| X | Stop vinyl preview |
| Escape | Pause journal (`StorePause.toggle`) |

**Vinyl previews:** Each of three records maps to a lane color in `VinylEchoBridge.VINYL_META` (moon→D gold, shelter→F teal, mirror→J purple). First spin triggers:

- `playEchoTutorial` (4-beat lane ping)
- `triggerGhostTeaser` / `showGhostSlice` (rhythm bite preview overlay)
- Sarah smile toasts, bird encounter schedule, JAZZ poster sparkle (`posterSparkleUntil`)

**Mutual find quests:** Per NPC, examine 3 spots tagged `mutual: 'orph'|'simon'|'honey'`. Progress in `findCounts`, persisted via `GameProgress.setFindCounts`.

**Passerby system:** Visitors spawn at door (10,12), wander with A* pathing, 8 variants with optional vinyl hints. Can drop `visitor_card` item.

**Bird encounter:** After first vinyl spin, bird may perch on top shelf. Dialogue tree `DIALOGUE_FORESTS.bird` offers hum/moon/shelter/mirror/listen exits. Resolving calls `resolveBirdEncounter` → `bird_guide` secret, `bird_feather` item.

### Act 3 — Counter gate (Sarah)

Sarah (`ninjawhee_return`) is visible at register from start in current code (`hidden: false`), but rhythm gate requires `mutualsComplete()` — all three mutuals talked. Counter flash + toast: *"register glows.... sarah is ready"*.

Return dialogue (`DIALOGUE_FORESTS.return`) offers:

- `drop the needle ♫` → `__start__` rhythm
- Echo-aware lines (`return_vinyl_tease` references floor echoes)
- Chill mode toggle hooks (`GameProgress.toggleChill`)
- Album % lines (`return_album_pct`, `return_full_album`)

### Act 4 — Rhythm feast

**Module:** Inline rhythm engine in `ninjawhee-eat-the-sounds.html` + `rhythm-loop.js` + `heavy-runtime.js`

**Songs:**

| Idx | ID | BPM | Beats | Counts toward 15? |
|-----|-----|-----|-------|-------------------|
| 0 | ballad (side A) | 84 | 172 | Yes |
| 1 | uptown swing | 108 | 96 | No (encore) |
| 2 | midnight burner | 126 | 80 | No (encore) |

**Chart sections (side A):** needle drop tutorial → soliloquy w/ moon → shelter from storm → surface + orifice improv bridge → mirror at edge → vinyl hunger coda. Labels rewrite if echo seeds present (`getEchoChartSections`).

**Timing windows (`HeavyRuntime.classifyHit`):**

| Judgment | Label | Window |
|----------|-------|--------|
| perfect | SLICE! | ≤150ms |
| great | TASTY! | ≤280ms |
| good | NOM! | ≤450ms |

Chill mode widens via `CHILL_MULT` 1.45 and auto-NOM grace (`chillAutoMs`).

**Phases:**

- Slices 1–7: ballad sections, phase briefs on section change
- Slice 8+: improv bridge flash (`bridgeFlashUntil`), "you ate the bridge!"
- 15 slices: `markFeastComplete()` → encore songs cycle until player presses Z for mirror
- Groove mode: 3 early perfects in first 4 slices → `GROOVE_SCORE_MULT` 1.18

**Adaptive difficulty:** `computeDifficultyTier()` tracks accuracy/combo. Modes: steady, swing (extra notes), scramble (miss recovery filler). Live injection via `injectLivePressure`.

**Bonus pizza:** Spawns beats 34–40 on side A; DFJK easter egg unlocks pizza hints.

### Act 5 — Mirror & aftermath

**Mirror choice:** `openMirrorChoice()` — keep vs pass. `flashMirrorSarah` tints portrait warm (keep) or reflective (pass). Recorded in `GameProgress.recordRun({ grooveChoice })`.

**End screen:** `showRhythmEndScreen` uses `getEndVariant()` for title/subtitle based on mirror vinyl + unlock tier.

**Aftermath tiers (`getAftermathTier`):**

| Tier | Condition | Store feel |
|------|-----------|------------|
| static | !won | Cozy lamp glow, open door copy |
| tasty | won, default | Rose neon, still hungry |
| groove | perfects≥4 OR score≥1800 | Teal jazz poster glow |
| wings | perfects≥8 OR improv≥65 | Gold door, Sarah warm sprite if keep |

`enterAftermathStore()` spawns player (9,7), all mutuals talked, Sarah visible. `VinylEchoBridge.playMotif` on tiered return. `EasterEggs.onAftermathEnter('wings')` unlocks `wings_return`.

---

## 5. Systems bible

### 5.1 Movement (DCSS)

**Source:** `overworld.js` — documented in `STORE-TILE-LAYOUT-PLAN.md`

- **Aut costs:** `AUT_MOVE` 10, `AUT_DIAG` 14, `AUT_INTERACT`/`AUT_EXAMINE` 10
- **Energy model:** `worldAut` accumulates; entities act when energy ≥ `ENERGY_ACT` (10). Player speed 10, Sarah 7, bird 12.
- **Motion:** `snapMove` + `entityStepAnim` — tile snap, no free movement. Diagonal requires both adjacent cardinals walkable (`canDiagonalStep`).
- **Pathfinding:** `findPath` BFS for NPCs/passers/bird.
- **Camera:** Horizontal scroll `camTX`, 22-column view window.

Walkable tiles: `.` `R` `T` `P`. Blocked: `W` `S` `C`. Door `D` is NPC-only.

### 5.2 Dialogue

**Source:** `ninjawhee-eat-the-sounds.html` `DIALOGUE_FORESTS`, `heavy-dialogue-art.js`

Forests: `intro`, `return`, `passerby`, `aftermath`, `secrets`, `bird`, `orph`, `simon`, `honey`.

**Flow primitives:**

| Token | Behavior |
|-------|----------|
| `__explore__` | Close UI, start overworld |
| `__resume__` | Close UI, resume overworld |
| `__start__` | Begin rhythm countdown |
| `__album_pct__` | Inject `GameProgress.getAlbumBreakdown()` |
| `__run_stats__` | Inject last run stats |
| `__bird_leave_*__` | Resolve bird with method |

Undertale presentation: `drawDialogueFrame`, typewriter lines, choice list (↑↓), blips (`playUndertaleBlip` / `toneBlip`). Overworld talk uses compact `overworld-talk` CSS mode.

NPC revisit nodes key off last previewed vinyl (`revisit_moon`, etc.).

### 5.3 Vinyl audio

**Source:** `vinyl-audio.js`

Procedural multi-movement albums per id:

| ID | Title | Movements (sample) |
|----|-------|-------------------|
| moon | soliloquy w/ moon | moonrise over burlington, soliloquy (reprise), needle at closing time |
| shelter | shelter from the storm | rain on the glass, storm walk, shelter (reprise), dry coat by the door |
| mirror | mirror at the edge | edge of the world, reflection, no words needed, wings in the mirror |

Scheduler: `createJazzScheduler` with lookahead 2.8s, brush/ride/walk/comp/melody primitives. Room reverb via delay feedback bus.

Store preview: max 15s (`setMaxTime(t0 + STORE_PREVIEW_SEC)`), fade on stop.

### 5.4 Vinyl ↔ echo ↔ rhythm bridge

**Source:** `vinyl-echo-bridge.js`

- `recordPreview(id)` → seed + resonance + tutorial beats + ghost teaser
- `getSeed()` returns `{ resonance, seeds, vinyls, flavor, multi, nomBiasMs, color }`
- Echo orbs (vinyl seeds only) boost side A chart: `echoOrbRich` when >2 orbs → `echoScoreMult` up to ~1.4×
- Rhythm HUD: `drawRhythmEchoOrbs`, `drawRhythmGhosts` (pre-slice 4 hints)
- Overworld HUD: `drawOverworldHud` dual bars (ECHO → RHYTHM + ALBUM %)
- `trySarahHum` after 3 listens per vinyl per session

### 5.5 Rhythm

**Lanes (`LANES`):**

| Key | Label | Color | Role | Pitch |
|-----|-------|-------|------|-------|
| D | D | gold | bass | 220Hz |
| F | F | rose | horn | 261.63Hz |
| J | J | teal | keys | 329.63Hz |
| K | K | purple | ride | 392Hz |

**Note types:** `tap`, `hold` (CHEW — release on groove end). Notes carry `micro` quote fragments and hieroglyph glyphs.

**Scoring:** base 100 + combo×20, × echo multi × groove multi. Improv on empty keypress fills `improvMeter` (feeds wings tier).

**Backing:** `RhythmLoop` RAF-scheduled trio (ballad/swing/burner styles). `AudioBus` ducks rhythm during SFX hits.

**Feast → encore:** After 15 slices, uptown/burner cycle without adding goal slices. Player-initiated mirror via Z.

### 5.6 Progress & album %

**Source:** `game-progress.js`

```
explore (40%): vinyls heard + NPCs met / 6
rhythm (35%): bestSlices / 15 × 100, capped
mastery (25%): any win = 100, else 0
```

**Unlock tiers:** 0–4 at 0/25/50/75/100% album. `getSarahUnlockLine` and `getEndVariant` gate copy.

**Chill mode:** Persisted boolean; affects timing in rhythm (`CHILL_MULT`, grace auto-hits).

### 5.7 Inventory & items

**Source:** `store-items.js` — 12 items

| Item | Pickup source | Use hook |
|------|---------------|----------|
| storm_liner | storm_spine examine | storm_poster, neon_hum |
| chalk_stub | chalk_path | jazz_poster, map_note |
| map_scrap | map_note | read anywhere |
| demo_ribbon | demo_deck (55%) | listening_rug, demo_deck |
| rug_thread | listening_rug (40%) | hi_fi_plant |
| glass_splinter | mirror_scratch (45%) | mirror_scratch |
| neon_flyer | neon_hum (50%) | neon_hum |
| register_splinter | register_wear | register_wear (counter knock) |
| dust_vial | lamp_dust (35%) | flavor |
| bird_feather | bird_helped event | neon_hum |
| visitor_card | passerby hint (55%) | read tip |
| echo_ticket | first vinyl (35%) | echo lore |
| rain_corner | storm_poster (40%) | storm_spine |

Tools consume on use (`kind === 'tool'`). Inventory UI in `StorePause` pause overlay.

### 5.8 Easter eggs

**Source:** `easter-eggs.js` — persisted in `GameProgress.secrets`

| ID | Trigger |
|----|---------|
| dfjk | D→F→J→K in order (overworld, post-first-run, 700ms cooldown) |
| mirror_glyph | 7 taps on ∴𓅰 watermark |
| moon_window | Examine tile (19,1) |
| mirror_door | Face door tiles (10–11, 11–12) |
| counter_knock | Face register row (8–10, y=4) |
| vinyl_triple | Preview moon+shelter+mirror same session |
| combo_42 | Rhythm combo exactly 42 |
| score_2222 | Rhythm score ≥2222 once |
| wings_return | Enter aftermath at wings tier |
| bird_guide | Help bird out |

Unlocked quotes feed `getBonusMicroQuotes()` into rhythm note micro text.

### 5.9 Pixel art & rendering

**Source:** `pixel-gfx.js`, `heavy-dialogue-art.js`

- `setupPixelCtx` — disables smoothing for crisp tiles
- Store tiles: `drawWoodShelfTile`, `drawPixelVinylSpine`, `drawRegisterTile`, `drawDoorThreshold`, `drawPixelTurntable`, `drawPixelRug`
- Characters: `drawPixelCharacter`, `HeavyDialogueArt.drawPixelNinjawhee`, `drawNpcPortrait`
- Ambience: `drawLampAmbientWash`, `drawStoreVignette`, `drawScanlines` (0.028 alpha)
- Interact pads: gold floor markers via `drawInteractPads`
- Rhythm: `HeavyRuntime.drawAlignedPlayfield` — lane rects, timing bands, BITE line

---

## 6. Store map & pads

**Grid:** 66×13 (Room A: cols 0–21 entrance, B: 22–43 crates, C: 44–65 listening booth). Arches open rows 5–7 at x=21 and x=43.

**Player spawn:** (10, 10) on `.` floor, central aisle. North highway x=10 cleared through counter row (cols 7–9 only are `C`).

### Vinyl pads

| ID | Shelf (blocked) | Pad (stand here) | Face |
|----|-----------------|------------------|------|
| moon | (10, 1) | (10, 3) | north |
| shelter | (26, 2) | (26, 4) | north |
| mirror | (54, 1) | (54, 3) | north |

### NPC pads

| ID | Home | Talk pad |
|----|------|----------|
| orph | (7, 9) | (7, 10) |
| simon | (30, 6) | (30, 7) |
| honey | (50, 7) | (50, 8) |
| sarah | (10, 5) | (10, 7) |

### Examine pads (mutual finds)

| ID | Object | Pad | Mutual |
|----|--------|-----|--------|
| storm_spine | (6, 1) | (6, 3) | orph |
| storm_poster | (3, 9) | (3, 10) | orph |
| mirror_scratch | (17, 6) | (17, 7) | orph |
| jazz_poster | (28, 2) | (28, 3) | simon |
| chalk_path | (30, 9) | (30, 10) | simon |
| map_note | (35, 2) | (35, 3) | simon |
| demo_deck | (49, 3) | (49, 4) | honey |
| listening_rug | (47, 9) | (48, 9) | honey |
| hi_fi_plant | (51, 10) | (51, 11) | honey |
| neon_hum | (8, 11) | (8, 10) | — |
| register_wear | (10, 6) | (10, 7) | — |
| lamp_dust | (12, 2) | (12, 3) | — |

### Secret facing tiles

| Spot | Tile condition |
|------|----------------|
| moon_window | (19, 1) |
| mirror_door | (10–11, 11–12) |
| counter_knock | (8–10, 4) facing register |

**Interaction rule:** One pad per interactable. Priority: bird → NPC → vinyl → examine → secret. Adjacent pad (dist ≤1) also works; on-pad wins ties. Hint UI: *"Stand on glow · Z"* (`buildInteractHintUI`).

---

## 7. Content catalog

### 7.1 NPC voice summary

**Orph** (@orphcorp) — Purple, entrance aisle. Themes: beauty beside cruelty, whole albums, ego-secure sharing. Find word: **storm**. Recommends shelter vinyl.

**Simon** (@simonsarris) — Teal, crate stacks. Themes: breadcrumbs, hidden shelves, maps. Find word: **breadcrumb**. Favors moon vinyl.

**Honey** (@honeyNonABG) — Pink, listening lounge. Themes: whole sides, earnest warmth, patience. Find word: **heartbeat**. Loves mirror-edge.

**Sarah** (@ninjawhee) — Gold, register. Store owner voice across intro/return/aftermath. Groove choice affects sprite warmth in aftermath (`drawNPC` checks `grooveChoice`).

**Passerby** — 8 variants, periodic door spawn. Ambient city poetry + optional vinyl hints.

**Bird** — Optional encounter. Teaches gentle exit; ties to `bird_guide` secret and feather item.

### 7.2 Dialogue volume

`DIALOGUE_FORESTS` contains ~200+ nodes across 9 forests. Key choice counts align with HEAVY pass targets: intro ≤3–4 choices on main paths, return ≤4 emotional choices before needle.

### 7.3 Rhythm chart content

- 6 labeled sections on side A, ~60 authored notes + adaptive filler
- 3 encore chart blocks (uptown 28 notes, burner 40 notes)
- 21 `MICRO_QUOTES` + easter egg quotes on notes
- 6 hieroglyph variants on slices
- 7 `SHELF_SPINES` drawn on background shelves
- Phase briefs tied to quote themes (mirror watermark pulse at section 5)

### 7.4 Journal & ambient

`StorePause` ships 12 `JOURNAL_RANDOM` ambients, 12 `EXAMINE_RANDOM` flavors, 4 `TALK_RANDOM` aftertalks. Auto-thoughts via `pickThought` guide next objective.

---

## 8. Audio design

**Architecture:** Single shared `AudioContext` via `AudioBus.create(ctx)`.

| Bus | Level | Role |
|-----|-------|------|
| masterGain | 0.68 | Compressor → destination |
| vinylGain | 0.72 idle / 0.88 store | LP @ 5200Hz |
| rhythmGain | 0.82 nominal | RhythmLoop output |
| sfxGain | 0.78 | Hits, blips, improv |

**Mode state machine:** `idle` | `dialogue` | `store` | `rhythm`. Transitions fade vinyl, stop rhythm clean, cleanup echoes. `MODE_LOCK_MS` 120 prevents race.

**Store:** Procedural jazz compositions per movement; brush swish, walking bass, comp chords, melody schedules. Preview capped 15s with fade-out 0.35s.

**Rhythm:** `RhythmLoop` ballad (84 BPM default) with triangle bass, piano comp on beats 0/2, brush on offbeats, horn stabs every 8 beats. Style shifts for swing/burner encores.

**SFX (`heavy-runtime.js`):** Lane-specific tap timbres, judgment bursts (perfect = bright sweep), miss scratch, pizza crunch, Sarah encore stinger, song handoff sweep.

**Dialogue:** `toneBlip` pitch varies by `emotionForNode`. Vinyl pickup sting in overworld.

**Ducking:** `duckRhythm` drops to 0.48 during hit SFX for clarity.

---

## 9. UI/HUD

### Title screen / rhythm

- Banner: `∴ EAT THE SOUNDS ∴` / `vinyl hunger · d f j k`
- Stats header: score, combo, slices, album %
- Quote panel: cycling `QUOTES` with typewriter
- Playfield key caps: D/F/J/K with lane guides to hit line
- Phase label / judgment popups (SLICE!/TASTY!/NOM!)
- Combo sticker (dims at combo≥8 per HEAVY top-7)
- Improv meter bar
- Song pill + encore pill post-feast
- Pizza hint bar for bonus slices
- Mirror choice overlay + Sarah flash canvas

### Overworld

- `overworld-hint` structured UI: key / action / target / sub
- `ow-esc-hint`: Esc opens journal
- Now playing HUD during vinyl (`drawNowPlayingHUD`)
- Secret/flavor/aftermath toasts
- Echo ghost slice overlay (pre-first-preview)
- Control bar tutorial before first spin
- Pause overlay: journal tab + inventory tab with status cards

### End overlay

- Title/subtitle from `getEndVariant` + groove choice
- Summary: score, perfects, improv %, album breakdown
- Return hint with tier vibe
- Auto-transition to aftermath store (4.8s win / 3.6s loss)

### Progress HUD

- Overworld: `VinylEchoBridge.drawOverworldHud` + secret count `∴N`
- Rhythm: echo orb strip under stats
- `GameProgress.drawHud` album bar (optional embed)

---

## 10. Endings & tiers

### Rhythm run tiers (`getAftermathTier`)

| Tier | Threshold |
|------|-----------|
| static | !won |
| tasty | won, default |
| groove | perfects≥4 OR score≥1800 |
| wings | perfects≥8 OR improv≥65 |

### Mirror choice consequences

| Choice | Narrative | Visual |
|--------|-----------|--------|
| keep | Groove kept warm in glass | Sarah warm tint, gold ripples |
| pass | Groove passed to next walker | Reflective purple ripples |

### Album unlock endings (`getEndVariant`)

- Mirror vinyl heard + tier≥3: *"the mirror remembered you"*
- Tier 4 (100% album): *"whole album · side B"*
- Tier 3: mirror at edge copy
- Tier 2: groove remembers
- Below tier 2: null (default end screen copy)

### Replay hooks

- Aftermath dialogue per tier with `__start__` re-entry
- Secrets vault (`secrets_vault_hints`) documents hidden triggers
- Album % grind: exploration + best slices + wins
- Chill mode for accessibility replays

---

## 11. Technical architecture

### File graph

```
ninjawhee-eat-the-sounds.html  (orchestrator: 5196 lines)
├── pixel-gfx.js          PixelGfx
├── heavy-runtime.js      HeavyRuntime
├── rhythm-loop.js        RhythmLoop
├── audio-bus.js          AudioBus
├── heavy-dialogue-art.js HeavyDialogueArt
├── vinyl-audio.js        VinylAudio
├── vinyl-echo-bridge.js  VinylEchoBridge
├── game-progress.js      GameProgress
├── store-items.js        StoreItems
├── pause-journal.js      StorePause
├── easter-eggs.js        EasterEggs
└── overworld.js          JazzStoreOverworld
```

### Boot sequence

1. `bootGame()` — `StorePause.init`, `GameProgress.load`, DOM listeners
2. Returning player check → intro forest branch
3. `openBootIntro` → dialogue scene
4. `startOverworld` on `__explore__`
5. Rhythm via `startGame` → `audioBus.setMode('rhythm')` → `buildChart` with `echoSeed = VinylEchoBridge.getSeed()`

### Persistence keys

| Key | Module | Data |
|-----|--------|------|
| `eat-the-sounds-v1` | GameProgress | vinyls, listens, npcs, wins, runs, secrets, inventory, findCounts |
| `eat-sounds-journal-v2` | StorePause | up to 120 journal entries |

### Render loops

- Overworld: `requestAnimationFrame(render)` in `overworld.js`
- Rhythm: `loop()` in HTML script
- Dialogue: `spriteLoop` for portrait bounce

### Performance notes

- `RhythmLoop.MAX_LIVE_NODES` 96 with oldest eviction
- Vinyl scheduler prunes at 360 nodes
- Overworld lamp wash every 2 frames when camera/motion changes
- Interact target cache keyed by player+listening+bird state

### External assets

- Google Fonts (Cormorant, Press Start 2P, Space Mono)
- Optional portrait: `assets/ninjawhee-grok-pixel-clean.png` (falls back to procedural Sarah)

---

## 12. Design principles from code

1. **Code is truth over doc.** Pads, aut costs, and tier thresholds come from JS constants, not aspirational markdown.
2. **One pad, one action.** Eliminates dual-distance confusion; `resolveInteractTarget` is pad-first.
3. **Listening seeds playing.** Every store action feeds rhythm via `VinylEchoBridge` — exploration is never filler.
4. **Failure is hospitality.** Static tier uses warm copy, weak-run sting, open door. No game-over screen.
5. **Whole albums as ethics.** 15s preview is a taste; systems reward returning, echoing, and finishing sides.
6. **Mutuals gate the sacred.** Sarah's needle drops only after social grounding — mirror is earned, not menu-selected.
7. **Audio modes are exclusive.** `AudioBus` centralizes conflicts; vinyl never fights rhythm unintentionally.
8. **Persist wonder, not just score.** Journal + items + secrets reward noticing, not only reflex.
9. **Accessibility via chill.** Wider windows + auto-NOM without shaming labels.
10. **Heavy direction as contract.** `heavy-runtime.js` exports named functions the HTML calls — polish is modular.

---

## 13. Known gaps

| Gap | Evidence | Impact |
|-----|----------|--------|
| Sarah visible before mutual gate | `ninjawhee_return.hidden: false` | May confuse "who to talk to first" |
| 15s preview vs "whole album" rhetoric | `STORE_PREVIEW_SEC = 15` | Thematic tension; musically honest but narratively short |
| HEAVY-VISUAL-DIRECTION.md truncated | File is Chrome UI scrape, not art spec | Visual bible incomplete in repo |
| HEAVY-RHYTHM-DIRECTION.md incomplete | Grok retry failed mid-spec | Original 7-slice spec superseded by 15-slice code |
| Mirror choice ↔ album % tie-in | HEAVY pass 4/5 | Choice affects sprite/copy but not album % formula |
| Some secrets feel tangential | HEAVY pass 3/5 secrets cohesion | DFJK/pizza fun but loosely tied to wings theme |
| Orph philosophy branch deferred | HEAVY pass CUT/defer list | Content gap for deep lore seekers |
| Advanced combo stickers deferred | `combo-hot` dims at 8, no full sticker anim | High-skill celebration understated |
| No save export / cloud | localStorage only | Session bound to browser |
| Veteran intro still multi-node | `tell_me_more` tree is large | First-time menu fatigue risk remains on curious path |

---

## 14. Recommendations

### P0 — Clarity (low code cost)

1. **Echo onboarding toast chain** — Already partially implemented; ensure first-time players see ghost slice + HUD orbs before Sarah gate. Add journal `quest-echo` pinned entry on first preview.
2. **Sarah visibility rule** — Consider `hidden: true` until first vinyl spin OR first mutual talk, then appear at register with glow. Aligns narrative with `updateReturnNPC` gating.
3. **Album % in mirror choice** — Display `formatAlbumBreakdown()` consequence text: *"keeping the groove +3% mastery"* vs pass variant. Already partially in `mirrorChoiceHint`.

### P1 — Emotional peak (medium cost)

4. **Mirror choice visible in aftermath world** — Extend `drawSarahPresence` / NPC tints to passerby comments referencing keep/pass.
5. **Static tier lamp vignette** — `AFTERMATH_STYLE.static.warmth` is 0.92; bump lamp wash multiplier for cozier failure return (HEAVY pass #3).
6. **Slice 8 improv crescendo** — Bridge flash exists; add 0.5s vinyl stall + `playMotif(lastVinyl)` stinger when `bridgeFlashUntil` fires.

### P2 — Content depth (higher cost)

7. **Extend preview with standing-still bonus** — If player stands on pad full 15s, unlock `echo_ticket` guaranteed and +5 resonance. Rewards patience mechanically.
8. **Orph deferred branch** — One `orph_philosophy` node linking storm finds to mirror choice keep/pass dialogue in aftermath.
9. **Combo milestone stickers** — Implement deferred sticker anims at 20/42/50 combo (42 already has secret).

### P3 — Production

10. **Replace truncated HEAVY docs** — Regenerate visual/rhythm direction from current code snapshot.
11. **Playtest telemetry** — Hook `GameProgress.recordRun` to optional analytics for drop-off at mutual gate, slice 8, mirror choice.
12. **Ship manifest** — `GAME-CODE-MANIFEST.md` is current; automate via `build-game-code-bundle.mjs` on release tags.

---

## Appendix A — Control reference

| Context | Keys |
|---------|------|
| Overworld move | Arrows, WASD, Q/E/Z/C diagonal, . wait |
| Overworld interact | Z, Enter, Space |
| Stop vinyl | X |
| Pause | Esc |
| Rhythm | D F J K |
| Mirror choice | ↑↓, Z/Enter |
| Skip feast to mirror | Z after feast complete |
| Quit rhythm | Esc (triggers endSong or finishWin) |

---

## Appendix B — Module export index

See `GAME-CODE-MANIFEST.md` for full function lists (200+ exports). Critical integration points:

- `JazzStoreOverworld.start(canvas, { onTalkNPC, onListenVinyl, onReturnReady, onAftermathEnter, onSecretInteract })`
- `VinylEchoBridge.recordPreview(id, audioCtx, dest)`
- `GameProgress.recordRun({ slices, perfects, score, won, improv, misses, grooveChoice })`
- `AudioBus.setMode('store'|'rhythm'|'dialogue'|'idle')`
- `StorePause.onSessionStart({ aftermath })`

---

*SuperGrok Heavy authored `GAME-DESIGN-DOC-HEAVY.md` from the code digest. This expanded edition was synthesized from `GAME-CODE-COMPLETE-BUNDLE.txt`, `GAME-CODE-MANIFEST.md`, `STORE-TILE-LAYOUT-PLAN.md`, `HEAVY-GAME-DESIGN-PASS.md`, and live module sources. Code is truth; where design markdown conflicts with JS constants, JS wins.*