import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OW = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const moveBlock = OW.match(/function tryMove[\s\S]{0,900}/)?.[0] || '';
const npcBlock = OW.match(/function playerFacingNpc[\s\S]{0,700}/)?.[0] || '';
const mapBlock = OW.match(/const ROOM_A = \[[\s\S]{0,500}/)?.[0] || '';

const PROMPT = `Heavy — WALK FLOOR + ORPH TALK + JERKY MOVEMENT (round 2)

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

USER COMPLAINTS (still):
1) Hard to talk to orph in entrance room
2) Large unwalkable floor areas — bottom-left, upper-right, center room A
3) Must walk every floor tile; shelves/objects must stay solid
4) Walking still feels jerky

JUST SHIPPED (Cursor):
• ROOM_A aisle widen — removed tight SS clusters rows 1-3, 8-9, 11
• STEP_MS_PLAYER 180 + easeOutCubic + 82% step chain poll
• tryMove aborts mid-step on direction change
• Pinned mutuals (orph/simon/honey): soft collision for player, MUTUAL_INTERACT_RANGE=2
• checkInteract + resolveInteractTarget: pinned mutual beats vinyl/examine

SNIPPETS:
${mapBlock}

${moveBlock}

${npcBlock}

Deliver ONE reply (max 220 words + optional \`\`\`js):
1) 6–8 bullets: ranked fixes if anything still wrong (orph talk UX, floor audit, shelf solidity, jerk)
2) Any remaining MAP tile edits (row/col)
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
fs.writeFileSync('/home/potter/HEAVY-WALK-FLOOR2-SENT.txt', new Date().toISOString());
console.log('walk-floor2 prompt sent');
await browser.disconnect();