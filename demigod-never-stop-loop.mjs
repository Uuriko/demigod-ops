#!/usr/bin/env node
/**
 * demigod-never-stop-loop — durable improve cycle (research-backed harness)
 *
 * Design (see research + /tmp/demigod-design-v213/):
 *  - External backlog + progress on disk (survives context death)
 *  - ONE implement cycle at a time; max attempts; no-progress fingerprint stop
 *  - Verify gates = finish line (not vibes)
 *  - Spawns Codex (review) + Fable (audit) as side workers on interval
 *  - Cost/time budgets; restarts clean after each cycle
 *
 *   node demigod-never-stop-loop.mjs run [--max-cycles N] [--sleep-sec S]
 *   node demigod-never-stop-loop.mjs status
 *   node demigod-never-stop-loop.mjs stop
 *   nohup node demigod-never-stop-loop.mjs run --max-cycles 999 >/dev/null 2>>/tmp/dg-busy/never-stop.err &
 *
 * Do NOT redirect stdout into never-stop.log: log() already appendFileSync's every line there, so
 * `>> never-stop.log` writes each line TWICE with an identical timestamp. That is not theoretical --
 * this log is 4258 lines / 2129 distinct, every line a consecutive duplicate, and it inflated a
 * reported failure count 2x (784 "release-blocked" that were really 392) before anyone noticed.
 * The real launchers (full-pass-loop, full-pass-supervisor) pass stdio:'ignore', which is why they
 * never doubled it -- only this documented one-liner did. stderr still needs a home for crashes and
 * stack traces, which log() never sees, hence the separate .err file.
 *
 * Stop file: /tmp/dg-busy/never-stop.STOP
 */
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const STATE = path.join(BUSY, 'never-stop-state.json');
const STOP = path.join(BUSY, 'never-stop.STOP');
const PIDF = path.join(BUSY, 'never-stop.pid');
const LOG = path.join(BUSY, 'never-stop.log');
const BACKLOG = path.join(BUSY, 'never-stop-backlog.json');

const DEFAULT_BACKLOG = [
  {
    id: 'p0-cm6-live-single-foot',
    title: 'Ensure live has exactly one foot CDN matching disk',
    kind: 'ship',
    cmd: 'node demigod-cm6-paste-publish.mjs && node demigod-truth.mjs',
  },
  {
    id: 'p0-scrub-banned-copy',
    title: 'Scrub 3-5 promise + replacement guarantee + FIND TALENT flash',
    kind: 'foot',
    notes: 'foot-core scrubStaticLabels + early head CTA hide',
  },
  {
    id: 'p1-founders-candidates-pages',
    title: 'Add DG_PAGES founders + candidates deep pages',
    kind: 'foot',
  },
  {
    id: 'p1-copy-hero-wiz',
    title: 'Rewrite hero/WIZ copy per mega prompt + codex review',
    kind: 'foot',
  },
  {
    id: 'p1-wiz-localstorage-consent',
    title: 'Gate WIZ localStorage PII or clear control',
    kind: 'foot',
  },
  {
    id: 'p1-tools-os-selftest',
    title: 'Keep tools OS green: next assert + demand selftest',
    kind: 'tools',
    cmd: 'node demigod-tools-os-selftest.mjs && node demigod-demand-selftest.mjs',
  },
  {
    id: 'p2-dashboard-orient-card',
    title: 'Dashboard/orient show draft hygiene + freeze honestly',
    kind: 'tools',
  },
];

function ensure() {
  fs.mkdirSync(BUSY, { recursive: true });
  if (!fs.existsSync(BACKLOG)) {
    fs.writeFileSync(BACKLOG, JSON.stringify({ at: new Date().toISOString(), items: DEFAULT_BACKLOG }, null, 2));
  }
}

function readJson(p, def = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return def;
  }
}

function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
}

function compactBacklogItems(items = []) {
  const byId = new Map();
  for (const item of items) {
    if (!item?.id) continue;
    const prior = byId.get(item.id);
    if (!prior) {
      byId.set(item.id, { ...item });
      continue;
    }
    // Refill bugs in older loop revisions appended the canonical backlog over
    // and over. Preserve the newest fields, but never reopen an item when any
    // persisted copy already records it as done.
    byId.set(item.id, {
      ...prior,
      ...item,
      ...(prior.status === 'done' || item.status === 'done' ? { status: 'done' } : {}),
    });
  }
  return [...byId.values()];
}

function boundedTailLines(value, maxChars = 800) {
  const lines = String(value || '').trim().split('\n').filter(Boolean);
  const kept = [];
  let size = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const added = line.length + (kept.length ? 1 : 0);
    if (size + added > maxChars) break;
    kept.unshift(line);
    size += added;
  }
  if (kept.length) return kept.join('\n');
  const last = lines.at(-1) || '';
  return last.length > maxChars ? `…${last.slice(-(maxChars - 1))}` : last;
}

function boundedDetail(value, maxChars = 800) {
  let text;
  if (typeof value === 'string') text = value;
  else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value ?? '');
    }
  }
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

function commandReceipt(command, sinceMs = 0) {
  if (/demigod-tools-os-selftest\.mjs/.test(command)) {
    const receiptPath = path.join(BUSY, 'tools-os-selftest.json');
    try {
      if (fs.statSync(receiptPath).mtimeMs + 1 < sinceMs) return null;
    } catch {
      return null;
    }
    return readJson(receiptPath);
  }
  return null;
}

function cm6ReleasePreflight() {
  const r = run(process.execPath, ['demigod-cm6-paste-publish.mjs', '--check-structural'], {
    timeout: 30000,
  });
  let report = null;
  try {
    report = JSON.parse(r.stdout || '{}');
  } catch {
    /* A malformed preflight is never authority to mutate Webflow. */
  }
  return {
    ready: r.status === 0 && report?.releaseReady === true,
    report,
    detail:
      report?.releaseBlocker ||
      (Array.isArray(report?.drift) && report.drift.length ? `release artifacts drift: ${report.drift.join(', ')}` : null) ||
      (r.stderr || r.stdout || 'CM6 release preflight unavailable').trim().slice(-600),
  };
}

function log(line) {
  const s = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(s);
  try {
    fs.appendFileSync(LOG, s);
  } catch {
    /* */
  }
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 300000,
    env: { ...process.env, ...(opts.env || {}) },
    maxBuffer: 20_000_000,
  });
  const childStartBlocked = Boolean(r.error) && r.status == null;
  return {
    status: r.status ?? 1,
    stdout: (r.stdout || '').slice(-8000),
    stderr: (r.stderr || '').slice(-4000),
    blocked: childStartBlocked,
    failureKind: childStartBlocked ? 'child-start' : null,
    error: r.error
      ? { code: r.error.code || null, message: String(r.error.message || r.error).slice(0, 600) }
      : null,
  };
}

function fingerprint(text) {
  return crypto.createHash('sha256').update(String(text || '').slice(0, 4000)).digest('hex').slice(0, 16);
}

function shouldStop(state) {
  if (fs.existsSync(STOP)) return 'stop-file';
  if (state.cycles >= state.maxCycles) return 'max-cycles';
  // Higher threshold — real work can look similar across cycles; don't die at 5
  if (state.consecutiveNoProgress >= 40) return 'no-progress-x40';
  const budgetMin = Number(process.env.DEMIGOD_NEVER_STOP_BUDGET_MIN || 0);
  if (budgetMin > 0 && state.startedAt) {
    const elapsed = (Date.now() - Date.parse(state.startedAt)) / 60000;
    if (elapsed >= budgetMin) return 'budget-min';
  }
  return null;
}

function nextItem(state = readJson(STATE, {})) {
  const b = readJson(BACKLOG, { items: [] });
  const done = new Set((state?.doneIds || []));
  const itemState = state?.items || {};
  return (b.items || []).find((i) =>
    !done.has(i.id) && i.status !== 'done' &&
    (!itemState[i.id]?.cooldownUntil || Date.parse(itemState[i.id].cooldownUntil) <= Date.now())
  ) || null;
}

function markDone(id, activeState = null) {
  const st = readJson(STATE, {});
  st.doneIds = [...new Set([...(st.doneIds || []), id])];
  // cycleOnce writes its in-memory state after this helper returns. Keep that
  // object synchronized so the final write cannot erase the completion.
  if (activeState) activeState.doneIds = [...new Set([...(activeState.doneIds || []), id])];
  writeJson(STATE, st);
  const b = readJson(BACKLOG, { items: [] });
  for (const it of b.items || []) {
    if (it.id === id) it.status = 'done';
  }
  writeJson(BACKLOG, b);
}

function verifySuite() {
  const checks = [
    ['foot-smoke', 'node', ['demigod-foot-smoke.mjs']],
    ['wiz-own', 'node', ['demigod-wiz-ownership-selftest.mjs']],
    ['verify-source', 'node', ['demigod-verify-source.mjs']],
  ];
  const out = { ok: true, results: [] };
  for (const [name, cmd, args] of checks) {
    const r = run(cmd, args, { timeout: 120000 });
    const pass = r.status === 0;
    if (!pass) out.ok = false;
    out.results.push({ name, pass, status: r.status, tail: (r.stdout + r.stderr).slice(-400) });
  }
  return out;
}

function spawnSideWorker(kind, cycle) {
  const outFile = `/tmp/loop-${kind}-${cycle}.txt`;
  let args;
  const focusHint =
    'ACTIVE FOCUS: /tmp/dg-busy/events-bot/FOCUS.md — Events Bot / SF nights. Funnel automation is secondary and Firecrawl is paused.';
  if (kind === 'codex') {
    args = [
      'exec',
      '--full-auto',
      '--sandbox',
      'workspace-write',
      `Demigod never-stop cycle ${cycle}. ${focusHint}
Read /tmp/dg-busy/never-stop-state.json and the Events Bot focus file.
Implement ONE tools fix (Events Bot, pipeline/policy/selftest, Webflow helper, or dash). No auto-DM, no board writes, no foot thrash.
Write summary to /tmp/loop-codex-${cycle}.md`,
    ];
    spawn('timeout', ['240', 'codex', ...args], {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', fs.openSync(outFile, 'a'), fs.openSync(outFile, 'a')],
    }).unref();
  } else if (kind === 'fable') {
    args = [
      'review',
      `Demigod never-stop cycle ${cycle}. ${focusHint}
Rank next 3 P0s for Events Bot / SF nights, with funnel health secondary. Concrete file:line. No human-task lists.
Write to /tmp/loop-fable-${cycle}.txt and /tmp/dg-busy/funnel-loop/FABLE-NEXT.md`,
    ];
    spawn('timeout', ['180', path.join(ROOT, 'bin/df'), ...args], {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', fs.openSync(outFile, 'a'), fs.openSync(outFile, 'a')],
      env: process.env,
    }).unref();
  }
  log(`spawned ${kind} → ${outFile}`);
}

function implementItem(item, cycle) {
  // ALWAYS do real work — rotate domain; never only write a brief
  const domainMap = {
    foot: 'website',
    tools: 'tools',
    ship: 'ship',
    startup: 'startup',
  };
  const domain = domainMap[item.kind] || ['website', 'tools', 'startup', 'ship'][cycle % 4];
  log(`REAL WORK domain=${domain} item=${item.id}`);

  // 1) Primary: demigod-cycle-work (website|tools|startup|ship) — always mutates/verifies/spawns implementers
  const cw = run(process.execPath, ['demigod-cycle-work.mjs', `--domain=${domain}`, `--cycle=${cycle}`, '--owner=never-stop'], {
    timeout: 175000,
    env: {
      DG_LOCK_TOKEN: process.env.DG_LOCK_TOKEN || '',
      DEMIGOD_FORCE_PUBLISH: process.env.DEMIGOD_FORCE_PUBLISH || '1',
    },
  });
  log(`cycle-work exit=${cw.status} tail=${boundedTailLines(cw.stdout, 300)}`);
  // cycle-work already publishes the authoritative distinction between tool
  // health and release staging. Carry those typed fields into never-stop state
  // instead of forcing consumers to recover them from a clipped log tail.
  const cycleReceipt = readJson(path.join(BUSY, 'cycle-work-latest.json'));
  const cycleReceiptCurrent = cycleReceipt?.cycle === cycle && cycleReceipt?.domain === domain;
  const releaseState = cycleReceiptCurrent ? {
    releaseReady: cycleReceipt.releaseReady ?? null,
    releaseBlocked: cycleReceipt.releaseBlocked === true,
    verification: cycleReceipt.verification || null,
    toolsReady: domain === 'tools' ? cycleReceipt.toolsReady === true : null,
  } : {
    releaseReady: null,
    releaseBlocked: false,
    verification: null,
    toolsReady: null,
  };

  // Always dogfood live user-test on website/foot cycles (catches layout/CTA/WIZ)
  const commandHealth = [];
  if (domain === 'website' || item.kind === 'foot' || /usertest|user-test/i.test(item.id || '') || /site-usertest|user-test/i.test(item.cmd || '')) {
    const utCmd = 'node demigod-site-usertest.mjs --quick';
    log(`run site-usertest: ${utCmd}`);
    const ut = run(process.execPath, ['demigod-site-usertest.mjs', '--quick'], { timeout: 120000 });
    log(`  site-usertest → exit ${ut.status}`);
    commandHealth.push({
      cmd: utCmd,
      exit: ut.status,
      blocked: false,
      degraded: false,
      receipt: readJson(path.join(BUSY, 'site-usertest-latest.json')),
      detail: boundedTailLines((ut.stdout || '') + (ut.stderr || ''), 400),
    });
  }

  // Optional backlog cmd for explicit tools (usertest full, etc.) — skip ship mutations
  if (item.cmd && /site-usertest|user-test\.mjs/i.test(item.cmd) && !commandHealth.some((c) => /site-usertest/.test(c.cmd))) {
    log(`run cmd for ${item.id}: ${item.cmd}`);
    const parts = item.cmd.split(' && ').map((s) => s.trim());
    for (const p of parts) {
      if (/demigod-cm6-paste-publish\.mjs(?!.*--check)/.test(p)) {
        const preflight = cm6ReleasePreflight();
        if (!preflight.ready) {
          log(`  ${p} → blocked before mutation: ${preflight.detail}`);
          commandHealth.push({
            cmd: p,
            exit: 2,
            blocked: true,
            degraded: false,
            receipt: null,
            detail: preflight.detail,
          });
          continue;
        }
      }
      const [bin, ...rest] = p.split(/\s+/);
      const commandStartedAt = Date.now();
      const r = run(bin === 'node' ? process.execPath : bin, bin === 'node' ? rest : rest, {
        timeout: 600000,
        env: {
          DG_LOCK_TOKEN: process.env.DG_LOCK_TOKEN || '',
          DEMIGOD_FORCE_PUBLISH: process.env.DEMIGOD_FORCE_PUBLISH || '1',
        },
      });
      log(`  ${p} → exit ${r.status}`);
      const output = `${r.stdout || ''}\n${r.stderr || ''}`;
      const receipt = commandReceipt(p, commandStartedAt);
      // Prefer the suite's structured receipt over text scraping. Restricted
      // runners may prove in-process contracts while honestly refusing OS
      // attestation; that is degraded/blocked, not a product regression.
      const receiptBlocked = receipt?.blocked === true || receipt?.failureKind === 'child-start';
      const degraded = receipt?.degraded === true;
      commandHealth.push({
        cmd: p,
        exit: r.status,
        blocked: r.blocked || receiptBlocked || (r.status === 2 && /BLOCKED|EPERM|child processes unavailable/i.test(output)),
        degraded,
        // Keep the useful result of the restricted-runner fallback separate
        // from OS attestation. Without these fields the dashboard can only say
        // "blocked", even when every source contract passed in process.
        contractPass: receipt ? receipt.contractPass === true : null,
        osAttested: receipt ? receipt.osAttested === true : null,
        executionMode: receipt?.executionMode || null,
        rerunCommand: receipt?.rerunCommand || null,
        failureKind: r.failureKind || receipt?.failureKind || null,
        error: r.error || null,
        receipt: receipt ? '/tmp/dg-busy/tools-os-selftest.json' : null,
        detail: output.trim().split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 600) || null,
      });
    }
  }

  const verdict = cycleReceiptCurrent ? cycleReceipt.verdict : (cw.failureKind === 'child-start' ? 'blocked' : 'fail');
  const cycleWorkOk = cycleReceiptCurrent && verdict === 'pass' && cycleReceipt.ok === true && cycleReceipt.attested === true;
  // A sandbox child-start refusal is not an implementation regression. The
  // cycle-work receipt keeps it blocked/degraded (and therefore un-attested),
  // but the outer backlog must not retry the same item forever after the
  // in-process contracts passed and useful work completed.
  const commandOk = commandHealth.every((check) => check.exit === 0 || check.blocked);
  const usertestFail = commandHealth.some((check) => /site-usertest/.test(check.cmd || '') && check.exit !== 0 && !check.blocked);
  const blocked = (cycleReceiptCurrent && cycleReceipt.blocked === true) || commandHealth.some((check) => check.blocked);
  const degraded = (cycleReceiptCurrent && cycleReceipt.degraded === true) || commandHealth.some((check) => check.degraded);
  // Usertest is a hard gate for website/foot items even when cycle-work attestation flakes
  const ok = (cycleWorkOk || (domain === 'website' && !usertestFail && commandOk)) && commandOk && !usertestFail;
  // A preflight-blocked/degraded command is useful diagnosis, not an
  // implementation. Calling it real work resets the no-progress detector and
  // can retire a P0 after several cycles without changing any release state.
  const realWork = cycleWorkOk && !blocked && !degraded;
  const commandSummary = commandHealth.map((check) => ({
    ...check,
    // Keep the state receipt bounded without slicing the serialized JSON from
    // the left, which produced an invalid fragment and hid the failing command.
    detail: check.detail ? String(check.detail).slice(0, 300) : null,
  }));
  return {
    ok,
    verdict,
    skipped: cycleReceiptCurrent && cycleReceipt.skipped === true,
    reason: cycleReceiptCurrent ? cycleReceipt.reason || null : 'missing-current-cycle-receipt',
    verificationFingerprint: cycleWorkOk ? fingerprint(JSON.stringify({ domain, health: cycleReceipt.health || [], at: cycleReceipt.at })) : null,
    blocked,
    degraded,
    ...releaseState,
    commandHealth,
    detail: commandHealth.length
      ? { cycleWork: cycleWorkOk, commands: commandSummary }
      : boundedTailLines(cw.stdout || cw.stderr, 800),
    domain,
    realWork,
  };
}

async function cycleOnce(state) {
  const item = nextItem(state);
  if (!item) {
    // refill backlog from defaults minus done — never empty forever
    const b = readJson(BACKLOG, { items: [] });
    // Normalize legacy duplicate entries before deriving completion or
    // appending health work. This bounds the durable queue and prevents stale
    // duplicate copies from being selected after state recovery.
    b.items = compactBacklogItems(b.items);
    // Older loop revisions could lose doneIds during the final state write.
    // Treat persisted backlog status as completion evidence too, and never
    // append another copy of an already completed canonical item.
    const done = new Set([
      ...(state.doneIds || []),
      ...(b.items || []).filter((i) => i.status === 'done').map((i) => i.id),
    ]);
    state.doneIds = [...done];
    const fresh = DEFAULT_BACKLOG.filter((i) => !done.has(i.id)).map((i) => ({ ...i, status: 'pending' }));
    if (!fresh.length) {
      // continuous improvement: re-open tools health forever
      b.items.push({
        id: `health-${Date.now().toString(36)}`,
        title: 'Health: tools-os + demand + orient assertSame',
        kind: 'tools',
        cmd: 'node demigod-tools-os-selftest.mjs && node demigod-demand-selftest.mjs && node demigod-next.mjs --assert-same',
      });
      writeJson(BACKLOG, b);
      log('backlog refilled with health cycle');
      return { progress: true, reason: 'refilled' };
    }
    b.items = [...(b.items || []), ...fresh];
    writeJson(BACKLOG, b);
  }

  const work = nextItem(state);
  if (!work) {
    state.lastAt = new Date().toISOString();
    state.lastResult = { pass: false, verdict: 'skip', skipped: true, reason: 'cooldown-or-empty' };
    writeJson(STATE, state);
    return { progress: false, reason: 'cooldown-or-empty' };
  }

  state.current = work.id;
  state.cycles += 1;
  writeJson(STATE, state);
  log(`CYCLE ${state.cycles} → ${work.id}: ${work.title}`);

  const impl = implementItem(work, state.cycles);
  const ver = { ok: impl.verdict === 'pass', results: [] };
  const fp = impl.verificationFingerprint || fingerprint(JSON.stringify({ verdict: impl.verdict, detail: impl.detail }));

  if (state.lastFingerprint === fp) {
    state.consecutiveNoProgress = (state.consecutiveNoProgress || 0) + 1;
  } else {
    state.consecutiveNoProgress = 0;
    state.lastFingerprint = fp;
  }

  // Real work always counts as progress for no-progress detector
  if (impl.realWork) {
    state.consecutiveNoProgress = 0;
    state.lastFingerprint = fingerprint(String(Date.now()) + boundedDetail(impl.detail));
  }

  // `ok` can mean useful fallback work completed. A verified pass must not
  // turn blocked/degraded sandbox execution into false green.
  const pass = impl.ok === true && impl.verdict === 'pass' && impl.blocked !== true && impl.degraded !== true && ver.ok;
  let terminal = false;
  state.items ||= {};
  const itemState = state.items[work.id] || { failureCount: 0 };
  if (pass) {
    markDone(work.id, state);
    terminal = true;
    state.items[work.id] = { failureCount: 0, cooldownUntil: null, lastVerdict: 'pass', verificationFingerprint: impl.verificationFingerprint, lastAt: new Date().toISOString() };
    log(`DONE ${work.id} direct-pass fingerprint=${impl.verificationFingerprint}`);
  } else {
    const neutral = impl.verdict === 'skip';
    const failureCount = neutral ? Number(itemState.failureCount || 0) : Number(itemState.failureCount || 0) + 1;
    const cooldownMs = neutral ? 60_000 : Math.min(30 * 60_000, 60_000 * (2 ** Math.min(4, Math.max(0, failureCount - 1))));
    state.items[work.id] = {
      failureCount,
      cooldownUntil: new Date(Date.now() + cooldownMs).toISOString(),
      lastVerdict: impl.verdict || 'fail',
      verificationFingerprint: null,
      lastAt: new Date().toISOString(),
    };
    log(`${neutral ? 'SKIP' : 'FAIL'} ${work.id} verdict=${impl.verdict} cooldownUntil=${state.items[work.id].cooldownUntil}`);
    state.failCounts = state.failCounts || {};
    state.failCounts[work.id] = failureCount;
  }

  state.lastAt = new Date().toISOString();
  state.lastResult = { id: work.id, pass, verdict: impl.verdict, impl, verify: ver.ok, verificationFingerprint: impl.verificationFingerprint || null };
  // Failure counters describe unresolved attempts, not lifetime history. A
  // terminal item must not remain red after a verified pass or terminal skip.
  if (terminal && state.failCounts) delete state.failCounts[work.id];
  // `current` means actively executing; completed identity lives in lastResult.
  if (terminal) state.current = null;
  writeJson(STATE, state);
  writeJson(path.join(BUSY, `never-stop-cycle-${state.cycles}.json`), state.lastResult);
  // Keep the caller's progress verdict aligned with the state transition
  // above. `pendingImplement` is not part of implementItem's contract; using
  // it here reported progress=false even after verified real work advanced the
  // backlog, which made supervisors misclassify productive cycles as stalls.
  return { progress: pass, work };
}

async function mainRun(argv) {
  ensure();
  const maxCycles = Number(argv.find((a) => a.startsWith('--max-cycles='))?.split('=')[1] || process.env.DEMIGOD_NEVER_STOP_MAX || 999);
  // accept --sleep-sec=30 or --sleep-sec 30
  let rawSleep = argv.find((a) => a.startsWith('--sleep-sec='))?.split('=')[1];
  if (rawSleep == null) {
    const i = argv.indexOf('--sleep-sec');
    if (i >= 0 && argv[i + 1]) rawSleep = argv[i + 1];
  }
  const requestedSleep = Number(rawSleep ?? 30);
  const sleepSec = Number.isFinite(requestedSleep) ? Math.max(30, requestedSleep) : 30;

  let state = readJson(STATE, null) || {
    schema: 'demigod.never-stop/1',
    startedAt: new Date().toISOString(),
    cycles: 0,
    maxCycles,
    doneIds: [],
    consecutiveNoProgress: 0,
  };
  state.maxCycles = maxCycles;
  if (!state.startedAt) state.startedAt = new Date().toISOString();
  writeJson(STATE, state);
  fs.writeFileSync(PIDF, String(process.pid));
  log(`never-stop START pid=${process.pid} maxCycles=${maxCycles} sleep=${sleepSec}s`);

  while (true) {
    const why = shouldStop(state);
    if (why) {
      log(`never-stop STOP reason=${why}`);
      break;
    }
    try {
      await cycleOnce(state);
      state = readJson(STATE, state);
    } catch (e) {
      log(`cycle error: ${e.message || e}`);
      state.consecutiveNoProgress = (state.consecutiveNoProgress || 0) + 1;
      writeJson(STATE, state);
    }
    await new Promise((r) => setTimeout(r, sleepSec * 1000));
  }

  try {
    fs.unlinkSync(PIDF);
  } catch {
    /* */
  }
  log('never-stop exited cleanly');
}

function status() {
  ensure();
  const st = readJson(STATE, {});
  const bl = readJson(BACKLOG, {});
  const pid = readJson(PIDF, null);
  let alive = false;
  try {
    const p = fs.readFileSync(PIDF, 'utf8').trim();
    process.kill(Number(p), 0);
    alive = true;
  } catch {
    alive = false;
  }
  console.log(
    JSON.stringify(
      {
        alive,
        pidFile: PIDF,
        stopFile: fs.existsSync(STOP),
        state: st,
        backlogOpen: (bl.items || []).filter((i) => i.status !== 'done').map((i) => i.id),
        log: LOG,
      },
      null,
      2,
    ),
  );
}

function stop() {
  fs.writeFileSync(STOP, new Date().toISOString());
  console.log(JSON.stringify({ ok: true, stop: STOP }));
}

const cmd = process.argv[2] || 'status';
if (cmd === 'run') mainRun(process.argv.slice(3)).catch((e) => {
  console.error(e);
  process.exit(1);
});
else if (cmd === 'stop') stop();
else if (cmd === 'status') status();
else {
  console.error('usage: run|status|stop');
  process.exit(2);
}
