#!/usr/bin/env node
/**
 * demigod-company-peers — SF-map peer set from roleMix overlap (beyond-Clay slice 2).
 *
 * Other companies on the same map that share at least one roleMix family and
 * currently show openRoles > 0. Not Clay people-lookalikes. No neighborhood /
 * lat / lng. No score. Pure map walk; no network; does not build packets.
 *
 *   node demigod-company-peers.mjs --selftest
 *   node demigod-company-peers.mjs show --id=yc:abundant
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const PEER_BASIS = 'sf-map + roleMix overlap';
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function capLimit(limit) {
  const n = Number.isSafeInteger(limit) ? limit : DEFAULT_LIMIT;
  return Math.max(0, Math.min(MAX_LIMIT, n));
}

function findMapCompany(map, companyId) {
  const rows = Array.isArray(map?.companies) ? map.companies : [];
  const hits = rows.filter((row) => row && typeof row === 'object' && row.id === companyId);
  if (hits.length > 1) {
    const err = new Error(`duplicate company id: ${companyId}`);
    err.code = 'duplicate_company_id';
    throw err;
  }
  return hits[0] || null;
}

function emptyPeers(companyId, unknown) {
  return {
    companyId: typeof companyId === 'string' ? companyId : '',
    basis: PEER_BASIS,
    peers: [],
    unknown,
  };
}

/** roleMix keys whose value is a positive safe integer, sorted. */
export function familiesFromRoleMix(roleMix) {
  if (!isRecord(roleMix)) return [];
  const families = [];
  for (const [key, value] of Object.entries(roleMix)) {
    if (typeof key === 'string' && key && Number.isSafeInteger(value) && value > 0) {
      families.push(key);
    }
  }
  families.sort((a, b) => a.localeCompare(b));
  return families;
}

/**
 * Pure. Walk map.companies only. Duplicate subject id throws (fail closed).
 * Unknown id → { peers: [], unknown: "not_found" }. No invented names.
 */
export function findCompanyPeers({ companyId, map = {}, limit = DEFAULT_LIMIT } = {}) {
  if (typeof companyId !== 'string' || !companyId.trim()) {
    return emptyPeers(companyId, 'not_found');
  }
  const subject = findMapCompany(map, companyId);
  if (!subject) return emptyPeers(companyId, 'not_found');

  const subjectFamilies = familiesFromRoleMix(subject.roleMix);
  if (subjectFamilies.length === 0) return emptyPeers(companyId, 'no_role_mix');

  const subjectSet = new Set(subjectFamilies);
  const rows = Array.isArray(map?.companies) ? map.companies : [];
  const peers = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    if (typeof row.id !== 'string' || !row.id || row.id === companyId) continue;
    if (!Number.isSafeInteger(row.openRoles) || row.openRoles <= 0) continue;
    const sharedFamilies = familiesFromRoleMix(row.roleMix).filter((family) => subjectSet.has(family));
    if (sharedFamilies.length === 0) continue;
    peers.push({
      id: row.id,
      name: typeof row.name === 'string' ? row.name : '',
      sharedFamilies,
      openRoles: row.openRoles,
    });
  }
  peers.sort((a, b) =>
    b.sharedFamilies.length - a.sharedFamilies.length
    || b.openRoles - a.openRoles
    || a.name.localeCompare(b.name)
    || a.id.localeCompare(b.id));

  return {
    companyId,
    basis: PEER_BASIS,
    peers: peers.slice(0, capLimit(limit)),
    unknown: null,
  };
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

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`company-peers selftest: ${msg}`);
  };

  assert(
    JSON.stringify(familiesFromRoleMix({ engineering: 2, product: 1, sales: 0, other: -1 }))
      === JSON.stringify(['engineering', 'product']),
    'familiesFromRoleMix keeps positive integer keys',
  );
  assert(familiesFromRoleMix(null).length === 0, 'familiesFromRoleMix null');
  assert(familiesFromRoleMix({ engineering: '2' }).length === 0, 'familiesFromRoleMix rejects strings');

  const acme = {
    id: 'yc:acme',
    name: 'Acme',
    roleMix: { engineering: 2, product: 1 },
    openRoles: 3,
  };
  const beta = {
    id: 'yc:beta',
    name: 'Beta',
    roleMix: { engineering: 1 },
    openRoles: 2,
  };
  const gamma = {
    id: 'yc:gamma',
    name: 'Gamma',
    roleMix: { sales: 4 },
    openRoles: 5,
  };
  const delta = {
    id: 'yc:delta',
    name: 'Delta',
    roleMix: { engineering: 1 },
    openRoles: 0,
  };
  const empty = {
    id: 'yc:empty',
    name: 'Empty',
    openRoles: 1,
  };
  const map = { companies: [acme, beta, gamma, delta, empty] };

  // 1. peers of A include B only; shared engineering; no score.
  const ofA = findCompanyPeers({ companyId: 'yc:acme', map });
  assert(ofA.companyId === 'yc:acme', 'A companyId');
  assert(ofA.basis === 'sf-map + roleMix overlap', 'basis exact');
  assert(ofA.unknown === null, 'A unknown null');
  assert(ofA.peers.length === 1 && ofA.peers[0].id === 'yc:beta', 'A peers B only');
  assert(
    ofA.peers[0].name === 'Beta'
      && JSON.stringify(ofA.peers[0].sharedFamilies) === JSON.stringify(['engineering'])
      && ofA.peers[0].openRoles === 2,
    'B sharedFamilies and openRoles',
  );
  assert(!('score' in ofA) && !('score' in ofA.peers[0]), 'no score key');
  assert(!('fit' in ofA) && !('confidence' in ofA) && !('fit' in ofA.peers[0]), 'no fit/confidence');

  // 2. peers of C empty (no other sales + open).
  const ofC = findCompanyPeers({ companyId: 'yc:gamma', map });
  assert(ofC.unknown === null && ofC.peers.length === 0, 'C has roleMix but no sales peer');
  assert(ofC.basis === 'sf-map + roleMix overlap', 'C basis exact');

  // 3. no roleMix → unknown no_role_mix, peers [].
  const ofE = findCompanyPeers({ companyId: 'yc:empty', map });
  assert(ofE.unknown === 'no_role_mix' && ofE.peers.length === 0, 'E no_role_mix');

  // 4. unknown id → not_found, peers [].
  const missing = findCompanyPeers({ companyId: 'yc:nope', map });
  assert(missing.unknown === 'not_found' && missing.peers.length === 0, 'unknown id');
  assert(!JSON.stringify(missing).includes('Acme'), 'unknown invents no names');

  // 5. duplicate subject id throws.
  let dupThrew = false;
  try {
    findCompanyPeers({
      companyId: 'yc:acme',
      map: { companies: [acme, { ...acme, name: 'Acme Dup' }] },
    });
  } catch (error) {
    dupThrew = error?.code === 'duplicate_company_id';
  }
  assert(dupThrew, 'duplicate id fails closed');

  // 6. limit 1 on a map with two valid peers returns 1.
  const zeta = {
    id: 'yc:zeta',
    name: 'Zeta',
    roleMix: { engineering: 1 },
    openRoles: 4,
  };
  const twoPeers = findCompanyPeers({
    companyId: 'yc:acme',
    map: { companies: [acme, beta, zeta] },
    limit: 1,
  });
  assert(twoPeers.peers.length === 1, 'limit 1 caps');
  assert(twoPeers.peers[0].id === 'yc:zeta', 'higher openRoles ranks first under the cap');

  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const surface = here.split('function selftest')[0] || here;
  assert(!/company-packet/.test(surface), 'peers surface does not import packet');
  assert(!/\bscoreMatch\s*\(/.test(surface), 'peers never calls scoreMatch');
  const dumped = JSON.stringify({ ofA, ofC, ofE, missing, twoPeers });
  assert(!/"score"/.test(dumped) && !/"fit"/.test(dumped) && !/"confidence"/.test(dumped), 'dump has no score/fit');
  assert(!/"email"/.test(dumped) && !/"phone"/.test(dumped) && !/"persona"/.test(dumped), 'no people fields');
  assert(!/"neighborhood"/.test(dumped) && !/"lat"/.test(dumped) && !/"lng"/.test(dumped), 'no neighborhood pins');

  console.log(JSON.stringify({ ok: true, selftest: 'company-peers' }));
}

function show(companyId) {
  if (!companyId) {
    console.error('usage: node demigod-company-peers.mjs show --id=yc:…');
    process.exit(2);
  }
  const mapPath = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  let result;
  try {
    result = findCompanyPeers({ companyId, map });
  } catch (error) {
    if (error?.code === 'duplicate_company_id') {
      console.error(JSON.stringify({
        companyId,
        basis: PEER_BASIS,
        peers: [],
        unknown: null,
        error: 'duplicate_company_id',
      }));
      process.exit(1);
    }
    throw error;
  }
  console.log(JSON.stringify(result, null, 2));
}

if (isMain) {
  try {
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'show') {
      show(argValue('--id'));
    } else {
      console.error('usage: node demigod-company-peers.mjs --selftest | show --id=yc:…');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
