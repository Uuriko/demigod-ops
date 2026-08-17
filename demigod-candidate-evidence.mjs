#!/usr/bin/env node
/**
 * Candidate evidence: bounded, role-specific evidence with provenance and stop states.
 *
 * It previews and appends human-approved immutable assertions and stop events to one private
 * corpus, then projects corrections, withdrawals, expiry, and criterion drift. It never scores,
 * ranks, recommends, contacts, or grants action authority.
 *
 *   node demigod-candidate-evidence.mjs preview --input=INPUT.json [--out=PREVIEW.json]
 *   node demigod-candidate-evidence.mjs approve --preview=PREVIEW.json --by=operator
 *   node demigod-candidate-evidence.mjs withdraw --role=ID --cand=ID --evidence=ID --reason='…' --by=operator
 *   node demigod-candidate-evidence.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { safeResearchUrl } from './demigod-evidence.mjs';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
export const STORE_PATH = path.join(ROOT, 'DEMIGOD-CANDIDATE-EVIDENCE.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const CORPUS_SCHEMA = 'demigod.candidate-evidence-corpus/1';
export const EVIDENCE_SCHEMA = 'demigod.candidate-evidence/1';
export const WITHDRAWAL_SCHEMA = 'demigod.candidate-evidence-withdrawal/1';
export const PREVIEW_SCHEMA = 'demigod.candidate-evidence-preview/1';
export const EVIDENCE_POLICY_VERSION = 'candidate-evidence-policy/1';
export const SOURCE_POLICIES = Object.freeze({
  candidate_submitted: Object.freeze({ useBasis: 'candidate_submission', url: 'optional' }),
  public_work: Object.freeze({ useBasis: 'public_professional_context', url: 'required' }),
});

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const PURPOSE = 'role_evidence_review';
const MAX_TEXT = 1000;
const MAX_SPAN = 500;
const MAX_ARTIFACT = 100_000;
const RETENTION_MS = 90 * 864e5;
const MAX_RETENTION_MS = 365 * 864e5;

const validTime = (value) => Number.isFinite(Date.parse(String(value || '')));
const clean = (value) => String(value || '').trim();
const effectiveAt = (record) => record.review?.at || record.source.observedAt;

function requireId(value, field) {
  if (!SAFE_ID.test(clean(value))) throw new Error(`candidate_evidence_${field}`);
}

/** Validate one immutable evidence assertion. */
export function assertCandidateEvidence(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('candidate_evidence_object');
  if (record.schema !== EVIDENCE_SCHEMA) throw new Error('candidate_evidence_schema');
  for (const field of ['evidenceId', 'candId', 'roleId', 'mustHaveId']) requireId(record[field], field);
  const criterionLabel = clean(record.criterionLabel);
  if (criterionLabel.length < 3 || criterionLabel.length > 300) throw new Error('candidate_evidence_criterionLabel');
  const claim = clean(record.claim);
  if (claim.length < 8 || claim.length > MAX_TEXT) throw new Error('candidate_evidence_claim');

  const policy = SOURCE_POLICIES[record.source?.type];
  if (!policy) throw new Error('candidate_evidence_source_type');
  requireId(record.source.ref, 'source_ref');
  if (policy.url === 'required' && !safeResearchUrl(record.source.url)) throw new Error('candidate_evidence_source_url');
  if (record.source.url != null && !safeResearchUrl(record.source.url)) throw new Error('candidate_evidence_source_url');
  if (!SHA256.test(clean(record.source.contentSha256))) throw new Error('candidate_evidence_source_sha256');
  const span = clean(record.source.span?.text);
  if (span.length < 8 || span.length > MAX_SPAN) throw new Error('candidate_evidence_source_span');
  if (!validTime(record.source.observedAt)) throw new Error('candidate_evidence_observedAt');
  if (record.source.updatedAt != null && !validTime(record.source.updatedAt)) throw new Error('candidate_evidence_updatedAt');
  if (record.source.updatedAt != null && Date.parse(record.source.updatedAt) > Date.parse(record.source.observedAt)) {
    throw new Error('candidate_evidence_source_clock_order');
  }

  if (record.use?.purpose !== PURPOSE) throw new Error('candidate_evidence_purpose');
  if (record.use?.basis !== policy.useBasis) throw new Error('candidate_evidence_use_basis');
  if (record.use?.policyVersion !== EVIDENCE_POLICY_VERSION) throw new Error('candidate_evidence_policy_version');
  if (!validTime(record.use?.retainUntil)) throw new Error('candidate_evidence_retainUntil');
  if (Date.parse(record.use.retainUntil) <= Date.parse(record.source.observedAt)) {
    throw new Error('candidate_evidence_retention_order');
  }
  if (record.supersedes != null) {
    requireId(record.supersedes, 'supersedes');
    if (record.supersedes === record.evidenceId) throw new Error('candidate_evidence_self_supersedes');
  }
  if (record.review != null) {
    if (record.review?.state !== 'approved') throw new Error('candidate_evidence_review_state');
    requireId(record.review.by, 'review_by');
    if (!validTime(record.review.at)) throw new Error('candidate_evidence_review_at');
    if (!SHA256.test(clean(record.review.previewHash))) throw new Error('candidate_evidence_review_previewHash');
    if (Date.parse(record.review.at) < Date.parse(record.source.observedAt)) throw new Error('candidate_evidence_review_clock');
  }
  return true;
}

