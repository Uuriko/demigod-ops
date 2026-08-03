import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildLumaDraft,
  canAdvanceStage,
  defaultGuestMix,
  eventAudienceBrief,
  loadStore,
  runTool,
} from './demigod-events-bot-agent.mjs';

const storePath = `/tmp/dg-events-audience-brief-${process.pid}.json`;
process.env.DEMIGOD_EVENTS_STORE = storePath;
process.env.DEMIGOD_EVENTS_BOT_MOCK = '1';

test('a specific audience survives idea → event → invite output', () => {
  const fixture = {
    title: 'Mission Production AI Exchange',
    format: 'small builder social with hands-on table prompts',
    audience: 'San Francisco applied-AI engineers and product leads shipping at young startups',
    outcome: 'Trade deployment fixes, compare working prototypes, and leave with two useful peers',
    seats: 28,
    needs: 'Mission venue with casual games, drinks partner, and two community hosts',
    sponsorable: 'Hosted refreshments and a recurring community slot',
    source: 'bot',
  };

  try {
    const planningOnly = {
      outcome: fixture.outcome,
      seats: fixture.seats,
      guestMix: { status: 'planning_target', cohorts: [{ label: fixture.audience }] },
    };
    assert.deepEqual(eventAudienceBrief(planningOnly), {
      ok: false,
      audience: '',
      outcome: fixture.outcome,
      missing: ['audience'],
    });
    assert.equal(
      canAdvanceStage('ideate', 'resource', planningOnly).reason,
      'need_audience_outcome_and_seats',
    );

    const recorded = runTool('record_idea', fixture);
    assert.equal(recorded.ok, true);
    const spun = runTool('spin_up_event', {
      title: fixture.title,
      audience: fixture.audience,
      outcome: fixture.outcome,
      seats: fixture.seats,
      notes: fixture.needs,
      dateWindows: ['2099-07-24T18:30:00-07:00'],
    });
    assert.equal(spun.ok, true);

    const active = loadStore().activeEvent;
    assert.equal(active.audience, fixture.audience);
    assert.equal(defaultGuestMix(active).cohorts[0].fit, fixture.audience);
    assert.equal(canAdvanceStage('ideate', 'resource', active).ok, true);

    const luma = buildLumaDraft({ description: 'A practical evening built around peer exchange.' }, active);
    assert.equal(luma.ok, true);
    assert.match(luma.draft.description, new RegExp(`For: ${fixture.audience}`));
    assert.match(luma.draft.exportText, new RegExp(`Guest frame: ${fixture.audience}`));

    const withPlanningMix = loadStore();
    withPlanningMix.activeEvent.guestMix = defaultGuestMix(withPlanningMix.activeEvent);
    fs.writeFileSync(storePath, JSON.stringify(withPlanningMix));
    const updatedAudience = 'San Francisco startup engineering leads comparing production systems';
    const updated = runTool('update_event_details', { audience: updatedAudience, seats: 11 });
    assert.equal(updated.ok, true);
    assert.equal(updated.activeEvent.guestMix.seats, 11);
    assert.equal(updated.activeEvent.guestMix.cohorts[0].fit, updatedAudience);

    const stale = loadStore();
    delete stale.activeEvent.audience;
    stale.activeEvent.guestMix = defaultGuestMix(stale.activeEvent);
    const native = `https://www.trydemigod.com/?p=event&id=${stale.activeEvent.id}`;
    Object.assign(stale.activeEvent, {
      inviteUrl: native,
      published_url: native,
      publishedUrl: native,
      rsvpTally: { source: 'demigod_native', yes: 4 },
    });
    stale.platforms.demigod = [{ id: `dg_${stale.activeEvent.id}`, eventId: stale.activeEvent.id, inviteUrl: native }];
    fs.writeFileSync(storePath, JSON.stringify(stale));

    assert.equal(runTool('record_idea', fixture).deduped, true);
    const repaired = loadStore();
    assert.equal(repaired.activeEvent.audience, fixture.audience);
    assert.equal(repaired.activeEvent.guestMix.cohorts[0].fit, fixture.audience);
    assert.deepEqual(repaired.platforms.demigod, []);
    for (const field of ['inviteUrl', 'published_url', 'publishedUrl', 'rsvpTally']) {
      assert.equal(field in repaired.activeEvent, false, field);
    }
  } finally {
    for (const file of [storePath, storePath + '.bak']) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
});
