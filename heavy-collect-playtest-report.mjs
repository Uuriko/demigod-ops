import puppeteer from 'puppeteer-core';
import fs from 'fs';

await new Promise((r) => setTimeout(r, 90000));
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no tab'); process.exit(0); }
const data = await page.evaluate(() => {
  const last = [...document.querySelectorAll('article, [data-testid="message"], .message')].at(-1);
  return (last?.innerText || document.body.innerText).slice(-6000);
});
fs.writeFileSync('/home/potter/HEAVY-PLAYTEST-REPORT-FEEDBACK.md', data);
console.log('saved', data.length);
await browser.disconnect();