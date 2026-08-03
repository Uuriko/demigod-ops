import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — RHYTHM MULTI-SONG design + code assist. We learned a lot since your last rhythm pass.

## What Cursor learned (implemented)

1. **Encore gate works** — 15 slices → feast complete, player presses [Z] for mirror (not instant). Humans stay in the jam; agents auto-mirror ~16s after feast.
2. **Bonus pizza slices work** — spawn every 26–40 beats, max 1 active, lane-matched key at gold line, PIZZA! + crunch SFX + score. First spawn teaches with phase brief.
3. **Encore loop bug** — resetting songStart on loop broke beat-based agent triggers; fixed with encoreStartedAt wall-clock.
4. **Single BPM (84) + single 168-beat chart** feels long but same tempo throughout — players want **tempo escalation** after the slow teaching song.
5. **RhythmLoop** is hardcoded 84 BPM — needs setBpm() for backing track.
6. **Judgment windows in ms** (not beats) help chill mode — keep absolute ms on fast songs.
7. **Echo seed** only flavors song 1 section labels — fast songs can use vinyl flavor colors without new systems.

## What we're building NOW

**Multi-song set:**
- Song 1 **ballad** 84 BPM — current slow teaching chart (tutorial → moon → shelter → bridge → mirror), 15 goal slices
- Song 2 **uptown swing** ~108 BPM — fast jazz, denser chart
- Song 3 **midnight burner** ~126 BPM — faster still
- After song 1 ends (or 15 slices + feast complete), auto-advance to song 2 → 3 → loop 2↔3 until [Z] mirror
- Bonus pizzas continue across all songs

## Reply EXACTLY:

## Design (6 bullets)
Tempo curve, transition feel, chart density per song, when to show song title, pizza rate on fast songs

## Song 2 + 3 chart sketch
Beat patterns (lane + beat numbers) for ~20 notes each — implementable

## Code helpers (2 functions, vanilla JS)
- advanceToNextSong() with setBpm
- buildChartForSong(songIdx) using beatMs

## UI copy
3 song titles + 1 transition line each

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
fs.writeFileSync('/home/potter/HEAVY-RHYTHM-MULTISONG-SENT.txt', new Date().toISOString());
console.log('multisong sent');
await browser.disconnect();