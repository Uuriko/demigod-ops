import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 180000,
  defaultViewport: null,
});

const pages = await browser.pages();
let gamePage = pages.find((p) => p.url().includes('ninjawhee-eat-the-sounds'));

if (!gamePage) {
  gamePage = await browser.newPage();
  await gamePage.goto('http://localhost:8765/ninjawhee-eat-the-sounds.html', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
} else {
  await gamePage.bringToFront();
  await gamePage.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
}

await gamePage.waitForSelector('#startBtn', { timeout: 10000 });
await gamePage.click('#startBtn');
await new Promise((r) => setTimeout(r, 600));
console.log('game reloaded and started:', gamePage.url());
await browser.disconnect();