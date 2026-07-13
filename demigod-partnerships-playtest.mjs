#!/usr/bin/env node
/** CDP playtest: partnerships page, teaser, partner wizard, nav links. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-PARTNERSHIPS-PLAYTEST.json');
const SHOTS = path.join(ROOT, 'audit-shots', 'partnerships-playtest');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function loadLive(page, urlPath) {
  await page.evaluateOnNewDocument(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = function partnerWebhookMock(url, opts) {
      const body = typeof opts?.body === 'string' ? opts.body : '';
      if (body.includes('partner-apply') || /\.loca\.lt/i.test(String(url))) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, id: 'playtest-partner', status: 'new' }),
        });
      }
      return realFetch(url, opts);
    };
  });
  await page.goto(`${LIVE_ORIGIN}${urlPath}?v=partners-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => /dg-foot-v\d+-core/.test([...document.scripts].map((s) => s.textContent).join('')),
    { timeout: 15000 },
  ).catch(() => {});
  await sleep(2400);
}

async function shot(page, name) {
  const p = path.join(SHOTS, `${name}-${stamp()}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function walkPartner(page) {
  const form = '#partner-apply';
  const steps = [];
  const flow = [
    null,
    { 'partner-type': '__card__' },
    { 'partner-name': 'Jordan Lee' },
    { 'partner-email': 'partner@test.co' },
    { 'partner-org': 'Seed VC Partners' },
    { 'referral-plan': 'Portfolio warm intros and candidate referrals' },
    null,
    { 'partner-linkedin': 'https://linkedin.com/in/jordanlee' },
  ];

  steps.push(await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    return { wizOn: f?.classList.contains('dg-wiz-on'), step: f?.dataset.dgStep, welcome: !f?.querySelector('.dg-wiz-welcome')?.hidden };
  }, form));

  await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-wiz-next')?.click(), form);
  await sleep(450);

  for (let i = 1; i < flow.length; i++) {
    const data = flow[i];
    if (data?.['partner-type'] === '__card__') {
      await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-pt-cards .dg-wiz-card')?.click(), form);
      await sleep(500);
      await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-wiz-next')?.click(), form);
      await sleep(450);
    } else if (data) {
      await page.evaluate(({ sel, data: d }) => {
        const f = document.querySelector(sel);
        Object.entries(d).forEach(([n, v]) => {
          const el = f.querySelector(`[name="${n}"]`);
          if (el) el.value = v;
        });
      }, { sel: form, data });
      await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-wiz-next')?.click(), form);
      await sleep(450);
    } else {
      await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-wiz-next')?.click(), form);
      await sleep(450);
    }
    steps.push(await page.evaluate((sel) => {
      const f = document.querySelector(sel);
      const visible = [...f.querySelectorAll('.dg-field-wrap.dg-wiz-show')].map((w) => w.querySelector('[name]')?.name).filter(Boolean);
      const stray = [...f.querySelectorAll('.dg-field-wrap')].filter((w) => !w.classList.contains('dg-wiz-show') && w.offsetHeight > 0 && getComputedStyle(w).display !== 'none').length;
      return { step: f?.dataset.dgStep, visible, stray, submitMode: f?.classList.contains('dg-wiz-submit') };
    }, form));
  }

  await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-wiz-next')?.click(), form);
  await sleep(1500);
  steps.push(await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    return { thanks: !f?.querySelector('.dg-wiz-thanks')?.hidden, step: f?.dataset.dgStep };
  }, form));

  return { steps, strayOk: steps.every((s) => !s.stray) };
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  const results = { at: new Date().toISOString() };

  await page.setViewport({ width: 1440, height: 900 });
  await loadLive(page, '/');

  results.home = await page.evaluate(() => ({
    teaser: !!document.querySelector('#demigod-partners-teaser'),
    partnerModal: !!document.querySelector('#partner-modal'),
    navPartners: !!document.querySelector('#dg-site-nav a[href="/#partnerships"]'),
    footerPartners: !!document.querySelector('#dg-footer-legal a[href="/#partnerships"]'),
  }));
  await shot(page, 'home-teaser');

  await loadLive(page, '/#partnerships');
  await page.evaluate(() => {
    location.hash = 'partnerships';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    document.body.classList.add('dg-partners-page');
  });
  await sleep(800);

  results.partnersPage = await page.evaluate(() => ({
    wrap: !!document.querySelector('#demigod-partnerships-wrap'),
    bodyClass: document.body.classList.contains('dg-partners-page'),
    h1: document.querySelector('#demigod-partnerships-wrap h1')?.textContent?.trim(),
    table: !!document.querySelector('.dg-p-table'),
    cta: !!document.querySelector('#demigod-partnerships-wrap [data-dg-partner-apply]'),
    heroHidden: getComputedStyle(document.querySelector('.hero-section,.header') || document.body).display === 'none'
      || !document.querySelector('.hero-section,.header')?.offsetParent,
  }));
  await shot(page, 'partners-page');

  await page.evaluate(() => document.querySelector('[data-dg-partner-apply]')?.click());
  await sleep(1200);
  results.modalOpen = await page.evaluate(() => ({
    open: document.querySelector('#partner-modal')?.classList.contains('dg-wiz-active'),
    form: !!document.querySelector('#partner-apply.dg-wiz-on'),
  }));
  await shot(page, 'partner-welcome');

  results.partnerWalk = await walkPartner(page);
  await shot(page, 'partner-review');

  await browser.disconnect();

  results.pass = {
    homeTeaser: results.home?.teaser,
    partnerModalInjected: results.home?.partnerModal,
    navLink: results.home?.navPartners,
    footerLink: results.home?.footerPartners,
    partnersPage: results.partnersPage?.wrap && results.partnersPage?.bodyClass,
    compensationTable: results.partnersPage?.table,
    partnerWizard: results.modalOpen?.form && results.partnerWalk?.strayOk,
    partnerReview: results.partnerWalk?.steps?.some((s) => s.submitMode),
    partnerThanks: results.partnerWalk?.steps?.some((s) => s.thanks),
  };
  results.ok = Object.values(results.pass).every(Boolean);

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: results.ok, pass: results.pass, out: OUT }));
  process.exit(results.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});