#!/usr/bin/env node
/** Deep probe + enable Webflow MCP on Cursor plugin page + agents composer. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, sleep } from './collab-lib.mjs';

const OUT = path.join(ROOT, 'CURSOR-WEBFLOW-MCP-ENABLE.json');

async function dumpInteractive(page, label) {
  return page.evaluate((lab) => {
    const items = [...document.querySelectorAll('button,a,input,[role=button],[role=switch],[role=checkbox],label,div,span')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
        return {
          tag: el.tagName,
          role: el.getAttribute('role'),
          type: el.getAttribute('type'),
          text: text.slice(0, 100),
          checked: el.getAttribute('aria-checked') || (el.checked ? 'true' : null),
          state: el.getAttribute('data-state'),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
          visible: r.width > 0 && r.height > 0,
        };
      })
      .filter((i) => i.visible && i.w > 4 && i.h > 4)
      .filter((i) => /webflow|mcp|plugin|toggle|enable|connect|install|oauth|auth|server/i.test(i.text) || i.role === 'switch')
      .slice(0, 80);
    return { label: lab, url: location.href, title: document.title, items, body: (document.body?.innerText || '').slice(0, 3000) };
  }, label);
}

async function clickAt(page, x, y) {
  await page.mouse.click(x, y);
  await sleep(1200);
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = (await browser.pages()).find((p) => /cursor\.com/i.test(p.url())) || await browser.newPage();
  await page.bringToFront();
  const steps = [];

  // Plugin detail page
  await page.goto('https://cursor.com/dashboard/plugins?plugin-id=1090', { waitUntil: 'networkidle2', timeout: 90000 }).catch(() =>
    page.goto('https://cursor.com/dashboard/plugins?plugin-id=1090', { waitUntil: 'domcontentloaded', timeout: 90000 }),
  );
  await sleep(3000);
  steps.push(await dumpInteractive(page, 'plugin-landing'));
  await page.screenshot({ path: path.join(ROOT, 'cursor-plugin-webflow.png'), fullPage: true });

  // Click MCPs section
  const mcpsHit = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,a,div,span')].find((n) => {
      const t = (n.textContent || '').trim();
      return t === 'MCPs' || /^MCPs?\s*\(/i.test(t);
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (el.textContent || '').trim().slice(0, 40) };
  });
  if (mcpsHit) {
    await clickAt(page, mcpsHit.x, mcpsHit.y);
    steps.push({ step: 'click-mcps', mcpsHit });
    steps.push(await dumpInteractive(page, 'after-mcps-click'));
    await page.screenshot({ path: path.join(ROOT, 'cursor-plugin-mcps.png') });
  }

  // Find and toggle webflow switch
  const toggles = await page.evaluate(() => {
    return [...document.querySelectorAll('[role=switch],input[type=checkbox],button[data-state]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        const parent = el.closest('div,li,label')?.textContent?.trim().replace(/\s+/g, ' ') || '';
        return {
          tag: el.tagName,
          role: el.getAttribute('role'),
          state: el.getAttribute('data-state') || el.getAttribute('aria-checked'),
          parent: parent.slice(0, 80),
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
        };
      })
      .filter((t) => t.parent && /webflow/i.test(t.parent));
  });
  steps.push({ toggles });

  for (const t of toggles) {
    if (t.state !== 'checked' && t.state !== 'true') {
      await clickAt(page, t.x, t.y);
      steps.push({ step: 'toggled-webflow', before: t.state });
    }
  }

  // Also try clicking any "webflow" text link
  const wfLink = await page.evaluate(() => {
    const el = [...document.querySelectorAll('a,button,div,span')].find((n) => /^webflow$/i.test((n.textContent || '').trim()));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (wfLink) {
    await clickAt(page, wfLink.x, wfLink.y);
    steps.push({ step: 'click-webflow-link' });
  }

  // Check for OAuth popup
  await sleep(2000);
  const allPages = await browser.pages();
  const oauthUrls = [];
  for (const p of allPages) {
    const u = p.url();
    if (/mcp\.webflow|webflow\.com.*oauth|webflow\.com.*authorize/i.test(u)) oauthUrls.push(u);
  }
  steps.push({ oauthUrls });

  // Agents page — new agent composer
  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2500);

  // Click textarea / composer area first
  const composer = await page.evaluate(() => {
    const ta = document.querySelector('textarea,[contenteditable="true"],[role="textbox"]');
    if (ta) {
      const r = ta.getBoundingClientRect();
      ta.focus();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: ta.tagName };
    }
    return null;
  });
  if (composer) await clickAt(page, composer.x, composer.y);

  // Dump all bottom toolbar buttons
  const toolbar = await page.evaluate(() => {
    return [...document.querySelectorAll('button,[role=button]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      })
      .filter((b) => b.w > 0 && b.h > 0 && b.y > 300)
      .sort((a, b) => a.y - b.y || a.x - b.x);
  });
  steps.push({ toolbar });

  // Try clicking buttons that might open MCP picker
  const mcpCandidates = toolbar.filter((b) =>
    /^(Webflow|MCP|@|\+|Tools|Plugins|Integrations)$/i.test(b.text) ||
    /webflow|mcp|plugin|tool/i.test(b.text),
  );
  for (const c of mcpCandidates) {
    await clickAt(page, c.x, c.y);
    const menu = await page.evaluate(() =>
      [...document.querySelectorAll('button,div,span,[role=menuitem],[role=option],[role=switch]')]
        .map((el) => ({
          text: (el.textContent || '').trim().slice(0, 60),
          role: el.getAttribute('role'),
          checked: el.getAttribute('aria-checked'),
        }))
        .filter((i) => i.text && (/webflow|mcp|enable|connect/i.test(i.text) || i.role === 'switch'))
        .slice(0, 20),
    );
    if (menu.length) {
      steps.push({ step: 'menu-after-click', button: c.text, menu });
      // Toggle Webflow in menu
      const wf = menu.find((m) => /^webflow$/i.test(m.text));
      if (wf) {
        const hit = await page.evaluate(() => {
          const el = [...document.querySelectorAll('button,div,span,[role=menuitem]')]
            .find((n) => /^webflow$/i.test((n.textContent || '').trim()));
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        if (hit) await clickAt(page, hit.x, hit.y);
      }
      break;
    }
    await page.keyboard.press('Escape');
    await sleep(400);
  }

  const final = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('button')]
      .map((b) => (b.textContent || '').trim())
      .filter((t) => /^Webflow$|^MCP$/i.test(t) || /webflow/i.test(t));
    const body = (document.body?.innerText || '').slice(0, 2000);
    return { chips, webflowChip: chips.includes('Webflow'), body };
  });
  steps.push({ final });

  await page.screenshot({ path: path.join(ROOT, 'cursor-webflow-mcp-enabled.png') });

  const out = {
    at: new Date().toISOString(),
    ok: final.webflowChip,
    steps,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: out.ok, webflowChip: final.webflowChip, oauthUrls, toggleCount: toggles.length }, null, 2));
  await browser.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });