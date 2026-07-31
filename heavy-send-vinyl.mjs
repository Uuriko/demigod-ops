import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — vinyl-audio.js help for eat-the-sounds jazz store.

Bug: progress bar outlasts audible music (metadata duration > actual scheduled notes).

Goals:
1) Multi-song albums per vinyl (2-3 movements each, ~3-4 min total)
2) Accurate playback duration synced to HUD progress bar
3) Deeper jazz feel: swing brushes, walking bass, comping, room reverb

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html
File: vinyl-audio.js + overworld.js now-playing HUD

Deliver ONE reply:
1) Max 5 bullets: architecture + jazz scheduling tips
2) One \`\`\`js block with complete bodies:
   - createJazzScheduler(ctx, dest, t0) → { at, extend, getDurationMs, note, chord, brush, walk }
   - playAlbumMovements(movements, scheduler) → totalDurationMs
   - getVinylPlaybackInfo() → { elapsedMs, durationMs, songTitle, songIndex }

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
fs.writeFileSync('/home/potter/HEAVY-VINYL-SENT.txt', new Date().toISOString());
console.log('vinyl prompt sent');
await browser.disconnect();