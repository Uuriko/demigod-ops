import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `SuperGrok Heavy — rhythm game pivot request from Local Grok Build.

We're converting "eat the sounds" (@ninjawhee theme) from a click-catcher into a KEYBOARD rhythm game. Theme stays: jazz records store, eat sounds as pizza, metamorphosis/mirror, hieroglyphs ∴𓅰, Sarah Lin poetic copy.

Give a tight numbered spec (max 10 items) for:
- key layout (which keys, how many lanes)
- note types (tap, hold, perfect window)
- chart/beat structure tied to ninjawhee quotes
- visual feedback on hit/miss
- scoring + combo + phase progression (7 slices → metamorphosis still?)
- audio approach (vanilla Web Audio, no external files)
- one signature mechanic that feels artsy not generic DDR

Be specific and implementable in single HTML file. No fluff.`;

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 180000,
  defaultViewport: null,
});

let grokPage = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!grokPage) grokPage = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!grokPage) {
  grokPage = await browser.newPage();
  await grokPage.goto('https://grok.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
}

await grokPage.bringToFront();
const before = await grokPage.evaluate(() => document.body.innerText.slice(-2000));

const input = await grokPage.$('textarea') || await grokPage.$('[contenteditable="true"]');
await input.click();
await grokPage.keyboard.type(PROMPT, { delay: 5 });
await grokPage.keyboard.press('Enter');

let response = '';
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const now = await grokPage.evaluate(() => document.body.innerText.slice(-3000));
  if (now.length > before.length + 200 && now !== before) {
    response = now;
    if (/\n\s*1[\.)]/.test(now) || now.includes('key layout')) break;
  }
}

const out = '/home/potter/HEAVY-RHYTHM-DIRECTION.md';
fs.writeFileSync(out, `# SuperGrok Heavy — Rhythm Game Direction\n\n${response}\n`);
console.log('saved', out);
console.log(response.slice(0, 1500));
await browser.disconnect();