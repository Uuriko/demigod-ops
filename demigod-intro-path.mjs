#!/usr/bin/env node
/**
 * demigod-intro-path — Affinity-shaped manual intro memory (phase-0).
 *
 * Human-set strength + free-text evidence only. No email scrape, no LinkedIn,
 * no auto-send, no numeric "relationship score" product.
 *
 *   node demigod-intro-path.mjs log --from=… --to=… --strength=unknown|weak|strong --evidence=…
 *   node demigod-intro-path.mjs list [--company=] [--cand=]
 *   node demigod-intro-path.mjs warm [--company=] [--cand=] [--limit=10]
 *   node demigod-intro-path.mjs --selftest
 *
 * SoR: DEMIGOD-INTRO-PATHS.json
 * Design: docs/die/research/VERTICAL-MECHANISM-DEEP-DIVE.md §4
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-INTRO-PATHS.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SCHEMA = 'demigod.intro-path/1';
export const STRENGTHS = ['unknown', 'weak', 'strong'];
export const STRENGTH_W = { strong: 3, weak: 2, unknown: 1 };

function now() {
  return new Date().toISOString();
}

function load() {
  if (!fs.existsSync(STORE)) {
    return { schema: 'demigod.intro-paths-store/1', updatedAt: null, paths: [] };
  }
  const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  if (!Array.isArray(j.paths)) j.paths = [];
  return j;
}

function save(doc) {
  doc.updatedAt = now();
  atomicWrite(STORE, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o600 });
}

/** Pure: throw if path invalid. */
export function assertPath(p) {
  if (!p || p.schema !== SCHEMA) throw new Error('intro_path_schema');
  if (!String(p.fromPerson || '').trim()) throw new Error('intro_path_from');
  if (!String(p.toCompany || p.toCand || '').trim()) {
    throw new Error('intro_path_to');
  }
  if (!STRENGTHS.includes(p.strength)) throw new Error('intro_path_strength');
  const ev = String(p.evidence || '').trim();
  if (ev.length < 8 || ev.length > 500) throw new Error('intro_path_evidence');
  if (!p.at || !Number.isFinite(Date.parse(p.at))) throw new Error('intro_path_at');
  // No score field allowed (Affinity strength is ordinal, not 0–100 product).
  if ('score' in p || 'fitScore' in p) throw new Error('intro_path_no_score');
  return true;
}

export function makePath({
  fromPerson,
  toCompany = null,
  toCand = null,
  strength = 'unknown',
  evidence,
  roleId = null,
  at = null,
  note = null,
} = {}) {
  const p = {
    schema: SCHEMA,
    id: crypto.randomBytes(8).toString('hex'),
    fromPerson: String(fromPerson || '').trim().slice(0, 120),
    toCompany: toCompany ? String(toCompany).trim().slice(0, 120) : null,
    toCand: toCand ? String(toCand).trim().slice(0, 80) : null,
    strength: String(strength || 'unknown'),
    evidence: String(evidence || '').trim().slice(0, 500),
    roleId: roleId ? String(roleId).trim() : null,
    note: note ? String(note).trim().slice(0, 500) : null,
    at: at || now(),
  };
  assertPath(p);
  return p;
}

export function appendPath(pathRow) {
  assertPath(pathRow);
  return withFileLock(`${STORE}.lock`, () => {
    const doc = load();
    doc.paths.push(pathRow);
    if (doc.paths.length > 20000) doc.paths = doc.paths.slice(-20000);
    save(doc);
    return pathRow;
  });
}

/**
 * Warm paths: group by target (company or cand), rank by strength then recency.
 * Ranking aid only — never exported as a product score.
 */
export function warmPaths(paths, { company = null, cand = null, limit = 10 } = {}) {
  const co = company ? String(company).trim().toLowerCase() : null;
  const ca = cand ? String(cand).trim() : null;
  const by = new Map();
  for (const p of paths || []) {
    if (!p?.id) continue;
    if (co && String(p.toCompany || '').toLowerCase() !== co) continue;
    if (ca && p.toCand !== ca) continue;
    const key = p.toCand
      ? `cand:${p.toCand}`
      : p.toCompany
        ? `co:${String(p.toCompany).toLowerCase()}`
        : null;
    if (!key) continue;
    const g = by.get(key) || {
      key,
      toCompany: p.toCompany,
      toCand: p.toCand,
      paths: 0,
      bestStrength: 'unknown',
      lastAt: null,
      fromPeople: new Set(),
      lastEvidence: null,
    };
    g.paths += 1;
    g.fromPeople.add(p.fromPerson);
    if (!g.lastAt || Date.parse(p.at) > Date.parse(g.lastAt)) {
      g.lastAt = p.at;
      g.lastEvidence = p.evidence;
    }
    if ((STRENGTH_W[p.strength] || 0) > (STRENGTH_W[g.bestStrength] || 0)) {
      g.bestStrength = p.strength;
    }
    by.set(key, g);
  }
  return [...by.values()]
    .map((g) => ({
      toCompany: g.toCompany,
      toCand: g.toCand,
      paths: g.paths,
      bestStrength: g.bestStrength,
      lastAt: g.lastAt,
      fromPeople: [...g.fromPeople].slice(0, 8),
      lastEvidence: g.lastEvidence,
    }))
    .sort((a, b) => {
      const sw = (STRENGTH_W[b.bestStrength] || 0) - (STRENGTH_W[a.bestStrength] || 0);
      if (sw) return sw;
      return Date.parse(b.lastAt || 0) - Date.parse(a.lastAt || 0);
    })
    .slice(0, Math.max(1, Math.min(50, limit | 0 || 10)));
}

export function listPaths({ company = null, cand = null, limit = 50 } = {}) {
  const doc = load();
  let rows = doc.paths || [];
  if (company) {
    const co = String(company).trim().toLowerCase();
    rows = rows.filter((p) => String(p.toCompany || '').toLowerCase() === co);
  }
  if (cand) {
    const ca = String(cand).trim();
    rows = rows.filter((p) => p.toCand === ca);
  }
  return rows.slice(-Math.max(1, Math.min(500, limit | 0 || 50))).reverse();
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`intro-path selftest: ${m}`);
  };
  const p = makePath({
    fromPerson: 'founder-a',
    toCompany: 'Acme',
    strength: 'strong',
    evidence: 'met at YC demo day 2026-06',
  });
  assertPath(p);
  assert(p.schema === SCHEMA, 'schema');
  let threw = false;
  try {
    makePath({ fromPerson: 'x', toCompany: 'y', evidence: 'short' });
  } catch {
    threw = true;
  }
  assert(threw, 'evidence min length');
  threw = false;
  try {
    assertPath({ ...p, score: 99 });
  } catch {
    threw = true;
  }
  assert(threw, 'no score field');
  const warm = warmPaths(
    [
      p,
      makePath({
        fromPerson: 'eng-b',
        toCompany: 'Acme',
        strength: 'weak',
        evidence: 'prior intro June 2026',
        at: '2026-06-01T00:00:00.000Z',
      }),
      makePath({
        fromPerson: 'x',
        toCand: 'cand-1',
        strength: 'unknown',
        evidence: 'spoke once at office hours',
      }),
    ],
    { company: 'Acme', limit: 5 },
  );
  assert(warm.length === 1 && warm[0].bestStrength === 'strong', 'warm rank');
  assert(warm[0].fromPeople.includes('founder-a'), 'from people');
  assert(!('score' in warm[0]), 'warm has no score');
  console.log(JSON.stringify({ ok: true, selftest: 'intro-path' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest') || args[0] === 'selftest') {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-intro-path.mjs log|list|warm [--from=] [--to=|--company=|--cand=] [--strength=] [--evidence=] [--json]
  log   append human intro path (evidence ≥8 chars; strength unknown|weak|strong)
  list  recent paths
  warm  rank targets by strength+recency (no product score)
Policy: never auto-email; never scrape LinkedIn; drafts-only elsewhere.`);
    return;
  }
  const json = args.includes('--json');
  const cmd = args.find((a) => !a.startsWith('-')) || 'list';
  const get = (k) => {
    const eq = args.find((a) => a.startsWith(`--${k}=`));
    if (eq) return eq.slice(k.length + 3);
    const i = args.indexOf(`--${k}`);
    if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
    return null;
  };

  if (cmd === 'log') {
    try {
      const to = get('to');
      const row = makePath({
        fromPerson: get('from'),
        toCompany: get('company') || (to && !String(to).startsWith('cand-') ? to : null),
        toCand: get('cand') || (to && String(to).startsWith('cand-') ? to : null),
        strength: get('strength') || 'unknown',
        evidence: get('evidence'),
        roleId: get('role'),
        note: get('note'),
      });
      appendPath(row);
      console.log(JSON.stringify({ ok: true, path: row }, null, json ? 2 : 0));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  if (cmd === 'warm') {
    const rows = warmPaths(load().paths, {
      company: get('company') || get('to'),
      cand: get('cand'),
      limit: Number(get('limit') || 10),
    });
    if (json) console.log(JSON.stringify({ ok: true, warm: rows }, null, 2));
    else {
      console.log(`# intro-path warm · ${rows.length}`);
      for (const r of rows) {
        const target = r.toCand || r.toCompany;
        console.log(
          `  ${r.bestStrength.padEnd(7)} ${target} · paths=${r.paths} · from=${r.fromPeople.join(',')}`,
        );
      }
    }
    return;
  }

  // list
  const rows = listPaths({
    company: get('company') || get('to'),
    cand: get('cand'),
    limit: Number(get('limit') || 50),
  });
  if (json) console.log(JSON.stringify({ ok: true, paths: rows }, null, 2));
  else {
    console.log(`# intro-path list · ${rows.length}`);
    for (const p of rows) {
      console.log(
        `  ${p.at?.slice(0, 10) || '?'} · ${p.strength} · ${p.fromPerson} → ${p.toCand || p.toCompany} · ${String(p.evidence).slice(0, 60)}`,
      );
    }
  }
}

if (isMain) main();
