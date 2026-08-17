#!/usr/bin/env node
/**
 * demigod-agent-dashboard — multi-agent + tools dashboard (agent-first)
 *
 * Human UI:  http://127.0.0.1:9878/
 * Agent API: http://127.0.0.1:9878/api/status
 * Agent brief: /api/agent-brief  → /tmp/dg-busy/AGENT-BRIEF.md
 * Tools: /api/tools · Jobs: POST /api/jobs?run=smoke
 * Cockpit/Smoke: /api/cockpit · /api/smoke
 * Control: /api/control · Orient: /api/orient · Unify: /api/unify · Truth: /api/truth
 * Ponytail: /api/ponytail · jobs ponytail|ponytail-check
 * Startup atlas: /api/startup-atlas · Maps: /api/maps · /api/maps/:id · Priority: /api/priority · Dogfood: /api/dogfood · Orca: /api/orca · Craft: /api/craft
 * Company table: /companies · /companies/:id  (private, 127.0.0.1, demigod-company-table.mjs)
 * Structured hiring: /api/structured-hiring · /api/structured-hiring?role=ID · Control board: /api/control-board
 *
 * Sections in this file:
 *   imports/config · status builders · JOBS allowlist · HTTP API routes · static UI
 * UI file: demigod-agent-dashboard-ui.html (loaded from disk — no nested quote bugs)
 * Usage: node demigod-agent-dashboard.mjs | bin/dg-dash
 * Prefer bin/dg orient for CLI session start (not only the dash).
 */
import http from 'http';
import { dashboardCorsOrigin, dashboardLocalHost, dashboardLocalRequest, dashboardMutationIntent, privateDashboardJsonHeaders, privateDashboardSecurityHeaders } from './demigod-dashboard-http-policy.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync, execFile, execFileSync, spawnSync } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { refuseIfStale } from './demigod-evidence.mjs';
import { buildNext } from './demigod-next.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { eventAudienceBrief, hasFutureDateTime, isRealInviteUrl, isRealOutreachEmail, matchOffersToEvent, outreachDraftReadiness, resourceGaps } from './demigod-events-bot-agent.mjs';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const cliArgs = process.argv.slice(2);
const portIndex = cliArgs.indexOf('--port');
const portArg = portIndex < 0 ? null : cliArgs[portIndex + 1];
const knownArgs = new Set(['--port', '--snapshot', '--help', '-h']);
const unknownArgs = cliArgs.filter((arg, index) => !(portIndex >= 0 && index === portIndex + 1) && !knownArgs.has(arg));
const modes = cliArgs.filter((arg) => ['--snapshot', '--help', '-h'].includes(arg));
const requestedPort = portArg ?? process.env.DEMIGOD_DASH_PORT ?? '9878';
if (
  unknownArgs.length ||
  modes.length > 1 ||
  cliArgs.filter((arg) => arg === '--port').length > 1 ||
  (portIndex >= 0 && portArg == null) ||
  !/^\d+$/.test(requestedPort) ||
  Number(requestedPort) < 1 ||
  Number(requestedPort) > 65535
) {
  console.error('usage: node demigod-agent-dashboard.mjs [--port 1..65535] [--snapshot]');
  process.exit(2);
}
const PORT = Number(requestedPort);
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const LIVE = 'https://www.trydemigod.com';
const MULTI = '/tmp/dg-multi';
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const EVENTS_STORE = process.env.DEMIGOD_EVENTS_STORE || path.join(ROOT, 'DEMIGOD-EVENTS.json');
const GATE_LATEST = '/tmp/demigod-gate-latest.txt';
const BRIEF_MD = path.join(BUSY, 'AGENT-BRIEF.md');
const BRIEF_JSON = path.join(BUSY, 'AGENT-BRIEF.json');
const STATUS_JSON = path.join(BUSY, 'dashboard-status.json');
const SERVER_HEARTBEAT = path.join(BUSY, 'dashboard-server.heartbeat');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`demigod-agent-dashboard

Usage: node demigod-agent-dashboard.mjs [--port <port>] [--snapshot]

Serves the local dashboard and agent API on 127.0.0.1.
Default port: 9878 (override with --port or DEMIGOD_DASH_PORT).
--snapshot refreshes dashboard-status.json without opening a listener.`);
  process.exit(0);
}

function safeRead(file, max = 120_000) {
  try {
    const s = fs.readFileSync(file, 'utf8');
    return s.length > max ? s.slice(0, max) + '\n…' : s;
  } catch {
    return null;
  }
}

function safeJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const STARTUP_ATLAS_SCHEMA = 'demigod.sf-startup-atlas/1';
const STARTUP_ATLAS_FILE = 'DEMIGOD-SF-STARTUPS.json';

