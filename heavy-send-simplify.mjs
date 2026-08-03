import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — design audit for eat-the-sounds jazz store overworld (3 rooms now, wandering NPCs, street visitors).

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

We are REMOVING: STORE MAP panel, tutorial arrows, zone signs, talk bubbles.

We are ADDING: 3 walkable rooms, NPC idle/walk, random street visitors (don't know Sarah).

Deliver ONE reply (max 140 words + optional \`\`\`js if one tiny helper):
1) 5–7 bullets: what else to CUT or SIMPLIFY for clarity (HUD clutter, duplicate hints, secret spots, vinyl count, dialogue beats, echo ghost, etc.)
2) One sentence on room identity (front / stacks / listening lounge) without adding UI chrome

No prose after bullets.`;

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
fs.writeFileSync('/home/potter/HEAVY-SIMPLIFY-SENT.txt', new Date().toISOString());
console.log('simplify prompt sent');
await browser.disconnect();