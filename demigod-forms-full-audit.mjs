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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

async function auditForm(page, modalSel, openTexts, name) {
  await page.goto(`${LIVE_ORIGIN}/?v=forms-audit-${Date.now()}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2000);
  const opened = await page.evaluate((texts, sel) => {
    const btn = [...document.querySelectorAll('a,button')].find((el) =>
      texts.some((t) => new RegExp(`^${t}$`, 'i').test((el.textContent || '').trim().split('\n')[0])));
    btn?.click();
    const m = document.querySelector(sel);
    return { clicked: !!btn, modalVisible: !!(m && getComputedStyle(m).display !== 'none') };
  }, openTexts, modalSel);
  await sleep(1500);

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
      return t.length > 8 && t.length < 400 && /brief received|oops|form submitted|welcome|pantheon|hermes/i.test(t);
    }).map((el) => ({ text: (el.textContent || '').trim().slice(0, 120), display: getComputedStyle(el).display, visible: el.offsetParent !== null }));
    const submit = form?.querySelector('[type=submit],.w-button');
    const scrollH = form?.scrollHeight || 0;
    const clientH = form?.clientHeight || 0;
    return {
      formId: form?.id,
      formName: form?.getAttribute('data-name') || form?.name,
      fieldCount: fields.length,
      visibleFields: fields.filter((f) => f.visible).length,
      fields,
      submitText: (submit?.textContent || submit?.value || '').trim(),
      submitVisible: !!(submit && submit.offsetParent !== null),
      formScrollable: scrollH > clientH + 8,
      scrollH,
      clientH,
      ghosts,
      trustLines: [...modal.querySelectorAll('#dg-fee-note,#dg-privacy,#dg-submit-trust,p')].map((el) => (el.textContent || '').trim().slice(0, 100)),
      turnstile: !!modal.querySelector('[name=cf-turnstile-response],.cf-turnstile'),
    };
  }, modalSel);

  fs.mkdirSync(SHOTS, { recursive: true });
  const shotPath = path.join(SHOTS, `${name}-${stamp()}.png`);
  await page.screenshot({ path: shotPath, fullPage: false });

  return { ...opened, ...data, screenshot: shotPath };
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const startup = await auditForm(page, '#startup-modal', ['HIRE TALENT', 'FIND TALENT'], 'startup-desktop');
  const engineer = await auditForm(page, '#jobseeker-modal', ['GET JOB', 'JOIN NETWORK'], 'engineer-desktop');

  await page.setViewport({ width: 390, height: 844 });
  const startupMobile = await auditForm(page, '#startup-modal', ['HIRE TALENT', 'FIND TALENT'], 'startup-mobile');
  const engineerMobile = await auditForm(page, '#jobseeker-modal', ['GET JOB', 'JOIN NETWORK'], 'engineer-mobile');

  await browser.disconnect();

  const issues = [];
  for (const [side, audit] of [['startup', startup], ['engineer', engineer]]) {
    if (audit.ghosts?.length) issues.push({ severity: 'high', side, issue: 'ghost_messages_on_open', count: audit.ghosts.length });
    if (audit.formScrollable) issues.push({ severity: 'medium', side, issue: 'form_requires_scroll', scrollH: audit.scrollH });
    if (audit.visibleFields > 8) issues.push({ severity: 'medium', side, issue: 'too_many_visible_fields', count: audit.visibleFields });
    if (!audit.submitVisible) issues.push({ severity: 'high', side, issue: 'submit_not_visible' });
    if (/^submit$/i.test(audit.submitText)) issues.push({ severity: 'low', side, issue: 'generic_submit_label' });
  }

  const out = {
    at: new Date().toISOString(),
    url: LIVE_ORIGIN,
    startup,
    engineer,
    mobile: { startup: startupMobile, engineer: engineerMobile },
    issues,
    pass: issues.filter((i) => i.severity === 'high').length === 0,
    wizardRecommendation: 'Replace scroll-dump with stepped Typeform/Tally-like wizard in foot-core v42',
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, pass: out.pass, issues: issues.length, out: OUT }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });