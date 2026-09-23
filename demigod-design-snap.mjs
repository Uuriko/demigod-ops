#!/usr/bin/env node
/**
 * Local design snap for a planted source in an explicit data root.
 * Writes DEMIGOD-DESIGN-SNAP.json under DEMIGOD_ROOT. Does not open a browser.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const SNAPS = [
  { name: 'trust', marker: /id=["']demigod-trust-block["']/i },
  { name: 'privacy', marker: /id=["']demigod-legal-privacy["']|id=["']demigod-legal-wrap["']/i },
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-DESIGN-SNAP.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'design-snap');
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
    refuse('snap_root_required');
  }
  const html = readLocal(root, 'demigod-design-snap-source.html');
  const foot = readLocal(root, 'demigod-foot-core.js');
  if (html == null && foot == null) refuse('source_required');
  const htmlText = html || '';
  const footText = foot || '';
  const footMarker = (footText.match(/Harbor \S+ keep/) || htmlText.match(/Harbor \S+ keep/) || [''])[0];
  const snaps = SNAPS.map((snap) => ({ name: snap.name, found: snap.marker.test(htmlText) }));
  const missing = snaps.filter((snap) => !snap.found).map((snap) => snap.name);
  const ok = missing.length === 0;
  const dir = shotDir();
  const screenshots = SNAPS.map((snap) => path.join(dir, `${snap.name}.shot`));
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, report) || screenshots.some((file) => !insideRoot(root, file))) {
    refuse('snap_root_required');
  }
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
    snaps,
    missing,
    screenshots,
    foot: /dg-foot-v\d+-core/.test(footText),
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
    console.error(JSON.stringify({ ok: false, error: 'design_snap_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
