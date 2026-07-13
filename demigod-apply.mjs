#!/usr/bin/env node
/**
 * dg-apply — byte-exact plan apply with sha preconditions + ledger receipt.
 *
 * Plan JSON schema (outbox):
 * {
 *   "title": "…",
 *   "owner": "fable",
 *   "pre": { "demigod-foot-core.js": "<sha256>" },
 *   "replacements": [
 *     { "file": "demigod-foot-core.js", "old": "…", "new": "…", "count": 1 }
 *   ],
 *   "verify": ["node --check demigod-foot-core.js"],
 *   "smoke": true,
 *   "lock": true
 * }
 *
 * Usage:
 *   node demigod-apply.mjs check <plan.json>
 *   node demigod-apply.mjs apply <plan.json> [--dry-run] [--no-ledger]
 *   node demigod-apply.mjs list
 *   node demigod-apply.mjs scaffold --title "…" --file demigod-foot-core.js
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  BUSY,
  sha256File,
  atomicWrite,
  ensureBusy,
  readJson,
  flag,
  opt,
  hostname,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.join(BUSY, 'outbox');
const APPLY_LOG = path.join(BUSY, 'apply-log.jsonl');
const LEDGER = path.join(ROOT, 'DEMIGOD-PLAN-LEDGER.json');
const args = process.argv.slice(2);
const cmd = args[0] || 'list';

function resolvePlanPath(p) {
  if (!p) return null;
  if (fs.existsSync(p)) return path.resolve(p);
  const a = path.join(OUTBOX, path.basename(p));
  if (fs.existsSync(a)) return a;
  const b = path.join(ROOT, p);
  if (fs.existsSync(b)) return b;
  return null;
}

/** Refuse path escape outside ROOT (realpath when possible) */
function safeRel(rel) {
  if (!rel || typeof rel !== 'string') throw new Error('missing file path');
  if (path.isAbsolute(rel)) throw new Error(`absolute paths forbidden: ${rel}`);
  if (rel.includes('..') || rel.startsWith('/') || rel.includes('\0')) {
    throw new Error(`path escape forbidden: ${rel}`);
  }
  const rootReal = fs.realpathSync(ROOT);
  const full = path.resolve(ROOT, rel);
  // If file exists, resolve symlinks; else check parent realpath
  let real;
  try {
    real = fs.realpathSync(full);
  } catch {
    try {
      const parent = fs.realpathSync(path.dirname(full));
      real = path.join(parent, path.basename(full));
    } catch {
      real = full;
    }
  }
  if (!real.startsWith(rootReal + path.sep) && real !== rootReal) {
    throw new Error(`path outside ROOT (realpath): ${rel} → ${real}`);
  }
  return { rel: path.relative(ROOT, full) || rel, full, real };
}

/** Only allow safe verify cmds (no arbitrary bash) */
function safeVerifyCmd(c) {
  const s = String(c || '').trim();
  if (!s) return null;
  // allow: node --check FILE | node demigod-*.mjs [...] | npm run demigod:*
  if (/^node\s+--check\s+[\w./-]+$/.test(s)) return s;
  if (/^node\s+demigod-[\w.-]+\.mjs(\s+[\w./@=-]+)*$/.test(s)) return s;
  if (/^npm\s+run\s+demigod:[\w:-]+$/.test(s)) return s;
  return null;
}

function loadPlan(p) {
  const full = resolvePlanPath(p);
  if (!full) return { error: 'not_found', path: p };
  const j = readJson(full);
  if (!j) return { error: 'invalid_json', path: full };
  return { path: full, plan: j };
}

function countOccurrences(hay, needle) {
  let n = 0;
  let i = 0;
  while (true) {
    const j = hay.indexOf(needle, i);
    if (j < 0) break;
    n++;
    i = j + Math.max(1, needle.length);
  }
  return n;
}

function footTouched(plan) {
  return (plan.replacements || []).some((r) =>
    /foot-core|footer-lite|head-minimal|head-styles|FOOT-CDN/i.test(r.file),
  );
}

