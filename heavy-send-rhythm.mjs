import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — rhythm game polish for eat-the-sounds (ninjawhee-eat-the-sounds.html).

Already wired locally:
- rhythm-loop.js looping jazz backing (RhythmLoop.create) on rhythmGain
- heavy-runtime.js playKeyTap() on D/F/J/K
- pixel-gfx.js drawVinylRecord() for falling notes
- bottom quote typewriter cycler (independent of score)
- top banner "EAT THE SOUNDS" separate from playfield

Need your help:
1) Richer looping rhythm backing — more audible swing jazz, 84 BPM, Web Audio only, no samples
2) Better vinyl note fall + spin + hit-window glow (canvas pixel art)
3) Key tap sounds that feel like needle/stylus per lane (D bass, F horn, J keys, K ride)
4) Quote typewriter timing + speaker rotation polish
5) Any bug fixes you spot in rhythm-loop.js / heavy-runtime.js

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html
Files: rhythm-loop.js, heavy-runtime.js, pixel-gfx.js, ninjawhee-eat-the-sounds.html

Deliver ONE reply:
- Max 6 bullets architecture/tips
- Then complete \`\`\`js blocks for any improved functions (RhythmLoop, playKeyTap, drawVinylRecord)
Canvas/Web Audio only. No prose after code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(1); }

await page.bringToFront();
const sent = await page.evaluate((text) => {
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
if (sent) await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-RHYTHM-SENT.txt', new Date().toISOString());
console.log('rhythm prompt sent');
await browser.disconnect();