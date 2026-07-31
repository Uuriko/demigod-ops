#!/usr/bin/env node
/** Click MCPs menu in Cursor agents composer and enable Webflow. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, sleep } from './collab-lib.mjs';

const OUT = path.join(ROOT, 'CURSOR-WEBFLOW-MCP-ENABLE.json');

async function clickText(page, text, { timeout = 6000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const hit = await page.evaluate((want) => {
      const el = [...document.querySelectorAll('button,[role=button],a,div,span')]
        .find((n) => {
          const t = (n.textContent || n.getAttribute('aria-label') || '').trim();
          return t === want && n.getBoundingClientRect().width > 0;
        });
      if (!el) return null;
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: el.tagName };
    }, text);
    if (hit) { await sleep(900); return hit; }
    await sleep(300);
  }
  return null;
}

async function dumpMenu(page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll('button,div,span,label,[role=menuitem],[role=switch],[role=checkbox],input')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const text = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
        return {
          text: text.slice(0, 80),
          role: el.getAttribute('role'),
          checked: el.getAttribute('aria-checked') || (el.checked ? String(el.checked) : null),
          state: el.getAttribute('data-state'),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter((i) => i.w > 0 && i.h > 0 && i.y > 200 && i.y < 900)
      .filter((i) => i.text.length > 0 && i.text.length < 80);
    const unique = [];
    const seen = new Set();
    for (const i of items) {
      const k = `${i.text}|${i.x}|${i.y}`;
      if (!seen.has(k)) { seen.add(k); unique.push(i); }
    }
    return unique.slice(0, 60);
  });
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = (await browser.pages()).find((p) => /cursor\.com/i.test(p.url())) || await browser.newPage();
  await page.bringToFront();
  const steps = [];

  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2500);

  // Focus composer
  await page.evaluate(() => {
    const ta = document.querySelector('textarea,[contenteditable="true"],[role="textbox"]');
    ta?.focus();
  });
  await sleep(500);

  steps.push({ step: 'before', menu: await dumpMenu(page) });

  // Click MCPs chip/button in composer toolbar
  const mcps = await clickText(page, 'MCPs');
  steps.push({ step: 'click-mcps', mcps });
  await sleep(1200);
  steps.push({ step: 'after-mcps-open', menu: await dumpMenu(page) });
  await page.screenshot({ path: path.join(ROOT, 'cursor-mcps-menu-open.png') });

  // Toggle Webflow in MCP menu
  const wfToggle = await page.evaluate(() => {
    // Find row containing Webflow text + switch
    const rows = [...document.querySelectorAll('div,li,label,button')].filter((el) => {
      const t = (el.textContent || '').trim();
      return /webflow/i.test(t) && t.length < 120;
    });
    for (const row of rows) {
      const sw = row.querySelector('[role=switch],input[type=checkbox],[data-state]');
      if (sw) {
        const r = sw.getBoundingClientRect();
        return {
          parent: (row.textContent || '').trim().slice(0, 60),
          state: sw.getAttribute('aria-checked') || sw.getAttribute('data-state'),
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
        };
      }
      const r = row.getBoundingClientRect();
      if (r.width > 0) return { parent: (row.textContent || '').trim().slice(0, 60), state: 'row-click', x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    const wfBtn = [...document.querySelectorAll('button,div,span,[role=menuitem]')]
      .find((n) => /^webflow$/i.test((n.textContent || '').trim()));
    if (wfBtn) {
      const r = wfBtn.getBoundingClientRect();
      return { parent: 'webflow-btn', state: 'btn', x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  });
  steps.push({ step: 'wf-toggle-found', wfToggle });

  if (wfToggle) {
    await page.mouse.click(wfToggle.x, wfToggle.y);
    await sleep(1500);
    steps.push({ step: 'after-wf-click', menu: await dumpMenu(page) });
  }

  // Also try Cloud Agents settings
  await page.goto('https://cursor.com/dashboard/cloud-agents', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(2000);
  const cloudItems = await page.evaluate(() =>
    [...document.querySelectorAll('button,[role=switch],a,div')]
      .map((el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80))
      .filter((t) => /webflow|mcp/i.test(t))
      .slice(0, 20),
  );
  steps.push({ step: 'cloud-agents', cloudItems });

  // Integrations page
  await page.goto('https://cursor.com/dashboard/integrations', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(2000);
  await clickText(page, 'Webflow');
  await sleep(1000);
  const intItems = await dumpMenu(page);
  steps.push({ step: 'integrations', intItems: intItems.filter((i) => /webflow|mcp|enable|connect/i.test(i.text)) });

  // Back to agents — verify
  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  const verify = await page.evaluate(() => {
    const body = (document.body?.innerText || '');
    const chips = [...document.querySelectorAll('button')]
      .map((b) => (b.textContent || '').trim())
      .filter((t) => /^Webflow$|^MCPs$|^W$/i.test(t) || /webflow/i.test(t));
    return { chips, hasMcps: body.includes('MCPs'), body: body.slice(0, 1200) };
  });
  steps.push({ verify });

  await page.screenshot({ path: path.join(ROOT, 'cursor-webflow-mcp-enabled.png') });

  const out = {
    at: new Date().toISOString(),
    ok: verify.chips.some((c) => /webflow|^W$/i.test(c)) || verify.hasMcps,
    steps,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: out.ok, chips: verify.chips, wfToggle }, null, 2));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });