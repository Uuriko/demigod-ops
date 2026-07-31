import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProductDesk, productDeskMarkdown } from './demigod-product-desk.mjs';

test('product desk exposes five surfaces and fail-closed delivery loop', () => {
  const doc = buildProductDesk({
    accepted: {
      counts: { boardRoles: 3, nonSampleRoles: 0, acceptedForDelivery: 0 },
      hasAcceptedReceipts: false,
      phase2Ready: false,
      gateOpen: false,
      note: 'test empty',
      boardPath: '/tmp/board.json',
      boardIsCanonical: true,
      acceptedRoles: [],
    },
  });
  assert.equal(doc.schema, 'demigod.product-desk/1');
  assert.equal(doc.surfaces.length, 5);
  assert.deepEqual(
    doc.surfaces.map((s) => s.id).sort(),
    ['desk', 'die', 'directory', 'match', 'notes'],
  );
  assert.equal(doc.deliveryLoop.blockedReason, 'no_accepted_real_role');
  assert.match(doc.architecture.notBuilding, /Clay/i);
  assert.match(productDeskMarkdown(doc), /Delivery loop/);
});
