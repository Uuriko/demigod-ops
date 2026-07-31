#!/usr/bin/env node
/**
 * demigod-work-find — discover work from current evidence.
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
  // Aging prepare-only disk≠live is debt (needs current-request publish auth — never auto-ship).
  // Do not thrash `ship prepare` every hour when prepare is already green and siblings are
  // intentional-staged — truth/digest already surface the debt.
  const pl = truth?.publishLag;
  if (pl?.overdue) {
    const prep = readJson(path.join(BUSY, 'ship-prepare.json'));
    const prepAgeMs = prep?.at ? Date.now() - Date.parse(prep.at) : Number.POSITIVE_INFINITY;
    const prepFreshOk = prep?.ok === true && Number.isFinite(prepAgeMs) && prepAgeMs < 2 * 3600 * 1000;
    const sib = truth?.siblingDrift;
    const siblingsNeedReview = sib?.status === 'needs-review' || sib?.intentional === false;
    if (!prepFreshOk || siblingsNeedReview) {
      pushWork(seen, found, {
        kind: 'publish-lag-debt',
        pri: siblingsNeedReview ? 0 : 2,
        title: `Publish lag DEBT disk v${pl.diskVer || '?'} live v${pl.liveVer || '?'} (+${pl.versionsAhead || '?'}ver · ${pl.ageHours ?? '?'}h)`,
        task: 'ship-prepare',
        note: siblingsNeedReview
          ? 'sibling assets need review + lag debt — prepare only (not auto-ship)'
          : pl.note || 'needs exact current-request publish authorization (not auto-ship)',
        detail: {
          pair: pl.pair || null,
          versionsAhead: pl.versionsAhead ?? null,
          ageHours: pl.ageHours ?? null,
          siblingStatus: sib?.status || null,
        },
        // Hourly key only when we actually need prepare; otherwise skip entirely.
        repeatable: true,
      });
    }
  }
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
  if (funnel?.focusPaused) {
    pushWork(seen, found, {
      kind: 'funnel-paused',
      pri: 3,
      title: 'Funnel expansion paused — optional zero-skip cert only',
      task: 'funnel-selftest-light',
      repeatable: false,
    });
  }
  // Duplicate partner job URLs dilute match quality (cold-start: fewer better). Review-only plan.
  const dupeGroups = Number(funnel?.metrics?.duplicate_partner_url_groups || 0);
  if (dupeGroups > 0) {
    pushWork(seen, found, {
      kind: 'funnel-dupes',
      pri: 2,
      title: `${dupeGroups} duplicate partner URL group(s) — review collision-plan`,
      task: 'funnel-collision-plan',
      detail: { groups: dupeGroups },
      note: 'bin/dg funnel collision-plan; after review: node demigod-funnel.mjs collision-plan --apply',
      repeatable: true,
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

  if (Number(inviteDrain?.needsUrl || 0) > 0) {
    pushWork(seen, found, {
      key: 'invite-drain:needs-url',
      kind: 'events',
      pri: 1,
      title: `${inviteDrain.needsUrl} invite URL(s) need drain`,
      task: 'invite-drain',
      repeatable: true,
    });
  }

  // —— OP-08: enrich / integrity / structured-hiring product tasks (local, no invent roles) ——
  {
    const resealQ = path.join(BUSY, 'reseal-queue.jsonl');
    let resealPending = 0;
    try {
      if (fs.existsSync(resealQ)) {
        resealPending = fs
          .readFileSync(resealQ, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          })
          .filter((r) => r && r.pending !== false).length;
      }
    } catch {
      /* */
    }
    if (resealPending > 0) {
      pushWork(seen, found, {
        key: 'enrich:reseal-pending',
        kind: 'enrich',
        pri: 1,
        title: `Research reseal queue pending=${resealPending}`,
        task: 'reseal-run',
        note: 'node demigod-reseal-queue.mjs run',
        repeatable: true,
      });
    }

    const cb = readJson(path.join(BUSY, 'control-board.json'));
    const cbAgeMs = cb?.at ? Date.now() - Date.parse(cb.at) : Number.POSITIVE_INFINITY;
    if (!cb || !Number.isFinite(cbAgeMs) || cbAgeMs > 6 * 3600 * 1000) {
      pushWork(seen, found, {
        key: 'enrich:control-board-stale',
        kind: 'enrich',
        pri: 2,
        title: 'Control board receipt missing or >6h — re-evaluate integrity controls',
        task: 'control-board',
        note: 'node demigod-control-board.mjs status',
        repeatable: true,
      });
    } else if (cb.ok === false || (cb.exitFailures && cb.exitFailures.length)) {
      pushWork(seen, found, {
        key: `enrich:control-board-fail:${(cb.exitFailures || []).join(',') || 'attn'}`,
        kind: 'enrich',
        pri: 0,
        title: `Control board ATTENTION · ${cb.summary || 'high exit fail'}`,
        task: 'control-board',
        detail: { highFailures: cb.highFailures || [], exitFailures: cb.exitFailures || [] },
        note: 'node demigod-control-board.mjs status',
        repeatable: true,
      });
    }

    // Multi-day reseal due (CH-13): last successful reseal / research green older than 7d
    {
      const resealLast = readJson(path.join(BUSY, 'reseal-queue-last.json'));
      const researchFresh = readJson(path.join(BUSY, 'evidence', 'latest-company-research-benchmark.json'))
        || readJson(path.join(BUSY, 'evidence/latest-company-research-benchmark.json'));
      const lastAt = resealLast?.at || researchFresh?.at || researchFresh?.runAt || null;
      const ageDays = lastAt ? (Date.now() - Date.parse(lastAt)) / 864e5 : 999;
      if (ageDays >= 7) {
        pushWork(seen, found, {
          key: 'enrich:reseal-weekly',
          kind: 'enrich',
          pri: 2,
          title: `Research re-verify due (last ${ageDays === 999 ? 'unknown' : ageDays.toFixed(0) + 'd'} ago)`,
          task: 'reseal-due',
          note: 'node demigod-reseal-queue.mjs due || node demigod-reseal-queue.mjs run --force',
          repeatable: true,
        });
      }
    }

    // Structured hiring: packets without interview plan or public/founder comp (demo-aware)
    try {
      const packets = readJson(path.join(ROOT, 'DEMIGOD-ROLE-PACKETS.json'));
      const list = Object.values(packets?.packets || {});
      const missingPlan = list.filter((p) => !Array.isArray(p.interviewPlan) || !p.interviewPlan.length);
      const missingComp = list.filter((p) => !p.compBand?.text);
      if (missingPlan.length) {
        pushWork(seen, found, {
          key: 'sh:interview-plan',
          kind: 'structured-hiring',
          pri: 3,
          title: `${missingPlan.length} RolePacket(s) missing interview plan`,
          task: 'role-packet-set-plan',
          note: 'node demigod-role-packet.mjs set-plan --role=…',
          detail: { roles: missingPlan.map((p) => p.roleId).slice(0, 8) },
          repeatable: false,
        });
      }
      if (missingComp.length) {
        pushWork(seen, found, {
          key: 'sh:comp-band',
          kind: 'structured-hiring',
          pri: 3,
          title: `${missingComp.length} RolePacket(s) missing comp band`,
          task: 'public-comp-or-set-comp',
          note: 'node demigod-public-comp.mjs apply --role=… --url=… --text=…  OR  set-comp --source=founder_stated',
          detail: { roles: missingComp.map((p) => p.roleId).slice(0, 8) },
          repeatable: false,
        });
      }
    } catch {
      /* */
    }

    // Aging badges still young: surface poll health (AR-25) without inventing roles
    {
      const aging = readJson(path.join(ROOT, 'DEMIGOD-DIRECTORY-AGING.json'));
      const maxObs = Number(aging?.maxOldestObservedDays ?? aging?.coverage?.maxOldestObservedDays ?? 0);
      // If asset has per-company, derive max
      let derivedMax = maxObs;
      if (!derivedMax && aging?.companies && typeof aging.companies === 'object') {
        for (const c of Object.values(aging.companies)) {
          if (Number(c?.oldestObservedDays) > derivedMax) derivedMax = Number(c.oldestObservedDays);
        }
      }
      if (derivedMax > 0 && derivedMax < 7) {
        pushWork(seen, found, {
          key: 'enrich:aging-shallow',
          kind: 'enrich',
          pri: 3,
          title: `Directory observed ages still young (max ${derivedMax}d) — role-ledger timer accrues ≥7d badges`,
          task: 'role-ledger-poll-status',
          note: 'systemctl --user status demigod-role-ledger.timer; poll is daily (do not force thrash)',
          repeatable: true,
        });
      }
    }
  }

  found.sort((a, b) => a.pri - b.pri || a.task.localeCompare(b.task));
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
