import puppeteer from 'puppeteer-core';
import fs from 'fs';

const ow = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const motion = ow.match(/function (gridMove|tryMove|advanceAut|updateMotion|tickNPCs)[\s\S]{0,600}/g)?.join('\n---\n') || '';
const drawToast = ow.match(/function drawSecretToast[\s\S]{0,400}/)?.[0] || '';

const PROMPT = `Heavy — DCSS TICK MOVEMENT + EXAMINE TOAST (co-design)

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

TASK:
1. Bigger examine popup text (was 5px canvas — moving to HTML + larger)
2. Replace smooth walk with DCSS-style AUT/tick grid:
   - Player move = 10 aut, advances world clock
   - NPCs gain aut by speed, act at 10 aut (passerby 10, sarah 6, wander 8)
   - One tile per action, grid commits instantly, 70ms visual only
   - No walk-through tiles/NPCs/shelves

CURRENT MOTION SAMPLE:
${motion.slice(0, 1200)}

TOAST:
${drawToast}

Deliver ONE reply (max 500 words + optional \`\`\`js):
## Summary
## AUT table (entity speeds)
## Player input lock / hold-key policy
## NPC turn order / passerby idle turns
## Examine toast UX (size, position)
## Top 5 code functions
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
console.log('sent tick walk prompt');
await browser.disconnect();