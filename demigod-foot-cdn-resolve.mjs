#!/usr/bin/env node
/** Upload demigod-foot-core.js; resolve CDN URL via network + dashboard assets scrape. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sleep } from './collab-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const SRC = path.join(ROOT, 'demigod-foot-core.js');
const STAGED = path.join(ROOT, 'demigod-foot-v19.js');
const OUT = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const FOOT = path.join(ROOT, 'demigod-footer-lite.html');
const LOADER = path.join(ROOT, 'demigod-footer-loader.html');
const SITE = '6a34c484dcedc18a17408187';
const ASSET = 'demigod-foot-v19.js';

fs.copyFileSync(SRC, STAGED);

function extractJsUrls(text) {
  const re = new RegExp(`https://cdn\\.prod\\.website-files\\.com/${SITE}[^"'\\s<>]+\\.js`, 'gi');
  return [...new Set([...text.matchAll(re)].map((m) => m[0]))];
}

function pickFootUrl(urls) {
  return urls.find((u) => /demigod-foot/i.test(u))
    || urls.find((u) => /demigod-long-faq/i.test(u));
}

async function openDesigner(browser) {
  const pages = await browser.pages();
  let p = pages.find((x) => x.url().includes('design.webflow.com') && !x.url().includes('stripe'));
  if (p) return p;
  p = await browser.newPage();
  await p.goto('https://talentlink-sf.design.webflow.com', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(5000);
  return p;
}

async function scrapeDashboardAssets(browser) {
  const pages = await browser.pages();
  let p = pages.find((x) => /dashboard\/sites\/talentlink-sf\/assets/i.test(x.url()));
  if (!p) {
    p = await browser.newPage();
    await p.goto('https://webflow.com/dashboard/sites/talentlink-sf/assets', {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await sleep(5000);
  }
  await p.bringToFront();
  const html = await p.content();
  const urls = extractJsUrls(html);
  const names = await p.evaluate(() =>
    [...document.querySelectorAll('[class*="asset"],[data-automation-id],a,span,div')]
      .map((e) => (e.textContent || '').trim())
      .filter((t) => /demigod.*\.js/i.test(t))
      .slice(0, 20),
  );
  return { page: p, urls, names, htmlLen: html.length };
}

async function uploadInDesigner(page) {
  const apiHits = [];
  const cdnHits = [];

  const onResponse = async (res) => {
    const u = res.url();
    if (/website-files.*\.js/i.test(u) && /demigod/i.test(u)) cdnHits.push(u);
    if (!/webflow|amazonaws|asset|upload|s3/i.test(u)) return;
    try {
      const ct = res.headers()['content-type'] || '';
      if (!ct.includes('json') && !/upload|asset/i.test(u)) return;
      const body = (await res.text()).slice(0, 8000);
      if (/hostedUrl|cdnUrl|website-files|demigod|\.js/i.test(body)) {
        apiHits.push({ u, body });
        extractJsUrls(body).forEach((x) => cdnHits.push(x));
      }
    } catch (_) { /* ignore */ }
  };
  page.on('response', onResponse);

  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('j');
  await sleep(3000);

  const input = await page.waitForSelector('input.bem-FileInput_Input', { timeout: 25000 });
  await input.uploadFile(STAGED);
  await sleep(22000);

  let domUrls = extractJsUrls(await page.content()).filter((u) => /demigod-foot/i.test(u));

  if (!domUrls.length) {
    await page.evaluate((name) => {
      const el = [...document.querySelectorAll('*')].find((e) => {
        const t = (e.textContent || '').trim();
        return t === name || t.endsWith(name);
      });
      el?.click();
      el?.scrollIntoView?.({ block: 'center' });
    }, ASSET);
    await sleep(3000);
    domUrls = extractJsUrls(await page.content()).filter((u) => /demigod-foot/i.test(u));
  }

  // Asset detail panel: copy link button
  const detailUrl = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const m = html.match(/https:\/\/cdn\.prod\.website-files\.com\/6a34c484[^"'\\s<>]+demigod-foot[^"'\\s<>]*\.js/i);
    if (m) return m[0];
    const inp = [...document.querySelectorAll('input,textarea')].find((e) =>
      /cdn\.prod\.website-files/i.test(e.value || ''),
    );
    return inp?.value || null;
  });

  page.off('response', onResponse);

  return { apiHits, cdnHits, domUrls, detailUrl };
}

async function verifyUrl(cdnUrl) {
  const liveJs = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).text();
  return {
    ok: liveJs.includes('dg-foot-v19-core') && liveJs.includes('function hero'),
    liveLen: liveJs.length,
  };
}

async function main() {
  const browser = await connectBrowser();
  const page = await openDesigner(browser);
  await page.bringToFront();
  await page.setViewport({ width: 1600, height: 1200 });

  const dashBefore = await scrapeDashboardAssets(browser);
  const upload = await uploadInDesigner(page);
  const dashAfter = await scrapeDashboardAssets(browser);

  const allUrls = [
    ...upload.cdnHits,
    ...upload.domUrls,
    upload.detailUrl,
    ...dashAfter.urls,
  ].filter(Boolean);

  const cdnUrl = pickFootUrl([...new Set(allUrls)]) || null;
  let verify = { ok: false, liveLen: 0 };
  if (cdnUrl) verify = await verifyUrl(cdnUrl);

  const loader = `<!-- demigod-foot-cdn-loader v19 -->\n<script defer src="${cdnUrl || 'PENDING'}"></script>\n`;
  if (verify.ok && cdnUrl) {
    // temp+rename so concurrent verify:source never reads torn footer mid-write
    atomicWrite(LOADER, loader);
    atomicWrite(FOOT, loader);
  }

  const result = {
    at: new Date().toISOString(),
    cdnUrl,
    ok: verify.ok,
    liveLen: verify.liveLen,
    loaderLen: loader.length,
    dashBefore: { urls: dashBefore.urls, names: dashBefore.names },
    dashAfter: { urls: dashAfter.urls, names: dashAfter.names },
    upload: {
      domUrls: upload.domUrls,
      detailUrl: upload.detailUrl,
      cdnHits: [...new Set(upload.cdnHits)].slice(0, 10),
      apiHits: upload.apiHits.slice(0, 8),
    },
  };
  atomicWrite(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  await browser.disconnect();
  process.exit(verify.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });