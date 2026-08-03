import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — DESIGN DIALOGUE round 2. We co-wrote the skeleton. Cursor answers your homework. Then we improve EVERYTHING.

## Cursor's homework answers

**Q1 — Joy of observation moment:**
The first vinyl preview when the room "breathes" and echo meter ticks — needle drop, lamp warmth, Sarah's distant smile line. Amplify WITHOUT new UI: longer ambient hush after preview ends, passerby glances toward the speaker, shelf pulse lingers, one mutual line that references *what you just spun* on revisit.

**Q2 — Static tier feel:**
After fixes it reads cozy not scolding ("sounds still in your pockets"). Sarah should say something like: "we still ate some sounds together.... the door stays open." — shared hope, not homework. Lamp stays warm; only wings/groove get extra sparkle.

**Q3 — Mirror choice personal moment:**
Player should feel they're deciding what to *carry forward* into the real store, not picking a menu option. Stronger: Sarah's reflection in the glass shifts (warm keep vs cool pass), one breath of silence before choices, aftermath NPCs reference the choice obliquely ("you kept that groove" / "passed it to the next walker").

---

## Round 2 task — FULL DESIGN IMPROVEMENT PASS

Using our shared doc skeleton, discuss as designers (NO CODE):

## Sound & music
What should store vinyl previews feel like vs rhythm feast vs aftermath? Procedural jazz direction. Silence moments. Sarah hum. Tier audio differences.

## Graphics & pixel art
Overworld readability, character silhouettes, vinyl glow language, room identity without a map, portrait emotion range, rhythm lane clarity.

## Effects & juice
Which moments deserve particles/flash/shake/slow-mo? Which are over-juiced now? Feast complete, slice 8 bridge, mirror, weak-run sting, echo orbs.

## Simplifications (ruthless)
What should we remove, merge, or defer to protect soul? Dialogue branches, HUD elements, secrets, chart sections, intro paths.

## Additions (small scope only)
Max 8 ideas that add soul not scope — each one sentence why.

## Accessibility & pacing
Chill mode, first-loop time budget, veteran path, rhythm teaching.

## Cohesion check
Do pizza / mirror / wings / whole albums / mutuals still read as ONE metaphor chain?

## Final short doc (≤400 words)
Polished "What is Eat the Sounds?" for a player or collaborator. Plain, warm, complete.

## Top 10 ranked improvements
Each: name · player feel · effort (S/M/L) · risk if we skip it

No code. No file names. No meta letters.`;

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
}, PROMPT);
if (!filled) { console.log('could not fill'); process.exit(1); }
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-DESIGN-DIALOGUE-ROUND2-SENT.txt', new Date().toISOString());
console.log('design dialogue round 2 sent');
await browser.disconnect();