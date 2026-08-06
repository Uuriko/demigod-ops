import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Derive the repo root from this file, never a hardcoded '/home/potter'. The absolute path made
// this test pass on one laptop and fail everywhere else: CI checks out to
// /home/runner/work/demigod-ops, so spawning `${SOURCE}/demigod-useful-loop.mjs` threw
// MODULE_NOT_FOUND on the first clean-room run even though both modules are tracked.
const SOURCE = path.dirname(fileURLToPath(import.meta.url));

function run(script, root, busy, pathEnv) {
  const r = spawnSync(process.execPath, [path.join(SOURCE, script)], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    env: { ...process.env, DEMIGOD_ROOT: root, DEMIGOD_BUSY: busy, PATH: pathEnv },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
}

function rows(queue) {
  return fs.existsSync(queue)
    ? fs.readFileSync(queue, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : [];
}

/* Rows work-find emits every run regardless of what changed (`always: true`) are STANDING work,
   not discovery — on a clean fixture that is reseal-run (research seal has no evidence) and
   ship-prepare. This test is named for discovery idempotence, so the "nothing new was found"
   assertions must look at discovered rows only. The length assertions deliberately keep counting
   always-rows: they are keyed hourly, so a second run inside the same hour must NOT duplicate
   them, which is exactly the dedupe property under test. */
function discovered(queue) {
  return rows(queue).filter((row) => !row.always);
}

function runUsefulLoop(root, busy) {
  const env = { ...process.env, DEMIGOD_ROOT: root, DEMIGOD_BUSY: busy, USEFUL_LOOP_MAX_TASKS: '1' };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, [path.join(SOURCE, 'demigod-useful-loop.mjs'), 'once'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    env,
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(fs.readFileSync(path.join(busy, 'useful-loop-last.json'), 'utf8'));
}

test('unchanged discovery is idempotent while new P0 evidence still queues', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-work-queue-root-'));
  const busy = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-work-queue-busy-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(busy, { recursive: true, force: true });
  });
  const fakeBin = path.join(root, 'fake-bin');
  fs.mkdirSync(fakeBin);
  fs.writeFileSync(path.join(fakeBin, 'curl'), '#!/bin/sh\nprintf "null\\n"\n', { mode: 0o755 });
  fs.mkdirSync(path.join(busy, 'events-online'), { recursive: true });
  fs.mkdirSync(path.join(busy, 'events-bot'), { recursive: true });
  fs.writeFileSync(path.join(root, 'DEMIGOD-EVENTS.json'), '{"outreach":[],"rsvps":[]}\n');
  fs.writeFileSync(path.join(root, 'DEMIGOD-EVENTS-API.json'), '{}\n');
  fs.writeFileSync(path.join(busy, 'events-online', 'status.json'), '{"public":true,"needHeal":false,"nativeRsvpRoutes":true}\n');
  fs.writeFileSync(path.join(busy, 'events-bot', 'invite-drain-latest.json'), '{"needsUrl":0}\n');
  fs.writeFileSync(path.join(busy, 'demand-status.json'), '{}\n');
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(busy, 'control-board.json'), JSON.stringify({ at: now, ok: true }));
  fs.writeFileSync(path.join(busy, 'reseal-queue-last.json'), JSON.stringify({ at: now }));
  fs.writeFileSync(path.join(busy, 'laptop-blue-moon.stamp'), '');
  fs.writeFileSync(path.join(root, 'DEMIGOD-DIRECTORY-AGING.json'), '{"maxOldestObservedDays":5}\n');
  fs.writeFileSync(path.join(root, 'DEMIGOD-ROLE-PACKETS.json'), '{"packets":{"demo":{"demo":true}}}\n');
  const queue = path.join(busy, 'work-queue.jsonl');
  const pathEnv = `${fakeBin}:${process.env.PATH}`;

  const evidenceUrl = new URL('./demigod-evidence.mjs', import.meta.url).href;
  const truthInput = path.join(root, 'truth-fixture.txt');
  fs.writeFileSync(truthInput, 'stable\n');
  const seal = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import {beginRun,sealRun} from ${JSON.stringify(evidenceUrl)};` +
    `const run=beginRun('truth',{scope:[${JSON.stringify(truthInput)}]});` +
    `sealRun(run,{pass:true,summary:'fixture truth',ttlSec:600});`,
  ], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_ROOT: root, DEMIGOD_BUSY: busy },
  });
  assert.equal(seal.status, 0, seal.stderr || seal.stdout);

  run('demigod-work-find.mjs', root, busy, pathEnv);
  assert.deepEqual(discovered(queue), [], 'a clean fixture discovers no work');

  fs.writeFileSync(path.join(root, 'DEMIGOD-EVENTS.json'), '{"outreach":[{"status":"queued"}],"rsvps":[]}\n');
  fs.writeFileSync(path.join(busy, 'demand-status.json'), JSON.stringify({
    queue: { pending: 5, total: 5 },
    warmInbound: {
      rows: [{ status: 'reply pending', next: 'review pending' }],
      freshness: { overdueActionCount: 1, overdueActionWho: ['Real Founder'] },
    },
  }));

  run('demigod-work-find.mjs', root, busy, pathEnv);
  const first = discovered(queue);
  assert.deepEqual(discovered(queue), [], 'unchanged drafts and warm reminders are status, not work');
  assert.match(fs.readFileSync(path.join(busy, 'WORK-FOUND.md'), 'utf8'), /events\.public=unknown · needHeal=unknown/);
  assert.equal(first.some((row) => row.task === 'invite-drain'), false);
  run('demigod-work-find.mjs', root, busy, pathEnv);
  assert.equal(discovered(queue).length, first.length, 'a second run inside the same window discovers nothing new');

  fs.writeFileSync(path.join(busy, 'events-online', 'status.json'), '{"public":false,"needHeal":true,"nativeRsvpRoutes":true}\n');
  run('demigod-work-find.mjs', root, busy, pathEnv);
  assert.equal(discovered(queue).length, first.length, 'failed live probe never promotes a cached failure');

  fs.writeFileSync(path.join(root, 'demigod-events-online.mjs'), 'console.log(JSON.stringify({public:true,needHeal:false,nativeRsvpRoutes:true}));\n');
  run('demigod-work-find.mjs', root, busy, pathEnv);
  assert.equal(discovered(queue).length, first.length, 'live health supersedes a stale cached failure');

  fs.writeFileSync(path.join(root, 'demigod-events-online.mjs'), 'console.log(JSON.stringify({public:false,needHeal:true,nativeRsvpRoutes:true}));\n');
  run('demigod-work-find.mjs', root, busy, pathEnv);
  const changed = discovered(queue);
  assert.equal(changed.length, first.length + 1);
  assert.equal(changed.at(-1).task, 'events-heal');
  assert.equal(changed.at(-1).pri, 0);

  fs.writeFileSync(path.join(busy, 'events-bot', 'invite-drain-latest.json'), '{"needsUrl":2}\n');
  run('demigod-work-find.mjs', root, busy, pathEnv);
  const invite = discovered(queue);
  assert.equal(invite.length, changed.length + 1);
  assert.equal(invite.at(-1).task, 'invite-drain');
  assert.equal(invite.at(-1).pri, 1);
});

test('useful loop executes only work emitted by the current discovery run', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-useful-loop-root-'));
  const busy = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-useful-loop-busy-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(busy, { recursive: true, force: true });
  });
  const script = (name, body) => fs.writeFileSync(path.join(root, name), body);
  script('demigod-events-online.mjs', 'console.log(JSON.stringify({local:true,public:true,needHeal:false,nativeRsvpRoutes:true}));\n');
  script('demigod-work-find.mjs', '');
  script('demigod-ship.mjs', `
import fs from 'node:fs';
import path from 'node:path';
fs.appendFileSync(path.join(process.env.DEMIGOD_BUSY, 'executed.log'), 'ship-prepare\\n');
`);
  script('demigod-funnel.mjs', `
import fs from 'node:fs';
import path from 'node:path';

fs.appendFileSync(path.join(process.env.DEMIGOD_BUSY, 'executed.log'), 'funnel-collision-plan\\n');
`);
  script('demigod-control-board.mjs', `
import fs from 'node:fs';
import path from 'node:path';
fs.appendFileSync(path.join(process.env.DEMIGOD_BUSY, 'executed.log'), 'control-board\\n');
`);
  script('demigod-reseal-queue.mjs', `
import fs from 'node:fs';
import path from 'node:path';
if (process.argv.slice(2).join(' ') !== 'run --schedule --max-age-days=7') process.exit(1);
fs.appendFileSync(path.join(process.env.DEMIGOD_BUSY, 'executed.log'), 'reseal-due\\n');
`);
  fs.mkdirSync(path.join(busy, 'events-online'), { recursive: true });
  fs.writeFileSync(path.join(busy, 'events-online', 'status.json'), '{"local":true,"public":true,"needHeal":false,"nativeRsvpRoutes":true}\n');

  const queue = path.join(busy, 'work-queue.jsonl');
  const executionLog = path.join(busy, 'executed.log');
  fs.writeFileSync(queue, '{"task":"ship-prepare","pri":0,"status":"open"}\n');

  assert.equal(runUsefulLoop(root, busy).plan.includes('ship-prepare'), false);
  assert.equal(fs.existsSync(executionLog), false);

  fs.appendFileSync(queue, [
    '{"task":"ship-prepare","pri":0,"status":"open"}',
    '{"task":"funnel-collision-plan","pri":1,"status":"open"}',
    '',
  ].join('\n'));
  assert.deepEqual(runUsefulLoop(root, busy).plan, ['ship-prepare']);
  assert.deepEqual(fs.readFileSync(executionLog, 'utf8').trim().split('\n'), ['ship-prepare']);

  const second = runUsefulLoop(root, busy);
  assert.deepEqual(second.plan, ['funnel-collision-plan']);
  assert.equal(second.did[0]?.ok, true, JSON.stringify(second.did));
  assert.deepEqual(fs.readFileSync(executionLog, 'utf8').trim().split('\n'), ['ship-prepare', 'funnel-collision-plan']);

  const final = runUsefulLoop(root, busy);
  assert.equal(final.ok, true);
  assert.deepEqual(final.plan, []);
  assert.deepEqual(final.did, []);
  assert.deepEqual(fs.readFileSync(executionLog, 'utf8').trim().split('\n'), ['ship-prepare', 'funnel-collision-plan']);
  assert.equal(fs.statSync(path.join(busy, 'useful-loop-last.json')).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(busy, 'useful-loop-work-state.json')).mode & 0o777, 0o600);

  fs.appendFileSync(queue, [
    '{"task":"control-board","pri":1,"status":"open"}',
    '{"task":"reseal-due","pri":2,"status":"open"}',
    '',
  ].join('\n'));
  assert.deepEqual(runUsefulLoop(root, busy).plan, ['control-board']);
  assert.deepEqual(runUsefulLoop(root, busy).plan, ['reseal-due']);
  assert.deepEqual(fs.readFileSync(executionLog, 'utf8').trim().split('\n'), [
    'ship-prepare',
    'funnel-collision-plan',
    'control-board',
    'reseal-due',
  ]);
});
