#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const WAIT_MS = Number(process.argv[2]) || 90000;
console.log(`waiting ${WAIT_MS / 1000}s for Heavy ambient-jazz reply...`);
await new Promise((r) => setTimeout(r, WAIT_MS));

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 90000 });
const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) { console.log('no grok tab'); process.exit(0); }

const data = await page.evaluate(() => {
  const articles = [...document.querySelectorAll('article, [data-testid="message"], .message')];
  const last = articles.at(-1) || document.body;
  return { text: (last.innerText || document.body.innerText).slice(-18000) };
});

fs.writeFileSync('/home/potter/HEAVY-AMBIENT-JAZZ-FEEDBACK.md', data.text);
console.log('saved HEAVY-AMBIENT-JAZZ-FEEDBACK.md', data.text.length, 'chars');
await browser.disconnect();