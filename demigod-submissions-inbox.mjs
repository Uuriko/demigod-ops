#!/usr/bin/env node
/**
 * demigod-submissions-inbox — unified startup/engineer/partner triage view
 *
 *   bin/dg-inbox | node demigod-submissions-inbox.mjs [--json] [--status all]
 *
 * Writes DEMIGOD-INBOX-REPORT.json + /tmp/dg-busy/submissions-inbox-latest.json.
 * Read-only by default; does not mint board cards (use submissions-approve).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadInbox, updateInbox, extractEmail, publicStatus, findSubmission, startupRoleReadiness, candidateProfileReadiness } from './demigod-submissions-lib.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-INBOX-REPORT.json');
const BUSY_OUT = '/tmp/dg-busy/submissions-inbox-latest.json';

function parseArgs(argv) {
  const out = { status: 'all', limit: 40, json: false, markReviewed: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--new') out.status = 'new';
    else if (a === '--spam') out.status = 'spam';
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice(8)) || 40;
    else if (a.startsWith('--status=')) out.status = a.slice(9);
    else if (a.startsWith('--mark-reviewed=')) out.markReviewed = a.slice(16);
    else if (a === '--mark-reviewed' && argv[i + 1] && !String(argv[i + 1]).startsWith('-'))
      out.markReviewed = argv[++i];
    else if (a === '--mark-reviewed') {
      console.error('submissions-inbox: --mark-reviewed requires a submission id');
      process.exit(2);
    } else if (a.startsWith('-')) {
      console.error(
        `submissions-inbox: unknown argument ${a} — try: node demigod-submissions-inbox.mjs [--json] [--status=all|new|spam] [--limit=N]`,
      );
      process.exit(2);
    } else {
      console.error(`submissions-inbox: unexpected argument ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function formKind(form = '') {
  const f = String(form).toLowerCase();
  if (/partner/.test(f)) return 'partner';
  if (/startup/.test(f)) return 'startup';
  if (/engineer|jobseeker|candidate/.test(f)) return 'engineer';
  return 'other';
}

export function reviewedStatus(status) {
  return status === 'new' || status === 'updated' ? 'reviewed' : status;
}

export function pendingReviewCount(items = []) {
  return items.filter((item) => item?.status === 'new' || item?.status === 'updated').length;
}

export function isTestSubmission(item = {}) {
  const domain = (extractEmail(item.raw || {}, item.form).split('@')[1] || '').toLowerCase();
  return item.sample === true || item.raw?.sample === true || item.raw?.test === true || item.raw?.demo === true ||
    /^(?:sla-test|test-|demo-)/i.test(String(item.id || '')) ||
    domain === 'example.com' || domain.endsWith('.example') || domain.endsWith('.invalid');
}

export function queueRank(status) {
  return status === 'new' || status === 'updated' ? 0 : status === 'pending' || status === 'reviewed' ? 1 : status === 'featured' ? 2 : 3;
}

function summarize(items) {
  const byStatus = {};
  const byKind = { startup: 0, engineer: 0, partner: 0, other: 0 };
  for (const item of items) {
    const st = item.status || 'unknown';
    byStatus[st] = (byStatus[st] || 0) + 1;
    byKind[formKind(item.form)] += 1;
  }
  return { total: items.length, byStatus, byKind };
}

export function redactItem(item) {
  const email = extractEmail(item.raw || {}, item.form);
  const masked = email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : '';
  const attribution = Object.fromEntries(
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referral', 'role_id', 'event_id']
      .map((key) => [key, item.raw?.[key]])
      .filter(([, value]) => typeof value === 'string' && value.length <= 120 && /^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(value)),
  );
  const startupReadiness = startupRoleReadiness(item);
  const readiness = startupReadiness.applicable ? startupReadiness : candidateProfileReadiness(item);
  return {
    id: item.id,
    at: item.at,
    form: item.form,
    kind: formKind(item.form),
    status: item.status,
    email: masked,
    rejectReasons: item.rejectReasons || null,
    featuredId: item.featuredId || null,
    statusUrl: `https://www.trydemigod.com/#status/${item.id}`,
    headline: publicStatus(item).headline,
    attribution,
    matchingReady: readiness.applicable ? readiness.matchReady : null,
    matchingBlockers: readiness.applicable ? [...(readiness.lifecycleReady ? [] : ['human-review']), ...(readiness.policyReady === false ? ['policy-review'] : []), ...(readiness.preferenceReady === false ? ['sf-bay-not-open'] : []), ...readiness.missing] : [],
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`demigod-submissions-inbox — unified triage view

Usage: node demigod-submissions-inbox.mjs [--json] [--status=all|new|spam] [--limit=N] [--mark-reviewed=<id>]`);
    process.exit(0);
  }

  if (args.markReviewed) {
    const item = updateInbox((inbox) => {
      const found = (inbox.items || []).find((i) => i.id === args.markReviewed);
      if (!found) return null;
      const nextStatus = reviewedStatus(found.status);
      if (nextStatus !== found.status) {
        found.status = nextStatus;
        found.reviewedAt = new Date().toISOString();
        found.reviewedBy = process.env.USER || 'agent';
      }
      return found;
    });
    if (!item) {
      console.error(JSON.stringify({ ok: false, error: 'not_found', id: args.markReviewed }));
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, id: item.id, status: item.status, reviewedAt: item.reviewedAt }, null, 2));
    // fall through to refresh report
  }

  const inbox = loadInbox();
  let items = (inbox.items || []).slice().sort((a, b) => queueRank(a.status) - queueRank(b.status)).slice(0, args.limit);
  if (args.status !== 'all') {
    items = items.filter((i) => i.status === args.status);
  }

  const summary = summarize(inbox.items || []);
  const testItems = (inbox.items || []).filter(isTestSubmission);
  const incompleteItems = (inbox.items || []).filter((item) =>
    !isTestSubmission(item) && item.status !== 'spam' && !extractEmail(item.raw || {}, item.form));
  const operationalItems = (inbox.items || []).filter((item) =>
    !isTestSubmission(item) && item.status !== 'spam' && extractEmail(item.raw || {}, item.form));
  const spamItems = (inbox.items || []).filter((item) => !isTestSubmission(item) && item.status === 'spam');
  const rows = items.map(redactItem);
  const report = {
    at: new Date().toISOString(),
    inboxAt: inbox.at,
    filter: args.status,
    summary,
    newCount: (inbox.items || []).filter((i) => i.status === 'new').length,
    pendingReviewCount: pendingReviewCount(inbox.items || []),
    operationalCount: operationalItems.length,
    testCount: testItems.length,
    spamCount: spamItems.length,
    incompleteCount: incompleteItems.length,
    pendingOperationalReviewCount: pendingReviewCount(operationalItems),
    operationalRows: operationalItems
      .slice()
      .sort((a, b) => queueRank(a.status) - queueRank(b.status))
      .slice(0, args.limit)
      .map(redactItem),
    rows,
    actions: {
      approve: 'node demigod-submissions-approve.mjs <sub-id>',
      triageSpam: 'node demigod-submissions-triage.mjs',
      status: 'https://www.trydemigod.com/#status/<sub-id>',
    },
  };

  // Age for ops UI
  report.newestAt = rows[0]?.at || null;
  report.newestAgeSec = report.newestAt
    ? Math.round((Date.now() - Date.parse(report.newestAt)) / 1000)
    : null;
  report.actions = {
    ...report.actions,
    draftIntro: 'node demigod-intro-draft.mjs <sub-id>',
    markReviewed: 'node demigod-submissions-inbox.mjs --mark-reviewed=<sub-id>',
    refresh: 'node demigod-submissions-inbox.mjs --json',
  };

  atomicWrite(OUT, JSON.stringify(report, null, 2));
  fs.chmodSync(OUT, 0o600);
  try {
    atomicWrite(BUSY_OUT, JSON.stringify(report, null, 2) + '\n');
    fs.chmodSync(BUSY_OUT, 0o600);
  } catch {
    /* */
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Operator-facing headline uses operational pending only — SMS/sim @pending.example
  // fixtures must not inflate "awaiting review" (74 test vs 0 real was a live false signal).
  const pendingOps = report.pendingOperationalReviewCount;
  const pendingTests = pendingReviewCount(testItems);
  console.log(
    `Inbox · ${summary.total} total · ${pendingOps} operational awaiting review` +
      (pendingTests ? ` · ${pendingTests} test/sim pending (not action queue)` : '') +
      (report.testCount ? ` · tests ${report.testCount}` : ''),
  );
  console.log(`Kinds: startup ${summary.byKind.startup} · engineer ${summary.byKind.engineer} · partner ${summary.byKind.partner} · other ${summary.byKind.other}`);
  console.log(`Status: ${Object.entries(summary.byStatus).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log('---');
  // Default text list is the operational queue only (tests/spam stay in --json).
  if (!report.operationalRows.length) {
    console.log('(no operational rows — featured/spam/test only; use --json for full inventory)');
  } else {
    for (const row of report.operationalRows) {
      console.log(`${row.id} · ${row.kind} · ${row.status} · ${row.email || '—'} · ${row.headline}`);
    }
  }
  console.log(`\nWrote ${path.relative(ROOT, OUT)} + ${BUSY_OUT}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
