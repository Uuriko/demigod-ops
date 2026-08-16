#!/usr/bin/env node
/**
 * Durable last-good snapshot of DEMIGOD-SF-STARTUP-MAP.json.
 *
 * Two KEEP_WORKING fires lost production open-role counts when a rebuild/enrich
 * was killed or a thinner rebuild was promoted. Git HEAD is weeks stale. This
 * checkpoint lives under /tmp/dg-busy so agents can restore without inventing data.
 *
 *   node demigod-map-checkpoint.mjs save
 *   node demigod-map-checkpoint.mjs status
 *   node demigod-map-checkpoint.mjs restore --if-worse
 *   node demigod-map-checkpoint.mjs --selftest
 *
 * restore --if-worse only copies the checkpoint over disk when the live map has
 * materially fewer open-role boards (default: < 80% of checkpoint boards).
 * Never publishes. Never invents companies.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { assertMapFloors, PUBLIC_STARTUP_MAP_PATH } from './demigod-startup-map-data.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = process.env.DEMIGOD_STARTUP_MAP || PUBLIC_STARTUP_MAP_PATH || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
// The point of this file is the word "durable", and /tmp/dg-busy is not — it is cleared on reboot,
// which is why `status` read `checkpoint: null` on 2026-08-16 and nothing caught the 98-board loss
// eight rebuilds earlier. State that must outlive a boot goes in XDG state, not the busy scratch.
const STATE = process.env.DEMIGOD_STATE || path.join(os.homedir(), '.local', 'state', 'demigod');
export const SNAP_PATH = path.join(STATE, 'DEMIGOD-SF-STARTUP-MAP.last-good.json');
export const META_PATH = path.join(STATE, 'map-last-good.json');
const SNAP = SNAP_PATH;
const META = META_PATH;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export function mapStats(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const boards = cos.filter((c) => Number(c?.openRoles) > 0).length;
  const roles = cos.reduce((s, c) => s + (Number(c?.openRoles) > 0 ? Number(c.openRoles) : 0), 0);
  return {
    companies: cos.length,
    boards,
    roles,
    generatedAt: map?.generatedAt || null,
  };
}

export function isMateriallyWorse(current, checkpoint, { boardRatio = 0.8 } = {}) {
  if (!checkpoint || !Number.isFinite(checkpoint.boards) || checkpoint.boards < 50) return false;
  if (!current || !Number.isFinite(current.boards)) return true;
  return current.boards < checkpoint.boards * boardRatio;
}

/** Registrable-ish host for cross-rebuild identity; the documented dedupe key is the website host. */
function siteHost(company) {
  try {
    return new URL(company.website).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Companies that had open roles in the checkpoint and are ABSENT from the current map.
 *
 * The count check above cannot see this. Between the 2026-08-06 and 2026-08-14 maps, 98 companies
 * carrying 2,328 open roles left the directory (Palantir, Verkada, Anysphere, Robinhood) while the
 * board count moved 339 → 340, because new boards replaced them one-for-one. A net-count guard
 * reads that as healthy. What was actually lost is a SET, so compare sets.
 *
 * A row whose id changed but whose website host survives is a re-key or a dedupe merge, not a loss.
 */
export function lostBoards(currentMap, checkpointMap) {
  const currentCos = Array.isArray(currentMap?.companies) ? currentMap.companies : [];
  const ids = new Set(currentCos.map((c) => String(c?.id || '')).filter(Boolean));
  const hosts = new Set(currentCos.map(siteHost).filter(Boolean));
  const was = Array.isArray(checkpointMap?.companies) ? checkpointMap.companies : [];
  return was
    .filter((c) => Number(c?.openRoles) > 0)
    .filter((c) => !ids.has(String(c?.id || '')) && !hosts.has(siteHost(c)))
    .map((c) => ({ id: c.id, name: c.name, openRoles: Number(c.openRoles) }));
}

/**
 * True when the rebuild dropped a material share of the boards the checkpoint was serving.
 * Some churn is legitimate — a dedupe merge or a tightened identity guard removes rows on purpose —
 * so this is a share, not a zero-tolerance check. The 2026-08 incident was 29%.
 */
export function isBoardCoverageLoss(lost, checkpointStats, { lossRatio = 0.1 } = {}) {
  const boards = Number(checkpointStats?.boards);
  if (!Number.isFinite(boards) || boards < 50) return false;
  return lost.length > boards * lossRatio;
}

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

export function saveCheckpoint({ mapPath = MAP, snapPath = SNAP, metaPath = META } = {}) {
  if (!fs.existsSync(mapPath)) throw new Error(`map missing: ${mapPath}`);
  const raw = fs.readFileSync(mapPath, 'utf8');
  const map = JSON.parse(raw);
  const stats = mapStats(map);
  // Prefer a jobs-enriched map. Bare rebuilds (0 boards) must not overwrite a good checkpoint.
  if (stats.boards < 100) {
    return { ok: false, reason: 'too-few-boards', stats, snapPath };
  }
  assertMapFloors(map, { withJobs: true, minBoards: 100 });
  fs.mkdirSync(path.dirname(snapPath), { recursive: true, mode: 0o700 });
  atomicWrite(snapPath, raw.endsWith('\n') ? raw : `${raw}\n`, { mode: 0o600 });
  const meta = {
    schema: 'demigod.map-last-good/1',
    at: new Date().toISOString(),
    mapPath,
    snapPath,
    sha256: sha256File(snapPath),
    ...stats,
  };
  atomicWrite(metaPath, `${JSON.stringify(meta, null, 2)}\n`, { mode: 0o600 });
  return { ok: true, ...meta };
}

export function loadMeta(metaPath = META) {
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

export function restoreIfWorse({
  mapPath = MAP,
  snapPath = SNAP,
  metaPath = META,
  boardRatio = 0.8,
  force = false,
} = {}) {
  if (!fs.existsSync(snapPath)) return { ok: false, reason: 'no-checkpoint' };
  const meta = loadMeta(metaPath);
  const current = fs.existsSync(mapPath)
    ? mapStats(JSON.parse(fs.readFileSync(mapPath, 'utf8')))
    : null;
  const snapMap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  const checkpoint = meta || mapStats(snapMap);
  const lost = fs.existsSync(mapPath)
    ? lostBoards(JSON.parse(fs.readFileSync(mapPath, 'utf8')), snapMap)
    : [];
  const coverageLoss = isBoardCoverageLoss(lost, checkpoint);
  if (!force && !isMateriallyWorse(current, checkpoint, { boardRatio }) && !coverageLoss) {
    return { ok: true, restored: false, reason: 'current-ok', current, checkpoint, lostBoards: lost.length };
  }
  const raw = fs.readFileSync(snapPath, 'utf8');
  const map = JSON.parse(raw);
  assertMapFloors(map, { withJobs: true, minBoards: 100 });
  atomicWrite(mapPath, raw.endsWith('\n') ? raw : `${raw}\n`, { mode: 0o644 });
  return {
    ok: true,
    restored: true,
    reason: force ? 'forced' : coverageLoss ? 'board-coverage-loss' : 'materially-worse',
    current,
    checkpoint: mapStats(map),
    lostBoards: lost.length,
    lostRoles: lost.reduce((s, c) => s + c.openRoles, 0),
    lostSample: lost.sort((a, b) => b.openRoles - a.openRoles).slice(0, 10),
    mapPath,
  };
}

function selftest() {
  assert.equal(isMateriallyWorse({ boards: 331 }, { boards: 505 }), true);
  assert.equal(isMateriallyWorse({ boards: 500 }, { boards: 505 }), false);
  assert.equal(isMateriallyWorse({ boards: 0 }, { boards: 505 }), true);
  assert.equal(isMateriallyWorse({ boards: 100 }, { boards: 40 }), false, 'weak checkpoint not used');
  const s = mapStats({ companies: [{ openRoles: 3 }, { openRoles: 0 }, {}] });
  assert.equal(s.companies, 3);
  assert.equal(s.boards, 1);
  assert.equal(s.roles, 3);

  // The 2026-08 shape: boards replaced one-for-one, so the count check sees nothing.
  const before = { companies: [
    { id: 'hn:palantir.com', name: 'Palantir', website: 'https://www.palantir.com/', openRoles: 230 },
    { id: 'yc:keeper', name: 'Keeper', website: 'https://keeper.com/', openRoles: 5 },
  ] };
  const after = { companies: [
    { id: 'yc:keeper', name: 'Keeper', website: 'https://keeper.com/', openRoles: 5 },
    { id: 'yc:newco', name: 'NewCo', website: 'https://newco.com/', openRoles: 12 },
  ] };
  assert.equal(isMateriallyWorse(mapStats(after), { boards: 2 }), false, 'net board count hides the loss');
  const lost = lostBoards(after, before);
  assert.deepEqual(lost.map((c) => c.id), ['hn:palantir.com'], 'the dropped board is named');
  assert.equal(isBoardCoverageLoss(lost, { boards: 339 }), false, 'one lost board out of 339 is churn, not a regression');
  assert.equal(isBoardCoverageLoss(Array(98).fill({ openRoles: 1 }), { boards: 339 }), true, 'the real incident (98/339) is a regression');
  // A re-keyed or dedupe-merged row keeps its website host and is not a loss.
  const rekeyed = { companies: [{ id: 'yc:palantir', name: 'Palantir Technologies', website: 'https://palantir.com/', openRoles: 230 }] };
  assert.deepEqual(lostBoards(rekeyed, before).map((c) => c.id), ['yc:keeper'], 'host survival means re-key, not loss');
  assert.equal(isBoardCoverageLoss([{ openRoles: 1 }], { boards: 10 }), false, 'a weak checkpoint never triggers a restore');
  console.log(JSON.stringify({ ok: true, selftest: 'map-checkpoint' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args.find((a) => !a.startsWith('-')) || 'status';
  try {
    if (args.includes('--selftest') || cmd === '--selftest') {
      selftest();
      process.exit(0);
    }
    if (cmd === 'save') {
      console.log(JSON.stringify(saveCheckpoint(), null, 2));
      process.exit(0);
    }
    if (cmd === 'status') {
      const meta = loadMeta();
      const currentMap = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, 'utf8')) : null;
      const current = currentMap ? mapStats(currentMap) : null;
      const snapExists = fs.existsSync(SNAP);
      const lost = snapExists && currentMap
        ? lostBoards(currentMap, JSON.parse(fs.readFileSync(SNAP, 'utf8')))
        : [];
      console.log(
        JSON.stringify(
          {
            ok: true,
            current,
            checkpoint: meta,
            worse: isMateriallyWorse(current, meta),
            boardCoverageLoss: isBoardCoverageLoss(lost, meta),
            lostBoards: lost.length,
            lostRoles: lost.reduce((s, c) => s + c.openRoles, 0),
            lostSample: lost.sort((a, b) => b.openRoles - a.openRoles).slice(0, 10),
            snapExists,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }
    if (cmd === 'restore') {
      // Default safe path is --if-worse. Pass --force alone to overwrite even when current looks fine.
      const force = args.includes('--force') && !args.includes('--if-worse');
      const out = restoreIfWorse({ force });
      console.log(JSON.stringify(out, null, 2));
      process.exit(out.ok ? 0 : 1);
    }
    console.error('usage: demigod-map-checkpoint.mjs save|status|restore [--if-worse|--force] | --selftest');
    process.exit(2);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
    process.exit(1);
  }
}
