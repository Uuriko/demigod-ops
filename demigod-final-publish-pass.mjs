#!/usr/bin/env node
/** Canvas patch + reliable publish + live drift check. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT, wlog, sleep, prepareWebflowDesigner, WEBFLOW_DESIGNER_URL } from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-FINAL-PUBLISH.json');

function metrics(html) {
  return {
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
    findTalent: (html.match(/FIND TALENT/gi) || []).length,
    solutions: (html.match(/<div>Solutions<\/div>/gi) || []).length,
    footerCols: /heading_xxsmall[^>]*>Company</i.test(html) ? 1 : 0,
    mailto: (html.match(/action=["']mailto:/gi) || []).length,
  };
}

async function patchCanvas(page) {
  return page.evaluate(() => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        if (d && iframe.clientWidth >= 500) { doc = d; break; }
      } catch (_) { /* ignore */ }
    }
    if (!doc) return { ok: false, reason: 'no canvas' };
    const changes = [];

    for (const el of [...doc.querySelectorAll('section,div,article')]) {
      const t = (el.textContent || '').trim();
      if (t.length < 40 || t.length > 15000) continue;
      if (el.closest('#startup-modal,#jobseeker-modal')) continue;
      if (/THE METHODOLOGY|METHODOLOGY\s*0?1|CURATED INSIGHTS/i.test(t)) {
        el.remove();
        changes.push('del:bloat');
      }
    }

    for (const dd of [...doc.querySelectorAll('.nav_dropdown-menu,.w-dropdown,.mega-nav_dropdown-list')]) {
      dd.remove();
      changes.push('rm:nav-dropdown');
    }
    for (const a of [...doc.querySelectorAll('nav a,.w-nav a,.nav_link')]) {
      const t = (a.textContent || '').trim();
      if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT)$/i.test(t)) {
        (a.closest('li,.w-dropdown,div') || a).remove();
        changes.push(`rm-nav:${t}`);
      }
    }
    for (const a of [...doc.querySelectorAll('nav a,header a,a.button.on-inverse')]) {
      const lbl = a.querySelector('.button_label,.btn-label') || a;
      const t = (lbl.textContent || '').trim();
      if (a.closest('nav,.w-nav,.nav_container,header') && !a.closest('.hero-section') && /^(POST A JOB|HIRE TALENT|GET STARTED)$/i.test(t)) {
        lbl.textContent = 'FIND TALENT';
        a.setAttribute('href', '#startup-modal');
        changes.push('nav:find-talent');
      }
    }

    for (const col of [...doc.querySelectorAll('footer nav, footer ul, footer .w-col, footer section')]) {
      const t = col.textContent || '';
      if (t.length < 8 || t.length > 8000) continue;
      if (/Company|Services|Resources|Legal|Facebook|Instagram/i.test(t) && !/hello@trydemigod/i.test(t)) {
        col.remove();
        changes.push('rm-footer-col');
      }
    }
    for (const g of [...doc.querySelectorAll('footer .footer_icon-group, footer [class*="social"]')]) {
      g.remove();
      changes.push('rm-social');
    }

    for (const form of [...doc.querySelectorAll('#startup-modal form, form[name="startup-form"], #startup-form')]) {
      form.id = 'startup-hire';
      form.setAttribute('data-name', 'startup-hire');
      form.setAttribute('name', 'startup-hire');
      form.removeAttribute('action');
      form.setAttribute('method', 'post');
      const wrap = form.closest('.w-form') || form.parentElement;
      if (wrap) wrap.id = 'startup-hire';
      changes.push('form:startup-hire');
      const cn = form.querySelector('[name="company-name"]');
      if (cn) (cn.closest('.form-field-group,.w-input') || cn).remove();
      changes.push('rm:company-name');
    }

    return { ok: changes.length > 0, changes: [...new Set(changes)] };
  });
}

async function reliablePublish(page) {
  assertNotFrozen('final-publish-pass');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2000);

  const handle = await page.waitForFunction(() => {
    const pub = [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()));
    return pub || null;
  }, { timeout: 20000 });
  const pubEl = await handle.asElement();
  if (!pubEl) return { ok: false, step: 'no-publish-btn' };
  await pubEl.click();
  await sleep(4000);

  const selectDomains = await page.evaluate(() => {
    const changes = [];
    for (const row of [...document.querySelectorAll('[role="checkbox"],input[type="checkbox"],label')]) {
      const t = (row.textContent || row.getAttribute('aria-label') || '').trim();
      if (!/trydemigod|talentlink-sf|webflow\.io/i.test(t)) continue;
      const input = row.matches('input[type="checkbox"]') ? row : row.querySelector('input[type="checkbox"]');
      if (input && !input.checked) {
        input.click();
        changes.push(t.slice(0, 40));
      } else if (row.getAttribute('role') === 'checkbox' && row.getAttribute('aria-checked') !== 'true') {
        row.click();
        changes.push(t.slice(0, 40));
      }
    }
    for (const btn of [...document.querySelectorAll('button,div,span')]) {
      const t = (btn.textContent || '').trim();
      if (/^select all$/i.test(t) || /^publish all$/i.test(t)) {
        btn.click();
        changes.push('select-all');
        break;
      }
    }
    return { changes };
  });
  await sleep(2000);

  const confirm = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /publish to selected domains|publish site|publish now/i.test(b.textContent || ''));
    if (!btn) {
      return { ok: false, buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter((t) => /publish/i.test(t)).slice(0, 12) };
    }
    btn.click();
    return { ok: true, label: (btn.textContent || '').trim() };
  });

  let published = false;
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const status = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      return {
        publishedAgo: body.match(/Published (a few seconds ago|1 minute ago|\d+ minutes ago)/i)?.[0] || '',
        publishing: /publishing/i.test(body),
      };
    });
    if (status.publishedAgo && !status.publishing) { published = true; break; }
  }
  return { ok: published, confirm, selectDomains };
}

async function main() {
  wlog('=== FINAL PUBLISH PASS START ===');
  const before = await fetchLiveHtml();
  const result = { at: new Date().toISOString(), before: metrics(before.html) };

  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 300000 });
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Demigod')?.click();
  });
  await sleep(800);

  result.patch = await patchCanvas(page);
  wlog(`patch: ${JSON.stringify(result.patch)}`);

  if (result.patch.ok) {
    result.publish = await reliablePublish(page);
    wlog(`publish: ${JSON.stringify(result.publish)}`);
  }

  await browser.disconnect();
  await sleep(15000);

  const after = await fetchLiveHtml();
  result.after = metrics(after.html);
  result.pass = result.after.emailForm === 0 && result.after.findTalent >= 1 && result.after.footerCols === 0;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  wlog('=== FINAL PUBLISH PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
