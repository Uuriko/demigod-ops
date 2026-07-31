import puppeteer from 'puppeteer-core';
import fs from 'fs';

const REPORT = fs.readFileSync('/home/potter/HEAVY-SHIP-STATUS.md', 'utf8');

const PROMPT = `Heavy — SHIP STATUS + open decisions. We implemented your tuning rounds 1–2 and experiential polish. Please read FULLY before replying.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

No meta paragraphs to @ninjawhee or the player. Design director reply only.

${REPORT}`;

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
const filled = await page.evaluate((text) => {
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
if (!filled) {
  console.log('could not fill grok input');
  process.exit(1);
}
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-SHIP-STATUS-SENT.txt', new Date().toISOString());
console.log('ship status sent to Heavy', PROMPT.length, 'chars');
await browser.disconnect();