import puppeteer from 'puppeteer-core';
import fs from 'fs';

const ow = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const gfx = fs.readFileSync('/home/potter/pixel-gfx.js', 'utf8');
const mapA = ow.match(/const ROOM_A = \[[\s\S]*?\];/)?.[0] || '';
const mapB = ow.match(/const ROOM_B = \[[\s\S]*?\];/)?.[0] || '';
const mapC = ow.match(/const ROOM_C = \[[\s\S]*?\];/)?.[0] || '';
const examines = ow.match(/const EXAMINE_SPOTS = \[[\s\S]*?\];/)?.[0]?.slice(0, 2800) || '';
const vinyl = ow.match(/const VINYL_PICKUPS = \[[\s\S]*?\];/)?.[0] || '';
const npcs = ow.match(/const NPC_DEFS = \[[\s\S]*?\];/)?.[0] || '';
const render = ow.match(/function render\(\)[\s\S]{0,1200}/)?.[0] || '';
const drawTile = ow.match(/function drawTile[\s\S]{0,900}/)?.[0] || '';

const PROMPT = `Heavy — FULL STORE POLISH PASS (think deeply · tile by tile)

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

TASK: You are co-designing with Cursor. Take extra time. Review EVERY part of the 3-room jazz store overworld — each tile, shelf, NPC, examine spot, door, counter, listening booth, vinyl rack, lamp, archway, and feel (walk/interact/audio hints).

CONTEXT SHIPPED:
• Human-only (no agent code)
• Storefront row12: WWWWWWWWWWDDWWWWWWWWWW + NPC door open/close
• STEP_MS 180, easeOutCubic, held-key, mutual talk range 2
• Pinned mutuals soft-collision

MAPS:
${mapA}

${mapB}

${mapC}

${vinyl}

${npcs}

${examines.slice(0, 2000)}

RENDER:
${render.slice(0, 800)}

${drawTile.slice(0, 600)}

Deliver ONE reply (max 500 words + optional \`\`\`js MAP diff):
## Summary (3 sentences)
## ROOM A — entrance (tile edits row/col + why)
## ROOM B — crate stacks (tile edits)
## ROOM C — listening booth (tile edits)
## Examine / vinyl / NPC anchor fixes (x,y per id)
## Visual polish (pixel-gfx bullets)
## Feel (walk 160ms? auto-face? hint throttle?)
## Performance (render skip, cull, throttle — file hints)
## Top 5 implement-now (priority order)
## Ship verdict

Be specific with coordinates. No vague advice.`;

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
  return true;
}, PROMPT);
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-STORE-PASS-SENT.txt', new Date().toISOString());
console.log('store pass prompt sent — waiting for deep reply');
await browser.disconnect();