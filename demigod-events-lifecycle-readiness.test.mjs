import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  canAdvanceStage,
  eventAudienceBrief,
  eventsBotAgentTick,
  hasFutureDateTime,
  openNativeRsvps,
  parseStageAdvanceIntent,
  planTickNext,
  reconcilePlatformDrafts,
  recordInviteUrl,
  runTool,
  rsvpRemindersReady,
  saveStore,
  seedNextFromDebrief,
} from './demigod-events-bot-agent.mjs';

const event = {
  title: 'SF Night',
  audience: 'SF builders',
  outcome: 'two real follow-ups',
  seats: 12,
  agenda: 'Run of show',
  guestMix: { cohorts: [{ label: 'builders' }] },
  inviteDraft: 'Invite copy',
  venue: { name: 'Mission loft', capacity: 24, confirmed: true, confirmationEvidence: 'Venue host confirmed by email' },
};

test('audience brief rejects planning cohorts when audience string is empty', () => {
  const brief = eventAudienceBrief({
    outcome: 'two real follow-ups',
    guestMix: {
      cohorts: [
        { label: 'core participants', fit: 'aligned' },
        { label: 'adjacent builders' },
      ],
    },
  });
  assert.equal(brief.ok, false);
  assert.equal(brief.audience, '');
  assert.deepEqual(brief.missing, ['audience']);
});

test('pre-plan reconciliation removes synthetic native invite artifacts without RSVPs', () => {
  const id = 'ev_resource';
  const native = `https://www.trydemigod.com/?p=event&id=${id}`;
  const store = {
    activeEvent: {
      id,
      title: 'SF Night',
      stage: 'resource',
      inviteUrl: native,
      published_url: native,
      publishedUrl: native,
      rsvpTally: { source: 'demigod_native', yes: 4 },
    },
    events: [],
    rsvps: [],
    platforms: {
      demigod: [
        { id: `dg_${id}`, eventId: id, inviteUrl: native },
        { id: 'dg_other', eventId: 'ev_other' },
      ],
      partiful: [{ id: 'pf_live', eventId: id, status: 'published_url' }],
    },
  };

  assert.equal(reconcilePlatformDrafts(store), 5);
  assert.deepEqual(store.platforms.demigod, [{ id: 'dg_other', eventId: 'ev_other' }]);
  assert.equal(store.platforms.partiful.length, 1);
  for (const field of ['inviteUrl', 'published_url', 'publishedUrl', 'rsvpTally']) {
    assert.equal(field in store.activeEvent, false, field);
    assert.equal(field in store.events[0], false, `snapshot ${field}`);
  }
});

test('pre-plan reconciliation preserves native artifacts only for valid yes RSVPs', () => {
  const id = 'ev_invalid_rsvps';
  const native = `https://www.trydemigod.com/?p=event&id=${id}`;
  const makeStore = (rsvps) => ({
    activeEvent: {
      id,
      stage: 'resource',
      inviteUrl: native,
      rsvpTally: { source: 'demigod_native', yes: 1 },
    },
    events: [],
    rsvps,
    platforms: { demigod: [{ id: `dg_${id}`, eventId: id }] },
  });
  for (const row of [
    { eventId: id, source: 'demigod_native', status: 'canceled', name: 'Ada', email: 'ada@example.com' },
    { eventId: id, source: 'import', status: 'yes', name: 'Ada', email: 'ada@example.com' },
    { eventId: id, source: 'demigod_native', status: 'yes', name: '', email: 'not-an-email' },
  ]) {
    const store = makeStore([row]);
    assert.equal(reconcilePlatformDrafts(store), 3);
    assert.equal(store.activeEvent.inviteUrl, undefined);
    assert.equal(store.activeEvent.rsvpTally, undefined);
    assert.deepEqual(store.platforms.demigod, []);
  }
  const valid = makeStore([
    { eventId: id, source: 'demigod_native', status: 'yes', name: 'Ada', email: 'ada@example.com' },
  ]);
  assert.equal(reconcilePlatformDrafts(valid), 0);
  assert.equal(valid.activeEvent.inviteUrl, native);
});

test('plan to RSVP requires a timezone-aware future datetime', () => {
  assert.equal(hasFutureDateTime({ dateWindows: ['Thu eve'] }), false);
  assert.equal(hasFutureDateTime({ dateWindows: ['2099-02-30T18:00:00-08:00'] }), false);
  assert.equal(hasFutureDateTime({ dateWindows: ['2099-02-28T24:00:00-08:00'] }), false);
  assert.equal(canAdvanceStage('plan', 'rsvp', { ...event, dateWindows: ['Thu eve'] }).reason, 'need_future_datetime');
  assert.equal(canAdvanceStage('plan', 'rsvp', { ...event, dateWindows: ['2020-01-01T18:00:00-07:00'] }).reason, 'need_future_datetime');
  assert.equal(canAdvanceStage('plan', 'rsvp', { ...event, dateWindows: ['2099-01-01T18:00:00-08:00'] }).ok, true);
});

test('resource to plan requires confirmed SF venue evidence', () => {
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, venue: { name: 'Mission loft' } }).reason, 'need_confirmed_venue');
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, venue: { name: 'Mission loft', confirmed: true } }).reason, 'need_confirmed_venue');
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, venue: { name: 'Mission loft', confirmed: true, confirmationEvidence: 'Venue host confirmed by email' } }).reason, 'need_venue_capacity');
});

test('native RSVP open fails closed without confirmed venue evidence', () => {
  const store = {
    activeEvent: { ...event, id: 'ev_legacy_rsvp', stage: 'rsvp', venue: { name: 'Mission loft' } },
    events: [],
    platforms: { demigod: [] },
  };
  assert.equal(openNativeRsvps(store).error, 'need_confirmed_venue');
  assert.deepEqual(store.platforms.demigod, []);
  assert.equal(store.activeEvent.inviteUrl, undefined);
  assert.equal(store.activeEvent.rsvpTally, undefined);
});

test('update_event_details cannot wipe or set vague dateWindows at plan+', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-plan-windows-'));
  const storePath = path.join(dir, 'events.json');
  const seed = {
    version: 3,
    activeEvent: {
      id: 'ev_plan_windows',
      title: 'Plan night',
      stage: 'plan',
      dateWindows: ['2099-08-01T18:30:00-07:00'],
      venue: { name: 'Loft', confirmed: true, confirmationEvidence: 'email' },
    },
    events: [],
  };
  fs.writeFileSync(storePath, JSON.stringify(seed));
  const priorStore = process.env.DEMIGOD_EVENTS_STORE;
  try {
    process.env.DEMIGOD_EVENTS_STORE = storePath;
    const wipe = runTool('update_event_details', { dateWindows: [] });
    assert.equal(wipe.error, 'dateWindows_required');
    assert.deepEqual(JSON.parse(fs.readFileSync(storePath, 'utf8')).activeEvent.dateWindows, [
      '2099-08-01T18:30:00-07:00',
    ]);
    const vague = runTool('update_event_details', { dateWindows: ['Thu eve'] });
    assert.equal(vague.error, 'future_datetime_required');
    assert.deepEqual(JSON.parse(fs.readFileSync(storePath, 'utf8')).activeEvent.dateWindows, [
      '2099-08-01T18:30:00-07:00',
    ]);
    const ok = runTool('update_event_details', { dateWindows: ['2099-09-01T19:00:00-07:00'] });
    assert.equal(ok.ok, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(storePath, 'utf8')).activeEvent.dateWindows, [
      '2099-09-01T19:00:00-07:00',
    ]);
  } finally {
    if (priorStore === undefined) delete process.env.DEMIGOD_EVENTS_STORE;
    else process.env.DEMIGOD_EVENTS_STORE = priorStore;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('resource stage cannot open or record native invites (no re-stamp before RSVP readiness)', () => {
  const id = 'ev_resource_restamp';
  const native = `https://www.trydemigod.com/?p=event&id=${id}`;
  const store = {
    activeEvent: {
      id,
      title: 'SoMa probe',
      stage: 'resource',
      seats: 12,
      outcome: 'two follow-ups',
      guestMix: { cohorts: [{ label: 'builders' }] },
      venue: { name: 'Sponsor café (ask)', confirmed: false },
      dateWindows: ['Thu eve'],
    },
    events: [],
    rsvps: [],
    platforms: { demigod: [] },
  };
  assert.equal(openNativeRsvps(store).error, 'rsvp_stage_required');
  assert.equal(
    recordInviteUrl(store, { platform: 'demigod', id: 'dg_' + id, url: native }).error,
    'rsvp_stage_required',
  );
  store.activeEvent.stage = 'plan';
  store.activeEvent.venue = {
    name: 'Confirmed room',
    confirmed: true,
    confirmationEvidence: 'Host confirmation',
    capacity: 20,
  };
  assert.equal(
    recordInviteUrl(store, { platform: 'demigod', id: 'dg_' + id, url: native }).error,
    'rsvp_stage_required',
  );
  assert.equal(store.activeEvent.inviteUrl, undefined);
  assert.equal(store.activeEvent.rsvpTally, undefined);
  assert.deepEqual(store.platforms.demigod, []);
});

test('resource to plan rejects a confirmed venue below the target seats', () => {
  const venue = {
    name: 'Mission loft',
    city: 'San Francisco',
    confirmed: true,
    confirmationEvidence: 'Venue host confirmed by email',
  };
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, venue }).reason, 'need_venue_capacity');
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, venue: { ...venue, capacity: 'unknown' } }).reason, 'need_venue_capacity');
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, venue: { ...venue, capacity: 8 } }).reason, 'venue_capacity_below_seats');
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, venue: { ...venue, capacity: 12 } }).ok, true);
  assert.equal(canAdvanceStage('resource', 'plan', { ...event, audience: '', venue: { ...venue, capacity: 12 } }).reason, 'need_audience_outcome_and_seats');
});

