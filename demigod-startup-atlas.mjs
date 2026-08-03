#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
export const STARTUP_ATLAS_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUPS.json');
const YC_PAGE = 'https://www.ycombinator.com/companies';
const DATASF_ACTIVE = 'https://data.sfgov.org/resource/kvj8-g7jh.json';
const DATASF_NEIGHBORHOODS = 'https://data.sfgov.org/resource/j2bu-swwd.geojson?$limit=50';

const clamp = (value, max) => String(value ?? '').trim().slice(0, max);

export function normalizeCompanyName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .replace(/\b(?:incorporated|corporation|company|limited|inc|corp|llc|ltd|pllc|lp|co)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}

function exactSfLocation(value) {
  return String(value ?? '')
    .split(';')
    .some((part) => part.trim().toLowerCase() === 'san francisco, ca, usa');
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function cleanCoordinates(value, depth = 0) {
  if (depth > 6 || !Array.isArray(value)) return null;
  if (value.length >= 2 && value.every((item) => typeof item === 'number')) {
    return value.every(Number.isFinite) ? value.slice() : null;
  }
  const rows = value.map((item) => cleanCoordinates(item, depth + 1)).filter(Boolean);
  return rows.length ? rows : null;
}

function simplifyRing(ring, maxPoints = 180) {
  if (!Array.isArray(ring) || ring.length <= maxPoints) return ring;
  // ponytail: display-only vertex cap; use Douglas-Peucker if this ever becomes analytical geometry.
  const closed = ring[0]?.[0] === ring.at(-1)?.[0] && ring[0]?.[1] === ring.at(-1)?.[1];
  const end = closed ? ring.length - 1 : ring.length;
  const stride = Math.ceil(end / (maxPoints - 1));
  const out = [];
  for (let index = 0; index < end; index += stride) out.push(ring[index]);
  out.push(closed ? [...out[0]] : ring.at(-1));
  return out;
}

function cleanGeometry(value) {
  const type = value?.type;
  if (type !== 'Polygon' && type !== 'MultiPolygon') return null;
  const coordinates = cleanCoordinates(value.coordinates);
  if (!coordinates) return null;
  const simplified = type === 'Polygon'
    ? coordinates.map((ring) => simplifyRing(ring))
    : coordinates.map((polygon) => polygon.map((ring) => simplifyRing(ring)));
  return { type, coordinates: simplified };
}

function geometryBounds(geometry) {
  const out = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity };
  const walk = (value) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && value.every((item) => typeof item === 'number')) {
      const [lng, lat] = value;
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        out.west = Math.min(out.west, lng);
        out.east = Math.max(out.east, lng);
        out.south = Math.min(out.south, lat);
        out.north = Math.max(out.north, lat);
      }
      return;
    }
    value.forEach(walk);
  };
  walk(geometry?.coordinates);
  return Object.values(out).every(Number.isFinite) ? out : null;
}

export function mergeBounds(bounds) {
  if (!bounds.length) return { west: -122.53, south: 37.69, east: -122.35, north: 37.84 };
  return {
    west: Math.min(...bounds.map((item) => item.west)),
    south: Math.min(...bounds.map((item) => item.south)),
    east: Math.max(...bounds.map((item) => item.east)),
    north: Math.max(...bounds.map((item) => item.north)),
  };
}

