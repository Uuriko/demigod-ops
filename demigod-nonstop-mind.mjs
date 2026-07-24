#!/usr/bin/env node
/**
 * demigod-nonstop-mind — think → plan → queue → (optional) one do cycle
 *
 *   node demigod-nonstop-mind.mjs once
 *   node demigod-nonstop-mind.mjs run --sleep-sec=300
 *
 * Pipeline each tick:
 *   1) demigod-idea-engine.mjs --promote   (new ideas → work-queue)
 *   2) demigod-work-find.mjs              (evidence work → work-queue)
 *   3) write mind/pulse.md + mind/last.json
 *   4) if --do: demigod-useful-loop.mjs once
 *
 * STOP: /tmp/dg-busy/mind.STOP
 * Does NOT force freeze off, DM, or invent RSVPs.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.env.DEMIGOD_ROOT || '/home/potter';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const MIND = path.join(BUSY, 'mind');
const STOP = path.join(BUSY, 'mind.STOP');
const LOG = path.join(BUSY, 'mind.log');
const LAST = path.join(MIND, 'last.json');
const PULSE = path.join(MIND, 'pulse.md');
const NODE = process.execPath;

function log(line) {
  const s = `[${new Date().toISOString()}] ${line}`;
  console.log(s);
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    fs.appendFileSync(LOG, s + '\n');
  } catch {
    /* */
  }
}

function run(scriptArgs, timeout = 180000) {
  const r = spawnSync(NODE, scriptArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
  });
  return {
    ok: r.status === 0,
    status: r.status,
    out: (r.stdout || '').slice(-3000),
    err: (r.stderr || '').slice(-800),
  };
}

function once(opts = {}) {
  if (fs.existsSync(STOP)) {
    log('STOP present');
    return { ok: true, stopped: true };
  }
  fs.mkdirSync(MIND, { recursive: true });

  const ideas = run(['demigod-idea-engine.mjs', '--promote'], 60000);
  const find = run(['demigod-work-find.mjs'], 90000);
  let did = null;
  if (opts.do) {
    did = run(['demigod-useful-loop.mjs', 'once'], 400000);
  }

  let ambition = null;
  try {
    ambition = JSON.parse(fs.readFileSync(path.join(MIND, 'ambition.json'), 'utf8'));
  } catch {
    /* */
  }

  const pulse = [
    '# Nonstop mind pulse · ' + new Date().toISOString(),
    '',
    `- idea-engine: ${ideas.ok ? 'ok' : 'fail'}`,
    `- work-find: ${find.ok ? 'ok' : 'fail'}`,
    `- useful-once: ${opts.do ? (did?.ok ? 'ok' : 'fail') : 'skipped'}`,
    '',
    '## Top ambition',
    '',
    ...((ambition?.top || []).map(
      (t, i) => `${i + 1}. [${t.score}] ${t.title}${t.blocked ? ' (blocked)' : ''} → \`${t.task || '—'}\``,
    ) || ['_none_']),
    '',
    '## Want',
    '',
    'Closed-loop agency — `DEMIGOD-GROK-WANT.md`',
    '',
    'Ideas board: `mind/ideas-latest.md` · Queue: `work-queue.jsonl`',
    '',
  ].join('\n');
  fs.writeFileSync(PULSE, pulse);

  const receipt = {
    at: new Date().toISOString(),
    ideasOk: ideas.ok,
    findOk: find.ok,
    didOk: did?.ok ?? null,
    top: ambition?.top || [],
    want: 'closed-loop agency',
  };
  fs.writeFileSync(LAST, JSON.stringify(receipt, null, 2) + '\n');
  log(
    `pulse ideas=${ideas.ok} find=${find.ok} do=${did?.ok ?? 'skip'} top=${(ambition?.top || [])[0]?.title || '?'}`,
  );
  console.log(pulse);
  return receipt;
}

const cmd = process.argv[2] || 'once';
const sleepSec = Number(
  (process.argv.find((a) => a.startsWith('--sleep-sec=')) || '--sleep-sec=300').split('=')[1] ||
    300,
);
const doWork = process.argv.includes('--do') || process.env.MIND_DO === '1';

if (cmd === 'once') {
  once({ do: doWork });
} else if (cmd === 'run') {
  try {
    fs.writeFileSync(path.join(BUSY, 'mind.pid'), String(process.pid) + '\n');
  } catch {
    /* */
  }
  log(`MIND RUN sleepSec=${sleepSec} do=${doWork}`);
  const tick = () => {
    if (fs.existsSync(STOP)) {
      log('STOP exit');
      process.exit(0);
    }
    try {
      once({ do: doWork });
    } catch (e) {
      log('err ' + (e?.message || e));
    }
    setTimeout(tick, Math.max(60, sleepSec) * 1000);
  };
  tick();
} else {
  console.error('usage: demigod-nonstop-mind.mjs once|run [--do] [--sleep-sec=300]');
  process.exit(2);
}
