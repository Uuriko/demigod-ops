#!/usr/bin/env node
/**
 * Demigod referrals — one link, consent/evidence gates, no money movement.
 *
 *   bin/dg referrals create --name "Alex" --email alex@example.com --owner individual
 *   bin/dg referrals mint-talent --name "Alex" --email alex@example.com   # create + human pack (talent-first)
 *   bin/dg referrals pack <linkId>                                         # re-print copy pack
 *   bin/dg referrals approve <linkId> --evidence FILE --beneficiary-id ID --i-reviewed [--i-verified-company]
 *   bin/dg referrals qualify <claimId> --evidence FILE --i-confirmed-subject --i-confirmed-referrer --i-checked-conflicts
 *   bin/dg referrals sync | status
 *   bin/dg referrals hire <claimId> --start YYYY-MM-DD [--evidence FILE] [--i-first-placement]
 *   bin/dg referrals retain <rewardId> --as-of YYYY-MM-DD --evidence FILE
 *   bin/dg referrals settle <rewardId> --kind cash|credit --amount-cents N --evidence FILE --provider-id ID --beneficiary-id ID --i-observed-settlement
 *   bin/dg referrals reverse <rewardId> --reason TEXT --amount-cents N --evidence FILE --provider-id ID --i-observed-reversal
 *
 * Stripe/ACH/customer-credit calls are intentionally absent. `settle` only records
 * an externally observed receipt after the existing funnel says the client paid.
 * Product design: DEMIGOD-REFERRAL-SIMPLE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { atomicWrite, opt, readJson, sha256File, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const TEST_SCOPE = process.env.NODE_TEST_CONTEXT || process.env.DEMIGOD_TEST_SCOPE || /\.test\.mjs$/.test(process.argv[1] || '')
  ? String(process.env.DEMIGOD_TEST_SCOPE || process.pid).replace(/[^A-Za-z0-9_.-]/g, '_')
  : '';
const DEFAULT_STORE = TEST_SCOPE
  ? path.join('/tmp/dg-busy/tests', TEST_SCOPE, 'test-referrals.json')
  : path.join(ROOT, 'DEMIGOD-REFERRALS.json');

export const REFERRALS_PATH = process.env.DEMIGOD_REFERRALS_PATH || DEFAULT_STORE;
export const REFERRALS_LOCK = `${REFERRALS_PATH}.lock`;
export const LEADS_PATH = process.env.DEMIGOD_LEADS_PATH || path.join(ROOT, 'DEMIGOD-LEADS.json');
export const PAIRS_PATH = process.env.DEMIGOD_PAIRS_PATH || path.join(ROOT, 'DEMIGOD-PAIRS.json');
export const STATUS_PATH = process.env.DEMIGOD_REFERRALS_STATUS_PATH || path.join('/tmp/dg-busy', 'referrals-status.json');

export const RULE_VERSION = '2026-07-21.1';
export const AGREEMENT_VERSION = '2026-07-21.1';
export const DISCLOSURE = 'I may receive a referral reward if this introduction leads to a successful Demigod hire.';
const ORIGIN = 'https://www.trydemigod.com/';
const CLAIM_DAYS = 365;
const RETENTION_DAYS = 90;
const TOKEN_RE = /^rf_[A-Za-z0-9_-]{24}$/;
const SETTLED = new Set(['paid', 'credited', 'reversed']);

function emptyStore() {
  return {
    schema: 'demigod.referrals/1',
    at: new Date().toISOString(),
    links: {},
    directSubjects: {},
    claims: {},
    rewards: {},
    events: [],
  };
}

export function loadReferrals() {
  if (!fs.existsSync(REFERRALS_PATH)) return emptyStore();
  const store = readJson(REFERRALS_PATH);
  if (!store || store.schema !== 'demigod.referrals/1') throw new Error('referrals_store_invalid');
  store.links ||= {};
  store.directSubjects ||= {};
  store.claims ||= {};
  store.rewards ||= {};
  store.events ||= [];
  return store;
}

function saveReferrals(store) {
  store.at = new Date().toISOString();
  fs.mkdirSync(path.dirname(REFERRALS_PATH), { recursive: true, mode: 0o700 });
  atomicWrite(REFERRALS_PATH, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(REFERRALS_PATH, 0o600); } catch { /* best effort after atomic write */ }
  return store;
}

function updateStore(mutator) {
  fs.mkdirSync(path.dirname(REFERRALS_PATH), { recursive: true, mode: 0o700 });
  return withFileLock(REFERRALS_LOCK, () => {
    const store = loadReferrals();
    const result = mutator(store);
    saveReferrals(store);
    return result;
  }, { timeoutMs: 20000, staleMs: 120000 });
}

function addEvent(store, event) {
  store.events = [...(store.events || []), {
    at: new Date().toISOString(),
    actor: event.actor || process.env.USER || 'agent',
    ...event,
  }];
}

function clean(value, max = 160) {
  const s = String(value || '').trim();
  if (!s || s.length > max || /[\u0000-\u001f\u007f]/.test(s)) return '';
  return s;
}

