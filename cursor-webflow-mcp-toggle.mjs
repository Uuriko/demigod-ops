#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, sleep } from './collab-lib.mjs';

const OUT = path.join(ROOT, 'CURSOR-WEBFLOW-MCP-ENABLE.json');

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = (await browser.pages()).find((p) => /cursor\.com/i.test(p.url())) || await browser.newPage();

  // 1) Webflow plugin MCP section
  await page.goto('https://cursor.com/dashboard/plugins?plugin-id=1090', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2500);

  await page.evaluate(() => {
    const mcps = [...document.querySelectorAll('[role=button],button,div,a')].find((el) => (el.textContent || '').trim() === 'MCPs');
    mcps?.click();
  });
  await sleep(800);

  const mcpToggle = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a,button,div,label,input')];
    const wf = links.find((el) => /^webflow$/i.test((el.textContent || '').trim()) || (el.getAttribute('href') || '').includes('webflow'));
    if (wf) {
      const r = wf.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: wf.tagName, text: (wf.textContent || '').trim().slice(0, 40) };
    }
    const toggle = links.find((el) => /switch|toggle/i.test(el.getAttribute('role') || '') && el.closest('[class]')?.textContent?.includes('webflow'));
    if (toggle) {
      const r = toggle.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: toggle.tagName, text: 'toggle' };
    }
    return null;
  });
  if (mcpToggle) {
    await page.mouse.click(mcpToggle.x, mcpToggle.y);
    await sleep(2000);
  }

  // 2) New agent — open tool/MCP picker
  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button,a')].find((b) => /new agent/i.test(b.textContent || ''));
    btn?.click();
  });
  await sleep(1500);

  // Click @ or + or MCP near composer
  const picker = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('button,[role=button]')].map((el) => {
      const r = el.getBoundingClientRect();
      const t = (el.textContent || el.getAttribute('aria-label') || '').trim();
      return { t, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }).filter((c) => c.w > 0 && c.h > 0 && (/^@$|^\+$|MCP|Tools|Connect/i.test(c.t) || c.t === 'Webflow'));
    return candidates.slice(0, 15);
  });
  console.log('picker candidates', JSON.stringify(picker, null, 2));

  for (const c of picker) {
    if (/^@$|^\+$|MCP|Tools/i.test(c.t)) {
      await page.mouse.click(c.x, c.y);
      await sleep(1000);
      break;
    }
  }

  const menuItems = await page.evaluate(() =>
    [...document.querySelectorAll('button,div,span,label,[role=menuitem],[role=option]')]
      .map((el) => (el.textContent || '').trim())
      .filter((t) => t.length > 0 && t.length < 60 && /webflow|mcp|plugin|enable|connect/i.test(t))
      .slice(0, 25),
  );
  console.log('menu', menuItems);

  // Toggle Webflow in menu
  const wfHit = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,div,span,label,[role=menuitem]')]
      .find((n) => (n.textContent || '').trim() === 'Webflow' || /^Webflow$/i.test((n.textContent || '').trim()));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (wfHit) {
    await page.mouse.click(wfHit.x, wfHit.y);
    await sleep(1500);
  }

  const state = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((t) => /webflow|mcp/i.test(t));
    const switches = [...document.querySelectorAll('[role=switch],[aria-checked]')].map((el) => ({
      label: (el.closest('label,div')?.textContent || '').trim().slice(0, 50),
      checked: el.getAttribute('aria-checked'),
    }));
    return { url: location.href, chips, switches: switches.slice(0, 10), body: (document.body?.innerText || '').slice(0, 1500) };
  });

  await page.screenshot({ path: path.join(ROOT, 'cursor-webflow-mcp-enabled.png') });

  // OAuth window may open — check all pages
  const pages = await browser.pages();
  const oauth = [];
  for (const p of pages) {
    const u = p.url();
    if (/webflow\.com|mcp\.webflow/i.test(u)) oauth.push(u);
  }

  const out = { at: new Date().toISOString(), state, oauth, webflowChip: state.chips.some((c) => c === 'Webflow') };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });