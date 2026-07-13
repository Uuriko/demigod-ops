#!/usr/bin/env node
/** Audit Demigod Webflow designer/preview via CDP — extract issues for Heavy + apply loop. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { loadDemigodState, saveDemigodState } from './demigod-turn-lib.mjs';

const SHOTS = '/home/potter/audit-shots/webflow';
const OUT_MD = '/home/potter/HEAVY-DEMIGOD-AUDIT.md';
const OUT_JSON = '/home/potter/HEAVY-DEMIGOD-AUDIT.json';

fs.mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
const pages = await browser.pages();
const designer = pages.find((p) => p.url().includes('talentlink-sf.design.webflow.com'));
if (!designer) throw new Error('open Webflow Demigod designer in CDP Chrome first');

await designer.bringToFront();
await designer.setViewport({ width: 1440, height: 900 });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const shotPath = path.join(SHOTS, `audit-${stamp}.png`);
await designer.screenshot({ path: shotPath, fullPage: false });

const data = await designer.evaluate(() => {
  const iframes = [...document.querySelectorAll('iframe')].filter((f) => {
    try { return f.contentDocument?.body?.innerText?.includes('FORGE'); } catch (_) { return false; }
  });
  const main = iframes.find((f) => !f.src?.includes('empty.html')) || iframes[0];
  const doc = main?.contentDocument;
  const text = doc?.body?.innerText || '';
  const html = doc?.body?.innerHTML || '';
  const allText = iframes.map((f) => {
    try { return f.contentDocument?.body?.innerText || ''; } catch (_) { return ''; }
  }).join('\n');
  const allHtml = iframes.map((f) => {
    try { return f.contentDocument?.body?.innerHTML || ''; } catch (_) { return ''; }
  }).join('\n');

  const forms = [...(doc?.querySelectorAll('form') || [])].map((f) => ({
    name: f.getAttribute('name') || f.id || 'form',
    fields: [...f.querySelectorAll('input,textarea,select')].map((el) => el.getAttribute('placeholder') || el.name || el.type).filter(Boolean),
  }));

  return {
    url: location.href,
    textLen: text.length,
    textSample: text.slice(0, 6000),
    issues: {
      postJob: /POST A JOB/i.test(text),
      hireTalent: /HIRE TALENT/i.test(text),
      talentLink: /TalentLink/i.test(text),
      helloEmail: /hello@trydemigod/i.test(text),
      oldEmail: /contact@talentlinksf/i.test(text),
      footer2026: /2026 Demigod/i.test(text),
      footer2025: /2025 TalentLink/i.test(text),
      summonModal: /#startup-modal/i.test(allHtml) || /startup-hire|startup-form/i.test(allHtml),
      joinModal: /#jobseeker-modal/i.test(allHtml) || /engineer-join|jobseeker-form/i.test(allHtml),
      pantheonCount: (text.match(/THE PANTHEON OF AGENTS/g) || []).length,
      findTalent: (text.match(/FIND TALENT/g) || []).length,
      getJob: (text.match(/GET JOB/g) || []).length,
      startupAnchor: /#startup-modal/i.test(html),
      jobseekerAnchor: /#jobseeker-modal/i.test(html),
      genericEmailForm: /BUSINESS EMAIL/i.test(text),
    },
    forms,
    aiBusy: !!document.querySelector('button')?.textContent?.includes('Stop response'),
  };
});

const issues = [];
if (data.issues.postJob) issues.push('Nav still says POST A JOB — should be HIRE TALENT → #startup-modal');
if (data.issues.talentLink || data.issues.footer2025) issues.push('TalentLink SF branding remains in footer');
if (data.issues.oldEmail) issues.push('contact@talentlinksf.com not updated to hello@trydemigod.com');
if (!data.issues.hireTalent) issues.push('Missing HIRE TALENT nav CTA');
if (!data.issues.helloEmail) issues.push('Missing hello@trydemigod.com');
if (!data.issues.footer2026) issues.push('Footer not © 2026 Demigod');
if (data.issues.pantheonCount > 1) issues.push(`Duplicate Pantheon sections (${data.issues.pantheonCount}x)`);
if (data.issues.genericEmailForm) issues.push('Legacy single-field BUSINESS EMAIL form still on page');
if (!data.issues.summonModal || !data.issues.joinModal) issues.push('Missing dual application modals');
if (!data.issues.startupAnchor || !data.issues.jobseekerAnchor) issues.push('CTAs not wired to modal anchors');

const md = `# Demigod Webflow Audit

_Date: ${new Date().toISOString()}_
_Screenshot: ${shotPath}_

## Issues (${issues.length})

${issues.map((i, n) => `${n + 1}. ${i}`).join('\n') || '_No issues detected_'}

## Signals

\`\`\`json
${JSON.stringify(data.issues, null, 2)}
\`\`\`

## Forms on page

${data.forms.map((f) => `- **${f.name}**: ${f.fields.slice(0, 8).join(', ')}${f.fields.length > 8 ? '…' : ''}`).join('\n') || '_none_'}

## Page text sample

${data.textSample.slice(0, 3500)}
`;

fs.writeFileSync(OUT_MD, md);
const { issues: signals, ...rest } = data;
fs.writeFileSync(OUT_JSON, JSON.stringify({
  ...rest,
  signals,
  issues,
  shotPath,
  at: new Date().toISOString(),
}, null, 2));

const state = loadDemigodState();
state.lastAuditIssues = issues.length;
state.lastAudit = new Date().toISOString();
saveDemigodState(state);

console.log(JSON.stringify({ issues: issues.length, shotPath, aiBusy: data.aiBusy, lastAuditIssues: state.lastAuditIssues }));
await browser.disconnect();