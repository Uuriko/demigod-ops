import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds bugfix + code review round 6.

Play fresh + veteran save: http://localhost:8765/ninjawhee-eat-the-sounds.html

Fixed locally:
- Sarah Grok PNG portrait: boot waits for load; veterans get returning_visitor dialogue (no silent overworld skip)
- isGrokPortraitReady / whenGrokPortraitReady API; redraw on load
- Mirror choice: click selects only, Z/Enter confirms (was auto-confirm on click)

Review for remaining bugs. ONE reply:
## Summary
## Bugs (severity, file:function, fix)
## Portrait-at-open OK?
## Ship/no-ship`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
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
fs.writeFileSync('/home/potter/HEAVY-PORTRAIT-REVIEW-SENT.txt', new Date().toISOString());
console.log('portrait review sent');
await browser.disconnect();