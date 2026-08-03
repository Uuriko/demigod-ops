import puppeteer from 'puppeteer-core';
import fs from 'fs';

const bundle = fs.existsSync('/home/potter/GAME-CODE-COMPLETE-BUNDLE.txt')
  ? fs.readFileSync('/home/potter/GAME-CODE-COMPLETE-BUNDLE.txt', 'utf8').slice(0, 28000)
  : '';

const PROMPT = `Heavy — INTERIOR-ONLY + COLLISION + VINYL REACH (Jun 2026)

Game: http://localhost:8765/ninjawhee-eat-the-sounds.html?v=openfloor3

PLAYER REPORT:
1. Don't show outside at all — interior only (+ bottom wall visible)
2. Can walk through bottom wall — collision broken
3. Room A items cluttered — spread props/examines
4. Can't reach records — vinyl collision/range broken
5. Walk everywhere except visible walls

FIXES APPLIED (overworld.js):
- buildOpenStoreMap(): full perimeter W, NO door D tiles (bottom row 100% wall)
- Removed storefront facade, door threshold, exterior door rendering
- Interior-only decor: neon at row 10, register cols 14-16, rug moved to 12,7
- drawStoreProps: vinyl shelves + register only (no examine shelf clutter)
- VINYL pads moved adjacent to shelves: moon(4,2) shelter(26,3) mirror(54,2)
- vinylInRange: chebyshev ≤1 from pad OR shelf
- Room A examines spread: storm_spine(18,1) storm_poster(2,9) mirror_scratch(19,7) lamp_dust(2,2) neon_hum(17,10) register_wear(15,5)
- Sarah register (15,5) pad (15,7) · spawn (10,9)
- STREET_DOOR interior mat (10,11) — passerby only, no exterior view

KEY POSITIONS:
VINYL: moon pad 4,2 shelf 4,1 | shelter 26,3/26,2 | mirror 54,2/54,1
NPCs: orph 6,8 pad 6,10 | sarah 15,5 pad 15,7 | simon 28,7 | honey 48,8

CODE BUNDLE (truncated):
${bundle}

Please reply with:
## Summary
## Interior render — outside gone?
## Bottom wall collision — fixed?
## Vinyl reach — can spin all 3 from pad/adjacent?
## Room A clutter — spread enough?
## Code patches if anything still broken (full functions)
## Ship verdict`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(1); }
await page.bringToFront();
const sent = await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  return true;
}, PROMPT);
if (sent) await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-INTERIOR-FIX-SENT.txt', new Date().toISOString());
console.log('interior-fix prompt sent');
await browser.disconnect();