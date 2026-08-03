import puppeteer from 'puppeteer-core';
import fs from 'fs';

const items = fs.readFileSync('/home/potter/store-items.js', 'utf8').slice(0, 4500);
const journal = fs.readFileSync('/home/potter/pause-journal.js', 'utf8').slice(0, 3500);

const PROMPT = `Heavy — INVENTORY · JOURNAL · PICKUP ITEMS (co-design)

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

SHIPPED:
• Esc pause · journal + inventory UI polish
• Bottom hint "esc — inventory"
• 14 pickup items from examine/talk/vinyl/bird events
• Usable items near examine spots (chalk on JAZZ poster, storm liner, etc.)
• Journal: required entries + random ambient (28-55% chance) + every talk/examine "noted" line

ITEMS:
${items}

JOURNAL POOLS:
${journal}

Game: 3-room vinyl store, mutuals orph/simon/honey find-quest, Sarah register, bird, vinyl echoes → rhythm, secrets.

Deliver ONE reply (max 600 words):
## Summary
## Item list review (add/remove/merge · which should be consumable)
## Use-puzzle chains (item A + spot B → unlock C)
## Journal tiers (required / noted / random %) — tune chances
## Inventory UX tweaks
## 3 organic quest beats items should gate
## Ship verdict`;

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
fs.writeFileSync('/home/potter/HEAVY-INVENTORY-SENT.txt', new Date().toISOString());
console.log('sent inventory prompt');
await browser.disconnect();