test('plan to RSVP rechecks confirmed SF venue evidence', () => {
  const legacyInvalid = { ...event, venue: { name: 'Mission loft' }, dateWindows: ['2099-01-01T18:00:00-08:00'] };
  assert.equal(canAdvanceStage('plan', 'rsvp', legacyInvalid).reason, 'need_confirmed_venue');
});

test('plan+ rejects a legacy event without a positive integer seat target', () => {
  for (const seats of [undefined, 0, 1.5]) {
    assert.equal(canAdvanceStage('plan', 'rsvp', { ...event, seats }).reason, 'need_audience_outcome_and_seats');
  }
});

test('resource to plan rejects the canonical ask-only venue with no matched offer', () => {
  const event = {
    audience: 'SF builders',
    outcome: 'two real follow-ups',
    seats: 12,
    venue: { name: 'Sponsor-hosted café buyout (ask)', area: 'SF various', source: 'free_list' },
    matchedOffers: { venueId: null },
  };
  assert.equal(canAdvanceStage('resource', 'plan', event).reason, 'need_confirmed_venue');
});

test('plan owner does not recommend RSVP for an unconfirmed venue', () => {
  const plan = planTickNext({
    activeEvent: { ...event, id: 'ev_1', stage: 'plan', venue: { name: 'Sponsor café (ask)' } },
    events: [],
    outreach: [],
    offers: [],
    platforms: { partiful: [], luma: [] },
  });
  assert.match(plan.next.join('\n'), /confirm the SF venue with evidence/i);
  assert.doesNotMatch(plan.next.join('\n'), /advance to rsvp/i);
});

test('plan owner preserves the canonical future-datetime blocker and safe recovery', () => {
  const activeEvent = { ...event, id: 'ev_1', stage: 'plan', dateWindows: ['Thu eve'] };
  const store = {
    activeEvent,
    events: [],
    outreach: [],
    offers: { venue: [], sponsor: [], volunteer: [] },
    platforms: { partiful: [], luma: [] },
  };
  const gate = canAdvanceStage('plan', 'rsvp', activeEvent, store);
  const plan = planTickNext(store);

  assert.equal(gate.reason, 'need_future_datetime');
  assert.equal(plan.readyToAdvance, false);
  assert.equal(plan.blocker?.reason, gate.reason);
  assert.deepEqual(plan.recovery, {
    tool: 'record_schedule',
    field: 'start',
    requiresEvidence: true,
    note: 'Record a real timezone-aware future SF datetime; never infer or invent one.',
  });
  assert.match(plan.ownerLine, /real timezone-aware future SF datetime.*record_schedule/i);
  assert.doesNotMatch(plan.next.join('\n'), /advance to rsvp/i);
});

test('run to followup requires host evidence that the night ended', () => {
  assert.equal(canAdvanceStage('run', 'followup', event, {}, 'advance to followup').reason, 'need_host_close_evidence');
  assert.equal(canAdvanceStage('run', 'followup', event, {}, 'The SF night ended').ok, true);
  assert.equal(parseStageAdvanceIntent('The event ended'), 'followup');
});

test('run planner keeps followup held until host-close evidence exists', () => {
  const activeEvent = {
    ...event,
    id: 'ev_1',
    stage: 'run',
    dayOfChecklist: ['Confirm venue access', 'Welcome guests'],
    hostFrame: 'Welcome to the SF night.',
  };
  const store = {
    activeEvent,
    events: [],
    outreach: [],
    offers: [],
    platforms: { partiful: [], luma: [] },
  };
  const gate = canAdvanceStage('run', 'followup', activeEvent, store);
  const plan = planTickNext(store);

  assert.equal(gate.reason, 'need_host_close_evidence');
  assert.equal(plan.readyToAdvance, false);
  assert.equal(plan.gateStatus, 'held');
  assert.equal(plan.blocker?.reason, gate.reason);
  assert.doesNotMatch(plan.next.join('\n'), /advance to followup/i);
  assert.match(plan.ownerLine, /host-close evidence.*night ended/i);
});

test('run intent recognizes host start evidence accepted by the gate', () => {
  assert.equal(parseStageAdvanceIntent('The event is starting now'), 'run');
});

