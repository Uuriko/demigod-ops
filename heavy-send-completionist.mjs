import puppeteer from 'puppeteer-core';
import fs from 'fs';

const playtest = fs.existsSync('/home/potter/HEAVY-COMPLETIONIST-PLAYTEST.md')
  ? fs.readFileSync('/home/potter/HEAVY-COMPLETIONIST-PLAYTEST.md', 'utf8')
  : '(playtest not run yet)';

const PROMPT = `Heavy — COMPLETIONIST BEAT-THE-GAME GOAL (Jun 2026)

**Cursor agent goal:** Beat ∴ EAT THE SOUNDS ∴ in a completionist manner — interact with absolutely everything possible. If stuck, fix the game cohesively and retry.

**Interactables checklist:**
- 3 vinyl spins (moon · shelter · mirror) on glow pads
- Talk orph · simon · honey · sarah (register)
- 12 examine spots + 9 mutual find traces (3 each)
- Inventory items from examines + passerby + bird feather
- Use items at correct examine spots
- Secrets: moon window · door mat · counter knock · mirror glyph · dfjk · bird
- Side quests: 6+ items · 4+ secrets
- Sarah → drop the needle → 15 rhythm slices → mirror choice → aftermath store

Game: http://localhost:8765/ninjawhee-eat-the-sounds.html?v=completionist1

PLAYTEST RESULT:
${playtest}

Please reply:
## Summary
## Completionist blockers (what stops 100% interact)
## Cohesive fixes (code patches if needed)
## Rhythm/aftermath path — clear?
## Ship verdict for completionist run`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(1); }
await page.bringToFront();
const sent = await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  return true;
}, PROMPT);
if (sent) await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-COMPLETIONIST-SENT.txt', new Date().toISOString());
console.log('completionist prompt sent');
await browser.disconnect();