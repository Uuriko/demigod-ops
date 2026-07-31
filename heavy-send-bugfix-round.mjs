import puppeteer from 'puppeteer-core';
import fs from 'fs';

const TREE = [
  'ninjawhee-eat-the-sounds.html', 'overworld.js', 'vinyl-audio.js', 'audio-bus.js',
  'vinyl-echo-bridge.js', 'rhythm-loop.js', 'game-progress.js', 'easter-eggs.js', 'heavy-runtime.js',
].map((f) => `--- ${f} ---\n${fs.readFileSync(`/home/potter/${f}`, 'utf8').slice(0, 12000)}`).join('\n\n');

const PROMPT = `Heavy — BUGFIX ROUND (Jun 2026). Cursor found 32 issues in code review. Implementing top fixes now. Need your judgment on remaining + any we missed.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

FIXES CURSOR IS APPLYING:
1. closeDialogueUI/openDialogueUI — clear typeTimer, _afterYou, echo beat timer
2. handleEggUnlock — closeDialogueUI before stacking secret dialogue
3. advanceToNextSong — rhythmHandoffGen guard on setTimeout start
4. onListenVinyl — recordPreview/recordVinyl AFTER play succeeds
5. checkMisses — hold miss uses chewingStart not note.time
6. vinyl-audio — disposeFx on hardStop/init
7. stopVinyl — optimistic clearListening before fade
8. drawSecretSpotHints — GameProgress listens not session echo
9. resolveBirdEncounter — birdEncounterDone only when bird gone
10. examineSpot nested toasts → scheduleVinylToast
11. verify-game reloadFromStorage after localStorage seed

REVIEW SNIPPETS (truncated):
${TREE.slice(0, 10000)}

Deliver ONE reply:

## Summary
## Bugs we missed (severity + file:function + fix)
## Fixes to REVERT or refine (if any of ours are wrong)
## Top 5 more quick fixes (one line + file each)
## Ship verdict

Be blunt. \`\`\`js blocks ONLY for critical fixes we still need.`;

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
fs.writeFileSync('/home/potter/HEAVY-BUGFIX-SENT.txt', new Date().toISOString());
console.log('bugfix prompt sent');
await browser.disconnect();