import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OW = fs.readFileSync('/home/potter/overworld.js', 'utf8');
const walkBlock = OW.match(/function isWalkableTile[\s\S]{0,500}/)?.[0] || '';
const canWalkBlock = OW.match(/function canWalkTile[\s\S]{0,450}/)?.[0] || '';
const renderBlock = OW.match(/function render\(\) \{[\s\S]{0,900}/)?.[0] || '';

const PROMPT = `Heavy — WALK/PATH/COLLISION + PERF + TEXT UX for eat-the-sounds overworld.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

USER REQUESTS:
1) Fix walking and pathing issues
2) Player CANNOT walk outside — only NPCs (passersby) enter/exit via door
3) Solid collision — no walking onto/through vinyl shelves (S), counter (C), walls
4) Find bloated/slow code — faster, more efficient render loop
5) Text display neater and more readable (toasts, hints, HUD)

CURRENT CODE:
• D door tiles ARE walkable for player (isWalkableTile includes D) — player can step on y=12 door
• S/C/W blocked · passerby spawn at door y=11, path exit to door
• held-key poll + BFS findPath · STEP_MS_PLAYER=220
• render(): rAF every frame, draw all tiles, updateHint every 6 frames, resolveInteractTarget in drawInteractBubble
• Text: 4-7px Press Start 2P, single-line fillText, width = charCount*5 (overflow on long toasts)

${walkBlock}

${canWalkBlock}

${renderBlock}

Deliver ONE reply (max 300 words + optional \`\`\`js):
1) 8–10 bullets: walk/path fixes (player vs NPC collision layers, door policy, shelf hardening, path abort)
2) 6–8 bullets: performance wins (what to cache, skip, throttle — file hints)
3) 6 bullets: text UX (wrap, line height, hint bar, toast stack)
4) What NOT to break
5) One sentence ship verdict

No prose after bullets.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  return true;
}, PROMPT);
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-WALK-PERF-SENT.txt', new Date().toISOString());
console.log('walk-perf prompt sent');
await browser.disconnect();