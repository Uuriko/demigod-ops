#!/usr/bin/env node
/** Generate personalized founder outreach (DM + email).
 * --dry (default): write ready-emails only.
 * --send: refused unless DEMIGOD_ALLOW_AUTO_DM=1 (user stopped auto-DM 2026-07-15).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';

const OUTREACH = path.join(ROOT, 'demigod-outreach');
const CSV = path.join(OUTREACH, 'founders.csv');
const TEMPLATE = path.join(OUTREACH, 'template-dm.md');
const READY = path.join(OUTREACH, 'ready-emails');
const LOG = path.join(OUTREACH, 'blast-log.json');

const DEFAULT_TEMPLATE = `Hey {{name}} — saw {{trigger}} at {{company}}.

Demigod matches SF startups with human-curated talent — 10% on hire only, no marketplace, no AI blast.

If you are hiring, submit a brief at https://www.trydemigod.com/?wiz=startup. A human reviews every role.

hello@trydemigod.com`;

function parseArgs(argv) {
  const out = {
    dry: true,
    limit: 50,
    csv: CSV,
    template: TEMPLATE,
    markSent: null,
    prune: false,
    logPrepared: false,
    help: false,
    send: false,
  };
  for (const a of argv) {
    if (a === '--send' || a === '--send=true' || a.startsWith('--send=')) {
      out.send = true;
      out.dry = false;
    } else if (a === '--dry') out.dry = true;
    else if (a === '--prune') out.prune = true;
    else if (a === '--log-prepared') out.logPrepared = true;
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

function ensureSamples() {
  fs.mkdirSync(OUTREACH, { recursive: true });
  if (!fs.existsSync(CSV)) {
    fs.writeFileSync(CSV, [
      'name,company,trigger,email,handle,channel',
      'Alex,Stealth AI agent co,your backend eng post on X,,@alexseed,dm',
      'Jordan,Seed fintech,YC WaS founding PM role,,,email',
    ].join('\n') + '\n');
  }
  if (!fs.existsSync(TEMPLATE)) {
    fs.writeFileSync(TEMPLATE, DEFAULT_TEMPLATE);
  }
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
  --send            Auto-send via CDP X (requires logged-in session on :9223)
  --limit=N         Max rows
  --csv=PATH        Custom CSV (must have name,company,trigger[,why,email,handle])
  --template=PATH   Custom template with {{name}} {{company}} {{trigger}} {{why}}
  --mark-sent=Name  Mark a generated item as sent, log to tracker (status=dm-sent)
  --prune           Keep only files from latest batch
  --log-prepared    After generate, log each to tracker as dm-prepared
  --help            This help

Examples:
  node ... --dry --limit=5
  node ... --send --limit=3
  bin/dg demand send --names=T0,Hellyeah,Weave
  node ... --log-prepared
  node ... --mark-sent=Marty
`);
    return;
  }
  ensureSamples();

  if (args.send) {
    if (process.env.DEMIGOD_ALLOW_AUTO_DM !== '1' && process.env.DEMIGOD_ALLOW_AUTO_DM !== 'true') {
      console.error(
        JSON.stringify({
          error: 'auto_dm_stopped',
          hint: 'Auto-DM disabled. Use --dry for ready-emails only.',
        }),
      );
      process.exit(2);
    }
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'demigod-dm-auto-send.mjs'), `--timeout=120000`],
      { cwd: ROOT, encoding: 'utf8', timeout: 600000, stdio: 'inherit' },
    );
    process.exit(r.status ?? 1);
  }

  if (args.markSent) {
    const log = loadLog();
    const item = (log.runs.flatMap(r => r.items || []).find(i => i.name.toLowerCase() === args.markSent.toLowerCase()));
    if (item) {
      log.sent = (log.sent || []).filter(s => s.name !== args.markSent);
      log.sent.push({ name: args.markSent, at: new Date().toISOString(), batch: item.id });
      fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
      // Log to tracker as dm-sent
      const track = spawnSync('node', ['demigod-pilot-tracker.mjs', `--founderEmail=${item.name.toLowerCase().replace(/\W+/g,'')}+dm@trydemigod.com`, '--status=dm-sent', `--brief=DM sent batch ${item.id}`], { encoding: 'utf8' });
      console.log('Marked sent and logged to tracker:', args.markSent);
      if (track.stdout) console.log(track.stdout.trim());
    } else {
      console.error('Not found in runs:', args.markSent);
    }
    return;
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

  fs.mkdirSync(READY, { recursive: true });
  const batchId = crypto.randomBytes(4).toString('hex');
  const generated = [];

  for (const row of rows) {
    const body = fill(template, row);
    const id = `${batchId}-${row.name.toLowerCase().replace(/\W+/g, '').slice(0, 12)}`;
    const base = path.join(READY, id);
    const subject = `SF talent match for ${row.company} — human-curated`;
    const dmPath = `${base}-dm.txt`;
    const emailPath = `${base}-email.txt`;

    fs.writeFileSync(dmPath, body);
    if (row.email) {
      fs.writeFileSync(emailPath, `To: ${row.email}\nSubject: ${subject}\n\n${body}`);
    }

    generated.push({
      id,
      at: new Date().toISOString(),
      name: row.name,
      company: row.company,
      channel: row.channel || (row.email ? 'email' : 'dm'),
      dmFile: path.relative(ROOT, dmPath),
      emailFile: row.email ? path.relative(ROOT, emailPath) : null,
    });
  }

  if (args.logPrepared) {
    console.log('Logging prepared to tracker as dm-prepared...');
    for (const g of generated) {
      const fakeEmail = g.name.toLowerCase().replace(/\W+/g, '') + '+dm@trydemigod.com';
      const brief = `DM prepared batch ${batchId} for ${g.company} (${g.channel})`;
      const res = spawnSync('node', ['demigod-pilot-tracker.mjs', `--founderEmail=${fakeEmail}`, '--status=dm-prepared', `--brief=${brief}`], { encoding: 'utf8' });
      if (res.stdout) console.log(res.stdout.trim());
    }
  }

  const log = loadLog();
  const run = { batchId, at: new Date().toISOString(), count: generated.length, dry: true, items: generated };
  log.runs = (log.runs || []).slice(-49);
  log.runs.push(run);
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));

  console.log(JSON.stringify({
    ok: true,
    dry: true,
    batchId,
    count: generated.length,
    readyDir: path.relative(ROOT, READY),
    log: path.relative(ROOT, LOG),
    next: 'Review ready-emails/* then send manually. Use --mark-sent=Name to log sent+track, or --log-prepared on generate.',
  }, null, 2));
}

main();