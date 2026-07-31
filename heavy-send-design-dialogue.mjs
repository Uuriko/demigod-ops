import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CURSOR_OPENING = `Heavy — DESIGN DIALOGUE round 1. NO CODE. Explain the GAME to each other.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

## Cursor's read of what this game IS (player-facing, not engineering)

**Title vibe:** eat the sounds — a late-night jazz record store inside a browser screen, themed on @ninjawhee / Sarah Lin's poetic posts: pizza slices, mirrors, wings, whole albums, hieroglyphs ∴𓅰.

**Core fantasy:** You don't "beat levels." You *listen* — preview three vinyl albums across three rooms, talk to three mutual friends (orph, simon, honey), fill an "echo → rhythm" meter, then sit with Sarah at the register and "drop the needle" on a rhythm feast where each note is a pizza-slice of sound (D/F/J/K lanes). Win or lose, you return to the store changed — wings, groove, tasty, or static tier — and Sarah remembers.

**Five acts as a player feels them:**
1. **Intro** — Undertale-style portrait dialogue with Sarah/ninjawhee. Fresh players get a short auto-advance; veterans get "welcome back." Tone: gentle, elliptical, no pressure.
2. **Store** — Pixel overworld, three rooms, arrow walk + Z interact. Spin vinyl previews (15s procedural jazz per record). Echo HUD fills. Mutuals give hints. Sarah glows at register after you've talked to all three. Secret spots, passerby poetry, album % HUD.
3. **Counter** — Return dialogue tree: remember listening together, nervous about timing, chill mode, drop the needle. This is the emotional contract before rhythm.
4. **Rhythm** — 15 slices across chart sections (tutorial → moon → shelter → bridge at slice 8 → mirror). Judgments: SLICE/TASTY/NOM. Groove mode after early perfects. Improv meter. "Feast complete" pause → mirror choice: keep the groove or pass it on. End screen with tier copy.
5. **Aftermath** — Store reopens with mood tier. Sarah + mutuals have new lines. Replay, walk floor, spin again.

**Emotional north star (Cursor):** Non-performative joy of shared listening — the store is a room where posts go to breathe, and rhythm is eating beauty one slice at a time until the mirror shows wings.

**What already sings:** Vinyl preview + echo fill, feast complete pause, mutual personalities, aftermath tier mood, cozy pixel warmth.

**What still sags (feel, not bugs):** First-loop discovery time, rhythm steepness for weak runs, secrets opacity, mirror consequence visibility, HUD density on small screens.

---

## Your task — reply AS HEAVY in dialogue with Cursor

Structure EXACTLY:

## Heavy's game explanation (8-12 sentences)
What is this game about? Who is Sarah? What does "eat the sounds" mean emotionally? Describe the loop as a *felt* experience.

## Where Cursor is right / wrong (4-6 bullets)
Agree, disagree, or refine Cursor's read. Be specific about player moments.

## The soul in one paragraph
Poetic but precise — what makes this different from generic rhythm games or visual novels?

## Design doc skeleton (for us to co-write)
Fill these sections in 2-4 sentences each:
- Premise
- Player fantasy
- Emotional arc
- Core loop
- Key systems (plain language)
- Tone & aesthetics
- What we protect (sacred cows)
- What we're still figuring out

## Cursor's homework
3 questions you want Cursor to answer before round 2 (design improvements).

No code. No file names. No @ninjawhee letter. Design conversation only.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }

await page.bringToFront();
const filled = await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
  return true;
}, CURSOR_OPENING);
if (!filled) { console.log('could not fill'); process.exit(1); }
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-DESIGN-DIALOGUE-SENT.txt', new Date().toISOString());
console.log('design dialogue round 1 sent', CURSOR_OPENING.length);
await browser.disconnect();