import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { chromium } from 'playwright';
import { publicEventView } from './demigod-events-bot-agent.mjs';

const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const start = source.indexOf('function eventsBotPublicInviteMount(root) {');
const end = source.indexOf('function communitySubmissionsMount(root) {', start);
const mountSource = source.slice(start, end).trim();

/** Read-only invite visibility matrix (ideate→closed). Pure publicEventView fixtures. */
test('public invite visibility matrix across stages and URL aliases', () => {
  const id = 'ev_invite_matrix';
  const native = `https://www.trydemigod.com/?p=event&id=${id}`;
  const partiful = 'https://partiful.com/e/matrix-night';
  const luma = 'https://lu.ma/matrix-night';
  const junk = 'https://example.com/fake-invite';
  const base = {
    id,
    title: 'Matrix night',
    city: 'San Francisco',
    audience: { summary: 'SF builders', cohorts: [{ label: 'PRIVATE' }], note: 'ops-only' },
    outcome: 'Honest intros',
    seats: 12,
    venue: { name: 'Confirmed loft', area: 'SoMa', confirmed: true },
    dateWindows: ['Fri 7pm PT'],
    hostFrame: 'PRIVATE_HOST',
  };
  const staleYes = [{ eventId: id, status: 'yes', email: 'guest@example.org' }];

  const stages = ['ideate', 'resource', 'plan', 'rsvp', 'run', 'followup', 'debrief'];
  for (const stage of stages) {
    const publicDetails = ['rsvp', 'run', 'followup', 'debrief'].includes(stage);
    // Alias fields: only demigod-shaped native URLs surface; prefer published_url chain.
    for (const aliases of [
      { published_url: native, publishedUrl: partiful, inviteUrl: luma },
      { published_url: null, publishedUrl: native, inviteUrl: partiful },
      { published_url: null, publishedUrl: null, inviteUrl: native },
      { published_url: junk, publishedUrl: partiful, inviteUrl: luma },
      { published_url: partiful, publishedUrl: luma, inviteUrl: null },
    ]) {
      const store = {
        activeEvent: { ...base, stage, ...aliases },
        rsvps: staleYes,
        platforms: {
          demigod: [{ id: 'dg1', eventId: id, status: 'published_url', inviteUrl: native }],
          partiful: [{ id: 'pf1', eventId: id, status: 'published_url', inviteUrl: partiful }],
          luma: [{ id: 'lm1', eventId: id, status: 'published_url', inviteUrl: luma }],
        },
      };
      const view = publicEventView(store, id);
      assert.equal(view.ok, true, `${stage}: ok`);
      const ev = view.event;
      assert.equal(ev.stage, stage);
      assert.equal(ev.title, publicDetails ? base.title : '', `${stage}: title`);
      assert.equal(ev.audience, publicDetails ? base.audience : null, `${stage}: audience`);
      assert.equal(ev.outcome, publicDetails ? base.outcome : '', `${stage}: outcome`);
      assert.equal(ev.seats, publicDetails ? base.seats : null, `${stage}: seats`);
      assert.equal(ev.rsvpYes, publicDetails ? 1 : 0, `${stage}: rsvpYes gated`);
      assert.equal(ev.dateWindows, publicDetails ? base.dateWindows : null, `${stage}: dates`);
      assert.equal(
        ev.venue?.name || null,
        publicDetails ? 'Confirmed loft' : null,
        `${stage}: venue`,
      );
      const expectedInvite = publicDetails
        ? [aliases.published_url, aliases.publishedUrl, aliases.inviteUrl].find(
            (u) => typeof u === 'string' && /trydemigod\.com\/\?p=event&id=/.test(u),
          ) || null
        : null;
      assert.equal(ev.inviteUrl, expectedInvite, `${stage}: native invite only when public`);
      // Native intake opens only at stage=rsvp when demigod-shaped invite evidence matches id
      // (activeEvent alias OR platforms.demigod). This matrix always seeds platforms.demigod.
      assert.equal(ev.rsvpOpen, stage === 'rsvp', `${stage}: rsvpOpen only at rsvp + native evidence`);
      assert.equal('hostFrame' in ev, false, `${stage}: no hostFrame leak`);
    }
  }

  // Closed native intake after open: rsvp stage + matching native URL → open; run closes.
  const openStore = {
    activeEvent: {
      ...base,
      stage: 'rsvp',
      published_url: native,
      inviteUrl: native,
      rsvpTally: { openedAt: '2026-07-22T00:00:00.000Z', channel: 'Demigod native RSVP' },
    },
    rsvps: staleYes,
    platforms: { demigod: [{ id: 'dg1', eventId: id, status: 'published_url', inviteUrl: native }] },
  };
  assert.equal(publicEventView(openStore, id).event.rsvpOpen, true, 'rsvp+native open');
  assert.equal(publicEventView(openStore, id).event.inviteUrl, native);
  assert.equal(publicEventView(openStore, id).event.rsvpYes, 1);
  openStore.activeEvent.stage = 'run';
  assert.equal(publicEventView(openStore, id).event.rsvpOpen, false, 'run closes native');
  assert.equal(publicEventView(openStore, id).event.inviteUrl, native, 'run still shows public invite');
  assert.equal(publicEventView(openStore, id).event.rsvpYes, 1, 'run still counts yes');

  // External Partiful/Luma alone: never native open; inviteUrl stays null (demigod-shaped only).
  for (const stage of ['resource', 'rsvp', 'run']) {
    for (const url of [partiful, luma]) {
      const external = {
        activeEvent: { ...base, stage, published_url: url, inviteUrl: url },
        rsvps: staleYes,
        platforms: {},
      };
      const ev = publicEventView(external, id).event;
      assert.equal(ev.inviteUrl, null, `${stage} external ${url}: no demigod invite`);
      assert.equal(ev.rsvpOpen, false, `${stage} external: native closed`);
      assert.equal(ev.rsvpYes, stage === 'resource' ? 0 : 1, `${stage} external rsvpYes`);
    }
  }
});

