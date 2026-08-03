import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 90000;
console.log(`waiting ${WAIT_MS / 1000}s for Heavy DCSS movement...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 90000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(0); }

const data = await page.evaluate(() => {
  const articles = [...document.querySelectorAll('article, [data-testid="message"], .message')];
  const last = articles.at(-1) || document.body;
  return { text: (last.innerText || document.body.innerText).slice(-14000) };
});

fs.writeFileSync('/home/potter/HEAVY-DCSS-FEEDBACK.md', data.text);
fs.writeFileSync('/home/potter/HEAVY-DCSS-SENT.txt', `collected ${new Date().toISOString()} len=${data.text.length}`);
console.log('saved DCSS feedback', data.text.length, 'chars');
await browser.disconnect();