/** Validate an append-only stop event. The raw assertion is withheld after projection. */
export function assertEvidenceWithdrawal(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('candidate_evidence_withdrawal_object');
  if (event.schema !== WITHDRAWAL_SCHEMA) throw new Error('candidate_evidence_withdrawal_schema');
  for (const field of ['withdrawalId', 'candId', 'roleId']) requireId(event[field], field);
  if (!Array.isArray(event.evidenceIds) || !event.evidenceIds.length || event.evidenceIds.length > 50) {
    throw new Error('candidate_evidence_withdrawal_targets');
  }
  for (const id of event.evidenceIds) requireId(id, 'withdrawal_target');
  if (new Set(event.evidenceIds).size !== event.evidenceIds.length) throw new Error('candidate_evidence_withdrawal_duplicate');
  if (!validTime(event.at)) throw new Error('candidate_evidence_withdrawal_at');
  const reason = clean(event.reason);
  if (reason.length < 3 || reason.length > 500) throw new Error('candidate_evidence_withdrawal_reason');
  if (event.by != null) requireId(event.by, 'withdrawal_by');
  return true;
}

export function loadCandidateEvidenceCorpus(file = STORE_PATH) {
  if (!fs.existsSync(file)) return { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] };
  const corpus = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!corpus || corpus.schema !== CORPUS_SCHEMA || !Array.isArray(corpus.evidence) || !Array.isArray(corpus.withdrawals)) {
    throw new Error('candidate_evidence_corpus_schema');
  }
  return corpus;
}

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

function criterionFor(packet, roleId, mustHaveId) {
  if (!packet || packet.roleId !== roleId || !Array.isArray(packet.mustHaves)) {
    throw new Error('candidate_evidence_role_packet');
  }
  const criterion = packet.mustHaves.find((row) => row?.id === mustHaveId);
  if (!criterion || !clean(criterion.label)) throw new Error('candidate_evidence_mustHaveId');
  return criterion;
}

function validateProposal(record, packet, corpus, at, acceptedRole = null) {
  assertCandidateEvidence(record);
  if (record.review != null) throw new Error('candidate_evidence_preview_review_forbidden');
  criterionFor(packet, record.roleId, record.mustHaveId);
  if (packet.demo !== true && acceptedRole?.roleId !== record.roleId) throw new Error('candidate_evidence_role_not_accepted');
  if (clean(record.criterionLabel) !== clean(criterionFor(packet, record.roleId, record.mustHaveId).label)) {
    throw new Error('candidate_evidence_criterion_drift');
  }
  if (!validTime(at) || Date.parse(record.source.observedAt) > Date.parse(at)) {
    throw new Error('candidate_evidence_future_observation');
  }
  if (Date.parse(record.use.retainUntil) <= Date.parse(at)) throw new Error('candidate_evidence_already_expired');
  if (Date.parse(record.use.retainUntil) - Date.parse(at) > MAX_RETENTION_MS) {
    throw new Error('candidate_evidence_retention_too_long');
  }
  const projection = projectCandidateEvidence({ roleId: record.roleId, packet, corpus, at });
  const sameId = corpus.evidence.find((row) => row.evidenceId === record.evidenceId);
  if (sameId) throw new Error(`candidate_evidence_duplicate:${record.evidenceId}`);
  const sameArtifact = corpus.evidence.find((row) =>
    row.roleId === record.roleId
    && row.candId === record.candId
    && row.mustHaveId === record.mustHaveId
    && row.source.contentSha256 === record.source.contentSha256
    && clean(row.claim).toLowerCase() === clean(record.claim).toLowerCase()
  );
  if (sameArtifact) throw new Error(`candidate_evidence_duplicate_artifact:${sameArtifact.evidenceId}`);
  const crossCandidate = corpus.evidence.find((row) =>
    row.roleId === record.roleId
    && row.candId !== record.candId
    && row.source.ref === record.source.ref
    && row.source.contentSha256 === record.source.contentSha256
  );
  if (crossCandidate) throw new Error(`candidate_evidence_cross_candidate_source:${crossCandidate.evidenceId}`);
  if (record.supersedes) {
    const predecessor = corpus.evidence.find((row) => row.evidenceId === record.supersedes);
    if (!predecessor) throw new Error(`candidate_evidence_missing_superseded:${record.supersedes}`);
    if (predecessor.candId !== record.candId || predecessor.roleId !== record.roleId || predecessor.mustHaveId !== record.mustHaveId) {
      throw new Error(`candidate_evidence_cross_scope_supersedes:${record.evidenceId}`);
    }
    if (Date.parse(record.source.observedAt) <= Date.parse(predecessor.source.observedAt)) {
      throw new Error(`candidate_evidence_supersedes_clock:${record.evidenceId}`);
    }
    const state = projection.items.find((row) => row.evidenceId === predecessor.evidenceId)?.state;
    if (!['active', 'conflict', 'stale'].includes(state)) {
      throw new Error(`candidate_evidence_inactive_superseded:${predecessor.evidenceId}`);
    }
  }
  return true;
}

/** Pure normalized preview. The full artifact is hashed but never retained in the proposal. */
export function previewCandidateEvidence({ input, packet, acceptedRole = null, corpus = null, at = new Date().toISOString() } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('candidate_evidence_preview_input');
  if (!validTime(at)) throw new Error('candidate_evidence_preview_at');
  const roleId = clean(input.roleId);
  const candId = clean(input.candId);
  const mustHaveId = clean(input.mustHaveId);
  for (const [field, value] of Object.entries({ roleId, candId, mustHaveId })) requireId(value, field);
  const criterion = criterionFor(packet, roleId, mustHaveId);
  const sourceType = clean(input.sourceType || input.source?.type);
  const policy = SOURCE_POLICIES[sourceType];
  if (!policy) throw new Error('candidate_evidence_source_type');
  const artifactText = String(input.artifactText ?? input.source?.artifactText ?? '');
  if (artifactText.trim().length < 8 || artifactText.length > MAX_ARTIFACT) throw new Error('candidate_evidence_artifact');
  const spanText = clean(input.sourceSpan ?? input.source?.span?.text);
  if (spanText.length < 8 || spanText.length > MAX_SPAN || !artifactText.includes(spanText)) {
    throw new Error('candidate_evidence_source_span');
  }
  const contentSha256 = sha256(artifactText);
  const observedAt = input.observedAt || input.source?.observedAt || at;
  if (!validTime(observedAt) || Date.parse(observedAt) > Date.parse(at)) throw new Error('candidate_evidence_future_observation');
  const retainUntil = input.retainUntil || new Date(Date.parse(at) + RETENTION_MS).toISOString();
  const sourceUrl = clean(input.sourceUrl || input.source?.url) || null;
  const sourceRef = clean(input.sourceRef || input.source?.ref) || `${sourceType}:${contentSha256.slice(0, 24)}`;
  const claim = clean(input.claim);
  const supersedes = clean(input.supersedes) || null;
  const identity = [roleId, candId, mustHaveId, contentSha256, claim.toLowerCase(), supersedes || ''].join('\0');
  const record = {
    schema: EVIDENCE_SCHEMA,
    evidenceId: clean(input.evidenceId) || `ev-${sha256(identity).slice(0, 24)}`,
    candId,
    roleId,
    mustHaveId,
    criterionLabel: clean(criterion.label),
    claim,
    source: {
      type: sourceType,
      ref: sourceRef,
      ...(sourceUrl ? { url: sourceUrl } : {}),
      contentSha256,
      span: { text: spanText },
      observedAt,
      ...(input.updatedAt || input.source?.updatedAt ? { updatedAt: input.updatedAt || input.source.updatedAt } : {}),
    },
    use: {
      purpose: PURPOSE,
      basis: policy.useBasis,
      policyVersion: EVIDENCE_POLICY_VERSION,
      retainUntil,
    },
    ...(supersedes ? { supersedes } : {}),
  };
  const current = corpus || { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] };
  validateProposal(record, packet, current, at, acceptedRole);
  const previewHash = sha256(JSON.stringify(record));
  return {
    schema: PREVIEW_SCHEMA,
    at,
    previewHash,
    proposedEvidence: record,
    committable: false,
    authority: { approval: 'human_required', employmentDecision: 'human', externalAction: 'none' },
    policy: 'Preview only. Artifact body is hashed, not retained; approval must bind to this exact hash.',
  };
}

/** Append one exact human-approved preview under a corpus lock. */
export function approveCandidateEvidence({ preview, previewHash, approvedBy, packet, acceptedRole = null, file = STORE_PATH, at = new Date().toISOString() } = {}) {
  if (preview?.schema !== PREVIEW_SCHEMA || !preview.proposedEvidence) throw new Error('candidate_evidence_preview_schema');
  requireId(approvedBy, 'review_by');
  if (!validTime(at)) throw new Error('candidate_evidence_review_at');
  const expected = sha256(JSON.stringify(preview.proposedEvidence));
  if (!SHA256.test(clean(previewHash)) || previewHash !== preview.previewHash || previewHash !== expected) {
    throw new Error('candidate_evidence_preview_hash_mismatch');
  }
  return withFileLock(`${file}.lock`, () => {
    const corpus = loadCandidateEvidenceCorpus(file);
    validateProposal(preview.proposedEvidence, packet, corpus, at, acceptedRole);
    const evidence = {
      ...structuredClone(preview.proposedEvidence),
      review: { state: 'approved', by: approvedBy, at, previewHash },
    };
    assertCandidateEvidence(evidence);
    const next = { ...corpus, evidence: [...corpus.evidence, evidence] };
    projectCandidateEvidence({ roleId: evidence.roleId, packet, corpus: next, at });
    atomicWrite(file, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    return {
      ok: true,
      schema: 'demigod.candidate-evidence-approval/1',
      at,
      evidenceId: evidence.evidenceId,
      previewHash,
      approvedBy,
      authority: { employmentDecision: 'human', externalAction: 'none' },
    };
  });
}

/** A rejected preview is a content-free receipt and never enters the corpus. */
export function rejectCandidateEvidence({ previewHash, rejectedBy, reason, at = new Date().toISOString() } = {}) {
  if (!SHA256.test(clean(previewHash))) throw new Error('candidate_evidence_preview_hash');
  requireId(rejectedBy, 'review_by');
  const why = clean(reason);
  if (why.length < 3 || why.length > 500) throw new Error('candidate_evidence_rejection_reason');
  if (!validTime(at)) throw new Error('candidate_evidence_rejection_at');
  return {
    ok: true,
    schema: 'demigod.candidate-evidence-rejection/1',
    at,
    previewHash,
    rejectedBy,
    reason: why,
    appended: false,
    authority: { externalAction: 'none' },
  };
}

/** Append one human-authored stop event. */
export function withdrawCandidateEvidence({ roleId, candId, evidenceIds, reason, by, packet, file = STORE_PATH, at = new Date().toISOString() } = {}) {
  requireId(roleId, 'roleId');
  requireId(candId, 'candId');
  requireId(by, 'withdrawal_by');
  if (!validTime(at)) throw new Error('candidate_evidence_withdrawal_at');
  return withFileLock(`${file}.lock`, () => {
    const corpus = loadCandidateEvidenceCorpus(file);
    const projection = projectCandidateEvidence({ roleId, packet, corpus, at });
    for (const evidenceId of evidenceIds || []) {
      const item = projection.items.find((row) => row.evidenceId === evidenceId);
      if (!item || item.candId !== candId) throw new Error(`candidate_evidence_cross_scope_withdrawal:${evidenceId}`);
      if (!['active', 'conflict', 'stale'].includes(item.state)) throw new Error(`candidate_evidence_inactive_withdrawal:${evidenceId}`);
    }
    const event = {
      schema: WITHDRAWAL_SCHEMA,
      withdrawalId: `wd-${crypto.randomUUID()}`,
      candId,
      roleId,
      evidenceIds: [...new Set(evidenceIds || [])],
      at,
      reason: clean(reason),
      by,
    };
    assertEvidenceWithdrawal(event);
    const next = { ...corpus, withdrawals: [...corpus.withdrawals, event] };
    projectCandidateEvidence({ roleId, packet, corpus: next, at });
    atomicWrite(file, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    return { ok: true, event, authority: { employmentDecision: 'human', externalAction: 'none' } };
  });
}

/**
 * Project evidence for one role. Assertions are immutable; a correction is a new assertion with
 * `supersedes`, and withdrawal is a separate stop event. Inactive raw text is withheld.
 */
export function projectCandidateEvidence({ roleId, packet = null, corpus = null, at = new Date().toISOString() } = {}) {
  requireId(roleId, 'roleId');
  if (!validTime(at)) throw new Error('candidate_evidence_projection_at');
  const atMs = Date.parse(at);
  if (!packet || packet.roleId !== roleId || !Array.isArray(packet.mustHaves) || !packet.mustHaves.length) {
    throw new Error('candidate_evidence_role_packet');
  }
  const criterionIds = new Set();
  for (const criterion of packet.mustHaves) {
    requireId(criterion?.id, 'mustHaveId');
    if (!clean(criterion?.label) || criterionIds.has(criterion.id)) throw new Error('candidate_evidence_role_criteria');
    criterionIds.add(criterion.id);
  }
  const source = corpus || { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] };
  if (source.schema !== CORPUS_SCHEMA || !Array.isArray(source.evidence) || !Array.isArray(source.withdrawals)) {
    throw new Error('candidate_evidence_corpus_schema');
  }
  for (const record of source.evidence) assertCandidateEvidence(record);
  for (const event of source.withdrawals) assertEvidenceWithdrawal(event);
  const ids = new Map();
  for (const record of source.evidence) {
    if (ids.has(record.evidenceId)) throw new Error(`candidate_evidence_duplicate:${record.evidenceId}`);
    ids.set(record.evidenceId, record);
  }
  const superseded = new Set();
  const effectiveSuperseded = new Set();
  for (const record of source.evidence) {
    if (!record.supersedes) continue;
    const previous = ids.get(record.supersedes);
    if (!previous) throw new Error(`candidate_evidence_missing_superseded:${record.supersedes}`);
    if (previous.candId !== record.candId || previous.roleId !== record.roleId || previous.mustHaveId !== record.mustHaveId) {
      throw new Error(`candidate_evidence_cross_scope_supersedes:${record.evidenceId}`);
    }
    if (Date.parse(effectiveAt(record)) <= Date.parse(effectiveAt(previous))) {
      throw new Error(`candidate_evidence_supersedes_clock:${record.evidenceId}`);
    }
    if (superseded.has(record.supersedes)) throw new Error(`candidate_evidence_supersedes_fork:${record.supersedes}`);
    superseded.add(record.supersedes);
    if (Date.parse(effectiveAt(record)) <= atMs) effectiveSuperseded.add(record.supersedes);
  }
  for (const record of source.evidence) {
    const seen = new Set([record.evidenceId]);
    let cursor = record;
    while (cursor.supersedes) {
      if (seen.has(cursor.supersedes)) throw new Error(`candidate_evidence_supersedes_cycle:${record.evidenceId}`);
      seen.add(cursor.supersedes);
      cursor = ids.get(cursor.supersedes);
    }
  }

  const withdrawalIds = new Set();
  const withdrawn = new Set();
  for (const event of source.withdrawals) {
    if (withdrawalIds.has(event.withdrawalId)) throw new Error(`candidate_evidence_withdrawal_duplicate_id:${event.withdrawalId}`);
    withdrawalIds.add(event.withdrawalId);
    for (const evidenceId of event.evidenceIds) {
      const target = ids.get(evidenceId);
      if (!target) throw new Error(`candidate_evidence_missing_withdrawal_target:${evidenceId}`);
      if (target.candId !== event.candId || target.roleId !== event.roleId) {
        throw new Error(`candidate_evidence_cross_scope_withdrawal:${evidenceId}`);
      }
      if (Date.parse(event.at) < Date.parse(effectiveAt(target))) {
        throw new Error(`candidate_evidence_withdrawal_clock:${evidenceId}`);
      }
      if (Date.parse(event.at) <= atMs) withdrawn.add(evidenceId);
    }
  }

  const criteria = new Map(packet.mustHaves.map((row) => [row.id, clean(row.label)]));
  const roleRecords = source.evidence.filter((record) => record.roleId === roleId);
  const states = new Map(roleRecords.map((record) => {
    let state = 'active';
    if (Date.parse(effectiveAt(record)) > atMs) state = 'future';
    else if (effectiveSuperseded.has(record.evidenceId)) state = 'corrected';
    else if (withdrawn.has(record.evidenceId)) state = 'withdrawn';
    else if (Date.parse(record.use.retainUntil) <= atMs) state = 'expired';
    else if (!criteria.has(record.mustHaveId) || criteria.get(record.mustHaveId) !== clean(record.criterionLabel)) state = 'stale';
    return [record.evidenceId, state];
  }));
  const activeGroups = new Map();
  for (const record of roleRecords.filter((row) => states.get(row.evidenceId) === 'active')) {
    const key = `${record.candId}\0${record.mustHaveId}`;
    activeGroups.set(key, [...(activeGroups.get(key) || []), record]);
  }
  for (const records of activeGroups.values()) {
    if (new Set(records.map((record) => clean(record.claim).toLowerCase())).size < 2) continue;
    for (const record of records) states.set(record.evidenceId, 'conflict');
  }

  const items = roleRecords.map((record) => {
    const state = states.get(record.evidenceId);
    const exposeRaw = ['active', 'conflict', 'stale'].includes(state);
    return {
      evidenceId: record.evidenceId,
      candId: record.candId,
      mustHaveId: record.mustHaveId,
      criterionLabel: record.criterionLabel,
      state,
      claim: exposeRaw ? record.claim : null,
      source: exposeRaw ? structuredClone(record.source) : {
        type: record.source.type,
        ref: record.source.ref,
        contentSha256: record.source.contentSha256,
      },
      use: structuredClone(record.use),
      review: record.review ? structuredClone(record.review) : null,
      supersedes: record.supersedes || null,
    };
  });
  const byState = {};
  for (const item of items) byState[item.state] = (byState[item.state] || 0) + 1;
  return {
    schema: 'demigod.candidate-evidence-projection/1',
    roleId,
    at,
    items,
    summary: { total: items.length, byState },
    globalScore: null,
    authority: { review: 'human', employmentDecision: 'human', externalAction: 'none' },
    policy: 'Private role evidence only. Inactive raw text is withheld; unknown remains valid.',
  };
}

function selftest() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(`candidate-evidence selftest: ${message}`);
  };
  const hash = 'a'.repeat(64);
  const base = {
    schema: EVIDENCE_SCHEMA,
    candId: 'cand-1',
    roleId: 'role-1',
    mustHaveId: 'mh1',
    criterionLabel: 'Backend craft',
    claim: 'Candidate shipped a production migration with measured reliability gains.',
    source: {
      type: 'candidate_submitted',
      ref: 'submission:1',
      contentSha256: hash,
      span: { text: 'Led the production migration and documented rollback behavior.' },
      observedAt: '2026-08-01T00:00:00.000Z',
    },
    use: {
      purpose: PURPOSE,
      basis: 'candidate_submission',
      policyVersion: EVIDENCE_POLICY_VERSION,
      retainUntil: '2026-09-01T00:00:00.000Z',
    },
  };
  const correction = {
    ...structuredClone(base),
    evidenceId: 'ev-2',
    claim: 'Candidate contributed to, but did not lead, the migration.',
    source: { ...base.source, contentSha256: 'd'.repeat(64), observedAt: '2026-08-04T00:00:00.000Z' },
    supersedes: 'ev-1',
  };
  const publicWork = {
    ...structuredClone(base),
    evidenceId: 'ev-3',
    candId: 'cand-2',
    mustHaveId: 'mh2',
    criterionLabel: 'Product judgment',
    claim: 'Public design note explains the tradeoff and observed user outcome.',
    source: { ...base.source, type: 'public_work', ref: 'public:design-note', url: 'https://example.com/work', contentSha256: 'b'.repeat(64) },
    use: { ...base.use, basis: 'public_professional_context' },
  };
  const corpus = {
    schema: CORPUS_SCHEMA,
    evidence: [{ ...base, evidenceId: 'ev-1' }, correction, publicWork],
    withdrawals: [],
  };
  const packet = { roleId: 'role-1', demo: true, mustHaves: [{ id: 'mh1', label: 'Backend craft' }, { id: 'mh2', label: 'Product judgment' }] };
  const projection = projectCandidateEvidence({ roleId: 'role-1', packet, corpus, at: '2026-08-15T00:00:00.000Z' });
  assert(projection.items.find((row) => row.evidenceId === 'ev-1').state === 'corrected', 'superseded assertion corrected');
  assert(projection.items.find((row) => row.evidenceId === 'ev-1').claim === null, 'corrected raw text withheld');
  assert(projection.items.find((row) => row.evidenceId === 'ev-2').state === 'active', 'correction active');
  assert(projection.items.find((row) => row.evidenceId === 'ev-3').state === 'active', 'public work active');
  const historical = projectCandidateEvidence({ roleId: 'role-1', packet, corpus, at: '2026-08-03T00:00:00.000Z' });
  assert(historical.items.find((row) => row.evidenceId === 'ev-1').state === 'active', 'historical snapshot predates correction');
  assert(historical.items.find((row) => row.evidenceId === 'ev-2').state === 'future', 'future correction withheld historically');
  const conflicting = projectCandidateEvidence({
    roleId: 'role-1', packet,
    corpus: {
      schema: CORPUS_SCHEMA,
      evidence: [
        { ...base, evidenceId: 'ev-conflict-1' },
        { ...structuredClone(base), evidenceId: 'ev-conflict-2', claim: 'Candidate only observed the migration work.' },
      ],
      withdrawals: [],
    },
    at: '2026-08-15T00:00:00.000Z',
  });
  assert(conflicting.items.every((row) => row.state === 'conflict'), 'conflicting active claims remain visible');
  const expired = projectCandidateEvidence({ roleId: 'role-1', packet, corpus, at: '2026-09-02T00:00:00.000Z' });
  assert(expired.items.find((row) => row.evidenceId === 'ev-2').state === 'expired', 'retention expiry stops evidence');
  const changed = projectCandidateEvidence({
    roleId: 'role-1',
    packet: { roleId: 'role-1', mustHaves: [{ id: 'mh1', label: 'Backend craft at scale' }, { id: 'mh2', label: 'Product judgment' }] },
    corpus,
    at: '2026-08-15T00:00:00.000Z',
  });
  assert(changed.items.find((row) => row.evidenceId === 'ev-2').state === 'stale', 'changed criterion stales dependent evidence');
  assert(changed.items.find((row) => row.evidenceId === 'ev-3').state === 'active', 'unrelated criterion remains active');
  const stopped = projectCandidateEvidence({
    roleId: 'role-1', packet,
    corpus: {
      ...corpus,
      withdrawals: [{
        schema: WITHDRAWAL_SCHEMA,
        withdrawalId: 'wd-1',
        candId: 'cand-2',
        roleId: 'role-1',
        evidenceIds: ['ev-3'],
        at: '2026-08-14T00:00:00.000Z',
        reason: 'Candidate withdrew this evidence from role review.',
      }],
    },
    at: '2026-08-15T00:00:00.000Z',
  });
  const withdrawnItem = stopped.items.find((row) => row.evidenceId === 'ev-3');
  assert(withdrawnItem.state === 'withdrawn' && withdrawnItem.claim === null, 'withdrawal stops and withholds raw text');
  assert(stopped.globalScore === null && stopped.authority.externalAction === 'none', 'no score or action authority');
  let refused = false;
  try {
    projectCandidateEvidence({
      roleId: 'role-1', packet,
      corpus: {
        ...corpus,
        withdrawals: [{
          schema: WITHDRAWAL_SCHEMA,
          withdrawalId: 'wd-bad',
          candId: 'cand-wrong',
          roleId: 'role-1',
          evidenceIds: ['ev-3'],
          at: '2026-08-14T00:00:00.000Z',
          reason: 'Cross-scope withdrawal must fail closed.',
        }],
      },
      at: '2026-08-15T00:00:00.000Z',
    });
  } catch {
    refused = true;
  }
  assert(refused, 'cross-scope withdrawal refused');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-candidate-evidence-'));
  const store = path.join(tempDir, 'corpus.json');
  try {
    const artifactText = 'Candidate led a production migration and documented measured rollback behavior.';
    const input = {
      roleId: 'role-1',
      candId: 'cand-workbench',
      mustHaveId: 'mh1',
      claim: 'Candidate led a production migration with documented rollback behavior.',
      sourceType: 'candidate_submitted',
      artifactText,
      sourceSpan: 'led a production migration and documented measured rollback behavior',
    };
    const preview = previewCandidateEvidence({
      input,
      packet,
      at: '2026-08-16T00:00:00.000Z',
    });
    refused = false;
    try {
      previewCandidateEvidence({ input, packet: { ...packet, demo: false }, at: '2026-08-16T00:00:00.000Z' });
    } catch {
      refused = true;
    }
    assert(refused, 'unaccepted non-demo role refused');
    assert(preview.committable === false, 'preview never committable');
    assert(preview.proposedEvidence.source.contentSha256 === sha256(artifactText), 'artifact hash captured');
    assert(preview.proposedEvidence.use.purpose === PURPOSE, 'purpose captured');
    assert(!fs.existsSync(store), 'preview writes nothing');
    approveCandidateEvidence({
      preview,
      previewHash: preview.previewHash,
      approvedBy: 'operator',
      packet,
      file: store,
      at: '2026-08-16T00:01:00.000Z',
    });
    const approved = loadCandidateEvidenceCorpus(store);
    assert(approved.evidence.length === 1 && approved.evidence[0].review?.state === 'approved', 'approval appended once');
    assert((fs.statSync(store).mode & 0o777) === 0o600, 'private store mode');
    const rejected = rejectCandidateEvidence({
      previewHash: 'f'.repeat(64),
      rejectedBy: 'operator',
      reason: 'The source span does not support the claim.',
      at: '2026-08-16T00:01:30.000Z',
    });
    assert(rejected.appended === false && loadCandidateEvidenceCorpus(store).evidence.length === 1, 'rejection appends no evidence');
    refused = false;
    try {
      approveCandidateEvidence({
        preview: { ...preview, proposedEvidence: { ...preview.proposedEvidence, claim: 'Tampered claim after human preview.' } },
        previewHash: preview.previewHash,
        approvedBy: 'operator',
        packet,
        file: store,
        at: '2026-08-16T00:01:45.000Z',
      });
    } catch {
      refused = true;
    }
    assert(refused, 'tampered preview refused');
    refused = false;
    try {
      approveCandidateEvidence({
        preview,
        previewHash: preview.previewHash,
        approvedBy: 'operator',
        packet,
        file: store,
        at: '2026-08-16T00:02:00.000Z',
      });
    } catch {
      refused = true;
    }
    assert(refused, 'duplicate approval refused');
    refused = false;
    try {
      previewCandidateEvidence({
        input: {
          ...input,
          candId: 'cand-cross-scope',
        },
        packet,
        corpus: loadCandidateEvidenceCorpus(store),
        at: '2026-08-16T00:02:00.000Z',
      });
    } catch {
      refused = true;
    }
    assert(refused, 'same source cannot silently cross candidates');
    refused = false;
    try {
      previewCandidateEvidence({
        input: {
          ...input,
          candId: 'cand-public',
          sourceType: 'public_work',
          sourceUrl: 'http://127.0.0.1/private',
        },
        packet,
        corpus: loadCandidateEvidenceCorpus(store),
        at: '2026-08-16T00:02:00.000Z',
      });
    } catch {
      refused = true;
    }
    assert(refused, 'unsafe public-work URL refused');
    const expiringPreview = previewCandidateEvidence({
      input: {
        ...input,
        candId: 'cand-expiring',
        artifactText: 'Candidate submitted a separate artifact with a short review retention window.',
        sourceSpan: 'submitted a separate artifact with a short review retention window',
        retainUntil: '2026-08-16T00:02:30.000Z',
      },
      packet,
      corpus: loadCandidateEvidenceCorpus(store),
      at: '2026-08-16T00:02:00.000Z',
    });
    refused = false;
    try {
      approveCandidateEvidence({
        preview: expiringPreview,
        previewHash: expiringPreview.previewHash,
        approvedBy: 'operator',
        packet,
        file: store,
        at: '2026-08-16T00:03:00.000Z',
      });
    } catch {
      refused = true;
    }
    assert(refused, 'expired preview refused at approval');
    const correctionPreview = previewCandidateEvidence({
      input: {
        ...input,
        claim: 'Candidate contributed to the migration and documented rollback behavior.',
        supersedes: preview.proposedEvidence.evidenceId,
        observedAt: '2026-08-16T00:03:00.000Z',
      },
      packet,
      corpus: loadCandidateEvidenceCorpus(store),
      at: '2026-08-16T00:03:00.000Z',
    });
    approveCandidateEvidence({
      preview: correctionPreview,
      previewHash: correctionPreview.previewHash,
      approvedBy: 'operator',
      packet,
      file: store,
      at: '2026-08-16T00:04:00.000Z',
    });
    const correctedCorpus = loadCandidateEvidenceCorpus(store);
    const beforeCorrection = projectCandidateEvidence({ roleId: 'role-1', packet, corpus: correctedCorpus, at: '2026-08-16T00:02:00.000Z' });
    assert(beforeCorrection.items.find((row) => row.evidenceId === preview.proposedEvidence.evidenceId).state === 'active', 'correction preserves historical view');
    const currentCorrection = projectCandidateEvidence({ roleId: 'role-1', packet, corpus: correctedCorpus, at: '2026-08-16T00:04:00.000Z' });
    assert(currentCorrection.items.find((row) => row.evidenceId === preview.proposedEvidence.evidenceId).state === 'corrected', 'approved correction supersedes old evidence');
    withdrawCandidateEvidence({
      roleId: 'role-1',
      candId: 'cand-workbench',
      evidenceIds: [correctionPreview.proposedEvidence.evidenceId],
      reason: 'Candidate withdrew this artifact from the role review.',
      by: 'operator',
      packet,
      file: store,
      at: '2026-08-16T00:05:00.000Z',
    });
    const withdrawnCorpus = loadCandidateEvidenceCorpus(store);
    const currentWithdrawal = projectCandidateEvidence({ roleId: 'role-1', packet, corpus: withdrawnCorpus, at: '2026-08-16T00:06:00.000Z' });
    const stoppedCurrent = currentWithdrawal.items.find((row) => row.evidenceId === correctionPreview.proposedEvidence.evidenceId);
    assert(stoppedCurrent.state === 'withdrawn' && stoppedCurrent.claim === null, 'withdrawal appends and withholds content');
    const beforeWithdrawal = projectCandidateEvidence({ roleId: 'role-1', packet, corpus: withdrawnCorpus, at: '2026-08-16T00:04:30.000Z' });
    assert(beforeWithdrawal.items.find((row) => row.evidenceId === correctionPreview.proposedEvidence.evidenceId).state === 'active', 'withdrawal preserves historical view');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: true, selftest: 'candidate-evidence', items: stopped.items.length }));
}

function cliFlags(argv) {
  return Object.fromEntries(argv.filter((arg) => arg.startsWith('--') && arg.includes('='))
    .map((arg) => arg.slice(2).split(/=(.*)/s).slice(0, 2)));
}

async function cli() {
  if (process.argv.includes('--selftest')) return selftest();
  const [command, ...argv] = process.argv.slice(2);
  const flags = cliFlags(argv);
  const store = flags.store ? path.resolve(flags.store) : STORE_PATH;
  const { loadPackets } = await import('./demigod-role-packet.mjs');
  const packetFor = (roleId) => {
    const packet = loadPackets().packets[roleId];
    if (!packet) throw new Error('candidate_evidence_role_packet');
    return packet;
  };
  const acceptedFor = async (packet) => {
    if (packet.demo === true) return null;
    const [{ listAcceptedRoles }, submissions] = await Promise.all([
      import('./demigod-accepted-role.mjs'),
      import('./demigod-submissions-lib.mjs'),
    ]);
    return (listAcceptedRoles(submissions.loadBoard(), submissions.loadInbox()).acceptedRoles || [])
      .find((row) => String(row.roleId) === String(packet.roleId)) || null;
  };
  if (command === 'preview') {
    if (!flags.input) throw new Error('--input required');
    const input = JSON.parse(fs.readFileSync(path.resolve(flags.input), 'utf8'));
    const packet = packetFor(input.roleId);
    const preview = previewCandidateEvidence({
      input,
      packet,
      acceptedRole: await acceptedFor(packet),
      corpus: loadCandidateEvidenceCorpus(store),
      at: flags.at || new Date().toISOString(),
    });
    if (flags.out) atomicWrite(path.resolve(flags.out), `${JSON.stringify(preview, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify(preview, null, 2));
    return;
  }
  if (command === 'approve') {
    if (!flags.preview || !flags.by) throw new Error('--preview and --by required');
    const preview = JSON.parse(fs.readFileSync(path.resolve(flags.preview), 'utf8'));
    const packet = packetFor(preview.proposedEvidence?.roleId);
    const receipt = approveCandidateEvidence({
      preview,
      previewHash: flags['preview-hash'] || preview.previewHash,
      approvedBy: flags.by,
      packet,
      acceptedRole: await acceptedFor(packet),
      file: store,
      at: flags.at || new Date().toISOString(),
    });
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }
  if (command === 'reject') {
    const receipt = rejectCandidateEvidence({
      previewHash: flags['preview-hash'],
      rejectedBy: flags.by,
      reason: flags.reason,
      at: flags.at || new Date().toISOString(),
    });
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }
  if (command === 'withdraw') {
    const receipt = withdrawCandidateEvidence({
      roleId: flags.role,
      candId: flags.cand,
      evidenceIds: String(flags.evidence || '').split(',').map(clean).filter(Boolean),
      reason: flags.reason,
      by: flags.by,
      packet: packetFor(flags.role),
      file: store,
      at: flags.at || new Date().toISOString(),
    });
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }
  throw new Error('usage: node demigod-candidate-evidence.mjs preview|approve|reject|withdraw|--selftest');
}

if (isMain) {
  cli().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exitCode = 1;
  });
}
