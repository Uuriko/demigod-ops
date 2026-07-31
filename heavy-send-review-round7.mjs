import puppeteer from 'puppeteer-core';
import fs from 'fs';

const FILES = [
  'ninjawhee-eat-the-sounds.html',
  'overworld.js',
  'agent-bridge.js',
  'game-progress.js',
  'easter-eggs.js',
  'vinyl-echo-bridge.js',
  'audio-bus.js',
  'vinyl-audio.js',
  'heavy-runtime.js',
  'rhythm-loop.js',
  'pixel-gfx.js',
  'heavy-dialogue-art.js',
];

const digest = FILES.map((f) => {
  const p = `/home/potter/${f}`;
  if (!fs.existsSync(p)) return null;
  const lines = fs.readFileSync(p, 'utf8').split('\n').length;
  return `- ${f} (${lines} lines)`;
}).filter(Boolean).join('\n');

const VERIFY = `
verify-game.mjs: 74/74 pass
verify-agent.mjs: 10/10 pass
verify-agent-loop.mjs: 9/9 pass (full loop ~82s)
`;

const PROMPT = `Heavy — CODE REVIEW round 7 + BUGFIX assist. THOROUGH. Bugs only — not design.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html?agent=1

## Stack (${FILES.length} files)
${digest}

${VERIFY}

## Recent ships (review these areas hard)
- Agent API: __agentProbe, __agentAct, __agentRunFullLoop, ?agent=1
- Adjacency override in playerFacingNpc (agent mode only)
- 3 vinyls, intro auto-advance, jam_hex cut
- Mirror keep/pass, aftermath tiers, echo bridge
- Portrait HEAD resolve, bootGame portrait gate

## Known edges from prior Heavy rounds (confirm fixed or still open)
1. mirrorChoiceConfirm double-fire on key repeat after click
2. echoSeeds not cleared on veteran reload → unintended rhythm boost
3. returning_visitor placeholder silhouette flash before portrait redraw
4. recordRun timing vs mirror confirm
5. cleanupRhythmSession particle/liveNode creep after 4+ loops
6. audio bleed on end screen → store transition

## Your task — CODE REVIEWER mode
Reply EXACTLY:

## Summary
2-4 sentences: ship-ready or not, dominant risk.

## Bugs (ranked, max 12)
Each: severity (critical/major/minor) · file:area · what's wrong · one-line fix hint

## Fixes to implement NOW (max 8, vanilla JS)
Numbered. Specific. Which file. No fluff.

## verify additions (max 5)
New assertions for verify-game.mjs or verify-agent-loop.mjs

## Ship verdict
one word + one sentence

Optional: ONE \`\`\`js code block if a tiny helper is critical.

No @ninjawhee paragraphs. No arc map. No design thesis.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }

await page.bringToFront();
const filled = await page.evaluate((text) => {
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
if (!filled) { console.log('could not fill'); process.exit(1); }
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-REVIEW-ROUND7-SENT.txt', new Date().toISOString());
console.log('review round 7 sent', PROMPT.length);
await browser.disconnect();