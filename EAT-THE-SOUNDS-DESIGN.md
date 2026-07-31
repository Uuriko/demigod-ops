# Eat the Sounds — Game & Design Document

*Co-written from a design dialogue between Cursor (local build agent) and SuperGrok Heavy, June 2026. Player-facing design only — not engineering.*

---

## What is Eat the Sounds? (short doc)

**Eat the Sounds** is a gentle browser game about listening to whole albums with friends in a late-night jazz record store until the music changes you.

You walk three cozy pixel rooms. You spin vinyl previews that fill an **echo → rhythm** meter. You talk to three mutual friends — orph, simon, honey — who each carry a different flavor of the same wonder. When the store feels ready, you sit with **Sarah** at the register and **drop the needle** on a four-lane rhythm feast: each note is a pizza-slice of sound (D · F · J · K). SLICE, TASTY, or NOM — all count. You eat until **feast complete**, then face the **mirror**: keep the groove or pass it on.

Win or lose, the store reopens **changed**. Wings, groove, tasty, or static — Sarah and the floor remember how you listened.

The fantasy is not high score. It is being the quiet listener who helps Sarah remember joy: wandering a warm shop, eating beauty one slice at a time, choosing what to carry forward, and leaving a little more winged than you arrived.

It feels like a hug from the universe — slow, elliptical, lowercase, rewarding **curiosity and presence** more than skill. Procedural jazz hums. Glowing vinyl. Passerby poetry. A mirror at the edge of the world.

**North star:** *Every listen is a mirror — what wings do we grow together?*

---

## How Cursor and Heavy explain the game (dialogue)

### Cursor's read

This is @ninjawhee / Sarah Lin's poetic world made playable: pizza, mirrors, wings, whole albums, hieroglyphs ∴𓅰. The screen is a **late-night shift that never ended** — a place where posts go to breathe.

**Five acts as felt experience:**

| Act | What the player does | What it means |
|-----|----------------------|---------------|
| **Intro** | Portrait dialogue with Sarah | Invitation without pressure; veterans get "welcome back" |
| **Store** | Explore, spin 3 vinyls, talk mutuals, fill echo meter | Listening as discovery; the room learns your curiosity |
| **Counter** | Return talk with Sarah — memory, nerves, chill mode | Emotional contract before the feast |
| **Rhythm** | 15 slices, groove mode, improv bridge at slice 8, mirror choice | Eating sounds until metamorphosis |
| **Aftermath** | Tiered store return, fresh lines, replay | The space remembers you |

**Sacred feeling:** Non-performative joy — shared listening, not performance.

**Where Cursor saw sag:** First-loop discovery time, weak-run emotional landing, secrets opacity, mirror consequence visibility, HUD density on small screens.

### Heavy's read

Heavy agrees on the five-act arc and the listening-as-transformation fantasy. Sarah is the **gentle catalyst** — she used to work here and remembers whole albums. "Eat the sounds" means **internalizing beauty until it transforms you**: rhythm is feast, mirror is reflection, aftermath is the changed store.

Heavy refines Cursor on a few points:

- Store exploration is **exploration-dependent but not aimless** — glowing stands reward curiosity.
- Rhythm is **forgiving** via grace windows; steepness is less the issue than **weak-run emotional framing**.
- Secrets stay opaque by design, but **passerby hint variants** make discovery poetic, not frustrating.
- Aftermath **tier label** could be more prominent for clarity.

**Heavy's soul line:** *A quiet prayer of shared listening in pixel form — not a challenge or story, but a space where you and Sarah and the mutuals eat sounds together until the mirror shows wings.*

---

## Design skeleton (shared)

| Section | Summary |
|---------|---------|
| **Premise** | Late-night jazz store where whole-album listening becomes a feast that changes you and the space you return to |
| **Player fantasy** | Help Sarah remember joy; wander, eat sounds, choose at the mirror, leave with wings or quiet hope |
| **Emotional arc** | Nostalgia → discovery & sharing → cathartic feast → reflective choice → changed return |
| **Core loop** | Dialogue → store previews seed echoes → Sarah counter → rhythm feast → mirror → tiered aftermath |
| **Key systems** | Vinyl previews → echo meter → rhythm seed; aftermath tiers; secrets as noticing; mutuals + Sarah as mirrors |
| **Tone** | Gentle, elliptical, lowercase warmth; pixel coziness; procedural jazz; beauty in the ordinary |
| **Protect** | Intimate listening fantasy, non-performative joy, Sarah as catalyst, pizza/wings/mirror motifs, store as sanctuary |
| **Open questions** | Weak-run warmth without patronizing; secret hints without guide text; discovery vs hand-holding balance |

