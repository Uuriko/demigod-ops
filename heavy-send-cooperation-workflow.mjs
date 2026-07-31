import puppeteer from 'puppeteer-core';
import fs from 'fs';

const sprint = `
SPRINT JUST SHIPPED (local Grok):
1. resolveNpcDialogue — mutual revisits route by findCounts (revisit_find_1/2/3 per orph/simon/honey)
2. overworld.js resolveBirdEncounter — onBirdGuide callback → VinylEchoBridge.recordBirdGuide
3. return forest — return_finds_complete Sarah node when GameProgress.isFindQuestComplete()
4. advanceToNextSong — encore Sarah stinger already present (verified)

OPEN P0 (Heavy-ranked from audits):
- Album % breakdown visible on end screen
- Mirror choice album % consequence in confirm UI
- Gold pad markers polish
- Human rhythm playtest for feel
`;

const PROMPT = `Heavy — COOPERATION WORKFLOW DESIGN

Three agents are shipping "∴ EAT THE SOUNDS ∴" (@ninjawhee jazz store browser game):

1. **Local Grok (Cursor IDE agent)** — code-truth audits, targeted fixes, writes Heavy prompts, runs CDP playtests
2. **Cursor Cloud Agents** — multi-file implementation loops on eat-the-sounds repo (github.com/Uuriko/crispy-garbanzo fallback)
3. **SuperGrok Heavy (you)** — ship verdict, dialogue copy, cut list, sprint priority, soul checks

Live game: http://localhost:8765/ninjawhee-eat-the-sounds.html
Stack: vanilla HTML + 11 JS modules, CDP port 9223, no bundler

${sprint}

**YOUR TASK:** Design the optimal cooperation workflow so all three stay busy with USEFUL work and never duplicate effort.

Deliver:

## A. Role split (who owns what)
Clear boundaries: audit vs implement vs playtest vs dialogue copy vs ship verdict

## B. Discovery pipeline (how to find NEW problems)
Concrete methods: verify scripts, CDP console checks, playtest scripts, cohesion matrix, manifest diff, etc.

## C. Fix pipeline (how to fix problems elegantly)
One-file rule, cache bust, sync eat-the-sounds/, when to consult Heavy for copy vs ship autonomously

## D. Weekly/daily rhythm
What order to run: Heavy audit → Grok implement → Cursor verify → Heavy verdict

## E. Parallel task board (NEXT 6 tasks)
Assign each task to Grok OR Cursor OR Heavy with one-line acceptance criteria

## F. Anti-patterns
What each agent should NOT do (scope traps, duplicate audits, huge chunk sends)

## G. Prompt templates
3 copy-paste prompts: one for Heavy, one for Cursor Cloud Agent, one for local Grok

Soul-first. Small scope. @ninjawhee tone. Be blunt and practical — not generic agile advice.`;

async function sendText(page, text) {
  await page.bringToFront();
  const ok = await page.evaluate((t) => {
    const el = document.querySelector('textarea, [contenteditable="true"]');
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      el.value = t;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.textContent = t;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    return true;
  }, text);
  if (!ok) throw new Error('no textarea');
  await page.keyboard.press('Enter');
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/')) ||
  (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) throw new Error('no grok tab');

console.log('Sending cooperation workflow request...', PROMPT.length);
await sendText(page, PROMPT);
fs.writeFileSync('/home/potter/HEAVY-COOPERATION-WORKFLOW-SENT.txt', `${new Date().toISOString()} chars=${PROMPT.length}`);
console.log('sent');
await browser.disconnect();