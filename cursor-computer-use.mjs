#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CDP = 'http://127.0.0.1:9223';
const cmd = process.argv[2] || 'snapshot';
const arg = process.argv[3] || '';

const browser = await puppeteer.connect({ browserURL: CDP, protocolTimeout: 90000 });
let page = (await browser.pages()).find((p) => p.url().includes('cursor.com'));
if (!page) {
  page = await browser.newPage();
  await page.goto('https://cursor.com/agents', { waitUntil: 'networkidle2', timeout: 90000 });
}

async function snap(label) {
  const data = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    body: (document.body?.innerText || '').slice(0, 5000),
    buttons: [...document.querySelectorAll('button, a[href], [role="button"]')]
      .map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 40),
    inputs: [...document.querySelectorAll('textarea, input, select, [contenteditable="true"]')]
      .map((el) => ({
        tag: el.tagName,
        type: el.type || '',
        placeholder: el.placeholder || '',
        value: (el.value || el.textContent || '').slice(0, 80),
        visible: el.offsetParent !== null,
      }))
      .filter((x) => x.visible || x.placeholder),
  }));
  const path = `/home/potter/cursor-snap-${label}.json`;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  await page.screenshot({ path: `/home/potter/cursor-snap-${label}.png` });
  console.log(label, data.url, 'buttons:', data.buttons.slice(0, 12));
  return data;
}

await page.bringToFront();

if (cmd === 'goto') {
  await page.goto(arg || 'https://cursor.com/agents', { waitUntil: 'networkidle2', timeout: 90000 });
  await snap('goto');
} else if (cmd === 'click') {
  const ok = await page.evaluate((text) => {
    const els = [...document.querySelectorAll('button, a, [role="button"], div[role="button"]')];
    const el = els.find((e) => (e.innerText || e.getAttribute('aria-label') || '').trim() === text)
      || els.find((e) => (e.innerText || '').includes(text));
    if (!el) return false;
    el.click();
    return true;
  }, arg);
  console.log('click', arg, ok);
  await new Promise((r) => setTimeout(r, 2500));
  await snap('after-click');
} else if (cmd === 'fill-repo') {
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('input, textarea, [contenteditable="true"]')];
    for (const el of els) {
      if (/repository|repo|search/i.test(el.placeholder || el.getAttribute('aria-label') || '')) {
        el.focus();
        if ('value' in el) { el.value = 'eat-the-sounds'; el.dispatchEvent(new Event('input', { bubbles: true })); }
      }
    }
  });
  await snap('fill-repo');
} else if (cmd === 'agent-prompt') {
  const prompt = `Ship ∴ EAT THE SOUNDS ∴ (@ninjawhee jazz store game).

Read AGENTS.md. Vanilla JS canvas — no bundler.

P0 tasks remaining:
3. Album % in mirror choice UI (game-progress.js + heavy-runtime.js)
4. Gold pad markers on vinyl pads (overworld.js:drawInteractPads)
5. Mirror choice Sarah tint (heavy-runtime.js:confirmMirrorChoice)

Implement #3 completely. Run verify after. Soul-first tone.`;
  const filled = await page.evaluate((text) => {
    const areas = [...document.querySelectorAll('textarea, [contenteditable="true"]')];
    const el = areas.find((a) => a.offsetParent !== null) || areas[0];
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    return true;
  }, prompt);
  console.log('prompt filled', filled);
  await snap('agent-prompt');
} else {
  await snap(cmd);
}

await browser.disconnect();