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
import { hiringFreshness } from './demigod-hiring-freshness.mjs';
import { identityReview } from './demigod-identity-review.mjs';
import {
  buildBoardCoverage,
  measureAgencyPolicyLandscape,
  measureClosedAgeLandscape,
  measureCompanyOpenLandscape,
  measureEmploymentTypeLandscape,
  measureExportAgeLandscape,
  measureExportChurnLandscape,
  measureExportDiagnosticsLandscape,
  measureExportDomainLandscape,
  measureExportFnLandscape,
  measureExportJobsUrlLandscape,
  measureExportLicenseLandscape,
  measureExportLocationLandscape,
  measureExportProviderLandscape,
  measureExportReqLandscape,
  measureExportRelationshipLandscape,
  measureExportResearchLandscape,
  measureExportSampleLandscape,
  measureExportSeniorityLandscape,
  measureFoundingLandscape,
  measureGeneralApplicationLandscape,
  measureLanguageLandscape,
  measureLastSeenLandscape,
  measureLedgerFnDrift,
  measureMapAgingLandscape,
  measureMapAtsLandscape,
  measureMapHiringHonestyLandscape,
  measureMapInceptionLandscape,
  measureMapJobsStampLandscape,
  measureMapLicenseLandscape,
  measureMapOpenRolesLandscape,
  measureMapProfileLandscape,
  measureMapRetrievedLandscape,
  measureMapRoleMixLandscape,
  measureMapSourceLandscape,
  measureMapTagsLandscape,
  measureMapWebsiteLandscape,
  measureMetroLandscape,
  measureNativeDateFieldLandscape,
  measureNativeUpdateLandscape,
  measureObservedAgeLandscape,
  measurePostedAgeLandscape,
  measurePostedDateRecycleLandscape,
  measureReopenLandscape,
  measureSeniorityLandscape,
  measureUrlHostLandscape,
  measureUsPostedLandscape,
  measureWorkplaceLandscape,
} from './demigod-enrichment.mjs';
import { measureMapRoleMixFreshness } from './demigod-directory-aging.mjs';
import { boardActivityInsightFromLedger } from './demigod-hiring-pulse.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const OUT = path.join(BUSY, 'control-board.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const SCHEMA = 'demigod.control-board/1';
const ROLE_TIMER = 'demigod-role-ledger.timer';
const ROLE_SERVICE = 'demigod-role-ledger.service';
const ROLE_POLL_MAX_AGE_MS = 36 * 60 * 60 * 1000;

/** Process-local mtime/size cache — evaluateControls re-probes ledger/export ~20×. */
const jsonProbeCache = new Map();

