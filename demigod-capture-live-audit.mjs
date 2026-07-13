#!/usr/bin/env node
/** Extended live + blocker screenshots for Heavy / planning. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN, fetchLiveHtml, scanLiveHtml, evaluatePageScan } from './demigod-live-lib.mjs';

const ROOT = '/home/potter';
const SHOTS = path.join(ROOT, 'audit-shots', 'audit');
const OUT = path.join(ROOT, 'DEMIGOD-SCREENSHOT-MANIFEST.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function shot(page, name, opts = {}) {
  const p = path.join(SHOTS, `${name}-${stamp()}.png`);
  if (opts.clip) await page.screenshot({ path: p, clip: opts.clip });
  else await page.screenshot({ path: p, fullPage: !!opts.fullPage });
  return p;
}

async function clickText(page, texts) {
  const list = Array.isArray(texts) ? texts : [texts];
  return page.evaluate((candidates) => {
    for (const t of candidates) {
      const el = [...document.querySelectorAll('a,button')].find((e) => (e.textContent || '').trim() === t);
      if (el) { el.click(); return t; }
    }
    return null;
  }, list);
}

const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
const shots = {};
const meta = { at: new Date().toISOString(), live: {}, blockers: {} };

/* --- Live site audit --- */
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const url = `${LIVE_ORIGIN}/?v=audit-${Date.now()}`;
await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(2000);

const { html, footerCoreJs } = await fetchLiveHtml();
const htmlScan = scanLiveHtml(html, { footerCoreJs });
const pageScan = await page.evaluate(() => {
  const body = document.body?.innerText || '';
  return {
    postJob: /POST A JOB/i.test(body),
    hireTalent: (body.match(/HIRE TALENT/gi) || []).length,
    findTalent: (body.match(/FIND TALENT/gi) || []).length,
    talentLink: /TalentLink/i.test(body),
    footer2026: /©\s*2026\s*Demigod/i.test(body),
    fixFormIdentity: typeof fixFormIdentity === 'function' || /fixFormIdentity/.test(document.documentElement.innerHTML),
    emailFormCount: (document.documentElement.innerHTML.match(/data-name="email-form"/g) || []).length,
    turnstile: !!document.querySelector('[name="cf-turnstile-response"], [data-turnstile-sitekey]'),
  };
});

fs.mkdirSync(SHOTS, { recursive: true });
shots.landing = await shot(page, '01-landing');
shots.hero = await shot(page, '02-hero', {
  clip: { x: 0, y: 0, width: 1440, height: 520 },
});
shots.nav = await shot(page, '03-nav', {
  clip: { x: 0, y: 0, width: 1440, height: 80 },
});

await clickText(page, 'FIND TALENT');
await sleep(1200);
shots.startupModal = await shot(page, '04-startup-modal');
await page.evaluate(() => document.querySelector('#startup-hire .dg-wiz-next')?.click());
await sleep(800);
shots.startupForm = await shot(page, '05-startup-form', {
  clip: { x: 200, y: 80, width: 1040, height: 720 },
});
await page.evaluate(() => {
  const f = document.querySelector('#startup-hire');
  const el = f?.querySelector('[name=contact-email]');
  if (el) { el.value = 'audit@test.example'; el.dispatchEvent(new Event('input', { bubbles: true })); }
  f?.querySelector('.dg-wiz-next')?.click();
});
await sleep(800);
shots.startupWizStage = await shot(page, '05b-startup-wiz-stage', {
  clip: { x: 200, y: 80, width: 1040, height: 720 },
});

await page.keyboard.press('Escape');
await sleep(600);
const engineerCta = await clickText(page, ['JOIN NETWORK', 'GET JOB']);
await sleep(1200);
const modalOpen = await page.evaluate(() => {
  const m = document.querySelector('#jobseeker-modal');
  return !!m && getComputedStyle(m).display !== 'none' && m.offsetParent !== null;
});
if (!modalOpen) {
  await page.evaluate(() => {
    const m = document.querySelector('#jobseeker-modal');
    if (m) { m.style.cssText = 'display:flex!important;visibility:visible!important;opacity:1!important'; }
  });
  await sleep(400);
}
shots.engineerModal = await shot(page, '06-engineer-modal', {
  clip: modalOpen ? { x: 200, y: 80, width: 1040, height: 720 } : undefined,
});
meta.live.engineerCta = engineerCta;
meta.live.engineerModalOpen = modalOpen;

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await sleep(800);
shots.footer = await shot(page, '07-footer', {
  clip: { x: 0, y: 520, width: 1440, height: 380 },
});

await page.setViewport({ width: 390, height: 844 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);
shots.mobileHero = await shot(page, '08-mobile-hero');

meta.live = {
  url,
  htmlScan: { formsOk: htmlScan.formsOk, headOk: htmlScan.headOk, tallyConfigured: htmlScan.tallyConfigured },
  staticPageScan: evaluatePageScan({ html, bodyText: html.replace(/<[^>]+>/g, ' ') }),
  renderedPageScan: pageScan,
  drift: {
    staticPostJob: evaluatePageScan(html).postJob,
    renderedPostJob: pageScan.postJob,
    headJsPatchesRuntime: evaluatePageScan(html).postJob && !pageScan.postJob,
  },
};

await page.close();

/* --- Blocker tabs (Webflow / Tally) --- */
for (const p of await browser.pages()) {
  const u = p.url();
  if (/webflow\.com/i.test(u)) {
    await p.bringToFront();
    await p.setViewport({ width: 1440, height: 900 });
    await sleep(500);
    const state = await p.evaluate(() => ({
      url: location.href,
      bot: /confirm you.re not a bot|press and hold/i.test(document.body?.innerText || ''),
      loggedOut: /logged out|sign back in/i.test(document.body?.innerText || ''),
      designer: /design\.webflow\.com/.test(location.href),
    }));
    shots.webflowBlocker = await shot(p, '09-webflow-blocker');
    meta.blockers.webflow = state;
  }
  if (/tally\.so/i.test(u) && !shots.tallyHome) {
    await p.bringToFront();
    await sleep(400);
    shots.tallyHome = await shot(p, '10-tally-home');
    meta.blockers.tally = { url: u, loggedIn: !/log in/i.test(await p.evaluate(() => document.body?.innerText?.slice(0, 300) || '')) };
  }
}

await browser.disconnect();

const manifest = {
  at: meta.at,
  shots,
  meta,
  problems: [
    { id: 'P0-NAV', shot: shots.nav, issue: 'Designer canvas POST A JOB; live head JS patches to HIRE TALENT at runtime' },
    { id: 'P0-FOOTER', shot: shots.footer, issue: 'Static HTML © 2025 TalentLink; head JS rewrites to © 2026 Demigod' },
    { id: 'P0-FORMS', shot: shots.startupForm, issue: 'Static data-name=email-form drift; Turnstile blocks CDP submit' },
    { id: 'P0-TALLY', shot: shots.tallyHome || null, issue: 'Tally URLs empty; strategy tally-both' },
    { id: 'P0-SIMPLIFY', shot: shots.landing, issue: 'Nav dropdowns, mega-footer, extra Pantheon per DEMIGOD-LOOSE-ENDS.json' },
    { id: 'P0-WEBFLOW-BLOCKER', shot: shots.webflowBlocker || null, issue: 'Cannot inject-head or edit masters until Webflow login' },
  ],
};
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ok: true, shots: Object.keys(shots).length, out: OUT, manifest: shots }, null, 2));