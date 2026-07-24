#!/usr/bin/env node
/**
 * Offline selftest for demigod-funnel honesty rails.
 * Must FAIL on empty evidence / missing receipt (vacuous-green lesson).
 *
 *   node demigod-funnel-selftest.mjs
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import {
  approveDrafted,
  classifyApproveBlockReason,
  formatApproveBatchPackage,
  parsePackageReadyCount,
  packageBoardHonesty,
  placementPairId,
  formatHoldsEnrichDuePackage,
  formatEmailFirstApprovePackage,
  formatEmailFirstSendPackage,
  buildL1Snapshot,
  planApproveDrafted,
  canTransition,
  commitReceiptTransaction,
  countNoContact,
  countReceiptBackedSent,
  draftContactTo,
  draftEmail,
  refreshTalentDraftGreetings,
  talentGreetingName,
  talentDraftNeedsGreetingRefresh,
  isSeoDisplayJunk,
  draftSubjectPreview,
  hasValidSendReceipt,
  isUnreachable,
  hasUsableOutreachContact,
  joinMatchVia,
  legacyToState,
  lifecycleHistoryIssues,
  repairLifecycleHistory,
  MAX_NUDGES,
  nudgeCount,
  parkUnreachable,
  parkNoMx,
  importEventsLeads,
  parkNoUsableContact,
  releaseContactableHolds,
  planSendReady,
  formatSendBatchPackage,
  disqualifyJunk,
  planFollowups,
  planFormFilledJoins,
  planIntroLeadReady,
  planIntroQueue,
  planMatchAdvance,
  planMatchBridge,
  planPairSyncMoves,
  planPartnerUrlCollisionMerges,
  applyPartnerUrlCollisionMerges,
  planReceipt,
  receiptLooksValid,
  receiptArgsValid,
  receiptDestinationMatches,
  RECEIPT_TARGETS,
  scanFunnelDraftHygiene,
  STATES,
  statusReport,
  summarizeBlockedReasons,
} from './demigod-funnel.mjs';
import { draftHygiene } from './demigod-demand.mjs';
import {
  checkOutreach,
  isIdentitySuppressedByOther,
  outreachPolicy,
  suppressedIdentityKeys as outreachSuppressedIdentityKeys,
} from './demigod-outreach-policy.mjs';
import { feeCents } from './demigod-revenue.mjs';
import {
  applyContactEnrich,
  attachPublicContact,
  eventsBotLeads,
  extractContactFromPage,
  fcScrape,
  hasAdvancedState,
  isAggregatorUrl,
  isJunkCompanyUrl,
  isEventsBotConsented,
  isEventsBotSf,
  isJunkAggregatorLead,
  isJunkPartnerId,
  demoteJunkLead,
  isOwnSiteUrl,
  isSfBayLocation,
  runSearchQueries,
  isTalentLead,
  isUsableOutreachEmail,
  isUsableOutreachHandle,
  leadId,
  writeEnrichedLead,
  mergeLeadState,
  needsContactEnrich,
  enrichUrlPriority,
  enrichScrapeUrl,
  enrichRecentlyAttempted,
  enrichAttemptsExhausted,
  stampEnrichExhausted,
  ENRICH_COOLDOWN_MS,
  ENRICH_MAX_ATTEMPTS,
  shouldEnrichSecondHop,
  releaseHoldIfContactable,
  redraftEnrichedLeads,
  isSerpListingTitle,
  isActionableInboxItem,
  parsePartnerHitFields,
  parsePartnerLines,
  parseSearchHits,
  searchQueryYield,
  parseWellfoundSfJobs,
  partnerDedupeKey,
  partnerUrlDedupeKey,
  collectArgsValid,
  leadCollectionPaused,
  parseCollectLimit,
  previousLeadsById,
  scrubNoiseContact,
  selectEnrichTargets,
  sessionXLeads,
  shouldReattachLead,
  talentDedupeKey,
  writeLeadsJson,
  writeSeedIfMissing,
} from './demigod-lead-collect.mjs';
import { funnelRolesFromPartners, getStartupRoles } from './demigod-matching-engine.mjs';
import {
  extractEmailsFromFromHeader,
  matchSignalsToLeads,
  planReplyApply,
  planReplyBatch,
  pureLeadReceiptBacked,
  signalFromMessage,
  signalsFromReport,
  suppressedIdentityKeys,
} from './demigod-replies-ingest.mjs';
import {
  applyInboxContactPatches,
  isSyntheticContact,
  parseWebflowFormEmailBody,
  planGmailFormCandidates,
  planInboxContactPatches,
  submissionsWithGmailPatches,
} from './demigod-submissions-lib.mjs';
import { mayRunFunnelStages, parseCliJson, selectDraftableLeads } from './demigod-funnel-loop.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
let passed = 0;
let skipped = 0;
let skipReason = '';
const skipReasons = new Map();

function assert(cond, msg) {
  if (skipReason) {
    skipped++;
    skipReasons.set(skipReason, (skipReasons.get(skipReason) || 0) + 1);
    console.log('  skip', msg, `(${skipReason})`);
    return;
  }
  if (cond) {
    passed++;
    console.log('  ok ', msg);
  } else {
    failed++;
    console.error('  FAIL', msg);
  }
}

{
  const oldPath = process.env.PATH;
  process.env.PATH = '';
  assert(fcScrape('https://example.com') === null, 'enrich scrape transport failure is distinct from an empty page');
  process.env.PATH = oldPath;
}

console.log('demigod-funnel-selftest\n');

assert(parseCollectLimit(undefined) === 50, 'collect limit defaults to 50');
assert(isSfBayLocation('SF') && isSfBayLocation('San Francisco') && isSfBayLocation('Bay Area'), 'lead scoring recognizes exact local-market labels');
assert(!isSfBayLocation('Tampa Bay') && !isSfBayLocation('SFO'), 'lead scoring does not award SF locality for unrelated Bay/SF substrings');
assert(parseCollectLimit('1') === 1 && parseCollectLimit('100') === 100, 'collect limit accepts 1..100');
assert(
  ['0', '-1', '101', '1.5', 'junk'].every((value) => parseCollectLimit(value) === null),
  'collect limit rejects invalid or credit-risk values',
);

{
  const selected = selectDraftableLeads(
    {
      partners: [
        { id: 'url-only', state: 'sourced', score: 100, url: 'https://example-startup.test/job' },
        { id: 'email', state: 'sourced', score: 80, contactEmail: 'founder@startup.test' },
      ],
      talent: [{ id: 'handle', state: 'sourced', score: 90, handle: '@realperson' }],
    },
    3,
  );
  assert(selected.map((lead) => lead.id).join() === 'handle,email', 'draft batch skips URL-only leads without usable contact');
  const noPlatform = selectDraftableLeads(
    {
      partners: [
        { id: 'noreply', state: 'sourced', score: 99, contactEmail: 'noreply@linkedin.com' },
        { id: 'waas', state: 'sourced', score: 98, contactEmail: 'workatastartup@ycombinator.com' },
        { id: 'real', state: 'sourced', score: 70, contactEmail: 'ceo@acme-sf.test' },
      ],
      talent: [],
    },
    5,
  );
  assert(
    noPlatform.map((l) => l.id).join() === 'real',
    'draft batch skips noreply/platform mailbox emails (FOCUS usable contact)',
  );
}

// 1) vacuous-green: empty subject fails
{
  const r = canTransition('approved', 'sent', { evidenceText: '' });
  assert(r.ok === false, 'sent with empty evidenceText FAILS');
}

// 2) missing path fails
{
  const r = canTransition('approved', 'sent', {
    evidencePath: '/tmp/dg-busy/funnel/does-not-exist-receipt.txt',
  });
  assert(r.ok === false, 'sent with missing file FAILS');
}

{
  const r = canTransition('drafted', 'approved', {
    actor: 'human',
    evidencePath: '/tmp/dg-busy/funnel/does-not-exist-review.txt',
  });
  assert(r.ok === false, 'approved with missing note evidence file FAILS');
}

// 3) draft-looking receipt fails
{
  const r = canTransition('approved', 'sent', {
    evidenceText: 'DRAFT-ONLY simulated BLAST to placeholder@example.com',
  });
  assert(r.ok === false, 'sent with sim/draft receipt FAILS');
  const realistic = canTransition('approved', 'sent', {
    evidenceText: 'DRAFT-ONLY\nMessage-ID: <draft@trydemigod.com>\nto: founder@startup.test',
  });
  assert(realistic.ok === false, 'Message-ID cannot override DRAFT-ONLY receipt');
  assert(
    !receiptLooksValid('DRAFT-ONLY\nSENT-CONFIRMED\nMessage-ID: <draft@trydemigod.com>'),
    'SENT-CONFIRMED cannot override DRAFT-ONLY receipt',
  );
  assert(!receiptLooksValid('Message-ID: <madeup@trydemigod.com>'), 'transport marker alone is not a receipt');
  assert(!receiptLooksValid('SENT-CONFIRMED'), 'send assertion alone is not a receipt');
}

// 4) valid receipt passes
{
  const fake = canTransition('approved', 'sent', {
    evidenceText: 'SENT-CONFIRMED\nMessage-ID: <abc@example.com>\nto: placeholder@example.com\n',
  });
  assert(fake.ok === false, 'sent confirmation cannot override placeholder evidence');
  const r = canTransition('approved', 'sent', {
    evidenceText: 'SENT-CONFIRMED\nMessage-ID: <abc@trydemigod.com>\nchannel: email\nto: founder@example-startup.com\n',
  });
  assert(r.ok === true, 'sent with SENT-CONFIRMED + Message-ID PASSES');
}

// 4b) sent_receipt_backed revalidates evidence (not alias of bare state=sent)
{
  assert(receiptLooksValid('SENT-CONFIRMED\nMessage-ID: <x@trydemigod.com>'), 'receiptLooksValid accepts real');
  assert(!receiptLooksValid('DRAFT-ONLY'), 'receiptLooksValid rejects draft');
  assert(
    !hasValidSendReceipt({ state: 'sent', status: 'sent', stateHistory: [] }),
    'bare sent state without history is not receipt-backed',
  );
  assert(
    hasValidSendReceipt({
      state: 'replied',
      stateHistory: [
        {
          to: 'sent',
          evidenceText: 'SENT-CONFIRMED\nMessage-ID: <ok@trydemigod.com>\nto: founder@startup.co',
        },
      ],
    }),
    'history evidenceText counts as receipt-backed even after reply',
  );
  assert(
    !hasValidSendReceipt({
      state: 'sent',
      stateHistory: [{ to: 'sent', evidenceText: 'DRAFT-ONLY simulated' }],
    }),
    'draft evidenceText does not count as receipt-backed',
  );
  const tmpR = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-rcpt-'));
  const goodPath = path.join(tmpR, 'lead-a.txt');
  fs.writeFileSync(
    goodPath,
    'SENT-CONFIRMED\nMessage-ID: <file@trydemigod.com>\nto: a@b.co\n',
  );
  assert(
    hasValidSendReceipt(
      { stateHistory: [{ to: 'sent', evidence: goodPath }] },
      { resolve: (p) => p, exists: fs.existsSync, read: (p) => fs.readFileSync(p, 'utf8') },
    ),
    'history evidence path revalidated from disk',
  );
  assert(
    countReceiptBackedSent({
      partners: [
        { id: 'p1', state: 'sent', stateHistory: [] },
        {
          id: 'p2',
          state: 'sent',
          stateHistory: [
            {
              to: 'sent',
              evidenceText: 'SENT-CONFIRMED\nMessage-ID: <p2@trydemigod.com>',
            },
          ],
        },
      ],
      talent: [],
    }) === 1,
    'countReceiptBackedSent only counts revalidated',
  );
  fs.rmSync(tmpR, { recursive: true, force: true });
}

// 5) file receipt on disk
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-funnel-'));
  const f = path.join(dir, 'r.txt');
  fs.writeFileSync(
    f,
    'SENT-CONFIRMED\nMessage-ID: <xyz@mail>\n',
  );
  const r = canTransition('approved', 'sent', { evidencePath: f });
  assert(r.ok === true, 'sent with receipt file PASSES');
  fs.rmSync(dir, { recursive: true, force: true });
}

// 6) illegal edge
{
  const r = canTransition('sourced', 'paid', { evidenceText: 'nope' });
  assert(r.ok === false, 'sourced → paid FAILS');
}

// 7) drafted needs non-empty file
{
  const r = canTransition('enriched', 'drafted', { evidenceText: '' });
  assert(r.ok === false, 'drafted with empty evidence FAILS');
  const r2 = canTransition('enriched', 'drafted', {
    evidenceText: 'Subject: eng hiring\n\nSaw your careers page…\n',
  });
  assert(r2.ok === true, 'drafted with body PASSES');
}

// 7b) in_review requires match bridge evidence (fail-closed money path)
{
  const bare = canTransition('form_filled', 'in_review', { actor: 'funnel-match' });
  assert(bare.ok === false, 'in_review with no evidence FAILS');
  const empty = canTransition('form_filled', 'in_review', {
    evidenceText: '',
    actor: 'funnel-match',
  });
  assert(empty.ok === false, 'in_review with empty evidence FAILS');
  const ok = canTransition('form_filled', 'in_review', {
    evidenceText: 'match bridge\nlead: L1\nengine: ranked:0',
    actor: 'funnel-match',
  });
  assert(ok.ok === true, 'in_review with match bridge evidence PASSES');
}

// 7c) bounced requires note evidence (DSN / bounce signal)
{
  const bare = canTransition('sent', 'bounced', { actor: 'replies-ingest' });
  assert(bare.ok === false, 'bounced with no evidence FAILS');
  const ok = canTransition('sent', 'bounced', {
    evidenceText: 'BOUNCE signal\nlead: L1\nsnippet: undeliverable',
    actor: 'replies-ingest',
  });
  assert(ok.ok === true, 'bounced with DSN note PASSES');
}

// 8) legacy map
assert(legacyToState('triage') === 'sourced', 'legacy triage → sourced');
assert(legacyToState('sent') === 'sent', 'legacy sent stays sent');
assert(
  lifecycleHistoryIssues({
    stateHistory: [
      { from: 'sourced', to: 'drafted' },
      { from: 'sourced', to: 'drafted' },
    ],
  })[0]?.reason === 'chain break: drafted → sourced',
  'lifecycle audit catches repeated sourced → drafted history',
);
assert(
  statusReport({
    partners: [{
      id: 'broken-history',
      state: 'drafted',
      stateHistory: [
        { from: 'sourced', to: 'drafted' },
        { from: 'sourced', to: 'drafted' },
      ],
    }],
    talent: [],
  }).metrics.invalid_history_ids[0] === 'broken-history',
  'status exposes lifecycle history defects',
);
{
  const valid = { from: 'sourced', to: 'drafted' };
  const next = { from: 'drafted', to: 'approved' };
  const repair = repairLifecycleHistory({ stateHistory: [valid, valid, next] });
  assert(repair.kept.length === 2 && repair.kept[1] === next, 'history repair keeps the valid chain');
  assert(repair.removed.length === 1 && repair.removed[0].index === 1, 'history repair quarantines broken links');
}
assert(STATES.includes('mutual_yes'), 'mutual_yes in STATES');
assert(
  partnerDedupeKey({ company: 'Acme', title: 'Engineer', url: '/one' }) !==
    partnerDedupeKey({ company: 'Acme', title: 'Designer', url: '/two' }),
  'partner dedupe preserves distinct roles at one company',
);
assert(
  partnerUrlDedupeKey('https://jobs.example/role/') ===
    partnerUrlDedupeKey('https://jobs.example/role#apply'),
  'partner URL keys strip hash and trailing slash',
);
assert(
  partnerDedupeKey({
    company: 'Clera',
    title: 'Founding Engineer (Applied AI)',
    url: 'https://jobs.ashbyhq.com/clera/8e7be82b-6b46-42ee-a862-3d3e1cad6bd4',
    source: 'firecrawl+Ashby',
  }) ===
    partnerDedupeKey({
      company: 'Clera',
      title: 'Founding Engineer',
      url: 'https://jobs.ashbyhq.com/clera/8e7be82b-6b46-42ee-a862-3d3e1cad6bd4',
      source: 'firecrawl-search',
    }),
  'partner dedupe collapses same posting URL despite title scrape noise',
);
assert(
  partnerDedupeKey({
    company: 'Acme',
    title: 'Eng',
    url: 'https://jobs.example/a',
    source: 'events-bot:calendar',
  }) !==
    partnerDedupeKey({
      company: 'Beta',
      title: 'PM',
      url: 'https://jobs.example/a',
      source: 'events-bot:calendar',
    }),
  'events-bot partners keep identity keys even when URLs collide',
);
assert(
  talentDedupeKey({ name: 'Alex', email: 'one@example.com', url: '/one' }) !==
    talentDedupeKey({ name: 'Alex', email: 'two@example.com', url: '/two' }),
  'talent dedupe preserves distinct profiles with one name',
);
assert(placementPairId({ pairIds: ['pair-a'] }) === 'pair-a', 'one placement pair derives safely');
assert(placementPairId({ pairIds: ['pair-a', 'pair-b'] }) === '', 'ambiguous placement pair fails closed');
assert(placementPairId({ pairIds: ['pair-a', 'pair-b'] }, 'pair-b') === 'pair-b', 'explicit bound pair resolves');
assert(placementPairId({ pairIds: ['pair-a'] }, 'pair-b') === '', 'unbound explicit pair is rejected');

// 9) paid needs evidence
{
  const r = canTransition('invoiced', 'paid', { evidenceText: '' });
  assert(r.ok === false, 'paid without evidence FAILS');
  const r2 = canTransition('invoiced', 'paid', {
    evidenceText: 'bank transfer confirmed 2026-07-17 ref XYZ',
  });
  assert(r2.ok === true, 'paid with bank note PASSES');
}

// 10) opted_out needs note
{
  const r = canTransition('sent', 'opted_out', {});
  assert(r.ok === false, 'opted_out without note FAILS');
  const r2 = canTransition('sent', 'opted_out', { evidenceText: 'reply: no thanks' });
  assert(r2.ok === true, 'opted_out with note PASSES');
}

// 11) terminal states cannot become paid
{
  const r = canTransition('opted_out', 'paid', { evidenceText: 'bank transfer confirmed' });
  assert(r.ok === false, 'opted_out → paid FAILS');
}

// 11b) approval evidence cannot be whitespace
{
  assert(
    canTransition('drafted', 'approved', { evidenceText: '   ', actor: 'human' }).ok === false,
    'human approval with whitespace-only evidence FAILS',
  );
}

// 12) outreach policy fails closed (checkOutreach)
{
  assert(!outreachPolicy().canDraft && !outreachPolicy().canSend, 'pure policy mode unset FAILS closed');
  assert(checkOutreach({ id: 'a' }, {}, {}).ok === false, 'policy mode unset FAILS');
  const doc = { partners: [{ id: 'old', handle: '@X', state: 'opted_out' }], talent: [] };
  assert(
    checkOutreach({ id: 'new', handle: 'x' }, doc, { mode: 'draft-only' }).ok === false,
    'policy suppresses opted_out handle',
  );
  assert(
    checkOutreach(
      { id: 'alias', email: 'new@d.com', contactEmail: 'blocked@d.com' },
      { partners: [{ id: 'blocked', email: 'blocked@d.com', state: 'opted_out' }] },
      { mode: 'draft-only' },
    ).ok === false,
    'policy checks every contact identity alias',
  );
  assert(
    checkOutreach(
      { id: 'case-alias', email: ' Founder@Startup.test ' },
      { partners: [], talent: [{ id: 'blocked-case', contactEmail: 'founder@startup.test', state: 'opted_out' }] },
      { mode: 'draft-only' },
    ).ok === false,
    'policy suppresses normalized email identity across lead lanes',
  );
  assert(
    checkOutreach({ id: 'clean', email: 'c@d.com' }, doc, { mode: 'draft-only' }).ok === true,
    'policy clean lead ok',
  );
  assert(
    checkOutreach({ id: 'stale', state: 'sourced', status: 'opted_out' }, doc, { mode: 'draft-only' })
      .ok === false,
    'policy honors suppressed legacy status when state is stale',
  );
  const staleSuppressedDoc = {
    partners: [{ id: 'stale-terminal', state: 'sourced', status: 'opted_out', email: 'stop@d.com' }],
  };
  assert(
    outreachSuppressedIdentityKeys(staleSuppressedDoc).has('email:stop@d.com'),
    'policy suppression keys honor suppressed legacy status when state is stale',
  );
  assert(
    isIdentitySuppressedByOther({ id: 'new', email: 'stop@d.com' }, staleSuppressedDoc),
    'policy shared-identity guard honors suppressed legacy status when state is stale',
  );
  assert(
    ['cold', 'disqualified', 'rejected', 'fell_through'].every(
      (state) => !checkOutreach({ id: state, state }, doc, { mode: 'draft-only' }).ok,
    ),
    'policy suppresses closed funnel states',
  );
  assert(
    checkOutreach(
      { id: 'old', state: 'sourced', handle: '@X' },
      doc,
      { mode: 'draft-only' },
    ).ok === false,
    'policy honors suppressed document state for stale same-id lead',
  );
  assert(
    checkOutreach({ id: 'z' }, doc, { mode: 'draft-only', action: 'send' }).ok === false,
    'draft-only send blocked by pure policy',
  );
  assert(
    checkOutreach({ id: 'z' }, doc, { mode: 'approve-each', action: 'send' }).ok === false,
    'approve-each send without approval blocked by pure policy',
  );
  assert(
    checkOutreach({ id: 'z' }, doc, { mode: 'approve-batch', action: 'send' }).ok === false,
    'approve-batch send without approval blocked by pure policy',
  );
  assert(
    checkOutreach(
      { id: 'z', email: 'founder@startup.test' },
      doc,
      { mode: 'approve-each', action: 'send', approved: true },
    ).ok === true,
    'human-approved send passes pure policy',
  );
  assert(
    checkOutreach(
      { id: 'z', email: 'founder@startup.test' },
      doc,
      { mode: 'approve-batch', action: 'send', approved: true },
    ).ok === true,
    'human-approved batch send passes pure policy',
  );
  assert(
    checkOutreach({ id: 'z' }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok === false,
    'human approval cannot send without contact',
  );
  assert(
    checkOutreach(
      { id: 'z', email: 'founder@mail.example.com' },
      doc,
      { mode: 'approve-each', action: 'send', approved: true },
    ).ok === false,
    'human approval cannot send to reserved example subdomain',
  );
  assert(
    checkOutreach(
      { id: 'z', email: 'not-an-email' },
      doc,
      { mode: 'approve-each', action: 'send', approved: true },
    ).ok === false,
    'human approval cannot send to malformed contact',
  );
  assert(
    checkOutreach(
      { id: 'z', email: 'placeholder@example.com' },
      doc,
      { mode: 'approve-each', action: 'send', approved: true },
    ).ok === false,
    'human approval cannot send to placeholder contact',
  );
  assert(
    ['noreply@startup.test', 'potter@trydemigod.com'].every(
      (email) => !checkOutreach({ id: email, email }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok,
    ),
    'human approval cannot send to no-reply or own-domain contact',
  );
  assert(
    checkOutreach(
      { id: 'new', handle: 'x' },
      doc,
      { mode: 'approve-each', action: 'send', approved: true },
    ).ok === false,
    'suppression overrides human approval',
  );
  const unknown = outreachPolicy({ mode: 'unknown' });
  assert(!unknown.canDraft && !unknown.canSend, 'unknown policy mode FAILS closed');
  assert(
    checkOutreach({ id: 'z' }, doc, { mode: 'auto', action: 'send' }).ok === false,
    'auto send blocked by pure policy',
  );
  assert(
    checkOutreach({ id: 'z' }, doc, { mode: 'draft-only', action: 'delete' }).ok === false,
    'unknown outreach action FAILS closed',
  );
  const emptyCli = spawnSync(process.execPath, [path.join(__dirname, 'demigod-outreach-policy.mjs')], {
    encoding: 'utf8',
  });
  assert(emptyCli.status === 2, 'policy CLI without selftest command FAILS closed');
}

// 13) revenue 10% math
{
  assert(feeCents(0).ok === false, 'fee zero FAILS');
  const f = feeCents(200000);
  assert(f.ok && f.feeCents === 2000000, '10% of 200k = 20000.00');
}

// 14) re-collection preserves funnel progress and history
{
  const seedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-x-seed-'));
  const seedPath = path.join(seedDir, 'x-signals.json');
  assert(writeSeedIfMissing(seedPath, { partners: [{ id: 'seed' }] }), 'X seed writes when input is absent');
  fs.writeFileSync(seedPath, JSON.stringify({ partners: [{ id: 'live' }] }));
  assert(!writeSeedIfMissing(seedPath, { partners: [{ id: 'seed' }] }), 'X seed does not overwrite live signal input');
  assert(JSON.parse(fs.readFileSync(seedPath)).partners[0].id === 'live', 'live X signal input survives collection');
  assert(sessionXLeads(seedPath).partners[0].id === 'live', 'collection routes through live X signal input');
  fs.writeFileSync(
    seedPath,
    JSON.stringify({ sourceKind: 'static-fallback', observedAt: '2026-01-01T00:00:00Z', expiresAt: '2026-01-02T00:00:00Z', partners: [{ id: 'stale' }] }),
  );
  assert(sessionXLeads(seedPath).partners.length === 0, 'expired static X fallback cannot enter collection');
  fs.writeFileSync(seedPath, JSON.stringify({ partners: [{ id: 'live-unstamped' }] }));
  assert(sessionXLeads(seedPath).partners[0].id === 'live-unstamped', 'untagged live X input remains available');
  fs.rmSync(seedDir, { recursive: true });

  assert(
    !isActionableInboxItem('startup-hire', { 'role-title': 'Head of Growth' }),
    'incomplete WIZ company bag stays out of lead CRM',
  );
  assert(
    isActionableInboxItem('startup-hire', { 'company-name': 'RealCo', 'role-title': 'Head of Growth' }),
    'identified WIZ company becomes a lead',
  );
  assert(
    isActionableInboxItem('engineer', { 'full-name': 'Ada', 'skills-stack': 'systems' }),
    'identified WIZ talent becomes a lead',
  );

  // Atomic lead JSON write (temp+rename; no leftover .tmp)
  {
    const aDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-atomic-leads-'));
    const aPath = path.join(aDir, 'DEMIGOD-LEADS.json');
    const payload = { partners: [{ id: 'p-atomic' }], talent: [], note: 'atomic' };
    writeLeadsJson(aPath, payload);
    assert(fs.existsSync(aPath), 'writeLeadsJson creates target');
    assert((fs.statSync(aPath).mode & 0o077) === 0, 'writeLeadsJson keeps contact PII private');
    const round = JSON.parse(fs.readFileSync(aPath, 'utf8'));
    assert(round.partners[0].id === 'p-atomic', 'writeLeadsJson content correct');
    const leftovers = fs.readdirSync(aDir).filter((f) => f.includes('.tmp'));
    assert(leftovers.length === 0, 'writeLeadsJson leaves no temp files');
    writeLeadsJson(aPath, { partners: [{ id: 'p2' }], talent: [] });
    assert(JSON.parse(fs.readFileSync(aPath, 'utf8')).partners[0].id === 'p2', 'writeLeadsJson overwrite ok');
    const stable = fs.readFileSync(aPath, 'utf8');
    let rejected = false;
    try {
      writeLeadsJson(aPath, { partners: [], talent: [], invalid: 1n });
    } catch {
      rejected = true;
    }
    assert(rejected, 'writeLeadsJson rejects unserializable payload');
    assert(fs.readFileSync(aPath, 'utf8') === stable, 'failed lead write preserves canonical state');
    assert(previousLeadsById(aPath).get('p2')?.id === 'p2', 'collector loads existing lead history by id');
    fs.writeFileSync(aPath, JSON.stringify({ partners: {}, talent: [{ id: 't-valid' }] }));
    assert(previousLeadsById(aPath).get('t-valid')?.id === 't-valid', 'collector ignores malformed lead lists');
  assert(previousLeadsById(path.join(aDir, 'missing.json')).size === 0, 'missing lead store is a first run');
    fs.writeFileSync(aPath, '{bad json');
    rejected = false;
    try {
      previousLeadsById(aPath);
    } catch {
      rejected = true;
    }
    assert(rejected, 'collector fails closed on unreadable existing lead history');
    assert(fs.readFileSync(aPath, 'utf8') === '{bad json', 'failed history load preserves corrupt canonical for recovery');
    fs.rmSync(aDir, { recursive: true });
  }

  // Gmail Webflow form body → contact fields (onboarding rehydrate; never invent)
  {
    const parsed = parseWebflowFormEmailBody(
      'Form startup-hire Site Demigod Submitted content contact-email: real.founder@startup.co company-stage: seed company-name: RealCo role-title: Founding Eng',
    );
    assert(parsed.form === 'startup-hire', 'webflow form body: form name');
    assert(parsed.email === 'real.founder@startup.co', 'webflow form body: contact-email');
    assert(parsed.raw['company-name'] === 'RealCo', 'webflow form body: company-name');
    assert(!isSyntheticContact(parsed.email, parsed.raw), 'real domain not synthetic');
    assert(isSyntheticContact('founder@example.com', { 'company-name': 'Acme Labs' }), 'example.com synthetic');
    const plan = planGmailFormCandidates({
      threads: [
        {
          messages: [
            {
              from: 'Webflow forms <no-reply-forms@webflow.com>',
              subject: 'New form submission on Webflow for Demigod',
              body_preview:
                'Form engineer-join Site Demigod Submitted content full-name: Pat Real seeker-email: pat@real.dev skills-stack: rust',
            },
            {
              from: 'Webflow forms <no-reply-forms@webflow.com>',
              subject: 'New form submission on Webflow for Demigod',
              body_preview:
                'Form startup-hire Site Demigod Submitted content contact-email: founder@example.com company-name: Acme Labs',
            },
          ],
        },
      ],
    });
    assert(plan.forms.length === 2, 'gmail form candidates count');
    assert(plan.real.length === 1 && plan.real[0].email === 'pat@real.dev', 'gmail form real only');
    assert(plan.synthetic.length === 1, 'gmail form synthetic separated');

    // form_filled conversion: Gmail real form → incomplete webhook sub contact patch
    {
      const realForms = [
        {
          form: 'startup-hire',
          email: 'founder@realco.test',
          raw: {
            'contact-email': 'founder@realco.test',
            'company-name': 'RealCo',
            'role-title': 'Founding Eng',
          },
          synthetic: false,
          messageId: 'msg-1',
        },
        {
          form: 'startup-hire',
          email: 'potter@trydemigod.com',
          raw: { 'contact-email': 'potter@trydemigod.com', 'role-title': 'Backend', 'company-name': 'Demigod' },
          synthetic: false,
        },
      ];
      const subs = [
        {
          id: 'sub-incomplete',
          form: 'startup-hire',
          data: { 'role-title': 'Founding Eng', 'stack-needs': 'rust' },
          status: 'new',
        },
        {
          id: 'sub-already',
          form: 'startup-hire',
          data: {
            'role-title': 'Founding Eng',
            'contact-email': 'already@realco.test',
            'company-name': 'RealCo',
          },
          status: 'new',
        },
        {
          id: 'sub-clone-a',
          form: 'startup-hire',
          data: { 'role-title': 'Head of Growth' },
          status: 'featured',
        },
        {
          id: 'sub-clone-b',
          form: 'startup-hire',
          data: { 'role-title': 'Head of Growth' },
          status: 'featured',
        },
      ];
      const ambForms = [
        {
          form: 'startup-hire',
          email: 'growth@startup.test',
          raw: { 'role-title': 'Head of Growth', 'contact-email': 'growth@startup.test' },
          synthetic: false,
        },
      ];
      const patchOk = planInboxContactPatches(realForms, subs);
      assert(patchOk.patches.length === 1, 'inbox patch: one unique title+company match');
      assert(patchOk.patches[0].submissionId === 'sub-incomplete', 'inbox patch: incomplete sub');
      assert(patchOk.patches[0].email === 'founder@realco.test', 'inbox patch: real email');
      assert(patchOk.patches[0].fields['contact-email'] === 'founder@realco.test', 'inbox patch: contact key');
      assert(
        patchOk.patches[0].fields['company-name'] === 'RealCo',
        'inbox patch: fills missing company-name',
      );
      assert(
        patchOk.skipped.some((s) => s.email === 'potter@trydemigod.com' && /self|synthetic/i.test(s.reason || '')),
        'inbox patch: self-domain skipped',
      );
      // already has contact → not patched
      assert(!patchOk.patches.some((p) => p.submissionId === 'sub-already'), 'inbox patch: never overwrite');

      const amb = planInboxContactPatches(ambForms, subs);
      assert(amb.patches.length === 0, 'inbox patch: ambiguous dual Head of Growth denied');
      assert(
        amb.skipped.some((s) => /ambiguous/i.test(s.reason || '')),
        'inbox patch: ambiguous reason',
      );

      // apply mutates only incomplete bag
      const items = JSON.parse(JSON.stringify(subs));
      const n = applyInboxContactPatches(items, patchOk.patches);
      assert(n === 1, 'applyInboxContactPatches count');
      assert(items[0].data['contact-email'] === 'founder@realco.test', 'apply: email written');
      assert(items[0].contactRehydrateVia === 'gmail-form-rehydrate', 'apply: provenance');
      // second apply is no-op (already has contact)
      assert(applyInboxContactPatches(items, patchOk.patches) === 0, 'apply: idempotent no overwrite');

      // join planning clones: in-memory patch without mutating source
      const src = JSON.parse(JSON.stringify(subs));
      const cloned = submissionsWithGmailPatches(src, patchOk.patches);
      assert(cloned[0].raw['contact-email'] === 'founder@realco.test', 'join clone: contact on raw');
      assert(!src[0].data['contact-email'], 'join clone: source bag unchanged');
      // join with patched sub becomes eligible (policy_hold → form_filled)
      const joinPlan = planFormFilledJoins(
        {
          partners: [
            {
              id: 'inbox-sub-incomplete',
              state: 'policy_hold',
              status: 'policy_hold',
              source: 'submissions-inbox:startup-hire',
            },
          ],
          talent: [],
        },
        cloned.filter((s) => s.id === 'sub-incomplete'),
      );
      assert(
        joinPlan.eligible.some((p) => p.leadId === 'inbox-sub-incomplete' && p.emailFromSub === 'founder@realco.test'),
        'join+gmail: form_filled eligible after rehydrate',
      );
    }
  }

  // Events Bot consented export (FOCUS: provenance + never invent emails)
  {
    assert(isEventsBotSf('San Francisco'), 'events SF geo allows SF');
    assert(!isEventsBotSf('Austin TX'), 'events SF geo blocks Austin');
    assert(isEventsBotConsented({ email: 'a@co.com', status: 'new' }, { kind: 'offer' }), 'offer+email = consent');
    assert(
      !isEventsBotConsented({ email: 'a@co.com', status: 'declined' }, { kind: 'offer' }),
      'declined offer denied',
    );
    assert(!isEventsBotConsented({ email: 'a@co.com' }, { kind: 'contact' }), 'contact without consent denied');
    assert(
      isEventsBotConsented({ email: 'a@co.com', consent: true }, { kind: 'contact' }),
      'contact consent:true ok',
    );
    const evtDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-evt-'));
    const evtPath = path.join(evtDir, 'DEMIGOD-EVENTS.json');
    fs.writeFileSync(
      evtPath,
      JSON.stringify({
        offers: {
          volunteer: [
            {
              id: 'v1',
              email: 'vol@startup.co',
              name: 'Vol',
              city: 'San Francisco',
              offer: 'host assist',
              status: 'new',
            },
            { id: 'v-skip', email: 'offline-check@trydemigod.com', city: 'San Francisco' },
            { id: 'v-dq', email: 'x@y.com', city: 'Austin', status: 'new' },
          ],
          sponsor: [],
          venue: [],
        },
        contacts: [
          { id: 'c1', email: 'found@real.co', name: 'F', role: 'sponsor', consent: true, city: 'SF' },
          { id: 'c2', email: 'nocon@x.com', name: 'N', role: 'other' },
        ],
        events: [{ id: 'ev1', title: 'Fogline Supper', city: 'San Francisco', stage: 'rsvp' }],
        calendarEvents: [
          { id: 'cal1', title: 'SoMa signal dinner', city: 'San Francisco', stage: 'ideate' },
          { id: 'cal2', title: 'NYC meetup', city: 'New York', stage: 'ideate' },
        ],
      }),
    );
    const exp = eventsBotLeads(evtPath);
    assert(exp.talent.some((t) => t.email === 'vol@startup.co' && t.consented), 'export volunteered email');
    assert(!exp.talent.some((t) => /offline-check/.test(t.email || '')), 'skip noise email');
    assert(exp.partners.some((p) => p.email === 'found@real.co'), 'export consented contact');
    assert(!exp.partners.some((p) => p.email === 'nocon@x.com'), 'skip contact without consent');
    assert(!exp.partners.some((p) => /^events-bot:(?:event|calendar)$/.test(p.source)), 'contactless event signals stay out of CRM');
    assert(exp.events === 3, 'event signals remain counted for status');
    assert(
      exp.talent.every((t) => t.provenance && t.provenance.kind) &&
        exp.partners.filter((p) => p.email).every((p) => p.provenance),
      'people leads carry provenance',
    );
    fs.rmSync(evtDir, { recursive: true });
  }

  const history = [{ at: '2026-07-17T00:00:00.000Z', from: 'sent', to: 'replied' }];
  const updatedAt = '2026-07-17T00:00:00.000Z';
  const provenance = { kind: 'events-bot-contact', contactId: 'contact-1' };
  const contactProvenance = { url: 'https://startup.test/jobs', at: updatedAt, method: 'scrape' };
  const merged = mergeLeadState(
    { id: 'same', state: 'sourced', status: 'sourced', score: 90 },
    {
      id: 'same',
      state: 'replied',
      status: 'replied',
      stateHistory: history,
      stateUpdatedAt: updatedAt,
      history: [{ at: updatedAt, status: 'replied', note: 'interested' }],
      updatedAt,
      sentAt: '2026-07-16T00:00:00.000Z',
      sentReceipt: 'demigod-outreach/funnel-receipts/same-sent.txt',
      receiptPath: 'demigod-outreach/funnel-receipts/same.txt',
      repliedAt: updatedAt,
      note: 'interested',
      joinedSubmissionId: 'submission-1',
      pairId: 'pair-1',
      pairIds: ['pair-1'],
      pilotId: 'pilot-1',
      pilotBridgedAt: '2026-07-17T00:00:01.000Z',
      hireEvidence: '/tmp/hire-1.txt',
      invoiceId: 'invoice-1',
      invoicePath: '/tmp/invoice-1.txt',
      feeCents: 2000000,
      nudgeCount: 2,
      policyHoldReason: 'no-contact-email',
      email: 'founder@startup.test',
      contactEmail: 'founder@startup.test',
      handle: '@founder',
      applyUrl: 'https://jobs.startup.test/apply/1',
      provenance,
      contactProvenance,
    },
  );
  assert(merged.state === 'replied' && merged.status === 'replied', 're-collect preserves advanced state');
  assert(merged.stateHistory === history, 're-collect preserves state history');
  const emptyHistory = mergeLeadState(
    { id: 'same', state: 'sourced', stateHistory: [], history: [] },
    { id: 'same', state: 'replied', stateHistory: history, history },
  );
  assert(
    emptyHistory.stateHistory === history && emptyHistory.history === history,
    're-collect cannot erase history with empty collector arrays',
  );
  assert(merged.stateUpdatedAt === updatedAt, 're-collect preserves state timestamp');
  assert(
    merged.history?.[0]?.status === 'replied' &&
      merged.updatedAt === updatedAt &&
      merged.sentAt === '2026-07-16T00:00:00.000Z' &&
      merged.sentReceipt === 'demigod-outreach/funnel-receipts/same-sent.txt' &&
      merged.receiptPath === 'demigod-outreach/funnel-receipts/same.txt' &&
      merged.repliedAt === updatedAt &&
      merged.note === 'interested',
    're-collect preserves outreach tracker history and timestamps',
  );
  assert(merged.nudgeCount === 2, 're-collect preserves follow-up cap');
  assert(merged.policyHoldReason === 'no-contact-email', 're-collect preserves policy-hold reason');
  assert(merged.contactProvenance === contactProvenance, 're-collect preserves contact provenance');
  assert(merged.provenance === provenance, 're-collect preserves source provenance');
  assert(
    merged.pairIds?.[0] === 'pair-1' &&
      merged.pilotId === 'pilot-1' &&
      merged.pilotBridgedAt === '2026-07-17T00:00:01.000Z',
    're-collect preserves match/pilot links',
  );
  assert(
    mergeLeadState(
      { id: 'pair-union', pairIds: ['pair-new'] },
      { id: 'pair-union', pairIds: ['pair-old', 'pair-new'] },
    ).pairIds.join() === 'pair-old,pair-new',
    're-collect merges pair links without loss or duplicates',
  );
  assert(
    mergeLeadState(
      { id: 'pair-malformed', pairIds: ['pair-valid'] },
      { id: 'pair-malformed', pairIds: 'pair-invalid' },
    ).pairIds.join() === 'pair-valid',
    're-collect ignores malformed legacy pair links',
  );
  assert(
    merged.pairId === 'pair-1' &&
      merged.hireEvidence === '/tmp/hire-1.txt' &&
      merged.invoiceId === 'invoice-1' &&
      merged.invoicePath === '/tmp/invoice-1.txt' &&
      merged.feeCents === 2000000,
    're-collect preserves hire evidence and invoice links',
  );
  assert(
    merged.joinedSubmissionId === 'submission-1' &&
      merged.email === 'founder@startup.test' &&
      merged.contactEmail === 'founder@startup.test' &&
      merged.handle === '@founder' &&
      merged.applyUrl === 'https://jobs.startup.test/apply/1',
    're-collect preserves join and contact/apply metadata',
  );
  const emptyContact = mergeLeadState(
    { id: 'empty-contact', email: '', contactEmail: '', handle: '', applyUrl: '' },
    { id: 'empty-contact', email: 'founder@startup.test', contactEmail: 'founder@startup.test', handle: '@founder', applyUrl: 'https://startup.test/apply' },
  );
  assert(
    emptyContact.email === 'founder@startup.test' &&
      emptyContact.contactEmail === 'founder@startup.test' &&
      emptyContact.handle === '@founder' &&
      emptyContact.applyUrl === 'https://startup.test/apply',
    're-collect cannot erase contact metadata with empty strings',
  );
  assert(
    mergeLeadState(
      { id: 'fresh-join', joinedSubmissionId: 'submission-new' },
      { id: 'fresh-join', joinedSubmissionId: 'submission-old' },
    ).joinedSubmissionId === 'submission-new',
    're-collect keeps a fresh submission join over stale snapshot metadata',
  );
  assert(merged.score === 90, 're-collect keeps fresh collection fields');
  const fresh = { id: 'pure-merge', url: 'https://x.com/founder/status/1' };
  const previous = { id: 'pure-merge', state: 'replied', status: 'replied' };
  mergeLeadState(fresh, previous);
  assert(
    fresh.handle == null && previous.handle == null,
    're-collect state merge does not mutate collector snapshots',
  );
  const legacy = mergeLeadState(
    { id: 'legacy', state: 'sourced', status: 'sourced' },
    { id: 'legacy', status: 'replied' },
  );
  assert(legacy.state === 'replied' && legacy.status === 'replied', 're-collect preserves legacy status progress');
  const staleState = mergeLeadState(
    { id: 'stale-state', state: 'sourced', status: 'sourced' },
    { id: 'stale-state', state: 'sourced', status: 'replied' },
  );
  assert(
    staleState.state === 'replied' && staleState.status === 'replied',
    're-collect prefers advanced legacy status over stale sourced state',
  );
  const freshStaleState = mergeLeadState(
    { id: 'fresh-stale-state', state: 'sourced', status: 'form_filled' },
    { id: 'fresh-stale-state', state: 'sourced', status: 'sourced' },
  );
  assert(
    freshStaleState.state === 'form_filled' && freshStaleState.status === 'form_filled',
    're-collect preserves fresh legacy progress despite stale sourced state',
  );
  // Free-form collect labels must not demote drafted (kevin-runner thrash)
  const freeLabel = mergeLeadState(
    {
      id: 'x-kevin',
      state: 'sourced',
      status: 'low-priority-local',
      handle: '@mediocrelychee',
    },
    {
      id: 'x-kevin',
      state: 'drafted',
      status: 'drafted',
      handle: '@mediocrelychee',
      stateHistory: [{ to: 'drafted' }],
    },
  );
  assert(
    freeLabel.state === 'drafted' && freeLabel.status === 'drafted',
    're-collect: low-priority-local does not wipe drafted',
  );
  assert(freeLabel.collectLabel === 'low-priority-local', 're-collect: free label kept as collectLabel');
  const enrichKeep = mergeLeadState(
    { id: 'enr', state: 'sourced', status: 'sourced', url: 'https://acme.com/j' },
    {
      id: 'enr',
      state: 'policy_hold',
      status: 'policy_hold',
      enrichAttemptCount: 2,
      enrichAttemptedAt: '2026-07-17T10:00:00.000Z',
      companyUrl: 'https://acme.com',
      policyHoldReason: 'no-usable-contact',
    },
  );
  assert(
    enrichKeep.state === 'policy_hold' &&
      enrichKeep.enrichAttemptCount === 2 &&
      enrichKeep.enrichAttemptedAt === '2026-07-17T10:00:00.000Z' &&
      enrichKeep.companyUrl === 'https://acme.com',
    're-collect preserves enrich cooldown/companyUrl metadata',
  );
  const staleSuppression = mergeLeadState(
    { id: 'stale-suppression', state: 'sourced', status: 'sourced' },
    { id: 'stale-suppression', state: 'sourced', status: 'opted_out' },
  );
  assert(
    staleSuppression.state === 'opted_out' && staleSuppression.status === 'opted_out',
    're-collect preserves opt-out when previous state is stale',
  );
  assert(
    ['quarantined', 'bounced', 'cold', 'disqualified', 'rejected', 'fell_through'].every((status) => {
      const row = mergeLeadState(
        { id: status, state: 'sourced', status: 'sourced' },
        { id: status, state: 'sourced', status },
      );
      return row.state === status && row.status === status;
    }),
    're-collect preserves every terminal suppression when previous state is stale',
  );
  const mixedCaseSuppression = mergeLeadState(
    { id: 'mixed-case-suppression', state: 'sourced', status: 'sourced' },
    { id: 'mixed-case-suppression', state: 'SOURCED', status: 'OPTED_OUT' },
  );
  assert(
    mixedCaseSuppression.state === 'opted_out' && mixedCaseSuppression.status === 'opted_out',
    're-collect canonicalizes mixed-case suppression state',
  );
  const conflictingSuppression = mergeLeadState(
    { id: 'conflicting-suppression', state: 'sourced', status: 'sourced' },
    { id: 'conflicting-suppression', state: 'replied', status: 'opted_out' },
  );
  assert(
    conflictingSuppression.state === 'opted_out' && conflictingSuppression.status === 'opted_out',
    're-collect prefers suppression over conflicting active state',
  );
  const priorOptOut = mergeLeadState(
    { id: 'prior-opt-out', state: 'disqualified', status: 'disqualified' },
    { id: 'prior-opt-out', state: 'opted_out', status: 'opted_out' },
  );
  assert(priorOptOut.state === 'opted_out', 're-collect never replaces a prior opt-out');
  const priorOptOutVsFreshProgress = mergeLeadState(
    { id: 'prior-opt-out-progress', state: 'form_filled', status: 'form_filled' },
    { id: 'prior-opt-out-progress', state: 'opted_out', status: 'opted_out' },
  );
  assert(
    priorOptOutVsFreshProgress.state === 'opted_out' && priorOptOutVsFreshProgress.status === 'opted_out',
    're-collect never resurrects a prior opt-out from fresh active progress',
  );
  const freshSuppression = mergeLeadState(
    { id: 'fresh-suppression', state: 'opted_out', status: 'opted_out' },
    { id: 'fresh-suppression', state: 'replied', status: 'replied' },
  );
  assert(
    freshSuppression.state === 'opted_out' && freshSuppression.status === 'opted_out',
    're-collect keeps fresh suppression over previous active state',
  );
  const freshMixedCaseSuppression = mergeLeadState(
    { id: 'fresh-mixed-case-suppression', state: 'OPTED_OUT', status: 'OPTED_OUT' },
    { id: 'fresh-mixed-case-suppression', state: 'replied', status: 'replied' },
  );
  assert(
    freshMixedCaseSuppression.state === 'opted_out' && freshMixedCaseSuppression.status === 'opted_out',
    're-collect canonicalizes fresh mixed-case suppression state',
  );
  const freshHistory = [{ at: '2026-07-17T01:00:00.000Z', from: 'sourced', to: 'opted_out' }];
  const freshSuppressionWithHistory = mergeLeadState(
    {
      id: 'fresh-suppression-history',
      state: 'opted_out',
      status: 'opted_out',
      stateHistory: freshHistory,
      stateUpdatedAt: freshHistory[0].at,
    },
    {
      id: 'fresh-suppression-history',
      state: 'replied',
      status: 'replied',
      stateHistory: [{ at: '2026-07-16T01:00:00.000Z', from: 'sent', to: 'replied' }],
      stateUpdatedAt: '2026-07-16T01:00:00.000Z',
    },
  );
  assert(
    freshSuppressionWithHistory.stateHistory === freshHistory &&
      freshSuppressionWithHistory.stateUpdatedAt === freshHistory[0].at,
    're-collect keeps fresh transition metadata over stale snapshot metadata',
  );
  const policyHold = mergeLeadState(
    { id: 'held', state: 'sourced', status: 'sourced' },
    { id: 'held', state: 'policy_hold', status: 'policy_hold', policyHoldReason: 'no-contact-email' },
  );
  assert(
    policyHold.state === 'policy_hold' && policyHold.policyHoldReason === 'no-contact-email',
    're-collect preserves policy hold and reason',
  );
  const optedOut = mergeLeadState(
    { id: 'suppressed', state: 'sourced', status: 'sourced', email: 'fresh@startup.test' },
    { id: 'suppressed', state: 'opted_out', status: 'opted_out', email: 'old@startup.test' },
  );
  assert(
    optedOut.state === 'opted_out' && optedOut.email === 'fresh@startup.test',
    're-collect preserves opt-out while accepting fresh contact data',
  );
  const warm = mergeLeadState(
    { id: 'legacy-warm', status: 'triage' },
    { id: 'legacy-warm', status: 'warm' },
  );
  assert(warm.state == null && warm.status === 'triage', 're-collect does not invent legacy warm funnel state');
  const reviewInbox = mergeLeadState(
    { id: 'legacy-review', state: 'sourced', status: 'sourced' },
    { id: 'legacy-review', state: 'sourced', status: 'review-inbox' },
  );
  assert(
    reviewInbox.state === 'sourced' && reviewInbox.status === 'sourced',
    're-collect does not restore legacy review-inbox as a funnel state',
  );
  const newlyHeld = mergeLeadState(
    { id: 'newly-held', state: 'policy_hold', status: 'policy_hold' },
    { id: 'newly-held', state: 'sourced', status: 'sourced' },
  );
  assert(
    newlyHeld.state === 'policy_hold' && newlyHeld.status === 'policy_hold',
    're-collect keeps a fresh policy hold over stale source state',
  );
  const priorSentVsFreshHold = mergeLeadState(
    { id: 'sent-now-held', state: 'policy_hold', status: 'policy_hold' },
    { id: 'sent-now-held', state: 'sent', status: 'sent', sentAt: '2026-07-16T01:00:00.000Z' },
  );
  assert(
    priorSentVsFreshHold.state === 'sent' && priorSentVsFreshHold.status === 'sent',
    're-collect cannot regress prior sent progress to a fresh policy hold',
  );
  const freshProgress = mergeLeadState(
    { id: 'fresh-progress', state: 'form_filled', status: 'form_filled' },
    { id: 'fresh-progress', state: 'sent', status: 'sent' },
  );
  assert(
    freshProgress.state === 'form_filled' && freshProgress.status === 'form_filled',
    're-collect does not regress fresh active progress to an older snapshot',
  );
  assert(hasAdvancedState({ status: 'replied' }), 're-collect re-attaches legacy advanced leads');
  assert(hasAdvancedState({ state: 'opted_out' }), 're-collect re-attaches suppressed leads');
  assert(!hasAdvancedState({ state: 'sourced', status: 'triage' }), 're-collect drops stale source-only leads');
  assert(!hasAdvancedState({ state: 'SOURCED', status: 'TRIAGE' }), 're-collect drops mixed-case source-only leads');
  assert(
    shouldReattachLead({ state: 'sourced', source: 'submissions-inbox:startup-hire' }) &&
      shouldReattachLead({ state: 'sourced', source: 'events-bot:contact' }) &&
      shouldReattachLead({ state: 'sourced', source: 'manual' }),
    're-collect re-attaches durable inbound, event, and manual leads after collection caps',
  );
  assert(
    !shouldReattachLead({ state: 'sourced', source: 'firecrawl-search' }),
    're-collect still drops stale source-only scrape leads',
  );
  assert(!isTalentLead({ type: 'partner', handle: '@founder' }), 're-collect keeps handled partners in partner lane');
}

// 14b) lead-collect writes complete JSON and leaves no atomic temp behind
{
  assert(collectArgsValid(['--limit=10']), 'lead collect accepts exact collection args');
  assert(collectArgsValid(['--limit=10', '--force-paused']), 'lead collect accepts explicit paused override');
  assert(collectArgsValid(['--enrich', '--id=lead-1', '--dry-run']), 'lead collect accepts exact enrich args');
  assert(!collectArgsValid(['enrich', '--enrich']), 'lead collect rejects duplicate enrich mode aliases');
  assert(!collectArgsValid(['--limit=1', '--limit=100']), 'lead collect rejects duplicate value flags');
  assert(!collectArgsValid(['--enrch']), 'lead collect rejects typo before paid collection');
assert(!collectArgsValid(['--dry-run']), 'lead collect rejects misplaced dry-run before paid collection');
assert(leadCollectionPaused('# Current\nLead funnel is **paused** now'), 'lead collect detects the shared focus pause');
assert(!leadCollectionPaused('# Current\nLead funnel is active'), 'lead collect permits active focus');
{
  const mixed = runSearchQueries(['ok', 'bad'], (q) => {
    if (q === 'bad') throw new Error('transport');
    return [{ url: 'https://startup.test' }];
  });
  assert(mixed.results.length === 1 && mixed.errors.length === 1, 'lead collect preserves partial Firecrawl success');
  const queryRows = parseSearchHits([
    { title: 'Founding Engineer @ QueryCo', url: 'https://query.test/job', description: 'San Francisco startup role' },
  ], 'partner', 'query one');
  queryRows[0].state = 'disqualified';
  assert(
    queryRows[0].provenance.query === 'query one' &&
      JSON.stringify(searchQueryYield(queryRows, 'query one', { hits: [{}], rows: queryRows })) ===
        JSON.stringify({ hits: 1, parsed: 1, retained: 1, disqualified: 1 }),
    'lead collect attributes final retained and disqualified yield to each paid query',
  );
  const allFailedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-search-failed-'));
  const allFailedCrm = path.join(allFailedDir, 'crm.json');
  const allFailedReceipt = path.join(allFailedDir, 'receipt.json');
  fs.writeFileSync(allFailedCrm, 'unchanged CRM\n');
  let allFailedThrew = false;
  try {
    runSearchQueries(['bad'], () => { throw new Error('transport'); }, (errors) => {
      fs.writeFileSync(allFailedReceipt, JSON.stringify({ errors }));
    });
  } catch { allFailedThrew = true; }
  assert(allFailedThrew, 'lead collect fails closed when every Firecrawl query fails');
  assert(JSON.parse(fs.readFileSync(allFailedReceipt)).errors[0].error === 'transport', 'lead collect receipts every-query Firecrawl failure');
  assert(fs.readFileSync(allFailedCrm, 'utf8') === 'unchanged CRM\n', 'all-failed Firecrawl batch leaves CRM unchanged');
  fs.rmSync(allFailedDir, { recursive: true });
}
assert(receiptArgsValid(['--id=x', '--message-id=m']), 'receipt accepts documented value flags');
assert(receiptArgsValid(['--id', 'x', '--messageId', 'm']), 'receipt accepts spaced alias flags');
assert(!receiptArgsValid(['--id=x', '--id=y']), 'receipt rejects duplicate value flags');
assert(!receiptArgsValid(['--message-id=x', '--messageId=y']), 'receipt rejects duplicate aliases');
assert(!receiptArgsValid(['--id=x', '--send']), 'receipt rejects unknown flags');
assert(!receiptArgsValid(['--id']), 'receipt rejects missing values');
  const txDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-receipt-tx-'));
  const crm = path.join(txDir, 'crm.json');
  const log = path.join(txDir, 'log.jsonl');
  const receipt = path.join(txDir, 'receipt.txt');
  try {
    fs.writeFileSync(crm, 'before\n');
    let failed = false;
    try {
      commitReceiptTransaction({
        receiptPath: receipt,
        receiptBody: 'proof\n',
        trackedPaths: [crm, log],
        commit() {
          fs.writeFileSync(crm, 'after\n');
          fs.writeFileSync(log, 'partial\n');
          throw new Error('injected write failure');
        },
      });
    } catch (error) {
      failed = /injected write failure/.test(String(error?.message || error));
    }
    assert(failed, 'receipt transaction surfaces commit failure');
    assert(fs.readFileSync(crm, 'utf8') === 'before\n', 'receipt transaction restores CRM on failure');
    assert(!fs.existsSync(log) && !fs.existsSync(receipt), 'receipt transaction removes partial log and proof');
    const blocked = path.join(txDir, 'blocked');
    fs.writeFileSync(blocked, 'before\n');
    let rollbackFailure;
    try {
      commitReceiptTransaction({
        receiptPath: receipt,
        receiptBody: 'proof\n',
        trackedPaths: [blocked, log],
        commit() {
          fs.unlinkSync(blocked);
          fs.mkdirSync(blocked);
          fs.writeFileSync(log, 'partial\n');
          throw new Error('original failure');
        },
      });
    } catch (error) {
      rollbackFailure = error;
    }
    assert(rollbackFailure?.message === 'original failure', 'receipt rollback preserves original failure');
    assert(rollbackFailure?.rollbackErrors?.[0]?.file === blocked, 'receipt rollback reports restore failure');
    assert(!fs.existsSync(log) && !fs.existsSync(receipt), 'receipt rollback continues after restore failure');
    fs.rmSync(blocked, { recursive: true, force: true });
    commitReceiptTransaction({
      receiptPath: receipt,
      receiptBody: 'proof\n',
      trackedPaths: [crm, log],
      commit() {
        fs.writeFileSync(crm, 'after\n');
        fs.writeFileSync(log, 'committed\n');
      },
    });
    assert(fs.readFileSync(receipt, 'utf8') === 'proof\n', 'receipt publishes only after state commit');
  } finally {
    fs.rmSync(txDir, { recursive: true, force: true });
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-leads-write-'));
  const file = path.join(dir, 'leads.json');
  const value = { schema: 'leads/2', leads: [{ id: 'atomic-selftest' }] };
  try {
    writeLeadsJson(file, value);
    assert(fs.readFileSync(file, 'utf8') === `${JSON.stringify(value, null, 2)}\n`, 'lead write content is correct');
    assert(fs.readdirSync(dir).every((name) => !name.startsWith('leads.json.tmp.')), 'lead write leaves no temp file');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 14c) lead-collect intake: drop aggregators + fragment junk (vacuous both ways)
{
  assert(
    isAggregatorUrl('https://www.indeed.com/q-founding-engineer-l-san-francisco,-ca-jobs.html'),
    'indeed listing is aggregator',
  );
  assert(
    isAggregatorUrl('https://www.ycombinator.com/companies/location/san-francisco-bay-area/hiring'),
    'YC companies index is aggregator',
  );
  assert(
    isAggregatorUrl('https://www.ycombinator.com/apply'),
    'YC generic apply page is aggregator',
  );
  assert(
    isAggregatorUrl('https://events.ycombinator.com/startup-school-2026'),
    'YC events page is aggregator',
  );
  assert(
    isAggregatorUrl('https://www.recruitingfromscratch.com/roles/product-manager'),
    'recruiting agency board is aggregator (not a founder lead)',
  );
  assert(
    isAggregatorUrl('https://triplebyte.com/jobs/founding-engineer'),
    'triplebyte job board is aggregator',
  );
  assert(
    !isAggregatorUrl('https://clera.ai/careers/founding-engineer'),
    'company careers page is not aggregator',
  );
  assert(isJunkPartnerId('web-co-m9DzFnyt66yeDA') && isJunkPartnerId('web-abc'), 'web-co / web-* junk ids');
  assert(!isJunkPartnerId('fc-p-UjoF4x88UmHOwy') && !isJunkPartnerId('clera-founding'), 'real ids not junk');

  const wellfoundish = `
## Top Companies hiring now
Standout is hiring now for many roles
Showed Expanding Rapidly We The open roles
  `;
  const junkParsed = parsePartnerLines(wellfoundish, 'wellfound-fixture.md');
  assert(junkParsed.length === 0, 'wellfound-style fragment markdown → 0 partner leads');

  const realMd = `
- **Acme** — Founding Engineer
* Beta Corp is hiring Product Manager
  `;
  const realParsed = parsePartnerLines(realMd, 'real-fixture.md');
  assert(
    realParsed.length === 2 &&
      realParsed.some((l) => l.company === 'Acme' && /Founding Engineer/i.test(l.title)) &&
      realParsed.some((l) => /Beta/i.test(l.company) && /Product Manager/i.test(l.title)),
    'real company+role lines → partner leads (Acme + Beta)',
  );
  const acmeOnly = parsePartnerLines('- **Acme** — Founding Engineer\n', 'one.md');
  assert(acmeOnly.length === 1 && acmeOnly[0].company === 'Acme', 'single real line → exactly 1');

  const stopCo = parsePartnerLines('- **Top Startups** — Founding Engineer\n', 'stop.md');
  assert(stopCo.length === 0, 'stopword company (Top …) rejected');

  const noRole = parsePartnerLines('- **Acme** — Open roles soon\n', 'norole.md');
  assert(noRole.length === 0, 'title without role word rejected');

  const hits = parseSearchHits(
    [
      {
        title: 'Founding Engineer jobs SF',
        url: 'https://www.indeed.com/q-founding-engineer-l-san-francisco,-ca-jobs.html',
        description: 'Many jobs',
      },
      {
        title: 'Clera founding eng',
        url: 'https://jobs.ashbyhq.com/clera/founding',
        description: 'Founding Engineer at Clera SF',
      },
    ],
    'partner',
  );
  assert(hits.length === 1 && /clera/i.test(hits[0].url), 'indeed.com search hit dropped; real URL kept');
  assert(
    parseSearchHits(
      [{ title: 't', url: 'https://www.reddit.com/r/SFBayJobs/x', description: 'x' }],
      'partner',
    ).length === 0,
    'reddit aggregator hit → 0',
  );
  // talent side: aggregator SERP is not a person
  const talentHits = parseSearchHits(
    [
      {
        title: 'Founding Engineer jobs SF',
        url: 'https://www.indeed.com/q-founding-engineer-l-san-francisco,-ca-jobs.html',
        description: 'Many jobs',
      },
      {
        title: 'Kevin open to founding eng',
        url: 'https://x.com/someone/status/123',
        description: 'open to work founding engineer SF',
      },
    ],
    'talent',
  );
  assert(
    talentHits.length === 1 && /x\.com/i.test(talentHits[0].url),
    'talent indeed SERP dropped; real profile URL kept',
  );
  assert(
    parseSearchHits(
      [{ title: 't', url: 'https://wellfound.com/location/san-francisco', description: 'x' }],
      'talent',
    ).length === 0,
    'talent wellfound index → 0',
  );
  assert(
    parseSearchHits(
      [{
        title: 'Fractional CTO in San Francisco From $60/hr',
        url: 'https://hypernestlabs.com/locations/san-francisco',
        description: 'Fractional CTO services for startups',
      }],
      'talent',
    ).length === 0,
    'talent company location/service page → 0',
  );

  assert(
    isJunkAggregatorLead({
      id: 'fc-t-x',
      url: 'https://www.indeed.com/q-founding-engineer-jobs.html',
    }),
    'indeed talent lead is junk',
  );
  assert(
    isJunkAggregatorLead({
      id: 'fc-t-dPDmzYDkxz_Njn',
      type: 'talent',
      url: 'https://hypernestlabs.com/locations/san-francisco',
    }),
    'company location/service page is junk talent',
  );
  assert(
    isJunkAggregatorLead({ id: 'web-co-abc', url: 'https://example.com' }),
    'web-co-* id is junk',
  );
  assert(
    !isJunkAggregatorLead({
      id: 'waas-realjob',
      url: 'https://www.workatastartup.com/jobs/96164',
    }),
    'waas job detail is NOT junk',
  );
  assert(
    !isJunkAggregatorLead({
      id: 'fc-p-real',
      url: 'https://jobs.ashbyhq.com/clera/founding',
    }),
    'ashby partner is NOT junk',
  );
  // Recruiting-agency SERP (was polluting batch-approve ready with info@…)
  assert(
    isJunkAggregatorLead({
      id: 'fc-p-Z2JfylTHZHdYRz',
      url: 'https://www.recruitingfromscratch.com/roles/product-manager',
      contactEmail: 'info@recruitingfromscratch.com',
      company: 'Product Manager Jobs at Startups | RFS',
    }),
    'recruitingfromscratch partner is junk aggregator',
  );
  assert(
    parseSearchHits(
      [
        {
          title: 'Product Manager Jobs at Startups | RFS',
          url: 'https://www.recruitingfromscratch.com/roles/product-manager',
          description: 'The median pay is $131K',
        },
        {
          title: 'Clera founding eng',
          url: 'https://jobs.ashbyhq.com/clera/founding',
          description: 'Founding Engineer at Clera SF',
        },
      ],
      'partner',
    ).length === 1,
    'RFS search hit dropped; real ashby kept',
  );
  // Residual P0-1: SERP-style titles on non-AGG hosts must not mint partners
  assert(
    isSerpListingTitle('Founding Engineer jobs in San Francisco Bay Area, Ca'),
    'jobs-in SERP title detected',
  );
  assert(!isSerpListingTitle('Founding Engineer ($3M pre-seed) @ Clera'), '@ company title is not SERP index');
  assert(
    parseSearchHits(
      [
        {
          title: 'Founding Engineer jobs in San Francisco Bay Area, Ca',
          url: 'https://jobs.ashbyhq.com/boards/sf-founding',
          description: 'Many founding engineer roles across SF',
        },
        {
          title: 'Founding Engineer ($3M pre-seed) @ Clera',
          url: 'https://jobs.ashbyhq.com/clera/8e7be82b-6b46-42ee-a862-3d3e1cad6bd4',
          description: 'we need an exceptional engineer to join our founding team',
        },
      ],
      'partner',
    ).length === 1,
    'SERP jobs-in title dropped even on ashby host; real @ Company kept',
  );
  const atHit = parseSearchHits(
    [
      {
        title: 'Founding Engineer ($3M pre-seed) @ Clera',
        url: 'https://jobs.ashbyhq.com/clera/founding-x',
        description: 'Founding Engineer SF',
      },
    ],
    'partner',
  );
  assert(
    atHit.length === 1 &&
      atHit[0].company === 'Clera' &&
      /Founding Engineer/i.test(atHit[0].title),
    'Role @ Company → company=Clera, title=role',
  );
  const fields = parsePartnerHitFields('Staff Engineer at Acme Labs', 'SF Bay');
  assert(
    fields.company === 'Acme Labs' && /Staff Engineer/i.test(fields.title),
    'Role at Company split',
  );
  assert(
    parseSearchHits(
      [{ title: 'Cookie Policy', url: 'https://acme.ai/cookies', description: 'we use cookies' }],
      'partner',
    ).length === 0,
    'no role word → 0 partner hits',
  );
  // Wellfound recipe mints AGG urls — intake filter drops them (queue integrity)
  const wfMd =
    '[**Acme**](https://wellfound.com/company/acme)\n' +
    '[Founding Engineer](https://wellfound.com/jobs/99999-founding-engineer) Full-time\n';
  const wfMint = parseWellfoundSfJobs(wfMd, { limit: 5 });
  assert(
    wfMint.length === 0 || wfMint.every((l) => isJunkAggregatorLead(l)),
    'wellfound parser output is empty or all AGG junk',
  );
  assert(
    wfMint.filter((l) => !isJunkAggregatorLead(l)).length === 0,
    'intake filter would drop all wellfound mints',
  );
  assert(
    isJunkAggregatorLead({
      id: 'bi-x',
      url: 'https://www.builtinsf.com/company/datadog',
    }),
    'builtinsf company URL is junk aggregator',
  );
  assert(
    isJunkAggregatorLead({
      id: 'fc-p-ss',
      url: 'https://events.ycombinator.com/startup-school-2026',
    }),
    'YC Startup School events URL is junk',
  );
  assert(
    isJunkAggregatorLead({
      id: 'evt-own',
      url: 'https://www.trydemigod.com/?p=events',
      contactEmail: 'potter@trydemigod.com',
    }),
    'own-site events URL is junk (footer pollution)',
  );
  // X org/job-board accounts are SERP noise (residual P0-1 queue integrity)
  assert(
    isJunkAggregatorLead({
      id: 'x-pantograph',
      url: 'https://x.com/SFSoftwareJobs/status/2077592582553526541',
      handle: '@SFSoftwareJobs',
    }),
    'x.com/SFSoftwareJobs status is junk aggregator account',
  );
  assert(
    isJunkAggregatorLead({
      id: 'x-robotics-sf',
      url: 'https://x.com/jobswithsowmya/status/2075724023804428715',
      handle: '@jobswithsowmya',
    }),
    'x.com/jobswithsowmya status is junk aggregator account',
  );
  assert(
    isJunkAggregatorLead({
      id: 'x-magic-ai',
      url: 'https://x.com/securityblvd/status/2077053030805938',
      handle: '@securityblvd',
    }),
    'x.com/securityblvd status is junk aggregator account',
  );
  assert(
    !isJunkAggregatorLead({
      id: 'x-tensorlake',
      url: 'https://x.com/theconsensusdev/status/2077783117306195978',
      handle: '@theconsensusdev',
    }),
    'x.com person status is NOT junk',
  );
  // re-collect demote: drafted RFS junk must not re-enter approve queue
  const rfsDrafted = demoteJunkLead({
    id: 'fc-p-Z2JfylTHZHdYRz',
    state: 'drafted',
    status: 'drafted',
    url: 'https://www.recruitingfromscratch.com/roles/product-manager',
    contactEmail: 'info@recruitingfromscratch.com',
    stateHistory: [{ at: '2026-07-17T16:00:00.000Z', from: 'sourced', to: 'drafted' }],
  });
  assert(rfsDrafted.demoted === true, 'demoteJunkLead: drafted RFS → demoted');
  assert(rfsDrafted.lead.state === 'disqualified', 'demoteJunkLead: drafted RFS → disqualified');
  assert(
    (rfsDrafted.lead.stateHistory || []).some((h) => h.to === 'disqualified'),
    'demoteJunkLead: history keeps audit trail',
  );
  const alreadyDq = demoteJunkLead({
    id: 'web-x',
    state: 'disqualified',
    url: 'https://www.indeed.com/q-x',
  });
  assert(alreadyDq.demoted === false, 'demoteJunkLead: already DQ → idempotent');
  const waasKeep = demoteJunkLead({
    id: 'waas-realjob',
    state: 'drafted',
    url: 'https://www.workatastartup.com/jobs/96164',
  });
  assert(waasKeep.demoted === false, 'demoteJunkLead: waas job NOT demoted');
  assert(waasKeep.lead.state === 'drafted', 'demoteJunkLead: waas job stays drafted');
  const personKeep = demoteJunkLead({
    id: 'x-tensorlake',
    state: 'drafted',
    url: 'https://x.com/theconsensusdev/status/2077783117306195978',
    handle: '@theconsensusdev',
  });
  assert(personKeep.demoted === false, 'demoteJunkLead: real X person NOT demoted');
  const scrubbedBoard = scrubNoiseContact({
    id: 'x-noise',
    handle: '@SFSoftwareJobs',
    contactEmail: 'workatastartup@ycombinator.com',
  });
  assert(scrubbedBoard.handle == null, 'scrub: noise job-board handle stripped');
  assert(scrubbedBoard.contactEmail == null, 'scrub: noise platform email stripped');

  const junkDoc = {
    partners: [
      { id: 'web-co-frag', state: 'drafted', url: 'https://example.com', company: 'Top' },
      {
        id: 'waas-keep',
        state: 'sourced',
        url: 'https://www.workatastartup.com/jobs/96164',
        company: 'Astraea',
      },
      {
        id: 'clera-ok',
        state: 'drafted',
        url: 'https://jobs.ashbyhq.com/clera/x',
        company: 'Clera',
      },
      {
        id: 'evt-own',
        state: 'drafted',
        url: 'https://www.trydemigod.com/?p=events',
        company: 'Fogline',
      },
      {
        id: 'yc-events',
        state: 'drafted',
        url: 'https://events.ycombinator.com/startup-school-2026',
        company: 'Startup School',
      },
      {
        id: 'inbox-placeholder',
        state: 'policy_hold',
        source: 'submissions-inbox:startup-hire',
        company: '(from WIZ)',
      },
      {
        id: 'inbox-real',
        state: 'policy_hold',
        source: 'submissions-inbox:startup-hire',
        company: 'RealCo',
      },
    ],
    talent: [
      {
        id: 'fc-t-indeed',
        state: 'drafted',
        url: 'https://www.indeed.com/q-founding-engineer-jobs.html',
        name: 'Founding Engineer jobs',
      },
      {
        id: 'x-kevin',
        state: 'drafted',
        url: 'https://x.com/k/status/1',
        name: 'Kevin',
        handle: '@k',
      },
    ],
  };
  const dq1 = disqualifyJunk(junkDoc, { actor: 'agent', note: 'junk-aggregator-or-fragment' });
  assert(dq1.disqualified.length === 5, 'disqualifyJunk DQs aggregators + legacy WIZ placeholder');
  assert(
    junkDoc.partners.find((p) => p.id === 'web-co-frag').state === 'disqualified' &&
      junkDoc.partners.find((p) => p.id === 'evt-own').state === 'disqualified' &&
      junkDoc.partners.find((p) => p.id === 'yc-events').state === 'disqualified' &&
      junkDoc.partners.find((p) => p.id === 'inbox-placeholder').state === 'disqualified' &&
      junkDoc.talent.find((t) => t.id === 'fc-t-indeed').state === 'disqualified',
    'junk rows marked disqualified',
  );
  assert(
    junkDoc.partners.find((p) => p.id === 'waas-keep').state === 'sourced' &&
      junkDoc.partners.find((p) => p.id === 'clera-ok').state === 'drafted' &&
      junkDoc.partners.find((p) => p.id === 'inbox-real').state === 'policy_hold' &&
      junkDoc.talent.find((t) => t.id === 'x-kevin').state === 'drafted',
    'real leads left untouched',
  );
  const dq2 = disqualifyJunk(junkDoc, { actor: 'agent', note: 'junk-aggregator-or-fragment' });
  assert(dq2.disqualified.length === 0, 'disqualifyJunk idempotent');
}

// 14b) parkNoMx — free DNS MX (injectable) parks bad domains only
{
  const mxDoc = {
    partners: [
      {
        id: 'mx-bad',
        state: 'drafted',
        email: 'a@this-domain-should-not-exist-demigod-xyz123.com',
      },
      { id: 'mx-good', state: 'drafted', email: 'ok@startup.test' },
      { id: 'mx-retry', state: 'drafted', email: 'retry@startup.test' },
      { id: 'mx-url', state: 'drafted', url: 'https://example.com/jobs/1' },
    ],
    talent: [],
  };
  const checkMx = async (email) => {
    if (/should-not-exist/i.test(email)) return { ok: false, reason: 'ENOTFOUND' };
    if (/retry/i.test(email)) return { ok: false, reason: 'EAI_AGAIN', retryable: true };
    return { ok: true, reason: null };
  };
  const r1 = await parkNoMx(mxDoc, { actor: 'agent', checkMx });
  assert(r1.parked.length === 1 && r1.parked[0].id === 'mx-bad', 'parkNoMx parks no-MX email');
  assert(mxDoc.partners[0].state === 'policy_hold', 'no-MX → policy_hold');
  assert(mxDoc.partners[0].policyHoldReason === 'no-mx', 'policyHoldReason no-mx');
  assert(
    mxDoc.partners[1].state === 'drafted' && mxDoc.partners[1].emailCheck?.mx === true,
    'good MX stamped',
  );
  assert(mxDoc.partners.find((p) => p.id === 'mx-url').state === 'drafted', 'url-only skipped');
  assert(mxDoc.partners.find((p) => p.id === 'mx-retry').state === 'drafted', 'transient MX error stays drafted');
  const r2 = await parkNoMx(mxDoc, { actor: 'agent', checkMx });
  assert(r2.parked.length === 0, 'parkNoMx idempotent');
}

// 14c) importEventsLeads — consented events merge; no invent; preserve existing
{
  const doc = {
    partners: [{ id: 'keep-1', state: 'drafted', email: 'keep@startup.test' }],
    talent: [],
  };
  const events = {
    partners: [
      {
        id: 'evt-new-1',
        email: 'sponsor@goodvenue.test',
        company: 'Fogline Sponsor',
        source: 'events-bot:sponsor',
        consented: true,
        state: 'sourced',
      },
      {
        id: 'evt-dup',
        email: 'keep@startup.test',
        company: 'Dup',
        source: 'events-bot:sponsor',
        consented: true,
      },
      {
        id: 'evt-noise',
        email: 'noreply@example.com',
        company: 'Noise',
        source: 'events-bot:sponsor',
        consented: true,
      },
      { id: 'evt-declined', email: 'declined@startup.test', consented: false },
      { id: 'evt-unknown', email: 'unknown@startup.test' },
    ],
    talent: [
      {
        id: 'evt-vol-1',
        email: 'vol@helper.test',
        name: 'Alex',
        type: 'talent',
        source: 'events-bot:volunteer',
        consented: true,
        state: 'sourced',
      },
    ],
  };
  const r = importEventsLeads(doc, events);
  assert(r.added.length === 2, 'importEvents adds new partner+talent');
  assert(doc.partners.some((p) => p.id === 'evt-new-1'), 'importEvents partner present');
  assert(doc.talent.some((t) => t.id === 'evt-vol-1'), 'importEvents talent present');
  assert(doc.partners.find((p) => p.id === 'keep-1').state === 'drafted', 'importEvents preserves existing state');
  assert(r.skipped.some((s) => s.reason === 'email-exists'), 'importEvents skips email dup');
  assert(r.skipped.some((s) => s.reason === 'noise-email'), 'importEvents skips noise email');
  assert(
    r.skipped.filter((s) => s.reason === 'consent-required').length === 2,
    'importEvents requires explicit consent',
  );
  const calOnly = importEventsLeads(doc, {
    partners: [{ id: 'evt-cal-x', source: 'events-bot:calendar', url: 'https://www.trydemigod.com/?p=events', consented: true }],
    talent: [],
  });
  assert(calOnly.added.length === 0 && calOnly.skipped.some((s) => s.reason === 'no-contact'), 'importEvents skips calendar no-contact');
  const r2 = importEventsLeads(doc, events);
  assert(r2.added.length === 0, 'importEvents idempotent');
}

// 14d) parkNoUsableContact — url-only drafted/approved → policy_hold
{
  // hasUsableOutreachContact: url-only / noise fail; real email|handle pass
  assert(
    hasUsableOutreachContact({ url: 'https://www.workatastartup.com/jobs/1' }) === false,
    'hasUsableOutreachContact: url-only false',
  );
  assert(
    hasUsableOutreachContact({ email: 'noreply@linkedin.com', url: 'https://x.com' }) === false,
    'hasUsableOutreachContact: platform noise false',
  );
  assert(
    hasUsableOutreachContact({ email: 'hire@acme.test' }) === true,
    'hasUsableOutreachContact: real email true',
  );
  assert(
    hasUsableOutreachContact({ handle: '@realperson1' }) === true,
    'hasUsableOutreachContact: handle true',
  );

  const doc = {
    partners: [
      {
        id: 'url-only',
        state: 'drafted',
        url: 'https://www.workatastartup.com/jobs/1',
        company: 'Acme',
      },
      { id: 'has-email', state: 'drafted', email: 'hire@acme.test', company: 'Acme' },
      { id: 'has-handle', state: 'approved', handle: 'realperson1', company: 'Beta' },
    ],
    talent: [],
  };
  const nc = countNoContact(doc);
  assert(nc.noContact === 1 && nc.ids.includes('url-only'), 'countNoContact finds url-only');
  const r = parkNoUsableContact(doc, { actor: 'agent' });
  assert(r.parked.length === 1 && r.parked[0].id === 'url-only', 'parkNoUsableContact parks url-only');
  assert(doc.partners[0].state === 'policy_hold', 'url-only → policy_hold');
  assert(doc.partners[0].policyHoldReason === 'no-usable-contact', 'reason no-usable-contact');
  assert(doc.partners[1].state === 'drafted', 'email kept drafted');
  assert(doc.partners[2].state === 'approved', 'handle kept approved');
  const r2 = parkNoUsableContact(doc, { actor: 'agent' });
  assert(r2.parked.length === 0, 'parkNoUsableContact idempotent');

  // releaseContactableHolds: contact appears → drafted again
  doc.partners[0].email = 'found@acme.test';
  const rel = releaseContactableHolds(doc, { actor: 'agent' });
  assert(rel.released.length === 1 && rel.released[0].id === 'url-only', 'release hold with email');
  assert(doc.partners[0].state === 'drafted', 'hold → drafted after contact');
  assert(!doc.partners[0].policyHoldReason, 'policyHoldReason cleared');
  const still = {
    partners: [
      {
        id: 'still-url',
        state: 'policy_hold',
        policyHoldReason: 'no-usable-contact',
        url: 'https://example.com/job',
      },
    ],
    talent: [],
  };
  const rel2 = releaseContactableHolds(still, { actor: 'agent' });
  assert(rel2.released.length === 0, 'release skips still-no-contact');
  assert(still.partners[0].state === 'policy_hold', 'no-contact stays hold');
}

// 14e) planSendReady — approved + contact only; never invents send
{
  const doc = {
    partners: [
      { id: 'ap-ok', state: 'approved', email: 'hire@co.test', company: 'Co' },
      { id: 'ap-url', state: 'approved', url: 'https://jobs.example.com/1' },
      { id: 'dr', state: 'drafted', email: 'a@b.test' },
    ],
    talent: [{ id: 'ap-h', state: 'approved', handle: 'realperson99', name: 'Pat' }],
  };
  const plan = planSendReady(doc, { draftsDir: null });
  assert(plan.ready.length === 2, 'send plan ready = email + handle approved');
  assert(plan.ready.some((r) => r.id === 'ap-ok' && r.sendLane === 'email'), 'email lane');
  assert(plan.ready.some((r) => r.id === 'ap-h' && r.sendLane === 'x-or-li-human'), 'handle lane');
  assert(plan.ready[0].channel === 'email', 'send plan: email channel sorted first');
  assert(plan.ready.some((r) => r.id === 'ap-h' && r.displayWho === 'Pat'), 'send plan: displayWho from name');
  assert(plan.blocked.some((b) => b.id === 'ap-url'), 'url-only approved blocked from send');
  assert(!plan.ready.some((r) => r.id === 'dr'), 'drafted not on send board');
  const emptyDrafts = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-missing-send-drafts-'));
  const missingDraft = planSendReady(doc, { draftsDir: emptyDrafts });
  assert(
    missingDraft.ready.length === 0 &&
      missingDraft.blocked.some((b) => b.id === 'ap-ok' && /draft file missing/i.test(b.reason || '')),
    'send plan: missing draft file blocked',
  );
  fs.rmSync(emptyDrafts, { recursive: true });
  const md = formatSendBatchPackage(plan, { note: 'selftest' });
  assert(/NEVER auto-send/i.test(md), 'send package header honesty');
  assert(/receipt --id=ap-ok/i.test(md), 'send package receipt cmd');
  assert(/### Email \(commercial path/i.test(md), 'send package: email subsection');
  assert(/### Handle \(X\/LI/i.test(md), 'send package: handle subsection');
  assert(/Prefer email commercial path/i.test(md), 'send package: prefer email rule');
  assert(/\bPat\b/.test(md), 'send package: displayWho in markdown');
}

// 15) batch approval: human-only (Trust Ladder L1); agent actors fail closed
{
  const doc = {
    partners: [{ id: 'draft-1', state: 'drafted', email: 'one@startup.test' }],
    talent: [{ id: 'source-1', state: 'sourced', email: 'two@startup.test' }],
  };
  const missing = approveDrafted(doc, {});
  assert(missing.approved.length === 0 && doc.partners[0].state === 'drafted', 'batch approve requires note');
  const agent = approveDrafted(doc, { note: 'agent try', actor: 'selftest' });
  assert(
    agent.approved.length === 0 &&
      agent.errors.length === 1 &&
      /actor=human|Trust Ladder/i.test(agent.errors[0].error || '') &&
      doc.partners[0].state === 'drafted',
    'batch refuse non-human actor (Trust Ladder L1)',
  );
  const result = approveDrafted(doc, { note: 'reviewed copy', actor: 'human' });
  assert(result.approved.length === 1 && doc.partners[0].state === 'approved', 'batch approves drafted only');
  assert(doc.talent[0].state === 'sourced', 'batch leaves non-drafted unchanged');
  assert(doc.partners[0].stateHistory.at(-1).note === 'reviewed copy', 'batch records approval note');
  assert(doc.partners[0].stateHistory.at(-1).actor === 'human', 'batch records human actor');
  // direct canTransition positive/negative
  assert(
    canTransition('drafted', 'approved', { evidenceText: 'ok', actor: 'human' }).ok === true,
    'canTransition human → approved ok',
  );
  assert(
    canTransition('drafted', 'approved', { evidenceText: 'ok', actor: 'grok-busy-loop' }).ok === false,
    'canTransition agent → approved refused',
  );
  assert(
    canTransition('approved', 'disqualified', { evidenceText: 'junk-aggregator-or-fragment' }).ok === true,
    'approved → disqualified allowed (junk post-approve)',
  );
  assert(
    canTransition('drafted', 'disqualified', { evidenceText: 'junk' }).ok === true,
    'drafted → disqualified allowed',
  );
}

// 15b) batch-approve helper: pure plan, url-only blocked, --id filter, handle ok
{
  const doc = {
    partners: [
      {
        id: 'url-only',
        state: 'drafted',
        url: 'https://jobs.ashbyhq.com/acme/founding-eng',
        company: 'UrlOnly Co',
      },
      { id: 'with-email', state: 'drafted', email: 'hire@acme.test', company: 'Acme' },
      {
        id: 'with-handle',
        state: 'drafted',
        handle: '@founder',
        url: 'https://x.com/founder/status/1',
      },
      {
        id: 'junk-agg',
        state: 'drafted',
        url: 'https://www.indeed.com/q-engineer-jobs.html',
        company: 'Indeed noise',
      },
    ],
    talent: [{ id: 'draft-tal', state: 'drafted', email: 'eng@bay.test' }],
  };
  const planAll = planApproveDrafted(doc, { note: 'reviewed', actor: 'human' });
  assert(planAll.ready.some((r) => r.id === 'with-email'), 'plan: email drafted ready');
  assert(planAll.ready.some((r) => r.id === 'with-handle' && r.channel === 'handle'), 'plan: handle drafted ready');
  assert(planAll.ready.some((r) => r.id === 'draft-tal'), 'plan: talent with email ready');
  // Email commercial path listed before X/LI handle-only for human batch review
  const firstHandleIdx = planAll.ready.findIndex((r) => r.channel === 'handle');
  const lastEmailIdx = planAll.ready.map((r) => r.channel).lastIndexOf('email');
  assert(
    firstHandleIdx === -1 || lastEmailIdx === -1 || lastEmailIdx < firstHandleIdx,
    'plan: email channel sorted before handle',
  );
  assert(
    planAll.blocked.some((b) => b.id === 'url-only' && /no email\/handle|url-only/i.test(b.reason || '')),
    'plan: url-only blocked (not batch-approvable)',
  );
  assert(
    planAll.blocked.some((b) => b.id === 'junk-agg' && /junk/i.test(b.reason || '')),
    'plan: junk aggregator blocked',
  );
  assert(planAll.ready.every((r) => r.id !== 'url-only'), 'plan: url-only not in ready');
  // vacuous: empty note → zero ready (not silent green)
  const planNoNote = planApproveDrafted(doc, { actor: 'human' });
  assert(planNoNote.ready.length === 0 && planNoNote.noteOk === false, 'plan: missing note → zero ready');
  // --id filter
  const planId = planApproveDrafted(doc, { note: 'only one', actor: 'human', ids: ['with-email'] });
  assert(planId.ready.length === 1 && planId.ready[0].id === 'with-email', 'plan: --id filters ready');
  assert(!planId.ready.some((r) => r.id === 'with-handle'), 'plan: --id excludes others');
  // apply respects plan: url-only stays drafted
  const applyDoc = {
    partners: [
      { id: 'url-only', state: 'drafted', url: 'https://jobs.example.com/1' },
      { id: 'ok', state: 'drafted', email: 'ok@co.test' },
    ],
    talent: [],
  };
  const applied = approveDrafted(applyDoc, { note: 'batch', actor: 'human', ids: ['url-only', 'ok'] });
  assert(applied.approved.length === 1 && applied.approved[0].id === 'ok', 'apply: only contactable approved');
  assert(applyDoc.partners[0].state === 'drafted', 'apply: url-only remains drafted');
  assert(applyDoc.partners[1].state === 'approved', 'apply: contactable advanced');
  // draft file gate when draftsDir set
  const tmpDrafts = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-approve-drafts-'));
  fs.writeFileSync(
    path.join(tmpDrafts, 'ok.txt'),
    `# source: https://co.dev/jobs\n# verified: ${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())}\nTo: ok@co.dev\nSubject: eng hiring at Acme\n\nSaw your Founding Engineer post.\n\nMore body.\n`,
  );
  const withFile = planApproveDrafted(
    {
      partners: [
        { id: 'ok', state: 'drafted', email: 'ok@co.dev', url: 'https://co.dev/jobs' },
        { id: 'missing-file', state: 'drafted', email: 'm@co.dev' },
      ],
      talent: [],
    },
    { note: 'x', actor: 'human', draftsDir: tmpDrafts },
  );
  assert(withFile.ready.some((r) => r.id === 'ok'), 'plan: draft file present → ready');
  assert(
    withFile.blocked.some((b) => b.id === 'missing-file' && /draft file missing/i.test(b.reason || '')),
    'plan: missing draft file blocked',
  );
  // Human console helper: ready rows carry draftPath + sendLane + company + subject/preview
  const okReady = withFile.ready.find((r) => r.id === 'ok');
  assert(
    okReady &&
      okReady.draftPath === path.join(tmpDrafts, 'ok.txt') &&
      okReady.sendLane === 'email' &&
      okReady.channel === 'email',
    'plan: ready includes draftPath + email sendLane',
  );
  assert(
    okReady &&
      okReady.subject === 'eng hiring at Acme' &&
      /Saw your Founding Engineer/.test(okReady.preview || ''),
    'plan: ready includes subject + preview from draft body',
  );
  // blocked rows carry reasonClass; plan carries blockedSummary histogram
  assert(
    withFile.blocked.some(
      (b) => b.id === 'missing-file' && b.reasonClass === 'draft_missing',
    ),
    'plan: blocked carries reasonClass',
  );
  assert(
    withFile.blockedSummary && withFile.blockedSummary.draft_missing === 1,
    'plan: blockedSummary histogram',
  );
  // ATS apply-only (no email/handle) → distinct reason class for human console
  // Use non-aggregator hosts so junk filter does not shadow no_contact / ats_apply_only
  const atsPlan = planApproveDrafted(
    {
      partners: [
        {
          id: 'ats-only',
          state: 'drafted',
          company: 'Acme',
          title: 'Founding Engineer',
          url: 'https://careers.acme-startup.example/jobs/1',
          applyUrl: 'https://jobs.ashbyhq.com/acme/role-1',
        },
        {
          id: 'url-bare',
          state: 'drafted',
          company: 'BetaCo',
          title: 'Backend Engineer',
          url: 'https://careers.betaco.example/jobs/2',
        },
      ],
      talent: [],
    },
    { note: 'reviewed', actor: 'human' },
  );
  assert(
    atsPlan.blocked.some(
      (b) =>
        b.id === 'ats-only' &&
        b.reasonClass === 'ats_apply_only' &&
        /ashbyhq/.test(b.applyUrl || '') &&
        /ATS apply only/i.test(b.reason || ''),
    ),
    'plan: ATS apply-only blocked with applyUrl + class',
  );
  assert(
    atsPlan.blocked.some(
      (b) => b.id === 'url-bare' && b.reasonClass === 'no_contact',
    ),
    'plan: bare url-only stays no_contact class',
  );
  assert(atsPlan.blockedSummary.ats_apply_only === 1, 'plan: ats_apply_only in summary');
  assert(atsPlan.blockedSummary.no_contact === 1, 'plan: no_contact in summary');
  // Pure helpers: classify + summarize + draftSubjectPreview
  assert(
    classifyApproveBlockReason('no email/handle — enrich first (url-only not batch-approvable)') ===
      'no_contact',
    'classify: no_contact',
  );
  assert(
    classifyApproveBlockReason('ATS apply only — open posting; not batch-approvable') ===
      'ats_apply_only',
    'classify: ats_apply_only',
  );
  assert(
    Object.keys(summarizeBlockedReasons([])).length === 0,
    'summarize: empty blocked → empty object (vacuous)',
  );
  const sp = draftSubjectPreview('To: a@b.co\nSubject: hello there\n\nFirst body line.\n');
  assert(sp.subject === 'hello there' && /First body/.test(sp.preview || ''), 'draftSubjectPreview');
  assert(
    draftSubjectPreview('').subject == null && draftSubjectPreview('').preview == null,
    'draftSubjectPreview: empty body → nulls',
  );
  // Pure package: empty ready is explicit (vacuous-green), ready lists draft path
  const emptyPkg = formatApproveBatchPackage(
    { ready: [], blocked: [{ id: 'x', reason: 'no email/handle — enrich first' }] },
    { note: 'test' },
  );
  assert(/none ready/i.test(emptyPkg), 'package: empty ready is explicit, not silent green');
  assert(/no email\/handle|enrich first/.test(emptyPkg), 'package: blocked reasons listed');
  assert(/Blocked summary/i.test(emptyPkg) && /no_contact:\s*1/.test(emptyPkg), 'package: blocked summary histogram');
  assert(parsePackageReadyCount(emptyPkg) === 0, 'parsePackageReadyCount: empty ready=0');
  assert(
    parsePackageReadyCount('at: x\nready: 3\nblocked: 0\n') === 3,
    'parsePackageReadyCount: ready=3',
  );
  assert(parsePackageReadyCount('no ready line') == null, 'parsePackageReadyCount: missing → null');
  const honOk = packageBoardHonesty({
    approveReady: 3,
    sendReady: 2,
    approveMd: 'ready: 3\n',
    sendMd: 'ready: 2\n',
  });
  assert(honOk.ok === true && honOk.drift === false, 'packageBoardHonesty: in sync');
  const honDrift = packageBoardHonesty({
    approveReady: 3,
    sendReady: 2,
    approveMd: 'ready: 0\n',
    sendMd: 'ready: 2\n',
  });
  assert(
    honDrift.drift === true && honDrift.approveDrift === true && honDrift.sendDrift === false,
    'packageBoardHonesty: detect approve drift',
  );
  const honMissing = packageBoardHonesty({ approveReady: 0, sendReady: 0 });
  assert(
    honMissing.ok === false && honMissing.approveDrift === true && honMissing.sendDrift === true,
    'packageBoardHonesty: missing package evidence fails closed',
  );
  const dueEmpty = formatHoldsEnrichDuePackage([]);
  assert(/due:\s*0/.test(dueEmpty) && /none/i.test(dueEmpty), 'holds-enrich-due: empty explicit');
  const dueCool = formatHoldsEnrichDuePackage([], {
    cooling: 17,
    coolingIds: ['waas-cool-1', 'waas-cool-2'],
    coolingMinRemainingSec: 72000,
    exhausted: 0,
  });
  assert(/cooling:\s*17/.test(dueCool), 'holds-enrich-due: cooling count');
  assert(/cooling_min_remaining_sec:\s*72000/.test(dueCool), 'holds-enrich-due: min remaining header');
  assert(/waas-cool-1/.test(dueCool) && /24h cooldown/i.test(dueCool), 'holds-enrich-due: cooling ids section');
  assert(/earliest free in ~20h/.test(dueCool), 'holds-enrich-due: earliest free hours');
  const dueFull = formatHoldsEnrichDuePackage([
    {
      id: 'waas-1',
      side: 'partner',
      company: 'Acme',
      score: 100,
      url: 'https://www.workatastartup.com/jobs/1',
      applyUrl: 'https://jobs.ashbyhq.com/acme/x',
      source: 'firecrawl:workatastartup',
    },
  ]);
  assert(/waas-1/.test(dueFull) && /ashbyhq/.test(dueFull), 'holds-enrich-due: lists id + applyUrl');
  assert(/--enrich/.test(dueFull), 'holds-enrich-due: enrich command');
  const emailFirst = formatEmailFirstApprovePackage({
    ready: [
      { id: 'e1', channel: 'email', side: 'talent', to: 'a@co.test', displayWho: 'Ann', subject: 'S', preview: 'Hi' },
      { id: 'h1', channel: 'handle', side: 'partner', to: '@x', displayWho: 'X' },
    ],
  });
  assert(/email_ready:\s*1/.test(emailFirst) && /e1/.test(emailFirst) && !/h1/.test(emailFirst), 'email-first package: only email channel');
  assert(/--actor=human/.test(emailFirst) && /approve-drafted/.test(emailFirst), 'email-first package: human approve cmd');
  const emailNone = formatEmailFirstApprovePackage({ ready: [{ id: 'h1', channel: 'handle', to: '@x' }] });
  assert(/email_ready:\s*0/.test(emailNone) && /none/i.test(emailNone), 'email-first package: empty when no email');
  const sendFirst = formatEmailFirstSendPackage({
    ready: [
      { id: 's1', channel: 'email', side: 'talent', to: 'b@co.test', displayWho: 'Bob', draftPath: '/tmp/s1.txt' },
      { id: 's2', channel: 'handle', to: '@y' },
    ],
  });
  assert(/email_send_ready:\s*1/.test(sendFirst) && /s1/.test(sendFirst) && !/s2/.test(sendFirst), 'send-email-first: only email');
  assert(/receipt/.test(sendFirst) && /message-id/.test(sendFirst), 'send-email-first: receipt cmd');
  const sendNone = formatEmailFirstSendPackage({ ready: [] });
  assert(/email_send_ready:\s*0/.test(sendNone) && /approve-email-first/.test(sendNone), 'send-email-first: empty points upstream');
  const l1 = buildL1Snapshot({
    at: '2026-07-17T00:00:00Z',
    total: 10,
    byState: { drafted: 2 },
    metrics: {
      approve_ready: 1,
      approve_ready_email: 1,
      approve_ready_email_ids: ['e1'],
      approve_ready_email_tos: ['a@co.test'],
      send_ready: 0,
      send_ready_email: 0,
      holds_cooling: 3,
      holds_scrape_due: 0,
      autoSend: true, // must not leak into snapshot
    },
  });
  assert(l1.schema === 'demigod.funnel-l1/1' && l1.autoSend === false && l1.autoDm === false, 'l1 snapshot: hard false auto flags');
  assert(l1.approve_ready_email_ids.join() === 'e1' && /a@co.test/.test(l1.approve_ready_email_tos.join()), 'l1 snapshot: email ids/tos');
  assert(/--actor=human/.test(l1.human.approve || '') && /e1/.test(l1.human.approve || ''), 'l1 snapshot: human approve cmd');
  assert(l1.trustLadder === 'L1-human-approve-send-only', 'l1 snapshot: trust ladder label');
  const l1b = buildL1Snapshot({
    metrics: {
      events_api_base: 'https://x.example/api/events-bot',
      events_api_age_sec: 12,
      events_api_config_published: 1,
      invite_drain_needs_url: 0,
    },
  });
  assert(
    l1b.events_api_base && l1b.events_api_config_published === 1 && !('events_api_published' in l1b),
    'l1 snapshot: events_api config publication is not mislabeled as reachability',
  );
  assert(/events-online/.test(l1b.human.eventsHeal || ''), 'l1 snapshot: eventsHeal hint');




  const fullPkg = formatApproveBatchPackage(
    {
      ready: [
        {
          id: 'ok',
          side: 'partner',
          channel: 'email',
          to: 'ok@co.test',
          company: 'Acme',
          draftPath: path.join(tmpDrafts, 'ok.txt'),
          sendLane: 'email',
          subject: 'eng hiring at Acme',
          preview: 'Saw your Founding Engineer post.',
        },
      ],
      blocked: [
        {
          id: 'ats-only',
          reason: 'ATS apply only — open posting; not batch-approvable',
          reasonClass: 'ats_apply_only',
          applyUrl: 'https://jobs.ashbyhq.com/acme/1',
        },
      ],
      blockedSummary: { ats_apply_only: 1 },
    },
    { note: 'reviewed', draftsDir: tmpDrafts },
  );
  assert(/ok@co\.test/.test(fullPkg) && /ok\.txt/.test(fullPkg), 'package: ready contact + draft path');
  assert(/subject:\s*eng hiring at Acme/.test(fullPkg), 'package: ready subject line');
  assert(/Saw your Founding Engineer/.test(fullPkg), 'package: ready preview line');
  assert(/### Email \(commercial path/i.test(fullPkg), 'package: email subsection header');
  assert(/reviewed email batch/i.test(fullPkg), 'package: email-first approve command');
  assert(/ats_apply_only:\s*1/.test(fullPkg), 'package: summary includes ats_apply_only');
  assert(/ashbyhq/.test(fullPkg), 'package: blocked applyUrl listed');
  assert(/approve-drafted --note=/.test(fullPkg), 'package: includes apply command');
  try {
    fs.rmSync(tmpDrafts, { recursive: true, force: true });
  } catch {
    /* */
  }
  // noise contact gate (self email / org handle) — batch-approve must not ready them
  // own-site URL is separate (junk aggregator); self-email uses a third-party URL
  const noiseDoc = {
    partners: [
      {
        id: 'self-email',
        state: 'drafted',
        contactEmail: 'potter@trydemigod.com',
        url: 'https://jobs.ashbyhq.com/acme/1',
      },
      {
        id: 'own-site',
        state: 'drafted',
        contactEmail: 'potter@trydemigod.com',
        url: 'https://www.trydemigod.com/?p=events',
      },
      { id: 'org-handle', state: 'drafted', handle: '@ycombinator', company: 'YC event' },
      { id: 'jobboard', state: 'drafted', handle: '@SFSoftwareJobs' },
      { id: 'real-person', state: 'drafted', handle: '@theconsensusdev', company: 'TensorLake' },
    ],
    talent: [],
  };
  const noisePlan = planApproveDrafted(noiseDoc, { note: 'reviewed', actor: 'human' });
  assert(
    noisePlan.blocked.some((b) => b.id === 'self-email' && /noise contact/i.test(b.reason || '')),
    'plan: self @trydemigod.com blocked',
  );
  assert(
    noisePlan.blocked.some((b) => b.id === 'own-site' && /junk/i.test(b.reason || '')),
    'plan: own-site url blocked as junk',
  );
  assert(
    noisePlan.blocked.some((b) => b.id === 'org-handle' && /noise contact/i.test(b.reason || '')),
    'plan: @ycombinator blocked',
  );
  assert(
    noisePlan.blocked.some((b) => b.id === 'jobboard' && /noise contact/i.test(b.reason || '')),
    'plan: job-board handle blocked',
  );
  assert(
    noisePlan.ready.some((r) => r.id === 'real-person' && r.channel === 'handle'),
    'plan: person handle still ready',
  );
  assert(noisePlan.ready.every((r) => r.id === 'real-person'), 'plan: only real-person in ready');
  // sample + identity_suppressed fail-closed (followup / match-bridge parity)
  const suppressDoc = {
    partners: [
      {
        id: 'sample-draft',
        state: 'drafted',
        email: 'seed@sample.test',
        sample: true,
      },
      {
        id: 'twin-clean',
        state: 'drafted',
        email: 'same@co.test',
        company: 'Clean Co',
      },
      {
        id: 'twin-opted',
        state: 'opted_out',
        email: 'same@co.test',
        company: 'Opted Co',
      },
      {
        id: 'solo-ok',
        state: 'drafted',
        email: 'solo@co.test',
        company: 'Solo Co',
      },
    ],
    talent: [{ id: 'selftest-t', state: 'drafted', email: 't@self.test', selftest: true }],
  };
  const suppressPlan = planApproveDrafted(suppressDoc, { note: 'reviewed', actor: 'human' });
  assert(
    suppressPlan.blocked.some((b) => b.id === 'sample-draft' && /sample/i.test(b.reason || '')),
    'plan: sample drafted blocked',
  );
  assert(
    suppressPlan.blocked.some((b) => b.id === 'selftest-t' && /sample/i.test(b.reason || '')),
    'plan: selftest drafted blocked',
  );
  assert(
    suppressPlan.blocked.some(
      (b) => b.id === 'twin-clean' && /identity_suppressed/i.test(b.reason || ''),
    ),
    'plan: identity_suppressed twin blocked (opted_out shares email)',
  );
  assert(
    suppressPlan.ready.some((r) => r.id === 'solo-ok'),
    'plan: clean solo drafted still ready (positive control)',
  );
  assert(
    suppressPlan.ready.every((r) => r.id === 'solo-ok'),
    'plan: only solo-ok ready under suppress/sample fixtures',
  );
  // apply also refuses sample / identity_suppressed
  const suppressApply = approveDrafted(suppressDoc, { note: 'batch', actor: 'human' });
  assert(
    suppressApply.approved.length === 1 && suppressApply.approved[0].id === 'solo-ok',
    'apply: only solo-ok approved',
  );
  assert(suppressDoc.partners.find((p) => p.id === 'sample-draft').state === 'drafted', 'apply: sample stays drafted');
  assert(suppressDoc.partners.find((p) => p.id === 'twin-clean').state === 'drafted', 'apply: suppressed twin stays drafted');
  // package pins ready ids into --id= so human apply is scoped (not full-queue blast)
  const scopedPkg = formatApproveBatchPackage(
    {
      ready: [
        {
          id: 'solo-ok',
          side: 'partner',
          channel: 'email',
          to: 'solo@co.test',
          company: 'Solo Co',
          sendLane: 'email',
        },
      ],
      blocked: [{ id: 'sample-draft', reason: 'sample_or_test' }],
    },
    { note: 'reviewed' },
  );
  assert(
    /--id=solo-ok/.test(scopedPkg),
    'package: apply command includes --id= of ready leads only',
  );
}