function startupAtlasView(input) {
  const fail = (message) => { throw new Error(message); };
  const record = (value, label) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
    return value;
  };
  const own = (value, key, label) => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${label}.${key} is required`);
    return value[key];
  };
  const text = (value, label, { nullable = false, empty = false, max = 500 } = {}) => {
    if (nullable && value === null) return null;
    if (typeof value !== 'string') fail(`${label} must be ${nullable ? 'a string or null' : 'a string'}`);
    const clean = value.replace(/\s+/g, ' ').trim();
    if (!clean && !nullable && !empty) fail(`${label} must not be empty`);
    return clean.slice(0, max);
  };
  const url = (value, label, { nullable = false } = {}) => {
    const clean = text(value, label, { nullable, max: 500 });
    if (clean === null) return null;
    let parsed;
    try { parsed = new URL(clean); } catch { fail(`${label} must be an http(s) URL`); }
    if (!['http:', 'https:'].includes(parsed.protocol)) fail(`${label} must be an http(s) URL`);
    return parsed.href;
  };
  const date = (value, label) => {
    const clean = text(value, label, { max: 80 });
    const time = Date.parse(clean);
    if (!Number.isFinite(time)) fail(`${label} must be a date`);
    return new Date(time).toISOString();
  };
  const count = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 0) fail(`${label} must be a non-negative integer`);
    return value;
  };

  const atlas = record(input, 'atlas');
  if (own(atlas, 'schema', 'atlas') !== STARTUP_ATLAS_SCHEMA) fail(`schema must be ${STARTUP_ATLAS_SCHEMA}`);
  const generatedAt = date(own(atlas, 'generatedAt', 'atlas'), 'generatedAt');
  const boundsInput = record(own(atlas, 'bounds', 'atlas'), 'bounds');
  const bounds = Object.fromEntries(['west', 'south', 'east', 'north'].map((key) => {
    const value = own(boundsInput, key, 'bounds');
    if (!Number.isFinite(value)) fail(`bounds.${key} must be finite`);
    return [key, value];
  }));
  if (bounds.west >= bounds.east || bounds.south >= bounds.north) fail('bounds must describe a positive area');
  if (bounds.west < -123 || bounds.east > -122 || bounds.south < 37 || bounds.north > 38.5) {
    fail('bounds must stay within the San Francisco region');
  }

  const coverageInput = record(own(atlas, 'coverage', 'atlas'), 'coverage');
  const coverage = {
    total: count(own(coverageInput, 'total', 'coverage'), 'coverage.total'),
    neighborhoodPlaced: count(own(coverageInput, 'neighborhoodPlaced', 'coverage'), 'coverage.neighborhoodPlaced'),
    cityOnly: count(own(coverageInput, 'cityOnly', 'coverage'), 'coverage.cityOnly'),
    neighborhoods: count(own(coverageInput, 'neighborhoods', 'coverage'), 'coverage.neighborhoods'),
    definition: text(own(coverageInput, 'definition', 'coverage'), 'coverage.definition', { max: 800 }),
    caveat: text(own(coverageInput, 'caveat', 'coverage'), 'coverage.caveat', { max: 1200 }),
  };

  const sourcesInput = own(atlas, 'sources', 'atlas');
  if (!Array.isArray(sourcesInput) || !sourcesInput.length || sourcesInput.length > 100) fail('sources must be a non-empty array');
  const sources = sourcesInput.map((item, index) => {
    const source = record(item, `sources[${index}]`);
    const clean = {
      name: text(own(source, 'name', `sources[${index}]`), `sources[${index}].name`, { max: 160 }),
      url: url(own(source, 'url', `sources[${index}]`), `sources[${index}].url`),
      retrievedAt: date(own(source, 'retrievedAt', `sources[${index}]`), `sources[${index}].retrievedAt`),
    };
    if (Object.prototype.hasOwnProperty.call(source, 'license')) {
      clean.license = text(source.license, `sources[${index}].license`, { nullable: true, max: 160 });
    }
    return clean;
  });

  const companiesInput = own(atlas, 'companies', 'atlas');
  if (!Array.isArray(companiesInput) || companiesInput.length > 5000) fail('companies must be an array with at most 5000 entries');
  const companyIds = new Set();
  const companies = companiesInput.map((item, index) => {
    const label = `companies[${index}]`;
    const company = record(item, label);
    for (const key of ['id', 'name', 'slug', 'website', 'oneLiner', 'batch', 'industry', 'subindustry', 'teamSize', 'hiring', 'status', 'source', 'sourceUrl', 'sfPresence', 'locationPrecision', 'neighborhood', 'locationSource']) own(company, key, label);
    const id = text(company.id, `${label}.id`, { max: 120 });
    if (!/^[A-Za-z0-9._:-]+$/.test(id) || companyIds.has(id)) fail(`${label}.id must be unique and URL-safe`);
    companyIds.add(id);
    if (typeof company.hiring !== 'boolean') fail(`${label}.hiring must be boolean`);
    if (company.teamSize !== null && (!Number.isSafeInteger(company.teamSize) || company.teamSize < 0)) fail(`${label}.teamSize must be a non-negative integer or null`);
    if (!['neighborhood', 'city'].includes(company.locationPrecision)) fail(`${label}.locationPrecision must be neighborhood or city`);
    const neighborhood = text(company.neighborhood, `${label}.neighborhood`, { nullable: true, max: 120 });
    if (company.locationPrecision === 'neighborhood' && !neighborhood) fail(`${label}.neighborhood is required at neighborhood precision`);
    if (company.locationPrecision === 'city' && neighborhood !== null) fail(`${label}.neighborhood must be null at city precision`);
    return {
      id,
      name: text(company.name, `${label}.name`, { max: 180 }),
      slug: text(company.slug, `${label}.slug`, { empty: true, max: 180 }),
      website: url(company.website, `${label}.website`, { nullable: true }),
      oneLiner: text(company.oneLiner, `${label}.oneLiner`, { empty: true, max: 500 }),
      batch: text(company.batch, `${label}.batch`, { empty: true, max: 80 }),
      industry: text(company.industry, `${label}.industry`, { empty: true, max: 120 }),
      subindustry: text(company.subindustry, `${label}.subindustry`, { empty: true, max: 160 }),
      teamSize: company.teamSize,
      hiring: company.hiring,
      status: text(company.status, `${label}.status`, { nullable: true, max: 80 }),
      source: text(company.source, `${label}.source`, { max: 160 }),
      sourceUrl: url(company.sourceUrl, `${label}.sourceUrl`),
      sfPresence: text(company.sfPresence, `${label}.sfPresence`, { max: 180 }),
      locationPrecision: company.locationPrecision,
      neighborhood,
      locationSource: url(company.locationSource, `${label}.locationSource`, { nullable: true }),
    };
  });

  const neighborhoodsInput = own(atlas, 'neighborhoods', 'atlas');
  if (!Array.isArray(neighborhoodsInput) || neighborhoodsInput.length > 200) fail('neighborhoods must be an array with at most 200 entries');
  const neighborhoodNames = new Set();
  const placedIds = new Set();
  const inBounds = ([lng, lat]) =>
    Number.isFinite(lng) && Number.isFinite(lat) &&
    lng >= bounds.west - 1e-6 && lng <= bounds.east + 1e-6 &&
    lat >= bounds.south - 1e-6 && lat <= bounds.north + 1e-6;
  const ring = (value, label) => {
    if (!Array.isArray(value) || value.length < 4) fail(`${label} must contain at least four points`);
    const clean = value.map((point, index) => {
      if (!Array.isArray(point) || point.length < 2 || !inBounds(point)) fail(`${label}[${index}] must be a finite point within bounds`);
      return [point[0], point[1]];
    });
    const first = clean[0];
    const last = clean[clean.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) fail(`${label} must be closed`);
    return clean;
  };
  const polygon = (value, label) => {
    if (!Array.isArray(value) || !value.length) fail(`${label} must contain at least one ring`);
    return value.map((item, index) => ring(item, `${label}[${index}]`));
  };
  const neighborhoods = neighborhoodsInput.map((item, index) => {
    const label = `neighborhoods[${index}]`;
    const neighborhood = record(item, label);
    for (const key of ['name', 'count', 'companyIds', 'centroid', 'geometry']) own(neighborhood, key, label);
    const name = text(neighborhood.name, `${label}.name`, { max: 120 });
    const nameKey = name.toLocaleLowerCase('en-US');
    if (neighborhoodNames.has(nameKey)) fail(`${label}.name must be unique`);
    neighborhoodNames.add(nameKey);
    const ids = neighborhood.companyIds;
    if (!Array.isArray(ids)) fail(`${label}.companyIds must be an array`);
    const cleanIds = ids.map((id, idIndex) => text(id, `${label}.companyIds[${idIndex}]`, { max: 120 }));
    if (new Set(cleanIds).size !== cleanIds.length) fail(`${label}.companyIds must not contain duplicates`);
    if (count(neighborhood.count, `${label}.count`) !== cleanIds.length) fail(`${label}.count must equal companyIds.length`);
    for (const id of cleanIds) {
      if (!companyIds.has(id)) fail(`${label}.companyIds contains an unknown company`);
      if (placedIds.has(id)) fail('a company may belong to only one neighborhood cluster');
      placedIds.add(id);
    }
    const centroidInput = record(neighborhood.centroid, `${label}.centroid`);
    const centroid = {
      lat: own(centroidInput, 'lat', `${label}.centroid`),
      lng: own(centroidInput, 'lng', `${label}.centroid`),
    };
    if (!inBounds([centroid.lng, centroid.lat])) fail(`${label}.centroid must be finite and within bounds`);
    const geometryInput = record(neighborhood.geometry, `${label}.geometry`);
    if (!['Polygon', 'MultiPolygon'].includes(geometryInput.type)) fail(`${label}.geometry must be Polygon or MultiPolygon`);
    const geometry = {
      type: geometryInput.type,
      coordinates: geometryInput.type === 'Polygon'
        ? polygon(geometryInput.coordinates, `${label}.geometry.coordinates`)
        : (() => {
            if (!Array.isArray(geometryInput.coordinates) || !geometryInput.coordinates.length) fail(`${label}.geometry.coordinates must contain polygons`);
            return geometryInput.coordinates.map((item, polygonIndex) => polygon(item, `${label}.geometry.coordinates[${polygonIndex}]`));
          })(),
    };
    return { name, count: cleanIds.length, companyIds: cleanIds, centroid, geometry };
  });

  const companyById = new Map(companies.map((company) => [company.id, company]));
  for (const neighborhood of neighborhoods) {
    for (const id of neighborhood.companyIds) {
      const company = companyById.get(id);
      if (company.locationPrecision !== 'neighborhood' || company.neighborhood !== neighborhood.name) {
        fail(`company ${id} does not match its neighborhood cluster`);
      }
    }
  }
  for (const company of companies) {
    if (company.locationPrecision === 'neighborhood' && !placedIds.has(company.id)) fail(`company ${company.id} is missing from its neighborhood cluster`);
    if (company.locationPrecision === 'city' && placedIds.has(company.id)) fail(`city-only company ${company.id} must not appear in a map cluster`);
  }
  const neighborhoodPlaced = companies.filter((company) => company.locationPrecision === 'neighborhood').length;
  const cityOnly = companies.length - neighborhoodPlaced;
  if (
    coverage.total !== companies.length ||
    coverage.neighborhoodPlaced !== neighborhoodPlaced ||
    coverage.cityOnly !== cityOnly ||
    coverage.neighborhoods !== neighborhoods.filter((neighborhood) => neighborhood.count > 0).length
  ) fail('coverage counts do not match the atlas contents');

  return { schema: STARTUP_ATLAS_SCHEMA, generatedAt, coverage, sources, bounds, companies, neighborhoods };
}

function writeJsonAtomic(file, value) {
  // A single dashboard process can have overlapping async request handlers.
  // PID-only temp names let one write rename another write's temp file, leaving
  // the second request to fail with ENOENT. Give every publication its own temp.
  const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, file);
  } finally {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // The rename normally consumed it; cleanup is best-effort on write errors.
    }
  }
}

function demandStatusSnapshot(j) {
  if (!j || typeof j !== 'object') return null;
  const top3 = Array.isArray(j.drafts?.top3) ? j.drafts.top3 : [];
  const needFix = Array.isArray(j.drafts?.needFix) ? j.drafts.needFix : [];
  // `hygieneOk` means no hard error, but warning flags still make a draft
  // non-clean. Keep the legacy fallback aligned with demigod-demand's
  // canonical `clean` count instead of silently promoting warned drafts.
  const cleanCount = top3.filter(
    (draft) => draft?.hygieneOk === true && Number(draft?.flagCount || 0) === 0,
  ).length;
  const allHygieneOk = j.drafts?.allHygieneOk ?? null;
  const sourceHygiene = j.drafts?.hygiene;
  // Prefer the path carried by the hygiene evidence itself. Canary and
  // isolated producers intentionally redirect demand materialization, and
  // replacing that provenance with the outer snapshot path makes the status
  // JSON advertise a different file than the one that produced the verdict.
  const hygieneStatusPath = sourceHygiene?.statusPath || j.statusPath || path.join(BUSY, 'demand-status.json');
  // A path alone is weak provenance: an independently refreshed producer can
  // replace the receipt at that path between dashboard polls. Bind the status
  // projection to the exact bytes inspected so file-only agents can detect
  // replacement or partial-copy drift without trusting mtime.
  const sourceReceipt = (() => {
    try {
      const bytes = fs.statSync(hygieneStatusPath).size;
      return {
        schema: 'demigod.source-receipt/1',
        capturedAt: new Date().toISOString(),
        path: hygieneStatusPath,
        bytes,
        sha256: sha256File(hygieneStatusPath),
      };
    } catch {
      return {
        schema: 'demigod.source-receipt/1',
        capturedAt: new Date().toISOString(),
        path: hygieneStatusPath,
        bytes: null,
        sha256: null,
      };
    }
  })();
  const hygieneAt = sourceHygiene?.at || j.at || null;
  const hygieneAtMs = Date.parse(hygieneAt || '');
  const hygieneTimestampInvalid = hygieneAt !== null && !Number.isFinite(hygieneAtMs);
  const hygieneRawAgeSec = (Date.now() - hygieneAtMs) / 1000;
  const hygieneClockSkewed = Number.isFinite(hygieneAtMs) && hygieneRawAgeSec < -60;
  const hygieneAgeSec = Number.isFinite(hygieneAtMs) && !hygieneClockSkewed
    ? Math.max(0, Math.round(hygieneRawAgeSec))
    : null;
  const hygieneOk = typeof sourceHygiene?.ok === 'boolean'
    ? sourceHygiene.ok
    : (typeof allHygieneOk === 'boolean' ? allHygieneOk : null);
  // Receipt quarantine is policy refusal, not "nobody was contacted". Surface
  // counts + queue-head overlap so glance UIs cannot render 0 SENT as absence.
  const malformedReceipts = Number(j.dms?.malformedReceipts) || 0;
  const malformedReceiptReasons =
    j.dms?.malformedReceiptReasons && typeof j.dms.malformedReceiptReasons === 'object'
      ? j.dms.malformedReceiptReasons
      : {};
  const malformedHandles = new Set();
  for (const line of Array.isArray(j.dms?.malformedReceiptLines) ? j.dms.malformedReceiptLines : []) {
    const m = String(line || '').match(/@([A-Za-z0-9_]{1,30})/);
    if (m) malformedHandles.add(`@${m[1].toLowerCase()}`);
  }
  const queueTop3 = Array.isArray(j.queue?.top3) ? j.queue.top3 : [];
  // Prefer full pending handles from demand-status (root truth). Fall back to
  // top3 only for older receipts that never exposed pendingHandles — that
  // path understates overlap and must not be the happy path.
  const queuePendingHandles = Array.isArray(j.queue?.pendingHandles)
    ? j.queue.pendingHandles.map((h) => String(h || '').toLowerCase()).filter(Boolean)
    : queueTop3.map((t) => String(t?.handle || '').toLowerCase()).filter(Boolean);
  const quarantineQueueOverlap = queuePendingHandles.filter(
    (h) => h && malformedHandles.has(h),
  );
  return {
    at: j.at || null,
    statusPath: j.statusPath || path.join(BUSY, 'demand-status.json'),
    sourceReceipt,
    pending: j.queue?.pending ?? null,
    sentConfirmed: j.dms?.sentConfirmed ?? null,
    malformedReceipts,
    malformedReceiptReasons,
    quarantineQueueOverlap,
    pilotsFilled: j.pilots?.realFilled ?? null,
    next: j.next || null,
    top3: queueTop3,
    drafts: {
      top3,
      needFix,
      allHygieneOk,
      hygiene: {
        statusPath: hygieneStatusPath,
        jsonPointer: sourceHygiene?.jsonPointer || '/drafts/hygiene',
        // Keep the evidence binding beside the verdict. Status-path consumers
        // commonly read only drafts.hygiene; requiring them to join its parent
        // sourceReceipt makes a replaced demand receipt indistinguishable from
        // the bytes that originally produced this projection.
        sourceReceipt,
        source: typeof sourceHygiene?.ok === 'boolean'
          ? (sourceHygiene.source || 'drafts.hygiene')
          : (typeof allHygieneOk === 'boolean' ? 'drafts.allHygieneOk' : 'unknown'),
        at: hygieneAt,
        ageSec: hygieneAgeSec,
        stale: hygieneClockSkewed || hygieneAgeSec == null || hygieneAgeSec > 900,
        // Match demigod-orient's fail-closed evidence contract. Consumers of
        // dashboard-status.json can distinguish missing/old evidence from a
        // materially future-dated receipt instead of treating both as an
        // unexplained stale value.
        timestampInvalid: hygieneTimestampInvalid,
        clockSkewed: hygieneClockSkewed,
        checked: sourceHygiene?.checked ?? top3.length,
        clean: sourceHygiene?.clean ?? cleanCount,
        flagged: sourceHygiene?.flagged ?? needFix.length,
        // Preserve "unknown" instead of turning absent evidence into a false
        // hygiene failure (and the misleading dashboard label "0 flagged").
        ok: hygieneOk,
        // Publish the fail-closed verdict beside its provenance. File-only
        // consumers should not need to duplicate freshness and clock policy.
        ready:
          hygieneOk === true &&
          !hygieneClockSkewed &&
          hygieneAgeSec != null &&
          hygieneAgeSec <= 900 &&
          sourceReceipt.sha256 !== null,
      },
    },
    honesty: {
      autoDmAllowed: j.honesty?.autoDmAllowed === true,
      agentNeverAutoSends: j.honesty?.agentNeverAutoSends !== false,
      markSentRequiresAttestation: j.honesty?.markSentRequiresAttestation === true,
    },
  };
}

function run(cmd, timeout = 8000) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 2 * 1024 * 1024,
    }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || e.message || '').toString().trim().slice(0, 400);
  }
}

function sha256File(file) {
  try {
    const buf = fs.readFileSync(file);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function dashboardSourceIdentity() {
  const files = [
    'demigod-agent-dashboard.mjs',
    'demigod-agent-dashboard-ui.html',
    'demigod-agent-cockpit.mjs',
    'demigod-control.mjs',
    'demigod-priority-board.mjs',
    'demigod-tools-registry.mjs',
    'demigod-next.mjs',
  ]
    .map((name) => ({ name, sha256: sha256File(path.join(ROOT, name)) }));
  return {
    sha256: crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex'),
    files,
  };
}

const DASHBOARD_RUNNING_SOURCE = dashboardSourceIdentity();

function dashboardRuntimeHealth() {
  const disk = dashboardSourceIdentity();
  const restartRequired = disk.sha256 !== DASHBOARD_RUNNING_SOURCE.sha256;
  return {
    running: DASHBOARD_RUNNING_SOURCE,
    disk,
    restartRequired,
    restartCommand: restartRequired ? 'systemctl --user restart demigod-dash.service' : null,
  };
}

function detectAgent(name, head = '') {
  const n = (name + ' ' + head.slice(0, 200)).toLowerCase();
  if (/fable|df review/.test(n)) return 'fable';
  if (/sonnet/.test(n)) return 'sonnet';
  if (/opus/.test(n)) return 'opus';
  if (/codex/.test(n)) return 'codex';
  if (/grok|scheduler|hygiene|gate|dashboard/.test(n)) return 'grok/tools';
  if (/claude/.test(n)) return 'claude';
  return 'other';
}

function listRecentDir(dir, limit = 25) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .map((name) => {
        const full = path.join(dir, name);
        let st;
        try {
          st = fs.statSync(full);
        } catch {
          return null;
        }
        if (!st.isFile()) return null;
        const head = safeRead(full, 600) || '';
        const preview = head
          .replace(/\s+/g, ' ')
          .replace(/OpenAI Codex[\s\S]{0,100}/g, '')
          .replace(/Reading prompt from stdin\.\.\./g, '')
          .slice(0, 200);
        return {
          name,
          path: full,
          bytes: st.size,
          mtime: st.mtime.toISOString(),
          ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
          preview,
          agent: detectAgent(name, head),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
      .slice(0, limit);
  } catch {
    return [];
  }
}

function workerSnapshot() {
  const out = run(
    "ps -eo pid,etime,pcpu,pmem,cmd --width 220 | grep -E '^[[:space:]]*[0-9]+[[:space:]]+[^ ]+[[:space:]]+[^ ]+[[:space:]]+[^ ]+[[:space:]]+(claude|grok)( |$)|codex exec|bin/df |demigod-agent-dashboard|chrome-devtools-mcp|remote-debugging-port=9223|cm6-paste' | grep -v grep | head -40",
  );
  const lines = out ? out.split('\n').filter(Boolean) : [];
  return lines.map((line) => {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!m) return { raw: line.slice(0, 160) };
    const cmd = m[5];
    let kind = 'other';
    if (/model fable|fable/.test(cmd) && /claude/.test(cmd)) kind = 'fable';
    else if (/model sonnet/.test(cmd)) kind = 'sonnet';
    else if (/model opus/.test(cmd)) kind = 'opus';
    else if (/claude/.test(cmd)) kind = 'claude';
    else if (/^grok(?: |$)/.test(cmd)) kind = 'grok/tools';
    else if (/codex exec/.test(cmd)) kind = 'codex';
    else if (/chrome-devtools/.test(cmd)) kind = 'chrome-mcp';
    else if (/remote-debugging|chrome-automation/.test(cmd)) kind = 'chrome-cdp';
    else if (/demigod-agent-dashboard/.test(cmd)) kind = 'dashboard';
    else if (/cm6-paste/.test(cmd)) kind = 'publish';
    return { pid: m[1], etime: m[2], pcpu: m[3], pmem: m[4], kind, cmd: cmd.slice(0, 140) };
  });
}

function footDisk() {
  const file = path.join(ROOT, 'demigod-foot-core.js');
  // Read the complete canonical file: __dgFootVer intentionally lives near EOF.
  // A truncated read made the dashboard silently fall back to the opening marker
  // and could hide a split-version release error.
  const js = safeRead(file, 2_000_000) || '';
  const privateVer = (js.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || null;
  const publicVer = (js.match(/dgFootVersion\s*=\s*['"]v?(\d+)['"]/) || [])[1] || null;
  const ver = privateVer || publicVer;
  const core = (js.match(/dg-foot-v(\d+)-core/) || [])[1] || null;
  return {
    ver,
    core: core ? `v${core}` : null,
    dgFootVersion: publicVer ? `v${publicVer}` : null,
    privateVersion: privateVer,
    versionMarkersAgree: Boolean(publicVer && privateVer && publicVer === privateVer),
    sha256: sha256File(file),
    bytes: (() => {
      try {
        return fs.statSync(file).size;
      } catch {
        return null;
      }
    })(),
  };
}

function footLock() {
  const lockPath = path.join(BUSY, 'foot-lock.txt');
  const lockJson = path.join(BUSY, 'foot-lock.json');
  const j = safeJson(lockJson);
  if (j) {
    const expiresAtMs = j.expiresAt ? Date.parse(j.expiresAt) : null;
    const expiryValid = expiresAtMs == null || Number.isFinite(expiresAtMs);
    // A malformed explicit expiry must never become an immortal dashboard lock.
    // Missing expiry remains valid for legacy/manual locks; an invalid timestamp
    // is treated as expired and surfaced through expiryValid=false.
    const expired = j.expiresAt != null && !Number.isFinite(expiresAtMs)
      ? true
      : Number.isFinite(expiresAtMs) && expiresAtMs < Date.now();
    const currentSha = sha256File(path.join(ROOT, 'demigod-foot-core.js'));
    const baseShaMatch = Boolean(j.baseSha && currentSha && j.baseSha === currentSha);
    const localOwner = !j.host || j.host === os.hostname();
    let ownerAlive = null;
    if (
      localOwner &&
      j.pidScope === 'lease-owner' &&
      Number.isInteger(Number(j.pid)) &&
      Number(j.pid) > 0
    ) {
      try {
        process.kill(Number(j.pid), 0);
        ownerAlive = true;
      } catch (err) {
        ownerAlive = err?.code === 'EPERM';
      }
    }
    const ttlLeftSec = Number.isFinite(expiresAtMs)
      ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
      : null;
    const changedSinceClaim = Boolean(j.baseSha && currentSha && !baseShaMatch);
    // A SHA change while a live lease is held is the expected result of the
    // owner editing foot-core. It is not evidence of a competing writer.
    // Reserve "compromised" for an unexpired lease whose recorded owner died.
    const compromised = !expired && ownerAlive === false;
    return {
      locked: !expired,
      path: lockPath,
      json: j,
      content: JSON.stringify(j).slice(0, 500),
      expired,
      expiryValid,
      ownerAlive,
      ttlLeftSec,
      baseShaMatch,
      changedSinceClaim,
      // Keep the lease enforced until expiry, but make stale-owner or
      // out-of-lease writes unmistakable to status/API consumers.
      compromised,
    };
  }
  const raw = safeRead(lockPath, 2000);
  if (!raw) return { locked: false, path: lockPath };
  return { locked: true, path: lockPath, content: raw.slice(0, 500) };
}

const LIVE_PROBE_TTL_MS = Number(process.env.DEMIGOD_LIVE_PROBE_TTL_MS) || 15000;
let liveProbeCache = { at: 0, data: null };

function footCdnUrls(value) {
  const text = String(value || '');
  const explicit = [...text.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\bid=["']demigod-foot-cdn-loader["']/i.test(tag) || /\/foot-latest\.js(?:[?#"'])/i.test(tag))
    .map((tag) => (tag.match(/\bsrc=["'](https:\/\/[^"'\s<>]+)["']/i) || [])[1])
    .filter((url) =>
      /^https:\/\/(?:cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js|cdn\.statically\.io\/gh\/[^/]+\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js|(?:files|litter)\.catbox\.moe\/[a-z0-9]+\.js|gist\.githubusercontent\.com\/\S+\.js)(?:[?#]\S*)?$/i.test(url),
    );
  if (explicit.length) return explicit;

  // Legacy manifests can point directly at an opaque Catbox/Gist JS URL. Only
  // accept those when the whole value is a URL; scanning arbitrary live HTML
  // used to count unrelated product-map assets as extra foot loaders.
  const trimmed = text.trim();
  if (/^https:\/\/(?:files|litter)\.catbox\.moe\/[a-z0-9]+\.js(?:[?#]\S*)?$/i.test(trimmed)) return [trimmed];
  if (/^https:\/\/cdn\.statically\.io\/gh\/[^/]+\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js(?:[?#]\S*)?$/i.test(trimmed)) return [trimmed];
  if (/^https:\/\/gist\.githubusercontent\.com\/\S+\.js(?:[?#]\S*)?$/i.test(trimmed)) return [trimmed];
  return [];
}

function footCdnUrl(value) {
  return footCdnUrls(value)[0] || null;
}

function footCdnKey(value) {
  const direct = String(value || '').trim();
  if (/^https:\/\/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/]+\/(?:[^\s<>/]+\/)*foot-latest\.js(?:[?#]\S*)?$/i.test(direct)) {
    return direct.replace(/[?#].*$/, '');
  }
  const url = footCdnUrl(value);
  return url ? url.replace(/[?#].*$/, '') : null;
}

function htmlHead(value) {
  const html = String(value || '');
  const match = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i);
  return match ? match[1] : '';
}

async function liveProbe({ force = false } = {}) {
  const now = Date.now();
  if (!force && liveProbeCache.data && now - liveProbeCache.at < LIVE_PROBE_TTL_MS) {
    return { ...liveProbeCache.data, cached: true, cacheAgeMs: now - liveProbeCache.at };
  }
  const started = Date.now();
  try {
    const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'dg-dashboard' },
      signal: AbortSignal.timeout(2000),
    });
    const html = await r.text();
    const headHtml = htmlHead(html);
    // Prefer real foot <script src=…> — product map lists other catbox .js first in footer-lite
    const cdnUrls = footCdnUrls(html);
    const cdn = cdnUrls[0] || null;
    const cdnKeys = cdnUrls.map(footCdnKey).filter(Boolean);
    const pub = (html.match(/Last Published:[^<]{0,70}/) || [])[0] || null;
    const foot = (html.match(/foot v\d+/) || [])[0] || null;
    const data = {
      ok: r.ok,
      status: r.status,
      ms: Date.now() - started,
      cdn,
      cdnId: footCdnKey(cdn),
      cdnUrls,
      cdnCount: cdnUrls.length,
      cdnUniqueCount: new Set(cdnKeys).size,
      singleFootCdn: cdnUrls.length === 1,
      pub,
      foot,
      // Scope the head gate to <head>; a body/footer comment must not make a
      // structurally corrupt custom-code paste look canonical.
      hasPathRedirects: /dg-path-redirects/.test(headHtml),
      hasBaseTokens: /dg-base-tokens/.test(headHtml),
      hasRetiredIxUnhide: /dg-unhide-critical|dg-unhide-main|dg-graceful-unhide|dg-early-unhide|unhide-v5-safe|__dgUnhideV5/.test(headHtml),
      canonicalHead:
        /dg-path-redirects/.test(headHtml) &&
        /dg-base-tokens/.test(headHtml) &&
        !/dg-unhide-critical|dg-unhide-main|dg-graceful-unhide|dg-early-unhide|unhide-v5-safe|__dgUnhideV5/.test(headHtml),
      hasStartupModal: /startup-modal/.test(html),
      hasPathPills: /dg-path-pills|I'm hiring|I.?m hiring/.test(html) || /path-pills/.test(html),
    };
    liveProbeCache = { at: Date.now(), data };
    return data;
  } catch (e) {
    const data = { ok: false, error: String(e.message || e), ms: Date.now() - started };
    // Cache failures too. Without this, concurrent dashboard/status refreshes
    // stampede the same unavailable live endpoint until it recovers.
    liveProbeCache = { at: Date.now(), data };
    return data;
  }
}

/** In-memory status cache + singleflight — stops auto-refresh stampede + double work */
const STATUS_TTL_MS = Number(process.env.DEMIGOD_STATUS_TTL_MS) || 15000;
let statusCache = { at: 0, data: null };
let statusInflight = null;
let orcaRefreshRunning = false;

function refreshOrcaReceiptIfStale(snapshot = safeJson(path.join(BUSY, 'orca-status.json'))) {
  const ageMs = Date.now() - Date.parse(snapshot?.at);
  if (snapshot && Number.isFinite(ageMs) && ageMs >= -60_000 && ageMs <= 300_000) return false;
  if (orcaRefreshRunning) return true;
  orcaRefreshRunning = true;
  execFile(
    process.execPath,
    ['demigod-orca-bridge.mjs', 'status'],
    { cwd: ROOT, timeout: 30_000 },
    () => {
      orcaRefreshRunning = false;
    },
  );
  return true;
}

/** Control plane is expensive (~1s) — reuse within TTL */
const CONTROL_TTL_MS = Number(process.env.DEMIGOD_CONTROL_TTL_MS) || 12000;
let controlCache = { at: 0, data: null };
/** Match queue rebuild can be skipped when fresh */
const MATCH_TTL_MS = Number(process.env.DEMIGOD_MATCH_TTL_MS) || 60000;
let matchCache = { at: 0, data: null };
/** HTML UI shell cache by mtime */
let uiHtmlCache = { mtimeMs: 0, html: '' };
/** Background demand refresh — never block collectStatus */
let demandRefreshInflight = false;

function jsonSend(res, code, obj, { pretty = false, headers = {} } = {}) {
  const body = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  res.writeHead(code, privateDashboardJsonHeaders(res.dgCorsOrigin, headers));
  res.end(body);
}

function localMutationRequest(req) {
  return dashboardLocalRequest(req.headers.origin || '', req.headers.referer || '', PORT);
}

function eventsOpsSecret() {
  try {
    return fs.readFileSync(path.join(BUSY, 'events-online', 'ops-secret.env'), 'utf8').match(/^DEMIGOD_EVENTS_OPS_SECRET=(.+)$/m)?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

/** Small Orca-only coordination view for the dashboard and compatibility API. */
function compactWorkStatus() {
  const receipt = safeJson(path.join(BUSY, 'orca-status.json'));
  refreshOrcaReceiptIfStale(receipt);
  const signedAgeSec = receipt?.at
    ? Math.round((Date.now() - Date.parse(receipt.at)) / 1000)
    : null;
  const ageSec = Number.isFinite(signedAgeSec) ? Math.max(0, signedAgeSec) : null;
  const stale = !Number.isFinite(signedAgeSec) || signedAgeSec < -60 || signedAgeSec > 300;
  const channel = {
    status: !receipt ? 'missing' : stale ? 'stale' : receipt.status || 'unknown',
    reachable: !stale && receipt?.reachable === true,
    claude: !stale && receipt?.agents?.claude?.connected === true,
    codex: !stale && receipt?.agents?.codex?.connected === true,
    unread: Number.isFinite(receipt?.unreadCount) ? receipt.unreadCount : null,
    pending: Number.isFinite(receipt?.pendingTaskCount) ? receipt.pendingTaskCount : null,
    roundTripMs: Number.isFinite(receipt?.lastRoundTrip?.ms) ? receipt.lastRoundTrip.ms : null,
    at: receipt?.at || null,
    ageSec,
  };
  const agents = ['claude', 'codex'].map((id) => {
    const peer = receipt?.agents?.[id];
    const connected = !stale && peer?.connected === true;
    return {
      id,
      label: id === 'claude' ? 'Claude' : 'Codex',
      status: !peer ? 'missing' : stale ? 'stale' : connected ? 'connected' : 'idle',
      runtime: connected ? 'connected' : !peer ? 'missing' : 'idle',
      lastResult: null,
      at: receipt?.at || null,
      ageSec,
      stale,
      headline: peer?.title || (connected ? 'Connected through Orca' : 'Not connected'),
    };
  });
  const roundTripAt = receipt?.lastRoundTrip?.at;
  const roundTripAgeSec = roundTripAt
    ? Math.max(0, Math.round((Date.now() - Date.parse(roundTripAt)) / 1000))
    : null;

  return {
    schema: 'demigod.dashboard-work/2',
    at: receipt?.at || null,
    ageSec,
    stale,
    summary: `Orca ${channel.status} · Claude ${channel.claude ? 'connected' : 'offline'} · Codex ${channel.codex ? 'connected' : 'offline'}`,
    agents,
    recent: roundTripAt
      ? [{
          at: roundTripAt,
          ageSec: Number.isFinite(roundTripAgeSec) ? roundTripAgeSec : null,
          agent: 'orca',
          label: 'Orca',
          text: 'Claude ↔ Codex round trip complete',
          source: 'orca',
        }]
      : [],
    backlog: [],
    loopRunning: null,
    claims: { active: false, count: 0, holds: [] },
    channels: { orca: channel },
  };
}

function companySignalInboxView(feed) {
  try {
    const count = (value) => {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid count');
      return value;
    };
    const text = (value, max = 200) => {
      const out = typeof value === 'string' ? value.trim() : '';
      if (!out || out.length > max || /[\u0000-\u001f\u007f]/.test(out)) throw new Error('invalid text');
      return out;
    };
    const day = (value) => {
      if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
      ) throw new Error('invalid day');
      return value;
    };
    const instant = (value) => {
      if (
        typeof value !== 'string' ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString() !== value
      ) throw new Error('invalid instant');
      return value;
    };
    const https = (value) => {
      const url = new URL(text(value, 2048));
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid url');
      return url.href;
    };
    if (
      feed?.schema !== 'demigod.recruitai-signals/3' ||
      feed.sourceSchema !== 'demigod.recruitai-export/3' ||
      feed.changeBasis !== 'ledger-observation' ||
      feed.velocity?.basis !==
        'exact ledger-observation sums; latest snapshot per observed date; no inferred rate' ||
      !feed.counts ||
      !Array.isArray(feed.changes) ||
      !feed.byMapCompanyId ||
      typeof feed.byMapCompanyId !== 'object'
    ) throw new Error('invalid feed');
    const counts = {
      accounts: count(feed.counts.accounts),
      changedAccounts: count(feed.counts.changedAccounts),
      firstObservedReqs: count(feed.counts.firstObservedTodayReqs),
      olderPostedReqs: count(feed.counts.firstObservedTodayOlderPostedReqs),
      closedReqs: count(feed.counts.closedTodayReqs),
      observedHistoryDays: count(feed.counts.observedHistoryDays),
    };
    if (
      counts.changedAccounts !== feed.changes.length ||
      counts.changedAccounts > counts.accounts ||
      counts.olderPostedReqs > counts.firstObservedReqs
    ) throw new Error('invalid totals');
    const changeDate = day(feed.changeDate);
    const window = (value, windowDays) => {
      if (!value || value.windowDays !== windowDays || value.through !== changeDate) {
        throw new Error('invalid window');
      }
      const out = {
        windowDays,
        observedDays: count(value.observedDays),
        changedAccounts: count(value.changedAccounts),
        changedAccountDays: count(value.changedAccountDays),
        firstObservedReqs: count(value.firstObservedReqs),
        olderPostedReqs: count(value.firstObservedOlderPostedReqs),
        closedReqs: count(value.closedReqs),
        netObservedReqs: value.netObservedReqs,
        from: value.from === null ? null : day(value.from),
        through: changeDate,
      };
      if (
        !Number.isSafeInteger(out.netObservedReqs) ||
        out.netObservedReqs !== out.firstObservedReqs - out.closedReqs ||
        out.olderPostedReqs > out.firstObservedReqs ||
        out.observedDays > windowDays ||
        out.changedAccounts > counts.accounts ||
        out.changedAccountDays < out.changedAccounts ||
        (out.observedDays === 0) !== (out.from === null) ||
        (out.from && out.from > out.through)
      ) throw new Error('invalid window');
      return out;
    };
    const seen = new Set();
    let firstObservedReqs = 0;
    let olderPostedReqs = 0;
    let closedReqs = 0;
    const changes = [];
    for (const change of feed.changes) {
      const mapCompanyId = text(change?.mapCompanyId);
      if (seen.has(mapCompanyId) || !Object.hasOwn(feed.byMapCompanyId, mapCompanyId)) {
        throw new Error('invalid account');
      }
      seen.add(mapCompanyId);
      const current = feed.byMapCompanyId[mapCompanyId];
      const opened = count(change.firstObservedTodayReqCount);
      const olderPosted = count(change.firstObservedTodayOlderPostedReqCount);
      const closed = count(change.closedTodayReqCount);
      const openReqs = count(current?.openReqCount);
      const peopleOpsOpenReqs = count(current?.openPeopleOpsReqCount);
      const stalePostedReqs = count(current?.staleAttributedPostedReqCount);
      if (
        olderPosted > opened ||
        count(change.openReqCount) !== openReqs ||
        peopleOpsOpenReqs > openReqs ||
        stalePostedReqs > openReqs
      ) throw new Error('invalid account counts');
      firstObservedReqs += opened;
      olderPostedReqs += olderPosted;
      closedReqs += closed;
      if (changes.length < 20) {
        changes.push({
          mapCompanyId,
          name: text(change.name),
          domain: change.domain == null ? null : text(change.domain, 253),
          jobsUrl: https(current.jobsUrl || change.jobsUrl),
          openReqs,
          peopleOpsOpenReqs,
          stalePostedReqs,
          maxObservedOpenDays: count(current.maxObservedOpenDays),
          openedReqs: opened,
          olderPostedReqs: olderPosted,
          closedReqs: closed,
        });
      }
    }
    if (
      firstObservedReqs !== counts.firstObservedReqs ||
      olderPostedReqs !== counts.olderPostedReqs ||
      closedReqs !== counts.closedReqs
    ) throw new Error('divergent totals');
    const observed7d = window(feed.velocity.observed7d, 7);
    const observed30d = window(feed.velocity.observed30d, 30);
    if (
      observed7d.observedDays > observed30d.observedDays ||
      observed30d.observedDays > counts.observedHistoryDays
    ) throw new Error('divergent windows');
    return {
      schema: 'demigod.company-signal-inbox/1',
      at: instant(feed.at),
      exportGeneratedAt: instant(feed.exportGeneratedAt),
      changeDate,
      counts,
      observed7d,
      observed30d,
      changes,
      policy: 'Exact public ATS observations; no inferred rate, fit score, contact enrichment, or outbound action.',
    };
  } catch {
    return { error: 'company_signals_unavailable' };
  }
}

function peopleIntelligenceView(report) {
  try {
    const count = (value) => {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid count');
      return value;
    };
    const metrics = report?.metrics;
    if (!metrics || report.autoSend !== false || report.autoDm !== false) throw new Error('invalid report');
    const at = typeof report.at === 'string' && Number.isFinite(Date.parse(report.at)) &&
      new Date(report.at).toISOString() === report.at ? report.at : null;
    return {
      at,
      total: count(report.total),
      partners: count(report.partners),
      talent: count(report.talent),
      enrichment: {
        enrichable: count(metrics.holds_enrichable),
        due: count(metrics.holds_scrape_due),
        cooling: count(metrics.holds_cooling),
        exhausted: count(metrics.holds_exhausted),
        transportFailures: count(metrics.enrich_transport_failures),
        providerCapacity: count(metrics.enrich_provider_capacity),
        otherTransportFailures: count(metrics.enrich_other_transport_failures),
      },
      drafts: {
        local: count(metrics.drafted),
        reviewReady: count(metrics.approve_ready),
        sendReady: count(metrics.send_ready),
      },
      outcomes: { receiptBackedSent: count(metrics.sent_receipt_backed) },
      automation: { autoSend: false, autoDm: false },
    };
  } catch {
    return { error: 'funnel_status_unavailable' };
  }
}

function slimStatus(data) {
  /** Minimal payload for UI poll — cuts ~65KB pretty → ~few KB */
  return {
    at: data.at,
    version: data.version,
    cached: data.cached,
    cacheAgeMs: data.cacheAgeMs,
    dashboardRuntime: data.dashboardRuntime || null,
    statusJsonPath: data.statusJsonPath || STATUS_JSON,
    // Preserve the dedicated file-reader proof in the slim API too. Without
    // this, agents polling /api/status?slim=1 lose the exact /api/orient +
    // demand-draft-hygiene view that dashboard-status.json advertises.
    statusJsonPathView: data.statusJsonPathView || null,
    orientApi: data.orientApi || '/api/orient',
    orientUrl: data.orientUrl || `http://127.0.0.1:${PORT}/api/orient`,
    work: data.work || null,
    priorityBoard: data.priorityBoard || null,
    webflow: data.webflow || null,
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneOk: data.demandDraftsHygiene?.ok ?? null,
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
    demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
    demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    draftHygieneVerdict: data.draftHygieneVerdict || null,
    demandDraftsHygieneStatusPath:
      data.demandDraftsHygieneStatusPath ||
      data.demandDraftsHygiene?.statusPath ||
      data.demandStatusPath ||
      path.join(BUSY, 'demand-status.json'),
    demandStatusPath: data.demandStatusPath || path.join(BUSY, 'demand-status.json'),
    timing: data.timing,
    pulseKey: data.pulseKey,
    next: data.next,
    glance: data.glance,
    sessionStory: data.sessionStory,
    truthEvidence: data.truthEvidence,
    orient: data.orient,
    demand: data.demand,
    freeze: data.freeze,
    live: data.live
      ? {
          ok: data.live.ok,
          foot: data.live.foot,
          cdnId: data.live.cdnId,
          cdnCount: data.live.cdnCount,
          cdnUniqueCount: data.live.cdnUniqueCount,
          singleFootCdn: data.live.singleFootCdn,
          cdnUrls: data.live.cdnUrls,
          hasPathRedirects: data.live.hasPathRedirects,
          hasBaseTokens: data.live.hasBaseTokens,
          hasRetiredIxUnhide: data.live.hasRetiredIxUnhide,
          canonicalHead: data.live.canonicalHead,
          error: data.live.error,
          ms: data.live.ms,
        }
      : null,
    jobQueue: data.jobQueue
      ? {
          running: data.jobQueue.running,
          recent: (data.jobQueue.recent || []).slice(0, 6),
          last: data.jobQueue.last,
        }
      : null,
    staleGates: data.staleGates,
    freshness: data.freshness,
    truth: data.truth
      ? {
          foot: data.truth.foot ? { ver: data.truth.foot.ver } : null,
          live: data.truth.live ? { footVer: data.truth.live.footVer } : null,
          summaryLine: data.truth.summaryLine,
          pass: data.truth.pass,
        }
      : null,
    control: data.control
      ? {
          health: data.control.health,
          healthLabel: data.control.healthLabel,
          frozen: data.control.frozen,
          sessionMode: data.control.sessionMode,
          spine: (data.control.spine || []).slice(0, 6),
          modules: data.control.modules,
          moduleOrder: data.control.moduleOrder,
        }
      : null,
    handoffs: (data.handoffs || []).slice(0, 8),
    companySignals: data.companySignals || null,
    peopleIntelligence: data.peopleIntelligence || null,
    inbox: data.inbox
      ? {
          at: data.inbox.at,
          total: data.inbox.total,
          newCount: data.inbox.newCount,
          pendingReviewCount: data.inbox.pendingReviewCount,
          operationalCount: data.inbox.operationalCount,
          pendingOperationalReviewCount: data.inbox.pendingOperationalReviewCount,
          testCount: data.inbox.testCount,
          spamCount: data.inbox.spamCount,
          incompleteCount: data.inbox.incompleteCount,
          byKind: data.inbox.byKind,
          newestAt: data.inbox.newestAt,
          newestAgeSec: data.inbox.newestAgeSec,
          operationalRows: (data.inbox.operationalRows || []).slice(0, 8),
          rows: (data.inbox.rows || []).slice(0, 8),
          error: data.inbox.error,
        }
      : null,
    matches: data.matches
      ? { summary: data.matches.summary, pairs: (data.matches.pairs || []).slice(0, 12), error: data.matches.error }
      : null,
    shipChecklist: data.shipChecklist
      ? {
          at: data.shipChecklist.at,
          ready: data.shipChecklist.ready,
          freezeOn: data.shipChecklist.freezeOn ?? data.shipChecklist.frozen ?? data.freeze?.on ?? null,
          blockers: (data.shipChecklist.blockers || []).slice(0, 6),
          items: (data.shipChecklist.items || []).slice(0, 12).map((item) => ({
            id: item.id,
            ok: item.ok,
            title: item.title,
            detail: item.detail,
            block: item.block,
            warn: item.warn,
          })),
          nextCmd: data.shipChecklist.nextCmd || null,
        }
      : null,
    board: data.board,
    smoke: data.smoke ? { pass: data.smoke.pass, at: data.smoke.at } : null,
    cdp: data.cdp ? { up: data.cdp.up, pages: data.cdp.pages } : null,
    foot: data.foot
      ? {
          disk: data.foot.disk ? { ver: data.foot.disk.ver, sha12: data.foot.disk.sha12 } : null,
          manifest: data.foot.manifest
            ? { version: data.foot.manifest.version, cdnUrl: data.foot.manifest.cdnUrl }
            : null,
          liveMatchNote: data.foot.liveMatchNote,
        }
      : null,
    slim: true,
  };
}

function dashboardStatus(data) {
  const status = slimStatus(data);
  for (const key of [
    'statusJsonPathView', 'orientApi', 'orientUrl', 'orient', 'control', 'webflow',
    'glance', 'sessionStory', 'board',
    'demandDraftsHygiene', 'draftHygieneVerdict', 'demandDraftsHygieneStatusPath',
    'demandStatusPath', 'demandDraftsHygieneAt', 'demandDraftsHygieneAgeSec',
    'demandDraftsHygieneSource', 'demandDraftsHygieneStale', 'demandDraftsHygieneOk',
    'demandDraftsHygieneReady', 'smoke', 'cdp',
  ]) delete status[key];
  if (status.inbox) delete status.inbox.rows;
  status.eventsBot = data.eventsBot || null;
  status.evidence = data.evidence || {};
  return status;
}

function productHealth(data) {
  const truthGreen = data?.truthEvidence?.green === true;
  const freezeOn = data?.freeze?.on === true || data?.control?.frozen === true;
  const demandStarved = data?.control?.healthLabel === 'demand-starved';
  const nextId = data?.next?.id || data?.control?.nextCanon?.id || null;
  const blockedBy = [];
  if (!truthGreen) blockedBy.push('truth-evidence');
  if (data?.orient?.assertSame?.ok === false) blockedBy.push('next-mismatch');
  const productOk = truthGreen && blockedBy.length === 0;
  const reportedLabel = data?.control?.healthLabel || data?.glance?.light || 'unknown';
  const healthLabel = productOk
    ? reportedLabel
    : reportedLabel === 'solid' || reportedLabel === 'green'
      ? 'watch'
      : reportedLabel;
  return {
    ok: productOk,
    productOk,
    truthGreen,
    freezeOn,
    health: data?.control?.health ?? null,
    healthLabel,
    demandStarved,
    lampsSummary: data?.orient?.lamps || data?.control?.lamps || null,
    nextId,
    blockedBy,
    at: data?.at || null,
  };
}

