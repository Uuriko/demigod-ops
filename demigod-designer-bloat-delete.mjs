#!/usr/bin/env node
/** Designer canvas: permanent DELETE of hidden bloat (not CSS hide). Publish when changes made. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  captureDemigodScreenshots,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-DESIGNER-BLOAT-DELETE.json');
const VERSION = 'v2';

const LEAK_KEYS = [
  'METHODOLOGY 01',
  'CURATED INSIGHTS',
  'HIRING MADE SIMPLE',
  'SYNDICATE SUBSCRIPTION',
  'THE PANTHEON',
  'ATHENA',
  'HEPHAESTUS',
  '415-555',
  '101 Web Lane',
  'tally-startup-embed',
  'email-form',
  'COMMISSION ONLY',
  'PRICING MODELS',
  'CHOOSE SUBSCRIPTION',
  'insights-section',
];

async function leakCheck() {
  const { html } = await fetchLiveHtml(`?v=bloat-${Date.now()}`);
  const found = LEAK_KEYS.filter((k) => {
    if (k === 'email-form') {
      return /data-name=["']email-form["']|name=["']email-form["']|id=["']email-form["']/i.test(html);
    }
    return html.toLowerCase().includes(k.toLowerCase());
  });
  return { found, clean: found.length === 0, htmlLen: html.length };
}

async function waitForHomeCanvas(page, { timeoutMs = 90000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const st = await page.evaluate(() => {
      let doc = null;
      for (const iframe of document.querySelectorAll('iframe')) {
        try {
          const d = iframe.contentDocument;
          const text = d?.body?.innerText || '';
          if (d && iframe.clientWidth >= 500 && text.length > 800) {
            if (/HIRE TALENT|SF AI|PRICING|startup-modal|Demigod/i.test(text)) {
              doc = d;
              break;
            }
          }
        } catch (_) { /* ignore */ }
      }
      if (!doc) {
        for (const iframe of document.querySelectorAll('iframe')) {
          try {
            const d = iframe.contentDocument;
            if (d && iframe.clientWidth >= 500 && (d.body?.innerHTML?.length || 0) > 3000) {
              doc = d;
              break;
            }
          } catch (_) { /* ignore */ }
        }
      }
      if (!doc) return { ready: false };
      return {
        ready: true,
        textLen: (doc.body?.innerText || '').length,
        forms: doc.querySelectorAll('form').length,
        sections: doc.querySelectorAll('section').length,
      };
    });
    if (st.ready) return st;
    await sleep(2000);
  }
  return { ready: false, reason: 'canvas timeout' };
}

