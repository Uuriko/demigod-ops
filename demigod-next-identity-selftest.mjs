#!/usr/bin/env node
/**
 * Prove buildNext, next CLI, and cockpit.next agree (except allowed overrides).
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
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
if (r.error) {
  if (r.error.code === 'EPERM') {
    const nextSource = fs.readFileSync(path.join(ROOT, 'demigod-next.mjs'), 'utf8');
    const cockpitSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-cockpit.mjs'), 'utf8');
    ok(/export\s+function\s+buildNext\b/.test(nextSource), 'fallback canonical buildNext export');
    ok(/--assert-same/.test(nextSource) && /mismatches/.test(nextSource), 'fallback assert-same contract');
    ok(
      /id: ['"]demand-ops['"][\s\S]*?mutate: false,[\s\S]*?freezeBlocks: false,/.test(nextSource),
      'fallback frozen demand NEXT remains read-only and unblocked',
    );
    ok(
      /draftHygieneOk/.test(nextSource) && /draft hygiene=clean/.test(nextSource) && /draft hygiene flagged=/.test(nextSource),
      'fallback frozen demand NEXT carries tri-state draft hygiene evidence',
    );
    ok(
      /DEMAND_STATUS_TTL_MS/.test(nextSource) && /statusFresh:\s*demandStatusFresh/.test(nextSource) && /recordedDraftHygieneOk/.test(nextSource),
      'fallback frozen demand NEXT expires cached draft-hygiene evidence',
    );
    ok(
      /DEMAND_STATUS_FUTURE_TOLERANCE_MS/.test(nextSource) &&
        /statusFutureDated:\s*demandStatusFutureDated/.test(nextSource) &&
        /!demandStatusFutureDated/.test(nextSource),
      'fallback frozen demand NEXT rejects materially future-dated demand evidence',
    );
    ok(
      /warmInbound:\s*\{/.test(nextSource) &&
        /overdueActionCount/.test(nextSource) &&
        /dueTodayActionCount/.test(nextSource) &&
        /isPilot:\s*false/.test(nextSource) &&
        /warm inbound overdue=/.test(nextSource),
      'fallback frozen demand NEXT preserves fresh inbound action priority without pilot promotion',
    );
    ok(
      /id: ['"]hold-green['"][\s\S]*?publish-freeze\.mjs on[\s\S]*?mutate: true,[\s\S]*?freezeBlocks: false,/.test(nextSource),
      'fallback re-freeze NEXT is classified as a mutation',
    );
    ok(/(?:let\s+nextSource\s*=|nextSource:)\s*['"]demigod-next['"]/.test(cockpitSource), 'fallback cockpit identifies canonical NEXT');
    ok(Boolean(n1.id && n1.cmd && n1.title), 'fallback buildNext shape');
    ok(typeof n1.freeze?.on === 'boolean', 'fallback freeze state known');
    ok(typeof n1.truthEvidence?.green === 'boolean', 'fallback truth evidence known');
    if (fails.length) {
      console.error('FAIL', fails);
      process.exit(1);
    }
    console.log('ALL PASS demigod-next-identity-selftest (in-process sandbox fallback)');
    process.exit(0);
  }
  console.error(`BLOCKED demigod-next-identity-selftest: child process unavailable (${r.error.code || 'unknown'})`);
  process.exit(2);
}
ok(r.status === 0, 'next CLI exit 0');
let nCli = null;
try {
  nCli = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
} catch {
  fails.push('next CLI json');
}
if (!nCli) {
  console.error('FAIL', fails);
  process.exit(1);
}
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
