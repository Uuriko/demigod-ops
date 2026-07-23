import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { privateDashboardSecurityHeaders } from './demigod-dashboard-http-policy.mjs';
import { buildStartupAtlas } from './demigod-startup-atlas.mjs';

const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
const routeStart = server.indexOf("if (url.pathname === '/api/startup-atlas')");
const routeEnd = server.indexOf("if (url.pathname === '/api/maps'", routeStart);
const route = server.slice(routeStart, routeEnd);

function atlasValidator() {
  const start = server.indexOf("const STARTUP_ATLAS_SCHEMA = 'demigod.sf-startup-atlas/1'");
  const end = server.indexOf('function freshestGrokReceipt', start);
  const context = { URL };
  vm.runInNewContext(`${server.slice(start, end)}\nthis.validate = startupAtlasView;`, context);
  return context.validate;
}

function atlasFixture() {
  const company = (overrides) => ({
    id: 'mapped', name: 'Mapped Co', slug: 'mapped-co', website: 'https://mapped.example/',
    oneLiner: 'Builds useful things.', batch: 'W24', industry: 'B2B', subindustry: 'Recruiting',
    teamSize: 12, hiring: true, status: 'active', source: 'Company site',
    sourceUrl: 'https://mapped.example/about', sfPresence: 'Public SF office claim',
    locationPrecision: 'neighborhood', neighborhood: 'SoMa', locationSource: 'https://mapped.example/contact',
    ...overrides,
  });
  return {
    schema: 'demigod.sf-startup-atlas/1',
    generatedAt: '2026-07-22T00:00:00Z',
    coverage: {
      total: 2, neighborhoodPlaced: 1, cityOnly: 1, neighborhoods: 1,
      definition: 'Publicly evidenced San Francisco startup presence.',
      caveat: 'Neighborhood placement is approximate and never an address pin.',
    },
    sources: [{ name: 'Company sites', url: 'https://example.com/sources', retrievedAt: '2026-07-21T00:00:00Z' }],
    bounds: { west: -122.52, south: 37.7, east: -122.35, north: 37.83 },
    companies: [
      { ...company(), privateContact: 'must-not-leak@example.com' },
      company({
        id: 'city-only', name: 'City Co', slug: 'city-co', website: 'https://city.example/',
        sourceUrl: 'https://city.example/about', locationPrecision: 'city', neighborhood: null,
        locationSource: null, hiring: false, website: null,
      }),
    ],
    neighborhoods: [{
      name: 'SoMa', count: 1, companyIds: ['mapped'], centroid: { lat: 37.775, lng: -122.4 },
      geometry: { type: 'Polygon', coordinates: [[
        [-122.42, 37.76], [-122.38, 37.76], [-122.38, 37.79], [-122.42, 37.79], [-122.42, 37.76],
      ]] },
    }],
    rawStore: 'must not be projected',
  };
}

