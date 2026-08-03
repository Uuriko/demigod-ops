import puppeteer from 'puppeteer-core';
import fs from 'fs';

const AUDIT = fs.readFileSync('/home/potter/HEAVY-FULL-AUDIT-SESSION.md', 'utf8');

const PROMPT = `Heavy — FULL GAME AUDIT follow-up (Jun 2026). Local Cursor completed checklist → verify → playtest → cohesion analysis.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html
Verify: 112/112 · agent loop 9/9 · bird encounter shipped · find tracker shipped · 3 vinyls only

Read the audit below. We need YOUR judgment on next steps and loose ends.

Deliver ONE reply:

## Summary (4-6 sentences)
## Checklist corrections (anything Cursor got wrong about the design)
## Top 5 cohesion improvements (ranked, one sentence + file hint each)
## Removal verdict (A–G from audit Part 4 — keep/cut/defer each)
## Top 5 next implementation tasks (specific, vanilla JS)
## Loose ends still open
## One paragraph for @ninjawhee

Be blunt. No full rewrites.

---
${AUDIT.slice(0, 14000)}`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }

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
if (sent) await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-FULL-AUDIT-SENT.txt', new Date().toISOString());
console.log('full audit sent', sent);
await browser.disconnect();