#!/usr/bin/env node
/**
 * demigod-form-e2e-pw.mjs — Playwright form/WIZ flow proof (no CDP required).
 * Dry by default. --submit for real tagged submit attempt.
 *
 *   node demigod-form-e2e-pw.mjs
 *   node demigod-form-e2e-pw.mjs --submit
 *   node demigod-form-e2e-pw.mjs --local   # inject disk foot-core over catbox
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const LIVE = 'https://www.trydemigod.com/';
const SUBMIT = process.argv.includes('--submit');
const LOCAL = process.argv.includes('--local');
const TAG = `e2e-pw-${Date.now()}@trydemigod.com`;
const OUT = path.join('/tmp', `demigod-form-e2e-pw-${Date.now()}.json`);
const CORE = fs.existsSync('demigod-foot-core.js')
  ? fs.readFileSync('demigod-foot-core.js', 'utf8')
  : null;

const report = {
  at: new Date().toISOString(),
  tag: TAG,
  submit: SUBMIT,
  local: LOCAL,
  steps: [],
  posts: [],
  formPosts: [],
  pass: false,
  destination: null,
  error: null,
  hire: null,
  join: null,
  wiz: [],
  joinWiz: [],
  foot: null,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('request', (req) => {
    if (req.method() === 'POST') {
      report.posts.push({ url: req.url().slice(0, 300), postData: (req.postData() || '').slice(0, 400) });
    }
  });
  page.on('pageerror', (e) => report.steps.push({ pageerror: String(e.message || e).slice(0, 160) }));

  try {
    if (LOCAL && CORE) {
      await page.route('**/*', async (route) => {
        const u = route.request().url();
        if (/files\.catbox\.moe\/.*\.js$/i.test(u) || /foot-latest\.js(?:[?#]|$)|demigod-foot/i.test(u)) {
          return route.fulfill({ status: 200, contentType: 'application/javascript', body: CORE });
        }
        return route.continue();
      });
    }

    await page.goto(LIVE + '?e2e-pw=' + Date.now(), { waitUntil: 'commit', timeout: 60000 });
    await sleep(2000);
    await page.waitForFunction(() => document.body && document.body.innerText.length > 100, { timeout: 20000 }).catch(()=>{});
    await sleep(2500);
    report.steps.push('loaded');
    report.foot = await page.evaluate(() => window.dgFootVersion || window.__dgFootVer || null);

    // Open hire
    const hireBtn = await page.evaluate(() => {
      const btn = document.querySelector('[data-demigod-modal="startup"],a[href*="wiz=startup"]');
      if (btn) {
        btn.click();
        return (btn.textContent || '').trim().slice(0, 40);
      }
      return null;
    });
    report.steps.push({ hireBtn });
    await sleep(1500);

    report.hire = await page.evaluate(() => {
      const m = document.querySelector('#startup-modal');
      if (!m) return { found: false };
      const cs = getComputedStyle(m);
      return {
        found: true,
        display: cs.display,
        visibility: cs.visibility,
        wizQ: (m.querySelector('.dg-wiz-q')?.textContent || '').slice(0, 100),
        hasNext: !!m.querySelector('.dg-wiz-next'),
        fieldNames: [...m.querySelectorAll('input,select,textarea')].map((el) => el.name || el.id).filter(Boolean).slice(0, 40),
        has90dayInDom: !!m.querySelector('[name="90day-outcome"],[id="90day-outcome"]'),
      };
    });

    // Drive wizard up to review/submit (max 14 steps)
    for (let i = 0; i < 14; i++) {
      const st = await page.evaluate((tag) => {
        const modal = document.querySelector('#startup-modal');
        if (!modal) return { err: 'no modal' };
        const q = (modal.querySelector('.dg-wiz-q')?.textContent || '').trim();
        const next = modal.querySelector('.dg-wiz-next');
        const nextText = (next?.textContent || '').trim();
        const vis = [...modal.querySelectorAll('input,textarea,select')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && el.type !== 'hidden' && el.type !== 'file';
        });
        for (const el of vis) {
          const n = (el.name || el.id || '').toLowerCase();
          if (el.type === 'email' || /email/.test(n)) el.value = tag;
          else if (el.tagName === 'SELECT' && el.options.length > 1) el.selectedIndex = Math.min(1, el.options.length - 1);
          else if (el.type === 'checkbox' || el.type === 'radio') el.checked = true;
          else if (!el.value) {
            if (/company/.test(n)) el.value = 'E2E PW Co';
            else if (/role|title/.test(n)) el.value = 'Founding Engineer';
            else if (/stage/.test(n)) el.value = el.options?.[1]?.value || 'Seed';
            else if (/stack|skill|90day|outcome|why|jd/.test(n))
              el.value = 'E2E: ship honest matching pipeline; discard if tagged e2e-pw';
            else if (/salary|comp/.test(n)) el.value = '$180-220k + equity';
            else if (/timeline|team|size/.test(n)) el.value = 'This quarter';
            else if (/phone/.test(n)) continue;
            else el.value = 'e2e-pw';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const isSubmit = /submit|send|finish/i.test(nextText) || /ready to submit/i.test(q);
        const thanks = modal.querySelector('.dg-thanks, .w-form-done');
        const isThanks = /thank/i.test(q) || !!(thanks && thanks.getBoundingClientRect().height > 0);
        return {
          i: undefined,
          q: q.slice(0, 90),
          vis: vis.length,
          nextText,
          isSubmit,
          isThanks: !!isThanks,
          names: vis.map((el) => el.name || el.id).slice(0, 8),
        };
      }, TAG);
      st.i = i;
      report.wiz.push(st);
      if (st.err || st.isThanks) break;
      if (st.isSubmit && !SUBMIT) {
        report.steps.push('dry-stop-at-submit');
        break;
      }
      if (st.isSubmit && SUBMIT) {
        await page.evaluate(() => {
          const next = document.querySelector('#startup-modal .dg-wiz-next');
          if (next) next.click();
          else document.querySelector('#startup-modal form')?.requestSubmit?.();
        });
        await sleep(3000);
        report.steps.push('submitted');
        break;
      }
      await page.evaluate(() => {
        const next = document.querySelector('#startup-modal .dg-wiz-next');
        if (next) next.click();
      });
      await sleep(650);
    }

    // Join path open check
    await page.evaluate(() => {
      document.querySelector('#startup-modal')?.style.setProperty('display', 'none');
    });
    await sleep(300);
    const joinBtn = await page.evaluate(() => {
      const btn = document.querySelector('[data-demigod-modal="jobseeker"],a[href*="wiz=engineer"]');
      if (btn) {
        btn.click();
        return (btn.textContent || '').trim().slice(0, 40);
      }
      return null;
    });
    await sleep(1000);
    report.join = await page.evaluate(() => {
      const m = document.querySelector('#jobseeker-modal');
      if (!m) return { found: false };
      return {
        found: true,
        display: getComputedStyle(m).display,
        wizQ: (m.querySelector('.dg-wiz-q')?.textContent || '').slice(0, 80),
        vis: [...m.querySelectorAll('input,textarea,select')].filter((el) => el.getBoundingClientRect().height > 0).length,
      };
    });
    report.steps.push({ joinBtn });

    // Drive the candidate wizard to its guarded submit step without sending.
    for (let i = 0; i < 12; i++) {
      const st = await page.evaluate((tag) => {
        const modal = document.querySelector('#jobseeker-modal');
        if (!modal) return { err: 'no modal' };
        const q = (modal.querySelector('.dg-wiz-q')?.textContent || '').trim();
        const next = modal.querySelector('.dg-wiz-next');
        const nextText = (next?.textContent || '').trim();
        const vis = [...modal.querySelectorAll('input,textarea,select')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && el.type !== 'hidden' && el.type !== 'file';
        });
        for (const el of vis) {
          const n = (el.name || el.id || '').toLowerCase();
          if (el.type === 'email') el.value = tag;
          else if (el.tagName === 'SELECT' && el.options.length > 1) el.selectedIndex = 1;
          else if (el.type === 'checkbox' || el.type === 'radio') el.checked = true;
          else if (/resume-url/.test(n)) el.value = ''; // prove the optional proof step can be skipped
          else if (/full-name/.test(n)) el.value = 'E2E Candidate';
          else if (/experience/.test(n)) el.value = 'Shipped measurable product and reliability improvements for customers.';
          else if (!el.value) el.value = 'Product engineering, systems, and customer-facing work';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return {
          q: q.slice(0, 90),
          vis: vis.length,
          nextText,
          isSubmit: /submit|send|finish/i.test(nextText) || /^ready\??$/i.test(q),
          names: vis.map((el) => el.name || el.id).slice(0, 8),
        };
      }, TAG);
      st.i = i;
      report.joinWiz.push(st);
      if (st.err || st.isSubmit) break;
      await page.evaluate(() => document.querySelector('#jobseeker-modal .dg-wiz-next')?.click());
      await sleep(650);
    }

    report.formPosts = report.posts.filter((p) => !/^https:\/\/challenges\.cloudflare\.com\//i.test(p.url));
    report.destination = report.formPosts[0]?.url || null;
    report.pass = !!(
      report.hire?.found &&
      report.hire?.hasNext &&
      report.wiz.length >= 2 &&
      report.wiz.some((w) => w.vis > 0) &&
      report.wiz.some((w) => w.isSubmit) &&
      report.join?.found &&
      report.joinWiz.length >= 2 &&
      report.joinWiz.some((w) => w.vis > 0) &&
      report.joinWiz.some((w) => w.isSubmit) &&
      (SUBMIT || report.formPosts.length === 0)
    );
    if (!report.pass && !report.error) {
      report.error = 'flow incomplete: hire/wiz/join checks failed';
    }
  } catch (e) {
    report.error = String(e.message || e);
    report.pass = false;
  }

  await page.screenshot({ path: '/tmp/dg-ux-pack/shots/e2e-pw-final.png', fullPage: false }).catch(() => {});
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, foot: report.foot, hire: report.hire?.found, join: report.join?.found, wizSteps: report.wiz.length, joinWizSteps: report.joinWiz.length, telemetryPosts: report.posts.length, formPosts: report.formPosts.length, destination: report.destination, error: report.error, out: OUT }, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main();
