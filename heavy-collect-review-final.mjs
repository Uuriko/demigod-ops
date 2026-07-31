import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 100000;
console.log(`waiting ${WAIT_MS / 1000}s...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(0); }

const data = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('[data-testid="message"], article, .message')];
  const texts = msgs.map((m) => (m.innerText || '').trim()).filter((t) => t.length > 100);
  const heavy = texts.filter((t) =>
    t.includes('Ship verdict') || t.includes('## Bugs') || t.includes('findCounts'));
  return { text: (heavy.at(-1) || texts.at(-1) || '').slice(0, 14000) };
});

fs.writeFileSync('/home/potter/HEAVY-REVIEW-FINAL-FEEDBACK.md', data.text);
console.log('saved', data.text.length);
console.log(data.text.slice(0, 4000));
await browser.disconnect();