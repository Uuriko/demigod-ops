import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds session update. Inspect http://localhost:8765/ninjawhee-eat-the-sounds.html

We just shipped:
- pixel-gfx.js: blocky stars, moon, scanlines, pixel vinyl notes
- longer vinyl previews (15-18s) in vinyl-audio.js
- expanded dialogue forests (intro branches, mutual revisit trees)
- Grok pixel portrait crop + larger intro sprite
- slice fall timing fix (reach gold line before bite)

Now adding: more forgiving timing, perfect/great/good tiers with distinct SFX+VFX, more dialogue.

Deliver ONE reply:
1) Max 6 bullets: bugs spotted or simple improvements
2) One \`\`\`js block with:
   - classifyHit(diff, perfectMs, greatMs, goodMs)
   - playJudgmentSfx(audioCtx, dest, lane, tier) // perfect|great|good
   - judgmentBurst(particles, x, y, color, tier)

Complete bodies. Canvas/Web Audio only. No prose after code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(1);
}
await page.bringToFront();
const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
await input.click();
await page.keyboard.type(PROMPT, { delay: 3 });
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-SESSION-SENT.txt', new Date().toISOString());
console.log('session update sent once');
await browser.disconnect();