import puppeteer from 'puppeteer-core';
import fs from 'fs';

const files = {
  overworld: fs.readFileSync('/home/potter/overworld.js', 'utf8'),
  html: fs.readFileSync('/home/potter/ninjawhee-eat-the-sounds.html', 'utf8'),
  pixel: fs.readFileSync('/home/potter/pixel-gfx.js', 'utf8'),
};
const snippets = {
  map: files.overworld.match(/const ROOM_A = \[[\s\S]{0,420}/)?.[0] || '',
  walk: files.overworld.match(/function tryMove[\s\S]{0,650}/)?.[0] || '',
  door: files.overworld.match(/function updateStoreDoor[\s\S]{0,550}/)?.[0] || '',
  render: files.overworld.match(/function render\(\)[\s\S]{0,500}/)?.[0] || '',
  rhythm: files.html.match(/function loop\(\)[\s\S]{0,450}/)?.[0] || '',
};

const PROMPT = `Heavy — CODE REVIEW: pathing, smoothness, performance (human play only)

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

CONTEXT:
- Removed all agent/automated playtest code (?agent=1, puppeteer verifies, agent-bridge)
- Storefront row 12 now wall + DD door; passersby open door visually on enter/leave
- Player cannot exit; NPCs use D tiles via NPC_WALK_GRID
- STEP_MS_PLAYER=180, easeOutCubic, held-key poll, step abort on turn

REVIEW GOALS:
1) Pathing / collision / door policy — any remaining stuck tiles or jerk?
2) Smoother human feel — movement, dialogue, rhythm transitions
3) Faster + lighter — render loop, audio, particles, redundant work — WITHOUT hurting UX

SNIPPETS:
${snippets.map}

${snippets.walk}

${snippets.door}

${snippets.render}

Deliver ONE reply (max 320 words):
## Summary
## Pathing + smoothness (6–8 bullets, file:function hints)
## Performance wins (6–8 bullets, file hints)
## Do NOT change
## Top 3 implement-now (one line each)
## Ship verdict

Be blunt. Optional \`\`\`js only for one critical fix.`;

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
fs.writeFileSync('/home/potter/HEAVY-PERF-REVIEW-SENT.txt', new Date().toISOString());
console.log('perf review prompt sent');
await browser.disconnect();