#!/usr/bin/env node
/**
 * demigod-company-table — private local HTTP table of companies (Clay-useful slice 3).
 *
 * Read-only GET. Bind 127.0.0.1 only. No people/contact fields. No score.
 * Rows are identity + hiring summary + unknowns count + href to the packet.
 *
 *   node demigod-company-table.mjs --selftest
 *   node demigod-company-table.mjs serve --port=0
 *
 *   GET /companies?limit=N
 *   GET /companies/:id   → demigod.company-packet/1  (404 if unknown)
 *
 * Schema: demigod.company-table/1
 */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  PACKET_SCHEMA,
  buildCompanyPacket,
  loadPacketInputs,
} from './demigod-company-packet.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const TABLE_SCHEMA = 'demigod.company-table/1';
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 500;
export const BIND_HOST = '127.0.0.1';

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
});

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function assertLoopbackBind(host) {
  if (host !== BIND_HOST) {
    const err = new Error('company-table binds 127.0.0.1 only');
    err.code = 'non_loopback_bind_forbidden';
    throw err;
  }
  return host;
}

function loopbackHostHeader(host) {
  if (host == null || host === '') return true;
  const value = String(host).trim().toLowerCase();
  const hostname = value[0] === '['
    ? value.slice(1, value.indexOf(']'))
    : value.split(':')[0];
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

function sendJson(res, status, body) {
  const payload = `${JSON.stringify(body)}\n`;
  if (typeof res.writeHead === 'function') {
    res.writeHead(status, JSON_HEADERS);
  } else {
    res.statusCode = status;
  }
  res.end(payload);
}

function parseLimit(raw) {
  if (raw == null || raw === '') return { ok: true, limit: DEFAULT_LIMIT };
  if (!/^\d+$/.test(String(raw))) return { ok: false, error: 'invalid_limit' };
  const n = Number(raw);
  if (!Number.isSafeInteger(n)) return { ok: false, error: 'invalid_limit' };
  return { ok: true, limit: Math.min(n, MAX_LIMIT) };
}

function mapCompanies(map) {
  return Array.isArray(map?.companies) ? map.companies : [];
}

function companyIdsOrThrow(map) {
  const seen = new Set();
  const ids = [];
  for (const row of mapCompanies(map)) {
    if (!row || typeof row !== 'object') continue;
    if (typeof row.id !== 'string' || !row.id.trim()) continue;
    if (seen.has(row.id)) {
      const err = new Error(`duplicate company id: ${row.id}`);
      err.code = 'duplicate_company_id';
      throw err;
    }
    seen.add(row.id);
    ids.push(row.id);
  }
  return ids;
}

export function projectTableRow(packet) {
  const identity = packet?.identity || {};
  const hiring = packet?.hiring || {};
  const signals = packet?.signals || {};
  const companyId = packet?.companyId || identity.id || '';
  return {
    id: identity.id || companyId,
    name: typeof identity.name === 'string' ? identity.name : '',
    domain: identity.domain ?? null,
    website: identity.website ?? null,
    source: identity.source ?? null,
    hiring: {
      status: hiring.status ?? null,
      openRoles: hiring.openRoles ?? null,
      atsSource: hiring.atsSource ?? null,
      openRolesAt: hiring.openRolesAt ?? null,
    },
    openRoles: hiring.openRoles ?? null,
    ats: hiring.atsSource ?? null,
    lastSignal: packet?.asOf
      ? {
        at: packet.asOf.signalsAt ?? null,
        firstObservedToday: signals.firstObservedToday ?? 0,
        closedToday: signals.closedToday ?? 0,
        reopenedOpen: signals.reopenedOpen ?? 0,
      }
      : null,
    researchStatus: packet?.research?.status ?? null,
    unknownsCount: Array.isArray(packet?.unknowns) ? packet.unknowns.length : 0,
    peers: packet.peers || [],
    peerBasis: packet.peerBasis || null,
    href: `/companies/${encodeURIComponent(companyId)}`,
  };
}

/**
 * Pure. Rows from the map in map order. Duplicate map id throws (fail closed).
 */
export function listCompanyRows(inputs = {}, { limit = DEFAULT_LIMIT } = {}) {
  const ids = companyIdsOrThrow(inputs.map);
  const sliced = ids.slice(0, Math.max(0, limit));
  const rows = sliced.map((companyId) => {
    const packet = buildCompanyPacket({ companyId, ...inputs });
    if (packet.status === 'unknown') {
      const err = new Error(`map id vanished: ${companyId}`);
      err.code = 'map_id_vanished';
      throw err;
    }
    const row = projectTableRow(packet);
    if (inputs.signalsMissing || inputs.signals == null) row.lastSignal = null;
    return row;
  });
  return {
    schema: TABLE_SCHEMA,
    bind: BIND_HOST,
    asOf: {
      mapGeneratedAt: inputs.map?.generatedAt || null,
      ledgerUpdatedAt: inputs.ledger?.updatedAt || null,
      signalsAt: inputs.signals?.at || null,
    },
    limit: Math.max(0, limit),
    total: ids.length,
    rows,
  };
}

function companyIdFromPath(pathname) {
  if (pathname === '/companies' || pathname === '/companies/') return null;
  const match = pathname.match(/^\/companies\/([^/]+)$/);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

export function handleCompanyTableRequest(req, res, { inputs, url } = {}) {
  const method = String(req?.method || 'GET').toUpperCase();
  const parsed = url instanceof URL
    ? url
    : new URL(req?.url || '/', `http://${BIND_HOST}`);
  if (!loopbackHostHeader(req?.headers?.host)) {
    sendJson(res, 403, { ok: false, error: 'non_loopback_host_forbidden' });
    return true;
  }
  if (parsed.pathname !== '/companies' && !parsed.pathname.startsWith('/companies/')) {
    return false;
  }
  if (method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }
  const data = inputs || loadPacketInputs();
  const id = companyIdFromPath(parsed.pathname);
  if (id === undefined) {
    sendJson(res, 404, { ok: false, error: 'not_found' });
    return true;
  }
  try {
    if (id === null) {
      const parsedLimit = parseLimit(parsed.searchParams.get('limit'));
      if (!parsedLimit.ok) {
        sendJson(res, 400, { ok: false, error: parsedLimit.error });
        return true;
      }
      sendJson(res, 200, listCompanyRows(data, { limit: parsedLimit.limit }));
      return true;
    }
    if (!id.trim()) {
      sendJson(res, 404, {
        schema: PACKET_SCHEMA,
        status: 'unknown',
        companyId: id,
        unknowns: [{ field: 'company', reason: 'not_found' }],
      });
      return true;
    }
    const packet = buildCompanyPacket({ companyId: id, ...data });
    if (packet.status === 'unknown') {
      sendJson(res, 404, packet);
      return true;
    }
    sendJson(res, 200, packet);
    return true;
  } catch (error) {
    if (error?.code === 'duplicate_company_id') {
      sendJson(res, 409, { ok: false, error: 'duplicate_company_id', companyId: id });
      return true;
    }
    sendJson(res, 500, { ok: false, error: String(error.message || error) });
    return true;
  }
}

export function listenCompanyTable({
  host = BIND_HOST,
  port = 0,
  inputs,
} = {}) {
  assertLoopbackBind(host);
  const server = http.createServer((req, res) => {
    const handled = handleCompanyTableRequest(req, res, { inputs });
    if (!handled) sendJson(res, 404, { ok: false, error: 'not_found' });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(port) || 0, host, () => resolve(server));
  });
}

function argValue(flag) {
  const eq = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return null;
}

function supportedField(value, quote = 'Example makes research useful.') {
  return {
    value,
    status: 'supported',
    url: 'https://acme.example/',
    quote,
  };
}

function fixtureInputs() {
  const company = {
    id: 'yc:acme',
    name: 'Acme',
    website: 'https://www.acme.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/acme',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/acme',
    openRoles: 2,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 2 },
    hiring: 'yes',
  };
  const other = {
    id: 'yc:ash',
    name: 'Ash Co',
    website: 'https://ash.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/ash',
    atsSource: 'Ashby',
    jobsUrl: 'https://jobs.ashbyhq.com/ash',
    openRoles: 1,
    openRolesAt: '2026-08-14',
  };
  const thin = {
    id: 'yc:thin',
    name: 'Thin Co',
  };
  return {
    map: {
      generatedAt: '2026-08-14T12:00:00.000Z',
      companies: [company, other, thin],
    },
    ledger: {
      schema: 'demigod.role-ledger/1',
      updatedAt: '2026-08-14',
      roles: {
        'Greenhouse|acme|1': {
          provider: 'Greenhouse',
          slug: 'acme',
          jobId: '1',
          company: 'Acme',
          title: 'Senior Backend Engineer',
          location: 'San Francisco, CA',
          url: 'https://boards.greenhouse.io/acme/jobs/1',
          firstSeen: '2026-07-01',
          lastSeen: '2026-08-14',
          closedAt: null,
          nativePostedAt: '2026-06-01',
          nativeDateField: 'first_published',
          employerDepartment: 'Engineering',
        },
      },
    },
    signals: {
      schema: 'demigod.recruitai-signals/3',
      at: '2026-08-14T15:00:00.000Z',
      byMapCompanyId: {
        'yc:acme': {
          firstObservedTodayReqCount: 2,
          closedTodayReqCount: 1,
          reopenedOpenReqCount: 0,
        },
      },
    },
    signalsMissing: false,
    benchmark: {
      researchedAt: '2026-08-01',
      thresholds: { usableCoverage: 0.9, evidenceSupport: 0.95 },
      companies: Array.from({ length: 30 }, (_, index) => ({
        id: index === 0 ? 'yc:acme' : `gold:${index}`,
        fields: {
          canonicalCompany: supportedField(index === 0 ? 'Acme' : `Gold ${index}`),
          productSummary: supportedField('Makes useful things'),
          productCategory: supportedField('Software'),
          likelyBuyer: supportedField('Operations teams'),
          pricingStatus: index < 27
            ? supportedField('contact sales', 'Contact us for pricing details.')
            : { value: null, status: 'unknown', url: null, quote: null },
        },
      })),
    },
    catalog: {},
  };
}

