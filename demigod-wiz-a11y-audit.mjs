#!/usr/bin/env node
/** WIZ a11y + perf audit via CDP: labels, contrast (WCAG), focus, dialog role, LCP/CLS. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
const USE_LOCAL = process.argv.includes('--local');
const THROTTLE = process.argv.includes('--throttle');
const CORE = USE_LOCAL ? fs.readFileSync(process.env.DEMIGOD_A11Y_CORE || 'demigod-foot-core.js', 'utf8') : '';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
const ratio = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
const page = await browser.newPage();
if (THROTTLE) {
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 209715, uploadThroughput: 96000, connectionType: 'cellular3g' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}
if (USE_LOCAL) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (/foot-latest\.js(?:[?#]|$)|demigod-foot/i.test(url) || (/catbox|jsdelivr/i.test(url) && /foot.*\.js(?:[?#]|$)/i.test(url))) {
      req.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
    } else req.continue().catch(() => {});
  });
}
await page.setViewport({ width: 390, height: 844 });
await page.evaluateOnNewDocument(() => { const name = (n) => n ? n.id ? '#'+n.id : n.className ? '.'+String(n.className).trim().split(/\s+/).join('.') : n.tagName : null; const rect = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }); window.__lcp = 0; window.__lcpNode = null; window.__cls = 0; window.__clsEntries = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__lcp = e.startTime; window.__lcpNode = name(e.element); } }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__clsEntries.push({ value: e.value, at: e.startTime, sources: e.sources.map((s) => { const n=s.node; return n ? { node: name(n), previousRect: rect(s.previousRect), currentRect: rect(s.currentRect) } : null; }).filter(Boolean) }); } }).observe({ type: 'layout-shift', buffered: true }); });
await page.goto(`https://www.trydemigod.com/?a11y=${USE_LOCAL ? 'local-' : ''}${Date.now()}`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1500);
const perf = await page.evaluate(() => ({ lcpMs: Math.round(window.__lcp), lcpNode: window.__lcpNode, cls: +window.__cls.toFixed(3), clsEntries: window.__clsEntries }));
await page.evaluate(() => { document.querySelector('a[href*="wiz=startup"],[data-demigod-modal="startup"]')?.click(); });
await wait(800);
await page.evaluate(() => { const f = document.querySelector('#startup-hire'); if (f?.dataset.dgWizKey === 'welcome') f.querySelector('.dg-wiz-next')?.click(); });
await wait(250);
const a = await page.evaluate(() => {
  const form = document.querySelector('#startup-hire'); if (!form) return { issues: ['form_missing'], colors: [] };
  const issues = [];
  if (form.closest('#startup-modal')?.getAttribute('aria-hidden') !== 'false') issues.push('modal-not-open');
  [...form.querySelectorAll('input,select,textarea')].forEach((el) => { if (/^(hidden|submit|button|reset)$/i.test(el.type) || el.offsetParent === null || el.closest('.dg-wiz-nav')) return; const ok = (el.id && form.querySelector(`label[for="${el.id}"]`)) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label'); if (!ok) issues.push(`no-label: ${el.name || el.type}`); if (el.getBoundingClientRect().height < 48) issues.push(`small-target: ${el.name || el.type}`); });
  [...form.querySelectorAll('button')].forEach((b) => { if (!(b.textContent || '').trim() && !b.getAttribute('aria-label')) issues.push('unnamed-button'); });
  const modal = form.closest('#startup-modal'); if (modal && modal.getAttribute('role') !== 'dialog') issues.push('modal-missing-role-dialog'); if (modal && modal.getAttribute('aria-modal') !== 'true') issues.push('modal-missing-aria-modal');
  const nb = form.querySelector('.dg-wiz-next'); if (nb) { nb.focus(); const cs = getComputedStyle(nb); if (cs.outlineStyle === 'none' && !cs.boxShadow.includes('rgb')) issues.push('next-btn: no focus indicator'); }
  const bgOf = (el) => { const layers = []; for (let n = el; n; n = n.parentElement) layers.unshift(getComputedStyle(n).backgroundColor); let out = [255, 255, 255]; layers.forEach((c) => { const m = c.match(/[\d.]+/g); if (!m) return; const a = m[3] == null ? 1 : +m[3]; out = [+m[0], +m[1], +m[2]].map((v, i) => v * a + out[i] * (1 - a)); }); return `rgb(${out.map(Math.round).join(',')})`; };
  const colors = ['.dg-wiz-q', '.dg-wiz-hint', '.dg-wiz-next', '.dg-wiz-count'].map((sel) => { const el = form.querySelector(sel); return el ? { sel, fg: getComputedStyle(el).color, bg: bgOf(el) } : null; }).filter(Boolean);
  return { issues, colors };
});
await page.evaluate(() => document.querySelector('#startup-hire .dg-wiz-next')?.click());
await wait(250);
const validation = await page.evaluate(() => {
  const form = document.querySelector('#startup-hire');
  const field = [...form.querySelectorAll('input,select,textarea')].find((el) => el.offsetParent !== null);
  const errId = (field?.getAttribute('aria-describedby') || '').split(/\s+/).find((id) => id.startsWith('dg-wiz-req-err-'));
  const err = errId && document.getElementById(errId);
  return { invalid: field?.getAttribute('aria-invalid'), focused: document.activeElement === field, announced: err?.getAttribute('role') === 'alert' && !!err.textContent.trim() };
});
if (validation.invalid !== 'true') a.issues.push('required-field: aria-invalid missing');
if (!validation.focused) a.issues.push('required-field: focus not returned');
if (!validation.announced) a.issues.push('required-field: error not announced');
const contrast = a.colors.map((c) => ({ ...c, ratio: +ratio(rgb(c.fg), rgb(c.bg)).toFixed(2) }));
contrast.filter((c) => c.ratio < 4.5).forEach((c) => a.issues.push(`low-contrast ${c.sel}: ${c.ratio}:1 (< 4.5)`));
if (perf.lcpMs > 2500) a.issues.push(`lcp-slow: ${perf.lcpMs}ms (> 2500)`);
if (perf.cls > 0.1) a.issues.push(`cls-high: ${perf.cls} (> 0.1)`);
const pass = a.issues.length === 0;
console.log(JSON.stringify({ pass, issues: a.issues, contrast, perf }, null, 2));
try { await page.close(); } catch {}
await browser.disconnect();
process.exit(pass ? 0 : 1);
