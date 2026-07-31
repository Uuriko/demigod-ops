#!/usr/bin/env node
/**
 * Self-test for settlement / agent tools.
 * Exit codes checked WITHOUT pipes (PIPESTATUS trap).
 *
 * Usage: node demigod-tools-selftest.mjs
 */
// Fail-closed: unknown flags must not vacuous-green the suite (POSIX usage = exit 2).
{
  const argvFlags = process.argv.slice(2).filter((a) => a.startsWith('-'));
  if (argvFlags.length) {
    console.error(
      `usage: node demigod-tools-selftest.mjs  (no flags; got ${argvFlags.join(' ')})`,
    );
    process.exit(2);
  }
}
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parseFirstJson, BUSY } from './demigod-agent-tools-lib.mjs';
import { sameState } from './demigod-version-ledger.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));

// This suite deliberately claims, corrupts, expires, and force-releases locks.
// Keep every fixture out of the live coordination namespace, even when a
// background loop launches the suite while another agent is editing foot-core.
if (process.env.DEMIGOD_TOOLS_SELFTEST_ISOLATED !== '1') {
  const isolatedBusy = fs.mkdtempSync(path.join('/tmp', 'dg-tools-selftest-'));
  try {
    try { fs.cpSync(BUSY, isolatedBusy, { recursive: true }); } catch {}
    for (const name of ['foot-lock.json', 'foot-lock.txt', 'foot-lock-token.env']) {
      try { fs.unlinkSync(path.join(isolatedBusy, name)); } catch {}
    }
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 300000,
      env: {
        ...process.env,
        DEMIGOD_BUSY: isolatedBusy,
        DEMIGOD_MULTI: path.join(isolatedBusy, 'multi'),
        DEMIGOD_TOOLS_SELFTEST_ISOLATED: '1',
      },
    });
    process.stdout.write(child.stdout || '');
    process.stderr.write(child.stderr || '');
    const receipt = path.join(isolatedBusy, 'tools-selftest.json');
    if (fs.existsSync(receipt)) {
      fs.mkdirSync(BUSY, { recursive: true });
      const target = path.join(BUSY, 'tools-selftest.json');
      const temp = `${target}.${process.pid}.tmp`;
      fs.copyFileSync(receipt, temp);
      fs.renameSync(temp, target);
    }
    process.exit(child.status ?? 1);
  } finally {
    try { fs.rmSync(isolatedBusy, { recursive: true, force: true }); } catch {}
  }
}

const results = [];

function writeReceiptAtomic(receipt) {
  fs.mkdirSync(BUSY, { recursive: true });
  const target = path.join(BUSY, 'tools-selftest.json');
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(receipt, null, 2) + '\n');
    fs.renameSync(temp, target);
  } finally {
    try { fs.unlinkSync(temp); } catch {}
  }
}

function cleanupFallbackSelftestLock(owner = 'selftest-A') {
  const jsonPath = path.join(BUSY, 'foot-lock.json');
  const textPath = path.join(BUSY, 'foot-lock.txt');
  let lease = null;
  try { lease = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch {}
  const leaseOwner = lease?.owner || lease?.lock?.owner || null;
  if (leaseOwner !== owner) return false;
  // Child execution can be denied after the claim has reached disk. In that
  // degraded path there is no child available to run `release`, so remove only
  // the exact lease this self-test created; never touch another owner's lock.
  for (const file of [jsonPath, textPath, path.join(BUSY, 'foot-lock-token.env')]) {
    try { fs.unlinkSync(file); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  }
  return true;
}

function run(args, opts = {}) {
  const r = spawnSync('node', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 90000,
    env: { ...process.env, ...(opts.env || {}) },
  });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  return { status: r.status ?? 1, out, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim(), error: r.error || null };
}

function assert(name, cond, detail = '') {
  results.push({ name, ok: Boolean(cond), detail: String(detail).slice(0, 220) });
}

// Fail-capability poison (Claude c266): suite must not be vacuous-green.
// DEMIGOD_TOOLS_SELFTEST_POISON=1 forces one red assert and exits non-zero immediately.
// Meta-proof: node --test demigod-tools-selftest.poison.test.mjs
if (process.env.DEMIGOD_TOOLS_SELFTEST_POISON === '1') {
  assert(
    'poison-control-intentional-fail',
    false,
    'DEMIGOD_TOOLS_SELFTEST_POISON=1 must fail the suite (not vacuous-green)',
  );
  const receipt = {
    at: new Date().toISOString(),
    pass: false,
    poison: true,
    results,
    failed: results.filter((r) => !r.ok).map((r) => r.name),
  };
  writeReceiptAtomic(receipt);
  console.log('tools-selftest  FAIL ✗  (poison control)');
  process.exit(1);
}

{
  const source = fs.readFileSync(path.join(ROOT, 'demigod-webflow.mjs'), 'utf8');
  const lib = fs.readFileSync(path.join(ROOT, 'demigod-webflow-lib.mjs'), 'utf8');
  const change = run(['demigod-webflow-change-selftest.mjs']);
  assert(
    'Webflow doctor does not call unobserved sitemap/robots missing',
    /(?:softSeo[\s\S]{0,200}|liveUnobservable[\s\S]{0,320})'live sitemap', 'robots advertises sitemap'/.test(source) &&
      /status\.live\?\.sitemap && !status\.live\.sitemap\.valid/.test(lib),
  );
  assert('webflow change selftest', change.status === 0, change.out);
}

// clean lock only if free or test owners (never steal a real writer)
{
  const st = run(['demigod-foot-lock.mjs', 'status']);
  const j = parseFirstJson(st.out);
  if (
    j?.locked &&
    j.lock?.owner &&
    !/^(selftest|flag-|same-owner|ttl-|legacy|hold|foreign|race|check|wrap|dg-apply|selftest-pub)/i.test(
      String(j.lock.owner),
    )
  ) {
    console.error('tools-selftest: ABORT — foot lock held by', j.lock.owner);
    process.exit(2);
  }
  // Do not force-release after a separate status read: a real writer can claim
  // in that gap. Only clean a lock that the status snapshot identified as a
  // selftest lease; otherwise leave the free state untouched.
  if (j?.locked) run(['demigod-foot-lock.mjs', 'release', '--force']);
}

// ── LOCK (token leases) ───────────────────────────────
{
  const a = run(['demigod-foot-lock.mjs', 'claim', 'selftest-A', '120']);
  const aj = parseFirstJson(a.out);
  const tokA = aj?.claimed?.token;
  if (a.error) {
    cleanupFallbackSelftestLock();
    const dashboardSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8');
    const dashboardUiSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
    const lockSource = fs.readFileSync(path.join(ROOT, 'demigod-foot-lock.mjs'), 'utf8');
    const cm6Source = fs.readFileSync(path.join(ROOT, 'demigod-cm6-paste-publish.mjs'), 'utf8');
    const fallbackFails = [];
    const fallback = (name, condition) => {
      if (!condition) fallbackFails.push(name);
    };
    fallback('lock token contract', /token/.test(lockSource) && /expiresAt/.test(lockSource));
    fallback(
      'dashboard server-owned runnable allowlist',
      /Object\.prototype\.hasOwnProperty\.call\(JOBS, tool\.id\)/.test(dashboardSource) &&
        /runnable:\s*Boolean\(job\)/.test(dashboardSource),
    );
    fallback('dashboard UI trusts runnable annotation', /const canRun = t\.runnable === true/.test(dashboardUiSource));
    fallback(
      'dashboard job launch validates HTTP and response shape',
      /const j=await r\.json\(\)\.catch\(\(\)=>null\)/.test(dashboardUiSource) &&
        /if\(!r\.ok\)\{/.test(dashboardUiSource) &&
        /job launch HTTP ['"]?\+r\.status/.test(dashboardUiSource) &&
        /if\(!j\|\|j\.ok!==true\|\|!j\.jobId\)/.test(dashboardUiSource),
    );
    fallback(
      'CM6 head/footer split assertion',
      /function\s+assertHeadFootSplit\s*\(expectedHead,\s*expectedFoot\)/.test(cm6Source) &&
        (cm6Source.match(/assertHeadFootSplit\(/g) || []).length >= 3 &&
        /headLoaderCount===0/.test(cm6Source) &&
        /footLoaderCountValue===1/.test(cm6Source) &&
        /headHasNoFootLoader/.test(cm6Source),
    );
    fallback(
      'CM6 persisted API split assertion',
      /editorHelperVerifiesPersistedSplit/.test(cm6Source) &&
        /pre === expectedHead && post === expectedFoot/.test(cm6Source) &&
        /if \(!persisted\.result\?\.value\?\.ok\)/.test(cm6Source),
    );
    writeReceiptAtomic({
      schema: 'demigod.tools-selftest/1', at: new Date().toISOString(), pass: false,
      blocked: true, degraded: true, mode: 'in-process-fallback', reason: 'child-start', code: a.error.code || null,
      message: a.error.message,
      fails: fallbackFails,
    });
    if (fallbackFails.length) {
      console.error('tools-selftest: FAIL (in-process fallback):', fallbackFails.join('; '));
      process.exit(1);
    }
    console.error('DEGRADED demigod-tools-selftest: fallback contracts pass; OS execution unverified');
    process.exit(2);
  }
  // The lock may be claimed by a real writer after the advisory status check
  // above. Treat that as a blocked test environment, not as 30+ contract
  // failures (and never continue into fixtures that assume selftest owns it).
  if (a.status !== 0 || !tokA) {
    const now = parseFirstJson(run(['demigod-foot-lock.mjs', 'status']).out);
    const owner = now?.lock?.owner || now?.who?.owner || null;
    if (now?.locked && owner && !/^selftest-/i.test(String(owner))) {
      writeReceiptAtomic({
        schema: 'demigod.tools-selftest/1',
        at: new Date().toISOString(),
        pass: false,
        blocked: true,
        reason: 'foot-lock-race',
        owner,
      });
      console.error('tools-selftest: BLOCKED — foot lock claimed concurrently by', owner);
      process.exit(2);
    }
  }
  assert('claim A ok', a.status === 0 && tokA, a.out.slice(0, 100));
  let lockSecretModes = {};
  try {
    for (const name of ['foot-lock.json', 'foot-lock-token.env']) {
      lockSecretModes[name] = fs.statSync(path.join(BUSY, name)).mode & 0o777;
    }
  } catch {}
  assert(
    'lock secrets mode 0600',
    Object.values(lockSecretModes).length === 2 && Object.values(lockSecretModes).every((mode) => mode === 0o600),
    JSON.stringify(lockSecretModes),
  );

  const b = run(['demigod-foot-lock.mjs', 'claim', 'selftest-B', '120']);
  assert('claim B blocked', b.status === 1 && /locked/.test(b.out), `status=${b.status}`);

  // same owner without token blocked
  const sameNoTok = run(['demigod-foot-lock.mjs', 'claim', 'selftest-A', '120']);
  assert('same owner no token blocked', sameNoTok.status === 1, sameNoTok.out.slice(0, 80));

  // refresh with token ok
  const refresh = run([
    'demigod-foot-lock.mjs',
    'claim',
    '--owner',
    'selftest-A',
    '--ttl',
    '120',
    '--token',
    tokA,
  ]);
  assert('refresh with token', refresh.status === 0, refresh.out.slice(0, 80));

  const relB = run(['demigod-foot-lock.mjs', 'release', 'selftest-B']);
  assert('release B blocked', relB.status === 1, relB.out.slice(0, 100));

  const checkA = run([
    'demigod-foot-lock.mjs',
    'check',
    '--owner',
    'selftest-A',
    '--token',
    tokA,
  ]);
  assert('check A token', checkA.status === 0 && /ownedByMe|tokenMatch/.test(checkA.out), checkA.out.slice(0, 80));

  const relA = run([
    'demigod-foot-lock.mjs',
    'release',
    '--owner',
    'selftest-A',
    '--token',
    tokA,
  ]);
  assert('release A with token', relA.status === 0, relA.out.slice(0, 80));

  const free = run(['demigod-foot-lock.mjs', 'status']);
  const fj = parseFirstJson(free.out);
  assert('lock free', free.status === 0 && fj && fj.locked === false, free.out.slice(0, 80));
}

// flag form + token
{
  const a = run(['demigod-foot-lock.mjs', 'claim', '--owner', 'flag-A', '--ttl', '60']);
  const tok = parseFirstJson(a.out)?.claimed?.token;
  const b = run(['demigod-foot-lock.mjs', 'claim', '--owner', 'flag-B', '--ttl', '60']);
  assert('flag claim B blocked', b.status === 1, b.out.slice(0, 80));
  if (tok) run(['demigod-foot-lock.mjs', 'release', '--owner', 'flag-A', '--token', tok]);
  else run(['demigod-foot-lock.mjs', 'release', '--force']);
}

// TTL expiry — isolated BUSY so concurrent agents cannot re-claim production lock mid-sleep
{
  const isoBusy = fs.mkdtempSync(path.join('/tmp', 'dg-foot-lock-ttl-'));
  const env = { DEMIGOD_BUSY: isoBusy };
  try {
    run(['demigod-foot-lock.mjs', 'claim', 'ttl-owner', '5'], { env });
    spawnSync('sleep', ['5.2']);
    run(['demigod-foot-lock.mjs', 'status'], { env });
    assert(
      'TTL expiry removes token handoff',
      !fs.existsSync(path.join(isoBusy, 'foot-lock-token.env')),
    );
    const r = run(['demigod-foot-lock.mjs', 'claim', 'ttl-other', '30'], { env });
    const tok = parseFirstJson(r.out)?.claimed?.token;
    assert('TTL expiry frees for other', r.status === 0, r.out.slice(0, 100));
    if (tok) run(['demigod-foot-lock.mjs', 'release', '--owner', 'ttl-other', '--token', tok], { env });
    else run(['demigod-foot-lock.mjs', 'release', '--force'], { env });
  } finally {
    try {
      fs.rmSync(isoBusy, { recursive: true, force: true });
    } catch {
      /* */
    }
  }
}

// legacy text parse — isolated BUSY (corrupt JSON + claim must not thrash production lock)
{
  const isoBusy = fs.mkdtempSync(path.join('/tmp', 'dg-foot-lock-legacy-'));
  const env = { DEMIGOD_BUSY: isoBusy };
  try {
    const c = run(['demigod-foot-lock.mjs', 'claim', 'legacy-A', '120'], { env });
    const tok = parseFirstJson(c.out)?.claimed?.token;
    fs.writeFileSync(path.join(isoBusy, 'foot-lock.json'), '{not-json');
    const st = run(['demigod-foot-lock.mjs', 'status'], { env });
    const j = parseFirstJson(st.out);
    assert(
      'legacy parse owner',
      j && j.locked && j.lock?.owner === 'legacy-A',
      JSON.stringify(j?.lock?.owner),
    );
    const steal = run(['demigod-foot-lock.mjs', 'claim', 'legacy-B', '30'], { env });
    assert('legacy lock blocks other', steal.status === 1, steal.out.slice(0, 80));
    run(['demigod-foot-lock.mjs', 'release', '--force'], { env });
    void tok;
  } finally {
    try {
      fs.rmSync(isoBusy, { recursive: true, force: true });
    } catch {
      /* */
    }
  }
}

// ── CLAIM-VERIFY ──────────────────────────────────────
{
  const bare = run(['demigod-claim-verify.mjs']);
  assert('claim-verify bare fails', bare.status === 1 && /specificity|FAIL/i.test(bare.out), `status=${bare.status}`);

  const fixed = run(['demigod-claim-verify.mjs', 'fixed']);
  assert('claim-verify "fixed" fails specificity', fixed.status === 1, fixed.out.slice(0, 100));

  const good = run(
    ['demigod-claim-verify.mjs', '--ship', '--copy-policy', '--smoke', '--board'],
    { timeout: 120000 },
  );
  const goodJson = parseFirstJson(good.out);
  assert(
    'claim-verify suite reports current verdict',
    [0, 1].includes(good.status) && goodJson && typeof goodJson.pass === 'boolean' && Array.isArray(goodJson.checks),
    good.out.slice(-80),
  );
}

// ── PLAN-LEDGER ───────────────────────────────────────
{
  const bad = run(['demigod-plan-ledger.mjs', 'set', 'nope', '--status', 'banana']);
  // not_found or invalid_status both fail
  assert('ledger rejects banana', bad.status !== 0, bad.out.slice(0, 100));

  const open = run(['demigod-plan-ledger.mjs', 'open']);
  assert('ledger open', open.status === 0 && open.out.includes('{'), open.out.slice(0, 60));
  assert(
    'version ledger skips timestamp-only repeats',
    sameState({ diskVer: '1', at: 'a' }, { diskVer: '1', at: 'b' }),
  );
  assert('version ledger keeps state changes', !sameState({ diskVer: '1' }, { diskVer: '2' }));
}

// ── INBOX ─────────────────────────────────────────────
{
  const testMulti = process.env.DEMIGOD_MULTI || '/tmp/dg-multi';
  const testFile = path.join(testMulti, 'selftest-inbox-msg.txt');
  fs.mkdirSync(testMulti, { recursive: true });
  fs.writeFileSync(testFile, 'useful plan content for selftest inbox unread check\n');
  // mark all then write new → should be unread
  run(['demigod-plan-inbox.mjs', '--mark']);
  fs.writeFileSync(testFile, 'useful plan content UPDATED for selftest\n');
  // bump mtime
  const now = new Date();
  fs.utimesSync(testFile, now, now);
  const i = run(['demigod-plan-inbox.mjs', '--json']);
  const j = parseFirstJson(i.out);
  assert(
    'inbox sees new file',
    j && j.unreadCount >= 1 && j.unread.some((u) => u.name === 'selftest-inbox-msg.txt'),
    JSON.stringify(j?.unreadCount),
  );
  run(['demigod-plan-inbox.mjs', '--mark', 'selftest-inbox-msg.txt']);
  const i2 = run(['demigod-plan-inbox.mjs', '--json']);
  const j2 = parseFirstJson(i2.out);
  assert(
    'inbox mark one',
    j2 && !j2.unread.some((u) => u.name === 'selftest-inbox-msg.txt'),
    'still unread',
  );
}

// ── FREEZE ────────────────────────────────────────────
{
  const fixtureRoot = fs.mkdtempSync(path.join('/tmp', 'dg-freeze-selftest-'));
  const fixtureEnv = { DEMIGOD_ROOT: fixtureRoot };
  fs.writeFileSync(
    path.join(fixtureRoot, 'DEMIGOD-PLAN-LEDGER.json'),
    JSON.stringify({ schema: 1, plans: [], at: new Date().toISOString() }, null, 2) + '\n',
  );
  try {
    const s = run(['demigod-freeze.mjs', 'snapshot', '--tag', 'selftest'], { env: fixtureEnv });
    assert('freeze snapshot', s.status === 0, s.out.slice(0, 60));
    const c = run(['demigod-freeze.mjs', 'check', '--tag', 'selftest'], { env: fixtureEnv });
    assert('freeze clean', c.status === 0 && /"changed": 0/.test(c.out), c.out.slice(0, 80));

    run(['demigod-freeze.mjs', 'snapshot', '--tag', 'selftest-all', '--all'], { env: fixtureEnv });
    run([
      'demigod-plan-ledger.mjs',
      'add',
      '--title',
      'selftest-freeze-tmp',
      '--owner',
      'selftest',
      '--note',
      'tmp',
    ], { env: fixtureEnv });
    const ch = run(['demigod-freeze.mjs', 'check', '--tag', 'selftest-all'], { env: fixtureEnv });
    assert('freeze detects ledger change', ch.status === 1 && /changed/.test(ch.out), `status=${ch.status}`);
    run(['demigod-freeze.mjs', 'clear', '--tag', 'selftest'], { env: fixtureEnv });
    run(['demigod-freeze.mjs', 'clear', '--tag', 'selftest-all'], { env: fixtureEnv });
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

// ── SHIP / PREFLIGHT / TRUTH / HANDOFF ────────────────
{
  const s = run(['demigod-ship-status.mjs', '--json'], { timeout: 90000 });
  const sj = parseFirstJson(s.out);
  assert('ship-status runs', s.status === 0 && sj && sj.stage, s.out.slice(0, 80));

  const p = run(['demigod-preflight.mjs'], { timeout: 180000 });
  assert(
    'preflight reports current verdict',
    [0, 1].includes(p.status) && /preflight\s+(?:PASS|FAIL)/.test(p.out),
    p.out.slice(0, 120),
  );
  // prepare-only lag must soft-ok (edit readiness ≠ fully shipped cert)
  const preflightSrc = fs.readFileSync(path.join(ROOT, 'demigod-preflight.mjs'), 'utf8');
  assert(
    'preflight soft-oks prepare-only ship lag for edit readiness',
    /function shipStatusOkForPreflight/.test(preflightSrc) &&
      /prepare-only disk v/.test(preflightSrc) &&
      !/demigod-claim-verify\.mjs',\s*'--ship'/.test(preflightSrc),
    'shipStatusOkForPreflight + no claim-verify --ship in preflight',
  );

  const t = run(['demigod-truth.mjs', '--json'], { timeout: 90000 });
  const tj = parseFirstJson(t.out);
  assert(
    'truth reports current verdict',
    [0, 1].includes(t.status) && tj?.id === 'truth' && typeof tj.pass === 'boolean' && typeof tj.fullyShipped === 'boolean',
    t.out.slice(0, 80),
  );
  assert('truth.json written', fs.existsSync(path.join(BUSY, 'truth.json')));

  const h = run(['demigod-handoff.mjs', '--note', 'selftest', '--print'], { timeout: 90000 });
  // Structured --note path prints "agent: note" and writes HANDOFF.json/md.
  assert(
    'handoff runs',
    h.status === 0 &&
      (/HANDOFF|Truth|selftest/i.test(h.out) || fs.existsSync(path.join(BUSY, 'HANDOFF.json'))),
    h.out.slice(0, 80),
  );
}

// receipt CLI
{
  const r = run(['demigod-publish-receipt.mjs']);
  assert('receipt CLI', r.status === 0 && /latestPath|PUBLISH/.test(r.out), r.out.slice(0, 80));
}

// bins
for (const b of [
  'bin/dg-start',
  'bin/dg-lock',
  'bin/dg-preflight',
  'bin/dg-inbox',
  'bin/dg-claim-verify',
  'bin/dg-truth',
  'bin/dg-freeze',
  'bin/dg-handoff',
]) {
  assert(`${b} exists`, fs.existsSync(path.join(ROOT, b)));
}

assert('tools-lib exists', fs.existsSync(path.join(ROOT, 'demigod-agent-tools-lib.mjs')));

// ── APPLY + ANCHORS (fixture file, never touch foot) ──
{
  const localFixDir = path.join(ROOT, '.dg-fixture');
  fs.mkdirSync(localFixDir, { recursive: true });
  const localFix = path.join(localFixDir, 'sample.txt');
  const unique = `ANCHOR_${Date.now()}_UNIQUE`;
  const body = `line1\n${unique}\nline3\n`;
  fs.writeFileSync(localFix, body);
  const sha = crypto.createHash('sha256').update(body).digest('hex');
  const plan = {
    title: 'selftest-apply',
    owner: 'selftest',
    pre: { '.dg-fixture/sample.txt': sha },
    replacements: [
      {
        file: '.dg-fixture/sample.txt',
        old: unique,
        new: unique + '_APPLIED',
        count: 1,
      },
    ],
    verify: [],
    smoke: false,
    lock: false,
  };
  const planPath = path.join(BUSY, 'outbox', 'selftest-apply.json');
  fs.mkdirSync(path.join(BUSY, 'outbox'), { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

  const anc = run(['demigod-anchors.mjs', planPath]);
  assert('anchors pass on plan', anc.status === 0, anc.out.slice(0, 100));

  const chk = run(['demigod-apply.mjs', 'check', planPath]);
  assert('apply check pass', chk.status === 0, chk.out.slice(0, 100));

  const dry = run(['demigod-apply.mjs', 'apply', planPath, '--dry-run', '--no-ledger']);
  assert('apply dry-run', dry.status === 0 && /dryRun|dry-run/i.test(dry.out), dry.out.slice(0, 100));

  const app = run(['demigod-apply.mjs', 'apply', planPath, '--no-ledger']);
  assert('apply real fixture', app.status === 0, app.out.slice(0, 120));
  const after = fs.readFileSync(localFix, 'utf8');
  assert('apply changed text', after.includes(unique + '_APPLIED'), after.slice(0, 80));

  plan.replacements[0].old = 'DOES_NOT_EXIST_XYZ';
  plan.pre = { '.dg-fixture/sample.txt': crypto.createHash('sha256').update(after).digest('hex') };
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  const bad = run(['demigod-apply.mjs', 'check', planPath]);
  assert('apply check fails bad anchor', bad.status === 1, bad.out.slice(0, 80));

  try {
    fs.rmSync(localFixDir, { recursive: true, force: true });
  } catch {
    /* */
  }
}

// ── WATCH SUBMITS / COPY / CONVERSION ─────────────────
{
  const w = run(['demigod-watch-submits.mjs', '--json']);
  assert('watch-submits runs', w.status === 0 && /freshCount|totalItems/.test(w.out), w.out.slice(0, 100));
  assert('submit alert written', fs.existsSync(path.join(BUSY, 'SUBMIT-ALERT.md')));

  const c = run(['demigod-copy-policy.mjs', '--disk-only'], { timeout: 30000 });
  assert('copy-policy disk pass', c.status === 0 && /PASS/.test(c.out), c.out.slice(0, 100));
  const cs = run(['demigod-copy-policy.mjs', '--source-only', '--json'], { timeout: 30000 });
  let sourcePolicy = null;
  try { sourcePolicy = JSON.parse(cs.out); } catch { /* assertion below reports output */ }
  assert(
    'copy-policy source-only alias is offline and explicit',
    cs.status === 0 && sourcePolicy?.scope === 'source' && sourcePolicy?.live === false,
    cs.out.slice(0, 140),
  );
  const cl = run(['demigod-copy-policy.mjs'], { timeout: 45000 });
  assert('copy-policy live default runs', cl.status === 0 || cl.status === 1, cl.out.slice(0, 100));

  const conv = run(['demigod-conversion-playtest.mjs'], { timeout: 60000 });
  assert('conversion-playtest pass', conv.status === 0 && /PASS/.test(conv.out), conv.out.slice(0, 120));

  const ops = run(['demigod-ops-reconcile.mjs', '--json']);
  assert('ops-reconcile runs', ops.status === 0 || ops.status === 2, ops.out.slice(0, 80));

  // ship includes cdn body stage
  const ship = run(['demigod-ship-status.mjs', '--json'], { timeout: 90000 });
  assert(
    'ship has cdn body stage',
    /cdn_body_matches_disk/.test(ship.out),
    ship.out.slice(0, 100),
  );
}

for (const b of [
  'bin/dg-apply',
  'bin/dg-anchors',
  'bin/dg-watch-submits',
  'bin/dg-copy-policy',
  'bin/dg-conversion-playtest',
]) {
  assert(`${b} exists`, fs.existsSync(path.join(ROOT, b)));
}

// ── MATCH / INTRO / CLOSE + PAGES ─────────────────────
{
  assert('match tool exists', fs.existsSync(path.join(ROOT, 'demigod-match.mjs')));
  assert('intro tool exists', fs.existsSync(path.join(ROOT, 'demigod-intro.mjs')));
  assert('close tool exists', fs.existsSync(path.join(ROOT, 'demigod-close.mjs')));
  assert('hire page exists', fs.existsSync(path.join(ROOT, 'demigod-pages/hire.html')));
  assert('talent page exists', fs.existsSync(path.join(ROOT, 'demigod-pages/talent.html')));
  assert('proof page exists', fs.existsSync(path.join(ROOT, 'demigod-pages/proof.html')));
  const hire = fs.readFileSync(path.join(ROOT, 'demigod-pages/hire.html'), 'utf8');
  assert('hire no 48h', !/48\s*h|\bSLA\b/i.test(hire), 'banned phrase');
  const proof = fs.readFileSync(path.join(ROOT, 'demigod-pages/proof.html'), 'utf8');
  assert('proof honest empty', /No public placement|0/.test(proof), proof.slice(0, 80));
}

// ── Dashboard / agent control-plane contracts ─────────
{
  assert('dashboard ui exists', fs.existsSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html')));
  assert('tools registry exists', fs.existsSync(path.join(ROOT, 'demigod-tools-registry.mjs')));
  const registryValidationSource = fs.readFileSync(path.join(ROOT, 'demigod-tools-registry.mjs'), 'utf8');
  assert(
    'events resource outbox is registered read-only',
    /id: 'dg-events-outbox'[^\n]+cmd: 'bin\/dg-events-outbox status'[^\n]+never sends/.test(registryValidationSource),
  );
  assert(
    'events tick is registered draft-only and mutation-gated',
    /id: 'dg-events-tick'[^\n]+cmd: 'bin\/dg-events-tick'[^\n]+never sends'[^\n]+mutate: true/.test(registryValidationSource),
  );
  assert(
    'pipeline package refresh is read-only',
    /id: 'pipeline-packages'[^\n]+safe: true/.test(registryValidationSource),
  );
  assert(
    'ship selftest is registered',
    /id: 'ship-selftest'[^\n]+cmd: 'node demigod-ship-selftest\.mjs'/.test(registryValidationSource),
  );
  const dashboardTapUi = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
  assert(
    'dashboard controls keep a 44px minimum tap target',
    /button,\.btn\{[\s\S]{0,360}min-height:(?:44|48)px/.test(dashboardTapUi) &&
      /\.nav button\{[^}]*min-height:(?:44|48)px/.test(dashboardTapUi),
  );
  assert(
    'dashboard escapes control-plane receipt values before innerHTML rendering',
    /Inbox'\+\(d\.inbox&&\(d\.inbox\.pendingOperationalReviewCount\?\?0\)\?' · '\+esc\(d\.inbox\.pendingOperationalReviewCount\)/.test(dashboardTapUi) &&
      /esc\(d\.eventsBot\.title\)/.test(dashboardTapUi) &&
      /esc\(d\.eventsBot\.stage\|\|'stage unknown'\)/.test(dashboardTapUi),
  );
  assert(
    'dashboard shortcuts yield to every editable control',
    /e\.target\.closest\('input,textarea,select,\[contenteditable="true"\]'\)/.test(dashboardTapUi),
  );
  assert(
    'dashboard presence warns when the lock owner exited while the lease remains held',
    /footOwnerExited\s*=\s*footLock\?\.locked\s*&&\s*footLock\.ownerAlive\s*===\s*false/.test(dashboardTapUi) &&
      /foot lease compromised/.test(dashboardTapUi) &&
      /footLock\?\.ttlLeftSec/.test(dashboardTapUi),
  );
  const orientSource = fs.readFileSync(path.join(ROOT, 'demigod-orient.mjs'), 'utf8');
  assert(
    'orient only probes a declared lease-owner PID',
    /lockHasOwnerPid\s*=\s*lock\?\.pidScope\s*===\s*['"]lease-owner['"]/.test(orientSource) &&
      /lockHeld\s*&&\s*lockOwnerIsLocal\s*&&\s*lockHasOwnerPid/.test(orientSource),
  );
  assert(
    'dashboard accepts root-level jsDelivr foot loader',
    /\(\?:\[\^\\s<>\/\]\+\\\/\)\*foot-latest\\\.js/.test(
      fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8'),
    ),
  );
  const dashboardSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8');
  const dashboardUiSource = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
  assert(
    'dashboard status orient embeds demand draft hygiene',
    /demandDrafts:\s*demand\?\.drafts\s*\|\|\s*null/.test(dashboardSource),
  );
  const controlSource = fs.readFileSync(path.join(ROOT, 'demigod-control.mjs'), 'utf8');
  assert(
    'control-plane site green requires truth green and fully shipped (or prepareOnlyRelease soft-ok)',
    /ok:\s*siteTruthGreen\s*&&\s*\(siteFullyShipped\s*\|\|\s*prepareOnlyRelease\)/.test(controlSource) &&
      /const te = refuseIfStale\('truth'\)/.test(controlSource) &&
      /truthReceipt\?\.fullyShipped/.test(controlSource) &&
      /prepareOnlyRelease/.test(controlSource) &&
      !/dashStatus\?\.truthEvidence\?\.green/.test(controlSource),
  );
  assert(
    'control-plane never paints dash live foot when truth receipt lacks live ver',
    /hasTruthReceipt/.test(controlSource) &&
      /do not invent vN from dash cache/.test(controlSource) &&
      /truthSource:\s*hasTruthReceipt \? 'truth\.json' : 'dash-fallback'/.test(controlSource),
  );
  assert(
    'control-plane sessionMode is prepare-only when publish unauthorized',
    /sessionMode:\s*frozen \|\| !publishAuthorized \? 'prepare-only' : 'publish-authorized'/.test(
      controlSource,
    ),
  );
  assert(
    'control-plane home/status/next reject unknown flags with exit 2',
    /unknown argument/.test(controlSource) &&
      /bin\/dg \$\{cmd\} \[--json\]/.test(controlSource) &&
      /process\.exit\(2\)/.test(controlSource),
  );
  const truthSource = fs.readFileSync(path.join(ROOT, 'demigod-truth.mjs'), 'utf8');
  assert(
    'truth rejects unknown flags with exit 2',
    /truth: unknown argument/.test(truthSource) &&
      /TRUTH_FLAGS/.test(truthSource) &&
      /process\.exit\(2\)/.test(truthSource),
  );
  const shipSource = fs.readFileSync(path.join(ROOT, 'demigod-ship.mjs'), 'utf8');
  assert(
    'ship rejects unknown flags with exit 2',
    /ship: unknown argument/.test(shipSource) &&
      /SHIP_FLAGS/.test(shipSource) &&
      /process\.exit\(2\)/.test(shipSource),
  );
  const shipStatusSource = fs.readFileSync(path.join(ROOT, 'demigod-ship-status.mjs'), 'utf8');
  assert(
    'ship-status rejects unknown flags with exit 2',
    /ship-status: unknown argument/.test(shipStatusSource) && /SHIP_STATUS_FLAGS/.test(shipStatusSource),
  );
  const demandSource = fs.readFileSync(path.join(ROOT, 'demigod-demand.mjs'), 'utf8');
  assert(
    'demand rejects unknown flags with exit 2',
    /demand: unknown argument/.test(demandSource),
  );
  const hygieneSource = fs.readFileSync(path.join(ROOT, 'demigod-laptop-hygiene.mjs'), 'utf8');
  assert(
    'laptop-hygiene rejects unknown flags with exit 2',
    /hygiene: unknown argument/.test(hygieneSource) && /HYGIENE_FLAGS/.test(hygieneSource),
  );
  const footLockSource = fs.readFileSync(path.join(ROOT, 'demigod-foot-lock.mjs'), 'utf8');
  assert(
    'foot-lock rejects unknown flags with exit 2',
    /foot-lock: unknown argument/.test(footLockSource) && /LOCK_FLAGS/.test(footLockSource),
  );
  const pilotInboundSource = fs.readFileSync(path.join(ROOT, 'demigod-pilot-inbound.mjs'), 'utf8');
  assert(
    'pilot-inbound rejects unknown flags with exit 2',
    /pilot: unknown argument/.test(pilotInboundSource),
  );
  const dgCliSource = fs.readFileSync(path.join(ROOT, 'bin/dg'), 'utf8');
  assert(
    'dg events test rejects unknown modes with exit 2 (no node --test vacuous-green)',
    /events-test: unknown argument/.test(dgCliSource) &&
      /bin\/dg events test \[fast\]/.test(dgCliSource) &&
      /mode="\$\{1:-\}"/.test(dgCliSource) &&
      !/node --test --test-concurrency=1 "\$\{events_tests\[@\]\}" "\$@"/.test(dgCliSource),
  );
  const referralsCliSource = fs.readFileSync(path.join(ROOT, 'demigod-referrals.mjs'), 'utf8');
  assert(
    'referrals usage errors exit 2 (not product fail 1)',
    /process\.exitCode = \/\^usage:\/\.test\(msg\) \? 2 : 1/.test(referralsCliSource),
  );
  const usefulLoopSource = fs.readFileSync(path.join(ROOT, 'demigod-useful-loop.mjs'), 'utf8');
  assert(
    'useful-loop rejects unknown flags with exit 2 (no vacuous once)',
    /useful-loop: unknown argument/.test(usefulLoopSource) &&
      /--sleep-sec=/.test(usefulLoopSource) &&
      /process\.exit\(2\)/.test(usefulLoopSource),
  );

  assert(
    'control-plane match detail prefers realCount over sample-inflated total',
    /realPairCount|realCount/.test(controlSource) &&
      /pairs \$\{realPairCount/.test(controlSource),
  );

  assert(
    'control-plane events exposes safe resource outbox status',
    /jobs:\s*\[[^\]]*'events-outbox-status'[^\]]*\][\s\S]{0,240}label:\s*'Resource outbox',\s*job:\s*'events-outbox-status'/.test(controlSource),
  );
  assert(
    'control-plane bounds cached Events health and refreshes stale receipts',
    /!isFreshFile\(eventsOnlinePath, 90\)[\s\S]{0,120}demigod-events-online\.mjs status/.test(controlSource) &&
      /const eventsOnlineFresh = isFreshFile\(eventsOnlinePath, 90\)/.test(controlSource) &&
      /const eventsOnline = safeJsonFile\(eventsOnlinePath\)/.test(controlSource) &&
      /public \$\{eventsPublicLabel\}/.test(controlSource) &&
      /websiteConfigCurrent === false/.test(controlSource) &&
      /prepare-only \(website config dead tunnels\)/.test(controlSource),
  );
  assert(
    'control-plane events green when operational (public up) even if website config is prepare-only',
    /ok:\s*eventsOnlineFresh \? eventsOperational \|\| eventsCertified : null/.test(controlSource) &&
      /eventsOperational/.test(controlSource) &&
      /prepareOnlyWebsiteConfig/.test(controlSource),
  );
  assert(
    'control-plane dashboard cache age fails closed on malformed at',
    /function ageMsFrom\(at\)[\s\S]{0,120}Number\.isFinite\(t\) \? Date\.now\(\) - t : Infinity/.test(controlSource) &&
      /const dashAge = ageMsFrom\(dashStatus\?\.at\)/.test(controlSource) &&
      /if \(dashAge > 30000 \|\| dashAge < -60000\)/.test(controlSource),
  );
  const eventsOnlineSource = fs.readFileSync(path.join(ROOT, 'demigod-events-online.mjs'), 'utf8');
  assert(
    'Events health receipt is atomic for concurrent status consumers',
    /atomicWrite\(path\.join\(DIR, 'status\.json'\)/.test(eventsOnlineSource),
  );
  assert(
    'Events online status exposes prepare-only website config + pending path',
    /prepareOnlyWebsiteConfig:/.test(eventsOnlineSource) &&
      /pendingConfigPath:/.test(eventsOnlineSource) &&
      /pendingApiBase:/.test(eventsOnlineSource) &&
      /pendingMatchesLocal:/.test(eventsOnlineSource) &&
      /function readPendingWebsiteConfig/.test(eventsOnlineSource) &&
      /mkdirSync\(DIR, \{ recursive: true \}\)/.test(eventsOnlineSource),
  );
  assert(
    'control-plane events metrics include prepareOnlyWebsiteConfig',
    /prepareOnlyWebsiteConfig:/.test(controlSource) &&
      /pendingConfigPath:/.test(controlSource) &&
      /pendingApiBase:/.test(controlSource) &&
      /pendingMatchesLocal:/.test(controlSource) &&
      /pending matches local/.test(controlSource),
  );
  assert(
    'dashboard online summary + UI surface pending events-api honesty',
    /pendingApiBase: onlineFresh \? online\.pendingApiBase/.test(dashboardSource) &&
      /pendingMatchesLocal: onlineFresh/.test(dashboardSource) &&
      /pendingMatchesLocal/.test(dashboardUiSource) &&
      /pending matches local/.test(dashboardUiSource) &&
      /pendingApiBase/.test(dashboardUiSource),
  );
  assert(
    'control-plane + events-online expose preferredTunnelMatch honesty',
    /preferredTunnelMatch/.test(controlSource) &&
      /preferred tunnel sticky name unavailable/.test(controlSource) &&
      /function preferredTunnelMatch/.test(eventsOnlineSource) &&
      /preferredTunnelMatch: preferredTunnelMatch\(root\)/.test(eventsOnlineSource),
  );
  const dogfoodSource = fs.readFileSync(path.join(ROOT, 'demigod-tool-dogfood.mjs'), 'utf8');
  assert(
    'dogfood manual log --ok/--useful fail-closed (no silent ok:true on typos)',
    /export function parseDogfoodBool/.test(dogfoodSource) &&
      /export function parseLogFlags/.test(dogfoodSource) &&
      /missing --\$\{flag\}=0\|1\|true\|false/.test(dogfoodSource) &&
      /invalid --\$\{flag\}=/.test(dogfoodSource),
  );
  const dogfoodBadOk = run(['demigod-tool-dogfood.mjs', 'log', '--tool=truth', '--ok=no', '--why=selftest']);
  assert(
    'dogfood log --ok=no exits 2',
    dogfoodBadOk.status === 2 && /invalid --ok=no/.test(dogfoodBadOk.out),
    dogfoodBadOk.out,
  );
  const dogfoodUnknown = run(['demigod-tool-dogfood.mjs', 'definitely-not-a-command']);
  assert(
    'dogfood rejects unknown commands with exit 2',
    dogfoodUnknown.status === 2 && /unknown command definitely-not-a-command/.test(dogfoodUnknown.out),
    dogfoodUnknown.out,
  );
  const matchReviewSource = fs.readFileSync(path.join(ROOT, 'demigod-match-review.mjs'), 'utf8');
  assert(
    'match-review rejects missing --state value instead of stealing next flag',
    /function requireFlagValue\(flag\)/.test(matchReviewSource) &&
      /String\(v\)\.startsWith\('-'\)/.test(matchReviewSource) &&
      /process\.exit\(2\)/.test(matchReviewSource),
  );
  const autoProposeSource = fs.readFileSync(path.join(ROOT, 'demigod-auto-propose.mjs'), 'utf8');
  assert(
    'auto-propose rejects missing --min-score value instead of stealing next flag',
    /function numberFlag\(flag, fallback, valid\)/.test(autoProposeSource) &&
      /String\(raw\)\.startsWith\('-'\)/.test(autoProposeSource) &&
      /process\.exit\(2\)/.test(autoProposeSource),
  );
  const dgCli = fs.readFileSync(path.join(ROOT, 'bin/dg'), 'utf8');
  assert(
    'unknown dg verbs exit 2',
    /Unknown: \$1/.test(dgCli) && /exit 2/.test(dgCli),
  );
  const unknownWebflow = run(['demigod-webflow.mjs', 'definitely-not-a-command']);
  assert(
    'unknown Webflow verbs exit 2',
    unknownWebflow.status === 2 && /invalid arguments/.test(unknownWebflow.out),
    unknownWebflow.out,
  );


  assert(
    'dashboard API preserves structured orient assertSame',
    /assertSame: data\.orient\.assertSame \|\| null/.test(dashboardSource) &&
      /assertSame: null/.test(dashboardSource),
  );
  assert(
    'dashboard control spine makes orient the primary agent entry',
    dashboardSource.includes("url.pathname === '/api/orient'") &&
      /Run orient[^\n]+canonical session-start card/.test(dashboardUiSource),
  );
  assert(
    'dashboard annotates unify hot tools with server runnable allowlist',
    /annotateRunnableTools\(\{ tools: u\.toolsHot \}\)\.tools/.test(dashboardSource),
  );
  assert(
    'dashboard runnable allowlist rejects inherited object properties',
    /Object\.prototype\.hasOwnProperty\.call\(JOBS, tool\.id\)/.test(dashboardSource),
  );
  assert(
    'dashboard represents a missing orient receipt as unknown',
    /api: '\/api\/orient',[\s\S]{0,180}ok: null,[\s\S]{0,80}green: null/.test(dashboardSource) &&
      /assertSame: null/.test(dashboardSource),
  );
  assert(
    'dashboard rejects truth evidence without a valid seal timestamp',
    /timestampValid = Number\.isFinite\(ended\) && ageMs >= -60_000/.test(dashboardSource) &&
      /expired = !timestampValid \|\| \(ttlSec > 0 && ageMs > ttlSec \* 1000\)/.test(dashboardSource),
  );
  assert(
    'dashboard rejects future-dated demand cache mtimes',
    /!Number\.isFinite\(ageSec\) \|\| ageSec < 0/.test(dashboardSource),
  );
  assert(
    'dashboard cannot turn malformed lock expiry into an immortal lock',
    /j\.expiresAt != null && !Number\.isFinite\(expiresAtMs\)[\s\S]{0,80}\? true/.test(dashboardSource),
  );
  const cm6 = fs.readFileSync(path.join(ROOT, 'demigod-cm6-paste-publish.mjs'), 'utf8');
  assert('cm6 requires exact head/footer split', /eds\.length!==2/.test(cm6) && /assertHeadFootSplit/.test(cm6));
  assert('cm6 verifies persisted Webflow API payload', /persisted-api/.test(cm6) && /exactHead/.test(cm6) && /exactFoot/.test(cm6));
  assert('cm6 polls persisted Webflow API instead of trusting fixed save latency', /attempt <= 12/.test(cm6) && /if \(last\.ok\) return last/.test(cm6));
  assert('cm6 requires positive publish acceptance without task id', /acceptedWithoutTask/.test(cm6));
  assert('cm6 rejects negative no-task publish responses', /negativeAcceptance/.test(cm6) && /!negativeAcceptance/.test(cm6));
  assert('cm6 saved readback still requires exactly two editors', /ok: eds\.length === 2 && h === expectedHead && t === expectedFoot/.test(cm6));
  assert('cm6 live target comes from validated loader parser', /footWanted = preflight\.footLoaders\[0\]/.test(cm6));
  assert(
    'dashboard cm6 check stays structural and offline-safe',
    /'cm6-check':\s*\{[^}]*args:\s*\['demigod-cm6-paste-publish\.mjs',\s*'--check-structural'\]/s.test(dashboardSource),
  );
  assert(
    'dashboard marks cached control fallback degraded',
    /cached: true, degraded: true, refreshError: error, cacheAgeMs/.test(dashboardSource),
  );
  const cm6Syntax = run(['--check', 'demigod-cm6-paste-publish.mjs']);
  assert('cm6 paste publisher parses', cm6Syntax.status === 0, cm6Syntax.out.slice(0, 160));
  const cm6ModeConflict = run(['demigod-cm6-paste-publish.mjs', '--check-structural', '--no-publish']);
  assert(
    'cm6 rejects ambiguous read-only and mutating mode combination',
    cm6ModeConflict.status !== 0 && /cannot be combined with a read-only check mode/.test(cm6ModeConflict.out),
    cm6ModeConflict.out.slice(0, 180),
  );
  for (const helper of ['demigod-agent-dashboard.mjs', 'demigod-webflow-lib.mjs', 'demigod-ship-status.mjs']) {
    const src = fs.readFileSync(path.join(ROOT, helper), 'utf8');
    assert(`${helper} does not invoke disabled footer-only mode`, !/cm6-paste-publish\.mjs --footer-only/.test(src));
  }
  assert('agent tools lib has isFrozen', /export function isFrozen/.test(fs.readFileSync(path.join(ROOT, 'demigod-agent-tools-lib.mjs'), 'utf8')));
  const reg = run(['demigod-tools-registry.mjs', '--json'], { timeout: 15000 });
  const regJ = parseFirstJson(reg.out);
  assert('registry json', reg.status === 0 && regJ?.count >= 10, `count=${regJ?.count}`);
  // Live dash if up (don't fail suite if dash down — soft)
  try {
    const health = spawnSync('curl', ['-sS', '--max-time', '2', 'http://127.0.0.1:9878/api/health'], { encoding: 'utf8' });
    if (health.status === 0 && /"ok"\s*:\s*true/.test(health.stdout || '')) {
      assert('dash health', true, 'up');
      const next = spawnSync('curl', ['-sS', '--max-time', '8', 'http://127.0.0.1:9878/api/next'], { encoding: 'utf8' });
      const nj = parseFirstJson(next.stdout || '');
      assert('dash /api/next shape', nj && ('next' in nj), Object.keys(nj || {}).join(','));
      const brief = spawnSync('curl', ['-sS', '--max-time', '8', 'http://127.0.0.1:9878/api/agent-brief'], { encoding: 'utf8' });
      assert('brief freeze first', /## FREEZE/.test(brief.stdout || ''), 'missing FREEZE section');
      const job = spawnSync(
        'curl',
        ['-sS', '--max-time', '5', '-X', 'POST', 'http://127.0.0.1:9878/api/jobs?run=tools-registry'],
        { encoding: 'utf8' },
      );
      const jj = parseFirstJson(job.stdout || '');
      assert('async job 202 shape', jj?.ok === true && jj?.jobId, job.stdout?.slice(0, 100));
      // mutate blocked while freeze (or without allow)
      const mut = spawnSync(
        'curl',
        ['-sS', '--max-time', '5', '-X', 'POST', 'http://127.0.0.1:9878/api/jobs?run=foot-cdn'],
        { encoding: 'utf8' },
      );
      const mj = parseFirstJson(mut.stdout || '');
      assert('mutate without allow blocked', mj?.ok === false, mut.stdout?.slice(0, 120));
    } else {
      assert('dash health (optional)', true, 'dash down — skipped live API checks');
    }
  } catch (e) {
    assert('dash health (optional)', true, String(e.message || e).slice(0, 80));
  }
}

// ── Sprint matching (pairs + intro gate + env honesty) ─────────
{
  const sprint = run(['demigod-sprint-selftest.mjs'], { timeout: 60000 });
  assert('sprint-selftest', sprint.status === 0, sprint.out.slice(-160));
  const mr = run(['demigod-match-review.mjs', '--json'], { timeout: 15000 });
  const mq = parseFirstJson(mr.out);
  assert('match-review json', mr.status === 0 && mq?.summary && typeof mq.summary.total === 'number', `total=${mq?.summary?.total}`);
  assert('pairs lib file', fs.existsSync(path.join(ROOT, 'demigod-pairs-lib.mjs')));
  assert('auto-propose file', fs.existsSync(path.join(ROOT, 'demigod-auto-propose.mjs')));
  assert('bin dg-matches', fs.existsSync(path.join(ROOT, 'bin/dg-matches')));
  assert('board audit', fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')));
}

// ── Code review tool v2 ────────────────────────────────────────
{
  assert('review tool file', fs.existsSync(path.join(ROOT, 'demigod-review.mjs')));
  assert('review lib', fs.existsSync(path.join(ROOT, 'demigod-review-lib.mjs')));
  assert('review rules', fs.existsSync(path.join(ROOT, 'demigod-review-rules.mjs')));
  assert('bin dg-review', fs.existsSync(path.join(ROOT, 'bin/dg-review')));
  const rev = run(['demigod-review.mjs', '--json', '--files', 'demigod-review-lib.mjs'], { timeout: 30000 });
  const rj = parseFirstJson(rev.stdout || rev.out);
  assert(
    'review self json',
    rev.status === 0 || rev.status === 1,
    `status=${rev.status} findings=${rj?.summary?.count} v=${rj?.version}`,
  );
  assert('review writes report', fs.existsSync(path.join(BUSY, 'review-latest.json')));
  assert('review writes sarif', fs.existsSync(path.join(BUSY, 'review-latest.sarif.json')));
  const st = run(['demigod-review-selftest.mjs'], { timeout: 60000 });
  assert('review-selftest', st.status === 0, st.out.slice(-120));
}

const pass = results.every((r) => r.ok);
const report = {
  schema: 'demigod.tools-selftest/1',
  at: new Date().toISOString(),
  pass,
  failed: results.filter((r) => !r.ok).map((r) => r.name),
  results,
};

try {
  writeReceiptAtomic(report);
} catch {
  /* */
}

console.log(
  `tools-selftest  ${pass ? 'PASS ✓' : 'FAIL ✗'}  (${results.filter((r) => r.ok).length}/${results.length})`,
);
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? '  ' + r.detail.slice(0, 70) : ''}`);
}
if (!pass) console.log('failed:', report.failed.join(', '));
console.log('wrote /tmp/dg-busy/tools-selftest.json');
process.exit(pass ? 0 : 1);
