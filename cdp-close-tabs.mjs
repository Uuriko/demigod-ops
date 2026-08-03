#!/usr/bin/env node
/** Close duplicate / stale CDP Chrome tabs — keep one per active role. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'CDP-TAB-CLEANUP.json');

const PLAYTEST_URL_RE = /127\.0\.0\.1:8765|localhost:8765|eat-the-sounds\.html/;
const LIVE_PLAYTEST_RE = /talentlink-sf\.webflow\.io\/\?v=(playtest|audit|fullreview|badgefix)/i;

function role(url) {
  if (PLAYTEST_URL_RE.test(url)) return 'game';
  if (/grok\.com/i.test(url)) return 'grok';
  if (/talentlink-sf\.design\.webflow\.com/i.test(url)) return 'designer';
  if (/cursor\.com\/agents\/bc-/i.test(url)) return 'cursor-agent';
  if (/cursor\.com\/agents/i.test(url)) return 'cursor-list';
  if (/talentlink-sf\.webflow\.io/i.test(url)) return 'live';
  if (/s3\.amazonaws\.com\/webflow-prod-assets/i.test(url)) return 's3-preview';
  if (/webflow\.com\/dashboard.*custom-code/i.test(url)) return 'custom-code';
  if (/webflow\.com\/dashboard.*integrations/i.test(url)) return 'integrations';
  if (/webflow\.com\/dashboard.*\/assets/i.test(url)) return 'assets-404';
  if (/github\.com\/login\/device/i.test(url)) return 'github-device';
  if (/github\.com\/Uuriko/i.test(url)) return 'github-profile';
  if (/www\.trydemigod\.com/i.test(url)) return 'live-prod';
  if (/stripe\.com|stripe\.network|hcaptcha\.com|stripecdn\.com/i.test(url)) return 'payment-iframe';
  if (/^about:blank$/i.test(url) || url === '') return 'blank';
  if (/claude\.ai/i.test(url)) return 'claude';
  if (/webflow\.com\/dashboard/i.test(url)) return 'webflow-dashboard';
  if (/chrome-error:\/\//i.test(url)) return 'chrome-error';
  return 'other';
}

function shouldClose(url, kept, dryRun) {
  const r = role(url);
  if (r === 'game') return { close: true, reason: 'game/playtest tab' };
  if (r === 's3-preview') return { close: true, reason: 'stale Webflow asset preview' };
  if (r === 'blank') return { close: true, reason: 'blank tab' };
  if (r === 'live' && LIVE_PLAYTEST_RE.test(url)) return { close: true, reason: 'stale live playtest tab' };
  if (r === 'live') {
    if (kept.live) return { close: true, reason: 'duplicate live site tab' };
    kept.live = true;
    return { close: false };
  }
  if (r === 'grok') {
    if (kept.grok) return { close: true, reason: 'duplicate grok tab' };
    kept.grok = true;
    return { close: false };
  }
  if (r === 'designer') {
    if (kept.designer) return { close: true, reason: 'duplicate designer tab' };
    kept.designer = true;
    return { close: false };
  }
  if (r === 'cursor-agent') {
    if (kept.cursorAgent) return { close: true, reason: 'duplicate cursor agent tab' };
    kept.cursorAgent = true;
    return { close: false };
  }
  if (r === 'cursor-list') return { close: true, reason: 'generic cursor agents list' };
  // Keep ONE custom-code (head/foot paste). Fable 2026-07-09 keep-list.
  if (r === 'custom-code') {
    if (kept.customCode) return { close: true, reason: 'duplicate custom-code tab' };
    kept.customCode = true;
    return { close: false };
  }
  if (r === 'integrations') return { close: true, reason: 'integrations dashboard (reopen for MCP Bridge)' };
  if (r === 'assets-404') return { close: true, reason: 'stale Webflow assets dashboard' };
  if (r === 'github-device') return { close: true, reason: 'completed GitHub device activation' };
  if (r === 'github-profile') return { close: true, reason: 'GitHub profile (not needed for Demigod)' };
  if (r === 'payment-iframe') return { close: true, reason: 'Stripe/hCaptcha iframe tab' };
  if (r === 'live-prod') {
    if (kept.liveProd) return { close: true, reason: 'duplicate trydemigod.com tab' };
    kept.liveProd = true;
    return { close: false };
  }
  if (r === 'claude') {
    if (kept.claude) return { close: true, reason: 'duplicate claude.ai tab' };
    kept.claude = true;
    return { close: false };
  }
  // Keep at most one generic dashboard (forms/settings); close extras as dups via other roles
  if (r === 'webflow-dashboard') {
    if (kept.webflowDash) return { close: true, reason: 'duplicate webflow dashboard tab' };
    kept.webflowDash = true;
    return { close: false };
  }
  if (r === 'chrome-error') {
    return { close: true, reason: 'stale chrome error tab' };
  }
  return { close: false };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const pages = await browser.pages();
  const kept = {};
  const report = { at: new Date().toISOString(), dryRun, before: [], closed: [], kept: [] };

  for (const page of pages) {
    let url = '';
    try { url = page.url(); } catch (_) { continue; }
    report.before.push(url);
    const decision = shouldClose(url, kept, dryRun);
    if (decision.close) {
      if (!dryRun) {
        try { await page.close(); } catch (_) { /* gone */ }
      }
      report.closed.push({ url, reason: decision.reason });
    } else {
      report.kept.push({ url, role: role(url) });
    }
  }

  await browser.disconnect();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: true,
    dryRun,
    before: report.before.length,
    closed: report.closed.length,
    kept: report.kept.length,
    out: OUT,
  }, null, 2));
  for (const c of report.closed) console.log(`  closed [${c.reason}]: ${c.url.slice(0, 90)}`);
  for (const k of report.kept) console.log(`  kept [${k.role}]: ${k.url.slice(0, 90)}`);
}

/** Callable from other scripts after CDP sessions. */
export async function closeExtraTabs(opts = {}) {
  const dryRun = !!opts.dryRun;
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const pages = await browser.pages();
  const kept = {};
  const closed = [];
  for (const page of pages) {
    let url = '';
    try { url = page.url(); } catch (_) { continue; }
    const decision = shouldClose(url, kept, dryRun);
    if (decision.close) {
      if (!dryRun) { try { await page.close(); } catch (_) { /* gone */ } }
      closed.push({ url, reason: decision.reason });
    }
  }
  await browser.disconnect();
  return { closed: closed.length, kept: Object.keys(kept).length, details: closed };
}

if (process.argv[1]?.endsWith('cdp-close-tabs.mjs')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}