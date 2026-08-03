#!/usr/bin/env node
/** Deep CDP audit of startup + engineer modals (fields, UX, ghosts). */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-FORMS-FULL-AUDIT.json');
const SHOTS = path.join(ROOT, 'audit-shots', 'forms-audit');
const USE_LOCAL = process.argv.includes('--local');
const CORE = USE_LOCAL ? fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8') : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
function bounded(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

async function resetModals(page) {
  await bounded(page.keyboard.press('Escape').catch(() => {}), 2000, 'modal_reset');
}

async function auditForm(page, modalSel, openTexts, name) {
  await page.goto(`${LIVE_ORIGIN}/?v=forms-audit-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);
  const opened = await page.evaluate((texts, sel) => {
    const btn = [...document.querySelectorAll('a,button')].find((el) =>
      texts.some((t) => new RegExp(`^${t}$`, 'i').test((el.textContent || '').trim().split('\n')[0])));
    btn?.click();
    const m = document.querySelector(sel);
    return { clicked: !!btn, modalVisible: !!(m && getComputedStyle(m).display !== 'none') };
  }, openTexts, modalSel);
  await sleep(800);
  await page.evaluate((sel) => {
    const form = document.querySelector(sel + ' form');
    if (form?.dataset.dgWizKey === 'welcome') form.querySelector('.dg-wiz-next')?.click();
  }, modalSel);
  await sleep(500);

  const data = await page.evaluate((sel) => {
    const modal = document.querySelector(sel);
    if (!modal) return { error: 'modal_missing' };
    const form = modal.querySelector('form');
    const fields = [...(form || modal).querySelectorAll('input,textarea,select')].map((el) => {
      const label = el.id ? modal.querySelector(`label[for="${el.id}"]`) : el.closest('label');
      const wrap = el.closest('.dg-field-wrap,.w-input,.w-select,.w-file-upload') || el.parentElement;
      const rect = wrap?.getBoundingClientRect?.() || el.getBoundingClientRect();
      return {
        name: el.name || el.id,
        type: el.type || el.tagName.toLowerCase(),
        accept: el.accept || '',
        required: el.required,
        placeholder: el.placeholder || '',
        label: (label?.textContent || '').trim().slice(0, 80),
        visible: rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none',
        value: el.type === 'file' ? '' : (el.value || '').slice(0, 40),
      };
    });
    const ghosts = [...modal.querySelectorAll('.w-form-done,.w-form-fail,.modal-success-message,p,div')].filter((el) => {
      if (el.closest('form')) return false;
      const t = (el.textContent || '').trim();
      return el.offsetParent !== null && t.length > 8 && t.length < 400 && /brief received|oops|form submitted|welcome|pantheon|hermes/i.test(t);
    }).map((el) => ({ text: (el.textContent || '').trim().slice(0, 120), display: getComputedStyle(el).display, visible: el.offsetParent !== null }));
    const submit = form?.querySelector('[type=submit],.w-button');
    const primary = form?.querySelector('.dg-wiz-next') || submit;
    const scrollH = form?.scrollHeight || 0;
    const clientH = form?.clientHeight || 0;
    const resumeFile = form?.querySelector('input[type=file][name=resume],input[type=file][name=Resume]');
    const resumeLink = form?.querySelector('[name=resume-url]');
    const uploadStates = [...(form || modal).querySelectorAll('.w-file-upload-uploading,.w-file-upload-success,.w-file-upload-error')];
    return {
      formId: form?.id,
      formName: form?.getAttribute('data-name') || form?.name,
      fieldCount: fields.length,
      visibleFields: fields.filter((f) => f.visible).length,
      fields,
      submitText: (primary?.textContent || primary?.value || '').trim(),
      submitVisible: !!(primary && primary.offsetParent !== null),
      formScrollable: scrollH > clientH + 8,
      scrollH,
      clientH,
      ghosts,
      trustLines: [...modal.querySelectorAll('#dg-fee-note,#dg-privacy,.dg-submit-trust,p')].map((el) => (el.textContent || '').trim().slice(0, 100)),
      turnstile: !!modal.querySelector('[name=cf-turnstile-response],.cf-turnstile'),
      resumeUpload: {
        mode: resumeFile ? 'native-file-or-link' : resumeLink ? 'link-only' : 'missing',
        accept: resumeFile?.accept || '',
        maxBytes: 10485760,
        requiredLink: !!resumeLink?.required,
        stateCount: uploadStates.length,
        accessibleStates: uploadStates.filter((el) => el.matches('[role=status],[role=alert],[aria-live]')).length,
      },
    };
  }, modalSel);

  fs.mkdirSync(SHOTS, { recursive: true });
  const shotPath = path.join(SHOTS, `${name}-${stamp()}.png`);
  await page.screenshot({ path: shotPath, fullPage: false });

  return { ...opened, ...data, screenshot: shotPath };
}

async function main() {
  let browser;
  let page;
  try {
    browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 30000 });
    page = await browser.newPage();
    if (USE_LOCAL) {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (/foot-latest\.js(?:[?#]|$)|demigod-foot/i.test(url) || (/catbox|jsdelivr/i.test(url) && /foot.*\.js(?:[?#]|$)/i.test(url))) {
          req.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
        } else req.continue().catch(() => {});
      });
    }
    const run = async (modal, texts, name) => {
      try { return await bounded(auditForm(page, modal, texts, name), 25000, name); }
      catch (e) { return { error: String(e.message || e), clicked: false, modalVisible: false }; }
      finally { await resetModals(page).catch(() => {}); }
    };
    await page.setViewport({ width: 1440, height: 900 });
    var startup = await run('#startup-modal', ['HIRE TALENT', 'FIND TALENT'], 'startup-desktop');
    var engineer = await run('#jobseeker-modal', ['JOIN THE TALENT NETWORK', 'FIND A JOB', 'GET JOB', 'JOIN NETWORK'], 'engineer-desktop');
    await page.setViewport({ width: 390, height: 844 });
    var startupMobile = await run('#startup-modal', ['HIRE TALENT', 'FIND TALENT'], 'startup-mobile');
    var engineerMobile = await run('#jobseeker-modal', ['JOIN THE TALENT NETWORK', 'FIND A JOB', 'GET JOB', 'JOIN NETWORK'], 'engineer-mobile');
  } finally {
    try { await page?.close(); } catch {}
    try { await browser?.disconnect(); } catch {}
  }

  const issues = [];
  for (const [side, audit] of [['startup', startup], ['engineer', engineer]]) {
    if (audit.ghosts?.length) issues.push({ severity: 'high', side, issue: 'ghost_messages_on_open', count: audit.ghosts.length });
    if (audit.formScrollable) issues.push({ severity: 'medium', side, issue: 'form_requires_scroll', scrollH: audit.scrollH });
    if (audit.visibleFields > 8) issues.push({ severity: 'medium', side, issue: 'too_many_visible_fields', count: audit.visibleFields });
    if (!audit.submitVisible) issues.push({ severity: 'high', side, issue: 'submit_not_visible' });
    if (/^submit$/i.test(audit.submitText)) issues.push({ severity: 'low', side, issue: 'generic_submit_label' });
  }
  if (engineer.resumeUpload?.mode !== 'native-file-or-link') {
    issues.push({
      severity: 'medium',
      side: 'engineer',
      issue: 'rich_resume_upload_unavailable',
      mode: engineer.resumeUpload?.mode || 'missing',
      prerequisite: 'Add a genuine Webflow Designer File Upload component with signed input and default/uploading/success/error states; do not inject a bare file input.',
    });
  }

  const out = {
    at: new Date().toISOString(),
    url: LIVE_ORIGIN,
    source: USE_LOCAL ? 'local-core' : 'live',
    startup,
    engineer,
    mobile: { startup: startupMobile, engineer: engineerMobile },
    issues,
    pass: issues.filter((i) => i.severity === 'high').length === 0,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, pass: out.pass, issues: issues.length, out: OUT }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
