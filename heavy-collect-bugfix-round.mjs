import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 120000;
console.log(`waiting ${WAIT_MS / 1000}s for Heavy bugfix round...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(0); }

const data = await page.evaluate(() => {
  const articles = [...document.querySelectorAll('article, [data-testid="message"], .message')];
  const last = articles.at(-1) || document.body;
  return { text: (last.innerText || document.body.innerText).slice(-10000) };
});

fs.writeFileSync('/home/potter/HEAVY-BUGFIX-FEEDBACK.md', data.text);
console.log('saved', data.text.length);
console.log(data.text.slice(0, 2500));
await browser.disconnect();