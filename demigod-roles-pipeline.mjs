#!/usr/bin/env node
/**
 * Regular multi-source roles refresh for Demigod website directory + public roles surface.
 *
 * Flow (honesty-preserving):
 *   1. X/Twitter hiring posts (CDP public search) → staging x-hiring.json
 *   2. HN Who-is-hiring (optional; default on) → HN cache / map merge inputs
 *   3. Extract public ATS board URLs → attach to map companies when host/slug matches (--write)
 *   4. Role-ledger poll (public ATS) → first-seen / still-open truth
 *   5. Roles feed → DEMIGOD-ROLES-FEED.json
 *   6. Public roles embed → DEMIGOD-PUBLIC-ROLES.json + demigod-public-roles-embed.js
 *   7. Directory static snapshot (Open roles on /startups)
 *
 * Homepage inject reads window.__dgPublicRoles (from embed) — not DEMIGOD-BOARD seeds.
 * Live CDN still requires an authorized ship; this pipeline keeps disk + embed current.
 *
 *   node demigod-roles-pipeline.mjs              # full run
 *   node demigod-roles-pipeline.mjs status        # read-only health (no poll / no mutate)
 *   node demigod-roles-pipeline.mjs --dry         # list steps
 *   node demigod-roles-pipeline.mjs --skip-x      # no CDP X collect
 *   node demigod-roles-pipeline.mjs --skip-hn
 *   node demigod-roles-pipeline.mjs --selftest
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const NODE = process.execPath;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function run(script, args = [], { optional = false } = {}) {
  const full = path.join(ROOT, script);
  console.log(`\n→ node ${script} ${args.join(' ')}`);
  const r = spawnSync(NODE, [full, ...args], { cwd: ROOT, stdio: 'inherit', env: process.env });
  const code = r.status ?? 1;
  if (code !== 0) {
    if (optional) {
      console.warn(`optional step failed (${script} exit ${code}) — continuing`);
      return { ok: false, code, script };
    }
    console.error(`FAILED at ${script} (exit ${code})`);
    process.exit(code || 1);
  }
  return { ok: true, code: 0, script };
}

function buildSteps(args) {
  const skipX = args.includes('--skip-x');
  const skipHn = args.includes('--skip-hn');
  const skipPoll = args.includes('--skip-poll');
  const steps = [];
  if (!skipX) steps.push({ script: 'demigod-x-hiring.mjs', args: [], optional: true });
  if (!skipHn) steps.push({ script: 'demigod-hn-hiring.mjs', args: ['--months', '2'], optional: true });
  steps.push({ script: 'demigod-roles-ats-apply.mjs', args: ['--write'], optional: false });
  if (!skipPoll) steps.push({ script: 'demigod-role-ledger.mjs', args: ['poll'], optional: false });
  steps.push({ script: 'demigod-roles-feed.mjs', args: ['--days', '1', '--limit', '120'], optional: false });
  // Homepage inject only shows 8; keep embed small (foot slices(0,8) as well).
  // 24 for embed/footer buffer; homepage foot still slices 8. Matches public-roles default.
  steps.push({ script: 'demigod-public-roles.mjs', args: ['--limit', '24'], optional: false });
  steps.push({ script: 'demigod-directory-static.mjs', args: [], optional: true });
  return steps;
}

function fileMeta(p) {
  try {
    const st = fs.statSync(p);
    return { path: p, bytes: st.size, mtime: st.mtime.toISOString() };
  } catch {
    return { path: p, missing: true };
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function timerSnap(unit) {
  const r = spawnSync('systemctl', ['--user', 'show', unit, '-p', 'ActiveState', '-p', 'SubState', '-p', 'LastTriggerUSec', '-p', 'NextElapseUSecRealtime', '-p', 'UnitFileState'], {
    encoding: 'utf8',
  });
  if (r.status !== 0) return { unit, ok: false, error: (r.stderr || r.stdout || 'systemctl failed').trim() };
  const out = { unit, ok: true };
  for (const line of String(r.stdout || '').split('\n')) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

/** Read-only pipeline health — never polls ATS or rewrites embeds. */
function printStatus() {
  const receiptPath = path.join(BUSY, 'roles-pipeline-latest.json');
  const receipt = readJsonSafe(receiptPath);
  const xHiring = fileMeta(path.join(BUSY, 'x-hiring.json'));
  const xErr = readJsonSafe(path.join(BUSY, 'x-hiring-last-error.json'));
  const feed = fileMeta(path.join(ROOT, 'DEMIGOD-ROLES-FEED.json'));
  const publicRoles = fileMeta(path.join(ROOT, 'DEMIGOD-PUBLIC-ROLES.json'));
  const embed = fileMeta(path.join(ROOT, 'demigod-public-roles-embed.js'));
  const ledgerTimer = timerSnap('demigod-role-ledger.timer');
  const pipeTimer = timerSnap('demigod-roles-pipeline.timer');
  const results = Array.isArray(receipt?.results) ? receipt.results : [];
  const failed = results.filter((r) => r && r.ok === false).map((r) => r.script);
  const xBody = readJsonSafe(path.join(BUSY, 'x-hiring.json'));
  const receiptEndedMs = Date.parse(receipt?.ended || '') || 0;
  const xMtimeMs = xHiring.missing ? 0 : Date.parse(xHiring.mtime) || 0;
  // A later successful x-hiring collect (or cleared error file) means the last pipeline
  // ✗ demigod-x-hiring.mjs row is stale — status must not keep sounding the alarm.
  const xFailedInLastRun = failed.includes('demigod-x-hiring.mjs');
  const xRecovered =
    xFailedInLastRun &&
    !xErr &&
    xMtimeMs > receiptEndedMs &&
    (xBody?.ok === true || (Number.isFinite(xBody?.kept) && xBody.kept >= 0));
  const report = {
    schema: 'demigod.roles-pipeline-status/1',
    at: new Date().toISOString(),
    mutate: false,
    lastRun: receipt
      ? {
          started: receipt.started,
          ended: receipt.ended,
          failed,
          results,
          note: receipt.note || null,
        }
      : null,
    artifacts: { xHiring, feed, publicRoles, embed, receipt: fileMeta(receiptPath) },
    xHiringLastError: xErr
      ? { at: xErr.at || null, error: xErr.error || xErr.message || null }
      : null,
    xHiringRecovered: xRecovered
      ? { after: receipt?.ended || null, stagingAt: xHiring.mtime || null, kept: xBody?.kept ?? null }
      : null,
    timers: { roleLedger: ledgerTimer, rolesPipeline: pipeTimer },
    note: 'Observations and embeds only — not matching inventory. status never runs poll.',
  };
  console.log('# roles-pipeline status · read-only');
  if (!receipt) console.log('  lastRun: none');
  else {
    console.log(`  lastRun: ${receipt.ended || receipt.started || '?'} · failed=[${failed.join(', ') || 'none'}]`);
    for (const r of results) {
      const mark = r.ok ? '✓' : r.script === 'demigod-x-hiring.mjs' && xRecovered ? '↺' : '✗';
      const extra =
        !r.ok && r.script === 'demigod-x-hiring.mjs' && xRecovered
          ? ' (later collect ok — staging fresher than this run)'
          : r.ok
            ? ''
            : ` exit ${r.code}`;
      console.log(`    ${mark} ${r.script}${extra}`);
    }
  }
  for (const [k, m] of Object.entries(report.artifacts)) {
    if (m.missing) console.log(`  ${k}: missing`);
    else console.log(`  ${k}: ${m.mtime} · ${m.bytes}B`);
  }
  if (xErr?.error) console.log(`  x-hiring last error: ${xErr.error}`);
  if (xRecovered) {
    console.log(
      `  x-hiring: recovered after failed pipeline step · staging ${xHiring.mtime} · kept=${xBody?.kept ?? '?'}`,
    );
  }
  for (const t of [ledgerTimer, pipeTimer]) {
    if (!t.ok) console.log(`  timer ${t.unit}: unavailable (${t.error || '?'})`);
    else console.log(`  timer ${t.unit}: ${t.ActiveState}/${t.SubState} · unitFile=${t.UnitFileState || '?'}`);
  }
  console.log('  note: status is read-only — use bare run (no args) to refresh');
  atomicWrite(path.join(BUSY, 'roles-pipeline-status.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`  receipt: ${path.join(BUSY, 'roles-pipeline-status.json')}`);
}

const KNOWN_FLAGS = new Set(['--dry', '--selftest', '--skip-x', '--skip-hn', '--skip-poll', '--status']);

if (isMain) {
  const args = process.argv.slice(2);
  const bare = args.filter((a) => !a.startsWith('-'));
  const flags = args.filter((a) => a.startsWith('-'));
  const unknownFlags = flags.filter((f) => !KNOWN_FLAGS.has(f));
  if (unknownFlags.length) {
    console.error(`unknown flag(s): ${unknownFlags.join(' ')}`);
    console.error('usage: node demigod-roles-pipeline.mjs [status|run] [--dry] [--skip-x] [--skip-hn] [--skip-poll] [--selftest]');
    process.exit(2);
  }
  // Fail closed: bare words other than status/run used to be ignored and a full poll ran
  // (DEMIGOD-TASKS "status" thrash). Unknown commands must not mutate.
  const badBare = bare.filter((b) => b !== 'status' && b !== 'run');
  if (badBare.length) {
    console.error(`unknown command: ${badBare.join(' ')}`);
    console.error('usage: node demigod-roles-pipeline.mjs [status|run] [--dry] [--skip-x] [--skip-hn] [--skip-poll] [--selftest]');
    process.exit(2);
  }
  if (bare.includes('status') || flags.includes('--status')) {
    if (bare.includes('run') || flags.some((f) => f.startsWith('--skip') || f === '--dry')) {
      console.error('status is exclusive — drop run/skip/dry flags');
      process.exit(2);
    }
    printStatus();
    process.exit(0);
  }
  if (args.includes('--selftest')) {
    // Composition smoke: dry step list + pure modules
    const steps = buildSteps([]);
    if (steps.length < 5) throw new Error('pipeline steps too short');
    run('demigod-roles-ats-links.mjs', ['--selftest']);
    run('demigod-roles-ats-apply.mjs', ['--selftest']);
    run('demigod-public-roles.mjs', ['--selftest']);
    // status path is pure-ish: must not throw
    printStatus();
    console.log(JSON.stringify({ ok: true, selftest: 'roles-pipeline', steps: steps.map((s) => s.script) }));
    process.exit(0);
  }
  const steps = buildSteps(args);
  if (args.includes('--dry')) {
    for (const s of steps) console.log('→ node', s.script, s.args.join(' '), s.optional ? '(optional)' : '');
    process.exit(0);
  }
  fs.mkdirSync(BUSY, { recursive: true });
  const started = new Date().toISOString();
  const results = [];
  for (const s of steps) results.push(run(s.script, s.args, { optional: s.optional }));
  const receipt = {
    schema: 'demigod.roles-pipeline/1',
    started,
    ended: new Date().toISOString(),
    results,
    note: 'Disk + public-roles embed refreshed. Live CDN still requires authorized ship.',
  };
  atomicWrite(path.join(BUSY, 'roles-pipeline-latest.json'), JSON.stringify(receipt, null, 2));
  console.log('\n✓ roles pipeline complete ·', path.join(BUSY, 'roles-pipeline-latest.json'));
}
