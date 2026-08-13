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
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';

const LOCK = '/tmp/dasha-publish.lock';
const STALE_MS = 15 * 60_000;
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
  'dasha-lobby-static-gen.mjs',
  'dasha-lobby-client.js',
  'dasha-studio-embed.js',
  'dasha-simp-board-client.js',
  'dasha-chess.mjs',
  'dasha-forum.mjs',
  'dasha-lobby-mod.mjs',
  'dasha-lobby-x.mjs',
  'dasha-lobby-github.mjs',
];

const say = (line) => console.log(`deploy-guard: ${line}`);

// ---- R1: refuse to ship someone else's unfinished work ------------------------
const status = spawnSync('git', ['status', '--porcelain', '--', ...WORKER_INPUTS], { encoding: 'utf8' });
const dirty = (status.stdout || '').trim().split('\n').filter(Boolean);
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
