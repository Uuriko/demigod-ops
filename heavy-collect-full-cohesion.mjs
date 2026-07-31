import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 90000;
console.log(`waiting ${WAIT_MS / 1000}s for Heavy full cohesion reply...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok'); process.exit(0); }

const data = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('[data-testid="message"], article, .message, [class*="message"]')];
  const texts = msgs.map((m) => (m.innerText || '').trim()).filter((t) => t.length > 80);
  const heavy = texts.filter((t) =>
    t.includes('Main path') || t.includes('Ship verdict') || t.includes('visual/audio') || t.includes('cohesion'));
  const pick = heavy.at(-1) || texts.at(-1) || '';
  return { text: pick.slice(0, 14000), total: texts.length };
});

fs.writeFileSync('/home/potter/HEAVY-FULL-COHESION-FEEDBACK.md', data.text);
console.log('saved', data.text.length, 'chars from', data.total, 'msgs');
console.log(data.text.slice(0, 3500));
await browser.disconnect();