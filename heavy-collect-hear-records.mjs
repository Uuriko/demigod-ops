import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 90000;
console.log(`waiting ${WAIT_MS / 1000}s for Heavy hear records reply...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
let page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(1); }

const data = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('[data-testid="message"], article, .markdown, .prose, [class*="message"]')]
    .map((n) => n.innerText?.trim()).filter(Boolean);
  return { text: msgs.length ? msgs[msgs.length - 1] : document.body.innerText.slice(-12000) };
});

fs.writeFileSync('/home/potter/HEAVY-HEAR-RECORDS-FEEDBACK.md', `# SuperGrok Heavy — Hear Records Overworld\n\n${data.text}\n`);
console.log('saved', data.text.length, 'chars');
await browser.disconnect();