#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { cleanBoundaryFeatures, mergeBounds } from './demigod-startup-atlas.mjs';
import { FREE_SF_VENUES } from './demigod-events-bot-agent.mjs';
import { isCompanyWebsiteHost } from './demigod-hn-hiring.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSINESSES = 'https://data.sfgov.org/resource/g8m3-pdis.json';
const BOUNDARIES = 'https://data.sfgov.org/resource/j2bu-swwd.geojson?$limit=50';
const WIKIDATA = 'https://query.wikidata.org/sparql';
/** Public YC company dump (community mirror of the public YC directory — not a private scrape). */
export const YC_OSS_URL =
  process.env.DEMIGOD_YC_OSS_URL || 'https://yc-oss.github.io/api/companies/all.json';
const SINCE = '2020-01-01T00:00:00.000';
const TECH_NAICS = ['3254', '3341', '3344', '3345', '5112', '5132', '5182', '5191', '5415', '5417'];
const YC_QUERY = 'SELECT DISTINCT ?company ?companyLabel ?companyDescription ?website ?inception WHERE { { ?company wdt:P1951 wd:Q2616400. } UNION { ?company wdt:P1344 ?batch. ?batch wdt:P664 wd:Q2616400. } ?company wdt:P159 wd:Q62. FILTER NOT EXISTS { ?company wdt:P576 ?dissolved. } OPTIONAL { ?company wdt:P856 ?website. } OPTIONAL { ?company wdt:P571 ?inception. } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }';
const STARTUP_QUERY = 'SELECT DISTINCT ?company ?companyLabel ?companyDescription ?website ?inception WHERE { ?company wdt:P31 wd:Q129238; wdt:P159 wd:Q62. FILTER NOT EXISTS { ?company wdt:P576 ?dissolved. } OPTIONAL { ?company wdt:P856 ?website. } OPTIONAL { ?company wdt:P571 ?inception. } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }';
// Broadened SF-tech net: any SF-HQ (P159=Q62) company/business/tech-company type WITH an official
// website (P856), not dissolved, excluding banks/nonprofits, founded 2005+ when dated. Widens coverage
// beyond the strict "startup" instance (Q129238) to real SF tech companies that carry a website (so they
// can be job-enriched). Website-required keeps entries useful; QID/host dedupe removes overlaps.
const BROAD_QUERY = 'SELECT DISTINCT ?company ?companyLabel ?companyDescription ?website ?inception WHERE { VALUES ?type { wd:Q4830453 wd:Q783794 wd:Q6881511 wd:Q18388277 wd:Q1058914 wd:Q167037 } ?company wdt:P159 wd:Q62; wdt:P31 ?type; wdt:P856 ?website. FILTER NOT EXISTS { ?company wdt:P576 ?dissolved. } FILTER NOT EXISTS { ?company wdt:P31 ?x. VALUES ?x { wd:Q22687 wd:Q163740 } } OPTIONAL { ?company wdt:P571 ?inception. } FILTER( !BOUND(?inception) || YEAR(?inception) >= 2005 ) SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }';
// Bay-ish locations on the public YC dump (same spirit as demigod-free-ops yc-oss --sf).
const YC_SF_LOC_RE =
  /\b(san\s*francisco|oakland|berkeley|palo\s*alto|mountain\s*view|san\s*mateo|redwood\s*city|menlo\s*park|sunnyvale|cupertino|santa\s*clara|san\s*jose|daly\s*city|south\s*san\s*francisco|emeryville|alameda|fremont|hayward|burlingame|san\s*carlos|foster\s*city|milpitas|los\s*altos|los\s*gatos|campbell|saratoga|belmont|san\s*bruno|south\s*bay|east\s*bay|peninsula|silicon\s*valley|bay\s*area)\b/i;

export const PUBLIC_STARTUP_MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');

const asCount = (value) => {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`invalid aggregate count: ${value}`);
  return count;
};

const safeUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

/** Hostname key for CROSS-source dedupe: the same company arriving from YC and from Wikidata
 *  should collapse to one row. The key is a heuristic, not an identity — two distinct entities
 *  can publish the same host. Live counterexample: Wikidata carries RockLive (Q7354178) and
 *  Shots Podcast Network (Q15977863) as separate entities, both listing shots.com. Rows inside
 *  one source list are deliberately NOT deduped against each other, because collapsing them
 *  would be a false merge — and a false merge poisons every downstream claim about both
 *  companies, which is far worse than carrying a duplicate. */
