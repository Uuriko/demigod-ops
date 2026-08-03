import puppeteer from 'puppeteer-core';
import fs from 'fs';

const digest = fs.readFileSync('/home/potter/GAME-CODE-DESIGN-DIGEST.md', 'utf8').slice(0, 12000);
const design = fs.readFileSync('/home/potter/GAME-DESIGN-DOC-HEAVY.md', 'utf8').slice(0, 6000);
const gaps = `
P0 gaps from design doc:
- Echo onboarding toast chain before Sarah gate
- Sarah visibility gating (hidden until first vinyl or mutual)
- Album % consequence in mirror choice UI
`;

const PROMPT = `Heavy — TWO-PART HELP REQUEST (game + Cursor IDE)

Local Grok is setting up Cursor IDE to help ship "∴ EAT THE SOUNDS ∴" (@ninjawhee jazz store browser game).

Live game: http://localhost:8765/ninjawhee-eat-the-sounds.html
Repo: /home/potter/eat-the-sounds (also copies in /home/potter/)
Stack: vanilla HTML canvas + 11 JS modules, no bundler, CDP playtest on port 9223

PART 1 — Game help (soul-first, small scope)
What are the top 8 highest-impact next steps to ship this game? Prioritize P0 clarity fixes (echo onboarding, Sarah gate, mirror/album %). Be specific: file:function, implementable in one session each.

PART 2 — Cursor IDE mastery
How should the developer get the MOST out of Cursor for THIS project specifically?
Cover:
- AGENTS.md / .cursor/rules content (what to put in project rules)
- Cloud Agents vs local Agent — when to use which for game work
- MCP servers worth enabling (chrome-devtools for CDP playtest?)
- Composer vs Agent workflow for multi-file JS game
- Prompt patterns that work for canvas games + audio modules
- What NOT to do (scope traps, refactors to avoid)

Deliver numbered lists for both parts. @ninjawhee tone in game recs. Practical Cursor setup, not generic IDE advice.

---
DESIGN DOC EXCERPT:
${design}

---
CODE DIGEST EXCERPT:
${digest}

---
${gaps}`;

async function sendText(page, text) {
  await page.bringToFront();
  const ok = await page.evaluate((t) => {
    const el = document.querySelector('textarea, [contenteditable="true"]');
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      el.value = t;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.textContent = t;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    return true;
  }, text);
  if (!ok) throw new Error('no textarea');
  await page.keyboard.press('Enter');
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/')) ||
  (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) throw new Error('no grok tab');

console.log('Sending Cursor+game help request...', PROMPT.length);
await sendText(page, PROMPT);
fs.writeFileSync('/home/potter/HEAVY-CURSOR-GAME-SENT.txt', `${new Date().toISOString()} chars=${PROMPT.length}`);
console.log('sent');
await browser.disconnect();