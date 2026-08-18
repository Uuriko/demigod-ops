// Donate lane contract: 1 pt / 1,000 $dasha, floor 1,000, 50 / 7d, SIWS-proven wallet only, one credit per signature.
import assert from 'node:assert/strict';
import {
  DONATE_CAP_7D, DONATE_ROLLING_MS, donatePointsForAmount, isValidDonateEvidenceUrl, donateSigTaken,
  proposeAward, creditDonate, scoreProfile, buildPublicBoard, rulesPublic, assertPublicSafe, ZERO_POINT_SOURCES,
} from './dasha-simp-score.mjs';

const D6 = 1_000_000n; // 6-decimal mint
const SIG = (i) => 'sig'.padEnd(64, '1') + String(i).padStart(2, '1'); // base58 alphabet, 66 chars
const ev = (i) => `https://www.getdasha.com/faucet/tx/${SIG(i)}`;
const now = Date.parse('2026-08-16T18:00:00Z');
const profile = { xId: '1', handle: 'donor', enrolledAt: now - 1, awards: [] };

// math: whole units, raw+decimals, never floats
assert.equal(donatePointsForAmount(999n * D6), 0);
assert.equal(donatePointsForAmount(1000n * D6), 1);
assert.equal(donatePointsForAmount(2999n * D6), 2);
assert.equal(donatePointsForAmount(String(50_000n * D6)), 50);
assert.equal(donatePointsForAmount(-5), 0);
assert.equal(donatePointsForAmount(1000n * 10n ** 9n, 9), 1);

// evidence: our tx page only
assert(isValidDonateEvidenceUrl(ev(1)));
for (const bad of ['https://solscan.io/tx/' + SIG(1), 'http://www.getdasha.com/faucet/tx/' + SIG(1), 'https://www.getdasha.com/faucet/tx/0OIl', 'https://www.getdasha.com/faucet/tx/' + SIG(1) + '?x=1'])
  assert(!isValidDonateEvidenceUrl(bad), bad);

// award: proven only, amount → points, no amount/wallet stored
const donate = (p, i, amount, extra = {}) => proposeAward(p, { kind: 'donate', proven: true, amountRaw: amount * D6, evidenceUrl: ev(i), at: now - i * 1000, ...extra }, { now });
assert.equal(proposeAward(profile, { kind: 'donate', proven: false, amountRaw: 1000n * D6, evidenceUrl: ev(1), at: now }, { now }).error, 'dest not proven');
assert.equal(proposeAward(profile, { kind: 'donate', amountRaw: 1000n * D6, evidenceUrl: ev(1), at: now }, { now }).error, 'dest not proven');
assert.equal(donate(profile, 1, 999n).error, 'no points');
assert.equal(donate(profile, 1, 1000n, { evidenceUrl: 'https://solscan.io/tx/' + SIG(1) }).error, 'invalid evidence host');
assert.equal(donate(profile, 1, 1000n, { signature: SIG(2) }).error, 'evidence signature mismatch');
let r = donate(profile, 1, 1000n, { signature: SIG(1) });
assert.equal(r.ok, true);
assert.equal(r.after.components.donate, 1);
assert.deepEqual(Object.keys(r.award).sort(), ['at', 'evidenceUrl', 'id', 'kind', 'points']);
assert.equal(donate(r.profile, 1, 1000n).error, 'duplicate signature');
assert(donateSigTaken({ 1: r.profile }, SIG(1)));
assert(!donateSigTaken({ 1: r.profile }, SIG(2)));

// cap 50 / rolling 7d
let p = r.profile;
p = donate(p, 2, 30_000n).profile;
p = donate(p, 3, 30_000n).profile; // 1 + 30 + 30 → capped
assert.equal(scoreProfile(p, { now }).components.donate, DONATE_CAP_7D);
p = { ...p, awards: p.awards.map((a) => ({ ...a, at: now - DONATE_ROLLING_MS - 1 })) };
assert.equal(scoreProfile(p, { now }).components.donate, 0, 'donate points must age out after 7d');
// same sig twice in awards (store corruption) still credits once
const dup = { ...profile, awards: [r.award, { ...r.award, id: 'x' }] };
assert.equal(scoreProfile(dup, { now }).components.donate, 1);
// future-dated award (at > now) is not counted
assert.equal(scoreProfile({ ...profile, awards: [{ ...r.award, at: now + 1 }] }, { now }).components.donate, 0);

// public row: components.donate present, no wallet / signature / amount
const board = buildPublicBoard([r.profile], { now });
const row = board.measured.find((e) => e.handle === 'donor');
assert.equal(row.components.donate, 1);
assert.equal(assertPublicSafe(board).ok, true, JSON.stringify(assertPublicSafe(board)));
assert(!JSON.stringify(board).includes(SIG(1)), 'signature leaked to public board');
assert(!/"(wallet|amountRaw|dest|proven)"/.test(JSON.stringify(board)));

// rules: donate disclosed; payments / bag size / balances still zero-point
const rules = rulesPublic();
assert.equal(rules.donate.cap_rolling_7d, 50);
assert.equal(rules.donate.floor_dasha, 1000);
for (const z of ['payments', 'bag size', 'token balances', 'purchases']) assert(ZERO_POINT_SOURCES.includes(z), z);
for (const k of ['purchases', 'balance', 'bagSize']) assert.equal(proposeAward(profile, { kind: 'donate', proven: true, amountRaw: 1000n * D6, evidenceUrl: ev(9), [k]: 1 }, { now }).error, 'forbidden signal');

{
  const session = { xId: '9', handle: 'fresh' };
  const miss = creditDonate({}, session, { signature: SIG(9), amountRaw: 1000n * D6, at: now, proven: false });
  assert.equal(miss.error, 'dest not proven');
  const first = creditDonate({}, session, { signature: SIG(9), amountRaw: 1000n * D6, at: now, proven: true });
  assert.equal(first.ok, true);
  assert.equal(first.awarded, true);
  assert.equal(first.points, 1);
  assert.equal(first.donate, 1);
  assert.equal(first.store['9'].handle, 'fresh');
  const again = creditDonate(first.store, session, { signature: SIG(9), amountRaw: 1000n * D6, at: now, proven: true });
  assert.equal(again.error, 'duplicate signature');
}

console.log('dasha-simp-donate.test.mjs ok');
