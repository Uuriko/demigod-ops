#!/usr/bin/env node
/**
 * Full audit from a planted local source in an explicit data root.
 * Writes screenshot notes and DEMIGOD-FULL-AUDIT.json under DEMIGOD_ROOT.
 * Does not open a browser or fetch a live site.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const VIEWPORTS = ['desktop', 'mobile'];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-FULL-AUDIT.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'full-audit');
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

function modalSlice(html, id) {
  const start = html.search(new RegExp(`id=["']${id}["']`, 'i'));
  if (start < 0) return '';
  const rest = html.slice(start);
  const next = rest.slice(1).search(/id=["'][^"']+["']/i);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

function reviewText(modal) {
  const idx = modal.search(/dg-wiz-review/i);
  if (idx < 0) return '';
  return modal.slice(idx, idx + 800).replace(/<[^>]+>/g, ' ');
}

function auditViewport(html, name) {
  const startup = modalSlice(html, 'startup-modal');
  const engineer = modalSlice(html, 'jobseeker-modal');
  const startupReview = reviewText(startup);
  const engineerReview = reviewText(engineer);
  const startupState = {
    viewport: name,
    has90: /90day-outcome|first 90 days/i.test(startup),
    has90First: /90day-outcome|first 90 days/i.test(startupReview.slice(0, 250)),
    goldBorder: startupReview.includes('#C9A84C'),
    hasReview: startupReview.trim().length > 5,
    bad: /HIRING FORM|EXAMPLE BRIEF/i.test(startup),
    nextOk: /dg-wiz-next/i.test(startup),
  };
  const engineerState = {
    viewport: name,
    hasReview: engineerReview.trim().length > 5,
    bad: /CANDIDATE APPLICATION|EXAMPLE BRIEF/i.test(engineer),
    nextOk: /dg-wiz-next/i.test(engineer),
  };
  const issues = [];
  if (!startupState.has90 || !startupState.has90First || !startupState.goldBorder || !startupState.hasReview || startupState.bad || !startupState.nextOk) {
    issues.push(`${name} startup: ${JSON.stringify(startupState)}`);
  }
  if (!engineerState.hasReview || engineerState.bad || !engineerState.nextOk) {
    issues.push(`${name} engineer: ${JSON.stringify(engineerState)}`);
  }
  return { startup: startupState, engineer: engineerState, issues };
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('audit_root_required');
  }
  const html = readLocal(root, 'demigod-full-audit-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const viewports = {};
  const issues = [];
  for (const name of VIEWPORTS) {
    const side = auditViewport(htmlText, name);
    viewports[name] = { startup: side.startup, engineer: side.engineer };
    issues.push(...side.issues);
  }
  const dir = shotDir();
  if (!insideRoot(root, dir)) refuse('audit_root_required');
  const screenshots = VIEWPORTS.map((name) => path.join(dir, `${name}-00-home.shot`));
  if (screenshots.some((file) => !insideRoot(root, file))) refuse('audit_root_required');
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    const name = path.basename(file, '.shot');
    fs.writeFileSync(file, `${footMarker}\n${name}\n`);
  }
  const shotReport = path.join(dir, 'report.json');
  const report = {
    ok: issues.length === 0,
    at: new Date().toISOString(),
    path: reportPath(),
    shotDir: dir,
    source: 'disk',
    footMarker,
    footVersion: (footText.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
    desktop: viewports.desktop,
    mobile: viewports.mobile,
    issues,
    screenshots,
    ...localFlags,
  };
  fs.writeFileSync(shotReport, JSON.stringify(report, null, 2));
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
    console.error(JSON.stringify({ ok: false, error: 'full_audit_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