async function patchCanvas(page) {
  return page.evaluate(() => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        const text = d?.body?.innerText || '';
        if (d && iframe.clientWidth >= 500 && /HIRE TALENT|SF AI|PRICING|startup-modal/i.test(text)) {
          doc = d;
          break;
        }
      } catch (_) { /* ignore */ }
    }
    if (!doc) {
      for (const iframe of document.querySelectorAll('iframe')) {
        try {
          const d = iframe.contentDocument;
          if (d && iframe.clientWidth >= 500 && (d.body?.innerHTML?.length || 0) > 3000) {
            doc = d;
            break;
          }
        } catch (_) { /* ignore */ }
      }
    }
    if (!doc) return { ok: false, reason: 'no canvas iframe' };

    const changes = [];
    const skip = (el) => el.closest('#startup-modal,#jobseeker-modal,#partner-modal,#demigod-trust-block,#demigod-pricing,#demigod-partners-teaser');

    const removeEl = (el, label) => {
      if (!el || skip(el)) return;
      el.remove();
      changes.push(label);
    };

    const removeIf = (re, label, opts = {}) => {
      const max = opts.maxLen || 14000;
      const min = opts.minLen || 30;
      for (const el of [...doc.querySelectorAll('section,main>div,article,div[class*="section"]')]) {
        if (skip(el)) continue;
        const t = (el.textContent || '').trim();
        if (t.length < min || t.length > max) continue;
        if (opts.idKeep && el.id && opts.idKeep.test(el.id)) continue;
        if (!re.test(t)) continue;
        removeEl(el, `del:${label}`);
      }
    };

    // Major bloat sections
    removeIf(/THE METHODOLOGY|METHODOLOGY\s*0?1/i, 'methodology');
    removeIf(/CURATED INSIGHTS/i, 'curated-insights');
    removeIf(/HIRING MADE SIMPLE|FREQUENTLY ASKED|FAQ accordion/i, 'faq-hiring');
    removeIf(/GET IN TOUCH|CONNECT WITH HIRING|Business Email|Subscribe to our newsletter/i, 'contact-newsletter');
    removeIf(/415-555|101 Web Lane/i, 'fake-address');
    removeIf(/HUMANS MATCH WITHIN 48H|MEET YOUR \d|LIVE SF STARTUP ROLES HIRING/i, '48h-roles');
    removeIf(/100% Vetted[\s\S]{0,80}Lightning Fast/i, 'vetting-cards');
    removeIf(/HUMAN-MATCHED STARTUP TALENT/i, 'dup-trust', { idKeep: /demigod-trust/ });
    removeIf(/THE PANTHEON|ATHENA[\s\S]{0,400}HEPHAESTUS|FORGE YOUR/i, 'pantheon-agents');
    removeIf(/SYNDICATE SUBSCRIPTION|\$5,?000|\$5K\s*\/\s*MO|CHOOSE SUBSCRIPTION|MOST POPULAR/i, 'subscription-card');
    removeIf(/PRICING MODELS|Choose the path that aligns|performance-driven|two path/i, 'old-pricing-copy', { maxLen: 800 });
    removeIf(/COMMISSION ONLY[\s\S]{0,120}20%|20%[\s\S]{0,80}OF FIRST YEAR SALARY/i, 'commission-card', { maxLen: 6000 });
    removeIf(/insights.updates|CURATED INSIGHTS|id="insights-section"/i, 'insights-cms', { maxLen: 12000 });
    removeIf(/statue|pantheon|methodology/i, 'decor-bloat', { maxLen: 15000 });

    // Pricing: delete subscription/commission card divs inside pricing section (keep 10% card)
    const pricingSec = doc.querySelector('#demigod-pricing') || [...doc.querySelectorAll('section,main>div')].find((el) =>
      /PRICING|10%|placement fee/i.test(el.textContent || '') && el.querySelector('a,button'),
    );
    if (pricingSec) {
      for (const el of [...pricingSec.querySelectorAll('div,article')]) {
        const t = (el.textContent || '').trim();
        if (t.length < 20 || t.length > 5000) continue;
        if (/SYNDICATE|SUBSCRIPTION|\$5K|CHOOSE SUBSCRIPTION|COMMISSION ONLY|20% OF FIRST YEAR/i.test(t)
          && !/10% on hire|10% placement|HIRE TALENT/i.test(t.slice(0, 200))) {
          removeEl(el, 'del:pricing-subcard');
        }
      }
      for (const btn of [...pricingSec.querySelectorAll('a,button')]) {
        const t = (btn.textContent || '').trim();
        if (/^CHOOSE SUBSCRIPTION$/i.test(t)) {
          removeEl(btn.closest('div,section') || btn, 'del:choose-sub-btn');
        }
      }
    }

    // Legacy native nav (foot-core injects #dg-site-nav)
    for (const nav of [...doc.querySelectorAll('nav.w-nav,.w-nav,.nav_container')]) {
      if (nav.id === 'dg-site-nav') continue;
      removeEl(nav, 'del:legacy-nav');
    }

    // Statue / hero decor hidden in CSS — delete from canvas
    for (const el of [...doc.querySelectorAll('.statue-frame,.statue-svg,.statue-wrapper,.statue-coordinates,.hero-content-right,[class*="pantheon"]')]) {
      removeEl(el.closest('div,section') || el, 'del:statue-decor');
    }

    // CMS / insights blocks
    for (const id of ['insights-section', 'demigod-cms-block', 'tally-startup-embed', 'tally-engineer-embed']) {
      const el = doc.getElementById(id);
      if (el) removeEl(el.closest('section,div') || el, `del:${id}`);
    }

    // Tally + orphan forms
    for (const el of [...doc.querySelectorAll('#tally-startup-embed,#tally-engineer-embed,iframe[data-tally-embed]')]) {
      removeEl(el.closest('div,section') || el, 'del:tally');
    }
    for (const f of [...doc.querySelectorAll('form')]) {
      const n = (f.getAttribute('data-name') || f.name || f.id || '').toLowerCase();
      if (f.closest('#startup-modal,#jobseeker-modal,#partner-modal')) continue;
      if (n === 'email-form' || n === 'test-form' || f.id === 'email-form') {
        removeEl(f.closest('section,.w-form-wrap,div') || f, 'del:orphan-form');
      }
    }

    // Nav clutter (native w-nav — foot-core hides; delete from canvas)
    for (const a of [...doc.querySelectorAll('nav a,.w-nav a,.w-dropdown-link')]) {
      const t = (a.textContent || '').trim().split('\n')[0];
      if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT|RESOURCES|COMPANY)$/i.test(t)) {
        removeEl(a.closest('li,.w-dropdown,.w-nav-menu>div,div') || a, `nav-rm:${t}`);
      }
    }

    // Footer mega columns
    for (const nav of [...doc.querySelectorAll('footer nav,footer ul,footer [class*="column"]')]) {
      const t = (nav.textContent || '').trim();
      if (/Company|Services|Resources|ABOUT|TEAM|CAREERS|Facebook|Instagram/i.test(t) && t.length < 4000) {
        if (!/hello@trydemigod|Privacy|Terms/i.test(t)) removeEl(nav, 'footer-col');
      }
    }

    // Ghost modal copy blocks
    for (const el of [...doc.querySelectorAll('#startup-modal div,#jobseeker-modal div,p,span')]) {
      if (el.closest('form,.w-form-done')) continue;
      if (el.querySelector('input,textarea,select,button')) continue;
      const t = (el.textContent || '').trim();
      if (t.length > 10 && t.length < 280 && /Oops|Hermes received|Welcome to the pantheon|CALL HAS BEEN HEARD/i.test(t)) {
        removeEl(el, 'ghost-modal');
      }
    }

    // Stale Webflow success/fail aria-labels
    for (const el of [...doc.querySelectorAll('.w-form-done,.w-form-fail')]) {
      const label = el.getAttribute('aria-label') || '';
      if (/email-form|test-form/i.test(label)) {
        el.setAttribute('aria-label', label.replace(/email-form|test-form/gi, 'form'));
        changes.push('aria-label:fix');
      }
    }

    // Hidden fields in modals (Designer orphans)
    for (const name of ['team-size', 'urgency', 'hiring-model', 'availability', 'Source']) {
      for (const inp of [...doc.querySelectorAll(`[name="${name}"],#${name}`)]) {
        if (!inp.closest('#startup-modal,#jobseeker-modal')) continue;
        removeEl(inp.closest('.w-input,.w-select,.w-radio,fieldset,.form-field-group') || inp, `field-rm:${name}`);
      }
    }

    return { ok: changes.length > 0, changes: [...new Set(changes)], count: changes.length };
  });
}

