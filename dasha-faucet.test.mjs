#!/usr/bin/env node
/**
 * Faucet pure helpers + Solana tip builders + product source contract.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ed from '@noble/ed25519';
import {
  FAUCET_MINT,
  FAUCET_TREASURY_DEFAULT,
  alreadyClaimedResponse,
  buildStatus,
  claimAllowed,
  clearPendingClaim,
  destShapeError,
  faucetConfig,
  faucetSignerSecret,
  checkRateLimits,
  checkXEligibility,
  humanError,
  meFromSession,
  noteSuccessfulClaim,
  recordClaim,
  reserveClaim,
} from './dasha-faucet.mjs';
import {
  associatedTokenAddress,
  base58Encode,
  buildTipInstructions,
  keypairFromSecret,
  publicKeyFromSecret,
} from './dasha-faucet-solana.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

assert.equal(FAUCET_MINT, MINT);
assert.ok(FAUCET_TREASURY_DEFAULT.startsWith('DwpCrg5'));

assert.equal(destShapeError('not-a-wallet'), 'dest_not_wallet');
assert.equal(destShapeError(MINT), 'dest_mint');
assert.equal(destShapeError('https://t.me/spam'), 'dest_not_wallet');
const sample = 'DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb';
assert.equal(destShapeError(sample, sample.slice(-4)), '');
assert.equal(destShapeError(sample, 'xxxx'), 'last-4 does not match');

assert.match(humanError('treasury_empty'), /empty|treasury/i);
assert.match(humanError('link X first'), /X/i);

const cfgEmpty = faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT });
assert.equal(cfgEmpty.configured, true);
assert.equal(cfgEmpty.hasSigner, false);

const statusEmpty = buildStatus(cfgEmpty, { balanceRaw: 0n, rpcOk: true });
assert.equal(statusEmpty.configured, true);
assert.equal(statusEmpty.funded, false);
assert.equal(statusEmpty.error, 'treasury_empty');
assert.equal(statusEmpty.amountUi, 100);
assert.equal(statusEmpty.mint, MINT);

const cfgFunded = faucetConfig({
  LOBBY_SESSION_SECRET: 'x',
  MINT,
  FAUCET_KEYPAIR: 'secret',
});
assert.equal(cfgFunded.hasSigner, true);
const statusFunded = buildStatus(cfgFunded, { balanceRaw: 100_000_000n, rpcOk: true });
assert.equal(statusFunded.funded, true);
assert.equal(statusFunded.error, null);

// Legacy secret names still count as signer
assert.equal(
  faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT, FAUCET_TREASURY_SECRET: 'x' }).hasSigner,
  true,
);

const noCfg = buildStatus(faucetConfig({}), {});
assert.equal(noCfg.configured, false);
assert.equal(noCfg.error, 'not_configured');

let store = { byX: {}, byWallet: {} };
assert.equal(claimAllowed(store, { xId: '', wallet: sample }).error, 'link X first');
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).ok, true);
store = reserveClaim(store, { xId: '1', wallet: sample });
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).error, 'confirming');
store = clearPendingClaim(store, { xId: '1', wallet: sample });
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).ok, true);
store = recordClaim(store, { xId: '1', wallet: sample, signature: 'sig' });
assert.equal(claimAllowed(store, { xId: '1', wallet: sample }).error, 'already claimed');
assert.equal(claimAllowed(store, { xId: '2', wallet: sample }).error, 'already claimed');
const replay = alreadyClaimedResponse(claimAllowed(store, { xId: '1', wallet: sample }).prev);
assert.equal(replay.ok, true);
assert.equal(replay.signature, 'sig');
assert.equal(replay.replay, true);

const me = meFromSession({ xId: '1', handle: 'dash' }, store, { dest: sample });
assert.equal(me.linked, true);
assert.equal(me.claimed, true);
assert.equal(me.dest, sample);

// Solana tip builders
const seed = new Uint8Array(32);
seed[0] = 7;
const pub = base58Encode(await ed.getPublicKeyAsync(seed));
const dest = sample;
const ataOwner = await associatedTokenAddress(pub, MINT);
const ataDest = await associatedTokenAddress(dest, MINT);
assert.notEqual(ataOwner, ataDest);
assert.match(ataOwner, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const tip = await buildTipInstructions({
  payer: pub,
  destOwner: dest,
  mint: MINT,
  amountRaw: 100_000_000n,
  createAta: true,
});
assert.equal(tip.instructions.length, 2);
assert.equal(tip.instructions[0].programId.startsWith('AToken'), true);
assert.equal(tip.instructions[1].data[0], 3);
const secretB58 = base58Encode(seed);
const kp = keypairFromSecret(secretB58);
assert.equal(kp.seed.length, 32);
assert.equal(await publicKeyFromSecret(secretB58), pub);

const liveLike = buildStatus(
  faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT, FAUCET_TREASURY: sample }),
  { balanceRaw: 0n, rpcOk: true },
);
assert.deepEqual(
  {
    configured: liveLike.configured,
    funded: liveLike.funded,
    error: liveLike.error,
    amountUi: liveLike.amountUi,
  },
  { configured: true, funded: false, error: 'treasury_empty', amountUi: 100 },
);

// Source recovery
assert.ok(existsSync(join(root, 'dasha-faucet-client.js')), 'client recovered');
assert.ok(existsSync(join(root, 'dasha-faucet-page.html')), 'page present');
assert.ok(existsSync(join(root, 'dasha-faucet-solana.mjs')), 'solana transfer module');
const client = readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8');
assert.ok(client.includes('global.DashaFaucet'), 'exports DashaFaucet');
assert.ok(client.includes('Treasury empty') || client.includes('treasury_empty'), 'empty UX');
assert.ok(client.includes(MINT), 'mint pinned');
assert.ok(client.includes('/faucet/status'), 'status path');
assert.ok(client.includes('Buy $dasha'), 'buy path on empty');
assert.ok(/Pitch in|pitch in|spread the love/i.test(client), 'pitch-in contribute UX');
assert.ok(client.includes('DwpCrg5qfCMW11a9FYFsAR9ZYQUYKNhfLdnzpci7sYgb') || client.includes('DEFAULT_TREASURY'), 'treasury address for pitch-in');
assert.ok(client.includes('Copy treasury') || client.includes('copy treasury'), 'copy treasury control');

const page = readFileSync(join(root, 'dasha-faucet-page.html'), 'utf8');
assert.ok(page.includes('id="dasha-faucet"'), 'mount root');
assert.ok(page.includes('/client/faucet.js'), 'loads client');
assert.ok(!/earn free|guaranteed/i.test(page), 'no earn scam voice');

const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
assert.ok(worker.includes('FAUCET_PAGE_HTML'), 'worker serves faucet page');
assert.ok(worker.includes('handleFaucet'), 'worker has faucet handler');
assert.ok(worker.includes('sendTipTransfer'), 'worker wires SPL transfer');
assert.ok(worker.includes("X-Dasha-Edge': 'faucet'"), 'edge marker');
{
  const m = worker.match(/const RETIRED_SEO_PATHS = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(m, 'RETIRED_SEO_PATHS present');
  assert.ok(!m[1].includes("'/faucet'"), 'faucet not retired SEO');
  assert.ok(m[1].includes("'/airdrop'"), 'airdrop trap remains');
}

const robots = readFileSync(join(root, 'dasha-robots.txt'), 'utf8');
assert.ok(robots.includes('Allow: /faucet'), 'robots allow product faucet');
assert.ok(robots.includes('Disallow: /airdrop'), 'robots still block airdrop trap');

// Funded-path config without secret stays unfunded for UX
const fundedNoSigner = buildStatus(
  faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT }),
  { balanceRaw: 999_999_999_999n, rpcOk: true },
);
assert.equal(fundedNoSigner.funded, false);
assert.equal(fundedNoSigner.error, 'not_configured');

// With signer + RPC down ⇒ soft empty (pitch-in still clear)
const softEmpty = buildStatus(
  faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT, FAUCET_KEYPAIR: 'x' }),
  { balanceRaw: 0n, rpcOk: false, rpcDetail: 'timeout' },
);
assert.equal(softEmpty.error, 'treasury_empty');
assert.equal(softEmpty.rpc, 'unavailable');

// Rate limits + X age
const cfgRate = faucetConfig({
  LOBBY_SESSION_SECRET: 'x',
  MINT,
  FAUCET_DAILY_CAP: '3',
  FAUCET_HOURLY_CAP: '2',
  FAUCET_MIN_X_AGE_DAYS: '7',
});
assert.equal(cfgRate.dailyCap, 3);
assert.equal(cfgRate.hourlyCap, 2);
assert.equal(checkRateLimits({}, cfgRate).ok, true);
let metrics = noteSuccessfulClaim({}, cfgRate);
metrics = noteSuccessfulClaim(metrics, cfgRate);
assert.equal(checkRateLimits(metrics, cfgRate).error, 'hourly_cap');
metrics = noteSuccessfulClaim({ dayKey: metrics.dayKey, dayCount: 3, hourKey: 'other', hourCount: 0 }, cfgRate);
// day already 3 before note → after note 4; check before note
assert.equal(
  checkRateLimits({ dayKey: metrics.dayKey, dayCount: 3, hourKey: 'x', hourCount: 0 }, cfgRate).error,
  'daily_cap',
);
const oldEnough = Date.now() - 10 * 24 * 60 * 60 * 1000;
assert.equal(checkXEligibility({ xId: '1', xCreatedAt: oldEnough }, { minXAgeDays: 7 }).ok, true);
assert.equal(checkXEligibility({ xId: '1', xCreatedAt: Date.now() }, { minXAgeDays: 7 }).error, 'x_too_new');
assert.equal(checkXEligibility({ xId: '1' }, { minXAgeDays: 7 }).ok, true); // soft open without created_at
assert.match(humanError('daily_cap'), /daily/i);
assert.match(humanError('x_too_new'), /new/i);

console.log('dasha-faucet: PASS (helpers, ledger, ATA, rate limits, X age, routes)');
