#!/usr/bin/env node
/**
 * Every Dasha gate, and an honest account of which ones actually ran.
 *
 * The suite already had a runner: a 20-command `&&` chain in package.json. It stopped at the first
 * failure, so checks 12–20 never ran the day check 11 died on a missing browser, and nothing said
 * so — the output looked like a crash, not like nine unexecuted gates. Seven other test files were
 * reachable from no script at all, including the one guarding the mint, and their silence was
 * indistinguishable from success.
 *
 * So this does not stop at the first failure, and it reports four states rather than two:
 *
 *   PASS         ran, exit 0
 *   FAIL         ran, exit non-zero — the assertion output is printed
 *   SKIP         could not run for an environmental reason it names (no browser, no credentials)
 *   UNREACHABLE  exists, but no npm script and no ship-gate step invokes it
 *
 * UNREACHABLE is the point. A gate nobody runs is not a gate, and until it is named out loud it
 * looks exactly like a gate that passed. This exits non-zero for FAIL *and* for UNREACHABLE, so
 * adding a test without wiring it up breaks the build that would otherwise have ignored it.
 *
 *   node dasha-browser-gate.mjs node dasha-gate-all.mjs     # browser gates included
 *   node dasha-gate-all.mjs --no-browser                    # static only, browser gates SKIP
 *   node dasha-gate-all.mjs --list                          # inventory + reachability, runs nothing
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const listOnly = args.has('--list');
const TIMEOUT_MS = 420_000;

/* Sources that a test file can legitimately be invoked from. Anything in neither is UNREACHABLE. */
const scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts || {};
const shipSource = readFileSync(join(root, 'dasha-ship.mjs'), 'utf8');

/* One documented exception. dasha-studio-static.test.mjs is not a gate this repo runs — it is the
   SOURCE that dasha-studio-publish.mjs copies out to dasha-desk/studio/studio.test.mjs, where its
   relative paths resolve and where it passes. Running it here reports ERR_MODULE_NOT_FOUND and means
   nothing. It is covered by `dasha-studio-publish.mjs --check`. */
const publishSources = new Set(['dasha-studio-static.test.mjs']);

/* Not every gate is a *.test.mjs. Several are `--check` modes on the builders, and they are real
   gates: dasha-studio-publish.mjs --check is what caught the Studio reaching an unapproved host.
   Enumerating only test files made this runner under-report by four, which is the same blind spot
   it exists to remove — so they are listed here explicitly and run alongside. */
const CHECK_GATES = [
  ['dasha-studio-publish.mjs', ['--check']],
  ['dasha-studio-embed-build.mjs', ['--check']],
  ['dasha-desk/build.mjs', ['--check']],
  ['dasha-doc-registry.mjs', ['--check']],
  ['dasha-chess-local-build.mjs', ['--check']],
];

const files = [
  ...readdirSync(root).filter((f) => /^dasha-.*\.test\.mjs$/.test(f)),
  ...(existsSync(join(root, 'dasha-desk'))
    ? readdirSync(join(root, 'dasha-desk')).filter((f) => f.endsWith('.test.mjs')).map((f) => join('dasha-desk', f))
    : []),
].sort();

/** Where a test is invoked from, and with which arguments — taken from the script that owns it
 *  rather than a table here, so `--local` and friends cannot drift out of sync with package.json. */
function invocation(file) {
  for (const [name, body] of Object.entries(scripts)) {
    /* A script that invokes this runner is not coverage — the runner finds every file by scanning,
       so counting it would make every gate trivially "reachable" and delete the signal. */
    if (body.includes('dasha-gate-all.mjs')) continue;
    const at = body.indexOf(file);
    if (at === -1) continue;
    /* A bare filename must not match inside a longer path — root dasha-surfaces.test.mjs is a
       different gate from dasha-desk/dasha-surfaces.test.mjs, and matching the latter would
       misattribute the former to the wrong script. Only a real token boundary counts. */
    const before = at > 0 ? body[at - 1] : '';
    if (before && /[A-Za-z0-9._/-]/.test(before)) continue;
    // trailing args up to the next && or end of command
    const rest = body.slice(at + file.length).split('&&')[0].trim();
    return { via: `npm:${name}`, extra: rest ? rest.split(/\s+/).filter((a) => a.startsWith('-')) : [] };
  }
  if (shipSource.includes(file)) return { via: 'ship-gate', extra: [] };
  return null;
}

const browserAvailable = !args.has('--no-browser') && (() => {
  try {
    const r = spawnSync(process.execPath, ['-e',
      "fetch('http://127.0.0.1:9223/json/version',{signal:AbortSignal.timeout(1200)}).then(()=>process.exit(0),()=>process.exit(1))"],
    { timeout: 8000 });
    return r.status === 0;
  } catch { return false; }
})();

const needsBrowser = (file) => {
  const s = readFileSync(join(root, file), 'utf8');
  return /9223|puppeteer|playwright/.test(s);
};


/* Browser gates leak tabs. Several connect to Chrome, open pages and never close them — after a
   full run there were 21 open, and by then newPage() is slow enough that later gates fail on a
   connect timeout rather than on anything they assert. That is how dasha-contrast and
   dasha-chess-local both "failed" here while passing standalone.
   Reaped between gates, and deliberately narrow: only about:blank and 127.0.0.1 pages, which are
   test servers that no longer exist. Another agent's real tabs — a Webflow dashboard, say — are
   left alone, because a test runner that closes someone's browser is worse than a slow one. */
async function reapTestPages() {
  try {
    const res = await fetch('http://127.0.0.1:9223/json/list', { signal: AbortSignal.timeout(2000) });
    const targets = await res.json();
    const dead = targets.filter((t) => t.type === 'page'
      && (t.url === 'about:blank' || /^http:\/\/127\.0\.0\.1[:/]/.test(t.url || '')));
    for (const t of dead) {
      await fetch(`http://127.0.0.1:9223/json/close/${t.id}`, { signal: AbortSignal.timeout(2000) }).catch(() => {});
    }
    return dead.length;
  } catch { return 0; }
}

const rows = [];
for (const file of files) {
  const how = invocation(file);
  const reachable = Boolean(how) || publishSources.has(file);
  if (publishSources.has(file)) {
    rows.push({ file, state: 'SKIP', note: 'publish source — runs as dasha-desk/studio/studio.test.mjs', reachable });
    continue;
  }
  if (listOnly) {
    rows.push({ file, state: reachable ? 'READY' : 'UNREACHABLE', note: how ? how.via : 'no npm script, no ship-gate step', reachable });
    continue;
  }
  if (needsBrowser(file) && !browserAvailable) {
    rows.push({ file, state: 'SKIP', note: 'needs CDP on 127.0.0.1:9223', reachable });
    continue;
  }
  const browserGate = needsBrowser(file);
  if (browserGate) await reapTestPages();
  const started = Date.now();
  const exec = () => spawnSync(process.execPath, [file, ...(how?.extra || [])], {
    cwd: root, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024,
  });
  let run = exec();
  /* Browser gates fail spuriously under sustained load — ProtocolError, "LifecycleWatcher
     terminated" — and pass immediately when run alone. Retrying once after a reap tells the two
     apart. The retry is REPORTED rather than hidden: a gate that only passes on the second attempt
     is a real signal about the gate, and silently swallowing it is how a genuinely intermittent
     failure becomes invisible. */
  let flaky = false;
  if (run.status !== 0 && browserGate) {
    await reapTestPages();
    await new Promise((r) => setTimeout(r, 1500));
    const second = exec();
    if (second.status === 0) { flaky = true; run = second; } else { run = second; }
  }
  const secs = Math.round((Date.now() - started) / 1000);
  if (run.status === 0) {
    rows.push({ file, state: 'PASS', note: `${secs}s${flaky ? ' · FLAKY, passed on retry' : ''}${how ? '' : ' · UNREACHABLE'}`, reachable, flaky });
  } else {
    const why = (run.stderr || run.stdout || '').split('\n').find((l) => /Error|error|assert/i.test(l)) || `exit ${run.status}`;
    rows.push({ file, state: 'FAIL', note: why.trim().slice(0, 96), reachable, output: (run.stderr || run.stdout || '').slice(-700) });
  }
}

/* The --check gates, run the same way and reported in the same table. */
for (const [script, extra] of CHECK_GATES) {
  const label = `${script} ${extra.join(' ')}`;
  if (listOnly) { rows.push({ file: label, state: 'READY', note: 'check gate', reachable: true }); continue; }
  const started = Date.now();
  const run = spawnSync(process.execPath, [script, ...extra], { cwd: root, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 });
  const secs = Math.round((Date.now() - started) / 1000);
  if (run.status === 0) rows.push({ file: label, state: 'PASS', note: `${secs}s`, reachable: true });
  else {
    const why = (run.stdout || run.stderr || '').split('\n').filter(Boolean).pop() || `exit ${run.status}`;
    rows.push({ file: label, state: 'FAIL', note: why.trim().slice(0, 96), reachable: true, output: (run.stdout || run.stderr || '').slice(-700) });
  }
}

const width = Math.max(...rows.map((r) => r.file.length));
for (const r of rows) {
  const flag = r.reachable ? '' : '  ⚠ UNREACHABLE';
  console.log(`  ${r.state.padEnd(11)} ${r.file.padEnd(width)}  ${r.note}${flag}`);
}

const count = (s) => rows.filter((r) => r.state === s).length;
const unreachable = rows.filter((r) => !r.reachable);
const flakes = rows.filter((r) => r.flaky);
console.log(`\n${rows.length} gates · ${count('PASS')} passed · ${count('FAIL')} failed · ${count('SKIP')} skipped · ${unreachable.length} unreachable${flakes.length ? ` · ${flakes.length} flaky` : ''}`);
if (flakes.length) console.log(`  passed only on retry: ${flakes.map((r) => r.file).join(', ')}`);
if (!browserAvailable && !listOnly) console.log('  browser gates were skipped — rerun under: node dasha-browser-gate.mjs node dasha-gate-all.mjs');

/* Tail only. A full assertion diff on a 40KB HTML artifact buries the other three failures, which
   is the same "one failure hides the rest" problem this runner exists to remove. */
for (const r of rows.filter((x) => x.state === 'FAIL')) {
  console.error(`\n--- ${r.file} ---\n${r.output.split('\n').slice(-12).join('\n')}`);
}
if (unreachable.length) {
  console.error(`\n${unreachable.length} gate(s) run from nowhere — wire them into package.json or delete them:`);
  for (const r of unreachable) console.error(`  ${r.file}`);
}

/* Silence is the thing being fixed, so an unwired gate fails the run exactly like a broken one. */
process.exit(count('FAIL') || unreachable.length ? 1 : 0);
