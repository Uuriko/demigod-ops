#!/usr/bin/env node
/**
 * Playtest review from a planted local source in an explicit data root.
 * Writes DEMIGOD-PLAYTEST-REVIEW.json and shot notes under DEMIGOD_ROOT.
 * Does not open a browser or fetch a live site.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const SHOT_NAMES = [
  '01-landing',
  '02-after-founder-cta',
  '03-after-get-job',
  '04-pricing',
  '05-after-choose-commission',
  '06-footer',
  '07-mobile-landing',
  '08-mobile-nav-open',
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-PLAYTEST-REVIEW.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'playtest');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, pass: false, ...localFlags }));
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

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('playtest_root_required');
  }
  const html = readLocal(root, 'demigod-playtest-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const startup = modalSlice(htmlText, 'startup-modal');
  const jobseeker = modalSlice(htmlText, 'jobseeker-modal');
  const findings = [];
  if (!/HIRE TALENT/i.test(htmlText)) findings.push({ severity: 'high', issue: 'hire_talent_missing' });
  if (!/FIND TALENT/i.test(htmlText)) findings.push({ severity: 'medium', issue: 'find_talent_missing' });
  if (!/JOIN NETWORK|GET JOB/i.test(htmlText)) findings.push({ severity: 'high', issue: 'join_missing' });
  if (!startup) findings.push({ severity: 'high', issue: 'startup_modal_missing' });
  if (!jobseeker) findings.push({ severity: 'high', issue: 'jobseeker_modal_missing' });
  if (/Oops!/i.test(startup)) findings.push({ severity: 'high', issue: 'startup_oops' });
  if (/Oops!/i.test(jobseeker)) findings.push({ severity: 'high', issue: 'jobseeker_oops' });
  if (!/90day-outcome|first 90 days/i.test(startup)) findings.push({ severity: 'high', issue: 'outcome_missing' });
  if (!/©\s*2026\s*Demigod/i.test(htmlText)) findings.push({ severity: 'medium', issue: 'footer_year_missing' });
  if (/class=["'][^"']*w-webflow-badge/i.test(htmlText)) findings.push({ severity: 'medium', issue: 'webflow_badge' });
  const dir = shotDir();
  if (!insideRoot(root, dir)) refuse('playtest_root_required');
  const screenshots = SHOT_NAMES.map((name) => path.join(dir, `${name}.shot`));
  if (screenshots.some((file) => !insideRoot(root, file))) refuse('playtest_root_required');
  fs.mkdirSync(dir, { recursive: true });
  const shots = {};
  for (const file of screenshots) {
    const name = path.basename(file, '.shot');
    fs.writeFileSync(file, `${footMarker}\n${name}\n`);
    shots[name] = file;
  }
  const pass = findings.filter((item) => item.severity === 'high').length === 0;
  const report = {
    ok: pass,
    pass,
    at: new Date().toISOString(),
    path: reportPath(),
    shotDir: dir,
    source: 'disk',
    footMarker,
    findings,
    screenshots,
    shots,
    ...localFlags,
  };
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: report.ok,
    pass,
    path: report.path,
    shotDir: dir,
    screenshots,
    source: report.source,
    footMarker,
    high: findings.filter((item) => item.severity === 'high').length,
    total: findings.length,
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
    console.error(JSON.stringify({ ok: false, pass: false, error: 'playtest_review_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
