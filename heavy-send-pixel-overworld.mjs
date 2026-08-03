import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — pixel art polish for eat-the-sounds OVERWORLD (jazz record store).

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html
Canvas overworld: 22×13 tiles @ 28px. Palette: #0a0812 #1a1028 #c9a84c #c45c7a #4a8f7a #7b5ea7 #e8d48c

Has: brick walls, wood shelves, vinyl stands, register counter, lamps, NPC sprites, Sarah spotlight, STORE MAP HUD.

Goal: make overworld pixel art look GREAT — late-night cozy jazz shop, Undertale warmth, readable at a glance.

Deliver ONE reply:
1) 8 bullets: palette, floor/walls, shelves, lighting, characters, depth/shadows, animation, anti-clutter
2) ONE \`\`\`js block — complete canvas helper (vanilla ctx, Press Start 2P) for highest-impact visual upgrade

Max 130 words before code. No prose after code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  return true;
}, PROMPT);
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-PIXEL-OVERWORLD-SENT.txt', new Date().toISOString());
console.log('pixel overworld prompt sent');
await browser.disconnect();