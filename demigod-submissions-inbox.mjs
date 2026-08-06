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
import {
  loadInbox,
  updateInbox,
  writeBoard,
  anonymizeRole,
  submissionFingerprint,
  extractEmail,
  publicStatus,
  startupRoleReadiness,
  candidateProfileReadiness,
  isSampleData,
  isSyntheticContact,
  scrubPII,
} from './demigod-submissions-lib.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { gradeOutcomeText } from './demigod-outcome-grammar.mjs';

const TEST_SCOPE = String(process.env.DEMIGOD_TEST_SCOPE || '').replace(/[^A-Za-z0-9_.-]/g, '_');
const TEST_OUT_DIR = TEST_SCOPE ? path.join('/tmp/dg-busy/tests', TEST_SCOPE) : '';
const OUT = TEST_SCOPE ? path.join(TEST_OUT_DIR, 'DEMIGOD-INBOX-REPORT.json') : path.join(ROOT, 'DEMIGOD-INBOX-REPORT.json');
const BUSY_OUT = TEST_SCOPE ? path.join(TEST_OUT_DIR, 'submissions-inbox-latest.json') : '/tmp/dg-busy/submissions-inbox-latest.json';

function parseArgs(argv) {
  const out = { status: 'all', limit: 40, json: false, markReviewed: null, interviewProcess: null, availability: null, confirmOpen: false, observedFounderAnswer: false, observedCandidateAnswer: false };
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
    else if (a.startsWith('--interview-process=')) out.interviewProcess = a.slice(20);
    else if (a === '--interview-process' && argv[i + 1] && !String(argv[i + 1]).startsWith('-'))
      out.interviewProcess = argv[++i];
    else if (a.startsWith('--availability=')) out.availability = a.slice(15);
    else if (a === '--availability' && argv[i + 1] && !String(argv[i + 1]).startsWith('-'))
      out.availability = argv[++i];
    else if (a === '--confirm-open') out.confirmOpen = true;
    else if (a === '--i-observed-founder-answer') out.observedFounderAnswer = true;
    else if (a === '--i-observed-candidate-answer') out.observedCandidateAnswer = true;
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
  const bags = [item.raw, item.data, item.payload]
    .filter((bag) => bag && typeof bag === 'object');
  return isSampleData(item) ||
    bags.some((bag) => bag.test === true || bag.demo === true) ||
    /^(?:sla-test|test-|demo-)/i.test(String(item.id || '')) ||
    bags.some((bag) => {
      const email = extractEmail(bag, item.form);
      return email && isSyntheticContact(email, bag);
    });
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

/** Aggregate non-PII UTM counts for the /startups → brief acquisition wedge (no company names). */
export function attributionSummary(items) {
  const bySource = {};
  const byCampaign = {};
  let directoryCompanyBriefs = 0;
  let startupWithAttribution = 0;
  const tokenOk = (v) => typeof v === 'string' && v.length <= 40 && /^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(v);
  for (const item of items || []) {
    if (formKind(item.form) !== 'startup') continue;
    const raw = item.raw || item.data || {};
    const src = String(raw.utm_source || '').trim();
    const camp = String(raw.utm_campaign || '').trim();
    if (tokenOk(src)) {
      bySource[src] = (bySource[src] || 0) + 1;
      startupWithAttribution += 1;
    }
    if (tokenOk(camp)) byCampaign[camp] = (byCampaign[camp] || 0) + 1;
    if (src === 'directory' && camp === 'company-brief') directoryCompanyBriefs += 1;
  }
  return {
    startupWithAttribution,
    directoryCompanyBriefs,
    bySource,
    byCampaign,
    note: 'Completed startup submissions only (opens not server-visible). directory+company-brief = /startups row handoff.',
  };
}

export function redactItem(item) {
  const email = extractEmail(item.raw || {}, item.form);
  const masked = email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : '';
  const rejectReasons = Array.isArray(item.rejectReasons)
    ? item.rejectReasons
        .filter((reason) => typeof reason === 'string' && reason.trim())
        .slice(0, 20)
        .map((reason) => scrubPII(reason).slice(0, 120))
    : [];
  const attribution = Object.fromEntries(
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referral', 'role_id', 'event_id']
      .map((key) => [key, item.raw?.[key]])
      .filter(([, value]) => typeof value === 'string' && value.length <= 120 && /^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(value) && scrubPII(value) === value),
  );
  const startupReadiness = startupRoleReadiness(item);
  const readiness = startupReadiness.applicable ? startupReadiness : candidateProfileReadiness(item);
  const raw = item.raw || item.data || {};
  const outcome = raw['90day-outcome'] || raw.outcome90d;
  const outcomeGrade = startupReadiness.applicable && String(outcome || '').trim()
    ? gradeOutcomeText(outcome)
    : null;
  return {
    id: item.id,
    at: item.at,
    form: item.form,
    kind: formKind(item.form),
    status: item.status,
    email: masked,
    rejectReasons: rejectReasons.length ? rejectReasons : null,
    featuredId: item.featuredId || null,
    headline: publicStatus(item).headline,
    attribution,
    matchingReady: readiness.applicable ? readiness.matchReady : null,
    matchingBlockers: readiness.applicable ? [...(readiness.lifecycleReady ? [] : ['human-review']), ...(readiness.policyReady === false ? ['policy-review'] : []), ...(readiness.preferenceReady === false ? ['sf-bay-not-open'] : []), ...(readiness.availabilityCurrent === false && !readiness.missing.includes('availability') ? ['availability-reconfirm'] : []), ...readiness.missing] : [],
    outcomeCalibration: outcomeGrade ? {
      clarity: outcomeGrade.clarity,
      suggestions: outcomeGrade.suggestions,
    } : null,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`demigod-submissions-inbox — unified triage view

Usage: node demigod-submissions-inbox.mjs [--json] [--status=all|new|spam] [--limit=N] [--mark-reviewed=<id>]
       node demigod-submissions-inbox.mjs --mark-reviewed=<id> --interview-process="Founder chat → final; decide in ~2 weeks" --i-observed-founder-answer
       node demigod-submissions-inbox.mjs --mark-reviewed=<candidate-id> --availability=now|2-4w|1-3m|passive --i-observed-candidate-answer
       DEMIGOD_ALLOW_REAL_ROLES=1 node demigod-submissions-inbox.mjs --mark-reviewed=<id> --confirm-open --i-observed-founder-answer`);
    process.exit(0);
  }
  if (args.confirmOpen && (!args.markReviewed || !args.observedFounderAnswer)) {
    console.error('submissions-inbox: --confirm-open requires --mark-reviewed=<id> and --i-observed-founder-answer');
    process.exit(2);
  }
  if (args.availability !== null && (!args.markReviewed || !args.observedCandidateAnswer)) {
    console.error('submissions-inbox: --availability requires --mark-reviewed=<candidate-id> and --i-observed-candidate-answer');
    process.exit(2);
  }

  if (args.interviewProcess !== null && (!args.markReviewed || !args.observedFounderAnswer)) {
    console.error('submissions-inbox: --interview-process requires --mark-reviewed=<id> and --i-observed-founder-answer');
    process.exit(2);
  }

  if (args.markReviewed) {
    const result = updateInbox((inbox) => {
      const found = (inbox.items || []).find((i) => i.id === args.markReviewed);
      if (!found) return null;
      if (args.confirmOpen) {
        if (!startupRoleReadiness(found).applicable) return { error: 'not_startup_submission' };
        if (found.status !== 'featured' || !found.featuredId) return { error: 'not_featured_role' };
        const confirmedAt = new Date().toISOString();
        const actor = process.env.USER || 'agent';
        try {
          writeBoard((board) => {
            let role = (board.roles || []).find((item) => item.id === found.featuredId);
            if (!role) {
              role = {
                ...anonymizeRole(found.raw || found.data || {}),
                id: found.featuredId,
                sample: false,
                sourceSubmissionHash: submissionFingerprint(found.id),
              };
              board.roles = [role, ...(board.roles || [])];
            }
            role.featuredAt = confirmedAt;
            role.status = 'Active';
            return board;
          }, { reason: `confirm-open:${found.id}`, actor, allowRealRoles: true });
        } catch (error) {
          return { error: `board_refresh_failed:${error.code || error.message}` };
        }
        found.openConfirmedAt = confirmedAt;
        found.openConfirmedBy = actor;
      }
      if (args.interviewProcess !== null) {
        const bagKey = found.raw && typeof found.raw === 'object' ? 'raw' : found.data && typeof found.data === 'object' ? 'data' : 'raw';
        const nextBag = { ...(found[bagKey] || {}), 'interview-process': args.interviewProcess.trim() };
        const readiness = startupRoleReadiness({ ...found, [bagKey]: nextBag });
        if (!readiness.applicable) return { error: 'not_startup_submission' };
        if (readiness.missing.includes('interview-process')) return { error: 'invalid_interview_process' };
        found[bagKey] = nextBag;
        found.interviewProcessObservedAt = new Date().toISOString();
        found.interviewProcessObservedBy = process.env.USER || 'agent';
      }
      if (args.availability !== null) {
        const bagKey = found.raw && typeof found.raw === 'object' ? 'raw' : found.data && typeof found.data === 'object' ? 'data' : 'raw';
        const confirmedAt = new Date().toISOString();
        const nextBag = { ...(found[bagKey] || {}), availability: args.availability.trim().toLowerCase() };
        const readiness = candidateProfileReadiness({ ...found, [bagKey]: nextBag, availabilityConfirmedAt: confirmedAt });
        if (!readiness.applicable) return { error: 'not_candidate_submission' };
        if (readiness.missing.includes('availability')) return { error: 'invalid_candidate_availability' };
        found[bagKey] = nextBag;
        found.availabilityConfirmedAt = confirmedAt;
        found.availabilityConfirmedBy = process.env.USER || 'agent';
      }
      const nextStatus = reviewedStatus(found.status);
      if (nextStatus !== found.status) {
        found.status = nextStatus;
        found.reviewedAt = new Date().toISOString();
        found.reviewedBy = process.env.USER || 'agent';
      }
      return { item: found };
    });
    if (!result) {
      console.error(JSON.stringify({ ok: false, error: 'not_found', id: args.markReviewed }));
      process.exit(1);
    }
    if (result.error) {
      console.error(JSON.stringify({ ok: false, error: result.error, id: args.markReviewed }));
      process.exit(1);
    }
    const item = result.item;
    console.log(JSON.stringify({ ok: true, id: item.id, status: item.status, reviewedAt: item.reviewedAt, interviewProcessObservedAt: item.interviewProcessObservedAt || null, availabilityConfirmedAt: item.availabilityConfirmedAt || null, openConfirmedAt: item.openConfirmedAt || null }, null, 2));
    // fall through to refresh report
  }

  const inbox = loadInbox();
  let items = (inbox.items || []).slice().sort((a, b) => queueRank(a.status) - queueRank(b.status)).slice(0, args.limit);
  if (args.status !== 'all') {
    items = items.filter((i) => i.status === args.status);
  }

  const summary = summarize(inbox.items || []);
  const attribution = attributionSummary(inbox.items || []);
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
    attribution,
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
    recordInterviewProcess: 'node demigod-submissions-inbox.mjs --mark-reviewed=<sub-id> --interview-process="Founder chat → final; target decision in ~2 weeks" --i-observed-founder-answer',
    reconfirmCandidateAvailability: 'node demigod-submissions-inbox.mjs --mark-reviewed=<candidate-id> --availability=now|2-4w|1-3m|passive --i-observed-candidate-answer',
    reconfirmOpenRole: 'DEMIGOD_ALLOW_REAL_ROLES=1 node demigod-submissions-inbox.mjs --mark-reviewed=<sub-id> --confirm-open --i-observed-founder-answer',
    refresh: 'node demigod-submissions-inbox.mjs --json',
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
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
  console.log(
    `Directory wedge: ${attribution.directoryCompanyBriefs} startup briefs with utm_source=directory + utm_campaign=company-brief` +
      (attribution.startupWithAttribution ? ` · ${attribution.startupWithAttribution} startup with any utm_source` : ''),
  );
  console.log('---');
  // Default text list is the operational queue only (tests/spam stay in --json).
  if (!report.operationalRows.length) {
    console.log('(no operational rows — featured/spam/test only; use --json for full inventory)');
  } else {
    for (const row of report.operationalRows) {
      const outcomeHint = row.outcomeCalibration?.suggestions?.[0];
      console.log(`${row.id} · ${row.kind} · ${row.status} · ${row.email || '—'} · ${row.headline}${outcomeHint ? ` · First-result check: ${outcomeHint}` : ''}`);
    }
  }
  console.log(`\nWrote ${path.relative(ROOT, OUT)} + ${BUSY_OUT}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
