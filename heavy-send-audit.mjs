import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds FULL AUDIT + bugfix assist (Jun 2026).

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

User reports:
1) Store vinyl previews are SILENT (HUD shows playing, no audible jazz)
2) General jank — things feel broken even when tests pass

Recent fixes in tree:
- rhythm chart wiped by audio-bus stopRhythm on rhythm ENTER (fixed)
- buildChart moved after countdown
- closeDialogueUI respects gameStarting/rhythm-active

Stack: ninjawhee-eat-the-sounds.html, overworld.js, vinyl-audio.js, audio-bus.js, vinyl-echo-bridge.js, rhythm-loop.js, game-progress.js, heavy-runtime.js, pixel-gfx.js

My diagnosis so far:
- vinyl-audio.js schedules ENTIRE ~10min albums upfront → 8000+ oscillators → browser silence
- VinylAudio.play() fights audioBus.vinylGain (both schedule gain on same node)
- onListenVinyl does not await audioBus.resume()
- setMode('store') after rhythm may leave vinylGain near 0.001

Play 2 loops: store vinyl → sarah → rhythm → mirror → aftermath → replay

Deliver ONE reply:

## Summary (3-5 sentences)
## Bugs found (severity + file:function + fix)
## Top 5 polish (one sentence each)
## Code fixes (\`\`\`js blocks ONLY — complete function bodies you strongly recommend)

Be blunt. No full rewrites.`;

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
fs.writeFileSync('/home/potter/HEAVY-AUDIT-SENT.txt', new Date().toISOString());
console.log('audit prompt sent');
await browser.disconnect();