function checkPlan(plan) {
  const issues = [];
  const anchors = [];
  const pre = plan.pre || {};

  for (const [rel, wantSha] of Object.entries(pre)) {
    try {
      const { full } = safeRel(rel);
      const got = sha256File(full);
      if (!got) issues.push({ type: 'pre_missing', file: rel });
      else if (got !== wantSha) {
        issues.push({
          type: 'pre_sha_mismatch',
          file: rel,
          want: String(wantSha).slice(0, 12),
          got: got.slice(0, 12),
        });
      }
    } catch (e) {
      issues.push({ type: 'path_unsafe', file: rel, detail: String(e.message || e) });
    }
  }

  const reps = plan.replacements || [];
  if (!reps.length) issues.push({ type: 'no_replacements' });

  for (const rep of reps) {
    let full;
    try {
      full = safeRel(rep.file).full;
    } catch (e) {
      issues.push({ type: 'path_unsafe', file: rep.file, detail: String(e.message || e) });
      continue;
    }
    if (!fs.existsSync(full)) {
      issues.push({ type: 'missing_file', file: rep.file });
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    const expect = Number(rep.count ?? 1) || 1;
    const old = rep.old ?? rep.from ?? '';
    const count = countOccurrences(text, old);
    const a = {
      file: rep.file,
      count,
      expect,
      ok: count === expect,
      preview: String(old).slice(0, 60).replace(/\n/g, '\\n'),
    };
    anchors.push(a);
    if (!a.ok) {
      issues.push({
        type: count === 0 ? 'anchor_missing' : 'anchor_not_unique',
        file: rep.file,
        count,
        expect,
      });
    }
    if (rep.new == null && rep.to == null) {
      issues.push({ type: 'missing_new', file: rep.file });
    }
  }

  return { ok: issues.length === 0, issues, anchors };
}

function applyReplacements(plan, dry) {
  const before = {};
  const after = {};
  const backups = [];

  const byFile = new Map();
  for (const rep of plan.replacements || []) {
    if (!byFile.has(rep.file)) byFile.set(rep.file, []);
    byFile.get(rep.file).push(rep);
  }

  for (const [rel, reps] of byFile) {
    const { full } = safeRel(rel);
    let text = fs.readFileSync(full, 'utf8');
    before[rel] = sha256File(full);

    for (const rep of reps) {
      const old = rep.old ?? rep.from;
      const neu = rep.new ?? rep.to;
      const expect = Number(rep.count ?? 1) || 1;
      const count = countOccurrences(text, old);
      if (count !== expect) {
        throw new Error(`apply aborted: ${rel} anchor count ${count} ≠ ${expect}`);
      }
      let left = expect;
      let out = '';
      let i = 0;
      while (left > 0) {
        const j = text.indexOf(old, i);
        if (j < 0) throw new Error(`apply aborted: lost anchor mid-apply ${rel}`);
        out += text.slice(i, j) + neu;
        i = j + old.length;
        left--;
      }
      out += text.slice(i);
      text = out;
    }

    after[rel] = crypto.createHash('sha256').update(text).digest('hex');
    if (!dry) {
      const bakDir = path.join(BUSY, 'apply-backups');
      fs.mkdirSync(bakDir, { recursive: true });
      const safeName = rel.replace(/[\/\\]/g, '__');
      const bak = path.join(bakDir, `${safeName}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}.bak`);
      fs.copyFileSync(full, bak);
      backups.push({ dest: rel, full, bak });
      atomicWrite(full, text);
      after[rel] = sha256File(full);
    }
  }

  return { before, after, touched: [...byFile.keys()], backups };
}

function runVerify(cmds) {
  const out = [];
  for (const c of cmds || []) {
    const safe = safeVerifyCmd(c);
    if (!safe) {
      out.push({ cmd: c, status: 2, ok: false, detail: 'verify cmd not in allowlist' });
      continue;
    }
    const parts = safe.split(/\s+/);
    const r = spawnSync(parts[0], parts.slice(1), {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    out.push({
      cmd: safe,
      status: r.status,
      ok: r.status === 0,
      detail: ((r.stdout || '') + (r.stderr || '')).trim().slice(0, 200),
    });
  }
  return out;
}

function ledgerAddApplied(plan, receipt) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  } catch {
    data = { schema: 1, plans: [] };
  }
  const id = `plan_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const entry = {
    id,
    at: new Date().toISOString(),
    status: receipt.ok ? 'applied' : 'partial',
    title: plan.title || path.basename(receipt.planPath || 'apply'),
    owner: plan.owner || 'grok',
    paths: receipt.touched || [],
    verify: (plan.verify || []).slice(),
    stop: plan.stop || 'gates green',
    source: receipt.planPath || '',
    note: receipt.ok ? 'dg-apply receipt' : `dg-apply issues: ${receipt.error || ''}`,
    afterSha: receipt.after,
    beforeSha: receipt.before,
    history: [
      {
        at: new Date().toISOString(),
        status: receipt.ok ? 'applied' : 'partial',
        by: process.env.DG_LOCK_OWNER || process.env.USER || 'grok',
        note: 'demigod-apply.mjs',
      },
    ],
  };
  data.plans = data.plans || [];
  data.plans.unshift(entry);
  data.at = new Date().toISOString();
  atomicWrite(LEDGER, JSON.stringify(data, null, 2) + '\n');
  return entry;
}

function appendLog(rec) {
  ensureBusy();
  fs.appendFileSync(APPLY_LOG, JSON.stringify(rec) + '\n');
  atomicWrite(path.join(BUSY, 'apply-latest.json'), JSON.stringify(rec, null, 2) + '\n');
}

if (cmd === 'list') {
  ensureBusy();
  fs.mkdirSync(OUTBOX, { recursive: true });
  const files = fs
    .readdirSync(OUTBOX)
    .filter((f) => f.endsWith('.json'))
    .map((name) => {
      const full = path.join(OUTBOX, name);
      const st = fs.statSync(full);
      const j = readJson(full) || {};
      return {
        name,
        path: full,
        title: j.title || name,
        mtime: st.mtime.toISOString(),
        replacements: (j.replacements || []).length,
      };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
  console.log(JSON.stringify({ at: new Date().toISOString(), outbox: OUTBOX, files }, null, 2));
  process.exit(0);
}

if (cmd === 'scaffold') {
  const title = opt(args, '--title', 'untitled apply plan');
  const file = opt(args, '--file', 'demigod-foot-core.js');
  ensureBusy();
  fs.mkdirSync(OUTBOX, { recursive: true });
  const sha = sha256File(path.join(ROOT, file));
  const plan = {
    title,
    owner: process.env.DG_LOCK_OWNER || 'fable',
    createdAt: new Date().toISOString(),
    pre: sha ? { [file]: sha } : {},
    replacements: [
      {
        file,
        old: 'REPLACE_ME_OLD_ANCHOR',
        new: 'REPLACE_ME_NEW_TEXT',
        count: 1,
      },
    ],
    verify: file.includes('foot-core') ? ['node --check demigod-foot-core.js'] : [],
    smoke: /foot-core/.test(file),
    lock: /foot-core|footer|head/.test(file),
    stop: 'anchors pass + verify green',
  };
  const name = `plan-${Date.now().toString(36)}.json`;
  const full = path.join(OUTBOX, name);
  atomicWrite(full, JSON.stringify(plan, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, path: full, plan }, null, 2));
  process.exit(0);
}

if (cmd === 'check' || cmd === 'apply') {
  const planArg = args[1];
  const loaded = loadPlan(planArg);
  if (loaded.error) {
    console.error(JSON.stringify({ ok: false, ...loaded }));
    process.exit(1);
  }
  const { plan, path: planPath } = loaded;
  const dry = flag(args, '--dry-run') || cmd === 'check';
  // check is always dry
  const isCheck = cmd === 'check';
  const noLedger = flag(args, '--no-ledger');

  const check = checkPlan(plan);
  if (isCheck) {
    console.log(JSON.stringify({ ok: check.ok, planPath, ...check }, null, 2));
    process.exit(check.ok ? 0 : 1);
  }

  if (!check.ok) {
    console.error(JSON.stringify({ ok: false, error: 'check_failed', planPath, ...check }, null, 2));
    process.exit(1);
  }

  // Session freeze detector (optional tag session)
  if (!flag(args, '--no-freeze-check') && footTouched(plan)) {
    const fr = spawnSync('node', ['demigod-freeze.mjs', 'check', '--tag', 'session'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 15000,
    });
    if (fr.status === 1) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'freeze_churn',
          detail: (fr.stdout || fr.stderr || '').slice(0, 400),
          hint: 'critical files changed mid-session — review freeze check or snapshot again',
        }),
      );
      process.exit(1);
    }
  }

  let lockOwner = null;
  let lockToken = null;
  const needLock = plan.lock !== false && footTouched(plan);
  const doDry = flag(args, '--dry-run');

  if (needLock && !doDry) {
    lockOwner = process.env.DG_LOCK_OWNER || process.env.USER || 'dg-apply';
    const priorTok = process.env.DG_LOCK_TOKEN || null;
    const claimArgs = [
      'demigod-foot-lock.mjs',
      'claim',
      '--owner',
      lockOwner,
      '--ttl',
      '900',
      '--why',
      `dg-apply: ${plan.title || planPath}`,
    ];
    if (priorTok) claimArgs.push('--token', priorTok);
    const claim = spawnSync('node', claimArgs, { cwd: ROOT, encoding: 'utf8' });
    if (claim.status !== 0) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'lock_held',
          detail: (claim.stdout || claim.stderr || '').slice(0, 300),
        }),
      );
      process.exit(1);
    }
    try {
      const j = JSON.parse(claim.stdout || '{}');
      lockToken = j.claimed?.token || priorTok;
      if (lockToken) process.env.DG_LOCK_TOKEN = lockToken;
    } catch {
      /* */
    }
  }

  const receipt = {
    at: new Date().toISOString(),
    ok: false,
    dryRun: doDry,
    planPath,
    title: plan.title || null,
    host: hostname(),
    before: null,
    after: null,
    touched: [],
    verify: [],
    error: null,
  };

  try {
    const applied = applyReplacements(plan, doDry);
    receipt.before = applied.before;
    receipt.after = applied.after;
    receipt.touched = applied.touched;
    receipt.backups = applied.backups || [];

    if (!doDry) {
      const verifyCmds = [...(plan.verify || [])];
      if (plan.smoke && footTouched(plan)) {
        verifyCmds.push('node demigod-foot-smoke.mjs');
      }
      if (footTouched(plan) && !verifyCmds.some((c) => c.includes('--check'))) {
        verifyCmds.unshift('node --check demigod-foot-core.js');
      }
      receipt.verify = runVerify(verifyCmds);
      const verifyOk = receipt.verify.every((v) => v.ok);
      if (!verifyOk) {
        receipt.error = 'verify_failed';
        receipt.ok = false;
        // rollback from backups when verify fails (explicit dest map)
        if (receipt.backups?.length) {
          receipt.rollback = [];
          for (const b of receipt.backups) {
            try {
              if (b.dest && b.bak) {
                fs.copyFileSync(b.bak, path.join(ROOT, b.dest));
                receipt.rollback.push({ bak: b.bak, restored: b.dest });
              }
            } catch (e) {
              receipt.rollback.push({ bak: b?.bak, error: String(e.message || e) });
            }
          }
        }
      } else {
        receipt.ok = true;
      }
    } else {
      receipt.ok = true;
      receipt.note = 'dry-run — no files written';
    }

    if (!doDry && !noLedger) {
      receipt.ledger = ledgerAddApplied(plan, receipt);
    }

    appendLog(receipt);
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(receipt.ok ? 0 : 1);
  } catch (e) {
    receipt.error = String(e.message || e);
    receipt.ok = false;
    appendLog(receipt);
    console.error(JSON.stringify(receipt, null, 2));
    process.exit(1);
  } finally {
    if (lockOwner && !doDry) {
      const relArgs = ['demigod-foot-lock.mjs', 'release', '--owner', lockOwner];
      if (lockToken) relArgs.push('--token', lockToken);
      else relArgs.push('--force');
      spawnSync('node', relArgs, { cwd: ROOT, encoding: 'utf8' });
    }
  }
}

console.error('usage: list | scaffold | check <plan.json> | apply <plan.json> [--dry-run] [--no-ledger]');
process.exit(2);
