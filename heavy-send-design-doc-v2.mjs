import puppeteer from 'puppeteer-core';
import fs from 'fs';

const digest = fs.readFileSync('/home/potter/GAME-CODE-DESIGN-DIGEST.md', 'utf8');
const layout = fs.readFileSync('/home/potter/STORE-TILE-LAYOUT-PLAN.md', 'utf8');
const prior = fs.readFileSync('/home/potter/HEAVY-GAME-DESIGN-PASS.md', 'utf8');

const PROMPT = `Heavy — WRITE CANONICAL GAME DESIGN DOCUMENT (code-derived)

I sent 12924 lines of source in 6 chunks but you failed. This message has a STRUCTURED DIGEST of every module + manifest + tile plan + prior design pass.

Read ALL of it. Code is authoritative truth for "∴ EAT THE SOUNDS ∴" (@ninjawhee jazz store game).

Deliver ONE complete markdown document:

# ∴ EAT THE SOUNDS ∴ — Game Design Document

Sections 1-14 as specified before (vision, acts, systems bible, map, content catalog, audio, UI, endings, architecture, principles, gaps, recommendations).

~3500-4500 words. Design director voice. Cite file:symbol behaviors. No raw code.

---

PRIOR DESIGN PASS:
${prior}

---

STORE TILE PLAN:
${layout}

---

FULL CODE DIGEST + MANIFEST:
${digest.slice(0, 95000)}
`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
}, PROMPT);
await page.keyboard.press('Enter');
console.log('sent digest design doc request', PROMPT.length);
await browser.disconnect();