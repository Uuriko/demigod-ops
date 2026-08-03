#!/usr/bin/env node
import assert from 'node:assert/strict';
import { isTestSubmission, pendingReviewCount, queueRank, redactItem, reviewedStatus } from './demigod-submissions-inbox.mjs';

assert.equal(reviewedStatus('new'), 'reviewed');
assert.equal(reviewedStatus('updated'), 'reviewed');
assert.equal(isTestSubmission({ id: 'sla-test-1', raw: {} }), true);
assert.equal(isTestSubmission({ id: 'candidate-1', form: 'engineer-join', raw: { 'seeker-email': 'a@pending.example' } }), true);
assert.equal(isTestSubmission({ id: 'sms-cand-abc', form: 'engineer-join-sms', raw: { 'seeker-email': 'sms-1@pending.example' } }), true);
assert.equal(isTestSubmission({ id: 'candidate-data', form: 'engineer-join', raw: { 'seeker-email': 'a@startup.com' }, data: { sample: true } }), true);
assert.equal(isTestSubmission({ id: 'candidate-test', form: 'engineer-join', raw: { 'seeker-email': 'a@test.com' } }), true);
assert.equal(isTestSubmission({ id: 'candidate-disposable', form: 'engineer-join', raw: { 'seeker-email': 'a@mailinator.com' } }), true);
assert.equal(isTestSubmission({ id: 'candidate-shadowed', form: 'engineer-join', raw: {}, data: { 'seeker-email': 'a@test.com' } }), true);
assert.equal(isTestSubmission({ id: 'candidate-mixed', form: 'engineer-join', raw: { 'seeker-email': 'a@startup.com' }, payload: { demo: true } }), true);
assert.equal(isTestSubmission({ id: 'candidate-2', form: 'engineer-join', raw: { 'seeker-email': 'a@startup.com' } }), false);
// Operational pending excludes test/sim fixtures so CLI cannot claim 74 "awaiting review" from SMS sims.
assert.equal(pendingReviewCount([
  { status: 'updated', id: 'sms-cand-1', form: 'engineer-join-sms', raw: { 'seeker-email': 'x@pending.example' } },
  { status: 'updated', id: 'real-1', form: 'engineer-join', raw: { 'seeker-email': 'a@startup.com' } },
  { status: 'featured', id: 'real-2', form: 'startup-hire', raw: { 'contact-email': 'b@startup.com' } },
].filter((item) => !isTestSubmission(item))), 1);
assert.equal(pendingReviewCount([
  { status: 'new' },
  { status: 'updated' },
  { status: 'reviewed' },
  { status: 'featured' },
  { status: 'spam' },
]), 2);
for (const status of ['rejected', 'spam', 'featured', 'reviewed']) {
  assert.equal(reviewedStatus(status), status, `${status} must not be broadened into reviewed`);
}

const blocked = redactItem({
  id: 'sub-private', form: 'startup-hire', status: 'reviewed',
  raw: {
    'company-name': 'Private Company', 'company-stage': 'Seed', 'role-title': 'Designer',
    'stack-needs': 'Product design', '90day-outcome': 'Ship onboarding',
    'contact-email': 'founder@private.invalid',
  },
});
assert.equal(blocked.matchingReady, false);
// work-location is required for founder match scoring (foot v798+); both blockers stay fail-closed.
assert.deepEqual(blocked.matchingBlockers, ['work-location', 'salary-range']);
assert.equal(blocked.email, 'f***@private.invalid');
assert.doesNotMatch(JSON.stringify(blocked), /Private Company|Product design|Ship onboarding/);
const rejected = redactItem({
  id: 'sub-rejected',
  form: 'engineer-join',
  status: 'rejected',
  raw: { 'seeker-email': 'person@startup.com' },
  rejectReasons: ['invalid_email', 'contact person@startup.com or 415-555-1212', { private: true }],
});
assert.deepEqual(rejected.rejectReasons, ['invalid_email', 'contact [contact removed] or [phone removed]']);
assert.doesNotMatch(JSON.stringify(rejected), /person@startup\.com|415-555-1212|\[object Object\]/);
assert.equal(redactItem({ id: 'partner', form: 'partner-apply', status: 'reviewed', raw: {} }).matchingReady, null);
const candidate = redactItem({ id: 'candidate', form: 'engineer-join', status: 'updated', raw: { 'skills-stack': 'Design' } });
assert.equal(candidate.matchingReady, false);
assert.deepEqual(candidate.matchingBlockers, ['human-review', 'full-name', 'seeker-email', 'experience', 'sf-bay', 'availability', 'salary-expectation', 'resume']);
assert.deepEqual(['spam', 'featured', 'updated', 'reviewed', 'new'].sort((a, b) => queueRank(a) - queueRank(b)), ['updated', 'new', 'reviewed', 'featured', 'spam']);

console.log('demigod inbox reviewed transition: PASS');
