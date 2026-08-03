#!/usr/bin/env node
// Adversarial tests for the DIE Phase 2 gate (demigod-accepted-role.mjs classifyRole).
// This function decides whether "one real accepted startup role exists" — the gate that unlocks
// Phase 2. Everything downstream trusts its answer, so the interesting question is not whether it
// accepts a good role but whether anything can talk it into accepting a bad one. Every case below
// is an attempt to get ok:true from something that should be refused.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { classifyRole } from './demigod-accepted-role.mjs';

const sha = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const ORIGIN_ID = 'sub-101';

// A minimally VALID pair, so every rejection below is caused by the mutation and not by a broken
// fixture. Without this control the whole suite could pass while rejecting everything.
//
// Every key here is required: classifyRole refuses an origin that is not
// startupRoleReadiness().matchReady, so a partial block fails the control with
// `origin_not_match_ready` and aborts the file before a single poison case runs. company-stage
// and work-location must be values from STARTUP_STAGE_OPTIONS / STARTUP_LOCATION_OPTIONS, not
// free text. Spread goodRaw() rather than replacing `raw` when a case varies one key — a bare
// `raw: { 'company-name': X }` drops the other seven and refuses for readiness, which reads as
// "this company name was rejected" when it was not.
const goodRaw = () => ({
  'company-name': 'Acme Robotics',
  'company-stage': 'seed',
  'role-title': 'Founding Engineer',
  'stack-needs': 'JavaScript',
  '90day-outcome': 'Ship a reliable product milestone',
  'work-location': 'sf-hybrid',
  'salary-range': '$180-220k',
  'contact-email': 'founder@acme.test',
});
const goodOrigin = () => ({
  id: ORIGIN_ID,
  status: 'featured',
  form: 'startup-hire',
  featuredId: 'role-1',
  raw: goodRaw(),
});
const goodRole = () => ({
  id: 'role-1',
  sample: false,
  title: 'Founding Engineer',
  sourceSubmissionHash: sha(ORIGIN_ID),
});
const inboxOf = (...items) => ({ items });
const run = (role, origin) => classifyRole(role, inboxOf(origin));

// --- the control: the happy path must actually pass ---------------------------------------
{
  const out = run(goodRole(), goodOrigin());
  assert.equal(out.ok, true, `fixture must be valid or every case below is vacuous: ${out.why}`);
  assert.equal(out.receipt.company, 'Acme Robotics');
  assert.equal(out.receipt.companySource, 'inbox', 'company provenance must always name the inbox');
  assert.equal(out.receipt.sample, false);
  assert.equal(out.receipt.originSubmissionId, ORIGIN_ID);
}

// --- `sample` must be EXPLICITLY false, not merely falsy ----------------------------------
for (const [label, value] of Object.entries({
  absent: undefined, isTrue: true, stringFalse: 'false', zero: 0, nul: null, emptyString: '',
})) {
  const role = goodRole();
  if (value === undefined) delete role.sample; else role.sample = value;
  const out = run(role, goodOrigin());
  assert.equal(out.ok, false, `sample=${label} must not pass as a real role`);
  assert.equal(out.why, 'not_explicit_real', `sample=${label} must fail for the right reason`);
}

// --- seed / demo / sample labelling, at every layer it can hide ---------------------------
for (const [label, mutate] of Object.entries({
  seedRoleId: (r) => { r.id = 'role-seed-9'; },
  candSeedId: (r) => { r.id = 'cand-seed-9'; },
  demoId: (r) => { r.id = 'demo-role'; },
  sampleInTitle: (r) => { r.title = 'Sample Founding Engineer'; },
  demoInNote: (r) => { r.note = 'demo entry, ignore'; },
  selftestInOutcome: (r) => { r.outcome = 'selftest fixture'; },
})) {
  const role = goodRole();
  mutate(role);
  const origin = goodOrigin();
  origin.featuredId = role.id;
  role.sourceSubmissionHash = sha(ORIGIN_ID);
  assert.equal(run(role, origin).ok, false, `${label} must be refused`);
}

// --- origin traceability: zero is refused, and TWO is refused rather than picked ----------
{
  assert.equal(classifyRole(goodRole(), inboxOf()).why, 'no_submission_trace', 'no origin, no acceptance');
  const a = goodOrigin();
  const b = goodOrigin();
  const out = classifyRole(goodRole(), inboxOf(a, b));
  assert.equal(out.ok, false, 'two candidate origins must not resolve to one');
  assert.equal(out.why, 'ambiguous_origin', 'ambiguity must be named, not silently broken');
}