function normalizedEmail(value) {
  const email = clean(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function validDate(value, { future = true } = {}) {
  const raw = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(+date) || date.toISOString().slice(0, 10) !== raw) return null;
  if (!future && +date > Date.now()) return null;
  return date;
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function evidenceFile(value) {
  const raw = clean(value?.path || value, 2048);
  if (!raw) return null;
  const resolved = path.resolve(ROOT, raw);
  try {
    if (!fs.lstatSync(resolved).isFile()) return null;
    const real = fs.realpathSync(resolved);
    const allowed = [path.resolve(ROOT), ...(TEST_SCOPE ? [path.resolve(path.dirname(REFERRALS_PATH))] : [])];
    if (!allowed.some((dir) => real === dir || real.startsWith(`${dir}${path.sep}`))) return null;
    const stat = fs.statSync(real);
    return stat.size > 0 && stat.size <= 10 * 1024 * 1024 ? real : null;
  } catch {
    return null;
  }
}

function evidenceRecord(value) {
  const file = evidenceFile(value);
  if (!file) return null;
  const bytes = fs.statSync(file).size;
  const sha256 = sha256File(file);
  return sha256 ? { path: file, sha256, bytes } : null;
}

function sameEvidence(a, b) {
  return !!a && !!b && a.path === b.path && a.sha256 === b.sha256 && a.bytes === b.bytes;
}

function evidenceValid(record) {
  return !!record && sameEvidence(record, evidenceRecord(record.path));
}

function stableId(prefix, ...parts) {
  return `${prefix}_${crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)}`;
}

function linkUrls(code) {
  const base = new URL(ORIGIN);
  base.searchParams.set('referral', code);
  base.searchParams.set('utm_source', 'referral');
  base.searchParams.set('utm_campaign', 'partner-network');
  const talent = new URL(base);
  talent.searchParams.set('wiz', 'engineer');
  const hiring = new URL(base);
  hiring.searchParams.set('wiz', 'startup');
  // Short aliases (foot normalizes ?r= / /r/{code} → referral=). Prefer talent short for sharing.
  const shortTalent = new URL(ORIGIN);
  shortTalent.searchParams.set('r', code);
  shortTalent.searchParams.set('wiz', 'engineer');
  const shortPath = new URL(`/r/${code}`, ORIGIN);
  shortPath.searchParams.set('wiz', 'engineer');
  return {
    universal: base.href,
    talent: talent.href,
    hiring: hiring.href,
    short: shortTalent.href,
    path: shortPath.href,
  };
}

/** Copy-paste message the referrer can send to talent (includes mandatory disclosure). */
export function formatShareMessage(code, { pct = 20 } = {}) {
  if (!TOKEN_RE.test(code)) throw new Error('link_code_invalid');
  const urls = linkUrls(code);
  return [
    'Thinking about SF Bay startup roles?',
    '',
    'Demigod is a human-reviewed talent matchmaker — candidates never pay. If you apply through my link and later get hired through Demigod (and stay 90 days with the fee paid), I may earn a referral reward. You are evaluated the same either way.',
    '',
    urls.short,
    '',
    `Disclosure: ${DISCLOSURE}`,
  ].join('\n');
}

function publicLink(link, reused = false) {
  return {
    ok: true,
    reused,
    linkId: link.id,
    ownerType: link.ownerType,
    rewardMode: link.rewardMode,
    approval: link.approval?.status || 'pending',
    links: linkUrls(link.code),
    disclosure: DISCLOSURE,
  };
}

/**
 * Human-readable pack for a talent referrer (unique link + disclosure + pay timeline).
 * Never prints bank details or unredacted ledger secrets beyond the public token
 * (token is already what the referrer will share).
 */
export function formatTalentReferrerPack(link, { reused = false } = {}) {
  if (!link?.code || !TOKEN_RE.test(link.code)) throw new Error('link_code_invalid');
  const urls = linkUrls(link.code);
  const approval = link.approval?.status || 'pending';
  const bps = link.rules?.individualTalentBps ?? 2000;
  const pct = (bps / 100).toFixed(0);
  const shareMessage = formatShareMessage(link.code, { pct: Number(pct) });
  const lines = [
    '# Demigod talent-referrer pack',
    `# linkId: ${link.id}${reused ? ' (existing)' : ''}`,
    `# approval: ${approval}`,
    `# rewardMode: ${link.rewardMode || 'cash'} · owner: ${link.ownerType || 'individual'}`,
    '',
    '## Unique talent link (prefer this short form)',
    urls.short,
    '',
    '## Canonical talent link (same code; extra UTM)',
    urls.talent,
    '',
    '## Path form (needs foot on the page; same code)',
    urls.path,
    '',
    '## Universal link (home; they choose talent or hiring)',
    urls.universal,
    '',
    '## Copy-paste share message (send as-is)',
    shareMessage,
    '',
    '## Disclosure (always include when sharing)',
    DISCLOSURE,
    '',
    '## How they get paid (honest)',
    `- Talent they introduce opens the link and submits their own profile (not uploaded by the referrer).`,
    `- Demigod human-matches; both sides approve any intro.`,
    `- On hire, the startup owes Demigod 10% of first-year cash (written terms).`,
    `- After the hire completes ${RETENTION_DAYS} days AND Demigod's related fee is paid and retained,`,
    `  the referrer becomes eligible for ${pct}% of that net placement fee (cash for individuals).`,
    `- Payout tooling is pending — settle records an observed payment only; no auto Stripe yet.`,
    '',
    '## Ops next steps',
    approval === 'approved'
      ? '- Link already approved. Share the pack with the referrer.'
      : `- Approve after written agreement: bin/dg referrals approve ${link.id} --evidence PATH --beneficiary-id ID --i-reviewed`,
    '- After referred talent submits: bin/dg referrals sync',
    '- Then qualify → hire → retain → settle (evidence-gated; see DEMIGOD-REFERRAL-SIMPLE.md)',
    '',
    '## Rules snapshot',
    `- ruleVersion: ${link.rules?.version || RULE_VERSION}`,
    `- talent intro: ${pct}% of net fee after day-${RETENTION_DAYS} + fee paid`,
    `- claim window: ${CLAIM_DAYS} days from eligible submission unless already linked to a placement`,
    '',
  ];
  return {
    ok: true,
    linkId: link.id,
    approval,
    links: urls,
    disclosure: DISCLOSURE,
    shareMessage,
    packText: lines.join('\n'),
  };
}

export function mintTalentReferrer({ name, email, actor = 'agent' } = {}) {
  const created = createReferral({
    name,
    email,
    ownerType: 'individual',
    rewardMode: 'cash',
    actor,
  });
  const store = loadReferrals();
  const link = store.links[created.linkId];
  if (!link) throw new Error('link_not_found_after_create');
  return formatTalentReferrerPack(link, { reused: created.reused === true });
}

export function packReferral(linkId) {
  const store = loadReferrals();
  const link = store.links[linkId];
  if (!link) throw new Error('link_not_found');
  if (!link.active) throw new Error('link_revoked');
  return formatTalentReferrerPack(link, { reused: true });
}

export function createReferral({ name, email, ownerType = 'individual', rewardMode = '', companyId = '', actor = 'agent' } = {}) {
  const displayName = clean(name, 80);
  const verifiedEmail = normalizedEmail(email);
  const owner = String(ownerType || '').toLowerCase();
  if (!displayName) throw new Error('name_required');
  if (!verifiedEmail) throw new Error('verified_email_required');
  if (!['individual', 'company'].includes(owner)) throw new Error('owner_must_be_individual_or_company');
  const mode = rewardMode || (owner === 'company' ? 'company_credit' : 'cash');
  if (!['cash', 'company_credit'].includes(mode)) throw new Error('reward_mode_invalid');
  if (owner === 'company' && mode !== 'company_credit') throw new Error('company_personal_cash_forbidden');
  if (owner === 'individual' && mode !== 'cash') throw new Error('individual_cash_only');
  const boundCompanyId = clean(companyId, 160);
  if (owner === 'company' && !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(boundCompanyId)) throw new Error('company_id_required');

  return updateStore((store) => {
    const existing = Object.values(store.links).find((link) =>
      link.active && link.ownerType === owner && link.email === verifiedEmail);
    if (existing) {
      if (owner === 'company' && existing.companyId !== boundCompanyId) throw new Error('company_id_conflict');
      return publicLink(existing, true);
    }

    const now = new Date().toISOString();
    const link = {
      id: `ref_${crypto.randomBytes(8).toString('hex')}`,
      code: `rf_${crypto.randomBytes(18).toString('base64url')}`,
      active: true,
      ownerType: owner,
      rewardMode: mode,
      companyId: owner === 'company' ? boundCompanyId : null,
      displayName,
      email: verifiedEmail,
      approval: { status: 'pending', agreementVersion: AGREEMENT_VERSION },
      rules: {
        version: RULE_VERSION,
        individualTalentBps: 2000,
        individualCompanyBps: 1000,
        companyCreditBps: 1000,
        basis: 'net_placement_fee_collected_and_retained',
        retentionDays: RETENTION_DAYS,
      },
      createdAt: now,
      updatedAt: now,
    };
    store.links[link.id] = link;
    addEvent(store, { actor, type: 'link_created', linkId: link.id, ownerType: owner, rewardMode: mode });
    return publicLink(link, false);
  });
}

export function approveReferral(linkId, {
  evidence,
  beneficiaryId = '',
  reviewed = false,
  verifiedCompany = false,
  agreementVersion = AGREEMENT_VERSION,
  actor = 'human',
} = {}) {
  if (reviewed !== true) throw new Error('review_attestation_required');
  const proof = evidenceRecord(evidence);
  if (!proof) throw new Error('agreement_evidence_required');
  const version = clean(agreementVersion, 80);
  if (!version) throw new Error('agreement_version_required');
  return updateStore((store) => {
    const link = store.links[linkId];
    if (!link) throw new Error('link_not_found');
    if (!link.active) throw new Error('link_revoked');
    const beneficiary = link.ownerType === 'company' ? link.companyId : clean(beneficiaryId, 160);
    if (!beneficiary || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(beneficiary)) throw new Error('payout_beneficiary_required');
    if (link.ownerType === 'company') {
      if (verifiedCompany !== true) throw new Error('company_verification_attestation_required');
      const partner = (loadLeads().partners || []).find((lead) => canonicalCompanyId(lead) === link.companyId);
      if (!partner || partner.sample || partner.selftest || partner.test) throw new Error('company_not_canonical');
    }
    if (link.approval?.status === 'approved') {
      if (!evidenceValid(link.approval.evidence)) throw new Error('approval_evidence_invalid');
      if (link.approval.agreementVersion !== version ||
          link.approval.payoutBeneficiaryId !== beneficiary ||
          !sameEvidence(link.approval.evidence, proof)) throw new Error('approval_replay_conflict');
      return { ok: true, reused: true, linkId, approval: link.approval };
    }
    link.approval = {
      status: 'approved',
      agreementVersion: version,
      evidence: proof,
      payoutBeneficiaryId: beneficiary,
      conflictsReviewed: true,
      companyVerified: link.ownerType === 'company' ? true : undefined,
      at: new Date().toISOString(),
      actor,
    };
    link.updatedAt = link.approval.at;
    addEvent(store, { actor, type: 'link_approved', linkId, evidence: proof, agreementVersion: version });
    return { ok: true, reused: false, linkId, approval: link.approval };
  });
}

function referralKind(form) {
  const value = String(form || '').toLowerCase();
  if (/engineer|jobseeker|candidate|talent/.test(value)) return 'talent';
  if (/startup|hire|founder/.test(value)) return 'company';
  return '';
}

function rateFor(link, kind) {
  if (link.ownerType === 'company') return link.rules.companyCreditBps;
  return kind === 'talent' ? link.rules.individualTalentBps : link.rules.individualCompanyBps;
}

function subjectFingerprint(kind, subject) {
  return crypto.createHash('sha256').update(`${kind}:${subject}`).digest('hex');
}

function acceptedSubmissionAt(at) {
  const submitted = new Date(at || 0);
  return validDate(String(at || '').slice(0, 10)) && !Number.isNaN(+submitted) && +submitted <= Date.now() + 300000
    ? submitted.toISOString()
    : new Date().toISOString();
}

function directPriorForClaim(store, claim) {
  return Object.values(store.directSubjects || {}).find((row) =>
    row.kind === claim.kind && row.subjectHash === claim.subjectHash && row.submittedAt <= claim.submittedAt) || null;
}

function claimReservesAttribution(claim, submittedAt) {
  if (!claim || claim.status === 'void') return false;
  if (claim.rewardId) return true;
  const expiresAt = Date.parse(claim.expiresAt || '');
  const incomingAt = Date.parse(submittedAt || '');
  return !Number.isFinite(expiresAt) || !Number.isFinite(incomingAt) || incomingAt <= expiresAt;
}

function recordDirectInStore(store, { subId, kind, subjectHash, submittedAt, actor }) {
  const id = stableId('direct', kind, subjectHash);
  const existing = store.directSubjects[id];
  if (existing) {
    if (submittedAt < existing.submittedAt) {
      existing.submissionId = subId;
      existing.submittedAt = submittedAt;
      addEvent(store, { actor, type: 'direct_source_earliest_repaired', directId: id, submissionId: subId, kind });
      return { recorded: true, reused: true, repaired: true, directId: id };
    }
    return { recorded: true, reused: true, directId: id };
  }
  const claim = Object.values(store.claims).find((row) =>
    row.kind === kind && row.subjectHash === subjectHash && claimReservesAttribution(row, submittedAt));
  if (claim && claim.submittedAt <= submittedAt) return { recorded: false, reason: 'subject_already_attributed', claimId: claim.id };
  store.directSubjects[id] = { id, kind, subjectHash, submissionId: subId, submittedAt };
  if (claim) addEvent(store, { actor, type: 'direct_prior_conflict_found', claimId: claim.id, directId: id, submissionId: subId });
  addEvent(store, { actor, type: 'direct_source_recorded', directId: id, submissionId: subId, kind });
  return { recorded: true, reused: false, directId: id };
}

export function calculateRewardCents(feeCents, rateBps) {
  if (!Number.isSafeInteger(feeCents) || feeCents <= 0 ||
      !Number.isSafeInteger(rateBps) || rateBps <= 0 || rateBps > 10000) return null;
  const amount = (BigInt(feeCents) * BigInt(rateBps) + 5000n) / 10000n;
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}

export function recordDirectSubmission({ submissionId, form, at, eligible = false, subjectKey = '', actor = 'ingest' } = {}) {
  const subId = clean(submissionId, 160);
  const kind = referralKind(form);
  const subject = clean(subjectKey, 512).toLowerCase();
  if (!subId || !kind || eligible !== true || !subject) return { recorded: false, reason: 'direct_submission_not_accepted' };
  const submittedAt = acceptedSubmissionAt(at);
  const subjectHash = subjectFingerprint(kind, subject);
  return updateStore((store) => recordDirectInStore(store, { subId, kind, subjectHash, submittedAt, actor }));
}

export function recordReferralSubmission({ token, submissionId, form, at, eligible = false, subjectKey = '', actor = 'ingest' } = {}) {
  const code = clean(token, 80);
  const subId = clean(submissionId, 160);
  const kind = referralKind(form);
  const subject = clean(subjectKey, 512).toLowerCase();
  const invalidCode = !TOKEN_RE.test(code);
  const canReserveDirect = !!subId && !!kind && eligible === true && !!subject;
  if (invalidCode && !canReserveDirect) return { attached: false, reason: 'referral_code_invalid' };
  if (!subId || !kind) return { attached: false, reason: 'submission_not_referral_eligible' };
  if (eligible !== true || !subject) return { attached: false, reason: 'submission_not_accepted' };
  const submittedAt = acceptedSubmissionAt(at);
  const subjectHash = subjectFingerprint(kind, subject);

  return updateStore((store) => {
    if (invalidCode) {
      recordDirectInStore(store, { subId, kind, subjectHash, submittedAt, actor });
      return { attached: false, reason: 'referral_code_invalid' };
    }
    const link = Object.values(store.links).find((row) => row.active && row.code === code);
    if (!link) {
      recordDirectInStore(store, { subId, kind, subjectHash, submittedAt, actor });
      return { attached: false, reason: 'referral_code_unknown_or_revoked' };
    }
    const bySubmission = Object.values(store.claims).find((claim) => claim.submissionId === subId);
    if (bySubmission) return { attached: true, reused: true, claimId: bySubmission.id, linkId: bySubmission.linkId };

    const direct = Object.values(store.directSubjects).find((row) =>
      row.kind === kind && row.subjectHash === subjectHash && row.submittedAt <= submittedAt);
    if (direct) return { attached: false, reason: 'subject_already_direct', directId: direct.id };
    const prior = Object.values(store.claims).find((claim) =>
      claim.kind === kind && claim.subjectHash === subjectHash && claimReservesAttribution(claim, submittedAt));
    if (prior) {
      addEvent(store, { actor, type: 'claim_duplicate_blocked', linkId: link.id, submissionId: subId, duplicateOf: prior.id });
      return { attached: false, reason: 'subject_already_attributed', duplicateOf: prior.id };
    }

    const claim = {
      id: stableId('claim', link.id, subId),
      linkId: link.id,
      submissionId: subId,
      subjectHash,
      kind,
      status: 'verifying',
      ruleVersion: link.rules.version,
      rateBps: rateFor(link, kind),
      rewardMode: link.rewardMode,
      submittedAt,
      expiresAt: new Date(new Date(submittedAt).getTime() + CLAIM_DAYS * 86400000).toISOString(),
      qualifiedAt: null,
    };
    store.claims[claim.id] = claim;
    addEvent(store, { actor, type: 'claim_attached', linkId: link.id, claimId: claim.id, submissionId: subId, kind });
    return { attached: true, reused: false, claimId: claim.id, linkId: link.id, kind };
  });
}

export function qualifyClaim(claimId, {
  evidence,
  confirmedSubject = false,
  confirmedReferrer = false,
  checkedConflicts = false,
  actor = 'human',
} = {}) {
  if (!(confirmedSubject && confirmedReferrer && checkedConflicts)) throw new Error('claim_attestations_required');
  const proof = evidenceRecord(evidence);
  if (!proof) throw new Error('claim_evidence_required');
  return updateStore((store) => {
    const claim = store.claims[claimId];
    if (!claim) throw new Error('claim_not_found');
    if (directPriorForClaim(store, claim)) throw new Error('subject_already_direct');
    const link = store.links[claim.linkId];
    if (!link?.active) throw new Error('link_unknown_or_revoked');
    if (link.approval?.status !== 'approved') throw new Error('referrer_not_approved');
    if (claim.status === 'void') throw new Error('claim_void');
    if (claim.qualifiedAt) {
      if (!evidenceValid(claim.qualification?.evidence)) throw new Error('qualification_evidence_invalid');
      if (!sameEvidence(claim.qualification.evidence, proof)) throw new Error('qualification_replay_conflict');
      return { ok: true, reused: true, claimId, status: claim.status };
    }
    if (Date.now() > new Date(claim.expiresAt).getTime()) throw new Error('claim_expired');
    claim.status = 'eligible';
    claim.qualifiedAt = new Date().toISOString();
    claim.qualification = {
      subjectConfirmed: true,
      referrerConfirmed: true,
      conflictsChecked: true,
      evidence: proof,
      actor,
    };
    addEvent(store, { actor, type: 'claim_qualified', claimId, linkId: claim.linkId, evidence: proof });
    return { ok: true, reused: false, claimId, status: claim.status };
  });
}

function leadRows(doc = {}) {
  return [
    ...(doc.partners || []).map((lead) => ({ side: 'company', lead })),
    ...(doc.talent || []).map((lead) => ({ side: 'talent', lead })),
  ];
}

function leadState(lead = {}) {
  return String(lead.state || lead.status || '').toLowerCase();
}

function pairIds(lead = {}) {
  return new Set([lead.pairId, ...(lead.pairIds || [])].filter(Boolean).map(String));
}

function canonicalCompanyId(lead = {}) {
  const id = clean(lead.companyId, 160);
  return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id) ? id : '';
}

function sharesPair(a, b) {
  const left = pairIds(a);
  return [...pairIds(b)].some((id) => left.has(id));
}

function loadLeads() {
  const doc = readJson(LEADS_PATH);
  if (!doc) throw new Error('leads_store_missing_or_invalid');
  return doc;
}

function loadPairs() {
  const doc = readJson(PAIRS_PATH);
  if (!doc || !doc.pairs || typeof doc.pairs !== 'object') throw new Error('pairs_store_missing_or_invalid');
  return doc.pairs;
}

function resolveClaimLeads(claim, explicitLeadId = '') {
  const leadsDoc = loadLeads();
  const rows = leadRows(leadsDoc);
  let matches = rows.filter(({ lead }) =>
    String(lead.joinedSubmissionId || '') === claim.submissionId ||
    String(lead.id || '') === `inbox-${claim.submissionId}`);
  if (explicitLeadId) {
    const exact = rows.find(({ lead }) => lead.id === explicitLeadId);
    if (!exact) throw new Error('lead_not_found');
    if (!matches.some(({ lead }) => lead.id === exact.lead.id)) throw new Error('lead_not_bound_to_claim');
    matches = [exact];
  }
  const outcome = matches.find((row) => row.side === claim.kind);
  if (!outcome) throw new Error('claim_lead_not_found');
  let billing = outcome;
  if (claim.kind === 'talent') {
    const candidates = rows.filter((row) => row.side === 'company' && sharesPair(row.lead, outcome.lead));
    const progressed = candidates.filter(({ lead }) => ['hired', 'invoiced', 'paid'].includes(leadState(lead)));
    if (progressed.length > 1 || (!progressed.length && candidates.length > 1)) throw new Error('billing_lead_ambiguous');
    billing = progressed[0] || candidates[0];
    if (!billing) throw new Error('billing_lead_not_found');
  }
  return { outcome: outcome.lead, billing: billing.lead, leadsDoc };
}

function canonicalHirePair(leadsDoc, outcome, billing, notBefore = '') {
  const pairs = loadPairs();
  const shared = [...pairIds(outcome)].filter((id) => pairIds(billing).has(id));
  for (const id of shared) {
    const pair = pairs[id];
    if (!pair || pair.sample || pair.state !== 'mutual_yes' ||
        !pair.mutual?.founder || !pair.mutual?.candidate ||
        !pair.roleId || !pair.candId || String(pair.roleId) === String(pair.candId)) continue;
    const linked = leadRows(leadsDoc).filter(({ lead }) => pairIds(lead).has(id) && !lead.sample && !lead.selftest && !lead.test);
    if (linked.length !== 2 || !linked.some(({ lead }) => lead.id === billing.id) ||
        !linked.some(({ lead }) => lead.id === outcome.id)) continue;
    const talent = linked.find(({ side }) => side === 'talent')?.lead;
    const company = linked.find(({ side }) => side === 'company')?.lead;
    if (!talent || !company || !['hired', 'invoiced', 'paid'].includes(leadState(talent))) continue;
    const companyHire = transitionRecord(company, 'hired', id, notBefore);
    const talentHire = transitionRecord(talent, 'hired', id, notBefore);
    if (!companyHire || !talentHire) continue;
    return {
      pairId: id,
      talent,
      company,
      companyHire: companyHire.evidence,
      companyHiredAt: companyHire.at,
      talentHire: talentHire.evidence,
      talentHiredAt: talentHire.at,
    };
  }
  throw new Error('canonical_mutual_hire_pair_required');
}

function hasPriorPlacement(lead, submittedAt) {
  if (Number(lead?.priorPlacementCount || 0) > 0) return true;
  const before = new Date(submittedAt).getTime();
  return (lead?.stateHistory || lead?.history || []).some((row) => {
    const at = new Date(row?.at || 0).getTime();
    return Number.isFinite(at) && at < before && ['hired', 'invoiced', 'paid'].includes(String(row?.to || row?.status || '').toLowerCase());
  });
}

function transitionRecord(lead, to, pairId = '', notBefore = '') {
  const history = lead?.stateHistory || lead?.history || [];
  const cutoff = notBefore ? Date.parse(notBefore) : null;
  if (notBefore && !Number.isFinite(cutoff)) return null;
  const matching = history.filter((row) =>
    String(row?.to || row?.status || '').toLowerCase() === to &&
    (!pairId || String(row?.pairId || '') === pairId));
  if (notBefore && matching.some((row) => {
    const at = Date.parse(row?.at || '');
    return !Number.isFinite(at) || at < cutoff;
  })) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const row = history[i] || {};
    if (String(row.to || row.status || '').toLowerCase() === to && row.evidence &&
        (!pairId || String(row.pairId || '') === pairId)) {
      const proof = evidenceRecord(row.evidence);
      if (proof) return { evidence: proof, at: row.at || null, row };
    }
  }
  if (pairId) return null;
  const fallback = to === 'hired' ? lead?.hireEvidence : to === 'paid' ? lead?.paymentEvidence : null;
  const proof = evidenceRecord(fallback);
  return proof ? { evidence: proof, at: null, row: null } : null;
}

