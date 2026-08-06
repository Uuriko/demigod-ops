#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { cleanBoundaryFeatures, mergeBounds } from './demigod-startup-atlas.mjs';
import { FREE_SF_VENUES } from './demigod-events-bot-agent.mjs';
import { isCompanyWebsiteHost, isPlausibleHnCompanyName } from './demigod-hn-hiring.mjs';

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
const DEAD_PUBLIC_WEBSITE_HOSTS = new Set([
  // NXDOMAIN / known-dead public marketing hosts (company rows retained; sourceUrl kept)
  'afriexapp.com',
  'airware.com',
  'asm.co',
  'baseframe.co',
  'blippy.com',
  'brandless.com',
  'btcjam.com',
  'carbic.com',
  'careers.onton.com',
  'cloudkick.com',
  'cnettv.com',
  'crittercism.com',
  'discoverydn.com',
  'doctorbase.com',
  'firstbio.org',
  'futureadvisor.com',
  'gethybrid.io',
  'getspectrum.io',
  'getwillcall.com',
  'giveaway.mobi',
  'globalpressinstitute.org',
  'glu.com',
  'gocheetah.com',
  'humane.com',
  'iamaze.com',
  'insightfellows.com',
  'instaedu.com',
  'jelly.co',
  'magicode.ai',
  'misfit.com',
  'mixamo.com',
  'modalup.com',
  'netsil.com',
  'nobellfoods.com',
  'notehall.com',
  'readyforzero.com',
  'recommender.strands.com',
  'refinetrain.ai',
  'relcy.com',
  'sage-ai.dev',
  'scaledbiolabs.com',
  'scitok.com',
  'smartbase.so',
  'soldsie.com',
  'solrepublic.jp',
  'stipple.com',
  'tambua.health',
  'teetimetommy.com',
  'ticketfly.com',
  'trypartnerhq.com',
  'usepolymorph.com',
  'usepromi.com',
  'vibrantdata.io',
  'wakemate.com',
  'wearehunted.com',
  'withblaze.app',
  'xobni.com',
  'yearend.com',
  'zolient.com',
]);

export const PUBLIC_STARTUP_MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');

const asCount = (value) => {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`invalid aggregate count: ${value}`);
  return count;
};

const safeUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    return ['http:', 'https:'].includes(url.protocol) && !DEAD_PUBLIC_WEBSITE_HOSTS.has(host) ? url.href : null;
  } catch {
    return null;
  }
};

/**
 * CI-15: stable public map company id from known public namespaces only.
 * Never mints identity from free-text name (that is the churn risk).
 * Returns null if the row has no stable id — callers must not invent one.
 *
 * hn: accepts host OR host/slug — ATS-only HN posts key identity on board slug
 * (see demigod-hn-hiring parseHnPost) so two Greenhouse posters do not collide.
 */
export function stableMapCompanyId(row = {}) {
  const id = String(row?.id || '').trim();
  if (/^(yc|wd):[a-z0-9][a-z0-9._-]*$/i.test(id)) return id;
  // slash allowed once path segment for board-slug identity; no spaces / query
  if (/^hn:[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?$/i.test(id)) return id;
  return null;
}

/**
 * Hiring join identity: when a company has a public ATS board URL, the board
 * host+path is the stable key (dedupeByBoard SoR). Else fall back to map id.
 * Pure — does not rewrite the map.
 */
/** Greenhouse hosts the same board on boards., job-boards., and job-boards.eu. */
export function canonicalGreenhouseBoardKey(host, slug) {
  const h = String(host || '')
    .toLowerCase()
    .replace(/^www\./, '');
  const s = String(slug || '')
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '')
    .split('/')[0];
  if (!s) return null;
  if (/^(?:boards|job-boards(?:\.eu)?)\.greenhouse\.io$/.test(h)) {
    return `board:boards.greenhouse.io/${s}`;
  }
  return null;
}

