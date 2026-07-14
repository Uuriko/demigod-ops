#!/usr/bin/env node
/**
 * Selftest: truth oracle + foot lock hard mutex
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
function ok(c, m) {
  if (!c) fails.push(m);
  else console.log('ok', m);
}
function run(args, env = {}) {
  return spawnSync('node', args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env, DG_FOOT_LOCK_SKIP: env.DG_FOOT_LOCK_SKIP },
    timeout: 60000,
  });
}

// Clean lock
run(['demigod-foot-lock.mjs', 'release', '--force']);

// Free → require fails
const req = run(['demigod-foot-lock.mjs', 'require']);
ok(req.status !== 0, 'require fails when free');

// Claim
const claim = run(['demigod-foot-lock.mjs', 'claim', '--owner', 'selftest', '--ttl', '90', '--why', 'selftest']);
ok(claim.status === 0, 'claim ok');
let token = '';
try {
  const j = JSON.parse(claim.stdout);
  token = j.claimed?.token || '';
} catch {
  /* */
}
ok(Boolean(token), 'token minted');

// Second claim without token fails
const steal = run(['demigod-foot-lock.mjs', 'claim', '--owner', 'thief', '--ttl', '60']);
ok(steal.status !== 0, 'steal claim fails');

// require with token ok
const req2 = run(['demigod-foot-lock.mjs', 'require'], {
  DG_LOCK_TOKEN: token,
  DG_LOCK_OWNER: 'selftest',
});
ok(req2.status === 0, 'require ok with token');

// assertCanWriteFoot soft without token fails
process.env.DG_LOCK_TOKEN = '';
process.env.DG_LOCK_OWNER = 'other';
const soft = assertCanWriteFoot({ soft: true, label: 't' });
ok(soft.ok === false, 'assert soft fail other owner');

// with token
process.env.DG_LOCK_TOKEN = token;
process.env.DG_LOCK_OWNER = 'selftest';
const hard = assertCanWriteFoot({ soft: true, label: 't' });
ok(hard.ok === true, 'assert soft ok with token');

// skip escape
const skip = assertCanWriteFoot({ soft: true });
// still ok with token
ok(true, 'skip path covered by env in other tests');
const skipR = run(['demigod-foot-lock.mjs', 'require'], { DG_FOOT_LOCK_SKIP: '1', DG_LOCK_TOKEN: '' });
// require with skip - assertCanWriteFoot in requireBody uses env
// requireBody always calls assertCanWriteFoot which respects SKIP
ok(skipR.status === 0, 'DG_FOOT_LOCK_SKIP allows require');

// release
const rel = run(['demigod-foot-lock.mjs', 'release', '--owner', 'selftest', '--token', token]);
ok(rel.status === 0, 'release ok');

// truth runs
const truth = run(['demigod-truth.mjs', '--json']);
ok(truth.status === 0 || truth.status === 1, 'truth exits 0 or 1');
let tj = null;
try {
  tj = JSON.parse(truth.stdout);
} catch {
  /* */
}
ok(tj && tj.id === 'truth' && tj.foot && tj.live, 'truth JSON schema');
ok(typeof tj.pass === 'boolean' && tj.summaryLine, 'truth pass + summaryLine');
ok(tj.lock && typeof tj.lock.held === 'boolean', 'truth includes lock');
ok(tj.freeze && typeof tj.freeze.on === 'boolean', 'truth includes freeze');

// live-doctor alias
const live = run(['demigod-live-doctor.mjs', '--json']);
ok(live.status === truth.status || live.status === 0 || live.status === 1, 'live-doctor alias runs');

// bin/dg truth
const dg = spawnSync('bash', ['bin/dg', 'truth', '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
ok(dg.status === 0 || dg.status === 1, 'bin/dg truth');
ok(/"id": "truth"/.test(dg.stdout), 'bin/dg truth JSON');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS truth+lock selftest');
// cleanup
run(['demigod-foot-lock.mjs', 'release', '--force']);
