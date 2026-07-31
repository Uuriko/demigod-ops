// Collect Heavy review prose + code (single read, no interrupt)
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 120000;
console.log(`waiting ${WAIT_MS / 1000}s...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(0); }

const data = await page.evaluate(() => {
  const articles = [...document.querySelectorAll('article, [data-testid="message"], .message')];
  const last = articles.at(-1) || document.body;
  const text = last.innerText || document.body.innerText.slice(-12000);
  const codes = [...document.querySelectorAll('pre code, pre')]
    .map((e) => e.innerText?.trim())
    .filter((t) => t && t.length > 80);
  return { text: text.slice(-8000), codes: codes.length, thinking: /thinking|Agents thinking/i.test(document.body.innerText) };
});

fs.writeFileSync('/home/potter/HEAVY-REVIEW-FEEDBACK.md', data.text);
fs.writeFileSync('/home/potter/HEAVY-REVIEW-META.json', JSON.stringify({ at: new Date().toISOString(), codes: data.codes, thinking: data.thinking }, null, 2));
console.log('saved HEAVY-REVIEW-FEEDBACK.md', data.text.length, 'chars, codes:', data.codes, 'thinking:', data.thinking);
await browser.disconnect();