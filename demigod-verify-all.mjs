#!/usr/bin/env node
/**
 * Local verify-all report for an explicit data root.
 * Writes DEMIGOD-VERIFY-ALL.json there and runs only step files inside that root.
 * Does not spawn /home/potter, open a browser, or publish.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false, liveFetch: false };
const STEPS = [
  'demigod-verify-board-honesty.mjs',
  'demigod-live-lib.test.mjs',
  'demigod-board-lib.test.mjs',
  'demigod-verify-source.mjs',
  'demigod-verify-live.mjs',
  'demigod-verify-receipt.mjs',
  'demigod-verify-signal-theater.mjs',
  'demigod-foot-smoke.mjs',
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-VERIFY-ALL.json');
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
  for (const name of ['demigod-verify-note.txt', 'demigod-foot-core.js']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    return fs.readFileSync(file, 'utf8');
  }
  return null;
}

function runStep(root, name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file) || !insideRoot(root, file)) {
    return { script: name, present: false, status: null };
  }
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.isSymbolicLink()) {
    return { script: name, present: false, status: null };
  }
  const child = spawnSync(process.execPath, [file], {
    cwd: root,
    env: {
      ...process.env,
      DEMIGOD_ROOT: root,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
      CDP_URL: 'http://127.0.0.1:9',
      DEMIGOD_DASH: 'http://127.0.0.1:9',
    },
    encoding: 'utf8',
    timeout: 8000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { script: name, present: true, status: child.status ?? 1 };
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--ship')
    || process.argv.includes('--wizard')
    || process.argv.includes('--browser')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('verify_root_required');
  }
  const note = readNote(root);
  if (note == null) refuse('source_required');
  const steps = STEPS.map((name) => runStep(root, name));
  const present = steps.filter((step) => step.present);
  if (present.length === 0) refuse('steps_required');
  const failed = present.filter((step) => step.status !== 0).length;
  const footMarker = (note.match(/Harbor \S+ keep/) || [''])[0];
  const report = {
    ok: failed === 0,
    at: new Date().toISOString(),
    path: reportPath(),
    source: 'disk',
    footMarker,
    steps,
    spawned: present.length,
    failed,
    ...localFlags,
  };
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: report.ok,
    path: report.path,
    source: report.source,
    footMarker,
    spawned: report.spawned,
    failed,
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
    console.error(JSON.stringify({ ok: false, error: 'verify_all_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
