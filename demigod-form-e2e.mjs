#!/usr/bin/env node
/**
 * demigod-form-e2e.mjs — Prove live WIZ form delivery path (Fable NOW item #2).
 * CDP → open Hire modal → drive WIZ → submit tagged email → report network destination.
 * No board writes. No foot-core edits.
 *
 *   node demigod-form-e2e.mjs
 *   node demigod-form-e2e.mjs --dry   # open + inspect only, no submit
 */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';

const LIVE = 'https://www.trydemigod.com/';
const TAG = `e2e-test-${Date.now()}@trydemigod.com`;
const DRY = process.argv.includes('--dry');
const OUT = path.join('/tmp', `demigod-form-e2e-${Date.now()}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const report = {
    at: new Date().toISOString(),
    tag: TAG,
    dry: DRY,
    requests: [],
    steps: [],
    pass: false,
    destination: null,
    error: null,
  };

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: CDP_URL,
      defaultViewport: null,
      protocolTimeout: 240000,
    });
  } catch (e) {
    report.error = `CDP connect failed: ${e.message}. Run ~/agent-dev.sh up first.`;
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ pass: false, error: report.error, out: OUT }));
    process.exit(1);
  }

  let page;
  let ownsPage = false;
  try {
    const pages = await browser.pages();
    page = pages.find((p) => (p.url() || '').includes('trydemigod.com'));
    if (!page) {
      try {
        page = await browser.newPage();
        ownsPage = true;
      } catch (e) {
        if (!/Network\.enable|Protocol error/i.test(e.message)) throw e;
        report.steps.push({ networkPageFallback: e.message });
        page = pages.find((p) => !p.isClosed());
        if (!page) throw e;
      }
    }

    try {
      const client = await page.target().createCDPSession();
      await client.send('Network.enable');
      client.on('Network.requestWillBeSent', (p) => {
        const u = p.request?.url || '';
        const m = p.request?.method || '';
        if (m === 'POST' || /form|submit|webhook|webflow|formspree|trydemigod|loca\.lt/i.test(u)) {
          report.requests.push({
            method: m,
            url: u.slice(0, 300),
            type: p.type,
            postData: (p.request?.postData || '').slice(0, 400),
          });
        }
      });
    } catch (e) {
      if (!/Network\.enable|Protocol error/i.test(e.message)) throw e;
      report.steps.push({ networkCaptureDisabled: e.message });
    }

    await page.goto(LIVE + '?e2e=' + Date.now(), { waitUntil: 'commit', timeout: 60000 });
    await page.waitForSelector('body', { timeout: 20000 });
    await sleep(4000);
    report.steps.push('loaded');

    // Open hire modal via CTA
    const opened = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('a,button')].find((el) =>
        /HIRE TALENT|FIND TALENT|Start brief/i.test((el.textContent || '').trim())
      );
      if (btn) {
        btn.click();
        return true;
      }
      const m = document.querySelector('#startup-modal');
      if (m) {
        m.style.display = 'flex';
        m.style.visibility = 'visible';
        return 'forced';
      }
      return false;
    });
    report.steps.push({ open: opened });
    await sleep(1500);

    // Drive WIZ: click next until submit or max steps
    for (let i = 0; i < 20; i++) {
      const state = await page.evaluate((tag) => {
        const modal = document.querySelector('#startup-modal');
        if (!modal) return { err: 'no modal' };
        const q = modal.querySelector('.dg-wiz-q')?.textContent || '';
        const next = modal.querySelector('.dg-wiz-next');
        // fill visible required-ish fields
        const vis = [...modal.querySelectorAll('input,textarea,select')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && el.type !== 'hidden' && el.type !== 'file';
        });
        for (const el of vis) {
          const n = (el.name || el.id || '').toLowerCase();
          if (el.type === 'email' || /email/.test(n)) el.value = tag;
          else if (el.tagName === 'SELECT' && el.options.length > 1) el.selectedIndex = 1;
          else if (el.type === 'checkbox') el.checked = true;
          else if (!el.value) {
            if (/company/.test(n)) el.value = 'E2E Test Co';
            else if (/role|title/.test(n)) el.value = 'Founding Engineer (e2e)';
            else if (/stack|skill|90day|outcome|why/.test(n)) el.value = 'E2E: ship v1 matching pipeline (test — discard)';
            else if (/phone/.test(n)) continue;
            else el.value = 'e2e-test';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nextText = (next?.textContent || '').trim();
        return { q: q.slice(0, 80), nextText, vis: vis.length, hasNext: !!next };
      }, TAG);
      report.steps.push({ i, ...state });
      if (state.err) break;

      if (/submit|send brief|ready/i.test(state.nextText || '') || /ready to submit/i.test(state.q || '')) {
        if (DRY) {
          report.steps.push('dry-stop-before-submit');
          break;
        }
        await page.evaluate(() => {
          const modal = document.querySelector('#startup-modal');
          const next = modal?.querySelector('.dg-wiz-next');
          const native = modal?.querySelector('[type=submit],.w-button');
          if (next) next.click();
          else if (native) native.click();
        });
        await sleep(4000);
        report.steps.push('submitted');
        break;
      }

      await page.evaluate(() => {
        const next = document.querySelector('#startup-modal .dg-wiz-next');
        if (next) next.click();
      });
      await sleep(800);
    }

    // Classify destination
    if (DRY && report.steps.includes('dry-stop-before-submit')) {
      report.pass = true;
      report.destination = 'dry-run: submit-ready (no submission sent)';
    } else {
      const posts = report.requests.filter((r) => r.method === 'POST');
      report.posts = posts;
      if (posts.length) {
        const dest = posts[posts.length - 1].url;
        report.destination = dest;
        if (/loca\.lt|ngrok|localhost|127\.0\.0\.1/i.test(dest)) {
          report.pass = false;
          report.error = 'DEAD_OR_LOCAL_WEBHOOK: ' + dest;
        } else if (/webflow|formspree|hooks\.|api\.|make\.com|zapier|supabase/i.test(dest)) {
          report.pass = true;
          report.destinationClass = 'external-or-webflow';
        } else {
          report.pass = true;
          report.destinationClass = 'other-post';
        }
      } else {
        // Webflow native forms sometimes POST as navigation
        const thanks = await page.evaluate(() => {
          const t = document.body?.innerText || '';
          return /received|thank|follow up|brief/i.test(t);
        });
        report.thanksVisible = thanks;
        if (thanks) {
          report.pass = true;
          report.destination = 'webflow-native-success-ui (no XHR POST captured — check Webflow Forms dashboard)';
        } else {
          report.pass = false;
          report.error = 'NO_POST_AND_NO_THANKS';
        }
      }
    }
  } catch (e) {
    report.error = e.message;
    report.pass = false;
  }

  try {
    if (ownsPage && page) await page.close();
  } catch (_) {}
  try {
    await browser.disconnect();
  } catch (_) {}

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        pass: report.pass,
        tag: TAG,
        destination: report.destination,
        error: report.error,
        posts: (report.posts || []).length,
        out: OUT,
      },
      null,
      2
    )
  );
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