function pairInvoiceRecord(lead, pairId, hiredAt) {
  const invoice = transitionRecord(lead, 'invoiced', pairId, hiredAt);
  const feeCents = Number(invoice?.row?.netFeeCents ?? invoice?.row?.feeCents);
  return invoice && Number.isSafeInteger(feeCents) && feeCents > 0 ? { ...invoice, feeCents } : null;
}

function pairPaymentRecord(lead, pairId, invoice) {
  const payment = invoice && transitionRecord(lead, 'paid', pairId, invoice.at);
  const feeCents = Number(payment?.row?.feeCents);
  return payment && invoice && Number.isSafeInteger(feeCents) && feeCents === invoice.feeCents
    ? { ...payment, feeCents }
    : null;
}

export function confirmHire(claimId, {
  startDate,
  evidence = '',
  leadId = '',
  firstPlacementConfirmed = false,
  actor = 'human',
} = {}) {
  const start = validDate(startDate, { future: false });
  if (!start) throw new Error('valid_started_date_required');
  const requestedProof = evidence ? evidenceRecord(evidence) : null;
  if (evidence && !requestedProof) throw new Error('written_hire_evidence_required');
  return updateStore((store) => {
    const claim = store.claims[claimId];
    if (!claim) throw new Error('claim_not_found');
    if (directPriorForClaim(store, claim)) throw new Error('subject_already_direct');
    const prior = claim.rewardId ? store.rewards[claim.rewardId] : null;
    if (prior) {
      if (prior.claimId !== claim.id || prior.startDate !== startDate ||
          (leadId && ![prior.outcomeLeadId, prior.billingLeadId].includes(leadId)) ||
          (requestedProof && !sameEvidence(prior.supplementalHireEvidence, requestedProof))) {
        throw new Error('hire_confirmation_conflict');
      }
      if (!evidenceValid(prior.hireEvidence)) throw new Error('hire_evidence_invalid');
      if (prior.supplementalHireEvidence && !evidenceValid(prior.supplementalHireEvidence)) {
        throw new Error('supplemental_hire_evidence_invalid');
      }
      if (!evidenceValid(prior.companyHireEvidence) || !evidenceValid(prior.talentHireEvidence)) {
        throw new Error('pair_hire_evidence_invalid');
      }
      return { ok: true, reused: true, rewardId: prior.id, startDate: prior.startDate, day90: prior.day90 };
    }
    if (claim.status !== 'eligible') throw new Error('claim_not_qualified');
    if (Date.now() > new Date(claim.expiresAt).getTime()) throw new Error('claim_expired');
    if (startDate < claim.submittedAt.slice(0, 10)) throw new Error('referral_cannot_postdate_hire');
    const { outcome, billing, leadsDoc } = resolveClaimLeads(claim, leadId);
    const link = store.links[claim.linkId];
    const billingCompanyId = canonicalCompanyId(billing);
    if (link?.ownerType === 'company' && claim.kind === 'talent' && link.companyId !== billingCompanyId) {
      throw new Error('hiring_partner_must_match_billing_company');
    }
    if (!['hired', 'invoiced', 'paid'].includes(leadState(billing))) throw new Error('canonical_hire_state_required');
    const pair = canonicalHirePair(leadsDoc, outcome, billing, claim.submittedAt);
    if (claim.kind === 'company') {
      if (!billingCompanyId) throw new Error('canonical_company_identity_required');
      if (firstPlacementConfirmed !== true) throw new Error('first_placement_attestation_required');
      if (leadRows(leadsDoc).some(({ side, lead }) =>
        side === 'company' && canonicalCompanyId(lead) === billingCompanyId && hasPriorPlacement(lead, claim.submittedAt))) {
        throw new Error('company_prior_placement_exists');
      }
    }
    const proof = requestedProof || pair.companyHire;
    const rewardId = stableId('reward', claim.id, billing.id, claim.ruleVersion);
    const existing = store.rewards[rewardId];
    if (existing) {
      if (existing.startDate !== startDate || existing.billingLeadId !== billing.id ||
          existing.billingCompanyId !== (billingCompanyId || null)) throw new Error('hire_confirmation_conflict');
      return { ok: true, reused: true, rewardId, startDate: existing.startDate, day90: existing.day90 };
    }
    if (claim.kind === 'company' && Object.values(store.rewards).some((row) =>
      row.id !== rewardId && row.billingCompanyId === billingCompanyId && !row.void &&
      (row.kind || store.claims[row.claimId]?.kind) === 'company' && store.claims[row.claimId]?.status !== 'void')) {
      throw new Error('company_first_placement_already_rewarded');
    }
    const reward = {
      id: rewardId,
      claimId: claim.id,
      linkId: claim.linkId,
      outcomeLeadId: outcome.id,
      billingLeadId: billing.id,
      billingCompanyId: billingCompanyId || null,
      pairId: pair.pairId,
      kind: claim.kind,
      firstPlacementConfirmed: claim.kind === 'company' ? true : null,
      mode: claim.rewardMode,
      ruleVersion: claim.ruleVersion,
      rateBps: claim.rateBps,
      currency: 'USD',
      startDate,
      day90: addDays(startDate, RETENTION_DAYS),
      hireEvidence: pair.companyHire,
      supplementalHireEvidence: requestedProof || null,
      companyHireEvidence: pair.companyHire,
      companyHiredAt: pair.companyHiredAt,
      talentHireEvidence: pair.talentHire,
      talentHiredAt: pair.talentHiredAt,
      hiredAt: new Date().toISOString(),
      retention: null,
      settlement: null,
      reversal: null,
      void: null,
      idempotencyKey: `reward:${rewardId}:transfer:v1`,
    };
    store.rewards[rewardId] = reward;
    claim.rewardId = rewardId;
    claim.status = 'linked_to_placement';
    addEvent(store, {
      actor,
      type: 'hire_linked',
      claimId,
      rewardId,
      billingLeadId: billing.id,
      pairId: pair.pairId,
      firstPlacementConfirmed: claim.kind === 'company' ? true : undefined,
      evidence: proof,
    });
    return { ok: true, reused: false, rewardId, startDate, day90: reward.day90 };
  });
}

export function confirmRetention(rewardId, { asOf, evidence, actor = 'human' } = {}) {
  const date = validDate(asOf, { future: false });
  if (!date) throw new Error('valid_as_of_date_required');
  const proof = evidenceRecord(evidence);
  if (!proof) throw new Error('retention_evidence_required');
  return updateStore((store) => {
    const reward = store.rewards[rewardId];
    if (!reward) throw new Error('reward_not_found');
    const claim = store.claims[reward.claimId];
    if (claim && directPriorForClaim(store, claim)) throw new Error('subject_already_direct');
    if (reward.void) throw new Error('reward_void');
    if (asOf < reward.day90) throw new Error('day_90_not_reached');
    if (reward.retention) {
      if (!evidenceValid(reward.retention.evidence)) throw new Error('retention_evidence_invalid');
      if (reward.retention.asOf !== asOf || !sameEvidence(reward.retention.evidence, proof)) {
        throw new Error('retention_replay_conflict');
      }
      return { ok: true, reused: true, rewardId, retention: reward.retention };
    }
    reward.retention = { asOf, evidence: proof, at: new Date().toISOString(), actor };
    if (claim) claim.status = 'retained_90d';
    addEvent(store, { actor, type: 'retention_confirmed', claimId: reward.claimId, rewardId, evidence: proof, asOf });
    return { ok: true, reused: false, rewardId, retention: reward.retention };
  });
}

