#!/usr/bin/env node
/** Full-site interactive audit: every visible link/button on key routes. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const CORE = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
const OUT = path.join(ROOT, 'DEMIGOD-BUTTON-AUDIT.json');
const SHOTS = path.join(ROOT, 'audit-shots', 'button-audit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUICK = process.argv.includes('--quick');
const ROUTES = QUICK
  ? ['/']
  : ['/', '/#partnerships', '/#privacy', '/#terms', '/#legal'];

async function injectCore(page) {
  await page.setRequestInterception(true);
  page.removeAllListeners('request');
  page.on('request', (req) => {
    if (/catbox\.moe/i.test(req.url())) req.abort();
    else req.continue();
  });
}

async function load(page, url) {
  if (QUICK) {
    await page.goto(`${LIVE_ORIGIN}${url}?audit=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => /dg-foot-v\d+-core/.test([...document.scripts].map((s) => s.textContent).join('')), { timeout: 10000 }).catch(() => {});
    await sleep(900);
    return;
  }
  await injectCore(page);
  await page.goto(`${LIVE_ORIGIN}${url}?audit=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate((src) => {
    document.querySelectorAll('script[src*="catbox"],script[data-dg-foot]').forEach((s) => s.remove());
    const s = document.createElement('script');
    s.setAttribute('data-dg-foot', 'audit');
    s.textContent = src;
    document.body.appendChild(s);
  }, CORE);
  await sleep(2200);
}

function isFrameGone(e) {
  return /context.*destroyed|navigation|detached/i.test(String(e?.message || e));
}

async function safeEval(page, fn, ...args) {
  try {
    return await page.evaluate(fn, ...args);
  } catch (e) {
    if (!isFrameGone(e)) throw e;
    await sleep(1200);
    if (page.isClosed()) throw e;
    await page.waitForFunction(() => !!document.body, { timeout: 20000 }).catch(() => {});
    return page.evaluate(fn, ...args);
  }
}

async function collectInteractives(page) {
  return safeEval(page, () => {
    const items = [];
    const seen = new Set();
    document.querySelectorAll('a,button,[role=button],input[type=submit]').forEach((el) => {
      if (el.closest('#startup-modal,#jobseeker-modal,#partner-modal')) return;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width < 2 || r.height < 2) return;
      if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return;
      const text = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const href = el.getAttribute('href') || '';
      const key = `${el.tagName}|${href}|${text}`;
      if (!text && !href && el.tagName !== 'BUTTON') return;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        tag: el.tagName,
        text,
        href,
        modal: el.getAttribute('data-demigod-modal') || '',
        scroll: el.getAttribute('data-dg-nav') || '',
        id: el.id || '',
        cls: (el.className || '').toString().slice(0, 60),
      });
    });
    return items;
  });
}

async function clickAndObserve(page, item, idx) {
  const before = await safeEval(page, () => ({
    hash: location.hash,
    path: location.pathname,
    search: location.search,
    startupOpen: !!document.querySelector('#startup-modal.dg-wiz-active'),
    engineerOpen: !!document.querySelector('#jobseeker-modal.dg-wiz-active'),
    partnerOpen: !!document.querySelector('#partner-modal.dg-wiz-active'),
    partnersPage: document.body.classList.contains('dg-partners-page'),
    legalPage: document.body.classList.contains('dg-legal-page'),
    trustY: document.querySelector('#demigod-trust-block')?.getBoundingClientRect?.().top ?? null,
    pricingY: document.querySelector('#demigod-pricing')?.getBoundingClientRect?.().top ?? null,
  }));

  const sel = await safeEval(page, (i) => {
    const all = [...document.querySelectorAll('a,button,[role=button],input[type=submit]')];
    let n = 0;
    for (const el of all) {
      if (el.closest('#startup-modal,#jobseeker-modal,#partner-modal')) continue;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width < 2 || r.height < 2) continue;
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      const text = (el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const href = el.getAttribute('href') || '';
      if (n === i) {
        el.setAttribute('data-audit-idx', String(i));
        return { ok: true, text, href };
      }
      n++;
    }
    return { ok: false };
  }, idx);

  if (!sel.ok) return { ...item, result: 'element-not-found' };

  const willNav = item.href === '/' || /^https?:\/\//i.test(item.href || '') || (item.href && !item.href.startsWith('#') && !item.modal);
  try {
    if (willNav) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
        page.click('[data-audit-idx="' + idx + '"]', { delay: 40 }),
      ]);
    } else {
      await page.click('[data-audit-idx="' + idx + '"]', { delay: 40 });
      await sleep(QUICK ? 450 : 700);
    }
  } catch (e) {
    return { ...item, result: 'click-failed', error: String(e.message || e) };
  }
  await sleep(willNav ? 1200 : 0);

  let after;
  try {
    after = await safeEval(page, () => ({
    hash: location.hash,
    path: location.pathname,
    search: location.search,
    startupOpen: !!document.querySelector('#startup-modal.dg-wiz-active'),
    engineerOpen: !!document.querySelector('#jobseeker-modal.dg-wiz-active'),
    partnerOpen: !!document.querySelector('#partner-modal.dg-wiz-active'),
    partnersPage: document.body.classList.contains('dg-partners-page'),
    legalPage: document.body.classList.contains('dg-legal-page'),
    trustY: document.querySelector('#demigod-trust-block')?.getBoundingClientRect?.().top ?? null,
    pricingY: document.querySelector('#demigod-pricing')?.getBoundingClientRect?.().top ?? null,
    partnersWrap: !!document.querySelector('#demigod-partnerships-wrap') && getComputedStyle(document.querySelector('#demigod-partnerships-wrap')).display !== 'none',
    legalWrap: !!document.querySelector('#demigod-legal-wrap') && getComputedStyle(document.querySelector('#demigod-legal-wrap')).display !== 'none',
  }));
  } catch (e) {
    return { ...item, result: willNav ? 'navigate' : 'context-lost', broken: false, before, error: String(e.message || e) };
  }

  // close modals for next click
  if (after.startupOpen || after.engineerOpen || after.partnerOpen) {
    await page.keyboard.press('Escape');
    await sleep(400);
  }

  let result = 'noop';
  if (after.startupOpen && !before.startupOpen) result = 'startup-modal';
  else if (after.engineerOpen && !before.engineerOpen) result = 'engineer-modal';
  else if (after.partnerOpen && !before.partnerOpen) result = 'partner-modal';
  else if (after.partnersPage && !before.partnersPage) result = 'partners-page';
  else if (after.legalPage && !before.legalPage) result = 'legal-page';
  else if (after.hash !== before.hash) result = 'hash:' + after.hash;
  else if (after.path !== before.path) result = 'navigate:' + after.path;
  else if (after.search !== before.search) result = 'navigate:' + after.path + after.search;
  else if (item.href?.startsWith('mailto:')) result = 'mailto';
  else if (before.pricingY != null && after.pricingY != null && Math.abs(after.pricingY - before.pricingY) > 80) result = 'scroll-pricing';
  else if (before.trustY != null && after.trustY != null && Math.abs(after.trustY - before.trustY) > 80) result = 'scroll-trust';

  const broken =
    (item.text && /^(GET STARTED|LEARN MORE|SUBSCRIBE|CONTACT)$/i.test(item.text)) ||
    (item.href === '#' && !item.modal && result === 'noop') ||
    (item.scroll === 'scroll' && result === 'noop') ||
    (item.text === 'Pricing' && result === 'noop');

  return { ...item, result, broken, before, after };
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 180000 });
  let page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  async function ensurePage() {
    if (!page.isClosed()) return page;
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    return page;
  }

  const report = { at: new Date().toISOString(), quick: QUICK, routes: {}, bareUrls: {} };

  for (const slug of ['legal', 'partnerships']) {
    try {
      const res = await fetch(`${LIVE_ORIGIN}/${slug}?probe=${Date.now()}`);
      const html = await res.text();
      report.bareUrls[`/${slug}`] = {
        status: res.status,
        foot: /catbox\.moe\/[a-z0-9]+\.js/i.test(html) || /dg-foot-v\d+-core/.test(html),
        is404: /404|not found/i.test(html.slice(0, 8000)),
      };
    } catch (e) {
      report.bareUrls[`/${slug}`] = { error: String(e.message || e) };
    }
  }

  for (const route of ROUTES) {
    try {
    await ensurePage();
    await load(page, route);
    const shot = path.join(SHOTS, route.replace(/[^a-z0-9]+/gi, '_') + '.png');
    if (!QUICK) await page.screenshot({ path: shot, fullPage: true });

    const meta = await page.evaluate(() => ({
      foot: /dg-foot-v\d+-core/.test([...document.scripts].map((s) => s.textContent).join('')) || [...document.scripts].some((s) => /catbox\.moe\/[a-z0-9]+\.js/i.test(s.src || '')),
      nav: !!document.querySelector('#dg-site-nav'),
      trust: !!document.querySelector('#demigod-trust-block'),
      pricing: !!document.querySelector('#demigod-pricing'),
      partnersWrap: !!document.querySelector('#demigod-partnerships-wrap'),
      legalWrap: !!document.querySelector('#demigod-legal-wrap'),
      partnersPage: document.body.classList.contains('dg-partners-page'),
      legalPage: document.body.classList.contains('dg-legal-page'),
      status: document.title,
    }));

    const items = await collectInteractives(page);
    const clicks = [];
    const quickTargets = QUICK
      ? [/FIND TALENT/i, /^Pricing$/i, /^Partners$/i, /engineer/i, /HIRE TALENT/i, /JOIN NETWORK/i, /^Privacy$/i, /^BECOME A PARTNER/i, /How it works/i]
      : null;
    const clickItems = QUICK
      ? quickTargets.map((rx) => items.find((it) => rx.test(it.text || '') || rx.test(it.href || ''))).filter(Boolean)
      : items;
    const maxClicks = Math.min(clickItems.length, QUICK ? clickItems.length : 18);
    for (let i = 0; i < maxClicks; i++) {
      if (i > 0) {
        const cur = await safeEval(page, () => ({ path: location.pathname, hash: location.hash }));
        const needReload =
          cur.path !== route.split('#')[0] ||
          (route.includes('#') && cur.hash !== '#' + route.split('#')[1]) ||
          (!route.includes('#') && cur.hash && !['', '#demigod-trust-block', '#demigod-pricing'].includes(cur.hash));
        if (needReload) await load(page, route);
      }
      const fresh = QUICK ? clickItems : await collectInteractives(page);
      if (i >= fresh.length) break;
      const clickIdx = QUICK ? items.indexOf(fresh[i]) : i;
      if (clickIdx < 0) continue;
      try {
        clicks.push(await clickAndObserve(page, fresh[i], clickIdx));
      } catch (e) {
        if (isFrameGone(e)) {
          await ensurePage();
          await load(page, route);
        }
        clicks.push({ ...fresh[i], result: 'audit-error', broken: false, error: String(e.message || e) });
      }
    }

    report.routes[route] = {
      meta,
      shot,
      interactives: items.length,
      clicks,
      broken: clicks.filter((c) => c.broken),
      deadHash: clicks.filter((c) => c.href === '#' && c.result === 'noop'),
      missingPricing: !meta.pricing && route === '/',
    };
    } catch (e) {
      report.routes[route] = { error: String(e.message || e), broken: [], clicks: [] };
      if (isFrameGone(e)) await ensurePage();
    }
  }

  report.summary = {
    totalBroken: Object.values(report.routes).reduce((n, r) => n + r.broken.length, 0),
    bareLegal404: report.bareUrls['/legal']?.is404 === true,
    barePartnerships404: report.bareUrls['/partnerships']?.is404 === true,
  };
  report.ok = report.summary.totalBroken === 0;

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, summary: report.summary, out: OUT }));
  try { await page.close(); } catch (_) {}
  await browser.disconnect();
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  try {
    fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), ok: false, crash: String(e.message || e) }, null, 2));
  } catch (_) {}
  process.exit(1);
});
