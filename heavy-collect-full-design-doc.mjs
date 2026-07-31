import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 180000;
console.log(`waiting ${WAIT_MS / 1000}s for Heavy game design doc...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 120000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(0); }

const data = await page.evaluate(() => {
  const articles = [...document.querySelectorAll('article, [data-testid="message"], .message')];
  const texts = articles.slice(-3).map((a) => (a.innerText || '').trim()).filter(Boolean);
  const last = texts.at(-1) || document.body.innerText;
  return { text: last.slice(-50000), all: texts.join('\n\n---\n\n').slice(-80000) };
});

fs.writeFileSync('/home/potter/GAME-DESIGN-DOC-HEAVY.md', data.text);
fs.writeFileSync('/home/potter/GAME-DESIGN-DOC-HEAVY-FULL.md', data.all);
console.log('saved GAME-DESIGN-DOC-HEAVY.md', data.text.length, 'chars');
await browser.disconnect();