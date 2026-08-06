#!/usr/bin/env node
/** Rendered sitemap/navigation audit. Read-only: no submissions or outbound navigation. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';

const OUT = '/tmp/dg-busy/navigation-audit.json';
const USE_LOCAL = process.argv.includes('--local');
const CLICK_CONTROLS = process.argv.includes('--clicks');
const CORE = USE_LOCAL ? fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8') : '';
const HEAD_CSS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-head-styles.css', import.meta.url), 'utf8') : '';
const ATLAS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8') : '';
const MAP_DATA = USE_LOCAL ? fs.readFileSync(new URL('./DEMIGOD-SF-STARTUP-MAP.json', import.meta.url), 'utf8') : '';
const MANIFEST = USE_LOCAL ? JSON.parse(fs.readFileSync(new URL('./DEMIGOD-FOOT-CDN.json', import.meta.url), 'utf8')) : {};
const EXPECTED_FOOT_VER = USE_LOCAL ? (CORE.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] : '';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const origin = new URL(LIVE_ORIGIN).origin;
const cleanUrl = (value) => String(value || '').replace(/[?#].*$/, '');
const localAsset = (value) => {
  const clean = cleanUrl(value);
  if (clean === cleanUrl(MANIFEST.cdnUrl) || /foot-latest\.js$|demigod-foot/i.test(clean)) return 'foot';
  if (clean === cleanUrl(MANIFEST.assets?.headCss?.url) || /head-latest\.css$|demigod-head/i.test(clean)) return 'head';
  if (clean === cleanUrl(MANIFEST.assets?.startupMap?.url) || /startup-map-latest\.js$|startup-atlas-web/i.test(clean)) return 'atlas';
  if (clean === cleanUrl(MANIFEST.assets?.mapData?.url) || /sf-startup-map\.json$/i.test(clean)) return 'map';
  return '';
};
const routeOf = (value) => {
  const u = new URL(value, origin);
  return u.origin === origin ? `${u.pathname}${u.search}${u.hash}` : null;
};

/* import.meta.main, not a bare argv check: an ungated --selftest block ends in exit(0), so any
   module that imports this one and is itself run with --selftest inherits a silent success
   having asserted nothing. demigod-seo-audit shipped that way and hijacked site-health. */
if (import.meta.main && process.argv.includes('--selftest')) {
  if (!USE_LOCAL) throw new Error('--selftest requires --local');
  if (localAsset(MANIFEST.cdnUrl) !== 'foot' || localAsset(MANIFEST.assets?.headCss?.url) !== 'head' ||
      localAsset(MANIFEST.assets?.startupMap?.url) !== 'atlas' || localAsset(MANIFEST.assets?.mapData?.url) !== 'map' ||
      localAsset('https://example.com/app.js')) {
    throw new Error('local asset matcher does not bind the exact release manifest');
  }
  console.log(JSON.stringify({ ok: true, selftest: 'navigation-local-assets' }));
  process.exit(0);
}

async function fetchWithRetry(url) {
  try {
    return await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
  } catch {
    await sleep(800);
    try {
      return await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    } catch {
      const body = execFileSync('curl', ['-fsSL', '--max-time', '20', url], { encoding: 'utf8' });
      const meta = execFileSync('curl', ['-sSL', '--max-time', '20', '-o', '/dev/null', '-w', '%{http_code}\n%{url_effective}', url], { encoding: 'utf8' }).trim().split('\n');
      return { status: Number(meta[0]), url: meta[1] || url, text: async () => body };
    }
  }
}

const sitemapXml = await (await fetchWithRetry(`${origin}/sitemap.xml`)).text();
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapRoutes = new Set(urls.map(routeOf));

async function gotoWithRetry(page, url) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (new URL(page.url()).origin === origin && response?.status() < 400) return response;
      error = new Error(`navigation escaped or failed: ${response?.status() || 0} ${page.url()}`);
    } catch (caught) { error = caught; }
    await sleep(800);
  }
  throw error;
}

