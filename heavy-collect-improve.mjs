import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 90000;
console.log(`waiting ${WAIT_MS / 1000}s...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(0); }

const data = await page.evaluate(() => {
  const body = document.body.innerText;
  const tail = body.slice(-12000);
  const codes = [...document.querySelectorAll('pre code, pre')]
    .map((e) => e.innerText?.trim())
    .filter((t) => t && t.length > 80);
  return { tail, codes, thinking: /thinking|Agents thinking/i.test(body) };
});

fs.writeFileSync('/home/potter/HEAVY-IMPROVE-FEEDBACK.md', data.tail);
if (data.codes.length) {
  fs.appendFileSync('/home/potter/HEAVY-CODE.js', '\n\n// --- heavy improve ---\n\n' + data.codes.slice(-4).join('\n\n'));
}
console.log('saved feedback', data.tail.length, 'codes', data.codes.length, 'thinking', data.thinking);
await browser.disconnect();