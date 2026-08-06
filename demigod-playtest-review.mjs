#!/usr/bin/env node
/** New-user playtest + screenshot review for Demigod live site. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import {
  LIVE_ORIGIN,
  scanLiveHtml,
  fetchFooterCoreJs,
  evaluatePageScan,
  evaluateDesignerScan,
  buildFindings,
  reportPass,
  modalVisible,
} from './demigod-live-lib.mjs';

const ROOT = '/home/potter';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = path.join(ROOT, 'audit-shots', 'playtest');
const OUT = path.join(ROOT, 'DEMIGOD-PLAYTEST-REVIEW.json');
const LIVE = `${LIVE_ORIGIN}/?v=playtest-${Date.now()}`;

fs.mkdirSync(SHOTS, { recursive: true });
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function shot(page, name) {
  const p = path.join(SHOTS, `${name}-${stamp()}.png`);
  try {
    await page.screenshot({ path: p, fullPage: false, timeout: 15000 });
    return p;
  } catch (e) {
    return { skipped: true, reason: e.message?.slice(0, 80) };
  }
}

async function clickFirst(page, selector) {
  return page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((node) => {
      const r = node.getBoundingClientRect();
      const s = getComputedStyle(node);
      return r.width > 2 && r.height > 2 && s.display !== 'none' && s.visibility !== 'hidden';
    });
    if (!el) return { ok: false, selector: sel };
    el.click();
    return { ok: true, text: (el.textContent || '').trim().slice(0, 40), href: el.getAttribute('href') };
  }, selector);
}

async function modalState(page, id) {
  return page.evaluate((modalId) => {
    const m = document.querySelector(`#${modalId}`);
    if (!m) return { exists: false };
    const s = getComputedStyle(m);
    const r = m.getBoundingClientRect();
    return {
      exists: true,
      display: s.display,
      opacity: s.opacity,
      visibility: s.visibility,
      visible: s.display !== 'none' && parseFloat(s.opacity || '1') > 0.1 && r.height > 50,
      title: m.innerText?.slice(0, 80),
    };
  }, id);
}

const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 300000 });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const rawHtml = await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).then((r) => r?.text() || '').catch(() => '');
await sleep(3500);

const footerCoreJs = await fetchFooterCoreJs(rawHtml);
const htmlScan = scanLiveHtml(rawHtml, { footerCoreJs });
const screenshots = {};
screenshots.landing = await shot(page, '01-landing');

const domSample = await page.evaluate(() => ({
  bodyText: document.body?.innerText || '',
  html: document.documentElement?.innerHTML || '',
  footerText: (document.querySelector('footer,.footer,footer[class]') || document.querySelector('[class*="footer_bottom"]'))?.innerText
    || [...document.querySelectorAll('footer *, .footer *, [class*="footer"] *')].map((e) => e.textContent || '').join(' '),
  modalsInDom: {
    startup: !!document.querySelector('#startup-modal'),
    jobseeker: !!document.querySelector('#jobseeker-modal'),
  },
  webflowBadge: !!document.querySelector('.w-webflow-badge'),
}));

const pageScan = {
  ...evaluatePageScan(domSample),
  modalsInDom: domSample.modalsInDom,
  webflowBadge: domSample.webflowBadge,
};

// Founder hero → startup modal (behavior attributes survive copy changes).
const startupClick = await clickFirst(page, '.hero-actions [data-demigod-modal="startup"],.hero-actions [data-dg-cta="hire"]');
await sleep(800);
screenshots.startupModal = await shot(page, '02-after-founder-cta');
const startup = await modalState(page, 'startup-modal');

await page.keyboard.press('Escape');
await page.evaluate(() => document.querySelector('.modal-close,[class*="close"]')?.click());
await sleep(400);

// Nav FIND TALENT (distinct from hero HIRE TALENT)
const navHireClick = await clickFirst(page, 'nav [data-demigod-modal="startup"],nav [data-dg-cta="hire"]');
await sleep(800);
const startupFromNav = await modalState(page, 'startup-modal');

await page.keyboard.press('Escape');
await page.evaluate(() => document.querySelector('.modal-close,[class*="close"]')?.click());
await sleep(400);

// Candidate hero → private candidate modal.
const jobClick = await clickFirst(page, '.hero-actions [data-demigod-modal="jobseeker"],.hero-actions [data-dg-cta="talent"]');
await sleep(800);
screenshots.jobseekerModal = await shot(page, '03-after-get-job');
const jobseeker = await modalState(page, 'jobseeker-modal');

await page.keyboard.press('Escape');
await sleep(400);

// Canonical pricing page → startup brief.
await page.goto(`${LIVE_ORIGIN}/pricing?v=playtest-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(1200);
screenshots.pricing = await shot(page, '04-pricing');

const pricingClick = await clickFirst(page, '#dg-page [data-demigod-modal="startup"],#dg-page [data-dg-cta="hire"]');
await sleep(700);
screenshots.pricingModal = await shot(page, '05-after-choose-commission');
const pricingModal = await modalState(page, 'startup-modal');

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await sleep(2000);
screenshots.footer = await shot(page, '06-footer');

// Re-scan footer after scroll (JS may patch footer text)
const footerRescan = await page.evaluate(() => {
  const dg = document.querySelector('#dg-copyright')?.textContent || '';
  if (dg) return dg;
  const body = document.body?.innerText || '';
  const line = body.match(/©[^\n]*2026[^\n]*Demigod[^\n]*/i)?.[0];
  if (line) return line;
  const el = document.querySelector('footer,.footer,[class*="footer_bottom"]');
  if (el?.innerText) return el.innerText;
  return [...document.querySelectorAll('footer *, [class*="footer_bottom"] *')].map((e) => e.textContent || '').join(' ');
});
pageScan.footer2026 = /2026/i.test(footerRescan) && /Demigod/i.test(footerRescan);

