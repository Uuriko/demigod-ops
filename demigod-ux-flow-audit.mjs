#!/usr/bin/env node
/**
 * UX flow from a planted local source in an explicit data root.
 * Writes DEMIGOD-UX-FLOW.json and shot notes under DEMIGOD_ROOT.
 * Does not open a browser or fetch a live site.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-UX-FLOW.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'ux-flow');
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

function auditViewport(html, vp) {
  const issues = [];
  const hire = /HIRE TALENT|HIRE SF/i.test(html);
  const join = /JOIN NETWORK|GET MATCHED/i.test(html);
  const email = /hello@/i.test(html);
  const lorem = /lorem ipsum/i.test(html);
  const startup = /id=["']startup-modal["']/i.test(html);
  const jobseeker = /id=["']jobseeker-modal["']/i.test(html);
  const has90 = /90day-outcome|first 90 days/i.test(html);
  const sticky = /id=["']dg-bar["']/i.test(html);
  if (!hire) issues.push('no hire CTA text');
  if (!join) issues.push('no join CTA text');
  if (!email) issues.push('contact missing');
  if (lorem) issues.push('lorem present');
  if (!startup) issues.push('startup modal missing');
  if (!jobseeker) issues.push('jobseeker modal missing');
  if (!has90) issues.push('outcome missing');
  if (!sticky) issues.push('sticky bar missing');
  return {
    name: vp.name,
    width: vp.width,
    height: vp.height,
    ok: issues.length === 0,
    hire,
    join,
    email,
    lorem,
    startup,
    jobseeker,
    has90,
    sticky,
    issues,
  };
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('ux_root_required');
  }
  const html = readLocal(root, 'demigod-ux-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const viewports = VIEWPORTS.map((vp) => auditViewport(htmlText, vp));
  const issues = viewports.flatMap((vp) => vp.issues.map((issue) => `${vp.name}: ${issue}`));
  const dir = shotDir();
  if (!insideRoot(root, dir)) refuse('ux_root_required');
  const screenshots = VIEWPORTS.map((vp) => path.join(dir, `${vp.name}-home.shot`));
  if (screenshots.some((file) => !insideRoot(root, file))) refuse('ux_root_required');
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    fs.writeFileSync(file, `${footMarker}\n${path.basename(file, '.shot')}\n`);
  }
  const report = {
    ok: issues.length === 0,
    at: new Date().toISOString(),
    path: reportPath(),
    shotDir: dir,
    source: 'disk',
    footMarker,
    viewports,
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
    console.error(JSON.stringify({ ok: false, error: 'ux_flow_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
