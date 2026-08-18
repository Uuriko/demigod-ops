#!/usr/bin/env node
/**
 * Root faucet contract: dest shape, proven/unproven ledger, SIWS message bind, client source.
 * Live is not asserted equal — prepared ≠ published.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ed from '@noble/ed25519';
import {
  FAUCET_MINT,
  FAUCET_SIWS_DOMAIN,
  FAUCET_TREASURY_DEFAULT,
  alreadyClaimedResponse,
  buildStatus,
  claimAllowed,
  clearPendingClaim,
  destShapeError,
  donateFailClosed,
  donateSigError,
  inspectDonateTx,
  DONATE_MIN_RAW,
  faucetConfig,
  faucetSiwsInput,
  humanError,
  meFromSession,
  noteSuccessfulClaim,
  recordClaim,
  reserveClaim,
  checkRateLimits,
  checkXEligibility,
  siwsMessageError,
} from './dasha-faucet.mjs';
import {
  associatedTokenAddress,
  base58Encode,
  buildSignedTipTx,
  buildTipInstructions,
  keypairFromSecret,
  publicKeyFromSecret,
} from './dasha-faucet-solana.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const TREASURY = 'DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb';
const sample = 'So11111111111111111111111111111111111111112';

assert.equal(FAUCET_MINT, MINT);
assert.equal(FAUCET_TREASURY_DEFAULT, TREASURY);
assert.equal(FAUCET_SIWS_DOMAIN, 'lobby.getdasha.com');

assert.equal(destShapeError('not-a-wallet'), 'dest_not_wallet');
assert.equal(destShapeError(''), 'dest_not_wallet');
assert.equal(destShapeError(MINT), 'dest_mint');
assert.equal(destShapeError('https://t.me/spam'), 'dest_not_wallet');
assert.equal(destShapeError(TREASURY), 'dest_treasury');
assert.equal(destShapeError(TREASURY, TREASURY.slice(-4)), 'dest_treasury');
assert.equal(destShapeError(sample, sample.slice(-4)), '');
assert.equal(destShapeError(sample, 'xxxx'), 'last-4 does not match');
assert.equal(destShapeError(sample, '', { treasury: sample }), 'dest_treasury');

assert.equal(humanError('dest_treasury'), 'dest_treasury');
assert.match(humanError('treasury_empty'), /empty|treasury/i);
assert.match(humanError('link X first'), /X/i);

assert.equal(claimAllowed({ byX: {}, byWallet: {} }, { xId: '1', wallet: TREASURY }).error, 'dest_treasury');
assert.equal(claimAllowed({ byX: {}, byWallet: {} }, { xId: '1', wallet: MINT }).error, 'dest_mint');

{
  const junk = donateFailClosed({ sig: 'nope' });
  const empty = donateFailClosed({});
  const well = donateFailClosed({
    signature: '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
  });
  assert.deepEqual(junk, { error: 'sig miss' });
  assert.deepEqual(empty, { error: 'sig miss' });
  assert.deepEqual(well, { error: 'sig miss' });
  for (const row of [junk, empty, well]) {
    assert.equal(row.ok, undefined);
    assert.equal(row.awarded, undefined);
    assert.equal(row.funded, undefined);
  }
  const wellSig = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
  assert.equal(donateSigError('nope'), 'sig miss');
  assert.equal(donateSigError(wellSig), '');

  const now = Date.parse('2026-08-17T12:00:00.000Z');
  const treas = TREASURY;
  const goodTx = {
    blockTime: now / 1000 - 3600,
    meta: {
      err: null,
      preTokenBalances: [{ owner: treas, mint: MINT, uiTokenAmount: { amount: '0' } }],
      postTokenBalances: [{ owner: treas, mint: MINT, uiTokenAmount: { amount: String(DONATE_MIN_RAW) } }],
    },
    transaction: { message: { accountKeys: ['So11111111111111111111111111111111111111112'] } },
  };
  const hit = inspectDonateTx(goodTx, { treasury: treas, mint: MINT, now });
  assert.equal(hit.ok, true);
  assert.equal(hit.amountRaw, DONATE_MIN_RAW);
  assert.equal(hit.payer, sample);
  assert.equal(inspectDonateTx({ ...goodTx, meta: { ...goodTx.meta, err: 'fail' } }, { treasury: treas, mint: MINT, now }).error, 'sig miss');
  assert.equal(inspectDonateTx(goodTx, { treasury: treas, mint: MINT, now, faucetSigner: sample }).error, 'sig miss');
  const dust = {
    ...goodTx,
    meta: {
      err: null,
      preTokenBalances: [{ owner: treas, mint: MINT, uiTokenAmount: { amount: '0' } }],
      postTokenBalances: [{ owner: treas, mint: MINT, uiTokenAmount: { amount: '1' } }],
    },
  };
  assert.equal(inspectDonateTx(dust, { treasury: treas, mint: MINT, now }).error, 'sig miss');
}

{
  const mintTx = await buildSignedTipTx({}, { destOwner: MINT, skipBalanceChecks: true });
  assert.equal(mintTx.ok, false);
  assert.equal(mintTx.error, 'dest_mint');
  const treasTx = await buildSignedTipTx({}, { destOwner: TREASURY, skipBalanceChecks: true });
  assert.equal(treasTx.ok, false);
  assert.equal(treasTx.error, 'dest_treasury');
  const badTx = await buildSignedTipTx({}, { destOwner: 'https://t.me/spam', skipBalanceChecks: true });
  assert.equal(badTx.error, 'dest_not_wallet');
}

const cfgEmpty = faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT });
assert.equal(cfgEmpty.configured, true);
assert.equal(cfgEmpty.hasSigner, false);
const statusEmpty = buildStatus(cfgEmpty, { balanceRaw: 0n, rpcOk: true });
assert.equal(statusEmpty.funded, false);
assert.equal(statusEmpty.error, 'treasury_empty');
assert.equal(statusEmpty.amountUi, 100);

let store = { byX: {}, byWallet: {} };
assert.equal(claimAllowed(store, { xId: '', wallet: sample }).error, 'link X first');
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).ok, true);
store = reserveClaim(store, { xId: '1', wallet: sample });
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).error, 'confirming');
assert.equal(
  claimAllowed(store, { xId: '1', wallet: sample, now: Date.now() + 3 * 60 * 1000 }).ok,
  true,
  'stale pending reserve must expire so a crashed send cannot lock the jar',
);
store = clearPendingClaim(store, { xId: '1', wallet: sample });
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).ok, true);
store = recordClaim(store, { xId: '1', wallet: sample, signature: 'sig' });
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).error, 'already claimed');
assert.equal(claimAllowed(store, { xId: '2', wallet: sample }).error, 'already claimed');
const replay = alreadyClaimedResponse(claimAllowed(store, { xId: '1', wallet: sample }).prev);
assert.equal(replay.ok, true);
assert.equal(replay.signature, 'sig');

const me = meFromSession({ xId: '1', handle: 'dash' }, store, { dest: sample });
assert.equal(me.linked, true);
assert.equal(me.claimed, true);

{
  const victim = sample;
  let s = recordClaim({ byX: {}, byWallet: {} }, { xId: 'attacker', wallet: victim, signature: 'sig1', proven: false });
  assert.equal(s.byX.attacker.wallet, victim);
  assert.equal(s.byWallet[victim], undefined, 'unproven claim must NOT occupy the per-wallet slot');
  assert.equal(claimAllowed(s, { xId: 'owner', wallet: victim, proven: true }).ok, true);
  assert.equal(claimAllowed(s, { xId: 'attacker', wallet: victim, proven: false }).error, 'prove wallet');

  const proven = recordClaim({ byX: {}, byWallet: {} }, { xId: 'owner', wallet: victim, signature: 'sig2', proven: true });
  assert.equal(proven.byWallet[victim].signature, 'sig2');
  assert.equal(claimAllowed(proven, { xId: 'someone-else', wallet: victim, proven: true }).error, 'already claimed');

  const reserved = reserveClaim({ byX: {}, byWallet: {} }, { xId: 'attacker', wallet: victim, proven: false });
  assert.equal(reserved.byWallet[victim], undefined);
  assert.equal(reserved.byX.attacker.pending, true);

  const dflt = recordClaim({ byX: {}, byWallet: {} }, { xId: 'x', wallet: victim, signature: 'sig3' });
  assert.equal(dflt.byWallet[victim].signature, 'sig3', 'proven defaults to true');
}

{
  const w = sample;
  let s = reserveClaim({ byX: {}, byWallet: {} }, { xId: 'owner', wallet: w, proven: true });
  s = reserveClaim(s, { xId: 'stranger', wallet: w, proven: false });
  s = clearPendingClaim(s, { xId: 'stranger', wallet: w, proven: false });
  assert.equal(s.byX.stranger, undefined);
  assert.ok(s.byWallet[w], "stranger's rollback must NOT delete the owner's in-flight wallet slot");
  assert.equal(s.byWallet[w].xId, 'owner');
  const foreign = clearPendingClaim(s, { xId: 'someone-else', wallet: w, proven: true });
  assert.ok(foreign.byWallet[w], "a proven caller cannot clear another X id's reservation");
  const own = clearPendingClaim(s, { xId: 'owner', wallet: w, proven: true });
  assert.equal(own.byWallet[w], undefined);
}

{
  const now = Date.now();
  const siws = faucetSiwsInput({
    domain: FAUCET_SIWS_DOMAIN,
    publicKey: sample,
    nonce: 'n0nce',
    issuedAt: now,
    expirationTime: now + 60_000,
  });
  const good = `${siws.domain} wants you to sign in with your Solana account:\n${siws.address}\n\n${siws.statement}\nNonce: ${siws.nonce}`;
  assert.equal(siwsMessageError(good, { publicKey: sample, domain: FAUCET_SIWS_DOMAIN, nonce: 'n0nce' }), '');
  assert.equal(siwsMessageError(good.replace(FAUCET_SIWS_DOMAIN, 'evil.example'), { publicKey: sample, domain: FAUCET_SIWS_DOMAIN, nonce: 'n0nce' }), 'siws_domain');
  assert.equal(siwsMessageError(good.replace('n0nce', 'other'), { publicKey: sample, domain: FAUCET_SIWS_DOMAIN, nonce: 'n0nce' }), 'invalid faucet challenge');
  assert.equal(siwsMessageError('nope', { publicKey: sample, domain: FAUCET_SIWS_DOMAIN }), 'invalid faucet challenge');
}

const seed = new Uint8Array(32);
seed[0] = 7;
const pub = base58Encode(await ed.getPublicKeyAsync(seed));
const ataOwner = await associatedTokenAddress(pub, MINT);
const ataDest = await associatedTokenAddress(sample, MINT);
assert.notEqual(ataOwner, ataDest);
const tip = await buildTipInstructions({
  payer: pub,
  destOwner: sample,
  mint: MINT,
  amountRaw: 100_000_000n,
  createAta: true,
});
assert.equal(tip.instructions.length, 2);
const secretB58 = base58Encode(seed);
assert.equal(await publicKeyFromSecret(secretB58), pub);
assert.equal(keypairFromSecret(secretB58).seed.length, 32);

const cfgRate = faucetConfig({
  LOBBY_SESSION_SECRET: 'x',
  MINT,
  FAUCET_DAILY_CAP: '3',
  FAUCET_HOURLY_CAP: '2',
  FAUCET_MIN_X_AGE_DAYS: '7',
});
assert.equal(checkRateLimits({}, cfgRate).ok, true);
let metrics = noteSuccessfulClaim({}, cfgRate);
metrics = noteSuccessfulClaim(metrics, cfgRate);
assert.equal(checkRateLimits(metrics, cfgRate).error, 'hourly_cap');
assert.equal(checkXEligibility({ xId: '1', xCreatedAt: Date.now() }, { minXAgeDays: 7 }).error, 'x_too_new');

const client = readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8');
assert.ok(client.includes('free $dasha'), 'root door is free $dasha');
assert.ok(!client.includes("faucet-send', 'Send'"), 'root door is not Send');
assert.ok(client.includes("kind || 'PASTED'"), 'paste defaults PASTED');
assert.match(client, /function bindPaste[\s\S]*kind \|\| 'PASTED'/);
assert.doesNotMatch(client, /function bindPaste[\s\S]*kind \|\| 'IS_WALLET'/);
assert.ok(client.includes('dest_treasury'), 'client rejects treasury');
assert.ok(client.includes(TREASURY), 'client knows treasury');
assert.ok(client.includes(MINT), 'client pins mint');
{
  const destCheck = client.slice(client.indexOf("'/faucet/dest-check'"), client.indexOf('function claim'));
  assert.ok(destCheck.includes("showDestError(err || 'dest_not_wallet')"), 'dest-check fail-closed shows error');
  assert.ok(!/afterWallet\(\);\s*\}\s*\)\.catch\(function\(\)\s*\{\s*return afterWallet/.test(destCheck), 'dest-check catch does not continue');
}

assert.ok(existsSync(join(root, 'dasha-faucet-page.html')));
const page = readFileSync(join(root, 'dasha-faucet-page.html'), 'utf8');
assert.ok(page.includes('id="dasha-faucet"') || page.includes('dasha-faucet'));
assert.ok(!/earn free|guaranteed/i.test(page), 'no earn scam voice');

console.log('dasha-faucet: PASS (dest, treasury, ledger, rollback, SIWS message, root client contract)');
