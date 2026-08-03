import puppeteer from 'puppeteer-core';
import fs from 'fs';

const REPORT = fs.readFileSync('/home/potter/HEAVY-PLAYTEST-REPORT.md', 'utf8').slice(0, 4000);

const PROMPT = `Heavy — agent playtest REPORT + tuning applied. Please confirm or revise.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

REPORT:
${REPORT}

We IMPLEMENTED your 8 tuning bullets (faster intro, move buffer, merged HUD, pinned mutuals, room tint, hide ghost after spin, preview toasts, shelf pulse).

Reply (max 120 words):
1) 4 bullets: what still needs tuning after this pass
2) 2 bullets: what we got right
3) One word ship verdict

No code unless one tiny helper is critical.`;

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
fs.writeFileSync('/home/potter/HEAVY-PLAYTEST-REPORT-SENT.txt', new Date().toISOString());
console.log('playtest report sent to Heavy');
await browser.disconnect();