#!/usr/bin/env node
/** Focused static drift fix: METHODOLOGY, TalentLink, email-form, FIND TALENT nav. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-DRIFT-FIX.json');

const CLEAN_META = 'Demigod matches SF startups with curated talent. Human-reviewed profiles. 10% fee on hire only. hello@trydemigod.com';
const CLEAN_OG = 'SF startups submit a brief. Candidates upload once. Humans match. 10% on hire.';
const CLEAN_HERO = 'SF Bay Area startups submit a role brief. Candidates upload a profile once. Humans review every match.';

async function driftMetrics() {
  const { html } = await fetchLiveHtml();
  return {
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
    talentLink: (html.match(/TalentLink/gi) || []).length,
    methodology: (html.match(/METHODOLOGY/gi) || []).length,
    findTalent: (html.match(/FIND TALENT/gi) || []).length,
    speedLeaks: (html.match(/48\s*h(?:ours?)?|within\s*(?:48|24)|3-5[^<]{0,40}48|Humans Match Within|Meet Your \d/gi) || []).length,
    nameLeaks: (html.match(/John\s+Doe/gi) || []).length,
    badMeta: (/3-5.*48\s*h|48\s*hours.*10% fee/i.test(html) ? 1 : 0),
  };
}

async function patchCanvas(page) {
  await page.setViewport({ width: 1440, height: 900 });
  await sleep(600);
  return page.evaluate(({ hero }) => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        const text = d?.body?.innerText || '';
        if (d && iframe.clientWidth >= 400 && /48|John Doe|HIRE TALENT|hero|Humans Match/i.test(text)) {
          doc = d;
          break;
        }
      } catch (_) { /* ignore */ }
    }
    if (!doc) {
      for (const iframe of document.querySelectorAll('iframe')) {
        try {
          const d = iframe.contentDocument;
          if (d && iframe.clientWidth >= 500) { doc = d; break; }
        } catch (_) { /* ignore */ }
      }
    }
    if (!doc) return { ok: false, reason: 'no canvas iframe' };

    const changes = [];
    const removeIf = (re, label) => {
      for (const el of [...doc.querySelectorAll('section,div,article,main > div')]) {
        const t = (el.textContent || '').trim();
        if (!re.test(t) || t.length < 30 || t.length > 15000) continue;
        if (el.closest('#startup-modal,#jobseeker-modal')) continue;
        if (/PRICING/i.test(t) && /10%|on hire/i.test(t)) continue;
        el.remove();
        changes.push(`del:${label}`);
      }
    };

    removeIf(/THE METHODOLOGY|METHODOLOGY\s*0?1/i, 'methodology');
    removeIf(/CURATED INSIGHTS|HIRING MADE SIMPLE|FREQUENTLY ASKED/i, 'bloat');
    removeIf(/GET IN TOUCH|415-555|101 Web Lane/i, 'fake-contact');
    removeIf(/HUMANS MATCH WITHIN 48|3-5 MATCHES IN 48|3-5 CURATED SF/i, 'speed-block');

    const rmFormBlock = (form, label) => {
      const wrap = form.closest('.w-form') || form.parentElement;
      if (wrap) {
        const sib = wrap.parentElement;
        wrap.remove();
        if (sib) {
          for (const el of [...sib.querySelectorAll('.w-form-done,.w-form-fail')]) {
            if (/email-form|test-form/i.test(el.getAttribute('aria-label') || '')) {
              el.remove();
              changes.push(`rm-done:${label}`);
            }
          }
        }
      } else form.remove();
      changes.push(`rm-form:${label}`);
    };

    for (const f of [...doc.querySelectorAll('form')]) {
      const n = (f.getAttribute('data-name') || f.name || f.id || '').toLowerCase();
      const mailto = /^mailto:/i.test(f.getAttribute('action') || '');
      const inModal = !!f.closest('#startup-modal,#jobseeker-modal');
      if (!inModal && (n === 'email-form' || n === 'test-form')) {
        rmFormBlock(f, n);
        continue;
      }
      if (inModal && f.closest('#startup-modal') && (n === 'email-form' || n === 'startup-form' || mailto || f.id === 'startup-form')) {
        const keeper = doc.querySelector('#startup-hire form,[data-name="startup-hire"]');
        if (keeper && keeper !== f) rmFormBlock(f, 'dup-email-form');
      }
    }

    for (const form of [...doc.querySelectorAll('#startup-modal form,[data-name="startup-hire"],#startup-hire form')]) {
      if ((form.getAttribute('data-name') || '').toLowerCase() === 'email-form') continue;
      form.id = 'startup-hire';
      form.setAttribute('data-name', 'startup-hire');
      form.setAttribute('name', 'startup-hire');
      form.removeAttribute('action');
      const wrap = form.closest('.w-form') || form.parentElement;
      if (wrap && wrap.id !== 'startup-hire') wrap.id = 'startup-hire';
      changes.push('rename:startup-hire');
    }
    for (const form of [...doc.querySelectorAll('#jobseeker-modal form, #jobseeker-form')]) {
      form.id = 'engineer-join';
      form.setAttribute('data-name', 'engineer-join');
      form.setAttribute('name', 'engineer-join');
      changes.push('rename:engineer-join');
    }

    for (const a of [...doc.querySelectorAll('nav a,.w-nav a,header a,a.button.on-inverse,header button')]) {
      const lbl = a.querySelector('.button_label,.btn-label') || a;
      const t = (lbl.textContent || '').trim();
      const inNav = a.closest('nav,.w-nav,.nav_container,header,.w-nav-bar');
      if (inNav && !a.closest('.hero-section,.header') && /^(POST A JOB|HIRE TALENT|GET STARTED)$/i.test(t)) {
        lbl.textContent = 'FIND TALENT';
        a.setAttribute('href', '#startup-modal');
        changes.push('nav:find-talent');
      }
      if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT)$/i.test((a.textContent || '').trim())) {
        (a.closest('li,.w-dropdown,div') || a).remove();
        changes.push('nav-rm');
      }
    }

    for (const inp of [...doc.querySelectorAll('input[placeholder],textarea[placeholder]')]) {
      if (/john\s+doe/i.test(inp.getAttribute('placeholder') || '')) {
        inp.setAttribute('placeholder', 'Your full name');
        changes.push('ph:full-name');
      }
    }

    for (const el of [...doc.querySelectorAll('.step-card,[class*="step-card"],.step-title,.step-desc,.hero-description,p,h2,h3')]) {
      const t = (el.textContent || '').trim();
      if (!t || t.length > 400) continue;
      if (/Humans Match Within|MEET YOUR|Meet Your 3-5/i.test(t)) {
        el.style.setProperty('display', 'none', 'important');
        changes.push('hide:speed-step');
      }
    }

    if (!doc.body) return { ok: changes.length > 0, changes: [...new Set(changes)], reason: 'no body' };
    const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode())) {
      let v = node.nodeValue || '';
      if (!v.trim()) continue;
      if (/TalentLink/i.test(v)) {
        node.nodeValue = v.replace(/TalentLink\s*SF?/gi, 'Demigod').replace(/TalentLink/gi, 'Demigod');
        changes.push('brand:TalentLink');
      }
      if (/©\s*2025/i.test(v)) {
        node.nodeValue = '© 2026 Demigod. All rights reserved.';
        changes.push('year:2026');
      }
      if (/John\s+Doe/i.test(v)) {
        node.nodeValue = v.replace(/John\s+Doe/gi, 'Your full name');
        changes.push('scrub:john-doe');
      }
      if (/within\s*24\s*h|get back to you within/i.test(v)) {
        node.nodeValue = v.replace(/within\s*24\s*hours?/gi, 'when there is a fit').replace(/get back to you within[^.]*/gi, 'will follow up');
        changes.push('scrub:24h-done');
      }
      if (/Meet Your/i.test(v)) {
        node.nodeValue = 'Humans intro fitting matches';
        changes.push('scrub:meet-your');
      }
      if (/48\s*h(?:ours?)?|3-5[^.]{0,50}48|Humans send you 3-5|perfect SF.*48|Get 3-5/i.test(v)) {
        const rep = node.parentElement?.closest('#jobseeker-modal')
          ? 'LinkedIn and resume once. Humans reach out when a role fits.'
          : CLEAN_HERO;
        node.nodeValue = rep;
        changes.push('scrub:speed');
      }
      if (/Human-matched SF startup talent.*48/i.test(v)) {
        node.nodeValue = 'Human-matched SF startup talent · Startups hire · Candidates join free';
        changes.push('scrub:footer-speed');
      }
    }

    return { ok: changes.length > 0, changes: [...new Set(changes)] };
  }, { hero: CLEAN_HERO });
}

