import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildStartupAtlas, normalizeCompanyName, refreshStartupAtlas } from './demigod-startup-atlas.mjs';

const box = (west, south, east, north) => ({
  type: 'Polygon',
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

// Public atlas must never emit registry PII keys or fixture secrets. Shared so the
// positive (real build) and poison (hand-leaked) paths use the same detector.
const ATLAS_PUBLIC_FORBIDDEN = [
  'alpha-secret@example.test', 'owner-secret@example.test', 'fixture-secret-address',
  'fixture-secret-phone', 'fixture-secret-outreach', 'fixture-secret-note',
  'ownership_name', 'full_business_address', 'contactEmail', 'outreach', 'rsvps',
];

function atlasPublicLeaks(serialized) {
  return ATLAS_PUBLIC_FORBIDDEN.filter((marker) => serialized.includes(marker));
}

function assertAtlasPublicSafe(value, label = 'atlas') {
  const leaks = atlasPublicLeaks(JSON.stringify(value));
  assert.deepEqual(leaks, [], `${label} must not leak public-forbidden markers: ${leaks.join(', ')}`);
}

test('private startup atlas stays private on disk and out of git', () => {
  const source = fs.readFileSync(new URL('./demigod-startup-atlas.mjs', import.meta.url), 'utf8');
  const gitignore = fs.readFileSync(new URL('./.gitignore', import.meta.url), 'utf8');
  assert.match(source, /atomicWrite\(outPath,[\s\S]*?\{ mode: 0o600 \}\)/);
  assert.match(gitignore, /^DEMIGOD-SF-STARTUPS\.json$/m);
});

test('startup atlas refresh never scrapes the YC directory', async () => {
  const source = fs.readFileSync(new URL('./demigod-startup-atlas.mjs', import.meta.url), 'utf8');
  let fetched = false;
  await assert.rejects(
    refreshStartupAtlas({ fetchImpl: async () => { fetched = true; throw new Error('must not fetch'); } }),
    /ycCompanies input required; automatic YC directory scraping is disabled/,
  );
  assert.equal(fetched, false);
  assert.doesNotMatch(source, /AlgoliaOpts|YCCompany_production|X-Algolia-API-Key/);
});

test('startup atlas keeps coverage honest and private', () => {
  const ycCompanies = [
    { id: 1, name: 'Alpha, Inc.', slug: 'alpha', website: 'https://alpha.test', all_locations: 'San Francisco, CA, USA', status: 'Active', industry: 'B2B', team_size: 12, isHiring: true, secretEmail: 'alpha-secret@example.test' },
    { id: 1, name: 'Alpha duplicate', all_locations: 'San Francisco, CA, USA', status: 'Active' },
    { id: 2, name: 'Beta LLC', slug: 'beta', all_locations: 'San Francisco, CA, USA; Paris, France', status: 'Active', industry: 'Healthcare', team_size: null },
    { id: 3, name: 'City Only', slug: 'city-only', all_locations: 'San Francisco, CA, USA', status: 'Active', team_size: '' },
    { id: 4, name: 'South City', all_locations: 'South San Francisco, CA, USA', status: 'Active' },
    { id: 5, name: 'Closed Co', all_locations: 'San Francisco, CA, USA', status: 'Inactive' },
    { id: 6, name: 'Twin', all_locations: 'San Francisco, CA, USA', status: 'Active', team_size: 0 },
    { id: 7, name: 'Twin', all_locations: 'San Francisco, CA, USA', status: 'Active' },
  ];
  const sfBusinesses = [
    { dba_name: 'Alpha Inc', ownership_name: 'Private Alpha Owner', neighborhoods_analysis_boundaries: 'Mission', full_business_address: 'fixture-secret-address', contactEmail: 'owner-secret@example.test' },
    { dba_name: 'Beta', neighborhoods_analysis_boundaries: 'Mission', phone: 'fixture-secret-phone' },
    { ownership_name: 'Beta Corporation', neighborhoods_analysis_boundaries: 'South of Market', outreach: ['fixture-secret-outreach'] },
    { dba_name: 'Twin', neighborhoods_analysis_boundaries: 'Mission' },
  ];
  const neighborhoodGeoJson = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { nhood: 'Mission', privateNote: 'fixture-secret-note' }, geometry: box(-122.44, 37.74, -122.40, 37.78) },
      { type: 'Feature', properties: { nhood: 'South of Market' }, geometry: box(-122.42, 37.77, -122.38, 37.80) },
    ],
  };
  const atlas = buildStartupAtlas({
    ycCompanies,
    sfBusinesses,
    neighborhoodGeoJson,
    generatedAt: '2026-07-22T00:00:00.000Z',
  });

  assert.equal(normalizeCompanyName('Alpha, Inc.'), 'alpha');
  assert.equal(atlas.schema, 'demigod.sf-startup-atlas/1');
  assert.deepEqual(atlas.companies.map((company) => company.name), ['Alpha, Inc.', 'Beta LLC', 'City Only', 'Twin', 'Twin']);
  assert.deepEqual(atlas.coverage, {
    total: 5,
    neighborhoodPlaced: 1,
    cityOnly: 4,
    neighborhoods: 1,
    definition: 'Active Y Combinator companies whose public YC profile lists San Francisco, CA, USA.',
    caveat: 'No authoritative complete startup census exists. Neighborhood clusters are registry name matches, not verified offices; city-only companies remain off-map.',
  });
  assert.equal(atlas.companies[0].neighborhood, 'Mission');
  assert.equal(atlas.companies[0].locationPrecision, 'neighborhood');
  assert.equal(atlas.companies[1].neighborhood, null, 'ambiguous name stays city-only');
  assert.equal(atlas.companies[2].locationPrecision, 'city');
  assert.equal(atlas.companies[0].teamSize, 12);
  assert.equal(atlas.companies.slice(1).every((company) => company.teamSize === null), true);
  assert.equal(atlas.companies.filter((company) => company.name === 'Twin').every((company) => company.locationPrecision === 'city'), true);
  assert.equal(atlas.neighborhoods.find((row) => row.name === 'Mission').count, 1);
  assert.equal(atlas.neighborhoods.find((row) => row.name === 'South of Market').count, 0);
  for (const value of Object.values(atlas.bounds)) assert.equal(Number.isFinite(value), true);
  for (const row of atlas.neighborhoods) {
    assert.equal(Number.isFinite(row.centroid.lat), true);
    assert.equal(Number.isFinite(row.centroid.lng), true);
    assert.ok(row.centroid.lat >= atlas.bounds.south && row.centroid.lat <= atlas.bounds.north);
    assert.ok(row.centroid.lng >= atlas.bounds.west && row.centroid.lng <= atlas.bounds.east);
  }

  assertAtlasPublicSafe(atlas, 'buildStartupAtlas output');
});

test('company identity preserves non-Latin letters and combining marks', () => {
  assert.equal(normalizeCompanyName('株式会社テストラボ LLC'), '株式会社テストラボ');
  assert.equal(normalizeCompanyName('ボイス株式会社'), 'ボイス株式会社');
  assert.equal(normalizeCompanyName('Космос ООО'), 'космос ооо');
  assert.equal(normalizeCompanyName('شركة المدار'), 'شركة المدار');
  assert.equal(normalizeCompanyName('Café, Inc.'), 'cafe');
});

// Poison-test: the PII exclusion detector must catch a hand-leaked payload. Without this, a
// vacuous helper (or a build that only drops empty fields) can stay green while real leaks ship.
test('atlas public-PII detector is fail-capable (hand-poisoned payload trips it)', () => {
  const clean = buildStartupAtlas({
    ycCompanies: [{ id: 9, name: 'Clean Co', slug: 'clean', all_locations: 'San Francisco, CA, USA', status: 'Active' }],
    sfBusinesses: [{ dba_name: 'Clean Co', neighborhoods_analysis_boundaries: 'Mission' }],
    neighborhoodGeoJson: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { nhood: 'Mission' }, geometry: box(-122.44, 37.74, -122.40, 37.78) }],
    },
    generatedAt: '2026-07-22T00:00:00.000Z',
  });
  assertAtlasPublicSafe(clean, 'clean build');

  // Simulate a future edit that spreads raw YC / DataSF fields onto the company row.
  const leaky = {
    ...clean,
    companies: clean.companies.map((company) => ({
      ...company,
      secretEmail: 'alpha-secret@example.test',
      contactEmail: 'owner-secret@example.test',
      full_business_address: 'fixture-secret-address',
      ownership_name: 'Private Alpha Owner',
      outreach: ['fixture-secret-outreach'],
    })),
  };
  const leaks = atlasPublicLeaks(JSON.stringify(leaky));
  assert.ok(leaks.length >= 4, `hand-poison must trip the detector (got ${leaks.join(', ') || 'none'})`);
  assert.ok(leaks.includes('alpha-secret@example.test'));
  assert.ok(leaks.includes('contactEmail'));
  assert.ok(leaks.includes('full_business_address'));
  assert.ok(leaks.includes('ownership_name'));
});
