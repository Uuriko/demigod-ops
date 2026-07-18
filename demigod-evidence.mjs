#!/usr/bin/env node
/**
 * demigod-evidence — proof envelopes for unforgeable green
 *
 *   import { beginRun, sealRun, isFresh, loadLatest, refuseIfStale } from './demigod-evidence.mjs'
 *   node demigod-evidence.mjs list|show <runId>|fresh <producer>
 *
 * Store: /tmp/dg-busy/evidence/<runId>.json
 * Latest: /tmp/dg-busy/evidence/latest-<producer>.json
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DG_BUSY || '/tmp/dg-busy';
export const EVIDENCE_DIR = path.join(BUSY, 'evidence');

export function sha256File(absOrRel) {
  const abs = path.isAbsolute(absOrRel) ? absOrRel : path.join(ROOT, absOrRel);
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  } catch {
    return null;
  }
}

export function hashFiles(files = []) {
  const out = {};
  for (const f of files) {
    const rel = f.startsWith(ROOT) ? path.relative(ROOT, f) : f;
    out[rel.replace(/\\/g, '/')] = sha256File(f);
  }
  return out;
}

export function beginRun(producer, { scope = [], extraInputs = {} } = {}) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const runId = `${producer}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  const inputs = { files: hashFiles(scope), ...extraInputs };
  return {
    runId,
    producer,
    version: process.env.DG_EVIDENCE_VERSION || '1',
    startedAt: new Date().toISOString(),
    scope: scope.map((s) => (s.startsWith(ROOT) ? path.relative(ROOT, s) : s)),
    inputs,
    result: null,
    artifacts: [],
    meta: {},
  };
}

export function addArtifact(run, label, filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(BUSY, filePath.replace(/^\/tmp\/dg-busy\//, ''));
  const p = fs.existsSync(filePath)
    ? filePath
    : fs.existsSync(abs)
      ? abs
      : path.join(ROOT, filePath);
  run.artifacts.push({
    label,
    path: p,
    sha256: sha256File(p),
  });
  return run;
}

/**
 * Seal and write evidence. Returns envelope with pass/fresh helpers.
 */
export function sealRun(run, result = {}, meta = {}) {
  const sealed = {
    ...run,
    endedAt: new Date().toISOString(),
    result: {
      pass: Boolean(result.pass),
      exit: result.exit ?? (result.pass ? 0 : 1),
      summary: result.summary || null,
      ...result,
    },
    meta: { ...run.meta, ...meta },
    ttlSec: result.ttlSec ?? meta.ttlSec ?? 3600,
  };
  // re-hash inputs at seal for freshness baseline
  sealed.inputsAtSeal = {
    files: hashFiles(run.scope.length ? run.scope : Object.keys(run.inputs?.files || {})),
  };
  const outPath = path.join(EVIDENCE_DIR, `${sealed.runId}.json`);
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(sealed, null, 2) + '\n');
  const latest = path.join(EVIDENCE_DIR, `latest-${sealed.producer}.json`);
  fs.writeFileSync(latest, JSON.stringify(sealed, null, 2) + '\n');
  sealed._path = outPath;
  sealed._latestPath = latest;
  return sealed;
}

/**
 * Check if sealed evidence still matches current disk for its input files.
 */
export function isFresh(envelope, { maxAgeSec = null } = {}) {
  if (!envelope) return { fresh: false, reason: 'missing' };
  const files = envelope.inputsAtSeal?.files || envelope.inputs?.files || {};
  const mismatches = [];
  for (const [rel, sha] of Object.entries(files)) {
    if (!sha) continue;
    const now = sha256File(rel);
    if (now !== sha) mismatches.push({ file: rel, expected: sha?.slice(0, 12), actual: now?.slice(0, 12) });
  }
  if (mismatches.length) {
    return { fresh: false, reason: 'input-hash-mismatch', mismatches };
  }
  const ageMax = maxAgeSec ?? envelope.ttlSec ?? 3600;
  const ended = Date.parse(envelope.endedAt || envelope.at || envelope.startedAt || 0);
  // Future-dated envelope (clock skew): negative age silently passed the ttl check below. Reject it.
  if (Number.isFinite(ended) && Date.now() - ended < -60000) {
    return { fresh: false, reason: 'clock-skew', ageSec: Math.round((Date.now() - ended) / 1000) };
  }
  if (Number.isFinite(ended) && ageMax > 0 && Date.now() - ended > ageMax * 1000) {
    return { fresh: false, reason: 'ttl-expired', ageSec: Math.round((Date.now() - ended) / 1000) };
  }
  return { fresh: true, reason: 'ok' };
}

