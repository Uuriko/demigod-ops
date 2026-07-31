import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds CODE REVIEW round 5 + bugfix assist.

Play 2+ full loops back-to-back: http://localhost:8765/ninjawhee-eat-the-sounds.html
store → vinyl echoes → sarah → rhythm → mirror choice (keep/pass) → aftermath return → replay

Stack: ninjawhee-eat-the-sounds.html, overworld.js, easter-eggs.js, game-progress.js, audio-bus.js, rhythm-loop.js, vinyl-audio.js, vinyl-echo-bridge.js, heavy-runtime.js, pixel-gfx.js

Shipped since round 4:
- Full game design pass: echo orbs→bridge TASTY boost, Sarah sprite tint keep/pass, static cozy lamps, bridge flash slice 8, mirror ripples both choices
- bootGame paths: veteran skip, returning_visitor, intro 3-choice trim
- return_setup 4 emotional choices; enrich moved to return_nervous
- vinyl-echo-bridge: drawRhythmEchoOrbs, HUD "echo orbs → richer slices"
- easter-eggs: DFJK 700ms cooldown
- overworld: first-vinyl Sarah toast, poster sparkle, static lamp warmth
- jam_hex triumphant note burst

Round 4 fixes already in tree:
- finishWin/endSong stopClean + cleanupRhythmSession
- mirror choice confirm guard + timer clear
- VinylEchoBridge.resetSession on store/rhythm boundaries
- vinyl-audio fadeSnapshot during fadeOut
- audio-bus rhythm gain mute on rhythm exit
- easter-eggs dialogue scene guard

Hunt REAL bugs still present. file:function for each.

Focus:
1) mirrorGrooveChoice — is recordRun before or after mirror choice? persistence to aftermath Sarah tint?
2) Audio — bleed on end screen → store, echo beatTimer oscillators, jam_hex burst during mode switch
3) Timers — bridgeFlashUntil, aftermathDialogueTimer 520ms vs user input, finishWinTimer stacking
4) State — echoSeed captured then resetSession; echoes in aftermath store before replay rhythm
5) Easter eggs — DFJK during overworld Sarah dialogue (aftermath), dialogue-active class
6) Perf — particles cap, rhythm-loop liveNodes after 4+ loops

Deliver ONE reply:

## Summary (3-5 sentences)
## Bugs found (severity + file:function + fix description)
## Top 3 quick polish ideas (one sentence each)
## Code fixes (\`\`\`js blocks ONLY — complete function bodies you strongly recommend)

Be blunt. Do NOT rewrite the game.`;

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
fs.writeFileSync('/home/potter/HEAVY-REVIEW-SENT.txt', new Date().toISOString());
console.log('review round 5 prompt sent');
await browser.disconnect();