// 16) lead IDs distinguish URLs that share a long prefix
assert(
  leadId('fc-t', 'https://www.example.com/jobs/one') !==
    leadId('fc-t', 'https://www.example.com/jobs/two'),
  'lead IDs hash the full source URL',
);

// 17) form_filled partner leads → matcher role pool (read-only; no board write)
{
  const boardRoles = [
    {
      id: 'role-board',
      title: 'Head of Growth',
      company: 'Acme',
      status: 'Active',
      skills: 'Growth',
      outcome90d: 'Build a repeatable pipeline',
      comp: '$180k-$220k',
      stageType: 'Seed',
    },
  ];
  const formFilled = {
    id: 'p-ff',
    state: 'form_filled',
    title: 'Founding Eng',
    company: 'Gauge',
  };
  const drafted = {
    id: 'p-dr',
    state: 'drafted',
    title: 'Founding Eng',
    company: 'OtherCo',
  };
  const pool = funnelRolesFromPartners([formFilled, drafted], boardRoles);
  assert(
    pool.some((r) => r.id === 'funnel:p-ff' && r.source === 'funnel' && r.status === 'Active'),
    'form_filled partner appears in matcher pool with source=funnel',
  );
  assert(!pool.some((r) => r.id === 'funnel:p-dr'), 'drafted partner NOT in matcher pool');
  const dup = funnelRolesFromPartners(
    [{ id: 'p-dup', state: 'form_filled', title: 'Head of Growth', company: 'Acme' }],
    boardRoles,
  );
  assert(dup.length === 0, 'dedupes funnel role when company+title already on board');
  const empty = getStartupRoles({ roles: boardRoles }, { partners: [] });
  assert(
    empty.some((r) => r.id === 'role-board') && empty.every((r) => r.source !== 'funnel'),
    'empty leads file → no funnel roles added',
  );
  const boardPath = path.join(__dirname, 'DEMIGOD-BOARD.json');
  const before = createHash('sha256').update(fs.readFileSync(boardPath)).digest('hex');
  getStartupRoles(JSON.parse(fs.readFileSync(boardPath, 'utf8')));
  const after = createHash('sha256').update(fs.readFileSync(boardPath)).digest('hex');
  assert(before === after, 'getStartupRoles does not write board.json');
}

