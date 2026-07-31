import puppeteer from 'puppeteer-core';
import fs from 'fs';

const HTML = fs.readFileSync('/home/potter/ninjawhee-eat-the-sounds.html', 'utf8');
const songsBlock = HTML.match(/const RHYTHM_SONGS = \[[\s\S]{0,3200}/)?.[0] || '';
const chartBlock = HTML.match(/const CHART_SECTIONS = \[[\s\S]{0,1800}/)?.[0] || '';
const timingBlock = HTML.match(/const BALLAD_BPM[\s\S]{0,200}/)?.[0] || '';

const PRIOR = fs.existsSync('/home/potter/HEAVY-RHYTHM-EXTEND-FEEDBACK.md')
  ? fs.readFileSync('/home/potter/HEAVY-RHYTHM-EXTEND-FEEDBACK.md', 'utf8').slice(0, 1200)
  : '';

const PROMPT = `Heavy — RHYTHM LONGER + BETTER GAMEPLAY for eat-the-sounds.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

USER REQUEST: Change the rhythm section so it LASTS LONGER for the player and improves gameplay feel. We want your best design — not grind, still cozy jazz-store fantasy.

CURRENT RHYTHM FLOW:
• D/F/J/K lanes · pizza-slice vinyl notes · judgments SLICE!/TASTY!/NOM!
• GOAL_SLICES = 15 → feast complete → encore loop songs 2↔3 until [Z] mirror
• Song 1 "needle drop · side A" 84 BPM · 172 beats · ~55 chart notes in 6 sections (counts toward 15 slices)
• Song 2 "uptown swing" 108 BPM · 96 beats · encore only
• Song 3 "midnight burner" 126 BPM · 80 beats · encore only
• Groove mode after slice 8 · improv meter · bonus pizza spawns · echo orbs from store vinyls
• Chill mode: wider windows + auto-NOM · adaptive pressure injects filler notes on streaks
• Agent auto-finishes encore after 10s / 2 advances

${timingBlock}

SECTIONS (song 1):
${chartBlock}

SONGS:
${songsBlock}

PRIOR RHYTHM EXTEND NOTES (already shipped partially):
${PRIOR}

Deliver ONE reply (max 280 words + optional \`\`\`js patch):
1) 8–10 bullets: ranked changes to make rhythm LAST LONGER (duration targets, slice count, song structure, encore policy, pacing beats) — specific numbers
2) 6–8 bullets: ranked GAMEPLAY improvements (feel, teaching, reward loops, difficulty curve, hold notes, improv, visual/audio juice) — file hints
3) What NOT to change (mirror flow, echo seed, agent verify, cozy tone)
4) Recommended new timings table: song · bpm · beats · slices · real-world minutes
5) One sentence ship verdict

No prose after bullets.`;

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
  await page.keyboard.type(PROMPT.slice(0, 800), { delay: 1 });
}
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-RHYTHM-LONGER-SENT.txt', new Date().toISOString());
console.log('rhythm-longer prompt sent');
await browser.disconnect();