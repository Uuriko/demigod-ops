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
  const text = last.innerText || document.body.innerText.slice(-16000);
  return {
    text: text.slice(-14000),
    thinking: /thinking|Agents thinking/i.test(document.body.innerText),
  };
});

fs.writeFileSync('/home/potter/HEAVY-DIALOGUE-FEEDBACK.md', data.text);
fs.writeFileSync('/home/potter/HEAVY-DIALOGUE-META.json', JSON.stringify({
  at: new Date().toISOString(),
  chars: data.text.length,
  thinking: data.thinking,
}, null, 2));
console.log('saved HEAVY-DIALOGUE-FEEDBACK.md', data.text.length, 'chars');
await browser.disconnect();