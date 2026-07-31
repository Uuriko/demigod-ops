import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
const text = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('[data-testid="message"], article, .markdown, .prose')]
    .map((n) => n.innerText?.trim()).filter(Boolean);
  return msgs[msgs.length - 1] || document.body.innerText.slice(-6000);
});
fs.writeFileSync('/home/potter/HEAVY-VINYL-DIRECTION.md', `# SuperGrok Heavy — Vinyl Audio\n\n${text}\n`);
console.log(text.slice(0, 1500));
await browser.disconnect();