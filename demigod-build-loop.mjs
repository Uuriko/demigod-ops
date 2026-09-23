#!/usr/bin/env node
/**
 * Autonomous-ish build loop for Demigod software + pages.
 * Does NOT thrash foot or publish. Pulls queue, runs verify, spawns agent reviews.
 *
 * Queue file: DEMIGOD-BUILD-QUEUE.jsonl in DEMIGOD_ROOT
 * Each line: { "id","type":"tool|page|fix|review","title","cmd","verify","status","priority" }
 *
 * Usage:
 *   node demigod-build-loop.mjs once          # process one ready item
 *   node demigod-build-loop.mjs status
 *   node demigod-build-loop.mjs seed          # seed default queue
 *   node demigod-build-loop.mjs doctor        # truth + selftest + freeze
 *   node demigod-build-loop.mjs prompts       # print master prompts paths
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  atomicWrite,
  readJson,
} from './demigod-agent-tools-lib.mjs';

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}

function queuePath() {
  return path.join(dataRoot(), 'DEMIGOD-BUILD-QUEUE.jsonl');
}

function statePath() {
  return path.join(dataRoot(), 'DEMIGOD-BUILD-LOOP-STATE.json');
}

function doctorPath() {
  return path.join(dataRoot(), 'DEMIGOD-BUILD-LOOP-DOCTOR.json');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

const args = process.argv.slice(2);
const cmd = args[0] || 'status';
if (args.includes('--publish')) fail('publish_refused');

function run(nodeArgs, timeout = 120000) {
  return spawnSync('node', nodeArgs, {
    cwd: dataRoot(),
    encoding: 'utf8',
    timeout,
  });
}

function readQueue() {
  if (!fs.existsSync(queuePath())) return [];
  return fs
    .readFileSync(queuePath(), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function writeQueue(items) {
  atomicWrite(queuePath(), items.map((i) => JSON.stringify(i)).join('\n') + (items.length ? '\n' : ''));
}

function seed() {
  const items = [
    {
      id: 'seed-match-tools',
      type: 'tool',
      title: 'Verify dg-match/intro/close',
      priority: 1,
      status: 'ready',
      cmd: 'node demigod-tools-selftest.mjs',
      verify: 'node demigod-match.mjs 2>&1 | head -1; node demigod-intro.mjs 2>&1 | head -1',
    },
    {
      id: 'seed-pages-exist',
      type: 'page',
      title: 'Check demigod-pages HTML exist',
      priority: 1,
      status: 'ready',
      cmd: 'test -f demigod-pages/hire.html && test -f demigod-pages/talent.html && test -f demigod-pages/pricing.html',
      verify: 'ls demigod-pages/*.html | wc -l',
    },
    {
      id: 'seed-doctor',
      type: 'fix',
      title: 'Doctor: truth + freeze + copy disk',
      priority: 2,
      status: 'ready',
      cmd: 'node demigod-build-loop.mjs doctor',
      verify: `test -f ${path.join(dataRoot(), 'DEMIGOD-TRUTH.json')}`,
    },
    {
      id: 'seed-page-ux-review',
      type: 'review',
      title: 'Queue Sonnet UX review of hire/talent',
      priority: 3,
      status: 'ready',
      cmd: `echo "Review demigod-pages/hire.html talent.html for honesty UX" > ${path.join(dataRoot(), 'page-ux-todo.txt')}`,
      verify: `test -f ${path.join(dataRoot(), 'page-ux-todo.txt')}`,
    },
  ];
  writeQueue(items);
  console.log(JSON.stringify({
    ok: true,
    seeded: items.length,
    queue: queuePath(),
    sent: false,
    liveMail: false,
    livePublish: false,
  }, null, 2));
}

function doctor() {
  const steps = [];
  const add = (name, r) => {
    steps.push({
      name,
      ok: r.status === 0,
      detail: ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 120),
    });
  };
  add('truth', run(['demigod-truth.mjs', '--md'], 90000));
  add('copy-disk', run(['demigod-copy-policy.mjs', '--disk-only'], 30000));
  add('freeze-status', run(['demigod-publish-freeze.mjs', 'status'], 10000));
  add('selftest', run(['demigod-tools-selftest.mjs'], 180000));
  const pass = steps.every((s) => s.ok || s.name === 'freeze-status'); // freeze exit 2 when on is ok
  const freeze = steps.find((s) => s.name === 'freeze-status');
  if (freeze) freeze.ok = true; // status exit 2 when frozen
  const report = {
    at: new Date().toISOString(),
    pass: steps.filter((s) => s.name !== 'freeze-status').every((s) => s.ok),
    steps,
    rules: [
      'Do not edit demigod-foot-core.js unless truth fullyShipped is false or explicit task',
      'Honor publish freeze for real Webflow publishes',
      'One canonical change per loop item',
      'Run claim-verify after any "fixed" claim',
      'Use DG_LOCK_OWNER + DG_LOCK_TOKEN for foot edits',
    ],
    path: doctorPath(),
    prompts: {
      fable: path.join(dataRoot(), 'fable-loop-master-prompt.txt'),
      codex: path.join(dataRoot(), 'codex-loop-master-prompt.txt'),
      sonnet: path.join(dataRoot(), 'sonnet-pages-copy-prompt.txt'),
      opus: path.join(dataRoot(), 'opus-autonomy-strategy.txt'),
    },
    sent: false,
    liveMail: false,
    livePublish: false,
  };
  atomicWrite(doctorPath(), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

function once() {
  const items = readQueue();
  const next = items
    .filter((i) => i.status === 'ready')
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))[0];
  if (!next) {
    console.log(JSON.stringify({ ok: true, note: 'queue empty — run seed or add items' }));
    process.exit(0);
  }
  next.status = 'running';
  next.startedAt = new Date().toISOString();
  writeQueue(items);

  const r = spawnSync('bash', ['-lc', next.cmd], {
    cwd: dataRoot(),
    encoding: 'utf8',
    timeout: 300000,
  });
  next.exit = r.status;
  next.output = ((r.stdout || '') + (r.stderr || '')).slice(0, 2000);
  let verifyOk = true;
  if (r.status === 0 && next.verify) {
    const v = spawnSync('bash', ['-o', 'pipefail', '-lc', next.verify], {
      cwd: dataRoot(),
      encoding: 'utf8',
      timeout: 120000,
    });
    next.verifyExit = v.status;
    next.verifyOutput = ((v.stdout || '') + (v.stderr || '')).slice(0, 800);
    verifyOk = v.status === 0;
  }
  next.status = r.status === 0 && verifyOk ? 'done' : 'failed';
  next.finishedAt = new Date().toISOString();
  writeQueue(items);

  const state = {
    at: new Date().toISOString(),
    last: next,
    remaining: items.filter((i) => i.status === 'ready').length,
  };
  atomicWrite(statePath(), JSON.stringify(state, null, 2) + '\n');
  const ok = r.status === 0 && verifyOk;
  console.log(JSON.stringify({ ok, item: next }, null, 2));
  process.exit(ok ? 0 : 1);
}

function status() {
  const items = readQueue();
  const by = {};
  for (const i of items) by[i.status] = (by[i.status] || 0) + 1;
  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        queue: queuePath(),
        counts: by,
        items: items.slice(0, 20),
        state: readJson(statePath()),
        sent: false,
        liveMail: false,
        livePublish: false,
        masterPrompts: [
          path.join(dataRoot(), 'fable-loop-master-prompt.txt'),
          path.join(dataRoot(), 'codex-loop-master-prompt.txt'),
          path.join(dataRoot(), 'sonnet-pages-copy-prompt.txt'),
          path.join(dataRoot(), 'opus-autonomy-strategy.txt'),
          'docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md',
        ],
      },
      null,
      2,
    ),
  );
}

if (cmd === 'seed') seed();
else if (cmd === 'once') once();
else if (cmd === 'doctor') doctor();
else if (cmd === 'prompts') {
  console.log(
    JSON.stringify(
      {
        fable: path.join(dataRoot(), 'fable-loop-master-prompt.txt'),
        codex: path.join(dataRoot(), 'codex-loop-master-prompt.txt'),
        sonnet: path.join(dataRoot(), 'sonnet-pages-copy-prompt.txt'),
        opus: path.join(dataRoot(), 'opus-autonomy-strategy.txt'),
        system: 'docs/exchange/DEMIGOD-AUTONOMOUS-BUILD-SYSTEM.md',
      },
      null,
      2,
    ),
  );
} else if (cmd === 'status') status();
else {
  console.error('usage: seed | once | status | doctor | prompts');
  process.exit(2);
}
