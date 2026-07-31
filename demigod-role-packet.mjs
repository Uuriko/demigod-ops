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
/** Ashby-shaped interview moments (plan only — no scheduling product). */
export const INTERVIEW_MOMENTS = ['screen', 'tech', 'founder', 'debrief'];

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
  if (p.interviewPlan != null) {
    if (!Array.isArray(p.interviewPlan)) throw new Error('packet_interviewPlan');
    const mhIds = new Set(p.mustHaves.map((m) => m.id));
    for (const row of p.interviewPlan) {
      if (!row?.mustHaveId || !mhIds.has(row.mustHaveId)) {
        throw new Error('packet_interviewPlan_mustHave');
      }
      if (!INTERVIEW_MOMENTS.includes(row.moment)) throw new Error('packet_interviewPlan_moment');
      if (row.owner != null && String(row.owner).length > 80) {
        throw new Error('packet_interviewPlan_owner');
      }
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

/**
 * Map must-haves → interview moments (Ashby interview-plan shaped).
 * Default: first third → screen, middle → tech, last → founder; debrief optional.
 */
export function setInterviewPlan(packet, plan = null) {
  assertPacket(packet);
  let rows = plan;
  if (rows == null) {
    const mhs = packet.mustHaves;
    const n = mhs.length;
    const edge = Math.max(1, Math.floor(n / 3));
    rows = mhs.map((m, i) => {
      let moment = 'tech';
      if (i < edge) moment = 'screen';
      else if (i >= n - edge) moment = 'founder';
      return { mustHaveId: m.id, moment, owner: null };
    });
  }
  if (!Array.isArray(rows)) throw new Error('interviewPlan_not_array');
  const next = {
    ...packet,
    interviewPlan: rows.map((r) => ({
      mustHaveId: String(r.mustHaveId),
      moment: String(r.moment),
      owner: r.owner ? String(r.owner).trim().slice(0, 80) : null,
    })),
    updatedAt: now(),
  };
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

/** Ashby-shaped deal-breaker (human label only; not a score). */
export function addDealBreaker(packet, label) {
  assertPacket(packet);
  const list = Array.isArray(packet.dealBreakers) ? [...packet.dealBreakers] : [];
  if (list.length >= 10) throw new Error('dealBreakers_max');
  const text = String(label || '').trim();
  if (text.length < 4) throw new Error('dealBreaker_label_short');
  const n = list.length + 1;
  const next = {
    ...packet,
    dealBreakers: [...list, { id: `db${n}`, label: text.slice(0, 200) }],
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

/**
 * Ashby/BrightHire-shaped debrief roundup: aggregate review notes per must-have.
 * Optional callNotes: join attributesTouched evidence (manual only — no bot, no score).
 * No average hire score — surfaces disagreement + evidence only.
 */
export function debriefRoundup(packet, notes = [], { callNotes = [] } = {}) {
  assertPacket(packet);
  const roleNotes = (notes || []).filter((n) => n && n.roleId === packet.roleId);
  const roleCalls = (callNotes || []).filter(
    (n) => n && (!n.roleId || n.roleId === packet.roleId),
  );
  // BrightHire-thin: map call attribute evidence → must-have ids (never ratings/scores).
  const callByMust = new Map();
  for (const cn of roleCalls) {
    for (const a of cn.attributesTouched || []) {
      if (!a?.mustHaveId) continue;
      const list = callByMust.get(a.mustHaveId) || [];
      list.push({
        callNoteId: cn.id || null,
        kind: cn.kind || null,
        candId: cn.candId || null,
        evidence: String(a.evidence || '').slice(0, 200),
        at: cn.at || null,
      });
      callByMust.set(a.mustHaveId, list);
    }
  }
  const byMust = packet.mustHaves.map((m) => {
    const cells = [];
    for (const n of roleNotes) {
      const r = (n.ratings || []).find((x) => x.mustHaveId === m.id);
      if (!r) continue;
      cells.push({
        candId: n.candId,
        rating: r.rating,
        evidence: String(r.evidence || '').slice(0, 200),
        reviewedBy: n.reviewedBy || null,
        reviewedAt: n.reviewedAt || null,
      });
    }
    const tally = { strong_no: 0, no: 0, yes: 0, strong_yes: 0 };
    for (const c of cells) {
      if (tally[c.rating] != null) tally[c.rating] += 1;
    }
    const distinct = new Set(cells.map((c) => c.rating));
    const callEv = (callByMust.get(m.id) || []).slice(0, 8);
    return {
      mustHaveId: m.id,
      label: m.label,
      n: cells.length,
      tally,
      disagree: distinct.size > 1,
      cells,
      callEvidenceN: callEv.length,
      callEvidence: callEv,
    };
  });
  const aidTally = {
    changed_by_context: 0,
    missing_question: 0,
    error_prevented: 0,
    none: 0,
  };
  for (const n of roleNotes) {
    const a = n.decisionAid || 'none';
    if (aidTally[a] != null) aidTally[a] += 1;
    else aidTally.none += 1;
  }
  const callKindTally = { intake: 0, candidate_screen: 0, debrief: 0 };
  for (const cn of roleCalls) {
    if (callKindTally[cn.kind] != null) callKindTally[cn.kind] += 1;
  }
  // Lever/Ashby-thin: coverage of scorecard rows (not a hire score). Unrated must-haves stay visible.
  const unratedMustHaves = byMust
    .filter((m) => m.n === 0)
    .map((m) => ({ mustHaveId: m.mustHaveId, label: m.label }));
  const disagreeCount = byMust.filter((m) => m.disagree).length;
  const ratedMustHaves = byMust.filter((m) => m.n > 0).length;
  const callLinkedMustHaves = byMust.filter((m) => m.callEvidenceN > 0).length;
  // GoodTime-thin (no scheduler): which planned interview moments still lack any scorecard note.
  const planRows = Array.isArray(packet.interviewPlan) ? packet.interviewPlan : [];
  const byMoment = new Map();
  for (const row of planRows) {
    if (!row?.moment || !row?.mustHaveId) continue;
    const list = byMoment.get(row.moment) || [];
    list.push(row.mustHaveId);
    byMoment.set(row.moment, list);
  }
  const momentCoverage = [];
  for (const moment of INTERVIEW_MOMENTS) {
    const ids = byMoment.get(moment);
    if (!ids?.length) continue;
    const unratedIds = ids.filter((id) => {
      const row = byMust.find((m) => m.mustHaveId === id);
      return !row || row.n === 0;
    });
    momentCoverage.push({
      moment,
      planned: ids.length,
      rated: ids.length - unratedIds.length,
      unratedMustHaveIds: unratedIds,
    });
  }
  const momentsWithoutNotes = momentCoverage.filter((m) => m.rated === 0).map((m) => m.moment);
  return {
    schema: 'demigod.debrief-roundup/1',
    roleId: packet.roleId,
    title: packet.title,
    stage: packet.stage,
    noteCount: roleNotes.length,
    callNoteCount: roleCalls.length,
    callKindTally,
    candidates: [...new Set(roleNotes.map((n) => n.candId))],
    byMustHave: byMust,
    unratedMustHaves,
    disagreeCount,
    coverage: {
      ratedMustHaves,
      totalMustHaves: byMust.length,
      callLinkedMustHaves,
      complete: byMust.length > 0 && unratedMustHaves.length === 0 && roleNotes.length > 0,
    },
    interviewPlanPresent: planRows.length > 0,
    momentCoverage,
    momentsWithoutNotes,
    decisionAids: roleNotes.map((n) => ({
      candId: n.candId,
      decisionAid: n.decisionAid || 'none',
    })),
    decisionAidTally: aidTally,
    score: null,
    policy:
      'Debrief over average — no hire score; disagreement is a feature; unrated must-haves listed; call evidence is manual only (no bot); momentCoverage is plan feedback gaps only (no scheduler).',
  };
}

/**
 * Ashby-analytics-thin: cross-packet scorecard / plan coverage as counts only.
 * No completion rate, time-to-fill, hire score, or employee performance graph.
 */
export function scorecardLandscape(packets = [], notes = [], { callNotes = [] } = {}) {
  let packetsN = 0;
  let withPlan = 0;
  let withNotes = 0;
  let complete = 0;
  let withDisagree = 0;
  let withEmptyMoments = 0;
  let emptyMomentsTotal = 0;
  let unratedMustHaves = 0;
  let ratedMustHaves = 0;
  let totalMustHaves = 0;
  let noteCount = 0;
  for (const p of packets || []) {
    if (!p?.roleId) continue;
    packetsN += 1;
    try {
      const d = debriefRoundup(p, notes, { callNotes });
      if (d.interviewPlanPresent) withPlan += 1;
      if ((d.noteCount || 0) > 0) withNotes += 1;
      noteCount += d.noteCount || 0;
      if (d.coverage?.complete) complete += 1;
      if ((d.disagreeCount || 0) > 0) withDisagree += 1;
      const empty = d.momentsWithoutNotes || [];
      if (empty.length > 0) {
        withEmptyMoments += 1;
        emptyMomentsTotal += empty.length;
      }
      unratedMustHaves += (d.unratedMustHaves || []).length;
      ratedMustHaves += d.coverage?.ratedMustHaves || 0;
      totalMustHaves += d.coverage?.totalMustHaves || 0;
    } catch {
      /* skip corrupt packets — landscape is observational */
    }
  }
  return {
    packets: packetsN,
    withPlan,
    withNotes,
    complete,
    withDisagree,
    withEmptyMoments,
    emptyMomentsTotal,
    unratedMustHaves,
    ratedMustHaves,
    totalMustHaves,
    noteCount,
  };
}

/**
 * Ashby/Lever-thin: cross-note rating-cell landscape as counts only.
 * Tallies evidence ratings given — never averages, pass rates, or hire scores.
 */
export function ratingLandscape(notes = []) {
  const byRating = Object.fromEntries(RATINGS.map((r) => [r, 0]));
  let notesN = 0;
  let cells = 0;
  let other = 0;
  for (const n of notes || []) {
    if (!n || !Array.isArray(n.ratings)) continue;
    notesN += 1;
    for (const r of n.ratings) {
      if (!r) continue;
      cells += 1;
      if (byRating[r.rating] != null) byRating[r.rating] += 1;
      else other += 1;
    }
  }
  return {
    notes: notesN,
    cells,
    byRating,
    other,
  };
}

/**
 * Lever/Ashby-thin: cross-packet interview-kit landscape (must-haves + deal-breakers).
 * Counts only — no kit quality score, hire score, or attribute ranking.
 */
export function kitLandscape(packets = []) {
  let packetsN = 0;
  let mustHaves = 0;
  let dealBreakers = 0;
  let withDealBreakers = 0;
  const byKind = {};
  for (const p of packets || []) {
    if (!p?.roleId) continue;
    packetsN += 1;
    const mhs = Array.isArray(p.mustHaves) ? p.mustHaves : [];
    mustHaves += mhs.length;
    for (const m of mhs) {
      const k = String(m?.kind || 'skill');
      byKind[k] = (byKind[k] || 0) + 1;
    }
    const dbs = Array.isArray(p.dealBreakers) ? p.dealBreakers : [];
    dealBreakers += dbs.length;
    if (dbs.length > 0) withDealBreakers += 1;
  }
  return {
    packets: packetsN,
    mustHaves,
    dealBreakers,
    withDealBreakers,
    withoutDealBreakers: Math.max(0, packetsN - withDealBreakers),
    byKind,
  };
}

/**
 * Lever/Ashby-thin: cross-note decision-aid landscape as counts only.
 * Observes how reviewers tagged aids — never a quality/hire score.
 */
export function decisionAidLandscape(notes = []) {
  const byAid = Object.fromEntries(DECISION_AIDS.map((a) => [a, 0]));
  let total = 0;
  let other = 0;
  for (const n of notes || []) {
    if (!n || (n.id == null && n.roleId == null && n.candId == null)) continue;
    total += 1;
    const aid = n.decisionAid || 'none';
    if (byAid[aid] != null) byAid[aid] += 1;
    else other += 1;
  }
  return {
    total,
    byAid,
    other,
  };
}

/**
 * Ashby-pipeline-thin: cross-packet stage landscape as counts only.
 * No time-in-stage, conversion rates, or hire funnel scores.
 */
export function stageLandscape(packets = []) {
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  let packetsN = 0;
  let unknown = 0;
  for (const p of packets || []) {
    if (!p?.roleId) continue;
    packetsN += 1;
    const st = p.stage;
    if (byStage[st] != null) byStage[st] += 1;
    else unknown += 1;
  }
  return {
    packets: packetsN,
    byStage,
    unknown,
  };
}

/**
 * Levels/Pave-thin: cross-packet comp-band source landscape as counts only.
 * Never pay scores, market percentiles, or inferred bands without quote/source.
 */
export function compBandLandscape(packets = []) {
  const bySource = {
    public_job_post: 0,
    founder_stated: 0,
    unknown: 0,
    none: 0,
  };
  let packetsN = 0;
  let withBand = 0;
  let withUrl = 0;
  let withQuote = 0;
  for (const p of packets || []) {
    if (!p?.roleId) continue;
    packetsN += 1;
    const b = p.compBand;
    if (!b || !String(b.text || '').trim()) {
      bySource.none += 1;
      continue;
    }
    withBand += 1;
    const src = COMP_SOURCES.includes(b.source) ? b.source : 'unknown';
    bySource[src] += 1;
    if (String(b.url || '').trim()) withUrl += 1;
    if (String(b.quote || '').trim()) withQuote += 1;
  }
  return {
    packets: packetsN,
    withBand,
    withoutBand: bySource.none,
    withUrl,
    withQuote,
    bySource,
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
    interviewPlan: packet.interviewPlan || null,
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

  const planned = setInterviewPlan(withComp);
  assert(Array.isArray(planned.interviewPlan) && planned.interviewPlan.length === withComp.mustHaves.length, 'plan len');
  assert(planned.interviewPlan.every((r) => INTERVIEW_MOMENTS.includes(r.moment)), 'plan moments');
  threw2 = false;
  try {
    setInterviewPlan(withComp, [{ mustHaveId: 'nope', moment: 'screen' }]);
  } catch {
    threw2 = true;
  }
  assert(threw2, 'bad plan refused');

  const round = debriefRoundup(p2, [note]);
  assert(round.schema === 'demigod.debrief-roundup/1' && round.score === null, 'debrief');
  assert(round.byMustHave.length === p2.mustHaves.length && round.noteCount === 1, 'debrief rows');
  assert(round.decisionAidTally?.changed_by_context === 1, 'decisionAid tally');
  assert(typeof round.disagreeCount === 'number', 'disagreeCount');
  assert(Array.isArray(round.unratedMustHaves), 'unratedMustHaves list');
  assert(round.coverage && typeof round.coverage.ratedMustHaves === 'number', 'coverage shape');
  assert(typeof round.interviewPlanPresent === 'boolean', 'interviewPlanPresent');
  // Second note missing one must-have rating → unrated stays honest when no cells.
  const emptyRound = debriefRoundup(p2, []);
  assert(emptyRound.unratedMustHaves.length === p2.mustHaves.length, 'no notes → all unrated');
  assert(emptyRound.coverage.complete === false, 'empty debrief not complete');
  // BrightHire-thin: call attributesTouched join without ratings/scores.
  const mh0 = p2.mustHaves[0].id;
  const withCalls = debriefRoundup(p2, [note], {
    callNotes: [
      {
        id: 'cn1',
        kind: 'candidate_screen',
        roleId: p2.roleId,
        candId: 'c-x',
        at: '2026-07-28T00:00:00.000Z',
        attributesTouched: [{ mustHaveId: mh0, evidence: 'talked systems design for 20 minutes' }],
      },
    ],
  });
  assert(withCalls.callNoteCount === 1 && withCalls.callKindTally.candidate_screen === 1, 'call counts');
  assert(
    withCalls.byMustHave.some((m) => m.mustHaveId === mh0 && m.callEvidenceN === 1),
    'call evidence linked to must-have',
  );
  assert(withCalls.coverage.callLinkedMustHaves >= 1, 'coverage call-linked');
  // GoodTime-thin: planned moments with zero notes surface as momentsWithoutNotes (no scheduler).
  const planned2 = setInterviewPlan(p2); // default plan on must-haves
  const emptyMoments = debriefRoundup(planned2, []);
  assert(Array.isArray(emptyMoments.momentCoverage), 'momentCoverage list');
  assert(emptyMoments.momentCoverage.length >= 1, 'plan → momentCoverage rows');
  assert(
    emptyMoments.momentsWithoutNotes.length === emptyMoments.momentCoverage.length,
    'no notes → every planned moment empty',
  );
  const partialMoments = debriefRoundup(planned2, [note]);
  assert(
    partialMoments.momentsWithoutNotes.length < emptyMoments.momentsWithoutNotes.length ||
      partialMoments.momentCoverage.every((m) => m.rated > 0),
    'notes shrink empty moments or fill all',
  );
  assert(withCalls.score === null, 'calls never introduce score');
  // Ashby-analytics-thin scorecard landscape (counts only; no rates/scores).
  const landEmpty = scorecardLandscape([planned2], []);
  assert(landEmpty.packets === 1 && landEmpty.withPlan === 1, 'landscape plan count');
  assert(landEmpty.withNotes === 0 && landEmpty.complete === 0, 'landscape empty notes');
  assert(landEmpty.unratedMustHaves >= 1, 'landscape unrated musts');
  assert(!('completionRate' in landEmpty) && !('score' in landEmpty), 'landscape no rates/score');
  const landNotes = scorecardLandscape([planned2], [note]);
  assert(landNotes.withNotes === 1 && landNotes.noteCount === 1, 'landscape note counts');
  assert(landNotes.ratedMustHaves >= 1, 'landscape rated after note');
  // Levels/Pave-thin comp band landscape (counts only; no pay scores).
  const noComp = compBandLandscape([planned2]);
  assert(noComp.packets === 1 && noComp.withoutBand === 1 && noComp.withBand === 0, 'comp none');
  assert(noComp.bySource.none === 1, 'comp bySource.none');
  const withPublic = setCompBand(planned2, {
    text: '$180–220k + equity',
    source: 'public_job_post',
    url: 'https://jobs.ashbyhq.com/demo/role-1',
    quote: 'Base salary range $180,000 – $220,000 USD',
  });
  const landComp = compBandLandscape([withPublic, planned2]);
  assert(landComp.withBand === 1 && landComp.bySource.public_job_post === 1, 'comp public count');
  assert(landComp.withUrl === 1 && landComp.withQuote === 1, 'comp url+quote counts');
  assert(landComp.withoutBand === 1, 'comp mixed without');
  assert(!('percentile' in landComp) && !('score' in landComp) && !('marketRate' in landComp), 'comp no scores');
  // Ashby-pipeline-thin stage landscape (counts only; no conversion rates).
  const stagesLand = stageLandscape([
    { roleId: 'a', stage: 'brief_ready' },
    { roleId: 'b', stage: 'reviewing' },
    { roleId: 'c', stage: 'reviewing' },
    { roleId: 'd', stage: 'intro' },
  ]);
  assert(stagesLand.packets === 4, 'stage packets');
  assert(stagesLand.byStage.brief_ready === 1 && stagesLand.byStage.reviewing === 2, 'stage byStage');
  assert(stagesLand.byStage.intro === 1 && stagesLand.byStage.outcome === 0, 'stage intro/outcome');
  assert(stagesLand.unknown === 0, 'stage unknown');
  assert(!('conversionRate' in stagesLand) && !('timeInStage' in stagesLand) && !('score' in stagesLand), 'stage no rates');
  // Lever/Ashby-thin decision-aid landscape (counts only; no quality score).
  const aidsLand = decisionAidLandscape([
    note,
    { id: 'n2', roleId: 'r', candId: 'c2', decisionAid: 'missing_question' },
    { id: 'n3', roleId: 'r', candId: 'c3', decisionAid: 'none' },
  ]);
  assert(aidsLand.total === 3, 'decisionAid total');
  assert(aidsLand.byAid.changed_by_context === 1, 'decisionAid changed_by_context');
  assert(aidsLand.byAid.missing_question === 1 && aidsLand.byAid.none === 1, 'decisionAid missing/none');
  assert(aidsLand.byAid.error_prevented === 0 && aidsLand.other === 0, 'decisionAid empty bins');
  assert(!('qualityScore' in aidsLand) && !('score' in aidsLand), 'decisionAid no scores');
  // Lever/Ashby-thin kit landscape (must-have + deal-breaker counts only).
  const kitBare = kitLandscape([p2]);
  assert(kitBare.packets === 1 && kitBare.mustHaves >= 3, 'kit mustHaves');
  assert(kitBare.dealBreakers === 0 && kitBare.withoutDealBreakers === 1, 'kit no db yet');
  assert(kitBare.byKind && typeof kitBare.byKind.skill === 'number', 'kit byKind');
  assert(!('score' in kitBare) && !('qualityScore' in kitBare), 'kit no scores');
  // Ashby/Lever-thin rating landscape (cell counts only; no averages/pass rates).
  const rateLand = ratingLandscape([note]);
  assert(rateLand.notes === 1 && rateLand.cells >= 3, 'rating notes/cells');
  assert(
    rateLand.byRating.yes + rateLand.byRating.strong_yes + rateLand.byRating.no + rateLand.byRating.strong_no ===
      rateLand.cells,
    'rating byRating sums to cells',
  );
  assert(rateLand.other === 0, 'rating other empty');
  assert(
    !('average' in rateLand) && !('passRate' in rateLand) && !('score' in rateLand),
    'rating no averages/scores',
  );
  const withDb = addDealBreaker(p2, 'Requires full remote outside US');
  assert(withDb.dealBreakers.length === 1 && withDb.dealBreakers[0].id === 'db1', 'deal-breaker');
  const kitDb = kitLandscape([withDb]);
  assert(kitDb.dealBreakers === 1 && kitDb.withDealBreakers === 1, 'kit with deal-breaker');
  assert(kitDb.withoutDealBreakers === 0, 'kit all have db');
  let threwDb = false;
  try {
    addDealBreaker(p2, 'x');
  } catch {
    threwDb = true;
  }
  assert(threwDb, 'short deal-breaker refused');

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
    console.log(`usage: node demigod-role-packet.mjs list|show|init|add-must|add-deal|note|project|stage|set-comp|set-plan|debrief [--role=] …
  set-plan  map must-haves → screen|tech|founder|debrief (Ashby interview plan; no scheduling)
  add-deal  human deal-breaker label (not a score)
  debrief   aggregate review notes per must-have (no hire score)
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

  if (cmd === 'add-deal') {
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
    try {
      const next = addDealBreaker(cur, label);
      upsertPacket(next);
      console.log(JSON.stringify({ ok: true, dealBreakers: next.dealBreakers }));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
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

  if (cmd === 'set-plan') {
    const id = flags.role;
    if (!id) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const cur = loadPackets().packets[id];
    if (!cur) {
      console.error(JSON.stringify({ ok: false, error: 'not found' }));
      process.exit(1);
    }
    try {
      let plan = null;
      if (flags.plan) plan = JSON.parse(flags.plan);
      const next = setInterviewPlan(cur, plan);
      upsertPacket(next);
      console.log(
        JSON.stringify({
          ok: true,
          roleId: id,
          interviewPlan: next.interviewPlan,
        }),
      );
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  if (cmd === 'debrief') {
    const id = flags.role;
    if (!id) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const packet = loadPackets().packets[id];
    if (!packet) {
      console.error(JSON.stringify({ ok: false, error: 'not found' }));
      process.exit(1);
    }
    const notes = Object.values(loadNotes().notes || {}).filter((n) => n.roleId === id);
    console.log(JSON.stringify(debriefRoundup(packet, notes), null, 2));
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
