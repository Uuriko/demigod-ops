#!/usr/bin/env node
/**
 * PLAN-LEDGER — plans cannot die silently.
 *
 * Usage:
 *   node demigod-plan-ledger.mjs list
 *   node demigod-plan-ledger.mjs add --title "..." --owner fable --paths demigod-foot-core.js --verify "npm run demigod:verify:source" --stop "gates green"
 *   node demigod-plan-ledger.mjs set <id> --status applied|partial|ignored|proposed --note "..."
 *   node demigod-plan-ledger.mjs open
 *   node demigod-plan-ledger.mjs show <id>
 *
 * The ledger and open list are written in DEMIGOD_ROOT. The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { PLAN_STATUSES, atomicWrite } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function ledgerPath() {
  return path.join(dataRoot(), 'DEMIGOD-PLAN-LEDGER.json');
}

function openPath() {
  return path.join(dataRoot(), 'DEMIGOD-PLAN-LEDGER-OPEN.json');
}

function lockPath() {
  return path.join(dataRoot(), 'DEMIGOD-PLAN-LEDGER.lock');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function diskFootVer() {
  try {
    const foot = fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
    return (foot.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
  } catch {
    return null;
  }
}

function load() {
  const file = ledgerPath();
  if (!fs.existsSync(file)) {
    return { schema: 1, plans: [], at: new Date().toISOString() };
  }
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!j || !Array.isArray(j.plans)) throw new Error('invalid ledger shape');
    return j;
  } catch (e) {
    const bak = file + '.corrupt-' + Date.now();
    try {
      fs.copyFileSync(file, bak);
    } catch {
      /* */
    }
    console.error(
      JSON.stringify({
        ok: false,
        error: 'ledger_corrupt',
        backup: bak,
        detail: String(e.message || e),
      }),
    );
    process.exit(1);
  }
}

function save(data) {
  data.at = new Date().toISOString();
  data.path = ledgerPath();
  data.diskFootVer = diskFootVer();
  data.sent = false;
  data.liveMail = false;
  data.livePublish = false;
  const body = JSON.stringify(data, null, 2) + '\n';
  // Best-effort serialize concurrent writers in this data root
  spawnSync('flock', ['-w', '20', lockPath(), '-c', 'true'], { timeout: 20000 });
  atomicWrite(ledgerPath(), body);
  atomicWrite(
    openPath(),
    JSON.stringify(
      {
        at: data.at,
        path: openPath(),
        diskFootVer: data.diskFootVer,
        open: data.plans.filter((p) => !['applied', 'ignored'].includes(p.status)),
        sent: false,
        liveMail: false,
        livePublish: false,
      },
      null,
      2,
    ) + '\n',
  );
}

function findPlan(data, pid) {
  // Prefer exact match to avoid ambiguous prefix updates
  const exact = data.plans.find((p) => p.id === pid);
  if (exact) return exact;
  const hits = data.plans.filter((p) => p.id.startsWith(pid));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    console.error(JSON.stringify({ ok: false, error: 'ambiguous_id', id: pid, matches: hits.map((h) => h.id) }));
    process.exit(1);
  }
  return null;
}

function id() {
  return `plan_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

function opt(args, name, def = null) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return def;
}

function multi(args, name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) out.push(args[++i]);
  }
  return out;
}

const args = process.argv.slice(2);
if (args.includes('--publish')) fail('publish_refused');
const cmd = args[0] || 'list';

if (cmd === 'list' || cmd === 'open') {
  const data = load();
  const plans =
    cmd === 'open'
      ? data.plans.filter((p) => !['applied', 'ignored'].includes(p.status))
      : data.plans;
  console.log(JSON.stringify({
    at: data.at,
    path: ledgerPath(),
    openPath: openPath(),
    diskFootVer: diskFootVer(),
    count: plans.length,
    plans,
    sent: false,
    liveMail: false,
    livePublish: false,
  }, null, 2));
} else if (cmd === 'add') {
  const data = load();
  const plan = {
    id: id(),
    at: new Date().toISOString(),
    status: 'proposed',
    title: opt(args, '--title', 'untitled'),
    owner: opt(args, '--owner', 'fable'),
    paths: multi(args, '--paths'),
    verify: multi(args, '--verify'),
    stop: opt(args, '--stop', ''),
    source: opt(args, '--source', ''),
    note: opt(args, '--note', ''),
    history: [{ at: new Date().toISOString(), status: 'proposed', by: opt(args, '--by', 'agent') }],
  };
  data.plans.unshift(plan);
  save(data);
  console.log(JSON.stringify({
    ok: true,
    path: ledgerPath(),
    openPath: openPath(),
    diskFootVer: diskFootVer(),
    sent: false,
    liveMail: false,
    livePublish: false,
    plan,
  }, null, 2));
} else if (cmd === 'set') {
  const pid = args[1];
  const status = opt(args, '--status');
  const note = opt(args, '--note', '');
  const by = opt(args, '--by', process.env.DG_LOCK_OWNER || 'grok');
  if (!pid || !status) {
    console.error(
      'usage: set <id> --status proposed|partial|applied|ignored|blocked|review [--note ...]',
    );
    process.exit(2);
  }
  if (!PLAN_STATUSES.has(status)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'invalid_status',
        status,
        allowed: [...PLAN_STATUSES],
      }),
    );
    process.exit(2);
  }
  const data = load();
  const plan = findPlan(data, pid);
  if (!plan) {
    console.error(JSON.stringify({ ok: false, error: 'not_found', id: pid }));
    process.exit(1);
  }
  plan.status = status;
  plan.updatedAt = new Date().toISOString();
  if (note) plan.note = note;
  if (status === 'applied') {
    try {
      const foot = path.join(dataRoot(), 'demigod-foot-core.js');
      if (fs.existsSync(foot)) {
        plan.afterSha = crypto.createHash('sha256').update(fs.readFileSync(foot)).digest('hex');
      }
    } catch {
      /* */
    }
  }
  plan.history = plan.history || [];
  plan.history.push({ at: new Date().toISOString(), status, by, note });
  save(data);
  console.log(JSON.stringify({
    ok: true,
    path: ledgerPath(),
    openPath: openPath(),
    diskFootVer: diskFootVer(),
    sent: false,
    liveMail: false,
    livePublish: false,
    plan,
  }, null, 2));
} else if (cmd === 'show') {
  const pid = args[1];
  const data = load();
  const plan = findPlan(data, pid);
  console.log(JSON.stringify(plan || { error: 'not_found' }, null, 2));
  if (!plan) process.exit(1);
} else {
  console.error('usage: list | open | add | set | show');
  process.exit(2);
}