function invoke(method, urlPath, inputs, headers = { host: '127.0.0.1' }) {
  const req = { method, url: urlPath, headers };
  let status = 0;
  let body = '';
  const res = {
    writeHead(code) {
      status = code;
    },
    end(chunk) {
      body += chunk || '';
    },
  };
  const handled = handleCompanyTableRequest(req, res, { inputs });
  return { handled, status, json: body ? JSON.parse(body) : null };
}

async function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`company-table selftest: ${msg}`);
  };
  const inputs = fixtureInputs();

  // 1. List from hermetic map; limit caps rows; row is identity + hiring + unknowns + href.
  const listed = listCompanyRows(inputs, { limit: 2 });
  assert(listed.schema === TABLE_SCHEMA, 'table schema');
  assert(listed.bind === BIND_HOST, 'list names loopback bind');
  assert(listed.total === 3 && listed.rows.length === 2, 'limit caps rows');
  assert(listed.rows[0].id === 'yc:acme' && listed.rows[1].id === 'yc:ash', 'map order');
  const acme = listed.rows[0];
  assert(acme.name === 'Acme' && acme.domain === 'acme.example', 'identity');
  assert(acme.hiring.status === 'board_observed' && acme.hiring.openRoles === 1, 'hiring summary');
  assert(acme.ats === 'Greenhouse' && acme.openRoles === 1, 'clay analog fields');
  assert(acme.lastSignal?.at === '2026-08-14T15:00:00.000Z', 'last signal at');
  assert(acme.lastSignal.firstObservedToday === 2 && acme.lastSignal.closedToday === 1, 'last signal counts');
  assert(acme.researchStatus === 'verified', 'research status');
  assert(Number.isSafeInteger(acme.unknownsCount) && acme.unknownsCount >= 0, 'unknowns count');
  assert(Array.isArray(acme.peers), 'row has peers[] for a count');
  assert(acme.peerBasis === 'sf-map + roleMix overlap' || acme.peerBasis === null, 'row peerBasis');
  assert(acme.href === '/companies/yc%3Aacme', 'packet href');
  assert(!('score' in acme) && !('email' in acme) && !('phone' in acme), 'row has no score/people');
  assert(!('jobsUrl' in acme) && !('roles' in acme), 'row is a summary, not the packet');

  // 2. Handler without listen: GET list + GET packet.
  const listRes = invoke('GET', '/companies?limit=2', inputs);
  assert(listRes.handled && listRes.status === 200, 'GET /companies');
  assert(listRes.json.rows.length === 2 && listRes.json.rows[0].id === 'yc:acme', 'handler list');
  const getRes = invoke('GET', '/companies/yc:acme', inputs);
  assert(getRes.status === 200 && getRes.json.schema === PACKET_SCHEMA, 'GET packet schema');
  assert(getRes.json.companyId === 'yc:acme' && getRes.json.identity.name === 'Acme', 'GET packet');
  assert(Array.isArray(getRes.json.unknowns), 'packet unknowns first-class');
  const encoded = invoke('GET', '/companies/yc%3Aacme', inputs);
  assert(encoded.status === 200 && encoded.json.companyId === 'yc:acme', 'encoded id');

  // 3. Unknown id → 404, invents nothing.
  const missing = invoke('GET', '/companies/yc:nope', inputs);
  assert(missing.status === 404 && missing.json.status === 'unknown', 'unknown 404');
  assert(!missing.json.identity && !missing.json.hiring && !missing.json.roles, '404 invents nothing');
  assert(!JSON.stringify(missing.json).includes('acme.example'), '404 does not leak fixture');

  // 4. Duplicate map id fails closed (no merge).
  let dupThrew = false;
  try {
    listCompanyRows({
      ...inputs,
      map: { companies: [inputs.map.companies[0], { ...inputs.map.companies[0], name: 'Dup' }] },
    });
  } catch (error) {
    dupThrew = error?.code === 'duplicate_company_id';
  }
  assert(dupThrew, 'list duplicate fails closed');
  const dupGet = invoke('GET', '/companies/yc:acme', {
    ...inputs,
    map: { companies: [inputs.map.companies[0], { ...inputs.map.companies[0], name: 'Dup' }] },
  });
  assert(dupGet.status === 409 && dupGet.json.error === 'duplicate_company_id', 'GET duplicate 409');

  // 5. Bind 127.0.0.1 only — inject + random port; refuse 0.0.0.0.
  let refused = false;
  try {
    await listenCompanyTable({ host: '0.0.0.0', port: 0, inputs });
  } catch (error) {
    refused = error?.code === 'non_loopback_bind_forbidden';
  }
  assert(refused, '0.0.0.0 bind refused');
  const server = await listenCompanyTable({ host: BIND_HOST, port: 0, inputs });
  try {
    const addr = server.address();
    assert(addr.address === BIND_HOST, `listen address ${addr.address}`);
    const base = `http://${BIND_HOST}:${addr.port}`;
    const liveList = await (await fetch(`${base}/companies?limit=1`)).json();
    assert(liveList.schema === TABLE_SCHEMA && liveList.rows[0].id === 'yc:acme', 'listen list');
    const liveMiss = await fetch(`${base}/companies/yc:nope`);
    assert(liveMiss.status === 404, 'listen unknown 404');
    const evil = invoke('GET', '/companies?limit=1', inputs, { host: 'evil.example' });
    assert(evil.status === 403, 'non-loopback Host forbidden');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // 6. Canaries: no public bind, no score, no people fields, dashboard mounts the route.
  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const dash = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8');
  assert(!/listen\(\s*(?:[^,]+,\s*)?['"]0\.0\.0\.0['"]/.test(here), 'source never listen 0.0.0.0');
  assert(!/\bscoreMatch\s*\(/.test(here), 'table never calls scoreMatch');
  assert(!/0\.0\.0\.0/.test(here.split('selftest')[0] || here), 'bind surface has no 0.0.0.0');
  assert(dash.includes("pathname === '/companies'") || dash.includes("pathname.startsWith('/companies/')"), 'dashboard mounts /companies');
  const dumped = JSON.stringify({ listed, packet: getRes.json });
  assert(!/"email"/.test(dumped) && !/"phone"/.test(dumped) && !/"persona"/.test(dumped), 'no people fields');
  assert(!/"score"/.test(dumped), 'no score field');

  const other = invoke('GET', '/api/status', inputs);
  assert(other.handled === false, 'non-table paths are not claimed');
  const post = invoke('POST', '/companies', inputs);
  assert(post.status === 405, 'POST refused');

  console.log(JSON.stringify({ ok: true, selftest: 'company-table' }));
}

async function serve() {
  const portRaw = argValue('--port');
  const port = portRaw == null || portRaw === '' ? 0 : Number(portRaw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('usage: node demigod-company-table.mjs serve [--port=0..65535]');
    process.exit(2);
  }
  const server = await listenCompanyTable({ host: BIND_HOST, port, inputs: loadPacketInputs() });
  const addr = server.address();
  console.log(JSON.stringify({
    ok: true,
    bind: BIND_HOST,
    port: addr.port,
    list: `http://${BIND_HOST}:${addr.port}/companies?limit=10`,
    packet: `http://${BIND_HOST}:${addr.port}/companies/:id`,
  }));
}

if (isMain) {
  const cmd = process.argv[2];
  try {
    if (process.argv.includes('--selftest')) {
      await selftest();
    } else if (cmd === 'serve') {
      await serve();
    } else {
      console.error('usage: node demigod-company-table.mjs --selftest | serve [--port=N]');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
