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
import {
  CORPUS_SCHEMA,
  loadCandidateEvidenceCorpus,
  projectCandidateEvidence,
} from './demigod-candidate-evidence.mjs';

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

/** Compile founder-authored criteria into inspectable questions; only humans make decisions. */
export function compileEvidenceReview(packet = null, notes = [], candidateEvidenceCorpus = null, at = new Date().toISOString()) {
  if (!packet) {
    return {
      schema: 'demigod.evidence-review/1',
      state: 'missing_role_packet',
      hardFilters: [],
      questions: [],
      globalScore: null,
    };
  }
  const evidenceProjection = projectCandidateEvidence({
    roleId: packet.roleId,
    packet,
    corpus: candidateEvidenceCorpus || { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] },
    at,
  });
  const evidenceById = new Map(evidenceProjection.items.map((row) => [row.evidenceId, row]));
  const packetAt = Date.parse(packet.updatedAt || packet.createdAt || '');
  const viewAt = Date.parse(at);
  const roleNotes = (Array.isArray(notes) ? notes : []).filter((note) => note?.roleId === packet.roleId);
  const questions = (packet.mustHaves || []).map((mustHave) => {
    const responses = [];
    for (const note of roleNotes) {
      const rating = (note.ratings || []).find((row) => row?.mustHaveId === mustHave.id);
      if (!rating) continue;
      const reviewedAt = note.reviewedAt || null;
      const reviewedMs = Date.parse(reviewedAt || '');
      const evidenceIds = Array.isArray(rating.evidenceIds) ? rating.evidenceIds : [];
      const cited = evidenceIds.map((id) => evidenceById.get(id));
      let state = Number.isFinite(reviewedMs) && reviewedMs > viewAt
        ? 'future'
        : Number.isFinite(packetAt) && (!Number.isFinite(reviewedMs) || reviewedMs < packetAt)
          ? 'stale'
          : 'answered';
      if (state !== 'future') {
        if (cited.some((row) => !row)) state = 'missing_citation';
        else if (cited.some((row) => row.mustHaveId !== mustHave.id || row.candId !== note.candId)) state = 'invalid_citation';
        else if (cited.some((row) => row.state === 'conflict')) state = 'conflict';
        else if (cited.some((row) => row.state === 'withdrawn')) state = 'withdrawn';
        else if (cited.some((row) => row.state === 'expired')) state = 'expired';
        else if (cited.some((row) => row.state === 'future')) state = 'future';
        else if (cited.some((row) => ['stale', 'corrected'].includes(row.state))) state = 'stale';
      }
      responses.push({
        candId: note.candId,
        state,
        rating: rating.rating,
        evidence: state === 'future' ? null : scrubPII(String(rating.evidence || '')).slice(0, 500),
        evidenceIds,
        citation: {
          source: 'human_review_note',
          reviewedAt,
          reviewedBy: note.reviewedBy || null,
        },
      });
    }
    for (const item of evidenceProjection.items.filter((row) => row.mustHaveId === mustHave.id)) {
      responses.push({
        candId: item.candId,
        state: item.state === 'active' ? 'answered' : item.state,
        rating: null,
        evidence: item.claim == null ? null : scrubPII(item.claim).slice(0, 500),
        evidenceIds: [item.evidenceId],
        citation: {
          source: item.source.type,
          sourceRef: item.source.ref,
          sourceUrl: item.source.url || null,
          sourceSpan: item.source.span || null,
          contentSha256: item.source.contentSha256,
          observedAt: item.source.observedAt || null,
          use: item.use,
          approvedBy: item.review?.by || null,
          approvedAt: item.review?.at || null,
          previewHash: item.review?.previewHash || null,
        },
      });
    }
    for (const response of responses) {
      if (response.rating && responses.some((other) =>
        other.rating && other.candId === response.candId && other.rating !== response.rating)) {
        response.state = 'conflict';
      }
    }
    let questionState = 'unknown';
    if (responses.some((row) => row.state === 'conflict')) questionState = 'conflict';
    else if (responses.some((row) => row.state === 'answered')) questionState = 'answered';
    else if (responses.some((row) => row.state === 'withdrawn')) questionState = 'withdrawn';
    else if (responses.some((row) => row.state === 'expired')) questionState = 'expired';
    else if (responses.some((row) => ['stale', 'corrected'].includes(row.state))) questionState = 'stale';
    return {
      mustHaveId: mustHave.id,
      label: mustHave.label,
      question: `What specific, permitted evidence shows ${mustHave.label}?`,
      state: questionState,
      responses,
    };
  });
  return {
    schema: 'demigod.evidence-review/1',
    state: questions.some((row) => row.state === 'conflict')
      ? 'needs_resolution'
      : questions.some((row) => row.state === 'unknown')
        ? 'needs_evidence'
        : questions.some((row) => ['stale', 'withdrawn', 'expired'].includes(row.state))
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
    candidateEvidence: evidenceProjection,
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
  candidateEvidenceCorpus = null,
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
    evidenceReview: compileEvidenceReview(packet, roleNotes, candidateEvidenceCorpus, at),
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

/** Derive a common operating picture from the current workspace; no new mission truth. */
export function buildMissionCase(workspace) {
  if (workspace?.schema !== 'demigod.role-workspace/1') throw new Error('role_workspace_required');
  const failed = (workspace.checkpoints || []).filter((row) => !row.ok);
  const evidenceState = workspace.evidenceReview?.state || 'missing';
  const channelErrors = workspace.candidateChannels?.errors || [];
  const waitingOn = failed.some((row) => row.id === 'accepted_role')
    ? 'role_acceptance'
    : failed.some((row) => row.id === 'calibrated_packet')
      ? 'role_calibration'
      : failed.some((row) => row.id === 'company_context')
        ? 'company_research'
        : evidenceState === 'needs_resolution'
          ? 'human_evidence_resolution'
          : ['needs_evidence', 'needs_refresh'].includes(evidenceState)
            ? 'evidence_research'
            : channelErrors.length
              ? 'operator_recovery'
              : workspace.calibration?.stage === 'mutual_pending'
                ? 'mutual_consent'
                : workspace.calibration?.stage === 'intro'
                  ? 'observed_outcome'
                  : 'human_review';
  const unresolved = [
    ...failed.map((row) => ({ kind: 'checkpoint', id: row.id, reason: row.reason })),
    ...(workspace.evidenceReview?.questions || [])
      .filter((row) => row.state !== 'answered')
      .map((row) => ({ kind: 'evidence_question', id: row.mustHaveId, reason: row.state })),
    ...channelErrors.map((reason, index) => ({ kind: 'channel_error', id: `channel-${index + 1}`, reason })),
  ];
  return {
    schema: 'demigod.role-mission-case/1',
    roleId: workspace.roleId,
    at: workspace.at,
    owner: 'human_operator',
    objective: workspace.calibration?.outcome90d || null,
    state: unresolved.length ? 'attention_needed' : 'review_active',
    waitingOn,
    unresolved,
    nextSafeAction: {
      kind: waitingOn,
      externalAction: false,
      note: 'Resolve inside the private role workspace; this projection grants no send, consent, intro, or employment-decision authority.',
    },
    closureConditions: ['role_filled', 'role_closed', 'role_paused', 'role_changed', 'outcome_recorded'],
    urgency: null,
  };
}

/** Compact provenance/impact manifest derived from the role workspace. */
export function buildEvidenceBill(workspace) {
  if (workspace?.schema !== 'demigod.role-workspace/1') throw new Error('role_workspace_required');
  const components = [];
  components.push({
    id: 'role-acceptance',
    kind: 'receipt',
    state: workspace.roleAcceptance?.accepted ? 'supported' : 'unknown',
    source: 'accepted_role_receipt',
    activity: 'accepted_role_projection',
    trustZone: 'private_operations',
    affects: ['mission_readiness'],
  });
  components.push({
    id: 'role-calibration',
    kind: 'packet',
    state: workspace.calibration?.status === 'ready' ? 'human_authored' : workspace.calibration?.status || 'unknown',
    source: 'founder_role_packet',
    activity: 'role_packet_projection',
    trustZone: 'private_operations',
    affects: (workspace.calibration?.mustHaves || []).map((row) => `question:${row.id}`),
  });
  components.push({
    id: 'company-context',
    kind: 'packet',
    state: workspace.company?.status === 'error'
      ? 'error'
      : workspace.company?.status === 'unknown'
        ? 'unknown'
      : workspace.company
        ? 'supported'
        : 'unknown',
    source: 'company_packet',
    activity: 'company_packet_projection',
    trustZone: 'public_company_evidence',
    affects: ['mission_company_context'],
  });
  for (const question of workspace.evidenceReview?.questions || []) {
    const questionId = `question:${question.mustHaveId}`;
    components.push({
      id: questionId,
      kind: 'derived_question',
      state: question.state,
      source: 'founder_role_packet',
      activity: 'compile_evidence_review',
      trustZone: 'private_operations',
      upstream: ['role-calibration'],
      affects: [question.mustHaveId],
    });
    for (const [index, response] of (question.responses || []).entries()) {
      const candidateEvidence = response.citation?.source !== 'human_review_note';
      components.push({
        id: response.evidenceIds?.[0] || `review:${question.mustHaveId}:${index + 1}`,
        kind: candidateEvidence ? 'candidate_evidence' : 'human_review',
        state: response.state,
        source: response.citation?.source || 'human_review_note',
        sourceAt: response.citation?.reviewedAt || response.citation?.observedAt || null,
        responsibleAgent: response.citation?.reviewedBy || null,
        subject: response.candId || null,
        activity: candidateEvidence ? 'evidence_capture' : 'human_review',
        trustZone: 'candidate_private',
        upstream: [questionId],
        affects: [questionId],
      });
    }
  }
  components.push({
    id: 'relationship-context',
    kind: 'derived_projection',
    state: 'human_authored',
    source: 'owned_relationship_records',
    activity: 'relationship_projection',
    trustZone: 'relationship_private',
    count: (workspace.relationshipContext?.warmIntroPaths || []).length
      + (workspace.relationshipContext?.recentIntroPaths || []).length,
    affects: ['introduction_route'],
  });
  components.push({
    id: 'conversation-context',
    kind: 'derived_projection',
    state: 'human_authored',
    source: 'private_call_notes',
    activity: 'conversation_projection',
    trustZone: 'conversation_private',
    count: (workspace.relationshipContext?.callNotes || []).length,
    affects: ['review_questions'],
  });
  const byState = {};
  for (const component of components) byState[component.state] = (byState[component.state] || 0) + 1;
  return {
    schema: 'demigod.evidence-bill/1',
    roleId: workspace.roleId,
    at: workspace.at,
    components,
    summary: { total: components.length, byState },
    policy: 'Lineage only. Components grant no score, decision, consent, intro, or external-action authority.',
  };
}

/** Preserve human reasoning around evidence without manufacturing a verdict. */
export function buildDecisionTrace(workspace, notes = []) {
  if (workspace?.schema !== 'demigod.role-workspace/1') throw new Error('role_workspace_required');
  const fields = ['initialView', 'contraryEvidence', 'changeCondition', 'finalRationale'];
  const reviews = (Array.isArray(notes) ? notes : [])
    .filter((note) => note?.roleId === workspace.roleId)
    .map((note) => {
      const rehearsal = note.rehearsal || null;
      const completed = fields.filter((field) => String(rehearsal?.[field] || '').trim()).length;
      return {
        candId: note.candId,
        pairId: note.pairId || null,
        reviewedAt: note.reviewedAt || null,
        reviewedBy: note.reviewedBy || null,
        decisionAid: note.decisionAid || 'none',
        rehearsalState: !rehearsal ? 'missing' : completed === fields.length ? 'complete' : 'incomplete',
        rehearsal,
        ratingCount: (note.ratings || []).length,
        consultedEvidence: rehearsal?.consultedEvidence || note.companyContextUsed || [],
        finalHumanDecision: null,
      };
    });
  return {
    schema: 'demigod.decision-trace/1',
    roleId: workspace.roleId,
    at: workspace.at,
    reviews,
    counts: {
      reviews: reviews.length,
      completeRehearsals: reviews.filter((row) => row.rehearsalState === 'complete').length,
      missingRehearsals: reviews.filter((row) => row.rehearsalState === 'missing').length,
    },
    globalScore: null,
    authority: 'human_only',
  };
}

/** Strict allowlist for founder/candidate mutual context. */
export function projectMutualMission(workspace) {
  if (workspace?.schema !== 'demigod.role-workspace/1') throw new Error('role_workspace_required');
  const identity = workspace.company?.identity || {};
  return {
    schema: 'demigod.role-mission-mutual/1',
    at: workspace.at,
    role: {
      title: workspace.calibration?.title || null,
      outcome90d: workspace.calibration?.outcome90d || null,
      mustHaves: workspace.calibration?.mustHaves || [],
      compBand: workspace.calibration?.compBand?.source === 'public_job_post'
        ? workspace.calibration.compBand
        : null,
      interviewPlan: workspace.calibration?.interviewPlan || [],
      withheld: [
        'dealBreakers',
        ...(workspace.calibration?.compBand && workspace.calibration.compBand.source !== 'public_job_post'
          ? ['founder_stated_compBand']
          : []),
      ],
    },
    company: workspace.company
      ? {
          name: identity.name || workspace.company.name || null,
          domain: identity.domain || null,
          website: identity.website || null,
          status: workspace.company.status || 'available',
        }
      : null,
    process: {
      stage: workspace.calibration?.stage || null,
      missionState: workspace.state,
      questions: (workspace.evidenceReview?.questions || []).map((row) => ({
        mustHaveId: row.mustHaveId,
        label: row.label,
        question: row.question,
      })),
    },
    consent: { state: 'pair_scope_required' },
    introduction: { state: 'mutual_consent_required' },
    authority: { employmentDecision: 'human', externalAction: 'none' },
  };
}

/** Immutable what-if comparison. It cannot commit or predict an outcome. */
export function compareMissionScenario(workspace, changes = {}) {
  if (workspace?.schema !== 'demigod.role-workspace/1') throw new Error('role_workspace_required');
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('scenario_changes_object');
  const allowed = ['title', 'outcome90d', 'mustHaves', 'dealBreakers', 'compBand', 'interviewPlan'];
  const keys = Object.keys(changes);
  const unknown = keys.filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`scenario_unknown_fields:${unknown.join(',')}`);
  if (!keys.length) throw new Error('scenario_changes_required');
  if (!workspace.calibration || workspace.calibration.status === 'missing') throw new Error('scenario_calibration_required');
  for (const key of ['mustHaves', 'dealBreakers', 'interviewPlan']) {
    if (key in changes && !Array.isArray(changes[key])) throw new Error(`scenario_${key}_array`);
  }
  const base = structuredClone(workspace.calibration || {});
  const proposed = { ...structuredClone(base), ...structuredClone(changes) };
  if (!String(proposed.title || '').trim() || String(proposed.title).length > 200) throw new Error('scenario_title');
  if (String(proposed.outcome90d || '').trim().length < 20 || String(proposed.outcome90d).length > 2000) {
    throw new Error('scenario_outcome90d');
  }
  if (!Array.isArray(proposed.mustHaves) || proposed.mustHaves.length < 3 || proposed.mustHaves.length > 7) {
    throw new Error('scenario_mustHaves_count');
  }
  const mustIds = new Set();
  for (const row of proposed.mustHaves) {
    if (!String(row?.id || '').trim() || !String(row?.label || '').trim()) throw new Error('scenario_mustHave_shape');
    if (mustIds.has(row.id)) throw new Error('scenario_mustHave_duplicate');
    mustIds.add(row.id);
  }
  if (!Array.isArray(proposed.dealBreakers) || proposed.dealBreakers.length > 10) throw new Error('scenario_dealBreakers');
  for (const row of proposed.dealBreakers) {
    if (!String(row?.id || '').trim() || !String(row?.label || '').trim()) throw new Error('scenario_dealBreaker_shape');
  }
  if (!Array.isArray(proposed.interviewPlan)) throw new Error('scenario_interviewPlan');
  for (const row of proposed.interviewPlan) {
    if (!mustIds.has(row?.mustHaveId)) throw new Error('scenario_interviewPlan_mustHave');
  }
  if (proposed.compBand != null && typeof proposed.compBand !== 'object') throw new Error('scenario_compBand');
  const changedFields = allowed.filter((key) => JSON.stringify(base[key] ?? null) !== JSON.stringify(proposed[key] ?? null));
  if (!changedFields.length) throw new Error('scenario_no_material_change');
  const baseMusts = new Map((base.mustHaves || []).map((row) => [row.id, row]));
  const proposedMusts = new Map((proposed.mustHaves || []).map((row) => [row.id, row]));
  const requirementIds = [...new Set([...baseMusts.keys(), ...proposedMusts.keys()])];
  let affectedRequirements = requirementIds.filter((id) =>
    JSON.stringify(baseMusts.get(id) || null) !== JSON.stringify(proposedMusts.get(id) || null));
  if (changedFields.includes('title') || changedFields.includes('outcome90d')) affectedRequirements = requirementIds;
  return {
    schema: 'demigod.role-mission-scenario/1',
    roleId: workspace.roleId,
    baseRoleTruthHash: workspace.roleAcceptance?.receipt?.roleTruthHash || null,
    changedFields,
    changes: structuredClone(changes),
    impact: {
      requirements: affectedRequirements,
      evidenceQuestions: affectedRequirements.map((id) => `question:${id}`),
      candidateFilters: changedFields.some((key) => ['mustHaves', 'dealBreakers'].includes(key)),
      interviewPlan: changedFields.includes('interviewPlan') || affectedRequirements.length > 0,
      offerContext: changedFields.includes('compBand'),
      roleTruthInvalidated: changedFields.length > 0,
    },
    unchangedFields: allowed.filter((key) => !changedFields.includes(key)),
    proposedCalibration: proposed,
    committable: false,
    predictedOutcome: null,
    authority: { externalAction: 'none' },
  };
}

export function composeRoleMission(workspace, notes = []) {
  return {
    schema: 'demigod.role-mission/1',
    roleId: workspace.roleId,
    at: workspace.at,
    state: workspace.state,
    case: buildMissionCase(workspace),
    evidenceBill: buildEvidenceBill(workspace),
    decisionTrace: buildDecisionTrace(workspace, notes),
    views: {
      private: workspace,
      mutual: projectMutualMission(workspace),
    },
    constitution: {
      review: 'human',
      employmentDecision: 'human',
      consent: 'existing_pair_receipts_only',
      intro: 'existing_mutual_consent_gate_only',
      externalAction: 'none',
      policyEngine: 'explicit_code_and_tests',
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
export function buildDesk(roleId, { at = new Date().toISOString() } = {}) {
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
  let candidateEvidenceCorpus = { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] };
  try {
    candidateEvidenceCorpus = loadCandidateEvidenceCorpus();
    if (packet) projectCandidateEvidence({ roleId: id, packet, corpus: candidateEvidenceCorpus });
  } catch (error) {
    candidateChannelErrors.push(`candidate_evidence_error:${String(error?.message || error)}`);
    candidateEvidenceCorpus = { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] };
  }
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
    candidateEvidenceCorpus,
    at,
  });
  const mission = composeRoleMission(workspace, notes);
  return {
    schema: 'demigod.structured-hiring-desk/1',
    at,
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
    mission,
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
  const fixtureCandidateEvidenceCorpus = {
    schema: CORPUS_SCHEMA,
    evidence: [
      {
        schema: 'demigod.candidate-evidence/1',
        evidenceId: 'ev-fixture-1',
        candId: 'cand-1',
        roleId: 'role-fixture',
        mustHaveId: 'mh1',
        criterionLabel: 'Backend craft',
        claim: 'private-candidate-claim-sentinel shows a production migration.',
        source: {
          type: 'candidate_submitted',
          ref: 'submission:fixture-1',
          contentSha256: 'a'.repeat(64),
          span: { text: 'private-source-span-sentinel from the submitted work sample.' },
          observedAt: '2026-08-01T00:00:00.000Z',
        },
        use: {
          purpose: 'role_evidence_review',
          basis: 'candidate_submission',
          policyVersion: 'candidate-evidence-policy/1',
          retainUntil: '2026-09-01T00:00:00.000Z',
        },
        review: {
          state: 'approved',
          by: 'operator',
          at: '2026-08-10T00:00:00.000Z',
          previewHash: 'd'.repeat(64),
        },
      },
      {
        schema: 'demigod.candidate-evidence/1',
        evidenceId: 'ev-fixture-2',
        candId: 'cand-2',
        roleId: 'role-fixture',
        mustHaveId: 'mh2',
        criterionLabel: 'Product judgment',
        claim: 'Public design note explains a product tradeoff and user outcome.',
        source: {
          type: 'public_work',
          ref: 'public:fixture-2',
          url: 'https://example.com/work',
          contentSha256: 'b'.repeat(64),
          span: { text: 'The design note compares alternatives and reports the observed outcome.' },
          observedAt: '2026-08-02T00:00:00.000Z',
        },
        use: {
          purpose: 'role_evidence_review',
          basis: 'public_professional_context',
          policyVersion: 'candidate-evidence-policy/1',
          retainUntil: '2026-09-01T00:00:00.000Z',
        },
      },
      {
        schema: 'demigod.candidate-evidence/1',
        evidenceId: 'ev-fixture-3',
        candId: 'cand-3',
        roleId: 'role-fixture',
        mustHaveId: 'mh3',
        criterionLabel: 'Clear communication',
        claim: 'Submitted explanation was once available for structured review.',
        source: {
          type: 'candidate_submitted',
          ref: 'submission:fixture-3',
          contentSha256: 'c'.repeat(64),
          span: { text: 'This raw evidence must disappear from the active projection.' },
          observedAt: '2026-08-03T00:00:00.000Z',
        },
        use: {
          purpose: 'role_evidence_review',
          basis: 'candidate_submission',
          policyVersion: 'candidate-evidence-policy/1',
          retainUntil: '2026-09-01T00:00:00.000Z',
        },
      },
    ],
    withdrawals: [{
      schema: 'demigod.candidate-evidence-withdrawal/1',
      withdrawalId: 'wd-fixture-1',
      candId: 'cand-3',
      roleId: 'role-fixture',
      evidenceIds: ['ev-fixture-3'],
      at: '2026-08-14T00:00:00.000Z',
      reason: 'Candidate withdrew the submitted evidence from this role review.',
    }],
  };
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
      dealBreakers: [{ id: 'db-private', label: 'private-deal-breaker-sentinel' }],
      compBand: { text: 'private-comp-sentinel', source: 'founder_stated' },
      stage: 'brief_ready',
    },
    companyPacket: { schema: 'demigod.company-packet/1', companyId: 'yc:acme', identity: { name: 'Acme' } },
    batch: { max: 3, candidates: [{ candId: 'cand-1', why: 'Relevant shipped work', state: 'active' }] },
    notes: [{
      roleId: 'role-fixture',
      candId: 'cand-1',
      reviewedAt: '2026-08-14T00:00:00.000Z',
      reviewedBy: 'operator',
      rehearsal: {
        initialView: 'The work sample appears relevant pending full review.',
        contraryEvidence: 'The sample may not show comparable production scale.',
        changeCondition: 'Verified ownership at similar scale would change the view.',
        finalRationale: 'Keep the evidence question open for the structured interview.',
        consultedEvidence: ['question:mh1'],
      },
      ratings: [{ mustHaveId: 'mh1', rating: 'yes', evidence: 'Shipped a production backend migration.', evidenceIds: ['ev-fixture-1'] }],
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
    candidateEvidenceCorpus: fixtureCandidateEvidenceCorpus,
    at: '2026-08-15T00:00:00.000Z',
  });
  assert(fixtureWorkspace.schema === 'demigod.role-workspace/1', 'workspace schema');
  assert(fixtureWorkspace.state === 'review_ready', 'accepted calibrated workspace ready');
  assert(fixtureWorkspace.checkpoints.every((row) => row.ok), 'workspace checkpoints');
  assert(fixtureWorkspace.candidateChannels.shortlist.active === 1, 'workspace shortlist');
  assert(fixtureWorkspace.candidateChannels.inbound.count === 1, 'workspace inbound');
  assert(fixtureWorkspace.candidateChannels.referrals.count === 1, 'workspace referrals');
  assert(fixtureWorkspace.evidenceReview.questions[0].state === 'answered', 'workspace cited evidence');
  assert(fixtureWorkspace.evidenceReview.questions[0].responses[0].evidenceIds[0] === 'ev-fixture-1', 'workspace preserves review evidence ID');
  const historicalReview = compileEvidenceReview(
    { ...fixtureWorkspace.calibration, roleId: 'role-fixture' },
    fixtureWorkspace.evidenceReview.questions[0].responses.length ? [{
      roleId: 'role-fixture',
      candId: 'cand-1',
      reviewedAt: '2026-08-14T00:00:00.000Z',
      ratings: [{ mustHaveId: 'mh1', rating: 'yes', evidence: 'Future private review text.', evidenceIds: ['ev-fixture-1'] }],
    }] : [],
    fixtureCandidateEvidenceCorpus,
    '2026-08-05T00:00:00.000Z',
  );
  const futureReview = historicalReview.questions[0].responses.find((row) => row.rating === 'yes');
  assert(futureReview.state === 'future' && futureReview.evidence === null, 'historical view withholds future review note');
  assert(historicalReview.questions[0].state === 'unknown', 'future evidence cannot answer historical question');
  assert(fixtureWorkspace.evidenceReview.questions[1].state === 'answered', 'workspace public work evidence');
  assert(fixtureWorkspace.evidenceReview.questions[2].state === 'withdrawn', 'workspace propagates withdrawal');
  assert(
    fixtureWorkspace.evidenceReview.candidateEvidence.items.find((row) => row.evidenceId === 'ev-fixture-3').claim === null,
    'workspace withholds withdrawn raw evidence',
  );
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
  const fixtureNotes = [{
    roleId: 'role-fixture',
    candId: 'cand-private-sentinel',
    reviewedAt: '2026-08-14T00:00:00.000Z',
    reviewedBy: 'private-reviewer-sentinel',
    decisionAid: 'missing_question',
    companyContextUsed: ['company:productSummary'],
    ratings: fixtureWorkspace.calibration.mustHaves.map((row) => ({
      mustHaveId: row.id,
      rating: 'yes',
      evidence: 'private-evidence-sentinel',
    })),
    rehearsal: {
      initialView: 'private-initial-sentinel',
      contraryEvidence: 'private-contrary-sentinel',
      changeCondition: 'private-change-sentinel',
      finalRationale: 'private-rationale-sentinel',
      consultedEvidence: ['question:mh1'],
    },
  }];
  const mission = composeRoleMission(fixtureWorkspace, fixtureNotes);
  assert(mission.schema === 'demigod.role-mission/1', 'mission schema');
  assert(mission.case.waitingOn === 'evidence_research', 'mission case waiting state');
  assert(mission.evidenceBill.components.some((row) => row.id === 'question:mh1'), 'evidence bill question');
  assert(mission.evidenceBill.components.some((row) => row.id === 'ev-fixture-2'), 'evidence bill candidate evidence');
  assert(mission.decisionTrace.reviews[0].rehearsalState === 'complete', 'decision rehearsal complete');
  const mutualJson = JSON.stringify(mission.views.mutual);
  for (const forbidden of ['cand-private-sentinel', 'private-reviewer-sentinel', 'private-evidence-sentinel', 'private-rationale-sentinel', 'private-deal-breaker-sentinel', 'private-comp-sentinel', 'private-candidate-claim-sentinel', 'private-source-span-sentinel', 'suppression', 'rating']) {
    assert(!mutualJson.includes(forbidden), `mutual view excludes ${forbidden}`);
  }
  const baseBeforeScenario = JSON.stringify(fixtureWorkspace);
  const changedMustHaves = fixtureWorkspace.calibration.mustHaves.map((row) =>
    row.id === 'mh1' ? { ...row, label: 'Backend craft at production scale' } : row);
  const scenario = compareMissionScenario(fixtureWorkspace, { mustHaves: changedMustHaves });
  assert(scenario.impact.requirements.includes('mh1'), 'scenario requirement impact');
  assert(scenario.impact.roleTruthInvalidated, 'scenario invalidates role truth');
  assert(scenario.committable === false && scenario.authority.externalAction === 'none', 'scenario cannot act');
  assert(JSON.stringify(fixtureWorkspace) === baseBeforeScenario, 'scenario does not mutate base');
  let scenarioRefused = false;
  try {
    compareMissionScenario(fixtureWorkspace, { automaticDecision: true });
  } catch {
    scenarioRefused = true;
  }
  assert(scenarioRefused, 'scenario rejects unknown authority field');
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
    console.log(`usage: node demigod-structured-hiring.mjs status|desk|workspace|mission|scenario|shortlist|pack|audit|doctor [--role=] [--cand=] [--why=] [--changes=JSON] [--at=ISO] [--json]
  workspace  role acceptance + calibration + company context + candidate channels + checkpoints
  mission    workspace + case + evidence bill + decision trace + private/mutual projections
  scenario   immutable comparison; requires --role and --changes JSON; never commits
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
  let changes = null;
  let at = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--role' && args[i + 1]) role = args[++i];
    else if (args[i].startsWith('--role=')) role = args[i].slice(7);
    else if (args[i] === '--cand' && args[i + 1]) cand = args[++i];
    else if (args[i].startsWith('--cand=')) cand = args[i].slice(7);
    else if (args[i] === '--why' && args[i + 1]) why = args[++i];
    else if (args[i].startsWith('--why=')) why = args[i].slice(6);
    else if (args[i] === '--changes' && args[i + 1]) changes = args[++i];
    else if (args[i].startsWith('--changes=')) changes = args[i].slice(10);
    else if (args[i] === '--at' && args[i + 1]) at = args[++i];
    else if (args[i].startsWith('--at=')) at = args[i].slice(5);
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

  if (cmd === 'desk' || cmd === 'workspace' || cmd === 'mission' || cmd === 'scenario') {
    if (!role) {
      console.error(JSON.stringify({ ok: false, error: '--role required' }));
      process.exit(1);
    }
    const desk = buildDesk(role, { at: at || new Date().toISOString() });
    let output = cmd === 'workspace' ? desk.workspace : cmd === 'mission' ? desk.mission : desk;
    if (cmd === 'scenario') {
      try {
        output = compareMissionScenario(desk.workspace, JSON.parse(changes || 'null'));
      } catch (error) {
        console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }));
        process.exit(1);
      }
    }
    if (json) console.log(JSON.stringify(output, null, 2));
    else {
      console.log(`# ${cmd === 'workspace' ? 'role workspace' : cmd === 'mission' ? 'role mission' : cmd === 'scenario' ? 'mission scenario' : 'structured-hiring desk'} · ${desk.roleId}`);
      console.log(`  packet: ${desk.packet ? desk.packet.title : 'NONE'}`);
      console.log(
        `  batch: ${desk.batch ? `${desk.batch.active}/${desk.batch.max} active` : 'NONE'}`,
      );
      console.log(`  notes: ${desk.notes.length} · rediscover: ${desk.rediscover.length}`);
      console.log(
        `  workspace: ${desk.workspace.state} · ${desk.workspace.checkpoints.map((row) => `${row.id}=${row.ok ? 'yes' : 'no'}`).join(' · ')}`,
      );
      if (cmd === 'mission') console.log(`  case: waiting=${desk.mission.case.waitingOn} · evidence=${desk.mission.evidenceBill.summary.total} components · rehearsals=${desk.mission.decisionTrace.counts.completeRehearsals}/${desk.mission.decisionTrace.counts.reviews}`);
      if (cmd === 'scenario') console.log(`  changed: ${output.changedFields.join(',')} · affected=${output.impact.requirements.join(',') || 'none'} · committable=no`);
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
