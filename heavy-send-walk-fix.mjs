import puppeteer from 'puppeteer-core';
import fs from 'fs';

const ow = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const tryMove = ow.match(/function tryMove[\s\S]{0,900}/)?.[0] || '';
const updateMotion = ow.match(/function updateMotion[\s\S]{0,700}/)?.[0] || '';
const canWalk = ow.match(/function canWalkTile[\s\S]{0,500}/)?.[0] || '';
const checkInteract = ow.match(/function checkInteract[\s\S]{0,1400}/)?.[0] || '';
const npcBlock = ow.match(/function npcBlocksPlayer[\s\S]{0,200}/)?.[0] || '';

const PROMPT = `Heavy — TILE WALK + NPC TALK FIX (co-design · Cursor implements)

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

BUGS:
• Cannot talk to visitor/passerby NPCs (vinyl may steal Z priority)
• Walking feels off — want strict tile-based: exactly 1 tile per step, no slide-through
• Player must NOT walk through shelves, walls, or NPC-occupied tiles

CURRENT:
${npcBlock}
${canWalk}
${tryMove.slice(0, 500)}
${updateMotion.slice(0, 450)}
${checkInteract.slice(0, 900)}

PLAYER_WALK_GRID: only . R T P walkable (S shelves blocked)
STEP_MS_PLAYER 162, ease-in-out, held-key poll at 88% of step

Deliver ONE reply (max 500 words + optional \`\`\`js):
## Summary
## Tile walk spec (ms, linear vs snap, hold-key policy, key-repeat)
## Collision rules (NPCs, shelves S, doors D, mid-step)
## Interact priority order (passerby vs vinyl vs pinned mutuals)
## Passerby talk range + facing
## Top 5 code changes (function names)
## Ship verdict`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 120000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }
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

fs.writeFileSync('/home/potter/HEAVY-WALK-FIX-SENT.txt', new Date().toISOString());
console.log('sent walk fix prompt');
await browser.disconnect();