export function cleanBoundaryFeatures(geojson) {
  return (Array.isArray(geojson?.features) ? geojson.features : [])
    .map((feature) => {
      const name = clamp(feature?.properties?.nhood, 100);
      const geometry = cleanGeometry(feature?.geometry);
      const bounds = geometry && geometryBounds(geometry);
      if (!name || !geometry || !bounds) return null;
      return {
        name,
        geometry,
        bounds,
        centroid: {
          lat: (bounds.south + bounds.north) / 2,
          lng: (bounds.west + bounds.east) / 2,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function companyFromYc(row) {
  const rawId = clamp(row?.id ?? row?.objectID, 80);
  const name = clamp(row?.name, 160);
  if (!rawId || !name || String(row?.status).toLowerCase() !== 'active' || !exactSfLocation(row?.all_locations)) {
    return null;
  }
  const slug = /^[a-z0-9-]+$/i.test(String(row?.slug ?? '')) ? String(row.slug).toLowerCase() : '';
  const teamSize = Math.round(Number(row?.team_size));
  return {
    id: `yc:${rawId}`,
    name,
    slug,
    website: safeHttpUrl(row?.website),
    oneLiner: clamp(row?.one_liner, 320),
    batch: clamp(row?.batch, 40),
    industry: clamp(row?.industry, 100),
    subindustry: clamp(row?.subindustry, 140),
    teamSize: Number.isSafeInteger(teamSize) && teamSize > 0 ? teamSize : null,
    hiring: row?.isHiring === true,
    status: 'Active',
    source: 'yc_directory',
    sourceUrl: slug ? `${YC_PAGE}/${encodeURIComponent(slug)}` : YC_PAGE,
    sfPresence: 'San Francisco, CA',
  };
}

export function buildStartupAtlas({ ycCompanies = [], sfBusinesses = [], neighborhoodGeoJson = null, generatedAt, sources } = {}) {
  const at = generatedAt || new Date().toISOString();
  const boundaries = cleanBoundaryFeatures(neighborhoodGeoJson);
  const boundaryNames = new Map(boundaries.map((item) => [item.name.toLowerCase(), item.name]));
  const registrations = new Map();
  for (const row of sfBusinesses) {
    const neighborhood = boundaryNames.get(clamp(row?.neighborhoods_analysis_boundaries, 100).toLowerCase());
    if (!neighborhood) continue;
    for (const value of [row?.dba_name, row?.ownership_name]) {
      const key = normalizeCompanyName(value);
      if (key.length < 4) continue;
      if (!registrations.has(key)) registrations.set(key, new Set());
      registrations.get(key).add(neighborhood);
    }
  }

  const byId = new Map();
  for (const row of ycCompanies) {
    const company = companyFromYc(row);
    if (company && !byId.has(company.id)) byId.set(company.id, company);
  }
  const nameCounts = new Map();
  for (const company of byId.values()) {
    const key = normalizeCompanyName(company.name);
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  }
  const companies = [...byId.values()]
    .map((company) => {
      const key = normalizeCompanyName(company.name);
      const matches = nameCounts.get(key) === 1 ? registrations.get(key) : null;
      const neighborhood = matches?.size === 1 ? [...matches][0] : null;
      return {
        ...company,
        locationPrecision: neighborhood ? 'neighborhood' : 'city',
        neighborhood,
        locationSource: neighborhood ? DATASF_ACTIVE : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const companiesByNeighborhood = new Map();
  for (const company of companies) {
    if (!company.neighborhood) continue;
    if (!companiesByNeighborhood.has(company.neighborhood)) companiesByNeighborhood.set(company.neighborhood, []);
    companiesByNeighborhood.get(company.neighborhood).push(company.id);
  }
  const neighborhoods = boundaries.map(({ name, geometry, centroid }) => ({
    name,
    count: companiesByNeighborhood.get(name)?.length || 0,
    companyIds: (companiesByNeighborhood.get(name) || []).sort(),
    centroid,
    geometry,
  }));
  const neighborhoodPlaced = companies.filter((company) => company.locationPrecision === 'neighborhood').length;

  return {
    schema: 'demigod.sf-startup-atlas/1',
    generatedAt: at,
    coverage: {
      total: companies.length,
      neighborhoodPlaced,
      cityOnly: companies.length - neighborhoodPlaced,
      neighborhoods: neighborhoods.filter((item) => item.count > 0).length,
      definition: 'Active Y Combinator companies whose public YC profile lists San Francisco, CA, USA.',
      caveat: 'No authoritative complete startup census exists. Neighborhood clusters are registry name matches, not verified offices; city-only companies remain off-map.',
    },
    sources: sources || [
      { name: 'Y Combinator Startup Directory', url: YC_PAGE, retrievedAt: at },
      { name: 'DataSF Active Business Locations', url: DATASF_ACTIVE, retrievedAt: at, license: 'PDDL-1.0' },
      { name: 'DataSF Analysis Neighborhoods', url: DATASF_NEIGHBORHOODS, retrievedAt: at, license: 'PDDL-1.0' },
    ],
    bounds: mergeBounds(boundaries.map((item) => item.bounds)),
    companies,
    neighborhoods,
  };
}

async function fetchJson(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);
  if (!response.ok) throw new Error(`${new URL(url).hostname} HTTP ${response.status}`);
  return response.json();
}

async function fetchDataSfBusinesses(fetchImpl) {
  const rows = [];
  const limit = 50_000;
  for (let offset = 0; offset < 250_000; offset += limit) {
    const query = new URLSearchParams({
      '$select': 'ownership_name,dba_name,neighborhoods_analysis_boundaries',
      '$where': "city='San Francisco'",
      '$order': 'ttxid',
      '$limit': String(limit),
      '$offset': String(offset),
    });
    const page = await fetchJson(fetchImpl, `${DATASF_ACTIVE}?${query}`);
    if (!Array.isArray(page)) throw new Error('DataSF active-business response invalid');
    rows.push(...page);
    if (page.length < limit) return rows;
  }
  throw new Error('DataSF result set exceeded safety cap');
}

export async function refreshStartupAtlas({ fetchImpl = fetch, outPath = STARTUP_ATLAS_PATH, generatedAt, ycCompanies, sources } = {}) {
  if (!Array.isArray(ycCompanies)) {
    throw new Error('ycCompanies input required; automatic YC directory scraping is disabled');
  }
  const at = generatedAt || new Date().toISOString();
  const [sfBusinesses, neighborhoodGeoJson] = await Promise.all([
    fetchDataSfBusinesses(fetchImpl),
    fetchJson(fetchImpl, DATASF_NEIGHBORHOODS),
  ]);
  const atlas = buildStartupAtlas({ ycCompanies, sfBusinesses, neighborhoodGeoJson, generatedAt: at, sources });
  atomicWrite(outPath, `${JSON.stringify(atlas, null, 2)}\n`, { mode: 0o600 });
  return { atlas, outPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== 'refresh') {
    console.error('usage: node demigod-startup-atlas.mjs refresh');
    process.exitCode = 2;
  } else {
    refreshStartupAtlas()
      .then(({ atlas, outPath }) => {
        console.log(JSON.stringify({ ok: true, outPath, coverage: atlas.coverage, generatedAt: atlas.generatedAt }));
      })
      .catch((error) => {
        console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }));
        process.exitCode = 1;
      });
  }
}
