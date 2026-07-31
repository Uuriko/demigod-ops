#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { sleep } from './collab-lib.mjs';

const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
const page = (await browser.pages()).find((p) => /cursor\.com\/agents/i.test(p.url())) || (await browser.newPage());
await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
await sleep(2000);

const dump = await page.evaluate(() => {
  const items = [...document.querySelectorAll('button,svg,img,[role=button],a')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60),
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    })
    .filter((i) => i.w > 8 && i.h > 8 && i.y > 400)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  return items.slice(0, 60);
});

console.log(JSON.stringify(dump, null, 2));

// Try clicking bottom-left icons (often MCP/tools)
const icons = dump.filter((i) => i.tag === 'BUTTON' && i.w < 80 && i.h < 80 && i.y > 500);
for (const icon of icons.slice(0, 5)) {
  await page.mouse.click(icon.x + icon.w / 2, icon.y + icon.h / 2);
  await sleep(800);
  const menu = await page.evaluate(() =>
    [...document.querySelectorAll('button,div,span,[role=menuitem]')]
      .map((el) => (el.textContent || '').trim())
      .filter((t) => /webflow|mcp|plugin|server/i.test(t) && t.length < 50)
      .slice(0, 15),
  );
  if (menu.length) console.log('after click', icon.text || icon.tag, menu);
}

await page.screenshot({ path: '/home/potter/cursor-composer-probe.png' });
await browser.disconnect();