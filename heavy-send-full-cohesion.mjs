import puppeteer from 'puppeteer-core';
import fs from 'fs';

const digest = fs.existsSync('/home/potter/GAME-CODE-DESIGN-DIGEST.md')
  ? fs.readFileSync('/home/potter/GAME-CODE-DESIGN-DIGEST.md', 'utf8').slice(0, 4500)
  : '(no digest)';

const audit = fs.existsSync('/home/potter/HEAVY-COHESION-AUDIT.md')
  ? fs.readFileSync('/home/potter/HEAVY-COHESION-AUDIT.md', 'utf8').slice(0, 2000)
  : '';

const PROMPT = `Heavy — FULL GAME COHESION PASS (Jun 2026)

Game: http://localhost:8765/ninjawhee-eat-the-sounds.html?v=cohesion1

GOAL: One blunt review of the ENTIRE game — main quest path to completion, optional side content, visual/audio feedback consistency, loose ends, bugs, perf. Keep fun + simple. No scope creep.

MAIN PATH (design truth):
1. Intro → store explore
2. Meet orph / simon / honey
3. Spin vinyl → echo orbs (quest-echo)
4. Optional: 9 find traces (3 per mutual) → Sarah return_finds_complete
5. Sarah at register (hidden until vinyl or mutual talk)
6. Rhythm 15 slices → mirror choice (keep/pass)
7. Aftermath return by tier

NEW THIS SPRINT:
- store-events.js: ambient events + passerby enter toasts + side quests (6 items, 4 secrets)
- pause-journal: main quest tracker in Esc inventory + onStoreEvent
- Audio blips: __eatItemPickupBlip, __eatAmbientBlip on pickup/ambient
- overworld: StoreEvents.tick every 45 frames, onPasserbyEnter on spawn
- dust_vial useAt lamp_dust fixed
- Ripples capped at 24 in rhythm

AUDIT SNAPSHOT:
${audit}

DESIGN DIGEST (truncated):
${digest}

QUESTIONS:
1. Is the main quest path CLEAR to a first-time player? What's still muddy?
2. Visual/audio: what feedback is WRONG or missing vs intended behavior? (P0 list)
3. Loose ends: unused items, dead dialogue nodes, orphaned examines, broken hooks?
4. Side content: enough optional fun without blocking main? What 1-2 simple additions max?
5. Bugs/perf: top 3 fixes before @ninjawhee plays tonight?
6. Ship verdict: play tonight / one more sprint / wait

Deliver ONE reply:

## Summary
## Main path clarity
## P0 visual/audio fixes
## Loose ends (urgent vs defer)
## Optional side content (max 2 ideas)
## Bugs & perf
## Ship verdict

Be blunt. File hints only, no big code dumps.`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }
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
fs.writeFileSync('/home/potter/HEAVY-FULL-COHESION-SENT.txt', new Date().toISOString());
console.log('full cohesion prompt sent');
await browser.disconnect();