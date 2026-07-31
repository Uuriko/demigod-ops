import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds FULL GAME DESIGN PASS (think carefully).

Play 2 complete loops (weak + strong): http://localhost:8765/ninjawhee-eat-the-sounds.html

## What exists now (holistic)

ACT 1 — INTRO: Undertale dialogue forest → store explore
ACT 2 — STORE: walk, 4 vinyl previews (long albums), talk orph/simon/honey, echo HUD fills, secret spots
ACT 3 — COUNTER: Sarah return dialogue → rhythm tutorial choices → drop needle
ACT 4 — RHYTHM: 5 chart sections (tutorial → moon side A → shelter side B → improv bridge → mirror), groove mode, improv meter, 15 slices, feast complete → mirror choice (keep/pass) → end screen
ACT 5 — AFTERMATH: auto-return to tiered store (wings/groove/tasty/static), Sarah + mutuals fresh dialogue, replay hooks

Systems: GameProgress album %, secrets (DFJK, glyph, spots, combo 42, jam hex), VinylEchoBridge store→rhythm seed, chill mode, pixel store art, procedural jazz audio.

Tone: @ninjawhee — pizza/sounds/mirror/wings, whole albums, non-performative joy, late-night jazz store.

Recent ships: audio cleanup, dialogue voice pass, mirror choice, echo ghost teaser, aftermath motif hum, tier copy fixes.

## Your task — ENTIRE game design

Think like a creative director + Undertale-style narrative designer. Not code review — DESIGN.

Deliver ONE reply:

## Design thesis (6-8 sentences)
What is this game ABOUT emotionally? Does the current arc deliver it? One sentence north star.

## Arc map (act by act)
For each act: what works · what sags · one fix (specific, small scope).

## Player journeys
Sketch 3 paths: first-time curious · returning player · perfectionist — does each feel complete?

## System cohesion audit
How well do these reinforce each other (score 1-5 + one line each):
vinyl preview ↔ echo ↔ rhythm | album % ↔ mirror ending | aftermath tier ↔ store visuals | secrets ↔ emotional theme | mutuals ↔ Sarah counter gate

## Top 7 design changes (ranked, implementable in vanilla JS)
Each: name · why · 3-line implementation hint · which file(s)

## Top 5 moments that should hit harder
Specific beat (e.g. "slice 8 side B turn", "first vinyl preview") + how to make it land.

## What to CUT or defer
Things adding complexity without soul — be ruthless.

No meta paragraphs to @ninjawhee or the player. Design director reply only.

No React. No new asset pipeline. No multiplayer. Small-scope soul > feature creep.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }

await page.bringToFront();
const sent = await page.evaluate((text) => {
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
if (sent) await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-GAME-DESIGN-SENT.txt', new Date().toISOString());
console.log('full game design pass sent');
await browser.disconnect();