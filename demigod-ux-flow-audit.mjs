#!/usr/bin/env node
/** Multi-viewport Hire/Join/WIZ flow audit — Playwright, no CDP */
import { chromium } from 'playwright';
import fs from 'fs';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];
const OUT = '/tmp/dg-ux-pack/playwright-flows.json';
const SHOTS = '/tmp/dg-ux-pack/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function one(browser, vp) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const entry = { ...vp, steps: [], pageErrors: [], consoleErrors: [] };
  page.on('pageerror', (e) => entry.pageErrors.push(String(e.message || e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') entry.consoleErrors.push(m.text().slice(0, 160)); });
  try {
    await page.goto('https://www.trydemigod.com/?ux=' + Date.now(), { waitUntil: 'commit', timeout: 45000 });
    await sleep(2000);
    await page.waitForFunction(() => (document.body?.innerText || '').length > 80, { timeout: 20000 }).catch(() => {});
    await sleep(3000);
    entry.steps.push('loaded');
    entry.snap = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      return {
        title: document.title,
        bodyChars: text.length,
        hire: /HIRE TALENT|HIRE SF/i.test(text),
        join: /JOIN NETWORK|GET MATCHED/i.test(text),
        email: /hello@trydemigod\.com/i.test(text),
        lorem: /lorem ipsum/i.test(text),
        sla: /within 24|48\s*h/i.test(text),
        foot: window.dgFootVersion || window.__dgFootVer || null,
        unhide: document.documentElement.outerHTML.includes('unhide-v5'),
        forms: document.querySelectorAll('form').length,
        stickyBar: !!document.querySelector('#dg-bar'),
        ctas: [...document.querySelectorAll('a,button')]
          .map((el) => (el.textContent || '').trim().slice(0, 36))
          .filter(Boolean)
          .slice(0, 20),
      };
    });
    await page.screenshot({ path: `${SHOTS}/${vp.name}-home.png` }).catch(() => {});

    entry.hireClicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('a,button')].find((el) =>
        /HIRE TALENT|HIRE SF|Start brief|FIND TALENT/i.test((el.textContent || '').trim())
      );
      if (btn) { btn.click(); return (btn.textContent || '').trim().slice(0, 40); }
      return null;
    });
    await sleep(1500);
    entry.hireModal = await page.evaluate(() => {
      const m = document.querySelector('#startup-modal');
      if (!m) return { found: false };
      const cs = getComputedStyle(m);
      const fields = [...m.querySelectorAll('input,select,textarea')].map((el) => ({
        name: el.name || el.id || '',
        type: el.type || el.tagName,
        vis: el.getBoundingClientRect().height > 0,
      }));
      return {
        found: true,
        display: cs.display,
        opacity: cs.opacity,
        wizQ: (m.querySelector('.dg-wiz-q')?.textContent || '').slice(0, 100),
        hasNext: !!m.querySelector('.dg-wiz-next'),
        nextText: (m.querySelector('.dg-wiz-next')?.textContent || '').trim(),
        fields: fields.filter((f) => f.name).slice(0, 35),
        visibleFields: fields.filter((f) => f.vis).length,
        has90day: fields.some((f) => /90day/i.test(f.name)),
        snippet: (m.innerText || '').slice(0, 280),
      };
    });
    await page.screenshot({ path: `${SHOTS}/${vp.name}-hire.png` }).catch(() => {});

    entry.wizSteps = [];
    for (let i = 0; i < 5; i++) {
      const st = await page.evaluate((tag) => {
        const modal = document.querySelector('#startup-modal');
        if (!modal) return { err: 'no modal' };
        const q = (modal.querySelector('.dg-wiz-q')?.textContent || '').trim();
        const next = modal.querySelector('.dg-wiz-next');
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
            if (/company/.test(n)) el.value = 'UX Co';
            else if (/role|title/.test(n)) el.value = 'Founding Engineer';
            else if (/stack|skill|90day|outcome|why|jd/.test(n)) el.value = 'Ship matching pipeline quality';
            else if (/salary/.test(n)) el.value = '$180-220k';
            else if (/phone/.test(n)) continue;
            else el.value = 'ux';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const nextText = (next?.textContent || '').trim();
        if (next) next.click();
        return { q: q.slice(0, 80), vis: vis.length, nextText, advanced: !!next, names: vis.map((e) => e.name || e.id).slice(0, 6) };
      }, `ux-${Date.now()}@trydemigod.com`);
      entry.wizSteps.push(st);
      await sleep(700);
    }
    await page.screenshot({ path: `${SHOTS}/${vp.name}-wiz.png` }).catch(() => {});

    await page.evaluate(() => {
      document.querySelector('#startup-modal')?.style.setProperty('display', 'none');
    });
    await sleep(300);
    entry.joinClicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('a,button')].find((el) =>
        /JOIN NETWORK|GET MATCHED/i.test((el.textContent || '').trim())
      );
      if (btn) { btn.click(); return (btn.textContent || '').trim().slice(0, 40); }
      return null;
    });
    await sleep(1200);
    entry.joinModal = await page.evaluate(() => {
      const m = document.querySelector('#jobseeker-modal');
      if (!m) return { found: false };
      return {
        found: true,
        display: getComputedStyle(m).display,
        wizQ: (m.querySelector('.dg-wiz-q')?.textContent || '').slice(0, 80),
        visibleFields: [...m.querySelectorAll('input,textarea,select')].filter((el) => el.getBoundingClientRect().height > 0).length,
        snippet: (m.innerText || '').slice(0, 200),
      };
    });
    await page.screenshot({ path: `${SHOTS}/${vp.name}-join.png` }).catch(() => {});

    entry.stickyBar = await page.evaluate(() => {
      const b = document.querySelector('#dg-bar');
      if (!b) return { found: false };
      const r = b.getBoundingClientRect();
      return {
        found: true,
        visible: r.height > 0 && getComputedStyle(b).display !== 'none',
        links: [...b.querySelectorAll('a')].map((a) => (a.textContent || '').trim()),
        bg: [...b.querySelectorAll('a')].map((a) => getComputedStyle(a).backgroundColor),
      };
    });
    entry.chrome = await page.evaluate(() => ({
      footerEmail: [...document.querySelectorAll('a')].some((a) => /hello@trydemigod/i.test(a.textContent + a.href)),
      navVisible: [...document.querySelectorAll('nav a, .w-nav a')].filter((a) => a.getBoundingClientRect().height > 0).length,
    }));

    entry.ok = !!(entry.snap?.hire && entry.snap?.join && entry.snap?.email && !entry.snap?.lorem && entry.hireModal?.found);
    entry.issues = [];
    if (!entry.snap?.hire) entry.issues.push('no hire CTA text');
    if (!entry.snap?.join) entry.issues.push('no join CTA text');
    if (!entry.hireModal?.found) entry.issues.push('startup modal missing');
    if (entry.hireModal?.found && entry.hireModal.display === 'none') entry.issues.push('hire modal display:none after click');
    if (entry.hireModal?.found && entry.hireModal.visibleFields === 0 && !entry.hireModal.wizQ)
      entry.issues.push('hire modal open but no visible fields/wiz');
    if (!entry.joinModal?.found) entry.issues.push('jobseeker modal missing after join click');
    if (entry.wizSteps?.length && entry.wizSteps.every((s) => !s.vis))
      entry.issues.push('WIZ advanced but zero visible inputs all steps');
    if (entry.pageErrors.length) entry.issues.push('pageerrors:' + entry.pageErrors.length);
  } catch (e) {
    entry.error = String(e.message || e);
    entry.ok = false;
    entry.issues = [entry.error];
  }
  await page.close();
  return entry;
}

const browser = await chromium.launch({ headless: true });
const report = { at: new Date().toISOString(), viewports: [] };
for (const vp of VIEWPORTS) report.viewports.push(await one(browser, vp));
await browser.close();
report.summary = {
  allOk: report.viewports.every((v) => v.ok),
  issues: report.viewports.flatMap((v) => (v.issues || []).map((i) => `${v.name}: ${i}`)),
  byViewport: Object.fromEntries(
    report.viewports.map((v) => [
      v.name,
      {
        ok: v.ok,
        foot: v.snap?.foot,
        hire: v.hireModal?.found,
        hireVis: v.hireModal?.visibleFields,
        wiz: (v.wizSteps || []).map((s) => ({ q: s.q, vis: s.vis })),
        join: v.joinModal?.found,
        sticky: v.stickyBar,
        issues: v.issues,
      },
    ])
  ),
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
process.exit(report.summary.allOk ? 0 : 1);
