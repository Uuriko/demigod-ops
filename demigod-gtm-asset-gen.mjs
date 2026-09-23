#!/usr/bin/env node
/**
 * Local proof pack for a planted board in an explicit data root.
 * Writes DEMIGOD-GTM-ASSET.json under DEMIGOD_ROOT. Does not send mail.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
  attached: false,
};
const NOTE = 'Pre-services honest. hello@ follows up. SMS pending.';

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-GTM-ASSET.json');
}
function shotDir() {
  return path.join(dataRoot(), 'audit-shots', 'gtm-asset');
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

function readBoard(root) {
  const text = readText(root, 'DEMIGOD-BOARD.json');
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { parseError: true, roles: [], receipts: [], signal: {} };
  }
}

function counts(board) {
  const roles = Array.isArray(board.roles) ? board.roles : [];
  const receipts = Array.isArray(board.receipts) ? board.receipts : [];
  const signal = board.signal || {};
  return {
    roles: roles.length,
    realRoles: roles.filter((role) => role && role.sample === false).length,
    realReceipts: receipts.filter((row) => row && row.sample === false).length,
    declaredRoles: Number(signal.realRoles) || 0,
    declaredReceipts: Number(signal.realReceipts) || 0,
    title: roles[0] && roles[0].title ? String(roles[0].title) : '',
  };
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--fetch')
    || process.argv.includes('--mail')
    || process.argv.includes('--dm')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('gtm_root_required');
  }
  const footText = readText(root, 'demigod-foot-core.js');
  const board = readBoard(root);
  if (footText == null && board == null) refuse('source_required');
  const found = counts(board || {});
  const proofText = readText(root, 'demigod-gtm-proof.txt');
  const proof = proofText != null;
  const honest = board != null
    && !board.parseError
    && found.realRoles === found.declaredRoles
    && found.realReceipts === found.declaredReceipts;
  const pass = honest && (found.realRoles + found.realReceipts === 0 || proof);
  const footMarker = ((footText || proofText || '').match(/Harbor \S+ keep/) || [''])[0];
  const dir = shotDir();
  const shot = path.join(dir, 'proof.shot');
  const report = reportPath();
  if (!insideRoot(root, dir) || !insideRoot(root, shot) || !insideRoot(root, report)) {
    refuse('gtm_root_required');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(shot, `${footMarker}\n${proof ? 'proof' : 'missing'}\n`);
  const body = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    shot,
    source: 'disk',
    footMarker,
    note: NOTE,
    board: {
      roles: found.roles,
      realRoles: found.realRoles,
      realReceipts: found.realReceipts,
      title: found.title,
    },
    honest,
    proof,
    files: [shot],
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(body, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    shot,
    source: 'disk',
    footMarker,
    roles: found.roles,
    realRoles: found.realRoles,
    realReceipts: found.realReceipts,
    title: found.title,
    honest,
    proof,
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
      error: 'gtm_asset_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
