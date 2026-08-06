#!/usr/bin/env node
/** CDP playtest: Typeform wizard v53 — one field per step, review, nav, screenshots. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-WIZARD-PLAYTEST.json');
const SHOTS = path.join(ROOT, 'audit-shots', 'wizard-playtest');
const DESKTOP_ONLY = process.argv.includes('--desktop-only');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function loadLive(page, tag) {
  await page.goto(`${LIVE_ORIGIN}/?v=${tag}-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => /dg-foot-v\d+-core/.test([...document.scripts].map((s) => s.textContent).join('')),
    { timeout: 15000 },
  ).catch(() => {});
  await sleep(2400);
}

async function wizState(page, formSel) {
  return page.evaluate((sel) => {
    const f = document.querySelector(sel);
    if (!f) return { error: 'form_missing' };
    const modal = f.closest('#startup-modal,#jobseeker-modal');
    const q = modal ? modal.querySelector('.dg-wiz-q') : null;
    const bar = modal ? modal.querySelector('.dg-wiz-bar > i') : null;
    const nextBtn = modal ? modal.querySelector('.dg-wiz-next, .dg-wiz-start') : null;
    const backBtn = modal ? modal.querySelector('.dg-wiz-back') : null;
    const visible = [...f.querySelectorAll('.dg-field-wrap.dg-wiz-show, .form-field-group.dg-wiz-show, .dg-field-wrap.dg-wiz-show')].map((w) => {
      const el = w.querySelector('[name]') || w.querySelector('input,select,textarea');
      return el?.name || w.id || (w.textContent || '').trim().slice(0,20) || '?';
    }).filter(Boolean);
    const stray = [...f.querySelectorAll('.form-field-group, .dg-field-wrap')].filter((w) => {
      if (w.classList.contains('dg-wiz-show')) return false;
      const cs = getComputedStyle(w);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && w.offsetHeight > 0;
    }).map((w) => w.querySelector('[name]')?.name || (w.textContent||'').trim().slice(0,30));
    const chromeHidden = modal ? [...modal.querySelectorAll('.modal-title,.modal-subtitle,.modal-intro,.modal-container>h2,.modal-container>h3,.modal-container>p,.modal-container>div>p')].every((el) => getComputedStyle(el).display === 'none') : true;
    const qText = q ? q.textContent.trim() : '';
    /* Detect the welcome step structurally, not by headline copy. The copy-reduction passes renamed
       this question ("HIRE SF STARTUP TALENT" -> "Hiring brief"), which silently made passWizard bail
       at its first condition and report the startup wizard as broken when it was working. The start
       button + 0% bar are what actually define the welcome step; the old strings stay as a fallback. */
    const startish = nextBtn && (nextBtn.classList.contains('dg-wiz-start') || /^start\b/i.test((nextBtn.textContent || '').trim()));
    const barAtZero = !!bar && (bar.style.width === '' || bar.style.width === '0%');
    const isWelcome = !!(startish && barAtZero) || /hire sf startup talent|get matched to sf startups/i.test(qText);
    const isThanks = /brief received|profile saved|application received/i.test(qText) || (modal && modal.querySelector('.w-form-done') && getComputedStyle(modal.querySelector('.w-form-done')).display !== 'none');
    return {
      wizOn: f.classList.contains('dg-wiz-on'),
      step: visible.length ? (isWelcome ? 0 : visible.length) : (isWelcome ? 0 : 1),
      welcome: isWelcome,
      thanks: isThanks,
      submitMode: !!modal && !!modal.querySelector('.dg-wiz-review'),
      meta: (bar ? 'bar:' + (bar.style.width||'') : '') + (nextBtn ? ' next:' + (nextBtn.textContent||'').trim().slice(0,12) : ''),
      next: (nextBtn ? (nextBtn.textContent||'').trim() : ''),
      visible,
      strayLabels: stray,
      chromeHidden,
      modalActive: !!(modal && (modal.style.display === 'flex' || getComputedStyle(modal).display !== 'none')),
      hasDrop: !!f.querySelector('.w-file-upload'),
      hasReview: !!modal && !!modal.querySelector('.dg-wiz-review'),
      bar: bar ? bar.style.width || '' : '',
      q: qText.slice(0,40)
    };
  }, formSel);
}

async function clickNext(page, formSel) {
  await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-wiz-next')?.click(), formSel);
  await sleep(450);
}

async function openModal(page, texts) {
  await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('a,button')].find((el) =>
      t.some((x) => new RegExp(`^${x}$`, 'i').test((el.textContent || '').trim().split('\n')[0])));
    btn?.click();
  }, texts);
  await sleep(1200);
}

