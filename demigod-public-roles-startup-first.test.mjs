#!/usr/bin/env node
// Guard: the public roles directory must feature STARTUP roles, not established big tech.
//
// Before this guard the sort was geo -> date -> company-name, with no startup signal and no
// per-company cap. Whichever large employer posted the most SF roles filled the list, and the
// alphabetical tiebreak made it literally Airbnb / Anthropic / Astro Mechanica — 5 of 8 slots
// were Anthropic. Demigod's surface is SF *startup* talent.
//
//   node --test demigod-public-roles-startup-first.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicRolesFromFeed, startupScore, companyKey } from './demigod-public-roles.mjs';

// Real shapes from DEMIGOD-SF-STARTUP-MAP.json.
const PROFILES = {
  anthropic: { teamSize: null, stage: null, tags: ['wikidata-sf-tech'] },
  openai: { teamSize: null, stage: null, tags: ['wikidata-sf-tech'] },
  airbnb: { teamSize: null, stage: null, tags: ['yc', 'wikidata-sf-tech'] },
  astromechanica: { teamSize: 52, stage: 'Early', tags: ['yc', 'YC Winter 2024'] },
  coramai: { teamSize: 12, stage: 'Early', tags: ['yc'] },
};

const row = (company, title, at = '2026-08-05') => ({
  company, title, url: `https://boards.example.com/${companyKey(company)}/${encodeURIComponent(title)}`,
  firstObservedAt: at, location: 'San Francisco, CA',
});

test('startupScore separates YC-shaped startups from established big tech', () => {
  assert.equal(startupScore(PROFILES.astromechanica), 2, 'small team + stage => startup');
  assert.equal(startupScore(PROFILES.anthropic), 0, 'wikidata-listed, no team/stage => established');
  assert.equal(startupScore(PROFILES.airbnb), 0, 'a YC tag alone does not make a 7000-person company a startup');
  assert.equal(startupScore(undefined), 1, 'unknown company is never punished for missing data');
  // Known headcount over the ceiling is established evidence — stage labels like "Growth" must not
  // promote Gusto/Faire-class firms onto the startup rail (pre-fix they scored 2 via stage alone).
  assert.equal(startupScore({ teamSize: 2400, stage: 'Growth', tags: ['yc'] }), 0, '2400 + Growth is not a startup');
  assert.equal(startupScore({ teamSize: 750, stage: 'Growth', tags: ['yc'] }), 0, '750 + Growth is over the ceiling');
  assert.equal(startupScore({ teamSize: 65, stage: 'Growth', tags: ['yc'] }), 2, '65 + Growth is still startup-sized');
  assert.equal(startupScore({ teamSize: null, stage: 'Early', tags: ['yc'] }), 2, 'stage without headcount still counts');
  assert.equal(startupScore({ teamSize: 5000, stage: null, tags: [] }), 0, 'known large headcount demotes even without wikidata');
});

test('startups outrank big tech even when big tech posts far more roles', () => {
  // The exact failure: Anthropic floods the feed, alphabetical tiebreak favours A-names.
  const feed = { roles: [
    ...Array.from({ length: 10 }, (_, i) => row('Anthropic', `Big Tech Role ${i}`)),
    row('Airbnb', 'Product Manager, Search'),
    row('Coram AI', 'GTM Recruiter'),
    row('Astro Mechanica', 'Chief Engineer'),
  ] };
  const { roles } = publicRolesFromFeed(feed, { limit: 4, profiles: PROFILES });
  const companies = roles.map((r) => r.company);
  assert.ok(companies.includes('Coram AI'), `startup must appear: ${companies.join(', ')}`);
  assert.ok(companies.includes('Astro Mechanica'), `startup must appear: ${companies.join(', ')}`);
  assert.equal(companies[0] === 'Anthropic' || companies[0] === 'Airbnb', false, 'big tech must not lead');
});

test('no company may take more than two slots', () => {
  const feed = { roles: Array.from({ length: 9 }, (_, i) => row('Coram AI', `Role ${i}`)) };
  const { roles } = publicRolesFromFeed(feed, { limit: 6, profiles: PROFILES });
  // Only one company exists in the feed, so overflow refill is expected to top the list back up;
  // what must hold is that the CAP applied before overflow, not that rows were discarded.
  const capped = publicRolesFromFeed(
    { roles: [...feed.roles, row('Astro Mechanica', 'Chief Engineer')] },
    { limit: 3, profiles: PROFILES },
  ).roles;
  const counts = capped.reduce((m, r) => (m[r.company] = (m[r.company] || 0) + 1, m), {});
  assert.ok(counts['Coram AI'] <= 2, `one company took ${counts['Coram AI']} of 3 slots`);
  assert.ok(capped.some((r) => r.company === 'Astro Mechanica'), 'cap must leave room for other employers');
  assert.equal(roles.length, 6, 'a short feed still fills the list via overflow');
});

test('salary-stuffed titles yield to quieter ones at equal startup/geo rank', () => {
  const feed = { roles: [
    row('Coram AI', 'Head of Eng — Remote, $200-$400k/yr + equity'),
    row('Astro Mechanica', 'Chief Engineer, Defense'),
  ] };
  const { roles } = publicRolesFromFeed(feed, { limit: 2, profiles: PROFILES });
  assert.equal(roles[0].company, 'Astro Mechanica', 'quiet title leads when both are startups');
  assert.equal(roles[1].company, 'Coram AI', 'comp-in-title still eligible, just deprioritized');
});

test('when enough quiet titles exist, salary-stuffed rows leave the primary rail', () => {
  const feed = { roles: [
    row('Astro Mechanica', 'Chief Engineer, Defense'),
    row('Coram AI', 'GTM Recruiter'),
    row('AIOS', 'Head of Eng — Remote, $200-$400k/yr + equity'),
  ] };
  // limit 2 + two quiet startups → AIOS must not take a primary slot
  const { roles } = publicRolesFromFeed(feed, { limit: 2, profiles: {
    ...PROFILES,
    aios: { teamSize: 100, stage: 'Early', tags: ['yc'] },
  } });
  assert.deepEqual(roles.map((r) => r.company).sort(), ['Astro Mechanica', 'Coram AI']);
  assert.equal(roles.some((r) => r.company === 'AIOS'), false, 'noise title dropped when quiet fill exists');
});

test('proven non-vacuous: without profiles, big tech wins again', () => {
  // If this passed with and without the profile join, the join would be doing nothing.
  const feed = { roles: [
    ...Array.from({ length: 6 }, (_, i) => row('Anthropic', `Big Tech Role ${i}`)),
    row('Coram AI', 'GTM Recruiter'),
  ] };
  /* Assert ORDER, not membership. This originally checked that Coram AI was ABSENT without
     profiles — true when PER_COMPANY_MAX was 2, because Anthropic filled both slots. Another
     change lowered the cap to 1, so the spread alone surfaces a second company and both lists
     contained Coram AI: the fixture stopped distinguishing the two behaviours and the "proof"
     could no longer fail. Order survives cap changes — with the join, the startup LEADS. */
  const withProfiles = publicRolesFromFeed(feed, { limit: 2, profiles: PROFILES }).roles.map((r) => r.company);
  const without = publicRolesFromFeed(feed, { limit: 2, profiles: {} }).roles.map((r) => r.company);
  assert.equal(withProfiles[0], 'Coram AI', `with profiles the startup must lead, got ${withProfiles.join(', ')}`);
  assert.equal(without[0], 'Anthropic', `without profiles big tech leads, got ${without.join(', ')} — if this changes the join is no longer load-bearing`);
});
