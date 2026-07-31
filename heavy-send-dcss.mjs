import puppeteer from 'puppeteer-core';
import fs from 'fs';

const ow = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const motion = ow.match(/const AUT_[\s\S]{0,3500}?function tryMove[\s\S]{0,1200}/)?.[0] || ow.slice(240, 4200);

const PROMPT = `Heavy — LOOKUP DUNGEON CRAWL STONE SOUP (DCSS) MOVEMENT · REVIEW OUR IMPLEMENTATION

REQUIRED: search/read DCSS wiki:
http://crawl.chaosforge.org/Movement
http://crawl.chaosforge.org/Action

We REJECT smooth walk / held-key / 162ms lerp. Player wants EXACT DCSS tile+aut feel.

IMPLEMENTED (Cursor · live http://localhost:8765/ninjawhee-eat-the-sounds.html):
• snapMove — instant grid commit, no slide
• AUT_MOVE=10, AUT_DIAG=14, QEVC diagonals, Period wait
• spendAut → gainMonsterEnergy → resolveMonsterActions (ENERGY_ACT=10)
• key-repeat blocked; one keypress = one tile/action
• bump blocked tile still spends aut
• talk/examine/interact spend aut
• bird + passerby + sarah on energy grid

CODE EXCERPT:
\`\`\`js
${motion}
\`\`\`

Deliver ONE reply ONLY about DCSS (max 500 words):
## Does this match DCSS aut/energy? gaps?
## Speed table OK?
## Diagonal corner-cut rule?
## Interact priority vs aut cost
## Top 3 fixes if any (function names)
## Ship verdict for DCSS feel`;

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
console.log('sent DCSS prompt');
await browser.disconnect();