#!/usr/bin/env node
/**
 * Candidate evidence: bounded, role-specific evidence with provenance and stop states.
 *
 * This module stores nothing by itself. It reads an optional private corpus and projects
 * immutable assertions, corrections, withdrawals, expiry, and criterion drift. It never scores,
 * ranks, recommends, contacts, or grants action authority.
 *
 *   node demigod-candidate-evidence.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeResearchUrl } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(ROOT, 'DEMIGOD-CANDIDATE-EVIDENCE.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const CORPUS_SCHEMA = 'demigod.candidate-evidence-corpus/1';
export const EVIDENCE_SCHEMA = 'demigod.candidate-evidence/1';
export const WITHDRAWAL_SCHEMA = 'demigod.candidate-evidence-withdrawal/1';
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

const validTime = (value) => Number.isFinite(Date.parse(String(value || '')));
const clean = (value) => String(value || '').trim();

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
  if (!clean(record.source.ref) || clean(record.source.ref).length > 500) throw new Error('candidate_evidence_source_ref');
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
    if (Date.parse(record.source.observedAt) <= Date.parse(previous.source.observedAt)) {
      throw new Error(`candidate_evidence_supersedes_clock:${record.evidenceId}`);
    }
    if (superseded.has(record.supersedes)) throw new Error(`candidate_evidence_supersedes_fork:${record.supersedes}`);
    superseded.add(record.supersedes);
    if (Date.parse(record.source.observedAt) <= atMs) effectiveSuperseded.add(record.supersedes);
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
      if (Date.parse(event.at) < Date.parse(target.source.observedAt)) {
        throw new Error(`candidate_evidence_withdrawal_clock:${evidenceId}`);
      }
      if (Date.parse(event.at) <= atMs) withdrawn.add(evidenceId);
    }
  }

  const criteria = new Map(packet.mustHaves.map((row) => [row.id, clean(row.label)]));
  const roleRecords = source.evidence.filter((record) => record.roleId === roleId);
  const states = new Map(roleRecords.map((record) => {
    let state = 'active';
    if (Date.parse(record.source.observedAt) > atMs) state = 'future';
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
  const packet = { roleId: 'role-1', mustHaves: [{ id: 'mh1', label: 'Backend craft' }, { id: 'mh2', label: 'Product judgment' }] };
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
  console.log(JSON.stringify({ ok: true, selftest: 'candidate-evidence', items: stopped.items.length }));
}

if (isMain) {
  if (process.argv.includes('--selftest')) selftest();
  else {
    console.error('usage: node demigod-candidate-evidence.mjs --selftest');
    process.exitCode = 2;
  }
}
