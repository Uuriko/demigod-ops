#!/usr/bin/env node
/**
 * Abstention ledger — reports what the research pipeline REFUSED to answer, and why.
 *
 *   node demigod-abstention-ledger.mjs            # ledger over the frozen gold
 *   node demigod-abstention-ledger.mjs --json
 *   node demigod-abstention-ledger.mjs --selftest
 *
 * INNOVATION mechanism #5. I had recorded that as "already ours"; it was not — the gold carries 8
 * `unknown` claims and zero reason codes, because the grader requires an unknown's value/url/quote
 * to be null. This module measures the gap instead of asserting it away, and it does NOT change the
 * grader's contract: `unknownReason` is read when present and its absence is reported as `unstated`.
 *
 * The taxonomy is DERIVED, not invented. An earlier draft of mine listed six plausible-sounding
 * codes; none survived contact with data. These three came out of classifying the seven real
 * pricing abstentions on-site (Grok, 2026-07-29):
 *   not_applicable — the field is a category error for this company (real estate has no "pricing")
 *   not_found      — the field applies and exists, but is unpublished; an ordinary coverage miss
 *   unresolved     — a prior question blocks it (no company URL, or an identity conflict)
 * A fourth state is structural, not a judgement: `unstated` means nobody recorded a reason.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPANY_RESEARCH_FIELDS, UNKNOWN_CLAIM_REASONS } from './demigod-evidence.mjs';
import { isPlainObject } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Closed set — single SoR is UNKNOWN_CLAIM_REASONS on the grader. Outside = data error. */
export const ABSTENTION_REASONS = UNKNOWN_CLAIM_REASONS;
export const UNSTATED = 'unstated';

/** True only for a reason inside the closed set. Unknown strings are invalid, not extensions. */
export function isValidAbstentionReason(reason) {
  return ABSTENTION_REASONS.includes(reason);
}

/**
 * PURE. Ledger over a benchmark/catalog doc.
 * `not_applicable` is the load-bearing distinction: it is NOT a coverage miss, because the question
 * does not apply to that company. Reporting it separately is what stops a category error depressing
 * a field's coverage — measured for `pricingStatus`, which sits at 23/30 partly for that reason.
 */
export function abstentionLedger(doc = {}) {
  // Only usable rows count. A null/non-object entry is malformed data, and counting it would put it
  // in the coverage DENOMINATOR — understating coverage for a tool whose entire purpose is an honest
  // denominator. Caught by reading this module's own output, 2026-07-30.
  const rows = (Array.isArray(doc?.companies) ? doc.companies : []).filter(isPlainObject);
  const byField = {};
  const invalid = [];
  for (const field of COMPANY_RESEARCH_FIELDS) {
    const counts = { total: 0, [UNSTATED]: 0 };
    for (const reason of ABSTENTION_REASONS) counts[reason] = 0;
    for (const row of rows) {
      const claim = row?.fields?.[field];
      if (!claim || claim.status !== 'unknown') continue;
      counts.total += 1;
      const stated = claim.unknownReason;
      if (stated == null || stated === '') {
        counts[UNSTATED] += 1;
      } else if (isValidAbstentionReason(stated)) {
        counts[stated] += 1;
      } else {
        counts[UNSTATED] += 1;
        invalid.push({ id: row.id ?? null, field, reason: String(stated).slice(0, 60) });
      }
    }
    byField[field] = counts;
  }
  const abstentions = Object.values(byField).reduce((sum, c) => sum + c.total, 0);
  const stated = Object.values(byField).reduce(
    (sum, c) => sum + ABSTENTION_REASONS.reduce((n, r) => n + c[r], 0),
    0,
  );
  // Coverage excluding category errors: the honest denominator. Reported per field, never applied
  // to the grader — changing what the grader accepts is a separate, deliberate decision.
  const adjusted = {};
  for (const field of COMPANY_RESEARCH_FIELDS) {
    const c = byField[field];
    const answered = rows.length - c.total;
    const denominator = rows.length - c.not_applicable;
    adjusted[field] = {
      rawCoverage: rows.length ? Number((answered / rows.length).toFixed(4)) : 0,
      coverageExcludingCategoryErrors:
        denominator > 0 ? Number((answered / denominator).toFixed(4)) : 0,
      categoryErrorsExcluded: c.not_applicable,
    };
  }
  return {
    schema: 'demigod.abstention-ledger/1',
    companies: rows.length,
    abstentions,
    stated,
    unstated: abstentions - stated,
    byField,
    adjusted,
    invalidReasons: invalid,
  };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const row = (id, reason) => ({
    id,
    fields: Object.fromEntries(COMPANY_RESEARCH_FIELDS.map((f) => [
      f,
      f === 'pricingStatus'
        ? { status: 'unknown', value: null, url: null, quote: null, ...(reason ? { unknownReason: reason } : {}) }
        : { status: 'supported', value: 'v', url: 'https://e.example/a', quote: 'words' },
    ])),
  });

  // An empty doc must not invent abstentions.
  const empty = abstentionLedger({});
  assert(empty.abstentions === 0 && empty.companies === 0, 'empty doc is empty');
  assert(empty.byField.pricingStatus.total === 0, 'every field is present even at zero');

  // Today's real shape: abstentions with no reason recorded must read as `unstated`, never as 0.
  const bare = abstentionLedger({ companies: [row('a'), row('b')] });
  assert(bare.abstentions === 2 && bare.unstated === 2 && bare.stated === 0, 'unstated is counted, not dropped');
  assert(bare.byField.pricingStatus.unstated === 2, 'per-field unstated');

  // A stated reason lands in its own bucket and only its own bucket.
  const mixed = abstentionLedger({
    companies: [row('a', 'not_applicable'), row('b', 'not_found'), row('c', 'unresolved'), row('d')],
  });
  assert(mixed.stated === 3 && mixed.unstated === 1, 'stated vs unstated split');
  const c = mixed.byField.pricingStatus;
  assert(c.not_applicable === 1 && c.not_found === 1 && c.unresolved === 1 && c[UNSTATED] === 1, 'one per bucket');
  assert(ABSTENTION_REASONS.reduce((n, r) => n + c[r], 0) + c[UNSTATED] === c.total, 'buckets sum to total');

  // A reason outside the closed set is a DATA ERROR: reported, and not silently accepted as a code.
  const rogue = abstentionLedger({ companies: [row('a', 'because_reasons')] });
  assert(rogue.stated === 0, 'an invalid code is not stated');
  assert(rogue.unstated === 1, 'and falls back to unstated');
  assert(rogue.invalidReasons.length === 1 && rogue.invalidReasons[0].field === 'pricingStatus', 'invalid codes are named');
  assert(!isValidAbstentionReason('because_reasons') && isValidAbstentionReason('not_found'), 'closed set');

  // The load-bearing arithmetic: only not_applicable may leave the denominator.
  const adj = abstentionLedger({
    companies: [row('a', 'not_applicable'), row('b', 'not_found'), row('c', 'not_found'), row('d', 'not_found')],
  }).adjusted.pricingStatus;
  assert(adj.rawCoverage === 0, 'four of four abstained');
  assert(adj.categoryErrorsExcluded === 1, 'one category error');
  assert(adj.coverageExcludingCategoryErrors === 0, 'a not_found never leaves the denominator');
  const half = abstentionLedger({
    companies: [row('a', 'not_applicable'), { id: 'b', fields: { pricingStatus: { status: 'supported', value: 'x', url: 'https://e.example', quote: 'w' } } }],
  }).adjusted.pricingStatus;
  assert(half.rawCoverage === 0.5 && half.coverageExcludingCategoryErrors === 1, 'excluding the category error lifts 0.5 to 1.0');

  // Malformed input refuses rather than throwing.
  for (const bad of [null, undefined, { companies: null }, { companies: 'x' }, { companies: [null] }]) {
    assert(abstentionLedger(bad).abstentions === 0, 'malformed doc yields an empty ledger');
  }

  console.log(JSON.stringify({ ok: true, selftest: 'abstention-ledger' }));
  process.exit(0);
}

if (isMain) {
  const file = path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json');
  let doc = {};
  let corpusAbsent = false;
  try {
    doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    // Project loader standard: default only on ENOENT. The old bare `catch {}` also swallowed a
    // truncated or unparseable corpus and printed "0 companies · 0 abstentions" — a clean bill of
    // health for a subject that was never read. A missing corpus still defaults, but says so.
    if (error?.code !== 'ENOENT') throw error;
    corpusAbsent = true;
  }
  const ledger = abstentionLedger(doc);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...ledger, corpusAbsent }, null, 2));
    process.exit(corpusAbsent ? 2 : 0);
  }
  if (corpusAbsent) {
    console.error(`abstention ledger: no research corpus at ${file} — zeros below have no subject`);
    process.exit(2);
  }
  console.log(`abstention ledger · ${ledger.companies} companies · ${ledger.abstentions} abstentions (${ledger.stated} stated, ${ledger.unstated} unstated)`);
  for (const [field, c] of Object.entries(ledger.byField)) {
    if (!c.total) continue;
    const a = ledger.adjusted[field];
    console.log(
      `  ${field.padEnd(17)} ${String(c.total).padStart(2)} abstentions · ` +
      ABSTENTION_REASONS.map((r) => `${r}=${c[r]}`).join(' ') + ` ${UNSTATED}=${c[UNSTATED]}` +
      ` · coverage ${a.rawCoverage} → ${a.coverageExcludingCategoryErrors} excluding category errors`,
    );
  }
  if (ledger.invalidReasons.length) {
    console.log(`  invalid reason codes: ${ledger.invalidReasons.map((r) => `${r.id}:${r.field}=${r.reason}`).join(', ')}`);
  }
  if (ledger.unstated === ledger.abstentions && ledger.abstentions > 0) {
    console.log('  note: no abstention carries a reason yet — the grader requires unknown value/url/quote to be null,');
    console.log('        so permitting an optional unknownReason is the one change that makes this ledger informative.');
  }
}
