import assert from 'node:assert/strict';
import {
  ZERO_POINT_SOURCES,
  buildPublicBoard,
  donatePointsForAmount,
  proposeAward,
  scoreProfile,
} from './dasha-simp-score.mjs';

const now = Date.parse('2026-08-16T18:00:00Z');
const day = 86_400_000;
const wallet = '11111111111111111111111111111111';
const signature = index => '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[index % 57].repeat(88);
const evidenceUrl = sig => `https://www.getdasha.com/faucet/tx/${sig}`;
const sig = index => signature(index);
/* Input shape for proposeAward: on-chain raw amount + decimals (6 for $dasha). */
const donateInput = (dashaUi, index, at = now) => ({
  kind: 'donate',
  amountRaw: BigInt(dashaUi) * 10n ** 6n,
  decimals: 6,
  wallet,
  signature: sig(index),
  evidenceUrl: evidenceUrl(sig(index)),
  proven: true,
  at,
});
/* Stored award shape (module doc: points are computed once at verify time; the stored award carries
   points + tx evidence only — never amount, wallet, or balance). */
const storedDonate = (dashaUi, index, at = now) => ({
  kind: 'donate',
  points: donatePointsForAmount(BigInt(dashaUi) * 10n ** 6n, 6),
  signature: sig(index),
  evidenceUrl: evidenceUrl(sig(index)),
  at,
});
const profile = awards => ({ handle: 'donor', enrolledAt: now, awards });
const donatePoints = awards => scoreProfile(profile(awards), { now }).components.donate;

/* Contract (module doc, revision on the bus 2026-08-16 18:01Z): 1 point per 1,000 $dasha, floor
   1,000, 50 points per rolling 7 days. */
assert.equal(donatePointsForAmount(1_000n * 10n ** 6n, 6), 1);
assert.equal(donatePointsForAmount(999n * 10n ** 6n, 6), 0, '999 DASHA is below the 1,000 floor');
assert.equal(donatePointsForAmount(2_500n * 10n ** 6n, 6), 2);

assert.equal(donatePoints([storedDonate(1_000, 0)]), 1);
assert.equal(donatePoints([storedDonate(2_500, 1)]), 2);
assert.equal(donatePoints([storedDonate(999, 2)]), 0, 'floor: 999 DASHA earns nothing');
assert.equal(
  donatePoints(Array.from({ length: 60 }, (_, i) => storedDonate(1_000, i + 3, now))),
  50,
  'rolling cap: 60 × 1,000 DASHA today caps at 50'
);
assert.equal(
  donatePoints([storedDonate(1_000, 63, now - 8 * day)]),
  0,
  'donations older than the 7-day rolling window must expire'
);

/* Verify-time award: proposeAward computes points from the on-chain amount. */
const first = proposeAward(profile([]), donateInput(1_000, 13), { now });
assert.equal(first.ok, true);
assert.equal(first.award.points, 1);
assert.equal(first.after.components.donate, 1);
const duplicate = proposeAward(first.profile, donateInput(1_000, 13), { now: now + 1 });
assert.equal(duplicate.ok, false, 'a donation signature must only score once');

/* Privacy: the public board never exposes wallet/signature. */
const publicRow = buildPublicBoard([first.profile], { now }).measured[0];
assert.equal(publicRow.components.donate, 1);
assert.doesNotMatch(JSON.stringify(publicRow), /"(?:wallet|signature|sig)"\s*:/i);

/* Zero-point kinds never score, even with a large amount. */
assert.equal(donatePoints([{ ...storedDonate(10_000, 14), kind: 'payments' }]), 0);
assert.equal(donatePoints([{ ...storedDonate(10_000, 15), kind: 'bag size' }]), 0);
assert(ZERO_POINT_SOURCES.includes('payments'));
assert(ZERO_POINT_SOURCES.includes('bag size'));

console.log('dasha simp donate score: contract math, rolling cap, dedupe, privacy, and zero-point kinds passed');
