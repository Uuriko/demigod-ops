import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — LOOSE ENDS + URGENCY CHECK (Jun 2026)

Game: http://localhost:8765/ninjawhee-eat-the-sounds.html

CURRENT VERIFY (all green):
- verify-game 122/122
- verify-agent 10/10
- verify-agent-loop 9/9 (~54s full loop)
- verify-store allPlay
- verify-dialogue, verify-loops, verify-vinyl-audio OK

SHIPPED SINCE FULL AUDIT:
- Find progress in mutual revisit dialogue (enrichDialogueNode)
- Album % breakdown on mirror + end (getAlbumBreakdown)
- Bird → echo orb + Sarah toast
- Encore Sarah stinger between songs
- Trimmed 1 revisit branch per mutual (orph/simon/honey)
- Agent encore auto-finish + feast bootstrap
- audio-bus snapGains, examineSpot debounce, vinyl play catch
- returning_visitor resetSession + echo seed reset

DEFERRED PER YOUR PRIOR VERDICT:
- Decorative examine spots (neon_hum, lamp_dust, register_wear)
- Human playtest for rhythm feel + bird 8 paths

QUESTIONS:
1. What loose ends STILL block ship to @ninjawhee?
2. Anything URGENT to add before she plays? (not nice-to-have)
3. Anything we should NOT add (scope creep)?
4. Top 3 tasks if we do one more 2-hour sprint — file hints only
5. Ship verdict: play tonight / polish first / wait

Deliver ONE reply:

## Summary
## Urgent (must do before human playtest)
## Loose ends (can defer)
## Do NOT add
## 2-hour sprint (if any)
## Ship verdict

Be blunt. No code blocks unless one critical fix remains.`;

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
fs.writeFileSync('/home/potter/HEAVY-LOOSE-ENDS-ROUND2-SENT.txt', new Date().toISOString());
console.log('loose ends prompt sent');
await browser.disconnect();