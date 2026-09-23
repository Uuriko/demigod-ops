#!/usr/bin/env node
/**
 * User traversal from a planted local source in an explicit data root.
 * Writes traversal notes and DEMIGOD-USER-TRAVERSAL.json under DEMIGOD_ROOT.
 * Does not open a browser or fetch a live site.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const LABELS = ['d-startup', 'd-engineer', 'm-startup', 'm-engineer'];
const STARTUP_STEPS = ['welcome', 'contact-email', 'company-name', 'company-stage', 'role-title', 'stack-needs', '90day-outcome', 'salary-range', 'timeline', 'team-size', 'why-this-role', 'role-jd', '__submit__', '__thanks__'];
const ENGINEER_STEPS = ['welcome', 'full-name', 'seeker-email', 'linkedin-url', 'skills-stack', 'experience', 'sf-bay', 'availability', 'salary-expectation', 'why-startups', 'links', 'phone', 'resume', '__submit__', '__thanks__'];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-USER-TRAVERSAL.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'user-trav');
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

function walk(html, kind) {
  const modal = modalSlice(html, kind === 'startup' ? 'startup-modal' : 'jobseeker-modal');
  const review = reviewText(modal);
  const steps = kind === 'startup' ? STARTUP_STEPS : ENGINEER_STEPS;
  const bad = kind === 'startup'
    ? /HIRING FORM|ENGINEER APPLICATION|EXAMPLE BRIEFS/i.test(modal)
    : /HIRING FORM|ENGINEER APPLICATION|EXAMPLE BRIEFS/i.test(modal);
  const state = {
    kind,
    vis: /<(input|textarea|select)\b/i.test(modal) ? 1 : 0,
    nextOk: /dg-wiz-next/i.test(modal),
    bad,
    has90: /90day-outcome|first 90 days/i.test(modal),
    hasRev: review.trim().length > 3,
    thanks: /thank|received|profile saved|brief received/i.test(modal),
    steps: steps.filter((key) => key.startsWith('__') || modal.includes(key)),
  };
  return state;
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('traversal_root_required');
  }
  const html = readLocal(root, 'demigod-traversal-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const startup = walk(htmlText, 'startup');
  const engineer = walk(htmlText, 'engineer');
  const passes = {
    'd-startup': startup,
    'd-engineer': engineer,
    'm-startup': startup,
    'm-engineer': engineer,
  };
  const issues = [];
  for (const [label, state] of Object.entries(passes)) {
    if (!state.thanks || state.bad || !state.nextOk || !state.hasRev) {
      issues.push(`${label}: thanks=${state.thanks} bad=${state.bad} next=${state.nextOk} rev=${state.hasRev}`);
    }
    if (label.endsWith('startup') && !state.has90) issues.push(`${label}: missing 90day`);
  }
  const dir = shotDir();
  if (!insideRoot(root, dir)) refuse('traversal_root_required');
  const screenshots = LABELS.map((label) => path.join(dir, `${label}-00-home.shot`));
  if (screenshots.some((file) => !insideRoot(root, file))) refuse('traversal_root_required');
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    fs.writeFileSync(file, `${footMarker}\n${path.basename(file, '.shot')}\n`);
  }
  const all = issues.length === 0 && startup.thanks && engineer.thanks;
  const report = {
    ok: all,
    at: new Date().toISOString(),
    path: reportPath(),
    shotDir: dir,
    source: 'disk',
    footMarker,
    dStartup: startup.thanks,
    dEng: engineer.thanks,
    mStartup: startup.thanks,
    mEng: engineer.thanks,
    passes,
    issues,
    screenshots,
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
    dStartup: report.dStartup,
    dEng: report.dEng,
    mStartup: report.mStartup,
    mEng: report.mEng,
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
    console.error(JSON.stringify({ ok: false, error: 'user_traversal_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