export function websiteHostKey(value) {
  try {
    return new URL(String(value || '')).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

/** Exact Active status — "Inactive" must not match a substring /active/i. */
export function isYcActiveStatus(status) {
  return String(status || '').trim().toLowerCase() === 'active';
}

export function isYcSfBayLocation(locations) {
  return YC_SF_LOC_RE.test(String(locations || ''));
}

/**
 * Map yc-oss public directory rows → directory company rows (YC-public license).
 * Active + Bay-area only; acquired/inactive/public-company statuses are excluded.
 */
export function buildYcPublicCompanies(rows = [], retrievedAt = new Date().toISOString().slice(0, 10)) {
  const companies = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isYcActiveStatus(row?.status)) continue;
    if (!isYcSfBayLocation(row?.all_locations || row?.location || row?.city)) continue;
    const name = String(row?.name || row?.company_name || '').trim().slice(0, 160);
    const slug = String(row?.slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    if (!name || !slug) continue;
    const id = `yc:${slug}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const batch = String(row?.batch || '').trim();
    const tags = ['yc'];
    if (batch) tags.push(`YC ${batch}`);
    let inceptionYear = null;
    const launched = Number(row?.launched_at);
    if (Number.isFinite(launched) && launched > 0) {
      const year = new Date(launched * 1000).getUTCFullYear();
      if (year >= 2005 && year <= 2100) inceptionYear = year;
    }
    companies.push({
      id,
      name,
      description:
        String(row?.one_liner || row?.long_description || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 280) || null,
      website: safeUrl(row?.website),
      inceptionYear,
      tags,
      locationPrecision: 'city',
      neighborhood: null,
      hiring: row?.isHiring ? 'yes' : 'unknown',
      source: 'Y Combinator',
      sourceUrl:
        safeUrl(row?.url) || `https://www.ycombinator.com/companies/${slug}`,
      sourceLicense: 'YC-public',
      retrievedAt,
    });
  }
  return companies.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/**
 * Merge YC-public + Wikidata/CC0 lists. Same website host → keep YC row (richer public hiring),
 * fill blank description from Wikidata; port openRoles* if the primary lacks them.
 */
