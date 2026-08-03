#!/usr/bin/env node
/**
 * Canonical pair ledger — roleId:candidateId mutual-yes / review state.
 * Not the public board. Freeze-safe local SoR for matching.
 *
 * CLI:
 *   node demigod-pairs-lib.mjs list
 *   node demigod-pairs-lib.mjs propose --role <id> --cand <id> [--score n] [--why "..."]
 *   node demigod-pairs-lib.mjs review <pairId> --decision approve|reject|defer --i-reviewed --note "evidence"
 *   node demigod-pairs-lib.mjs consent <pairId> --side founder|candidate
 *   node demigod-pairs-lib.mjs decline <pairId> --side founder|candidate --i-observed-decline --evidence "reply"
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { UNSAFE_INVISIBLE_CLASS, atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';
import { listAcceptedRoles } from './demigod-accepted-role.mjs';
import { candidateProfileReadiness, currentCandidateSubmissions, isSampleData, loadBoard, loadInbox } from './demigod-submissions-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
export const PAIRS_PATH = path.join(ROOT, 'DEMIGOD-PAIRS.json');
export const PAIRS_LOCK = path.join(ROOT, 'DEMIGOD-PAIRS.json.lock');

export function pairId(roleId, candId) {
  const a = String(roleId || '').trim();
  const b = String(candId || '').trim();
  // ponytail: roleId is one immutable search; add a search/version id before reopening materially changed roles.
  // order-independent
  const [x, y] = [a, b].sort();
  return crypto.createHash('sha256').update(`${x}|${y}`).digest('hex').slice(0, 16);
}

export function loadPairs() {
  try {
    const store = JSON.parse(fs.readFileSync(PAIRS_PATH, 'utf8'));
    if (!store || typeof store !== 'object' || Array.isArray(store) ||
        !store.pairs || typeof store.pairs !== 'object' || Array.isArray(store.pairs)) {
      throw new Error('pairs_store_invalid');
    }
    return store;
  } catch (error) {
    if (error?.code === 'ENOENT') return { at: new Date().toISOString(), pairs: {} };
    throw error;
  }
}

function savePairs(store) {
  store.at = new Date().toISOString();
  atomicWrite(PAIRS_PATH, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
  return store;
}

export function listPairs({ state = null, limit = 50, includeSample = false } = {}) {
  const store = loadPairs();
  let rows = Object.values(store.pairs || {});
  if (!includeSample) rows = rows.filter((p) => p.sample === false);
  if (state) rows = rows.filter((p) => p.state === state);
  rows.sort((a, b) => String(b.updatedAt || b.at).localeCompare(String(a.updatedAt || a.at)));
  return rows.slice(0, limit);
}

export function getPair(id) {
  const store = loadPairs();
  return store.pairs?.[id] || null;
}

export function isValidConsentEvidence(value) {
  const raw = String(value || '');
  const proof = raw.trim();
  return proof.length >= 3 && proof.length <= 500 && !/[\r\n\u0000-\u001f\u007f]/.test(raw);
}

export function getValidPairConsentReceiptMeta(pair, side, roleTruthHash = null) {
  const history = Array.isArray(pair?.history) ? pair.history : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i];
    if (
      row?.event === 'consent' &&
      row.side === side &&
      isValidConsentEvidence(row.evidence) &&
      (!roleTruthHash || row.roleTruthHash === roleTruthHash)
    ) return { at: String(row.at || ''), roleTruthHash: String(row.roleTruthHash || '') };
  }
  return null;
}

export function hasValidPairConsentReceipt(pair, side, roleTruthHash = null) {
  return Boolean(getValidPairConsentReceiptMeta(pair, side, roleTruthHash));
}

export function assertMutualConsentReceipts(pair, roleTruthHash = null) {
  if (
    pair?.mutual?.founder !== true ||
    pair?.mutual?.candidate !== true ||
    !hasValidPairConsentReceipt(pair, 'founder') ||
    !hasValidPairConsentReceipt(pair, 'candidate')
  ) {
    throw new Error('pair_consent_receipt_missing');
  }
  if (
    roleTruthHash &&
    (!hasValidPairConsentReceipt(pair, 'founder', roleTruthHash) ||
      !hasValidPairConsentReceipt(pair, 'candidate', roleTruthHash))
  ) {
    throw new Error('role_changed_reconsent_required');
  }
  return pair;
}

/** Current real-pair gate. Samples and stale/forged persisted rows fail closed. */
function currentPairEligibility(
  pair,
  { pairKey = pair?.pairId, board = null, inbox = null, requireOpen = true } = {},
) {
  if (!pair || typeof pair !== 'object') throw new Error('real_pair_invalid');
  if (pair.sample !== false) throw new Error('sample_pair_not_eligible');
  if (
    typeof pair.roleId !== 'string' ||
    typeof pair.candId !== 'string' ||
    pair.roleId !== pair.roleId.trim() ||
    pair.candId !== pair.candId.trim()
  ) {
    throw new Error('real_pair_id_invalid');
  }
  const roleId = pair.roleId;
  const candId = pair.candId;
  const expectedId = pairId(roleId, candId);
  if (
    !roleId ||
    !candId ||
    roleId === candId ||
    pair.pairId !== expectedId ||
    pairKey !== expectedId
  ) {
    throw new Error('real_pair_id_invalid');
  }
  if (pair.createdSample !== false) throw new Error('real_pair_origin_invalid');
  const currentBoard = board || loadBoard();
  const currentInbox = inbox || loadInbox();
  const acceptedRole = listAcceptedRoles(currentBoard, currentInbox, { requireOpen }).acceptedRoles
    .find((role) => role.roleId === roleId);
  if (!acceptedRole) {
    throw new Error('real_pair_role_not_accepted');
  }
  const candidate = (currentInbox.items || []).find((item) => item?.id === candId);
  if (candidate && !currentCandidateSubmissions(currentInbox.items).some((item) => item.id === candId)) {
    throw new Error('candidate_profile_superseded');
  }
  const readiness = candidateProfileReadiness(candidate);
  if (candidate && readiness.applicable && readiness.availabilityCurrent === false) {
    throw new Error('candidate_availability_reconfirmation_required');
  }
  if (!candidate || isSampleData(candidate) || !readiness.applicable || !readiness.matchReady) {
    throw new Error('real_pair_candidate_not_match_ready');
  }
  return acceptedRole;
}

export function assertCurrentPairEligibility(pair, options = {}) {
  currentPairEligibility(pair, options);
  return pair;
}

export function assertCurrentMutualPairEligibility(pair, options = {}) {
  const acceptedRole = currentPairEligibility(pair, options);
  if (
    pair.state !== 'mutual_yes' ||
    pair.mutual?.founder !== true ||
    pair.mutual?.candidate !== true
  ) {
    throw new Error('mutual_consent_required');
  }
  return assertMutualConsentReceipts(pair, acceptedRole.roleTruthHash);
}

export function proposePair({
  roleId,
  candId,
  score = null,
  reasons = [],
  actor = 'agent',
  sample = true,
} = {}) {
  roleId = String(roleId || '').trim();
  candId = String(candId || '').trim();
  if (!roleId || !candId || roleId.length > 160 || candId.length > 160 ||
      /[\r\n\u0000-\u001f\u007f]/.test(`${roleId}${candId}`)) {
    throw new Error('roleId and candId required');
  }
  if (!sample) {
    const id = pairId(roleId, candId);
    assertCurrentPairEligibility({
      pairId: id,
      roleId: String(roleId),
      candId: String(candId),
      sample: false,
      createdSample: false,
    }, { pairKey: id });
  }
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const id = pairId(roleId, candId);
    const prev = store.pairs[id];
    if (prev?.sample === false && sample) return prev;
    if (prev && prev.sample !== false && !sample) throw new Error('pair_sample_promotion_forbidden');
    if (prev && prev.state !== 'proposed') {
      return prev;
    }
    const nextScore = score == null ? null : Number(score);
    if (nextScore != null && (!Number.isFinite(nextScore) || nextScore < 0 || nextScore > 1)) {
      throw new Error('score must be finite and between 0 and 1');
    }
    if (!Array.isArray(reasons) || reasons.length > 20 ||
        reasons.some((reason) =>
          typeof reason !== 'string' ||
          !reason.trim() ||
          reason.length > 240 ||
          new RegExp('[\\u0000-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']').test(reason)
        )) {
      throw new Error('reasons must be up to 20 bounded text values');
    }
    const now = new Date().toISOString();
    const pair = prev || {
      pairId: id,
      roleId: String(roleId),
      candId: String(candId),
      state: 'proposed',
      score: null,
      reasons: [],
      mutual: { founder: false, candidate: false },
      sample: !!sample,
      createdSample: !!sample,
      history: [],
      at: now,
    };
    pair.sample = prev?.sample === false ? false : !!sample;
    pair.score = nextScore != null ? nextScore : pair.score;
    if (reasons?.length) pair.reasons = reasons;
    pair.updatedAt = now;
    pair.history = [
      ...(pair.history || []),
      { at: now, actor, event: 'propose', state: pair.state },
    ].slice(-40);
    store.pairs[id] = pair;
    savePairs(store);
    return pair;
  });
}

export function reviewPair(id, { decision, actor = 'agent', note = '', reviewed = false } = {}) {
  const d = String(decision || '').toLowerCase();
  const reviewNote = String(note || '').trim();
  if (!['approve', 'reject', 'defer'].includes(d)) throw new Error('decision must be approve|reject|defer');
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const pair = store.pairs?.[id];
    if (!pair) throw new Error('pair_not_found');
    if (pair.sample === false && reviewed !== true) throw new Error('review_attestation_required');
    if (pair.sample === false && !isValidConsentEvidence(note)) throw new Error('review_evidence_invalid');
    const now = new Date().toISOString();
    const map = { approve: 'approved', reject: 'rejected', defer: 'deferred' };
    const next = map[d];
    if (['rejected', 'mutual_yes', 'one_side_no'].includes(pair.state) && next !== pair.state) throw new Error('pair_transition_invalid');
    if (next === 'approved') assertCurrentPairEligibility(pair, { pairKey: id });
    pair.state = next;
    pair.reviewNote = reviewNote || pair.reviewNote;
    pair.reviewedAt = now;
    pair.reviewedBy = actor;
    pair.updatedAt = now;
    pair.history = [
      ...(pair.history || []),
      { at: now, actor, event: 'review', state: pair.state, note: reviewNote || undefined },
    ].slice(-40);
    store.pairs[id] = pair;
    savePairs(store);
    return pair;
  });
}

export function consentPair(id, { side, actor = 'agent', attested = false, evidence = '' } = {}) {
  const s = String(side || '').toLowerCase();
  if (s !== 'founder' && s !== 'candidate') throw new Error('side must be founder|candidate');
  const proof = String(evidence || '').trim();
  if (attested !== true) throw new Error('consent_attestation_required');
  if (!isValidConsentEvidence(evidence)) throw new Error('consent_evidence_invalid');
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const pair = store.pairs?.[id];
    if (!pair) throw new Error('pair_not_found');
    if (pair.state !== 'approved' && pair.state !== 'mutual_yes') throw new Error('pair_not_reviewed');
    const acceptedRole = currentPairEligibility(pair, { pairKey: id });
    if (
      s === 'candidate' &&
      pair.sample === false &&
      !hasValidPairConsentReceipt(pair, 'founder', acceptedRole.roleTruthHash)
    ) throw new Error('founder_consent_required_before_candidate_consent');
    pair.mutual = pair.mutual || { founder: false, candidate: false };
    if (pair.mutual[s] && hasValidPairConsentReceipt(pair, s, acceptedRole.roleTruthHash)) return pair;
    const now = new Date().toISOString();
    pair.mutual[s] = true;
    pair.updatedAt = now;
    if (pair.mutual.founder && pair.mutual.candidate) {
      pair.state = pair.state === 'rejected' ? pair.state : 'mutual_yes';
    }
    pair.history = [
      ...(pair.history || []),
      {
        at: now,
        actor,
        event: 'consent',
        side: s,
        evidence: proof,
        roleTruthHash: acceptedRole.roleTruthHash,
        state: pair.state,
      },
    ].slice(-40);
    store.pairs[id] = pair;
    savePairs(store);
    return pair;
  });
}

/** Record either side declining or withdrawing consent; terminal and fail-closed for intros. */
export function declinePair(id, { side, actor = 'agent', attested = false, evidence = '' } = {}) {
  const s = String(side || '').toLowerCase();
  if (s !== 'founder' && s !== 'candidate') throw new Error('side must be founder|candidate');
  const proof = String(evidence || '').trim();
  if (attested !== true) throw new Error('decline_attestation_required');
  if (!isValidConsentEvidence(evidence)) throw new Error('decline_evidence_invalid');
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const pair = store.pairs?.[id];
    if (!pair) throw new Error('pair_not_found');
    if (pair.state === 'one_side_no') return pair;
    if (pair.state !== 'approved' && pair.state !== 'mutual_yes') throw new Error('pair_not_reviewed');
    const now = new Date().toISOString();
    pair.mutual = pair.mutual || { founder: false, candidate: false };
    pair.mutual[s] = false;
    pair.state = 'one_side_no';
    pair.updatedAt = now;
    pair.history = [
      ...(pair.history || []),
      { at: now, actor, event: 'decline', side: s, evidence: proof, state: pair.state },
    ].slice(-40);
    store.pairs[id] = pair;
    savePairs(store);
    return pair;
  });
}

/** Drop selftest / fixture pairs (keeps real ops rows). */
export function prunePairs({ selftest = true, sample = false, dryRun = false } = {}) {
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const before = Object.keys(store.pairs || {}).length;
    const removed = [];
    for (const [id, p] of Object.entries(store.pairs || {})) {
      const isSelf =
        selftest &&
        (/^role-t[a-z0-9]+-/i.test(p.roleId || '') ||
          /^cand-t[a-z0-9]+-/i.test(p.candId || '') ||
          (p.history || []).some((h) => h.actor === 'selftest'));
      const isSample = sample && p.sample;
      if (isSelf || isSample) {
        removed.push(id);
        if (!dryRun) delete store.pairs[id];
      }
    }
    if (!dryRun && removed.length) savePairs(store);
    return { before, removed: removed.length, ids: removed.slice(0, 40), dryRun };
  });
}

/** Seed demo pairs from board sample roles + synthetic cand ids (freeze-safe fixtures) */
function seedFixturePairs() {
  return withFileLock(PAIRS_LOCK, () => {
    const store = loadPairs();
    const now = new Date().toISOString();
    const fixtures = [
      { roleId: 'role-seed-pm', candId: 'cand-seed-a', score: 0.72, reasons: ['skills overlap', 'SF bay'] },
      { roleId: 'role-seed-pm', candId: 'cand-seed-b', score: 0.61, reasons: ['partial stack'] },
      { roleId: 'role-seed-design', candId: 'cand-seed-c', score: 0.8, reasons: ['portfolio fit'] },
    ];
    for (const f of fixtures) {
      const id = pairId(f.roleId, f.candId);
      if (store.pairs[id]) continue;
      store.pairs[id] = {
        pairId: id,
        roleId: f.roleId,
        candId: f.candId,
        state: 'proposed',
        score: f.score,
        reasons: f.reasons,
        mutual: { founder: false, candidate: false },
        history: [{ at: now, actor: 'fixture', event: 'propose', state: 'proposed' }],
        at: now,
        updatedAt: now,
        sample: true,
      };
    }
    savePairs(store);
    return store;
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (n) => {
    const i = rest.indexOf(n);
    return i >= 0 ? rest[i + 1] : null;
  };
  try {
    if (cmd === 'list') {
      console.log(
        JSON.stringify(
          { at: new Date().toISOString(), pairs: listPairs({ includeSample: rest.includes('--include-sample') }) },
          null,
          2,
        ),
      );
    } else if (cmd === 'seed') {
      console.log(JSON.stringify(seedFixturePairs(), null, 2));
    } else if (cmd === 'propose') {
      console.log(
        JSON.stringify(
          proposePair({
            roleId: flag('--role'),
            candId: flag('--cand'),
            score: flag('--score'),
            reasons: (flag('--why') || '').split('|').filter(Boolean),
            sample: !rest.includes('--real'),
          }),
          null,
          2,
        ),
      );
    } else if (cmd === 'review') {
      const id = rest[0];
      console.log(JSON.stringify(reviewPair(id, {
        decision: flag('--decision'),
        note: flag('--note') || '',
        reviewed: rest.includes('--i-reviewed'),
        actor: 'human:cli',
      }), null, 2));
    } else if (cmd === 'consent') {
      console.log(JSON.stringify(consentPair(rest[0], {
        side: flag('--side'),
        attested: rest.includes('--i-observed-consent'),
        evidence: flag('--evidence') || '',
      }), null, 2));
    } else if (cmd === 'decline') {
      console.log(JSON.stringify(declinePair(rest[0], {
        side: flag('--side'),
        attested: rest.includes('--i-observed-decline'),
        evidence: flag('--evidence') || '',
      }), null, 2));
    } else if (cmd === 'prune') {
      console.log(
        JSON.stringify(
          prunePairs({
            selftest: !rest.includes('--keep-selftest'),
            sample: rest.includes('--sample'),
            dryRun: rest.includes('--dry-run'),
          }),
          null,
          2,
        ),
      );
    } else {
      console.log('usage: list|seed|propose --role ID --cand ID [--real]|review <id> --decision approve|reject|defer --i-reviewed --note "evidence"|consent <id> --side founder|candidate --i-observed-consent --evidence "note"|decline <id> --side founder|candidate --i-observed-decline --evidence "note"|prune');
      process.exit(1);
    }
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }
}
