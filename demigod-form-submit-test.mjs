#!/usr/bin/env node
/**
 * Local form identity check for a planted source in an explicit data root.
 * Writes DEMIGOD-FORM-SUBMIT-TEST.json under DEMIGOD_ROOT. Does not submit a form.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false, submitted: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-FORM-SUBMIT-TEST.json');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, pass: false, error, ...localFlags }));
  process.exit(1);
}

function readLocal(root, name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function formSlice(html, id) {
  const start = html.search(new RegExp(`id=["']${id}["']`, 'i'));
  if (start < 0) return '';
  const rest = html.slice(start);
  const end = rest.search(/<\/form>/i);
  return end < 0 ? rest.slice(0, 800) : rest.slice(0, end);
}

function attr(slice, name) {
  const match = slice.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return match ? match[1] : null;
}

function fieldNames(slice) {
  const names = [];
  const re = /<(?:input|textarea|select)\b[^>]*>/gi;
  let match;
  while ((match = re.exec(slice)) !== null) {
    const tag = match[0];
    if (/type=["']hidden["']/i.test(tag)) continue;
    const named = tag.match(/\bname=["']([^"']+)["']/i);
    if (named) names.push(named[1]);
  }
  return names;
}

function inspect(html, id, expected) {
  const slice = formSlice(html, id);
  return {
    present: slice.length > 0,
    formName: attr(slice, 'name'),
    dataName: attr(slice, 'data-name'),
    expected,
    fields: fieldNames(slice),
  };
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('form_root_required');
  }
  const html = readLocal(root, 'demigod-form-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const startup = inspect(htmlText, 'startup-hire', 'startup-hire');
  const engineer = inspect(htmlText, 'engineer-join', 'engineer-join');
  const emailFormCount = (htmlText.match(/data-name="email-form"/g) || []).length;
  const issues = [];
  if (!startup.present || startup.dataName !== 'startup-hire') issues.push('startup_name_mismatch');
  if (!engineer.present || engineer.dataName !== 'engineer-join') issues.push('engineer_name_mismatch');
  if (emailFormCount) issues.push('email_form_drift');
  if (!/id=["']startup-modal["']/i.test(htmlText) || !/id=["']jobseeker-modal["']/i.test(htmlText)) {
    issues.push('modal_missing');
  }
  const pass = issues.length === 0;
  const report = {
    ok: pass,
    pass,
    at: new Date().toISOString(),
    path: reportPath(),
    source: 'disk',
    footMarker,
    startup,
    engineer,
    emailFormCount,
    issues,
    submitResult: { skipped: true, submitted: false, reason: 'local_record_only' },
    ...localFlags,
  };
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: report.ok,
    pass,
    path: report.path,
    source: report.source,
    footMarker,
    startupDataName: startup.dataName,
    engineerDataName: engineer.dataName,
    issues: issues.length,
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
    console.error(JSON.stringify({ ok: false, pass: false, error: 'form_submit_check_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
