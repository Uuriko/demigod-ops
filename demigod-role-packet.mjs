#!/usr/bin/env node
/**
 * demigod-role-packet — Ashby/Greenhouse-shaped structured role + evidence notes.
 *
 * Technical product: scorecard + required evidence ratings (no AI verdict).
 * Design: docs/die/ROLE-PACKET-DESIGN.md
 *
 *   node demigod-role-packet.mjs init --role=ID --title=… --company=… --outcome=… [--demo]
 *   node demigod-role-packet.mjs add-must --role=ID --label=…
 *   node demigod-role-packet.mjs show [--role=ID]
 *   node demigod-role-packet.mjs note --role=ID --cand=ID --ratings='[…]' [--by=…]
 *   node demigod-role-packet.mjs stage --role=ID --to=reviewing|…
 *   node demigod-role-packet.mjs set-comp --role=ID --text=… --source=… [--url=] [--quote=]
 *   node demigod-role-packet.mjs list
 *   node demigod-role-packet.mjs --selftest
 *
 * SoR: DEMIGOD-ROLE-PACKETS.json (repo) · notes: DEMIGOD-REVIEW-NOTES.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const PACKETS_PATH = path.join(ROOT, 'DEMIGOD-ROLE-PACKETS.json');
const NOTES_PATH = path.join(ROOT, 'DEMIGOD-REVIEW-NOTES.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const PACKET_SCHEMA = 'demigod.role-packet/1';
export const NOTE_SCHEMA = 'demigod.review-note/1';
export const STAGES = ['brief_ready', 'reviewing', 'mutual_pending', 'intro', 'outcome'];
/** Forward-only stage graph (Ashby interview-plan shaped). */
export const STAGE_TRANSITIONS = {
  brief_ready: ['reviewing'],
  reviewing: ['mutual_pending', 'brief_ready'],
  mutual_pending: ['intro', 'reviewing'],
  intro: ['outcome', 'mutual_pending'],
  outcome: [],
};
export const RATINGS = ['strong_no', 'no', 'yes', 'strong_yes'];
export const DECISION_AIDS = [
  'changed_by_context',
  'missing_question',
  'error_prevented',
  'none',
];
export const COMP_SOURCES = ['founder_stated', 'public_job_post', 'unknown'];

function now() {
  return new Date().toISOString();
}

function loadStore(file, empty) {
  if (!fs.existsSync(file)) return empty;
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error(`invalid store ${file}`);
  return j;
}

function saveStore(file, doc) {
  atomicWrite(file, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o600 });
}

/** Pure: throw if packet invalid. */
export function assertPacket(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('packet_not_object');
  if (p.schema !== PACKET_SCHEMA) throw new Error('packet_schema');
  if (!String(p.roleId || '').trim()) throw new Error('packet_roleId');
  if (!String(p.title || '').trim()) throw new Error('packet_title');
  const outcome = String(p.outcome90d || '').trim();
  if (outcome.length < 20) throw new Error('packet_outcome90d_short');
  if (!Array.isArray(p.mustHaves) || p.mustHaves.length < 3 || p.mustHaves.length > 7) {
    throw new Error('packet_mustHaves_count');
  }
  const ids = new Set();
  for (const m of p.mustHaves) {
    if (!m?.id || !String(m.label || '').trim()) throw new Error('packet_mustHave_shape');
    if (ids.has(m.id)) throw new Error('packet_mustHave_dup');
    ids.add(m.id);
  }
  if (p.dealBreakers != null) {
    if (!Array.isArray(p.dealBreakers)) throw new Error('packet_dealBreakers');
    for (const d of p.dealBreakers) {
      if (!d?.id || !String(d.label || '').trim()) throw new Error('packet_dealBreaker_shape');
    }
  }
  if (!STAGES.includes(p.stage)) throw new Error('packet_stage');
  if (!Array.isArray(p.stages) || !p.stages.every((s) => STAGES.includes(s))) {
    throw new Error('packet_stages');
  }
  if (p.compBand != null) {
    if (typeof p.compBand !== 'object' || !String(p.compBand.text || '').trim()) {
      throw new Error('packet_compBand');
    }
    const src = p.compBand.source || 'unknown';
    if (!COMP_SOURCES.includes(src)) throw new Error('packet_compBand_source');
    if (src === 'public_job_post') {
      const url = String(p.compBand.url || '').trim();
      const quote = String(p.compBand.quote || '').trim();
      if (!/^https:\/\//i.test(url) || /@/.test(url) || url.length > 2048) {
        throw new Error('packet_compBand_url');
      }
      if (quote.length < 8 || quote.length > 280) throw new Error('packet_compBand_quote');
    }
  }
  return true;
}

