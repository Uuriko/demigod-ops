#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => p.url().includes('cursor.com/agents'));
if (!page) throw new Error('no agents tab');

await page.bringToFront();

// Click send (up arrow) if prompt not empty
const sent = await page.evaluate(() => {
  const send = [...document.querySelectorAll('button')].find((b) => {
    const label = b.getAttribute('aria-label') || '';
    return /send|submit/i.test(label) || b.querySelector('svg');
  });
  const box = document.querySelector('[contenteditable="true"]');
  const hasText = (box?.innerText || '').trim().length > 20;
  if (hasText && send) { send.click(); return 'clicked-send'; }
  return hasText ? 'has-text-no-send' : 'empty';
});
console.log('submit:', sent);

if (sent === 'has-text-no-send') {
  await page.keyboard.press('Enter');
  console.log('pressed Enter');
}

await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/home/potter/cursor-agent-submitted.png' });
const body = await page.evaluate(() => (document.body?.innerText || '').slice(0, 1500));
console.log(body);
await browser.disconnect();