// 18) followup plan: max 2 nudges, age gate, pure (no side effects)
{
  const now = Date.parse('2026-07-17T12:00:00.000Z');
  const old = new Date(now - 6 * 86400000).toISOString();
  const young = new Date(now - 2 * 86400000).toISOString();
  const doc = {
    partners: [
      {
        id: 'sent-old',
        state: 'sent',
        stateUpdatedAt: old,
        company: 'OldCo',
        email: 'founder@oldco.test',
      },
      {
        id: 'sent-young',
        state: 'sent',
        stateUpdatedAt: young,
        company: 'YoungCo',
        email: 'hire@youngco.test',
      },
      {
        id: 'maxed',
        state: 'nudged',
        stateUpdatedAt: old,
        company: 'MaxCo',
        email: 'max@maxco.test',
        stateHistory: [
          { to: 'nudged', at: '2026-07-01' },
          { to: 'nudged', at: '2026-07-10' },
        ],
      },
      { id: 'draft-only', state: 'drafted', stateUpdatedAt: old, email: 'd@x.test' },
    ],
    talent: [],
  };
  assert(nudgeCount(doc.partners[2]) === 2, 'nudgeCount reads stateHistory');
  assert(MAX_NUDGES === 2, 'MAX_NUDGES is 2');
  for (const days of [-1, 0]) {
    let badDaysRejected = false;
    try { planFollowups(doc, { days, now }); } catch { badDaysRejected = true; }
    assert(badDaysRejected, `followup rejects age gate ${days}`);
  }
  const plan = planFollowups(doc, { days: 5, now });
  assert(
    plan.draftable.some((d) => d.id === 'sent-old' && d.nextNudge === 1 && !d.final),
    'sent past age is draftable first nudge',
  );
  const oldRow = plan.draftable.find((d) => d.id === 'sent-old');
  assert(
    oldRow && oldRow.channel === 'email' && oldRow.to === 'founder@oldco.test',
    'followup draftable includes channel + to (human console)',
  );
  assert(!plan.draftable.some((d) => d.id === 'sent-young'), 'sent under age gate skipped');
  assert(
    plan.coldEligible.some((c) => c.id === 'maxed' && c.nudges >= MAX_NUDGES),
    'max nudges → coldEligible not draftable',
  );
  assert(!plan.draftable.some((d) => d.id === 'maxed'), 'maxed not draftable');
  assert(!plan.draftable.some((d) => d.id === 'draft-only'), 'non-sent not draftable');
  // second nudge needs ~14d
  const oneNudge = {
    partners: [
      {
        id: 'n1',
        state: 'nudged',
        stateUpdatedAt: new Date(now - 10 * 86400000).toISOString(),
        email: 'n1@co.test',
        stateHistory: [{ to: 'nudged' }],
      },
    ],
    talent: [],
  };
  const p10 = planFollowups(oneNudge, { days: 5, now });
  assert(!p10.draftable.some((d) => d.id === 'n1'), 'second nudge waits ~14d');
  const p15 = planFollowups(
    {
      partners: [
        {
          id: 'n1',
          state: 'nudged',
          stateUpdatedAt: new Date(now - 15 * 86400000).toISOString(),
          email: 'n1@co.test',
          stateHistory: [{ to: 'nudged' }],
        },
      ],
      talent: [],
    },
    { days: 5, now },
  );
  assert(
    p15.draftable.some((d) => d.id === 'n1' && d.final === true && d.nextNudge === 2),
    'second nudge after 14d is final',
  );
  // Fail-closed: url-only / noise / sample / identity_suppressed never draftable
  const failClosed = {
    partners: [
      {
        id: 'url-only-sent',
        state: 'sent',
        stateUpdatedAt: old,
        url: 'https://jobs.ashbyhq.com/acme/1',
        company: 'UrlOnly',
      },
      {
        id: 'noise-sent',
        state: 'sent',
        stateUpdatedAt: old,
        contactEmail: 'potter@trydemigod.com',
        company: 'Self',
      },
      {
        id: 'sample-sent',
        state: 'sent',
        stateUpdatedAt: old,
        email: 'sample@co.test',
        sample: true,
      },
      {
        id: 'twin-sent',
        state: 'sent',
        stateUpdatedAt: old,
        email: 'shared@co.test',
      },
      {
        id: 'twin-opted',
        state: 'opted_out',
        email: 'shared@co.test',
      },
      {
        id: 'handle-ok',
        state: 'sent',
        stateUpdatedAt: old,
        handle: '@realperson',
        company: 'HandleCo',
      },
    ],
    talent: [],
  };
  const fc = planFollowups(failClosed, { days: 5, now });
  assert(
    !fc.draftable.some((d) => d.id === 'url-only-sent') &&
      fc.skipped.some((s) => s.id === 'url-only-sent' && /no email\/handle|url-only/i.test(s.reason || '')),
    'followup: url-only sent blocked (not draftable)',
  );
  assert(
    !fc.draftable.some((d) => d.id === 'noise-sent') &&
      fc.skipped.some((s) => s.id === 'noise-sent' && /noise contact/i.test(s.reason || '')),
    'followup: self @trydemigod.com noise blocked',
  );
  assert(
    !fc.draftable.some((d) => d.id === 'sample-sent') &&
      fc.skipped.some((s) => s.id === 'sample-sent' && /sample/i.test(s.reason || '')),
    'followup: sample lead blocked',
  );
  assert(
    !fc.draftable.some((d) => d.id === 'twin-sent') &&
      fc.skipped.some((s) => s.id === 'twin-sent' && /identity_suppressed/i.test(s.reason || '')),
    'followup: identity_suppressed twin blocked',
  );
  assert(
    fc.draftable.some((d) => d.id === 'handle-ok' && d.channel === 'handle' && d.to === '@realperson'),
    'followup: usable handle still draftable',
  );
  // vacuous: empty doc → zero draftable (not silent green)
  assert(planFollowups({ partners: [], talent: [] }, { days: 5, now }).draftable.length === 0, 'followup vacuous: zero draftable');
}

// 18b) followup receipt: sent→nudged · second record-only · max fail-closed
{
  assert(RECEIPT_TARGETS.sent === 'nudged', 'RECEIPT_TARGETS maps sent → nudged');
  assert(RECEIPT_TARGETS.approved === 'sent', 'RECEIPT_TARGETS still maps approved → sent');
  assert(RECEIPT_TARGETS.mutual_yes === 'intro_made', 'RECEIPT_TARGETS still maps mutual_yes → intro_made');

  // empty evidence for nudged fails (honesty rail)
  assert(
    canTransition('sent', 'nudged', {}).ok === false,
    'sent → nudged without receipt FAILS',
  );
  assert(
    canTransition('sent', 'nudged', {
      evidenceText: 'SENT-CONFIRMED\nMessage-ID: <nudge-1@test>',
      actor: 'human',
    }).ok === true,
    'sent → nudged with valid receipt PASSES',
  );
  assert(
    canTransition('sent', 'nudged', {
      evidenceText: 'SENT-CONFIRMED\nnote: operator says sent',
    }).ok === false,
    'sent → nudged with note-only receipt FAILS',
  );
  assert(
    canTransition('mutual_yes', 'intro_made', {
      evidenceText: 'SENT-CONFIRMED\nnote: operator says sent',
    }).ok === false,
    'mutual_yes → intro_made with note-only receipt FAILS',
  );
  assert(
    canTransition('sent', 'nudged', {
      evidenceText: 'DRAFT-ONLY followup body',
      actor: 'human',
    }).ok === false,
    'sent → nudged with draft-looking receipt FAILS',
  );

  // planReceipt: first nudge
  const first = planReceipt('sent', { messageId: '<nudge-1@test>' });
  assert(first.ok === true && first.to === 'nudged' && !first.recordOnly, 'planReceipt sent → nudged');
  assert(/SENT-CONFIRMED/i.test(first.evidenceText || ''), 'planReceipt first includes SENT-CONFIRMED');

  // planReceipt: second nudge record-only (state stays nudged)
  const second = planReceipt('nudged', { messageId: '<nudge-2@test>', nudgeCount: 1 });
  assert(
    second.ok === true && second.recordOnly === true && second.to === 'nudged',
    'planReceipt second nudge is recordOnly',
  );
  assert(
    planReceipt('nudged', { messageId: '<nudge-3@test>', nudgeCount: MAX_NUDGES }).ok === false,
    'planReceipt max nudges refuse (fail-closed)',
  );
  assert(
    planReceipt('nudged', { note: 'operator says sent', nudgeCount: 1 }).ok === false,
    'planReceipt note-only nudge record refuses',
  );
  assert(
    !hasValidSendReceipt({ stateHistory: [{ to: 'sent', evidenceText: 'SENT-CONFIRMED\nnote: operator says sent' }] }),
    'receipt-backed sent refuses note-only evidence',
  );
  assert(
    planReceipt('nudged', { toState: 'sent', messageId: '<x@y>' }).ok === false,
    'planReceipt nudged cannot target sent',
  );
  assert(
    planReceipt('sent', { toState: 'sent', messageId: '<x@y>' }).ok === false,
    'planReceipt sent only → nudged not sent',
  );
  // vacuous: no mid/note
  assert(planReceipt('sent', {}).ok === false, 'planReceipt sent without mid/note refuses');
  assert(planReceipt('nudged', { nudgeCount: 0 }).ok === false, 'planReceipt nudged without mid/note refuses');
  // wrong from still refused
  assert(planReceipt('drafted', { messageId: '<x@y>' }).ok === false, 'planReceipt drafted refused');
  assert(planReceipt('replied', { messageId: '<x@y>' }).ok === false, 'planReceipt replied refused');
  assert(receiptDestinationMatches({ email: 'A@Example.com' }, 'email', 'a@example.com'), 'receipt destination: email match');
  assert(!receiptDestinationMatches({ email: 'a@example.com' }, 'email', ''), 'receipt destination: missing refused');
  assert(!receiptDestinationMatches({ email: 'a@example.com' }, 'email', 'b@example.com'), 'receipt destination: mismatch refused');
  assert(receiptDestinationMatches({ handle: '@Demigod' }, 'x', 'demigod'), 'receipt destination: handle match');
}

// 19) replies-ingest pure spine: reply-check report shape + fail-closed plans
{
  assert(
    extractEmailsFromFromHeader('Pat <pat@startup.test>').includes('pat@startup.test'),
    'replies From-header parse',
  );
  const report = {
    humanSamples: [
      {
        from: 'Pat <pat@startup.test>',
        subject: 'Re: eng hiring',
        preview: 'yes — send the brief form',
        message_id: 'mid-1',
      },
    ],
    humans: [
      {
        from: 'Pat <pat@startup.test>',
        subject: 'Re: eng hiring',
        preview: 'yes — send the brief form',
        message_id: 'mid-1',
      },
    ],
  };
  const sigs = signalsFromReport(report);
  assert(sigs.length === 1 && sigs[0].emails.includes('pat@startup.test'), 'ingest reads humanSamples/humans shape');
  const matches = matchSignalsToLeads(sigs, [
    { id: 'p1', email: 'pat@startup.test', state: 'sent' },
    { id: 'p2', email: 'other@x.test', state: 'sent' },
  ]);
  assert(matches.length === 1 && matches[0].leadId === 'p1', 'ingest matches lead by email');
  assert(planReplyApply({ leadId: 'p1', state: 'sent', unsub: false, signalId: 'mid-1' }).ok === true, 'sent → replied plannable');
  assert(planReplyApply({ leadId: 'p1', state: 'sourced', unsub: false }).ok === false, 'sourced → replied fail-closed');
  assert(planReplyApply({ leadId: 'p1', state: 'drafted', unsub: false }).ok === false, 'drafted → replied fail-closed');
  assert(planReplyApply({ leadId: 'p1', state: 'sent', unsub: true, signalId: 'mid-1' }).ok === true, 'sent → opted_out plannable');
  assert(signalFromMessage({ from: 'noreply@x.ai', preview: 'x' }) === null, 'noreply not a signal');
  assert(signalsFromReport({}).length === 0 && matchSignalsToLeads([], []).length === 0, 'vacuous ingest is zero not green apply');
  // sample lead never opens replied; ambiguous multi-lead same signal denied
  assert(
    matchSignalsToLeads(
      [signalFromMessage({ from: 'S <s@t.co>', subject: 'Re', preview: 'yes', message_id: 's1' })],
      [{ id: 'sample-1', email: 's@t.co', state: 'sent', sample: true }],
    ).length === 0,
    'ingest: sample lead not matched for reply',
  );
  const ambBatch = planReplyBatch([
    { leadId: 'x1', state: 'sent', unsub: false, signalId: 'dup', snippet: 'yes' },
    { leadId: 'x2', state: 'sent', unsub: false, signalId: 'dup', snippet: 'yes' },
  ]);
  assert(ambBatch.plannable === 0, 'ingest: ambiguous multi-lead plannable=0');
  assert(
    ambBatch.plans.every((p) => p.reason === 'ambiguous_signal'),
    'ingest: ambiguous multi-lead reason',
  );
  // Identity suppress: opted_out twin blocks replied on active sent lead
  const twinLeads = [
    { id: 'old', email: 'twin@co.test', state: 'opted_out' },
    { id: 'new', email: 'twin@co.test', state: 'sent' },
  ];
  assert(suppressedIdentityKeys(twinLeads).has('email:twin@co.test'), 'ingest: suppress keys from opted_out');
  const twinSig = signalFromMessage({
    from: 'Twin <twin@co.test>',
    subject: 'Re',
    preview: 'yes interested',
    message_id: 't1',
  });
  const twinMatches = matchSignalsToLeads([twinSig], twinLeads);
  assert(
    twinMatches.some((m) => m.leadId === 'new' && m.blocked === 'identity_suppressed'),
    'ingest: identity suppress blocks replied match',
  );
  assert(
    planReplyApply(twinMatches.find((m) => m.leadId === 'new') || {}).ok === false,
    'ingest: identity suppress plan denied',
  );
  // From-only handle identity (subject @mention never opens money path)
  assert(
    signalFromMessage({
      from: 'no handle here',
      subject: 're: @Foo',
      preview: 'yes',
      message_id: 'subj-h',
    }) === null,
    'ingest: subject-only @handle → no signal',
  );
  const fromHandle = signalFromMessage({
    from: '@Foo via X',
    subject: 're: hiring',
    preview: 'yes interested',
    message_id: 'from-h',
  });
  assert(
    fromHandle &&
      fromHandle.handles.includes('foo') &&
      matchSignalsToLeads([fromHandle], [{ id: 'h1', handle: '@Foo', state: 'sent' }]).some(
        (m) => m.leadId === 'h1' && m.via === 'handle',
      ),
    'ingest: From @handle matches lead',
  );
  // Auto-reply / OOO never opens replied money path
  const oooSig = signalFromMessage({
    from: 'Pat <pat@startup.test>',
    subject: 'Automatic reply: Out of Office',
    preview: 'I am currently away',
    message_id: 'ooo-m',
  });
  assert(oooSig && oooSig.auto === true, 'ingest: OOO classified auto');
  assert(
    planReplyApply({
      leadId: 'p1',
      state: 'sent',
      unsub: false,
      auto: true,
      signalId: 'ooo-m',
      snippet: 'Out of Office',
    }).reason === 'auto_reply',
    'ingest: auto-reply plan denied',
  );
  // Defense-in-depth: calendar / automated snippet without auto flag still denied
  assert(
    planReplyApply({
      leadId: 'p1',
      state: 'sent',
      unsub: false,
      signalId: 'cal-m',
      snippet: 'Accepted: Intro chat',
    }).reason === 'auto_reply',
    'ingest: calendar Accepted: snippet denied without auto flag',
  );
  // Bulk / Auto-Submitted headers never open replied
  assert(
    planReplyApply({
      leadId: 'p1',
      state: 'sent',
      unsub: false,
      signalId: 'bulk-m',
      snippet: 'Precedence: bulk\nList-Unsubscribe: <mailto:u@list>',
    }).reason === 'auto_reply',
    'ingest: bulk precedence snippet denied',
  );
  // Bounce still lands under identity suppress (hygiene, not money)
  assert(
    planReplyApply({
      leadId: 'p1',
      state: 'sent',
      unsub: false,
      bounce: true,
      blocked: 'identity_suppressed',
      signalId: 'b-sup',
      snippet: 'undeliverable',
    }).to === 'bounced',
    'ingest: bounce under identity suppress → bounced',
  );
  // Hard bounce DSN → bounced (not silent skip, not replied)
  const dsnSig = signalFromMessage({
    from: 'Mailer-Daemon <mailer-daemon@google.com>',
    subject: 'Delivery Status Notification (Failure)',
    preview: 'The address founder@startup.test was undeliverable — user unknown',
    message_id: 'dsn-mid',
  });
  assert(dsnSig && dsnSig.bounce === true && dsnSig.bounceBodyOnly, 'ingest: DSN bounceBodyOnly');
  assert(
    dsnSig.emails.includes('founder@startup.test'),
    'ingest: DSN envelope email from body',
  );
  const dsnMatch = matchSignalsToLeads([dsnSig], [
    { id: 'p1', email: 'founder@startup.test', state: 'sent' },
  ]);
  assert(dsnMatch.some((m) => m.bounce && m.leadId === 'p1'), 'ingest: DSN matches lead');
  assert(
    planReplyApply(dsnMatch.find((m) => m.leadId === 'p1') || {}).to === 'bounced',
    'ingest: DSN plan → bounced',
  );
  // OOO still denied (not bounce)
  assert(
    planReplyApply({
      leadId: 'p1',
      state: 'sent',
      unsub: false,
      auto: true,
      signalId: 'ooo2',
      snippet: 'Out of Office',
    }).reason === 'auto_reply',
    'ingest: OOO still auto_reply not bounce',
  );
  // Receipt-backed replied money path (bare state=sent fail-closed)
  assert(pureLeadReceiptBacked({ state: 'sent' }) === false, 'ingest: bare lead not receipt-backed');
  const bareSentMatch = matchSignalsToLeads(
    [
      signalFromMessage({
        from: 'Bare <bare@startup.test>',
        subject: 'Re: eng',
        preview: 'yes interested',
        message_id: 'bare-mid',
      }),
    ],
    [{ id: 'p-bare', email: 'bare@startup.test', state: 'sent' }],
  );
  assert(
    bareSentMatch[0]?.receiptBacked === false &&
      planReplyApply(bareSentMatch[0] || {}).reason === 'sent_receipt_missing',
    'ingest: bare sent match → replied denied (sent_receipt_missing)',
  );
  const receiptSentMatch = matchSignalsToLeads(
    [
      signalFromMessage({
        from: 'Ok <ok@startup.test>',
        subject: 'Re: eng',
        preview: 'yes — form please',
        message_id: 'ok-mid',
      }),
    ],
    [
      {
        id: 'p-ok',
        email: 'ok@startup.test',
        state: 'sent',
        stateHistory: [
          {
            to: 'sent',
            evidenceText: 'SENT-CONFIRMED\nMessage-ID: <out@trydemigod.com>\nchannel: email',
          },
        ],
      },
    ],
  );
  assert(
    receiptSentMatch[0]?.receiptBacked === true &&
      planReplyApply(receiptSentMatch[0] || {}).ok === true &&
      planReplyApply(receiptSentMatch[0] || {}).to === 'replied',
    'ingest: receipt-backed sent → replied ok',
  );
  // Opt-out / bounce still land without receipt (privacy + DSN hygiene)
  assert(
    planReplyApply({
      leadId: 'p-bare',
      state: 'sent',
      unsub: true,
      receiptBacked: false,
      signalId: 'u1',
      snippet: 'unsubscribe',
    }).to === 'opted_out',
    'ingest: opt-out without receipt still ok',
  );
  assert(
    planReplyApply({
      leadId: 'p-bare',
      state: 'sent',
      bounce: true,
      receiptBacked: false,
      signalId: 'b1',
      snippet: 'undeliverable',
    }).to === 'bounced',
    'ingest: bounce without receipt still ok',
  );
  // Vacuous default signal id alone must not open replied (signalFromMessage fallback)
  assert(
    planReplyApply({
      leadId: 'p-bare',
      state: 'sent',
      unsub: false,
      receiptBacked: true,
      signalId: 'msg',
    }).reason === 'evidence_empty',
    'ingest: signalId=msg without snippet denied',
  );
  // Pure Re:/Fwd: subject noise (subject-as-id) never opens replied
  assert(
    planReplyApply({
      leadId: 'p-bare',
      state: 'sent',
      unsub: false,
      receiptBacked: true,
      signalId: 'Re:',
      snippet: 'Re:',
    }).reason === 'evidence_empty',
    'ingest: subject-as-id Re: + Re: snippet denied',
  );
  assert(
    planReplyApply({
      leadId: 'p-bare',
      state: 'sent',
      unsub: false,
      receiptBacked: true,
      signalId: 'mid-ok',
      snippet: 'Re:',
    }).ok === true,
    'ingest: real message_id + Re: still ok',
  );
}

// 20) pilot bridge: intro_made → pilot-os (CLI, isolated DEMIGOD_ROOT)
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pilot-bridge-'));
  const funnelBin = path.join(__dirname, 'demigod-funnel.mjs');
  const runPilot = (extra = []) =>
    spawnSync(process.execPath, [funnelBin, 'pilot', ...extra], {
      encoding: 'utf8',
      env: { ...process.env, DEMIGOD_ROOT: tmp },
      cwd: __dirname,
      timeout: 30000,
    });
  const parseOut = (r) => {
    if (r.error?.code === 'EPERM') skipReason = 'nested process spawn unavailable';
    try {
      return JSON.parse((r.stdout || '').trim() || '{}');
    } catch {
      return {};
    }
  };
  fs.writeFileSync(
    path.join(tmp, 'DEMIGOD-LEADS.json'),
    JSON.stringify(
      {
        partners: [
          {
            id: 'bridge-intro-1',
            state: 'intro_made',
            company: 'BridgePilotCo',
            title: 'Founding Engineer',
          },
          {
            id: 'bridge-mutual-1',
            state: 'mutual_yes',
            company: 'NoBridgeCo',
            title: 'Staff Engineer',
          },
          { id: 'bridge-sourced-1', state: 'sourced', company: 'SourcedCo', title: 'IC' },
        ],
        talent: [],
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(
    path.join(tmp, 'DEMIGOD-PILOTS.json'),
    JSON.stringify({ schema: 1, pilots: [], at: new Date().toISOString() }, null, 2) + '\n',
  );

  const dry = parseOut(runPilot());
  assert(dry.ok === true && dry.scanned === 3 && dry.eligible === 1 && dry.bridged === 0, 'pilot report-only: scanned>0 bridged=0');
  assert(
    (dry.items || []).some((i) => i.leadId === 'bridge-intro-1' && i.action === 'would_bridge'),
    'pilot report-only would_bridge intro_made',
  );

  const applied = parseOut(runPilot(['--apply']));
  assert(applied.ok === true && applied.bridged === 1, 'pilot --apply bridges intro_made once');
  const leads1 = JSON.parse(fs.readFileSync(path.join(tmp, 'DEMIGOD-LEADS.json'), 'utf8'));
  const introLead = (leads1.partners || []).find((p) => p.id === 'bridge-intro-1');
  const mutualLead = (leads1.partners || []).find((p) => p.id === 'bridge-mutual-1');
  assert(!!introLead?.pilotId, 'pilot --apply sets lead.pilotId');
  assert(!mutualLead?.pilotId, 'mutual_yes lead not bridged');
  const pilots1 = JSON.parse(fs.readFileSync(path.join(tmp, 'DEMIGOD-PILOTS.json'), 'utf8'));
  const spawned = (pilots1.pilots || []).find((p) => p.id === introLead.pilotId);
  assert(spawned?.source === 'funnel:bridge-intro-1', 'spawned pilot source is funnel:<id>');
  assert(
    !(pilots1.pilots || []).some((p) => p.source === 'funnel:bridge-mutual-1'),
    'no pilot for mutual_yes lead',
  );

  const again = parseOut(runPilot(['--apply']));
  assert(again.ok === true && again.bridged === 0 && again.eligible === 0, 'pilot re-run idempotent (0 new)');
  const pilots2 = JSON.parse(fs.readFileSync(path.join(tmp, 'DEMIGOD-PILOTS.json'), 'utf8'));
  assert((pilots2.pilots || []).length === 1, 'idempotent re-run does not mint second pilot');

  // vacuous: leads present but zero intro_made
  fs.writeFileSync(
    path.join(tmp, 'DEMIGOD-LEADS.json'),
    JSON.stringify(
      {
        partners: [
          { id: 'only-sourced', state: 'sourced', company: 'A', title: 'B' },
          { id: 'only-mutual', state: 'mutual_yes', company: 'C', title: 'D' },
        ],
        talent: [],
      },
      null,
      2,
    ) + '\n',
  );
  const vac = parseOut(runPilot(['--apply']));
  assert(
    vac.ok === true && vac.scanned > 0 && vac.bridged === 0 && vac.eligible === 0,
    'vacuous pilot: scanned>0 bridged=0 not silent green',
  );

  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* */
  }
  skipReason = '';
}

// 20b) money-path transitions persist an unambiguous placement pair
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pair-transition-'));
  const funnelBin = path.join(__dirname, 'demigod-funnel.mjs');
  const proof = path.join(tmp, 'placement-proof.txt');
  const leadsFile = path.join(tmp, 'DEMIGOD-LEADS.json');
  fs.writeFileSync(proof, 'Pair-bound hire/payment evidence.\n');
  fs.writeFileSync(leadsFile, JSON.stringify({
    partners: [
      { id: 'pair-unique', state: 'interviewing', pairIds: ['pair-a'], stateHistory: [] },
      { id: 'pair-ambiguous', state: 'interviewing', pairIds: ['pair-a', 'pair-b'], stateHistory: [] },
      {
        id: 'pair-paid', state: 'invoiced', pairId: 'pair-c', pairIds: ['pair-c'],
        stateHistory: [{ to: 'invoiced', pairId: 'pair-c', at: '2026-07-01T00:00:00.000Z', evidence: proof, feeCents: 1_500_000 }],
      },
      {
        id: 'pair-paid-no-fee', state: 'invoiced', pairId: 'pair-d', pairIds: ['pair-d'],
        stateHistory: [{ to: 'invoiced', pairId: 'pair-d', at: '2026-07-01T00:00:00.000Z', evidence: proof }],
      },
    ],
    talent: [],
  }, null, 2));
  const run = (...args) => spawnSync(process.execPath, [funnelBin, 'transition', ...args], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_ROOT: tmp },
    cwd: __dirname,
    timeout: 15000,
  });
  const unique = run('--id=pair-unique', '--to=hired', `--evidence=${proof}`, '--actor=human');
  if (unique.error?.code === 'EPERM') {
    skipReason = 'nested process spawn unavailable';
    assert(false, 'pair transition checks require nested process spawn');
  } else {
    assert(unique.status === 0, 'unique pair hire transition succeeds');
    const ambiguous = run('--id=pair-ambiguous', '--to=hired', `--evidence=${proof}`, '--actor=human');
    assert(ambiguous.status !== 0, 'ambiguous pair hire transition fails closed');
    const explicit = run('--id=pair-ambiguous', '--to=hired', `--evidence=${proof}`, '--pair=pair-b', '--actor=human');
    assert(explicit.status === 0, 'explicit bound pair hire transition succeeds');
    const paid = run('--id=pair-paid', '--to=paid', `--evidence=${proof}`, '--actor=human');
    assert(paid.status === 0, 'paid transition derives the existing placement pair');
    const unpricedPaid = run('--id=pair-paid-no-fee', '--to=paid', `--evidence=${proof}`, '--actor=human');
    assert(unpricedPaid.status !== 0, 'paid transition requires the pair-bound invoice fee');
    const doc = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
    const byId = new Map(doc.partners.map((lead) => [lead.id, lead]));
    assert(byId.get('pair-unique')?.pairId === 'pair-a', 'unique pair is stored on the hired lead');
    assert(byId.get('pair-unique')?.stateHistory.at(-1)?.pairId === 'pair-a', 'hire history stores pair');
    assert(byId.get('pair-ambiguous')?.pairId === 'pair-b', 'selected pair is stored on an ambiguous lead');
    assert(byId.get('pair-paid')?.stateHistory.at(-1)?.pairId === 'pair-c', 'payment history stores pair');
    assert(byId.get('pair-paid')?.stateHistory.at(-1)?.feeCents === 1_500_000, 'payment history copies invoice fee');
  }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* */ }
  skipReason = '';
}

