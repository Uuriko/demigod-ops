import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — rhythm game polish for Eat the Sounds. Vanilla JS, procedural WebAudio only.

## Current multi-song arc (shipped)
1. **ballad** 84 BPM · 172 beats · counts toward 15 slices · jazz ballad backing
2. **uptown swing** 108 BPM · 84 beats · encore after feast complete · swing style
3. **midnight burner** 126 BPM · 72 beats · loops 2↔3 · burner style

Flow: feast complete → advanceToNextSong() → player keeps playing faster songs until [Z] mirror gate.

## What we need from you

### A) Multi-song progression (best way to update)
- Is 84→108→126 the right ladder? BPM gaps, song lengths, when to transition?
- Should encore songs add density, lane doubles, or stay forgiving?
- One transition stinger idea per song handoff (text + audio feel)

### B) Hit feedback & key feel (D F J K)
- playJudgmentSfx: square perfect / triangle great / sine good — how to make bites feel more "pizza slice" and satisfying?
- Visual: ripples, judgmentBurst particles, key-cap glow — what 3 upgrades hit hardest?
- Combo milestones (8, 16, 32) — sound + screen moment?

### C) Backing track (rhythm-loop.js)
- ballad / swing / burner styles — what's missing? hi-hat on fast songs? bass punch? crossfade on BPM change?
- Should each song have a distinct motif tied to vinyl echoes (moon/shelter/mirror)?

### D) Small fixes you notice
- Anything still sloppy in the loop?

Deliver:
## Summary (4 sentences)
## Multi-song ladder (bullet recommendations)
## Hit feedback top 5 (file:function + one-line fix each)
## Backing track top 3
## Transition copy (3 lines for song handoffs)
## Code fixes (complete function bodies ONLY — max 3 functions you strongly recommend)

Be blunt. Play mindset: cozy jazz store, not DDR.`;

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
fs.writeFileSync('/home/potter/HEAVY-RHYTHM-EXTEND-SENT.txt', new Date().toISOString());
console.log('rhythm extend sent');
await browser.disconnect();