function reversalReason(lead = {}) {
  if (['fell_through', 'rejected', 'void', 'refunded', 'credited', 'disputed'].includes(leadState(lead))) return `state_${leadState(lead)}`;
  for (const key of ['refundAt', 'refundedAt', 'creditAt', 'creditedAt', 'creditNoteAt', 'chargebackAt', 'disputedAt', 'reversedAt']) {
    if (lead[key]) return key;
  }
  const invoice = String(lead.invoiceStatus || '').toLowerCase();
  if (/chargeback/.test(invoice)) return 'invoice_chargeback';
  if (/disput/.test(invoice)) return 'invoice_dispute';
  if (/refund/.test(invoice)) return 'invoice_refund';
  if (/credit/.test(invoice)) return 'invoice_credit';
  if (/uncollectible/.test(invoice)) return 'invoice_uncollectible';
  if (/void/.test(invoice)) return 'invoice_void';
  return '';
}

function projectReward(store, reward, leadsDoc) {
  const claim = store.claims[reward.claimId];
  const link = store.links[reward.linkId];
  const directPrior = claim && directPriorForClaim(store, claim);
  const outcome = leadRows(leadsDoc).find(({ lead }) => lead.id === reward.outcomeLeadId)?.lead;
  const billing = leadRows(leadsDoc).find(({ lead }) => lead.id === reward.billingLeadId)?.lead;
  const reversal = billing ? reversalReason(billing) : 'billing_lead_missing';
  const invoice = billing && pairInvoiceRecord(billing, reward.pairId, reward.companyHiredAt);
  const fee = invoice?.feeCents;
  const amount = calculateRewardCents(fee, reward.rateBps);
  const feeOk = amount !== null;
  const payment = billing && pairPaymentRecord(billing, reward.pairId, invoice);
  const paid = !!payment;
  const retention = !!(reward.retention && evidenceValid(reward.retention.evidence));
  const approvalRecorded = link?.approval?.status === 'approved' && claim?.qualification?.conflictsChecked === true;
  const approved = approvalRecorded && evidenceValid(link.approval.evidence) && evidenceValid(claim.qualification.evidence);
  let currentPair = null;
  try { currentPair = outcome && billing ? canonicalHirePair(leadsDoc, outcome, billing, claim?.submittedAt) : null; } catch { /* projected below */ }
  const canonicalHire = currentPair?.pairId === reward.pairId &&
    currentPair.companyHiredAt === reward.companyHiredAt && currentPair.talentHiredAt === reward.talentHiredAt &&
    sameEvidence(currentPair.companyHire, reward.companyHireEvidence) &&
    sameEvidence(currentPair.talentHire, reward.talentHireEvidence);
  const hireEvidence = canonicalHire && evidenceValid(reward.hireEvidence) &&
    evidenceValid(reward.companyHireEvidence) && evidenceValid(reward.talentHireEvidence) &&
    (!reward.supplementalHireEvidence || evidenceValid(reward.supplementalHireEvidence));
  const settlementEvidence = !reward.settlement ||
    (evidenceValid(reward.settlement.evidence) && evidenceValid(reward.settlement.paymentEvidence) &&
      evidenceValid(reward.settlement.invoiceEvidence) &&
      sameEvidence(payment?.evidence, reward.settlement.paymentEvidence) &&
      payment?.at === reward.settlement.paymentAt && payment?.feeCents === reward.settlement.paidFeeCents &&
      sameEvidence(invoice?.evidence, reward.settlement.invoiceEvidence) &&
      invoice?.at === reward.settlement.invoiceAt && invoice?.feeCents === reward.settlement.basisFeeCents &&
      calculateRewardCents(reward.settlement.basisFeeCents, reward.rateBps) === reward.settlement.amountCents);
  const reversalEvidence = !reward.reversal || evidenceValid(reward.reversal.evidence);
  const foundationalEvidence = approved && hireEvidence && retention;
  const voided = !!(reward.void || claim?.status === 'void');
  const voidEvidence = !voided || evidenceValid(reward.void?.evidence || claim?.void?.evidence);
  let state = 'waiting_for_hire';
  if (directPrior && reward.settlement) state = 'needs_reversal';
  else if (directPrior) state = 'void';
  else if (voided && !voidEvidence) state = 'needs_evidence';
  else if (voided) state = 'void';
  else if (reward.reversal && foundationalEvidence && settlementEvidence && reversalEvidence) state = 'reversed';
  else if (reward.reversal) state = 'needs_evidence';
  else if (reward.settlement && reversal) state = 'needs_reversal';
  else if (reward.settlement && (!foundationalEvidence || !settlementEvidence)) state = 'needs_evidence';
  else if (reward.settlement) state = reward.settlement.kind === 'cash' ? 'paid' : 'credited';
  else if (!approvalRecorded) state = 'needs_approval';
  else if (!approved || !hireEvidence) state = 'needs_evidence';
  else if (reversal) state = 'blocked_reversal';
  else if (!retention) state = 'waiting_for_day_90';
  else if (!paid || !feeOk) state = 'waiting_for_fee';
  else state = 'eligible';
  return {
    rewardId: reward.id,
    claimId: reward.claimId,
    linkId: reward.linkId,
    mode: reward.mode,
    state,
    amountCents: state === 'eligible' || state === 'needs_reversal' || SETTLED.has(state)
      ? (reward.settlement?.amountCents ?? amount)
      : null,
    currency: reward.settlement?.currency || reward.currency,
    startDate: reward.startDate,
    day90: reward.day90,
    reversal: reversal || null,
    idempotencyKey: reward.idempotencyKey,
  };
}

