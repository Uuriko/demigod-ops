#!/usr/bin/env node
/**
 * Local designer audit for a planted source in an explicit data root.
 * Writes DEMIGOD-WEBFLOW-AUDIT.json under DEMIGOD_ROOT. Does not open a designer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  designerOpen: false,
};

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-WEBFLOW-AUDIT.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'webflow');
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

function signalsFrom(html) {
  return {
    postJob: /POST A JOB/i.test(html),
    hireTalent: /HIRE TALENT/i.test(html),
    talentLink: /TalentLink/i.test(html),
    helloEmail: /hello@/i.test(html),
    oldEmail: /contact@talentlinksf/i.test(html),
    footer2026: /2026 Demigod/i.test(html),
    footer2025: /2025 TalentLink/i.test(html),
    summonModal: /#startup-modal/i.test(html) || /startup-hire|startup-form/i.test(html),
    joinModal: /#jobseeker-modal/i.test(html) || /engineer-join|jobseeker-form/i.test(html),
    pantheonCount: (html.match(/THE PANTHEON OF AGENTS/g) || []).length,
    findTalent: (html.match(/FIND TALENT/g) || []).length,
    getJob: (html.match(/GET JOB/g) || []).length,
    startupAnchor: /#startup-modal/i.test(html),
    jobseekerAnchor: /#jobseeker-modal/i.test(html),
    genericEmailForm: /BUSINESS EMAIL/i.test(html),
  };
}

function issuesFrom(signals) {
  const issues = [];
  if (signals.postJob) issues.push('post_job');
  if (signals.talentLink || signals.footer2025) issues.push('old_brand');
  if (signals.oldEmail) issues.push('old_contact');
  if (!signals.hireTalent) issues.push('hire_missing');
  if (!signals.helloEmail) issues.push('contact_missing');
  if (!signals.footer2026) issues.push('footer_missing');
  if (signals.pantheonCount > 1) issues.push('pantheon_duplicate');
  if (signals.genericEmailForm) issues.push('legacy_email_form');
  if (!signals.summonModal || !signals.joinModal) issues.push('modals_missing');
  if (!signals.startupAnchor || !signals.jobseekerAnchor) issues.push('anchors_missing');
  return issues;
}

function formsFrom(html) {
  const forms = [];
  const re = /<form\b[^>]*>[\s\S]*?<\/form>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const block = match[0];
    const open = block.match(/^<form\b[^>]*>/i);
    const named = open && open[0].match(/\bname=["']([^"']+)["']/i);
    const fields = [];
    const fieldRe = /<(?:input|textarea|select)\b[^>]*>/gi;
    let field;
    while ((field = fieldRe.exec(block)) !== null) {
      const label = field[0].match(/\b(?:name|placeholder)=["']([^"']+)["']/i);
      if (label) fields.push(label[1]);
    }
    forms.push({ name: named ? named[1] : 'form', fields });
  }
  return forms;
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--designer')
    || process.argv.includes('--submit')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('webflow_root_required');
  }
  const html = readLocal(root, 'demigod-webflow-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const signals = signalsFrom(htmlText);
  const issues = issuesFrom(signals);
  const forms = formsFrom(htmlText);
  const pass = issues.length === 0;
  const dir = shotDir();
  const shot = path.join(dir, 'audit-canvas.shot');
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('webflow_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\naudit-canvas\n`);
  const body = {
    ok: pass,
    pass,
    at: new Date().toISOString(),
    path: report,
    shotDir: dir,
    source: 'disk',
    footMarker,
    signals,
    issues,
    forms,
    screenshots: [shot],
    aiBusy: false,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    pass,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    issues: issues.length,
    hire: signals.hireTalent,
    join: signals.joinModal,
    forms: forms.length,
    designerOpen: false,
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
      error: 'webflow_audit_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
