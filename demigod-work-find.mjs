#!/usr/bin/env node
/**
 * demigod-work-find — discover work from current evidence.
 *
 *   node demigod-work-find.mjs
 *   node demigod-work-find.mjs --json
 *   node demigod-work-find.mjs --selftest
 *
 * Writes /tmp/dg-busy/work-queue.jsonl (append) + /tmp/dg-busy/WORK-FOUND.md
 * Consumed by demigod-useful-loop (pops oldest unclaimed product tasks).
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { withFileLock } from './demigod-agent-tools-lib.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const QUEUE = path.join(BUSY, 'work-queue.jsonl');
const FOUND = path.join(BUSY, 'WORK-FOUND.md');
const SEEN = path.join(BUSY, 'work-find-seen.json');
const LOCK = path.join(BUSY, 'work-find.lock');

/**
 * OP-08: map control-board exit/high fails → smallest fix command (no invent roles).
 * Prefer concrete reseal/truth over status-only when seals are red.
 */
export function controlBoardRemediationNote(exitFailures = [], highFailures = []) {
  const fails = new Set([...(exitFailures || []), ...(highFailures || [])].filter(Boolean));
  const cmds = [];
  if (fails.has('truth_seal')) cmds.push('node demigod-truth.mjs');
  if (
    fails.has('research_seal') ||
    fails.has('research_export_honest') ||
    fails.has('reseal_queue_drained')
  ) {
    cmds.push('node demigod-reseal-queue.mjs run');
  }
  if (!cmds.length) cmds.push('node demigod-control-board.mjs status');
  return cmds.join(' && ');
}

/** Route red controls to a repair the useful loop can execute, not another status-only probe. */
export function controlBoardRemediationTask(exitFailures = [], highFailures = []) {
  const fails = new Set([...(exitFailures || []), ...(highFailures || [])].filter(Boolean));
  if (fails.has('truth_seal')) return 'truth-reseal';
  if (
    fails.has('research_seal') ||
    fails.has('research_export_honest') ||
    fails.has('reseal_queue_drained')
  ) return 'reseal-run';
  return 'control-board';
}

/** Persistent failures retry each useful-loop minute; ordinary repeatables remain hourly. */
export function workFindRetryBucket(item = {}, now = new Date().toISOString()) {
  return now.slice(0, item.always === true ? 16 : 13);
}

/**
 * OP-08 / AR-08: offline classify + map roleMix remediations from control-board evidence.
 * Never invents roles. Empty when drift=0 and roleMix not stale.
 */
export function offlineEnrichRemediationFromControls(controls = []) {
  const list = Array.isArray(controls) ? controls : [];
  const items = [];
  const fn = list.find((c) => c?.id === 'ledger_fn_drift');
  const mix = list.find((c) => c?.id === 'map_role_mix_fresh');
  const drift = Number(fn?.evidence?.drift);
  if (Number.isFinite(drift) && drift > 0) {
    items.push({
      key: 'enrich:ledger-fn-drift',
      kind: 'enrich',
      pri: 1,
      always: true,
      title: `Ledger fn drift=${drift}/${fn.evidence?.open ?? '?'} — offline reclassify`,
      task: 'ledger-reclassify',
      note: 'node demigod-enrichment.mjs reclassify',
      detail: { drift, open: fn.evidence?.open ?? null, otherShare: fn.evidence?.otherShare ?? null },
      repeatable: true,
    });
  }
  if (mix?.evidence?.stale === true) {
    items.push({
      key: 'enrich:map-role-mix-stale',
      kind: 'enrich',
      pri: 1,
      always: true,
      title: `Map roleMix L1=${mix.evidence?.l1 ?? '?'} stale — offline directory-aging --enrich-map`,
      task: 'map-role-mix-enrich',
      note: 'node demigod-directory-aging.mjs --enrich-map',
      detail: {
        l1: mix.evidence?.l1 ?? null,
        mapTotal: mix.evidence?.mapTotal ?? null,
        liveOpen: mix.evidence?.liveOpen ?? null,
      },
      repeatable: true,
    });
  }
  return items;
}

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

