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
import { isIP } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
// Prefer DEMIGOD_BUSY (same as export/sourcer); keep DG_BUSY as legacy alias.
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
export const EVIDENCE_DIR = path.join(BUSY, 'evidence');

export const COMPANY_RESEARCH_FIELDS = [
  'canonicalCompany',
  'productSummary',
  'productCategory',
  'likelyBuyer',
  'pricingStatus',
];

// Optional closed-enum reasons on status:'unknown' claims (mechanism #5 / abstention ledger).
// Absence remains valid — the ledger reports that as `unstated`. Do not invent codes here;
// taxonomy came from classifying the seven real pricing abstentions on-site (2026-07-29).
export const UNKNOWN_CLAIM_REASONS = ['not_applicable', 'not_found', 'unresolved'];

export function safeResearchUrl(value) {
  try {
    const raw = String(value);
    if (raw.length > 2048) return null;
    const url = new URL(raw);
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const policyHost = host.replace(/\.$/, '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !host) return null;
    if (
      policyHost === 'localhost' ||
      policyHost.endsWith('.localhost') ||
      policyHost.endsWith('.local') ||
      policyHost.endsWith('.internal') ||
      policyHost.endsWith('.lan') ||
      isIP(policyHost)
    ) return null;
    return url.href;
  } catch {
    return null;
  }
}

const round = (value) => Math.round(value * 1000) / 1000;

export function gradeResearchBenchmark(doc = {}) {
  const rows = Array.isArray(doc.companies) ? doc.companies : [];
  const thresholds = {
    usableCoverage: Number(doc.thresholds?.usableCoverage ?? 0.9),
    evidenceSupport: Number(doc.thresholds?.evidenceSupport ?? 0.95),
  };
  const errors = [];
  if (thresholds.usableCoverage !== 0.9 || thresholds.evidenceSupport !== 0.95) {
    errors.push('benchmark thresholds must remain 0.9 usableCoverage and 0.95 evidenceSupport');
  }
  if (rows.length !== 30) errors.push(`expected 30 companies, got ${rows.length}`);
  if (new Set(rows.map((row) => row.id)).size !== rows.length) errors.push('company ids must be unique');

  const fields = {};
  for (const fieldName of COMPANY_RESEARCH_FIELDS) {
    const counts = { supported: 0, conflict: 0, unknown: 0, invalid: 0, evidenced: 0 };
    for (const row of rows) {
      const field = row.fields?.[fieldName];
      if (!field || !['supported', 'conflict', 'unknown'].includes(field.status)) {
        counts.invalid++;
        errors.push(`${row.id || '?'}:${fieldName} has invalid status`);
        continue;
      }
      counts[field.status]++;
      if (field.status === 'unknown') {
        if (field.value != null || field.url != null || field.quote != null) {
          errors.push(`${row.id}:${fieldName} unknown must have null value/url/quote`);
        }
        // Optional reason: closed enum only. Existing all-null unknowns stay valid.
        const reason = field.unknownReason;
        if (reason != null && reason !== '' && !UNKNOWN_CLAIM_REASONS.includes(reason)) {
          errors.push(
            `${row.id}:${fieldName} unknownReason must be ${UNKNOWN_CLAIM_REASONS.join('|')}`,
          );
        }
        continue;
      }
      // unknownReason is only meaningful on unknowns; a supported/conflict claim carrying one is
      // noise that can confuse ledger readers. Reject rather than ignore (Claude audit A1).
      if (field.unknownReason != null && field.unknownReason !== '') {
        errors.push(`${row.id}:${fieldName} unknownReason only valid when status is unknown`);
      }
      if (!String(field.value || '').trim()) errors.push(`${row.id}:${fieldName} needs a value`);
      if (!safeResearchUrl(field.url) || !String(field.quote || '').trim()) {
        errors.push(`${row.id}:${fieldName} needs public quoted evidence`);
      } else if (String(field.quote).trim().split(/\s+/).length > 20) {
        errors.push(`${row.id}:${fieldName} quote exceeds 20 words`);
      } else {
        counts.evidenced++;
      }
    }
    const claims = counts.supported + counts.conflict;
    const usableCoverage = rows.length ? claims / rows.length : 0;
    const evidenceSupport = claims ? counts.evidenced / claims : 0;
    fields[fieldName] = {
      ...counts,
      usableCoverage: round(usableCoverage),
      evidenceSupport: round(evidenceSupport),
      pass: usableCoverage >= thresholds.usableCoverage && evidenceSupport >= thresholds.evidenceSupport,
    };
  }
  return {
    thresholds,
    companyCount: rows.length,
    fields,
    acceptedFields: COMPANY_RESEARCH_FIELDS.filter((field) => fields[field].pass),
    errors,
  };
}

export function projectCompanyResearch({
  companyId,
  benchmark = {},
  catalog = {},
} = {}) {
  const grade = gradeResearchBenchmark(benchmark);
  if (grade.errors.length) return null;
  if (catalog == null || typeof catalog !== 'object' || Array.isArray(catalog) ||
      (Object.hasOwn(catalog, 'companies') && !Array.isArray(catalog.companies))) return null;
  // A null entry inside the array THREW here (`null.id`) instead of failing closed — the same shape
  // as the Phase 2 gate's null-inbox crash. A module documented fail-closed must refuse malformed
  // input, never crash a caller that did not wrap it. Found 2026-07-30 by asserting a boundary I had
  // been about to write as a prose comment.
  const rowsOf = (value) => (Array.isArray(value) ? value : [])
    .filter((candidate) => candidate && typeof candidate === 'object' && candidate.id === companyId);
  const catalogRows = rowsOf(catalog.companies);
  const benchmarkRows = rowsOf(benchmark.companies);
  if (catalogRows.length > 1 || (!catalogRows.length && benchmarkRows.length !== 1)) return null;
  const row = catalogRows[0] || benchmarkRows[0];
  const source = catalogRows.length ? 'catalog' : 'benchmark';
  const sourceDoc = catalogRows.length ? catalog : benchmark;
  const fields = {};
  for (const name of grade.acceptedFields) {
    const field = row.fields?.[name];
    if (!field || field.status === 'unknown') continue;
    const quote = String(field.quote || '').trim();
    if (
      !['supported', 'conflict'].includes(field.status) ||
      !String(field.value || '').trim() ||
      !safeResearchUrl(field.url) ||
      !quote ||
      quote.split(/\s+/).length > 20
    ) continue;
    fields[name] = {
      value: field.value,
      status: field.status,
      evidence: { url: field.url, quote: field.quote },
    };
  }
  return {
    status: Object.values(fields).some((field) => field.status === 'conflict')
      ? 'verified_with_conflict'
      : Object.keys(fields).length ? 'verified' : 'unknown',
    source,
    researchedAt: row.researchedAt || sourceDoc.researchedAt || null,
    acceptedFields: grade.acceptedFields,
    // Union, not "whichever row won". A catalog row shadows the gold row for FIELDS — that is the
    // documented widening guard's job — but quarantineHiring is a NARROWING the frozen gold applied,
    // and an operator-authored catalog row that simply omits the flag used to clear it. Downstream
    // (demigod-lead-sourcer abstains only on === true) that turned a quarantined company back into
    // an eligible partner lead. Either source asserting the quarantine keeps it (Claude, 2026-07-30).
    quarantineHiring: row.quarantineHiring === true || benchmarkRows[0]?.quarantineHiring === true,
    fields,
  };
}

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

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(EVIDENCE_DIR, 0o700);
  } catch {
    /* non-fatal on exotic FS */
  }
}

