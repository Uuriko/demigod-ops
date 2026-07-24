import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const agentSource = fs.readFileSync(path.join(ROOT, 'demigod-events-bot-agent.mjs'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'demigod-events-app.mjs'), 'utf8');
const onlineSource = fs.readFileSync(path.join(ROOT, 'demigod-events-online.mjs'), 'utf8');
const pageSource = fs.readFileSync(path.join(ROOT, 'demigod-events.html'), 'utf8');

test('background Events Bot cannot create or publish externally', () => {
  assert.doesNotMatch(agentSource, /public-api\.luma\.com\/v1\/event\/create/);
  assert.match(agentSource, /External Luma creation requires a separate, explicitly authorized foreground action/);
  assert.doesNotMatch(onlineSource, /process\.env\.DEMIGOD_EVENTS_PUBLISH_CONFIG/);
  assert.match(onlineSource, /const wantPublish = process\.argv\.includes\('--publish-config'\)/);
});

test('public endpoints hide planning details before RSVP', () => {
  assert.match(appSource, /audience: view\.event\.audience == null \? null : publicEventAudience/);
  for (const field of ['title', 'outcome', 'seats']) {
    assert.match(appSource, new RegExp(`${field}: isPublic \\?`));
  }
});

test('public Events page does not hardcode an RSVP for an unproven event', () => {
  assert.doesNotMatch(pageSource, /<a\b[^>]*href=(['"])[^'"]*\?p=event[^'"]*\1[^>]*>[^<]*RSVP/i);
});

// Live site (trydemigod.com) fetches Events API via public tunnel host — CORS must stay open.
// Stale "tunnel CORS block" memory is not a re-dispatch signal when these headers remain wired.
test('public Events API allows browser cross-origin from live site', () => {
  assert.match(appSource, /Access-Control-Allow-Origin',\s*'\*'/);
  assert.match(appSource, /Access-Control-Allow-Methods',\s*'GET,POST,OPTIONS'/);
  assert.match(appSource, /Bypass-Tunnel-Reminder/);
  assert.match(appSource, /req\.method === 'OPTIONS'/);
  assert.match(appSource, /function cors\(res\)/);
});

async function freePort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await Promise.race([
    once(probe, 'listening'),
    once(probe, 'error').then(([error]) => Promise.reject(error)),
  ]);
  const port = probe.address().port;
  probe.close();
  await once(probe, 'close');
  return port;
}

async function waitFor(url) {
  const until = Date.now() + 10_000;
  while (Date.now() < until) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('events app did not start');
}

test('public calendar and private ideas enforce write policy', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-events-policy-'));
  const store = path.join(dir, 'events.json');
  const original = '{"version":3,"marker":"unchanged","calendarEvents":[],"activeEvent":{"id":"ev_policy","title":"Original","stage":"resource","outcome":"Test","city":"San Francisco","seats":8,"inviteUrl":"https://example.com/premature","dateWindows":["Thursday evening"],"guestMix":{"cohorts":[{"label":"SF AI builders","target":4,"fit":"shipping applied AI products"},{"label":"startup operators","target":4,"fit":"building alongside technical teams"}],"note":"private planning target"}},"offers":{"sponsor":[],"venue":[{"id":"valid","name":"SF room","email":"venue@trydemigod.com","city":"San Francisco","capacity":12,"status":"new"},{"id":"rejected","name":"Old SF room","email":"old@trydemigod.com","city":"San Francisco","capacity":12,"status":"rejected"},{"id":"oakland","name":"Oakland room","email":"east@trydemigod.com","city":"Oakland","capacity":12,"status":"new"},{"id":"foreign","name":"Other night","email":"other@trydemigod.com","city":"San Francisco","capacity":12,"status":"new","eventId":"ev_other"}],"volunteer":[]},"outreach":[{"id":"current","eventId":"ev_policy","status":"queued"},{"id":"old","eventId":"ev_other","status":"queued"},{"id":"rejected-draft","eventId":"ev_policy","status":"rejected"}],"events":[{"id":"ev_policy","title":"Original","stage":"resource"}]}\n';
  fs.writeFileSync(store, original, { mode: 0o600 });
  let port;
  try {
    port = await freePort();
  } catch (error) {
    if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
    const source = fs.readFileSync(path.join(ROOT, 'demigod-events-app.mjs'), 'utf8');
    const calendarPost = source.slice(source.indexOf("p === '/api/events-bot/calendar' && req.method === 'POST'"), source.indexOf("p === '/api/events-bot/offer'"));
    const ideaPost = source.slice(source.indexOf("p === '/api/events-bot/idea' && req.method === 'POST'"), source.indexOf("p === '/api/events-bot/feedback'"));
    const outboxGet = source.slice(source.indexOf("p === '/api/events-bot/outbox' && req.method === 'GET'"), source.indexOf("p === '/api/events-bot/invites'"));
    assert.match(calendarPost, /if \(!opsOk\(req\)\) return json\(res, 401,/);
    assert.match(ideaPost, /if \(!opsOk\(req\)\) return json\(res, 401,/);
    assert.match(outboxGet, /activeId && \['queued', 'drafted'\]\.includes\(o\?\.status\) && o\.eventId === activeId/);
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  }
    const base = `http://127.0.0.1:${port}/api/events-bot`;
    const child = spawn(process.execPath, ['demigod-events-app.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      DEMIGOD_ROOT: ROOT,
      DEMIGOD_EVENTS_STORE: store,
      DEMIGOD_EVENTS_OPS_SECRET: 'selftest-secret',
      DEMIGOD_EVENTS_OPS_OPEN: '0',
      DEMIGOD_EVENTS_BOT_MOCK: '1',
      OPENAI_API_KEY: '',
    },
    stdio: 'ignore',
  });

  try {
    await waitFor(base + '/health');
    const health = await (await fetch(base + '/health')).json();
    assert.equal('identity' in health, false, 'public health hides persona text');
    assert.equal('openai' in health, false, 'public health hides OpenAI key presence');
    assert.equal('luma' in health, false, 'public health hides Luma key presence');
    assert.equal(health.service, 'demigod-events-bot');
    const legacy = await fetch(`http://127.0.0.1:${port}/api/events`);
    const legacyPayload = await legacy.json();
    assert.equal('server' in legacyPayload, false, 'public payload hides internal bind details');
    assert.equal('lifecycle' in legacyPayload, false, 'public payload hides the internal automation playbook');
    const legacyEvent = legacyPayload.activeEvent;
    assert.equal(legacyEvent.title, '', 'legacy public payload hides pre-RSVP title');
    assert.equal(legacyEvent.hasActive, true, 'legacy public payload reports the hidden active event');
    const primitive = await fetch(base + '/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: 'null',
    });
    assert.equal(primitive.status, 400);
    assert.equal((await primitive.json()).error, 'JSON body must be an object');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'invalid JSON shape changed store bytes');

    const oversized = await fetch(base + '/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'x'.repeat(48_001) }),
    });
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).error, 'body too large');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'oversized body changed store bytes');

    const denied = await fetch(base + '/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2099-01-01', title: 'Untrusted public event' }),
    });
    assert.equal(denied.status, 401);
    assert.equal((await denied.json()).error, 'ops secret required');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'denied write changed store bytes');

    for (const seats of [-1, 2.5, 'many']) {
      const invalid = await fetch(base + '/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
        body: JSON.stringify({ date: '2099-01-01', title: 'Invalid capacity', seats }),
      });
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).error, 'seats must be a positive integer');
    }
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'invalid capacity changed store bytes');

    const unsafeOfferCapacity = await fetch(base + '/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'venue',
        name: 'Unsafe-capacity SF room',
        email: 'venue@trydemigod.com',
        city: 'San Francisco',
        capacity: Number.MAX_SAFE_INTEGER + 1,
        offer: 'A quiet SF room',
      }),
    });
    assert.equal(unsafeOfferCapacity.status, 400);
    assert.equal((await unsafeOfferCapacity.json()).error, 'capacity must be a positive whole number');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'unsafe offer capacity changed store bytes');

    const nonSfVenue = await fetch(base + '/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ date: '2099-01-01', title: 'SF dinner', venue: 'Oakland warehouse' }),
    });
    assert.equal(nonSfVenue.status, 400);
    assert.equal((await nonSfVenue.json()).error, 'SF_ONLY');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'non-SF venue changed store bytes');

    const nonSfCity = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ city: 'Oakland' }),
    });
    assert.equal(nonSfCity.status, 400);
    assert.equal((await nonSfCity.json()).error, 'SF_ONLY');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'non-SF city changed store bytes');

    for (const seats of [-1, 2.5, 'many']) {
      const invalid = await fetch(base + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
        body: JSON.stringify({ seats }),
      });
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).error, 'seats must be a positive integer');
    }
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'invalid event capacity changed store bytes');

    const rejectedIdea = await fetch(base + '/idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ title: 'Invalid capacity', audience: 'SF builders', outcome: 'meet peers', seats: -1 }),
    });
    assert.equal(rejectedIdea.status, 400);
    assert.equal((await rejectedIdea.json()).error, 'seats must be a positive integer');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'rejected idea changed store bytes');

    for (const dateWindows of ['2099-01-01T18:00:00-08:00', ['']]) {
      const invalid = await fetch(base + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
        body: JSON.stringify({ dateWindows }),
      });
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).error, 'dateWindows must be an array of nonblank strings');
    }
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'invalid event datetime changed store bytes');

    const unauthorizedSchedule = await fetch(base + '/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: 'ev_policy', start: '2099-08-01T18:30:00-07:00' }),
    });
    assert.equal(unauthorizedSchedule.status, 401);
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'unauthorized schedule changed store bytes');

    const invalidSchedule = await fetch(base + '/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ eventId: 'ev_policy', start: 'Thursday evening' }),
    });
    assert.equal(invalidSchedule.status, 400);
    assert.equal((await invalidSchedule.json()).error, 'future timezone-aware start required');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'invalid schedule changed store bytes');

    // Codex P1: bare local wall-time without Z/offset must not depend on server TZ.
    const tzLessSchedule = await fetch(base + '/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ eventId: 'ev_policy', start: '2099-08-01T18:30' }),
    });
    assert.equal(tzLessSchedule.status, 400);
    assert.equal((await tzLessSchedule.json()).error, 'future timezone-aware start required');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'tz-less schedule changed store bytes');

    const validSchedule = await fetch(base + '/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ eventId: 'ev_policy', start: '2099-08-01T18:30:00-07:00' }),
    });
    assert.equal(validSchedule.status, 200);
    assert.equal((await validSchedule.json()).start, '2099-08-01T18:30:00-07:00');
    assert.equal(JSON.parse(fs.readFileSync(store, 'utf8')).activeEvent.dateWindows[0], '2099-08-01T18:30:00-07:00');
    fs.writeFileSync(store, original, { mode: 0o600 });

    const blankSeats = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ seats: '' }),
    });
    assert.equal(blankSeats.status, 400);
    assert.equal((await blankSeats.json()).error, 'seats cannot be blank after resourcing starts');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'blank seats regressed lifecycle state');

    // plan+ must not allow empty dateWindows to wipe a committed schedule
    const planLocked = JSON.parse(original);
    planLocked.activeEvent.stage = 'plan';
    planLocked.activeEvent.dateWindows = ['2099-08-01T18:30:00-07:00'];
    planLocked.activeEvent.venue = {
      name: 'Mission loft',
      confirmed: true,
      confirmationEvidence: 'Venue host confirmed by email',
    };
    planLocked.events[0] = { ...planLocked.activeEvent };
    const planBytes = JSON.stringify(planLocked) + '\n';
    fs.writeFileSync(store, planBytes, { mode: 0o600 });
    const clearAtPlan = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ dateWindows: [] }),
    });
    assert.equal(clearAtPlan.status, 400);
    assert.equal((await clearAtPlan.json()).error, 'dateWindows_required');
    assert.equal(fs.readFileSync(store, 'utf8'), planBytes, 'empty dateWindows at plan changed store bytes');
    const vagueAtPlan = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ dateWindows: ['Thursday evening'] }),
    });
    assert.equal(vagueAtPlan.status, 400);
    assert.equal((await vagueAtPlan.json()).error, 'future_datetime_required');
    assert.equal(fs.readFileSync(store, 'utf8'), planBytes, 'vague dateWindows at plan changed store bytes');
    fs.writeFileSync(store, original, { mode: 0o600 });

    const inventedOutcomes = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ outcomes: { invited: 99, confirmed: 99 } }),
    });
    assert.equal(inventedOutcomes.status, 400);
    assert.equal((await inventedOutcomes.json()).error, 'host_attested_only');
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'unattested outcomes changed store bytes');

    for (const field of ['title', 'audience', 'outcome']) {
      const blank = await fetch(base + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
        body: JSON.stringify({ [field]: '   ' }),
      });
      assert.equal(blank.status, 400);
      assert.equal((await blank.json()).error, field + ' cannot be blank');
    }
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'blank identity update changed store bytes');

    // Incomplete mint: notes-only on empty activeEvent must not mint an id.
    const emptyStore =
      '{"version":3,"marker":"empty-mint","calendarEvents":[],"activeEvent":{"id":null,"title":"","stage":"ideate","outcome":"","seats":null,"dateWindows":[],"notes":"","updatedAt":null},"offers":{"sponsor":[],"venue":[],"volunteer":[]},"outreach":[],"events":[]}\n';
    fs.writeFileSync(store, emptyStore, { mode: 0o600 });
    const incompleteMint = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ notes: 'planning only — no identity yet' }),
    });
    assert.equal(incompleteMint.status, 400);
    assert.equal((await incompleteMint.json()).error, 'need_audience_outcome_and_seats');
    assert.equal(fs.readFileSync(store, 'utf8'), emptyStore, 'incomplete mint changed empty-store bytes');
    fs.writeFileSync(store, original, { mode: 0o600 });

    const repairedAudience = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ audience: 'founders and operators' }),
    });
    assert.equal(repairedAudience.status, 200);
    assert.equal((await repairedAudience.json()).activeEvent.audience, 'founders and operators');
    assert.equal(JSON.parse(fs.readFileSync(store, 'utf8')).activeEvent.audience, 'founders and operators');
    fs.writeFileSync(store, original);

    const calendarStore = JSON.parse(fs.readFileSync(store, 'utf8'));
    calendarStore.calendarEvents.push({
      id: 'cal_private',
      date: '2099-01-01',
      title: 'Unannounced founder dinner',
      stage: 'plan',
      time: '18:30',
      venue: 'Private SF loft',
      seats: 12,
      format: 'Dinner',
      outcome: 'Private planning outcome',
    });
    calendarStore.calendarEvents.push({
      id: 'cal_public',
      date: '2099-01-02',
      title: 'Announced founder dinner',
      stage: 'rsvp',
      time: '18:30',
      venue: 'Mission',
      seats: 12,
      format: 'Dinner',
      outcome: 'Meet peers',
    });
    fs.writeFileSync(store, JSON.stringify(calendarStore), { mode: 0o600 });
    const calendar = await fetch(base + '/calendar');
    assert.equal(calendar.status, 200);
    const calendarView = await calendar.json();
    assert.equal(calendarView.ok, true);
    assert.equal(calendarView.events.some((row) => row.id === 'cal_private'), false, 'public calendar hides pre-RSVP planning records');
    assert.equal(calendarView.events.find((row) => row.id === 'cal_public').venue, 'Mission');
    fs.writeFileSync(store, original, { mode: 0o600 });

    const lifecycle = await fetch(base + '/lifecycle');
    const lifecycleView = await lifecycle.json();
    assert.equal(lifecycleView.activeEvent.id, null, 'public lifecycle hides pre-RSVP event IDs');
    assert.equal(lifecycleView.activeEvent.title, '');
    assert.equal(lifecycleView.activeEvent.outcome, '');
    assert.equal(lifecycleView.activeEvent.seats, null);
    assert.deepEqual(lifecycleView.activeEvent.dateWindows, []);
    assert.equal(lifecycleView.activeEvent.outcomes, null, 'public lifecycle never exposes operational outcomes');
    for (const alias of ['inviteUrl', 'published_url', 'publishedUrl']) {
      assert.equal(lifecycleView.activeEvent[alias], null, `public lifecycle hides ${alias} before RSVP`);
    }
    assert.equal(lifecycleView.offerCounts.venue, 1, 'public lifecycle counts only eligible current-night offers');

    const missingRsvpEvent = await fetch(base + '/rsvps', {
      headers: { 'x-dg-events-ops': 'selftest-secret' },
    });
    assert.equal(missingRsvpEvent.status, 400);
    assert.equal((await missingRsvpEvent.json()).error, 'eventId_required');

    const offers = await fetch(base + '/offers');
    const offerView = await offers.json();
    assert.equal(offerView.counts.venue, 1, 'public offer counts exclude rejected, non-SF, and foreign-event rows');
    assert.equal('moneyIntents' in offerView.counts, false, 'public offer counts hide private financial-intent records');

    const outbox = await fetch(base + '/outbox', { headers: { 'x-dg-events-ops': 'selftest-secret' } });
    assert.deepEqual((await outbox.json()).outreach.map((row) => row.id), ['current'], 'ops outbox scopes active queued drafts');

    fs.writeFileSync(store, JSON.stringify({
      version: 3,
      activeEvent: {
        id: null,
        inviteUrl: 'https://example.com/stale',
        clearedFrom: 'ev_prior_night',
        clearedAt: '2099-01-01T00:00:00.000Z',
      },
      outreach: [{ id: 'legacy-unscoped', status: 'queued' }],
    }) + '\n');
    const idleOutbox = await fetch(base + '/outbox', { headers: { 'x-dg-events-ops': 'selftest-secret' } });
    assert.deepEqual((await idleOutbox.json()).outreach, [], 'ops outbox hides unscoped drafts between nights');
    const idleLifecycle = await fetch(base + '/lifecycle');
    const idleLifecycleView = await idleLifecycle.json();
    assert.equal(idleLifecycleView.activeEvent.inviteUrl, null, 'public lifecycle hides a cleared event invite URL');
    assert.equal(idleLifecycleView.activeEvent.clearedFrom, null, 'public lifecycle hides cleared event IDs');
    assert.equal(idleLifecycleView.activeEvent.clearedAt, null, 'public lifecycle hides cleared timestamps');
    fs.writeFileSync(store, original);

    const publicEvent = await fetch(base + '/public-event?id=ev_policy');
    assert.equal(publicEvent.status, 200);
    const publicView = await publicEvent.json();
    assert.deepEqual(
      {
        title: publicView.event.title,
        audience: publicView.event.audience,
        outcome: publicView.event.outcome,
        seats: publicView.event.seats,
      },
      { title: '', audience: null, outcome: '', seats: null },
    );
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'public audience projection changed store bytes');

    const rsvpStore = JSON.parse(original);
    rsvpStore.activeEvent.stage = 'rsvp';
    rsvpStore.activeEvent.inviteUrl = 'https://www.trydemigod.com/?p=event&id=ev_policy';
    // Audience-only nights (no guestMix) must still publish the locked audience string at RSVP+.
    rsvpStore.activeEvent.audience = 'SF operators shipping applied AI';
    delete rsvpStore.activeEvent.guestMix;
    fs.writeFileSync(store, JSON.stringify(rsvpStore), { mode: 0o600 });
    const publicAtRsvp = await (await fetch(base + '/public-event?id=ev_policy')).json();
    assert.equal(publicAtRsvp.event.audience?.summary, 'SF operators shipping applied AI');
    assert.deepEqual(publicAtRsvp.event.audience?.cohorts, []);
    assert.match(publicAtRsvp.event.audience?.note || '', /not an attendee list/i);
    const lifecycleOkInvite = await (await fetch(base + '/lifecycle')).json();
    assert.equal(
      lifecycleOkInvite.activeEvent.inviteUrl,
      'https://www.trydemigod.com/?p=event&id=ev_policy',
      'public lifecycle echoes matched native invite at RSVP+',
    );
    rsvpStore.activeEvent.inviteUrl = 'https://www.trydemigod.com/?p=event&id=ev_other_night';
    rsvpStore.activeEvent.published_url = rsvpStore.activeEvent.inviteUrl;
    rsvpStore.activeEvent.publishedUrl = rsvpStore.activeEvent.inviteUrl;
    fs.writeFileSync(store, JSON.stringify(rsvpStore), { mode: 0o600 });
    const lifecycleWrongInvite = await (await fetch(base + '/lifecycle')).json();
    for (const alias of ['inviteUrl', 'published_url', 'publishedUrl']) {
      assert.equal(
        lifecycleWrongInvite.activeEvent[alias],
        null,
        `public lifecycle hides mismatched ${alias} at RSVP+`,
      );
    }
    // Restore matched invite so concurrent RSVP intake can open.
    rsvpStore.activeEvent.inviteUrl = 'https://www.trydemigod.com/?p=event&id=ev_policy';
    rsvpStore.activeEvent.published_url = rsvpStore.activeEvent.inviteUrl;
    rsvpStore.activeEvent.publishedUrl = rsvpStore.activeEvent.inviteUrl;
    fs.writeFileSync(store, JSON.stringify(rsvpStore), { mode: 0o600 });
    const rsvpResponses = await Promise.all(
      [
        { name: 'Ada', email: 'ada@example.com' },
        { name: 'Grace', email: 'grace@example.com' },
      ].map((rsvp) =>
        fetch(base + '/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: 'ev_policy', ...rsvp }),
        }),
      ),
    );
    assert.deepEqual(rsvpResponses.map((response) => response.status), [200, 200]);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(store, 'utf8')).rsvps.map((rsvp) => rsvp.email).sort(),
      ['ada@example.com', 'grace@example.com'],
      'concurrent distinct RSVPs must both persist',
    );
    fs.writeFileSync(store, original, { mode: 0o600 });

    const deniedIdea = await fetch(base + '/idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unreviewed idea', audience: 'SF builders', outcome: 'Meet peers' }),
    });
    assert.equal(deniedIdea.status, 401);
    assert.equal(fs.readFileSync(store, 'utf8'), original, 'unauthorized idea changed store bytes');

    for (const body of [
      { title: 'Missing audience', outcome: 'Meet useful people' },
      { title: 'Missing outcome', audience: 'SF builders' },
    ]) {
      const before = fs.readFileSync(store);
      const invalidIdea = await fetch(base + '/idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
        body: JSON.stringify(body),
      });
      assert.equal(invalidIdea.status, 400);
      assert.deepEqual(fs.readFileSync(store), before, 'invalid public idea changed store bytes');
    }

    const offer = await fetch(base + '/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({
        kind: 'venue',
        name: 'SF host',
        email: 'venue@trydemigod.com',
        city: 'San Francisco',
        capacity: 12,
        offer: 'A quiet SF room for the active supper club',
      }),
    });
    assert.equal(offer.status, 200);
    assert.equal((await offer.json()).status, 'new', 'ranking must not reserve an unselected offer');

    const idea = await fetch(base + '/idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({
        title: 'San Francisco founder supper',
        outcome: 'Connect founders in San Francisco',
        audience: 'SF founders and operators building in public',
      }),
    });
    assert.equal(idea.status, 200);
    assert.equal((await idea.json()).ok, true);

    for (let i = 0; i < 21; i++) {
      const limited = await fetch(base + '/idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dg-events-ops': 'selftest-secret',
          'x-forwarded-for': `192.0.2.${i + 1}, 198.51.100.7, 127.0.0.1`,
        },
        body: JSON.stringify({
          title: `Rate limit probe ${i}`,
          audience: 'San Francisco operators testing public event tooling',
          outcome: 'Prove spoofed forwarding entries share one bucket',
          audience: 'SF operators used only for rate-limit isolation',
        }),
      });
      assert.equal(limited.status, i < 20 ? 200 : 429, 'leftmost XFF spoof rotated rate-limit bucket');
    }

    const chatJoin = await fetch(base + '/chatroom/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Fixture Visitor' }),
    });
    assert.equal(chatJoin.status, 201);
    const chatSession = await chatJoin.json();
    const reservedJoin = await fetch(base + '/chatroom/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Demigod' }),
    });
    assert.equal(reservedJoin.status, 400);
    const takenJoin = await fetch(base + '/chatroom/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'fixture visitor' }),
    });
    assert.equal(takenJoin.status, 409);
    assert.match((await takenJoin.json()).error, /already in use/i);
    const deniedChat = await fetch(base + '/chatroom/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'wrong', text: 'hello' }),
    });
    assert.equal(deniedChat.status, 401);
    const chatSend = await fetch(base + '/chatroom/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: chatSession.token, text: 'hello SF' }),
    });
    assert.equal(chatSend.status, 201);
    const deniedChatRead = await fetch(base + '/chatroom/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'wrong', since: 0 }),
    });
    assert.equal(deniedChatRead.status, 401);
    const chatRead = await fetch(base + '/chatroom/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: chatSession.token, since: 0 }),
    });
    assert.deepEqual((await chatRead.json()).messages.map((row) => [row.name, row.text]), [['Fixture Visitor', 'hello SF']]);

    const missingTitle = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizerName: 'SF Host', organizerEmail: 'host@example.com', destination: 'demigod' }),
    });
    assert.equal(missingTitle.status, 400);
    assert.match((await missingTitle.json()).error, /title required/);

    // audience+details are required before URL/venue checks (create honesty); fixtures must supply them to reach deeper gates.
    const credentialUrl = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Credential URL', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: '2099-08-01T18:30:00-07:00', format: 'online', audience: 'SF operators', details: 'Fixture reject credential URL.', destination: 'luma', externalUrl: 'https://user:pass@lu.ma/demo' }),
    });
    assert.equal(credentialUrl.status, 400);
    assert.match((await credentialUrl.json()).error, /Luma or Partiful/);

    const beforeNonSfSubmission = fs.readFileSync(store);
    const nonSfSubmission = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Community demo night', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: '2099-08-01T18:30:00-07:00', format: 'in-person', venue: 'Brooklyn, NY', audience: 'SF operators', details: 'Fixture non-SF venue.', destination: 'demigod' }),
    });
    assert.equal(nonSfSubmission.status, 400);
    assert.equal((await nonSfSubmission.json()).error, 'SF_ONLY');
    assert.deepEqual(fs.readFileSync(store), beforeNonSfSubmission, 'non-SF submission changed store bytes');

    const malformedStart = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Malformed date', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: 'sometime soon', format: 'online', audience: 'SF operators', details: 'Fixture bad startsAt.', destination: 'demigod' }),
    });
    assert.equal(malformedStart.status, 400);
    assert.match((await malformedStart.json()).error, /startsAt must be a valid timezone-aware ISO date-time/);

    const ambiguousStart = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Ambiguous date', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: 'July 1', format: 'online', audience: 'SF operators', details: 'Fixture ambiguous startsAt.', destination: 'demigod' }),
    });
    assert.equal(ambiguousStart.status, 400);
    assert.match((await ambiguousStart.json()).error, /startsAt must be a valid timezone-aware ISO date-time/);

    const timezoneMissingStart = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Timezone missing', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: '2099-08-01T18:30', format: 'online', audience: 'SF operators', details: 'Fixture tz-less startsAt.', destination: 'demigod' }),
    });
    assert.equal(timezoneMissingStart.status, 400);
    assert.match((await timezoneMissingStart.json()).error, /timezone-aware/);

    const submissionResponse = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Community demo night', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: '2099-08-01T18:30:00-07:00', format: 'in-person', venue: 'Mission', audience: 'SF builders', seats: 24, destination: 'demigod+luma', externalUrl: 'https://lu.ma/demo-community', details: 'Demos and conversation.' }),
    });
    assert.equal(submissionResponse.status, 201);
    const submission = await submissionResponse.json();
    assert.equal(submission.event.status, 'submitted');
    assert.match(submission.message, /Nothing has been published yet/);
    assert.equal(submission.event.destination, 'demigod+luma');
    assert.ok(submission.manageToken.length >= 24);
    const persistedSubmission = JSON.parse(fs.readFileSync(store, 'utf8')).eventSubmissions[0];
    assert.notEqual(persistedSubmission.manageTokenHash, submission.manageToken, 'raw management token must not persist');
    const duplicateEvent = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Community demo night', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: '2099-08-01T18:30:00-07:00', format: 'in-person', venue: 'Mission', audience: 'SF builders', seats: 24, destination: 'demigod+luma', externalUrl: 'https://lu.ma/demo-community', details: 'Demos and conversation.' }),
    });
    assert.equal(duplicateEvent.status, 409);
    assert.equal(JSON.parse(fs.readFileSync(store, 'utf8')).eventSubmissions.length, 1, 'duplicate event changed review queue');
    const laterEventResponse = await fetch(base + '/event-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Community demo night', organizerName: 'SF Host', organizerEmail: 'host@example.com', startsAt: '2099-08-08T18:30:00-07:00', format: 'in-person', venue: 'Mission', audience: 'SF builders', details: 'Second date same title.', destination: 'demigod' }),
    });
    assert.equal(laterEventResponse.status, 201, 'same organizer/title with another date is a distinct event');
    const laterEvent = await laterEventResponse.json();
    const duplicateEdit = await fetch(base + '/event-submission/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: laterEvent.event.id, manageToken: laterEvent.manageToken, patch: { startsAt: '2099-08-01T18:30:00-07:00' } }),
    });
    assert.equal(duplicateEdit.status, 409, 'management cannot merge two active submissions into one identity');

    const deniedRead = await fetch(base + '/event-submission/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: 'wrong' }),
    });
    assert.equal(deniedRead.status, 404);
    const beforeRead = fs.readFileSync(store);
    const allowedRead = await fetch(base + '/event-submission/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: submission.manageToken }),
    });
    assert.equal(allowedRead.status, 200);
    assert.equal((await allowedRead.json()).event.organizerEmail, 'host@example.com');
    assert.deepEqual(fs.readFileSync(store), beforeRead, 'submission read changed store bytes');
    const unsafeExternal = await fetch(base + '/event-submission/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: submission.manageToken, patch: { destination: 'partiful', externalUrl: 'https://example.com/not-an-invite' } }),
    });
    assert.equal(unsafeExternal.status, 400);
    assert.match((await unsafeExternal.json()).error, /Luma or Partiful/);
    const mismatchedExternal = await fetch(base + '/event-submission/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: submission.manageToken, patch: { externalUrl: 'https://partiful.com/e/demo' } }),
    });
    assert.equal(mismatchedExternal.status, 400);
    assert.match((await mismatchedExternal.json()).error, /match destination/);
    const managed = await fetch(base + '/event-submission/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: submission.manageToken, patch: { venue: 'SoMa', destination: 'demigod+partiful', externalUrl: 'https://partiful.com/e/demo' } }),
    });
    assert.equal(managed.status, 200);
    assert.equal((await managed.json()).event.venue, 'SoMa');

    const startupSubmission = await fetch(base + '/startup-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New SF Co', website: 'https://example.com', neighborhood: 'Mission', description: 'Useful software.', hiring: 'unknown', submitterName: 'Founder', submitterEmail: 'founder@example.com' }),
    });
    assert.equal(startupSubmission.status, 201);
    const startup = await startupSubmission.json();
    assert.equal(startup.ok, true);
    assert.equal(startup.message, 'Startup received for review. Submission does not guarantee a listing; only reviewed listings appear on the map.');
    const beforeNonSfStartup = fs.readFileSync(store, 'utf8');
    const nonSfStartup = await fetch(base + '/startup-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'NYC Co', website: 'https://nyc.example', neighborhood: 'Brooklyn, NY', description: 'Not SF.', hiring: 'yes', submitterName: 'Founder', submitterEmail: 'nyc@example.com' }),
    });
    assert.equal(nonSfStartup.status, 400);
    assert.equal((await nonSfStartup.json()).error, 'SF_ONLY');
    assert.equal(fs.readFileSync(store, 'utf8'), beforeNonSfStartup, 'non-SF startup neighborhood mutated store');
    const duplicateStartup = await fetch(base + '/startup-submission', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New SF Co', website: 'https://different.example', neighborhood: 'SoMa', description: 'Duplicate retry.', hiring: 'yes', submitterName: 'Founder', submitterEmail: 'founder@example.com' }),
    });
    assert.equal(duplicateStartup.status, 409);
    assert.equal(JSON.parse(fs.readFileSync(store, 'utf8')).startupSubmissions.length, 1, 'duplicate startup changed review queue');

    const hiddenBeforeReview = await fetch(base + '/community-events');
    assert.deepEqual((await hiddenBeforeReview.json()).events, []);
    const deniedReview = await fetch(base + '/submission-review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'event', id: submission.event.id, decision: 'approve', note: 'Complete SF listing verified.' }),
    });
    assert.equal(deniedReview.status, 401);
    const approvedEvent = await fetch(base + '/submission-review', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ kind: 'event', id: submission.event.id, decision: 'approve', note: 'Complete SF listing verified.' }),
    });
    assert.equal(approvedEvent.status, 200);
    assert.equal((await approvedEvent.json()).submission.status, 'approved');
    // Approve re-check: polluted store row with non-SF venue must not approve.
    const polluted = JSON.parse(fs.readFileSync(store, 'utf8'));
    polluted.eventSubmissions.push({
      id: 'evt_brooklyn',
      title: 'Brooklyn loft night',
      organizerName: 'X',
      organizerEmail: 'x@example.com',
      destination: 'demigod',
      venue: 'Brooklyn, NY',
      status: 'submitted',
    });
    fs.writeFileSync(store, JSON.stringify(polluted), { mode: 0o600 });
    const beforeNonSfApprove = fs.readFileSync(store);
    const rejectNonSfApprove = await fetch(base + '/submission-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ kind: 'event', id: 'evt_brooklyn', decision: 'approve', note: 'Looks real but out of geo.' }),
    });
    assert.equal(rejectNonSfApprove.status, 400);
    assert.equal((await rejectNonSfApprove.json()).error, 'SF_ONLY');
    assert.deepEqual(fs.readFileSync(store), beforeNonSfApprove, 'non-SF approve must not change store bytes');
    const incompleteEventStore = JSON.parse(fs.readFileSync(store, 'utf8'));
    incompleteEventStore.eventSubmissions.push({ id: 'evt_incomplete', title: 'Legacy event', status: 'submitted' });
    fs.writeFileSync(store, JSON.stringify(incompleteEventStore), { mode: 0o600 });
    const beforeIncompleteApprove = fs.readFileSync(store);
    const rejectIncompleteApprove = await fetch(base + '/submission-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ kind: 'event', id: 'evt_incomplete', decision: 'approve', note: 'Legacy row must pass current intake rules.' }),
    });
    assert.equal(rejectIncompleteApprove.status, 400);
    assert.equal((await rejectIncompleteApprove.json()).error, 'organizerName required');
    assert.deepEqual(fs.readFileSync(store), beforeIncompleteApprove, 'incomplete event approve must not change store bytes');
    const unsafeStartupStore = JSON.parse(fs.readFileSync(store, 'utf8'));
    unsafeStartupStore.startupSubmissions.push({
      id: 'startup_unsafe',
      name: 'Unsafe legacy startup',
      website: 'javascript:alert(1)',
      status: 'submitted',
    });
    fs.writeFileSync(store, JSON.stringify(unsafeStartupStore), { mode: 0o600 });
    const beforeUnsafeStartupApprove = fs.readFileSync(store);
    const rejectUnsafeStartupApprove = await fetch(base + '/submission-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ kind: 'startup', id: 'startup_unsafe', decision: 'approve', note: 'Legacy row must pass current intake rules.' }),
    });
    assert.equal(rejectUnsafeStartupApprove.status, 400);
    assert.equal((await rejectUnsafeStartupApprove.json()).error, 'website must be https');
    assert.deepEqual(fs.readFileSync(store), beforeUnsafeStartupApprove, 'unsafe startup approve must not change store bytes');
    const approvedStartup = await fetch(base + '/submission-review', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ kind: 'startup', id: startup.id, decision: 'approve', note: 'Company details operator-reviewed.' }),
    });
    assert.equal(approvedStartup.status, 200);
    assert.equal((await approvedStartup.json()).submission.status, 'approved', 'startup approve must store approved, not verified');
    const reviewedStore = JSON.parse(fs.readFileSync(store, 'utf8'));
    reviewedStore.eventSubmissions.push({ id: 'evt_past', title: 'Past listing', status: 'approved', startsAt: '2000-01-01T12:00', organizerEmail: 'private@example.com' });
    reviewedStore.eventSubmissions.push({ id: 'evt_undated', title: 'Undated listing', status: 'approved' });
    reviewedStore.eventSubmissions.push({ id: 'evt_malformed', title: 'Malformed listing', status: 'approved', startsAt: 'sometime soon' });
    reviewedStore.eventSubmissions.push({ id: 'evt_external_only', title: 'Partiful-only listing', status: 'approved', destination: 'partiful', startsAt: '2099-08-02T18:30:00-07:00', externalUrl: 'https://partiful.com/e/external-only' });
    fs.writeFileSync(store, JSON.stringify(reviewedStore), { mode: 0o600 });
    const listedEvents = await (await fetch(base + '/community-events')).json();
    assert.equal(listedEvents.events.length, 1, 'past, undated, and malformed approved events must leave the upcoming listing');
    assert.equal(listedEvents.events[0].title, 'Community demo night');
    assert.equal(listedEvents.events[0].organizerEmail, undefined);
    const listedStartups = await (await fetch(base + '/community-startups')).json();
    assert.equal(listedStartups.startups[0].name, 'New SF Co');
    assert.equal(listedStartups.startups[0].submitterEmail, undefined);

    // cont43: public list scrubs non-https links even if legacy rows were marked verified/approved
    const legacyUnsafe = JSON.parse(fs.readFileSync(store, 'utf8'));
    legacyUnsafe.startupSubmissions.push({
      id: 'startup_legacy_js',
      name: 'Legacy JS Co',
      website: 'javascript:alert(1)',
      status: 'verified',
      neighborhood: 'SoMa',
    });
    legacyUnsafe.eventSubmissions.push({
      id: 'evt_legacy_js',
      title: 'Legacy js event',
      status: 'approved',
      destination: 'demigod',
      startsAt: '2099-09-01T18:00:00-07:00',
      externalUrl: 'javascript:alert(1)',
    });
    fs.writeFileSync(store, JSON.stringify(legacyUnsafe), { mode: 0o600 });
    const scrubbedStartups = await (await fetch(base + '/community-startups')).json();
    const scrubbedLegacyStartup = scrubbedStartups.startups.find((s) => s.id === 'startup_legacy_js');
    assert.ok(scrubbedLegacyStartup, 'verified legacy startup still listed');
    assert.equal(scrubbedLegacyStartup.website, null, 'public community-startups must strip non-https website');
    const scrubbedEventsList = await (await fetch(base + '/community-events')).json();
    const scrubbedLegacyEvent = scrubbedEventsList.events.find((e) => e.id === 'evt_legacy_js');
    assert.ok(scrubbedLegacyEvent, 'approved demigod legacy event still listed');
    assert.equal(scrubbedLegacyEvent.externalUrl, null, 'public community-events must strip non-https externalUrl');
    // Drop synthetic legacy rows so later withdraw/empty-list asserts stay honest.
    const cleaned = JSON.parse(fs.readFileSync(store, 'utf8'));
    cleaned.startupSubmissions = (cleaned.startupSubmissions || []).filter((s) => s.id !== 'startup_legacy_js');
    cleaned.eventSubmissions = (cleaned.eventSubmissions || []).filter((e) => e.id !== 'evt_legacy_js');
    fs.writeFileSync(store, JSON.stringify(cleaned), { mode: 0o600 });

    const deniedWithdraw = await fetch(base + '/event-submission/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: 'wrong' }),
    });
    assert.equal(deniedWithdraw.status, 404);
    const withdrawn = await fetch(base + '/event-submission/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: submission.manageToken }),
    });
    assert.equal(withdrawn.status, 200);
    assert.equal((await withdrawn.json()).event.status, 'withdrawn');
    assert.deepEqual((await (await fetch(base + '/community-events')).json()).events, []);
    const overrideWithdrawal = await fetch(base + '/submission-review', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({ kind: 'event', id: submission.event.id, decision: 'approve', note: 'Must not override organizer.' }),
    });
    assert.equal(overrideWithdrawal.status, 409);
    assert.equal((await overrideWithdrawal.json()).error, 'organizer_withdrawn');

    const editedApproved = await fetch(base + '/event-submission/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: submission.event.id, manageToken: submission.manageToken, patch: { venue: 'Dogpatch' } }),
    });
    assert.equal(editedApproved.status, 200);
    const resubmitted = await editedApproved.json();
    assert.equal(resubmitted.event.status, 'submitted');
    assert.equal(resubmitted.event.withdrawnAt, undefined);
    assert.deepEqual((await (await fetch(base + '/community-events')).json()).events, []);

    const beforeEventUpdate = JSON.parse(fs.readFileSync(store, 'utf8'));
    beforeEventUpdate.activeEvent.audience = 'SF AI builders';
    beforeEventUpdate.activeEvent.venue = {
      name: 'SF room',
      city: 'San Francisco',
      capacity: 12,
      confirmed: true,
      confirmationEvidence: 'Fixture confirmation',
    };
    fs.writeFileSync(store, JSON.stringify(beforeEventUpdate) + '\n', { mode: 0o600 });
    const event = await fetch(base + '/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': 'selftest-secret' },
      body: JSON.stringify({
        title: 'Updated SF night',
        stage: 'plan',
        dateWindows: ['2099-08-01T18:30:00-07:00'],
      }),
    });
    assert.equal(event.status, 200);
    const saved = JSON.parse(fs.readFileSync(store, 'utf8'));
    assert.equal(saved.marker, 'unchanged', 'app write replaced existing store fields');
    assert.deepEqual(saved.activeEvent.checklist.map((item) => item.id), ['plan_agenda', 'plan_invite', 'plan_guest', 'plan_partiful']);
    assert.equal(saved.events.find((row) => row.id === saved.activeEvent.id).title, 'Updated SF night');
    assert.equal(saved.events.find((row) => row.id === saved.activeEvent.id).stage, 'plan');
    assert.equal(fs.statSync(store).mode & 0o777, 0o600, 'event store must remain private');
    assert.equal(fs.statSync(store + '.bak').mode & 0o777, 0o600, 'event backup must remain private');
  } finally {
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 1_000))]);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
