import assert from 'node:assert/strict';
import {
  ZERO_POINT_SOURCES,
  buildPublicBoard,
  proposeAward,
  scoreProfile,
} from './dasha-simp-score.mjs';

const now = Date.parse('2026-08-16T18:00:00Z');
const day = 86_400_000;
const wallet = '11111111111111111111111111111111';
const signature = index => '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[index].repeat(88);
const donate = (amountUi, index, at = now) => ({
  kind: 'donate',
  amountUi,
  wallet,
  signature: signature(index),
  evidenceUrl: `https://www.getdasha.com/faucet/tx/${signature(index)}`,
  proven: true,
  at,
});
const profile = awards => ({ handle: 'donor', enrolledAt: now, awards });
const donatePoints = awards => scoreProfile(profile(awards), { now }).components.donate;

assert.equal(donatePoints([donate(100, 0)]), 10);
assert.equal(donatePoints([donate(250, 1)]), 20);
assert.equal(donatePoints([donate(99, 2)]), 0);
assert.equal(donatePoints(Array.from({ length: 11 }, (_, index) => donate(100, index, now - index * day))), 100);
assert.equal(donatePoints([donate(1_000, 12, now - 28 * day - 1)]), 0, 'donations older than 28 days must expire');

const first = proposeAward(profile([]), donate(100, 13), { now });
assert.equal(first.ok, true);
const duplicate = proposeAward(first.profile, donate(100, 13), { now: now + 1 });
assert.equal(duplicate.ok, false, 'a donation signature must only score once');

const publicRow = buildPublicBoard([first.profile], { now }).measured[0];
assert.equal(publicRow.components.donate, 10);
assert.doesNotMatch(JSON.stringify(publicRow), /"(?:wallet|signature|sig)"\s*:/i);

assert.equal(donatePoints([{ ...donate(10_000, 14), kind: 'payments' }]), 0);
assert.equal(donatePoints([{ ...donate(10_000, 15), kind: 'bag size' }]), 0);
assert(ZERO_POINT_SOURCES.includes('payments'));
assert(ZERO_POINT_SOURCES.includes('bag size'));

console.log('dasha simp donate score: math, rolling cap, dedupe, privacy, and zero-point kinds passed');
