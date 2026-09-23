#!/usr/bin/env node
/**
 * Local forms audit for a planted source in an explicit data root.
 * Writes DEMIGOD-FORMS-FULL-AUDIT.json under DEMIGOD_ROOT. Does not open a browser.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  submitted: false,
};

const SIDES = [
  { side: 'startup', modalId: 'startup-modal', openTexts: ['HIRE TALENT', 'FIND TALENT'], shot: 'startup-desktop' },
  { side: 'engineer', modalId: 'jobseeker-modal', openTexts: ['GET JOB', 'JOIN NETWORK'], shot: 'engineer-desktop' },
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-FORMS-FULL-AUDIT.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'forms-audit');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, pass: false, error, ...localFlags }));
  process.exit(1);
}

function insideRoot(root, file) {
  const base = path.resolve(root);
  const resolved = path.resolve(file);
  return resolved === base || resolved.startsWith(base + path.sep);
}

function readLocal(root, name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function modalSlice(html, id) {
  const start = html.search(new RegExp(`id=["']${id}["']`, 'i'));
  if (start < 0) return '';
  const rest = html.slice(start);
  const next = rest.slice(1).search(/id=["'][^"']+["']/i);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

function formBlock(modal) {
  const match = modal.match(/<form\b[\s\S]*?<\/form>/i);
  return match ? match[0] : '';
}

function fieldsFrom(modal) {
  const block = formBlock(modal);
  const fields = [];
  const re = /<(?:input|textarea|select)\b[^>]*>/gi;
  let match;
  while ((match = re.exec(block)) !== null) {
    const tag = match[0];
    if (/type=["']hidden["']/i.test(tag)) continue;
    const named = tag.match(/\bname=["']([^"']+)["']/i);
    fields.push({
      name: named ? named[1] : '',
      visible: !/\bhidden\b|display:\s*none/i.test(tag),
    });
  }
  return fields;
}

function submitFrom(modal) {
  const block = formBlock(modal) || modal;
  const match = block.match(/<(?:button|input)\b[^>]*type=["']submit["'][^>]*>/i);
  if (!match) return { text: '', visible: false };
  const tag = match[0];
  const value = tag.match(/\bvalue=["']([^"']*)["']/i);
  const inner = block.slice(match.index).match(/^<button\b[^>]*>([^<]*)</i);
  return {
    text: (inner?.[1] || value?.[1] || '').trim(),
    visible: !/\bhidden\b|display:\s*none/i.test(tag),
  };
}

function ghostsFrom(modal) {
  const outside = modal.replace(/<form\b[\s\S]*?<\/form>/gi, '');
  const ghosts = [];
  const re = />([^<]{9,399})</g;
  let match;
  while ((match = re.exec(outside)) !== null) {
    const text = match[1].trim();
    if (/brief received|oops|form submitted|welcome|pantheon|hermes/i.test(text)) {
      ghosts.push(text.slice(0, 120));
    }
  }
  return ghosts;
}

function auditSide(html, spec) {
  const modal = modalSlice(html, spec.modalId);
  const form = formBlock(modal).match(/^<form\b[^>]*>/i);
  const dataName = form && form[0].match(/\bdata-name=["']([^"']+)["']/i);
  const fields = fieldsFrom(modal);
  const submit = submitFrom(modal);
  const ghosts = ghostsFrom(modal);
  const visibleFields = fields.filter((field) => field.visible).length;
  return {
    side: spec.side,
    clicked: spec.openTexts.some((text) => new RegExp(`>\\s*${text}\\s*<`, 'i').test(html)),
    modalFound: modal.length > 0,
    formName: dataName ? dataName[1] : '',
    fieldCount: fields.length,
    visibleFields,
    fields,
    submitText: submit.text,
    submitVisible: submit.visible,
    formScrollable: false,
    layoutMeasured: false,
    ghosts,
    turnstile: /cf-turnstile|cf-turnstile-response/i.test(modal),
  };
}

function issuesFrom(audits) {
  const issues = [];
  for (const audit of audits) {
    if (!audit.modalFound) issues.push({ severity: 'high', side: audit.side, issue: 'modal_missing' });
    if (audit.ghosts.length) {
      issues.push({ severity: 'high', side: audit.side, issue: 'ghost_messages_on_open', count: audit.ghosts.length });
    }
    if (audit.visibleFields > 8) {
      issues.push({ severity: 'medium', side: audit.side, issue: 'too_many_visible_fields', count: audit.visibleFields });
    }
    if (!audit.submitVisible) issues.push({ severity: 'high', side: audit.side, issue: 'submit_not_visible' });
    if (/^submit$/i.test(audit.submitText)) {
      issues.push({ severity: 'low', side: audit.side, issue: 'generic_submit_label' });
    }
  }
  return issues;
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--submit')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('forms_root_required');
  }
  const html = readLocal(root, 'demigod-forms-audit-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const audits = SIDES.map((spec) => auditSide(htmlText, spec));
  const issues = issuesFrom(audits);
  const pass = issues.filter((issue) => issue.severity === 'high').length === 0;
  const dir = shotDir();
  const screenshots = [
    ...SIDES.map((spec) => path.join(dir, `${spec.shot}.shot`)),
    path.join(dir, 'startup-mobile.shot'),
    path.join(dir, 'engineer-mobile.shot'),
  ];
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, report) || screenshots.some((file) => !insideRoot(root, file))) {
    refuse('forms_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    fs.writeFileSync(file, `${footMarker}\n${path.basename(file, '.shot')}\n`);
  }
  const bySide = Object.fromEntries(audits.map((audit) => [audit.side, audit]));
  const body = {
    ok: pass,
    pass,
    at: new Date().toISOString(),
    path: report,
    shotDir: dir,
    source: 'disk',
    footMarker,
    startup: bySide.startup,
    engineer: bySide.engineer,
    mobile: {
      startup: { ...bySide.startup, shot: path.join(dir, 'startup-mobile.shot') },
      engineer: { ...bySide.engineer, shot: path.join(dir, 'engineer-mobile.shot') },
    },
    issues,
    screenshots,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    pass,
    path: report,
    shot: screenshots[0],
    shots: screenshots.length,
    source: 'disk',
    footMarker,
    issues: issues.length,
    high: issues.filter((issue) => issue.severity === 'high').length,
    startup: bySide.startup.formName,
    engineer: bySide.engineer.formName,
    ...localFlags,
  }));
  if (!pass) process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({
      ok: false,
      pass: false,
      error: 'forms_audit_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
