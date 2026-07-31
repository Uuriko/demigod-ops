#!/usr/bin/env node
/** Computer-use: open Cursor Agents, paste game task, attempt repo switch. */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PROMPT = fs.readFileSync('/home/potter/eat-the-sounds/CURSOR-CLOUD-AGENT.md', 'utf8')
  .split('```')[1]
  ?.replace(/^[^\n]*\n/, '')
  .trim()
  .slice(0, 2800);

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 120000 });
let page = (await browser.pages()).find((p) => p.url().includes('cursor.com'));
if (!page) {
  page = await browser.newPage();
  await page.goto('https://cursor.com/agents', { waitUntil: 'networkidle2', timeout: 90000 });
}

await page.bringToFront();

// New agent composer
const hasComposer = await page.evaluate(() =>
  (document.body?.innerText || '').includes('Ask Cursor to build')
);
if (!hasComposer) {
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')].find((b) => /new agent/i.test(b.innerText || ''));
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('opened new agent:', clicked);
  await new Promise((r) => setTimeout(r, 2000));
}

// Try repo dropdown → search eat-the-sounds
const repoClicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button, [role="button"], div')]
    .find((b) => (b.innerText || '').trim() === 'crispy-garbanzo');
  if (btn) { btn.click(); return true; }
  return false;
});
console.log('repo dropdown:', repoClicked);
await new Promise((r) => setTimeout(r, 1500));

if (repoClicked) {
  await page.keyboard.type('eat-the-sounds', { delay: 20 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 1000));
}

// Focus composer and paste prompt
const focused = await page.evaluate(() => {
  const box = [...document.querySelectorAll('[contenteditable="true"], textarea')]
    .find((el) => el.offsetParent !== null && /build|fix bugs|explore/i.test(
      el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.parentElement?.innerText || ''
    )) || document.querySelector('[contenteditable="true"]');
  if (!box) return false;
  box.focus();
  box.click();
  return true;
});
console.log('focused composer:', focused);

if (focused) {
  await page.keyboard.type(PROMPT.slice(0, 1200), { delay: 4 });
}

await page.screenshot({ path: '/home/potter/cursor-agent-ready.png', fullPage: false });

const state = await page.evaluate(() => ({
  url: location.href,
  preview: (document.querySelector('[contenteditable="true"]')?.innerText || '').slice(0, 200),
  repo: (document.body?.innerText || '').match(/crispy-garbanzo|eat-the-sounds|Uuriko\/[^\n]+/)?.[0] || '',
}));

fs.writeFileSync('/home/potter/CURSOR-SETUP-STATUS.json', JSON.stringify({ ...state, promptChars: PROMPT.length }, null, 2));
console.log(JSON.stringify(state, null, 2));
console.log('screenshot: cursor-agent-ready.png');
console.log('NEXT: press Enter in the Chrome tab to submit the agent (or click Send if visible)');

await browser.disconnect();