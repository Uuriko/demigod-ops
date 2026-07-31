#!/usr/bin/env node
// demigod-abstention-ledger.mjs carries a thorough --selftest, but --selftest modules only run via
// demigod-verify-all.mjs and this one is not registered there yet. So it was in NO gate: invisible to
// the *.test.mjs sweep and absent from verify-all. A module I wrote, guarding a measurement, running
// in nothing — exactly the gap I have spent the day finding in other people's checks.
// This puts it in the sweep now, asserting the properties a future edit is most likely to break.
import assert from 'node:assert/strict';
import { abstentionLedger, isValidAbstentionReason, ABSTENTION_REASONS, UNSTATED } from './demigod-abstention-ledger.mjs';

const unknown = (reason) => ({
  status: 'unknown', value: null, url: null, quote: null,
  ...(reason ? { unknownReason: reason } : {}),
});
const answered = { status: 'supported', value: 'v', url: 'https://e.example/a', quote: 'words' };
const row = (id, pricing) => ({ id, fields: { pricingStatus: pricing } });

// The closed set is closed. A new category is a decision, not a string someone types.
assert.deepEqual(ABSTENTION_REASONS, ['not_applicable', 'not_found', 'unresolved']);
assert.equal(isValidAbstentionReason('not_found'), true);
for (const bad of ['NOT_FOUND', 'not found', 'unknown', '', null, undefined, 0, 'category_error']) {
  assert.equal(isValidAbstentionReason(bad), false, `${JSON.stringify(bad)} must not be a valid reason`);
}

// An abstention with no reason must read as `unstated`, never vanish. Today's real state is 8/8
// unstated, so if this ever silently reported 0 the ledger would claim we explain our refusals.
{
  const l = abstentionLedger({ companies: [row('a', unknown()), row('b', unknown())] });
  assert.equal(l.abstentions, 2);
  assert.equal(l.unstated, 2);
  assert.equal(l.stated, 0);
  assert.equal(l.byField.pricingStatus[UNSTATED], 2);
}

// THE LOAD-BEARING RULE: only not_applicable may leave the denominator. If not_found ever escaped,
// "we did not look hard enough" would inflate coverage — the exact dishonesty this measures against.
{
  const l = abstentionLedger({
    companies: [row('a', unknown('not_found')), row('b', unknown('not_found')), row('c', answered), row('d', answered)],
  });
  const a = l.adjusted.pricingStatus;
  assert.equal(a.rawCoverage, 0.5);
  assert.equal(a.coverageExcludingCategoryErrors, 0.5, 'not_found must NOT lift coverage');
  assert.equal(a.categoryErrorsExcluded, 0);
}
{
  const l = abstentionLedger({ companies: [row('a', unknown('not_applicable')), row('b', answered)] });
  const a = l.adjusted.pricingStatus;
  assert.equal(a.rawCoverage, 0.5);
  assert.equal(a.coverageExcludingCategoryErrors, 1, 'a category error leaves the denominator');
  assert.equal(a.categoryErrorsExcluded, 1);
}

// An unrecognised code is a data error: surfaced, and never counted as an explanation.
{
  const l = abstentionLedger({ companies: [row('a', unknown('because_reasons'))] });
  assert.equal(l.stated, 0, 'an invalid code is not an explanation');
  assert.equal(l.unstated, 1);
  assert.deepEqual(l.invalidReasons.map((r) => r.field), ['pricingStatus']);
  assert.equal(l.adjusted.pricingStatus.categoryErrorsExcluded, 0, 'and cannot leave the denominator');
}

// Buckets must partition the total exactly — no claim counted twice, none dropped.
{
  const l = abstentionLedger({
    companies: [
      row('a', unknown('not_applicable')), row('b', unknown('not_found')),
      row('c', unknown('unresolved')), row('d', unknown()), row('e', answered),
    ],
  });
  const c = l.byField.pricingStatus;
  assert.equal(ABSTENTION_REASONS.reduce((n, r) => n + c[r], 0) + c[UNSTATED], c.total);
  assert.equal(l.stated + l.unstated, l.abstentions);
}

// Malformed input yields an empty ledger rather than throwing — a reporting tool must not be able
// to take down a caller that hands it a bad doc.
for (const bad of [null, undefined, {}, { companies: null }, { companies: 'x' }, { companies: [null, undefined] }]) {
  const l = abstentionLedger(bad);
  assert.equal(l.abstentions, 0);
  assert.equal(l.companies, 0, 'a malformed row must not be counted as a company');
  assert.ok(l.byField.pricingStatus, 'every field is reported even with no data');
}
// Regression: malformed rows must not enter the coverage DENOMINATOR. This module reported
// companies:2 for [null, null] until 2026-07-30, which would understate coverage — the exact
// dishonesty an abstention ledger exists to prevent.
{
  const l = abstentionLedger({ companies: [null, row('a', answered), undefined, 'nope'] });
  assert.equal(l.companies, 1, 'only the one real row counts');
  assert.equal(l.adjusted.pricingStatus.rawCoverage, 1, 'coverage is 1/1, not 1/4');
}

console.log('abstention ledger: all cases PASS');
