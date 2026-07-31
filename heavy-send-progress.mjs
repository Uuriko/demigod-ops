#!/usr/bin/env node
/** Regular progress report → SuperGrok Heavy (code help + feedback) */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { execSync } from 'child_process';

const GAME_URL = 'http://localhost:8765/ninjawhee-eat-the-sounds.html?v=completionist1';

function read(path, fallback = '') {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fallback;
}

// Optional: refresh playtest before reporting
if (process.argv.includes('--playtest')) {
  try {
    execSync('node /home/potter/completionist-playtest.mjs', { stdio: 'pipe', timeout: 180000 });
  } catch (e) {
    console.log('playtest finished with issues (still reporting)');
  }
}

const playtest = read('/home/potter/HEAVY-COMPLETIONIST-PLAYTEST.md', '(no playtest yet)');
const interior = read('/home/potter/HEAVY-INTERIOR-FIX-FEEDBACK.md', '').slice(-2500);
const heavyFeedback = read('/home/potter/HEAVY-COMPLETIONIST-FEEDBACK.md', '').slice(-2500);

const overworldSnippet = read('/home/potter/overworld.js', '')
  .match(/function (checkInteract|resolveInteractTarget|spawnBirdEncounter|vinylInRange)[\s\S]{0,1200}/g)
  ?.join('\n---\n')
  ?.slice(0, 4000) || '(overworld.js)';

const PROMPT = `Heavy — CURSOR PROGRESS REPORT (regular check-in)

**Goal:** Beat ∴ EAT THE SOUNDS ∴ completionist · interior-only store · walk everywhere except walls · cooperative Cursor + Heavy loop.

**Live:** ${GAME_URL}
**CDP:** 127.0.0.1:9223

## SESSION SHIPPED (Cursor agent)
- Interior-only render (no storefront/door exterior)
- Open-floor collision: perimeter W only, NPCs never block
- Vinyl reach: pad + shelf chebyshev ≤1; pads at moon(4,2) shelter(26,3) mirror(54,2)
- Pad priority: vinyl pad > examine pad > NPC talk pad > proximity
- register_wear pad moved to (14,6) — no Sarah pad conflict
- Bird auto-perches ~2.6s; fixed null crash when bird leaves
- firstOnly examine items guaranteed pickup (store-items.js)
- closeDialogueUI clears pause so movement not stuck after secrets
- completionist-playtest.mjs — automated full run PASS

## COMPLETIONIST PLAYTEST (latest)
${playtest}

## PRIOR HEAVY FEEDBACK (tail)
${heavyFeedback || interior || '(none collected)'}

## KEY CODE (overworld interact/collision)
\`\`\`javascript
${overworldSnippet}
\`\`\`

## OPEN / REMAINING
- walk fail after counter-knock secret: player at (15,4), Sarah pad (15,7) — adjacent Z works
- moon_window + dfjk + mirror_glyph secrets optional for 100%
- album wins counter sometimes 0 after mirror (recordRun timing?)
- passerby visitor_card pickup still RNG

**Please reply:**
## Summary (1 paragraph)
## Top 3 fixes — code patches if needed (functions only)
## Completionist — anything still blocking 100%?
## Copy/dialogue tweaks if any
## Next sprint: assign Grok vs Cursor vs Heavy (3 tasks each)
## Ship verdict`;

async function sendText(page, text) {
  await page.bringToFront();
  const ok = await page.evaluate((t) => {
    const el = document.querySelector('textarea, [contenteditable="true"]');
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA') { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }
    else { el.textContent = t; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
    return true;
  }, text);
  if (ok) await page.keyboard.press('Enter');
  return ok;
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab — start Chrome CDP first');
  process.exit(1);
}
const sent = await sendText(page, PROMPT);
fs.writeFileSync('/home/potter/HEAVY-PROGRESS-SENT.txt', `${new Date().toISOString()}\n${sent ? 'sent' : 'failed'}`);
console.log(sent ? 'progress report sent to Heavy' : 'send failed');
await browser.disconnect();