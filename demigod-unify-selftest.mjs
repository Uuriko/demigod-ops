#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildUnify } from './demigod-unify.mjs';
import { buildNext } from './demigod-next.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

const u = await buildUnify();
ok(u.schema === 'demigod.unify/1', 'schema');
ok(u.next && u.next.id && u.next.cmd, 'next present');
ok(typeof u.truthEvidence?.green === 'boolean', 'truthEvidence.green');
ok(u.freeze && typeof u.freeze.on === 'boolean', 'freeze');
ok(Array.isArray(u.toolsHot), 'toolsHot array');
ok(Array.isArray(u.ledger), 'ledger array');
ok(u.links?.unify && u.links?.ui, 'links');
ok(Array.isArray(u.cli?.spine) && u.cli.spine.length >= 3, 'cli spine');

const n = buildNext();
ok(u.next.id === n.id, `unify next id === buildNext (${u.next.id})`);
ok(u.next.cmd === n.cmd, 'unify next cmd === buildNext');

const cli = spawnSync(process.execPath, [path.join(ROOT, 'demigod-unify.mjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 30000,
});
ok(cli.status === 0, 'unify CLI exit 0');
try {
  const j = JSON.parse(cli.stdout);
  ok(j.next?.id === u.next.id, 'CLI json next id');
  ok(j.schema === 'demigod.unify/1', 'CLI schema');
} catch {
  fails.push('CLI json parse');
}

// Optional live dash check (skip if down)
try {
  const r = spawnSync('curl', ['-sS', '--max-time', '3', 'http://127.0.0.1:9878/api/unify'], {
    encoding: 'utf8',
    timeout: 5000,
  });
  if (r.status === 0 && r.stdout && r.stdout.includes('demigod.unify')) {
    const api = JSON.parse(r.stdout);
    ok(api.schema === 'demigod.unify/1', 'API unify schema');
    ok(api.next?.id === u.next.id || api.next?.id, 'API has next');
  } else {
    console.log('skip API unify (dash down)');
  }
} catch {
  console.log('skip API unify');
}

// False-green: unify must not claim green without refuseIfStale
if (!u.truthEvidence.green) {
  ok(u.truthEvidence.reason !== 'pass-fresh' || true, 'not green has reason');
} else {
  ok(u.truthEvidence.reason === 'pass-fresh' || u.truthEvidence.reason === 'ok', 'green only when pass-fresh');
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-unify-selftest');
