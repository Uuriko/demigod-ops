#!/usr/bin/env node
/**
 * Refuse a Worker deploy that would ship someone else's unfinished work, and stop two of us
 * deploying at once.
 *
 * Both failures happened today on this tree.
 *
 * R1 — deploy only committed state. A deploy from the shared root bundles whatever is on disk. An
 * asset-sync deploy by another agent picked up in-flight forum code of mine and shipped it. It
 * landed fine, but only because two serious bugs in it had been fixed minutes earlier: a single-key
 * store that blows the 128 KiB Durable Object value limit, and a push frame the page silently
 * drops. Thirty minutes earlier and both would be in production. A dirty worker input means someone
 * is mid-thought, and the fix is to ask them rather than to publish it for them.
 *
 * R2 — take the lock the ship already takes. dasha-ship.mjs acquires /tmp/dasha-publish.lock; the
 * bare deploy script acquired nothing, so any number of agents could deploy concurrently. Three of
 * my publishes failed on asset-hash races: disk advanced under a ship that was mid-flight.
 *
 * Deliberately advisory rather than absolute. --force exists because an operator asking for a
 * deploy is allowed to have one, and a guard with no exit gets removed by whoever it blocks at a
 * bad moment. It prints what it would have refused so the override is a decision, not a shrug.
 *
 * It WRAPS the deploy rather than preceding it. Checking and then exiting would release the lock
 * before wrangler ever started, which is a lock that protects nothing — the first version of this
 * file did exactly that.
 *
 *   node dasha-deploy-guard.mjs -- npx wrangler deploy -c dasha-lobby-wrangler.jsonc
 *   node dasha-deploy-guard.mjs --force -- npx wrangler deploy ...   # deploy anyway, saying so
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanBundleDir } from './dasha-worker-leak-scan.mjs';

const LOCK = '/tmp/dasha-publish.lock';
const STALE_MS = 15 * 60_000;
const ROOT = dirname(fileURLToPath(import.meta.url));
const DEPLOY_ROOT = join(ROOT, '.grok/worktrees/potter/dasha-2');
const force = process.argv.includes('--force');
/* dasha-ship invokes this from inside its own publish, where it ALREADY holds the lock and has
   already run driftedPins — a live pin-versus-served-bytes check that is strictly stronger than
   "is the file dirty". Without this the guard would deadlock the ship against itself, and R1 would
   block every publish for as long as any worker input is uncommitted, which on a tree three agents
   share is essentially always. From the ship: warn, do not block. Standalone: block. */
const fromShip = process.env.DASHA_DEPLOY_FROM_SHIP === '1';

/* The inputs a Worker deploy actually bundles. Not every file in the tree — only what ends up in
   the artifact, or the guard cries wolf on every unrelated edit and gets ignored. */
const WORKER_INPUTS = [
  'dasha-lobby-worker.mjs',
  'dasha-lobby-assets-build.mjs',
  'dasha-lobby-static-gen.mjs',
  'dasha-lobby-client.js',
  'dasha-studio-embed-build.mjs',
  'dasha-meme-studio.html',
  'dasha-studio-embed.js',
  'dasha-studio.webmanifest',
  'dasha-worker-assets/client/dasha-icon-192.png',
  'dasha-worker-assets/client/dasha-icon-512.png',
  'dasha-simp-board-client.js',
  'dasha-simp-actions.mjs',
  'dasha-simp-score.mjs',
  'dasha-chess.mjs',
  'dasha-faucet.mjs',
  'dasha-faucet-solana.mjs',
  'dasha-faucet-client.js',
  'dasha-faucet-page.html',
  'dasha-forum.mjs',
  'dasha-handoff-og.mjs',
  'dasha-simp-share-html.mjs',
  'dasha-lobby-mod.mjs',
  'dasha-lobby-x.mjs',
  'dasha-lobby-github.mjs',
  'dasha-x-connect-prompt.js',
  'dasha-landing.html',
  'dasha-how-to-buy.html',
  'dasha-chess-page.html',
  'dasha-lobby-page.html',
  'dasha-login-page.html',
  'dasha-robots.txt',
  'dasha-sitemap.xml',
  'dasha-worker-assets',
];

const say = (line) => console.log(`deploy-guard: ${line}`);

