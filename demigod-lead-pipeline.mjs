#!/usr/bin/env node
/**
 * demigod-lead-pipeline — idempotent stage ticks for lead automation.
 *   node demigod-lead-pipeline.mjs tick [--stage=...] [--force-paused]
 * No auto-send. Reads DESIGN/FOCUS under /tmp/dg-busy/lead-system/.
 */
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { withFileLock } from './demigod-agent-tools-lib.mjs';
import { cmdApproveDrafted, cmdL1Snapshot, cmdSendPackage, currentStatusReport } from './demigod-funnel.mjs';
import { refreshInviteDrain } from './demigod-events-invite-drain.mjs';
import {
  enrichAttemptsExhausted,
  enrichRecentlyAttempted,
  leadCollectionPaused,
  needsContactEnrich,
  readLeadFocus,
} from './demigod-lead-collect.mjs';

/** Code lives next to this file; DEMIGOD_ROOT only remaps lead/data paths (selftest isolation). */
const CODE = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DEMIGOD_ROOT || CODE;
const CRM_LOCK = path.join(DATA, 'DEMIGOD-LEADS.json.lock');

/**
 * policy_hold leads that still need contact and are outside 24h enrich cooldown.
 * -1 = unreadable SoR.
 */
function countHoldsScrapeDue() {
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(DATA, 'DEMIGOD-LEADS.json'), 'utf8'));
    let due = 0;
    for (const lead of doc.partners || []) {
      const st = lead.state || lead.status || '';
      if (st !== 'policy_hold') continue;
      if (!needsContactEnrich(lead)) continue;
      if (enrichRecentlyAttempted(lead)) continue;
      if (enrichAttemptsExhausted(lead)) continue;
      due++;
    }
    return due;
  } catch {
    return -1;
  }
}
const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const stage = stageArg ? stageArg.slice('--stage='.length) : 'all';
const forcePaused = args.includes('--force-paused');
// Prefer isolated FOCUS under DEMIGOD_ROOT (selftest), then busy SoR path.
const focus = readLeadFocus({ root: DATA });
const focusPaused = leadCollectionPaused(focus);
const eventsFocused = /(?:operating mode focus:\s*events bot|^#\s*events bot\b)/im.test(focus);
const paused = stage === 'all' && focusPaused && !forcePaused;
const readOnlyStages = new Set(['status', 'packages', 'selftest', 'policy', 'all']);
const explicitMutation = focusPaused && !readOnlyStages.has(stage);
const stages = new Set([
  'status',
  'collect',
  'triage',
  'packages',
  'selftest',
  'draft',
  'join',
  'policy',
  'followup',
  'match',
  'replies',
  'intro',
  'pilot',
  'invoice',
  'all',
]);

if (
  args[0] !== 'tick' ||
  args.length > 3 ||
  args.filter((a) => a.startsWith('--stage=')).length > 1 ||
  args.some((a, i) => i > 0 && a !== stageArg && a !== '--force-paused') ||
  args.filter((a) => a === '--force-paused').length > 1 ||
  !stages.has(stage)
) {
  console.error(
    'usage: node demigod-lead-pipeline.mjs tick [--stage=status|collect|triage|packages|selftest|draft|join|policy|followup|match|replies|intro|pilot|invoice|all] [--force-paused]',
  );
  process.exit(2);
}

if (explicitMutation && !forcePaused) {
  console.error(JSON.stringify({ focusPaused: true, explicitMutation: true, stage, error: 'requires --force-paused' }));
  process.exit(2);
}

function run(args, t = 180000, env = {}) {
  const script = path.isAbsolute(args[0]) ? args[0] : path.join(CODE, args[0]);
  const r = spawnSync(process.execPath, [script, ...args.slice(1)], {
    cwd: CODE,
    encoding: 'utf8',
    timeout: t,
    maxBuffer: 8e6,
    env: { ...process.env, DEMIGOD_ROOT: DATA, ...env },
  });
  return { status: r.error ? 1 : (r.status ?? 1), out: (r.stdout || '').slice(-4000), err: String(r.error || r.stderr || '').slice(-1000) };
}

function readFunnelStatus() {
  try {
    return { status: 0, out: JSON.stringify(currentStatusReport()), err: '' };
  } catch (error) {
    return { status: 1, out: '', err: String(error) };
  }
}

const results = {};
const isAll = stage === 'all' && !paused;

/** Record a hard stage result; abort immediately so composite stages cannot mutate after failure. */
function record(name, result) {
  results[name] = result;
  if ((result.status ?? 1) !== 0 && !result.soft) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          stage,
          failed: name,
          at: new Date().toISOString(),
          autoDm: false,
          autoSend: false,
          boardWrites: false,
          results: Object.fromEntries(
            Object.entries(results).map(([k, v]) => [
              k,
              { status: v.status, tail: ((v.status ? v.err : v.out) || v.out || '').slice(-300) },
            ]),
          ),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

/** Soft stage: never aborts the pipeline (Events tunnel flakiness, etc.). */
function recordSoft(name, result) {
  results[name] = { ...result, soft: true };
}

function refreshPackages({ hard = false } = {}) {
  const recordPackage = hard ? record : recordSoft;
  if (DATA !== CODE) {
    for (const name of ['human_package', 'send_package', 'invite_drain', 'l1_snapshot']) {
      recordPackage(name, { status: 0, out: 'skipped (DEMIGOD_ROOT isolated)' });
    }
    return;
  }
  const lock = path.join('/tmp/dg-busy/funnel', 'package-refresh.lock');
  const commit = path.join('/tmp/dg-busy/funnel', 'package-commit-latest.json');
  const crm = path.join(DATA, 'DEMIGOD-LEADS.json');
  const relativeFiles = [
    'funnel/approve-batch-latest.md',
    'funnel/approve-email-first-latest.md',
    'funnel/send-batch-latest.md',
    'funnel/send-email-first-latest.md',
    'funnel/l1-snapshot-latest.json',
    'events-bot/HUMAN-INVITE-URLS.md',
    'events-bot/INVITE-DRAIN.md',
    'events-bot/invite-drain-latest.json',
    'events-bot/outbox-purge-latest.json',
  ];
  const generations = path.join('/tmp/dg-busy', 'package-generations');
  const generation = path.join(generations, `${Date.now()}-${process.pid}`);
  const staging = `${generation}.tmp`;
  let failure = null;
  const completed = [];
  try {
    fs.mkdirSync(path.dirname(lock), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(lock), 0o700);
    fs.mkdirSync(generations, { recursive: true, mode: 0o700 });
    fs.chmodSync(generations, 0o700);
    withFileLock(lock, () => {
      const crmSha = crypto.createHash('sha256').update(fs.readFileSync(crm)).digest('hex');
      const jobs = [
        ['human_package', () => cmdApproveDrafted(['--dry-run', '--package', '--note=pipeline-refresh'], { emit: false, busyDir: staging })],
        ['send_package', () => cmdSendPackage(['--note=pipeline-refresh'], { emit: false, busyDir: staging })],
        ['invite_drain', () => refreshInviteDrain({ dropDir: staging })],
        ['l1_snapshot', () => cmdL1Snapshot({ emit: false, busyDir: staging })],
      ];
      try {
        fs.mkdirSync(staging, { recursive: true, mode: 0o700 });
        fs.chmodSync(staging, 0o700);
        for (const [name, report] of jobs) {
          let result;
          try {
            result = { status: 0, out: JSON.stringify(report()), err: '' };
          } catch (error) {
            result = { status: 1, out: '', err: String(error) };
          }
          if (result.status) {
            failure = [name, result];
            break;
          }
          if (crypto.createHash('sha256').update(fs.readFileSync(crm)).digest('hex') !== crmSha) {
            failure = ['package_snapshot', { status: 1, err: 'CRM changed during package refresh' }];
            break;
          }
          completed.push([name, result]);
        }
        if (!failure) {
          for (const entry of fs.readdirSync(staging, { recursive: true })) {
            const item = path.join(staging, entry);
            const stat = fs.lstatSync(item);
            if (stat.isDirectory()) fs.chmodSync(item, 0o700);
            else if (stat.isFile()) fs.chmodSync(item, 0o600);
          }
          withFileLock(CRM_LOCK, () => {
            if (crypto.createHash('sha256').update(fs.readFileSync(crm)).digest('hex') !== crmSha) {
              throw new Error('CRM changed before package commit');
            }
            const files = Object.fromEntries(relativeFiles.map((file) => [
              file,
              crypto.createHash('sha256').update(fs.readFileSync(path.join(staging, file))).digest('hex'),
            ]));
            fs.mkdirSync(generations, { recursive: true });
            fs.renameSync(staging, generation);
            for (const [, result] of completed) result.out = result.out.replaceAll(staging, generation);
            const body = JSON.stringify({
              schema: 'demigod.package-commit/2',
              at: new Date().toISOString(),
              crmSha256: crmSha,
              generation,
              files,
            }, null, 2) + '\n';
            const tmp = `${commit}.tmp-${process.pid}-${Date.now()}`;
            fs.writeFileSync(tmp, body, { mode: 0o600 });
            fs.chmodSync(tmp, 0o600);
            fs.renameSync(tmp, commit);
            const obsolete = fs.readdirSync(generations, { withFileTypes: true })
              .filter((entry) => entry.isDirectory() && !entry.name.endsWith('.tmp'))
              .map((entry) => path.join(generations, entry.name))
              .filter((dir) => dir !== generation)
              .map((dir) => ({ dir, mtimeMs: fs.statSync(dir).mtimeMs }))
              .sort((a, b) => b.mtimeMs - a.mtimeMs)
              .slice(1)
              .map(({ dir }) => dir);
            for (const dir of obsolete) fs.rmSync(dir, { recursive: true, force: true });
          });
        }
      } finally {
        fs.rmSync(staging, { recursive: true, force: true });
      }
    }, { timeoutMs: 0, staleMs: 30000 });
  } catch (error) {
    failure = [String(error).includes(`lock_timeout:${lock}`) ? 'package_lock' : 'package_commit', {
      status: 1,
      err: String(error).includes(`lock_timeout:${lock}`) ? 'package refresh already running' : String(error),
    }];
  }
  if (failure) recordPackage(...failure);
  else for (const result of completed) recordPackage(...result);
}

/**
 * Report Events Bot availability; its supervisor exclusively owns healing.
 * Soft — tunnel flakiness must not fail funnel spine.
 * Skipped under isolated DEMIGOD_ROOT (funnel selftest tmp dir).
 */
function ensureEventsTunnel() {
  if (process.env.DEMIGOD_SKIP_EVENTS_TUNNEL === '1' || DATA !== CODE) {
    return {
      status: 0,
      out: 'skipped (isolated root or DEMIGOD_SKIP_EVENTS_TUNNEL)',
      err: '',
      public: null,
      healed: false,
      skipped: true,
    };
  }
  const st = run(['demigod-events-online.mjs', 'status'], 30000);
  let parsed = {};
  try {
    parsed = JSON.parse((st.out || '').trim() || '{}');
  } catch {
    /* */
  }
  if (parsed.public && parsed.local) {
    return {
      status: 0,
      out: st.out,
      err: st.err,
      public: true,
      healed: false,
    };
  }
  return {
    status: st.status || 1,
    out: st.out,
    err: st.err,
    public: false,
    healed: false,
  };
}

if (stage === 'status' || isAll || paused) {
  record('status', readFunnelStatus());
}
if (stage === 'selftest' || isAll) {
  record('selftest', run(['demigod-funnel-selftest.mjs']));
}
if (stage === 'collect' || isAll) {
  // collect is credit-expensive — only on explicit stage=collect unless env allows
  if (stage === 'collect' || process.env.DEMIGOD_FUNNEL_COLLECT === '1') {
    record('collect', run(['demigod-lead-collect.mjs', '--limit=30', ...(forcePaused ? ['--force-paused'] : [])], 300000));
  } else {
    record('collect', { status: 0, out: 'skipped (set DEMIGOD_FUNNEL_COLLECT=1 or --stage=collect)' });
  }
}
if (stage === 'triage' || isAll) {
  // Current product focus must be reachable before this stage mutates lead state.
  (eventsFocused ? record : recordSoft)('events_tunnel', ensureEventsTunnel());
  if (countHoldsScrapeDue() < 0) record('lead_store', { status: 1, err: 'DEMIGOD-LEADS.json is unreadable' });
  // Queue hygiene spine: normalize → junk DQ → unreachable park → free DNS MX
  record('triage', run(['demigod-funnel.mjs', 'normalize']));
  record('disqualify_junk', run(['demigod-funnel.mjs', 'disqualify-junk']));
  record('park_no_contact', run(['demigod-funnel.mjs', 'park-no-contact']));
  // FOCUS: url-only drafted/approved out of human approve queue
  record('park_no_usable_contact', run(['demigod-funnel.mjs', 'park-no-usable-contact']));
  record('email_mx', run(['demigod-funnel.mjs', 'email-mx'], 120000));
  const scrapeDue = countHoldsScrapeDue();
  if (scrapeDue < 0) record('lead_store', { status: 1, err: 'DEMIGOD-LEADS.json became unreadable during triage' });
  // Soft scrape-enrich for policy_hold urls (ATS-first, limit 4; never invents contact).
  // Skip Firecrawl when every enrichable hold is still in 24h cooldown (holds_scrape_due=0).
  if (DATA === CODE && process.env.DEMIGOD_FUNNEL_ENRICH !== '0') {
    if (scrapeDue === 0) {
      recordSoft('enrich_holds', {
        status: 0,
        out: 'skipped (holds_scrape_due=0 — all enrichable holds cooling)',
      });
    } else if (scrapeDue > 0) {
      recordSoft(
        'enrich_holds',
        run(['demigod-lead-collect.mjs', '--enrich', `--limit=${Math.min(4, scrapeDue)}`, ...(forcePaused ? ['--force-paused'] : [])], 120000),
      );
    }
  }
  // After enrich/manual fix: holds with real contact re-enter drafted queue
  record('release_contactable_holds', run(['demigod-funnel.mjs', 'release-contactable-holds']));
  // Spine stage 1: Events Bot consented export → funnel (no Firecrawl thrash)
  record('import_events', run(['demigod-funnel.mjs', 'import-events'], 60000));
  // Trust Ladder L1: refresh human packages only on live SoR; isolated roots skip in refreshPackages.
  refreshPackages({ hard: true });
}
if (stage === 'packages') {
  refreshPackages({ hard: true });
}
if (stage === 'draft' || isAll) {
  record('draft', run(['demigod-funnel-loop.mjs', 'once-draft'], 120000));
}
if (stage === 'join' || isAll) {
  record('join', run(['demigod-funnel.mjs', 'join', '--apply'], 60000));
}
if (stage === 'policy' || isAll) {
  record('policy', run(['demigod-outreach-policy.mjs', 'selftest'], 30000));
  record('revenue', run(['demigod-revenue.mjs', 'selftest'], 30000));
}
if (stage === 'followup' || isAll) {
  record('followup', run(['demigod-funnel.mjs', 'followup', '--days=5'], 60000));
}
if (stage === 'match' || isAll) {
  record('match', run(['demigod-funnel.mjs', 'match'], 90000));
}
if (stage === 'replies' || isAll) {
  // Gmail form rehydrate (report-only unless DEMIGOD_GMAIL_FORMS_APPLY=1)
  const gfArgs = ['demigod-gmail-forms.mjs'];
  if (process.env.DEMIGOD_GMAIL_FORMS_APPLY === '1') gfArgs.push('--apply');
  record('gmail_forms', run(gfArgs, 60000));
  record('replies', run(['demigod-replies-ingest.mjs'], 90000));
}
if (stage === 'intro' || isAll) {
  record('intro', run(['demigod-funnel.mjs', 'intro'], 60000));
}
// Report-only by default — --apply only when DEMIGOD_FUNNEL_PILOT_APPLY=1 (human-gated volume)
if (stage === 'pilot' || isAll) {
  const pilotArgs = ['demigod-funnel.mjs', 'pilot'];
  if (process.env.DEMIGOD_FUNNEL_PILOT_APPLY === '1') pilotArgs.push('--apply');
  record('pilot', run(pilotArgs, 90000));
}
// Invoice report-only (never auto-apply cash without human --cash)
if (stage === 'invoice' || isAll) {
  record('invoice', run(['demigod-funnel.mjs', 'invoice'], 60000));
}

const softFailures = Object.entries(results)
  .filter(([, r]) => r.soft && (r.status ?? 1) !== 0)
  .map(([name]) => name);
const ok = Object.values(results).every((r) => (r.status ?? 1) === 0 || r.soft);
console.log(
  JSON.stringify(
    {
      ok,
      degraded: softFailures.length > 0,
      softFailures,
      stage,
      focusPaused,
      paused,
      explicitMutation,
      at: new Date().toISOString(),
      autoDm: false,
      autoSend: false,
      boardWrites: false,
      results: Object.fromEntries(
        Object.entries(results).map(([k, v]) => [
          k,
          {
            status: v.status,
            soft: !!v.soft,
            public: v.public,
            healed: v.healed,
            tail: ((v.status ? v.err : v.out) || v.out || '').slice(-300),
          },
        ]),
      ),
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
