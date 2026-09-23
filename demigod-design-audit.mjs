#!/usr/bin/env node
/**
 * Local palette audit for a planted source in an explicit data root.
 * Writes DEMIGOD-DESIGN-AUDIT.json under DEMIGOD_ROOT. Does not open a browser.
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

const VIEWS_FULL = [
  { name: 'home-hero', marker: /HIRE TALENT/i },
  { name: 'home-full', marker: /HIRE TALENT/i },
  { name: 'trust', marker: /id=["']demigod-trust-block["']/i },
  { name: 'pricing', marker: /id=["']demigod-pricing["']/i },
  { name: 'partners', marker: /id=["']demigod-partnerships-wrap["']/i },
  { name: 'privacy', marker: /id=["']demigod-legal-privacy["']/i },
  { name: 'mobile-home', marker: /HIRE TALENT/i },
  { name: 'wizard-startup', marker: /id=["']startup-modal["']/i },
  { name: 'wizard-engineer', marker: /id=["']jobseeker-modal["']/i },
];
const QUICK_NAMES = new Set(['home-hero', 'trust', 'pricing', 'partners', 'privacy']);

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-DESIGN-AUDIT.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'design');
}
function designVer() {
  const raw = process.env.DG_DESIGN_VER || 'v60';
  const clean = String(raw).replace(/[^A-Za-z0-9._-]/g, '');
  return clean || 'v60';
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

function scanColors(html) {
  const cool = html.match(/rgb\(\s*107\s*,\s*114\s*,\s*128\s*\)|#6b7280/gi) || [];
  const blue = html.match(/rgb\(\s*59\s*,\s*130\s*,\s*246\s*\)|rgb\(\s*37\s*,\s*99\s*,\s*235\s*\)|rgb\(\s*239\s*,\s*68\s*,\s*68\s*\)|#3b82f6|#2563eb|#ef4444/gi) || [];
  return { coolGray: cool.length, blueRed: blue.length };
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--designer')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('design_root_required');
  }
  const html = readLocal(root, 'demigod-design-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const quick = process.argv.includes('--quick');
  const views = quick ? VIEWS_FULL.filter((view) => QUICK_NAMES.has(view.name)) : VIEWS_FULL;
  const ver = designVer();
  const colors = scanColors(htmlText);
  const dir = shotDir();
  const screenshots = views.map((view) => path.join(dir, `${ver}-${view.name}.shot`));
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, report) || screenshots.some((file) => !insideRoot(root, file))) {
    refuse('design_root_required');
  }
  const missing = views.filter((view) => !view.marker.test(htmlText)).map((view) => view.name);
  const ok = missing.length === 0 && colors.blueRed === 0 && colors.coolGray < 5;
  fs.mkdirSync(dir, { recursive: true });
  for (const file of screenshots) {
    fs.writeFileSync(file, `${footMarker}\n${path.basename(file, '.shot')}\n`);
  }
  const body = {
    ok,
    at: new Date().toISOString(),
    path: report,
    shotDir: dir,
    source: 'disk',
    footMarker,
    ver,
    quick,
    views: Object.fromEntries(views.map((view, index) => [view.name, {
      shot: screenshots[index],
      found: view.marker.test(htmlText),
    }])),
    summary: colors,
    missing,
    screenshots,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok,
    path: report,
    shot: screenshots[0],
    shots: screenshots.length,
    source: 'disk',
    footMarker,
    ver,
    quick,
    summary: colors,
    missing: missing.length,
    ...localFlags,
  }));
  if (!ok) process.exit(1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({
      ok: false,
      error: 'design_audit_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
