#!/usr/bin/env node
/**
 * demigod-next — single NEXT builder (control / dash / ship agree)
 *
 *   import { buildNext } from './demigod-next.mjs'
 *   node demigod-next.mjs [--json]
 *
 * Priority:
 *  1. Refresh truth if evidence is stale/missing
 *  2. If freeze ON + green → demand/human (no ship)
 *  3. If freeze OFF + not shipped → ship prepare/run
 *  4. Else orient home
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { refuseIfStale } from './demigod-evidence.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { footVerFromJs, readText } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const DEMAND_STATUS_TTL_MS = 15 * 60 * 1000;
const DEMAND_STATUS_FUTURE_TOLERANCE_MS = 60 * 1000;

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @returns {{ id: string, title: string, cmd: string, pri: number, mutate: boolean, freezeBlocks: boolean, reason: string, freeze: object, truthEvidence: object, versions: object }}
 */
export function buildNext({ truth = null, demand = null, truthEvidence = null } = {}) {
  const freeze = freezeStatus();
  const te = truthEvidence || refuseIfStale('truth');
  const truthFacts = truth || readJson(path.join(BUSY, 'truth.json'));
  const demandStatus = demand || readJson(path.join(BUSY, 'demand-status.json'));
  const diskVersion = footVerFromJs(readText(path.join(ROOT, 'demigod-foot-core.js'), 2_000_000));

  const versions = {
    // Truth receipts are deliberately cached, but a field named "disk" must
    // describe the file now. Otherwise NEXT can conceal an in-progress foot
    // change until truth is refreshed (for example, reporting v243 on v244).
    disk: diskVersion ?? truthFacts?.foot?.ver ?? null,
    live: truthFacts?.live?.footVer ?? null,
    manifest: truthFacts?.manifest?.version ?? null,
  };

  const base = {
    freeze: { on: freeze.frozen, why: freeze.why },
    truthEvidence: {
      green: Boolean(te.green),
      pass: Boolean(te.pass),
      fresh: Boolean(te.fresh),
      reason: te.reason,
      runId: te.runId,
      summary: te.summary,
    },
    versions,
    fullyShipped: Boolean(truthFacts?.fullyShipped),
    driftExpected: Boolean(truthFacts?.driftExpected),
    at: new Date().toISOString(),
  };

  if (!te.fresh) {
    return {
      ...base,
      id: 'truth',
      title: 'Refresh truth evidence (stale/missing)',
      cmd: 'bin/dg truth',
      pri: 0,
      mutate: false,
      freezeBlocks: false,
      reason: te.reason || 'no-evidence',
    };
  }

  if (freeze.frozen) {
    const pending = demandStatus?.queue?.pending;
    const top = demandStatus?.queue?.top3?.[0];
    const draftHygiene = demandStatus?.drafts?.hygiene?.ok ?? demandStatus?.drafts?.allHygieneOk ?? null;
    const draftFlagged = Number(demandStatus?.drafts?.hygiene?.flagged ?? demandStatus?.drafts?.needFix?.length ?? 0);
    const warmFreshness = demandStatus?.warmInbound?.freshness || null;
    const warmOverdue = Number(warmFreshness?.overdueActionCount ?? 0);
    const warmDueToday = Number(warmFreshness?.dueTodayActionCount ?? 0);
    const demandStatusAtMs = Date.parse(demandStatus?.at || '');
    const demandStatusRawAgeMs = Number.isFinite(demandStatusAtMs)
      ? Date.now() - demandStatusAtMs
      : null;
    const demandStatusFutureDated =
      demandStatusRawAgeMs != null && demandStatusRawAgeMs < -DEMAND_STATUS_FUTURE_TOLERANCE_MS;
    const demandStatusAgeMs = demandStatusRawAgeMs != null
      ? Math.max(0, demandStatusRawAgeMs)
      : null;
    const demandStatusFresh =
      demandStatusAgeMs != null &&
      !demandStatusFutureDated &&
      demandStatusAgeMs <= DEMAND_STATUS_TTL_MS;
    const demandSignal = {
      pending: pending ?? null,
      head: top?.name || null,
      // Hygiene is operational evidence only while its status snapshot is
      // fresh. Preserve the recorded value separately for diagnostics, but do
      // not let a cached "clean" result masquerade as current demand truth.
      draftHygieneOk: demandStatusFresh && typeof draftHygiene === 'boolean' ? draftHygiene : null,
      recordedDraftHygieneOk: typeof draftHygiene === 'boolean' ? draftHygiene : null,
      draftFlagged: Number.isFinite(draftFlagged) ? draftFlagged : null,
      warmInbound: {
        // Warm inbound is attributable demand, but never a pilot. Expose only
        // action-health telemetry from the fresh demand snapshot so control
        // and dashboard surfaces can preserve demand's priority ordering.
        count: demandStatusFresh ? Number(demandStatus?.warmInbound?.count ?? 0) : null,
        overdueActionCount: demandStatusFresh && Number.isFinite(warmOverdue) ? warmOverdue : null,
        dueTodayActionCount: demandStatusFresh && Number.isFinite(warmDueToday) ? warmDueToday : null,
        overdueActionWho: demandStatusFresh && Array.isArray(warmFreshness?.overdueActionWho)
          ? warmFreshness.overdueActionWho
          : [],
        dueTodayActionWho: demandStatusFresh && Array.isArray(warmFreshness?.dueTodayActionWho)
          ? warmFreshness.dueTodayActionWho
          : [],
        isPilot: false,
      },
      statusAt: demandStatus?.at || null,
      statusAgeMs: demandStatusAgeMs,
      statusFutureDated: demandStatusFutureDated,
      statusFresh: demandStatusFresh,
      statusTtlMs: DEMAND_STATUS_TTL_MS,
      statusFutureToleranceMs: DEMAND_STATUS_FUTURE_TOLERANCE_MS,
    };
    return {
      ...base,
      id: 'demand-ops',
      title: 'Review demand operations · publish freeze holds',
      cmd: 'bin/dg demand status',
      pri: 0,
      mutate: false,
      // Freeze holds publish/mutation only. Demand status is read-only and is
      // intentionally the canonical path while frozen.
      freezeBlocks: false,
      reason: 'freeze-on-demand-first',
      demandNext: demandStatus?.next || null,
      demandSignal,
    };
  }

  if (truthFacts?.fullyShipped) {
    return {
      ...base,
      id: 'hold-green',
      title: 'Review demand operations',
      cmd: 'bin/dg demand status',
      pri: 1,
      mutate: false,
      freezeBlocks: false,
      reason: 'fully-shipped',
    };
  }

  // Honest titles: prepare-only / unauthorized publish is not a P1 outage.
  const summary = String(
    truthFacts?.summaryLine || truthFacts?.summary || te.summary || '',
  );
  const diskLiveSame =
    versions.disk != null &&
    versions.live != null &&
    String(versions.disk) === String(versions.live);
  const prepareOnlyAssets =
    Boolean(truthFacts?.prepareOnlyAssets) ||
    Boolean(truthFacts?.prepareOnlySiblingAssets) ||
    Boolean(truthFacts?.claims?.prepareOnlyAssets) ||
    /prepareOnlyAssets/i.test(summary);
  const prepareOnlyRelease =
    Boolean(truthFacts?.prepareOnlyRelease) ||
    prepareOnlyAssets ||
    /\bprepareOnly(?:Release|Assets)?\b/i.test(summary) ||
    /\bprepare-only\b/i.test(summary);

  if (prepareOnlyRelease) {
    const shipTitle = diskLiveSame
      ? prepareOnlyAssets
        ? 'Prepare ship (foot version match · sibling assets pending)'
        : 'Prepare ship (prepare-only · not fully shipped)'
      : 'Staged foot ahead of live · publish unauthorized';
    return {
      ...base,
      id: 'ship-prepare',
      title: shipTitle,
      cmd: 'bin/dg ship prepare',
      // Pri 2: truth already soft-passed identity lag; do not drown demand/warm.
      pri: 2,
      mutate: false,
      freezeBlocks: false,
      reason: diskLiveSame
        ? prepareOnlyAssets
          ? 'prepare-only-assets'
          : 'prepare-only-release'
        : 'prepare-only-version-drift',
    };
  }

  const shipTitle = diskLiveSame
    ? 'Prepare ship (not fully shipped)'
    : 'Prepare ship (disk≠live)';

  return {
    ...base,
    id: 'ship-prepare',
    title: shipTitle,
    cmd: 'bin/dg ship prepare',
    pri: 1,
    mutate: false,
    freezeBlocks: false,
    reason: diskLiveSame
      ? 'unfrozen-not-fully-shipped'
      : 'unfrozen-disk-live-drift',
  };
}

function assertSameSurfaces() {
  /** Compare buildNext vs control nextCanon + next.json + cockpit (non-override). */
  const n = buildNext();
  const plane = readJson(path.join(BUSY, 'control-plane.json'));
  const cock = readJson(path.join(BUSY, 'cockpit.json'));
  const ship = readJson(path.join(BUSY, 'ship-latest.json'));
  const nextFile = readJson(path.join(BUSY, 'next.json'));
  const mismatches = [];
  const check = (label, id, cmd) => {
    if (id == null && cmd == null) return;
    if (id && id !== n.id) mismatches.push({ label, field: 'id', expected: n.id, got: id });
    if (cmd && cmd !== n.cmd) mismatches.push({ label, field: 'cmd', expected: n.cmd, got: cmd });
  };
  if (nextFile) check('next.json', nextFile.id, nextFile.cmd);
  if (plane?.nextCanon) check('control.nextCanon', plane.nextCanon.id, plane.nextCanon.cmd);
  else if (plane?.next) check('control.next', plane.next.id, plane.next.cmd);
  if (cock?.next && !['live-down', 'board-honesty', 'verify-source'].includes(cock.next.id)) {
    check('cockpit.next', cock.next.id, cock.next.cmd);
  }
  if (ship?.next && typeof ship.next === 'object' && ship.next.id && !ship.next.stage) {
    // ship-latest may carry stage-chain "next" (hash), not agent NEXT — only check when id looks canonical
    if (typeof ship.next.id === 'string' && !/^[0-9a-f]{8,}$/i.test(ship.next.id)) {
      check('ship.next', ship.next.id, ship.next.cmd);
    }
  }
  const out = {
    ok: mismatches.length === 0,
    id: n.id,
    cmd: n.cmd,
    freeze: n.freeze,
    versions: n.versions,
    mismatches,
  };
  return out;
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const nextArgs = process.argv.slice(2);
  const NEXT_FLAGS = new Set(['--json', '--assert-same', '--help', '-h']);
  const unknownNext = nextArgs.find((a) => !NEXT_FLAGS.has(a));
  if (unknownNext) {
    console.error(`next: unknown argument ${unknownNext} — try: node demigod-next.mjs [--json|--assert-same]`);
    process.exit(2);
  }
  if (nextArgs.includes('--help') || nextArgs.includes('-h')) {
    console.log(`demigod-next — single NEXT builder

Usage: node demigod-next.mjs [--json] [--assert-same]`);
    process.exit(0);
  }
  if (process.argv.includes('--assert-same')) {
    const a = assertSameSurfaces();
    console.log(JSON.stringify(a, null, 2));
    process.exit(a.ok ? 0 : 1);
  }
  const n = buildNext();
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'next.json'), JSON.stringify(n, null, 2) + '\n');
  if (process.argv.includes('--json')) console.log(JSON.stringify(n, null, 2));
  else {
    console.log(`NEXT: ${n.title}`);
    console.log(`cmd:  ${n.cmd}`);
    console.log(`id:   ${n.id} · freeze=${n.freeze.on ? 'ON' : 'OFF'} · green=${n.truthEvidence.green}`);
    console.log(`ver:  disk=${n.versions.disk} live=${n.versions.live}`);
  }
}