/**
 * Hiring join identity: when a company has a public ATS board URL, the board
 * host+path is the stable key (dedupeByBoard SoR). Else fall back to map id.
 * Pure — does not rewrite the map.
 */
export function hiringIdentityKey(row = {}) {
  const jobs = String(row?.jobsUrl || '').trim();
  if (jobs) {
    try {
      const u = new URL(jobs);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      const pathPart = u.pathname.replace(/\/+$/, '').toLowerCase();
      const slug = pathPart.split('/').filter(Boolean)[0] || '';
      const gh = canonicalGreenhouseBoardKey(host, slug);
      if (gh) return gh;
      if (host) return `board:${host}${pathPart}`;
    } catch {
      /* fall through */
    }
  }
  // ATS-only HN ids encode the public board as host/slug — same board as jobsUrl identity.
  const fromHnId = atsBoardKeyFromHnId(row?.id);
  if (fromHnId) return fromHnId;
  const id = stableMapCompanyId(row);
  return id ? `map:${id}` : null;
}

/**
 * hn:jobs.ashbyhq.com/middesk → board:jobs.ashbyhq.com/middesk
 * Greenhouse aliases collapse to boards.greenhouse.io/<slug> so job-boards(.eu)
 * and boards. forms of the same board absorb instead of re-inflating.
 * So merge can attach ATS-only HN shells to YC/Wikidata rows that already own that board.
 */
export function atsBoardKeyFromHnId(id) {
  const m =
    /^hn:((?:jobs\.ashbyhq\.com|boards\.greenhouse\.io|job-boards(?:\.eu)?\.greenhouse\.io|jobs\.lever\.co|jobs\.workable\.com)\/[a-z0-9._-]+)$/i.exec(
      String(id || '').trim(),
    );
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const gh = /^((?:boards|job-boards(?:\.eu)?)\.greenhouse\.io)\/([a-z0-9._-]+)$/.exec(raw);
  if (gh) return canonicalGreenhouseBoardKey(gh[1], gh[2]);
  return `board:${raw}`;
}

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
    for (const tag of [...(Array.isArray(row?.industries) ? row.industries : []), ...(Array.isArray(row?.tags) ? row.tags : [])]) {
      const clean = String(tag || '').trim().slice(0, 120);
      if (clean && !tags.includes(clean)) tags.push(clean);
    }
    const teamSize = Math.round(Number(row?.team_size));
    const stage = ['Early', 'Growth'].includes(row?.stage) ? row.stage : null;
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
      teamSize: Number.isSafeInteger(teamSize) && teamSize > 0 ? teamSize : null,
      stage,
    });
  }
  return companies.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function buildHnPublicCompanies(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => isPlausibleHnCompanyName(row.name) && isCompanyWebsiteHost(row.website))
    .map((row) => ({ ...row, website: safeUrl(row.website) }));
}

/**
 * Merge YC-public + Wikidata/CC0 lists. Same website host → keep YC row (richer public hiring),
 * fill blank description from Wikidata; port openRoles* if the primary lacks them.
 */
function absorbSecondaryInto(keep, row) {
  if (!keep.description && row.description) keep.description = row.description;
  if (!keep.website && row.website) keep.website = row.website;
  if (!keep.inceptionYear && row.inceptionYear) keep.inceptionYear = row.inceptionYear;
  // HN "hiring:yes" is direct evidence; promote over missing/unknown.
  if (row.hiring === 'yes') keep.hiring = 'yes';
  else if (row.hiring && !keep.hiring) keep.hiring = row.hiring;
  if (row.openRoles && !keep.openRoles) {
    keep.openRoles = row.openRoles;
    keep.jobsUrl = row.jobsUrl;
    keep.atsSource = row.atsSource;
    keep.openRolesAt = row.openRolesAt;
  }
  // Prefer primary jobsUrl; if secondary only carries board via HN id, leave jobsUrl alone.
}

