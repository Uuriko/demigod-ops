import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — who are ORPH, SIMON, and HONEY in Eat the Sounds?

## In-game now (pixel overworld mutuals)
- **orph** — purple accent, left stacks / entrance aisle, deep thinker, recommends shelter vinyl
- **simon** — green accent, middle stacks, map walker, moon window, loves breadcrumbs
- **honey** — pink accent, listening rug / door area, earnest energy, mirror-edge vinyl

They are store browsers the player talks to before Sarah at the register. After all 3 → Sarah appears → rhythm game.

## What we need from you

## Character bible (3 × 4 bullets each)
Who they are, vibe, speech tic, why they're in the store tonight

## Relationship web
How they know each other + Sarah/ninjawhee (1 short paragraph)

## One signature line each
In-game dialogue voice — lowercase, ellipses ok

## Optional: should any be real-world refs?
Singapore/music scene nod or pure fiction?

## Risks (2)

No code. No @ninjawhee letter.`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(1); }
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
}, PROMPT);
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-MUTUALS-LORE-SENT.txt', new Date().toISOString());
console.log('mutuals lore sent');
await browser.disconnect();