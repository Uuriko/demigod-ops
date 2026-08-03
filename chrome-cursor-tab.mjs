#!/usr/bin/env node
/**
 * Connect to Flatpak Chrome CDP and interact with the Cursor tab.
 * Usage: node chrome-cursor-tab.mjs [snapshot|screenshot|title]
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9223';
const mode = process.argv[2] || 'snapshot';

const browser = await puppeteer.connect({ browserURL: CDP, protocolTimeout: 60000 });
const pages = await browser.pages();

const cursorPage =
  pages.find((p) => p.url().includes('cursor.com')) ||
  pages.find((p) => !p.url().startsWith('chrome://') && p.url().startsWith('http'));

if (!cursorPage) {
  console.error('No Cursor (or http) tab found. Open https://cursor.com in CDP Chrome.');
  process.exit(1);
}

await cursorPage.bringToFront();

if (mode === 'title') {
  console.log(JSON.stringify({ title: await cursorPage.title(), url: cursorPage.url() }, null, 2));
} else if (mode === 'screenshot') {
  const out = '/home/potter/cursor-tab-shot.png';
  await cursorPage.screenshot({ path: out, fullPage: false });
  console.log('saved', out);
} else {
  const data = await cursorPage.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const links = [...document.querySelectorAll('a[href]')]
      .slice(0, 20)
      .map((a) => ({ text: (a.innerText || '').trim().slice(0, 60), href: a.getAttribute('href') }));
    const headings = [...document.querySelectorAll('h1,h2,h3')]
      .slice(0, 12)
      .map((h) => ({ tag: h.tagName, text: (h.innerText || '').trim().slice(0, 80) }));
    return {
      title: document.title,
      url: location.href,
      headings,
      links,
      bodyPreview: (main.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
    };
  });
  fs.writeFileSync('/home/potter/cursor-tab-snapshot.json', JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
}

await browser.disconnect();