function readJsonProbe(p) {
  try {
    const st = fs.statSync(p);
    const hit = jsonProbeCache.get(p);
    if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.result;
    let result;
    try {
      result = { exists: true, value: JSON.parse(fs.readFileSync(p, 'utf8')), error: null };
    } catch (error) {
      result = {
        exists: true,
        value: null,
        error: error instanceof SyntaxError ? 'invalid_json' : String(error?.message || error),
      };
    }
    jsonProbeCache.set(p, { mtimeMs: st.mtimeMs, size: st.size, result });
    return result;
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, value: null, error: null };
    return {
      exists: true,
      value: null,
      error: String(error?.message || error),
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

  // —— /startups sealed fragment freshness (low; publish-gated paste — never exit-fail) ——
  // Receipt from demigod-site-health.mjs; content compare not data-generated-at (same-day-blind).
  {
    const shPath = path.join(busy, 'site-health.json');
    const shProbe = readJsonProbe(shPath);
    const sh = shProbe.value;
    const ageMs = sh?.at ? (opts.nowMs ?? Date.now()) - Date.parse(sh.at) : Number.POSITIVE_INFINITY;
    const freshEnough = Number.isFinite(ageMs) && ageMs <= 36 * 60 * 60 * 1000;
    if (!shProbe.exists) {
      controls.push(
        control(
          'startups_fragment_fresh',
          'low',
          true,
          'n/a — no site-health.json (run node demigod-site-health.mjs)',
          { path: shPath },
        ),
      );
    } else if (shProbe.error || !isPlainObject(sh)) {
      controls.push(
        control('startups_fragment_fresh', 'low', true, `n/a — unreadable receipt: ${shProbe.error || 'invalid_shape'}`, {
          path: shPath,
        }),
      );
    } else if (!freshEnough) {
      controls.push(
        control(
          'startups_fragment_fresh',
          'low',
          true,
          `n/a — site-health receipt stale ${Math.round(ageMs / 3600000)}h (re-run demigod-site-health.mjs)`,
          { at: sh.at, ageSec: Math.round(ageMs / 1000) },
        ),
      );
    } else {
      const fr = sh.freshness || {};
      const crawl = sh.crawlable || {};
      const failing = Array.isArray(sh.failing) ? sh.failing : null;
      // Prefer receipt.failing allowlist when present (same SoR as useful-loop observational).
      const bodyOk = failing
        ? !failing.includes('freshness') && !failing.includes('crawlable')
        : fr.required !== true || (crawl.crawlableWithoutJs && fr.ok === true);
      controls.push(
        control(
          'startups_fragment_fresh',
          'low',
          bodyOk,
          bodyOk
            ? fr.required
              ? `live /startups fragment fresh vs sealed · live=${fr.liveLen} sealed=${fr.sealedLen}`
              : 'no sealed dg-static required'
            : `${(fr.issues || []).join('; ') || 'live /startups fragment stale/missing'} · publish-gated paste (no thrash)`,
          {
            at: sh.at,
            required: fr.required ?? null,
            liveLen: fr.liveLen ?? null,
            sealedLen: fr.sealedLen ?? null,
            crawlableChars: crawl.chars ?? null,
            siteHealthOk: sh.ok ?? null,
            failing,
            fullyServed: sh.routes?.fullyServed ?? null,
          },
        ),
      );
    }
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

  // —— CH-15 / AR-25: observed ages still shallow (informative; never fail exit) ——
  {
    const agingP = path.join(opts.root || root, 'DEMIGOD-DIRECTORY-AGING.json');
    const agingProbe = readJsonProbe(agingP);
    if (!agingProbe.exists) {
      controls.push(
        control('directory_observed_ages', 'low', true, 'n/a — no directory aging asset', {
          path: agingP,
        }),
      );
    } else if (agingProbe.error || !isPlainObject(agingProbe.value)) {
      controls.push(
        control(
          'directory_observed_ages',
          'low',
          false,
          `aging asset unreadable: ${agingProbe.error || 'invalid_shape'}`,
          { path: agingP },
        ),
      );
    } else {
      let maxObs = 0;
      const cos = agingProbe.value.companies;
      if (cos && typeof cos === 'object') {
        for (const c of Object.values(cos)) {
          if (Number(c?.oldestObservedDays) > maxObs) maxObs = Number(c.oldestObservedDays);
        }
      }
      const badgesReady = maxObs >= 7;
      controls.push(
        control(
          'directory_observed_ages',
          'low',
          true,
          badgesReady
            ? `observed ages deep enough for ≥7d badges · max=${maxObs}d`
            : `observed ages young · max=${maxObs}d · ≥7d badges pending daily role-ledger timer (do not thrash poll)`,
          { maxOldestObservedDays: maxObs, badges7dReady: badgesReady },
        ),
      );
    }
  }

  // —— Claude reporters wired in. Four existed and none ran on a schedule; a reporter nobody runs
  // finds nothing. Both are informative (never fail board exit) and both are wrapped, because a
  // reporter throwing must not take the board down — that is exactly how this file hard-crashed
  // on `status` earlier today while its selftest reported all-green.
  try {
    const ledgerProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledgerProbe.exists || !ledgerProbe.value) {
      controls.push(control('posting_age_claim_qualified', 'low', true, 'n/a — no role ledger'));
    } else {
      const c = hiringFreshness(ledgerProbe.value).corpus;
      // The directory publishes a median posting age per company. It rests on the employer's
      // first_published date, which ATS platforms recycle on 30-90 day cycles. The threshold was
      // fixed before the first measurement so the verdict cannot be rationalised after the fact.
      controls.push(
        control(
          'posting_age_claim_qualified',
          'med',
          !c.claimQualificationNeeded,
          c.claimQualificationNeeded
            ? `posting-date recycling ${c.postedDateRecycledPctOfDated}% > ${c.claimQualificationThresholdPct}% — published median ages are understated, qualify the public copy`
            : `posting-date recycling ${c.postedDateRecycledPctOfDated}% within tolerance · published ages hold (lower bound)`,
          { recycledPct: c.postedDateRecycledPctOfDated, thresholdPct: c.claimQualificationThresholdPct, datedRoles: c.datedRoles },
        ),
      );
    }
  } catch (e) {
    controls.push(control('posting_age_claim_qualified', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Apify-thin: native date field mix (first_published attributed; other stamps are not claims) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('native_date_field_mix', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureNativeDateFieldLandscape(ledProbe.value);
      const top = (land.byNativeDateField || [])
        .slice(0, 5)
        .map((x) => `${x.field}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'native_date_field_mix',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withNative=${land.withNativePostedAt} · attributable first_published=${land.attributablePosted}` +
              (top ? ` · byField ${top}` : '') +
              ' · only first_published is posted-age claim',
          {
            open: land.open,
            withNativePostedAt: land.withNativePostedAt,
            attributablePosted: land.attributablePosted,
            byNativeDateField: land.byNativeDateField,
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('native_date_field_mix', 'low', true, `n/a ${e.message || e}`));
  }

  // —— TheirStack/poll residual: lastSeen re-observation lag (informative; never exit-fail) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_lastseen_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureLastSeenLandscape(ledProbe.value);
      const topP = (land.byProviderStale || [])
        .slice(0, 4)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyStaleTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_lastseen_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · ge3=${land.ge3} · ge7=${land.ge7} · maxDays=${land.maxDays}` +
              (topP ? ` · byProviderStale ${topP}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · lastSeen re-see lag (not ghost-job; do not thrash poll)',
          {
            open: land.open,
            withLastSeen: land.withLastSeen,
            maxDays: land.maxDays,
            ge1: land.ge1,
            ge3: land.ge3,
            ge7: land.ge7,
            ge3Share: land.ge3Share,
            byBucket: land.byBucket,
            byProviderStale: land.byProviderStale,
            byCompanyStaleTop: land.byCompanyStaleTop,
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_lastseen_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— TheirStack residual: reopenCount observation (low; never exit-fail; exits≠filled) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_reopen_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureReopenLandscape(ledProbe.value);
      const topP = (land.byProvider || [])
        .slice(0, 4)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_reopen_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withReopen=${land.withReopen} · events=${land.reopenEvents} · share=${land.share}` +
              (topP ? ` · byProvider ${topP}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · reopenCount when closed role reappears (not fill/churn quality; exits≠filled)',
          {
            open: land.open,
            withReopen: land.withReopen,
            withoutReopen: land.withoutReopen,
            reopenEvents: land.reopenEvents,
            share: land.share,
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 6) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 6) : [],
            byReopenCount: Array.isArray(land.byReopenCount) ? land.byReopenCount.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_reopen_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— AR-08 residual: general-application / catch-all title honesty (low; never exit-fail) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_general_application_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureGeneralApplicationLandscape(ledProbe.value);
      const topP = (land.byProvider || [])
        .slice(0, 4)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_general_application_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · generalApp=${land.generalApp} · concrete=${land.concrete} · share=${land.share}` +
              (topP ? ` · byProvider ${topP}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · catch-all title heuristic only (stays in open; not quality/demand score)',
          {
            open: land.open,
            generalApp: land.generalApp,
            concrete: land.concrete,
            share: land.share,
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 6) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 6) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_general_application_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Deel/Rippling residual: workplace from location text (low; never exit-fail) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_workplace_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureWorkplaceLandscape(ledProbe.value);
      const topP = (land.byProviderRemote || [])
        .slice(0, 3)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topFn = (land.byFnRemote || [])
        .slice(0, 3)
        .map((x) => `${x.fn}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_workplace_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · remote=${land.remote} · hybrid=${land.hybrid} · onsite=${land.onsite} · unspecified=${land.unspecified} · remoteShare=${land.remoteShare}` +
              (topP ? ` · remoteByProvider ${topP}` : '') +
              (topFn ? ` · remoteByFn ${topFn}` : '') +
              ' · location-text buckets only (city-only unspecified; not remote-rate score)',
          {
            open: land.open,
            remote: land.remote,
            hybrid: land.hybrid,
            onsite: land.onsite,
            unspecified: land.unspecified,
            empty: land.empty,
            remoteShare: land.remoteShare,
            byProviderRemote: Array.isArray(land.byProviderRemote) ? land.byProviderRemote.slice(0, 5) : [],
            byFnRemote: Array.isArray(land.byFnRemote) ? land.byFnRemote.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_workplace_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— TheirStack residual: closedAt age depth (low; never exit-fail; closed≠filled) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_closed_age_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureClosedAgeLandscape(ledProbe.value);
      const topP = (land.byProvider || [])
        .slice(0, 4)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_closed_age_observation',
          'low',
          true,
          land.closed === 0
            ? 'n/a — no closed roles'
            : `closed=${land.closed} · withAge=${land.withAge} · maxDays=${land.maxDays} · ge3=${land.ge3} · ge7=${land.ge7}` +
              (topP ? ` · byProvider ${topP}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · days since closedAt only (closure history depth; closed≠filled; do not thrash poll)',
          {
            closed: land.closed,
            withAge: land.withAge,
            invalid: land.invalid,
            maxDays: land.maxDays,
            ge1: land.ge1,
            ge3: land.ge3,
            ge7: land.ge7,
            ge7Share: land.ge7Share,
            byBucket: land.byBucket,
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 6) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 6) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_closed_age_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Rippling/HRIS residual: employment-type title heuristic (low; never exit-fail; not HRIS class) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_employment_type_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureEmploymentTypeLandscape(ledProbe.value);
      const topP = (land.byProviderContract || [])
        .slice(0, 3)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topFn = (land.byFnIntern || [])
        .slice(0, 3)
        .map((x) => `${x.fn}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_employment_type_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · intern=${land.intern} · partTime=${land.partTime} · contract=${land.contract} · unspecified=${land.unspecified} · specified=${land.specified} · specifiedShare=${land.specifiedShare}` +
              (topP ? ` · contractByProvider ${topP}` : '') +
              (topFn ? ` · internByFn ${topFn}` : '') +
              ' · title-heuristic only (not full-time/HRIS class; Contracts craft stays unspecified)',
          {
            open: land.open,
            intern: land.intern,
            partTime: land.partTime,
            contract: land.contract,
            unspecified: land.unspecified,
            specified: land.specified,
            specifiedShare: land.specifiedShare,
            byType: Array.isArray(land.byType) ? land.byType.slice(0, 6) : [],
            byProviderContract: Array.isArray(land.byProviderContract)
              ? land.byProviderContract.slice(0, 5)
              : [],
            byFnIntern: Array.isArray(land.byFnIntern) ? land.byFnIntern.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_employment_type_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Ashby residual: title-heuristic seniority mix (low; never exit-fail; not leveling score) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_seniority_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureSeniorityLandscape(ledProbe.value);
      const specifiedShare = land.open
        ? Number((land.specified / land.open).toFixed(4))
        : 0;
      const topS = (land.bySeniority || [])
        .filter((x) => x.seniority !== 'unspecified')
        .slice(0, 4)
        .map((x) => `${x.seniority}=${x.n}`)
        .join('/');
      const topEng = (land.byEngineeringSeniority || [])
        .slice(0, 3)
        .map((x) => `${x.seniority}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_seniority_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · specified=${land.specified} · unspecified=${land.unspecified} · specifiedShare=${specifiedShare}` +
              (topS ? ` · bySeniority ${topS}` : '') +
              (topEng ? ` · engBySeniority ${topEng}` : '') +
              ' · title-heuristic only (unspecified≠mid; not leveling/org-design score)',
          {
            open: land.open,
            specified: land.specified,
            unspecified: land.unspecified,
            specifiedShare,
            bySeniority: Array.isArray(land.bySeniority) ? land.bySeniority.slice(0, 10) : [],
            byEngineeringSeniority: Array.isArray(land.byEngineeringSeniority)
              ? land.byEngineeringSeniority.slice(0, 8)
              : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_seniority_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— AR-27 residual: positive-only agency policy evidence (low; never exit-fail; silence≠no-agency) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_agency_policy_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureAgencyPolicyLandscape(ledProbe.value);
      const topP = (land.byProvider || [])
        .slice(0, 4)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_agency_policy_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withPolicy=${land.withPolicy} · withoutPolicy=${land.withoutPolicy} · share=${land.share}` +
              (topP ? ` · byProvider ${topP}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · positive-only supported no_unsolicited_agency evidence (silence≠no-agency; not agency-ban score)',
          {
            open: land.open,
            withPolicy: land.withPolicy,
            withoutPolicy: land.withoutPolicy,
            share: land.share,
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 6) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 6) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_agency_policy_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Deel residual: usPosted location-gate mix (low; never exit-fail; not EOR/visa score) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_us_posted_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureUsPostedLandscape(ledProbe.value);
      const topP = (land.byProviderUs || [])
        .slice(0, 3)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topFn = (land.byFnUs || [])
        .slice(0, 3)
        .map((x) => `${x.fn}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_us_posted_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · usPosted=${land.usPosted} · nonUs=${land.nonUs} · share=${land.share}` +
              (topP ? ` · byProviderUs ${topP}` : '') +
              (topFn ? ` · byFnUs ${topFn}` : '') +
              ' · location-gate only (nonUs includes empty/ambiguous; not EOR/visa/compliance score)',
          {
            open: land.open,
            usPosted: land.usPosted,
            nonUs: land.nonUs,
            share: land.share,
            byProviderUs: Array.isArray(land.byProviderUs) ? land.byProviderUs.slice(0, 5) : [],
            byProviderNonUs: Array.isArray(land.byProviderNonUs) ? land.byProviderNonUs.slice(0, 5) : [],
            byFnUs: Array.isArray(land.byFnUs) ? land.byFnUs.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_us_posted_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Coresignal residual: postedDateChangeCount recycle (low; never exit-fail; ages lower bound) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_posted_date_recycle_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measurePostedDateRecycleLandscape(ledProbe.value);
      const topP = (land.byProvider || [])
        .slice(0, 4)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_posted_date_recycle_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withRecycle=${land.withRecycle} · withoutRecycle=${land.withoutRecycle} · changeEvents=${land.changeEvents} · share=${land.share}` +
              (topP ? ` · byProvider ${topP}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · board nativePostedAt changed while open (stored ages lower bound; not fraud/quality score)',
          {
            open: land.open,
            withRecycle: land.withRecycle,
            withoutRecycle: land.withoutRecycle,
            changeEvents: land.changeEvents,
            share: land.share,
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 6) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 6) : [],
            byChangeCount: Array.isArray(land.byChangeCount) ? land.byChangeCount.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_posted_date_recycle_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Phenom residual: multi-label US metro from location text (low; never exit-fail; not geo rank) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_metro_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureMetroLandscape(ledProbe.value);
      const topM = (land.byMetro || [])
        .slice(0, 5)
        .map((x) => `${x.metro}=${x.n}`)
        .join('/');
      const topFn = (land.byFnSfBay || [])
        .slice(0, 3)
        .map((x) => `${x.fn}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_metro_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withMetro=${land.withMetro} · withoutMetro=${land.withoutMetro} · multiMetro=${land.multiMetro} · sfBay=${land.sfBay} · sfBayShare=${land.sfBayShare}` +
              (topM ? ` · byMetro ${topM}` : '') +
              (topFn ? ` · sfBayByFn ${topFn}` : '') +
              ' · location-text multi-label only (remote/unknown=withoutMetro; not geo-rank/visa score)',
          {
            open: land.open,
            withMetro: land.withMetro,
            withoutMetro: land.withoutMetro,
            multiMetro: land.multiMetro,
            sfBay: land.sfBay,
            sfBayShare: land.sfBayShare,
            byMetro: Array.isArray(land.byMetro) ? land.byMetro.slice(0, 10) : [],
            byProviderSfBay: Array.isArray(land.byProviderSfBay) ? land.byProviderSfBay.slice(0, 5) : [],
            byFnSfBay: Array.isArray(land.byFnSfBay) ? land.byFnSfBay.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_metro_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— PredictLeads residual: founding/early-seat title signal (low; never exit-fail; not stage score) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_founding_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureFoundingLandscape(ledProbe.value);
      const topP = (land.byProvider || [])
        .slice(0, 3)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      const topFn = (land.byFn || [])
        .slice(0, 3)
        .map((x) => `${x.fn}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_founding_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · founding=${land.founding} · nonFounding=${land.nonFounding} · share=${land.share}` +
              (topP ? ` · byProvider ${topP}` : '') +
              (topFn ? ` · byFn ${topFn}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · title-heuristic early-seat only (excludes ex/former/future founder; not stage/intent score)',
          {
            open: land.open,
            founding: land.founding,
            nonFounding: land.nonFounding,
            share: land.share,
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 6) : [],
            byFn: Array.isArray(land.byFn) ? land.byFn.slice(0, 6) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 6) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_founding_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Phenom residual: language/bilingual title markers (low; never exit-fail; not skill graph) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_language_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureLanguageLandscape(ledProbe.value);
      const topL = (land.byLanguage || [])
        .slice(0, 5)
        .map((x) => `${x.language}=${x.n}`)
        .join('/');
      const topFn = (land.byFn || [])
        .slice(0, 3)
        .map((x) => `${x.fn}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_language_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withLanguage=${land.withLanguage} · bilingual=${land.bilingual} · withoutLanguage=${land.withoutLanguage} · share=${land.share}` +
              (topL ? ` · byLanguage ${topL}` : '') +
              (topFn ? ` · byFn ${topFn}` : '') +
              ' · title-heuristic only (silence≠monolingual; franchise≠french; not skill/localization score)',
          {
            open: land.open,
            withLanguage: land.withLanguage,
            withoutLanguage: land.withoutLanguage,
            bilingual: land.bilingual,
            share: land.share,
            byLanguage: Array.isArray(land.byLanguage) ? land.byLanguage.slice(0, 10) : [],
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 5) : [],
            byFn: Array.isArray(land.byFn) ? land.byFn.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_language_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Greenhouse residual: nativeUpdatedAfterFirstPublished (low; never exit-fail; not ghost-job %) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_native_update_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureNativeUpdateLandscape(ledProbe.value);
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_native_update_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withFlag=${land.withFlag} · withoutFlag=${land.withoutFlag} · updatedAfter=${land.updatedAfter} · notUpdatedAfter=${land.notUpdatedAfter} · shareOfFlagged=${land.shareOfFlagged}` +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · GH updated_at>first_published only (withoutFlag=Ashby/Lever; not ghost-job/content-quality score)',
          {
            open: land.open,
            withFlag: land.withFlag,
            withoutFlag: land.withoutFlag,
            updatedAfter: land.updatedAfter,
            notUpdatedAfter: land.notUpdatedAfter,
            flagNull: land.flagNull,
            shareOfOpen: land.shareOfOpen,
            shareOfFlagged: land.shareOfFlagged,
            byProviderTrue: Array.isArray(land.byProviderTrue) ? land.byProviderTrue.slice(0, 5) : [],
            byProviderFlag: Array.isArray(land.byProviderFlag) ? land.byProviderFlag.slice(0, 5) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 6) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_native_update_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— PredictLeads residual: company open concentration (low; never exit-fail; not rank/intent) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_company_open_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureCompanyOpenLandscape(ledProbe.value);
      const topC = (land.byCompanyTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      const topP = (land.byProviderOpen || [])
        .slice(0, 3)
        .map((x) => `${x.provider}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_company_open_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · companies=${land.companies} · top10Share=${land.top10Share} · top25Share=${land.top25Share}` +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              (topP ? ` · byProviderOpen ${topP}` : '') +
              ' · point-in-time open counts by company name (concentration honesty only; not intent/rank/quality score)',
          {
            open: land.open,
            companies: land.companies,
            top10Share: land.top10Share,
            top25Share: land.top25Share,
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 8) : [],
            byCompanyBucket: Array.isArray(land.byCompanyBucket) ? land.byCompanyBucket : [],
            byProviderOpen: Array.isArray(land.byProviderOpen) ? land.byProviderOpen.slice(0, 5) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_company_open_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Merge residual: apply-URL host class (low; never exit-fail; not scrape-target/quality score) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_url_host_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureUrlHostLandscape(ledProbe.value);
      const topH = (land.byHostTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.host).slice(0, 28)}=${x.n}`)
        .join('/');
      const topPc = (land.byProviderClass || [])
        .slice(0, 3)
        .map((x) => `${String(x.providerClass).slice(0, 32)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'ledger_url_host_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · atsNative=${land.atsNative} · careersHost=${land.careersHost} · customDomain=${land.customDomain} · invalid=${land.invalid} · atsNativeShare=${land.atsNativeShare}` +
              (topH ? ` · byHostTop ${topH}` : '') +
              (topPc ? ` · byProviderClass ${topPc}` : '') +
              ' · apply URL hostname classes only (complements provider; not scrape targets or quality score)',
          {
            open: land.open,
            atsNative: land.atsNative,
            careersHost: land.careersHost,
            customDomain: land.customDomain,
            invalid: land.invalid,
            atsNativeShare: land.atsNativeShare,
            byHostClass: Array.isArray(land.byHostClass) ? land.byHostClass.slice(0, 8) : [],
            byProviderClass: Array.isArray(land.byProviderClass) ? land.byProviderClass.slice(0, 6) : [],
            byHostTop: Array.isArray(land.byHostTop) ? land.byHostTop.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_url_host_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— AR-25 residual: firstSeen observation depth (low; never exit-fail; not ghost-job %; do not thrash poll) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_observed_age_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measureObservedAgeLandscape(ledProbe.value);
      const b = land.byBucket || {};
      const bucketLine = ['0d', '1-2d', '3-6d', '7-13d', '14-29d', '30d+']
        .map((k) => `${k}=${b[k] || 0}`)
        .join('/');
      controls.push(
        control(
          'ledger_observed_age_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · withFirstSeen=${land.withFirstSeen} · withoutFirstSeen=${land.withoutFirstSeen} · maxDays=${land.maxDays} · ge7=${land.ge7} · ge30=${land.ge30}` +
              ` · byBucket ${bucketLine}` +
              ' · firstSeen observation days only (not board posted age; ge7/ge30 badge readiness — not ghost-job; do not thrash poll)',
          {
            open: land.open,
            withFirstSeen: land.withFirstSeen,
            withoutFirstSeen: land.withoutFirstSeen,
            maxDays: land.maxDays,
            ge7: land.ge7,
            ge30: land.ge30,
            byBucket: land.byBucket,
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_observed_age_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Ashby residual: first_published posted-age buckets (low; never exit-fail; not ghost-job %) ——
  // Complements posting_age_claim_qualified (recycle %) + native_date_field_mix (which stamps claim).
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_posted_age_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const land = measurePostedAgeLandscape(ledProbe.value);
      const b = land.byBucket || {};
      const bucketLine = ['0-6d', '7-29d', '30-89d', '90-365d', '365d+']
        .map((k) => `${k}=${b[k] || 0}`)
        .join('/');
      controls.push(
        control(
          'ledger_posted_age_observation',
          'low',
          true,
          land.open === 0
            ? 'n/a — no open roles'
            : `open=${land.open} · attributable=${land.attributable} · withoutAttributed=${land.withoutAttributed} · maxDays=${land.maxDays} · aging90_365=${land.agingRoles} · evergreen365p=${land.evergreenRoles}` +
              ` · byBucket ${bucketLine}` +
              ' · first_published only (stamps excluded; aging=90–365d evergreen=>365d — not ghost-job rates)',
          {
            open: land.open,
            attributable: land.attributable,
            withoutAttributed: land.withoutAttributed,
            maxDays: land.maxDays,
            agingRoles: land.agingRoles,
            evergreenRoles: land.evergreenRoles,
            byBucket: land.byBucket,
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_posted_age_observation', 'low', true, `n/a ${e.message || e}`));
  }

  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('directory_identity_candidates', 'low', true, 'n/a — no startup map'));
    } else {
      const r = identityReview(mapProbe.value).counts;
      // Informative, never a failure: a candidate is a question for a human, not a defect. Merging
      // on a name match would destroy the genuinely distinct companies that share one.
      controls.push(
        control(
          'directory_identity_candidates',
          'low',
          true,
          r.reviewCandidates
            ? `${r.reviewCandidates} possible duplicate row(s) — up to ${r.inflationUpperBound} of the published company count; review, never auto-merge`
            : 'no identity review candidates',
          { reviewCandidates: r.reviewCandidates, inflationUpperBound: r.inflationUpperBound, distinctWebsites: r.distinctWebsites },
        ),
      );
    }
  } catch (e) {
    controls.push(control('directory_identity_candidates', 'low', true, `n/a ${e.message || e}`));
  }

  // —— AR-28: secondary ATS yield honesty (informative; never thrash poll / invent boards) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('ats_secondary_coverage', 'low', true, 'n/a — no startup map'));
    } else {
      const cov = buildBoardCoverage({ map: mapProbe.value });
      const m = cov.map || {};
      const by = m.byAtsProvider || {};
      // Prefer host-class landscape (jobsUrl) over open-only byAtsProvider; secondaryOpen is owner-gated yield.
      const secondaryHosts = Number(m.secondary ?? 0);
      const secondaryOpen = Number(m.secondaryOpen ?? 0);
      const primaryHosts = Number(m.primary ?? 0);
      const primaryOpen = Number(
        m.primaryOpen ??
          ['Ashby', 'Greenhouse', 'Lever', 'Workable'].reduce((n, k) => n + Number(by[k] || 0), 0),
      );
      const open = Number(m.withOpenRoles || 0);
      const yc = Number(m.ycJobsPage || 0);
      // Always pass: yield=0 is honest until next enrich cycle; never fail exit on calendar wait.
      controls.push(
        control(
          'ats_secondary_coverage',
          'low',
          true,
          secondaryOpen > 0
            ? `secondary ATS open boards=${secondaryOpen} (hosts=${secondaryHosts}) · primaryOpen=${primaryOpen} · openRoles boards=${open}`
            : secondaryHosts > 0
              ? `secondary ATS hosts=${secondaryHosts} but open=0 · primaryOpen=${primaryOpen} · open=${open} — owner-gated enrich pending (no poll thrash)`
              : `secondary ATS open boards=0 (Personio/Recruitee/SR) · primaryOpen=${primaryOpen} · open=${open} · ycJobsPage=${yc} — detect owner-gated; yield waits enrich (no poll thrash)`,
          {
            byAtsProvider: by,
            byHostClass: m.byHostClass || [],
            byHost: m.byHost || [],
            secondaryHosts,
            secondaryOpenBoards: secondaryOpen,
            primaryHosts,
            primaryOpenBoards: primaryOpen,
            ycJobsPage: yc,
            withOpenRoles: open,
            withJobsUrl: m.withJobsUrl ?? null,
            noJobsUrl: m.noJobsUrl ?? null,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ats_secondary_coverage', 'low', true, `n/a ${e.message || e}`));
  }

  // —— AR-28 residual: full map ATS landscape (low; never exit-fail; complements secondary-yield control) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_ats_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapAtsLandscape(mapProbe.value);
      const topAts = (land.byAtsSource || [])
        .slice(0, 4)
        .map((x) => `${x.atsSource}=${x.n}`)
        .join('/');
      const topH = (land.byHost || [])
        .slice(0, 3)
        .map((x) => `${String(x.host).slice(0, 28)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'map_ats_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · withJobsUrl=${land.withJobsUrl} · noJobsUrl=${land.noJobsUrl} · withOpenRoles=${land.withOpenRoles} · jobsUrlNoOpenRoles=${land.jobsUrlNoOpenRoles} · primary=${land.primary} · secondary=${land.secondary} · ycJobsPage=${land.ycJobsPage}` +
              (topAts ? ` · byAtsSource ${topAts}` : '') +
              (topH ? ` · byHost ${topH}` : '') +
              ' · map jobsUrl/atsSource counts only (no new scrapers; secondary open owner-gated; not coverage score)',
          {
            companies: land.companies,
            withJobsUrl: land.withJobsUrl,
            noJobsUrl: land.noJobsUrl,
            withOpenRoles: land.withOpenRoles,
            jobsUrlNoOpenRoles: land.jobsUrlNoOpenRoles,
            primary: land.primary,
            secondary: land.secondary,
            primaryOpen: land.primaryOpen,
            secondaryOpen: land.secondaryOpen,
            ycJobsPage: land.ycJobsPage,
            byHostClass: Array.isArray(land.byHostClass) ? land.byHostClass.slice(0, 8) : [],
            byHost: Array.isArray(land.byHost) ? land.byHost.slice(0, 8) : [],
            byAtsSource: Array.isArray(land.byAtsSource) ? land.byAtsSource.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_ats_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Wellfound residual: map source/YC/tag landscape (low; never exit-fail; not stage score) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_source_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapSourceLandscape(mapProbe.value);
      const topS = (land.bySource || [])
        .slice(0, 4)
        .map((x) => `${String(x.source).slice(0, 24)}=${x.n}`)
        .join('/');
      const topB = (land.byYcBatchTop || [])
        .slice(0, 3)
        .map((x) => `${String(x.batch).slice(0, 16)}=${x.n}`)
        .join('/');
      const topD = (land.byInceptionDecade || [])
        .slice(0, 3)
        .map((x) => `${x.decade}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'map_source_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · ycTagged=${land.ycTagged} · ycShare=${land.ycShare} · withYcBatch=${land.withYcBatch} · wikidata=${land.wikidata} · hnHiring=${land.hnHiring} · hiringLabeled=${land.hiringLabeled} · withLedgerOpen=${land.withLedgerOpen} · withInception=${land.withInception}` +
              (topS ? ` · bySource ${topS}` : '') +
              (topB ? ` · byYcBatch ${topB}` : '') +
              (topD ? ` · byInceptionDecade ${topD}` : '') +
              ' · tags/source/inception/hiring tallies only (not stage/fundraising score)',
          {
            companies: land.companies,
            ycTagged: land.ycTagged,
            ycShare: land.ycShare,
            withYcBatch: land.withYcBatch,
            wikidata: land.wikidata,
            hnHiring: land.hnHiring,
            hiringLabeled: land.hiringLabeled,
            withLedgerOpen: land.withLedgerOpen,
            withInception: land.withInception,
            bySource: Array.isArray(land.bySource) ? land.bySource.slice(0, 8) : [],
            byYcBatchTop: Array.isArray(land.byYcBatchTop) ? land.byYcBatchTop.slice(0, 6) : [],
            byInceptionDecade: Array.isArray(land.byInceptionDecade) ? land.byInceptionDecade.slice(0, 6) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_source_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Clay residual: map tag density landscape (low; never exit-fail; not skill graph/quality rank) ——
  // Complements map_source_observation (source/YC batch) with 0/1/multi tag mix + byTagTop.
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_tags_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapTagsLandscape(mapProbe.value);
      const topT = (land.byTagTop || [])
        .slice(0, 4)
        .map((x) => `${String(x.tag).slice(0, 28)}=${x.n}`)
        .join('/');
      const topC = (land.byTagCount || [])
        .slice(0, 4)
        .map((x) => `${x.count}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'map_tags_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · withTags=${land.withTags} · withoutTags=${land.withoutTags} · singleTag=${land.singleTag} · multiTag=${land.multiTag} · multiShare=${land.multiShare} · ycTag=${land.ycTag} · ycBatchTag=${land.ycBatchTag} · wikidataTag=${land.wikidataTag} · hnTag=${land.hnTag} · jobsMultiTag=${land.jobsMultiTag}` +
              (topC ? ` · byTagCount ${topC}` : '') +
              (topT ? ` · byTagTop ${topT}` : '') +
              ' · tag length mix + provenance tags only (not skill graph, topic model, or quality rank)',
          {
            companies: land.companies,
            withTags: land.withTags,
            withoutTags: land.withoutTags,
            singleTag: land.singleTag,
            multiTag: land.multiTag,
            multiShare: land.multiShare,
            ycTag: land.ycTag,
            ycBatchTag: land.ycBatchTag,
            wikidataTag: land.wikidataTag,
            hnTag: land.hnTag,
            withJobsUrl: land.withJobsUrl,
            jobsMultiTag: land.jobsMultiTag,
            byTagCount: Array.isArray(land.byTagCount) ? land.byTagCount.slice(0, 8) : [],
            byTagTop: Array.isArray(land.byTagTop) ? land.byTagTop.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_tags_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Clearbit residual: map website host/TLD landscape (low; never exit-fail; not brand/geo score) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_website_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapWebsiteLandscape(mapProbe.value);
      const topTld = (land.byTld || [])
        .slice(0, 5)
        .map((x) => `${x.tld}=${x.n}`)
        .join('/');
      const multi = (land.multiHost || [])
        .slice(0, 3)
        .map((x) => `${String(x.host).slice(0, 28)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'map_website_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · withHost=${land.withHost} · invalid=${land.invalid} · com=${land.com} · ai=${land.ai} · io=${land.io} · comShare=${land.comShare} · aiShare=${land.aiShare}` +
              (topTld ? ` · byTld ${topTld}` : '') +
              (multi ? ` · multiHost ${multi}` : '') +
              ' · website hostname + last-label TLD only (not full PSL; not brand/domain quality/geo score)',
          {
            companies: land.companies,
            withHost: land.withHost,
            invalid: land.invalid,
            com: land.com,
            ai: land.ai,
            io: land.io,
            comShare: land.comShare,
            aiShare: land.aiShare,
            byTld: Array.isArray(land.byTld) ? land.byTld.slice(0, 10) : [],
            byHostTop: Array.isArray(land.byHostTop) ? land.byHostTop.slice(0, 8) : [],
            multiHost: Array.isArray(land.multiHost) ? land.multiHost.slice(0, 6) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_website_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Crunchbase residual: map inception age cohorts (low; never exit-fail; not stage/fundraise score) ——
  // Complements map_source byInceptionDecade with age cohorts + medianAge + young0to2.
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_inception_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapInceptionLandscape(mapProbe.value);
      const topC = (land.byAgeCohort || [])
        .slice(0, 5)
        .map((x) => `${x.cohort}=${x.n}`)
        .join('/');
      const topD = (land.byDecade || [])
        .slice(0, 4)
        .map((x) => `${x.decade}=${x.n}`)
        .join('/');
      const topY = (land.byYearTop || [])
        .slice(0, 3)
        .map((x) => `${x.year}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'map_inception_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · withInception=${land.withInception} · withoutInception=${land.withoutInception} · invalid=${land.invalid} · asOfYear=${land.asOfYear} · medianYear=${land.medianYear} · medianAgeYears=${land.medianAgeYears} · young0to2=${land.young0to2} · young0to2Share=${land.young0to2Share} · jobsWithInception=${land.jobsWithInception} · hiringWithInception=${land.hiringWithInception}` +
              (topC ? ` · byAgeCohort ${topC}` : '') +
              (topD ? ` · byDecade ${topD}` : '') +
              (topY ? ` · byYearTop ${topY}` : '') +
              ' · inceptionYear age cohorts only (not stage/fundraising/headcount score)',
          {
            companies: land.companies,
            withInception: land.withInception,
            withoutInception: land.withoutInception,
            invalid: land.invalid,
            asOfYear: land.asOfYear,
            minYear: land.minYear,
            maxYear: land.maxYear,
            medianYear: land.medianYear,
            minAgeYears: land.minAgeYears,
            maxAgeYears: land.maxAgeYears,
            medianAgeYears: land.medianAgeYears,
            young0to2: land.young0to2,
            young0to2Share: land.young0to2Share,
            withJobsUrl: land.withJobsUrl,
            jobsWithInception: land.jobsWithInception,
            hiringYes: land.hiringYes,
            hiringWithInception: land.hiringWithInception,
            byAgeCohort: Array.isArray(land.byAgeCohort) ? land.byAgeCohort.slice(0, 8) : [],
            byDecade: Array.isArray(land.byDecade) ? land.byDecade.slice(0, 6) : [],
            byYearTop: Array.isArray(land.byYearTop) ? land.byYearTop.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_inception_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Clearbit residual: map profile field presence (low; never exit-fail; not enrichment quality score) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_profile_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapProfileLandscape(mapProbe.value);
      const topD = (land.byDescBucket || [])
        .slice(0, 4)
        .map((x) => `${x.bucket}=${x.n}`)
        .join('/');
      const topP = (land.byLocationPrecision || [])
        .slice(0, 4)
        .map((x) => `${String(x.precision).slice(0, 20)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'map_profile_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · withWebsite=${land.withWebsite} · emptyWebsite=${land.emptyWebsite} · withDescription=${land.withDescription} · emptyDescription=${land.emptyDescription} · shortDescription=${land.shortDescription} · withInception=${land.withInception} · withNeighborhood=${land.withNeighborhood} · coreComplete=${land.coreComplete} · coreCompleteShare=${land.coreCompleteShare}` +
              (topD ? ` · byDescBucket ${topD}` : '') +
              (topP ? ` · byLocationPrecision ${topP}` : '') +
              ' · field presence only (core=website+desc+inception; not firmographic quality/headcount score)',
          {
            companies: land.companies,
            withWebsite: land.withWebsite,
            emptyWebsite: land.emptyWebsite,
            withDescription: land.withDescription,
            emptyDescription: land.emptyDescription,
            shortDescription: land.shortDescription,
            withInception: land.withInception,
            withNeighborhood: land.withNeighborhood,
            coreComplete: land.coreComplete,
            coreCompleteShare: land.coreCompleteShare,
            byDescBucket: Array.isArray(land.byDescBucket) ? land.byDescBucket.slice(0, 8) : [],
            byLocationPrecision: Array.isArray(land.byLocationPrecision)
              ? land.byLocationPrecision.slice(0, 8)
              : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_profile_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— CH-15 residual: map company oldestObservedDays / agingRoles (low; never exit-fail; not ghost-job score) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_aging_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapAgingLandscape(mapProbe.value);
      const topB = Object.entries(land.byOldestBucket || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 6)
        .map(([k, n]) => `${k}=${n}`)
        .join('/');
      controls.push(
        control(
          'map_aging_observation',
          'low',
          true,
          land.withLedgerOpen === 0
            ? 'n/a — no map companies with ledgerOpenRoles'
            : `withLedgerOpen=${land.withLedgerOpen} · withOldestObserved=${land.withOldestObserved} · withoutOldestObserved=${land.withoutOldestObserved} · maxOldestDays=${land.maxOldestDays} · ge7=${land.ge7} · ge30=${land.ge30} · withAgingRoles=${land.withAgingRoles} · agingRolesSum=${land.agingRolesSum} · withMedianPosted=${land.withMedianPosted}` +
              (topB ? ` · byBucket ${topB}` : '') +
              ' · company oldestObservedDays only (not board posted age; ge7/ge30 badge readiness — not ghost-job; calendar time not poll thrash)',
          {
            withLedgerOpen: land.withLedgerOpen,
            withOldestObserved: land.withOldestObserved,
            withoutOldestObserved: land.withoutOldestObserved,
            maxOldestDays: land.maxOldestDays,
            ge7: land.ge7,
            ge30: land.ge30,
            withAgingRoles: land.withAgingRoles,
            agingRolesSum: land.agingRolesSum,
            withMedianPosted: land.withMedianPosted,
            byOldestBucket: land.byOldestBucket || {},
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_aging_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Wikidata/YC residual: map sourceLicense + sourceUrl host (low; never exit-fail; not clearance score) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_license_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapLicenseLandscape(mapProbe.value);
      const topL = (land.byLicense || [])
        .slice(0, 5)
        .map((x) => `${String(x.license).slice(0, 24)}=${x.n}`)
        .join('/');
      const topH = (land.bySourceHost || [])
        .slice(0, 4)
        .map((x) => `${String(x.host).slice(0, 28)}=${x.n}`)
        .join('/');
      const topX = (land.byLicenseJobs || [])
        .slice(0, 4)
        .map((x) => `${String(x.key).slice(0, 32)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'map_license_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · withLicense=${land.withLicense} · withoutLicense=${land.withoutLicense} · ycPublic=${land.ycPublic} · cc0=${land.cc0} · hnPublic=${land.hnPublic} · ycPublicShare=${land.ycPublicShare} · withJobsUrl=${land.withJobsUrl}` +
              (topL ? ` · byLicense ${topL}` : '') +
              (topH ? ` · bySourceHost ${topH}` : '') +
              (topX ? ` · byLicenseJobs ${topX}` : '') +
              ' · provenance license/host tallies only (not copyright clearance, content quality, or company rank)',
          {
            companies: land.companies,
            withLicense: land.withLicense,
            withoutLicense: land.withoutLicense,
            ycPublic: land.ycPublic,
            cc0: land.cc0,
            hnPublic: land.hnPublic,
            ycPublicShare: land.ycPublicShare,
            withJobsUrl: land.withJobsUrl,
            byLicense: Array.isArray(land.byLicense) ? land.byLicense.slice(0, 8) : [],
            bySourceHost: Array.isArray(land.bySourceHost) ? land.bySourceHost.slice(0, 8) : [],
            byLicenseJobs: Array.isArray(land.byLicenseJobs) ? land.byLicenseJobs.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_license_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Eightfold residual: map roleMix fn sums (low; never exit-fail; not demand/skill score) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_role_mix_observation', 'low', true, 'n/a — no startup map'));
    } else {
      const land = measureMapRoleMixLandscape(mapProbe.value);
      const topFn = (land.byFn || [])
        .slice(0, 6)
        .map((x) => `${String(x.fn).slice(0, 20)}=${x.n}`)
        .join('/');
      const topE = Object.entries(land.byEngShareBucket || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 5)
        .map(([k, n]) => `${k}=${n}`)
        .join('/');
      controls.push(
        control(
          'map_role_mix_observation',
          'low',
          true,
          land.companies === 0
            ? 'n/a — empty map'
            : `companies=${land.companies} · withRoleMix=${land.withRoleMix} · withoutRoleMix=${land.withoutRoleMix} · roleSum=${land.roleSum} · engShareOfRoles=${land.engShareOfRoles} · otherShareOfRoles=${land.otherShareOfRoles} · engDominant=${land.engDominant}` +
              (topFn ? ` · byFn ${topFn}` : '') +
              (topE ? ` · byEngShareBucket ${topE}` : '') +
              ' · map roleMix fn sums only (complements map_role_mix_fresh; not skill graphs, demand, or company quality)',
          {
            companies: land.companies,
            withRoleMix: land.withRoleMix,
            withoutRoleMix: land.withoutRoleMix,
            roleSum: land.roleSum,
            engShareOfRoles: land.engShareOfRoles,
            otherShareOfRoles: land.otherShareOfRoles,
            engDominant: land.engDominant,
            byFn: Array.isArray(land.byFn) ? land.byFn.slice(0, 12) : [],
            byEngShareBucket: land.byEngShareBucket || {},
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_role_mix_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— RecruitAI residual: export open-req board landscape (low; never exit-fail; not demand score) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_req_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control('export_req_observation', 'low', true, `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`),
      );
    } else {
      const land = measureExportReqLandscape(expProbe.value);
      const topB = Object.entries(land.byOpenReqBucket || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 5)
        .map(([k, n]) => `${k}=${n}`)
        .join('/');
      const topP = (land.byProvider || [])
        .slice(0, 4)
        .map((x) => `${String(x.provider).slice(0, 20)}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 4)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_req_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · openReqSum=${land.openReqSum} · engSum=${land.engSum} · salesSum=${land.salesSum} · remoteSum=${land.remoteSum} · peopleOpsSum=${land.peopleOpsSum} · noAgencySum=${land.noAgencySum} · observed7Sum=${land.observed7Sum} · withAttributed=${land.withAttributed} · withStaleAttributed=${land.withStaleAttributed} · withEvergreen=${land.withEvergreen} · withGhStaleUpdate=${land.withGhStaleUpdate} · withReopened=${land.withReopened} · withResearch=${land.withResearch}` +
              (topB ? ` · byOpenReqBucket ${topB}` : '') +
              (topP ? ` · byProvider ${topP}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · export board openReq tallies only (not company quality, demand, or ghost-job scores)',
          {
            boards: land.boards,
            openReqSum: land.openReqSum,
            engSum: land.engSum,
            salesSum: land.salesSum,
            remoteSum: land.remoteSum,
            peopleOpsSum: land.peopleOpsSum,
            noAgencySum: land.noAgencySum,
            observed7Sum: land.observed7Sum,
            withAttributed: land.withAttributed,
            withStaleAttributed: land.withStaleAttributed,
            withEvergreen: land.withEvergreen,
            withGhStaleUpdate: land.withGhStaleUpdate,
            withReopened: land.withReopened,
            withResearch: land.withResearch,
            attributedSum: land.attributedSum,
            staleAttributedSum: land.staleAttributedSum,
            evergreenSum: land.evergreenSum,
            byOpenReqBucket: land.byOpenReqBucket || {},
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 8) : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_req_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Ashby residual: export seniorityMix board landscape (low; never exit-fail; not leveling score) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_seniority_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_seniority_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportSeniorityLandscape(expProbe.value);
      const topL = (land.byLevel || [])
        .filter((x) => (x.n || 0) > 0)
        .slice(0, 8)
        .map((x) => `${String(x.level).slice(0, 20)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_seniority_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · withMix=${land.withMix} · withoutMix=${land.withoutMix} · roleSum=${land.roleSum} · specified=${land.specified} · unspecified=${land.unspecified} · specifiedShare=${land.specifiedShare} · boardsMajorityUnspecified=${land.boardsMajorityUnspecified}` +
              (topL ? ` · byLevel ${topL}` : '') +
              ' · export seniorityMix title-heuristic only (complements ledger_seniority; not leveling/calibration or company quality)',
          {
            boards: land.boards,
            withMix: land.withMix,
            withoutMix: land.withoutMix,
            roleSum: land.roleSum,
            specified: land.specified,
            unspecified: land.unspecified,
            specifiedShare: land.specifiedShare,
            boardsMajorityUnspecified: land.boardsMajorityUnspecified,
            byLevel: Array.isArray(land.byLevel) ? land.byLevel.slice(0, 12) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_seniority_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Phenom residual: export eng/sales/people/remote fn landscape (low; never exit-fail; not demand score) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_fn_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control('export_fn_observation', 'low', true, `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`),
      );
    } else {
      const land = measureExportFnLandscape(expProbe.value);
      const topE = Object.entries(land.byEngShareBucket || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 5)
        .map(([k, n]) => `${k}=${n}`)
        .join('/');
      controls.push(
        control(
          'export_fn_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · openBoards=${land.openBoards} · engSum=${land.engSum} · salesSum=${land.salesSum} · peopleOpsSum=${land.peopleOpsSum} · remoteSum=${land.remoteSum} · engShareOfOpen=${land.engShareOfOpen} · engDominant=${land.engDominant} · salesDominant=${land.salesDominant} · peopleDominant=${land.peopleDominant} · noEng=${land.noEng} · remoteHeavy=${land.remoteHeavy}` +
              (topE ? ` · byEngShareBucket ${topE}` : '') +
              ' · export openEng/Sales/PeopleOps/Remote tallies only (complements map_role_mix_observation; not demand, quality, or fit scores)',
          {
            boards: land.boards,
            openBoards: land.openBoards,
            engSum: land.engSum,
            salesSum: land.salesSum,
            peopleOpsSum: land.peopleOpsSum,
            remoteSum: land.remoteSum,
            engShareOfOpen: land.engShareOfOpen,
            engDominant: land.engDominant,
            salesDominant: land.salesDominant,
            peopleDominant: land.peopleDominant,
            noEng: land.noEng,
            remoteHeavy: land.remoteHeavy,
            byEngShareBucket: land.byEngShareBucket || {},
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_fn_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Deel/Rippling residual: export location diversity (low; never exit-fail; not EOR/visa score) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_location_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_location_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportLocationLandscape(expProbe.value);
      const topB = Object.entries(land.byDistinctBucket || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 5)
        .map(([k, n]) => `${k}=${n}`)
        .join('/');
      const topC = (land.byCompanyTop || [])
        .slice(0, 4)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_location_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · locationLabelSum=${land.locationLabelSum} · multiLocation=${land.multiLocation} · singleLocation=${land.singleLocation} · multiShare=${land.multiShare} · maxDistinct=${land.maxDistinct} · withRemote=${land.withRemote}` +
              (topB ? ` · byDistinctBucket ${topB}` : '') +
              (topC ? ` · byCompanyTop ${topC}` : '') +
              ' · export distinctObservedLocationCount only (complements ledger_metro/us_posted; not EOR/visa, remote-friendly, or company quality scores)',
          {
            boards: land.boards,
            locationLabelSum: land.locationLabelSum,
            multiLocation: land.multiLocation,
            singleLocation: land.singleLocation,
            multiShare: land.multiShare,
            maxDistinct: land.maxDistinct,
            withRemote: land.withRemote,
            byDistinctBucket: land.byDistinctBucket || {},
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_location_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Levels residual: export max attributed/observed age landscape (low; never exit-fail; not ghost-job) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_age_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control('export_age_observation', 'low', true, `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`),
      );
    } else {
      const land = measureExportAgeLandscape(expProbe.value);
      const topA = Object.entries(land.byMaxAttributedBucket || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 6)
        .map(([k, n]) => `${k}=${n}`)
        .join('/');
      const topO = Object.entries(land.byMaxObservedBucket || {})
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, 6)
        .map(([k, n]) => `${k}=${n}`)
        .join('/');
      const topC = (land.byCompanyAttributedGe90Top || [])
        .slice(0, 4)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_age_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · withMaxAttributed=${land.withMaxAttributed} · withoutMaxAttributed=${land.withoutMaxAttributed} · maxAttributedDays=${land.maxAttributedDays} · boardsAttributedGe90=${land.boardsAttributedGe90} · boardsAttributedGe365=${land.boardsAttributedGe365} · withMaxObserved=${land.withMaxObserved} · withoutMaxObserved=${land.withoutMaxObserved} · maxObservedDays=${land.maxObservedDays} · boardsObservedGe7=${land.boardsObservedGe7}` +
              (topA ? ` · byMaxAttributedBucket ${topA}` : '') +
              (topO ? ` · byMaxObservedBucket ${topO}` : '') +
              (topC ? ` · byCompanyAttributedGe90Top ${topC}` : '') +
              ' · export board max ages only (complements ledger_posted_age/observed_age; not ghost-job, fill rate, or company quality; ge7 observed needs calendar time)',
          {
            boards: land.boards,
            withMaxAttributed: land.withMaxAttributed,
            withoutMaxAttributed: land.withoutMaxAttributed,
            maxAttributedDays: land.maxAttributedDays,
            boardsAttributedGe90: land.boardsAttributedGe90,
            boardsAttributedGe365: land.boardsAttributedGe365,
            withMaxObserved: land.withMaxObserved,
            withoutMaxObserved: land.withoutMaxObserved,
            maxObservedDays: land.maxObservedDays,
            boardsObservedGe7: land.boardsObservedGe7,
            byMaxAttributedBucket: land.byMaxAttributedBucket || {},
            byMaxObservedBucket: land.byMaxObservedBucket || {},
            byCompanyAttributedGe90Top: Array.isArray(land.byCompanyAttributedGe90Top)
              ? land.byCompanyAttributedGe90Top.slice(0, 8)
              : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_age_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— TheirStack residual: export day-churn landscape (low; never exit-fail; not fill/velocity score) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_churn_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_churn_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportChurnLandscape(expProbe.value);
      const topP = (land.byProviderChurn || [])
        .slice(0, 4)
        .map((x) => `${String(x.provider).slice(0, 20)}=${x.n}`)
        .join('/');
      const topF = (land.byCompanyFirstTop || [])
        .slice(0, 4)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      const topC = (land.byCompanyClosedTop || [])
        .slice(0, 4)
        .map((x) => `${String(x.company).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_churn_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · withFirstObservedToday=${land.withFirstObservedToday} · firstObservedTodaySum=${land.firstObservedTodaySum} · withClosedToday=${land.withClosedToday} · closedTodaySum=${land.closedTodaySum} · withReopened=${land.withReopened} · reopenedSum=${land.reopenedSum} · withOlderPostedFirstSeen=${land.withOlderPostedFirstSeen} · olderPostedFirstSeenSum=${land.olderPostedFirstSeenSum} · activeChurn=${land.activeChurn} · activeChurnShare=${land.activeChurnShare} · netObservedToday=${land.netObservedToday}` +
              (topP ? ` · byProviderChurn ${topP}` : '') +
              (topF ? ` · byCompanyFirstTop ${topF}` : '') +
              (topC ? ` · byCompanyClosedTop ${topC}` : '') +
              ' · export day-churn board counts only (complements board_activity/ledger_reopen; not fill rates, hiring velocity, or company quality; exits≠filled)',
          {
            boards: land.boards,
            withFirstObservedToday: land.withFirstObservedToday,
            firstObservedTodaySum: land.firstObservedTodaySum,
            withClosedToday: land.withClosedToday,
            closedTodaySum: land.closedTodaySum,
            withReopened: land.withReopened,
            reopenedSum: land.reopenedSum,
            withOlderPostedFirstSeen: land.withOlderPostedFirstSeen,
            olderPostedFirstSeenSum: land.olderPostedFirstSeenSum,
            activeChurn: land.activeChurn,
            activeChurnShare: land.activeChurnShare,
            netObservedToday: land.netObservedToday,
            byProviderChurn: Array.isArray(land.byProviderChurn) ? land.byProviderChurn.slice(0, 8) : [],
            byCompanyFirstTop: Array.isArray(land.byCompanyFirstTop) ? land.byCompanyFirstTop.slice(0, 8) : [],
            byCompanyClosedTop: Array.isArray(land.byCompanyClosedTop) ? land.byCompanyClosedTop.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_churn_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Clearbit residual: export domain/TLD landscape (low; never exit-fail; not brand/geo score) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_domain_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_domain_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportDomainLandscape(expProbe.value);
      const topTld = (land.byTld || [])
        .slice(0, 6)
        .map((x) => `${String(x.tld).slice(0, 16)}=${x.n}`)
        .join('/');
      const multi = (land.multiHost || [])
        .slice(0, 4)
        .map((x) => `${String(x.host).slice(0, 28)}=${x.n}`)
        .join('/');
      const topP = (land.byProvider || [])
        .slice(0, 4)
        .map((x) => `${String(x.provider).slice(0, 20)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_domain_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · withDomain=${land.withDomain} · emptyDomain=${land.emptyDomain} · invalid=${land.invalid} · com=${land.com} · ai=${land.ai} · io=${land.io} · comShare=${land.comShare} · aiShare=${land.aiShare} · multiLabelHost=${land.multiLabelHost} · multiLabelShare=${land.multiLabelShare}` +
              (topTld ? ` · byTld ${topTld}` : '') +
              (multi ? ` · multiHost ${multi}` : '') +
              (topP ? ` · byProvider ${topP}` : '') +
              ' · export board domain/TLD only (complements map_website_observation; not brand quality, geo, or company ranks)',
          {
            boards: land.boards,
            withDomain: land.withDomain,
            emptyDomain: land.emptyDomain,
            invalid: land.invalid,
            com: land.com,
            ai: land.ai,
            io: land.io,
            comShare: land.comShare,
            aiShare: land.aiShare,
            multiLabelHost: land.multiLabelHost,
            multiLabelShare: land.multiLabelShare,
            byTld: Array.isArray(land.byTld) ? land.byTld.slice(0, 12) : [],
            byHostTop: Array.isArray(land.byHostTop) ? land.byHostTop.slice(0, 8) : [],
            multiHost: Array.isArray(land.multiHost) ? land.multiHost.slice(0, 6) : [],
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_domain_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Wikidata/YC residual: export sourceLicense landscape (low; never exit-fail; not copyright score) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_license_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_license_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportLicenseLandscape(expProbe.value);
      const topLic = (land.byLicense || [])
        .slice(0, 6)
        .map((x) => `${String(x.license).slice(0, 24)}=${x.n}`)
        .join('/');
      const topHost = (land.bySourceHost || [])
        .slice(0, 5)
        .map((x) => `${String(x.host).slice(0, 28)}=${x.n}`)
        .join('/');
      const topCross = (land.byProviderLicense || [])
        .slice(0, 5)
        .map((x) => `${String(x.key).slice(0, 36)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_license_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · withLicense=${land.withLicense} · withoutLicense=${land.withoutLicense} · ycPublic=${land.ycPublic} · cc0=${land.cc0} · hnPublic=${land.hnPublic} · ycPublicShare=${land.ycPublicShare} · withSourceUrl=${land.withSourceUrl}` +
              (topLic ? ` · byLicense ${topLic}` : '') +
              (topHost ? ` · bySourceHost ${topHost}` : '') +
              (topCross ? ` · byProviderLicense ${topCross}` : '') +
              ' · export board sourceLicense/sourceUrl only (complements map_license_observation; not copyright clearance, quality, or company ranks)',
          {
            boards: land.boards,
            withLicense: land.withLicense,
            withoutLicense: land.withoutLicense,
            ycPublic: land.ycPublic,
            cc0: land.cc0,
            hnPublic: land.hnPublic,
            ycPublicShare: land.ycPublicShare,
            withSourceUrl: land.withSourceUrl,
            byLicense: Array.isArray(land.byLicense) ? land.byLicense.slice(0, 10) : [],
            bySourceHost: Array.isArray(land.bySourceHost) ? land.bySourceHost.slice(0, 8) : [],
            byProviderLicense: Array.isArray(land.byProviderLicense)
              ? land.byProviderLicense.slice(0, 10)
              : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_license_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Merge/ATS residual: export providerRouting landscape (low; never exit-fail; not provider quality) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_provider_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_provider_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportProviderLandscape(expProbe.value);
      const topProv = (land.byProvider || [])
        .slice(0, 6)
        .map((x) => `${String(x.provider).slice(0, 20)}=${x.openRoles}`)
        .join('/');
      const observed = Array.isArray(land.observedProviders)
        ? land.observedProviders.slice(0, 8).map((p) => String(p).slice(0, 20)).join('/')
        : '';
      controls.push(
        control(
          'export_provider_observation',
          'low',
          true,
          land.providers === 0
            ? 'n/a — empty export'
            : `providers=${land.providers} · companiesSum=${land.companiesSum} · openRolesSum=${land.openRolesSum} · attributedPostedSum=${land.attributedPostedSum} · attributedShareOfOpen=${land.attributedShareOfOpen} · providersWithAttributed=${land.providersWithAttributed} · firstObservedTodaySum=${land.firstObservedTodaySum} · closedTodaySum=${land.closedTodaySum} · reopenedOpenSum=${land.reopenedOpenSum}` +
              (topProv ? ` · byProviderOpen ${topProv}` : '') +
              (observed ? ` · observed ${observed}` : '') +
              ' · export providerRouting.coverage only (complements map_ats_observation; not multi-ATS quality ranks, demand, or scrape product)',
          {
            providers: land.providers,
            companiesSum: land.companiesSum,
            openRolesSum: land.openRolesSum,
            firstObservedTodaySum: land.firstObservedTodaySum,
            closedTodaySum: land.closedTodaySum,
            reopenedOpenSum: land.reopenedOpenSum,
            attributedPostedSum: land.attributedPostedSum,
            staleAttributedSum: land.staleAttributedSum,
            evergreenAttributedSum: land.evergreenAttributedSum,
            providersWithAttributed: land.providersWithAttributed,
            providersWithoutAttributed: land.providersWithoutAttributed,
            attributedShareOfOpen: land.attributedShareOfOpen,
            observedProviders: Array.isArray(land.observedProviders)
              ? land.observedProviders.slice(0, 12)
              : [],
            strategy: land.strategy,
            byProvider: Array.isArray(land.byProvider) ? land.byProvider.slice(0, 10) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_provider_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— RecruitAI residual: export diagnostics+counts honesty (low; never exit-fail; not identity quality) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_diagnostics_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_diagnostics_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportDiagnosticsLandscape(expProbe.value);
      const topChg = (land.byProviderChanged || [])
        .slice(0, 6)
        .map((x) => `${String(x.provider).slice(0, 20)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_diagnostics_observation',
          'low',
          true,
          land.rows === 0 && land.collisions === 0 && land.changedCompanies === 0
            ? 'n/a — empty export'
            : `rows=${land.rows} · identityClean=${land.identityClean} · collisions=${land.collisions} · duplicateBoards=${land.duplicateBoards} · deniedBoards=${land.deniedBoards} · unmatchedAts=${land.unmatchedAtsCompanies} · boardCollisions=${land.boardCollisions} · duplicateMapBoards=${land.duplicateMapBoards} · changedCompanies=${land.changedCompanies} · changedFirstSum=${land.changedFirstSum} · changedClosedSum=${land.changedClosedSum} · changedReopenedSum=${land.changedReopenedSum} · noAgencyEvidenceRows=${land.noAgencyEvidenceRows} · noAgencyRoleSum=${land.noAgencyRoleSum} · rowsWithCR=${land.rowsWithCompanyResearch}` +
              (topChg ? ` · byProviderChanged ${topChg}` : '') +
              ' · export diagnostics lists + counts only (complements export_churn/provider; not identity quality scores, fill rates, or delivery readiness)',
          {
            rows: land.rows,
            rowsBeforeTop: land.rowsBeforeTop,
            identityClean: land.identityClean,
            collisions: land.collisions,
            duplicateBoards: land.duplicateBoards,
            deniedBoards: land.deniedBoards,
            unmatchedAtsCompanies: land.unmatchedAtsCompanies,
            boardCollisions: land.boardCollisions,
            duplicateMapBoards: land.duplicateMapBoards,
            ledgerOpenRoleKeys: land.ledgerOpenRoleKeys,
            changedCompanies: land.changedCompanies,
            changedFirstSum: land.changedFirstSum,
            changedClosedSum: land.changedClosedSum,
            changedReopenedSum: land.changedReopenedSum,
            changedOlderPostedSum: land.changedOlderPostedSum,
            noAgencyEvidenceRows: land.noAgencyEvidenceRows,
            noAgencyRoleSum: land.noAgencyRoleSum,
            rowsWithCompanyResearch: land.rowsWithCompanyResearch,
            rowsWithLiveReplayedResearch: land.rowsWithLiveReplayedResearch,
            rowsWithUnreplayedCatalogResearch: land.rowsWithUnreplayedCatalogResearch,
            byProviderChanged: Array.isArray(land.byProviderChanged)
              ? land.byProviderChanged.slice(0, 8)
              : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_diagnostics_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Clay residual: export companyResearch join landscape (low; never exit-fail; not firmographic quality) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_research_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_research_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportResearchLandscape(expProbe.value);
      const topStatus = (land.byStatus || [])
        .slice(0, 6)
        .map((x) => `${String(x.status).slice(0, 24)}=${x.n}`)
        .join('/');
      const topSource = (land.bySource || [])
        .slice(0, 5)
        .map((x) => `${String(x.source).slice(0, 24)}=${x.n}`)
        .join('/');
      const topField = (land.byAcceptedField || [])
        .slice(0, 5)
        .map((x) => `${String(x.field).slice(0, 28)}=${x.n}`)
        .join('/');
      const topCo = (land.byCompanyTop || [])
        .slice(0, 5)
        .map((x) => `${String(x.company).slice(0, 28)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_research_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · withResearch=${land.withResearch} · withoutResearch=${land.withoutResearch} · researchShare=${land.researchShare} · quarantineHiring=${land.quarantineHiring} · acceptedFieldSum=${land.acceptedFieldSum} · avgAcceptedFields=${land.avgAcceptedFields}` +
              (topStatus ? ` · byStatus ${topStatus}` : '') +
              (topSource ? ` · bySource ${topSource}` : '') +
              (topField ? ` · byAcceptedField ${topField}` : '') +
              (topCo ? ` · byCompanyTop ${topCo}` : '') +
              ' · export companyResearch join only (complements research_export_honest high gate; coverage honesty not firmographic quality, demand, fit, or ranks; CR scope benchmark-gated)',
          {
            boards: land.boards,
            withResearch: land.withResearch,
            withoutResearch: land.withoutResearch,
            researchShare: land.researchShare,
            quarantineHiring: land.quarantineHiring,
            acceptedFieldSum: land.acceptedFieldSum,
            avgAcceptedFields: land.avgAcceptedFields,
            byStatus: Array.isArray(land.byStatus) ? land.byStatus.slice(0, 10) : [],
            bySource: Array.isArray(land.bySource) ? land.bySource.slice(0, 8) : [],
            byAcceptedField: Array.isArray(land.byAcceptedField)
              ? land.byAcceptedField.slice(0, 10)
              : [],
            byCompanyTop: Array.isArray(land.byCompanyTop) ? land.byCompanyTop.slice(0, 8) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_research_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— RecruitAI residual: export sample* field presence (low; never exit-fail; not role quality) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_sample_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_sample_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportSampleLandscape(expProbe.value);
      const topPeople = (land.byProviderPeopleOps || [])
        .slice(0, 4)
        .map((x) => `${String(x.provider).slice(0, 20)}=${x.n}`)
        .join('/');
      const topAttr = (land.byProviderAttributed || [])
        .slice(0, 4)
        .map((x) => `${String(x.provider).slice(0, 20)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_sample_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · coreSampleComplete=${land.coreSampleComplete} · coreSampleShare=${land.coreSampleShare} · title=${land.withSampleRoleTitle} · url=${land.withSampleRoleUrl} · location=${land.withSampleLocation} · peopleOps=${land.withSamplePeopleOps} · attributed=${land.withSampleAttributed} · noAgencyQuote=${land.withNoAgencyQuote} · noAgencyUrl=${land.withNoAgencyUrl}` +
              (topPeople ? ` · byProviderPeopleOps ${topPeople}` : '') +
              (topAttr ? ` · byProviderAttributed ${topAttr}` : '') +
              ' · sample* field presence only (not role quality, desk scores, or ranks)',
          {
            boards: land.boards,
            withSampleRoleTitle: land.withSampleRoleTitle,
            withSampleRoleUrl: land.withSampleRoleUrl,
            withSampleLocation: land.withSampleLocation,
            coreSampleComplete: land.coreSampleComplete,
            coreSampleShare: land.coreSampleShare,
            withSamplePeopleOps: land.withSamplePeopleOps,
            withSampleAttributed: land.withSampleAttributed,
            withNoAgencyQuote: land.withNoAgencyQuote,
            withNoAgencyUrl: land.withNoAgencyUrl,
            peopleOpsSampleShare: land.peopleOpsSampleShare,
            attributedSampleShare: land.attributedSampleShare,
            byProviderPeopleOps: Array.isArray(land.byProviderPeopleOps)
              ? land.byProviderPeopleOps.slice(0, 8)
              : [],
            byProviderAttributed: Array.isArray(land.byProviderAttributed)
              ? land.byProviderAttributed.slice(0, 8)
              : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_sample_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Affinity residual: export relationships graph landscape (low; never exit-fail; not KG product) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_relationship_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_relationship_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportRelationshipLandscape(expProbe.value);
      const topNode = (land.byNodeType || [])
        .slice(0, 6)
        .map((x) => `${String(x.type).slice(0, 24)}=${x.n}`)
        .join('/');
      const topEdge = (land.byEdgeType || [])
        .slice(0, 6)
        .map((x) => `${String(x.type).slice(0, 24)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_relationship_observation',
          'low',
          true,
          !land.present
            ? 'n/a — relationships graph missing'
            : `present=true · nodes=${land.nodes} · edges=${land.edges} · companies=${land.companies} · boards=${land.boards} · providers=${land.providers} · claims=${land.claims} · researchSources=${land.researchSources} · openRolesAvailable=${land.openRolesAvailable} · openRolesInGraph=${land.openRolesInGraph} · openRolesOmitted=${land.openRolesOmitted} · omitShare=${land.omitShare}` +
              (land.scope ? ` · scope=${String(land.scope).slice(0, 40)}` : '') +
              (land.roleLimitPerBoard != null ? ` · roleLimitPerBoard=${land.roleLimitPerBoard}` : '') +
              (topNode ? ` · byNodeType ${topNode}` : '') +
              (topEdge ? ` · byEdgeType ${topEdge}` : '') +
              ' · export relationships graph counts only (complements export_req; not knowledge-graph product, match/fit, or demand)',
          {
            present: land.present,
            nodes: land.nodes,
            edges: land.edges,
            companies: land.companies,
            boards: land.boards,
            providers: land.providers,
            claims: land.claims,
            researchSources: land.researchSources,
            openRolesAvailable: land.openRolesAvailable,
            openRolesInGraph: land.openRolesInGraph,
            openRolesOmitted: land.openRolesOmitted,
            omitShare: land.omitShare,
            scope: land.scope,
            roleLimitPerBoard: land.roleLimitPerBoard,
            byNodeType: Array.isArray(land.byNodeType) ? land.byNodeType.slice(0, 10) : [],
            byEdgeType: Array.isArray(land.byEdgeType) ? land.byEdgeType.slice(0, 10) : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_relationship_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Merge/AR-28 residual: export jobsUrl host-class landscape (low; never exit-fail; not ATS quality) ——
  try {
    const expPath = path.join(busy, 'recruitai-export', 'latest.json');
    const expProbe = readJsonProbe(expPath);
    if (!expProbe.exists || !expProbe.value) {
      controls.push(control('export_jobs_url_observation', 'low', true, 'n/a — no recruitai export'));
    } else if (expProbe.error || !isPlainObject(expProbe.value)) {
      controls.push(
        control(
          'export_jobs_url_observation',
          'low',
          true,
          `n/a — export unreadable: ${expProbe.error || 'invalid_shape'}`,
        ),
      );
    } else {
      const land = measureExportJobsUrlLandscape(expProbe.value);
      const topClass = (land.byHostClass || [])
        .slice(0, 6)
        .map((x) => `${String(x.class).slice(0, 16)}=${x.n}`)
        .join('/');
      const topHost = (land.byHost || [])
        .slice(0, 5)
        .map((x) => `${String(x.host).slice(0, 28)}=${x.n}`)
        .join('/');
      const topCross = (land.byProviderClass || [])
        .slice(0, 6)
        .map((x) => `${String(x.key).slice(0, 32)}=${x.n}`)
        .join('/');
      controls.push(
        control(
          'export_jobs_url_observation',
          'low',
          true,
          land.boards === 0
            ? 'n/a — empty export'
            : `boards=${land.boards} · withJobsUrl=${land.withJobsUrl} · noJobsUrl=${land.noJobsUrl} · invalid=${land.invalid} · primary=${land.primary} · secondary=${land.secondary} · yc=${land.yc} · other=${land.other} · primaryShare=${land.primaryShare} · providerHostMatch=${land.providerHostMatch} · providerHostMismatch=${land.providerHostMismatch}` +
              (topClass ? ` · byHostClass ${topClass}` : '') +
              (topHost ? ` · byHost ${topHost}` : '') +
              (topCross ? ` · byProviderClass ${topCross}` : '') +
              ' · export jobsUrl host class only (complements map_ats_observation + export_provider; not multi-ATS scrape product, board quality, or demand)',
          {
            boards: land.boards,
            withJobsUrl: land.withJobsUrl,
            noJobsUrl: land.noJobsUrl,
            invalid: land.invalid,
            primary: land.primary,
            secondary: land.secondary,
            yc: land.yc,
            other: land.other,
            primaryShare: land.primaryShare,
            providerHostMatch: land.providerHostMatch,
            providerHostMismatch: land.providerHostMismatch,
            byHostClass: Array.isArray(land.byHostClass) ? land.byHostClass.slice(0, 8) : [],
            byHost: Array.isArray(land.byHost) ? land.byHost.slice(0, 10) : [],
            byProviderClass: Array.isArray(land.byProviderClass)
              ? land.byProviderClass.slice(0, 10)
              : [],
            basis: land.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('export_jobs_url_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— AR-08: ledger fn vs live categorizeRole drift (informative; fix via enrichment reclassify) ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('ledger_fn_drift', 'low', true, 'n/a — no role ledger'));
    } else {
      const d = measureLedgerFnDrift(ledProbe.value);
      const top = Object.entries(d.byFromTo || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, n]) => `${k}:${n}`);
      controls.push(
        control(
          'ledger_fn_drift',
          'low',
          true,
          d.drift === 0
            ? `fn aligned · open=${d.open} · otherShare=${d.otherShare}`
            : `fn drift=${d.drift}/${d.open} · otherShare=${d.otherShare}${top.length ? ` · top ${top.join(' ')}` : ''} — reclassify offline (no poll thrash)`,
          {
            open: d.open,
            drift: d.drift,
            otherOpen: d.otherOpen,
            otherShare: d.otherShare,
            topFromTo: top,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('ledger_fn_drift', 'low', true, `n/a ${e.message || e}`));
  }

  // —— AR-08 map roleMix vs ledger fn (informative; refresh via directory-aging --enrich-map) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!mapProbe.exists || !mapProbe.value || !ledProbe.exists || !ledProbe.value) {
      controls.push(control('map_role_mix_fresh', 'low', true, 'n/a — map or ledger missing'));
    } else {
      const f = measureMapRoleMixFreshness(mapProbe.value, ledProbe.value);
      controls.push(
        control(
          'map_role_mix_fresh',
          'low',
          true,
          f.stale
            ? `roleMix L1=${f.l1} mapTotal=${f.mapTotal} liveUs=${f.liveOpen} mapOtherShare=${f.mapOtherShare} liveOtherShare=${f.liveOtherShare} — run directory-aging --enrich-map (offline)`
            : `roleMix aligned · mapTotal=${f.mapTotal} · liveUs=${f.liveOpen} · otherShare=${f.liveOtherShare}`,
          {
            l1: f.l1,
            stale: f.stale,
            mapTotal: f.mapTotal,
            liveOpen: f.liveOpen,
            mapOtherShare: f.mapOtherShare,
            liveOtherShare: f.liveOtherShare,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_role_mix_fresh', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Map hiring-label vs ledger-open honesty (low; observation only — hiring flag is YC/self-report, not ATS) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_hiring_label_honesty', 'low', true, 'n/a — no map'));
    } else {
      const h = measureMapHiringHonestyLandscape(mapProbe.value);
      controls.push(
        control(
          'map_hiring_label_honesty',
          'low',
          true,
          `hiringYes=${h.hiringYes} withLedger=${h.hiringYesWithLedger} noLedger=${h.hiringYesNoLedger} lagShare=${h.labeledWithoutLedgerShare} · inverse ledgerNotYes=${h.ledgerOpenNotHiringYes} · flag is self-report; ledgerOpenRoles from poll (not demand score)`,
          {
            hiringYes: h.hiringYes,
            hiringYesWithLedger: h.hiringYesWithLedger,
            hiringYesNoLedger: h.hiringYesNoLedger,
            labeledWithoutLedgerShare: h.labeledWithoutLedgerShare,
            ledgerOpenNotHiringYes: h.ledgerOpenNotHiringYes,
            withJobsUrl: h.withJobsUrl,
            basis: h.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_hiring_label_honesty', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Map openRoles vs ledgerOpenRoles (low; dual-source lag — not thrash reclassify) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_openroles_honesty', 'low', true, 'n/a — no map'));
    } else {
      const o = measureMapOpenRolesLandscape(mapProbe.value);
      const atsBit =
        Array.isArray(o.byAtsMismatch) && o.byAtsMismatch.length
          ? ` · mismatchByAts ${o.byAtsMismatch
              .slice(0, 4)
              .map((x) => `${x.ats}=${x.n}`)
              .join('/')}`
          : '';
      controls.push(
        control(
          'map_openroles_honesty',
          'low',
          true,
          `withOpen=${o.withOpenRoles} match=${o.countMatch} mismatch=${o.countMismatch} matchShare=${o.matchShare} openGtLedger=${o.openGtLedger ?? 0} openLtLedger=${o.openLtLedger ?? 0} openNoLedger=${o.openNoLedger}${atsBit} · jobs-enrich openRoles vs ledger stamp (observation lag direction, not demand score)`,
          {
            withOpenRoles: o.withOpenRoles,
            openRolesSum: o.openRolesSum,
            countMatch: o.countMatch,
            countMismatch: o.countMismatch,
            matchShare: o.matchShare,
            openGtLedger: o.openGtLedger ?? 0,
            openLtLedger: o.openLtLedger ?? 0,
            openNoLedger: o.openNoLedger,
            ledgerNoOpen: o.ledgerNoOpen,
            absDeltaSum: o.absDeltaSum,
            byAtsMismatch: Array.isArray(o.byAtsMismatch) ? o.byAtsMismatch.slice(0, 6) : [],
            mismatchTop: Array.isArray(o.mismatchTop) ? o.mismatchTop.slice(0, 5) : [],
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_openroles_honesty', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Firecrawl/jobs-enrich residual: map openRolesAt stamp age (low; never exit-fail) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_jobs_stamp_observation', 'low', true, 'n/a — no map'));
    } else {
      const j = measureMapJobsStampLandscape(mapProbe.value);
      const srcBit =
        Array.isArray(j.byJobsSource) && j.byJobsSource.length
          ? ` · byJobsSource ${j.byJobsSource
              .slice(0, 3)
              .map((x) => `${x.jobsSource}=${x.n}`)
              .join('/')}`
          : '';
      const atsBit =
        Array.isArray(j.byAtsSource) && j.byAtsSource.length
          ? ` · byAts ${j.byAtsSource
              .slice(0, 4)
              .map((x) => `${x.ats}=${x.n}`)
              .join('/')}`
          : '';
      controls.push(
        control(
          'map_jobs_stamp_observation',
          'low',
          true,
          j.companies === 0
            ? 'n/a — empty map'
            : `withStamp=${j.withOpenRolesAt} · medianHours=${j.medianHours ?? 'n/a'} · ge24h=${j.ge24h} · jobsUrlNoStamp=${j.jobsUrlNoStamp} · openRolesNoStamp=${j.openRolesNoStamp}${srcBit}${atsBit} · openRolesAt age only (not directory retrievedAt / role post age; do not thrash enrich)`,
          {
            companies: j.companies,
            withOpenRolesAt: j.withOpenRolesAt,
            withoutOpenRolesAt: j.withoutOpenRolesAt,
            medianHours: j.medianHours,
            maxHours: j.maxHours,
            ge24h: j.ge24h,
            ge72h: j.ge72h,
            withJobsUrl: j.withJobsUrl,
            withOpenRoles: j.withOpenRoles,
            jobsUrlNoStamp: j.jobsUrlNoStamp,
            openRolesNoStamp: j.openRolesNoStamp,
            byJobsSource: Array.isArray(j.byJobsSource) ? j.byJobsSource.slice(0, 5) : [],
            byAtsSource: Array.isArray(j.byAtsSource) ? j.byAtsSource.slice(0, 5) : [],
            basis: j.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_jobs_stamp_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Firecrawl residual: map company retrievedAt directory stamp age (low; never exit-fail) ——
  try {
    const mapProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-SF-STARTUP-MAP.json'));
    if (!mapProbe.exists || !mapProbe.value) {
      controls.push(control('map_retrieved_observation', 'low', true, 'n/a — no map'));
    } else {
      const r = measureMapRetrievedLandscape(mapProbe.value);
      const srcBit =
        Array.isArray(r.bySource) && r.bySource.length
          ? ` · bySource ${r.bySource
              .slice(0, 3)
              .map((x) => `${String(x.source).slice(0, 18)}=${x.n}/med${x.medianHours ?? '?'}`)
              .join('/')}`
          : '';
      controls.push(
        control(
          'map_retrieved_observation',
          'low',
          true,
          r.companies === 0
            ? 'n/a — empty map'
            : `withRetrievedAt=${r.withRetrievedAt} · medianHours=${r.medianHours ?? 'n/a'} · ge24h=${r.ge24h} · jobsGe24h=${r.jobsGe24h} · maxHours=${r.maxHours ?? 'n/a'}${srcBit} · directory retrievedAt only (not openRolesAt / role post age; do not thrash enrich)`,
          {
            companies: r.companies,
            withRetrievedAt: r.withRetrievedAt,
            withoutRetrievedAt: r.withoutRetrievedAt,
            medianHours: r.medianHours,
            minHours: r.minHours,
            maxHours: r.maxHours,
            ge24h: r.ge24h,
            ge72h: r.ge72h,
            jobsGe24h: r.jobsGe24h,
            withJobsUrl: r.withJobsUrl,
            byAgeBucket: Array.isArray(r.byAgeBucket) ? r.byAgeBucket.slice(0, 6) : [],
            bySource: Array.isArray(r.bySource) ? r.bySource.slice(0, 5) : [],
            basis: r.basis,
          },
        ),
      );
    }
  } catch (e) {
    controls.push(control('map_retrieved_observation', 'low', true, `n/a ${e.message || e}`));
  }

  // —— Board activity observation (roles-feed SoR): new open + board-exit; never filled/intent ——
  try {
    const ledProbe = readJsonProbe(path.join(opts.root || root, 'DEMIGOD-ROLE-LEDGER.json'));
    if (!ledProbe.exists || !ledProbe.value) {
      controls.push(control('board_activity_observation', 'low', true, 'n/a — no role ledger'));
    } else {
      const act = boardActivityInsightFromLedger(ledProbe.value, {
        today: new Date().toISOString().slice(0, 10),
        days: 7,
      });
      if (!act) {
        controls.push(
          control('board_activity_observation', 'low', true, 'no in-window open or board-exit observations', {
            windowDays: 7,
          }),
        );
      } else {
        const flags = [
          act.windowExceedsObservationHistory ? `openHist=${act.observationSpanDays}d` : null,
          act.windowExceedsClosureHistory ? `closeHist=${act.closureObservationSpanDays}d` : null,
        ].filter(Boolean);
        // In-window landscapes (roles-feed/pulse byProvider + byFn) — observation counts, not ranks.
        const byProvider = Array.isArray(act.byProvider) ? act.byProvider.slice(0, 5) : [];
        const byFn = Array.isArray(act.byFn) ? act.byFn.slice(0, 5) : [];
        const byCompanyTop = Array.isArray(act.byCompanyTop) ? act.byCompanyTop.slice(0, 5) : [];
        const byCompanyClosedTop = Array.isArray(act.byCompanyClosedTop)
          ? act.byCompanyClosedTop.slice(0, 5)
          : [];
        const provBit = byProvider.length
          ? ` · byProvider ${byProvider.map((p) => `${p.provider}=${p.n}`).join('/')}`
          : '';
        const fnBit = byFn.length
          ? ` · byFn ${byFn.map((p) => `${p.fn}=${p.n}`).join('/')}`
          : '';
        const coBit = byCompanyTop.length
          ? ` · byCompanyTop ${byCompanyTop.map((p) => `${p.company}=${p.openInWindow}`).join('/')}`
          : '';
        const coExitBit = byCompanyClosedTop.length
          ? ` · byCompanyClosedTop ${byCompanyClosedTop.map((p) => `${p.company}=${p.closedInWindow}`).join('/')}`
          : '';
        controls.push(
          control(
            'board_activity_observation',
            'low',
            true,
            `7d newOpen=${act.newOpenInWindow} · boardExit=${act.closedInWindow} · cosOpen=${act.companiesWithNewOpen} · cosExit=${act.companiesClosedInWindow}` +
              provBit +
              fnBit +
              coBit +
              coExitBit +
              (flags.length ? ` · caveat ${flags.join(' ')} (not mature rate; exits≠filled)` : ' · exits≠filled'),
            {
              windowDays: act.windowDays,
              newOpenInWindow: act.newOpenInWindow,
              closedInWindow: act.closedInWindow,
              companiesWithNewOpen: act.companiesWithNewOpen,
              companiesClosedInWindow: act.companiesClosedInWindow,
              byProvider,
              byFn,
              byCompanyTop,
              byCompanyClosedTop,
              windowExceedsObservationHistory: act.windowExceedsObservationHistory,
              windowExceedsClosureHistory: act.windowExceedsClosureHistory,
              observationSpanDays: act.observationSpanDays,
              closureObservationSpanDays: act.closureObservationSpanDays,
            },
          ),
        );
      }
    }
  } catch (e) {
    controls.push(control('board_activity_observation', 'low', true, `n/a ${e.message || e}`));
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
    'directory_observed_ages',
    'ats_secondary_coverage',
    'ledger_fn_drift',
    'map_role_mix_fresh',
    'map_hiring_label_honesty',
    'map_openroles_honesty',
    'map_jobs_stamp_observation',
    'map_retrieved_observation',
    'board_activity_observation',
    'posting_age_claim_qualified',
    'native_date_field_mix',
    'ledger_lastseen_observation',
    'ledger_reopen_observation',
    'ledger_general_application_observation',
    'ledger_workplace_observation',
    'ledger_closed_age_observation',
    'ledger_employment_type_observation',
    'ledger_seniority_observation',
    'ledger_agency_policy_observation',
    'ledger_us_posted_observation',
    'ledger_posted_date_recycle_observation',
    'ledger_metro_observation',
    'ledger_founding_observation',
    'ledger_language_observation',
    'ledger_native_update_observation',
    'ledger_company_open_observation',
    'ledger_url_host_observation',
    'ledger_observed_age_observation',
    'ledger_posted_age_observation',
    'map_ats_observation',
    'map_source_observation',
    'map_tags_observation',
    'map_website_observation',
    'map_inception_observation',
    'map_profile_observation',
    'map_aging_observation',
    'map_license_observation',
    'map_role_mix_observation',
    'export_req_observation',
    'export_seniority_observation',
    'export_fn_observation',
    'export_location_observation',
    'export_age_observation',
    'export_churn_observation',
    'export_domain_observation',
    'export_license_observation',
    'export_provider_observation',
    'export_diagnostics_observation',
    'export_research_observation',
    'export_sample_observation',
    'export_relationship_observation',
    'export_jobs_url_observation',
    'directory_identity_candidates',
    'startups_fragment_fresh',
  ]) {
    assert(ids.has(need), `missing ${need}`);
  }
  assert(board.controls.find((x) => x.id === 'startups_fragment_fresh')?.severity === 'low', 'startups fragment low');
  assert(
    !board.exitFailures.includes('startups_fragment_fresh'),
    'startups fragment never exit-fail (publish-gated)',
  );
  assert(board.controls.find((x) => x.id === 'map_hiring_label_honesty')?.severity === 'low', 'map hiring honesty low');
  assert(board.controls.find((x) => x.id === 'map_hiring_label_honesty')?.ok === true, 'map hiring honesty never exit-fail');
  assert(board.controls.find((x) => x.id === 'map_openroles_honesty')?.severity === 'low', 'map openRoles honesty low');
  assert(board.controls.find((x) => x.id === 'map_openroles_honesty')?.ok === true, 'map openRoles honesty never exit-fail');
  {
    const mo = board.controls.find((x) => x.id === 'map_openroles_honesty');
    // Live map: reason/detail surface directional lag (openGt/LtLedger). n/a only when no map.
    if (mo?.reason && !mo.reason.startsWith('n/a')) {
      assert(/openGtLedger=\d+/.test(mo.reason) && /openLtLedger=\d+/.test(mo.reason), 'map openRoles direction in reason');
      assert(typeof mo.evidence?.openGtLedger === 'number', 'map openRoles openGtLedger evidence');
      assert(typeof mo.evidence?.openLtLedger === 'number', 'map openRoles openLtLedger evidence');
      assert(Array.isArray(mo.evidence?.byAtsMismatch), 'map openRoles byAtsMismatch evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_jobs_stamp_observation')?.severity === 'low', 'jobs stamp low');
  assert(board.controls.find((x) => x.id === 'map_jobs_stamp_observation')?.ok === true, 'jobs stamp never exit-fail');
  {
    const js = board.controls.find((x) => x.id === 'map_jobs_stamp_observation');
    if (js?.reason && !js.reason.startsWith('n/a')) {
      assert(/withStamp=\d+/.test(js.reason) && /ge24h=\d+/.test(js.reason), 'jobs stamp withStamp/ge24h in reason');
      assert(typeof js.evidence?.withOpenRolesAt === 'number', 'jobs stamp withOpenRolesAt evidence');
      assert(typeof js.evidence?.jobsUrlNoStamp === 'number', 'jobs stamp jobsUrlNoStamp evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_retrieved_observation')?.severity === 'low', 'map retrieved low');
  assert(board.controls.find((x) => x.id === 'map_retrieved_observation')?.ok === true, 'map retrieved never exit-fail');
  {
    const mr = board.controls.find((x) => x.id === 'map_retrieved_observation');
    if (mr?.reason && !mr.reason.startsWith('n/a')) {
      assert(/withRetrievedAt=\d+/.test(mr.reason) && /ge24h=\d+/.test(mr.reason), 'map retrieved with/ge24h in reason');
      assert(typeof mr.evidence?.withRetrievedAt === 'number', 'map retrieved withRetrievedAt evidence');
      assert(typeof mr.evidence?.jobsGe24h === 'number', 'map retrieved jobsGe24h evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ats_secondary_coverage')?.severity === 'low', 'ATS secondary low');
  assert(board.controls.find((x) => x.id === 'ats_secondary_coverage')?.ok === true, 'ATS secondary never exit-fail');
  {
    const ats = board.controls.find((x) => x.id === 'ats_secondary_coverage');
    assert(ats?.evidence && typeof ats.evidence.primaryOpenBoards === 'number', 'ATS secondary primaryOpen evidence');
    assert(
      Array.isArray(ats.evidence.byHostClass) || ats.reason.startsWith('n/a'),
      'ATS secondary byHostClass evidence when map present',
    );
  }
  assert(board.controls.find((x) => x.id === 'map_ats_observation')?.severity === 'low', 'map ATS low');
  assert(board.controls.find((x) => x.id === 'map_ats_observation')?.ok === true, 'map ATS never exit-fail');
  {
    const ma = board.controls.find((x) => x.id === 'map_ats_observation');
    if (ma?.reason && !ma.reason.startsWith('n/a')) {
      assert(/withJobsUrl=\d+/.test(ma.reason) && /jobsUrlNoOpenRoles=\d+/.test(ma.reason), 'map ATS withJobsUrl/jobsUrlNoOpen in reason');
      assert(typeof ma.evidence?.withJobsUrl === 'number', 'map ATS withJobsUrl evidence');
      assert(typeof ma.evidence?.jobsUrlNoOpenRoles === 'number', 'map ATS jobsUrlNoOpenRoles evidence');
      assert(Array.isArray(ma.evidence?.byAtsSource), 'map ATS byAtsSource evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_source_observation')?.severity === 'low', 'map source low');
  assert(board.controls.find((x) => x.id === 'map_source_observation')?.ok === true, 'map source never exit-fail');
  {
    const ms = board.controls.find((x) => x.id === 'map_source_observation');
    if (ms?.reason && !ms.reason.startsWith('n/a')) {
      assert(/ycTagged=\d+/.test(ms.reason) && /ycShare=/.test(ms.reason), 'map source ycTagged/ycShare in reason');
      assert(typeof ms.evidence?.ycTagged === 'number', 'map source ycTagged evidence');
      assert(typeof ms.evidence?.withInception === 'number', 'map source withInception evidence');
      assert(Array.isArray(ms.evidence?.bySource), 'map source bySource evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_tags_observation')?.severity === 'low', 'map tags low');
  assert(board.controls.find((x) => x.id === 'map_tags_observation')?.ok === true, 'map tags never exit-fail');
  {
    const mt = board.controls.find((x) => x.id === 'map_tags_observation');
    if (mt?.reason && !mt.reason.startsWith('n/a')) {
      assert(/withTags=\d+/.test(mt.reason) && /multiShare=/.test(mt.reason), 'map tags withTags/multiShare in reason');
      assert(typeof mt.evidence?.withTags === 'number', 'map tags withTags evidence');
      assert(typeof mt.evidence?.multiTag === 'number', 'map tags multiTag evidence');
      assert(Array.isArray(mt.evidence?.byTagTop), 'map tags byTagTop evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_website_observation')?.severity === 'low', 'map website low');
  assert(board.controls.find((x) => x.id === 'map_website_observation')?.ok === true, 'map website never exit-fail');
  {
    const mw = board.controls.find((x) => x.id === 'map_website_observation');
    if (mw?.reason && !mw.reason.startsWith('n/a')) {
      assert(/withHost=\d+/.test(mw.reason) && /comShare=/.test(mw.reason), 'map website withHost/comShare in reason');
      assert(typeof mw.evidence?.withHost === 'number', 'map website withHost evidence');
      assert(typeof mw.evidence?.com === 'number', 'map website com evidence');
      assert(Array.isArray(mw.evidence?.byTld), 'map website byTld evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_inception_observation')?.severity === 'low', 'map inception low');
  assert(board.controls.find((x) => x.id === 'map_inception_observation')?.ok === true, 'map inception never exit-fail');
  {
    const mi = board.controls.find((x) => x.id === 'map_inception_observation');
    if (mi?.reason && !mi.reason.startsWith('n/a')) {
      assert(/withInception=\d+/.test(mi.reason) && /young0to2=\d+/.test(mi.reason), 'map inception with/young0to2 in reason');
      assert(typeof mi.evidence?.withInception === 'number', 'map inception withInception evidence');
      assert(typeof mi.evidence?.medianAgeYears === 'number' || mi.evidence?.medianAgeYears === null, 'map inception medianAge evidence');
      assert(Array.isArray(mi.evidence?.byAgeCohort), 'map inception byAgeCohort evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_profile_observation')?.severity === 'low', 'map profile low');
  assert(board.controls.find((x) => x.id === 'map_profile_observation')?.ok === true, 'map profile never exit-fail');
  {
    const mp = board.controls.find((x) => x.id === 'map_profile_observation');
    if (mp?.reason && !mp.reason.startsWith('n/a')) {
      assert(/coreComplete=\d+/.test(mp.reason) && /coreCompleteShare=/.test(mp.reason), 'map profile coreComplete in reason');
      assert(typeof mp.evidence?.coreComplete === 'number', 'map profile coreComplete evidence');
      assert(typeof mp.evidence?.withDescription === 'number', 'map profile withDescription evidence');
      assert(Array.isArray(mp.evidence?.byDescBucket), 'map profile byDescBucket evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_aging_observation')?.severity === 'low', 'map aging low');
  assert(board.controls.find((x) => x.id === 'map_aging_observation')?.ok === true, 'map aging never exit-fail');
  {
    const ma = board.controls.find((x) => x.id === 'map_aging_observation');
    if (ma?.reason && !ma.reason.startsWith('n/a')) {
      assert(/withLedgerOpen=\d+/.test(ma.reason) && /ge7=\d+/.test(ma.reason), 'map aging withLedgerOpen/ge7 in reason');
      assert(typeof ma.evidence?.withLedgerOpen === 'number', 'map aging withLedgerOpen evidence');
      assert(typeof ma.evidence?.ge7 === 'number', 'map aging ge7 evidence');
      assert(typeof ma.evidence?.byOldestBucket === 'object' && ma.evidence?.byOldestBucket, 'map aging byOldestBucket evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_license_observation')?.severity === 'low', 'map license low');
  assert(board.controls.find((x) => x.id === 'map_license_observation')?.ok === true, 'map license never exit-fail');
  {
    const ml = board.controls.find((x) => x.id === 'map_license_observation');
    if (ml?.reason && !ml.reason.startsWith('n/a')) {
      assert(/withLicense=\d+/.test(ml.reason) && /ycPublicShare=/.test(ml.reason), 'map license withLicense/ycPublicShare in reason');
      assert(typeof ml.evidence?.withLicense === 'number', 'map license withLicense evidence');
      assert(typeof ml.evidence?.ycPublic === 'number', 'map license ycPublic evidence');
      assert(Array.isArray(ml.evidence?.byLicense), 'map license byLicense evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'map_role_mix_observation')?.severity === 'low', 'map roleMix obs low');
  assert(board.controls.find((x) => x.id === 'map_role_mix_observation')?.ok === true, 'map roleMix obs never exit-fail');
  {
    const rm = board.controls.find((x) => x.id === 'map_role_mix_observation');
    if (rm?.reason && !rm.reason.startsWith('n/a')) {
      assert(/withRoleMix=\d+/.test(rm.reason) && /engShareOfRoles=/.test(rm.reason), 'map roleMix with/engShare in reason');
      assert(typeof rm.evidence?.withRoleMix === 'number', 'map roleMix withRoleMix evidence');
      assert(typeof rm.evidence?.roleSum === 'number', 'map roleMix roleSum evidence');
      assert(Array.isArray(rm.evidence?.byFn), 'map roleMix byFn evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_req_observation')?.severity === 'low', 'export req low');
  assert(board.controls.find((x) => x.id === 'export_req_observation')?.ok === true, 'export req never exit-fail');
  {
    const er = board.controls.find((x) => x.id === 'export_req_observation');
    if (er?.reason && !er.reason.startsWith('n/a')) {
      assert(/boards=\d+/.test(er.reason) && /openReqSum=\d+/.test(er.reason), 'export req boards/openReqSum in reason');
      assert(typeof er.evidence?.boards === 'number', 'export req boards evidence');
      assert(typeof er.evidence?.openReqSum === 'number', 'export req openReqSum evidence');
      assert(typeof er.evidence?.byOpenReqBucket === 'object' && er.evidence?.byOpenReqBucket, 'export req bucket evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_seniority_observation')?.severity === 'low', 'export seniority low');
  assert(board.controls.find((x) => x.id === 'export_seniority_observation')?.ok === true, 'export seniority never exit-fail');
  {
    const es = board.controls.find((x) => x.id === 'export_seniority_observation');
    if (es?.reason && !es.reason.startsWith('n/a')) {
      assert(/withMix=\d+/.test(es.reason) && /specifiedShare=/.test(es.reason), 'export seniority withMix/specifiedShare in reason');
      assert(typeof es.evidence?.withMix === 'number', 'export seniority withMix evidence');
      assert(typeof es.evidence?.specifiedShare === 'number', 'export seniority specifiedShare evidence');
      assert(Array.isArray(es.evidence?.byLevel), 'export seniority byLevel evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_fn_observation')?.severity === 'low', 'export fn low');
  assert(board.controls.find((x) => x.id === 'export_fn_observation')?.ok === true, 'export fn never exit-fail');
  {
    const ef = board.controls.find((x) => x.id === 'export_fn_observation');
    if (ef?.reason && !ef.reason.startsWith('n/a')) {
      assert(/engSum=\d+/.test(ef.reason) && /engShareOfOpen=/.test(ef.reason), 'export fn engSum/engShare in reason');
      assert(typeof ef.evidence?.engSum === 'number', 'export fn engSum evidence');
      assert(typeof ef.evidence?.engShareOfOpen === 'number', 'export fn engShareOfOpen evidence');
      assert(typeof ef.evidence?.byEngShareBucket === 'object' && ef.evidence?.byEngShareBucket, 'export fn bucket evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_location_observation')?.severity === 'low', 'export location low');
  assert(board.controls.find((x) => x.id === 'export_location_observation')?.ok === true, 'export location never exit-fail');
  {
    const el = board.controls.find((x) => x.id === 'export_location_observation');
    if (el?.reason && !el.reason.startsWith('n/a')) {
      assert(/multiLocation=\d+/.test(el.reason) && /multiShare=/.test(el.reason), 'export location multi/share in reason');
      assert(typeof el.evidence?.multiLocation === 'number', 'export location multiLocation evidence');
      assert(typeof el.evidence?.withRemote === 'number', 'export location withRemote evidence');
      assert(typeof el.evidence?.byDistinctBucket === 'object' && el.evidence?.byDistinctBucket, 'export location bucket evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_age_observation')?.severity === 'low', 'export age low');
  assert(board.controls.find((x) => x.id === 'export_age_observation')?.ok === true, 'export age never exit-fail');
  {
    const ea = board.controls.find((x) => x.id === 'export_age_observation');
    if (ea?.reason && !ea.reason.startsWith('n/a')) {
      assert(/withMaxAttributed=\d+/.test(ea.reason) && /boardsAttributedGe90=\d+/.test(ea.reason), 'export age attributed/ge90 in reason');
      assert(typeof ea.evidence?.withMaxAttributed === 'number', 'export age withMaxAttributed evidence');
      assert(typeof ea.evidence?.boardsObservedGe7 === 'number', 'export age boardsObservedGe7 evidence');
      assert(typeof ea.evidence?.byMaxAttributedBucket === 'object' && ea.evidence?.byMaxAttributedBucket, 'export age bucket evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_churn_observation')?.severity === 'low', 'export churn low');
  assert(board.controls.find((x) => x.id === 'export_churn_observation')?.ok === true, 'export churn never exit-fail');
  {
    const ec = board.controls.find((x) => x.id === 'export_churn_observation');
    if (ec?.reason && !ec.reason.startsWith('n/a')) {
      assert(
        /activeChurn=\d+/.test(ec.reason) && /firstObservedTodaySum=\d+/.test(ec.reason) && /closedTodaySum=\d+/.test(ec.reason),
        'export churn active/first/closed in reason',
      );
      assert(typeof ec.evidence?.activeChurn === 'number', 'export churn activeChurn evidence');
      assert(typeof ec.evidence?.netObservedToday === 'number', 'export churn netObservedToday evidence');
      assert(Array.isArray(ec.evidence?.byProviderChurn), 'export churn byProviderChurn evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_domain_observation')?.severity === 'low', 'export domain low');
  assert(board.controls.find((x) => x.id === 'export_domain_observation')?.ok === true, 'export domain never exit-fail');
  {
    const ed = board.controls.find((x) => x.id === 'export_domain_observation');
    if (ed?.reason && !ed.reason.startsWith('n/a')) {
      assert(
        /withDomain=\d+/.test(ed.reason) && /comShare=/.test(ed.reason) && /multiLabelHost=\d+/.test(ed.reason),
        'export domain withDomain/comShare/multiLabel in reason',
      );
      assert(typeof ed.evidence?.withDomain === 'number', 'export domain withDomain evidence');
      assert(typeof ed.evidence?.comShare === 'number', 'export domain comShare evidence');
      assert(Array.isArray(ed.evidence?.byTld), 'export domain byTld evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_license_observation')?.severity === 'low', 'export license low');
  assert(board.controls.find((x) => x.id === 'export_license_observation')?.ok === true, 'export license never exit-fail');
  {
    const el = board.controls.find((x) => x.id === 'export_license_observation');
    if (el?.reason && !el.reason.startsWith('n/a')) {
      assert(
        /withLicense=\d+/.test(el.reason) && /ycPublic=\d+/.test(el.reason) && /ycPublicShare=/.test(el.reason),
        'export license withLicense/ycPublic/share in reason',
      );
      assert(typeof el.evidence?.withLicense === 'number', 'export license withLicense evidence');
      assert(typeof el.evidence?.ycPublicShare === 'number', 'export license ycPublicShare evidence');
      assert(Array.isArray(el.evidence?.byLicense), 'export license byLicense evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_provider_observation')?.severity === 'low', 'export provider low');
  assert(board.controls.find((x) => x.id === 'export_provider_observation')?.ok === true, 'export provider never exit-fail');
  {
    const ep = board.controls.find((x) => x.id === 'export_provider_observation');
    if (ep?.reason && !ep.reason.startsWith('n/a')) {
      assert(
        /providers=\d+/.test(ep.reason) &&
          /openRolesSum=\d+/.test(ep.reason) &&
          /attributedShareOfOpen=/.test(ep.reason),
        'export provider providers/openRoles/attributed in reason',
      );
      assert(typeof ep.evidence?.providers === 'number', 'export provider providers evidence');
      assert(typeof ep.evidence?.openRolesSum === 'number', 'export provider openRolesSum evidence');
      assert(Array.isArray(ep.evidence?.byProvider), 'export provider byProvider evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_diagnostics_observation')?.severity === 'low', 'export diagnostics low');
  assert(board.controls.find((x) => x.id === 'export_diagnostics_observation')?.ok === true, 'export diagnostics never exit-fail');
  {
    const ed = board.controls.find((x) => x.id === 'export_diagnostics_observation');
    if (ed?.reason && !ed.reason.startsWith('n/a')) {
      assert(
        /rows=\d+/.test(ed.reason) &&
          /identityClean=/.test(ed.reason) &&
          /collisions=\d+/.test(ed.reason) &&
          /changedCompanies=\d+/.test(ed.reason),
        'export diagnostics rows/identityClean/collisions/changed in reason',
      );
      assert(typeof ed.evidence?.rows === 'number', 'export diagnostics rows evidence');
      assert(typeof ed.evidence?.identityClean === 'boolean', 'export diagnostics identityClean evidence');
      assert(typeof ed.evidence?.collisions === 'number', 'export diagnostics collisions evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_research_observation')?.severity === 'low', 'export research low');
  assert(board.controls.find((x) => x.id === 'export_research_observation')?.ok === true, 'export research never exit-fail');
  {
    const er = board.controls.find((x) => x.id === 'export_research_observation');
    if (er?.reason && !er.reason.startsWith('n/a')) {
      assert(
        /withResearch=\d+/.test(er.reason) &&
          /withoutResearch=\d+/.test(er.reason) &&
          /researchShare=/.test(er.reason),
        'export research with/without/share in reason',
      );
      assert(typeof er.evidence?.withResearch === 'number', 'export research withResearch evidence');
      assert(typeof er.evidence?.researchShare === 'number', 'export research researchShare evidence');
      assert(Array.isArray(er.evidence?.byStatus), 'export research byStatus evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_sample_observation')?.severity === 'low', 'export sample low');
  assert(board.controls.find((x) => x.id === 'export_sample_observation')?.ok === true, 'export sample never exit-fail');
  {
    const es = board.controls.find((x) => x.id === 'export_sample_observation');
    if (es?.reason && !es.reason.startsWith('n/a')) {
      assert(
        /boards=\d+/.test(es.reason) &&
          /coreSampleComplete=\d+/.test(es.reason) &&
          /coreSampleShare=/.test(es.reason),
        'export sample boards/coreSampleComplete/share in reason',
      );
      assert(typeof es.evidence?.boards === 'number', 'export sample boards evidence');
      assert(typeof es.evidence?.coreSampleComplete === 'number', 'export sample coreSampleComplete evidence');
      assert(typeof es.evidence?.coreSampleShare === 'number', 'export sample coreSampleShare evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_relationship_observation')?.severity === 'low', 'export relationship low');
  assert(board.controls.find((x) => x.id === 'export_relationship_observation')?.ok === true, 'export relationship never exit-fail');
  {
    const erl = board.controls.find((x) => x.id === 'export_relationship_observation');
    if (erl?.reason && !erl.reason.startsWith('n/a')) {
      assert(
        /nodes=\d+/.test(erl.reason) &&
          /edges=\d+/.test(erl.reason) &&
          /omitShare=/.test(erl.reason),
        'export relationship nodes/edges/omitShare in reason',
      );
      assert(typeof erl.evidence?.nodes === 'number', 'export relationship nodes evidence');
      assert(typeof erl.evidence?.edges === 'number', 'export relationship edges evidence');
      assert(typeof erl.evidence?.omitShare === 'number', 'export relationship omitShare evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'export_jobs_url_observation')?.severity === 'low', 'export jobsUrl low');
  assert(board.controls.find((x) => x.id === 'export_jobs_url_observation')?.ok === true, 'export jobsUrl never exit-fail');
  {
    const ej = board.controls.find((x) => x.id === 'export_jobs_url_observation');
    if (ej?.reason && !ej.reason.startsWith('n/a')) {
      assert(
        /withJobsUrl=\d+/.test(ej.reason) &&
          /primary=\d+/.test(ej.reason) &&
          /primaryShare=/.test(ej.reason),
        'export jobsUrl withJobsUrl/primary/share in reason',
      );
      assert(typeof ej.evidence?.withJobsUrl === 'number', 'export jobsUrl withJobsUrl evidence');
      assert(typeof ej.evidence?.primaryShare === 'number', 'export jobsUrl primaryShare evidence');
      assert(Array.isArray(ej.evidence?.byHostClass), 'export jobsUrl byHostClass evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_fn_drift')?.severity === 'low', 'fn drift low');
  assert(board.controls.find((x) => x.id === 'ledger_fn_drift')?.ok === true, 'fn drift never exit-fail');
  assert(board.controls.find((x) => x.id === 'map_role_mix_fresh')?.severity === 'low', 'map roleMix low');
  assert(board.controls.find((x) => x.id === 'map_role_mix_fresh')?.ok === true, 'map roleMix never exit-fail');
  assert(board.controls.find((x) => x.id === 'board_activity_observation')?.severity === 'low', 'board activity low');
  assert(board.controls.find((x) => x.id === 'board_activity_observation')?.ok === true, 'board activity never exit-fail');
  assert(board.controls.find((x) => x.id === 'native_date_field_mix')?.severity === 'low', 'native date mix low');
  assert(board.controls.find((x) => x.id === 'native_date_field_mix')?.ok === true, 'native date mix never exit-fail');
  assert(board.controls.find((x) => x.id === 'ledger_lastseen_observation')?.severity === 'low', 'lastSeen low');
  assert(board.controls.find((x) => x.id === 'ledger_lastseen_observation')?.ok === true, 'lastSeen never exit-fail');
  {
    const ls = board.controls.find((x) => x.id === 'ledger_lastseen_observation');
    if (ls?.reason && !ls.reason.startsWith('n/a')) {
      assert(/ge3=\d+/.test(ls.reason) && /maxDays=\d+/.test(ls.reason), 'lastSeen ge3/maxDays in reason');
      assert(typeof ls.evidence?.ge3 === 'number', 'lastSeen ge3 evidence');
      assert(Array.isArray(ls.evidence?.byProviderStale), 'lastSeen byProviderStale evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_reopen_observation')?.severity === 'low', 'reopen low');
  assert(board.controls.find((x) => x.id === 'ledger_reopen_observation')?.ok === true, 'reopen never exit-fail');
  {
    const ro = board.controls.find((x) => x.id === 'ledger_reopen_observation');
    if (ro?.reason && !ro.reason.startsWith('n/a')) {
      assert(/withReopen=\d+/.test(ro.reason) && /share=/.test(ro.reason), 'reopen with/share in reason');
      assert(typeof ro.evidence?.withReopen === 'number', 'reopen withReopen evidence');
      assert(Array.isArray(ro.evidence?.byCompanyTop), 'reopen byCompanyTop evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_general_application_observation')?.severity === 'low',
    'genApp low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_general_application_observation')?.ok === true,
    'genApp never exit-fail',
  );
  {
    const ga = board.controls.find((x) => x.id === 'ledger_general_application_observation');
    if (ga?.reason && !ga.reason.startsWith('n/a')) {
      assert(/generalApp=\d+/.test(ga.reason) && /share=/.test(ga.reason), 'genApp count/share in reason');
      assert(typeof ga.evidence?.generalApp === 'number', 'genApp evidence');
      assert(Array.isArray(ga.evidence?.byProvider), 'genApp byProvider evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_workplace_observation')?.severity === 'low', 'workplace low');
  assert(board.controls.find((x) => x.id === 'ledger_workplace_observation')?.ok === true, 'workplace never exit-fail');
  {
    const wp = board.controls.find((x) => x.id === 'ledger_workplace_observation');
    if (wp?.reason && !wp.reason.startsWith('n/a')) {
      assert(/remote=\d+/.test(wp.reason) && /remoteShare=/.test(wp.reason), 'workplace remote/share in reason');
      assert(typeof wp.evidence?.remote === 'number', 'workplace remote evidence');
      assert(Array.isArray(wp.evidence?.byFnRemote), 'workplace byFnRemote evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_closed_age_observation')?.severity === 'low', 'closedAge low');
  assert(board.controls.find((x) => x.id === 'ledger_closed_age_observation')?.ok === true, 'closedAge never exit-fail');
  {
    const ca = board.controls.find((x) => x.id === 'ledger_closed_age_observation');
    if (ca?.reason && !ca.reason.startsWith('n/a')) {
      assert(/closed=\d+/.test(ca.reason) && /maxDays=\d+/.test(ca.reason), 'closedAge closed/maxDays in reason');
      assert(typeof ca.evidence?.closed === 'number', 'closedAge closed evidence');
      assert(typeof ca.evidence?.ge7 === 'number', 'closedAge ge7 evidence');
      assert(ca.evidence?.byBucket && typeof ca.evidence.byBucket === 'object', 'closedAge byBucket evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_employment_type_observation')?.severity === 'low',
    'employmentType low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_employment_type_observation')?.ok === true,
    'employmentType never exit-fail',
  );
  {
    const et = board.controls.find((x) => x.id === 'ledger_employment_type_observation');
    if (et?.reason && !et.reason.startsWith('n/a')) {
      assert(/intern=\d+/.test(et.reason) && /contract=\d+/.test(et.reason), 'employmentType intern/contract in reason');
      assert(typeof et.evidence?.specified === 'number', 'employmentType specified evidence');
      assert(Array.isArray(et.evidence?.byType), 'employmentType byType evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_seniority_observation')?.severity === 'low', 'seniority low');
  assert(board.controls.find((x) => x.id === 'ledger_seniority_observation')?.ok === true, 'seniority never exit-fail');
  {
    const sn = board.controls.find((x) => x.id === 'ledger_seniority_observation');
    if (sn?.reason && !sn.reason.startsWith('n/a')) {
      assert(/specified=\d+/.test(sn.reason) && /unspecified=\d+/.test(sn.reason), 'seniority specified/unspecified in reason');
      assert(typeof sn.evidence?.specified === 'number', 'seniority specified evidence');
      assert(Array.isArray(sn.evidence?.bySeniority), 'seniority bySeniority evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_agency_policy_observation')?.severity === 'low',
    'agencyPolicy low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_agency_policy_observation')?.ok === true,
    'agencyPolicy never exit-fail',
  );
  {
    const ap = board.controls.find((x) => x.id === 'ledger_agency_policy_observation');
    if (ap?.reason && !ap.reason.startsWith('n/a')) {
      assert(/withPolicy=\d+/.test(ap.reason) && /share=/.test(ap.reason), 'agencyPolicy with/share in reason');
      assert(typeof ap.evidence?.withPolicy === 'number', 'agencyPolicy withPolicy evidence');
      assert(Array.isArray(ap.evidence?.byProvider), 'agencyPolicy byProvider evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_us_posted_observation')?.severity === 'low', 'usPosted low');
  assert(board.controls.find((x) => x.id === 'ledger_us_posted_observation')?.ok === true, 'usPosted never exit-fail');
  {
    const up = board.controls.find((x) => x.id === 'ledger_us_posted_observation');
    if (up?.reason && !up.reason.startsWith('n/a')) {
      assert(/usPosted=\d+/.test(up.reason) && /share=/.test(up.reason), 'usPosted count/share in reason');
      assert(typeof up.evidence?.usPosted === 'number', 'usPosted evidence');
      assert(Array.isArray(up.evidence?.byFnUs), 'usPosted byFnUs evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_posted_date_recycle_observation')?.severity === 'low',
    'postedDateRecycle low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_posted_date_recycle_observation')?.ok === true,
    'postedDateRecycle never exit-fail',
  );
  {
    const pr = board.controls.find((x) => x.id === 'ledger_posted_date_recycle_observation');
    if (pr?.reason && !pr.reason.startsWith('n/a')) {
      assert(/withRecycle=\d+/.test(pr.reason) && /share=/.test(pr.reason), 'postedDateRecycle with/share in reason');
      assert(typeof pr.evidence?.withRecycle === 'number', 'postedDateRecycle withRecycle evidence');
      assert(Array.isArray(pr.evidence?.byProvider), 'postedDateRecycle byProvider evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_metro_observation')?.severity === 'low', 'metro low');
  assert(board.controls.find((x) => x.id === 'ledger_metro_observation')?.ok === true, 'metro never exit-fail');
  {
    const mt = board.controls.find((x) => x.id === 'ledger_metro_observation');
    if (mt?.reason && !mt.reason.startsWith('n/a')) {
      assert(/sfBay=\d+/.test(mt.reason) && /withMetro=\d+/.test(mt.reason), 'metro sfBay/withMetro in reason');
      assert(typeof mt.evidence?.sfBay === 'number', 'metro sfBay evidence');
      assert(Array.isArray(mt.evidence?.byMetro), 'metro byMetro evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_founding_observation')?.severity === 'low', 'founding low');
  assert(board.controls.find((x) => x.id === 'ledger_founding_observation')?.ok === true, 'founding never exit-fail');
  {
    const fd = board.controls.find((x) => x.id === 'ledger_founding_observation');
    if (fd?.reason && !fd.reason.startsWith('n/a')) {
      assert(/founding=\d+/.test(fd.reason) && /share=/.test(fd.reason), 'founding count/share in reason');
      assert(typeof fd.evidence?.founding === 'number', 'founding evidence');
      assert(Array.isArray(fd.evidence?.byFn), 'founding byFn evidence');
    }
  }
  assert(board.controls.find((x) => x.id === 'ledger_language_observation')?.severity === 'low', 'language low');
  assert(board.controls.find((x) => x.id === 'ledger_language_observation')?.ok === true, 'language never exit-fail');
  {
    const lg = board.controls.find((x) => x.id === 'ledger_language_observation');
    if (lg?.reason && !lg.reason.startsWith('n/a')) {
      assert(/withLanguage=\d+/.test(lg.reason) && /share=/.test(lg.reason), 'language with/share in reason');
      assert(typeof lg.evidence?.withLanguage === 'number', 'language withLanguage evidence');
      assert(Array.isArray(lg.evidence?.byLanguage), 'language byLanguage evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_native_update_observation')?.severity === 'low',
    'nativeUpdate low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_native_update_observation')?.ok === true,
    'nativeUpdate never exit-fail',
  );
  {
    const nu = board.controls.find((x) => x.id === 'ledger_native_update_observation');
    if (nu?.reason && !nu.reason.startsWith('n/a')) {
      assert(/updatedAfter=\d+/.test(nu.reason) && /withFlag=\d+/.test(nu.reason), 'nativeUpdate updated/withFlag in reason');
      assert(typeof nu.evidence?.updatedAfter === 'number', 'nativeUpdate updatedAfter evidence');
      assert(typeof nu.evidence?.withoutFlag === 'number', 'nativeUpdate withoutFlag evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_company_open_observation')?.severity === 'low',
    'companyOpen low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_company_open_observation')?.ok === true,
    'companyOpen never exit-fail',
  );
  {
    const co = board.controls.find((x) => x.id === 'ledger_company_open_observation');
    if (co?.reason && !co.reason.startsWith('n/a')) {
      assert(/companies=\d+/.test(co.reason) && /top10Share=/.test(co.reason), 'companyOpen companies/top10 in reason');
      assert(typeof co.evidence?.companies === 'number', 'companyOpen companies evidence');
      assert(typeof co.evidence?.top10Share === 'number', 'companyOpen top10Share evidence');
      assert(Array.isArray(co.evidence?.byCompanyTop), 'companyOpen byCompanyTop evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_url_host_observation')?.severity === 'low',
    'urlHost low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_url_host_observation')?.ok === true,
    'urlHost never exit-fail',
  );
  {
    const uh = board.controls.find((x) => x.id === 'ledger_url_host_observation');
    if (uh?.reason && !uh.reason.startsWith('n/a')) {
      assert(/atsNative=\d+/.test(uh.reason) && /atsNativeShare=/.test(uh.reason), 'urlHost atsNative/share in reason');
      assert(typeof uh.evidence?.atsNative === 'number', 'urlHost atsNative evidence');
      assert(typeof uh.evidence?.customDomain === 'number', 'urlHost customDomain evidence');
      assert(Array.isArray(uh.evidence?.byHostClass), 'urlHost byHostClass evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_observed_age_observation')?.severity === 'low',
    'observedAge low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_observed_age_observation')?.ok === true,
    'observedAge never exit-fail',
  );
  {
    const oa = board.controls.find((x) => x.id === 'ledger_observed_age_observation');
    if (oa?.reason && !oa.reason.startsWith('n/a')) {
      assert(/withFirstSeen=\d+/.test(oa.reason) && /ge7=\d+/.test(oa.reason), 'observedAge withFirstSeen/ge7 in reason');
      assert(typeof oa.evidence?.withFirstSeen === 'number', 'observedAge withFirstSeen evidence');
      assert(typeof oa.evidence?.maxDays === 'number', 'observedAge maxDays evidence');
      assert(oa.evidence?.byBucket && typeof oa.evidence.byBucket === 'object', 'observedAge byBucket evidence');
    }
  }
  assert(
    board.controls.find((x) => x.id === 'ledger_posted_age_observation')?.severity === 'low',
    'postedAge low',
  );
  assert(
    board.controls.find((x) => x.id === 'ledger_posted_age_observation')?.ok === true,
    'postedAge never exit-fail',
  );
  {
    const pa = board.controls.find((x) => x.id === 'ledger_posted_age_observation');
    if (pa?.reason && !pa.reason.startsWith('n/a')) {
      assert(/attributable=\d+/.test(pa.reason) && /aging90_365=\d+/.test(pa.reason), 'postedAge attributable/aging in reason');
      assert(typeof pa.evidence?.attributable === 'number', 'postedAge attributable evidence');
      assert(typeof pa.evidence?.evergreenRoles === 'number', 'postedAge evergreen evidence');
      assert(pa.evidence?.byBucket && typeof pa.evidence.byBucket === 'object', 'postedAge byBucket evidence');
    }
  }
  assert(
    /exits≠filled|no in-window|n\/a/.test(board.controls.find((x) => x.id === 'board_activity_observation')?.reason || ''),
    'board activity reason is observation-honest',
  );
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
