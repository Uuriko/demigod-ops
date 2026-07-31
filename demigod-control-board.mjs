#!/usr/bin/env node
/**
 * demigod-control-board — Vanta-shaped continuous controls for Demigod integrity.
 *
 * Design: docs/die/CONTROL-BOARD-DESIGN.md
 *   node demigod-control-board.mjs [--json] [--strict] [status]
 *   node demigod-control-board.mjs --selftest
 *
 * No trust score. No auto-remediation. Does not invent roles or publish.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { refuseIfStale } from './demigod-evidence.mjs';
import { listAcceptedRoles } from './demigod-accepted-role.mjs';
import { atomicWrite, isPlainObject } from './demigod-agent-tools-lib.mjs';
import { resealDue } from './demigod-reseal-queue.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const OUT = path.join(BUSY, 'control-board.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const SCHEMA = 'demigod.control-board/1';
const ROLE_TIMER = 'demigod-role-ledger.timer';
const ROLE_SERVICE = 'demigod-role-ledger.service';
const ROLE_POLL_MAX_AGE_MS = 36 * 60 * 60 * 1000;

function readJsonProbe(p) {
  try {
    return { exists: true, value: JSON.parse(fs.readFileSync(p, 'utf8')), error: null };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, value: null, error: null };
    return {
      exists: true,
      value: null,
      error: error instanceof SyntaxError ? 'invalid_json' : String(error?.message || error),
    };
  }
}

function control(id, severity, ok, reason, evidence = null) {
  return { id, severity, ok: Boolean(ok), reason: String(reason || (ok ? 'ok' : 'fail')), evidence };
}

function systemdProperties(unit, names) {
  const run = spawnSync(
    '/usr/bin/systemctl',
    ['--user', 'show', unit, '--no-pager', ...names.flatMap((name) => ['-p', name])],
    { encoding: 'utf8', timeout: 5000 },
  );
  if (run.error || run.status !== 0) {
    return { error: String(run.error?.message || run.stderr || `systemctl exit ${run.status}`), value: null };
  }
  const entries = run.stdout
    .split('\n')
    .map((line) => [line.indexOf('='), line])
    .filter(([at]) => at > 0)
    .map(([at, line]) => [line.slice(0, at), line.slice(at + 1)]);
  return { error: null, value: Object.fromEntries(entries) };
}

function probeRolePollTimer() {
  const timer = systemdProperties(ROLE_TIMER, [
    'LoadState',
    'ActiveState',
    'UnitFileState',
    'ActiveEnterTimestamp',
    'NextElapseUSecRealtime',
  ]);
  const service = systemdProperties(ROLE_SERVICE, [
    'LoadState',
    'ActiveState',
    'Result',
    'ExecMainStatus',
    'ExecMainExitTimestamp',
  ]);
  return {
    error: timer.error || service.error,
    timer: timer.value,
    service: service.value,
  };
}

/** @param {{ strictResearch?: boolean }} opts */
export function evaluateControls(opts = {}) {
  const root = opts.root || ROOT;
  const busy = opts.busy || BUSY;
  const controls = [];

  // —— truth seal ——
  try {
    const t = refuseIfStale('truth');
    controls.push(
      control(
        'truth_seal',
        'high',
        t.green === true && t.fresh === true,
        t.reason || (t.green ? 'pass-fresh' : 'not-green'),
        { green: t.green, fresh: t.fresh, pass: t.pass, runId: t.runId || null },
      ),
    );
  } catch (e) {
    controls.push(control('truth_seal', 'high', false, String(e?.message || e)));
  }

  // —— research seal ——
  let researchGreen = false;
  try {
    const r = refuseIfStale('company-research-benchmark');
    researchGreen = r.green === true && r.fresh === true;
    controls.push(
      control(
        'research_seal',
        'high',
        researchGreen,
        r.reason || (researchGreen ? 'pass-fresh' : 'not-green'),
        { green: r.green, fresh: r.fresh, pass: r.pass, runId: r.runId || null },
      ),
    );
  } catch (e) {
    controls.push(control('research_seal', 'high', false, String(e?.message || e)));
  }

  // —— export honesty vs research ——
  const exportPath = path.join(busy, 'recruitai-export/latest.json');
  const exportProbe = readJsonProbe(exportPath);
  const exp = exportProbe.value;
  if (exportProbe.error || (exportProbe.exists && !isPlainObject(exp))) {
    controls.push(
      control(
        'research_export_honest',
        'high',
        false,
        `export unreadable: ${exportProbe.error || 'invalid_shape'}`,
        { path: exportPath },
      ),
    );
  } else if (!exportProbe.exists) {
    controls.push(
      control('research_export_honest', 'high', true, 'n/a — no export artifact', { path: exportPath }),
    );
  } else {
    const rawCr = exp.counts?.rowsWithCompanyResearch ?? 0;
    const cr = Number(rawCr);
    const exportClaimsGreen = exp.researchEvidence?.green === true;
    if (!Number.isInteger(cr) || cr < 0) {
      controls.push(
        control(
          'research_export_honest',
          'high',
          false,
          'export rowsWithCompanyResearch invalid',
          { rowsWithCompanyResearch: rawCr },
        ),
      );
    } else {
      // Fail if export claims green research or emits CR while live research is not green.
      const bad =
        (cr > 0 && !exportClaimsGreen) ||
        (!researchGreen && (exportClaimsGreen || cr > 0));
      controls.push(
        control(
          'research_export_honest',
          'high',
          !bad,
          bad
            ? `export CR=${cr} researchEvidence.green=${exportClaimsGreen} researchGreen=${researchGreen}`
            : `export CR=${cr} aligned with researchGreen=${researchGreen}`,
          { cr, exportClaimsGreen, researchGreen },
        ),
      );
    }
  }

  // —— phase2 / accepted roles ——
  let accepted;
  try {
    accepted = listAcceptedRoles();
  } catch (e) {
    accepted = null;
    controls.push(control('phase2_gate_policy', 'high', false, `accepted-role failed: ${e?.message || e}`));
  }
  if (accepted) {
    // Policy: flag must remain false until product opens Phase 2 (currently hardcoded).
    controls.push(
      control(
        'phase2_gate_policy',
        'high',
        accepted.phase2Ready === false,
        accepted.phase2Ready === false
          ? 'phase2Ready=false (policy lock; not a measured readiness continuum)'
          : 'phase2Ready unexpectedly true — verify product authorization',
        {
          phase2Ready: accepted.phase2Ready,
          gateOpen: accepted.gateOpen,
          note: 'Hardcoded false in demigod-accepted-role.mjs is fail-closed; do not cite as evidence of missing receipts alone',
        },
      ),
    );
    const nAcc = accepted.counts?.acceptedForDelivery ?? 0;
    // med: red = delivery gap (informative); does not fail process exit
    controls.push(
      control(
        'phase2_has_accepted_role',
        'med',
        nAcc > 0,
        nAcc === 0
          ? 'acceptedForDelivery=0 — no real role gate open'
          : `acceptedForDelivery=${nAcc} (phase2Ready still policy-gated)`,
        {
          acceptedForDelivery: nAcc,
          nonSampleRoles: accepted.counts?.nonSampleRoles ?? null,
          boardIsCanonical: accepted.boardIsCanonical,
        },
      ),
    );
    const nonSample = accepted.counts?.nonSampleRoles ?? 0;
    controls.push(
      control(
        'board_has_real_role',
        'med',
        nonSample > 0,
        nonSample === 0
          ? `boardRoles=${accepted.counts?.boardRoles ?? 0} all sample — no real board role`
          : `nonSampleRoles=${nonSample}`,
        { boardRoles: accepted.counts?.boardRoles, nonSampleRoles: nonSample },
      ),
    );
  }

  // —— pairs: red when no real pairs (delivery empty) ——
  const pairsPath = path.join(root, 'DEMIGOD-PAIRS.json');
  const pairsProbe = readJsonProbe(pairsPath);
  const pairsDoc = pairsProbe.value;
  const pairsReadable =
    !pairsProbe.exists ||
    (!pairsProbe.error && isPlainObject(pairsDoc) && isPlainObject(pairsDoc.pairs));
  controls.push(
    control(
      'pairs_store_readable',
      'high',
      pairsReadable,
      !pairsProbe.exists
        ? 'n/a — no pairs store'
        : pairsReadable
          ? 'private pair ledger readable'
          : `pair ledger unreadable: ${pairsProbe.error || 'invalid_shape'}`,
      { path: pairsPath, exists: pairsProbe.exists },
    ),
  );
  const pairList = pairsReadable && pairsProbe.exists ? Object.values(pairsDoc.pairs) : [];
  const realPairs = pairList.filter((p) => p && p.sample === false);
  const samplePairs = pairList.filter((p) => p && p.sample === true);
  controls.push(
    control(
      'pairs_has_real',
      'med',
      realPairs.length > 0,
      realPairs.length === 0
        ? `real=0 sample=${samplePairs.length} — delivery loop empty`
        : `real=${realPairs.length} sample=${samplePairs.length}`,
      { real: realPairs.length, sample: samplePairs.length, total: pairList.length },
    ),
  );

  // —— reseal queue (map stamp without reseal) ——
  try {
    const qpath = path.join(busy, 'reseal-queue.jsonl');
    let pending = 0;
    if (fs.existsSync(qpath)) {
      pending = fs
        .readFileSync(qpath, 'utf8')
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
    controls.push(
      control(
        'reseal_queue_drained',
        'med',
        pending === 0 || researchGreen,
        pending === 0
          ? 'reseal queue empty'
          : researchGreen
            ? `pending=${pending} but research green — node demigod-reseal-queue.mjs run`
            : `pending=${pending} — node demigod-reseal-queue.mjs run`,
        { pending, researchGreen },
      ),
    );
  } catch (e) {
    controls.push(control('reseal_queue_drained', 'med', true, `n/a ${e.message || e}`));
  }

  // —— demand drafts-only ——
  const demandPath = path.join(busy, 'demand-status.json');
  const demandProbe = readJsonProbe(demandPath);
  const demand = demandProbe.value;
  if (demandProbe.error || (demandProbe.exists && !isPlainObject(demand))) {
    controls.push(
      control(
        'demand_drafts_only',
        'high',
        false,
        `demand status unreadable: ${demandProbe.error || 'invalid_shape'}`,
        { path: demandPath },
      ),
    );
  } else if (!demandProbe.exists) {
    controls.push(control('demand_drafts_only', 'high', true, 'n/a — no demand-status.json'));
  } else {
    const honesty = isPlainObject(demand.honesty) ? demand.honesty : {};
    const autoOff =
      honesty.autoDmAllowed === false &&
      honesty.agentNeverAutoSends === true;
    controls.push(
      control(
        'demand_drafts_only',
        'high',
        autoOff,
        autoOff ? 'auto-DM disabled / drafts-only' : 'auto-DM may be enabled — verify policy',
        {
          autoDmAllowed: honesty.autoDmAllowed ?? null,
          agentNeverAutoSends: honesty.agentNeverAutoSends ?? null,
          pending: demand.queue?.pending ?? null,
          sentConfirmed: demand.queue?.sentConfirmedInQueue ?? null,
        },
      ),
    );
  }

  // —— daily role observation clock ——
  const poll = opts.rolePollProbe || probeRolePollTimer();
  const timer = poll.timer || {};
  const service = poll.service || {};
  const nowMs = opts.nowMs ?? Date.now();
  const lastExitMs = Date.parse(service.ExecMainExitTimestamp || '');
  const timerStartMs = Date.parse(timer.ActiveEnterTimestamp || '');
  const ageMs = nowMs - lastExitMs;
  const timerAgeMs = nowMs - timerStartMs;
  const timerReady =
    timer.LoadState === 'loaded' &&
    timer.UnitFileState === 'enabled' &&
    timer.ActiveState === 'active' &&
    Boolean(timer.NextElapseUSecRealtime);
  const serviceLoaded = service.LoadState === 'loaded';
  const running = ['active', 'activating'].includes(service.ActiveState);
  const lastSucceeded =
    serviceLoaded &&
    service.Result === 'success' &&
    service.ExecMainStatus === '0' &&
    Number.isFinite(lastExitMs);
  // ponytail: 36h allows the daily timer's random delay plus one sleep/wake catch-up window.
  const fresh = lastSucceeded && ageMs >= 0 && ageMs <= ROLE_POLL_MAX_AGE_MS;
  const firstRunPending =
    serviceLoaded &&
    !Number.isFinite(lastExitMs) &&
    Number.isFinite(timerStartMs) &&
    timerAgeMs >= 0 &&
    timerAgeMs <= ROLE_POLL_MAX_AGE_MS;
  const pollHealthy =
    !poll.error &&
    timerReady &&
    serviceLoaded &&
    (running || fresh || firstRunPending);
  const reason = poll.error
    ? `systemd probe failed: ${poll.error}`
    : !timerReady
      ? `timer not armed: load=${timer.LoadState || '?'} active=${timer.ActiveState || '?'} enabled=${timer.UnitFileState || '?'}`
      : !serviceLoaded
        ? `poll service not loaded: ${service.LoadState || '?'}`
        : running
          ? `poll currently ${service.ActiveState}`
          : firstRunPending
            ? 'timer armed; first poll pending'
            : service.Result !== 'success' || service.ExecMainStatus !== '0'
              ? `last poll failed: result=${service.Result || '?'} status=${service.ExecMainStatus || '?'}`
              : !fresh
                ? `last successful poll stale: ${Number.isFinite(ageMs) ? Math.round(ageMs / 3600000) : '?'}h`
                : `last poll succeeded ${Math.round(ageMs / 60000)}m ago`;
  controls.push(
    control('role_poll_timer_healthy', 'med', pollHealthy, reason, {
      timerUnit: ROLE_TIMER,
      serviceUnit: ROLE_SERVICE,
      unitFileState: timer.UnitFileState || null,
      timerActive: timer.ActiveState || null,
      lastResult: service.Result || null,
      lastStatus:
        service.ExecMainStatus === '' || service.ExecMainStatus == null
          ? null
          : Number(service.ExecMainStatus),
      lastExitAt: service.ExecMainExitTimestamp || null,
      nextElapseAt: timer.NextElapseUSecRealtime || null,
      ageSec: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,
    }),
  );

  // —— map prepare-only (informative) ——
  const truthPath = path.join(busy, 'truth.json');
  const truthProbe = readJsonProbe(truthPath);
  const truth = truthProbe.value;
  if (truthProbe.error || (truthProbe.exists && !isPlainObject(truth))) {
    controls.push(
      control(
        'map_prepare_only',
        'low',
        false,
        `truth receipt unreadable: ${truthProbe.error || 'invalid_shape'}`,
        { path: truthPath },
      ),
    );
  } else if (truthProbe.exists) {
    const prepare =
      truth.prepareOnlyAssets === true ||
      truth.shipped === false ||
      /prepare-only|mapData/i.test(JSON.stringify(truth.sibling || truth.drift || truth.summary || ''));
    controls.push(
      control(
        'map_prepare_only',
        'low',
        true,
        prepare
          ? 'map/ship prepare-only or unshipped sibling assets — public CDN may lag disk'
          : 'truth present; check bin/dg truth for map CDN identity',
        {
          shipped: truth.shipped ?? null,
          prepareOnlyAssets: truth.prepareOnlyAssets ?? null,
          diskVer: truth.diskVer || truth.disk?.ver || null,
          liveVer: truth.liveVer || truth.live?.ver || null,
        },
      ),
    );
  } else {
    controls.push(control('map_prepare_only', 'low', true, 'n/a — no truth.json'));
  }

  // —— structured-hiring product integrity (med; never invents readiness) ——
  {
    const rootDir = opts.root || root;
    const packetPath = path.join(rootDir, 'DEMIGOD-ROLE-PACKETS.json');
    const batchPath = path.join(rootDir, 'DEMIGOD-PILOT-BATCHES.json');
    const touchPath = path.join(rootDir, 'DEMIGOD-CANDIDATE-TOUCHES.json');
    const introPath = path.join(rootDir, 'DEMIGOD-INTRO-PATHS.json');
    const packetProbe = readJsonProbe(packetPath);
    const batchProbe = readJsonProbe(batchPath);
    const touchProbe = readJsonProbe(touchPath);
    const introProbe = readJsonProbe(introPath);

    let shReadable = true;
    let shReason = 'structured-hiring stores readable';
    const poison = [];
    const walkScore = (obj, label) => {
      if (!obj || typeof obj !== 'object') return;
      if ('fitScore' in obj || 'trustScore' in obj) poison.push(label);
      for (const v of Object.values(obj)) {
        if (v && typeof v === 'object') walkScore(v, label);
      }
    };

    if (packetProbe.exists && (packetProbe.error || !isPlainObject(packetProbe.value))) {
      shReadable = false;
      shReason = `role-packets unreadable: ${packetProbe.error || 'invalid_shape'}`;
    } else if (packetProbe.exists) {
      walkScore(packetProbe.value, 'packets');
    }
    if (batchProbe.exists && (batchProbe.error || !isPlainObject(batchProbe.value))) {
      shReadable = false;
      shReason = `pilot-batches unreadable: ${batchProbe.error || 'invalid_shape'}`;
    } else if (batchProbe.exists) {
      walkScore(batchProbe.value, 'batches');
      for (const b of Object.values(batchProbe.value.batches || {})) {
        const max = Number(b?.max ?? 3);
        const active = (b?.candidates || []).filter((c) => !c.state || c.state === 'active').length;
        if (max > 3) poison.push(`batch_max>${max}`);
        if (active > Math.min(max, 3)) poison.push(`batch_active>${active}`);
      }
    }
    if (touchProbe.exists && !touchProbe.error && isPlainObject(touchProbe.value)) {
      walkScore(touchProbe.value, 'touches');
    }
    if (introProbe.exists && !introProbe.error && isPlainObject(introProbe.value)) {
      walkScore(introProbe.value, 'intros');
      if (introProbe.value.schema && introProbe.value.schema !== 'demigod.intro-paths-store/1') {
        poison.push('intro_schema');
      }
    }

    const noScore = poison.length === 0;
    controls.push(
      control(
        'structured_hiring_no_score',
        'med',
        shReadable && noScore,
        !shReadable
          ? shReason
          : noScore
            ? 'SH stores ok · no fitScore/trustScore · batch active≤3'
            : `SH poison: ${poison.slice(0, 4).join(',')}`,
        {
          packets: packetProbe.exists,
          batches: batchProbe.exists,
          poison: poison.slice(0, 8),
        },
      ),
    );
  }

  // —— export board identity (OP-07 surface; no invent merges) ——
  {
    const exportPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(exportPath);
    if (!expProbe.exists) {
      controls.push(
        control('export_board_identity_clean', 'med', false, 'export_missing — run export', {
          path: exportPath,
        }),
      );
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_board_identity_clean',
          'med',
          false,
          `export unreadable: ${expProbe.error || 'invalid_shape'}`,
          { path: exportPath },
        ),
      );
    } else {
      const counts = expProbe.value.counts || {};
      const collisions = Number(counts.boardCollisions ?? expProbe.value.diagnostics?.collisions?.length ?? 0);
      const dups = Number(counts.duplicateMapBoards ?? expProbe.value.diagnostics?.duplicateBoards?.length ?? 0);
      const ok = collisions === 0 && dups === 0;
      controls.push(
        control(
          'export_board_identity_clean',
          'med',
          ok,
          ok
            ? `export identity clean · boards=${counts.ledgerOpenRoleKeys ?? counts.rows ?? '?'}`
            : `boardCollisions=${collisions} duplicateMapBoards=${dups}`,
          { boardCollisions: collisions, duplicateMapBoards: dups, rows: counts.rows ?? null },
        ),
      );
    }
  }

  // —— CH-13 reseal schedule (low; network not required) ——
  try {
    const due = resealDue({ maxAgeDays: 7 });
    const ok = due.due !== true;
    controls.push(
      control(
        'reseal_schedule_ok',
        'low',
        ok,
        ok
          ? `reseal not due · ageDays=${due.ageDays ?? '?'} · ${due.reason}`
          : `reseal due · ${due.reason} · ageDays=${due.ageDays ?? '?'} — node demigod-reseal-queue.mjs run --schedule`,
        {
          due: due.due,
          reason: due.reason,
          ageDays: due.ageDays,
          lastAt: due.lastAt,
          pending: due.pending,
        },
      ),
    );
  } catch (e) {
    controls.push(control('reseal_schedule_ok', 'low', true, `n/a ${e.message || e}`));
  }

  const highFail = controls.filter((c) => c.severity === 'high' && !c.ok);
  // Default: research_seal high-fail does not fail board exit (expected after map stamp).
  const exitFailers = highFail.filter((c) => {
    if (c.id === 'research_seal' && !opts.strictResearch) return false;
    return true;
  });

  const pass = controls.filter((c) => c.ok).length;
  const fail = controls.filter((c) => !c.ok).length;
  const board = {
    schema: SCHEMA,
    at: new Date().toISOString(),
    ok: exitFailers.length === 0,
    summary: `${fail} failing · ${pass} pass · highExitFail=${exitFailers.length}${opts.strictResearch ? ' strictResearch' : ''}`,
    controls,
    highFailures: highFail.map((c) => c.id),
    exitFailures: exitFailers.map((c) => c.id),
    policy:
      'Internal trust board (Vanta-shaped). Red research after map stamp is often correct. Do not invent roles to green phase2. No trust score.',
  };
  return board;
}