/** Advance or retreat stage only along STAGE_TRANSITIONS. */
export function advanceStage(packet, to) {
  assertPacket(packet);
  const next = String(to || '').trim();
  if (!STAGES.includes(next)) throw new Error('stage_unknown');
  const allowed = STAGE_TRANSITIONS[packet.stage] || [];
  if (!allowed.includes(next)) {
    throw new Error(`stage_forbidden:${packet.stage}->${next}`);
  }
  return { ...packet, stage: next, updatedAt: now() };
}

/** Set compensation band; public_job_post requires https URL + quote. */
export function setCompBand(packet, { text, source = 'founder_stated', url = null, quote = null } = {}) {
  assertPacket(packet);
  const band = {
    text: String(text || '').trim(),
    source: String(source || 'unknown'),
    url: url ? String(url).trim() : null,
    quote: quote ? String(quote).trim() : null,
    evidence: null,
  };
  if (band.source === 'public_job_post') {
    band.evidence = { url: band.url, quote: band.quote };
  }
  const next = { ...packet, compBand: band, updatedAt: now() };
  assertPacket(next);
  return next;
}

/** Pure: note must cover every mustHave with evidence. */
export function assertNote(note, packet) {
  assertPacket(packet);
  if (!note || note.schema !== NOTE_SCHEMA) throw new Error('note_schema');
  if (note.roleId !== packet.roleId) throw new Error('note_role_mismatch');
  if (!String(note.candId || '').trim()) throw new Error('note_candId');
  if (!Array.isArray(note.ratings) || note.ratings.length === 0) throw new Error('note_ratings');
  const byMh = new Map(note.ratings.map((r) => [r.mustHaveId, r]));
  for (const m of packet.mustHaves) {
    const r = byMh.get(m.id);
    if (!r) throw new Error(`note_missing_rating:${m.id}`);
    if (!RATINGS.includes(r.rating)) throw new Error(`note_rating_enum:${m.id}`);
    if (String(r.evidence || '').trim().length < 8) throw new Error(`note_evidence_short:${m.id}`);
  }
  for (const r of note.ratings) {
    if (!packet.mustHaves.some((m) => m.id === r.mustHaveId)) {
      throw new Error(`note_unknown_mustHave:${r.mustHaveId}`);
    }
  }
  const aid = note.decisionAid || 'none';
  if (!DECISION_AIDS.includes(aid)) throw new Error('note_decisionAid');
  return true;
}

export function createPacket({
  roleId,
  title,
  companyId = null,
  outcome90d,
  mustHaves = null,
  dealBreakers = [],
  compBand = null,
  demo = false,
} = {}) {
  const id = String(roleId || '').trim();
  const at = now();
  const defaults =
    mustHaves ||
    [
      { id: 'mh1', label: 'Domain craft for this role', kind: 'skill' },
      { id: 'mh2', label: 'Evidence of shipping under ambiguity', kind: 'trait' },
      { id: 'mh3', label: 'Communication clear enough for mutual-yes', kind: 'trait' },
    ];
  const p = {
    schema: PACKET_SCHEMA,
    roleId: id,
    demo: Boolean(demo),
    companyId: companyId ? String(companyId) : null,
    title: String(title || '').trim(),
    outcome90d: String(outcome90d || '').trim(),
    mustHaves: defaults.map((m, i) => ({
      id: String(m.id || `mh${i + 1}`),
      label: String(m.label || '').trim(),
      kind: m.kind || 'skill',
    })),
    dealBreakers: (dealBreakers || []).map((d, i) => ({
      id: String(d.id || `db${i + 1}`),
      label: String(d.label || '').trim(),
    })),
    compBand: compBand || null,
    stages: [...STAGES],
    stage: 'brief_ready',
    createdAt: at,
    updatedAt: at,
  };
  assertPacket(p);
  return p;
}

