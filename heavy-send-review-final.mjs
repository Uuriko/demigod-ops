import puppeteer from 'puppeteer-core';
import fs from 'fs';

const TREE = [
  'ninjawhee-eat-the-sounds.html', 'overworld.js', 'game-progress.js', 'agent-bridge.js',
  'audio-bus.js', 'vinyl-audio.js', 'vinyl-echo-bridge.js', 'rhythm-loop.js', 'easter-eggs.js', 'heavy-runtime.js',
].map((f) => `--- ${f} ---\n${fs.readFileSync(`/home/potter/${f}`, 'utf8').slice(0, 9000)}`).join('\n\n');

const PROMPT = `Heavy — FINAL CODE REVIEW + BUGFIX (Jun 2026)

Play: http://localhost:8765/ninjawhee-eat-the-sounds.html

VERIFY: game 125/125 · agent 10/10 · agent-loop 9/9 · store allPlay

JUST SHIPPED (sprint):
- GameProgress find quest persistence (setFindCounts, isFindQuestComplete)
- Sarah 9/9 find lines on aftermath return
- albumPctEnd on end overlay (two-line breakdown)
- Passerby v7 whole-albums poetry line
- Agent encore auto-finish, faceMirror, fresh-page loop

PRIOR FIXES IN TREE:
- Mirror keep/pass after feast + encore cap
- enrichDialogueNode find revisit + album breakdown
- Bird echo orb, audio-bus snapGains, vinyl play catch
- returning_visitor resetSession

HUNT REAL BUGS. file:function for each. Focus:
1) findCounts reset on aftermath vs fresh store — persistence races
2) albumPctEnd innerHTML + endSummary duplication
3) GameProgress.resetFindQuest on every non-aftermath start — veteran revisit
4) mirror / feast / agent bot edge cases
5) audio/timer leaks on 3+ loops
6) dialogue timer stacking on egg unlock during mirror

Deliver ONE reply:

## Summary
## Bugs (severity + file:function + fix)
## Code review notes (non-blocking)
## Top 3 fixes to implement now (one line + file each)
## Ship verdict

Be blunt. \`\`\`js blocks ONLY for critical fixes we must apply.`;

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
fs.writeFileSync('/home/potter/HEAVY-REVIEW-FINAL-SENT.txt', new Date().toISOString());
console.log('review prompt sent');
await browser.disconnect();