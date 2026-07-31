import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

let page = (await browser.pages()).find((p) => p.url().includes('grok.com/c/'));
if (!page) page = (await browser.pages()).find((p) => p.url().includes('grok.com'));

const text = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('[data-testid="message"], article, .markdown, .prose, [class*="message"]')]
    .map((n) => n.innerText?.trim())
    .filter(Boolean);
  if (msgs.length) return msgs[msgs.length - 1];
  return document.body.innerText.slice(-8000);
});

fs.writeFileSync('/home/potter/HEAVY-GAME-DESIGN.md', `# SuperGrok Heavy — Game Design\n\n${text}\n`);
console.log('saved HEAVY-GAME-DESIGN.md', text.length, 'chars');
console.log(text.slice(0, 2000));
await browser.disconnect();