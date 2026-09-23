#!/usr/bin/env node
/**
 * Local DM drafts for a planted board in an explicit data root.
 * Writes DEMIGOD-GTM-PREP-SENDS.json under DEMIGOD_ROOT. Does not send mail.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = {
  sent: false,
  liveMail: false,
  livePublish: false,
  liveFetch: false,
};
const TEMPLATES = {
  'Product Manager': 'dms-2026-07-07-product-manager.txt',
  'Founding Designer': 'dms-2026-07-07-founding-designer.txt',
  'Head of Growth': 'dms-2026-07-07-head-of-growth.txt',
};

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || '';
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-GTM-PREP-SENDS.json');
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
    return { parseError: true, roles: [] };
  }
}

function slug(title) {
  const clean = String(title || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return clean || 'role';
}

function selectedRoles(board) {
  return (board.roles || [])
    .filter((role) => role && (!role.pilot || role.status === 'Active'))
    .slice(0, 5);
}

function main() {
  if (
    process.argv.includes('--publish')
    || process.argv.includes('--push')
    || process.argv.includes('--live')
    || process.argv.includes('--send')
    || process.argv.includes('--mail')
    || process.argv.includes('--dm')
  ) {
    refuse('publish_refused');
  }
  const root = dataRoot();
  if (!root || path.resolve(root) === '/home/potter' || path.resolve(root) === path.resolve(scriptDir())) {
    refuse('prep_root_required');
  }
  const footText = readText(root, 'demigod-foot-core.js');
  const board = readBoard(root);
  if (footText == null && board == null) refuse('source_required');
  const footMarker = ((footText || '').match(/Harbor \S+ keep/) || [''])[0];
  const roles = board && !board.parseError ? selectedRoles(board) : [];
  const prepared = [];
  const missing = [];
  for (const role of roles) {
    const title = role.title || 'Role';
    const templateName = TEMPLATES[title];
    const template = templateName
      ? readText(root, path.join('demigod-outreach', templateName))
      : null;
    const hook = template != null && /90\s*-?\s*day|90d/i.test(template);
    if (!template || !hook) {
      missing.push(title);
      continue;
    }
    const body = template.replace(/\[Name\/Team\]/g, `Founder/Team at ${role.stageType || 'your startup'}`);
    prepared.push({ title, stageType: role.stageType || '', slug: slug(title), body });
  }
  const pass = roles.length > 0 && missing.length === 0 && prepared.length === roles.length;
  const day = new Date().toISOString().slice(0, 10);
  const sendDir = path.join(root, 'demigod-outreach', `sends-${day}`);
  const report = reportPath();
  const logFile = path.join(sendDir, 'SEND-LOG.txt');
  const draftFiles = prepared.map((item) => path.join(sendDir, `${item.slug}.txt`));
  if (
    !insideRoot(root, sendDir)
    || !insideRoot(root, report)
    || !insideRoot(root, logFile)
    || draftFiles.some((file) => !insideRoot(root, file))
  ) {
    refuse('prep_root_required');
  }
  if (pass) {
    fs.mkdirSync(sendDir, { recursive: true });
    const lines = [`DM prep ${day}`, 'sent: false', footMarker];
    for (const item of prepared) {
      const file = path.join(sendDir, `${item.slug}.txt`);
      fs.writeFileSync(file, item.body);
      lines.push(`- ${item.title} (${item.stageType}): ${path.basename(file)}`);
      lines.push('  90d hook included. Reply to hello@ or use brief.');
    }
    fs.writeFileSync(logFile, `${lines.join('\n')}\n`);
  }
  const stored = {
    ok: pass,
    at: new Date().toISOString(),
    path: report,
    sendDir: pass ? sendDir : null,
    day,
    source: 'disk',
    footMarker,
    roles: roles.map((role) => role.title || 'Role'),
    prepared: prepared.map((item) => item.title),
    missing,
    drafts: pass ? draftFiles.length : 0,
    ...localFlags,
  };
  fs.writeFileSync(report, JSON.stringify(stored, null, 2));
  console.log(JSON.stringify({
    ok: pass,
    path: report,
    sendDir: stored.sendDir,
    day,
    source: 'disk',
    footMarker,
    roles: stored.roles.length,
    prepared: stored.prepared.length,
    missing: missing.length,
    drafts: stored.drafts,
    titles: stored.prepared,
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
      error: 'gtm_prep_failed',
      detail: String(e.message || e),
      ...localFlags,
    }));
    process.exit(1);
  }
}