export function mergeNamedCompanies(primary = [], secondary = []) {
  const out = [];
  const hostIndex = new Map();
  for (const row of primary) {
    out.push({ ...row });
    const host = websiteHostKey(row?.website);
    if (host) hostIndex.set(host, out.length - 1);
  }
  for (const row of secondary) {
    const host = websiteHostKey(row?.website);
    if (host && hostIndex.has(host)) {
      const keep = out[hostIndex.get(host)];
      if (!keep.description && row.description) keep.description = row.description;
      if (!keep.website && row.website) keep.website = row.website;
      if (!keep.inceptionYear && row.inceptionYear) keep.inceptionYear = row.inceptionYear;
      if (row.openRoles && !keep.openRoles) {
        keep.openRoles = row.openRoles;
        keep.jobsUrl = row.jobsUrl;
        keep.atsSource = row.atsSource;
        keep.openRolesAt = row.openRolesAt;
      }
      continue;
    }
    out.push({ ...row });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function buildWikidataCompanies(groups = [], retrievedAt = new Date().toISOString()) {
  const companies = new Map();
  for (const { body, tag } of groups) {
    const rows = Array.isArray(body?.results?.bindings) ? body.results.bindings : [];
    for (const row of rows) {
      const qid = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d*)$/.exec(String(row?.company?.value || ''))?.[1];
      const name = String(row?.companyLabel?.value || '').trim().slice(0, 160);
      if (!qid || !name || name === qid) continue;
      const current = companies.get(qid) || {
        id: `wd:${qid}`,
        name,
        description: null,
        website: null,
        inceptionYear: null,
        tags: [],
        locationPrecision: 'city',
        neighborhood: null,
        source: 'Wikidata',
        sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
        sourceLicense: 'CC0-1.0',
        retrievedAt,
      };
      const website = safeUrl(row?.website?.value);
      if (website && (!current.website || (website.startsWith('https:') && !current.website.startsWith('https:')))) current.website = website;
      const description = String(row?.companyDescription?.value || '').trim().replace(/\s+/g, ' ').slice(0, 280);
      if (description && !current.description) current.description = description;
      const year = Number(String(row?.inception?.value || '').slice(0, 4));
      if (!current.inceptionYear && Number.isSafeInteger(year) && year >= 1800 && year <= 2100) current.inceptionYear = year;
      if (tag && !current.tags.includes(tag)) current.tags.push(tag);
      companies.set(qid, current);
    }
  }
  return [...companies.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function buildPublicVenues(venues = [], retrievedAt = new Date().toISOString()) {
  return venues.filter((venue) => Number.isFinite(venue?.lat) && Number.isFinite(venue?.lng) &&
    venue.lat >= 37.69 && venue.lat <= 37.83 && venue.lng >= -122.53 && venue.lng <= -122.35)
    .map((venue) => ({
      id: String(venue.id), name: String(venue.name), area: String(venue.area || 'San Francisco'),
      capacity: Number.isSafeInteger(venue.capacity) && venue.capacity > 0 ? venue.capacity : null,
      cost: String(venue.cost || 'check availability'), notes: String(venue.notes || ''),
      tags: Array.isArray(venue.tags) ? venue.tags.map(String) : [], lat: venue.lat, lng: venue.lng,
      availability: 'not verified', source: 'Demigod venue research seed',
      sourceUrl: null, sourceLicense: null, retrievedAt,
    }));
}

export function buildPublicStartupMap({ counts = [], total = 0, companies = [], venues = [], neighborhoodGeoJson, generatedAt } = {}) {
  // Named companies must carry an attributed public source: CC0-1.0 (Wikidata), YC-public (Y
  // Combinator's public directory), or HN-public (a company's own public "Who is hiring?" post on
  // Hacker News, linked to that thread). No unattributed data.
  const ALLOWED_LICENSES = ['CC0-1.0', 'YC-public', 'HN-public'];
  if (!Array.isArray(companies) || companies.some((company) => !ALLOWED_LICENSES.includes(company?.sourceLicense))) {
    throw new Error('public named companies require an attributed public source (CC0-1.0, YC-public, or HN-public)');
  }
  const boundaries = cleanBoundaryFeatures(neighborhoodGeoJson);
  if (!boundaries.length) throw new Error('DataSF neighborhood boundaries are missing');
  const known = new Set(boundaries.map(({ name }) => name));
  const byNeighborhood = new Map();
  for (const row of counts) {
    const name = String(row?.neighborhood || '').trim();
    const count = asCount(row?.count);
    if (!name || !known.has(name)) throw new Error(`unknown DataSF neighborhood: ${name || '(blank)'}`);
    byNeighborhood.set(name, count);
  }
  // ponytail: emit name/count/centroid only — the public client (minimal startup directory)
  // no longer renders neighborhood polygons (the SVG atlas was removed in foot v803), so the
  // ~229KB of `geometry` was pure download weight (76% of the published payload). Re-add
  // `geometry` here only if a public map that draws polygons comes back.
  const neighborhoods = boundaries.map(({ name, centroid }) => ({
    name,
    count: byNeighborhood.get(name) || 0,
    centroid,
  }));
  const mapped = neighborhoods.reduce((sum, row) => sum + row.count, 0);
  total = asCount(total);
  if (mapped > total) throw new Error('mapped aggregate exceeds total');
  const at = generatedAt || new Date().toISOString();
  return {
    schema: 'demigod.sf-startup-map/3',
    generatedAt: at,
    coverage: {
      total,
      mapped,
      unmapped: total - mapped,
      neighborhoods: neighborhoods.filter(({ count }) => count > 0).length,
      namedCompanies: companies.length,
      venueLeads: venues.length,
      ycIndependentlyEvidenced: companies.filter(({ tags }) => tags?.includes('yc')).length,
      ycPublicDirectory: companies.filter(({ sourceLicense }) => sourceLicense === 'YC-public').length,
      definition: 'Active San Francisco technology business locations with a business start date on or after January 1, 2020, using selected self-reported software, computing, electronics, pharmaceutical, and R&D NAICS groups.',
      caveat:
        'This is an open-data proxy for startup activity, not a startup census. Registrations can include consultants, established firms, and home-based businesses; counts are neighborhood aggregates, never address pins. Named-company facts come from the public YC company directory (YC-public, Active + Bay-area locations) and CC0 Wikidata; current operating status is not independently verified.',
    },
    method: { since: SINCE.slice(0, 10), naicsPrefixes: TECH_NAICS, ycOss: YC_OSS_URL },
    sources: [
      {
        name: 'DataSF Registered Business Locations — San Francisco',
        url: 'https://data.sfgov.org/Economy-and-Community/Registered-Business-Locations-San-Francisco/g8m3-pdis',
        retrievedAt: at,
        license: 'PDDL-1.0',
      },
      {
        name: 'DataSF Analysis Neighborhoods',
        url: BOUNDARIES,
        retrievedAt: at,
        license: 'PDDL-1.0',
      },
      {
        name: 'Wikidata',
        url: 'https://www.wikidata.org/',
        retrievedAt: at,
        license: 'CC0-1.0',
      },
      {
        name: 'Y Combinator',
        url: 'https://www.ycombinator.com/companies',
        retrievedAt: at,
        license: 'YC-public',
      },
    ],
    bounds: mergeBounds(boundaries.map(({ bounds }) => bounds)),
    neighborhoods,
    companies,
    venues,
  };
}

async function json(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);
  if (!response.ok) throw new Error(`${new URL(url).hostname} HTTP ${response.status}`);
  return response.json();
}

export async function refreshPublicStartupMap({ fetchImpl = fetch, outPath = PUBLIC_STARTUP_MAP_PATH, generatedAt } = {}) {
  const where = [
    "city='San Francisco'",
    'dba_end_date is null',
    'location_end_date is null',
    'administratively_closed is null',
    `dba_start_date >= '${SINCE}'`,
    'self_reported_naics_code is not null',
    `(${TECH_NAICS.map((prefix) => `self_reported_naics_code like '${prefix}%'`).join(' OR ')})`,
  ].join(' AND ');
  const grouped = new URLSearchParams({
    '$select': 'neighborhoods_analysis_boundaries as neighborhood,count(distinct ttxid) as count',
    '$where': `${where} AND neighborhoods_analysis_boundaries is not null`,
    '$group': 'neighborhoods_analysis_boundaries',
    '$order': 'count DESC',
    '$limit': '100',
  });
  const totalQuery = new URLSearchParams({
    '$select': 'count(distinct ttxid) as count',
    '$where': where,
  });
  const wikidata = (query) => json(fetchImpl, `${WIKIDATA}?${new URLSearchParams({ query, format: 'json' })}`, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'DemigodStartupAtlas/1.0 (https://trydemigod.com)',
    },
  });
  const [counts, totals, neighborhoodGeoJson, ycBody, startupBody, broadBody, ycOssRaw] = await Promise.all([
    json(fetchImpl, `${BUSINESSES}?${grouped}`),
    json(fetchImpl, `${BUSINESSES}?${totalQuery}`),
    json(fetchImpl, BOUNDARIES),
    wikidata(YC_QUERY),
    wikidata(STARTUP_QUERY),
    wikidata(BROAD_QUERY),
    json(fetchImpl, YC_OSS_URL),
  ]);
  if (!Array.isArray(counts) || !Array.isArray(totals) || totals.length !== 1) {
    throw new Error('DataSF aggregate response is invalid');
  }
  const ycOssList = Array.isArray(ycOssRaw)
    ? ycOssRaw
    : Array.isArray(ycOssRaw?.companies)
      ? ycOssRaw.companies
      : Array.isArray(ycOssRaw?.data)
        ? ycOssRaw.data
        : null;
  if (!ycOssList) throw new Error('YC-oss public directory response is invalid');
  const at = generatedAt || new Date().toISOString();
  const day = at.slice(0, 10);
  const ycCompanies = buildYcPublicCompanies(ycOssList, day);
  const wikidataCompanies = buildWikidataCompanies(
    [
      { body: ycBody, tag: 'yc' },
      { body: startupBody, tag: 'wikidata-startup' },
      { body: broadBody, tag: 'wikidata-sf-tech' },
    ],
    at,
  );
  // HN "Who is hiring?" companies (map-ready cache written by demigod-hn-hiring.mjs; refresh monthly).
  // Graceful if absent — the directory rebuilds fine without it.
  const hnCompanies = (() => {
    try {
      const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-HN-HIRING.json'), 'utf8')).companies || [];
      // The cache is written once and reused across rebuilds, so a row captured BEFORE a host
      // joined BADHOST keeps re-entering the map forever — that is how a company shipped with
      // website "https://producthunt.com/". Re-apply the ban on read.
      return rows.filter((row) => isCompanyWebsiteHost(row.website));
    } catch { return []; }
  })();
  const map = buildPublicStartupMap({
    counts,
    total: totals[0]?.count,
    companies: mergeNamedCompanies(mergeNamedCompanies(ycCompanies, wikidataCompanies), hnCompanies),
    venues: buildPublicVenues(FREE_SF_VENUES, at),
    neighborhoodGeoJson,
    generatedAt: at,
  });
  // Compact JSON: public CDN asset is ~1MB pretty-printed; minify for ship/load without data loss.
  atomicWrite(outPath, `${JSON.stringify(map)}\n`, { mode: 0o644 });
  return { map, outPath };
}

