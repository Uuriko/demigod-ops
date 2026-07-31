import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9223';
const digest = fs.readFileSync('/home/potter/GAME-CODE-DESIGN-DIGEST.md', 'utf8');
const layout = fs.readFileSync('/home/potter/STORE-TILE-LAYOUT-PLAN.md', 'utf8');
const prior = fs.readFileSync('/home/potter/HEAVY-GAME-DESIGN-PASS.md', 'utf8');
const stats = JSON.parse(fs.readFileSync('/home/potter/GAME-CODE-BUNDLE-STATS.json', 'utf8'));

const PROMPT = `Heavy — CANONICAL GAME DESIGN DOCUMENT (code-derived truth)

Write the complete GAME DESIGN DOCUMENT for "∴ EAT THE SOUNDS ∴" (@ninjawhee jazz store browser game).

Source: ${stats.totalLines} lines across ${stats.files} files. This digest summarizes EVERY module — treat it as authoritative.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

Deliver ONE markdown document with these 14 sections:
1. Vision & emotional thesis
2. Player fantasy & tone
3. Core loop diagram
4. Act-by-act design (Intro, Store, Counter/Sarah, Rhythm, Aftermath, Secrets)
5. Systems bible (movement, dialogue, vinyl/echoes, rhythm, progression, inventory, journal, easter eggs, pixel art)
6. Store map & interaction pads
7. Content catalog
8. Audio design
9. UI/HUD
10. Failure states & endings
11. Technical architecture
12. Design principles from code
13. Known gaps
14. Future recommendations

3500-4500 words. @ninjawhee voice. Cite file:function behaviors. No raw code dumps.

---
PRIOR DESIGN PASS:
${prior}

---
STORE TILE PLAN:
${layout}

---
CODE DIGEST (${digest.length} chars):
${digest.slice(0, 105000)}
`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getAssistantTexts(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-testid="message"], article, .markdown, .prose')];
    return nodes.map((n) => (n.innerText || '').trim()).filter((t) => t.length > 200);
  });
}

async function sendText(page, text) {
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

const browser = await puppeteer.connect({ browserURL: CDP, protocolTimeout: 300000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  page = await browser.newPage();
  await page.goto('https://grok.com', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
}

await page.bringToFront();
const before = await getAssistantTexts(page);
const beforeLen = before.join('').length;

console.log('Sending digest prompt...', PROMPT.length, 'chars');
await sendText(page, PROMPT);
fs.writeFileSync('/home/potter/HEAVY-DESIGN-DOC-DIGEST-SENT.txt', `${new Date().toISOString()} prompt=${PROMPT.length}`);

let best = '';
let stable = 0;
for (let i = 0; i < 120; i++) {
  await sleep(3000);
  const texts = await getAssistantTexts(page);
  const last = texts.at(-1) || '';
  const fail = last.includes('unable to finish') || last.includes('No response');
  if (fail) {
    console.log('Heavy failed at', i * 3, 's');
    break;
  }
  if (last.includes('## 1.') || last.includes('# ∴ EAT THE SOUNDS') || last.includes('Game Design Document')) {
    if (last.length > best.length) best = last;
    if (last.length === best.length) stable++;
    else stable = 0;
    console.log(`t=${i * 3}s len=${last.length} stable=${stable}`);
    if (stable >= 4 && last.length > 8000) break;
  }
}

if (!best) {
  const texts = await getAssistantTexts(page);
  best = texts.filter((t) => !before.includes(t)).at(-1) || texts.at(-1) || '';
}

if (best.length > beforeLen + 500) {
  fs.writeFileSync('/home/potter/GAME-DESIGN-DOC-HEAVY.md', best);
  console.log('saved GAME-DESIGN-DOC-HEAVY.md', best.length);
} else {
  console.log('no substantial Heavy reply', best.length);
}

await browser.disconnect();