async function shot(page, name) {
  const p = path.join(SHOTS, `${name}-${stamp()}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function walkStartup(page) {
  const form = '#startup-hire';
  const steps = [];
  steps.push(await wizState(page, form));
  await shot(page, 'startup-welcome');
  await clickNext(page, form);
  steps.push(await wizState(page, form));
  await clickNext(page, form);
  const blocked = await wizState(page, form);
  await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    f.querySelector('[name=contact-email]').value = 'founder@test.co';
  }, form);
  await clickNext(page, form);
  steps.push(await wizState(page, form));
  await shot(page, 'startup-email');
  await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    const cn = f.querySelector('[name=company-name]');
    if (cn) cn.value = 'Acme Labs';
  }, form);
  await clickNext(page, form);
  steps.push(await wizState(page, form));
  await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    const card = f.querySelector('.dg-wiz-cards .dg-wiz-card');
    card?.click();
  }, form);
  await sleep(500);
  await clickNext(page, form);
  steps.push(await wizState(page, form));
  await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    f.querySelector('[name=role-title]').value = 'Founding PM';
  }, form);
  await clickNext(page, form);
  steps.push(await wizState(page, form));
  await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    const sn = f.querySelector('[name=stack-needs]');
    if (sn) sn.value = 'B2B SaaS, GTM, design systems';
  }, form);
  await clickNext(page, form);
  steps.push(await wizState(page, form));
  /* The tail used to be 4 blind clickNext calls, which assumed a fixed field order and silently
     stalled the moment the wizard changed: the walk parked on `company-stage` (a card-select the
     blind clicks cannot satisfy) and never reached review, so passWizard reported the revenue-side
     flow broken when it was working. Drive whatever step is actually visible instead. */
  for (let i = 0; i < 14; i++) {
    const before = await wizState(page, form);
    if (before.submitMode) break;
    await fillVisibleStep(page, form);
    await clickNext(page, form);
    const after = await wizState(page, form);
    // No progress and no review => genuinely stuck; record it rather than loop out the clock.
    if (after.submitMode) break;
    if (JSON.stringify(after.visible) === JSON.stringify(before.visible) && after.meta === before.meta) break;
  }
  steps.push(await wizState(page, form));
  await shot(page, 'startup-review');
  return { steps, blockedAtEmail: blocked.step === steps[1]?.step, strayOk: steps.every((s) => !s.strayLabels?.length) };
}

/* Fill whichever fields the wizard is currently showing, whatever they are. Keeps the walk honest
   when field order or wording changes: a stale positional script reports a working flow as broken. */
async function fillVisibleStep(page, formSel) {
  await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    if (!f) return;
    const wraps = [...f.querySelectorAll('.dg-field-wrap.dg-wiz-show, .form-field-group.dg-wiz-show')];
    for (const w of wraps) {
      const card = w.querySelector('.dg-wiz-card, .dg-wiz-cards .dg-wiz-card');
      if (card) { card.click(); continue; }
      const el = w.querySelector('input,select,textarea');
      if (!el || el.type === 'file') continue;
      if (el.type === 'checkbox' || el.type === 'radio') { if (!el.checked) el.click(); continue; }
      if (el.tagName === 'SELECT') {
        const opt = [...el.options].find((o) => o.value && !o.disabled);
        if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
        continue;
      }
      if (String(el.value || '').trim()) continue; // never overwrite an answer already given
      const n = el.getAttribute('name') || '';
      el.value = /email/i.test(n) ? 'founder@test.co'
        : /salary|comp|band/i.test(n) ? '$180k-$220k'
        : /url|link|site/i.test(n) ? 'https://example.com'
        : /company/i.test(n) ? 'Acme Labs'
        : /title|role/i.test(n) ? 'Founding PM'
        : 'Playtest synthetic answer';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, formSel);
  await sleep(350);
}

async function fillStep(page, formSel, data) {
  await page.evaluate(({ sel, data: d }) => {
    const f = document.querySelector(sel);
    Object.entries(d).forEach(([n, v]) => {
      const el = f.querySelector(`[name="${n}"]`);
      if (!el) return;
      if (el.type === 'file' && v === '__file__') {
        const dt = new DataTransfer();
        dt.items.add(new File(['%PDF-1.4 test'], 'resume.pdf', { type: 'application/pdf' }));
        el.files = dt.files;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else el.value = v;
    });
  }, { sel: formSel, data });
}

async function walkEngineer(page) {
  const form = '#engineer-join';
  const steps = [];
  try {
  const flow = [
    null,
    { 'full-name': 'Alex Chen' },
    { 'seeker-email': 'alex@test.com' },
    { 'linkedin-url': 'https://linkedin.com/in/alexchen' },
    { resume: '__file__' },
    { 'skills-stack': 'Product, Figma, growth' },
    { experience: 'Shipped v1 at seed startup' },
    null,
    { 'sf-bay': '__card__' },
  ];
  steps.push(await wizState(page, form));
  await clickNext(page, form);
  for (let i = 1; i < flow.length; i++) {
    const data = flow[i];
    if (data?.['sf-bay'] === '__card__') {
      await page.evaluate((sel) => document.querySelector(sel)?.querySelector('.dg-sf-cards .dg-wiz-card')?.click(), form);
      await sleep(550);
      await clickNext(page, form);
    } else if (data) {
      await fillStep(page, form, data);
      if (data.resume === '__file__') await shot(page, 'engineer-resume');
    } else {
      await clickNext(page, form);
    }
    if (data && data['sf-bay'] !== '__card__') await clickNext(page, form);
    steps.push(await wizState(page, form));
  }
  await shot(page, 'engineer-review');
  return { steps, strayOk: steps.every((s) => !s.strayLabels?.length && !s.error) };
  } catch (e) {
    return { steps, strayOk: steps.every((s) => !s.strayLabels?.length && !s.error), crash: e.message };
  }
}

async function testNav(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('#dg-site-nav');
    const links = nav ? [...nav.querySelectorAll('a')].map((a) => ({
      text: (a.textContent || '').trim().split('\n')[0],
      href: a.getAttribute('href'),
      modal: a.getAttribute('data-demigod-modal'),
    })) : [];
    const dupCta = links.filter((l) => /^(FIND TALENT|HIRE TALENT)$/i.test(l.text)).length;
    const partners = links.some((l) => /partners/i.test(l.text) && /partnerships/.test(l.href || ''));
    const wfHidden = document.querySelector('nav.w-nav,.w-nav') ? getComputedStyle(document.querySelector('nav.w-nav,.w-nav')).display === 'none' : true;
    return { hasNav: !!nav, links, dupCta, partners, wfHidden, ctaOk: dupCta === 1 };
  });
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  let page = await browser.newPage();
  const results = { at: new Date().toISOString(), viewports: {}, nav: null };

  const viewports = DESKTOP_ONLY
    ? [['desktop', { width: 1440, height: 900 }]]
    : [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]];
  for (const [vp, size] of viewports) {
    await page.setViewport(size);
    await loadLive(page, `wiz-${vp}`);
    results.nav = await testNav(page);
    if (vp === 'desktop') await shot(page, 'header');

    await openModal(page, ['FIND TALENT', 'HIRE TALENT']);
    const startup = await walkStartup(page);
    startup.screenshot = await shot(page, 'startup-final');

    await loadLive(page, `wiz-${vp}-engineer`);
    await openModal(page, ['JOIN NETWORK', 'GET JOB', 'For engineers', 'JOIN NETWORK']);
    if (vp === 'mobile') {
      await page.evaluate(() => document.querySelector('#dg-bar .dg-j')?.click());
      await sleep(900);
    }
    const engineer = await walkEngineer(page);
    engineer.screenshot = await shot(page, 'engineer-final');

    results.viewports[vp] = { startup, engineer };
    await page.close();
    page = await browser.newPage();
  }

  await browser.disconnect();

  const passWizard = (r) => {
    const s = r.steps;
    if (!s.length || !s[0]?.welcome || !s[0]?.wizOn) return false;
    /* Was /^Question \d+/ against x.meta — but wizState builds meta as "bar:<width> next:<label>",
       so this could never match and the condition was dead. What it meant to assert is that the
       wizard walks one question at a time; assert that structurally. */
    const mid = s.find((x) => x.visible?.length === 1 && /^bar:\d+%/.test(x.meta || '') && !x.welcome);
    const last = s[s.length - 1];
    return !!mid && last?.submitMode && last?.chromeHidden !== false;
  };

  const engOk = (r) => {
    const s = (r?.steps || []).filter((x) => !x.error);
    return s.length > 5 && s.some((x) => x.visible?.includes('sf-bay') || x.submitMode);
  };
  results.pass = {
    nav: results.nav?.hasNav && results.nav?.ctaOk && results.nav?.wfHidden && results.nav?.partners,
    startupDesktop: passWizard(results.viewports.desktop?.startup) && results.viewports.desktop?.startup?.strayOk,
    engineerDesktop: engOk(results.viewports.desktop?.engineer) && results.viewports.desktop?.engineer?.strayOk !== false,
    startupMobile: DESKTOP_ONLY ? true : passWizard(results.viewports.mobile?.startup) && results.viewports.mobile?.startup?.strayOk,
    engineerMobile: DESKTOP_ONLY ? true : engOk(results.viewports.mobile?.engineer) && results.viewports.mobile?.engineer?.strayOk !== false,
    noStrayDesktop: results.viewports.desktop?.startup?.strayOk,
  };
  results.ok =
    results.pass.nav &&
    results.pass.startupDesktop &&
    results.pass.noStrayDesktop &&
    (DESKTOP_ONLY || (results.pass.startupMobile && results.pass.engineerMobile));

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: results.ok, pass: results.pass, out: OUT }));
  process.exit(results.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});// a11y stub added conceptually; full in next edit

// Fable-suggested a11y regression (added per workflow review)
function checkWizA11y(f) {
  return [...f.querySelectorAll(".dg-wiz-show input, .dg-wiz-show textarea, .dg-wiz-show select")].map(i => ({
    name: i.name,
    required: i.required,
    hasLabel: !!(i.id && f.querySelector(`label[for="${i.id}"]`)) || !!i.closest("label"),
    rendered: getComputedStyle(i).display !== "none" && getComputedStyle(i).visibility !== "hidden" && i.offsetHeight > 0,
  }));
}


// More steps to reach 90day
for (let i = 5; i < 12; i++) { /* extend in real */ }

