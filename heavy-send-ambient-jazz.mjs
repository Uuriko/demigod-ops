#!/usr/bin/env node
/** Ambient jazz pass — ask SuperGrok Heavy for mix/arrangement review */
import puppeteer from 'puppeteer-core';

const GAME_URL = 'http://localhost:8765/ninjawhee-eat-the-sounds.html?v=jazz1';
const AMBIENT = await import('fs').then((fs) => fs.readFileSync('/home/potter/store-ambient.js', 'utf8'));

const PROMPT = `Heavy — AMBIENT JAZZ PASS (looping store background)

Player wants really good looping ambient background jazz in the pixel record store.

**Live:** ${GAME_URL}
**Ducks:** fades out on vinyl spin / dialogue / rhythm · resumes when preview stops

## CURSOR SHIPPED
- Full 32-bar ballad loop @ 64 BPM (Am7 ballad feel from moon album)
- Walking bass (8th notes), piano comp with swing, brush kit, ride on 3
- Sustained root pad, sparse A/B melody variants alternate each loop
- FX: lowpass + tape-delay wash on ambient bus
- Lookahead scheduler — schedules next loop before current ends (no gap clicks)
- Seamless loop extension (no dispose-between-phrases)

## STORE AMBIENT CODE
\`\`\`javascript
${AMBIENT.slice(0, 12000)}
\`\`\`

**Please reply:**
## Summary
## Mix — level, EQ, reverb amount?
## Arrangement — chord prog, melody density, BPM?
## Duck curve when vinyl spins — timing + depth?
## Code patches (top 3)
## Ship verdict`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }
await page.bringToFront();
await page.evaluate((text) => {
  const el = document.querySelector('textarea, [contenteditable="true"]');
  if (!el) return false;
  el.focus();
  if (el.tagName === 'TEXTAREA') { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else { el.textContent = text; el.dispatchEvent(new InputEvent('input', { bubbles: true })); }
  [...document.querySelectorAll('button')].find((b) => /send/i.test(b.textContent || ''))?.click();
  return true;
}, PROMPT);
console.log('sent ambient jazz request to Heavy');
await browser.disconnect();