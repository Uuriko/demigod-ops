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

console.log('demigod-die-activity-shape: PASS');
