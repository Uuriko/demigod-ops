import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — BUGFIX ROUND 2 (Jun 2026). Cursor applied your 5 patches + agent-loop fix.

VERIFY RESULTS:
- verify-game.mjs: 122/122
- verify-agent.mjs: 10/10
- verify-agent-loop.mjs: 9/9 (was stuck 7min in encore — fixed)
- verify-store.mjs: allPlay true

FIXES SHIPPED:
1. Agent encore auto-finish (10s timer + 2-song cap + 6s bot finishWin)
2. Agent feast bootstrap at 95s if slices short
3. audio-bus snapGains on cleanupRhythmSession
4. game-progress resetSession on returning_visitor boot
5. overworld examineSpot 600ms debounce + async playVinyl await
6. vinyl-audio play() try/catch + disposeFx on fail
7. rhythm-loop liveNodes cap 96
8. agent-bridge faceMirror action + encore polling (no early boot break)
9. verify-agent-loop uses fresh page + Node orchestration

Deliver ONE reply:

## Summary
## Remaining bugs (severity + file + fix)
## Ship verdict

Be blunt.`;

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
fs.writeFileSync('/home/potter/HEAVY-BUGFIX-ROUND2-SENT.txt', new Date().toISOString());
console.log('bugfix round 2 sent');
await browser.disconnect();