export function loadEvidence(runIdOrPath) {
  try {
    const p = runIdOrPath.includes('/') || runIdOrPath.endsWith('.json')
      ? runIdOrPath
      : path.join(EVIDENCE_DIR, `${runIdOrPath}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function loadLatest(producer) {
  return loadEvidence(path.join(EVIDENCE_DIR, `latest-${producer}.json`));
}

/** For dashboards: green only if pass && fresh */
export function refuseIfStale(producer, { maxAgeSec = null } = {}) {
  const env = loadLatest(producer);
  if (!env) return { ok: false, green: false, reason: 'no-evidence', producer };
  const fr = isFresh(env, { maxAgeSec });
  return {
    ok: true,
    green: Boolean(env.result?.pass) && fr.fresh,
    pass: Boolean(env.result?.pass),
    fresh: fr.fresh,
    reason: fr.fresh ? (env.result?.pass ? 'pass-fresh' : 'fail-fresh') : fr.reason,
    mismatches: fr.mismatches,
    runId: env.runId,
    endedAt: env.endedAt,
    summary: env.result?.summary,
    producer,
  };
}

export function listEvidence({ limit = 20, producers = null } = {}) {
  try {
    const want = producers
      ? new Set(
          (Array.isArray(producers) ? producers : String(producers).split(','))
            .map((p) => p.trim())
            .filter(Boolean),
        )
      : null;
    const files = fs
      .readdirSync(EVIDENCE_DIR)
      .filter((f) => f.endsWith('.json') && !f.startsWith('latest-'))
      .map((f) => {
        const st = fs.statSync(path.join(EVIDENCE_DIR, f));
        const producer = f.split('-')[0] || 'unknown';
        return { file: f, mtimeMs: st.mtimeMs, producer, ageSec: Math.round((Date.now() - st.mtimeMs) / 1000) };
      })
      .filter((x) => !want || want.has(x.producer) || [...want].some((p) => x.file.startsWith(p + '-')))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit);
    return files;
  } catch {
    return [];
  }
}

/** Latest seal per producer name */
export function listProducers(names = ['truth', 'review', 'demand', 'smoke', 'selftest', 'ship-prepare', 'ship-run']) {
  return names.map((p) => {
    const st = refuseIfStale(p);
    return { producer: p, ...st };
  });
}

// CLI
const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const cmd = process.argv[2] || 'list';
  if (cmd === 'list' || cmd === 'ls') {
    const pIdx = process.argv.indexOf('--producers');
    const producers = pIdx >= 0 ? process.argv[pIdx + 1] : null;
    const limIdx = process.argv.indexOf('--limit');
    const limit = limIdx >= 0 ? Number(process.argv[limIdx + 1]) || 20 : 20;
    console.log(JSON.stringify({ dir: EVIDENCE_DIR, items: listEvidence({ limit, producers }) }));
  } else if (cmd === 'producers' || cmd === 'ls-producers') {
    const names = (process.argv[3] || 'truth,review,demand,smoke,selftest').split(',');
    console.log(JSON.stringify({ producers: listProducers(names) }, null, 2));
    process.exit(listProducers(names).some((p) => p.green) ? 0 : 1);
  } else if (cmd === 'show') {
    const id = process.argv[3];
    console.log(JSON.stringify(loadEvidence(id), null, 2));
  } else if (cmd === 'fresh') {
    const producer = process.argv[3] || 'truth';
    console.log(JSON.stringify(refuseIfStale(producer), null, 2));
    process.exit(refuseIfStale(producer).green ? 0 : 1);
  } else {
    console.error('usage: list|ls [--producers a,b] | producers [a,b,c] | show <runId> | fresh [producer]');
    process.exit(2);
  }
}