export function mergeNamedCompanies(primary = [], secondary = []) {
  const out = [];
  const hostIndex = new Map();
  const boardIndex = new Map();
  const idIndex = new Map();
  for (const row of primary) {
    out.push({ ...row });
    const idx = out.length - 1;
    const host = websiteHostKey(row?.website);
    if (host) hostIndex.set(host, idx);
    const board = hiringIdentityKey(row);
    if (board?.startsWith('board:')) boardIndex.set(board, idx);
    const sid = stableMapCompanyId(row);
    if (sid) idIndex.set(sid, idx);
  }
  for (const row of secondary) {
    const host = websiteHostKey(row?.website);
    if (host && hostIndex.has(host)) {
      absorbSecondaryInto(out[hostIndex.get(host)], row);
      continue;
    }
    // CI identity: ATS-only HN shell whose board already exists on a primary row — absorb, don't inflate.
    const board = hiringIdentityKey(row);
    if (board?.startsWith('board:') && boardIndex.has(board)) {
      absorbSecondaryInto(out[boardIndex.get(board)], row);
      continue;
    }
    // Same stable map id already present (e.g. re-admit of hn:job-boards…/slug) — absorb.
    const sid = stableMapCompanyId(row);
    if (sid && idIndex.has(sid)) {
      absorbSecondaryInto(out[idIndex.get(sid)], row);
      continue;
    }
    out.push({ ...row });
    const idx = out.length - 1;
    // Deliberate asymmetry. The BOARD key is identity: one ATS board belongs to one company, so a
    // later shell pointing at the same board is the same company and may absorb. A shared HOST is
    // NOT identity — Wikidata carries RockLive (Q7354178) and Shots Podcast Network (Q15977863) as
    // separate entities both listing shots.com, and indexing secondary rows by host merged them
    // into one. That is the false merge this module's own comment warns is worse than carrying a
    // duplicate, and it poisons every downstream claim about both companies. Secondary rows are
    // therefore indexed by board only; host matching stays anchored to primary rows.
    if (board?.startsWith('board:')) boardIndex.set(board, idx);
    if (sid) idIndex.set(sid, idx);
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
  if (companies.some((company) => company?.sourceLicense === 'HN-public' && !isPlausibleHnCompanyName(company.name))) {
    throw new Error('public HN company name is not a plausible attributed identity');
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
      companiesWithTeamSize: companies.filter(({ teamSize }) => Number.isSafeInteger(teamSize) && teamSize > 0).length,
      companiesWithStage: companies.filter(({ stage }) => ['Early', 'Growth'].includes(stage)).length,
      companiesWithSectorTags: companies.filter(({ sourceLicense, tags }) =>
        sourceLicense === 'YC-public' && tags.some((tag) => tag !== 'yc' && !/^YC\s/.test(tag))).length,
      definition: 'Active San Francisco technology business locations with a business start date on or after January 1, 2020, using selected self-reported software, computing, electronics, pharmaceutical, and R&D NAICS groups.',
      caveat:
        'This is an open-data proxy for startup activity, not a startup census. Registrations can include consultants, established firms, and home-based businesses; counts are neighborhood aggregates, never address pins. Named-company facts come from the public YC company directory, CC0 Wikidata, and companies\u2019 public Hacker News Who is Hiring posts; current operating status is not independently verified.',
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
      ...(companies.some(({ sourceLicense }) => sourceLicense === 'HN-public') ? [{
        name: 'Hacker News \u2014 Who is Hiring?',
        url: 'https://news.ycombinator.com/submitted?id=whoishiring',
        retrievedAt: at,
        license: 'HN-public',
      }] : []),
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
      // The cache is reused across rebuilds, so re-apply current identity guards on read.
      return buildHnPublicCompanies(rows);
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

/**
 * Where the rebuild may write. With jobs, stage beside the live map so a killed enrich cannot
 * replace production open-role counts with a bare rebuild (2026-08-06 KEEP_WORKING incident).
 * @param {string} finalPath
 * @param {boolean} withJobs
 */
export function mapRebuildWritePath(finalPath, withJobs) {
  return withJobs ? `${finalPath}.staging` : finalPath;
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

      // CI-15: id namespaces stable; YC slug → yc:slug deterministic; no name-minted ids
      const ycA = buildYcPublicCompanies([{ name: 'Acme', slug: 'acme-co', status: 'Active', all_locations: 'San Francisco, CA', isHiring: true }]);
      const ycB = buildYcPublicCompanies([{ name: 'Acme Renamed', slug: 'acme-co', status: 'Active', all_locations: 'San Francisco', isHiring: false }]);
      if (ycA[0]?.id !== 'yc:acme-co' || ycB[0]?.id !== 'yc:acme-co') {
        throw new Error('YC mapCompanyId not stable on slug (CI-15)');
      }
      if (stableMapCompanyId(ycA[0]) !== 'yc:acme-co') throw new Error('stableMapCompanyId yc');
      if (stableMapCompanyId({ id: 'not-a-ns' }) !== null) throw new Error('refuse unstable id');
      if (stableMapCompanyId({ id: 'hn:acme.io' }) !== 'hn:acme.io') throw new Error('hn host id');
      if (
        stableMapCompanyId({ id: 'hn:jobs.ashbyhq.com/alembic' }) !== 'hn:jobs.ashbyhq.com/alembic'
      ) {
        throw new Error('hn ATS board-slug id must be stable (CI-15)');
      }
      if (stableMapCompanyId({ id: 'hn:evil.com/foo/bar' }) !== null) {
        throw new Error('hn multi-path ids refused');
      }
      if (stableMapCompanyId({ id: 'hn:Name Minted' }) !== null) throw new Error('hn space name-mint refused');
      const boardKey1 = hiringIdentityKey({
        id: 'wd:Q1',
        jobsUrl: 'https://jobs.lever.co/Acme/',
      });
      const boardKey2 = hiringIdentityKey({
        id: 'yc:other',
        jobsUrl: 'https://www.jobs.lever.co/acme',
      });
      // same board host+path after normalize (www strip + lower + trim slash)
      if (boardKey1 !== 'board:jobs.lever.co/acme') throw new Error(`board key1 ${boardKey1}`);
      if (boardKey2 !== 'board:jobs.lever.co/acme') throw new Error(`board key2 ${boardKey2}`);
      if (
        hiringIdentityKey({ id: 'hn:jobs.ashbyhq.com/alembic' }) !==
        'board:jobs.ashbyhq.com/alembic'
      ) {
        throw new Error('hn board-slug id maps to board identity (prevents re-inflation)');
      }
      if (atsBoardKeyFromHnId('hn:jobs.ashbyhq.com/middesk') !== 'board:jobs.ashbyhq.com/middesk') {
        throw new Error('atsBoardKeyFromHnId');
      }
      // Greenhouse host aliases are one board identity (boards vs job-boards vs job-boards.eu).
      if (
        hiringIdentityKey({ jobsUrl: 'https://job-boards.greenhouse.io/kinelo' }) !==
        'board:boards.greenhouse.io/kinelo'
      ) {
        throw new Error('job-boards.greenhouse must canonicalize to boards.greenhouse');
      }
      if (
        hiringIdentityKey({ jobsUrl: 'https://boards.greenhouse.io/kinelo' }) !==
        hiringIdentityKey({ jobsUrl: 'https://job-boards.eu.greenhouse.io/kinelo' })
      ) {
        throw new Error('EU job-boards.greenhouse must match boards.greenhouse board key');
      }
      if (
        atsBoardKeyFromHnId('hn:job-boards.greenhouse.io/kinelo') !==
        'board:boards.greenhouse.io/kinelo'
      ) {
        throw new Error('hn job-boards id must canonicalize to boards.greenhouse board key');
      }
      {
        const mergedGh = mergeNamedCompanies(
          [
            {
              id: 'hn:job-boards.greenhouse.io/kinelo',
              name: 'Kinelo',
              website: 'https://www.kinelo.com/',
              jobsUrl: 'https://boards.greenhouse.io/kinelo',
            },
          ],
          [
            {
              id: 'hn:job-boards.greenhouse.io/kinelo',
              name: 'Kinelo',
              website: null,
              jobsUrl: 'https://job-boards.greenhouse.io/kinelo',
              hiring: 'yes',
            },
          ],
        );
        if (mergedGh.length !== 1) {
          throw new Error(`Greenhouse alias re-admit must not duplicate, got ${mergedGh.length}`);
        }
      }
      // mergeNamedCompanies: YC row with jobsUrl absorbs ATS-only HN shell on same board
      {
        const merged = mergeNamedCompanies(
          [
            {
              id: 'yc:middesk',
              name: 'Middesk',
              website: 'https://middesk.com/',
              jobsUrl: 'https://jobs.ashbyhq.com/middesk',
              openRoles: 22,
            },
          ],
          [
            {
              id: 'hn:jobs.ashbyhq.com/middesk',
              name: 'Middesk',
              website: null,
              hiring: 'yes',
              source: 'Hacker News (Who is Hiring)',
            },
          ],
        );
        if (merged.length !== 1 || merged[0].id !== 'yc:middesk') {
          throw new Error(`HN ATS shell must absorb into YC board owner, got ${merged.length} ${merged[0]?.id}`);
        }
        if (merged[0].hiring !== 'yes') throw new Error('absorb hiring flag from HN shell');
      }
      // full disk: every id must be stable namespace (no silent sample skip)
      let unstableDisk = 0;
      for (const c of cos) {
        if (c?.id && !stableMapCompanyId(c)) {
          unstableDisk++;
          if (unstableDisk <= 3) throw new Error(`unstable map id on disk: ${c.id}`);
        }
      }
      if (unstableDisk) throw new Error(`unstable map ids on disk: ${unstableDisk}`);

      console.log(
        JSON.stringify({
          ok: true,
          selftest: 'map-floors',
          jobsEnriched,
          boardsPresent,
          identity: {
            ycStable: true,
            boardKey: boardKey1,
            hnAtsSlugStable: true,
            diskIdsStable: cos.length,
          },
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
  // --with-jobs must not write a bare (zero-board) rebuild over the live map. Stage first; promote
  // only after jobs-enrich + floors succeed. A killed enrich leaves production open-role counts intact.
  const finalPath = PUBLIC_STARTUP_MAP_PATH;
  const writePath = mapRebuildWritePath(finalPath, withJobs);
  if (withJobs && writePath !== finalPath && fs.existsSync(writePath)) {
    try { fs.unlinkSync(writePath); } catch { /* stale staging from a prior kill */ }
  }
  refreshPublicStartupMap({ outPath: writePath })
    .then(({ map, outPath }) => {
      if (withJobs) {
        const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-startup-jobs-enrich.mjs')], {
          stdio: 'inherit',
          env: { ...process.env, DEMIGOD_STARTUP_MAP: outPath },
        });
        if (r.status !== 0) {
          try { fs.unlinkSync(outPath); } catch { /* staging only */ }
          throw new Error(`jobs-enrich failed (exit ${r.status}) — production map left unchanged`);
        }
        map = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        const floors = assertMapFloors(map, { withJobs: true });
        atomicWrite(finalPath, `${JSON.stringify(map)}\n`, { mode: 0o644 });
        try { fs.unlinkSync(outPath); } catch { /* */ }
        console.log(JSON.stringify({ ok: true, outPath: finalPath, withJobs, staged: true, floors }));
        return;
      }
      const floors = assertMapFloors(map, { withJobs: false });
      console.log(JSON.stringify({ ok: true, outPath, withJobs, floors }));
    })
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }));
      process.exitCode = 1;
    });
}