async function cdpProbe() {
  try {
    const ver = await (await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(2000) })).json();
    const list = await (await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
    const pages = (list || []).filter((t) => t.type === 'page');
    return {
      up: true,
      browser: ver.Browser || 'cdp',
      targets: list.length,
      pages: pages.length,
      pageUrls: pages.map((p) => (p.url || '').slice(0, 100)),
      hasCustomCode: pages.some((p) => /custom-code/.test(p.url || '')),
      hasDesigner: pages.some((p) => /design\.webflow\.com/.test(p.url || '')),
      hasLive: pages.some((p) => /trydemigod\.com/.test(p.url || '')),
    };
  } catch {
    return { up: false, targets: 0, pages: 0, pageUrls: [], hasCustomCode: false, hasDesigner: false, hasLive: false };
  }
}

function loadAvg() {
  try {
    const [a, b, c] = fs.readFileSync('/proc/loadavg', 'utf8').trim().split(/\s+/);
    return { '1m': a, '5m': b, '15m': c };
  } catch {
    return null;
  }
}

function memInfo() {
  try {
    const t = fs.readFileSync('/proc/meminfo', 'utf8');
    const get = (k) => {
      const m = t.match(new RegExp(`^${k}:\\s+(\\d+)`, 'm'));
      return m ? Math.round(Number(m[1]) / 1024) : null;
    };
    return { totalMb: get('MemTotal'), availableMb: get('MemAvailable'), freeMb: get('MemFree') };
  } catch {
    return null;
  }
}

function deriveActions(ctx) {
  const actions = [];
  const { live, cdp, foot, gates, env, board, multiTop } = ctx;

  if (foot?.disk && foot.disk.versionMarkersAgree !== true) {
    actions.push({
      pri: 0,
      id: 'disk-foot-version-markers',
      title: 'Disk foot version markers disagree or are incomplete',
      why: `dgFootVersion=${foot.disk.dgFootVersion || 'missing'} __dgFootVer=${foot.disk.privateVersion || 'missing'}`,
      cmd: 'node --check demigod-foot-core.js && node demigod-foot-smoke.mjs',
      owner: 'foot-lock-owner',
    });
  }

  if (!live?.ok) {
    actions.push({
      pri: 0,
      id: 'live-down',
      title: 'Live site probe failed',
      why: live?.error || 'live not ok',
      cmd: `curl -sS -o /dev/null -w '%{http_code}' ${LIVE}/`,
      owner: 'grok',
    });
  }

  if (live?.ok && live?.cdnCount !== 1) {
    actions.push({
      pri: 0,
      id: 'foot-loader-count',
      title: `Live HTML has ${live?.cdnCount ?? 0} foot loader references (expected exactly 1)`,
      why: (live?.cdnUrls || []).join(' · ') || 'no supported foot CDN URL found',
      cmd: 'bin/dg ship prepare',
      owner: 'grok',
      mutate: false,
    });
  }

  if (live?.ok && live?.canonicalHead !== true) {
    actions.push({
      pri: 0,
      id: 'canonical-head-missing',
      title: 'Live HTML is missing canonical head markers',
      why: `dg-path-redirects=${live?.hasPathRedirects === true} dg-base-tokens=${live?.hasBaseTokens === true} retired-ix-unhide=${live?.hasRetiredIxUnhide === true}`,
      cmd: 'bin/dg ship prepare',
      owner: 'grok',
      mutate: false,
    });
  }

  const freezeOnEarly = Boolean(safeJson(path.join(BUSY, 'publish-freeze.json'))?.on);
  const manId = footCdnKey(foot?.manifest?.cdnUrl);
  const liveId = live?.cdnId;
  if (manId && liveId && manId !== liveId) {
    // Under freeze: expected lag is NOT a ship P0 (Codex N-D4 dual-P0 ban)
    actions.push({
      pri: freezeOnEarly ? 3 : 0,
      id: freezeOnEarly ? 'cdn-drift-expected' : 'cdn-drift',
      title: freezeOnEarly
        ? `CDN lag under freeze (expected): live=${liveId} ≠ manifest=${manId}`
        : 'Live CDN ≠ manifest — release staging is not attested',
      why: freezeOnEarly
        ? 'freeze ON — demand-first; not a second P0'
        : `live=${liveId} manifest=${manId}`,
      // Frozen drift is state to observe, not work to assign. Keep the row
      // useful with a read-only evidence command and no human owner.
      cmd: freezeOnEarly ? 'bin/dg truth' : 'bin/dg ship prepare',
      owner: freezeOnEarly ? 'freeze-gate' : 'grok',
      mutate: false,
    });
  }

  const diskVer = foot?.disk?.ver;
  const liveFoot = live?.foot?.replace(/foot v/, '') || null;
  if (diskVer && liveFoot && diskVer !== liveFoot) {
    actions.push({
      pri: freezeOnEarly ? 3 : 0,
      id: freezeOnEarly ? 'ver-drift-expected' : 'ver-drift',
      title: freezeOnEarly
        ? `Expected drift under freeze: disk v${diskVer} vs live v${liveFoot}`
        : `Disk foot v${diskVer} vs live ${live?.foot}`,
      why: freezeOnEarly
        ? 'freeze ON — intentional until human unfreeze; not a ship P0'
        : 'Hash/version drift — do not claim ship until CDN matches',
      cmd: freezeOnEarly
        ? 'bin/dg truth'
        : 'bin/dg ship prepare',
      owner: freezeOnEarly ? 'freeze-gate' : 'grok',
      mutate: false,
    });
  }

  if (gates?.verifySourcePass === false) {
    actions.push({
      pri: 0,
      id: 'gate-fail',
      title: 'verify:source FAIL',
      why: (gates.verifyFailed || []).join(', ') || 'see DEMIGOD-VERIFY-SOURCE.json',
      cmd: 'npm run demigod:verify:source',
      owner: 'grok',
    });
  }

  if (foot?.lock?.locked) {
    const ownerState = foot.lock.ownerAlive === false
      ? `owner process exited; lease remains valid for ${foot.lock.ttlLeftSec ?? '?'}s`
      : foot.lock.ownerAlive === true
        ? 'owner process alive'
        : 'owner liveness unknown';
    const changedSinceClaim = foot.lock.changedSinceClaim === true
      ? '; foot changed since this lease was claimed'
      : '';
    actions.push({
      pri: 1,
      id: 'foot-lock',
      title: 'Foot lock held — do not edit foot-core',
      why: `${ownerState}${changedSinceClaim}; ${foot.lock.content?.slice(0, 120) || 'lock present'}`,
      cmd: `cat ${foot.lock.path}`,
      owner: 'any',
    });
  }

  if (!cdp?.up) {
    actions.push({
      pri: 2,
      id: 'cdp-down',
      title: 'CDP down — cannot Webflow publish / wiz CDP',
      why: 'Port 9223 not answering',
      cmd: '~/agent-dev.sh chrome',
      owner: 'grok',
    });
  } else if (cdp.up && !cdp.hasCustomCode) {
    actions.push({
      pri: 2,
      id: 'cdp-no-custom-code',
      title: 'CDP up but custom-code tab missing',
      why: 'Open Webflow custom code for paste-publish',
      cmd: 'npm run demigod:workspace # or open custom-code URL',
      owner: 'grok',
    });
  }

  if (!env?.OPENAI_API_KEY) {
    actions.push({
      pri: 3,
      id: 'no-openai-key',
      title: 'Codex API key path unavailable',
      why: 'OPENAI_API_KEY missing — Pro CLI still works',
      cmd: 'codex exec "…"  # Pro session; or export OPENAI_API_KEY',
      owner: 'human',
    });
  }

  const realRoles = board?.signal?.realRoles ?? board?.realRoles ?? 0;
  if ((board?.roles || 0) > 3) {
    actions.push({
      pri: 1,
      id: 'board-trim',
      title: 'Board roles > 3 — honesty risk',
      why: `roles=${board.roles}`,
      cmd: 'node demigod-verify-board-honesty.mjs',
      owner: 'grok',
    });
  }

  // Site healthy only when full hash chain + FRESH truth evidence (unforgeable green)
  const diskVerGreen = foot?.disk?.ver || foot?.disk?.core || diskVer || null;
  const liveVerGreen = (live?.foot || '').replace(/^foot\s*v?/i, '') || null;
  const truthGreen = safeJson(path.join(BUSY, 'truth.json'));
  let truthEvidenceOk = false;
  try {
    const evPath = path.join(BUSY, 'evidence', 'latest-truth.json');
    if (fs.existsSync(evPath)) {
      const env = JSON.parse(fs.readFileSync(evPath, 'utf8'));
      const files = env.inputsAtSeal?.files || env.inputs?.files || {};
      let mismatch = false;
      for (const [rel, sha] of Object.entries(files)) {
        if (!sha) continue;
        try {
          const cur = crypto
            .createHash('sha256')
            .update(fs.readFileSync(path.join(ROOT, rel)))
            .digest('hex');
          if (cur !== sha) mismatch = true;
        } catch {
          mismatch = true;
        }
      }
      const ended = Date.parse(env.endedAt || '');
      // Match isFresh: missing ttl → 3600s; ttlSec:0 → no age limit (hash-only).
      // Was `(ttlSec || 3600)` which treated intentional 0 as one hour (Claude path audit).
      const ttlSec = Number.isFinite(env.ttlSec) ? Number(env.ttlSec) : 3600;
      const ageMs = Date.now() - ended;
      // A pass without a valid seal time is not fresh evidence. Also reject
      // seals materially dated in the future instead of silently blessing a
      // clock-skewed or malformed envelope forever.
      const timestampValid = Number.isFinite(ended) && ageMs >= -60_000;
      const expired = !timestampValid || (ttlSec > 0 && ageMs > ttlSec * 1000);
      truthEvidenceOk = Boolean(env.result?.pass) && !mismatch && !expired;
    }
  } catch {
    truthEvidenceOk = false;
  }
  const liveEqDiskGreen =
    truthEvidenceOk ||
    truthGreen?.claims?.['live==disk'] === true ||
    truthGreen?.match?.cdnBodyMatchesDisk === true;
  // Prefer evidence green; never site-green without fresh truth when evidence exists
  const freezeOnGreen = Boolean(safeJson(path.join(BUSY, 'publish-freeze.json'))?.on);
  if (
    live?.ok &&
    live?.singleFootCdn === true &&
    live?.canonicalHead === true &&
    gates?.verifySourcePass === true &&
    manId &&
    liveId &&
    manId === liveId &&
    diskVerGreen &&
    liveVerGreen &&
    String(diskVerGreen) === String(liveVerGreen) &&
    liveEqDiskGreen &&
    truthEvidenceOk &&
    !freezeOnGreen
  ) {
    actions.push({
      pri: 3,
      id: 'site-green',
      title: 'Site green — fresh truth evidence; avoid foot thrash',
      why: `live==disk v${liveVerGreen} cdn=${liveId} evidence-fresh`,
      cmd: 'bin/dg truth; bin/dg-preflight',
      owner: 'grok',
    });
  } else if (live?.ok && diskVerGreen && liveVerGreen && String(diskVerGreen) !== String(liveVerGreen)) {
    actions.push({
      pri: freezeOnGreen ? 2 : 1,
      id: 'disk-live-drift',
      title: freezeOnGreen
        ? `Disk v${diskVerGreen} vs live v${liveVerGreen} (freeze ON — intentional until unfreeze)`
        : `Disk v${diskVerGreen} vs live v${liveVerGreen} — local changes prepared`,
      why: freezeOnGreen ? 'publish-freeze on' : 'external publish requires exact current-request authorization',
      cmd: freezeOnGreen
        ? 'node demigod-publish-freeze.mjs status'
        : 'bin/dg ship prepare',
      owner: 'grok',
      mutate: false,
    });
  }

  // Prefer plan-inbox cursor (honors --mark); fall back to fresh multi heuristic
  const inboxSnap = safeJson(path.join(BUSY, 'plan-inbox-latest.json'));
  const unreadUseful = (inboxSnap?.unread || []).filter((f) => !f.noise);
  if (unreadUseful.length) {
    actions.push({
      pri: 2,
      id: 'read-plans',
      title: `Unread plan-inbox items (${unreadUseful.length})`,
      why: unreadUseful.map((f) => f.name).slice(0, 3).join(', '),
      cmd: 'node demigod-plan-inbox.mjs --useful',
      owner: 'grok',
    });
  } else {
    const freshPlans = (multiTop || []).filter(
      (f) => f.ageSec < 900 && /fable|opus|plan|strategy/.test(f.agent + f.name) && f.bytes > 200,
    );
    // only if inbox never marked (no cursor) — avoid re-nag after --mark
    if (freshPlans.length && !inboxSnap?.lastReadAt) {
      actions.push({
        pri: 2,
        id: 'read-plans',
        title: `Fresh agent drops (${freshPlans.length})`,
        why: freshPlans.map((f) => f.name).slice(0, 3).join(', '),
        cmd: 'node demigod-plan-inbox.mjs --useful',
        owner: 'grok',
      });
    }
  }

  // Preflight cache
  const pf = safeJson(path.join(BUSY, 'preflight-latest.json'));
  if (pf && pf.pass === false) {
    actions.push({
      pri: 1,
      id: 'preflight-red',
      title: 'Preflight FAIL — fix before foot edits',
      why: (pf.next || (pf.steps || []).filter((s) => !s.ok).map((s) => s.label).join(', ')).slice(0, 160),
      cmd: 'node demigod-preflight.mjs --strict',
      owner: 'grok',
    });
  }

  // Open plan ledger items
  try {
    const ledger = safeJson(path.join(ROOT, 'DEMIGOD-PLAN-LEDGER.json'));
    const open = (ledger?.plans || []).filter((p) => !['applied', 'ignored'].includes(p.status));
    if (open.length) {
      actions.push({
        pri: 3,
        id: 'open-plans',
        title: `Open plan-ledger items (${open.length})`,
        why: open.map((p) => p.title).slice(0, 3).join('; '),
        cmd: 'node demigod-plan-ledger.mjs open',
        owner: 'grok',
      });
    }
  } catch {
    /* */
  }

  actions.sort((a, b) => a.pri - b.pri || a.id.localeCompare(b.id));
  return actions;
}

function buildAgentBrief(data) {
  const a = data.actions || [];
  let top = a.filter((x) => x.pri <= 2).slice(0, 8);
  // Under freeze + demand-ops: exactly one P0 (demand); drift is expected note not peer P0
  if (data.freeze?.on) {
    const p0 = top.filter((x) => x.pri === 0);
    if (p0.length > 1) {
      const prefer =
        p0.find((x) => /demand|cockpit-demand/i.test(String(x.id) + x.title + x.cmd)) || p0[0];
      top = [prefer, ...top.filter((x) => x.pri !== 0 || x.id === prefer.id)].slice(0, 8);
    }
  }
  const pf = data.preflight || safeJson(path.join(BUSY, 'preflight-latest.json'));
  const inbox = data.inbox || safeJson(path.join(BUSY, 'plan-inbox-latest.json'));
  const orient = data.orient;
  const unify = safeJson(path.join(BUSY, 'unify.json'));
  const unifyOnly =
    process.env.DEMIGOD_BRIEF_UNIFY_ONLY === '1' ||
    process.env.DEMIGOD_BRIEF_UNIFY_ONLY === 'true';
  const lines = [];
  lines.push(`# Demigod AGENT-BRIEF`);
  lines.push(`at: ${data.at}`);
  lines.push(`decision: ${data.decision}`);
  lines.push('');
  // Orient is the canonical compact entry point. Keep unify as a richer
  // fallback for older receipts, but do not advertise it as the starting API.
  const spine = !orient?.degraded && orient?.next
    ? orient
    : data.next
      ? { next: data.next, green: data.truthEvidence?.green, freeze: data.freeze, demand: data.demand }
      : unify;
  lines.push('## Orient (canonical entry — prefer /api/orient)');
  if (spine?.next) {
    lines.push(`- NEXT: **${spine.next.title}**`);
    lines.push(`- cmd: \`${spine.next.cmd}\``);
    lines.push(`- id=${spine.next.id} green=${spine.green ?? spine.truthEvidence?.green} freeze=${spine.freeze?.on ? 'ON' : 'OFF'}`);
    if (spine.demand) {
      const mal = Number(spine.demand.malformedReceipts) || 0;
      const overlap = Array.isArray(spine.demand.quarantineQueueOverlap)
        ? spine.demand.quarantineQueueOverlap.length
        : 0;
      const pendingN = spine.demand.pending;
      const overlapLabel =
        overlap && pendingN != null
          ? `queue-overlap=${overlap}/${pendingN}`
          : overlap
            ? `queue-overlap=${overlap}`
            : '';
      lines.push(
        `- demand: pending=${spine.demand.pending} sent=${spine.demand.sentConfirmed} pilots=${spine.demand.pilotsFilled}` +
          (mal
            ? ` · quarantine=${mal}${overlapLabel ? ` · ${overlapLabel}` : ''} (SENT may under-report)`
            : ''),
      );
      const draftHygiene = spine.demand?.drafts?.hygiene || spine.demandDraftsHygiene || null;
      const draftHygieneState = draftHygiene?.stale === true
        ? 'STALE'
        : draftHygiene?.ok === true
          ? 'clean'
          : draftHygiene?.ok === false
            ? 'FIX'
            : 'unknown';
      lines.push(
        `- drafts.hygiene: ${draftHygieneState} checked=${draftHygiene?.checked ?? '?'} flagged=${draftHygiene?.flagged ?? '?'} source=${draftHygiene?.source || 'unknown'}`,
      );
    }
    if (spine.truth?.summary) lines.push(`- truth: ${spine.truth.summary}`);
    if (spine.ship) lines.push(`- ship stage: ${spine.ship.stage} shipped=${spine.ship.shipped}`);
    if (spine.lock) lines.push(`- foot lock: ${spine.lock.held ? spine.lock.owner : 'free'}`);
    lines.push('- curl: `http://127.0.0.1:9878/api/orient`');
    lines.push('- cli: `bin/dg orient`');
    // safeJson returns null when unify.json is missing — never deref bare unify.
    if (unify?.cli?.spine?.length) {
      lines.push('- spine:');
      for (const c of unify.cli.spine) lines.push(`  - \`${c}\``);
    }
    if (unify?.rules?.length) {
      lines.push('- rules: ' + unify.rules.join(' · '));
    }
  } else {
    lines.push('- (run bin/dg orient to refresh orient.json)');
  }
  lines.push('');
  if (unifyOnly) {
    lines.push('## FREEZE');
    lines.push(
      data.freeze?.on
        ? `- ON — ${data.freeze.why || 'publish frozen'} (no CDN/Webflow mutate)`
        : '- OFF — publication still requires exact current-request authorization + lock',
    );
    lines.push('');
    lines.push('_Brief mode: DEMIGOD_BRIEF_UNIFY_ONLY — full snapshot omitted._');
    lines.push('');
    return lines.join('\n') + '\n';
  }
  // FREEZE FIRST — Fable/agents must see this before any green gate
  lines.push('## FREEZE (read first)');
  if (data.freeze?.on) {
    lines.push(`- **ON** — ${data.freeze.why || 'publish frozen'}`);
    lines.push(`- at: ${data.freeze.at || '—'} by: ${data.freeze.by || '—'}`);
    lines.push('- **Do not ship CDN / Webflow / mutate jobs.** Safe: smoke, truth, brief, handoff.');
  } else {
    lines.push('- **OFF** — publication still requires exact current-request authorization + lock');
  }
  lines.push('');
  if (data.next?.cmd || data.next?.title) {
    lines.push('## NEXT contract (stable — parse this)');
    lines.push(`- id: ${data.next.id}`);
    lines.push(`- pri: ${data.next.pri}`);
    lines.push(`- title: ${data.next.title}`);
    lines.push(`- mutate: ${data.next.mutate} · freezeBlocks: ${data.next.freezeBlocks} · shipped: ${data.next.shipped}`);
    lines.push(`- cmd: \`${data.next.cmd || ''}\``);
    lines.push('');
  }
  lines.push('## Snapshot');
  lines.push(`- live: ${data.live?.ok ? 'OK' : 'FAIL'} ${data.live?.foot || ''} ${data.live?.cdnId || data.live?.cdn || ''}`);
  lines.push(`- disk foot: v${data.foot?.disk?.ver || '?'} sha256=${(data.foot?.disk?.sha256 || '').slice(0, 12)}…`);
  lines.push(`- manifest: ${data.foot?.manifest?.version || '?'} ${data.foot?.manifest?.cdnUrl || ''}`);
  lines.push(`- match: ${data.foot?.liveMatchNote || '?'}`);
  const vf = data.freshness?.verifySource;
  const verifyLabel =
    data.gates?.verifySourcePass === true ? 'PASS' : data.gates?.verifySourcePass === false ? 'FAIL' : '?';
  const verifyFresh = vf ? (vf.fresh ? 'fresh' : `STALE(${vf.label})`) : '?';
  lines.push(`- gates verify:source: ${verifyLabel} [${verifyFresh}]${vf?.lagSec != null ? ` lag=${vf.lagSec}s` : ''}`);
  if (vf && !vf.fresh) {
    lines.push(`  ⚠ do not trust verify PASS until: npm run demigod:verify:source`);
  }
  lines.push(`- board: roles=${data.board?.roles ?? '?'} signal=${JSON.stringify(data.board?.signal || {})}`);
  if (data.matches?.summary) {
    lines.push(
      `- matches: total=${data.matches.summary.total ?? '?'} byState=${JSON.stringify(data.matches.summary.byState || {})}`,
    );
    lines.push(`  review: bin/dg-matches list · curl -sS http://127.0.0.1:${PORT}/api/matches`);
  }
  if (data.inbox && !data.inbox.error) {
    // Operational only — total pendingReviewCount includes SMS @pending.example sims.
    const opsPending = data.inbox.pendingOperationalReviewCount ?? 0;
    const testN = data.inbox.testCount ?? 0;
    lines.push(
      `- submissions inbox: awaiting_review_operational=${opsPending} tests=${testN} total=${data.inbox.total ?? 0}`,
    );
  }
  lines.push(`- cdp: ${data.cdp?.up ? 'UP' : 'DOWN'} pages=${data.cdp?.pages ?? 0}`);
  lines.push(`- foot-lock: ${data.foot?.lock?.locked ? 'HELD ' + (data.foot.lock.json?.owner || '') : 'free'}`);
  lines.push(`- preflight: ${pf?.pass === true ? 'PASS' : pf?.pass === false ? 'FAIL' : '?'} ${pf?.at ? '(' + pf.at + ')' : ''}`);
  lines.push(`- plan-inbox: unread=${inbox?.unreadCount ?? '?'} open_plans=${inbox?.openPlans?.length ?? '?'}`);
  const truth = data.truth || safeJson(path.join(BUSY, 'truth.json'));
  if (truth) {
    lines.push(`- truth fullyShipped: ${truth.match?.fullyShipped}  claims.live==disk: ${truth.claims?.['live==disk']}`);
  }
  lines.push(`- openai_key: ${data.env?.OPENAI_API_KEY ? 'set' : 'missing'}`);
  lines.push(`- cockpit shipped: ${data.cockpit?.shipped ?? '?'}`);
  lines.push(`- jobs running: ${data.jobQueue?.running || 'none'} recent=${data.jobQueue?.recent?.length ?? 0}`);
  lines.push(`- workers: ${JSON.stringify(data.workerCounts || {})}`);
  const grokExchange = data.work?.agents?.find((agent) => agent.id === 'grok');
  if (grokExchange) {
    lines.push(`- grok exchange: ${grokExchange.lastResult} ${grokExchange.at || '?'} · ${grokExchange.headline || grokExchange.runtime}`);
  }
  lines.push(`- load: ${data.system?.load?.['1m'] || '?'} mem_avail_mb: ${data.system?.mem?.availableMb ?? '?'}`);
  if (data.sessionStory) {
    lines.push('');
    lines.push('## Session story');
    lines.push(`- ${data.sessionStory}`);
  }
  if ((data.staleGates || []).length || (data.freshness && Object.values(data.freshness).some((f) => f && !f.fresh))) {
    lines.push('');
    lines.push('## Stale / untrusted caches');
    for (const s of (data.staleGates || []).slice(0, 8)) {
      lines.push(`- ${s.key}: ${s.reason}${s.ageSec != null ? ` age=${s.ageSec}s` : ''}`);
    }
    for (const [k, f] of Object.entries(data.freshness || {})) {
      if (f && !f.fresh) lines.push(`- freshness.${k}: ${f.label} (${f.reason})`);
    }
  }
  const handoffs = data.handoffs || [];
  if (handoffs.length) {
    lines.push('');
    lines.push('## Handoff wall (newest)');
    for (const h of handoffs.slice(0, 5)) {
      lines.push(`- [${h.from}] ${h.at}: ${String(h.text || '').slice(0, 160)}`);
    }
  }
  lines.push('');
  lines.push('## Blockers / next actions (do in order)');
  if (!top.length) lines.push('- (none — site green; no agent action currently authorized)');
  for (const x of top) {
    lines.push(`- [P${x.pri}] ${x.title}`);
    lines.push(`  why: ${x.why}`);
    lines.push(`  owner: ${x.owner}`);
    lines.push(`  cmd: ${x.cmd}`);
    if (x.mutate) lines.push(`  mutate: YES — freeze must be OFF`);
  }
  lines.push('');
  lines.push('## Plan inbox (unread useful)');
  const unread = (inbox?.unread || []).filter((f) => !f.noise).slice(0, 6);
  if (!unread.length) lines.push('- (clear or run: node demigod-plan-inbox.mjs --useful)');
  for (const f of unread) {
    lines.push(`- ${f.ageSec}s ${f.name}: ${(f.preview || '').slice(0, 100)}`);
  }
  if ((inbox?.openPlans || []).length) {
    lines.push('');
    lines.push('## Open plan-ledger');
    for (const p of inbox.openPlans.slice(0, 5)) {
      lines.push(`- [${p.status}] ${p.title} (${p.owner || '?'})`);
    }
  }
  lines.push('');
  lines.push('## Recent agent drops (newest)');
  for (const f of (data.drops?.multi || []).slice(0, 8)) {
    lines.push(`- ${f.ageSec}s ${f.agent} ${f.name}: ${f.preview.slice(0, 120)}`);
  }
  lines.push('');
  lines.push('## SSOT paths (always read before ship)');
  lines.push('- DEMIGOD-COMPRESSED-STATE.md');
  lines.push('- docs/exchange/DEMIGOD-STARTUP-ROADMAP.md');
  lines.push('- /tmp/dg-busy/AGENT-BRIEF.md  (this file)');
  lines.push('- /tmp/dg-busy/preflight-latest.json');
  lines.push('- /tmp/dg-busy/plan-inbox-latest.json');
  lines.push('- /tmp/demigod-gate-latest.txt');
  lines.push('');
  lines.push('## Exact cmds for Grok session start');
  lines.push('```bash');
  lines.push('curl -sS http://127.0.0.1:9878/api/next          # stable NEXT JSON');
  lines.push('curl -sS http://127.0.0.1:9878/api/agent-brief  # this brief');
  lines.push('bin/dg-cockpit && bin/dg-smoke');
  lines.push('curl -sS "http://127.0.0.1:9878/api/delta?since=$(date -u -d \'5 min ago\' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)"');
  lines.push('```');
  lines.push('');
  lines.push('## Standing rules');
  lines.push('- One foot-core writer (claim lock with unique --owner); verify after edits; hash before claiming live');
  lines.push('- No 48h/SLA/founder-name; pending Twilio/Stripe language');
  lines.push('- Never publish without exact current-request authorization; freeze and lock state never grant it');
  lines.push('- No game work; no demigod:source-truth (archived mutator)');
  lines.push('- Prefer /api/next + /api/agent-brief over scraping HTML');
  return lines.join('\n');
}

