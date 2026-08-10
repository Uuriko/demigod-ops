import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canonicalizeReceiptInput, createReceipt, verifyManagementSecret } from './dasha-receipt-core.mjs';

const now = new Date('2026-08-06T20:00:00.000Z');
const input = {
  assetId: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
  thesis: ' Depth improves after listing. ',
  invalidation: 'Depth stays under $50k.',
  confidence: 65,
  resolutionDate: '2026-08-13',
};

const clean = canonicalizeReceiptInput(input, now);
assert.equal(clean.thesis, 'Depth improves after listing.');

const { record, manageToken, canonicalPayload } = createReceipt(input, now);
assert.match(record.id, /^[A-Za-z0-9_-]{22}$/);
assert.match(manageToken, /^[A-Za-z0-9_-]{43}$/);
assert.equal(record.payloadHash, createHash('sha256').update(canonicalPayload).digest('hex'));
assert.equal(verifyManagementSecret(manageToken, record.manageTokenHash), true);
assert.equal(verifyManagementSecret(`${manageToken}x`, record.manageTokenHash), false);
assert.equal(JSON.stringify(record).includes(manageToken), false);

for (const bad of [
  { ...input, assetId: 'not-a-mint' },
  { ...input, thesis: '<script>alert(1)</script> https://bad.example' },
  { ...input, thesis: `hidden\u202Etext` },
  { ...input, confidence: 100 },
  { ...input, resolutionDate: '2026-02-31' },
  { ...input, resolutionDate: '2027-08-13' },
]) assert.throws(() => canonicalizeReceiptInput(bad, now));

console.log('Dasha receipt core: PASS (validation, canonical hash, separate bearer secret)');
