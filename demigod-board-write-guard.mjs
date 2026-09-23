#!/usr/bin/env node
/**
 * Local board honesty check in an explicit data root.
 * Writes DEMIGOD-BOARD-WRITE-GUARD.json under DEMIGOD_ROOT. Does not spawn a child.
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

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath(root) {
  return path.join(root, 'DEMIGOD-BOARD-WRITE-GUARD.json');
}
function shotDir(root) {
  return path.join(root, 'audit-shots', 'board-write-guard');
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

function entryStat(root, relOrAbs) {
  const file = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(root, relOrAbs);
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

function readText(root, relOrAbs) {
  const found = entryStat(root, relOrAbs);
  if (!found || !found.st.isFile()) return null;
  return fs.readFileSync(found.file, 'utf8');
}

function jsonArg(argv) {
  const i = argv.indexOf('--json');
  if (i === -1) return null;
  return argv[i + 1] || '';
}

function analyze(board) {
  const roles = Array.isArray(board.roles) ? board.roles : [];
  const receipts = Array.isArray(board.receipts) ? board.receipts : [];
  const realRoles = roles.filter((role) => role && role.sample === false);
  const realReceipts = receipts.filter((receipt) => receipt && receipt.sample === false);
  const sampleRoles = roles.filter((role) => role && role.sample !== false);
  const issues = [];
  if (roles.length > 3) issues.push({ severity: 'P0', msg: `roles=${roles.length} > 3 cap` });
  if (realRoles.length > 0 && !board.allowRealRoles) {
    issues.push({
      severity: 'P0',
      msg: `realRoles=${realRoles.length} without allowRealRoles flag`,
    });
  }
  if (realReceipts.length > 0 && !board.allowRealReceipts) {
    issues.push({
      severity: 'P0',
      msg: `realReceipts=${realReceipts.length} without allowRealReceipts`,
    });
  }
  return {
    counts: {
      roles: roles.length,
      sampleRoles: sampleRoles.length,
      realRoles: realRoles.length,
      realReceipts: realReceipts.length,
    },
    issues,
  };
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
    refuse('guard_root_required');
  }
  const requested = jsonArg(process.argv);
  if (requested != null && !insideRoot(root, requested)) refuse('guard_root_required');
  const boardRel = requested == null ? 'DEMIGOD-BOARD.json' : requested;
  const footText = readText(root, 'demigod-foot-core.js');
  const boardText = readText(root, boardRel);
  if (boardText == null) refuse('source_required');
  const board = JSON.parse(boardText);
  const analyzed = analyze(board);
  const pass = analyzed.issues.length === 0;
  const footMarker = ((footText || boardText).match(/Harbor \S+ keep/) || [''])[0];
  const dir = shotDir(root);
  const shot = path.join(dir, 'guard.shot');
  const report = reportPath(root);
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('guard_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\n${pass ? 'complete' : 'missing'}\n`);
  const body = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    shot,
    source: 'disk',
    footMarker,
    counts: analyzed.counts,
    issues: analyzed.issues,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    issues: analyzed.issues.length,
    realRoles: analyzed.counts.realRoles,
    realReceipts: analyzed.counts.realReceipts,
    roles: analyzed.counts.roles,
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
      error: 'guard_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