// --- the board must never be able to invent a company ------------------------------------
{
  // Origin carries no company anywhere; the board row asserts one loudly.
  const origin = goodOrigin();
  delete origin.raw;
  const role = { ...goodRole(), company: 'Board Invented Inc', companyName: 'Board Invented Inc' };
  const out = run(role, origin);
  assert.equal(out.ok, false, 'a board-supplied company must not satisfy the gate');
  assert.equal(out.why, 'missing_company');
}
{
  // Origin has a company, the board contradicts it — refuse rather than prefer either.
  const role = { ...goodRole(), company: 'Totally Different Co' };
  const out = run(role, goodOrigin());
  assert.equal(out.ok, false);
  assert.equal(out.why, 'company_mismatch');
}
// Same firm under atlas normalizeCompanyName must not false-mismatch (Grok, Claude target).
for (const [label, boardCo, originCo] of [
  ['legal_suffix', 'Acme Robotics, Inc.', 'Acme Robotics'],
  ['comma_inc', 'Acme Robotics Inc', 'Acme Robotics, Inc.'],
  ['llc_strip', 'Acme Robotics LLC', 'Acme Robotics'],
  ['diacritic', 'Cafe Robotics', 'Café Robotics'],
  ['ws_case', 'ACME  ROBOTICS', 'Acme Robotics'],
]) {
  const origin = { ...goodOrigin(), raw: { ...goodRaw(), 'company-name': originCo } };
  const role = { ...goodRole(), company: boardCo };
  const out = run(role, origin);
  assert.equal(out.ok, true, `${label}: same firm must accept (${out.why})`);
  assert.equal(out.receipt.company, originCo, `${label}: receipt keeps inbox spelling`);
}
// Empty atlas norm must not let legal-suffix-only board equal a real firm.
{
  const role = { ...goodRole(), company: 'Inc.' };
  const out = run(role, goodOrigin());
  assert.equal(out.ok, false, 'suffix-only board must not match a real origin company');
  assert.equal(out.why, 'company_mismatch');
}
{
  // An empty layer must not mask a populated one (the documented `data:{}` hazard).
  const origin = { ...goodOrigin(), raw: { ...goodRaw(), 'company-name': 'Acme Robotics' }, data: {}, fields: {} };
  assert.equal(run(goodRole(), origin).receipt.company, 'Acme Robotics');
}

// --- hash integrity ----------------------------------------------------------------------
{
  const role = { ...goodRole(), sourceSubmissionHash: sha('some-other-submission') };
  assert.equal(run(role, goodOrigin()).why, 'hash_mismatch', 'a hash for a different submission must fail');
}
{
  // A raw (unhashed) submission id in the hash field must not be accepted as a trace.
  const role = { ...goodRole(), sourceSubmissionHash: ORIGIN_ID };
  assert.equal(run(role, goodOrigin()).ok, false, 'an unhashed id is not a valid fingerprint');
}

// --- origin lifecycle states that must block acceptance ----------------------------------
for (const [label, mutate] of Object.entries({
  notFeatured: (o) => { o.status = 'pending'; },
  spam: (o) => { o.status = 'spam'; },
  rejected: (o) => { o.status = 'rejected'; },
  withRejectReasons: (o) => { o.rejectReasons = ['missing outcome']; },
  superseded: (o) => { o.supersededBy = 'sub-102'; },
  supersedes: (o) => { o.supersedes = 'sub-100'; },
  missingOriginId: (o) => { delete o.id; },
  wrongFeaturedId: (o) => { o.featuredId = 'role-999'; },
  partnerForm: (o) => { o.form = 'partner-company'; },
  talentForm: (o) => { o.form = 'talent-profile'; },
  noForm: (o) => { delete o.form; },
})) {
  const origin = goodOrigin();
  mutate(origin);
  const out = run(goodRole(), origin);
  assert.equal(out.ok, false, `origin ${label} must not yield an accepted role`);
  assert.ok(out.why, `origin ${label} must name a reason`);
}

// --- shape robustness: a malformed role is refused, never thrown ---------------------------
for (const bad of [null, undefined, 'role-1', 42, [], true]) {
  const out = classifyRole(bad, inboxOf(goodOrigin()));
  assert.equal(out.ok, false, `classifyRole(${JSON.stringify(bad)}) must refuse`);
}
{
  const out = classifyRole({ sample: false }, inboxOf(goodOrigin()));
  assert.equal(out.why, 'missing_id');
}
// A malformed inbox must refuse, not crash.
for (const bad of [null, undefined, {}, { items: null }, { items: 'nope' }, { items: [null, undefined] }]) {
  const out = classifyRole(goodRole(), bad);
  assert.equal(out.ok, false, 'a malformed inbox cannot produce an accepted role');
}

console.log('accepted-role (Phase 2 gate) poison: all cases PASS');