async function collectStatus() {
  const t0 = Date.now();
  const footDiskInfo = footDisk();
  const cdnManifest = safeJson(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'));
  const verifySource = safeJson(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json'));
  const board = safeJson(path.join(ROOT, 'DEMIGOD-BOARD.json'));
  const gateLatest = safeRead(GATE_LATEST, 4000);
  const lock = footLock();

  const boardSignal = board?.signal || {
    realRoles: (board?.roles || []).filter((r) => !r.sample).length,
    sampleRoles: (board?.roles || []).filter((r) => r.sample).length,
    realReceipts: (board?.receipts || []).filter((r) => !r.sample).length,
  };

  // Single live + cdp probe (cockpit reuses live — no second network hop)
  const [live, cdp] = await Promise.all([liveProbe(), cdpProbe()]);
  const workers = workerSnapshot();
  const multi = listRecentDir(MULTI, 12);

  const manId = footCdnKey(cdnManifest?.cdnUrl);
  const liveId = live?.cdnId;
  let liveMatchNote = 'unknown';
  if (manId && liveId) liveMatchNote = manId === liveId ? 'live CDN matches manifest id' : `DRIFT live=${liveId} man=${manId}`;
  if (cdnManifest?.sha256 && footDiskInfo.sha256) {
    liveMatchNote +=
      footDiskInfo.sha256 === cdnManifest.sha256
        ? ' · disk sha == manifest sha'
        : ' · disk sha ≠ manifest (unpublished local edits?)';
  }

  const foot = {
    disk: footDiskInfo,
    manifest: cdnManifest,
    liveMatchNote,
    lock,
  };

  const gates = {
    latestFile: gateLatest,
    verifySourcePass: verifySource?.pass ?? null,
    verifySourceAt: verifySource?.at ?? null,
    verifyFailed: (verifySource?.checks || []).filter((c) => c && c.ok === false).map((c) => c.name).slice(0, 12),
  };

  const env = {
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
    CDP_URL: CDP,
  };

  const boardInfo = {
    roles: (board?.roles || []).length,
    receipts: (board?.receipts || []).length,
    signal: boardSignal,
  };

  const workerCounts = workers.reduce((acc, w) => {
    const k = w.kind || 'other';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // HOT PATH: never execSync plan-inbox here (was blocking event loop up to 8s).
  // Use last cache only; agents refresh via CLI when needed.
  const preflightCache = safeJson(path.join(BUSY, 'preflight-latest.json'));
  const inboxCache = safeJson(path.join(BUSY, 'plan-inbox-latest.json'));
  const truthCache = safeJson(path.join(BUSY, 'truth.json'));

  const actions = deriveActions({
    live,
    cdp,
    foot,
    gates,
    env,
    board: boardInfo,
    multiTop: multi,
  });

  // Agent cockpit — reuse dashboard live probe (skipLive + liveOverride)
  let cockpit = null;
  try {
    const { buildCockpit } = await import('./demigod-agent-cockpit.mjs');
    cockpit = await buildCockpit({
      skipLive: true,
      liveOverride: live,
    });
    if (cockpit?.next) {
      const n = cockpit.next;
      actions.unshift({
        pri: n.pri,
        id: 'cockpit-' + n.id,
        title: n.title,
        why: n.mutate ? 'MUTATE only with its explicit authority gates' : 'read-only / diagnostic',
        cmd: n.cmd,
        owner: 'grok',
        mutate: !!n.mutate,
      });
      const seen = new Set();
      for (let i = actions.length - 1; i >= 0; i--) {
        if (seen.has(actions[i].id)) actions.splice(i, 1);
        else seen.add(actions[i].id);
      }
      actions.sort((a, b) => a.pri - b.pri || String(a.id).localeCompare(String(b.id)));
    }
  } catch (e) {
    cockpit = { error: String(e.message || e) };
  }

  // Distinguish a MISSING freeze file (normal -- unfrozen is the default state) from a CORRUPT one
  // (exists but won't parse). The old `|| { on: false }` fabricated a clean "freeze OFF, ship allowed"
  // for both, silently hiding a freeze that may have been ON before its file corrupted. Keep on:false
  // (matches the real isFrozen gate + the missing-default) but flag corrupt so the `why` surfaces
  // "state uncertain" instead of a confident OFF.
  const freezeFile = path.join(BUSY, 'publish-freeze.json');
  const freezeState = safeJson(freezeFile)
    || (fs.existsSync(freezeFile)
      ? { on: false, corrupt: true, why: 'publish-freeze.json present but unreadable — freeze state uncertain' }
      : { on: false });

  // Evidence ages for every cached gate/artifact (UI badges)
  function evidenceOf(rel) {
    const full = rel.startsWith('/') ? rel : path.join(ROOT, rel);
    try {
      const st = fs.statSync(full);
      return {
        path: full,
        mtime: st.mtime.toISOString(),
        ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
        bytes: st.size,
      };
    } catch {
      return { path: full, missing: true };
    }
  }
  const evidence = {
    verifySource: evidenceOf('DEMIGOD-VERIFY-SOURCE.json'),
    boardHonesty: evidenceOf('DEMIGOD-BOARD-HONESTY.json'),
    board: evidenceOf('DEMIGOD-BOARD.json'),
    footCdn: evidenceOf('DEMIGOD-FOOT-CDN.json'),
    freeze: evidenceOf(path.join(BUSY, 'publish-freeze.json')),
    smoke: evidenceOf(path.join(BUSY, 'agent-smoke.json')),
    truth: evidenceOf(path.join(BUSY, 'truth.json')),
    preflight: evidenceOf(path.join(BUSY, 'preflight-latest.json')),
    planInbox: evidenceOf(path.join(BUSY, 'plan-inbox-latest.json')),
    cockpit: evidenceOf(path.join(BUSY, 'cockpit.json')),
    shipStatus: evidenceOf(path.join(BUSY, 'ship-status.json')),
    gateLatest: evidenceOf(GATE_LATEST),
    brief: evidenceOf(BRIEF_MD),
  };

  const data = {
    at: new Date().toISOString(),
    version: 5,
    dashboardRuntime: dashboardRuntimeHealth(),
    decision: 'FIX not rewrite',
    system: { load: loadAvg(), mem: memInfo() },
    env,
    foot,
    live,
    cdp,
    gates,
    board: boardInfo,
    freeze: freezeState,
    cockpit,
    smoke: safeJson(path.join(BUSY, 'agent-smoke.json')),
    workers,
    workerCounts,
    actions,
    preflight: preflightCache,
    inbox: inboxCache,
    companySignals: companySignalInboxView(
      safeJson(path.join(BUSY, 'recruitai-handoff', 'demigod-signals.json')),
    ),
    eventsBot: (() => {
      const store = safeJson(EVENTS_STORE);
      const online = safeJson(path.join(BUSY, 'events-online', 'status.json'));
      const lastUp = safeJson(path.join(BUSY, 'events-online', 'last-up.json'));
      const inviteDrain = safeJson(path.join(BUSY, 'events-bot', 'invite-drain-latest.json'));
      const onlineAgeMs = Date.now() - Date.parse(online?.at || '');
      const onlineFresh = Number.isFinite(onlineAgeMs) && onlineAgeMs >= -60_000 && onlineAgeMs <= 10 * 60_000;
      const publishedApiBase = lastUp?.published?.ok === true ? lastUp.apiBase || null : null;
      const onlineSummary = online ? {
        certified: onlineFresh && online.certified === true,
        observation: onlineFresh ? online.observation || null : 'stale receipt',
        needHeal: onlineFresh && online.needHeal === true,
        public: onlineFresh ? online.public ?? null : null,
        nativeRsvpRoutes: onlineFresh ? online.nativeRsvpRoutes ?? null : null,
        storeHygieneOk: onlineFresh ? online.storeHygiene?.ok ?? null : null,
        storeHygieneHitCount: onlineFresh && Number.isFinite(online.storeHygiene?.hitCount) ? online.storeHygiene.hitCount : null,
        storeHygieneFirstHit: onlineFresh ? online.storeHygiene?.hits?.[0]?.kind || null : null,
        configPublished: onlineFresh && typeof online.websiteConfigCurrent === 'boolean'
          ? online.websiteConfigCurrent
          : onlineFresh && publishedApiBase ? publishedApiBase === online.apiBase : null,
        websiteConfigReachable: onlineFresh ? online.websiteConfigReachable ?? null : null,
        // Priority board needs this flag — without it, prepare-only CDN lag looks like P1 agent work.
        prepareOnlyWebsiteConfig: onlineFresh ? online.prepareOnlyWebsiteConfig === true : null,
        // Staged prepare-only config (not live CDN) — keep priority/dash honest vs dead published bases.
        pendingApiBase: onlineFresh ? online.pendingApiBase || null : null,
        pendingMatchesLocal: onlineFresh
          ? typeof online.pendingMatchesLocal === 'boolean'
            ? online.pendingMatchesLocal
            : null
          : null,
        pendingBlockedBy: onlineFresh ? online.pendingBlockedBy || null : null,
        eventsOperational: onlineFresh
          ? online.public === true && online.needHeal !== true && online.storeHygiene?.ok !== false && online.nativeRsvpRoutes === true
          : null,
        preferredSubdomain: onlineFresh ? online.preferredSubdomain || null : null,
        preferredTunnelMatch: onlineFresh
          ? typeof online.preferredTunnelMatch === 'boolean'
            ? online.preferredTunnelMatch
            : null
          : null,
        stale: !onlineFresh,
      } : null;
      const inviteDrainAgeMs = Date.now() - Date.parse(inviteDrain?.at || '');
      const eventSubmissions = Array.isArray(store?.eventSubmissions) ? store.eventSubmissions : [];
      const startupSubmissions = Array.isArray(store?.startupSubmissions) ? store.startupSubmissions : [];
      const reviewRows = (rows) => rows.filter((row) => row?.status === 'submitted')
        .concat(rows.filter((row) => row?.status !== 'submitted').slice(-6).reverse());
      const submissions = {
        eventPending: eventSubmissions.filter((row) => row?.status === 'submitted').length,
        startupPending: startupSubmissions.filter((row) => row?.status === 'submitted').length,
        events: reviewRows(eventSubmissions).map((row) => ({
          id: row.id, title: row.title, destination: row.destination, status: row.status,
          startsAt: row.startsAt, venue: row.venue, audience: row.audience, details: row.details,
          seats: row.seats, externalUrl: row.externalUrl, reviewedAt: row.reviewedAt,
          reviewNote: row.reviewNote, updatedAt: row.updatedAt || row.createdAt,
        })),
        startups: reviewRows(startupSubmissions).map((row) => ({
          id: row.id, name: row.name, neighborhood: row.neighborhood, hiring: row.hiring,
          website: row.website, description: row.description, status: row.status,
          reviewedAt: row.reviewedAt, reviewNote: row.reviewNote, createdAt: row.createdAt,
        })),
      };
      const active = store?.activeEvent;
      const inviteDrainMatchesActive = inviteDrain?.eventId === active?.id;
      const inviteDrainSummary = active?.id ? {
        needsUrl: Number.isFinite(inviteDrain?.needsUrl) ? inviteDrain.needsUrl : null,
        recorded: Number.isFinite(inviteDrain?.recorded) ? inviteDrain.recorded : null,
        stale: !inviteDrainMatchesActive || !Number.isFinite(inviteDrainAgeMs) || inviteDrainAgeMs < -60_000 || inviteDrainAgeMs > 10 * 60_000,
      } : null;
      if (!active?.id) return { active: false, online: onlineSummary, inviteDrain: inviteDrainSummary, submissions };
      const platformRows = ['luma', 'partiful'].flatMap((platform) =>
        Array.isArray(store.platforms?.[platform])
          ? store.platforms[platform].map((row) => ({ ...row, platform: row.platform || platform }))
          : [],
      );
      const normalizeTitle = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const title = normalizeTitle(active.title);
      const matchingDrafts = platformRows.filter((row) =>
        row?.id && (row.eventId ? row.eventId === active.id : title && normalizeTitle(row.title) === title),
      );
      const realInviteUrl = (value) => ['demigod', 'luma', 'partiful'].some((platform) => isRealInviteUrl(value, platform));
      const inviteDraft = matchingDrafts.find((row) => row.status === 'published_url' && realInviteUrl(row.inviteUrl || row.publishedUrl)) ||
        matchingDrafts[0] || null;
      const nativeInvite = (store.platforms?.demigod || []).find((row) =>
        row?.status === 'published_url' && row.eventId === active.id && realInviteUrl(row.inviteUrl || row.publishedUrl),
      );
      const confirmedRsvps = (Array.isArray(store.rsvps) ? store.rsvps : []).filter(
        (r) => r?.eventId === active.id && r.status === 'yes',
      );
      const confirmedCount = Array.isArray(store.rsvps)
        ? confirmedRsvps.length
        : (Number.isFinite(active.outcomes?.confirmed) ? active.outcomes.confirmed : null);
      const gaps = resourceGaps(store);
      const resourceOffers = matchOffersToEvent(store).offerCounts;
      const resourceDrafts = (Array.isArray(store.outreach) ? store.outreach : []).filter((row) =>
        row?.eventId === active.id && ['queued', 'drafted'].includes(row.status) && /venue|sponsor|volunteer/.test(row.kind || ''),
      );
      const partnerReadyDrafts = resourceDrafts.filter((row) =>
        isRealOutreachEmail(row.toEmail) && !/@trydemigod\.com$/i.test(row.toEmail) && outreachDraftReadiness(row) >= 3,
      );
      const internalOpsDrafts = resourceDrafts.filter((row) => /@trydemigod\.com$/i.test(row.toEmail));
      const contactBlockedDrafts = resourceDrafts.filter((row) =>
        !isRealOutreachEmail(row.toEmail) && !/@trydemigod\.com$/i.test(row.toEmail),
      );
      const contentBlockedDrafts = resourceDrafts.filter((row) =>
        isRealOutreachEmail(row.toEmail) && !/@trydemigod\.com$/i.test(row.toEmail) && outreachDraftReadiness(row) < 3,
      );
      const venueConfirmed = active.venue?.confirmed === true && Boolean(String(active.venue.confirmationEvidence || '').trim());
      const lifecycleEvidenceMismatch = ['plan', 'rsvp', 'run', 'followup', 'debrief'].includes(active.stage) && !venueConfirmed;
      const venueCapacity = Number(active.venue?.capacity);
      const venueTooSmall = Number.isFinite(active.seats) && Number.isFinite(venueCapacity) && venueCapacity > 0 && active.seats > venueCapacity;
      const inviteShareable = ['rsvp', 'run', 'followup', 'debrief'].includes(active.stage);
      const inviteUrl = [active.published_url, active.publishedUrl, active.inviteUrl,
        nativeInvite?.inviteUrl, nativeInvite?.publishedUrl,
        inviteDraft?.status === 'published_url' ? inviteDraft.inviteUrl || inviteDraft.publishedUrl : null,
      ].find(realInviteUrl) || null;
      return {
        active: true,
        id: active.id,
        title: active.title || 'Untitled SF night',
        stage: active.stage || null,
        seats: Number.isFinite(active.seats) ? active.seats : null,
        dateWindows: Array.isArray(active.dateWindows) ? active.dateWindows.filter(Boolean) : [],
        audienceReady: eventAudienceBrief(active).ok,
        futureDateTimeReady: hasFutureDateTime(active),
        venueSelected: Boolean(active.venue?.name || active.venue?.title),
        venueConfirmed,
        matchedVenueOfferId: active.matchedOffers?.venueId || null,
        lifecycleEvidenceMismatch,
        venueTooSmall,
        venueCapacity: Number.isFinite(venueCapacity) && venueCapacity > 0 ? venueCapacity : null,
        resources: {
          done: 3 - gaps.missing.length,
          total: 3,
          missing: gaps.missing.map((kind) => kind === 'venue_alt' ? 'Confirm a venue alternative with evidence' : kind === 'venue_capacity' ? 'Select a venue that fits the seat target' : kind === 'venue_confirmation' ? 'Confirm the selected venue with evidence' : `Confirm ${kind} with evidence`),
          topFreeVenue: gaps.topFreeVenue ? {
            name: gaps.topFreeVenue.name,
            area: gaps.topFreeVenue.area,
            capacity: gaps.topFreeVenue.capacity,
          } : null,
          offers: resourceOffers,
          queuedDrafts: resourceDrafts.length,
          partnerReadyDrafts: partnerReadyDrafts.length,
          internalOpsDrafts: internalOpsDrafts.length,
          contactBlockedDrafts: contactBlockedDrafts.length,
          contentBlockedDrafts: contentBlockedDrafts.length,
          contentBlocked: Object.fromEntries(['venue', 'sponsor', 'volunteer'].map((kind) => [kind,
            contentBlockedDrafts.filter((row) => String(row.kind || '').includes(kind)).length,
          ])),
          partnerReady: Object.fromEntries(['venue', 'sponsor', 'volunteer'].map((kind) => [kind,
            partnerReadyDrafts.filter((row) => String(row.kind || '').includes(kind)).length,
          ])),
          drafts: Object.fromEntries(['venue', 'sponsor', 'volunteer'].map((kind) => [kind,
            resourceDrafts.filter((row) => String(row.kind || '').includes(kind)).length,
          ])),
        },
        inviteUrl: inviteShareable ? inviteUrl : null,
        inviteUrlRecorded: inviteShareable && Boolean(inviteUrl),
        invitePlatformUrlRecorded: inviteShareable && Boolean(
          inviteDraft?.status === 'published_url' && realInviteUrl(inviteDraft.inviteUrl || inviteDraft.publishedUrl),
        ),
        inviteDraft: inviteDraft ? { id: inviteDraft.id, platform: inviteDraft.platform } : null,
        rsvpsConfirmed: confirmedCount,
        seatsRemaining: Number.isFinite(active.seats) && Number.isFinite(confirmedCount)
          ? Math.max(0, active.seats - confirmedCount)
          : null,
        overCapacity: Number.isFinite(active.seats) && Number.isFinite(confirmedCount)
          ? Math.max(0, confirmedCount - active.seats)
          : null,
        inviteDrain: inviteDrainSummary,
        online: onlineSummary,
        submissions,
      };
    })(),
    truth: truthCache,
    truthEvidence: (() => {
      const te = refuseIfStale('truth');
      return {
        green: Boolean(te.green),
        pass: Boolean(te.pass),
        fresh: Boolean(te.fresh),
        reason: te.reason || 'no-evidence',
        runId: te.runId || null,
        summary: te.summary || null,
        endedAt: te.endedAt || null,
      };
    })(),
    // Mirror the CLI/API orientation card into the main status path so agents
    // can orient from one cached request without spawning another Node process.
    orient: (() => {
      const orientPath = path.join(BUSY, 'orient.json');
      const j = safeJson(orientPath);
      let receiptAgeMs = null;
      try {
        // Receipt content is the evidence clock. File mtime is mutable (touch,
        // copy, restore) and must not make an old orientation card look fresh.
        const receiptAtMs = Date.parse(j?.at || '');
        const rawAgeMs = Date.now() - receiptAtMs;
        // A materially future-dated receipt is not fresh evidence. Preserve a
        // small tolerance for filesystem/clock jitter, but fail closed beyond it.
        receiptAgeMs = Number.isFinite(receiptAtMs) && Number.isFinite(rawAgeMs) && rawAgeMs >= -60_000
          ? Math.max(0, rawAgeMs)
          : null;
      } catch {}
      const demand = demandStatusSnapshot(safeJson(path.join(BUSY, 'demand-status.json')));
      const degraded = !j || receiptAgeMs == null || receiptAgeMs > 120_000;
      return {
        at: j?.at || null,
        api: '/api/orient',
        statusJsonPath: STATUS_JSON,
        receiptPath: orientPath,
        receiptAvailable: Boolean(j),
        receiptAgeMs,
        degraded,
        ok: j?.ok === true,
        exit: j?.exit ?? null,
        // A stale receipt may describe a historically green state, but it is
        // not current green evidence. Preserve the raw bit for diagnosis while
        // making the dashboard-facing signal fail closed.
        green: !degraded && j?.green === true,
        receiptGreen: j?.green === true,
        // Freeze is live coordination state, not historical receipt evidence.
        // Mirror the current value so /status/orient stays freeze-honest even
        // when orient.json predates a publish-freeze toggle.
        freeze: {
          on: freezeState?.on === true,
          why: freezeState?.why || null,
        },
        next: degraded ? null : (j?.next || null),
        // Keep the canonical nested status path current even when orient.json
        // is older than the independently refreshed demand-status receipt.
        // Consumers may now read /orient/demand/drafts/hygiene directly
        // without falling back to a dashboard-specific alias.
        demand: demand
          ? {
              ...(j?.demand || {}),
              ...demand,
              drafts: demand.drafts || null,
            }
          : (j?.demand || null),
        // Preserve the canonical demand shape as well as the compact aliases
        // below. File-only agents can now read /orient/drafts/hygiene exactly
        // as they would read /demand/drafts/hygiene.
        drafts: demand?.drafts || null,
        // Keep the orientation payload self-contained for API clients. The
        // compact orient receipt intentionally omits full drafts, while the
        // dashboard status needs their hygiene result without a second join.
        demandDrafts: demand?.drafts || null,
        demandDraftsHygiene: demand?.drafts?.hygiene || null,
        demandDraftsHygieneSource: demand?.drafts?.hygiene?.source || 'unknown',
        demandDraftsHygieneStatusPath:
          demand?.drafts?.hygiene?.statusPath || demand?.statusPath || path.join(BUSY, 'demand-status.json'),
        demandStatusPath: demand?.statusPath || path.join(BUSY, 'demand-status.json'),
        assertSame: j?.assertSame || null,
        lamps: j?.lamps || null,
      };
    })(),
    demand: (() => {
      try {
        const p = path.join(BUSY, 'demand-status.json');
        if (!fs.existsSync(p)) return null;
        return demandStatusSnapshot(JSON.parse(fs.readFileSync(p, 'utf8')));
      } catch {
        return null;
      }
    })(),
    evidence,
    drops: { multi },
    links: {
      live: LIVE,
      dashboard: `http://127.0.0.1:${PORT}/`,
      api: `http://127.0.0.1:${PORT}/api/status`,
      orient: `http://127.0.0.1:${PORT}/api/orient`,
      demandStatus: path.join(BUSY, 'demand-status.json'),
      agentBrief: `http://127.0.0.1:${PORT}/api/agent-brief`,
      cockpit: `http://127.0.0.1:${PORT}/api/cockpit`,
      smoke: `http://127.0.0.1:${PORT}/api/smoke`,
      tools: `http://127.0.0.1:${PORT}/api/tools`,
      jobs: `http://127.0.0.1:${PORT}/api/jobs`,
      actions: `http://127.0.0.1:${PORT}/api/actions`,
      briefFile: BRIEF_MD,
    },
    agentConsume: {
      preferred: [
        `curl -sS http://127.0.0.1:${PORT}/api/orient`,
        `curl -sS http://127.0.0.1:${PORT}/api/cockpit`,
        'node demigod-agent-cockpit.mjs --md',
        `curl -sS http://127.0.0.1:${PORT}/api/agent-brief`,
        'node demigod-agent-smoke.mjs',
        `node demigod-tools-registry.mjs --md`,
        `cat ${BRIEF_MD}`,
      ],
      note: 'Start with /api/orient or bin/dg orient — fresh truth, demand hygiene, and one canonical NEXT.',
    },
    timing: { collectMs: Date.now() - t0 },
  };

  await enrichStatus(data);
  data.agentBriefMarkdown = buildAgentBrief(data);

  try {
    fs.mkdirSync(BUSY, { recursive: true });
    // Compact JSON on disk — faster write, smaller I/O
    // The status path is an agent API contract. Publish it atomically so a
    // concurrent file-only reader never loses /api/orient or draft-hygiene
    // discovery to a partially written JSON document.
    writeJsonAtomic(STATUS_JSON, data);
    atomicWrite(BRIEF_MD, data.agentBriefMarkdown, { mode: 0o600 });
    atomicWrite(
      BRIEF_JSON,
      JSON.stringify({
        at: data.at,
        version: data.version,
        next: data.next,
        glance: data.glance,
        sessionStory: data.sessionStory,
        actions: data.actions,
        live: data.live,
        foot: data.foot,
        gates: data.gates,
        cdp: data.cdp,
        board: data.board,
        freeze: data.freeze,
        staleGates: data.staleGates,
        workerCounts: data.workerCounts,
      }),
      { mode: 0o600 },
    );
  } catch {
    /* ignore */
  }

  return data;
}

/** Cached / singleflight status — concurrent refreshers share one collect */
async function getStatus({ force = false } = {}) {
  const now = Date.now();
  // Invalidate status cache when truth or operational receipts are newer than
  // the cache stamp so health/priority do not keep stale state after ship.
  if (!force && statusCache.data && now - statusCache.at < STATUS_TTL_MS) {
    for (const name of [
      'truth.json',
      'ship-prepare.json',
      'pilot-inbound.json',
      'demand-status.json',
      'webflow-doctor.json',
      'orca-status.json',
    ]) {
      try {
        const mtime = fs.statSync(path.join(BUSY, name)).mtimeMs;
        if (Number.isFinite(mtime) && mtime > statusCache.at) {
          force = true;
          break;
        }
      } catch {
        /* optional receipts */
      }
    }
    if (!force) {
      try {
        if (fs.statSync(path.join(ROOT, 'DEMIGOD-LEADS.json')).mtimeMs > statusCache.at) force = true;
      } catch {
        /* optional local CRM */
      }
    }
  }
  if (!force && statusCache.data && now - statusCache.at < STATUS_TTL_MS) {
    return { ...statusCache.data, cached: true, cacheAgeMs: now - statusCache.at };
  }
  if (statusInflight) return statusInflight;
  statusInflight = collectStatus()
    .then((data) => {
      statusCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      statusInflight = null;
    });
  return statusInflight;
}


const UI_HTML_PATH = path.join(ROOT, 'demigod-agent-dashboard-ui.html');
function loadHtml() {
  try {
    const st = fs.statSync(UI_HTML_PATH);
    if (uiHtmlCache.html && uiHtmlCache.mtimeMs === st.mtimeMs) return uiHtmlCache.html;
    const html = fs.readFileSync(UI_HTML_PATH, 'utf8');
    uiHtmlCache = { mtimeMs: st.mtimeMs, html };
    return html;
  } catch (e) {
    const msg = String(e.message || e)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<!DOCTYPE html><html><body style="background:#111;color:#f88;font-family:sans-serif;padding:2rem">
      <h1>Dashboard UI missing</h1>
      <p>Expected demigod-agent-dashboard-ui.html next to the server</p>
      <p>${msg}</p>
      <p><a href="/api/status" style="color:#C9A84C">/api/status</a></p>
    </body></html>`;
  }
}

/** Safe allowlist for jobs — safe = human-clickable anytime; mutate = freeze-gated */
/* ==== SECTION: JOBS allowlist (mutate jobs freeze-gated) ==== */
const JOBS = Object.assign(Object.create(null), {
  orient: { cmd: 'node', args: ['demigod-orient.mjs', '--json'], timeout: 60000, safe: true },
  check: { cmd: 'node', args: ['demigod-check.mjs', 'edit'], timeout: 300000, safe: true },
  smoke: { cmd: 'node', args: ['demigod-agent-smoke.mjs'], timeout: 90000, safe: true },
  cockpit: { cmd: 'node', args: ['demigod-agent-cockpit.mjs', '--json'], timeout: 30000, safe: true },
  truth: { cmd: 'node', args: ['demigod-truth.mjs'], timeout: 45000, safe: true },
  'foot-lock': { cmd: 'node', args: ['demigod-foot-lock.mjs', 'status'], timeout: 10000, safe: true },
  preflight: { cmd: 'node', args: ['demigod-preflight.mjs'], timeout: 60000, safe: true },
  'plan-inbox': { cmd: 'node', args: ['demigod-plan-inbox.mjs', '--json'], timeout: 20000, safe: true },
  'tab-prune': { cmd: 'node', args: ['demigod-cdp-tab-prune.mjs'], timeout: 15000, safe: true },
  'board-honesty': { cmd: 'node', args: ['demigod-verify-board-honesty.mjs'], timeout: 20000, safe: true },
  'verify-source': { cmd: 'npm', args: ['run', 'demigod:verify:source'], timeout: 120000, safe: true },
  'tools-registry': { cmd: 'node', args: ['demigod-tools-registry.mjs', '--json'], timeout: 10000, safe: true },
  usertest: { cmd: 'node', args: ['demigod-user-test.mjs', '--quick'], timeout: 120000, safe: true },
  doctor: { cmd: 'node', args: ['demigod-doctor.mjs', '--json'], timeout: 20000, safe: true },
  review: { cmd: 'node', args: ['demigod-review.mjs', '--json', '--no-contract'], timeout: 90000, safe: true },
  'review-bug': { cmd: 'node', args: ['demigod-review.mjs', '--bug', '--json'], timeout: 120000, safe: true },
  'review-selftest': { cmd: 'node', args: ['demigod-review-selftest.mjs'], timeout: 60000, safe: true },
  webflow: { cmd: 'node', args: ['demigod-webflow.mjs', '--json'], timeout: 30000, safe: true },
  'webflow-doctor': { cmd: 'node', args: ['demigod-webflow.mjs', 'doctor', '--json'], timeout: 30000, safe: true },
  'webflow-open-code': { cmd: 'node', args: ['demigod-webflow.mjs', 'open', 'custom-code'], timeout: 15000, safe: true },
  'webflow-paste-check': { cmd: 'node', args: ['demigod-webflow.mjs', 'paste-check', '--json'], timeout: 15000, safe: true },
  hygiene: { cmd: 'node', args: ['demigod-laptop-hygiene.mjs', '--prune', '--json'], timeout: 45000, safe: true },
  ponytail: { cmd: 'node', args: ['demigod-ponytail.mjs', 'status', '--json'], timeout: 30000, safe: true },
  'ponytail-check': { cmd: 'node', args: ['demigod-ponytail.mjs', 'check', '--json'], timeout: 30000, safe: true },
  'events-online-status': { cmd: 'node', args: ['demigod-events-online.mjs', 'certify'], timeout: 30000, safe: true },
  'events-online': { cmd: 'node', args: ['demigod-events-online.mjs', 'status'], timeout: 30000, safe: true },
  'events-test': { cmd: 'bin/dg', args: ['events', 'test', 'fast'], timeout: 300000, safe: true },
  'events-outbox-status': { cmd: 'bin/dg-events-outbox', args: ['status'], timeout: 30000, safe: true },
  'events-invite-drain': { cmd: 'node', args: ['demigod-events-invite-drain.mjs'], timeout: 30000, mutate: true, publishSafe: true },
  'events-tick': { cmd: 'bin/dg-events-tick', args: [], timeout: 180000, mutate: true, publishSafe: true },
  'quality-once': { cmd: 'bin/dg-quality', args: ['once', '--context=auto'], timeout: 240000, safe: true },
  'quality-status': { cmd: 'bin/dg-quality', args: ['status'], timeout: 15000, safe: true },
  'quality-backlog': { cmd: 'bin/dg-quality', args: ['backlog'], timeout: 10000, safe: true },
  'funnel-status': { cmd: 'bin/dg', args: ['funnel', 'status'], timeout: 30000, safe: true },
  'pipeline-status': { cmd: 'node', args: ['demigod-lead-pipeline.mjs', 'tick', '--stage=status'], timeout: 30000, safe: true },
  'pipeline-packages': { cmd: 'node', args: ['demigod-lead-pipeline.mjs', 'tick', '--stage=packages'], timeout: 60000, safe: true },
  priority: { cmd: 'node', args: ['demigod-priority-board.mjs', '--json'], timeout: 15000, safe: true },
  dogfood: { cmd: 'node', args: ['demigod-tool-dogfood.mjs', 'status', '--json'], timeout: 20000, safe: true },
  'blog-assets': { cmd: 'node', args: ['demigod-blog-assets-gen.mjs'], timeout: 30000, safe: true },
  control: { cmd: 'node', args: ['demigod-control.mjs', 'status', '--json'], timeout: 45000, safe: true },
  ship: { cmd: 'node', args: ['demigod-ship.mjs', 'status'], timeout: 60000, safe: true },
  'ship-checklist': { cmd: 'node', args: ['demigod-ship-checklist.mjs', '--json'], timeout: 15000, safe: true },
  demand: { cmd: 'node', args: ['demigod-demand.mjs', 'status', '--json'], timeout: 20000, safe: true },
  'demand-draft': { cmd: 'bin/dg', args: ['demand', 'draft', '--name=T0'], timeout: 20000, safe: true },
  pilot: { cmd: 'node', args: ['demigod-pilot-inbound.mjs', 'status', '--json'], timeout: 15000, safe: true },
  'next-canon': { cmd: 'node', args: ['demigod-next.mjs', '--json'], timeout: 10000, safe: true },
  unify: { cmd: 'node', args: ['demigod-unify.mjs', '--json'], timeout: 20000, safe: true },
  'ship-status': { cmd: 'node', args: ['demigod-ship-status.mjs', '--json'], timeout: 45000, safe: true },
  'ship-facts': { cmd: 'node', args: ['demigod-ship.mjs', 'status', '--facts'], timeout: 60000, safe: true },
  'ship-prepare': { cmd: 'node', args: ['demigod-ship.mjs', 'prepare'], timeout: 180000, safe: true },
  'lock-who': { cmd: 'node', args: ['demigod-foot-lock.mjs', 'who'], timeout: 10000, safe: true },
  ledger: { cmd: 'node', args: ['demigod-version-ledger.mjs', 'delta'], timeout: 10000, safe: true },
  evidence: { cmd: 'node', args: ['demigod-evidence.mjs', 'fresh', 'truth'], timeout: 10000, safe: true },
  craft: { cmd: 'node', args: ['demigod-craft-log.mjs', 'status'], timeout: 20000, safe: true },
  'craft-mint-ship': { cmd: 'node', args: ['demigod-craft-log.mjs', 'mint', 'ship'], timeout: 45000, safe: true },
  'evidence-producers': {
    cmd: 'node',
    args: ['demigod-evidence.mjs', 'producers', 'truth,review,demand,smoke'],
    timeout: 15000,
    safe: true,
  },
  'tools-os-selftest': { cmd: 'node', args: ['demigod-tools-os-selftest.mjs'], timeout: 300000, safe: true },
  'wiz-ownership': { cmd: 'node', args: ['demigod-wiz-ownership-selftest.mjs'], timeout: 30000, safe: true },
  'cm6-check': { cmd: 'node', args: ['demigod-cm6-paste-publish.mjs', '--check-structural'], timeout: 15000, safe: true },
  inbox: { cmd: 'node', args: ['demigod-submissions-inbox.mjs', '--json'], timeout: 15000, safe: true },
  'match-review': { cmd: 'node', args: ['demigod-match-review.mjs', '--json'], timeout: 15000, safe: true },
  'structured-hiring': {
    cmd: 'node',
    args: ['demigod-structured-hiring.mjs', 'status', '--json'],
    timeout: 15000,
    safe: true,
  },
  'role-packet': { cmd: 'node', args: ['demigod-role-packet.mjs', 'list'], timeout: 10000, safe: true },
  'pilot-batch': { cmd: 'node', args: ['demigod-pilot-batch.mjs', 'list'], timeout: 10000, safe: true },
  'candidate-touch': {
    cmd: 'node',
    args: ['demigod-candidate-touch.mjs', 'rediscover', '--limit=10'],
    timeout: 10000,
    safe: true,
  },
  'intro-path': {
    cmd: 'node',
    args: ['demigod-intro-path.mjs', 'warm', '--json'],
    timeout: 10000,
    safe: true,
  },
  'call-note': {
    cmd: 'node',
    args: ['demigod-call-note.mjs', 'list', '--json'],
    timeout: 10000,
    safe: true,
  },
  'public-comp': {
    cmd: 'node',
    args: ['demigod-public-comp.mjs', '--selftest'],
    timeout: 10000,
    safe: true,
  },
  'control-board': { cmd: 'node', args: ['demigod-control-board.mjs', '--json'], timeout: 30000, safe: true },
  'control-board-history': {
    cmd: 'node',
    args: ['demigod-control-board.mjs', 'history', '--json', '--n=12'],
    timeout: 10000,
    safe: true,
  },
  'reseal-queue': { cmd: 'node', args: ['demigod-reseal-queue.mjs', 'status'], timeout: 10000, safe: true },
  'reseal-due': {
    cmd: 'node',
    args: ['demigod-reseal-queue.mjs', 'due'],
    timeout: 15000,
    safe: true,
  },
  'reseal-run': {
    cmd: 'node',
    args: ['demigod-reseal-queue.mjs', 'run'],
    timeout: 300000,
    safe: true,
  },
  'enrichment-scoreboard': {
    cmd: 'node',
    args: ['demigod-enrichment.mjs', 'scoreboard'],
    timeout: 60000,
    safe: true,
  },
  'ats-board-coverage': {
    cmd: 'node',
    args: ['demigod-enrichment.mjs', 'boards'],
    timeout: 30000,
    safe: true,
  },
  'structured-hiring-audit': {
    cmd: 'node',
    args: ['demigod-structured-hiring.mjs', 'audit', '--json'],
    timeout: 15000,
    safe: true,
  },
  referrals: { cmd: 'node', args: ['demigod-referrals.mjs', 'status'], timeout: 15000, safe: true },
  'recruitai-export': {
    cmd: 'node',
    args: ['demigod-recruitai-export.mjs'],
    timeout: 120000,
    safe: true,
  },
  'partner-sourcer': {
    cmd: 'node',
    args: ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=10'],
    timeout: 60000,
    safe: true,
  },
  'auto-propose': { cmd: 'node', args: ['demigod-auto-propose.mjs', '--json'], timeout: 30000, safe: false, mutate: true },
});

const HANDOFF_PATH = path.join(BUSY, 'dashboard-handoff.json');
const jobMap = new Map(); // id -> job record
const jobState = { last: null, running: null };
let jobSeq = 0;

function listJobsMeta() {
  return Object.entries(JOBS).map(([id, s]) => ({
    id,
    safe: !!s.safe,
    mutate: !!s.mutate,
    timeout: s.timeout,
  }));
}

function annotateRunnableTools(reg) {
  if (!reg || !Array.isArray(reg.tools)) return reg;
  return {
    ...reg,
    tools: reg.tools.map((tool) => {
      // Treat only explicit allowlist entries as executable. A registry id such
      // as "toString" must not inherit authority from Object.prototype.
      const job = Object.prototype.hasOwnProperty.call(JOBS, tool.id)
        ? JOBS[tool.id]
        : null;
      return {
        ...tool,
        // Execution authority and mutation classification share one source.
        // Registry copy may lag the dashboard allowlist during concurrent work.
        runnable: Boolean(job),
        safe: job?.safe === true,
        // A tool absent from JOBS has no dashboard execution authority, so its
        // mutation authority must also fail closed instead of trusting catalog
        // metadata that the server does not execute.
        mutate: job ? job.mutate === true : false,
      };
    }),
  };
}

function readHandoffs(limit = 20) {
  const j = safeJson(HANDOFF_PATH) || { notes: [] };
  const notes = Array.isArray(j.notes) ? j.notes : [];
  return notes.slice(0, limit);
}

const eventRing = [];
function pushEvent(type, message, meta = null) {
  eventRing.unshift({
    id: `e${Date.now().toString(36)}${(++jobSeq).toString(36)}`,
    at: new Date().toISOString(),
    type,
    message: String(message).slice(0, 300),
    meta: meta || undefined,
  });
  if (eventRing.length > 80) eventRing.length = 80;
}

function appendHandoff({ from = 'agent', text = '', meta = null, done = null, next = null, blocked = null } = {}) {
  const structured = [done, next, blocked].some((x) => x != null && String(x).length);
  const composed =
    text ||
    [done != null ? `done: ${done}` : null, next != null ? `next: ${next}` : null, blocked != null ? `blocked: ${blocked}` : null]
      .filter(Boolean)
      .join(' · ');
  const note = {
    id: `h${Date.now().toString(36)}${(++jobSeq).toString(36)}`,
    at: new Date().toISOString(),
    from: String(from).slice(0, 32),
    text: String(composed).slice(0, 2000),
    meta: {
      ...(meta || {}),
      done: done || null,
      next: next || null,
      blocked: blocked || null,
      structured: structured || Boolean(meta?.structured),
    },
  };
  // Atomic-ish: write tmp then rename (avoid partial clobber)
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    let notes = [];
    try {
      notes = readHandoffs(100);
    } catch {
      notes = [];
    }
    notes.unshift(note);
    notes = notes.slice(0, 50);
    const body = JSON.stringify({ at: note.at, notes }, null, 2) + '\n';
    atomicWrite(HANDOFF_PATH, body, { mode: 0o600 });
    pushEvent('handoff', `${note.from}: ${note.text.slice(0, 80)}`);
    note.written = true;
  } catch {
    // Do NOT silently succeed: the POST handler reported ok:true even when this write threw, so a
    // handoff that never persisted looked recorded. Signal failure via note.written so the caller
    // can respond 500 instead of a lying ok:true.
  }
  return note;
}

/** Stable NEXT — canonical demigod-next (not cockpit re-derive) */
function nextContract(data) {
  const freezeOn = Boolean(data?.freeze?.on);
  let canon = null;
  try {
    canon = buildNext({
      truth: data?.truth || null,
      demand: data?.demand || null,
    });
  } catch {
    canon = null;
  }
  if (canon) {
    return {
      id: canon.id || null,
      pri: canon.pri ?? null,
      title: canon.title || null,
      cmd: canon.cmd || null,
      mutate: !!canon.mutate,
      // Freeze gates publish/mutation, not read-only truth/demand/control work.
      freezeBlocks: !!canon.freezeBlocks || (freezeOn && !!canon.mutate),
      shipped: Boolean(data?.cockpit?.shipped || canon.fullyShipped),
      source: 'demigod-next',
      reason: canon.reason || null,
      versions: canon.versions || null,
      truthEvidence: canon.truthEvidence || null,
    };
  }
  // Fallback only if builder throws
  const n = data?.cockpit?.next || null;
  if (!n) {
    return {
      id: null,
      pri: null,
      title: null,
      cmd: null,
      mutate: false,
      freezeBlocks: freezeOn,
      shipped: Boolean(data?.cockpit?.shipped),
      source: 'none',
    };
  }
  return {
    id: n.id || null,
    pri: n.pri ?? null,
    title: n.title || null,
    cmd: n.cmd || null,
    mutate: !!n.mutate,
    freezeBlocks: freezeOn && !!n.mutate,
    shipped: Boolean(data?.cockpit?.shipped),
    source: 'cockpit-fallback',
  };
}

function buildGlance(data) {
  // Accept both the dashboard probe shape (`ok`) and the canonical truth
  // shape (`reachable` / `htmlOk`). Cached truth-backed snapshots otherwise
  // misreport a reachable site as DOWN merely because they lack `live.ok`.
  const truthGreen = data?.truthEvidence?.green === true;
  const liveOk = truthGreen || data?.live?.ok === true || data?.live?.reachable === true || data?.live?.htmlOk === true;
  const siteOk = liveOk && truthGreen;
  const freezeOn = Boolean(data?.freeze?.on);
  const next = nextContract(data);
  const stale = (data?.staleGates || []).length;
  const liveFoot = data?.live?.foot || (data?.truth?.live?.footVer ? `foot v${data.truth.live.footVer}` : 'UP');
  const liveCdn = data?.live?.cdnId || data?.truth?.live?.footUrl || 'cdn?';
  let site = liveOk
    ? `Live ${liveFoot} · ${liveCdn}`
    : `Live DOWN · ${data.live?.error || 'probe failed'}`;
  if (next.shipped) site += ' · hash chain green';
  else if (liveOk) site += ' · not fully shipped';
  return {
    site,
    // Reachability is not release health. A responsive stale foot must stay
    // red while canonical truth reports disk/live or attestation drift.
    siteOk,
    siteReachable: liveOk,
    siteReason: !liveOk
      ? (data?.live?.error || 'unreachable')
      : !truthGreen
        ? (data?.truthEvidence?.summary || data?.truthEvidence?.reason || 'truth not green')
        : 'canonical truth green',
    freeze: freezeOn ? `ON — ${data.freeze?.why || 'publish frozen'}` : 'OFF — capability open; publish still current-request-gated',
    freezeOn,
    agentNext: next.title
      ? `P${next.pri} ${next.title}${next.freezeBlocks ? ' (blocked by freeze)' : ''}`
      : 'No NEXT — idle / green',
    next,
    staleCount: stale,
  };
}

function buildSessionStory(data) {
  const parts = [];
  const smoke = data?.smoke;
  const freezeOn = Boolean(data?.freeze?.on);
  const ev = data?.evidence || {};
  if (smoke?.pass === true) parts.push(`smoke PASS (${ageLabel(ev.smoke?.ageSec)})`);
  else if (smoke?.pass === false) parts.push(`smoke FAIL (${ageLabel(ev.smoke?.ageSec)})`);
  else parts.push('smoke not run yet');
  parts.push(freezeOn ? 'freeze ON' : 'freeze OFF');
  parts.push(data?.live?.foot ? `live ${data.live.foot}` : 'live ?');
  // Respect freshness: a PASS from an EXPIRED verify file is not a current PASS. Without this the
  // Session Story said "verify PASS" while the Freshness/Stale-Gates card called the same file stale
  // -- two cards disagreeing about one fact. Say "PASS (stale)" so they agree.
  if (data?.gates?.verifySourcePass === true) {
    const vfresh = data?.freshness?.verifySource?.fresh;
    parts.push(`verify PASS${vfresh === false ? ' (stale)' : ''} (${ageLabel(ev.verifySource?.ageSec)})`);
  } else if (data?.gates?.verifySourcePass === false) parts.push('verify FAIL');
  const handoffs = readHandoffs(3);
  if (handoffs[0]) parts.push(`last note: ${handoffs[0].from} ${ageLabel(Math.round((Date.now() - Date.parse(handoffs[0].at)) / 1000))}`);
  return parts.join(' · ');
}

function ageLabel(sec) {
  if (sec == null || Number.isNaN(sec)) return '—';
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

function buildStaleGates(evidence, thresholds = {}) {
  // required: missing counts as stale; optional: only age-stale if file exists
  const required = {
    verifySource: 7200,
    smoke: 86400,
    truth: 7200,
  };
  const optional = {
    preflight: 86400,
    boardHonesty: 86400,
    cockpit: 86400,
    shipStatus: 86400,
  };
  const tReq = { ...required, ...(thresholds.required || {}) };
  const tOpt = { ...optional, ...(thresholds.optional || {}) };
  const stale = [];
  for (const [key, maxSec] of Object.entries(tReq)) {
    const e = evidence?.[key];
    if (!e || e.missing) {
      stale.push({ key, reason: 'missing', ageSec: null, maxSec });
      continue;
    }
    if (e.ageSec != null && e.ageSec > maxSec) {
      stale.push({ key, reason: 'stale', ageSec: e.ageSec, maxSec, label: ageLabel(e.ageSec) });
    }
  }
  for (const [key, maxSec] of Object.entries(tOpt)) {
    const e = evidence?.[key];
    if (!e || e.missing) continue;
    if (e.ageSec != null && e.ageSec > maxSec) {
      stale.push({ key, reason: 'stale', ageSec: e.ageSec, maxSec, label: ageLabel(e.ageSec) });
    }
  }
  return stale;
}

/** Slim delta for agents — only changed keys since ISO timestamp */
function buildDelta(data, sinceIso) {
  const since = sinceIso ? Date.parse(sinceIso) : 0;
  const at = Date.parse(data.at) || Date.now();
  if (!since || at <= since) {
    return { at: data.at, changed: false, since: sinceIso || null, fields: {} };
  }
  const fields = {
    next: nextContract(data),
    orient: data.orient
      ? {
          api: data.orient.api || '/api/orient',
          statusJsonPath: data.orient.statusJsonPath || STATUS_JSON,
          ok: data.orient.ok ?? null,
          green: data.orient.green ?? null,
          // Delta polling must replace freshness state atomically with the
          // orient verdict. Omitting these fields lets a long-lived dashboard
          // retain a formerly-current card after the receipt becomes stale.
          receiptGreen: data.orient.receiptGreen ?? null,
          receiptAvailable: data.orient.receiptAvailable === true,
          receiptAgeMs: data.orient.receiptAgeMs ?? null,
          degraded: data.orient.degraded === true,
          exit: data.orient.exit ?? null,
          next: data.orient.next || null,
          freeze: data.orient.freeze || {
            on: data.freeze?.on === true,
            why: data.freeze?.why || null,
          },
          assertSame: data.orient.assertSame || null,
          // Preserve the canonical full-status shape in delta polling. The
          // advertised /orient/drafts/hygiene pointer must not disappear when
          // an agent switches from /api/status to ?since= incremental reads.
          drafts: {
            hygiene: data.orient.drafts?.hygiene || data.orient.demandDraftsHygiene || null,
          },
          demandDraftsHygiene: data.orient.demandDraftsHygiene || null,
          demandDraftsHygieneSource:
            data.orient.demandDraftsHygiene?.source || data.demandDraftsHygieneSource || 'unknown',
          demandDraftsHygieneAt:
            data.orient.demandDraftsHygieneAt || data.demandDraftsHygieneAt || null,
          demandDraftsHygieneAgeSec:
            data.orient.demandDraftsHygieneAgeSec ?? data.demandDraftsHygieneAgeSec ?? null,
          demandDraftsHygieneStale:
            data.orient.demandDraftsHygieneStale ?? data.demandDraftsHygieneStale ?? true,
          demandDraftsHygieneReady:
            data.orient.demandDraftsHygieneReady === true && data.demandDraftsHygieneReady === true,
          demandDraftsHygieneStatusPath:
            data.orient.demandDraftsHygiene?.statusPath ||
            data.demandDraftsHygieneStatusPath ||
            data.orient.demandStatusPath ||
            path.join(BUSY, 'demand-status.json'),
          demandStatusPath: data.orient.demandStatusPath || path.join(BUSY, 'demand-status.json'),
        }
      : {
          api: '/api/orient',
          statusJsonPath: STATUS_JSON,
          ok: null,
          green: null,
          freeze: {
            on: data.freeze?.on === true,
            why: data.freeze?.why || null,
          },
          assertSame: null,
          drafts: {
            hygiene: data.demand?.drafts?.hygiene || null,
          },
          // Orient can be unavailable while the independently materialized
          // demand receipt is still valid. Keep delta clients on the same
          // hygiene evidence as full/slim status instead of erasing it merely
          // because the orientation wrapper is missing.
          demandDraftsHygiene: data.demand?.drafts?.hygiene || null,
          demandDraftsHygieneSource:
            data.demand?.drafts?.hygiene?.source || data.demandDraftsHygieneSource || 'unknown',
          demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
          demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
          demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
          demandDraftsHygieneReady: false,
          demandDraftsHygieneStatusPath:
            data.demand?.drafts?.hygiene?.statusPath ||
            data.demandDraftsHygieneStatusPath ||
            data.demand?.statusPath ||
            path.join(BUSY, 'demand-status.json'),
          demandStatusPath: data.demand?.statusPath || path.join(BUSY, 'demand-status.json'),
        },
    demandDraftsHygiene: data.demand?.drafts?.hygiene || null,
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneAt: data.demandDraftsHygieneAt || null,
    demandDraftsHygieneAgeSec: data.demandDraftsHygieneAgeSec ?? null,
    demandDraftsHygieneStale: data.demandDraftsHygieneStale ?? true,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    demandDraftsHygieneStatusPath:
      data.demandDraftsHygieneStatusPath || data.demand?.statusPath || path.join(BUSY, 'demand-status.json'),
    demandStatusPath: data.demand?.statusPath || path.join(BUSY, 'demand-status.json'),
    freeze: { on: Boolean(data.freeze?.on), why: data.freeze?.why || null },
    live: { ok: data.live?.ok, foot: data.live?.foot, cdnId: data.live?.cdnId },
    shipped: Boolean(data.cockpit?.shipped),
    verifySourcePass: data.gates?.verifySourcePass ?? null,
    smokePass: data.smoke?.pass ?? null,
    staleGates: data.staleGates || [],
    sessionStory: data.sessionStory,
    glance: data.glance,
  };
  return { at: data.at, changed: true, since: sinceIso, fields };
}

function buildJobQueue() {
  const knownJob = (j) =>
    j && typeof j.jobId === 'string' && typeof j.id === 'string' && Object.prototype.hasOwnProperty.call(JOBS, j.id);
  const memRecent = [...jobMap.values()]
    .filter(knownJob)
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    .slice(0, 12)
    .map((j) => ({
      jobId: j.jobId,
      id: j.id,
      status: j.status,
      ok: j.ok,
      ms: j.ms,
      at: j.at,
      mutate: j.mutate,
      error: j.error ? String(j.error).slice(0, 120) : undefined,
    }));
  // Merge disk history from job-store if present
  let diskRecent = [];
  try {
    const dir = path.join(BUSY, 'jobs');
    if (fs.existsSync(dir)) {
      diskRecent = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
            const st = fs.statSync(path.join(dir, f));
            return { ...j, _mtime: st.mtimeMs };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .filter(knownJob)
        .sort((a, b) => (b._mtime || 0) - (a._mtime || 0))
        .slice(0, 12)
        .map((j) => ({
          jobId: j.jobId,
          id: j.id,
          status: j.status,
          ok: j.ok,
          ms: j.ms,
          at: j.at || j.endedAt,
          mutate: j.mutate,
          persisted: true,
        }));
    }
  } catch {
    /* */
  }
  const seen = new Set(memRecent.map((j) => j.jobId));
  const recent = memRecent.concat(diskRecent.filter((j) => j.jobId && !seen.has(j.jobId))).slice(0, 16);
  return {
    running: jobState.running,
    last: jobState.last
      ? { jobId: jobState.last.jobId, id: jobState.last.id, status: jobState.last.status, ok: jobState.last.ok, ms: jobState.last.ms }
      : null,
    recent,
    blockedHint: jobState.running
      ? `job running: ${jobState.running} — wait or poll /api/jobs`
      : null,
  };
}

function ensureDemandFresh(maxAgeSec = 900) {
  /**
   * Never block the status hot path with execSync.
   * If stale/missing: spawn background refresh and return current cache (if any).
   */
  const p = path.join(BUSY, 'demand-status.json');
  let ageSec = null;
  try {
    ageSec = Math.round((Date.now() - fs.statSync(p).mtimeMs) / 1000);
    if (!Number.isFinite(ageSec) || ageSec < 0) ageSec = null;
  } catch {
    ageSec = null;
  }
  if (ageSec != null && ageSec <= maxAgeSec) {
    return { refreshed: false, ageSec, background: false };
  }
  if (!demandRefreshInflight) {
    demandRefreshInflight = true;
    import('child_process')
      .then(({ spawn }) => {
        const child = spawn(process.execPath, ['demigod-demand.mjs', 'status', '--json'], {
          cwd: ROOT,
          stdio: 'ignore',
          detached: true,
        });
        child.unref();
        let hardStop = null;
        const done = () => {
          clearTimeout(watchdog);
          if (hardStop) clearTimeout(hardStop);
          demandRefreshInflight = false;
        };
        const watchdog = setTimeout(() => {
          try {
            child.kill('SIGTERM');
          } catch {
            /* child already exited */
          }
          // Keep the single-flight guard until the child actually exits. If it
          // ignores SIGTERM, bound the wait and make one final best-effort stop.
          hardStop = setTimeout(() => {
            try {
              child.kill('SIGKILL');
            } catch {
              /* child already exited */
            }
            demandRefreshInflight = false;
          }, 5_000);
          hardStop.unref();
        }, 25_000);
        watchdog.unref();
        child.on('exit', done);
        child.on('error', done);
      })
      .catch(() => {
        demandRefreshInflight = false;
      });
  }
  return { refreshed: false, ageSec, background: true, scheduled: true };
}

async function enrichStatus(data) {
  data.version = 5;
  data.work = compactWorkStatus();
  data.shipPrepare = safeJson(path.join(BUSY, 'ship-prepare.json')) || null;
  // Stable discovery fields survive both the full persisted status document
  // and the slim polling payload; consumers need no implicit /tmp knowledge.
  data.statusJsonPath = STATUS_JSON;
  data.orientApi = '/api/orient';
  data.orientUrl = `http://127.0.0.1:${PORT}/api/orient`;
  // Keep demand snapshot warm for glance (agent-only; never auto-sends)
  try {
    data.demandRefresh = ensureDemandFresh(900);
    data.demandStale = data.demandRefresh?.ageSec == null || data.demandRefresh.ageSec > 900;
    if (!data.demand) {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(BUSY, 'demand-status.json'), 'utf8'));
        data.demand = demandStatusSnapshot(j);
      } catch {
        /* */
      }
    }
    if (data.demand) {
      data.demand.stale = data.demandStale;
      data.demand.ageSec = data.demandRefresh?.ageSec ?? null;
    }
    data.demandDraftsHygiene = data.demand?.drafts?.hygiene || null;
    // Top-level booleans keep the advertised status path grep/jq friendly;
    // consumers need not reconstruct visibility from nested contracts.
    data.demandDraftsHygieneVisible = data.demandDraftsHygiene != null;
    // Publish the canonical nested location as data, not just as prose in the
    // discovery views. File-only consumers can follow this pointer directly
    // and avoid depending on the top-level compatibility alias.
    data.demandDraftsHygieneCanonicalJsonPointer = '/demand/drafts/hygiene';
    data.demandDraftsHygieneOk = data.demandDraftsHygiene?.ok ?? null;
    data.demandDraftsHygieneSource = data.demandDraftsHygiene?.source || 'unknown';
    // Preserve the hygiene receipt's own evidence clock. A queue/status refresh
    // can update demand.at without rechecking drafts; using that broader clock
    // would make stale hygiene evidence look fresh in /api/status.
    data.demandDraftsHygieneAt = data.demandDraftsHygiene?.at || null;
    data.demandDraftsHygieneAgeSec = data.demandDraftsHygiene?.ageSec ?? null;
    data.demandDraftsHygieneStale = data.demandDraftsHygiene?.stale ?? true;
    // One fail-closed readiness bit prevents API, delta, and file consumers
    // from treating a present but stale (or failing) hygiene receipt as safe.
    data.demandDraftsHygieneReady =
      data.demandDraftsHygiene?.ok === true && data.demandDraftsHygieneStale === false;
    data.demandStatusPath = data.demand?.statusPath || path.join(BUSY, 'demand-status.json');
    data.demandStatusSourceReceipt = data.demand?.sourceReceipt || {
      path: data.demandStatusPath,
      bytes: null,
      sha256: null,
    };
  data.demandDraftsHygieneStatusPath =
    data.demandDraftsHygiene?.statusPath || data.demandStatusPath;
    // collectStatus builds the orient mirror before this optional demand refresh.
    // Rejoin it here so the persisted /orient pointers cannot lag the root
    // hygiene snapshot within the same dashboard-status.json receipt.
    if (data.orient) {
      data.orient.drafts = data.demand?.drafts || null;
      data.orient.demandDrafts = data.demand?.drafts || null;
      data.orient.demandDraftsHygiene = data.demandDraftsHygiene;
      data.orient.demandDraftsHygieneReady = data.demandDraftsHygieneReady;
      data.orient.demandDraftsHygieneOk = data.demandDraftsHygieneOk;
      data.orient.demandDraftsHygieneSource = data.demandDraftsHygieneSource;
      data.orient.demandDraftsHygieneAt = data.demandDraftsHygieneAt;
      data.orient.demandDraftsHygieneAgeSec = data.demandDraftsHygieneAgeSec;
      data.orient.demandDraftsHygieneStale = data.demandDraftsHygieneStale;
      data.orient.demandDraftsHygieneStatusPath = data.demandDraftsHygieneStatusPath;
      data.orient.demandStatusPath = data.demandStatusPath;
      data.orient.demandStatusSourceReceipt = data.demandStatusSourceReceipt;
      data.orient.statusJsonPath = STATUS_JSON;
    }
  } catch {
    /* */
  }
  // Visibility is only trustworthy when the root snapshot and its orient
  // mirror identify the same hygiene evidence. Presence alone can hide a
  // partially refreshed status document from file-only agents.
  const orientDemandDraftsHygieneConsistent =
    data.demandDraftsHygiene != null &&
    data.orient?.demandDraftsHygiene != null &&
    // Equal verdicts can still conceal lagging checked/clean/flagged counts.
    // Require the complete normalized receipt to match across both views.
    JSON.stringify(data.orient.demandDraftsHygiene) ===
      JSON.stringify(data.demandDraftsHygiene) &&
    data.orient.demandDraftsHygieneSource === data.demandDraftsHygieneSource &&
    data.orient.demandDraftsHygieneStatusPath === data.demandDraftsHygieneStatusPath;
  // Single fail-closed verdict shared by persisted status views, slim polling,
  // and /api/orient. Build it before the compact path view so that view never
  // publishes a raw receipt without its readiness decision.
  data.draftHygieneVerdict = {
    schema: 'demigod.draft-hygiene-verdict/1',
    ready: data.demandDraftsHygieneReady === true,
    reason: data.demandDraftsHygieneReady === true
      ? 'ready'
      : data.demandDraftsHygiene == null
        ? 'missing'
        : data.demandDraftsHygiene?.clockSkewed === true
          ? 'clock-skewed'
          : data.demandDraftsHygieneStale === true
            ? 'stale'
            : data.demandDraftsHygieneOk === false
              ? 'flagged'
              : 'unknown',
    ok: data.demandDraftsHygieneOk ?? null,
    stale: data.demandDraftsHygieneStale ?? true,
    source: data.demandDraftsHygieneSource || 'unknown',
    at: data.demandDraftsHygieneAt || null,
    ageSec: data.demandDraftsHygieneAgeSec ?? null,
    statusPath: data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
    checked: data.demandDraftsHygiene?.checked ?? null,
    clean: data.demandDraftsHygiene?.clean ?? null,
    flagged: data.demandDraftsHygiene?.flagged ?? null,
  };
  // Keep the canonical persisted orient branch independently auditable. A
  // file-only reader following /orient/drafts/hygiene should not need to join
  // root aliases to learn whether that evidence is usable or where it came
  // from. This is also the shape returned by the orient discovery contract.
  if (data.orient) {
    data.orient.drafts = {
      ...(data.orient.drafts || {}),
      hygiene: data.demandDraftsHygiene || null,
      hygieneVerdict: data.draftHygieneVerdict,
      statusPath: data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
      statusJsonPath: STATUS_JSON,
      sourceReceipt: {
        source: data.demandDraftsHygieneSource || 'unknown',
        ...(data.demandDraftsHygiene?.sourceReceipt || data.demandStatusSourceReceipt || {}),
        at: data.demandDraftsHygieneAt || null,
        ageSec: data.demandDraftsHygieneAgeSec ?? null,
        stale: data.demandDraftsHygieneStale ?? true,
        statusPath: data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
      },
    };
  }
  // Minimal file-reader view: consumers that only know dashboard-status.json
  // should not have to reverse-engineer the larger discovery contracts to
  // locate the live orient route and its persisted draft-hygiene evidence.
  data.statusJsonPathView = {
    schema: 'demigod.dashboard-status-path-view/1',
    path: STATUS_JSON,
    statusJsonPath: STATUS_JSON,
    orientApi: '/api/orient',
    orientUrl: data.orientUrl,
    // Stable pointers let minimal file readers verify both required surfaces
    // without knowing the rest of the dashboard status schema.
    pointers: {
      orientApi: '/statusJsonPathView/orientApi',
      demandDraftsHygiene: '/statusJsonPathView/demand/drafts/hygiene',
      demandDraftsHygieneVerdict: '/statusJsonPathView/demand/drafts/hygieneVerdict',
    },
    // Mirror /api/orient's canonical demand shape for file-only readers.
    demand: {
      drafts: {
        hygiene: data.demandDraftsHygiene || null,
        // Pair evidence with the normalized fail-closed decision. Presence of
        // a hygiene object alone is not readiness: it may be stale or flagged.
        hygieneVerdict: data.draftHygieneVerdict || null,
      },
    },
    // Compact route + receipt locator for one-read file consumers.
    orientEndpoint: {
      method: 'GET',
      path: '/api/orient',
      statusJsonPath: STATUS_JSON,
      // Put the visibility/readiness verdict beside the route. A status-file
      // reader can decide whether the advertised orient surface is usable
      // without chasing the evidence pointers first.
      visible: data.orientApi === '/api/orient',
      demandDraftsHygieneVisible: data.demandDraftsHygiene != null,
      demandDraftsHygieneReady: data.draftHygieneVerdict?.ready === true,
      // Keep provenance on the compact endpoint card itself. Consumers that
      // only read statusJsonPathView no longer need to chase the root aliases
      // to learn which demand receipt supplied the hygiene verdict.
      demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
      demandDraftsHygieneStatusPath:
        data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
      demandDraftsHygieneJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
      demandDraftsHygieneVerdictJsonPointer:
        '/statusJsonPathView/demand/drafts/hygieneVerdict',
    },
    orientApiVisible: data.orientApi === '/api/orient',
    orientJsonPointer: '/orient',
    orientVisible: Boolean(data.orient),
    // Structural /api/orient mirror for file-only readers.
    orient: {
      api: '/api/orient',
      statusJsonPath: STATUS_JSON,
      drafts: { hygiene: data.orient?.drafts?.hygiene || data.demandDraftsHygiene || null },
      demand: {
        drafts: {
          // The orient receipt may have been read before this status cycle
          // refreshed demand. Prefer the normalized root evidence so every
          // statusJsonPathView hygiene projection is byte-for-byte current.
          hygiene: data.demandDraftsHygiene || data.orient?.demand?.drafts?.hygiene || null,
          // Match the persisted root demand projection: evidence without its
          // fail-closed verdict can make a stale or flagged receipt look ready.
          hygieneVerdict: data.draftHygieneVerdict || null,
          statusPath:
            data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
          statusJsonPath: STATUS_JSON,
        },
      },
    },
    orientDemandDraftsHygiene: data.orient?.demandDraftsHygiene || null,
    orientDemandDraftsHygieneVisible: data.orient?.demandDraftsHygiene != null,
    orientDemandDraftsHygieneConsistent,
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneVerdict: data.draftHygieneVerdict || null,
    demandDraftsHygieneStatusJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
    orientDraftsHygieneStatusJsonPointer: '/statusJsonPathView/orient/drafts/hygiene',
    orientDemandDraftsHygieneStatusJsonPointer:
      '/statusJsonPathView/orient/demand/drafts/hygiene',
    demandDraftsHygieneOk: data.demandDraftsHygieneOk ?? null,
    demandDraftsHygieneSource: data.demandDraftsHygieneSource || 'unknown',
    demandDraftsHygieneVisible: data.demandDraftsHygiene != null,
    demandDraftsHygieneReady: data.draftHygieneVerdict?.ready === true,
    demandDraftsHygieneJsonPointer: '/demandDraftsHygiene',
    orientDemandDraftsHygieneJsonPointer: '/orient/demandDraftsHygiene',
    demandDraftsHygieneStatusPath: data.demandDraftsHygieneStatusPath,
    complete:
      data.orientApi === '/api/orient' &&
      Boolean(data.orient) &&
      data.orient?.demandDraftsHygiene != null &&
      data.demandDraftsHygiene != null &&
      orientDemandDraftsHygieneConsistent &&
      // A consistent stale/flagged receipt is still unusable. Keep this
      // compact file-reader contract aligned with the
      // draftHygieneVerdict fail-closed readiness policy.
      data.draftHygieneVerdict?.ready === true,
  };
  // Freshness: verify vs foot-core (false PASS prevention)
  try {
    // dynamic import-free: use sync helpers inlined via fs already available
    const footCore = path.join(ROOT, 'demigod-foot-core.js');
    const verifyPath = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');
    const boardPath = path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json');
    const smokePath = path.join(BUSY, 'agent-smoke.json');
    const gateFresh = (gateFile, sourceFile, maxAgeSec = null) => {
      const g = (() => {
        try {
          const st = fs.statSync(gateFile);
          return { mtimeMs: st.mtimeMs, ageSec: Math.round((Date.now() - st.mtimeMs) / 1000), missing: false };
        } catch {
          return { missing: true, mtimeMs: 0, ageSec: null };
        }
      })();
      const s = (() => {
        try {
          const st = fs.statSync(sourceFile);
          return { mtimeMs: st.mtimeMs, missing: false };
        } catch {
          return { missing: true, mtimeMs: 0 };
        }
      })();
      if (g.missing) return { fresh: false, reason: 'missing', label: 'missing' };
      if (!s.missing && g.mtimeMs + 2000 < s.mtimeMs) {
        return {
          fresh: false,
          reason: 'older-than-source',
          label: 'stale-vs-foot',
          lagSec: Math.round((s.mtimeMs - g.mtimeMs) / 1000),
        };
      }
      // Clock skew: a future mtime gives a NEGATIVE age, which slips past the max-age check below
      // (negative is never > maxAge) and gets classified fresh. A file dated in the future is not a
      // trustworthy "fresh" -- flag it, same guard as the headCss card.
      if (g.ageSec != null && g.ageSec < -60) {
        return { fresh: false, reason: 'clock-skew', label: 'future-mtime', ageSec: g.ageSec };
      }
      if (maxAgeSec != null && g.ageSec != null && g.ageSec > maxAgeSec) {
        return { fresh: false, reason: 'max-age', label: 'stale-age', ageSec: g.ageSec };
      }
      return { fresh: true, reason: 'ok', label: 'fresh', ageSec: g.ageSec };
    };
    data.freshness = {
      verifySource: gateFresh(verifyPath, footCore, 7200),
      boardHonesty: gateFresh(boardPath, path.join(ROOT, 'DEMIGOD-BOARD.json'), 86400),
      smoke: gateFresh(smokePath, footCore, 86400),
    };
    // If verify is stale, never imply green trust
    if (data.freshness.verifySource && !data.freshness.verifySource.fresh) {
      data.gates = {
        ...(data.gates || {}),
        verifySourceTrust: false,
        verifySourceFresh: false,
        verifySourceFreshness: data.freshness.verifySource,
      };
    } else if (data.gates) {
      data.gates.verifySourceTrust = data.gates.verifySourcePass === true;
      data.gates.verifySourceFresh = true;
    }
  } catch {
    data.freshness = {};
  }

  data.next = nextContract(data);
  // Canonical next already freeze-aware; still stamp freezeBlocks on any mutate
  if (data.freeze?.on && data.next?.mutate) {
    data.next = {
      ...data.next,
      freezeBlocks: true,
      title: data.next.title || 'Blocked by freeze',
      note: 'freeze ON — mutate blocked',
    };
  }
  data.staleGates = buildStaleGates(data.evidence || {});
  // Merge freshness into stale display
  for (const [k, f] of Object.entries(data.freshness || {})) {
    if (f && !f.fresh && !data.staleGates.some((s) => s.key === k)) {
      data.staleGates.push({
        key: k,
        reason: f.reason,
        ageSec: f.ageSec ?? f.lagSec ?? null,
        maxSec: null,
        label: f.label,
      });
    }
  }
  data.glance = buildGlance(data);
  const webflow = safeJson(path.join(BUSY, 'webflow-status.json'));
  data.webflow = webflow
    ? { ...webflow, doctor: safeJson(path.join(BUSY, 'webflow-doctor.json')) || webflow.doctor || null }
    : null;
  try {
    const { buildPriorityBoard } = await import('./demigod-priority-board.mjs');
    data.priorityBoard = buildPriorityBoard(data);
  } catch (e) {
    data.priorityBoard = { schema: 'demigod.priority-board/1', at: new Date().toISOString(), headline: { title: 'priority unavailable', detail: String(e.message || e) }, cards: [] };
  }
  data.sessionStory = buildSessionStory(data);
  data.handoffs = readHandoffs(12);
  data.jobQueue = buildJobQueue();
  // Ship readiness
  try {
    const { buildShipChecklist } = await import('./demigod-ship-checklist.mjs').catch(() => ({ buildShipChecklist: null }));
    if (typeof buildShipChecklist === 'function') {
      data.shipChecklist = buildShipChecklist();
    }
  } catch {
    data.shipChecklist = null;
  }
  // Submissions inbox (redacted snapshot)
  try {
    // Prefer busy cache; refresh if missing/stale (>5 min)
    let snap = safeJson(path.join(BUSY, 'submissions-inbox-latest.json'));
    const age = snap?.at ? Date.now() - Date.parse(snap.at) : Infinity;
    if (!snap || age > 5 * 60 * 1000) {
      run('node demigod-submissions-inbox.mjs --json', 12000);
      snap = safeJson(path.join(BUSY, 'submissions-inbox-latest.json'));
    }
    data.inbox = snap
      ? {
          at: snap.at,
          total: snap.summary?.total ?? snap.totalItems ?? 0,
          newCount: snap.newCount ?? 0,
          pendingReviewCount: snap.pendingReviewCount ?? snap.newCount ?? 0,
          operationalCount: snap.operationalCount ?? null,
          testCount: snap.testCount ?? null,
          spamCount: snap.spamCount ?? null,
          incompleteCount: snap.incompleteCount ?? null,
          pendingOperationalReviewCount: snap.pendingOperationalReviewCount ?? null,
          byKind: snap.summary?.byKind || snap.byKind || {},
          newestAt: snap.newestAt || null,
          newestAgeSec: snap.newestAgeSec ?? null,
          operationalRows: (snap.operationalRows || []).slice(0, 12),
          rows: (snap.rows || []).slice(0, 12),
          actions: snap.actions || {},
        }
      : { total: 0, newCount: 0, pendingReviewCount: 0, rows: [], error: 'no snapshot' };
  } catch (e) {
    data.inbox = { total: 0, newCount: 0, pendingReviewCount: 0, rows: [], error: String(e.message || e) };
  }
  // Funnel intelligence is aggregate-only: never expose contact values or lead rows.
  try {
    const { currentStatusReport } = await import('./demigod-funnel.mjs');
    data.peopleIntelligence = peopleIntelligenceView(currentStatusReport());
  } catch {
    data.peopleIntelligence = { error: 'funnel_status_unavailable' };
  }
  // Match review queue — cache 60s (build can be heavy)
  try {
    const now = Date.now();
    if (matchCache.data && now - matchCache.at < MATCH_TTL_MS) {
      data.matches = matchCache.data;
      data.matchesCached = true;
    } else {
      const { buildQueue } = await import('./demigod-match-review.mjs');
      const msnap = buildQueue({ limit: 40 });
      try {
        fs.mkdirSync(BUSY, { recursive: true });
        writeJsonAtomic(path.join(BUSY, 'match-review-latest.json'), msnap);
      } catch {
        /* */
      }
      let shStatus = null;
      try {
        const { buildStatus } = await import('./demigod-structured-hiring.mjs');
        shStatus = buildStatus();
      } catch {
        /* optional */
      }
      data.matches = {
        at: msnap.at,
        summary: msnap.summary || {},
        pairs: (msnap.pairs || []).slice(0, 40),
        actions: msnap.actions || {},
        structuredHiring: msnap.structuredHiring || null,
        structuredHiringStatus: shStatus,
      };
      // Home Signals also wants SH counts without Tools tab
      data.structuredHiring = shStatus
        ? {
            counts: shStatus.counts,
            packets: (shStatus.packets || []).length,
            at: shStatus.at,
          }
        : null;
      matchCache = { at: now, data: data.matches };
    }
  } catch (e) {
    data.matches = { summary: { total: 0 }, pairs: [], error: String(e.message || e) };
  }
  // Home integrity chip — receipt only (no re-evaluate on every status poll)
  try {
    const cbPath = path.join(BUSY, 'control-board.json');
    if (fs.existsSync(cbPath)) {
      const cb = JSON.parse(fs.readFileSync(cbPath, 'utf8'));
      data.controlBoard = {
        ok: cb.ok !== false,
        summary: cb.summary || null,
        at: cb.at || null,
        exitFailures: cb.exitFailures || [],
        highFailures: cb.highFailures || [],
      };
    } else {
      data.controlBoard = null;
    }
  } catch {
    data.controlBoard = null;
  }
  // Control plane — TTL cache (was ~1.3s every collect)
  try {
    const now = Date.now();
    if (controlCache.data && now - controlCache.at < CONTROL_TTL_MS) {
      data.control = controlCache.data;
      data.controlCached = true;
    } else {
      const { buildControlPlane } = await import('./demigod-control.mjs');
      const plane = await buildControlPlane({ dashStatus: data });
      data.control = {
        at: plane.at,
        schema: plane.schema,
        version: plane.version,
        frozen: plane.frozen,
        freezeWhy: plane.freezeWhy,
        freezeAt: plane.freezeAt,
        freezeBy: plane.freezeBy,
        sessionMode: plane.sessionMode,
        health: plane.health,
        healthLabel: plane.healthLabel,
        demandStarved: plane.demandStarved || false,
        dms: plane.dms || null,
        board: plane.board,
        lock: plane.lock,
        assets: plane.assets,
        modules: plane.modules,
        moduleOrder: plane.moduleOrder,
        spine: (plane.spine || []).slice(0, 8),
        map: plane.map,
        kbd: plane.kbd,
        entrypoints: plane.entrypoints,
        nextCanon: plane.nextCanon || plane.next || null,
        truthEvidence: plane.truthEvidence || null,
      };
      controlCache = { at: now, data: data.control };
    }
    data.control = { ...data.control, nextCanon: data.next };
  } catch (e) {
    const cp = safeJson(path.join(BUSY, 'control-plane.json'));
    data.control = cp
      ? {
          at: cp.at,
          frozen: cp.frozen,
          modules: cp.modules,
          spine: (cp.spine || []).slice(0, 6),
          health: cp.health,
          error: String(e.message || e),
        }
      : { error: String(e.message || e) };
  }
  data.links = {
    ...(data.links || {}),
    delta: `http://127.0.0.1:${PORT}/api/delta`,
    handoff: `http://127.0.0.1:${PORT}/api/handoff`,
    next: `http://127.0.0.1:${PORT}/api/next`,
    orient: `http://127.0.0.1:${PORT}/api/orient`,
    jobs: `http://127.0.0.1:${PORT}/api/jobs`,
    events: `http://127.0.0.1:${PORT}/api/events`,
    shipChecklist: `http://127.0.0.1:${PORT}/api/ship-checklist`,
    matches: `http://127.0.0.1:${PORT}/api/matches`,
    inbox: `http://127.0.0.1:${PORT}/api/inbox`,
    control: `http://127.0.0.1:${PORT}/api/control`,
    webflow: `http://127.0.0.1:${PORT}/api/webflow`,
    review: `http://127.0.0.1:${PORT}/api/review`,
  };
  data.pulseKey = crypto.createHash('sha256').update([
    data.next?.id,
    data.next?.title,
    data.freeze?.on,
    data.live?.foot,
    data.live?.cdnId,
    data.gates?.verifySourcePass,
    data.gates?.verifySourceFresh,
    data.smoke?.pass,
    data.jobQueue?.running,
    JSON.stringify([
      data.work?.cycle,
      data.work?.loopRunning,
      data.work?.stale,
      (data.work?.agents || []).map((agent) => [agent.id, agent.runtime, agent.lastResult, agent.at]),
      data.work?.claims?.count,
    ]),
    JSON.stringify([data.inbox?.total, data.inbox?.newCount, data.inbox?.pendingReviewCount, data.inbox?.byKind, (data.inbox?.rows || []).map((r) => [r.id, r.status, r.matchingReady])]),
    JSON.stringify([data.matches?.summary, (data.matches?.pairs || []).map((p) => [p.pairId, p.state, p.mutual])]),
  ].join('|')).digest('hex');
  return data;
}

async function executeJob(jobId, toolId) {
  const spec = JOBS[toolId];
  const rec = jobMap.get(jobId);
  if (!spec || !rec) {
    if (jobState.running === toolId) jobState.running = null;
    return;
  }
  rec.status = 'running';
  rec.startedAt = new Date().toISOString();
  // jobState.running already claimed in startJob
  const t0 = Date.now();
  try {
    // Defense-in-depth: re-check freeze at execute time (not only startJob)
    if (spec.mutate && !spec.publishSafe) {
      const freeze = safeJson(path.join(BUSY, 'publish-freeze.json'));
      if (freeze?.on) {
        throw new Error('mutate blocked at execute — publish-freeze ON: ' + (freeze.why || ''));
      }
    }
    const { stdout, stderr } = await execFileAsync(spec.cmd, spec.args, {
      cwd: ROOT,
      timeout: spec.timeout,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
      // never pass shell — args array only (injection safe)
    });
    if (toolId === 'plan-inbox' && stdout && stdout.trim().startsWith('{')) {
      try {
        atomicWrite(path.join(BUSY, 'plan-inbox-latest.json'), stdout.trim() + '\n', { mode: 0o600 });
      } catch {
        /* */
      }
    }
    statusCache = { at: 0, data: null };
    rec.status = 'done';
    rec.ok = true;
    pushEvent('job', `${toolId} done`, { jobId, ms: Date.now() - t0 });
    rec.ms = Date.now() - t0;
    rec.endedAt = new Date().toISOString();
    rec.stdout = (stdout || '').slice(0, 4000);
    rec.stderr = (stderr || '').slice(0, 1500);
    jobState.last = { ...rec };
    await persistDashboardJob(rec);
  } catch (e) {
    statusCache = { at: 0, data: null };
    rec.status = 'failed';
    rec.ok = false;
    rec.ms = Date.now() - t0;
    rec.endedAt = new Date().toISOString();
    rec.error = String(e.message || e).slice(0, 500);
    pushEvent('job', `${toolId} failed: ${rec.error.slice(0, 80)}`, { jobId });
    rec.stdout = (e.stdout || '').toString().slice(0, 2000);
    rec.stderr = (e.stderr || '').toString().slice(0, 1500);
    jobState.last = { ...rec };
    await persistDashboardJob(rec);
  } finally {
    if (jobState.running === toolId) jobState.running = null;
    if (spec?.mutate) {
      try {
        const lockPath = path.join(BUSY, 'mutate-job-lock.json');
        const cur = safeJson(lockPath);
        if (!cur || (rec.mutateLockToken && cur.token === rec.mutateLockToken)) {
          try {
            fs.unlinkSync(lockPath);
          } catch {
            /* */
          }
        }
      } catch {
        /* */
      }
    }
    // prune old jobs (keep newest 30)
    if (jobMap.size > 40) {
      const keys = [...jobMap.keys()];
      for (const k of keys.slice(0, keys.length - 30)) jobMap.delete(k);
    }
  }
}

async function persistDashboardJob(rec) {
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    writeJsonAtomic(path.join(BUSY, 'dashboard-job-last.json'), rec);
  } catch {
    /* optional latest-job receipt */
  }
  try {
    const { saveJob } = await import('./demigod-job-store.mjs');
    saveJob(rec);
  } catch {
    /* optional durable job store */
  }
}

/** Start job async — returns immediately with jobId */
function startJob(toolId, { allowMutate = false } = {}) {
  const spec = JOBS[toolId];
  if (!spec) return { ok: false, error: 'unknown job: ' + toolId, allowed: Object.keys(JOBS) };
  // Refuse before acquiring a mutate lease. The old order leaked a 10-minute
  // mutate lock whenever any safe job already occupied the single job slot.
  if (jobState.running) {
    return {
      ok: false,
      error: 'job already running: ' + jobState.running,
      running: jobState.running,
      retryAfterSec: 3,
    };
  }
  if (spec.mutate && !allowMutate) {
    return {
      ok: false,
      error: 'mutate job blocked — pass allowMutate=1 and ensure freeze OFF',
      mutate: true,
      freezeHint: 'node demigod-publish-freeze.mjs status',
    };
  }
  let mutateLockToken = null;
  if (spec.mutate) {
    const freeze = safeJson(path.join(BUSY, 'publish-freeze.json'));
    if (!spec.publishSafe && freeze?.on) {
      return {
        ok: false,
        error: 'mutate job blocked — publish-freeze is ON',
        mutate: true,
        freezeOn: true,
        freezeWhy: freeze.why || null,
      };
    }
    // Refuse when another writer holds the canonical foot-core lock. The child
    // publisher re-checks it, so block only on a valid, live, foreign lock.
    const footLock = spec.publishSafe ? null : safeJson(path.join(BUSY, 'foot-lock.json'));
    const flExpiryMs = footLock?.expiresAt ? Date.parse(footLock.expiresAt) : NaN;
    if (
      footLock &&
      Number.isFinite(flExpiryMs) &&
      flExpiryMs > Date.now() &&
      footLock.owner &&
      footLock.owner !== `dash:${toolId}`
    ) {
      return {
        ok: false,
        error: `mutate job blocked — foot-core lock held by ${footLock.owner}`,
        mutate: true,
        footLock: { owner: footLock.owner, pid: footLock.pid || null, expiresAt: footLock.expiresAt },
      };
    }
    // Cross-process mutate lock (survives concurrent agent CLIs)
    try {
      const lockPath = path.join(BUSY, 'mutate-job-lock.json');
      const cur = safeJson(lockPath);
      const curExpiryMs = cur?.expiresAt ? Date.parse(cur.expiresAt) : NaN;
      // Fail closed for corrupt/legacy leases. Silently overwriting a lock with
      // no usable expiry can permit two dashboard mutators to run concurrently.
      if (cur && (!Number.isFinite(curExpiryMs) || curExpiryMs > Date.now())) {
        return {
          ok: false,
          error: Number.isFinite(curExpiryMs)
            ? `mutate lock held by ${cur.owner || '?'} pid=${cur.pid || '?'}`
            : `mutate lock malformed — refusing overwrite (${cur.owner || '?'} pid=${cur.pid || '?'})`,
          lock: cur,
        };
      }
      fs.mkdirSync(BUSY, { recursive: true });
      mutateLockToken = crypto.randomUUID();
      // writeJsonAtomic (:77 in this file) instead of a bare writeFileSync. The mutate lock was the
      // one file here written non-atomically -- writeFileSync truncates then writes, so a concurrent
      // reader can land on the 0-byte window. Acquire reads it via safeJson, which returns null on any
      // parse error, and then tests `if (cur && ...)` -- so an empty read means "no lock held" and TWO
      // mutating jobs run at once. That is the opposite of the acquire path's stated policy ("Fail
      // closed for corrupt/legacy leases"), and it defeats the lock exactly when it is under load.
      // The helper was written for this race; its own comment describes it.
      writeJsonAtomic(lockPath, {
        owner: `dash:${toolId}`,
        pid: process.pid,
        at: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        token: mutateLockToken,
      });
    } catch (e) {
      return { ok: false, error: 'mutate lock failed: ' + String(e.message || e) };
    }
  }
  // Claim slot synchronously to prevent double-start race.
  const jobId = `j${Date.now().toString(36)}${(++jobSeq).toString(36)}`;
  jobState.running = toolId; // claim before setImmediate
  const rec = {
    jobId,
    id: toolId,
    status: 'queued',
    ok: null,
    safe: !!spec.safe,
    mutate: !!spec.mutate,
    mutateLockToken,
    at: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    ms: null,
  };
  jobMap.set(jobId, rec);
  // fire and forget
  setImmediate(() => executeJob(jobId, toolId));
  return {
    ok: true,
    jobId,
    id: toolId,
    status: 'queued',
    timeoutMs: spec.timeout,
    poll: `http://127.0.0.1:${PORT}/api/jobs/${jobId}`,
  };
}

/** Sync wait helper (legacy smoke?run=1) — prefer startJob */
async function runJob(id, opts = {}) {
  const started = startJob(id, opts);
  if (!started.ok || !started.jobId) return started;
  const deadline = Date.now() + (JOBS[id]?.timeout || 60000) + 5000;
  while (Date.now() < deadline) {
    const rec = jobMap.get(started.jobId);
    if (rec && (rec.status === 'done' || rec.status === 'failed')) return { ...rec, jobId: started.jobId };
    await new Promise((r) => setTimeout(r, 150));
  }
  return { ok: false, error: 'wait timeout', jobId: started.jobId, status: 'running' };
}

function readBody(req, max = 32_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > max) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

if (process.argv.includes('--snapshot')) {
  const data = await getStatus({ force: true });
  console.log(JSON.stringify({
    ok: true,
    statusJsonPath: data.statusJsonPath || STATUS_JSON,
    orientApi: data.orientApi || '/api/orient',
    demandDraftsHygiene: data.demandDraftsHygiene || null,
    demandDraftsHygieneReady: data.demandDraftsHygieneReady === true,
    orientDemandDraftsHygieneReady: data.orient?.demandDraftsHygieneReady === true,
    // Preserve the canonical /api/orient demand path in lightweight snapshots.
    // Agents can inspect demand.drafts.hygiene without translating the
    // root compatibility aliases used by older dashboard consumers.
    demand: {
      drafts: {
        hygiene: data.demandDraftsHygiene || null,
        hygieneVerdict: data.draftHygieneVerdict || null,
      },
    },
    demandDraftsHygieneStatusPath:
      data.demandDraftsHygieneStatusPath || data.demandStatusPath || null,
    demandStatusPath: data.demandStatusPath || null,
    // Make the persisted receipt directly addressable from the lightweight
    // snapshot. A consumer can now read one path + pointer pair and inspect
    // the same fail-closed hygiene verdict served by /api/orient.
    statusJsonPathDemandDraftsHygieneJsonPointer: '/draftHygieneVerdict',
    draftHygieneVerdict: data.draftHygieneVerdict || null,
    draftHygieneVerdictReady: data.draftHygieneVerdict?.ready === true,
    // Keep the exact persisted-status view in the CLI snapshot. Agents can
    // verify /api/orient plus both hygiene projections from one read,
    // instead of reconstructing that contract from discovery pointers.
    statusJsonPathView: data.statusJsonPathView || null,
    statusJsonPathViewComplete: data.statusJsonPathView?.complete === true,
  }, null, 2));
  process.exit(0);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  for (const [name, value] of Object.entries(privateDashboardSecurityHeaders())) res.setHeader(name, value);
  res.dgCorsOrigin = dashboardCorsOrigin(req.headers.origin || '', PORT);
  const noStore = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  try {
    if (!dashboardLocalHost(req.headers.host || '', PORT)) {
      jsonSend(res, 403, { ok: false, error: 'non_loopback_host_forbidden' });
      return;
    }
    if (dashboardMutationIntent(req.method, url.pathname, url.search) && !localMutationRequest(req)) {
      res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'cross_origin_mutation_forbidden' }));
      return;
    }
    /* ==== SECTION: HTTP API routes (agent-first JSON) ==== */
    if (url.pathname === '/companies' || url.pathname.startsWith('/companies/')) {
      const { handleCompanyTableRequest, loadPacketInputs } = await import('./demigod-company-table.mjs');
      handleCompanyTableRequest(req, res, { inputs: loadPacketInputs(), url });
      return;
    }
    /* truth · unify · ledger · evidence · status · next · orient · events · presence · graph
     * jobs · ship-checklist · roadmap · inbox · matches · doctor · orca · control · webflow
     * review · delta · handoff · brief · actions · cockpit · smoke · tools · job/start · UI */
    if (url.pathname === '/api/truth') {
      try {
        const { refuseIfStale, loadLatest } = await import('./demigod-evidence.mjs');
        const truthFresh = refuseIfStale('truth');
        const reviewFresh = refuseIfStale('review');
        const body = {
          truth: truthFresh,
          review: reviewFresh,
          green: Boolean(truthFresh.green),
          note: 'green only if truth evidence pass+fresh',
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/unify') {
      try {
        const { buildUnify } = await import('./demigod-unify.mjs');
        const pretty = url.searchParams.get('pretty') === '1';
        const u = await buildUnify();
        // System → Hot tools is rendered from this payload (not /api/tools),
        // so apply the same server-owned executable allowlist here too.
        const toolsHot = Array.isArray(u?.toolsHot)
          ? annotateRunnableTools({ tools: u.toolsHot }).tools
          : [];
        jsonSend(res, 200, { ...u, toolsHot }, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/craft') {
      try {
        const craft = await import('./demigod-craft-log.mjs');
        const mint = url.searchParams.get('mint');
        if (req.method === 'POST' || mint) {
          if (!localMutationRequest(req)) {
            jsonSend(res, 403, { ok: false, error: 'craft mint local-only' });
            return;
          }
          const kind = String(mint || url.searchParams.get('kind') || 'ship').toLowerCase();
          const note = url.searchParams.get('note') || null;
          let result;
          if (kind === 'ship' || kind === 'ship_live') result = craft.mintShip(note);
          else if (kind === 'event-ran' || kind === 'event_ran') result = craft.mintEventRan(note);
          else if (kind === 'intro' || kind === 'mutual_intro') {
            result = craft.mintIntro(url.searchParams.get('id') || url.searchParams.get('receipt') || '', note);
          } else {
            jsonSend(res, 400, { ok: false, error: 'unknown_mint_kind', kind });
            return;
          }
          jsonSend(res, result.ok ? 200 : 409, {
            at: new Date().toISOString(),
            schema: 'demigod.craft-api/1',
            mint: kind,
            ...result,
            status: craft.status(),
          });
          return;
        }
        const st = craft.status();
        const entries = craft.loadEntries().slice(-40).reverse();
        jsonSend(res, 200, {
          at: new Date().toISOString(),
          schema: 'demigod.craft-api/1',
          ...st,
          entries,
          cmds: {
            status: 'bin/dg craft status',
            mintShip: 'bin/dg craft mint ship',
            list: 'bin/dg craft list',
            api: '/api/craft',
          },
        });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/status') {
      const force = url.searchParams.get('force') === '1';
      const pretty = url.searchParams.get('pretty') === '1';
      const slim = url.searchParams.get('slim') === '1';
      const ui = url.searchParams.get('ui') === '1';
      refreshOrcaReceiptIfStale();
      const data = await getStatus({ force });
      const payload = ui ? dashboardStatus(data) : slim ? slimStatus(data) : data;
      jsonSend(res, 200, payload, { pretty });
      return;
    }
    if (url.pathname === '/api/next') {
      const pretty = url.searchParams.get('pretty') === '1';
      const data = await getStatus({});
      jsonSend(
        res,
        200,
        { at: data.at, next: data.next, glance: data.glance, sessionStory: data.sessionStory },
        { pretty },
      );
      return;
    }
    if (url.pathname === '/api/orient') {
      const pretty = url.searchParams.get('pretty') === '1';
      const noRefresh = url.searchParams.get('refresh') === '0';
      const args = ['demigod-orient.mjs', '--json'];
      if (noRefresh) args.push('--no-refresh');
      const r = spawnSync(process.execPath, args, {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
        env: process.env,
      });
      let body = null;
      try {
        body = JSON.parse((r.stdout || '').trim().split('\n').filter(Boolean).pop() || '{}');
      } catch {
        body = { ok: false, exit: r.status ?? 1, raw: (r.stdout || r.stderr || '').slice(0, 2000) };
      }
      if (r.error || !body || Object.keys(body).length === 0) {
        const orientPath = path.join(BUSY, 'orient.json');
        body = safeJson(orientPath) || body || {};
        body.cached = true;
        body.degraded = true;
        body.refreshError = r.error?.code || r.error?.message || null;
        // Receipt time is the evidence clock. File mtime can be refreshed by a
        // copy/restore and must not make a stale orientation card look recent.
        const cachedAtMs = Date.parse(body?.at || '');
        const cachedRawAgeMs = Date.now() - cachedAtMs;
        body.cacheAgeMs =
          Number.isFinite(cachedAtMs) && cachedRawAgeMs >= -60_000
            ? Math.max(0, cachedRawAgeMs)
            : null;
      }
      const demand = demandStatusSnapshot(safeJson(path.join(BUSY, 'demand-status.json')));
      // Rebind the canonical nested demand path to the same normalized
      // snapshot used by the aliases below. The orient subprocess (or cached
      // fallback) can carry an older demand receipt, which previously let
      // `/api/orient` expose fresh `demandDraftsHygiene` beside stale
      // `demand.drafts.hygiene` in one response.
      body.demand = {
        ...(body.demand && typeof body.demand === 'object' ? body.demand : {}),
        ...(demand && typeof demand === 'object' ? demand : {}),
        drafts: demand?.drafts || null,
      };
      body.drafts = demand?.drafts || null;
      body.demandDrafts = demand?.drafts || null;
      body.demandDraftsHygiene = demand?.drafts?.hygiene || null;
      body.demandDraftsHygieneVisible = body.demandDraftsHygiene != null;
      body.demandDraftsHygieneOk = body.demandDraftsHygiene?.ok ?? null;
      body.demandDraftsHygieneSource = demand?.drafts?.hygiene?.source || 'unknown';
      // Use the hygiene check's own evidence clock. The surrounding demand
      // snapshot may be refreshed without re-reading drafts, so demand.at can
      // otherwise make stale draft evidence appear current on /api/orient.
      body.demandDraftsHygieneAt = body.demandDraftsHygiene?.at || null;
      const demandDraftsHygieneAtMs = Date.parse(body.demandDraftsHygieneAt || '');
      const demandDraftsHygieneRawAgeSec = (Date.now() - demandDraftsHygieneAtMs) / 1000;
      body.demandDraftsHygieneClockSkewed =
        Number.isFinite(demandDraftsHygieneAtMs) && demandDraftsHygieneRawAgeSec < -60;
      body.demandDraftsHygieneAgeSec =
        Number.isFinite(demandDraftsHygieneAtMs) && !body.demandDraftsHygieneClockSkewed
          ? Math.max(0, Math.round(demandDraftsHygieneRawAgeSec))
          : null;
      body.demandDraftsHygieneStale =
        body.demandDraftsHygieneClockSkewed ||
        body.demandDraftsHygieneAgeSec == null ||
        body.demandDraftsHygieneAgeSec > 900;
      body.demandStatusPath = demand?.statusPath || path.join(BUSY, 'demand-status.json');
      body.demandDraftsHygieneStatusPath =
        body.demandDraftsHygiene?.statusPath || body.demandStatusPath;
      // Build this from the response-local demand snapshot. `data` belongs to
      // getStatus/enrichStatus and is not in scope in this route; consulting it
      // here made /api/orient throw after the subprocess had succeeded.
      body.draftHygieneVerdict = {
        schema: 'demigod.draft-hygiene-verdict/1',
        ready:
          body.demandDraftsHygieneOk === true &&
          body.demandDraftsHygieneStale === false,
        reason: body.demandDraftsHygiene == null
          ? 'missing'
          : body.demandDraftsHygieneClockSkewed
            ? 'clock-skewed'
            : body.demandDraftsHygieneStale
              ? 'stale'
              : body.demandDraftsHygieneOk === false
                ? 'flagged'
                : body.demandDraftsHygieneOk === true
                  ? 'clean'
                  : 'unknown',
        ok: body.demandDraftsHygieneOk,
        stale: body.demandDraftsHygieneStale,
        clockSkewed: body.demandDraftsHygieneClockSkewed,
        source: body.demandDraftsHygieneSource,
        at: body.demandDraftsHygieneAt,
        ageSec: body.demandDraftsHygieneAgeSec,
        statusPath: body.demandDraftsHygieneStatusPath,
        checked: body.demandDraftsHygiene?.checked ?? null,
        clean: body.demandDraftsHygiene?.clean ?? null,
        flagged: body.demandDraftsHygiene?.flagged ?? null,
      };
      body.statusJsonPath = STATUS_JSON;
      body.statusJsonPathVisible = true;
      body.orientApi = '/api/orient';
      body.orientUrl = `http://127.0.0.1:${PORT}/api/orient`;
      // Match the compact view persisted in dashboard-status.json so callers
      // entering through /api/orient can discover the durable receipt and
      // inspect demand.drafts.hygiene without translating contracts.
      body.statusJsonPathView = {
        schema: 'demigod.dashboard-status-path-view/1',
        path: STATUS_JSON,
        statusJsonPath: STATUS_JSON,
        orientApi: '/api/orient',
        orientUrl: body.orientUrl,
        // Mirror the persisted locator so HTTP and file readers share one contract.
        orientEndpoint: {
          method: 'GET',
          path: '/api/orient',
          statusJsonPath: STATUS_JSON,
          demandDraftsHygieneJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
          demandDraftsHygieneVerdictJsonPointer:
            '/statusJsonPathView/demand/drafts/hygieneVerdict',
          demandDraftsHygieneSourceReceiptJsonPointer:
            '/statusJsonPathView/demand/drafts/sourceReceipt',
        },
        orientApiVisible: true,
        demand: {
          drafts: {
            hygiene: body.demandDraftsHygiene,
            // Match dashboard-status.json: raw evidence is not readiness when
            // the receipt is stale, clock-skewed, or explicitly flagged.
            hygieneVerdict: body.draftHygieneVerdict,
            sourceReceipt: body.demandDraftsHygiene?.sourceReceipt || null,
          },
        },
        orient: {
          api: '/api/orient',
          statusJsonPath: STATUS_JSON,
          drafts: {
            hygiene: body.demandDraftsHygiene,
            hygieneVerdict: body.draftHygieneVerdict,
            sourceReceipt: body.demandDraftsHygiene?.sourceReceipt || null,
          },
          demand: {
            drafts: {
              hygiene: body.demandDraftsHygiene,
              hygieneVerdict: body.draftHygieneVerdict,
              sourceReceipt: body.demandDraftsHygiene?.sourceReceipt || null,
            },
          },
        },
        demandDraftsHygieneJsonPointer: '/statusJsonPathView/demand/drafts/hygiene',
        demandDraftsHygieneVerdictJsonPointer:
          '/statusJsonPathView/demand/drafts/hygieneVerdict',
        demandDraftsHygieneReady: body.draftHygieneVerdict?.ready === true,
        orientDraftsHygieneJsonPointer:
          '/statusJsonPathView/orient/drafts/hygiene',
        orientDemandDraftsHygieneJsonPointer:
          '/statusJsonPathView/orient/demand/drafts/hygiene',
        demandDraftsHygieneSource: body.demandDraftsHygieneSource,
        demandDraftsHygieneStatusPath: body.demandDraftsHygieneStatusPath,
        complete:
          body.statusJsonPath === STATUS_JSON &&
          body.orientApi === '/api/orient' &&
          body.demandDraftsHygiene != null &&
          body.draftHygieneVerdict?.ready === true,
      };
      body.cli = 'bin/dg orient --json';
      body.httpAt = new Date().toISOString();
      // CLI exits 1 for a valid soft card and 2 for a valid NEXT mismatch.
      // Those are orientation states, not HTTP/server failures; clients must
      // inspect green/assertSame/exit without treating the endpoint as down.
      const orientAtMs = Date.parse(body?.at || '');
      const orientAgeMs = Date.now() - orientAtMs;
      const validOrientCard =
        body?.schema === 'demigod.orient/1' &&
        Number.isFinite(orientAtMs) &&
        orientAgeMs >= -60_000 &&
        (!body.cached || orientAgeMs <= 15 * 60_000);
      // Cached is provenance, not validity. An absent or malformed orient
      // receipt must not become a false-green because fallback stamped it.
      jsonSend(res, validOrientCard ? 200 : 503, body, { pretty });
      return;
    }
    if (url.pathname === '/api/events') {
      // SSE stream when Accept: text/event-stream or ?sse=1
      const wantSse =
        url.searchParams.get('sse') === '1' ||
        String(req.headers.accept || '').includes('text/event-stream');
      if (wantSse) {
        res.writeHead(200, {
          ...noStore,
          'Content-Type': 'text/event-stream; charset=utf-8',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.write(`event: hello\ndata: ${JSON.stringify({ at: new Date().toISOString(), n: eventRing.length })}\n\n`);
        res.write(`event: snapshot\ndata: ${JSON.stringify({ events: eventRing.slice(0, 20) })}\n\n`);
        let lastId = eventRing[0]?.id || null;
        let lastPulse = statusCache.data?.pulseKey || null;
        let lastJob = jobState.running || null;
        // Compare the complete freeze payload. The reason/evidence can change
        // while the on/off bit stays the same, and the dashboard should not
        // show that stale context until the next reconciliation poll.
        let lastFreezeKey = JSON.stringify(statusCache.data?.freeze || null);
        let lastHealthKey = JSON.stringify({
          dashboardRuntime: statusCache.data?.dashboardRuntime || null,
          truthEvidence: statusCache.data?.truthEvidence || null,
          live: statusCache.data?.live || null,
        });
        const tick = setInterval(async () => {
          try {
            if (res.writableEnded) {
              clearInterval(tick);
              return;
            }
            const head = eventRing[0];
            if (head && head.id !== lastId) {
              const batch = [];
              for (const e of eventRing) {
                if (e.id === lastId) break;
                batch.push(e);
              }
              lastId = head.id;
              for (const e of batch.reverse()) {
                res.write(`event: event\ndata: ${JSON.stringify(e)}\n\n`);
              }
            }
            // Lightweight status delta (no force collect — cache only)
            const d = statusCache.data;
            if (d) {
              const delta = {};
              if (d.pulseKey !== lastPulse) {
                delta.pulseKey = d.pulseKey;
                // Send the complete canonical contract. A partial NEXT payload
                // can otherwise inherit stale mutate/freeze metadata client-side
                // when the selected task changes between reconciliation polls.
                delta.next = d.next ? nextContract(d) : null;
                lastPulse = d.pulseKey;
              }
              const freezeKey = JSON.stringify(d.freeze || null);
              if (freezeKey !== lastFreezeKey) {
                delta.freeze = d.freeze;
                lastFreezeKey = freezeKey;
              }
              const jr = jobState.running || null;
              if (jr !== lastJob) {
                delta.jobRunning = jr;
                lastJob = jr;
              }
              const health = {
                dashboardRuntime: d.dashboardRuntime || null,
                truthEvidence: d.truthEvidence || null,
                live: d.live || null,
              };
              const healthKey = JSON.stringify(health);
              if (healthKey !== lastHealthKey) {
                delta.health = health;
                lastHealthKey = healthKey;
              }
              if (Object.keys(delta).length) {
                delta.at = new Date().toISOString();
                res.write(`event: delta\ndata: ${JSON.stringify(delta)}\n\n`);
              } else {
                res.write(`: ping ${Date.now()}\n\n`);
              }
            } else {
              res.write(`: ping ${Date.now()}\n\n`);
            }
          } catch {
            clearInterval(tick);
          }
        }, 2000);
        req.on('close', () => clearInterval(tick));
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ at: new Date().toISOString(), events: eventRing.slice(0, 40) }));
      return;
    }
    if (url.pathname === '/api/ship-checklist') {
      try {
        const { buildShipChecklist } = await import('./demigod-ship-checklist.mjs');
        const c = buildShipChecklist();
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(c, null, 2));
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/inbox') {
      const force = url.searchParams.get('refresh') === '1';
      if (force) {
        try {
          run('node demigod-submissions-inbox.mjs --json', 15000);
        } catch {
          /* */
        }
        statusCache = { at: 0, data: null };
      }
      const data = await getStatus({});
      const format = url.searchParams.get('format') || 'json';
      if (format === 'md') {
        const ib = data.inbox || {};
        const lines = [
          `# Submissions inbox`,
          `at: ${ib.at || data.at}`,
          `awaiting review (operational): ${ib.pendingOperationalReviewCount ?? 0} · tests: ${ib.testCount ?? 0} · total: ${ib.total ?? 0}`,
          '',
        ];
        for (const r of ib.rows || []) {
          lines.push(`- ${r.id} · ${r.kind} · ${r.status} · ${r.email || '—'} · ${r.headline || ''}`);
        }
        lines.push('', 'draft: node demigod-intro-draft.mjs <id>', 'refresh: curl -sS "http://127.0.0.1:9878/api/inbox?refresh=1"');
        res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(lines.join('\n') + '\n');
      } else {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data.inbox || {}, null, 2));
      }
      return;
    }
    if (url.pathname === '/api/events/submission-review' && req.method === 'POST') {
      try {
        const body = JSON.parse((await readBody(req)) || '{}');
        const secret = eventsOpsSecret();
        if (!secret) return jsonSend(res, 503, { ok: false, error: 'Events ops secret unavailable' });
        const response = await fetch('http://127.0.0.1:3460/api/events-bot/submission-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-dg-events-ops': secret },
          body: JSON.stringify({ kind: body.kind, id: body.id, decision: body.decision, note: body.note }),
        });
        const result = await response.json();
        if (response.ok) statusCache = { at: 0, data: null };
        jsonSend(res, response.status, result);
      } catch (error) {
        jsonSend(res, 502, { ok: false, error: String(error.message || error) });
      }
      return;
    }
    if (url.pathname === '/api/matches') {
      // POST review: { pairId, decision, note? }
      if (req.method === 'POST') {
        // Local-origin soft-guard (same pattern as mutate jobs) — curl has no Origin
        const origin = String(req.headers.origin || '');
        // Origin is authoritative when present; never let a local-looking
        // Referer override an explicitly non-local Origin.
        const local = localMutationRequest(req);
        if (!local) {
          res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'forbidden from origin ' + origin }));
          return;
        }
        try {
          const body = JSON.parse((await readBody(req)) || '{}');
          const pairId = body.pairId || body.id;
          const action = String(body.action || (body.decision ? 'review' : body.side ? 'consent' : 'review')).toLowerCase();
          const actor = body.actor || process.env.USER || 'dashboard';
          const { reviewPair, consentPair, getPair } = await import('./demigod-pairs-lib.mjs');

          if (action === 'intro' || action === 'intro-draft' || action === 'draft') {
            if (!pairId) throw new Error('pairId required');
            if (!/^[a-f0-9]{8,32}$/i.test(String(pairId))) throw new Error('pairId_invalid');
            const pair = getPair(pairId);
            if (!pair) throw new Error('pair_not_found');
            // Never accept force from HTTP body — gate stays honest
            let draft = null;
            try {
              const out = execFileSync(process.execPath, ['demigod-intro-draft.mjs', String(pairId), '--json'], {
                cwd: ROOT,
                encoding: 'utf8',
                timeout: 15000,
                stdio: ['ignore', 'pipe', 'pipe'],
                maxBuffer: 1 * 1024 * 1024,
              });
              draft = JSON.parse(out);
            } catch (e) {
              const raw = String(e.stderr || e.stdout || e.message || '');
              try {
                draft = JSON.parse(raw);
              } catch {
                draft = { ok: false, error: raw.slice(0, 400) };
              }
            }
            statusCache = { at: 0, data: null };
            pushEvent('intro-draft', `${pairId} draft ${draft?.ok ? 'ok' : 'fail'}`, { pairId });
            res.writeHead(draft?.ok ? 200 : 400, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: !!draft?.ok, pair, draft }, null, 2));
            return;
          }

          if (action === 'consent') {
            const side = body.side;
            const pair = consentPair(pairId, {
              side,
              actor,
              attested: body.attested === true,
              evidence: body.evidence,
            });
            statusCache = { at: 0, data: null };
            pushEvent('match-consent', `${pairId} ${side} → ${pair.state}`, { pairId, side, state: pair.state });
            res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, pair }, null, 2));
            return;
          }

          // default: review
          const decision = body.decision;
          const note = body.note || '';
          const pair = reviewPair(pairId, {
            decision,
            note,
            reviewed: body.reviewed === true,
            actor: 'human:dashboard',
          });
          try {
            run('node demigod-match-review.mjs --json', 12000);
          } catch {
            /* */
          }
          statusCache = { at: 0, data: null };
          pushEvent('match-review', `${pairId} → ${pair.state}`, { pairId, state: pair.state });
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, pair }, null, 2));
        } catch (e) {
          res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
        }
        return;
      }
      const force = url.searchParams.get('refresh') === '1';
      const stateFilter = url.searchParams.get('state') || null;
      if (force) {
        try {
          const args = ['demigod-match-review.mjs', '--json'];
          if (stateFilter) args.push('--state', stateFilter);
          const r = spawnSync(process.execPath, args, {
            cwd: ROOT,
            encoding: 'utf8',
            timeout: 15000,
            env: process.env,
            maxBuffer: 4 * 1024 * 1024,
          });
          if (r.error) throw r.error;
          if (r.status !== 0) throw new Error((r.stderr || r.stdout || `match review exited ${r.status}`).trim());
        } catch {
          /* */
        }
        statusCache = { at: 0, data: null };
      }
      try {
        const { buildQueue } = await import('./demigod-match-review.mjs');
        const includeSample = url.searchParams.get('includeSample') === '1';
        const q = buildQueue({ state: stateFilter, includeSample });
        try {
          const { buildStatus } = await import('./demigod-structured-hiring.mjs');
          q.structuredHiringStatus = buildStatus();
        } catch {
          /* optional */
        }
        fs.mkdirSync(BUSY, { recursive: true });
        writeJsonAtomic(path.join(BUSY, 'match-review-latest.json'), q);
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(q, null, 2));
      } catch (e) {
        const data = await getStatus({});
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data.matches || { error: String(e.message || e) }, null, 2));
      }
      return;
    }
    if (url.pathname === '/api/orca') {
      try {
        const receiptPath = path.join(BUSY, 'orca-status.json');
        const snapshot = safeJson(receiptPath);
        const refreshing = refreshOrcaReceiptIfStale(snapshot);
        let keepAwake = false;
        try {
          const pid = Number(fs.readFileSync(path.join(ROOT, '.keep-awake.pid'), 'utf8').trim());
          if (!Number.isInteger(pid) || pid <= 0) throw new Error('invalid keep-awake pid');
          process.kill(pid, 0);
          keepAwake = true;
        } catch {
          keepAwake = false;
        }
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify(
            {
              ...(snapshot || { at: new Date().toISOString(), reachable: false, status: 'missing' }),
              refreshing,
              keepAwake,
              cmds: {
                up: 'bin/dg-orca up',
                pair: 'bin/dg-orca pair',
                status: 'bin/dg-orca status',
              },
            },
            null,
            2,
          ),
        );
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }

    if (url.pathname === '/api/priority') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const data = await getStatus({});
        const board = data.priorityBoard || (await import('./demigod-priority-board.mjs')).buildPriorityBoard(data);
        jsonSend(res, 200, board, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/startup-atlas') {
      const file = path.join(ROOT, STARTUP_ATLAS_FILE);
      let input;
      try {
        const stat = fs.statSync(file);
        if (!stat.isFile() || stat.size > 10_000_000) throw new Error('atlas file must be a regular file under 10 MB');
        input = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        if (error?.code === 'ENOENT') {
          jsonSend(res, 404, {
            schema: STARTUP_ATLAS_SCHEMA,
            status: 'not_generated',
            generated: false,
            message: 'The SF startup atlas has not been generated yet.',
          });
        } else {
          jsonSend(res, 422, {
            schema: STARTUP_ATLAS_SCHEMA,
            status: 'invalid',
            generated: false,
            message: 'The SF startup atlas file could not be read as valid JSON.',
          });
        }
        return;
      }
      try {
        jsonSend(res, 200, startupAtlasView(input));
      } catch (error) {
        jsonSend(res, 422, {
          schema: STARTUP_ATLAS_SCHEMA,
          status: 'invalid',
          generated: false,
          message: String(error?.message || 'The SF startup atlas failed validation').slice(0, 240),
        });
      }
      return;
    }
    if (url.pathname === '/api/maps') {
      try {
        const maps = [
          {
            id: 'agents',
            title: 'Orca agent coordination',
            path: 'docs/DEMIGOD-MULTI-AGENT-COORD-DIAGRAM.md',
            purpose: 'Current Claude ↔ Codex transport and dashboard projection',
          },
          {
            id: 'workflow',
            title: 'Total workflow & processes',
            path: 'docs/DEMIGOD-TOTAL-WORKFLOW-DIAGRAM.md',
            purpose: 'End-to-end ops + ship + demand + agents',
          },
          {
            id: 'website',
            title: 'Website architecture',
            path: 'docs/DEMIGOD-WEBSITE-ARCHITECTURE-DIAGRAM.md',
            purpose: 'Browser load, WIZ, board, CDN',
          },
          {
            id: 'resources',
            title: 'Resources & workflows map',
            path: 'docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md',
            purpose: 'Control plane modules, CLI, tools catalog',
          },
        ].map((m) => {
          const abs = path.join(ROOT, m.path);
          let bytes = 0;
          let mtime = null;
          try {
            const st = fs.statSync(abs);
            bytes = st.size;
            mtime = st.mtime.toISOString();
          } catch {
            /* missing */
          }
          return { ...m, bytes, mtime, url: `/api/maps/${m.id}`, ok: bytes > 0 };
        });
        jsonSend(res, 200, { schema: 'demigod.maps-index/1', at: new Date().toISOString(), maps });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    {
      const mapMatch = url.pathname.match(/^\/api\/maps\/([a-z0-9-]+)$/i);
      if (mapMatch) {
        const id = mapMatch[1];
        const table = {
          agents: 'docs/DEMIGOD-MULTI-AGENT-COORD-DIAGRAM.md',
          workflow: 'docs/DEMIGOD-TOTAL-WORKFLOW-DIAGRAM.md',
          website: 'docs/DEMIGOD-WEBSITE-ARCHITECTURE-DIAGRAM.md',
          resources: 'docs/DEMIGOD-RESOURCES-AND-WORKFLOWS-MAP.md',
        };
        const rel = table[id];
        if (!rel) {
          jsonSend(res, 404, { error: 'unknown map', id, allowed: Object.keys(table) });
          return;
        }
        try {
          const abs = path.join(ROOT, rel);
          const md = fs.readFileSync(abs, 'utf8');
          if (url.searchParams.get('format') === 'json') {
            jsonSend(res, 200, { id, path: rel, bytes: md.length, markdown: md });
          } else {
            res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
            res.end(md);
          }
        } catch (e) {
          jsonSend(res, 404, { error: String(e.message || e), id });
        }
        return;
      }
    }
    if (url.pathname === '/api/dogfood') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const { spawnSync } = await import('child_process');
        const r = spawnSync(process.execPath, ['demigod-tool-dogfood.mjs', 'status', '--json'], {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 15000,
        });
        let body = {};
        try {
          body = JSON.parse(r.stdout || '{}');
        } catch {
          body = { ok: false, raw: (r.stdout || r.stderr || '').slice(0, 500) };
        }
        jsonSend(res, r.status === 0 ? 200 : 500, body, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }

    if (url.pathname === '/api/coord') {
      const workLog = compactWorkStatus();
      jsonSend(
        res,
        200,
        {
          ok: true,
          schema: 'demigod.coord-compat/1',
          at: new Date().toISOString(),
          workLog,
          orca: safeJson(path.join(BUSY, 'orca-status.json')),
        },
        { pretty: url.searchParams.get('pretty') === '1' },
      );
      return;
    }

    if (url.pathname === '/api/ponytail') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('run') === '1';
        let rec = safeJson(path.join(BUSY, 'ponytail-status.json'));
        const ageMs = rec?.at ? Date.now() - Date.parse(rec.at) : Infinity;
        if (force || !rec || !Number.isFinite(ageMs) || ageMs > 120000) {
          const { gatherStatus } = await import('./demigod-ponytail.mjs');
          rec = gatherStatus();
        }
        jsonSend(res, 200, rec, { pretty });
      } catch (e) {
        jsonSend(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/control') {
      try {
        const force = url.searchParams.get('force') === '1' || url.searchParams.get('refresh') === '1';
        const pretty = url.searchParams.get('pretty') === '1';
        const now = Date.now();
        if (!force && controlCache.data && now - controlCache.at < CONTROL_TTL_MS) {
          jsonSend(res, 200, { ...controlCache.data, cached: true, cacheAgeMs: now - controlCache.at }, { pretty });
          return;
        }
        // Prefer control slice from fresh status (avoids double build when status just ran)
        const st = await getStatus({ force: false });
        if (st.control && !force) {
          jsonSend(res, 200, { ...st.control, fromStatus: true }, { pretty });
          return;
        }
        const { buildControlPlane } = await import('./demigod-control.mjs');
        const plane = await buildControlPlane();
        controlCache = { at: Date.now(), data: plane };
        jsonSend(res, 200, plane, { pretty });
      } catch (e) {
        const cached = safeJson(path.join(BUSY, 'control-plane.json'));
        const error = String(e.message || e);
        if (cached) {
          let cacheAgeMs = null;
          try {
            cacheAgeMs = Math.max(0, Date.now() - fs.statSync(path.join(BUSY, 'control-plane.json')).mtimeMs);
          } catch {
            /* cache disappeared between read and stat */
          }
          jsonSend(
            res,
            200,
            { ...cached, cached: true, degraded: true, refreshError: error, cacheAgeMs },
            { pretty },
          );
        } else {
          jsonSend(res, 500, { error });
        }
      }
      return;
    }
    if (url.pathname === '/api/control-board') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const wantHist = url.searchParams.get('history') === '1';
        if (wantHist) {
          const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') || 12) || 12));
          const histPath = path.join(BUSY, 'control-board-history.jsonl');
          let rows = [];
          if (fs.existsSync(histPath)) {
            rows = fs
              .readFileSync(histPath, 'utf8')
              .split('\n')
              .filter(Boolean)
              .slice(-n)
              .map((line) => {
                try {
                  return JSON.parse(line);
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
              .reverse();
          }
          jsonSend(
            res,
            200,
            { schema: 'demigod.control-board-history/1', at: new Date().toISOString(), n: rows.length, rows },
            { pretty },
          );
          return;
        }
        const { evaluateControls, writeBoard } = await import('./demigod-control-board.mjs');
        const board = evaluateControls({
          strictResearch: url.searchParams.get('strict') === '1',
        });
        writeBoard(board);
        jsonSend(res, board.ok ? 200 : 200, board, { pretty });
      } catch (e) {
        jsonSend(res, 500, { ok: false, error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/structured-hiring') {
      try {
        const pretty = url.searchParams.get('pretty') === '1';
        const role = url.searchParams.get('role');
        const { buildStatus, buildDesk } = await import('./demigod-structured-hiring.mjs');
        if (role) {
          jsonSend(res, 200, buildDesk(role), { pretty });
        } else {
          const st = buildStatus();
          atomicWrite(path.join(BUSY, 'structured-hiring-status.json'), JSON.stringify(st, null, 2) + '\n', {
            mode: 0o600,
          });
          jsonSend(res, 200, st, { pretty });
        }
      } catch (e) {
        jsonSend(res, 500, { ok: false, error: String(e.message || e) });
      }
      return;
    }
    if (url.pathname === '/api/webflow') {
      try {
        const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('run') === '1';
        if (force) {
          run('node demigod-webflow.mjs doctor --json', 25000);
        }
        let wf = safeJson(path.join(BUSY, 'webflow-status.json'));
        if (!wf) {
          run('node demigod-webflow.mjs status --json', 25000);
          wf = safeJson(path.join(BUSY, 'webflow-status.json'));
        }
        const doctor = safeJson(path.join(BUSY, 'webflow-doctor.json'));
        const statusAgeMs = wf?.at ? Date.now() - Date.parse(wf.at) : Infinity;
        const doctorAgeMs = doctor?.at ? Date.now() - Date.parse(doctor.at) : Infinity;
        res.writeHead(wf ? 200 : 503, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(wf ? { ...wf, ageMs: statusAgeMs, clockSkewed: Number.isFinite(statusAgeMs) && statusAgeMs < -60000, fresh: Number.isFinite(statusAgeMs) && statusAgeMs >= -60000 && statusAgeMs <= 120000, doctor: doctor ? { ...doctor, ageMs: doctorAgeMs, clockSkewed: Number.isFinite(doctorAgeMs) && doctorAgeMs < -60000, fresh: Number.isFinite(doctorAgeMs) && doctorAgeMs >= -60000 && doctorAgeMs <= 120000 } : null, actions: ['webflow-doctor', 'webflow-open-code', 'ship-prepare', 'webflow-paste-check'] } : { error: 'no webflow status' }, null, 2));
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/review') {
      const force = url.searchParams.get('refresh') === '1' || url.searchParams.get('run') === '1';
      if (force || req.method === 'POST') {
        try {
          const extra = [];
          if (url.searchParams.get('bug') === '1') extra.push('--bug');
          if (url.searchParams.get('gates') === '1') extra.push('--gates');
          run(`node demigod-review.mjs --json ${extra.join(' ')}`, 90000);
        } catch {
          /* report may still write */
        }
      }
      const rev = safeJson(path.join(BUSY, 'review-latest.json'));
      if (url.searchParams.get('format') === 'md') {
        const md = safeRead(path.join(BUSY, 'review-latest.md'), 80_000);
        res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(md || '# no review yet\n');
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          rev || {
            error: 'no review yet',
            hint: 'POST /api/review or curl -sS "http://127.0.0.1:9878/api/review?run=1"',
          },
          null,
          2,
        ),
      );
      return;
    }
    if (url.pathname === '/api/delta') {
      const data = await getStatus({});
      const since = url.searchParams.get('since') || null;
      res.writeHead(200, {
        ...noStore,
        'Content-Type': 'application/json; charset=utf-8',
        ...(res.dgCorsOrigin ? { 'Access-Control-Allow-Origin': res.dgCorsOrigin } : {}),
      });
      res.end(JSON.stringify(buildDelta(data, since), null, 2));
      return;
    }
    if (url.pathname === '/api/handoff') {
      if (req.method === 'GET') {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ at: new Date().toISOString(), notes: readHandoffs(30) }, null, 2));
        return;
      }
      if (req.method === 'POST') {
        // Local-origin soft-guard (same as matches / mutate jobs)
        const origin = String(req.headers.origin || '');
        const local = localMutationRequest(req);
        if (!local) {
          res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'forbidden from origin ' + origin }));
          return;
        }
        let body = {};
        try {
          const raw = await readBody(req);
          body = raw ? JSON.parse(raw) : {};
        } catch (e) {
          res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid JSON body: ' + String(e.message || e) }));
          return;
        }
        const text = body.text || body.note || body.message || '';
        const done = body.done ?? null;
        const next = body.next ?? null;
        const blocked = body.blocked ?? null;
        if (!String(text).trim() && done == null && next == null && blocked == null) {
          res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'text or done/next/blocked required' }));
          return;
        }
        const note = appendHandoff({
          from: body.from || 'human',
          text,
          meta: body.meta || null,
          done,
          next,
          blocked,
        });
        if (!note.written) {
          // The handoff file write failed -- report it, don't claim ok:true on a note that never
          // persisted (the operator/agent would think the handoff was recorded).
          res.writeHead(500, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: 'handoff write failed — not persisted', note }));
          return;
        }
        statusCache = { at: 0, data: null };
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, note, notes: readHandoffs(12) }));
        return;
      }
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('GET or POST');
      return;
    }
    if (url.pathname === '/api/agent-brief') {
      const data = await getStatus({ force: url.searchParams.get('force') === '1' });
      const format = url.searchParams.get('format') || 'md';
      const wantUnifyOnly = url.searchParams.get('unify') === '1' || url.searchParams.get('unifyOnly') === '1';
      if (wantUnifyOnly) {
        process.env.DEMIGOD_BRIEF_UNIFY_ONLY = '1';
      }
      const md = wantUnifyOnly ? buildAgentBrief(data) : data.agentBriefMarkdown || buildAgentBrief(data);
      if (wantUnifyOnly) delete process.env.DEMIGOD_BRIEF_UNIFY_ONLY;
      if (format === 'json') {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            at: data.at,
            next: data.next,
            glance: data.glance,
            sessionStory: data.sessionStory,
            actions: wantUnifyOnly ? [] : data.actions,
            staleGates: data.staleGates,
            unifyOnly: wantUnifyOnly,
            markdown: md,
          }),
        );
      } else {
        res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
        res.end(md);
      }
      return;
    }
    if (url.pathname === '/api/actions') {
      const data = await getStatus({});
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          { at: data.at, next: data.next, actions: data.actions, cockpitNext: data.cockpit?.next || null },
          null,
          2,
        ),
      );
      return;
    }
    if (url.pathname === '/api/cockpit') {
      try {
        // Prefer dashboard status cockpit (cached, single live probe)
        const data = await getStatus({});
        if (data.cockpit && !data.cockpit.error) {
          const format = url.searchParams.get('format') || 'json';
          if (format === 'md') {
            const { toMarkdown } = await import('./demigod-agent-cockpit.mjs');
            res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
            res.end(toMarkdown(data.cockpit));
          } else {
            res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data.cockpit, null, 2));
          }
          return;
        }
        const { buildCockpit, toMarkdown } = await import('./demigod-agent-cockpit.mjs');
        const c = await buildCockpit({ skipLive: false });
        const format = url.searchParams.get('format') || 'json';
        if (format === 'md') {
          res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
          res.end(toMarkdown(c));
        } else {
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(c, null, 2));
        }
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    if (url.pathname === '/api/smoke') {
      const last = safeJson(path.join(BUSY, 'agent-smoke.json'));
      if (url.searchParams.get('run') === '1') {
        // Prefer async unless wait=1
        if (url.searchParams.get('wait') === '1') {
          const job = await runJob('smoke');
          const fresh = safeJson(path.join(BUSY, 'agent-smoke.json'));
          res.writeHead(job.ok === false ? 409 : 200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ...(fresh || {}), job }, null, 2));
          return;
        }
        const started = startJob('smoke');
        res.writeHead(started.ok ? 202 : 409, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ...started, last }, null, 2));
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify(
          {
            last,
            refresh: `curl -sS 'http://127.0.0.1:${PORT}/api/smoke?run=1'`,
            cli: 'node demigod-agent-smoke.mjs',
          },
          null,
          2,
        ),
      );
      return;
    }
    if (url.pathname === '/api/tools') {
      try {
        const { buildRegistry, toMarkdown } = await import('./demigod-tools-registry.mjs');
        // Default agent-friendly: primary tools only. Full catalog: ?all=1.
        const allTools =
          url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true';
        const reg = annotateRunnableTools(buildRegistry({ hotOnly: !allTools }));
        const format = url.searchParams.get('format') || 'json';
        if (format === 'md') {
          res.writeHead(200, { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8' });
          res.end(toMarkdown(reg));
        } else {
          res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(reg));
        }
      } catch (e) {
        res.writeHead(500, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    // /api/jobs/:jobId poll
    const jobPoll = url.pathname.match(/^\/api\/jobs\/([A-Za-z0-9_-]+)$/);
    if (jobPoll) {
      const rec = jobMap.get(jobPoll[1]);
      if (!rec) {
        res.writeHead(404, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unknown jobId', jobId: jobPoll[1] }));
        return;
      }
      res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(rec, null, 2));
      return;
    }
    if (url.pathname === '/api/jobs') {
      const id = url.searchParams.get('run') || url.searchParams.get('id') || url.searchParams.get('type');
      const allowMutate = url.searchParams.get('allowMutate') === '1';
      const wait = url.searchParams.get('wait') === '1';
      if (req.method === 'GET' && !id) {
        res.writeHead(200, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify(
            {
              allowed: listJobsMeta(),
              running: jobState.running,
              last: jobState.last,
              how: {
                async: `curl -X POST 'http://127.0.0.1:${PORT}/api/jobs?run=smoke'  # returns jobId immediately`,
                poll: `curl -sS 'http://127.0.0.1:${PORT}/api/jobs/<jobId>'`,
                wait: `curl -sS -X POST 'http://127.0.0.1:${PORT}/api/jobs?run=smoke&wait=1'`,
              },
            },
            null,
            2,
          ),
        );
        return;
      }
      if (!id) {
        res.writeHead(400, { ...noStore, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'pass ?run=<id>', allowed: Object.keys(JOBS) }));
        return;
      }
      // Dispatch always changes process/job state. Keeping it POST-only closes
      // no-referrer cross-site GETs while preserving local CLI POSTs.
      if (req.method !== 'POST') {
        res.writeHead(405, { ...noStore, Allow: 'POST', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'job dispatch requires POST' }));
        return;
      }
      // Mutate jobs: require POST + local Origin (CSRF soft-guard for browser tabs).
      // Authorize before both sync (?wait=1) and async dispatch paths.
      if (JOBS[id]?.mutate) {
        const origin = req.headers.origin || '';
        const local = localMutationRequest(req);
        // curl has no Origin — allow; browser cross-origin blocked
        if (!local) {
          res.writeHead(403, { ...noStore, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mutate job forbidden from origin ' + origin }));
          return;
        }
      }
      if (wait) {
        const result = await runJob(id, { allowMutate });
        res.writeHead(result.ok === false && result.error ? 409 : 200, {
          ...noStore,
          'Content-Type': 'application/json; charset=utf-8',
        });
        res.end(JSON.stringify(result, null, 2));
        return;
      }
      // True async: return jobId immediately
      const started = startJob(id, { allowMutate });
      const code = started.ok ? 202 : 409;
      res.writeHead(code, { ...noStore, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(started, null, 2));
      return;
    }
    // Static design assets (local only)
    if (url.pathname.startsWith('/assets/')) {
      const rel = url.pathname.replace(/^\/assets\//, '').replace(/\.\./g, '');
      const file = path.join(ROOT, 'demigod-assets', rel);
      if (!file.startsWith(path.join(ROOT, 'demigod-assets'))) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      try {
        const buf = fs.readFileSync(file);
        const ext = path.extname(file).toLowerCase();
        const type =
          ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.png'
              ? 'image/png'
              : ext === '.webp'
                ? 'image/webp'
                : ext === '.svg'
                  ? 'image/svg+xml'
                  : 'application/octet-stream';
        res.writeHead(200, { ...noStore, 'Content-Type': type, 'Cache-Control': 'public, max-age=3600' });
        res.end(buf);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
      return;
    }
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/dashboard') {
      res.writeHead(200, { ...noStore, 'Content-Type': 'text/html; charset=utf-8' });
      res.end(loadHtml());
      return;
    }
    if (url.pathname === '/healthz' || url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          uptimeSec: Math.round(process.uptime()),
          cacheAgeMs: statusCache.data ? Date.now() - statusCache.at : null,
          statusTtlMs: STATUS_TTL_MS,
          controlTtlMs: CONTROL_TTL_MS,
          inflight: Boolean(statusInflight),
        }),
      );
      return;
    }
    if (url.pathname === '/api/health') {
      const data = await getStatus({});
      const health = productHealth(data);
      res.writeHead(health.ok ? 200 : 503, { ...noStore, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found — try /  /api/status  /api/agent-brief  /api/actions  /api/health');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
});

server.on('error', (error) => {
  // Keep daemon/startup failures machine-readable and avoid Node's noisy
  // unhandled "error" event crash (for example EADDRINUSE or sandbox EPERM).
  // `at` is not decoration here: this is the single most-repeated line in the whole system. When an
  // orphan held :9878, systemd (RestartSec=5) retried ~7h and wrote 5110 copies of this line --
  // 98.5% of dashboard.log -- and with no timestamp ANYWHERE in that file the storm could not be
  // dated at all; it had to be inferred from 5110*5s matching an unrelated note. Every other
  // receipt here carries `at` (19 in this file alone). Exit 98 + the unit's
  // RestartPreventExitStatus=98 stops the retry storm recurring; this makes the next one legible.
  console.error(JSON.stringify({
    at: new Date().toISOString(),
    ok: false,
    error: 'dashboard_listen_failed',
    code: error?.code || null,
    message: String(error?.message || error),
    host: '127.0.0.1',
    port: PORT,
  }));
  process.exitCode = error?.code === 'EADDRINUSE' ? 98 : 1;
});

server.listen(PORT, '127.0.0.1', () => {
  const refreshHostEvidence = () => {
    // Heartbeat file only — no HTTP self-fetch (avoids hot-path thrash)
    try {
      fs.writeFileSync(SERVER_HEARTBEAT, `${new Date().toISOString()}\n`);
    } catch {
      /* */
    }
  };
  refreshHostEvidence();
  setInterval(refreshHostEvidence, 60_000).unref();
  console.log(
    JSON.stringify(
      {
        ok: true,
        dashboard: `http://127.0.0.1:${PORT}/`,
        agentBrief: `http://127.0.0.1:${PORT}/api/agent-brief`,
        actions: `http://127.0.0.1:${PORT}/api/actions`,
        health: `http://127.0.0.1:${PORT}/api/health`,
        briefFile: BRIEF_MD,
        refreshSec: 45,
        statusTtlMs: STATUS_TTL_MS,
      },
      null,
      2,
    ),
  );
});
