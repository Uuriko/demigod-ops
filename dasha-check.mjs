#!/usr/bin/env node
/**
 * Lane-local Dasha checks — prefer this over dasha:test:all after small edits.
 *
 *   node dasha-check.mjs              # auto from git status when possible
 *   node dasha-check.mjs home|board|desk|studio|lobby|ship|all
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const lane = (process.argv[2] || 'auto').toLowerCase();

function run(label, cmd, args) {
  console.log(JSON.stringify({ step: 'check', lane: label, cmd: [cmd, ...args].join(' ') }));
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

function dirtyPaths() {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) return [];
  return (r.stdout || '')
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter(Boolean);
}

function detectLane(paths) {
  const hit = (re) => paths.some((p) => re.test(p));
  if (hit(/dasha-ship|dasha-lobby-assets|dasha-audit-live|dasha-live-verify/)) return 'ship';
  if (hit(/simp-board|simp-score|simp-actions|lobby-worker|lobby-client|chess/)) return 'board';
  if (hit(/dasha-desk/)) return 'desk';
  if (hit(/meme-studio|studio-embed|studio\.js/)) return 'studio';
  if (hit(/lobby-page|lobby-embed|lobby-mod|lobby-x/)) return 'lobby';
  if (hit(/dasha-landing|how-to-buy|sitemap|robots/)) return 'home';
  return 'all';
}

const LANE = {
  home: () => {
    run('home', 'node', ['dasha-landing.test.mjs']);
    if (existsSync(join(root, 'dasha-faucet.test.mjs'))) run('home', 'node', ['dasha-faucet.test.mjs']);
    if (existsSync(join(root, 'dasha-faucet-ux.test.mjs'))) run('home', 'node', ['dasha-faucet-ux.test.mjs']);
    if (existsSync(join(root, 'dasha-faucet-hunt.test.mjs'))) run('home', 'node', ['dasha-faucet-hunt.test.mjs']);
    if (existsSync(join(root, 'dasha-listings-identity.test.mjs'))) run('home', 'node', ['dasha-listings-identity.test.mjs']);
  },
  board: () => {
    run('board', 'npm', ['run', 'dasha:test:simp']);
  },
  desk: () => {
    run('desk', 'node', ['dasha-desk/build.mjs', '--check']);
    run('desk', 'node', ['dasha-desk/dasha-share.test.mjs']);
  },
  studio: () => {
    run('studio', 'node', ['dasha-studio-embed-build.mjs', '--check']);
  },
  lobby: () => {
    run('lobby', 'node', ['dasha-lobby-assets-build.mjs', '--check']);
  },
  ship: () => {
    run('ship', 'node', ['dasha-ship.mjs', '--prep', '--gate']);
  },
  all: () => {
    run('all', 'npm', ['run', 'dasha:test:all']);
  },
};

const resolved = lane === 'auto' ? detectLane(dirtyPaths()) : lane;
if (!LANE[resolved]) {
  console.error(`unknown lane: ${lane} (home|board|desk|studio|lobby|ship|all|auto)`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, lane: resolved, mode: lane === 'auto' ? 'auto' : 'explicit' }));
LANE[resolved]();
console.log(JSON.stringify({ ok: true, lane: resolved, done: true }));
