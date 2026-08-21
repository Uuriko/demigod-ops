import assert from 'node:assert/strict';
import {
  REFERRAL_CAP_28D,
  REFERRAL_RETURN_MS,
  REFERRAL_TTL_MS,
  activateReferral,
  applyReferralScores,
  claimReferral,
  noteReferralQuiz,
  pruneExpiredReferrals,
  qualifyReferral,
  referralCapReached,
  removeReferralIdentity,
} from './dasha-simp-actions.mjs';
import { scoreProfile } from './dasha-simp-score.mjs';

const now = Date.UTC(2026, 7, 21);
const code = 'abcdefghijklmnop';
const profiles = {
  inviter: { handle: 'inviter', enrolledAt: now - 1, referralCode: code, awards: [] },
};

assert.equal(claimReferral({}, profiles, { xId: 'inviter' }, code, { now }).status, 409,
  'an inviter cannot claim their own code');
assert.equal(claimReferral({}, { ...profiles, invitee: { handle: 'joined' } }, { xId: 'invitee' }, code, { now }).status, 409,
  'an existing member cannot claim retroactively');

const claimed = claimReferral({}, profiles, { xId: 'invitee' }, code, { now });
assert.equal(claimed.ok, true);
assert.deepEqual(claimed.referrals.invitee, { inviterXId: 'inviter', inviteeXId: 'invitee', claimedAt: now });
assert.equal(activateReferral(noteReferralQuiz(claimed.referrals, 'invitee', { now }), 'invitee', {
  now: now + REFERRAL_RETURN_MS - 1,
}).invitee.activatedAt, undefined, 'returning early must not activate attribution');

let referrals = noteReferralQuiz(claimed.referrals, 'invitee', { now });
referrals = activateReferral(referrals, 'invitee', { now: now + REFERRAL_RETURN_MS });
assert.equal(referrals.invitee.activatedAt, now + REFERRAL_RETURN_MS);
referrals = qualifyReferral(referrals, 'invitee', { now: now + REFERRAL_RETURN_MS + 1 });

const scoredProfiles = applyReferralScores({
  ...profiles,
  invitee: { handle: 'invitee', enrolledAt: now, awards: [] },
}, referrals, { now: now + REFERRAL_RETURN_MS + 1 });
assert.equal(scoreProfile(scoredProfiles.inviter, { now }).components.connector, 0);
assert.equal(scoreProfile(scoredProfiles.invitee, { now }).components.connector, 0,
  'referral activation and contribution must stay score-neutral');

const capped = Object.fromEntries(Array.from({ length: REFERRAL_CAP_28D }, (_, i) => [String(i), {
  inviterXId: 'inviter', activatedAt: now - i,
}]));
assert.equal(referralCapReached(capped, 'inviter', { now }), true);

assert.equal(pruneExpiredReferrals({ old: { claimedAt: now - REFERRAL_TTL_MS - 1 } }, { now }).expired, 1);
assert.equal(pruneExpiredReferrals({ finished: { claimedAt: 0, quizAt: 1 } }, { now }).expired, 0,
  'completed quiz attribution survives the seven-day claim window for return measurement');
assert.deepEqual(removeReferralIdentity({
  invited: { inviterXId: 'inviter', inviteeXId: 'invited' },
  inviter: { inviterXId: 'other', inviteeXId: 'inviter' },
}, 'inviter'), {}, 'leaving removes inbound and outbound referral identity');

console.log('dasha Simp referral lifecycle: self, expiry, delayed return, cap, deletion, and zero points passed');