test('followup planner keeps debrief held until real debrief evidence exists', () => {
  const activeEvent = {
    ...event,
    id: 'ev_1',
    stage: 'followup',
    outcomes: { invited: null, confirmed: null, attended: null },
  };
  const store = {
    activeEvent,
    events: [],
    outreach: [{ eventId: activeEvent.id, kind: 'thanks', status: 'queued' }],
    offers: [],
    platforms: { partiful: [], luma: [] },
  };
  const gate = canAdvanceStage('followup', 'debrief', activeEvent, store);
  const plan = planTickNext(store);

  assert.equal(gate.reason, 'need_debrief_evidence');
  assert.equal(plan.readyToAdvance, false);
  assert.equal(plan.gateStatus, 'held');
  assert.equal(plan.blocker?.reason, gate.reason);
  assert.doesNotMatch(plan.next.join('\n'), /advance to debrief/i);
  assert.match(plan.ownerLine, /record.*debrief.*evidence/i);
});

test('RSVP reminders require a dated start and real recipients', () => {
  const ready = {
    dateWindows: ['2099-01-01T18:00:00-08:00'],
    rsvpTally: { realList: true },
    outcomes: { invited: 1 },
  };
  assert.equal(rsvpRemindersReady({ ...ready, dateWindows: ['Thu eve'] }), false);
  assert.equal(rsvpRemindersReady({ ...ready, rsvpTally: { realList: false } }), false);
  assert.equal(rsvpRemindersReady({ ...ready, outcomes: { invited: null } }), false);
  assert.equal(rsvpRemindersReady(ready), true);
});

test('RSVP owner plan names the missing reminder prerequisite', () => {
  const plan = planTickNext({
    activeEvent: { ...event, id: 'ev_1', stage: 'rsvp', dateWindows: ['Thu eve'], rsvpTally: { openedAt: '2026-07-21T00:00:00Z' } },
    events: [],
    outreach: [],
    offers: [],
    platforms: { partiful: [], luma: [] },
  });
  assert.match(plan.next.join('\n'), /future SF datetime before reminder drafts/i);
  assert.doesNotMatch(plan.next.join('\n'), /queue T-3d/);
});

test('RSVP can repair a vague legacy schedule before reminders', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-events-schedule-'));
  const storePath = path.join(tempDir, 'events.json');
  const priorStore = process.env.DEMIGOD_EVENTS_STORE;
  try {
    process.env.DEMIGOD_EVENTS_STORE = storePath;
    saveStore({ activeEvent: { id: 'ev_1', stage: 'rsvp', dateWindows: ['Thu eve'] }, events: [] });
    const result = runTool('record_schedule', { eventId: 'ev_1', start: '2099-01-01T18:00:00-08:00' });
    assert.equal(result.ok, true);
  } finally {
    if (priorStore === undefined) delete process.env.DEMIGOD_EVENTS_STORE;
    else process.env.DEMIGOD_EVENTS_STORE = priorStore;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('owner tick activates the idea seeded by the just-cleared debrief', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-events-repeat-'));
  const envKeys = ['DEMIGOD_EVENTS_STORE', 'DEMIGOD_EVENTS_OUTBOX', 'DEMIGOD_EVENTS_BOT_MOCK'];
  const priorEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const storePath = path.join(tempDir, 'events.json');

  try {
    process.env.DEMIGOD_EVENTS_STORE = storePath;
    process.env.DEMIGOD_EVENTS_OUTBOX = path.join(tempDir, 'outbox');
    process.env.DEMIGOD_EVENTS_BOT_MOCK = '1';

    const store = {
      version: 3,
      activeEvent: {
        id: 'ev_finished',
        title: 'Finished SF Night',
        stage: 'debrief',
        city: 'San Francisco',
        audience: 'SF builders',
        outcome: 'Continue the useful conversations',
        seats: 10,
        debriefNotes: 'Host-attested debrief notes',
      },
      events: [],
      ideas: [
        {
          id: 'idea_old',
          title: 'Old SF Supper Club',
          audience: 'SF builders',
          outcome: 'An older event outcome',
          seats: 12,
          needs: 'SF venue',
          city: 'San Francisco',
        },
      ],
    };
    const seeded = seedNextFromDebrief(store, { title: 'New SF Salon' });
    assert.equal(seeded.ok, true);
    fs.writeFileSync(storePath, JSON.stringify(store));

    const tick = await eventsBotAgentTick({ goal: 'Drive the seeded follow-on night', maxSteps: 1 });
    const after = JSON.parse(fs.readFileSync(storePath, 'utf8'));

    assert.equal(tick.ok, true);
    assert.equal(after.activeEvent.title, 'New SF Salon');
    assert.notEqual(after.activeEvent.title, 'Old SF Supper Club');
  } finally {
    for (const [key, value] of Object.entries(priorEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
