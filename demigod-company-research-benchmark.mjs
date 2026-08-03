#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite, isPlainObject, objectEntries, withFileLock } from './demigod-agent-tools-lib.mjs';
import {
  COMPANY_RESEARCH_FIELDS,
  addArtifact,
  beginRun,
  gradeResearchBenchmark,
  safeResearchUrl,
  sealRun,
  sha256File,
} from './demigod-evidence.mjs';
import { htmlToVisibleText } from './demigod-live-lib.mjs';
import { normalizeCompanyName } from './demigod-startup-atlas.mjs';

export {
  COMPANY_RESEARCH_FIELDS,
  gradeResearchBenchmark,
  projectCompanyResearch,
  safeResearchUrl,
} from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const DATA_PATH = path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json');
const EVIDENCE_MODULE_PATH = path.join(ROOT, 'demigod-evidence.mjs');
const PERF_CACHE_PATH = path.join(ROOT, 'demigod-perf-cache.mjs');
const LIVE_LIB_PATH = path.join(ROOT, 'demigod-live-lib.mjs');
const LEAD_COLLECT_PATH = path.join(ROOT, 'demigod-lead-collect.mjs');
const STARTUP_ATLAS_PATH = path.join(ROOT, 'demigod-startup-atlas.mjs');
const OUT_PATH = path.join(BUSY, 'company-research-benchmark.json');
const HISTORY_PATH = path.join(BUSY, 'company-research-source-history.json');
// Serialize history + seal publishes. Concurrent live runs (multi-agent unattended)
// otherwise read-reduce-write the same history file and the later writer drops the earlier.
const LOCK_PATH = path.join(BUSY, 'company-research-benchmark.lock');
const SEED = 'demigod-die-benchmark-v1';
export const EVIDENCE_TEXT_HASH_VERSION = 'quote-window-v1';

const sourceFamily = (company) =>
  company.source === 'Y Combinator' ? 'YC'
    : company.source === 'Wikidata' ? 'Wikidata'
      : company.source === 'Hacker News (Who is Hiring)' ? 'HN'
        : null;

export function selectBenchmarkCompanies(map = {}, seed = SEED) {
  const companies = Array.isArray(map.companies) ? map.companies : [];
  const nameCounts = new Map();
  for (const company of companies) {
    const key = normalizeCompanyName(company.name);
    if (key) nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  }
  const hash = (id) => crypto.createHash('sha256').update(`${seed}:${id}`).digest('hex');
  const eligible = companies.filter((company) =>
    sourceFamily(company) &&
    safeResearchUrl(company.website) &&
    nameCounts.get(normalizeCompanyName(company.name)) === 1);
  const selected = [];
  for (const source of ['YC', 'Wikidata', 'HN']) {
    for (const hasAts of [true, false]) {
      const rows = eligible
        .filter((company) =>
          sourceFamily(company) === source &&
          Boolean(company.atsSource && company.jobsUrl) === hasAts)
        .sort((a, b) => hash(a.id).localeCompare(hash(b.id)) || String(a.id).localeCompare(String(b.id)))
        .slice(0, 5);
      selected.push(...rows.map((company) => ({
        id: company.id,
        name: company.name,
        stratum: `${source} × ${hasAts ? 'ATS' : 'no-ATS'}`,
        website: company.website,
        sourceUrl: company.sourceUrl || null,
        jobsUrl: company.jobsUrl || null,
        selectionHash: hash(company.id).slice(0, 12),
      })));
    }
  }
  return selected;
}

export function sourceVerificationPass({ verifyLive, expectedClaims, sourceChecks = [], errors = [] }) {
  return Boolean(
    verifyLive &&
    expectedClaims > 0 &&
    sourceChecks.length === expectedClaims &&
    !sourceChecks.some((check) => !check.ok) &&
    !errors.length
  );
}

const SOURCE_RETRY_GAP_MS = 1500;
const sleepMs = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * One bounded retry on TRANSPORT failure only (non-2xx or throw) — never on a quote mismatch.
 * Measured 2026-07-30: the same press URL returned 200, then 404 twenty-nine seconds later,
 * then 200 again. One blip flipped `verificationPass` false for five claims and spent the paid
 * Firecrawl fallback, so the live gate was not reproducible. A retry that succeeds returns a
 * genuine live 2xx body which is quote-matched exactly as before; no integrity check is relaxed
 * and a still-failing source stays failed. `attempts` rides on the check so the receipt shows
 * the retry instead of hiding it.
 * ponytail: one retry, fixed gap — add backoff only if a real provider limit demands it.
 */
export async function fetchLiveSource(fetchOnce, sleep = sleepMs) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const result = await fetchOnce();
      if (result?.ok || attempt === 2) return { ...result, attempts: attempt };
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await sleep(SOURCE_RETRY_GAP_MS);
  }
}

/**
 * §3.8 diagnostic: verified claim whose latest transport failure is *after* last success.
 * Not a new product state — private history only. Count is 0 after any recovery fetch.
 */
export function isStaleVerifiedClaim(claim) {
  if (!claim || claim.currentState !== 'verified') return false;
  const lastOk = Date.parse(claim.lastVerifiedAt);
  const lastFail = Date.parse(claim.lastTransportFailureAt);
  return Number.isFinite(lastOk) && Number.isFinite(lastFail) && lastFail > lastOk;
}

