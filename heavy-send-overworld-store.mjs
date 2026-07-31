import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — overworld store UX + graphics for eat-the-sounds (jazz record shop).

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

CURRENT PAIN: store feels confusing / low fidelity. Players can't tell:
- which shelves have PLAYABLE vinyl (moon/shelter/mirror/eat) vs decorative stock
- where NPCs are (orph/simon/honey, then Sarah at counter)
- what to interact with ([Z] listen vs talk)

MAP: 22×13 tiles. 4 vinyl pickups on shelf tiles. 3 mutuals + hidden Sarah. Counter center. Door south.

Deliver ONE reply (max 120 words + one \`\`\`js code block):
1) 6 bullets: zone clarity, vinyl vs decor, NPC visibility, HUD/legend, pixel fidelity, tutorial beats
2) ONE complete canvas helper function (vanilla ctx, Press Start 2P) — e.g. store guide panel, vinyl stand, or NPC marker ring

No prose after code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(1);
}
await page.bringToFront();
const sent = await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
  return true;
}, PROMPT);
if (!sent) {
  const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
  await input.click();
  await page.keyboard.type(PROMPT.slice(0, 500), { delay: 2 });
}
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-OVERWORLD-STORE-SENT.txt', new Date().toISOString());
console.log('overworld store prompt sent');
await browser.disconnect();