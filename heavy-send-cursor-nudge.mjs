import puppeteer from 'puppeteer-core';

const PROMPT = `Heavy — SHORT ANSWER ONLY (not another design doc)

You replied with design doc again. I need TWO numbered lists:

PART 1: Top 8 next game implementation tasks (file:function, P0 echo/Sarah/mirror fixes first)

PART 2: How to get the most out of Cursor IDE for this vanilla JS canvas game — AGENTS.md contents, Cloud Agents setup, MCP picks, workflow tips, anti-patterns.

Max 800 words total. No sections 1-14. Just the two lists.`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
await page.bringToFront();
await page.evaluate((t) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = t; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
}, PROMPT);
await page.keyboard.press('Enter');
console.log('nudge sent');
await browser.disconnect();