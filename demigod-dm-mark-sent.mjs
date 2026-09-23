#!/usr/bin/env node
/** Append SENT-CONFIRMED to dm-send-log.txt after a real human DM send.
 * Also updates DM-BATCH-TRACKER.md Sent date when name matches a table row.
 *
 * Usage: node demigod-dm-mark-sent.mjs --handle=@marty_kausas --company=Pylon [--channel=x]
 *        node demigod-dm-mark-sent.mjs --from-file=dm-2026-07-09-marty.txt
 *        node demigod-dm-mark-sent.mjs --name=Marty
 *        node demigod-dm-mark-sent.mjs --name=T0 --channel=linkedin
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function outreachDir() {
  const root = process.env.DEMIGOD_ROOT || __dirname;
  return path.join(root, 'demigod-outreach');
}
const outreach = outreachDir();
fs.mkdirSync(outreach, { recursive: true });
const logPath = path.join(outreach, 'dm-send-log.txt');
const readyDir = path.join(outreach, 'ready-emails');
const trackerPath = path.join(outreach, 'DM-BATCH-TRACKER.md');

function parseArgs(argv) {
  const o = { handle: '', company: '', channel: 'x', fromFile: '', name: '' };
  for (const a of argv) {
    if (a.startsWith('--handle=')) o.handle = a.slice(9);
    else if (a.startsWith('--company=')) o.company = a.slice(10);
    else if (a.startsWith('--channel=')) o.channel = a.slice(10);
    else if (a.startsWith('--from-file=')) o.fromFile = a.slice(12);
    else if (a.startsWith('--name=')) o.name = a.slice(7);
  }
  return o;
}

function parseReadyFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const handle = (text.match(/handle:\s*(@\S+)/i) || [])[1] || '';
  const company = (text.match(/company:\s*(.+)/i) || [])[1]?.trim() || '';
  return { handle, company };
}

function alreadyConfirmed(existing, handle) {
  return existing
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
    .some((l) => {
      if (!/SENT-CONFIRMED/i.test(l)) return false;
      return l.split('|').map((part) => part.trim()).includes(handle);
    });
}

/** Patch the tracker row for this company. A handle fragment does not select another company. */
function updateTracker(company, day) {
  if (!fs.existsSync(trackerPath)) return { ok: false, reason: 'no tracker' };
  const companyKey = String(company || '').trim().toLowerCase();
  if (!companyKey) return { ok: false, reason: 'company_required' };
  const lines = fs.readFileSync(trackerPath, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, index) => {
    if (!line.startsWith('|') || line.includes('------') || line.includes('Sent date')) return;
    const parts = line.split('|');
    if (parts.length < 6) return;
    if ((parts[2] || '').trim().toLowerCase() === companyKey) hits.push(index);
  });
  if (hits.length === 0) return { ok: false, reason: 'company not in tracker table' };
  if (hits.length > 1) return { ok: false, reason: 'ambiguous_company' };
  const parts = lines[hits[0]].split('|');
  parts[4] = ` ${day} `;
  lines[hits[0]] = parts.join('|');
  fs.writeFileSync(trackerPath, lines.join('\n'));
  return { ok: true, path: trackerPath, company };
}

const args = parseArgs(process.argv.slice(2));
let resolvedName = args.name || '';
if (args.fromFile || args.name) {
  let file = args.fromFile;
  if (!file && args.name) {
    const slug = args.name.toLowerCase().replace(/\W+/g, '');
    const candidates = fs
      .readdirSync(readyDir)
      .filter((f) => f.includes(slug) && f.endsWith('.txt'));
    file = candidates[0] ? path.join(readyDir, candidates[0]) : '';
  } else if (file && !path.isAbsolute(file)) {
    file = path.join(readyDir, path.basename(file));
  }
  if (!file || !fs.existsSync(file)) {
    console.error('Ready file not found. Use --from-file=dm-2026-07-09-marty.txt or --name=Marty');
    process.exit(1);
  }
  const p = parseReadyFile(file);
  args.handle = args.handle || p.handle;
  args.company = args.company || p.company;
  if (!resolvedName) {
    const base = path.basename(file, '.txt'); // dm-2026-07-09-marty
    resolvedName = base.replace(/^dm-\d{4}-\d{2}-\d{2}-/, '');
    resolvedName = resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1);
  }
}

if (!args.handle || !args.company) {
  console.error('Usage: node demigod-dm-mark-sent.mjs --handle=@x --company=Co [--channel=x]');
  console.error('   or: node demigod-dm-mark-sent.mjs --name=Marty');
  process.exit(1);
}
if (!args.handle.startsWith('@')) args.handle = '@' + args.handle;

// Canonical display names for tracker
const NAME_MAP = {
  marty: 'Marty',
  hellyeah: 'Hellyeah',
  chai: 'Chai',
  heypocket: 'HeyPocket',
  t0: 'T0',
  camilo: 'Camilo',
  weave: 'Weave',
  vendo: 'Vendo',
};
if (resolvedName) {
  const k = resolvedName.toLowerCase().replace(/\W+/g, '');
  if (NAME_MAP[k]) resolvedName = NAME_MAP[k];
}

const day = new Date().toISOString().slice(0, 10);
const line = `SENT-CONFIRMED | ${day} | ${args.handle} | ${args.company} | ${args.channel}`;
const existing = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
if (alreadyConfirmed(existing, args.handle)) {
  console.log('Already logged:', args.handle);
  const tr = updateTracker(args.company, day);
  if (tr.ok) console.log('Tracker refreshed:', tr.path);
  process.exit(0);
}
fs.appendFileSync(logPath, `\n${line}\n`);
console.log('Appended:', line);
console.log('Log:', logPath);

const tr = updateTracker(args.company, day);
if (tr.ok) console.log('Tracker updated:', tr.path);
else console.log('Tracker note:', tr.reason);

console.log(JSON.stringify({
  ok: true,
  handle: args.handle,
  company: args.company,
  log: logPath,
  tracker: tr.ok ? tr.path : null,
  trackerReason: tr.ok ? null : tr.reason,
  sent: false,
  liveMail: false,
}));
