import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OW = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const moveBlock = OW.match(/function handleKey[\s\S]{0,1200}/)?.[0] || '(see overworld.js)';
const walkBlock = OW.match(/function isWalkableTile[\s\S]{0,400}/)?.[0] || '';
const mapBlock = OW.match(/const ROOM_A = \[[\s\S]{0,900}/)?.[0] || '';

const PROMPT = `Heavy — SMOOTH WALK FIX for eat-the-sounds jazz store overworld.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

USER COMPLAINTS:
1) Holding WASD/arrows should walk smoothly — currently feels jerky / stops after one tile
2) Tapping a key should walk exactly one tile (set distance)
3) Player can walk through vinyl racks / shelves — should be solid
4) Some floor tiles feel unwalkable (gaps, door area, narrow aisles)

CURRENT MOVEMENT:
• Grid steps with smoothstep easing, STEP_MS_PLAYER=275ms
• keydown only → tryMove; while mid-step queues ONE playerPending step
• No keyup tracking, no render-loop held-key poll
• isWalkableTile: . R T P only — S W C blocked; D door tiles NOT walkable (y=12 cols 10-11)
• honey NPC pinned at (36,9) which is S shelf tile in MAP

SNIPPETS:
${walkBlock}

${moveBlock}

${mapBlock}

Deliver ONE reply (max 200 words + optional \`\`\`js patch):
1) 6–8 bullets: ranked fixes (held-key model, tap vs repeat, step timing, collision hardening, MAP aisle/door edits) — be specific
2) Minimal MAP diff rows if needed (which tiles to change)
3) One sentence ship verdict

No prose after bullets.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(1);
}
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
if (!sent) {
  const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
  await input.click();
  await page.keyboard.type(PROMPT.slice(0, 800), { delay: 1 });
}
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-SMOOTHWALK-SENT.txt', new Date().toISOString());
console.log('smoothwalk prompt sent');
await browser.disconnect();