function projectClaim(store, claim, rewardProjection) {
  const link = store.links[claim.linkId];
  const directPrior = directPriorForClaim(store, claim);
  const approvalRecorded = link?.approval?.status === 'approved' && !!claim.qualifiedAt;
  const evidenceOk = approvalRecorded && evidenceValid(link.approval.evidence) && evidenceValid(claim.qualification?.evidence);
  const voided = claim.status === 'void';
  const voidEvidence = !voided || evidenceValid(claim.void?.evidence);
  let state = claim.status;
  if (rewardProjection) state = rewardProjection.state;
  else if (directPrior) state = 'void';
  else if (voided && !voidEvidence) state = 'needs_evidence';
  else if (voided) state = 'void';
  else if (!approvalRecorded) state = 'needs_approval';
  else if (!evidenceOk) state = 'needs_evidence';
  else if (Date.now() > new Date(claim.expiresAt).getTime()) state = 'expired';
  else state = 'waiting_for_hire';
  return {
    claimId: claim.id,
    linkId: claim.linkId,
    kind: claim.kind,
    state,
    submittedAt: claim.submittedAt,
    expiresAt: claim.expiresAt,
    rewardId: claim.rewardId || null,
  };
}

export function referralStatus({ write = false } = {}) {
  const store = loadReferrals();
  const leads = readJson(LEADS_PATH) || { partners: [], talent: [] };
  const rewards = Object.values(store.rewards).map((reward) => projectReward(store, reward, leads));
  const rewardByClaim = new Map(rewards.map((reward) => [reward.claimId, reward]));
  const claims = Object.values(store.claims).map((claim) => projectClaim(store, claim, rewardByClaim.get(claim.id)));
  const byState = {};
  for (const claim of claims) byState[claim.state] = (byState[claim.state] || 0) + 1;
  const activeLinks = Object.values(store.links).filter((link) => link.active);
  const pendingApproval = activeLinks.filter((link) => (link.approval?.status || 'pending') !== 'approved').length;
  const next = [];
  if (!activeLinks.length) {
    next.push({
      pri: 1,
      id: 'mint-talent',
      title: 'Mint a talent-referrer unique link',
      cmd: 'bin/dg referrals mint-talent --name "Name" --email email@example.com --text',
      note: 'Then approve with written agreement evidence before sharing the pack',
    });
  } else if (pendingApproval > 0) {
    next.push({
      pri: 1,
      id: 'approve-pending',
      title: `${pendingApproval} referral link(s) pending approval`,
      cmd: 'bin/dg referrals status',
      note: 'bin/dg referrals approve <linkId> --evidence PATH --beneficiary-id ID --i-reviewed',
    });
  }
  if (byState.waiting_for_hire || byState.eligible) {
    next.push({
      pri: 2,
      id: 'lifecycle',
      title: 'Advance claims: qualify → hire → retain → settle',
      cmd: 'bin/dg referrals status',
      note: 'Evidence-gated; see DEMIGOD-REFERRAL-SIMPLE.md',
    });
  }
  next.push({
    pri: 3,
    id: 'public-page',
    title: 'Public explainer /?p=refer (disk v813+; short ?r= links)',
    cmd: 'open https://www.trydemigod.com/?p=refer  # live after authorized publish',
    note: 'Design: DEMIGOD-REFERRAL-SIMPLE.md · mint pack includes share message',
  });
  const report = {
    schema: 'demigod.referrals-status/1',
    at: new Date().toISOString(),
    summary: {
      activeLinks: activeLinks.length,
      directSubjects: Object.keys(store.directSubjects).length,
      claims: claims.length,
      talent: claims.filter((claim) => claim.kind === 'talent').length,
      company: claims.filter((claim) => claim.kind === 'company').length,
      duplicateAttempts: store.events.filter((event) => event.type === 'claim_duplicate_blocked').length,
      byState,
      pendingApproval,
    },
    next,
    links: activeLinks.map((link) => ({
      linkId: link.id,
      ownerType: link.ownerType,
      rewardMode: link.rewardMode,
      active: !!link.active,
      approval: link.approval?.status === 'approved' && !evidenceValid(link.approval.evidence)
        ? 'needs_evidence'
        : link.approval?.status || 'pending',
      createdAt: link.createdAt,
      claims: claims.filter((claim) => claim.linkId === link.id).length,
    })),
    claims,
    rewards,
    privacy: 'redacted: no name, email, token, resume, compensation, bank, TIN, or raw Stripe payload',
  };
  if (write) {
    fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true, mode: 0o700 });
    atomicWrite(STATUS_PATH, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  }
  return report;
}

