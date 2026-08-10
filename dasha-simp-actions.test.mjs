import assert from 'node:assert/strict';
import {
  HOLDER_TTL_MS,
  applyHolderProof,
  base58Decode,
  claimsForSession,
  normalizeClaim,
  pendingClaims,
  publicSeasons,
  reviewClaim,
  scrubSeasonSnapshots,
  snapshotSeason,
  submitClaim,
  walletMessage,
  verifyEd25519,
  hasPositiveTokenBalance,
  isValidSolanaAddress,
} from './dasha-simp-actions.mjs';

const now = Date.parse('2026-08-08T12:00:00Z');
const session = { xId: 'x1', handle: 'ava' };
const profiles = { x1: { xId: 'x1', handle: 'ava', enrolledAt: now, awards: [] } };

assert.equal(normalizeClaim({ kind: 'creative', subtype: 'remix', evidenceUrl: 'https://x.com/ava/status/1' }).ok, true);
assert.equal(normalizeClaim({ kind: 'creative', subtype: 'remix', evidenceUrl: 'https://www.getdasha.com/studio#look=poster' }).ok, false);
assert.equal(normalizeClaim({ kind: 'creative', subtype: 'wat', evidenceUrl: 'https://x.com/ava/status/1' }).ok, false);
assert.equal(normalizeClaim({ kind: 'code', subtype: 'maintainer', evidenceUrl: 'https://github.com/Uuriko/dasha-desk/pull/1' }).ok, true);
assert.equal(normalizeClaim({ kind: 'code', subtype: 'maintainer', evidenceUrl: 'https://github.com/other/repo/pull/1' }).ok, false);
assert.equal(normalizeClaim({ kind: 'code', subtype: 'maintainer', evidenceUrl: 'https://github.com/login/oauth/authorize' }).ok, false);
assert.equal(normalizeClaim({ kind: 'code', subtype: 'maintainer', evidenceUrl: 'https://x.com/a/status/1' }).ok, false);

const submitted = submitClaim({}, profiles, session, { kind: 'creative', subtype: 'remix', evidenceUrl: 'https://x.com/ava/status/1' }, { now, id: 'c1' });
assert.equal(submitted.ok, true);
assert.equal(claimsForSession(submitted.claims, session)[0].status, 'pending');
assert.equal(JSON.stringify(claimsForSession(submitted.claims, session)).includes('x1'), false);
assert.equal(pendingClaims(submitted.claims)[0].handle, 'ava');
assert.equal(submitClaim(submitted.claims, profiles, session, { kind: 'creative', subtype: 'remix', evidenceUrl: 'https://x.com/ava/status/1' }, { now, id: 'c2' }).status, 409);
assert.equal(submitClaim({}, profiles, null, { kind: 'creative', subtype: 'maker', evidenceUrl: 'https://x.com/a/status/2' }, { now }).status, 401);

const accepted = reviewClaim(submitted.claims, profiles, { id: 'c1', decision: 'accept' }, { now: now + 1 });
assert.equal(accepted.ok, true);
assert.equal(accepted.claim.status, 'accepted');
assert.equal(accepted.profiles.x1.awards[0].badge, 'remixer');
assert.equal(accepted.profiles.x1.awards[0].points, 25);

const code = submitClaim({}, profiles, session, { kind: 'code', subtype: 'maintainer', evidenceUrl: 'https://github.com/Uuriko/dasha-desk/pull/1' }, { now, id: 'code1' });
assert.equal(reviewClaim(code.claims, profiles, { id: 'code1', decision: 'accept', ossPoints: 42 }, { now }).ok, false);
const codeAccepted = reviewClaim(code.claims, profiles, { id: 'code1', decision: 'accept', ossPoints: 40 }, { now });
assert.equal(codeAccepted.ok, true);
assert.equal(codeAccepted.profiles.x1.awards[0].schema, 'dasha-simp-oss/v0');

const frozen = snapshotSeason({}, accepted.profiles, { id: 's0', title: 'Season zero' }, { now });
assert.equal(frozen.ok, true);
assert.equal(frozen.snapshot.board.measured[0].handle, 'ava');
assert.equal(snapshotSeason(frozen.snapshots, accepted.profiles, { id: 's0', title: 'Again' }, { now }).status, 409);
assert.equal(publicSeasons(frozen.snapshots)[0].id, 's0');
assert.equal(JSON.stringify(publicSeasons(frozen.snapshots)).includes('memberHandles'), false);
assert.equal(scrubSeasonSnapshots(frozen.snapshots, 'x1').s0.board.measured.length, 0);

const proof = applyHolderProof(profiles, session, { now });
assert.equal(proof.ok, true);
assert.equal(proof.profile.holderUntil, now + HOLDER_TTL_MS);
assert.equal(proof.profile.holderCheckedAt, now);
assert.equal(JSON.stringify(proof.profile).includes('wallet'), false);
const proofAddress = '11111111111111111111111111111111';
const proofMessage = walletMessage({ handle: 'ava', publicKey: proofAddress, nonce: 'abcdefgh', issuedAt: now, expiresAt: now + 1000 });
for (const field of ['www.getdasha.com wants you to sign in', proofAddress, '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump', 'URI: https://www.getdasha.com/', 'Version: 1', 'Chain ID: mainnet', 'Nonce: abcdefgh', 'Issued At:', 'Expiration Time:', 'Request ID: simp-holder', 'No transaction']) assert.match(proofMessage, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.equal(isValidSolanaAddress(proofAddress), true);
assert.equal(isValidSolanaAddress('not-a-wallet'), false);
assert.equal(isValidSolanaAddress('1'.repeat(44)), false, 'Base58-looking input must still decode to exactly 32 bytes');
assert.deepEqual([...base58Decode('1112')], [0, 0, 0, 1]);

const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
const message = 'holder proof';
const signature = new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(message)));
function base58(bytes) {
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let out = '';
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  while (n) { out = alphabet[Number(n % 58n)] + out; n /= 58n; }
  for (const byte of bytes) { if (byte) break; out = '1' + out; }
  return out || '1';
}
assert.equal(await verifyEd25519(message, base58(rawKey), base58(signature)), true);
assert.equal(await verifyEd25519(message + 'x', base58(rawKey), base58(signature)), false);
assert.equal(await verifyEd25519(message, '1'.repeat(4000), base58(signature)), false);
assert.equal(hasPositiveTokenBalance({ result: { value: [{ account: { data: { parsed: { info: { owner: 'w', mint: 'm', tokenAmount: { amount: '1' } } } } } }] } }, { owner: 'w', mint: 'm' }), true);
assert.equal(hasPositiveTokenBalance({ result: { value: [{ account: { data: { parsed: { info: { owner: 'other', mint: 'm', tokenAmount: { amount: '1' } } } } } }] } }, { owner: 'w', mint: 'm' }), false);
assert.equal(hasPositiveTokenBalance({ result: { value: [{ account: { data: { parsed: { info: { owner: 'w', mint: 'other', tokenAmount: { amount: '1' } } } } } }] } }, { owner: 'w', mint: 'm' }), false);
assert.equal(hasPositiveTokenBalance({ result: { value: [{ account: { data: { parsed: { info: { owner: 'w', mint: 'm', tokenAmount: { amount: '0' } } } } } }] } }, { owner: 'w', mint: 'm' }), false);
assert.equal(hasPositiveTokenBalance({ result: { value: [{ account: { data: { parsed: { info: { owner: 'w', mint: 'm', tokenAmount: { amount: 'not-an-integer' } } } } } }] } }, { owner: 'w', mint: 'm' }), false);

console.log('dasha-simp-actions: PASS');