// Mobile
await page.setViewport({ width: 390, height: 844 });
await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await sleep(1500);
screenshots.mobileHero = await shot(page, '07-mobile-landing');

const mobileMenu = await page.evaluate(() => {
  const burger = document.querySelector('.w-nav-button,[class*="menu"],button[aria-label*="menu" i]');
  if (burger) { burger.click(); return { clicked: true }; }
  return { clicked: false };
});
await sleep(500);
screenshots.mobileNav = await shot(page, '08-mobile-nav-open');

// Designer audit (optional — only if tab open)
const designer = (await browser.pages()).find((p) => p.url().includes('talentlink-sf.design.webflow.com'));
let designerIssues = null;
if (designer) {
  await designer.bringToFront();
  await designer.setViewport({ width: 1600, height: 1000 });
  await sleep(800);
  screenshots.designer = path.join(ROOT, 'audit-shots', 'webflow', `playtest-designer-${stamp()}.png`);
  await designer.screenshot({ path: screenshots.designer, fullPage: false });
  const canvasText = await designer.evaluate(() => {
    const candidates = [...document.querySelectorAll('iframe')].filter((f) => {
      try {
        const t = f.contentDocument?.body?.innerText || '';
        return f.clientWidth >= 500 && /HIRE TALENT|FIND TALENT|DEMIGOD/i.test(t);
      } catch (_) { return false; }
    });
    const iframe = candidates.sort((a, b) => b.clientWidth - a.clientWidth)[0];
    return iframe?.contentDocument?.body?.innerText || '';
  });
  designerIssues = evaluateDesignerScan(canvasText);
}

const oopsVisible = await page.evaluate(() => {
  const vis = (el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') < 0.05) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    let p = el.parentElement;
    while (p) {
      const ps = getComputedStyle(p);
      if (ps.display === 'none' || ps.visibility === 'hidden') return false;
      p = p.parentElement;
    }
    return true;
  };
  const ghostText = (sel, re) => {
    const m = document.querySelector(sel);
    if (!m) return false;
    return [...m.querySelectorAll('*')].some((el) => {
      if (el.closest('iframe,[data-tally-embed],[data-tally-host]')) return false;
      if (!vis(el)) return false;
      const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      const t = direct || (el.children.length === 0 ? (el.textContent || '').trim() : '');
      return re.test(t) && t.length < 200;
    });
  };
  const check = (sel) => ghostText(sel, /^Oops!/i);
  const nativeBleed = (sel) => {
    const m = document.querySelector(sel);
    if (!m) return false;
    return [...m.querySelectorAll('input,select,textarea')].some((el) => {
      if (el.closest('iframe,[data-tally-embed]')) return false;
      return vis(el);
    });
  };
  return {
    startup: check('#startup-modal'),
    jobseeker: check('#jobseeker-modal'),
    successGhost: ghostText('#startup-modal', /CALL HAS BEEN HEARD/i),
    nativeFields: { startup: nativeBleed('#startup-modal'), jobseeker: nativeBleed('#jobseeker-modal') },
  };
});

const modals = { startup, jobseeker, pricingModal };
const findings = buildFindings({ pageScan, htmlScan, modals, designerIssues });
if (oopsVisible.startup) findings.push({ severity: 'high', issue: 'Startup modal shows ghost Oops error', detail: oopsVisible });
if (oopsVisible.jobseeker) findings.push({ severity: 'high', issue: 'Jobseeker modal shows ghost Oops error', detail: oopsVisible });
if (oopsVisible.successGhost) findings.push({ severity: 'high', issue: 'Startup modal shows ghost success block with form open', detail: oopsVisible });
if (oopsVisible.nativeFields?.startup) findings.push({ severity: 'high', issue: 'Startup modal shows native Webflow form fields', detail: oopsVisible });
if (oopsVisible.nativeFields?.jobseeker) findings.push({ severity: 'high', issue: 'Jobseeker modal shows native Webflow form fields', detail: oopsVisible });

// Extra nav hire check
if (navHireClick.ok && !modalVisible(startupFromNav)) {
  findings.push({ severity: 'medium', issue: 'FIND TALENT nav does not open startup modal', detail: startupFromNav });
}

await page.close();

const report = {
  at: new Date().toISOString(),
  url: LIVE,
  htmlScan,
  pageScan,
  findings,
  screenshots,
  modals,
  clicks: { startupClick, navHireClick, jobClick, pricingClick, mobileMenu },
  designerIssues,
  pass: reportPass(findings),
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  pass: report.pass,
  high: findings.filter((f) => f.severity === 'high').length,
  total: findings.length,
  mcpGone: htmlScan.mcpScriptsGone,
  out: OUT,
}));
await browser.disconnect();
process.exit(report.pass ? 0 : 1);
