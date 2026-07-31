#!/usr/bin/env node
// Money-path coverage for the comp-range parser that gates matching (compAligned /
// compensationConflict decide who gets shown to whom). Run: node --test demigod-comp-range.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCompRange, compAligned } from './demigod-matching-engine.mjs';

test('annual k / plain / comma / currency forms', () => {
  assert.deepEqual(parseCompRange('$120k-$160k'), { unit: 'annual', min: 120000, max: 160000 });
  assert.deepEqual(parseCompRange('120-160k'), { unit: 'annual', min: 120000, max: 160000 });
  assert.deepEqual(parseCompRange('$150,000'), { unit: 'annual', min: 150000, max: 150000 });
  assert.deepEqual(parseCompRange('USD 140,000'), { unit: 'annual', min: 140000, max: 140000 });
  assert.deepEqual(parseCompRange('$130K–$170K'), { unit: 'annual', min: 130000, max: 170000 });
});

test('millions: M / MM / million are $1e6, not dropped as "no comp info"', () => {
  // regression: "$1.2M" used to return null (only k was handled) -> senior/exec roles
  // silently had no parseable comp, so they never comp-aligned and never flagged conflicts.
  assert.deepEqual(parseCompRange('$1.2M'), { unit: 'annual', min: 1200000, max: 1200000 });
  assert.deepEqual(parseCompRange('$1M'), { unit: 'annual', min: 1000000, max: 1000000 });
  assert.deepEqual(parseCompRange('1.5mm'), { unit: 'annual', min: 1500000, max: 1500000 });
  assert.deepEqual(parseCompRange('1.2 million'), { unit: 'annual', min: 1200000, max: 1200000 });
  assert.deepEqual(parseCompRange('1-1.2m'), { unit: 'annual', min: 1000000, max: 1200000 });
});

test('open-ended: up-to sets min 0, plus/from sets max Infinity', () => {
  assert.deepEqual(parseCompRange('up to 180k'), { unit: 'annual', min: 0, max: 180000 });
  const plus = parseCompRange('120k+');
  assert.equal(plus.min, 120000);
  assert.equal(plus.max, Infinity);
});

test('hourly stays hourly and never mixes units with annual', () => {
  assert.deepEqual(parseCompRange('$80/hr'), { unit: 'hourly', min: 80, max: 80 });
  assert.deepEqual(parseCompRange('80-100/hr'), { unit: 'hourly', min: 80, max: 100 });
  assert.equal(compAligned('$80/hr', '150000'), false); // hourly vs annual = not aligned
});

test('equity/percent noise is stripped; unparseable stays null (fail-safe)', () => {
  assert.deepEqual(parseCompRange('$200k + equity'), { unit: 'annual', min: 200000, max: 200000 });
  assert.deepEqual(parseCompRange('$200k plus equity'), { unit: 'annual', min: 200000, max: 200000 });
  // Leading equity cash grants must parse (public JD equity value bands).
  assert.deepEqual(parseCompRange('Equity $40k-$80k'), { unit: 'annual', min: 40000, max: 80000 });
  assert.deepEqual(parseCompRange('Equity grant valued at $40,000 to $80,000'), {
    unit: 'annual',
    min: 40000,
    max: 80000,
  });
  assert.equal(parseCompRange('competitive'), null);
  assert.equal(parseCompRange('market rate'), null);
  assert.equal(parseCompRange('negotiable'), null);
  assert.equal(parseCompRange('150'), null, 'a bare small number with no unit is ambiguous -> null');
  assert.equal(parseCompRange(''), null);
});

test('compAligned overlap logic, including million ranges', () => {
  assert.equal(compAligned('120-160k', '150000'), true);
  assert.equal(compAligned('120-160k', '200000'), false);
  assert.equal(compAligned('$1-1.2M', '1100k'), true);   // 1.1M candidate inside 1-1.2M role
  assert.equal(compAligned('$1-1.2M', '150000'), false); // 150k candidate below a $1M+ role
});
