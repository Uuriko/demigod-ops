#!/usr/bin/env node
/**
 * demigod-cdp-force-latest.mjs
 * Force the current canonical CDN (from footer or arg) onto a live trydemigod tab in CDP.
 * Then opens HIRE and reports WIZ state (hasWiz, q, vis, 90d, review).
 * Usage: node demigod-cdp-force-latest.mjs [--cdn=https://...js] [--shots]
 * Always run gates after site changes.
 */
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';

const args = process.argv.slice(2);
let forcedCdn = args.find(a => a.startsWith('--cdn='))?.split('=')[1];
const doShots = args.includes('--shots');

async function main() {
  if (!forcedCdn) {
    // read from current footer
    const foot = fs.readFileSync('demigod-footer-lite.html', 'utf8');
    const m = foot.match(/src="(https:\/\/files\.catbox\.moe\/[^"]+\.js)"/);
    if (m) forcedCdn = m[1];
  }
  if (!forcedCdn) {
    console.error('No CDN found. Pass --cdn=... or update footer.');
    process.exit(1);
  }
  const src = forcedCdn + (forcedCdn.includes('?') ? '' : '?v=') + Date.now();
  console.log('Forcing:', src);

  const b = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: { width: 1200, height: 820 }, protocolTimeout: 180000 });
  const ps = await b.pages();
  let p = ps.find(x => /trydemigod/.test(x.url())) || ps[0];
  if (!p) { console.log('no tab'); await b.disconnect(); return; }

  await p.goto('https://www.trydemigod.com?' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  await p.evaluate((u) => {
    document.querySelectorAll('script[src*="catbox"]').forEach(s => { if (!s.src.includes('aji9m9') && !u.includes('aji9m9')) s.remove(); });
    if (!document.querySelector('script[src*="aji9m9"]') && !document.querySelector(`script[src*="${u.split('?')[0].split('/').pop()}"]`)) {
      const s = document.createElement('script'); s.src = u; document.head.appendChild(s);
    }
  }, src);

  await new Promise(r => setTimeout(r, 6000));
  const ver = await p.evaluate(() => window.dgFootVersion || 'none');
  console.log('VER:', ver);

  await p.evaluate(() => {
    const b = Array.from(document.querySelectorAll('a,button,[data-demigod-modal]')).find(x => /HIRE TALENT/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2200));

  const state = await p.evaluate(() => {
    const m = document.querySelector('#startup-modal');
    if (!m) return { noModal: true };
    const f = m.querySelector('form');
    const q = (m.querySelector('.dg-wiz-q') || {}).textContent || '';
    const vis = Array.from(m.querySelectorAll('input,textarea,select,.dg-wiz-head,.dg-wiz-nav,.dg-wiz-q')).filter(e => {
      try { return e.offsetParent !== null || getComputedStyle(e).display !== 'none'; } catch (_) { return false; }
    }).length;
    const bad = /HIRING FORM|CANDIDATE APPLICATION/i.test((m.textContent || document.title || ''));
    const has90 = !!m.querySelector('[name*="90day"],#90day-outcome');
    const hasRev = !!m.querySelector('.dg-wiz-review');
    return {
      hasWiz: !!m.querySelector('.dg-wiz-head'),
      q: q.trim().slice(0, 65),
      formD: f ? getComputedStyle(f).display : 'no',
      vis,
      bad,
      step: (m.querySelector('.dg-cur') || {}).textContent || '',
      has90,
      hasRev
    };
  });
  console.log('HIRE_STATE:', JSON.stringify(state));

  if (doShots) {
    const ts = Date.now();
    await p.screenshot({ path: `audit-shots/force-latest-hire-${ts}.png` }).catch(() => {});
    // quick advance
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => { const n = document.querySelector('#startup-modal .dg-wiz-next'); if (n) n.click(); });
      await new Promise(r => setTimeout(r, 700));
    }
    await p.screenshot({ path: `audit-shots/force-latest-flow-${ts}.png` }).catch(() => {});
  }

  await b.disconnect();
  console.log('done');
}

main().catch(e => { console.error(e); process.exit(1); });
