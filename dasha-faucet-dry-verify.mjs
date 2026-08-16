#!/usr/bin/env node
/**
 * Dry-verify tip transaction encoding against mainnet RPC.
 * Never sends value. Uses an ephemeral keypair + simulateTransaction.
 *
 * Exit 0 if wire format is accepted (simulation may still fail on funds/accounts).
 * Exit 1 if decode/structure fails or RPC unreachable.
 */
import assert from 'node:assert/strict';
import * as ed from '@noble/ed25519';
import {
  FAUCET_MINT,
  FAUCET_TREASURY_DEFAULT,
  buildStatus,
  faucetConfig,
} from './dasha-faucet.mjs';
import {
  associatedTokenAddress,
  base58Encode,
  buildSignedTipTx,
  publicKeyFromSecret,
  rpc,
  simulateTipTransfer,
} from './dasha-faucet-solana.mjs';

const env = {
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  MINT: FAUCET_MINT,
};

const seed = crypto.getRandomValues(new Uint8Array(32));
const secret = base58Encode(seed);
const payer = await publicKeyFromSecret(secret);
const destSeed = crypto.getRandomValues(new Uint8Array(32));
const dest = base58Encode(await ed.getPublicKeyAsync(destSeed));

// ATA stability + re-encode
const ata1 = await associatedTokenAddress(payer, FAUCET_MINT);
const ata2 = await associatedTokenAddress(payer, FAUCET_MINT);
assert.equal(ata1, ata2, 'ATA derivation unstable');

// Live blockhash reachable
const latest = await rpc(env, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
const blockhash = latest?.value?.blockhash || latest?.blockhash;
assert.ok(blockhash && blockhash.length >= 32, 'no blockhash from RPC');

const built = await buildSignedTipTx(env, {
  destOwner: dest,
  secret,
  skipBalanceChecks: true,
  forceCreateAta: true,
  amountRaw: 100_000_000n,
  mint: FAUCET_MINT,
});
assert.equal(built.ok, true, built.error || 'build failed');
assert.ok(built.wire && built.wire.length > 80, 'wire too short');
assert.ok(built.signature && built.signature.length >= 64, 'signature missing');
assert.equal(built.payer, payer);
assert.equal(built.createdAta, true);

const sim = await simulateTipTransfer(env, built);
if (!sim.ok && sim.error === 'rpc_unavailable') {
  console.error(JSON.stringify({ ok: false, stage: 'simulate', ...sim }, null, 2));
  process.exit(1);
}

// Acceptable: simulation ran. Economic failure is expected (empty ephemeral wallet).
// Unacceptable: transaction decode / invalid account index / bad signature format from our codec.
const logs = (sim.logs || []).join('\n');
const detail = String(sim.detail || '');
const errStr = JSON.stringify(sim.err ?? null);
const structuralFail =
  /failed to deserialize|invalid transaction|invalid account index|signature verification|Blockhash not found/i.test(
    `${logs}\n${detail}\n${errStr}`,
  ) && !/insufficient|Attempt to debit|account not found|AccountNotFound|custom program error|owned by/i.test(
    `${logs}\n${detail}\n${errStr}`,
  );

// Empty-path status shape still honest for real treasury
const status = buildStatus(
  faucetConfig({
    LOBBY_SESSION_SECRET: 'dry',
    MINT: FAUCET_MINT,
    FAUCET_TREASURY: FAUCET_TREASURY_DEFAULT,
  }),
  { balanceRaw: 0n, rpcOk: true },
);

// RPC accepted the payload if we got a sim envelope (err may still be set for empty wallet).
const simRan = Boolean(sim.simulated) || sim.err !== undefined || (sim.ok === true && !sim.detail);
const report = {
  ok: simRan && !structuralFail,
  payer,
  dest,
  sourceAta: built.sourceAta,
  destAta: built.destAta,
  txBytes: built.txBytes,
  messageBytes: built.messageBytes,
  signature: built.signature,
  simulation: {
    ran: simRan,
    err: sim.err ?? null,
    unitsConsumed: sim.unitsConsumed,
    logSample: (sim.logs || []).slice(0, 8),
    detail: sim.detail || null,
  },
  structuralFail,
  emptyStatus: {
    configured: status.configured,
    funded: status.funded,
    error: status.error,
    amountUi: status.amountUi,
  },
  note: 'Simulation economic failure is expected with an ephemeral empty keypair. structuralFail must be false.',
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
console.error('dasha-faucet-dry-verify: PASS');
