#!/usr/bin/env node
/** Enable Webflow MCP in Cursor agents + verify toggle. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, log, sleep } from './collab-lib.mjs';

const OUT = path.join(ROOT, 'CURSOR-WEBFLOW-MCP-ENABLE.json');

async function snap(page, label) {
  return page.evaluate((lab) => {
    const buttons = [...document.querySelectorAll('button,a,[role=button],label,div')]
      .map((el) => ({
        tag: el.tagName,
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 80),
        role: el.getAttribute('role'),
        checked: el.getAttribute('aria-checked') || el.getAttribute('data-state'),
      }))
      .filter((b) => b.text.length > 0 && b.text.length < 80)
      .filter((b) => /webflow|mcp|plugin|integrat|connect|enable|toggle/i.test(b.text))
      .slice(0, 40);
    return { label: lab, url: location.href, buttons };
  }, label);
}

async function clickByText(page, re, { timeout = 8000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const hit = await page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const el = [...document.querySelectorAll('button,a,[role=button],label,span,div')]
        .find((n) => {
          const t = (n.textContent || n.getAttribute('aria-label') || '').trim();
          return re.test(t) && t.length < 100 && n.children.length <= 6;
        });
      if (!el) return null;
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60);
    }, re.source || re);
    if (hit) { await sleep(700); return hit; }
    await sleep(350);
  }
  return null;
}

async function enableInComposer(page) {
  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);

  const steps = [];
  steps.push(await snap(page, 'agents-landing'));

  // New agent if needed
  await clickByText(page, /new agent/i);
  await sleep(1500);

  // Open MCP / tools menu near composer
  let opened = await clickByText(page, /^MCP$|MCP servers|Tools/);
  if (!opened) opened = await clickByText(page, /\+.*MCP|Add MCP|Connect/);
  steps.push({ step: 'open-mcp', opened });
  await sleep(1000);
  steps.push(await snap(page, 'after-mcp-click'));

  // Toggle Webflow — chip button or switch in list
  let wf = await clickByText(page, /^Webflow$/);
  if (!wf) wf = await clickByText(page, /Webflow MCP/);
  steps.push({ step: 'toggle-webflow', wf });

  // Enable switch if in integrations panel
  await clickByText(page, /enable|connect|install|add/i);
  await sleep(1000);

  // Plugins dashboard fallback
  const pluginsUrl = 'https://cursor.com/dashboard/plugins';
  await page.goto(pluginsUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  steps.push(await snap(page, 'plugins-page'));
  await clickByText(page, /webflow/i);
  await sleep(1000);
  await clickByText(page, /enable|install|connect|add/i);
  await sleep(1500);
  steps.push(await snap(page, 'plugins-after'));

  // Integrations fallback
  await page.goto('https://cursor.com/dashboard/integrations', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await sleep(1500);
  steps.push(await snap(page, 'integrations'));

  // Back to agents — verify Webflow chip visible
  await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(2000);
  await clickByText(page, /new agent/i);
  await sleep(1000);
  const final = await page.evaluate(() => {
    const wfBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Webflow');
    const mcpBtn = [...document.querySelectorAll('button')].find((b) => /MCP/i.test(b.textContent || ''));
    const body = (document.body?.innerText || '').slice(0, 2500);
    return {
      webflowChip: !!wfBtn,
      mcpBtn: !!mcpBtn,
      webflowConnected: /webflow.*connect|connected.*webflow/i.test(body),
      sample: body.match(/Webflow[^\n]{0,80}/gi)?.slice(0, 5) || [],
    };
  });
  steps.push({ final });

  await page.screenshot({ path: path.join(ROOT, 'cursor-webflow-mcp-enabled.png') });
  return steps;
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = (await browser.pages()).find((p) => /cursor\.com/i.test(p.url())) || await browser.newPage();
  await page.bringToFront();
  const steps = await enableInComposer(page);
  await browser.disconnect();
  const out = {
    at: new Date().toISOString(),
    ok: steps.at(-1)?.final?.webflowChip || steps.at(-1)?.final?.webflowConnected,
    steps,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });