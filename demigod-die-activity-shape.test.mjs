#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  ACTIVITY_LIST_SCHEMA,
  ACTIVITY_POLICY,
  projectActivityList,
  shapeActivityRow,
} from './demigod-die-activity-shape.mjs';

assert.equal(shapeActivityRow(null), null);
assert.equal(shapeActivityRow({ actor: 'reviewer@demigod.local', action: 'review' }), null);
const stripped = shapeActivityRow({ email: 'cand@example.com', action: 'note' });
assert.equal(stripped.action, 'note');
assert.equal('email' in stripped, false);

const ok = shapeActivityRow({
  id: 'a1',
  at: 1,
  actor: 'operator',
  entity: 'role-pilot',
  action: 'review_note',
  beforeVersion: 1,
  afterVersion: 2,
  idempotencyKey: 'k1',
  result: 'ok',
  email: 'cand@example.com',
  phone: '555-0100',
});
assert.deepEqual(ok, {
  id: 'a1',
  at: 1,
  actor: 'operator',
  entity: 'role-pilot',
  action: 'review_note',
  beforeVersion: 1,
  afterVersion: 2,
  idempotencyKey: 'k1',
  result: 'ok',
});
assert.equal('email' in ok, false);
assert.equal('phone' in ok, false);

const empty = projectActivityList({ entity: 'role-pilot', limit: 1, cursor: 0 });
assert.deepEqual(empty, {
  schema: ACTIVITY_LIST_SCHEMA,
  entity: 'role-pilot',
  limit: 1,
  cursor: 0,
  nextCursor: null,
  total: 0,
  rows: [],
  state: 'no_hosted_mutations',
  policy: ACTIVITY_POLICY,
});

const page = projectActivityList({
  receipts: [
    { id: '1', entity: 'role-pilot', action: 'open', actor: 'operator' },
    { id: '2', entity: 'other', action: 'open', actor: 'operator' },
    { id: '3', entity: 'role-pilot', action: 'review', actor: 'operator' },
  ],
  entity: 'role-pilot',
  limit: 1,
  cursor: 0,
});
assert.equal(page.total, 2);
assert.equal(page.rows.length, 1);
assert.equal(page.rows[0].id, '1');
assert.equal(page.nextCursor, 1);

/* Attribution, and the exactly-one exemption that makes it possible.
   Every field is dropped if it looks like an address, so that a candidate's contact details cannot
   reach a receipt. `account` is the signed-in operator's own address and is the point of an audit
   trail. Without the exemption, stamping an account onto an event does not fail loudly — the row
   returns null and vanishes from /activity, so attribution would delete the receipts it labels. */
{
  const base = { id: 'e1', at: '2026-08-18T00:00:00Z', actor: 'operator', entity: 'role-1', action: 'apply', result: 'ok' };

  const attributed = shapeActivityRow({ ...base, account: 'alice@demigod.test' });
  assert.ok(attributed, 'a row carrying an operator account is kept, not silently dropped');
  assert.equal(attributed.account, 'alice@demigod.test');

  // and the allowance must stay narrow, or it is not a guard any more
  assert.equal(shapeActivityRow({ ...base, actor: 'candidate@gmail.com' }), null,
    'an address in actor still drops the row');
  assert.equal(shapeActivityRow({ ...base, result: 'emailed bob@gmail.com' }), null,
    'an address anywhere in the free-text fields still drops the row');
  assert.equal(shapeActivityRow({ ...base, account: 'alice@demigod.test', entity: 'cand@gmail.com' }), null,
    'an allowed account does not excuse a candidate address in another field');

  const unattributed = shapeActivityRow(base);
  assert.ok(unattributed, 'an event with no account is still a receipt');
  assert.equal(unattributed.account, undefined, 'and does not invent one');
}

console.log('demigod-die-activity-shape: PASS');