const HISTORY = path.join(BUSY, 'control-board-history.jsonl');

export function writeBoard(board) {
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  atomicWrite(OUT, `${JSON.stringify(board, null, 2)}\n`, { mode: 0o600 });
  // Vanta-shaped continuous monitoring: append compact history row
  try {
    const hist = {
      at: board.at,
      ok: board.ok,
      summary: board.summary,
      highFailures: board.highFailures || [],
      exitFailures: board.exitFailures || [],
      controls: (board.controls || []).map((c) => ({
        id: c.id,
        ok: c.ok,
        severity: c.severity,
      })),
    };
    fs.appendFileSync(HISTORY, `${JSON.stringify(hist)}\n`, { mode: 0o600 });
    try {
      fs.chmodSync(HISTORY, 0o600);
    } catch {
      /* */
    }
    // keep last ~200 lines
    const lines = fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean);
    if (lines.length > 200) {
      atomicWrite(HISTORY, `${lines.slice(-200).join('\n')}\n`, { mode: 0o600 });
    }
  } catch {
    /* history is best-effort */
  }
  return OUT;
}

function formatStatus(board) {
  const lines = [`# control-board · ${board.ok ? 'OK' : 'ATTENTION'} · ${board.summary}`, `  at ${board.at}`];
  for (const c of board.controls) {
    const mark = c.ok ? '✓' : '✗';
    lines.push(`  ${mark} [${c.severity}] ${c.id} — ${c.reason}`);
  }
  lines.push(`  receipt: ${OUT}`);
  return lines.join('\n');
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`control-board selftest: ${m}`);
  };
  // Pure shape of control()
  const c = control('x', 'high', true, 'ok', { a: 1 });
  assert(c.id === 'x' && c.ok === true && c.evidence.a === 1, 'control helper');

  // evaluateControls must return schema and controls array (live probes)
  const board = evaluateControls({ strictResearch: false });
  assert(board.schema === SCHEMA, 'schema');
  assert(Array.isArray(board.controls) && board.controls.length >= 5, 'controls present');
  const ids = new Set(board.controls.map((x) => x.id));
  for (const need of [
    'truth_seal',
    'research_seal',
    'research_export_honest',
    'phase2_gate_policy',
    'pairs_has_real',
    'demand_drafts_only',
    'role_poll_timer_healthy',
    'structured_hiring_no_score',
    'export_board_identity_clean',
    'reseal_schedule_ok',
  ]) {
    assert(ids.has(need), `missing ${need}`);
  }
  const shCtrl = board.controls.find((x) => x.id === 'structured_hiring_no_score');
  assert(shCtrl?.severity === 'med', 'SH integrity stays med (non-exit)');
  assert(board.controls.find((x) => x.id === 'export_board_identity_clean')?.severity === 'med', 'export identity med');
  assert(board.controls.find((x) => x.id === 'reseal_schedule_ok')?.severity === 'low', 'reseal schedule low');
  // Current controls retain their declared severity and never collapse into a score.
  const p2 = board.controls.find((x) => x.id === 'phase2_gate_policy');
  assert(p2?.severity === 'high', 'phase2 policy stays high');
  const pairs = board.controls.find((x) => x.id === 'pairs_has_real');
  assert(pairs?.severity === 'med', 'delivery emptiness stays non-blocking');
  const timerControl = board.controls.find((x) => x.id === 'role_poll_timer_healthy');
  assert(timerControl?.severity === 'med', 'role poll timer health stays operational, not an integrity exit');
  assert(!('score' in board) && !('trustScore' in board), 'no score');
  assert(board.schema === SCHEMA && JSON.stringify(board).includes('control-board'), 'serialize');

  // Existing-but-corrupt private receipts must fail closed, never masquerade as missing / n/a.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-control-board-'));
  try {
    fs.mkdirSync(path.join(tmp, 'recruitai-export'));
    fs.writeFileSync(path.join(tmp, 'recruitai-export', 'latest.json'), '{');
    fs.writeFileSync(path.join(tmp, 'demand-status.json'), '{');
    fs.writeFileSync(path.join(tmp, 'DEMIGOD-PAIRS.json'), '{');
    const timerProbe = {
      error: null,
      timer: {
        LoadState: 'loaded',
        ActiveState: 'active',
        UnitFileState: 'enabled',
        ActiveEnterTimestamp: 'Thu 2026-07-30 10:00:00 UTC',
        NextElapseUSecRealtime: 'Fri 2026-07-31 00:00:00 UTC',
      },
      service: {
        LoadState: 'loaded',
        ActiveState: 'inactive',
        Result: 'exit-code',
        ExecMainStatus: '1',
        ExecMainExitTimestamp: 'Thu 2026-07-30 11:00:00 UTC',
      },
    };
    const poisoned = evaluateControls({
      root: tmp,
      busy: tmp,
      nowMs: Date.parse('2026-07-30T12:00:00Z'),
      rolePollProbe: timerProbe,
    });
    for (const id of ['research_export_honest', 'pairs_store_readable', 'demand_drafts_only']) {
      const hit = poisoned.controls.find((x) => x.id === id);
      assert(hit?.severity === 'high' && hit.ok === false, `${id} rejects corrupt JSON`);
      assert(poisoned.exitFailures.includes(id), `${id} blocks green`);
    }
    const failedTimer = poisoned.controls.find((x) => x.id === 'role_poll_timer_healthy');
    assert(failedTimer?.severity === 'med' && failedTimer.ok === false, 'failed timer run is visible');
    assert(!poisoned.exitFailures.includes('role_poll_timer_healthy'), 'timer failure stays non-blocking');
    timerProbe.service.Result = 'success';
    timerProbe.service.ExecMainStatus = '0';
    const recovered = evaluateControls({
      root: tmp,
      busy: tmp,
      nowMs: Date.parse('2026-07-30T12:00:00Z'),
      rolePollProbe: timerProbe,
    }).controls.find((x) => x.id === 'role_poll_timer_healthy');
    assert(recovered?.ok === true, 'fresh successful timer run is green');

    // SH fitScore poison must surface as med control fail, not high exit
    fs.writeFileSync(
      path.join(tmp, 'DEMIGOD-ROLE-PACKETS.json'),
      JSON.stringify({ schema: 'x', packets: { r1: { roleId: 'r1', fitScore: 99 } } }),
    );
    const shPoison = evaluateControls({
      root: tmp,
      busy: tmp,
      nowMs: Date.parse('2026-07-30T12:00:00Z'),
      rolePollProbe: timerProbe,
    }).controls.find((x) => x.id === 'structured_hiring_no_score');
    assert(shPoison?.ok === false && shPoison.severity === 'med', 'SH fitScore poison med-fail');
    assert(
      !evaluateControls({
        root: tmp,
        busy: tmp,
        nowMs: Date.parse('2026-07-30T12:00:00Z'),
        rolePollProbe: timerProbe,
      }).exitFailures.includes('structured_hiring_no_score'),
      'SH poison non-exit',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(JSON.stringify({ ok: true, selftest: 'control-board', controls: board.controls.length }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-control-board.mjs [status|history] [--json] [--strict] [--n=20]
  status   human lines (default)
  history  last N rows from control-board-history.jsonl
  --json   full receipt JSON
  --strict fail exit when research_seal is red
  --selftest
Design: docs/die/CONTROL-BOARD-DESIGN.md`);
    process.exit(0);
  }
  const cmd = args.find((a) => !a.startsWith('-') && a !== 'status') || 'status';
  if (cmd === 'history') {
    let n = 20;
    for (const a of args) {
      if (a.startsWith('--n=')) n = Math.max(1, Math.min(200, parseInt(a.slice(4), 10) || 20));
    }
    const histPath = path.join(BUSY, 'control-board-history.jsonl');
    if (!fs.existsSync(histPath)) {
      console.log(JSON.stringify({ ok: true, rows: [], path: histPath }));
      return;
    }
    const rows = fs
      .readFileSync(histPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-n)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (args.includes('--json')) console.log(JSON.stringify({ ok: true, path: histPath, rows }, null, 2));
    else {
      console.log(`# control-board history · last ${rows.length}`);
      for (const r of rows) {
        console.log(
          `  ${String(r.at || '').slice(0, 19)} · ${r.ok ? 'OK' : 'ATTN'} · ${r.summary || ''} · highFail=${(r.highFailures || []).join(',') || '—'}`,
        );
      }
    }
    return;
  }
  const strictResearch = args.includes('--strict');
  const asJson = args.includes('--json');
  const board = evaluateControls({ strictResearch });
  writeBoard(board);
  if (asJson) console.log(JSON.stringify(board, null, 2));
  else console.log(formatStatus(board));
  process.exit(board.ok ? 0 : 1);
}

if (isMain) main();