function pushWork(seen, items, item, now = new Date().toISOString()) {
  const baseKey = item.key || `${item.kind}:${item.title}`;
  const key = item.repeatable ? `${baseKey}@${workFindRetryBucket(item, now)}` : baseKey;
  if (seen.has(key)) return false;
  seen.add(key);
  items.push({ ...item, key, at: now, status: 'open' });
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
      const exitFailures = cb.exitFailures || [];
      const highFailures = cb.highFailures || [];
      pushWork(seen, found, {
        key: `enrich:control-board-fail:${exitFailures.join(',') || 'attn'}`,
        kind: 'enrich',
        pri: 0,
        always: true,
        title: `Control board ATTENTION · ${cb.summary || 'high exit fail'}`,
        task: controlBoardRemediationTask(exitFailures, highFailures),
        detail: { highFailures, exitFailures },
        note: controlBoardRemediationNote(exitFailures, highFailures),
        repeatable: true,
      });
    }

    // Live truth seal (map stamps between board receipts / hour-seen). Never invent work when green.
    try {
      const truthSeal = refuseIfStale('truth');
      if (truthSeal?.reason === 'input-hash-mismatch' || truthSeal?.fresh === false) {
        const already = found.some(
          (x) =>
            x.note?.includes('demigod-truth') ||
            (x.detail?.exitFailures || []).includes('truth_seal') ||
            (x.detail?.highFailures || []).includes('truth_seal'),
        );
        if (!already) {
          pushWork(seen, found, {
            key: 'enrich:truth-seal-live',
            kind: 'enrich',
            pri: 0,
            always: true,
            title: `Truth seal ${truthSeal.reason || 'stale'} — reseal disk oracle`,
            task: 'truth-reseal',
            detail: { reason: truthSeal.reason, mismatches: truthSeal.mismatches || null },
            note: 'node demigod-truth.mjs',
            repeatable: true,
          });
        }
      }
    } catch {
      /* evidence probe best-effort */
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

    // AR-08 offline classify / map roleMix (from control evidence; empty when aligned)
    if (cb?.controls) {
      for (const item of offlineEnrichRemediationFromControls(cb.controls)) {
        pushWork(seen, found, item);
      }
    }

    // Structured-hiring doctor receipt stale → refresh product surface (OP-08 / Ashby desk)
    {
      const docPath = path.join(BUSY, 'structured-hiring-doctor.json');
      const doc = readJson(docPath);
      const ageMs = doc?.at ? Date.now() - Date.parse(doc.at) : Number.POSITIVE_INFINITY;
      if (!doc || !Number.isFinite(ageMs) || ageMs > 6 * 3600 * 1000) {
        pushWork(seen, found, {
          key: 'sh:doctor-stale',
          kind: 'structured-hiring',
          pri: 3,
          title: 'Structured-hiring doctor receipt missing or >6h',
          task: 'structured-hiring-doctor',
          note: 'node demigod-structured-hiring.mjs doctor',
          repeatable: true,
        });
      } else if (doc.ok === false) {
        pushWork(seen, found, {
          key: 'sh:doctor-fail',
          kind: 'structured-hiring',
          pri: 1,
          always: true,
          title: `Structured-hiring doctor FAIL · errors=${doc.audit?.errors?.length ?? '?'}`,
          task: 'structured-hiring-audit',
          note: 'node demigod-structured-hiring.mjs audit',
          detail: { errors: (doc.audit?.errors || []).slice(0, 8) },
          repeatable: true,
        });
      }
    }

    // Control med: export missing (ops honesty, not invent roles)
    if (cb?.controls) {
      const exp = cb.controls.find((c) => c.id === 'export_board_identity_clean' && c.ok === false);
      if (exp && /export_missing|unreadable/i.test(String(exp.reason || ''))) {
        pushWork(seen, found, {
          key: 'enrich:export-missing',
          kind: 'enrich',
          pri: 1,
          always: true,
          title: 'RecruitAI export missing/unreadable — regenerate local export',
          task: 'recruitai-export',
          note: 'node demigod-recruitai-export.mjs',
          repeatable: true,
        });
      }
    }

    // /startups fragment honesty receipt (site-health) — refresh only; paste is publish-gated
    {
      const shPath = path.join(BUSY, 'site-health.json');
      const sh = readJson(shPath);
      const ageMs = sh?.at ? Date.now() - Date.parse(sh.at) : Number.POSITIVE_INFINITY;
      if (!sh || !Number.isFinite(ageMs) || ageMs > 12 * 3600 * 1000) {
        pushWork(seen, found, {
          key: 'site:health-stale',
          kind: 'site',
          pri: 3,
          title: 'Site-health receipt missing or >12h — refresh live honesty (no paste)',
          task: 'site-health-refresh',
          note: 'node demigod-site-health.mjs  # fragment lag is publish-gated',
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

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`work-find selftest: ${m}`);
  };
  assert(
    controlBoardRemediationNote(['truth_seal'], ['truth_seal']).includes('demigod-truth'),
    'truth_seal → truth reseal',
  );
  assert(
    controlBoardRemediationNote(['research_export_honest'], ['research_seal']).includes(
      'reseal-queue',
    ),
    'research fails → reseal-queue run',
  );
  assert(
    controlBoardRemediationNote(['truth_seal', 'research_export_honest'], []).includes(
      'demigod-truth',
    ) &&
      controlBoardRemediationNote(['truth_seal', 'research_export_honest'], []).includes(
        'reseal-queue',
      ),
    'combined seals chain both fixes',
  );
  assert(
    controlBoardRemediationNote([], []).includes('control-board'),
    'empty fails → status only',
  );
  assert(
    controlBoardRemediationNote(['phase2_has_accepted_role'], []).includes('control-board'),
    'med delivery gap → no invent-role fix command',
  );
  assert(controlBoardRemediationTask(['truth_seal'], []) === 'truth-reseal', 'truth fail → executable reseal');
  assert(controlBoardRemediationTask(['research_export_honest'], []) === 'reseal-run', 'research fail → executable reseal');
  assert(controlBoardRemediationTask([], []) === 'control-board', 'unknown control fail → status refresh');
  assert(workFindRetryBucket({ always: true }, '2099-01-01T00:12:34.000Z') === '2099-01-01T00:12', 'always retries each minute');
  assert(workFindRetryBucket({ repeatable: true }, '2099-01-01T00:12:34.000Z') === '2099-01-01T00', 'ordinary retry stays hourly');
  // Doctor stale discovery is covered live via status receipt; remediation helpers stay pure above.
  // Identical probes coalesce within a retry minute, then retry next minute if still red.
  {
    const seen = new Set(['enrich:control-board-fail:truth_seal@2099-01-01T00:12']);
    const items = [];
    const item = {
      key: 'enrich:control-board-fail:truth_seal',
      kind: 'enrich',
      pri: 0,
      always: true,
      title: 'rebroken',
      note: 'node demigod-truth.mjs',
      repeatable: true,
    };
    assert(!pushWork(seen, items, item, '2099-01-01T00:12:50.000Z'), 'same-minute P0 probe dedupes');
    assert(pushWork(seen, items, item, '2099-01-01T00:13:00.000Z'), 'next-minute P0 retry surfaces');
    assert(items.length === 1, 'only the retry was queued');
  }
  // AR-08 offline remediations from control evidence only
  assert(offlineEnrichRemediationFromControls([]).length === 0, 'no controls → no offline enrich work');
  assert(
    offlineEnrichRemediationFromControls([
      { id: 'ledger_fn_drift', evidence: { drift: 0, open: 10 } },
      { id: 'map_role_mix_fresh', evidence: { stale: false, l1: 0 } },
    ]).length === 0,
    'aligned fn + roleMix → no work',
  );
  const rem = offlineEnrichRemediationFromControls([
    { id: 'ledger_fn_drift', evidence: { drift: 12, open: 100, otherShare: 0.2 } },
    { id: 'map_role_mix_fresh', evidence: { stale: true, l1: 40, mapTotal: 50, liveOpen: 60 } },
  ]);
  assert(rem.length === 2, 'drift + stale → two remediations');
  assert(rem[0].note.includes('reclassify') && rem[0].always === true, 'reclassify always while drift');
  assert(rem[1].note.includes('enrich-map') && rem[1].always === true, 'enrich-map always while stale');
  // work-find tasks must have doTask cases in useful-loop (cycle 126: unknown task forever)
  {
    const wf = fs.readFileSync(path.join(ROOT, 'demigod-work-find.mjs'), 'utf8');
    const ul = fs.readFileSync(path.join(ROOT, 'demigod-useful-loop.mjs'), 'utf8');
    const tasks = new Set(
      [...wf.matchAll(/task:\s*['"]([a-z0-9-]+)['"]/g)].map((m) => m[1]),
    );
    const cases = new Set(
      [...ul.matchAll(/case\s+['"]([a-z0-9-]+)['"]/g)].map((m) => m[1]),
    );
    const missing = [...tasks].filter((t) => !cases.has(t)).sort();
    assert(missing.length === 0, `useful-loop missing cases for work-find tasks: ${missing.join(', ')}`);
  }
  console.log(JSON.stringify({ ok: true, selftest: 'work-find' }));
}

const workFindArgs = process.argv.slice(2);
const WORK_FIND_FLAGS = new Set(['--json', '--help', '-h', '--selftest']);
const unknownWorkFind = workFindArgs.find((a) => !WORK_FIND_FLAGS.has(a));
if (unknownWorkFind) {
  console.error(`work-find: unknown argument ${unknownWorkFind} — try: node demigod-work-find.mjs [--json|--selftest]`);
  process.exit(2);
}
if (workFindArgs.includes('--help') || workFindArgs.includes('-h')) {
  console.log(`demigod-work-find — discover product work queue

Usage: node demigod-work-find.mjs [--json|--selftest]`);
  process.exit(0);
}
if (workFindArgs.includes('--selftest')) {
  selftest();
  process.exit(0);
}

withFileLock(LOCK, main, { timeoutMs: 70000, staleMs: 120000 });
