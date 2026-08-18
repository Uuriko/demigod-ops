#!/usr/bin/env node
/**
 * Research-backed faucet hunt. Drives shipped dasha-faucet.mjs + DashaFaucet
 * (client IIFE). See docs/exchange/DASHA-FAUCET-HUNT-2026-08-18.md.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  FAUCET_AMOUNT_RAW,
  FAUCET_PENDING_MS,
  FAUCET_MINT,
  FAUCET_SIWS_DOMAIN,
  FAUCET_TREASURY_DEFAULT,
  alreadyClaimedResponse,
  buildStatus,
  checkRateLimits,
  checkXEligibility,
  claimAllowed,
  clearPendingClaim,
  destShapeError,
  donateFailClosed,
  faucetConfig,
  faucetSiwsInput,
  humanError,
  inspectDonateTx,
  noteSuccessfulClaim,
  recordClaim,
  reserveClaim,
  siwsMessageError,
} from './dasha-faucet.mjs';
import { isValidSolanaAddress } from './dasha-simp-actions.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const MINT = FAUCET_MINT;
const TREASURY = FAUCET_TREASURY_DEFAULT;
const WALLET = 'So11111111111111111111111111111111111111112';

const sandbox = {
  document: {
    readyState: 'complete',
    getElementById: () => null,
    addEventListener() {},
  },
};
sandbox.window = sandbox;
vm.runInNewContext(readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8'), sandbox, {
  filename: 'dasha-faucet-client.js',
});
const Client = sandbox.DashaFaucet;
assert.ok(Client && typeof Client.destShapeError === 'function', 'client exports destShapeError');
assert.ok(typeof Client.humanError === 'function', 'client exports humanError');

const findings = [];
function finding(id, text) {
  findings.push(`${id}: ${text}`);
}

/* H1 dest shape — corpus both sides must refuse */
const refuse = [
  ['', 'empty'],
  ['not-a-wallet', 'garbage'],
  ['0x' + 'ab'.repeat(20), 'evm'],
  ['https://t.me/spam', 'telegram url'],
  ['t.me/dashacommunity', 'telegram host'],
  ['abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', 'seed'],
  [MINT, 'mint'],
  [TREASURY, 'treasury'],
  ['1'.repeat(16), 'too short'],
  ['2'.repeat(50), 'too long'],
  ['0OIl' + '2'.repeat(40), 'ambiguous base58'],
];
for (const [dest, name] of refuse) {
  const server = destShapeError(dest);
  const client = Client.destShapeError(dest);
  assert.ok(server, `H1 server must refuse ${name}`);
  assert.ok(client, `H1 client must refuse ${name}`);
}
assert.equal(destShapeError(WALLET), '');
assert.equal(Client.destShapeError(WALLET), '');
assert.equal(isValidSolanaAddress(WALLET), true);

/* H1b client 32-byte bar must match isValidSolanaAddress */
{
  const almost = '2'.repeat(40);
  const server = destShapeError(almost);
  const client = Client.destShapeError(almost);
  const valid = isValidSolanaAddress(almost);
  if (!valid) {
    assert.ok(server, 'H1b server refuses non-32-byte base58');
    assert.ok(client, 'H1b client must refuse what isValidSolanaAddress refuses');
  }
}

/* H2 last-4 is a typo check, not control */
assert.equal(destShapeError(WALLET, WALLET.slice(-4)), '');
assert.equal(destShapeError(WALLET, 'xxxx'), 'last-4 does not match');
assert.equal(destShapeError(TREASURY, TREASURY.slice(-4)), 'dest_treasury');
{
  const poison = WALLET.slice(0, -4) + TREASURY.slice(-4);
  if (poison !== TREASURY && destShapeError(poison) === '' && poison.slice(-4) === TREASURY.slice(-4)) {
    finding('H2', `lookalike last-4 of treasury passes destShapeError (${poison.slice(0, 4)}…${poison.slice(-4)}) — last-4 is not identity`);
  }
}

/* H3 voices stay distinct */
{
  const serverVoices = ['dest_mint', 'dest_treasury', 'dest_not_wallet', 'last-4 does not match', 'siws_domain'].map(humanError);
  assert.equal(new Set(serverVoices).size, 5, 'H3 server voices must not collapse');
  const clientVoices = ['dest_mint', 'dest_treasury', 'dest_not_wallet', 'last-4 does not match', 'siws_domain'].map(Client.humanError);
  assert.equal(new Set(clientVoices).size, 5, 'H3 client voices must not collapse');
  assert.equal(Client.humanError('dest_treasury'), 'that is the tip jar');
  assert.equal(Client.humanError('dest_mint'), 'that is the mint');
  assert.equal(Client.humanError('{json:true}'), 'claim failed.');
}

