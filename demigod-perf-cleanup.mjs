#!/usr/bin/env node
/**
 * Local perf cleanup for an explicit data root.
 * Writes DEMIGOD-PERF-CLEANUP.json there and trims cache files only inside that root.
 * Does not close browser tabs or delete files outside the root.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false, tabsClosed: false };
const CACHE_RELS = [
  '.grok/chrome-heavy/GrShaderCache',
  '.grok/chrome-heavy/ShaderCache',
  '.grok/chrome-heavy/Code Cache/js',
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-PERF-CLEANUP.json');
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

function readNote(root) {
  for (const name of ['demigod-perf-note.txt', 'demigod-foot-core.js']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    return fs.readFileSync(file, 'utf8');
  }
  return null;
}

function trimDir(root, rel, maxAgeDays) {
  const dir = path.join(root, rel);
  if (!insideRoot(root, dir)) return { dir: rel, removed: 0, bytes: 0, names: [], skipped: 'outside_root' };
  if (!fs.existsSync(dir)) return { dir: rel, removed: 0, bytes: 0, names: [] };
  const dirStat = fs.lstatSync(dir);
  if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
    return { dir: rel, removed: 0, bytes: 0, names: [], skipped: 'not_directory' };
  }
  const cutoff = Date.now() - maxAgeDays * 86400000;
  let removed = 0;
  let bytes = 0;
  const names = [];
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    if (!insideRoot(root, fp)) continue;
    let entry;
    try {
      entry = fs.lstatSync(fp);
    } catch {
      continue;
    }
    if (entry.isSymbolicLink() || !entry.isFile()) continue;
    if (entry.mtimeMs < cutoff) {
      bytes += entry.size;
      fs.rmSync(fp, { force: true });
      removed += 1;
      names.push(name);
    }
  }
  return { dir: rel, removed, bytes, names };
}

function main() {
  if (process.argv.includes('--publish') || process.argv.includes('--push')) refuse('publish_refused');
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('cleanup_root_required');
  }
  const note = readNote(root);
  if (note == null) refuse('source_required');
  const footMarker = (note.match(/Harbor \S+ keep/) || [''])[0];
  const cacheTrim = CACHE_RELS.map((rel) => trimDir(root, rel, 3));
  const removed = cacheTrim.reduce((sum, row) => sum + row.removed, 0);
  const report = {
    ok: true,
    at: new Date().toISOString(),
    path: reportPath(),
    source: 'disk',
    footMarker,
    cacheTrim,
    removed,
    ...localFlags,
  };
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: true,
    path: report.path,
    source: report.source,
    footMarker,
    removed,
    ...localFlags,
  }));
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'perf_cleanup_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
