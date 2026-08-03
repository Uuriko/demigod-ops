// PASSIVE: wait for Heavy pixel intro reply, read once.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 180000;

console.log(`waiting ${WAIT_MS / 1000}s for Heavy pixel intro (not interrupting)...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(0);
}

const data = await page.evaluate(() => {
  const body = document.body.innerText;
  const thinking = /thinking|Agents thinking/i.test(body);
  const codes = [...document.querySelectorAll('pre code, pre')]
    .map((e) => e.innerText?.trim())
    .filter((t) => t && (t.includes('drawPixel') || t.includes('drawDialogue')) && t.length > 80);
  return { thinking, codes, tail: body.slice(-12000), len: body.length };
});

console.log('thinking:', data.thinking, 'code blocks:', data.codes.length);

if (data.thinking) {
  fs.writeFileSync('/home/potter/HEAVY-PIXEL-STILL-THINKING.txt', data.tail.slice(-3000));
} else {
  fs.writeFileSync('/home/potter/HEAVY-PIXEL-DIRECTION.md', data.tail);
  if (data.codes.length) {
    fs.writeFileSync('/home/potter/HEAVY-PIXEL-CODE.js', data.codes.join('\n\n// --- heavy ---\n\n'));
    console.log('saved HEAVY-PIXEL-CODE.js');
  }
}

await browser.disconnect();