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
 *   node demigod-role-packet.mjs kit --role=ID [--json]   # interviewer kit: questions + anchors
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

/**
 * Past-behavior questions + descriptively anchored rating scales, per competency KIND.
 *
 * The packet already had the content half of a structured interview (competencies, a
 * competency→interviewer map, evidence required per competency) and a bare 4-point scale. The
 * evaluation half — what to ASK, and what each rating LOOKS like — was missing, and that half is
 * where the validity lives: structured interviews run at rho .42 against .19 unstructured, same
 * hour and same interviewer, and past-behavior questions scored against descriptive anchors reach
 * .63 where situational questions reach .47. See docs/DEMIGOD-ASSESSMENT-METHODS-RESEARCH.md §5.
 *
 * Past behaviour ("what did you do") over situational ("what would you do") on purpose: situational
 * validity degrades as job complexity rises, past-behaviour validity does not.
 *
 * Anchors describe OBSERVABLE EVIDENCE — what the candidate said and whether it was first-hand,
 * specific and at scope. They never describe a trait, a personality, or a "fit". A kit is an
 * interviewer aid; it produces no score, no ranking and no verdict.
 *
 * ponytail: one generic bank per kind, label-interpolated. A search lead writing role-specific
 * anchors at kickoff beats these; upgrade by editing the printed markdown, which is why the kit is
 * derived output and not stored state.
 */
export const KIT_BANK = {
  skill: {
    questions: [
      'Tell me about the most recent time you did work like "{label}". What was the situation, what did you personally do, and how did it turn out?',
      'Walk me through a specific example where "{label}" was the hard part. What did you try first, and what did you change?',
    ],
    anchors: {
      strong_no: 'No example offered, or the example is hypothetical or second-hand ("we would", "the team did") with no personal action described.',
      no: 'An example is offered, but their own actions stay vague, or the work described is materially simpler than this role.',
      yes: 'A specific first-hand example at roughly this role\'s scope: names the situation, what they personally did, and the outcome.',
      strong_yes: 'As "yes", and they volunteer what went wrong or what they would do differently now, at or above this role\'s scope.',
    },
  },
  trait: {
    questions: [
      'Tell me about a specific time "{label}" was actually tested. What happened, what did you do, and what was the result?',
      'Describe a time that went badly. What did you do differently afterwards?',
    ],
    anchors: {
      strong_no: 'No concrete instance — only self-description ("I am the kind of person who…") or a restatement of the requirement.',
      no: 'An instance is named but stays general; the specific decision or action they took is not recoverable from the answer.',
      yes: 'A specific instance with their own decision and its consequence, told concretely enough to check.',
      strong_yes: 'As "yes", and the example includes a cost they carried or a correction they made, not only a success.',
    },
  },
  _default: {
    questions: [
      'Tell me about a specific time "{label}" mattered in your work. What was the situation, what did you personally do, and how did it turn out?',
    ],
    anchors: {
      strong_no: 'No example offered, or the answer is hypothetical rather than something that happened.',
      no: 'An example is offered but their personal contribution is unclear.',
      yes: 'A specific first-hand example: situation, their own actions, outcome.',
      strong_yes: 'As "yes", plus what they would do differently, at or above this role\'s scope.',
    },
  },
};

/**
 * Pure: derive the interviewer kit for a packet. Never mutates, never stores, never scores.
 * `complete` is the gate's subject — false for a packet with no competencies, so an empty kit can
 * never read as a ready one.
 */
export function interviewKit(packet) {
  assertPacket(packet);
  const planBy = new Map((packet.interviewPlan || []).map((r) => [r.mustHaveId, r]));
  const fill = (s, label) => String(s).split('{label}').join(label);
  const rows = packet.mustHaves.map((m) => {
    const bank = KIT_BANK[m.kind] || KIT_BANK._default;
    const slot = planBy.get(m.id) || {};
    return {
      mustHaveId: m.id,
      label: m.label,
      kind: m.kind,
      moment: slot.moment || null,
      owner: slot.owner || null,
      questions: bank.questions.map((q) => fill(q, m.label)),
      anchors: Object.fromEntries(RATINGS.map((r) => [r, fill(bank.anchors[r], m.label)])),
    };
  });
  const covered = (row) =>
    row.questions.length > 0 && RATINGS.every((r) => String(row.anchors[r] || '').trim().length > 0);
  return {
    roleId: packet.roleId,
    title: packet.title,
    rows,
    complete: rows.length > 0 && rows.every(covered),
    uncovered: rows.filter((r) => !covered(r)).map((r) => r.mustHaveId),
  };
}

/** Render a kit as markdown an interviewer reads during the call. Output only — not a record. */
export function renderKitMarkdown(kit) {
  const out = [`# Interview kit — ${kit.title} (${kit.roleId})`, ''];
  out.push('Ask every candidate the same questions in the same order, and score each competency');
  out.push('against the anchors below **before** the debrief. The anchors are what make this a');
  out.push('structured interview rather than a conversation; skipping them gives up most of the value.');
  out.push('');
  out.push('This kit is an interviewer aid. It produces no score, no ranking and no recommendation,');
  out.push('and nothing in it may be used to reject a candidate automatically. The hiring decision,');
  out.push('and the evidence behind it, stay with the humans in the room.');
  out.push('');
  for (const row of kit.rows) {
    const where = row.moment ? ` · ${row.moment}` : '';
    const who = row.owner ? ` · ${row.owner}` : '';
    out.push(`## ${row.label}`, `_${row.mustHaveId} · ${row.kind}${where}${who}_`, '');
    out.push('**Ask**');
    for (const q of row.questions) out.push(`- ${q}`);
    out.push('', '**Score against**');
    for (const r of RATINGS) out.push(`- \`${r}\` — ${row.anchors[r]}`);
    out.push('');
  }
  if (!kit.complete) out.push(`> INCOMPLETE — no anchors for: ${kit.uncovered.join(', ') || '(no competencies on this packet)'}`, '');
  return out.join('\n');
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
 * Ashby-shaped debrief roundup: aggregate review notes per must-have.
 * No average hire score — surfaces disagreement + evidence only.
 */
export function debriefRoundup(packet, notes = []) {
  assertPacket(packet);
  const roleNotes = (notes || []).filter((n) => n && n.roleId === packet.roleId);
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
    return {
      mustHaveId: m.id,
      label: m.label,
      n: cells.length,
      tally,
      disagree: distinct.size > 1,
      cells,
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
  return {
    schema: 'demigod.debrief-roundup/1',
    roleId: packet.roleId,
    title: packet.title,
    stage: packet.stage,
    noteCount: roleNotes.length,
    candidates: [...new Set(roleNotes.map((n) => n.candId))],
    byMustHave: byMust,
    decisionAids: roleNotes.map((n) => ({
      candId: n.candId,
      decisionAid: n.decisionAid || 'none',
    })),
    decisionAidTally: aidTally,
    score: null,
    policy: 'Debrief over average — no hire score; disagreement is a feature.',
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
  const withDb = addDealBreaker(p2, 'Requires full remote outside US');
  assert(withDb.dealBreakers.length === 1 && withDb.dealBreakers[0].id === 'db1', 'deal-breaker');
  let threwDb = false;
  try {
    addDealBreaker(p2, 'x');
  } catch {
    threwDb = true;
  }
  assert(threwDb, 'short deal-breaker refused');

  // interview kit — the evaluation half. Every competency must get a question AND an anchor for
  // EVERY rating, or the interviewer is back to scoring against a bare label.
  const kit = interviewKit(p2);
  assert(kit.rows.length === p2.mustHaves.length, 'kit covers every mustHave');
  assert(kit.complete && kit.uncovered.length === 0, 'kit complete: ' + JSON.stringify(kit.uncovered));
  for (const row of kit.rows) {
    assert(row.questions.length > 0, `kit question for ${row.mustHaveId}`);
    // At least one question must name the competency being scored — a generic follow-up probe
    // ("describe a time that went badly") is legitimate, a kit of only generic probes is not.
    assert(row.questions.some((q) => q.includes(row.label)), `kit question names the competency: ${row.mustHaveId}`);
    assert(!row.questions.some((q) => q.includes('{label}')), `kit question interpolated: ${row.mustHaveId}`);
    for (const r of RATINGS) assert(String(row.anchors[r] || '').trim(), `kit anchor ${r} for ${row.mustHaveId}`);
  }
  // Past behaviour, not situational — the format choice is the validity claim, so pin it.
  assert(
    kit.rows.every((row) => row.questions.some((q) => /Tell me about|Walk me through|Describe a time/i.test(q))),
    'kit asks what they DID, not what they would do',
  );
  // Vacuous-green guards. `complete` is an .every() over rows, which is TRUE on an empty list —
  // so prove both that an empty kit is unreachable and that `complete` can actually go false.
  let threwBare = false;
  try {
    interviewKit({ ...p2, mustHaves: [] });
  } catch {
    threwBare = true;
  }
  assert(threwBare, 'a packet with no competencies is refused outright — an empty kit is unreachable');
  {
    // Break one anchor in the bank and watch `complete` flip. Without this the assertion above
    // would still pass if coverage stopped being checked at all.
    const kind = p2.mustHaves[0].kind;
    const bank = KIT_BANK[kind] || KIT_BANK._default;
    const keep = bank.anchors.strong_yes;
    bank.anchors.strong_yes = '   ';
    const broken = interviewKit(p2);
    bank.anchors.strong_yes = keep;
    assert(broken.complete === false, 'a missing anchor makes the kit INCOMPLETE (coverage is really checked)');
    assert(broken.uncovered.length > 0, 'an incomplete kit names which competencies lack anchors');
    assert(renderKitMarkdown(broken).includes('INCOMPLETE'), 'an incomplete kit renders as incomplete');
    assert(interviewKit(p2).complete === true, 'bank restored — kit complete again');
  }
  // A kit is an aid, not a decision — it must never emit a score or a recommendation.
  const md = renderKitMarkdown(kit);
  assert(md.includes('no score, no ranking and no recommendation'), 'kit markdown states the decision boundary');
  assert(!/\b(fit\s*score|recommend(ed|ation)?:|overall score|hire|do not hire)\b/i.test(md), 'kit markdown carries no verdict');
  assert(RATINGS.every((r) => md.includes(r)), 'kit markdown shows every rating anchor');

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
    console.log(`usage: node demigod-role-packet.mjs list|show|init|add-must|add-deal|note|project|stage|set-comp|set-plan|kit|debrief [--role=] …
  set-plan  map must-haves → screen|tech|founder|debrief (Ashby interview plan; no scheduling)
  kit       render past-behavior questions + anchored ratings (no score or verdict)
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

  if (cmd === 'kit') {
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
    const kit = interviewKit(cur);
    if (args.includes('--json')) console.log(JSON.stringify(kit, null, 2));
    else console.log(renderKitMarkdown(kit));
    if (!kit.complete) process.exitCode = 1; // an incomplete kit is not a usable one
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
