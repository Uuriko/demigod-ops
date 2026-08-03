import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP = 'http://[::1]:9223';
const GAME_URL = 'http://localhost:8765/ninjawhee-eat-the-sounds.html';
const REPORT = `SuperGrok Heavy — improvements implemented per your direction:

✓ Vinyl slices with rotating jazz labels + hieroglyph shadows
✓ Micro-quotes on spawn, fragment spirals into hex on eat
✓ Sinusoidal float paths + ghost echo trails + magnetic cursor pull
✓ Perfect catch slow-mo + vignette pulse
✓ Web Audio: sawtooth collect tones, lowpass sweep, delay reverb, resonance chord on 3-streak
✓ Parallax gothic arches + moon craters, eclipse tint at 5+ slices
✓ Miss penalty: hex desaturation + audio detune
✓ 3-streak resonance bonus slice

Game relaunched: ${GAME_URL}
Please review and suggest one final polish pass if anything's missing.`;

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });

let gamePage = (await browser.pages()).find((p) => p.url().includes('ninjawhee-eat-the-sounds'));
if (!gamePage) {
  gamePage = await browser.newPage();
  await gamePage.goto(GAME_URL, { waitUntil: 'networkidle2' });
} else {
  await gamePage.bringToFront();
  await gamePage.reload({ waitUntil: 'networkidle2' });
}

await gamePage.setViewport({ width: 1400, height: 900 });
await gamePage.click('#startBtn');
await sleep(800);
await gamePage.screenshot({ path: '/home/potter/game-screenshot.png', type: 'png' });
console.log('screenshot saved');

let grokPage = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (grokPage) {
  await grokPage.bringToFront();
  const textarea = await grokPage.$('textarea') || await grokPage.$('[contenteditable="true"]');
  if (textarea) {
    await textarea.click();
    await grokPage.keyboard.type(REPORT, { delay: 6 });
    await grokPage.keyboard.press('Enter');
    console.log('reported to SuperGrok Heavy');
  }
}

fs.appendFileSync('/home/potter/NOTES-FOR-SUPERGROK-HEAVY.md', `\n\n## Implementation report (auto)\n${REPORT}\n`);
await browser.disconnect();