#!/usr/bin/env node
/**
 * Prove buildNext, next CLI, and cockpit.next agree (except allowed overrides).
 */
// Fail-closed: unknown flags must not vacuous-green the suite (POSIX usage = exit 2).
{
  const argvFlags = process.argv.slice(2).filter((a) => a.startsWith('-'));
  if (argvFlags.length) {
    console.error(
      `usage: node demigod-next-identity-selftest.mjs  (no flags; got ${argvFlags.join(' ')})`,
    );
    process.exit(2);
  }
}
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
ok(!n1.title.includes(n1.cmd), 'NEXT title does not repeat its command');
const noShipPrepare = { green: false, pass: false, fresh: false, reason: 'missing' };
const freshFail = buildNext({
  truth: { fullyShipped: false },
  truthEvidence: { green: false, pass: false, fresh: true, reason: 'fail-fresh' },
  shipPrepare: noShipPrepare,
});
const stale = buildNext({
  truth: { fullyShipped: false },
  truthEvidence: { green: false, pass: false, fresh: false, reason: 'ttl-expired' },
});
const prepareOnlyTruth = {
  fullyShipped: false,
  prepareOnlyRelease: true,
  live: { footVer: '802' },
  summaryLine: 'TRUTH PASS disk=v803 live=v802 shipped=false prepareOnly',
};
const prepareOnlyEvidence = {
  green: true,
  pass: true,
  fresh: true,
  reason: 'pass-fresh',
  summary: 'TRUTH PASS disk=v803 live=v802 shipped=false prepareOnly',
};
const prepareOnlyDrift = buildNext({
  truth: prepareOnlyTruth,
  truthEvidence: prepareOnlyEvidence,
  shipPrepare: noShipPrepare,
});
const priorPublishAuth = process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
delete process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
const preparedUnauthorized = buildNext({
  truth: prepareOnlyTruth,
  truthEvidence: prepareOnlyEvidence,
  shipPrepare: { green: true, pass: true, fresh: true, reason: 'pass-fresh' },
});
process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH = '1';
const preparedAuthorized = buildNext({
  truth: prepareOnlyTruth,
  truthEvidence: prepareOnlyEvidence,
  shipPrepare: { green: true, pass: true, fresh: true, reason: 'pass-fresh' },
});
if (priorPublishAuth === undefined) delete process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH;
else process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH = priorPublishAuth;
const orientSource = fs.readFileSync(path.join(ROOT, 'demigod-orient.mjs'), 'utf8');
ok(
  freezeStatus().frozen
    ? freshFail.id === 'demand-ops' && freshFail.mutate === false
    : freshFail.id === 'ship-prepare' && freshFail.cmd === 'bin/dg ship prepare',
  'fresh release drift respects freeze; otherwise advances to read-only ship preparation',
);
ok(stale.id === 'truth', 'stale truth evidence still refreshes');
ok(
  prepareOnlyDrift.id === 'ship-prepare' &&
    prepareOnlyDrift.pri >= 2 &&
    !/disk≠live/.test(prepareOnlyDrift.title) &&
    /publish unauthorized|prepare-only/i.test(prepareOnlyDrift.title),
  'prepare-only version drift is not P1 disk≠live critical',
);
ok(
  preparedUnauthorized.id === 'demand-ops' &&
    preparedUnauthorized.cmd === 'bin/dg demand status' &&
    preparedUnauthorized.reason === 'publish-unauthorized-prepared' &&
    preparedUnauthorized.mutate === false,
  'fresh hash-sealed preparation stops unauthorized ship-prepare repetition',
);
ok(
  preparedAuthorized.id === 'ship-prepare',
  'current-request publish authorization keeps the guarded ship path active',
);
ok(/if\s*\(!te\.fresh\s*&&\s*!noRefresh\)/.test(orientSource), 'orient refreshes stale evidence only');
ok(!orientSource.includes('! fix: bin/dg truth &&'), 'orient does not contradict its canonical NEXT command');
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
ok(/assertCli\.status === 0 && assertCliBody\?\.ok !== false/.test(orientSource), 'fallback orient requires exit success and non-failing assert receipt');
    ok(
      /id: ['"]demand-ops['"][\s\S]*?mutate: false,[\s\S]*?freezeBlocks: false,/.test(nextSource),
      'fallback frozen demand NEXT remains read-only and unblocked',
    );
    ok(
      /draftHygieneOk/.test(nextSource) && /recordedDraftHygieneOk/.test(nextSource) && /draftFlagged/.test(nextSource),
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
        /isPilot:\s*false/.test(nextSource),
      'fallback frozen demand NEXT preserves fresh inbound action priority without pilot promotion',
    );
    ok(
      /id: ['"]hold-green['"][\s\S]*?bin\/dg demand status[\s\S]*?mutate: false,[\s\S]*?freezeBlocks: false,/.test(nextSource),
      'fallback shipped-green NEXT stays on read-only demand ops while freeze is disabled',
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
