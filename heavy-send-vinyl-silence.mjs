import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — vinyl preview SILENCE bug (eat-the-sounds store).

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html
HUD shows "now spinning" but user hears no jazz. Stack: vinyl-audio.js (lookahead scheduler), audio-bus.js (vinylGain), ninjawhee HTML onListenVinyl.

Our diagnosis: full album queues 3000+ events; possible fadeTimer race after setMode stopVinyl; vinylGain stuck after rhythm; ctx suspended.

Deliver ONE reply:
## Root cause (blunt, 2-3 sentences)
## Fix priority (3 bullets, file-level)
## Code (one \`\`\`js block — complete play() or preview scheduler you recommend)

Max 100 words before code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return;
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
}, PROMPT);
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-VINYL-SILENCE-SENT.txt', new Date().toISOString());
console.log('vinyl silence prompt sent');
await browser.disconnect();