# ∴ EAT THE SOUNDS ∴ — Game Design Document

**Author:** SuperGrok Heavy (code-derived)  
**Generated:** 2026-06-20  
**Source:** GAME-CODE-DESIGN-DIGEST.md (12924 lines)

---

1. Vision & emotional thesis

Eat the Sounds is a cozy pixel sanctuary where listening to whole albums with friends becomes a literal feast that changes the player and the store itself. The vision is a late-night jazz record store inside your chest where beauty is internalized until the mirror shows wings. Emotional thesis: every listen is a contract with joy; the store remembers, Sarah remembers, and the player leaves transformed by how deeply they ate the sounds. The game rejects performance for presence — non-performative wonder in shared listening, where even weak runs are met with "the door stays open" hope and the universe smiles with pizza and mirrors.

2. Player fantasy & tone (@ninjawhee voice)

The player is the curious listener who helps Sarah remember joy by wandering the store, spinning records, chatting with mutuals, and dropping the needle on a rhythm feast that turns listening into wings. Tone is lowercase poetic warmth, gentle wonder, non-performative authenticity, late-night jazz hum — beauty in the ordinary, joy in noticing, the quiet pleasure of whole albums with friends. The voice is Sarah's: "when its real... no words are needed.... theres a mirror at the edge of the world.. we still ate some sounds together.... the door stays open."

3. Core loop diagram (intro → store → rhythm → aftermath)

Intro dialogue (portrait gate + fast path) → store overworld (3 rooms, walk + Z interact, vinyl previews seed echoes, mutuals gate, Sarah counter) → rhythm feast (multi-song ladder, pizza slices, mirror choice) → aftermath store (tier mood, fresh dialogue, replay) → repeat with growing secrets and %.

4. Act-by-act design (Intro, Store overworld, Counter/Sarah, Rhythm feast, Aftermath, Secrets)

Intro: Portrait Sarah dialogue with "let me in" auto-advance for fresh, returning_visitor fast choice for veterans; teaches pizza, slices, mutuals, mirror with gentle elliptical lines.

Store overworld: 3-room grid (entrance/stacks/lounge), smooth snap tile walk, glowing vinyl pads, pinned mutuals with talk rings, Sarah hidden until 3 mutuals, passerby poetry, examine/find quests, bird encounter, secrets.

Counter/Sarah: Return dialogue after 3 mutuals, echo nudge, chill toggle, needle drop emotional contract.

Rhythm feast: Multi-song ladder with bonus pizzas, adaptive density, improv meter, combo stingers, mirror choice after feast complete or Z in encore.

Aftermath: Tiered store mood with new NPC lines, particles, replay hooks, static hope.

Secrets: DFJK, counter knock, bird, find quests, jam hex, combo 42, score 2222 — all feed narrative warmth.

5. Systems bible - Movement (DCSS aut/tile) - Dialogue forests & NPCs - Vinyl / audio / echoes - Rhythm charts & scoring tiers - Progression & album % - Inventory & journal - Easter eggs - Pixel art direction

Movement: DCSS-style snap tile with held-key poll, pathfinding, collision on S/C/W/D. Dialogue forests: node-based with enrich, mutuals have revisit lines tied to finds. Vinyl/audio/echoes: 15s preview, motif excerpt, echo seed flavors chart and TASTY bias. Rhythm charts & scoring tiers: 3 songs + encore, SLICE/TASTY/NOM with grace windows and chill mode. Progression & album %: explore + rhythm + mastery unlocks tiers. Inventory & journal: pause with finds, items, thoughts. Easter eggs: DFJK, bird, find, combo, score — hidden joy. Pixel art direction: warm palette, lamp glow, neon accents, soft shadows, breathing animations.

6. Store map & interaction pads (tile truth from overworld.js)

3-room grid 66×13 with arches at rows 5–7. Player starts (10,10). Vinyl pads: moon (10,3), shelter (26,4), mirror (54,3). Mutual pads: orph (7,10), simon (30,7), honey (50,8). Sarah pad (10,7). Examine pads south of shelves. Unified pad system with adjacent fallback. Door DD at (10,12)(11,12) blocked for player.

7. Content catalog (vinyls, mutuals, examine spots, items, dialogue trees summary)

Vinyls: moon (gold/front), shelter (green/stacks), mirror (purple/lounge) — 15s motif, echo seed, chart flavor. Mutuals: orph (deep thinker purple), simon (breadcrumb green), honey (earnest pink) — pinned, revisit lines tied to finds. Examine spots: 12 tied to mutuals with find quests and pickup items (storm liner, chalk stub, demo ribbon). Items: journal entries, thoughts, inventory from examine/talk/vinyl. Dialogue trees: enriched nodes, Sarah return after 3 mutuals, aftermath tier lines, secrets with unlock toasts.

8. Audio design

Procedural jazz: ballad walking bass + brushes, swing ride + horn, burner faster comp + hi-hat. 15s store motifs fade into hush. Rhythm crossfade 600ms with motif carry-over. Sarah hum motif at 3 listens. Pizza crunch sfx + combo stingers. Tier audio: wings airy highs, static cozy low pulse. Ducking, resume guards, snap gains for clean transitions.

9. UI/HUD

Merged bottom bar for echo + album % with hint bar. Top banner title + sub. Judgment pop + phase label. Combo sticker + pizza hint. Mirror choice overlay with Sarah flash. Pause journal + inventory. Overworld hint persistent near interactables. Toast stack max 2. End overlay with album breakdown.

10. Failure states & endings (mirror keep/pass, tiers)

No failure — all paths lead to aftermath. Mirror keep/pass: warm keep glow vs cool pass ripple + Sarah reflection shift. Tiers: static "door stays open" warmth, tasty, groove, wings with extra sparkle and NPC lines. End screen with album % breakdown and return store button.

11. Technical architecture (module graph, data flow)

HTML main with canvas + UI layers. Modules: overworld.js (render/tick/move), game-progress.js (state/save), vinyl-audio.js (preview/scheduler), audio-bus.js (mode/gains), rhythm-loop.js (chart/play), heavy-runtime.js (judgment/UI), easter-eggs.js (unlock), pixel-gfx.js (draw). Data flow: store preview → echo bridge seed → rhythm chart flavor → tier aftermath → replay.

12. Design principles inferred from code

Cozy non-performative joy first. Code truth: snap movement + held poll for smooth feel, pad-based interaction for forgiveness, tiered aftermath for emotional payoff, procedural jazz for living universe, hidden secrets for noticing joy. Every system serves the listening fantasy.

13. Known gaps / tech debt visible in code

VINYL_META.eat legacy lane K reference. Stale HEAVY-SHIP-STATUS.md says 4 vinyls. Examine spots decorative list still present. Passerby variant truncation edge in typing animation. Album % tooltip missing on end screen despite tracking.

14. Future design recommendations (soul-first, small scope)

Add one Sarah line referencing find quest complete at 9/9 for narrative closure. Extend passerby poetry with "whole albums" variant after first preview. Stronger static tier lamp pulse with shared hope visual. Defer decorative examine spots if HUD feels busy. One more mirror consequence reference in aftermath NPCs for deeper reflection.

The game is a beautiful sanctuary ready for the world. The listening joy is fully realized.