import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds game review round 2.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

Stack: canvas pixel art + Web Audio (no samples). Undertale dialogue → jazz store overworld → D/F/J/K rhythm → mirror ending.

Already shipped:
- audio-bus.js compressor + mode machine (idle/dialogue/store/rhythm)
- rhythm-loop.js RAF jazz backing, vinyl notes, quote typewriter, 8-10min store albums
- SuperGrok Heavy runtime + pixel gfx

Need TWO things in ONE reply:

## A) Code review (bugs + fixes)
Review: audio-bus.js, rhythm-loop.js, ninjawhee-eat-the-sounds.html, vinyl-audio.js, overworld.js
Call out real bugs with severity. Then \`\`\`js blocks ONLY for fixes you strongly recommend (complete function bodies).

## B) Simple cool improvements (keep minimal!)
Suggest 5-8 SMALL ideas that add charm without scope creep — one sentence each, then pick your TOP 3 and give tiny implementation hints (not full rewrites). Examples of the vibe we want:
- subtle juice (screen shake on perfect, lamp flicker in store)
- one new dialogue line tied to vinyl listened
- chill combo sticker on HUD
NOT: multiplayer, new levels, asset pipelines, React rewrite.

Constraints: vanilla JS, no npm deps, no image_gen. Stay simple.

Format:
## Summary
## Bugs
## Top 3 simple improvements (with 2-line code hints each)
## Code fixes (js blocks only)`;

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
fs.writeFileSync('/home/potter/HEAVY-IMPROVE-SENT.txt', new Date().toISOString());
console.log('improve prompt sent');
await browser.disconnect();