// 21) invoice: hired → stub + invoiced (CLI, isolated DEMIGOD_ROOT)
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-invoice-'));
  const funnelBin = path.join(__dirname, 'demigod-funnel.mjs');
  const hireEv = path.join(tmp, 'hire-confirm.txt');
  fs.writeFileSync(hireEv, 'Written hire confirmation for InvTestCo — start date logged.\n');
  const writeLeads = (partners) => {
    fs.writeFileSync(
      path.join(tmp, 'DEMIGOD-LEADS.json'),
      JSON.stringify({ partners, talent: [] }, null, 2) + '\n',
    );
  };
  const hiredRow = (id, company = 'InvTestCo') => ({
    id,
    state: 'hired',
    company,
    title: 'Founding Eng',
    pairId: `pair-${id}`,
    stateHistory: [
      { at: '2026-07-01T00:00:00.000Z', from: 'interviewing', to: 'hired', pairId: `pair-${id}`, evidence: hireEv },
    ],
  });
  writeLeads([
    hiredRow('inv-hired-1'),
    { id: 'inv-sent-1', state: 'sent', company: 'SentCo', title: 'IC' },
  ]);
  const runInv = (extra = []) =>
    spawnSync(process.execPath, [funnelBin, 'invoice', ...extra], {
      encoding: 'utf8',
      env: { ...process.env, DEMIGOD_ROOT: tmp },
      cwd: __dirname,
      timeout: 15000,
    });
  const parseOut = (r) => {
    if (r.error?.code === 'EPERM') skipReason = 'nested process spawn unavailable';
    const out = (r.stdout || '').trim();
    const err = (r.stderr || '').trim();
    for (const text of [out, err]) {
      if (!text) continue;
      try {
        return JSON.parse(text);
      } catch {
        /* multi-chunk: take first {...} block */
        const i = text.indexOf('{');
        const j = text.lastIndexOf('}');
        if (i >= 0 && j > i) {
          try {
            return JSON.parse(text.slice(i, j + 1));
          } catch {
            /* */
          }
        }
      }
    }
    return { _raw: out + err };
  };

  // (a) hired + --cash --apply → invoiced, fee 10%
  const applied = parseOut(runInv(['--id=inv-hired-1', '--cash=145000', '--apply']));
  assert(applied.ok === true && applied.to === 'invoiced', 'invoice --apply hired → invoiced');
  assert(applied.feeCents === 1450000, 'invoice feeCents = 10% of 145000 in cents');
  const leadsA = JSON.parse(fs.readFileSync(path.join(tmp, 'DEMIGOD-LEADS.json'), 'utf8'));
  const hiredLead = (leadsA.partners || []).find((p) => p.id === 'inv-hired-1');
  assert(hiredLead?.state === 'invoiced', 'lead state is invoiced after apply');
  assert(hiredLead?.stateHistory.at(-1)?.pairId === 'pair-inv-hired-1', 'invoice history preserves placement pair');
  assert(hiredLead?.stateHistory.at(-1)?.feeCents === 1450000, 'invoice history binds fee to placement pair');
  assert(applied.pairId === 'pair-inv-hired-1', 'invoice receipt preserves placement pair');
  assert(hiredLead?.feeCents === 1450000, 'lead.feeCents stored');
  assert(!!applied.path && fs.existsSync(applied.path), 'invoice stub file written');

  // (b) missing --cash → exit 1, state unchanged
  writeLeads([hiredRow('inv-hired-2', 'NoCashCo')]);
  const noCash = runInv(['--id=inv-hired-2', '--apply']);
  assert(noCash.status !== 0, 'invoice without --cash exits non-zero');
  const leadsB = JSON.parse(fs.readFileSync(path.join(tmp, 'DEMIGOD-LEADS.json'), 'utf8'));
  assert((leadsB.partners || [])[0]?.state === 'hired', 'no --cash leaves state hired');

  // (c) sent lead refused; no stub for that id
  writeLeads([{ id: 'inv-sent-1', state: 'sent', company: 'SentCo', title: 'IC' }]);
  const invDir = path.join(tmp, 'demigod-ops', 'invoices');
  const beforeStubs = fs.existsSync(invDir) ? fs.readdirSync(invDir).slice() : [];
  const sentR = runInv(['--id=inv-sent-1', '--cash=100000', '--apply']);
  assert(sentR.status !== 0, 'invoice on sent lead exits non-zero');
  const sentOut = parseOut(sentR);
  assert(/hired/i.test(String(sentOut.error || sentOut._raw || '')), 'sent lead error mentions hired');
  const afterStubs = fs.existsSync(invDir) ? fs.readdirSync(invDir) : [];
  const newStubs = afterStubs.filter((f) => !beforeStubs.includes(f));
  assert(!newStubs.some((f) => f.includes('inv-sent-1')), 'no stub left for sent lead');
  assert(newStubs.length === 0, 'sent refuse writes zero new invoice stubs');

  // Generic transition cannot create an unpriced invoiced state.
  writeLeads([hiredRow('inv-generic-transition', 'GenericTransitionCo')]);
  const genericInvoice = spawnSync(process.execPath, [
    funnelBin,
    'transition',
    '--id=inv-generic-transition',
    '--to=invoiced',
    `--evidence=${hireEv}`,
  ], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_ROOT: tmp },
    cwd: __dirname,
    timeout: 15000,
  });
  assert(genericInvoice.status !== 0, 'generic transition --to=invoiced is rejected');
  const leadsGeneric = JSON.parse(fs.readFileSync(path.join(tmp, 'DEMIGOD-LEADS.json'), 'utf8'));
  assert((leadsGeneric.partners || [])[0]?.state === 'hired', 'rejected generic invoice leaves state hired');

  // reject --to=paid
  writeLeads([hiredRow('inv-hired-3', 'PayNoCo')]);
  const paidR = runInv(['--id=inv-hired-3', '--cash=100000', '--to=paid', '--apply']);
  assert(paidR.status !== 0, 'invoice --to=paid rejected');

  const rebound = hiredRow('inv-rebind', 'RebindCo');
  rebound.pairIds = [rebound.pairId, 'pair-other-placement'];
  writeLeads([rebound]);
  const wrongPair = runInv([
    '--id=inv-rebind', '--cash=100000', '--pair=pair-other-placement', `--evidence=${hireEv}`, '--apply',
  ]);
  assert(wrongPair.status !== 0, 'invoice cannot rebind explicit evidence to a different placement pair');
  const reboundAfter = JSON.parse(fs.readFileSync(path.join(tmp, 'DEMIGOD-LEADS.json'), 'utf8')).partners[0];
  assert(reboundAfter.state === 'hired' && !reboundAfter.stateHistory.some((row) => row.to === 'invoiced'), 'rejected pair rebind leaves hire history unchanged');

  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* */
  }
  skipReason = '';
}

// 22) form_filled conversion: inbox id + early states + email attach (pure plan)
{
  const joinDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ff-join-'));
  const joinEv = path.join(joinDir, 'join-evidence.txt');
  fs.writeFileSync(joinEv, 'form_filled join evidence for selftest\n');

  // edges: inbound / sent / policy_hold may reach form_filled; terminal cold may not
  assert(
    canTransition('approved', 'form_filled', { evidencePath: joinEv }).ok === true,
    'approved → form_filled allowed with join evidence (inbound WIZ)',
  );
  assert(
    canTransition('sourced', 'form_filled', { evidencePath: joinEv }).ok === true,
    'sourced → form_filled allowed (inbound skip cold)',
  );
  assert(
    canTransition('sent', 'form_filled', { evidencePath: joinEv }).ok === true,
    'sent → form_filled allowed (form without reply)',
  );
  assert(
    canTransition('policy_hold', 'form_filled', { evidencePath: joinEv }).ok === true,
    'policy_hold → form_filled allowed (parked lead later fills WIZ with contact)',
  );
  assert(
    canTransition('cold', 'form_filled', { evidencePath: joinEv }).ok === false,
    'cold → form_filled refused (terminal)',
  );

  const inboxSub = {
    id: 'sub-ff-test1',
    form: 'startup-hire',
    raw: { 'contact-email': 'founder@gauge.test', 'role-title': 'Founding Eng' },
    status: 'new',
  };
  const coldSub = {
    id: 'sub-ff-email',
    form: 'engineer',
    raw: { 'seeker-email': 'eng@bay.test', 'skills-stack': 'ts' },
    status: 'new',
  };
  const spam = {
    id: 'sub-spam',
    form: 'startup-hire',
    raw: { 'contact-email': 'x@y.test' },
    status: 'spam',
    rejectReasons: ['e2e_playtest'],
  };

  assert(
    joinMatchVia({ id: 'inbox-sub-ff-test1' }, inboxSub) === 'inbox_id',
    'joinMatchVia inbox_id links lead-collect id to submission',
  );
  assert(
    joinMatchVia({ id: 'other', email: 'founder@gauge.test' }, inboxSub) === 'email',
    'joinMatchVia email path',
  );
  assert(joinMatchVia({ id: 'nope', state: 'sent' }, inboxSub) === null, 'joinMatchVia no false positive');

  const holdSub = {
    id: 'sub-hold-ff',
    form: 'startup-hire',
    raw: { 'contact-email': 'hold@gauge.test', handle: '@holdfounder', 'role-title': 'Founding Eng' },
    status: 'new',
  };

  const doc = {
    partners: [
      {
        id: 'inbox-sub-ff-test1',
        state: 'approved',
        source: 'submissions-inbox:startup-hire',
        company: 'Gauge',
        title: 'Founding Eng',
      },
      {
        id: 'inbox-sub-hold-ff',
        state: 'policy_hold',
        policyHoldReason: 'no-contact-email',
        source: 'submissions-inbox:startup-hire',
        company: 'HoldCo',
        title: 'Founding Eng',
      },
      { id: 'already-ff', state: 'form_filled', email: 'founder@gauge.test' },
    ],
    talent: [
      { id: 'sent-eng', state: 'sent', email: 'eng@bay.test' },
      { id: 'cold-eng', state: 'cold', email: 'eng@bay.test' },
    ],
  };

  const plan = planFormFilledJoins(doc, [inboxSub, coldSub, spam, holdSub]);
  assert(
    plan.pairs.some((p) => p.leadId === 'inbox-sub-ff-test1' && p.via === 'inbox_id' && p.eligible),
    'plan: inbound approved lead eligible via inbox_id',
  );
  assert(
    plan.pairs.some((p) => p.leadId === 'inbox-sub-ff-test1' && p.attachEmail === true),
    'plan: attachEmail when lead missing WIZ email',
  );
  assert(
    plan.pairs.some(
      (p) =>
        p.leadId === 'inbox-sub-hold-ff' &&
        p.via === 'inbox_id' &&
        p.eligible === true &&
        p.attachEmail === true &&
        p.attachHandle === true,
    ),
    'plan: policy_hold lead eligible + attaches email/handle after real WIZ',
  );
  assert(
    plan.pairs.some((p) => p.leadId === 'sent-eng' && p.via === 'email' && p.eligible),
    'plan: sent talent eligible via email (form without reply)',
  );
  assert(!plan.pairs.some((p) => p.leadId === 'already-ff'), 'plan: skips already form_filled');
  assert(
    plan.pairs.some((p) => p.leadId === 'cold-eng' && p.eligible === false) ||
      !plan.pairs.some((p) => p.leadId === 'cold-eng'),
    'plan: cold not eligible (terminal skip or ineligible)',
  );
  assert(!plan.pairs.some((p) => p.submissionId === 'sub-spam'), 'plan: skips synthetic/spam subs');
  assert(plan.eligible.length >= 3, 'plan: at least three eligible joins (incl policy_hold recovery)');

  // vacuous: no identity overlap → zero pairs (not silent green apply)
  const vac = planFormFilledJoins(
    { partners: [{ id: 'lonely', state: 'replied' }], talent: [] },
    [{ id: 'sub-other', form: 'startup-hire', raw: { 'contact-email': 'other@x.test' }, status: 'new' }],
  );
  assert(vac.pairs.length === 0 && vac.eligible.length === 0, 'plan vacuous: zero matches not green');

  // contactless inbox_id self-join: visible-not-vacuous ineligible (money-path guard)
  const contactlessSub = {
    id: 'sub-no-contact',
    form: 'startup-hire',
    raw: { 'role-title': 'Head of Growth' },
    status: 'new',
  };
  const contactlessPlan = planFormFilledJoins(
    {
      partners: [
        {
          id: 'inbox-sub-no-contact',
          state: 'approved',
          source: 'submissions-inbox:startup-hire',
          title: 'Head of Growth',
        },
      ],
      talent: [],
    },
    [contactlessSub],
  );
  const badJoin = contactlessPlan.pairs.find((p) => p.leadId === 'inbox-sub-no-contact');
  assert(!!badJoin, 'contactless inbox_id pair present (not silent vanish)');
  assert(badJoin.eligible === false, 'contactless inbox_id not eligible for form_filled');
  assert(
    /no contact/i.test(badJoin.reason || ''),
    'contactless reason names no contact',
  );
  assert(contactlessPlan.eligible.length === 0, 'contactless not in eligible set');
  // joinedSubmissionId path same guard
  const joinedPlan = planFormFilledJoins(
    {
      partners: [
        {
          id: 'joined-no-c',
          state: 'sent',
          joinedSubmissionId: 'sub-no-contact',
        },
      ],
      talent: [],
    },
    [contactlessSub],
  );
  const badJoined = joinedPlan.pairs.find((p) => p.leadId === 'joined-no-c');
  assert(!!badJoined && badJoined.eligible === false, 'contactless joinedSubmissionId ineligible');

  // gmail rehydrate on lead + structural via (sub still contactless) → form_filled eligible
  const rehydLeadPlan = planFormFilledJoins(
    {
      partners: [
        {
          id: 'inbox-sub-rehyd',
          state: 'policy_hold',
          source: 'submissions-inbox:startup-hire',
          title: 'Founding Eng',
          email: 'founder@realco.test',
          contactEmail: 'founder@realco.test',
        },
      ],
      talent: [],
    },
    [
      {
        id: 'sub-rehyd',
        form: 'startup-hire',
        raw: { 'role-title': 'Founding Eng' },
        status: 'new',
      },
    ],
  );
  const rehydPair = rehydLeadPlan.pairs.find((p) => p.leadId === 'inbox-sub-rehyd');
  assert(!!rehydPair && rehydPair.via === 'inbox_id', 'plan: rehyd lead matches via inbox_id');
  assert(rehydPair.eligible === true, 'plan: usable lead contact + structural via → form_filled');
  assert(rehydPair.attachEmail === false, 'plan: lead already has email — no attach');
  assert(
    rehydLeadPlan.eligible.some((p) => p.leadId === 'inbox-sub-rehyd'),
    'plan: rehyd lead in eligible set',
  );
  // self-domain on lead + contactless sub still denied
  const rehydSelf = planFormFilledJoins(
    {
      partners: [
        {
          id: 'inbox-sub-rehyd-self',
          state: 'policy_hold',
          email: 'potter@trydemigod.com',
        },
      ],
      talent: [],
    },
    [{ id: 'sub-rehyd-self', form: 'startup-hire', raw: { 'role-title': 'X' }, status: 'new' }],
  );
  const rehydSelfPair = rehydSelf.pairs.find((p) => p.leadId === 'inbox-sub-rehyd-self');
  assert(!!rehydSelfPair && rehydSelfPair.eligible === false, 'plan: self-domain lead rehyd not eligible');
  assert(/noise contact/i.test(rehydSelfPair.reason || ''), 'plan: self rehyd names noise contact');

  // noise contact (SMS @pending.example / self domain) must not form_filled or attachEmail
  const noiseSub = {
    id: 'sub-sms-noise',
    form: 'engineer-join-sms',
    // avoid isSynthetic blob skip so plan gate is exercised (status new, no pending in form name)
    raw: { 'seeker-email': 'sms-14155551212@pending.example', 'skills-stack': 'pm' },
    status: 'new',
  };
  // force non-synthetic path by planning with raw email only via pure function —
  // isSynthetic will skip @pending.example; assert skip (no pair) + direct usable gate
  const noisePlan = planFormFilledJoins(
    {
      partners: [],
      talent: [
        {
          id: 'tal-sms',
          state: 'sent',
          email: 'sms-14155551212@pending.example',
        },
      ],
    },
    [noiseSub],
  );
  assert(
    !noisePlan.pairs.some((p) => p.leadId === 'tal-sms'),
    'plan: @pending.example SMS sub is synthetic — no form_filled pair',
  );
  assert(noisePlan.eligible.length === 0, 'plan: no eligible from SMS noise');

  // self-domain / noreply: non-synthetic shape but noise email → ineligible + no attach
  const selfSub = {
    id: 'sub-self',
    form: 'startup-hire',
    raw: { 'contact-email': 'hello@trydemigod.com', 'role-title': 'Founding Eng' },
    status: 'new',
  };
  const selfPlan = planFormFilledJoins(
    {
      partners: [
        {
          id: 'inbox-sub-self',
          state: 'approved',
          source: 'submissions-inbox:startup-hire',
          title: 'Founding Eng',
        },
        {
          id: 'sent-partner',
          state: 'sent',
          email: 'hello@trydemigod.com',
        },
      ],
      talent: [],
    },
    [selfSub],
  );
  const selfInbox = selfPlan.pairs.find((p) => p.leadId === 'inbox-sub-self');
  assert(!!selfInbox, 'plan: self-email inbox_id pair present (not silent vanish)');
  assert(selfInbox.eligible === false, 'plan: self @trydemigod.com not form_filled eligible');
  assert(/noise contact/i.test(selfInbox.reason || ''), 'plan: noise contact reason');
  assert(selfInbox.attachEmail === false, 'plan: never attach noise email to lead');
  const selfEmailVia = selfPlan.pairs.find((p) => p.leadId === 'sent-partner');
  assert(!!selfEmailVia && selfEmailVia.eligible === false, 'plan: email-via noise also ineligible');
  assert(
    !selfPlan.eligible.some((p) => p.leadId === 'inbox-sub-self' || p.leadId === 'sent-partner'),
    'plan: self-domain not in eligible set',
  );

  // usable attachEmail still works for real WIZ email
  const attachPlan = planFormFilledJoins(
    {
      partners: [
        {
          id: 'inbox-sub-real',
          state: 'approved',
          title: 'Founding Eng',
        },
      ],
      talent: [],
    },
    [
      {
        id: 'sub-real',
        form: 'startup-hire',
        raw: { 'contact-email': 'founder@gauge.co', 'role-title': 'Founding Eng' },
        status: 'new',
      },
    ],
  );
  const realJoin = attachPlan.pairs.find((p) => p.leadId === 'inbox-sub-real');
  assert(!!realJoin && realJoin.eligible === true, 'plan: real WIZ email eligible');
  assert(realJoin.attachEmail === true, 'plan: attachEmail for usable WIZ email');
  assert(realJoin.emailFromSub === 'founder@gauge.co', 'plan: emailFromSub is real address');

  // Ambiguous identity: one WIZ email matches two leads → both denied (replies/match parity)
  const ambPlan = planFormFilledJoins(
    {
      partners: [
        { id: 'a-sent', state: 'sent', email: 'shared@co.test' },
        { id: 'b-replied', state: 'replied', email: 'shared@co.test' },
      ],
      talent: [],
    },
    [
      {
        id: 'sub-shared',
        form: 'startup-hire',
        raw: { 'contact-email': 'shared@co.test', 'role-title': 'Eng' },
        status: 'new',
      },
    ],
  );
  assert(ambPlan.pairs.length === 2, 'plan: ambiguous both pairs present (not silent vanish)');
  assert(
    ambPlan.pairs.every((p) => p.eligible === false && p.reason === 'ambiguous_identity'),
    'plan: ambiguous_identity denies both eligible joins',
  );
  assert(ambPlan.eligible.length === 0, 'plan: ambiguous not in eligible set');

  // Unambiguous single lead still converts (positive control)
  const uniqPlan = planFormFilledJoins(
    {
      partners: [{ id: 'only-one', state: 'sent', email: 'unique@co.test' }],
      talent: [],
    },
    [
      {
        id: 'sub-unique',
        form: 'startup-hire',
        raw: { 'contact-email': 'unique@co.test' },
        status: 'new',
      },
    ],
  );
  assert(
    uniqPlan.eligible.length === 1 && uniqPlan.eligible[0].leadId === 'only-one',
    'plan: unique email still form_filled eligible',
  );

  // Identity suppress: opted_out twin sharing handle blocks form_filled
  const supPlan = planFormFilledJoins(
    {
      partners: [
        { id: 'old-opt', state: 'opted_out', handle: '@twinfounder' },
        { id: 'new-sent', state: 'sent', handle: '@twinfounder' },
      ],
      talent: [],
    },
    [
      {
        id: 'sub-twin',
        form: 'startup-hire',
        raw: { handle: '@twinfounder', 'contact-email': 'twin@co.test' },
        status: 'new',
      },
    ],
  );
  const supPair = supPlan.pairs.find((p) => p.leadId === 'new-sent');
  assert(!!supPair, 'plan: suppressed twin pair present');
  assert(supPair.eligible === false && /identity_suppressed/.test(supPair.reason || ''), 'plan: identity_suppressed blocks form_filled');
  assert(supPlan.eligible.length === 0, 'plan: suppressed not eligible');

  // Sample leads never form_filled
  const samplePlan = planFormFilledJoins(
    {
      partners: [{ id: 'p-sample', state: 'sent', email: 'sample@co.test', sample: true }],
      talent: [],
    },
    [
      {
        id: 'sub-sample',
        form: 'startup-hire',
        raw: { 'contact-email': 'sample@co.test' },
        status: 'new',
      },
    ],
  );
  assert(
    samplePlan.pairs.some((p) => p.leadId === 'p-sample' && p.eligible === false && p.reason === 'sample'),
    'plan: sample lead denied form_filled',
  );

  assert(
    canTransition('form_filled', 'quarantined', { evidencePath: joinEv }).ok === true,
    'form_filled → quarantined allowed (defect revert)',
  );

  try {
    fs.rmSync(joinDir, { recursive: true, force: true });
  } catch {
    /* */
  }
}

// 30) contact channel: X handle from URL, draft To: line, noContact metric (P0-2)
{
  const xLead = {
    id: 'x-selftest',
    url: 'https://x.com/theconsensusdev/status/2077783117306195978',
    company: 'TensorLake',
    state: 'drafted',
  };
  attachPublicContact(xLead);
  assert(xLead.handle === '@theconsensusdev', 'attachPublicContact derives @handle from x.com status URL');
  const body = draftEmail(xLead, 'partner');
  assert(/^To: @theconsensusdev\n/m.test(body), 'draft with handle starts with To: @…');
  assert(draftContactTo(xLead) === '@theconsensusdev', 'draftContactTo prefers handle');
  assert(
    /^# source: https:\/\/x\.com\/theconsensusdev\/status\//m.test(body) &&
      /^# verified: \d{4}-\d{2}-\d{2}$/m.test(body),
    'partner draft with URL carries # source + # verified for claim_source_freshness',
  );
  assert(
    draftHygiene({ name: 'TensorLake', company: 'TensorLake', handle: '@theconsensusdev', body }).ok === true,
    'partner draft with source meta passes draftHygiene',
  );
  const noUrlPartner = draftEmail(
    { id: 'p-nourl', company: 'Acme', signal: 'open roles in SF', state: 'drafted' },
    'partner',
  );
  assert(
    !/^Saw\b/m.test(noUrlPartner) && /Public signal:/m.test(noUrlPartner),
    'partner draft without URL avoids unbacked Saw…hiring opener',
  );

  // job-board poster URLs must NOT stamp noise handles (would fake a contact)
  const boardLead = {
    id: 'x-board',
    url: 'https://x.com/SFSoftwareJobs/status/2077592582553526541',
    company: 'Pantograph',
    state: 'drafted',
  };
  attachPublicContact(boardLead);
  assert(boardLead.handle == null || boardLead.handle === '', 'attachPublicContact skips job-board @handle');

  const emailLead = { id: 'e1', email: 'a@b.test', state: 'drafted' };
  assert(draftContactTo(emailLead) === 'a@b.test', 'draftContactTo prefers email');
  assert(/^To: a@b\.test\n/m.test(draftEmail(emailLead, 'partner')), 'draft To: email');

  // Talent greeting: never use SEO pricing titles as Hi name
  assert(
    talentGreetingName({
      name: 'Fractional CTO in San Francisco From $60/hr',
      email: 'aravind@hypernestlabs.com',
    }) === 'Aravind',
    'talentGreetingName: email local over SEO title',
  );
  assert(talentGreetingName({ name: 'Kevin', handle: '@x' }) === 'Kevin', 'talentGreetingName: real name');
  assert(
    isSeoDisplayJunk('Fractional CTO in San Francisco From $60/hr') === true,
    'isSeoDisplayJunk: pricing SEO title',
  );
  assert(isSeoDisplayJunk('TensorLake') === false, 'isSeoDisplayJunk: real company ok');
  const seoDraft = draftEmail(
    {
      id: 'fc-seo',
      name: 'Fractional CTO in San Francisco From $60/hr',
      email: 'aravind@hypernestlabs.com',
      signal: 'Aravind has been a fractional CTO for startups.',
      state: 'drafted',
    },
    'talent',
  );
  assert(/^Hi Aravind —/m.test(seoDraft), 'talent draft greets Aravind not SEO title');
  assert(!/Hi Fractional CTO/i.test(seoDraft), 'talent draft avoids SEO title in greeting');
  assert(
    talentDraftNeedsGreetingRefresh(
      'Hi Fractional CTO in San Francisco From $60/hr — hi.\n',
      { name: 'Fractional CTO in San Francisco From $60/hr', email: 'aravind@x.com' },
    ) === true,
    'talentDraftNeedsGreetingRefresh: SEO greeting',
  );
  assert(
    talentDraftNeedsGreetingRefresh('Hi Kaveri Mekala — note.\n', {
      name: 'Kaveri Mekala',
      email: 'k@x.com',
    }) === true,
    'talentDraftNeedsGreetingRefresh: full name when first preferred',
  );
  assert(
    talentDraftNeedsGreetingRefresh('Hi Aravind — saw your public profile note.\n', {
      email: 'aravind@hypernestlabs.com',
      name: 'Fractional CTO junk',
    }) === false,
    'talentDraftNeedsGreetingRefresh: good greeting ok',
  );
  assert(
    talentDraftNeedsGreetingRefresh(
      'Hi Software Engineer jobs at Y Combinator startups in San Francisco — note.\n',
      { name: 'Software Engineer jobs at Y Combinator startups in San Francisco', email: '' },
    ) === true,
    'talentDraftNeedsGreetingRefresh: SEO greeting when who=there still needs refresh',
  );
  assert(
    talentDraftNeedsGreetingRefresh('Hi there — saw your public SF eng signal.\n', {
      name: '1000+ Startup Engineer jobs in San Francisco',
      email: '',
    }) === false,
    'talentDraftNeedsGreetingRefresh: Hi there ok when no first name',
  );
  {
    const greetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-funnel-greet-'));
    try {
      const junkId = 'fc-t-seo-junk';
      fs.writeFileSync(
        path.join(greetDir, `${junkId}.txt`),
        'To: (no direct contact)\nSubject: SF matching\n\nHi 1000+ Startup Engineer jobs in San Francisco — listing noise.\n\n— Potter\n',
        'utf8',
      );
      const refreshed = refreshTalentDraftGreetings(
        {
          talent: [
            {
              id: junkId,
              type: 'talent',
              name: '1000+ Startup Engineer jobs in San Francisco',
              state: 'disqualified',
              signal: 'listing noise',
            },
          ],
          partners: [],
        },
        { draftsDir: greetDir },
      );
      const body = fs.readFileSync(path.join(greetDir, `${junkId}.txt`), 'utf8');
      assert(refreshed.includes(junkId), 'refreshTalentDraftGreetings rewrites disqualified SEO greets');
      assert(/^Hi there/m.test(body), 'refreshTalentDraftGreetings uses Hi there for SEO names');
      assert(!/Hi 1000\+/m.test(body), 'refreshTalentDraftGreetings drops SEO title greeting');
    } finally {
      fs.rmSync(greetDir, { recursive: true, force: true });
    }
  }

  const bare = {
    id: 'bare-fc',
    state: 'drafted',
    url: 'https://www.ycombinator.com/companies/gauge/jobs/x',
  };
  const toBare = draftContactTo(bare);
  assert(
    /no direct contact — reply via posting/.test(toBare),
    'draft To: falls back to url + no-direct-contact note',
  );

  const doc = {
    partners: [
      { id: 'with-h', state: 'drafted', handle: '@realperson', url: 'https://x.com/realperson/status/1' },
      { id: 'with-e', state: 'approved', email: 'c@d.test' },
      { id: 'noise-h', state: 'drafted', handle: '@ycombinator', url: 'https://events.ycombinator.com/x' },
      { id: 'noise-e', state: 'drafted', contactEmail: 'potter@trydemigod.com' },
      { id: 'none-a', state: 'drafted', url: 'https://example.com/job' },
      { id: 'none-b', state: 'approved' },
      { id: 'sourced-none', state: 'sourced' }, // not counted
    ],
    talent: [],
  };
  const gap = countNoContact(doc);
  assert(gap.noContact === 4, 'noContact = empty + noise-only (not usable email/handle)');
  assert(gap.ids.includes('none-a') && gap.ids.includes('none-b'), 'noContact lists the gap ids');
  assert(gap.ids.includes('noise-h') && gap.ids.includes('noise-e'), 'noContact counts noise-only as gap');
  assert(!gap.ids.includes('with-h') && !gap.ids.includes('with-e'), 'noContact excludes reachable leads');
  assert(!gap.ids.includes('sourced-none'), 'noContact ignores sourced (not draft queue)');
  // vacuous-green: must not silently report zero when gap exists
  assert(gap.noContact > 0, 'noContact positive control (not vacuous zero)');

  assert(
    canTransition('approved', 'policy_hold', { evidenceText: 'no-contact' }).ok === true,
    'approved → policy_hold allowed (park unsendable)',
  );
  assert(
    canTransition('form_filled', 'policy_hold', { evidenceText: 'no-contact' }).ok === true,
    'form_filled → policy_hold allowed',
  );
  assert(
    canTransition('sourced', 'policy_hold', { evidenceText: 'no-contact' }).ok === true,
    'sourced → policy_hold allowed',
  );

  // isUnreachable: only fully contactless (no email/handle/url)
  assert(isUnreachable({ id: 'u0' }) === true, 'empty lead is unreachable');
  assert(isUnreachable({ id: 'u1', email: 'a@b.test' }) === false, 'email reachable');
  assert(isUnreachable({ id: 'u2', handle: '@x' }) === false, 'handle reachable');
  assert(isUnreachable({ id: 'u3', url: 'https://jobs.example/1' }) === false, 'url-only reachable');
  assert(isUnreachable({ id: 'u4', applyUrl: 'https://jobs.ashbyhq.com/x' }) === false, 'applyUrl reachable');

  const parkDoc = {
    partners: [
      { id: 'park-me', state: 'drafted', company: '(from WIZ)' },
      { id: 'keep-url', state: 'drafted', url: 'https://jobs.example/1' },
      { id: 'keep-hold', state: 'policy_hold', policyHoldReason: 'no-contact-email' },
    ],
    talent: [{ id: 'park-talent', state: 'approved', name: 'Anon' }],
  };
  const pr = parkUnreachable(parkDoc, { actor: 'selftest', note: 'no-contact-email' });
  assert(pr.parked.length === 2, 'parkUnreachable parks drafted+approved unreachable');
  assert(pr.parked.some((p) => p.id === 'park-me' && p.from === 'drafted'), 'parks drafted partner');
  assert(pr.parked.some((p) => p.id === 'park-talent' && p.from === 'approved'), 'parks approved talent');
  assert(parkDoc.partners.find((l) => l.id === 'park-me').state === 'policy_hold', 'park-me state');
  assert(parkDoc.partners.find((l) => l.id === 'park-me').policyHoldReason === 'no-contact-email', 'park reason');
  assert(parkDoc.partners.find((l) => l.id === 'keep-url').state === 'drafted', 'url-only not parked');
  assert(parkDoc.partners.find((l) => l.id === 'keep-hold').state === 'policy_hold', 'already-hold stays');
  const pr2 = parkUnreachable(parkDoc);
  assert(pr2.parked.length === 0, 'parkUnreachable idempotent');
}

// 31) match + intro bridges: pure fail-closed plans
{
  const matchDoc = {
    partners: [
      { id: 'p-ff', state: 'form_filled', title: 'Founding Eng', company: 'Acme' },
      { id: 'p-sent', state: 'sent', title: 'IC' },
    ],
    talent: [
      {
        id: 't-ff',
        state: 'form_filled',
        joinedSubmissionId: 'sub-real-1',
      },
      {
        id: 't-orphan',
        state: 'form_filled',
        // no joinedSubmissionId
      },
      { id: 't-review', state: 'in_review', joinedSubmissionId: 'sub-real-2' },
    ],
  };
  const mb = planMatchBridge(matchDoc);
  assert(
    mb.ready.some(
      (r) =>
        r.leadId === 'p-ff' &&
        r.mode === 'suggest' &&
        r.query === 'funnel:p-ff' &&
        r.canAdvanceToInReview,
    ),
    'match plan: partner form_filled ready for suggest (funnel: id)',
  );
  // Partner with WIZ join prefers submission id as query (inbox role + 90d)
  const mbSub = planMatchBridge({
    partners: [
      {
        id: 'p-join',
        state: 'form_filled',
        joinedSubmissionId: 'sub-partner-wiz',
        // title optional when subId present
      },
    ],
    talent: [],
  });
  assert(
    mbSub.ready.some(
      (r) =>
        r.leadId === 'p-join' &&
        r.mode === 'suggest' &&
        r.subId === 'sub-partner-wiz' &&
        r.query === 'sub-partner-wiz',
    ),
    'match plan: partner joinedSubmissionId becomes query (not bare funnel:id)',
  );
  assert(
    mb.ready.some(
      (r) =>
        r.leadId === 't-ff' &&
        r.mode === 'propose-for-candidate' &&
        r.subId === 'sub-real-1' &&
        r.canAdvanceToInReview,
    ),
    'match plan: talent with sub ready for propose-for-candidate',
  );
  assert(
    mb.ready.some((r) => r.leadId === 't-review' && r.canAdvanceToInReview === false),
    'match plan: in_review ready but cannot re-advance',
  );
  assert(
    mb.skipped.some((s) => s.leadId === 't-orphan' && /joinedSubmissionId/i.test(s.reason || '')),
    'match plan: talent without sub skipped (visible)',
  );
  assert(!mb.ready.some((r) => r.leadId === 'p-sent'), 'match plan: sent not ready');

  // advance fail-closed
  const row = mb.ready.find((r) => r.leadId === 't-ff');
  const engOk = { ok: true, candId: 'sub-real-1', ranked: [] };
  assert(planMatchAdvance(row, engOk).ok === true, 'match advance: clean engine ok');
  {
    const ev = planMatchAdvance(row, engOk).evidenceText || '';
    assert(/engine:/.test(ev), 'match advance: evidence carries engine shape tag');
    assert(
      /mode:\s*propose-for-candidate/.test(ev) && /candId:\s*sub-real-1/.test(ev),
      'match advance: evidence carries mode + candId bind',
    );
  }
  // Partner suggest shape on partner plan row (mode=suggest + query bind)
  const partnerRow = mb.ready.find((r) => r.leadId === 'p-ff');
  assert(
    planMatchAdvance(partnerRow, {
      role: { id: 'funnel:p-ff' },
      matches: [],
    }).ok === true,
    'match advance: partner suggest shape ok when role.id matches query',
  );
  {
    const pev =
      planMatchAdvance(partnerRow, {
        role: { id: 'funnel:p-ff' },
        matches: [],
      }).evidenceText || '';
    assert(
      /mode:\s*suggest/.test(pev) && /roleId:\s*funnel:p-ff/.test(pev),
      'match advance: partner evidence carries mode + roleId bind',
    );
  }
  assert(
    planMatchAdvance(partnerRow, { role: { id: 'wrong-role' }, matches: [] }).ok === false &&
      planMatchAdvance(partnerRow, { role: { id: 'wrong-role' }, matches: [] }).reason ===
        'engine_role_mismatch',
    'match advance: partner role.id mismatch denied',
  );
  // propose-for-candidate: always requires candId bound to subId (not only ok:true)
  assert(
    planMatchAdvance(row, { ok: true, ranked: [] }).ok === false &&
      planMatchAdvance(row, { ok: true, ranked: [] }).reason === 'engine_cand_missing',
    'match advance: ok:true without candId denied',
  );
  assert(
    planMatchAdvance(row, { ranked: [] }).ok === false &&
      planMatchAdvance(row, { ranked: [] }).reason === 'engine_cand_missing',
    'match advance: ranked-only without candId denied (anonymous stdout)',
  );
  assert(
    planMatchAdvance(row, { ok: true, candId: 'other-sub', ranked: [] }).ok === false &&
      planMatchAdvance(row, { ok: true, candId: 'other-sub', ranked: [] }).reason ===
        'engine_cand_mismatch',
    'match advance: candId mismatch denied (swapped stdout)',
  );
  // suggest: always requires role.id bound to query (matches-only is not a subject bind)
  assert(
    planMatchAdvance(partnerRow, { matches: [] }).ok === false &&
      planMatchAdvance(partnerRow, { matches: [] }).reason === 'engine_role_missing',
    'match advance: matches-only without role denied',
  );
  assert(
    planMatchAdvance(partnerRow, { role: {}, matches: [] }).ok === false &&
      planMatchAdvance(partnerRow, { role: {}, matches: [] }).reason === 'engine_role_missing',
    'match advance: empty role {} denied (no id bind)',
  );
  assert(
    planMatchAdvance(partnerRow, { ok: true, ranked: [] }).ok === false &&
      planMatchAdvance(partnerRow, { ok: true, ranked: [] }).reason === 'engine_role_missing',
    'match advance: ok:true without role denied for suggest',
  );
  assert(
    planMatchAdvance(row, { error: 'no role' }).ok === false,
    'match advance: engine error denied',
  );
  assert(
    planMatchAdvance(row, { ok: false, error: 'submission not found' }).ok === false,
    'match advance: ok:false denied',
  );
  assert(
    planMatchAdvance(row, null, { engineExitOk: false }).ok === false,
    'match advance: nonzero exit denied',
  );
  assert(
    planMatchAdvance(row, undefined, { engineExitOk: true }).ok === false,
    'match advance: missing JSON denied',
  );
  assert(
    planMatchAdvance(row, {}).ok === false &&
      planMatchAdvance(row, {}).reason === 'engine_shape_invalid',
    'match advance: empty {} (vacuous stdout parse) denied',
  );
  assert(
    planMatchAdvance(
      { leadId: 't-review', canAdvanceToInReview: false },
      { ok: true, candId: 'x' },
    ).ok === false,
    'match advance: in_review not re-advanced',
  );
  assert(
    planMatchAdvance(
      { leadId: 't-ff', canAdvanceToInReview: true, sample: true },
      { ok: true, candId: 'x' },
    ).ok === false,
    'match advance: sample planRow denied',
  );
  assert(
    planMatchAdvance(
      { leadId: 't-ff', canAdvanceToInReview: true, blocked: 'identity_suppressed' },
      { ok: true, candId: 'x' },
    ).ok === false,
    'match advance: identity_suppressed planRow denied',
  );
  // mode required — unbound generic shapes cannot open money path
  assert(
    planMatchAdvance(
      { leadId: 'no-mode', canAdvanceToInReview: true },
      { matches: [], ranked: [] },
    ).ok === false &&
      planMatchAdvance(
        { leadId: 'no-mode', canAdvanceToInReview: true },
        { matches: [], ranked: [] },
      ).reason === 'mode_required',
    'match advance: missing mode denied',
  );
  // Positive: ranked+candId still advances propose (engine may omit ok:true shape tag path)
  assert(
    planMatchAdvance(row, { ranked: [], candId: 'sub-real-1' }).ok === true,
    'match advance: ranked+candId still ok for propose',
  );
  // vacuous: no form_filled/in_review → empty ready (not silent green apply)
  const vacMb = planMatchBridge({
    partners: [{ id: 'only-sourced', state: 'sourced' }],
    talent: [],
  });
  assert(vacMb.ready.length === 0 && vacMb.skipped.length === 0, 'match plan vacuous: zero ready');
  // sample/selftest never enter match money path
  const sampMb = planMatchBridge({
    partners: [
      { id: 'p-sample', state: 'form_filled', title: 'Eng', company: 'SeedCo', sample: true },
    ],
    talent: [{ id: 't-test', state: 'form_filled', joinedSubmissionId: 'sub-x', selftest: true }],
  });
  assert(
    sampMb.ready.length === 0 &&
      sampMb.skipped.some((s) => s.leadId === 'p-sample' && s.reason === 'sample_or_test'),
    'match plan: sample partner skipped',
  );
  assert(
    sampMb.skipped.some((s) => s.leadId === 't-test' && s.reason === 'sample_or_test'),
    'match plan: selftest talent skipped',
  );
  // partner id-only was vacuous green (id always truthy) — require title|role|company
  const bareP = planMatchBridge({
    partners: [{ id: 'p-bare', state: 'form_filled' }],
    talent: [],
  });
  assert(
    bareP.ready.length === 0 &&
      bareP.skipped.some((s) => s.leadId === 'p-bare' && /title|company/i.test(s.reason || '')),
    'match plan: partner id-only skipped (need title/company)',
  );
  // identity suppress (opted_out twin) blocks match money path — outreach/replies parity
  const idSupMb = planMatchBridge({
    partners: [
      { id: 'old-out', email: 'twin@co.test', state: 'opted_out' },
      {
        id: 'new-ff',
        email: 'twin@co.test',
        state: 'form_filled',
        title: 'Founding Eng',
        company: 'TwinCo',
      },
    ],
    talent: [],
  });
  assert(
    idSupMb.ready.length === 0 &&
      idSupMb.skipped.some((s) => s.leadId === 'new-ff' && s.reason === 'identity_suppressed'),
    'match plan: identity suppress skips form_filled twin',
  );
  // clean partner still ready
  assert(
    planMatchBridge({
      partners: [
        { id: 'clean-ff', email: 'clean@co.test', state: 'form_filled', title: 'Eng', company: 'Co' },
      ],
      talent: [],
    }).ready.some((r) => r.leadId === 'clean-ff'),
    'match plan: clean partner still ready',
  );
  // Ambiguous identity: two form_filled leads share email → both denied (replies parity)
  const ambMb = planMatchBridge({
    partners: [
      {
        id: 'amb-a',
        email: 'same-person@co.test',
        state: 'form_filled',
        title: 'Eng',
        company: 'A',
      },
      {
        id: 'amb-b',
        email: 'same-person@co.test',
        state: 'form_filled',
        title: 'Eng',
        company: 'B',
      },
    ],
    talent: [],
  });
  assert(
    ambMb.ready.length === 0 &&
      ambMb.skipped.filter((s) => s.reason === 'ambiguous_identity').length === 2,
    'match plan: ambiguous identity denies both ready leads',
  );

  // intro queue
  const iq = planIntroQueue({
    a: { pairId: 'a', roleId: 'r-a', candId: 'c-a', state: 'mutual_yes', mutual: { founder: true, candidate: true }, sample: false },
    b: { pairId: 'b', roleId: 'r-b', candId: 'c-b', state: 'approved', sample: false },
    c: { pairId: 'c', roleId: 'r-c', candId: 'c-c', state: 'mutual_yes', mutual: { founder: true, candidate: true }, sample: true },
    d: { pairId: 'd', state: 'proposed', sample: false },
    e: { pairId: 'e', state: 'in_review' },
    f: {
      pairId: 'f',
      roleId: 'r-f',
      candId: 'c-f',
      state: 'mutual_yes',
      mutual: { founder: true, candidate: false },
      sample: false,
    },
    g: { pairId: 'g', state: 'mutual_yes', mutual: { founder: true, candidate: true }, sample: false },
  });
  assert(iq.items.length === 2 && iq.eligible.length === 2, 'intro plan: approved+mutual_yes only');
  assert(iq.items.some((i) => i.pairId === 'a') && iq.items.some((i) => i.pairId === 'b'), 'intro plan items');
  assert(
    iq.items.some((i) => i.pairId === 'a' && i.introReady === true),
    'intro plan: mutual_yes + both consents → introReady',
  );
  assert(
    iq.items.some((i) => i.pairId === 'b' && i.introReady === false),
    'intro plan: approved is prep only (not introReady)',
  );
  assert(iq.skipped.some((s) => s.pairId === 'c' && s.reason === 'sample'), 'intro plan: sample skipped by default');
  assert(iq.skipped.some((s) => s.pairId === 'd'), 'intro plan: proposed skipped');
  assert(
    iq.skipped.some((s) => s.pairId === 'f' && s.reason === 'mutual_yes_without_both_consents'),
    'intro plan: one-side mutual denied',
  );
  assert(
    iq.skipped.some((s) => s.pairId === 'g' && s.reason === 'missing_roleId_or_candId'),
    'intro plan: missing role/cand denied',
  );
  // Vacuous same-side pair (roleId === candId) never opens intro money path
  const iqSame = planIntroQueue({
    same: {
      pairId: 'same',
      roleId: 'dup-id',
      candId: 'dup-id',
      state: 'mutual_yes',
      mutual: { founder: true, candidate: true },
    },
  });
  assert(
    iqSame.items.length === 0 &&
      iqSame.skipped.some((s) => s.pairId === 'same' && s.reason === 'roleId_equals_candId'),
    'intro plan: roleId===candId denied',
  );
  const iqSample = planIntroQueue(
    { c: { pairId: 'c', roleId: 'r-c', candId: 'c-c', state: 'mutual_yes', mutual: { founder: true, candidate: true }, sample: true } },
    { includeSample: true },
  );
  assert(iqSample.items.some((i) => i.pairId === 'c'), 'intro plan: --sample includes sample pairs');
  assert(planIntroQueue({}).items.length === 0, 'intro plan vacuous: empty map');
  assert(planIntroQueue(null).items.length === 0, 'intro plan null map safe');
  // leadsDoc identity suppress / sample / self-terminal link gates intro money path
  const iqLeads = {
    partners: [
      {
        id: 'lp-twin',
        email: 'twin@co.test',
        state: 'mutual_yes',
        pairIds: ['a'],
      },
      { id: 'old-twin', email: 'twin@co.test', state: 'opted_out' },
      {
        id: 'lp-samp-link',
        state: 'mutual_yes',
        pairIds: ['b'],
        sample: true,
      },
      // Desync: pair still mutual_yes but linked lead is already terminal
      {
        id: 'lp-term',
        state: 'opted_out',
        pairIds: ['term'],
      },
      // Clean linked lead → eligible item carries leadIds (receipt bridge)
      {
        id: 'lp-linked',
        state: 'mutual_yes',
        pairIds: ['linked'],
      },
    ],
    talent: [],
  };
  const iqSup = planIntroQueue(
    {
      a: {
        pairId: 'a',
        roleId: 'r-a',
        candId: 'c-a',
        state: 'mutual_yes',
        mutual: { founder: true, candidate: true },
      },
      b: {
        pairId: 'b',
        roleId: 'r-b',
        candId: 'c-b',
        state: 'approved',
      },
      clean: {
        pairId: 'clean',
        roleId: 'r-c',
        candId: 'c-c',
        state: 'approved',
      },
      term: {
        pairId: 'term',
        roleId: 'r-t',
        candId: 'c-t',
        state: 'mutual_yes',
        mutual: { founder: true, candidate: true },
      },
      linked: {
        pairId: 'linked',
        roleId: 'r-l',
        candId: 'c-l',
        state: 'mutual_yes',
        mutual: { founder: true, candidate: true },
      },
    },
    { leadsDoc: iqLeads },
  );
  assert(
    !iqSup.items.some((i) => i.pairId === 'a') &&
      iqSup.skipped.some((s) => s.pairId === 'a' && s.reason === 'identity_suppressed'),
    'intro plan: leadsDoc identity suppress denies pair',
  );
  assert(
    !iqSup.items.some((i) => i.pairId === 'b') &&
      iqSup.skipped.some((s) => s.pairId === 'b' && s.reason === 'linked_sample_or_test_lead'),
    'intro plan: linked sample lead denies pair',
  );
  assert(
    !iqSup.items.some((i) => i.pairId === 'term') &&
      iqSup.skipped.some((s) => s.pairId === 'term' && s.reason === 'linked_lead_terminal'),
    'intro plan: linked self-terminal lead denies pair',
  );
  assert(
    iqSup.items.some(
      (i) =>
        i.pairId === 'linked' &&
        i.introReady === true &&
        Array.isArray(i.leadIds) &&
        i.leadIds.includes('lp-linked'),
    ),
    'intro plan: linked clean pair carries leadIds for receipt bridge',
  );
  assert(
    iqSup.items.some((i) => i.pairId === 'clean' && !i.leadIds),
    'intro plan: unlinked clean pair still eligible (no leadIds)',
  );
  // without leadsDoc, same pair stays eligible (pair-only mode)
  assert(
    planIntroQueue({
      a: {
        pairId: 'a',
        roleId: 'r-a',
        candId: 'c-a',
        state: 'mutual_yes',
        mutual: { founder: true, candidate: true },
      },
    }).items.some((i) => i.pairId === 'a'),
    'intro plan: no leadsDoc → pair-only still works',
  );
  // Ambiguous identity: two pair-linked leads share email → both pairs denied
  const iqAmbDoc = {
    partners: [
      {
        id: 'amb-p1',
        email: 'same@co.test',
        state: 'mutual_yes',
        pairIds: ['amb-pair-1'],
      },
      {
        id: 'amb-p2',
        email: 'same@co.test',
        state: 'mutual_yes',
        pairIds: ['amb-pair-2'],
      },
    ],
    talent: [],
  };
  const iqAmb = planIntroQueue(
    {
      'amb-pair-1': {
        pairId: 'amb-pair-1',
        roleId: 'r1',
        candId: 'c1',
        state: 'mutual_yes',
        mutual: { founder: true, candidate: true },
      },
      'amb-pair-2': {
        pairId: 'amb-pair-2',
        roleId: 'r2',
        candId: 'c2',
        state: 'mutual_yes',
        mutual: { founder: true, candidate: true },
      },
    },
    { leadsDoc: iqAmbDoc },
  );
  assert(
    iqAmb.items.length === 0 &&
      iqAmb.skipped.filter((s) => s.reason === 'ambiguous_identity').length === 2,
    'intro plan: ambiguous linked identity denies both pairs',
  );

  // pair-sync pure moves (match→mutual bridge)
  const pairDoc = {
    partners: [
      { id: 'lp-a', state: 'in_review', pairIds: ['pair-appr'] },
      { id: 'lp-m', state: 'proposed', pairIds: ['pair-mut'] },
      { id: 'lp-half', state: 'proposed', pairIds: ['pair-half'] },
      { id: 'lp-samp', state: 'in_review', pairIds: ['pair-samp'], sample: true },
      { id: 'lp-miss', state: 'in_review', pairIds: ['gone'] },
    ],
    talent: [],
  };
  const pairMap = {
    'pair-appr': {
      pairId: 'pair-appr',
      state: 'approved',
      roleId: 'r1',
      candId: 'c1',
      reviewedBy: 'human',
      reviewedAt: '2026-07-17',
    },
    'pair-mut': {
      pairId: 'pair-mut',
      state: 'mutual_yes',
      roleId: 'r2',
      candId: 'c2',
      mutual: { founder: true, candidate: true },
    },
    'pair-half': {
      pairId: 'pair-half',
      state: 'mutual_yes',
      roleId: 'r3',
      candId: 'c3',
      mutual: { founder: true, candidate: false },
    },
    'pair-samp': {
      pairId: 'pair-samp',
      state: 'approved',
      roleId: 'r4',
      candId: 'c4',
      sample: true,
    },
  };
  const ps = planPairSyncMoves(pairDoc, pairMap);
  assert(
    ps.moves.some((m) => m.leadId === 'lp-a' && m.to === 'proposed' && m.roleId === 'r1' && m.candId === 'c1'),
    'pair-sync: approved → lead proposed (carries role/cand ids)',
  );
  {
    const apprMove = ps.moves.find((m) => m.leadId === 'lp-a' && m.to === 'proposed');
    const n = apprMove?.note || '';
    assert(
      /pairId:\s*pair-appr/.test(n) && /roleId:\s*r1/.test(n) && /candId:\s*c1/.test(n),
      'pair-sync: approved evidence binds pairId + roleId + candId',
    );
  }
  assert(
    ps.moves.some((m) => m.leadId === 'lp-m' && m.to === 'mutual_yes'),
    'pair-sync: mutual both-consent → lead mutual_yes',
  );
  assert(
    ps.skipped.some((s) => s.leadId === 'lp-half' && s.reason === 'mutual_yes_without_both_consents'),
    'pair-sync: half mutual denied',
  );
  // approved path fail-closed: missing role/cand + same-side (intro-queue parity)
  const psBareAppr = planPairSyncMoves(
    {
      partners: [
        { id: 'lp-bare-appr', state: 'in_review', pairIds: ['pair-bare-appr'] },
        { id: 'lp-same-appr', state: 'in_review', pairIds: ['pair-same-appr'] },
      ],
      talent: [],
    },
    {
      'pair-bare-appr': { pairId: 'pair-bare-appr', state: 'approved' },
      'pair-same-appr': {
        pairId: 'pair-same-appr',
        state: 'approved',
        roleId: 'same-id',
        candId: 'same-id',
        reviewedBy: 'human',
      },
    },
  );
  assert(
    psBareAppr.moves.length === 0 &&
      psBareAppr.skipped.some(
        (s) => s.leadId === 'lp-bare-appr' && s.reason === 'missing_roleId_or_candId',
      ),
    'pair-sync: approved without role/cand denied',
  );
  assert(
    psBareAppr.skipped.some(
      (s) => s.leadId === 'lp-same-appr' && s.reason === 'roleId_equals_candId',
    ),
    'pair-sync: approved roleId===candId denied',
  );
  assert(
    ps.skipped.some((s) => s.leadId === 'lp-samp' && s.reason === 'sample_or_test_lead'),
    'pair-sync: sample lead skipped',
  );
  assert(
    ps.skipped.some((s) => s.leadId === 'lp-miss' && s.reason === 'pair_missing'),
    'pair-sync: missing pair visible skip',
  );
  assert(
    !ps.moves.some((m) => m.leadId === 'lp-half' || m.leadId === 'lp-samp'),
    'pair-sync: no money move for half/sample',
  );
  // identity suppress blocks pair-sync money moves
  const psSup = planPairSyncMoves(
    {
      partners: [
        {
          id: 'lp-sup',
          email: 'sup@co.test',
          state: 'in_review',
          pairIds: ['pair-appr'],
        },
        { id: 'old-sup', email: 'sup@co.test', state: 'opted_out' },
      ],
      talent: [],
    },
    pairMap,
  );
  assert(
    psSup.moves.length === 0 &&
      psSup.skipped.some((s) => s.leadId === 'lp-sup' && s.reason === 'identity_suppressed'),
    'pair-sync: identity suppress skips money move',
  );
  // vacuous: no pairIds → zero moves
  const vacPs = planPairSyncMoves(
    { partners: [{ id: 'bare', state: 'in_review' }], talent: [] },
    pairMap,
  );
  assert(vacPs.moves.length === 0, 'pair-sync vacuous: zero moves');
  assert(planPairSyncMoves(null, null).moves.length === 0, 'pair-sync null safe');

  // lead-side intro bridge (mutual_yes lead → receipt → intro_made candidates)
  // Sample lead uses its own pair so co-linked sample gate does not shadow clean ready.
  const introPairMap = {
    ...pairMap,
    'pair-sample': {
      pairId: 'pair-sample',
      state: 'mutual_yes',
      roleId: 'r-samp-il',
      candId: 'c-samp-il',
      mutual: { founder: true, candidate: true },
      sample: true,
    },
  };
  const introLeadDoc = {
    partners: [
      {
        id: 'il-ready',
        state: 'mutual_yes',
        pairIds: ['pair-mut'],
      },
      {
        id: 'il-half',
        state: 'mutual_yes',
        pairIds: ['pair-half'],
      },
      {
        id: 'il-samp',
        state: 'mutual_yes',
        pairIds: ['pair-sample'],
        sample: true,
      },
      {
        id: 'il-nopair',
        state: 'mutual_yes',
      },
      {
        id: 'il-wrong',
        state: 'proposed',
        pairIds: ['pair-mut'],
      },
    ],
    talent: [],
  };
  const ilr = planIntroLeadReady(introLeadDoc, introPairMap);
  assert(
    ilr.ready.some((r) => r.leadId === 'il-ready' && r.to === 'intro_made' && r.pairId === 'pair-mut'),
    'intro-lead: mutual_yes + both consents ready',
  );
  {
    const readyRow = ilr.ready.find((r) => r.leadId === 'il-ready');
    const ev = readyRow?.evidenceText || '';
    assert(
      readyRow?.roleId === 'r2' &&
        readyRow?.candId === 'c2' &&
        /roleId:\s*r2/.test(ev) &&
        /candId:\s*c2/.test(ev) &&
        /pair-mut/.test(ev),
      'intro-lead: ready evidence binds pair + roleId + candId',
    );
  }
  assert(
    ilr.skipped.some((s) => s.leadId === 'il-half' && s.reason === 'mutual_yes_without_both_consents'),
    'intro-lead: half mutual denied',
  );
  assert(
    ilr.skipped.some((s) => s.leadId === 'il-samp' && s.reason === 'sample_or_test'),
    'intro-lead: sample denied',
  );
  assert(
    ilr.skipped.some((s) => s.leadId === 'il-nopair' && s.reason === 'no_pairIds'),
    'intro-lead: no pairIds skipped',
  );
  assert(!ilr.ready.some((r) => r.leadId === 'il-wrong'), 'intro-lead: proposed not ready');
  assert(planIntroLeadReady({ partners: [], talent: [] }, introPairMap).ready.length === 0, 'intro-lead vacuous');
  assert(planIntroLeadReady(null, null).ready.length === 0, 'intro-lead null safe');
  // Vacuous same-side pair denied on lead bridge too
  const ilrSame = planIntroLeadReady(
    {
      partners: [
        {
          id: 'il-same',
          state: 'mutual_yes',
          pairIds: ['pair-same'],
        },
      ],
      talent: [],
    },
    {
      'pair-same': {
        pairId: 'pair-same',
        roleId: 'same-side',
        candId: 'same-side',
        state: 'mutual_yes',
        mutual: { founder: true, candidate: true },
      },
    },
  );
  assert(
    ilrSame.ready.length === 0 &&
      ilrSame.skipped.some((s) => s.leadId === 'il-same' && s.reason === 'roleId_equals_candId'),
    'intro-lead: roleId===candId denied',
  );
  // identity suppress blocks intro-lead money path
  const ilrSup = planIntroLeadReady(
    {
      partners: [
        {
          id: 'il-sup',
          email: 'twin@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
        },
        { id: 'old-out-il', email: 'twin@co.test', state: 'opted_out' },
      ],
      talent: [],
    },
    introPairMap,
  );
  assert(
    !ilrSup.ready.some((r) => r.leadId === 'il-sup') &&
      ilrSup.skipped.some((s) => s.leadId === 'il-sup' && s.reason === 'identity_suppressed'),
    'intro-lead: identity suppress denied',
  );
  // Ambiguous identity among ready intro-lead: same email → both denied (match/replies parity)
  const ilrAmb = planIntroLeadReady(
    {
      partners: [
        {
          id: 'il-amb-a',
          email: 'same-intro@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
        },
        {
          id: 'il-amb-b',
          email: 'same-intro@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
        },
      ],
      talent: [],
    },
    introPairMap,
  );
  assert(
    ilrAmb.ready.length === 0 &&
      ilrAmb.skipped.filter((s) => s.reason === 'ambiguous_identity').length === 2,
    'intro-lead: ambiguous identity denies both ready leads',
  );
  // Co-linked terminal on same pair blocks intro money path (pair-queue parity)
  const ilrLinkedTerm = planIntroLeadReady(
    {
      partners: [
        {
          id: 'il-alive',
          email: 'alive@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
        },
      ],
      talent: [
        {
          id: 'il-dead',
          email: 'dead@co.test',
          state: 'opted_out',
          pairIds: ['pair-mut'],
        },
      ],
    },
    introPairMap,
  );
  assert(
    !ilrLinkedTerm.ready.some((r) => r.leadId === 'il-alive') &&
      ilrLinkedTerm.skipped.some(
        (s) => s.leadId === 'il-alive' && s.reason === 'linked_lead_terminal',
      ),
    'intro-lead: co-linked opted_out on same pair denies ready',
  );
  // Co-linked sample on same pair also denies (not just self-sample)
  const ilrLinkedSamp = planIntroLeadReady(
    {
      partners: [
        {
          id: 'il-with-samp',
          email: 'with-samp@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
        },
        {
          id: 'il-co-samp',
          email: 'co-samp@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
          sample: true,
        },
      ],
      talent: [],
    },
    introPairMap,
  );
  assert(
    !ilrLinkedSamp.ready.some((r) => r.leadId === 'il-with-samp') &&
      ilrLinkedSamp.skipped.some(
        (s) => s.leadId === 'il-with-samp' && s.reason === 'linked_sample_or_test_lead',
      ),
    'intro-lead: co-linked sample on same pair denies ready',
  );
  // Clean co-linked mutual_yes still ready
  const ilrLinkedOk = planIntroLeadReady(
    {
      partners: [
        {
          id: 'il-p-ok',
          email: 'p-ok@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
        },
      ],
      talent: [
        {
          id: 'il-t-ok',
          email: 't-ok@co.test',
          state: 'mutual_yes',
          pairIds: ['pair-mut'],
        },
      ],
    },
    introPairMap,
  );
  assert(
    ilrLinkedOk.ready.some((r) => r.leadId === 'il-p-ok') &&
      ilrLinkedOk.ready.some((r) => r.leadId === 'il-t-ok'),
    'intro-lead: both co-linked mutual_yes still ready',
  );
  // pair-sync ambiguous identity among pair-linked leads
  const psAmb = planPairSyncMoves(
    {
      partners: [
        {
          id: 'ps-amb-a',
          email: 'same-ps@co.test',
          state: 'in_review',
          pairIds: ['pair-appr'],
        },
        {
          id: 'ps-amb-b',
          email: 'same-ps@co.test',
          state: 'in_review',
          pairIds: ['pair-appr'],
        },
      ],
      talent: [],
    },
    pairMap,
  );
  assert(
    psAmb.moves.length === 0 &&
      psAmb.skipped.filter((s) => s.reason === 'ambiguous_identity').length === 2,
    'pair-sync: ambiguous identity denies both money moves',
  );
  // Co-linked terminal on same pair denies money move (intro-bridge / replies parity)
  const psLinkedTerm = planPairSyncMoves(
    {
      partners: [
        {
          id: 'ps-alive',
          email: 'alive@co.test',
          state: 'proposed',
          pairIds: ['pair-mut'],
        },
      ],
      talent: [
        {
          id: 'ps-dead',
          email: 'dead@co.test',
          state: 'opted_out',
          pairIds: ['pair-mut'],
        },
      ],
    },
    pairMap,
  );
  assert(
    psLinkedTerm.moves.length === 0 &&
      psLinkedTerm.skipped.some(
        (s) => s.leadId === 'ps-alive' && s.reason === 'linked_lead_terminal',
      ),
    'pair-sync: co-linked opted_out on same pair denies mutual_yes move',
  );
  // Co-linked sample on same pair denies (sample twin must not launder money path)
  const psLinkedSamp = planPairSyncMoves(
    {
      partners: [
        {
          id: 'ps-clean-p',
          email: 'clean-p@co.test',
          state: 'proposed',
          pairIds: ['pair-mut'],
        },
      ],
      talent: [
        {
          id: 'ps-samp-t',
          email: 'samp-t@co.test',
          state: 'proposed',
          pairIds: ['pair-mut'],
          sample: true,
        },
      ],
    },
    pairMap,
  );
  assert(
    !psLinkedSamp.moves.some((m) => m.leadId === 'ps-clean-p') &&
      psLinkedSamp.skipped.some(
        (s) => s.leadId === 'ps-clean-p' && s.reason === 'linked_sample_or_test_lead',
      ),
    'pair-sync: co-linked sample on same pair denies money move',
  );
  // Clean co-linked pair still advances both sides
  const psLinkedOk = planPairSyncMoves(
    {
      partners: [
        {
          id: 'ps-ok-p',
          email: 'ok-p@co.test',
          state: 'proposed',
          pairIds: ['pair-mut'],
        },
      ],
      talent: [
        {
          id: 'ps-ok-t',
          email: 'ok-t@co.test',
          state: 'proposed',
          pairIds: ['pair-mut'],
        },
      ],
    },
    pairMap,
  );
  assert(
    psLinkedOk.moves.some((m) => m.leadId === 'ps-ok-p' && m.to === 'mutual_yes') &&
      psLinkedOk.moves.some((m) => m.leadId === 'ps-ok-t' && m.to === 'mutual_yes'),
    'pair-sync: both clean co-linked still advance to mutual_yes',
  );
}

