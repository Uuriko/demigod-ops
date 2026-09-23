#!/usr/bin/env node
/**
 * Screenshot manifest from a planted local source in an explicit data root.
 * Writes DEMIGOD-SCREENSHOT-MANIFEST.json and shot notes under DEMIGOD_ROOT.
 * Does not open a browser or fetch a live site.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const SHOT_NAMES = [
  '01-landing',
  '02-hero',
  '03-nav',
  '04-startup-modal',
  '05-startup-form',
  '06-engineer-modal',
  '07-footer',
  '08-mobile-hero',
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-SCREENSHOT-MANIFEST.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'audit');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, ...localFlags }));
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

function count(text, re) {
  return (text.match(re) || []).length;
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('capture_root_required');
  }
  const html = readLocal(root, 'demigod-capture-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const pageScan = {
    hireTalent: count(htmlText, /HIRE TALENT/gi),
    findTalent: count(htmlText, /FIND TALENT/gi),
    footer2026: /©\s*2026\s*Demigod/i.test(htmlText),
    emailFormCount: count(htmlText, /data-name="email-form"/g),
    startupModal: /id=["']startup-modal["']/i.test(htmlText),
    engineerModal: /id=["']jobseeker-modal["']/i.test(htmlText),
    has90: /90day-outcome|first 90 days/i.test(htmlText),
  };
  const issues = [];
  if (!pageScan.hireTalent) issues.push('hire_talent_missing');
  if (!pageScan.findTalent) issues.push('find_talent_missing');
  if (!pageScan.footer2026) issues.push('footer_year_missing');
  if (pageScan.emailFormCount) issues.push('email_form_drift');
  if (!pageScan.startupModal || !pageScan.engineerModal) issues.push('modal_missing');
  if (!pageScan.has90) issues.push('outcome_missing');
  const dir = shotDir();
  if (!insideRoot(root, dir)) refuse('capture_root_required');
  const screenshots = SHOT_NAMES.map((name) => path.join(dir, `${name}.shot`));
  if (screenshots.some((file) => !insideRoot(root, file))) refuse('capture_root_required');
  fs.mkdirSync(dir, { recursive: true });
  const shots = {};
  for (const file of screenshots) {
    const name = path.basename(file, '.shot');
    fs.writeFileSync(file, `${footMarker}\n${name}\n`);
    shots[name] = file;
  }
  const report = {
    ok: issues.length === 0,
    at: new Date().toISOString(),
    path: reportPath(),
    shotDir: dir,
    source: 'disk',
    footMarker,
    pageScan,
    shots,
    screenshots,
    issues,
    ...localFlags,
  };
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: report.ok,
    path: report.path,
    shotDir: dir,
    screenshots,
    source: report.source,
    footMarker,
    issues: issues.length,
    ...localFlags,
  }));
  if (!report.ok) process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'capture_audit_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
