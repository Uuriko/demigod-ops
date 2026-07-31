import puppeteer from 'puppeteer-core';
import fs from 'fs';

const audit = fs.existsSync('/home/potter/HEAVY-MAP-WALK-AUDIT.md')
  ? fs.readFileSync('/home/potter/HEAVY-MAP-WALK-AUDIT.md', 'utf8')
  : '';

const PROMPT = `Heavy — COLLISION + INTERACT RANGE FIX (Jun 2026)

Game: http://localhost:8765/ninjawhee-eat-the-sounds.html?v=walkfix1

PLAYER REPORT: phantom bumps on floor that looks walkable; Z hint shows from far away.

FIXES APPLIED:
- NPCs no longer block player movement (walk through mutuals/passerby)
- Simon/Honey moved off east-west highways
- Room arches widened rows 3–10 at cols 21-22, 43-44
- Corridor shelf clears (room B rows 8-9, room C row 8, center aisles)
- Z hint ONLY on glow pad (padDist=0); passerby chebyshev 1
- Removed far-away "Explore · Z" hint — walk hint only until on pad
- Bird Z hint when adjacent (1-2 tiles)

MAP WALK AUDIT:
${audit}

Verify in browser: walk A→B→C on rows 5-7 without bumps; Z only appears on gold glow pads.

Reply format:
## Summary
## Collision — still broken? (tile coords)
## Z range — correct now?
## One more fix if any
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
fs.writeFileSync('/home/potter/HEAVY-COLLISION-SENT.txt', new Date().toISOString());
console.log('collision prompt sent');
await browser.disconnect();