import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds game update. Need CODE + bullets.

Already has: Undertale intro dialogue, overworld with mutuals, rhythm game D/F/J/K, heavy-runtime.js, heavy-dialogue-art.js.

Deliver ONE reply:
1) Max 6 bullets: improvements (dialogue SFX, vinyl listening, slice timing, overworld polish)
2) One \`\`\`js block with TWO functions:
   - playUndertaleBlip(audioCtx, dest, kind) // kinds: talk, choice, confirm, vinyl
   - drawVinylPickup(ctx, x, y, r, color, spin)

Complete bodies. Canvas/Web Audio only. No prose after code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
await page.bringToFront();
const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
await input.click();
await page.keyboard.type(PROMPT, { delay: 4 });
await page.keyboard.press('Enter');
fs.writeFileSync('/home/potter/HEAVY-IMPROVE-SENT.txt', new Date().toISOString());
console.log('improvements prompt sent once');
await browser.disconnect();