/* H4 empty jar honesty */
{
  const cfg = faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT });
  assert.equal(cfg.hasSigner, false);
  const st = buildStatus(cfg, { balanceRaw: 10n * FAUCET_AMOUNT_RAW, rpcOk: true });
  assert.equal(st.funded, false, 'H4 fat balance without signer is not a claim CTA');
  const empty = buildStatus({ ...cfg, hasSigner: true, configured: true, paused: false, amountRaw: FAUCET_AMOUNT_RAW, amountUi: 100, decimals: 6, cooldownDays: 30, mint: MINT, treasury: TREASURY }, { balanceRaw: 0n, rpcOk: true });
  assert.equal(empty.funded, false);
  assert.equal(empty.error, 'treasury_empty');
  const rpc = buildStatus({ ...cfg, hasSigner: true, configured: true, paused: false, amountRaw: FAUCET_AMOUNT_RAW, amountUi: 100, decimals: 6, cooldownDays: 30, mint: MINT, treasury: TREASURY }, { rpcOk: false });
  assert.equal(rpc.funded, false);
  assert.equal(rpc.error, 'treasury_empty');
}

/* H5 X eligibility */
assert.equal(checkXEligibility({}).error, 'link X first');
assert.equal(checkXEligibility({ xId: '1', xCreatedAt: Date.now() }, { minXAgeDays: 7 }).error, 'x_too_new');
assert.equal(checkXEligibility({ xId: 'old-cookie' }, { minXAgeDays: 7 }).error, 'x_reauth');

/* H6 burst caps */
{
  const cfg = faucetConfig({ LOBBY_SESSION_SECRET: 'x', MINT, FAUCET_DAILY_CAP: '3', FAUCET_HOURLY_CAP: '2' });
  let m = {};
  m = noteSuccessfulClaim(m, cfg);
  m = noteSuccessfulClaim(m, cfg);
  const trip = checkRateLimits(m, cfg);
  assert.equal(trip.error, 'hourly_cap');
  assert.ok(trip.autoPausedUntil > Date.now());
  m = noteSuccessfulClaim(m, cfg);
  m = noteSuccessfulClaim(m, cfg);
  assert.equal(checkRateLimits(m, cfg).error, 'hourly_cap');
}

/* H7 grief vs farm */
{
  const victim = WALLET;
  const unproven = recordClaim({ byX: {}, byWallet: {} }, { xId: 'farm-1', wallet: victim, signature: 's1', proven: false });
  assert.equal(unproven.byWallet[victim], undefined, 'H7 unproven must not occupy byWallet (grief)');
  assert.equal(claimAllowed(unproven, { xId: 'farm-2', wallet: victim, proven: false }).error, 'prove wallet');
  const proven = recordClaim({ byX: {}, byWallet: {} }, { xId: 'owner', wallet: victim, signature: 's2', proven: true });
  assert.equal(claimAllowed(proven, { xId: 'other', wallet: victim, proven: true }).error, 'already claimed');
}

/* H8 rollback isolation */
{
  let s = reserveClaim({ byX: {}, byWallet: {} }, { xId: 'owner', wallet: WALLET, proven: true });
  s = reserveClaim(s, { xId: 'stranger', wallet: WALLET, proven: false });
  s = clearPendingClaim(s, { xId: 'stranger', wallet: WALLET, proven: false });
  assert.equal(s.byWallet[WALLET].xId, 'owner');
}

/* H9 SIWS */
{
  const now = Date.now();
  const siws = faucetSiwsInput({
    domain: FAUCET_SIWS_DOMAIN,
    publicKey: WALLET,
    nonce: 'n0nce',
    issuedAt: now,
    expirationTime: now + 60_000,
  });
  assert.match(siws.statement, /not a transaction/i);
  assert.match(siws.statement, /does not spend/i);
  assert.match(siws.statement, /approve/i);
  assert.doesNotMatch(siws.statement, /seed|private key|secret/i);
  const good = `${siws.domain} wants you to sign in with your Solana account:\n${siws.address}\n\n${siws.statement}\nNonce: ${siws.nonce}`;
  assert.equal(siwsMessageError(good, { publicKey: WALLET, domain: FAUCET_SIWS_DOMAIN, nonce: 'n0nce' }), '');
  assert.equal(siwsMessageError(good.replace(FAUCET_SIWS_DOMAIN, 'evil.example'), { publicKey: WALLET, domain: FAUCET_SIWS_DOMAIN, nonce: 'n0nce' }), 'siws_domain');
}

