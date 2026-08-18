#!/usr/bin/env node
/**
 * Worker import / faucet module smoke — no deploy, no network required except optional.
 *
 *   node dasha-faucet-bundle-smoke.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// 1) Noble resolves (Worker will bundle it)
const noblePath = require.resolve('@noble/ed25519');
assert.ok(existsSync(noblePath), 'noble ed25519 missing');

// 2) Faucet modules load
const faucet = await import('./dasha-faucet.mjs');
const solana = await import('./dasha-faucet-solana.mjs');
await import('./dasha-lobby-static-gen.mjs');
await import('./dasha-lobby-worker.mjs');
assert.equal(typeof faucet.buildStatus, 'function');
assert.equal(typeof solana.sendTipTransfer, 'function');
assert.equal(typeof solana.buildSignedTipTx, 'function');
assert.equal(typeof solana.simulateTipTransfer, 'function');
assert.equal(typeof solana.associatedTokenAddress, 'function');

// 3) Worker source references stay coherent
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
for (const needle of [
  "from './dasha-faucet.mjs'",
  "from './dasha-faucet-solana.mjs'",
  'sendTipTransfer',
  'FAUCET_CLIENT_JS',
  'FAUCET_PAGE_HTML',
  'handleFaucet',
]) {
  assert.ok(worker.includes(needle), `worker missing ${needle}`);
}

// 4) Static gen embeds faucet client
const gen = readFileSync(join(root, 'dasha-lobby-static-gen.mjs'), 'utf8');
assert.ok(gen.includes('export const FAUCET_CLIENT_JS'), 'static gen missing FAUCET_CLIENT_JS');
assert.ok(gen.includes('export const FAUCET_PAGE_HTML'), 'static gen missing FAUCET_PAGE_HTML');
assert.ok(gen.includes('global.DashaFaucet') || gen.includes('DashaFaucet'), 'embedded client missing export');

// 5) Assets build lists solana dep for hash
const build = readFileSync(join(root, 'dasha-lobby-assets-build.mjs'), 'utf8');
assert.ok(build.includes('dasha-faucet-solana.mjs'), 'assets build must hash faucet-solana');

// 6) Optional wrangler dry bundle (best-effort; skip if wrangler cannot bind)
let wrangler = null;
try {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(
    'npx',
    ['wrangler', 'deploy', '--dry-run', '--outdir=./.dasha-faucet-bundle-tmp', '--config=dasha-lobby-wrangler.jsonc'],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || 'dry-run-skip-auth' },
    },
  );
  wrangler = {
    attempted: true,
    status: r.status,
    // dry-run may fail without account auth; treat "Bundle" success lines as soft ok
    hasBundleHint: /bundle|Built|dry-run|Total Upload/i.test(`${r.stdout}\n${r.stderr}`),
    stderrTail: String(r.stderr || '').slice(-400),
    stdoutTail: String(r.stdout || '').slice(-400),
  };
} catch (e) {
  wrangler = { attempted: false, error: String(e.message || e) };
}

const report = {
  ok: true,
  noblePath,
  imports: ['dasha-faucet.mjs', 'dasha-faucet-solana.mjs', 'worker refs', 'static-gen'],
  wrangler,
  note: 'Import smoke is authoritative. Wrangler dry-run may fail without CF credentials — non-blocking.',
};
console.log(JSON.stringify(report, null, 2));
console.error('dasha-faucet-bundle-smoke: PASS');
