import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PLAY_NOTES = fs.existsSync('/home/potter/HEAVY-PLAYTEST-NOTES.md')
  ? fs.readFileSync('/home/potter/HEAVY-PLAYTEST-NOTES.md', 'utf8').slice(0, 3500)
  : '(playtest in progress)';

const PROMPT = `Heavy — TUNING PASS for eat-the-sounds after thorough agent playtest.

Live: http://localhost:8765/ninjawhee-eat-the-sounds.html

CURRENT BUILD:
• 3-room jazz store (front / stacks / listening lounge), smooth tile movement, wandering mutuals, street passersby (poetic dialogue, ~34% hint variants)
• No STORE MAP. Echo + album HUDs. Glowing vinyl stands. Sarah at register after 3 mutuals.
• Flow: intro dialogue → overworld → return Sarah → 4-lane rhythm → mirror → aftermath store

AGENT PLAYTEST NOTES:
${PLAY_NOTES}

Deliver ONE reply (max 180 words + optional one \`\`\`js helper):
1) 6–8 bullets: highest-impact TUNING fixes ranked (pacing, friction, audio-visual, overworld clarity, rhythm feel, dialogue trim, reward beats) — be specific to our notes
2) 3 bullets: what to KEEP (do not cut)
3) One sentence ship verdict

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
fs.writeFileSync('/home/potter/HEAVY-TUNING-SENT.txt', new Date().toISOString());
console.log('tuning prompt sent');
await browser.disconnect();