/** §3.8 population query: verified, evidence-text stable, ever transport-flaky. */
export function isTextStableTransportFlaky(claim) {
  return (
    claim?.currentState === 'verified' &&
    (Number(claim.transportFailureCount) || 0) > 0 &&
    (Number(claim.textSha256ChangeCount) || 0) === 0 &&
    Boolean(claim.lastTextSha256)
  );
}

/** Claim identity: row + field + url + quote. URL/quote rotation mints a new id. */
export function claimIdFromCheck(check) {
  const rowId = String(check?.rowId || '').trim();
  const fieldName = String(check?.fieldName || '').trim();
  const url = safeResearchUrl(check?.url);
  const quote = normalizeText(check?.quote);
  if (
    !rowId ||
    rowId.length > 200 ||
    !COMPANY_RESEARCH_FIELDS.includes(fieldName) ||
    !url ||
    !quote
  ) {
    return null;
  }
  const quoteSha256 = crypto.createHash('sha256').update(quote).digest('hex');
  return {
    id: crypto
      .createHash('sha256')
      .update(`${rowId}\0${fieldName}\0${url}\0${quoteSha256}`)
      .digest('hex'),
    rowId,
    fieldName,
    url,
    quoteSha256,
  };
}

export function reduceSourceVerificationHistory(previous = {}, checks = [], at) {
  // Carry forward only object-shaped claims. A corrupt store whose claim VALUES are strings, arrays
  // or numbers survived structuredClone and was counted in counts.claims — inflating the very number
  // I have been quoting as evidence ("142 claims, 0 absent"), and landing junk in the state buckets
  // since they are computed from Object.values(claims). Sixth instance of the malformed-input class
  // found today (Claude, 2026-07-30).
  const priorClaims = previous?.schema === 'demigod.company-research-source-history/2'
    ? previous.claims
    : null;
  const carried = Object.fromEntries(objectEntries(priorClaims).filter(([, v]) => isPlainObject(v)));
  const claims = structuredClone(carried);
  const liveIds = new Set();
  const liveSlots = new Set();
  // Non-array checks: keep prior store (do not throw; empty live set skips prune).
  const batch = Array.isArray(checks) ? checks : [];
  for (const check of batch) {
    const parsed = claimIdFromCheck(check);
    if (!parsed) {
      // A check that names a real row+field but cannot mint an id (unsafe URL, empty quote) means
      // the GOLD is broken for that slot. Real concern: without touching the slot at all, the prior
      // claim sits there looking cleanly `verified` with no signal while the gold is broken.
      // MARK it, do not prune it. Licensing the rotation-delete here deleted the claim outright,
      // which zeroed staleVerified — the exact false green this store exists to surface — and let a
      // break-then-repair round trip launder firstVerifiedAt and transportFailureCount back to
      // clean. A transport failure is also the consistent reading: the identical check with a
      // mintable id (`ok:false, error:'unsafe_url'`) takes the transport branch below.
      // Real rotations still clean up: repairing to a DIFFERENT url mints a new id, adds the slot
      // to liveSlots, and the old claim prunes as a rotation orphan (Claude peer review 2026-07-30).
      const rowId = String(check?.rowId || '').trim();
      const fieldName = String(check?.fieldName || '').trim();
      if (rowId && rowId.length <= 200 && COMPANY_RESEARCH_FIELDS.includes(fieldName)) {
        for (const claim of Object.values(claims)) {
          if (claim.rowId !== rowId || claim.fieldName !== fieldName) continue;
          claim.lastAttemptAt = at;
          claim.lastTransportFailureAt = at;
          claim.transportFailureCount = (Number(claim.transportFailureCount) || 0) + 1;
        }
      }
      continue;
    }
    const { id, rowId, fieldName, url, quoteSha256 } = parsed;
    liveIds.add(id);
    liveSlots.add(`${rowId}\0${fieldName}`);
    const prior = claims[id] || {
      rowId,
      fieldName,
      url,
      quoteSha256,
      firstVerifiedAt: null,
      lastVerifiedAt: null,
      stoppedMatchingAt: null,
      lastStoppedMatchingAt: null,
      currentState: 'unknown',
      transportFailureCount: 0,
      sha256ChangeCount: 0,
      lastSha256ChangedAt: null,
      textSha256ChangeCount: 0,
      lastTextSha256ChangedAt: null,
    };
    const next = { ...prior, lastAttemptAt: at };
    // Absence requires a real numeric HTTP status from fetch — never Number(string) coercion
    // (string '200' must stay transport-failure, not a false absence).
    const status = check.status;
    const httpOk =
      typeof status === 'number' &&
      Number.isInteger(status) &&
      status >= 200 &&
      status < 300;
    // Page-churn counter (INNOVATION 3.7). Mechanism #3 — refresh on change rather than on a
    // schedule — cannot be justified without knowing how often a source page actually changes,
    // and lastSha256 alone cannot answer it because each run overwrites the previous value.
    // Counted only on a SUCCESSFUL fetch that returned a hash differing from the stored one: a
    // first observation is not a change, a missing hash is not a change, and a transport failure
    // is never a change (it never reaches this).
    const noteHashChange = (
      fetched,
      lastKey,
      countKey,
      atKey,
      versionKey = null,
      fetchedVersion = null,
    ) => {
      // Backfill the counter on EVERY reduce, not only at claim creation. Claims that predate the
      // field carried `undefined`, which the 3.8 population query coerces to 0 — flattening
      // "never compared" into "compared and stable". Those are different facts (Claude loop 10).
      next[countKey] = Number(prior[countKey]) || 0;
      if (!fetched) return;
      // Changing the hash algorithm is a new baseline, not a page change.
      if (versionKey && fetchedVersion && prior[lastKey] && prior[versionKey] !== fetchedVersion) {
        next[lastKey] = fetched;
        next[versionKey] = fetchedVersion;
        return;
      }
      if (prior[lastKey] && prior[lastKey] !== fetched) {
        next[countKey] = (Number(prior[countKey]) || 0) + 1;
        next[atKey] = at;
      }
      next[lastKey] = fetched;
      if (versionKey && fetchedVersion) next[versionKey] = fetchedVersion;
    };
    const notePageChange = () => {
      // Two independent signals. sha256 is the response body and is dominated by noise (measured
      // 24/48 pages churning in 4h with every quote intact). textSha256 is the visible text and is
      // the one that means "the evidence moved". Keeping both makes the ratio observable over time
      // instead of a single-day anecdote.
      noteHashChange(check.sha256, 'lastSha256', 'sha256ChangeCount', 'lastSha256ChangedAt');
      noteHashChange(
        check.textSha256,
        'lastTextSha256',
        'textSha256ChangeCount',
        'lastTextSha256ChangedAt',
        'lastTextHashVersion',
        check.textHashVersion === EVIDENCE_TEXT_HASH_VERSION
          ? EVIDENCE_TEXT_HASH_VERSION
          : null,
      );
    };
    if (check.ok === true) {
      next.firstVerifiedAt ||= at;
      // Monotonic lastVerifiedAt (Claude §3.8 F1): do not let clock skew or
      // replayed older `at` widen the (lastVerifiedAt, stoppedMatchingAt] interval.
      next.lastVerifiedAt =
        prior.lastVerifiedAt && prior.lastVerifiedAt > at ? prior.lastVerifiedAt : at;
      next.lastCheckedAt = at;
      next.currentState = 'verified';
      if (next.stoppedMatchingAt) next.lastStoppedMatchingAt = next.stoppedMatchingAt;
      next.stoppedMatchingAt = null;
      notePageChange();
    } else if (
      !check.error &&
      !check.fallbackError &&
      httpOk
    ) {
      next.lastCheckedAt = at;
      next.currentState = 'absent';
      next.stoppedMatchingAt ||= at;
      notePageChange();
    } else {
      next.lastTransportFailureAt = at;
      next.transportFailureCount = (Number(next.transportFailureCount) || 0) + 1;
    }
    claims[id] = next;
  }
  // Drop ROTATION orphans only: a retired id whose (rowId, fieldName) slot is still checked this
  // run, i.e. the gold repointed the same claim at a new url/quote (Artifact yahoo→pymnts left 5
  // dead yahoo ids, 2026-07-30). Pruning on "absent from this run" instead was too wide: any
  // narrower batch — a gold shrink that marks fields `unknown`, a partial re-source — silently
  // deleted untouched history and reported staleVerified 0, which is the exact false green this
  // store exists to prevent. A vanished slot keeps its claim; it is a fact, not a ghost.
  for (const [id, claim] of Object.entries(claims)) {
    if (liveIds.has(id)) continue;
    if (liveSlots.has(`${claim.rowId}\0${claim.fieldName}`)) delete claims[id];
  }
  const values = Object.values(claims);
  return {
    schema: 'demigod.company-research-source-history/2',
    updatedAt: at,
    counts: {
      claims: values.length,
      verified: values.filter((claim) => claim.currentState === 'verified').length,
      absent: values.filter((claim) => claim.currentState === 'absent').length,
      unknown: values.filter((claim) => claim.currentState === 'unknown').length,
      // §3.8: verified + lastTransportFailureAt > lastVerifiedAt (latent silent-stale gap)
      staleVerified: values.filter((claim) => isStaleVerifiedClaim(claim)).length,
      // §3.8 kill population: text-stable + transport-flaky (evidence frozen, fetch flaky)
      textStableFlaky: values.filter((claim) => isTextStableTransportFlaky(claim)).length,
    },
    claims,
  };
}

// Exported so verification probes can share the EXACT normalisation instead of copying it.
// A probe with its own copy can silently diverge and produce a comfortable answer about the
// pipeline that is really an answer about the copy (Claude loop 9, 2026-07-29).
export const normalizeText = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&(?:ldquo|rdquo|quot);/gi, '"')
  .replace(/&(?:lsquo|rsquo);|&#(?:39|x27);/gi, "'")
  .replace(/&#(?:34|x22);/gi, '"')
  .replace(/\s+/g, ' ')
  .trim();

export function evidenceQuoteMatches(quote, visibleText, fallbackMarkdown = '') {
  const normalizedQuote = normalizeText(quote);
  return Boolean(
    normalizedQuote &&
    [visibleText, fallbackMarkdown].some((text) => normalizeText(text).includes(normalizedQuote))
  );
}

export function evidenceTextSha256(quote, httpText, fallbackText = '') {
  const normalizedQuote = normalizeText(quote);
  const sourceText = [httpText, fallbackText]
    .map(normalizeText)
    .find((text) => normalizedQuote && text.includes(normalizedQuote));
  if (!sourceText) return null;
  const quoteAt = sourceText.indexOf(normalizedQuote);
  // ponytail: fixed quote context avoids a selector/config system; widen only if real
  // qualification text is observed beyond 256 characters from an accepted quote.
  const scoped = sourceText.slice(
    Math.max(0, quoteAt - 256),
    quoteAt + normalizedQuote.length + 256,
  );
  return crypto.createHash('sha256').update(scoped).digest('hex');
}

/** Collapse repeated claim failures into stable source issues for this immutable run receipt. */
export function groupSourceFailures(checks = []) {
  const groups = new Map();
  for (const check of Array.isArray(checks) ? checks : []) {
    if (check?.ok === true) continue;
    const url = safeResearchUrl(check?.url) || 'unsafe-url';
    const status =
      Number.isInteger(check?.status) && check.status >= 100 && check.status <= 599
        ? check.status
        : null;
    // ponytail: exact bounded reason grouping; add volatile-token stripping only if real
    // request IDs are observed fragmenting one failure class.
    const reason = check?.error
      ? `fetch:${normalizeText(check.error).slice(0, 120)}`
      : check?.fallbackError
        ? `fallback:${normalizeText(check.fallbackError).slice(0, 120)}`
        : status && status >= 200 && status < 300
          ? 'quote-absent'
          : status
            ? `http:${status}`
            : 'unknown';
    const key = `${url}\0${reason}`;
    const issue = groups.get(key) || {
      fingerprint: crypto.createHash('sha256').update(key).digest('hex').slice(0, 16),
      url,
      reason,
      failureCount: 0,
      claims: new Set(),
    };
    issue.failureCount += 1;
    const rowId = String(check?.rowId || '').slice(0, 200);
    const fieldName = String(check?.fieldName || '').slice(0, 80);
    if (rowId && fieldName) issue.claims.add(`${rowId}:${fieldName}`);
    groups.set(key, issue);
  }
  return [...groups.values()]
    .map((issue) => ({
      ...issue,
      claims: [...issue.claims].sort(),
      claimCount: issue.claims.size,
    }))
    .sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
}

async function verifySources(doc) {
  const byUrl = new Map();
  for (const row of doc.companies || []) {
    for (const fieldName of COMPANY_RESEARCH_FIELDS) {
      const field = row.fields?.[fieldName];
      if (!field || field.status === 'unknown') continue;
      const url = safeResearchUrl(field.url);
      const quote = normalizeText(field.quote);
      if (!byUrl.has(url)) byUrl.set(url, { url, claims: [] });
      byUrl.get(url).claims.push({ rowId: row.id, fieldName, quote });
    }
  }
  const all = [...byUrl.values()];
  const results = [];
  const { cachedFetchText } = await import('./demigod-perf-cache.mjs');
  const leadCollect = await import('./demigod-lead-collect.mjs');
  // ponytail: fixed batches are enough for 30 rows; add a queue only if provider limits change.
  for (let offset = 0; offset < all.length; offset += 5) {
    const batch = await Promise.all(all.slice(offset, offset + 5).map(async (source) => {
      if (!source.url) return source.claims.map((claim) => ({ ...claim, url: source.url, ok: false, error: 'unsafe_url' }));
      try {
        const fetched = await fetchLiveSource(() =>
          cachedFetchText(source.url, { ttlMs: 86400000, timeoutMs: 25000, bust: true }));
        // Evidence-level content hash, separate from the response-body hash. Measured 2026-07-29:
        // 24/48 pages changed sha256 across 4 hours while all 142 quotes still matched, i.e. the
        // body hash tracks CSRF tokens, render timestamps and analytics nonces, not the evidence.
        // Hashing the VISIBLE TEXT gives a change signal that means "the evidence moved".
        const visibleText = normalizeText(htmlToVisibleText(fetched.text || ''));
        let transport = 'http';
        let fallbackError = null;
        let fallbackText = '';
        if (
          !fetched.ok ||
          source.claims.some((claim) => !evidenceQuoteMatches(claim.quote, visibleText))
        ) {
          const markdown = leadCollect.fcScrape(source.url);
          if (markdown) {
            fallbackText = normalizeText(markdown);
            transport = 'firecrawl';
          } else fallbackError = leadCollect.lastFcScrapeError;
        }
        return source.claims.map((claim) => ({
          ...claim,
          url: source.url,
          ok: evidenceQuoteMatches(
            claim.quote,
            fetched.ok ? visibleText : '',
            fallbackText,
          ),
          status: fetched.status,
          attempts: fetched.attempts,
          sha256: fetched.sha256,
          textSha256: evidenceTextSha256(
            claim.quote,
            fetched.ok ? visibleText : '',
            fallbackText,
          ),
          textHashVersion: EVIDENCE_TEXT_HASH_VERSION,
          transport,
          fallbackError,
        }));
      } catch (error) {
        return source.claims.map((claim) => ({
          ...claim,
          url: source.url,
          ok: false,
          error: String(error?.message || error),
        }));
      }
    }));
    results.push(...batch.flat());
  }
  return results;
}

/** PURE: what changed between the frozen gold ids and the ids the selector yields today.
 *  "ids/order do not match deterministic selection" is true but opaque: the frozen gold is
 *  validated against a selection recomputed from a MUTABLE map, so any legitimate map refresh
 *  can evict a row (Kabam lost its ATS marker and Dolls Kill took the slot). Naming the exact
 *  ids, with the stratum field that moved, is what separates "the map changed underneath us"
 *  from "someone hand-picked the 30" — the thing this check exists to prevent. */
export function describeSelectionDrift(actualIds = [], expectedIds = [], map = {}) {
  const describe = (id) => {
    const row = (map.companies || []).find((company) => company.id === id);
    if (!row) return `${id} (absent from map)`;
    return `${id} ${row.name} (atsSource=${row.atsSource ?? 'none'}, source=${row.source})`;
  };
  return {
    evicted: actualIds.filter((id) => !expectedIds.includes(id)).map(describe),
    admitted: expectedIds.filter((id) => !actualIds.includes(id)).map(describe),
    reorderedOnly:
      actualIds.length === expectedIds.length && actualIds.every((id) => expectedIds.includes(id)),
  };
}

/**
 * Pin gold+map at read; re-check before seal. Without this, a peer can rewrite
 * DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json (or the map) during the long verifySources window;
 * beginRun then hashes the new file while grade/checks came from the old one → green seal
 * for gold that was never graded (Claude history peer §2 residual, 2026-07-30).
 */
export function pinBenchmarkInputsAtRead(goldBytes, mapBytes) {
  if (!Buffer.isBuffer(goldBytes) || !goldBytes.length ||
      !Buffer.isBuffer(mapBytes) || !mapBytes.length) {
    throw new Error('benchmark_input_unreadable');
  }
  return {
    gold: crypto.createHash('sha256').update(goldBytes).digest('hex'),
    map: crypto.createHash('sha256').update(mapBytes).digest('hex'),
  };
}

export function assertBenchmarkInputsStable(atRead, hash = sha256File) {
  if (!atRead?.gold || !atRead?.map) throw new Error('benchmark_input_pin_missing');
  const goldNow = hash(DATA_PATH);
  const mapNow = hash(MAP_PATH);
  if (goldNow !== atRead.gold) throw new Error('benchmark_gold_changed_under_run');
  if (mapNow !== atRead.map) throw new Error('benchmark_map_changed_under_run');
  return true;
}

export async function runBenchmark({ verifyLive = true } = {}) {
  const run = verifyLive ? beginRun('company-research-benchmark', {
    scope: [
      MAP_PATH,
      DATA_PATH,
      EVIDENCE_MODULE_PATH,
      PERF_CACHE_PATH,
      LIVE_LIB_PATH,
      LEAD_COLLECT_PATH,
      STARTUP_ATLAS_PATH,
      fileURLToPath(import.meta.url),
    ],
  }) : null;
  const mapBytes = fs.readFileSync(MAP_PATH);
  const goldBytes = fs.readFileSync(DATA_PATH);
  const map = JSON.parse(mapBytes);
  const doc = JSON.parse(goldBytes);
  // Hash the exact bytes parsed above; re-reading here leaves a silent read→hash race.
  const inputsAtRead = pinBenchmarkInputsAtRead(goldBytes, mapBytes);
  if (run) {
    run.inputs.files[path.relative(ROOT, MAP_PATH).replace(/\\/g, '/')] = inputsAtRead.map;
    run.inputs.files[path.relative(ROOT, DATA_PATH).replace(/\\/g, '/')] = inputsAtRead.gold;
    // Benchmark never mutates its scope. A peer edit before the final seal must make this run red.
    run.meta.pinInputsAtStart = true;
  }
  const selected = selectBenchmarkCompanies(map, doc.selectionSeed || SEED);
  const expectedIds = selected.map((row) => row.id);
  const actualIds = (doc.companies || []).map((row) => row.id);
  const selectionMatches = expectedIds.length === 30 && expectedIds.every((id, index) => id === actualIds[index]);
  const selectionDrift = selectionMatches ? null : describeSelectionDrift(actualIds, expectedIds, map);
  const grade = gradeResearchBenchmark(doc);
  if (!selectionMatches) {
    grade.errors.push(
      selectionDrift.reorderedOnly
        ? 'dataset ids match deterministic selection but the order differs'
        : `dataset ids/order do not match deterministic selection — gold-only: [${selectionDrift.evicted.join('; ')}], selector-only: [${selectionDrift.admitted.join('; ')}]`,
    );
  }
  const expectedClaims = (doc.companies || []).reduce(
    (count, row) => count + COMPANY_RESEARCH_FIELDS.filter((name) => row.fields?.[name]?.status !== 'unknown').length,
    0,
  );
  const sourceChecks = verifyLive ? await verifySources(doc) : [];
  const sourceFailures = sourceChecks.filter((check) => !check.ok);
  const sourceIssues = groupSourceFailures(sourceFailures);
  const at = new Date().toISOString();
  const verificationPass = sourceVerificationPass({
    verifyLive,
    expectedClaims,
    sourceChecks,
    errors: grade.errors,
  });
  const benchmarkPass = COMPANY_RESEARCH_FIELDS.every((field) => grade.fields[field]?.pass);
  const outputCore = {
    at,
    verifyLive,
    selectionSeed: doc.selectionSeed || SEED,
    selectionMatches,
    selectionDrift,
    selected,
    grade,
    expectedClaims,
    sourceChecks,
    sourceFailureCount: sourceFailures.length,
    sourceIssueCount: sourceIssues.length,
    sourceIssues,
    benchmarkPass,
    verificationPass,
  };
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  const outputPath = verifyLive ? OUT_PATH : OUT_PATH.replace(/\.json$/, '-offline.json');

  // Offline: no shared history/seal — write and return without the live lock.
  if (!verifyLive) {
    assertBenchmarkInputsStable(inputsAtRead);
    const output = { ...outputCore, sourceHistory: null };
    atomicWrite(outputPath, JSON.stringify(output, null, 2) + '\n', { mode: 0o600 });
    return { ...output, evidencePath: null, outputPath };
  }

  // Live: lock history reduce + receipt write + seal so concurrent agents cannot
  // clobber each other's history mid-reduce or publish a seal that disagrees with
  // the history file the export later binds. Also re-assert gold/map bytes match
  // the pin taken before verifySources (seal scope race).
  return withFileLock(
    LOCK_PATH,
    () => {
      assertBenchmarkInputsStable(inputsAtRead);
      const previous = fs.existsSync(HISTORY_PATH)
        ? JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'))
        : {};
      const sourceHistory = reduceSourceVerificationHistory(previous, sourceChecks, at);
      atomicWrite(HISTORY_PATH, JSON.stringify(sourceHistory, null, 2) + '\n', { mode: 0o600 });
      const output = {
        ...outputCore,
        sourceHistory: {
          path: HISTORY_PATH,
          updatedAt: sourceHistory.updatedAt,
          counts: sourceHistory.counts,
        },
      };
      atomicWrite(outputPath, JSON.stringify(output, null, 2) + '\n', { mode: 0o600 });
      addArtifact(run, 'company-research-benchmark', outputPath);
      addArtifact(run, 'company-research-source-history', HISTORY_PATH);
      const envelope = sealRun(run, {
        pass: output.verificationPass,
        summary: `${grade.acceptedFields.length}/5 fields accepted; ${sourceChecks.length}/${expectedClaims} source checks ran; ${sourceFailures.length} failed (${sourceIssues.length} issues)`,
        acceptedFields: grade.acceptedFields,
        benchmarkPass: output.benchmarkPass,
        sourceIssues,
      });
      return { ...output, evidencePath: envelope._path, outputPath };
    },
    { timeoutMs: 120000 },
  );
}

async function selftest() {
  assert.equal(safeResearchUrl('http://127.0.0.1/private'), null);
  assert.equal(safeResearchUrl('http://[::ffff:127.0.0.1]/private'), null);
  assert.equal(safeResearchUrl('http://localhost./private'), null);
  assert.equal(safeResearchUrl('https://metadata.internal/private'), null);
  assert.equal(safeResearchUrl('https://printer.lan/private'), null);
  assert.equal(safeResearchUrl('http://[::127.0.0.1]/private'), null);
  assert.equal(safeResearchUrl('http://100.64.0.1/private'), null);
  assert.equal(safeResearchUrl('https://user:pass@example.com/'), null);
  assert.equal(safeResearchUrl(`https://example.com/${'x'.repeat(2049)}`), null);
  assert.equal(safeResearchUrl('https://example.com/a'), 'https://example.com/a');
  const supported = Object.fromEntries(COMPANY_RESEARCH_FIELDS.map((name) => [
    name,
    { value: name, status: 'supported', url: 'https://example.com/', quote: 'Example makes research useful.' },
  ]));
  const doc = {
    thresholds: { usableCoverage: 0.9, evidenceSupport: 0.95 },
    companies: Array.from({ length: 30 }, (_, index) => ({
      id: `c${index}`,
      fields: index < 27 ? { ...supported } : {
        ...supported,
        pricingStatus: { value: null, status: 'unknown', url: null, quote: null },
      },
    })),
  };
  const grade = gradeResearchBenchmark(doc);
  assert.deepEqual(grade.errors, []);
  assert.equal(grade.fields.canonicalCompany.pass, true);
  assert.equal(grade.fields.pricingStatus.usableCoverage, 0.9);
  assert.equal(grade.fields.pricingStatus.pass, true);
  doc.companies[0].fields.likelyBuyer = {
    value: 'wrong',
    status: 'conflict',
    url: 'https://example.com/',
    quote: 'Example makes research useful.',
  };
  assert.equal(gradeResearchBenchmark(doc).fields.likelyBuyer.evidenceSupport, 1);
  doc.companies[0].fields.productSummary = {
    value: null,
    status: 'unknown',
    url: 'https://example.com/',
    quote: null,
  };
  assert.match(gradeResearchBenchmark(doc).errors.join('\n'), /unknown must have null value\/url\/quote/);
  // Optional closed-enum unknownReason: valid codes + all-null absences stay green; junk codes red.
  doc.companies[0].fields.productSummary = {
    value: null, status: 'unknown', url: null, quote: null, unknownReason: 'not_found',
  };
  assert.deepEqual(gradeResearchBenchmark(doc).errors, [], 'valid unknownReason is accepted');
  doc.companies[0].fields.productSummary = {
    value: null, status: 'unknown', url: null, quote: null, unknownReason: 'invented_code',
  };
  assert.match(
    gradeResearchBenchmark(doc).errors.join('\n'),
    /unknownReason must be not_applicable\|not_found\|unresolved/,
  );
  doc.companies[0].fields.productSummary = {
    value: null, status: 'unknown', url: null, quote: null,
  };
  assert.deepEqual(gradeResearchBenchmark(doc).errors, [], 'missing unknownReason stays valid');
  // Supported claim must not carry unknownReason (ignored-as-cosmetic was a silent miss).
  doc.companies[0].fields.productSummary = {
    value: 'Agent tools',
    status: 'supported',
    url: 'https://example.com/',
    quote: 'Agent tools for builders',
    unknownReason: 'TOTAL-GARBAGE',
  };
  assert.match(
    gradeResearchBenchmark(doc).errors.join('\n'),
    /unknownReason only valid when status is unknown/,
  );
  doc.companies[0].fields.productSummary = {
    value: 'Agent tools',
    status: 'supported',
    url: 'https://example.com/',
    quote: 'Agent tools for builders',
  };
  assert.equal(sourceVerificationPass({
    verifyLive: false,
    expectedClaims: 1,
    sourceChecks: [{ ok: true }],
  }), false, 'offline grade is never live verification');
  assert.equal(sourceVerificationPass({
    verifyLive: true,
    expectedClaims: 1,
    sourceChecks: [],
  }), false, 'empty subject cannot pass');
  assert.equal(sourceVerificationPass({
    verifyLive: true,
    expectedClaims: 2,
    sourceChecks: [{ ok: true }],
  }), false, 'partial subject cannot pass');
  assert.equal(sourceVerificationPass({
    verifyLive: true,
    expectedClaims: 1,
    sourceChecks: [{ ok: true }],
  }), true, 'complete live subject passes');
  {
    const repeated = [
      {
        ok: false,
        status: 503,
        url: 'https://example.com/source',
        rowId: 'a',
        fieldName: 'productSummary',
      },
      {
        ok: false,
        status: 503,
        url: 'https://example.com/source',
        rowId: 'b',
        fieldName: 'likelyBuyer',
      },
    ];
    const issues = groupSourceFailures(repeated);
    assert.equal(issues.length, 1, 'same source failure collapses to one issue');
    assert.equal(issues[0].failureCount, 2);
    assert.equal(issues[0].claimCount, 2);
    assert.deepEqual(
      groupSourceFailures([...repeated].reverse()).map((issue) => issue.fingerprint),
      issues.map((issue) => issue.fingerprint),
      'fingerprint is stable across claim order',
    );
    assert.notEqual(
      groupSourceFailures([{ ...repeated[0], status: 429 }])[0].fingerprint,
      issues[0].fingerprint,
      'a different failure class is a different issue',
    );
    assert.deepEqual(
      groupSourceFailures(repeated.map((check) => ({ ...check, ok: true }))),
      [],
      'a recovered source emits no current issue',
    );
  }
  // Seal-scope race: gold/map pin must fail closed on drift (not seal against rewritten gold).
  {
    const goldBytes = Buffer.from('gold-v1');
    const mapBytes = Buffer.from('map-v1');
    const pin = pinBenchmarkInputsAtRead(goldBytes, mapBytes);
    const stable = new Map([[DATA_PATH, pin.gold], [MAP_PATH, pin.map]]);
    const hash = (p) => stable.get(p) || null;
    assert.equal(assertBenchmarkInputsStable(pin, hash), true);
    stable.set(DATA_PATH, 'GOLD-DRIFT');
    assert.throws(
      () => assertBenchmarkInputsStable(pin, hash),
      /benchmark_gold_changed_under_run/,
      'gold rewrite under run must refuse seal',
    );
    stable.set(DATA_PATH, pin.gold);
    stable.set(MAP_PATH, 'MAP-DRIFT');
    assert.throws(
      () => assertBenchmarkInputsStable(pin, hash),
      /benchmark_map_changed_under_run/,
      'map rewrite under run must refuse seal',
    );
    assert.throws(
      () => pinBenchmarkInputsAtRead(Buffer.alloc(0), mapBytes),
      /benchmark_input_unreadable/,
    );
    assert.throws(
      () => assertBenchmarkInputsStable({}, hash),
      /benchmark_input_pin_missing/,
    );
  }
  {
    const visibleText = htmlToVisibleText(
      '<script>script-only claim</script><div data-copy="attribute-only claim">Visible claim</div>',
    );
    assert.equal(evidenceQuoteMatches('Visible claim', visibleText), true);
    assert.equal(evidenceQuoteMatches('script-only claim', visibleText), false);
    assert.equal(evidenceQuoteMatches('attribute-only claim', visibleText), false);
    assert.equal(evidenceQuoteMatches('fallback claim', visibleText, 'fallback claim'), true);
  }
  {
    const rowId = 'c0';
    const fieldName = 'productSummary';
    const url = 'https://example.com/';
    const quote = 'Example makes research useful.';
    const first = reduceSourceVerificationHistory({}, [
      { rowId, fieldName, url, quote, ok: true, status: 200, sha256: 'a' },
    ], '2026-07-01T00:00:00.000Z');
    const changedQuote = reduceSourceVerificationHistory(first, [
      {
        rowId,
        fieldName,
        url,
        quote: 'Example now says something else.',
        ok: true,
        status: 200,
        sha256: 'b',
      },
    ], '2026-07-02T00:00:00.000Z');
    assert.equal(
      Object.keys(changedQuote.claims).length,
      1,
      'changed quotation starts a distinct claim history and prunes the retired quote id',
    );
    assert.notEqual(
      Object.keys(changedQuote.claims)[0],
      Object.keys(first.claims)[0],
      'retired quote id must not remain as the live key',
    );
    const failed = reduceSourceVerificationHistory(first, [
      {
        rowId,
        fieldName,
        url,
        quote,
        ok: false,
        status: 200,
        fallbackError: 'firecrawl_insufficient_credits',
      },
    ], '2026-07-03T00:00:00.000Z');
    const claim = Object.values(failed.claims)[0];
    assert.equal(claim.firstVerifiedAt, '2026-07-01T00:00:00.000Z');
    assert.equal(claim.lastVerifiedAt, '2026-07-01T00:00:00.000Z');
    assert.equal(claim.stoppedMatchingAt, null);
    assert.equal(claim.currentState, 'verified');
    assert.equal(claim.lastTransportFailureAt, '2026-07-03T00:00:00.000Z');
    assert.equal(failed.counts.verified, 1, 'fallback failure never manufactures decay');
    // §3.8 diagnostics must stay on the counts envelope (canary if dropped).
    for (const key of ['staleVerified', 'textStableFlaky']) {
      assert.equal(typeof first.counts[key], 'number', `counts.${key} required`);
      assert.equal(typeof failed.counts[key], 'number', `counts.${key} required after failure`);
    }
    assert.equal(failed.counts.staleVerified, 1, 'transport after verify surfaces staleVerified');
    const absent = reduceSourceVerificationHistory(failed, [
      { rowId, fieldName, url, quote, ok: false, status: 200, sha256: 'c' },
    ], '2026-07-04T00:00:00.000Z');
    const absentClaim = Object.values(absent.claims)[0];
    assert.equal(absentClaim.stoppedMatchingAt, '2026-07-04T00:00:00.000Z');
    assert.equal(absentClaim.currentState, 'absent');
    assert.equal(absent.counts.absent, 1, 'clean 2xx absence records decay');
    assert.equal(typeof absent.counts.staleVerified, 'number');
    assert.equal(typeof absent.counts.textStableFlaky, 'number');
  }
  {
    // Transport retry: a blip must not redden the receipt, a real failure must still fail,
    // and a quote mismatch must never buy a second fetch.
    const slept = [];
    const sleep = async (ms) => { slept.push(ms); };
    const run = (results) => {
      let calls = 0;
      return fetchLiveSource(async () => {
        const next = results[calls];
        calls += 1;
        if (next instanceof Error) throw next;
        return next;
      }, sleep);
    };
    const blip = await run([{ ok: false, status: 404 }, { ok: true, status: 200, text: 'x' }]);
    assert.equal(blip.ok, true, 'a transient non-2xx must be retried, not sealed as failure');
    assert.equal(blip.attempts, 2, 'the receipt must show the retry');
    assert.equal(slept.length, 1, 'exactly one gap between the two attempts');
    const dead = await run([{ ok: false, status: 404 }, { ok: false, status: 404 }]);
    assert.equal(dead.ok, false, 'a genuinely dead source must stay failed after the retry');
    assert.equal(dead.attempts, 2);
    const clean = await run([{ ok: true, status: 200, text: 'x' }, { ok: true, status: 500 }]);
    assert.equal(clean.attempts, 1, '2xx must not be refetched — quote mismatch is not a retry');
    const throwOnce = await run([new Error('ECONNRESET'), { ok: true, status: 200 }]);
    assert.equal(throwOnce.ok, true, 'a thrown transport error is retried too');
    await assert.rejects(
      run([new Error('ECONNRESET'), new Error('ECONNRESET')]),
      /ECONNRESET/,
      'a persistent throw must still propagate',
    );
  }
  const badCli = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), '--bogus'],
    { encoding: 'utf8' },
  );
  assert.equal(badCli.status, 2, 'unknown CLI flags fail before live verification');
  assert.match(badCli.stderr, /usage:/i);
  console.log('demigod company research benchmark: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const usage =
    'usage: node demigod-company-research-benchmark.mjs [--offline|--selftest|--help]';
  if (
    args.length > 1 ||
    (args[0] && !['--offline', '--selftest', '--help', '-h'].includes(args[0]))
  ) {
    console.error(usage);
    process.exit(2);
  }
  if (args[0] === '--help' || args[0] === '-h') {
    console.log(usage);
  } else if (args[0] === '--selftest') await selftest();
  else {
    const result = await runBenchmark({ verifyLive: args[0] !== '--offline' });
    const ok = result.verifyLive
      ? result.verificationPass
      : result.selectionMatches && !result.grade.errors.length;
    console.log(JSON.stringify({
      ok,
      mode: result.verifyLive ? 'live' : 'offline-grade-only',
      verificationPass: result.verificationPass,
      sourceChecks: `${result.sourceChecks.length}/${result.expectedClaims}`,
      benchmarkPass: result.benchmarkPass,
      acceptedFields: result.grade.acceptedFields,
      output: result.outputPath,
      evidence: result.evidencePath,
    }, null, 2));
    if (!ok) process.exitCode = 1;
  }
}
