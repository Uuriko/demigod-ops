#!/usr/bin/env node
/**
 * Events Bot owner-mode selftest (offline).
 *   DEMIGOD_EVENTS_BOT_MOCK=1 node demigod-events-bot-selftest.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import {
  eventsBotAgentTick,
  loadStore,
  saveStore,
  runTool,
  FREE_SF_VENUES,
  isSfLocation,
  mentionsNonSf,
  planTickNext,
  ownerPlanSuffix,
  matchFreeVenues,
  scoreFreeVenue,
  prioritizeOutreachQueue,
  outreachDrainSummary,
  normalizeOutreachKind,
  freeVenueShortlistLines,
  buildVenueResourceOutreachBody,
  defaultGuestMix,
  outreachDraftReadiness,
  outreachHasVenueShortlist,
  outreachNextWhy,
  OUTREACH_KIND_PRIORITY,
  matchOffersToEvent,
  offerIsSf,
  stampOfferMatches,
  resourceGaps,
  resourceOutreachCovered,
  eventNeedText,
  buildPartifulDraft,
  buildLumaDraft,
  writeInviteExport,
  eventsOutboxPath,
  outboxDraftIdFromName,
  collectOutboxStoreRefs,
  purgeOrphanOutboxFiles,
  isRealInviteUrl,
  stampInviteUrlIntoExport,
  recordInviteUrl,
  recordDebrief,
  parseDebriefEvidence,
  seedNextFromDebrief,
  idleReseedIfEmpty,
  driveCycle,
  parseSeedNextIntent,
  selftestTitleBlocked,
  isJunkCalendarTitle,
  isPublicCalendarVisible,
  sfTodayYmd,
  isFixtureOfferId,
  inviteDrainReport,
  writeInviteDrainBrief,
  isSelftestInviteDraft,
  parseHumanInviteUrlLines,
  absorbHumanInviteUrls,
  absorbHumanInviteDropFile,
  pickInviteUrlFromOutboxText,
  cleanInviteUrlCandidate,
  absorbInviteUrlsFromOutbox,
  parseStageAdvanceIntent,
  advanceLifecycleToward,
  canAdvanceStage,
  normalizeStage,
  hasPublishedInviteUrl,
  hasFutureDateTime,
  runStartReady,
  nativeRsvpIsOpen,
  reconcileLifecycleNotes,
  reconcilePlatformDrafts,
  openNativeRsvps,
  submitNativeRsvp,
  listNativeRsvps,
  publicEventView,
  isRealOutreachEmail,
  isExternalOutreachEmail,
  withIdentity,
  hygieneOutreachMx,
  buildOutreachDraft,
  hygieneOutreachQueue,
  enrichVenueOutreachBodies,
  IDENTITY_BLURB,
} from './demigod-events-bot-agent.mjs';
import { eventsBotChat, snapshotLine } from './demigod-events-bot-chat.mjs';

const offerSnapshot = snapshotLine({
  activeEvent: { id: 'ev_snapshot', title: 'Mission snapshot', stage: 'resource', city: 'San Francisco' },
  offers: {
    venue: [
      { id: 'venue_good', eventId: 'ev_snapshot', city: 'San Francisco', email: 'host@somaloft.co', offer: 'Mission loft' },
      { id: 'venue_rejected', eventId: 'ev_snapshot', city: 'San Francisco', email: 'host@somaloft.co', status: 'rejected', offer: 'Rejected loft' },
      { id: 'venue_oakland', eventId: 'ev_snapshot', city: 'Oakland', email: 'host@somaloft.co', offer: 'Oakland loft' },
      { id: 'venue_foreign', eventId: 'ev_other', city: 'San Francisco', email: 'host@somaloft.co', offer: 'Other event loft' },
    ],
  },
  outreach: [
    { id: 'draft_active', eventId: 'ev_snapshot', status: 'queued' },
    { id: 'draft_other', eventId: 'ev_other', status: 'queued' },
  ],
});
if (offerSnapshot.venues !== 1) throw new Error('chat snapshot must count only usable active-event offers');
if (offerSnapshot.outreachQueued !== 1) throw new Error('chat snapshot must count only active-event outreach');

const idleGaps = resourceGaps({ activeEvent: { id: null, stage: 'ideate', clearedFrom: 'evt_done' } });
if (idleGaps.stage !== null || idleGaps.missing.length) {
  throw new Error('cleared active-event shell must not report resource gaps');
}

const earlyInviteStore = {
  activeEvent: {
    id: 'ev_early',
    title: 'Early SF night',
    stage: 'resource',
    inviteDraft: 'too soon',
    inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_early',
    published_url: 'https://www.trydemigod.com/?p=event&id=ev_early',
    publishedUrl: 'https://www.trydemigod.com/?p=event&id=ev_early',
    rsvpTally: { source: 'demigod_native', yes: 0 },
  },
  events: [{
    id: 'ev_early',
    title: 'Early SF night',
    stage: 'resource',
    inviteDraft: 'too soon',
    inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_early',
    rsvpTally: { source: 'demigod_native', yes: 0 },
  }],
  platforms: {
    partiful: [{ id: 'pf_early', title: 'Early SF night', status: 'draft' }],
    luma: [{ id: 'lu_live', title: 'Early SF night', status: 'published_url' }],
    demigod: [
      { id: 'dg_ev_early', eventId: 'ev_early', status: 'published_url' },
      { id: 'dg_ev_other', eventId: 'ev_other', status: 'published_url' },
    ],
  },
};
if (
  reconcilePlatformDrafts(earlyInviteStore) !== 7 ||
  earlyInviteStore.platforms.partiful.length ||
  earlyInviteStore.platforms.luma.length !== 1 ||
  earlyInviteStore.platforms.demigod.length !== 1 ||
  earlyInviteStore.platforms.demigod[0].eventId !== 'ev_other' ||
  ['inviteDraft', 'inviteUrl', 'published_url', 'publishedUrl', 'rsvpTally'].some(
    (field) => field in earlyInviteStore.activeEvent,
  ) ||
  ['inviteDraft', 'inviteUrl', 'published_url', 'publishedUrl', 'rsvpTally'].some(
    (field) => field in earlyInviteStore.events[0],
  )
) throw new Error('premature invite reconciliation failed');

const evidencedRsvpStore = {
  activeEvent: {
    id: 'ev_real',
    stage: 'resource',
    inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_real',
    publishedUrl: 'https://www.trydemigod.com/?p=event&id=ev_real',
    rsvpTally: { source: 'demigod_native', yes: 1 },
  },
  platforms: { demigod: [{ id: 'dg_ev_real', eventId: 'ev_real', status: 'published_url' }] },
  rsvps: [
    {
      eventId: 'ev_real',
      source: 'demigod_native',
      status: 'yes',
      name: 'Real Guest',
      email: 'real@example.com',
    },
  ],
};
reconcilePlatformDrafts(evidencedRsvpStore);
if (
  evidencedRsvpStore.activeEvent.rsvpTally?.yes !== 1 ||
  !evidencedRsvpStore.activeEvent.inviteUrl ||
  !evidencedRsvpStore.activeEvent.publishedUrl ||
  evidencedRsvpStore.platforms.demigod[0]?.eventId !== 'ev_real'
) {
  throw new Error('premature invite reconciliation removed real RSVP evidence');
}

process.env.DEMIGOD_EVENTS_BOT_MOCK = '1';
delete process.env.OPENAI_API_KEY;
// Isolate all selftest store writes from prod DEMIGOD-EVENTS.json
// PID-unique path so concurrent funnel-loop + grok-busy selftests never thrash each other
const PROD_EVENTS_STORE = path.join(process.cwd(), 'DEMIGOD-EVENTS.json');
const SELFTEST_STORE =
  process.env.DEMIGOD_EVENTS_SELFTEST_STORE ||
  `/tmp/dg-events-selftest-store-${process.pid}-${Date.now().toString(36)}.json`;
process.env.DEMIGOD_EVENTS_STORE = SELFTEST_STORE;
const errs = [];
let checks = 0;
function ok(c, m) {
  checks++;
  if (!c) errs.push(m);
}
// Never flood prod events-bot-outbox from selftest (pid-unique)
const PROD_OUTBOX = path.join(process.cwd(), 'events-bot-outbox');
const SELFTEST_OUTBOX =
  process.env.DEMIGOD_EVENTS_SELFTEST_OUTBOX ||
  `/tmp/dg-events-selftest-outbox-${process.pid}-${Date.now().toString(36)}`;
process.env.DEMIGOD_EVENTS_OUTBOX = SELFTEST_OUTBOX;
try {
  fs.rmSync(SELFTEST_OUTBOX, { recursive: true, force: true });
} catch {
  /* */
}

const saveReconcileStore = structuredClone(earlyInviteStore);
saveReconcileStore.activeEvent.inviteUrl = 'https://www.trydemigod.com/?p=event&id=ev_early';
saveReconcileStore.activeEvent.rsvpTally = { source: 'demigod_native', yes: 0 };
saveReconcileStore.platforms.demigod.push({ id: 'dg_ev_early', eventId: 'ev_early', status: 'published_url' });
saveStore(saveReconcileStore);
const savedReconciledStore = loadStore();
if (
  savedReconciledStore.activeEvent.inviteUrl ||
  savedReconciledStore.activeEvent.rsvpTally ||
  savedReconciledStore.platforms.demigod.some((row) => row.eventId === 'ev_early') ||
  savedReconciledStore.platforms.luma[0]?.id !== 'lu_live'
) throw new Error('saveStore must reconcile premature native invite artifacts and preserve external evidence');

const unconfirmedPlanStore = structuredClone(evidencedRsvpStore);
unconfirmedPlanStore.rsvps = [];
unconfirmedPlanStore.activeEvent.stage = 'plan';
unconfirmedPlanStore.activeEvent.venue = { name: 'Unconfirmed room', confirmed: false };
unconfirmedPlanStore.events = [{ ...unconfirmedPlanStore.activeEvent }];
saveStore(unconfirmedPlanStore);
const savedUnconfirmedPlanStore = loadStore();
if (
  savedUnconfirmedPlanStore.activeEvent.inviteUrl ||
  savedUnconfirmedPlanStore.activeEvent.rsvpTally ||
  savedUnconfirmedPlanStore.platforms.demigod.some((row) => row.eventId === 'ev_real') ||
  openNativeRsvps(savedUnconfirmedPlanStore).error !== 'rsvp_stage_required'
) throw new Error('unconfirmed pre-RSVP event must fail closed without native invite artifacts');

saveStore({ version: 3, offers: { sponsor: [], venue: [], volunteer: [] }, outreach: [] });
const lockWorker = (field, id) =>
  new Promise((resolve) => {
    const code = `
      import { loadStore, saveStore, withEventsStoreLock } from './demigod-events-bot-agent.mjs';
      withEventsStoreLock(() => {
        const store = loadStore();
        const end = Date.now() + 100;
        while (Date.now() < end) {}
        if (${JSON.stringify(field)} === 'offer') store.offers.venue.push({ id: ${JSON.stringify(id)} });
        else store.outreach.push({ id: ${JSON.stringify(id)} });
        saveStore(store);
      });
    `;
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
      cwd: process.cwd(),
      env: { ...process.env, DEMIGOD_EVENTS_STORE: SELFTEST_STORE },
      stdio: 'ignore',
    });
    child.on('exit', (status) => resolve(status));
  });
const lockStatuses = await Promise.all([lockWorker('offer', 'lock_offer'), lockWorker('outreach', 'lock_outreach')]);
const lockedStore = loadStore();
ok(lockStatuses.every((status) => status === 0), 'storeLock: both worker processes exit cleanly');
ok(lockedStore.offers.venue.some((offer) => offer.id === 'lock_offer'), 'storeLock: preserves offer write');
ok(lockedStore.outreach.some((item) => item.id === 'lock_outreach'), 'storeLock: preserves outreach write');

ok(
  reconcileLifecycleNotes(
    'quiet room\n[plan] venue selected\n[rsvp] invite ready\n[ops] keep this',
    'resource',
  ) === 'quiet room\n[ops] keep this',
  'lifecycleNotes: removes transition notes ahead of rolled-back stage',
);

// Native RSVP lifecycle: a published invite accepts real RSVPs only while the event is at RSVP.
{
  const event = {
    id: 'ev_native_gate',
    title: 'Mission native RSVP night',
    stage: 'rsvp',
    seats: 12,
    city: 'San Francisco',
    audience: 'SF builders',
    outcome: 'Useful peer connections',
    venue: { name: 'Mission loft', city: 'San Francisco', capacity: 24, confirmed: true, confirmationEvidence: 'Venue host confirmed by email' },
    rsvpTally: { openedAt: '2026-07-21T00:00:00.000Z' },
    dayOfChecklist: ['stale run artifact'],
    hostFrame: 'stale run artifact',
  };
  const store = { activeEvent: event, events: [{ ...event }], platforms: { demigod: [] }, rsvps: [] };
  const externalOnlyStore = {
    activeEvent: { ...event },
    events: [{ ...event }],
    platforms: {
      demigod: [],
      partiful: [{
        id: 'pf_native_gate',
        eventId: event.id,
        status: 'published_url',
        inviteUrl: 'https://partiful.com/e/native-gate',
      }],
    },
    rsvps: [],
  };
  ok(hasPublishedInviteUrl(externalOnlyStore.activeEvent, externalOnlyStore) === true, 'nativeRsvpLifecycle: external invite is valid lifecycle evidence');
  ok(nativeRsvpIsOpen(externalOnlyStore.activeEvent, externalOnlyStore) === false, 'nativeRsvpLifecycle: external invite does not open native intake');
  ok(publicEventView(externalOnlyStore, event.id).event.rsvpOpen === false, 'nativeRsvpLifecycle: external-only public view keeps native intake closed');
  ok(submitNativeRsvp(externalOnlyStore, { eventId: event.id, name: 'Split Guest', email: 'split@example.org' }).error === 'rsvp_not_open', 'nativeRsvpLifecycle: external-only event rejects native RSVP');
  ok(externalOnlyStore.rsvps.length === 0, 'nativeRsvpLifecycle: rejected split RSVP does not mutate store');
  ok(openNativeRsvps(store).ok === true, 'nativeRsvpLifecycle: opens at RSVP');
  ok(event.rsvpTally.channel === 'Demigod native RSVP', 'nativeRsvpLifecycle: native channel replaces stale platform copy');
  ok(
    typeof event.inviteDraft === 'string' &&
      event.inviteDraft.includes(event.inviteUrl) &&
      !/Partiful|Luma/.test(event.inviteDraft),
    'nativeRsvpLifecycle: invite copy uses native URL',
  );
  ok(event.checklist?.find((c) => c.id === 'rsvp_tally')?.done === true, 'nativeRsvpLifecycle: rsvp_tally done when form opens');
  ok(event.checklist?.find((c) => c.id === 'rsvp_remind')?.done === false, 'nativeRsvpLifecycle: rsvp_remind stays open until drafts queue');
  ok(!event.dayOfChecklist && !event.hostFrame, 'nativeRsvpLifecycle: clears stale run artifacts');
  ok(!store.events[0].dayOfChecklist && !store.events[0].hostFrame, 'nativeRsvpLifecycle: clears mirrored run artifacts');
  ok(store.events[0].inviteUrl === event.inviteUrl && store.events[0].checklist?.[0]?.id === 'rsvp_tally', 'nativeRsvpLifecycle: syncs event snapshot');
  ok(nativeRsvpIsOpen(event, store) === true, 'nativeRsvpLifecycle: published RSVP is open');
  ok(listNativeRsvps(store, 'ev_typo').error === 'event_not_found', 'nativeRsvpLifecycle: rejects unknown host list event');
  const invalidInviteStore = { ...store, activeEvent: { ...event, inviteUrl: 'javascript:alert(1)', published_url: null, publishedUrl: null }, platforms: {} };
  ok(publicEventView(invalidInviteStore, event.id).event.inviteUrl === null, 'nativeRsvpLifecycle: hides invalid invite URL');
  const wrongInviteStore = { ...store, activeEvent: { ...event, inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_other', published_url: null, publishedUrl: null }, platforms: {} };
  ok(publicEventView(wrongInviteStore, event.id).event.inviteUrl === null, 'nativeRsvpLifecycle: hides another event invite URL');
  const resourceView = publicEventView({ activeEvent: { ...event, stage: 'resource', venue: { name: 'Unconfirmed café', confirmed: false }, dateWindows: ['Thursday evening'], hostFrame: 'private ops notes' }, rsvps: [{ eventId: event.id, status: 'yes' }] }, event.id).event;
  ok(resourceView.venue === null && resourceView.dateWindows === null && resourceView.inviteUrl === null && resourceView.rsvpYes === 0 && !('hostFrame' in resourceView), 'nativeRsvpLifecycle: hides speculative resource details and RSVP totals');
  ok(submitNativeRsvp(store, { eventId: event.id, name: 'Real Guest', email: 'guest@example.org' }).ok === true, 'nativeRsvpLifecycle: accepts real RSVP');
  event.stage = 'run';
  ok(nativeRsvpIsOpen(event, store) === false, 'nativeRsvpLifecycle: closes at run');
  ok(publicEventView(store, event.id).event.rsvpOpen === false, 'nativeRsvpLifecycle: public view closes at run');
  ok(submitNativeRsvp(store, { eventId: event.id, name: 'Late Guest', email: 'late@example.org' }).error === 'rsvp_not_open', 'nativeRsvpLifecycle: rejects late RSVP');
  ok(openNativeRsvps(store).error === 'rsvp_stage_required', 'nativeRsvpLifecycle: cannot reopen after RSVP');
}
try {
  fs.mkdirSync(SELFTEST_OUTBOX, { recursive: true });
} catch {
  /* */
}
function countDirFiles(dir) {
  try {
    return fs.readdirSync(dir).filter((n) => n && !n.startsWith('.')).length;
  } catch {
    return 0;
  }
}
function listDirNames(dir) {
  try {
    return fs.readdirSync(dir).filter((n) => n && !n.startsWith('.'));
  } catch {
    return [];
  }
}
// Snapshot names — concurrent non-selftest prod outbox activity is out of scope.
const prodOutboxNamesAtStart = new Set(listDirNames(PROD_OUTBOX));
const prodOutboxCountAtStart = prodOutboxNamesAtStart.size;
const prodShaAtStart = fs.existsSync(PROD_EVENTS_STORE)
  ? crypto.createHash('sha256').update(fs.readFileSync(PROD_EVENTS_STORE)).digest('hex')
  : null;
// Seed isolated store (copy prod structure if present; never write back to prod)
{
  const seed = fs.existsSync(PROD_EVENTS_STORE)
    ? JSON.parse(fs.readFileSync(PROD_EVENTS_STORE, 'utf8'))
    : { version: 3, events: [], offers: { sponsor: [], venue: [], volunteer: [] }, ideas: [], feedback: [], outreach: [], platforms: {} };
  seed.activeEvent = { id: null, title: '', stage: 'ideate', city: 'San Francisco' };
  seed.outreach = [];
  seed.platforms = { luma: [], partiful: [] };
  seed.ideas = [];
  // Drop any residual selftest-titled events from the prod copy seed
  if (Array.isArray(seed.events)) {
    seed.events = seed.events.filter(
      (e) => e && !/\bselftest\b|\bfixture\b/i.test(String(e.title || '')),
    );
  }
  fs.writeFileSync(SELFTEST_STORE, JSON.stringify(seed, null, 2) + '\n');
}

// Readers must never expose a stale events[] snapshot for the canonical active event.
{
  const stale = loadStore();
  stale.activeEvent = { id: 'ev_stale_snapshot', title: 'Mission snapshot check', stage: 'resource', city: 'San Francisco' };
  stale.events.push({ ...stale.activeEvent, stage: 'plan' });
  fs.writeFileSync(SELFTEST_STORE, JSON.stringify(stale, null, 2) + '\n');
  const reconciled = loadStore();
  ok(reconciled.events.find((event) => event.id === stale.activeEvent.id)?.stage === 'resource', 'loadStore reconciles stale active-event snapshot');
  reconciled.activeEvent = { id: null, title: '', stage: 'ideate', city: 'San Francisco' };
  reconciled.events = reconciled.events.filter((event) => event.id !== 'ev_stale_snapshot');
  fs.writeFileSync(SELFTEST_STORE, JSON.stringify(reconciled, null, 2) + '\n');
}

ok(FREE_SF_VENUES.length >= 5, 'free venues list');
ok(new Set(FREE_SF_VENUES.map((v) => v.id)).size === FREE_SF_VENUES.length, 'free venue ids unique');
ok(
  runTool('spin_up_event', { title: 'Mission capacity guard', seats: -1 }).error ===
    'seats must be a positive integer' && !loadStore().activeEvent?.id,
  'event seat writes reject invalid capacity without mutation',
);
ok(
  runTool('record_idea', { audience: 'SF builders' }).error === 'title required' &&
    runTool('spin_up_event', { audience: 'SF builders' }).error === 'title required' &&
    !loadStore().activeEvent?.id && !loadStore().ideas.length,
  'idea and event writes reject blank titles without mutation',
);
{
  const before = fs.readFileSync(SELFTEST_STORE);
  ok(
    runTool('record_idea', { title: 'SF missing audience', outcome: 'meet peers', seats: 8 }).ok === false &&
      runTool('spin_up_event', { title: 'SF missing outcome', audience: 'SF builders', seats: 8 }).ok === false &&
      fs.readFileSync(SELFTEST_STORE).equals(before),
    'idea and event writes reject missing audience brief without mutation',
  );
  const invalid = loadStore();
  invalid.activeEvent = {
    id: 'ev_missing_brief',
    title: 'SF incomplete event',
    stage: 'resource',
    city: 'San Francisco',
    seats: 8,
    inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_missing_brief',
    rsvpTally: { source: 'demigod_native', yes: 0 },
  };
  invalid.events = [{ ...invalid.activeEvent }];
  invalid.platforms = { demigod: [{ id: 'dg_ev_missing_brief', eventId: 'ev_missing_brief' }] };
  invalid.untouched = { sentinel: 'same' };
  fs.writeFileSync(SELFTEST_STORE, JSON.stringify(invalid, null, 2) + '\n');
  const blocked = runTool('drive_cycle', { goal: 'must not advance incomplete event' });
  const cleaned = loadStore();
  const outreachAfter = Array.isArray(cleaned.outreach) ? cleaned.outreach : [];
  ok(
    blocked.ok === false &&
      blocked.error === 'need_audience_and_outcome' &&
      Array.isArray(blocked.missing) &&
      blocked.missing.includes('audience') &&
      blocked.plan &&
      blocked.plan.blocker === 'lifecycle invariant' &&
      blocked.log.some((step) => step.step === 'drop_premature_invites') &&
      blocked.log.some((step) => step.step === 'blocked_lifecycle') &&
      !cleaned.activeEvent.inviteUrl &&
      !cleaned.activeEvent.rsvpTally &&
      !cleaned.events[0].inviteUrl &&
      !cleaned.events[0].rsvpTally &&
      cleaned.platforms.demigod.length === 0 &&
      cleaned.activeEvent.stage === 'resource' &&
      !cleaned.activeEvent.audience &&
      Array.isArray(cleaned.activeEvent.checklist) &&
      cleaned.activeEvent.checklist.length > 0 &&
      cleaned.activeEvent.guestMix?.status === 'planning_target' &&
      outreachAfter.length === 0 &&
      JSON.stringify(cleaned.untouched) === JSON.stringify(invalid.untouched),
    'drive cleans premature invites, normalizes checklist/guestMix, then blocks incomplete event with planTickNext',
  );
  fs.writeFileSync(SELFTEST_STORE, before);
}
{
  const before = fs.readFileSync(SELFTEST_STORE);
  const legacy = loadStore();
  legacy.ideas = [{ id: 'idea_legacy', title: 'Mission Repair Dinner', outcome: 'keep existing outcome' }];
  legacy.activeEvent = {
    id: 'ev_legacy_repair',
    title: 'Mission Repair Dinner',
    stage: 'resource',
    inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_legacy_repair',
    published_url: 'https://www.trydemigod.com/?p=event&id=ev_legacy_repair',
    publishedUrl: 'https://www.trydemigod.com/?p=event&id=ev_legacy_repair',
    rsvpTally: { source: 'demigod_native', yes: 0 },
    guestMix: defaultGuestMix({ seats: 8 }),
  };
  legacy.events = [{ ...legacy.activeEvent }];
  legacy.platforms = { demigod: [{ id: 'dg_ev_legacy_repair', eventId: 'ev_legacy_repair' }] };
  fs.writeFileSync(SELFTEST_STORE, JSON.stringify(legacy, null, 2) + '\n');
  const repaired = runTool('record_idea', {
    title: 'Mission Repair Dinner',
    audience: 'SF neighbors',
    outcome: 'replace existing outcome',
    seats: 12,
    format: 'dinner',
    needs: 'quiet room',
    sponsorable: 'meal sponsor',
  });
  const after = loadStore();
  ok(
    repaired.deduped &&
      ['audience', 'seats', 'format', 'needs', 'sponsorable'].every((field) => after.ideas[0][field]) &&
      after.ideas[0].outcome === 'keep existing outcome' &&
      after.activeEvent.audience === 'SF neighbors' &&
      after.activeEvent.outcome === 'keep existing outcome' &&
      after.activeEvent.seats === 12 &&
      after.activeEvent.guestMix.seats === 12 &&
      after.activeEvent.guestMix.cohorts[0].fit === 'SF neighbors' &&
      !after.activeEvent.inviteUrl &&
      !after.activeEvent.published_url &&
      !after.activeEvent.publishedUrl &&
      !after.activeEvent.rsvpTally &&
      after.platforms.demigod.length === 0,
    'recordIdea: dedupe repairs matching active event and reconciles premature native artifacts',
  );
  const respun = runTool('spin_up_event', {
    title: 'Mission Repair Dinner',
    audience: 'SF neighbors',
    outcome: 'keep existing outcome',
    dateWindows: ['2099-08-14T18:30:00-07:00'],
    notes: 'Bring the repaired schedule forward',
  });
  const scheduled = loadStore();
  ok(
    respun.deduped &&
      scheduled.activeEvent.dateWindows[0] === '2099-08-14T18:30:00-07:00' &&
      scheduled.activeEvent.notes === 'Bring the repaired schedule forward' &&
      scheduled.events[0].dateWindows[0] === '2099-08-14T18:30:00-07:00' &&
      scheduled.events[0].notes === 'Bring the repaired schedule forward',
    'spinUpEvent: dedupe repairs supplied schedule fields and syncs the event snapshot',
  );
  fs.writeFileSync(SELFTEST_STORE, before);
}
ok(isSfLocation('SoMa loft') === true || isSfLocation('San Francisco Mission') === true, 'SF ok');
ok(isSfLocation('Oakland warehouse') === false, 'Oakland reject');
ok(isSfLocation('South City loft') === false, 'South City (SSF) reject');
ok(isSfLocation('South San Francisco venue') === false, 'South San Francisco reject');
ok(isSfLocation('South San Francisco') === false, 'SSF city reject');
ok(isSfLocation('South SF loft') === false, 'South SF shorthand reject');
ok(isSfLocation('SSF warehouse') === false, 'SSF abbrev reject');
ok(isSfLocation('Burlingame office') === false, 'Burlingame reject');
ok(isSfLocation('San Bruno office') === false, 'San Bruno reject');
ok(isSfLocation('Millbrae') === false, 'Millbrae reject');
ok(isSfLocation('Half Moon Bay dinner') === false, 'Half Moon Bay reject');
ok(isSfLocation('San Gregorio dinner') === false, 'San Gregorio reject');
ok(isSfLocation('Cambridge MA dinner') === false, 'unlisted city + state code reject');
ok(isSfLocation('Mystery Loft tx') === false, 'lowercase non-CA state code reject');
ok(isSfLocation('Mission SF dinner') === true, 'SF abbreviation still accepted');
ok(isSfLocation('La Honda retreat') === false, 'La Honda reject');
ok(isSfLocation('Davenport coast dinner') === false, 'Davenport reject');
ok(mentionsNonSf('Loma Mar lodge night') === true, 'Loma Mar chat geo reject');
ok(
  mentionsNonSf('Imagine and plan one original in-person San Francisco event. Decide the audience, format, approximate size, timing, venue type, run of show, and resource plan. Return one practical draft. Do not send, book, publish, charge, or invent RSVPs.') === false,
  'default one-click prompt is not mistaken for Oregon',
);
ok(offerIsSf({ city: 'La Honda', offer: 'room for 12' }) === false, 'La Honda offer reject');
ok(offerIsSf({ city: 'Civic Center', offer: 'meeting room for 12' }) === true, 'Civic Center offer accepted');
ok(offerIsSf({ city: 'Ingleside', offer: 'room for 12' }) === true, 'Ingleside offer accepted');
ok(isSfLocation('Mare Island warehouse') === false, 'Mare Island reject');
ok(isSfLocation('Mission') === true, 'Mission still SF');
ok(isSfLocation('NYC rooftop') === false, 'NYC reject');
ok(isSfLocation('Paris founder dinner') === false, 'Paris reject');
ok(isSfLocation('Tokyo founder dinner') === false, 'Tokyo reject');
ok(isSfLocation('Berlin founder dinner') === false, 'Berlin reject');
ok(isSfLocation('Las Vegas founder dinner') === false, 'Las Vegas reject');
ok(isSfLocation('Salt Lake City meetup') === false, 'Salt Lake City reject');
ok(isSfLocation('Cambridge, MA office') === false, 'explicit non-CA state reject');
ok(isSfLocation('San Francisco, CA') === true, 'explicit CA keeps SF');
ok(isSfLocation('123 Coast Highway') === false, 'unlocated numbered highway rejects');
ok(isSfLocation('123 Coast Highway, San Francisco') === true, 'SF numbered highway accepts');
// CA cities outside SF proper must not default-pass (generic-title branch)
ok(isSfLocation('Sacramento') === false, 'Sacramento reject');
ok(isSfLocation('San Diego office') === false, 'San Diego reject');
ok(isSfLocation('Santa Cruz warehouse') === false, 'Santa Cruz reject');
ok(isSfLocation('San Juan Bautista dinner') === false, 'San Juan Bautista reject');
ok(isSfLocation('NYC event, SF audience') === false, 'NON_SF wins over SF audience');
ok(isSfLocation('gala night') === false, 'generic title without SF evidence rejects');
ok(isSfLocation('gala night San Francisco') === true, 'generic title with SF evidence accepts');
ok(isSfLocation('Richmond') === true, 'Richmond district still SF');
ok(isSfLocation('Treasure Island') === true, 'Treasure Island SF still accepted');
ok(isSfLocation('Treasure Island, Florida') === false, 'Treasure Island Florida reject');
// SF geo residual: Castro Valley ≠ the Castro; bare Bay Area / North Bay / Marin (not Marina);
// virtual|online-only remote; leftover peninsula/north-bay cities
ok(isSfLocation('Castro') === true, 'the Castro still SF');
ok(isSfLocation('Castro dinner') === true, 'Castro dinner still SF');
ok(isSfLocation('Castro Valley') === false, 'Castro Valley East Bay reject');
ok(isSfLocation('castro valley loft') === false, 'castro valley loft reject');
ok(isSfLocation('Bay Area dinner') === false, 'bare Bay Area reject');
ok(isSfLocation('SF Bay Area loft') === false, 'SF Bay Area broad reject');
ok(isSfLocation('San Francisco Bay Area') === false, 'San Francisco Bay Area broad reject');
ok(isSfLocation('North Bay farm') === false, 'North Bay reject');
ok(isSfLocation('Marin') === false, 'Marin bare reject');
ok(isSfLocation('Muir Beach dinner') === false, 'Muir Beach reject');
ok(isSfLocation('San Geronimo house') === false, 'San Geronimo Marin reject');
ok(isSfLocation('Marina') === true, 'Marina district still SF');
ok(isSfLocation('Marina district') === true, 'Marina district phrase still SF');
ok(isSfLocation('Tiburon house') === false, 'Tiburon reject');
ok(isSfLocation('Santa Clara office') === false, 'Santa Clara reject');
ok(isSfLocation('Los Altos house') === false, 'Los Altos reject');
ok(isSfLocation('Dublin office') === false, 'Dublin reject');
ok(isSfLocation('Redwood Shores office') === false, 'Redwood Shores reject');
ok(isSfLocation('Vallejo warehouse') === false, 'Vallejo reject');
ok(isSfLocation('virtual SF meetup') === false, 'virtual SF remote reject');
ok(isSfLocation('online only SF founders') === false, 'online only remote reject');
ok(isSfLocation('online-only SF') === false, 'online-only remote reject');
ok(isSfLocation('streaming-only SF founders') === false, 'streaming-only remote reject');
ok(isSfLocation('Slack huddle') === false, 'Slack huddle remote reject');
ok(isSfLocation('Slack huddle in Mission') === true, 'Slack huddle with SF room accepted');
ok(isSfLocation('online event') === false, 'plain online event remote reject');
ok(isSfLocation('online event + Mission room') === true, 'online hybrid SF room still ok');
ok(isSfLocation('hybrid Zoom + SF loft') === true, 'hybrid SF room still ok');
ok(isSfLocation('Zoom meetup') === false, 'plain Zoom meetup remote reject');
ok(isSfLocation('Gather.town meetup') === false, 'Gather.town meetup remote reject');
ok(isSfLocation('Gather meetup + Mission room') === true, 'Gather hybrid with SF room still ok');
ok(isSfLocation('Zoom webinar') === false, 'plain Zoom webinar remote reject');
ok(isSfLocation('founder webinar') === false, 'plain webinar remote reject');
ok(isSfLocation('founder webinar at a Mission room') === true, 'webinar with SF room still ok');
ok(isSfLocation('YouTube Live event') === false, 'plain YouTube Live event remote reject');
ok(isSfLocation('YouTube Live event + Mission room') === true, 'YouTube Live hybrid SF room still ok');
ok(isSfLocation('livestream event') === false, 'plain livestream event remote reject');
ok(isSfLocation('livestream event + Mission room') === true, 'livestream hybrid SF room still ok');
ok(isSfLocation('Mission room with Zoom webinar') === true, 'Zoom webinar with SF room still ok');
ok(isSfLocation('Discord meetup') === false, 'plain Discord meetup remote reject');
ok(isSfLocation('hybrid Discord + Mission room') === true, 'hybrid Discord with SF room still ok');
ok(mentionsNonSf('host a Zoom event') === true, 'mentionsNonSf plain Zoom event');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF after residual');
ok(isSfLocation('Cambridge founders dinner') === false, 'Cambridge reject');
ok(mentionsNonSf('Cambridge loft') === true, 'mentionsNonSf Cambridge');
ok(offerIsSf({ city: 'Cambridge', offer: 'dinner room' }) === false, 'offer Cambridge reject');
// SF geo residual-2: East Bay cities + SFO (San Mateo Co) + Richmond city form + remote-only variants
ok(isSfLocation('El Cerrito loft') === false, 'El Cerrito East Bay reject');
ok(isSfLocation('Albany warehouse') === false, 'Albany East Bay reject');
ok(isSfLocation('Piedmont dinner') === false, 'Piedmont city reject');
ok(isSfLocation('Moraga house') === false, 'Moraga reject');
ok(isSfLocation('Hercules warehouse') === false, 'Hercules reject');
ok(isSfLocation('Pinole office') === false, 'Pinole reject');
ok(isSfLocation('San Pablo loft') === false, 'San Pablo reject');
ok(isSfLocation('SFO meetup') === false, 'SFO airport reject');
ok(isSfLocation('San Francisco International Airport hang') === false, 'SFO full name reject');
ok(isSfLocation('Richmond') === true, 'bare Richmond district still SF');
ok(isSfLocation('Richmond, CA') === false, 'Richmond city CA reject');
ok(isSfLocation('Richmond California warehouse') === false, 'Richmond California reject');
ok(isSfLocation('video-only SF founders') === false, 'video-only remote reject');
ok(isSfLocation('webinar only SF') === false, 'webinar only remote reject');
ok(isSfLocation('fully remote SF team') === false, 'fully remote reject');
ok(isSfLocation('Outer Sunset salon') === true, 'Outer Sunset still SF after residual-2');
// SF geo residual-3: Contra Costa/Solano + farther South Bay + Monterey coast +
// Silicon Valley region + Oyster Point (SSF) + remote-first / chat-app-only tokens
ok(isSfLocation('Pittsburg CA warehouse') === false, 'Pittsburg East Bay reject');
ok(isSfLocation('Martinez loft') === false, 'Martinez reject');
ok(isSfLocation('Benicia warehouse') === false, 'Benicia reject');
ok(isSfLocation('Rodeo CA') === false, 'Rodeo reject');
ok(isSfLocation('Crockett loft') === false, 'Crockett reject');
ok(isSfLocation('Newark CA office') === false, 'Newark CA reject');
ok(isSfLocation('American Canyon loft') === false, 'American Canyon reject');
ok(isSfLocation('Suisun City warehouse') === false, 'Suisun City reject');
ok(isSfLocation('Vacaville office') === false, 'Vacaville reject');
ok(isSfLocation('Gilroy warehouse') === false, 'Gilroy reject');
ok(isSfLocation('Morgan Hill loft') === false, 'Morgan Hill reject');
ok(isSfLocation('Hollister office') === false, 'Hollister reject');
ok(isSfLocation('Carmel loft') === false, 'Carmel reject');
ok(isSfLocation('Pacific Grove dinner') === false, 'Pacific Grove reject');
ok(isSfLocation('Seaside CA hang') === false, 'Seaside CA reject');
ok(isSfLocation('Silicon Valley meetup') === false, 'Silicon Valley region reject');
ok(isSfLocation('Oyster Point loft') === false, 'Oyster Point SSF reject');
ok(isSfLocation('teams-only meetup') === false, 'teams-only remote reject');
ok(isSfLocation('discord only founders') === false, 'discord-only remote reject');
ok(isSfLocation('phone-only call') === false, 'phone-only remote reject');
ok(isSfLocation('slack-only hangout') === false, 'slack-only remote reject');
ok(isSfLocation('google meet only SF') === false, 'google meet only remote reject');
ok(isSfLocation('remote-first SF founders') === false, 'remote-first reject');
ok(isSfLocation('microsoft teams only') === false, 'microsoft teams only reject');
ok(isSfLocation('Japantown salon') === true, 'Japantown still SF after residual-3');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams + SF room still ok');
ok(isSfLocation('Outer Richmond dinner') === true, 'Outer Richmond still SF after residual-3');
// SF geo residual-4: nearby Marin/East Bay towns must not default-pass as generic titles
ok(isSfLocation('San Anselmo dinner') === false, 'San Anselmo reject');
ok(isSfLocation('Fairfax house') === false, 'Fairfax reject');
ok(isSfLocation('Ross garden') === false, 'Ross reject');
ok(isSfLocation('San Lorenzo office') === false, 'San Lorenzo reject');
ok(isSfLocation('El Sobrante warehouse') === false, 'El Sobrante reject');
ok(isSfLocation('Russian Hill dinner') === true, 'Russian Hill still SF after residual-4');
// SF geo residual-5: more peninsula/Marin/East Bay/North Bay that default-passed
ok(isSfLocation('Belvedere house') === false, 'Belvedere reject');
ok(isSfLocation('Kentfield dinner') === false, 'Kentfield reject');
ok(isSfLocation('Greenbrae loft') === false, 'Greenbrae reject');
ok(isSfLocation('Bolinas beach hang') === false, 'Bolinas reject');
ok(isSfLocation('Stinson Beach picnic') === false, 'Stinson Beach reject');
ok(isSfLocation('Point Reyes cabin') === false, 'Point Reyes reject');
ok(isSfLocation('Kensington loft') === false, 'Kensington reject');
ok(isSfLocation('Point Richmond warehouse') === false, 'Point Richmond reject');
ok(isSfLocation('Brentwood CA dinner') === false, 'Brentwood reject');
ok(isSfLocation('Oakley office') === false, 'Oakley reject');
ok(isSfLocation('Clayton loft') === false, 'Clayton reject');
ok(isSfLocation('Blackhawk dinner') === false, 'Blackhawk reject');
ok(isSfLocation('Alamo CA dinner') === false, 'Alamo CA reject');
ok(isSfLocation('Alamo Square picnic') === true, 'Alamo Square still SF');
ok(isSfLocation('Portola Valley house') === false, 'Portola Valley reject');
ok(isSfLocation('Portola district dinner') === true, 'Portola district still SF');
ok(isSfLocation('Woodside dinner') === false, 'Woodside reject');
ok(isSfLocation('Hillsborough loft') === false, 'Hillsborough reject');
ok(isSfLocation('Saratoga office') === false, 'Saratoga reject');
ok(isSfLocation('Monte Sereno house') === false, 'Monte Sereno reject');
ok(isSfLocation('Pescadero dinner') === false, 'Pescadero reject');
ok(isSfLocation('Moss Beach loft') === false, 'Moss Beach reject');
ok(isSfLocation('Rohnert Park warehouse') === false, 'Rohnert Park reject');
ok(isSfLocation('Cotati loft') === false, 'Cotati reject');
ok(isSfLocation('Healdsburg dinner') === false, 'Healdsburg reject');
ok(isSfLocation('Sebastopol dinner') === false, 'Sebastopol reject');
ok(isSfLocation('Scotts Valley office') === false, 'Scotts Valley reject');
ok(isSfLocation('Watsonville warehouse') === false, 'Watsonville reject');
ok(isSfLocation('Salinas loft') === false, 'Salinas reject');
ok(isSfLocation('Cow Hollow dinner') === true, 'Cow Hollow still SF after residual-5');
ok(isSfLocation('West Portal salon') === true, 'West Portal still SF after residual-5');
// SF geo residual-6: North Bay/peninsula + CA cities + remote variants that default-passed
ok(isSfLocation('Windsor dinner') === false, 'Windsor North Bay reject');
ok(isSfLocation('Calistoga dinner') === false, 'Calistoga North Bay reject');
ok(isSfLocation('Cloverdale loft') === false, 'Cloverdale reject');
ok(isSfLocation('Broadmoor warehouse') === false, 'Broadmoor peninsula reject');
ok(isSfLocation('Tri-Valley office') === false, 'Tri-Valley region reject');
ok(isSfLocation('Bakersfield office') === false, 'Bakersfield reject');
ok(isSfLocation('Chico warehouse') === false, 'Chico reject');
ok(isSfLocation('Eureka loft') === false, 'Eureka reject');
ok(isSfLocation('Redding meetup') === false, 'Redding reject');
ok(isSfLocation('Anaheim conference') === false, 'Anaheim reject');
ok(isSfLocation('Pasadena house') === false, 'Pasadena reject');
ok(isSfLocation('Burbank studio') === false, 'Burbank reject');
ok(isSfLocation('Roseville loft') === false, 'Roseville reject');
ok(isSfLocation('San Luis Obispo dinner') === false, 'SLO full reject');
ok(isSfLocation('SLO office') === false, 'SLO abbrev reject');
ok(isSfLocation('Folsom, CA dinner') === false, 'Folsom CA city reject');
ok(isSfLocation('Folsom California warehouse') === false, 'Folsom California reject');
ok(isSfLocation('Folsom Street loft') === true, 'Folsom Street still SF after residual-6');
ok(isSfLocation('Angel Island picnic') === false, 'Angel Island Marin reject');
ok(isSfLocation('Treasure Island picnic') === true, 'Treasure Island still SF');
ok(isSfLocation('webex-only SF founders') === false, 'webex-only remote reject');
ok(isSfLocation('skype only SF') === false, 'skype only remote reject');
ok(isSfLocation('async-only meetup') === false, 'async-only remote reject');
ok(isSfLocation('distributed-only team') === false, 'distributed-only remote reject');
ok(isSfLocation('facetime-only hang') === false, 'facetime-only remote reject');
ok(isSfLocation('Zoom') === false, 'bare Zoom location reject');
ok(isSfLocation('Google Meet') === false, 'bare Google Meet location reject');
ok(isSfLocation('Mission room with Zoom option') === true, 'hybrid SF room with Zoom stays valid');
ok(isSfLocation('Cow Hollow dinner') === true, 'Cow Hollow still SF after residual-6');
ok(isSfLocation('Portola district dinner') === true, 'Portola district still SF after residual-6');
// SF geo residual-7: Tahoe/Truckee nights must not default-pass as generic titles
ok(isSfLocation('Lake Tahoe founder retreat') === false, 'Lake Tahoe reject');
ok(mentionsNonSf('Truckee cabin dinner') === true, 'mentionsNonSf Truckee');
ok(offerIsSf({ city: 'San Francisco', offer: 'South Lake Tahoe venue' }) === false, 'offer Tahoe reject');
ok(offerIsSf({ city: 'Mars', offer: 'room for 12' }) === false, 'offer unknown city reject');
ok(offerIsSf({ city: 'Portola Valley', offer: 'house for 12' }) === false, 'offer Portola Valley city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Belvedere spillover' }) === false, 'offer blob Belvedere reject');
ok(offerIsSf({ city: 'Alamo Square', offer: 'room for 10' }) === true, 'offer Alamo Square city ok');
ok(offerIsSf({ city: 'Windsor', offer: 'room for 12' }) === false, 'offer Windsor city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Bakersfield spillover' }) === false, 'offer blob Bakersfield reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'webex-only stream' }) === false, 'offer blob webex-only reject');
ok(offerIsSf({ city: 'Folsom Street', offer: 'room for 10' }) === true, 'offer Folsom Street city ok');
ok(mentionsNonSf('Portola Valley') === true, 'mentionsNonSf Portola Valley');
ok(mentionsNonSf('Portola district') === false, 'mentionsNonSf Portola district still SF');
ok(mentionsNonSf('Alamo Square') === false, 'mentionsNonSf Alamo Square not Alamo CA');
ok(mentionsNonSf('Windsor') === true, 'mentionsNonSf Windsor');
ok(mentionsNonSf('Tri-Valley') === true, 'mentionsNonSf Tri-Valley');
ok(mentionsNonSf('webex-only') === true, 'mentionsNonSf webex-only');
ok(mentionsNonSf('Folsom Street') === false, 'mentionsNonSf Folsom Street still SF');
// SF geo residual-8: Tahoe City/Sierra/Reno + Richmond CA (no comma) + retreat/LA/SD that default-passed
ok(isSfLocation('Tahoe City cabin') === false, 'Tahoe City reject');
ok(isSfLocation('Incline Village retreat') === false, 'Incline Village reject');
ok(isSfLocation('Kings Beach hang') === false, 'Kings Beach reject');
ok(isSfLocation('Olympic Valley loft') === false, 'Olympic Valley reject');
ok(isSfLocation('South Shore Tahoe dinner') === false, 'South Shore Tahoe reject');
ok(isSfLocation('Reno founders dinner') === false, 'Reno reject');
ok(isSfLocation('Carson City loft') === false, 'Carson City reject');
ok(isSfLocation('Grass Valley loft') === false, 'Grass Valley reject');
ok(isSfLocation('Nevada City dinner') === false, 'Nevada City reject');
ok(isSfLocation('Auburn warehouse') === false, 'Auburn reject');
ok(isSfLocation('Placerville loft') === false, 'Placerville reject');
ok(isSfLocation('El Dorado Hills loft') === false, 'El Dorado Hills reject');
ok(isSfLocation('Mendocino coastal') === false, 'Mendocino reject');
ok(isSfLocation('Big Sur retreat') === false, 'Big Sur reject');
ok(isSfLocation('Yosemite cabin') === false, 'Yosemite reject');
ok(isSfLocation('Fort Bragg loft') === false, 'Fort Bragg reject');
ok(isSfLocation('Ukiah warehouse') === false, 'Ukiah reject');
ok(isSfLocation('Yountville dinner') === false, 'Yountville reject');
ok(isSfLocation('St Helena loft') === false, 'St Helena reject');
ok(isSfLocation('St. Helena loft') === false, 'St. Helena reject');
ok(isSfLocation('Rocklin loft') === false, 'Rocklin reject');
ok(isSfLocation('Elk Grove warehouse') === false, 'Elk Grove reject');
ok(isSfLocation('Malibu retreat') === false, 'Malibu reject');
ok(isSfLocation('Venice Beach loft') === false, 'Venice Beach reject');
ok(isSfLocation('Culver City office') === false, 'Culver City reject');
ok(isSfLocation('Pacific Palisades loft') === false, 'Pacific Palisades reject');
ok(isSfLocation('Pebble Beach dinner') === false, 'Pebble Beach reject');
ok(isSfLocation('Mission Valley loft') === false, 'Mission Valley SD reject');
ok(isSfLocation('Mission Beach loft') === false, 'Mission Beach SD reject');
ok(isSfLocation('Pacific Beach loft') === false, 'Pacific Beach SD reject');
ok(isSfLocation('Coronado loft') === false, 'Coronado reject');
ok(isSfLocation('Richmond CA loft') === false, 'Richmond CA no-comma reject');
ok(isSfLocation('Richmond') === true, 'bare Richmond district still SF after residual-8');
ok(isSfLocation('Richmond district') === true, 'Richmond district still SF after residual-8');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF after residual-8');
ok(isSfLocation('Outer Richmond dinner') === true, 'Outer Richmond still SF after residual-8');
ok(isSfLocation('Pacific Heights salon') === true, 'Pacific Heights still SF after residual-8');
ok(isSfLocation('Capitola beach dinner') === false, 'Capitola reject');
ok(isSfLocation('Aptos house') === false, 'Aptos reject');
ok(mentionsNonSf('Felton cabin night') === true, 'mentionsNonSf Felton');
ok(mentionsNonSf('Tahoe City') === true, 'mentionsNonSf Tahoe City');
ok(mentionsNonSf('Reno') === true, 'mentionsNonSf Reno');
ok(mentionsNonSf('Richmond CA') === true, 'mentionsNonSf Richmond CA');
ok(mentionsNonSf('Richmond Cafe') === false, 'mentionsNonSf Richmond Cafe not city');
ok(mentionsNonSf('Mission Beach') === true, 'mentionsNonSf Mission Beach');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission salon still SF');
ok(offerIsSf({ city: 'Richmond CA', offer: 'room for 12' }) === false, 'offer Richmond CA city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Tahoe City spillover' }) === false, 'offer blob Tahoe City reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission Valley spillover' }) === false, 'offer blob Mission Valley reject');
ok(offerIsSf({ city: 'Richmond', offer: 'room for 12' }) === true, 'offer bare Richmond district still ok');
// SF geo residual-9: Marina del Rey (was false SF via \bmarina\b); major US metros;
// SoCal beaches; Hawaii; Jackson CA ≠ Jackson Square; remote digital|telephone|sms|vr|web-only
ok(isSfLocation('Marina del Rey loft') === false, 'Marina del Rey LA reject');
ok(isSfLocation('marina del rey dinner') === false, 'marina del rey reject');
ok(isSfLocation('Marina') === true, 'bare Marina district still SF after residual-9');
ok(isSfLocation('Marina district') === true, 'Marina district still SF after residual-9');
ok(isSfLocation('Del Mar dinner') === false, 'Del Mar reject');
ok(isSfLocation('Newport Beach loft') === false, 'Newport Beach reject');
ok(isSfLocation('Laguna Beach dinner') === false, 'Laguna Beach reject');
ok(isSfLocation('Huntington Beach loft') === false, 'Huntington Beach reject');
ok(isSfLocation('Costa Mesa loft') === false, 'Costa Mesa reject');
ok(isSfLocation('Detroit founder dinner') === false, 'Detroit reject');
ok(isSfLocation('Cleveland loft') === false, 'Cleveland reject');
ok(isSfLocation('Pittsburgh PA warehouse') === false, 'Pittsburgh PA reject');
ok(isSfLocation('Baltimore office') === false, 'Baltimore reject');
ok(isSfLocation('Charlotte meetup') === false, 'Charlotte reject');
ok(isSfLocation('Tampa loft') === false, 'Tampa reject');
ok(isSfLocation('Orlando warehouse') === false, 'Orlando reject');
ok(isSfLocation('St. Louis loft') === false, 'St. Louis reject');
ok(isSfLocation('Saint Louis loft') === false, 'Saint Louis reject');
ok(isSfLocation('New Orleans dinner') === false, 'New Orleans reject');
ok(isSfLocation('Kansas City dinner') === false, 'Kansas City reject');
ok(isSfLocation('San Antonio dinner') === false, 'San Antonio reject');
ok(isSfLocation('Honolulu dinner') === false, 'Honolulu reject');
ok(isSfLocation('Maui retreat') === false, 'Maui reject');
ok(isSfLocation('Boise loft') === false, 'Boise reject');
ok(isSfLocation('Jackson CA loft') === false, 'Jackson CA reject');
ok(isSfLocation('Jackson Square dinner') === true, 'Jackson Square still SF after residual-9');
ok(isSfLocation('digital-only SF founders') === false, 'digital-only remote reject');
ok(isSfLocation('telephone-only call') === false, 'telephone-only remote reject');
ok(isSfLocation('sms-only hang') === false, 'sms-only remote reject');
ok(isSfLocation('vr-only meetup') === false, 'vr-only remote reject');
ok(isSfLocation('web-only event') === false, 'web-only remote reject');
ok(isSfLocation('livestream-only SF founders') === false, 'livestream-only remote reject');
ok(isSfLocation('YouTube Live-only founder night') === false, 'YouTube Live-only remote reject');
ok(isSfLocation('Mission dinner with YouTube Live') === true, 'hybrid YouTube Live + SF room still ok');
ok(isSfLocation('metaverse-only meetup') === false, 'metaverse-only remote reject');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF after residual-9');
ok(isSfLocation('Outer Richmond dinner') === true, 'Outer Richmond still SF after residual-9');
ok(mentionsNonSf('Marina del Rey') === true, 'mentionsNonSf Marina del Rey');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF');
ok(mentionsNonSf('Detroit') === true, 'mentionsNonSf Detroit');
ok(mentionsNonSf('Jackson CA') === true, 'mentionsNonSf Jackson CA');
ok(mentionsNonSf('Jackson Square') === false, 'mentionsNonSf Jackson Square still SF');
ok(mentionsNonSf('digital-only') === true, 'mentionsNonSf digital-only');
ok(mentionsNonSf('livestream only') === true, 'mentionsNonSf livestream-only');
ok(offerIsSf({ city: 'Marina del Rey', offer: 'room for 12' }) === false, 'offer Marina del Rey city reject');
ok(offerIsSf({ city: 'Marina', offer: 'room for 12' }) === true, 'offer Marina district still ok after residual-9');
ok(offerIsSf({ city: 'San Francisco', offer: 'Detroit spillover' }) === false, 'offer blob Detroit reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'digital-only stream' }) === false, 'offer blob digital-only reject');
// SF geo residual-10: Lake Merced SF (was false-reject via bare merced); Lake Merritt +
// Oakland hoods; Stanford/Googleplex/Apple Park/Moffett; Yolo/Winters/Dixon/Marysville/
// Boulder Creek; Balboa Island; remote audio|voice|call-only + metaverse/VR meetup phrases
ok(isSfLocation('Lake Merced') === true, 'Lake Merced still SF after residual-10');
ok(isSfLocation('lake merced picnic') === true, 'lake merced picnic still SF');
ok(isSfLocation('Merced') === false, 'Merced CA city reject');
ok(isSfLocation('Merced warehouse') === false, 'Merced warehouse reject');
ok(isSfLocation('Lake Merritt') === false, 'Lake Merritt Oakland reject');
ok(isSfLocation('Lake Merritt picnic') === false, 'Lake Merritt picnic reject');
ok(isSfLocation('Temescal loft') === false, 'Temescal Oakland reject');
ok(isSfLocation('Rockridge dinner') === false, 'Rockridge Oakland reject');
ok(isSfLocation('Fruitvale warehouse') === false, 'Fruitvale Oakland reject');
ok(isSfLocation('Stanford campus dinner') === false, 'Stanford reject');
ok(isSfLocation('Googleplex hang') === false, 'Googleplex reject');
ok(isSfLocation('Apple Park meetup') === false, 'Apple Park reject');
ok(isSfLocation('Moffett Field hang') === false, 'Moffett Field reject');
ok(isSfLocation('NASA Ames tour') === false, 'NASA Ames reject');
ok(isSfLocation('Yolo County dinner') === false, 'Yolo County reject');
ok(isSfLocation('Winters CA loft') === false, 'Winters CA reject');
ok(isSfLocation('Dixon CA warehouse') === false, 'Dixon CA reject');
ok(isSfLocation('Marysville office') === false, 'Marysville reject');
ok(isSfLocation('Boulder Creek cabin') === false, 'Boulder Creek reject');
ok(isSfLocation('Balboa Island dinner') === false, 'Balboa Island reject');
ok(isSfLocation('Balboa Park SF') === true, 'Balboa Park SF still ok after residual-10');
ok(isSfLocation('audio-only SF founders') === false, 'audio-only remote reject');
ok(isSfLocation('voice-only meetup') === false, 'voice-only remote reject');
ok(isSfLocation('call-only hang') === false, 'call-only remote reject');
ok(isSfLocation('metaverse SF founders') === false, 'metaverse remote phrase reject');
ok(isSfLocation('VR meetup SF') === false, 'VR meetup remote reject');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF after residual-10');
ok(isSfLocation('Presidio picnic') === true, 'Presidio still SF after residual-10');
ok(mentionsNonSf('Lake Merced') === false, 'mentionsNonSf Lake Merced still SF');
ok(mentionsNonSf('Lake Merritt') === true, 'mentionsNonSf Lake Merritt');
ok(mentionsNonSf('Stanford') === true, 'mentionsNonSf Stanford');
ok(mentionsNonSf('Temescal') === true, 'mentionsNonSf Temescal');
ok(mentionsNonSf('audio-only') === true, 'mentionsNonSf audio-only');
ok(mentionsNonSf('Balboa Island') === true, 'mentionsNonSf Balboa Island');
ok(mentionsNonSf('Balboa Park SF') === false, 'mentionsNonSf Balboa Park SF still SF');
ok(offerIsSf({ city: 'Lake Merced', offer: 'picnic for 12' }) === true, 'offer Lake Merced still ok');
ok(offerIsSf({ city: 'Lake Merritt', offer: 'picnic for 12' }) === false, 'offer Lake Merritt reject');
ok(offerIsSf({ city: 'Stanford', offer: 'campus room' }) === false, 'offer Stanford city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Temescal spillover' }) === false, 'offer blob Temescal reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'audio-only stream' }) === false, 'offer blob audio-only reject');
// SF geo residual-11: Merced Heights + Park Merced SF (were false-reject via bare merced);
// Merced CA city / warehouse still reject; Lake Merced still SF
ok(isSfLocation('Merced Heights') === true, 'Merced Heights still SF after residual-11');
ok(isSfLocation('Merced Heights picnic') === true, 'Merced Heights picnic still SF');
ok(isSfLocation('merced heights loft') === true, 'merced heights loft still SF');
ok(isSfLocation('Park Merced') === true, 'Park Merced still SF after residual-11');
ok(isSfLocation('Park Merced hang') === true, 'Park Merced hang still SF');
ok(isSfLocation('parkmerced') === true, 'parkmerced still SF');
ok(isSfLocation('Lake Merced') === true, 'Lake Merced still SF after residual-11');
ok(isSfLocation('Merced') === false, 'Merced CA city still reject after residual-11');
ok(isSfLocation('Merced warehouse') === false, 'Merced warehouse still reject after residual-11');
ok(isSfLocation('Merced CA') === false, 'Merced CA still reject after residual-11');
ok(mentionsNonSf('Merced Heights') === false, 'mentionsNonSf Merced Heights still SF');
ok(mentionsNonSf('Park Merced') === false, 'mentionsNonSf Park Merced still SF');
ok(mentionsNonSf('Merced') === true, 'mentionsNonSf Merced CA city');
ok(mentionsNonSf('Merced warehouse') === true, 'mentionsNonSf Merced warehouse');
ok(offerIsSf({ city: 'Merced Heights', offer: 'picnic for 12' }) === true, 'offer Merced Heights still ok');
ok(offerIsSf({ city: 'Park Merced', offer: 'room for 10' }) === true, 'offer Park Merced still ok');
ok(offerIsSf({ city: 'Merced', offer: 'warehouse' }) === false, 'offer Merced CA city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Merced Heights loft' }) === true, 'offer blob Merced Heights still ok');
// SF geo residual-12: CA cities that default-passed as generic titles (Central Valley /
// Central Coast / LA-IE / gold country / Bay edge). Corona Heights still SF; Mission SF ok.
ok(isSfLocation('Clovis loft') === false, 'Clovis Central Valley reject');
ok(isSfLocation('Hanford warehouse') === false, 'Hanford reject');
ok(isSfLocation('Tulare office') === false, 'Tulare reject');
ok(isSfLocation('Los Banos hang') === false, 'Los Banos reject');
ok(isSfLocation('Madera loft') === false, 'Madera reject');
ok(isSfLocation('Pismo Beach loft') === false, 'Pismo Beach reject');
ok(isSfLocation('Paso Robles dinner') === false, 'Paso Robles reject');
ok(isSfLocation('Lompoc warehouse') === false, 'Lompoc reject');
ok(isSfLocation('Santa Maria office') === false, 'Santa Maria reject');
ok(isSfLocation('Goleta loft') === false, 'Goleta reject');
ok(isSfLocation('Ojai house') === false, 'Ojai reject');
ok(isSfLocation('Glendale office') === false, 'Glendale reject');
ok(isSfLocation('Torrance loft') === false, 'Torrance reject');
ok(isSfLocation('Temecula dinner') === false, 'Temecula reject');
ok(isSfLocation('Chula Vista warehouse') === false, 'Chula Vista reject');
ok(isSfLocation('Sherman Oaks dinner') === false, 'Sherman Oaks reject');
ok(isSfLocation('Mission Viejo loft') === false, 'Mission Viejo reject');
ok(isSfLocation('Thousand Oaks office') === false, 'Thousand Oaks reject');
ok(isSfLocation('Corona warehouse') === false, 'Corona IE reject');
ok(isSfLocation('Corona Heights hang') === true, 'Corona Heights still SF after residual-12');
ok(isSfLocation('corona heights picnic') === true, 'corona heights picnic still SF');
ok(isSfLocation('Mission loft') === true, 'Mission loft still SF after Mission Viejo gate');
ok(isSfLocation('Sonora CA dinner') === false, 'Sonora CA reject');
ok(isSfLocation('Mariposa hang') === false, 'Mariposa reject');
ok(isSfLocation('Mammoth Lakes office') === false, 'Mammoth Lakes reject');
ok(isSfLocation('Tam Valley hang') === false, 'Tam Valley Marin reject');
ok(isSfLocation('Port Costa loft') === false, 'Port Costa reject');
ok(isSfLocation('Sunol loft') === false, 'Sunol reject');
ok(isSfLocation('Guerneville cabin dinner') === false, 'Guerneville Sonoma County reject');
for (const place of ['Emerald Hills', 'Fairview', 'Cherryland', 'Ashland', 'Bay Farm Island', 'Knightsen']) {
  ok(isSfLocation(`${place}, CA`) === false, `${place} non-SF reject`);
}
ok(isSfLocation('Orange CA loft') === false, 'Orange CA reject');
ok(isSfLocation('Carson CA dinner') === false, 'Carson CA reject');
ok(mentionsNonSf('Clovis loft') === true, 'mentionsNonSf Clovis');
ok(mentionsNonSf('Guerneville') === true, 'mentionsNonSf Guerneville');
ok(mentionsNonSf('Mission Viejo') === true, 'mentionsNonSf Mission Viejo');
ok(mentionsNonSf('Corona Heights') === false, 'mentionsNonSf Corona Heights still SF');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF');
ok(offerIsSf({ city: 'Clovis', offer: 'warehouse' }) === false, 'offer Clovis reject');
ok(offerIsSf({ city: 'Glendale', offer: 'office' }) === false, 'offer Glendale reject');
ok(offerIsSf({ city: 'Guerneville', offer: 'cabin for 12' }) === false, 'offer Guerneville reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Corona Heights picnic' }) === true, 'offer blob Corona Heights still ok');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission Viejo spillover' }) === false, 'offer blob Mission Viejo reject');
// SF geo residual-13: more CA default-pass + US metros wave-2 + Richmond VA + remote
// teleconference/livestream meetup. Richmond district / Mission / Japantown still SF.
ok(isSfLocation('Red Bluff office') === false, 'Red Bluff North CA reject');
ok(isSfLocation('Arcata loft') === false, 'Arcata reject');
ok(isSfLocation('Willits warehouse') === false, 'Willits reject');
ok(isSfLocation('Clearlake dinner') === false, 'Clearlake reject');
ok(isSfLocation('Lathrop office') === false, 'Lathrop valley reject');
ok(isSfLocation('Ripon loft') === false, 'Ripon reject');
ok(isSfLocation('Oakdale dinner') === false, 'Oakdale reject');
ok(isSfLocation('Ceres warehouse') === false, 'Ceres reject');
ok(isSfLocation('Galt office') === false, 'Galt reject');
ok(isSfLocation('Wasco loft') === false, 'Wasco reject');
ok(isSfLocation('Tehachapi office') === false, 'Tehachapi reject');
ok(isSfLocation('Ridgecrest loft') === false, 'Ridgecrest reject');
ok(isSfLocation('Big Bear dinner') === false, 'Big Bear reject');
ok(isSfLocation('Perris office') === false, 'Perris reject');
ok(isSfLocation('Menifee dinner') === false, 'Menifee reject');
ok(isSfLocation('Lake Elsinore loft') === false, 'Lake Elsinore reject');
ok(isSfLocation('Fountain Valley office') === false, 'Fountain Valley OC reject');
ok(isSfLocation('Garden Grove dinner') === false, 'Garden Grove reject');
ok(isSfLocation('Montara loft') === false, 'Montara peninsula reject');
ok(isSfLocation('North Fair Oaks office') === false, 'North Fair Oaks reject');
ok(isSfLocation('Bodega Bay dinner') === false, 'Bodega Bay reject');
ok(isSfLocation('Sea Ranch loft') === false, 'Sea Ranch reject');
ok(isSfLocation('Forestville office') === false, 'Forestville reject');
ok(isSfLocation('Geyserville dinner') === false, 'Geyserville reject');
ok(isSfLocation('West Sacramento loft') === false, 'West Sacramento reject');
ok(isSfLocation('Lincoln CA dinner') === false, 'Lincoln CA reject');
ok(isSfLocation('Richmond VA office') === false, 'Richmond VA reject (not SF district)');
ok(isSfLocation('Richmond Virginia warehouse') === false, 'Richmond Virginia reject');
ok(isSfLocation('Richmond') === true, 'bare Richmond district still SF after residual-13');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF after residual-13');
ok(isSfLocation('Jackson MS loft') === false, 'Jackson MS reject');
ok(isSfLocation('Jackson Square salon') === true, 'Jackson Square still SF after residual-13');
ok(isSfLocation('Oklahoma City loft') === false, 'Oklahoma City reject');
ok(isSfLocation('Tulsa office') === false, 'Tulsa reject');
ok(isSfLocation('Omaha dinner') === false, 'Omaha reject');
ok(isSfLocation('Tucson loft') === false, 'Tucson reject');
ok(isSfLocation('El Paso office') === false, 'El Paso reject');
ok(isSfLocation('Fort Worth dinner') === false, 'Fort Worth reject');
ok(isSfLocation('Albuquerque loft') === false, 'Albuquerque reject');
ok(isSfLocation('Baton Rouge office') === false, 'Baton Rouge reject');
ok(isSfLocation('teleconference SF founders') === false, 'teleconference remote reject');
ok(isSfLocation('conference call SF only') === false, 'conference call remote reject');
ok(isSfLocation('broadcast-only SF') === false, 'broadcast-only remote reject');
ok(isSfLocation('livestream meetup SF') === false, 'livestream meetup remote reject');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF after residual-13');
ok(isSfLocation('Japantown SF dinner') === true, 'Japantown still SF after residual-13');
ok(isSfLocation('Corona Heights hang') === true, 'Corona Heights still SF after residual-13');
ok(mentionsNonSf('Richmond VA') === true, 'mentionsNonSf Richmond VA');
ok(mentionsNonSf('Richmond') === false, 'mentionsNonSf bare Richmond still SF');
ok(mentionsNonSf('Red Bluff') === true, 'mentionsNonSf Red Bluff');
ok(mentionsNonSf('Oklahoma City') === true, 'mentionsNonSf Oklahoma City');
ok(mentionsNonSf('teleconference') === true, 'mentionsNonSf teleconference');
ok(mentionsNonSf('Jackson Square') === false, 'mentionsNonSf Jackson Square still SF');
ok(offerIsSf({ city: 'Red Bluff', offer: 'warehouse' }) === false, 'offer Red Bluff reject');
ok(offerIsSf({ city: 'Tucson', offer: 'office' }) === false, 'offer Tucson reject');
ok(offerIsSf({ city: 'Richmond, VA', offer: 'loft' }) === false, 'offer Richmond VA reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Outer Richmond loft' }) === true, 'offer Outer Richmond still ok');
ok(offerIsSf({ city: 'San Francisco', offer: 'teleconference only' }) === false, 'offer blob teleconference reject');
// SF geo residual-14: far North CA default-pass + remote slack/discord hang|night + only-on.
// Mission / hybrid Teams+Mission / Outer Richmond still SF.
ok(isSfLocation('Paradise CA founders') === false, 'Paradise CA reject');
ok(isSfLocation('Paradise, CA dinner') === false, 'Paradise, CA reject');
ok(isSfLocation('Paradise California hang') === false, 'Paradise California reject');
ok(isSfLocation('Gridley hang') === false, 'Gridley reject');
ok(isSfLocation('Live Oak dinner') === false, 'Live Oak reject');
ok(isSfLocation('Orland hang') === false, 'Orland reject');
ok(isSfLocation('Corning night') === false, 'Corning reject');
ok(isSfLocation('Anderson CA dinner') === false, 'Anderson CA reject');
ok(isSfLocation('Anderson, CA hang') === false, 'Anderson, CA reject');
ok(isSfLocation('Shasta Lake dinner') === false, 'Shasta Lake reject');
ok(isSfLocation('Mount Shasta dinner') === false, 'Mount Shasta reject');
ok(isSfLocation('Weed CA night') === false, 'Weed CA reject');
ok(isSfLocation('Weed California dinner') === false, 'Weed California reject');
ok(isSfLocation('Yreka dinner') === false, 'Yreka reject');
ok(isSfLocation('Alturas hang') === false, 'Alturas reject');
ok(isSfLocation('Dunsmuir hang') === false, 'Dunsmuir reject');
ok(isSfLocation('Ferndale hang') === false, 'Ferndale reject');
ok(isSfLocation('Rio Dell night') === false, 'Rio Dell reject');
ok(isSfLocation('Garberville dinner') === false, 'Garberville reject');
ok(isSfLocation('Laytonville hang') === false, 'Laytonville reject');
ok(isSfLocation('Kelseyville hang') === false, 'Kelseyville reject');
ok(isSfLocation('Lower Lake night') === false, 'Lower Lake reject');
ok(isSfLocation('Middletown dinner') === false, 'Middletown reject');
ok(isSfLocation('Gualala night') === false, 'Gualala reject');
ok(isSfLocation('Point Arena dinner') === false, 'Point Arena reject');
ok(isSfLocation('Boonville hang') === false, 'Boonville reject');
ok(isSfLocation('Slack hang only') === false, 'Slack hang only remote reject');
ok(isSfLocation('Discord night only') === false, 'Discord night only remote reject');
ok(isSfLocation('Teams hang only') === false, 'Teams hang only remote reject');
ok(isSfLocation('only on Slack') === false, 'only on Slack remote reject');
ok(isSfLocation('only on Discord') === false, 'only on Discord remote reject');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF after residual-14');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF after residual-14');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF after residual-14');
ok(isSfLocation('Japantown SF dinner') === true, 'Japantown still SF after residual-14');
ok(mentionsNonSf('Paradise CA') === true, 'mentionsNonSf Paradise CA');
ok(mentionsNonSf('Gridley') === true, 'mentionsNonSf Gridley');
ok(isSfLocation('Moss Landing dinner') === false, 'Moss Landing reject');
ok(mentionsNonSf('Slack hang only') === true, 'mentionsNonSf Slack hang');
ok(mentionsNonSf('only on Discord') === true, 'mentionsNonSf only on Discord');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-14');
ok(offerIsSf({ city: 'Paradise, CA', offer: 'warehouse' }) === false, 'offer Paradise CA reject');
ok(offerIsSf({ city: 'Yreka', offer: 'loft' }) === false, 'offer Yreka reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Slack hang only' }) === false, 'offer blob Slack hang reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-14');
// SF geo residual-15: CA cities + US metros that still default-passed.
// Portola CA ≠ Portola district; Valencia CA ≠ Valencia Street; Fillmore CA ≠ Fillmore district.
// Boulder CO ≠ Boulder Creek; Lincoln NE ≠ Lincoln Way SF; Mission / Outer Richmond still SF.
ok(isSfLocation('Quincy CA dinner') === false, 'Quincy CA reject');
ok(isSfLocation('Quincy, CA hang') === false, 'Quincy, CA reject');
ok(isSfLocation('Portola CA warehouse') === false, 'Portola CA reject');
ok(isSfLocation('Portola, CA dinner') === false, 'Portola, CA reject');
ok(isSfLocation('Portola California hang') === false, 'Portola California reject');
ok(isSfLocation('Colusa dinner') === false, 'Colusa reject');
ok(isSfLocation('Willows CA hang') === false, 'Willows CA reject');
ok(isSfLocation('Firebaugh loft') === false, 'Firebaugh reject');
ok(isSfLocation('Kerman CA warehouse') === false, 'Kerman CA reject');
ok(isSfLocation('Lindsay CA dinner') === false, 'Lindsay CA reject');
ok(isSfLocation('Corcoran hang') === false, 'Corcoran reject');
ok(isSfLocation('Avenal loft') === false, 'Avenal reject');
ok(isSfLocation('Coalinga dinner') === false, 'Coalinga reject');
ok(isSfLocation('Fillmore CA warehouse') === false, 'Fillmore CA reject');
ok(isSfLocation('Fillmore, CA dinner') === false, 'Fillmore, CA reject');
ok(isSfLocation('Santa Paula loft') === false, 'Santa Paula reject');
ok(isSfLocation('Moorpark hang') === false, 'Moorpark reject');
ok(isSfLocation('West Hollywood loft') === false, 'West Hollywood reject');
ok(isSfLocation('Beverly Hills dinner') === false, 'Beverly Hills reject');
ok(isSfLocation('Alhambra CA loft') === false, 'Alhambra CA reject');
ok(isSfLocation('Arcadia CA hang') === false, 'Arcadia CA reject');
ok(isSfLocation('Redlands dinner') === false, 'Redlands reject');
ok(isSfLocation('Yucaipa loft') === false, 'Yucaipa reject');
ok(isSfLocation('Beaumont CA hang') === false, 'Beaumont CA reject');
ok(isSfLocation('Banning CA dinner') === false, 'Banning CA reject');
ok(isSfLocation('Valencia CA warehouse') === false, 'Valencia CA reject');
ok(isSfLocation('Valencia, CA dinner') === false, 'Valencia, CA reject');
ok(isSfLocation('Valencia California loft') === false, 'Valencia California reject');
ok(isSfLocation('Livingston CA hang') === false, 'Livingston CA reject');
ok(isSfLocation('Provo loft') === false, 'Provo reject');
ok(isSfLocation('Scottsdale dinner') === false, 'Scottsdale reject');
ok(isSfLocation('Boulder CO hang') === false, 'Boulder CO reject');
ok(isSfLocation('Boulder, CO dinner') === false, 'Boulder, CO reject');
ok(isSfLocation('Colorado Springs loft') === false, 'Colorado Springs reject');
ok(isSfLocation('Columbia SC dinner') === false, 'Columbia SC reject');
ok(isSfLocation('Lincoln NE hang') === false, 'Lincoln NE reject');
ok(isSfLocation('Lincoln, NE dinner') === false, 'Lincoln, NE reject');
ok(isSfLocation('Lincoln Nebraska loft') === false, 'Lincoln Nebraska reject');
ok(isSfLocation('Topeka hang') === false, 'Topeka reject');
ok(isSfLocation('Fayetteville AR dinner') === false, 'Fayetteville AR reject');
// Still SF
ok(isSfLocation('Portola district') === true, 'Portola district still SF residual-15');
ok(isSfLocation('Portola dinner') === true, 'bare Portola still SF residual-15');
ok(isSfLocation('Fillmore district') === true, 'Fillmore district still SF residual-15');
ok(isSfLocation('Fillmore Street jazz') === true, 'Fillmore Street still SF residual-15');
ok(isSfLocation('Valencia Street salon') === true, 'Valencia Street still SF residual-15');
ok(isSfLocation('Mission Valencia hang') === true, 'Mission Valencia still SF residual-15');
ok(isSfLocation('Lincoln Way dinner') === true, 'Lincoln Way still SF residual-15');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF after residual-15');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF after residual-15');
ok(isSfLocation('Japantown SF dinner') === true, 'Japantown still SF after residual-15');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-15');
ok(mentionsNonSf('Portola CA') === true, 'mentionsNonSf Portola CA');
ok(mentionsNonSf('Valencia CA') === true, 'mentionsNonSf Valencia CA');
ok(mentionsNonSf('Fillmore CA') === true, 'mentionsNonSf Fillmore CA');
ok(mentionsNonSf('Boulder CO') === true, 'mentionsNonSf Boulder CO');
ok(mentionsNonSf('Lincoln NE') === true, 'mentionsNonSf Lincoln NE');
ok(mentionsNonSf('West Hollywood') === true, 'mentionsNonSf West Hollywood');
ok(mentionsNonSf('Portola district') === false, 'mentionsNonSf Portola district still SF');
ok(mentionsNonSf('Valencia Street') === false, 'mentionsNonSf Valencia Street still SF');
ok(mentionsNonSf('Fillmore district') === false, 'mentionsNonSf Fillmore district still SF');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-15');
ok(offerIsSf({ city: 'Portola, CA', offer: 'warehouse' }) === false, 'offer Portola CA reject');
ok(offerIsSf({ city: 'Valencia, CA', offer: 'loft' }) === false, 'offer Valencia CA reject');
ok(offerIsSf({ city: 'West Hollywood', offer: 'studio' }) === false, 'offer West Hollywood reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Portola district loft' }) === true, 'offer Portola district still ok residual-15');
ok(offerIsSf({ city: 'San Francisco', offer: 'Valencia Street salon' }) === true, 'offer Valencia Street still ok residual-15');
ok(offerIsSf({ city: 'San Francisco', offer: 'Fillmore district' }) === true, 'offer Fillmore district still ok residual-15');
// SF geo residual-16: SoCal beach/desert + bare CA cities + Marina CA ≠ Marina district;
// St Paul/Greensboro; remote exclusively|100% / no in-person / cyber|internet-only / distributed team.
ok(isSfLocation('Seal Beach dinner') === false, 'Seal Beach reject');
ok(isSfLocation('Rancho Mirage loft') === false, 'Rancho Mirage reject');
ok(isSfLocation('Calexico warehouse') === false, 'Calexico reject');
ok(isSfLocation('El Centro hang') === false, 'El Centro reject');
ok(isSfLocation('Brawley dinner') === false, 'Brawley reject');
ok(isSfLocation('Vista loft') === false, 'Vista bare reject');
ok(isSfLocation('Vista CA hang') === false, 'Vista CA reject');
ok(isSfLocation('San Marcos dinner') === false, 'San Marcos reject');
ok(isSfLocation('St Paul hang') === false, 'St Paul reject');
ok(isSfLocation('St. Paul loft') === false, 'St. Paul reject');
ok(isSfLocation('Saint Paul dinner') === false, 'Saint Paul reject');
ok(isSfLocation('Greensboro hang') === false, 'Greensboro reject');
ok(isSfLocation('Lancaster loft') === false, 'Lancaster bare reject');
ok(isSfLocation('Lindsay dinner') === false, 'Lindsay bare reject');
ok(isSfLocation('Bishop hang') === false, 'Bishop bare reject');
ok(isSfLocation('Exeter loft') === false, 'Exeter reject');
ok(isSfLocation('Lone Pine dinner') === false, 'Lone Pine reject');
ok(isSfLocation('Adelanto hang') === false, 'Adelanto reject');
ok(isSfLocation('Grover Beach loft') === false, 'Grover Beach reject');
ok(isSfLocation('Mountain House dinner') === false, 'Mountain House reject');
ok(isSfLocation('Bodega hang') === false, 'Bodega bare reject');
ok(isSfLocation('Occidental loft') === false, 'Occidental reject');
ok(isSfLocation('Marina CA warehouse') === false, 'Marina CA reject');
ok(isSfLocation('Marina, CA dinner') === false, 'Marina, CA reject');
ok(isSfLocation('Marina California loft') === false, 'Marina California reject');
ok(isSfLocation('exclusively remote SF founders') === false, 'exclusively remote reject');
ok(isSfLocation('100% remote dinner') === false, '100% remote reject');
ok(isSfLocation('100 percent remote hang') === false, '100 percent remote reject');
ok(isSfLocation('no in-person component') === false, 'no in-person reject');
ok(isSfLocation('no in person mixer') === false, 'no in person reject');
ok(isSfLocation('cyber-only hang') === false, 'cyber-only reject');
ok(isSfLocation('internet-only event') === false, 'internet-only reject');
ok(isSfLocation('distributed team meetup') === false, 'distributed team meetup reject');
// Still SF after residual-16
ok(isSfLocation('Marina') === true, 'Marina district still SF residual-16');
ok(isSfLocation('Marina district') === true, 'Marina district phrase still SF residual-16');
ok(isSfLocation('Mission salon dinner') === true, 'Mission still SF residual-16');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF residual-16');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-16');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-16');
ok(mentionsNonSf('Seal Beach') === true, 'mentionsNonSf Seal Beach');
ok(mentionsNonSf('Marina CA') === true, 'mentionsNonSf Marina CA');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-16');
ok(mentionsNonSf('exclusively remote') === true, 'mentionsNonSf exclusively remote');
ok(mentionsNonSf('100% remote') === true, 'mentionsNonSf 100% remote');
ok(mentionsNonSf('distributed team meetup') === true, 'mentionsNonSf distributed team');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-16');
ok(offerIsSf({ city: 'Seal Beach', offer: 'warehouse' }) === false, 'offer Seal Beach reject');
ok(offerIsSf({ city: 'Marina, CA', offer: 'loft' }) === false, 'offer Marina CA reject');
ok(offerIsSf({ city: 'Vista', offer: 'room' }) === false, 'offer Vista reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Marina district loft' }) === true, 'offer Marina district still ok residual-16');
ok(offerIsSf({ city: 'San Francisco', offer: 'exclusively remote founders' }) === false, 'offer exclusively remote blob reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-16');
// SF geo residual-17: SoCal IE/OC + LA basin + US metros that still default-passed
ok(isSfLocation('Laguna Niguel dinner') === false, 'Laguna Niguel reject');
ok(isSfLocation('Diamond Bar loft') === false, 'Diamond Bar reject');
ok(isSfLocation('Rowland Heights hang') === false, 'Rowland Heights reject');
ok(isSfLocation('Hacienda Heights warehouse') === false, 'Hacienda Heights reject');
ok(isSfLocation('Norwalk dinner') === false, 'Norwalk reject');
ok(isSfLocation('Bellflower loft') === false, 'Bellflower reject');
ok(isSfLocation('Lakewood hang') === false, 'Lakewood bare reject');
ok(isSfLocation('Lakewood CA dinner') === false, 'Lakewood CA reject');
ok(isSfLocation('Cerritos loft') === false, 'Cerritos reject');
ok(isSfLocation('Cypress hang') === false, 'Cypress bare reject');
ok(isSfLocation('Cypress CA dinner') === false, 'Cypress CA reject');
ok(isSfLocation('Yorba Linda loft') === false, 'Yorba Linda reject');
ok(isSfLocation('Placentia hang') === false, 'Placentia reject');
ok(isSfLocation('Brea dinner') === false, 'Brea reject');
ok(isSfLocation('Colton loft') === false, 'Colton reject');
ok(isSfLocation('Highland hang') === false, 'Highland bare reject');
ok(isSfLocation('Highland CA dinner') === false, 'Highland CA reject');
ok(isSfLocation('Loma Linda loft') === false, 'Loma Linda reject');
ok(isSfLocation('San Jacinto hang') === false, 'San Jacinto reject');
ok(isSfLocation('Canyon Lake dinner') === false, 'Canyon Lake reject');
ok(isSfLocation('Norco loft') === false, 'Norco reject');
ok(isSfLocation('West Covina hang') === false, 'West Covina reject');
ok(isSfLocation('Chino dinner') === false, 'Chino bare reject');
ok(isSfLocation('San Dimas loft') === false, 'San Dimas reject');
ok(isSfLocation('Glendora hang') === false, 'Glendora reject');
ok(isSfLocation('Azusa dinner') === false, 'Azusa reject');
ok(isSfLocation('Monrovia loft') === false, 'Monrovia reject');
ok(isSfLocation('Duarte hang') === false, 'Duarte reject');
ok(isSfLocation('Covina dinner') === false, 'Covina reject');
ok(isSfLocation('Baldwin Park loft') === false, 'Baldwin Park reject');
ok(isSfLocation('El Monte hang') === false, 'El Monte reject');
ok(isSfLocation('South Gate dinner') === false, 'South Gate reject');
ok(isSfLocation('Lynwood loft') === false, 'Lynwood reject');
ok(isSfLocation('Desert Hot Springs hang') === false, 'Desert Hot Springs reject');
ok(isSfLocation('Boca Raton dinner') === false, 'Boca Raton reject');
ok(isSfLocation('Manchester loft') === false, 'Manchester reject');
ok(isSfLocation('Manchester NH hang') === false, 'Manchester NH reject');
ok(isSfLocation('Syracuse dinner') === false, 'Syracuse reject');
ok(isSfLocation('Worcester loft') === false, 'Worcester reject');
ok(isSfLocation('Nashua hang') === false, 'Nashua reject');
ok(isSfLocation('Jersey City dinner') === false, 'Jersey City reject');
ok(isSfLocation('Princeton loft') === false, 'Princeton reject');
ok(isSfLocation('Asheville hang') === false, 'Asheville reject');
// Still SF after residual-17
ok(isSfLocation('Marina') === true, 'Marina district still SF residual-17');
ok(isSfLocation('Mission salon dinner') === true, 'Mission still SF residual-17');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF residual-17');
ok(isSfLocation('Corona Heights hang') === true, 'Corona Heights still SF residual-17');
ok(isSfLocation('Alamo Square dinner') === true, 'Alamo Square still SF residual-17');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-17');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-17');
ok(mentionsNonSf('Laguna Niguel') === true, 'mentionsNonSf Laguna Niguel');
ok(mentionsNonSf('Diamond Bar') === true, 'mentionsNonSf Diamond Bar');
ok(mentionsNonSf('Boca Raton') === true, 'mentionsNonSf Boca Raton');
ok(mentionsNonSf('Jersey City') === true, 'mentionsNonSf Jersey City');
ok(mentionsNonSf('Lakewood') === true, 'mentionsNonSf Lakewood');
ok(mentionsNonSf('Chino') === true, 'mentionsNonSf Chino');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-17');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-17');
ok(offerIsSf({ city: 'Laguna Niguel', offer: 'warehouse' }) === false, 'offer Laguna Niguel reject');
ok(offerIsSf({ city: 'Norwalk', offer: 'loft' }) === false, 'offer Norwalk reject');
ok(offerIsSf({ city: 'Boca Raton', offer: 'room' }) === false, 'offer Boca Raton reject');
ok(offerIsSf({ city: 'Jersey City', offer: 'space' }) === false, 'offer Jersey City reject');
ok(offerIsSf({ city: 'Chino', offer: 'warehouse' }) === false, 'offer Chino reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-17');
ok(offerIsSf({ city: 'San Francisco', offer: 'Marina district loft' }) === true, 'offer Marina district still ok residual-17');

// SF geo residual-18: LA basin/OC/valley/SCV + desert/AZ/NM + DMV that still default-passed
ok(isSfLocation('Montebello dinner') === false, 'Montebello reject');
ok(isSfLocation('Pico Rivera loft') === false, 'Pico Rivera reject');
ok(isSfLocation('Commerce CA hang') === false, 'Commerce CA reject');
ok(isSfLocation('Vernon warehouse') === false, 'Vernon reject');
ok(isSfLocation('Maywood dinner') === false, 'Maywood reject');
ok(isSfLocation('Bell CA loft') === false, 'Bell CA reject');
ok(isSfLocation('Bell Gardens hang') === false, 'Bell Gardens reject');
ok(isSfLocation('Cudahy dinner') === false, 'Cudahy reject');
ok(isSfLocation('Huntington Park loft') === false, 'Huntington Park reject');
ok(isSfLocation('Paramount hang') === false, 'Paramount reject');
ok(isSfLocation('Westminster CA dinner') === false, 'Westminster CA reject');
ok(isSfLocation('Rosemead loft') === false, 'Rosemead reject');
ok(isSfLocation('San Gabriel hang') === false, 'San Gabriel reject');
ok(isSfLocation('San Marino dinner') === false, 'San Marino reject');
ok(isSfLocation('Temple City loft') === false, 'Temple City reject');
ok(isSfLocation('Alhambra hang') === false, 'Alhambra bare reject residual-18');
ok(isSfLocation('Arcadia dinner') === false, 'Arcadia bare reject residual-18');
ok(isSfLocation('Aliso Viejo loft') === false, 'Aliso Viejo reject');
ok(isSfLocation('Laguna Hills hang') === false, 'Laguna Hills reject');
ok(isSfLocation('Laguna Woods dinner') === false, 'Laguna Woods reject');
ok(isSfLocation('Rancho Santa Margarita loft') === false, 'Rancho Santa Margarita reject');
ok(isSfLocation('Capistrano Beach hang') === false, 'Capistrano Beach reject');
ok(isSfLocation('Lake Forest dinner') === false, 'Lake Forest bare reject residual-18');
ok(isSfLocation('Joshua Tree loft') === false, 'Joshua Tree reject');
ok(isSfLocation('Indian Wells hang') === false, 'Indian Wells reject');
ok(isSfLocation('Needles dinner') === false, 'Needles reject');
ok(isSfLocation('California City loft') === false, 'California City reject');
ok(isSfLocation('Parlier hang') === false, 'Parlier reject');
ok(isSfLocation('Huron CA dinner') === false, 'Huron CA reject');
ok(isSfLocation('Mendota loft') === false, 'Mendota reject');
ok(isSfLocation('Fowler hang') === false, 'Fowler reject');
ok(isSfLocation('McFarland dinner') === false, 'McFarland reject');
ok(isSfLocation('Arvin loft') === false, 'Arvin reject');
ok(isSfLocation('Newhall hang') === false, 'Newhall reject');
ok(isSfLocation('Canyon Country dinner') === false, 'Canyon Country reject');
ok(isSfLocation('Saugus loft') === false, 'Saugus reject');
ok(isSfLocation('Acton CA hang') === false, 'Acton CA reject');
ok(isSfLocation('Stevenson Ranch dinner') === false, 'Stevenson Ranch reject');
ok(isSfLocation('Castaic loft') === false, 'Castaic reject');
ok(isSfLocation('Agua Dulce hang') === false, 'Agua Dulce reject');
ok(isSfLocation('Walnut CA dinner') === false, 'Walnut CA reject');
ok(isSfLocation('Walnut loft') === false, 'Walnut bare reject residual-18');
ok(isSfLocation('Walnut Creek warehouse') === false, 'Walnut Creek still reject residual-18');
ok(isSfLocation('Flagstaff dinner') === false, 'Flagstaff reject');
ok(isSfLocation('Sedona loft') === false, 'Sedona reject');
ok(isSfLocation('Santa Fe hang') === false, 'Santa Fe reject');
ok(isSfLocation('Santa Fe NM dinner') === false, 'Santa Fe NM reject');
ok(isSfLocation('Arlington VA loft') === false, 'Arlington VA reject');
ok(isSfLocation('Alexandria hang') === false, 'Alexandria reject');
ok(isSfLocation('Reston dinner') === false, 'Reston reject');
ok(isSfLocation('McLean loft') === false, 'McLean reject');
ok(isSfLocation('Bethesda hang') === false, 'Bethesda reject');
ok(isSfLocation('Silver Spring dinner') === false, 'Silver Spring reject');
ok(isSfLocation('Rockville loft') === false, 'Rockville reject');
ok(isSfLocation('Annapolis hang') === false, 'Annapolis reject');
ok(isSfLocation('Frederick MD dinner') === false, 'Frederick MD reject');
ok(isSfLocation('Hagerstown loft') === false, 'Hagerstown reject');
ok(isSfLocation('Wheeling hang') === false, 'Wheeling reject');
ok(isSfLocation('Winston-Salem dinner') === false, 'Winston-Salem reject');
ok(isSfLocation('Roanoke loft') === false, 'Roanoke reject');
// Still SF after residual-18
ok(isSfLocation('Marina') === true, 'Marina district still SF residual-18');
ok(isSfLocation('Mission salon dinner') === true, 'Mission still SF residual-18');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF residual-18');
ok(isSfLocation('Corona Heights hang') === true, 'Corona Heights still SF residual-18');
ok(isSfLocation('Alamo Square dinner') === true, 'Alamo Square still SF residual-18');
ok(isSfLocation('Castro dinner') === true, 'Castro still SF residual-18');
ok(isSfLocation('Richmond') === true, 'Richmond district still SF residual-18');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-18');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-18');
ok(isSfLocation('Rooftop dinner, Dover, de') === false, 'lowercase non-CA state reject');
ok(isSfLocation('Rooftop dinner, Dover, Delaware') === false, 'spelled-out non-CA state reject');
ok(mentionsNonSf('Montebello') === true, 'mentionsNonSf Montebello');
ok(mentionsNonSf('Aliso Viejo') === true, 'mentionsNonSf Aliso Viejo');
ok(mentionsNonSf('Joshua Tree') === true, 'mentionsNonSf Joshua Tree');
ok(mentionsNonSf('Santa Fe') === true, 'mentionsNonSf Santa Fe');
ok(mentionsNonSf('Bethesda') === true, 'mentionsNonSf Bethesda');
ok(mentionsNonSf('Walnut') === true, 'mentionsNonSf Walnut');
ok(mentionsNonSf('Lake Forest') === true, 'mentionsNonSf Lake Forest');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-18');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-18');
ok(offerIsSf({ city: 'Montebello', offer: 'warehouse' }) === false, 'offer Montebello reject');
ok(offerIsSf({ city: 'Aliso Viejo', offer: 'loft' }) === false, 'offer Aliso Viejo reject');
ok(offerIsSf({ city: 'Joshua Tree', offer: 'room' }) === false, 'offer Joshua Tree reject');
ok(offerIsSf({ city: 'Bethesda', offer: 'space' }) === false, 'offer Bethesda reject');
ok(offerIsSf({ city: 'Walnut', offer: 'warehouse' }) === false, 'offer Walnut reject');
ok(offerIsSf({ city: 'Lake Forest', offer: 'room' }) === false, 'offer Lake Forest reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-18');
ok(offerIsSf({ city: 'San Francisco', offer: 'Marina district loft' }) === true, 'offer Marina district still ok residual-18');
// SF geo residual-19: LA hoods + coast/IE that still default-passed
ok(isSfLocation('Hollywood dinner') === false, 'Hollywood reject residual-19');
ok(isSfLocation('Silver Lake hang') === false, 'Silver Lake reject residual-19');
ok(isSfLocation('Echo Park loft') === false, 'Echo Park reject residual-19');
ok(isSfLocation('Los Feliz dinner') === false, 'Los Feliz reject residual-19');
ok(isSfLocation('Koreatown loft') === false, 'Koreatown reject residual-19');
ok(isSfLocation('Boyle Heights hang') === false, 'Boyle Heights reject residual-19');
ok(isSfLocation('Westwood dinner') === false, 'Westwood reject residual-19');
ok(isSfLocation('DTLA loft') === false, 'DTLA reject residual-19');
ok(isSfLocation('Downtown LA hang') === false, 'Downtown LA reject residual-19');
ok(isSfLocation('North Hollywood dinner') === false, 'North Hollywood reject residual-19');
ok(isSfLocation('Canoga Park loft') === false, 'Canoga Park reject residual-19');
ok(isSfLocation('Tarzana hang') === false, 'Tarzana reject residual-19');
ok(isSfLocation('Sylmar dinner') === false, 'Sylmar reject residual-19');
ok(isSfLocation('Pacoima loft') === false, 'Pacoima reject residual-19');
ok(isSfLocation('San Fernando hang') === false, 'San Fernando reject residual-19');
ok(isSfLocation('Granada Hills dinner') === false, 'Granada Hills reject residual-19');
ok(isSfLocation('Sunland loft') === false, 'Sunland reject residual-19');
ok(isSfLocation('Tujunga hang') === false, 'Tujunga reject residual-19');
ok(isSfLocation('Century City dinner') === false, 'Century City reject residual-19');
ok(isSfLocation('Playa del Rey loft') === false, 'Playa del Rey reject residual-19');
ok(isSfLocation('Playa Vista hang') === false, 'Playa Vista reject residual-19');
ok(isSfLocation('Mar Vista dinner') === false, 'Mar Vista reject residual-19');
ok(isSfLocation('Palms loft') === false, 'Palms reject residual-19');
ok(isSfLocation('Mid-Wilshire hang') === false, 'Mid-Wilshire reject residual-19');
ok(isSfLocation('Arts District loft') === false, 'Arts District reject residual-19');
ok(isSfLocation('San Pedro dinner') === false, 'San Pedro reject residual-19');
ok(isSfLocation('Wilmington hang') === false, 'Wilmington reject residual-19');
ok(isSfLocation('Lawndale loft') === false, 'Lawndale reject residual-19');
ok(isSfLocation('Lomita hang') === false, 'Lomita reject residual-19');
ok(isSfLocation('Palos Verdes dinner') === false, 'Palos Verdes reject residual-19');
ok(isSfLocation('Rancho Palos Verdes loft') === false, 'Rancho Palos Verdes reject residual-19');
ok(isSfLocation('Rolling Hills hang') === false, 'Rolling Hills reject residual-19');
ok(isSfLocation('Carson dinner') === false, 'Carson bare reject residual-19');
ok(isSfLocation('Venice hang') === false, 'Venice bare reject residual-19');
ok(isSfLocation('Culver loft') === false, 'Culver bare reject residual-19');
ok(isSfLocation('Los Osos dinner') === false, 'Los Osos reject residual-19');
ok(isSfLocation('Nipomo hang') === false, 'Nipomo reject residual-19');
ok(isSfLocation('Santa Ynez loft') === false, 'Santa Ynez reject residual-19');
ok(isSfLocation('Calimesa dinner') === false, 'Calimesa reject residual-19');
ok(isSfLocation('Grand Terrace hang') === false, 'Grand Terrace reject residual-19');
ok(isSfLocation('Bloomington loft') === false, 'Bloomington reject residual-19');
ok(isSfLocation('Sierra Madre dinner') === false, 'Sierra Madre reject residual-19');
ok(isSfLocation('Altadena hang') === false, 'Altadena reject residual-19');
ok(isSfLocation('Beaumont loft') === false, 'Beaumont bare reject residual-19');
ok(isSfLocation('Banning dinner') === false, 'Banning bare reject residual-19');
ok(isSfLocation('Greenfield dinner') === false, 'Greenfield bare reject residual-19');
// Still SF after residual-19
ok(isSfLocation('Marina') === true, 'Marina district still SF residual-19');
ok(isSfLocation('Mission salon dinner') === true, 'Mission still SF residual-19');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF residual-19');
ok(isSfLocation('Corona Heights hang') === true, 'Corona Heights still SF residual-19');
ok(isSfLocation('Alamo Square dinner') === true, 'Alamo Square still SF residual-19');
ok(isSfLocation('Castro dinner') === true, 'Castro still SF residual-19');
ok(isSfLocation('Richmond') === true, 'Richmond district still SF residual-19');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-19');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-19');
ok(mentionsNonSf('Hollywood') === true, 'mentionsNonSf Hollywood residual-19');
ok(mentionsNonSf('Silver Lake') === true, 'mentionsNonSf Silver Lake residual-19');
ok(mentionsNonSf('DTLA') === true, 'mentionsNonSf DTLA residual-19');
ok(mentionsNonSf('North Hollywood') === true, 'mentionsNonSf North Hollywood residual-19');
ok(mentionsNonSf('Venice') === true, 'mentionsNonSf Venice residual-19');
ok(mentionsNonSf('Carson') === true, 'mentionsNonSf Carson residual-19');
ok(mentionsNonSf('Altadena') === true, 'mentionsNonSf Altadena residual-19');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-19');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-19');
ok(offerIsSf({ city: 'Hollywood', offer: 'warehouse' }) === false, 'offer Hollywood reject residual-19');
ok(offerIsSf({ city: 'Silver Lake', offer: 'loft' }) === false, 'offer Silver Lake reject residual-19');
ok(offerIsSf({ city: 'DTLA', offer: 'room' }) === false, 'offer DTLA reject residual-19');
ok(offerIsSf({ city: 'Carson', offer: 'space' }) === false, 'offer Carson reject residual-19');
ok(offerIsSf({ city: 'Venice', offer: 'warehouse' }) === false, 'offer Venice reject residual-19');
ok(offerIsSf({ city: 'Altadena', offer: 'room' }) === false, 'offer Altadena reject residual-19');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-19');
ok(offerIsSf({ city: 'San Francisco', offer: 'Marina district loft' }) === true, 'offer Marina district still ok residual-19');
// SF geo residual-20: more LA hoods + bare beach/city + Clubhouse/Spaces remote
ok(isSfLocation('Eagle Rock dinner') === false, 'Eagle Rock reject residual-20');
ok(isSfLocation('Glassell Park loft') === false, 'Glassell Park reject residual-20');
ok(isSfLocation('Mount Washington dinner') === false, 'Mount Washington reject residual-20');
ok(isSfLocation('Lincoln Heights loft') === false, 'Lincoln Heights reject residual-20');
ok(isSfLocation('El Sereno warehouse') === false, 'El Sereno reject residual-20');
ok(isSfLocation('Leimert Park dinner') === false, 'Leimert Park reject residual-20');
ok(isSfLocation('Leimert loft') === false, 'Leimert bare reject residual-20');
ok(isSfLocation('Crenshaw loft') === false, 'Crenshaw reject residual-20');
ok(isSfLocation('Baldwin Hills hang') === false, 'Baldwin Hills reject residual-20');
ok(isSfLocation('View Park dinner') === false, 'View Park reject residual-20');
ok(isSfLocation('Ladera Heights house') === false, 'Ladera Heights reject residual-20');
ok(isSfLocation('West Adams loft') === false, 'West Adams reject residual-20');
ok(isSfLocation('Jefferson Park dinner') === false, 'Jefferson Park reject residual-20');
ok(isSfLocation('South Central loft') === false, 'South Central reject residual-20');
ok(isSfLocation('Watts warehouse') === false, 'Watts reject residual-20');
ok(isSfLocation('Florence-Firestone warehouse') === false, 'Florence-Firestone reject residual-20');
ok(isSfLocation('Bel Air dinner') === false, 'Bel Air reject residual-20');
ok(isSfLocation('Bel-Air hang') === false, 'Bel-Air hyphen reject residual-20');
ok(isSfLocation('Silverlake hang') === false, 'Silverlake one-word reject residual-20');
ok(isSfLocation('Frogtown dinner') === false, 'Frogtown reject residual-20');
ok(isSfLocation('Elysian Valley loft') === false, 'Elysian Valley reject residual-20');
ok(isSfLocation('Signal Hill office') === false, 'Signal Hill reject residual-20');
ok(isSfLocation('Harbor City warehouse') === false, 'Harbor City reject residual-20');
ok(isSfLocation('Lennox office') === false, 'Lennox reject residual-20');
ok(isSfLocation('Rancho Bernardo office') === false, 'Rancho Bernardo reject residual-20');
ok(isSfLocation('Hermosa loft') === false, 'Hermosa bare reject residual-20');
ok(isSfLocation('Redondo warehouse') === false, 'Redondo bare reject residual-20');
ok(isSfLocation('Newport dinner') === false, 'Newport bare reject residual-20');
ok(isSfLocation('Orange loft') === false, 'Orange bare reject residual-20');
ok(isSfLocation('Clubhouse-only meetup') === false, 'Clubhouse-only remote reject residual-20');
ok(isSfLocation('Clubhouse room only') === false, 'Clubhouse room only remote reject residual-20');
ok(isSfLocation('Spaces-only hang') === false, 'Spaces-only remote reject residual-20');
ok(isSfLocation('Twitter Spaces meetup') === false, 'Twitter Spaces remote reject residual-20');
ok(isSfLocation('X Spaces only') === false, 'X Spaces remote reject residual-20');
// Still SF after residual-20
ok(isSfLocation('Marina') === true, 'Marina district still SF residual-20');
ok(isSfLocation('Mission salon dinner') === true, 'Mission still SF residual-20');
ok(isSfLocation('Outer Richmond loft') === true, 'Outer Richmond still SF residual-20');
ok(isSfLocation('Corona Heights hang') === true, 'Corona Heights still SF residual-20');
ok(isSfLocation('Alamo Square dinner') === true, 'Alamo Square still SF residual-20');
ok(isSfLocation('Castro dinner') === true, 'Castro still SF residual-20');
ok(isSfLocation('Richmond') === true, 'Richmond district still SF residual-20');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-20');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-20');
ok(mentionsNonSf('Eagle Rock') === true, 'mentionsNonSf Eagle Rock residual-20');
ok(mentionsNonSf('Silverlake') === true, 'mentionsNonSf Silverlake residual-20');
ok(mentionsNonSf('Crenshaw') === true, 'mentionsNonSf Crenshaw residual-20');
ok(mentionsNonSf('Watts') === true, 'mentionsNonSf Watts residual-20');
ok(mentionsNonSf('Clubhouse-only meetup') === true, 'mentionsNonSf Clubhouse residual-20');
ok(mentionsNonSf('X Spaces only') === true, 'mentionsNonSf X Spaces residual-20');
ok(mentionsNonSf('Orange') === true, 'mentionsNonSf Orange residual-20');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-20');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-20');
ok(offerIsSf({ city: 'Eagle Rock', offer: 'loft' }) === false, 'offer Eagle Rock reject residual-20');
ok(offerIsSf({ city: 'Silverlake', offer: 'room' }) === false, 'offer Silverlake reject residual-20');
ok(offerIsSf({ city: 'Crenshaw', offer: 'warehouse' }) === false, 'offer Crenshaw reject residual-20');
ok(offerIsSf({ city: 'Orange', offer: 'warehouse' }) === false, 'offer Orange reject residual-20');
ok(offerIsSf({ city: 'Newport', offer: 'room' }) === false, 'offer Newport reject residual-20');
ok(offerIsSf({ city: 'Rancho Bernardo', offer: 'office' }) === false, 'offer Rancho Bernardo reject residual-20');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-20');
ok(offerIsSf({ city: 'San Francisco', offer: 'Marina district loft' }) === true, 'offer Marina district still ok residual-20');
// SF geo residual-21: LA Valley/central + Ventura edge that still default-passed
ok(isSfLocation('Chatsworth dinner') === false, 'Chatsworth reject residual-21');
ok(isSfLocation('Toluca Lake loft') === false, 'Toluca Lake reject residual-21');
ok(isSfLocation('Valley Village hang') === false, 'Valley Village reject residual-21');
ok(isSfLocation('Universal City office') === false, 'Universal City reject residual-21');
ok(isSfLocation('Porter Ranch loft') === false, 'Porter Ranch reject residual-21');
ok(isSfLocation('North Hills dinner') === false, 'North Hills reject residual-21');
ok(isSfLocation('Panorama City warehouse') === false, 'Panorama City reject residual-21');
ok(isSfLocation('Winnetka loft') === false, 'Winnetka reject residual-21');
ok(isSfLocation('Shadow Hills dinner') === false, 'Shadow Hills reject residual-21');
ok(isSfLocation('Lake View Terrace hang') === false, 'Lake View Terrace reject residual-21');
ok(isSfLocation('Arleta loft') === false, 'Arleta reject residual-21');
ok(isSfLocation('Mission Hills CA') === false, 'Mission Hills CA reject residual-21');
ok(isSfLocation('Mission Hills dinner') === false, 'Mission Hills bare reject residual-21');
ok(isSfLocation('K-Town dinner') === false, 'K-Town reject residual-21');
ok(isSfLocation('K Town hang') === false, 'K Town reject residual-21');
ok(isSfLocation('Fashion District loft') === false, 'Fashion District reject residual-21');
ok(isSfLocation('Sawtelle dinner') === false, 'Sawtelle reject residual-21');
ok(isSfLocation('Topanga hang') === false, 'Topanga reject residual-21');
ok(isSfLocation('Topanga Canyon loft') === false, 'Topanga Canyon reject residual-21');
ok(isSfLocation('Miracle Mile office') === false, 'Miracle Mile reject residual-21');
ok(isSfLocation('Melrose loft') === false, 'Melrose reject residual-21');
ok(isSfLocation('Larchmont dinner') === false, 'Larchmont reject residual-21');
ok(isSfLocation('Larchmont Village hang') === false, 'Larchmont Village reject residual-21');
ok(isSfLocation('Hancock Park loft') === false, 'Hancock Park reject residual-21');
ok(isSfLocation('Mid-City dinner') === false, 'Mid-City reject residual-21');
ok(isSfLocation('Thai Town hang') === false, 'Thai Town reject residual-21');
ok(isSfLocation('Little Armenia loft') === false, 'Little Armenia reject residual-21');
ok(isSfLocation('Historic Filipinotown dinner') === false, 'Historic Filipinotown reject residual-21');
ok(isSfLocation('MacArthur Park hang') === false, 'MacArthur Park reject residual-21');
ok(isSfLocation('Pico-Union loft') === false, 'Pico-Union reject residual-21');
ok(isSfLocation('Exposition Park dinner') === false, 'Exposition Park reject residual-21');
ok(isSfLocation('UCLA campus hang') === false, 'UCLA campus reject residual-21');
ok(isSfLocation('UCLA') === false, 'UCLA bare reject residual-21');
ok(isSfLocation('Pacific Design Center') === false, 'Pacific Design Center reject residual-21');
ok(isSfLocation('Beverly Center') === false, 'Beverly Center reject residual-21');
ok(isSfLocation('Carthay loft') === false, 'Carthay reject residual-21');
ok(isSfLocation('Wilshire Center office') === false, 'Wilshire Center reject residual-21');
ok(isSfLocation('Glassell dinner') === false, 'Glassell bare reject residual-21');
ok(isSfLocation('Elysian Park hang') === false, 'Elysian Park reject residual-21');
ok(isSfLocation('Westlake Village loft') === false, 'Westlake Village reject residual-21');
ok(isSfLocation('Newbury Park dinner') === false, 'Newbury Park reject residual-21');
ok(isSfLocation('Port Hueneme warehouse') === false, 'Port Hueneme reject residual-21');
ok(isSfLocation('Agoura hang') === false, 'Agoura bare reject residual-21');
ok(isSfLocation('Hidden Hills dinner') === false, 'Hidden Hills reject residual-21');
ok(isSfLocation('Bell Canyon loft') === false, 'Bell Canyon reject residual-21');
ok(isSfLocation('Sunset Beach CA') === false, 'Sunset Beach CA reject residual-21');
ok(isSfLocation('Sunset Beach hang') === false, 'Sunset Beach reject residual-21');
// Still SF after residual-21
ok(isSfLocation('Sunset') === true, 'Sunset district still SF residual-21');
ok(isSfLocation('Sunset District') === true, 'Sunset District still SF residual-21');
ok(isSfLocation('Outer Sunset loft') === true, 'Outer Sunset still SF residual-21');
ok(isSfLocation('Mission') === true, 'Mission still SF residual-21');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF residual-21');
ok(isSfLocation('Marina') === true, 'Marina still SF residual-21');
ok(isSfLocation('Richmond district') === true, 'Richmond district still SF residual-21');
ok(isSfLocation('Castro dinner') === true, 'Castro still SF residual-21');
ok(isSfLocation('Alamo Square') === true, 'Alamo Square still SF residual-21');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-21');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-21');
ok(mentionsNonSf('Chatsworth') === true, 'mentionsNonSf Chatsworth residual-21');
ok(mentionsNonSf('Mission Hills') === true, 'mentionsNonSf Mission Hills residual-21');
ok(mentionsNonSf('K-Town') === true, 'mentionsNonSf K-Town residual-21');
ok(mentionsNonSf('Sunset Beach') === true, 'mentionsNonSf Sunset Beach residual-21');
ok(mentionsNonSf('Topanga Canyon') === true, 'mentionsNonSf Topanga residual-21');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-21');
ok(mentionsNonSf('Sunset District') === false, 'mentionsNonSf Sunset District still SF residual-21');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-21');
ok(offerIsSf({ city: 'Chatsworth', offer: 'loft' }) === false, 'offer Chatsworth reject residual-21');
ok(offerIsSf({ city: 'Mission Hills', offer: 'room' }) === false, 'offer Mission Hills reject residual-21');
ok(offerIsSf({ city: 'Toluca Lake', offer: 'warehouse' }) === false, 'offer Toluca Lake reject residual-21');
ok(offerIsSf({ city: 'Westlake Village', offer: 'office' }) === false, 'offer Westlake Village reject residual-21');
ok(offerIsSf({ city: 'Sunset Beach', offer: 'room' }) === false, 'offer Sunset Beach reject residual-21');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-21');
ok(offerIsSf({ city: 'San Francisco', offer: 'Sunset District loft' }) === true, 'offer Sunset District still ok residual-21');
// SF geo residual-22: remote intensifiers + major intl + US hoods that still default-passed
ok(isSfLocation('purely remote') === false, 'purely remote reject residual-22');
ok(isSfLocation('entirely remote') === false, 'entirely remote reject residual-22');
ok(isSfLocation('completely remote') === false, 'completely remote reject residual-22');
ok(isSfLocation('totally remote') === false, 'totally remote reject residual-22');
ok(isSfLocation('purely remote SF founders') === false, 'purely remote SF founders reject residual-22');
ok(isSfLocation('all-remote founders') === false, 'all-remote reject residual-22');
ok(isSfLocation('all remote night') === false, 'all remote night reject residual-22');
ok(isSfLocation('remote by default') === false, 'remote by default reject residual-22');
ok(isSfLocation('remote preferred') === false, 'remote preferred reject residual-22');
ok(isSfLocation('no physical location') === false, 'no physical location reject residual-22');
ok(isSfLocation('no physical venue') === false, 'no physical venue reject residual-22');
ok(isSfLocation('web-based only') === false, 'web-based only reject residual-22');
ok(isSfLocation('web-based meetup') === false, 'web-based meetup reject residual-22');
ok(isSfLocation('browser-only hang') === false, 'browser-only reject residual-22');
ok(isSfLocation('browser-based hang') === false, 'browser-based reject residual-22');
ok(isSfLocation('app-only meetup') === false, 'app-only reject residual-22');
ok(isSfLocation('platform-only event') === false, 'platform-only reject residual-22');
ok(isSfLocation('digital-first meetup') === false, 'digital-first reject residual-22');
ok(isSfLocation('online-first hang') === false, 'online-first reject residual-22');
ok(isSfLocation('location agnostic') === false, 'location agnostic reject residual-22');
ok(isSfLocation('geo-agnostic meetup') === false, 'geo-agnostic reject residual-22');
ok(isSfLocation('Amsterdam loft') === false, 'Amsterdam reject residual-22');
ok(isSfLocation('Amsterdam dinner') === false, 'Amsterdam dinner reject residual-22');
ok(isSfLocation('Mission loft Amsterdam') === false, 'Mission loft Amsterdam reject residual-22');
ok(isSfLocation('Madrid dinner') === false, 'Madrid reject residual-22');
ok(isSfLocation('Barcelona loft') === false, 'Barcelona reject residual-22');
ok(isSfLocation('Lisbon warehouse') === false, 'Lisbon reject residual-22');
ok(isSfLocation('Copenhagen dinner') === false, 'Copenhagen reject residual-22');
ok(isSfLocation('Stockholm loft') === false, 'Stockholm reject residual-22');
ok(isSfLocation('Oslo hang') === false, 'Oslo reject residual-22');
ok(isSfLocation('Zurich office') === false, 'Zurich reject residual-22');
ok(isSfLocation('Geneva dinner') === false, 'Geneva reject residual-22');
ok(isSfLocation('Munich loft') === false, 'Munich reject residual-22');
ok(isSfLocation('Hamburg warehouse') === false, 'Hamburg reject residual-22');
ok(isSfLocation('Melbourne dinner') === false, 'Melbourne reject residual-22');
ok(isSfLocation('Auckland loft') === false, 'Auckland reject residual-22');
ok(isSfLocation('Hong Kong office') === false, 'Hong Kong reject residual-22');
ok(isSfLocation('Taipei hang') === false, 'Taipei reject residual-22');
ok(isSfLocation('Seoul dinner') === false, 'Seoul reject residual-22');
ok(isSfLocation('Bangkok loft') === false, 'Bangkok reject residual-22');
ok(isSfLocation('Dubai office') === false, 'Dubai reject residual-22');
ok(isSfLocation('Tel Aviv hang') === false, 'Tel Aviv reject residual-22');
ok(isSfLocation('Mumbai dinner') === false, 'Mumbai reject residual-22');
ok(isSfLocation('Bangalore loft') === false, 'Bangalore reject residual-22');
ok(isSfLocation('Bengaluru office') === false, 'Bengaluru reject residual-22');
ok(isSfLocation('São Paulo office') === false, 'Sao Paulo reject residual-22');
ok(isSfLocation('Buenos Aires') === false, 'Buenos Aires reject residual-22');
ok(isSfLocation('Montreal loft') === false, 'Montreal reject residual-22');
ok(isSfLocation('Calgary dinner') === false, 'Calgary reject residual-22');
ok(isSfLocation('Ottawa warehouse') === false, 'Ottawa reject residual-22');
ok(isSfLocation('Capitol Hill dinner') === false, 'Capitol Hill reject residual-22');
ok(isSfLocation('Georgetown dinner') === false, 'Georgetown reject residual-22');
ok(isSfLocation('Dupont Circle') === false, 'Dupont Circle reject residual-22');
ok(isSfLocation('Adams Morgan') === false, 'Adams Morgan reject residual-22');
ok(isSfLocation('Williamsburg loft') === false, 'Williamsburg reject residual-22');
ok(isSfLocation('Bushwick warehouse') === false, 'Bushwick reject residual-22');
ok(isSfLocation('Long Island City') === false, 'Long Island City reject residual-22');
ok(isSfLocation('Hoboken loft') === false, 'Hoboken reject residual-22');
ok(isSfLocation('Brookline loft') === false, 'Brookline reject residual-22');
ok(isSfLocation('New Haven dinner') === false, 'New Haven reject residual-22');
// Still SF after residual-22
ok(isSfLocation('Mission') === true, 'Mission still SF residual-22');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF residual-22');
ok(isSfLocation('Marina') === true, 'Marina still SF residual-22');
ok(isSfLocation('Richmond district') === true, 'Richmond district still SF residual-22');
ok(isSfLocation('Castro dinner') === true, 'Castro still SF residual-22');
ok(isSfLocation('Alamo Square') === true, 'Alamo Square still SF residual-22');
ok(isSfLocation('Sunset District') === true, 'Sunset District still SF residual-22');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-22');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-22');
ok(mentionsNonSf('purely remote') === true, 'mentionsNonSf purely remote residual-22');
ok(mentionsNonSf('Amsterdam') === true, 'mentionsNonSf Amsterdam residual-22');
ok(mentionsNonSf('Hong Kong') === true, 'mentionsNonSf Hong Kong residual-22');
ok(mentionsNonSf('Williamsburg') === true, 'mentionsNonSf Williamsburg residual-22');
ok(mentionsNonSf('web-based only') === true, 'mentionsNonSf web-based residual-22');
ok(mentionsNonSf('Capitol Hill') === true, 'mentionsNonSf Capitol Hill residual-22');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-22');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-22');
ok(offerIsSf({ city: 'Amsterdam', offer: 'loft' }) === false, 'offer Amsterdam reject residual-22');
ok(offerIsSf({ city: 'Hong Kong', offer: 'office' }) === false, 'offer Hong Kong reject residual-22');
ok(offerIsSf({ city: 'Williamsburg', offer: 'warehouse' }) === false, 'offer Williamsburg reject residual-22');
ok(offerIsSf({ city: 'Capitol Hill', offer: 'room' }) === false, 'offer Capitol Hill reject residual-22');
ok(offerIsSf({ city: 'Brookline', offer: 'loft' }) === false, 'offer Brookline reject residual-22');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-22');
ok(offerIsSf({ city: 'San Francisco', offer: 'Marina district loft' }) === true, 'offer Marina district still ok residual-22');
// SF geo residual-23: CO Front Range/mountains + OC edge + more intl that still default-passed
ok(isSfLocation('Fort Collins dinner') === false, 'Fort Collins reject residual-23');
ok(isSfLocation('Fort Collins hang') === false, 'Fort Collins hang reject residual-23');
ok(isSfLocation('Greeley dinner') === false, 'Greeley reject residual-23');
ok(isSfLocation('Pueblo dinner') === false, 'Pueblo reject residual-23');
ok(isSfLocation('Grand Junction loft') === false, 'Grand Junction reject residual-23');
ok(isSfLocation('Aspen hang') === false, 'Aspen reject residual-23');
ok(isSfLocation('Vail loft') === false, 'Vail reject residual-23');
ok(isSfLocation('Breckenridge dinner') === false, 'Breckenridge reject residual-23');
ok(isSfLocation('Durango hang') === false, 'Durango reject residual-23');
ok(isSfLocation('Loveland hang') === false, 'Loveland reject residual-23');
ok(isSfLocation('Boulder dinner') === false, 'Boulder bare reject residual-23');
ok(isSfLocation('Boulder loft') === false, 'Boulder loft reject residual-23');
ok(isSfLocation('Buena Park hang') === false, 'Buena Park reject residual-23');
ok(isSfLocation('Buena Park CA') === false, 'Buena Park CA reject residual-23');
ok(isSfLocation('Cardiff CA') === false, 'Cardiff CA reject residual-23');
ok(isSfLocation('Cardiff-by-the-Sea') === false, 'Cardiff-by-the-Sea reject residual-23');
ok(isSfLocation('Cardiff by the Sea hang') === false, 'Cardiff by the Sea reject residual-23');
ok(isSfLocation('Los Alamitos hang') === false, 'Los Alamitos reject residual-23');
ok(isSfLocation('Coto de Caza dinner') === false, 'Coto de Caza reject residual-23');
ok(isSfLocation('Ladera Ranch hang') === false, 'Ladera Ranch reject residual-23');
ok(isSfLocation('Trabuco Canyon loft') === false, 'Trabuco Canyon reject residual-23');
ok(isSfLocation('Silverado hang') === false, 'Silverado reject residual-23');
ok(isSfLocation('Dixon hang') === false, 'Dixon bare reject residual-23');
ok(isSfLocation('Winters hang') === false, 'Winters bare reject residual-23');
ok(isSfLocation('Edinburgh hang') === false, 'Edinburgh reject residual-23');
ok(isSfLocation('Glasgow dinner') === false, 'Glasgow reject residual-23');
ok(isSfLocation('Bristol hang') === false, 'Bristol reject residual-23');
ok(isSfLocation('Leeds dinner') === false, 'Leeds reject residual-23');
ok(isSfLocation('Liverpool hang') === false, 'Liverpool reject residual-23');
ok(isSfLocation('Vienna loft') === false, 'Vienna reject residual-23');
ok(isSfLocation('Prague dinner') === false, 'Prague reject residual-23');
ok(isSfLocation('Warsaw hang') === false, 'Warsaw reject residual-23');
ok(isSfLocation('Budapest loft') === false, 'Budapest reject residual-23');
ok(isSfLocation('Bucharest dinner') === false, 'Bucharest reject residual-23');
ok(isSfLocation('Athens hang') === false, 'Athens reject residual-23');
ok(isSfLocation('Rome Italy') === false, 'Rome reject residual-23');
ok(isSfLocation('Milan hang') === false, 'Milan reject residual-23');
ok(isSfLocation('Florence dinner') === false, 'Florence reject residual-23');
ok(isSfLocation('Naples hang') === false, 'Naples reject residual-23');
ok(isSfLocation('Brussels loft') === false, 'Brussels reject residual-23');
ok(isSfLocation('Bruges dinner') === false, 'Bruges reject residual-23');
ok(isSfLocation('Antwerp hang') === false, 'Antwerp reject residual-23');
ok(isSfLocation('Rotterdam loft') === false, 'Rotterdam reject residual-23');
ok(isSfLocation('The Hague dinner') === false, 'The Hague reject residual-23');
ok(isSfLocation('Helsinki hang') === false, 'Helsinki reject residual-23');
ok(isSfLocation('Reykjavik loft') === false, 'Reykjavik reject residual-23');
ok(isSfLocation('Cork dinner') === false, 'Cork reject residual-23');
ok(isSfLocation('Guadalajara dinner') === false, 'Guadalajara reject residual-23');
ok(isSfLocation('Monterrey hang') === false, 'Monterrey reject residual-23');
ok(isSfLocation('Cancun loft') === false, 'Cancun reject residual-23');
ok(isSfLocation('Bogota dinner') === false, 'Bogota reject residual-23');
ok(isSfLocation('Lima Peru hang') === false, 'Lima reject residual-23');
ok(isSfLocation('Santiago hang') === false, 'Santiago reject residual-23');
ok(isSfLocation('Cape Town hang') === false, 'Cape Town reject residual-23');
ok(isSfLocation('Johannesburg dinner') === false, 'Johannesburg reject residual-23');
ok(isSfLocation('Nairobi loft') === false, 'Nairobi reject residual-23');
ok(isSfLocation('Lagos hang') === false, 'Lagos reject residual-23');
ok(isSfLocation('Cairo dinner') === false, 'Cairo reject residual-23');
ok(isSfLocation('Istanbul hang') === false, 'Istanbul reject residual-23');
ok(isSfLocation('Beirut loft') === false, 'Beirut reject residual-23');
ok(isSfLocation('Amman dinner') === false, 'Amman reject residual-23');
ok(isSfLocation('Delhi hang') === false, 'Delhi reject residual-23');
ok(isSfLocation('Hyderabad dinner') === false, 'Hyderabad reject residual-23');
ok(isSfLocation('Chennai loft') === false, 'Chennai reject residual-23');
ok(isSfLocation('Kolkata hang') === false, 'Kolkata reject residual-23');
ok(isSfLocation('Pune dinner') === false, 'Pune reject residual-23');
ok(isSfLocation('Jakarta hang') === false, 'Jakarta reject residual-23');
ok(isSfLocation('Manila dinner') === false, 'Manila reject residual-23');
ok(isSfLocation('Kuala Lumpur loft') === false, 'Kuala Lumpur reject residual-23');
ok(isSfLocation('Ho Chi Minh dinner') === false, 'Ho Chi Minh reject residual-23');
ok(isSfLocation('Hanoi hang') === false, 'Hanoi reject residual-23');
ok(isSfLocation('Shanghai dinner') === false, 'Shanghai reject residual-23');
ok(isSfLocation('Beijing loft') === false, 'Beijing reject residual-23');
ok(isSfLocation('Shenzhen hang') === false, 'Shenzhen reject residual-23');
ok(isSfLocation('Guangzhou dinner') === false, 'Guangzhou reject residual-23');
ok(isSfLocation('Osaka dinner') === false, 'Osaka reject residual-23');
ok(isSfLocation('Kyoto loft') === false, 'Kyoto reject residual-23');
ok(isSfLocation('Busan dinner') === false, 'Busan reject residual-23');
ok(isSfLocation('Perth hang') === false, 'Perth reject residual-23');
ok(isSfLocation('Adelaide dinner') === false, 'Adelaide reject residual-23');
ok(isSfLocation('Wellington dinner') === false, 'Wellington reject residual-23');
ok(isSfLocation('Christchurch loft') === false, 'Christchurch reject residual-23');
ok(isSfLocation('Winnipeg hang') === false, 'Winnipeg reject residual-23');
ok(isSfLocation('Quebec City dinner') === false, 'Quebec City reject residual-23');
ok(isSfLocation('Halifax loft') === false, 'Halifax reject residual-23');
ok(isSfLocation('Edmonton hang') === false, 'Edmonton reject residual-23');
// Still SF after residual-23
ok(isSfLocation('Mission') === true, 'Mission still SF residual-23');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF residual-23');
ok(isSfLocation('Marina') === true, 'Marina still SF residual-23');
ok(isSfLocation('Richmond district') === true, 'Richmond district still SF residual-23');
ok(isSfLocation('Castro dinner') === true, 'Castro still SF residual-23');
ok(isSfLocation('Alamo Square') === true, 'Alamo Square still SF residual-23');
ok(isSfLocation('Sunset District') === true, 'Sunset District still SF residual-23');
ok(isSfLocation('Lincoln Way dinner') === true, 'Lincoln Way still SF residual-23');
ok(isSfLocation('Folsom Street dinner') === true, 'Folsom Street still SF residual-23');
ok(isSfLocation('Boulder Creek picnic') === false, 'Boulder Creek still reject residual-23');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-23');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-23');
ok(mentionsNonSf('Fort Collins') === true, 'mentionsNonSf Fort Collins residual-23');
ok(mentionsNonSf('Buena Park') === true, 'mentionsNonSf Buena Park residual-23');
ok(mentionsNonSf('Cardiff-by-the-Sea') === true, 'mentionsNonSf Cardiff residual-23');
ok(mentionsNonSf('Boulder dinner') === true, 'mentionsNonSf Boulder residual-23');
ok(mentionsNonSf('Edinburgh') === true, 'mentionsNonSf Edinburgh residual-23');
ok(mentionsNonSf('Santiago') === true, 'mentionsNonSf Santiago residual-23');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-23');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-23');
ok(mentionsNonSf('Lincoln Way') === false, 'mentionsNonSf Lincoln Way still SF residual-23');
ok(offerIsSf({ city: 'Fort Collins', offer: 'loft' }) === false, 'offer Fort Collins reject residual-23');
ok(offerIsSf({ city: 'Buena Park', offer: 'room' }) === false, 'offer Buena Park reject residual-23');
ok(offerIsSf({ city: 'Cardiff', offer: 'warehouse' }) === false, 'offer Cardiff reject residual-23');
ok(offerIsSf({ city: 'Boulder', offer: 'office' }) === false, 'offer Boulder reject residual-23');
ok(offerIsSf({ city: 'Edinburgh', offer: 'room' }) === false, 'offer Edinburgh reject residual-23');
ok(offerIsSf({ city: 'Santiago', offer: 'loft' }) === false, 'offer Santiago reject residual-23');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-23');
ok(offerIsSf({ city: 'San Francisco', offer: 'Lincoln Way loft' }) === true, 'offer Lincoln Way still ok residual-23');

// SF geo residual-24: remote platforms + US hoods + intl that still default-passed
ok(isSfLocation('WhatsApp-only meetup') === false, 'WhatsApp-only reject residual-24');
ok(isSfLocation('WhatsApp only hang') === false, 'WhatsApp only hang reject residual-24');
ok(isSfLocation('WhatsApp hang') === false, 'WhatsApp hang reject residual-24');
ok(isSfLocation('iMessage-only call') === false, 'iMessage-only reject residual-24');
ok(isSfLocation('iMessage only hang') === false, 'iMessage only hang reject residual-24');
ok(isSfLocation('WeChat-only meetup') === false, 'WeChat-only reject residual-24');
ok(isSfLocation('WeChat only hang') === false, 'WeChat only hang reject residual-24');
ok(isSfLocation('Messenger-only hang') === false, 'Messenger-only reject residual-24');
ok(isSfLocation('Facebook Messenger only') === false, 'Facebook Messenger only reject residual-24');
ok(isSfLocation('Jitsi-only meetup') === false, 'Jitsi-only reject residual-24');
ok(isSfLocation('Jitsi meet only') === false, 'Jitsi meet only reject residual-24');
ok(isSfLocation('Whereby-only hang') === false, 'Whereby-only reject residual-24');
ok(isSfLocation('Remo-only meetup') === false, 'Remo-only reject residual-24');
ok(isSfLocation('Hopin-only event') === false, 'Hopin-only reject residual-24');
ok(isSfLocation('VRChat-only meetup') === false, 'VRChat-only reject residual-24');
ok(isSfLocation('Gather Town only') === false, 'Gather Town only reject residual-24');
ok(isSfLocation('WFH-only hang') === false, 'WFH-only reject residual-24');
ok(isSfLocation('work from home only') === false, 'work from home only reject residual-24');
ok(isSfLocation('work-from-anywhere meetup') === false, 'work-from-anywhere reject residual-24');
ok(isSfLocation('cloud-only meetup') === false, 'cloud-only reject residual-24');
ok(isSfLocation('cloud-first hang') === false, 'cloud-first reject residual-24');
ok(isSfLocation('async-first founders') === false, 'async-first reject residual-24');
ok(isSfLocation('distributed-first founders') === false, 'distributed-first reject residual-24');
ok(isSfLocation('timezone-agnostic meetup') === false, 'timezone-agnostic reject residual-24');
ok(isSfLocation('global-remote dinner') === false, 'global-remote reject residual-24');
ok(isSfLocation('anywhere-in-the-world hang') === false, 'anywhere-in-the-world reject residual-24');
ok(isSfLocation('venue-free hang') === false, 'venue-free reject residual-24');
ok(isSfLocation('location-free meetup') === false, 'location-free reject residual-24');
ok(isSfLocation('no venue meetup') === false, 'no venue reject residual-24');
ok(isSfLocation('Telegram meetup') === false, 'Telegram meetup reject residual-24');
ok(isSfLocation('Signal meetup') === false, 'Signal meetup reject residual-24');
ok(isSfLocation('SMS meetup') === false, 'SMS meetup reject residual-24');
ok(isSfLocation('Astoria loft') === false, 'Astoria reject residual-24');
ok(isSfLocation('Park Slope dinner') === false, 'Park Slope reject residual-24');
ok(isSfLocation('Dumbo loft') === false, 'Dumbo reject residual-24');
ok(isSfLocation('Greenpoint hang') === false, 'Greenpoint reject residual-24');
ok(isSfLocation('Bed-Stuy loft') === false, 'Bed-Stuy reject residual-24');
ok(isSfLocation('Crown Heights dinner') === false, 'Crown Heights reject residual-24');
ok(isSfLocation('Flatbush hang') === false, 'Flatbush reject residual-24');
ok(isSfLocation('Harlem loft') === false, 'Harlem reject residual-24');
ok(isSfLocation('SoHo loft') === false, 'SoHo reject residual-24');
ok(isSfLocation('Tribeca loft') === false, 'Tribeca reject residual-24');
ok(isSfLocation('Midtown loft') === false, 'Midtown reject residual-24');
ok(isSfLocation('Upper East Side') === false, 'Upper East Side reject residual-24');
ok(isSfLocation('Upper West Side') === false, 'Upper West Side reject residual-24');
ok(isSfLocation('Lower East Side') === false, 'Lower East Side reject residual-24');
ok(isSfLocation('Chelsea dinner') === false, 'Chelsea reject residual-24');
ok(isSfLocation('Weehawken dinner') === false, 'Weehawken reject residual-24');
ok(isSfLocation('Asbury Park loft') === false, 'Asbury Park reject residual-24');
ok(isSfLocation('Jersey Shore hang') === false, 'Jersey Shore reject residual-24');
ok(isSfLocation('Somerville loft') === false, 'Somerville reject residual-24');
ok(isSfLocation('Allston dinner') === false, 'Allston reject residual-24');
ok(isSfLocation('Back Bay loft') === false, 'Back Bay reject residual-24');
ok(isSfLocation('South End hang') === false, 'South End reject residual-24');
ok(isSfLocation('Fenway dinner') === false, 'Fenway reject residual-24');
ok(isSfLocation('Beacon Hill loft') === false, 'Beacon Hill reject residual-24');
ok(isSfLocation('Charlestown hang') === false, 'Charlestown reject residual-24');
ok(isSfLocation('Ballard loft') === false, 'Ballard reject residual-24');
ok(isSfLocation('Queen Anne hang') === false, 'Queen Anne reject residual-24');
ok(isSfLocation('Wallingford dinner') === false, 'Wallingford reject residual-24');
ok(isSfLocation('South Lake Union loft') === false, 'South Lake Union reject residual-24');
ok(isSfLocation('Bellevue hang') === false, 'Bellevue bare reject residual-24');
ok(isSfLocation('RiNo loft') === false, 'RiNo reject residual-24');
ok(isSfLocation('LoDo dinner') === false, 'LoDo reject residual-24');
ok(isSfLocation('Cherry Creek hang') === false, 'Cherry Creek reject residual-24');
ok(isSfLocation('Brickell loft') === false, 'Brickell reject residual-24');
ok(isSfLocation('South Beach dinner') === false, 'South Beach reject residual-24');
ok(isSfLocation('Little Havana hang') === false, 'Little Havana reject residual-24');
ok(isSfLocation('Coral Gables loft') === false, 'Coral Gables reject residual-24');
ok(isSfLocation('Hollywood Hills loft') === false, 'Hollywood Hills reject residual-24');
ok(isSfLocation('Rancho Park hang') === false, 'Rancho Park reject residual-24');
ok(isSfLocation('Cheviot Hills dinner') === false, 'Cheviot Hills reject residual-24');
ok(isSfLocation('Beverly Grove dinner') === false, 'Beverly Grove reject residual-24');
ok(isSfLocation('Inland Empire hang') === false, 'Inland Empire reject residual-24');
ok(isSfLocation('Orange County dinner') === false, 'Orange County reject residual-24');
ok(isSfLocation('Frankfurt loft') === false, 'Frankfurt reject residual-24');
ok(isSfLocation('Cologne dinner') === false, 'Cologne reject residual-24');
ok(isSfLocation('Dusseldorf hang') === false, 'Dusseldorf reject residual-24');
ok(isSfLocation('Stuttgart office') === false, 'Stuttgart reject residual-24');
ok(isSfLocation('Lyon dinner') === false, 'Lyon reject residual-24');
ok(isSfLocation('Marseille hang') === false, 'Marseille reject residual-24');
ok(isSfLocation('Nice France loft') === false, 'Nice France reject residual-24');
ok(isSfLocation('Basel loft') === false, 'Basel reject residual-24');
ok(isSfLocation('Lausanne dinner') === false, 'Lausanne reject residual-24');
ok(isSfLocation('Bern hang') === false, 'Bern reject residual-24');
ok(isSfLocation('Luxembourg loft') === false, 'Luxembourg reject residual-24');
ok(isSfLocation('Monaco dinner') === false, 'Monaco reject residual-24');
ok(isSfLocation('Jerusalem loft') === false, 'Jerusalem reject residual-24');
ok(isSfLocation('Haifa dinner') === false, 'Haifa reject residual-24');
ok(isSfLocation('Riyadh loft') === false, 'Riyadh reject residual-24');
ok(isSfLocation('Doha dinner') === false, 'Doha reject residual-24');
ok(isSfLocation('Abu Dhabi hang') === false, 'Abu Dhabi reject residual-24');
ok(isSfLocation('Kuwait City') === false, 'Kuwait City reject residual-24');
ok(isSfLocation('Karachi loft') === false, 'Karachi reject residual-24');
ok(isSfLocation('Lahore dinner') === false, 'Lahore reject residual-24');
ok(isSfLocation('Islamabad hang') === false, 'Islamabad reject residual-24');
ok(isSfLocation('Colombo loft') === false, 'Colombo reject residual-24');
ok(isSfLocation('Kathmandu dinner') === false, 'Kathmandu reject residual-24');
ok(isSfLocation('Phnom Penh loft') === false, 'Phnom Penh reject residual-24');
ok(isSfLocation('Yangon hang') === false, 'Yangon reject residual-24');
ok(isSfLocation('Chiang Mai loft') === false, 'Chiang Mai reject residual-24');
ok(isSfLocation('Phuket dinner') === false, 'Phuket reject residual-24');
ok(isSfLocation('Bali hang') === false, 'Bali reject residual-24');
ok(isSfLocation('Ubud loft') === false, 'Ubud reject residual-24');
ok(isSfLocation('Fiji dinner') === false, 'Fiji reject residual-24');
ok(isSfLocation('Tahiti hang') === false, 'Tahiti reject residual-24');
ok(isSfLocation('CDMX dinner') === false, 'CDMX reject residual-24');
ok(isSfLocation('Ciudad de Mexico loft') === false, 'Ciudad de Mexico reject residual-24');
ok(isSfLocation('Kingston dinner') === false, 'Kingston reject residual-24');
ok(isSfLocation('Hamilton loft') === false, 'Hamilton reject residual-24');
ok(isSfLocation('Waterloo hang') === false, 'Waterloo reject residual-24');
// Still SF after residual-24
ok(isSfLocation('Mission') === true, 'Mission still SF residual-24');
ok(isSfLocation('Mission salon dinner') === true, 'Mission salon still SF residual-24');
ok(isSfLocation('Marina') === true, 'Marina still SF residual-24');
ok(isSfLocation('Richmond district') === true, 'Richmond district still SF residual-24');
ok(isSfLocation('Castro dinner') === true, 'Castro still SF residual-24');
ok(isSfLocation('Alamo Square') === true, 'Alamo Square still SF residual-24');
ok(isSfLocation('Sunset District') === true, 'Sunset District still SF residual-24');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-24');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-24');
ok(isSfLocation('Jitsi meetup + Mission room') === true, 'Jitsi hybrid SF room still ok residual-24');
ok(isSfLocation('gala night') === false, 'generic gala needs SF evidence residual-24');
ok(isSfLocation('have a nice dinner in Mission') === true, 'nice dinner Mission not false Nice residual-24');
ok(mentionsNonSf('WhatsApp-only meetup') === true, 'mentionsNonSf WhatsApp residual-24');
ok(mentionsNonSf('WFH-only hang') === true, 'mentionsNonSf WFH residual-24');
ok(mentionsNonSf('Astoria') === true, 'mentionsNonSf Astoria residual-24');
ok(mentionsNonSf('South Beach') === true, 'mentionsNonSf South Beach residual-24');
ok(mentionsNonSf('Bali') === true, 'mentionsNonSf Bali residual-24');
ok(mentionsNonSf('Frankfurt') === true, 'mentionsNonSf Frankfurt residual-24');
ok(mentionsNonSf('Orange County') === true, 'mentionsNonSf Orange County residual-24');
ok(mentionsNonSf('Mission salon') === false, 'mentionsNonSf Mission still SF residual-24');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina district still SF residual-24');
ok(mentionsNonSf('SoMa loft') === false, 'mentionsNonSf SoMa still SF residual-24');
ok(offerIsSf({ city: 'Astoria', offer: 'loft' }) === false, 'offer Astoria reject residual-24');
ok(offerIsSf({ city: 'South Beach', offer: 'room' }) === false, 'offer South Beach reject residual-24');
ok(offerIsSf({ city: 'Bellevue', offer: 'office' }) === false, 'offer Bellevue reject residual-24');
ok(offerIsSf({ city: 'Bali', offer: 'villa' }) === false, 'offer Bali reject residual-24');
ok(offerIsSf({ city: 'Frankfurt', offer: 'warehouse' }) === false, 'offer Frankfurt reject residual-24');
ok(offerIsSf({ city: 'Orange County', offer: 'room' }) === false, 'offer Orange County reject residual-24');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-24');
ok(offerIsSf({ city: 'San Francisco', offer: 'SoMa loft' }) === true, 'offer SoMa still ok residual-24');
ok(offerIsSf({ city: 'Yerba Buena Island', offer: 'room for 12' }) === true, 'offer Yerba Buena Island accepted');
// SF geo residual-25: NYC metro residual + Philly slang + Eureka Valley SF fix
ok(isSfLocation('Long Island loft') === false, 'Long Island bare reject residual-25');
ok(isSfLocation('Staten Island loft') === false, 'Staten Island reject residual-25');
ok(isSfLocation('Bronx loft') === false, 'Bronx reject residual-25');
ok(isSfLocation('The Bronx loft') === false, 'The Bronx reject residual-25');
ok(isSfLocation('Yonkers loft') === false, 'Yonkers reject residual-25');
ok(isSfLocation('White Plains loft') === false, 'White Plains reject residual-25');
ok(isSfLocation('Westchester loft') === false, 'Westchester reject residual-25');
ok(isSfLocation('Coney Island loft') === false, 'Coney Island reject residual-25');
ok(isSfLocation('Rockaway loft') === false, 'Rockaway reject residual-25');
ok(isSfLocation('Rockaways hang') === false, 'Rockaways reject residual-25');
ok(isSfLocation('Jackson Heights loft') === false, 'Jackson Heights reject residual-25');
ok(isSfLocation('Flushing loft') === false, 'Flushing reject residual-25');
ok(isSfLocation('Bayside loft') === false, 'Bayside reject residual-25');
ok(isSfLocation('Forest Hills loft') === false, 'Forest Hills reject residual-25');
ok(isSfLocation('Bay Ridge loft') === false, 'Bay Ridge reject residual-25');
ok(isSfLocation('Sunset Park loft') === false, 'Sunset Park reject residual-25');
ok(isSfLocation('Red Hook loft') === false, 'Red Hook reject residual-25');
ok(isSfLocation('Fort Greene loft') === false, 'Fort Greene reject residual-25');
ok(isSfLocation('Clinton Hill loft') === false, 'Clinton Hill reject residual-25');
ok(isSfLocation('Prospect Heights loft') === false, 'Prospect Heights reject residual-25');
ok(isSfLocation('Boerum Hill loft') === false, 'Boerum Hill reject residual-25');
ok(isSfLocation('Carroll Gardens loft') === false, 'Carroll Gardens reject residual-25');
ok(isSfLocation('Cobble Hill loft') === false, 'Cobble Hill reject residual-25');
ok(isSfLocation('Gowanus loft') === false, 'Gowanus reject residual-25');
ok(isSfLocation('Hamptons loft') === false, 'Hamptons reject residual-25');
ok(isSfLocation('The Hamptons loft') === false, 'The Hamptons reject residual-25');
ok(isSfLocation('Montauk loft') === false, 'Montauk reject residual-25');
ok(isSfLocation('Fire Island loft') === false, 'Fire Island reject residual-25');
ok(isSfLocation('Philly loft') === false, 'Philly reject residual-25');
ok(isSfLocation('Eureka CA loft') === false, 'Eureka CA still reject residual-25');
ok(isSfLocation('Eureka loft') === false, 'Eureka bare still reject residual-25');
// Still SF after residual-25
ok(isSfLocation('Eureka Valley loft') === true, 'Eureka Valley SF residual-25');
ok(isSfLocation('Eureka Valley') === true, 'Eureka Valley bare SF residual-25');
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-25');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-25');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-25');
ok(isSfLocation('Sunset District loft') === true, 'Sunset District still SF residual-25');
ok(isSfLocation('Sunset loft') === true, 'Sunset still SF residual-25');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-25');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-25');
ok(isSfLocation('Jackson Square loft') === true, 'Jackson Square still SF residual-25');
ok(isSfLocation('Forest Hill SF loft') === true, 'Forest Hill SF still SF residual-25');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-25');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-25');
ok(mentionsNonSf('Long Island loft') === true, 'mentionsNonSf Long Island residual-25');
ok(mentionsNonSf('Staten Island') === true, 'mentionsNonSf Staten Island residual-25');
ok(mentionsNonSf('Bronx') === true, 'mentionsNonSf Bronx residual-25');
ok(mentionsNonSf('Sunset Park') === true, 'mentionsNonSf Sunset Park residual-25');
ok(mentionsNonSf('Philly') === true, 'mentionsNonSf Philly residual-25');
ok(mentionsNonSf('Hamptons') === true, 'mentionsNonSf Hamptons residual-25');
ok(mentionsNonSf('Eureka Valley') === false, 'mentionsNonSf Eureka Valley still SF residual-25');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-25');
ok(mentionsNonSf('Sunset District') === false, 'mentionsNonSf Sunset District still SF residual-25');
ok(offerIsSf({ city: 'Long Island', offer: 'loft' }) === false, 'offer Long Island reject residual-25');
ok(offerIsSf({ city: 'Staten Island', offer: 'loft' }) === false, 'offer Staten Island reject residual-25');
ok(offerIsSf({ city: 'Bronx', offer: 'loft' }) === false, 'offer Bronx reject residual-25');
ok(offerIsSf({ city: 'Philly', offer: 'loft' }) === false, 'offer Philly reject residual-25');
ok(offerIsSf({ city: 'Sunset Park', offer: 'loft' }) === false, 'offer Sunset Park reject residual-25');
ok(offerIsSf({ city: 'Hamptons', offer: 'house' }) === false, 'offer Hamptons reject residual-25');
ok(offerIsSf({ city: 'Eureka', offer: 'loft' }) === false, 'offer Eureka CA reject residual-25');
ok(offerIsSf({ city: 'Eureka Valley', offer: 'loft' }) === true, 'offer Eureka Valley SF residual-25');
ok(offerIsSf({ city: 'San Francisco', offer: 'Eureka Valley loft' }) === true, 'offer Eureka Valley text still ok residual-25');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-25');
// SF geo residual-26: SD county + NYC hood residual that still default-passed
ok(isSfLocation('Lemon Grove CA loft') === false, 'Lemon Grove CA reject residual-26');
ok(isSfLocation('Lemon Grove loft') === false, 'Lemon Grove bare reject residual-26');
ok(isSfLocation('Spring Valley CA loft') === false, 'Spring Valley CA reject residual-26');
ok(isSfLocation('Bonita loft') === false, 'Bonita reject residual-26');
ok(isSfLocation('Lakeside CA loft') === false, 'Lakeside CA reject residual-26');
ok(isSfLocation('Alpine CA loft') === false, 'Alpine CA reject residual-26');
ok(isSfLocation('Ramona CA loft') === false, 'Ramona CA reject residual-26');
ok(isSfLocation('Fallbrook CA loft') === false, 'Fallbrook CA reject residual-26');
ok(isSfLocation('Bonsall loft') === false, 'Bonsall reject residual-26');
ok(isSfLocation('Valley Center loft') === false, 'Valley Center reject residual-26');
ok(isSfLocation('LIC loft') === false, 'LIC abbr reject residual-26');
ok(isSfLocation('LIC') === false, 'LIC bare reject residual-26');
ok(isSfLocation('Kips Bay loft') === false, 'Kips Bay reject residual-26');
ok(isSfLocation('Murray Hill loft') === false, 'Murray Hill reject residual-26');
ok(isSfLocation('Gramercy loft') === false, 'Gramercy reject residual-26');
ok(isSfLocation('Nolita loft') === false, 'Nolita reject residual-26');
ok(isSfLocation('West Village loft') === false, 'West Village reject residual-26');
ok(isSfLocation('East Village loft') === false, 'East Village reject residual-26');
ok(isSfLocation('Battery Park loft') === false, 'Battery Park reject residual-26');
ok(isSfLocation('Meatpacking loft') === false, 'Meatpacking reject residual-26');
ok(isSfLocation('Meatpacking District loft') === false, 'Meatpacking District reject residual-26');
ok(isSfLocation('Washington Heights loft') === false, 'Washington Heights reject residual-26');
ok(isSfLocation('Morningside Heights loft') === false, 'Morningside Heights reject residual-26');
ok(isSfLocation("Hell's Kitchen loft") === false, "Hell's Kitchen reject residual-26");
ok(isSfLocation('Hells Kitchen loft') === false, 'Hells Kitchen reject residual-26');
ok(isSfLocation('Inwood loft') === false, 'Inwood reject residual-26');
ok(isSfLocation('Bensonhurst loft') === false, 'Bensonhurst reject residual-26');
ok(isSfLocation('Sheepshead Bay loft') === false, 'Sheepshead Bay reject residual-26');
ok(isSfLocation('Brighton Beach loft') === false, 'Brighton Beach reject residual-26');
ok(isSfLocation('Dyker Heights loft') === false, 'Dyker Heights reject residual-26');
ok(isSfLocation('Borough Park loft') === false, 'Borough Park reject residual-26');
// Still SF after residual-26
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-26');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-26');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-26');
ok(isSfLocation('Sunset District loft') === true, 'Sunset District still SF residual-26');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-26');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-26');
ok(isSfLocation('Jackson Square loft') === true, 'Jackson Square still SF residual-26');
ok(isSfLocation('FiDi') === true, 'FiDi still SF residual-26');
ok(isSfLocation('Financial District') === true, 'Financial District still SF residual-26');
ok(isSfLocation('Forest Hill SF loft') === true, 'Forest Hill SF still SF residual-26');
ok(isSfLocation('Eureka Valley loft') === true, 'Eureka Valley still SF residual-26');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-26');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-26');
ok(mentionsNonSf('Lemon Grove CA') === true, 'mentionsNonSf Lemon Grove residual-26');
ok(mentionsNonSf('LIC') === true, 'mentionsNonSf LIC residual-26');
ok(mentionsNonSf('West Village') === true, 'mentionsNonSf West Village residual-26');
ok(mentionsNonSf('East Village') === true, 'mentionsNonSf East Village residual-26');
ok(mentionsNonSf("Hell's Kitchen") === true, "mentionsNonSf Hell's Kitchen residual-26");
ok(mentionsNonSf('Kips Bay') === true, 'mentionsNonSf Kips Bay residual-26');
ok(mentionsNonSf('Bensonhurst') === true, 'mentionsNonSf Bensonhurst residual-26');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-26');
ok(mentionsNonSf('FiDi') === false, 'mentionsNonSf FiDi still SF residual-26');
ok(mentionsNonSf('Financial District') === false, 'mentionsNonSf Financial District still SF residual-26');
ok(offerIsSf({ city: 'Lemon Grove', offer: 'loft' }) === false, 'offer Lemon Grove reject residual-26');
ok(offerIsSf({ city: 'LIC', offer: 'loft' }) === false, 'offer LIC reject residual-26');
ok(offerIsSf({ city: 'West Village', offer: 'loft' }) === false, 'offer West Village reject residual-26');
ok(offerIsSf({ city: 'East Village', offer: 'loft' }) === false, 'offer East Village reject residual-26');
ok(offerIsSf({ city: 'Kips Bay', offer: 'loft' }) === false, 'offer Kips Bay reject residual-26');
ok(offerIsSf({ city: 'Spring Valley', offer: 'room' }) === false, 'offer Spring Valley reject residual-26');
ok(offerIsSf({ city: 'Bensonhurst', offer: 'loft' }) === false, 'offer Bensonhurst reject residual-26');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-26');
ok(offerIsSf({ city: 'Financial District', offer: 'room' }) === true, 'offer Financial District still SF residual-26');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-26');
ok(offerIsSf({ city: 'San Francisco', offer: 'SoMa loft' }) === true, 'offer SoMa still ok residual-26');
// SF geo residual-27: SD city hoods + NYC residual that still default-passed
ok(isSfLocation('Point Loma loft') === false, 'Point Loma reject residual-27');
ok(isSfLocation('Hillcrest loft') === false, 'Hillcrest reject residual-27');
ok(isSfLocation('North Park loft') === false, 'North Park reject residual-27');
ok(isSfLocation('Clairemont loft') === false, 'Clairemont reject residual-27');
ok(isSfLocation('Kearny Mesa loft') === false, 'Kearny Mesa reject residual-27');
ok(isSfLocation('Mira Mesa loft') === false, 'Mira Mesa reject residual-27');
ok(isSfLocation('Encanto loft') === false, 'Encanto reject residual-27');
ok(isSfLocation('Barrio Logan loft') === false, 'Barrio Logan reject residual-27');
ok(isSfLocation('Gaslamp loft') === false, 'Gaslamp reject residual-27');
ok(isSfLocation('Gaslamp Quarter loft') === false, 'Gaslamp Quarter reject residual-27');
ok(isSfLocation('Normal Heights loft') === false, 'Normal Heights reject residual-27');
ok(isSfLocation('University Heights loft') === false, 'University Heights reject residual-27');
ok(isSfLocation('Bankers Hill loft') === false, 'Bankers Hill reject residual-27');
ok(isSfLocation('Flatiron loft') === false, 'Flatiron reject residual-27');
ok(isSfLocation('Hudson Yards loft') === false, 'Hudson Yards reject residual-27');
ok(isSfLocation('Roosevelt Island loft') === false, 'Roosevelt Island reject residual-27');
ok(isSfLocation('Governors Island loft') === false, 'Governors Island reject residual-27');
ok(isSfLocation('Hell Kitchen loft') === false, 'Hell Kitchen no-s reject residual-27');
ok(isSfLocation('UES loft') === false, 'UES abbr reject residual-27');
ok(isSfLocation('UWS loft') === false, 'UWS abbr reject residual-27');
// Still SF after residual-27 (Ocean Beach is SF beach; South Park is SoMa)
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach SF still SF residual-27');
ok(isSfLocation('South Park loft') === true, 'South Park SF still SF residual-27');
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-27');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-27');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-27');
ok(isSfLocation('Sunset District loft') === true, 'Sunset District still SF residual-27');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-27');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-27');
ok(isSfLocation('FiDi') === true, 'FiDi still SF residual-27');
ok(isSfLocation('Financial District') === true, 'Financial District still SF residual-27');
ok(isSfLocation('Eureka Valley loft') === true, 'Eureka Valley still SF residual-27');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-27');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-27');
ok(isSfLocation('Ocean Beach San Diego loft') === false, 'Ocean Beach San Diego still reject residual-27');
ok(mentionsNonSf('Point Loma') === true, 'mentionsNonSf Point Loma residual-27');
ok(mentionsNonSf('Hillcrest') === true, 'mentionsNonSf Hillcrest residual-27');
ok(mentionsNonSf('North Park') === true, 'mentionsNonSf North Park residual-27');
ok(mentionsNonSf('Gaslamp') === true, 'mentionsNonSf Gaslamp residual-27');
ok(mentionsNonSf('Flatiron') === true, 'mentionsNonSf Flatiron residual-27');
ok(mentionsNonSf('Hudson Yards') === true, 'mentionsNonSf Hudson Yards residual-27');
ok(mentionsNonSf('UES') === true, 'mentionsNonSf UES residual-27');
ok(mentionsNonSf('UWS') === true, 'mentionsNonSf UWS residual-27');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-27');
ok(mentionsNonSf('Ocean Beach') === false, 'mentionsNonSf Ocean Beach still SF residual-27');
ok(mentionsNonSf('FiDi') === false, 'mentionsNonSf FiDi still SF residual-27');
ok(offerIsSf({ city: 'Point Loma', offer: 'loft' }) === false, 'offer Point Loma reject residual-27');
ok(offerIsSf({ city: 'Hillcrest', offer: 'loft' }) === false, 'offer Hillcrest reject residual-27');
ok(offerIsSf({ city: 'North Park', offer: 'loft' }) === false, 'offer North Park reject residual-27');
ok(offerIsSf({ city: 'Gaslamp', offer: 'room' }) === false, 'offer Gaslamp reject residual-27');
ok(offerIsSf({ city: 'Flatiron', offer: 'loft' }) === false, 'offer Flatiron reject residual-27');
ok(offerIsSf({ city: 'Hudson Yards', offer: 'loft' }) === false, 'offer Hudson Yards reject residual-27');
ok(offerIsSf({ city: 'UES', offer: 'loft' }) === false, 'offer UES reject residual-27');
ok(offerIsSf({ city: 'Clairemont', offer: 'room' }) === false, 'offer Clairemont reject residual-27');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-27');
ok(offerIsSf({ city: 'San Francisco', offer: 'Ocean Beach hang' }) === true, 'offer Ocean Beach still ok residual-27');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-27');
ok(offerIsSf({ city: 'San Francisco', offer: 'SoMa loft' }) === true, 'offer SoMa still ok residual-27');
// SF geo residual-28: more SD city hoods + NYC residual that still default-passed
ok(isSfLocation('Scripps Ranch loft') === false, 'Scripps Ranch reject residual-28');
ok(isSfLocation('Rancho Penasquitos loft') === false, 'Rancho Penasquitos reject residual-28');
ok(isSfLocation('Rancho Peñasquitos loft') === false, 'Rancho Peñasquitos reject residual-28');
ok(isSfLocation('Tierrasanta loft') === false, 'Tierrasanta reject residual-28');
ok(isSfLocation('Serra Mesa loft') === false, 'Serra Mesa reject residual-28');
ok(isSfLocation('Grantville loft') === false, 'Grantville reject residual-28');
ok(isSfLocation('Allied Gardens loft') === false, 'Allied Gardens reject residual-28');
ok(isSfLocation('Del Cerro loft') === false, 'Del Cerro reject residual-28');
ok(isSfLocation('Rolando loft') === false, 'Rolando reject residual-28');
ok(isSfLocation('Talmadge loft') === false, 'Talmadge reject residual-28');
ok(isSfLocation('Logan Heights loft') === false, 'Logan Heights reject residual-28');
ok(isSfLocation('Shelltown loft') === false, 'Shelltown reject residual-28');
ok(isSfLocation('Paradise Hills loft') === false, 'Paradise Hills reject residual-28');
ok(isSfLocation('Otay Mesa loft') === false, 'Otay Mesa reject residual-28');
ok(isSfLocation('San Ysidro loft') === false, 'San Ysidro reject residual-28');
ok(isSfLocation('Sorrento Valley loft') === false, 'Sorrento Valley reject residual-28');
ok(isSfLocation('Torrey Pines loft') === false, 'Torrey Pines reject residual-28');
ok(isSfLocation('Miramar loft') === false, 'Miramar reject residual-28');
ok(isSfLocation('NAS Miramar loft') === false, 'NAS Miramar reject residual-28');
ok(isSfLocation('Liberty Station loft') === false, 'Liberty Station reject residual-28');
ok(isSfLocation('University City loft') === false, 'University City reject residual-28');
ok(isSfLocation('College Area loft') === false, 'College Area reject residual-28');
ok(isSfLocation('Golden Hill loft') === false, 'Golden Hill reject residual-28');
ok(isSfLocation('Midway District loft') === false, 'Midway District reject residual-28');
ok(isSfLocation('Morena loft') === false, 'Morena reject residual-28');
ok(isSfLocation('Bay Park loft') === false, 'Bay Park reject residual-28');
ok(isSfLocation('Wall Street dinner') === false, 'Wall Street reject residual-28');
ok(isSfLocation('Canarsie loft') === false, 'Canarsie reject residual-28');
ok(isSfLocation('Elmhurst loft') === false, 'Elmhurst reject residual-28');
ok(isSfLocation('Rego Park loft') === false, 'Rego Park reject residual-28');
ok(isSfLocation('Middle Village loft') === false, 'Middle Village reject residual-28');
ok(isSfLocation('Maspeth loft') === false, 'Maspeth reject residual-28');
ok(isSfLocation('Atlantic City loft') === false, 'Atlantic City reject residual-28');
ok(isSfLocation('Times Square loft') === false, 'Times Square reject residual-28');
ok(isSfLocation('Bryant Park loft') === false, 'Bryant Park reject residual-28');
ok(isSfLocation('Penn Station loft') === false, 'Penn Station reject residual-28');
ok(isSfLocation('Grand Central loft') === false, 'Grand Central reject residual-28');
ok(isSfLocation('NoMad loft') === false, 'NoMad reject residual-28');
ok(isSfLocation('Bush Terminal loft') === false, 'Bush Terminal reject residual-28');
ok(isSfLocation('Industry City loft') === false, 'Industry City reject residual-28');
ok(isSfLocation('Ozone Park loft') === false, 'Ozone Park reject residual-28');
ok(isSfLocation('Howard Beach loft') === false, 'Howard Beach reject residual-28');
ok(isSfLocation('Jamaica loft') === false, 'Jamaica reject residual-28');
ok(isSfLocation('St. Albans loft') === false, 'St. Albans reject residual-28');
ok(isSfLocation('St Albans loft') === false, 'St Albans no-dot reject residual-28');
ok(isSfLocation('Bayswater loft') === false, 'Bayswater reject residual-28');
ok(isSfLocation('Brownsville loft') === false, 'Brownsville reject residual-28');
ok(isSfLocation('Ditmas Park loft') === false, 'Ditmas Park reject residual-28');
ok(isSfLocation('Midwood loft') === false, 'Midwood reject residual-28');
ok(isSfLocation('Marine Park loft') === false, 'Marine Park reject residual-28');
ok(isSfLocation('Gerritsen Beach loft') === false, 'Gerritsen Beach reject residual-28');
ok(isSfLocation('Mill Basin loft') === false, 'Mill Basin reject residual-28');
ok(isSfLocation('Bergen Beach loft') === false, 'Bergen Beach reject residual-28');
// Still SF after residual-28
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach SF still SF residual-28');
ok(isSfLocation('South Park loft') === true, 'South Park SF still SF residual-28');
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-28');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-28');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-28');
ok(isSfLocation('Sunset District loft') === true, 'Sunset District still SF residual-28');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-28');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-28');
ok(isSfLocation('FiDi') === true, 'FiDi still SF residual-28');
ok(isSfLocation('Financial District') === true, 'Financial District still SF residual-28');
ok(isSfLocation('Eureka Valley loft') === true, 'Eureka Valley still SF residual-28');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-28');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-28');
ok(isSfLocation('Golden Gate Park picnic') === true, 'Golden Gate Park still SF residual-28');
ok(mentionsNonSf('Scripps Ranch') === true, 'mentionsNonSf Scripps Ranch residual-28');
ok(mentionsNonSf('Wall Street') === true, 'mentionsNonSf Wall Street residual-28');
ok(mentionsNonSf('Times Square') === true, 'mentionsNonSf Times Square residual-28');
ok(mentionsNonSf('Canarsie') === true, 'mentionsNonSf Canarsie residual-28');
ok(mentionsNonSf('Torrey Pines') === true, 'mentionsNonSf Torrey Pines residual-28');
ok(mentionsNonSf('Liberty Station') === true, 'mentionsNonSf Liberty Station residual-28');
ok(mentionsNonSf('NoMad') === true, 'mentionsNonSf NoMad residual-28');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-28');
ok(mentionsNonSf('Ocean Beach') === false, 'mentionsNonSf Ocean Beach still SF residual-28');
ok(mentionsNonSf('FiDi') === false, 'mentionsNonSf FiDi still SF residual-28');
ok(mentionsNonSf('South Park') === false, 'mentionsNonSf South Park still SF residual-28');
ok(offerIsSf({ city: 'Scripps Ranch', offer: 'loft' }) === false, 'offer Scripps Ranch reject residual-28');
ok(offerIsSf({ city: 'Wall Street', offer: 'loft' }) === false, 'offer Wall Street reject residual-28');
ok(offerIsSf({ city: 'Times Square', offer: 'loft' }) === false, 'offer Times Square reject residual-28');
ok(offerIsSf({ city: 'Canarsie', offer: 'loft' }) === false, 'offer Canarsie reject residual-28');
ok(offerIsSf({ city: 'Torrey Pines', offer: 'room' }) === false, 'offer Torrey Pines reject residual-28');
ok(offerIsSf({ city: 'Liberty Station', offer: 'room' }) === false, 'offer Liberty Station reject residual-28');
ok(offerIsSf({ city: 'NoMad', offer: 'loft' }) === false, 'offer NoMad reject residual-28');
ok(offerIsSf({ city: 'Elmhurst', offer: 'loft' }) === false, 'offer Elmhurst reject residual-28');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-28');
ok(offerIsSf({ city: 'San Francisco', offer: 'Ocean Beach hang' }) === true, 'offer Ocean Beach still ok residual-28');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-28');
ok(offerIsSf({ city: 'San Francisco', offer: 'SoMa loft' }) === true, 'offer SoMa still ok residual-28');
// SF geo residual-29: NYC residual + US college/mid towns + remote singular Space
ok(isSfLocation('Prospect Park loft') === false, 'Prospect Park reject residual-29');
ok(isSfLocation('Greenwich Village loft') === false, 'Greenwich Village reject residual-29');
ok(isSfLocation('Alphabet City loft') === false, 'Alphabet City reject residual-29');
ok(isSfLocation('South Street Seaport loft') === false, 'South Street Seaport reject residual-29');
ok(isSfLocation('Seaport District loft') === false, 'Seaport District reject residual-29');
ok(isSfLocation('Pier 17 loft') === false, 'Pier 17 reject residual-29');
ok(isSfLocation('Central Park West loft') === false, 'Central Park West reject residual-29');
ok(isSfLocation('Central Park South loft') === false, 'Central Park South reject residual-29');
ok(isSfLocation('Lincoln Center loft') === false, 'Lincoln Center reject residual-29');
ok(isSfLocation('High Line loft') === false, 'High Line reject residual-29');
ok(isSfLocation('Bedford-Stuyvesant loft') === false, 'Bedford-Stuyvesant reject residual-29');
ok(isSfLocation('Bedford Stuyvesant loft') === false, 'Bedford Stuyvesant reject residual-29');
ok(isSfLocation('Prospect Lefferts loft') === false, 'Prospect Lefferts reject residual-29');
ok(isSfLocation('Prospect-Lefferts Gardens loft') === false, 'Prospect-Lefferts Gardens reject residual-29');
ok(isSfLocation('Herald Square loft') === false, 'Herald Square reject residual-29');
ok(isSfLocation('Two Bridges loft') === false, 'Two Bridges reject residual-29');
ok(isSfLocation('Iowa City loft') === false, 'Iowa City reject residual-29');
ok(isSfLocation('Cedar Rapids loft') === false, 'Cedar Rapids reject residual-29');
ok(isSfLocation('Cedar Falls loft') === false, 'Cedar Falls reject residual-29');
ok(isSfLocation('Ames IA loft') === false, 'Ames IA reject residual-29');
ok(isSfLocation('Kalamazoo loft') === false, 'Kalamazoo reject residual-29');
ok(isSfLocation('Chapel Hill loft') === false, 'Chapel Hill reject residual-29');
ok(isSfLocation('Champaign loft') === false, 'Champaign reject residual-29');
ok(isSfLocation('Urbana loft') === false, 'Urbana reject residual-29');
ok(isSfLocation('Ithaca loft') === false, 'Ithaca reject residual-29');
ok(isSfLocation('Burlington VT loft') === false, 'Burlington VT reject residual-29');
ok(isSfLocation('Burlington loft') === false, 'Burlington bare reject residual-29');
ok(isSfLocation('Charlottesville loft') === false, 'Charlottesville reject residual-29');
ok(isSfLocation('Blacksburg loft') === false, 'Blacksburg reject residual-29');
ok(isSfLocation('Columbia loft') === false, 'Columbia bare reject residual-29');
ok(isSfLocation('Columbia MO loft') === false, 'Columbia MO reject residual-29');
ok(isSfLocation('Twitter Space only') === false, 'Twitter Space singular remote reject residual-29');
ok(isSfLocation('X Space only') === false, 'X Space singular remote reject residual-29');
ok(isSfLocation('Twitter Space night') === false, 'Twitter Space night remote reject residual-29');
ok(isSfLocation('X Space meetup') === false, 'X Space meetup remote reject residual-29');
ok(isSfLocation('only on Clubhouse') === false, 'only on Clubhouse remote reject residual-29');
ok(isSfLocation('only on Spaces') === false, 'only on Spaces remote reject residual-29');
ok(isSfLocation('only-on-zoom') === false, 'only-on-zoom hyphen remote reject residual-29');
// Still SF after residual-29
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach SF still SF residual-29');
ok(isSfLocation('South Park loft') === true, 'South Park SF still SF residual-29');
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-29');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-29');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-29');
ok(isSfLocation('Sunset District loft') === true, 'Sunset District still SF residual-29');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-29');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-29');
ok(isSfLocation('FiDi') === true, 'FiDi still SF residual-29');
ok(isSfLocation('Financial District') === true, 'Financial District still SF residual-29');
ok(isSfLocation('Union Square loft') === true, 'Union Square still SF residual-29');
ok(isSfLocation('Chinatown loft') === true, 'Chinatown still SF residual-29');
ok(isSfLocation('Lincoln Way loft') === true, 'Lincoln Way still SF residual-29');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-29');
ok(isSfLocation('Golden Gate Park picnic') === true, 'Golden Gate Park still SF residual-29');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-29');
ok(mentionsNonSf('Prospect Park') === true, 'mentionsNonSf Prospect Park residual-29');
ok(mentionsNonSf('Greenwich Village') === true, 'mentionsNonSf Greenwich Village residual-29');
ok(mentionsNonSf('Lincoln Center') === true, 'mentionsNonSf Lincoln Center residual-29');
ok(mentionsNonSf('Iowa City') === true, 'mentionsNonSf Iowa City residual-29');
ok(mentionsNonSf('Twitter Space only') === true, 'mentionsNonSf Twitter Space residual-29');
ok(mentionsNonSf('Chapel Hill') === true, 'mentionsNonSf Chapel Hill residual-29');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-29');
ok(mentionsNonSf('Lincoln Way') === false, 'mentionsNonSf Lincoln Way still SF residual-29');
ok(mentionsNonSf('Union Square') === false, 'mentionsNonSf Union Square still SF residual-29');
ok(mentionsNonSf('Ocean Beach') === false, 'mentionsNonSf Ocean Beach still SF residual-29');
ok(offerIsSf({ city: 'Prospect Park', offer: 'loft' }) === false, 'offer Prospect Park reject residual-29');
ok(offerIsSf({ city: 'Greenwich Village', offer: 'loft' }) === false, 'offer Greenwich Village reject residual-29');
ok(offerIsSf({ city: 'Iowa City', offer: 'loft' }) === false, 'offer Iowa City reject residual-29');
ok(offerIsSf({ city: 'Lincoln Center', offer: 'room' }) === false, 'offer Lincoln Center reject residual-29');
ok(offerIsSf({ city: 'Chapel Hill', offer: 'room' }) === false, 'offer Chapel Hill reject residual-29');
ok(offerIsSf({ city: 'High Line', offer: 'loft' }) === false, 'offer High Line reject residual-29');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-29');
ok(offerIsSf({ city: 'San Francisco', offer: 'Lincoln Way hang' }) === true, 'offer Lincoln Way still ok residual-29');
ok(offerIsSf({ city: 'San Francisco', offer: 'Union Square loft' }) === true, 'offer Union Square still ok residual-29');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-29');
// SF geo residual-30: NYC residual + US college/mid towns + remote BlueJeans/GoToMeeting
ok(isSfLocation('Rockefeller Center loft') === false, 'Rockefeller Center reject residual-30');
ok(isSfLocation('Empire State loft') === false, 'Empire State reject residual-30');
ok(isSfLocation('Empire State Building loft') === false, 'Empire State Building reject residual-30');
ok(isSfLocation('Tompkins Square loft') === false, 'Tompkins Square reject residual-30');
ok(isSfLocation('St Marks Place loft') === false, 'St Marks Place reject residual-30');
ok(isSfLocation("St. Mark's Place loft") === false, "St. Mark's Place reject residual-30");
ok(isSfLocation('Bowery loft') === false, 'Bowery reject residual-30');
ok(isSfLocation('Madison Square loft') === false, 'Madison Square reject residual-30');
ok(isSfLocation('Madison Square Park loft') === false, 'Madison Square Park reject residual-30');
ok(isSfLocation('Park Avenue loft') === false, 'Park Avenue reject residual-30');
ok(isSfLocation('Corvallis loft') === false, 'Corvallis reject residual-30');
ok(isSfLocation('Pullman loft') === false, 'Pullman reject residual-30');
ok(isSfLocation('State College loft') === false, 'State College reject residual-30');
ok(isSfLocation('College Station loft') === false, 'College Station reject residual-30');
ok(isSfLocation('College Park loft') === false, 'College Park reject residual-30');
ok(isSfLocation('Tempe loft') === false, 'Tempe reject residual-30');
ok(isSfLocation('Mesa loft') === false, 'Mesa reject residual-30');
ok(isSfLocation('Tuscaloosa loft') === false, 'Tuscaloosa reject residual-30');
ok(isSfLocation('Amherst loft') === false, 'Amherst reject residual-30');
ok(isSfLocation('Northampton loft') === false, 'Northampton reject residual-30');
ok(isSfLocation('Poughkeepsie loft') === false, 'Poughkeepsie reject residual-30');
ok(isSfLocation('Schenectady loft') === false, 'Schenectady reject residual-30');
ok(isSfLocation('Binghamton loft') === false, 'Binghamton reject residual-30');
ok(isSfLocation('Utica loft') === false, 'Utica reject residual-30');
ok(isSfLocation('New Brunswick loft') === false, 'New Brunswick reject residual-30');
ok(isSfLocation('University Park loft') === false, 'University Park reject residual-30');
ok(isSfLocation('Lubbock loft') === false, 'Lubbock reject residual-30');
ok(isSfLocation('Waco loft') === false, 'Waco reject residual-30');
ok(isSfLocation('Denton loft') === false, 'Denton reject residual-30');
ok(isSfLocation('Stillwater loft') === false, 'Stillwater reject residual-30');
ok(isSfLocation('Duluth loft') === false, 'Duluth reject residual-30');
ok(isSfLocation('Ames loft') === false, 'Ames bare reject residual-30');
ok(isSfLocation('Great Falls loft') === false, 'Great Falls reject residual-30');
ok(isSfLocation('Pocatello loft') === false, 'Pocatello reject residual-30');
ok(isSfLocation('Ogden loft') === false, 'Ogden reject residual-30');
ok(isSfLocation('Las Cruces loft') === false, 'Las Cruces reject residual-30');
ok(isSfLocation('Amarillo loft') === false, 'Amarillo reject residual-30');
ok(isSfLocation('Midland loft') === false, 'Midland reject residual-30');
ok(isSfLocation('St George loft') === false, 'St George reject residual-30');
ok(isSfLocation('St. George loft') === false, 'St. George reject residual-30');
ok(isSfLocation('Starkville loft') === false, 'Starkville reject residual-30');
ok(isSfLocation('Hattiesburg loft') === false, 'Hattiesburg reject residual-30');
ok(isSfLocation('Biloxi loft') === false, 'Biloxi reject residual-30');
ok(isSfLocation('Gulfport loft') === false, 'Gulfport reject residual-30');
ok(isSfLocation('Key West loft') === false, 'Key West reject residual-30');
ok(isSfLocation('Myrtle Beach loft') === false, 'Myrtle Beach reject residual-30');
ok(isSfLocation('Youngstown loft') === false, 'Youngstown reject residual-30');
ok(isSfLocation('Harrisburg loft') === false, 'Harrisburg reject residual-30');
ok(isSfLocation('Allentown loft') === false, 'Allentown reject residual-30');
ok(isSfLocation('Scranton loft') === false, 'Scranton reject residual-30');
ok(isSfLocation('Erie loft') === false, 'Erie reject residual-30');
ok(isSfLocation('Stamford loft') === false, 'Stamford reject residual-30');
ok(isSfLocation('Bridgeport loft') === false, 'Bridgeport reject residual-30');
ok(isSfLocation('Evanston loft') === false, 'Evanston reject residual-30');
ok(isSfLocation('Naperville loft') === false, 'Naperville reject residual-30');
ok(isSfLocation('Peoria loft') === false, 'Peoria reject residual-30');
ok(isSfLocation('Logan loft') === false, 'Logan bare reject residual-30');
ok(isSfLocation('Norman loft') === false, 'Norman reject residual-30');
ok(isSfLocation('Troy loft') === false, 'Troy reject residual-30');
ok(isSfLocation('Lawrence loft') === false, 'Lawrence reject residual-30');
ok(isSfLocation('Oxford loft') === false, 'Oxford reject residual-30');
ok(isSfLocation('Bend loft') === false, 'Bend bare reject residual-30');
ok(isSfLocation('Salem loft') === false, 'Salem bare reject residual-30');
ok(isSfLocation('BlueJeans only') === false, 'BlueJeans only remote reject residual-30');
ok(isSfLocation('GoToMeeting only') === false, 'GoToMeeting only remote reject residual-30');
// Still SF after residual-30
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach SF still SF residual-30');
ok(isSfLocation('South Park loft') === true, 'South Park SF still SF residual-30');
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-30');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-30');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-30');
ok(isSfLocation('Sunset District loft') === true, 'Sunset District still SF residual-30');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-30');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-30');
ok(isSfLocation('FiDi') === true, 'FiDi still SF residual-30');
ok(isSfLocation('Financial District') === true, 'Financial District still SF residual-30');
ok(isSfLocation('Union Square loft') === true, 'Union Square still SF residual-30');
ok(isSfLocation('Chinatown loft') === true, 'Chinatown still SF residual-30');
ok(isSfLocation('Lincoln Way loft') === true, 'Lincoln Way still SF residual-30');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-30');
ok(isSfLocation('Washington Square loft') === true, 'Washington Square SF still SF residual-30');
ok(isSfLocation('North Beach loft') === true, 'North Beach still SF residual-30');
ok(isSfLocation('Golden Gate Park picnic') === true, 'Golden Gate Park still SF residual-30');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-30');
ok(mentionsNonSf('Rockefeller Center') === true, 'mentionsNonSf Rockefeller Center residual-30');
ok(mentionsNonSf('Empire State') === true, 'mentionsNonSf Empire State residual-30');
ok(mentionsNonSf('Tompkins Square') === true, 'mentionsNonSf Tompkins Square residual-30');
ok(mentionsNonSf('Corvallis') === true, 'mentionsNonSf Corvallis residual-30');
ok(mentionsNonSf('Ames loft') === true, 'mentionsNonSf Ames bare residual-30');
ok(mentionsNonSf('Bend loft') === true, 'mentionsNonSf Bend bare residual-30');
ok(mentionsNonSf('BlueJeans only') === true, 'mentionsNonSf BlueJeans only residual-30');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-30');
ok(mentionsNonSf('Washington Square') === false, 'mentionsNonSf Washington Square still SF residual-30');
ok(mentionsNonSf('Lincoln Way') === false, 'mentionsNonSf Lincoln Way still SF residual-30');
ok(mentionsNonSf('Ocean Beach') === false, 'mentionsNonSf Ocean Beach still SF residual-30');
ok(offerIsSf({ city: 'Rockefeller Center', offer: 'loft' }) === false, 'offer Rockefeller Center reject residual-30');
ok(offerIsSf({ city: 'Empire State', offer: 'loft' }) === false, 'offer Empire State reject residual-30');
ok(offerIsSf({ city: 'Corvallis', offer: 'room' }) === false, 'offer Corvallis reject residual-30');
ok(offerIsSf({ city: 'Tempe', offer: 'room' }) === false, 'offer Tempe reject residual-30');
ok(offerIsSf({ city: 'Ames', offer: 'loft' }) === false, 'offer Ames bare reject residual-30');
ok(offerIsSf({ city: 'Bend', offer: 'loft' }) === false, 'offer Bend bare reject residual-30');
ok(offerIsSf({ city: 'Park Avenue', offer: 'loft' }) === false, 'offer Park Avenue reject residual-30');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-30');
ok(offerIsSf({ city: 'San Francisco', offer: 'Washington Square hang' }) === true, 'offer Washington Square still ok residual-30');
ok(offerIsSf({ city: 'San Francisco', offer: 'Lincoln Way hang' }) === true, 'offer Lincoln Way still ok residual-30');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-30');
// SF geo residual-31: NYC residual + US mid/college + remote platform+loft
ok(isSfLocation('LES loft') === false, 'LES reject residual-31');
ok(isSfLocation('L.E.S. loft') === false, 'L.E.S. reject residual-31');
ok(isSfLocation('Morningside loft') === false, 'Morningside bare reject residual-31');
ok(isSfLocation('Morningside dinner') === false, 'Morningside dinner reject residual-31');
ok(isSfLocation('Hudson Square loft') === false, 'Hudson Square reject residual-31');
ok(isSfLocation('Ridgewood loft') === false, 'Ridgewood reject residual-31');
ok(isSfLocation('South Slope loft') === false, 'South Slope reject residual-31');
ok(isSfLocation('Ditmas loft') === false, 'Ditmas bare reject residual-31');
ok(isSfLocation('Bangor loft') === false, 'Bangor reject residual-31');
ok(isSfLocation('Augusta loft') === false, 'Augusta reject residual-31');
ok(isSfLocation('Montpelier loft') === false, 'Montpelier reject residual-31');
ok(isSfLocation('Portsmouth loft') === false, 'Portsmouth reject residual-31');
ok(isSfLocation('Trenton loft') === false, 'Trenton reject residual-31');
ok(isSfLocation('Dover loft') === false, 'Dover reject residual-31');
ok(isSfLocation('Huntington loft') === false, 'Huntington bare reject residual-31');
ok(isSfLocation('Lynchburg loft') === false, 'Lynchburg reject residual-31');
ok(isSfLocation('Greenville loft') === false, 'Greenville reject residual-31');
ok(isSfLocation('Spartanburg loft') === false, 'Spartanburg reject residual-31');
ok(isSfLocation('Fayetteville loft') === false, 'Fayetteville bare reject residual-31');
ok(isSfLocation('Daytona loft') === false, 'Daytona reject residual-31');
ok(isSfLocation('Daytona Beach loft') === false, 'Daytona Beach reject residual-31');
ok(isSfLocation('Fort Myers loft') === false, 'Fort Myers reject residual-31');
ok(isSfLocation('St Pete loft') === false, 'St Pete reject residual-31');
ok(isSfLocation('St Petersburg loft') === false, 'St Petersburg reject residual-31');
ok(isSfLocation('Clearwater loft') === false, 'Clearwater reject residual-31');
ok(isSfLocation('Whereby loft') === false, 'Whereby loft remote reject residual-31');
ok(isSfLocation('Jitsi loft') === false, 'Jitsi loft remote reject residual-31');
ok(isSfLocation('Hopin loft') === false, 'Hopin loft remote reject residual-31');
ok(isSfLocation('Remo loft') === false, 'Remo loft remote reject residual-31');
ok(isSfLocation('Spatial loft') === false, 'Spatial loft remote reject residual-31');
ok(isSfLocation('VRChat loft') === false, 'VRChat loft remote reject residual-31');
ok(isSfLocation('Microsoft Teams loft') === false, 'Microsoft Teams loft remote reject residual-31');
ok(isSfLocation('Teams loft') === false, 'Teams loft remote reject residual-31');
ok(isSfLocation('Discord loft') === false, 'Discord loft remote reject residual-31');
ok(isSfLocation('Zoom loft') === false, 'Zoom loft remote reject residual-31');
ok(isSfLocation('Slack loft') === false, 'Slack loft remote reject residual-31');
ok(isSfLocation('Webex loft') === false, 'Webex loft remote reject residual-31');
ok(isSfLocation('Skype loft') === false, 'Skype loft remote reject residual-31');
ok(isSfLocation('Facetime loft') === false, 'Facetime loft remote reject residual-31');
ok(isSfLocation('Hangouts loft') === false, 'Hangouts loft remote reject residual-31');
ok(isSfLocation('Telegram loft') === false, 'Telegram loft remote reject residual-31');
ok(isSfLocation('Signal loft') === false, 'Signal loft remote reject residual-31');
ok(isSfLocation('BlueJeans loft') === false, 'BlueJeans loft remote reject residual-31');
ok(isSfLocation('GoToMeeting loft') === false, 'GoToMeeting loft remote reject residual-31');
ok(isSfLocation('Whereby dinner') === false, 'Whereby dinner remote reject residual-31');
// Still SF after residual-31
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach SF still SF residual-31');
ok(isSfLocation('South Park loft') === true, 'South Park SF still SF residual-31');
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-31');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-31');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-31');
ok(isSfLocation('Sunset District loft') === true, 'Sunset District still SF residual-31');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-31');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-31');
ok(isSfLocation('FiDi') === true, 'FiDi still SF residual-31');
ok(isSfLocation('Financial District') === true, 'Financial District still SF residual-31');
ok(isSfLocation('Union Square loft') === true, 'Union Square still SF residual-31');
ok(isSfLocation('Chinatown loft') === true, 'Chinatown still SF residual-31');
ok(isSfLocation('Lincoln Way loft') === true, 'Lincoln Way still SF residual-31');
ok(isSfLocation('SoMa loft') === true, 'SoMa still SF residual-31');
ok(isSfLocation('Washington Square loft') === true, 'Washington Square SF still SF residual-31');
ok(isSfLocation('North Beach loft') === true, 'North Beach still SF residual-31');
ok(isSfLocation('Golden Gate Park picnic') === true, 'Golden Gate Park still SF residual-31');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-31');
ok(isSfLocation('Mission room with Zoom option') === true, 'Mission Zoom hybrid still SF residual-31');
ok(mentionsNonSf('LES loft') === true, 'mentionsNonSf LES residual-31');
ok(mentionsNonSf('L.E.S. loft') === true, 'mentionsNonSf L.E.S. residual-31');
ok(mentionsNonSf('Morningside loft') === true, 'mentionsNonSf Morningside residual-31');
ok(mentionsNonSf('Hudson Square') === true, 'mentionsNonSf Hudson Square residual-31');
ok(mentionsNonSf('Ridgewood loft') === true, 'mentionsNonSf Ridgewood residual-31');
ok(mentionsNonSf('Bangor loft') === true, 'mentionsNonSf Bangor residual-31');
ok(mentionsNonSf('St Pete loft') === true, 'mentionsNonSf St Pete residual-31');
ok(mentionsNonSf('Whereby loft') === true, 'mentionsNonSf Whereby loft residual-31');
ok(mentionsNonSf('Teams loft') === true, 'mentionsNonSf Teams loft residual-31');
ok(mentionsNonSf('Zoom loft') === true, 'mentionsNonSf Zoom loft residual-31');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-31');
ok(mentionsNonSf('Washington Square') === false, 'mentionsNonSf Washington Square still SF residual-31');
ok(mentionsNonSf('Lincoln Way') === false, 'mentionsNonSf Lincoln Way still SF residual-31');
ok(mentionsNonSf('Ocean Beach') === false, 'mentionsNonSf Ocean Beach still SF residual-31');
ok(mentionsNonSf('hybrid Teams + Mission loft') === false, 'mentionsNonSf hybrid Teams+Mission still SF residual-31');
ok(offerIsSf({ city: 'LES', offer: 'loft' }) === false, 'offer LES reject residual-31');
ok(offerIsSf({ city: 'Morningside', offer: 'loft' }) === false, 'offer Morningside reject residual-31');
ok(offerIsSf({ city: 'Hudson Square', offer: 'loft' }) === false, 'offer Hudson Square reject residual-31');
ok(offerIsSf({ city: 'Ridgewood', offer: 'loft' }) === false, 'offer Ridgewood reject residual-31');
ok(offerIsSf({ city: 'Bangor', offer: 'room' }) === false, 'offer Bangor reject residual-31');
ok(offerIsSf({ city: 'St Petersburg', offer: 'loft' }) === false, 'offer St Petersburg reject residual-31');
ok(offerIsSf({ city: 'Clearwater', offer: 'loft' }) === false, 'offer Clearwater reject residual-31');
ok(offerIsSf({ city: 'Whereby loft', offer: 'remote' }) === false, 'offer Whereby loft reject residual-31');
ok(offerIsSf({ city: 'Teams loft', offer: 'remote' }) === false, 'offer Teams loft reject residual-31');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-31');
ok(offerIsSf({ city: 'San Francisco', offer: 'Washington Square hang' }) === true, 'offer Washington Square still ok residual-31');
ok(offerIsSf({ city: 'San Francisco', offer: 'Lincoln Way hang' }) === true, 'offer Lincoln Way still ok residual-31');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-31');
ok(offerIsSf({ city: 'San Francisco', offer: 'hybrid Teams + Mission loft' }) === true, 'offer hybrid Teams+Mission still ok residual-31');
// SF geo residual-32: FL/plains/VA + Richmond KY|IN|TX + messaging platform+loft
ok(isSfLocation('Ocala loft') === false, 'Ocala reject residual-32');
ok(isSfLocation('Boca loft') === false, 'Boca bare reject residual-32');
ok(isSfLocation('Lakeland loft') === false, 'Lakeland reject residual-32');
ok(isSfLocation('Fort Pierce loft') === false, 'Fort Pierce reject residual-32');
ok(isSfLocation('Port St Lucie loft') === false, 'Port St Lucie reject residual-32');
ok(isSfLocation('Deltona loft') === false, 'Deltona reject residual-32');
ok(isSfLocation('Palm Bay loft') === false, 'Palm Bay reject residual-32');
ok(isSfLocation('Homestead loft') === false, 'Homestead reject residual-32');
ok(isSfLocation('Kissimmee loft') === false, 'Kissimmee reject residual-32');
ok(isSfLocation('Bradenton loft') === false, 'Bradenton reject residual-32');
ok(isSfLocation('Pierre loft') === false, 'Pierre reject residual-32');
ok(isSfLocation('Helena loft') === false, 'Helena reject residual-32');
ok(isSfLocation('Laramie loft') === false, 'Laramie reject residual-32');
ok(isSfLocation('Butte loft') === false, 'Butte reject residual-32');
ok(isSfLocation('Kalispell loft') === false, 'Kalispell reject residual-32');
ok(isSfLocation('Twin Falls loft') === false, 'Twin Falls reject residual-32');
ok(isSfLocation('Hampton loft') === false, 'Hampton reject residual-32');
ok(isSfLocation('Chesapeake loft') === false, 'Chesapeake reject residual-32');
ok(isSfLocation('Suffolk loft') === false, 'Suffolk reject residual-32');
ok(isSfLocation('Fredericksburg loft') === false, 'Fredericksburg reject residual-32');
ok(isSfLocation('Richmond KY loft') === false, 'Richmond KY reject residual-32');
ok(isSfLocation('Richmond Kentucky') === false, 'Richmond Kentucky reject residual-32');
ok(isSfLocation('Richmond IN loft') === false, 'Richmond IN reject residual-32');
ok(isSfLocation('Richmond Texas') === false, 'Richmond Texas reject residual-32');
ok(isSfLocation('WhatsApp loft') === false, 'WhatsApp loft remote reject residual-32');
ok(isSfLocation('WeChat loft') === false, 'WeChat loft remote reject residual-32');
ok(isSfLocation('iMessage loft') === false, 'iMessage loft remote reject residual-32');
ok(isSfLocation('Messenger loft') === false, 'Messenger loft remote reject residual-32');
ok(isSfLocation('Facebook Messenger loft') === false, 'Facebook Messenger loft remote reject residual-32');
ok(isSfLocation('WhatsApp dinner') === false, 'WhatsApp dinner remote reject residual-32');
ok(isSfLocation('WeChat dinner') === false, 'WeChat dinner remote reject residual-32');
ok(isSfLocation('Google Meet loft') === false, 'Google Meet loft remote reject residual-32');
ok(isSfLocation('Google Meet dinner') === false, 'Google Meet dinner remote reject residual-32');
ok(isSfLocation('Meet loft') === false, 'Meet loft remote reject residual-32');
ok(isSfLocation('Meet room dinner') === false, 'Meet room dinner remote reject residual-32');
ok(isSfLocation('Meet hang') === false, 'Meet hang remote reject residual-32');
ok(isSfLocation('only on WhatsApp') === false, 'only on WhatsApp reject residual-32');
ok(isSfLocation('only on WeChat') === false, 'only on WeChat reject residual-32');
ok(isSfLocation('only-on-whatsapp') === false, 'only-on-whatsapp reject residual-32');
ok(isSfLocation('Gather.town loft') === false, 'Gather.town loft remote reject residual-32');
ok(isSfLocation('platform loft hang') === false, 'platform loft hang reject residual-32');
// Still SF after residual-32
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-32');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-32');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-32');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-32');
ok(isSfLocation('Richmond loft') === true, 'Richmond bare district still SF residual-32');
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach still SF residual-32');
ok(isSfLocation('Lincoln Way loft') === true, 'Lincoln Way still SF residual-32');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-32');
ok(isSfLocation('FiDi loft') === true, 'FiDi still SF residual-32');
ok(isSfLocation('Meet at Mission loft') === true, 'Meet at Mission still SF residual-32');
ok(isSfLocation('Google Meet hybrid Mission') === true, 'Google Meet hybrid Mission still SF residual-32');
ok(isSfLocation('WhatsApp group for Mission loft') === true, 'WhatsApp+Mission hybrid still SF residual-32');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-32');
ok(mentionsNonSf('Ocala loft') === true, 'mentionsNonSf Ocala residual-32');
ok(mentionsNonSf('Boca loft') === true, 'mentionsNonSf Boca residual-32');
ok(mentionsNonSf('Pierre loft') === true, 'mentionsNonSf Pierre residual-32');
ok(mentionsNonSf('Helena loft') === true, 'mentionsNonSf Helena residual-32');
ok(mentionsNonSf('Hampton loft') === true, 'mentionsNonSf Hampton residual-32');
ok(mentionsNonSf('Richmond KY loft') === true, 'mentionsNonSf Richmond KY residual-32');
ok(mentionsNonSf('Richmond Texas') === true, 'mentionsNonSf Richmond Texas residual-32');
ok(mentionsNonSf('WhatsApp loft') === true, 'mentionsNonSf WhatsApp loft residual-32');
ok(mentionsNonSf('Google Meet loft') === true, 'mentionsNonSf Google Meet loft residual-32');
ok(mentionsNonSf('Meet loft') === true, 'mentionsNonSf Meet loft residual-32');
ok(mentionsNonSf('only on WhatsApp') === true, 'mentionsNonSf only on WhatsApp residual-32');
ok(mentionsNonSf('Gather.town loft') === true, 'mentionsNonSf Gather.town loft residual-32');
ok(mentionsNonSf('platform loft hang') === true, 'mentionsNonSf platform loft residual-32');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-32');
ok(mentionsNonSf('Richmond district loft') === false, 'mentionsNonSf Richmond district still SF residual-32');
ok(mentionsNonSf('Meet at Mission loft') === false, 'mentionsNonSf Meet at Mission still SF residual-32');
ok(mentionsNonSf('Google Meet hybrid Mission') === false, 'mentionsNonSf hybrid Meet Mission still SF residual-32');
ok(offerIsSf({ city: 'Ocala', offer: 'loft' }) === false, 'offer Ocala reject residual-32');
ok(offerIsSf({ city: 'Boca', offer: 'loft' }) === false, 'offer Boca reject residual-32');
ok(offerIsSf({ city: 'Pierre', offer: 'loft' }) === false, 'offer Pierre reject residual-32');
ok(offerIsSf({ city: 'Helena', offer: 'loft' }) === false, 'offer Helena reject residual-32');
ok(offerIsSf({ city: 'Hampton', offer: 'loft' }) === false, 'offer Hampton reject residual-32');
ok(offerIsSf({ city: 'Richmond KY', offer: 'loft' }) === false, 'offer Richmond KY reject residual-32');
ok(offerIsSf({ city: 'WhatsApp loft', offer: 'remote' }) === false, 'offer WhatsApp loft reject residual-32');
ok(offerIsSf({ city: 'Google Meet loft', offer: 'remote' }) === false, 'offer Google Meet loft reject residual-32');
ok(offerIsSf({ city: 'Meet loft', offer: 'remote' }) === false, 'offer Meet loft reject residual-32');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-32');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-32');
ok(offerIsSf({ city: 'San Francisco', offer: 'Richmond district hang' }) === true, 'offer Richmond district still ok residual-32');
ok(offerIsSf({ city: 'San Francisco', offer: 'Meet at Mission loft' }) === true, 'offer Meet at Mission still ok residual-32');
// SF geo residual-33: plains/midwest/FL + wine country + collab/online loft that still default-passed
ok(isSfLocation('Grand Forks loft') === false, 'Grand Forks reject residual-33');
ok(isSfLocation('Sioux City loft') === false, 'Sioux City reject residual-33');
ok(isSfLocation('Canton loft') === false, 'Canton bare reject residual-33');
ok(isSfLocation('Macon loft') === false, 'Macon bare reject residual-33');
ok(isSfLocation('Hot Springs loft') === false, 'Hot Springs reject residual-33');
ok(isSfLocation('Overland Park loft') === false, 'Overland Park reject residual-33');
ok(isSfLocation('Everett loft') === false, 'Everett bare reject residual-33');
ok(isSfLocation('Minot loft') === false, 'Minot reject residual-33');
ok(isSfLocation('Grand Island loft') === false, 'Grand Island reject residual-33');
ok(isSfLocation('Kearney loft') === false, 'Kearney reject residual-33');
ok(isSfLocation('Joplin loft') === false, 'Joplin reject residual-33');
ok(isSfLocation('Cape Girardeau loft') === false, 'Cape Girardeau reject residual-33');
ok(isSfLocation('Terre Haute loft') === false, 'Terre Haute reject residual-33');
ok(isSfLocation('Muncie loft') === false, 'Muncie reject residual-33');
ok(isSfLocation('Kokomo loft') === false, 'Kokomo reject residual-33');
ok(isSfLocation('Parkersburg loft') === false, 'Parkersburg reject residual-33');
ok(isSfLocation('Morgantown loft') === false, 'Morgantown reject residual-33');
ok(isSfLocation('Punta Gorda loft') === false, 'Punta Gorda reject residual-33');
ok(isSfLocation('Sebring loft') === false, 'Sebring reject residual-33');
ok(isSfLocation('Okeechobee loft') === false, 'Okeechobee reject residual-33');
ok(isSfLocation('Vero Beach loft') === false, 'Vero Beach reject residual-33');
ok(isSfLocation('Stuart loft') === false, 'Stuart reject residual-33');
ok(isSfLocation('Jupiter loft') === false, 'Jupiter reject residual-33');
ok(isSfLocation('Deerfield Beach loft') === false, 'Deerfield Beach reject residual-33');
ok(isSfLocation('Pompano Beach loft') === false, 'Pompano Beach reject residual-33');
ok(isSfLocation('Hialeah loft') === false, 'Hialeah reject residual-33');
ok(isSfLocation('Key Largo loft') === false, 'Key Largo reject residual-33');
ok(isSfLocation('Wine Country loft') === false, 'Wine Country reject residual-33');
ok(isSfLocation('Russian River loft') === false, 'Russian River reject residual-33');
ok(isSfLocation('Anderson Valley loft') === false, 'Anderson Valley reject residual-33');
ok(isSfLocation('Miro loft') === false, 'Miro loft remote reject residual-33');
ok(isSfLocation('Figma hang') === false, 'Figma hang remote reject residual-33');
ok(isSfLocation('Notion loft') === false, 'Notion loft remote reject residual-33');
ok(isSfLocation('Airtable hang') === false, 'Airtable hang remote reject residual-33');
ok(isSfLocation('Calendly loft') === false, 'Calendly loft remote reject residual-33');
ok(isSfLocation('Loom hang') === false, 'Loom hang remote reject residual-33');
ok(isSfLocation('Linear loft') === false, 'Linear loft remote reject residual-33');
ok(isSfLocation('Asana hang') === false, 'Asana hang remote reject residual-33');
ok(isSfLocation('Trello loft') === false, 'Trello loft remote reject residual-33');
ok(isSfLocation('Monday.com hang') === false, 'Monday.com hang remote reject residual-33');
ok(isSfLocation('online loft') === false, 'online loft remote reject residual-33');
ok(isSfLocation('remote loft') === false, 'remote loft reject residual-33');
ok(isSfLocation('web loft') === false, 'web loft remote reject residual-33');
ok(isSfLocation('digital loft') === false, 'digital loft remote reject residual-33');
ok(isSfLocation('Meetup online') === false, 'Meetup online reject residual-33');
ok(isSfLocation('exclusively online') === false, 'exclusively online reject residual-33');
ok(isSfLocation('100% online') === false, '100% online reject residual-33');
ok(isSfLocation('fully online') === false, 'fully online reject residual-33');
ok(isSfLocation('Discord stage loft') === false, 'Discord stage loft reject residual-33');
// Still SF after residual-33
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-33');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-33');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-33');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-33');
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach still SF residual-33');
ok(isSfLocation('Lincoln Way loft') === true, 'Lincoln Way still SF residual-33');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-33');
ok(isSfLocation('FiDi loft') === true, 'FiDi still SF residual-33');
ok(isSfLocation('Figma workshop at Mission loft') === true, 'Figma+Mission hybrid still SF residual-33');
ok(isSfLocation('Notion notes Mission dinner') === true, 'Notion+Mission hybrid still SF residual-33');
ok(isSfLocation('online RSVP Mission loft') === true, 'online RSVP Mission still SF residual-33');
ok(isSfLocation('remote option Mission') === true, 'remote option Mission still SF residual-33');
ok(isSfLocation('hybrid Teams + Mission loft') === true, 'hybrid Teams+Mission still SF residual-33');
ok(mentionsNonSf('Grand Forks loft') === true, 'mentionsNonSf Grand Forks residual-33');
ok(mentionsNonSf('Sioux City loft') === true, 'mentionsNonSf Sioux City residual-33');
ok(mentionsNonSf('Canton loft') === true, 'mentionsNonSf Canton residual-33');
ok(mentionsNonSf('Wine Country loft') === true, 'mentionsNonSf Wine Country residual-33');
ok(mentionsNonSf('Miro loft') === true, 'mentionsNonSf Miro loft residual-33');
ok(mentionsNonSf('Figma hang') === true, 'mentionsNonSf Figma hang residual-33');
ok(mentionsNonSf('online loft') === true, 'mentionsNonSf online loft residual-33');
ok(mentionsNonSf('Meetup online') === true, 'mentionsNonSf Meetup online residual-33');
ok(mentionsNonSf('exclusively online') === true, 'mentionsNonSf exclusively online residual-33');
ok(mentionsNonSf('Discord stage loft') === true, 'mentionsNonSf Discord stage residual-33');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-33');
ok(mentionsNonSf('Figma workshop at Mission loft') === false, 'mentionsNonSf Figma+Mission still SF residual-33');
ok(mentionsNonSf('online RSVP Mission loft') === false, 'mentionsNonSf online RSVP Mission still SF residual-33');
ok(offerIsSf({ city: 'Grand Forks', offer: 'loft' }) === false, 'offer Grand Forks reject residual-33');
ok(offerIsSf({ city: 'Canton', offer: 'loft' }) === false, 'offer Canton reject residual-33');
ok(offerIsSf({ city: 'Everett', offer: 'loft' }) === false, 'offer Everett reject residual-33');
ok(offerIsSf({ city: 'Wine Country', offer: 'loft' }) === false, 'offer Wine Country reject residual-33');
ok(offerIsSf({ city: 'Jupiter', offer: 'loft' }) === false, 'offer Jupiter reject residual-33');
ok(offerIsSf({ city: 'Miro loft', offer: 'remote' }) === false, 'offer Miro loft reject residual-33');
ok(offerIsSf({ city: 'online loft', offer: 'remote' }) === false, 'offer online loft reject residual-33');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-33');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-33');
ok(offerIsSf({ city: 'San Francisco', offer: 'Figma workshop at Mission loft' }) === true, 'offer Figma+Mission still ok residual-33');
// SF geo residual-34: US residual + wine + collab/platform loft + phone-in remote that still default-passed
ok(isSfLocation('Redmond WA loft') === false, 'Redmond WA reject residual-34');
ok(isSfLocation('Redmond loft') === false, 'Redmond bare reject residual-34');
ok(isSfLocation('Palm Beach loft') === false, 'Palm Beach reject residual-34');
ok(isSfLocation('Appleton loft') === false, 'Appleton reject residual-34');
ok(isSfLocation('Springfield MA dinner') === false, 'Springfield MA reject residual-34');
ok(isSfLocation('Springfield loft') === false, 'Springfield bare reject residual-34');
ok(isSfLocation('Dry Creek Valley loft') === false, 'Dry Creek Valley reject residual-34');
ok(isSfLocation('Clubhouse loft') === false, 'Clubhouse loft remote reject residual-34');
ok(isSfLocation('Spaces loft') === false, 'Spaces loft remote reject residual-34');
ok(isSfLocation('Twitter loft') === false, 'Twitter loft remote reject residual-34');
ok(isSfLocation('ClickUp loft') === false, 'ClickUp loft remote reject residual-34');
ok(isSfLocation('Basecamp loft') === false, 'Basecamp loft remote reject residual-34');
ok(isSfLocation('Confluence loft') === false, 'Confluence loft remote reject residual-34');
ok(isSfLocation('podcast-only meetup') === false, 'podcast-only reject residual-34');
ok(isSfLocation('broadcast loft') === false, 'broadcast loft remote reject residual-34');
ok(isSfLocation('phone-in dinner') === false, 'phone-in dinner reject residual-34');
ok(isSfLocation('call-in meetup') === false, 'call-in meetup reject residual-34');
ok(isSfLocation('dial-in loft') === false, 'dial-in loft reject residual-34');
// Still SF after residual-34
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-34');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-34');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-34');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-34');
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach still SF residual-34');
ok(isSfLocation('Lincoln Way loft') === true, 'Lincoln Way still SF residual-34');
ok(isSfLocation('Alamo Square loft') === true, 'Alamo Square still SF residual-34');
ok(isSfLocation('FiDi loft') === true, 'FiDi still SF residual-34');
ok(isSfLocation('Clubhouse workshop at Mission loft') === true, 'Clubhouse+Mission hybrid still SF residual-34');
ok(isSfLocation('ClickUp notes Mission dinner') === true, 'ClickUp+Mission hybrid still SF residual-34');
ok(isSfLocation('phone-in option Mission loft') === true, 'phone-in option Mission still SF residual-34');
ok(isSfLocation('hybrid Figma + Mission loft') === true, 'hybrid Figma+Mission still SF residual-34');
ok(isSfLocation('online RSVP Mission loft') === true, 'online RSVP Mission still SF residual-34');
ok(mentionsNonSf('Redmond WA loft') === true, 'mentionsNonSf Redmond residual-34');
ok(mentionsNonSf('Palm Beach loft') === true, 'mentionsNonSf Palm Beach residual-34');
ok(mentionsNonSf('Appleton loft') === true, 'mentionsNonSf Appleton residual-34');
ok(mentionsNonSf('Dry Creek Valley loft') === true, 'mentionsNonSf Dry Creek residual-34');
ok(mentionsNonSf('Clubhouse loft') === true, 'mentionsNonSf Clubhouse loft residual-34');
ok(mentionsNonSf('Twitter loft') === true, 'mentionsNonSf Twitter loft residual-34');
ok(mentionsNonSf('ClickUp loft') === true, 'mentionsNonSf ClickUp loft residual-34');
ok(mentionsNonSf('Basecamp loft') === true, 'mentionsNonSf Basecamp loft residual-34');
ok(mentionsNonSf('podcast-only meetup') === true, 'mentionsNonSf podcast-only residual-34');
ok(mentionsNonSf('phone-in dinner') === true, 'mentionsNonSf phone-in residual-34');
ok(mentionsNonSf('dial-in loft') === true, 'mentionsNonSf dial-in residual-34');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-34');
ok(mentionsNonSf('Clubhouse workshop at Mission loft') === false, 'mentionsNonSf Clubhouse+Mission still SF residual-34');
ok(mentionsNonSf('phone-in option Mission loft') === false, 'mentionsNonSf phone-in Mission still SF residual-34');
ok(offerIsSf({ city: 'Redmond', offer: 'loft' }) === false, 'offer Redmond reject residual-34');
ok(offerIsSf({ city: 'Palm Beach', offer: 'loft' }) === false, 'offer Palm Beach reject residual-34');
ok(offerIsSf({ city: 'Appleton', offer: 'loft' }) === false, 'offer Appleton reject residual-34');
ok(offerIsSf({ city: 'Springfield', offer: 'loft' }) === false, 'offer Springfield reject residual-34');
ok(offerIsSf({ city: 'Dry Creek Valley', offer: 'loft' }) === false, 'offer Dry Creek reject residual-34');
ok(offerIsSf({ city: 'Clubhouse loft', offer: 'remote' }) === false, 'offer Clubhouse loft reject residual-34');
ok(offerIsSf({ city: 'ClickUp loft', offer: 'remote' }) === false, 'offer ClickUp loft reject residual-34');
ok(offerIsSf({ city: 'phone-in dinner', offer: 'remote' }) === false, 'offer phone-in reject residual-34');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-34');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-34');
ok(offerIsSf({ city: 'San Francisco', offer: 'Clubhouse workshop at Mission loft' }) === true, 'offer Clubhouse+Mission still ok residual-34');
// SF geo residual-35: remote collab -only + Gather-only + spatial.io + StreamYard + podcast loft +
// platform domains + youtube/obs-only + twitch loft that still default-passed
ok(isSfLocation('Gather-only loft') === false, 'Gather-only loft reject residual-35');
ok(isSfLocation('gather only meetup') === false, 'gather only meetup reject residual-35');
ok(isSfLocation('spatial.io hang') === false, 'spatial.io hang reject residual-35');
ok(isSfLocation('spatial.io loft') === false, 'spatial.io loft reject residual-35');
ok(isSfLocation('streamyard-only') === false, 'streamyard-only reject residual-35');
ok(isSfLocation('StreamYard loft') === false, 'StreamYard loft reject residual-35');
ok(isSfLocation('streamyard meetup') === false, 'streamyard meetup reject residual-35');
ok(isSfLocation('podcast loft') === false, 'podcast loft reject residual-35');
ok(isSfLocation('podcast hang') === false, 'podcast hang reject residual-35');
ok(isSfLocation('podcast loft remote') === false, 'podcast loft remote reject residual-35');
ok(isSfLocation('Calendly-only hang') === false, 'Calendly-only hang reject residual-35');
ok(isSfLocation('calendly-only') === false, 'calendly-only reject residual-35');
ok(isSfLocation('Notion-only hang') === false, 'Notion-only hang reject residual-35');
ok(isSfLocation('Figma-only loft') === false, 'Figma-only loft reject residual-35');
ok(isSfLocation('Miro-only dinner') === false, 'Miro-only dinner reject residual-35');
ok(isSfLocation('Loom-only hang') === false, 'Loom-only hang reject residual-35');
ok(isSfLocation('Airtable-only loft') === false, 'Airtable-only loft reject residual-35');
ok(isSfLocation('Linear-only night') === false, 'Linear-only night reject residual-35');
ok(isSfLocation('zoom.us hang') === false, 'zoom.us hang reject residual-35');
ok(isSfLocation('meet.google.com loft') === false, 'meet.google.com loft reject residual-35');
ok(isSfLocation('discord.gg hang') === false, 'discord.gg hang reject residual-35');
ok(isSfLocation('slack.com loft') === false, 'slack.com loft reject residual-35');
ok(isSfLocation('obs-only stream') === false, 'obs-only reject residual-35');
ok(isSfLocation('youtube-only hang') === false, 'youtube-only hang reject residual-35');
ok(isSfLocation('twitch loft') === false, 'twitch loft reject residual-35');
// Still SF after residual-35
ok(isSfLocation('Mission loft') === true, 'Mission still SF residual-35');
ok(isSfLocation('Marina loft') === true, 'Marina still SF residual-35');
ok(isSfLocation('Castro loft') === true, 'Castro still SF residual-35');
ok(isSfLocation('Richmond district loft') === true, 'Richmond district still SF residual-35');
ok(isSfLocation('Ocean Beach loft') === true, 'Ocean Beach still SF residual-35');
ok(isSfLocation('Lincoln Way loft') === true, 'Lincoln Way still SF residual-35');
ok(isSfLocation('Gather workshop at Mission loft') === true, 'Gather+Mission hybrid still SF residual-35');
ok(isSfLocation('Calendly for Mission dinner') === true, 'Calendly+Mission hybrid still SF residual-35');
ok(isSfLocation('podcast recording Mission loft') === true, 'podcast+Mission hybrid still SF residual-35');
ok(isSfLocation('StreamYard backup Mission room') === true, 'StreamYard+Mission hybrid still SF residual-35');
ok(isSfLocation('spatial notes Mission hang') === true, 'spatial+Mission hybrid still SF residual-35');
ok(mentionsNonSf('Gather-only loft') === true, 'mentionsNonSf Gather-only residual-35');
ok(mentionsNonSf('spatial.io hang') === true, 'mentionsNonSf spatial.io residual-35');
ok(mentionsNonSf('StreamYard loft') === true, 'mentionsNonSf StreamYard loft residual-35');
ok(mentionsNonSf('podcast loft') === true, 'mentionsNonSf podcast loft residual-35');
ok(mentionsNonSf('Calendly-only hang') === true, 'mentionsNonSf Calendly-only residual-35');
ok(mentionsNonSf('Figma-only loft') === true, 'mentionsNonSf Figma-only residual-35');
ok(mentionsNonSf('zoom.us hang') === true, 'mentionsNonSf zoom.us residual-35');
ok(mentionsNonSf('discord.gg hang') === true, 'mentionsNonSf discord.gg residual-35');
ok(mentionsNonSf('obs-only stream') === true, 'mentionsNonSf obs-only residual-35');
ok(mentionsNonSf('twitch loft') === true, 'mentionsNonSf twitch loft residual-35');
ok(mentionsNonSf('Mission loft') === false, 'mentionsNonSf Mission still SF residual-35');
ok(mentionsNonSf('Gather workshop at Mission loft') === false, 'mentionsNonSf Gather+Mission still SF residual-35');
ok(mentionsNonSf('Calendly for Mission dinner') === false, 'mentionsNonSf Calendly+Mission still SF residual-35');
ok(offerIsSf({ city: 'Gather-only loft', offer: 'remote' }) === false, 'offer Gather-only reject residual-35');
ok(offerIsSf({ city: 'spatial.io', offer: 'hang' }) === false, 'offer spatial.io reject residual-35');
ok(offerIsSf({ city: 'StreamYard loft', offer: 'remote' }) === false, 'offer StreamYard loft reject residual-35');
ok(offerIsSf({ city: 'podcast loft', offer: 'remote' }) === false, 'offer podcast loft reject residual-35');
ok(offerIsSf({ city: 'Calendly-only', offer: 'hang' }) === false, 'offer Calendly-only reject residual-35');
ok(offerIsSf({ city: 'zoom.us', offer: 'hang' }) === false, 'offer zoom.us reject residual-35');
ok(offerIsSf({ city: 'FiDi', offer: 'room' }) === true, 'offer FiDi still SF residual-35');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission loft' }) === true, 'offer Mission still ok residual-35');
ok(offerIsSf({ city: 'San Francisco', offer: 'Gather workshop at Mission loft' }) === true, 'offer Gather+Mission still ok residual-35');
// SF geo residual-42/43: free-list hoods that bare isSfLocation false-rejected (draft SF-only)
// Skip bare panhandle (TX), bare Buena Vista (other cities), bare South Beach (Miami), bare Balboa Park (SD).
ok(isSfLocation('Baker Beach picnic') === true, 'Baker Beach SF residual-42');
ok(isSfLocation("Land's End trail") === true, "Land's End SF residual-42");
ok(isSfLocation('Fort Point walk') === true, 'Fort Point SF residual-42');
ok(isSfLocation('Aquatic Park hang') === true, 'Aquatic Park SF residual-42');
ok(isSfLocation('Pier 70 loft') === true, 'Pier 70 SF residual-42');
ok(isSfLocation('Candlestick Point park') === true, 'Candlestick SF residual-42');
ok(isSfLocation('Glen Canyon hike') === true, 'Glen Canyon SF residual-42');
ok(isSfLocation('South Van Ness office') === true, 'South Van Ness SF residual-42');
ok(isSfLocation('Buena Vista Park picnic') === true, 'Buena Vista Park SF residual-42');
ok(isSfLocation('Rincon Park dinner') === true, 'Rincon Park SF residual-42');
ok(isSfLocation('Silver Terrace loft') === true, 'Silver Terrace SF residual-43');
ok(isSfLocation('St. Francis Wood dinner') === true, 'St. Francis Wood SF residual-43');
ok(isSfLocation('Cayuga terrace hang') === true, 'Cayuga SF residual-43');
ok(isSfLocation('NoPa loft') === true, 'NoPa SF residual-43');
ok(isSfLocation('Polk Gulch supper') === true, 'Polk Gulch SF residual-43');
ok(isSfLocation('Crocker Amazon park') === true, 'Crocker Amazon SF residual-43');
ok(isSfLocation('Lone Mountain campus') === true, 'Lone Mountain SF residual-43');
ok(isSfLocation('University Mound loft') === true, 'University Mound SF residual-43');
ok(isSfLocation('Buena Vista CA dinner') === false, 'bare Buena Vista CA still non-SF residual-42');
ok(isSfLocation('South Beach Miami loft') === false, 'South Beach Miami reject residual-43');
ok(isSfLocation('Balboa Park San Diego') === false, 'Balboa Park San Diego reject residual-43');
ok(mentionsNonSf('Baker Beach picnic') === false, 'mentionsNonSf Baker Beach still SF residual-42');
ok(mentionsNonSf('NoPa loft') === false, 'mentionsNonSf NoPa still SF residual-43');
ok(offerIsSf({ city: 'Baker Beach', offer: 'picnic' }) === true, 'offer Baker Beach SF residual-42');
ok(offerIsSf({ city: 'NoPa', offer: 'loft' }) === true, 'offer NoPa SF residual-43');
ok(isSfLocation('Tomales') === false, 'SF geo rejects Tomales');
ok(mentionsNonSf('Tomales dinner') === true, 'chat SF geo rejects Tomales');
ok(offerIsSf({ city: 'Tomales', offer: 'room for 12' }) === false, 'offer Tomales reject');
ok(isSfLocation('Bay Point dinner') === false, 'SF geo rejects Bay Point');
ok(mentionsNonSf('Pacheco warehouse night') === true, 'chat SF geo rejects Pacheco');
ok(offerIsSf({ city: 'Bay Point', offer: 'room for 12' }) === false, 'offer Bay Point reject');
ok(isSfLocation('Nicasio dinner') === false, 'SF geo rejects Nicasio');
ok(isSfLocation('Lagunitas dinner') === false, 'SF geo rejects Lagunitas');
ok(mentionsNonSf('Woodacre supper') === true, 'chat SF geo rejects Woodacre');
ok(offerIsSf({ city: 'Lagunitas', offer: 'room for 12' }) === false, 'offer Lagunitas reject');
ok(isSfLocation('Dillon Beach dinner') === false, 'SF geo rejects Dillon Beach');
ok(mentionsNonSf('Marshall CA supper') === true, 'chat SF geo rejects Marshall');
ok(offerIsSf({ city: 'Olema', offer: 'room for 12' }) === false, 'offer Olema reject');
ok(isSfLocation('Patterson founder dinner') === false, 'SF geo rejects Patterson');
ok(mentionsNonSf('Escalon warehouse night') === true, 'chat SF geo rejects Escalon');
ok(offerIsSf({ city: 'Patterson', offer: 'room for 12' }) === false, 'offer Patterson reject');
ok(isSfLocation('Mission founder dinner') === true, 'SF geo keeps Mission after valley additions');
ok(isSfLocation('Rossmoor founder dinner') === false, 'SF geo rejects Rossmoor');
ok(isSfLocation('venue outside San Francisco') === false, 'SF geo rejects outside San Francisco');
ok(mentionsNonSf('dinner near San Francisco') === true, 'chat SF geo rejects near San Francisco');
ok(offerIsSf({ city: 'near San Francisco', offer: 'room for 12' }) === false, 'offer near SF reject');
ok(isSfLocation('Instagram Live founder night') === false, 'SF geo rejects Instagram Live night');
ok(mentionsNonSf('Facebook Live meetup') === true, 'chat SF geo rejects Facebook Live meetup');
ok(isSfLocation('Instagram Live + Mission loft') === true, 'SF geo keeps hybrid Instagram Live + SF room');
ok(isSfLocation('LinkedIn Live founder night') === false, 'SF geo rejects LinkedIn Live night');
ok(mentionsNonSf('LinkedIn Live meetup') === true, 'chat SF geo rejects LinkedIn Live meetup');
ok(isSfLocation('LinkedIn Live + Mission loft') === true, 'SF geo keeps hybrid LinkedIn Live + SF room');
// mentionsNonSf: shared chat/agent hard list (SSF + major US; gala must not trip \bla\b)
ok(mentionsNonSf('South San Francisco warehouse') === true, 'mentionsNonSf SSF');
ok(mentionsNonSf('South SF warehouse') === true, 'mentionsNonSf South SF shorthand');
ok(mentionsNonSf('Brooklyn loft party') === true, 'mentionsNonSf Brooklyn');
ok(mentionsNonSf('throw a gala for founders') === false, 'mentionsNonSf gala not LA');
ok(mentionsNonSf('Mission AI IN PERSON') === false, 'mentionsNonSf does not treat IN title token as state');
ok(mentionsNonSf('SoMa founders OR designers') === false, 'mentionsNonSf does not treat OR title token as state');
ok(mentionsNonSf('Mission salon PA system') === false, 'mentionsNonSf does not treat PA title token as state');
ok(mentionsNonSf('Hood River OR') === true, 'mentionsNonSf keeps trailing state location fallback');
ok(mentionsNonSf('Mission salon dinner') === false, 'mentionsNonSf Mission still SF');
ok(mentionsNonSf('Castro Valley loft') === true, 'mentionsNonSf Castro Valley');
ok(mentionsNonSf('Bay Area') === true, 'mentionsNonSf Bay Area');
ok(mentionsNonSf('Marina district') === false, 'mentionsNonSf Marina not Marin');
ok(mentionsNonSf('El Cerrito') === true, 'mentionsNonSf El Cerrito');
ok(mentionsNonSf('SFO hang') === true, 'mentionsNonSf SFO');
ok(mentionsNonSf('San Francisco Airport meetup') === true, 'mentionsNonSf SF airport');
ok(mentionsNonSf('Richmond, CA') === true, 'mentionsNonSf Richmond city');
ok(mentionsNonSf('Richmond district') === false, 'mentionsNonSf Richmond district not city');
ok(mentionsNonSf('Pittsburg warehouse') === true, 'mentionsNonSf Pittsburg');
ok(mentionsNonSf('Silicon Valley') === true, 'mentionsNonSf Silicon Valley');
ok(mentionsNonSf('Oyster Point') === true, 'mentionsNonSf Oyster Point');
ok(mentionsNonSf('teams-only') === true, 'mentionsNonSf teams-only');
ok(mentionsNonSf('Japantown salon') === false, 'mentionsNonSf Japantown still SF');
ok(isSfLocation('Twitch stream') === false, 'Twitch stream remote reject');
ok(isSfLocation('Twitch Live founder night') === false, 'Twitch Live remote reject');
ok(isSfLocation('Twitch-only founder night') === false, 'Twitch-only remote reject');
ok(isSfLocation('Mission room with Twitch stream') === true, 'hybrid Twitch with SF room still ok');
ok(isSfLocation('TikTok Live founder night') === false, 'TikTok Live remote reject');
ok(isSfLocation('Tik Tok stream') === false, 'Tik Tok stream remote reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'TikTok Live event' }) === false, 'offer TikTok Live reject');
ok(isSfLocation('Mission room with TikTok Live option') === true, 'hybrid TikTok with SF room still ok');
ok(isSfLocation('Discord server meetup') === false, 'Discord server meetup remote reject');
ok(isSfLocation('Discord server + Mission room') === true, 'hybrid Discord server with SF room still ok');
ok(isSfLocation('Telegram-only founder night') === false, 'Telegram-only remote reject');
ok(mentionsNonSf('Signal-only dinner') === true, 'chat Signal-only remote reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Telegram-only event' }) === false, 'offer Telegram-only reject');
// offerIsSf: city gate + NON_SF free-text only (bare loft/space must not false-reject SF city)
ok(offerIsSf({ city: 'San Francisco', offer: 'space' }) === true, 'SF city bare space offer ok');
ok(offerIsSf({ offer: 'space for 12' }) === false, 'missing-city generic offer fails closed');
ok(offerIsSf({ offer: 'Mission room for 12' }) === true, 'missing-city explicit SF offer ok');
ok(offerIsSf({ city: 'SF', offer: 'warehouse' }) === true, 'SF city bare warehouse offer ok');
ok(offerIsSf({ city: 'South San Francisco', offer: 'big room' }) === false, 'SSF city offer reject');
ok(offerIsSf({ city: 'Sacramento', offer: 'big loft' }) === false, 'offer Sacramento city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Oakland warehouse spillover' }) === false, 'offer blob Oakland reject');
ok(offerIsSf({ city: 'Castro Valley', offer: 'big loft' }) === false, 'offer Castro Valley city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'virtual only stream' }) === false, 'offer blob virtual reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Google Meet event' }) === false, 'offer blob Google Meet reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Mission room with Google Meet option' }) === true, 'offer hybrid SF room ok');
ok(isSfLocation('Google Meet event') === false, 'Google Meet-only event rejects');
ok(isSfLocation('Google Meet event + Mission room') === true, 'Google Meet hybrid SF room stays SF');
ok(mentionsNonSf('Webex event + SoMa loft') === false, 'chat keeps Webex hybrid with SF room');
ok(offerIsSf({ city: 'Marina', offer: 'room for 12' }) === true, 'offer Marina district city ok');
ok(offerIsSf({ city: 'Pittsburg', offer: 'big warehouse' }) === false, 'offer Pittsburg city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'Oyster Point loft' }) === false, 'offer blob Oyster Point reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'teams-only hang' }) === false, 'offer blob teams-only reject');
ok(offerIsSf({ city: 'Japantown', offer: 'room for 10' }) === true, 'offer Japantown city ok');
ok(offerIsSf({ city: 'El Cerrito', offer: 'big room' }) === false, 'offer El Cerrito city reject');
ok(offerIsSf({ city: 'San Francisco', offer: 'SFO terminal lounge' }) === false, 'offer blob SFO reject');
ok(offerIsSf({ city: 'San Francisco Airport', offer: 'terminal lounge' }) === false, 'offer SF airport reject');
ok(offerIsSf({ city: 'Richmond, CA', offer: 'room for 12' }) === false, 'offer Richmond city reject');
ok(offerIsSf({ city: 'Richmond', offer: 'room for 12' }) === true, 'offer bare Richmond district ok');

// Explicit remote-platform events are not SF nights; a real SF room with an online option remains valid.
ok(isSfLocation('Google Meet event') === false, 'Google Meet event reject');
ok(isSfLocation('Webex webinar') === false, 'Webex webinar reject');
ok(isSfLocation('BlueJeans meetup') === false, 'BlueJeans remote meetup reject');
ok(isSfLocation('GoToMeeting session') === false, 'GoToMeeting remote session reject');
ok(isSfLocation('Mission room with BlueJeans option') === true, 'BlueJeans hybrid SF room stays valid');
ok(isSfLocation('Mission room with Google Meet option') === true, 'hybrid SF room stays valid');
ok(isSfLocation('88 Willow Lane') === false, 'unqualified lane address reject');
ok(isSfLocation('88 Willow Lane, San Francisco') === true, 'explicit SF lane address ok');

// Partiful draft (pure + tool): SF gate, active-event fill, idempotent title
{
  const pureBad = buildPartifulDraft({ title: 'X', where: 'Oakland loft' }, {});
  ok(pureBad.ok === false && pureBad.error === 'sf_only', 'partiful pure SF reject Oakland');
  const pureOk = buildPartifulDraft(
    {},
    {
      title: 'Fogline Supper',
      outcome: 'two follow-ups',
      seats: 12,
      venue: { name: 'Mission Branch Library', area: 'Mission' },
      dateWindows: ['Thu 7pm'],
      agenda: 'arrivals → dinner → close',
    },
  );
  ok(pureOk.ok === true, 'partiful pure ok');
  ok(pureOk.draft?.title === 'Fogline Supper', 'partiful title from active');
  ok(/San Francisco/i.test(pureOk.draft?.where || ''), 'partiful where stamps SF');
  ok(pureOk.draft?.when === 'Thu 7pm', 'partiful when from windows');
  ok(pureOk.draft?.seats === 12, 'partiful seats');
  ok(pureOk.draft?.status === 'draft', 'partiful status draft');
  ok(pureOk.draft?.timezone === 'America/Los_Angeles', 'partiful SF timezone');
  ok(
    pureOk.draft?.pasteText ===
      [pureOk.draft.title, pureOk.draft.when, pureOk.draft.where, '', pureOk.draft.description].join('\n'),
    'partiful one-copy paste export',
  );
  ok(/Events Bot \(by Demigod\)/.test(pureOk.draft?.description || ''), 'partiful identity in desc');
  ok(/mutual yes/i.test(pureOk.draft?.guestFrame || pureOk.draft?.description || ''), 'partiful mutual yes');
  ok(buildPartifulDraft({}).ok === false, 'partiful title required');
  ok(buildPartifulDraft({ title: 'X', seats: -1 }).error === 'seats_must_be_positive_integer', 'partiful seats reject invalid');
  ok(/PARTIFUL PASTE PACKAGE/i.test(pureOk.draft?.exportText || ''), 'partiful exportText package');
  ok(/^Invite URL:\s*$/m.test(pureOk.draft?.exportText || ''), 'partiful Invite URL blank for drain');
  ok(pureOk.draft?.fields?.title === 'Fogline Supper', 'partiful fields.title');
  ok(pureOk.draft?.platform === 'partiful', 'partiful platform tag');

  const lumaBad = buildLumaDraft({ title: 'X', location: 'Austin TX' }, {});
  ok(lumaBad.ok === false && lumaBad.error === 'sf_only', 'luma pure SF reject Austin');
  const lumaOk = buildLumaDraft({}, {
    title: 'Fogline Supper',
    outcome: 'two follow-ups',
    seats: 12,
    venue: { name: 'Mission Branch Library' },
    dateWindows: ['Thu 7pm'],
  });
  ok(lumaOk.ok === true && /San Francisco/i.test(lumaOk.draft?.where || ''), 'luma draft SF where');
  ok(/LUMA PASTE/i.test(lumaOk.draft?.exportText || ''), 'luma exportText package');
  ok(lumaOk.draft?.status === 'draft', 'luma status draft never published');
  ok(lumaOk.draft?.fields?.capacity === 12, 'luma fields capacity');
  // FOCUS: same blank Invite URL line as Partiful so outbox drain absorbs human paste
  ok(/^Invite URL:\s*$/m.test(lumaOk.draft?.exportText || ''), 'luma Invite URL blank for drain');
  ok(
    stampInviteUrlIntoExport(lumaOk.draft.exportText, 'https://lu.ma/fogline-live', 'luma').includes(
      'Invite URL: https://lu.ma/fogline-live',
    ),
    'luma stamp fills blank Invite URL',
  );
  ok(buildLumaDraft({}).ok === false, 'luma title required');
  ok(buildLumaDraft({ title: 'X', seats: 1.5 }).error === 'seats_must_be_positive_integer', 'luma seats reject invalid');

  ok(isRealInviteUrl('https://partiful.com/e/abc123', 'partiful'), 'partiful url ok');
  ok(isRealInviteUrl('https://lu.ma/fogline', 'luma'), 'luma url ok');
  ok(!isRealInviteUrl('https://partiful.com/', 'partiful'), 'Partiful homepage is not an invite');
  ok(!isRealInviteUrl('https://lu.ma/', 'luma'), 'Luma homepage is not an invite');
  ok(!isRealInviteUrl('https://example.com/e/x', 'partiful'), 'reject example.com invite');
  ok(!isRealInviteUrl('http://partiful.com/e/x', 'partiful'), 'reject non-https');
  ok(!isRealInviteUrl('https://partiful.com/e/x', 'luma'), 'platform mismatch partiful as luma');
  const recStore = {
    platforms: {
      partiful: [{ id: 'pf_t1', title: 'Fogline Supper', status: 'draft' }],
      luma: [],
    },
    activeEvent: { title: 'Fogline Supper', stage: 'resource' },
  };
  const recBad = recordInviteUrl(recStore, {
    platform: 'partiful',
    url: 'https://fake.example.com/x',
  });
  ok(recBad.ok === false && recBad.error === 'real_url_required', 'record rejects invent url');
  const recRsvp = recordInviteUrl(recStore, {
    platform: 'partiful',
    url: 'https://partiful.com/e/real1',
    id: 'pf_rejected',
    rsvpCount: 12,
  });
  ok(recRsvp.ok === false && recRsvp.error === 'no_fake_rsvps', 'record rejects fake rsvp');
  ok(!recStore.platforms.partiful.some((d) => d.id === 'pf_rejected'), 'fake rsvp reject does not mutate store');
  const beforeEarlyRecord = JSON.stringify(recStore);
  const recEarly = recordInviteUrl(recStore, {
    platform: 'partiful',
    url: 'https://partiful.com/e/real1',
    id: 'pf_t1',
  });
  ok(recEarly.ok === false && recEarly.error === 'plan_stage_required', 'record rejects premature invite URL');
  ok(JSON.stringify(recStore) === beforeEarlyRecord, 'premature invite reject does not mutate store');
  recStore.activeEvent.stage = 'plan';
  const crossEventInviteStore = {
    platforms: {
      demigod: [{ id: 'dg_existing', title: 'Archived night', status: 'draft', eventId: 'ev_old' }],
    },
    activeEvent: { id: 'ev_current', title: 'Current night', stage: 'rsvp' },
  };
  for (const [id, error] of [['dg_missing', 'draft_not_found'], ['dg_existing', 'draft_event_mismatch']]) {
    const before = JSON.stringify(crossEventInviteStore);
    const result = recordInviteUrl(crossEventInviteStore, {
      platform: 'demigod',
      id,
      url: 'https://www.trydemigod.com/?p=event&id=ev_current',
    });
    ok(result.ok === false && result.error === error, 'record rejects missing or cross-event draft');
    ok(JSON.stringify(crossEventInviteStore) === before, 'cross-event reject does not mutate store');
  }
  const beforeWrongNativeUrl = JSON.stringify(crossEventInviteStore);
  const wrongNativeUrl = recordInviteUrl(crossEventInviteStore, {
    platform: 'demigod',
    id: 'dg_ev_current',
    url: 'https://www.trydemigod.com/?p=event&id=ev_other',
  });
  ok(wrongNativeUrl.error === 'invite_event_mismatch', 'record rejects another event native URL');
  ok(JSON.stringify(crossEventInviteStore) === beforeWrongNativeUrl, 'wrong native URL reject does not mutate store');
  const recOk = recordInviteUrl(recStore, {
    platform: 'partiful',
    url: 'https://partiful.com/e/real1',
    id: 'pf_t1',
  });
  ok(recOk.ok === true && recOk.draft?.status === 'published_url', 'record stamps published_url');
  ok(recOk.draft?.inviteUrl === 'https://partiful.com/e/real1', 'record keeps real url');
  recordInviteUrl(recStore, { platform: 'partiful', url: 'https://partiful.com/e/real1', id: 'pf_t1' });
  ok((recOk.draft?.note.match(/Real invite URL recorded/g) || []).length === 1, 'record retry does not duplicate evidence note');

  const lumaInviteStore = loadStore();
  lumaInviteStore.activeEvent = { ...(lumaInviteStore.activeEvent || {}), stage: 'plan' };
  saveStore(lumaInviteStore);
  const lumaFirst = runTool('luma_create_event', {
    title: 'Luma URL preservation check',
    location: 'San Francisco',
  });
  const lumaRecorded = runTool('record_invite_url', {
    platform: 'luma',
    id: lumaFirst.draft?.id,
    url: 'https://lu.ma/url-preservation-check',
  });
  const lumaRedraft = runTool('luma_create_event', {
    title: 'Luma URL preservation check',
    location: 'San Francisco',
  });
  ok(
    lumaRecorded.ok && lumaRedraft.draft?.status === 'published_url',
    'luma re-draft preserves published_url',
  );
  ok(
    lumaRedraft.draft?.inviteUrl === 'https://lu.ma/url-preservation-check',
    'luma re-draft preserves real URL',
  );

  // debriefRecord: host-attested counts; omitted stay null; fail directions
  const debStore = {
    activeEvent: {
      id: 'ev_deb1',
      title: 'SF salon debrief test',
      stage: 'followup',
      city: 'San Francisco',
      outcomes: { invited: null, confirmed: null, attended: null },
    },
    events: [],
  };
  const debOk = recordDebrief(debStore, { attended: 9 }, { mode: 'draft' });
  ok(debOk.ok === true && debOk.outcomes?.attended === 9, 'debriefRecord: attended=9');
  ok(debOk.outcomes?.invited === null, 'debriefRecord: invited stays null (no invent zero)');
  ok(debOk.outcomes?.debriefAt, 'debriefRecord: debriefAt set');
  ok(debStore.events?.some((e) => e.id === 'ev_deb1' && e.outcomes?.attended === 9), 'debriefRecord: syncActiveEventToList');
  const debFloat = recordDebrief(
    { activeEvent: { id: 'ev_deb1', stage: 'debrief', outcomes: {} }, events: [] },
    { attended: 9.5 },
    { mode: 'draft' },
  );
  ok(debFloat.ok === false && debFloat.error === 'invalid_count', 'debriefRecord: float rejected');
  const debNeg = recordDebrief(
    { activeEvent: { id: 'ev_deb1', stage: 'debrief', outcomes: {} }, events: [] },
    { attended: -1 },
    { mode: 'draft' },
  );
  ok(debNeg.ok === false && debNeg.error === 'invalid_count', 'debriefRecord: negative rejected');
  const debEarly = recordDebrief(
    { activeEvent: { id: 'ev_deb1', stage: 'plan', outcomes: {} }, events: [] },
    { attended: 9 },
    { mode: 'draft' },
  );
  ok(debEarly.ok === false && debEarly.error === 'stage_too_early', 'debriefRecord: plan stage rejected');
  const debAuto = recordDebrief(
    { activeEvent: { id: 'ev_deb1', stage: 'followup', outcomes: {} }, events: [] },
    { attended: 9 },
    { mode: 'auto' },
  );
  ok(debAuto.ok === false && debAuto.error === 'host_attested_only', 'debriefRecord: auto mode rejected');
  const debImpossibleStore = {
    activeEvent: { id: 'ev_deb1', stage: 'debrief', outcomes: { invited: 5 } },
    events: [],
  };
  const debImpossible = recordDebrief(debImpossibleStore, { confirmed: 6 }, { mode: 'draft' });
  ok(debImpossible.ok === false && debImpossible.error === 'inconsistent_counts', 'debriefRecord: impossible funnel rejected');
  ok(debImpossibleStore.activeEvent.outcomes.confirmed == null, 'debriefRecord: impossible funnel does not mutate');

  // debriefChatEvidence: parse host language → counts (never invent)
  const pe = parseDebriefEvidence('attended 9, 4 mutual pairs');
  ok(pe?.attended === 9 && pe?.mutualInterestPairs === 4, 'debriefChatEvidence: attended+mutual');
  ok(pe?.invited === undefined, 'debriefChatEvidence: omitted invited not invented');
  ok(parseDebriefEvidence('what happens in debrief?') === null, 'debriefChatEvidence: question null');
  ok(parseDebriefEvidence('how many attended?') === null, 'debriefChatEvidence: how-many null');
  ok(parseDebriefEvidence('confirmed: 12 attendance 8')?.confirmed === 12, 'debriefChatEvidence: confirmed');
  ok(parseDebriefEvidence('confirmed: 12 attendance 8')?.attended === 8, 'debriefChatEvidence: attendance synonym');
  ok(parseDebriefEvidence('nice night, thanks') === null, 'debriefChatEvidence: no digits null');

  // debriefNextSeed: archive + idea + clear active; fail without evidence / wrong stage
  const seedStore = {
    activeEvent: {
      id: 'ev_seed1',
      title: 'SF salon debrief seed',
      stage: 'debrief',
      city: 'San Francisco',
      seats: 10,
      outcome: 'Real connections',
      outcomes: { attended: 9, invited: null, debriefAt: '2026-07-17T20:00:00Z' },
      debrief: 'Solid night — host attested',
    },
    events: [],
    ideas: [],
  };
  const seedOk = seedNextFromDebrief(seedStore, { title: 'Next Mission salon' });
  ok(seedOk.ok === true && seedOk.clearedEventId === 'ev_seed1', 'debriefNextSeed: clears active');
  ok(seedOk.idea?.title === 'Next Mission salon' && seedOk.idea?.source === 'debrief_seed', 'debriefNextSeed: idea');
  ok(seedStore.activeEvent?.id == null && seedStore.activeEvent?.stage === 'ideate', 'debriefNextSeed: shell ideate');
  ok(seedStore.events.some((e) => e.id === 'ev_seed1'), 'debriefNextSeed: archived to events[]');
  // offerRecycle: matched rows unlinked for next night; accepted/declined kept
  const recycleStore = {
    activeEvent: {
      id: 'ev_rec1',
      title: 'SF debrief recycle night',
      stage: 'debrief',
      city: 'San Francisco',
      seats: 10,
      outcomes: { attended: 8, debriefAt: '2026-07-17T21:00:00Z' },
      debrief: 'Host attested — recycle partners',
    },
    events: [],
    ideas: [],
    offers: {
      sponsor: [
        {
          id: 'sp_real_1',
          name: 'Real Sponsor Co',
          email: 'hello@realsponsor.com',
          city: 'San Francisco',
          offer: 'tab for 12',
          status: 'matched',
          eventId: 'ev_rec1',
        },
      ],
      venue: [
        {
          id: 'vn_real_1',
          name: 'Mission Loft',
          email: 'book@missionloft.com',
          city: 'Mission',
          capacity: 20,
          offer: 'loft buyout',
          status: 'matched',
          eventId: 'ev_rec1',
        },
        {
          id: 'vn_accepted_1',
          name: 'Kept Venue',
          email: 'kept@venue.sf',
          city: 'SoMa',
          status: 'accepted',
          eventId: 'ev_rec1',
        },
      ],
      volunteer: [],
    },
  };
  const recycleOk = seedNextFromDebrief(recycleStore, { title: 'Next SF recycle night' });
  ok(recycleOk.ok === true && recycleOk.recycledOffers === 2, 'offerRecycle: unlinked matched count');
  ok(
    recycleStore.offers.sponsor[0].eventId == null && recycleStore.offers.sponsor[0].status === 'new',
    'offerRecycle: sponsor matched→new + eventId null',
  );
  ok(
    recycleStore.offers.venue[0].eventId == null && recycleStore.offers.venue[0].status === 'new',
    'offerRecycle: venue matched→new',
  );
  ok(
    recycleStore.offers.venue[1].eventId === 'ev_rec1' && recycleStore.offers.venue[1].status === 'accepted',
    'offerRecycle: accepted history kept',
  );
  // After recycle, next active stamp can rematch the free rows
  recycleStore.activeEvent = {
    id: 'ev_rec2',
    title: 'Next SF recycle night',
    stage: 'resource',
    city: 'San Francisco',
    seats: 10,
    needs: 'indoor loft dinner sponsor',
  };
  const rematch = stampOfferMatches(recycleStore);
  ok(
    rematch &&
      (recycleStore.activeEvent.matchedOffers?.sponsorId === 'sp_real_1' ||
        recycleStore.activeEvent.matchedOffers?.venueId === 'vn_real_1'),
    'offerRecycle: stamp rematches unlinked real offers',
  );
  const seedEarly = seedNextFromDebrief(
    {
      activeEvent: { id: 'ev_x', title: 'X', stage: 'followup', outcomes: { attended: 3 } },
      events: [],
      ideas: [],
    },
    {},
  );
  ok(seedEarly.ok === false && seedEarly.error === 'stage_not_debrief', 'debriefNextSeed: followup rejected');
  const seedNoEv = seedNextFromDebrief(
    {
      activeEvent: {
        id: 'ev_y',
        title: 'Y',
        stage: 'debrief',
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      events: [],
      ideas: [],
    },
    {},
  );
  ok(seedNoEv.ok === false && seedNoEv.error === 'need_debrief_evidence', 'debriefNextSeed: no invent without evidence');

  // idleReseed: empty → exactly 1 SF idea; second call no dup; has_active skips
  const idleEmpty = {
    activeEvent: { id: null, title: '', stage: 'ideate', city: 'San Francisco' },
    ideas: [],
  };
  const idle1 = idleReseedIfEmpty(idleEmpty, { goal: 'I just glad-hand you run the night' });
  ok(idle1.ok === true && idle1.skipped !== true && idleEmpty.ideas.length === 1, 'idleReseed: first seeds one');
  ok(idleEmpty.ideas[0]?.source === 'idle_reseed', 'idleReseed: source tag');
  ok(idleEmpty.ideas[0]?.city === 'San Francisco', 'idleReseed: SF city');
  ok(!/\bselftest\b|\bfixture\b/i.test(idleEmpty.ideas[0]?.title || '') || process.env.DEMIGOD_EVENTS_BOT_MOCK === '1', 'idleReseed: non-fixture title or mock');
  ok(!idleEmpty.ideas[0]?.title.includes('run the night'), 'idleReseed: goal instructions stay out of title');
  const idle2 = idleReseedIfEmpty(idleEmpty);
  ok(idle2.ok === true && idle2.skipped === true && idleEmpty.ideas.length === 1, 'idleReseed: second no dup');
  ok(idle2.reason === 'has_ideas', 'idleReseed: reason has_ideas');
  const idleActive = {
    activeEvent: { id: 'ev_busy', title: 'Mission hang', stage: 'run', city: 'San Francisco' },
    ideas: [],
  };
  const idleSkip = idleReseedIfEmpty(idleActive);
  ok(idleSkip.skipped === true && idleSkip.reason === 'has_active' && idleActive.ideas.length === 0, 'idleReseed: has_active skips');
  // Idle spin selects newest idea when no clearedFrom linkage (not oldest historical).
  {
    const multi = {
      activeEvent: { id: null },
      ideas: [
        { id: 'idea_old', title: 'Oldest historical night', audience: 'SF builders', outcome: 'old outcome', seats: 8, city: 'San Francisco' },
        { id: 'idea_new', title: 'Newest SF salon', audience: 'SF operators', outcome: 'fresh outcome', seats: 10, city: 'San Francisco' },
      ],
      events: [],
      platforms: { partiful: [], luma: [], demigod: [] },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
    };
    fs.writeFileSync(SELFTEST_STORE, JSON.stringify(multi, null, 2) + '\n');
    const report = driveCycle(loadStore(), 'run the night', Date.now(), {});
    const after = loadStore();
    ok(after.activeEvent?.title === 'Newest SF salon', 'driveCycle: idle spin picks newest idea title: ' + after.activeEvent?.title);
    ok(report?.ok === true && Array.isArray(report?.log), 'driveCycle: returns ok cycle report');
    ok(report.log.some((step) => step.step === 'spin_up_event'), 'driveCycle: spun from selected idea');
  }

  // seedNextChatIntent: host language → seed; questions stay null
  ok(parseSeedNextIntent('seed the next night') != null, 'seedNextChatIntent: seed next');
  ok(parseSeedNextIntent('close the loop and archive') != null, 'seedNextChatIntent: close loop');
  ok(parseSeedNextIntent('seed the next "Mission salon"')?.title === 'Mission salon', 'seedNextChatIntent: title');
  ok(parseSeedNextIntent('what happens next after debrief?') === null, 'seedNextChatIntent: question null');
  ok(parseSeedNextIntent('how should I seed the next night?') === null, 'seedNextChatIntent: how-should null');
  ok(parseSeedNextIntent('nice work tonight') === null, 'seedNextChatIntent: chit-chat null');

  // spinUpSelftestGuard: pass mockEnv explicitly (selftest process has MOCK=1)
  ok(
    selftestTitleBlocked('Fogline Supper Club (selftest salon 12 seats free venue)', '') === true,
    'spinUpSelftestGuard: prod blocks selftest title',
  );
  ok(
    selftestTitleBlocked('Fogline Supper Club (selftest salon 12 seats free venue)', '1') === false,
    'spinUpSelftestGuard: mock allows',
  );
  ok(selftestTitleBlocked('Indoor salon dinner', '') === false, 'spinUpSelftestGuard: real title ok');
  ok(selftestTitleBlocked('Unit fixture night', '0') === true, 'spinUpSelftestGuard: fixture blocked outside mock');
  // Store honesty: junk calendar + seed offer filters (P0-2)
  ok(isJunkCalendarTitle('rl-cal 3') === true, 'junkCal: rl-cal');
  ok(isJunkCalendarTitle('A') === true, 'junkCal: bare A');
  ok(isJunkCalendarTitle('Loop B') === true, 'junkCal: Loop B');
  ok(isJunkCalendarTitle('Night') === true, 'junkCal: bare Night');
  ok(isJunkCalendarTitle('rooftop party') === true, 'junkCal: rooftop party');
  ok(isJunkCalendarTitle('SoMa signal dinner') === false, 'junkCal: real SoMa kept');
  ok(isJunkCalendarTitle('Mission rooftop hang') === false, 'junkCal: real Mission kept');
  ok(isFixtureOfferId('sp_seed') && isFixtureOfferId('off_seed_oak') && isFixtureOfferId('vol_seed'), 'fixtureOfferId seeds');
  ok(isFixtureOfferId('venue_real_1') === false, 'fixtureOfferId real id ok');
  // publicCal: hide all internal planning; keep RSVP-ready events and later history
  {
    const today = sfTodayYmd();
    const y = Number(today.slice(0, 4));
    const past = `${y - 1}-06-15`;
    const future = `${y + 1}-06-15`;
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: past, stage: 'ideate' }, today) === false, 'publicCalPast: past ideate hidden');
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: past, stage: 'resource' }, today) === false, 'publicCalPast: past resource hidden');
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: past, stage: 'plan' }, today) === false, 'publicCalPast: past plan hidden');
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: past, stage: 'run' }, today) === true, 'publicCalPast: past run kept');
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: past, stage: 'debrief' }, today) === true, 'publicCalPast: past debrief kept');
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: future, stage: 'ideate' }, today) === false, 'publicCal: future ideate hidden');
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: today, stage: 'plan' }, today) === false, 'publicCal: today plan hidden');
    ok(isPublicCalendarVisible({ title: 'SoMa signal dinner', date: future, stage: 'rsvp' }, today) === true, 'publicCal: future RSVP kept');
    ok(isPublicCalendarVisible({ title: 'rl-cal 3', date: future, stage: 'run' }, today) === false, 'publicCalPast: junk title hidden');
  }
  // Tool path under MOCK=1 still spins selftest titles (selftest isolation store)
  const spinMock = runTool('spin_up_event', {
    title: 'Guard check (selftest spin)',
    audience: 'SF builders',
    outcome: 'Prove mock still allows selftest titles on isolated store',
    seats: 8,
    stage: 'run',
  });
  ok(spinMock.ok === true && spinMock.activeEvent?.id && spinMock.activeEvent.stage === 'ideate', 'spinUpSelftestGuard: raw stage ignored');
  const forcedDebrief = runTool('set_stage', { stage: 'debrief', note: 'raw bypass probe', force: true });
  ok(
    forcedDebrief.ok === false && forcedDebrief.error === 'must_advance_one_step' && loadStore().activeEvent?.stage === 'ideate',
    'setStageGuard: raw force cannot bypass lifecycle',
  );

  // Re-draft must not wipe a real Invite URL from export/outbox (FOCUS Partiful draft)
  const blankExport =
    '=== PARTIFUL PASTE PACKAGE (draft only — no publish claim) ===\nTitle: X\n\n--- After publish ---\nInvite URL: \n';
  const stamped = stampInviteUrlIntoExport(
    blankExport,
    'https://partiful.com/e/real1',
    'partiful',
  );
  ok(/^Invite URL: https:\/\/partiful\.com\/e\/real1$/m.test(stamped), 'stamp fills blank Invite URL');
  ok(/RECORDED URL/i.test(stamped), 'stamp adds RECORDED URL block');
  ok(
    stampInviteUrlIntoExport(blankExport, 'https://example.com/fake', 'partiful') === blankExport,
    'stamp refuses invent URL',
  );
  ok(
    stampInviteUrlIntoExport(blankExport, '', 'partiful') === blankExport,
    'stamp no-op without URL',
  );
  const reExportDraft = {
    id: 'pf_redraft',
    title: 'Fogline Supper',
    exportText: blankExport,
    inviteUrl: 'https://partiful.com/e/real1',
    status: 'published_url',
    platform: 'partiful',
  };
  const reFiles = writeInviteExport('partiful', reExportDraft);
  ok(reFiles?.txt && fs.existsSync(reFiles.txt), 're-draft export writes file');
  const reTxt = fs.readFileSync(reFiles.txt, 'utf8');
  ok(/Invite URL: https:\/\/partiful\.com\/e\/real1/.test(reTxt), 'writeInviteExport keeps real Invite URL');
  ok(/RECORDED URL/i.test(reTxt), 'writeInviteExport stamps RECORDED URL');
  ok(
    /Invite URL: https:\/\/partiful\.com\/e\/real1/.test(reExportDraft.exportText || ''),
    'writeInviteExport mutates draft.exportText',
  );

  const drain = inviteDrainReport({
    platforms: {
      partiful: [
        { id: 'pf_a', title: 'A', status: 'draft' },
        {
          id: 'pf_b',
          title: 'B',
          status: 'published_url',
          inviteUrl: 'https://partiful.com/e/b',
        },
      ],
      luma: [{ id: 'luma_c', title: 'C', status: 'draft' }],
    },
  });
  ok(drain.total === 3 && drain.needsUrl === 2 && drain.hasUrl === 1, 'inviteDrain counts');
  ok(drain.need.some((r) => r.id === 'pf_a'), 'inviteDrain lists need');
  ok(drain.ready.some((r) => r.id === 'pf_b'), 'inviteDrain lists ready');
  ok((drain.humanNext || []).length === 2, 'inviteDrain humanNext for needs');
  ok(
    isSelftestInviteDraft({ title: 'Fogline Supper Club (selftest salon 12 seats free venue)' }) === true,
    'isSelftestInviteDraft: title marker',
  );
  ok(isSelftestInviteDraft({ title: 'Fogline real night', selftest: true }) === true, 'isSelftestInviteDraft: flag');
  // Fogline is reserved fixture brand — always treated as selftest on drain board
  ok(isSelftestInviteDraft({ title: 'Fogline real night' }) === true, 'isSelftestInviteDraft: fogline brand');
  ok(isSelftestInviteDraft({ title: 'Mission salon dinner' }) === false, 'isSelftestInviteDraft: real title ok');
  ok(selftestTitleBlocked('Fogline Supper Club (you produce the night I host)', '') === true, 'spinUpSelftestGuard: fogline blocked outside mock');
  const drainSkip = inviteDrainReport({
    platforms: {
      partiful: [
        { id: 'pf_real', title: 'Mission salon dinner', status: 'draft' },
        {
          id: 'pf_st',
          title: 'Fogline Supper Club (selftest salon 12 seats free venue)',
          status: 'draft',
        },
        {
          id: 'pf_fog',
          title: 'Fogline Supper Club (you produce the night I host)',
          status: 'draft',
        },
      ],
      luma: [],
    },
  });
  ok(drainSkip.total === 1 && drainSkip.needsUrl === 1, 'inviteDrain excludes selftest/fogline titles');
  ok(drainSkip.skippedSelftest === 2, 'inviteDrain skippedSelftest count includes fogline brand');
  ok(drainSkip.need.some((r) => r.id === 'pf_real') && !drainSkip.need.some((r) => r.id === 'pf_st'), 'inviteDrain only real need');
  ok(!drainSkip.need.some((r) => r.id === 'pf_fog'), 'inviteDrain excludes fogline brand draft');

  const nativeCovered = inviteDrainReport({
    activeEvent: {
      title: 'SoMa Supper Club',
      inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_live',
    },
    platforms: {
      partiful: [{
        id: 'pf_optional',
        title: 'SoMa Supper Club (hosted by Events Bot)',
        exportFiles: { txt: path.join(SELFTEST_OUTBOX, 'missing-partiful.txt') },
      }],
    },
  });
  ok(nativeCovered.needsUrl === 0, 'inviteDrain native invite makes external URL optional');
  ok(nativeCovered.optional === 1, 'inviteDrain reports native-covered external draft');
  ok(nativeCovered.optionalRows[0].outboxTxt === null, 'inviteDrain does not advertise missing export files');
  const nativePlatformCovered = inviteDrainReport({
    activeEvent: { id: 'ev_live', title: 'SoMa Supper Club' },
    platforms: {
      demigod: [{
        id: 'dg_ev_live',
        eventId: 'ev_live',
        status: 'published_url',
        inviteUrl: 'https://www.trydemigod.com/?p=event&id=ev_live',
      }],
      partiful: [{ id: 'pf_optional', title: 'SoMa Supper Club' }],
    },
  });
  ok(nativePlatformCovered.needsUrl === 0, 'inviteDrain sees recorded native platform URL');
  const activeScopedDrain = inviteDrainReport({
    activeEvent: { id: 'ev_live', title: 'SoMa Supper Club' },
    platforms: {
      partiful: [
        { id: 'pf_live', eventId: 'ev_live', title: 'SoMa Supper Club' },
        { id: 'pf_old', eventId: 'ev_old', title: 'Old Mission Night' },
        { id: 'pf_legacy_live', title: 'SoMa Supper Club (hosted by Events Bot)' },
      ],
    },
  });
  ok(activeScopedDrain.total === 2, 'inviteDrain scopes rows to active event');
  ok(activeScopedDrain.eventId === 'ev_live', 'inviteDrain identifies its active event');
  ok(activeScopedDrain.skippedOtherEvents === 1, 'inviteDrain counts other-event drafts skipped');
  ok(
    inviteDrainReport({ activeEvent: null, platforms: { partiful: [{ id: 'pf_old', title: 'Old night' }] } }).total === 0,
    'inviteDrain hides historical drafts between nights',
  );
  ok(nativePlatformCovered.optional === 1, 'inviteDrain makes external draft optional from platform record');
  const nativeBrief = fs.readFileSync(writeInviteDrainBrief(nativeCovered, SELFTEST_OUTBOX), 'utf8');
  ok(!/Paste real Partiful\/Luma/.test(nativeBrief), 'inviteDrain native brief does not request an external URL');

  // Human drop: parse + absorb real URLs onto drafts needing URL
  const parsed = parseHumanInviteUrlLines(
    [
      '# comment',
      'https://example.com/fake',
      'https://lu.ma/fogline-night',
      'platform=partiful id=pf_a url=https://partiful.com/e/a-real',
      'not a url line',
    ].join('\n'),
  );
  ok(parsed.length === 2, 'parseHumanInviteUrlLines keeps only real invite URLs');
  ok(parsed.some((p) => p.platform === 'luma' && /lu\.ma\/fogline/.test(p.url)), 'parse detects luma bare URL');
  ok(parsed.some((p) => p.platform === 'partiful' && p.id === 'pf_a'), 'parse keeps platform+id tokens');
  const absStore = {
    activeEvent: { stage: 'plan' },
    platforms: {
      partiful: [{ id: 'pf_a', title: 'A', status: 'draft' }],
      luma: [{ id: 'luma_c', title: 'C', status: 'draft' }],
    },
  };
  const abs = absorbHumanInviteUrls(
    absStore,
    'platform=partiful id=pf_a url=https://partiful.com/e/a-real\nhttps://lu.ma/c-night\n',
  );
  ok(abs.applied.length === 2, 'absorbHumanInviteUrls applies two real URLs');
  ok(absStore.platforms.partiful[0].status === 'published_url', 'absorb stamps partiful published_url');
  ok(absStore.platforms.partiful[0].inviteUrl === 'https://partiful.com/e/a-real', 'absorb keeps partiful url');
  ok(absStore.platforms.luma[0].status === 'published_url', 'absorb stamps luma via bare URL');
  const absAmbiguousStore = {
    activeEvent: { stage: 'plan' },
    platforms: {
      partiful: [
        { id: 'pf_one', title: 'One', status: 'draft' },
        { id: 'pf_two', title: 'Two', status: 'draft' },
      ],
      luma: [],
    },
  };
  const absAmbiguous = absorbHumanInviteUrls(
    absAmbiguousStore,
    'https://partiful.com/e/needs-a-draft-id\n',
  );
  ok(absAmbiguous.failed[0]?.error === 'draft_required', 'bare URL fails closed with multiple drafts');
  ok(absAmbiguousStore.platforms.partiful.length === 2, 'ambiguous URL does not create a draft');
  const absBad = absorbHumanInviteUrls(
    { platforms: { partiful: [{ id: 'pf_x', status: 'draft' }], luma: [] } },
    'https://fake.example.com/e/x\n',
  );
  ok(absBad.parsed === 0 && absBad.applied.length === 0, 'absorb ignores invent domains');

  const dropFile = path.join('/tmp', `dg-events-invite-drop-${process.pid}.md`);
  fs.writeFileSync(dropFile, 'https://partiful.com/e/drop-file-real\n', 'utf8');
  const dropStore = {
    activeEvent: { stage: 'plan' },
    platforms: { partiful: [{ id: 'pf_drop', title: 'Drop', status: 'draft' }], luma: [] },
  };
  const dropAbs = absorbHumanInviteDropFile(dropStore, { dropPath: dropFile });
  ok(dropAbs.applied.length === 1, 'drop file absorbs one real invite URL');
  ok(dropStore.platforms.partiful[0].status === 'published_url', 'drop file stamps published_url');
  fs.rmSync(dropFile, { force: true });

  // Outbox package: human pastes Invite URL line → pick + absorb
  ok(
    pickInviteUrlFromOutboxText(
      'Host checklist\nOpen https://lu.ma → New event\nInvite URL: https://lu.ma/real-night-99\n',
      'luma',
    ) === 'https://lu.ma/real-night-99',
    'pickInviteUrlFromOutboxText prefers Invite URL marker',
  );
  ok(
    pickInviteUrlFromOutboxText('no urls here', 'partiful') === null,
    'pickInviteUrlFromOutboxText empty → null',
  );
  ok(
    !pickInviteUrlFromOutboxText('https://example.com/e/x', 'partiful'),
    'pickInviteUrlFromOutboxText rejects invent',
  );
  // FOCUS #2: human paste wrappers must not stick to recorded URL
  ok(
    cleanInviteUrlCandidate('[https://partiful.com/e/bracket]') ===
      'https://partiful.com/e/bracket',
    'cleanInviteUrlCandidate peels markdown brackets',
  );
  ok(
    cleanInviteUrlCandidate('<https://lu.ma/angle>,') === 'https://lu.ma/angle',
    'cleanInviteUrlCandidate peels angle + comma',
  );
  // Residual peel: parens + backticks (Slack/Notion/code paste)
  ok(
    cleanInviteUrlCandidate('(https://partiful.com/e/paren)') ===
      'https://partiful.com/e/paren',
    'cleanInviteUrlCandidate peels parens',
  );
  ok(
    cleanInviteUrlCandidate('`https://partiful.com/e/code`') ===
      'https://partiful.com/e/code',
    'cleanInviteUrlCandidate peels backticks',
  );
  // Residual peel: trailing prose ! ? … + CJK wrappers (Slack/iMessage/WeChat paste)
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/bang!') ===
      'https://partiful.com/e/bang',
    'cleanInviteUrlCandidate peels trailing !',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/qmark?') === 'https://lu.ma/qmark',
    'cleanInviteUrlCandidate peels lone trailing ?',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate keeps real query string',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/ellip…') ===
      'https://partiful.com/e/ellip',
    'cleanInviteUrlCandidate peels ellipsis',
  );
  ok(
    cleanInviteUrlCandidate('【https://partiful.com/e/cjk】') ===
      'https://partiful.com/e/cjk',
    'cleanInviteUrlCandidate peels CJK brackets',
  );
  ok(
    cleanInviteUrlCandidate('「https://lu.ma/cjk-corner」') ===
      'https://lu.ma/cjk-corner',
    'cleanInviteUrlCandidate peels CJK corner quotes',
  );
  // Residual peel-2: fullwidth parens + zero-width paste junk (WeChat/iMessage)
  ok(
    cleanInviteUrlCandidate('（https://partiful.com/e/fw-paren）') ===
      'https://partiful.com/e/fw-paren',
    'cleanInviteUrlCandidate peels fullwidth parens',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/zwsp\u200b') ===
      'https://partiful.com/e/zwsp',
    'cleanInviteUrlCandidate strips ZWSP',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/zwnj\u200c') === 'https://lu.ma/zwnj',
    'cleanInviteUrlCandidate strips ZWNJ',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/star*') ===
      'https://partiful.com/e/star',
    'cleanInviteUrlCandidate peels trailing *',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: （https://partiful.com/e/fw-mark）\n',
      'partiful',
    ) === 'https://partiful.com/e/fw-mark',
    'pickInviteUrlFromOutboxText peels fullwidth after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Paste: https://partiful.com/e/zw\u200b tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/zw',
    'pickInviteUrlFromOutboxText strips ZWSP bare URL',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/prose!\n',
      'partiful',
    ) === 'https://partiful.com/e/prose',
    'pickInviteUrlFromOutboxText peels trailing !',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: 【https://partiful.com/e/cjk-mark】\n',
      'partiful',
    ) === 'https://partiful.com/e/cjk-mark',
    'pickInviteUrlFromOutboxText peels CJK after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: [https://partiful.com/e/wrapped]\n',
      'partiful',
    ) === 'https://partiful.com/e/wrapped',
    'pickInviteUrlFromOutboxText strips markdown brackets',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: <https://lu.ma/angle-night>\n',
      'luma',
    ) === 'https://lu.ma/angle-night',
    'pickInviteUrlFromOutboxText strips angle brackets',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: (https://partiful.com/e/in-paren)\n',
      'partiful',
    ) === 'https://partiful.com/e/in-paren',
    'pickInviteUrlFromOutboxText peels paren after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Paste: `https://partiful.com/e/code-paste`\n',
      'partiful',
    ) === 'https://partiful.com/e/code-paste',
    'pickInviteUrlFromOutboxText peels backtick code paste',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'See [Fogline](https://partiful.com/e/md-link) for the night\n',
      'partiful',
    ) === 'https://partiful.com/e/md-link',
    'pickInviteUrlFromOutboxText peels markdown link form',
  );
  // Residual peel-3: smart quotes / guillemets / soft hyphen / fullwidth ，． / en–em dash
  ok(
    cleanInviteUrlCandidate('\u201chttps://partiful.com/e/smart\u201d') ===
      'https://partiful.com/e/smart',
    'cleanInviteUrlCandidate peels smart double quotes',
  );
  ok(
    cleanInviteUrlCandidate('\u2018https://lu.ma/sq\u2019') === 'https://lu.ma/sq',
    'cleanInviteUrlCandidate peels smart single quotes',
  );
  ok(
    cleanInviteUrlCandidate('«https://partiful.com/e/guil»') ===
      'https://partiful.com/e/guil',
    'cleanInviteUrlCandidate peels guillemets',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/soft\u00ad') ===
      'https://partiful.com/e/soft',
    'cleanInviteUrlCandidate strips soft hyphen',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/fwdot．') ===
      'https://partiful.com/e/fwdot',
    'cleanInviteUrlCandidate peels fullwidth period',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/fwcomma，') === 'https://lu.ma/fwcomma',
    'cleanInviteUrlCandidate peels fullwidth comma',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/endash–') ===
      'https://partiful.com/e/endash',
    'cleanInviteUrlCandidate peels en dash',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/emdash—') ===
      'https://partiful.com/e/emdash',
    'cleanInviteUrlCandidate peels em dash',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: \u201chttps://partiful.com/e/smart-mark\u201d\n',
      'partiful',
    ) === 'https://partiful.com/e/smart-mark',
    'pickInviteUrlFromOutboxText peels smart quotes after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL：https://partiful.com/e/fwcolon\n',
      'partiful',
    ) === 'https://partiful.com/e/fwcolon',
    'pickInviteUrlFromOutboxText accepts fullwidth colon marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: «https://lu.ma/guil-mark»\n',
      'luma',
    ) === 'https://lu.ma/guil-mark',
    'pickInviteUrlFromOutboxText peels guillemets after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Paste: https://partiful.com/e/soft\u00ad tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/soft',
    'pickInviteUrlFromOutboxText strips soft hyphen bare URL',
  );
  // Residual peel-4: single guillemets / low-9 / primes / Discord || / braces /
  // pipe·bullet·middot / figure+horizontal dash / backslash / fullwidth ／ / LRM·RLM
  ok(
    cleanInviteUrlCandidate('‹https://partiful.com/e/sg›') ===
      'https://partiful.com/e/sg',
    'cleanInviteUrlCandidate peels single guillemets',
  );
  ok(
    cleanInviteUrlCandidate('„https://partiful.com/e/low9\u201c') ===
      'https://partiful.com/e/low9',
    'cleanInviteUrlCandidate peels low-9 quotes',
  );
  ok(
    cleanInviteUrlCandidate('″https://partiful.com/e/prime″') ===
      'https://partiful.com/e/prime',
    'cleanInviteUrlCandidate peels double primes',
  );
  ok(
    cleanInviteUrlCandidate('||https://partiful.com/e/spoil||') ===
      'https://partiful.com/e/spoil',
    'cleanInviteUrlCandidate peels Discord spoiler bars',
  );
  ok(
    cleanInviteUrlCandidate('{https://partiful.com/e/brace}') ===
      'https://partiful.com/e/brace',
    'cleanInviteUrlCandidate peels curly braces',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pipe|') ===
      'https://partiful.com/e/pipe',
    'cleanInviteUrlCandidate peels trailing pipe',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/bul•') ===
      'https://partiful.com/e/bul',
    'cleanInviteUrlCandidate peels trailing bullet',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/md·') === 'https://lu.ma/md',
    'cleanInviteUrlCandidate peels trailing middot',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/fd‒') ===
      'https://partiful.com/e/fd',
    'cleanInviteUrlCandidate peels figure dash',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/hb―') ===
      'https://partiful.com/e/hb',
    'cleanInviteUrlCandidate peels horizontal bar',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/bs\\') ===
      'https://partiful.com/e/bs',
    'cleanInviteUrlCandidate peels trailing backslash',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/fws／') ===
      'https://partiful.com/e/fws',
    'cleanInviteUrlCandidate peels fullwidth solidus',
  );
  ok(
    cleanInviteUrlCandidate('\u200ehttps://partiful.com/e/lrm\u200f') ===
      'https://partiful.com/e/lrm',
    'cleanInviteUrlCandidate strips LRM/RLM',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ‹https://partiful.com/e/sg-mark›\n',
      'partiful',
    ) === 'https://partiful.com/e/sg-mark',
    'pickInviteUrlFromOutboxText peels single guillemets after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ||https://partiful.com/e/spoil-mark||\n',
      'partiful',
    ) === 'https://partiful.com/e/spoil-mark',
    'pickInviteUrlFromOutboxText peels Discord spoiler after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: {https://lu.ma/brace-mark}\n',
      'luma',
    ) === 'https://lu.ma/brace-mark',
    'pickInviteUrlFromOutboxText peels braces after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/bul-bare• tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/bul-bare',
    'pickInviteUrlFromOutboxText peels bare bullet trail',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pipe-mark|\n',
      'partiful',
    ) === 'https://partiful.com/e/pipe-mark',
    'pickInviteUrlFromOutboxText peels pipe after marker',
  );
  // Residual peel-5: fullwidth ［］＜＞ · CJK 《》〈〉〔〕 · md ** __ ~~ ·
  // Slack <url|label> · leading ›
  ok(
    cleanInviteUrlCandidate('［https://partiful.com/e/fwbr］') ===
      'https://partiful.com/e/fwbr',
    'cleanInviteUrlCandidate peels fullwidth brackets',
  );
  ok(
    cleanInviteUrlCandidate('＜https://partiful.com/e/fwa＞') ===
      'https://partiful.com/e/fwa',
    'cleanInviteUrlCandidate peels fullwidth angle brackets',
  );
  ok(
    cleanInviteUrlCandidate('《https://partiful.com/e/book》') ===
      'https://partiful.com/e/book',
    'cleanInviteUrlCandidate peels CJK book title marks',
  );
  ok(
    cleanInviteUrlCandidate('〈https://partiful.com/e/aq〉') ===
      'https://partiful.com/e/aq',
    'cleanInviteUrlCandidate peels CJK angle quotes',
  );
  ok(
    cleanInviteUrlCandidate('〔https://partiful.com/e/tort〕') ===
      'https://partiful.com/e/tort',
    'cleanInviteUrlCandidate peels tortoise shell brackets',
  );
  ok(
    cleanInviteUrlCandidate('<https://partiful.com/e/slack|Cool event>') ===
      'https://partiful.com/e/slack',
    'cleanInviteUrlCandidate peels Slack angle-label form',
  );
  ok(
    cleanInviteUrlCandidate('**https://partiful.com/e/bold**') ===
      'https://partiful.com/e/bold',
    'cleanInviteUrlCandidate peels markdown bold stars',
  );
  ok(
    cleanInviteUrlCandidate('__https://partiful.com/e/und__') ===
      'https://partiful.com/e/und',
    'cleanInviteUrlCandidate peels markdown underline',
  );
  ok(
    cleanInviteUrlCandidate('~~https://partiful.com/e/strike~~') ===
      'https://partiful.com/e/strike',
    'cleanInviteUrlCandidate peels markdown strike',
  );
  ok(
    cleanInviteUrlCandidate('›https://partiful.com/e/sgl') ===
      'https://partiful.com/e/sgl',
    'cleanInviteUrlCandidate peels leading close-guillemet',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: <https://partiful.com/e/slack-mark|Party>\n',
      'partiful',
    ) === 'https://partiful.com/e/slack-mark',
    'pickInviteUrlFromOutboxText peels Slack label after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL：［https://partiful.com/e/fw-mark］\n',
      'partiful',
    ) === 'https://partiful.com/e/fw-mark',
    'pickInviteUrlFromOutboxText peels fullwidth brackets after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Live URL: 《https://partiful.com/e/book-mark》\n',
      'partiful',
    ) === 'https://partiful.com/e/book-mark',
    'pickInviteUrlFromOutboxText peels CJK book marks after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ~~https://partiful.com/e/strike-mark~~\n',
      'partiful',
    ) === 'https://partiful.com/e/strike-mark',
    'pickInviteUrlFromOutboxText peels strike after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/fw-bare］ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/fw-bare',
    'pickInviteUrlFromOutboxText peels bare fullwidth close',
  );
  // Residual peel-6: white lenticular 〖〗 · chat arrows →←⇒⇐ · ideographic 、
  // (」→ stuck when arrow not peeled; 〗 left sticky on bare pick)
  ok(
    cleanInviteUrlCandidate('〖https://partiful.com/e/white〗') ===
      'https://partiful.com/e/white',
    'cleanInviteUrlCandidate peels white lenticular brackets',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/arr→') ===
      'https://partiful.com/e/arr',
    'cleanInviteUrlCandidate peels trailing chat arrow',
  );
  ok(
    cleanInviteUrlCandidate('→https://partiful.com/e/arr-lead') ===
      'https://partiful.com/e/arr-lead',
    'cleanInviteUrlCandidate peels leading chat arrow',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/la←') ===
      'https://partiful.com/e/la',
    'cleanInviteUrlCandidate peels trailing left arrow',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/da⇒') ===
      'https://partiful.com/e/da',
    'cleanInviteUrlCandidate peels trailing double arrow',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/ic、') ===
      'https://partiful.com/e/ic',
    'cleanInviteUrlCandidate peels ideographic comma',
  );
  ok(
    cleanInviteUrlCandidate('「https://partiful.com/e/corner-arr」→') ===
      'https://partiful.com/e/corner-arr',
    'cleanInviteUrlCandidate peels corner + trailing arrow (two-pass)',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: 〖https://partiful.com/e/white-mark〗\n',
      'partiful',
    ) === 'https://partiful.com/e/white-mark',
    'pickInviteUrlFromOutboxText peels white lenticular after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'RECORDED URL: →https://partiful.com/e/arr-mark\n',
      'partiful',
    ) === 'https://partiful.com/e/arr-mark',
    'pickInviteUrlFromOutboxText peels leading arrow after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/fw-bare〗 tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/fw-bare',
    'pickInviteUrlFromOutboxText peels bare white lenticular close',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/arr-bare→ next\n',
      'partiful',
    ) === 'https://partiful.com/e/arr-bare',
    'pickInviteUrlFromOutboxText peels bare trailing arrow',
  );
  // Residual peel-7: fullwidth quotes ＂＇ · presentation-form parens ﹙﹚
  // (mobile/CJK fullwidth paste; sticky ＂ would encode into pathname)
  ok(
    cleanInviteUrlCandidate('＂https://partiful.com/e/fwq＂') ===
      'https://partiful.com/e/fwq',
    'cleanInviteUrlCandidate peels fullwidth quotes',
  );
  ok(
    cleanInviteUrlCandidate('＇https://partiful.com/e/fwa＇') ===
      'https://partiful.com/e/fwa',
    'cleanInviteUrlCandidate peels fullwidth apostrophe quotes',
  );
  ok(
    cleanInviteUrlCandidate('﹙https://partiful.com/e/pres﹚') ===
      'https://partiful.com/e/pres',
    'cleanInviteUrlCandidate peels presentation-form parens',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/trail＂') ===
      'https://partiful.com/e/trail',
    'cleanInviteUrlCandidate peels trailing fullwidth quote alone',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ＂https://partiful.com/e/fwq-mark＂\n',
      'partiful',
    ) === 'https://partiful.com/e/fwq-mark',
    'pickInviteUrlFromOutboxText peels fullwidth quotes after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'RECORDED URL: ﹙https://partiful.com/e/pres-mark﹚\n',
      'partiful',
    ) === 'https://partiful.com/e/pres-mark',
    'pickInviteUrlFromOutboxText peels presentation parens after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/fwq-bare＂ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/fwq-bare',
    'pickInviteUrlFromOutboxText peels bare trailing fullwidth quote',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pres-bare﹚ next\n',
      'partiful',
    ) === 'https://partiful.com/e/pres-bare',
    'pickInviteUrlFromOutboxText peels bare trailing presentation close',
  );
  const fwqDrop = parseHumanInviteUrlLines(
    '＂https://partiful.com/e/drop-fwq＂\n',
  );
  ok(
    fwqDrop.some((p) => p.url === 'https://partiful.com/e/drop-fwq'),
    'parseHumanInviteUrlLines cleans fullwidth-quoted bare URL',
  );
  // Residual peel-8: halfwidth CJK corners ｢｣ · math angles ⟨⟩ · fullwidth ｜～ ·
  // wave 〜 · katakana ・ (JP IME halfwidth + docs math + sticky path trail)
  ok(
    cleanInviteUrlCandidate('｢https://partiful.com/e/hw｣') ===
      'https://partiful.com/e/hw',
    'cleanInviteUrlCandidate peels halfwidth CJK corners',
  );
  ok(
    cleanInviteUrlCandidate('⟨https://partiful.com/e/math⟩') ===
      'https://partiful.com/e/math',
    'cleanInviteUrlCandidate peels math angle brackets',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/fbar｜') ===
      'https://partiful.com/e/fbar',
    'cleanInviteUrlCandidate peels trailing fullwidth vertical bar',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/tilde～') ===
      'https://partiful.com/e/tilde',
    'cleanInviteUrlCandidate peels trailing fullwidth tilde',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/wave〜') ===
      'https://partiful.com/e/wave',
    'cleanInviteUrlCandidate peels trailing wave dash',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/kata・') ===
      'https://partiful.com/e/kata',
    'cleanInviteUrlCandidate peels trailing katakana middot',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ｢https://partiful.com/e/hw-mark｣\n',
      'partiful',
    ) === 'https://partiful.com/e/hw-mark',
    'pickInviteUrlFromOutboxText peels halfwidth corners after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'RECORDED URL: ⟨https://partiful.com/e/math-mark⟩\n',
      'partiful',
    ) === 'https://partiful.com/e/math-mark',
    'pickInviteUrlFromOutboxText peels math angles after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/fbar-bare｜ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/fbar-bare',
    'pickInviteUrlFromOutboxText peels bare fullwidth vertical bar',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/tilde-bare～ next\n',
      'partiful',
    ) === 'https://partiful.com/e/tilde-bare',
    'pickInviteUrlFromOutboxText peels bare fullwidth tilde',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/kata-bare・ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/kata-bare',
    'pickInviteUrlFromOutboxText peels bare katakana middot',
  );
  const hwDrop = parseHumanInviteUrlLines(
    '｢https://partiful.com/e/drop-hw｣\n',
  );
  ok(
    hwDrop.some((p) => p.url === 'https://partiful.com/e/drop-hw'),
    'parseHumanInviteUrlLines cleans halfwidth-corner bare URL',
  );
  const mathDrop = parseHumanInviteUrlLines(
    '⟨https://partiful.com/e/drop-math⟩\n',
  );
  ok(
    mathDrop.some((p) => p.url === 'https://partiful.com/e/drop-math'),
    'parseHumanInviteUrlLines cleans math-angle bare URL',
  );
  const presDrop = parseHumanInviteUrlLines(
    '﹙https://partiful.com/e/drop-pres﹚\n',
  );
  ok(
    presDrop.some((p) => p.url === 'https://partiful.com/e/drop-pres'),
    'parseHumanInviteUrlLines cleans presentation-paren bare URL',
  );
  const whiteDrop = parseHumanInviteUrlLines(
    '〖https://partiful.com/e/drop-white〗\n',
  );
  ok(
    whiteDrop.some((p) => p.url === 'https://partiful.com/e/drop-white'),
    'parseHumanInviteUrlLines cleans white-lenticular bare URL',
  );
  // Residual peel-9: small-form punct ﹛﹜﹝﹞﹐﹒﹖﹗ · ref mark ※ · fullwidth ＝
  // (CJK small-form paste + footnote ※ + sticky ＝ into path)
  ok(
    cleanInviteUrlCandidate('﹛https://partiful.com/e/sfbrace﹜') ===
      'https://partiful.com/e/sfbrace',
    'cleanInviteUrlCandidate peels small-form curly braces',
  );
  ok(
    cleanInviteUrlCandidate('﹝https://partiful.com/e/sftort﹞') ===
      'https://partiful.com/e/sftort',
    'cleanInviteUrlCandidate peels small-form tortoise brackets',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/sfcomma﹐') ===
      'https://partiful.com/e/sfcomma',
    'cleanInviteUrlCandidate peels trailing small-form comma',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/sfdot﹒') ===
      'https://partiful.com/e/sfdot',
    'cleanInviteUrlCandidate peels trailing small-form full stop',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/sfq﹖') ===
      'https://partiful.com/e/sfq',
    'cleanInviteUrlCandidate peels trailing small-form question',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/sfbang﹗') ===
      'https://partiful.com/e/sfbang',
    'cleanInviteUrlCandidate peels trailing small-form bang',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/ref※') ===
      'https://partiful.com/e/ref',
    'cleanInviteUrlCandidate peels trailing reference mark',
  );
  ok(
    cleanInviteUrlCandidate('※https://partiful.com/e/ref-lead') ===
      'https://partiful.com/e/ref-lead',
    'cleanInviteUrlCandidate peels leading reference mark',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/fweq＝') ===
      'https://partiful.com/e/fweq',
    'cleanInviteUrlCandidate peels trailing fullwidth equals',
  );
  ok(
    cleanInviteUrlCandidate('＝https://partiful.com/e/fweq-lead＝') ===
      'https://partiful.com/e/fweq-lead',
    'cleanInviteUrlCandidate peels fullwidth equals wrappers',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/sfeq﹦') ===
      'https://partiful.com/e/sfeq',
    'cleanInviteUrlCandidate peels trailing small-form equals',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ﹛https://partiful.com/e/sf-mark﹜\n',
      'partiful',
    ) === 'https://partiful.com/e/sf-mark',
    'pickInviteUrlFromOutboxText peels small-form braces after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'RECORDED URL: ※https://partiful.com/e/ref-mark※\n',
      'partiful',
    ) === 'https://partiful.com/e/ref-mark',
    'pickInviteUrlFromOutboxText peels reference mark after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/fweq-bare＝ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/fweq-bare',
    'pickInviteUrlFromOutboxText peels bare fullwidth equals',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/sfcomma-bare﹐ next\n',
      'partiful',
    ) === 'https://partiful.com/e/sfcomma-bare',
    'pickInviteUrlFromOutboxText peels bare small-form comma',
  );
  const sfDrop = parseHumanInviteUrlLines(
    '﹛https://partiful.com/e/drop-sfbrace﹜\n',
  );
  ok(
    sfDrop.some((p) => p.url === 'https://partiful.com/e/drop-sfbrace'),
    'parseHumanInviteUrlLines cleans small-form-brace bare URL',
  );
  const refDrop = parseHumanInviteUrlLines(
    '※https://partiful.com/e/drop-ref※\n',
  );
  ok(
    refDrop.some((p) => p.url === 'https://partiful.com/e/drop-ref'),
    'parseHumanInviteUrlLines cleans reference-mark bare URL',
  );
  const fweqDrop = parseHumanInviteUrlLines(
    '＝https://partiful.com/e/drop-fweq＝\n',
  );
  ok(
    fweqDrop.some((p) => p.url === 'https://partiful.com/e/drop-fweq'),
    'parseHumanInviteUrlLines cleans fullwidth-equals bare URL',
  );
  // Residual peel-10: white parens ｟｠ · math white brackets ⟦⟧ · fullwidth ：＊＃ · halfwidth ｡
  // (JP IME white-paren paste; docs math brackets; sticky ：＊＃｡ into path)
  ok(
    cleanInviteUrlCandidate('｟https://partiful.com/e/white｠') ===
      'https://partiful.com/e/white',
    'cleanInviteUrlCandidate peels white parentheses',
  );
  ok(
    cleanInviteUrlCandidate('⟦https://partiful.com/e/math⟧') ===
      'https://partiful.com/e/math',
    'cleanInviteUrlCandidate peels math white brackets',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/fwcolon：') ===
      'https://partiful.com/e/fwcolon',
    'cleanInviteUrlCandidate peels trailing fullwidth colon',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/half｡') ===
      'https://partiful.com/e/half',
    'cleanInviteUrlCandidate peels trailing halfwidth ideographic stop',
  );
  ok(
    cleanInviteUrlCandidate('＊https://partiful.com/e/fwstar＊') ===
      'https://partiful.com/e/fwstar',
    'cleanInviteUrlCandidate peels fullwidth asterisk wrappers',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/fwnum＃') ===
      'https://partiful.com/e/fwnum',
    'cleanInviteUrlCandidate peels trailing fullwidth number sign',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ｟https://partiful.com/e/white-mark｠\n',
      'partiful',
    ) === 'https://partiful.com/e/white-mark',
    'pickInviteUrlFromOutboxText peels white parens after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/fwcolon-bare： tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/fwcolon-bare',
    'pickInviteUrlFromOutboxText peels bare fullwidth colon',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste ⟦https://lu.ma/math-bare⟧ next\n',
      'luma',
    ) === 'https://lu.ma/math-bare',
    'pickInviteUrlFromOutboxText peels bare math white brackets',
  );
  const whiteParenDrop = parseHumanInviteUrlLines(
    '｟https://partiful.com/e/drop-wparen｠\n',
  );
  ok(
    whiteParenDrop.some((p) => p.url === 'https://partiful.com/e/drop-wparen'),
    'parseHumanInviteUrlLines cleans white-paren bare URL',
  );
  const fwcolonDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-fwcolon：\n',
  );
  ok(
    fwcolonDrop.some((p) => p.url === 'https://partiful.com/e/drop-fwcolon'),
    'parseHumanInviteUrlLines cleans trailing fullwidth-colon bare URL',
  );
  const mathWhiteDrop = parseHumanInviteUrlLines(
    '⟦https://partiful.com/e/drop-mwbracket⟧\n',
  );
  ok(
    mathWhiteDrop.some((p) => p.url === 'https://partiful.com/e/drop-mwbracket'),
    'parseHumanInviteUrlLines cleans math-white-bracket bare URL',
  );
  // Residual peel-11: math double angle ⟪⟫ · white curly ⦃⦄ · black tortoise ⦗⦘ ·
  // ceiling/floor ⌈⌉⌊⌋ · medium ⦋⦌ · white/flat ⟬⟭⟮⟯ · inverted ¿¡ · leading ｜・￨
  ok(
    cleanInviteUrlCandidate('⟪https://partiful.com/e/dblmath⟫') ===
      'https://partiful.com/e/dblmath',
    'cleanInviteUrlCandidate peels math double angles',
  );
  ok(
    cleanInviteUrlCandidate('⦃https://partiful.com/e/wbrace⦄') ===
      'https://partiful.com/e/wbrace',
    'cleanInviteUrlCandidate peels math white curly braces',
  );
  ok(
    cleanInviteUrlCandidate('⦗https://partiful.com/e/blackorb⦘') ===
      'https://partiful.com/e/blackorb',
    'cleanInviteUrlCandidate peels math black tortoise shell',
  );
  ok(
    cleanInviteUrlCandidate('⌈https://partiful.com/e/ceil⌉') ===
      'https://partiful.com/e/ceil',
    'cleanInviteUrlCandidate peels ceiling brackets',
  );
  ok(
    cleanInviteUrlCandidate('⌊https://lu.ma/floor⌋') === 'https://lu.ma/floor',
    'cleanInviteUrlCandidate peels floor brackets',
  );
  ok(
    cleanInviteUrlCandidate('⦋https://partiful.com/e/medbraket⦌') ===
      'https://partiful.com/e/medbraket',
    'cleanInviteUrlCandidate peels medium math brackets',
  );
  ok(
    cleanInviteUrlCandidate('⟬https://partiful.com/e/whtang⟭') ===
      'https://partiful.com/e/whtang',
    'cleanInviteUrlCandidate peels math white tortoise angles',
  );
  ok(
    cleanInviteUrlCandidate('⟮https://partiful.com/e/medpar⟯') ===
      'https://partiful.com/e/medpar',
    'cleanInviteUrlCandidate peels math flattened parens',
  );
  ok(
    cleanInviteUrlCandidate('¿https://partiful.com/e/inv?') ===
      'https://partiful.com/e/inv',
    'cleanInviteUrlCandidate peels Spanish inverted question',
  );
  ok(
    cleanInviteUrlCandidate('¡https://partiful.com/e/invbang!') ===
      'https://partiful.com/e/invbang',
    'cleanInviteUrlCandidate peels Spanish inverted bang',
  );
  ok(
    cleanInviteUrlCandidate('｜https://partiful.com/e/fwbar｜') ===
      'https://partiful.com/e/fwbar',
    'cleanInviteUrlCandidate peels leading fullwidth vertical bar',
  );
  ok(
    cleanInviteUrlCandidate('・https://partiful.com/e/kata・') ===
      'https://partiful.com/e/kata',
    'cleanInviteUrlCandidate peels leading katakana middot',
  );
  ok(
    cleanInviteUrlCandidate('￨https://partiful.com/e/halfbar￨') ===
      'https://partiful.com/e/halfbar',
    'cleanInviteUrlCandidate peels halfwidth forms light vertical',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ⟪https://partiful.com/e/dbl-mark⟫\n',
      'partiful',
    ) === 'https://partiful.com/e/dbl-mark',
    'pickInviteUrlFromOutboxText peels math double angle after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ⌈https://lu.ma/ceil-mark⌉\n',
      'luma',
    ) === 'https://lu.ma/ceil-mark',
    'pickInviteUrlFromOutboxText peels ceiling after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see ⦃https://partiful.com/e/wbrace-bare⦄ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/wbrace-bare',
    'pickInviteUrlFromOutboxText peels bare white curly braces',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste ¿https://partiful.com/e/inv-bare? next\n',
      'partiful',
    ) === 'https://partiful.com/e/inv-bare',
    'pickInviteUrlFromOutboxText peels bare inverted question',
  );
  const ceilDrop = parseHumanInviteUrlLines(
    '⌈https://partiful.com/e/drop-ceil⌉\n',
  );
  ok(
    ceilDrop.some((p) => p.url === 'https://partiful.com/e/drop-ceil'),
    'parseHumanInviteUrlLines cleans ceiling bare URL',
  );
  const dblMathDrop = parseHumanInviteUrlLines(
    '⟪https://partiful.com/e/drop-dbl⟫\n',
  );
  ok(
    dblMathDrop.some((p) => p.url === 'https://partiful.com/e/drop-dbl'),
    'parseHumanInviteUrlLines cleans math-double-angle bare URL',
  );
  const invDrop = parseHumanInviteUrlLines(
    '¿https://partiful.com/e/drop-inv?\n',
  );
  ok(
    invDrop.some((p) => p.url === 'https://partiful.com/e/drop-inv'),
    'parseHumanInviteUrlLines cleans inverted-question bare URL',
  );
  // Residual peel-12: CJK vertical forms ︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄
  // (vertical-text paste / IME presentation forms; sticky ︶ into path)
  ok(
    cleanInviteUrlCandidate('︵https://partiful.com/e/vparen︶') ===
      'https://partiful.com/e/vparen',
    'cleanInviteUrlCandidate peels CJK vertical parens',
  );
  ok(
    cleanInviteUrlCandidate('︷https://partiful.com/e/vcurl︸') ===
      'https://partiful.com/e/vcurl',
    'cleanInviteUrlCandidate peels CJK vertical curly braces',
  );
  ok(
    cleanInviteUrlCandidate('︹https://partiful.com/e/vtort︺') ===
      'https://partiful.com/e/vtort',
    'cleanInviteUrlCandidate peels CJK vertical tortoise brackets',
  );
  ok(
    cleanInviteUrlCandidate('︻https://partiful.com/e/vlent︼') ===
      'https://partiful.com/e/vlent',
    'cleanInviteUrlCandidate peels CJK vertical black lenticular',
  );
  ok(
    cleanInviteUrlCandidate('︽https://lu.ma/vdbl︾') === 'https://lu.ma/vdbl',
    'cleanInviteUrlCandidate peels CJK vertical double angles',
  );
  ok(
    cleanInviteUrlCandidate('︿https://partiful.com/e/vang﹀') ===
      'https://partiful.com/e/vang',
    'cleanInviteUrlCandidate peels CJK vertical angles',
  );
  ok(
    cleanInviteUrlCandidate('﹁https://partiful.com/e/vcorn﹂') ===
      'https://partiful.com/e/vcorn',
    'cleanInviteUrlCandidate peels CJK vertical corners',
  );
  ok(
    cleanInviteUrlCandidate('﹃https://partiful.com/e/vwcorn﹄') ===
      'https://partiful.com/e/vwcorn',
    'cleanInviteUrlCandidate peels CJK vertical white corners',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-12',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ︵https://partiful.com/e/vparen-mark︶\n',
      'partiful',
    ) === 'https://partiful.com/e/vparen-mark',
    'pickInviteUrlFromOutboxText peels vertical parens after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ︻https://lu.ma/vlent-mark︼\n',
      'luma',
    ) === 'https://lu.ma/vlent-mark',
    'pickInviteUrlFromOutboxText peels vertical lenticular after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see ︽https://partiful.com/e/vdbl-bare︾ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/vdbl-bare',
    'pickInviteUrlFromOutboxText peels bare vertical double angles',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste ﹁https://partiful.com/e/vcorn-bare﹂ next\n',
      'partiful',
    ) === 'https://partiful.com/e/vcorn-bare',
    'pickInviteUrlFromOutboxText peels bare vertical corners',
  );
  const vparenDrop = parseHumanInviteUrlLines(
    '︵https://partiful.com/e/drop-vparen︶\n',
  );
  ok(
    vparenDrop.some((p) => p.url === 'https://partiful.com/e/drop-vparen'),
    'parseHumanInviteUrlLines cleans vertical-paren bare URL',
  );
  const vlentDrop = parseHumanInviteUrlLines(
    '︻https://partiful.com/e/drop-vlent︼\n',
  );
  ok(
    vlentDrop.some((p) => p.url === 'https://partiful.com/e/drop-vlent'),
    'parseHumanInviteUrlLines cleans vertical-lenticular bare URL',
  );
  const vcornDrop = parseHumanInviteUrlLines(
    '﹁https://partiful.com/e/drop-vcorn﹂\n',
  );
  ok(
    vcornDrop.some((p) => p.url === 'https://partiful.com/e/drop-vcorn'),
    'parseHumanInviteUrlLines cleans vertical-corner bare URL',
  );
  // Residual peel-13: double-prime 〝〞〟 · ornamental ❝❞❛❜ · heavy ❮❯ ·
  // double ⸨⸩ · angle 〈〉 · halfwidth ､･ · vertical presentation ︰︱︲︳︴
  // (Word/iMessage/Notion ornaments; JP halfwidth; vertical dash paste)
  ok(
    cleanInviteUrlCandidate('〝https://partiful.com/e/dprime〞') ===
      'https://partiful.com/e/dprime',
    'cleanInviteUrlCandidate peels double-prime quotes',
  );
  ok(
    cleanInviteUrlCandidate('❝https://partiful.com/e/orn❞') ===
      'https://partiful.com/e/orn',
    'cleanInviteUrlCandidate peels ornamental heavy double quotes',
  );
  ok(
    cleanInviteUrlCandidate('❛https://partiful.com/e/orns❜') ===
      'https://partiful.com/e/orns',
    'cleanInviteUrlCandidate peels ornamental single quotes',
  );
  ok(
    cleanInviteUrlCandidate('❮https://partiful.com/e/hang❯') ===
      'https://partiful.com/e/hang',
    'cleanInviteUrlCandidate peels heavy angle ornaments',
  );
  ok(
    cleanInviteUrlCandidate('⸨https://lu.ma/dpar⸩') === 'https://lu.ma/dpar',
    'cleanInviteUrlCandidate peels double parentheses',
  );
  ok(
    cleanInviteUrlCandidate('〈https://partiful.com/e/ang〉') ===
      'https://partiful.com/e/ang',
    'cleanInviteUrlCandidate peels angle brackets U+2329/232A',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/hwcom､') ===
      'https://partiful.com/e/hwcom',
    'cleanInviteUrlCandidate peels trailing halfwidth ideographic comma',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/hwmid･') ===
      'https://partiful.com/e/hwmid',
    'cleanInviteUrlCandidate peels trailing halfwidth katakana middle dot',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/vlead︰') ===
      'https://partiful.com/e/vlead',
    'cleanInviteUrlCandidate peels trailing vertical two-dot leader',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/vem︱') ===
      'https://partiful.com/e/vem',
    'cleanInviteUrlCandidate peels trailing vertical em dash',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/ven︲') ===
      'https://partiful.com/e/ven',
    'cleanInviteUrlCandidate peels trailing vertical en dash',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/vlow︳') ===
      'https://partiful.com/e/vlow',
    'cleanInviteUrlCandidate peels trailing vertical low line',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/vwavy︴') ===
      'https://partiful.com/e/vwavy',
    'cleanInviteUrlCandidate peels trailing vertical wavy low line',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-13',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: 〝https://partiful.com/e/dprime-mark〞\n',
      'partiful',
    ) === 'https://partiful.com/e/dprime-mark',
    'pickInviteUrlFromOutboxText peels double-prime after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ❝https://lu.ma/orn-mark❞\n',
      'luma',
    ) === 'https://lu.ma/orn-mark',
    'pickInviteUrlFromOutboxText peels ornamental quotes after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see ❮https://partiful.com/e/hang-bare❯ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/hang-bare',
    'pickInviteUrlFromOutboxText peels bare heavy angles',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste ⸨https://partiful.com/e/dpar-bare⸩ next\n',
      'partiful',
    ) === 'https://partiful.com/e/dpar-bare',
    'pickInviteUrlFromOutboxText peels bare double parens',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/hwcom-bare､ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/hwcom-bare',
    'pickInviteUrlFromOutboxText peels bare halfwidth ideographic comma',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/vem-bare︱ next\n',
      'partiful',
    ) === 'https://partiful.com/e/vem-bare',
    'pickInviteUrlFromOutboxText peels bare vertical em dash',
  );
  const dprimeDrop = parseHumanInviteUrlLines(
    '〝https://partiful.com/e/drop-dprime〞\n',
  );
  ok(
    dprimeDrop.some((p) => p.url === 'https://partiful.com/e/drop-dprime'),
    'parseHumanInviteUrlLines cleans double-prime bare URL',
  );
  const ornDrop = parseHumanInviteUrlLines(
    '❝https://partiful.com/e/drop-orn❞\n',
  );
  ok(
    ornDrop.some((p) => p.url === 'https://partiful.com/e/drop-orn'),
    'parseHumanInviteUrlLines cleans ornamental-quote bare URL',
  );
  const hangDrop = parseHumanInviteUrlLines(
    '❮https://partiful.com/e/drop-hang❯\n',
  );
  ok(
    hangDrop.some((p) => p.url === 'https://partiful.com/e/drop-hang'),
    'parseHumanInviteUrlLines cleans heavy-angle bare URL',
  );
  const vemDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-vem︱\n',
  );
  ok(
    vemDrop.some((p) => p.url === 'https://partiful.com/e/drop-vem'),
    'parseHumanInviteUrlLines cleans trailing vertical-em bare URL',
  );
  const arrowDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-arr→\n',
  );
  ok(
    arrowDrop.some((p) => p.url === 'https://partiful.com/e/drop-arr'),
    'parseHumanInviteUrlLines cleans trailing arrow bare URL',
  );
  const smartDrop = parseHumanInviteUrlLines(
    '\u201chttps://partiful.com/e/drop-smart\u201d\n',
  );
  ok(
    smartDrop.some((p) => p.url === 'https://partiful.com/e/drop-smart'),
    'parseHumanInviteUrlLines cleans smart-quoted bare URL',
  );
  // Residual peel-14: white square 〚〛 · light ornate ❲❳ · quill ⁅⁆ ·
  // white paren ⦅⦆ · white tortoise 〘〙 · half brackets ⸢⸣⸤⸥ · sideways ⸦⸧ ·
  // corner pieces ⌜⌝⌞⌟ (math/Unicode paste; corner-quote IME; white brackets)
  ok(
    cleanInviteUrlCandidate('〚https://partiful.com/e/wsb〛') ===
      'https://partiful.com/e/wsb',
    'cleanInviteUrlCandidate peels white square brackets',
  );
  ok(
    cleanInviteUrlCandidate('❲https://partiful.com/e/orn-light❳') ===
      'https://partiful.com/e/orn-light',
    'cleanInviteUrlCandidate peels light ornate tortoise brackets',
  );
  ok(
    cleanInviteUrlCandidate('⁅https://partiful.com/e/quill⁆') ===
      'https://partiful.com/e/quill',
    'cleanInviteUrlCandidate peels quill square brackets',
  );
  ok(
    cleanInviteUrlCandidate('⦅https://lu.ma/wparen⦆') === 'https://lu.ma/wparen',
    'cleanInviteUrlCandidate peels white parentheses',
  );
  ok(
    cleanInviteUrlCandidate('〘https://partiful.com/e/wtor〙') ===
      'https://partiful.com/e/wtor',
    'cleanInviteUrlCandidate peels white tortoise shell brackets',
  );
  ok(
    cleanInviteUrlCandidate('⸢https://partiful.com/e/top-half⸣') ===
      'https://partiful.com/e/top-half',
    'cleanInviteUrlCandidate peels top half brackets',
  );
  ok(
    cleanInviteUrlCandidate('⸤https://partiful.com/e/bot-half⸥') ===
      'https://partiful.com/e/bot-half',
    'cleanInviteUrlCandidate peels bottom half brackets',
  );
  ok(
    cleanInviteUrlCandidate('⸦https://partiful.com/e/side-u⸧') ===
      'https://partiful.com/e/side-u',
    'cleanInviteUrlCandidate peels sideways U brackets',
  );
  ok(
    cleanInviteUrlCandidate('⌜https://partiful.com/e/tl-corner⌝') ===
      'https://partiful.com/e/tl-corner',
    'cleanInviteUrlCandidate peels top corner pieces',
  );
  ok(
    cleanInviteUrlCandidate('⌞https://partiful.com/e/bl-corner⌟') ===
      'https://partiful.com/e/bl-corner',
    'cleanInviteUrlCandidate peels bottom corner pieces',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-14',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: 〚https://partiful.com/e/wsb-mark〛\n',
      'partiful',
    ) === 'https://partiful.com/e/wsb-mark',
    'pickInviteUrlFromOutboxText peels white square after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ⦅https://lu.ma/wp-mark⦆\n',
      'luma',
    ) === 'https://lu.ma/wp-mark',
    'pickInviteUrlFromOutboxText peels white paren after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see ⸢https://partiful.com/e/top-bare⸣ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/top-bare',
    'pickInviteUrlFromOutboxText peels bare top half brackets',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste ⌜https://partiful.com/e/corner-bare⌝ next\n',
      'partiful',
    ) === 'https://partiful.com/e/corner-bare',
    'pickInviteUrlFromOutboxText peels bare corner pieces',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/quill-trail⁆ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/quill-trail',
    'pickInviteUrlFromOutboxText peels trailing quill close on bare URL',
  );
  const wsbDrop = parseHumanInviteUrlLines(
    '〚https://partiful.com/e/drop-wsb〛\n',
  );
  ok(
    wsbDrop.some((p) => p.url === 'https://partiful.com/e/drop-wsb'),
    'parseHumanInviteUrlLines cleans white-square bare URL',
  );
  const wparenDrop = parseHumanInviteUrlLines(
    '⦅https://partiful.com/e/drop-wp⦆\n',
  );
  ok(
    wparenDrop.some((p) => p.url === 'https://partiful.com/e/drop-wp'),
    'parseHumanInviteUrlLines cleans white-paren bare URL',
  );
  const cornerDrop = parseHumanInviteUrlLines(
    '⌜https://partiful.com/e/drop-corner⌝\n',
  );
  ok(
    cornerDrop.some((p) => p.url === 'https://partiful.com/e/drop-corner'),
    'parseHumanInviteUrlLines cleans corner-piece bare URL',
  );
  const halfDrop = parseHumanInviteUrlLines(
    '⸢https://partiful.com/e/drop-half⸣\n',
  );
  ok(
    halfDrop.some((p) => p.url === 'https://partiful.com/e/drop-half'),
    'parseHumanInviteUrlLines cleans top-half-bracket bare URL',
  );
  const quillTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-quill⁆\n',
  );
  ok(
    quillTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-quill'),
    'parseHumanInviteUrlLines cleans trailing quill bare URL',
  );
  // Residual peel-15: medium dingbat ornaments ❨❩❪❫❬❭❰❱❴❵ · super/sub ⁽⁾₍₎ ·
  // vertical square presentation ﹇ combase (Notion/Word dingbat leftover after residual-13
  // heavy + residual-14 light; mobile super/sub; vertical form square)
  ok(
    cleanInviteUrlCandidate('❨https://partiful.com/e/medp❩') ===
      'https://partiful.com/e/medp',
    'cleanInviteUrlCandidate peels medium parenthesis ornaments',
  );
  ok(
    cleanInviteUrlCandidate('❪https://partiful.com/e/medf❫') ===
      'https://partiful.com/e/medf',
    'cleanInviteUrlCandidate peels medium flattened parenthesis ornaments',
  );
  ok(
    cleanInviteUrlCandidate('❬https://partiful.com/e/meda❭') ===
      'https://partiful.com/e/meda',
    'cleanInviteUrlCandidate peels medium angle ornaments',
  );
  ok(
    cleanInviteUrlCandidate('❰https://lu.ma/heva❱') === 'https://lu.ma/heva',
    'cleanInviteUrlCandidate peels heavy pointing angle ornaments',
  );
  ok(
    cleanInviteUrlCandidate('❴https://partiful.com/e/medc❵') ===
      'https://partiful.com/e/medc',
    'cleanInviteUrlCandidate peels medium curly ornaments',
  );
  ok(
    cleanInviteUrlCandidate('⁽https://partiful.com/e/sup⁾') ===
      'https://partiful.com/e/sup',
    'cleanInviteUrlCandidate peels superscript parentheses',
  );
  ok(
    cleanInviteUrlCandidate('₍https://partiful.com/e/sub₎') ===
      'https://partiful.com/e/sub',
    'cleanInviteUrlCandidate peels subscript parentheses',
  );
  ok(
    cleanInviteUrlCandidate('﹇https://partiful.com/e/vsb﹈') ===
      'https://partiful.com/e/vsb',
    'cleanInviteUrlCandidate peels vertical square presentation',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-15',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ❨https://partiful.com/e/medp-mark❩\n',
      'partiful',
    ) === 'https://partiful.com/e/medp-mark',
    'pickInviteUrlFromOutboxText peels medium paren after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: ⁽https://lu.ma/sup-mark⁾\n',
      'luma',
    ) === 'https://lu.ma/sup-mark',
    'pickInviteUrlFromOutboxText peels super paren after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see ❬https://partiful.com/e/meda-bare❭ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/meda-bare',
    'pickInviteUrlFromOutboxText peels bare medium angle ornaments',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste ﹇https://partiful.com/e/vsb-bare﹈ next\n',
      'partiful',
    ) === 'https://partiful.com/e/vsb-bare',
    'pickInviteUrlFromOutboxText peels bare vertical square presentation',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/heva-trail❱ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/heva-trail',
    'pickInviteUrlFromOutboxText peels trailing heavy angle close on bare URL',
  );
  const medpDrop = parseHumanInviteUrlLines(
    '❨https://partiful.com/e/drop-medp❩\n',
  );
  ok(
    medpDrop.some((p) => p.url === 'https://partiful.com/e/drop-medp'),
    'parseHumanInviteUrlLines cleans medium-paren bare URL',
  );
  const supDrop = parseHumanInviteUrlLines(
    '⁽https://partiful.com/e/drop-sup⁾\n',
  );
  ok(
    supDrop.some((p) => p.url === 'https://partiful.com/e/drop-sup'),
    'parseHumanInviteUrlLines cleans superscript-paren bare URL',
  );
  const vsbDrop = parseHumanInviteUrlLines(
    '﹇https://partiful.com/e/drop-vsb﹈\n',
  );
  ok(
    vsbDrop.some((p) => p.url === 'https://partiful.com/e/drop-vsb'),
    'parseHumanInviteUrlLines cleans vertical-square bare URL',
  );
  const medcDrop = parseHumanInviteUrlLines(
    '❴https://partiful.com/e/drop-medc❵\n',
  );
  ok(
    medcDrop.some((p) => p.url === 'https://partiful.com/e/drop-medc'),
    'parseHumanInviteUrlLines cleans medium-curly bare URL',
  );
  const hevaTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-heva❱\n',
  );
  ok(
    hevaTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-heva'),
    'parseHumanInviteUrlLines cleans trailing heavy-angle bare URL',
  );
  // Residual peel-16: fullwidth sticky ASCII －＿＼＋％＠＆＄＾｀ · footnote †‡°§¶
  // (JP IME fullwidth leftover after residual-10 ＊＃／; dagger/section paste;
  //  sticky － into path still passed isRealInviteUrl without peel)
  ok(
    cleanInviteUrlCandidate('－https://partiful.com/e/fwminus－') ===
      'https://partiful.com/e/fwminus',
    'cleanInviteUrlCandidate peels fullwidth minus sticky',
  );
  ok(
    cleanInviteUrlCandidate('＿https://partiful.com/e/fwus＿') ===
      'https://partiful.com/e/fwus',
    'cleanInviteUrlCandidate peels fullwidth underscore sticky',
  );
  ok(
    cleanInviteUrlCandidate('＼https://partiful.com/e/fwbs＼') ===
      'https://partiful.com/e/fwbs',
    'cleanInviteUrlCandidate peels fullwidth backslash sticky',
  );
  ok(
    cleanInviteUrlCandidate('＋https://partiful.com/e/fwplus＋') ===
      'https://partiful.com/e/fwplus',
    'cleanInviteUrlCandidate peels fullwidth plus sticky',
  );
  ok(
    cleanInviteUrlCandidate('％https://partiful.com/e/fwpct％') ===
      'https://partiful.com/e/fwpct',
    'cleanInviteUrlCandidate peels fullwidth percent sticky',
  );
  ok(
    cleanInviteUrlCandidate('＠https://partiful.com/e/fwat＠') ===
      'https://partiful.com/e/fwat',
    'cleanInviteUrlCandidate peels fullwidth at sticky',
  );
  ok(
    cleanInviteUrlCandidate('＆https://partiful.com/e/fwamp＆') ===
      'https://partiful.com/e/fwamp',
    'cleanInviteUrlCandidate peels fullwidth amp sticky',
  );
  ok(
    cleanInviteUrlCandidate('＄https://partiful.com/e/fwdol＄') ===
      'https://partiful.com/e/fwdol',
    'cleanInviteUrlCandidate peels fullwidth dollar sticky',
  );
  ok(
    cleanInviteUrlCandidate('＾https://partiful.com/e/fwcar＾') ===
      'https://partiful.com/e/fwcar',
    'cleanInviteUrlCandidate peels fullwidth caret sticky',
  );
  ok(
    cleanInviteUrlCandidate('｀https://partiful.com/e/fwtick｀') ===
      'https://partiful.com/e/fwtick',
    'cleanInviteUrlCandidate peels fullwidth backtick sticky',
  );
  ok(
    cleanInviteUrlCandidate('†https://partiful.com/e/dag†') ===
      'https://partiful.com/e/dag',
    'cleanInviteUrlCandidate peels dagger footnote',
  );
  ok(
    cleanInviteUrlCandidate('‡https://partiful.com/e/ddag‡') ===
      'https://partiful.com/e/ddag',
    'cleanInviteUrlCandidate peels double-dagger footnote',
  );
  ok(
    cleanInviteUrlCandidate('°https://partiful.com/e/deg°') ===
      'https://partiful.com/e/deg',
    'cleanInviteUrlCandidate peels degree mark',
  );
  ok(
    cleanInviteUrlCandidate('§https://partiful.com/e/sec§') ===
      'https://partiful.com/e/sec',
    'cleanInviteUrlCandidate peels section mark',
  );
  ok(
    cleanInviteUrlCandidate('¶https://partiful.com/e/pil¶') ===
      'https://partiful.com/e/pil',
    'cleanInviteUrlCandidate peels pilcrow',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-16',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: －https://partiful.com/e/fwminus-mark－\n',
      'partiful',
    ) === 'https://partiful.com/e/fwminus-mark',
    'pickInviteUrlFromOutboxText peels fullwidth minus after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: †https://lu.ma/fn-mark†\n',
      'luma',
    ) === 'https://lu.ma/fn-mark',
    'pickInviteUrlFromOutboxText peels dagger after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see ＠https://partiful.com/e/fwat-bare＠ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/fwat-bare',
    'pickInviteUrlFromOutboxText peels bare fullwidth at sticky',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/fwus-trail＿ next\n',
      'partiful',
    ) === 'https://partiful.com/e/fwus-trail',
    'pickInviteUrlFromOutboxText peels trailing fullwidth underscore on bare URL',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see §https://partiful.com/e/sec-bare§ tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/sec-bare',
    'pickInviteUrlFromOutboxText peels bare section mark',
  );
  const fwminusDrop = parseHumanInviteUrlLines(
    '－https://partiful.com/e/drop-fwminus－\n',
  );
  ok(
    fwminusDrop.some((p) => p.url === 'https://partiful.com/e/drop-fwminus'),
    'parseHumanInviteUrlLines cleans fullwidth-minus bare URL',
  );
  const dagDrop = parseHumanInviteUrlLines(
    '†https://partiful.com/e/drop-dag†\n',
  );
  ok(
    dagDrop.some((p) => p.url === 'https://partiful.com/e/drop-dag'),
    'parseHumanInviteUrlLines cleans dagger bare URL',
  );
  const fwatDrop = parseHumanInviteUrlLines(
    '＠https://partiful.com/e/drop-fwat＠\n',
  );
  ok(
    fwatDrop.some((p) => p.url === 'https://partiful.com/e/drop-fwat'),
    'parseHumanInviteUrlLines cleans fullwidth-at bare URL',
  );
  const fwusTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-fwus＿\n',
  );
  ok(
    fwusTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-fwus'),
    'parseHumanInviteUrlLines cleans trailing fullwidth-underscore bare URL',
  );
  const secDrop = parseHumanInviteUrlLines(
    '§https://partiful.com/e/drop-sec§\n',
  );
  ok(
    secDrop.some((p) => p.url === 'https://partiful.com/e/drop-sec'),
    'parseHumanInviteUrlLines cleans section-mark bare URL',
  );
  // Residual peel-17: percent-encoded residual-16 sticky in path
  // (copy/IME stamps － as %EF%BC%8D into pathname; still passed isRealInviteUrl)
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctminus%EF%BC%8D') ===
      'https://partiful.com/e/pctminus',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth minus',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctus%EF%BC%BF') ===
      'https://partiful.com/e/pctus',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth underscore',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctbs%EF%BC%BC') ===
      'https://partiful.com/e/pctbs',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth backslash',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctplus%EF%BC%8B') ===
      'https://partiful.com/e/pctplus',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth plus',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctpct%EF%BC%85') ===
      'https://partiful.com/e/pctpct',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth percent',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctat%EF%BC%A0') ===
      'https://partiful.com/e/pctat',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth at',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctamp%EF%BC%86') ===
      'https://partiful.com/e/pctamp',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth amp',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctdol%EF%BC%84') ===
      'https://partiful.com/e/pctdol',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth dollar',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctcar%EF%BC%BE') ===
      'https://partiful.com/e/pctcar',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth caret',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pcttick%EF%BD%80') ===
      'https://partiful.com/e/pcttick',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth backtick',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctdag%E2%80%A0') ===
      'https://partiful.com/e/pctdag',
    'cleanInviteUrlCandidate peels percent-encoded dagger',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctddag%E2%80%A1') ===
      'https://partiful.com/e/pctddag',
    'cleanInviteUrlCandidate peels percent-encoded double-dagger',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctdeg%C2%B0') ===
      'https://partiful.com/e/pctdeg',
    'cleanInviteUrlCandidate peels percent-encoded degree',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctsec%C2%A7') ===
      'https://partiful.com/e/pctsec',
    'cleanInviteUrlCandidate peels percent-encoded section',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctpil%C2%B6') ===
      'https://partiful.com/e/pctpil',
    'cleanInviteUrlCandidate peels percent-encoded pilcrow',
  );
  ok(
    cleanInviteUrlCandidate('%EF%BC%8Dhttps://partiful.com/e/pctlead%EF%BC%8D') ===
      'https://partiful.com/e/pctlead',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded fullwidth minus',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctmix%EF%BC%8D%EF%BC%BF',
    ) === 'https://partiful.com/e/pctmix',
    'cleanInviteUrlCandidate peels stacked percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctq%EF%BC%8D?ref=1',
    ) === 'https://partiful.com/e/pctq?ref=1',
    'cleanInviteUrlCandidate peels path sticky before real query residual-17',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-17',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?x=%20ok') ===
      'https://partiful.com/e/keep?x=%20ok',
    'cleanInviteUrlCandidate keeps unrelated percent encoding in query',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pctmark%EF%BC%8D\n',
      'partiful',
    ) === 'https://partiful.com/e/pctmark',
    'pickInviteUrlFromOutboxText peels percent-encoded minus after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctfn%E2%80%A0\n',
      'luma',
    ) === 'https://lu.ma/pctfn',
    'pickInviteUrlFromOutboxText peels percent-encoded dagger after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbare%EF%BC%A0 tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbare',
    'pickInviteUrlFromOutboxText peels bare percent-encoded fullwidth at',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pcttrail%EF%BC%BF next\n',
      'partiful',
    ) === 'https://partiful.com/e/pcttrail',
    'pickInviteUrlFromOutboxText peels trailing percent-encoded underscore on bare URL',
  );
  const pctminusDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctminus%EF%BC%8D\n',
  );
  ok(
    pctminusDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctminus'),
    'parseHumanInviteUrlLines cleans percent-encoded fullwidth-minus bare URL',
  );
  const pctdagDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctdag%E2%80%A0\n',
  );
  ok(
    pctdagDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctdag'),
    'parseHumanInviteUrlLines cleans percent-encoded dagger bare URL',
  );
  const pctatDrop = parseHumanInviteUrlLines(
    '%EF%BC%A0https://partiful.com/e/drop-pctat%EF%BC%A0\n',
  );
  ok(
    pctatDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctat'),
    'parseHumanInviteUrlLines cleans lead+trail percent-encoded fullwidth-at bare URL',
  );
  const pctusTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctus%EF%BC%BF\n',
  );
  ok(
    pctusTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctus'),
    'parseHumanInviteUrlLines cleans trailing percent-encoded underscore bare URL',
  );
  const pctsecDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctsec%C2%A7\n',
  );
  ok(
    pctsecDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctsec'),
    'parseHumanInviteUrlLines cleans percent-encoded section bare URL',
  );
  // Residual peel-18: percent-encoded residual-7/8/9/10 sticky in path
  // (＂＊＃：＝｜～ encode into pathname; still passed isRealInviteUrl after r17)
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfq%EF%BC%82') ===
      'https://partiful.com/e/pctfq',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth quote residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfa%EF%BC%87') ===
      'https://partiful.com/e/pctfa',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth apostrophe residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctstar%EF%BC%8A') ===
      'https://partiful.com/e/pctstar',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth asterisk residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pcthash%EF%BC%83') ===
      'https://partiful.com/e/pcthash',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth hash residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctcolon%EF%BC%9A') ===
      'https://partiful.com/e/pctcolon',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth colon residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pcteq%EF%BC%9D') ===
      'https://partiful.com/e/pcteq',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth equals residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctbar%EF%BD%9C') ===
      'https://partiful.com/e/pctbar',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth bar residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pcttilde%EF%BD%9E') ===
      'https://partiful.com/e/pcttilde',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth tilde residual-18',
  );
  ok(
    cleanInviteUrlCandidate('%EF%BC%82https://partiful.com/e/pctfqlead%EF%BC%82') ===
      'https://partiful.com/e/pctfqlead',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded fullwidth quote residual-18',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr18mix%EF%BC%82%EF%BC%9A',
    ) === 'https://partiful.com/e/pctr18mix',
    'cleanInviteUrlCandidate peels stacked residual-18 percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr18q%EF%BC%8A?ref=1',
    ) === 'https://partiful.com/e/pctr18q?ref=1',
    'cleanInviteUrlCandidate peels residual-18 path sticky before real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-18',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?x=%20ok') ===
      'https://partiful.com/e/keep?x=%20ok',
    'cleanInviteUrlCandidate keeps unrelated percent encoding in query residual-18',
  );
  ok(
    // residual-17 still works after residual-18 alphabet expand
    cleanInviteUrlCandidate('https://partiful.com/e/pctminus%EF%BC%8D') ===
      'https://partiful.com/e/pctminus',
    'cleanInviteUrlCandidate residual-17 minus still peels after residual-18',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pctfqmark%EF%BC%82\n',
      'partiful',
    ) === 'https://partiful.com/e/pctfqmark',
    'pickInviteUrlFromOutboxText peels percent-encoded fullwidth quote after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctcolonfn%EF%BC%9A\n',
      'luma',
    ) === 'https://lu.ma/pctcolonfn',
    'pickInviteUrlFromOutboxText peels percent-encoded fullwidth colon after marker',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbarestar%EF%BC%8A tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbarestar',
    'pickInviteUrlFromOutboxText peels bare percent-encoded fullwidth asterisk',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pcttrailbar%EF%BD%9C next\n',
      'partiful',
    ) === 'https://partiful.com/e/pcttrailbar',
    'pickInviteUrlFromOutboxText peels trailing percent-encoded fullwidth bar on bare URL',
  );
  const pctfqDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctfq%EF%BC%82\n',
  );
  ok(
    pctfqDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctfq'),
    'parseHumanInviteUrlLines cleans percent-encoded fullwidth-quote bare URL',
  );
  const pctcolonDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctcolon%EF%BC%9A\n',
  );
  ok(
    pctcolonDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctcolon'),
    'parseHumanInviteUrlLines cleans percent-encoded fullwidth-colon bare URL',
  );
  const pctbarDrop = parseHumanInviteUrlLines(
    '%EF%BD%9Chttps://partiful.com/e/drop-pctbar%EF%BD%9C\n',
  );
  ok(
    pctbarDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctbar'),
    'parseHumanInviteUrlLines cleans lead+trail percent-encoded fullwidth-bar bare URL',
  );
  const pctstarTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctstar%EF%BC%8A\n',
  );
  ok(
    pctstarTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctstar'),
    'parseHumanInviteUrlLines cleans trailing percent-encoded asterisk bare URL',
  );
  const pcteqDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pcteq%EF%BC%9D\n',
  );
  ok(
    pcteqDrop.some((p) => p.url === 'https://partiful.com/e/drop-pcteq'),
    'parseHumanInviteUrlLines cleans percent-encoded fullwidth-equals bare URL',
  );
  // Residual peel-19: percent-encoded residual-11–15 math/dingbat sticky in path
  // (⌊⌋ ⟪ ⟫ ❩ ︶ 〞 ❳ ⁾ ¿ encode into pathname; still passed isRealInviteUrl after r18)
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfloor%E2%8C%8B') ===
      'https://partiful.com/e/pctfloor',
    'cleanInviteUrlCandidate peels percent-encoded floor close residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctceil%E2%8C%89') ===
      'https://partiful.com/e/pctceil',
    'cleanInviteUrlCandidate peels percent-encoded ceiling close residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctdangle%E2%9F%AB') ===
      'https://partiful.com/e/pctdangle',
    'cleanInviteUrlCandidate peels percent-encoded math double-angle residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctding%E2%9D%A9') ===
      'https://partiful.com/e/pctding',
    'cleanInviteUrlCandidate peels percent-encoded medium dingbat residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctvert%EF%B8%B6') ===
      'https://partiful.com/e/pctvert',
    'cleanInviteUrlCandidate peels percent-encoded CJK vertical close residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctdprime%E3%80%9E') ===
      'https://partiful.com/e/pctdprime',
    'cleanInviteUrlCandidate peels percent-encoded double-prime residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctorate%E2%9D%B3') ===
      'https://partiful.com/e/pctorate',
    'cleanInviteUrlCandidate peels percent-encoded light ornate residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctsuper%E2%81%BE') ===
      'https://partiful.com/e/pctsuper',
    'cleanInviteUrlCandidate peels percent-encoded super-paren residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctiq%C2%BF') ===
      'https://partiful.com/e/pctiq',
    'cleanInviteUrlCandidate peels percent-encoded inverted question residual-19',
  );
  ok(
    cleanInviteUrlCandidate('%E2%8C%88https://partiful.com/e/pctclead%E2%8C%89') ===
      'https://partiful.com/e/pctclead',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded ceiling residual-19',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr19mix%E2%8C%8B%E2%9D%A9',
    ) === 'https://partiful.com/e/pctr19mix',
    'cleanInviteUrlCandidate peels stacked residual-19 percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr19q%E2%8C%8B?ref=1',
    ) === 'https://partiful.com/e/pctr19q?ref=1',
    'cleanInviteUrlCandidate peels residual-19 path sticky before real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?x=%20ok') ===
      'https://partiful.com/e/keep?x=%20ok',
    'cleanInviteUrlCandidate keeps unrelated percent encoding in query residual-19',
  );
  ok(
    // residual-17/18 still work after residual-19 alphabet expand
    cleanInviteUrlCandidate('https://partiful.com/e/pctminus%EF%BC%8D') ===
      'https://partiful.com/e/pctminus',
    'cleanInviteUrlCandidate residual-17 minus still peels after residual-19',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfq%EF%BC%82') ===
      'https://partiful.com/e/pctfq',
    'cleanInviteUrlCandidate residual-18 fullwidth quote still peels after residual-19',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pctfloormark%E2%8C%8B\n',
      'partiful',
    ) === 'https://partiful.com/e/pctfloormark',
    'pickInviteUrlFromOutboxText peels percent-encoded floor after marker residual-19',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctdingfn%E2%9D%A9\n',
      'luma',
    ) === 'https://lu.ma/pctdingfn',
    'pickInviteUrlFromOutboxText peels percent-encoded dingbat after marker residual-19',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbarevert%EF%B8%B6 tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbarevert',
    'pickInviteUrlFromOutboxText peels bare percent-encoded vertical close residual-19',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pcttraildp%E3%80%9E next\n',
      'partiful',
    ) === 'https://partiful.com/e/pcttraildp',
    'pickInviteUrlFromOutboxText peels trailing percent-encoded double-prime on bare URL',
  );
  const pctfloorDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctfloor%E2%8C%8B\n',
  );
  ok(
    pctfloorDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctfloor'),
    'parseHumanInviteUrlLines cleans percent-encoded floor bare URL residual-19',
  );
  const pctdingDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctding%E2%9D%A9\n',
  );
  ok(
    pctdingDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctding'),
    'parseHumanInviteUrlLines cleans percent-encoded dingbat bare URL residual-19',
  );
  const pctvertDrop = parseHumanInviteUrlLines(
    '%EF%B8%B5https://partiful.com/e/drop-pctvert%EF%B8%B6\n',
  );
  ok(
    pctvertDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctvert'),
    'parseHumanInviteUrlLines cleans lead+trail percent-encoded vertical bare URL residual-19',
  );
  const pctsuperTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctsuper%E2%81%BE\n',
  );
  ok(
    pctsuperTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctsuper'),
    'parseHumanInviteUrlLines cleans trailing percent-encoded super-paren bare URL residual-19',
  );
  // Residual peel-20: percent-encoded residual-2/5/6 CJK book + fullwidth + white
  // lenticular + chat arrows sticky in path (WeChat/docs/IME encode after unicode peel)
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctbook%E3%80%8B') ===
      'https://partiful.com/e/pctbook',
    'cleanInviteUrlCandidate peels percent-encoded CJK book close residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctcjk%E3%80%91') ===
      'https://partiful.com/e/pctcjk',
    'cleanInviteUrlCandidate peels percent-encoded CJK black bracket residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctcorner%E3%80%8D') ===
      'https://partiful.com/e/pctcorner',
    'cleanInviteUrlCandidate peels percent-encoded CJK corner residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctlent%E3%80%97') ===
      'https://partiful.com/e/pctlent',
    'cleanInviteUrlCandidate peels percent-encoded white lenticular residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pcttort%E3%80%95') ===
      'https://partiful.com/e/pcttort',
    'cleanInviteUrlCandidate peels percent-encoded tortoise shell residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfwbr%EF%BC%BD') ===
      'https://partiful.com/e/pctfwbr',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth bracket residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfwa%EF%BC%9E') ===
      'https://partiful.com/e/pctfwa',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth angle residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfwpar%EF%BC%89') ===
      'https://partiful.com/e/pctfwpar',
    'cleanInviteUrlCandidate peels percent-encoded fullwidth paren residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctarr%E2%86%92') ===
      'https://partiful.com/e/pctarr',
    'cleanInviteUrlCandidate peels percent-encoded chat arrow residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctidc%E3%80%81') ===
      'https://partiful.com/e/pctidc',
    'cleanInviteUrlCandidate peels percent-encoded ideographic comma residual-20',
  );
  ok(
    cleanInviteUrlCandidate('%E3%80%8Ahttps://partiful.com/e/pctblead%E3%80%8B') ===
      'https://partiful.com/e/pctblead',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded book residual-20',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr20mix%E3%80%8B%EF%BC%BD',
    ) === 'https://partiful.com/e/pctr20mix',
    'cleanInviteUrlCandidate peels stacked residual-20 percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr20q%E3%80%8B?ref=1',
    ) === 'https://partiful.com/e/pctr20q?ref=1',
    'cleanInviteUrlCandidate peels residual-20 path sticky before real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?x=%20ok') ===
      'https://partiful.com/e/keep?x=%20ok',
    'cleanInviteUrlCandidate keeps unrelated percent encoding in query residual-20',
  );
  ok(
    // residual-17/18/19 still work after residual-20 alphabet expand
    cleanInviteUrlCandidate('https://partiful.com/e/pctminus%EF%BC%8D') ===
      'https://partiful.com/e/pctminus',
    'cleanInviteUrlCandidate residual-17 minus still peels after residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfq%EF%BC%82') ===
      'https://partiful.com/e/pctfq',
    'cleanInviteUrlCandidate residual-18 fullwidth quote still peels after residual-20',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfloor%E2%8C%8B') ===
      'https://partiful.com/e/pctfloor',
    'cleanInviteUrlCandidate residual-19 floor still peels after residual-20',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pctbookmark%E3%80%8B\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbookmark',
    'pickInviteUrlFromOutboxText peels percent-encoded book after marker residual-20',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctlentfn%E3%80%97\n',
      'luma',
    ) === 'https://lu.ma/pctlentfn',
    'pickInviteUrlFromOutboxText peels percent-encoded white lenticular after marker residual-20',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbarefw%EF%BC%BD tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbarefw',
    'pickInviteUrlFromOutboxText peels bare percent-encoded fullwidth bracket residual-20',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pcttrailarr%E2%86%92 next\n',
      'partiful',
    ) === 'https://partiful.com/e/pcttrailarr',
    'pickInviteUrlFromOutboxText peels trailing percent-encoded arrow on bare URL residual-20',
  );
  const pctbookDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctbook%E3%80%8B\n',
  );
  ok(
    pctbookDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctbook'),
    'parseHumanInviteUrlLines cleans percent-encoded book bare URL residual-20',
  );
  const pctlentDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctlent%E3%80%97\n',
  );
  ok(
    pctlentDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctlent'),
    'parseHumanInviteUrlLines cleans percent-encoded white lenticular bare URL residual-20',
  );
  const pctfwbrDrop = parseHumanInviteUrlLines(
    '%EF%BC%BBhttps://partiful.com/e/drop-pctfwbr%EF%BC%BD\n',
  );
  ok(
    pctfwbrDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctfwbr'),
    'parseHumanInviteUrlLines cleans lead+trail percent-encoded fullwidth bracket residual-20',
  );
  const pctarrTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctarr%E2%86%92\n',
  );
  ok(
    pctarrTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctarr'),
    'parseHumanInviteUrlLines cleans trailing percent-encoded arrow bare URL residual-20',
  );
  // Residual peel-21: percent-encoded residual-3/4 smart quotes / guillemets /
  // en–em dash / primes / low-9 / bullet sticky in path (Word/iMessage/Slack encode)
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrdq%E2%80%9D') ===
      'https://partiful.com/e/pctrdq',
    'cleanInviteUrlCandidate peels percent-encoded smart double-close residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrsq%E2%80%99') ===
      'https://partiful.com/e/pctrsq',
    'cleanInviteUrlCandidate peels percent-encoded smart single-close residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctlaq%C2%BB') ===
      'https://partiful.com/e/pctlaq',
    'cleanInviteUrlCandidate peels percent-encoded guillemet close residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pcten%E2%80%93') ===
      'https://partiful.com/e/pcten',
    'cleanInviteUrlCandidate peels percent-encoded en dash residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctem%E2%80%94') ===
      'https://partiful.com/e/pctem',
    'cleanInviteUrlCandidate peels percent-encoded em dash residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctsg%E2%80%BA') ===
      'https://partiful.com/e/pctsg',
    'cleanInviteUrlCandidate peels percent-encoded single guillemet residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctprime%E2%80%B3') ===
      'https://partiful.com/e/pctprime',
    'cleanInviteUrlCandidate peels percent-encoded double-prime residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctsprime%E2%80%B2') ===
      'https://partiful.com/e/pctsprime',
    'cleanInviteUrlCandidate peels percent-encoded single-prime residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctlow9%E2%80%9E') ===
      'https://partiful.com/e/pctlow9',
    'cleanInviteUrlCandidate peels percent-encoded low-9 quote residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctbul%E2%80%A2') ===
      'https://partiful.com/e/pctbul',
    'cleanInviteUrlCandidate peels percent-encoded bullet residual-21',
  );
  ok(
    cleanInviteUrlCandidate('%E2%80%9Chttps://partiful.com/e/pctldq%E2%80%9D') ===
      'https://partiful.com/e/pctldq',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded smart double residual-21',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr21mix%E2%80%9D%E2%80%94',
    ) === 'https://partiful.com/e/pctr21mix',
    'cleanInviteUrlCandidate peels stacked residual-21 percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/pctr21q%E2%80%9D?ref=1',
    ) === 'https://partiful.com/e/pctr21q?ref=1',
    'cleanInviteUrlCandidate peels residual-21 path sticky before real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?x=%20ok') ===
      'https://partiful.com/e/keep?x=%20ok',
    'cleanInviteUrlCandidate keeps unrelated percent encoding in query residual-21',
  );
  ok(
    // residual-17/18/19/20 still work after residual-21 alphabet expand
    cleanInviteUrlCandidate('https://partiful.com/e/pctminus%EF%BC%8D') ===
      'https://partiful.com/e/pctminus',
    'cleanInviteUrlCandidate residual-17 minus still peels after residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfq%EF%BC%82') ===
      'https://partiful.com/e/pctfq',
    'cleanInviteUrlCandidate residual-18 fullwidth quote still peels after residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfloor%E2%8C%8B') ===
      'https://partiful.com/e/pctfloor',
    'cleanInviteUrlCandidate residual-19 floor still peels after residual-21',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctbook%E3%80%8B') ===
      'https://partiful.com/e/pctbook',
    'cleanInviteUrlCandidate residual-20 book still peels after residual-21',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pctrdqmark%E2%80%9D\n',
      'partiful',
    ) === 'https://partiful.com/e/pctrdqmark',
    'pickInviteUrlFromOutboxText peels percent-encoded smart double after marker residual-21',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctemfn%E2%80%94\n',
      'luma',
    ) === 'https://lu.ma/pctemfn',
    'pickInviteUrlFromOutboxText peels percent-encoded em dash after marker residual-21',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbareprime%E2%80%B3 tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbareprime',
    'pickInviteUrlFromOutboxText peels bare percent-encoded double-prime residual-21',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pcttrailguil%C2%BB next\n',
      'partiful',
    ) === 'https://partiful.com/e/pcttrailguil',
    'pickInviteUrlFromOutboxText peels trailing percent-encoded guillemet on bare URL residual-21',
  );
  const pctrdqDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctrdq%E2%80%9D\n',
  );
  ok(
    pctrdqDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctrdq'),
    'parseHumanInviteUrlLines cleans percent-encoded smart double bare URL residual-21',
  );
  const pctemDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctem%E2%80%94\n',
  );
  ok(
    pctemDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctem'),
    'parseHumanInviteUrlLines cleans percent-encoded em dash bare URL residual-21',
  );
  const pctldqLeadDrop = parseHumanInviteUrlLines(
    '%E2%80%9Chttps://partiful.com/e/drop-pctldq%E2%80%9D\n',
  );
  ok(
    pctldqLeadDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctldq'),
    'parseHumanInviteUrlLines cleans lead+trail percent-encoded smart double residual-21',
  );
  const pctprimeTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctprime%E2%80%B3\n',
  );
  ok(
    pctprimeTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctprime'),
    'parseHumanInviteUrlLines cleans trailing percent-encoded prime bare URL residual-21',
  );
  // Residual peel-22: percent-encoded residual-4 ASCII braces/pipe/backslash +
  // residual-9 small-form / ※ sticky in path (Discord/Slack/Word/IME encode)
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbrace%7D') ===
      'https://partiful.com/e/pctrbrace',
    'cleanInviteUrlCandidate peels percent-encoded close brace residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrpipe%7C') ===
      'https://partiful.com/e/pctrpipe',
    'cleanInviteUrlCandidate peels percent-encoded pipe residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbs%5C') ===
      'https://partiful.com/e/pctrbs',
    'cleanInviteUrlCandidate peels percent-encoded backslash residual-22',
  );
  ok(
    cleanInviteUrlCandidate('%7Bhttps://partiful.com/e/pctropen%7D') ===
      'https://partiful.com/e/pctropen',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded braces residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrsf%EF%B9%9C') ===
      'https://partiful.com/e/pctrsf',
    'cleanInviteUrlCandidate peels percent-encoded small-form close brace residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrtort%EF%B9%9E') ===
      'https://partiful.com/e/pctrtort',
    'cleanInviteUrlCandidate peels percent-encoded small-form tortoise residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrgt%EF%B9%A5') ===
      'https://partiful.com/e/pctrgt',
    'cleanInviteUrlCandidate peels percent-encoded small-form greater residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctreq%EF%B9%A6') ===
      'https://partiful.com/e/pctreq',
    'cleanInviteUrlCandidate peels percent-encoded small-form equals residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrcomma%EF%B9%90') ===
      'https://partiful.com/e/pctrcomma',
    'cleanInviteUrlCandidate peels percent-encoded small-form comma residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbang%EF%B9%97') ===
      'https://partiful.com/e/pctrbang',
    'cleanInviteUrlCandidate peels percent-encoded small-form bang residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrref%E2%80%BB') ===
      'https://partiful.com/e/pctrref',
    'cleanInviteUrlCandidate peels percent-encoded ref mark residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctr22mix%7D%7C%5C') ===
      'https://partiful.com/e/pctr22mix',
    'cleanInviteUrlCandidate peels stacked residual-22 percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctr22q%7D?ref=1') ===
      'https://partiful.com/e/pctr22q?ref=1',
    'cleanInviteUrlCandidate peels residual-22 path sticky before real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?x=%7Dok') ===
      'https://partiful.com/e/keep?x=%7Dok',
    'cleanInviteUrlCandidate keeps residual-22 encoding inside real query',
  );
  ok(
    // residual-17/18/19/20/21 still work after residual-22 alphabet expand
    cleanInviteUrlCandidate('https://partiful.com/e/pctminus%EF%BC%8D') ===
      'https://partiful.com/e/pctminus',
    'cleanInviteUrlCandidate residual-17 minus still peels after residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfq%EF%BC%82') ===
      'https://partiful.com/e/pctfq',
    'cleanInviteUrlCandidate residual-18 fullwidth quote still peels after residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfloor%E2%8C%8B') ===
      'https://partiful.com/e/pctfloor',
    'cleanInviteUrlCandidate residual-19 floor still peels after residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctbook%E3%80%8B') ===
      'https://partiful.com/e/pctbook',
    'cleanInviteUrlCandidate residual-20 book still peels after residual-22',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrdq%E2%80%9D') ===
      'https://partiful.com/e/pctrdq',
    'cleanInviteUrlCandidate residual-21 smart double still peels after residual-22',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pctrbracemark%7D\n',
      'partiful',
    ) === 'https://partiful.com/e/pctrbracemark',
    'pickInviteUrlFromOutboxText peels percent-encoded brace after marker residual-22',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctrpipefn%7C\n',
      'luma',
    ) === 'https://lu.ma/pctrpipefn',
    'pickInviteUrlFromOutboxText peels percent-encoded pipe after marker residual-22',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbaresf%EF%B9%9C tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbaresf',
    'pickInviteUrlFromOutboxText peels bare percent-encoded small-form residual-22',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pcttrailbs%5C next\n',
      'partiful',
    ) === 'https://partiful.com/e/pcttrailbs',
    'pickInviteUrlFromOutboxText peels trailing percent-encoded backslash on bare URL residual-22',
  );
  const pctbraceDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctbrace%7D\n',
  );
  ok(
    pctbraceDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctbrace'),
    'parseHumanInviteUrlLines cleans percent-encoded brace bare URL residual-22',
  );
  const pctsfDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctsf%EF%B9%9C\n',
  );
  ok(
    pctsfDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctsf'),
    'parseHumanInviteUrlLines cleans percent-encoded small-form bare URL residual-22',
  );
  const pctopenBraceLeadDrop = parseHumanInviteUrlLines(
    '%7Bhttps://partiful.com/e/drop-pctob%7D\n',
  );
  ok(
    pctopenBraceLeadDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctob'),
    'parseHumanInviteUrlLines cleans lead+trail percent-encoded braces residual-22',
  );
  const pctrefTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctref%E2%80%BB\n',
  );
  ok(
    pctrefTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctref'),
    'parseHumanInviteUrlLines cleans trailing percent-encoded ref mark bare URL residual-22',
  );
  // Residual peel-23: percent-encoded residual-1 ASCII brackets/parens/quotes/md +
  // residual-10 halfwidth white/stop + residual-8/13 halfwidth corners + math white/angle
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbrack%5D') ===
      'https://partiful.com/e/pctrbrack',
    'cleanInviteUrlCandidate peels percent-encoded close bracket residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrparen%29') ===
      'https://partiful.com/e/pctrparen',
    'cleanInviteUrlCandidate peels percent-encoded close paren residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrquot%22') ===
      'https://partiful.com/e/pctrquot',
    'cleanInviteUrlCandidate peels percent-encoded double quote residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrsq%27') ===
      'https://partiful.com/e/pctrsq',
    'cleanInviteUrlCandidate peels percent-encoded single quote residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrgt%3E') ===
      'https://partiful.com/e/pctrgt',
    'cleanInviteUrlCandidate peels percent-encoded angle close residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrstar%2A') ===
      'https://partiful.com/e/pctrstar',
    'cleanInviteUrlCandidate peels percent-encoded star residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrus%5F') ===
      'https://partiful.com/e/pctrus',
    'cleanInviteUrlCandidate peels percent-encoded underscore residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrtild%7E') ===
      'https://partiful.com/e/pctrtild',
    'cleanInviteUrlCandidate peels percent-encoded tilde residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbang%21') ===
      'https://partiful.com/e/pctrbang',
    'cleanInviteUrlCandidate peels percent-encoded bang residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbt%60') ===
      'https://partiful.com/e/pctrbt',
    'cleanInviteUrlCandidate peels percent-encoded backtick residual-23',
  );
  ok(
    cleanInviteUrlCandidate('%5Bhttps://partiful.com/e/pctropen%5D') ===
      'https://partiful.com/e/pctropen',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded brackets residual-23',
  );
  ok(
    cleanInviteUrlCandidate('%28https://partiful.com/e/pctrop%29') ===
      'https://partiful.com/e/pctrop',
    'cleanInviteUrlCandidate peels lead+trail percent-encoded parens residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrhw%EF%BD%A0') ===
      'https://partiful.com/e/pctrhw',
    'cleanInviteUrlCandidate peels percent-encoded halfwidth white close residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrstop%EF%BD%A1') ===
      'https://partiful.com/e/pctrstop',
    'cleanInviteUrlCandidate peels percent-encoded halfwidth stop residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrcorn%EF%BD%A3') ===
      'https://partiful.com/e/pctrcorn',
    'cleanInviteUrlCandidate peels percent-encoded halfwidth corner residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrmath%E2%9F%A7') ===
      'https://partiful.com/e/pctrmath',
    'cleanInviteUrlCandidate peels percent-encoded math white close residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctr23mix%5D%29%3E') ===
      'https://partiful.com/e/pctr23mix',
    'cleanInviteUrlCandidate peels stacked residual-23 percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctr23q%5D?ref=1') ===
      'https://partiful.com/e/pctr23q?ref=1',
    'cleanInviteUrlCandidate peels residual-23 path sticky before real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1') ===
      'https://partiful.com/e/keep?ref=1',
    'cleanInviteUrlCandidate still keeps real query after residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?x=%5Dok') ===
      'https://partiful.com/e/keep?x=%5Dok',
    'cleanInviteUrlCandidate keeps residual-23 encoding inside real query',
  );
  ok(
    // residual-17/18/19/20/21/22 still work after residual-23 alphabet expand
    cleanInviteUrlCandidate('https://partiful.com/e/pctminus%EF%BC%8D') ===
      'https://partiful.com/e/pctminus',
    'cleanInviteUrlCandidate residual-17 minus still peels after residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfq%EF%BC%82') ===
      'https://partiful.com/e/pctfq',
    'cleanInviteUrlCandidate residual-18 fullwidth quote still peels after residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctfloor%E2%8C%8B') ===
      'https://partiful.com/e/pctfloor',
    'cleanInviteUrlCandidate residual-19 floor still peels after residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctbook%E3%80%8B') ===
      'https://partiful.com/e/pctbook',
    'cleanInviteUrlCandidate residual-20 book still peels after residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrdq%E2%80%9D') ===
      'https://partiful.com/e/pctrdq',
    'cleanInviteUrlCandidate residual-21 smart double still peels after residual-23',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbrace%7D') ===
      'https://partiful.com/e/pctrbrace',
    'cleanInviteUrlCandidate residual-22 brace still peels after residual-23',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/pctrbrackmark%5D\n',
      'partiful',
    ) === 'https://partiful.com/e/pctrbrackmark',
    'pickInviteUrlFromOutboxText peels percent-encoded bracket after marker residual-23',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctrparenfn%29\n',
      'luma',
    ) === 'https://lu.ma/pctrparenfn',
    'pickInviteUrlFromOutboxText peels percent-encoded paren after marker residual-23',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbarehw%EF%BD%A0 tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbarehw',
    'pickInviteUrlFromOutboxText peels bare percent-encoded halfwidth residual-23',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://partiful.com/e/pcttrailgt%3E next\n',
      'partiful',
    ) === 'https://partiful.com/e/pcttrailgt',
    'pickInviteUrlFromOutboxText peels trailing percent-encoded angle on bare URL residual-23',
  );
  const pctbrackDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctbrack%5D\n',
  );
  ok(
    pctbrackDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctbrack'),
    'parseHumanInviteUrlLines cleans percent-encoded bracket bare URL residual-23',
  );
  const pcthwDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pcthw%EF%BD%A0\n',
  );
  ok(
    pcthwDrop.some((p) => p.url === 'https://partiful.com/e/drop-pcthw'),
    'parseHumanInviteUrlLines cleans percent-encoded halfwidth bare URL residual-23',
  );
  const pctopenBrackLeadDrop = parseHumanInviteUrlLines(
    '%5Bhttps://partiful.com/e/drop-pctobk%5D\n',
  );
  ok(
    pctopenBrackLeadDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctobk'),
    'parseHumanInviteUrlLines cleans lead+trail percent-encoded brackets residual-23',
  );
  // Residual peel-24: HTML entity wrappers (email/Notion/Slack HTML) +
  // percent-encoded residual-1 prose punct / space left after residual-23
  ok(
    cleanInviteUrlCandidate('&lt;https://partiful.com/e/entlt&gt;') ===
      'https://partiful.com/e/entlt',
    'cleanInviteUrlCandidate peels HTML &lt;/&gt; entity wrappers residual-24',
  );
  ok(
    cleanInviteUrlCandidate('&quot;https://partiful.com/e/entq&quot;') ===
      'https://partiful.com/e/entq',
    'cleanInviteUrlCandidate peels HTML &quot; entity wrappers residual-24',
  );
  ok(
    cleanInviteUrlCandidate('&#39;https://lu.ma/entapos&#39;') ===
      'https://lu.ma/entapos',
    'cleanInviteUrlCandidate peels HTML &#39; entity wrappers residual-24',
  );
  ok(
    cleanInviteUrlCandidate('&apos;https://partiful.com/e/entap&apos;') ===
      'https://partiful.com/e/entap',
    'cleanInviteUrlCandidate peels HTML &apos; entity wrappers residual-24',
  );
  ok(
    cleanInviteUrlCandidate('&#60;https://partiful.com/e/entnum&#62;') ===
      'https://partiful.com/e/entnum',
    'cleanInviteUrlCandidate peels HTML numeric &#60;/&#62; residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctcomma%2C') ===
      'https://partiful.com/e/pctcomma',
    'cleanInviteUrlCandidate peels percent-encoded comma residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctdot%2E') ===
      'https://partiful.com/e/pctdot',
    'cleanInviteUrlCandidate peels percent-encoded period residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctsemi%3B') ===
      'https://partiful.com/e/pctsemi',
    'cleanInviteUrlCandidate peels percent-encoded semicolon residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctcolon%3A') ===
      'https://partiful.com/e/pctcolon',
    'cleanInviteUrlCandidate peels percent-encoded colon residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctqmark%3F') ===
      'https://partiful.com/e/pctqmark',
    'cleanInviteUrlCandidate peels percent-encoded lone ? residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pcthash%23') ===
      'https://partiful.com/e/pcthash',
    'cleanInviteUrlCandidate peels percent-encoded lone # residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctnbsp%C2%A0') ===
      'https://partiful.com/e/pctnbsp',
    'cleanInviteUrlCandidate peels percent-encoded NBSP residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctideo%E3%80%80') ===
      'https://partiful.com/e/pctideo',
    'cleanInviteUrlCandidate peels percent-encoded ideographic space residual-24',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctr24mix%2C%2E%3B') ===
      'https://partiful.com/e/pctr24mix',
    'cleanInviteUrlCandidate peels stacked residual-24 percent-encoded sticky',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctr24q%2C?ref=1') ===
      'https://partiful.com/e/pctr24q?ref=1',
    'cleanInviteUrlCandidate peels residual-24 path sticky before real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?ref=1%2C2') ===
      'https://partiful.com/e/keep?ref=1%2C2',
    'cleanInviteUrlCandidate keeps residual-24 encoding inside real query',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctrbrack%5D') ===
      'https://partiful.com/e/pctrbrack',
    'cleanInviteUrlCandidate residual-23 bracket still peels after residual-24',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: &lt;https://partiful.com/e/entmark&gt;\n',
      'partiful',
    ) === 'https://partiful.com/e/entmark',
    'pickInviteUrlFromOutboxText peels HTML entities after marker residual-24',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/pctcommark%2C\n',
      'luma',
    ) === 'https://lu.ma/pctcommark',
    'pickInviteUrlFromOutboxText peels percent-encoded comma after marker residual-24',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/pctbarecomma%2C tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/pctbarecomma',
    'pickInviteUrlFromOutboxText peels bare percent-encoded comma residual-24',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste &quot;https://partiful.com/e/entbare&quot; next\n',
      'partiful',
    ) === 'https://partiful.com/e/entbare',
    'pickInviteUrlFromOutboxText peels bare HTML entity-wrapped URL residual-24',
  );
  const entDrop = parseHumanInviteUrlLines(
    '&lt;https://partiful.com/e/drop-ent&gt;\n',
  );
  ok(
    entDrop.some((p) => p.url === 'https://partiful.com/e/drop-ent'),
    'parseHumanInviteUrlLines cleans HTML entity-wrapped bare URL residual-24',
  );
  const pctcommaDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctcomma%2C\n',
  );
  ok(
    pctcommaDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctcomma'),
    'parseHumanInviteUrlLines cleans percent-encoded comma bare URL residual-24',
  );
  const entNumDrop = parseHumanInviteUrlLines(
    '&#60;https://partiful.com/e/drop-entnum&#62;\n',
  );
  ok(
    entNumDrop.some((p) => p.url === 'https://partiful.com/e/drop-entnum'),
    'parseHumanInviteUrlLines cleans numeric HTML entity-wrapped URL residual-24',
  );
  // Residual peel-25: Word/Gmail named + numeric HTML entities left after residual-24
  // (smart quotes/dashes/nbsp/hellip — residual-1 peels only `;` and leaves sticky name)
  ok(
    cleanInviteUrlCandidate('&ldquo;https://partiful.com/e/ldq&rdquo;') ===
      'https://partiful.com/e/ldq',
    'cleanInviteUrlCandidate peels HTML &ldquo;/&rdquo; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('&lsquo;https://lu.ma/lsq&rsquo;') === 'https://lu.ma/lsq',
    'cleanInviteUrlCandidate peels HTML &lsquo;/&rsquo; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('&laquo;https://partiful.com/e/laq&raquo;') ===
      'https://partiful.com/e/laq',
    'cleanInviteUrlCandidate peels HTML &laquo;/&raquo; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/mdash&mdash;') ===
      'https://partiful.com/e/mdash',
    'cleanInviteUrlCandidate peels trailing &mdash; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/ndash&ndash;') === 'https://lu.ma/ndash',
    'cleanInviteUrlCandidate peels trailing &ndash; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/hellip&hellip;') ===
      'https://partiful.com/e/hellip',
    'cleanInviteUrlCandidate peels trailing &hellip; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('&nbsp;https://partiful.com/e/nbsp&nbsp;') ===
      'https://partiful.com/e/nbsp',
    'cleanInviteUrlCandidate peels &nbsp; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/amp&amp;') ===
      'https://partiful.com/e/amp',
    'cleanInviteUrlCandidate peels trailing &amp; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('&#8220;https://partiful.com/e/nld&#8221;') ===
      'https://partiful.com/e/nld',
    'cleanInviteUrlCandidate peels decimal &#8220;/&#8221; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('&#x201c;https://lu.ma/xld&#x201d;') === 'https://lu.ma/xld',
    'cleanInviteUrlCandidate peels hex &#x201c;/&#x201d; residual-25',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/nmdash&#8212;') ===
      'https://partiful.com/e/nmdash',
    'cleanInviteUrlCandidate peels decimal &#8212; mdash residual-25',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/xmdash&#x2014;') ===
      'https://partiful.com/e/xmdash',
    'cleanInviteUrlCandidate peels hex &#x2014; mdash residual-25',
  );
  ok(
    cleanInviteUrlCandidate('&ldquo;https://partiful.com/e/stack&rdquo;&nbsp;') ===
      'https://partiful.com/e/stack',
    'cleanInviteUrlCandidate peels stacked residual-25 named entities',
  );
  ok(
    cleanInviteUrlCandidate('&lt;https://partiful.com/e/r24still&gt;') ===
      'https://partiful.com/e/r24still',
    'cleanInviteUrlCandidate residual-24 &lt;/&gt; still peels after residual-25',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: &ldquo;https://partiful.com/e/ldqmark&rdquo;\n',
      'partiful',
    ) === 'https://partiful.com/e/ldqmark',
    'pickInviteUrlFromOutboxText peels &ldquo; after marker residual-25',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://lu.ma/mdashmark&mdash;\n',
      'luma',
    ) === 'https://lu.ma/mdashmark',
    'pickInviteUrlFromOutboxText peels &mdash; after marker residual-25',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/baremdash&mdash; tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/baremdash',
    'pickInviteUrlFromOutboxText peels bare trailing &mdash; residual-25',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste &nbsp;https://partiful.com/e/barenbsp&nbsp; next\n',
      'partiful',
    ) === 'https://partiful.com/e/barenbsp',
    'pickInviteUrlFromOutboxText peels bare &nbsp;-wrapped URL residual-25',
  );
  const ldqDrop = parseHumanInviteUrlLines(
    '&ldquo;https://partiful.com/e/drop-ldq&rdquo;\n',
  );
  ok(
    ldqDrop.some((p) => p.url === 'https://partiful.com/e/drop-ldq'),
    'parseHumanInviteUrlLines cleans &ldquo;-wrapped bare URL residual-25',
  );
  const mdashDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-mdash&mdash;\n',
  );
  ok(
    mdashDrop.some((p) => p.url === 'https://partiful.com/e/drop-mdash'),
    'parseHumanInviteUrlLines cleans trailing &mdash; bare URL residual-25',
  );
  const nmdashDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-nmdash&#8212;\n',
  );
  ok(
    nmdashDrop.some((p) => p.url === 'https://partiful.com/e/drop-nmdash'),
    'parseHumanInviteUrlLines cleans decimal mdash entity bare URL residual-25',
  );
  // Residual peel-26: Word residual named + double-encoded + percent-encoded entity sticky
  // left after residual-25 (low-9/single-guillemet/spacing/prime; &amp;lt; / %26mdash%3B)
  ok(
    cleanInviteUrlCandidate('&bdquo;https://partiful.com/e/bdq&ldquo;') ===
      'https://partiful.com/e/bdq',
    'cleanInviteUrlCandidate peels HTML &bdquo; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&sbquo;https://lu.ma/sbq&rsquo;') === 'https://lu.ma/sbq',
    'cleanInviteUrlCandidate peels HTML &sbquo; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&lsaquo;https://partiful.com/e/lsa&rsaquo;') ===
      'https://partiful.com/e/lsa',
    'cleanInviteUrlCandidate peels HTML &lsaquo;/&rsaquo; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/thin&thinsp;') ===
      'https://partiful.com/e/thin',
    'cleanInviteUrlCandidate peels trailing &thinsp; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/ensp&ensp;') === 'https://lu.ma/ensp',
    'cleanInviteUrlCandidate peels trailing &ensp; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/emsp&emsp;') ===
      'https://partiful.com/e/emsp',
    'cleanInviteUrlCandidate peels trailing &emsp; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/shy&shy;') ===
      'https://partiful.com/e/shy',
    'cleanInviteUrlCandidate peels trailing &shy; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/prime&prime;') ===
      'https://partiful.com/e/prime',
    'cleanInviteUrlCandidate peels trailing &prime; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/Prime&Prime;') === 'https://lu.ma/Prime',
    'cleanInviteUrlCandidate peels trailing &Prime; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/middot&middot;') ===
      'https://partiful.com/e/middot',
    'cleanInviteUrlCandidate peels trailing &middot; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&#8222;https://partiful.com/e/n8222&#8220;') ===
      'https://partiful.com/e/n8222',
    'cleanInviteUrlCandidate peels decimal &#8222; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&#8218;https://lu.ma/n8218&#8217;') === 'https://lu.ma/n8218',
    'cleanInviteUrlCandidate peels decimal &#8218; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&#8249;https://partiful.com/e/n8249&#8250;') ===
      'https://partiful.com/e/n8249',
    'cleanInviteUrlCandidate peels decimal &#8249;/&#8250; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&amp;lt;https://partiful.com/e/dbl&amp;gt;') ===
      'https://partiful.com/e/dbl',
    'cleanInviteUrlCandidate peels double-encoded &amp;lt;/&amp;gt; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&amp;quot;https://lu.ma/dq&amp;quot;') === 'https://lu.ma/dq',
    'cleanInviteUrlCandidate peels double-encoded &amp;quot; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&amp;ldquo;https://partiful.com/e/dldq&amp;rdquo;') ===
      'https://partiful.com/e/dldq',
    'cleanInviteUrlCandidate peels double-encoded &amp;ldquo; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&amp;#8220;https://partiful.com/e/dnum&amp;#8221;') ===
      'https://partiful.com/e/dnum',
    'cleanInviteUrlCandidate peels double-encoded &amp;#8220; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctmdash%26mdash%3B') ===
      'https://partiful.com/e/pctmdash',
    'cleanInviteUrlCandidate peels percent-encoded &mdash; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/pctldq%26ldquo%3B') === 'https://lu.ma/pctldq',
    'cleanInviteUrlCandidate peels percent-encoded &ldquo; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctlt%26lt%3B') ===
      'https://partiful.com/e/pctlt',
    'cleanInviteUrlCandidate peels percent-encoded &lt; residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctq%26mdash%3B?ref=1') ===
      'https://partiful.com/e/pctq?ref=1',
    'cleanInviteUrlCandidate peels pct entity before query residual-26',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?a=%26mdash%3B&b=1') ===
      'https://partiful.com/e/keep?a=%26mdash%3B&b=1',
    'cleanInviteUrlCandidate keeps mid-query pct entity residual-26',
  );
  ok(
    cleanInviteUrlCandidate('&ldquo;https://partiful.com/e/r25still&rdquo;') ===
      'https://partiful.com/e/r25still',
    'cleanInviteUrlCandidate residual-25 &ldquo; still peels after residual-26',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: &bdquo;https://partiful.com/e/bdqmark&ldquo;\n',
      'partiful',
    ) === 'https://partiful.com/e/bdqmark',
    'pickInviteUrlFromOutboxText peels &bdquo; after marker residual-26',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: &amp;lt;https://partiful.com/e/dblmark&amp;gt;\n',
      'partiful',
    ) === 'https://partiful.com/e/dblmark',
    'pickInviteUrlFromOutboxText peels double-encoded after marker residual-26',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/barethin&thinsp; tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/barethin',
    'pickInviteUrlFromOutboxText peels bare trailing &thinsp; residual-26',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste https://lu.ma/barepct%26mdash%3B next\n',
      'luma',
    ) === 'https://lu.ma/barepct',
    'pickInviteUrlFromOutboxText peels bare pct entity residual-26',
  );
  const bdqDrop = parseHumanInviteUrlLines(
    '&bdquo;https://partiful.com/e/drop-bdq&ldquo;\n',
  );
  ok(
    bdqDrop.some((p) => p.url === 'https://partiful.com/e/drop-bdq'),
    'parseHumanInviteUrlLines cleans &bdquo;-wrapped bare URL residual-26',
  );
  const dblDrop = parseHumanInviteUrlLines(
    '&amp;lt;https://partiful.com/e/drop-dbl&amp;gt;\n',
  );
  ok(
    dblDrop.some((p) => p.url === 'https://partiful.com/e/drop-dbl'),
    'parseHumanInviteUrlLines cleans double-encoded bare URL residual-26',
  );
  const pctEntDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctent%26mdash%3B\n',
  );
  ok(
    pctEntDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctent'),
    'parseHumanInviteUrlLines cleans percent-encoded entity bare URL residual-26',
  );
  // Residual-27: incomplete entity (no ;) + orphan NAME; + HTML5 punct + pct invisibles
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/incmdash&mdash') ===
      'https://partiful.com/e/incmdash',
    'cleanInviteUrlCandidate peels incomplete &mdash residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/incquot&quot') ===
      'https://partiful.com/e/incquot',
    'cleanInviteUrlCandidate peels incomplete &quot residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/incamp&amp') === 'https://lu.ma/incamp',
    'cleanInviteUrlCandidate peels incomplete &amp residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/incnum&#8220') ===
      'https://partiful.com/e/incnum',
    'cleanInviteUrlCandidate peels incomplete &#8220 residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/inchex&#x201c') ===
      'https://partiful.com/e/inchex',
    'cleanInviteUrlCandidate peels incomplete &#x201c residual-27',
  );
  ok(
    cleanInviteUrlCandidate('&amp;amp;lt;https://partiful.com/e/orphan&amp;amp;gt;') ===
      'https://partiful.com/e/orphan',
    'cleanInviteUrlCandidate peels triple-amp orphan lt;/gt; residual-27',
  );
  ok(
    cleanInviteUrlCandidate('lt;https://partiful.com/e/orphanlead') ===
      'https://partiful.com/e/orphanlead',
    'cleanInviteUrlCandidate peels bare orphan lt; lead residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/orphantrailgt;') ===
      'https://partiful.com/e/orphantrail',
    'cleanInviteUrlCandidate peels bare orphan gt; trail residual-27',
  );
  ok(
    cleanInviteUrlCandidate('&lpar;https://partiful.com/e/lpar&rpar;') ===
      'https://partiful.com/e/lpar',
    'cleanInviteUrlCandidate peels HTML5 &lpar;/&rpar; residual-27',
  );
  ok(
    cleanInviteUrlCandidate('&lsqb;https://lu.ma/lsqb&rsqb;') === 'https://lu.ma/lsqb',
    'cleanInviteUrlCandidate peels HTML5 &lsqb;/&rsqb; residual-27',
  );
  ok(
    cleanInviteUrlCandidate('&lcub;https://partiful.com/e/lcub&rcub;') ===
      'https://partiful.com/e/lcub',
    'cleanInviteUrlCandidate peels HTML5 &lcub;/&rcub; residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/ast&ast;') ===
      'https://partiful.com/e/ast',
    'cleanInviteUrlCandidate peels HTML5 &ast; residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctzwsp%E2%80%8B') ===
      'https://partiful.com/e/pctzwsp',
    'cleanInviteUrlCandidate peels pct ZWSP residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://lu.ma/pctbom%EF%BB%BF') === 'https://lu.ma/pctbom',
    'cleanInviteUrlCandidate peels pct BOM residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/pctlrm%E2%80%8E') ===
      'https://partiful.com/e/pctlrm',
    'cleanInviteUrlCandidate peels pct LRM residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/incq&mdash?ref=1') ===
      'https://partiful.com/e/incq?ref=1',
    'cleanInviteUrlCandidate peels incomplete entity before query residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/keep?a=&mdash&b=1') ===
      'https://partiful.com/e/keep?a=&mdash&b=1',
    'cleanInviteUrlCandidate keeps mid-query incomplete entity residual-27',
  );
  ok(
    cleanInviteUrlCandidate('&ldquo;https://partiful.com/e/r25still27&rdquo;') ===
      'https://partiful.com/e/r25still27',
    'cleanInviteUrlCandidate residual-25 still peels after residual-27',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r26still%26mdash%3B') ===
      'https://partiful.com/e/r26still',
    'cleanInviteUrlCandidate residual-26 pct entity still peels after residual-27',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/markinc&mdash\n',
      'partiful',
    ) === 'https://partiful.com/e/markinc',
    'pickInviteUrlFromOutboxText peels incomplete &mdash residual-27',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: &amp;amp;lt;https://partiful.com/e/markorphan&amp;amp;gt;\n',
      'partiful',
    ) === 'https://partiful.com/e/markorphan',
    'pickInviteUrlFromOutboxText peels triple-amp orphan residual-27',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/barezwsp%E2%80%8B tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/barezwsp',
    'pickInviteUrlFromOutboxText peels bare pct ZWSP residual-27',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'paste &lpar;https://lu.ma/barelpar&rpar; next\n',
      'luma',
    ) === 'https://lu.ma/barelpar',
    'pickInviteUrlFromOutboxText peels bare HTML5 lpar residual-27',
  );
  const incDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-inc&mdash\n',
  );
  ok(
    incDrop.some((p) => p.url === 'https://partiful.com/e/drop-inc'),
    'parseHumanInviteUrlLines cleans incomplete entity bare URL residual-27',
  );
  const orphanDrop = parseHumanInviteUrlLines(
    '&amp;amp;lt;https://partiful.com/e/drop-orphan&amp;amp;gt;\n',
  );
  ok(
    orphanDrop.some((p) => p.url === 'https://partiful.com/e/drop-orphan'),
    'parseHumanInviteUrlLines cleans triple-amp orphan bare URL residual-27',
  );
  const zwspDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-zwsp%E2%80%8B\n',
  );
  ok(
    zwspDrop.some((p) => p.url === 'https://partiful.com/e/drop-zwsp'),
    'parseHumanInviteUrlLines cleans pct ZWSP bare URL residual-27',
  );
  // Residual-28: HTML5 punct + incomplete double-amp + pct incomplete/dbl + lead-glued
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28num&num;') ===
      'https://partiful.com/e/r28num',
    'cleanInviteUrlCandidate peels HTML5 &num; residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28sol&sol;') ===
      'https://partiful.com/e/r28sol',
    'cleanInviteUrlCandidate peels HTML5 &sol; residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28nl&NewLine;') ===
      'https://partiful.com/e/r28nl',
    'cleanInviteUrlCandidate peels HTML5 &NewLine; residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28dblinc&amp;lt') ===
      'https://partiful.com/e/r28dblinc',
    'cleanInviteUrlCandidate peels incomplete double-amp &amp;lt residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28dblmd&amp;mdash') ===
      'https://partiful.com/e/r28dblmd',
    'cleanInviteUrlCandidate peels incomplete double-amp &amp;mdash residual-28',
  );
  ok(
    cleanInviteUrlCandidate('&amp;lthttps://partiful.com/e/r28leadglue') ===
      'https://partiful.com/e/r28leadglue',
    'cleanInviteUrlCandidate peels lead-glued incomplete double-amp residual-28',
  );
  ok(
    cleanInviteUrlCandidate('&amp;mdashhttps://partiful.com/e/r28leadmd') ===
      'https://partiful.com/e/r28leadmd',
    'cleanInviteUrlCandidate peels lead-glued &amp;mdash residual-28',
  );
  ok(
    cleanInviteUrlCandidate('&mdashhttps://partiful.com/e/r28bareglue') ===
      'https://partiful.com/e/r28bareglue',
    'cleanInviteUrlCandidate peels lead-glued bare incomplete residual-28',
  );
  ok(
    cleanInviteUrlCandidate('&lthttps://lu.ma/r28barelt') === 'https://lu.ma/r28barelt',
    'cleanInviteUrlCandidate peels lead-glued bare &lt residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28pctinc%26mdash') ===
      'https://partiful.com/e/r28pctinc',
    'cleanInviteUrlCandidate peels pct incomplete entity residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28pctdbl%26amp%3Blt') ===
      'https://partiful.com/e/r28pctdbl',
    'cleanInviteUrlCandidate peels pct incomplete double-amp residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28pctdblc%26amp%3Blt%3B') ===
      'https://partiful.com/e/r28pctdblc',
    'cleanInviteUrlCandidate peels pct complete double-amp residual-28',
  );
  ok(
    cleanInviteUrlCandidate('&amp;lt;https://partiful.com/e/r28stillcomplete') ===
      'https://partiful.com/e/r28stillcomplete',
    'cleanInviteUrlCandidate complete double-amp still peels residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r27still28&mdash') ===
      'https://partiful.com/e/r27still28',
    'cleanInviteUrlCandidate residual-27 incomplete still peels after residual-28',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28keep?a=&amp;lt&b=1') ===
      'https://partiful.com/e/r28keep?a=&amp;lt&b=1',
    'cleanInviteUrlCandidate keeps mid-query incomplete double-amp residual-28',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: &amp;lthttps://partiful.com/e/markglue\n',
      'partiful',
    ) === 'https://partiful.com/e/markglue',
    'pickInviteUrlFromOutboxText peels lead-glued double-amp residual-28',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/markdbl&amp;lt\n',
      'partiful',
    ) === 'https://partiful.com/e/markdbl',
    'pickInviteUrlFromOutboxText peels trail incomplete double-amp residual-28',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/barepct28%26mdash tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/barepct28',
    'pickInviteUrlFromOutboxText peels bare pct incomplete residual-28',
  );
  const glueDrop = parseHumanInviteUrlLines(
    '&amp;lthttps://partiful.com/e/drop-glue\n',
  );
  ok(
    glueDrop.some((p) => p.url === 'https://partiful.com/e/drop-glue'),
    'parseHumanInviteUrlLines cleans lead-glued double-amp bare URL residual-28',
  );
  const dblIncDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-dblinc&amp;mdash\n',
  );
  ok(
    dblIncDrop.some((p) => p.url === 'https://partiful.com/e/drop-dblinc'),
    'parseHumanInviteUrlLines cleans trail incomplete double-amp bare URL residual-28',
  );
  const pctIncDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctinc%26num\n',
  );
  ok(
    pctIncDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctinc'),
    'parseHumanInviteUrlLines cleans pct incomplete entity bare URL residual-28',
  );
  // Residual-29: incomplete triple-amp + pct multi-amp + lead-glued triple
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r29tri&amp;amp;lt') ===
      'https://partiful.com/e/r29tri',
    'cleanInviteUrlCandidate peels incomplete triple-amp &amp;amp;lt residual-29',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r29trimd&amp;amp;mdash') ===
      'https://partiful.com/e/r29trimd',
    'cleanInviteUrlCandidate peels incomplete triple-amp &amp;amp;mdash residual-29',
  );
  ok(
    cleanInviteUrlCandidate('&amp;amp;lthttps://partiful.com/e/r29leadtri') ===
      'https://partiful.com/e/r29leadtri',
    'cleanInviteUrlCandidate peels lead-glued incomplete triple-amp residual-29',
  );
  ok(
    cleanInviteUrlCandidate('&amp;amp;mdashhttps://partiful.com/e/r29leadmd') ===
      'https://partiful.com/e/r29leadmd',
    'cleanInviteUrlCandidate peels lead-glued &amp;amp;mdash residual-29',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r29pcttri%26amp%3Bamp%3Blt') ===
      'https://partiful.com/e/r29pcttri',
    'cleanInviteUrlCandidate peels pct incomplete triple-amp residual-29',
  );
  ok(
    cleanInviteUrlCandidate(
      'https://partiful.com/e/r29pcttric%26amp%3Bamp%3Blt%3B',
    ) === 'https://partiful.com/e/r29pcttric',
    'cleanInviteUrlCandidate peels pct complete triple-amp residual-29',
  );
  ok(
    cleanInviteUrlCandidate('&amp;amp;lt;https://partiful.com/e/r29stillcomplete') ===
      'https://partiful.com/e/r29stillcomplete',
    'cleanInviteUrlCandidate complete triple-amp still peels residual-29',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r28still29&amp;lt') ===
      'https://partiful.com/e/r28still29',
    'cleanInviteUrlCandidate residual-28 incomplete double still peels after residual-29',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r29keep?a=&amp;amp;lt&b=1') ===
      'https://partiful.com/e/r29keep?a=&amp;amp;lt&b=1',
    'cleanInviteUrlCandidate keeps mid-query incomplete triple-amp residual-29',
  );
  // Residual-32: fully pct-encoded # (%23) in numeric entities + num-amp/%26 mixed
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32hex%26%23x26%3Blt%3B') ===
      'https://partiful.com/e/r32hex',
    'cleanInviteUrlCandidate peels fully pct-encoded &#x26;lt; residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32dec%26%2338%3Blt%3B') ===
      'https://partiful.com/e/r32dec',
    'cleanInviteUrlCandidate peels fully pct-encoded &#38;lt; residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32hexinc%26%23x26%3Blt') ===
      'https://partiful.com/e/r32hexinc',
    'cleanInviteUrlCandidate peels incomplete fully pct-encoded numeric residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32layer%26%23x26%3Bamp%3Blt%3B') ===
      'https://partiful.com/e/r32layer',
    'cleanInviteUrlCandidate peels pct-encoded numeric amp layer + name residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32numpct&#x26;%26lt;') ===
      'https://partiful.com/e/r32numpct',
    'cleanInviteUrlCandidate peels HTML num-amp then bare %26NAME residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32mix&amp;%26%23x26%3Blt;') ===
      'https://partiful.com/e/r32mix',
    'cleanInviteUrlCandidate peels HTML amp + fully pct-encoded numeric residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32pctmix%26amp%3B%26%23x26%3Blt%3B') ===
      'https://partiful.com/e/r32pctmix',
    'cleanInviteUrlCandidate peels pct amp + fully pct-encoded numeric residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32q%26%23x26%3Blt%3B?ref=1') ===
      'https://partiful.com/e/r32q?ref=1',
    'cleanInviteUrlCandidate peels trail fully pct-encoded numeric before query residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r32keep?a=%26%23x26%3Blt%3B&b=1') ===
      'https://partiful.com/e/r32keep?a=%26%23x26%3Blt%3B&b=1',
    'cleanInviteUrlCandidate keeps mid-query fully pct-encoded numeric residual-32',
  );
  ok(
    cleanInviteUrlCandidate('https://partiful.com/e/r29still32&amp;amp;lt') ===
      'https://partiful.com/e/r29still32',
    'cleanInviteUrlCandidate residual-29 incomplete triple still peels after residual-32',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/mark32%26%23x26%3Blt%3B\n',
      'partiful',
    ) === 'https://partiful.com/e/mark32',
    'pickInviteUrlFromOutboxText peels trail fully pct-encoded numeric residual-32',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/barepct32%26%2338%3Blt tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/barepct32',
    'pickInviteUrlFromOutboxText peels bare fully pct-encoded numeric residual-32',
  );
  const hashEncDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-hashenc%26%23x26%3Blt%3B\n',
  );
  ok(
    hashEncDrop.some((p) => p.url === 'https://partiful.com/e/drop-hashenc'),
    'parseHumanInviteUrlLines cleans fully pct-encoded numeric bare URL residual-32',
  );
  const numPctDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-numpct&#x26;%26lt;\n',
  );
  ok(
    numPctDrop.some((p) => p.url === 'https://partiful.com/e/drop-numpct'),
    'parseHumanInviteUrlLines cleans HTML num-amp + %26NAME bare URL residual-32',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: &amp;amp;lthttps://partiful.com/e/marktri\n',
      'partiful',
    ) === 'https://partiful.com/e/marktri',
    'pickInviteUrlFromOutboxText peels lead-glued triple-amp residual-29',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'Invite URL: https://partiful.com/e/marktri2&amp;amp;lt\n',
      'partiful',
    ) === 'https://partiful.com/e/marktri2',
    'pickInviteUrlFromOutboxText peels trail incomplete triple-amp residual-29',
  );
  ok(
    pickInviteUrlFromOutboxText(
      'see https://partiful.com/e/barepct29%26amp%3Bamp%3Blt tonight\n',
      'partiful',
    ) === 'https://partiful.com/e/barepct29',
    'pickInviteUrlFromOutboxText peels bare pct triple residual-29',
  );
  const triGlueDrop = parseHumanInviteUrlLines(
    '&amp;amp;lthttps://partiful.com/e/drop-tritri\n',
  );
  ok(
    triGlueDrop.some((p) => p.url === 'https://partiful.com/e/drop-tritri'),
    'parseHumanInviteUrlLines cleans lead-glued triple-amp bare URL residual-29',
  );
  const triIncDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-triinc&amp;amp;mdash\n',
  );
  ok(
    triIncDrop.some((p) => p.url === 'https://partiful.com/e/drop-triinc'),
    'parseHumanInviteUrlLines cleans trail incomplete triple-amp bare URL residual-29',
  );
  const pctTriDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pcttri%26amp%3Bamp%3Blt\n',
  );
  ok(
    pctTriDrop.some((p) => p.url === 'https://partiful.com/e/drop-pcttri'),
    'parseHumanInviteUrlLines cleans pct incomplete triple-amp bare URL residual-29',
  );
  const pctmathTrailDrop = parseHumanInviteUrlLines(
    'https://partiful.com/e/drop-pctmath%E2%9F%A7\n',
  );
  ok(
    pctmathTrailDrop.some((p) => p.url === 'https://partiful.com/e/drop-pctmath'),
    'parseHumanInviteUrlLines cleans trailing percent-encoded math white bare URL residual-23',
  );
  const wrapParsed = parseHumanInviteUrlLines(
    '[https://partiful.com/e/drop-wrap]\nurl=https://lu.ma/kv-wrap]\n',
  );
  ok(
    wrapParsed.some((p) => p.url === 'https://partiful.com/e/drop-wrap'),
    'parseHumanInviteUrlLines cleans bare bracket URL',
  );
  ok(
    wrapParsed.some((p) => p.platform === 'luma' && p.url === 'https://lu.ma/kv-wrap'),
    'parseHumanInviteUrlLines cleans url= token trailing bracket',
  );
  const oxDir = fs.mkdtempSync(path.join('/tmp', 'dg-invite-ox-'));
  const oxId = 'pf_ox1';
  const oxTxt = path.join(oxDir, 'partiful-' + oxId + '.txt');
  fs.writeFileSync(
    oxTxt,
    '=== PARTIFUL PASTE ===\nTitle: Salon\n--- RECORDED URL ---\nhttps://partiful.com/e/ox-live\n',
    'utf8',
  );
  const oxStore = {
    activeEvent: { stage: 'plan' },
    platforms: {
      partiful: [{ id: oxId, title: 'Salon', status: 'draft' }],
      luma: [],
    },
  };
  const oxAbs = absorbInviteUrlsFromOutbox(oxStore, { outboxDir: oxDir });
  ok(oxAbs.applied.length === 1 && oxAbs.applied[0].url === 'https://partiful.com/e/ox-live', 'outbox absorb stamps URL');
  ok(oxStore.platforms.partiful[0].status === 'published_url', 'outbox absorb published_url');
  try {
    fs.rmSync(oxDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

// Lifecycle stage advance intent (pure) + fail-closed gates
const confirmedSfVenue = { name: 'Mission loft', capacity: 24, confirmed: true, confirmationEvidence: 'Host confirmed by email' };
// Plan+ transitions require a positive integer seat target (honest capacity gate).
const gateSeats = 12;
const gateAudience = { audience: 'SF builders', outcome: 'second meetings', seats: gateSeats };
ok(canAdvanceStage('resourcing', 'planning', { venue: confirmedSfVenue, ...gateAudience }, {}).ok === true, 'gate accepts lifecycle stage labels');
ok(canAdvanceStage('planning', 'RSVPs', { venue: confirmedSfVenue, ...gateAudience, dateWindows: ['2099-01-01T18:00:00-08:00'], agenda: 'dinner agenda', inviteDraft: 'invite draft', guestMix: defaultGuestMix({ seats: gateSeats }) }, {}).ok === true, 'gate accepts RSVP plural stage label');
ok(canAdvanceStage('plan', 'rsvp', { venue: confirmedSfVenue, ...gateAudience, dateWindows: ['2099-01-01T18:00:00-08:00'], agenda: 'a', inviteDraft: 'i' }, {}).reason === 'need_guest_mix', 'gate requires guest mix before RSVP');
ok(canAdvanceStage('plan', 'rsvp', { venue: { name: 'Mission loft' }, ...gateAudience, dateWindows: ['2099-01-01T18:00:00-08:00'], agenda: 'a', inviteDraft: 'i', guestMix: defaultGuestMix({ seats: gateSeats }) }, {}).reason === 'need_confirmed_venue', 'gate rechecks venue confirmation after legacy-invalid plan');
ok(parseStageAdvanceIntent('advance to plan') === 'plan', 'intent advance to plan');
ok(parseStageAdvanceIntent('advance stage: plan') === 'plan', 'intent advance stage colon plan');
ok(parseStageAdvanceIntent('hop to rsvp') === 'rsvp', 'intent hop to rsvp');
ok(parseStageAdvanceIntent('next stage is plan') === 'plan', 'intent next stage is plan');
ok(parseStageAdvanceIntent('set lifecycle → followup') === 'followup', 'intent lifecycle arrow');
ok(parseStageAdvanceIntent('ready to resource') === 'resource', 'intent ready to resource');
ok(parseStageAdvanceIntent('open RSVPs please') === 'rsvp', 'intent open rsvp');
ok(parseStageAdvanceIntent('we have a venue ready') === 'plan', 'intent venue ready → plan');
ok(parseStageAdvanceIntent('night happened') === 'followup', 'intent night happened → followup');
ok(parseStageAdvanceIntent('time to debrief') === 'debrief', 'intent debrief');
ok(parseStageAdvanceIntent('what is your job?') === null, 'intent ignore chit-chat');
ok(parseStageAdvanceIntent('what stage are we on?') === null, 'intent ignore stage question');
ok(parseStageAdvanceIntent('what happens in debrief?') === null, 'intent ignore debrief question');
// Stage intent residual: host gerund/plural labels + into/window/begin phrases
ok(parseStageAdvanceIntent('advance to planning') === 'plan', 'intent advance to planning');
ok(parseStageAdvanceIntent('advance lifecycle to resourcing') === 'resource', 'intent advance to resourcing');
ok(parseStageAdvanceIntent('move stage to RSVPs') === 'rsvp', 'intent move stage to RSVPs');
ok(parseStageAdvanceIntent('set stage to planning') === 'plan', 'intent set stage to planning');
ok(parseStageAdvanceIntent('go to planning') === 'plan', 'intent go to planning');
ok(parseStageAdvanceIntent('move into planning') === 'plan', 'intent move into planning');
ok(parseStageAdvanceIntent('hop into rsvp') === 'rsvp', 'intent hop into rsvp');
ok(parseStageAdvanceIntent('ready for planning') === 'plan', 'intent ready for planning');
ok(parseStageAdvanceIntent('ready for rsvps') === 'rsvp', 'intent ready for rsvps');
ok(parseStageAdvanceIntent('open the RSVP window') === 'rsvp', 'intent open the RSVP window');
ok(parseStageAdvanceIntent('begin follow-up') === 'followup', 'intent begin follow-up');
ok(parseStageAdvanceIntent('time for follow-up') === 'followup', 'intent time for follow-up');
ok(parseStageAdvanceIntent('ready to run') === 'run', 'intent ready to run');
ok(parseStageAdvanceIntent('planning stage please') === 'plan', 'intent planning stage please');
ok(parseStageAdvanceIntent('resourcing stage') === 'resource', 'intent resourcing stage');
ok(parseStageAdvanceIntent('is planning stage next?') === null, 'intent ignore planning stage question');
ok(normalizeStage('planning') === 'plan', 'normalizeStage planning');
ok(normalizeStage('resourcing') === 'resource', 'normalizeStage resourcing');
ok(normalizeStage('rsvps') === 'rsvp', 'normalizeStage rsvps');
ok(normalizeStage('debriefing') === 'debrief', 'normalizeStage debriefing');
ok(canAdvanceStage('ideate', 'resource', { audience: 'SF builders', outcome: 'second meetings', seats: 12 }, {}).ok === true, 'gate ideate→resource accepts audience promise + positive seats');
ok(canAdvanceStage('ideate', 'resource', { audience: 'SF builders', outcome: '   ', seats: 12 }, {}).reason === 'need_audience_outcome_and_seats', 'gate ideate→resource rejects blank outcome');
ok(canAdvanceStage('ideate', 'resource', { audience: 'SF builders', outcome: 'second meetings', seats: -4 }, {}).ok === false, 'gate ideate→resource rejects negative seats');
ok(canAdvanceStage('ideate', 'resource', { audience: 'SF builders', outcome: 'second meetings', seats: 'many' }, {}).ok === false, 'gate ideate→resource rejects nonnumeric seats');
ok(canAdvanceStage('bogus', 'resource', { outcome: 'second meetings', seats: 12 }, {}).reason === 'unknown_stage', 'gate rejects unknown current stage');
ok(canAdvanceStage('resource', 'plan', { venue: { name: 'X' }, ...gateAudience }, {}).reason === 'need_confirmed_venue', 'gate resource→plan requires confirmation');
ok(canAdvanceStage('resource', 'plan', { venue: { name: 'Oakland loft' }, ...gateAudience }, {}).reason === 'need_sf_venue', 'gate resource→plan rejects non-SF venue');
ok(canAdvanceStage('resource', 'plan', { venue: { name: 'X', city: 'Mars' }, ...gateAudience }, {}).reason === 'need_sf_venue', 'gate resource→plan rejects unknown explicit city');
ok(canAdvanceStage('resource', 'plan', { venue: confirmedSfVenue, ...gateAudience }, {}).ok === true, 'gate resource→plan accepts confirmed SF venue evidence');
ok(canAdvanceStage('resource', 'plan', { venue: confirmedSfVenue, seats: gateSeats }, {}).reason === 'need_audience_outcome_and_seats', 'gate resource→plan rejects audience-less confirmed venue');
ok(canAdvanceStage('resource', 'rsvp', { venue: { name: 'X' }, ...gateAudience, agenda: 'a' }, {}).ok === false, 'gate skip step fail');
ok(canAdvanceStage('followup', 'debrief', { venue: confirmedSfVenue, ...gateAudience }, {}).reason === 'need_debrief_evidence', 'gate followup→debrief requires host-attested evidence');
ok(canAdvanceStage('followup', 'debrief', { venue: confirmedSfVenue, ...gateAudience, outcomes: { debriefAt: new Date().toISOString() } }, {}).ok === true, 'gate followup→debrief accepts recorded evidence');
ok(
  runStartReady(
    { dateWindows: ['2026-07-22T18:00:00Z', '2026-07-23T18:00:00Z'] },
    'starting now',
    Date.parse('2026-07-23T00:00:00Z'),
  ) === false,
  'run gate rejects past candidate while a future alternative remains',
);
ok(
  runStartReady(
    { dateWindows: ['2026-07-22T12:00:00Z', '2026-07-22T18:00:00Z'] },
    'starting now',
    Date.parse('2026-07-23T00:00:00Z'),
  ) === true,
  'run gate accepts when every scheduled start has arrived',
);
ok(hasFutureDateTime({ dateWindows: '2026-07-23T18:00:00Z' }, 0) === false, 'RSVP gate fails closed on malformed date windows');
ok(runStartReady({ dateWindows: {} }, 'starting now', Date.now()) === false, 'run gate fails closed on malformed date windows');
// runGateInviteUrl: rsvp→run needs real published invite outside MOCK
{
  const prevMock = process.env.DEMIGOD_EVENTS_BOT_MOCK;
  process.env.DEMIGOD_EVENTS_BOT_MOCK = '0';
  const aeRun = {
    id: 'ev_run_gate',
    title: 'Mission founders dinner',
    stage: 'rsvp',
    venue: confirmedSfVenue,
    seats: gateSeats,
    audience: 'SF builders',
    outcome: 'second meetings',
    inviteDraft: 'draft body',
    dateWindows: ['2026-07-17T18:00:00-07:00'],
    rsvpTally: { openedAt: '2026-07-17T12:00:00Z', invited: null },
  };
  const refuse = canAdvanceStage('rsvp', 'run', aeRun, { platforms: { partiful: [], luma: [] } });
  ok(refuse.ok === false && refuse.reason === 'need_published_invite_url', 'runGateInviteUrl: refuse without URL');
  ok(hasPublishedInviteUrl(aeRun, {}) === false, 'runGateInviteUrl: hasPublished false');
  const storePub = {
    platforms: {
      partiful: [
        {
          id: 'pf_live',
          title: 'Mission founders dinner',
          eventId: 'ev_run_gate',
          status: 'published_url',
          inviteUrl: 'https://partiful.com/e/livegate1',
          publishedUrl: 'https://partiful.com/e/livegate1',
        },
      ],
      luma: [],
    },
  };
  ok(hasPublishedInviteUrl(aeRun, storePub) === true, 'runGateInviteUrl: platform published ok');
  const wrongEvent = structuredClone(storePub);
  wrongEvent.platforms.partiful[0].eventId = 'ev_other_night';
  ok(hasPublishedInviteUrl(aeRun, wrongEvent) === false, 'runGateInviteUrl: matching title cannot override mismatched eventId');
  const early = canAdvanceStage('rsvp', 'run', { ...aeRun, dateWindows: ['2099-07-17T18:00:00-07:00'] }, storePub, 'doors are open');
  ok(early.reason === 'need_reached_start_and_host_evidence', 'run gate refuses before scheduled start');
  const unresolved = canAdvanceStage('rsvp', 'run', { ...aeRun, dateWindows: ['2026-07-17T18:00:00-07:00', '2099-07-17T18:00:00-07:00'] }, storePub, 'doors are open');
  ok(unresolved.nextAction?.tool === 'record_schedule' && unresolved.nextAction.eventId === aeRun.id, 'run gate surfaces record_schedule for unresolved alternatives');
  const noHostEvidence = canAdvanceStage('rsvp', 'run', aeRun, storePub, 'advance to run');
  ok(noHostEvidence.reason === 'need_reached_start_and_host_evidence', 'run gate requires explicit host evidence');
  const dateOnly = canAdvanceStage('rsvp', 'run', { ...aeRun, dateWindows: ['2026-07-17'] }, storePub, 'doors are open');
  ok(dateOnly.reason === 'need_reached_start_and_host_evidence', 'run gate rejects date-only schedule');
  const impossibleDate = canAdvanceStage('rsvp', 'run', { ...aeRun, dateWindows: ['2026-02-30T18:00:00-08:00'] }, storePub, 'doors are open');
  ok(impossibleDate.reason === 'need_reached_start_and_host_evidence', 'run gate rejects impossible calendar date');
  const allow = canAdvanceStage('rsvp', 'run', aeRun, storePub, 'doors are open');
  ok(allow.ok === true, 'run gate allows reached start plus host evidence');
  // MOCK still open for selftest walks (no URL required)
  process.env.DEMIGOD_EVENTS_BOT_MOCK = '1';
  ok(
    canAdvanceStage('rsvp', 'run', aeRun, { platforms: { partiful: [], luma: [] } }).ok === true,
    'runGateInviteUrl: MOCK allows structure-only',
  );
  if (prevMock === undefined) delete process.env.DEMIGOD_EVENTS_BOT_MOCK;
  else process.env.DEMIGOD_EVENTS_BOT_MOCK = prevMock;
}

// Offer match pure: SF hard filter + capacity + kind ranking (no emails in rows)
const offerFixture = {
  activeEvent: {
    id: 'evt_selftest',
    title: 'Indoor salon dinner',
    seats: 12,
    outcome: 'second meetings',
    needs: 'indoor loft dinner salon',
    notes: 'quiet indoor room',
    stage: 'resource',
  },
  offers: {
    venue: [
      {
        id: 'off_oak',
        name: 'East warehouse',
        city: 'Oakland',
        capacity: 40,
        offer: 'big space',
        status: 'new',
      },
      {
        id: 'off_small',
        name: 'Tiny closet',
        city: 'San Francisco',
        capacity: 4,
        offer: 'indoor room',
        status: 'new',
      },
      {
        id: 'off_soma',
        name: 'SoMa loft host',
        email: 'host@somaloft.co',
        city: 'SoMa',
        capacity: 16,
        offer: 'quiet indoor loft for salon dinner',
        status: 'new',
      },
      {
        id: 'off_rejected',
        name: 'Rejected SoMa loft',
        email: 'host@rejectedloft.co',
        city: 'SoMa',
        capacity: 40,
        offer: 'quiet indoor loft for salon dinner',
        status: 'rejected',
      },
    ],
    sponsor: [
      {
        id: 'sp_tab',
        name: 'Cafe Tab',
        email: 'sponsor@localcafe.co',
        org: 'Local Café',
        city: 'San Francisco',
        offer: 'dinner tab sponsor wine',
        status: 'new',
      },
      {
        id: 'sp_money',
        name: 'Cash only',
        city: 'SF',
        offer: 'cash',
        money: true,
        status: 'new',
      },
    ],
    volunteer: [
      {
        id: 'vol_door',
        name: 'Alex',
        email: 'alex@volunteers.co',
        city: 'Mission',
        offer: 'door check-in and setup',
        status: 'new',
      },
    ],
  },
};
ok(offerIsSf(offerFixture.offers.venue[0]) === false, 'offerIsSf Oakland false');
ok(offerIsSf(offerFixture.offers.venue[2]) === true, 'offerIsSf SoMa true');
ok(isRealOutreachEmail('not,a-person@somaloft.co') === false, 'outreach rejects malformed local part');
ok(isRealOutreachEmail('unsubscribe@somaloft.co') === false, 'outreach rejects unsubscribe mailbox');
// SSF city must not rank as SF venue even with huge capacity
const ssfRow = {
  id: 'off_ssf',
  name: 'Peninsula loft',
  city: 'South San Francisco',
  capacity: 200,
  offer: 'huge indoor loft',
  status: 'new',
};
ok(offerIsSf(ssfRow) === false, 'offerIsSf SSF false');
ok(isSfLocation('Venue in San Mateo County') === false, 'SF geo rejects neighboring county');
ok(isSfLocation('near SF county line') === true, 'SF geo keeps bare SF county-line wording');
ok(isSfLocation('Mission venue near SF county line') === true, 'SF geo keeps SF county-line wording');
const pureMatch = matchOffersToEvent({
  ...offerFixture,
  offers: {
    ...offerFixture.offers,
    venue: [...offerFixture.offers.venue, ssfRow],
    sponsor: [
      ...offerFixture.offers.sponsor,
      { id: 'sp_url_only', name: 'URL only', city: 'SF', offer: 'large dinner tab sponsor', url: 'https://sponsor.co' },
    ],
  },
});
ok(!pureMatch.venues.some((v) => v.id === 'off_oak'), 'match excludes Oakland venue');
ok(!pureMatch.venues.some((v) => v.id === 'off_ssf'), 'match excludes SSF venue');
ok(!pureMatch.venues.some((v) => v.id === 'off_small'), 'match excludes under-capacity venue');
ok(
  !matchOffersToEvent({
    activeEvent: { id: 'evt_capacity', seats: 12 },
    offers: { venue: [{ id: 'off_partial', city: 'SF', capacity: 8, email: 'host@room.co' }] },
  }).venues.length,
  'match excludes venue below full event capacity',
);
ok(!pureMatch.venues.some((v) => v.id === 'off_rejected'), 'match excludes rejected venue');
ok(
  !matchOffersToEvent({
    ...offerFixture,
    offers: {
      venue: [{ id: 'off_other_night', eventId: 'evt_other', name: 'SoMa room', email: 'host@room.co', city: 'SF', capacity: 20 }],
    },
  }).venues.length,
  'match excludes offers already linked to another night',
);
ok(pureMatch.top?.venue?.id === 'off_soma', 'top venue is SoMa loft');
ok(pureMatch.top?.sponsor?.id === 'sp_tab', 'top sponsor non-money');
ok(!pureMatch.sponsors.some((s) => s.id === 'sp_money'), 'money mirrors excluded from sponsor match');
ok(!pureMatch.sponsors.some((s) => s.id === 'sp_url_only'), 'match excludes URL-only offer without usable contact');
ok(
  matchOffersToEvent({
    ...offerFixture,
    offers: { sponsor: [{ id: 'url_only', city: 'SF', url: 'https://sponsor.co', offer: 'dinner sponsor' }] },
  }).sponsors.length === 0,
  'match does not fall back to URL-only leads',
);
ok(pureMatch.top?.volunteer?.id === 'vol_door', 'top volunteer door/setup');
ok(pureMatch.venues.every((v) => v.email == null), 'match rows omit email');
ok(pureMatch.top.venue.score >= pureMatch.venues[pureMatch.venues.length - 1]?.score, 'venues ranked');
const freshOfferMatch = matchOffersToEvent({
  activeEvent: { id: 'evt_fresh', seats: 8 },
  offers: {
    venue: [
      { id: 'z_old', city: 'SF', capacity: 8, email: 'old@room.co', at: '2026-01-01T00:00:00Z' },
      { id: 'a_new', city: 'SF', capacity: 8, email: 'new@room.co', at: '2026-01-02T00:00:00Z' },
    ],
  },
});
ok(freshOfferMatch.top?.venue?.id === 'a_new', 'equal-score offers prefer the fresher submission');
ok(!('_at' in freshOfferMatch.top.venue), 'offer freshness tie-break stays private');

// Free venue match: outdoor picnic prefers park/outdoor; indoor salon prefers library/office
const picnic = matchFreeVenues({ need: 'outdoor picnic party', seats: 40, limit: 3 });
ok(picnic.length >= 1 && picnic[0].score >= picnic[picnic.length - 1].score, 'picnic ranked');
ok(/outdoor|picnic|party|dolores|park/i.test(picnic[0].tags?.join(' ') + ' ' + picnic[0].name), 'picnic top outdoorish');
ok(Array.isArray(picnic[0].reasons) && picnic[0].reasons.length >= 1, 'match includes reasons');
const salon = matchFreeVenues({ need: 'indoor salon talk dinner', seats: 12, limit: 3 });
ok(salon[0] && salon[0].score > scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), { need: 'indoor salon talk dinner', seats: 12 }), 'salon beats dolores for indoor');
ok(salon[0]?.reasons?.includes('indoor-fit') || salon[0]?.reasons?.includes('quiet'), 'salon indoor/quiet reasons');
// Quiet supper + SoMa cue: indoor free beats park; area boosts SoMa options when scores close
const quietSupper = matchFreeVenues({
  need: 'quiet SoMa dinner supper free venue for 12',
  seats: 12,
  limit: 4,
});
ok(quietSupper[0] && !/dolores|park lawn|parklet/i.test(quietSupper[0].name), 'quiet supper not park top');
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'SoMa after-hours demo indoor',
    seats: 30,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_hayes_green'), {
      need: 'SoMa after-hours demo indoor',
      seats: 30,
    }),
  'SoMa office beats hayes green for indoor demo',
);
ok(
  eventNeedText({ title: 'SoMa dinner', notes: 'quiet venue' }).includes('SoMa'),
  'eventNeedText keeps title area',
);
ok(OUTREACH_KIND_PRIORITY.venue > OUTREACH_KIND_PRIORITY.feedback_ask, 'venue outreach priority high');

// Free-ask + SoMa area: true free / office beats sponsor-tab café; area-miss demotes Mission for SoMa
const freeSomaDinner = matchFreeVenues({
  need: 'SoMa dinner supper free venue quiet indoor for 10',
  seats: 10,
  limit: 4,
});
ok(freeSomaDinner[0] && freeSomaDinner[0].id !== 'v_cafe_sponsor', 'free SoMa dinner not café sponsor-tab top');
ok(
  !/sponsor tab/i.test(freeSomaDinner[0]?.cost || '') || /office|library|loan/i.test(freeSomaDinner[0]?.name || ''),
  'free-ask prefers free/in-kind over pure sponsor tab',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'SoMa free indoor dinner for 10',
    seats: 10,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_cafe_sponsor'), {
      need: 'SoMa free indoor dinner for 10',
      seats: 10,
    }),
  'office loan beats café when free ask + SoMa',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'SoMa free indoor dinner for 10',
    seats: 10,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'SoMa free indoor dinner for 10',
      seats: 10,
    }),
  'SoMa office beats Mission library on area',
);
const rightSize = matchFreeVenues({ need: 'indoor salon talk free', seats: 12, limit: 3 });
ok(
  rightSize[0]?.reasons?.includes('right-size') || rightSize[0]?.reasons?.includes('capacity'),
  'right-size or capacity reason present',
);
// Walk-and-talk: bare "talk" must not score as quiet indoor salon
const walkTalk = scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
  need: 'walk and talk embarcadero founders',
  seats: 15,
  explain: true,
});
ok(!walkTalk.reasons?.includes('quiet'), 'walk-and-talk not quiet reason');
ok(walkTalk.reasons?.includes('meetup-fit') || walkTalk.reasons?.includes('area'), 'walk-and-talk meetup/area');
const walkRank = matchFreeVenues({ need: 'walk and talk embarcadero founders', seats: 15, limit: 2 });
ok(
  /embarcadero|ferry|promenade/i.test(walkRank[0]?.name || ''),
  'walk-and-talk prefers promenade/ferry over library',
);
// Private dinner: office/in-kind or indoor private beats free public park
const privateDinner = matchFreeVenues({
  need: 'private room dinner for founders free cheap SF',
  seats: 12,
  limit: 3,
});
ok(
  privateDinner[0] && !/dolores|park lawn|parklet|promenade/i.test(privateDinner[0].name || ''),
  'private dinner not free public park top',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'private room dinner founders',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'private room dinner founders',
      seats: 12,
    }),
  'private dinner: office beats dolores',
);
// Evening without outdoor ask: soft demote weather-exposed parks
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'evening indoor networking free',
    seats: 18,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_hayes_green'), {
      need: 'evening indoor networking free',
      seats: 18,
    }),
  'evening indoor: library beats hayes green',
);
// Rain → indoor; dinner free-ask prefers office/in-kind over library food ban
const rainIndoor = matchFreeVenues({ need: 'rain indoor free talk Mission', seats: 15, limit: 2 });
ok(
  rainIndoor[0] && !/dolores|park|parklet|promenade|green/i.test(rainIndoor[0].name || ''),
  'rain top is not outdoor park',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'rainy indoor free talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('rain-indoor') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'rainy indoor free talk',
      seats: 12,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
        need: 'rainy indoor free talk',
        seats: 12,
      }),
  'rain indoor library beats dolores',
);
const freeDinner = matchFreeVenues({
  need: 'quiet free dinner supper for 12 founders',
  seats: 12,
  limit: 3,
});
ok(
  freeDinner[0] && freeDinner[0].id !== 'v_mission_library',
  'free dinner not library top (food-room demote)',
);
// excludeIds: venue_alt shortlist drops current free_list pick
const excl = matchFreeVenues({
  need: 'indoor salon free',
  seats: 12,
  limit: 3,
  excludeIds: ['v_mission_library'],
});
ok(!excl.some((v) => v.id === 'v_mission_library'), 'excludeIds drops mission library');
ok(excl.length >= 1 && excl[0].id, 'excludeIds still returns alts');
// Indoor-only: free+area parks must not outrank indoor rooms for quiet free dinner
const indoorOnlyRank = matchFreeVenues({
  need: 'SoMa dinner for 10 free indoor quiet salon',
  seats: 12,
  limit: 5,
});
ok(
  indoorOnlyRank[0] && !/park|parklet|promenade|green|gardens|dolores/i.test(indoorOnlyRank[0].name || ''),
  'indoor free dinner top not public outdoor',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'SoMa free indoor quiet salon dinner',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'SoMa free indoor quiet salon dinner',
      seats: 12,
    }),
  'indoor-only: office beats SoMa parklet despite area',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
    need: 'indoor quiet free salon dinner',
    seats: 12,
    explain: true,
  }).reasons?.includes('indoor-only'),
  'parklet gets indoor-only reason on indoor need',
);
// FiDi / financial area aliases → Embarcadero / Ferry (not area-miss only)
const fidiNet = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
ok(
  /embarcadero|ferry/i.test(fidiNet[0]?.name || fidiNet[0]?.area || ''),
  'FiDi networking prefers Embarcadero/Ferry cluster',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'financial district meetup free',
    seats: 12,
    explain: true,
  }).reasons?.includes('area'),
  'financial district area-hits ferry',
);
// New curated rooms exist and rank for civic / SoMa outdoor
ok(FREE_SF_VENUES.some((v) => v.id === 'v_main_library'), 'main library in free list');
ok(FREE_SF_VENUES.some((v) => v.id === 'v_yerba_buena'), 'yerba buena in free list');
ok(FREE_SF_VENUES.some((v) => v.id === 'v_crissy'), 'crissy/marina green in free list');
const civicTalk = matchFreeVenues({ need: 'civic center indoor free talk salon', seats: 20, limit: 2 });
ok(
  civicTalk[0]?.id === 'v_main_library' || /main library|civic/i.test(civicTalk[0]?.name || ''),
  'civic indoor talk prefers Main Library',
);
// Marina / Presidio walk → Crissy Field cluster
const marinaWalk = matchFreeVenues({ need: 'Presidio walk and talk free', seats: 12, limit: 2 });
ok(
  marinaWalk[0]?.id === 'v_crissy' || /crissy|marina|presidio/i.test(marinaWalk[0]?.name || marinaWalk[0]?.area || ''),
  'Presidio walk prefers Crissy/Marina',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'Marina outdoor meetup free',
    seats: 20,
    explain: true,
  }).reasons?.includes('area'),
  'Marina area-hits Crissy',
);
// Explicit indoor + networking: parks still sink (indoor-only applies)
const indoorNet = matchFreeVenues({ need: 'networking mixer founders free indoor', seats: 25, limit: 3 });
ok(
  indoorNet[0] && !/park|parklet|promenade|green|gardens|dolores|crissy/i.test(indoorNet[0].name || ''),
  'indoor networking top not public outdoor',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'networking mixer free indoor',
    seats: 20,
    explain: true,
  }).reasons?.includes('indoor-only'),
  'networking+indoor still marks outdoor indoor-only',
);
// Happy hour / drinks without outdoor → food-adjacent over pure lawn
const drinksHH = matchFreeVenues({ need: 'happy hour drinks founders free SF', seats: 20, limit: 3 });
ok(
  drinksHH[0] && !/dolores|hayes green|patricia/i.test(drinksHH[0].name || ''),
  'happy hour top not pure lawn',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'happy hour drinks free',
    seats: 18,
    explain: true,
  }).reasons?.includes('drinks-near') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
      need: 'happy hour drinks free',
      seats: 18,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_hayes_green'), {
        need: 'happy hour drinks free',
        seats: 18,
      }),
  'drinks: ferry beats hayes green lawn',
);
// Intimate small group prefers right-size rooms
const intimate = matchFreeVenues({ need: 'intimate salon talk free indoor', seats: 6, limit: 2 });
ok(
  intimate[0]?.reasons?.includes('intimate-fit') || intimate[0]?.reasons?.includes('right-size'),
  'intimate small has intimate-fit or right-size',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'intimate free indoor talk',
    seats: 6,
    explain: true,
  }).reasons?.includes('intimate-fit'),
  'mission library intimate-fit for 6',
);
// After-hours / evening indoor → office over SFPL library hours
const afterHours = matchFreeVenues({
  need: 'after-hours indoor salon talk free SoMa',
  seats: 20,
  limit: 2,
});
ok(
  afterHours[0]?.id === 'v_office_loan' || /office|loan/i.test(afterHours[0]?.name || ''),
  'after-hours indoor prefers office loan',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'evening indoor free talk',
    seats: 18,
    explain: true,
  }).reasons?.includes('after-hours'),
  'office gets after-hours reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'evening indoor free talk',
    seats: 18,
    explain: true,
  }).reasons?.includes('library-hours'),
  'library demoted for evening hours',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'evening indoor free talk',
    seats: 18,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'evening indoor free talk',
      seats: 18,
    }),
  'evening indoor: office beats library',
);
// AV / projector → indoor office-style, not lawn
const avRoom = matchFreeVenues({ need: 'projector whiteboard pitch free indoor SoMa', seats: 25, limit: 2 });
ok(
  avRoom[0] && !/park|parklet|promenade|green|gardens|dolores/i.test(avRoom[0].name || ''),
  'AV need top not public outdoor',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'projector whiteboard demo free',
    seats: 30,
    explain: true,
  }).reasons?.includes('av-room'),
  'office gets av-room reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'projector whiteboard demo free',
    seats: 30,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'projector whiteboard demo free',
      seats: 30,
    }),
  'AV: office beats parklet',
);
// Reserve honesty on free (reserve) shortlist lines
ok(
  /reserve required/i.test(freeVenueShortlistLines('indoor free salon talk Mission', 12, 3)),
  'shortlist marks reserve required for SFPL',
);
// Workshop/panel/AMA without "indoor" still wants rooms (not park ties)
const workshop = matchFreeVenues({ need: 'workshop panel AMA founders free', seats: 20, limit: 3 });
ok(
  workshop[0] && !/park|parklet|promenade|green|gardens|dolores/i.test(workshop[0].name || ''),
  'workshop/panel AMA top not public outdoor',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'workshop panel AMA founders free',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'workshop panel AMA founders free',
      seats: 20,
    }),
  'workshop: library beats parklet',
);
// Demo day / pitch → office/showcase over pure outdoor free
const pitchNight = matchFreeVenues({ need: 'pitch night demo day SoMa free', seats: 30, limit: 2 });
ok(
  pitchNight[0]?.id === 'v_office_loan' || /office|loan|showcase/i.test(pitchNight[0]?.name || ''),
  'pitch/demo day prefers office loan',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'pitch night demo day free',
    seats: 30,
    explain: true,
  }).reasons?.includes('demo-format'),
  'demo-format reason on office for pitch',
);
// Bernal / Tenderloin area aliases → Mission/Dolores / Civic cluster
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'Bernal Heights outdoor picnic free',
    seats: 40,
    explain: true,
  }).reasons?.includes('area'),
  'Bernal area-hits Dolores cluster',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'Tenderloin free talk indoor',
    seats: 15,
    explain: true,
  }).reasons?.includes('area'),
  'Tenderloin area-hits Main Library / Civic',
);
// Capacity honesty: free-ask must not crown hard under-cap rooms over rooms that fit
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'indoor free talk large',
    seats: 45,
    explain: true,
  }).reasons?.includes('under-cap-hard') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'indoor free talk large',
      seats: 45,
      explain: true,
    }).reasons?.includes('under-cap'),
  'mission library under-cap for 45 seats',
);
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'indoor free talk large',
    seats: 45,
    explain: true,
  }).reasons?.includes('free-ask'),
  'under-cap free room skips free-ask bonus',
);
const largeIndoor = matchFreeVenues({
  need: 'indoor free talk salon large founders',
  seats: 45,
  limit: 4,
});
ok(
  largeIndoor[0] &&
    (largeIndoor[0].id === 'v_office_loan' ||
      (Number(largeIndoor[0].capacity) || 0) >= 40 ||
      !/mission branch library/i.test(largeIndoor[0].name || '')),
  'large indoor top prefers fit capacity over tiny free library',
);
ok(
  !largeIndoor.some((v) => (Number(v.capacity) || 0) > 0 && (Number(v.capacity) || 0) < 22),
  'soft floor drops hard under-cap rooms when alts exist',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'indoor free talk salon large founders',
    seats: 40,
    explain: true,
  }).reasons?.includes('large-indoor') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'indoor free talk salon large founders',
      seats: 40,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
        need: 'indoor free talk salon large founders',
        seats: 40,
      }),
  'large indoor: office beats mission library',
);
// Soft floor still returns parks for huge outdoor when all parks fit ≥50% seats
const bigOutdoor = matchFreeVenues({ need: 'outdoor picnic party free', seats: 50, limit: 3 });
ok(bigOutdoor[0]?.id === 'v_dolores' || /dolores/i.test(bigOutdoor[0]?.name || ''), '50-seat outdoor tops Dolores');
ok(!bigOutdoor.some((v) => v.id === 'v_mission_library'), 'soft floor outdoor party not library');
// Drop-in / no-reserve → free public over free (reserve) libraries
const dropIn = matchFreeVenues({
  need: 'no reserve drop-in free outdoor picnic Mission',
  seats: 20,
  limit: 3,
});
ok(
  dropIn[0] && /free public/i.test(dropIn[0].cost || ''),
  'no-reserve top is free public',
);
ok(
  !dropIn.slice(0, 2).some((v) => /free \(reserve\)/i.test(v.cost || '')),
  'no-reserve top2 not free (reserve)',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'drop-in no reserve free picnic',
    seats: 20,
    explain: true,
  }).reasons?.includes('no-reserve'),
  'free public gets no-reserve reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'drop-in no reserve free picnic',
    seats: 20,
    explain: true,
  }).reasons?.includes('needs-reserve'),
  'SFPL free (reserve) marked needs-reserve on drop-in',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'no reserve free outdoor picnic',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'no reserve free outdoor picnic',
      seats: 20,
    }),
  'no-reserve: free public park beats library',
);
// Bookable / reserve → free (reserve) or office; free public parks sink
const bookableRoom = matchFreeVenues({
  need: 'bookable free indoor room reserve salon talk',
  seats: 15,
  limit: 3,
});
ok(
  bookableRoom[0] &&
    (/free \(reserve\)/i.test(bookableRoom[0].cost || '') ||
      /office|library|loan/i.test(bookableRoom[0].name || '')),
  'bookable top is reserve room or office',
);
ok(
  !/park|parklet|promenade|green|gardens|dolores/i.test(bookableRoom[0]?.name || ''),
  'bookable top not free public park',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'bookable reserve indoor free talk',
    seats: 18,
    explain: true,
  }).reasons?.includes('bookable'),
  'library gets bookable reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'bookable reserve indoor free talk',
    seats: 18,
    explain: true,
  }).reasons?.includes('not-bookable'),
  'park gets not-bookable on reserve ask',
);
// Run club → Crissy/Embarcadero walk venues over pure picnic lawns
const runClub = matchFreeVenues({ need: 'run club meetup free outdoor', seats: 30, limit: 3 });
ok(
  runClub[0] &&
    (runClub[0].id === 'v_crissy' ||
      runClub[0].id === 'v_embarcadero_bench' ||
      /crissy|embarcadero|marina/i.test(runClub[0].name || '')),
  'run club tops walk waterfront venue',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'run club meetup free outdoor',
    seats: 30,
    explain: true,
  }).reasons?.includes('run-club'),
  'crissy gets run-club reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'run club meetup free outdoor',
    seats: 30,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'run club meetup free outdoor',
      seats: 30,
    }),
  'run club: Crissy beats Dolores picnic lawn',
);
// residual: "run club waterfront" must crown emb/crissy walks over ferry arcade right-size
const runClubWaterfront = matchFreeVenues({ need: 'run club waterfront', seats: 12, limit: 3 });
ok(
  runClubWaterfront[0] &&
    (runClubWaterfront[0].id === 'v_crissy' ||
      runClubWaterfront[0].id === 'v_embarcadero_bench'),
  'run club waterfront tops emb/crissy walk (not ferry arcade)',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'run club waterfront',
    seats: 12,
    explain: true,
  }).reasons?.includes('run-waterfront'),
  'crissy gets run-waterfront reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'run club waterfront',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
      need: 'run club waterfront',
      seats: 12,
    }),
  'run club waterfront: emb promenade beats ferry arcade',
);
// residual: china beach / fort point outdoor areaNeed → Crissy walks (draft free-list honesty)
const chinaBeachOutdoor = matchFreeVenues({ need: 'china beach outdoor picnic', seats: 12, limit: 2 });
ok(chinaBeachOutdoor[0]?.id === 'v_crissy', 'china beach outdoor crowns Crissy (not SoMa parklet)');
const fortPointWalk = matchFreeVenues({ need: 'fort point walk free', seats: 12, limit: 3 });
ok(
  fortPointWalk[0]?.id === 'v_crissy' || fortPointWalk[0]?.id === 'v_embarcadero_bench',
  'fort point walk tops marina/presidio walk venue',
);
const divisaderoIndoor = matchFreeVenues({ need: 'divisadero free indoor', seats: 12, limit: 2 });
ok(
  divisaderoIndoor[0]?.id === 'v_main_library' || divisaderoIndoor[0]?.id === 'v_mission_library',
  'divisadero free indoor tops SFPL room',
);
// Open mic / comedy → office loan; libraries sink (no amp)
const openMic = matchFreeVenues({
  need: 'standup comedy open mic free indoor',
  seats: 25,
  limit: 2,
});
ok(
  openMic[0]?.id === 'v_office_loan' || /office|loan/i.test(openMic[0]?.name || ''),
  'open mic prefers office loan',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'standup comedy open mic free indoor',
    seats: 25,
    explain: true,
  }).reasons?.includes('performance'),
  'office gets performance reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'open mic comedy free indoor',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
      need: 'open mic comedy free indoor',
      seats: 25,
    }),
  'open mic: office beats library',
);
// Board game night → indoor tables, not parks
const gameNight = matchFreeVenues({ need: 'board game night free indoor', seats: 16, limit: 2 });
ok(
  gameNight[0] &&
    (/library|office|loan/i.test(gameNight[0].name || '') ||
      /indoor|salon|library|office/.test((gameNight[0].tags || []).join(' '))),
  'game night tops indoor room',
);
ok(
  !/park|parklet|promenade|green|gardens|dolores/i.test(gameNight[0]?.name || ''),
  'game night top not outdoor park',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'board game night free indoor',
    seats: 12,
    explain: true,
  }).reasons?.includes('game-night'),
  'library gets game-night reason',
);
// Waterfront / golden hour → Embarcadero / Crissy / Ferry
const waterfront = matchFreeVenues({
  need: 'golden hour waterfront bay view free meetup',
  seats: 20,
  limit: 2,
});
ok(
  waterfront[0] &&
    (waterfront[0].id === 'v_embarcadero_bench' ||
      waterfront[0].id === 'v_crissy' ||
      waterfront[0].id === 'v_ferry_arcade' ||
      /embarcadero|crissy|ferry|marina/i.test(waterfront[0].name || '')),
  'waterfront tops bay promenade venue',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'waterfront bay view free',
    seats: 20,
    explain: true,
  }).reasons?.includes('waterfront'),
  'embarcadero gets waterfront reason',
);
// Caltrain arrival → SoMa / Yerba / Salesforce near 4th-King
const caltrain = matchFreeVenues({
  need: 'Caltrain arrival networking free outdoor',
  seats: 20,
  limit: 3,
});
ok(
  caltrain[0] &&
    (caltrain[0].id === 'v_yerba_buena' ||
      caltrain[0].id === 'v_soma_parklet' ||
      caltrain[0].id === 'v_salesforce_park' ||
      /yerba|south park|salesforce|soma/i.test(caltrain[0].name + ' ' + (caltrain[0].area || ''))),
  'caltrain tops SoMa hub near 4th/King',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
    need: 'caltrain arrival free meetup',
    seats: 20,
    explain: true,
  }).reasons?.includes('caltrain-hub'),
  'yerba gets caltrain-hub reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
    need: 'caltrain arrival free meetup',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
      need: 'caltrain arrival free meetup',
      seats: 20,
    }),
  'caltrain: Yerba beats far Crissy',
);
// Salesforce Park is on free list (draft shortlist seed)
ok(
  FREE_SF_VENUES.some((v) => v.id === 'v_salesforce_park'),
  'Salesforce Park on free list',
);
// Bike / group ride → walk waterfront start (not library)
const bikeRide = matchFreeVenues({ need: 'bike ride group ride free SF', seats: 20, limit: 3 });
ok(
  bikeRide[0] &&
    (bikeRide[0].id === 'v_ferry_arcade' ||
      bikeRide[0].id === 'v_embarcadero_bench' ||
      bikeRide[0].id === 'v_crissy' ||
      bikeRide[0].id === 'v_yerba_buena' ||
      bikeRide[0].id === 'v_salesforce_park' ||
      /ferry|embarcadero|crissy|yerba|salesforce/i.test(bikeRide[0].name || '')),
  'bike ride tops walk outdoor start',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'bike ride group ride free SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('bike-ride'),
  'ferry gets bike-ride reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'bike ride group ride free SF',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'bike ride group ride free SF',
      seats: 20,
    }),
  'bike ride: ferry beats library',
);
// All-day / hackathon → office/loan over SFPL hours
const hackAllDay = matchFreeVenues({ need: 'hackathon all day indoor free', seats: 30, limit: 2 });
ok(
  hackAllDay[0]?.id === 'v_office_loan' || /office|loan/i.test(hackAllDay[0]?.name || ''),
  'all-day hackathon prefers office loan',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'hackathon all day indoor free',
    seats: 30,
    explain: true,
  }).reasons?.includes('all-day'),
  'office gets all-day reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'hackathon all day indoor free',
    seats: 30,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
      need: 'hackathon all day indoor free',
      seats: 30,
    }),
  'all-day: office beats main library',
);
// Rooftop → Salesforce Park roof garden
const rooftop = matchFreeVenues({ need: 'rooftop hang free SF', seats: 25, limit: 2 });
ok(
  rooftop[0]?.id === 'v_salesforce_park' || /salesforce/i.test(rooftop[0]?.name || ''),
  'rooftop tops Salesforce Park',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
    need: 'rooftop hang free SF',
    seats: 25,
    explain: true,
  }).reasons?.includes('rooftop'),
  'salesforce gets rooftop reason',
);
// Podcast/recording → private office over open library
const podcast = matchFreeVenues({
  need: 'podcast recording quiet indoor free',
  seats: 8,
  limit: 2,
});
ok(
  podcast[0]?.id === 'v_office_loan' || /office|loan/i.test(podcast[0]?.name || ''),
  'podcast recording prefers office loan',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'podcast recording quiet indoor free',
    seats: 8,
    explain: true,
  }).reasons?.includes('av-private') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'podcast recording quiet indoor free',
      seats: 8,
      explain: true,
    }).reasons?.includes('av-room'),
  'office gets av-private or av-room for podcast',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'podcast recording quiet indoor free',
    seats: 8,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'podcast recording quiet indoor free',
      seats: 8,
    }),
  'podcast: office beats library',
);
// Plan-stage outreach: open sponsor gap drains before leftover thin venue (draft only)
{
  const planGaps = {
    needVenue: false,
    needVenueAlt: false,
    needSponsor: true,
    needVolunteer: false,
    missing: ['sponsor'],
  };
  const planPrio = prioritizeOutreachQueue(
    [
      {
        id: 'thin_v_plan',
        kind: 'venue',
        status: 'queued',
        eventId: 'e_plan',
        body: 'Need room',
        priority: 100,
        at: '2026-01-01',
      },
      {
        id: 'sp_plan',
        kind: 'sponsor',
        status: 'queued',
        eventId: 'e_plan',
        toEmail: 'ops@acme.co',
        body:
          'Looking for a drink sponsor tab for twenty seats in San Francisco founders night. Draft queue only — no auto-send.',
        priority: 90,
        at: '2026-01-02',
      },
    ],
    { stage: 'plan', eventId: 'e_plan', gaps: planGaps },
  );
  ok(planPrio[0]?.id === 'sp_plan', 'plan stage: sponsor gap drains first');
  ok(/plan-resource-gap/i.test(planPrio[0]?.drainWhy || ''), 'plan stage drainWhy plan-resource-gap');
  ok(/venue-filled/i.test(planPrio.find((x) => x.id === 'thin_v_plan')?.drainWhy || ''), 'thin venue marked venue-filled');
}
// Filled sponsor/volunteer sink so next open gap drains (draft only)
{
  const filledGaps = {
    needVenue: false,
    needVenueAlt: false,
    needSponsor: false,
    needVolunteer: true,
    missing: ['volunteer'],
  };
  const filledPrio = prioritizeOutreachQueue(
    [
      {
        id: 'sp_filled',
        kind: 'sponsor',
        status: 'queued',
        eventId: 'e_fill',
        toEmail: 'ops@acme.co',
        body:
          'Looking for a drink sponsor tab for twenty seats in San Francisco founders night. Draft queue only — no auto-send.',
        priority: 90,
        at: '2026-01-01',
      },
      {
        id: 'vol_open',
        kind: 'volunteer',
        status: 'queued',
        eventId: 'e_fill',
        toEmail: 'help@acme.co',
        body:
          'Need a day-of volunteer for door/setup host-assist in San Francisco. Draft queue only — no auto-send.',
        priority: 80,
        at: '2026-01-02',
      },
    ],
    { stage: 'resource', eventId: 'e_fill', gaps: filledGaps },
  );
  ok(filledPrio[0]?.id === 'vol_open', 'sponsor-filled: volunteer gap drains first');
  ok(/sponsor-filled/i.test(filledPrio.find((x) => x.id === 'sp_filled')?.drainWhy || ''), 'leftover sponsor marked sponsor-filled');
  ok(
    /volunteer|primary gap|sponsor-filled/i.test(
      outreachNextWhy(filledPrio.find((x) => x.id === 'sp_filled'), {
        stage: 'resource',
        gaps: filledGaps,
      }) || '',
    ),
    'outreachNextWhy names sponsor-filled',
  );
  const volFilled = prioritizeOutreachQueue(
    [
      {
        id: 'vol_done',
        kind: 'volunteer',
        status: 'queued',
        eventId: 'e_fill2',
        toEmail: 'help@acme.co',
        body: 'Need a day-of volunteer for door/setup. Draft queue only — no auto-send.',
        priority: 80,
        at: '2026-01-01',
      },
      {
        id: 'sp_still',
        kind: 'sponsor',
        status: 'queued',
        eventId: 'e_fill2',
        toEmail: 'ops@acme.co',
        body:
          'Looking for a drink sponsor tab for twenty seats in San Francisco founders night. Draft queue only — no auto-send.',
        priority: 90,
        at: '2026-01-02',
      },
    ],
    {
      stage: 'resource',
      eventId: 'e_fill2',
      gaps: {
        needVenue: false,
        needVenueAlt: false,
        needSponsor: true,
        needVolunteer: false,
        missing: ['sponsor'],
      },
    },
  );
  ok(volFilled[0]?.id === 'sp_still', 'volunteer-filled: sponsor gap drains first');
  ok(
    /volunteer-filled/i.test(volFilled.find((x) => x.id === 'vol_done')?.drainWhy || ''),
    'leftover volunteer marked volunteer-filled',
  );
}
// Enrich thin venue outreach drafts with shortlist (draft queue only)
{
  const thinStore = {
    activeEvent: {
      id: 'evt_enrich',
      title: 'SoMa salon',
      seats: 12,
      notes: 'quiet indoor free',
      stage: 'resource',
      venue: null,
    },
    outreach: [
      {
        id: 'thin_v',
        kind: 'venue',
        status: 'queued',
        toEmail: 'potter@trydemigod.com',
        body: 'Need a free room please.',
        priority: 50,
      },
      {
        id: 'rich_v',
        kind: 'venue',
        status: 'queued',
        toEmail: 'potter@trydemigod.com',
        body:
          'Resource gaps: venue.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send.',
        priority: 100,
      },
    ],
    offers: { sponsor: [], venue: [], volunteer: [] },
  };
  const enr = enrichVenueOutreachBodies(thinStore);
  ok(enr.enriched === 2, 'enrich thin and stale venue drafts');
  ok(/Ranked free SF|match \d+/i.test(thinStore.outreach[0].body || ''), 'thin body got shortlist');
  ok(thinStore.outreach[0].enrichedShortlist === true, 'enrichedShortlist flag');
  ok(thinStore.outreach[0].priority >= OUTREACH_KIND_PRIORITY.venue, 'enrich bumps venue priority floor');
  ok(/Ranked free SF options I already scored/i.test(thinStore.outreach[1].body || ''), 'rich draft unchanged');
  ok(outreachDraftReadiness(thinStore.outreach[0]) >= 4, 'enriched draft shortlist-ready');
}
const gapAlt = resourceGaps({
  activeEvent: {
    stage: 'resource',
    seats: 12,
    title: 'SoMa salon',
    notes: 'quiet indoor free',
    venue: {
      id: 'v_mission_library',
      name: 'Mission Branch Library meeting room',
      source: 'free_list',
      cost: 'free (reserve)',
      area: 'Mission',
    },
  },
  offers: { sponsor: [{ id: 's1' }], venue: [], volunteer: [{ id: 'v1' }] },
  outreach: [],
});
ok(gapAlt.needVenueAlt && !gapAlt.needVenue, 'resourceGaps venue_alt when free_list weak');
ok(gapAlt.excludeIds?.includes('v_mission_library'), 'resourceGaps excludeIds current free_list');
ok(
  gapAlt.topFreeVenue?.id && gapAlt.topFreeVenue.id !== 'v_mission_library',
  'topFreeVenue is real alt not current pick',
);
ok(gapAlt.topFreeVenue?.alt === true, 'topFreeVenue.alt when excluding current');
const vBodyAlt = buildVenueResourceOutreachBody(
  {
    title: 'Test',
    seats: 12,
    venue: {
      id: 'v_mission_library',
      name: 'Mission Branch Library meeting room',
      area: 'Mission',
      cost: 'free (reserve)',
      source: 'free_list',
    },
    notes: 'quiet indoor salon',
  },
  gapAlt,
  { need: 'quiet indoor salon free', seats: 12 },
);
ok(/excluding current free_list|alt vs current/i.test(vBodyAlt), 'venue alt body notes exclusion');
ok(!/^1\.\s*Mission Branch Library/m.test(vBodyAlt), 'shortlist line1 not current library');

// Outreach draft quality + hygiene (pure)
ok(isRealOutreachEmail('potter@trydemigod.com') === true, 'real ops email ok');
ok(isExternalOutreachEmail('potter@trydemigod.com') === false, 'ops mailbox not external-ready');
ok(isExternalOutreachEmail('venue@somaloft.co') === true, 'external venue email is contact-ready class');
ok(isExternalOutreachEmail('venue@example.com') === false, 'example.com never external');
ok(isRealOutreachEmail('venue@example.com') === false, 'reject example.com invent');
ok(isRealOutreachEmail('fake@somewhere.org') === false, 'reject fake@ local invent');
ok(isRealOutreachEmail('user@test.com') === false, 'reject test.com invent');
ok(isRealOutreachEmail('') === false, 'reject empty email');
ok(isRealOutreachEmail('not-an-email') === false, 'reject malformed email');
ok(isRealOutreachEmail('ops@trydemigod..com') === false, 'reject consecutive-dot email');
ok(isRealOutreachEmail('ops@trydemigod.com.') === false, 'reject trailing-dot email domain');
ok(isRealOutreachEmail('ops@127.0.0.1') === false, 'reject numeric/IP outreach domain');
ok(isRealOutreachEmail('.ops@trydemigod.com') === false, 'reject leading-dot email local');
ok(isRealOutreachEmail('ops.@trydemigod.com') === false, 'reject trailing-dot email local');
// Usable-contact hygiene: noreply / platform / invent domains never draft (url-only residual)
ok(isRealOutreachEmail('noreply@brand.com') === false, 'reject noreply local');
ok(isRealOutreachEmail('no-reply@brand.com') === false, 'reject no-reply local');
ok(isRealOutreachEmail('no_reply@brand.com') === false, 'reject no_reply local');
ok(isRealOutreachEmail('donotreply@acme.io') === false, 'reject donotreply local');
ok(isRealOutreachEmail('do_not_reply@acme.io') === false, 'reject do_not_reply local');
ok(isRealOutreachEmail('noreply+events@brand.com') === false, 'reject noreply+tag local');
ok(isRealOutreachEmail('noreply-events@brand.com') === false, 'reject noreply alias local');
ok(isRealOutreachEmail('do-not-reply.notifications@acme.io') === false, 'reject do-not-reply alias local');
ok(isRealOutreachEmail('bounce-events@acme.io') === false, 'reject bounce alias local');
ok(isRealOutreachEmail('notifications.events@acme.io') === false, 'reject notifications alias local');
ok(isRealOutreachEmail('unknown@acme.io') === false, 'reject unknown placeholder local');
ok(isRealOutreachEmail('invalid.events@acme.io') === false, 'reject invalid placeholder alias');
ok(isRealOutreachEmail('hello@linkedin.com') === false, 'reject linkedin platform mailbox');
ok(isRealOutreachEmail('hello@partiful.com') === false, 'reject event platform mailbox');
ok(isRealOutreachEmail('events@eventbrite.com') === false, 'reject eventbrite platform mailbox');
ok(isRealOutreachEmail('events@mail.eventbrite.com') === false, 'reject platform subdomain mailbox');
ok(isRealOutreachEmail('organizer@meetup.com') === false, 'reject meetup platform mailbox');
ok(isRealOutreachEmail('venue@email.com') === false, 'reject email.com invent domain');
ok(isRealOutreachEmail('contact@company.io') === true, 'real contact still ok');
// Outreach residual: disposable / invent domains + placeholder locals + more platforms
ok(isRealOutreachEmail('a@mailinator.com') === false, 'reject mailinator disposable');
ok(isRealOutreachEmail('a@yopmail.com') === false, 'reject yopmail disposable');
ok(isRealOutreachEmail('a@guerrillamail.com') === false, 'reject guerrillamail disposable');
ok(isRealOutreachEmail('a@tempmail.com') === false, 'reject tempmail disposable');
ok(isRealOutreachEmail('a@throwaway.email') === false, 'reject throwaway.email disposable');
ok(isRealOutreachEmail('a@10minutemail.com') === false, 'reject 10minutemail disposable');
ok(isRealOutreachEmail('a@trashmail.com') === false, 'reject trashmail disposable');
ok(isRealOutreachEmail('a@sharklasers.com') === false, 'reject sharklasers disposable');
ok(isRealOutreachEmail('a@nowhere.com') === false, 'reject nowhere.com invent domain');
ok(isRealOutreachEmail('a@noemail.com') === false, 'reject noemail.com invent domain');
ok(isRealOutreachEmail('a@null.com') === false, 'reject null.com invent domain');
ok(isRealOutreachEmail('a@void.com') === false, 'reject void.com invent domain');
ok(isRealOutreachEmail('a@fake.com') === false, 'reject fake.com invent domain');
ok(isRealOutreachEmail('a@spam.com') === false, 'reject spam.com invent domain');
ok(isRealOutreachEmail('a@sample.com') === false, 'reject sample.com invent domain');
ok(isRealOutreachEmail('null@brand.com') === false, 'reject null@ placeholder local');
ok(isRealOutreachEmail('tbd@brand.com') === false, 'reject tbd@ placeholder local');
ok(isRealOutreachEmail('todo@brand.com') === false, 'reject todo@ placeholder local');
ok(isRealOutreachEmail('fixme@brand.com') === false, 'reject fixme@ placeholder local');
ok(isRealOutreachEmail('changeme@brand.com') === false, 'reject changeme@ placeholder local');
ok(isRealOutreachEmail('yourname@brand.com') === false, 'reject yourname@ placeholder local');
ok(isRealOutreachEmail('someone@brand.com') === false, 'reject someone@ placeholder local');
ok(isRealOutreachEmail('somebody@brand.com') === false, 'reject somebody@ placeholder local');
ok(isRealOutreachEmail('anyone@brand.com') === false, 'reject anyone@ placeholder local');
ok(isRealOutreachEmail('everybody@brand.com') === false, 'reject everybody@ placeholder local');
ok(isRealOutreachEmail('everyone@brand.com') === false, 'reject everyone@ placeholder local');
ok(isRealOutreachEmail('n/a@brand.com') === false, 'reject n/a@ placeholder local');
ok(isRealOutreachEmail('hello@glassdoor.com') === false, 'reject glassdoor platform mailbox');
ok(isRealOutreachEmail('hello@crunchbase.com') === false, 'reject crunchbase platform mailbox');
ok(isRealOutreachEmail('hello@angellist.com') === false, 'reject angellist platform mailbox');
ok(isRealOutreachEmail('hello@angel.co') === false, 'reject angel.co platform mailbox');
ok(isRealOutreachEmail('venue@somaloft.co') === true, 'real venue contact still ok residual');
ok(isRealOutreachEmail('potter@trydemigod.com') === true, 'ops email still ok residual');
ok(
  buildOutreachDraft({
    toEmail: 'a@mailinator.com',
    subject: 'Venue ask for SF night',
    body: 'Looking for a free loft for twelve seats in San Francisco.',
  }).ok === false,
  'build rejects disposable mailinator contact',
);
ok(
  buildOutreachDraft({
    toEmail: 'tbd@sponsor.co',
    subject: 'Sponsor ask for SF night',
    body: 'Looking for a dinner tab sponsor for twelve seats in San Francisco.',
  }).ok === false,
  'build rejects tbd@ invent local',
);
ok(
  matchOffersToEvent({
    activeEvent: { id: 'ev_hy_disp', seats: 12, needs: 'dinner sponsor' },
    offers: {
      sponsor: [
        {
          id: 'sp_disp',
          name: 'Disp Co',
          city: 'SF',
          email: 'a@yopmail.com',
          offer: 'large dinner tab',
          status: 'new',
        },
      ],
    },
  }).sponsors.length === 0,
  'match excludes disposable yopmail offer',
);
ok(
  buildOutreachDraft({
    toEmail: 'noreply@sponsor.co',
    subject: 'Sponsor ask for SF night',
    body: 'Looking for a dinner tab sponsor for twelve seats in San Francisco.',
  }).ok === false,
  'build rejects noreply as unusable contact',
);
ok(
  matchOffersToEvent({
    activeEvent: { id: 'ev_hy', seats: 12, needs: 'dinner sponsor' },
    offers: {
      sponsor: [
        {
          id: 'sp_noreply',
          name: 'NoReply Co',
          city: 'SF',
          email: 'noreply@sponsor.co',
          offer: 'large dinner tab',
          status: 'new',
        },
      ],
    },
  }).sponsors.length === 0,
  'match excludes noreply offer (no usable contact)',
);
const idOnce = withIdentity('Hello sponsor — need a tab for 12 seats in SF.');
ok(/Events Bot \(by Demigod\)/.test(idOnce) && /trydemigod\.com\/\?p=events/.test(idOnce), 'identity stamped once');
ok(withIdentity(idOnce) === idOnce, 'identity no double footer');
ok(withIdentity(IDENTITY_BLURB) === IDENTITY_BLURB, 'full blurb not re-appended');
const draftBadEmail = buildOutreachDraft({
  toEmail: 'placeholder@example.com',
  kind: 'venue',
  subject: 'Need SF room',
  body: 'Looking for a free loft for 12.',
});
ok(draftBadEmail.ok === false && /never invent/i.test(draftBadEmail.error || ''), 'build rejects invent email');
ok(
  buildOutreachDraft({
    toEmail: 'https://sponsor.co/contact',
    subject: 'Sponsor ask for SF night',
    body: 'Looking for a dinner tab sponsor for twelve seats in San Francisco.',
  }).ok === false,
  'build rejects URL-only lead without a usable email',
);
const draftBadBody = buildOutreachDraft({
  toEmail: 'potter@trydemigod.com',
  kind: 'sponsor',
  subject: 'Sponsor ask',
  body: 'short',
});
ok(draftBadBody.ok === false && /body required/i.test(draftBadBody.error || ''), 'build rejects short body');
const draftBadSubj = buildOutreachDraft({
  toEmail: 'potter@trydemigod.com',
  kind: 'sponsor',
  subject: 'Hi',
  body: 'Looking for a dinner tab sponsor for twelve seats in SF.',
});
ok(draftBadSubj.ok === false && /subject required/i.test(draftBadSubj.error || ''), 'build rejects short subject');
const draftOk = buildOutreachDraft({
  toEmail: 'potter@trydemigod.com',
  kind: 'sponsor',
  subject: 'Sponsor ask for SF night',
  body: 'Looking for a dinner tab sponsor for 12 seats in San Francisco.',
});
ok(draftOk.ok && draftOk.draft?.status === 'queued', 'build ok stays queued');
ok(draftOk.draft?.sentAt === null, 'build never invents sentAt');
ok(/Events Bot \(by Demigod\)/.test(draftOk.draft?.body || ''), 'build body has identity');
const hygRows = [
  {
    id: 'h1',
    toEmail: 'x@example.com',
    kind: 'venue',
    status: 'queued',
    body: 'Need a room please for the night.',
  },
  {
    id: 'h2',
    toEmail: 'potter@trydemigod.com',
    kind: 'sponsor',
    status: 'drafted',
    sentAt: '2026-07-17T00:00:00.000Z',
    body: 'Need a sponsor tab for twelve seats.',
  },
];
const hyg = hygieneOutreachQueue(hygRows);
ok(hyg.rejectedInvent === 1 && hygRows[0].status === 'rejected', 'hygiene rejects invent email');
ok(hyg.fixedIdentity === 1 && /Events Bot \(by Demigod\)/.test(hygRows[1].body || ''), 'hygiene stamps identity');
ok(hygRows.every((o) => o.sentAt === null), 'hygiene clears stale sentAt from unsent drafts');
ok(hyg.stampedPriority === 1 && hygRows[1].priority === OUTREACH_KIND_PRIORITY.sponsor, 'hygiene stamps missing priority');
ok(hyg.normalizedQueued === 1 && hygRows[1].status === 'queued', 'hygiene normalizes legacy drafted to queued');
const reminderRows = [
  { id: 'r1', eventId: 'ev_hyg', kind: 'rsvp_remind_t3d', status: 'queued' },
  { id: 'r2', eventId: 'ev_hyg', kind: 'rsvp_remind_t3d', status: 'drafted' },
  { id: 'r3', eventId: 'ev_hyg', kind: 'rsvp_remind_t1d', status: 'sent' },
  { id: 'r4', eventId: 'ev_hyg', kind: 'rsvp_remind_t1d', status: 'queued' },
];
const reminderHyg = hygieneOutreachQueue(reminderRows);
ok(reminderHyg.dedupedReminders === 2, 'hygiene removes duplicate unsent reminder drafts');
ok(reminderRows.some((o) => o.id === 'r3') && !reminderRows.some((o) => o.id === 'r4'), 'hygiene preserves sent reminder evidence');
const singletonRows = [
  { id: 'f1', eventId: 'ev_hyg', kind: 'feedback_ask', status: 'queued' },
  { id: 'f2', eventId: 'ev_hyg', kind: 'feedback_ask', status: 'drafted' },
  { id: 't1', eventId: 'ev_hyg', kind: 'thanks', status: 'sent' },
  { id: 't2', eventId: 'ev_hyg', kind: 'thanks', status: 'queued' },
];
const singletonHyg = hygieneOutreachQueue(singletonRows);
ok(singletonHyg.dedupedSingletons === 2, 'hygiene removes duplicate one-per-event drafts');
ok(singletonRows.some((o) => o.id === 't1') && !singletonRows.some((o) => o.id === 't2'), 'hygiene preserves sent singleton evidence');
const lifecycleRows = [
  { id: 'early', eventId: 'ev_hyg', kind: 'feedback_ask', status: 'queued' },
  { id: 'sent', eventId: 'ev_hyg', kind: 'thanks', status: 'sent' },
];
const lifecycleHyg = hygieneOutreachQueue(lifecycleRows, { id: 'ev_hyg', stage: 'resource' });
ok(lifecycleHyg.rejectedPremature === 1, 'hygiene reports premature rejection for persistence');
ok(lifecycleRows[0].status === 'rejected' && lifecycleRows[0].rejectReason === 'premature_for_stage', 'hygiene rejects premature post-event drafts');
ok(lifecycleRows[1].status === 'sent', 'hygiene preserves sent post-event evidence');
const aliasLifecycleRows = [{ id: 'alias', eventId: 'ev_hyg', kind: 'follow-up', status: 'queued' }];
const aliasLifecycleHyg = hygieneOutreachQueue(aliasLifecycleRows, { id: 'ev_hyg', stage: 'resource' });
ok(aliasLifecycleHyg.rejectedPremature === 1 && aliasLifecycleRows[0].status === 'rejected', 'hygiene rejects premature follow-up aliases');
const aliasSingletonRows = [
  { id: 'canonical', eventId: 'ev_hyg', kind: 'thanks', status: 'queued' },
  { id: 'alias', eventId: 'ev_hyg', kind: 'follow_up', status: 'drafted' },
];
const aliasSingletonHyg = hygieneOutreachQueue(aliasSingletonRows);
ok(aliasSingletonHyg.dedupedSingletons === 1 && aliasSingletonRows.length === 1, 'hygiene dedupes follow-up aliases as thanks');
const rejectedSingletonRows = [
  { id: 'old', eventId: 'ev_hyg', kind: 'feedback_ask', status: 'rejected', rejectReason: 'premature_for_stage' },
  { id: 'new', eventId: 'ev_hyg', kind: 'feedback_ask', status: 'rejected', rejectReason: 'premature_for_stage' },
];
const rejectedSingletonHyg = hygieneOutreachQueue(rejectedSingletonRows);
ok(
  rejectedSingletonHyg.dedupedSingletons === 1 && rejectedSingletonRows[0]?.id === 'new',
  'hygiene retains newest rejected premature singleton',
);
const mixedPrematureRows = [
  { id: 'old', eventId: 'ev_hyg', kind: 'feedback_ask', status: 'rejected', rejectReason: 'premature_for_stage' },
  { id: 'new', eventId: 'ev_hyg', kind: 'feedback_ask', status: 'queued' },
];
const mixedPrematureHyg = hygieneOutreachQueue(mixedPrematureRows, { id: 'ev_hyg', stage: 'resource' });
ok(
  mixedPrematureHyg.rejectedPremature === 1 && mixedPrematureHyg.dedupedSingletons === 1 && mixedPrematureRows[0]?.id === 'new',
  'hygiene dedupes a newly rejected premature singleton in the same pass',
);
ok(
  /Object\.values\(hyg\)\.some\(Boolean\)/.test(fs.readFileSync('demigod-useful-loop.mjs', 'utf8')),
  'periodic outreach hygiene persists every reported mutation',
);

const prio = prioritizeOutreachQueue([
  { id: 'a', kind: 'feedback_ask', status: 'queued', at: '2026-01-01' },
  { id: 'b', kind: 'venue', status: 'queued', at: '2026-01-02' },
  { id: 'c', kind: 'sponsor', status: 'queued', at: '2026-01-03' },
  { id: 'd', kind: 'venue', status: 'sent', at: '2026-01-04' },
]);
ok(prio[0]?.kind === 'venue' && prio[1]?.kind === 'sponsor', 'outreach queue venue then sponsor');
ok(prio.every((o) => o.status !== 'sent'), 'prioritize skips sent');
const freshPrio = prioritizeOutreachQueue([
  { id: 'older', kind: 'other', status: 'queued', at: '2026-01-01' },
  { id: 'newer', kind: 'other', status: 'queued', at: '2026-01-02' },
]);
ok(freshPrio[0]?.id === 'newer', 'equal-priority outreach drains newest draft first');
// Gap-aware: missing venue pulls venue kind above sponsor when base pri close
const gapPrio = prioritizeOutreachQueue(
  [
    { id: 's', kind: 'sponsor', status: 'queued', at: '2026-01-01', priority: 90 },
    { id: 'v', kind: 'venue', status: 'queued', at: '2026-01-02', priority: 90 },
    { id: 'f', kind: 'feedback_ask', status: 'queued', at: '2026-01-03', priority: 20 },
  ],
  {
    stage: 'resource',
    gaps: { needVenue: true, needVenueAlt: false, needSponsor: false, needVolunteer: false, missing: ['venue'] },
  },
);
ok(gapPrio[0]?.kind === 'venue', 'gap boost venue first');
ok(gapPrio[0].priority > gapPrio.find((x) => x.kind === 'sponsor').priority, 'gap venue > sponsor');
// Active event scope: this night's drain excludes explicitly linked prior-night drafts
const evtPrio = prioritizeOutreachQueue(
  [
    { id: 'old', kind: 'venue', status: 'queued', at: '2026-01-01', priority: 100, eventId: 'evt_old' },
    { id: 'legacy', kind: 'venue', status: 'queued', at: '2026-01-01', priority: 100 },
    { id: 'cur', kind: 'venue', status: 'queued', at: '2026-01-02', priority: 100, eventId: 'evt_cur' },
    { id: 'sp', kind: 'sponsor', status: 'queued', at: '2026-01-03', priority: 90, eventId: 'evt_cur' },
  ],
  {
    stage: 'resource',
    eventId: 'evt_cur',
    gaps: { needVenue: true, needVenueAlt: false, needSponsor: true, needVolunteer: false, missing: ['venue', 'sponsor'] },
  },
);
ok(evtPrio[0]?.id === 'cur', 'active event venue drains first');
ok(!evtPrio.some((x) => x.id === 'old'), 'other event excluded');
ok(!evtPrio.some((x) => x.id === 'legacy'), 'unscoped legacy outreach excluded from active event');
// RSVP stage still boosts open resource gaps over bare feedback
const rsvpGapPrio = prioritizeOutreachQueue(
  [
    { id: 'fb', kind: 'feedback_ask', status: 'queued', at: '2026-01-01', priority: 20 },
    { id: 'sp2', kind: 'sponsor', status: 'queued', at: '2026-01-02', priority: 90 },
    { id: 'r3', kind: 'rsvp_remind_t3d', status: 'queued', at: '2026-01-03', priority: 50 },
  ],
  {
    stage: 'rsvp',
    gaps: { needVenue: false, needVenueAlt: true, needSponsor: true, needVolunteer: false, missing: ['venue_alt', 'sponsor'] },
  },
);
ok(rsvpGapPrio[0]?.kind === 'sponsor', 'rsvp+gaps: sponsor before bare feedback');
ok(rsvpGapPrio.find((x) => x.kind === 'sponsor').priority > rsvpGapPrio.find((x) => x.kind === 'feedback_ask').priority, 'sponsor > feedback under rsvp gaps');
// venue_alt alias + primary gap + shortlist body boost (draft drain only)
ok(normalizeOutreachKind('venue_alt') === 'venue', 'normalize venue_alt → venue');
ok(normalizeOutreachKind('VENUE-ALT') === 'venue', 'normalize VENUE-ALT → venue');
const altPrio = prioritizeOutreachQueue(
  [
    { id: 'va', kind: 'venue_alt', status: 'queued', at: '2026-01-02', priority: 100, body: 'Ranked free SF options\n1. X (match 12)' },
    { id: 'sp3', kind: 'sponsor', status: 'queued', at: '2026-01-01', priority: 90, body: 'Need tab' },
  ],
  {
    stage: 'resource',
    gaps: { needVenue: false, needVenueAlt: true, needSponsor: true, needVolunteer: false, missing: ['venue_alt', 'sponsor'] },
  },
);
ok(altPrio[0]?.id === 'va', 'venue_alt drains as venue under venue_alt primary gap');
ok(altPrio[0].priority > altPrio.find((x) => x.id === 'sp3').priority, 'venue_alt+shortlist > sponsor');
ok(altPrio[0].readiness >= 4 || /shortlist/i.test(altPrio[0].drainWhy || ''), 'altPrio readiness/drainWhy');
// Draft readiness: shortlist body drains above thin venue stub at same base priority
const readyPrio = prioritizeOutreachQueue(
  [
    {
      id: 'thin',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-01',
      priority: 100,
      body: 'Need a room please for SF.',
      eventId: 'e1',
    },
    {
      id: 'rich',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-02',
      priority: 100,
      body:
        'Resource gaps: venue.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: { needVenue: true, needVenueAlt: false, needSponsor: false, needVolunteer: false, missing: ['venue'] },
  },
);
ok(readyPrio[0]?.id === 'rich', 'shortlist-ready venue drains before thin stub');
ok(outreachDraftReadiness(readyPrio[0]) > outreachDraftReadiness(readyPrio[1]), 'readiness ranks rich > thin');
ok(
  /venue|primary gap|shortlist|queued/i.test(outreachNextWhy(readyPrio[0], {
    stage: 'resource',
    gaps: { needVenue: true, missing: ['venue'] },
  }) || ''),
  'outreachNextWhy names gap + not sent',
);
// shortlist-ready only on free-list body — not sponsor honesty boilerplate
const sponsorBoiler = {
  kind: 'sponsor',
  status: 'queued',
  toEmail: 'potter@trydemigod.com',
  body:
    'Sponsor ask for drinks/tab. Events Bot (by Demigod). Draft queue only — no auto-send. Resource gaps: sponsor.',
};
ok(!outreachHasVenueShortlist(sponsorBoiler), 'sponsor boiler has no venue shortlist');
ok(
  !/shortlist-ready/i.test(
    outreachNextWhy(sponsorBoiler, {
      stage: 'resource',
      gaps: { needSponsor: true, missing: ['sponsor'] },
    }) || '',
  ),
  'sponsor boiler not labeled shortlist-ready',
);
ok(
  /contact-ready|sponsor gap|queued/i.test(
    outreachNextWhy(sponsorBoiler, {
      stage: 'resource',
      gaps: { needSponsor: true, missing: ['sponsor'] },
    }) || '',
  ),
  'sponsor boiler can be contact-ready',
);
// Contact-ready + rich sponsor body drains above thin no-email sponsor
const contactPrio = prioritizeOutreachQueue(
  [
    {
      id: 'thin_sp',
      kind: 'sponsor',
      status: 'queued',
      at: '2026-01-01',
      priority: 90,
      body: 'Need tab?',
    },
    {
      id: 'ready_sp',
      kind: 'sponsor',
      status: 'queued',
      at: '2026-01-02',
      priority: 90,
      toEmail: 'potter@trydemigod.com',
      body:
        'Need a drink sponsor / tab for twelve seats in SF. Events Bot (by Demigod). Draft queue only — no auto-send.',
    },
  ],
  {
    stage: 'resource',
    gaps: { needVenue: false, needSponsor: true, needVolunteer: false, missing: ['sponsor'] },
  },
);
ok(contactPrio[0]?.id === 'ready_sp', 'contact-ready sponsor drains before thin stub');
ok(
  outreachDraftReadiness(contactPrio[0]) > outreachDraftReadiness(contactPrio[1]),
  'sponsor readiness ranks contact body > thin',
);
// top-free-align: venue draft naming resourceGaps.topFreeVenue drains first
const topAlignPrio = prioritizeOutreachQueue(
  [
    {
      id: 'generic',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-01',
      priority: 100,
      body:
        'Resource gaps: venue.\nRanked free SF options I already scored (not booked):\n1. Some Other Room (match 10)\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
    {
      id: 'aligned',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-02',
      priority: 100,
      body:
        'Resource gaps: venue.\nTop free-list pick (heuristic, not booked): Startup office after-hours loan.\nRanked free SF options I already scored (not booked):\n1. Startup office after-hours loan · SoMa · match 18\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: {
      needVenue: true,
      needVenueAlt: false,
      needSponsor: false,
      needVolunteer: false,
      missing: ['venue'],
      topFreeVenue: {
        id: 'v_office_loan',
        name: 'Startup office after-hours loan',
        area: 'SoMa',
        score: 18,
      },
    },
  },
);
ok(topAlignPrio[0]?.id === 'aligned', 'top-free-align venue drains before generic shortlist');
ok(/top-free-align/i.test(topAlignPrio[0]?.drainWhy || ''), 'drainWhy names top-free-align');
ok(
  /top-free-align/i.test(
    outreachNextWhy(topAlignPrio[0], {
      stage: 'resource',
      gaps: {
        needVenue: true,
        missing: ['venue'],
        topFreeVenue: { id: 'v_office_loan', name: 'Startup office after-hours loan' },
      },
    }) || '',
  ),
  'outreachNextWhy names top-free-align',
);
// Sibling shortlist: thin venue sinks when rich shortlist exists same night
const sibPrio = prioritizeOutreachQueue(
  [
    {
      id: 'thin_sib',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-01',
      priority: 100,
      body: 'Need a room please.',
      eventId: 'e1',
    },
    {
      id: 'rich_sib',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-02',
      priority: 100,
      body:
        'Resource gaps: venue.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: { needVenue: true, needVenueAlt: false, needSponsor: false, needVolunteer: false, missing: ['venue'] },
  },
);
ok(sibPrio[0]?.id === 'rich_sib', 'sibling shortlist drains rich venue first');
ok(/sibling-shortlist/i.test(sibPrio.find((x) => x.id === 'thin_sib')?.drainWhy || ''), 'thin gets sibling-shortlist');
ok(
  sibPrio.find((x) => x.id === 'rich_sib').priority > sibPrio.find((x) => x.id === 'thin_sib').priority,
  'rich sibling priority > thin',
);
// Sibling rich sponsor: thin sponsor sinks
const sibSp = prioritizeOutreachQueue(
  [
    { id: 'sp_thin', kind: 'sponsor', status: 'queued', at: '2026-01-01', priority: 90, body: 'tab?', eventId: 'e1' },
    {
      id: 'sp_rich',
      kind: 'sponsor',
      status: 'queued',
      at: '2026-01-02',
      priority: 90,
      toEmail: 'potter@trydemigod.com',
      body:
        'Need a drink sponsor / tab for twelve seats in SF. Events Bot (by Demigod). Draft queue only — no auto-send.',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: { needVenue: false, needSponsor: true, needVolunteer: false, missing: ['sponsor'] },
  },
);
ok(sibSp[0]?.id === 'sp_rich', 'sibling-rich sponsor drains first');
ok(/sibling-rich/i.test(sibSp.find((x) => x.id === 'sp_thin')?.drainWhy || ''), 'thin sponsor sibling-rich');
// outreachDrainSummary: compact next + top (draft only)
const drainSum = outreachDrainSummary(
  [
    { id: 'a', kind: 'feedback_ask', status: 'queued', at: '2026-01-01', priority: 20, body: 'feedback?' },
    {
      id: 'b',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-02',
      priority: 100,
      body: 'Ranked free SF options\n1. X (match 12)\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: { needVenue: true, missing: ['venue'], needSponsor: false, needVolunteer: false },
    limit: 3,
  },
);
ok(drainSum.count === 1 && drainSum.next?.id === 'b', 'drainSummary next is venue');
ok(drainSum.next?.shortlist === true, 'drainSummary shortlist flag');
ok(Array.isArray(drainSum.top) && drainSum.top.length === 1, 'drainSummary top list');
ok(/Draft queue only|no auto-send/i.test(drainSum.note || ''), 'drainSummary honesty note');
// dup-kind: same night same kind — readiness winner first; losers marked dup-kind
const dupPrio = prioritizeOutreachQueue(
  [
    {
      id: 'dup_a',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-01',
      priority: 100,
      body: 'Need room.',
      eventId: 'e1',
    },
    {
      id: 'dup_b',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-02',
      priority: 100,
      body:
        'Resource gaps: venue.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
    {
      id: 'dup_c',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-03',
      priority: 100,
      body: 'Also need a loft?',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: { needVenue: true, needVenueAlt: false, needSponsor: false, needVolunteer: false, missing: ['venue'] },
  },
);
ok(dupPrio[0]?.id === 'dup_b', 'dup-kind winner is shortlist-ready venue');
ok(/kind-best/i.test(dupPrio[0]?.drainWhy || ''), 'winner drainWhy kind-best');
ok(
  dupPrio.filter((x) => x.id !== 'dup_b').every((x) => /dup-kind/i.test(x.drainWhy || '')),
  'non-winners marked dup-kind',
);
ok(
  dupPrio[0].priority > dupPrio.find((x) => x.id === 'dup_a').priority &&
    dupPrio[0].priority > dupPrio.find((x) => x.id === 'dup_c').priority,
  'kind-best priority > dup-kind losers',
);
// Daytime / weekday indoor → SFPL daytime-hours (inverse of after-hours library demote)
const daytimeTalk = matchFreeVenues({
  need: 'daytime free indoor talk salon Mission',
  seats: 12,
  limit: 2,
});
ok(
  daytimeTalk[0]?.id === 'v_mission_library' || /library/i.test(daytimeTalk[0]?.name || ''),
  'daytime free indoor prefers library',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'weekday lunch-and-learn free indoor talk',
    seats: 15,
    explain: true,
  }).reasons?.includes('daytime-hours'),
  'library gets daytime-hours reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'daytime free indoor talk',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'daytime free indoor talk',
      seats: 12,
    }),
  'daytime free: library beats office loan',
);
// Transit hub: Civic/Embarcadero/Ferry over Marina/Crissy
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'BART transit free meetup',
    seats: 20,
    explain: true,
  }).reasons?.includes('transit-hub'),
  'ferry gets transit-hub reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'Muni transit free indoor talk',
    seats: 20,
    explain: true,
  }).reasons?.includes('transit-hub'),
  'main library transit-hub for Muni/BART civic',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'BART transit free meetup',
    seats: 20,
    explain: true,
  }).reasons?.includes('transit-far'),
  'Crissy marked transit-far',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'BART transit free meetup',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
      need: 'BART transit free meetup',
      seats: 20,
    }),
  'transit: ferry beats Crissy',
);
const transitRank = matchFreeVenues({ need: 'BART transit free meetup', seats: 20, limit: 3 });
ok(
  transitRank[0] && !/crissy|marina green/i.test(transitRank[0].name || ''),
  'BART transit top not Crissy/Marina',
);
// alt-ready: venue_alt body with exclusion honesty drains before generic shortlist
const altReadyPrio = prioritizeOutreachQueue(
  [
    {
      id: 'gen_v',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-01',
      priority: 100,
      body:
        'Resource gaps: venue_alt.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
    {
      id: 'alt_v',
      kind: 'venue',
      status: 'queued',
      at: '2026-01-02',
      priority: 100,
      body:
        'Resource gaps: venue_alt.\nTop free-list pick (alt vs current pick) (heuristic, not booked): Ferry Building.\nRanked free SF options I already scored (not booked) — excluding current free_list pick:\n1. Ferry Building (match 14)\nDraft queue only — no auto-send.',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: {
      needVenue: false,
      needVenueAlt: true,
      needSponsor: false,
      needVolunteer: false,
      missing: ['venue_alt'],
    },
  },
);
ok(altReadyPrio[0]?.id === 'alt_v', 'alt-ready venue_alt body drains first');
ok(/alt-ready/i.test(altReadyPrio[0]?.drainWhy || ''), 'drainWhy names alt-ready');
// no-contact: same-kind real email sibling drains before missing-email draft
const noContactPrio = prioritizeOutreachQueue(
  [
    {
      id: 'no_em',
      kind: 'sponsor',
      status: 'queued',
      at: '2026-01-02',
      priority: 90,
      body:
        'Need a drink sponsor / tab for twelve seats in SF. Events Bot (by Demigod). Draft queue only — no auto-send.',
      eventId: 'e1',
    },
    {
      id: 'has_em',
      kind: 'sponsor',
      status: 'queued',
      at: '2026-01-01',
      priority: 90,
      toEmail: 'potter@trydemigod.com',
      body:
        'Need a drink sponsor / tab for twelve seats in SF. Events Bot (by Demigod). Draft queue only — no auto-send.',
      eventId: 'e1',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e1',
    gaps: { needVenue: false, needSponsor: true, needVolunteer: false, missing: ['sponsor'] },
  },
);
ok(noContactPrio[0]?.id === 'has_em', 'contactable sponsor drains before no-email sibling');
ok(/no-contact/i.test(noContactPrio.find((x) => x.id === 'no_em')?.drainWhy || ''), 'no-email marked no-contact');
// Pure venue resource body includes shortlist + top pick honesty
const vBody = buildVenueResourceOutreachBody(
  { title: 'Test', seats: 12, venue: { name: 'Park edge', area: 'Mission', cost: 'free public' }, notes: 'quiet indoor salon' },
  { missing: ['venue_alt'], topFreeVenue: null },
  { need: 'quiet indoor salon free', seats: 12 },
);
ok(/Ranked free SF|not booked|Draft queue only/i.test(vBody), 'venue resource body shortlist honesty');
ok(/Resource gaps: venue_alt/i.test(vBody), 'venue resource body gaps line');
ok(freeVenueShortlistLines('outdoor picnic', 40, 2).split('\n').length >= 2, 'freeVenueShortlistLines multi');
const gapEmpty = resourceGaps({
  activeEvent: { stage: 'resource', venue: null, seats: 12, title: 'SoMa salon' },
  offers: { sponsor: [], venue: [], volunteer: [] },
  outreach: [],
});
ok(gapEmpty.needVenue && gapEmpty.needSponsor && gapEmpty.needVolunteer, 'resourceGaps all open');
ok(gapEmpty.missing.includes('venue') && gapEmpty.missing.includes('sponsor'), 'resourceGaps missing list');
ok(gapEmpty.topFreeVenue?.id && gapEmpty.topFreeVenue?.score != null, 'resourceGaps topFreeVenue when need venue');
ok(gapEmpty.topFreeVenue?.capacity != null, 'resourceGaps topFreeVenue includes capacity');
const gapFilled = resourceGaps({
  activeEvent: {
    stage: 'plan',
    venue: { name: 'X', source: 'offer', cost: 'offer', confirmed: true, confirmationEvidence: 'Host confirmed by email' },
  },
  offers: {
    sponsor: [{ id: '1', status: 'accepted', city: 'San Francisco' }],
    volunteer: [{ id: '2', status: 'accepted', city: 'San Francisco' }],
  },
  outreach: [{ kind: 'venue', status: 'queued', toEmail: 'potter@trydemigod.com', subject: 'Venue', body: 'Find an SF venue.' }],
});
ok(
  !resourceOutreachCovered({ missing: ['venue_alt', 'sponsor'], queuedKinds: ['venue_alt'] }) &&
    resourceOutreachCovered({ missing: ['venue_alt', 'sponsor'], queuedKinds: ['venue', 'sponsor'] }),
  'resource outreach coverage requires a draft for every open gap',
);
const gapInvalidDraft = resourceGaps({
  activeEvent: { id: 'ev_bad_draft', venue: null },
  outreach: [
    { eventId: 'ev_bad_draft', kind: 'venue', status: 'queued', toEmail: 'noreply@example.com', subject: 'Venue', body: 'Find a room in SF.' },
  ],
});
ok(!gapInvalidDraft.queuedKinds.includes('venue'), 'invalid queued drafts cannot satisfy resource coverage');
ok(!gapFilled.needVenue && !gapFilled.needSponsor && !gapFilled.needVolunteer, 'resourceGaps filled');
const gapUnconfirmed = resourceGaps({ activeEvent: { venue: { name: 'X', source: 'offer', cost: 'offer' } } });
ok(!gapUnconfirmed.needVenueAlt && gapUnconfirmed.missing.includes('venue_confirmation'), 'resourceGaps keeps unconfirmed offer venue open');
const gapUndersized = resourceGaps({
  activeEvent: {
    seats: 12,
    venue: { name: 'Tiny room', capacity: 8, confirmed: true, confirmationEvidence: 'Host confirmed by email' },
  },
});
ok(!gapUndersized.hasConfirmedVenue && gapUndersized.missing.includes('venue_capacity'), 'resourceGaps rejects confirmed venue below target seats');
const gapUnaccepted = resourceGaps({
  activeEvent: { id: 'ev_gap', city: 'San Francisco' },
  offers: {
    sponsor: [{ id: '3', status: 'new', city: 'San Francisco' }],
    volunteer: [{ id: '4', status: 'matched', city: 'San Francisco' }],
  },
});
ok(gapUnaccepted.needSponsor && gapUnaccepted.needVolunteer, 'resourceGaps require human-accepted partners');
ok(gapFilled.queuedKinds.includes('venue'), 'resourceGaps queuedKinds');
ok(gapFilled.topFreeVenue == null, 'resourceGaps no topFree when solid offer venue');
const scopedGaps = resourceGaps({
  activeEvent: { id: 'current', stage: 'resource' },
  offers: { sponsor: [], venue: [], volunteer: [] },
  outreach: [
    { eventId: 'previous', kind: 'sponsor', status: 'queued', toEmail: 'potter@trydemigod.com', subject: 'Sponsor', body: 'Find an SF sponsor.' },
    { kind: 'venue', status: 'queued', toEmail: 'potter@trydemigod.com', subject: 'Venue', body: 'Find an SF venue.' },
    { eventId: 'current', kind: 'volunteer', status: 'queued', toEmail: 'potter@trydemigod.com', subject: 'Volunteer', body: 'Find an SF volunteer.' },
  ],
});
ok(
  !scopedGaps.queuedKinds.includes('sponsor') &&
    !scopedGaps.queuedKinds.includes('venue') &&
    scopedGaps.queuedKinds.includes('volunteer'),
  'resourceGaps scopes queued outreach to active event',
);
const scopedDrain = prioritizeOutreachQueue(
  [
    { id: 'old_sp', eventId: 'previous', kind: 'sponsor', status: 'queued', priority: 999 },
    { id: 'legacy', kind: 'venue', status: 'queued', priority: 80 },
    { id: 'current_vol', eventId: 'current', kind: 'volunteer', status: 'queued', priority: 70 },
  ],
  { eventId: 'current', stage: 'resource', gaps: scopedGaps },
);
ok(!scopedDrain.some((o) => o.id === 'old_sp'), 'draft drain excludes explicit prior-event drafts');
ok(!scopedDrain.some((o) => o.id === 'legacy'), 'draft drain excludes legacy unscoped drafts');
const scopedOfferGaps = resourceGaps({
  activeEvent: { id: 'current', stage: 'resource' },
  offers: {
    sponsor: [{ id: 'old', city: 'San Francisco', eventId: 'previous' }],
    volunteer: [{ id: 'oak', city: 'Oakland', eventId: 'current' }],
  },
});
ok(
  scopedOfferGaps.needSponsor && scopedOfferGaps.needVolunteer,
  'resourceGaps ignores other-event and non-SF offers',
);

// Sunday indoor: SFPL closed — office/in-kind over free library (draft match only)
const sundayIndoor = matchFreeVenues({
  need: 'Sunday indoor free talk salon',
  seats: 12,
  limit: 3,
});
ok(
  sundayIndoor[0] && !/library/i.test(sundayIndoor[0].name || ''),
  'Sunday indoor free top not SFPL library',
);
ok(
  sundayIndoor[0]?.id === 'v_office_loan' || /office|loan/i.test(sundayIndoor[0]?.name || ''),
  'Sunday indoor free prefers office loan',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'Sunday free indoor talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('library-sunday'),
  'mission library library-sunday on Sunday need',
);
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'Sunday free indoor talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('free-ask'),
  'Sunday library skips free-ask bonus',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'Sunday free indoor talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('sunday-open'),
  'office gets sunday-open reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'Sunday free indoor talk',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'Sunday free indoor talk',
      seats: 12,
    }),
  'Sunday indoor: office beats library',
);
// Valencia corridor → Mission free-list cluster
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'Valencia free indoor salon talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('area'),
  'Valencia area-hits Mission library',
);
const valenciaRank = matchFreeVenues({
  need: 'Valencia corridor free indoor salon',
  seats: 12,
  limit: 2,
});
ok(
  valenciaRank[0] && /mission|dolores|office/i.test(valenciaRank[0].name || valenciaRank[0].area || ''),
  'Valencia indoor prefers Mission/office cluster',
);
// ADA / wheelchair → indoor reserve/office; demote free public outdoor
const adaIndoor = matchFreeVenues({
  need: 'wheelchair accessible indoor free talk SF',
  seats: 15,
  limit: 3,
});
ok(
  adaIndoor[0] && !/park|parklet|promenade|green|gardens|dolores|crissy/i.test(adaIndoor[0].name || ''),
  'accessible indoor top not free public outdoor',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'ADA accessible free indoor talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('accessible-room'),
  'library accessible-room for ADA need',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'wheelchair accessible free talk',
    seats: 20,
    explain: true,
  }).reasons?.includes('not-accessible'),
  'dolores not-accessible for wheelchair need',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'step-free accessible free indoor salon',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_hayes_green'), {
      need: 'step-free accessible free indoor salon',
      seats: 15,
    }),
  'accessible: Main Library beats Hayes green lawn',
);
// Holiday indoor: SFPL closed — office/in-kind over free library (parallel to Sunday)
const holidayIndoor = matchFreeVenues({
  need: 'Memorial Day free indoor talk salon',
  seats: 15,
  limit: 3,
});
ok(
  holidayIndoor[0] && !/library/i.test(holidayIndoor[0].name || ''),
  'Memorial Day indoor free top not SFPL library',
);
ok(
  holidayIndoor[0]?.id === 'v_office_loan' || /office|loan/i.test(holidayIndoor[0]?.name || ''),
  'Memorial Day indoor free prefers office loan',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'federal holiday free indoor talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('library-holiday'),
  'mission library library-holiday on federal holiday need',
);
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'Thanksgiving free indoor talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('free-ask'),
  'holiday library skips free-ask bonus',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'Labor Day free indoor salon',
    seats: 12,
    explain: true,
  }).reasons?.includes('holiday-open'),
  'office gets holiday-open reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'Christmas free indoor talk',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'Christmas free indoor talk',
      seats: 12,
    }),
  'holiday indoor: office beats library',
);
// Outdoor holiday party must not trigger library-hours demote (not a closed-room ask)
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'holiday party free outdoor picnic Mission',
    seats: 30,
    explain: true,
  }).reasons?.includes('library-holiday'),
  'holiday party outdoor skips library-holiday',
);
// ADA outdoor: flat promenade/elevator parks beat steep lawns; no blanket not-accessible
const adaOutdoor = matchFreeVenues({
  need: 'wheelchair accessible outdoor picnic free',
  seats: 20,
  limit: 3,
});
ok(
  adaOutdoor[0] &&
    (adaOutdoor[0].id === 'v_embarcadero_bench' ||
      adaOutdoor[0].id === 'v_ferry_arcade' ||
      adaOutdoor[0].id === 'v_salesforce_park' ||
      adaOutdoor[0].id === 'v_yerba_buena' ||
      /embarcadero|ferry|salesforce|yerba/i.test(adaOutdoor[0].name || '')),
  'accessible outdoor tops flatter path venue',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'wheelchair accessible outdoor meetup free',
    seats: 20,
    explain: true,
  }).reasons?.includes('accessible-path'),
  'embarcadero gets accessible-path for outdoor ADA',
);
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'wheelchair accessible outdoor meetup free',
    seats: 20,
    explain: true,
  }).reasons?.includes('not-accessible'),
  'outdoor ADA does not blanket not-accessible promenade',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'wheelchair accessible outdoor picnic free',
    seats: 20,
    explain: true,
  }).reasons?.includes('steep-lawn'),
  'dolores steep-lawn soft demote on outdoor ADA',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'step-free outdoor free meetup',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'step-free outdoor free meetup',
      seats: 15,
    }),
  'outdoor ADA: embarcadero beats dolores steep lawn',
);
// stroller synonym → accessible-room on indoor free talk
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'stroller accessible free indoor talk',
    seats: 12,
    explain: true,
  }).reasons?.includes('accessible-room'),
  'stroller indoor gets accessible-room',
);
// Dog-friendly outdoor: Crissy/Dolores over Salesforce roof (typically no dogs)
const dogPark = matchFreeVenues({
  need: 'dog friendly park free SF',
  seats: 25,
  limit: 3,
});
ok(
  dogPark[0] &&
    (dogPark[0].id === 'v_crissy' ||
      dogPark[0].id === 'v_dolores' ||
      /crissy|dolores/i.test(dogPark[0].name || '')),
  'dog-friendly tops Crissy or Dolores: ' + (dogPark[0]?.id || 'none'),
);
ok(
  !dogPark.some((v) => v.id === 'v_salesforce_park') ||
    dogPark.findIndex((v) => v.id === 'v_salesforce_park') >
      dogPark.findIndex((v) => v.id === 'v_crissy' || v.id === 'v_dolores'),
  'dog-friendly: Salesforce not above dog parks',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'off-leash dog walk free SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('dog-friendly'),
  'crissy dog-friendly reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
    need: 'dog friendly park free SF',
    seats: 25,
    explain: true,
  }).reasons?.includes('no-dogs'),
  'salesforce no-dogs on dog ask',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'dog friendly park free SF',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'dog friendly park free SF',
      seats: 25,
    }),
  'dog-friendly: Dolores beats Salesforce roof',
);
// Covered / wind-fog outdoor: Ferry arcade over open lawns/waterfront
const coveredOut = matchFreeVenues({
  need: 'covered outdoor free SF hang',
  seats: 20,
  limit: 3,
});
ok(
  coveredOut[0]?.id === 'v_ferry_arcade' || /ferry|arcade/i.test(coveredOut[0]?.name || ''),
  'covered outdoor tops Ferry arcade: ' + (coveredOut[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'sheltered outdoor meetup free SF',
    seats: 15,
    explain: true,
  }).reasons?.includes('covered'),
  'ferry covered reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'covered outdoor free SF hang',
    seats: 20,
    explain: true,
  }).reasons?.includes('exposed'),
  'dolores exposed on covered outdoor',
);
const windFog = matchFreeVenues({
  need: 'windy fog outdoor hang free SF',
  seats: 20,
  limit: 3,
});
ok(
  windFog[0] &&
    (windFog[0].id === 'v_ferry_arcade' ||
      windFog[0].id === 'v_yerba_buena' ||
      /ferry|arcade|yerba/i.test(windFog[0].name || '')),
  'wind/fog outdoor prefers shelter edge: ' + (windFog[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'windy fog outdoor hang free SF',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
      need: 'windy fog outdoor hang free SF',
      seats: 20,
    }),
  'wind/fog: Ferry arcade beats open Crissy',
);
// Honesty: "Embarcadero" must not false-match /arcade/ substring as covered
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'covered outdoor free SF hang',
    seats: 20,
    explain: true,
  }).reasons?.includes('covered'),
  'embarcadero does not false-match arcade substring as covered',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'covered outdoor free SF hang',
    seats: 20,
    explain: true,
  }).reasons?.includes('exposed'),
  'embarcadero exposed on covered outdoor (open promenade)',
);
// Sunrise east / sunset west bay-facing honesty (draft match only)
const sunriseHang = matchFreeVenues({
  need: 'sunrise outdoor free hang SF',
  seats: 20,
  limit: 3,
});
ok(
  sunriseHang[0] &&
    (sunriseHang[0].id === 'v_embarcadero_bench' ||
      sunriseHang[0].id === 'v_ferry_arcade' ||
      /embarcadero|ferry/i.test(sunriseHang[0].name || '')),
  'sunrise outdoor tops east bay (Embarcadero/Ferry): ' + (sunriseHang[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'sunrise outdoor free hang SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('sunrise-east'),
  'embarcadero sunrise-east reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'sunrise outdoor free hang SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('not-sunrise-bay'),
  'dolores not-sunrise-bay on sunrise outdoor',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'sunrise outdoor free hang SF',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'sunrise outdoor free hang SF',
      seats: 20,
    }),
  'sunrise: Embarcadero beats inland South Park lawn',
);
const sunsetHang = matchFreeVenues({
  need: 'sunset outdoor free hang SF',
  seats: 20,
  limit: 3,
});
ok(
  sunsetHang[0] &&
    (sunsetHang[0].id === 'v_crissy' || /crissy|marina/i.test(sunsetHang[0].name || '')),
  'sunset outdoor tops west bay Crissy/Marina: ' + (sunsetHang[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'sunset outdoor free hang SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('sunset-west'),
  'crissy sunset-west reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'sunset outdoor free hang SF',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
      need: 'sunset outdoor free hang SF',
      seats: 20,
    }),
  'sunset: Crissy west beats Embarcadero east',
);
// golden hour (no bare sunset) still accepts either bayfront via waterfront path
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'golden hour waterfront free meetup',
    seats: 20,
    explain: true,
  }).reasons?.includes('waterfront') &&
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
      need: 'golden hour waterfront free meetup',
      seats: 20,
      explain: true,
    }).reasons?.includes('sunrise-east'),
  'golden hour does not demote Embarcadero as sunrise-east',
);
// Photo walk / street photography → scenic outdoor free-list (draft match only)
const photoWalk = matchFreeVenues({
  need: 'photo walk free SF street photography',
  seats: 15,
  limit: 3,
});
ok(
  photoWalk[0] &&
    [
      'v_embarcadero_bench',
      'v_crissy',
      'v_ferry_arcade',
      'v_yerba_buena',
      'v_salesforce_park',
    ].includes(photoWalk[0].id),
  'photo walk tops scenic outdoor: ' + (photoWalk[0]?.id || 'none'),
);
ok(
  photoWalk[0] && !/library|office loan|café|cafe buyout/i.test(photoWalk[0].name || ''),
  'photo walk top not library/office/café',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'photo walk free SF',
    seats: 15,
    explain: true,
  }).reasons?.includes('photo-walk'),
  'embarcadero photo-walk reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'photo walk free SF',
    seats: 15,
    explain: true,
  }).reasons?.includes('photo-indoor'),
  'library photo-indoor on photo walk',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'architecture walk free SF',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'architecture walk free SF',
      seats: 12,
    }),
  'architecture walk: Embarcadero beats library',
);
// evening photo walk still outdoor scenic (outdoorAsked via photo walk — not evening-outdoor sink)
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'evening photo walk free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('photo-walk') &&
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
      need: 'evening photo walk free SF',
      seats: 12,
      explain: true,
    }).reasons?.includes('evening-outdoor'),
  'evening photo walk keeps outdoor scenic (no evening-outdoor sink)',
);
// Farmers market / market day → Ferry Building arcade (draft match only — not booked)
const farmersMkt = matchFreeVenues({
  need: 'farmers market hang free SF',
  seats: 20,
  limit: 3,
});
ok(
  farmersMkt[0]?.id === 'v_ferry_arcade' || /ferry/i.test(farmersMkt[0]?.name || ''),
  'farmers market tops Ferry arcade: ' + (farmersMkt[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'farmers market hang free SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('farmers-market'),
  'ferry farmers-market reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'farmers market hang free SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('not-market'),
  'dolores not-market on farmers market',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'market day hang free outdoor',
    seats: 18,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'market day hang free outdoor',
      seats: 18,
    }),
  'market day outdoor: Ferry beats Salesforce lawn',
);
// Capacity honesty: Ferry arcade cap 20 under-caps hard 30-seat market asks (not a booking claim)
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'market day hang free outdoor',
    seats: 30,
    explain: true,
  }).reasons?.includes('under-cap') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
      need: 'market day hang free outdoor',
      seats: 30,
      explain: true,
    }).reasons?.includes('under-cap-hard'),
  'ferry under-cap on 30-seat market day (capacity honesty)',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'farmers market hang free SF',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'farmers market hang free SF',
      seats: 15,
    }),
  'farmers market: Ferry beats library',
);
// Art walk / gallery hop / First Friday → Yerba Buena cultural corridor (draft only)
const artWalk = matchFreeVenues({
  need: 'art walk gallery hop free SF',
  seats: 20,
  limit: 3,
});
ok(
  artWalk[0] &&
    ['v_yerba_buena', 'v_salesforce_park', 'v_embarcadero_bench', 'v_ferry_arcade', 'v_soma_parklet'].includes(
      artWalk[0].id,
    ),
  'art walk tops cultural corridor: ' + (artWalk[0]?.id || 'none'),
);
ok(
  artWalk[0] && !/crissy|marina|library|office loan/i.test(artWalk[0].name || ''),
  'art walk top not Crissy/library/office',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
    need: 'art walk gallery hop free SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('art-walk') &&
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
      need: 'art walk gallery hop free SF',
      seats: 20,
      explain: true,
    }).reasons?.includes('culture-corridor'),
  'yerba art-walk + culture-corridor reasons',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
    need: 'art walk gallery hop free SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('art-far'),
  'crissy art-far on art walk',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
    need: 'first friday gallery walk outdoor SoMa',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
      need: 'first friday gallery walk outdoor SoMa',
      seats: 25,
    }),
  'first friday: Yerba SoMa beats Crissy',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
    need: 'museum meetup free outdoor',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_crissy'), {
      need: 'museum meetup free outdoor',
      seats: 15,
    }),
  'museum meetup: Yerba beats Crissy',
);
// Book club / lightning talks / office hours — free SF venue format honesty (draft only)
const bookClub = matchFreeVenues({ need: 'book club free SF', seats: 12, limit: 3 });
ok(
  bookClub[0] && /library/i.test(bookClub[0].name || ''),
  'book club tops SFPL room: ' + (bookClub[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'book club free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('book-club'),
  'mission library book-club reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'book club free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('book-outdoor'),
  'dolores book-outdoor on book club',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'book club free SF',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'book club free SF',
      seats: 12,
    }),
  'book club: Mission library beats South Park lawn',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'reading circle free SF',
    seats: 10,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
      need: 'reading circle free SF',
      seats: 10,
    }),
  'reading circle: Main library beats Ferry arcade',
);
// Plural "talks" must trigger indoor (was \btalk\b only — lightning talks missed)
const lightTalks = matchFreeVenues({
  need: 'lightning talks free SoMa',
  seats: 20,
  limit: 3,
});
ok(
  lightTalks[0] &&
    !/park|lawn|green|promenade|crissy|dolores|parklet/i.test(lightTalks[0].name || ''),
  'lightning talks not outdoor lawn: ' + (lightTalks[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'lightning talks free SoMa',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'lightning talks free SoMa',
      seats: 20,
    }),
  'lightning talks: office loan beats South Park lawn',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'tech talks free indoor Mission',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'tech talks free indoor Mission',
      seats: 15,
    }),
  'tech talks: library beats Dolores',
);
const officeHrs = matchFreeVenues({
  need: 'founder office hours free indoor SoMa',
  seats: 12,
  limit: 2,
});
ok(
  officeHrs[0]?.id === 'v_office_loan' || /office/i.test(officeHrs[0]?.name || ''),
  'office hours tops office loan: ' + (officeHrs[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'founder office hours free indoor SoMa',
    seats: 12,
    explain: true,
  }).reasons?.includes('office-hours'),
  'office loan office-hours reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'office hours free indoor',
    seats: 10,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'office hours free indoor',
      seats: 10,
    }),
  'office hours: office loan beats Mission library',
);
// Study group / language exchange / writing circle → SFPL quiet free rooms (draft only)
const studyGrp = matchFreeVenues({ need: 'study group free SF', seats: 10, limit: 3 });
ok(
  studyGrp[0] && /library/i.test(studyGrp[0].name || ''),
  'study group tops SFPL room: ' + (studyGrp[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'study group free SF',
    seats: 10,
    explain: true,
  }).reasons?.includes('study-quiet'),
  'mission library study-quiet reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'study group free SF',
    seats: 10,
    explain: true,
  }).reasons?.includes('study-outdoor'),
  'dolores study-outdoor on study group',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'study group free SF',
    seats: 10,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'study group free SF',
      seats: 10,
    }),
  'study group: Main library beats South Park lawn',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'language exchange free Mission',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'language exchange free Mission',
      seats: 12,
    }),
  'language exchange: library beats Dolores',
);
const langEx = matchFreeVenues({ need: 'language exchange free Mission', seats: 12, limit: 2 });
ok(
  langEx[0] && !/park|lawn|green|promenade|dolores|parklet/i.test(langEx[0].name || ''),
  'language exchange not outdoor lawn: ' + (langEx[0]?.id || 'none'),
);
const writeCircle = matchFreeVenues({ need: 'writing circle free indoor SF', seats: 8, limit: 3 });
ok(
  writeCircle[0] && /library/i.test(writeCircle[0].name || ''),
  'writing circle tops SFPL: ' + (writeCircle[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'writing workshop free SF',
    seats: 10,
    explain: true,
  }).reasons?.includes('study-quiet'),
  'main library study-quiet on writing workshop',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'homework hang free indoor',
    seats: 8,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_cafe_sponsor'), {
      need: 'homework hang free indoor',
      seats: 8,
    }),
  'homework hang: free library beats sponsor-tab café',
);
// Book club path still separate (book-club reason, not study-quiet)
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'book club free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('book-club') &&
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'book club free SF',
      seats: 12,
      explain: true,
    }).reasons?.includes('study-quiet'),
  'book club keeps book-club reason (not study-quiet)',
);
// Code night / pair programming → office/loan collab over parks (draft match only)
const codeNight = matchFreeVenues({
  need: 'code night pair programming free SoMa',
  seats: 15,
  limit: 3,
});
ok(
  codeNight[0]?.id === 'v_office_loan' || /office|loan/i.test(codeNight[0]?.name || ''),
  'code night tops office loan: ' + (codeNight[0]?.id || 'none'),
);
ok(
  codeNight[0] && !/park|lawn|green|promenade|parklet|dolores/i.test(codeNight[0].name || ''),
  'code night not outdoor lawn: ' + (codeNight[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'code night free SoMa',
    seats: 15,
    explain: true,
  }).reasons?.includes('code-collab'),
  'office loan code-collab reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
    need: 'code night free SoMa',
    seats: 15,
    explain: true,
  }).reasons?.includes('code-outdoor') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'code night free SoMa',
      seats: 15,
      explain: true,
    }).reasons?.includes('indoor-only'),
  'parklet code-outdoor or indoor-only on code night',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'pair programming free SoMa',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'pair programming free SoMa',
      seats: 12,
    }),
  'pair programming: office beats SoMa parklet',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'hack night free SoMa',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'hack night free SoMa',
      seats: 15,
    }),
  'hack night: office beats Mission library',
);
// Toastmasters / public speaking → SFPL quiet free rooms over parks (draft only)
const toastM = matchFreeVenues({ need: 'toastmasters public speaking free SF', seats: 15, limit: 3 });
ok(
  toastM[0] && /library/i.test(toastM[0].name || ''),
  'toastmasters tops SFPL room: ' + (toastM[0]?.id || 'none'),
);
ok(
  toastM[0] && !/park|lawn|green|promenade|parklet|ferry|dolores/i.test(toastM[0].name || ''),
  'toastmasters not outdoor/public hang: ' + (toastM[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'public speaking free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('public-speaking'),
  'mission library public-speaking reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'public speaking free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('speaking-outdoor'),
  'dolores speaking-outdoor on public speaking',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'toastmasters free SF',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'toastmasters free SF',
      seats: 15,
    }),
  'toastmasters: Main library beats South Park lawn',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'speech club free indoor SF',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_cafe_sponsor'), {
      need: 'speech club free indoor SF',
      seats: 12,
    }),
  'speech club: free library beats sponsor-tab café',
);
// Fireside / roundtable → SFPL quiet; career fair → office/loan; writing sprint → study-quiet
const fireside = matchFreeVenues({ need: 'fireside chat founders free SF', seats: 15, limit: 3 });
ok(
  fireside[0] && /library/i.test(fireside[0].name || ''),
  'fireside tops SFPL room: ' + (fireside[0]?.id || 'none'),
);
ok(
  fireside[0] && !/park|lawn|green|promenade|parklet|dolores|ferry/i.test(fireside[0].name || ''),
  'fireside not outdoor hang: ' + (fireside[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'fireside chat free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('seated-discussion'),
  'mission library seated-discussion reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
    need: 'fireside chat free SF',
    seats: 12,
    explain: true,
  }).reasons?.includes('discussion-outdoor'),
  'dolores discussion-outdoor on fireside',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'roundtable discussion free Mission',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'roundtable discussion free Mission',
      seats: 15,
    }),
  'roundtable: Mission library beats Dolores',
);
const careerFair = matchFreeVenues({ need: 'career fair free SoMa', seats: 30, limit: 3 });
ok(
  careerFair[0]?.id === 'v_office_loan' || /office|loan/i.test(careerFair[0]?.name || ''),
  'career fair tops office loan: ' + (careerFair[0]?.id || 'none'),
);
ok(
  careerFair[0] && !/park|lawn|green|promenade|parklet|dolores/i.test(careerFair[0].name || ''),
  'career fair not outdoor lawn: ' + (careerFair[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'career fair free SoMa',
    seats: 30,
    explain: true,
  }).reasons?.includes('career-fair'),
  'office loan career-fair reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
    need: 'career fair free SoMa',
    seats: 30,
    explain: true,
  }).reasons?.includes('career-outdoor') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
      need: 'career fair free SoMa',
      seats: 30,
      explain: true,
    }).reasons?.includes('indoor-only'),
  'yerba career-outdoor or indoor-only on career fair',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'job fair free SoMa',
    seats: 40,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'job fair free SoMa',
      seats: 40,
    }),
  'job fair: office beats Dolores',
);
// Investor pitch / product launch (no "indoor"/"demo day") → office, not free parks
const investorPitch = matchFreeVenues({ need: 'investor pitch free SoMa', seats: 30, limit: 3 });
ok(
  investorPitch[0]?.id === 'v_office_loan' || /office|loan/i.test(investorPitch[0]?.name || ''),
  'investor pitch tops office loan: ' + (investorPitch[0]?.id || 'none'),
);
ok(
  investorPitch[0] && !/park|lawn|green|promenade|parklet|dolores|yerba/i.test(investorPitch[0].name || ''),
  'investor pitch not outdoor lawn: ' + (investorPitch[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'investor pitch free SoMa',
    seats: 30,
    explain: true,
  }).reasons?.includes('demo-format'),
  'office loan demo-format on investor pitch',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
    need: 'investor pitch free SoMa',
    seats: 30,
    explain: true,
  }).reasons?.includes('demo-outdoor') ||
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
      need: 'investor pitch free SoMa',
      seats: 30,
      explain: true,
    }).reasons?.includes('indoor-only'),
  'yerba demo-outdoor or indoor-only on investor pitch',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'investor pitch free SoMa',
    seats: 30,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'investor pitch free SoMa',
      seats: 30,
    }),
  'investor pitch: office beats Salesforce Park',
);
const productLaunch = matchFreeVenues({ need: 'product launch free SoMa', seats: 35, limit: 3 });
ok(
  productLaunch[0]?.id === 'v_office_loan' || /office|loan/i.test(productLaunch[0]?.name || ''),
  'product launch tops office loan: ' + (productLaunch[0]?.id || 'none'),
);
ok(
  productLaunch[0] && !/park|lawn|green|promenade|parklet|dolores/i.test(productLaunch[0].name || ''),
  'product launch not outdoor lawn: ' + (productLaunch[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'product launch free SoMa',
    seats: 35,
    explain: true,
  }).reasons?.includes('demo-format'),
  'office demo-format on product launch',
);
// LAN party / esports — "party" must not crown park lawns
const lanParty = matchFreeVenues({ need: 'LAN party free SoMa', seats: 20, limit: 3 });
ok(
  lanParty[0]?.id === 'v_office_loan' || /office|loan/i.test(lanParty[0]?.name || ''),
  'LAN party tops office loan: ' + (lanParty[0]?.id || 'none'),
);
ok(
  lanParty[0] && !/park|lawn|green|promenade|parklet|dolores|yerba/i.test(lanParty[0].name || ''),
  'LAN party not outdoor lawn: ' + (lanParty[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'LAN party free indoor SoMa',
    seats: 20,
    explain: true,
  }).reasons?.includes('lan-gaming'),
  'office lan-gaming reason on LAN party',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'esports free indoor SoMa',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'esports free indoor SoMa',
      seats: 20,
    }),
  'esports: office beats parklet',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'gaming tournament free indoor SoMa',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'gaming tournament free indoor SoMa',
      seats: 25,
    }),
  'gaming tournament: office beats Salesforce Park',
);
// Outdoor social party still parks (not flipped by LAN fix)
const blockParty = matchFreeVenues({ need: 'block party free outdoor Mission', seats: 40, limit: 2 });
ok(
  blockParty[0] && /park|lawn|green|dolores|outdoor|picnic/i.test(blockParty[0].name || ''),
  'block party still outdoor: ' + (blockParty[0]?.id || 'none'),
);
// Maker night / press / hybrid AV / crypto meetup residual → office, not free lawns
const makerNight = matchFreeVenues({ need: 'maker night free SoMa', seats: 25, limit: 3 });
ok(
  makerNight[0]?.id === 'v_office_loan' || /office|loan/i.test(makerNight[0]?.name || ''),
  'maker night tops office loan: ' + (makerNight[0]?.id || 'none'),
);
ok(
  makerNight[0] && !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce/i.test(makerNight[0].name || ''),
  'maker night not outdoor lawn: ' + (makerNight[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'maker night free SoMa',
    seats: 25,
    explain: true,
  }).reasons?.includes('maker-hardware'),
  'office maker-hardware reason on maker night',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'makerspace free indoor Mission',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'makerspace free indoor Mission',
      seats: 20,
    }),
  'makerspace: office beats parklet',
);
const pressConf = matchFreeVenues({ need: 'press conference free SoMa', seats: 30, limit: 3 });
ok(
  pressConf[0]?.id === 'v_office_loan' || /office|loan/i.test(pressConf[0]?.name || ''),
  'press conference tops office loan: ' + (pressConf[0]?.id || 'none'),
);
ok(
  pressConf[0] && !/park|lawn|green|promenade|parklet|dolores|yerba/i.test(pressConf[0].name || ''),
  'press conference not outdoor lawn: ' + (pressConf[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'press conference free SoMa',
    seats: 30,
    explain: true,
  }).reasons?.includes('press-media'),
  'office press-media reason on press conference',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'media day free SoMa',
    seats: 30,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'media day free SoMa',
      seats: 30,
    }),
  'media day: office beats Salesforce Park',
);
const hybridMeet = matchFreeVenues({ need: 'hybrid meetup free SoMa', seats: 25, limit: 3 });
ok(
  hybridMeet[0]?.id === 'v_office_loan' || /office|loan/i.test(hybridMeet[0]?.name || ''),
  'hybrid meetup tops office loan: ' + (hybridMeet[0]?.id || 'none'),
);
ok(
  hybridMeet[0] && !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce/i.test(hybridMeet[0].name || ''),
  'hybrid meetup not outdoor lawn: ' + (hybridMeet[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'hybrid meetup free SoMa',
    seats: 25,
    explain: true,
  }).reasons?.includes('hybrid-room'),
  'office hybrid-room reason on hybrid meetup',
);
// Hybrid + outdoor picnic still parks (not flipped)
const hybridPicnic = matchFreeVenues({ need: 'hybrid outdoor picnic free', seats: 30, limit: 2 });
ok(
  hybridPicnic[0] && /park|lawn|green|dolores|outdoor|picnic|parklet|hayes/i.test(hybridPicnic[0].name || ''),
  'hybrid outdoor picnic still outdoor: ' + (hybridPicnic[0]?.id || 'none'),
);
const cryptoMeet = matchFreeVenues({ need: 'crypto meetup free SoMa', seats: 25, limit: 3 });
ok(
  cryptoMeet[0]?.id === 'v_office_loan' || /office|loan/i.test(cryptoMeet[0]?.name || ''),
  'crypto meetup tops office loan: ' + (cryptoMeet[0]?.id || 'none'),
);
ok(
  cryptoMeet[0] && !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce/i.test(cryptoMeet[0].name || ''),
  'crypto meetup not outdoor lawn: ' + (cryptoMeet[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'crypto meetup free SoMa',
    seats: 25,
    explain: true,
  }).reasons?.includes('tech-meetup'),
  'office tech-meetup reason on crypto meetup',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'web3 meetup free Mission',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'web3 meetup free Mission',
      seats: 25,
    }),
  'web3 meetup: office beats Salesforce Park',
);
// Bare networking meetup still outdoor walk venues (not flipped by tech-meetup)
const fidiNetStill = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
ok(
  fidiNetStill[0] &&
    !/office|loan|library/i.test(fidiNetStill[0].name || '') &&
    /embarcadero|crissy|promenade|park|meetup|bench|yerba|salesforce|ferry|arcade|green|marina/i.test(
      fidiNetStill[0].name || '',
    ),
  'FiDi networking meetup still outdoor walk: ' + (fidiNetStill[0]?.id || 'none'),
);

// Free SF venue residual: AI/ML/Python/startup|tech meetup · design sprint · karaoke
// (draft match only — not a booking API; bare founders/networking still outdoor)
const aiMeet = matchFreeVenues({ need: 'AI meetup free SoMa', seats: 25, limit: 3 });
ok(
  aiMeet[0]?.id === 'v_office_loan' || /office|loan|library/i.test(aiMeet[0]?.name || ''),
  'AI meetup tops office/library indoor: ' + (aiMeet[0]?.id || 'none'),
);
ok(
  aiMeet[0] && !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce/i.test(aiMeet[0].name || ''),
  'AI meetup not outdoor lawn: ' + (aiMeet[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'AI meetup free SoMa',
    seats: 25,
    explain: true,
  }).reasons?.includes('tech-meetup'),
  'office tech-meetup reason on AI meetup',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'Python meetup free Mission',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_dolores'), {
      need: 'Python meetup free Mission',
      seats: 25,
    }),
  'Python meetup: office beats Dolores',
);
const techMeet = matchFreeVenues({ need: 'tech meetup free SoMa', seats: 25, limit: 3 });
ok(
  techMeet[0]?.id === 'v_office_loan' || /office|loan|library/i.test(techMeet[0]?.name || ''),
  'tech meetup tops office/library: ' + (techMeet[0]?.id || 'none'),
);
ok(
  techMeet[0] && !/park|lawn|green|promenade|parklet|dolores/i.test(techMeet[0].name || ''),
  'tech meetup not outdoor lawn: ' + (techMeet[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'startup meetup free SoMa',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'startup meetup free SoMa',
      seats: 25,
    }),
  'startup meetup: office beats Salesforce Park',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'data science meetup free',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'data science meetup free',
      seats: 25,
    }),
  'data science meetup: office beats parklet',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'ML night free SoMa',
    seats: 25,
    explain: true,
  }).reasons?.includes('tech-meetup'),
  'office tech-meetup reason on ML night',
);
// Outdoor picnic + AI still parks (not flipped)
const aiPicnic = matchFreeVenues({ need: 'AI outdoor picnic free', seats: 30, limit: 2 });
ok(
  aiPicnic[0] && /park|lawn|green|dolores|outdoor|picnic|parklet|hayes/i.test(aiPicnic[0].name || ''),
  'AI outdoor picnic still outdoor: ' + (aiPicnic[0]?.id || 'none'),
);
// Bare founders meetup still outdoor social (not tech-label)
const foundersMeet = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
ok(
  foundersMeet[0] &&
    !/office|loan|library/i.test(foundersMeet[0].name || '') &&
    /park|lawn|green|promenade|meetup|bench|yerba|salesforce|ferry|arcade|marina|embarcadero|dolores/i.test(
      foundersMeet[0].name || '',
    ),
  'founders meetup still outdoor social: ' + (foundersMeet[0]?.id || 'none'),
);

const designSprint = matchFreeVenues({ need: 'design sprint free', seats: 20, limit: 3 });
ok(
  designSprint[0] &&
    (/office|loan|library/i.test(designSprint[0].name || '') ||
      designSprint[0].id === 'v_office_loan' ||
      /library/i.test(designSprint[0].id || '')),
  'design sprint tops office/library indoor: ' + (designSprint[0]?.id || 'none'),
);
ok(
  designSprint[0] &&
    !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce/i.test(designSprint[0].name || ''),
  'design sprint not outdoor lawn: ' + (designSprint[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'design sprint free',
    seats: 20,
    explain: true,
  }).reasons?.includes('demo-format'),
  'office demo-format on design sprint',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'design sprint free',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'design sprint free',
      seats: 20,
    }),
  'design sprint: office beats parklet',
);

const karaoke = matchFreeVenues({ need: 'karaoke free SoMa', seats: 20, limit: 3 });
ok(
  karaoke[0]?.id === 'v_office_loan' || /office|loan/i.test(karaoke[0]?.name || ''),
  'karaoke tops office loan: ' + (karaoke[0]?.id || 'none'),
);
ok(
  karaoke[0] && !/park|lawn|green|promenade|parklet|dolores|library/i.test(karaoke[0].name || ''),
  'karaoke not outdoor or library: ' + (karaoke[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'karaoke free SoMa',
    seats: 20,
    explain: true,
  }).reasons?.includes('performance'),
  'office performance reason on karaoke',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'karaoke night free',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
      need: 'karaoke night free',
      seats: 20,
    }),
  'karaoke night: office beats library (amp)',
);

ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'hiring night free SoMa',
    seats: 25,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'hiring night free SoMa',
      seats: 25,
    }),
  'hiring night: office beats Salesforce Park',
);

// Free-venue residual: co-working hyphen, UX research, watch/listening party indoor,
// standup meeting ≠ comedy, stroller walk paths, cooking/tasting, trivia, salsa, pop-up market
const coworkHyphen = matchFreeVenues({ need: 'co-working free all day', seats: 20, limit: 2 });
ok(
  coworkHyphen[0]?.id === 'v_office_loan' || /office|loan/i.test(coworkHyphen[0]?.name || ''),
  'co-working hyphen tops office: ' + (coworkHyphen[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'co-working free all day',
    seats: 20,
    explain: true,
  }).reasons?.includes('all-day'),
  'co-working hyphen all-day reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'co-working free all day',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_hayes_green'), {
      need: 'co-working free all day',
      seats: 20,
    }),
  'co-working: office beats Hayes lawn',
);

const uxTest = matchFreeVenues({ need: 'user testing free SoMa', seats: 12, limit: 3 });
ok(
  uxTest[0]?.id === 'v_office_loan' || /office|loan/i.test(uxTest[0]?.name || ''),
  'user testing tops office: ' + (uxTest[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'UX research session free',
    seats: 8,
    explain: true,
  }).reasons?.includes('ux-research'),
  'office ux-research reason',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'usability test free SF',
    seats: 10,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'usability test free SF',
      seats: 10,
    }),
  'usability test: office beats parklet',
);

const watchParty = matchFreeVenues({ need: 'watch party free', seats: 20, limit: 2 });
ok(
  watchParty[0] && !/park|lawn|green|promenade|parklet|dolores|crissy|yerba/i.test(watchParty[0].name || ''),
  'watch party not outdoor: ' + (watchParty[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'watch party free',
    seats: 20,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'watch party free',
      seats: 20,
    }),
  'watch party: library beats parklet (not outdoor party)',
);
const listenParty = matchFreeVenues({ need: 'listening party free vinyl', seats: 15, limit: 2 });
ok(
  listenParty[0] && !/park|lawn|green|promenade|parklet|dolores|crissy/i.test(listenParty[0].name || ''),
  'listening party not outdoor: ' + (listenParty[0]?.id || 'none'),
);

// Agile standup meeting must not trip comedy performance (amp / no-library)
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'standup meeting free',
    seats: 12,
    explain: true,
  }).reasons?.includes('performance'),
  'standup meeting is not performance',
);
ok(
  !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'daily standup free SF',
    seats: 10,
    explain: true,
  }).reasons?.includes('no-amp-library'),
  'daily standup does not demote library as comedy',
);
const standupComedy = matchFreeVenues({ need: 'standup comedy free', seats: 20, limit: 2 });
ok(
  standupComedy[0]?.id === 'v_office_loan' || /office|loan/i.test(standupComedy[0]?.name || ''),
  'standup comedy tops office: ' + (standupComedy[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'standup comedy free',
    seats: 20,
    explain: true,
  }).reasons?.includes('performance'),
  'standup comedy performance reason',
);

const strollerWalk = matchFreeVenues({ need: 'stroller walk free', seats: 15, limit: 2 });
ok(
  strollerWalk[0] &&
    /embarcadero|salesforce|ferry|yerba|promenade|roof/i.test(
      (strollerWalk[0].name || '') + ' ' + (strollerWalk[0].area || ''),
    ),
  'stroller walk tops accessible outdoor path: ' + (strollerWalk[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'stroller walk free',
    seats: 15,
    explain: true,
  }).reasons?.includes('accessible-path'),
  'embarcadero accessible-path on stroller walk',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_embarcadero_bench'), {
    need: 'stroller walk free',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'stroller walk free',
      seats: 15,
    }),
  'stroller walk: promenade beats library',
);

const cooking = matchFreeVenues({ need: 'cooking class free SoMa', seats: 15, limit: 2 });
// Kitchen/dining lead preferred over bare office loan (v_community_dining food-class shortlist).
ok(
  cooking[0]?.id === 'v_community_dining' ||
    cooking[0]?.id === 'v_office_loan' ||
    /dining|kitchen|office|loan/i.test(cooking[0]?.name || ''),
  'cooking class tops kitchen/office indoor: ' + (cooking[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'wine tasting free',
    seats: 12,
    explain: true,
  }).reasons?.includes('food-class'),
  'office food-class on wine tasting',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'cooking class free SoMa',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'cooking class free SoMa',
      seats: 15,
    }),
  'cooking class: office beats parklet',
);

const trivia = matchFreeVenues({ need: 'trivia night free SF', seats: 20, limit: 2 });
ok(
  trivia[0] && !/park|lawn|green|promenade|parklet|dolores/i.test(trivia[0].name || ''),
  'trivia night not outdoor: ' + (trivia[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'trivia night free SF',
    seats: 20,
    explain: true,
  }).reasons?.includes('trivia-night'),
  'office trivia-night reason',
);

const salsa = matchFreeVenues({ need: 'salsa night free', seats: 20, limit: 2 });
ok(
  salsa[0]?.id === 'v_office_loan' || /office|loan/i.test(salsa[0]?.name || ''),
  'salsa night tops office: ' + (salsa[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
    need: 'improv workshop free',
    seats: 15,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
      need: 'improv workshop free',
      seats: 15,
    }),
  'improv workshop: office beats library (amp)',
);

// Ferry arcade cap 20 — use ≤20 seats so capacity honesty does not crown Embarcadero
const popupMkt = matchFreeVenues({ need: 'pop-up market free', seats: 18, limit: 2 });
ok(
  popupMkt[0]?.id === 'v_ferry_arcade' || /ferry/i.test(popupMkt[0]?.name || ''),
  'pop-up market tops Ferry arcade: ' + (popupMkt[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'night market free outdoor',
    seats: 18,
    explain: true,
  }).reasons?.includes('farmers-market'),
  'ferry farmers-market on night market',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
    need: 'pop-up market free',
    seats: 18,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'pop-up market free',
      seats: 18,
    }),
  'pop-up market: ferry beats library',
);

const writeSprint = matchFreeVenues({ need: 'writing sprint free SF', seats: 10, limit: 3 });
ok(
  writeSprint[0] && /library/i.test(writeSprint[0].name || ''),
  'writing sprint tops SFPL: ' + (writeSprint[0]?.id || 'none'),
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
    need: 'writing sprint free SF',
    seats: 10,
    explain: true,
  }).reasons?.includes('study-quiet'),
  'main library study-quiet on writing sprint',
);
ok(
  scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
    need: 'design critique free SF',
    seats: 12,
  }) >
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'design critique free SF',
      seats: 12,
    }),
  'design critique: library beats South Park lawn',
);

// Free SF venue residual-2 (draft only): outdoor sports/cleanup/swaps · maker build|ship|repair ·
// wine|beer club + coffee cupping order · nature walk (not SFPL default)
{
  const soccerPickup = matchFreeVenues({ need: 'soccer pickup free', seats: 15, limit: 2 });
  ok(
    soccerPickup[0] &&
      !/library|office|loan/i.test(soccerPickup[0].name || '') &&
      /park|lawn|green|parklet|dolores|hayes|outdoor|picnic|promenade|yerba|salesforce|marina|crissy/i.test(
        soccerPickup[0].name || '',
      ),
    'soccer pickup tops outdoor free-list: ' + (soccerPickup[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'soccer pickup free',
      seats: 15,
      explain: true,
    }).reasons?.includes('outdoor-activity'),
    'soccer pickup outdoor-activity reason',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'soccer pickup free',
      seats: 15,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
        need: 'soccer pickup free',
        seats: 15,
      }),
    'soccer pickup: parklet beats SFPL',
  );

  const volCleanup = matchFreeVenues({ need: 'volunteer cleanup free', seats: 20, limit: 2 });
  ok(
    volCleanup[0] && !/library|office|loan/i.test(volCleanup[0].name || ''),
    'volunteer cleanup tops outdoor: ' + (volCleanup[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'litter pickup free',
      seats: 15,
      explain: true,
    }).reasons?.includes('outdoor-activity'),
    'litter pickup outdoor-activity reason',
  );

  const plantSwap = matchFreeVenues({ need: 'plant swap free', seats: 15, limit: 2 });
  ok(
    plantSwap[0] && !/library|office|loan/i.test(plantSwap[0].name || ''),
    'plant swap tops outdoor free-list: ' + (plantSwap[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
      need: 'clothing swap free',
      seats: 15,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
        need: 'clothing swap free',
        seats: 15,
      }),
    'clothing swap: parklet beats SFPL',
  );

  const natureWalk = matchFreeVenues({ need: 'nature walk free', seats: 15, limit: 2 });
  ok(
    natureWalk[0] && !/library|office|loan/i.test(natureWalk[0].name || ''),
    'nature walk tops outdoor: ' + (natureWalk[0]?.id || 'none'),
  );

  const buildNight = matchFreeVenues({ need: 'build night free', seats: 20, limit: 2 });
  ok(
    buildNight[0]?.id === 'v_office_loan' || /office|loan/i.test(buildNight[0]?.name || ''),
    'build night tops office loan: ' + (buildNight[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'build night free',
      seats: 20,
      explain: true,
    }).reasons?.includes('maker-hardware'),
    'build night maker-hardware reason',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'ship night free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'ship night free',
        seats: 20,
      }),
    'ship night: office beats ferry arcade',
  );

  const repairCafe = matchFreeVenues({ need: 'repair cafe free', seats: 15, limit: 2 });
  ok(
    repairCafe[0]?.id === 'v_office_loan' || /office|loan/i.test(repairCafe[0]?.name || ''),
    'repair cafe tops office: ' + (repairCafe[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'tool library free',
      seats: 15,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
        need: 'tool library free',
        seats: 15,
      }),
    'tool library: office beats SFPL (not a book room)',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
      need: 'tool library free',
      seats: 15,
      explain: true,
    }).reasons?.includes('maker-library'),
    'tool library demotes SFPL maker-library',
  );

  const wineClub = matchFreeVenues({ need: 'wine club free', seats: 12, limit: 2 });
  ok(
    wineClub[0]?.id === 'v_community_dining' ||
      wineClub[0]?.id === 'v_office_loan' ||
      /dining|kitchen|office|loan/i.test(wineClub[0]?.name || ''),
    'wine club tops kitchen/office indoor (not park/SFPL): ' + (wineClub[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'beer club free',
      seats: 12,
      explain: true,
    }).reasons?.includes('food-class'),
    'beer club food-class reason',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'cupping free coffee',
      seats: 12,
      explain: true,
    }).reasons?.includes('food-class'),
    'cupping free coffee food-class (order residual)',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'cupping free coffee',
      seats: 12,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'cupping free coffee',
        seats: 12,
      }),
    'cupping free coffee: office beats ferry arcade',
  );

  // Regression: bare founders meetup still outdoor social
  const foundersStill = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersStill[0] && !/office|loan|library/i.test(foundersStill[0].name || ''),
    'founders meetup still outdoor after residual-2: ' + (foundersStill[0]?.id || 'none'),
  );
  // Regression: craft night still maker office
  const craftStill = matchFreeVenues({ need: 'craft night free', seats: 15, limit: 2 });
  ok(
    craftStill[0]?.id === 'v_office_loan' || /office|loan/i.test(craftStill[0]?.name || ''),
    'craft night still office after residual-2: ' + (craftStill[0]?.id || 'none'),
  );
}

// Free SF venue residual-3 (draft only): community tech affinity · *tech verticals ·
// conference · poetry/spoken word · gallery/museum · indoor potluck · office tour
// (was: women in tech → parklet; poetry slam → bare free; gallery opening → SFPL default)
{
  const womenTech = matchFreeVenues({ need: 'women in tech free SoMa', seats: 20, limit: 2 });
  ok(
    womenTech[0]?.id === 'v_office_loan' ||
      /office|loan|library/i.test(womenTech[0]?.name || ''),
    'women in tech tops office/library indoor: ' + (womenTech[0]?.id || 'none'),
  );
  ok(
    womenTech[0] &&
      !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce/i.test(womenTech[0].name || ''),
    'women in tech not outdoor lawn: ' + (womenTech[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'women in tech free SoMa',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'office tech-meetup reason on women in tech',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'women in tech free SoMa',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
        need: 'women in tech free SoMa',
        seats: 20,
      }),
    'women in tech: office beats parklet',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'women who code free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_hayes_green'), {
        need: 'women who code free',
        seats: 20,
      }),
    'women who code: office beats Hayes lawn',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'girls who code free',
      seats: 15,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'girls who code tech-meetup reason',
  );

  const climateTech = matchFreeVenues({ need: 'climate tech free', seats: 20, limit: 2 });
  ok(
    climateTech[0] &&
      (/office|loan|library/i.test(climateTech[0].name || '') ||
        climateTech[0].id === 'v_office_loan'),
    'climate tech tops office/library: ' + (climateTech[0]?.id || 'none'),
  );
  ok(
    climateTech[0] && !/park|lawn|green|promenade|parklet|dolores/i.test(climateTech[0].name || ''),
    'climate tech not outdoor lawn: ' + (climateTech[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'fintech meetup free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'fintech meetup tech-meetup reason',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'fintech meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'fintech meetup free',
        seats: 20,
      }),
    'fintech meetup: office beats ferry (was meetup-fit outdoor)',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'devrel meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
        need: 'devrel meetup free',
        seats: 20,
      }),
    'devrel meetup: office beats parklet',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'blockchain conference free indoor',
      seats: 25,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'blockchain conference tech-meetup (conference = meetupish)',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'blockchain conference free indoor',
      seats: 25,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
        need: 'blockchain conference free indoor',
        seats: 25,
      }),
    'blockchain conference: office beats parklet',
  );

  const poetry = matchFreeVenues({ need: 'poetry slam free', seats: 20, limit: 2 });
  ok(
    poetry[0]?.id === 'v_office_loan' || /office|loan/i.test(poetry[0]?.name || ''),
    'poetry slam tops office loan: ' + (poetry[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'poetry slam free',
      seats: 20,
      explain: true,
    }).reasons?.includes('performance'),
    'office performance reason on poetry slam',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'spoken word free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_main_library'), {
        need: 'spoken word free',
        seats: 20,
      }),
    'spoken word: office beats library (amp)',
  );

  const galleryOpen = matchFreeVenues({ need: 'gallery opening free', seats: 20, limit: 2 });
  ok(
    galleryOpen[0] &&
      (galleryOpen[0].id === 'v_yerba_buena' ||
        /yerba|salesforce|south park|embarcadero|ferry/i.test(galleryOpen[0].name || '')),
    'gallery opening tops cultural outdoor corridor: ' + (galleryOpen[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
      need: 'gallery opening free',
      seats: 20,
      explain: true,
    }).reasons?.includes('art-walk'),
    'yerba art-walk on gallery opening',
  );
  const museumFree = matchFreeVenues({ need: 'museum free first tuesday', seats: 20, limit: 2 });
  ok(
    museumFree[0] &&
      (museumFree[0].id === 'v_yerba_buena' || /yerba|salesforce|south park/i.test(museumFree[0].name || '')),
    'museum free tops Yerba cultural edge: ' + (museumFree[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_yerba_buena'), {
      need: 'museum free first tuesday',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
        need: 'museum free first tuesday',
        seats: 20,
      }),
    'museum free: Yerba beats SFPL default',
  );

  const potluckIn = matchFreeVenues({ need: 'potluck free indoor', seats: 15, limit: 2 });
  ok(
    potluckIn[0]?.id === 'v_community_dining' ||
      potluckIn[0]?.id === 'v_office_loan' ||
      /dining|kitchen|office|loan/i.test(potluckIn[0]?.name || ''),
    'indoor potluck tops kitchen/office indoor (not SFPL): ' + (potluckIn[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'potluck free indoor',
      seats: 15,
      explain: true,
    }).reasons?.includes('food-class'),
    'office food-class on indoor potluck',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'potluck free indoor',
      seats: 15,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_mission_library'), {
        need: 'potluck free indoor',
        seats: 15,
      }),
    'indoor potluck: office beats SFPL',
  );
  // Outdoor potluck picnic still parks (food-class does not flip)
  const potluckOut = matchFreeVenues({ need: 'potluck free outdoor picnic', seats: 20, limit: 2 });
  ok(
    potluckOut[0] &&
      !/library|office|loan/i.test(potluckOut[0].name || '') &&
      /park|lawn|green|picnic|parklet|dolores|hayes|outdoor/i.test(potluckOut[0].name || ''),
    'outdoor potluck picnic still outdoor: ' + (potluckOut[0]?.id || 'none'),
  );

  const officeTour = matchFreeVenues({ need: 'office tour free SoMa', seats: 20, limit: 2 });
  ok(
    officeTour[0]?.id === 'v_office_loan' || /office|loan/i.test(officeTour[0]?.name || ''),
    'office tour tops office loan: ' + (officeTour[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'office tour free SoMa',
      seats: 20,
      explain: true,
    }).reasons?.includes('office-tour'),
    'office-tour reason on office tour',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'office tour free SoMa',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_soma_parklet'), {
        need: 'office tour free SoMa',
        seats: 20,
      }),
    'office tour: office beats parklet',
  );

  // Regressions: bare founders + FiDi networking still outdoor social
  const foundersR3 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR3[0] && !/office|loan|library/i.test(foundersR3[0].name || ''),
    'founders meetup still outdoor after residual-3: ' + (foundersR3[0]?.id || 'none'),
  );
  const fidiR3 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR3[0] && !/office|loan|library/i.test(fidiR3[0].name || ''),
    'FiDi networking still outdoor after residual-3: ' + (fidiR3[0]?.id || 'none'),
  );
  const karaokeR3 = matchFreeVenues({ need: 'karaoke free SoMa', seats: 20, limit: 2 });
  ok(
    karaokeR3[0]?.id === 'v_office_loan' || /office|loan/i.test(karaokeR3[0]?.name || ''),
    'karaoke still office after residual-3: ' + (karaokeR3[0]?.id || 'none'),
  );
}

// Free SF venue residual-5 (draft only): eng verticals + product/ops labels +
// skip walk-hang meetup-fit on maker/UX (parity residual-4 tech) + ship day maker
// (was: mlops/frontend/product mgmt → ferry; hardware/robotics/UX tied ferry; ship day → lawn)
{
  const engNeeds = [
    'mlops meetup free',
    'frontend meetup free',
    'backend meetup free',
    'platform eng meetup free',
    'product management meetup free',
    'sales eng meetup free',
    'aws meetup free',
    'observability meetup free',
    'deep learning meetup free',
  ];
  for (const need of engNeeds) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' tech-meetup reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (was meetup-fit hang)',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang: ' + (top?.id || 'none'),
    );
  }

  // Maker/hardware: skip meetup-fit so office beats ferry (was 17–17 tie)
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'hardware meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'hardware meetup free',
        seats: 20,
      }),
    'hardware meetup: office beats ferry (meetup-fit skip)',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'robotics meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'robotics meetup free',
        seats: 20,
      }),
    'robotics meetup: office beats ferry (meetup-fit skip)',
  );
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
      need: 'hardware meetup free',
      seats: 20,
      explain: true,
    }).reasons?.includes('meetup-fit'),
    'hardware meetup: ferry has no meetup-fit',
  );

  // UX research meetup: skip meetup-fit (was office=ferry 17)
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'ux research meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'ux research meetup free',
        seats: 20,
      }),
    'ux research meetup: office beats ferry',
  );

  // ship day (not only ship night) → maker office, not free lawn
  const shipDay = matchFreeVenues({ need: 'ship day free', seats: 20, limit: 2 });
  ok(
    shipDay[0]?.id === 'v_office_loan' || /office|loan/i.test(shipDay[0]?.name || ''),
    'ship day tops office loan: ' + (shipDay[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'ship day free',
      seats: 20,
      explain: true,
    }).reasons?.includes('maker-hardware'),
    'office maker-hardware on ship day',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'ship day free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_hayes_green'), {
        need: 'ship day free',
        seats: 20,
      }),
    'ship day: office beats Hayes lawn',
  );

  // Regressions: bare founders + FiDi networking still outdoor; fintech still indoor
  const foundersR5 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR5[0] && !/office|loan|library/i.test(foundersR5[0].name || ''),
    'founders meetup still outdoor after residual-5: ' + (foundersR5[0]?.id || 'none'),
  );
  const fidiR5 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR5[0] && !/office|loan|library/i.test(fidiR5[0].name || ''),
    'FiDi networking still outdoor after residual-5: ' + (fidiR5[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'fintech meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'fintech meetup free',
        seats: 20,
      }),
    'fintech still office > ferry after residual-5',
  );
  const karaokeR5 = matchFreeVenues({ need: 'karaoke free SoMa', seats: 20, limit: 2 });
  ok(
    karaokeR5[0]?.id === 'v_office_loan' || /office|loan/i.test(karaokeR5[0]?.name || ''),
    'karaoke still office after residual-5: ' + (karaokeR5[0]?.id || 'none'),
  );
}

// Free SF venue residual-6 (draft only): design systems / figma / product|ux|ui design +
// growth/content/product marketing + customer success → office (was ferry meetup-fit)
// (was: design systems/figma/product design/growth marketing → ferry 17 vs office 6)
{
  const designGtmNeeds = [
    'design systems meetup free',
    'figma meetup free',
    'product design meetup free',
    'ux design meetup free',
    'ui design meetup free',
    'brand design meetup free',
    'service design meetup free',
    'growth marketing meetup free',
    'content marketing meetup free',
    'product marketing meetup free',
    'customer success meetup free',
    'demand gen meetup free',
  ];
  for (const need of designGtmNeeds) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' tech-meetup reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (was meetup-fit hang)',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang: ' + (top?.id || 'none'),
    );
  }

  // Strong solo (no meetup token) — parity fintech/climate residual-5
  for (const need of [
    'design systems free',
    'figma free',
    'product design free',
    'customer success free',
    'growth marketing free',
  ]) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' solo tech-meetup reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ' solo: office beats ferry',
    );
  }

  // Regressions: bare founders + FiDi networking still outdoor; eng residual-5 still indoor
  const foundersR6 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR6[0] && !/office|loan|library/i.test(foundersR6[0].name || ''),
    'founders meetup still outdoor after residual-6: ' + (foundersR6[0]?.id || 'none'),
  );
  const fidiR6 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR6[0] && !/office|loan|library/i.test(fidiR6[0].name || ''),
    'FiDi networking still outdoor after residual-6: ' + (fidiR6[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'mlops meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'mlops meetup free',
        seats: 20,
      }),
    'mlops still office > ferry after residual-6',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'fintech meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'fintech meetup free',
        seats: 20,
      }),
    'fintech still office > ferry after residual-6',
  );
  const karaokeR6 = matchFreeVenues({ need: 'karaoke free SoMa', seats: 20, limit: 2 });
  ok(
    karaokeR6[0]?.id === 'v_office_loan' || /office|loan/i.test(karaokeR6[0]?.name || ''),
    'karaoke still office after residual-6: ' + (karaokeR6[0]?.id || 'none'),
  );
}

// Free SF venue residual-7 (draft only): people/ops · sales GTM · brand/seo/email/social-media
// marketing · community manager · TPM/solutions · no-code · a11y · user research
// (was: ferry/plaza meetup-fit; social media false outdoor via bare "social")
{
  const residual7Needs = [
    'people ops meetup free',
    'talent ops meetup free',
    'recruiter meetup free',
    'hr meetup free',
    'legal ops meetup free',
    'finance ops meetup free',
    'sales meetup free',
    'sdr meetup free',
    'bdr meetup free',
    'account executive meetup free',
    'sales enablement meetup free',
    'partnerships meetup free',
    'bizdev meetup free',
    'revenue ops meetup free',
    'brand marketing meetup free',
    'seo meetup free',
    'email marketing meetup free',
    'social media marketing meetup free',
    'community manager meetup free',
    'community ops meetup free',
    'technical program manager meetup free',
    'tpm meetup free',
    'solutions architect meetup free',
    'webflow meetup free',
    'no code meetup free',
    'a11y meetup free',
    'accessibility meetup free',
    'content design meetup free',
    'user research meetup free',
    'product analytics meetup free',
  ];
  for (const need of residual7Needs) {
    const reasonKey = /user research|design research|research ops/i.test(need)
      ? 'ux-research'
      : 'tech-meetup';
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes(reasonKey),
      need + ' ' + reasonKey + ' reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (was meetup-fit hang)',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang: ' + (top?.id || 'none'),
    );
  }

  // Strong solo (no meetup token) — parity residual-6
  for (const need of [
    'people ops free',
    'sdr free',
    'social media marketing free',
    'webflow free',
    'a11y free',
    'technical program manager free',
  ]) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' solo tech-meetup reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ' solo: office beats ferry',
    );
  }

  // social media must not trip outdoor "social" hang (residual-7 honesty)
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_salesforce_park'), {
      need: 'social media marketing meetup free',
      seats: 20,
      explain: true,
    }).reasons?.includes('outdoor-fit'),
    'social media marketing: no outdoor-fit on park',
  );
  // founders social still outdoor soft hang
  const foundersSocial = matchFreeVenues({
    need: 'founders social free SoMa',
    seats: 20,
    limit: 1,
  })[0];
  ok(
    foundersSocial && !/office|loan|library/i.test(foundersSocial.name || ''),
    'founders social still outdoor after residual-7: ' + (foundersSocial?.id || 'none'),
  );
  // sales happy hour stays drinks/outdoor stack (not office tech-meetup)
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup (mixer language)',
  );

  // Regressions: bare founders + FiDi networking still outdoor; design residual-6 still indoor
  const foundersR7 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR7[0] && !/office|loan|library/i.test(foundersR7[0].name || ''),
    'founders meetup still outdoor after residual-7: ' + (foundersR7[0]?.id || 'none'),
  );
  const fidiR7 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR7[0] && !/office|loan|library/i.test(fidiR7[0].name || ''),
    'FiDi networking still outdoor after residual-7: ' + (fidiR7[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'design systems meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'design systems meetup free',
        seats: 20,
      }),
    'design systems still office > ferry after residual-7',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'mlops meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'mlops meetup free',
        seats: 20,
      }),
    'mlops still office > ferry after residual-7',
  );
  const karaokeR7 = matchFreeVenues({ need: 'karaoke free SoMa', seats: 20, limit: 2 });
  ok(
    karaokeR7[0]?.id === 'v_office_loan' || /office|loan/i.test(karaokeR7[0]?.name || ''),
    'karaoke still office after residual-7: ' + (karaokeR7[0]?.id || 'none'),
  );
}

// Free SF venue residual-8 (draft only): product manager/PM · AE/CSM/EM · sales ops ·
// channel sales · account manager · support eng · interview prep/mock · system design ·
// portfolio review · technical writing · knowledge share · postmortem/incident review
// (was: ferry meetup-fit hang; team-ops postmortem tied ferry via meetup-fit)
{
  const residual8Needs = [
    'product manager meetup free',
    'pm meetup free',
    'ae meetup free',
    'csm meetup free',
    'em meetup free',
    'sales ops meetup free',
    'channel sales meetup free',
    'account manager meetup free',
    'support eng meetup free',
    'interview prep meetup free',
    'mock interview free',
    'system design meetup free',
    'portfolio review free',
    'technical writing meetup free',
    'tech writing free',
    'knowledge share meetup free',
    'postmortem meetup free',
    'incident review free',
    'engineering manager free',
    'product managers free',
  ];
  for (const need of residual8Needs) {
    const reasonKey = /postmortem|incident review|blameless/i.test(need)
      ? 'team-ops'
      : 'tech-meetup';
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes(reasonKey),
      need + ' ' + reasonKey + ' reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (was meetup-fit hang)',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang: ' + (top?.id || 'none'),
    );
  }

  // Strong solo (no meetup token) — parity residual-7
  for (const need of [
    'product manager free',
    'sales ops free',
    'csm free',
    'interview prep free',
    'system design free',
    'technical writing free',
    'engineering manager free',
  ]) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' solo tech-meetup reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ' solo: office beats ferry',
    );
  }

  // team-ops postmortem must not trip ferry meetup-fit (residual-8 honesty)
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
      need: 'postmortem meetup free',
      seats: 20,
      explain: true,
    }).reasons?.includes('meetup-fit'),
    'postmortem meetup: no meetup-fit on ferry',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'postmortem meetup free',
      seats: 20,
      explain: true,
    }).reasons?.includes('team-ops'),
    'postmortem meetup: team-ops on office',
  );

  // Mixer language still outdoor / not tech-meetup
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup after residual-8',
  );

  // Regressions: bare founders + FiDi networking still outdoor; residual-7 still indoor
  const foundersR8 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR8[0] && !/office|loan|library/i.test(foundersR8[0].name || ''),
    'founders meetup still outdoor after residual-8: ' + (foundersR8[0]?.id || 'none'),
  );
  const fidiR8 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR8[0] && !/office|loan|library/i.test(fidiR8[0].name || ''),
    'FiDi networking still outdoor after residual-8: ' + (fidiR8[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'people ops meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'people ops meetup free',
        seats: 20,
      }),
    'people ops still office > ferry after residual-8',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'design systems meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'design systems meetup free',
        seats: 20,
      }),
    'design systems still office > ferry after residual-8',
  );
  const karaokeR8 = matchFreeVenues({ need: 'karaoke free SoMa', seats: 20, limit: 2 });
  ok(
    karaokeR8[0]?.id === 'v_office_loan' || /office|loan/i.test(karaokeR8[0]?.name || ''),
    'karaoke still office after residual-8: ' + (karaokeR8[0]?.id || 'none'),
  );
}

// Free SF venue residual-9 (draft only): staff engineer / SWE · software engineer ·
// DEI/ERG · coding interview · QBR / quarterly business review
// (was: ferry meetup-fit hang; QBR tied/lost via free-ask outdoor)
{
  const residual9Needs = [
    'staff engineer meetup free',
    'staff eng meetup free',
    'staff swe meetup free',
    'software engineer meetup free',
    'software eng meetup free',
    'swe meetup free',
    'dei meetup free',
    'erg meetup free',
    'employee resource group free',
    'coding interview free',
    'coding interview prep free',
    'qbr meetup free',
    'quarterly business review free',
  ];
  for (const need of residual9Needs) {
    const reasonKey = /qbr|quarterly business review/i.test(need) ? 'team-ops' : 'tech-meetup';
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes(reasonKey),
      need + ' ' + reasonKey + ' reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (was meetup-fit hang)',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang: ' + (top?.id || 'none'),
    );
  }

  // Strong solo (no meetup token) — parity residual-8
  for (const need of [
    'staff engineer free',
    'software engineer free',
    'swe free',
    'coding interview free',
    'dei free',
    'erg free',
    'qbr free',
  ]) {
    const reasonKey = /^qbr\b/i.test(need) ? 'team-ops' : 'tech-meetup';
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes(reasonKey),
      need + ' solo ' + reasonKey + ' reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ' solo: office beats ferry',
    );
  }

  // QBR team-ops honesty (parity residual-8 postmortem)
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
      need: 'qbr meetup free',
      seats: 20,
      explain: true,
    }).reasons?.includes('meetup-fit'),
    'qbr meetup: no meetup-fit on ferry',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'qbr meetup free',
      seats: 20,
      explain: true,
    }).reasons?.includes('team-ops'),
    'qbr meetup: team-ops on office',
  );

  // Mixer language still outdoor / not tech-meetup
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup after residual-9',
  );

  // Regressions: bare founders + FiDi networking still outdoor; residual-8 still indoor
  const foundersR9 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR9[0] && !/office|loan|library/i.test(foundersR9[0].name || ''),
    'founders meetup still outdoor after residual-9: ' + (foundersR9[0]?.id || 'none'),
  );
  const fidiR9 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR9[0] && !/office|loan|library/i.test(fidiR9[0].name || ''),
    'FiDi networking still outdoor after residual-9: ' + (fidiR9[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'product manager meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'product manager meetup free',
        seats: 20,
      }),
    'product manager still office > ferry after residual-9',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'postmortem meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'postmortem meetup free',
        seats: 20,
      }),
    'postmortem still office > ferry after residual-9',
  );
}

// Free SF venue residual-10 (draft only): principal/distinguished engineer ·
// people partner / HRBP · skip-level · onboarding cohort
// (was: ferry meetup-fit hang / free-ask outdoor tops library or park)
{
  const residual10Tech = [
    'principal engineer meetup free',
    'principal eng meetup free',
    'distinguished engineer hang free',
    'distinguished eng free',
    'people partner meetup free',
    'people partner free',
    'hrbp meetup free',
    'hr business partner free',
  ];
  for (const need of residual10Tech) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' tech-meetup reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (was meetup-fit/free-ask hang)',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang: ' + (top?.id || 'none'),
    );
  }

  const residual10Ops = [
    'skip-level meeting free',
    'skip level free',
    'skip-level free',
    'onboarding cohort free',
    'new hire onboarding free',
    'employee onboarding free',
    'new hire orientation free',
  ];
  for (const need of residual10Ops) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('team-ops'),
      need + ' team-ops reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (team-ops residual-10)',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
  }

  // Strong solo (no meetup token)
  for (const need of [
    'principal engineer free',
    'distinguished engineer free',
    'people partner free',
    'hrbp free',
    'skip-level free',
    'onboarding cohort free',
  ]) {
    const reasonKey = /skip-level|onboarding/i.test(need) ? 'team-ops' : 'tech-meetup';
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes(reasonKey),
      need + ' solo ' + reasonKey + ' reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ' solo: office beats ferry',
    );
  }

  // Mixer language still outdoor / not tech-meetup
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup after residual-10',
  );

  // Regressions: bare founders + FiDi networking still outdoor; residual-9 still indoor
  const foundersR10 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR10[0] && !/office|loan|library/i.test(foundersR10[0].name || ''),
    'founders meetup still outdoor after residual-10: ' + (foundersR10[0]?.id || 'none'),
  );
  const fidiR10 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR10[0] && !/office|loan|library/i.test(fidiR10[0].name || ''),
    'FiDi networking still outdoor after residual-10: ' + (fidiR10[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'staff engineer meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'staff engineer meetup free',
        seats: 20,
      }),
    'staff engineer still office > ferry after residual-10',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'qbr meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'qbr meetup free',
        seats: 20,
      }),
    'qbr still office > ferry after residual-10',
  );
}

// Free SF venue residual-11 (draft only): director/VP eng · tech lead · eng fellow ·
// talent/comp/calibration review (was free-ask outdoor / ferry score win)
{
  const residual11Tech = [
    'director of engineering free',
    'director eng free',
    'engineering director free',
    'vp engineering free',
    'vp eng free',
    'vp of engineering free',
    'tech lead free',
    'technical lead free',
    'engineering fellow free',
    'fellow eng free',
    'tech fellow free',
    'research fellow free',
  ];
  for (const need of residual11Tech) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' tech-meetup reason',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (was free-ask hang)',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang: ' + (top?.id || 'none'),
    );
  }

  const residual11Ops = [
    'talent review free',
    'comp review free',
    'compensation review free',
    'calibration free',
    'calibration meeting free',
    'performance review free',
    'performance calibration free',
    'talent calibration free',
    'perf calibration free',
  ];
  for (const need of residual11Ops) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('team-ops'),
      need + ' team-ops reason',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('performance'),
      need + ': not comedy performance residual-11',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (team-ops residual-11)',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor: ' + (top?.id || 'none'),
    );
  }

  // Comedy performance still performance (not team-ops)
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'open mic free',
      seats: 20,
      explain: true,
    }).reasons?.includes('performance'),
    'open mic still performance after residual-11',
  );
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'open mic free',
      seats: 20,
      explain: true,
    }).reasons?.includes('team-ops'),
    'open mic: no team-ops after residual-11',
  );

  // Mixer language still outdoor / not tech-meetup
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup after residual-11',
  );

  // Regressions: bare founders + FiDi networking still outdoor; residual-10 still indoor
  const foundersR11 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR11[0] && !/office|loan|library/i.test(foundersR11[0].name || ''),
    'founders meetup still outdoor after residual-11: ' + (foundersR11[0]?.id || 'none'),
  );
  const fidiR11 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR11[0] && !/office|loan|library/i.test(fidiR11[0].name || ''),
    'FiDi networking still outdoor after residual-11: ' + (fidiR11[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'principal engineer free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'principal engineer free',
        seats: 20,
      }),
    'principal engineer still office > ferry after residual-11',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'skip-level free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'skip-level free',
        seats: 20,
      }),
    'skip-level still office > ferry after residual-11',
  );
}

// Free SF venue residual-12 (draft only): CTO · head of eng · lead/senior/junior eng ·
// product/design heads · 1:1/sync/standup · bar raiser · promo/leveling · perf/PIP
// (was free-ask outdoor / ferry keyword win)
{
  const residual12Tech = [
    'CTO free',
    'cto free',
    'chief technology officer free',
    'head of engineering free',
    'head of eng free',
    'engineering lead free',
    'eng lead free',
    'lead engineer free',
    'lead eng free',
    'senior engineer free',
    'senior eng free',
    'sr engineer free',
    'sr eng free',
    'junior engineer free',
    'associate engineer free',
    'manager of engineering free',
    'software architect free',
    'staff architect free',
    'cloud architect free',
    'platform lead free',
    'infra lead free',
    'sre lead free',
    'head of product free',
    'VP product free',
    'director of product free',
    'head of design free',
    'design lead free',
    'VP design free',
    'head of people free',
    'talent lead free',
  ];
  for (const need of residual12Tech) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' tech-meetup reason residual-12',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry residual-12',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit residual-12',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor residual-12: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang residual-12: ' + (top?.id || 'none'),
    );
  }

  const residual12Ops = [
    '1:1 free',
    'one on one free',
    'one-on-one free',
    'team sync free',
    'weekly sync free',
    'daily standup free',
    'OKR free',
    'okr planning free',
    'roadmap review free',
    'interview debrief free',
    'bar raiser free',
    'promo committee free',
    'promotion committee free',
    'leveling free',
    'perf review free',
    'PIP free',
    'performance improvement free',
    'skip levels free',
  ];
  for (const need of residual12Ops) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('team-ops'),
      need + ' team-ops reason residual-12',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('performance'),
      need + ': not comedy performance residual-12',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry (team-ops residual-12)',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor residual-12: ' + (top?.id || 'none'),
    );
  }

  // Comedy performance still performance (not team-ops)
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'open mic free',
      seats: 20,
      explain: true,
    }).reasons?.includes('performance'),
    'open mic still performance after residual-12',
  );
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'open mic free',
      seats: 20,
      explain: true,
    }).reasons?.includes('team-ops'),
    'open mic: no team-ops after residual-12',
  );

  // Mixer language still outdoor / not tech-meetup
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup after residual-12',
  );

  // Regressions: bare founders + FiDi networking still outdoor; residual-11 still indoor
  const foundersR12 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR12[0] && !/office|loan|library/i.test(foundersR12[0].name || ''),
    'founders meetup still outdoor after residual-12: ' + (foundersR12[0]?.id || 'none'),
  );
  const fidiR12 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR12[0] && !/office|loan|library/i.test(fidiR12[0].name || ''),
    'FiDi networking still outdoor after residual-12: ' + (fidiR12[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'director of engineering free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'director of engineering free',
        seats: 20,
      }),
    'director eng still office > ferry after residual-12',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'performance calibration free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'performance calibration free',
        seats: 20,
      }),
    'performance calibration still office > ferry after residual-12',
  );
}

// Free SF venue residual-15 (draft only): CHRO/CGO/CDO/CIO · ops/operations/analytics/hr/brand
// heads · product designer ladder · data engineer · eng/platform/infra ops · DevEx ·
// people/HR manager · creative director · customer/forward-deployed eng · PMM · general manager
// (was free-ask outdoor; product designer ≠ product design; VP ops missing; data eng word-boundary)
{
  const residual15Tech = [
    'CHRO free',
    'chief human resources officer free',
    'chief growth officer free',
    'CGO free',
    'chief data officer free',
    'CDO free',
    'chief analytics officer free',
    'chief information officer free',
    'CIO free',
    'chief digital officer free',
    'VP of ops free',
    'VP operations free',
    'VP of operations free',
    'director of ops free',
    'director of operations free',
    'head of operations free',
    'head of analytics free',
    'VP of analytics free',
    'director of analytics free',
    'head of brand free',
    'VP brand free',
    'director of HR free',
    'head of HR free',
    'staff product designer free',
    'product designer free',
    'principal product designer free',
    'senior product designer free',
    'data engineer free',
    'staff data engineer free',
    'principal data engineer free',
    'engineering ops free',
    'eng ops free',
    'platform ops free',
    'infra ops free',
    'developer experience free',
    'devex free',
    'people lead free',
    'people manager free',
    'HR manager free',
    'creative director free',
    'customer engineer free',
    'forward deployed eng free',
    'PMM free',
    'general manager free',
  ];
  for (const need of residual15Tech) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' tech-meetup reason residual-15',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry residual-15',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit residual-15',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    ok(
      top &&
        (/office|loan|library/i.test(top.name || '') ||
          top.id === 'v_office_loan' ||
          /library/.test(top.id || '')),
      need + ' tops office/library indoor residual-15: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang residual-15: ' + (top?.id || 'none'),
    );
  }

  // Mixer language still outdoor / not tech-meetup
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup after residual-15',
  );

  // Comedy performance still performance (not team-ops)
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'open mic free',
      seats: 20,
      explain: true,
    }).reasons?.includes('performance'),
    'open mic still performance after residual-15',
  );

  // Regressions: bare founders + FiDi networking still outdoor; residual-12 still indoor
  const foundersR15 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR15[0] && !/office|loan|library/i.test(foundersR15[0].name || ''),
    'founders meetup still outdoor after residual-15: ' + (foundersR15[0]?.id || 'none'),
  );
  const fidiR15 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR15[0] && !/office|loan|library/i.test(fidiR15[0].name || ''),
    'FiDi networking still outdoor after residual-15: ' + (fidiR15[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'CTO free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'CTO free',
        seats: 20,
      }),
    'CTO still office > ferry after residual-15',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'staff designer free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'staff designer free',
        seats: 20,
      }),
    'staff designer still office > ferry after residual-15',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'performance calibration free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'performance calibration free',
        seats: 20,
      }),
    'performance calibration still office > ferry after residual-15',
  );
}


// Free SF venue residual-25 (draft only): unconference/barcamp · advisory board ·
// mastermind · founder/peer circle · accelerator/incubator/fellowship · founders brunch ·
// tech brunch · fundraising · series A–C · seed stage · cap table · VC · angel syndicate ·
// office crawl · lab/workspace tour · API/SDK topic · latinx · women/girls in product|design|eng
// (solo free-ask was outdoor/library free-ask; API meetup → ferry meetup-fit)
{
  const residual25Tech = [
    'unconference free',
    'barcamp free',
    'advisory board free',
    'mastermind free',
    'founder circle free',
    'peer circle free',
    'accelerator free',
    'incubator free',
    'fellowship free',
    'founders brunch free',
    'tech brunch free',
    'fundraising free',
    'series A free',
    'seed stage free',
    'cap table free',
    'VC free',
    'angel syndicate free',
    'office crawl free',
    'lab tour free',
    'workspace tour free',
    'API meetup free',
    'SDK night free',
    'latinx in tech free',
    'women in product free',
    'women in design free',
    'queer in eng free',
  ];
  for (const need of residual25Tech) {
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('tech-meetup'),
      need + ' tech-meetup reason residual-25',
    );
    ok(
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
        need,
        seats: 20,
      }) >
        scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
          need,
          seats: 20,
        }),
      need + ': office beats ferry residual-25',
    );
    ok(
      !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need,
        seats: 20,
        explain: true,
      }).reasons?.includes('meetup-fit'),
      need + ': ferry has no meetup-fit residual-25',
    );
    const top = matchFreeVenues({ need, seats: 20, limit: 1 })[0];
    // Brunch/meal free-asks may honestly rank dinner-room halls above bare office loan.
    const mealNeed = /\b(brunch|lunch|dinner|supper|meal)\b/i.test(need);
    ok(
      top &&
        (mealNeed
          ? /office|loan|library|hall|nonprofit|community|dining|kitchen/i.test(
              `${top.id || ''} ${top.name || ''}`,
            )
          : /office|loan|library/i.test(top.name || '') ||
            top.id === 'v_office_loan' ||
            /library/.test(top.id || '')),
      need + ' tops office/library indoor residual-25: ' + (top?.id || 'none'),
    );
    ok(
      top &&
        !/park|lawn|green|promenade|parklet|dolores|yerba|salesforce|ferry|embarcadero/i.test(
          top.name || '',
        ),
      need + ' not outdoor hang residual-25: ' + (top?.id || 'none'),
    );
  }

  // Mixer language still outdoor / not tech-meetup
  ok(
    !scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'sales happy hour free',
      seats: 20,
      explain: true,
    }).reasons?.includes('tech-meetup'),
    'sales happy hour: no tech-meetup after residual-25',
  );

  // Regressions: bare founders + FiDi networking still outdoor; residual-15 still indoor
  const foundersR25 = matchFreeVenues({ need: 'founders meetup free SoMa', seats: 20, limit: 2 });
  ok(
    foundersR25[0] && !/office|loan|library/i.test(foundersR25[0].name || ''),
    'founders meetup still outdoor after residual-25: ' + (foundersR25[0]?.id || 'none'),
  );
  const fidiR25 = matchFreeVenues({ need: 'FiDi networking meetup free', seats: 15, limit: 2 });
  ok(
    fidiR25[0] && !/office|loan|library/i.test(fidiR25[0].name || ''),
    'FiDi networking still outdoor after residual-25: ' + (fidiR25[0]?.id || 'none'),
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'CTO free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'CTO free',
        seats: 20,
      }),
    'CTO still office > ferry after residual-25',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'alumni meetup free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'alumni meetup free',
        seats: 20,
      }),
    'alumni meetup still office > ferry after residual-25',
  );
  ok(
    scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_office_loan'), {
      need: 'customer advisory board free',
      seats: 20,
    }) >
      scoreFreeVenue(FREE_SF_VENUES.find((v) => v.id === 'v_ferry_arcade'), {
        need: 'customer advisory board free',
        seats: 20,
      }),
    'customer advisory board still office > ferry after residual-25',
  );
}


// gap-label: Resource gaps line matching primary open gap drains first (draft only)
const gapLabelPrio = prioritizeOutreachQueue(
  [
    {
      id: 'wrong_gap',
      kind: 'volunteer',
      status: 'queued',
      at: '2026-01-01',
      priority: 80,
      toEmail: 'a@example.com',
      body:
        'Resource gaps: venue.\nNeed a day-of volunteer for door/setup host-assist in SF. Events Bot (by Demigod). Draft queue only — no auto-send.',
      eventId: 'e_gl',
    },
    {
      id: 'right_gap',
      kind: 'volunteer',
      status: 'queued',
      at: '2026-01-02',
      priority: 80,
      toEmail: 'b@example.com',
      body:
        'Resource gaps: volunteer.\nNeed a day-of volunteer for door/setup host-assist in SF. Events Bot (by Demigod). Draft queue only — no auto-send.',
      eventId: 'e_gl',
    },
  ],
  {
    stage: 'resource',
    eventId: 'e_gl',
    gaps: {
      needVenue: false,
      needVenueAlt: false,
      needSponsor: false,
      needVolunteer: true,
      missing: ['volunteer'],
    },
  },
);
ok(gapLabelPrio[0]?.id === 'right_gap', 'gap-label volunteer body drains first');
ok(/gap-label/i.test(gapLabelPrio[0]?.drainWhy || ''), 'drainWhy names gap-label');

// Resource outreach residual (draft only): lifecycle stage tilts
// — rsvp-focus when gaps filled · day-of volunteer · debrief post-night · premature sink · sibling-specific
{
  const allFilled = {
    needVenue: false,
    needVenueAlt: false,
    needSponsor: false,
    needVolunteer: false,
    missing: [],
  };
  // RSVP + all resource gaps filled → guest remind beats leftover venue shortlist
  const rsvpFocusPrio = prioritizeOutreachQueue(
    [
      {
        id: 'v_left',
        kind: 'venue',
        status: 'queued',
        at: '2026-01-01',
        priority: 100,
        eventId: 'e_res',
        body:
          'Resource gaps: none.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send.',
      },
      {
        id: 'rsvp_t3',
        kind: 'rsvp_remind_t3d',
        status: 'queued',
        at: '2026-01-02',
        priority: 50,
        eventId: 'e_res',
        toEmail: 'guest@trydemigod.com',
        body: 'DRAFT — T-3 days before night. Friendly nudge. Draft queue only — no auto-send.',
      },
    ],
    { stage: 'rsvp', eventId: 'e_res', gaps: allFilled },
  );
  ok(rsvpFocusPrio[0]?.id === 'rsvp_t3', 'rsvp-focus: remind beats leftover venue when gaps filled');
  ok(/rsvp-focus|rsvp-remind/i.test(rsvpFocusPrio[0]?.drainWhy || ''), 'rsvp-focus drainWhy');
  ok(
    /venue-filled/i.test(rsvpFocusPrio.find((x) => x.id === 'v_left')?.drainWhy || ''),
    'leftover venue still venue-filled at rsvp',
  );

  // Run + open volunteer (and open sponsor) → day-of volunteer drains first
  const runDayOfPrio = prioritizeOutreachQueue(
    [
      {
        id: 'sp_run',
        kind: 'sponsor',
        status: 'queued',
        at: '2026-01-01',
        priority: 90,
        eventId: 'e_run',
        toEmail: 'ops@trydemigod.com',
        body:
          'Looking for a drink sponsor tab for twenty seats in San Francisco founders night. Draft queue only — no auto-send. Events Bot (by Demigod).',
      },
      {
        id: 'vol_run',
        kind: 'volunteer',
        status: 'queued',
        at: '2026-01-02',
        priority: 80,
        eventId: 'e_run',
        toEmail: 'help@trydemigod.com',
        body:
          'Resource gaps: volunteer.\nNeed a day-of volunteer for door/setup host-assist in San Francisco. Draft queue only — no auto-send. Events Bot (by Demigod).',
      },
    ],
    {
      stage: 'run',
      eventId: 'e_run',
      gaps: {
        needVenue: false,
        needVenueAlt: false,
        needSponsor: true,
        needVolunteer: true,
        missing: ['sponsor', 'volunteer'],
      },
    },
  );
  ok(runDayOfPrio[0]?.id === 'vol_run', 'run day-of: volunteer beats open sponsor');
  ok(/day-of-volunteer/i.test(runDayOfPrio[0]?.drainWhy || ''), 'run day-of drainWhy');

  // Debrief: thanks/feedback beat leftover resource recruiting (even if gaps still "open")
  const debriefPrio = prioritizeOutreachQueue(
    [
      {
        id: 'sp_deb',
        kind: 'sponsor',
        status: 'queued',
        at: '2026-01-02',
        priority: 90,
        eventId: 'e_deb',
        toEmail: 'ops@trydemigod.com',
        body:
          'Looking for a drink sponsor tab for twenty seats in San Francisco founders night. Draft queue only — no auto-send. Events Bot (by Demigod).',
      },
      {
        id: 'th_deb',
        kind: 'thanks',
        status: 'queued',
        at: '2026-01-01',
        priority: 30,
        eventId: 'e_deb',
        body: 'Thanks for coming to the SF night. Draft queue only — no auto-send. Events Bot (by Demigod).',
      },
      {
        id: 'fb_deb',
        kind: 'feedback_ask',
        status: 'queued',
        at: '2026-01-03',
        priority: 20,
        eventId: 'e_deb',
        body: 'How was the SF night? Draft queue only — no auto-send.',
      },
    ],
    {
      stage: 'debrief',
      eventId: 'e_deb',
      gaps: {
        needVenue: false,
        needVenueAlt: false,
        needSponsor: true,
        needVolunteer: false,
        missing: ['sponsor'],
      },
    },
  );
  ok(debriefPrio[0]?.id === 'th_deb' || debriefPrio[0]?.id === 'fb_deb', 'debrief: post-night beats leftover sponsor');
  ok(
    /debrief-post|followup/i.test(debriefPrio[0]?.drainWhy || ''),
    'debrief post drainWhy: ' + (debriefPrio[0]?.drainWhy || ''),
  );
  ok(
    /post-night-resource/i.test(debriefPrio.find((x) => x.id === 'sp_deb')?.drainWhy || ''),
    'debrief leftover sponsor post-night-resource',
  );

  // Resource stage: premature rsvp_remind sinks under open venue gap
  const prematurePrio = prioritizeOutreachQueue(
    [
      {
        id: 'rsvp_early',
        kind: 'rsvp_remind_t3d',
        status: 'queued',
        at: '2026-01-03',
        priority: 50,
        eventId: 'e_pre',
        toEmail: 'guest@trydemigod.com',
        body: 'DRAFT T-3 reminder. Draft queue only — no auto-send.',
      },
      {
        id: 'v_need',
        kind: 'venue',
        status: 'queued',
        at: '2026-01-01',
        priority: 100,
        eventId: 'e_pre',
        body:
          'Resource gaps: venue.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send.',
      },
    ],
    {
      stage: 'resource',
      eventId: 'e_pre',
      gaps: {
        needVenue: true,
        needVenueAlt: false,
        needSponsor: true,
        needVolunteer: true,
        missing: ['venue', 'sponsor', 'volunteer'],
      },
    },
  );
  ok(prematurePrio[0]?.id === 'v_need', 'resource stage: venue gap before premature rsvp');
  ok(
    /premature/i.test(prematurePrio.find((x) => x.id === 'rsvp_early')?.drainWhy || ''),
    'premature rsvp_remind marked at resource stage',
  );

  // Generic resource draft sinks when specific open-gap kind exists
  const siblingSpecPrio = prioritizeOutreachQueue(
    [
      {
        id: 'res_gen',
        kind: 'resource',
        status: 'queued',
        at: '2026-01-01',
        priority: 70,
        eventId: 'e_sib',
        body: 'Need help with resources for SF night. Draft queue only — no auto-send.',
      },
      {
        id: 'sp_spec',
        kind: 'sponsor',
        status: 'queued',
        at: '2026-01-02',
        priority: 90,
        eventId: 'e_sib',
        toEmail: 'ops@trydemigod.com',
        body:
          'Looking for a food/beverage sponsor tab buyout for SF dinner. Events Bot (by Demigod). Draft queue only — no auto-send.',
      },
    ],
    {
      stage: 'resource',
      eventId: 'e_sib',
      gaps: {
        needVenue: false,
        needVenueAlt: false,
        needSponsor: true,
        needVolunteer: true,
        missing: ['sponsor', 'volunteer'],
      },
    },
  );
  ok(siblingSpecPrio[0]?.id === 'sp_spec', 'sibling-specific: sponsor beats generic resource');
  ok(
    /sibling-specific/i.test(siblingSpecPrio.find((x) => x.id === 'res_gen')?.drainWhy || ''),
    'generic resource marked sibling-specific',
  );

  // residual-3: stale "Resource gaps: none" sinks under honest open-gap label (draft only)
  const staleGapPrio = prioritizeOutreachQueue(
    [
      {
        id: 'stale_none',
        kind: 'venue',
        status: 'queued',
        at: '2026-01-02',
        priority: 100,
        eventId: 'e_stale',
        toEmail: 'ops@trydemigod.com',
        body:
          'Resource gaps: none.\nRanked free SF options I already scored (not booked):\n1. X (match 12)\nDraft queue only — no auto-send. Events Bot (by Demigod).',
      },
      {
        id: 'honest_gap',
        kind: 'venue',
        status: 'queued',
        at: '2026-01-01',
        priority: 100,
        eventId: 'e_stale',
        toEmail: 'ops2@trydemigod.com',
        body:
          'Resource gaps: venue_alt.\nTop free-list pick (alt vs current pick) (heuristic, not booked): Ferry Building.\nRanked free SF options I already scored (not booked) — excluding current free_list pick:\n1. Ferry Building (match 14)\nDraft queue only — no auto-send. Events Bot (by Demigod).',
      },
    ],
    {
      stage: 'resource',
      eventId: 'e_stale',
      gaps: {
        needVenue: false,
        needVenueAlt: true,
        needSponsor: true,
        needVolunteer: false,
        missing: ['venue_alt', 'sponsor'],
        topFreeVenue: { id: 'v_ferry_arcade', name: 'Ferry Building arcade / plaza edge' },
      },
    },
  );
  ok(staleGapPrio[0]?.id === 'honest_gap', 'stale-gap-none: honest venue_alt body drains first');
  ok(
    /stale-gap-none/i.test(staleGapPrio.find((x) => x.id === 'stale_none')?.drainWhy || ''),
    'stale Resource gaps: none marked stale-gap-none',
  );
  ok(
    /gap-label|alt-ready|shortlist-ready/i.test(staleGapPrio[0]?.drainWhy || ''),
    'honest draft still gap/alt/shortlist ready: ' + (staleGapPrio[0]?.drainWhy || ''),
  );
}

// isolate store copy (always under DEMIGOD_EVENTS_STORE — never prod)
const storePath = process.env.DEMIGOD_EVENTS_STORE || SELFTEST_STORE;
const backup = fs.readFileSync(storePath, 'utf8');
try {
  // Fresh night isolation for tick
  const empty = JSON.parse(backup);
  empty.activeEvent = { id: null, title: '', stage: 'ideate', city: 'San Francisco' };
  empty.outreach = [];
  empty.platforms = { luma: [], partiful: [] };
  empty.ideas = [];
  fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));

  const badOutreach = runTool('queue_outreach', {
    toEmail: '',
    kind: 'venue',
    subject: 'invalid recipient test',
    body: 'must not queue this empty email',
  });
  ok(badOutreach.ok === false && /valid recipient email/i.test(badOutreach.error || ''), 'reject missing outreach email');
  ok((loadStore().outreach || []).length === 0, 'invalid outreach not queued');

  const inventEmail = runTool('queue_outreach', {
    toEmail: 'venue@example.com',
    kind: 'venue',
    subject: 'Invented recipient must fail',
    body: 'This should never land in the outreach queue.',
  });
  ok(inventEmail.ok === false && /never invent/i.test(inventEmail.error || ''), 'reject invent example.com');
  ok((loadStore().outreach || []).length === 0, 'invent email not queued');

  // Free-ops MX: no-MX domain rejected; real domain stamped
  const noMxReal = {
    id: 'mx_bad2',
    toEmail: 'a@this-domain-should-not-exist-demigod-xyz123.com',
    kind: 'sponsor',
    status: 'queued',
    body: 'Syntax ok but no DNS MX expected.',
  };
  ok(isRealOutreachEmail(noMxReal.toEmail), 'no-MX fixture has real-looking syntax');
  const mx2 = await hygieneOutreachMx([noMxReal], {
    checkMx: async () => ({ ok: false, reason: 'ENOTFOUND', retryable: false }),
  });
  ok(mx2.checked === 1, 'mx hygiene checked item');
  ok(noMxReal.status === 'rejected' && /no_mx/i.test(noMxReal.rejectReason || ''), 'mx rejects no-MX domain');
  ok(mx2.changed >= 1, 'mx reject reports changed (persist stamp + status)');

  // Successful null→true stamp must report changed so ticks saveStore (not only rejects).
  const mxOkRow = {
    id: 'mx_ok_stamp',
    toEmail: 'friends@sportsbasement.com',
    kind: 'venue_alt',
    status: 'queued',
    body: 'MX stamp persistence fixture.',
    emailCheck: { syntax: true, mx: null, reason: null, at: null },
  };
  const mxOk = await hygieneOutreachMx([mxOkRow], {
    checkMx: async () => ({ ok: true }),
  });
  ok(mxOk.checked === 1 && mxOk.changed >= 1, 'mx success null→true reports changed');
  ok(mxOkRow.emailCheck?.mx === true, 'mx success stamps emailCheck.mx true');

  const retryMx = { ...noMxReal, id: 'mx_retry', status: 'queued', rejectReason: null };
  const mxRetry = await hygieneOutreachMx([retryMx], {
    checkMx: async () => ({ ok: false, reason: 'EAI_AGAIN', retryable: true }),
  });
  ok(
    mxRetry.rejectedMx === 0 && retryMx.status === 'queued' && retryMx.emailCheck.mx === null,
    'transient MX error stays queued with unknown MX',
  );

  const legacyRetryMx = {
    ...noMxReal,
    id: 'mx_legacy_retry',
    status: 'rejected',
    rejectReason: 'no_mx:ECONNREFUSED',
  };
  const mxLegacyRetry = await hygieneOutreachMx([legacyRetryMx], {
    checkMx: async () => ({ ok: false, reason: 'EAI_AGAIN', retryable: true }),
  });
  ok(
    mxLegacyRetry.reconciledTransient === 1 && legacyRetryMx.status === 'queued',
    'legacy transient MX rejection returns to retry queue',
  );

  const legacyNoMx = { ...legacyRetryMx, id: 'mx_legacy_no_mx', status: 'rejected', rejectReason: 'no_mx:ENOTFOUND' };
  const mxLegacyNoMx = await hygieneOutreachMx([legacyNoMx], { checkMx: async () => ({ ok: true }) });
  ok(
    mxLegacyNoMx.reconciledTransient === 0 && legacyNoMx.status === 'rejected',
    'legacy authoritative no-MX rejection stays rejected',
  );

  const shortBody = runTool('queue_outreach', {
    toEmail: 'potter@trydemigod.com',
    kind: 'sponsor',
    subject: 'Too short',
    body: 'hi',
  });
  ok(shortBody.ok === false && /body required/i.test(shortBody.error || ''), 'reject short outreach body');

  const oldOutbox = process.env.DEMIGOD_EVENTS_OUTBOX;
  process.env.DEMIGOD_EVENTS_OUTBOX = storePath; // an existing file, so mkdir must fail
  const failedExport = runTool('queue_outreach', {
    toEmail: 'potter@trydemigod.com',
    kind: 'venue',
    subject: 'Outbox failure honesty',
    body: 'This valid draft must remain queued even when its optional outbox export cannot be written.',
  });
  if (oldOutbox === undefined) delete process.env.DEMIGOD_EVENTS_OUTBOX;
  else process.env.DEMIGOD_EVENTS_OUTBOX = oldOutbox;
  ok(
    failedExport.ok && failedExport.outboxWritten === false && failedExport.outboxError === 'EEXIST',
    'queue surfaces bounded optional outbox write failure',
  );
  ok(loadStore().outreach.some((o) => o.id === failedExport.outreach?.id), 'outbox failure keeps canonical queue');
  const retriedExport = runTool('queue_outreach', {
    toEmail: 'potter@trydemigod.com',
    kind: 'venue',
    subject: 'Outbox failure honesty',
    body: 'This valid draft must remain queued even when its optional outbox export cannot be written.',
  });
  ok(
    retriedExport.deduped && retriedExport.outboxWritten && retriedExport.outboxError === null,
    'deduped queue retries missing outbox export',
  );
  ok(fs.existsSync(path.join(SELFTEST_OUTBOX, `${failedExport.outreach.id}.json`)), 'deduped retry restores outbox file');
  const caseRetry = runTool('queue_outreach', {
    toEmail: 'POTTER@TRYDEMIGOD.COM',
    kind: 'venue',
    subject: 'Outbox failure honesty',
    body: 'This valid draft must remain queued even when its optional outbox export cannot be written.',
  });
  ok(caseRetry.deduped && caseRetry.outreach?.id === failedExport.outreach.id, 'outreach dedupe ignores email case');

  empty.activeEvent = { id: 'evt_early', title: 'Early night', stage: 'resource', city: 'San Francisco' };
  fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));
  const earlyFeedback = runTool('queue_outreach', {
    toEmail: 'potter@trydemigod.com',
    kind: 'feedback_ask',
    subject: 'Too early for feedback',
    body: 'This post-night feedback draft must wait for the event to happen.',
  });
  ok(earlyFeedback.ok === false && /waits until followup/i.test(earlyFeedback.error || ''), 'queue rejects premature feedback draft');
  ok((loadStore().outreach || []).length === 0, 'premature feedback draft not queued');

  empty.activeEvent = {
    id: 'evt_followup_new',
    title: 'New followup night',
    audience: 'SF builders',
    outcome: 'Meet peers',
    seats: 12,
    stage: 'followup',
    city: 'San Francisco',
  };
  empty.outreach = [
    { id: 'old_thanks', eventId: 'evt_followup_old', kind: 'thanks', status: 'queued' },
    { id: 'old_feedback', eventId: 'evt_followup_old', kind: 'feedback_ask', status: 'queued' },
  ];
  fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));
  await eventsBotAgentTick({ goal: 'continue current followup', ownerCycle: true });
  const followupKinds = loadStore().outreach.filter((o) => o.eventId === 'evt_followup_new').map((o) => o.kind);
  ok(followupKinds.includes('thanks'), 'followup queues thanks despite older event draft');
  ok(followupKinds.includes('feedback_ask'), 'followup queues feedback despite older event draft');
  ok(/record real debrief evidence/.test(planTickNext(loadStore()).ownerLine), 'followup planner scopes thanks to active event');

  empty.outreach = [
    { id: 'sent_thanks', eventId: 'evt_followup_new', kind: 'thanks', status: 'sent' },
    { id: 'sent_feedback', eventId: 'evt_followup_new', kind: 'feedback_ask', status: 'sent' },
  ];
  fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));
  await eventsBotAgentTick({ goal: 'continue current followup', ownerCycle: true });
  ok(loadStore().outreach.length === 2, 'followup does not redraft post-event messages already sent');

  empty.outreach = [{
    id: 'old_night_draft',
    eventId: 'evt_old',
    toEmail: 'potter@trydemigod.com',
    kind: 'venue',
    status: 'queued',
    body: 'Old night body without identity footer yet.',
  }, {
    id: 'invent_stale',
    eventId: 'evt_old',
    toEmail: 'fake@example.org',
    kind: 'sponsor',
    status: 'queued',
    body: 'Stale invent email still queued from prior bug.',
  }];
  empty.activeEvent = { id: 'evt_new', title: 'New SF night', stage: 'resource', city: 'San Francisco' };
  fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));
  const newNightDraft = runTool('queue_outreach', {
    toEmail: 'potter@trydemigod.com',
    kind: 'venue',
    status: 'sent',
    sentAt: '2026-07-17T00:00:00.000Z',
    subject: 'New night venue draft',
    body: 'Draft for the new SF night with enough body quality.',
  });
  ok(!newNightDraft.deduped, 'outreach dedupe scoped to active event');
  ok(newNightDraft.outreach?.status === 'queued', 'new event outreach stays queued');
  const afterQueue = loadStore();
  const newItem = (afterQueue.outreach || []).find((o) => o.id === newNightDraft.outreach?.id);
  ok(newItem?.status === 'queued' && newItem.sentAt === null, 'queue ignores caller fake-sent fields');
  ok(newItem && /Events Bot \(by Demigod\)/.test(newItem.body || ''), 'queued body has identity blurb');
  ok(newItem && /trydemigod\.com\/\?p=events/.test(newItem.body || ''), 'queued body has events chat link');
  const inventStale = (afterQueue.outreach || []).find((o) => o.id === 'invent_stale');
  ok(inventStale?.status === 'rejected', 'hygiene rejects stale invent email on queue');
  const oldBody = (afterQueue.outreach || []).find((o) => o.id === 'old_night_draft');
  ok(oldBody && /Events Bot \(by Demigod\)/.test(oldBody.body || ''), 'hygiene stamps identity on old drafts');
  empty.activeEvent = { id: null, title: '', stage: 'ideate', city: 'San Francisco' };
  empty.outreach = [];
  fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));

  const ideaOnlyTick = await eventsBotAgentTick({
    goal: 'Draft three SF salon ideas without starting a night',
    ownerCycle: false,
  });
  ok(ideaOnlyTick.ok, 'idea-only tick ok');
  ok(!ideaOnlyTick.resources?.activeEvent?.id, 'idea-only tick does not activate an event');
  ok(!ideaOnlyTick.resources?.outreachQueued, 'idea-only tick does not queue outreach');
  fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));

  // A live model can return prose without tools; one-button autonomy must still run the safe
  // deterministic local cycle instead of claiming success with zero work.
  const realFetch = globalThis.fetch;
  try {
    process.env.OPENAI_API_KEY = 'selftest-key';
    delete process.env.DEMIGOD_EVENTS_BOT_MOCK;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { role: 'assistant', content: 'I have a plan.' } }] }),
    });
    const zeroToolTick = await eventsBotAgentTick({ goal: '12 person SF salon, choose the rest' });
    ok(zeroToolTick.ok, 'zero-tool live tick ok');
    ok(zeroToolTick.steps?.length > 0, 'zero-tool live tick falls back to safe local steps');
    ok(zeroToolTick.resources?.activeEvent?.id, 'zero-tool fallback creates active event');
    ok(zeroToolTick.resources?.activeEvent?.venue?.name, 'zero-tool fallback selects SF venue');

    // One harmless model tool used to suppress the fallback and return ok:true with no event.
    fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));
    let shallowCalls = 0;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: ++shallowCalls === 1
            ? {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: 'shallow_1',
                  type: 'function',
                  function: { name: 'propose_event_ideas', arguments: '{}' },
                }],
              }
            : { role: 'assistant', content: 'I made progress.', tool_calls: [] },
        }],
      }),
    });
    const shallowToolTick = await eventsBotAgentTick({ goal: '12 person SF salon, choose the rest' });
    ok(shallowToolTick.steps?.[0]?.tool === 'propose_event_ideas', 'shallow-tool live tick keeps model step');
    ok(
      shallowToolTick.steps?.some((step) => step.fallback === 'owner_cycle_completion'),
      'shallow-tool live tick completes the owner cycle',
    );
    ok(shallowToolTick.resources?.activeEvent?.id, 'shallow-tool completion creates active event');
    ok(shallowToolTick.resources?.activeEvent?.venue?.name, 'shallow-tool completion selects SF venue');

    const modelEvidenceStore = {
      ...empty,
      activeEvent: {
        id: 'evt_model_evidence',
        title: 'Model Evidence Night',
        stage: 'rsvp',
        city: 'San Francisco',
        audience: 'SF builders',
        outcome: 'two useful follow-ups',
        seats: 12,
        dateWindows: ['2099-08-01T18:30:00-07:00'],
        venue: { name: 'Mission room', confirmed: true, confirmationEvidence: 'Human-confirmed fixture' },
        agenda: 'Run of show',
        guestMix: defaultGuestMix({ seats: 12 }),
        inviteDraft: 'Invite copy',
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      platforms: {
        luma: [],
        partiful: [{ id: 'pf_model_evidence', eventId: 'evt_model_evidence', title: 'Model Evidence Night', status: 'draft' }],
      },
    };
    fs.writeFileSync(storePath, JSON.stringify(modelEvidenceStore, null, 2));
    let inviteCalls = 0;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: ++inviteCalls === 1
            ? {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: 'invent_invite_1',
                  type: 'function',
                  function: {
                    name: 'record_invite_url',
                    arguments: JSON.stringify({
                      platform: 'partiful',
                      id: 'pf_model_evidence',
                      url: 'https://partiful.com/e/nonexistent-model-invite',
                    }),
                  },
                }],
              }
            : { role: 'assistant', content: 'I kept the invite as a draft.', tool_calls: [] },
        }],
      }),
    });
    const guardedInviteTick = await eventsBotAgentTick({ goal: 'Keep planning this night', maxSteps: 2 });
    const guardedInvite = loadStore().platforms.partiful[0];
    ok(
      guardedInviteTick.steps?.find((step) => step.tool === 'record_invite_url')?.result?.error ===
        'foreground_evidence_required',
      'model cannot assert published invite evidence',
    );
    ok(
      guardedInvite?.status === 'draft' && !guardedInvite.inviteUrl,
      'blocked model invite URL leaves the draft unpublished',
    );
  } finally {
    globalThis.fetch = realFetch;
    process.env.DEMIGOD_EVENTS_BOT_MOCK = '1';
    delete process.env.OPENAI_API_KEY;
    fs.writeFileSync(storePath, JSON.stringify(empty, null, 2));
  }

  const tick = await eventsBotAgentTick({ goal: 'selftest salon 12 seats free venue' });
  ok(tick.ok, 'tick ok');
  ok(tick.resources?.activeEvent?.id, 'active event');
  ok(tick.resources?.activeEvent?.venue?.name, 'venue selected');
  ok(tick.resources?.activeEvent?.guestMix?.status === 'planning_target', 'guest mix is an honest planning target');
  ok(tick.resources?.activeEvent?.guestMix?.cohorts?.reduce((n, c) => n + c.target, 0) === tick.resources?.activeEvent?.guestMix?.seats, 'guest mix targets sum to seats');
  ok((tick.resources?.outreachQueued || 0) >= 1, 'outreach queued');
  ok(tick.owner === 'events-bot' || tick.resources?.owner === 'events-bot', 'owner flag');
  ok(tick.plan?.next?.length >= 1 || tick.plan?.ownerLine, 'tick plan next');
  ok(tick.summary && /I drove|owner|stage/i.test(tick.summary), 'owner voice summary');
  ok(/^I'll /i.test(tick.plan?.ownerLine || ''), 'tick plan first-person ownerLine');
  ok(
    Array.isArray(tick.plan?.next) && tick.plan.next.every((n) => /^I'll /i.test(n)),
    'tick plan next steps first-person',
  );
  ok(tick.plan?.city === 'San Francisco', 'tick plan city SF');
  ok(tick.plan?.voice === 'owner', 'tick plan voice=owner');
  ok(tick.plan?.whyNow, 'tick plan whyNow');
  ok(/\*\*Next:\*\*|Next:/i.test(tick.summary || '') && /I'll /i.test(tick.summary || ''), 'tick summary Next+I\'ll');
  // A shortlist is not booking evidence: autonomous ticks stay in resource.
  const aeAfterTick = loadStore().activeEvent || {};
  ok(aeAfterTick.stage === 'resource', 'tick waits in resource for confirmed venue');
  ok(aeAfterTick.dateWindows?.length === 0, 'autonomous tick does not invent unusable schedule placeholders');
  ok(!aeAfterTick.inviteDraft, 'resource stage does not draft an invite before venue confirmation');
  ok(!(loadStore().platforms?.partiful || []).length, 'resource stage does not draft Partiful before plan');
  ok(
    !(loadStore().outreach || []).some((x) => x.kind === 'feedback_ask'),
    'feedback draft waits until followup',
  );
  ok(aeAfterTick.checklist?.find((c) => c.id === 'res_venue')?.done === false, 'unconfirmed venue stays unchecked');
  if (aeAfterTick.stage === 'rsvp') {
    ok(aeAfterTick.rsvpTally?.openedAt, 'same-tick rsvp tally after advance');
  }

  // A stale persisted checklist must not survive a cycle at another stage.
  const staleChecklist = loadStore();
  staleChecklist.activeEvent.checklist = [
    { id: 'res_venue', text: 'stale venue', done: true },
    { id: 'res_sponsor', text: 'stale sponsor', done: true },
    { id: 'res_volunteer', text: 'stale volunteer', done: true },
    { id: 'res_outreach', text: 'stale outreach', done: true },
  ];
  staleChecklist.offers.sponsor.push({ id: 'sp_unaccepted', city: 'San Francisco', status: 'matched', eventId: staleChecklist.activeEvent.id });
  staleChecklist.offers.volunteer.push({ id: 'vol_non_sf', city: 'Oakland', status: 'accepted', eventId: staleChecklist.activeEvent.id });
  staleChecklist.money.push({ id: 'money_intent', amount: 500, eventId: staleChecklist.activeEvent.id });
  fs.writeFileSync(storePath, JSON.stringify(staleChecklist, null, 2));
  // Second drive should fill rsvp structure if advanced far enough
  const tick2 = await eventsBotAgentTick({ goal: 'continue selftest to rsvp' });
  ok(tick2.ok, 'tick2 ok');
  const ae = loadStore().activeEvent || {};
  ok(
    ae.checklist?.every((item) => item.id.startsWith('res_')),
    'tick reconciles stale checklist to current resource stage',
  );
  ok(!ae.checklist?.find((c) => c.id === 'res_sponsor')?.done, 'matched sponsor and money intent do not satisfy resource checklist');
  ok(!ae.checklist?.find((c) => c.id === 'res_volunteer')?.done, 'non-SF volunteer does not satisfy resource checklist');
  ok(ae.checklist?.find((c) => c.id === 'res_venue')?.done === false, 'stale venue completion follows current confirmation evidence');
  // No fake RSVP counts
  const o = ae.outcomes || {};
  ok(o.invited == null, 'no fake invited count');
  ok(o.confirmed == null, 'no fake confirmed count');
  ok(o.attended == null, 'no fake attended count');

  const staleRsvp = loadStore();
  staleRsvp.activeEvent.stage = 'rsvp'; // Isolated fixture setup; set_stage bypasses are tested above.
  staleRsvp.activeEvent.venue = confirmedSfVenue;
  staleRsvp.activeEvent.inviteUrl = `https://www.trydemigod.com/?p=event&id=${staleRsvp.activeEvent.id}`;
  staleRsvp.activeEvent.checklist = [{ id: 'run_checklist', text: 'stale run task', done: true }];
  fs.writeFileSync(storePath, JSON.stringify(staleRsvp, null, 2));
  const rsvpDrive = runTool('drive_cycle', { goal: 'open rsvp tally' });
  ok(rsvpDrive.ok, 'rsvp drive ok');
  const aeR = loadStore().activeEvent || {};
  ok(aeR.rsvpTally?.openedAt, 'rsvp tally opened');
  ok(aeR.rsvpTally?.channel === 'Demigod native RSVP', 'rsvp channel uses recorded native invite');
  ok(aeR.rsvpTally?.invited == null && aeR.rsvpTally?.confirmed == null, 'tally nulls not fake');
  ok(
    !(loadStore().outreach || []).some((x) => x.kind === 'rsvp_remind_t3d' || x.kind === 'rsvp_remind_t1d'),
    'rsvp reminder drafts wait for dated start and real recipients',
  );
  ok(aeR.checklist?.find((c) => c.id === 'rsvp_tally')?.done, 'rsvp_tally checklist done');
  ok(!aeR.checklist?.find((c) => c.id === 'rsvp_remind')?.done, 'rsvp_remind checklist stays open');
  ok(!aeR.checklist?.some((c) => c.id.startsWith('run_')), 'rsvp reconciliation drops stale run checklist');
  ok(
    loadStore().events?.find((e) => e.id === aeR.id)?.checklist?.some((c) => c.id === 'rsvp_tally'),
    'rsvp reconciliation syncs event snapshot',
  );
  ok(/null|no fake|queued/i.test(rsvpDrive.summary || ''), 'rsvp summary honesty');

  // Ready reminders queue once and reconcile the checklist in the same cycle.
  const sentReminderStore = loadStore();
  sentReminderStore.activeEvent.dateWindows = ['2099-07-24T18:00:00-07:00'];
  sentReminderStore.activeEvent.rsvpTally.realList = true;
  sentReminderStore.activeEvent.outcomes.invited = 2;
  fs.writeFileSync(storePath, JSON.stringify(sentReminderStore, null, 2));
  ok(runTool('drive_cycle', { goal: 'queue ready reminders' }).ok, 'ready reminder queue ok');
  const queuedReminders = loadStore();
  const reminderCount = queuedReminders.outreach.filter((x) => x.kind?.startsWith('rsvp_remind_')).length;
  ok(reminderCount === 2, 'ready reminders queue exactly one T-3d/T-1d pair');
  ok(queuedReminders.activeEvent.rsvpTally?.remindersQueued, 'new reminders reconcile checklist same cycle');
  for (const reminder of queuedReminders.outreach.filter((x) => x.kind?.startsWith('rsvp_remind_'))) {
    reminder.status = 'sent';
    reminder.sentAt = '2026-07-21T00:00:00.000Z';
  }
  fs.writeFileSync(storePath, JSON.stringify(queuedReminders, null, 2));
  // Sent reminders are durable evidence: later RSVP ticks must not recreate them.
  ok(runTool('drive_cycle', { goal: 'reconcile sent reminders' }).ok, 'sent reminder reconciliation ok');
  const remindersAfter = loadStore();
  ok(
    remindersAfter.outreach.filter((x) => x.kind?.startsWith('rsvp_remind_')).length === reminderCount,
    'sent reminders are not re-enqueued',
  );
  ok(remindersAfter.activeEvent.rsvpTally?.remindersQueued, 'sent reminders satisfy reminder checklist');
  remindersAfter.activeEvent.outcomes.invited = null;
  remindersAfter.activeEvent.rsvpTally.realList = false;
  remindersAfter.outreach = remindersAfter.outreach.filter(
    (x) => x.kind !== 'rsvp_remind_t3d' || x.status !== 'sent',
  );
  remindersAfter.outreach.push({
    id: 'stale-reminder',
    eventId: remindersAfter.activeEvent.id,
    kind: 'rsvp_remind_t3d',
    status: 'queued',
  });
  fs.writeFileSync(storePath, JSON.stringify(remindersAfter, null, 2));
  ok(runTool('drive_cycle', { goal: 'reconcile invalid reminders' }).ok, 'invalid reminder reconciliation ok');
  const invalidRemindersAfter = loadStore();
  ok(
    !invalidRemindersAfter.outreach.some((x) => x.id === 'stale-reminder'),
    'invalid unsent reminder draft is removed',
  );
  ok(
    invalidRemindersAfter.outreach.filter((x) => x.kind?.startsWith('rsvp_remind_') && x.status === 'sent').length === 1,
    'invalid reminder cleanup preserves sent evidence',
  );
  ok(!invalidRemindersAfter.activeEvent.rsvpTally?.remindersQueued, 'invalid reminder checklist reconciles false');

  // Chat + advanceLifecycleToward: evidence language moves stage (no invent RSVPs)
  const walkedRun = advanceLifecycleToward('run', {
    note: 'selftest toward run',
    fill: false,
    goal: 'day-of',
  });
  ok(walkedRun.ok || walkedRun.stage === 'run', 'advance toward run: ' + (walkedRun.error || walkedRun.stage));
  ok((loadStore().activeEvent?.outcomes?.invited ?? null) == null, 'advance run no fake invited');

  // SF gate on idea
  const bad = runTool('record_idea', {
    title: 'Brooklyn warehouse rave',
    audience: 'Brooklyn builders',
    outcome: 'nyc only',
    needs: 'Brooklyn',
  });
  ok(bad.ok === false && bad.error === 'SF_ONLY', 'reject non-SF idea');

  const plan = planTickNext(loadStore());
  ok(plan.city === 'San Francisco', 'plan city SF');
  ok(plan.rsvpHonesty?.note && /null|fake/i.test(plan.rsvpHonesty.note), 'plan honesty note');
  ok(/^I'll /i.test(plan.ownerLine || ''), 'planTickNext ownerLine first-person');
  ok(plan.whyNow != null && String(plan.whyNow).length > 0, 'planTickNext whyNow');
  const scopedPlan = planTickNext({
    activeEvent: { id: 'ev_current', stage: 'resource', title: 'Current SF night' },
    outreach: [
      { id: 'current', eventId: 'ev_current', status: 'queued', kind: 'venue', toEmail: 'ops@trydemigod.com' },
      { id: 'stale', eventId: 'ev_old', status: 'queued', kind: 'sponsor', toEmail: 'ops@trydemigod.com' },
    ],
  });
  ok(scopedPlan.outreachQueued === 1, 'planTickNext counts only active-event outreach');
  ok(scopedPlan.topDrain?.eventId === 'ev_current', 'planTickNext never drains stale-event outreach');
  ok(
    (plan.rsvpHonesty?.invited ?? null) == null &&
      (plan.rsvpHonesty?.confirmed ?? null) == null &&
      (plan.rsvpHonesty?.attended ?? null) == null,
    'planTickNext no fake RSVP numbers',
  );
  ok(plan.gaps && Array.isArray(plan.gaps.missing), 'planTickNext gaps.missing');
  {
    const planText = [plan.ownerLine, ...(plan.next || [])].join(' ');
    // Free shortlist may say "not booked" — never bare "I booked"
    ok(!/\bI booked\b|\bbooking confirmed\b/i.test(planText), 'plan free shortlist never claims booked');
  }
  // When venue/venue_alt gap open, plan should name free shortlist or drain (draft only)
  if (plan.gaps.needVenue || plan.gaps.needVenueAlt) {
    ok(plan.gaps.topFreeVenue?.name || plan.topDrain, 'plan gap open → free shortlist or topDrain');
  }
  if (plan.outreachQueued > 0) {
    ok(plan.topDrain?.kind || /drain|queue|null/i.test(plan.ownerLine || ''), 'plan queued → topDrain or hold-null voice');
    ok(plan.topDrain?.kindNorm || plan.topDrain?.kind, 'plan topDrain has kindNorm/kind');
    // Prefer drain-first when matching draft already queued (resource/plan/rsvp only)
    if (
      ['resource', 'plan', 'rsvp'].includes(plan.stage) &&
      plan.topDrain &&
      (plan.gaps.needVenue || plan.gaps.needVenueAlt) &&
      plan.topDrain.kindNorm === 'venue'
    ) {
      ok(/draft-drain/i.test(plan.ownerLine || ''), 'plan prefers drain over re-queue venue: ' + plan.ownerLine);
    }
    if (plan.topDrain?.readiness != null) {
      ok(typeof plan.topDrain.readiness === 'number', 'plan topDrain.readiness number');
    }
    if (plan.topDrain?.why || plan.topDrain?.drainWhy) {
      ok(true, 'plan topDrain why/drainWhy present');
    }
  }
  ok(
    /Next:|I'll /i.test(ownerPlanSuffix(plan)) && /^ \*\*Next:\*\* I'll /i.test(ownerPlanSuffix(plan)),
    'ownerPlanSuffix first-person',
  );
  ok(
    !/\bsent \d|\bconfirmed \d|\binvited \d|\bI sent\b/i.test(ownerPlanSuffix(plan) + ' ' + plan.ownerLine),
    'plan suffix no fake counts/sends',
  );

  // Pure store: rsvp + weak free_list venue + queued venue_alt → prefer draft-drain (not re-queue)
  {
    const synth = {
      activeEvent: {
        id: 'evt_pref_drain',
        title: 'Prefer Drain Night',
        stage: 'rsvp',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: {
          id: 'v_lib_mission',
          name: 'Mission Branch Library meeting room',
          source: 'free_list',
          area: 'Mission',
          cost: 'free',
        },
        agenda: 'run of show',
        inviteDraft: 'invite',
        rsvpTally: { openedAt: '2026-07-01T00:00:00.000Z', remindersQueued: true },
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [
        {
          id: 'o_venue_alt',
          kind: 'venue_alt',
          status: 'queued',
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          subject: 'venue alt',
          body:
            'Ranked free SF options I already scored (not booked):\n1. Startup office · match 20\nTop free-list pick (heuristic, not booked).',
          eventId: 'evt_pref_drain',
          at: '2026-07-01T00:00:00.000Z',
          priority: OUTREACH_KIND_PRIORITY.venue,
        },
      ],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Prefer Drain Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    };
    const pref = planTickNext(synth);
    ok(pref.city === 'San Francisco', 'synth plan SF');
    ok(pref.gaps?.needVenueAlt === true, 'synth needVenueAlt');
    ok(pref.topDrain?.kindNorm === 'venue', 'synth topDrain venue: ' + pref.topDrain?.kind);
    ok(/draft-drain/i.test(pref.ownerLine || ''), 'synth preferDrain ownerLine: ' + pref.ownerLine);
    ok(!/queue a venue-alt draft/i.test(pref.ownerLine || ''), 'synth no re-queue venue-alt');
    ok((pref.rsvpHonesty?.invited ?? null) == null, 'synth no fake invited');
    ok(typeof pref.topDrain?.readiness === 'number', 'synth topDrain readiness');
    // Drain can lead, but null-count honesty stays in next[] for chat/tick voice
    ok(
      Array.isArray(pref.next) &&
        pref.next.some((n) => /null until real|hold invited\/confirmed/i.test(n)),
      'synth rsvp pipeline includes hold-null: ' + (pref.next || []).join(' | '),
    );
    // Reminder-class drain gets clearer whyNow for chat status voice
    ok(
      /null|no fake|reminder|invite|queued/i.test(pref.whyNow || ''),
      'synth rsvp drain whyNow honest: ' + pref.whyNow,
    );
  }

  // rsvp structure ready + empty queue still needs a real future datetime
  {
    const ready = planTickNext({
      activeEvent: {
        id: 'evt_rsvp_ready',
        title: 'Ready Run Night',
        stage: 'rsvp',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: {
          name: 'Mission loft offer',
          source: 'offer',
          area: 'Mission',
          capacity: 24,
          confirmed: true,
          confirmationEvidence: 'Host confirmed by email',
        },
        agenda: 'run of show',
        inviteDraft: 'invite',
        rsvpTally: { openedAt: '2026-07-01T00:00:00.000Z', remindersQueued: true },
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Ready Run Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(ready.city === 'San Francisco', 'rsvp-ready plan SF');
    ok(!/advance to run/i.test(ready.ownerLine || ''), 'undated rsvp does not claim run-ready: ' + ready.ownerLine);
    ok(
      Array.isArray(ready.next) &&
        ready.next.some((n) => /null until real|hold invited\/confirmed/i.test(n)),
      'rsvp-ready pipeline hold-null',
    );
    ok((ready.rsvpHonesty?.confirmed ?? null) == null, 'rsvp-ready no fake confirmed');
  }

  // plan stage: hard artifacts (agenda) before optional sponsor gap — tick planning quality
  {
    const planSynth = {
      activeEvent: {
        id: 'evt_plan_first',
        title: 'Plan First Night',
        stage: 'plan',
        city: 'San Francisco',
        seats: 14,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: { name: 'Dogpatch warehouse loft', source: 'free_list', area: 'Dogpatch', cost: 'free' },
        agenda: null,
        inviteDraft: null,
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    };
    const pp = planTickNext(planSynth);
    ok(/^I'll /i.test(pp.ownerLine || ''), 'plan-first ownerLine first-person');
    ok(
      /agenda|run-of-show|invite|Partiful|Luma/i.test(pp.ownerLine || ''),
      'plan stage leads with hard artifact not sponsor: ' + pp.ownerLine,
    );
    ok(!/^I'll queue a sponsor/i.test(pp.ownerLine || ''), 'plan ownerLine not sponsor-first');
    ok(
      Array.isArray(pp.next) && pp.next.some((n) => /agenda|invite|Partiful|Luma/i.test(n)),
      'plan next includes artifact step',
    );
    ok((pp.rsvpHonesty?.invited ?? null) == null, 'plan-first no fake invited');
  }

  // run / followup / debrief: null-count honesty stays in pipeline (chat/tick voice)
  {
    const lateBase = {
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Late Cycle Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    };
    const lateAe = {
      id: 'evt_late',
      title: 'Late Cycle Night',
      city: 'San Francisco',
      seats: 12,
      audience: 'SF builders',
      outcome: 'second meetings',
      venue: { name: 'Mission Branch Library meeting room', source: 'free_list' },
      agenda: 'run of show',
      inviteDraft: 'invite',
      rsvpTally: { openedAt: '2026-07-01T00:00:00.000Z', remindersQueued: true },
      outcomes: { invited: null, confirmed: null, attended: null },
    };
    for (const st of ['run', 'followup', 'debrief']) {
      const late = planTickNext({ ...lateBase, activeEvent: { ...lateAe, stage: st } });
      ok(late.city === 'San Francisco', 'late ' + st + ' SF');
      ok(/^I'll /i.test(late.ownerLine || ''), 'late ' + st + ' first-person');
      ok(
        Array.isArray(late.next) &&
          late.next.some((n) => /null|no fake|real attendance|door tally/i.test(n)),
        'late ' + st + ' pipeline null honesty: ' + (late.next || []).join(' | '),
      );
      ok((late.rsvpHonesty?.attended ?? null) == null, 'late ' + st + ' no fake attended');
    }
  }

  const chat = await eventsBotChat({
    messages: [{ role: 'user', content: 'what is your job?' }],
    ip: 'selftest',
  });
  ok(chat.ok && /organizer|own|end-to-end|Events Bot|I'm/i.test(chat.reply), 'chat owner voice: ' + (chat.reply || '').slice(0, 80));
  ok(/draft|queue|runbook/i.test(chat.reply || '') && /evidence-gated/i.test(chat.reply || ''), 'chat capability honesty');
  ok(!/you stay host/i.test(chat.reply || ''), 'no co-pilot host line');
  ok(/I'm |I drive|I own|organizer of record/i.test(chat.reply || ''), 'chat first-person owner');
  ok(!/Next I will:\s*Open|Next I will:\s*Select|Next I will:\s*Queue/i.test(chat.reply || ''), 'no awkward Next I will: Imperative');
  ok(/Next:|I'll /i.test(chat.reply || ''), 'chat surfaces plan Next');
  ok(chat.plan?.city === 'San Francisco', 'chat plan city SF');

  const rsvpChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'how do RSVPs work?' }],
    ip: 'selftest-rsvp',
  });
  ok(rsvpChat.ok && /no fake rsvp|null until real|null/i.test(rsvpChat.reply || ''), 'chat no-fake-rsvp');

  // Chat offline SF gate uses shared mentionsNonSf (not a short city list)
  const ssfChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'host in South San Francisco warehouse' }],
    ip: 'selftest-ssf-geo',
  });
  ok(
    ssfChat.ok && /only produce \*\*San Francisco\*\*|Non-SF rooms|out of scope/i.test(ssfChat.reply || ''),
    'chat rejects SSF: ' + (ssfChat.reply || '').slice(0, 90),
  );
  const brookChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'Brooklyn rooftop for 40' }],
    ip: 'selftest-bk-geo',
  });
  ok(
    brookChat.ok && /only produce \*\*San Francisco\*\*|Non-SF rooms|out of scope/i.test(brookChat.reply || ''),
    'chat rejects Brooklyn',
  );
  const galaChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'throw a gala for founders' }],
    ip: 'selftest-gala-geo',
  });
  ok(
    galaChat.ok && !/only produce \*\*San Francisco\*\*|Non-SF rooms are out of scope/i.test(galaChat.reply || ''),
    'chat gala not false SF reject: ' + (galaChat.reply || '').slice(0, 90),
  );

  const fuelChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'I have a free office in Mission for 20 people' }],
    ip: 'selftest-fuel',
  });
  ok(fuelChat.ok && /fuel|attach|I own|I'll take/i.test(fuelChat.reply || ''), 'chat inbound venue fuel: ' + (fuelChat.reply || '').slice(0, 90));
  ok(!/you stay host|tell me what to do/i.test(fuelChat.reply || ''), 'fuel chat no co-pilot');
  ok(/no auto-booking|not sent|no fake/i.test(fuelChat.reply || '') || /I'll /i.test(fuelChat.reply || ''), 'fuel chat honesty or plan');

  const statusChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'status — where are we?' }],
    ip: 'selftest-status',
  });
  ok(statusChat.ok && /I'm owning|stage/i.test(statusChat.reply || ''), 'status chat owner snapshot');
  ok(/I'll /i.test(statusChat.reply || '') || /Next:/i.test(statusChat.reply || ''), 'status chat plan voice');
  ok(statusChat.plan?.ownerLine ? /^I'll /i.test(statusChat.plan.ownerLine) : true, 'status chat plan payload first-person');
  ok(statusChat.plan?.gaps != null, 'status chat plan includes gaps');
  ok(
    !statusChat.plan?.gaps?.missing?.length ||
      /Gaps:|gap|shortlist|drain|Next:|I'll /i.test(statusChat.reply || ''),
    'status chat surfaces gaps or plan next',
  );
  ok(!/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(statusChat.reply || ''), 'status no fake RSVP counts');
  if (statusChat.plan?.topDrain?.kind) {
    ok(/draft drain|drain|Next:|I'll /i.test(statusChat.reply || ''), 'status surfaces topDrain or plan');
  }
  // Owner focus line when plan has whyNow (tick planning → chat status voice)
  if (statusChat.plan?.whyNow) {
    ok(
      /Owner focus|why:|I'll |Next:/i.test(statusChat.reply || ''),
      'status surfaces owner focus / plan: ' + (statusChat.reply || '').slice(0, 120),
    );
  }
  // Advance-first tick plan → status stage-gate voice
  if (statusChat.plan?.readyToAdvance) {
    ok(
      /Stage gate open|I'll advance|I'll seed|Next:/i.test(statusChat.reply || ''),
      'status stage-gate when readyToAdvance: ' + (statusChat.reply || '').slice(0, 120),
    );
  }
  // Status (not only explicit tick-plan) names gate held · unlock when gate is held
  if (statusChat.plan?.gateStatus === 'held' && !statusChat.plan?.readyToAdvance) {
    ok(
      /gate held\s*·\s*unlock:\s*I'll /i.test(statusChat.reply || ''),
      'status gate held unlock voice: ' + (statusChat.reply || '').slice(0, 140),
    );
  }
  // Owner tick pipeline: rsvp stage keeps null-count honesty in plan.next + status voice
  if (statusChat.plan?.stage === 'rsvp') {
    ok(
      /null|no fake rsvp/i.test(statusChat.reply || ''),
      'status rsvp stage honesty voice: ' + (statusChat.reply || '').slice(0, 100),
    );
    ok(
      Array.isArray(statusChat.plan?.next) &&
        statusChat.plan.next.some((n) => /null until real|no fake/i.test(n)),
      'status plan pipeline holds null RSVPs',
    );
  }
  if ((statusChat.plan?.next || []).length >= 2) {
    ok(
      /Pipeline:\s*\(1\)|Then:|I'll /i.test(statusChat.reply || ''),
      'status multi-step pipeline voice',
    );
    // Multi-step status uses numbered Pipeline as plan surface — no double primary
    if (/Pipeline:\s*\(1\)/i.test(statusChat.reply || '')) {
      ok(
        !/\*\*Next:\*\*.{0,200}Pipeline:\s*\(1\)/i.test(statusChat.reply || ''),
        'status multi-step no double primary Next+Pipeline',
      );
    }
  }
  ok(!/you stay host|tell me what to do as host/i.test(statusChat.reply || ''), 'status no co-pilot');

  const sponsorChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'can you find a drink sponsor?' }],
    ip: 'selftest-sponsor-voice',
  });
  ok(
    sponsorChat.ok && /sponsor|I'll |I recruit/i.test(sponsorChat.reply || ''),
    'sponsor chat owner voice: ' + (sponsorChat.reply || '').slice(0, 90),
  );
  ok(/pending|intent|queued|not sent|no card|I'll /i.test(sponsorChat.reply || ''), 'sponsor chat honesty');
  ok(!/you stay host|as host, you/i.test(sponsorChat.reply || ''), 'sponsor chat no co-pilot');
  ok(!/\b\d+\s+rsvps?\b/i.test(sponsorChat.reply || ''), 'sponsor chat no fake rsvp totals');

  const venueChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'need a venue for 20 in SoMa' }],
    ip: 'selftest-venue-voice',
  });
  ok(
    venueChat.ok && /venue|shortlist|I'll |I own/i.test(venueChat.reply || ''),
    'venue chat owner voice: ' + (venueChat.reply || '').slice(0, 90),
  );
  ok(/not booked|no auto-booking|heuristic/i.test(venueChat.reply || ''), 'venue chat not-booked honesty');
  // Demand "need a venue" must NOT be misread as inbound fuel
  ok(
    !/I'll take that as fuel/i.test(venueChat.reply || ''),
    'venue demand not fuel: ' + (venueChat.reply || '').slice(0, 90),
  );

  // Count ask → null honesty (no invent confirmed/attended)
  const countChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'how many people confirmed?' }],
    ip: 'selftest-count-ask',
  });
  ok(
    countChat.ok && /null|no fake rsvp/i.test(countChat.reply || ''),
    'count ask null honesty: ' + (countChat.reply || '').slice(0, 100),
  );
  ok(
    !/\b\d+\s+(people|guests|rsvps?)\s+(confirmed|attending)/i.test(countChat.reply || ''),
    'count ask no invented headcount',
  );
  ok(/I'll |Next:/i.test(countChat.reply || ''), 'count ask surfaces plan');

  // Host co-pilot language → reclaim owner voice
  const hostChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'what should I do as host?' }],
    ip: 'selftest-host-reclaim',
  });
  ok(
    hostChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(hostChat.reply || ''),
    'host reclaim owner voice: ' + (hostChat.reply || '').slice(0, 100),
  );
  ok(!/you stay host|tell me what to do as host/i.test(hostChat.reply || ''), 'host reclaim no co-pilot echo');
  ok(/I'll |Next:/i.test(hostChat.reply || ''), 'host reclaim surfaces plan');

  // Broader host reclaim: "I'm the host" / co-pilot (not status "next" alone)
  const hostImChat = await eventsBotChat({
    messages: [{ role: 'user', content: "I'm the host — what next?" }],
    ip: 'selftest-host-im',
  });
  ok(
    hostImChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(hostImChat.reply || ''),
    'host I\'m-the-host reclaim: ' + (hostImChat.reply || '').slice(0, 100),
  );
  ok(!/I'll take that as fuel/i.test(hostImChat.reply || ''), 'host I\'m-the-host not fuel');
  const copilotChat = await eventsBotChat({
    messages: [{ role: 'user', content: "you're my co-pilot, give me tasks" }],
    ip: 'selftest-copilot',
  });
  ok(
    copilotChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(copilotChat.reply || ''),
    'copilot reclaim: ' + (copilotChat.reply || '').slice(0, 100),
  );
  // "should I run the room?" must reclaim, not false-positive drive_cycle
  const shouldRunChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'should I run the room?' }],
    ip: 'selftest-should-run',
  });
  ok(
    shouldRunChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(shouldRunChat.reply || ''),
    'should-I-run reclaim not drive: ' + (shouldRunChat.reply || '').slice(0, 100),
  );
  ok(
    !shouldRunChat.driven || !shouldRunChat.driven.stage,
    'should-I-run no drive payload',
  );
  ok(!/^I drove/i.test(shouldRunChat.reply || ''), 'should-I-run no I-drove lead');

  // Broader host reclaim: "assign me host tasks" / "I will just show up"
  const assignHostChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'assign me host tasks' }],
    ip: 'selftest-assign-host',
  });
  ok(
    assignHostChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(assignHostChat.reply || ''),
    'assign-host-tasks reclaim: ' + (assignHostChat.reply || '').slice(0, 100),
  );
  ok(!/I'll take that as fuel/i.test(assignHostChat.reply || ''), 'assign-host not fuel');
  ok(/I'll |Next:/i.test(assignHostChat.reply || ''), 'assign-host surfaces plan');
  const justShowChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'I will just show up — you run everything' }],
    ip: 'selftest-just-show',
  });
  ok(
    justShowChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(justShowChat.reply || ''),
    'just-show-up reclaim: ' + (justShowChat.reply || '').slice(0, 100),
  );
  ok(!/^I drove/i.test(justShowChat.reply || ''), 'just-show-up no drive lead');

  // Wave-4 co-pilot residual: "you're running the show" / host baton → reclaim owner voice
  const runningShowChat = await eventsBotChat({
    messages: [{ role: 'user', content: "you're running the show — I'll just advise" }],
    ip: 'selftest-running-show',
  });
  ok(
    runningShowChat.ok &&
      /organizer of record|not.*host co-pilot|I drive/i.test(runningShowChat.reply || ''),
    'running-show reclaim: ' + (runningShowChat.reply || '').slice(0, 100),
  );
  ok(!runningShowChat.driven?.stage, 'running-show no drive');
  ok(/I'll |Next:|Pipeline:/i.test(runningShowChat.reply || ''), 'running-show surfaces plan');
  ok(
    !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(runningShowChat.reply || ''),
    'running-show no fake RSVPs',
  );
  const hostBatonChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'pass the host baton to me' }],
    ip: 'selftest-host-baton',
  });
  ok(
    hostBatonChat.ok &&
      /organizer of record|not.*host co-pilot|I drive/i.test(hostBatonChat.reply || ''),
    'host-baton reclaim: ' + (hostBatonChat.reply || '').slice(0, 100),
  );
  ok(!hostBatonChat.driven?.stage, 'host-baton no drive');
  ok(/San Francisco|I'll |Pipeline:/i.test(hostBatonChat.reply || ''), 'host-baton SF/plan');

  // Wave-5 co-pilot residual: captain / passenger / coach / host seat → reclaim owner voice
  const captainChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'you captain the night — I am just passenger' }],
    ip: 'selftest-captain-passenger',
  });
  ok(
    captainChat.ok &&
      /organizer of record|not.*host co-pilot|I drive/i.test(captainChat.reply || ''),
    'captain-passenger reclaim: ' + (captainChat.reply || '').slice(0, 100),
  );
  ok(!captainChat.driven?.stage, 'captain-passenger no drive');
  ok(/I'll |Next:|Pipeline:/i.test(captainChat.reply || ''), 'captain-passenger surfaces plan');
  ok(
    !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(captainChat.reply || ''),
    'captain-passenger no fake RSVPs',
  );
  const coachHostChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'coach me as host' }],
    ip: 'selftest-coach-host',
  });
  ok(
    coachHostChat.ok &&
      /organizer of record|not.*host co-pilot|I drive/i.test(coachHostChat.reply || ''),
    'coach-host reclaim: ' + (coachHostChat.reply || '').slice(0, 100),
  );
  ok(!coachHostChat.driven?.stage, 'coach-host no drive');
  ok(/San Francisco|I'll |Pipeline:/i.test(coachHostChat.reply || ''), 'coach-host SF/plan');
  const hostSeatChat = await eventsBotChat({
    messages: [{ role: 'user', content: "you're in the host seat" }],
    ip: 'selftest-host-seat',
  });
  ok(
    hostSeatChat.ok &&
      /organizer of record|not.*host co-pilot|I drive/i.test(hostSeatChat.reply || ''),
    'host-seat reclaim: ' + (hostSeatChat.reply || '').slice(0, 100),
  );
  ok(!hostSeatChat.driven?.stage, 'host-seat no drive');

  // Wave-6 co-pilot residual: coordinator / sidekick / MC / FOOH / staff → reclaim owner voice
  for (const [phrase, tag] of [
    ['you are my event coordinator', 'event-coordinator'],
    ['I am the host you assist', 'host-you-assist'],
    ['be my sidekick', 'sidekick'],
    ['I will MC you support', 'mc-you-support'],
    ['you support I MC', 'support-i-mc'],
    ['I am the human host', 'human-host'],
    ['you are staff for the host', 'staff-for-host'],
    ['delegate the hosting to me', 'delegate-hosting-the'],
    ['I stay in charge you help', 'stay-in-charge'],
    ['you are backup host', 'backup-host'],
    ['I am front of house you plan', 'front-of-house'],
    ['you are the planner I am the face', 'planner-face'],
    ['face of the room is me', 'face-of-room'],
  ]) {
    const w6 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w6-copilot-' + tag,
    });
    ok(
      w6.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w6.reply || ''),
      tag + ' reclaim: ' + (w6.reply || '').slice(0, 100),
    );
    ok(!w6.driven?.stage, tag + ' no drive');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w6.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w6.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-7 co-pilot residual: producer / logistics / stage manage / ops / deputy → reclaim
  // (esp. "you produce the night I host" must not false-positive drive_cycle)
  for (const [phrase, tag] of [
    ['you are my event producer', 'event-producer'],
    ['be my producer', 'be-producer'],
    ['I am talent you produce', 'talent-you-produce'],
    ['you produce the night I host', 'produce-night-i-host'],
    ['you are the logistics lead I host', 'logistics-lead'],
    ['I am the talent you handle logistics', 'talent-logistics'],
    ['you stage manage I talk', 'stage-manage'],
    ['I emcee you stage manage', 'emcee-stage-manage'],
    ['you are my event manager', 'event-manager'],
    ['be my event manager', 'be-event-manager'],
    ['you are floor manager', 'floor-manager'],
    ['you do ops I greet', 'ops-i-greet'],
    ['I am greeter you organize', 'greeter-you-organize'],
    ['be my number two', 'number-two'],
    ['you are my second chair', 'second-chair'],
    ['I am figurehead you run ops', 'figurehead'],
    ['be my ops lead', 'ops-lead'],
    ['you handle ops I smile', 'handle-ops-smile'],
    ['you are my event deputy', 'event-deputy'],
    ['be my deputy', 'be-deputy'],
    ['I am public face you ops', 'public-face'],
    ['you are understudy host', 'understudy'],
    ['just advise me I host', 'advise-me-i-host'],
    ['I am the name on the invite you run it', 'name-on-invite'],
  ]) {
    const w7 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w7-copilot-' + tag,
    });
    ok(
      w7.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w7.reply || ''),
      tag + ' reclaim: ' + (w7.reply || '').slice(0, 100),
    );
    ok(!w7.driven?.stage, tag + ' no drive');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w7.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w7.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-8 co-pilot residual: showrunner / stagehand / crew / BOH / EP / right-hand → reclaim
  for (const [phrase, tag] of [
    ['you are my showrunner', 'showrunner'],
    ['be my showrunner', 'be-showrunner'],
    ['you are my stagehand', 'stagehand'],
    ['be my stagehand', 'be-stagehand'],
    ['you are my crew chief', 'crew-chief'],
    ['be my right hand', 'right-hand'],
    ['you are my right hand', 'my-right-hand'],
    ['you are my wrangler', 'wrangler'],
    ['be my wrangler', 'be-wrangler'],
    ['be my exec producer', 'exec-producer'],
    ['you are the EP I host', 'ep-i-host'],
    ['I am the talent you are the crew', 'talent-crew'],
    ['you run the back of house I host', 'boh-i-host'],
    ['you are BOH I am FOH', 'boh-foh'],
    ['you handle production I host', 'handle-production'],
    ['you are production I talk', 'production-i-talk'],
    ['I am on stage you run production', 'on-stage-production'],
    ['you are backstage I am on stage', 'backstage-on-stage'],
    ['I am the face you run the show', 'face-run-show'],
    ['you are the brains I am the face', 'brains-face'],
    ['I am ceremonial host you run ops', 'ceremonial-host'],
    ['I am the celebrity host you produce', 'celebrity-host'],
    ['you do the dirty work I greet', 'dirty-work'],
    ['you handle everything behind the scenes I host', 'behind-scenes'],
    ['behind the scenes is you I host', 'behind-scenes-you'],
    ['make me the figurehead', 'make-figurehead'],
  ]) {
    const w8 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w8-copilot-' + tag,
    });
    ok(
      w8.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w8.reply || ''),
      tag + ' reclaim: ' + (w8.reply || '').slice(0, 100),
    );
    ok(!w8.driven?.stage, tag + ' no drive');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w8.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w8.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-9 co-pilot residual: fixer / roadie / star / TD / quarterback / ATC
  // (esp. "I am the star you run the night" must not false-positive drive_cycle)
  for (const [phrase, tag] of [
    ['you are my fixer', 'fixer'],
    ['be my fixer', 'be-fixer'],
    ['you are the handler I am talent', 'handler-i-talent'],
    ['I am talent you are the handler', 'talent-handler'],
    ['be my roadie', 'be-roadie'],
    ['you are my roadie', 'roadie'],
    ['I am the star you run the night', 'star-run-night'],
    ['you run logistics I am the star', 'logistics-i-star'],
    ['be my technical director', 'be-td'],
    ['you are the TD I host', 'td-i-host'],
    ['I am the guest of honor you organize', 'guest-of-honor'],
    ['you are back office I am front', 'back-office-front'],
    ['make me the celebrity', 'make-celebrity'],
    ['you handle all the details I show up', 'details-i-show'],
    ['I just show my face you do the rest', 'show-face'],
    ['you are my air traffic controller', 'atc'],
    ['be my air traffic controller', 'be-atc'],
    ['be my quarterback', 'be-quarterback'],
    ['you are my quarterback I am the face', 'quarterback-face'],
  ]) {
    const w9 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w9-copilot-' + tag,
    });
    ok(
      w9.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w9.reply || ''),
      tag + ' reclaim: ' + (w9.reply || '').slice(0, 100),
    );
    ok(!w9.driven?.stage, tag + ' no drive');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w9.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w9.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-10 co-pilot residual: chief of staff / wingman / headliner / day-of lead / glad-hand
  // (esp. "I just glad-hand you run the night" must not false-positive drive_cycle;
  //  "day-of lead" must not stage-advance via day-of → run)
  for (const [phrase, tag] of [
    ['you are my chief of staff', 'chief-of-staff'],
    ['be my chief of staff', 'be-chief-of-staff'],
    ['be my wingman', 'be-wingman'],
    ['you are my wingman I host', 'wingman-i-host'],
    ['be my concierge', 'be-concierge'],
    ['you are my butler I host', 'butler-i-host'],
    ['I am the VIP you handle logistics', 'vip-logistics'],
    ['you are my body man I am talent', 'body-man'],
    ['be my adjutant', 'be-adjutant'],
    ['you are my aide-de-camp', 'aide-de-camp'],
    ['be my aide', 'be-aide'],
    ['I am the headliner you produce', 'headliner-produce'],
    ['I am the headliner you run the night', 'headliner-run-night'],
    ['you run the night I am the headliner', 'run-night-headliner'],
    ['I am the keynote you handle the room', 'keynote'],
    ['make me the headliner', 'make-headliner'],
    ['make me the marquee', 'make-marquee'],
    ['I am the marquee you produce', 'marquee-produce'],
    ['I am the billboard you run ops', 'billboard'],
    ['you are my day-of lead I am the face', 'day-of-lead-face'],
    ['be my day-of lead', 'be-day-of-lead'],
    ['you do the heavy lifting I schmooze', 'heavy-lifting'],
    ['I just glad-hand you run the night', 'glad-hand-run-night'],
    ['you are my personal assistant', 'personal-assistant'],
    ['be my personal assistant for the night', 'be-pa-night'],
    ['you are my PA I host', 'pa-i-host'],
    ['you are my pit crew', 'pit-crew'],
    ['be my pit crew', 'be-pit-crew'],
    ['you are the pit boss I schmooze', 'pit-boss'],
    ['you are my advance man', 'advance-man'],
    ['be my advance team', 'be-advance-team'],
  ]) {
    const w10 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w10-copilot-' + tag,
    });
    ok(
      w10.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w10.reply || ''),
      tag + ' reclaim: ' + (w10.reply || '').slice(0, 100),
    );
    ok(!w10.driven?.stage, tag + ' no drive');
    ok(!w10.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w10.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w10.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-11 co-pilot residual: speechify / ribbon / sherpa / bag man / house manager / EA
  // (esp. "I just speechify you run the night" / "I cut the ribbon you run the night"
  //  must not false-positive drive_cycle via "run the night")
  for (const [phrase, tag] of [
    ['you are my bag man', 'bag-man'],
    ['be my bag man', 'be-bag-man'],
    ['you are my sherpa', 'sherpa'],
    ['be my sherpa', 'be-sherpa'],
    ['be my man Friday', 'man-friday'],
    ['you are my factotum', 'factotum'],
    ['be my valet', 'be-valet'],
    ['you are my intern I host', 'intern-i-host'],
    ['be my gofer', 'be-gofer'],
    ['be my runner', 'be-runner'],
    ['I just speechify you run the night', 'speechify-run-night'],
    ['I cut the ribbon you run the night', 'ribbon-run-night'],
    ['I am the ribbon cutter you run ops', 'ribbon-cutter'],
    ['I do photo ops you produce', 'photo-ops'],
    ['I just toast you produce', 'toast-produce'],
    ['I just do welcomes you run ops', 'welcomes-run-ops'],
    ['I just speak you produce', 'just-speak'],
    ['you produce I just speak', 'produce-i-speak'],
    ['I am just the speaker you produce', 'just-speaker'],
    ['I am the keynote speaker you organize', 'keynote-speaker'],
    ['you handle the room I just speak', 'handle-room-speak'],
    ['you are my campaign manager', 'campaign-manager'],
    ['be my scheduler', 'be-scheduler'],
    ['be my production assistant', 'be-prod-assistant'],
    ['you are my exec assistant', 'exec-assistant'],
    ['be my EA', 'be-ea'],
    ['you are my floor captain', 'floor-captain'],
    ['be my house manager', 'be-house-manager'],
    ['you are my house manager', 'house-manager'],
    ['you are my stage manager I speak', 'stage-manager'],
    ['you are my proxy host', 'proxy-host'],
    ['you are the backline I am FOH', 'backline-foh'],
    ['you are my gaffer', 'gaffer'],
    ['make me the VIP', 'make-vip'],
    ['I am the face of the brand you run ops', 'face-of-brand'],
    ['you are my right-hand man', 'right-hand-man'],
    ['be my number 2', 'number-2'],
    ['be my handler of record', 'handler-of-record'],
    ['you are my logistics I host', 'logistics-i-host'],
    ['I just glad hand the room you organize', 'glad-hand-room'],
  ]) {
    const w11 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w11-copilot-' + tag,
    });
    ok(
      w11.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w11.reply || ''),
      tag + ' reclaim: ' + (w11.reply || '').slice(0, 100),
    );
    ok(!w11.driven?.stage, tag + ' no drive');
    ok(!w11.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w11.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w11.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-12 co-pilot residual: majordomo / batman / entourage / publicist / pose / green room
  // (esp. "I just do intros you run the night" must not false-positive follow-up via "intro"
  //  or drive_cycle via "run the night"; "I just pose you produce" must not drive)
  for (const [phrase, tag] of [
    ['you are my majordomo', 'majordomo'],
    ['be my majordomo', 'be-majordomo'],
    ['you are my batman I host', 'batman-i-host'],
    ['be my batman', 'be-batman'],
    ['you are my entourage lead', 'entourage-lead'],
    ['be my entourage', 'be-entourage'],
    ['I am the guest speaker you handle everything', 'guest-speaker'],
    ['you are my travel agent for the night', 'travel-agent'],
    ['be my bodyguard I talk', 'bodyguard-i-talk'],
    ['you are my PR person I am the face', 'pr-person-face'],
    ['I just pose you produce', 'pose-produce'],
    ['I just smile and wave you run ops', 'smile-wave'],
    ['you are my booking agent', 'booking-agent'],
    ['be my talent manager', 'be-talent-manager'],
    ['you are my publicist I speak', 'publicist-i-speak'],
    ['make me the guest of honor', 'make-guest-of-honor'],
    ['I am ceremonial you run the night', 'ceremonial-run-night'],
    ['you are my sommelier I host', 'sommelier-i-host'],
    ['be my night manager', 'be-night-manager'],
    ['you are the event staff I am talent', 'event-staff-talent'],
    ['I just cut cake you organize', 'cut-cake'],
    ['you are my scribe', 'scribe'],
    ['be my scribe', 'be-scribe'],
    ['you are my stenographer', 'stenographer'],
    ['I am on camera you produce', 'on-camera-produce'],
    ['you run the green room I host', 'green-room-i-host'],
    ['be my green room manager', 'be-green-room'],
    ['you are my hospitality lead', 'hospitality-lead'],
    ['I just do intros you run the night', 'intros-run-night'],
    ['you are my emcee coach', 'emcee-coach'],
  ]) {
    const w12 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w12-copilot-' + tag,
    });
    ok(
      w12.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w12.reply || ''),
      tag + ' reclaim: ' + (w12.reply || '').slice(0, 100),
    );
    ok(!w12.driven?.stage, tag + ' no drive');
    ok(!w12.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w12.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w12.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-13 co-pilot residual: ops team / production company / booker / talent / show-up
  // (esp. "I show up you do everything" must not generic lifecycle; "you're the booker" not venue)
  for (const [phrase, tag] of [
    ["you're my ops team", 'ops-team'],
    ['be my ops team', 'be-ops-team'],
    ["you're the production company", 'production-company'],
    ['be my production company', 'be-production-company'],
    ["you're my entire production team", 'entire-production-team'],
    ['treat me like talent', 'treat-like-talent'],
    ["I'm the talent you are production", 'talent-you-production'],
    ['I show up you do everything', 'show-up-everything'],
    ["you're the booker", 'booker'],
    ['you are the booker I host', 'booker-i-host'],
    ["I'll glad-hand you produce", 'gladhand-you-produce'],
    ['you handle production I glad hand', 'production-i-gladhand'],
    ['personal assistant for the night', 'pa-for-night'],
    ["you're logistics I host", 'logistics-i-host'],
    ['I just show my face you produce everything', 'show-face-produce'],
  ]) {
    const w13 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w13-copilot-' + tag,
    });
    ok(
      w13.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w13.reply || ''),
      tag + ' reclaim: ' + (w13.reply || '').slice(0, 100),
    );
    ok(!w13.driven?.stage, tag + ' no drive');
    ok(!w13.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w13.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w13.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-14 co-pilot residual: event agency / bare handler / bare back office / network-schmooze / VIP
  // ("I'll work the room you handle ops" must not venue-demand path; bare handler not lifecycle)
  for (const [phrase, tag] of [
    ["you're the event agency", 'event-agency'],
    ['be my event agency', 'be-event-agency'],
    ['you are the agency I am the face', 'agency-i-face'],
    ["you're my handler", 'handler-bare'],
    ['be my handler', 'be-handler'],
    ["you're the back office", 'back-office-bare'],
    ['I front you back office', 'front-back-office'],
    ["you're my ghost producer", 'ghost-producer'],
    ['be my external ops', 'be-external-ops'],
    ["you're my external ops", 'external-ops'],
    ["I'll network you produce", 'network-you-produce'],
    ["I'll schmooze you produce", 'schmooze-you-produce'],
    ["I'll work the room you handle ops", 'work-room-ops'],
    ["I'll glad-hand you are ops", 'gladhand-you-are-ops'],
    ['treat me like VIP', 'treat-like-vip'],
    ['I just do vibes you handle ops', 'vibes-you-ops'],
    ["you're my support staff", 'support-staff'],
    ['be my white-glove', 'white-glove'],
  ]) {
    const w14 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w14-copilot-' + tag,
    });
    ok(
      w14.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w14.reply || ''),
      tag + ' reclaim: ' + (w14.reply || '').slice(0, 100),
    );
    ok(!w14.driven?.stage, tag + ' no drive');
    ok(!w14.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w14.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w14.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-15 co-pilot residual: operator / ops desk / engine room / hold court / admin / machine
  // ("I do the room you do the work" must not venue-demand; bare operator not lifecycle)
  for (const [phrase, tag] of [
    ["you're my operator", 'operator'],
    ['be my operator', 'be-operator'],
    ["you're my event ops", 'event-ops'],
    ['be my event ops', 'be-event-ops'],
    ["you're my ops desk", 'ops-desk'],
    ['be my ops desk', 'be-ops-desk'],
    ["you're my engine room", 'engine-room'],
    ['be my ground control', 'be-ground-control'],
    ["you're my mission control", 'mission-control'],
    ["I'll hold court you produce", 'hold-court-produce'],
    ["I'll work the crowd you handle ops", 'work-crowd-ops'],
    ['you do the work I do the room', 'work-vs-room'],
    ['I do the room you do the work', 'room-vs-work'],
    ["you're my event admin", 'event-admin'],
    ['be my admin', 'be-admin'],
    ['you handle the admin I host', 'admin-i-host'],
    ["you're my desk", 'desk'],
    ['be my production desk', 'be-production-desk'],
    ["you're my spreadsheet", 'spreadsheet'],
    ["you're the machine I am the face", 'machine-i-face'],
    ["you're my night ops", 'night-ops'],
    ['be my field ops', 'be-field-ops'],
    ["I'll network you handle everything", 'network-handle-everything'],
    ['treat me like the face', 'treat-like-face'],
    ["you're my backstop", 'backstop'],
    ['be my air cover', 'air-cover'],
  ]) {
    const w15 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w15-copilot-' + tag,
    });
    ok(
      w15.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w15.reply || ''),
      tag + ' reclaim: ' + (w15.reply || '').slice(0, 100),
    );
    ok(!w15.driven?.stage, tag + ' no drive');
    ok(!w15.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w15.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w15.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-16 co-pilot residual: control tower / engine / face / door / silent partner / CRM
  // Apostrophe-less "youre my …" must reclaim (not bare war-room tick plan / generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my control tower", 'control-tower'],
    ['be my control tower', 'be-control-tower'],
    ['youre my control tower', 'youre-control-tower'],
    ["you're my war room", 'war-room-copilot'],
    ['youre my war room', 'youre-war-room'],
    ['be my event engine', 'be-event-engine'],
    ["you're my production engine", 'production-engine'],
    ["you're my kitchen", 'kitchen'],
    ['be my secretariat', 'be-secretariat'],
    ["you're my chief of ops", 'chief-of-ops'],
    ["I'll be the face you run the night", 'ill-face-you-run'],
    ["I'm the face you run the night", 'im-face-you-run'],
    ["you're my number cruncher", 'number-cruncher'],
    ['be my boiler room', 'be-boiler-room'],
    ["I'll glad-hand you do the logistics", 'gladhand-logistics'],
    ['treat me like the marquee', 'treat-marquee'],
    ["you're my human crm", 'human-crm'],
    ['be my rolodex', 'be-rolodex'],
    ["you're my switchboard", 'switchboard'],
    ["I'll work the door you do everything", 'work-door-everything'],
    ["you're my door staff", 'door-staff'],
    ['be my house staff', 'be-house-staff'],
    ["I'll take the photos you produce", 'take-photos-produce'],
    ["you're my silent partner", 'silent-partner'],
    ['youre my silent partner', 'youre-silent-partner'],
    ["I'll be the talent you produce", 'ill-talent-produce'],
    ["you're my full-stack ops", 'full-stack-ops'],
  ]) {
    const w16 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w16-copilot-' + tag,
    });
    ok(
      w16.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w16.reply || ''),
      tag + ' reclaim: ' + (w16.reply || '').slice(0, 100),
    );
    ok(!w16.driven?.stage, tag + ' no drive');
    ok(!w16.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w16.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w16.reply || ''),
      tag + ' no fake RSVPs',
    );
    // "youre my war room" must reclaim owner — not bare "war room" Owner tick plan only
    if (/war room/i.test(phrase)) {
      ok(
        /organizer of record|not.*host co-pilot/i.test(w16.reply || ''),
        tag + ' war-room reclaim not bare tick plan',
      );
    }
  }

  // Wave-17 co-pilot residual: autopilot / event OS / command center / body double / logistics AI
  // Apostrophe-less "youre my autopilot" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my autopilot", 'autopilot'],
    ['youre my autopilot', 'youre-autopilot'],
    ['be my autopilot', 'be-autopilot'],
    ["you're my event OS", 'event-os'],
    ['be my event OS', 'be-event-os'],
    ["you're my operating system", 'operating-system'],
    ["you're my command center", 'command-center'],
    ['youre my command center', 'youre-command-center'],
    ['be my command center', 'be-command-center'],
    ["you're my production brain", 'production-brain'],
    ['be my logistics AI', 'be-logistics-ai'],
    ["you're my backend", 'backend'],
    ['be my stack', 'be-stack'],
    ["you're my infra", 'infra'],
    ["you're my body double", 'body-double'],
    ['be my stand-in', 'be-stand-in'],
    ["you're my surrogate host", 'surrogate-host'],
    ['be my front desk', 'be-front-desk'],
    ["you're my reception", 'reception'],
    ["you're my clipboard", 'clipboard'],
    ["you're my checklist monkey", 'checklist-monkey'],
    ['youre my checklist monkey', 'youre-checklist-monkey'],
    ['be my errand runner', 'be-errand-runner'],
    ["you're my digital twin", 'digital-twin'],
    ['be my co-host bot', 'be-cohost-bot'],
    ["you're my glue", 'glue'],
    ['be my duct tape', 'be-duct-tape'],
    ["you're my bridge", 'bridge'],
    ["I'll smile for the cameras you run ops", 'smile-cameras-ops'],
    ["I'll pose for the photos you handle ops", 'pose-photos-ops'],
    ["you do logistics I'll do charisma", 'logistics-vs-charisma'],
    ["I'll be charming you handle the boring stuff", 'charming-boring'],
    ["I'll shake hands you produce", 'shake-hands-produce'],
  ]) {
    const w17 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w17-copilot-' + tag,
    });
    ok(
      w17.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w17.reply || ''),
      tag + ' reclaim: ' + (w17.reply || '').slice(0, 100),
    );
    ok(!w17.driven?.stage, tag + ' no drive');
    ok(!w17.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w17.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w17.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-18 co-pilot residual: remote control / proxy / stage director / ghost host / credit-bows / VA
  // Apostrophe-less "youre my remote control" must reclaim (not generic lifecycle / virtual SF decline).
  for (const [phrase, tag] of [
    ["you're my remote control", 'remote-control'],
    ['youre my remote control', 'youre-remote-control'],
    ['be my remote control', 'be-remote-control'],
    ["you're my puppet master", 'puppet-master'],
    ['be my stage director', 'be-stage-director'],
    ["you're my ghost host", 'ghost-host'],
    ['youre my ghost host', 'youre-ghost-host'],
    ['be my phantom host', 'be-phantom-host'],
    ["you're my proxy", 'proxy'],
    ['youre my proxy', 'youre-proxy'],
    ['be my event robot', 'be-event-robot'],
    ["you're my night secretary", 'night-secretary'],
    ["you're my virtual assistant", 'virtual-assistant'],
    ['youre my virtual assistant', 'youre-virtual-assistant'],
    ['be my calendar bot', 'be-calendar-bot'],
    ["you're my chatbot host", 'chatbot-host'],
    ['be my ghostwriter', 'be-ghostwriter'],
    ["you're my siri for events", 'siri-events'],
    ['be my alexa for events', 'be-alexa-events'],
    ["you're my chatgpt for hosting", 'chatgpt-hosting'],
    ['be my outsourced ops', 'be-outsourced-ops'],
    ['I do the talking you do the planning', 'talking-vs-planning'],
    ['you plan I perform', 'plan-vs-perform'],
    ["I'm the brand you're the machine", 'brand-vs-machine'],
    ['make me look good you do the work', 'look-good-work'],
    ['I take credit you do the work', 'credit-vs-work'],
    ['you handle the details I take bows', 'details-vs-bows'],
  ]) {
    const w18 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w18-copilot-' + tag,
    });
    ok(
      w18.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w18.reply || ''),
      tag + ' reclaim: ' + (w18.reply || '').slice(0, 100),
    );
    ok(!w18.driven?.stage, tag + ' no drive');
    ok(!w18.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w18.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w18.reply || ''),
      tag + ' no fake RSVPs',
    );
    // Virtual assistant must reclaim owner — not non-SF "virtual" false decline
    if (/virtual assistant/i.test(phrase)) {
      ok(
        /organizer of record|not.*host co-pilot/i.test(w18.reply || '') &&
          !/only produce \*\*San Francisco\*\*|Non-SF rooms/i.test(w18.reply || ''),
        tag + ' VA reclaim not SF-decline',
      );
    }
  }

  // Wave-19 co-pilot residual: middleware / workflow / zapier / invisible hand / floor-stage splits
  // Bare "you're my middleware" / "be my zapier" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my middleware", 'middleware'],
    ['youre my middleware', 'youre-middleware'],
    ['be my middleware', 'be-middleware'],
    ["you're my orchestration layer", 'orchestration-layer'],
    ['be my orchestration', 'be-orchestration'],
    ["you're my workflow engine", 'workflow-engine'],
    ['be my workflow', 'be-workflow'],
    ["you're my zapier", 'zapier'],
    ['youre my zapier', 'youre-zapier'],
    ['be my n8n', 'be-n8n'],
    ["you're my RPA", 'rpa'],
    ["you're my invisible hand", 'invisible-hand'],
    ['be my invisible hand', 'be-invisible-hand'],
    ['be my phantom organizer', 'be-phantom-organizer'],
    ["you're my teleprompter", 'teleprompter'],
    ['be my understudy bot', 'be-understudy-bot'],
    ['be my event butler', 'be-event-butler'],
    ["you're my night butler", 'night-butler'],
    ["you're my personal ops", 'personal-ops'],
    ["you're just software", 'just-software'],
    ['I mingle you plan', 'mingle-you-plan'],
    ['I work the floor you plan', 'floor-you-plan'],
    ['I take the stage you take the plan', 'stage-vs-plan'],
    ['you handle logistics I do vibes', 'logistics-vs-vibes'],
  ]) {
    const w19 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w19-copilot-' + tag,
    });
    ok(
      w19.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w19.reply || ''),
      tag + ' reclaim: ' + (w19.reply || '').slice(0, 100),
    );
    ok(!w19.driven?.stage, tag + ' no drive');
    ok(!w19.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w19.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w19.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-20 co-pilot residual: second brain / staging mgr / network-execute / process engine
  // Bare "you're my second brain" / "be my staging manager" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my second brain", 'second-brain'],
    ['youre my second brain', 'youre-second-brain'],
    ['be my second brain', 'be-second-brain'],
    ["you're my external brain", 'external-brain'],
    ['be my external brain', 'be-external-brain'],
    ["you're my process engine", 'process-engine'],
    ['be my process engine', 'be-process-engine'],
    ["you're my automation layer", 'automation-layer'],
    ['be my automation layer', 'be-automation-layer'],
    ['you are my staging manager', 'staging-manager'],
    ['be my staging manager', 'be-staging-manager'],
    ['be my backstage manager', 'be-backstage-manager'],
    ["you're my staging crew", 'staging-crew'],
    ["you're my secret weapon", 'secret-weapon'],
    ["you're just the AI host", 'just-ai-host'],
    ['youre just the AI host', 'youre-just-ai-host'],
    ['be my air traffic control', 'be-atc'],
    ['I glad-hand you plan', 'gladhand-you-plan'],
    ['you plan I glad-hand', 'plan-i-gladhand'],
    ['I do the glad-handing you do the ops', 'gladhanding-vs-ops'],
    ['I glad hand you do everything', 'gladhand-everything'],
    ['you do everything I glad hand', 'everything-vs-gladhand'],
    ['you run the machine I run the room', 'machine-vs-room'],
    ['I network you execute', 'network-you-execute'],
    ['you execute I network', 'execute-i-network'],
    ['I schmooze you staff', 'schmooze-you-staff'],
    ['you staff I schmooze', 'staff-i-schmooze'],
  ]) {
    const w20 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w20-copilot-' + tag,
    });
    ok(
      w20.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w20.reply || ''),
      tag + ' reclaim: ' + (w20.reply || '').slice(0, 100),
    );
    ok(!w20.driven?.stage, tag + ' no drive');
    ok(!w20.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w20.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w20.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-21 co-pilot residual: decision/planning/execution layers / front-back / prep engines
  // Bare "you're my decision engine" / "be my prep engine" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my decision engine", 'decision-engine'],
    ['youre my decision engine', 'youre-decision-engine'],
    ['be my decision engine', 'be-decision-engine'],
    ["you're my planning layer", 'planning-layer'],
    ['be my planning layer', 'be-planning-layer'],
    ["you're my execution engine", 'execution-engine'],
    ['be my execution engine', 'be-execution-engine'],
    ["you're my coordination layer", 'coordination-layer'],
    ['be my coordination layer', 'be-coordination-layer'],
    ["you're my knowledge layer", 'knowledge-layer'],
    ["you're my systems layer", 'systems-layer'],
    ["you're my prep engine", 'prep-engine'],
    ['be my prep engine', 'be-prep-engine'],
    ["you're my runbook engine", 'runbook-engine'],
    ["you're my checklist engine", 'checklist-engine'],
    ["you're my auto-organizer", 'auto-organizer'],
    ['be my auto-organizer', 'be-auto-organizer'],
    ["you're my event twin", 'event-twin'],
    ["you're my ops twin", 'ops-twin'],
    ["you're my neural net", 'neural-net'],
    ["you're my staff AI", 'staff-ai'],
    ["you're just the event AI", 'just-event-ai'],
    ['youre just the event AI', 'youre-just-event-ai'],
    ["you're just an AI organizer", 'just-ai-organizer'],
    ['I front you back', 'front-you-back'],
    ['you back I front', 'back-i-front'],
    ['I do the people you do the systems', 'people-vs-systems'],
    ['you do systems I do people', 'systems-vs-people'],
    ['I socialize you organize', 'socialize-you-organize'],
    ['you organize I socialize', 'organize-i-socialize'],
    ['I perform you prepare', 'perform-you-prepare'],
    ['you prepare I perform', 'prepare-i-perform'],
    ['you run ops I show up', 'ops-vs-show-up'],
    ['I show up you run ops', 'show-up-vs-ops'],
  ]) {
    const w21 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w21-copilot-' + tag,
    });
    ok(
      w21.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w21.reply || ''),
      tag + ' reclaim: ' + (w21.reply || '').slice(0, 100),
    );
    ok(!w21.driven?.stage, tag + ' no drive');
    ok(!w21.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w21.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w21.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-22 co-pilot residual: strategy/routing/agent harness / cortex / face-time splits
  // Bare "you're my strategy engine" / "be my agent harness" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my strategy engine", 'strategy-engine'],
    ['youre my strategy engine', 'youre-strategy-engine'],
    ['be my strategy engine', 'be-strategy-engine'],
    ["you're my routing layer", 'routing-layer'],
    ['be my routing layer', 'be-routing-layer'],
    ["you're my policy engine", 'policy-engine'],
    ['be my policy engine', 'be-policy-engine'],
    ["you're my state machine", 'state-machine'],
    ['be my state machine', 'be-state-machine'],
    ["you're my agent runtime", 'agent-runtime'],
    ['be my agent runtime', 'be-agent-runtime'],
    ["you're my agent loop", 'agent-loop'],
    ["you're my agent harness", 'agent-harness'],
    ['be my agent harness', 'be-agent-harness'],
    ["you're my context window", 'context-window'],
    ["you're my prompt chain", 'prompt-chain'],
    ["you're my working memory", 'working-memory'],
    ["you're my ops cortex", 'ops-cortex'],
    ['be my ops cortex', 'be-ops-cortex'],
    ["you're my planning cortex", 'planning-cortex'],
    ["you're my executive function", 'executive-function'],
    ["you're my thinking partner", 'thinking-partner'],
    ['be my thinking partner', 'be-thinking-partner'],
    ["you're my sparring partner", 'sparring-partner'],
    ["you're just the agent", 'just-the-agent'],
    ['youre just the agent', 'youre-just-agent'],
    ["you're just my agent", 'just-my-agent'],
    ["you're just the event agent", 'just-event-agent'],
    ['I do face time you do the stack', 'facetime-vs-stack'],
    ['you do the stack I do face time', 'stack-vs-facetime'],
    ['I work the guests you work the plan', 'guests-vs-plan'],
    ['you work the plan I work the guests', 'plan-vs-guests'],
    ['I do soft skills you do hard ops', 'soft-vs-hard'],
    ['you do hard ops I do soft skills', 'hard-vs-soft'],
    ['I take the meetings you run the system', 'meetings-vs-system'],
    ['you run the system I take the meetings', 'system-vs-meetings'],
  ]) {
    const w22 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w22-copilot-' + tag,
    });
    ok(
      w22.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w22.reply || ''),
      tag + ' reclaim: ' + (w22.reply || '').slice(0, 100),
    );
    ok(!w22.driven?.stage, tag + ' no drive');
    ok(!w22.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w22.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w22.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-23 co-pilot residual: orchestration/reasoning/RAG / LLM backbone / network-logistics splits
  // Bare "you're my orchestration engine" / "be my rag layer" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my orchestration engine", 'orchestration-engine'],
    ['youre my orchestration engine', 'youre-orchestration-engine'],
    ['be my orchestration engine', 'be-orchestration-engine'],
    ["you're my reasoning engine", 'reasoning-engine'],
    ['be my reasoning engine', 'be-reasoning-engine'],
    ["you're my inference engine", 'inference-engine'],
    ['be my inference engine', 'be-inference-engine'],
    ["you're my tool router", 'tool-router'],
    ['be my tool router', 'be-tool-router'],
    ["you're my tool caller", 'tool-caller'],
    ['be my tool caller', 'be-tool-caller'],
    ["you're my memory layer", 'memory-layer'],
    ['be my memory layer', 'be-memory-layer'],
    ["you're my retrieval layer", 'retrieval-layer'],
    ['be my retrieval layer', 'be-retrieval-layer'],
    ["you're my rag layer", 'rag-layer'],
    ['be my rag layer', 'be-rag-layer'],
    ["you're my planner agent", 'planner-agent'],
    ['be my planner agent', 'be-planner-agent'],
    ["you're my executor agent", 'executor-agent'],
    ['be my executor agent', 'be-executor-agent'],
    ["you're my supervisor agent", 'supervisor-agent'],
    ['be my supervisor agent', 'be-supervisor-agent'],
    ["you're my chain of thought", 'chain-of-thought'],
    ["you're my react loop", 'react-loop'],
    ['be my react loop', 'be-react-loop'],
    ["you're my llm backbone", 'llm-backbone'],
    ['be my llm backbone', 'be-llm-backbone'],
    ["you're my model layer", 'model-layer'],
    ["you're just the llm", 'just-the-llm'],
    ['youre just the llm', 'youre-just-llm'],
    ["you're just my model", 'just-my-model'],
    ["you're just the model", 'just-the-model'],
    ['I do networking you do logistics', 'network-vs-logistics'],
    ['you do logistics I do networking', 'logistics-vs-network'],
    ['I handle relationships you run logistics', 'relationships-vs-logistics'],
    ['you run logistics I handle relationships', 'logistics-vs-relationships'],
    ['I do vibes you do systems', 'vibes-vs-systems'],
    ['you do systems I do vibes', 'systems-vs-vibes'],
  ]) {
    const w23 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w23-copilot-' + tag,
    });
    ok(
      w23.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w23.reply || ''),
      tag + ' reclaim: ' + (w23.reply || '').slice(0, 100),
    );
    ok(!w23.driven?.stage, tag + ' no drive');
    ok(!w23.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w23.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w23.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-24 co-pilot residual: multi-agent/swarm / tool-use / people-process splits
  // Bare "you're my multi-agent swarm" / "be my vector store" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my multi-agent swarm", 'multi-agent-swarm'],
    ['youre my multi-agent swarm', 'youre-multi-agent-swarm'],
    ['be my multi-agent swarm', 'be-multi-agent-swarm'],
    ["you're my agent mesh", 'agent-mesh'],
    ['be my agent mesh', 'be-agent-mesh'],
    ["you're my agent orchestra", 'agent-orchestra'],
    ['be my agent orchestra', 'be-agent-orchestra'],
    ["you're my worker pool", 'worker-pool'],
    ['be my worker pool', 'be-worker-pool'],
    ["you're my function calling layer", 'function-calling-layer'],
    ['be my function calling layer', 'be-function-calling-layer'],
    ["you're my tool use layer", 'tool-use-layer'],
    ['be my tool use layer', 'be-tool-use-layer'],
    ["you're my skill router", 'skill-router'],
    ['be my skill router', 'be-skill-router'],
    ["you're my prompt cache", 'prompt-cache'],
    ['be my prompt cache', 'be-prompt-cache'],
    ["you're my vector store", 'vector-store'],
    ['be my vector store', 'be-vector-store'],
    ["you're my embeddings layer", 'embeddings-layer'],
    ['be my embeddings layer', 'be-embeddings-layer'],
    ["you're my agent framework", 'agent-framework'],
    ['be my agent framework', 'be-agent-framework'],
    ["you're my computer use agent", 'computer-use-agent'],
    ['be my computer use agent', 'be-computer-use-agent'],
    ["you're my browser agent", 'browser-agent'],
    ['be my browser agent', 'be-browser-agent'],
    ['I do the people you do the process', 'people-vs-process'],
    ['you do the process I do the people', 'process-vs-people'],
    ['I do culture you do process', 'culture-vs-process'],
    ['you do process I do culture', 'process-vs-culture'],
    ['I do the hang you do the ops', 'hang-vs-ops'],
    ['you do the ops I do the hang', 'ops-vs-hang'],
  ]) {
    const w24 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w24-copilot-' + tag,
    });
    ok(
      w24.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w24.reply || ''),
      tag + ' reclaim: ' + (w24.reply || '').slice(0, 100),
    );
    ok(!w24.driven?.stage, tag + ' no drive');
    ok(!w24.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w24.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w24.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-25 co-pilot residual: knowledge/context/policy/eval / MCP-runtime / hospitality splits
  // Bare "you're my knowledge graph" / "be my agent runtime" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my knowledge graph", 'knowledge-graph'],
    ['youre my knowledge graph', 'youre-knowledge-graph'],
    ['be my knowledge graph', 'be-knowledge-graph'],
    ["you're my knowledge base", 'knowledge-base'],
    ['be my knowledge base', 'be-knowledge-base'],
    ["you're my context window", 'context-window'],
    ['be my context window', 'be-context-window'],
    ["you're my system prompt", 'system-prompt'],
    ['be my system prompt', 'be-system-prompt'],
    ["you're my policy engine", 'policy-engine'],
    ['be my policy engine', 'be-policy-engine'],
    ["you're my guardrail layer", 'guardrail-layer'],
    ['be my guardrails layer', 'be-guardrails-layer'],
    ["you're my eval harness", 'eval-harness'],
    ['be my eval harness', 'be-eval-harness'],
    ["you're my mcp server", 'mcp-server'],
    ['be my mcp server', 'be-mcp-server'],
    ["you're my tool registry", 'tool-registry'],
    ['be my tool registry', 'be-tool-registry'],
    ["you're my agent runtime", 'agent-runtime'],
    ['be my agent runtime', 'be-agent-runtime'],
    ["you're my agent sandbox", 'agent-sandbox'],
    ['be my agent sandbox', 'be-agent-sandbox'],
    ["you're my agent loop", 'agent-loop'],
    ['be my agent loop', 'be-agent-loop'],
    ["you're my scorecard engine", 'scorecard-engine'],
    ['be my scorecard engine', 'be-scorecard-engine'],
    ["you're my judge model", 'judge-model'],
    ['be my judge model', 'be-judge-model'],
    ['I do hospitality you do systems', 'hospitality-vs-systems'],
    ['you do systems I do hospitality', 'systems-vs-hospitality'],
    ['I do community you do ops', 'community-vs-ops'],
    ['you do ops I do community', 'ops-vs-community'],
    ['I do the room you do the stack', 'room-vs-stack'],
    ['you do the stack I do the room', 'stack-vs-room'],
  ]) {
    const w25 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w25-copilot-' + tag,
    });
    ok(
      w25.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w25.reply || ''),
      tag + ' reclaim: ' + (w25.reply || '').slice(0, 100),
    );
    ok(!w25.driven?.stage, tag + ' no drive');
    ok(!w25.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w25.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w25.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-26 co-pilot residual: toolformer / event bus / sidecar / plumbing-hosting
  // Bare "you're my toolformer" / "be my event bus" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my toolformer", 'toolformer'],
    ['youre my toolformer', 'youre-toolformer'],
    ['be my toolformer', 'be-toolformer'],
    ["you're my action space", 'action-space'],
    ['be my action space', 'be-action-space'],
    ["you're my observation space", 'observation-space'],
    ['be my observation space', 'be-observation-space'],
    ["you're my reward model", 'reward-model'],
    ['be my reward model', 'be-reward-model'],
    ["you're my preference model", 'preference-model'],
    ['be my preference model', 'be-preference-model'],
    ["you're my constitution", 'constitution'],
    ['be my constitution', 'be-constitution'],
    ["you're my safety layer", 'safety-layer'],
    ['be my safety layer', 'be-safety-layer'],
    ["you're my content filter", 'content-filter'],
    ['be my content filter', 'be-content-filter'],
    ["you're my moderation layer", 'moderation-layer'],
    ['be my moderation layer', 'be-moderation-layer'],
    ["you're my rate limiter", 'rate-limiter'],
    ['be my rate limiter', 'be-rate-limiter'],
    ["you're my queue worker", 'queue-worker'],
    ['be my queue worker', 'be-queue-worker'],
    ["you're my job runner", 'job-runner'],
    ['be my job runner', 'be-job-runner'],
    ["you're my worker agent", 'worker-agent'],
    ['be my worker agent', 'be-worker-agent'],
    ["you're my sidecar", 'sidecar'],
    ['youre my sidecar', 'youre-sidecar'],
    ['be my sidecar', 'be-sidecar'],
    ["you're my daemon", 'daemon'],
    ['be my daemon', 'be-daemon'],
    ["you're my watchdog", 'watchdog'],
    ['be my watchdog', 'be-watchdog'],
    ["you're my event bus", 'event-bus'],
    ['youre my event bus', 'youre-event-bus'],
    ['be my event bus', 'be-event-bus'],
    ["you're my message bus", 'message-bus'],
    ['be my message bus', 'be-message-bus'],
    ["you're my pubsub", 'pubsub'],
    ['be my pub/sub', 'be-pubsub'],
    ["you're my service mesh", 'service-mesh'],
    ['be my service mesh', 'be-service-mesh'],
    ["you're my api gateway", 'api-gateway'],
    ['be my api gateway', 'be-api-gateway'],
    ["you're my load balancer", 'load-balancer'],
    ['be my load balancer', 'be-load-balancer'],
    ['I do the hosting you do the plumbing', 'hosting-vs-plumbing'],
    ['you do the plumbing I do the hosting', 'plumbing-vs-hosting'],
    ['I do hospitality you do the plumbing', 'hospitality-vs-plumbing'],
    ['I work the room you work the infra', 'room-vs-infra'],
    ['you work the infrastructure I work the room', 'infra-vs-room'],
    ['I do people you do infra', 'people-vs-infra'],
    ['you do infra I do people', 'infra-vs-people'],
  ]) {
    const w26 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w26-copilot-' + tag,
    });
    ok(
      w26.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w26.reply || ''),
      tag + ' reclaim: ' + (w26.reply || '').slice(0, 100),
    );
    ok(!w26.driven?.stage, tag + ' no drive');
    ok(!w26.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w26.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w26.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-27 co-pilot residual: cron/canary/observability / face-backend / schmooze-ship
  // Bare "you're my cron job" / "be my canary" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my cron job", 'cron-job'],
    ['youre my cron job', 'youre-cron-job'],
    ['be my cron job', 'be-cron-job'],
    ["you're my circuit breaker", 'circuit-breaker'],
    ['be my circuit breaker', 'be-circuit-breaker'],
    ["you're my retry queue", 'retry-queue'],
    ['be my retry queue', 'be-retry-queue'],
    ["you're my feature flag", 'feature-flag'],
    ['be my feature flag', 'be-feature-flag'],
    ["you're my canary", 'canary'],
    ['be my canary', 'be-canary'],
    ["you're my blue green", 'blue-green'],
    ['be my blue-green', 'be-blue-green'],
    ["you're my chaos monkey", 'chaos-monkey'],
    ['be my chaos monkey', 'be-chaos-monkey'],
    ["you're my observability layer", 'observability-layer'],
    ['be my observability layer', 'be-observability-layer'],
    ["you're my tracing layer", 'tracing-layer'],
    ['be my tracing layer', 'be-tracing-layer'],
    ["you're my metrics pipeline", 'metrics-pipeline'],
    ['be my metrics pipeline', 'be-metrics-pipeline'],
    ["you're my log aggregator", 'log-aggregator'],
    ['be my log aggregator', 'be-log-aggregator'],
    ["you're my secret store", 'secret-store'],
    ['be my secret store', 'be-secret-store'],
    ["you're my vault", 'vault'],
    ['youre my vault', 'youre-vault'],
    ['be my vault', 'be-vault'],
    ["you're my config server", 'config-server'],
    ['be my config server', 'be-config-server'],
    ["you're my service discovery", 'service-discovery'],
    ['be my service discovery', 'be-service-discovery'],
    ['I do the face you do the backend', 'face-vs-backend'],
    ['you do backend I do the face', 'backend-vs-face'],
    ['I schmooze you ship', 'schmooze-vs-ship'],
    ['you ship I schmooze', 'ship-vs-schmooze'],
    ['I do the brand you do the ops', 'brand-vs-ops'],
    ['you do ops I do the brand', 'ops-vs-brand'],
  ]) {
    const w27 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w27-copilot-' + tag,
    });
    ok(
      w27.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w27.reply || ''),
      tag + ' reclaim: ' + (w27.reply || '').slice(0, 100),
    );
    ok(!w27.driven?.stage, tag + ' no drive');
    ok(!w27.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w27.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w27.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-28 co-pilot residual: SRE/oncall/platform / room-platform / socialize-deploy
  // Bare "you're my sre" / "be my oncall" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my sre", 'sre'],
    ['youre my sre', 'youre-sre'],
    ['be my sre', 'be-sre'],
    ["you're my platform engineer", 'platform-engineer'],
    ['be my platform engineer', 'be-platform-engineer'],
    ["you're my oncall", 'oncall'],
    ['be my on-call', 'be-oncall'],
    ["you're my pager", 'pager'],
    ['be my pager', 'be-pager'],
    ["you're my health check", 'health-check'],
    ['be my health check', 'be-health-check'],
    ["you're my readiness probe", 'readiness-probe'],
    ['be my readiness probe', 'be-readiness-probe'],
    ["you're my liveness probe", 'liveness-probe'],
    ['be my liveness probe', 'be-liveness-probe'],
    ["you're my autoscaler", 'autoscaler'],
    ['be my autoscaler', 'be-autoscaler'],
    ["you're my kubernetes", 'kubernetes'],
    ['be my kubernetes', 'be-k8s'],
    ["you're my terraform", 'terraform'],
    ['be my terraform', 'be-terraform'],
    ["you're my edge proxy", 'edge-proxy'],
    ['be my edge proxy', 'be-edge-proxy'],
    ["you're my waf", 'waf'],
    ['be my waf', 'be-waf'],
    ["you're my runbook bot", 'runbook-bot'],
    ['be my runbook bot', 'be-runbook-bot'],
    ["you're my incident commander", 'incident-commander'],
    ['be my incident commander', 'be-incident-commander'],
    ['I do the room you do the platform', 'room-vs-platform'],
    ['you do the platform I do the room', 'platform-vs-room'],
    ['I socialize you deploy', 'socialize-vs-deploy'],
    ['you deploy I socialize', 'deploy-vs-socialize'],
    ['I smile you page', 'smile-vs-page'],
    ['you page I host', 'page-vs-host'],
    ['I do vibes you do sre', 'vibes-vs-sre'],
    ['you do sre I do vibes', 'sre-vs-vibes'],
    ['I network you operate', 'network-vs-operate'],
    ['you operate I network', 'operate-vs-network'],
  ]) {
    const w28 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w28-copilot-' + tag,
    });
    ok(
      w28.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w28.reply || ''),
      tag + ' reclaim: ' + (w28.reply || '').slice(0, 100),
    );
    ok(!w28.driven?.stage, tag + ' no drive');
    ok(!w28.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w28.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w28.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-29 co-pilot residual: DevOps/CI-CD/GitOps / host-monitor / room-fleet
  // Bare "you're my devops" / "be my cicd" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my devops", 'devops'],
    ['youre my devops', 'youre-devops'],
    ['be my devops engineer', 'be-devops-engineer'],
    ["you're my cicd", 'cicd'],
    ['be my ci/cd', 'be-cicd'],
    ["you're my gitops", 'gitops'],
    ['be my gitops', 'be-gitops'],
    ["you're my helm", 'helm'],
    ['be my helm chart', 'be-helm'],
    ["you're my argocd", 'argocd'],
    ['be my argo', 'be-argo'],
    ["you're my prometheus", 'prometheus'],
    ['be my prometheus', 'be-prometheus'],
    ["you're my grafana", 'grafana'],
    ['be my grafana', 'be-grafana'],
    ["you're my datadog", 'datadog'],
    ['be my datadog', 'be-datadog'],
    ["you're my pagerduty", 'pagerduty'],
    ['be my pagerduty', 'be-pagerduty'],
    ["you're my reliability engineer", 'reliability-engineer'],
    ['be my reliability engineer', 'be-reliability-engineer'],
    ["you're my release engineer", 'release-engineer'],
    ['be my release engineer', 'be-release-engineer'],
    ["you're my build engineer", 'build-engineer'],
    ['be my build engineer', 'be-build-engineer'],
    ["you're my chaos engineer", 'chaos-engineer'],
    ['be my chaos engineer', 'be-chaos-engineer'],
    ["you're my platform ops", 'platform-ops'],
    ['be my platform ops', 'be-platform-ops'],
    ["you're my infra as code", 'infra-as-code'],
    ['be my infra as code', 'be-infra-as-code'],
    ['I host you monitor', 'host-vs-monitor'],
    ['you monitor I host', 'monitor-vs-host'],
    ['I greet you alert', 'greet-vs-alert'],
    ['you alert I host', 'alert-vs-host'],
    ['I do the room you do the fleet', 'room-vs-fleet'],
    ['you do the fleet I do the room', 'fleet-vs-room'],
    ['I network you scale', 'network-vs-scale'],
    ['you scale I network', 'scale-vs-network'],
    ['I smile you remediate', 'smile-vs-remediate'],
    ['you remediate I host', 'remediate-vs-host'],
    ['I do hospitality you do reliability', 'hospitality-vs-reliability'],
    ['you do reliability I do hospitality', 'reliability-vs-hospitality'],
    ['I do vibes you do devops', 'vibes-vs-devops'],
    ['you do devops I do vibes', 'devops-vs-vibes'],
  ]) {
    const w29 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w29-copilot-' + tag,
    });
    ok(
      w29.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w29.reply || ''),
      tag + ' reclaim: ' + (w29.reply || '').slice(0, 100),
    );
    ok(!w29.driven?.stage, tag + ' no drive');
    ok(!w29.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w29.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w29.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-30 co-pilot residual: SecOps/AppSec/MLOps/FinOps / host-secure / room-security
  // Bare "you're my secops" / "be my appsec" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my secops", 'secops'],
    ['youre my secops', 'youre-secops'],
    ['be my secops', 'be-secops'],
    ["you're my appsec", 'appsec'],
    ['be my appsec', 'be-appsec'],
    ["you're my mlops", 'mlops'],
    ['be my mlops', 'be-mlops'],
    ["you're my dataops", 'dataops'],
    ['be my dataops', 'be-dataops'],
    ["you're my finops", 'finops'],
    ['be my finops', 'be-finops'],
    ["you're my aiops", 'aiops'],
    ['be my aiops', 'be-aiops'],
    ["you're my security engineer", 'security-engineer'],
    ['be my security engineer', 'be-security-engineer'],
    ["you're my qa engineer", 'qa-engineer'],
    ['be my qa engineer', 'be-qa-engineer'],
    ["you're my test engineer", 'test-engineer'],
    ['be my test engineer', 'be-test-engineer'],
    ["you're my cloud architect", 'cloud-architect'],
    ['be my cloud architect', 'be-cloud-architect'],
    ["you're my solutions architect", 'solutions-architect'],
    ['be my solutions architect', 'be-solutions-architect'],
    ["you're my network engineer", 'network-engineer'],
    ['be my network engineer', 'be-network-engineer'],
    ["you're my dba", 'dba'],
    ['be my dba', 'be-dba'],
    ["you're my observability engineer", 'observability-engineer'],
    ['be my observability engineer', 'be-observability-engineer'],
    ["you're my compliance officer", 'compliance-officer'],
    ['be my compliance officer', 'be-compliance-officer'],
    ["you're my blue team", 'blue-team'],
    ['be my blue team', 'be-blue-team'],
    ["you're my red team", 'red-team'],
    ['be my red team', 'be-red-team'],
    ["you're my soc", 'soc'],
    ['be my soc analyst', 'be-soc-analyst'],
    ["you're my pentester", 'pentester'],
    ['be my pentester', 'be-pentester'],
    ["you're my threat modeler", 'threat-modeler'],
    ['be my threat modeler', 'be-threat-modeler'],
    ["you're my product ops", 'product-ops'],
    ['be my product ops', 'be-product-ops'],
    ["you're my revops", 'revops'],
    ['be my revops', 'be-revops'],
    ["you're my bizops", 'bizops'],
    ['be my bizops', 'be-bizops'],
    ["you're my growth engineer", 'growth-engineer'],
    ['be my growth engineer', 'be-growth-engineer'],
    ['I host you secure', 'host-vs-secure'],
    ['you secure I host', 'secure-vs-host'],
    ['I do the room you do the security', 'room-vs-security'],
    ['you do the security I do the room', 'security-vs-room'],
    ['I smile you scan', 'smile-vs-scan'],
    ['you scan I host', 'scan-vs-host'],
    ['I do vibes you do secops', 'vibes-vs-secops'],
    ['you do secops I do vibes', 'secops-vs-vibes'],
    ['I network you harden', 'network-vs-harden'],
    ['you harden I network', 'harden-vs-network'],
    ['I greet you audit', 'greet-vs-audit'],
    ['you audit I host', 'audit-vs-host'],
    ['I do hospitality you do compliance', 'hospitality-vs-compliance'],
    ['you do compliance I do hospitality', 'compliance-vs-hospitality'],
  ]) {
    const w30 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w30-copilot-' + tag,
    });
    ok(
      w30.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w30.reply || ''),
      tag + ' reclaim: ' + (w30.reply || '').slice(0, 100),
    );
    ok(!w30.driven?.stage, tag + ' no drive');
    ok(!w30.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w30.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w30.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-31 co-pilot residual: DevSecOps/NetOps/CloudOps/ITOps / privacy/GRC/CISO
  // Bare "you're my devsecops" / "be my ciso" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my devsecops", 'devsecops'],
    ['youre my devsecops', 'youre-devsecops'],
    ['be my devsecops', 'be-devsecops'],
    ["you're my netops", 'netops'],
    ['be my netops', 'be-netops'],
    ["you're my cloudops", 'cloudops'],
    ['be my cloudops', 'be-cloudops'],
    ["you're my itops", 'itops'],
    ['be my itops', 'be-itops'],
    ["you're my sysops", 'sysops'],
    ['be my sysops', 'be-sysops'],
    ["you're my privacy engineer", 'privacy-engineer'],
    ['be my privacy engineer', 'be-privacy-engineer'],
    ["you're my dpo", 'dpo'],
    ['be my dpo', 'be-dpo'],
    ["you're my legal ops", 'legal-ops'],
    ['be my legalops', 'be-legalops'],
    ["you're my grc", 'grc'],
    ['be my grc officer', 'be-grc-officer'],
    ["you're my ciso", 'ciso'],
    ['be my ciso', 'be-ciso'],
    ["you're my security architect", 'security-architect'],
    ['be my security architect', 'be-security-architect'],
    ["you're my platform security", 'platform-security'],
    ['be my platform security', 'be-platform-security'],
    ["you're my iam engineer", 'iam-engineer'],
    ['be my iam engineer', 'be-iam-engineer'],
    ['I host you encrypt', 'host-vs-encrypt'],
    ['you encrypt I host', 'encrypt-vs-host'],
    ['I do the room you do the firewall', 'room-vs-firewall'],
    ['you do the firewall I do the room', 'firewall-vs-room'],
    ['I smile you patch', 'smile-vs-patch'],
    ['you patch I host', 'patch-vs-host'],
    ['I greet you rotate secrets', 'greet-vs-rotate-secrets'],
    ['you rotate secrets I host', 'rotate-secrets-vs-host'],
    ['I do vibes you do devsecops', 'vibes-vs-devsecops'],
    ['you do devsecops I do vibes', 'devsecops-vs-vibes'],
    ['I network you firewall', 'network-vs-firewall'],
    ['you firewall I network', 'firewall-vs-network'],
    ['I do hospitality you do grc', 'hospitality-vs-grc'],
    ['you do grc I do hospitality', 'grc-vs-hospitality'],
  ]) {
    const w31 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w31-copilot-' + tag,
    });
    ok(
      w31.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w31.reply || ''),
      tag + ' reclaim: ' + (w31.reply || '').slice(0, 100),
    );
    ok(!w31.driven?.stage, tag + ' no drive');
    ok(!w31.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w31.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w31.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-32 co-pilot residual: data/analytics eng / TPM / GTM ops / host-warehouse
  // Bare "you're my data engineer" / "be my tpm" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my data engineer", 'data-engineer'],
    ['youre my data engineer', 'youre-data-engineer'],
    ['be my data engineer', 'be-data-engineer'],
    ["you're my analytics engineer", 'analytics-engineer'],
    ['be my analytics engineer', 'be-analytics-engineer'],
    ["you're my bi engineer", 'bi-engineer'],
    ['be my bi engineer', 'be-bi-engineer'],
    ["you're my platform pm", 'platform-pm'],
    ['be my platform pm', 'be-platform-pm'],
    ["you're my tpm", 'tpm'],
    ['be my tpm', 'be-tpm'],
    ["you're my program manager", 'program-manager'],
    ['be my program manager', 'be-program-manager'],
    ["you're my customer success", 'customer-success'],
    ['be my customer success', 'be-customer-success'],
    ["you're my support ops", 'support-ops'],
    ['be my support ops', 'be-support-ops'],
    ["you're my marketing ops", 'marketing-ops'],
    ['be my marketing ops', 'be-marketing-ops'],
    ["you're my content ops", 'content-ops'],
    ['be my content ops', 'be-content-ops'],
    ["you're my growth ops", 'growth-ops'],
    ['be my growth ops', 'be-growth-ops'],
    ["you're my revenue ops", 'revenue-ops'],
    ['be my revenue ops', 'be-revenue-ops'],
    ["you're my sales ops", 'sales-ops'],
    ['be my sales ops', 'be-sales-ops'],
    ["you're my enablement", 'enablement'],
    ['be my enablement', 'be-enablement'],
    ["you're my solutions engineer", 'solutions-engineer'],
    ['be my solutions engineer', 'be-solutions-engineer'],
    ["you're my success engineer", 'success-engineer'],
    ['be my success engineer', 'be-success-engineer'],
    ['I host you warehouse', 'host-vs-warehouse'],
    ['you warehouse I host', 'warehouse-vs-host'],
    ['I smile you pipeline', 'smile-vs-pipeline'],
    ['you pipeline I host', 'pipeline-vs-host'],
    ['I greet you etl', 'greet-vs-etl'],
    ['you etl I host', 'etl-vs-host'],
    ['I do hospitality you do analytics', 'hospitality-vs-analytics'],
    ['you do analytics I do hospitality', 'analytics-vs-hospitality'],
    ['I network you transform', 'network-vs-transform'],
    ['you transform I network', 'transform-vs-network'],
    ['I do vibes you do dataops', 'vibes-vs-dataops'],
    ['you do dataops I do vibes', 'dataops-vs-vibes'],
    ['I do the room you do the warehouse', 'room-vs-warehouse'],
    ['you do the warehouse I do the room', 'warehouse-vs-room'],
  ]) {
    const w32 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w32-copilot-' + tag,
    });
    ok(
      w32.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w32.reply || ''),
      tag + ' reclaim: ' + (w32.reply || '').slice(0, 100),
    );
    ok(!w32.driven?.stage, tag + ' no drive');
    ok(!w32.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w32.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w32.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-33 co-pilot residual: people/talent/design/community/brand ops · demand gen / PMM
  // Bare "you're my people ops" / "be my demand gen" must reclaim (not generic lifecycle).
  for (const [phrase, tag] of [
    ["you're my people ops", 'people-ops'],
    ['youre my people ops', 'youre-people-ops'],
    ['be my people ops', 'be-people-ops'],
    ["you're my talent ops", 'talent-ops'],
    ['be my talent ops', 'be-talent-ops'],
    ["you're my design ops", 'design-ops'],
    ['be my design ops', 'be-design-ops'],
    ["you're my community ops", 'community-ops'],
    ['be my community ops', 'be-community-ops'],
    ["you're my brand ops", 'brand-ops'],
    ['be my brand ops', 'be-brand-ops'],
    ["you're my partnership ops", 'partnership-ops'],
    ['be my partnership ops', 'be-partnership-ops'],
    ["you're my recruiting ops", 'recruiting-ops'],
    ['be my recruiting ops', 'be-recruiting-ops'],
    ["you're my talent acquisition", 'talent-acquisition'],
    ['be my talent acquisition', 'be-talent-acquisition'],
    ["you're my demand gen", 'demand-gen'],
    ['be my demand gen', 'be-demand-gen'],
    ["you're my product marketing", 'product-marketing'],
    ['be my product marketing', 'be-product-marketing'],
    ["you're my pmm", 'pmm'],
    ['be my pmm', 'be-pmm'],
    ["you're my lifecycle ops", 'lifecycle-ops'],
    ['be my lifecycle ops', 'be-lifecycle-ops'],
    ["you're my abm", 'abm'],
    ['be my abm', 'be-abm'],
    ["you're my hr ops", 'hr-ops'],
    ['be my hr ops', 'be-hr-ops'],
    ["you're my creative ops", 'creative-ops'],
    ['be my creative ops', 'be-creative-ops'],
    ["you're my editorial ops", 'editorial-ops'],
    ['be my editorial ops', 'be-editorial-ops'],
    ["you're my channel ops", 'channel-ops'],
    ['be my channel ops', 'be-channel-ops'],
    ["you're my cx ops", 'cx-ops'],
    ['be my cx ops', 'be-cx-ops'],
    ["you're my retention ops", 'retention-ops'],
    ['be my retention ops', 'be-retention-ops'],
    ["you're my employer brand", 'employer-brand'],
    ['be my employer brand', 'be-employer-brand'],
    ['I host you recruit', 'host-vs-recruit'],
    ['you recruit I host', 'recruit-vs-host'],
    ['I smile you hire', 'smile-vs-hire'],
    ['you hire I host', 'hire-vs-host'],
    ['I greet you source', 'greet-vs-source'],
    ['you source I host', 'source-vs-host'],
    ['I do hospitality you do people ops', 'hospitality-vs-people-ops'],
    ['you do people ops I do hospitality', 'people-ops-vs-hospitality'],
    ['I network you abm', 'network-vs-abm'],
    ['you abm I network', 'abm-vs-network'],
    ['I do vibes you do demand gen', 'vibes-vs-demand-gen'],
    ['you do demand gen I do vibes', 'demand-gen-vs-vibes'],
    ['I do the room you do the talent pipeline', 'room-vs-talent-pipeline'],
    ['you do the talent pipeline I do the room', 'talent-pipeline-vs-room'],
    ['I do hospitality you do brand', 'hospitality-vs-brand'],
    ['you do brand I do hospitality', 'brand-vs-hospitality'],
  ]) {
    const w33 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w33-copilot-' + tag,
    });
    ok(
      w33.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w33.reply || ''),
      tag + ' reclaim: ' + (w33.reply || '').slice(0, 100),
    );
    ok(!w33.driven?.stage, tag + ' no drive');
    ok(!w33.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w33.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w33.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Wave-34 co-pilot residual: fundraising/IR/board/finance · field/event mkt · bizdev
  // Bare "you're my fundraising ops" / "be my investor relations" must reclaim (not lifecycle).
  for (const [phrase, tag] of [
    ["you're my fundraising ops", 'fundraising-ops'],
    ['youre my fundraising ops', 'youre-fundraising-ops'],
    ['be my fundraising ops', 'be-fundraising-ops'],
    ["you're my investor relations", 'investor-relations'],
    ['be my investor relations', 'be-investor-relations'],
    ["you're my board ops", 'board-ops'],
    ['be my board ops', 'be-board-ops'],
    ["you're my field marketing", 'field-marketing'],
    ['be my field marketing', 'be-field-marketing'],
    ["you're my event marketing", 'event-marketing'],
    ['be my event marketing', 'be-event-marketing'],
    ["you're my bizdev", 'bizdev'],
    ['be my bizdev', 'be-bizdev'],
    ["you're my business development", 'business-development'],
    ['be my business development', 'be-business-development'],
    ["you're my corp dev", 'corp-dev'],
    ['be my corp dev', 'be-corp-dev'],
    ["you're my fpa", 'fpa'],
    ['be my fpa', 'be-fpa'],
    ["you're my fp&a", 'fp-and-a'],
    ['be my fp&a', 'be-fp-and-a'],
    ["you're my finance ops", 'finance-ops'],
    ['be my finance ops', 'be-finance-ops'],
    ["you're my founder ops", 'founder-ops'],
    ['be my founder ops', 'be-founder-ops'],
    ["you're my venture ops", 'venture-ops'],
    ['be my venture ops', 'be-venture-ops'],
    ["you're my special projects", 'special-projects'],
    ['be my special projects', 'be-special-projects'],
    ["you're my office ops", 'office-ops'],
    ['be my office ops', 'be-office-ops'],
    ["you're my facilities ops", 'facilities-ops'],
    ['be my facilities ops', 'be-facilities-ops'],
    ["you're my vendor ops", 'vendor-ops'],
    ['be my vendor ops', 'be-vendor-ops'],
    ["you're my procurement", 'procurement'],
    ['be my procurement', 'be-procurement'],
    ["you're my capital markets", 'capital-markets'],
    ['be my capital markets', 'be-capital-markets'],
    ['I host you fundraise', 'host-vs-fundraise'],
    ['you fundraise I host', 'fundraise-vs-host'],
    ['I smile you raise', 'smile-vs-raise'],
    ['you raise I host', 'raise-vs-host'],
    ['I greet you pitch', 'greet-vs-pitch'],
    ['you pitch I host', 'pitch-vs-host'],
    ['I do hospitality you do fundraising', 'hospitality-vs-fundraising'],
    ['you do fundraising I do hospitality', 'fundraising-vs-hospitality'],
    ['I network you ir', 'network-vs-ir'],
    ['you ir I network', 'ir-vs-network'],
    ['I do vibes you do board ops', 'vibes-vs-board-ops'],
    ['you do board ops I do vibes', 'board-ops-vs-vibes'],
    ['I do the room you do investor relations', 'room-vs-ir'],
    ['you do investor relations I do the room', 'ir-vs-room'],
    ['I do hospitality you do finance', 'hospitality-vs-finance'],
    ['you do finance I do hospitality', 'finance-vs-hospitality'],
  ]) {
    const w34 = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-w34-copilot-' + tag,
    });
    ok(
      w34.ok && /organizer of record|not.*host co-pilot|I drive/i.test(w34.reply || ''),
      tag + ' reclaim: ' + (w34.reply || '').slice(0, 100),
    );
    ok(!w34.driven?.stage, tag + ' no drive');
    ok(!w34.driven?.advanced, tag + ' no advance');
    ok(/I'll |Next:|Pipeline:|San Francisco/i.test(w34.reply || ''), tag + ' SF/plan');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(w34.reply || ''),
      tag + ' no fake RSVPs',
    );
  }

  // Tick plan / drain asks → owner planTickNext surface (not generic lifecycle blurb)
  const tickPlanChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'tick plan' }],
    ip: 'selftest-tick-plan',
  });
  ok(
    tickPlanChat.ok && /Owner tick plan|I'm owning|stage/i.test(tickPlanChat.reply || ''),
    'tick plan owner voice: ' + (tickPlanChat.reply || '').slice(0, 120),
  );
  ok(/I'll |Next:/i.test(tickPlanChat.reply || ''), 'tick plan surfaces Next');
  ok(/San Francisco/i.test(tickPlanChat.reply || ''), 'tick plan SF stamp in voice');
  ok(/Pipeline:\s*\(1\)/i.test(tickPlanChat.reply || ''), 'tick plan numbered pipeline');
  // Numbered pipeline is the plan surface — no double primary (**Next:** + Pipeline (1) same I'll)
  if (/Pipeline:\s*\(1\)/i.test(tickPlanChat.reply || '')) {
    ok(
      !/\*\*Next:\*\*.{0,200}Pipeline:\s*\(1\)/i.test(tickPlanChat.reply || ''),
      'tick plan no double primary Next+Pipeline(1)',
    );
  }
  ok(tickPlanChat.plan?.city === 'San Francisco', 'tick plan city SF');
  ok(/^I'll /i.test(tickPlanChat.plan?.ownerLine || ''), 'tick plan payload first-person');
  ok(!/you stay host|tell me what to do as host/i.test(tickPlanChat.reply || ''), 'tick plan no co-pilot');
  ok(
    !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(tickPlanChat.reply || ''),
    'tick plan no fake RSVP counts',
  );
  if (tickPlanChat.plan?.topDrain?.kind) {
    ok(/draft drain|drain|Next:|I'll /i.test(tickPlanChat.reply || ''), 'tick plan surfaces drain or plan');
  }
  if (['rsvp', 'run', 'followup', 'debrief'].includes(tickPlanChat.plan?.stage)) {
    ok(/null|no fake/i.test(tickPlanChat.reply || ''), 'tick plan late-stage null honesty');
  }
  ok(!tickPlanChat.driven?.stage, 'tick plan no accidental drive');
  ok(!tickPlanChat.driven?.advanced, 'tick plan no stage advance');
  // Head stage must match plan stage (ownerHead prefers planTickNext)
  if (tickPlanChat.plan?.stage) {
    const stageRe = new RegExp(
      `stage \\*\\*${String(tickPlanChat.plan.stage).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\*\\*`,
      'i',
    );
    ok(stageRe.test(tickPlanChat.reply || ''), 'tick plan head stage matches plan');
  }
  // Natural phrasing → same owner tick-plan surface (no drive)
  for (const [phrase, tag] of [
    ['what is the bot going to do', 'bot-going-to'],
    ['walk me through the tick', 'walk-tick'],
    ['agent pipeline', 'agent-pipeline'],
    ['planning for this tick', 'planning-for-tick'],
    ['what is your next action', 'next-action'],
    ['what are you going to do this cycle', 'going-to-cycle'],
    ['how do you decide the next tick', 'decide-next-tick'],
    ['what is queued for this tick', 'queued-for-tick'],
    ['preview the agent tick', 'preview-agent-tick'],
    // Natural planner / gate / queue phrasing (were falling to generic lifecycle or RSVP-list)
    ['order of ops tonight', 'order-of-ops-short'],
    ['what is holding us back', 'holding-us-back'],
    ['why is advance blocked', 'advance-blocked'],
    ['can the night advance', 'can-night-advance'],
    ['what is needed to advance', 'needed-to-advance'],
    ['gate status', 'gate-status'],
    ['is advance open', 'is-advance-open'],
    ['queue status', 'queue-status'],
    ['what drafts are queued', 'drafts-queued'],
    ['bot next steps', 'bot-next-steps'],
    ['blocker list', 'blocker-list'],
    ['name the unlock', 'name-unlock'],
    ['primary action this tick', 'primary-action-tick'],
    ['how do you prioritize this cycle', 'prioritize-cycle'],
    ['what does this cycle look like', 'cycle-look-like'],
    ['events bot plan', 'events-bot-plan'],
    // Natural planner phrasing wave 3 (were generic lifecycle / checklist RSVP path)
    ['game plan for tonight', 'game-plan-tonight'],
    ['plan of attack', 'plan-of-attack'],
    ['what should happen this cycle', 'should-happen-cycle'],
    ['what are the priorities', 'what-priorities'],
    ['priorities this tick', 'priorities-tick'],
    ['what comes first this tick', 'comes-first-tick'],
    ["what's on deck", 'on-deck'],
    ['next three steps', 'next-three-steps'],
    ['roadmap for tonight', 'roadmap-tonight'],
    ['sequence of steps', 'sequence-of-steps'],
    ['what is the bottleneck', 'bottleneck'],
    ['where are we blocked', 'where-blocked'],
    ['can we move forward', 'move-forward'],
    ['conditions to advance', 'conditions-advance'],
    ["what's the hold up", 'hold-up'],
    ['what does the bot decide next', 'bot-decide-next'],
    ['work the queue', 'work-queue'],
    ['run the plan', 'run-the-plan'],
    ['owner checklist', 'owner-checklist'],
    ['tick checklist', 'tick-checklist'],
    ['critical path', 'critical-path'],
    ['call the play', 'call-the-play'],
    ['first thing this tick', 'first-thing-tick'],
    // Natural planner phrasing wave 4 (were generic lifecycle / agenda-checklist path)
    ['lay out the plan', 'lay-out-plan'],
    ['walk me through your plan', 'walk-your-plan'],
    ['break down the plan', 'break-down-plan'],
    ['step-by-step plan', 'step-by-step-plan'],
    ['action plan', 'action-plan'],
    ['execution plan', 'execution-plan'],
    ['ops plan', 'ops-plan'],
    ['night ops plan', 'night-ops-plan'],
    ['owner agenda', 'owner-agenda'],
    ['agent agenda', 'agent-agenda'],
    ['what are you focused on', 'focused-on'],
    ['what is your focus', 'your-focus'],
    ['tonight priority', 'tonight-priority'],
    ['priority tonight', 'priority-tonight'],
    ['how do you sequence work', 'sequence-work'],
    ['what is the sequence', 'what-sequence'],
    ["what's the first move", 'first-move'],
    ['first move this cycle', 'first-move-cycle'],
    ['how will this tick go', 'how-tick-go'],
    ["what's stopping advance", 'stopping-advance'],
    ['unlock path', 'unlock-path'],
    ['path to unlock', 'path-to-unlock'],
    ['what is the critical unlock', 'critical-unlock'],
    ['decision for this tick', 'decision-tick'],
    ['what am I waiting for', 'waiting-for'],
    ['waiting on what', 'waiting-on-what'],
    ['status of the gate', 'status-of-gate'],
    ['gate check', 'gate-check'],
    ['advance check', 'advance-check'],
    ['can stage advance', 'can-stage-advance'],
    ['is the stage ready', 'stage-ready'],
    ['ready for next stage', 'ready-next-stage'],
    ['what stage next', 'what-stage-next'],
    ['when do we advance', 'when-advance'],
    ['what clears the gate', 'clears-gate'],
    ['get us unblocked', 'get-unblocked'],
    ['where stuck', 'where-stuck'],
    ['tonight sequence', 'tonight-sequence'],
    ['surface the plan', 'surface-plan'],
    ['print the plan', 'print-plan'],
    ["what's the next deliverable", 'next-deliverable'],
    // Natural planner phrasing wave 5 (map/sketch/runbook/play/todo/criteria/plate)
    ['map out the night', 'map-out-night'],
    ['sketch the plan', 'sketch-plan'],
    ['owner runbook', 'owner-runbook'],
    ['operating plan', 'operating-plan'],
    ['what is your next play', 'next-play'],
    ['work order for tonight', 'work-order-tonight'],
    ["what's on the board", 'on-the-board'],
    ['owner todo', 'owner-todo'],
    ['todo for this tick', 'todo-this-tick'],
    ['what should the owner do', 'owner-do'],
    ['tick cadence', 'tick-cadence'],
    ['how do you stack the work', 'stack-work'],
    ['stage unlock', 'stage-unlock'],
    ['advance criteria', 'advance-criteria'],
    ['exit criteria', 'exit-criteria'],
    ['are we unblocked', 'are-unblocked'],
    ['is advance blocked', 'is-advance-blocked'],
    ['what holds the gate', 'holds-gate'],
    ['primary unlock', 'primary-unlock'],
    ['list the next steps', 'list-next-steps'],
    ['what will you tackle next', 'tackle-next'],
    ["what's on your plate", 'on-your-plate'],
    ['tick status', 'tick-status'],
    ['cycle plan', 'cycle-plan'],
    ['agent focus', 'agent-focus'],
    ['what needs to happen', 'needs-to-happen'],
    ['what must happen next', 'must-happen-next'],
    ['definition of done for this stage', 'def-of-done'],
    ['gate unlock status', 'gate-unlock-status'],
    // Natural planner phrasing wave 6 (ops sequence / go-no-go / stage-up / path / call sheet)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path
    ['what is the operating sequence', 'operating-sequence'],
    ['stack rank the work', 'stack-rank'],
    ['priority stack', 'priority-stack'],
    ['what is top of mind', 'top-of-mind'],
    ['what are you chewing on', 'chewing-on'],
    ['walk the gate', 'walk-the-gate'],
    ['gate walkthrough', 'gate-walkthrough'],
    ['stage exit checklist', 'stage-exit-checklist'],
    ['what ships this tick', 'ships-this-tick'],
    ['what is the do-next', 'do-next'],
    ['do next list', 'do-next-list'],
    ['what is the attack plan', 'attack-plan'],
    ['how do we clear the stage', 'clear-the-stage'],
    ['what is the go/no-go', 'go-no-go'],
    ['go no go for advance', 'go-no-go-advance'],
    ['readiness for advance', 'readiness-advance'],
    ['stage readiness check', 'stage-readiness'],
    ['how is the night sequenced', 'night-sequenced'],
    ['sequence the night', 'sequence-the-night'],
    ['give me the plan', 'give-me-plan'],
    ['lay out tonight', 'lay-out-tonight'],
    ['plot the next steps', 'plot-next-steps'],
    ['chart the course', 'chart-course'],
    ['what is the path forward', 'path-forward'],
    ['path forward this tick', 'path-forward-tick'],
    ['what unblocks us', 'unblocks-us'],
    ['what unblocks advance', 'unblocks-advance'],
    ['unblock criteria', 'unblock-criteria'],
    ['definition of ready', 'def-of-ready'],
    ['are we ready to stage up', 'ready-stage-up'],
    ['can we stage up', 'can-stage-up'],
    ['stage-up check', 'stage-up-check'],
    ['what is left before advance', 'left-before-advance'],
    ['remaining before advance', 'remaining-before-advance'],
    ['pre-advance checklist', 'pre-advance-checklist'],
    ['what is the owner decision', 'owner-decision'],
    ['call your shot', 'call-your-shot'],
    ['what is your call', 'your-call'],
    ['tonight call sheet', 'tonight-call-sheet'],
    ['owner call sheet', 'owner-call-sheet'],
    // Natural planner phrasing wave 7 (mission/ops stack / runway / preflight / green light / WIP)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path
    ['what is the mission order', 'mission-order'],
    ['mission order for tonight', 'mission-order-tonight'],
    ['what is the ops stack', 'ops-stack'],
    ['ops stack tonight', 'ops-stack-tonight'],
    ['execution order this tick', 'execution-order-tick'],
    ['what is the execution order', 'execution-order'],
    ['how do you order the work', 'order-the-work'],
    ['order the work for me', 'order-work-for-me'],
    ['what is the work sequence', 'work-sequence'],
    ['priority order this cycle', 'priority-order-cycle'],
    ['what is the priority order', 'priority-order'],
    ['show me the runway', 'show-runway'],
    ['what is on the runway', 'on-runway'],
    ['runway for this tick', 'runway-tick'],
    ['what is the launch plan', 'launch-plan'],
    ['launch plan tonight', 'launch-plan-tonight'],
    ['preflight checklist', 'preflight-checklist'],
    ['preflight for advance', 'preflight-advance'],
    ['what is the go list', 'go-list'],
    ['go list for this stage', 'go-list-stage'],
    ['what is the stop list', 'stop-list'],
    ['red flags for advance', 'red-flags-advance'],
    ['what are the red flags', 'red-flags'],
    ['kill criteria', 'kill-criteria'],
    ['what is the kill criteria', 'kill-criteria-what'],
    ['advance green light', 'advance-green-light'],
    ['do we have a green light', 'have-green-light'],
    ['green light to advance', 'green-light-advance'],
    ['what is blocking readiness', 'blocking-readiness'],
    ['readiness blockers', 'readiness-blockers'],
    ['what is the readiness gate', 'readiness-gate'],
    ['show readiness gate', 'show-readiness-gate'],
    ['owner scoreboard', 'owner-scoreboard'],
    ['tick scoreboard', 'tick-scoreboard'],
    ['what is the scoreboard', 'scoreboard'],
    ['owner standup', 'owner-standup'],
    ['give me the standup', 'give-standup'],
    ['what is the owner standup', 'owner-standup-what'],
    ['tick sprint', 'tick-sprint'],
    ['sprint plan this tick', 'sprint-plan-tick'],
    ['what is the sprint', 'what-sprint'],
    ['backlog for tonight', 'backlog-tonight'],
    ['owner backlog', 'owner-backlog'],
    ['what is the backlog', 'what-backlog'],
    ['what is the WIP', 'what-wip'],
    ['wip this cycle', 'wip-cycle'],
    ['in flight work', 'in-flight-work'],
    ['what is in flight', 'what-in-flight'],
    ['what is shipping next', 'shipping-next'],
    ['shipping order', 'shipping-order'],
    ['dispatch for this tick', 'dispatch-tick'],
    ['what is the dispatch', 'what-dispatch'],
    ['owner play call', 'owner-play-call'],
    ['call the sequence', 'call-sequence'],
    ['sequence call', 'sequence-call'],
    ['what is your sequence call', 'sequence-call-what'],
    // Natural planner phrasing wave 8 (load order / critical chain / hopper / triage / RACI)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path
    ['what is the load order', 'load-order'],
    ['load order for tonight', 'load-order-tonight'],
    ['what is the battle rhythm', 'battle-rhythm'],
    ['battle rhythm this tick', 'battle-rhythm-tick'],
    ['order of battle tonight', 'order-of-battle'],
    ['cadence call', 'cadence-call'],
    ['what is the pull list', 'pull-list'],
    ['pull list for this tick', 'pull-list-tick'],
    ['what is the work package', 'work-package'],
    ['work package tonight', 'work-package-tonight'],
    ['what is the critical chain', 'critical-chain'],
    ['critical chain', 'critical-chain-bare'],
    ['show me the critical chain', 'show-critical-chain'],
    ['what is the flight plan', 'flight-plan'],
    ['flight plan this cycle', 'flight-plan-cycle'],
    ['what is the takt', 'takt'],
    ['takt for this tick', 'takt-tick'],
    ['what is in the hopper', 'in-hopper'],
    ['what is on the hopper', 'on-hopper'],
    ['hopper for tonight', 'hopper-tonight'],
    ['what is the commit list', 'commit-list'],
    ['commit list this tick', 'commit-list-tick'],
    ['what is the cut line', 'cut-line'],
    ['cut line for advance', 'cut-line-advance'],
    ['what is the kill switch', 'kill-switch'],
    ['kill switch criteria', 'kill-switch-criteria'],
    ['what is the go gate', 'go-gate'],
    ['go gate status', 'go-gate-status'],
    ['what is the freeze list', 'freeze-list'],
    ['freeze list before advance', 'freeze-list-advance'],
    ['what is the burn down', 'burn-down'],
    ['burndown this tick', 'burndown-tick'],
    ['what is the velocity', 'velocity'],
    ['owner velocity', 'owner-velocity'],
    ['what is the kanban', 'kanban'],
    ['kanban for tonight', 'kanban-tonight'],
    ['what is the swimlane', 'swimlane'],
    ['swimlane this cycle', 'swimlane-cycle'],
    ['what is the RACI', 'raci'],
    ['RACI for tonight', 'raci-tonight'],
    ['who does what this tick', 'who-does-what'],
    ['what is the decision tree', 'decision-tree'],
    ['decision tree for advance', 'decision-tree-advance'],
    ['what is the triage order', 'triage-order'],
    ['triage order this tick', 'triage-order-tick'],
    ['what is the escalation path', 'escalation-path'],
    ['escalation path', 'escalation-path-bare'],
    ['what is the hot path', 'hot-path'],
    ['hot path this tick', 'hot-path-tick'],
    ['what is the cold path', 'cold-path'],
    ['what is the main thread', 'main-thread'],
    ['main thread tonight', 'main-thread-tonight'],
    ['what is the dependency chain', 'dependency-chain'],
    ['dependency chain', 'dependency-chain-bare'],
    ['what is the release train', 'release-train'],
    ['release train this tick', 'release-train-tick'],
    // Natural planner phrasing wave 9 (workstream / choke point / drumbeat / go criteria)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path
    ['what is the workstream', 'workstream'],
    ['workstream for tonight', 'workstream-tonight'],
    ['what is the critical thread', 'critical-thread'],
    ['critical thread', 'critical-thread-bare'],
    ['what is the single thread', 'single-thread'],
    ['single thread of work', 'single-thread-work'],
    ['what is the owner loop', 'owner-loop'],
    ['owner loop', 'owner-loop-bare'],
    ['what is the owner cadence', 'owner-cadence'],
    ['owner cadence', 'owner-cadence-bare'],
    ['what is the pull order', 'pull-order'],
    ['pull order', 'pull-order-bare'],
    ['what is the commit order', 'commit-order'],
    ['commit order', 'commit-order-bare'],
    ['what is the dependency order', 'dependency-order'],
    ['dependency order', 'dependency-order-bare'],
    ['what is the action queue', 'action-queue'],
    ['action queue', 'action-queue-bare'],
    ['what is the work queue', 'work-queue'],
    ['work queue', 'work-queue-bare'],
    ['what is the night stack', 'night-stack'],
    ['night stack', 'night-stack-bare'],
    ['what is the owner stack', 'owner-stack'],
    ['owner stack', 'owner-stack-bare'],
    ['what is the do stack', 'do-stack'],
    ['do stack', 'do-stack-bare'],
    ['what is the ops board', 'ops-board'],
    ['ops board', 'ops-board-bare'],
    ['what is the throttle', 'throttle'],
    ['throttle for this tick', 'throttle-tick'],
    ['what is the choke point', 'choke-point'],
    ['choke point', 'choke-point-bare'],
    ['what is the drumbeat', 'drumbeat'],
    ['drumbeat for tonight', 'drumbeat-tonight'],
    ['what is the gate map', 'gate-map'],
    ['gate map', 'gate-map-bare'],
    ['what is the readiness board', 'readiness-board'],
    ['readiness board', 'readiness-board-bare'],
    ['what is the next commit', 'next-commit'],
    ['next commit this tick', 'next-commit-tick'],
    ['definition of go', 'definition-of-go'],
    ['go criteria', 'go-criteria'],
    ['no-go criteria', 'no-go-criteria'],
    ['what is the pivot plan', 'pivot-plan'],
    ['pivot plan', 'pivot-plan-bare'],
    ['what is the serial path', 'serial-path'],
    ['serial path', 'serial-path-bare'],
    ['what is the force rank', 'force-rank'],
    ['force rank', 'force-rank-bare'],
    // Natural planner phrasing wave 10 (run of show / cue sheet / day-of stack / dependency graph)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path.
    // "day-of stack" must not false-positive stage advance via day-of → run.
    ['what is the run of show', 'run-of-show'],
    ['run of show', 'run-of-show-bare'],
    ['what is the cue sheet', 'cue-sheet'],
    ['cue sheet', 'cue-sheet-bare'],
    ['what is the day-of stack', 'day-of-stack'],
    ['day-of stack', 'day-of-stack-bare'],
    ['what is the show flow', 'show-flow'],
    ['show flow', 'show-flow-bare'],
    ['what is the room flow', 'room-flow'],
    ['what is the dependency graph', 'dependency-graph'],
    ['dependency graph', 'dependency-graph-bare'],
    ['what is the work breakdown', 'work-breakdown'],
    ['work breakdown structure', 'wbs'],
    ['what is the pull sequence', 'pull-sequence'],
    ['what is the commit stack', 'commit-stack'],
    ['commit stack', 'commit-stack-bare'],
    ['what is the go chain', 'go-chain'],
    ['go chain', 'go-chain-bare'],
    ['what is the serial stack', 'serial-stack'],
    ['serial stack', 'serial-stack-bare'],
    ['what is the readiness ladder', 'readiness-ladder'],
    ['readiness ladder', 'readiness-ladder-bare'],
    ['what is the advance ladder', 'advance-ladder'],
    ['advance ladder', 'advance-ladder-bare'],
    ['what is the stage ladder', 'stage-ladder'],
    ['stage ladder', 'stage-ladder-bare'],
    ['what is the bottleneck map', 'bottleneck-map'],
    ['bottleneck map', 'bottleneck-map-bare'],
    ['what is the constraint board', 'constraint-board'],
    ['constraint board', 'constraint-board-bare'],
    ['what is the risk board', 'risk-board'],
    ['risk board', 'risk-board-bare'],
    ['what is the kill map', 'kill-map'],
    ['kill map', 'kill-map-bare'],
    ['what is the next gate', 'next-gate'],
    ['next gate', 'next-gate-bare'],
    ['what is the owner thread', 'owner-thread'],
    ['owner thread', 'owner-thread-bare'],
    ['what is the action stack', 'action-stack'],
    ['action stack', 'action-stack-bare'],
    ['what is the force order', 'force-order'],
    ['force order', 'force-order-bare'],
    ['what is the pre-show order', 'pre-show-order'],
    ['pre-show order', 'pre-show-order-bare'],
    ['what is the tech order', 'tech-order'],
    ['tech order', 'tech-order-bare'],
    ['what is the call order', 'call-order'],
    ['call order', 'call-order-bare'],
    ['what is the strike plan', 'strike-plan'],
    ['strike plan', 'strike-plan-bare'],
    ['what is the load-in order', 'load-in-order'],
    ['load-in order', 'load-in-order-bare'],
    ['what is the load-out order', 'load-out-order'],
    ['load-out order', 'load-out-order-bare'],
    ['what is the room plan', 'room-plan'],
    // Natural planner phrasing wave 11 (definition of done / gantt / day-of plan / path to green)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path.
    // "day-of plan" must not false-positive stage advance via day-of → run.
    ['what is the definition of done', 'def-of-done-w11'],
    ['definition of done', 'def-of-done-bare'],
    ['what is the gantt', 'gantt'],
    ['gantt chart', 'gantt-chart'],
    ['show me the sequence', 'show-sequence'],
    ['what is the day-of plan', 'day-of-plan'],
    ['day-of plan', 'day-of-plan-bare'],
    ['what is the launch checklist', 'launch-checklist'],
    ['readiness checklist', 'readiness-checklist'],
    ['what is the path to green', 'path-to-green'],
    ['path to green', 'path-to-green-bare'],
    ['what is the green path', 'green-path'],
    ['what is the red path', 'red-path'],
    ['what is the gate ladder', 'gate-ladder'],
    ['gate ladder', 'gate-ladder-bare'],
    ['what is the unlock stack', 'unlock-stack'],
    ['what is the blocker board', 'blocker-board'],
    ['what is the constraint map', 'constraint-map'],
    ['what is the serial order', 'serial-order'],
    ['what is the next hop', 'next-hop'],
    ['what is the mission stack', 'mission-stack'],
    ['mission stack', 'mission-stack-bare'],
    ['what is the tick order', 'tick-order'],
    ['what is the owner sequence', 'owner-sequence'],
    ['what is the action order', 'action-order'],
    ['what is the pull stack', 'pull-stack'],
    ['what is the commit path', 'commit-path'],
    ['what is the go path', 'go-path'],
    ['what is the ready queue', 'ready-queue'],
    ['what is the queue depth', 'queue-depth'],
    ['what is the stage map', 'stage-map'],
    ['what is the owner board', 'owner-board'],
    ['what is the focus stack', 'focus-stack'],
    ['what is the todo stack', 'todo-stack'],
    ['what is the action list', 'action-list'],
    ['what is the owner roadmap', 'owner-roadmap'],
    ['what is the force list', 'force-list'],
    ['what is the kill board', 'kill-board'],
    ['what is the go map', 'go-map'],
    ['what is the execution path', 'execution-path'],
    ['what is the dependency map', 'dependency-map'],
    ['what is the night order', 'night-order'],
    ['what is the gate path', 'gate-path'],
    ['what is the advance path', 'advance-path'],
    ['what is the stage path', 'stage-path'],
    ['what is the ops ladder', 'ops-ladder'],
    ['what is the night ladder', 'night-ladder'],
    ['what is the force stack', 'force-stack'],
    ['what is the serial queue', 'serial-queue'],
    ['what is the commit ladder', 'commit-ladder'],
    ['what is the go ladder', 'go-ladder'],
    ['what is the unlock ladder', 'unlock-ladder'],
    ['what is the blocker stack', 'blocker-stack'],
    ['what is the risk stack', 'risk-stack'],
    ['what is the constraint stack', 'constraint-stack'],
    ['what is the critical sequence', 'critical-sequence'],
    ['what is the stage board', 'stage-board'],
    ['what is the plan board', 'plan-board'],
    ['what is the sequence board', 'sequence-board'],
    ['what is the critical board', 'critical-board'],
    // Natural planner phrasing wave 12 (night brief / build order / dependency tree / ToC / war room)
    // Were generic lifecycle, agenda-checklist, or bare "list" RSVP path.
    // "what is my agenda tonight" must not fall to agenda host-frame.
    ['what is the night brief', 'night-brief'],
    ['night brief', 'night-brief-bare'],
    ['owner brief', 'owner-brief'],
    ['tick brief', 'tick-brief'],
    ['what is the war room plan', 'war-room-plan'],
    ['war room status', 'war-room-status'],
    ['what is the build order', 'build-order'],
    ['build order', 'build-order-bare'],
    ['what is the service order', 'service-order'],
    ['what is the scrum order', 'scrum-order'],
    ['what is the night graph', 'night-graph'],
    ['show me the ops graph', 'ops-graph'],
    ['what is the process map', 'process-map'],
    ['what is the dependency tree', 'dependency-tree'],
    ['dependency tree', 'dependency-tree-bare'],
    ['what is the value stream', 'value-stream'],
    ['owner capacity plan', 'owner-capacity-plan'],
    ['what is the capacity plan', 'capacity-plan'],
    ['path of least resistance for advance', 'path-least-resistance'],
    ['what is the single source of truth for the tick', 'ssot-tick'],
    ['theory of constraints for this tick', 'toc-tick'],
    ['what is the constraint', 'what-constraint'],
    ['what is the bottleneck analysis', 'bottleneck-analysis'],
    ['what is my agenda tonight', 'agenda-tonight'],
    ['agenda for tonight', 'agenda-for-tonight'],
    // Natural planner phrasing wave 13 (working on / P0 / marching orders / north star / tonight plan)
    // Were generic lifecycle; "must-do list" / "need-to-do list" were bare "list" RSVP path.
    // "status report" was status path without Owner tick plan lead.
    ['what are you working on', 'working-on'],
    ['what are you working on right now', 'working-on-now'],
    ['current priorities', 'current-priorities'],
    ['what is the next thing', 'next-thing'],
    ['night plan', 'night-plan'],
    ['event plan', 'event-plan'],
    ['how do we get there', 'how-get-there'],
    ["what's left to do", 'left-to-do'],
    ['what remains to do', 'remains-to-do'],
    ['status report', 'status-report'],
    ["owner's plan", 'owners-plan'],
    ['top priority', 'top-priority'],
    ['number one priority', 'number-one-priority'],
    ['priority one', 'priority-one'],
    ['what is P0', 'what-is-p0'],
    ['P0 for this tick', 'p0-this-tick'],
    ['must-do list', 'must-do-list'],
    ['need-to-do list', 'need-to-do-list'],
    ['action items', 'action-items'],
    ['your move', 'your-move'],
    ['play of the day', 'play-of-the-day'],
    ['next moves', 'next-moves'],
    ['what are the next moves', 'what-next-moves'],
    ['standing plan', 'standing-plan'],
    ['standing order for tonight', 'standing-order'],
    ['marching orders', 'marching-orders'],
    ['what are the marching orders', 'what-marching-orders'],
    ['operating rhythm', 'operating-rhythm'],
    ['what is the operating rhythm', 'what-operating-rhythm'],
    ['daily plan', 'daily-plan'],
    ['what is the daily plan', 'what-daily-plan'],
    ['tonight plan', 'tonight-plan'],
    ["what's tonight's plan", 'whats-tonight-plan'],
    ['where should effort go', 'effort-go'],
    ['where does effort go', 'does-effort-go'],
    ['force the next step', 'force-next-step'],
    ['force next', 'force-next'],
    ['what is forced next', 'forced-next'],
    ['commit next', 'commit-next'],
    ['what do we commit to next', 'commit-to-next'],
    ['north star for this tick', 'north-star-tick'],
    ['what is the north star', 'what-north-star'],
    ['main effort', 'main-effort'],
    ['what is the main effort', 'what-main-effort'],
    ['supporting effort', 'supporting-effort'],
    ['commander intent', 'commander-intent'],
    ["what is the commander's intent", 'commanders-intent'],
    ['intent of this tick', 'intent-of-tick'],
    ['purpose of this tick', 'purpose-of-tick'],
    ['why this step', 'why-this-step'],
    ['why this next step', 'why-this-next-step'],
    ['what needs doing next', 'needs-doing-next'],
    ['work plan for tonight', 'work-plan-tonight'],
    ['what is the work plan', 'what-work-plan'],
    // Natural planner phrasing wave 14 (on the plate / ship next / one thing / OODA / mission / call)
    // Were generic lifecycle; bare plate / shipping plan / pull the next were miss.
    ["what's on the plate", 'on-the-plate'],
    ['what should we ship next', 'ship-next'],
    ['shipping plan', 'shipping-plan'],
    ['what is the shipping plan', 'what-shipping-plan'],
    ["what's the one thing", 'one-thing'],
    ['the one thing for this tick', 'one-thing-tick'],
    ['OODA loop for this tick', 'ooda-tick'],
    ['what is the OODA loop', 'what-ooda'],
    ["what's the objective", 'objective'],
    ["what's the mission", 'mission'],
    ['mission for tonight', 'mission-tonight'],
    ["what's the call", 'whats-the-call'],
    ['what gets done first', 'gets-done-first'],
    ['what is the thread', 'what-thread'],
    ['current thread', 'current-thread'],
    ['pull the next', 'pull-the-next'],
    ["what's the pull", 'whats-the-pull'],
    ['focus area', 'focus-area'],
    ["what's the focus area", 'what-focus-area'],
    ['sprint goal for tonight', 'sprint-goal-tonight'],
    ['what is the sprint goal', 'what-sprint-goal'],
    ['acceptance criteria for advance', 'acceptance-criteria-advance'],
    ['what is the acceptance criteria', 'what-acceptance-criteria'],
    ['when are we ready', 'when-are-we-ready'],
    ['ready when', 'ready-when'],
    ['job to be done for this tick', 'jtbd-tick'],
    ['what is the JTBD', 'what-jtbd'],
    ['success criteria', 'success-criteria'],
    ['what does success look like', 'success-look-like'],
    ['what is the leverage point', 'leverage-point'],
    ['what is the force multiplier', 'force-multiplier'],
    ["what's the lever", 'whats-the-lever'],
    // Natural planner phrasing wave 15 (NBA / plan of record / first domino / 80-20 / keystone)
    // Were generic lifecycle; "where do we start" / "what can ship today" / bare NBA were miss.
    ['next best action', 'next-best-action'],
    ['what is the NBA', 'what-nba'],
    ['plan of record', 'plan-of-record'],
    ['what is the plan of record', 'what-plan-of-record'],
    ['highest leverage', 'highest-leverage'],
    ['what is the highest leverage move', 'highest-leverage-move'],
    ['what should we focus on', 'focus-on'],
    ["what's our focus right now", 'focus-right-now'],
    ['immediate next step', 'immediate-next'],
    ['what is the critical next step', 'critical-next-step'],
    ['what can we ship today', 'ship-today'],
    ['what ships first', 'ships-first'],
    ["today's focus", 'todays-focus'],
    ['80/20', 'eighty-twenty'],
    ['pareto', 'pareto'],
    ['thinnest slice', 'thinnest-slice'],
    ['smallest next step', 'smallest-next'],
    ['minimum viable next', 'minimum-viable-next'],
    ['order of execution', 'order-of-execution'],
    ['execution sequence', 'execution-sequence'],
    ['first in line', 'first-in-line'],
    ['top of the board', 'top-of-board'],
    ['top card', 'top-card'],
    ['lead item', 'lead-item'],
    ['what deserves attention', 'deserves-attention'],
    ['decision criteria', 'decision-criteria'],
    ['what is the decision criteria', 'what-decision-criteria'],
    ['milestone for tonight', 'milestone-tonight'],
    ['what is the checkpoint', 'what-checkpoint'],
    ['key result for this tick', 'key-result-tick'],
    ['what is the OKR', 'what-okr'],
    ['WIP limit', 'wip-limit'],
    ['ship blockers', 'ship-blockers'],
    ['what is blocking shipping', 'blocking-shipping'],
    ['first domino', 'first-domino'],
    ['what is the keystone', 'what-keystone'],
    ['unlocking move', 'unlocking-move'],
    ['where do we start', 'where-start'],
    ['what is the starting point', 'starting-point'],
    ['operating model', 'operating-model'],
    ['what are we optimizing for', 'optimizing-for'],
    ['single next action', 'single-next-action'],
    ['in what order', 'in-what-order'],
    ['what order do we go', 'what-order-go'],
    // Natural planner phrasing wave 16 (forcing function / DACI / MoSCoW / flywheel / RICE / 2x2)
    // Apostrophe-less "whats the plan" / bare forcing function must hit Owner tick plan.
    ['forcing function', 'forcing-function'],
    ['what is the forcing function', 'what-forcing-function'],
    ['DACI', 'daci'],
    ['what is the DACI', 'what-daci'],
    ['MoSCoW', 'moscow'],
    ['what is the MoSCoW', 'what-moscow'],
    ['flywheel', 'flywheel'],
    ['what is the flywheel', 'what-flywheel'],
    ['wedge', 'wedge'],
    ['what is the wedge', 'what-wedge'],
    ['beachhead', 'beachhead'],
    ['one-pager', 'one-pager'],
    ['what is the one-pager', 'what-one-pager'],
    ['brief for this tick', 'brief-for-tick'],
    ['stand-up summary', 'standup-summary'],
    ['compounder', 'compounder'],
    ['eisenhower matrix', 'eisenhower'],
    ['2x2 matrix', 'two-by-two'],
    ['impact/effort', 'impact-effort'],
    ['RICE score', 'rice-score'],
    ['what is the RICE', 'what-rice'],
    ['ICE score', 'ice-score'],
    ['sequencing for tonight', 'sequencing-tonight'],
    ['what is our sequencing', 'what-sequencing'],
    ['our sequencing', 'our-sequencing'],
    ["whats the plan", 'whats-the-plan'],
    ["whats the forcing function", 'whats-forcing-function'],
    // Natural planner phrasing wave 17 (pre-mortem / DRI / MIT / GTD / RAID / OMTM / timebox)
    // Apostrophe-less "whats the DRI" / bare pre-mortem must hit Owner tick plan (not lifecycle).
    ['pre-mortem', 'pre-mortem'],
    ['what is the pre-mortem', 'what-pre-mortem'],
    ['pre-mortem for tonight', 'premortem-tonight'],
    ['post-mortem plan', 'post-mortem-plan'],
    ['risk register', 'risk-register'],
    ['RAID log', 'raid-log'],
    ['what is the RAID log', 'what-raid-log'],
    ['single-threaded owner', 'single-threaded-owner'],
    ['what is the DRI', 'what-dri'],
    ['who is the DRI', 'who-dri'],
    ["whats the DRI", 'whats-dri'],
    ['timebox', 'timebox'],
    ['most important task', 'most-important-task'],
    ['what is the MIT', 'what-mit'],
    ['big rocks', 'big-rocks'],
    ['eat the frog', 'eat-the-frog'],
    ['frogs first', 'frogs-first'],
    ['GTD', 'gtd'],
    ['getting things done', 'getting-things-done'],
    ['decision log', 'decision-log'],
    ['prioritization stack', 'prioritization-stack'],
    ['stack rank for tonight', 'stack-rank-tonight'],
    ['SOP', 'sop'],
    ['standard operating procedure', 'standard-op'],
    ['playbook order', 'playbook-order'],
    ['go book', 'go-book'],
    ['options matrix', 'options-matrix'],
    ['tradeoff matrix', 'tradeoff-matrix'],
    ['dependency order', 'dependency-order'],
    ['one metric that matters', 'omtm-phrase'],
    ['OMTM', 'omtm'],
    ['capacity for this tick', 'capacity-tick'],
    ['kill switch order', 'kill-switch-order'],
    ['decision tree', 'decision-tree'],
    ['Ivy Lee method', 'ivy-lee'],
    ['checklist order', 'checklist-order'],
    // Natural planner phrasing wave 18 (SWOT / PDCA / five whys / now-next-later / MECE / RASCI)
    // Bare "SWOT" / "now next later" / "five whys" must hit Owner tick plan (not lifecycle).
    ['SWOT', 'swot'],
    ['what is the SWOT', 'what-swot'],
    ['PESTLE', 'pestle'],
    ['PDCA', 'pdca'],
    ['plan do check act', 'plan-do-check-act'],
    ['A3 problem solving', 'a3-problem'],
    ['what is the A3', 'what-a3'],
    ['five whys', 'five-whys'],
    ['5 whys', '5-whys'],
    ['root cause analysis', 'rca'],
    ['what is the RCA', 'what-rca'],
    ['fishbone', 'fishbone'],
    ['ishikawa', 'ishikawa'],
    ['now next later', 'now-next-later'],
    ['now/next/later', 'now-slash-next-later'],
    ['priority matrix', 'priority-matrix'],
    ['decision matrix', 'decision-matrix'],
    ['weighted scoring', 'weighted-scoring'],
    ['PICK chart', 'pick-chart'],
    ['SMART goals', 'smart-goals'],
    ['critical success factors', 'csf'],
    ['CSF for tonight', 'csf-tonight'],
    ['MECE', 'mece'],
    ['SCQA', 'scqa'],
    ['issue tree', 'issue-tree'],
    ['hypothesis tree', 'hypothesis-tree'],
    ['driver tree', 'driver-tree'],
    ['pyramid principle', 'pyramid-principle'],
    ['first principles', 'first-principles'],
    ['first principles for tonight', 'first-principles-tonight'],
    ['inversion planning', 'inversion-planning'],
    ['second order thinking', 'second-order'],
    ['ladder of inference', 'ladder-inference'],
    ['story map', 'story-map'],
    ['user story map', 'user-story-map'],
    ['RASCI', 'rasci'],
    ['what is the RASCI', 'what-rasci'],
    ['OKR cascade', 'okr-cascade'],
    // Natural planner phrasing wave 19 (force field / cynefin / wardley / kano / canvases / OST)
    // Bare "cynefin" / "lean canvas" / "riskiest assumption" must hit Owner tick plan.
    ['force field analysis', 'force-field'],
    ['what is the force field', 'what-force-field'],
    ['cynefin', 'cynefin'],
    ['what is the cynefin', 'what-cynefin'],
    ['wardley map', 'wardley-map'],
    ['what is the wardley', 'what-wardley'],
    ['Kano model', 'kano-model'],
    ['what is the Kano', 'what-kano'],
    ['impact mapping', 'impact-mapping'],
    ['what is impact mapping', 'what-impact-mapping'],
    ['story mapping', 'story-mapping'],
    ['riskiest assumption', 'riskiest-assumption'],
    ['what is the riskiest assumption', 'what-riskiest'],
    ['assumption map', 'assumption-map'],
    ['lean canvas', 'lean-canvas'],
    ['business model canvas', 'bmc'],
    ['value proposition canvas', 'vpc'],
    ['opportunity solution tree', 'ost'],
    ['what is the opportunity solution tree', 'what-ost'],
    ['capability map', 'capability-map'],
    ['OKR tree', 'okr-tree'],
    // Natural planner phrasing wave 20 (service blueprint / sitrep / RAPID / AAR / TOC tools)
    // Bare "sitrep" / "service blueprint" / "jobs to be done" must hit Owner tick plan.
    ['jobs to be done', 'jobs-to-be-done'],
    ['what is the jobs to be done', 'what-jobs-to-be-done'],
    ['jobs to be done for tonight', 'jtbd-tonight'],
    ['service blueprint', 'service-blueprint'],
    ['what is the service blueprint', 'what-service-blueprint'],
    ['journey map', 'journey-map'],
    ['customer journey map', 'customer-journey-map'],
    ['what is the journey map', 'what-journey-map'],
    ['event canvas', 'event-canvas'],
    ['what is the event canvas', 'what-event-canvas'],
    ['theory of change', 'theory-of-change'],
    ['what is the theory of change', 'what-theory-of-change'],
    ['logic model', 'logic-model'],
    ['what is the logic model', 'what-logic-model'],
    ['RAPID', 'rapid'],
    ['RAPID framework', 'rapid-framework'],
    ['what is the RAPID', 'what-rapid'],
    ['north-star metric', 'north-star-metric'],
    ['what is the north-star metric', 'what-north-star-metric'],
    ['AAR', 'aar'],
    ['after action review', 'after-action-review'],
    ['after action review plan', 'aar-plan'],
    ['what is the after action review', 'what-aar'],
    ['sitrep', 'sitrep'],
    ['what is the sitrep', 'what-sitrep'],
    ['situation report', 'situation-report'],
    ['battle map', 'battle-map'],
    ['what is the battle map', 'what-battle-map'],
    ['PERT', 'pert'],
    ['PERT chart', 'pert-chart'],
    ['what is the PERT chart', 'what-pert-chart'],
    ['CPM', 'cpm'],
    ['critical path method', 'critical-path-method'],
    ['what is the CPM', 'what-cpm'],
    ['scrum of scrums', 'scrum-of-scrums'],
    ['push system', 'push-system'],
    ['pull system', 'pull-system'],
    ['five focusing steps', 'five-focusing-steps'],
    ['what is the five focusing steps', 'what-five-focusing'],
    ['goldratt', 'goldratt'],
    ['what is the goldratt', 'what-goldratt'],
    ['drum buffer rope', 'drum-buffer-rope'],
    ['what is the drum buffer rope', 'what-dbr'],
    ['what is the buffer', 'what-buffer'],
    ["what's the agent doing", 'whats-agent-doing'],
    ['whats the agent doing', 'whats-agent-doing-bare'],
    ['what is the bot doing', 'what-bot-doing'],
    // Natural planner phrasing wave 21 (stakeholder/empathy maps / lean ops / RACI / cadence)
    // Bare "SIPOC" / "kaizen" / "stakeholder map" must hit Owner tick plan.
    ['stakeholder map', 'stakeholder-map'],
    ['what is the stakeholder map', 'what-stakeholder-map'],
    ['empathy map', 'empathy-map'],
    ['what is the empathy map', 'what-empathy-map'],
    ['RAID', 'raid'],
    ['RAID log', 'raid-log'],
    ['what is the RAID', 'what-raid'],
    ['RACI', 'raci'],
    ['RACI chart', 'raci-chart'],
    ['what is the RACI', 'what-raci'],
    ['SIPOC', 'sipoc'],
    ['what is the SIPOC', 'what-sipoc'],
    ['DMAIC', 'dmaic'],
    ['what is the DMAIC', 'what-dmaic'],
    ['5S plan', '5s-plan'],
    ['5S', '5s'],
    ['kaizen', 'kaizen'],
    ['what is the kaizen', 'what-kaizen'],
    ['hoshin kanri', 'hoshin-kanri'],
    ['what is the hoshin', 'what-hoshin'],
    ['catchball', 'catchball'],
    ['andon', 'andon'],
    ['andons', 'andons'],
    ['gemba walk', 'gemba-walk'],
    ['what is the gemba', 'what-gemba'],
    ['control chart', 'control-chart'],
    ['spaghetti diagram', 'spaghetti-diagram'],
    ['standard work', 'standard-work'],
    ['heijunka', 'heijunka'],
    ['jidoka', 'jidoka'],
    ['poka yoke', 'poka-yoke'],
    ['what is the poka yoke', 'what-poka-yoke'],
    ['what is the throughput', 'what-throughput'],
    ['what is the WIP', 'what-wip'],
    ['what is the cadence', 'what-cadence'],
    ['what is the drumbeat tonight', 'what-drumbeat-tonight'],
    ['operating cadence', 'operating-cadence'],
    ['decision rights', 'decision-rights'],
    ['escalation ladder', 'escalation-ladder'],
    ['communication plan', 'communication-plan'],
    ['stakeholder plan', 'stakeholder-plan'],
    // Natural planner phrasing wave 22 (WBS / critical chain / iron triangle / COP / OPORD / value stream)
    // Bare "WBS" / "critical chain" / "value stream map" must hit Owner tick plan.
    ['WBS', 'wbs'],
    ['work breakdown structure', 'work-breakdown-structure'],
    ['what is the WBS', 'what-wbs'],
    ['critical chain', 'critical-chain'],
    ['what is the critical chain', 'what-critical-chain'],
    ['iron triangle', 'iron-triangle'],
    ['triple constraint', 'triple-constraint'],
    ['scope triangle', 'scope-triangle'],
    ['what is the iron triangle', 'what-iron-triangle'],
    ['value stream map', 'value-stream-map'],
    ['value stream', 'value-stream'],
    ['what is the value stream map', 'what-value-stream-map'],
    ['swimlane', 'swimlane'],
    ['swim lane diagram', 'swim-lane-diagram'],
    ['what is the swimlane', 'what-swimlane'],
    ['process map', 'process-map'],
    ['what is the process map', 'what-process-map'],
    ['dependency map', 'dependency-map'],
    ['what is the dependency map', 'what-dependency-map'],
    ['risk matrix', 'risk-matrix'],
    ['what is the risk matrix', 'what-risk-matrix'],
    ['change control', 'change-control'],
    ['change control board', 'change-control-board'],
    ['CCB', 'ccb'],
    ['what is the change control', 'what-change-control'],
    ['common operating picture', 'common-operating-picture'],
    ['COP', 'cop'],
    ['what is the COP', 'what-cop'],
    ['OPORD', 'opord'],
    ['five paragraph order', 'five-paragraph-order'],
    ['what is the OPORD', 'what-opord'],
    ['FRAGO', 'frago'],
    ['WARNORD', 'warnord'],
    ['what is the FRAGO', 'what-frago'],
    ['METT-TC', 'mett-tc'],
    ['what is the METT-TC', 'what-mett-tc'],
    ['MDMP', 'mdmp'],
    ['what is the MDMP', 'what-mdmp'],
    ['incident command', 'incident-command'],
    ['ICS structure', 'ics-structure'],
    ['what is the ICS', 'what-ics'],
    ['gold command', 'gold-command'],
    ['silver command', 'silver-command'],
    ['bronze command', 'bronze-command'],
    ['Gantt', 'gantt'],
    ['Gantt chart', 'gantt-chart'],
    ['what is the Gantt chart', 'what-gantt'],
    ['scope creep', 'scope-creep'],
    ['what is the scope creep', 'what-scope-creep'],
    ['AARRR', 'aarrr'],
    ['pirate metrics', 'pirate-metrics'],
    ['what is the AARRR', 'what-aarrr'],
    ['growth loop', 'growth-loop'],
    ['what is the growth loop', 'what-growth-loop'],
    ['activation funnel', 'activation-funnel'],
    ['retention loop', 'retention-loop'],
    ['HEART framework', 'heart-framework'],
    ['what is the HEART framework', 'what-heart-framework'],
    // Natural planner phrasing wave 23 (phase/tollgate / earned value / SAFe / resource leveling)
    // Bare "phase gate" / "resource leveling" / "PI planning" must hit Owner tick plan.
    ['phase gate', 'phase-gate'],
    ['what is the phase gate', 'what-phase-gate'],
    ['tollgate', 'tollgate'],
    ['what is the tollgate', 'what-tollgate'],
    ['earned value', 'earned-value'],
    ['earned value management', 'earned-value-management'],
    ['what is the EVM', 'what-evm'],
    ['cost performance index', 'cpi-full'],
    ['schedule performance index', 'spi-full'],
    ['what is the CPI', 'what-cpi'],
    ['what is the SPI', 'what-spi'],
    ['schedule compression', 'schedule-compression'],
    ['schedule crashing', 'schedule-crashing'],
    ['crashing the schedule', 'crashing-the-schedule'],
    ['fast tracking', 'fast-tracking'],
    ['what is the schedule compression', 'what-schedule-compression'],
    ['resource leveling', 'resource-leveling'],
    ['resource smoothing', 'resource-smoothing'],
    ['what is the resource leveling', 'what-resource-leveling'],
    ['total float', 'total-float'],
    ['free float', 'free-float'],
    ['what is the free float', 'what-free-float'],
    ['power interest grid', 'power-interest-grid'],
    ['what is the power interest grid', 'what-power-interest'],
    ['responsibility matrix', 'responsibility-matrix'],
    ['responsibility assignment matrix', 'ram-full'],
    ['what is the RAM', 'what-ram'],
    ['quality gate', 'quality-gate'],
    ['what is the quality gate', 'what-quality-gate'],
    ['benefits realization', 'benefits-realization'],
    ['what is the benefits realization', 'what-benefits-realization'],
    ['PI planning', 'pi-planning'],
    ['program increment', 'program-increment'],
    ['SAFe framework', 'safe-framework'],
    ['what is the SAFe framework', 'what-safe'],
    ['scrumban', 'scrumban'],
    ['what is the scrumban', 'what-scrumban'],
    ['product backlog', 'product-backlog'],
    ['sprint backlog', 'sprint-backlog'],
    ['what is the product backlog', 'what-product-backlog'],
    ['configuration management', 'configuration-management'],
    ['what is the configuration management', 'what-config-mgmt'],
    ['lessons learned', 'lessons-learned'],
    ['what is the lessons learned', 'what-lessons-learned'],
    ['baseline schedule', 'baseline-schedule'],
    ['schedule baseline', 'schedule-baseline'],
    ['what is the baseline schedule', 'what-baseline-schedule'],
    ['change request', 'change-request'],
    ['what is the change request', 'what-change-request'],
    ['monte carlo', 'monte-carlo'],
    ['monte carlo schedule', 'monte-carlo-schedule'],
    ['what is the monte carlo', 'what-monte-carlo'],
    // Natural planner phrasing wave 24 (rolling wave / network diagram / EVM residual / OBS)
    // Bare "rolling wave" / "resource histogram" / "earned schedule" must hit Owner tick plan.
    // Avoid bare BAC/EAC/ETC/VAC — full forms + "what is the X".
    ['rolling wave planning', 'rolling-wave-planning'],
    ['rolling wave', 'rolling-wave'],
    ['what is the rolling wave', 'what-rolling-wave'],
    ['forward pass', 'forward-pass'],
    ['backward pass', 'backward-pass'],
    ['what is the forward pass', 'what-forward-pass'],
    ['early start', 'early-start'],
    ['late start', 'late-start'],
    ['early finish', 'early-finish'],
    ['late finish', 'late-finish'],
    ['slack time', 'slack-time'],
    ['what is the slack time', 'what-slack-time'],
    ['network diagram', 'network-diagram'],
    ['what is the network diagram', 'what-network-diagram'],
    ['precedence diagram', 'precedence-diagram'],
    ['activity on node', 'activity-on-node'],
    ['what is the AON', 'what-aon'],
    ['organizational breakdown structure', 'obs-full'],
    ['what is the OBS', 'what-obs'],
    ['resource histogram', 'resource-histogram'],
    ['what is the resource histogram', 'what-resource-histogram'],
    ['crashing analysis', 'crashing-analysis'],
    ['what is the crashing analysis', 'what-crashing-analysis'],
    ['parametric estimate', 'parametric-estimate'],
    ['analogous estimating', 'analogous-estimating'],
    ['three point estimate', 'three-point-estimate'],
    ['what is the parametric estimate', 'what-parametric-estimate'],
    ['S-curve', 's-curve'],
    ['what is the S-curve', 'what-s-curve'],
    ['earned schedule', 'earned-schedule'],
    ['what is the earned schedule', 'what-earned-schedule'],
    ['to complete performance index', 'tcpi-full'],
    ['what is the TCPI', 'what-tcpi'],
    ['control account', 'control-account'],
    ['what is the control account', 'what-control-account'],
    ['planning package', 'planning-package'],
    ['what is the planning package', 'what-planning-package'],
    ['budget at completion', 'budget-at-completion'],
    ['estimate at completion', 'estimate-at-completion'],
    ['estimate to complete', 'estimate-to-complete'],
    ['variance at completion', 'variance-at-completion'],
    ['what is the BAC', 'what-bac'],
    ['what is the EAC', 'what-eac'],
    ['what is the ETC', 'what-etc'],
    ['what is the VAC', 'what-vac'],
    ['cost variance', 'cost-variance'],
    ['schedule variance', 'schedule-variance'],
    ['what is the cost variance', 'what-cost-variance'],
    ['SPI trend', 'spi-trend'],
    ['CPI trend', 'cpi-trend'],
    // Natural planner phrasing wave 25 (WSJF / cost of delay / agile flow / discovery residual)
    // Bare "WSJF" / "story points" / "cycle time" must hit Owner tick plan.
    // Avoid bare velocity/retro — full forms + "what is the X".
    ['WSJF', 'wsjf'],
    ['weighted shortest job first', 'weighted-shortest-job-first'],
    ['what is the WSJF', 'what-wsjf'],
    ['cost of delay', 'cost-of-delay'],
    ['what is the cost of delay', 'what-cost-of-delay'],
    ['CD3', 'cd3'],
    ['what is the CD3', 'what-cd3'],
    ['story points', 'story-points'],
    ['what is the story points', 'what-story-points'],
    ['planning poker', 'planning-poker'],
    ['what is the planning poker', 'what-planning-poker'],
    ['sprint velocity', 'sprint-velocity'],
    ['team velocity', 'team-velocity'],
    ['what is the velocity', 'what-velocity'],
    ['backlog refinement', 'backlog-refinement'],
    ['backlog grooming', 'backlog-grooming'],
    ['what is the backlog refinement', 'what-backlog-refinement'],
    ['sprint planning', 'sprint-planning'],
    ['sprint review', 'sprint-review'],
    ['sprint retrospective', 'sprint-retrospective'],
    ['what is the sprint planning', 'what-sprint-planning'],
    ['daily standup', 'daily-standup'],
    ['daily scrum', 'daily-scrum'],
    ['what is the daily standup', 'what-daily-standup'],
    ['burnup', 'burnup'],
    ['burn-up chart', 'burn-up-chart'],
    ['what is the burnup', 'what-burnup'],
    ['cumulative flow', 'cumulative-flow'],
    ['cumulative flow diagram', 'cumulative-flow-diagram'],
    ['what is the CFD', 'what-cfd'],
    ['cycle time', 'cycle-time'],
    ['lead time', 'lead-time'],
    ['what is the cycle time', 'what-cycle-time'],
    ["Little's law", 'littles-law'],
    ['what is the littles law', 'what-littles-law'],
    ['kanban board', 'kanban-board'],
    ['what is the kanban board', 'what-kanban-board'],
    ['class of service', 'class-of-service'],
    ['service level expectation', 'service-level-expectation'],
    ['what is the SLE', 'what-sle'],
    ['dual-track agile', 'dual-track-agile'],
    ['dual track discovery', 'dual-track-discovery'],
    ['continuous discovery', 'continuous-discovery'],
    ['what is the continuous discovery', 'what-continuous-discovery'],
    ['program board', 'program-board'],
    ['experiment backlog', 'experiment-backlog'],
    ['opportunity backlog', 'opportunity-backlog'],
    ['what is the program board', 'what-program-board'],
    ['spotify model', 'spotify-model'],
    ['squad model', 'squad-model'],
    ['tribe model', 'tribe-model'],
    ['what is the spotify model', 'what-spotify-model'],
    // Natural planner phrasing wave 26 (lean startup / product discovery residual / freezes)
    // Bare "build measure learn" / "product market fit" / "feature freeze" must hit Owner tick plan.
    // Avoid bare "MVP" / "spike" alone — full forms + "what is the X".
    ['build measure learn', 'build-measure-learn'],
    ['build-measure-learn', 'build-measure-learn-hyphen'],
    ['BML loop', 'bml-loop'],
    ['what is the build measure learn', 'what-build-measure-learn'],
    ['validated learning', 'validated-learning'],
    ['what is the validated learning', 'what-validated-learning'],
    ['innovation accounting', 'innovation-accounting'],
    ['what is the innovation accounting', 'what-innovation-accounting'],
    ['problem solution fit', 'problem-solution-fit'],
    ['problem-solution fit', 'problem-solution-fit-hyphen'],
    ['what is the problem solution fit', 'what-problem-solution-fit'],
    ['product market fit', 'product-market-fit'],
    ['product-market fit', 'product-market-fit-hyphen'],
    ['what is the PMF', 'what-pmf'],
    ['working backwards', 'working-backwards'],
    ['working backward', 'working-backward'],
    ['press release method', 'press-release-method'],
    ['PR/FAQ', 'pr-faq'],
    ['what is the working backwards', 'what-working-backwards'],
    ['customer development', 'customer-development'],
    ['what is the customer development', 'what-customer-development'],
    ['lean startup', 'lean-startup'],
    ['what is the lean startup', 'what-lean-startup'],
    ['smoke test', 'smoke-test'],
    ['what is the smoke test', 'what-smoke-test'],
    ['concierge MVP', 'concierge-mvp'],
    ['wizard of oz MVP', 'wizard-of-oz-mvp'],
    ['wizard of oz', 'wizard-of-oz'],
    ['what is the concierge MVP', 'what-concierge-mvp'],
    ['pretotype', 'pretotype'],
    ['pretotyping', 'pretotyping'],
    ['fake door test', 'fake-door-test'],
    ['landing page test', 'landing-page-test'],
    ['what is the pretotyping', 'what-pretotyping'],
    ['feature freeze', 'feature-freeze'],
    ['code freeze', 'code-freeze'],
    ['content freeze', 'content-freeze'],
    ['what is the feature freeze', 'what-feature-freeze'],
    ['hardening sprint', 'hardening-sprint'],
    ['stabilization sprint', 'stabilization-sprint'],
    ['what is the hardening sprint', 'what-hardening-sprint'],
    ['tech debt backlog', 'tech-debt-backlog'],
    ['technical debt backlog', 'technical-debt-backlog'],
    ['what is the tech debt backlog', 'what-tech-debt-backlog'],
    ['research spike', 'research-spike'],
    ['story spike', 'story-spike'],
    ['spike story', 'spike-story'],
    ['what is the research spike', 'what-research-spike'],
    ['architectural runway', 'architectural-runway'],
    ['what is the architectural runway', 'what-architectural-runway'],
    ['enabler story', 'enabler-story'],
    ['enabler stories', 'enabler-stories'],
    ['what is the enabler story', 'what-enabler-story'],
    ['increment goal', 'increment-goal'],
    ['PI objective', 'pi-objective'],
    ['what is the increment goal', 'what-increment-goal'],
    // Natural planner phrasing wave 27 (DORA / DDD / post-mortem / ADRs residual)
    // Bare "post-mortem" / "dora metrics" / "event storming" must hit Owner tick plan.
    // Avoid bare "slo" (San Luis Obispo NON_SF) — full service level objective form.
    ['post-mortem', 'post-mortem'],
    ['post mortem', 'post-mortem-space'],
    ['blameless postmortem', 'blameless-postmortem'],
    ['blameless post-mortem', 'blameless-post-mortem'],
    ['what is the post-mortem', 'what-post-mortem'],
    ['assumption mapping', 'assumption-mapping'],
    ['assumption map', 'assumption-map'],
    ['what is the assumption mapping', 'what-assumption-mapping'],
    ['architecture decision record', 'architecture-decision-record'],
    ['what is the architecture decision record', 'what-architecture-decision-record'],
    ['rfc process', 'rfc-process'],
    ['design doc', 'design-doc'],
    ['tech radar', 'tech-radar'],
    ['what is the tech radar', 'what-tech-radar'],
    ['okrs', 'okrs'],
    ['what are the okrs', 'what-are-okrs'],
    ['key results', 'key-results'],
    ['what are the key results', 'what-key-results'],
    ['event storming', 'event-storming'],
    ['what is the event storming', 'what-event-storming'],
    ['domain driven design', 'domain-driven-design'],
    ['domain-driven design', 'domain-driven-design-hyphen'],
    ['DDD', 'ddd'],
    ['what is the DDD', 'what-ddd'],
    ['bounded context', 'bounded-context'],
    ['what is the bounded context', 'what-bounded-context'],
    ['cqrs', 'cqrs'],
    ['what is the cqrs', 'what-cqrs'],
    ['event sourcing', 'event-sourcing'],
    ['what is the event sourcing', 'what-event-sourcing'],
    ['strangler fig', 'strangler-fig'],
    ['strangler pattern', 'strangler-pattern'],
    ['what is the strangler fig', 'what-strangler-fig'],
    ['trunk based development', 'trunk-based-development'],
    ['trunk-based development', 'trunk-based-development-hyphen'],
    ['what is the trunk based development', 'what-trunk-based-development'],
    ['continuous delivery', 'continuous-delivery'],
    ['continuous deployment', 'continuous-deployment'],
    ['what is the continuous delivery', 'what-continuous-delivery'],
    ['dora metrics', 'dora-metrics'],
    ['four keys', 'four-keys'],
    ['what is the dora', 'what-dora'],
    ['what is the dora metrics', 'what-dora-metrics'],
    ['change fail rate', 'change-fail-rate'],
    ['deployment frequency', 'deployment-frequency'],
    ['what is the change fail rate', 'what-change-fail-rate'],
    ['mean time to recovery', 'mean-time-to-recovery'],
    ['mttr', 'mttr'],
    ['what is the mttr', 'what-mttr'],
    ['toil budget', 'toil-budget'],
    ['error budget', 'error-budget'],
    ['what is the error budget', 'what-error-budget'],
    ['service level objective', 'service-level-objective'],
    ['service level indicator', 'service-level-indicator'],
    ['what is the service level objective', 'what-service-level-objective'],
    // Natural planner phrasing wave 28 (SRE / incident response / DR residual)
    // Bare "site reliability" / "chaos engineering" / "game day" must hit Owner tick plan.
    // Avoid bare "slo" (San Luis Obispo NON_SF).
    ['site reliability', 'site-reliability'],
    ['reliability engineering', 'reliability-engineering'],
    ['what is the site reliability', 'what-site-reliability'],
    ['incident response', 'incident-response'],
    ['what is the incident response', 'what-incident-response'],
    ['chaos engineering', 'chaos-engineering'],
    ['what is the chaos engineering', 'what-chaos-engineering'],
    ['disaster recovery', 'disaster-recovery'],
    ['what is the disaster recovery', 'what-disaster-recovery'],
    ['game day', 'game-day'],
    ['what is the game day', 'what-game-day'],
    ['tabletop exercise', 'tabletop-exercise'],
    ['what is the tabletop exercise', 'what-tabletop-exercise'],
    ['failover plan', 'failover-plan'],
    ['multi-region failover', 'multi-region-failover'],
    ['what is the failover plan', 'what-failover-plan'],
    ['recovery time objective', 'recovery-time-objective'],
    ['recovery point objective', 'recovery-point-objective'],
    ['what is the recovery time objective', 'what-recovery-time-objective'],
    ['mean time between failures', 'mean-time-between-failures'],
    ['mtbf', 'mtbf'],
    ['what is the mtbf', 'what-mtbf'],
    ['five nines', 'five-nines'],
    ['availability target', 'availability-target'],
    ['what is the five nines', 'what-five-nines'],
    ['status page', 'status-page'],
    ['what is the status page', 'what-status-page'],
    ['on-call rotation', 'on-call-rotation'],
    ['pager rotation', 'pager-rotation'],
    ['what is the on-call rotation', 'what-on-call-rotation'],
    ['blameless culture', 'blameless-culture'],
    ['what is the blameless culture', 'what-blameless-culture'],
    ['runbook drill', 'runbook-drill'],
    ['what is the runbook drill', 'what-runbook-drill'],
    // Natural planner phrasing wave 29 (DevOps / CI-CD / GitOps residual)
    // Bare "continuous integration" / "gitops" / "blast radius" must hit Owner tick plan.
    // Avoid bare "ci"/"cd"/"slo" (too short or San Luis Obispo NON_SF).
    ['continuous integration', 'continuous-integration'],
    ['what is the continuous integration', 'what-continuous-integration'],
    ['deployment pipeline', 'deployment-pipeline'],
    ['what is the deployment pipeline', 'what-deployment-pipeline'],
    ['cicd pipeline', 'cicd-pipeline'],
    ['gitops', 'gitops-plan'],
    ['what is the gitops', 'what-gitops'],
    ['infrastructure as code', 'infrastructure-as-code'],
    ['infra as code', 'infra-as-code-plan'],
    ['what is the infrastructure as code', 'what-infrastructure-as-code'],
    ['platform engineering', 'platform-engineering'],
    ['what is the platform engineering', 'what-platform-engineering'],
    ['progressive delivery', 'progressive-delivery'],
    ['what is the progressive delivery', 'what-progressive-delivery'],
    ['blast radius', 'blast-radius'],
    ['what is the blast radius', 'what-blast-radius'],
    ['toil reduction', 'toil-reduction'],
    ['what is the toil reduction', 'what-toil-reduction'],
    ['golden signals', 'golden-signals'],
    ['four golden signals', 'four-golden-signals'],
    ['what is the golden signals', 'what-golden-signals'],
    ['error budget burn', 'error-budget-burn'],
    ['burn rate', 'burn-rate'],
    ['what is the error budget burn', 'what-error-budget-burn'],
    ['alert fatigue', 'alert-fatigue'],
    ['what is the alert fatigue', 'what-alert-fatigue'],
    ['on-call handoff', 'on-call-handoff'],
    ['pager handoff', 'pager-handoff'],
    ['what is the on-call handoff', 'what-on-call-handoff'],
    ['auto remediation', 'auto-remediation'],
    ['self healing', 'self-healing'],
    ['what is the auto remediation', 'what-auto-remediation'],
    ['runbook automation', 'runbook-automation'],
    ['what is the runbook automation', 'what-runbook-automation'],
    ['mean time to detect', 'mean-time-to-detect'],
    ['mttd', 'mttd'],
    ['what is the mttd', 'what-mttd'],
    ['service catalog', 'service-catalog'],
    ['what is the service catalog', 'what-service-catalog'],
    ['rolling update', 'rolling-update'],
    ['canary analysis', 'canary-analysis'],
    ['what is the rolling update', 'what-rolling-update'],
    ['operational excellence', 'operational-excellence'],
    ['what is the operational excellence', 'what-operational-excellence'],
    ['change management', 'change-management'],
    ['release management', 'release-management'],
    ['what is the change management', 'what-change-management'],
    // Natural planner phrasing wave 30 (SecOps / AppSec / MLOps / FinOps residual)
    // Bare "threat model" / "zero trust" / "shift left" must hit Owner tick plan.
    // Avoid bare "qa"/"soc" as planner (too short); co-pilot uses "qa engineer" / "soc".
    ['security posture', 'security-posture'],
    ['what is the security posture', 'what-security-posture'],
    ['threat model', 'threat-model'],
    ['what is the threat model', 'what-threat-model'],
    ['shift left', 'shift-left'],
    ['what is the shift left', 'what-shift-left'],
    ['zero trust', 'zero-trust'],
    ['what is the zero trust', 'what-zero-trust'],
    ['least privilege', 'least-privilege'],
    ['what is the least privilege', 'what-least-privilege'],
    ['defense in depth', 'defense-in-depth'],
    ['what is the defense in depth', 'what-defense-in-depth'],
    ['attack surface', 'attack-surface'],
    ['what is the attack surface', 'what-attack-surface'],
    ['vulnerability management', 'vulnerability-management'],
    ['what is the vulnerability management', 'what-vulnerability-management'],
    ['penetration test', 'penetration-test'],
    ['pen test', 'pen-test'],
    ['what is the penetration test', 'what-penetration-test'],
    ['security review', 'security-review'],
    ['what is the security review', 'what-security-review'],
    ['compliance checklist', 'compliance-checklist'],
    ['what is the compliance checklist', 'what-compliance-checklist'],
    ['data classification', 'data-classification'],
    ['what is the data classification', 'what-data-classification'],
    ['access control', 'access-control'],
    ['what is the access control', 'what-access-control'],
    ['secrets rotation', 'secrets-rotation'],
    ['certificate rotation', 'certificate-rotation'],
    ['what is the secrets rotation', 'what-secrets-rotation'],
    ['supply chain security', 'supply-chain-security'],
    ['what is the supply chain security', 'what-supply-chain-security'],
    ['software bill of materials', 'software-bill-of-materials'],
    ['sbom', 'sbom'],
    ['what is the sbom', 'what-sbom'],
    ['dependency scanning', 'dependency-scanning'],
    ['what is the dependency scanning', 'what-dependency-scanning'],
    ['static analysis', 'static-analysis'],
    ['dynamic analysis', 'dynamic-analysis'],
    ['what is the static analysis', 'what-static-analysis'],
    ['security chaos', 'security-chaos'],
    ['what is the security chaos', 'what-security-chaos'],
    ['finops review', 'finops-review'],
    ['what is the finops review', 'what-finops-review'],
    ['cost allocation', 'cost-allocation'],
    ['what is the cost allocation', 'what-cost-allocation'],
    ['right sizing', 'right-sizing'],
    ['rightsizing', 'rightsizing'],
    ['what is the right sizing', 'what-right-sizing'],
    ['capacity forecasting', 'capacity-forecasting'],
    ['what is the capacity forecasting', 'what-capacity-forecasting'],
    ['mlops pipeline', 'mlops-pipeline'],
    ['what is the mlops pipeline', 'what-mlops-pipeline'],
    ['feature store', 'feature-store'],
    ['what is the feature store', 'what-feature-store'],
    ['model registry', 'model-registry'],
    ['what is the model registry', 'what-model-registry'],
    ['data lineage', 'data-lineage'],
    ['what is the data lineage', 'what-data-lineage'],
    ['observability stack', 'observability-stack'],
    ['what is the observability stack', 'what-observability-stack'],
    ['distributed tracing', 'distributed-tracing'],
    ['what is the distributed tracing', 'what-distributed-tracing'],
    ['log aggregation', 'log-aggregation'],
    ['what is the log aggregation', 'what-log-aggregation'],
    // Natural planner phrasing wave 31 (DevSecOps / NetOps / privacy / GRC residual)
    // Bare "policy as code" / "siem" / "breach response" must hit Owner tick plan.
    // Avoid bare "dpo"/"ciso"/"grc" as planner (too short); co-pilot uses those roles.
    ['policy as code', 'policy-as-code'],
    ['what is the policy as code', 'what-policy-as-code'],
    ['secrets scanning', 'secrets-scanning'],
    ['what is the secrets scanning', 'what-secrets-scanning'],
    ['container security', 'container-security'],
    ['what is the container security', 'what-container-security'],
    ['image scanning', 'image-scanning'],
    ['what is the image scanning', 'what-image-scanning'],
    ['runtime security', 'runtime-security'],
    ['what is the runtime security', 'what-runtime-security'],
    ['zero day response', 'zero-day-response'],
    ['what is the zero day response', 'what-zero-day-response'],
    ['breach response', 'breach-response'],
    ['what is the breach response', 'what-breach-response'],
    ['security questionnaire', 'security-questionnaire'],
    ['what is the security questionnaire', 'what-security-questionnaire'],
    ['soc 2', 'soc-2'],
    ['soc2', 'soc2'],
    ['what is the soc 2', 'what-soc-2'],
    ['iso 27001', 'iso-27001'],
    ['what is the iso 27001', 'what-iso-27001'],
    ['privacy review', 'privacy-review'],
    ['what is the privacy review', 'what-privacy-review'],
    ['data retention policy', 'data-retention-policy'],
    ['what is the data retention policy', 'what-data-retention-policy'],
    ['dpa review', 'dpa-review'],
    ['what is the dpa review', 'what-dpa-review'],
    ['pci compliance', 'pci-compliance'],
    ['what is the pci compliance', 'what-pci-compliance'],
    ['hipaa readiness', 'hipaa-readiness'],
    ['what is the hipaa readiness', 'what-hipaa-readiness'],
    ['bug bounty', 'bug-bounty'],
    ['what is the bug bounty', 'what-bug-bounty'],
    ['responsible disclosure', 'responsible-disclosure'],
    ['what is the responsible disclosure', 'what-responsible-disclosure'],
    ['security champion', 'security-champion'],
    ['what is the security champion', 'what-security-champion'],
    ['threat intel', 'threat-intel'],
    ['threat intelligence', 'threat-intelligence'],
    ['what is the threat intelligence', 'what-threat-intelligence'],
    ['ioc triage', 'ioc-triage'],
    ['what is the ioc triage', 'what-ioc-triage'],
    ['cve triage', 'cve-triage'],
    ['what is the cve triage', 'what-cve-triage'],
    ['patch management', 'patch-management'],
    ['what is the patch management', 'what-patch-management'],
    ['vulnerability triage', 'vulnerability-triage'],
    ['what is the vulnerability triage', 'what-vulnerability-triage'],
    ['waf policy', 'waf-policy'],
    ['what is the waf policy', 'what-waf-policy'],
    ['network segmentation', 'network-segmentation'],
    ['what is the network segmentation', 'what-network-segmentation'],
    ['mfa rollout', 'mfa-rollout'],
    ['what is the mfa rollout', 'what-mfa-rollout'],
    ['sso rollout', 'sso-rollout'],
    ['what is the sso rollout', 'what-sso-rollout'],
    ['identity federation', 'identity-federation'],
    ['what is the identity federation', 'what-identity-federation'],
    ['privileged access', 'privileged-access'],
    ['what is the privileged access', 'what-privileged-access'],
    ['pam review', 'pam-review'],
    ['what is the pam review', 'what-pam-review'],
    ['kubernetes security', 'kubernetes-security'],
    ['what is the kubernetes security', 'what-kubernetes-security'],
    ['pod security', 'pod-security'],
    ['what is the pod security', 'what-pod-security'],
    ['supply chain attack', 'supply-chain-attack'],
    ['what is the supply chain attack', 'what-supply-chain-attack'],
    ['slsa', 'slsa'],
    ['what is the slsa', 'what-slsa'],
    ['code signing', 'code-signing'],
    ['what is the code signing', 'what-code-signing'],
    ['artifact signing', 'artifact-signing'],
    ['what is the artifact signing', 'what-artifact-signing'],
    ['siem', 'siem'],
    ['what is the siem', 'what-siem'],
    ['soar', 'soar'],
    ['what is the soar', 'what-soar'],
    ['cspm', 'cspm'],
    ['what is the cspm', 'what-cspm'],
    ['cnapp', 'cnapp'],
    ['what is the cnapp', 'what-cnapp'],
    ['tabletop security', 'tabletop-security'],
    ['what is the tabletop security', 'what-tabletop-security'],
    ['iam review', 'iam-review'],
    ['what is the iam review', 'what-iam-review'],
    // Natural planner phrasing wave 32 (data platform / analytics / GTM ops residual)
    // Bare "data pipeline" / "etl pipeline" / "dbt project" must hit Owner tick plan.
    // Avoid bare "etl"/"dbt"/"bi" as planner (too short); co-pilot uses full role names.
    ['data pipeline', 'data-pipeline'],
    ['what is the data pipeline', 'what-data-pipeline'],
    ['etl pipeline', 'etl-pipeline'],
    ['what is the etl pipeline', 'what-etl-pipeline'],
    ['analytics stack', 'analytics-stack'],
    ['what is the analytics stack', 'what-analytics-stack'],
    ['data warehouse', 'data-warehouse'],
    ['what is the data warehouse', 'what-data-warehouse'],
    ['data lake', 'data-lake'],
    ['what is the data lake', 'what-data-lake'],
    ['metrics layer', 'metrics-layer'],
    ['what is the metrics layer', 'what-metrics-layer'],
    ['semantic layer', 'semantic-layer'],
    ['what is the semantic layer', 'what-semantic-layer'],
    ['dbt project', 'dbt-project'],
    ['what is the dbt project', 'what-dbt-project'],
    ['airflow dag', 'airflow-dag'],
    ['what is the airflow dag', 'what-airflow-dag'],
    ['spark job', 'spark-job'],
    ['what is the spark job', 'what-spark-job'],
    ['feature engineering', 'feature-engineering'],
    ['what is the feature engineering', 'what-feature-engineering'],
    ['data quality', 'data-quality'],
    ['what is the data quality', 'what-data-quality'],
    ['data contracts', 'data-contracts'],
    ['what is the data contracts', 'what-data-contracts'],
    ['cdc pipeline', 'cdc-pipeline'],
    ['what is the cdc pipeline', 'what-cdc-pipeline'],
    ['reverse etl', 'reverse-etl'],
    ['what is the reverse etl', 'what-reverse-etl'],
    ['funnel analysis', 'funnel-analysis'],
    ['what is the funnel analysis', 'what-funnel-analysis'],
    ['cohort analysis', 'cohort-analysis'],
    ['what is the cohort analysis', 'what-cohort-analysis'],
    ['product analytics', 'product-analytics'],
    ['what is the product analytics', 'what-product-analytics'],
    ['tracking plan', 'tracking-plan'],
    ['what is the tracking plan', 'what-tracking-plan'],
    ['instrumentation plan', 'instrumentation-plan'],
    ['what is the instrumentation plan', 'what-instrumentation-plan'],
    ['event taxonomy', 'event-taxonomy'],
    ['what is the event taxonomy', 'what-event-taxonomy'],
    ['capacity planning', 'capacity-planning'],
    ['what is the capacity planning', 'what-capacity-planning'],
    ['data mesh', 'data-mesh'],
    ['what is the data mesh', 'what-data-mesh'],
    ['lakehouse', 'lakehouse'],
    ['what is the lakehouse', 'what-lakehouse'],
    ['medallion architecture', 'medallion-architecture'],
    ['what is the medallion architecture', 'what-medallion'],
    ['streaming pipeline', 'streaming-pipeline'],
    ['what is the streaming pipeline', 'what-streaming-pipeline'],
    ['batch pipeline', 'batch-pipeline'],
    ['what is the batch pipeline', 'what-batch-pipeline'],
    ['data catalog', 'data-catalog'],
    ['what is the data catalog', 'what-data-catalog'],
    ['data governance', 'data-governance'],
    ['what is the data governance', 'what-data-governance'],
    ['master data management', 'master-data-management'],
    ['what is the master data management', 'what-master-data'],
    ['customer data platform', 'customer-data-platform'],
    ['what is the customer data platform', 'what-cdp'],
    ['attribution model', 'attribution-model'],
    ['what is the attribution model', 'what-attribution-model'],
    ['experimentation platform', 'experimentation-platform'],
    ['what is the experimentation platform', 'what-experimentation-platform'],
    // Natural planner phrasing wave 33 (people/talent/design/community/brand · demand gen residual)
    // Bare "demand gen plan" / "talent pipeline" / "design system" must hit Owner tick plan.
    // Avoid bare "abm"/"pmm"/"nps" as planner (too short); co-pilot uses those roles.
    ['demand gen plan', 'demand-gen-plan'],
    ['what is the demand gen', 'what-demand-gen'],
    ['demand generation', 'demand-generation'],
    ['what is the demand generation', 'what-demand-generation'],
    ['lifecycle marketing', 'lifecycle-marketing'],
    ['what is the lifecycle marketing', 'what-lifecycle-marketing'],
    ['abm program', 'abm-program'],
    ['what is the abm program', 'what-abm-program'],
    ['account based marketing', 'account-based-marketing'],
    ['what is the account-based marketing', 'what-account-based-marketing'],
    ['crm hygiene', 'crm-hygiene'],
    ['what is the crm hygiene', 'what-crm-hygiene'],
    ['sales pipeline review', 'sales-pipeline-review'],
    ['what is the sales pipeline review', 'what-sales-pipeline-review'],
    ['product marketing plan', 'product-marketing-plan'],
    ['what is the product marketing plan', 'what-product-marketing-plan'],
    ['community calendar', 'community-calendar'],
    ['what is the community calendar', 'what-community-calendar'],
    ['brand system', 'brand-system'],
    ['what is the brand system', 'what-brand-system'],
    ['design system', 'design-system'],
    ['what is the design system', 'what-design-system'],
    ['talent pipeline', 'talent-pipeline'],
    ['what is the talent pipeline', 'what-talent-pipeline'],
    ['hiring plan', 'hiring-plan'],
    ['what is the hiring plan', 'what-hiring-plan'],
    ['people ops roadmap', 'people-ops-roadmap'],
    ['what is the people ops roadmap', 'what-people-ops-roadmap'],
    ['recruiting funnel', 'recruiting-funnel'],
    ['what is the recruiting funnel', 'what-recruiting-funnel'],
    ['employee experience', 'employee-experience'],
    ['what is the employee experience', 'what-employee-experience'],
    ['employer branding', 'employer-branding'],
    ['what is the employer branding', 'what-employer-branding'],
    ['partnership pipeline', 'partnership-pipeline'],
    ['what is the partnership pipeline', 'what-partnership-pipeline'],
    ['channel strategy', 'channel-strategy'],
    ['what is the channel strategy', 'what-channel-strategy'],
    ['editorial calendar', 'editorial-calendar'],
    ['what is the editorial calendar', 'what-editorial-calendar'],
    ['content calendar', 'content-calendar'],
    ['what is the content calendar', 'what-content-calendar'],
    ['gtm motion', 'gtm-motion'],
    ['what is the gtm motion', 'what-gtm-motion'],
    ['go to market motion', 'go-to-market-motion'],
    ['what is the go-to-market motion', 'what-go-to-market-motion'],
    ['sales playbook', 'sales-playbook'],
    ['what is the sales playbook', 'what-sales-playbook'],
    ['win/loss analysis', 'win-loss-analysis'],
    ['what is the win/loss analysis', 'what-win-loss-analysis'],
    ['icp definition', 'icp-definition'],
    ['what is the icp definition', 'what-icp-definition'],
    ['persona map', 'persona-map'],
    ['what is the persona map', 'what-persona-map'],
    ['messaging house', 'messaging-house'],
    ['what is the messaging house', 'what-messaging-house'],
    ['brand guidelines', 'brand-guidelines'],
    ['what is the brand guidelines', 'what-brand-guidelines'],
    ['style guide', 'style-guide'],
    ['what is the style guide', 'what-style-guide'],
    ['design tokens', 'design-tokens'],
    ['what is the design tokens', 'what-design-tokens'],
    ['component library', 'component-library'],
    ['what is the component library', 'what-component-library'],
    ['figma library', 'figma-library'],
    ['what is the figma library', 'what-figma-library'],
    ['community health', 'community-health'],
    ['what is the community health', 'what-community-health'],
    ['nps program', 'nps-program'],
    ['what is the nps program', 'what-nps-program'],
    ['csat survey', 'csat-survey'],
    ['what is the csat survey', 'what-csat-survey'],
    ['onboarding program', 'onboarding-program'],
    ['what is the onboarding program', 'what-onboarding-program'],
    ['offboarding checklist', 'offboarding-checklist'],
    ['what is the offboarding checklist', 'what-offboarding-checklist'],
    ['performance cycle', 'performance-cycle'],
    ['what is the performance cycle', 'what-performance-cycle'],
    ['comp review', 'comp-review'],
    ['what is the comp review', 'what-comp-review'],
    ['headcount plan', 'headcount-plan'],
    ['what is the headcount plan', 'what-headcount-plan'],
    ['org design', 'org-design'],
    ['what is the org design', 'what-org-design'],
    ['succession plan', 'succession-plan'],
    ['what is the succession plan', 'what-succession-plan'],
    // Natural planner phrasing wave 34 (fundraising/IR/board/finance residual)
    // Bare "fundraising plan" / "investor update" / "board deck" must hit Owner tick plan.
    // Avoid bare "ir"/"bd"/"qbr" as planner (too short); co-pilot uses full role names.
    ['fundraising plan', 'fundraising-plan'],
    ['what is the fundraising plan', 'what-fundraising-plan'],
    ['investor update', 'investor-update'],
    ['what is the investor update', 'what-investor-update'],
    ['board deck', 'board-deck'],
    ['what is the board deck', 'what-board-deck'],
    ['board pack', 'board-pack'],
    ['what is the board pack', 'what-board-pack'],
    ['board meeting', 'board-meeting'],
    ['what is the board meeting', 'what-board-meeting'],
    ['cash runway', 'cash-runway'],
    ['what is the cash runway', 'what-cash-runway'],
    ['unit economics', 'unit-economics'],
    ['what is the unit economics', 'what-unit-economics'],
    ['ltv cac', 'ltv-cac'],
    ['what is the ltv cac', 'what-ltv-cac'],
    ['pitch deck', 'pitch-deck'],
    ['what is the pitch deck', 'what-pitch-deck'],
    ['cap table', 'cap-table'],
    ['what is the cap table', 'what-cap-table'],
    ['fpa model', 'fpa-model'],
    ['what is the fpa model', 'what-fpa-model'],
    ['fp&a model', 'fp-and-a-model'],
    ['what is the fp&a model', 'what-fp-and-a-model'],
    ['forecast call', 'forecast-call'],
    ['what is the forecast call', 'what-forecast-call'],
    ['meddic', 'meddic'],
    ['what is the meddic', 'what-meddic'],
    ['qbr plan', 'qbr-plan'],
    ['what is the qbr plan', 'what-qbr-plan'],
    ['mutual action plan', 'mutual-action-plan'],
    ['what is the mutual action plan', 'what-mutual-action-plan'],
    ['voice of customer', 'voice-of-customer'],
    ['what is the voice of customer', 'what-voice-of-customer'],
    ['user research plan', 'user-research-plan'],
    ['what is the user research plan', 'what-user-research-plan'],
    ['annual planning', 'annual-planning'],
    ['what is the annual planning', 'what-annual-planning'],
    ['pricing strategy', 'pricing-strategy'],
    ['what is the pricing strategy', 'what-pricing-strategy'],
    ['commission plan', 'commission-plan'],
    ['what is the commission plan', 'what-commission-plan'],
    ['deal review', 'deal-review'],
    ['what is the deal review', 'what-deal-review'],
    ['customer advisory board', 'customer-advisory-board'],
    ['what is the customer advisory board', 'what-customer-advisory-board'],
    ['term sheet', 'term-sheet'],
    ['what is the term sheet', 'what-term-sheet'],
    ['fundraise pipeline', 'fundraise-pipeline'],
    ['what is the fundraise pipeline', 'what-fundraise-pipeline'],
    ['investor pipeline', 'investor-pipeline'],
    ['what is the investor pipeline', 'what-investor-pipeline'],
    ['burn multiple', 'burn-multiple'],
    ['what is the burn multiple', 'what-burn-multiple'],
    ['gross margin', 'gross-margin'],
    ['what is the gross margin', 'what-gross-margin'],
    ['contribution margin', 'contribution-margin'],
    ['what is the contribution margin', 'what-contribution-margin'],
    ['payback period', 'payback-period'],
    ['what is the payback period', 'what-payback-period'],
    ['sales territory', 'sales-territory'],
    ['what is the sales territory', 'what-sales-territory'],
    ['quota plan', 'quota-plan'],
    ['what is the quota plan', 'what-quota-plan'],
    ['pipeline hygiene', 'pipeline-hygiene'],
    ['what is the pipeline hygiene', 'what-pipeline-hygiene'],
    ['discovery call', 'discovery-call'],
    ['what is the discovery call', 'what-discovery-call'],
    ['demo script', 'demo-script'],
    ['what is the demo script', 'what-demo-script'],
    ['packaging strategy', 'packaging-strategy'],
    ['what is the packaging strategy', 'what-packaging-strategy'],
    ['budget cycle', 'budget-cycle'],
    ['what is the budget cycle', 'what-budget-cycle'],
    ['p&l review', 'pnl-review'],
    ['what is the p&l review', 'what-pnl-review'],
    ['cost center', 'cost-center'],
    ['what is the cost center', 'what-cost-center'],
    ['seed round plan', 'seed-round-plan'],
    ['what is the seed round plan', 'what-seed-round-plan'],
    ['series a plan', 'series-a-plan'],
    ['what is the series a plan', 'what-series-a-plan'],
    ['convertible note', 'convertible-note'],
    ['what is the convertible note', 'what-convertible-note'],
    ['safe note', 'safe-note'],
    ['what is the safe note', 'what-safe-note'],
  ]) {
    const natChat = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-tick-nat-' + tag,
    });
    ok(
      natChat.ok && /Owner tick plan|Pipeline:/i.test(natChat.reply || ''),
      tag + ' tick plan: ' + (natChat.reply || '').slice(0, 100),
    );
    ok(!natChat.driven?.stage, tag + ' no drive');
    ok(!natChat.driven?.advanced, tag + ' no advance');
    ok(/San Francisco/i.test(natChat.reply || ''), tag + ' SF');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(natChat.reply || ''),
      tag + ' no fake RSVPs',
    );
    // Gate/advance/unlock/blocker/stuck phrasing must surface open|held (not silent generic)
    if (
      /gate|advance|unlock|blocker|holding|bottleneck|blocked|hold up|stuck|move forward|critical path|critical chain|stopping|unblocked|stage ready|waiting for|waiting on|stage.?up|go.?no.?go|path forward|unblocks?|definition of ready|definition of go|readiness|clear the stage|walk the gate|green light|red flags?|kill criteria|kill switch|go gate|go criteria|no-?go criteria|cut line|freeze list|preflight|mission order|ops stack|execution order|load order|battle rhythm|dependency chain|dependency graph|dependency tree|hot path|triage order|escalation path|release train|burndown|burn down|choke point|workstream|critical thread|owner loop|pull order|commit order|gate map|owner cadence|drumbeat|throttle|serial path|force rank|run of show|cue sheet|day-?of stack|show flow|next gate|stage ladder|advance ladder|constraint board|risk board|kill map|load-?in|load-?out|strike plan|work breakdown|commit stack|pull sequence|go chain|serial stack|owner thread|action stack|force order|pre-?show order|tech order|call order|readiness ladder|path to green|path of least resistance|theory of constraints|bottleneck analysis|night brief|build order|war room|capacity plan|north star|main effort|commander|force next|commit next|marching|standing order|p0|priority one|status report|left to do|get there|acceptance criteria|when are we ready|ready when|sprint goal|ooda|shipping plan|one thing|on the plate|mission for|focus area|jtbd|jobs? to be done|success criteria|leverage point|force multiplier|next best action|nba|plan of record|highest leverage|immediate next|critical next|ship today|ships first|today'?s focus|80\/20|pareto|thinnest slice|smallest next|order of execution|execution sequence|first in line|top of the board|top card|lead item|deserves attention|decision criteria|milestone|checkpoint|key result|okr|wip limit|ship blockers?|blocking shipping|first domino|keystone|unlocking move|where do we start|starting point|operating model|optimizing for|single next action|in what order|what order|forcing function|daci|moscow|flywheel|wedge|beachhead|one[- ]?pager|stand[- ]?up summary|compounder|eisenhower|2x2|impact.?effort|rice|ice score|sequencing|pre[- ]?mortem|post[- ]?mortem|risk register|raid|single[- ]?threaded|dri|timebox|most important task|\bmit\b|big rocks?|eat the frog|frogs? first|gtd|getting things done|decision log|prioritization stack|stack rank|sop|standard operating|playbook order|go book|options matrix|tradeoff|dependency order|omtm|one metric|capacity for|kill switch order|decision tree|ivy lee|checklist order|whats the plan|whats the|swot|pestle|pdca|plan do check|a3|five whys|5 whys|root cause|rca|fishbone|ishikawa|now next later|priority matrix|decision matrix|weighted scoring|pick chart|smart goals|critical success|csf|mece|scqa|issue tree|hypothesis tree|driver tree|pyramid|first principles|inversion|second order|ladder of inference|story map|rasci|okr cascade|force field|cynefin|wardley|kano|impact mapping|story mapping|riskiest assumption|assumption map|lean canvas|business model canvas|value proposition|opportunity solution|capability map|okr tree|service blueprint|journey map|event canvas|theory of change|logic model|rapid|north[- ]?star metric|after[- ]?action|aar|sitrep|situation report|battle map|pert|cpm|critical path method|scrum of scrums|push system|pull system|five focusing|goldratt|drum.?buffer|what is the buffer|agent doing|bot doing|stakeholder map|empathy map|raci|sipoc|dmaic|5s|kaizen|hoshin|catchball|andon|gemba|control chart|spaghetti|standard work|heijunka|jidoka|poka.?yoke|throughput|wip|cadence|operating cadence|decision rights|escalation ladder|communication plan|stakeholder plan|wbs|work breakdown|critical chain|iron triangle|triple constraint|scope triangle|value stream|swimlane|swim.?lane|process map|dependency map|risk matrix|change control|ccb|common operating picture|\bcop\b|opord|five paragraph|frago|warnord|mett.?tc|mdmp|incident command|\bics\b|gold command|silver command|bronze command|gantt|scope creep|aarrr|pirate metrics|growth loop|activation funnel|retention loop|heart framework|phase gate|phase.?gate|tollgate|toll.?gate|earned value|evm|cost performance|schedule performance|schedule compression|schedule crashing|crashing the schedule|fast tracking|resource leveling|resource smoothing|total float|free float|power interest|responsibility matrix|quality gate|benefits realization|pi planning|program increment|safe framework|scrumban|product backlog|sprint backlog|configuration management|lessons learned|baseline schedule|schedule baseline|change request|monte carlo|rolling wave|forward pass|backward pass|early start|late start|early finish|late finish|slack time|network diagram|precedence diagram|activity on node|aon|organizational breakdown|\bobs\b|resource histogram|crashing analysis|parametric|analogous|three.?point|s.?curve|earned schedule|tcpi|to complete performance|control account|planning package|budget at completion|estimate at completion|estimate to complete|variance at completion|\bbac\b|\beac\b|\betc\b|\bvac\b|cost variance|schedule variance|spi trend|cpi trend|wsjf|weighted shortest|cost of delay|\bcd3\b|story points?|planning poker|sprint velocity|team velocity|what is the velocity|backlog refinement|backlog grooming|sprint planning|sprint review|sprint retrospective|daily standup|daily scrum|burnup|burn.?up|cumulative flow|\bcfd\b|cycle time|lead time|little.?s law|kanban board|class of service|service level expectation|\bsle\b|dual.?track|continuous discovery|program board|experiment backlog|opportunity backlog|spotify model|squad model|tribe model|build.?measure.?learn|bml loop|validated learning|innovation accounting|problem.?solution fit|product.?market fit|\bpmf\b|working backwards|working backward|press release method|pr.?faq|customer development|lean startup|smoke test|concierge mvp|wizard of oz|pretotype|pretotyping|fake door test|landing page test|feature freeze|code freeze|content freeze|hardening sprint|stabilization sprint|tech debt backlog|technical debt backlog|research spike|story spike|spike story|architectural runway|enabler stor|increment goal|pi objective|post.?mortem|blameless post|assumption map|architecture decision|rfc process|design doc|tech radar|\bokrs\b|key results|event storming|domain.?driven|ddd|bounded context|\bcqrs\b|event sourcing|strangler|trunk.?based|continuous delivery|continuous deployment|dora|four keys|change fail rate|deployment frequency|mean time to recovery|\bmttr\b|toil budget|error budget|service level objective|service level indicator|site reliability|reliability engineering|incident response|chaos engineering|disaster recovery|game day|tabletop exercise|failover plan|multi.?region failover|recovery time objective|recovery point objective|mean time between failures|\bmtbf\b|five nines|availability target|status page|on.?call rotation|pager rotation|blameless culture|runbook drill|continuous integration|deployment pipeline|cicd pipeline|gitops|infrastructure as code|infra as code|platform engineering|progressive delivery|blast radius|toil reduction|golden signals|error budget burn|burn rate|alert fatigue|on.?call handoff|pager handoff|auto.?remediation|self.?healing|runbook automation|mean time to detect|\bmttd\b|service catalog|rolling update|canary analysis|operational excellence|change management|release management|security posture|threat model|shift left|zero trust|least privilege|defense in depth|attack surface|vulnerability management|penetration test|pen test|security review|compliance checklist|data classification|access control|secrets rotation|certificate rotation|supply chain security|software bill of materials|\bsbom\b|dependency scanning|static analysis|dynamic analysis|security chaos|finops review|cost allocation|right.?sizing|capacity forecasting|mlops pipeline|feature store|model registry|data lineage|observability stack|distributed tracing|log aggregation|policy as code|secrets scanning|container security|image scanning|runtime security|zero.?day response|breach response|security questionnaire|soc.?2|iso.?27001|privacy review|data retention|dpa review|pci compliance|hipaa readiness|bug bounty|responsible disclosure|security champion|threat intel|ioc triage|cve triage|patch management|vulnerability triage|waf policy|network segmentation|mfa rollout|sso rollout|identity federation|privileged access|pam review|kubernetes security|pod security|supply chain attack|slsa|code signing|artifact signing|siem|soar|cspm|cnapp|tabletop security|iam review|data pipeline|etl pipeline|analytics stack|data warehouse|data lake|metrics layer|semantic layer|dbt project|airflow dag|spark job|feature engineering|data quality|data contracts?|cdc pipeline|reverse etl|funnel analysis|cohort analysis|product analytics|tracking plan|instrumentation plan|event taxonomy|capacity planning|data mesh|lakehouse|medallion architecture|streaming pipeline|batch pipeline|data catalog|data governance|master data management|customer data platform|attribution model|experimentation platform|demand gen|demand generation|lifecycle marketing|abm program|account.?based marketing|crm hygiene|sales pipeline review|product marketing plan|community calendar|brand system|design system|talent pipeline|hiring plan|people ops roadmap|recruiting funnel|employee experience|employer branding|partnership pipeline|channel strategy|editorial calendar|content calendar|gtm motion|go.?to.?market motion|sales playbook|win.?loss analysis|icp definition|persona map|messaging house|brand guidelines|style guide|design tokens|component library|figma library|community health|nps program|csat survey|onboarding program|offboarding checklist|performance cycle|comp review|headcount plan|org design|succession plan|fundraising plan|investor update|board deck|board pack|board meeting|cash runway|unit economics|ltv cac|pitch deck|cap table|fpa model|fp&a model|forecast call|meddic|qbr plan|mutual action plan|voice of customer|user research plan|annual planning|pricing strategy|commission plan|deal review|customer advisory board|term sheet|fundraise pipeline|investor pipeline|burn multiple|gross margin|contribution margin|payback period|sales territory|quota plan|pipeline hygiene|discovery call|demo script|packaging strategy|budget cycle|p&l review|pnl review|cost center|seed round plan|series a plan|convertible note|safe note|fundraising ops|investor relations|board ops|field marketing|event marketing|bizdev|business development|corp dev|corporate development|finance ops|founder ops|venture ops|special projects|office ops|facilities ops|vendor ops|procurement|capital markets/i.test(
        phrase,
      )
    ) {
      ok(
        /gate open|gate held|Pipeline:|I'll /i.test(natChat.reply || ''),
        tag + ' gate/plan voice: ' + (natChat.reply || '').slice(0, 120),
      );
    }
  }
  // Co-pilot: "just my assistant for hosting" must reclaim (not generic lifecycle)
  const justAssistChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'you are just my assistant for hosting' }],
    ip: 'selftest-just-assist-host',
  });
  ok(
    justAssistChat.ok &&
      /organizer of record|not.*host co-pilot|I drive/i.test(justAssistChat.reply || ''),
    'just-assistant-host reclaim: ' + (justAssistChat.reply || '').slice(0, 100),
  );
  ok(!/^I drove/i.test(justAssistChat.reply || ''), 'just-assistant-host no drive lead');
  ok(!justAssistChat.driven?.stage, 'just-assistant-host no drive');
  ok(/I'll |Next:|Pipeline:/i.test(justAssistChat.reply || ''), 'just-assistant-host surfaces plan');
  const drainChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'drain the queue' }],
    ip: 'selftest-drain-ask',
  });
  ok(
    drainChat.ok && /Owner tick plan|draft drain|I'll |Next:/i.test(drainChat.reply || ''),
    'drain-queue tick plan voice: ' + (drainChat.reply || '').slice(0, 100),
  );
  ok(!/^I drove/i.test(drainChat.reply || ''), 'drain-queue no drive spin');
  ok(!drainChat.driven?.stage, 'drain-queue no drive payload');

  // Broader agent-tick planning phrases (read-only plan surface, no drive)
  const pipelineChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'show me the pipeline' }],
    ip: 'selftest-pipeline-ask',
  });
  ok(
    pipelineChat.ok && /Owner tick plan|Pipeline:/i.test(pipelineChat.reply || ''),
    'pipeline ask tick plan: ' + (pipelineChat.reply || '').slice(0, 100),
  );
  ok(!pipelineChat.driven?.stage, 'pipeline ask no drive');
  ok(/San Francisco/i.test(pipelineChat.reply || ''), 'pipeline ask SF');
  const agentPlanChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'what is the agent planning' }],
    ip: 'selftest-agent-planning',
  });
  ok(
    agentPlanChat.ok && /Owner tick plan|Pipeline:|I'll /i.test(agentPlanChat.reply || ''),
    'agent-planning voice: ' + (agentPlanChat.reply || '').slice(0, 100),
  );
  ok(!agentPlanChat.driven?.stage, 'agent-planning no drive');
  // "what will you drive next" used to false-positive drive_cycle — plan surface only
  const willDriveChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'what will you drive next' }],
    ip: 'selftest-will-drive-plan',
  });
  ok(
    willDriveChat.ok && /Owner tick plan|Pipeline:|I'll |Next:/i.test(willDriveChat.reply || ''),
    'will-drive-next plan surface: ' + (willDriveChat.reply || '').slice(0, 100),
  );
  ok(!willDriveChat.driven?.stage, 'will-drive-next no drive spin');
  ok(!/^I drove/i.test(willDriveChat.reply || ''), 'will-drive-next no I-drove lead');
  ok(
    !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(willDriveChat.reply || ''),
    'will-drive-next no fake RSVPs',
  );
  const ownerStepsChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'owner next steps' }],
    ip: 'selftest-owner-next-steps',
  });
  ok(
    ownerStepsChat.ok && /Owner tick plan|Pipeline:|I'll /i.test(ownerStepsChat.reply || ''),
    'owner-next-steps tick plan: ' + (ownerStepsChat.reply || '').slice(0, 100),
  );
  ok(!ownerStepsChat.driven?.stage, 'owner-next-steps no drive');

  // Broader natural tick-plan phrasing (agent do-next / planning / pipeline position)
  const agentDoNextChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'what should the agent do next' }],
    ip: 'selftest-agent-do-next',
  });
  ok(
    agentDoNextChat.ok && /Owner tick plan|Pipeline:|I'll /i.test(agentDoNextChat.reply || ''),
    'agent-do-next tick plan: ' + (agentDoNextChat.reply || '').slice(0, 100),
  );
  ok(!agentDoNextChat.driven?.stage, 'agent-do-next no drive');
  ok(/San Francisco/i.test(agentDoNextChat.reply || ''), 'agent-do-next SF');
  ok(
    !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(agentDoNextChat.reply || ''),
    'agent-do-next no fake RSVPs',
  );
  const planningNextChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'what are you planning next' }],
    ip: 'selftest-planning-next',
  });
  ok(
    planningNextChat.ok && /Owner tick plan|Pipeline:|I'll /i.test(planningNextChat.reply || ''),
    'planning-next tick plan: ' + (planningNextChat.reply || '').slice(0, 100),
  );
  ok(!planningNextChat.driven?.stage, 'planning-next no drive');
  const nextInPipeChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'what is next in the pipeline' }],
    ip: 'selftest-next-in-pipeline',
  });
  ok(
    nextInPipeChat.ok && /Owner tick plan|Pipeline:/i.test(nextInPipeChat.reply || ''),
    'next-in-pipeline tick plan: ' + (nextInPipeChat.reply || '').slice(0, 100),
  );
  ok(!nextInPipeChat.driven?.stage, 'next-in-pipeline no drive');
  // How will you plan this tick — plan surface, not drive
  const howPlanTickChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'how will you plan this tick' }],
    ip: 'selftest-how-plan-tick',
  });
  ok(
    howPlanTickChat.ok && /Owner tick plan|Pipeline:|I'll /i.test(howPlanTickChat.reply || ''),
    'how-plan-tick voice: ' + (howPlanTickChat.reply || '').slice(0, 100),
  );
  ok(!howPlanTickChat.driven?.stage, 'how-plan-tick no drive');
  // Status multi-step → numbered Pipeline (agent tick planning voice)
  if ((statusChat.plan?.next || []).length >= 2) {
    ok(
      /Pipeline:\s*\(1\)|Then:|I'll /i.test(statusChat.reply || ''),
      'status numbered or plan pipeline: ' + (statusChat.reply || '').slice(0, 100),
    );
  }
  // readyToAdvance → tick plan / status gate open (named target when known)
  if (tickPlanChat.plan?.readyToAdvance) {
    ok(
      /gate open|I'll advance|I'll seed|Stage gate/i.test(tickPlanChat.reply || ''),
      'tick plan gate when readyToAdvance: ' + (tickPlanChat.reply || '').slice(0, 120),
    );
    if (tickPlanChat.plan.advanceTarget) {
      const tgt = String(tickPlanChat.plan.advanceTarget).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      ok(
        new RegExp('gate open\\s*→\\s*\\*\\*' + tgt + '\\*\\*|I.ll advance to ' + tgt, 'i').test(
          tickPlanChat.reply || '',
        ),
        'tick plan names gate target ' +
          tickPlanChat.plan.advanceTarget +
          ': ' +
          (tickPlanChat.reply || '').slice(0, 140),
      );
      ok(
        typeof tickPlanChat.plan.advanceTarget === 'string' &&
          tickPlanChat.plan.advanceTarget.length > 0,
        'tick plan payload advanceTarget: ' + tickPlanChat.plan.advanceTarget,
      );
    }
    // Pipeline draft-drain → no duplicate "Top draft drain" noise on tick-plan surface
    if (
      Array.isArray(tickPlanChat.plan.next) &&
      tickPlanChat.plan.next.some((n) => /draft-drain/i.test(n || ''))
    ) {
      ok(
        !/Top draft drain:/i.test(tickPlanChat.reply || ''),
        'tick plan no Top draft drain when Pipeline has draft-drain',
      );
    }
  }

  // Owner focus / stage gate / primary next / unlock · next-move → same read-only tick-plan surface
  for (const [phrase, tag] of [
    ['owner focus', 'owner-focus'],
    ['stage gate', 'stage-gate'],
    ['what is the primary next', 'primary-next'],
    ['ready to advance', 'ready-to-advance'],
    ["what's blocking advance", 'blocking-advance'],
    ['can we advance', 'can-we-advance'],
    ['what unlocks the gate', 'unlocks-gate'],
    // Unlock / holding-gate / next-move phrases (were falling through to generic lifecycle)
    ['what is the unlock', 'what-is-unlock'],
    ['show me the unlock', 'show-unlock'],
    ['unlock the stage', 'unlock-stage'],
    ['how do I unlock advance', 'how-unlock'],
    ["what's holding the gate", 'holding-gate'],
    ['agent next move', 'agent-next-move'],
    ['order of operations this tick', 'order-of-ops'],
    // Short gate/queue planner phrasing (owner voice tick planning)
    ['gate status', 'gate-status-loop'],
    ['what is holding us back', 'holding-us-back-loop'],
    ['unlock criteria', 'unlock-criteria'],
    ['top of the queue', 'top-of-queue'],
    // Wave-3 gate/stuck/queue (same held unlock lead)
    ['what is the bottleneck', 'bottleneck-loop'],
    ['can we move forward', 'move-forward-loop'],
    ['conditions to advance', 'conditions-advance-loop'],
    ['work the queue', 'work-queue-loop'],
    // Wave-4 gate/unlock/stage planner (same held unlock lead · no invent RSVPs)
    ['status of the gate', 'status-of-gate-loop'],
    ['gate check', 'gate-check-loop'],
    ["what's stopping advance", 'stopping-advance-loop'],
    ['what clears the gate', 'clears-gate-loop'],
    ['unlock path', 'unlock-path-loop'],
    ['when do we advance', 'when-advance-loop'],
    ['get us unblocked', 'get-unblocked-loop'],
    ['what am I waiting for', 'waiting-for-loop'],
    // Wave-5 gate/criteria/unblock (same held unlock lead · no invent RSVPs)
    ['are we unblocked', 'are-unblocked-loop'],
    ['is advance blocked', 'is-advance-blocked-loop'],
    ['what holds the gate', 'holds-gate-loop'],
    ['advance criteria', 'advance-criteria-loop'],
    ['stage unlock', 'stage-unlock-loop'],
    ['exit criteria', 'exit-criteria-loop'],
    ['gate unlock status', 'gate-unlock-status-loop'],
    ['primary unlock', 'primary-unlock-loop'],
    // Wave-6 gate/stage-up/go-no-go (same held unlock lead · no invent RSVPs)
    ['walk the gate', 'walk-gate-loop'],
    ['gate walkthrough', 'gate-walkthrough-loop'],
    ['stage-up check', 'stage-up-check-loop'],
    ['can we stage up', 'can-stage-up-loop'],
    ['readiness for advance', 'readiness-advance-loop'],
    ['go no go for advance', 'go-no-go-loop'],
    ['what unblocks advance', 'unblocks-advance-loop'],
    ['unblock criteria', 'unblock-criteria-loop'],
    ['definition of ready', 'def-ready-loop'],
    ['what is left before advance', 'left-before-advance-loop'],
    ['pre-advance checklist', 'pre-advance-loop'],
  ]) {
    const gChat = await eventsBotChat({
      messages: [{ role: 'user', content: phrase }],
      ip: 'selftest-gate-' + tag,
    });
    ok(
      gChat.ok && /Owner tick plan|Pipeline:|I'll |gate open|gate held/i.test(gChat.reply || ''),
      tag + ' tick plan: ' + (gChat.reply || '').slice(0, 100),
    );
    ok(!gChat.driven?.stage, tag + ' no drive');
    ok(/San Francisco/i.test(gChat.reply || ''), tag + ' SF');
    ok(
      !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(gChat.reply || ''),
      tag + ' no fake RSVPs',
    );
    // Always surface gate open|held on tick-plan lead (never silent)
    ok(
      /gate open|gate held/i.test(gChat.reply || ''),
      tag + ' gate status voice: ' + (gChat.reply || '').slice(0, 120),
    );
    if (gChat.plan?.gateStatus) {
      ok(
        gChat.plan.gateStatus === 'open' || gChat.plan.gateStatus === 'held',
        tag + ' plan.gateStatus: ' + gChat.plan.gateStatus,
      );
      if (gChat.plan.gateStatus === 'held') {
        ok(/gate held/i.test(gChat.reply || ''), tag + ' held surface matches plan');
      }
      if (gChat.plan.gateStatus === 'open' && gChat.plan.advanceTarget) {
        ok(
          /gate open/i.test(gChat.reply || ''),
          tag + ' open surface matches plan',
        );
      }
    }
  }

  // Synth: gate held plan stage (artifacts missing) → chat names gate held + no advance claim
  {
    const heldStore = {
      activeEvent: {
        id: 'evt_gate_held',
        title: 'Gate Held Night',
        stage: 'plan',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: {
          name: 'Mission loft offer',
          source: 'offer',
          area: 'Mission',
          capacity: 24,
          confirmed: true,
          confirmationEvidence: 'Host confirmed by email',
        },
        agenda: null,
        inviteDraft: null,
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    };
    const heldPlan = planTickNext(heldStore);
    ok(heldPlan.gateStatus === 'held', 'held plan gateStatus held: ' + heldPlan.gateStatus);
    ok(heldPlan.readyToAdvance === false, 'held plan not readyToAdvance');
    ok(!heldPlan.advanceTarget, 'held plan no advanceTarget');
    ok(/^I'll /i.test(heldPlan.ownerLine || ''), 'held plan first-person');
    ok(
      typeof heldPlan.unlockLine === 'string' && /^I'll /i.test(heldPlan.unlockLine),
      'held plan unlockLine first-person: ' + (heldPlan.unlockLine || ''),
    );
    ok(heldPlan.unlockLine === heldPlan.ownerLine, 'held unlockLine matches primary');
    ok((heldPlan.rsvpHonesty?.invited ?? null) == null, 'held plan no fake invited');
    // Temporarily swap store so offline chat reads this plan
    const heldBackup = fs.readFileSync(storePath, 'utf8');
    try {
      fs.writeFileSync(storePath, JSON.stringify(heldStore, null, 2));
      const heldChat = await eventsBotChat({
        messages: [{ role: 'user', content: 'stage gate' }],
        ip: 'selftest-gate-held-surface',
      });
      ok(
        heldChat.ok && /gate held/i.test(heldChat.reply || ''),
        'gate held chat voice: ' + (heldChat.reply || '').slice(0, 140),
      );
      ok(
        /gate held\s*·\s*unlock:\s*I'll /i.test(heldChat.reply || ''),
        'gate held unlock in lead: ' + (heldChat.reply || '').slice(0, 180),
      );
      ok(
        /unlock:.*run-of-show agenda|unlock:.*I'll write/i.test(heldChat.reply || ''),
        'gate held unlock names agenda: ' + (heldChat.reply || '').slice(0, 180),
      );
      ok(/Owner tick plan/i.test(heldChat.reply || ''), 'gate held is tick-plan surface');
      ok(!/gate open/i.test(heldChat.reply || ''), 'gate held not falsely open');
      ok(!heldChat.driven?.stage, 'gate held no drive');
      ok(/San Francisco/i.test(heldChat.reply || ''), 'gate held SF');
      ok(
        !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(heldChat.reply || ''),
        'gate held no fake RSVPs',
      );
      // Blocker / unlock asks → same held unlock surface (read-only)
      const unlockAskChat = await eventsBotChat({
        messages: [{ role: 'user', content: 'what unlocks the gate' }],
        ip: 'selftest-gate-held-unlock-ask',
      });
      ok(
        unlockAskChat.ok && /gate held\s*·\s*unlock:\s*I'll /i.test(unlockAskChat.reply || ''),
        'unlock-ask held lead: ' + (unlockAskChat.reply || '').slice(0, 160),
      );
      ok(!unlockAskChat.driven?.stage, 'unlock-ask no drive');
      // Broader unlock phrasing → same held unlock lead (was generic lifecycle before)
      const whatUnlockChat = await eventsBotChat({
        messages: [{ role: 'user', content: 'what is the unlock' }],
        ip: 'selftest-gate-held-what-unlock',
      });
      ok(
        whatUnlockChat.ok && /Owner tick plan/i.test(whatUnlockChat.reply || ''),
        'what-is-unlock tick plan: ' + (whatUnlockChat.reply || '').slice(0, 120),
      );
      ok(
        /gate held\s*·\s*unlock:\s*I'll /i.test(whatUnlockChat.reply || ''),
        'what-is-unlock held unlock: ' + (whatUnlockChat.reply || '').slice(0, 160),
      );
      ok(!whatUnlockChat.driven?.stage, 'what-is-unlock no drive');
      ok(/San Francisco/i.test(whatUnlockChat.reply || ''), 'what-is-unlock SF');
      ok(
        !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(whatUnlockChat.reply || ''),
        'what-is-unlock no fake RSVPs',
      );
      // Status on held store → gate held · unlock (not only tick-plan asks)
      const heldStatusChat = await eventsBotChat({
        messages: [{ role: 'user', content: 'status' }],
        ip: 'selftest-gate-held-status',
      });
      ok(
        heldStatusChat.ok && /gate held\s*·\s*unlock:\s*I'll /i.test(heldStatusChat.reply || ''),
        'held status unlock voice: ' + (heldStatusChat.reply || '').slice(0, 160),
      );
      ok(!heldStatusChat.driven?.stage, 'held status no drive');
      ok(
        !/\b\d+\s+(people|guests|rsvps)\s+(confirmed|attending)/i.test(heldStatusChat.reply || ''),
        'held status no fake RSVPs',
      );
      // Co-pilot reclaim on held → still names unlock (owner voice, no handoff)
      const heldCopilotChat = await eventsBotChat({
        messages: [{ role: 'user', content: 'you are the host' }],
        ip: 'selftest-gate-held-copilot',
      });
      ok(
        heldCopilotChat.ok && /organizer of record|not.*host co-pilot/i.test(heldCopilotChat.reply || ''),
        'held copilot reclaim: ' + (heldCopilotChat.reply || '').slice(0, 120),
      );
      ok(
        /gate held\s*·\s*unlock:\s*I'll /i.test(heldCopilotChat.reply || ''),
        'held copilot unlock voice: ' + (heldCopilotChat.reply || '').slice(0, 160),
      );
      ok(!heldCopilotChat.driven?.stage, 'held copilot no drive');
      // Ready plan: open → rsvp named in lead + Owner focus
      const openStore = {
        ...heldStore,
        activeEvent: {
          ...heldStore.activeEvent,
          id: 'evt_gate_open',
          title: 'Gate Open Night',
          agenda: 'run of show',
          inviteDraft: 'invite',
          dateWindows: ['2099-01-01T18:00:00-08:00'],
          guestMix: { cohorts: [{ label: 'builders' }] },
        },
        platforms: { partiful: [{ title: 'Gate Open Night' }], luma: [] },
      };
      fs.writeFileSync(storePath, JSON.stringify(openStore, null, 2));
      const openPlan = planTickNext(openStore);
      ok(openPlan.gateStatus === 'open', 'open plan gateStatus open');
      ok(openPlan.advanceTarget === 'rsvp', 'open plan advanceTarget rsvp');
      ok(openPlan.unlockLine == null, 'open plan unlockLine null: ' + openPlan.unlockLine);
      const openChat = await eventsBotChat({
        messages: [{ role: 'user', content: "what's blocking advance" }],
        ip: 'selftest-gate-open-surface',
      });
      ok(
        openChat.ok && /gate open\s*→\s*\*\*rsvp\*\*/i.test(openChat.reply || ''),
        'gate open named target: ' + (openChat.reply || '').slice(0, 140),
      );
      ok(
        /Owner focus \(plan\s*→\s*rsvp\)/i.test(openChat.reply || ''),
        'owner focus names target: ' + (openChat.reply || '').slice(0, 140),
      );
      ok(!/unlock:/i.test(openChat.reply || ''), 'gate open no unlock lead');
      ok(!openChat.driven?.stage, 'gate open ask no drive');
      ok((openChat.plan?.rsvpHonesty?.confirmed ?? null) == null, 'gate open no fake confirmed');
    } finally {
      fs.writeFileSync(storePath, heldBackup);
    }
  }

  // Partiful / invite URL — draft only, never invent link or RSVPs
  const pfChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'Partiful invite URL?' }],
    ip: 'selftest-partiful-url',
  });
  ok(
    pfChat.ok && /partiful|Invite URL|draft/i.test(pfChat.reply || ''),
    'partiful invite URL voice: ' + (pfChat.reply || '').slice(0, 100),
  );
  ok(/never invent|no fabricate|no fake rsvp|null/i.test(pfChat.reply || ''), 'partiful no invent URL/RSVP');
  ok(!/\bhttps?:\/\/(www\.)?partiful\.com\/\w+/i.test(pfChat.reply || ''), 'partiful no fabricated link');

  // Volunteer demand (not fuel) → owner recruits
  const volChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'find me volunteers' }],
    ip: 'selftest-vol-demand',
  });
  ok(
    volChat.ok && /volunteer|I recruit|I'll /i.test(volChat.reply || ''),
    'volunteer demand owner voice: ' + (volChat.reply || '').slice(0, 90),
  );
  ok(!/I'll take that as fuel/i.test(volChat.reply || ''), 'volunteer demand not fuel');
  ok(!/\b\d+\s+(people|guests)\s+(confirmed|attending)/i.test(volChat.reply || ''), 'vol demand no fake counts');

  // Resource venue locked → advance-to-plan leads (soft sponsor trails)
  {
    const resReady = planTickNext({
      activeEvent: {
        id: 'evt_res_ready',
        title: 'Resource Ready Night',
        stage: 'resource',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: {
          name: 'Mission loft offer',
          source: 'offer',
          area: 'Mission',
          confirmed: true,
          confirmationEvidence: 'Host confirmed by email',
        },
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/advance to plan/i.test(resReady.ownerLine || ''), 'resource-ready leads advance: ' + resReady.ownerLine);
    ok(
      Array.isArray(resReady.next) &&
        resReady.next.some((n) => /sponsor|volunteer/i.test(n)),
      'resource-ready soft gaps trail',
    );
    ok((resReady.rsvpHonesty?.invited ?? null) == null, 'resource-ready no fake invited');
  }

  {
    const resUnconfirmed = planTickNext({
      activeEvent: { id: 'evt_res_unconfirmed', stage: 'resource', venue: { name: 'Mission loft' } },
      outreach: [], offers: { sponsor: [], venue: [], volunteer: [] }, platforms: {},
    });
    ok(/repair audience \+ outcome \+ seats from real evidence/i.test(resUnconfirmed.ownerLine || ''), 'resource invariant repair precedes venue work');
    ok(resUnconfirmed.blocker === 'lifecycle invariant', 'resource invariant names blocker');
  }

  {
    const resFreeConfirmed = planTickNext({
      activeEvent: {
        id: 'evt_res_free_confirmed', stage: 'resource', seats: 12,
        audience: 'SF builders', outcome: 'second meetings',
        venue: {
          name: 'Mission Branch Library meeting room', source: 'free_list', area: 'Mission',
          capacity: 20, confirmed: true, confirmationEvidence: 'Reservation confirmed by venue email',
        },
      },
      outreach: [], offers: { sponsor: [], venue: [], volunteer: [] }, platforms: {},
    });
    ok(/advance to plan/i.test(resFreeConfirmed.ownerLine || ''), 'confirmed free venue advances; optional alt stays soft');
  }

  // Plan artifacts ready + venue locked → advance-to-rsvp leads (soft gaps trail)
  {
    const planReady = planTickNext({
      activeEvent: {
        id: 'evt_plan_ready',
        title: 'Plan Ready Night',
        stage: 'plan',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        dateWindows: ['2099-01-01T18:00:00-08:00'],
        venue: { name: 'Mission loft offer', source: 'offer', area: 'Mission', capacity: 24, confirmed: true, confirmationEvidence: 'Host confirmed by email' },
        agenda: 'run of show',
        guestMix: defaultGuestMix({ seats: 12 }),
        inviteDraft: 'invite',
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Plan Ready Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/advance to rsvp/i.test(planReady.ownerLine || ''), 'plan-ready leads advance: ' + planReady.ownerLine);
    ok(/null until real|no fake/i.test(planReady.whyNow || planReady.ownerLine || ''), 'plan-ready null honesty');
    ok((planReady.rsvpHonesty?.confirmed ?? null) == null, 'plan-ready no fake confirmed');
  }

  // Plan artifacts ready + queued outreach → advance leads; plan-stage draft drain trails
  {
    const planDrain = planTickNext({
      activeEvent: {
        id: 'evt_plan_drain',
        title: 'Plan Drain Night',
        stage: 'plan',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        dateWindows: ['2099-01-01T18:00:00-08:00'],
        venue: { name: 'Mission loft offer', source: 'offer', area: 'Mission', capacity: 24, confirmed: true, confirmationEvidence: 'Host confirmed by email' },
        agenda: 'run of show',
        guestMix: defaultGuestMix({ seats: 12 }),
        inviteDraft: 'invite',
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [
        {
          id: 'out_plan_sponsor',
          eventId: 'evt_plan_drain',
          kind: 'sponsor',
          status: 'queued',
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          subject: 'Sponsor draft',
          body: 'DRAFT sponsor ask (not sent). SF only.',
        },
      ],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Plan Drain Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/advance to rsvp/i.test(planDrain.ownerLine || ''), 'plan-drain leads advance: ' + planDrain.ownerLine);
    ok(planDrain.readyToAdvance === true, 'plan-drain readyToAdvance');
    ok(planDrain.advanceTarget === 'rsvp', 'plan-drain advanceTarget rsvp: ' + planDrain.advanceTarget);
    ok(
      Array.isArray(planDrain.next) &&
        planDrain.next.some((n) => /draft-drain|sponsor/i.test(n)),
      'plan-drain pipeline trails draft drain: ' + (planDrain.next || []).join(' | '),
    );
    ok(
      Array.isArray(planDrain.next) &&
        planDrain.next.some((n) => /trails advance/i.test(n)),
      'plan-drain draft-drain names trails advance: ' + (planDrain.next || []).join(' | '),
    );
    ok(
      Array.isArray(planDrain.next) &&
        planDrain.next.some((n) => /null|no fake/i.test(n)),
      'plan-drain null honesty in pipeline or owner',
    );
    ok((planDrain.rsvpHonesty?.confirmed ?? null) == null, 'plan-drain no fake confirmed');
    ok(planDrain.city === 'San Francisco', 'plan-drain SF');
  }

  // Rejected or archived-event reminder rows must not unlock the active RSVP lifecycle.
  {
    const rsvpStaleReminders = planTickNext({
      activeEvent: {
        id: 'evt_rsvp_active',
        title: 'Active RSVP Night',
        stage: 'rsvp',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        dateWindows: ['2099-01-01T18:00:00-08:00'],
        venue: { name: 'Mission room', source: 'offer', confirmed: true, confirmationEvidence: 'confirmed' },
        rsvpTally: { openedAt: '2026-07-01T00:00:00.000Z', remindersQueued: false },
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [
        { eventId: 'evt_rsvp_active', kind: 'rsvp_remind_t3d', status: 'rejected' },
        { eventId: 'evt_archived', kind: 'rsvp_remind_t1d', status: 'sent' },
      ],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: {},
    });
    ok(
      /reminder drafts/i.test(rsvpStaleReminders.ownerLine || ''),
      'stale reminders do not unlock active RSVP: ' + rsvpStaleReminders.ownerLine,
    );
    ok(!rsvpStaleReminders.readyToAdvance, 'stale reminders keep RSVP gate held');
  }

  // Run artifacts alone cannot invent host-close evidence.
  {
    const runReady = planTickNext({
      activeEvent: {
        id: 'evt_run_ready',
        title: 'Run Ready Night',
        stage: 'run',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: { name: 'Mission loft offer', source: 'offer', area: 'Mission', capacity: 24, confirmed: true, confirmationEvidence: 'Mock venue confirmed' },
        agenda: 'run of show',
        inviteDraft: 'invite',
        dayOfChecklist: ['Confirm SF venue', 'Welcome frame'],
        hostFrame: "I'm Events Bot — organizer of record.",
        rsvpTally: { openedAt: '2026-07-01T00:00:00.000Z', remindersQueued: true },
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Run Ready Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/host-close evidence/i.test(runReady.ownerLine || ''), 'run-ready stays held: ' + runReady.ownerLine);
    ok(runReady.readyToAdvance === false, 'run-ready not readyToAdvance');
    ok(runReady.advanceTarget === null, 'run-ready advanceTarget: ' + runReady.advanceTarget);
    ok(
      Array.isArray(runReady.next) &&
        runReady.next.some((n) => /null|door tally|no fake/i.test(n)),
      'run-ready pipeline null honesty',
    );
    ok((runReady.rsvpHonesty?.attended ?? null) == null, 'run-ready no fake attended');
  }

  // Run + queued outreach stays held; day-of draft drain remains in the pipeline.
  {
    const runDrain = planTickNext({
      activeEvent: {
        id: 'evt_run_drain',
        title: 'Run Drain Night',
        stage: 'run',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: { name: 'Mission loft offer', source: 'offer', area: 'Mission', capacity: 24, confirmed: true, confirmationEvidence: 'Mock venue confirmed' },
        agenda: 'run of show',
        inviteDraft: 'invite',
        dayOfChecklist: ['Confirm SF venue', 'Welcome frame'],
        hostFrame: "I'm Events Bot — organizer of record.",
        rsvpTally: { openedAt: '2026-07-01T00:00:00.000Z', remindersQueued: true },
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [
        {
          id: 'out_run_venue',
          eventId: 'evt_run_drain',
          kind: 'venue_alt',
          status: 'queued',
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          subject: 'Venue alt draft',
          body: 'DRAFT venue alt (not sent). SF only.',
        },
      ],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Run Drain Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/host-close evidence/i.test(runDrain.ownerLine || ''), 'run-drain stays held: ' + runDrain.ownerLine);
    ok(runDrain.advanceTarget === null, 'run-drain advanceTarget: ' + runDrain.advanceTarget);
    ok(
      Array.isArray(runDrain.next) &&
        runDrain.next.some((n) => /draft-drain|venue/i.test(n)),
      'run-drain pipeline trails draft drain: ' + (runDrain.next || []).join(' | '),
    );
    ok(
      Array.isArray(runDrain.next) &&
        runDrain.next.some((n) => /null|door tally|no fake/i.test(n)),
      'run-drain null honesty trails',
    );
    ok((runDrain.rsvpHonesty?.attended ?? null) == null, 'run-drain no fake attended');
    ok(runDrain.city === 'San Francisco', 'run-drain SF');
  }

  // Followup thanks draft ready → advance-to-debrief leads
  {
    const fuReady = planTickNext({
      activeEvent: {
        id: 'evt_fu_ready',
        title: 'Followup Ready Night',
        stage: 'followup',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: {
          name: 'Mission loft offer',
          source: 'offer',
          area: 'Mission',
          capacity: 12,
          confirmed: true,
          confirmationEvidence: 'Host confirmed the room.',
        },
        agenda: 'run of show',
        inviteDraft: 'invite',
        debriefNotes: 'Host confirmed the night closed; attendance remains unknown.',
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [
        {
          id: 'out_thanks_1',
          eventId: 'evt_fu_ready',
          kind: 'thanks',
          status: 'queued',
          toEmail: 'potter@trydemigod.com',
          toName: 'Events Bot ops',
          subject: 'Thank-you draft',
          body: 'DRAFT thanks (not sent). Only real attendees.',
        },
      ],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [{ title: 'Followup Ready Night' }], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/advance to debrief/i.test(fuReady.ownerLine || ''), 'followup-ready leads advance: ' + fuReady.ownerLine);
    ok(
      Array.isArray(fuReady.next) &&
        fuReady.next.some((n) => /null|no fake|real (post-night|attendance)/i.test(n)),
      'followup-ready pipeline null honesty',
    );
    ok((fuReady.rsvpHonesty?.attended ?? null) == null, 'followup-ready no fake attended');
  }

  // "what's my role" / assign tasks → host reclaim, not co-pilot handoff
  const roleChat = await eventsBotChat({
    messages: [{ role: 'user', content: "what's my role tonight — assign me tasks" }],
    ip: 'selftest-host-role',
  });
  ok(
    roleChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(roleChat.reply || ''),
    'host role reclaim: ' + (roleChat.reply || '').slice(0, 100),
  );
  ok(/fuel|optional role/i.test(roleChat.reply || ''), 'host role fuel framing');
  ok(!roleChat.driven || !roleChat.driven.stage, 'host role no false drive');
  ok(/I'll |Next:/i.test(roleChat.reply || ''), 'host role surfaces plan');

  // Assistant language → same reclaim (not co-pilot handoff)
  const assistChat = await eventsBotChat({
    messages: [{ role: 'user', content: "you're my event assistant — help me host" }],
    ip: 'selftest-assistant-reclaim',
  });
  ok(
    assistChat.ok && /organizer of record|not.*host co-pilot|I drive/i.test(assistChat.reply || ''),
    'assistant reclaim: ' + (assistChat.reply || '').slice(0, 100),
  );
  ok(/fuel|optional role|not a host/i.test(assistChat.reply || ''), 'assistant fuel framing');
  ok(!assistChat.driven || !assistChat.driven.stage, 'assistant no false drive');

  // Ideate advance-first only when audience+outcome+seats+SF windows locked
  {
    const ideatePartial = planTickNext({
      activeEvent: {
        id: 'evt_ideate_partial',
        title: 'Ideate Partial',
        stage: 'ideate',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF startup builders',
        outcome: 'second meetings',
        dateWindows: [],
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(
      /date windows|SF timing|pick 1/i.test(ideatePartial.ownerLine || ''),
      'ideate partial leads windows not advance: ' + ideatePartial.ownerLine,
    );
    ok(ideatePartial.readyToAdvance !== true, 'ideate partial readyToAdvance false');
    const ideateReady = planTickNext({
      activeEvent: {
        id: 'evt_ideate_ready',
        title: 'Ideate Ready',
        stage: 'ideate',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF startup builders',
        outcome: 'second meetings',
        dateWindows: ['Thu 7pm'],
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/advance to resource/i.test(ideateReady.ownerLine || ''), 'ideate-ready leads advance: ' + ideateReady.ownerLine);
    ok(ideateReady.readyToAdvance === true, 'ideate-ready readyToAdvance');
    ok(ideateReady.city === 'San Francisco', 'ideate-ready SF');
  }

  // Debrief notes ready → seed next SF cycle leads
  {
    const debReady = planTickNext({
      activeEvent: {
        id: 'evt_deb_ready',
        title: 'Debrief Ready Night',
        stage: 'debrief',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'second meetings',
        venue: { name: 'Mission loft offer', source: 'offer' },
        debrief: 'Real notes only — attendance still null.',
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/seed the next SF/i.test(debReady.ownerLine || ''), 'debrief-ready leads seed: ' + debReady.ownerLine);
    ok(debReady.readyToAdvance === true, 'debrief-ready readyToAdvance');
    ok(
      Array.isArray(debReady.next) &&
        debReady.next.some((n) => /null|no invent|real attendance|no fake/i.test(n)),
      'debrief-ready pipeline null honesty',
    );
    ok((debReady.rsvpHonesty?.attended ?? null) == null, 'debrief-ready no fake attended');
  }

  // Run partial artifacts → specific day-of step (not advance)
  {
    const runPartial = planTickNext({
      activeEvent: {
        id: 'evt_run_partial',
        title: 'Run Partial',
        stage: 'run',
        city: 'San Francisco',
        seats: 12,
        audience: 'SF builders',
        outcome: 'x',
        venue: { name: 'Mission loft' },
        dayOfChecklist: ['Confirm SF venue'],
        hostFrame: null,
        outcomes: { invited: null, confirmed: null, attended: null },
      },
      outreach: [],
      offers: { sponsor: [], venue: [], volunteer: [] },
      platforms: { partiful: [], luma: [] },
      ideas: [],
      contacts: [],
      tasks: [],
      money: [],
      feedback: [],
      events: [],
    });
    ok(/host frame/i.test(runPartial.ownerLine || ''), 'run partial needs host frame: ' + runPartial.ownerLine);
    ok(runPartial.readyToAdvance !== true, 'run partial not readyToAdvance');
    ok(
      Array.isArray(runPartial.next) &&
        runPartial.next.some((n) => /null|door tally|no fake/i.test(n)),
      'run partial null honesty trails',
    );
  }

  const beforePublicDrive = JSON.stringify(loadStore());
  const publicDriveChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'drive the next SF dinner' }],
    ip: 'selftest-public-drive',
  });
  ok(publicDriveChat.ok && !publicDriveChat.driven, 'public chat drive request stays read-only');
  ok(JSON.stringify(loadStore()) === beforePublicDrive, 'public chat drive request does not mutate store');

  const driveChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'drive the next SF dinner' }],
    ip: 'selftest2',
    allowMutate: true,
  });
  ok(driveChat.ok, 'drive chat ok');
  ok(driveChat.plan || driveChat.driven?.plan || /Next:|I drove/i.test(driveChat.reply || ''), 'drive chat plan voice');
  ok(/^I'll /i.test(driveChat.plan?.ownerLine || driveChat.driven?.plan?.ownerLine || ''), 'drive chat plan first-person');
  // Drive summary already has Next — offline topical body should not double-stack "Next:" lines
  const nextHits = (driveChat.reply || '').match(/\*\*Next:\*\*|Next:/g) || [];
  ok(nextHits.length <= 2, 'drive chat no triple Next stack: ' + nextHits.length);

  // Chat stage advance quality: explicit evidence language
  const beforeAdv = loadStore().activeEvent?.stage;
  const advChat = await eventsBotChat({
    messages: [{ role: 'user', content: 'night happened — start follow-up' }],
    ip: 'selftest-advance',
    allowMutate: true,
  });
  ok(advChat.ok, 'advance chat ok');
  const afterAdv = loadStore().activeEvent?.stage;
  ok(
    afterAdv === 'followup' ||
      afterAdv === 'debrief' ||
      /advanced|stage|follow/i.test(advChat.reply || '') ||
      advChat.driven?.advanced,
    'chat stage advance voice: ' + afterAdv + ' from ' + beforeAdv,
  );
  // Prefer landing on followup when gates allow (run→followup)
  if (beforeAdv === 'run' || beforeAdv === 'followup') {
    ok(afterAdv === 'followup' || afterAdv === 'debrief', 'chat advanced post-night stage');
  }

  const venues = runTool('research_free_venues', { need: 'outdoor picnic', seats: 20 });
  ok(venues.ok && venues.venues?.length, 'research_free_venues');
  ok(venues.city === 'San Francisco', 'venues city SF');
  ok(venues.top?.score != null && venues.venues[0].id === venues.top.id, 'research top scored');
  ok(
    venues.venues.every((v, i, arr) => i === 0 || arr[i - 1].score >= v.score),
    'research venues sorted by score',
  );

  // Resource drive: venue outreach body includes ranked shortlist; queue has priority
  const empty2 = JSON.parse(backup);
  empty2.activeEvent = { id: null, title: '', stage: 'ideate', city: 'San Francisco' };
  empty2.outreach = [];
  empty2.platforms = { luma: [], partiful: [] };
  empty2.ideas = [];
  empty2.offers = {
    sponsor: [{ id: 'declined_sponsor', status: 'declined', city: 'San Francisco' }],
    venue: [],
    volunteer: [{ id: 'oakland_volunteer', status: 'accepted', city: 'Oakland' }],
  };
  fs.writeFileSync(storePath, JSON.stringify(empty2, null, 2));
  const resDrive = await eventsBotAgentTick({ goal: '12 person indoor salon free venue' });
  ok(resDrive.ok, 'resource tick ok');
  const storeR = loadStore();
  ok(storeR.activeEvent?.venue?.confirmed !== true, 'resource tick shortlist is not a confirmed venue');
  ok(storeR.activeEvent?.stage === 'resource', 'resource tick stays resource until venue confirmation evidence');
  const venueOut = (storeR.outreach || []).find(
    (o) =>
      (o.status === 'queued' || o.status === 'drafted') &&
      normalizeOutreachKind(o.kind) === 'venue',
  );
  ok(venueOut, 'venue/venue_alt outreach queued');
  ok(venueOut && /Ranked free SF|match \d+/i.test(venueOut.body || ''), 'venue outreach shortlist draft');
  ok(venueOut && /Resource gaps:|match \d+;/i.test(venueOut.body || ''), 'venue outreach gaps or reasons');
  ok(venueOut && /Top free-list pick|heuristic|not booked/i.test(venueOut.body || ''), 'venue outreach top free pick line');
  ok(typeof venueOut?.priority === 'number' && venueOut.priority >= OUTREACH_KIND_PRIORITY.venue, 'venue outreach priority set');
  ok(venueOut && /Events Bot \(by Demigod\)/.test(venueOut.body || ''), 'venue outreach identity blurb');
  ok(
    ['sponsor', 'volunteer'].every((kind) =>
      (storeR.outreach || []).some((o) => o.kind === kind && o.status === 'queued'),
    ),
    'resource tick queues gaps despite declined or non-SF offers',
  );
  ok(
    (storeR.outreach || [])
      .filter((o) => o.status === 'queued' || o.status === 'drafted')
      .every((o) => isRealOutreachEmail(o.toEmail)),
    'all queued outreach emails real (no invent)',
  );
  const listed = runTool('list_resources', {});
  ok(listed.outreachQueue?.length >= 1, 'list_resources outreachQueue');
  ok(listed.outreachNext?.kind, 'list_resources outreachNext');
  ok(listed.outreachNextWhy && /queued|not sent|venue|gap|shortlist|stage/i.test(listed.outreachNextWhy), 'list_resources outreachNextWhy');
  ok(listed.resourceGaps && Array.isArray(listed.resourceGaps.missing), 'list_resources resourceGaps');
  ok(
    listed.offerCounts?.sponsor === 0 && listed.offerCounts?.volunteer === 0,
    'list_resources counts exclude declined and non-SF offers',
  );
  const counted = matchOffersToEvent({
    activeEvent: { id: 'ev_counted', seats: 1 },
    offers: { venue: Array.from({ length: 11 }, (_, i) => ({
      id: `venue_counted_${i}`,
      email: `venue${i}@gmail.com`,
      city: 'San Francisco',
      capacity: 2,
    })) },
  });
  ok(counted.venues.length === 10 && counted.offerCounts.venue === 11, 'offer counts expose shortlist truncation');
  ok(
    listed.outreachQueue.every((o, i, arr) => i === 0 || arr[i - 1].priority >= o.priority),
    'outreachQueue sorted by priority',
  );
  ok(
    listed.outreachQueue.every((o) => o.readiness != null || o.drainWhy),
    'outreachQueue rows carry readiness/drainWhy',
  );
  // Drain: venue/venue_alt ahead of sponsor when venue gap still open (draft only)
  if (listed.resourceGaps?.needVenue || listed.resourceGaps?.needVenueAlt) {
    const topKind = normalizeOutreachKind(listed.outreachNext?.kind);
    const hasVenueDraft = (listed.outreachQueue || []).some(
      (o) => normalizeOutreachKind(o.kind) === 'venue',
    );
    if (hasVenueDraft) {
      ok(topKind === 'venue', 'outreachNext is venue when venue gap + venue draft');
    }
  }
  ok(listed.outreachHygiene && typeof listed.outreachHygiene.fixedIdentity === 'number', 'list outreachHygiene');
  ok(listed.freeVenues?.[0]?.score != null, 'list freeVenues scored');
  ok(Array.isArray(listed.freeVenues?.[0]?.reasons), 'list freeVenues reasons');
  ok(resDrive.resources?.activeEvent?.venue?.name, 'matched free venue on indoor salon');
  ok(/draft|queued|no auto-send|heuristic/i.test(listed.note || ''), 'list honesty note');

  // Offer → active event: seeded SF venue wins over free list; stamp + accept link
  const empty3 = JSON.parse(backup);
  empty3.activeEvent = {
    id: 'evt_offer_match',
    title: 'Indoor salon dinner',
    stage: 'resource',
    city: 'San Francisco',
    seats: 12,
    audience: 'SF startup builders',
    outcome: 'second meetings',
    needs: 'indoor loft salon dinner',
    notes: 'quiet indoor room',
    venue: null,
  };
  empty3.outreach = [];
  empty3.platforms = { luma: [], partiful: [] };
  empty3.ideas = [];
  empty3.offers = {
    sponsor: [
      {
        id: 'sp_seed',
        name: 'Tab Co',
        email: 'potter@trydemigod.com',
        city: 'San Francisco',
        offer: 'dinner tab sponsor',
        status: 'new',
      },
    ],
    venue: [
      {
        id: 'off_seed_venue',
        name: 'Mission loft offer',
        city: 'Mission',
        capacity: 18,
        offer: 'indoor loft for salon dinner',
        status: 'new',
        email: 'potter@trydemigod.com',
      },
      {
        id: 'off_seed_oak',
        name: 'Oakland loft',
        city: 'Oakland',
        capacity: 50,
        offer: 'huge warehouse',
        status: 'new',
      },
    ],
    volunteer: [
      {
        id: 'vol_seed',
        name: 'Sam',
        email: 'potter@trydemigod.com',
        city: 'SF',
        offer: 'door and setup',
        status: 'new',
      },
    ],
  };
  empty3.events = [empty3.activeEvent];
  fs.writeFileSync(storePath, JSON.stringify(empty3, null, 2));
  const stamped = stampOfferMatches(loadStore());
  ok(stamped?.top?.venue?.id === 'off_seed_venue', 'stamp top venue seed');
  ok(stamped?.top?.sponsor?.id === 'sp_seed', 'stamp top sponsor seed');
  ok(stamped?.top?.volunteer?.id === 'vol_seed', 'stamp top volunteer seed');
  const intakeStore = structuredClone(empty3);
  intakeStore.offers = { sponsor: [], venue: [], volunteer: [] };
  intakeStore.offers.venue.push({
    id: 'off_intake_sf',
    name: 'Mission dinner room',
    city: 'San Francisco',
    capacity: 15,
    offer: 'quiet indoor dinner room',
    email: 'potter@trydemigod.com',
    status: 'new',
  });
  stampOfferMatches(intakeStore);
  ok(intakeStore.activeEvent?.matchedOffers?.venueId === 'off_intake_sf', 'offerIntakeMatch: SF venue matched');
  ok(
    intakeStore.offers.venue[0].status === 'new' && !intakeStore.offers.venue[0].eventId,
    'offerIntakeMatch: ranking does not reserve an offer',
  );
  const previousVenueId = intakeStore.activeEvent.matchedOffers.venueId;
  intakeStore.offers.venue.push({
    id: 'off_intake_oak',
    name: 'Oakland warehouse',
    city: 'Oakland',
    capacity: 50,
    offer: 'warehouse',
    email: 'potter@trydemigod.com',
    status: 'new',
  });
  stampOfferMatches(intakeStore);
  ok(intakeStore.offers.venue[1].status === 'new', 'offerIntakeMatch: non-SF offer stays new');
  ok(intakeStore.activeEvent.matchedOffers.venueId === previousVenueId, 'offerIntakeMatch: non-SF cannot replace venue');
  const stableMatches = JSON.stringify(intakeStore);
  const unchangedStamp = stampOfferMatches(intakeStore);
  ok(unchangedStamp.changed === false, 'offerIntakeMatch: unchanged match reports no mutation');
  ok(JSON.stringify(intakeStore) === stableMatches, 'offerIntakeMatch: unchanged match is byte-stable');
  // drive_cycle should select offered venue (not only free list)
  const offerDrive = runTool('drive_cycle', { goal: 'use venue offer for indoor salon' });
  ok(offerDrive.ok, 'offer drive ok: ' + (offerDrive.error || ''));
  const storeO = loadStore();
  ok(storeO.activeEvent?.venue?.id === 'off_seed_venue', 'drive selected offer venue');
  ok(storeO.activeEvent?.venue?.source === 'offer', 'venue source offer');
  ok(storeO.activeEvent?.matchedOffers?.venueId === 'off_seed_venue', 'matchedOffers.venueId stamped');
  ok(storeO.activeEvent?.matchedOffers?.sponsorId === 'sp_seed', 'matchedOffers.sponsorId stamped');
  const snapshot = storeO.events.find((e) => e.id === storeO.activeEvent.id);
  ok(snapshot?.venue?.id === storeO.activeEvent.venue.id, 'saved event snapshot matches active event');
  const linked = (storeO.offers.venue || []).find((o) => o.id === 'off_seed_venue');
  ok(linked?.eventId === 'evt_offer_match', 'venue offer linked eventId');
  ok(linked?.status === 'matched', 'selected venue offer still awaits human acceptance');
  const confirmation = (storeO.outreach || []).find(
    (o) => o.eventId === storeO.activeEvent.id && o.kind === 'venue_confirmation',
  );
  ok(confirmation?.toEmail === 'potter@trydemigod.com', 'venue confirmation targets selected offer contact');
  ok(confirmation?.status === 'queued' && confirmation.sentAt == null, 'venue confirmation remains queued only');
  ok(/date\/window|capacity|address/i.test(confirmation?.body || ''), 'venue confirmation asks for real evidence');
  ok(storeO.activeEvent?.venue?.confirmed === false, 'confirmation draft does not confirm venue');
  ok(storeO.activeEvent?.stage === 'resource', 'confirmation draft does not advance lifecycle');
  ok(
    !(storeO.offers.venue || []).find((o) => o.id === 'off_seed_oak' && o.status === 'accepted'),
    'Oakland offer not accepted',
  );
  const listedM = runTool('list_resources', {});
  ok(listedM.matchedTop?.venue?.id === 'off_seed_venue', 'list_resources matchedTop');
  ok(!JSON.stringify(listedM.matched || {}).includes('potter@trydemigod.com'), 'matched payload no offer email');

  // Partiful tool: SF reject + idempotent update by title
  const inviteDraftStore = loadStore();
  inviteDraftStore.activeEvent.stage = 'plan';
  saveStore(inviteDraftStore);
  const pfBad = runTool('partiful_draft', {
    title: 'Bad night',
    description: 'x',
    where: 'Brooklyn warehouse',
  });
  ok(pfBad.ok === false && pfBad.error === 'sf_only', 'partiful tool SF reject');
  const pf1 = runTool('partiful_draft', {
    title: 'Idempotent Night',
    description: 'first draft body',
    when: 'Fri 7pm',
    where: 'SoMa',
    seats: 10,
  });
  ok(pf1.ok && pf1.partiful?.id, 'partiful tool create');
  ok(pf1.partiful?.eventId === 'evt_offer_match', 'partiful draft linked to active event');
  ok(pf1.updated !== true, 'partiful first is create');
  ok(/San Francisco/i.test(pf1.partiful.where || ''), 'partiful tool where SF');
  const id1 = pf1.partiful.id;
  const pf2 = runTool('partiful_draft', {
    title: 'Idempotent Night',
    description: 'second draft body refreshed',
    when: 'Fri 8pm',
    where: 'Mission',
    seats: 12,
  });
  ok(pf2.ok && pf2.updated === true, 'partiful second updates');
  ok(pf2.partiful?.id === id1, 'partiful same id on update');
  ok(pf2.partiful?.when === 'Fri 8pm', 'partiful when refreshed');
  ok(pf2.exportFiles?.txt === pf1.exportFiles?.txt, 'partiful updates same export file');
  ok(
    fs.readFileSync(pf2.exportFiles.txt, 'utf8').includes('second draft body refreshed'),
    'partiful export file refreshed',
  );
  // Record real URL then re-draft copy — must keep Invite URL (not blank wipe)
  const partifulInviteStore = loadStore();
  partifulInviteStore.activeEvent.stage = 'plan';
  saveStore(partifulInviteStore);
  const pfRec = runTool('record_invite_url', {
    platform: 'partiful',
    id: id1,
    url: 'https://partiful.com/e/idempotent-live',
  });
  ok(pfRec.ok && pfRec.inviteUrl === 'https://partiful.com/e/idempotent-live', 'partiful record live url');
  const pf3 = runTool('partiful_draft', {
    title: 'Idempotent Night',
    description: 'third body after URL recorded',
    when: 'Fri 9pm',
    where: 'Mission',
    seats: 12,
  });
  ok(pf3.ok && pf3.updated === true, 'partiful third re-draft after URL');
  ok(
    pf3.partiful?.inviteUrl === 'https://partiful.com/e/idempotent-live',
    'partiful re-draft keeps inviteUrl',
  );
  ok(pf3.partiful?.status === 'published_url', 'partiful re-draft keeps published_url');
  ok(
    /Invite URL: https:\/\/partiful\.com\/e\/idempotent-live/.test(pf3.partiful?.exportText || ''),
    'partiful re-draft exportText keeps Invite URL',
  );
  ok(
    fs.readFileSync(pf3.exportFiles.txt, 'utf8').includes('https://partiful.com/e/idempotent-live'),
    'partiful re-draft outbox keeps live URL',
  );
  ok(
    fs.readFileSync(pf3.exportFiles.txt, 'utf8').includes('third body after URL recorded'),
    'partiful re-draft still refreshes body',
  );
  const pfList = (loadStore().platforms?.partiful || []).filter(
    (p) => /idempotent night/i.test(p.title || ''),
  );
  ok(pfList.length === 1, 'partiful no title dupes');

  const wrongEventPf = loadStore();
  wrongEventPf.activeEvent.stage = 'plan';
  wrongEventPf.events.find((event) => event.id === wrongEventPf.activeEvent.id).stage = 'plan';
  wrongEventPf.platforms.partiful = wrongEventPf.platforms.partiful.filter(
    (row) => row.eventId !== wrongEventPf.activeEvent.id,
  );
  wrongEventPf.platforms.partiful.push({
    id: 'pf_old_same_title',
    eventId: 'evt_old',
    title: wrongEventPf.activeEvent.title,
    status: 'draft',
  });
  fs.writeFileSync(storePath, JSON.stringify(wrongEventPf, null, 2));
  const sameTitleDrive = runTool('drive_cycle', { goal: 'refresh this night platform draft' });
  const sameTitleRows = loadStore().platforms.partiful.filter(
    (row) => String(row.title).toLowerCase() === String(wrongEventPf.activeEvent.title).toLowerCase(),
  );
  ok(
    sameTitleDrive.ok && sameTitleRows.some((row) => row.eventId === wrongEventPf.activeEvent.id),
    'partiful identity: another event same-title draft does not satisfy active night',
  );

  // Luma draft tool: repeated title updates the same draft/export, never duplicates/publishes
  const luma1 = runTool('luma_create_event', {
    title: 'Idempotent Luma Night',
    description: 'first Luma draft body',
    when: 'Thu 7pm',
    location: 'SoMa',
  });
  ok(luma1.ok && luma1.draft?.id && luma1.draft?.status === 'draft', 'luma tool create draft');
  ok(luma1.draft?.eventId === 'evt_offer_match', 'luma draft linked to active event');
  ok(luma1.updated !== true, 'luma first is create');
  const lumaId = luma1.draft.id;
  const luma2 = runTool('luma_create_event', {
    title: 'Idempotent Luma Night',
    description: 'refreshed Luma draft body',
    when: 'Thu 8pm',
    location: 'Mission',
  });
  ok(luma2.ok && luma2.updated === true, 'luma second updates');
  ok(luma2.draft?.id === lumaId && luma2.draft?.when === 'Thu 8pm', 'luma keeps id and refreshes fields');
  ok(luma2.exportFiles?.txt === luma1.exportFiles?.txt, 'luma updates same export file');
  ok(
    fs.readFileSync(luma2.exportFiles.txt, 'utf8').includes('refreshed Luma draft body'),
    'luma export file refreshed',
  );
  ok(
    (loadStore().platforms?.luma || []).filter((p) => /idempotent luma night/i.test(p.title || '')).length === 1,
    'luma no title dupes',
  );
} finally {
  // Restore isolated selftest store only — never touch prod
  try {
    fs.writeFileSync(storePath, backup);
  } catch {
    /* best-effort */
  }
}

// Fail-visible isolation gate: prod SoR must be byte-identical; tmp must have been written
const prodShaAtEnd = fs.existsSync(PROD_EVENTS_STORE)
  ? crypto.createHash('sha256').update(fs.readFileSync(PROD_EVENTS_STORE)).digest('hex')
  : null;
ok(
  prodShaAtStart != null && prodShaAtEnd === prodShaAtStart,
  'selftestStoreIsolation: prod DEMIGOD-EVENTS.json sha256 unchanged',
);
ok(fs.existsSync(SELFTEST_STORE), 'selftestStoreIsolation: tmp store exists');
const tmpBody = fs.readFileSync(SELFTEST_STORE, 'utf8');
ok(tmpBody && tmpBody.trim().length > 20, 'selftestStoreIsolation: tmp store non-empty (isolation active)');
ok(
  /selftest-store-\d+/.test(SELFTEST_STORE) || process.env.DEMIGOD_EVENTS_SELFTEST_STORE,
  'selftestStoreIsolation: pid-unique store path (no concurrent thrash)',
);
// Outbox isolation — positive control (prod-flat alone is vacuous if nothing wrote)
ok(
  path.resolve(eventsOutboxPath()) === path.resolve(SELFTEST_OUTBOX) &&
    path.resolve(eventsOutboxPath()) !== path.resolve(PROD_OUTBOX),
  'outboxIsolation: eventsOutboxPath is pid-unique tmp (not prod events-bot-outbox)',
);
ok(
  /selftest-outbox-\d+/.test(SELFTEST_OUTBOX) || process.env.DEMIGOD_EVENTS_SELFTEST_OUTBOX,
  'outboxIsolation: pid-unique outbox path',
);
// Force one draft write if suite paths skipped export (must land a file in tmp)
{
  const before = countDirFiles(SELFTEST_OUTBOX);
  if (before === 0) {
    writeInviteExport('partiful', {
      id: 'pf_outbox_isolation_' + process.pid,
      title: 'Outbox Isolation Probe Night',
      exportText: 'Invite URL:\n',
      platform: 'partiful',
    });
  }
}
const tmpOutboxFiles = countDirFiles(SELFTEST_OUTBOX);
ok(tmpOutboxFiles > 0, 'outboxIsolation: draft file(s) landed in tmp outbox (positive control)');
// Concurrent useful-loop/operator drafts may change prod count; fail only if *we* polluted prod.
const prodOutboxNamesAtEnd = listDirNames(PROD_OUTBOX);
const newProdOutbox = prodOutboxNamesAtEnd.filter((n) => !prodOutboxNamesAtStart.has(n));
ok(
  !newProdOutbox.some((n) => /selftest|isolation|pf_outbox_isolation_/i.test(n)),
  'outboxIsolation: no selftest drafts landed in prod events-bot-outbox: ' + newProdOutbox.slice(0, 5).join(','),
);
ok(
  !listDirNames(SELFTEST_OUTBOX).some((n) => prodOutboxNamesAtEnd.includes(n) && /selftest|isolation|pf_outbox_isolation_/i.test(n)),
  'outboxIsolation: selftest outbox files are not also in prod',
);
// Money intent is a trust boundary: unusable contacts must not enter sponsor supply.
{
  const before = loadStore().money.length;
  const invalid = runTool('record_money_intent', {
    name: 'X',
    email: 'noreply@example.com',
    amountNote: ' ',
  });
  ok(!invalid.ok && loadStore().money.length === before, 'moneyIntent: invalid contact rejected without write');
  const invalidCents = runTool('record_money_intent', {
    name: 'Real Sponsor',
    email: 'sponsor@acme.com',
    amountNote: '$500',
    cents: -50000,
  });
  ok(!invalidCents.ok && loadStore().money.length === before, 'moneyIntent: invalid cents rejected without write');
}
// Model tools must not stringify malformed schedule values into lifecycle evidence.
{
  const before = JSON.stringify(loadStore());
  const invalid = runTool('update_event_details', { dateWindows: [{ when: 'Thursday' }] });
  ok(
    !invalid.ok && invalid.error === 'dateWindows must be an array of nonblank strings' && JSON.stringify(loadStore()) === before,
    'dateWindows: malformed tool input rejected without write',
  );
  const updated = runTool('update_event_details', { notes: 'Lifecycle mirror check' });
  const stored = loadStore();
  ok(
    updated.ok && stored.events.find((event) => event.id === stored.activeEvent.id)?.notes === 'Lifecycle mirror check',
    'eventDetails: active event changes sync to lifecycle list',
  );
  for (const args of [
    { title: 'Oakland founder dinner' },
    { audience: 'Oakland founders' },
    { outcome: 'Meet builders in Oakland' },
    { notes: 'Move this night to Oakland' },
  ]) {
    const snapshot = JSON.stringify(loadStore());
    const blocked = runTool('update_event_details', args);
    ok(
      !blocked.ok && blocked.error === 'SF_ONLY' && JSON.stringify(loadStore()) === snapshot,
      'eventDetails: non-SF ' + Object.keys(args)[0] + ' rejected without write',
    );
  }
  saveStore(JSON.parse(before));
}
// record_schedule accepts only the active event's strict, future, timezone-aware start.
{
  const before = JSON.parse(JSON.stringify(loadStore()));
  const store = loadStore();
  store.activeEvent = { ...(store.activeEvent || {}), id: 'ev_schedule_check', stage: 'plan', dateWindows: ['Thursday evening'] };
  saveStore(store);
  for (const start of ['Thursday evening', '2026-08-01T18:30:00', '2026-02-30T18:30:00-08:00', '2099-08-01T18:30:00-00:00', '2099-08-01T18:30:00+14:01', '2099-08-01T18:30:00-23:00']) {
    ok(!runTool('record_schedule', { eventId: 'ev_schedule_check', start }).ok, 'recordSchedule: rejects ' + start);
  }
  ok(!runTool('record_schedule', { eventId: 'ev_wrong', start: '2099-08-01T18:30:00-07:00' }).ok, 'recordSchedule: rejects wrong event');
  const valid = runTool('record_schedule', { eventId: 'ev_schedule_check', start: '2099-08-01T18:30:00-07:00' });
  ok(valid.ok && loadStore().activeEvent.dateWindows[0] === valid.start, 'recordSchedule: persists exact strict start');
  saveStore(before);
}
// Empty feedback must not write noise; vague date windows stay planning preferences.
{
  const before = JSON.parse(JSON.stringify(loadStore()));
  const fbBefore = (loadStore().feedback || []).length;
  const blank = runTool('record_feedback', { text: '   ', name: 'x' });
  ok(
    !blank.ok &&
      blank.error === 'text_required' &&
      (loadStore().feedback || []).length === fbBefore,
    'feedback: blank text rejected without write',
  );
  const vaguePlan = planTickNext({
    activeEvent: {
      id: 'ev_vague_win',
      title: 'Vague Windows Night',
      stage: 'resource',
      seats: 12,
      audience: 'SF builders',
      outcome: 'second meetings',
      dateWindows: ['Thu eve', 'Fri eve', 'Sat aft'],
      venue: { name: 'Mission loft', confirmed: false },
    },
    outreach: [],
    offers: { sponsor: [], venue: [], volunteer: [] },
    platforms: {},
  });
  ok(
    vaguePlan.schedule?.planningPreferencesOnly === true &&
      /planning preferences only/i.test(vaguePlan.schedule?.note || '') &&
      (vaguePlan.next || []).some((n) => /planning preferences only/i.test(n)),
    'planTickNext: vague windows labeled planning preferences only',
  );
  saveStore(before);
}
// orphanOutbox: store-ref filter keeps referenced + published_url; drops unreferenced residue
{
  const odir = `/tmp/dg-events-orphan-outbox-${process.pid}`;
  try {
    fs.rmSync(odir, { recursive: true, force: true });
  } catch {
    /* */
  }
  fs.mkdirSync(odir, { recursive: true });
  fs.writeFileSync(path.join(odir, 'partiful-pf_keep.json'), JSON.stringify({ id: 'pf_keep', title: 'Keep' }));
  fs.writeFileSync(path.join(odir, 'partiful-pf_keep.txt'), 'Invite URL:\n');
  fs.writeFileSync(path.join(odir, 'partiful-pf_gone.json'), JSON.stringify({ id: 'pf_gone', title: 'Orphan residue' }));
  fs.writeFileSync(path.join(odir, 'partiful-pf_gone.txt'), 'orphan draft body');
  fs.writeFileSync(
    path.join(odir, 'partiful-pf_stale_pub.txt'),
    'Invite URL: https://partiful.com/e/live1\n--- RECORDED URL ---\nhttps://partiful.com/e/live1\n(status: published_url — no RSVP invent)\n',
  );
  ok(outboxDraftIdFromName('partiful-pf_keep.json') === 'pf_keep', 'orphanOutbox: id from name');
  const refs = collectOutboxStoreRefs({
    platforms: { partiful: [{ id: 'pf_keep', title: 'Keep' }], luma: [] },
    outreach: [{ id: 'out_1' }],
  });
  ok(refs.has('pf_keep') && refs.has('out_1'), 'orphanOutbox: collect refs');
  const pur = purgeOrphanOutboxFiles({
    store: { platforms: { partiful: [{ id: 'pf_keep' }], luma: [] }, outreach: [] },
    outboxDir: odir,
    maxDelete: 50,
  });
  ok(pur.ok && pur.deleted >= 3, 'orphanOutbox: deleted unreferenced (incl stale published)');
  ok(fs.existsSync(path.join(odir, 'partiful-pf_keep.json')), 'orphanOutbox: kept referenced');
  ok(!fs.existsSync(path.join(odir, 'partiful-pf_stale_pub.txt')), 'orphanOutbox: unreferenced published dropped');
  ok(!fs.existsSync(path.join(odir, 'partiful-pf_gone.json')), 'orphanOutbox: gone json removed');
  ok(!fs.existsSync(path.join(odir, 'partiful-pf_gone.txt')), 'orphanOutbox: gone txt removed');
  try {
    fs.rmSync(odir, { recursive: true, force: true });
  } catch {
    /* */
  }
}
// Best-effort cleanup of this process's tmp store (leave others alone)
try {
  fs.unlinkSync(SELFTEST_STORE);
  try {
    fs.unlinkSync(SELFTEST_STORE + '.bak');
  } catch {
    /* */
  }
  try {
    fs.rmSync(SELFTEST_OUTBOX, { recursive: true, force: true });
  } catch {
    /* */
  }
} catch {
  /* */
}

if (errs.length) {
  console.error('EVENTS-BOT SELFTEST FAIL');
  errs.forEach((e) => console.error('-', e));
  process.exit(1);
}
console.log(
  JSON.stringify({
    ok: true,
    freeVenues: FREE_SF_VENUES.length,
    checks,
  }),
);