const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 180000 });
async function configureLocal(page) {
  if (!USE_LOCAL) return;
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const asset = localAsset(request.url());
    if (asset === 'foot') request.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
    else if (asset === 'head') request.respond({ status: 200, contentType: 'text/css', body: HEAD_CSS }).catch(() => {});
    else if (asset === 'atlas') request.respond({ status: 200, contentType: 'application/javascript', body: ATLAS }).catch(() => {});
    else if (asset === 'map') request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: MAP_DATA }).catch(() => {});
    else request.continue().catch(() => {});
  });
}
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await configureLocal(page);
const pages = [];

for (const url of urls) {
  const response = await gotoWithRetry(page, `${url}${url.includes('?') ? '&' : '?'}nav-audit=${Date.now()}`);
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 15000 }).catch(() => {});
  if (new URL(url).pathname === '/startups') {
    await page.waitForFunction(() => document.querySelectorAll('#dg-startup-map button,[data-dg-page="map"] button').length > 20, { timeout: 20000 }).catch(() => {});
  }
  await sleep(900);
  if (['/partnerships', '/partnership', '/refer'].includes(new URL(url).pathname)) await sleep(400);
  if (new URL(page.url()).origin !== origin) await gotoWithRetry(page, url);
  const rendered = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };
    const text = (el) => (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 100);
    const controls = [...document.querySelectorAll('a[href],button,summary,[role="button"],[onclick],[tabindex="0"],input[type="submit"]')]
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: text(el),
        href: el.getAttribute('href') || '',
        id: el.id || '',
        cls: (el.getAttribute('class') || '').slice(0, 120),
        type: el.getAttribute('type') || '',
        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
        modal: el.getAttribute('data-demigod-modal') || '',
        expanded: el.getAttribute('aria-expanded'),
      }));
    return {
      title: document.title,
      finalUrl: location.href,
      footVer: window.__dgFootVer || null,
      controls,
      links: controls.filter((item) => item.tag === 'a' && item.href).map((item) => item.href),
    };
  });
  const formChecks = CLICK_CONTROLS ? await page.evaluate(async () => {
    const results = [];
    const forms = [...document.querySelectorAll('form')].filter((form) => !form.closest('#startup-modal,#jobseeker-modal'));
    for (const form of forms) {
      const details = form.closest('details');
      if (details) details.open = true;
      const submit = form.querySelector('button[type="submit"],input[type="submit"]');
      if (!submit || submit.getBoundingClientRect().width < 2) continue;
      let submits = 0;
      const prevent = (event) => { event.preventDefault(); submits++; };
      form.addEventListener('submit', prevent, true);
      const validBefore = form.checkValidity();
      submit.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      form.removeEventListener('submit', prevent, true);
      results.push({
        id: form.id || form.getAttribute('data-name') || form.getAttribute('aria-label') || '',
        submit: (submit.textContent || submit.value || '').trim(),
        disabled: submit.disabled,
        validBefore,
        submits,
        active: document.activeElement?.getAttribute?.('name') || document.activeElement?.id || '',
        worked: !submit.disabled && (validBefore ? submits === 1 : submits === 0 && !form.checkValidity()),
      });
    }
    return results;
  }).catch((error) => [{
    tag: '', text: 'form audit', href: '', disabled: false, worked: false,
    error: String(error?.message || error),
  }]) : [];
  const clickChecks = CLICK_CONTROLS ? await page.evaluate(async () => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };
    const text = (el) => (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 100);
    const snapshot = (el) => {
      const context = el?.closest?.('.dg-atlas-card,.dg-company-card,details,form');
      return {
        url: location.href,
        bodyClass: document.body.className,
        openDetails: document.querySelectorAll('details[open]').length,
        visibleModals: [...document.querySelectorAll('#startup-modal,#jobseeker-modal,#partner-modal')]
          .filter(visible).map((modal) => modal.id),
        wizardKeys: [...document.querySelectorAll('#startup-modal form,#jobseeker-modal form')].map((form) => form.dataset.dgWizKey || ''),
        pressed: el?.getAttribute?.('aria-pressed'),
        expanded: el?.getAttribute?.('aria-expanded'),
        cls: el?.getAttribute?.('class') || '',
        context: (context?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 500),
        controls: [...document.querySelectorAll('a[href],button,summary,[role="button"]')].filter(visible).length,
        active: document.activeElement?.getAttribute?.('name') || document.activeElement?.id || document.activeElement?.tagName || '',
        invalid: document.querySelectorAll(':invalid').length,
      };
    };
    const results = [];
    const safeControls = () => [...document.querySelectorAll('button,summary,a[href="#"],[role="button"]')]
      .filter((el) => {
        if (!visible(el) || (el instanceof HTMLButtonElement && el.type === 'submit') || (el instanceof HTMLInputElement && el.type === 'submit')) return false;
        if (el instanceof HTMLAnchorElement && el.getAttribute('href') !== '#') return false;
        if (el.classList.contains('dg-page-x') || el.classList.contains('dg-dir-brief')) return false;
        return !el.closest('#startup-modal,#jobseeker-modal') || /^(?:close|✕)$/i.test(text(el));
      });
    for (let i = 0; i < 12; i++) {
      const more = safeControls().find((el) => /^load more companies$/i.test(text(el)));
      if (!more) break;
      const before = snapshot(more);
      more.click();
      await new Promise((resolve) => setTimeout(resolve, 180));
      const after = snapshot(more);
      results.push({ tag: 'button', text: `Load more companies (${i + 1})`, href: '', disabled: false, worked: JSON.stringify(before) !== JSON.stringify(after), before, after });
    }
    const seen = new Map();
    const identity = (el) => [
      el.tagName.toLowerCase(), text(el), el.getAttribute('href') || '', el.id || '',
      el.closest('[data-i]')?.getAttribute('data-i') || '', el.getAttribute('data-fn') || '',
    ].join('|');
    const descriptors = safeControls()
      .filter((el) => !/^load more companies$/i.test(text(el)))
      .map((el) => {
        const atlasFamily = ['dg-atlas-neighborhood', 'dg-atlas-result'].find((cls) => el.classList.contains(cls)) || '';
        const atlasLayer = el.classList.contains('dg-atlas-marker') || el.classList.contains('dg-atlas-venue')
          ? (el.getAttribute('data-atlas-layer') || (el.classList.contains('dg-atlas-venue') ? 'venues' : '')) : '';
        const key = el.classList.contains('dg-dir-rolechip') ? `rolechip|${el.getAttribute('data-fn') || ''}`
          : atlasLayer ? `atlas-marker|${atlasLayer}`
          : atlasFamily || identity(el);
        const ordinal = seen.get(key) || 0;
        seen.set(key, ordinal + 1);
        const priority = atlasFamily === 'dg-atlas-neighborhood' ? 0 : atlasFamily === 'dg-atlas-result' ? 1 : atlasLayer ? 2 : 3;
        return { key, ordinal, rolechip: el.classList.contains('dg-dir-rolechip'), atlasFamily, atlasLayer, priority, disruptive: /^(?:close|✕)$/i.test(text(el)) };
      })
      .filter((descriptor) => !(descriptor.rolechip || descriptor.atlasFamily || descriptor.atlasLayer) || descriptor.ordinal === 0)
      .sort((a, b) => a.priority - b.priority || Number(a.disruptive) - Number(b.disruptive));
    for (const descriptor of descriptors) {
      const el = descriptor.rolechip
        ? safeControls().find((candidate) => candidate.classList.contains('dg-dir-rolechip') && `rolechip|${candidate.getAttribute('data-fn') || ''}` === descriptor.key)
        : descriptor.atlasLayer
          ? safeControls().find((candidate) => (candidate.classList.contains('dg-atlas-marker') || candidate.classList.contains('dg-atlas-venue')) &&
              (candidate.getAttribute('data-atlas-layer') || (candidate.classList.contains('dg-atlas-venue') ? 'venues' : '')) === descriptor.atlasLayer)
          : descriptor.atlasFamily
            ? safeControls().find((candidate) => candidate.classList.contains(descriptor.atlasFamily))
        : safeControls().filter((candidate) => identity(candidate) === descriptor.key)[descriptor.ordinal];
      if (!el) {
        results.push({ tag: '', text: descriptor.key, href: '', disabled: false, worked: false, error: 'missing_after_rerender' });
        continue;
      }
      const before = snapshot(el);
      const alreadyActive = el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' ||
        (el.classList.contains('dg-atlas-reset') && !location.hash);
      if (typeof el.click === 'function') el.click();
      else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      await new Promise((resolve) => setTimeout(resolve, el.classList.contains('dg-dir-rolechip') ? 20 : 120));
      const after = snapshot(el);
      results.push({
        tag: el.tagName.toLowerCase(),
        text: text(el),
        href: el.getAttribute('href') || '',
        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
        worked: alreadyActive || JSON.stringify(before) !== JSON.stringify(after),
        before,
        after,
      });
      if (el.classList.contains('dg-dir-rolechip')) {
        const filter = document.querySelector('.dg-dir-func');
        if (filter) {
          filter.value = '';
          filter.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
    }
    return results;
  }).catch((error) => {
    const final = page.url();
    const navigated = new URL(final).origin === origin && new URL(final).pathname !== new URL(url).pathname;
    return [{
      tag: '', text: 'same-origin navigation control', href: final, disabled: false, worked: navigated,
      ...(navigated ? {} : { error: String(error?.message || error) }),
    }];
  }) : [];
  pages.push({ requestedUrl: url, status: response?.status() || 0, ...rendered, formChecks, clickChecks });
}