// 15) funnel draft hygiene — 48h promise flagged; empty dir NOT ok;
//     funnel To/Lead-Id/Subject headers are metadata (not orphan_fragment);
//     a real short orphan body line still flags
{
  const bad = draftHygiene({
    name: 'Acme',
    body: 'Hi there,\n\nWe will reply within 48h with matches.\n\n— Potter',
  });
  assert(bad.ok === false, 'hygiene: 48h promise → ok=false');
  assert(
    bad.flags.some((f) => f.id === 'service_promise'),
    'hygiene: 48h promise → service_promise flag',
  );

  const funnelOk = draftHygiene({
    name: 'AgentPhone',
    company: 'AgentPhone',
    body: [
      'To: https://www.workatastartup.com/jobs/98603 (no direct contact — reply via posting)',
      'Lead-Id: waas-6iwLqId0xZ9cLB',
      'Subject: eng hiring at AgentPhone',
      '',
      'Saw YC P26 · New York (https://www.workatastartup.com/jobs/98603).',
      '',
      'I run Demigod — SF-only matching between startups and engineers. A human reviews every match, both sides approve before any intro, and it costs 10% of first-year cash only if you hire. Nothing before that.',
      '',
      'If useful: https://www.trydemigod.com/?wiz=startup&dg_lead=waas-6iwLqId0xZ9cLB — asks what a great 90-day outcome looks like.',
      '',
      'Reply "no thanks" and you will not hear from me again.',
      '',
      '— Potter, potter@trydemigod.com',
      '',
    ].join('\n'),
  });
  assert(funnelOk.ok === true, 'hygiene: realistic funnel draft → ok');
  assert(
    !funnelOk.flags.some((f) => f.id === 'orphan_fragment'),
    'hygiene: To/Lead-Id/Subject headers must not trip orphan_fragment',
  );

  const realOrphan = draftHygiene({
    name: 'Acme',
    body: 'Hi there,\n\nFoo bar baz\n\nPlease take a look when free.\n\n— Potter',
  });
  assert(
    realOrphan.flags.some((f) => f.id === 'orphan_fragment'),
    'hygiene: real short orphan body line still flags',
  );

  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-funnel-hygiene-'));
  try {
    const empty = scanFunnelDraftHygiene({ draftsDir: emptyDir });
    assert(empty.ok === false, 'hygiene: empty drafts dir → ok=false');
    assert(empty.checked === 0, 'hygiene: empty drafts dir → checked=0');
    assert(String(empty.error || '').includes('empty'), 'hygiene: empty drafts dir error text');

    const dirtyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-funnel-hygiene-dirty-'));
    try {
      fs.writeFileSync(
        path.join(dirtyDir, 'lead-alpha.txt'),
        'Hi Alpha,\n\nI noticed you are hiring engineers this week.\n\n— Potter\n',
        'utf8',
      );
      fs.writeFileSync(
        path.join(dirtyDir, 'lead-beta.txt'),
        'Hi Beta,\n\nDemigod matches SF engineers with startups.\n\n— Potter\n',
        'utf8',
      );
      const dirty = scanFunnelDraftHygiene({ draftsDir: dirtyDir });
      assert(dirty.checked === 2, 'hygiene: dirty dir checks both drafts');
      assert(dirty.ok === false, 'hygiene: dirty dir fails closed');
      assert(
        dirty.flags.some(
          (f) =>
            f.draftId === 'lead-alpha' &&
            f.id === 'claim_source_freshness',
        ),
        'hygiene: flags keep draftId and rule id (no overwrite)',
      );
      assert(
        !dirty.flags.some((f) => f.draftId === 'claim_source_freshness'),
        'hygiene: rule id must not replace draftId',
      );
    } finally {
      fs.rmSync(dirtyDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
}

// 16) contact enrich — literal page extract only (never invent)
{
  const page = `
# Founding Engineer at Acme
Apply: mailto:jobs@acme.com
Follow us https://x.com/acmehq
Or use https://jobs.ashbyhq.com/acme/abc-123
  `;
  const got = extractContactFromPage(page);
  assert(got.contactEmail === 'jobs@acme.com', 'enrich: jobs@acme.com from page → contactEmail');
  assert(got.handle === '@acmehq', 'enrich: x.com handle from page');
  assert(/jobs\.ashbyhq\.com/.test(got.applyUrl || ''), 'enrich: applyUrl from ashby jobs link');
  const logoNoise = extractContactFromPage(
    'logo https://app.ashbyhq.com/api/images/org-theme-logo/x.png apply https://jobs.ashbyhq.com/clera/abc',
  );
  assert(
    logoNoise.applyUrl === 'https://jobs.ashbyhq.com/clera/abc',
    'enrich: skip ashby logo/CDN, keep jobs.ashbyhq apply',
  );

  const mailtoOnly = extractContactFromPage('Contact <a href="mailto:Founders@Acme.IO">email</a>');
  assert(mailtoOnly.contactEmail === 'founders@acme.io', 'enrich: mailto: lowercased');

  const empty = extractContactFromPage('# No contact here\nJust a job description.');
  assert(empty.contactEmail == null, 'enrich: no email → contactEmail absent (not invented)');
  assert(empty.handle == null, 'enrich: no handle → handle absent');
  assert(empty.applyUrl == null, 'enrich: no apply url → applyUrl absent');
  assert(Object.keys(empty).length === 0, 'enrich: empty page → empty extract object');

  const noise = extractContactFromPage('Powered by noreply@ashbyhq.com notifications');
  assert(noise.contactEmail == null, 'enrich: noreply@ skipped');

  // WaaS / aggregator page footer is platform noise — never a founder contact
  const waasPage = extractContactFromPage(`
# Founding Engineer @ Astraea
Email workatastartup@ycombinator.com
Apply https://www.workatastartup.com/application
Follow https://x.com/ycombinator
  `);
  assert(waasPage.contactEmail == null, 'enrich: workatastartup@ycombinator.com skipped');
  assert(waasPage.handle == null, 'enrich: @ycombinator on WaaS page skipped');
  assert(waasPage.applyUrl == null, 'enrich: workatastartup.com/application shell skipped');
  assert(Object.keys(waasPage).length === 0, 'enrich: WaaS footer-only page → empty extract');
  assert(
    isUsableOutreachEmail('workatastartup@ycombinator.com') === false,
    'usable: workatastartup@ycombinator false',
  );
  assert(isUsableOutreachEmail('jobs@acme.com') === true, 'usable: real jobs@ still true after noise expand');

  // Self-domain / footer scrape must not become a lead contact (root of evt→potter@ pollution)
  assert(isUsableOutreachEmail('potter@trydemigod.com') === false, 'usable: potter@trydemigod false');
  assert(isUsableOutreachEmail('hello@trydemigod.com') === false, 'usable: hello@trydemigod false');
  assert(isUsableOutreachEmail('jobs@acme.com') === true, 'usable: real jobs@ true');
  assert(isUsableOutreachEmail('a@') === false, 'usable: malformed email false');
  assert(isUsableOutreachEmail('a@localhost') === false, 'usable: email requires dotted domain');
  assert(isUsableOutreachEmail('sms-1@pending.example') === false, 'usable: pending.example false');
  assert(isUsableOutreachHandle('@ycombinator') === false, 'usable: @ycombinator org false');
  assert(isUsableOutreachHandle('@SFSoftwareJobs') === false, 'usable: job-board handle false');
  assert(isUsableOutreachHandle('@theconsensusdev') === true, 'usable: person handle true');
  assert(isUsableOutreachHandle('@bad-handle') === false, 'usable: handle punctuation false');
  assert(isUsableOutreachHandle('@sixteencharacters') === false, 'usable: handle max length enforced');
  assert(isOwnSiteUrl('https://www.trydemigod.com/?p=events') === true, 'own-site: trydemigod true');
  assert(isOwnSiteUrl('https://jobs.ashbyhq.com/acme/1') === false, 'own-site: ashby false');

  const selfThenReal = extractContactFromPage(
    'Contact potter@trydemigod.com or mailto:jobs@acme.com — follow https://x.com/ycombinator and https://x.com/acmehq',
  );
  assert(selfThenReal.contactEmail === 'jobs@acme.com', 'enrich: skip self email → next real');
  assert(selfThenReal.handle === '@acmehq', 'enrich: skip @ycombinator → next person handle');
  const selfOnly = extractContactFromPage('Footer: potter@trydemigod.com · hello@trydemigod.com');
  assert(selfOnly.contactEmail == null, 'enrich: self-only page → no contactEmail');
  const selfMailto = extractContactFromPage('mailto:hello@trydemigod.com');
  assert(selfMailto.contactEmail == null, 'enrich: self mailto skipped');

  const lead = {
    id: 't-enrich-1',
    type: 'partner',
    state: 'drafted',
    url: 'https://acme.example/jobs/1',
    company: 'Acme',
  };
  assert(needsContactEnrich(lead) === true, 'enrich: drafted url-only needs enrich');
  assert(needsContactEnrich({ ...lead, contactEmail: 'a@b.co' }) === false, 'enrich: has email → skip');
  assert(needsContactEnrich({ ...lead, handle: '@realperson' }) === false, 'enrich: has usable handle → skip');
  assert(
    needsContactEnrich({ ...lead, handle: '@ycombinator' }) === true,
    'enrich: noise-only handle still needs enrich',
  );
  assert(
    needsContactEnrich({ ...lead, contactEmail: 'potter@trydemigod.com' }) === true,
    'enrich: self-email stamp still needs enrich',
  );
  assert(needsContactEnrich({ ...lead, state: 'disqualified' }) === false, 'enrich: disqualified → skip');
  assert(
    needsContactEnrich({
      ...lead,
      contactEmail: 'jobs@acme.com',
      contactProvenance: { method: 'scrape' },
    }) === false,
    'enrich: provenance + usable contact → skip',
  );
  // Bare provenance without usable contact is a false stamp — scrub + retry
  assert(
    needsContactEnrich({ ...lead, contactProvenance: { method: 'scrape' } }) === true,
    'enrich: provenance-only noise stamp still needs enrich',
  );
  assert(
    needsContactEnrich({
      ...lead,
      contactEmail: 'workatastartup@ycombinator.com',
      applyUrl: 'https://www.workatastartup.com/application',
      contactProvenance: { method: 'scrape', url: lead.url },
    }) === true,
    'enrich: WaaS platform stamp heals and still needs enrich',
  );
  assert(
    needsContactEnrich({ ...lead, url: 'https://www.trydemigod.com/?p=events' }) === false,
    'enrich: own-site url never needs enrich',
  );

  // Free-tier order: ATS first, then company hosts, aggregator shells last
  assert(enrichUrlPriority('https://jobs.ashbyhq.com/acme/1') === 0, 'enrich pri: ashby=0');
  assert(enrichUrlPriority('https://boards.greenhouse.io/acme/jobs/1') === 0, 'enrich pri: gh=0');
  assert(enrichUrlPriority('https://acme.com/careers/eng') === 1, 'enrich pri: company=1');
  assert(enrichUrlPriority('https://www.workatastartup.com/jobs/96164') === 2, 'enrich pri: waas=2');
  const ordered = selectEnrichTargets(
    [
      {
        id: 'waas-1',
        state: 'drafted',
        url: 'https://www.workatastartup.com/jobs/1',
        company: 'A',
      },
      {
        id: 'co-1',
        state: 'drafted',
        url: 'https://acme.com/jobs/1',
        company: 'Acme',
      },
      {
        id: 'ats-1',
        state: 'drafted',
        url: 'https://jobs.ashbyhq.com/clera/abc',
        company: 'Clera',
      },
      {
        id: 'waas-2',
        state: 'drafted',
        url: 'https://www.workatastartup.com/jobs/2',
        company: 'B',
      },
    ],
    { limit: 3 },
  );
  assert(
    ordered.map((l) => l.id).join(',') === 'ats-1,co-1,waas-1',
    'enrich: selectEnrichTargets ATS → company → aggregator (cap drops trailing waas)',
  );
  // Within same host band: policy_hold before sourced, higher score first
  const holdFirst = selectEnrichTargets(
    [
      {
        id: 'src-low',
        state: 'sourced',
        score: 50,
        url: 'https://acme.com/jobs/a',
      },
      {
        id: 'hold-hi',
        state: 'policy_hold',
        score: 90,
        policyHoldReason: 'no-usable-contact',
        url: 'https://beta.com/jobs/b',
      },
      {
        id: 'src-hi',
        state: 'sourced',
        score: 95,
        url: 'https://gamma.com/jobs/c',
      },
    ],
    { limit: 3 },
  );
  assert(
    holdFirst[0].id === 'hold-hi',
    'enrich: select prefers policy_hold within company band',
  );
  const uniqueUrls = selectEnrichTargets(
    [
      { id: 'duplicate-high', state: 'policy_hold', score: 100, url: 'https://acme.com/jobs/1/#apply' },
      { id: 'duplicate-low', state: 'policy_hold', score: 90, url: 'https://acme.com/jobs/1' },
      { id: 'unique', state: 'policy_hold', score: 80, url: 'https://beta.com/jobs/2' },
    ],
    { limit: 3 },
  );
  assert(
    uniqueUrls.map((lead) => lead.id).join() === 'duplicate-high,unique',
    'enrich: batch spends one scrape per canonical URL',
  );
  // applyUrl ATS beats aggregator listing url
  const viaApply = selectEnrichTargets(
    [
      {
        id: 'waas-ats',
        state: 'policy_hold',
        url: 'https://www.workatastartup.com/jobs/9',
        applyUrl: 'https://jobs.ashbyhq.com/co/x',
      },
      {
        id: 'co-plain',
        state: 'policy_hold',
        url: 'https://acme.com/careers/1',
      },
    ],
    { limit: 1 },
  );
  assert(viaApply[0].id === 'waas-ats', 'enrich: applyUrl ATS prioritizes over company host');
  assert(
    enrichScrapeUrl({
      url: 'https://www.workatastartup.com/jobs/9',
      applyUrl: 'https://jobs.ashbyhq.com/co/x',
    }) === 'https://jobs.ashbyhq.com/co/x',
    'enrichScrapeUrl prefers ATS applyUrl',
  );
  assert(
    enrichScrapeUrl({ url: 'https://acme.com/jobs/1' }) === 'https://acme.com/jobs/1',
    'enrichScrapeUrl falls back to listing url',
  );
  assert(
    enrichScrapeUrl({
      url: 'https://www.workatastartup.com/jobs/9',
      companyUrl: 'https://acme-startup.io',
    }) === 'https://acme-startup.io',
    'enrichScrapeUrl: companyUrl preferred over WaaS listing',
  );
  assert(
    enrichScrapeUrl({
      url: 'https://www.workatastartup.com/jobs/9',
      applyUrl: 'https://www.ycombinator.com/apply',
    }) === 'https://www.workatastartup.com/jobs/9',
    'enrichScrapeUrl: generic YC apply page stays aggregator',
  );
  assert(
    enrichScrapeUrl({
      url: 'https://www.workatastartup.com/jobs/9',
      applyUrl: 'https://jobs.ashbyhq.com/co/x',
      companyUrl: 'https://acme-startup.io',
    }) === 'https://jobs.ashbyhq.com/co/x',
    'enrichScrapeUrl: ATS still beats companyUrl',
  );
  // Cooldown: recently attempted holds skip batch enrich; --id= still selects
  const nowMs = Date.parse('2026-07-17T12:00:00.000Z');
  assert(
    enrichRecentlyAttempted(
      { enrichAttemptedAt: '2026-07-17T11:00:00.000Z' },
      { now: nowMs },
    ) === true,
    'enrichRecentlyAttempted: within 24h true',
  );
  assert(
    enrichRecentlyAttempted(
      { enrichAttemptedAt: '2026-07-15T12:00:00.000Z' },
      { now: nowMs },
    ) === false,
    'enrichRecentlyAttempted: older than 24h false',
  );
  assert(ENRICH_COOLDOWN_MS === 24 * 60 * 60 * 1000, 'ENRICH_COOLDOWN_MS is 24h');
  const cooled = selectEnrichTargets(
    [
      {
        id: 'fresh',
        state: 'policy_hold',
        url: 'https://acme.com/jobs/new',
        score: 50,
      },
      {
        id: 'recent',
        state: 'policy_hold',
        url: 'https://beta.com/jobs/old',
        score: 100,
        enrichAttemptedAt: '2026-07-17T11:00:00.000Z',
      },
    ],
    { limit: 5, now: nowMs },
  );
  assert(
    cooled.length === 1 && cooled[0].id === 'fresh',
    'enrich: cooldown skips recently attempted (prefer never-tried)',
  );
  const forced = selectEnrichTargets(
    [
      {
        id: 'recent',
        state: 'policy_hold',
        url: 'https://beta.com/jobs/old',
        enrichAttemptedAt: '2026-07-17T11:00:00.000Z',
      },
    ],
    { id: 'recent', limit: 5, now: nowMs },
  );
  assert(forced.length === 1 && forced[0].id === 'recent', 'enrich: --id= bypasses cooldown');
  assert(ENRICH_MAX_ATTEMPTS === 3, 'ENRICH_MAX_ATTEMPTS is 3');
  assert(
    enrichAttemptsExhausted({ enrichAttemptCount: 3 }) === true,
    'enrichAttemptsExhausted: at max',
  );
  assert(
    enrichAttemptsExhausted({ enrichAttemptCount: 2 }) === false,
    'enrichAttemptsExhausted: under max',
  );
  const exhausted = selectEnrichTargets(
    [
      {
        id: 'dead',
        state: 'policy_hold',
        url: 'https://acme.com/jobs/dead',
        enrichAttemptCount: 3,
      },
      {
        id: 'fresh2',
        state: 'policy_hold',
        url: 'https://beta.com/jobs/new',
        score: 10,
      },
    ],
    { limit: 5, now: nowMs },
  );
  assert(
    exhausted.length === 1 && exhausted[0].id === 'fresh2',
    'enrich: batch skips max-attempt exhausted holds',
  );
  const forceExhaust = selectEnrichTargets(
    [
      {
        id: 'dead',
        state: 'policy_hold',
        url: 'https://acme.com/jobs/dead',
        enrichAttemptCount: 3,
      },
    ],
    { id: 'dead', limit: 5, now: nowMs },
  );
  assert(forceExhaust.length === 1, 'enrich: --id= bypasses max attempts');
  const stamped = {
    state: 'policy_hold',
    enrichAttemptCount: 3,
    url: 'https://acme.com/x',
  };
  const se = stampEnrichExhausted(stamped, { at: '2026-07-17T12:00:00.000Z' });
  assert(
    se.exhausted === true && stamped.policyHoldReason === 'enrich-exhausted',
    'stampEnrichExhausted: labels hold after max attempts',
  );
  stamped.contactEmail = 'hire@acme.test';
  const seClear = stampEnrichExhausted(stamped);
  assert(
    seClear.cleared === true && !stamped.policyHoldReason,
    'stampEnrichExhausted: clears when contact appears',
  );
  // Second hop: ATS applyUrl only when first scrape had no usable contact
  assert(
    shouldEnrichSecondHop(
      { applyUrl: 'https://jobs.ashbyhq.com/co/x' },
      {},
      'https://www.workatastartup.com/jobs/1',
    ) === 'https://jobs.ashbyhq.com/co/x',
    'shouldEnrichSecondHop: ATS after WaaS listing',
  );
  assert(
    shouldEnrichSecondHop(
      { contactEmail: 'hire@co.test', applyUrl: 'https://jobs.ashbyhq.com/co/x' },
      {},
      'https://www.workatastartup.com/jobs/1',
    ) === null,
    'shouldEnrichSecondHop: skip when email already found',
  );
  assert(
    shouldEnrichSecondHop(
      { applyUrl: 'https://www.workatastartup.com/application' },
      {},
      'https://www.workatastartup.com/jobs/1',
    ) === null,
    'shouldEnrichSecondHop: no hop to aggregator',
  );
  assert(
    shouldEnrichSecondHop(
      { applyUrl: 'https://jobs.ashbyhq.com/co/x' },
      {},
      'https://jobs.ashbyhq.com/co/x',
    ) === null,
    'shouldEnrichSecondHop: no hop to same URL',
  );
  // Company website hop off aggregator listing when no ATS
  const coPage = extractContactFromPage(
    'Visit https://www.workatastartup.com/companies/acme and https://acme-startup.io/careers for more.',
  );
  assert(
    coPage.companyUrl && /acme-startup\.io/i.test(coPage.companyUrl),
    'extractContactFromPage: company website not aggregator',
  );
  assert(
    shouldEnrichSecondHop(
      { companyUrl: 'https://acme-startup.io' },
      {},
      'https://www.workatastartup.com/jobs/99',
    ) === 'https://acme-startup.io',
    'shouldEnrichSecondHop: company site after WaaS listing',
  );
  assert(
    shouldEnrichSecondHop(
      { companyUrl: 'https://acme-startup.io' },
      {},
      'https://acme-startup.io/jobs',
    ) === null,
    'shouldEnrichSecondHop: no company hop when first is already company host',
  );
  // Junk company URLs (YC /about, builtin) must not become enrich hop targets
  assert(isJunkCompanyUrl('https://www.ycombinator.com/about') === true, 'junk company: yc about');
  assert(isJunkCompanyUrl('https://www.builtinsf.com/company/vercel') === true, 'junk company: builtin');
  assert(isJunkCompanyUrl('https://realco.io/careers') === false, 'junk company: real co ok');
  const ycPollute = extractContactFromPage(
    'Footer https://www.ycombinator.com/about · careers https://acme-real.io/careers',
  );
  assert(
    ycPollute.companyUrl && /acme-real\.io/i.test(ycPollute.companyUrl) && !/ycombinator/i.test(ycPollute.companyUrl || ''),
    'extract skips yc about, keeps real company',
  );
  assert(
    shouldEnrichSecondHop(
      { companyUrl: 'https://www.ycombinator.com/about' },
      {},
      'https://www.workatastartup.com/jobs/1',
    ) === null,
    'shouldEnrichSecondHop: no hop to yc about',
  );
  assert(
    enrichScrapeUrl({
      url: 'https://www.workatastartup.com/jobs/9',
      companyUrl: 'https://www.ycombinator.com/about',
    }) === 'https://www.workatastartup.com/jobs/9',
    'enrichScrapeUrl: ignores junk companyUrl, stays on listing',
  );
  // Same-tick release: policy_hold + contact → drafted
  const holdRow = {
    id: 'h1',
    state: 'policy_hold',
    policyHoldReason: 'no-usable-contact',
    url: 'https://acme.com/jobs/1',
    contactEmail: 'hire@acme.test',
  };
  const rel = releaseHoldIfContactable(holdRow, { at: '2026-07-17T12:00:00.000Z' });
  assert(rel.released === true && holdRow.state === 'drafted', 'releaseHoldIfContactable: hold→drafted');
  assert(!holdRow.policyHoldReason, 'releaseHoldIfContactable: clears no-usable-contact reason');
  assert(
    releaseHoldIfContactable({
      state: 'policy_hold',
      url: 'https://x.com',
    }).released === false,
    'releaseHoldIfContactable: no invent when still no contact',
  );
  assert(
    releaseHoldIfContactable({
      state: 'sourced',
      contactEmail: 'a@b.co',
    }).released === false,
    'releaseHoldIfContactable: only policy_hold',
  );

  const applied = applyContactEnrich(lead, got, { url: lead.url, at: '2026-07-17T00:00:00.000Z' });
  assert(applied.contactEmail === 'jobs@acme.com', 'enrich: apply sets contactEmail');
  assert(applied.contactProvenance?.method === 'scrape', 'enrich: provenance method=scrape');
  assert(applied.contactProvenance?.url === lead.url, 'enrich: provenance url');
  assert(applied.contactProvenance?.at === '2026-07-17T00:00:00.000Z', 'enrich: provenance at');

  const noHit = applyContactEnrich(lead, {}, { url: lead.url, at: '2026-07-17T00:00:00.000Z' });
  assert(noHit.contactEmail == null, 'enrich: empty extract does not invent contactEmail');
  assert(noHit.handle == null, 'enrich: empty extract does not invent handle');
  assert(noHit.contactProvenance == null, 'enrich: miss remains retryable');
  assert(needsContactEnrich(noHit) === true, 'enrich: miss is selected for a later retry');
  const applyOnly = applyContactEnrich(lead, { applyUrl: 'https://jobs.ashbyhq.com/acme/role' });
  assert(needsContactEnrich(applyOnly) === true, 'enrich: apply URL alone does not suppress contact retry');

  // apply refuses noise even if caller passes it through
  const refuseSelf = applyContactEnrich(
    { id: 'x', state: 'drafted', url: 'https://x.com' },
    { contactEmail: 'potter@trydemigod.com', handle: '@ycombinator' },
    { url: 'https://www.trydemigod.com/', at: '2026-07-17T00:00:00.000Z' },
  );
  assert(refuseSelf.contactEmail == null, 'enrich: apply refuses self email');
  assert(refuseSelf.handle == null, 'enrich: apply refuses org handle');

  // Heal a prior WaaS false-positive stamp (platform mailbox + /application)
  const healed = applyContactEnrich(
    {
      id: 'waas-polluted',
      state: 'drafted',
      url: 'https://www.workatastartup.com/jobs/96164',
      contactEmail: 'workatastartup@ycombinator.com',
      applyUrl: 'https://www.workatastartup.com/application',
      contactProvenance: { method: 'scrape', url: 'https://www.workatastartup.com/jobs/96164' },
    },
    {},
    { url: 'https://www.workatastartup.com/jobs/96164', at: '2026-07-17T00:00:00.000Z' },
  );
  assert(healed.contactEmail == null, 'enrich: heals WaaS platform contactEmail');
  assert(healed.applyUrl == null, 'enrich: heals WaaS /application applyUrl');
  assert(healed.contactProvenance == null, 'enrich: heals false provenance so retry works');

  const targets = selectEnrichTargets(
    [
      lead,
      { id: 'skip-dq', state: 'disqualified', url: 'https://x.com' },
      { id: 'skip-email', state: 'drafted', url: 'https://y.com', contactEmail: 'a@b.co' },
      { id: 't2', state: 'drafted', url: 'https://z.com/job' },
    ],
    { limit: 1 },
  );
  assert(targets.length === 1 && targets[0].id === 't-enrich-1', 'enrich: select respects limit+filter');
  assert(selectEnrichTargets([lead], { limit: 0 }).length === 0, 'enrich: zero limit selects nothing');
  const one = selectEnrichTargets(
    [lead, { id: 't2', state: 'drafted', url: 'https://z.com/job' }],
    { id: 't2', limit: 10 },
  );
  assert(one.length === 1 && one[0].id === 't2', 'enrich: --id filter');

  const duplicatePartner = { id: 'same-id', type: 'partner' };
  const duplicateTalent = { id: 'same-id', type: 'talent' };
  const duplicatePartners = [duplicatePartner];
  const duplicateTalentRows = [duplicateTalent];
  const enrichedTalent = { ...duplicateTalent, contactEmail: 'talent@example.com' };
  assert(
    writeEnrichedLead(duplicatePartners, duplicateTalentRows, duplicateTalent, enrichedTalent) &&
      duplicatePartners[0] === duplicatePartner &&
      duplicateTalentRows[0] === enrichedTalent,
    'enrich: duplicate cross-side id writes back to selected row only',
  );

  const released = [{ id: 'redraft-fail', state: 'drafted', usableContact: true }];
  const beforeRedraft = JSON.stringify(released);
  const redraft = redraftEnrichedLeads(released, () => ({ status: 7, stderr: 'draft child failed' }));
  assert(
    redraft.redrafted.length === 0 &&
      redraft.failures[0]?.id === 'redraft-fail' &&
      redraft.failures[0]?.status === 7 &&
      redraft.failures[0]?.stderr === 'draft child failed',
    'enrich: nonzero draft child is reported',
  );
  assert(JSON.stringify(released) === beforeRedraft, 'enrich: draft child failure preserves released CRM state');
}

// Isolated DEMIGOD_ROOT must not overwrite live /tmp/dg-busy human packages.
{
  const livePkg = path.join('/tmp/dg-busy/funnel', 'approve-batch-latest.md');
  const liveBefore = fs.existsSync(livePkg) ? fs.readFileSync(livePkg, 'utf8') : null;
  const liveMtime = fs.existsSync(livePkg) ? fs.statSync(livePkg).mtimeMs : null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pkg-iso-'));
  fs.writeFileSync(
    path.join(tmp, 'DEMIGOD-LEADS.json'),
    JSON.stringify({ partners: [], talent: [] }, null, 2) + '\n',
  );
  const r = spawnSync(
    process.execPath,
    [
      path.join(__dirname, 'demigod-funnel.mjs'),
      'approve-drafted',
      '--dry-run',
      '--package',
      '--note=selftest-isolated-pkg',
    ],
    {
      cwd: __dirname,
      encoding: 'utf8',
      env: { ...process.env, DEMIGOD_ROOT: tmp },
      timeout: 30000,
    },
  );
  if (r.error?.code === 'EPERM') skipReason = 'nested process spawn unavailable';
  assert(r.status === 0, 'isolated package write: CLI exits 0');
  const isoPkg = path.join(tmp, '.dg-busy', 'funnel', 'approve-batch-latest.md');
  assert(fs.existsSync(isoPkg), 'isolated package write: lands under ROOT/.dg-busy');
  assert(
    fs.existsSync(isoPkg) && /selftest-isolated-pkg/.test(fs.readFileSync(isoPkg, 'utf8')),
    'isolated package: note stamped',
  );
  if (liveBefore != null && liveMtime != null) {
    const after = fs.readFileSync(livePkg, 'utf8');
    const afterM = fs.statSync(livePkg).mtimeMs;
    assert(after === liveBefore && afterM === liveMtime, 'isolated package: live /tmp/dg-busy board untouched');
  }
  skipReason = '';
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

// Pipeline tick: status is read-only and works against an isolated lead store.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pipeline-'));
  const leadsPath = path.join(tmp, 'DEMIGOD-LEADS.json');
  const boardPath = path.join(tmp, 'DEMIGOD-BOARD.json');
  // Isolated FOCUS so paused rejection does not depend on live busy FOCUS.md text.
  fs.mkdirSync(path.join(tmp, 'lead-system'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'lead-system', 'FOCUS.md'),
    '# lead funnel\n\nlead funnel is **paused** for expansion.\n',
  );
  // url keeps p1 reachable so triage park-no-contact does not eat the normalize fixture
  const leads =
    JSON.stringify(
      {
        partners: [{ id: 'p1', state: 'sourced', url: 'https://jobs.example.com/1' }],
        talent: [],
      },
      null,
      2,
    ) + '\n';
  const board = JSON.stringify({ sentinel: 'funnel-must-not-write' }, null, 2) + '\n';
  fs.writeFileSync(leadsPath, leads);
  fs.writeFileSync(boardPath, board);
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=status'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  if (r.error?.code === 'EPERM') skipReason = 'nested process spawn unavailable';
  let report = {};
  try {
    report = JSON.parse((r.stdout || '').trim());
  } catch {
    /* assertion below reports malformed output */
  }
  assert(r.status === 0 && report.ok === true && report.results?.status?.status === 0, 'pipeline status tick succeeds outside repo cwd');
  assert(
    report.autoDm === false && report.autoSend === false && report.boardWrites === false,
    'pipeline tick reports no-DM/no-send/no-board safety contract',
  );
  assert(Number.isFinite(Date.parse(report.at)), 'pipeline tick reports a valid timestamp');
  assert(Object.keys(report.results || {}).join() === 'status', 'pipeline status tick runs only status');
  assert(fs.readFileSync(leadsPath, 'utf8') === leads, 'pipeline status tick does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline status tick does not mutate board');
  fs.rmSync(boardPath);
  const noBoard = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=status'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(noBoard.status === 0 && !fs.existsSync(boardPath), 'pipeline status tick does not create a missing board');
  fs.writeFileSync(boardPath, board);
  const triage = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=triage', '--force-paused'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  const triagedLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  assert(triage.status === 0 && triagedLeads.partners[0].status === 'sourced', 'pipeline triage tick normalizes leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline triage tick does not mutate board');
  // Snapshot after intentional triage mutate — later stages must not change this further
  const leadsStable = fs.readFileSync(leadsPath, 'utf8');
  const triageAgain = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=triage', '--force-paused'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(
    triageAgain.status === 0 && fs.readFileSync(leadsPath, 'utf8') === leadsStable,
    'pipeline triage tick is idempotent',
  );
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline repeated triage does not mutate board');
  const pausedReject = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=triage'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(
    pausedReject.status === 2 && pausedReject.stderr.includes('requires --force-paused'),
    'pipeline rejects paused explicit mutation before spawning a child',
  );
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline paused rejection does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline paused rejection does not mutate board');
  const packages = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=packages'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  let packagesReport = {};
  try {
    packagesReport = JSON.parse((packages.stdout || '').trim());
  } catch {
    /* assertion below reports malformed output */
  }
  assert(
    packages.status === 0 &&
      Object.keys(packagesReport.results || {}).join() === 'human_package,send_package,invite_drain,l1_snapshot' &&
      Object.values(packagesReport.results || {}).every((result) => result.soft === false) &&
      Object.values(packagesReport.results || {}).every((result) => /skipped \(DEMIGOD_ROOT isolated\)/.test(result.tail)),
    'pipeline permits evidence-only package repair while paused and treats its sole job as hard',
  );
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline packages tick does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline packages tick does not mutate board');
  fs.writeFileSync(leadsPath, '{bad json');
  const corruptTriage = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=triage', '--force-paused'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(corruptTriage.status === 1, 'pipeline triage fails closed on unreadable canonical leads');
  assert(fs.readFileSync(leadsPath, 'utf8') === '{bad json', 'unreadable canonical leads are not mutated');
  fs.writeFileSync(leadsPath, leadsStable);
  const policy = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=policy'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  let policyReport = {};
  try {
    policyReport = JSON.parse((policy.stdout || '').trim());
  } catch {
    /* assertion below reports malformed output */
  }
  assert(
    policy.status === 0 &&
      policyReport.ok === true &&
      policyReport.results?.policy?.status === 0 &&
      policyReport.results?.revenue?.status === 0,
    'pipeline policy tick succeeds fail-closed policy + revenue selftests',
  );
  assert(
    Object.keys(policyReport.results || {}).join() === 'policy,revenue',
    'pipeline policy tick runs only policy checks',
  );
  assert(
    policyReport.autoDm === false && policyReport.autoSend === false && policyReport.boardWrites === false,
    'pipeline policy tick reports no-DM/no-send/no-board safety contract',
  );
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline policy tick does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline policy tick does not mutate board');
  fs.rmSync(boardPath);
  const policyNoBoard = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=policy'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(policyNoBoard.status === 0 && !fs.existsSync(boardPath), 'pipeline policy tick does not create a missing board');
  fs.writeFileSync(boardPath, board);
  const bad = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=send'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(bad.status === 2, 'pipeline unknown stage fails closed');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline rejected stage does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline rejected stage does not mutate board');
  const malformed = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage', 'status'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(malformed.status === 2, 'pipeline malformed stage syntax fails closed instead of running all');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline malformed args do not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline malformed args do not mutate board');
  const duplicate = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=status', '--stage=status'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(duplicate.status === 2, 'pipeline duplicate stage args fail closed');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline duplicate stage args do not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline duplicate stage args do not mutate board');
  const emptyStage = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage='],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(emptyStage.status === 2, 'pipeline empty stage fails closed instead of running all');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline empty stage does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline empty stage does not mutate board');
  const whitespaceStage = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage= '],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(whitespaceStage.status === 2, 'pipeline whitespace stage fails closed instead of running all');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline whitespace stage does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline whitespace stage does not mutate board');
  const extraEquals = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=status=send'],
    { cwd: os.tmpdir(), encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp } },
  );
  assert(extraEquals.status === 2, 'pipeline malformed multi-value stage fails closed');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline multi-value stage does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline multi-value stage does not mutate board');
  const missingCommand = spawnSync(process.execPath, [path.join(__dirname, 'demigod-lead-pipeline.mjs')], {
    cwd: __dirname,
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_ROOT: tmp },
    timeout: 30000,
  });
  assert(missingCommand.status === 2, 'pipeline missing tick command fails closed');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline missing command does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline missing command does not mutate board');
  const wrongCommand = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'status', '--stage=status'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(wrongCommand.status === 2, 'pipeline non-tick command fails closed');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline wrong command does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline wrong command does not mutate board');
  const strayArg = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', 'status'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(strayArg.status === 2, 'pipeline stray positional stage fails closed');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline stray arg does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline stray arg does not mutate board');
  const unknownFlag = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=status', '--send'],
    { cwd: __dirname, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  assert(unknownFlag.status === 2, 'pipeline unknown flag fails closed');
  assert(fs.readFileSync(leadsPath, 'utf8') === leadsStable, 'pipeline unknown flag does not mutate leads');
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline unknown flag does not mutate board');
  fs.rmSync(leadsPath);
  const missingStore = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=status'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  let missingStoreReport = {};
  try {
    missingStoreReport = JSON.parse((missingStore.stdout || '').trim());
  } catch {
    /* assertion below reports malformed output */
  }
  assert(
    missingStore.status === 1 && missingStoreReport.ok === false && missingStoreReport.results?.status?.status === 1,
    'pipeline status tick fails closed when lead store is missing',
  );
  assert(
    missingStoreReport.stage === 'status' &&
      Number.isFinite(Date.parse(missingStoreReport.at)) &&
      missingStoreReport.autoDm === false &&
      missingStoreReport.autoSend === false &&
      missingStoreReport.boardWrites === false,
    'pipeline failure reports exact stage, timestamp, and safety contract',
  );
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline missing lead store does not mutate board');
  const allMissingStore = spawnSync(
    process.execPath,
    [path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'tick', '--stage=all'],
    { cwd: tmp, encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: tmp }, timeout: 30000 },
  );
  let allMissingStoreReport = {};
  try {
    allMissingStoreReport = JSON.parse((allMissingStore.stdout || '').trim());
  } catch {
    /* assertion below reports malformed output */
  }
  assert(
    allMissingStore.status === 1 &&
      allMissingStoreReport.failed === 'status' &&
      Object.keys(allMissingStoreReport.results || {}).join() === 'status',
    'pipeline all fails at status before starting later stages when lead store is missing',
  );
  assert(fs.readFileSync(boardPath, 'utf8') === board, 'pipeline failed all tick does not mutate board');
  fs.rmSync(tmp, { recursive: true, force: true });
  skipReason = '';
}

