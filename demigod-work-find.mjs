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
import { refuseIfStale } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const QUEUE = path.join(BUSY, 'work-queue.jsonl');
const FOUND = path.join(BUSY, 'WORK-FOUND.md');
const SEEN = path.join(BUSY, 'work-find-seen.json');

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

/** Exit-fail integrity items must reappear while red (hour-bucketed seen hid re-broken truth_seal). */
export function shouldBypassWorkFindSeen(item = {}) {
  return item.always === true;
}

/**
 * Funnel packages: drift is real integrity; age-only stale is low urgency when drafts-only
 * (KEEP_WORKING used to thrash packages every fire). Retro 2026-08-06.
 * @returns {null | { pri: number, title: string }}
 */
export function packageWorkPriority(metrics = {}) {
  const drift = Number(metrics.package_drift) === 1;
  const stale = Number(metrics.package_stale) === 1;
  if (!drift && !stale) return null;
  if (drift) {
    return {
      pri: 1,
      title: 'Funnel package drift — rebuild packages + missing drafts',
    };
  }
  const age = Number(metrics.package_age_sec) || 0;
  const ready =
    Number(metrics.send_ready || 0) +
    Number(metrics.approve_ready || 0) +
    Number(metrics.package_send_ready || 0) +
    Number(metrics.package_approve_ready || 0);
  // Stale alone: only when packages actually matter and age is material (>1h).
  if (stale && ready > 0 && age >= 3600) {
    return {
      pri: 2,
      title: 'Funnel packages stale (>1h) — rebuild for drafted/approved leads',
    };
  }
  return null;
}

/**
 * When site is shipped and control-board only has delivery-empty / host-gated backup reds,
 * surface honest empty demand as P3 (do not invent roles). Day-bucketed.
 */