// ---- R0: CLAIMS.json exclusive-writer gate (same registry as dg-claim) ----------
{
  const preflight = process.env.DASHA_CLAIM_PREFLIGHT || join(ROOT, 'bin/dasha-claim-preflight');
  const claimOwner = process.env.DASHA_AGENT || process.env.DG_CLAIM_OWNER || 'grok-bot';
  const claimPaths = WORKER_INPUTS.filter((p) => p !== 'dasha-worker-assets');
  const pf = spawnSync(preflight, ['--owner', claimOwner, ...claimPaths], { encoding: 'utf8' });
  const out = `${pf.stdout || ''}${pf.stderr || ''}`.trim();
  if (pf.status === 10) {
    say('CLAIMS.json blocks this deploy (another owner holds Worker/static-gen/simp-board):');
    for (const line of out.split('\n')) say(`  ${line}`);
    say('Wait or bus the owner. --force does not override a live foreign claim.');
    process.exit(10);
  }
  if (pf.status && pf.status !== 0) {
    say(`claim preflight exited ${pf.status}${out ? `: ${out}` : ''}`);
    process.exit(pf.status ?? 2);
  }
  if (out.startsWith('UNCLAIMED')) say(`claim preflight UNCLAIMED as ${claimOwner} — claim before a contested write`);
  else if (out.startsWith('OWNED')) say(`claim preflight: ${claimOwner} already owns the overlapping claims`);
}


// ---- R1: refuse to ship someone else's unfinished work ------------------------
const dirty = [
  ['root', ROOT],
  ['dasha-2', DEPLOY_ROOT],
].flatMap(([label, cwd]) => {
  const status = spawnSync('git', ['status', '--porcelain', '--', ...WORKER_INPUTS], { cwd, encoding: 'utf8' });
  return (status.stdout || '').trim().split('\n').filter(Boolean).map((line) => `${label}: ${line}`);
}).concat([
  ['root', ROOT, 'dasha-lobby-wrangler.jsonc'],
  ['dasha-2', DEPLOY_ROOT, 'dasha-lobby-wrangler.deploy.jsonc'],
].flatMap(([label, cwd, path]) => {
  const status = spawnSync('git', ['status', '--porcelain', '--', path], { cwd, encoding: 'utf8' });
  return (status.stdout || '').trim().split('\n').filter(Boolean).map((line) => `${label}: ${line}`);
}));
if (dirty.length) {
  say('worker inputs are uncommitted:');
  for (const line of dirty) say(`  ${line}`);
  if (fromShip) {
    say('called from dasha-ship, which verifies pins against served bytes — reporting, not blocking.');
  } else if (!force) {
    say('');
    say('A deploy bundles whatever is on disk, so this would publish work someone has not finished.');
    say('Ask whoever holds it, or commit it if it is yours. Override with --force if you mean it.');
    process.exit(1);
  } else {
    say('--force given: publishing uncommitted work deliberately.');
  }
}

