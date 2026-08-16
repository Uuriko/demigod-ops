#!/usr/bin/env node
/**
 * demigod-structured-hiring — compose Ashby packet + Underdog batch + Gem rediscover.
 *
 * One operator view over the three technical product modules.
 *
 *   node demigod-structured-hiring.mjs status [--json]
 *   node demigod-structured-hiring.mjs desk --role=ID [--json]
 *   node demigod-structured-hiring.mjs workspace --role=ID [--json]
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
  assertPacket,
  assertNote,
} from './demigod-role-packet.mjs';
import { rediscover, makeTouch, appendTouch, assertTouch } from './demigod-candidate-touch.mjs';
import {
  openBatch,
  addCandidate,
  upsertBatch,
  activeCount as batchActive,
} from './demigod-pilot-batch.mjs';
import { warmPaths, listPaths as listIntroPaths, assertPath as assertIntroPath } from './demigod-intro-path.mjs';
import { listCallNotes, assertCallNote } from './demigod-call-note.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import {
  candidateProfileReadiness,
  currentCandidateSubmissions,
  isSampleData,
  loadBoard,
  loadInbox,
  scrubPII,
} from './demigod-submissions-lib.mjs';
import { listAcceptedRoles } from './demigod-accepted-role.mjs';
import { buildCompanyPacket, loadPacketInputs } from './demigod-company-packet.mjs';
import { listPairs } from './demigod-pairs-lib.mjs';
import { loadReferrals } from './demigod-referrals.mjs';

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

/** Compile founder-authored criteria into inspectable questions; only human notes can answer them. */
export function compileEvidenceReview(packet = null, notes = []) {
  if (!packet) {
    return {
      schema: 'demigod.evidence-review/1',
      state: 'missing_role_packet',
      hardFilters: [],
      questions: [],
      globalScore: null,
    };
  }
  const packetAt = Date.parse(packet.updatedAt || packet.createdAt || '');
  const roleNotes = (Array.isArray(notes) ? notes : []).filter((note) => note?.roleId === packet.roleId);
  const questions = (packet.mustHaves || []).map((mustHave) => {
    const responses = [];
    for (const note of roleNotes) {
      const rating = (note.ratings || []).find((row) => row?.mustHaveId === mustHave.id);
      if (!rating) continue;
      const reviewedAt = note.reviewedAt || null;
      const reviewedMs = Date.parse(reviewedAt || '');
      responses.push({
        candId: note.candId,
        state: Number.isFinite(packetAt) && (!Number.isFinite(reviewedMs) || reviewedMs < packetAt)
          ? 'stale'
          : 'answered',
        rating: rating.rating,
        evidence: scrubPII(String(rating.evidence || '')).slice(0, 500),
        citation: {
          source: 'human_review_note',
          reviewedAt,
          reviewedBy: note.reviewedBy || null,
        },
      });
    }
    for (const response of responses) {
      if (responses.some((other) => other.candId === response.candId && other.rating !== response.rating)) {
        response.state = 'conflict';
      }
    }
    return {
      mustHaveId: mustHave.id,
      label: mustHave.label,
      question: `What specific, permitted evidence shows ${mustHave.label}?`,
      state: !responses.length
        ? 'unknown'
        : responses.some((row) => row.state === 'conflict')
          ? 'conflict'
          : responses.every((row) => row.state === 'stale')
            ? 'stale'
            : 'answered',
      responses,
    };
  });
  return {
    schema: 'demigod.evidence-review/1',
    state: questions.some((row) => row.state === 'conflict')
      ? 'needs_resolution'
      : questions.some((row) => row.state === 'unknown')
        ? 'needs_evidence'
        : questions.some((row) => row.state === 'stale')
          ? 'needs_refresh'
          : 'reviewable',
    hardFilters: [
      { id: 'no_opt_out', rule: 'Candidate suppression must not include opt_out', source: 'candidate_touch' },
      { id: 'profile_complete', rule: 'Candidate profile must be complete', source: 'candidate_submission' },
      { id: 'availability_current', rule: 'Candidate availability must be current', source: 'candidate_submission' },
      { id: 'location_compatible', rule: 'Submitted work-location preferences must be compatible', source: 'candidate_submission' },
      ...(packet.dealBreakers || []).map((row) => ({
        id: row.id,
        rule: row.label,
        source: 'founder_role_packet',
        evaluation: 'human_required',
      })),
    ],
    questions,
    globalScore: null,
    policy: 'No protected traits, inferred personality, or global fit verdict. Unknown remains unknown.',
  };
}

/** Pure role-centered projection over the existing stores. Grants no action authority. */
export function composeRoleWorkspace({
  roleId,
  packet = null,
  acceptedRole = null,
  acceptedRoleError = null,
  companyPacket = null,
  batch = null,
  notes = [],
  inboundCandidates = [],
  referrals = [],
  priorPairs = [],
  rediscovered = [],
  candidateChannelErrors = [],
  introPaths = { warm: [], recent: [] },
  callNotes = [],
  at = new Date().toISOString(),
} = {}) {
  const id = String(roleId || '').trim();
  if (!id) throw new Error('roleId required');
  const roleNotes = Array.isArray(notes) ? notes : [];
  const reviewedCandidateIds = [...new Set(roleNotes.map((note) => note?.candId).filter(Boolean))];
  const calibrated = Boolean(
    packet
    && packet.demo !== true
    && String(packet.outcome90d || '').trim().length >= 20
    && Array.isArray(packet.mustHaves)
    && packet.mustHaves.length >= 3,
  );
  const knownCompany = Boolean(
    companyPacket
    && companyPacket.status !== 'unknown'
    && companyPacket.status !== 'error'
    && companyPacket.companyId === packet?.companyId,
  );
  const accepted = Boolean(acceptedRole && acceptedRole.roleId === id);
  const shortlist = Array.isArray(batch?.candidates) ? batch.candidates : [];
  const pairRows = Array.isArray(priorPairs) ? priorPairs : [];
  const rediscoveryRows = Array.isArray(rediscovered) ? rediscovered : [];
  const nowMs = Date.parse(at);
  const suppressionFor = (candId, { lastAt = null, lastOutcome = null, existing = [] } = {}) => {
    const reasons = [...existing];
    if (/^(?:opt[_ -]?out|withdrawn|do[_ -]?not[_ -]?contact|not[_ -]?interested)$/i.test(String(lastOutcome || '').trim())) {
      reasons.push({ kind: 'opt_out', at: lastAt });
    }
    const lastMs = Date.parse(lastAt || '');
    if (Number.isFinite(nowMs) && Number.isFinite(lastMs) && nowMs >= lastMs && nowMs - lastMs <= 30 * 864e5) {
      reasons.push({ kind: 'recent_contact', at: lastAt });
    }
    for (const pair of pairRows) {
      if (pair?.candId !== candId || !['rejected', 'one_side_no'].includes(pair.state)) continue;
      reasons.push({ kind: 'prior_decline', pairId: pair.pairId, state: pair.state });
    }
    if (acceptedRole?.roleTruthHash) {
      for (const pair of pairRows) {
        if (pair?.candId !== candId) continue;
        const changed = (pair.history || []).some((row) =>
          row?.event === 'consent'
          && row.roleTruthHash
          && row.roleTruthHash !== acceptedRole.roleTruthHash,
        );
        if (changed) reasons.push({ kind: 'role_truth_changed', pairId: pair.pairId });
      }
    }
    return reasons.filter((row, index, all) =>
      index === all.findIndex((other) => other.kind === row.kind && other.pairId === row.pairId),
    );
  };

  return {
    schema: 'demigod.role-workspace/1',
    at,
    roleId: id,
    state: packet?.demo === true
      ? 'demo_only'
      : accepted && calibrated
        ? 'review_ready'
        : calibrated
          ? 'needs_acceptance'
          : 'needs_calibration',
    roleAcceptance: {
      accepted,
      error: acceptedRoleError,
      receipt: acceptedRole,
    },
    calibration: packet
      ? {
          status: packet.demo === true ? 'demo' : calibrated ? 'ready' : 'incomplete',
          demo: packet.demo === true,
          title: packet.title,
          outcome90d: packet.outcome90d,
          mustHaves: packet.mustHaves,
          dealBreakers: packet.dealBreakers || [],
          compBand: packet.compBand || null,
          interviewPlan: packet.interviewPlan || [],
          stage: packet.stage,
        }
      : { status: 'missing' },
    company: companyPacket,
    evidenceReview: compileEvidenceReview(packet, roleNotes),
    candidateChannels: {
      inbound: {
        count: Array.isArray(inboundCandidates) ? inboundCandidates.length : 0,
        candidates: (Array.isArray(inboundCandidates) ? inboundCandidates : []).map((row) => ({
          candId: row.candId,
          status: row.status,
          sample: row.sample === true,
          readiness: row.readiness,
          suppression: suppressionFor(row.candId, { existing: row.suppression }),
        })),
      },
      referrals: {
        count: Array.isArray(referrals) ? referrals.length : 0,
        candidates: (Array.isArray(referrals) ? referrals : []).map((row) => ({
          claimId: row.claimId,
          candId: row.candId,
          status: row.status,
          submittedAt: row.submittedAt,
          expiresAt: row.expiresAt,
          suppression: suppressionFor(row.candId),
        })),
      },
      shortlist: {
        active: batch ? batchActiveCount(batch) : 0,
        max: batch?.max || 3,
        total: shortlist.length,
        candidates: shortlist,
      },
      rediscovery: {
        count: rediscoveryRows.length,
        candidates: rediscoveryRows.map((row) => ({
          candId: row.candId,
          touches: row.touches,
          lastAt: row.lastAt,
          roleHits: row.roleHits,
          channels: row.channels,
          lastNote: row.lastNote,
          lastOutcome: row.lastOutcome,
          suppression: suppressionFor(row.candId, { lastAt: row.lastAt, lastOutcome: row.lastOutcome }),
        })),
      },
      priorPairs: {
        count: pairRows.length,
        pairs: pairRows.map((pair) => ({
          pairId: pair.pairId,
          candId: pair.candId,
          state: pair.state,
          mutual: pair.mutual || { founder: false, candidate: false },
          sample: pair.sample !== false,
          updatedAt: pair.updatedAt || pair.at || null,
        })),
      },
      reviewed: {
        noteCount: roleNotes.length,
        candidateCount: reviewedCandidateIds.length,
        candidateIds: reviewedCandidateIds,
      },
      errors: Array.isArray(candidateChannelErrors) ? candidateChannelErrors : [],
    },
    relationshipContext: {
      warmIntroPaths: Array.isArray(introPaths?.warm) ? introPaths.warm : [],
      recentIntroPaths: Array.isArray(introPaths?.recent) ? introPaths.recent : [],
      callNotes: Array.isArray(callNotes) ? callNotes : [],
    },
    checkpoints: [
      {
        id: 'accepted_role',
        ok: accepted,
        reason: accepted ? null : (acceptedRoleError || 'no_current_acceptance_receipt'),
      },
      {
        id: 'calibrated_packet',
        ok: calibrated,
        reason: calibrated
          ? null
          : !packet
            ? 'packet_missing'
            : packet.demo === true
              ? 'demo_packet_not_delivery_ready'
              : 'packet_incomplete',
      },
      {
        id: 'company_context',
        ok: knownCompany,
        reason: knownCompany
          ? null
          : !packet?.companyId
            ? 'company_id_missing'
            : companyPacket?.status === 'error'
              ? companyPacket.error
              : 'company_unknown',
      },
    ],
    authority: {
      review: 'human',
      employmentDecision: 'human',
      consent: 'existing_pair_receipts_only',
      intro: 'existing_mutual_consent_gate_only',
      externalAction: 'none',
    },
  };
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
    rediscoverTop: rediscover(touchList, { limit: 8 }),
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
      workspace: 'node demigod-structured-hiring.mjs workspace --role=ID --json',
      shortlist: 'node demigod-structured-hiring.mjs shortlist --role=… --cand=… --why=…',
      pack: 'node demigod-structured-hiring.mjs pack',
    },
    policy:
      'No fit score. Evidence-required ratings. Batch hard-cap 3 active. Rediscover from owned touches only. Intro paths human-set (no mail scrape). Call notes never auto-change pairs. Comp only from public job-post quotes or founder_stated.',
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
  const redis = rediscover(
    loadTouchStore().touches || [],
    { roleId: id, limit: 10 },
  );
  const companyId = packet?.companyId || null;
  const introWarm = companyId
    ? warmPaths(loadIntroStore().paths || [], { company: companyId, limit: 8 })
    : [];
  const introRecent = companyId ? listIntroPaths({ company: companyId, limit: 8 }) : [];
  const calls = listCallNotes({ roleId: id, limit: 10 });
  const projections = notes.map((n) =>
    packet ? projectForReview(packet, n) : { candId: n.candId, note: n, packet: null },
  );
  let acceptedRole = null;
  let acceptedRoleError = null;
  let inbox = null;
  try {
    inbox = loadInbox();
    acceptedRole = (listAcceptedRoles(loadBoard(), inbox).acceptedRoles || [])
      .find((role) => String(role.roleId) === id) || null;
  } catch (error) {
    acceptedRoleError = `acceptance_gate_error:${String(error?.message || error)}`;
  }
  const candidateChannelErrors = [];
  let inboundCandidates = [];
  try {
    inboundCandidates = currentCandidateSubmissions(inbox?.items || [])
      .map((item) => ({ item, readiness: candidateProfileReadiness(item) }))
      .filter(({ readiness }) => readiness.applicable && readiness.lifecycleReady && readiness.policyReady)
      .filter(({ item }) => !acceptedRole || !isSampleData(item))
      .map(({ item, readiness }) => ({
        candId: String(item.id || '').trim(),
        status: item.status || null,
        sample: isSampleData(item),
        readiness: {
          matchReady: readiness.matchReady,
          missing: readiness.missing,
          availabilityCurrent: readiness.availabilityCurrent,
          availabilityAt: readiness.availabilityAt,
        },
        suppression: [
          ...(readiness.availabilityCurrent === false ? [{ kind: 'availability_stale', at: readiness.availabilityAt }] : []),
          ...(readiness.preferenceReady === false ? [{ kind: 'location_preference_incompatible' }] : []),
          ...(readiness.missing.length ? [{ kind: 'profile_incomplete', fields: readiness.missing }] : []),
        ],
      }))
      .filter((item) => item.candId);
  } catch (error) {
    candidateChannelErrors.push(`inbound_error:${String(error?.message || error)}`);
  }
  let referrals = [];
  try {
    referrals = Object.values(loadReferrals().claims || {})
      .filter((claim) => claim?.kind === 'talent' && claim.status !== 'void')
      .map((claim) => ({
        claimId: claim.id,
        candId: claim.submissionId,
        status: claim.status,
        submittedAt: claim.submittedAt || null,
        expiresAt: claim.expiresAt || null,
      }));
  } catch (error) {
    candidateChannelErrors.push(`referrals_error:${String(error?.message || error)}`);
  }
  let priorPairs = [];
  try {
    priorPairs = listPairs({ includeSample: true, limit: Number.MAX_SAFE_INTEGER })
      .filter((pair) => pair?.roleId === id)
      .filter((pair) => !acceptedRole || pair.sample === false);
  } catch (error) {
    candidateChannelErrors.push(`pairs_error:${String(error?.message || error)}`);
  }
  let companyPacket = null;
  if (companyId) {
    try {
      companyPacket = buildCompanyPacket({ companyId, ...loadPacketInputs() });
    } catch (error) {
      companyPacket = {
        status: 'error',
        companyId,
        error: `company_packet_error:${String(error?.message || error)}`,
      };
    }
  }
  const workspace = composeRoleWorkspace({
    roleId: id,
    packet,
    acceptedRole,
    acceptedRoleError,
    companyPacket,
    batch,
    notes,
    inboundCandidates,
    referrals,
    priorPairs,
    rediscovered: redis,
    candidateChannelErrors,
    introPaths: { warm: introWarm, recent: introRecent },
    callNotes: calls,
  });
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
    debrief: packet ? debriefRoundup(packet, notes) : null,
    workspace,
    next: !packet
      ? `node demigod-role-packet.mjs init --role=${id} --title=… --outcome="…(≥20 chars)…"`
      : !batch
        ? `node demigod-pilot-batch.mjs open --role=${id}`
        : `node demigod-role-packet.mjs project --role=${id} --cand=…`,
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
    if (/batch_full/.test(String(e.message))) {
      batchResult = {
        error: 'batch_full',
        active: batchActive(batch),
        max: batch.max,
        hint: 'terminal a candidate: node demigod-pilot-batch.mjs terminal --role=… --cand=… --as=decline',
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
  const fixtureWorkspace = composeRoleWorkspace({
    roleId: 'role-fixture',
    acceptedRole: { roleId: 'role-fixture', company: 'Acme', roleTruthHash: 'abc' },
    packet: {
      roleId: 'role-fixture',
      companyId: 'yc:acme',
      title: 'Founding Engineer',
      outcome90d: 'Ship the first reliable customer-facing product.',
      mustHaves: [
        { id: 'mh1', label: 'Backend craft' },
        { id: 'mh2', label: 'Product judgment' },
        { id: 'mh3', label: 'Clear communication' },
      ],
      stage: 'brief_ready',
    },
    companyPacket: { schema: 'demigod.company-packet/1', companyId: 'yc:acme', identity: { name: 'Acme' } },
    batch: { max: 3, candidates: [{ candId: 'cand-1', why: 'Relevant shipped work', state: 'active' }] },
    notes: [{
      roleId: 'role-fixture',
      candId: 'cand-1',
      reviewedAt: '2026-08-14T00:00:00.000Z',
      reviewedBy: 'operator',
      ratings: [{ mustHaveId: 'mh1', rating: 'yes', evidence: 'Shipped a production backend migration.' }],
    }],
    inboundCandidates: [{
      candId: 'cand-3',
      status: 'reviewed',
      sample: false,
      readiness: { matchReady: false, availabilityCurrent: false, missing: [] },
      suppression: [{ kind: 'availability_stale' }],
    }],
    referrals: [{ claimId: 'claim-1', candId: 'cand-3', status: 'eligible' }],
    priorPairs: [{
      pairId: 'pair-1',
      candId: 'cand-2',
      roleId: 'role-fixture',
      state: 'rejected',
      sample: false,
      history: [{ event: 'consent', roleTruthHash: 'old' }],
    }],
    rediscovered: [{
      candId: 'cand-2',
      touches: 2,
      roleHits: 1,
      lastAt: '2026-08-14T00:00:00.000Z',
      lastOutcome: 'opt_out',
      fitScore: null,
    }],
    at: '2026-08-15T00:00:00.000Z',
  });
  assert(fixtureWorkspace.schema === 'demigod.role-workspace/1', 'workspace schema');
  assert(fixtureWorkspace.state === 'review_ready', 'accepted calibrated workspace ready');
  assert(fixtureWorkspace.checkpoints.every((row) => row.ok), 'workspace checkpoints');
  assert(fixtureWorkspace.candidateChannels.shortlist.active === 1, 'workspace shortlist');
  assert(fixtureWorkspace.candidateChannels.inbound.count === 1, 'workspace inbound');
  assert(fixtureWorkspace.candidateChannels.referrals.count === 1, 'workspace referrals');
  assert(fixtureWorkspace.evidenceReview.questions[0].state === 'answered', 'workspace cited evidence');
  assert(fixtureWorkspace.evidenceReview.questions[1].state === 'unknown', 'workspace preserves unknown evidence');
  assert(fixtureWorkspace.evidenceReview.globalScore === null, 'workspace evidence has no global score');
  const staleReview = compileEvidenceReview(
    { ...fixtureWorkspace.calibration, roleId: 'role-fixture', updatedAt: '2026-08-15T00:00:00.000Z' },
    [{
      roleId: 'role-fixture',
      candId: 'cand-1',
      reviewedAt: '2026-08-14T00:00:00.000Z',
      ratings: fixtureWorkspace.calibration.mustHaves.map((row) => ({
        mustHaveId: row.id,
        rating: 'yes',
        evidence: 'Concrete human-reviewed evidence.',
      })),
    }],
  );
  assert(staleReview.state === 'needs_refresh', 'stale evidence blocks reviewable state');
  assert(fixtureWorkspace.candidateChannels.rediscovery.count === 1, 'workspace rediscovery');
  assert(fixtureWorkspace.candidateChannels.priorPairs.count === 1, 'workspace prior pairs');
  assert(
    fixtureWorkspace.candidateChannels.rediscovery.candidates[0].suppression.some((row) => row.kind === 'recent_contact')
      && fixtureWorkspace.candidateChannels.rediscovery.candidates[0].suppression.some((row) => row.kind === 'prior_decline'),
    'workspace suppression reasons',
  );
  assert(
    fixtureWorkspace.candidateChannels.rediscovery.candidates[0].suppression.some((row) => row.kind === 'opt_out')
      && fixtureWorkspace.candidateChannels.rediscovery.candidates[0].suppression.some((row) => row.kind === 'role_truth_changed')
      && fixtureWorkspace.candidateChannels.inbound.candidates[0].suppression.some((row) => row.kind === 'availability_stale'),
    'workspace opt-out, role-change, and stale suppression',
  );
  assert(!JSON.stringify(fixtureWorkspace).includes('fitScore'), 'workspace omits fit score');
  assert(fixtureWorkspace.authority.externalAction === 'none', 'workspace grants no action');
  const missingWorkspace = composeRoleWorkspace({ roleId: 'role-missing', at: '2026-08-15T00:00:00.000Z' });
  assert(missingWorkspace.state === 'needs_calibration', 'missing workspace not ready');
  assert(missingWorkspace.checkpoints.every((row) => row.ok === false), 'missing checkpoints fail closed');
  const missingDesk = buildDesk('role-missing-selftest');
  assert(missingDesk.introPaths.warm.length === 0, 'missing company does not inherit warm paths');
  assert(missingDesk.introPaths.recent.length === 0, 'missing company does not inherit recent paths');
  // desk for demo if present
  if (st.packets[0]) {
    const d = buildDesk(st.packets[0].roleId);
    assert(d.roleId === st.packets[0].roleId, 'desk');
    assert(d.introPaths && Array.isArray(d.introPaths.warm), 'desk intro');
    assert(d.workspace?.schema === 'demigod.role-workspace/1', 'desk workspace');
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
    console.log(`usage: node demigod-structured-hiring.mjs status|desk|workspace|shortlist|pack|audit|doctor [--role=] [--cand=] [--why=] [--json]
  workspace  role acceptance + calibration + company context + candidate channels + checkpoints
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
        return debriefRoundup(
          loadPackets().packets[p.roleId],
          Object.values(loadNotes().notes || {}).filter((n) => n.roleId === p.roleId),
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
      debriefs: debriefs.map((d) => ({
        roleId: d.roleId,
        stage: d.stage,
        noteCount: d.noteCount,
        decisionAidTally: d.decisionAidTally,
        disagreeMusts: (d.byMustHave || []).filter((m) => m.disagree).map((m) => m.mustHaveId),
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
      for (const d of out.debriefs) {
        console.log(
          `  debrief ${d.roleId} · stage=${d.stage} · notes=${d.noteCount} · aids=${JSON.stringify(d.decisionAidTally)}`,
        );
      }
      console.log(`  receipt: /tmp/dg-busy/structured-hiring-doctor.json`);
    }
    process.exit(out.ok ? 0 : 1);
  }

  if (cmd === 'desk' || cmd === 'workspace') {
    if (!role) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const desk = buildDesk(role);
    const output = cmd === 'workspace' ? desk.workspace : desk;
    if (json) console.log(JSON.stringify(output, null, 2));
    else {
      console.log(`# ${cmd === 'workspace' ? 'role workspace' : 'structured-hiring desk'} · ${desk.roleId}`);
      console.log(`  packet: ${desk.packet ? desk.packet.title : 'NONE'}`);
      console.log(
        `  batch: ${desk.batch ? `${desk.batch.active}/${desk.batch.max} active` : 'NONE'}`,
      );
      console.log(`  notes: ${desk.notes.length} · rediscover: ${desk.rediscover.length}`);
      console.log(
        `  workspace: ${desk.workspace.state} · ${desk.workspace.checkpoints.map((row) => `${row.id}=${row.ok ? 'yes' : 'no'}`).join(' · ')}`,
      );
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
