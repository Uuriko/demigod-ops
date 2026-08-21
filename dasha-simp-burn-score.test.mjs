import assert from 'node:assert/strict';
import {
  BURN_CAP_7D,
  BURN_POINTS_PER_UNIT,
  BURN_UNIT_DASHA,
  buildPublicBoard,
  burnPointsForAmount,
  creditBurn,
  rulesPublic,
  scoreProfile,
} from './dasha-simp-score.mjs';

const now = Date.parse('2026-08-21T00:00:00Z');
const day = 86_400_000;
const signature = index => '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[index].repeat(88);
const evidenceUrl = index => `https://www.getdasha.com/faucet/tx/${signature(index)}`;
const award = (dasha, index, at = now) => ({
  kind: 'burn',
  points: burnPointsForAmount(BigInt(dasha) * 10n ** 6n),
  evidenceUrl: evidenceUrl(index),
  at,
});
const points = awards => scoreProfile({ handle: 'burner', enrolledAt: now, awards }, { now }).components.burn;

assert.deepEqual([BURN_POINTS_PER_UNIT, BURN_UNIT_DASHA, BURN_CAP_7D], [1, 1000, 25]);
assert.equal(rulesPublic().burn.enabled, false, 'public rules must not advertise prepared burn scoring as live');
assert.match(rulesPublic().burn.note, /Prepared, not available/);
assert.equal(burnPointsForAmount(999n * 10n ** 6n), 0);
assert.equal(burnPointsForAmount(2_500n * 10n ** 6n), 2);
assert.equal(points(Array.from({ length: 30 }, (_, i) => award(1_000, i))), 25);
assert.equal(points([award(1_000, 31, now - 8 * day)]), 0);

const burned = creditBurn({}, { xId: '42', handle: 'burner' }, {
  signature: signature(32), amountRaw: 1_000n * 10n ** 6n, proven: true, at: now,
});
assert.equal(burned.ok, true);
assert.equal(burned.points, 1);
assert.equal(burned.burn, 1);
assert.equal(creditBurn(burned.store, { xId: '99', handle: 'other' }, {
  signature: signature(32), amountRaw: 1_000n * 10n ** 6n, proven: true, at: now,
}).error, 'duplicate signature');
assert.equal(creditBurn({}, { xId: '42', handle: 'burner' }, {
  signature: signature(33), amountRaw: 1_000n * 10n ** 6n, proven: false, at: now,
}).error, 'dest not proven');
assert.doesNotMatch(JSON.stringify(buildPublicBoard(Object.values(burned.store), { now }).measured[0]), /"(?:wallet|signature|sig)"\s*:/i);

console.log('dasha simp burn score: math, weekly cap, wallet proof, and public privacy passed');
