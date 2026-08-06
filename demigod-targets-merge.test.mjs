#!/usr/bin/env node
// Guard: the durable target store must never clobber human judgement, and must never imply contact.
//
// `report --posted --startups --json` is a snapshot with no state field, so redirecting it to a
// file loses everything a human decided on the previous run. `targets` folds today's rows into a
// store instead. The merge is the whole value, and it has three properties that are easy to break
// and expensive to lose:
//
//   1. a human's state/note survives a re-run
//   2. a company dropping out of the ledger is STAMPED, not deleted — disappearing from the list
//      is information, not an absence
//   3. nothing in this path can set a state other than 'observed', because no outbound has
//      happened and the tool must not be able to claim one did
//
//   node --test demigod-targets-merge.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeTargets } from './demigod-role-ledger.mjs';

const row = (company, age, title = 'Staff Engineer') => ({
  company, age, title, url: `https://boards.example.com/${company.toLowerCase()}/1`, provider: 'Greenhouse',
});
const empty = () => ({ schema: 'demigod.targets/1', companies: {} });

test('first run records every company as observed, with provenance', () => {
  const out = mergeTargets(empty(), [row('Hightouch', 350), row('Gigs', 321)], '2026-08-06');
  assert.equal(Object.keys(out.companies).length, 2);
  const h = out.companies.hightouch;
  assert.equal(h.state, 'observed', 'a fresh row is observed — never contacted');
  assert.equal(h.firstSeenOnList, '2026-08-06');
  assert.equal(h.oldestRoleDays, 350);
  assert.equal(h.sampleRoleUrl, 'https://boards.example.com/hightouch/1', 'provenance link kept');
  assert.equal(h.noLongerAgingAt, null);
  // No contact may be invented — the ledger has no person and no email.
  const s = JSON.stringify(out);
  assert.doesNotMatch(s, /@[a-z0-9.-]+\.[a-z]{2,}/i, 'no email may appear in the store');
  assert.equal('email' in h || 'contact' in h || 'person' in h, false, 'no contact fields at all');
});

test('a re-run preserves human state and notes — the reason this store exists', () => {
  let out = mergeTargets(empty(), [row('Hightouch', 350)], '2026-08-06');
  // A human triages.
  out.companies.hightouch.state = 'ruled-out';
  out.companies.hightouch.note = 'no agency policy on their board';
  // Next day: same company, more aging, plus a new one.
  const next = mergeTargets(out, [row('Hightouch', 351), row('Alpaca', 240)], '2026-08-07');
  assert.equal(next.companies.hightouch.state, 'ruled-out', 'human verdict survived');
  assert.equal(next.companies.hightouch.note, 'no agency policy on their board', 'human note survived');
  assert.equal(next.companies.hightouch.oldestRoleDays, 351, 'observation still refreshed');
  assert.equal(next.companies.hightouch.firstSeenOnList, '2026-08-06', 'first-seen is not rewritten');
  assert.equal(next.companies.alpaca.state, 'observed', 'new company added');
});

test('a company that drops off the ledger is stamped, not deleted', () => {
  let out = mergeTargets(empty(), [row('Hightouch', 350), row('Gigs', 321)], '2026-08-06');
  out.companies.gigs.note = 'emailed me first';
  const next = mergeTargets(out, [row('Hightouch', 351)], '2026-08-07');
  assert.ok(next.companies.gigs, 'Gigs must not vanish');
  assert.equal(next.companies.gigs.noLongerAgingAt, '2026-08-07', 'stamped with the date it left');
  assert.equal(next.companies.gigs.note, 'emailed me first', 'and its history is intact');
  assert.equal(next.companies.hightouch.noLongerAgingAt, null, 'still-aging company is unaffected');
});

test('the stamp is not re-applied on later runs', () => {
  let out = mergeTargets(empty(), [row('Gigs', 321)], '2026-08-06');
  out = mergeTargets(out, [], '2026-08-07');
  const later = mergeTargets(out, [], '2026-08-09');
  assert.equal(later.companies.gigs.noLongerAgingAt, '2026-08-07', 'keeps the ORIGINAL drop-off date');
});

test('merge cannot invent a state other than observed', () => {
  const out = mergeTargets(empty(), [row('Alpaca', 240)], '2026-08-06');
  assert.equal(out.companies.alpaca.state, 'observed');
  // Re-merging a store whose only states came from this function must still be observed.
  const again = mergeTargets(out, [row('Alpaca', 241)], '2026-08-07');
  assert.equal(again.companies.alpaca.state, 'observed', 'no path here promotes a company');
});