test('public invite names the native Demigod RSVP flow', () => {
  assert.match(source, /<button type="submit" class="dg-ev-submit" id="dg-ev-rsvp-submit">RSVP yes<\/button>/);
  assert.match(source, /Demigod Events — real RSVPs only\. We do not invent guest counts\./);
  assert.doesNotMatch(source, /<strong>RSVP<\/strong><small>Tally/);
});

test('public invite visibly renders only the public audience summary', async () => {
  assert.ok(start >= 0 && end > start, 'public invite mount source is missing');
  assert.match(mountSource, /\['For', ev\.audience && ev\.audience\.summary\]/);
  assert.match(mountSource, /document\.createTextNode/);
  assert.doesNotMatch(mountSource, /audience\.(?:cohorts|note)|guestMix|target/);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('http://invite.fixture.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body:
          '<main id="root">' +
          '<h1 id="dg-ev-pub-title"></h1><p id="dg-ev-pub-meta"></p>' +
          '<div id="dg-ev-pub-body"></div>' +
          '<form id="dg-ev-rsvp-form"><input id="dg-ev-rsvp-eid">' +
          '<p id="dg-ev-rsvp-msg"></p></form></main>',
      }),
    );
    await page.goto('http://invite.fixture.test/?p=event&id=ev_fixture');
    await page.evaluate(
      ({ code, payload }) => {
        window.dgEventsBotPickBase = () => Promise.resolve({ base: 'http://events.fixture.test' });
        window.dgEventsBotFetch = () => Promise.resolve({ json: () => Promise.resolve(payload) });
        const mount = (0, eval)('(' + code + ')');
        mount(document.querySelector('#root'));
      },
      {
        code: mountSource,
        payload: {
          ok: true,
          event: {
            title: 'Fixture night',
            city: 'San Francisco',
            rsvpOpen: true,
            audience: {
              summary: 'SF AI builders < startup operators',
              cohorts: [{ label: 'PRIVATE_TARGET_6', fit: 'PRIVATE_COHORT' }],
              note: 'PRIVATE_PLANNING_NOTE',
            },
            outcome: 'Two real follow-ups',
            venue: { name: 'Venue < pending' },
          },
        },
      },
    );
    await page.waitForFunction(() =>
      document.querySelector('#dg-ev-pub-body')?.textContent.includes('SF AI builders'),
    );

    const rendered = await page.evaluate(() => {
      const body = document.querySelector('#dg-ev-pub-body');
      const form = document.querySelector('#dg-ev-rsvp-form');
      return {
        text: body.textContent,
        html: body.innerHTML,
        labels: [...body.querySelectorAll('strong')].map((el) => el.textContent),
        beforeForm: Boolean(body.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });
    assert.deepEqual(rendered.labels, ['For:', 'Outcome:', 'Venue:']);
    assert.match(rendered.text, /For: SF AI builders < startup operators/);
    assert.equal(rendered.beforeForm, true);
    assert.match(rendered.html, /SF AI builders &lt; startup operators/);
    assert.doesNotMatch(rendered.text, /PRIVATE_|target|planning note/i);
  } finally {
    await browser.close();
  }
});