test('startup atlas API reads only the dedicated, strictly validated projection', () => {
  assert.ok(routeStart > 0 && routeEnd > routeStart, 'startup atlas route must precede the existing maps routes');
  assert.match(server, /STARTUP_ATLAS_SCHEMA = 'demigod\.sf-startup-atlas\/1'/);
  assert.match(server, /STARTUP_ATLAS_FILE = 'DEMIGOD-SF-STARTUPS\.json'/);
  assert.match(route, /path\.join\(ROOT, STARTUP_ATLAS_FILE\)/);
  assert.match(route, /startupAtlasView\(input\)/);
  assert.match(server, /coverage counts do not match the atlas contents/);
  assert.match(server, /city-only company .* must not appear in a map cluster/);
  assert.match(server, /geometry must be Polygon or MultiPolygon/);
  assert.match(route, /jsonSend\(res, 404,[\s\S]*status: 'not_generated'/);
  assert.match(route, /jsonSend\(res, 422,/);
  assert.doesNotMatch(route, /DEMIGOD-(?:LEADS|EVENTS)\.json|safeJson\(|writeFile|atomicWrite|refresh/i);
});

test('startup atlas validator strips extra fields and refuses fake city-only placement', () => {
  const validate = atlasValidator();
  const fixture = atlasFixture();
  const view = validate(fixture);
  assert.equal(view.companies.length, 2);
  assert.equal(view.rawStore, undefined);
  assert.equal(view.companies[0].privateContact, undefined);
  assert.deepEqual(Array.from(view.neighborhoods[0].companyIds), ['mapped']);

  const fakePin = atlasFixture();
  fakePin.neighborhoods[0].companyIds.push('city-only');
  fakePin.neighborhoods[0].count = 2;
  assert.throws(() => validate(fakePin), /does not match its neighborhood cluster|city-only company/);

  const wrongSchema = atlasFixture();
  wrongSchema.schema = 'demigod.sf-startup-atlas/0';
  assert.throws(() => validate(wrongSchema), /schema must be demigod\.sf-startup-atlas\/1/);
});

// Poison-test: city-only cluster refusal and private-field strip must stay fail-capable.
// A gutted validator that always returns input would leave this green only if both asserts fail.
test('startup atlas validator refuse paths are fail-capable (not vacuous-green)', () => {
  const validate = atlasValidator();

  // Honest baseline must still pass (not vacuous-red).
  const ok = validate(atlasFixture());
  assert.equal(ok.companies.length, 2);
  assert.equal(ok.rawStore, undefined);
  assert.equal(ok.companies[0].privateContact, undefined);

  // City-only forced into a map cluster must throw (delete this branch → red).
  const cityPinned = atlasFixture();
  cityPinned.companies[1].locationPrecision = 'city';
  cityPinned.companies[1].neighborhood = null;
  cityPinned.neighborhoods[0].companyIds = ['mapped', 'city-only'];
  cityPinned.neighborhoods[0].count = 2;
  cityPinned.coverage.neighborhoodPlaced = 1;
  cityPinned.coverage.cityOnly = 1;
  assert.throws(() => validate(cityPinned), /city-only company|does not match its neighborhood cluster/);

  // Extra private keys must not survive the projection (allowlist, not trust-the-file).
  const withPii = atlasFixture();
  withPii.companies[0].privateContact = 'must-not-leak@example.com';
  withPii.companies[0].contactEmail = 'owner-secret@example.test';
  withPii.rawStore = { secret: true };
  const scrubbed = validate(withPii);
  assert.equal(scrubbed.rawStore, undefined, 'rawStore must be stripped');
  assert.equal(scrubbed.companies[0].privateContact, undefined, 'privateContact must be stripped');
  assert.equal(scrubbed.companies[0].contactEmail, undefined, 'contactEmail must be stripped');
  assert.equal(JSON.stringify(scrubbed).includes('must-not-leak@example.com'), false);
  assert.equal(JSON.stringify(scrubbed).includes('owner-secret@example.test'), false);
});

test('startup atlas producer output passes the dashboard consumer unchanged', () => {
  const produced = buildStartupAtlas({
    ycCompanies: [{
      id: 7, name: 'Mapped Co', slug: 'mapped-co', website: null,
      all_locations: 'San Francisco, CA, USA', status: 'Active', team_size: 12, isHiring: true,
    }],
    sfBusinesses: [{ dba_name: 'Mapped Co', neighborhoods_analysis_boundaries: 'SoMa' }],
    neighborhoodGeoJson: { type: 'FeatureCollection', features: [{
      type: 'Feature', properties: { nhood: 'SoMa' }, geometry: {
        type: 'Polygon', coordinates: [[
          [-122.42, 37.76], [-122.38, 37.76], [-122.38, 37.79], [-122.42, 37.79], [-122.42, 37.76],
        ]],
      },
    }] },
    generatedAt: '2026-07-22T00:00:00Z',
  });
  const view = atlasValidator()(produced);
  assert.equal(view.companies[0].id, 'yc:7');
  assert.equal(view.companies[0].website, null);
  assert.equal(view.companies[0].teamSize, 12);
  assert.equal(view.neighborhoods[0].companyIds[0], 'yc:7');
});

test('SF Map is lazy, searchable, filterable, native, and keyboard accessible', () => {
  assert.match(ui, /id="tab-map"[\s\S]{0,180}data-tab="map">SF Map/);
  assert.match(ui, /id="panel-map"/);
  assert.match(ui, /name==='map' && !startupAtlasCache\) loadStartupAtlas\(\)/);
  assert.match(ui, /if\(on\) b\.parentElement\.scrollLeft=b\.offsetLeft-/);
  assert.match(ui, /tab-map'\)\.parentElement\.scrollLeft=\$\('tab-map'\)\.parentElement\.scrollWidth/);
  assert.match(ui, /fetch\('\/api\/startup-atlas\?t='/);
  assert.match(ui, /function atlasPath\(/);
  assert.match(ui, /<svg class="atlas-map"/);
  assert.match(ui, /class="atlas-marker" role="button" tabindex="0" focusable="true"/);
  assert.match(ui, /event\.key==='Enter'\|\|event\.key===' '/);
  for (const id of ['atlasSearch', 'atlasIndustry', 'atlasHiring', 'atlasCompanyList']) assert.match(ui, new RegExp(`id="${id}"`));
  assert.match(ui, /companies\.slice\(0,STARTUP_ATLAS_LIST_LIMIT\)/);
  assert.match(ui, /Filter by YC hiring signal[\s\S]{0,120}YC marks hiring/);
  assert.doesNotMatch(ui, /Not hiring|hiring==='no'/);
  assert.match(ui, /company\.teamSize>0\?'YC team size: '\+company\.teamSize:null/);
  assert.match(ui, /listedCompanies\.map\(company=>/);
  assert.match(ui, /first '\+STARTUP_ATLAS_LIST_LIMIT\+' shown; refine filters/);
  assert.match(ui, /City-only companies stay in the list and never receive a marker/);
  assert.match(ui, /const numberTabs=\{1:'overview',2:'inbox',3:'matches',4:'handoff',5:'tools',6:'roadmap',7:'map'\}/);
  assert.match(ui, /Tab SF Map/);
  assert.doesNotMatch(ui, /<script[^>]+src=|leaflet|mapbox|google\.maps|navigator\.geolocation/i);
});

test('startup atlas addition preserves private HTTP policy and process map routes', () => {
  const headers = privateDashboardSecurityHeaders();
  assert.match(headers['Content-Security-Policy'], /default-src 'self'/);
  assert.match(headers['Permissions-Policy'], /geolocation=\(\)/);
  assert.equal(headers['Cache-Control'], 'no-store');
  for (const id of ['agents', 'workflow', 'website', 'resources']) {
    assert.match(server, new RegExp(`${id}: 'docs/DEMIGOD-`));
    assert.match(ui, new RegExp(`href="/api/maps/${id}"`));
  }
});
