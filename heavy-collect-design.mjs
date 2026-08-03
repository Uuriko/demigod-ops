// Collect Heavy design+code review prose (single read after wait)
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
  const text = last.innerText || document.body.innerText.slice(-14000);
  const codes = [...document.querySelectorAll('pre code, pre')]
    .map((e) => e.innerText?.trim())
    .filter((t) => t && t.length > 80);
  return {
    text: text.slice(-12000),
    codeBlocks: codes,
    thinking: /thinking|Agents thinking/i.test(document.body.innerText),
  };
});

fs.writeFileSync('/home/potter/HEAVY-DESIGN-FEEDBACK.md', data.text);
if (data.codeBlocks.length > 0) {
  fs.writeFileSync('/home/potter/HEAVY-DESIGN-CODE.js', data.codeBlocks.join('\n\n// --- heavy block ---\n\n'));
}
fs.writeFileSync('/home/potter/HEAVY-DESIGN-META.json', JSON.stringify({
  at: new Date().toISOString(),
  chars: data.text.length,
  codes: data.codeBlocks.length,
  thinking: data.thinking,
}, null, 2));
console.log('saved HEAVY-DESIGN-FEEDBACK.md', data.text.length, 'chars, codes:', data.codeBlocks.length, 'thinking:', data.thinking);
await browser.disconnect();