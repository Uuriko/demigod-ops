#!/usr/bin/env node
/**
 * demigod-work-find — always discover NEW work (never "nothing to do").
 *
 *   node demigod-work-find.mjs
 *   node demigod-work-find.mjs --json
 *
 * Writes /tmp/dg-busy/work-queue.jsonl (append) + /tmp/dg-busy/WORK-FOUND.md
 * Consumed by demigod-useful-loop (pops oldest unclaimed product tasks).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const QUEUE = path.join(BUSY, 'work-queue.jsonl');
const FOUND = path.join(BUSY, 'WORK-FOUND.md');
const SEEN = path.join(BUSY, 'work-find-seen.json');

function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function sh(cmd, timeout = 30000) {
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
  });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || ''), status: r.status };
}

function loadSeen() {
  const s = readJson(SEEN, { keys: [] });
  return new Set(Array.isArray(s.keys) ? s.keys : []);
}

function saveSeen(set) {
  const keys = [...set].slice(-500);
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(SEEN, JSON.stringify({ at: new Date().toISOString(), keys }, null, 2) + '\n');
}

function pushWork(seen, items, item) {
  const baseKey = item.key || `${item.kind}:${item.title}`;
  const key = item.repeatable ? `${baseKey}@${new Date().toISOString().slice(0, 13)}` : baseKey;
  if (seen.has(key)) return false;
  seen.add(key);
  items.push({ ...item, key, at: new Date().toISOString(), status: 'open' });
  return true;
}

function main() {
  fs.mkdirSync(BUSY, { recursive: true });
  const seen = loadSeen();
  const found = [];
  const events = (() => {
    const r = spawnSync(process.execPath, ['demigod-events-online.mjs', 'status'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60000,
    });
    try {
      return JSON.parse((r.stdout || '').match(/\{[\s\S]*\}/)?.[0] || 'null');
    } catch {
      return null;
    }
  })();
  const truth = readJson(path.join(BUSY, 'truth.json'));
  const freeze = readJson(path.join(BUSY, 'publish-freeze.json'));
  const api = readJson(path.join(ROOT, 'DEMIGOD-EVENTS-API.json'));
  const pending = readJson(path.join(BUSY, 'events-bot', 'events-api-latest.pending.json'));
  const cdn = (() => {
    const r = spawnSync(
      'curl',
      ['-sS', '-m', '8', 'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@main/events-api-latest.json'],
      { encoding: 'utf8', timeout: 15000 },
    );
    try {
      return JSON.parse(r.stdout || 'null');
    } catch {
      return null;
    }
  })();
  const store = readJson(path.join(ROOT, 'DEMIGOD-EVENTS.json'));
  const demand = readJson(path.join(BUSY, 'demand-status.json'));
  const inviteDrain = readJson(path.join(BUSY, 'events-bot', 'invite-drain-latest.json'));
  const funnel = (() => {
    const r = spawnSync('bash', [path.join(ROOT, 'bin/dg'), 'funnel', 'status'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60000,
    });
    try {
      return JSON.parse(r.stdout || 'null');
    } catch {
      return null;
    }
  })();

  // --- discoveries ---
  if (events?.needHeal || events?.public === false) {
    pushWork(seen, found, {
      kind: 'heal',
      pri: 0,
      title: 'Events public tunnel needHeal',
      task: 'events-heal',
      repeatable: true,
    });
  }
  if (events?.nativeRsvpRoutes === false) {
    pushWork(seen, found, {
      kind: 'restart',
      pri: 0,
      title: 'Native RSVP routes missing on events app',
      task: 'events-restart-routes',
      repeatable: true,
    });
  }
  if (cdn?.apiBase && api?.apiBase && cdn.apiBase !== api.apiBase && pending?.apiBase !== api.apiBase) {
    pushWork(seen, found, {
      kind: 'cdn-drift',
      pri: 0,
      title: 'CDN events-api-latest stale vs local tunnel',
      task: 'stage-pending-config',
      detail: { cdn: cdn.apiBase, local: api.apiBase },
      note: freeze?.frozen ? 'publish freeze ON — stage pending' : 'external publish needs current-request authorization — stage pending',
      repeatable: true,
    });
  }
  const outreach = store?.outreach || [];
  const rejected = outreach.filter((o) => o?.status === 'rejected' && String(o.rejectReason || o.error || '').startsWith('no_mx:'));
  if (rejected.length) {
    pushWork(seen, found, {
      kind: 'mx',
      pri: 0,
      title: `${rejected.length} outreach rejected — run MX reconcile`,
      task: 'outreach-mx',
      repeatable: true,
    });
  }
  const queued = outreach.filter((o) => o?.status === 'queued' || o?.status === 'drafted');
  if (queued.length > 0) {
    pushWork(seen, found, {
      kind: 'outreach-draft',
      pri: 2,
      title: `${queued.length} outreach drafts queued (no send)`,
      task: 'outreach-draft-audit',
      repeatable: true,
    });
  }
  const ae = store?.activeEvent;
  if (ae?.stage === 'rsvp' && !(store?.rsvps || []).length) {
    pushWork(seen, found, {
      kind: 'rsvp-zero',
      pri: 2,
      title: 'Active event rsvp stage with 0 RSVPs — keep invite honest',
      task: 'public-event-probe',
      repeatable: true,
    });
  }
  const warm = demand?.warmInbound || {};
  const warmOverdue =
    (warm.overdueActionCount || 0) > 0 ||
    (warm.overdue || 0) > 0 ||
    (Array.isArray(warm.overdueActionWho) && warm.overdueActionWho.length) ||
    (Array.isArray(warm.rows) && warm.rows.some((r) => /overdue|passed|needs human/i.test(String(r.status || r.next || ''))));
  if (warmOverdue) {
    pushWork(seen, found, {
      kind: 'warm',
      pri: 1,
      title: 'Warm inbound overdue — agent receipt only (warm≠pilot)',
      task: 'warm-review',
      repeatable: true,
    });
  }
  if ((demand?.queue?.pending || demand?.pending || 0) > 0 || (demand?.queue?.total || 0) > 0) {
    pushWork(seen, found, {
      kind: 'demand-drafts',
      pri: 2,
      title: 'Pending demand drafts hygiene (no send)',
      task: 'demand-draft-hygiene',
      repeatable: true,
    });
  }
  if (funnel?.focusPaused) {
    pushWork(seen, found, {
      kind: 'funnel-paused',
      pri: 3,
      title: 'Funnel expansion paused — optional zero-skip cert only',
      task: 'funnel-selftest-light',
      repeatable: false,
    });
  }
  // Blue-moon laptop check (~14d)
  {
    const stamp = path.join(BUSY, 'laptop-blue-moon.stamp');
    let ageDays = 999;
    try {
      ageDays = (Date.now() - fs.statSync(stamp).mtimeMs) / 86400000;
    } catch { /* never run */ }
    if (ageDays >= 14) {
      pushWork(seen, found, {
        key: 'blue-moon:laptop',
        kind: 'laptop',
        pri: 2,
        title: `Laptop blue-moon check due (last ${ageDays === 999 ? 'never' : ageDays.toFixed(0) + 'd'})`,
        task: 'laptop-blue-moon',
        repeatable: true,
      });
    }
  }

  // Always-on improvement backlog (rotating product code work)
  const deep = [
    {
      key: 'deep:events-selftest',
      kind: 'selftest',
      pri: 2,
      title: 'Events bot mock selftest green',
      task: 'events-selftest',
      repeatable: true,
    },
    {
      key: 'deep:verify-source',
      kind: 'gate',
      pri: 2,
      title: 'verify:source green',
      task: 'verify-source',
      repeatable: true,
    },
    {
      key: 'deep:lifecycle-readiness',
      kind: 'test',
      pri: 2,
      title: 'Events lifecycle readiness tests',
      task: 'lifecycle-tests',
      repeatable: true,
    },
    {
      key: 'deep:cdn-stale-note',
      kind: 'docs',
      pri: 3,
      title: 'Refresh WORK-FOUND with CDN drift status',
      task: 'rewrite-work-found',
      repeatable: true,
    },
    ...(inviteDrain?.needsUrl === 0
      ? []
      : [{
          key: 'deep:invite-drain',
          kind: 'events',
          pri: 1,
          title: 'Invite drain tick',
          task: 'invite-drain',
          repeatable: true,
        }]),
    {
      key: 'deep:truth',
      kind: 'gate',
      pri: 1,
      title: 'Truth seal check',
      task: 'truth',
      repeatable: true,
    },
  ];
  // Pick 2 deep items by hour so we always have new-ish work
  const hour = new Date().getUTCHours();
  pushWork(seen, found, deep[hour % deep.length]);
  pushWork(seen, found, deep[(hour + 2) % deep.length]);
  pushWork(seen, found, deep[(hour + 4) % deep.length]);

  for (const item of found) {
    fs.appendFileSync(QUEUE, JSON.stringify(item) + '\n');
  }
  saveSeen(seen);

  const md = [
    '# Work found (auto) · ' + new Date().toISOString(),
    '',
    `count=${found.length} · freeze=${!!(freeze?.frozen || freeze?.on)} · events.public=${events?.public ?? 'unknown'} · needHeal=${events?.needHeal ?? 'unknown'}`,
    '',
    ...found.map(
      (f, i) =>
        `${i + 1}. **[P${f.pri}]** ${f.title}  \n   task=\`${f.task}\` · kind=${f.kind}${f.note ? ' · ' + f.note : ''}`,
    ),
    '',
    'Queue: `/tmp/dg-busy/work-queue.jsonl` · loop: `demigod-useful-loop.service`',
    '',
  ].join('\n');
  fs.writeFileSync(FOUND, md);
  const out = { ok: true, count: found.length, found };
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else console.log(md);
  return out;
}

const workFindArgs = process.argv.slice(2);
const WORK_FIND_FLAGS = new Set(['--json', '--help', '-h']);
const unknownWorkFind = workFindArgs.find((a) => !WORK_FIND_FLAGS.has(a));
if (unknownWorkFind) {
  console.error(`work-find: unknown argument ${unknownWorkFind} — try: node demigod-work-find.mjs [--json]`);
  process.exit(2);
}
if (workFindArgs.includes('--help') || workFindArgs.includes('-h')) {
  console.log(`demigod-work-find — discover product work queue

Usage: node demigod-work-find.mjs [--json]`);
  process.exit(0);
}

main();
