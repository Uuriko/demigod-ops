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
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { assertMapFloors, PUBLIC_STARTUP_MAP_PATH } from './demigod-startup-map-data.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const MAP = process.env.DEMIGOD_STARTUP_MAP || PUBLIC_STARTUP_MAP_PATH || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const SNAP = path.join(BUSY, 'DEMIGOD-SF-STARTUP-MAP.last-good.json');
const META = path.join(BUSY, 'map-last-good.json');
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
  const checkpoint = meta || mapStats(JSON.parse(fs.readFileSync(snapPath, 'utf8')));
  if (!force && !isMateriallyWorse(current, checkpoint, { boardRatio })) {
    return { ok: true, restored: false, reason: 'current-ok', current, checkpoint };
  }
  const raw = fs.readFileSync(snapPath, 'utf8');
  const map = JSON.parse(raw);
  assertMapFloors(map, { withJobs: true, minBoards: 100 });
  atomicWrite(mapPath, raw.endsWith('\n') ? raw : `${raw}\n`, { mode: 0o644 });
  return {
    ok: true,
    restored: true,
    reason: force ? 'forced' : 'materially-worse',
    current,
    checkpoint: mapStats(map),
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
      const current = fs.existsSync(MAP)
        ? mapStats(JSON.parse(fs.readFileSync(MAP, 'utf8')))
        : null;
      console.log(
        JSON.stringify(
          {
            ok: true,
            current,
            checkpoint: meta,
            worse: isMateriallyWorse(current, meta),
            snapExists: fs.existsSync(SNAP),
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