/* H10 donate fail-closed */
assert.deepEqual(donateFailClosed({ sig: 'empty' }), { error: 'sig miss' });
assert.deepEqual(donateFailClosed({}), { error: 'sig miss' });
assert.deepEqual(donateFailClosed({ signature: 'x'.repeat(80) }), { error: 'sig miss' });
{
  const now = Date.parse('2026-08-17T12:00:00.000Z');
  const baseTx = {
    blockTime: now / 1000 - 3600,
    meta: {
      err: null,
      preTokenBalances: [{ owner: TREASURY, mint: MINT, uiTokenAmount: { amount: '0' } }],
      postTokenBalances: [{ owner: TREASURY, mint: MINT, uiTokenAmount: { amount: '1000000000' } }],
    },
    transaction: { message: { accountKeys: [WALLET] } },
  };
  assert.equal(inspectDonateTx(baseTx, { now }).ok, true);
  assert.equal(inspectDonateTx({ ...baseTx, meta: { ...baseTx.meta, err: 'x' } }, { now }).error, 'sig miss');
  assert.equal(inspectDonateTx(baseTx, { now, faucetSigner: WALLET }).error, 'sig miss');
}

/* H11 replay must not paint tipped */
{
  const client = readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8');
  const claimFn = client.slice(client.indexOf('function claim(quiet)'), client.indexOf('function toBase58'));
  assert.match(claimFn, /replay/, 'H11 claim handler must branch on replay');
  assert.match(claimFn, /already claimed/, 'H11 already-claimed voice stays in the claim path');
  assert.doesNotMatch(
    claimFn,
    /error === 'already claimed'[\s\S]{0,180}state\.card = 4/,
    'H11 already-claimed + sig must not jump to the tipped card',
  );
  const replay = alreadyClaimedResponse({ signature: 'sig', wallet: WALLET, at: Date.now() });
  assert.equal(replay.ok, true);
  assert.equal(replay.replay, true);
}

/* H12 live observation — dest-check treasury must stay a named live defect, not a disk fail */
if (process.env.DASHA_FAUCET_HUNT_LIVE === '1') {
  const res = await fetch('https://lobby.getdasha.com/faucet/dest-check', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://www.getdasha.com' },
    body: JSON.stringify({ dest: TREASURY }),
  });
  const body = await res.json().catch(() => ({}));
  if (body.ok === true && body.kind === 'IS_WALLET') {
    finding('H12', 'LIVE dest-check still calls treasury IS_WALLET — Worker lag; disk destShapeError refuses');
  } else if (body.error === 'dest_treasury') {
    finding('H12', 'LIVE dest-check now refuses treasury (caught up with disk)');
  } else {
    finding('H12', `LIVE dest-check unexpected ${res.status} ${JSON.stringify(body)}`);
  }
}

{
  const client = readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8');
  assert.match(client, /kind !== 'IS_WALLET'/, 'H7 confirm card refuses tip me until SIWS');
  assert.match(client, /Prove wallet/, 'H7 confirm offers prove, not a silent send');
}

/* H13 stale pending (race: reserve then crash) */
{
  let s = reserveClaim({ byX: {}, byWallet: {} }, { xId: '1', wallet: WALLET, proven: true, at: 1 });
  assert.equal(claimAllowed(s, { xId: '1', wallet: WALLET, proven: true, now: 1 + 1_000 }).error, 'confirming');
  assert.equal(claimAllowed(s, { xId: '1', wallet: WALLET, proven: true, now: 1 + FAUCET_PENDING_MS }).ok, true);
}

/* H14 amount + cooldown visible */
{
  const client = readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8');
  assert.match(client, /amountUi/, 'H14 confirm/door names the tip size');
  assert.match(client, /\$dasha/, 'H14 $dasha amount is spoken');
  assert.match(client, /nextAt/, 'H15 already-claimed shows next tip day');
}

/* H16 ATA rent: treasury must not send if it cannot pay rent */
{
  const src = readFileSync(join(root, 'dasha-faucet-solana.mjs'), 'utf8');
  assert.match(src, /treasury_rent/, 'H16 rent failure is a first-class error');
  assert.match(src, /2_500_000/, 'H16 refuses create-ATA when signer SOL is below rent');
}

/* H17 worker dest-check never labels IS_WALLET */
{
  const worker = readFileSync(join(root, '.grok/worktrees/potter/dasha-2/dasha-lobby-worker.mjs'), 'utf8');
  const block = worker.slice(worker.indexOf("path === '/faucet/dest-check'"), worker.indexOf("path === '/faucet/wallet/challenge'"));
  assert.match(block, /Never label IS_WALLET/);
  assert.doesNotMatch(block, /kind:\s*['"]IS_WALLET['"]/);
}

assert.equal(Client.MINT, MINT);
console.log('dasha-faucet-hunt: PASS');
if (findings.length) {
  console.log('named holes (not disk fails):');
  for (const row of findings) console.log(' -', row);
}
