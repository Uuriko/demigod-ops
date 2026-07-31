import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `Heavy — inspect eat-the-sounds at http://localhost:8765/ninjawhee-eat-the-sounds.html

Issues to fix:
1) Sarah Grok pixel portrait at intro shows Grok chat UI/text baked into the PNG — need clean crop + larger display
2) Any simple polish you spot (dialogue, overworld vinyls, rhythm slices at gold line)

Deliver ONE reply:
- Max 5 bullets from inspecting the game
- One \`\`\`js block with:
  - drawGrokPortrait(ctx, x, y, size, bob, crop) // crops chat chrome, pixel-crisp draw
  - loadGrokPortrait(src) // optional preload helper

Complete function bodies. Canvas only. No prose after code.`;

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
fs.writeFileSync('/home/potter/HEAVY-PORTRAIT-SENT.txt', new Date().toISOString());
console.log('portrait fix prompt sent once');
await browser.disconnect();