// Fire-and-forget: ask Heavy for pixel intro art direction + optional code. Never poll.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — eat-the-sounds rhythm game needs Undertale-style intro BEFORE gameplay.

Context: @ninjawhee (Sarah Lin), jazz records store, eat sounds as pizza, hieroglyphs ∴𓅰𓅬, mirror metamorphosis, colors #0a0812 #c9a84c #c45c7a #4a8f7a #7b5ea7.

Deliver in ONE reply:
1) Max 8 bullets: pixel art direction (sprite design, palette, emotion frames, scene BG, dialogue box look, blip SFX feel)
2) One fenced \`\`\`js block with: function drawPixelNinjawhee(ctx, x, y, scale, frame, bob) and function drawDialogueSceneBg(ctx, W, H, t) — complete bodies, canvas 2d only, no assets.

Local Grok will implement. Be specific. No fluff outside bullets + code.`;

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com')) ||
  await browser.newPage();

await page.bringToFront();
const input = await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 15000 });
// New chat only — never triple-click/clear; that interrupts Heavy mid-thought.
await input.click();
await page.keyboard.type(PROMPT, { delay: 5 });
await page.keyboard.press('Enter');

fs.writeFileSync('/home/potter/HEAVY-PIXEL-PROMPT-SENT.txt', new Date().toISOString());
console.log('pixel intro prompt sent once — not polling');
await browser.disconnect();