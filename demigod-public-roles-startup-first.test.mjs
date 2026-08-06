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
  assert.equal(startupScore({ teamSize: 5000, stage: null, tags: [] }), 1, 'big team without the wikidata tag stays unknown, not demoted');
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

test('proven non-vacuous: without profiles, big tech wins again', () => {
  // If this passed with and without the profile join, the join would be doing nothing.
  const feed = { roles: [
    ...Array.from({ length: 6 }, (_, i) => row('Anthropic', `Big Tech Role ${i}`)),
    row('Coram AI', 'GTM Recruiter'),
  ] };
  const withProfiles = publicRolesFromFeed(feed, { limit: 2, profiles: PROFILES }).roles.map((r) => r.company);
  const without = publicRolesFromFeed(feed, { limit: 2, profiles: {} }).roles.map((r) => r.company);
  assert.ok(withProfiles.includes('Coram AI'), 'with profiles: startup surfaces');
  assert.equal(without.includes('Coram AI'), false, 'without profiles: big tech dominates — proves the join is load-bearing');
});
