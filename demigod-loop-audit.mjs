#!/usr/bin/env node
/**
 * Loop audit from a planted local source in the named data root.
 * Writes DEMIGOD-LOOP-AUDIT.json and appends demigod-keep-going.md there.
 * Does not open a browser, fetch a live site, or write outside that root.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-LOOP-AUDIT.json');
}
function keepGoingPath() {
  return path.join(dataRoot(), 'demigod-keep-going.md');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, ...localFlags }));
  process.exit(1);
}

function readLocal(name) {
  const file = path.join(dataRoot(), name);
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

function formDisplay(modal) {
  if (!/<form[\s>]/i.test(modal)) return 'n/a';
  const style = modal.match(/<form[^>]*style=["']([^"']*)["']/i);
  if (style && /display:\s*none/i.test(style[1])) return 'none';
  return 'block';
}

function auditSide(html, id, badRe) {
  const modal = modalSlice(html, id);
  const review = reviewText(modal);
  return {
    hasRev: review.trim().length > 4,
    has90First: /90day-outcome|first 90 days/i.test(review.slice(0, 250)),
    gold: review.includes('#C9A84C'),
    formD: formDisplay(modal),
    badTitle: badRe.test(modal),
  };
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const html = readLocal('demigod-loop-source.html');
  const foot = readLocal('demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');

  const htmlText = html || '';
  const footText = foot || '';
  const startup = auditSide(htmlText, 'startup-modal', /CANDIDATE APPLICATION|HIRING FORM|BRIEFS/i);
  const engineer = auditSide(htmlText, 'jobseeker-modal', /CANDIDATE APPLICATION|BRIEFS/i);
  const issues = [];
  if (!startup.has90First || !startup.gold || startup.formD === 'none' || startup.badTitle) {
    issues.push('startup-review: ' + JSON.stringify(startup));
  }
  if (!engineer.hasRev || engineer.formD === 'none' || engineer.badTitle) {
    issues.push('eng-review: ' + JSON.stringify(engineer));
  }
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const report = {
    ok: issues.length === 0,
    at: new Date().toISOString(),
    path: reportPath(),
    source: 'disk',
    footMarker,
    footVersion: (footText.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
    startup,
    engineer,
    issues,
    shots: [],
    ...localFlags,
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  const entry = `\n\n### Loop-audit ${report.at} (source=disk)\n- marker: ${footMarker}\n- startup: ${JSON.stringify(startup)}\n- eng: ${JSON.stringify(engineer)}\n- issues: ${issues.join('; ') || 'clean'}\n`;
  fs.appendFileSync(keepGoingPath(), entry);
  console.log(JSON.stringify({
    ok: report.ok,
    path: report.path,
    source: report.source,
    footMarker,
    issues: issues.length,
    keepGoing: keepGoingPath(),
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
    console.error(JSON.stringify({ ok: false, error: 'loop_audit_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