const intentChecks = [];
if (CLICK_CONTROLS) {
  const referral = `rf_${'A'.repeat(24)}`;
  for (const { route, kind, modal } of [
    { route: '/hire', kind: 'startup', modal: '#startup-modal' },
    { route: '/talent', kind: 'jobseeker', modal: '#jobseeker-modal' },
  ]) {
    const probe = await browser.newPage();
    await configureLocal(probe);
    await gotoWithRetry(probe, `${origin}${route}?referral=${referral}&utm_campaign=navigation-audit`);
    await probe.waitForFunction(() => window.__dgFootVer, { timeout: 15000 }).catch(() => {});
    const selector = `#dg-page a[data-demigod-modal="${kind}"]`;
    const found = await probe.$(selector);
    if (found) {
      await Promise.all([
        probe.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
        found.click(),
      ]);
      await probe.waitForFunction((sel) => document.querySelector(sel)?.getAttribute('aria-hidden') === 'false', { timeout: 15000 }, modal).catch(() => {});
    }
    const result = await probe.evaluate((sel, token) => {
      const form = document.querySelector(`${sel} form`);
      const params = new URLSearchParams(location.search);
      const visibleNotice = [...document.querySelectorAll('.dg-referral-notice')].some((el) => !el.hidden && el.getClientRects().length);
      return {
        url: location.href,
        modalOpen: document.querySelector(sel)?.getAttribute('aria-hidden') === 'false',
        wizardKey: form?.dataset.dgWizKey || '',
        referral: params.get('referral') || '',
        hiddenReferral: form?.querySelector('input[name=referral]')?.value || '',
        campaign: form?.querySelector('input[name=utm_campaign]')?.value || '',
        visibleNotice,
        worked: document.querySelector(sel)?.getAttribute('aria-hidden') === 'false' &&
          params.get('referral') === token && form?.querySelector('input[name=referral]')?.value === token && visibleNotice,
      };
    }, modal, referral);
    intentChecks.push({ route, kind, found: Boolean(found), ...result });
    await probe.close();
  }
  const probe = await browser.newPage();
  await configureLocal(probe);
  await gotoWithRetry(probe, `${origin}/startups?navigation-audit=${Date.now()}`);
  await probe.waitForSelector('button.dg-dir-brief', { timeout: 30000 });
  const company = await probe.evaluate(() => {
    sessionStorage.removeItem('dgWizSave_startup');
    return document.querySelector('button.dg-dir-brief')?.dataset.company || '';
  });
  await Promise.all([
    probe.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
    probe.click('button.dg-dir-brief'),
  ]);
  await probe.waitForSelector('#startup-modal[aria-hidden=false]', { timeout: 20000 });
  const directoryBrief = await probe.evaluate(() => ({
    prefilled: document.querySelector('#startup-hire [name="company-name"]')?.value || '',
    source: document.querySelector('#startup-hire [name="utm_source"]')?.value || '',
    campaign: document.querySelector('#startup-hire [name="utm_campaign"]')?.value || '',
  }));
  intentChecks.push({
    route: '/startups', kind: 'directory-brief', found: Boolean(company), company, ...directoryBrief,
    worked: Boolean(company) && directoryBrief.prefilled === company &&
      directoryBrief.source === 'directory' && directoryBrief.campaign === 'company-brief',
  });
  await probe.close();
}

