#!/usr/bin/env node
/** Spacious store cleanup — ask SuperGrok Heavy for layout/audio advice + code */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const GAME_URL = 'http://localhost:8765/ninjawhee-eat-the-sounds.html?v=spacious1';

function read(path, fallback = '') {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fallback;
}

const overworldHead = read('/home/potter/overworld.js', '').slice(0, 4500);
const ambientCode = read('/home/potter/store-ambient.js', '');
const pixelSnippet = read('/home/potter/pixel-gfx.js', '')
  .match(/function drawPixelCrate[\s\S]{0,800}/)?.[0] || '';

const PROMPT = `Heavy — SPACIOUS STORE PASS (layout cleanup + ambient jazz)

Player feedback: visual clutter, needs more breathing room, bigger rooms, thoughtful spacing, crate/box/shelf decor, ambient jazz that ducks when spinning vinyl.

**Live:** ${GAME_URL}
**CDP:** 127.0.0.1:9223

## CURSOR SHIPPED THIS SESSION
- Map expanded: ROOM_W 22→28, ROWS 13→17 (84×17 tiles)
- All vinyl/NPC/examine/secret coords respread with 3–4 tile gaps
- Removed: store guide panel, wall examine markers, vinyl zone signs, always-on Sarah tag
- Interact pads: only glow within 5 tiles; full zone only when adjacent
- STORE_PROPS: crates, boxes, floor shelves, turntable, plant per room
- RECORD_SHELVES: 8 wall units spaced along north walls
- store-ambient.js: looping soft jazz ballad on ambientGain; fades out on vinyl spin; resumes on stop

## OVERWORLD CONSTANTS (head)
\`\`\`javascript
${overworldHead}
\`\`\`

## STORE AMBIENT
\`\`\`javascript
${ambientCode}
\`\`\`

## DECOR SPRITES
\`\`\`javascript
${pixelSnippet}
\`\`\`

**Please reply:**
## Summary
## Visual clutter — what to remove or tone down further?
## Layout spacing — tile coordinate fixes (exact x,y per room)
## Decor placement — crates/shelves that read as vinyl store not clutter
## Ambient jazz — mix level, duck curve, when to resume
## Code patches (functions only) — top 3
## Ship verdict`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  [...document.querySelectorAll('button')].find((b) => /send/i.test(b.textContent || ''))?.click();
  return true;
}, PROMPT);
console.log('sent spacious store request to Heavy');
await browser.disconnect();