### Homework round (Cursor → Heavy)

| Question | Cursor's answer |
|----------|-----------------|
| **Joy of observation** | First vinyl preview — room breathes, echo ticks. Amplify via ambient hush, passerby glances, shelf pulse linger, mutual lines that reference what you spun |
| **Static tier** | Must feel like shared hope: *"we still ate some sounds together.... the door stays open"* — warm lamp, not dim punishment |
| **Mirror choice** | Decide what to **carry forward** — Sarah's reflection shifts (warm keep / cool pass), breath of silence, aftermath NPCs reference choice obliquely |

---

## Design improvement pass (sound · graphics · effects · everything)

### Sound & music

| Context | Should feel like |
|---------|------------------|
| **Store previews** | Intimate discovery — brushes, walking bass, motifs that **fade into sacred silence**; lamp pulse lingers after needle stops |
| **Rhythm feast** | Cathartic eat — layered swing building to slice-8 bridge chaos, then **feast complete breath** |
| **Aftermath** | Reflective — softer tiered hum; Sarah motif warmer on wings; static keeps cozy low pulse |
| **Sarah hum** | Personal, almost whispered — after deep listening (e.g. third spin on a record) |

*Principle:* One procedural jazz universe — no samples — always the same room breathing.

### Graphics & pixel art

- **Playable vinyls:** distinct neon rim + slow spin; decorative stock duller (already directionally shipped)
- **Sarah:** larger silhouette, spotlight cone, warm outline at register
- **Mutuals:** distinct poses — orph front warmth, simon middle stacks, honey lounge pink
- **Rooms without map:** front = street-window brightness; stacks = tall shadow; lounge = lamp clusters
- **Portraits:** subtle brow/mouth shifts — gentle, elliptical, hopeful
- **Rhythm lanes:** color-accented D/F/J/K; hit-window glow on perfect

### Effects & juice

| Moment | Deserves |
|--------|----------|
| **Feast complete** | Slow-mo bloom, breath pause before mirror |
| **Slice 8 bridge** | Shake + color flash + "you ate the bridge" — emotional peak |
| **Mirror choice** | 1s reflection on Sarah, breath silence, warm/cool choice particles |
| **Weak-run sting** | Gentle rising ♫ particles + warm lamp — not failure report |
| **Echo orbs** | Visible fill + soft chime + passerby glance toward player |

**Over-juiced now:** Shelf pulse can linger only post-preview; avoid heavy shake elsewhere to keep cozy.

### Simplifications (ruthless)

| Cut / defer | Why |
|-------------|-----|
| ~~4th vinyl (eat)~~ | **Already cut** — 3 vinyls, mirror in lounge |
| DFJK secret defer or merge into counter knock | Reduces opaque keyboard puzzle |
| `tell_me_more` intro branch | Veteran-only (partially shipped) |
| Dual HUD remnants | Single merged echo + album bar |
| Extra chart sections | Only if tied to echo seed flavor |
| Static tier visual punishment | Merge into same warm ♫ language as other tiers |

### Small-scope additions (max soul / min scope)

1. Ambient hush + passerby glance after preview ends
2. Static Sarah line — door stays open
3. Mirror breath + reflection shift (partially shipped via flashMirrorSarah)
4. Mutual revisit line referencing last spun vinyl
5. Room-specific hum shifts with aftermath tier
6. Soft Sarah counter pulse after 3 mutuals
7. Passerby "whole albums" poetry after first preview
8. Aftermath NPCs reference keep/pass obliquely

### Accessibility & pacing

- **Chill mode** prominent at counter — "easier slices, more grace"
- **First loop:** ~90s to first rhythm via auto-advance + glowing stands
- **Veterans:** fast `returning_visitor` path
- **Rhythm teaching:** ghost lanes on first 4 slices + Sarah "eat with me" line

### Cohesion check ✓

**One metaphor chain:** whole albums → deep listening → pizza slices (eat sounds) → mirror (reflection) → wings (transformation) → mutuals (shared joy) → changed store (metabolized art).

Heavy and Cursor both read this as **unified and sacred**.

---

## Top 10 ranked improvements