await page.close();
await browser.disconnect();

const edges = new Map();
const targetUrls = new Set();
for (const item of pages) {
  const source = new URL(item.finalUrl).pathname;
  const targets = edges.get(source) || new Set();
  for (const href of item.links) {
    if (/^(?:mailto|tel):/i.test(href)) continue;
    const target = routeOf(href);
    if (!target) continue;
    targets.add(new URL(target, origin).pathname);
    targetUrls.add(new URL(href, origin).href);
  }
  edges.set(source, targets);
}

const linkHealth = await Promise.all([...targetUrls].map(async (url) => {
  try {
    const response = await fetchWithRetry(url);
    return { url, status: response.status, ok: response.status < 400, finalUrl: response.url };
  } catch (error) {
    return { url, status: 0, ok: false, error: String(error.message || error) };
  }
}));

const reachable = new Set(['/']);
const queue = ['/'];
while (queue.length) {
  const source = queue.shift();
  for (const target of edges.get(source) || []) {
    if (reachable.has(target)) continue;
    reachable.add(target);
    queue.push(target);
  }
}

const unnamed = pages.flatMap((item) => item.controls
  .filter((control) => !control.text && !control.href)
  .map((control) => ({ page: routeOf(item.requestedUrl), ...control })));
const deadHash = pages.flatMap((item) => item.controls
  .filter((control) => control.href === '#' && !control.modal && !(item.clickChecks || []).some((check) =>
    check.worked && check.tag === control.tag && check.text === control.text && check.href === control.href))
  .map((control) => ({ page: routeOf(item.requestedUrl), ...control })));
