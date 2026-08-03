#!/usr/bin/env node
/** Generate personalized founder outreach drafts. Delivery is permanently disabled. */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ROOT } from './demigod-turn-lib.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { firstUsableOutreachEmail } from './demigod-lead-collect.mjs';
import { projectDraftText } from './demigod-submissions-lib.mjs';

const OUTREACH = path.resolve(process.env.DEMIGOD_OUTREACH_DIR || path.join(ROOT, 'demigod-outreach'));
const CSV = path.join(OUTREACH, 'founders.csv');
const TEMPLATE = path.join(OUTREACH, 'template-dm.md');
const READY = path.join(OUTREACH, 'ready-emails');
const LOG = path.join(OUTREACH, 'blast-log.json');

const DEFAULT_TEMPLATE = `Hey {{name}} — saw {{trigger}} at {{company}}.

Demigod matches SF startups with human-curated talent — 10% on hire only, no marketplace, no AI blast.

If you are hiring, submit a brief at https://www.trydemigod.com/?wiz=startup. A human reviews every role.

potter@trydemigod.com`;

function parseArgs(argv) {
  const out = {
    dry: true,
    limit: 50,
    csv: CSV,
    template: TEMPLATE,
    markSent: null,
    prune: false,
    help: false,
    send: false,
  };
  for (const a of argv) {
    if (a === '--send' || a === '--send=true' || a.startsWith('--send=')) {
      out.send = true;
      out.dry = false;
    } else if (a === '--dry') out.dry = true;
    else if (a === '--prune') out.prune = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--limit=')) out.limit = Number(a.split('=')[1]) || 50;
    else if (a.startsWith('--csv=')) out.csv = path.resolve(a.split('=')[1]);
    else if (a.startsWith('--template=')) out.template = path.resolve(a.split('=')[1]);
    else if (a.startsWith('--mark-sent=')) out.markSent = a.split('=')[1];
  }
  return out;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (k) => headers.indexOf(k);
  const need = ['name', 'company', 'trigger'];
  for (const n of need) {
    if (idx(n) < 0) throw new Error(`founders.csv missing column: ${n}`);
  }
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      name: cols[idx('name')] || '',
      company: cols[idx('company')] || '',
      trigger: cols[idx('trigger')] || '',
      email: idx('email') >= 0 ? cols[idx('email')] : '',
      handle: idx('handle') >= 0 ? cols[idx('handle')] : '',
      channel: idx('channel') >= 0 ? cols[idx('channel')] : 'dm',
      why: idx('why') >= 0 ? cols[idx('why')] : '',
    };
  }).filter((r) => r.name && r.company);
}

function fill(template, row) {
  return template
    .replace(/\{\{name\}\}/g, row.name)
    .replace(/\{\{company\}\}/g, row.company)
    .replace(/\{\{trigger\}\}/g, row.trigger || 'you hiring')
    .replace(/\{\{why\}\}/g, row.why || 'strong match for your team');
}

function loadLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG, 'utf8'));
  } catch {
    return { runs: [], sent: [] };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node demigod-founder-dm-blast.mjs [options]
Options:
  --dry (default)   Generate ready files only (safe)
  --send            Refused; this tool only generates drafts
  --limit=N         Max rows
  --csv=PATH        Custom CSV (must have name,company,trigger[,why,email,handle])
  --template=PATH   Custom template with {{name}} {{company}} {{trigger}} {{why}}
  --mark-sent=Name  Refused; a local draft cannot prove external delivery
  --prune           Keep only files from latest batch
  --help            This help

Examples:
  node ... --dry --limit=5
`);
    return;
  }

  if (args.send) {
    console.error(JSON.stringify({
      error: 'auto_dm_stopped',
      overrideAllowed: false,
      hint: 'Use --dry; this tool has no delivery path.',
    }));
    process.exit(2);
  }

  if (args.markSent) {
    console.error(JSON.stringify({
      error: 'external_delivery_receipt_required',
      hint: 'This drafts-only tool cannot attest delivery.',
    }));
    process.exit(2);
  }

  if (!fs.existsSync(args.csv)) {
    console.error(`Missing founder CSV: ${args.csv}`);
    process.exit(1);
  }

  if (args.prune) {
    const log = loadLog();
    const latest = (log.runs || []).slice(-1)[0];
    if (latest) {
      const keep = new Set((latest.items || []).map(i => path.basename(i.dmFile).replace(/-dm\.txt$/, '')));
      fs.readdirSync(READY).forEach(f => {
        const base = f.replace(/-dm\.txt$|-email\.txt$/, '');
        if (!keep.has(base)) fs.unlinkSync(path.join(READY, f));
      });
      console.log('Pruned ready-emails to latest batch', latest.batchId);
    }
    return;
  }

  const template = fs.existsSync(args.template)
    ? fs.readFileSync(args.template, 'utf8')
    : DEFAULT_TEMPLATE;
  const rows = parseCsv(fs.readFileSync(args.csv, 'utf8')).slice(0, args.limit);

  fs.mkdirSync(READY, { recursive: true, mode: 0o700 });
  fs.chmodSync(READY, 0o700);
  const batchId = crypto.randomBytes(4).toString('hex');
  const generated = [];

  for (const row of rows) {
    const safeRow = {
      ...row,
      name: projectDraftText(row.name, 80),
      company: projectDraftText(row.company, 120),
      trigger: projectDraftText(row.trigger, 240),
      why: projectDraftText(row.why, 240),
    };
    const email = firstUsableOutreachEmail(row.email);
    const body = fill(template, safeRow);
    const id = `${batchId}-${safeRow.name.toLowerCase().replace(/\W+/g, '').slice(0, 12)}`;
    const base = path.join(READY, id);
    const subject = `SF talent match for ${safeRow.company} — human-curated`;
    const dmPath = `${base}-dm.txt`;
    const emailPath = `${base}-email.txt`;

    atomicWrite(dmPath, body, { mode: 0o600 });
    if (email) {
      atomicWrite(emailPath, `To: ${email}\nSubject: ${subject}\n\n${body}`, { mode: 0o600 });
    }

    generated.push({
      id,
      at: new Date().toISOString(),
      name: safeRow.name,
      company: safeRow.company,
      channel: row.channel || (email ? 'email' : 'dm'),
      dmFile: path.relative(ROOT, dmPath),
      emailFile: email ? path.relative(ROOT, emailPath) : null,
    });
  }

  const log = loadLog();
  const run = { batchId, at: new Date().toISOString(), count: generated.length, dry: true, items: generated };
  log.runs = (log.runs || []).slice(-49);
  log.runs.push(run);
  atomicWrite(LOG, JSON.stringify(log, null, 2) + '\n', { mode: 0o600 });

  console.log(JSON.stringify({
    ok: true,
    dry: true,
    batchId,
    count: generated.length,
    readyDir: path.relative(ROOT, READY),
    log: path.relative(ROOT, LOG),
    next: 'Review ready-emails/*; delivery remains outside this drafts-only tool.',
  }, null, 2));
}

main();
