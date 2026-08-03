#!/usr/bin/env node
/** Audit Demigod Webflow designer/preview via CDP — extract issues for Heavy + apply loop. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { loadDemigodState, saveDemigodState } from './demigod-turn-lib.mjs';

if (process.argv.length > 2) {
  console.error('usage: node demigod-webflow-audit.mjs');
  process.exit(2);
}

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
  // Canvas iframe selection: old audits looked for retired "FORGE" copy and then
  // reported every branding check as missing when the body text was empty.
  const scoreFrame = (f) => {
    try {
      const t = f.contentDocument?.body?.innerText || '';
      const h = f.contentDocument?.body?.innerHTML || '';
      let s = 0;
      if (/Demigod|startup|talent|HIRE|modal/i.test(t)) s += 3;
      if (/#startup-modal|#jobseeker-modal|startup-hire|engineer-join/i.test(h)) s += 4;
      if (/FORGE|PANTHEON/i.test(t)) s += 1; // legacy canvas strings still count
      if (t.length > 200) s += 1;
      if (f.src?.includes('empty.html')) s -= 5;
      return s;
    } catch {
      return -1;
    }
  };
  const iframes = [...document.querySelectorAll('iframe')];
  const ranked = iframes
    .map((f) => ({ f, s: scoreFrame(f) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const main = ranked[0]?.f || iframes.find((f) => !f.src?.includes('empty.html')) || iframes[0];
  const doc = main?.contentDocument;
  const text = doc?.body?.innerText || '';
  const html = doc?.body?.innerHTML || '';
  const allText = iframes.map((f) => {
    try { return f.contentDocument?.body?.innerText || ''; } catch (_) { return ''; }
  }).join('\n');
  const allHtml = iframes.map((f) => {
    try { return f.contentDocument?.body?.innerHTML || ''; } catch (_) { return ''; }
  }).join('\n');
  // Prefer canvas text; fall back to all frames (Designer chrome has little product copy).
  const scanText = text.length >= 80 ? text : allText;
  const scanHtml = html.length >= 80 ? html : allHtml;

  const forms = [...(doc?.querySelectorAll('form') || [])].map((f) => ({
    name: f.getAttribute('name') || f.id || 'form',
    fields: [...f.querySelectorAll('input,textarea,select')].map((el) => el.getAttribute('placeholder') || el.name || el.type).filter(Boolean),
  }));

  return {
    url: location.href,
    textLen: scanText.length,
    canvasTextLen: text.length,
    canvasScore: ranked[0]?.s ?? 0,
    textSample: scanText.slice(0, 6000),
    issues: {
      postJob: /POST A JOB/i.test(scanText),
      hireTalent: /HIRE TALENT/i.test(scanText),
      talentLink: /TalentLink/i.test(scanText),
      // Public contact SoR is potter@ (foot v495+); hello@ mailbox is not set up.
      potterEmail: /potter@trydemigod\.com/i.test(scanText),
      helloEmail: /hello@trydemigod/i.test(scanText),
      oldEmail: /contact@talentlinksf/i.test(scanText),
      footer2026: /2026 Demigod/i.test(scanText),
      footer2025: /2025 TalentLink/i.test(scanText),
      summonModal: /#startup-modal/i.test(scanHtml) || /startup-hire|startup-form/i.test(scanHtml),
      joinModal: /#jobseeker-modal/i.test(scanHtml) || /engineer-join|jobseeker-form/i.test(scanHtml),
      pantheonCount: (scanText.match(/THE PANTHEON OF AGENTS/g) || []).length,
      findTalent: (scanText.match(/FIND TALENT/g) || []).length,
      getJob: (scanText.match(/GET JOB/g) || []).length,
      startupAnchor: /#startup-modal/i.test(scanHtml),
      jobseekerAnchor: /#jobseeker-modal/i.test(scanHtml),
      genericEmailForm: /BUSINESS EMAIL/i.test(scanText),
    },
    forms,
    aiBusy: !!document.querySelector('button')?.textContent?.includes('Stop response'),
  };
});

const issues = [];
// Empty canvas → one honest issue, not five false "missing CTA" reds.
if ((data.textLen || 0) < 80 || (data.canvasScore || 0) <= 0) {
  issues.push(
    `Designer canvas unreadable (textLen=${data.textLen || 0}, canvasScore=${data.canvasScore || 0}) — open site canvas in Designer, not empty/chrome-only iframe`,
  );
} else {
if (data.issues.postJob) issues.push('Nav still says POST A JOB — should be HIRE TALENT → #startup-modal');
if (data.issues.talentLink || data.issues.footer2025) issues.push('TalentLink SF branding remains in footer');
if (data.issues.oldEmail) issues.push('contact@talentlinksf.com not updated to potter@trydemigod.com');
if (data.issues.helloEmail) issues.push('hello@trydemigod.com still present — public contact is potter@trydemigod.com only');
if (!data.issues.hireTalent) issues.push('Missing HIRE TALENT nav CTA');
if (!data.issues.potterEmail) issues.push('Missing potter@trydemigod.com public contact');
if (!data.issues.footer2026) issues.push('Footer not © 2026 Demigod');
if (data.issues.pantheonCount > 1) issues.push(`Duplicate Pantheon sections (${data.issues.pantheonCount}x)`);
if (data.issues.genericEmailForm) issues.push('Legacy single-field BUSINESS EMAIL form still on page');
if (!data.issues.summonModal || !data.issues.joinModal) issues.push('Missing dual application modals');
// Anchors OR in-canvas forms count as wired (Designer often opens modals without #hash hrefs).
if (!data.issues.startupAnchor && !data.issues.summonModal) {
  issues.push('Startup hire path missing (#startup-modal or startup-hire form)');
}
if (!data.issues.jobseekerAnchor && !data.issues.joinModal) {
  issues.push('Talent join path missing (#jobseeker-modal or engineer-join form)');
}
}

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
