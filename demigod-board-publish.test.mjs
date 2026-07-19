import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrubPublicBoard } from './demigod-board-publish.mjs';

// Poison-test for the public-board FORCE-HONEST scrub: the artifact uploaded to the public CDN must
// never contain private pilots (PII) or real objects (sample:false role / delivered receipt) while its
// signal claims 0 real. Codifies c457 (which found the object-leak the c432 manual check missed) with a
// durable test on the REAL extracted function — a future edit that only zeroes the signal is caught.

test('scrubPublicBoard leaves an honest sample-only board intact (not vacuous)', () => {
  const honest = {
    roles: [{ id: 'role-seed1', sample: true }, { id: 'role-seed2', sample: true }],
    candidates: [{ id: 'cand-seed1' }],
    receipts: [{ hash: 'demo004', status: 'delivered', note: 'Sample receipt' }],
    signal: { realRoles: 0, realReceipts: 0 },
  };
  const pub = scrubPublicBoard(honest);
  assert.equal(pub.roles.length, 2, 'sample roles must survive — else the scrub is vacuous');
  assert.equal(pub.receipts.length, 1, 'the sample receipt must survive');
  assert.equal(pub.receipts[0].hash, 'demo004');
});

test('scrubPublicBoard strips real objects + pilots and forces signal 0 (fail-capable)', () => {
  const dishonest = {
    roles: [
      { id: 'role-real', title: 'Real PM', sample: false, pilot: true },
      { id: 'role-seed1', sample: true },
    ],
    candidates: [],
    receipts: [
      { hash: 'a1b2c3', status: 'delivered', note: 'Real PM · pilot logged', intros: 3 }, // real
      { hash: 'demo004', status: 'delivered', note: 'Sample receipt' },                    // sample
    ],
    pilots: [{ email: 'founder@secret.com', name: 'Jane' }], // PII — must never publish
    signal: { realRoles: 1, realReceipts: 1 },
  };
  const pub = scrubPublicBoard(dishonest);
  assert.equal(pub.roles.filter((r) => r.sample === false).length, 0, 'no real role may reach the public board');
  assert.equal(pub.receipts.filter((r) => r.status === 'delivered' && !/sample|demo/i.test(r.note) && !/^demo/i.test(r.hash)).length, 0, 'no real receipt may reach the public board');
  assert.equal(pub.pilots, undefined, 'private pilots (PII) must be deleted');
  assert.deepEqual(pub.signal, { realRoles: 0, realReceipts: 0 }, 'signal forced to 0');
  // the surviving sample objects are consistent with signal:0 (no self-contradiction)
  assert.ok(pub.roles.every((r) => r.sample !== false));
  assert.ok(pub.receipts.every((r) => !(r.status === 'delivered' && !/sample|demo/i.test(r.note || '') && !/^demo/i.test(r.hash || ''))));
});

test('scrubPublicBoard does not mutate the input (local board keeps its real objects)', () => {
  const local = { roles: [{ id: 'r', sample: false }], receipts: [], pilots: [{ email: 'x@y.z' }], signal: { realRoles: 1 } };
  scrubPublicBoard(local);
  assert.equal(local.roles[0].sample, false, 'input local board must be untouched (deep clone)');
  assert.ok(local.pilots, 'input pilots must remain — only the public copy is redacted');
});
