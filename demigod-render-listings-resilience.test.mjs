/**
 * Behavioral proof: community feed isolation for renderListings.
 * Buggy model = Promise.all (one reject hides the other + blocks enrich).
 * Fixed model = Promise.allSettled (disk demigod-foot-core.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const mount = foot.slice(foot.indexOf('function communitySubmissionsMount'), foot.indexOf('function closePage'));

/** Mirrors pre-fix renderListings fetch coupling. */
async function loadListingsBuggy(get) {
  const results = await Promise.all([get('/community-events'), get('/community-startups')]);
  const events = results[0].events || [];
  const startups = results[1].startups || [];
  return { events, startups, enrich: true };
}

/** Mirrors disk renderListings isolation (Promise.allSettled + startupsOk gate). */
async function loadListingsFixed(get) {
  const settled = await Promise.allSettled([get('/community-events'), get('/community-startups')]);
  const eventsOk = settled[0].status === 'fulfilled';
  const startupsOk = settled[1].status === 'fulfilled';
  const events = eventsOk ? (settled[0].value.events || []) : [];
  const startups = startupsOk ? (settled[1].value.startups || []) : [];
  return { eventsOk, startupsOk, events, startups, enrich: startupsOk };
}

function getWith(eventsResult, startupsResult) {
  return async (path) => {
    if (path === '/community-events') {
      if (eventsResult instanceof Error) throw eventsResult;
      return eventsResult;
    }
    if (path === '/community-startups') {
      if (startupsResult instanceof Error) throw startupsResult;
      return startupsResult;
    }
    throw new Error('unexpected path ' + path);
  };
}

const eventRow = { id: 'ev1', title: 'Night' };
const startupRow = { id: 'su1', name: 'Acme' };

test('buggy Promise.all: events failure hides valid startups and blocks enrich', async () => {
  await assert.rejects(
    () => loadListingsBuggy(getWith(new Error('events down'), { startups: [startupRow] })),
    /events down/,
  );
});

test('buggy Promise.all: startups failure hides valid events', async () => {
  await assert.rejects(
    () => loadListingsBuggy(getWith({ events: [eventRow] }, new Error('startups down'))),
    /startups down/,
  );
});

test('fixed allSettled: events failure still returns startups and enriches map', async () => {
  const out = await loadListingsFixed(getWith(new Error('events down'), { startups: [startupRow] }));
  assert.equal(out.eventsOk, false);
  assert.equal(out.startupsOk, true);
  assert.deepEqual(out.startups, [startupRow]);
  assert.equal(out.enrich, true);
  assert.deepEqual(out.events, []);
});

test('fixed allSettled: startups failure still returns events and skips enrich', async () => {
  const out = await loadListingsFixed(getWith({ events: [eventRow] }, new Error('startups down')));
  assert.equal(out.eventsOk, true);
  assert.equal(out.startupsOk, false);
  assert.deepEqual(out.events, [eventRow]);
  assert.equal(out.enrich, false);
  assert.deepEqual(out.startups, []);
});

test('fixed allSettled: both ok keeps both feeds and enriches', async () => {
  const out = await loadListingsFixed(getWith({ events: [eventRow] }, { startups: [startupRow] }));
  assert.equal(out.eventsOk, true);
  assert.equal(out.startupsOk, true);
  assert.deepEqual(out.events, [eventRow]);
  assert.deepEqual(out.startups, [startupRow]);
  assert.equal(out.enrich, true);
});

test('disk foot uses allSettled isolation, not coupled Promise.all', () => {
  assert.match(mount, /Promise\.allSettled\(\[[\s\S]*?get\('\/community-events'\)[\s\S]*?get\('\/community-startups'\)[\s\S]*?\]\)/);
  assert.doesNotMatch(mount, /Promise\.all\(\[[\s\S]*?get\('\/community-events'\)[\s\S]*?get\('\/community-startups'\)/);
  assert.match(mount, /if \(startupsOk\) \{\s*window\.dgCommunityStartups = startups;/);
  assert.match(mount, /DemigodStartupMap\.addCommunityStartups\(startups\)/);
});
