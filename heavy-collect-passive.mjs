// PASSIVE ONLY: wait for Heavy to finish, then read once. Never send, never click retry.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = 120000; // 2 min — let Heavy think uninterrupted

console.log(`waiting ${WAIT_MS / 1000}s before single read (not interrupting Grok)...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(0);
}

const data = await page.evaluate(() => {
  const codes = [...document.querySelectorAll('pre code, pre')]
    .map((e) => e.innerText?.trim())
    .filter((t) => t && t.includes('function') && t.length > 100);
  const body = document.body.innerText;
  const thinking = /thinking|Agents thinking/i.test(body);
  return { codes, thinking, tail: body.slice(-10000), len: body.length };
});

console.log('thinking:', data.thinking, 'codes:', data.codes.length, 'bodyLen:', data.len);

if (data.thinking) {
  console.log('Heavy still thinking — saving marker, will not interrupt');
  fs.writeFileSync('/home/potter/HEAVY-STILL-THINKING.txt', data.tail.slice(-2000));
} else if (data.codes.length > 0) {
  const merged = data.codes.join('\n\n// --- heavy block ---\n\n');
  fs.writeFileSync('/home/potter/HEAVY-CODE.js', merged);
  fs.writeFileSync('/home/potter/HEAVY-CODE-FETCH.json', JSON.stringify({ ok: true, at: new Date().toISOString(), count: data.codes.length }, null, 2));
  console.log('saved HEAVY-CODE.js', merged.length, 'bytes');
} else {
  fs.writeFileSync('/home/potter/HEAVY-CODE-FAIL.txt', data.tail);
  console.log('no code yet — saved tail to HEAVY-CODE-FAIL.txt');
}

await browser.disconnect();