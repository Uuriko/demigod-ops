#!/usr/bin/env node
/** WIZ a11y + perf audit via CDP: labels, contrast (WCAG), focus, dialog role, LCP/CLS. */
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(Number);
const ratio = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { window.__lcp = 0; window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
await page.goto('https://www.trydemigod.com', { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1500);
await page.evaluate(() => { const b = [...document.querySelectorAll('button,a,.premium-btn')].find((x) => /HIRE TALENT/i.test(x.textContent || '')); b && b.click(); });
await wait(800);
const a = await page.evaluate(() => {
  const form = document.querySelector('#startup-hire'); if (!form) return { issues: ['form_missing'], colors: [] };
  const issues = [];
  [...form.querySelectorAll('input,select,textarea')].forEach((el) => { if (el.type === 'hidden' || el.closest('.dg-wiz-nav')) return; const ok = (el.id && form.querySelector(`label[for="${el.id}"]`)) || el.getAttribute('aria-label') || el.closest('label'); if (!ok) issues.push(`no-label: ${el.name || el.type}`); });
  [...form.querySelectorAll('button')].forEach((b) => { if (!(b.textContent || '').trim() && !b.getAttribute('aria-label')) issues.push('unnamed-button'); });
  const modal = form.closest('#startup-modal'); if (modal && modal.getAttribute('role') !== 'dialog') issues.push('modal-missing-role-dialog'); if (modal && modal.getAttribute('aria-modal') !== 'true') issues.push('modal-missing-aria-modal');
  const nb = form.querySelector('.dg-wiz-next'); if (nb) { nb.focus(); const cs = getComputedStyle(nb); if (cs.outlineStyle === 'none' && !cs.boxShadow.includes('rgb')) issues.push('next-btn: no focus indicator'); }
  const bgOf = (el) => { let n = el; while (n && n !== document.documentElement) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba?\(\d+, \d+, \d+, 0\)|transparent/.test(c)) return c; n = n.parentElement; } return 'rgb(0,0,0)'; };
  const colors = ['.dg-wiz-q', '.dg-wiz-hint', '.dg-wiz-next', '.dg-wiz-count'].map((sel) => { const el = form.querySelector(sel); return el ? { sel, fg: getComputedStyle(el).color, bg: bgOf(el) } : null; }).filter(Boolean);
  return { issues, colors };
});
const contrast = a.colors.map((c) => ({ ...c, ratio: +ratio(rgb(c.fg), rgb(c.bg)).toFixed(2) }));
contrast.filter((c) => c.ratio < 4.5).forEach((c) => a.issues.push(`low-contrast ${c.sel}: ${c.ratio}:1 (< 4.5)`));
const perf = await page.evaluate(() => ({ lcpMs: Math.round(window.__lcp), cls: +window.__cls.toFixed(3) }));
if (perf.lcpMs > 2500) a.issues.push(`lcp-slow: ${perf.lcpMs}ms (> 2500)`);
if (perf.cls > 0.1) a.issues.push(`cls-high: ${perf.cls} (> 0.1)`);
const pass = a.issues.length === 0;
console.log(JSON.stringify({ pass, issues: a.issues, contrast, perf }, null, 2));
try { await page.close(); } catch {}
await browser.disconnect();
process.exit(pass ? 0 : 1);