export function addMustHave(packet, label, kind = 'skill') {
  assertPacket(packet);
  if (packet.mustHaves.length >= 7) throw new Error('mustHaves_max');
  const n = packet.mustHaves.length + 1;
  const id = `mh${n}`;
  const next = {
    ...packet,
    mustHaves: [...packet.mustHaves, { id, label: String(label).trim(), kind }],
    updatedAt: now(),
  };
  assertPacket(next);
  return next;
}

export function createNote({
  roleId,
  candId,
  pairId = null,
  ratings,
  decisionAid = 'none',
  companyContextUsed = [],
  reviewedBy = 'operator',
} = {}) {
  return {
    schema: NOTE_SCHEMA,
    roleId: String(roleId).trim(),
    candId: String(candId).trim(),
    pairId: pairId || null,
    ratings: (ratings || []).map((r) => ({
      mustHaveId: r.mustHaveId,
      rating: r.rating,
      evidence: String(r.evidence || '').trim(),
    })),
    decisionAid,
    companyContextUsed: Array.isArray(companyContextUsed) ? companyContextUsed : [],
    reviewedAt: now(),
    reviewedBy: String(reviewedBy || 'operator'),
  };
}

/** Project packet + optional note for match-review UI (pure). */
export function projectForReview(packet, note = null) {
  assertPacket(packet);
  if (note) assertNote(note, packet);
  return {
    roleId: packet.roleId,
    title: packet.title,
    companyId: packet.companyId,
    outcome90d: packet.outcome90d,
    stage: packet.stage,
    mustHaves: packet.mustHaves,
    dealBreakers: packet.dealBreakers || [],
    compBand: packet.compBand,
    note: note
      ? {
          candId: note.candId,
          ratings: note.ratings,
          decisionAid: note.decisionAid,
          reviewedAt: note.reviewedAt,
        }
      : null,
    score: null, // never invent a global score
  };
}

export function loadPackets() {
  const doc = loadStore(PACKETS_PATH, {
    schema: 'demigod.role-packets-store/1',
    updatedAt: null,
    packets: {},
  });
  if (!doc.packets || typeof doc.packets !== 'object') doc.packets = {};
  return doc;
}

export function loadNotes() {
  const doc = loadStore(NOTES_PATH, {
    schema: 'demigod.review-notes-store/1',
    updatedAt: null,
    notes: {},
  });
  if (!doc.notes || typeof doc.notes !== 'object') doc.notes = {};
  return doc;
}

export function upsertPacket(packet) {
  assertPacket(packet);
  return withFileLock(`${PACKETS_PATH}.lock`, () => {
    const doc = loadPackets();
    doc.packets[packet.roleId] = { ...packet, updatedAt: now() };
    doc.updatedAt = now();
    saveStore(PACKETS_PATH, doc);
    return doc.packets[packet.roleId];
  });
}

export function upsertNote(note, packet) {
  assertNote(note, packet);
  const key = `${note.roleId}|${note.candId}`;
  return withFileLock(`${NOTES_PATH}.lock`, () => {
    const doc = loadNotes();
    doc.notes[key] = note;
    doc.updatedAt = now();
    saveStore(NOTES_PATH, doc);
    return note;
  });
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`role-packet selftest: ${m}`);
  };
  const p = createPacket({
    roleId: 'role-demo-eng',
    title: 'Founding Engineer',
    companyId: 'yc:demo',
    outcome90d: 'Ship v1 of the core product with two design partners in 90 days.',
    demo: true,
  });
  assert(p.mustHaves.length === 3, 'default musts');
  assertPacket(p);

  let threw = false;
  try {
    createPacket({
      roleId: 'x',
      title: 'T',
      outcome90d: 'too short',
    });
  } catch {
    threw = true;
  }
  assert(threw, 'short outcome refused');

  const p2 = addMustHave(p, 'SF or hybrid presence', 'logistics');
  assert(p2.mustHaves.length === 4, 'add must');

  const ratings = p2.mustHaves.map((m, i) => ({
    mustHaveId: m.id,
    rating: i === 0 ? 'yes' : 'strong_yes',
    evidence: `Observed concrete evidence for ${m.label} in work samples.`,
  }));
  const note = createNote({
    roleId: p2.roleId,
    candId: 'cand-demo-1',
    ratings,
    decisionAid: 'changed_by_context',
    companyContextUsed: ['productSummary'],
  });
  assertNote(note, p2);

  threw = false;
  try {
    assertNote(
      createNote({
        roleId: p2.roleId,
        candId: 'c2',
        ratings: p2.mustHaves.map((m) => ({
          mustHaveId: m.id,
          rating: 'yes',
          evidence: 'short',
        })),
      }),
      p2,
    );
  } catch {
    threw = true;
  }
  assert(threw, 'short evidence refused');

  const proj = projectForReview(p2, note);
  assert(proj.score === null && proj.note.candId === 'cand-demo-1', 'project');

  const p3 = advanceStage(p2, 'reviewing');
  assert(p3.stage === 'reviewing', 'stage forward');
  let threw2 = false;
  try {
    advanceStage(p2, 'outcome');
  } catch {
    threw2 = true;
  }
  assert(threw2, 'skip stages refused');
  const withComp = setCompBand(p3, {
    text: '$180–220k',
    source: 'public_job_post',
    url: 'https://boards.greenhouse.io/demo/jobs/1',
    quote: 'Salary range $180,000 to $220,000 USD',
  });
  assert(withComp.compBand.quote.includes('180'), 'public comp');
  threw2 = false;
  try {
    setCompBand(p3, { text: '$1', source: 'public_job_post', url: 'http://insecure.example/', quote: 'short' });
  } catch {
    threw2 = true;
  }
  assert(threw2, 'bad public comp refused');

  // temp store
  const tmpP = path.join('/tmp', `dg-packets-${process.pid}.json`);
  saveStore(tmpP, { schema: 'demigod.role-packets-store/1', packets: { [p2.roleId]: p2 } });
  const loaded = JSON.parse(fs.readFileSync(tmpP, 'utf8'));
  assert(loaded.packets[p2.roleId].title === 'Founding Engineer', 'store');
  fs.unlinkSync(tmpP);

  console.log(JSON.stringify({ ok: true, selftest: 'role-packet' }));
}

function parseArgs(argv) {
  const o = { cmd: 'list', flags: {} };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--demo') o.flags.demo = true;
    else if (a.startsWith('--') && a.includes('=')) {
      const [k, ...v] = a.slice(2).split('=');
      o.flags[k] = v.join('=');
    } else if (a.startsWith('--') && argv[i + 1] && !argv[i + 1].startsWith('-')) {
      o.flags[a.slice(2)] = argv[++i];
    } else if (!a.startsWith('-')) rest.push(a);
  }
  if (rest[0]) o.cmd = rest[0];
  return o;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-role-packet.mjs list|show|init|add-must|note|project [--role=] …
Design: docs/die/ROLE-PACKET-DESIGN.md`);
    return;
  }
  const { cmd, flags } = parseArgs(args);

  if (cmd === 'list') {
    const doc = loadPackets();
    const rows = Object.values(doc.packets || {});
    console.log(`# role-packets · ${rows.length}`);
    for (const p of rows) {
      console.log(`- ${p.roleId} · ${p.title} · stage=${p.stage} · musts=${p.mustHaves?.length}`);
    }
    return;
  }

  if (cmd === 'show') {
    const id = flags.role;
    if (!id) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const p = loadPackets().packets[id];
    if (!p) {
      console.error(JSON.stringify({ ok: false, error: 'not found' }));
      process.exit(1);
    }
    console.log(JSON.stringify(p, null, 2));
    return;
  }

  if (cmd === 'init') {
    const p = createPacket({
      roleId: flags.role,
      title: flags.title,
      companyId: flags.company || flags.companyId || null,
      outcome90d: flags.outcome || flags.outcome90d,
      demo: Boolean(flags.demo),
      compBand: flags.comp
        ? { text: flags.comp, source: 'founder_stated', evidence: null }
        : null,
    });
    const saved = upsertPacket(p);
    console.log(JSON.stringify({ ok: true, roleId: saved.roleId, path: PACKETS_PATH }));
    return;
  }

  if (cmd === 'add-must') {
    const id = flags.role;
    const label = flags.label;
    if (!id || !label) {
      console.error(JSON.stringify({ ok: false, error: '--role and --label required' }));
      process.exit(1);
    }
    const cur = loadPackets().packets[id];
    if (!cur) {
      console.error(JSON.stringify({ ok: false, error: 'packet not found' }));
      process.exit(1);
    }
    const next = addMustHave(cur, label, flags.kind || 'skill');
    upsertPacket(next);
    console.log(JSON.stringify({ ok: true, mustHaves: next.mustHaves.length }));
    return;
  }

  if (cmd === 'note') {
    const id = flags.role;
    const cand = flags.cand;
    if (!id || !cand) {
      console.error(JSON.stringify({ ok: false, error: '--role and --cand required' }));
      process.exit(1);
    }
    const packet = loadPackets().packets[id];
    if (!packet) {
      console.error(JSON.stringify({ ok: false, error: 'packet not found' }));
      process.exit(1);
    }
    let ratings;
    if (flags.ratings) {
      ratings = JSON.parse(flags.ratings);
    } else {
      // default: yes + placeholder evidence for each must (operator should edit)
      ratings = packet.mustHaves.map((m) => ({
        mustHaveId: m.id,
        rating: 'yes',
        evidence: flags.evidence || `Reviewer note for ${m.label} — replace with specifics.`,
      }));
    }
    const note = createNote({
      roleId: id,
      candId: cand,
      pairId: flags.pair || null,
      ratings,
      decisionAid: flags.aid || 'none',
      reviewedBy: flags.by || 'operator',
    });
    upsertNote(note, packet);
    console.log(JSON.stringify({ ok: true, key: `${id}|${cand}`, path: NOTES_PATH }));
    return;
  }

  if (cmd === 'project') {
    const id = flags.role;
    const cand = flags.cand;
    const packet = loadPackets().packets[id];
    if (!packet) {
      console.error(JSON.stringify({ ok: false, error: 'packet not found' }));
      process.exit(1);
    }
    const note = cand ? loadNotes().notes[`${id}|${cand}`] : null;
    console.log(JSON.stringify(projectForReview(packet, note || null), null, 2));
    return;
  }

  if (cmd === 'stage') {
    const id = flags.role;
    const to = flags.to;
    if (!id || !to) {
      console.error(JSON.stringify({ ok: false, error: '--role and --to required' }));
      process.exit(1);
    }
    const cur = loadPackets().packets[id];
    if (!cur) {
      console.error(JSON.stringify({ ok: false, error: 'not found' }));
      process.exit(1);
    }
    try {
      const next = advanceStage(cur, to);
      upsertPacket(next);
      console.log(JSON.stringify({ ok: true, roleId: id, from: cur.stage, to: next.stage }));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  if (cmd === 'set-comp') {
    const id = flags.role;
    if (!id || !flags.text) {
      console.error(JSON.stringify({ ok: false, error: '--role and --text required' }));
      process.exit(1);
    }
    const cur = loadPackets().packets[id];
    if (!cur) {
      console.error(JSON.stringify({ ok: false, error: 'not found' }));
      process.exit(1);
    }
    try {
      const next = setCompBand(cur, {
        text: flags.text,
        source: flags.source || 'founder_stated',
        url: flags.url || null,
        quote: flags.quote || null,
      });
      upsertPacket(next);
      console.log(JSON.stringify({ ok: true, roleId: id, compBand: next.compBand }));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  console.error(JSON.stringify({ ok: false, error: `unknown cmd ${cmd}` }));
  process.exit(1);
}

if (isMain) main();
