#!/usr/bin/env node
/**
 * Local priority check in an explicit data root.
 * Writes DEMIGOD-HEAVY-PRIORITY.json under DEMIGOD_ROOT. Does not open a browser or send a prompt.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  aiSubmit: false,
};
const MARKERS = [
  { name: 'PRIORITY', re: /priority/i },
  { name: 'ADJUDICATE', re: /adjudicate/i },
  { name: 'RANK', re: /rank/i },
  { name: 'BOARD', re: /board/i },
  { name: 'LOCAL', re: /local/i },
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-HEAVY-PRIORITY.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'priority-adjudicate');
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

function entryStat(root, rel) {
  const file = path.join(root, rel);
  if (!insideRoot(root, file)) return null;
  let st;
  try {
    st = fs.lstatSync(file);
  } catch {
    return null;
  }
  if (st.isSymbolicLink()) return null;
  return { file, st };
}

function readText(root, rel) {
  const found = entryStat(root, rel);
  if (!found || !found.st.isFile()) return null;
  return fs.readFileSync(found.file, 'utf8');
}

function markerHits(text) {
  const found = {};
  for (const marker of MARKERS) found[marker.name] = marker.re.test(text);
  return found;
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--send')
    || process.argv.includes('--ai')
    || process.argv.includes('--fetch')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('priority_root_required');
  }
  const footText = readText(root, 'demigod-foot-core.js');
  const notes = readText(root, 'HEAVY-PRIORITY-ADJUDICATE-SOURCE.md');
  if (footText == null && notes == null) refuse('source_required');
  const text = notes || '';
  const hits = markerHits(text);
  const missing = MARKERS.filter((marker) => !hits[marker.name]).map((marker) => marker.name);
  const pass = notes != null && missing.length === 0;
  const footMarker = ((footText || text).match(/Harbor \S+ keep/) || [''])[0];
  const dir = shotDir();
  const shot = path.join(dir, 'priority.shot');
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('priority_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\n${missing.length === 0 ? 'complete' : 'missing'}\n`);
  const body = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    shot,
    source: 'disk',
    footMarker,
    excerpt: text.slice(0, 180),
    markers: hits,
    missing,
    chars: text.length,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    missing: missing.length,
    chars: text.length,
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
    console.error(JSON.stringify({
      ok: false,
      error: 'priority_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