export function deliveryEmptyHonestItem(truth = {}, cb = {}) {
  if (!truth?.fullyShipped && !truth?.pass) return null;
  if (truth?.fullyShipped === false && truth?.publishLag?.overdue) return null;
  const ids = new Set(
    (cb.controls || []).filter((c) => c && c.ok === false).map((c) => c.id),
  );
  const allowed = new Set([
    'phase2_has_accepted_role',
    'board_has_real_role',
    'pairs_has_real',
    'backup_capability',
  ]);
  if (![...ids].every((id) => allowed.has(id))) return null;
  if (!ids.has('phase2_has_accepted_role') && !ids.has('board_has_real_role')) return null;
  return {
    key: 'delivery:empty-honest',
    kind: 'delivery',
    pri: 3,
    title:
      'Delivery loop empty (honest) — no accepted role / sample board only; do not invent inventory',
    task: 'demand-status',
    note: 'bin/dg demand status · bin/dg pilot status · warm≠pilot · wait for real brief',
    repeatable: true,
  };
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

function pushWork(seen, items, item) {
  const baseKey = item.key || `${item.kind}:${item.title}`;
  const key = item.repeatable ? `${baseKey}@${new Date().toISOString().slice(0, 13)}` : baseKey;
  const bypass = shouldBypassWorkFindSeen(item);
  if (!bypass && seen.has(key)) return false;
  if (!bypass) seen.add(key);
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
      const exitFailures = cb.exitFailures || [];
      const highFailures = cb.highFailures || [];
      pushWork(seen, found, {
        key: `enrich:control-board-fail:${exitFailures.join(',') || 'attn'}`,
        kind: 'enrich',
        pri: 0,
        always: true,
        title: `Control board ATTENTION · ${cb.summary || 'high exit fail'}`,
        task: 'control-board',
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

    // Live ship-prepare seal (map/atlas/foot hash drift after prepare). Local prepare only — never auto-ship.
    try {
      const prepSeal = refuseIfStale('ship-prepare');
      if (prepSeal?.green !== true || prepSeal?.fresh === false) {
        const already = found.some((x) => x.task === 'ship-prepare' || x.note?.includes('ship prepare'));
        if (!already) {
          pushWork(seen, found, {
            key: 'enrich:ship-prepare-live',
            kind: 'enrich',
            pri: 1,
            always: true,
            title: `Ship prepare ${prepSeal?.reason || 'not-green'} — restage sibling assets (no publish)`,
            task: 'ship-prepare',
            detail: { reason: prepSeal?.reason || null, mismatches: prepSeal?.mismatches || null },
            note: 'bin/dg ship prepare',
            repeatable: true,
          });
        }
      }
    } catch {
      /* */
    }

    // Map open-role board wipe (killed --with-jobs / thin rebuild). Restore last-good checkpoint; never invent roles.
    try {
      const mapPath = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
      const metaPath = path.join(BUSY, 'map-last-good.json');
      if (fs.existsSync(mapPath) && fs.existsSync(metaPath)) {
        const map = readJson(mapPath, null);
        const meta = readJson(metaPath, null);
        const cos = Array.isArray(map?.companies) ? map.companies : [];
        const boards = cos.filter((c) => Number(c?.openRoles) > 0).length;
        const checkpointBoards = Number(meta?.boards) || 0;
        if (checkpointBoards >= 100 && boards < checkpointBoards * 0.8) {
          pushWork(seen, found, {
            key: 'heal:map-boards-worse',
            kind: 'heal',
            pri: 0,
            always: true,
            title: `Map boards ${boards} << checkpoint ${checkpointBoards} — restore last-good`,
            task: 'map-checkpoint-restore',
            detail: {
              boards,
              companies: cos.length,
              checkpointBoards,
              checkpointCompanies: meta?.companies ?? null,
              checkpointAt: meta?.at ?? null,
            },
            note: 'node demigod-map-checkpoint.mjs restore --if-worse',
            repeatable: true,
          });
        }
      }
    } catch {
      /* */
    }

    // Directory static fragment lagging map (dead-host / company edits). Local rebuild only — Webflow paste still gated.
    try {
      const mapPath = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
      const staticPath = path.join(ROOT, 'sf-startups-static.html');
      if (fs.existsSync(mapPath) && fs.existsSync(staticPath)) {
        const mapM = fs.statSync(mapPath).mtimeMs;
        const staticM = fs.statSync(staticPath).mtimeMs;
        if (mapM > staticM + 60_000) {
          pushWork(seen, found, {
            key: 'enrich:directory-static-stale',
            kind: 'enrich',
            pri: 2,
            title: 'Directory static older than startup map — rebuild local fragment',
            task: 'directory-static',
            detail: {
              mapMtime: new Date(mapM).toISOString(),
              staticMtime: new Date(staticM).toISOString(),
            },
            note: 'node demigod-directory-static.mjs  # paste to Webflow still needs current-request auth',
            repeatable: true,
          });
        }
      }
    } catch {
      /* */
    }

    // Live research seal (map/gold stamps). Prefer reseal over thrash when selection still matches.
    try {
      const researchSeal = refuseIfStale('company-research-benchmark');
      const summary = String(researchSeal?.summary || '');
      const m = summary.match(/(\d+)\s*\/\s*5\s*fields accepted/i);
      const accepted = m ? Number(m[1]) : null;
      if (researchSeal?.green !== true || researchSeal?.fresh === false) {
        const already = found.some(
          (x) =>
            x.task === 'reseal-run' ||
            x.note?.includes('company-research-benchmark') ||
            x.note?.includes('reseal-queue') ||
            (x.detail?.highFailures || []).includes('research_seal'),
        );
        if (!already) {
          pushWork(seen, found, {
            key: 'enrich:research-seal-live',
            kind: 'enrich',
            pri: 0,
            always: true,
            title: `Research seal ${researchSeal?.reason || 'not-green'} — reseal after map/gold change`,
            task: 'reseal-run',
            detail: {
              reason: researchSeal?.reason || null,
              mismatches: researchSeal?.mismatches || null,
              accepted,
            },
            note: 'PATH=~/.nvm/versions/node/v24.17.0/bin:$PATH node demigod-company-research-benchmark.mjs',
            repeatable: true,
          });
        }
      } else if (Number.isFinite(accepted) && accepted < 5) {
        // Green but incomplete gold (pricing/coverage) — fix gold, do not thrash reseal.
        pushWork(seen, found, {
          key: 'enrich:research-gold-coverage',
          kind: 'enrich',
          pri: 2,
          title: `Research gold coverage ${accepted}/5 fields — research honest pricing/unknowns`,
          task: 'research-gold',
          detail: { accepted, summary },
          note: 'edit DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json with quote-backed claims; node demigod-company-research-benchmark.mjs (Node 24)',
          repeatable: true,
        });
      }
    } catch {
      /* */
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

    // Backup capability (low control): surface missing restic/env without inventing a second backup.
    {
      const backup = (cb?.controls || []).find((c) => c.id === 'backup_capability');
      if (backup && backup.ok === false) {
        pushWork(seen, found, {
          key: 'ops:backup-capability',
          kind: 'ops',
          pri: 3,
          title: `Backup not capable — ${backup.reason || 'restic/env missing'}`,
          task: 'backup-check',
          note: 'bin/dg-backup --check · install restic + set DG_BACKUP_REPO + RESTIC_PASSWORD_FILE (off-device)',
          detail: backup.evidence || null,
          repeatable: true,
        });
      }
    }

    // Funnel package honesty: drift is P1; age-only stale is quieter (anti thrash).
    {
      const fMetrics = funnel?.metrics || {};
      const pack = packageWorkPriority(fMetrics);
      if (pack) {
        pushWork(seen, found, {
          key: 'funnel:package-drift',
          kind: 'funnel',
          pri: pack.pri,
          title: pack.title,
          task: 'funnel-packages',
          note: 'node demigod-funnel.mjs draft --id=… ; node demigod-lead-pipeline.mjs tick --stage=packages',
          detail: {
            package_drift: fMetrics.package_drift,
            package_stale: fMetrics.package_stale,
            package_age_sec: fMetrics.package_age_sec,
            send_ready: fMetrics.send_ready,
            package_send_ready: fMetrics.package_send_ready,
          },
          repeatable: true,
        });
      }
    }

    // Honest empty delivery (post-ship): do not invent pilots/board rows.
    {
      const empty = deliveryEmptyHonestItem(truth || {}, cb || {});
      if (empty) {
        pushWork(seen, found, {
          ...empty,
          key: `${empty.key}@${new Date().toISOString().slice(0, 10)}`,
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
  assert(shouldBypassWorkFindSeen({ always: true }) === true, 'always bypasses seen');
  assert(shouldBypassWorkFindSeen({ pri: 0 }) === false, 'pri0 alone still hour-seen (events heal)');
  assert(shouldBypassWorkFindSeen({ pri: 2, repeatable: true }) === false, 'pri2 respects seen');
  assert(packageWorkPriority({}) === null, 'clean packages → no work');
  assert(packageWorkPriority({ package_drift: 1, package_stale: 1 }).pri === 1, 'drift is P1');
  assert(
    packageWorkPriority({ package_stale: 1, package_age_sec: 100, send_ready: 2 }) === null,
    'fresh stale flag alone is not work',
  );
  assert(
    packageWorkPriority({ package_stale: 1, package_age_sec: 7200, send_ready: 2 }).pri === 2,
    'old stale with ready leads is P2',
  );
  assert(
    deliveryEmptyHonestItem(
      { fullyShipped: true, pass: true },
      {
        controls: [
          { id: 'phase2_has_accepted_role', ok: false },
          { id: 'board_has_real_role', ok: false },
          { id: 'pairs_has_real', ok: false },
          { id: 'backup_capability', ok: false },
        ],
      },
    )?.pri === 3,
    'honest empty delivery surfaces P3',
  );
  assert(
    deliveryEmptyHonestItem(
      { fullyShipped: true },
      { controls: [{ id: 'truth_seal', ok: false }, { id: 'phase2_has_accepted_role', ok: false }] },
    ) === null,
    'integrity reds suppress delivery-empty note',
  );
  // Hour-seen must not hide a re-queued pri0 control-board fail
  {
    const seen = new Set(['enrich:control-board-fail:truth_seal@2099-01-01T00']);
    const items = [];
    const hourKey = `enrich:control-board-fail:truth_seal@${new Date().toISOString().slice(0, 13)}`;
    seen.add(hourKey);
    const pushed = pushWork(seen, items, {
      key: 'enrich:control-board-fail:truth_seal',
      kind: 'enrich',
      pri: 0,
      always: true,
      title: 'rebroken',
      note: 'node demigod-truth.mjs',
      repeatable: true,
    });
    assert(pushed && items.length === 1, 'pri0 always re-surfaces while red');
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

main();
