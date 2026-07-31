import puppeteer from 'puppeteer-core';
import fs from 'fs';

const ow = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const html = fs.readFileSync('/home/potter/ninjawhee-eat-the-sounds.html', 'utf8');
const gp = fs.readFileSync('/home/potter/game-progress.js', 'utf8');
const bridge = fs.readFileSync('/home/potter/vinyl-echo-bridge.js', 'utf8');

const render = ow.match(/function render\(\)[\s\S]{0,1800}/)?.[0] || '';
const updateHint = ow.match(/function updateHint\(\)[\s\S]{0,1200}/)?.[0] || '';
const drawHud = bridge.match(/function drawOverworldHud[\s\S]{0,900}/)?.[0] || '';
const examines = ow.match(/const EXAMINE_SPOTS = \[[\s\S]*?\];/)?.[0]?.slice(0, 2000) || '';
const npcs = ow.match(/const NPC_DEFS = \[[\s\S]*?\];/)?.[0] || '';

const PROMPT = `Heavy — PAUSE MENU · JOURNAL · INVENTORY (co-design with Cursor)

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

HUMAN REQUEST:
1. REMOVE confusing bottom-left tracker (ECHO→RHYTHM HUD + find-quest dots HUD)
2. Make [Z] talk/examine hints BIGGER and friendlier (currently 6px canvas text)
3. ADD keyboard pause screen with INVENTORY + JOURNAL
4. Journal auto-updates: talks, examines, events, occasional PC thoughts + suggested next steps

CURRENT HUD (remove):
${drawHud.slice(0, 700)}

HINT SYSTEM:
${updateHint.slice(0, 900)}

RENDER HOOKS:
${render.slice(0, 600)}

NPCs:
${npcs}

EXAMINE (sample):
${examines.slice(0, 1200)}

GameProgress persists vinyl/npcs/secrets/findCounts.

Deliver ONE reply (max 550 words + optional \`\`\`js snippets):
## Summary
## Pause key + UX (open/close, blocks movement?, rhythm too?)
## Layout wire (journal tab · inventory tab · typography)
## Journal entry types + example lines (talk/examine/event/thought/quest)
## Thought cadence rules (when PC muses, next-step nudges)
## Inventory items list (what belongs, what stays hidden)
## Interact hint redesign (copy examples: "Press Z to talk to Orph")
## What to migrate from old HUD (echo orbs → journal only?)
## Top 5 implement-now (priority)
## Ship verdict`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 120000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(1);
}
await page.bringToFront();
await page.evaluate((text) => {
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
  const btn = [...document.querySelectorAll('button')].find((b) => /send|submit/i.test(b.textContent || b.getAttribute('aria-label') || ''));
  btn?.click();
  return true;
}, PROMPT);

fs.writeFileSync('/home/potter/HEAVY-PAUSE-JOURNAL-SENT.txt', new Date().toISOString());
console.log('sent pause/journal prompt to Heavy');
await browser.disconnect();