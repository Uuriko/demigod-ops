#!/usr/bin/env node
/** Open Demigod website work tabs in CDP Chrome. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, WEBFLOW_DESIGNER_URL } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-WORKSPACE-TABS.json');

const TABS = [
  { role: 'designer', url: WEBFLOW_DESIGNER_URL, required: true },
  { role: 'live', url: 'https://www.trydemigod.com/', required: true },
  { role: 'grok-heavy', url: 'https://grok.com/', required: true },
  { role: 'forms', url: 'https://webflow.com/dashboard/sites/talentlink-sf/forms', required: false },
  { role: 'custom-code', url: 'https://webflow.com/dashboard/sites/talentlink-sf/custom-code', required: false },
];

async function ensureCdp() {
  try {
    const r = await fetch(`${CDP_URL}/json/version`);
    if (r.ok) return true;
  } catch (_) { /* down */ }
  console.log('CDP down — launching Chrome...');
  const launch = spawnSync('bash', [path.join(ROOT, 'launch-demigod-chrome.sh')], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
  });
  if (launch.status !== 0) throw new Error(launch.stderr || launch.stdout || 'chrome launch failed');
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const r = await fetch(`${CDP_URL}/json/version`);
      if (r.ok) return true;
    } catch (_) { /* retry */ }
  }
  return false;
}

async function main() {
  const ok = await ensureCdp();
  if (!ok) throw new Error('CDP not available after launch');

  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const existing = await browser.pages();
  const opened = [];
  const kept = [];

  for (const tab of TABS) {
    const hit = existing.find((p) => {
      const u = p.url();
      if (tab.role === 'designer') return u.includes('talentlink-sf.design.webflow.com');
      if (tab.role === 'live') return u.includes('www.trydemigod.com');
      if (tab.role === 'grok-heavy') return u.includes('grok.com');
      if (tab.role === 'forms') return u.includes('/talentlink-sf/forms');
      if (tab.role === 'custom-code') return u.includes('/talentlink-sf/custom-code');
      return false;
    });
    if (hit) {
      kept.push({ role: tab.role, url: hit.url() });
      if (hit.url() !== tab.url && tab.role !== 'grok-heavy') {
        await hit.goto(tab.url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      }
      continue;
    }
    const page = await browser.newPage();
    await page.goto(tab.url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    opened.push({ role: tab.role, url: tab.url });
  }

  // Close game/playtest tabs — Demigod session only.
  for (const p of await browser.pages()) {
    const u = p.url();
    if (/localhost:8765|eat-the-sounds/i.test(u)) {
      await p.close();
      opened.push({ role: 'closed-game', url: u });
    }
  }

  await browser.disconnect();

  spawnSync('npm', ['run', 'demigod:designer:resize'], { cwd: ROOT });

  const report = { at: new Date().toISOString(), opened, kept, cdp: CDP_URL };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });