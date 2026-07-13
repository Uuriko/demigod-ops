#!/usr/bin/env node
/** Safe local performance cleanup — tabs, caches, stale ports. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DEMIGOD-PERF-CLEANUP.json');

const RESEARCH_TABS = /underdog\.io|dover\.com|jackandjill\.ai|fonzi\.io/i;

async function closeResearchTabs() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const closed = [];
  for (const p of await browser.pages()) {
    const u = p.url();
    if (RESEARCH_TABS.test(u)) {
      closed.push(u);
      await p.close();
    }
  }
  await browser.disconnect();
  return closed;
}

function trimDir(dir, maxAgeDays = 7) {
  if (!fs.existsSync(dir)) return { dir, removed: 0, bytes: 0 };
  const cutoff = Date.now() - maxAgeDays * 86400000;
  let removed = 0;
  let bytes = 0;
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    try {
      const st = fs.statSync(fp);
      if (st.mtimeMs < cutoff) {
        bytes += st.size;
        fs.rmSync(fp, { recursive: true, force: true });
        removed += 1;
      }
    } catch (_) { /* ignore */ }
  }
  return { dir, removed, bytes };
}

async function main() {
  const report = { at: new Date().toISOString(), actions: [] };

  const tabs = spawnSync('node', ['cdp-close-tabs.mjs'], { cwd: ROOT, encoding: 'utf8' });
  report.actions.push({ step: 'cdp-close-tabs', ok: tabs.status === 0, stdout: tabs.stdout?.trim().slice(-400) });

  try {
    const closed = await closeResearchTabs();
    report.actions.push({ step: 'close-research-tabs', closed });
  } catch (e) {
    report.actions.push({ step: 'close-research-tabs', error: String(e.message) });
  }

  const chromeHeavy = path.join(ROOT, '.grok/chrome-heavy');
  const cacheDirs = [
    path.join(chromeHeavy, 'GrShaderCache'),
    path.join(chromeHeavy, 'ShaderCache'),
    path.join(chromeHeavy, 'Code Cache/js'),
  ];
  report.cacheTrim = cacheDirs.map((d) => trimDir(d, 3));

  const { stdout: mem } = spawnSync('free', ['-h'], { encoding: 'utf8' });
  const { stdout: load } = spawnSync('uptime', [], { encoding: 'utf8' });
  report.system = { mem: mem?.trim(), load: load?.trim() };
  report.recommendations = [
    'cosmic-comp high CPU after 6+ days uptime — log out/in or reboot to reset compositor',
    'Keep Chrome tabs ≤6: designer + live + grok + forms dashboard only',
    'Defer webhook tunnel until needed — npm run demigod:submissions:webhook only when testing',
  ];

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT, cacheTrim: report.cacheTrim, recommendations: report.recommendations }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });