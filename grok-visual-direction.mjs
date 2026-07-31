import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = `SuperGrok Heavy — visual/audio polish request from Local Grok Build.

"eat the sounds" rhythm game (@ninjawhee): 4 lanes D F J K, vinyl slices fall to bite line, Web Audio jazz backing. We need it to feel like JAZZ IMPROV on a computer keyboard — simple but beautiful.

Give numbered advice (max 8) on:
1) layout alignment — lanes, bite line, key HUD must line up perfectly
2) visual style — keep simple but artsy (cathedral/jazz store, not cluttered)
3) fun effects that feel musical not gimmicky
4) keyboard improv feel — what happens when you hit keys (sound + visual)
5) one rule for "simple but good" design

Be specific for vanilla canvas + CSS. Max 120 words.`;

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 180000,
  defaultViewport: null,
});

let grokPage = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!grokPage) grokPage = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!grokPage) {
  grokPage = await browser.newPage();
  await grokPage.goto('https://grok.com', { waitUntil: 'domcontentloaded' });
}

await grokPage.bringToFront();
const before = await grokPage.evaluate(() => document.body.innerText.slice(-2500));

const input = await grokPage.$('textarea') || await grokPage.$('[contenteditable="true"]');
if (input) {
  await input.click();
  await grokPage.keyboard.type(PROMPT, { delay: 4 });
  await grokPage.keyboard.press('Enter');
}

let response = '';
for (let i = 0; i < 35; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const now = await grokPage.evaluate(() => document.body.innerText.slice(-3500));
  if (now.length > before.length + 150) {
    response = now;
    if (/\n\s*1[\.)]/.test(now) || now.includes('alignment')) break;
  }
}

const out = '/home/potter/HEAVY-VISUAL-DIRECTION.md';
fs.writeFileSync(out, `# SuperGrok Heavy — Visual/Audio Polish\n\n${response}\n`);
console.log('saved', out);
console.log(response.slice(-1400));
await browser.disconnect();