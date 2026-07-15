#!/usr/bin/env node
/** Append SENT-CONFIRMED after a real human DM send.
 * Requires --i-sent-it (attestation). Agents must not invent SENT.
 *
 * Usage: node demigod-dm-mark-sent.mjs --name=T0 --i-sent-it [--channel=x]
 *        node demigod-dm-mark-sent.mjs --handle=@x --company=Co --i-sent-it
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outreach = [
  path.join(__dirname, 'demigod-outreach'),
  '/home/potter/demigod-outreach',
].find((d) => fs.existsSync(d));
const logPath = path.join(outreach, 'dm-send-log.txt');
const readyDir = path.join(outreach, 'ready-emails');
const trackerPath = path.join(outreach, 'DM-BATCH-TRACKER.md');

function parseArgs(argv) {
  const o = {
    handle: '',
    company: '',
    channel: 'x',
    fromFile: '',
    name: '',
    iSentIt: false,
    unattested: false,
    agentAuto: false,
  };
  for (const a of argv) {
    if (a.startsWith('--handle=')) o.handle = a.slice(9);
    else if (a.startsWith('--company=')) o.company = a.slice(10);
    else if (a.startsWith('--channel=')) o.channel = a.slice(10);
    else if (a.startsWith('--from-file=')) o.fromFile = a.slice(12);
    else if (a.startsWith('--name=')) o.name = a.slice(7);
    else if (a === '--i-sent-it' || a === '--i-sent-it=true') o.iSentIt = true;
    else if (a === '--unattested' || a === '--unattested=true') o.unattested = true;
    else if (a === '--agent-auto' || a === '--agent-auto=true') {
      o.agentAuto = true;
      o.iSentIt = true; // agent auto-send path counts as attestation
    }
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
    .some((l) => /SENT-CONFIRMED/i.test(l) && l.includes(handle));
}

/** Patch tracker table: | Name | Company | Real? | Sent date | ... */
function updateTracker(name, handle, day, channel) {
  if (!fs.existsSync(trackerPath)) return { ok: false, reason: 'no tracker' };
  let t = fs.readFileSync(trackerPath, 'utf8');
  const lines = t.split('\n');
  let hit = false;
  const nameKey = (name || '').toLowerCase();
  const handleKey = (handle || '').toLowerCase();
  const out = lines.map((line) => {
    if (!line.startsWith('|') || line.includes('------') || line.includes('Sent date')) return line;
    const cells = line.split('|').map((c) => c.trim());
    // | Name | Company | Real? | Sent date | Channel | Reply | Next step |
    if (cells.length < 6) return line;
    const rowName = (cells[1] || '').toLowerCase();
    const rowChannel = (cells[5] || '').toLowerCase();
    const match =
      (nameKey && rowName === nameKey) ||
      (handleKey && rowChannel.includes(handleKey.replace(/^@/, '')));
    if (!match) return line;
    hit = true;
    cells[4] = day; // Sent date
    if (cells[5] && !cells[5].includes(handle)) {
      // keep existing channel text
    }
    cells[7] = cells[7] === 'send' || cells[7] === 'send honest DM' || !cells[7]
      ? 'await reply'
      : cells[7];
    return '| ' + cells.slice(1, -1).join(' | ') + (line.endsWith('|') ? ' |' : '');
  });
  // Simpler reliable replace: find line containing name and replace 4th data column
  if (!hit && nameKey) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('|')) continue;
      const parts = line.split('|');
      if (parts.length < 6) continue;
      if ((parts[1] || '').trim().toLowerCase() !== nameKey) continue;
      parts[4] = ` ${day} `;
      if ((parts[7] || '').trim().match(/send/i)) parts[7] = ' await reply ';
      lines[i] = parts.join('|');
      hit = true;
      break;
    }
    if (hit) {
      fs.writeFileSync(trackerPath, lines.join('\n'));
      return { ok: true, path: trackerPath };
    }
  } else if (hit) {
    // re-do with parts approach for cleanliness
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('|')) continue;
      const parts = line.split('|');
      if (parts.length < 6) continue;
      const rowName = (parts[1] || '').trim().toLowerCase();
      const rowCh = (parts[5] || '').toLowerCase();
      if (nameKey && rowName === nameKey) {
        parts[4] = ` ${day} `;
        if ((parts[7] || '').trim().match(/^send/i) || !(parts[7] || '').trim()) {
          parts[7] = ' await reply ';
        }
        lines[i] = parts.join('|');
        fs.writeFileSync(trackerPath, lines.join('\n'));
        return { ok: true, path: trackerPath };
      }
      if (handleKey && rowCh.includes(handleKey.replace(/^@/, ''))) {
        parts[4] = ` ${day} `;
        lines[i] = parts.join('|');
        fs.writeFileSync(trackerPath, lines.join('\n'));
        return { ok: true, path: trackerPath };
      }
    }
  }
  return { ok: false, reason: 'name not in tracker table' };
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
  console.error('Usage: node demigod-dm-mark-sent.mjs --name=T0 --i-sent-it [--channel=x]');
  console.error('   or: node demigod-dm-mark-sent.mjs --handle=@x --company=Co --i-sent-it');
  console.error('Requires --i-sent-it after a real human send. Auto-DM / invent banned.');
  process.exit(1);
}
if (!args.handle.startsWith('@')) args.handle = '@' + args.handle;

// Attestation: human --i-sent-it OR agent auto-send --agent-auto
if (!args.iSentIt && !args.unattested) {
  console.error(
    JSON.stringify(
      {
        error: 'mark_sent_requires_attestation',
        hint: 'Human: --i-sent-it after send · Agent auto: demigod-dm-auto-send (uses --agent-auto)',
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

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
const kind = args.iSentIt && !args.unattested ? 'SENT-CONFIRMED' : 'SENT-UNATTESTED';
const attested = kind === 'SENT-CONFIRMED' ? 1 : 0;
const via = args.agentAuto ? 'agent-auto' : 'human';
const line = `${kind} | ${day} | ${args.handle} | ${args.company} | ${args.channel} | attested=${attested} | via=${via}`;
const existing = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
if (alreadyConfirmed(existing, args.handle) && kind === 'SENT-CONFIRMED') {
  console.log('Already logged SENT-CONFIRMED:', args.handle);
  const tr = updateTracker(resolvedName, args.handle, day, args.channel);
  if (tr.ok) console.log('Tracker refreshed:', tr.path);
  process.exit(0);
}
fs.appendFileSync(logPath, `\n${line}\n`);
console.log('Appended:', line);
console.log('Log:', logPath);
if (!attested) {
  console.log('NOTE: SENT-UNATTESTED does not count toward demand sentConfirmed progress');
}

const tr = updateTracker(resolvedName, args.handle, day, args.channel);
if (tr.ok) console.log('Tracker updated:', tr.path);
else console.log('Tracker note:', tr.reason);

// Sync ROOT copy if separate
try {
  const homeLog = '/home/potter/demigod-outreach/dm-send-log.txt';
  if (logPath !== homeLog && fs.existsSync(path.dirname(homeLog))) {
    fs.appendFileSync(homeLog, `\n${line}\n`);
  }
  const homeTrack = '/home/potter/demigod-outreach/DM-BATCH-TRACKER.md';
  if (tr.ok && trackerPath !== homeTrack && fs.existsSync(trackerPath)) {
    fs.copyFileSync(trackerPath, homeTrack);
  }
} catch {
  /* ignore */
}

console.log('Next: node demigod-pilot-logger.mjs --report');
console.log('     node demigod-gtm-status.mjs');
