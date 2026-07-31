import test from 'node:test';
import assert from 'node:assert/strict';
import { compAligned, parseCompRange } from './demigod-matching-engine.mjs';

test('compensation alignment compares normalized ranges with matching units', () => {
  for (const [role, candidate] of [
    ['$180-220k', '180k–220k + equity'],
    ['$180k–$220k', '$200k'],
    ['$180,000-$220,000', '$200,000'],
    ['$180,000-$220k', '$200k'],
    ['$90-$120/hr', '$100/hr'],
    ['up to $220k', '$180k'],
  ]) assert.equal(compAligned(role, candidate), true, `${role} <> ${candidate}`);

  for (const [role, candidate] of [
    ['$180-220k', '$18/hr'],
    ['$90/hr', '$90k'],
    ['$180-220k', '$250-300k'],
    ['$180-220k', 'negotiable'],
    ['$180-220k', '$1800/month'],
    ['$20k', '$180k base + $20k bonus'],
    ['$50/hr', '$90/hr, 40 hrs/week'],
  ]) assert.equal(compAligned(role, candidate), false, `${role} <> ${candidate}`);
});

test('compensation parser fails closed on vague or ambiguous text', () => {
  for (const value of ['', 'market', 'negotiable', '$90', '$1800/month']) assert.equal(parseCompRange(value), null, value);
  assert.deepEqual(parseCompRange('$180-220k + equity'), { unit: 'annual', min: 180000, max: 220000 });
  assert.deepEqual(parseCompRange('$180,000-$220k'), { unit: 'annual', min: 180000, max: 220000 });
  assert.deepEqual(parseCompRange('$90-$120/hr'), { unit: 'hourly', min: 90, max: 120 });
  assert.deepEqual(parseCompRange('$180k base + $20k bonus'), { unit: 'annual', min: 180000, max: 180000 });
  assert.deepEqual(parseCompRange('$90/hr, 40 hrs/week'), { unit: 'hourly', min: 90, max: 90 });
  assert.deepEqual(parseCompRange('$180k OTE, $160k base'), { unit: 'annual', min: 180000, max: 180000 });
});
