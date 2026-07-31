import puppeteer from 'puppeteer-core';
import fs from 'fs';

const HEAR_RESEARCH = `Hear Records, Singapore (research for Cursor):
- Address: 175 Bencoolen Street, #01-18 Burlington Square
- Iconic music lifestyle store — new + pre-loved vinyl, wide genres
- Turntable distributor (Audio-Technica, Music Hall hi-fi)
- Cozy cramped retail: floor-to-ceiling shelves, warm spotlights, crate-dig aisles
- Staff spin records in-store; listening while you browse
- Mall unit vibe: neon sign, register counter, dense spine walls, demo deck`;

const PROMPT = `Heavy — overworld store layout for our pixel jazz game, inspired by HEAR RECORDS Singapore.

${HEAR_RESEARCH}

## Game needs
- 3-room overworld (entrance → stacks → listening lounge)
- 3 playable vinyl spots (moon / shelter / mirror) — each needs clear shelf + stand-here tile
- Undertale-style walk + [Z] listen
- Keep NPCs: orph, simon, honey, sarah at register

## Reply EXACTLY:

## Hear Records vibe (5 bullets)
Colors, lighting, shelf density, listening area, Singapore mall unit feel

## 3-room layout sketch
ASCII or tile legend per room — where shelves, counter, door, turntables, 3 vinyl spots

## Vinyl spot copy
3 zone names + 1 flavor line each for moon/shelter/mirror

## Pixel decor (3 items)
Neon sign text, poster labels, floor material per zone

## Code note (1 function)
drawHearRecordsAmbience(ctx, ...) — what to draw

## Risks (3)

No rhythm code. No @ninjawhee letter.`;

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
fs.writeFileSync('/home/potter/HEAVY-HEAR-RECORDS-SENT.txt', new Date().toISOString());
console.log('hear records sent');
await browser.disconnect();