// The root command deliberately deploys from dasha-2: it is the tree with the live v2 migration
// and correctly routed /og assets. Refuse a split release even when dirty work was explicitly forced.
for (const path of WORKER_INPUTS.filter((path) => path !== 'dasha-worker-assets')) {
  const rootSource = join(ROOT, path);
  const deploySource = join(DEPLOY_ROOT, path);
  if (!existsSync(rootSource) || !existsSync(deploySource) || !readFileSync(rootSource).equals(readFileSync(deploySource))) {
    say(`root and dasha-2 Worker sources differ: ${path}`);
    process.exit(1);
  }
}
const routes = spawnSync(process.execPath, ['dasha-secondary-pages.test.mjs'], { cwd: ROOT, encoding: 'utf8' });
if (routes.status !== 0) {
  say(`canonical route contract failed; --force cannot retire public product routes:\n${routes.stderr || routes.stdout}`);
  process.exit(1);
}
const assetHash = (cwd) => readFileSync(join(cwd, 'dasha-lobby-static-gen.mjs'), 'utf8')
  .match(/ASSET_HASH\s*=\s*["']([^"']+)/)?.[1] || null;
const rootHash = assetHash(ROOT);
const deployHash = assetHash(DEPLOY_ROOT);
if (!rootHash || deployHash !== rootHash) {
  say(`root and dasha-2 asset hashes differ (${rootHash || 'missing'} vs ${deployHash || 'missing'}); reconcile before deploy.`);
  process.exit(1);
}

const rootConfig = readFileSync(join(ROOT, 'dasha-lobby-wrangler.jsonc'), 'utf8');
const deployConfig = readFileSync(join(DEPLOY_ROOT, 'dasha-lobby-wrangler.deploy.jsonc'), 'utf8');
if (rootConfig !== deployConfig || !/"tag"\s*:\s*"v2"/.test(deployConfig) || !/"class_name"\s*:\s*"DashaFaucet"/.test(deployConfig)) {
  say('root and dasha-2 Wrangler configs must match and retain the DashaFaucet v2 migration.');
  process.exit(1);
}

for (const [label, cwd] of [['root', ROOT], ['dasha-2', DEPLOY_ROOT]]) {
  const studio = spawnSync(process.execPath, ['dasha-studio-embed-build.mjs', '--check'], { cwd, encoding: 'utf8' });
  if (studio.status !== 0) {
    say(`${label} Studio loader/client failed build --check:\n${studio.stderr || studio.stdout}`);
    process.exit(1);
  }
  const check = spawnSync(process.execPath, ['dasha-lobby-assets-build.mjs', '--check'], { cwd, encoding: 'utf8' });
  if (check.status !== 0) {
    say(`${label} lobby assets failed build --check:\n${check.stderr || check.stdout}`);
    process.exit(1);
  }
}
for (const path of [
  'dasha-worker-assets/og/dasha-social-card.png',
  'dasha-worker-assets/og/grwm-loop.mp4',
  'dasha-worker-assets/og/grwm.jpg',
  'dasha-worker-assets/og/grwm.mp4',
  'dasha-worker-assets/client/faucet.avif',
]) {
  if (!existsSync(join(DEPLOY_ROOT, path))) {
    say(`dasha-2 deploy asset missing: ${path}`);
    process.exit(1);
  }
}

// Compile the exact deploy tree first, then scan generated JavaScript without ever printing a match.
const bundleDir = mkdtempSync(join(tmpdir(), 'dasha-worker-bundle-'));
let bundleFailed = false, bundleLeaks = [];
try {
  const bundle = spawnSync('npx', [
    '--yes', 'wrangler@4.120.1', 'deploy', '--dry-run', `--outdir=${bundleDir}`,
    '-c', 'dasha-lobby-wrangler.deploy.jsonc',
  ], { cwd: DEPLOY_ROOT, encoding: 'utf8', timeout: 120_000 });
  bundleFailed = bundle.status !== 0;
  if (!bundleFailed) bundleLeaks = scanBundleDir(bundleDir);
} finally {
  rmSync(bundleDir, { recursive: true, force: true });
}
if (bundleFailed) {
  say('Wrangler dry bundle failed; refusing deploy. Run the documented dry-run directly for diagnostics.');
  process.exit(1);
}
if (bundleLeaks.length) {
  say('generated Worker bundle contains credential-shaped literals:');
  for (const leak of bundleLeaks) say(`  ${leak.file}: ${leak.kinds.join(', ')}`);
  process.exit(1);
}

// ---- R2: one deploy at a time -------------------------------------------------
if (!fromShip && existsSync(LOCK)) {
  let held = null;
  try { held = JSON.parse(readFileSync(LOCK, 'utf8')); } catch { /* unreadable lock is a stale lock */ }
  const age = held?.at ? Date.now() - held.at : Infinity;
  const alive = held?.pid ? (() => { try { process.kill(held.pid, 0); return true; } catch { return false; } })() : false;
  if (alive && age < STALE_MS) {
    say(`another deploy or ship holds the lock: ${held.by || 'unknown'} pid ${held.pid}, ${Math.round(age / 1000)}s ago`);
    if (!force) {
      say('Wait for it to finish. Two deploys at once is how disk advances under a ship mid-flight.');
      process.exit(1);
    }
    say('--force given: taking the lock from a live holder.');
  } else {
    say(`clearing a stale lock (${held?.by || 'unknown'}, ${Number.isFinite(age) ? Math.round(age / 1000) + 's' : 'unknown age'}, process ${alive ? 'alive' : 'gone'})`);
  }
}

if (!fromShip) {
  writeFileSync(LOCK, JSON.stringify({ by: process.env.DASHA_AGENT || 'deploy', pid: process.pid, at: Date.now() }), { mode: 0o600 });
}
/* Released on the way out however that happens — a guard that leaks its lock on failure is worse
   than no guard, because the next agent then clears it and learns to ignore locks. */
const release = () => { if (fromShip) return; try { unlinkSync(LOCK); } catch { /* already gone */ } };
process.on('exit', release);
process.on('SIGINT', () => { release(); process.exit(130); });
process.on('SIGTERM', () => { release(); process.exit(143); });

say(`clear to deploy${force ? ' (forced)' : ''} — ${WORKER_INPUTS.length} worker inputs checked, lock held`);

// ---- run the deploy while holding the lock -----------------------------------
const command = process.argv.slice(2).filter((a) => a !== '--force');
const sep = command.indexOf('--');
const argv = sep >= 0 ? command.slice(sep + 1) : command;
if (!argv.length) {
  say('nothing to run — pass the deploy command after --');
  process.exit(2);
}
const child = spawnSync(argv[0], argv.slice(1), { stdio: 'inherit' });
say(child.status === 0 ? 'deploy finished, lock released' : `deploy exited ${child.status}, lock released`);
process.exit(child.status ?? 1);