// Rebuild-integrity floors: a deterministic rebuild must not silently produce a truncated directory
// or a total jobs-enrich failure. Job-board MISATTRIBUTION honesty is enforced separately by
// demigod-startup-jobs-enrich.mjs (domain-label + curated ATS aliases, with its own --selftest) —
// the floor deliberately does NOT re-check slugs (legit boards can differ from the domain label,
// e.g. usepylon.com → pylon-labs), it only guards volume so a bad rebuild fails loud.
export function assertMapFloors(map, { withJobs = false, minCompanies = 2000, minYc = 1900, minBoards = 100 } = {}) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const yc = cos.filter((c) => String(c?.id || '').startsWith('yc:')).length;
  const boards = cos.filter((c) => c?.openRoles && c?.atsSource).length;
  const problems = [];
  if (cos.length < minCompanies) problems.push(`companies ${cos.length} < ${minCompanies}`);
  if (yc < minYc) problems.push(`yc: companies ${yc} < ${minYc}`);
  if (withJobs && boards < minBoards) problems.push(`job boards ${boards} < ${minBoards}`);
  if (problems.length) throw new Error('map floor breach: ' + problems.join('; '));
  return { companies: cos.length, yc, boards };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mapArgv = process.argv.slice(2);
  const mapAllowed = new Set(['--selftest', '--with-jobs']);
  const mapUnknown = mapArgv.find((a) => a.startsWith('-') && !mapAllowed.has(a));
  if (mapUnknown) {
    console.error(
      JSON.stringify({
        ok: false,
        error: `unknown argument ${mapUnknown}`,
        usage: 'node demigod-startup-map-data.mjs [--selftest] [--with-jobs]',
      }),
    );
    process.exit(2);
  }
  // Fast, no-network integrity gate for verify-all: real on-disk map passes; a poisoned copy must fail.
  // Base rebuild (no --with-jobs) is valid without ATS fields — jobs floor only when enrich is present
  // or when callers pass withJobs after jobs-enrich (see rebuild path below).
  if (process.argv.includes('--selftest')) {
    try {
      const real = JSON.parse(fs.readFileSync(PUBLIC_STARTUP_MAP_PATH, 'utf8'));
      const cos = Array.isArray(real?.companies) ? real.companies : [];
      const boardsPresent = cos.filter((c) => c?.openRoles && c?.atsSource).length;
      const jobsEnriched = boardsPresent > 0;
      // Base integrity always (companies + YC volume).
      const floors = assertMapFloors(real, { withJobs: false });
      // fail-capable: a truncated rebuild (below the company floor) must breach.
      let threw = false;
      try {
        assertMapFloors({ ...real, companies: cos.slice(0, 1000) }, { withJobs: false });
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('floor guard did not fire on a truncated map');
      // Jobs floor still exists: zero-board map under withJobs:true must fail.
      let jobsFloorThrew = false;
      try {
        assertMapFloors(
          { companies: cos.map((c) => ({ id: c.id, name: c.name })) },
          { withJobs: true },
        );
      } catch {
        jobsFloorThrew = true;
      }
      if (!jobsFloorThrew) throw new Error('jobs floor did not fire on zero boards');
      // If disk already carries ATS enrich, enforce live board volume too.
      if (jobsEnriched) assertMapFloors(real, { withJobs: true });
      console.log(
        JSON.stringify({
          ok: true,
          selftest: 'map-floors',
          jobsEnriched,
          boardsPresent,
          ...floors,
        }),
      );
    } catch (error) {
      console.error(JSON.stringify({ ok: false, selftest: 'map-floors', error: String(error?.message || error) }));
      process.exit(1);
    }
    process.exit(0);
  }
  const withJobs = process.argv.includes('--with-jobs');
  refreshPublicStartupMap()
    .then(({ map, outPath }) => {
      if (withJobs) {
        const r = spawnSync('node', [path.join(ROOT, 'demigod-startup-jobs-enrich.mjs')], { stdio: 'inherit' });
        if (r.status !== 0) throw new Error(`jobs-enrich failed (exit ${r.status})`);
        map = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      }
      const floors = assertMapFloors(map, { withJobs });
      console.log(JSON.stringify({ ok: true, outPath, withJobs, floors }));
    })
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }));
      process.exitCode = 1;
    });
}
