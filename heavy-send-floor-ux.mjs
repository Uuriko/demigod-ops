#!/usr/bin/env node
/** Floor UX pass — ask SuperGrok Heavy for visual/layout advice */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const GAME_URL = 'http://localhost:8765/ninjawhee-eat-the-sounds.html?v=floorux1';
const SHOTS = ['store-view-entrance.png', 'store-view-crates.png', 'store-view-lounge.png']
  .filter((f) => fs.existsSync(`/home/potter/${f}`));

function read(path, fallback = '') {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fallback;
}

const pixelSnippet = read('/home/potter/pixel-gfx.js', '')
  .match(/function drawParquetFloor[\s\S]{0,1200}/)?.[0] || '';
const owSnippet = read('/home/potter/overworld.js', '')
  .match(/const ROOM_AISLES[\s\S]{0,2200}/)?.[0] || '';

const PROMPT = `Heavy — FLOOR UX PASS (weird floor fix + record racks + wayfinding)

Player feedback: floor still looks weird (flat purple grid). Bring back record rack sprites. Place objects in middle of rooms. Friendly UI so users know where things are. Sarah should give contextual hints tracking what player has done.

**Live:** ${GAME_URL}
**Screenshots attached in repo:** ${SHOTS.join(', ') || 'store-view-*.png'}

## CURSOR SHIPPED
- Room-tinted parquet floors (3 room palettes)
- Center aisle runners (gold/green/purple) down each room middle
- Carpet floor in listening lounge (ty>=11)
- drawFloorRecordRack sprites in center aisles (STORE_PROPS racks)
- All RECORD_SHELVES wall racks render again (no vinyl skip)
- Wayfinding signs: "new arrivals ♫ moon ↑" per room center
- Pad labels: ♫ spin · ∴ look · ★ sarah · Z talk
- Softer arch column glow
- Sarah hint system: GameProgress.getSarahHintLines() + return_hint_stuck dialogue

## PIXEL FLOOR CODE
\`\`\`javascript
${pixelSnippet}
\`\`\`

## LAYOUT CONSTANTS
\`\`\`javascript
${owSnippet}
\`\`\`

**Please reply:**
## Summary
## Floor — what still looks weird and exact fix?
## Record racks — wall vs floor placement coords
## Center objects — what belongs in aisle middle?
## Wayfinding UI — labels, arrows, minimap?
## Sarah hints — priority order OK?
## Code patches (top 3 functions)
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
console.log('sent floor UX request to Heavy');
await browser.disconnect();