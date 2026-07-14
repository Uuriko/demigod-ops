#!/usr/bin/env node
/**
 * Prove buildNext, next CLI, and cockpit.next agree (except allowed overrides).
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildNext } from './demigod-next.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

const n1 = buildNext();
const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-next.mjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 15000,
});
ok(r.status === 0, 'next CLI exit 0');
const nCli = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
ok(n1.id === nCli.id, `buildNext id === CLI id (${n1.id})`);
ok(n1.cmd === nCli.cmd, 'buildNext cmd === CLI cmd');
ok(n1.freeze?.on === nCli.freeze?.on, 'freeze agree');

const te = refuseIfStale('truth');
const fz = freezeStatus();
ok(typeof te.green === 'boolean', 'truth evidence green known');

const cock = spawnSync(process.execPath, [path.join(ROOT, 'demigod-agent-cockpit.mjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 60000,
});
// cockpit exits 2 when next.pri<=1 (attention); still a successful run if JSON present
ok(cock.status !== null && cock.status !== 127 && !(cock.error), 'cockpit runs');
let c = null;
try {
  c = JSON.parse(cock.stdout.slice(cock.stdout.indexOf('{')));
} catch {
  fails.push('cockpit json');
}
if (c?.next) {
  const overrideIds = new Set(['live-down', 'board-honesty', 'verify-source']);
  if (overrideIds.has(c.next.id)) {
    ok(true, `cockpit override allowed: ${c.next.id}`);
  } else {
    ok(c.next.id === n1.id, `cockpit next id === buildNext (${c.next.id} vs ${n1.id})`);
    ok(c.nextSource === 'demigod-next', `nextSource demigod-next (got ${c.nextSource})`);
  }
  if (te.green && fz.frozen && !overrideIds.has(c.next.id)) {
    ok(
      c.next.id === 'demand-ops' ||
        c.next.id === 'demand-human' ||
        /demand/i.test(c.next.cmd || ''),
      'green+freeze → demand path',
    );
  }
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-next-identity-selftest');
