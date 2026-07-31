import puppeteer from 'puppeteer-core';
import fs from 'fs';

const audit = fs.existsSync('/home/potter/HEAVY-MAP-WALK-AUDIT.md')
  ? fs.readFileSync('/home/potter/HEAVY-MAP-WALK-AUDIT.md', 'utf8')
  : 'audit pending';

const PROMPT = `Heavy — LAYOUT + COLLISION PASS (urgent player report)

Player: "bump messages on empty-looking floor — can't walk room to room"

ROOT CAUSE WE FOUND:
Room seams A↔B (cols 21-22) and B↔C (cols 43-44) were only open rows 5-7. Rows 4,8-10 looked like continuous floor but hit W walls — phantom bumps.

SHIPPED FIX:
- Arch rows expanded 4-9 (both seams)
- Aisle shelf clears (A rows 8-9 cols 13-14, entry row 11, B/C approach gaps)
- validateMap() checks arches, vinyl pads, examine pads
- Diagonal bump points at corner tile not destination floor ("tight corner")
- Gold arch markers drawn on seam floor tiles

PLAYTEST:
${audit}

Reply max 400 words:
## Verdict — layout now navigable?
## Any tile edits still missing (x,y from→to)
## Visual clarity — enough or need floor tint on non-walkable?
## Ship verdict`;

async function sendText(page, text) {
  await page.bringToFront();
  const ok = await page.evaluate((t) => {
    const el = document.querySelector('textarea, [contenteditable="true"]');
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA') { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }
    else { el.textContent = t; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
    return true;
  }, text);
  if (!ok) throw new Error('no textarea');
  await page.keyboard.press('Enter');
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) throw new Error('no grok tab');
await sendText(page, PROMPT);
fs.writeFileSync('/home/potter/HEAVY-LAYOUT-COLLISION-SENT.txt', new Date().toISOString());
console.log('sent');
await browser.disconnect();