#!/usr/bin/env node
/**
 * Local leak check for planted markup in an explicit data root.
 * Writes DEMIGOD-HEAVY-CLEANUP.json under DEMIGOD_ROOT. Does not delete or publish.
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
  deleted: false,
  published: false,
};
const LEAKS = [
  'pantheon',
  'SYNDICATE SUBSCRIPTION',
  'Hermes received',
  'demigod.ai',
  'METHODOLOGY',
  'tally-startup-embed',
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-HEAVY-CLEANUP.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'heavy-cleanup');
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

function leakHits(html) {
  return LEAKS.filter((needle) => {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i').test(html);
  });
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--designer')
    || process.argv.includes('--ai')
    || process.argv.includes('--submit')
    || process.argv.includes('--fetch')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('cleanup_root_required');
  }
  const footText = readText(root, 'demigod-foot-core.js');
  const html = readText(root, 'demigod-heavy-cleanup-source.html');
  if (footText == null && html == null) refuse('source_required');
  const htmlText = html || '';
  const found = leakHits(htmlText);
  const pass = html != null && found.length === 0;
  const footMarker = ((footText || htmlText).match(/Harbor \S+ keep/) || [''])[0];
  const dir = shotDir();
  const shot = path.join(dir, 'source.shot');
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('cleanup_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\n${found.length === 0 ? 'clean' : 'leak'}\n`);
  const body = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    shot,
    source: 'disk',
    footMarker,
    found,
    clean: found.length === 0,
    htmlLen: htmlText.length,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    found: found.length,
    leaks: found,
    clean: found.length === 0,
    htmlLen: htmlText.length,
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
      error: 'heavy_cleanup_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