| # | Improvement | Player feel | Effort | Risk if skipped |
|---|-------------|-------------|--------|-----------------|
| 1 | Ambient hush + passerby glance after preview | Room breathes with you | S | Lost discovery joy |
| 2 | Static line: "door stays open" | Shared hope, not homework | S | Weak runs feel like failure |
| 3 | Mirror breath + reflection shift | Choice feels personal | S | Mirror feels like menu |
| 4 | Mutual line references last vinyl | Listening matters socially | M | Mutuals feel disconnected |
| 5 | Room hum shifts with tier | Aftermath audio-visual unity | S | Weaker immersion |
| 6 | Sarah counter pulse after 3 mutuals | Gentle gate, no arrow UI | S | Register frustration |
| 7 | NPCs reference mirror choice | Consequence lingers | M | Flat return |
| 8 | Trim intro for first-timers | Faster first feast | S | First-loop drag |
| 9 | Dull decorative shelves further | Clearer readable vinyls | S | Discovery confusion |
| 10 | Sarah glow hint after 2 mutuals | Earlier register clarity | S | Gate frustration |

**Already shipped from prior passes:** 3 vinyls, intro auto-advance, ghost slice teaser, weak-run sting copy, mirror Sarah flash, aftermath motif hum, mutual room hints, first-vinyl Sarah nudge, static cozy copy.

---

## Multi-song rhythm arc (Heavy + Cursor, June 2026)

After **feast complete** (15 slices on the ballad), the needle does not stop — the player rides a **gentle BPM ladder** before choosing the mirror.

| Song | BPM | Beats | Role |
|------|-----|-------|------|
| **needle drop · side A** | 84 | 172 | Counts toward 15 slices; jazz ballad backing, wide grace |
| **uptown swing · fast feet** | 108 | 96 | First encore after feast; swing + ride cymbal; forgiving holds |
| **midnight burner · wing time** | 126 | 80 | Faster encore; hi-hat + horn stabs; loops 2↔3 until **[Z]** mirror |

**Flow:** ballad → feast complete toast → auto-advance to song 2 → songs 2↔3 loop until player presses **[Z]** for mirror choice.

**Heavy’s ladder verdict:** 84→108→126 is the right cozy escalation — organic gaps, short encores, never punish weak players. Density scales via adaptive `injectAdaptiveNotes` / `injectLivePressure` on strong runs only.

### Hit feedback (pizza bite feel)

- **SLICE / TASTY / NOM** labels unchanged; SFX adds crunchy noise + bass thump on perfect, cheese-gold particles on TASTY
- Combo **8 / 16 / 32** → stinger chord + brief screen brighten + phase brief (*in the pocket* → *full swing* → *devouring the side*)
- Song handoff → ascending motif stinger + 80ms backing crossfade duck

### Backing track personalities

| Style | Feel |
|-------|------|
| **ballad** | Walking bass portamento, brush, horn every 8 bars |
| **swing** | Ride hi-hat off-beats, brighter piano comp |
| **burner** | Closed/open hi-hat, horn stabs, louder mix |

Echo vinyls still tint chart section labels — one procedural jazz universe, three tempos.

### Store space (layout note)

Overworld three-room layout is **inspired by** a real Singapore record shop — player-facing copy uses **∴ EAT THE SOUNDS ∴** only; no trademark name on neon or banner.

### Mutuals character bible (Heavy)

| NPC | Essence | Signature line |
|-----|---------|----------------|
| **orph** | Quiet philosopher; liner notes as sacred text | *the mirror shows.... what we already knew.... but were afraid to eat....* |
| **simon** | Breadcrumb cartographer between tracks | *breadcrumbs on the path.... see.... here.... then the whole album leads you home....* |
| **honey** | Earnest enthusiast; every record has a heartbeat | *woah.... this one really !! .... you have to eat the whole side with me.... !!* |

Sarah’s long-time regulars — mutuals through years of late-night crate digging. Pure fiction; gentle archetype nods only.

---

## Sources

- `HEAVY-DESIGN-DIALOGUE-ROUND1.md` — Heavy + Cursor game explanation
- `HEAVY-DESIGN-DIALOGUE-ROUND2.md` — full improvement pass
- `HEAVY-GAME-DESIGN-PASS.md` — prior arc map & north star
- `HEAVY-MUTUALS-LORE-FEEDBACK.md` — orph · simon · honey bible
- `HEAVY-RHYTHM-EXTEND-FEEDBACK.md` — multi-song ladder + hit feedback pass
- Live build: http://localhost:8765/ninjawhee-eat-the-sounds.html