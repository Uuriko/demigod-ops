#!/usr/bin/env node
/** Fast snap: trust + privacy only */
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const SHOTS = path.join(ROOT, 'audit-shots', 'design');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function snap(page, url, setup, shot) {
  await page.goto(`${LIVE_ORIGIN}${url}?snap=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => /dg-foot-v\d+-core/.test([...document.scripts].map((s) => s.textContent).join('')), { timeout: 12000 }).catch(() => {});
  await sleep(2200);
  await page.evaluate(setup);
  await sleep(1600);
  await page.screenshot({ path: shot, fullPage: false });
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 90000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await snap(page, '/', () => {
    const el = document.querySelector('#demigod-trust-block');
    if (el) window.scrollTo(0, Math.max(0, el.offsetTop - 80));
  }, path.join(SHOTS, 'v60-trust.png'));

  await snap(page, '/#privacy', () => {
    location.hash = 'privacy';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    document.body.classList.add('dg-legal-page');
    window.scrollTo(0, 0);
  }, path.join(SHOTS, 'v60-privacy.png'));

  await page.close();
  await browser.disconnect();
  console.log(JSON.stringify({ ok: true, shots: ['v60-trust.png', 'v60-privacy.png'] }));
}

main().catch((e) => { console.error(e); process.exit(1); });