async function patchPageSeo(page) {
  await page.click('[data-automation-id="top-bar-page-name"]').catch(() => {});
  await sleep(1200);
  const filled = await page.evaluate(({ meta, og }) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const setVal = (inp, val) => {
      if (!inp) return false;
      if (setter) setter.call(inp, val); else inp.value = val;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const hits = [];
    const inputs = [...document.querySelectorAll('input,textarea')].filter((i) => i.offsetParent !== null);
    for (const inp of inputs) {
      const hint = ((inp.placeholder || '') + (inp.getAttribute('aria-label') || '') + (inp.name || '') + (inp.id || '') + (inp.closest('label')?.textContent || '')).toLowerCase();
      if (/meta description|description/i.test(hint) && !/open graph|og /i.test(hint)) {
        if (setVal(inp, meta)) hits.push('meta-description');
      }
      if (/open graph description|og description|twitter description/i.test(hint)) {
        if (setVal(inp, og)) hits.push('og-description');
      }
    }
    return { hits, inputs: inputs.length };
  }, { meta: CLEAN_META, og: CLEAN_OG });
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);
  return filled;
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
  wlog('=== DRIFT FIX PASS START ===');
  const result = { at: new Date().toISOString(), before: await driftMetrics() };

  const browser = await connectBrowser();
  const homeUrl = `${WEBFLOW_DESIGNER_URL}${WEBFLOW_DESIGNER_URL.includes('?') ? '&' : '?'}pageId=6a34c484dcedc18a174081b8`;
  const { page } = await prepareWebflowDesigner(browser, { url: homeUrl });
  await sleep(1200);

  const patch = await patchCanvas(page);
  result.patch = patch;
  wlog(`patch: ${JSON.stringify(patch)}`);

  result.seo = await patchPageSeo(page);
  wlog(`seo: ${JSON.stringify(result.seo)}`);

  if (patch.ok || result.seo?.hits?.length) {
    await savePublish(page);
    result.published = true;
    await sleep(10000);
    const patch2 = await patchCanvas(page);
    if (patch2.ok) {
      await savePublish(page);
      result.secondPass = patch2.changes;
      await sleep(10000);
    }
  }

  await browser.disconnect();
  try {
    result.after = await driftMetrics();
  } catch (e) {
    result.afterError = String(e.message || e);
    result.after = result.before;
  }
  result.pass = result.after.emailForm === 0 && result.after.talentLink === 0
    && result.after.methodology === 0 && result.after.startupHire >= 1
    && result.after.speedLeaks === 0 && result.after.nameLeaks === 0 && result.after.badMeta === 0;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, before: result.before, after: result.after, out: OUT }));
  wlog('=== DRIFT FIX PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });