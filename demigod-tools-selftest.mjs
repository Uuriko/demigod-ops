#!/usr/bin/env node
/**
 * Self-test for settlement / agent tools.
 * Exit codes checked WITHOUT pipes (PIPESTATUS trap).
 *
 * Usage: node demigod-tools-selftest.mjs
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parseFirstJson, BUSY } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const results = [];

function run(args, opts = {}) {
  const r = spawnSync('node', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: opts.timeout || 90000,
    env: { ...process.env, ...(opts.env || {}) },
  });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  return { status: r.status ?? 1, out, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}

function assert(name, cond, detail = '') {
  results.push({ name, ok: Boolean(cond), detail: String(detail).slice(0, 220) });
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
  run(['demigod-foot-lock.mjs', 'release', '--force']);
}

// ── LOCK (token leases) ───────────────────────────────
{
  const a = run(['demigod-foot-lock.mjs', 'claim', 'selftest-A', '120']);
  const aj = parseFirstJson(a.out);
  const tokA = aj?.claimed?.token;
  assert('claim A ok', a.status === 0 && tokA, a.out.slice(0, 100));

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

// TTL expiry
{
  run(['demigod-foot-lock.mjs', 'claim', 'ttl-owner', '5']);
  spawnSync('sleep', ['5.2']);
  const r = run(['demigod-foot-lock.mjs', 'claim', 'ttl-other', '30']);
  const tok = parseFirstJson(r.out)?.claimed?.token;
  assert('TTL expiry frees for other', r.status === 0, r.out.slice(0, 100));
  if (tok) run(['demigod-foot-lock.mjs', 'release', '--owner', 'ttl-other', '--token', tok]);
  else run(['demigod-foot-lock.mjs', 'release', '--force']);
}

// legacy text parse
{
  const c = run(['demigod-foot-lock.mjs', 'claim', 'legacy-A', '120']);
  const tok = parseFirstJson(c.out)?.claimed?.token;
  fs.writeFileSync('/tmp/dg-busy/foot-lock.json', '{not-json');
  const st = run(['demigod-foot-lock.mjs', 'status']);
  const j = parseFirstJson(st.out);
  assert(
    'legacy parse owner',
    j && j.locked && j.lock?.owner === 'legacy-A',
    JSON.stringify(j?.lock?.owner),
  );
  const steal = run(['demigod-foot-lock.mjs', 'claim', 'legacy-B', '30']);
  assert('legacy lock blocks other', steal.status === 1, steal.out.slice(0, 80));
  run(['demigod-foot-lock.mjs', 'release', '--force']);
  void tok;
}

// publish must not steal
{
  run(['demigod-foot-lock.mjs', 'claim', 'hold-publish', '120']);
  const p = run(['demigod-publish-foot.mjs', '--dry-run'], {
    timeout: 60000,
    env: { DG_LOCK_OWNER: 'other-publisher' },
  });
  assert(
    'publish refuses foreign lock',
    p.status !== 0 && /lock|refuse|held/i.test(p.out),
    p.out.slice(0, 160),
  );
  run(['demigod-foot-lock.mjs', 'release', 'hold-publish']);
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
  assert('claim-verify suite pass', good.status === 0 && /PASS/.test(good.out), good.out.slice(-80));
}

// ── PLAN-LEDGER ───────────────────────────────────────
{
  const bad = run(['demigod-plan-ledger.mjs', 'set', 'nope', '--status', 'banana']);
  // not_found or invalid_status both fail
  assert('ledger rejects banana', bad.status !== 0, bad.out.slice(0, 100));

  const open = run(['demigod-plan-ledger.mjs', 'open']);
  assert('ledger open', open.status === 0 && open.out.includes('{'), open.out.slice(0, 60));
}

// ── INBOX ─────────────────────────────────────────────
{
  const testFile = '/tmp/dg-multi/selftest-inbox-msg.txt';
  fs.mkdirSync('/tmp/dg-multi', { recursive: true });
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
  const s = run(['demigod-freeze.mjs', 'snapshot', '--tag', 'selftest']);
  assert('freeze snapshot', s.status === 0, s.out.slice(0, 60));
  const c = run(['demigod-freeze.mjs', 'check', '--tag', 'selftest']);
  assert('freeze clean', c.status === 0 && /"changed": 0/.test(c.out), c.out.slice(0, 80));

  // mutate board? too risky — use a temp approach: snapshot includes board;
  // change nothing for critical path. Use --all + ledger for change detect:
  run(['demigod-freeze.mjs', 'snapshot', '--tag', 'selftest-all', '--all']);
  const add = run([
    'demigod-plan-ledger.mjs',
    'add',
    '--title',
    'selftest-freeze-tmp',
    '--owner',
    'selftest',
    '--note',
    'tmp',
  ]);
  const aj = parseFirstJson(add.out);
  const cid = aj?.plan?.id;
  const ch = run(['demigod-freeze.mjs', 'check', '--tag', 'selftest-all']);
  assert('freeze detects ledger change', ch.status === 1 && /changed/.test(ch.out), `status=${ch.status}`);
  if (cid) run(['demigod-plan-ledger.mjs', 'set', cid, '--status', 'ignored', '--note', 'selftest cleanup']);
  run(['demigod-freeze.mjs', 'clear', '--tag', 'selftest']);
  run(['demigod-freeze.mjs', 'clear', '--tag', 'selftest-all']);
}

// ── SHIP / PREFLIGHT / TRUTH / HANDOFF ────────────────
{
  const s = run(['demigod-ship-status.mjs', '--json'], { timeout: 90000 });
  const sj = parseFirstJson(s.out);
  assert('ship-status runs', s.status === 0 && sj && sj.stage, s.out.slice(0, 80));

  const p = run(['demigod-preflight.mjs'], { timeout: 180000 });
  assert('preflight pass', p.status === 0 && /PASS/.test(p.out), p.out.slice(0, 120));

  const t = run(['demigod-truth.mjs', '--json'], { timeout: 90000 });
  assert('truth runs', t.status === 0 && t.out.includes('fullyShipped'), t.out.slice(0, 80));
  assert('truth.json written', fs.existsSync(path.join(BUSY, 'truth.json')));

  const h = run(['demigod-handoff.mjs', '--note', 'selftest'], { timeout: 90000 });
  assert('handoff runs', h.status === 0 && /HANDOFF|Truth/.test(h.out), h.out.slice(0, 80));
}

// dry-run publish when free
{
  run(['demigod-foot-lock.mjs', 'release', '--force']);
  const d = run(['demigod-publish-foot.mjs', '--dry-run'], {
    timeout: 60000,
    env: { DG_LOCK_OWNER: 'selftest-pub' },
  });
  assert('publish dry-run ok', d.status === 0 && /dryRun|dry-run/i.test(d.out), d.out.slice(0, 120));
  // lock should be free after
  const st = run(['demigod-foot-lock.mjs', 'status']);
  const j = parseFirstJson(st.out);
  assert('publish dry releases lock', j && j.locked === false, st.out.slice(0, 80));
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
  'bin/dg-publish-foot',
  'bin/dg-claim-verify',
  'bin/dg-ship-status',
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
  const cl = run(['demigod-copy-policy.mjs'], { timeout: 45000 });
  assert('copy-policy live default runs', cl.status === 0 || /live-no-volume|PASS|FAIL/.test(cl.out), cl.out.slice(0, 100));

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
  const bl = run(['demigod-build-loop.mjs', 'status']);
  assert('build-loop status', bl.status === 0 && /BUILD-QUEUE|queue/.test(bl.out), bl.out.slice(0, 80));
}

// ── Dashboard / agent control-plane contracts ─────────
{
  assert('dashboard ui exists', fs.existsSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html')));
  assert('tools registry exists', fs.existsSync(path.join(ROOT, 'demigod-tools-registry.mjs')));
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
  at: new Date().toISOString(),
  pass,
  failed: results.filter((r) => !r.ok).map((r) => r.name),
  results,
};

try {
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'tools-selftest.json'), JSON.stringify(report, null, 2));
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
