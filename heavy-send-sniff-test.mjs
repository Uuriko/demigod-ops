import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — HIGH-VIEW SNIFF TEST for eat-the-sounds (not a code review).

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

Play or imagine 1 fresh run + 1 veteran replay. Flow: intro dialogue → overworld jazz store (vinyl spin, 3 mutuals, Sarah at register) → return talk → 4-lane rhythm → mirror choice → aftermath store.

We just overhauled overworld clarity: glowing vinyl stands, STORE MAP panel, NPC zone rings, Sarah spotlight at register (★ SARAH ★ marker, moved to center aisle in front of counter).

SNIFF TEST — answer as a player/designer, NOT an engineer:

## Vibe (2-3 sentences)
Does it feel like a late-night jazz record shop? Emotional truth?

## Friction (max 5 bullets)
Where would a first-time player get lost, bored, or confused?

## Delight (max 5 bullets)
What already sings? What moments land?

## Sarah clarity (1-2 sentences)
Is it obvious where she stands and when to talk to her?

## Top 3 experiential fixes (not bugs)
Highest-impact feel improvements — pacing, clarity, reward, audio-visual sync. No file names.

## Ship gut-check
One word: ship / polish / rethink — plus 15 words why.

No code blocks. Be blunt and poetic.`;

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
fs.writeFileSync('/home/potter/HEAVY-SNIFF-SENT.txt', new Date().toISOString());
console.log('sniff test prompt sent');
await browser.disconnect();