const canonicalRoutes = [...new Set(pages.map((item) => new URL(item.finalUrl).pathname))];
const unreachable = canonicalRoutes.filter((route) => !reachable.has(route));
const failedClicks = pages.flatMap((item) => item.clickChecks
  .filter((check) => !check.disabled && !check.worked)
  .map((check) => ({ page: new URL(item.requestedUrl).pathname, ...check })));
const disabledSubmits = pages.flatMap((item) => item.controls
  .filter((control) => control.type === 'submit' && control.disabled)
  .map((control) => ({ page: new URL(item.requestedUrl).pathname, ...control })));
const failedForms = pages.flatMap((item) => item.formChecks
  .filter((check) => !check.worked)
  .map((check) => ({ page: new URL(item.requestedUrl).pathname, ...check })));
const failedIntents = intentChecks.filter((check) => !check.found || !check.worked);
const report = {
  at: new Date().toISOString(),
  sitemapCount: urls.length,
  pageCount: pages.length,
  uniqueControls: new Set(pages.flatMap((item) => item.controls.map((control) => `${control.tag}|${control.text}|${control.href}|${control.id}`))).size,
  pages,
  local: USE_LOCAL,
  clickControls: CLICK_CONTROLS,
  canonicalRoutes,
  aliases: pages.filter((item) => new URL(item.requestedUrl).pathname !== new URL(item.finalUrl).pathname)
    .map((item) => ({ from: new URL(item.requestedUrl).pathname, to: new URL(item.finalUrl).pathname })),
  homepageLinks: [...(edges.get('/') || [])],
  reachable: [...reachable],
  unreachable,
  unnamed,
  deadHash,
  brokenLinks: linkHealth.filter((item) => !item.ok),
  failedClicks,
  disabledSubmits,
  failedForms,
  intentChecks,
  failedIntents,
};
report.ok = pages.every((item) => item.status < 400 && (!USE_LOCAL || item.footVer === EXPECTED_FOOT_VER)) && !unreachable.length && !unnamed.length && !disabledSubmits.length && !report.brokenLinks.length && (!CLICK_CONTROLS || (!failedClicks.length && !failedForms.length && !failedIntents.length));
fs.mkdirSync('/tmp/dg-busy', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: report.ok, sitemapCount: report.sitemapCount, uniqueControls: report.uniqueControls, unreachable: report.unreachable, unnamed: report.unnamed.length, deadHash: report.deadHash.length, disabledSubmits: report.disabledSubmits.length, brokenLinks: report.brokenLinks.length, failedClicks: report.failedClicks.length, failedForms: report.failedForms.length, failedIntents: report.failedIntents.length, out: OUT }, null, 2));
process.exit(report.ok ? 0 : 1);
