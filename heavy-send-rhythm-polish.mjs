import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — rhythm polish + adaptive difficulty code assist.

## What Cursor is shipping
- Hide scorecard HUD during rhythm (stats tracked internally, shown on end screen only)
- Remove center hex/spinning wheel visual
- Cleaner playfield: vinyl+pizza ambient background, lamp glows, simple lighting
- Longer ballad (~168 beats) + extended fast songs (108, 126 BPM)
- Adaptive density: struggling player → more chaotic filler notes; strong player → structured doubles/syncopation
- Jazzier slow ballad backing (84 BPM) via rhythm-loop setStyle('ballad')

## Ask Heavy for EXACTLY:

## Layout (4 bullets)
What to keep visible during play besides phase label + key hints

## Adaptive difficulty (pseudocode)
computeDifficultyTier(hits, misses, combo) + injectAdaptiveNotes(chart, tier, beatMs) — vanilla JS

## Song 2 + 3 extended charts
~30 notes each at 108 and 126 BPM — lane+beat list

## Ballad jazz backing
3 concrete Web Audio tweaks for 84 BPM (no samples)

## Background ambience
2 draw calls: vinyl decor + pizza/warm light — pixel-friendly

## Risks (3)

No store. No @ninjawhee letter.`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(1); }
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
}, PROMPT);
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-RHYTHM-POLISH-SENT.txt', new Date().toISOString());
console.log('rhythm polish sent');
await browser.disconnect();