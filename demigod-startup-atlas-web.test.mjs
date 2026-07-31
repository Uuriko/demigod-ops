import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildPublicStartupMap, buildPublicVenues, buildWikidataCompanies } from './demigod-startup-map-data.mjs';

const box = (west, south, east, north) => ({
  type: 'Polygon',
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

test('public startup map contains aggregates and open geometry only', () => {
  const map = buildPublicStartupMap({
    counts: [{ neighborhood: 'Mission', count: '3', companyName: 'must-not-leak' }],
    total: '5',
    generatedAt: '2026-07-22T00:00:00Z',
    neighborhoodGeoJson: {
      type: 'FeatureCollection',
      features: [{
        properties: { nhood: 'Mission', owner: 'must-not-leak' },
        geometry: box(-122.44, 37.74, -122.40, 37.78),
      }],
    },
  });
  assert.equal(map.schema, 'demigod.sf-startup-map/3');
  assert.deepEqual(map.coverage, {
    total: 5,
    mapped: 3,
    unmapped: 2,
    neighborhoods: 1,
    namedCompanies: 0,
    venueLeads: 0,
    ycIndependentlyEvidenced: 0,
    ycPublicDirectory: 0,
    definition: map.coverage.definition,
    caveat: map.coverage.caveat,
  });
  assert.match(map.coverage.caveat, /YC-public|public YC company directory/i);
  assert.ok(map.sources.some((s) => s.license === 'YC-public'));
  assert.match(map.method.ycOss || '', /yc-oss\.github\.io/);
  assert.deepEqual(map.neighborhoods[0].count, 3);
  const serialized = JSON.stringify(map);
  for (const forbidden of ['must-not-leak', 'companyIds', 'full_business_address', 'mailing_address', 'ownership_name', 'email', 'phone', 'resume']) {
    assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false, `excluded ${forbidden}`);
  }
});

test('public venue layer keeps only bounded, non-sensitive venue facts', () => {
  const venues = buildPublicVenues([
    { id: 'in', name: 'Mission Library', area: 'Mission', capacity: 30, cost: 'free', notes: 'Community room', tags: ['library'], lat: 37.752, lng: -122.42, email: 'private@example.com' },
    { id: 'out', name: 'Not SF', lat: 38, lng: -122.42 },
  ], '2026-07-22T00:00:00Z');
  assert.equal(venues.length, 1);
  assert.equal(venues[0].availability, 'not verified');
  assert.equal(venues[0].sourceUrl, null);
  assert.equal(venues[0].sourceLicense, null);
  assert.doesNotMatch(JSON.stringify(venues), /data\.sfgov\.org|PDDL-1\.0|nc68-ngbr/i);
  assert.doesNotMatch(JSON.stringify(venues), /private@example\.com|email|phone/i);
});

test('CC0 company layer dedupes Wikidata IDs and keeps only city-level factual fields', () => {
  const binding = (qid, name, website) => ({
    company: { value: `http://www.wikidata.org/entity/${qid}` },
    companyLabel: { value: name },
    companyDescription: { value: '  Builds useful software.  ' },
    website: website ? { value: website } : undefined,
    inception: { value: '2022-01-01T00:00:00Z' },
  });
  const companies = buildWikidataCompanies([
    { body: { results: { bindings: [binding('Q123', 'Allowed Co', 'http://allowed.example')] } }, tag: 'yc' },
    { body: { results: { bindings: [binding('Q123', 'Allowed Co', 'https://allowed.example'), binding('Q456', 'Q456')] } }, tag: 'wikidata-startup' },
  ], '2026-07-22T00:00:00Z');
  assert.equal(companies.length, 1);
  assert.deepEqual(companies[0], {
    id: 'wd:Q123',
    name: 'Allowed Co',
    description: 'Builds useful software.',
    website: 'https://allowed.example/',
    inceptionYear: 2022,
    tags: ['yc', 'wikidata-startup'],
    locationPrecision: 'city',
    neighborhood: null,
    source: 'Wikidata',
    sourceUrl: 'https://www.wikidata.org/wiki/Q123',
    sourceLicense: 'CC0-1.0',
    retrievedAt: '2026-07-22T00:00:00Z',
  });
  assert.doesNotMatch(JSON.stringify(companies), /address|owner|email|phone|coordinates/i);
});

test('public map rejects named companies without CC0 evidence', () => {
  assert.throws(() => buildPublicStartupMap({
    counts: [],
    total: 0,
    companies: [{ id: 'yc:private', name: 'Private YC row', sourceLicense: null }],
    neighborhoodGeoJson: {
      type: 'FeatureCollection',
      features: [{ properties: { nhood: 'Mission' }, geometry: box(-122.44, 37.74, -122.40, 37.78) }],
    },
  }), /require an attributed public source \(CC0-1\.0, YC-public, or HN-public\)/);
});

test('minimal directory renderer is lazy, accessible, honest, and map-free', () => {
  const source = fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8');
  // Lazy, same-origin-safe fetch of the immutable data asset only on mount.
  assert.match(source, /new URL\('sf-startup-map\.json', source\)/);
  assert.match(source, /credentials: 'omit'/);
  assert.match(source, /cache: 'force-cache'/);
  assert.match(source, /fetch\(dataUrl/);
  // Schema/3 contract preserved so the publish bundle + gates stay valid.
  assert.match(source, /map\.schema === 'demigod\.sf-startup-map\/3'/);
  // Public API preserved.
  assert.match(source, /window\.DemigodStartupMap = \{ mount: mount, addCommunityStartups: addCommunityStartups \}/);
  // Honesty labels retained.
  assert.match(source, /Hiring not verified/);
  assert.match(source, /A plain directory of San Francisco startups from public open data/);
  assert.match(source, /City-level only/);
  assert.match(source, /coverage\.definition/);
  assert.match(source, /coverage\.caveat/);
  assert.match(source, /No companies match those filters\./);
  // v-jobs: live open-role counts from public ATS boards, honestly labelled point-in-time.
  assert.match(source, /Open-role counts come from each company/);
  assert.match(source, /open role/);
  assert.match(source, /with live US-posted open roles/);
  assert.match(source, /US open role/);
  assert.match(source, /US-posted or Remote/);
  assert.match(source, /YC · public directory/);
  assert.match(source, /Wikidata · CC0/);
  assert.doesNotMatch(source, /YC · CC0 evidence/);
  assert.match(source, /company\.openRoles/);
  assert.match(source, /company\.atsSource/);
  // Community-submission merge + provenance-safe links.
  assert.match(source, /community-reviewed/);
  assert.match(source, /ugc nofollow/);
  assert.match(source, /locationPrecision: 'city'/);
  assert.match(source, /addCommunityStartups/);
  assert.match(source, /names\.has\(name\.toLowerCase\(\)\)/); // dedupe by name
  // Search + hiring filter present and labelled.
  assert.match(source, /aria-label="Search startups"/);
  assert.match(source, /aria-label="Filter by hiring status"/);
  assert.match(source, /aria-label="Filter by ATS provider"/);
  assert.match(source, /var CAP = 20;/);
  assert.doesNotMatch(source, /\bfilter\(\);/);
  assert.match(source, /state\.hiringOf\[i\] === h/);
  assert.match(source, /state\.providerOf\[i\] === provider/);
  assert.match(source, /providerEl\.addEventListener\('change', renderRows\)/);
  assert.match(source, /\[c\.name, c\.description\]\.concat\(c\.tags/);
  // Output escaping + https-only links.
  assert.match(source, /function esc\(value\)/);
  assert.match(source, /\/\^https\?:\$\/\.test\(url\.protocol\)/);
  // The heavy map machinery is GONE — this is the whole point of the redesign.
  assert.doesNotMatch(source, /dg-atlas|<svg|role="group"|data-atlas-|milesBetween|radiusMiles|ArrowUp|data-atlas-toggle|planning estimate|centroid|neighborhoods\[|\.venues|mapbox|leaflet|geolocation/i);
});

test('generated public artifact keeps named companies city-only and strips sensitive fields', () => {
  const map = JSON.parse(fs.readFileSync(new URL('./DEMIGOD-SF-STARTUP-MAP.json', import.meta.url), 'utf8'));
  assert.equal(map.schema, 'demigod.sf-startup-map/3');
  assert.ok(map.companies.length > 0);
  assert.equal(map.companies.every((company) => company.locationPrecision === 'city' && company.neighborhood === null), true);
  assert.equal(map.companies.every((company) => ['CC0-1.0', 'YC-public', 'HN-public'].includes(company.sourceLicense)), true);
  assert.deepEqual([...new Set(map.sources.map((source) => source.license))].sort(), ['CC0-1.0', 'PDDL-1.0', 'YC-public']);
  const serialized = JSON.stringify(map).toLowerCase();
  // Field names / PII keys only — prose descriptions may say "email security" honestly.
  for (const forbidden of ['full_business_address', 'mailing_address', 'ownership_name', 'companyids']) {
    assert.equal(serialized.includes(forbidden), false, `excluded ${forbidden}`);
  }
  for (const row of [...map.companies, ...map.venues]) {
    for (const key of ['email', 'phone', 'resume', 'coordinates', 'full_business_address', 'mailing_address']) {
      assert.equal(Object.hasOwn(row, key), false, `no ${key} field on ${row.id || row.name || 'row'}`);
    }
  }
  // Prose may say "coordinates" (e.g. IncidentFox) — forbid geo fields, not the English word.
  assert.equal(
    map.companies.some((company) => company.lat != null || company.lng != null || company.lon != null),
    false,
    'company records have no lat/lng',
  );
  assert.equal(map.companies.some((company) => Object.hasOwn(company, 'hiringStatus')), false, 'no unsupported hiring claim');
  assert.ok(map.venues.length > 0);
  assert.equal(map.venues.every((venue) => Number.isFinite(venue.lat) && Number.isFinite(venue.lng) && venue.availability === 'not verified'), true);
  assert.equal(map.venues.every((venue) => venue.sourceUrl === null && venue.sourceLicense === null), true);
});

test('website route is discoverable and loads the immutable map asset only on demand', () => {
  const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  // v858: hard route /startups; path pill uses COPY.pathStartups ('SF startups'), not the
  // prose "SF startup directory" on the events cross-link. data-dg-page stays "map".
  assert.match(foot, /<a href="\/startups" data-dg-page="map">'\+COPY\.pathStartups\+'<\/a>/);
  assert.doesNotMatch(foot, /<a href="\/\?p=map"/);
  // v805: page-scoped HTML — startups page has directory host + startup form; events page has event form only.
  assert.match(foot, /function dgMapEventsHtml\(kind\)/);
  assert.doesNotMatch(foot, /<strong>A plain directory of San Francisco startups\.<\/strong>/);
  assert.match(foot, /data-kind="'\+\(isEvents\?'events':'startups'\)/);
  assert.match(foot, /id=\\?"dg-startup-map\\?"/);
  assert.match(foot, /id=\\?"dg-event-submit\\?"/);
  assert.match(foot, /id=\\?"dg-startup-submit\\?"/);
  assert.match(foot, /id=\\?"dg-event-manage\\?"/);
  // Runtime shape: events-only vs startups-only forms
  {
    const fn = foot.slice(foot.indexOf('function dgMapEventsHtml'), foot.indexOf('\nvar DG_PAGES'));
    const g = new Function(fn + '; return dgMapEventsHtml;')();
    const eventsHtml = g('events');
    const startupsHtml = g('startups');
    assert.match(eventsHtml, /id="dg-event-submit"/);
    assert.doesNotMatch(eventsHtml, /id="dg-startup-submit"/);
    assert.doesNotMatch(eventsHtml, /id="dg-startup-map"/);
    assert.match(startupsHtml, /id="dg-startup-submit"/);
    assert.match(startupsHtml, /id="dg-startup-map"/);
    assert.doesNotMatch(startupsHtml, /id="dg-event-submit"/);
    assert.match(eventsHtml, /data-kind="events"/);
    assert.match(startupsHtml, /data-kind="startups"/);
  }
  assert.match(foot, /var isEvents\s*=\s*kind\s*===\s*'events'/);
  assert.match(foot, /html: dgMapEventsHtml\('startups'\)/);
  assert.match(foot, /html: dgMapEventsHtml\('events'\)/);
  assert.match(foot, /title: 'SF startup directory'/);
  assert.match(foot, /title: 'SF events'/);
  assert.doesNotMatch(foot, /id="dg-startup-map"[^>]*aria-live/);
  assert.match(foot, /demigod-site-cdn@01767fdf70e6\/startup-map-latest\.js/);
  assert.match(foot, /if \(id === 'map'\)[\s\S]*?startupMapMount\(root\)/);
  assert.match(foot, /if \(id === 'map' \|\| id === 'events'\)[\s\S]*?communitySubmissionsMount\(root\)/);
  assert.match(foot, /The startup directory could not load/);
  assert.match(foot, /root\.dataset\.communityBound/);
  assert.match(foot, /if \(eventForm\) \{/);
  assert.match(foot, /if \(startupForm\) \{/);
  assert.match(foot, /window\.dgCommunityStartups = startups/);
  assert.match(foot, /DemigodStartupMap\.addCommunityStartups\(startups\)/);
  assert.match(foot, /<h3>Reviewed events<\/h3>[\s\S]*?<article class="dg-manage-card"><h4>/);
  assert.match(foot, /<h3>Reviewed startup submissions<\/h3>[\s\S]*?<article class="dg-manage-card"><h4>/);
  assert.match(foot, /hiring reported by submitter:/);
  assert.match(foot, /row\.neighborhood \|\| 'SF neighborhood not provided'/);
  assert.doesNotMatch(foot, /row\.neighborhood \|\| 'San Francisco'/);
  assert.doesNotMatch(foot, /sf-startup-map\.json/);
});

test('directory sort: an unmeasured company never ranks as freshest', () => {
  const src = fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8');
  // Source-level: the control exists and is labelled for assistive tech like its siblings.
  assert.match(src, /class="dg-dir-sort" aria-label="Sort companies"/);
  // Behavioural: pull the pure comparator out and exercise the rule that matters.
  const start = src.indexOf('function dgOrderByMedian');
  const end = src.indexOf('\n  var state = {');
  const order = new Function(src.slice(start, end) + '; return dgOrderByMedian;')();

  const fresh = order('fresh');
  assert.ok(fresh(10, 200, 'A', 'B') < 0, 'freshest first puts the newer posting ahead');
  assert.ok(fresh(200, 10, 'A', 'B') > 0, 'and the older one behind');
  // The honesty rule: unknown is not zero. It must sort LAST in BOTH directions, because
  // treating it as fresh would publish a claim we cannot support.
  assert.ok(fresh(null, 500, 'A', 'B') > 0, 'unknown median sorts after a known stale one when asking for freshest');
  assert.ok(fresh(undefined, 1, 'A', 'B') > 0, 'undefined is unknown too');
  const stale = order('stale');
  assert.ok(stale(500, 10, 'A', 'B') < 0, 'longest-posted first puts the older posting ahead');
  assert.ok(stale(null, 10, 'A', 'B') > 0, 'unknown still sorts LAST when asking for longest-posted');
  // Stability: equal or both-unknown fall back to name so the list does not jitter.
  assert.ok(fresh(5, 5, 'Alpha', 'Beta') < 0, 'equal medians fall back to name');
  assert.ok(fresh(null, null, 'Alpha', 'Beta') < 0, 'both unknown fall back to name');
  assert.ok(Number.isNaN(NaN) && fresh(NaN, 3, 'A', 'B') > 0, 'NaN is treated as unknown, not as 0');
});

test('recent roles: ordered by OUR observation, never by the employer posting date', () => {
  const src = fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8');
  // Source-level: the section exists and starts hidden, so a missing feed shows nothing at all.
  assert.match(src, /<section class="dg-dir-fresh" hidden><\/section>/);
  // The link is the tap target. Inline with the company name it measured 22px tall on a 390px
  // viewport — under WCAG 2.5.8's 24px floor and half this directory's own 44px control convention.
  assert.match(src, /\.dg-fresh-title\{[^}]*min-height:44px/, 'the role link must keep a 44px tap target');
  const start = src.indexOf('function dgRecentRoles');
  const end = src.indexOf('\n  var state = {');
  const pick = new Function(src.slice(start, end) + '; return dgRecentRoles;')();

  const feed = (roles) => ({ schema: 'demigod.roles-feed/1', windowDays: 7, roles });
  const role = (o) => ({ company: 'C', title: 'T', url: 'https://x.example/j', firstObservedAt: '2026-07-30T00:00:00Z', postedAt: null, ...o });

  // Newest of OUR observations first.
  const ordered = pick(feed([
    role({ company: 'Older', firstObservedAt: '2026-07-01T00:00:00Z' }),
    role({ company: 'Newer', firstObservedAt: '2026-07-29T00:00:00Z' }),
  ]), 8);
  assert.deepEqual(ordered.map((r) => r.company), ['Newer', 'Older']);

  // THE HONESTY RULE. postedAt is present on only some rows (the ATS-attributed ones). If ordering
  // ever keys off it, the handful of Greenhouse rows float to the top and the list silently stops
  // being "recent" — it becomes "boards that expose a date", an editorial claim we never made.
  // Here postedAt ordering is the exact REVERSE of firstObservedAt ordering.
  const conflict = pick(feed([
    role({ company: 'WeSawFirst', firstObservedAt: '2026-07-29T00:00:00Z', postedAt: '2026-01-01' }),
    role({ company: 'BoardSaysNewer', firstObservedAt: '2026-07-02T00:00:00Z', postedAt: '2026-07-28' }),
  ]), 8);
  assert.deepEqual(conflict.map((r) => r.company), ['WeSawFirst', 'BoardSaysNewer'],
    'our observation decides the order; the board date must not reorder the list');

  // A row we cannot label honestly is dropped, not rendered with a blank.
  const dropped = pick(feed([role({ company: '' }), role({ title: '' }), role({ firstObservedAt: null }), role({ company: 'Keep' })]), 8);
  assert.deepEqual(dropped.map((r) => r.company), ['Keep']);

  assert.equal(pick(feed(Array.from({ length: 30 }, (_, i) => role({ company: 'c' + i }))), 3).length, 3, 'limit respected');
  assert.equal(pick(feed(Array.from({ length: 30 }, (_, i) => role({ company: 'c' + i }))), undefined).length, 8, 'defaults to 8, not to 0');
  assert.deepEqual(pick(null, 8), [], 'no feed -> nothing');
  assert.deepEqual(pick({ roles: 'nope' }, 8), [], 'malformed roles -> nothing, no crash');
  assert.deepEqual(pick(feed([]), 8), [], 'empty feed -> nothing');
});