export function settleReward(rewardId, {
  kind,
  amountCents,
  currency = 'USD',
  evidence,
  observed = false,
  providerId = '',
  beneficiaryId = '',
  actor = 'human',
} = {}) {
  if (observed !== true) throw new Error('settlement_attestation_required');
  const settlementKind = String(kind || '').toLowerCase();
  if (!['cash', 'credit'].includes(settlementKind)) throw new Error('settlement_kind_invalid');
  const observedAmount = Number(amountCents);
  if (!Number.isSafeInteger(observedAmount) || observedAmount <= 0) throw new Error('settlement_amount_required');
  const observedCurrency = clean(currency, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(observedCurrency)) throw new Error('settlement_currency_invalid');
  const proof = evidenceRecord(evidence);
  if (!proof) throw new Error('settlement_evidence_required');
  const safeProviderId = providerId ? clean(providerId, 120) : '';
  if (!safeProviderId) throw new Error(providerId ? 'provider_id_invalid' : 'provider_id_required');
  return updateStore((store) => {
    const reward = store.rewards[rewardId];
    if (!reward) throw new Error('reward_not_found');
    const expected = reward.mode === 'cash' ? 'cash' : 'credit';
    if (settlementKind !== expected) throw new Error('settlement_mode_mismatch');
    const link = store.links[reward.linkId];
    const beneficiary = clean(beneficiaryId, 160);
    if (beneficiary !== link?.approval?.payoutBeneficiaryId) throw new Error('settlement_beneficiary_mismatch');
    const leadsDoc = loadLeads();
    const billing = leadRows(leadsDoc).find(({ lead }) => lead.id === reward.billingLeadId)?.lead;
    const invoice = pairInvoiceRecord(billing, reward.pairId, reward.companyHiredAt);
    const payment = pairPaymentRecord(billing, reward.pairId, invoice);
    if (reward.settlement) {
      if (reward.settlement.kind !== settlementKind || reward.settlement.providerId !== safeProviderId ||
          reward.settlement.amountCents !== observedAmount || reward.settlement.currency !== observedCurrency ||
          !sameEvidence(reward.settlement.evidence, proof) || reward.settlement.beneficiaryId !== beneficiary) {
        throw new Error('settlement_replay_conflict');
      }
      if (!evidenceValid(reward.settlement.evidence) || !evidenceValid(reward.settlement.paymentEvidence) ||
          !evidenceValid(reward.settlement.invoiceEvidence) ||
          !sameEvidence(payment?.evidence, reward.settlement.paymentEvidence) ||
          payment?.at !== reward.settlement.paymentAt || payment?.feeCents !== reward.settlement.paidFeeCents ||
          !sameEvidence(invoice?.evidence, reward.settlement.invoiceEvidence) ||
          invoice?.at !== reward.settlement.invoiceAt || invoice?.feeCents !== reward.settlement.basisFeeCents) {
        throw new Error('settlement_evidence_invalid');
      }
      return { ok: true, reused: true, rewardId, settlement: reward.settlement };
    }
    if (Object.values(store.rewards).some((row) => row.id !== rewardId &&
        (row.settlement?.providerId === safeProviderId || row.reversal?.providerId === safeProviderId))) {
      throw new Error('provider_id_already_used');
    }
    const projection = projectReward(store, reward, leadsDoc);
    if (projection.state !== 'eligible') throw new Error(`reward_not_eligible:${projection.state}`);
    if (observedAmount !== projection.amountCents) throw new Error('settlement_amount_mismatch');
    if (observedCurrency !== projection.currency) throw new Error('settlement_currency_mismatch');
    if (!invoice) throw new Error('pair_bound_invoice_evidence_required');
    if (!payment) throw new Error('pair_bound_payment_evidence_required');
    reward.settlement = {
      kind: settlementKind,
      amountCents: observedAmount,
      currency: observedCurrency,
      evidence: proof,
      paymentEvidence: payment.evidence,
      paymentAt: payment.at,
      paidFeeCents: payment.feeCents,
      invoiceEvidence: invoice.evidence,
      invoiceAt: invoice.at,
      basisFeeCents: invoice.feeCents,
      providerId: safeProviderId || null,
      beneficiaryId: beneficiary,
      at: new Date().toISOString(),
      actor,
    };
    const claim = store.claims[reward.claimId];
    if (claim) claim.status = 'converted';
    addEvent(store, {
      actor,
      type: settlementKind === 'cash' ? 'payout_observed' : 'credit_observed',
      claimId: reward.claimId,
      rewardId,
      amountCents: projection.amountCents,
      evidence: proof,
      providerId: safeProviderId || undefined,
    });
    return { ok: true, reused: false, rewardId, settlement: reward.settlement };
  });
}

export function recordRewardReversal(rewardId, {
  reason,
  amountCents,
  currency = 'USD',
  evidence,
  observed = false,
  providerId = '',
  actor = 'human',
} = {}) {
  if (observed !== true) throw new Error('reversal_attestation_required');
  const why = clean(reason, 300);
  if (!why) throw new Error('reversal_reason_required');
  const observedAmount = Number(amountCents);
  if (!Number.isSafeInteger(observedAmount) || observedAmount <= 0) throw new Error('reversal_amount_required');
  const observedCurrency = clean(currency, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(observedCurrency)) throw new Error('reversal_currency_invalid');
  const proof = evidenceRecord(evidence);
  if (!proof) throw new Error('reversal_evidence_required');
  const safeProviderId = providerId ? clean(providerId, 120) : '';
  if (!safeProviderId) throw new Error(providerId ? 'provider_id_invalid' : 'provider_id_required');
  return updateStore((store) => {
    const reward = store.rewards[rewardId];
    if (!reward) throw new Error('reward_not_found');
    if (!reward.settlement) throw new Error('settlement_required_before_reversal');
    if (observedAmount !== reward.settlement.amountCents) throw new Error('reversal_amount_mismatch');
    if (observedCurrency !== reward.settlement.currency) throw new Error('reversal_currency_mismatch');
    if (reward.settlement.providerId === safeProviderId) throw new Error('provider_id_already_used');
    if (reward.reversal) {
      if (reward.reversal.reason !== why || reward.reversal.providerId !== safeProviderId ||
          reward.reversal.amountCents !== observedAmount || reward.reversal.currency !== observedCurrency ||
          !sameEvidence(reward.reversal.evidence, proof)) {
        throw new Error('reversal_replay_conflict');
      }
      if (!evidenceValid(reward.reversal.evidence)) throw new Error('reversal_evidence_invalid');
      return { ok: true, reused: true, rewardId, reversal: reward.reversal };
    }
    if (Object.values(store.rewards).some((row) => row.id !== rewardId &&
        (row.settlement?.providerId === safeProviderId || row.reversal?.providerId === safeProviderId))) {
      throw new Error('provider_id_already_used');
    }
    reward.reversal = {
      reason: why,
      kind: reward.settlement.kind,
      amountCents: observedAmount,
      currency: observedCurrency,
      evidence: proof,
      providerId: safeProviderId || null,
      at: new Date().toISOString(),
      actor,
    };
    addEvent(store, {
      actor,
      type: 'settlement_reversal_observed',
      claimId: reward.claimId,
      rewardId,
      amountCents: reward.reversal.amountCents,
      reason: why,
      evidence: proof,
      providerId: safeProviderId || undefined,
    });
    return { ok: true, reused: false, rewardId, reversal: reward.reversal };
  });
}

export function revokeReferral(linkId, { reason, reviewed = false, actor = 'human' } = {}) {
  const why = clean(reason, 300);
  if (!why || reviewed !== true) throw new Error('reviewed_revoke_reason_required');
  return updateStore((store) => {
    const link = store.links[linkId];
    if (!link) throw new Error('link_not_found');
    if (!link.active) {
      if (link.revokeReason !== why) throw new Error('revoke_replay_conflict');
      return { ok: true, reused: true, linkId };
    }
    link.active = false;
    link.revokedAt = new Date().toISOString();
    link.revokeReason = why;
    addEvent(store, { actor, type: 'link_revoked', linkId, reason: why });
    return { ok: true, reused: false, linkId };
  });
}

