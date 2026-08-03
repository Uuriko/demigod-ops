import puppeteer from 'puppeteer-core';
import fs from 'fs';

const plan = fs.readFileSync('/home/potter/STORE-TILE-LAYOUT-PLAN.md', 'utf8');

const PROMPT = `Heavy — EXHAUSTIVE STORE TILE LAYOUT REVIEW (co-design · Cursor implements)

Player says pathing is confusing. Vinyl spin and ALL interactions feel weird/hard.

We drafted an exhaustive tile plan. READ IT and improve it:

${plan}

REQUIRED in your reply (max 600 words):
## Perimeter + aisle verdict (any tile edits we missed?)
## Vinyl pad positions — confirm or fix (x,y each)
## NPC start tiles — confirm or fix
## Examine pad alignment with shelves
## Unified pad interaction system — gaps?
## Top 5 tile-by-tile edits (row, col, from→to, room)
## Ship verdict

Be exact with coordinates. No smooth-walk advice — DCSS snap movement stays.`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(1); }
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
console.log('sent store layout plan to Heavy');
await browser.disconnect();