const pipelineSource = fs.readFileSync(path.join(__dirname, 'demigod-lead-pipeline.mjs'), 'utf8');
assert(
  pipelineSource.includes('for (const lead of doc.partners || [])'),
  'pipeline scrape-due counter ignores talent rows the partner enricher cannot process',
);
const funnelLoopSource = fs.readFileSync(path.join(__dirname, 'demigod-funnel-loop.mjs'), 'utf8');
assert(
  funnelLoopSource.includes('throw new Error(`missing canonical pipeline: ${p}`)') &&
    !funnelLoopSource.includes('fs.writeFileSync(p, body)'),
  'funnel loop fails closed instead of recreating an obsolete pipeline copy',
);
assert(
  funnelLoopSource.includes('throw new Error(`draft fail ${lead.id}:'),
  'funnel once-draft fails closed when draft artifact generation fails',
);
assert(!pipelineSource.includes("['demigod-events-online.mjs', 'heal']"), 'pipeline never heals Events tunnel');
assert(
  pipelineSource.includes("record('status', readFunnelStatus())") &&
    !pipelineSource.includes("record('status', run(['demigod-funnel.mjs', 'status']))"),
  'pipeline status reads in-process so periodic verification works without nested subprocess permission',
);
assert(
  pipelineSource.includes("record('release_contactable_holds'") &&
    pipelineSource.includes('refreshPackages({ hard: true });'),
  'pipeline triage fails closed when post-mutation package refresh fails',
);
const funnelSource = fs.readFileSync(path.join(__dirname, 'demigod-funnel.mjs'), 'utf8');
{
  const unknown = spawnSync(process.execPath, [path.join(__dirname, 'demigod-funnel.mjs'), 'status', '--definitely-unknown'], {
    encoding: 'utf8',
  });
  if (unknown.error?.code === 'EPERM') skipReason = 'nested process spawn unavailable';
  assert(unknown.status === 2 && /unknown option: --definitely-unknown/.test(unknown.stderr), 'funnel status rejects unknown flags');
  skipReason = '';
}
assert(
  (funnelSource.includes('CRM_MUTATING_COMMANDS.has(cmd) ? withFileLock(CRM_LOCK, execute) : execute()') ||
    (funnelSource.includes('needsLock') &&
      funnelSource.includes("cmd === 'collision-plan' && rest.includes('--apply')") &&
      funnelSource.includes('needsLock ? withFileLock(CRM_LOCK, execute) : execute()'))) &&
    ['normalize', 'transition', 'approve-drafted', 'email-mx', 'import-events', 'receipt', 'join', 'match', 'pair-sync', 'pilot', 'invoice']
      .every((command) => funnelSource.includes(`'${command}'`)),
  'funnel CRM mutators serialize read-modify-write at one shared dispatch boundary',
);
const statusSource = funnelSource.match(/function currentStatusReport\(\) \{[\s\S]*?\n\}/)?.[0] || '';
assert(
  statusSource.includes('return statusReport(doc,') &&
    !/atomicWrite|writeFile|mkdirSync|saveDoc|packageHealed/.test(statusSource),
  'funnel status is report-only; package refresh uses pipeline --stage=packages',
);
const statusReportSource = funnelSource.slice(
  funnelSource.indexOf('export function statusReport('),
  funnelSource.indexOf('  let holdsExhausted = 0;', funnelSource.indexOf('export function statusReport(')),
);
assert(
  !/planApproveDrafted[\s\S]*?catch|planSendReady[\s\S]*?catch/.test(statusReportSource),
  'funnel status fails closed when a readiness planner throws',
);
assert(
  funnelSource.includes('node demigod-lead-pipeline.mjs tick --stage=packages') &&
    !funnelSource.includes('soft-refresh: approve-drafted --dry-run --package + send-package'),
  'funnel stale-package guidance uses the canonical composite refresh',
);
assert(
    funnelSource.includes('let oldest = Infinity;') &&
    funnelSource.includes('if (mt < oldest) oldest = mt;') &&
    funnelSource.includes("path.join(generation, 'funnel/approve-email-first-latest.md')") &&
    funnelSource.includes("path.join(generation, 'funnel/send-email-first-latest.md')") &&
    funnelSource.includes("path.join(generation, 'funnel/l1-snapshot-latest.json')") &&
    funnelSource.includes("inviteDrainJson: path.join(BUSY, 'events-bot/invite-drain-latest.json')") &&
    funnelSource.includes('const invJsonPath = packagePaths.inviteDrainJson;') &&
    funnelSource.includes('const purgePath = packagePaths.outboxPurge;') &&
    !funnelSource.includes('Age of newest package board file'),
  'funnel status pins funnel packages atomically but reads canonical Events drain truth',
);
assert(
  pipelineSource.includes('if ((result.status ?? 1) !== 0 && !result.soft)') &&
    !pipelineSource.includes('if (isAll && (result.status ?? 1) !== 0'),
  'pipeline named composite stages fail fast before later mutations',
);
assert(
  pipelineSource.includes("'package-refresh.lock'") &&
    pipelineSource.includes("'package-commit-latest.json'") &&
    pipelineSource.includes("schema: 'demigod.package-commit/2'") &&
    pipelineSource.includes("failure = ['package_snapshot', { status: 1, err: 'CRM changed during package refresh' }]") &&
    pipelineSource.includes('crmSha256: crmSha') &&
    pipelineSource.includes('withFileLock(CRM_LOCK, () => {') &&
    pipelineSource.includes("throw new Error('CRM changed before package commit')") &&
    pipelineSource.includes("crypto.createHash('sha256')") &&
    pipelineSource.indexOf("fs.renameSync(tmp, commit)") > pipelineSource.indexOf('for (const [name, report] of jobs)') &&
    funnelSource.includes("commit?.schema === 'demigod.package-commit/2'") &&
    funnelSource.includes('JSON.stringify(packageKeys) === JSON.stringify(expectedPackageKeys)') &&
    funnelSource.includes('packageFiles.every((file) =>') &&
    funnelSource.includes("generation.startsWith(path.join(PKG_BUSY, 'package-generations') + path.sep)") &&
    funnelSource.includes("if (!committed) throw new Error('package generation is incomplete')") &&
    funnelSource.includes("throw new Error('package generation changed while reading')") &&
    pipelineSource.includes("'funnel/approve-email-first-latest.md'") &&
    pipelineSource.includes("'funnel/send-email-first-latest.md'") &&
    pipelineSource.includes("'funnel/l1-snapshot-latest.json'") &&
    pipelineSource.includes("'events-bot/INVITE-DRAIN.md'") &&
    pipelineSource.includes("'events-bot/outbox-purge-latest.json'") &&
    pipelineSource.includes('withFileLock(lock, () => {') &&
    pipelineSource.includes('}, { timeoutMs: 0, staleMs: 30000 });') &&
    !pipelineSource.includes('removeOwnedLock') &&
    pipelineSource.includes('if (result.status) {') &&
    pipelineSource.includes('failure = [name, result];') &&
    pipelineSource.includes('completed.push([name, result]);') &&
    pipelineSource.includes('else for (const result of completed) recordPackage(...result);') &&
    pipelineSource.includes('fs.renameSync(staging, generation);') &&
    pipelineSource.includes('result.out = result.out.replaceAll(staging, generation)') &&
    pipelineSource.includes('generation,\n              files,') &&
    pipelineSource.includes(".filter((dir) => dir !== generation)") &&
    pipelineSource.includes('.map((dir) => ({ dir, mtimeMs: fs.statSync(dir).mtimeMs }))') &&
    pipelineSource.includes('.sort((a, b) => b.mtimeMs - a.mtimeMs)') &&
    pipelineSource.includes(".slice(1)") &&
    pipelineSource.includes('fs.rmSync(staging, { recursive: true, force: true });') &&
    pipelineSource.includes("} finally {\n        fs.rmSync(staging, { recursive: true, force: true });\n      }") &&
    pipelineSource.includes('if (failure) recordPackage(...failure);') &&
    pipelineSource.includes("['human_package', () => cmdApproveDrafted(") &&
    pipelineSource.includes("['send_package', () => cmdSendPackage(") &&
    pipelineSource.includes("['invite_drain', () => refreshInviteDrain(") &&
    pipelineSource.includes("['l1_snapshot', () => cmdL1Snapshot(") &&
    !pipelineSource.includes('const result = run(command, timeout, { DEMIGOD_BUSY: staging });') &&
    !pipelineSource.includes('if (hard) fs.rmdirSync(lock);'),
  'pipeline hard package refresh builds one private generation and atomically switches its validated manifest',
);
assert(
  pipelineSource.includes('const paused = stage === \'all\' && focusPaused && !forcePaused;') &&
    pipelineSource.includes("const isAll = stage === 'all' && !paused;") &&
    pipelineSource.includes("if (stage === 'status' || isAll || paused)"),
  'pipeline paused all tick is status-only unless --force-paused explicitly overrides it',
);
assert(
  pipelineSource.includes('leadCollectionPaused(focus)') &&
    funnelSource.includes('leadCollectionPaused(focus)') &&
    leadCollectionPaused('Lead funnel\n\n(paused for Events Bot)') &&
    !leadCollectionPaused('Lead funnel is active'),
  'pipeline and status share the collector FOCUS pause parser',
);
assert(
  pipelineSource.includes('focusPaused,') && pipelineSource.includes('paused,'),
  'pipeline reports focus pause separately from per-tick status-only behavior',
);
assert(
  pipelineSource.includes('status: st.status || 1,') &&
    pipelineSource.includes('healed: false,'),
  'pipeline reports unavailable Events tunnel without healing it',
);
assert(
  pipelineSource.includes("const eventsFocused = /(?:current phase focus:\\s*events bot|^#\\s*events bot\\b)/im.test(focus);") &&
    pipelineSource.includes("(eventsFocused ? record : recordSoft)('events_tunnel', ensureEventsTunnel());"),
  'pipeline fails closed on Events availability while Events Bot is the declared focus',
);
assert(
  pipelineSource.indexOf("('events_tunnel', ensureEventsTunnel())") <
    pipelineSource.indexOf("record('triage', run(['demigod-funnel.mjs', 'normalize']))"),
  'pipeline checks focused Events availability before triage mutations',
);
assert(
  pipelineSource.includes("tail: ((v.status ? v.err : v.out) || v.out || '').slice(-300)"),
  'pipeline reports stderr for failed soft stages',
);
assert(
  pipelineSource.indexOf('const scrapeDue = countHoldsScrapeDue();') >
    pipelineSource.indexOf("record('email_mx'"),
  'pipeline computes scrape eligibility after triage can create holds',
);
assert(
  pipelineSource.includes('} else if (scrapeDue > 0) {'),
  'pipeline never invokes Firecrawl for the unreadable lead-store sentinel',
);
assert(
  funnelSource.indexOf("const check = canTransition(from, plan.to, { evidenceText: plan.evidenceText, actor });") <
    funnelSource.indexOf('commitReceiptTransaction({', funnelSource.indexOf('function cmdReceipt')),
  'receipt CLI validates the real actor and transition before writing canonical evidence',
);
assert(
  funnelSource.includes("['rsvp', 'run', 'followup', 'debrief'].includes(eventsActive.stage) && inviteDrain.needsUrl > 0"),
  'status reports invite URL pending only after the event reaches RSVP',
);
const collectSource = fs.readFileSync(path.join(__dirname, 'demigod-lead-collect.mjs'), 'utf8');
assert(collectSource.includes("receipt.q, receipt) }, null, 2) + '\\n'"), 'paid-search receipts end with a newline');
{
  const xDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-x-shape-'));
  const xPath = path.join(xDir, 'signals.json');
  fs.writeFileSync(xPath, JSON.stringify({ sourceKind: 'live', partners: {}, talent: 'bad' }));
  const signals = sessionXLeads(xPath);
  assert(signals.partners.length === 0 && signals.talent.length === 0, 'X signals fail closed on non-array lead lists');
  fs.rmSync(xDir, { recursive: true, force: true });
}
assert(
  collectSource.includes('const pages = new Map();') &&
    collectSource.match(/pages\.has\([^)]*\) \? pages\.get\([^)]*\) : fcScrape\([^)]*\)/g)?.length === 2,
  'enrich reuses same-run scrape results for duplicate listing and second-hop URLs',
);
assert(
  !collectSource.includes('withFileLock(CRM_LOCK, () => cmdEnrichLocked') &&
    collectSource.indexOf('withFileLock(CRM_LOCK, () => {', collectSource.indexOf('export function cmdEnrich')) >
      collectSource.indexOf('pending.push(', collectSource.indexOf('export function cmdEnrich')) &&
    collectSource.includes("doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));") &&
    collectSource.includes('item.extracted.contactEmail'),
  'enrich scrapes outside the CRM lock and re-reads current rows for one short commit',
);
assert(
  collectSource.indexOf('withFileLock(CRM_LOCK, () => {', collectSource.indexOf('function main')) >
      collectSource.indexOf('for (const q of talentQueries)', collectSource.indexOf('function main')) &&
    !collectSource.includes('withFileLock(CRM_LOCK, main)'),
  'collector locks only fresh CRM merge and publication after network collection',
);
assert(
  collectSource.includes("for (const { q, hits } of searches.results.filter(({ q }) => talentQueries.includes(q)))") &&
    collectSource.includes('yield: searchQueryYield([...partners, ...talent], receipt.q, receipt)'),
  'collector keeps atomic query receipts with final Firecrawl yield',
);
assert(
  collectSource.indexOf("atomicWrite(path.join(BUSY, 'LEADS-BRIEF.md')", collectSource.indexOf('function main')) <
    collectSource.indexOf('writeLeadsJson(OUT, payload)', collectSource.indexOf('function main')),
  'collector writes the derived brief before committing the canonical CRM',
);

{
  const report = statusReport({
    partners: [
      { id: 'newer', state: 'drafted', score: 1, stateUpdatedAt: '2026-07-17T12:00:00Z' },
      { id: 'oldest', state: 'policy_hold', score: 2, stateUpdatedAt: '2026-07-16T12:00:00Z' },
      { id: 'terminal', state: 'disqualified', score: 100, stateUpdatedAt: '2026-07-15T12:00:00Z' },
    ],
    talent: [],
  });
  assert(Array.isArray(report.opsNotes) && !('nextHuman' in report), 'status uses neutral opsNotes, not human assignments');
  assert(!report.opsNotes.some((note) => /\bpaste\b|\byou (?:can|need|should)\b/i.test(note)), 'status opsNotes do not assign user work');
  const eventLeadReport = statusReport(
    {
      partners: [
        { id: 'old-night', source: 'events-bot:event', eventId: 'ev_old', state: 'sourced' },
        { id: 'current-night', source: 'events-bot:event', eventId: 'ev_current', state: 'sourced' },
      ],
      talent: [],
    },
    { activeEventId: 'ev_current' },
  );
  assert(
    eventLeadReport.eventLeads.find((row) => row.id === 'old-night')?.eventStatus === 'historical' &&
      eventLeadReport.eventLeads.find((row) => row.id === 'current-night')?.eventStatus === 'active',
    'status distinguishes historical Events Bot leads from the active night',
  );
  const pausedReport = statusReport(
    {
      partners: [
        { id: 'paused-draft', state: 'drafted', email: 'draft@example.com' },
        { id: 'paused-approved', state: 'approved', email: 'send@example.com' },
        { id: 'paused-hold', state: 'policy_hold', score: 100 },
      ],
      talent: [],
    },
    { focusPaused: true },
  );
  assert(pausedReport.focusPaused === true, 'status exposes paused focus to machine readers');
  assert(pausedReport.metrics.enrichment_paused === true, 'paused status marks enrichment backlog as parked');
  assert(
    pausedReport.metrics.package_stale === (pausedReport.metrics.package_age_sec > 600 ? 1 : 0),
    'paused funnel still reports stale package evidence without scheduling churn',
  );
  assert(
    ![...pausedReport.top, ...pausedReport.stuckOldest].some((row) => row.state === 'policy_hold'),
    'paused funnel keeps policy holds out of presentation queues',
  );
  assert(
    !pausedReport.opsNotes.some((note) => /funnel|approve|send|enrich/i.test(note)),
    'paused funnel status keeps metrics without actionable funnel churn',
  );
  const funnelLoopSource = fs.readFileSync(path.join(__dirname, 'demigod-funnel-loop.mjs'), 'utf8');
  assert(
    funnelLoopSource.includes('if (!status.focusPaused && cycle % 8 === 0) {'),
    'paused funnel loop does not schedule periodic lead collection',
  );
  assert(
    funnelLoopSource.includes("if (status.focusPaused) {") &&
      funnelLoopSource.includes("log('pipeline tick skipped: funnel focus paused')"),
    'paused funnel loop does not spawn the status-only composite pipeline',
  );
  assert(
    funnelLoopSource.includes('if (!status.focusPaused && (status?.metrics?.package_drift || pkgStale))') &&
      !funnelLoopSource.includes('const pkgCadence = cycle % 5 === 0;'),
    'funnel loop repairs drift or stale packages without duplicating the active pipeline refresh on cadence',
  );
  assert(
    funnelLoopSource.includes("run(process.execPath, ['demigod-lead-pipeline.mjs', 'tick', '--stage=packages'], 60000)") &&
      !funnelLoopSource.includes("'approve-drafted',\n        '--dry-run',\n        '--package'") &&
      !funnelLoopSource.includes("'send-package',\n        `--note=funnel-loop-package-"),
    'funnel loop package refresh uses the canonical atomic pipeline once',
  );
  assert(
    funnelLoopSource.includes('if (tick.status !== 0) {') &&
      funnelLoopSource.includes('selftestOk: false') &&
      funnelLoopSource.indexOf('return state;', funnelLoopSource.indexOf('if (tick.status !== 0) {')) <
        funnelLoopSource.indexOf('// 4 record post-pipeline truth'),
    'active pipeline failure writes a red heartbeat and aborts downstream jobs',
  );
  assert(report.stuckOldest.map((row) => row.id).join() === 'oldest,newer', 'status stuckOldest is timestamp ordered');
  assert(report.top.map((row) => row.id).join() === 'newer', 'status top excludes terminal and policy-hold rows');
  const duplicateUrlReport = statusReport({
    partners: [
      { id: 'first', state: 'policy_hold', url: 'https://jobs.example/role' },
      { id: 'second', state: 'policy_hold', url: 'https://jobs.example/role/#details' },
    ],
    talent: [],
  });
  assert(
    duplicateUrlReport.metrics.duplicate_partner_url_groups === 1 &&
      duplicateUrlReport.metrics.duplicate_partner_url_ids[0].ids.join() === 'first,second',
    'status exposes duplicate partner URL groups without mutating CRM',
  );
  assert(
    duplicateUrlReport.opsNotes.includes('Duplicate partner URLs (1) — review: funnel collision-plan'),
    'status points duplicate partner URLs to the existing review-only collision command',
  );
  assert(
    duplicateUrlReport.metrics.holds_scrape_due === 1,
    'status counts one enrichment scrape per duplicate partner URL',
  );
  const collisionPlan = planPartnerUrlCollisionMerges({
    partners: [
      { id: 'held', url: 'https://jobs.example/role', state: 'policy_hold', stateHistory: [{ from: 'sourced', to: 'policy_hold' }] },
      { id: 'replied', url: 'https://jobs.example/role/#apply', state: 'replied', history: [{ status: 'replied' }], provenance: { source: 'manual' } },
      { id: 'event-a', url: 'https://events.example/night', source: 'events-bot:calendar' },
      { id: 'event-b', url: 'https://events.example/night', source: 'events-bot:calendar' },
    ],
  });
  assert(
    collisionPlan[0].keepId === 'replied' &&
      collisionPlan[0].mergeIds.join() === 'held' &&
      collisionPlan[0].evidence.length === 2 &&
      collisionPlan[0].evidence.some((row) => row.stateHistory.length) &&
      collisionPlan[0].evidence.some((row) => row.provenance?.source === 'manual'),
    'collision plan keeps furthest state plus every history and provenance payload',
  );
  const safeCollisionPlan = planPartnerUrlCollisionMerges({
    partners: [
      { id: 'z-active', url: 'https://jobs.example/safe', state: 'replied', stateUpdatedAt: '2099-01-01T00:00:00Z' },
      { id: 'opted-out', url: 'https://jobs.example/safe', state: 'opted_out' },
      { id: 'z-newer', url: 'https://jobs.example/stable', state: 'drafted', stateUpdatedAt: '2026-01-02T00:00:00Z' },
      { id: 'a-newer', url: 'https://jobs.example/stable', state: 'drafted', stateUpdatedAt: '2026-01-02T00:00:00Z' },
    ].reverse(),
  });
  assert(
    safeCollisionPlan.find((row) => row.url.endsWith('/safe')).keepId === 'opted-out' &&
      safeCollisionPlan.find((row) => row.url.endsWith('/stable')).keepId === 'a-newer',
    'collision plan preserves suppression and breaks equal-rank ties deterministically',
  );
  const applyCollisionDoc = {
    partners: [
      {
        id: 'a-keep',
        url: 'https://jobs.example/role',
        state: 'replied',
        stateHistory: [{ from: 'sourced', to: 'replied' }],
        contactProvenance: { url: 'https://jobs.example/role', method: 'scrape' },
      },
      {
        id: 'z-drop',
        url: 'https://jobs.example/role/',
        state: 'policy_hold',
        source: 'firecrawl-search',
        stateHistory: [{ from: 'sourced', to: 'policy_hold' }],
      },
    ],
  };
  const applyResult = applyPartnerUrlCollisionMerges(applyCollisionDoc, null, {
    at: '2026-07-24T00:00:00.000Z',
    actor: 'selftest',
  });
  assert(
    applyResult.applied.length === 1 &&
      applyResult.removed.join() === 'z-drop' &&
      applyResult.remainingGroups === 0 &&
      applyCollisionDoc.partners.length === 1 &&
      applyCollisionDoc.partners[0].id === 'a-keep' &&
      applyCollisionDoc.partners[0].mergedFrom?.join() === 'z-drop' &&
      applyCollisionDoc.partners[0].history?.some((h) => h.kind === 'url_collision_merge' && h.evidence?.[0]?.id === 'z-drop'),
    'collision apply keeps survivor, drops twin, and attaches full evidence',
  );
  const collisionFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-funnel-collision-'));
  try {
    const collisionLeads = path.join(collisionFixture, 'DEMIGOD-LEADS.json');
    fs.writeFileSync(
      collisionLeads,
      JSON.stringify({
        partners: [
          { id: 'a-keep', url: 'https://jobs.example/dup', state: 'disqualified' },
          { id: 'b-drop', url: 'https://jobs.example/dup', state: 'disqualified', source: 'firecrawl-search' },
        ],
        talent: [],
      }) + '\n',
      { mode: 0o644 },
    );
    fs.chmodSync(collisionLeads, 0o644);
    const readOnlyStatus = spawnSync(
      process.execPath,
      [path.join(__dirname, 'demigod-funnel.mjs'), 'status'],
      { cwd: __dirname, env: { ...process.env, DEMIGOD_ROOT: collisionFixture }, encoding: 'utf8' },
    );
    assert(
      readOnlyStatus.status === 0 && (fs.statSync(collisionLeads).mode & 0o777) === 0o644,
      'read-only status leaves the lead store mode unchanged',
    );
    const unknownCollisionOption = spawnSync(
      process.execPath,
      [path.join(__dirname, 'demigod-funnel.mjs'), 'collision-plan', '--force'],
      { cwd: __dirname, env: { ...process.env, DEMIGOD_ROOT: collisionFixture }, encoding: 'utf8' },
    );
    if (unknownCollisionOption.error?.code === 'EPERM') skipReason = 'nested process spawn unavailable';
    assert(
      unknownCollisionOption.status === 2 &&
        unknownCollisionOption.stderr.includes('unknown option: --force') &&
        !fs.existsSync(path.join(collisionFixture, '.dg-busy')),
      'collision plan rejects unknown options without writing a receipt',
    );
    const applyCollisionCli = spawnSync(
      process.execPath,
      [path.join(__dirname, 'demigod-funnel.mjs'), 'collision-plan', '--apply'],
      { cwd: __dirname, env: { ...process.env, DEMIGOD_ROOT: collisionFixture }, encoding: 'utf8' },
    );
    if (applyCollisionCli.error?.code === 'EPERM') skipReason = 'nested process spawn unavailable';
    const applyBody = (() => {
      try { return JSON.parse(applyCollisionCli.stdout || '{}'); } catch { return {}; }
    })();
    const afterLeads = JSON.parse(fs.readFileSync(collisionLeads, 'utf8'));
    assert(
      applyCollisionCli.status === 0 &&
        applyBody.apply === true &&
        applyBody.removed === 1 &&
        applyBody.remainingGroups === 0 &&
        afterLeads.partners.length === 1 &&
        afterLeads.partners[0].id === 'a-keep' &&
        afterLeads.partners[0].mergedFrom?.includes('b-drop'),
      'collision-plan --apply merges same-URL partners with evidence on survivor',
    );
    skipReason = '';
  } finally {
    fs.rmSync(collisionFixture, { recursive: true, force: true });
  }
  // Machine-readable L1 / enrich ids (email-first + scrape-due honesty)
  assert(Array.isArray(report.metrics.approve_ready_email_ids), 'status metrics approve_ready_email_ids array');
  assert(Array.isArray(report.metrics.approve_ready_email_tos), 'status metrics approve_ready_email_tos array');
  assert(Array.isArray(report.metrics.send_ready_email_ids), 'status metrics send_ready_email_ids array');
  assert(Array.isArray(report.metrics.send_ready_email_tos), 'status metrics send_ready_email_tos array');
  assert(
    report.metrics.approve_ready_email === report.metrics.approve_ready_email_ids.length &&
      report.metrics.approve_ready_email === report.metrics.approve_ready_email_tos.length,
    'status exposes every approve-ready email id and recipient',
  );
  assert(
    report.metrics.send_ready_email === report.metrics.send_ready_email_ids.length &&
      report.metrics.send_ready_email === report.metrics.send_ready_email_tos.length,
    'status exposes every send-ready email id and recipient',
  );
  assert(
    !funnelSource.includes('approve_ready_email_ids: approveEmailIds' + '.slice(0, 12)') &&
      !funnelSource.includes('send_ready_email_ids: sendEmailIds' + '.slice(0, 12)'),
    'status email readiness is not silently truncated',
  );
  assert(
    !funnelSource.includes('approveEmailIds' + '.slice(0, 12).join'),
    'status approval command is not silently truncated',
  );
  assert(
    report.metrics.send_ready_human_only === report.metrics.send_ready_handle,
    'status identifies handle-only send readiness as human-only',
  );
  assert(Array.isArray(report.metrics.holds_scrape_due_ids), 'status metrics holds_scrape_due_ids array');
  assert(Array.isArray(report.metrics.holds_cooling_ids), 'status metrics holds_cooling_ids array');
  assert(
    report.metrics.holds_cooling_min_remaining_sec === null ||
      (typeof report.metrics.holds_cooling_min_remaining_sec === 'number' &&
        report.metrics.holds_cooling_min_remaining_sec >= 0),
    'status metrics holds_cooling_min_remaining_sec null or ≥0',
  );
  assert(Array.isArray(report.metrics.holds_exhausted_ids), 'status metrics holds_exhausted_ids array');
  assert(
    report.metrics.holds_cooling === report.metrics.holds_cooling_ids.length &&
      report.metrics.holds_exhausted === report.metrics.holds_exhausted_ids.length &&
      report.metrics.invalid_history_transitions === report.metrics.invalid_history_ids.length,
    'status exposes every cooling, exhausted, and invalid-history id',
  );
  assert(
    !funnelSource.includes('invalid_history_ids: invalidHistoryIds' + '.slice(0, 12)') &&
      !funnelSource.includes('holds_cooling_ids: holdsCoolingIds' + '.slice(0, 12)') &&
      !funnelSource.includes('holds_exhausted_ids: holdsExhaustedIds' + '.slice(0, 12)'),
    'status diagnostic ids are not silently truncated',
  );
  assert(
    report.metrics.holds_scrape_due === report.metrics.holds_scrape_due_ids.length,
    'status metrics holds_scrape_due matches complete ids length',
  );
  assert(
    report.metrics.holds_scrape_due === report.holdsScrapeDue.length,
    'status exposes every due enrichment row',
  );
  assert(
    report.metrics.package_age_sec === null ||
      (typeof report.metrics.package_age_sec === 'number' && report.metrics.package_age_sec >= 0),
    'status metrics package_age_sec null or non-negative seconds',
  );
  assert(
    report.metrics.l1_snapshot_age_sec === null ||
      (typeof report.metrics.l1_snapshot_age_sec === 'number' && report.metrics.l1_snapshot_age_sec >= 0),
    'status metrics l1_snapshot_age_sec null or ≥0',
  );
  assert(
      'events_api_base' in report.metrics &&
      'events_api_age_sec' in report.metrics &&
      !('events_api_stale' in report.metrics) &&
      'events_api_config_published' in report.metrics &&
      !('events_api_published' in report.metrics),
    'status metrics events_api_* keys present',
  );
  assert(
    'events_active_has_active' in report.metrics &&
      'events_active_stage' in report.metrics &&
      'events_active_id' in report.metrics &&
      'events_active_title' in report.metrics &&
      'events_event_count' in report.metrics &&
      'events_fixture_count' in report.metrics,
    'status metrics events_active_* keys present',
  );
  assert(
    report.metrics.package_stale === 0 || report.metrics.package_stale === 1,
    'status metrics package_stale is 0|1',
  );
  assert(
    (report.metrics.package_stale === 1) ===
      (report.metrics.package_age_sec != null && report.metrics.package_age_sec > 600),
    'status metrics package_stale matches package age>600 regardless of focus pause',
  );
  assert(
    'invite_drain_total' in report.metrics &&
      'invite_drain_needs_url' in report.metrics &&
      'invite_drain_recorded' in report.metrics &&
      'invite_drain_age_sec' in report.metrics &&
      (report.metrics.invite_drain_stale === 0 || report.metrics.invite_drain_stale === 1) &&
      (report.metrics.invite_drain_stale === 1) ===
        (report.metrics.invite_drain_needs_url > 0 &&
          report.metrics.invite_drain_age_sec != null &&
          report.metrics.invite_drain_age_sec > 600),
    'status invite drain is stale only while a URL is needed',
  );
}

// ── loop status parse (P0: stdout must not be tail-sliced before JSON.parse) ──
{
  const big = {
    ok: true,
    total: 87,
    byState: { drafted: 26, disqualified: 48 },
    stuckOldest: Array.from({ length: 80 }, (_, i) => ({
      id: `waas-pad-${i}`,
      company: `PadCo${i}`,
      title: 'Founding Engineer',
      source: 'firecrawl:workatastartup',
    })),
  };
  const raw = JSON.stringify(big, null, 2);
  assert(raw.length > 6000, 'status fixture larger than old 6k run() slice');
  const tail = raw.slice(-6000);
  let tailOk = true;
  try {
    JSON.parse(tail);
  } catch {
    tailOk = false;
  }
  assert(tailOk === false, 'status tail-slice alone is not valid JSON (regression of old loop bug)');
  const parsed = parseCliJson(raw);
  assert(parsed?.ok === true && parsed.total === 87, 'parseCliJson full status → total');
  assert(parsed.byState?.drafted === 26, 'parseCliJson full status → byState');
  const noisy = `warn: ignore\n${raw}\n`;
  assert(parseCliJson(noisy)?.total === 87, 'parseCliJson tolerates leading noise');
  assert(parseCliJson('') === null, 'parseCliJson empty → null');
  assert(parseCliJson('not json') === null, 'parseCliJson garbage → null');
  assert(mayRunFunnelStages(0) === true, 'funnel loop: passing selftest allows stages');
  assert(mayRunFunnelStages(1) === false, 'funnel loop: failed selftest blocks all stages');
  const cycleSource = fs
    .readFileSync(path.join(__dirname, 'demigod-funnel-loop.mjs'), 'utf8')
    .match(/async function cycleOnce[\s\S]*?\n}\n\nasync function runLoop/)?.[0] || '';
  // normalize is post-collect only (run(execPath, ['demigod-funnel.mjs','normalize'], …));
  // pipeline owns --stage=all mutations; no draftNextBatch inside cycleOnce.
  assert(
    (cycleSource.match(/--stage=all/g) || []).length === 1 &&
      /demigod-funnel\.mjs['"],\s*['"]normalize['"]/.test(cycleSource) &&
      !cycleSource.includes('draftNextBatch('),
    'funnel loop: pipeline owns routine mutations; only post-collect normalize remains',
  );
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failed > 0 || skipped > 0) {
  if (skipped) console.error(`SKIPPED: ${[...skipReasons].map(([reason, count]) => `${reason}=${count}`).join(', ')}`);
  console.error(skipped ? `FAIL: ${skipped} checks skipped` : 'FAIL');
  process.exit(1);
}
console.log('ALL GREEN');