export function voidClaim(claimId, { reason, evidence, reviewed = false, actor = 'human' } = {}) {
  const why = clean(reason, 300);
  const proof = evidenceRecord(evidence);
  if (!why || !proof || reviewed !== true) throw new Error('reviewed_void_reason_and_evidence_required');
  return updateStore((store) => {
    const claim = store.claims[claimId];
    if (!claim) throw new Error('claim_not_found');
    const reward = claim.rewardId ? store.rewards[claim.rewardId] : null;
    if (reward?.settlement) throw new Error('settled_reward_requires_reversal_record');
    if (claim.status === 'void') {
      if (claim.void?.reason !== why || !sameEvidence(claim.void?.evidence, proof)) throw new Error('void_replay_conflict');
      if (!evidenceValid(claim.void.evidence)) throw new Error('void_evidence_invalid');
      return { ok: true, reused: true, claimId };
    }
    claim.status = 'void';
    claim.void = { reason: why, evidence: proof, at: new Date().toISOString(), actor };
    if (reward) reward.void = claim.void;
    addEvent(store, { actor, type: 'claim_voided', claimId, rewardId: reward?.id, reason: why, evidence: proof });
    return { ok: true, reused: false, claimId };
  });
}

export async function syncReferralInbox() {
  const { extractEmail, INBOX_PATH, isSyntheticContact, loadInbox, submissionApprovalBlocker } = await import('./demigod-submissions-lib.mjs');
  const inbox = loadInbox();
  let archived = [];
  try {
    archived = fs.readFileSync(`${INBOX_PATH}.archive.jsonl`, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
      try {
        const outer = JSON.parse(line);
        const row = outer?.archivedRaw ? JSON.parse(outer.archivedRaw) : outer;
        return row?.id ? [row] : [];
      } catch {
        return [];
      }
    });
  } catch { /* no archive yet */ }
  const rows = [...new Map([...archived, ...(inbox.items || [])].map((row) => [row.id, row])).values()]
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const results = [];
  const directResults = [];
  for (const item of rows) {
    const raw = item.raw || {};
    const kind = referralKind(item.form);
    const email = extractEmail(raw, item.form);
    const company = clean(raw['company-name'] || raw.companyName, 160).toLowerCase();
    const subjectKey = kind === 'company' ? `company:${company}` : `talent:${email}`;
    const eligible = !!kind && item.status !== 'updated' && !item.supersedes &&
      !submissionApprovalBlocker(item) && !isSyntheticContact(email, raw);
    if (!raw.referral) {
      if (eligible) directResults.push(recordDirectSubmission({
        submissionId: item.id,
        form: item.form,
        at: item.at,
        eligible: true,
        subjectKey,
        actor: 'referral-sync',
      }));
      continue;
    }
    results.push(recordReferralSubmission({
      token: raw.referral,
      submissionId: item.id,
      form: item.form,
      at: item.at,
      eligible,
      subjectKey,
      actor: 'referral-sync',
    }));
  }
  return {
    ok: true,
    scanned: rows.length,
    referralRows: results.length,
    attached: results.filter((result) => result.attached).length,
    directRows: directResults.length,
    directRecorded: directResults.filter((result) => result.recorded).length,
    results,
  };
}

function flag(args, name) {
  return args.includes(name);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';
  const rest = args.slice(1);
  let result;
  if (cmd === 'create') {
    result = createReferral({
      name: opt(rest, '--name', ''),
      email: opt(rest, '--email', ''),
      ownerType: opt(rest, '--owner', 'individual'),
      rewardMode: opt(rest, '--mode', ''),
      companyId: opt(rest, '--company-id', ''),
    });
  } else if (cmd === 'mint-talent' || cmd === 'mint') {
    result = mintTalentReferrer({
      name: opt(rest, '--name', ''),
      email: opt(rest, '--email', ''),
    });
    if (flag(rest, '--text') || flag(rest, '--pack-text')) {
      process.stdout.write(result.packText);
      return;
    }
  } else if (cmd === 'pack') {
    result = packReferral(rest[0]);
    if (flag(rest, '--text') || flag(rest, '--pack-text') || rest.includes('--text')) {
      process.stdout.write(result.packText);
      return;
    }
  } else if (cmd === 'approve') {
    result = approveReferral(rest[0], {
      evidence: opt(rest, '--evidence', ''),
      beneficiaryId: opt(rest, '--beneficiary-id', ''),
      agreementVersion: opt(rest, '--agreement-version', AGREEMENT_VERSION),
      reviewed: flag(rest, '--i-reviewed'),
      verifiedCompany: flag(rest, '--i-verified-company'),
    });
  } else if (cmd === 'qualify') {
    result = qualifyClaim(rest[0], {
      evidence: opt(rest, '--evidence', ''),
      confirmedSubject: flag(rest, '--i-confirmed-subject'),
      confirmedReferrer: flag(rest, '--i-confirmed-referrer'),
      checkedConflicts: flag(rest, '--i-checked-conflicts'),
    });
  } else if (cmd === 'sync') {
    const badSync = rest.find((a) => a.startsWith('-'));
    if (badSync) throw new Error(`usage: referrals sync  (unknown: ${badSync})`);
    if (rest.length) throw new Error('usage: referrals sync');
    result = await syncReferralInbox();
  } else if (cmd === 'hire') {
    result = confirmHire(rest[0], {
      startDate: opt(rest, '--start', ''),
      evidence: opt(rest, '--evidence', ''),
      leadId: opt(rest, '--lead', ''),
      firstPlacementConfirmed: flag(rest, '--i-first-placement'),
    });
  } else if (cmd === 'retain') {
    result = confirmRetention(rest[0], {
      asOf: opt(rest, '--as-of', ''),
      evidence: opt(rest, '--evidence', ''),
    });
  } else if (cmd === 'settle') {
    result = settleReward(rest[0], {
      kind: opt(rest, '--kind', ''),
      amountCents: opt(rest, '--amount-cents', ''),
      currency: opt(rest, '--currency', 'USD'),
      evidence: opt(rest, '--evidence', ''),
      providerId: opt(rest, '--provider-id', ''),
      beneficiaryId: opt(rest, '--beneficiary-id', ''),
      observed: flag(rest, '--i-observed-settlement'),
    });
  } else if (cmd === 'reverse') {
    result = recordRewardReversal(rest[0], {
      reason: opt(rest, '--reason', ''),
      amountCents: opt(rest, '--amount-cents', ''),
      currency: opt(rest, '--currency', 'USD'),
      evidence: opt(rest, '--evidence', ''),
      providerId: opt(rest, '--provider-id', ''),
      observed: flag(rest, '--i-observed-reversal'),
    });
  } else if (cmd === 'revoke') {
    result = revokeReferral(rest[0], {
      reason: opt(rest, '--reason', ''),
      reviewed: flag(rest, '--i-reviewed'),
    });
  } else if (cmd === 'void') {
    result = voidClaim(rest[0], {
      reason: opt(rest, '--reason', ''),
      evidence: opt(rest, '--evidence', ''),
      reviewed: flag(rest, '--i-reviewed'),
    });
  } else if (cmd === 'status') {
    const badStatus = rest.find((a) => a.startsWith('-'));
    if (badStatus) throw new Error(`usage: referrals status  (unknown: ${badStatus})`);
    if (rest.length) throw new Error('usage: referrals status');
    result = referralStatus({ write: true });
  } else {
    throw new Error('usage: referrals create|mint-talent|pack|approve|qualify|sync|status|hire|retain|settle|reverse|revoke|void');
  }
  console.log(JSON.stringify(result, null, 2));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => {
  const msg = String(error.message || error);
  console.error(JSON.stringify({ ok: false, error: msg }));
  // usage / bad invocation → 2; product failures stay 1
  process.exitCode = /^usage:/.test(msg) ? 2 : 1;
});
