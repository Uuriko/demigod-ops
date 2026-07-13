#!/usr/bin/env node
/**
 * dg-match — shortlist candidates against a pilot's 90-day outcome.
 * Max 3 candidates. No board mint. Stores on pilot.shortlist[].
 *
 * Usage:
 *   node demigod-match.mjs list <pilotId>
 *   node demigod-match.mjs add <pilotId> --name "Ada" --why "…" [--score 1-5] [--consent]
 *   node demigod-match.mjs remove <pilotId> --id <candidateId>
 *   node demigod-match.mjs scorecard <pilotId>
 *   node demigod-match.mjs finalize <pilotId>   # status → shortlist if 1–3 with why
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { BUSY, ensureBusy, atomicWrite, opt, withFileLock } from './demigod-agent-tools-lib.mjs';
import { proposePair } from './demigod-pairs-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-PILOTS.json');
const STORE_LOCK = path.join(ROOT, 'DEMIGOD-PILOTS.json.lock');
const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const MAX = 3;

function load() {
  const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  if (!j?.pilots) throw new Error('bad pilots store');
  return j;
}
function save(data) {
  data.at = new Date().toISOString();
  atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n');
}
/** Exclusive load → mutate → save (prevents lost updates). */
function updatePilot(mutator) {
  return withFileLock(STORE_LOCK, () => {
    const data = load();
    const out = mutator(data);
    data.at = new Date().toISOString();
    atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n');
    return out;
  });
}
function findPilot(data, pid) {
  const exact = data.pilots.find((p) => p.id === pid);
  if (exact) return exact;
  const hits = data.pilots.filter((p) => p.id.startsWith(pid));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    console.error(JSON.stringify({ ok: false, error: 'ambiguous_id', matches: hits.map((h) => h.id) }));
    process.exit(1);
  }
  return null;
}
function cid() {
  return `cand_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
}

if (cmd === 'list') {
  const pid = args[1];
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'pilot_not_found' }));
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        pilotId: p.id,
        company: p.company,
        role: p.role,
        outcome90d: p.outcome90d || '',
        shortlist: p.shortlist || [],
        count: (p.shortlist || []).length,
        max: MAX,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (cmd === 'scorecard') {
  const pid = args[1];
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'pilot_not_found' }));
    process.exit(1);
  }
  const sc = {
    pilotId: p.id,
    outcome90d: p.outcome90d || null,
    mustHaves: p.mustHaves || [],
    role: p.role,
    company: p.company,
    shortlistCount: (p.shortlist || []).length,
    ready: Boolean(p.outcome90d) && (p.shortlist || []).length >= 1 && (p.shortlist || []).length <= MAX,
    gaps: [],
  };
  if (!p.outcome90d) sc.gaps.push('missing_90day_outcome');
  if (!(p.shortlist || []).length) sc.gaps.push('empty_shortlist');
  if ((p.shortlist || []).some((c) => !c.why)) sc.gaps.push('candidate_missing_why');
  if ((p.shortlist || []).some((c) => !c.consent)) sc.gaps.push('candidate_missing_consent');
  console.log(JSON.stringify(sc, null, 2));
  process.exit(sc.ready && !sc.gaps.length ? 0 : 2);
}

if (cmd === 'add') {
  const pid = args[1];
  const name = opt(args, '--name', '');
  const why = opt(args, '--why', '');
  const score = Number(opt(args, '--score', '3')) || 3;
  const consent = args.includes('--consent');
  const links = opt(args, '--links', '');
  if (!name || !why) {
    console.error(JSON.stringify({ ok: false, error: 'name_and_why_required' }));
    process.exit(2);
  }
  let c;
  try {
    updatePilot((data) => {
      const p = findPilot(data, pid);
      if (!p) {
        console.error(JSON.stringify({ ok: false, error: 'pilot_not_found' }));
        process.exit(1);
      }
      const allowedAdd = new Set(['new', 'matching', 'shortlist', 'active', '']);
      if (!allowedAdd.has(String(p.status || 'new'))) {
        console.error(JSON.stringify({ ok: false, error: 'invalid_status_for_add', status: p.status }));
        process.exit(1);
      }
      p.shortlist = p.shortlist || [];
      if (p.shortlist.length >= MAX) {
        console.error(JSON.stringify({ ok: false, error: 'shortlist_full', max: MAX }));
        process.exit(1);
      }
      c = {
        id: cid(),
        at: new Date().toISOString(),
        name,
        why,
        score: Math.min(5, Math.max(1, score)),
        consent: Boolean(consent),
        links,
        against90d: p.outcome90d || '',
      };
      p.shortlist.push(c);
      p.updatedAt = new Date().toISOString();
      p.history = p.history || [];
      p.history.push({ at: new Date().toISOString(), status: p.status, by: 'dg-match', note: `add ${c.id}` });
      return c;
    });
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
  // Mirror into canonical pair ledger (role = pilot id as stand-in until real roleId)
  let pair = null;
  try {
    pair = proposePair({
      roleId: String(pid),
      candId: c.id,
      score: Math.min(1, Math.max(0, (Number(c.score) || 3) / 5)),
      reasons: [c.why].filter(Boolean),
      actor: 'dg-match',
    });
  } catch (e) {
    pair = { error: String(e.message || e) };
  }
  console.log(JSON.stringify({ ok: true, candidate: c, pairId: pair?.pairId || null, pair }, null, 2));
  process.exit(0);
}

if (cmd === 'remove') {
  const pid = args[1];
  const id = opt(args, '--id', '');
  if (!id) {
    console.error(JSON.stringify({ ok: false, error: 'id_required', hint: '--id <candidateId>' }));
    process.exit(2);
  }
  let removedId, shortlist;
  try {
    updatePilot((data) => {
      const p = findPilot(data, pid);
      if (!p) {
        console.error(JSON.stringify({ ok: false, error: 'pilot_not_found' }));
        process.exit(1);
      }
      const exact = (p.shortlist || []).find((c) => c.id === id);
      const hits = exact ? [exact] : (p.shortlist || []).filter((c) => c.id.startsWith(id));
      if (hits.length !== 1) {
        console.error(
          JSON.stringify({
            ok: false,
            error: hits.length ? 'ambiguous_id' : 'not_found',
            matches: hits.map((h) => h.id),
          }),
        );
        process.exit(1);
      }
      removedId = hits[0].id;
      p.shortlist = (p.shortlist || []).filter((c) => c.id !== removedId);
      if (p.mutual?.candId === removedId || p.mutual?.founderYesFor === removedId || p.mutual?.candidateYesFor === removedId) {
        delete p.mutual;
      }
      shortlist = p.shortlist;
    });
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, removed: removedId, shortlist }, null, 2));
  process.exit(0);
}

if (cmd === 'finalize') {
  const pid = args[1];
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'pilot_not_found' }));
    process.exit(1);
  }
  const n = (p.shortlist || []).length;
  if (n < 1 || n > MAX) {
    console.error(JSON.stringify({ ok: false, error: 'need_1_to_3', count: n }));
    process.exit(1);
  }
  if (!p.outcome90d) {
    console.error(JSON.stringify({ ok: false, error: 'missing_90day_outcome' }));
    process.exit(1);
  }
  if ((p.shortlist || []).some((c) => !c.why || !c.consent)) {
    console.error(JSON.stringify({ ok: false, error: 'each_candidate_needs_why_and_consent' }));
    process.exit(1);
  }
  const allowedFin = new Set(['new', 'matching', 'shortlist', 'active', '']);
  if (!allowedFin.has(String(p.status || 'new'))) {
    console.error(JSON.stringify({ ok: false, error: 'invalid_status_for_finalize', status: p.status }));
    process.exit(1);
  }
  p.status = 'shortlist';
  p.shortlistAt = new Date().toISOString();
  p.history = p.history || [];
  p.history.push({ at: p.shortlistAt, status: 'shortlist', by: 'dg-match' });
  save(data);
  console.log(JSON.stringify({ ok: true, pilot: p.id, status: p.status, count: n }, null, 2));
  process.exit(0);
}

console.error('usage: list|add|remove|scorecard|finalize <pilotId> …');
process.exit(2);