export function beginRun(producer, { scope = [], extraInputs = {} } = {}) {
  ensureEvidenceDir();
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
  // Most producers intentionally seal their final source state. A producer that never mutates
  // scope can pin the bytes it actually read; drift then fails red instead of silently rebinding
  // a green result to peer-written files at seal time.
  const currentFiles = hashFiles(run.scope.length ? run.scope : Object.keys(run.inputs?.files || {}));
  const pinnedFiles = run.inputs?.files && typeof run.inputs.files === 'object'
    ? run.inputs.files
    : {};
  const pinInputsAtStart = run.meta?.pinInputsAtStart === true;
  const inputDrift = pinInputsAtStart
    ? [...new Set([...Object.keys(pinnedFiles), ...Object.keys(currentFiles)])]
      .filter((file) => !pinnedFiles[file] || pinnedFiles[file] !== currentFiles[file])
    : [];
  sealed.inputsAtSeal = {
    files: pinInputsAtStart ? { ...pinnedFiles } : currentFiles,
  };
  if (inputDrift.length) {
    sealed.result = {
      ...sealed.result,
      pass: false,
      exit: 1,
      summary: 'inputs changed during run',
      inputDrift,
    };
  }
  const outPath = path.join(EVIDENCE_DIR, `${sealed.runId}.json`);
  const body = JSON.stringify(sealed, null, 2) + '\n';
  ensureEvidenceDir();
  atomicWrite(outPath, body, { mode: 0o600 });
  const latest = path.join(EVIDENCE_DIR, `latest-${sealed.producer}.json`);
  withFileLock(`${latest}.lock`, () => {
    const prev = loadEvidence(latest);
    const previousEndedAt = Date.parse(prev?.endedAt || '');
    const sealedEnded = Date.parse(sealed.endedAt);
    const previousStartedAt = Date.parse(prev?.startedAt || '');
    const sealedStartedAt = Date.parse(sealed.startedAt || '');
    // Older concurrent writer never rolls latest backward.
    if (
      Number.isFinite(previousEndedAt) &&
      (previousEndedAt > sealedEnded ||
        (previousEndedAt === sealedEnded &&
          Number.isFinite(previousStartedAt) &&
          previousStartedAt > sealedStartedAt))
    ) return;
    // Do not demote a still-fresh green latest with a later red seal. Failed runs
    // still write their runId envelope; only latest is protected. (Clay: yahoo 404
    // reseal un-greened a good seal while transport was flaky, 2026-07-30.)
    if (
      prev?.result?.pass === true &&
      sealed.result?.pass !== true &&
      isFresh(prev).fresh
    ) {
      return;
    }
    atomicWrite(latest, body, { mode: 0o600 });
  });
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
  // Empty scope is clock-only "fresh" and indistinguishable from a real hash-bound seal.
  // Fail closed: producers must track ≥1 input (vacuous-scope + demand seal fixed 2026-07-30).
  if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length === 0) {
    return { fresh: false, reason: 'empty-scope' };
  }
  const mismatches = [];
  for (const [rel, sha] of Object.entries(files)) {
    // Null/empty hash at seal means the file was missing when sealed — do not
    // treat that as "skip forever". Creating the file later (or a corrupt seal)
    // must invalidate freshness (Claude acceptance P2, 2026-07-29).
    if (!sha) {
      mismatches.push({ file: rel, expected: sha || null, actual: sha256File(rel)?.slice(0, 12) || null });
      continue;
    }
    const now = sha256File(rel);
    if (now !== sha) mismatches.push({ file: rel, expected: sha?.slice(0, 12), actual: now?.slice(0, 12) });
  }
  if (mismatches.length) {
    return { fresh: false, reason: 'input-hash-mismatch', mismatches };
  }
  const ageMax = maxAgeSec ?? envelope.ttlSec ?? 3600;
  const ended = Date.parse(envelope.endedAt || envelope.at || envelope.startedAt || 0);
  if (!Number.isFinite(ended)) return { fresh: false, reason: 'invalid-timestamp' };
  // Future-dated envelope (clock skew): negative age silently passed the ttl check below. Reject it.
  if (Date.now() - ended < -60000) {
    return { fresh: false, reason: 'clock-skew', ageSec: Math.round((Date.now() - ended) / 1000) };
  }
  if (ageMax > 0 && Date.now() - ended > ageMax * 1000) {
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
