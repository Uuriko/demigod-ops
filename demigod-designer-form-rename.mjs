#!/usr/bin/env node
/** Rename modal forms in Webflow Designer Settings panel + publish. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, wlog, prepareWebflowDesigner, WEBFLOW_DESIGNER_URL } from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-DESIGNER-FORM-RENAME.json');

async function dismissOverlays(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].forEach((b) => {
      const t = (b.textContent || '').trim();
      const a = b.getAttribute('aria-label') || '';
      if (/^dismiss$/i.test(t) || /close.*assistant|dismiss/i.test(a)) b.click();
    });
  });
}

async function openNavigator(page) {
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.keyboard.press('z');
  await sleep(800);
}

async function clickNavigatorNode(page, pattern) {
  return page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const nodes = [...document.querySelectorAll('[class*="Navigator"] *, [data-automation-id*="navigator"] *, aside *, [role="tree"] *, [role="treeitem"] *')];
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (!t || t.length > 80) continue;
      if (!re.test(t)) continue;
      const hit = el.closest('[role="treeitem"], [class*="Node"], li, button, div');
      if (hit) { hit.click(); return { ok: true, text: t }; }
      el.click();
      return { ok: true, text: t };
    }
    const all = [...document.querySelectorAll('div,span,button')].filter((el) => {
      const t = (el.textContent || '').trim();
      return t && t.length < 60 && re.test(t) && el.children.length === 0;
    });
    if (all[0]) { all[0].click(); return { ok: true, text: (all[0].textContent || '').trim() }; }
    return { ok: false };
  }, pattern.source);
}

async function activateSettingsTab(page) {
  return page.evaluate(() => {
    const tabs = [...document.querySelectorAll('button, [role="tab"], div, span')].filter((el) => {
      const t = (el.textContent || '').trim();
      return t === 'Settings';
    });
    const tab = tabs.find((el) => el.offsetParent !== null) || tabs[0];
    if (tab) { tab.click(); return { ok: true }; }
    return { ok: false };
  });
}

async function setFormName(page, name) {
  await activateSettingsTab(page);
  await sleep(500);
  return page.evaluate((formName) => {
    const inputs = [...document.querySelectorAll('input[type="text"], input:not([type])')];
    const nameInput = inputs.find((inp) => {
      const ph = inp.getAttribute('placeholder') || '';
      const label = inp.closest('div')?.innerText || '';
      return /contact form|form name/i.test(ph) || (label.includes('Name') && /form/i.test(label));
    });
    if (!nameInput) return { ok: false, reason: 'no form name input' };
    nameInput.focus();
    nameInput.select?.();
    nameInput.value = formName;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: nameInput.value };
  }, name);
}

async function publish(page) {
  assertNotFrozen('designer-form-rename');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1200);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click());
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /publish to selected|publish site/i.test(b.textContent || ''))?.click();
  });
  await sleep(18000);
}

async function selectCanvasForm(page, selector) {
  return page.evaluate((sel) => {
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const doc = iframe.contentDocument;
        if (!doc || iframe.clientWidth < 500) continue;
        const form = doc.querySelector(sel);
        if (!form) continue;
        form.scrollIntoView({ block: 'center' });
        const r = form.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        form.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
        form.click();
        return { ok: true, sel, text: (form.getAttribute('data-name') || form.name || '').slice(0, 40) };
      } catch (_) { /* ignore */ }
    }
    return { ok: false, reason: 'canvas form miss', sel };
  }, selector);
}

async function renameForm(page, navPattern, formName, canvasSel) {
  let nav = await selectCanvasForm(page, canvasSel);
  if (!nav.ok) {
    await openNavigator(page);
    nav = await clickNavigatorNode(page, navPattern);
  }
  await sleep(1200);
  if (!nav.ok) return { formName, nav, rename: { ok: false, reason: 'select miss' } };
  const rename = await setFormName(page, formName);
  await sleep(500);
  return { formName, nav, rename };
}

async function audit() {
  const { html } = await fetchLiveHtml(true);
  return {
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
    findTalent: (html.match(/FIND TALENT/gi) || []).length,
    talentLink: /TalentLink/i.test(html),
  };
}

async function main() {
  wlog('=== DESIGNER FORM RENAME START ===');
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  await dismissOverlays(page);
  const before = await audit();
  const steps = [];
  steps.push(await renameForm(page, /startup-modal|startup-form|startup-hire/i, 'startup-hire', '#startup-modal form, #startup-form, #startup-hire'));
  steps.push(await renameForm(page, /jobseeker-modal|jobseeker-form|engineer-join/i, 'engineer-join', '#jobseeker-modal form, #jobseeker-form, #engineer-join'));
  await openNavigator(page);
  const orphanNav = await clickNavigatorNode(page, /^Email Form$/);
  if (orphanNav.ok) {
    await page.keyboard.press('Delete');
    await sleep(400);
    steps.push({ orphan: 'Email Form', deleted: true });
  } else steps.push({ orphan: 'Email Form', deleted: false, nav: orphanNav });
  await publish(page);
  await browser.disconnect();
  await sleep(8000);
  const after = await audit();
  const out = { at: new Date().toISOString(), before, steps, after };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== DESIGNER FORM RENAME END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });
