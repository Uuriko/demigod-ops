import puppeteer from 'puppeteer-core';

const PROMPT = `Heavy — FINAL REQUEST: Write the Game Design Document NOW.

You received:
- 12924 lines source in 6 chunks
- A 105k structured CODE DIGEST with manifest

Do NOT ask for more code. Synthesize the canonical GAME DESIGN DOCUMENT for ∴ EAT THE SOUNDS ∴.

Use the 14-section structure (vision, acts, systems bible, map, content, audio, UI, endings, architecture, principles, gaps, recommendations).

3500+ words. Markdown. Code-derived truth. @ninjawhee tone.`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/')) || (await browser.pages()).find((p) => p.url().includes('grok.com'));
await page.bringToFront();
await page.evaluate((t) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = t; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
}, PROMPT);
await page.keyboard.press('Enter');
console.log('sent final nudge');
await browser.disconnect();