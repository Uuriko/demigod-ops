import puppeteer from 'puppeteer-core';
import fs from 'fs';

const design = fs.readFileSync('/home/potter/GAME-DESIGN-DOC.md', 'utf8').slice(0, 8000);
const gaps = fs.readFileSync('/home/potter/HEAVY-CURSOR-GAME-FEEDBACK.md', 'utf8');

const PROMPT = `Heavy — MASTER AUDIT: design coherence + loose ends + discovery process

Local Grok + Cursor cloud agents are doing a slow expert pass on ∴ EAT THE SOUNDS ∴.
Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

Recent ships: Sarah hidden-until-vinyl/mutual, echo onboarding toast + quest-echo journal, mirror album breakdown hint, Cursor agents working on end screen.

Deliver ONE reply:

## 1. Ship verdict (ready / not ready + why in 3 sentences)

## 2. Plot coherence audit
Does intro → mutuals → vinyl echoes → Sarah gate → rhythm → mirror → aftermath tell ONE story? Flag any incoherent beats.

## 3. Top 10 fixes still needed (ranked, file:function, one line each)

## 4. Expert designer checklists
Give 3 checklists an expert indie designer would use:
- Pre-ship soul check (10 items)
- Playtest session script (what to do in 20 min)
- How to find NEW problems ongoing (automated + human)

## 5. What to CUT (be blunt)

## 6. One paragraph for @ninjawhee

Vanilla JS. Small scope. No rewrites.

---
PRIOR GAPS:
${gaps}

---
DESIGN DOC EXCERPT:
${design}`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
await page.bringToFront();
await page.evaluate((t) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = t; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
}, PROMPT);
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-MASTER-AUDIT-SENT.txt', new Date().toISOString());
console.log('sent', PROMPT.length);
await browser.disconnect();