async function savePublish(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1200);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) =>
      /publish to selected|publish site|publish now/i.test(b.textContent || ''),
    )?.click();
  });
  await sleep(14000);
}

async function main() {
  wlog('=== DESIGNER BLOAT DELETE START ===');
  const report = { at: new Date().toISOString(), version: VERSION, before: null, patch: null, after: null, published: false };

  report.before = await leakCheck();

  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });

  // Always open Home canvas (Designer tab may be on /partnerships or another page).
  if (!page.url().includes('6a34c484dcedc18a174081b8')) {
    await page.goto(WEBFLOW_DESIGNER_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
  await sleep(3000);

  const canvasReady = await waitForHomeCanvas(page);
  report.canvasReady = canvasReady;
  if (!canvasReady.ready) {
    wlog(`warn: home canvas not ready — ${canvasReady.reason || 'empty'}`);
  }

  report.patch = await patchCanvas(page);
  wlog(`canvas patch: ${JSON.stringify(report.patch)}`);

  if (report.patch.ok) {
    await savePublish(page);
    report.published = true;
    await sleep(8000);
    report.after = await leakCheck();
    await captureDemigodScreenshots('bloat-delete');
  }

  await browser.disconnect();

  const canvasClean = report.patch?.ok || (report.canvasReady?.ready && !report.patch?.reason);
  report.ok = canvasClean && (report.after?.clean ?? report.before?.clean ?? true);
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: report.ok,
    version: VERSION,
    published: report.published,
    canvasReady: report.canvasReady,
    changes: report.patch?.changes,
    reason: report.patch?.reason,
    before: report.before?.found,
    after: report.after?.found,
    out: OUT,
  }));
  wlog('=== DESIGNER BLOAT DELETE END ===');
  process.exit(canvasClean ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});