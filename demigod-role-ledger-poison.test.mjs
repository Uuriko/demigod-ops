#!/usr/bin/env node
// Independent adversarial pass on demigod-role-ledger.mjs. It carries its own --selftest (wired at
// demigod-verify-all.mjs), but whoever builds does not certify — and I did not build this. It is also
// the dataset that killed INNOVATION §3.3, so its two honesty invariants are load-bearing for a
// conclusion we have already acted on:
//   1. observedOpenDays counts from OUR firstSeen, never a board's posting date.
//   2. A role closes ONLY on a successful fetch that omits it. A failed fetch must touch nothing —
//      a flaky network must never manufacture "role closed".
// Every case below tries to break one of those.
import assert from 'node:assert/strict';
import { upsertLedger, observedOpenDays, postedDaysAgo, pruneClosed } from './demigod-role-ledger.mjs';

const T0 = '2026-07-01';
const T1 = '2026-07-11';
const T2 = '2026-07-21';
const role = (jobId, extra = {}) => ({
  jobId, title: 'Senior Backend Engineer', location: 'San Francisco, CA', url: '', ...extra,
});
const board = (ok, roles, extra = {}) => [{ provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok, roles, ...extra }];
const only = (ledger) => Object.values(ledger.roles)[0];
const keys = (ledger) => Object.keys(ledger.roles);

// --- the control: a normal open→still-open sequence must behave, or nothing below means anything --
const seeded = upsertLedger(null, board(true, [role('j1')]), T0);
assert.equal(keys(seeded).length, 1, 'fixture must seed one role');
assert.equal(only(seeded).firstSeen, T0);
assert.equal(only(seeded).closedAt, null);
const stillOpen = upsertLedger(seeded, board(true, [role('j1')]), T1);
assert.equal(only(stillOpen).firstSeen, T0, 'firstSeen is our FIRST observation, never restamped');
assert.equal(only(stillOpen).lastSeen, T1);
assert.equal(only(stillOpen).closedAt, null);

// --- INVARIANT 2: a failed fetch must never close anything ---------------------------------
for (const [label, polled] of Object.entries({
  failedEmpty: board(false, []),
  failedWithRoles: board(false, [role('j1')]),
  failedNullRoles: board(false, null),
  okFalseUndefinedRoles: board(false, undefined),
})) {
  const after = upsertLedger(seeded, polled, T1);
  assert.equal(only(after).closedAt, null, `${label}: a failed fetch must not close a role`);
  assert.equal(only(after).firstSeen, T0, `${label}: and must not disturb firstSeen`);
}
// A poll with no boards at all must close nothing.
assert.equal(only(upsertLedger(seeded, [], T1)).closedAt, null, 'an empty poll closes nothing');
assert.equal(only(upsertLedger(seeded, null, T1)).closedAt, null, 'a null poll closes nothing');

// --- ...but a SUCCESSFUL fetch that omits the role must close it ---------------------------
{
  const closed = upsertLedger(seeded, board(true, []), T1);
  assert.equal(only(closed).closedAt, T1, 'a successful fetch omitting the role closes it');
  assert.equal(only(closed).firstSeen, T0, 'closing must not rewrite firstSeen');
}
// A different board must not close this board's roles.
{
  const other = [{ provider: 'Greenhouse', slug: 'other', company: 'Other', ok: true, roles: [] }];
  assert.equal(only(upsertLedger(seeded, other, T1)).closedAt, null, 'another board cannot close our role');
}
// Duplicate board entries in one poll: an empty sibling must not close what a populated one saw.
{
  const dup = [
    { provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok: true, roles: [role('j1')] },
    { provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok: true, roles: [] },
  ];
  assert.equal(only(upsertLedger(seeded, dup, T1)).closedAt, null, 'union across duplicate boards — no flap');
}

// --- reopen must be recorded, not silently overwritten ------------------------------------
{
  const closed = upsertLedger(seeded, board(true, []), T1);
  const reopened = upsertLedger(closed, board(true, [role('j1')]), T2);
  assert.equal(only(reopened).closedAt, null, 'a reappearing role reopens');
  assert.ok((only(reopened).reopenCount || 0) >= 1, 'and the reopen is counted, not hidden');
  assert.equal(only(reopened).firstSeen, T0, 'reopening still does not rewrite our first observation');
}

// --- INVARIANT 1: observed days come from OUR observation, never the board's date ----------
{
  // A board claiming a posting date 500 days ago must not inflate observedOpenDays.
  const withBoardDate = upsertLedger(
    null,
    board(true, [role('j2', { nativePostedAt: '2025-01-01', nativeDateField: 'first_published' })]),
    T0,
  );
  const row = only(withBoardDate);
  assert.equal(row.firstSeen, T0, 'firstSeen is ours');
  assert.equal(observedOpenDays(row, T1), 10, 'observed days = T0→T1, not the board date');
  assert.ok(postedDaysAgo(row, T1) > 100, 'the board date is carried SEPARATELY and attributed');
}
{
  // A non-first_published date field must NOT be reported as a posting age at all.
  const guessy = upsertLedger(null, board(true, [role('j3', { nativePostedAt: '2025-01-01', nativeDateField: 'updated_at' })]), T0);
  assert.equal(postedDaysAgo(only(guessy), T1), null, 'only first_published may claim a posting date');
}
{
  // No board date → no posting age, and observed days still work.
  const bare = upsertLedger(null, board(true, [role('j4')]), T0);
  assert.equal(postedDaysAgo(only(bare), T1), null);
  assert.equal(observedOpenDays(only(bare), T1), 10);
}

// --- prune must only drop LONG-closed roles, never open ones -------------------------------
{
  // Contract check first: pruneClosed returns { ledger, pruned }, NOT a bare ledger. The separate
  // count is the "no silent caps" discipline — a prune that dropped rows without saying how many
  // would be exactly the silent truncation this codebase keeps refusing. I assumed a bare ledger
  // and was wrong; the real shape is the more honest one.
  const closed = upsertLedger(seeded, board(true, []), T0);
  const kept = pruneClosed(closed, T1, 365);
  assert.ok(kept.ledger && typeof kept.pruned === 'number', 'prune must report what it dropped');
  assert.equal(Object.keys(kept.ledger.roles).length, 1, 'a recently closed role is retained');
  assert.equal(kept.pruned, 0, 'and nothing is reported as pruned');

  const dropped = pruneClosed(closed, '2030-01-01', 365);
  assert.equal(Object.keys(dropped.ledger.roles).length, 0, 'a long-closed role is dropped');
  assert.equal(dropped.pruned, 1, 'and the drop is counted, never silent');

  const openLedger = upsertLedger(seeded, board(true, [role('j1')]), T0);
  const openPrune = pruneClosed(openLedger, '2030-01-01', 365);
  assert.equal(Object.keys(openPrune.ledger.roles).length, 1, 'an OPEN role is never pruned however old');
  assert.equal(openPrune.pruned, 0);
}

// --- shape robustness: malformed input must not throw -------------------------------------
for (const bad of [null, undefined, {}, { roles: null }, { roles: 'x' }]) {
  const out = upsertLedger(bad, board(true, [role('j1')]), T0);
  assert.equal(Object.keys(out.roles).length, 1, 'a malformed prior ledger still upserts');
}
for (const bad of [[null], [undefined], ['nope'], [{ ok: true }]]) {
  const out = upsertLedger(seeded, bad, T1);
  assert.equal(only(out).closedAt, null, 'a malformed board entry must not close a role');
}

console.log('role-ledger poison: all cases PASS');
