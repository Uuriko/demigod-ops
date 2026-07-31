import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — game design consultation for eat-the-sounds (@ninjawhee jazz store).

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

Flow: Undertale intro dialogue → overworld store (walk, Z talk, Z vinyl previews, X stop) → return to Sarah → 4-lane rhythm (D/F/J/K, 15 slices, SLICE/TASTY/NOM tiers) → mirror ending.

Just shipped locally:
- Intro opens with "when I worked here my favorite thing was listening to whole albums"
- Expanded dialogue forests (intro + return + orph/simon/honey with many choice branches)
- Store graphics: pixel rugs, posters, lamp glow, vinyl spines, better character sprites

QUESTION: How should we improve GAME DESIGN (not just polish)?

Deliver ONE reply:
1) Max 8 bullets: pacing, player motivation, exploration rewards, rhythm teaching, vinyl↔rhythm connection, replay value, emotional arc, accessibility
2) One \`\`\`js block with ONE high-impact feature (complete function bodies, canvas/Web Audio only) — e.g. mutual-gossip tracker, album-side progression, or soft tutorial beats

No prose after code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(1);
}
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
if (!sent) {
  const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
  await input.click();
  await page.keyboard.type(PROMPT.slice(0, 500), { delay: 2 });
}
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-DESIGN-SENT.txt', new Date().toISOString());
console.log('game design prompt sent once');
await browser.disconnect();