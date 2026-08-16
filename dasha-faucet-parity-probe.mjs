#!/usr/bin/env node
/**
 * Live vs disk faucet parity probe (fetch-only + static imports).
 * Never deploys. Exit 0 always with ok:false when lag; use --strict to hard-fail.
 *
 *   node dasha-faucet-parity-probe.mjs
 *   node dasha-faucet-parity-probe.mjs --strict
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAUCET_MINT,
  FAUCET_TREASURY_DEFAULT,
  buildStatus,
  faucetConfig,
} from './dasha-faucet.mjs';

const strict = process.argv.includes('--strict');
const base = process.env.DASHA_LIVE_BASE || 'https://www.getdasha.com';
const lobby = process.env.DASHA_LOBBY_BASE || 'https://lobby.getdasha.com';
const root = dirname(fileURLToPath(import.meta.url));

async function get(url, init = {}) {
  const r = await fetch(url, {
    redirect: 'manual',
    headers: { 'user-agent': 'DashaFaucetParity/1.0', ...(init.headers || {}) },
    ...init,
  });
  const text = r.status >= 200 && r.status < 300 ? await r.text() : '';
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: r.status,
    edge: r.headers.get('x-dasha-edge') || '',
    location: r.headers.get('location') || '',
    text,
    json,
  };
}

const STATUS_KEYS = [
  'configured',
  'funded',
  'amountRaw',
  'amountUi',
  'mint',
  'decimals',
  'cooldownDays',
  'treasury',
];

const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
const client = readFileSync(join(root, 'dasha-faucet-client.js'), 'utf8');
const robots = readFileSync(join(root, 'dasha-robots.txt'), 'utf8');

const disk = {
  productFaucet: worker.includes('FAUCET_PAGE_HTML') && worker.includes("X-Dasha-Edge': 'faucet'"),
  sendTip: worker.includes('sendTipTransfer'),
  trapsRetired: (() => {
    const m = worker.match(/const RETIRED_SEO_PATHS = new Set\(\[([\s\S]*?)\]\);/);
    return m && !m[1].includes("'/faucet'") && m[1].includes("'/airdrop'");
  })(),
  clientEmptyUx: /Treasury empty|treasury_empty/.test(client),
  clientMint: client.includes(FAUCET_MINT),
  robotsAllowFaucet: robots.includes('Allow: /faucet'),
  robotsDisallowAirdrop: robots.includes('Disallow: /airdrop'),
  emptyStatus: buildStatus(
    faucetConfig({
      LOBBY_SESSION_SECRET: 'parity',
      MINT: FAUCET_MINT,
      FAUCET_TREASURY: FAUCET_TREASURY_DEFAULT,
    }),
    { balanceRaw: 0n, rpcOk: true },
  ),
};

const liveFaucet = await get(`${base}/faucet`);
const liveAirdrop = await get(`${base}/airdrop`);
const liveStatus = await get(`${lobby}/faucet/status`);
const liveMe = await get(`${lobby}/faucet/me`);
const liveClaim = await get(`${lobby}/faucet/claim`, {
  method: 'POST',
  headers: {
    origin: 'https://www.getdasha.com',
    'content-type': 'application/json',
  },
  body: '{}',
});

const live = {
  faucetPage: {
    status: liveFaucet.status,
    edge: liveFaucet.edge,
    hasClient: /faucet\.js|dasha-faucet/i.test(liveFaucet.text),
  },
  airdropTrap: {
    status: liveAirdrop.status,
    location: liveAirdrop.location,
    // Disk wants 308; live may still 200 SEO stub
    retired: liveAirdrop.status === 308 || liveAirdrop.status === 404,
  },
  status: liveStatus.json,
  me: liveMe.json,
  claimNoSession: liveClaim.json,
};

const checks = [];
function check(id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail: detail || null });
}

check('disk.productFaucet', disk.productFaucet);
check('disk.sendTip', disk.sendTip);
check('disk.trapsRetired', disk.trapsRetired);
check('disk.clientEmptyUx', disk.clientEmptyUx);
check('disk.clientMint', disk.clientMint);
check('disk.robotsAllowFaucet', disk.robotsAllowFaucet);
check('disk.emptyStatus.treasury_empty', disk.emptyStatus.error === 'treasury_empty' && !disk.emptyStatus.funded);

check('live.faucet.200', liveFaucet.status === 200, `status=${liveFaucet.status}`);
check('live.faucet.hasClient', live.faucetPage.hasClient);
check(
  'live.status.mint',
  liveStatus.json?.mint === FAUCET_MINT,
  liveStatus.json?.mint || `http ${liveStatus.status}`,
);
check(
  'live.status.treasury',
  !liveStatus.json?.treasury || liveStatus.json.treasury === FAUCET_TREASURY_DEFAULT,
  liveStatus.json?.treasury,
);
check('live.status.amountUi', liveStatus.json?.amountUi === 100 || liveStatus.json?.amountUi === disk.emptyStatus.amountUi);
check(
  'live.status.keys',
  STATUS_KEYS.every((k) => liveStatus.json && Object.prototype.hasOwnProperty.call(liveStatus.json, k)),
  liveStatus.json ? Object.keys(liveStatus.json).join(',') : 'no json',
);
check(
  'live.status.emptyOrUnfunded',
  liveStatus.json && (liveStatus.json.funded === false || liveStatus.json.error === 'treasury_empty'),
  JSON.stringify({ funded: liveStatus.json?.funded, error: liveStatus.json?.error }),
);
check('live.me.shape', liveMe.json && typeof liveMe.json.linked === 'boolean');
check(
  'live.claim.needsIdentity',
  // Unauthenticated claim must not succeed; 401/403 or identity errors are all fine.
  liveClaim.status === 401 ||
    liveClaim.status === 403 ||
    (liveClaim.json &&
      (liveClaim.json.error === 'link X first' ||
        liveClaim.json.error === 'origin required' ||
        liveClaim.json.error === 'dest_not_wallet' ||
        liveClaim.json.error === 'not_configured')),
  liveClaim.json?.error || `http ${liveClaim.status}`,
);

// Parity: disk empty model vs live when live unfunded
const statusParity =
  liveStatus.json &&
  liveStatus.json.mint === FAUCET_MINT &&
  Number(liveStatus.json.amountUi) === Number(disk.emptyStatus.amountUi) &&
  Number(liveStatus.json.cooldownDays) === 30;
check('parity.status.coreFields', statusParity);

const lag = [];
if (live.faucetPage.status === 200 && !live.faucetPage.hasClient) lag.push('live-faucet-shell-weak');
if (!live.airdropTrap.retired) lag.push('live-airdrop-still-product-or-stub');
if (liveStatus.json?.mint !== FAUCET_MINT) lag.push('live-status-mint-mismatch');
if (!disk.sendTip) lag.push('disk-missing-sendTip');
if (disk.productFaucet && liveFaucet.status !== 200) lag.push('live-faucet-down');
// Deploy safety: disk has full transfer; live may differ until deploy
if (disk.sendTip) lag.push('disk-ahead-transfer-not-deployed'); // informational — always true pre-deploy

const failed = checks.filter((c) => !c.ok);
const ok = failed.length === 0;

const report = {
  ok,
  strict,
  base,
  lobby,
  disk: {
    productFaucet: disk.productFaucet,
    sendTip: disk.sendTip,
    trapsRetired: disk.trapsRetired,
    emptyStatus: disk.emptyStatus,
  },
  live,
  checks,
  failed: failed.map((c) => c.id),
  lag,
  deployHint: ok
    ? 'Core parity holds for empty status shape; still run dry-verify + staging before deploy.'
    : 'Fix failed checks before any deploy.',
};

console.log(JSON.stringify(report, null, 2));
if (strict && !ok) process.exit(1);
if (strict && lag.includes('live-status-mint-mismatch')) process.exit(1);
console.error(ok ? 'dasha-faucet-parity-probe: PASS' : 'dasha-faucet-parity-probe: LAG (non-strict ok)');
