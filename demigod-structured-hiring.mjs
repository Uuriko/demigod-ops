#!/usr/bin/env node
/**
 * demigod-structured-hiring — compose Ashby packet + Underdog batch + Gem rediscover.
 *
 * One operator view over the three technical product modules.
 *
 *   node demigod-structured-hiring.mjs status [--json]
 *   node demigod-structured-hiring.mjs desk --role=ID [--json]
 *   node demigod-structured-hiring.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadPackets,
  loadNotes,
  projectForReview,
  advanceStage,
  upsertPacket,
  debriefRoundup,
  scorecardLandscape,
  compBandLandscape,
  stageLandscape,
  decisionAidLandscape,
  kitLandscape,
  ratingLandscape,
  assertPacket,
  assertNote,
} from './demigod-role-packet.mjs';
import {
  rediscover,
  makeTouch,
  appendTouch,
  assertTouch,
  touchChannelTally,
  rediscoverLandscape,
} from './demigod-candidate-touch.mjs';
import {
  openBatch,
  addCandidate,
  upsertBatch,
  activeCount as batchActive,
  terminalCandIds,
  batchSeatLandscape,
} from './demigod-pilot-batch.mjs';
import {
  warmPaths,
  listPaths as listIntroPaths,
  assertPath as assertIntroPath,
  introStrengthTally,
} from './demigod-intro-path.mjs';
import { listCallNotes, assertCallNote, callKindTally } from './demigod-call-note.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const OUT = path.join(BUSY, 'structured-hiring-status.json');
const AUDIT_OUT = path.join(BUSY, 'structured-hiring-audit.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function loadBatchStore() {
  const p = path.join(ROOT, 'DEMIGOD-PILOT-BATCHES.json');
  if (!fs.existsSync(p)) return { batches: {} };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadTouchStore() {
  const p = path.join(ROOT, 'DEMIGOD-CANDIDATE-TOUCHES.json');
  if (!fs.existsSync(p)) return { touches: [] };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadIntroStore() {
  const p = path.join(ROOT, 'DEMIGOD-INTRO-PATHS.json');
  if (!fs.existsSync(p)) return { paths: [] };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function batchActiveCount(b) {
  return (b?.candidates || []).filter((c) => !c.state || c.state === 'active').length;
}

export function buildStatus() {
  const packets = loadPackets();
  const notes = loadNotes();
  const batches = loadBatchStore();
  const touches = loadTouchStore();
  const intros = loadIntroStore();
  const packetList = Object.values(packets.packets || {});
  const noteList = Object.values(notes.notes || {});
  const batchList = Object.values(batches.batches || {});
  const touchList = touches.touches || [];
  const pathList = intros.paths || [];
  const callNotes = listCallNotes({ limit: 500 });

  return {
    schema: 'demigod.structured-hiring/1',
    at: new Date().toISOString(),
    inspiredBy: [
      'Ashby/Greenhouse scorecards',
      'Underdog/Wellfound batch caps',
      'Gem rediscovery',
      'Affinity intro paths (manual)',
      'Metaview call notes (manual)',
      'Levels public job-post bands',
      'Ashby analytics seat tallies (counts only)',
      'Gem touch channel tallies (counts only)',
      'Karat/Metaview call kind tallies (manual only)',
      'Affinity intro strength tallies (ordinal counts only)',
      'Ashby scorecard coverage landscape (counts only)',
      'Levels public-comp band landscape (counts only)',
      'Ashby pipeline stage landscape (counts only)',
      'Lever decision-aid landscape (counts only)',
      'Lever/Ashby interview-kit landscape (counts only)',
      'Ashby rating-cell landscape (counts only)',
      'Gem rediscover pool landscape (counts only)',
    ],
    counts: {
      packets: packetList.length,
      reviewNotes: noteList.length,
      batches: batchList.length,
      activeBatchSlots: batchList.reduce((s, b) => s + batchActiveCount(b), 0),
      touches: touchList.length,
      introPaths: pathList.length,
      callNotes: callNotes.length,
    },
    // Ashby-analytics-thin: pipeline seat states as counts (no conversion rates / hire scores).
    batchSeats: batchSeatLandscape(batchList),
    // Gem-analytics-thin: owned-touch channels as counts (no engagement/fit score).
    touchChannels: touchChannelTally(touchList),
    // Gem-rediscover-thin: owned-history pool vs terminal suppress (counts only; no match score).
    rediscoverPool: rediscoverLandscape(touchList, {
      suppress: batchList.reduce((s, b) => {
        for (const id of terminalCandIds(b)) s.add(id);
        return s;
      }, new Set()),
    }),
    // Karat-thin: manual call kinds only (no outsourced interview product / quality score).
    callKinds: callKindTally(callNotes),
    // Affinity-thin: ordinal strength + decay counts (never relationship score product).
    introStrengths: introStrengthTally(pathList),
    // Ashby-analytics-thin: scorecard/plan coverage across packets (counts only; no completion rate).
    scorecards: scorecardLandscape(packetList, noteList, { callNotes }),
    // Levels/Pave-thin: quote-gated band source landscape (counts only; no pay percentiles).
    compBands: compBandLandscape(packetList),
    // Ashby-pipeline-thin: role packet stages as counts only (no time-in-stage / conversion).
    stages: stageLandscape(packetList),
    // Lever/Ashby-thin: decision-aid tags on review notes (counts only; no quality score).
    decisionAids: decisionAidLandscape(noteList),
    // Lever/Ashby-thin: must-have + deal-breaker kit sizes (counts only; no kit quality score).
    kits: kitLandscape(packetList),
    // Ashby/Lever-thin: evidence rating cells as counts only (no average/passRate/hire score).
    ratings: ratingLandscape(noteList),
    packets: packetList.map((p) => ({
      roleId: p.roleId,
      title: p.title,
      stage: p.stage,
      mustHaves: p.mustHaves?.length,
      companyId: p.companyId,
      demo: p.demo === true,
    })),
    batches: batchList.map((b) => ({
      roleId: b.roleId,
      active: batchActiveCount(b),
      max: b.max,
      total: b.candidates?.length || 0,
    })),
    // Gem rediscover + Dover/Underdog hygiene: never re-surface pass/decline batch seats.
    rediscoverTop: rediscover(touchList, {
      limit: 8,
      suppress: batchList.reduce((s, b) => {
        for (const id of terminalCandIds(b)) s.add(id);
        return s;
      }, new Set()),
    }),
    warmPaths: warmPaths(pathList, { limit: 8 }),
    recentCallNotes: callNotes.slice(0, 5).map((n) => ({
      id: n.id,
      kind: n.kind,
      roleId: n.roleId,
      candId: n.candId,
      at: n.at,
      summary: String(n.summary || '').slice(0, 120),
    })),
    cmds: {
      packet: 'node demigod-role-packet.mjs list|init|note|project|stage|set-comp|set-plan',
      batch: 'node demigod-pilot-batch.mjs open|add|terminal',
      touch: 'node demigod-candidate-touch.mjs log|rediscover',
      intro: 'node demigod-intro-path.mjs log|list|warm',
      call: 'node demigod-call-note.mjs log|list',
      comp: 'node demigod-public-comp.mjs extract|apply --role= --url= --text=',
      desk: 'node demigod-structured-hiring.mjs desk --role=ID',
      shortlist: 'node demigod-structured-hiring.mjs shortlist --role=… --cand=… --why=…',
      pack: 'node demigod-structured-hiring.mjs pack',
    },
    policy:
      'No fit score. Evidence-required ratings. Batch hard-cap 3 active. batchSeats/touchChannels/callKinds/introStrengths/scorecards/compBands/stages/decisionAids/kits/ratings/rediscoverPool are observation tallies only (no conversion rate, quality, relationship, completion-rate, pay, funnel, rating-average, or match score). Rediscover from owned touches only; suppress pass/decline batch candidates. Intro paths human-set (no mail scrape). Call notes never auto-change pairs. Comp only from public job-post quotes or founder_stated.',
  };
}

/** Pack desk snapshot for multi-agent / desktop handoff (no contacts). */
export function packHandoff(outDir = path.join(BUSY, 'structured-hiring-handoff')) {
  const st = buildStatus();
  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(outDir, 0o700);
  } catch {
    /* */
  }
  const desks = (st.packets || []).map((p) => buildDesk(p.roleId));
  const debriefs = desks
    .filter((d) => d.debrief)
    .map((d) => ({
      roleId: d.debrief.roleId,
      noteCount: d.debrief.noteCount,
      disagreeMusts: (d.debrief.byMustHave || []).filter((m) => m.disagree).map((m) => m.mustHaveId),
      score: null,
    }));
  const payload = {
    schema: 'demigod.structured-hiring-handoff/1',
    at: st.at,
    status: st,
    desks,
    debriefs,
    note: 'Technical structured-hiring pack. No contacts, scores, or send authority.',
  };
  atomicWrite(path.join(outDir, 'status.json'), `${JSON.stringify(payload, null, 2)}\n`, {
    mode: 0o600,
  });
  const readme = `# Structured hiring handoff

Packed at ${st.at}

| Surface | Count |
|---------|-------|
| packets | ${st.counts.packets} |
| notes | ${st.counts.reviewNotes} |
| batches | ${st.counts.batches} |
| touches | ${st.counts.touches} |
| intro paths | ${st.counts.introPaths} |
| call notes | ${st.counts.callNotes} |

## CLI
\`\`\`bash
node demigod-structured-hiring.mjs status
node demigod-structured-hiring.mjs desk --role=ROLE_ID
node demigod-structured-hiring.mjs shortlist --role=… --cand=… --why="…"
node demigod-role-packet.mjs debrief --role=ROLE_ID
node demigod-role-packet.mjs set-plan --role=ROLE_ID
node demigod-public-comp.mjs extract|apply --role=… --url=… --text=…   # or --fetch-url=
node demigod-intro-path.mjs warm
node demigod-call-note.mjs list
node demigod-reseal-queue.mjs due
node demigod-control-board.mjs status
\`\`\`

Inspired by Ashby / Underdog / Gem / Affinity / Metaview / Levels (thin) — Demigod-owned, no fit score.
`;
  atomicWrite(path.join(outDir, 'README.md'), readme, { mode: 0o600 });
  return { ok: true, outDir, counts: st.counts, debriefs: debriefs.length, at: st.at };
}

/** Full desk for one role: packet + notes + batch + rediscover filtered. */
export function buildDesk(roleId) {
  const id = String(roleId || '').trim();
  if (!id) throw new Error('roleId required');
  const packet = loadPackets().packets[id] || null;
  const notes = Object.values(loadNotes().notes || {}).filter((n) => n.roleId === id);
  const batch = loadBatchStore().batches[id] || null;
  const touches = (loadTouchStore().touches || []).filter((t) => t.roleId === id || !t.roleId);
  // Suppress pilot-batch terminal (pass/decline) so rediscover does not re-suggest closed seats.
  const redis = rediscover(loadTouchStore().touches || [], {
    roleId: id,
    limit: 10,
    suppress: terminalCandIds(batch),
  });
  const companyId = packet?.companyId || null;
  const introWarm = warmPaths(loadIntroStore().paths || [], {
    company: companyId,
    limit: 8,
  });
  const introRecent = listIntroPaths({ company: companyId, limit: 8 });
  const calls = listCallNotes({ roleId: id, limit: 50 });
  const projections = notes.map((n) =>
    packet ? projectForReview(packet, n) : { candId: n.candId, note: n, packet: null },
  );
  const debrief = packet ? debriefRoundup(packet, notes, { callNotes: calls }) : null;
  // Lever/Ashby kit + GoodTime-thin moment gaps: plan → batch → notes for empty moments → project.
  let next;
  if (!packet) {
    next = `node demigod-role-packet.mjs init --role=${id} --title=… --outcome="…(≥20 chars)…"`;
  } else if (!(Array.isArray(packet.interviewPlan) && packet.interviewPlan.length)) {
    next = `node demigod-role-packet.mjs set-plan --role=${id}`;
  } else if (!batch) {
    next = `node demigod-pilot-batch.mjs open --role=${id}`;
  } else if (debrief?.momentsWithoutNotes?.length) {
    next = `node demigod-role-packet.mjs note --role=${id} --cand=…  # empty moments: ${debrief.momentsWithoutNotes.join(',')}`;
  } else {
    next = `node demigod-role-packet.mjs project --role=${id} --cand=…`;
  }
  return {
    schema: 'demigod.structured-hiring-desk/1',
    at: new Date().toISOString(),
    roleId: id,
    packet,
    batch: batch
      ? {
          ...batch,
          active: batchActiveCount(batch),
        }
      : null,
    notes,
    projections,
    rediscover: redis,
    introPaths: { warm: introWarm, recent: introRecent },
    callNotes: calls,
    debrief,
    next,
  };
}

/**
 * Shortlist a candidate onto the Underdog-shaped batch for a role that has a packet.
 * Opens batch if missing. Logs a touch. Does not invent fit scores.
 */
export function shortlist({
  roleId,
  candId,
  why,
  openBatchIfMissing = true,
  logTouch = true,
} = {}) {
  const id = String(roleId || '').trim();
  const cand = String(candId || '').trim();
  const reason = String(why || '').trim();
  if (!id || !cand || reason.length < 4) throw new Error('roleId, candId, why(≥4) required');
  const packet = loadPackets().packets[id];
  if (!packet) throw new Error(`no_role_packet:${id} — init packet first`);

  let batch = loadBatchStore().batches[id] || null;
  if (!batch && openBatchIfMissing) {
    batch = openBatch(id, { max: 3 });
  }
  if (!batch) throw new Error('no_batch');
  let batchResult = { skipped: false };
  try {
    batch = addCandidate(batch, cand, reason);
    upsertBatch(batch);
    batchResult = { active: batchActive(batch), max: batch.max };
  } catch (e) {
    const msg = String(e.message || e);
    if (/batch_full/.test(msg)) {
      batchResult = {
        error: 'batch_full',
        active: batchActive(batch),
        max: batch.max,
        hint: 'terminal a candidate: node demigod-pilot-batch.mjs terminal --role=… --cand=… --as=decline',
      };
    } else if (/terminal_seat/.test(msg)) {
      batchResult = {
        error: 'terminal_seat',
        candId: cand,
        hint: 'cand already pass/decline on this batch — pick another cand (rediscover suppresses terminals)',
      };
    } else throw e;
  }

  let touch = null;
  if (logTouch && !batchResult.error) {
    touch = makeTouch({
      candId: cand,
      channel: 'review',
      roleId: id,
      note: reason.slice(0, 200),
    });
    appendTouch(touch);
  }

  // First successful shortlist advances brief_ready → reviewing (Ashby-shaped).
  let stage = { from: packet.stage, to: packet.stage, advanced: false };
  let packetOut = packet;
  if (!batchResult.error && packet.stage === 'brief_ready') {
    try {
      packetOut = advanceStage(packet, 'reviewing');
      upsertPacket(packetOut);
      stage = { from: 'brief_ready', to: 'reviewing', advanced: true };
    } catch {
      /* leave stage if transition blocked */
    }
  }

  return {
    ok: !batchResult.error,
    roleId: id,
    candId: cand,
    packetTitle: packetOut.title,
    batch: batchResult,
    touchId: touch?.id || null,
    stage,
    project: projectForReview(packetOut, null),
  };
}

/** Operator integrity audit over all SH stores (no network). */
export function auditStructuredHiring() {
  const errors = [];
  const warnings = [];
  const hasScore = (obj, label) => {
    if (!obj || typeof obj !== 'object') return;
    if ('fitScore' in obj || 'trustScore' in obj) errors.push(`${label}:forbidden_score_field`);
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') hasScore(v, `${label}.${k}`);
    }
  };

  const packets = loadPackets();
  const notes = loadNotes();
  hasScore(packets, 'packets');
  hasScore(notes, 'notes');
  const packetList = Object.values(packets.packets || {});
  for (const p of packetList) {
    try {
      assertPacket(p);
    } catch (e) {
      errors.push(`packet:${p?.roleId || '?'}:${e.message || e}`);
    }
  }
  for (const n of Object.values(notes.notes || {})) {
    const p = packets.packets?.[n.roleId];
    if (!p) {
      warnings.push(`note_orphan:${n.roleId}|${n.candId}`);
      continue;
    }
    try {
      assertNote(n, p);
    } catch (e) {
      errors.push(`note:${n.roleId}|${n.candId}:${e.message || e}`);
    }
  }

  const batches = loadBatchStore();
  hasScore(batches, 'batches');
  for (const b of Object.values(batches.batches || {})) {
    const max = Number(b.max ?? 3);
    const active = batchActiveCount(b);
    if (max > 3) errors.push(`batch_max:${b.roleId}:${max}`);
    if (active > Math.min(max, 3)) errors.push(`batch_active:${b.roleId}:${active}>${max}`);
  }

  const touches = loadTouchStore();
  hasScore(touches, 'touches');
  for (const t of touches.touches || []) {
    try {
      assertTouch(t);
    } catch (e) {
      errors.push(`touch:${t?.id || '?'}:${e.message || e}`);
    }
  }

  const intros = loadIntroStore();
  hasScore(intros, 'intros');
  for (const p of intros.paths || []) {
    try {
      assertIntroPath(p);
    } catch (e) {
      errors.push(`intro:${p?.id || '?'}:${e.message || e}`);
    }
  }

  const calls = listCallNotes({ limit: 5000 });
  for (const n of calls) {
    try {
      assertCallNote(n);
    } catch (e) {
      errors.push(`call:${n?.id || '?'}:${e.message || e}`);
    }
  }

  const receipt = {
    schema: 'demigod.structured-hiring-audit/1',
    at: new Date().toISOString(),
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      packets: packetList.length,
      notes: Object.keys(notes.notes || {}).length,
      batches: Object.keys(batches.batches || {}).length,
      touches: (touches.touches || []).length,
      introPaths: (intros.paths || []).length,
      callNotes: calls.length,
      errors: errors.length,
      warnings: warnings.length,
    },
    policy: 'No fit score. Evidence-required notes. Batch active ≤3. Assert all store shapes.',
  };
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  atomicWrite(AUDIT_OUT, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  return receipt;
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`structured-hiring selftest: ${m}`);
  };
  const st = buildStatus();
  assert(st.schema === 'demigod.structured-hiring/1', 'schema');
  assert(st.counts && typeof st.counts.packets === 'number', 'counts');
  assert(Array.isArray(st.rediscoverTop), 'rediscover');
  assert(Array.isArray(st.warmPaths), 'warmPaths');
  assert(typeof st.counts.introPaths === 'number', 'introPaths count');
  assert(!('score' in st) && st.policy.includes('No fit score'), 'no score');
  assert(st.policy.includes('suppress pass/decline'), 'policy names batch suppress');
  // Ashby-analytics-thin: seat tallies present; never rates/scores.
  assert(st.batchSeats && typeof st.batchSeats.active === 'number', 'batchSeats');
  assert(typeof st.batchSeats.pass === 'number' && typeof st.batchSeats.decline === 'number', 'seat states');
  assert(Array.isArray(st.batchSeats.byRole), 'batchSeats.byRole');
  assert(!('conversionRate' in st.batchSeats) && !('passRate' in st.batchSeats), 'no rate fields');
  assert(st.policy.includes('observation tallies'), 'policy names observation tallies');
  assert(st.touchChannels && typeof st.touchChannels.total === 'number', 'touchChannels');
  assert(st.touchChannels.byChannel && typeof st.touchChannels.byChannel.note === 'number', 'touch byChannel');
  assert(!('engagementScore' in st.touchChannels), 'no engagement score');
  assert(st.callKinds && typeof st.callKinds.total === 'number', 'callKinds');
  assert(st.callKinds.byKind && typeof st.callKinds.byKind.candidate_screen === 'number', 'call byKind');
  assert(!('qualityScore' in st.callKinds), 'no call quality score');
  assert(st.introStrengths && typeof st.introStrengths.total === 'number', 'introStrengths');
  assert(st.introStrengths.byStrength && typeof st.introStrengths.byStrength.strong === 'number', 'intro byStrength');
  assert(typeof st.introStrengths.decayed === 'number', 'intro decayed count');
  assert(!('relationshipScore' in st.introStrengths) && !('score' in st.introStrengths), 'no intro score');
  // Ashby-analytics-thin: scorecard landscape counts only.
  assert(st.scorecards && typeof st.scorecards.packets === 'number', 'scorecards');
  assert(typeof st.scorecards.withPlan === 'number' && typeof st.scorecards.withNotes === 'number', 'scorecard plan/notes');
  assert(typeof st.scorecards.complete === 'number' && typeof st.scorecards.unratedMustHaves === 'number', 'scorecard complete');
  assert(!('completionRate' in st.scorecards) && !('score' in st.scorecards), 'no scorecard rates/score');
  // Levels/Pave-thin: comp band source landscape counts only.
  assert(st.compBands && typeof st.compBands.packets === 'number', 'compBands');
  assert(typeof st.compBands.withBand === 'number' && typeof st.compBands.withoutBand === 'number', 'comp with/without');
  assert(st.compBands.bySource && typeof st.compBands.bySource.public_job_post === 'number', 'comp bySource');
  assert(
    !('percentile' in st.compBands) && !('marketRate' in st.compBands) && !('score' in st.compBands),
    'no pay scores',
  );
  // Ashby-pipeline-thin: stage landscape counts only.
  assert(st.stages && typeof st.stages.packets === 'number', 'stages');
  assert(st.stages.byStage && typeof st.stages.byStage.brief_ready === 'number', 'stages byStage');
  assert(typeof st.stages.byStage.reviewing === 'number', 'stages reviewing');
  assert(
    !('conversionRate' in st.stages) && !('timeInStage' in st.stages) && !('score' in st.stages),
    'no stage rates/scores',
  );
  // Lever/Ashby-thin: decision-aid landscape counts only.
  assert(st.decisionAids && typeof st.decisionAids.total === 'number', 'decisionAids');
  assert(st.decisionAids.byAid && typeof st.decisionAids.byAid.none === 'number', 'decisionAids byAid');
  assert(typeof st.decisionAids.byAid.changed_by_context === 'number', 'decisionAids changed');
  assert(!('qualityScore' in st.decisionAids) && !('score' in st.decisionAids), 'no decisionAid scores');
  // Lever/Ashby-thin: kit landscape counts only.
  assert(st.kits && typeof st.kits.packets === 'number', 'kits');
  assert(typeof st.kits.mustHaves === 'number' && typeof st.kits.dealBreakers === 'number', 'kit sizes');
  assert(typeof st.kits.withDealBreakers === 'number' && st.kits.byKind, 'kit dealbreakers/byKind');
  assert(!('qualityScore' in st.kits) && !('score' in st.kits), 'no kit scores');
  // Ashby/Lever-thin: rating cell landscape counts only.
  assert(st.ratings && typeof st.ratings.notes === 'number' && typeof st.ratings.cells === 'number', 'ratings');
  assert(st.ratings.byRating && typeof st.ratings.byRating.yes === 'number', 'ratings byRating');
  assert(
    !('average' in st.ratings) && !('passRate' in st.ratings) && !('score' in st.ratings),
    'no rating averages/scores',
  );
  // Gem-rediscover-thin: pool landscape counts only.
  assert(st.rediscoverPool && typeof st.rediscoverPool.distinctCands === 'number', 'rediscoverPool');
  assert(typeof st.rediscoverPool.rediscoverable === 'number', 'rediscoverable');
  assert(typeof st.rediscoverPool.suppressed === 'number', 'suppressed terminals');
  assert(st.rediscoverPool.byLastChannel && typeof st.rediscoverPool.byLastChannel.note === 'number', 'byLastChannel');
  assert(
    !('fitScore' in st.rediscoverPool) && !('matchScore' in st.rediscoverPool) && !('score' in st.rediscoverPool),
    'no rediscover pool scores',
  );
  // Pure: terminal batch seats are suppressed from rediscover (Dover/Underdog hygiene).
  {
    const term = terminalCandIds({
      candidates: [
        { candId: 'declined-1', state: 'decline', why: 'not a fit' },
        { candId: 'active-1', state: 'active', why: 'still open' },
      ],
    });
    assert(term.has('declined-1') && !term.has('active-1'), 'terminalCandIds');
    const hits = rediscover(
      [
        {
          candId: 'declined-1',
          channel: 'note',
          at: '2026-07-28T00:00:00.000Z',
          roleId: 'r1',
        },
        {
          candId: 'active-1',
          channel: 'intro',
          at: '2026-07-29T00:00:00.000Z',
          roleId: 'r1',
        },
      ],
      { roleId: 'r1', limit: 10, suppress: term },
    );
    assert(hits.every((h) => h.candId !== 'declined-1'), 'rediscover hides declined');
    assert(hits.some((h) => h.candId === 'active-1'), 'rediscover keeps active');
  }
  // desk for demo if present
  if (st.packets[0]) {
    const d = buildDesk(st.packets[0].roleId);
    assert(d.roleId === st.packets[0].roleId, 'desk');
    assert(d.introPaths && Array.isArray(d.introPaths.warm), 'desk intro');
  }
  const audit = auditStructuredHiring();
  assert(audit.schema === 'demigod.structured-hiring-audit/1', 'audit schema');
  assert(audit.ok === true, `audit should pass on demo data: ${audit.errors?.slice(0, 3)}`);
  console.log(
    JSON.stringify({
      ok: true,
      selftest: 'structured-hiring',
      packets: st.counts.packets,
      introPaths: st.counts.introPaths,
      auditOk: audit.ok,
    }),
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest') || args[0] === 'selftest') {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-structured-hiring.mjs status|desk|shortlist|pack|audit|doctor [--role=] [--cand=] [--why=] [--json]
  shortlist  add cand to role batch (requires packet); logs touch; hard-caps active=3
  pack       write /tmp/dg-busy/structured-hiring-handoff/
  audit      validate all SH stores (no fit score; batch caps; assert shapes)
  doctor     audit + debrief decisionAid tallies (no score)`);
    return;
  }
  const json = args.includes('--json');
  const cmd = args.find((a) => !a.startsWith('-')) || 'status';
  let role = null;
  let cand = null;
  let why = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--role' && args[i + 1]) role = args[++i];
    else if (args[i].startsWith('--role=')) role = args[i].slice(7);
    else if (args[i] === '--cand' && args[i + 1]) cand = args[++i];
    else if (args[i].startsWith('--cand=')) cand = args[i].slice(7);
    else if (args[i] === '--why' && args[i + 1]) why = args[++i];
    else if (args[i].startsWith('--why=')) why = args[i].slice(6);
  }

  if (cmd === 'shortlist') {
    try {
      const out = shortlist({ roleId: role, candId: cand, why });
      console.log(JSON.stringify(out, null, 2));
      process.exit(out.ok ? 0 : 1);
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    return;
  }

  if (cmd === 'pack') {
    const out = packHandoff();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (cmd === 'audit') {
    const out = auditStructuredHiring();
    if (json) console.log(JSON.stringify(out, null, 2));
    else {
      console.log(`# structured-hiring audit · ${out.ok ? 'OK' : 'FAIL'} · errors=${out.errors.length} · warnings=${out.warnings.length}`);
      for (const e of out.errors.slice(0, 20)) console.log(`  ✗ ${e}`);
      for (const w of out.warnings.slice(0, 10)) console.log(`  ! ${w}`);
      console.log(`  receipt: ${AUDIT_OUT}`);
    }
    process.exit(out.ok ? 0 : 1);
  }

  if (cmd === 'doctor') {
    const audit = auditStructuredHiring();
    const st = buildStatus();
    const debriefs = (st.packets || []).map((p) => {
      try {
        const roleCalls = listCallNotes({ roleId: p.roleId, limit: 200 });
        return debriefRoundup(
          loadPackets().packets[p.roleId],
          Object.values(loadNotes().notes || {}).filter((n) => n.roleId === p.roleId),
          { callNotes: roleCalls },
        );
      } catch {
        return null;
      }
    }).filter(Boolean);
    const out = {
      schema: 'demigod.structured-hiring-doctor/1',
      at: new Date().toISOString(),
      ok: audit.ok,
      audit,
      counts: st.counts,
      batchSeats: st.batchSeats || null,
      touchChannels: st.touchChannels || null,
      callKinds: st.callKinds || null,
      introStrengths: st.introStrengths || null,
      scorecards: st.scorecards || null,
      compBands: st.compBands || null,
      stages: st.stages || null,
      decisionAids: st.decisionAids || null,
      kits: st.kits || null,
      ratings: st.ratings || null,
      rediscoverPool: st.rediscoverPool || null,
      debriefs: debriefs.map((d) => ({
        roleId: d.roleId,
        stage: d.stage,
        noteCount: d.noteCount,
        callNoteCount: d.callNoteCount ?? 0,
        callKindTally: d.callKindTally || null,
        decisionAidTally: d.decisionAidTally,
        disagreeCount: d.disagreeCount ?? 0,
        disagreeMusts: (d.byMustHave || []).filter((m) => m.disagree).map((m) => m.mustHaveId),
        unratedMustHaves: (d.unratedMustHaves || []).map((m) => m.mustHaveId),
        coverage: d.coverage || null,
        interviewPlanPresent: d.interviewPlanPresent === true,
        // GoodTime-thin: plan moments with zero scorecard notes (no scheduler).
        momentsWithoutNotes: d.momentsWithoutNotes || [],
        momentCoverage: d.momentCoverage || [],
        score: null,
      })),
      cmds: st.cmds,
    };
    atomicWrite(path.join(BUSY, 'structured-hiring-doctor.json'), `${JSON.stringify(out, null, 2)}\n`, {
      mode: 0o600,
    });
    if (json) console.log(JSON.stringify(out, null, 2));
    else {
      console.log(`# structured-hiring doctor · ${out.ok ? 'OK' : 'FAIL'}`);
      console.log(
        `  packets=${st.counts.packets} notes=${st.counts.reviewNotes} batches=${st.counts.batches} touches=${st.counts.touches} intros=${st.counts.introPaths} calls=${st.counts.callNotes}`,
      );
      if (st.batchSeats) {
        console.log(
          `  batchSeats active=${st.batchSeats.active} pass=${st.batchSeats.pass} decline=${st.batchSeats.decline} total=${st.batchSeats.total} (counts only)`,
        );
      }
      if (st.touchChannels?.byChannel) {
        const ch = st.touchChannels.byChannel;
        console.log(
          `  touchChannels total=${st.touchChannels.total} cands=${st.touchChannels.distinctCands} dm=${ch.dm} email=${ch.email} intro=${ch.intro} review=${ch.review} note=${ch.note} call=${ch.call} (counts only)`,
        );
      }
      if (st.callKinds?.byKind) {
        const k = st.callKinds.byKind;
        console.log(
          `  callKinds total=${st.callKinds.total} intake=${k.intake} screen=${k.candidate_screen} debrief=${k.debrief} (manual counts only)`,
        );
      }
      if (st.introStrengths?.byStrength) {
        const s = st.introStrengths.byStrength;
        console.log(
          `  introStrengths total=${st.introStrengths.total} strong=${s.strong} weak=${s.weak} unknown=${s.unknown} fresh=${st.introStrengths.fresh} decayed=${st.introStrengths.decayed} (ordinal counts only)`,
        );
      }
      if (st.scorecards) {
        const sc = st.scorecards;
        console.log(
          `  scorecards packets=${sc.packets} plan=${sc.withPlan} notes=${sc.withNotes} complete=${sc.complete} disagree=${sc.withDisagree} emptyMoments=${sc.withEmptyMoments} unratedMusts=${sc.unratedMustHaves} (counts only)`,
        );
      }
      if (st.compBands?.bySource) {
        const c = st.compBands;
        const s = c.bySource;
        console.log(
          `  compBands packets=${c.packets} with=${c.withBand} without=${c.withoutBand} public=${s.public_job_post} founder=${s.founder_stated} unknown=${s.unknown} url=${c.withUrl} quote=${c.withQuote} (counts only)`,
        );
      }
      if (st.stages?.byStage) {
        const b = st.stages.byStage;
        console.log(
          `  stages packets=${st.stages.packets} brief=${b.brief_ready} reviewing=${b.reviewing} mutual=${b.mutual_pending} intro=${b.intro} outcome=${b.outcome} (counts only)`,
        );
      }
      if (st.decisionAids?.byAid) {
        const a = st.decisionAids.byAid;
        console.log(
          `  decisionAids total=${st.decisionAids.total} changed=${a.changed_by_context} missingQ=${a.missing_question} errorPrev=${a.error_prevented} none=${a.none} (counts only)`,
        );
      }
      if (st.kits) {
        const k = st.kits;
        console.log(
          `  kits packets=${k.packets} mustHaves=${k.mustHaves} dealBreakers=${k.dealBreakers} withDb=${k.withDealBreakers} withoutDb=${k.withoutDealBreakers} (counts only)`,
        );
      }
      if (st.ratings?.byRating) {
        const r = st.ratings.byRating;
        console.log(
          `  ratings notes=${st.ratings.notes} cells=${st.ratings.cells} strong_yes=${r.strong_yes} yes=${r.yes} no=${r.no} strong_no=${r.strong_no} (counts only)`,
        );
      }
      if (st.rediscoverPool) {
        const p = st.rediscoverPool;
        console.log(
          `  rediscoverPool cands=${p.distinctCands} open=${p.rediscoverable} suppressed=${p.suppressed} withOutcome=${p.withOutcome} withoutOutcome=${p.withoutOutcome} (counts only)`,
        );
      }
      for (const d of out.debriefs) {
        const cov = d.coverage
          ? `rated=${d.coverage.ratedMustHaves}/${d.coverage.totalMustHaves}`
          : 'rated=?';
        const emptyMom =
          d.momentsWithoutNotes?.length > 0 ? ` · emptyMoments=${d.momentsWithoutNotes.join(',')}` : '';
        console.log(
          `  debrief ${d.roleId} · stage=${d.stage} · notes=${d.noteCount} · calls=${d.callNoteCount} · ${cov} · disagree=${d.disagreeCount} · plan=${d.interviewPlanPresent ? 'yes' : 'no'}${emptyMom} · aids=${JSON.stringify(d.decisionAidTally)}`,
        );
      }
      console.log(`  receipt: /tmp/dg-busy/structured-hiring-doctor.json`);
    }
    process.exit(out.ok ? 0 : 1);
  }

  if (cmd === 'desk') {
    if (!role) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const desk = buildDesk(role);
    if (json) console.log(JSON.stringify(desk, null, 2));
    else {
      console.log(`# structured-hiring desk · ${desk.roleId}`);
      console.log(`  packet: ${desk.packet ? desk.packet.title : 'NONE'}`);
      console.log(
        `  batch: ${desk.batch ? `${desk.batch.active}/${desk.batch.max} active` : 'NONE'}`,
      );
      console.log(`  notes: ${desk.notes.length} · rediscover: ${desk.rediscover.length}`);
      console.log(`  next: ${desk.next}`);
    }
    return;
  }

  const st = buildStatus();
  fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
  atomicWrite(OUT, `${JSON.stringify(st, null, 2)}\n`, { mode: 0o600 });
  if (json) console.log(JSON.stringify(st, null, 2));
  else {
    console.log(
      `# structured-hiring · packets=${st.counts.packets} batches=${st.counts.batches} touches=${st.counts.touches} intros=${st.counts.introPaths} calls=${st.counts.callNotes}`,
    );
    if (st.batchSeats) {
      console.log(
        `  batchSeats active=${st.batchSeats.active} pass=${st.batchSeats.pass} decline=${st.batchSeats.decline} total=${st.batchSeats.total} (counts only)`,
      );
    }
    if (st.touchChannels?.byChannel) {
      const ch = st.touchChannels.byChannel;
      console.log(
        `  touchChannels total=${st.touchChannels.total} cands=${st.touchChannels.distinctCands} dm=${ch.dm} email=${ch.email} intro=${ch.intro} review=${ch.review} note=${ch.note} call=${ch.call} (counts only)`,
      );
    }
    if (st.callKinds?.byKind) {
      const k = st.callKinds.byKind;
      console.log(
        `  callKinds total=${st.callKinds.total} intake=${k.intake} screen=${k.candidate_screen} debrief=${k.debrief} (manual counts only)`,
      );
    }
    if (st.introStrengths?.byStrength) {
      const s = st.introStrengths.byStrength;
      console.log(
        `  introStrengths total=${st.introStrengths.total} strong=${s.strong} weak=${s.weak} unknown=${s.unknown} fresh=${st.introStrengths.fresh} decayed=${st.introStrengths.decayed} (ordinal counts only)`,
      );
    }
    if (st.scorecards) {
      const sc = st.scorecards;
      console.log(
        `  scorecards packets=${sc.packets} plan=${sc.withPlan} notes=${sc.withNotes} complete=${sc.complete} disagree=${sc.withDisagree} emptyMoments=${sc.withEmptyMoments} unratedMusts=${sc.unratedMustHaves} (counts only)`,
      );
    }
    if (st.compBands?.bySource) {
      const c = st.compBands;
      const s = c.bySource;
      console.log(
        `  compBands packets=${c.packets} with=${c.withBand} without=${c.withoutBand} public=${s.public_job_post} founder=${s.founder_stated} unknown=${s.unknown} url=${c.withUrl} quote=${c.withQuote} (counts only)`,
      );
    }
    if (st.stages?.byStage) {
      const b = st.stages.byStage;
      console.log(
        `  stages packets=${st.stages.packets} brief=${b.brief_ready} reviewing=${b.reviewing} mutual=${b.mutual_pending} intro=${b.intro} outcome=${b.outcome} (counts only)`,
      );
    }
    if (st.decisionAids?.byAid) {
      const a = st.decisionAids.byAid;
      console.log(
        `  decisionAids total=${st.decisionAids.total} changed=${a.changed_by_context} missingQ=${a.missing_question} errorPrev=${a.error_prevented} none=${a.none} (counts only)`,
      );
    }
    if (st.kits) {
      const k = st.kits;
      console.log(
        `  kits packets=${k.packets} mustHaves=${k.mustHaves} dealBreakers=${k.dealBreakers} withDb=${k.withDealBreakers} withoutDb=${k.withoutDealBreakers} (counts only)`,
      );
    }
    if (st.ratings?.byRating) {
      const r = st.ratings.byRating;
      console.log(
        `  ratings notes=${st.ratings.notes} cells=${st.ratings.cells} strong_yes=${r.strong_yes} yes=${r.yes} no=${r.no} strong_no=${r.strong_no} (counts only)`,
      );
    }
    if (st.rediscoverPool) {
      const p = st.rediscoverPool;
      console.log(
        `  rediscoverPool cands=${p.distinctCands} open=${p.rediscoverable} suppressed=${p.suppressed} withOutcome=${p.withOutcome} withoutOutcome=${p.withoutOutcome} (counts only)`,
      );
    }
    for (const p of st.packets) {
      console.log(`  packet ${p.roleId} · ${p.title} · musts=${p.mustHaves}${p.stage ? ` · ${p.stage}` : ''}`);
    }
    for (const b of st.batches) {
      console.log(`  batch  ${b.roleId} · ${b.active}/${b.max}`);
    }
    for (const h of st.rediscoverTop.slice(0, 5)) {
      console.log(`  rediscover ${h.candId} · touches=${h.touches} · roles=${h.roleHits}`);
    }
    for (const w of (st.warmPaths || []).slice(0, 5)) {
      console.log(
        `  warm ${w.bestStrength} · ${w.toCand || w.toCompany} · paths=${w.paths}`,
      );
    }
    for (const n of (st.recentCallNotes || []).slice(0, 3)) {
      console.log(`  call ${n.kind} · ${n.roleId || n.candId || '—'} · ${String(n.summary || '').slice(0, 50)}`);
    }
    // Debrief disagree flags (no scores)
    for (const p of st.packets || []) {
      try {
        const desk = buildDesk(p.roleId);
        const db = desk.debrief;
        if (!db || !db.noteCount) continue;
        const disagree = (db.byMustHave || []).filter((m) => m.disagree);
        console.log(
          `  debrief ${p.roleId} · notes=${db.noteCount}${
            disagree.length ? ` · disagree=${disagree.map((m) => m.mustHaveId).join(',')}` : ' · agree-or-single'
          }`,
        );
      } catch {
        /* */
      }
    }
    console.log(`  receipt: ${OUT}`);
  }
}

if (isMain) main();
