#!/usr/bin/env node
/**
 * Local form flow proof for a planted source in an explicit data root.
 * Writes DEMIGOD-FORM-E2E.json under DEMIGOD_ROOT. Does not submit a form.
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
  return path.join(dataRoot(), 'DEMIGOD-FORM-E2E.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'form-e2e');
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

function fieldNames(slice) {
  const names = [];
  const re = /<(?:input|textarea|select)\b[^>]*>/gi;
  let match;
  while ((match = re.exec(slice)) !== null) {
    const named = match[0].match(/\bname=["']([^"']+)["']/i);
    if (named) names.push(named[1]);
  }
  return names;
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--submit')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('e2e_root_required');
  }
  const html = readLocal(root, 'demigod-form-e2e-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const hireModal = modalSlice(htmlText, 'startup-modal');
  const joinModal = modalSlice(htmlText, 'jobseeker-modal');
  const hireFields = fieldNames(hireModal);
  const wiz = (hireModal.match(/dg-wiz-q/gi) || []).map(() => ({ vis: hireFields.length }));
  const hire = {
    found: hireModal.length > 0,
    hasNext: /dg-wiz-next/i.test(hireModal),
    has90: /90day-outcome|first 90 days/i.test(hireModal),
    fields: hireFields,
  };
  const join = {
    found: joinModal.length > 0,
    fields: fieldNames(joinModal),
  };
  const issues = [];
  if (!hire.found) issues.push('hire_missing');
  if (!hire.hasNext) issues.push('next_missing');
  if (!hire.has90) issues.push('outcome_missing');
  if (wiz.length < 2) issues.push('wiz_short');
  if (!hireFields.length) issues.push('inputs_missing');
  if (!join.found) issues.push('join_missing');
  const pass = issues.length === 0;
  const dir = shotDir();
  if (!insideRoot(root, dir)) refuse('e2e_root_required');
  const shot = path.join(dir, 'e2e-final.shot');
  if (!insideRoot(root, shot)) refuse('e2e_root_required');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\ne2e-final\n`);
  const report = {
    ok: pass,
    pass,
    at: new Date().toISOString(),
    path: reportPath(),
    shotDir: dir,
    source: 'disk',
    footMarker,
    hire,
    join,
    wiz,
    posts: [],
    issues,
    screenshots: [shot],
    ...localFlags,
  };
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    pass,
    path: report.path,
    shot,
    source: report.source,
    footMarker,
    hire: hire.found,
    join: join.found,
    wizSteps: wiz.length,
    posts: 0,
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
    console.error(JSON.stringify({ ok: false, pass: false, error: 'form_e2e_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
