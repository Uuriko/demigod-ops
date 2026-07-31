#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, sleep } from './collab-lib.mjs';

const OUT = path.join(ROOT, 'CURSOR-WEBFLOW-MCP-ENABLE.json');

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = (await browser.pages()).find((p) => /cursor\.com\/agents/i.test(p.url()))
    || (await browser.pages()).find((p) => /cursor\.com/i.test(p.url()))
    || await browser.newPage();
  await page.bringToFront();
  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2500);

  // Find W chip / small round button near model selector
  const wChip = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button,[role=button],div')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
        const title = el.getAttribute('title') || '';
        return { text, title, tag: el.tagName, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      })
      .filter((b) => b.w > 0 && b.h > 0 && b.y > 100 && b.y < 500)
      .filter((b) => /^W$|^Webflow$|^MCPs?$/i.test(b.text) || /webflow|mcp/i.test(b.title));
    return buttons;
  });
  console.log('wChip candidates', JSON.stringify(wChip, null, 2));

  // Also find small round buttons (icon-only)
  const icons = await page.evaluate(() => {
    return [...document.querySelectorAll('button,[role=button]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const text = (el.textContent || '').trim();
        const aria = el.getAttribute('aria-label') || '';
        return { text, aria, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((b) => b.w > 0 && b.h > 0 && b.y > 150 && b.y < 350 && b.w < 60 && b.h < 60);
  });
  console.log('small icons', JSON.stringify(icons, null, 2));

  // Click W or smallest icon near y~200-280
  const target = wChip[0] || icons.find((i) => i.text === 'W' || i.aria?.includes('Webflow')) || icons.find((i) => i.y > 180 && i.y < 280);
  if (target) {
    await page.mouse.click(target.x, target.y);
    await sleep(1500);
    await page.screenshot({ path: path.join(ROOT, 'cursor-w-chip-open.png') });

    const menu = await page.evaluate(() =>
      [...document.querySelectorAll('button,div,span,label,[role=menuitem],[role=switch],[role=checkbox]')]
        .map((el) => ({
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
          role: el.getAttribute('role'),
          checked: el.getAttribute('aria-checked'),
          state: el.getAttribute('data-state'),
        }))
        .filter((i) => i.text && i.text.length < 80)
        .filter((i) => /webflow|mcp|enable|connect|toggle|server|auth/i.test(i.text) || i.role === 'switch')
        .slice(0, 30),
    );
    console.log('menu after W click', JSON.stringify(menu, null, 2));

    // Toggle any webflow switch off then on
    const sw = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[role=switch],input[type=checkbox]')].find((n) => {
        const p = (n.closest('div,li,label')?.textContent || '');
        return /webflow/i.test(p);
      });
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { checked: el.getAttribute('aria-checked'), x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (sw) {
      await page.mouse.click(sw.x, sw.y);
      await sleep(1000);
      console.log('toggled switch', sw);
    }
  }

  // Plugin page — scroll to MCPs, click pencil on webflow row
  await page.goto('https://cursor.com/dashboard/plugins?plugin-id=1090', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1000);

  const pencil = await page.evaluate(() => {
    const mcps = [...document.querySelectorAll('div,section')].find((el) => (el.textContent || '').includes('MCPs') && (el.textContent || '').includes('webflow'));
    if (!mcps) return null;
    const icons = [...mcps.querySelectorAll('button,a,svg')].map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, x: r.left + r.width / 2, y: r.top + r.height / 2, parent: (el.closest('div')?.textContent || '').trim().slice(0, 40) };
    }).filter((i) => i.x > 0);
    return { mcpsText: (mcps.textContent || '').trim().slice(0, 100), icons: icons.slice(0, 8) };
  });
  console.log('plugin MCPs section', JSON.stringify(pencil, null, 2));

  if (pencil?.icons?.length) {
    const edit = pencil.icons.find((i) => /webflow/i.test(i.parent)) || pencil.icons.at(-1);
    if (edit) {
      await page.mouse.click(edit.x, edit.y);
      await sleep(2000);
      await page.screenshot({ path: path.join(ROOT, 'cursor-plugin-mcp-edit.png') });
    }
  }

  // Check all pages for OAuth
  const oauth = (await browser.pages()).map((p) => p.url()).filter((u) => /mcp\.webflow|authorize|oauth/i.test(u));

  const final = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((t) => t.length < 20);
    return { url: location.href, chips: chips.filter((t) => /^W$|Webflow|MCP/i.test(t)) };
  });

  const out = { at: new Date().toISOString(), wChip, icons, target, oauth, final, ok: !!(target || final.chips.length) };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });