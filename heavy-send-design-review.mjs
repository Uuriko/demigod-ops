import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds DESIGN + CODE review (round 5).

Play the FULL loop: http://localhost:8765/ninjawhee-eat-the-sounds.html
Walk store → preview vinyl → Sarah counter → rhythm → mirror → aftermath return. Try a weak run (static tier) AND a strong run (wings/groove).

What this game IS:
Undertale-style dialogue → jazz record store overworld → D/F/J/K rhythm (15 slices, mirror ending) → tiered aftermath store return (wings/groove/tasty/static) → hidden easter eggs.

Tone: @ninjawhee — pizza/sounds/mirror/wings, whole albums, mutuals (orph/simon/honey), non-performative joy, late-night jazz store.

Stack: vanilla JS, canvas pixel art, Web Audio procedural jazz (no samples).

Since round 4 we shipped:
- Intro shortcut "i've been here before" → skip to store
- Win beat: "feast complete" pause before metamorphosis/end screen
- Aftermath tier vibe lines (end screen + Sarah opener); static gets gentle encouragement
- Combo ≥8 dims banner/quote panel; Echo HUD says "ECHO → RHYTHM" + counter promise
- Secret spot pixel hints after first vinyl preview; mirror glyph echo ripple in store
- Groove aftermath JAZZ poster glow; warmer store vinyl gain

Still NOT done (your call if worth it): vinyl preview ghost slice teaser, Sarah hums last motif in aftermath, mirror ending choice "keep the groove / pass it on", Sarah tooltip after 3 listens.

PRIORITY: DESIGN critique over bug hunt. Play like a player who cares about vibe, not a linter.
- What still feels WEIRD, confusing, anticlimactic, or emotionally off?
- Where does the arc sag or rush?
- Do mutuals/Sarah sound like @ninjawhee?
- Are easter eggs fair-fun or frustratingly opaque?
- Does audio mood match each mode (store vs rhythm vs aftermath)?

Deliver ONE reply:

## Summary (design + tech, 4-6 sentences)

## Design problems (severity: critical/major/minor)
For each: what feels off, why it hurts, one-sentence fix. Cover intro, store→rhythm payoff, aftermath clarity, dialogue tone, HUD, audio mood, easter eggs, mirror ending.

## Code bugs (severity: critical/major/minor)
file:function + fix — only real issues you hit while playing.

## Top 5 design improvements (small scope!)
One sentence + 2-line implementation hint. Charm and clarity > new features.

## Top 3 code fixes
\`\`\`js blocks ONLY — complete function bodies you strongly recommend.

## One weird thing you noticed
Subtle UX/audio/visual oddity we might miss. Be blunt.

Do NOT rewrite the game. No React, no asset pipeline, no multiplayer.`;

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
fs.writeFileSync('/home/potter/HEAVY-DESIGN-SENT.txt', new Date().toISOString());
console.log('design+code review prompt sent');
await browser.disconnect();