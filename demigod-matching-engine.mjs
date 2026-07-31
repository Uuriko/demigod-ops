#!/usr/bin/env node
/**
 * Demigod Matching Engine (ops tool)
 * Organize submissions, compute potential matches, mutual interest tracking,
 * present options for startups and candidates to opt-in/intro/ignore.
 * When mutual, assist "auto" intro (log, receipt, notify stub).
 *
 * Usage examples:
 *   node demigod-matching-engine.mjs suggest --role="Product Manager"
 *   node demigod-matching-engine.mjs startup-interest --role-id=role-xxx --candidate-id=cand-yyy
 *   node demigod-matching-engine.mjs candidate-optin --candidate-id=cand-yyy --role="Founding Designer"
 *   node demigod-matching-engine.mjs mutual-intros
 *   node demigod-matching-engine.mjs propose-intro --startup=... --candidate=...
 *
 * Integrates with submissions-lib, board, pilot-logger, receipts.
 * Honest: human review always; this surfaces + tracks.
 */

import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard, saveBoard, loadInbox, saveInbox, extractEmail, scrubPII, clip, startupRoleReadiness, candidateProfileReadiness, isSampleData } from './demigod-submissions-lib.mjs';
import { appendPilot, computeSignal } from './demigod-board-lib.mjs';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';
import { projectCompanyResearch, refuseIfStale } from './demigod-evidence.mjs';
import { normalizeCompanyName } from './demigod-startup-atlas.mjs';
import { boardsFromMap, observedOpenDays } from './demigod-role-ledger.mjs';
import {
  assertCurrentMutualPairEligibility,
  proposePair,
  reviewPair,
  pairId as makePairId,
  listPairs,
} from './demigod-pairs-lib.mjs';

/**
 * Legacy interests file — kept for read-compat / migration.
 * Canonical SoR for pairs is DEMIGOD-PAIRS.json via demigod-pairs-lib.
 */
const EVIDENCE_ROOT = process.env.DEMIGOD_ROOT || ROOT;
const MATCHES_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-MATCHES.json');
const STARTUP_MAP_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const ROLE_LEDGER_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const COMPANY_RESEARCH_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json');
const COMPANY_RESEARCH_CATALOG_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-COMPANY-RESEARCH.json');

function loadMatches() {
  try {
    const stored = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf8'));
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      throw new Error('matches_store_invalid');
    }
    const analyticsShape = ['matches', 'events', 'suggestions'].every((key) => Array.isArray(stored[key]));
    const matches = analyticsShape
      ? { ...stored, interests: stored.interests ?? {}, intros: stored.intros ?? [] }
      : stored;
    if (!matches.interests || typeof matches.interests !== 'object' || Array.isArray(matches.interests) ||
        !Array.isArray(matches.intros)) {
      throw new Error('matches_store_invalid');
    }
    return matches;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { interests: {}, intros: [], at: new Date().toISOString(), legacy: true };
    }
    throw error;
  }
}
function saveMatches(m) {
  m.at = new Date().toISOString();
  m.note = m.note || 'legacy mirror — prefer demigod-pairs-lib / DEMIGOD-PAIRS.json';
  atomicWrite(MATCHES_PATH, JSON.stringify(m, null, 2), { mode: 0o600 });
}

/** One-shot: copy legacy interests into pair ledger (idempotent). */
export function migrateLegacyMatchesToPairs() {
  const m = loadMatches();
  const out = { migrated: 0, errors: [] };
  for (const [key, val] of Object.entries(m.interests || {})) {
    const parts = String(key).split(':');
    if (parts.length < 2) continue;
    const [a, b] = parts;
    try {
      // keys are either roleId:candId or candId:roleTitle
      if (val.startup) {
        mirrorPairInterest(a, b, { reasons: ['migrate-legacy'] });
        out.migrated++;
      }
      if (val.candidate) {
        // candidate key is candId:roleTitle — reverse
        mirrorPairInterest(b, a, { reasons: ['migrate-legacy'] });
        out.migrated++;
      }
    } catch (e) {
      out.errors.push(String(e.message || e));
    }
  }
  m.migratedToPairsAt = new Date().toISOString();
  saveMatches(m);
  return out;
}

/** Dual-write interests into canonical pair ledger (freeze-safe SoR). */
function mirrorPairInterest(roleId, candId, extra = {}) {
  try {
    if (!roleId || !candId) return null;
    const pair = proposePair({
      roleId: String(roleId),
      candId: String(candId),
      score: extra.score != null ? Number(extra.score) / 100 : null,
      reasons: extra.reasons || ['matching-engine'],
      actor: 'matching-engine',
      sample: true,
    });
    return pair;
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

function norm(s) { return String(s || '').toLowerCase().trim(); }

function boundedStoreText(value, max = 160) {
  const text = String(value || '').trim();
  return text && text.length <= max && !/[\r\n\u0000-\u001f\u007f]/.test(text) ? text : '';
}

const exactTitle = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const projectedText = (value, max = 240) =>
  value == null ? value : clip(scrubPII(String(value).slice(0, max * 4)), max);

function projectResearchForReview(research) {
  if (!research) return research;
  return {
    ...research,
    fields: Object.fromEntries(Object.entries(research.fields || {}).map(([name, field]) => [
      name,
      {
        ...field,
        value: projectedText(field.value, 500),
        evidence: field.evidence
          ? { ...field.evidence, quote: projectedText(field.evidence.quote) }
          : field.evidence,
      },
    ])),
  };
}

export function loadCompanyEvidenceSources() {
  const research = readJson(COMPANY_RESEARCH_PATH) || {};
  const researchCatalog = readJson(COMPANY_RESEARCH_CATALOG_PATH) || {};
  const researchEvidence = refuseIfStale('company-research-benchmark');
  const researchGreen = researchEvidence.green === true;
  return {
    map: readJson(STARTUP_MAP_PATH) || {},
    ledger: readJson(ROLE_LEDGER_PATH) || {},
    research: researchGreen ? research : {},
    researchCatalog: researchGreen ? researchCatalog : {},
    researchEvidence,
  };
}

/**
 * Read-only evidence projection. Exact unique company identity only; ambiguity stays visible.
 * Nothing here changes match score/state or persists research as matching truth.
 */
export function resolveCompanyEvidence(
  role = {},
  map = {},
  ledger = {},
  today = new Date().toISOString().slice(0, 10),
  research = {},
  researchCatalog = {},
) {
  const companyKey = normalizeCompanyName(role.company);
  if (!companyKey) return { status: 'unknown', reason: 'company_missing' };
  const matches = (Array.isArray(map.companies) ? map.companies : [])
    .filter((company) => normalizeCompanyName(company.name) === companyKey);
  if (!matches.length) return { status: 'unknown', reason: 'company_not_found' };
  if (matches.length > 1) {
    return {
      status: 'ambiguous',
      reason: 'company_name_not_unique',
      candidates: matches.map(({ id, name, website }) => ({
        id,
        name: projectedText(name, 120),
        website: website || null,
      })),
    };
  }

  const company = matches[0];
  const companyResearch = projectResearchForReview(projectCompanyResearch({
    companyId: company.id,
    benchmark: research,
    catalog: researchCatalog,
  }));
  const hiringQuarantined = companyResearch?.quarantineHiring === true;
  const board = hiringQuarantined ? null : boardsFromMap({ companies: [company] })[0] || null;
  const title = exactTitle(role.title);
  const ledgerAvailable = ledger?.roles && typeof ledger.roles === 'object';
  // ponytail: linear scan is enough at 13.6k rows; index by board+title if review latency becomes visible.
  const observations = board && title && ledgerAvailable
    ? Object.values(ledger.roles)
        .filter((row) =>
          row.provider === board.provider &&
          row.slug === board.slug &&
          exactTitle(row.title) === title)
        .map((row) => ({
          title: projectedText(row.title || role.title, 160),
          location: projectedText(row.location || null, 160),
          url: row.url || null,
          provider: row.provider,
          observedFrom: row.firstSeen || null,
          observedThrough: row.lastSeen || null,
          closedAt: row.closedAt || null,
          observedDays: row.firstSeen ? observedOpenDays(row, row.closedAt || today) : null,
        }))
    : [];
  const roleEvidenceStatus = hiringQuarantined
    ? 'board_quarantined'
    : !board
      ? 'board_unknown'
    : !title
      ? 'title_missing'
      : !ledgerAvailable
        ? 'ledger_unavailable'
        : observations.some((row) => !row.closedAt)
          ? 'observed_open'
          : observations.length
            ? 'observed_closed'
            : 'not_observed_exact_title';
  const reviewFlags = [
    ...(roleEvidenceStatus === 'observed_closed' ? ['public_role_observed_closed'] : []),
    ...(companyResearch?.status === 'verified_with_conflict' ? ['company_research_conflict'] : []),
    ...(hiringQuarantined ? ['public_hiring_quarantined'] : []),
  ];

  return {
    status: 'matched',
    identityBasis: 'exact_unique_name',
    role: {
      id: role.id || null,
      title: projectedText(role.title || null, 160),
      company: projectedText(role.company, 120),
      source: projectedText(role.source || null, 120),
    },
    company: {
      id: company.id || null,
      name: projectedText(company.name, 120),
      description: projectedText(company.description || null, 500),
      website: company.website || null,
      inceptionYear: company.inceptionYear || null,
      tags: Array.isArray(company.tags) ? company.tags.map((tag) => projectedText(tag, 80)) : [],
    },
    provenance: {
      source: projectedText(company.source || null, 120),
      sourceUrl: company.sourceUrl || null,
      sourceLicense: projectedText(company.sourceLicense || null, 120),
      retrievedAt: company.retrievedAt || null,
      mapGeneratedAt: map.generatedAt || null,
    },
    hiring: {
      status: hiringQuarantined
        ? 'quarantined'
        : company.openRolesAt
          ? 'board_observed'
          : company.hiring === 'yes'
            ? 'company_reported'
            : 'unknown',
      openRoles: hiringQuarantined ? null : Number.isSafeInteger(company.openRoles) ? company.openRoles : null,
      atsSource: hiringQuarantined ? null : company.atsSource || null,
      jobsUrl: hiringQuarantined ? null : company.jobsUrl || null,
      roleMix: hiringQuarantined ? null : company.roleMix || null,
      observedAt: hiringQuarantined ? null : company.openRolesAt || null,
    },
    roleEvidenceStatus,
    reviewFlags,
    roleObservations: observations,
    research: companyResearch,
  };
}

function companyEvidenceForRole(role) {
  if (!normalizeCompanyName(role?.company)) return resolveCompanyEvidence(role);
  const { map, ledger, research, researchCatalog } = loadCompanyEvidenceSources();
  return resolveCompanyEvidence(role, map, ledger, undefined, research, researchCatalog);
}

export function parseCompRange(value = '') {
  const text = norm(String(value).slice(0, 200)).replace(/,/g, '').replace(/[–—]/g, '-');
  if (!text || /\b(?:negotiable|market|tbd|unknown)\b/.test(text) || /(?:\/\s*mo\b|\bper\s+month\b|\bmonthly\b)/.test(text)) return null;
  const unit = /(?:\/\s*(?:hr|hour)\b|\bper\s+hour\b|\bhourly\b)/.test(text) ? 'hourly' : 'annual';
  // Strip trailing "+ equity" noise only — do NOT drop leading "Equity $40k–$80k" cash grants.
  const clean = text
    .replace(/\d+(?:\.\d+)?\s*%/g, '')
    .replace(/\s*(?:\+|plus)\s*(?:equity|rsus?)\b.*$/i, '');
  let found = [...clean.matchAll(/(\d+(?:\.\d+)?)\s*(k|mm|million|m)?\b/g)].slice(0, 2);
  if (!found.length) return null;
  if (found.length > 1) {
    const between = clean.slice(found[0].index + found[0][0].length, found[1].index);
    if (!/(?:-|\bto\b)/.test(between)) found = found.slice(0, 1);
  }
  const factorOf = (s) => (s === 'k' ? 1000 : s === 'm' || s === 'mm' || s === 'million' ? 1e6 : 1);
  // a k/m suffix on ANY token in a range applies to bare siblings too ("120-160k" -> both ×1000).
  const rangeSuffix = found.map((m) => m[2] || '').find(Boolean) || '';
  const hasSuffix = !!rangeSuffix;
  const values = found.map((m) => {
    const number = Number(m[1]);
    const factor = m[2] ? factorOf(m[2]) : unit === 'annual' && hasSuffix && number < 10000 ? factorOf(rangeSuffix) : 1;
    return number * factor;
  });
  if (values.some((n) => !Number.isFinite(n) || n < 0) || (unit === 'annual' && !hasSuffix && Math.max(...values) < 10000)) return null;
  let min = Math.min(...values), max = Math.max(...values);
  if (/\b(?:up to|maximum|max)\b/.test(clean)) min = 0;
  if (/\b(?:from|minimum|min)\b/.test(clean) || /\d+(?:\.\d+)?\s*k?\s*\+\s*$/.test(clean)) max = Infinity;
  return { unit, min, max };
}

export function compAligned(roleComp, candidateComp) {
  const role = parseCompRange(roleComp), candidate = parseCompRange(candidateComp);
  return !!role && !!candidate && role.unit === candidate.unit && role.min <= candidate.max && candidate.min <= role.max;
}

function compensationConflict(role = {}, candidate = {}) {
  const roleRange = parseCompRange(role.comp || role['salary-range'] || role.salaryRange);
  const candidateRange = parseCompRange(candidate['salary-expectation'] || candidate['salary-range'] || candidate.compExpect);
  return !!roleRange && !!candidateRange && roleRange.unit === candidateRange.unit
    && (roleRange.min > candidateRange.max || candidateRange.min > roleRange.max);
}

function candidateLocationPreference(candidate = {}) {
  const value = norm(String(candidate['sf-bay'] || candidate.locationPref || '').slice(0, 80));
  return /^(?:yes|no|not right now|sf|sf bay(?: area)?|san francisco|bay area|remote(?:-(?:us|bay))?|onsite|sf-onsite|hybrid|sf-hybrid)$/.test(value)
    ? value
    : '';
}

function roleLocationPreference(role = {}) {
  const value = norm(String(role.locationPref || role['work-location'] || '').slice(0, 120));
  return /^(?:sf-onsite|sf-hybrid|bay-flexible|remote-us|remote-global|remote|onsite|hybrid|sf|sf bay(?: area)?)$/.test(value)
    ? value
    : '';
}

function locationCompatible(role = {}, candidate = {}) {
  const roleLocation = roleLocationPreference(role);
  const candidateLocation = candidateLocationPreference(candidate);
  if (!roleLocation || !candidateLocation) return true;
  if (roleLocation.includes('remote')) return candidateLocation !== 'no';
  if (roleLocation.includes('onsite') || roleLocation.includes('hybrid')) return candidateLocation === 'yes' || candidateLocation.includes('onsite') || candidateLocation.includes('hybrid');
  return candidateLocation !== 'no';
}

const SKILL_STOP = new Set([
  'and', 'the', 'with', 'for', 'from', 'role', 'team', 'years', 'startup', 'startups',
  'founding', 'founder', 'lead', 'head', 'build', 'built', 'building', 'repeatable',
  'leadership', 'ai', 'platform', 'contact', 'phone', 'profile', 'link', 'removed',
  'age', 'aged', 'young', 'younger', 'old', 'older', 'gender', 'male', 'female', 'man',
  'woman', 'men', 'women', 'sex', 'sexual', 'gay', 'lesbian', 'bisexual', 'queer',
  'transgender', 'nonbinary', 'race', 'racial', 'ethnicity', 'ethnic', 'white', 'black',
  'asian', 'latino', 'latina', 'latinx', 'hispanic', 'indigenous', 'religion',
  'religious', 'christian', 'jewish', 'muslim', 'hindu', 'buddhist', 'disability',
  'disabled', 'autistic', 'handicapped', 'veteran', 'veterans', 'marital', 'married',
  'pregnant', 'pregnancy', 'nationality', 'citizenship', 'genetic',
]);
function skillTerms(value) {
  return [...new Set(
    (norm(scrubPII(String(value || '').slice(0, 2000))).match(/[a-z0-9][a-z0-9+#.-]*/g) || [])
      .filter((x) => x.length > 1 && x.length <= 48 && !/^\d+(?:\.\d+)?$/.test(x) && !SKILL_STOP.has(x)),
  )].slice(0, 80);
}

function candidateFeatureTerms(candidate, value) {
  const identity = new Set(skillTerms(candidate['full-name'] || candidate.fullName));
  return skillTerms(value).filter((term) => !identity.has(term));
}

function roleMatchText(role = {}) {
  return [role.title, role.skills, role['stack-needs'], role.outcome, role.outcome90d, role['90day-outcome']]
    .filter(Boolean).map((value) => String(value).slice(0, 700)).join(' ');
}

function candidateMatchText(candidate = {}) {
  return [candidate.skills, candidate['skills-stack'], candidate.experience, candidate['background & highlights']]
    .filter(Boolean).map((value) => String(value).slice(0, 1000)).join(' ');
}

export function matchEvidence(role = {}, candidate = {}) {
  const roleTerms = new Set(skillTerms(role.skills || role['stack-needs']));
  const overlap = candidateFeatureTerms(candidate, candidate.skills || candidate['skills-stack']).filter((x) => roleTerms.has(x));
  const roleWorkTerms = new Set(skillTerms(roleMatchText(role)));
  const experienceTerms = candidateFeatureTerms(candidate, candidate.experience || candidate['background & highlights']);
  const workOverlap = experienceTerms.filter((x) => roleWorkTerms.has(x) && !overlap.includes(x));
  const roleComp = role.comp || role['salary-range'] || role.salaryRange;
  const candidateComp = candidate['salary-expectation'] || candidate['salary-range'] || candidate.compExpect;
  const roleLocation = roleLocationPreference(role);
  const candidateLocation = candidateLocationPreference(candidate);
  const availability = norm(String(candidate.availability || '').slice(0, 80)).replace(/[–—]/g, '-');
  const availabilityLabel = {
    now: 'ready now', 'ready now': 'ready now',
    '2-4w': '2–4 weeks', '2-4 weeks': '2–4 weeks',
    '1-3m': '1–3 months', '1-3 months': '1–3 months',
    passive: 'passively open', 'passive / open': 'passively open', 'passively open / flexible': 'passively open',
  }[availability];
  const evidence = [];
  if (overlap.length) evidence.push(`skills: ${overlap.slice(0, 4).join(', ')}`);
  if (workOverlap.length) evidence.push(`work evidence: ${workOverlap.slice(0, 4).join(', ')}`);
  if (/\b(sf|bay area|san francisco)\b/i.test(String(candidate['sf-bay'] || candidate.locationPref || ''))) evidence.push('SF Bay Area preference');
  if (roleLocation && candidateLocation) evidence.push(locationCompatible(role, candidate) ? 'work-location preferences align' : 'work-location alignment needs review');
  if (roleComp && candidateComp) evidence.push(compAligned(roleComp, candidateComp) ? 'compensation ranges overlap' : 'compensation alignment needs review');
  if (availabilityLabel) evidence.push(`availability: ${availabilityLabel}`);
  if (
    (role.outcome || role.outcome90d || role['90day-outcome']) &&
    candidateFeatureTerms(candidate, candidate.why || candidate['why-this-role'] || candidate['why-startups']).length
  ) evidence.push('90-day outcome motivation provided');
  if (experienceTerms.length) evidence.push('experience evidence provided');
  return evidence;
}

// Events states (human-in-loop per EVENTS-FLOW.md): submitted -> reviewed(human) -> matched(human) -> introduced(human) -> piloted -> receipted -> invoiced(10% on hire) -> paid
export const MATCH_STATES = ['submitted','reviewed','matched','introduced','piloted','receipted','invoiced','paid'];

function scoreMatch(role, candidate) {
  // Deeper honest scoring for high-quality matches that drive revenue (better fit = higher close rate = more 10% invoices)
  let score = 0;
  const roleTerms = new Set(skillTerms(roleMatchText(role)));
  const candidateTerms = candidateFeatureTerms(candidate, candidateMatchText(candidate));
  const rStage = norm(String(role.stageType || role.stage || '').slice(0, 120));
  const cPref = candidateLocationPreference(candidate);
  const rLocation = roleLocationPreference(role);
  const rComp = norm(String(role.comp || '').slice(0, 200));
  const cWhy = candidateFeatureTerms(
    candidate,
    candidate['why-this-role'] || candidate['why-startups'] || candidate.why,
  );

  // Skills overlap (core for good match)
  if (roleTerms.size && candidateTerms.length) {
    const overlap = candidateTerms.filter((x) => roleTerms.has(x)).length;
    score += Math.min(55, overlap * 18);
  }

  // Stage + location fit (SF early startup focus)
  if (cPref && (rStage.includes('seed') || rStage.includes('pre-seed'))) {
    score += (cPref.includes('sf') || cPref.includes('bay')) ? 22 : 8;
  }
  if (rLocation && cPref && locationCompatible(role, candidate)) score += 12;

  // Comp alignment (revenue protection — realistic expectations)
  if (rComp && (candidate['salary-range'] || candidate['salary-expectation'] || candidate.compExpect)) {
    const candComp = norm(candidate['salary-range'] || candidate['salary-expectation'] || candidate.compExpect);
    if (compAligned(rComp, candComp)) score += 12;
  }

  // "Why this" signal (deeper motivation = better retention/hire)
  if (cWhy.length && (rStage || roleTerms.size)) score += 8;

  // Experience proxy
  if (candidateFeatureTerms(candidate, candidate.experience || candidate['background & highlights']).length) score += 8;

  return Math.min(100, Math.round(score));
}

const FUNNEL_ROLE_STATES = new Set(['form_filled', 'in_review']);
const LEADS_PATH = path.join(ROOT, 'DEMIGOD-LEADS.json');

function loadLeadsQuiet() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
  } catch {
    return { partners: [], talent: [] };
  }
}

/**
 * Partner leads at form_filled/in_review → matcher role shape.
 * Pure / read-only. Never writes board or inbox (real inbound only).
 */
export function funnelRolesFromPartners(partners = [], boardRoles = []) {
  const seen = new Set(
    (boardRoles || []).map((r) => `${norm(r.company)}|${norm(r.title)}`),
  );
  const out = [];
  for (const lead of partners || []) {
    const st = lead.state || lead.status;
    if (!FUNNEL_ROLE_STATES.has(st)) continue;
    const title = String(lead.title || lead.role || lead.company || lead.id || '').trim();
    if (!title) continue;
    const company = String(lead.company || lead.org || '').trim();
    const key = `${norm(company)}|${norm(title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `funnel:${lead.id}`,
      title,
      company,
      source: 'funnel',
      sample: isSampleData(lead),
      status: 'Active',
      stageType: lead.stageType || lead.stage || lead['company-stage'] || undefined,
      skills: lead.skills || lead.stack || lead.stackNeeds || lead['stack-needs'] || undefined,
      outcome90d:
        lead.outcome90d || lead.outcome || lead['90day-outcome'] || lead['90d-outcome'] || undefined,
      locationPref:
        lead.locationPref || lead.workLocation || lead['work-location'] || lead.location || undefined,
      comp: lead.comp || lead.salaryRange || lead['salary-range'] || undefined,
    });
  }
  return out;
}

/** Partner/startup WIZ submissions → matcher role shape (real inbound). */
export function rolesFromPartnerInbox(inbox, existing = []) {
  const seen = new Set(
    (existing || []).map((r) => `${norm(r.company)}|${norm(r.title)}`),
  );
  const out = [];
  const items = inbox?.items || inbox?.submissions || [];
  for (const i of items) {
    if (i.status === 'rejected' || i.status === 'spam') continue;
    const formName = i.form || i.formName || '';
    if (!/hire|startup|partner|founders/i.test(formName)) continue;
    const raw = i.raw || i.data || {};
    const readiness = startupRoleReadiness(i);
    if (!readiness.matchReady) continue;
    const comp = String(raw['salary-range'] || raw.salaryRange || '').trim();
    const title = String(
      raw['role-title'] || raw.title || raw.role || raw.brief || raw['company-name'] || i.id || '',
    ).trim();
    if (!title) continue;
    const company = String(raw['company-name'] || raw.company || raw.org || '').trim();
    const key = `${norm(company)}|${norm(title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: i.id,
      title,
      company,
      source: 'inbox',
      real: !i.sample && !i.selftest,
      status: 'Active',
      stageType: raw.stage || raw['company-stage'] || undefined,
      skills: raw['stack-needs'] || raw.skills || undefined,
      outcome90d: raw['90day-outcome'] || raw.outcome90d || undefined,
      locationPref: raw['work-location'] || raw.workLocation || undefined,
      comp: comp || undefined,
    });
  }
  return out;
}

export function isMatchingReadyRole(role = {}) {
  const status = norm(role.status);
  return Boolean(
    role.id && role.title && (role.skills || role.stack || role['stack-needs'])
    && (role.outcome || role.outcome90d || role['90day-outcome'])
    && (role.comp || role['salary-range']) && (role.stageType || role.stage || role['company-stage'])
    && (status === 'active' || status === 'open')
  );
}

export function isSampleRole(role = {}) {
  return isSampleData(role);
}

export function isSampleCandidate(candidate = {}) {
  return isSampleData(candidate);
}

/** Board roles + funnel partner leads + partner WIZ inbox. Optional leadsDoc for tests. */
export function getStartupRoles(board, leadsDoc) {
  const boardRoles = (board?.roles || []).filter((r) => !r.pilot || r.status === 'Active');
  const doc = leadsDoc !== undefined ? leadsDoc : loadLeadsQuiet();
  const funnel = funnelRolesFromPartners(doc?.partners || [], boardRoles);
  let inboxRoles = [];
  try {
    const inbox = loadInbox ? loadInbox() : { items: [] };
    inboxRoles = rolesFromPartnerInbox(inbox, [...boardRoles, ...funnel]);
  } catch {
    /* */
  }
  return [...boardRoles, ...funnel, ...inboxRoles].filter(isMatchingReadyRole);
}

export function isMatchingReadyCandidate(item = {}) {
  const readiness = candidateProfileReadiness(item);
  return readiness.applicable && readiness.matchReady;
}

function getCandidates(inbox) {
  return (inbox.items || []).filter(isMatchingReadyCandidate);
}

export function suggestMatches(roleTitleOrId, { propose = false, limit = 5 } = {}) {
  // A blank query makes norm(title).includes(norm('')) true, so roles.find returns roles[0] (a sample
  // seed) and --propose would rank real candidates against it — the exact harm the "No roles[0] fallback"
  // guard below prevents. Reject blank up front (mirrors the no-role error shape).
  if (!norm(roleTitleOrId)) return { error: 'no role', query: roleTitleOrId };
  const board = loadBoard();
  const inbox = loadInbox ? loadInbox() : { items: [] };
  const roles = getStartupRoles(board);
  const cands = getCandidates(inbox);

  const role = roles.find(
    (r) =>
      r.id === roleTitleOrId ||
      norm(r.title).includes(norm(roleTitleOrId)) ||
      norm(r.company || '').includes(norm(roleTitleOrId)),
  );
  // No roles[0] fallback — that ranked real candidates against a sample seed
  if (!role) return { error: 'no role', query: roleTitleOrId };
  const companyEvidence = companyEvidenceForRole(role);

  const scored = cands.filter(c => !compensationConflict(role, c.raw || c)).map(c => ({
    candidate: c,
    score: scoreMatch(role, c.raw || c),
    evidence: matchEvidence(role, c.raw || c),
    id: c.id || extractEmail(c.raw || {}, c.form)
  })).sort((a,b) => b.score - a.score).slice(0, limit);

  const proposed = [];
  if (propose) {
    for (const m of scored) {
      if (!decideMatch(role, m.candidate.raw || m.candidate).match) continue;
      try {
        const pair = proposePair({
          roleId: role.id || role.title,
          candId: m.id,
          score: Math.min(1, (m.score || 0) / 100),
          reasons: ['suggest-matches', `score=${m.score}`, ...m.evidence],
          actor: 'matching-engine',
          sample: isSampleRole(role) || isSampleCandidate(m.candidate),
        });
        proposed.push({ pairId: pair.pairId, state: pair.state, score: m.score, candId: m.id });
      } catch (e) {
        proposed.push({ error: String(e.message || e), candId: m.id });
      }
    }
  }

  return { role, companyEvidence, matches: scored, proposed: propose ? proposed : undefined };
}

/**
 * Candidate-centric match: score one inbox submission against all startup roles.
 * Proposes pairs above threshold (sample:true for board seeds / non-real roles).
 */
export function proposeForCandidate(candId, { threshold = 60, propose = true } = {}) {
  const board = loadBoard();
  const inbox = loadInbox ? loadInbox() : { items: [] };
  const cand = (inbox.items || []).find(
    (i) => isMatchingReadyCandidate(i) && (i.id === candId || extractEmail(i.raw || {}, i.form) === candId),
  );
  if (!cand) return { ok: false, error: `submission not found: ${candId}` };
  const roles = getStartupRoles(board);
  const companySources = roles.some((role) => normalizeCompanyName(role.company))
    ? loadCompanyEvidenceSources()
    : null;
  const ranked = [];
  const proposed = [];
  for (const role of roles) {
    if (compensationConflict(role, cand.raw || cand)) continue;
    const score = scoreMatch(role, cand.raw || cand);
    if (score < threshold) continue;
    const evidence = matchEvidence(role, cand.raw || cand);
    ranked.push({
      roleId: role.id || role.title,
      title: role.title,
      score,
      evidence,
      companyEvidence: companySources
        ? resolveCompanyEvidence(
            role,
            companySources.map,
            companySources.ledger,
            undefined,
            companySources.research,
            companySources.researchCatalog,
          )
        : resolveCompanyEvidence(role),
    });
    if (!propose) continue;
    try {
      const pair = proposePair({
        roleId: role.id || role.title,
        candId: cand.id || candId,
        score: Math.min(1, score / 100),
        reasons: [`funnel-match score=${score}`, ...evidence],
        actor: 'funnel-match',
        sample: isSampleRole(role) || isSampleCandidate(cand),
      });
      proposed.push({ pairId: pair.pairId, roleId: pair.roleId, score, state: pair.state });
    } catch (e) {
      proposed.push({ error: String(e.message || e), roleId: role.id || role.title });
    }
  }
  return { ok: true, candId, ranked, proposed: propose ? proposed : undefined };
}

export function markStartupInterest(roleId, candidateId) {
  roleId = boundedStoreText(roleId); candidateId = boundedStoreText(candidateId);
  if (!roleId || !candidateId) return { ok: false, error: 'role and candidate are required' };
  const m = loadMatches();
  const key = `${roleId}:${candidateId}`;
  m.interests[key] = { ...(m.interests[key] || {}), startup: true, at: Date.now() };
  saveMatches(m);
  const pair = mirrorPairInterest(roleId, candidateId);
  return { ok: true, key, pairId: pair?.pairId || makePairId(roleId, candidateId), pair };
}

export function markCandidateOptin(candidateId, roleTitle) {
  candidateId = boundedStoreText(candidateId); roleTitle = boundedStoreText(roleTitle);
  if (!candidateId || !roleTitle) return { ok: false, error: 'candidate and role are required' };
  const m = loadMatches();
  const key = `${candidateId}:${norm(roleTitle)}`;
  m.interests[key] = { ...(m.interests[key] || {}), candidate: true, at: Date.now() };
  saveMatches(m);
  // roleTitle may be id or title — pairs ledger needs stable ids; use title slug as role key when unknown
  const pair = mirrorPairInterest(roleTitle, candidateId);
  return { ok: true, key, pairId: pair?.pairId || null, pair };
}

function findMutual() {
  const board = loadBoard();
  const inbox = loadInbox ? loadInbox() : { items: [] };
  const mutuals = [];

  // Canonical pair ledger only. Legacy interests have no current eligibility or consent receipt.
  for (const p of listPairs({ limit: 200 })) {
    if (p.state !== 'mutual_yes' || p.mutual?.founder !== true || p.mutual?.candidate !== true) continue;
    try {
      assertCurrentMutualPairEligibility(p, { pairKey: p.pairId });
      mutuals.push({ key: p.pairId, role: p.roleId, cand: p.candId, pair: p });
    } catch {
      /* stale/forged pairs are not mutual intro inputs */
    }
  }

  return mutuals
    .map((mu) => {
      const role = (board.roles || []).find((r) => r.id === mu.role || norm(r.title) === norm(mu.role));
      const cand = (inbox.items || []).find(
        (i) => (i.id || extractEmail(i.raw || {}, i.form)) === mu.cand,
      );
      return { role, candidate: cand, key: mu.key, pair: mu.pair || null };
    })
    .filter((x) => x.role || x.candidate || x.pair);
}

export function proposeIntro(roleOrId, candIdOrEmail) {
  roleOrId = boundedStoreText(roleOrId); candIdOrEmail = boundedStoreText(candIdOrEmail);
  if (!roleOrId || !candIdOrEmail) return { error: 'role and candidate are required' };
  const board = loadBoard();
  const matches = findMutual();
  const target = matches.find((mm) =>
    (mm.pair?.roleId === roleOrId || (mm.role && (mm.role.id === roleOrId || norm(mm.role.title) === norm(roleOrId))))
    && (mm.pair?.candId === candIdOrEmail || (mm.candidate && (mm.candidate.id === candIdOrEmail || extractEmail(mm.candidate.raw || {}, mm.candidate.form) === candIdOrEmail)))
  );

  if (!target) return { error: 'no mutual match found' };

  // Fable 2026-07-09: NEVER write board on mere proposal (appendPilot corrupted honesty).
  // Quarantine intro in matches store only; real receipts go through pilot-logger + honesty gate.
  const mm = loadMatches();
  mm.intros = mm.intros || [];
  const introRec = {
    at: new Date().toISOString(),
    role: target.role ? target.role.title : roleOrId,
    candidate: candIdOrEmail,
    status: 'proposed_quarantine',
    boardWrite: false,
    note: 'Proposal only — no board mutation until human pilot log'
  };
  mm.intros.push(introRec);
  saveMatches(mm);

  // Canonical pair ledger: proposal only. Consent must come from observed founder/candidate actions.
  let pair = null;
  try {
    const rid = target.role?.id || roleOrId;
    const cid = target.candidate?.id || candIdOrEmail;
    pair = proposePair({
      roleId: rid,
      candId: cid,
      reasons: ['propose-intro', 'matching-engine'],
      actor: 'matching-engine',
      sample: target.pair?.sample === true || isSampleRole(target.role) || isSampleCandidate(target.candidate),
    });
  } catch (e) {
    pair = { error: String(e.message || e) };
  }

  const notify = `potter@trydemigod.com will follow up with intro details for ${target.role ? target.role.title : ''} + candidate.`;

  return {
    ok: true,
    intro: target,
    receipt: null,
    notify,
    boardWrite: false,
    pairId: pair?.pairId || null,
    pairState: pair?.state || null,
    introDraftHint: pair?.pairId
      ? `node demigod-intro-draft.mjs ${pair.pairId}  # requires approved|mutual_yes or --force`
      : null,
  };
}

export function founderMatchSummary(match = {}) {
  return {
    candidateId: match.id || match.candidate?.id || 'candidate',
    score: Number(match.score) || 0,
    evidence: Array.isArray(match.evidence) ? match.evidence : [],
  };
}

export function logOutcome(introKey, outcome) {
  introKey = boundedStoreText(introKey); outcome = boundedStoreText(outcome, 240);
  if (!introKey || !outcome) return { ok: false, error: 'intro key and outcome are required' };
  // Track outcomes for learning + proof assets (hired? comp? = direct revenue signal)
  const mm = loadMatches();
  mm.outcomes = mm.outcomes || {};
  mm.outcomes[introKey] = { outcome, at: Date.now() };
  saveMatches(mm);
  return { ok: true, key: introKey, outcome };
}

function presentForStartup(roleTitleOrId) {
  const res = suggestMatches(roleTitleOrId);
  if (res.error) return res;
  console.log(`=== Matches for startup role: ${res.role.title} (${res.role.stageType}) ===`);
  console.log('Use: node demigod-matching-engine.mjs startup-interest --role-id=' + (res.role.id || res.role.title) + ' --candidate-id=CAND-ID');
  res.matches.forEach((m,i) => {
    const summary = founderMatchSummary(m);
    console.log(`${i+1}. score=${summary.score} | ${summary.candidateId}`);
    console.log(`   evidence: ${summary.evidence.join(' · ') || 'insufficient structured evidence'}`);
    console.log(`   To intro: mark interest then propose when mutual`);
  });
  return {ok:true};
}

function presentForCandidate(candidateIdOrEmail) {
  const board = loadBoard();
  const roles = getStartupRoles(board);
  console.log(`=== Open roles candidate ${candidateIdOrEmail} may opt into ===`);
  roles.forEach(r => {
    const sc = scoreMatch(r, { 'skills-stack': '' }); // placeholder
    console.log(`- ${r.title} (${r.stageType}) | use: candidate-optin --candidate-id=${candidateIdOrEmail} --role="${r.title}"`);
  });
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  if (cmd === 'suggest' || cmd === 'list') {
    const q = (args.find((a) => a.startsWith('--role=')) || '').slice(7) || args.slice(1).find((a) => !a.startsWith('--')) || '';
    const doPropose = args.includes('--propose');
    const res = suggestMatches(q, { propose: doPropose });
    console.log(JSON.stringify(res, null, 2));
    return;
  }
  if (cmd === 'propose-for-candidate' || cmd === 'for-candidate') {
    const candId = (args.find((a) => a.startsWith('--candidate-id=')) || '').slice(15) || args.slice(1).find((a) => !a.startsWith('--')) || '';
    const thr = Number((args.find((a) => a.startsWith('--threshold=')) || '--threshold=60').split('=')[1]);
    if (!candId || !Number.isFinite(thr) || thr < 0 || thr > 100) { console.error(JSON.stringify({ ok: false, error: 'candidate and threshold 0-100 are required' })); process.exitCode = 2; return; }
    const doPropose = args.includes('--propose');
    console.log(JSON.stringify(proposeForCandidate(candId, { threshold: thr, propose: doPropose }), null, 2));
    return;
  }
  if (cmd === 'startup-interest') {
    const roleId = (args.find(a=>a.startsWith('--role-id='))||'').split('=')[1] || args[1];
    const cand = (args.find(a=>a.startsWith('--candidate-id='))||'').split('=')[1] || args[2];
    console.log(markStartupInterest(roleId, cand));
    return;
  }
  if (cmd === 'candidate-optin') {
    const cand = (args.find(a=>a.startsWith('--candidate-id='))||'').split('=')[1] || args[1];
    const role = (args.find(a=>a.startsWith('--role='))||'').split('=')[1] || args[2];
    console.log(markCandidateOptin(cand, role));
    return;
  }
  if (cmd === 'mutual-intros' || cmd === 'mutuals') {
    console.log(JSON.stringify(findMutual(), null, 2));
    return;
  }
  if (cmd === 'propose-intro' || cmd === 'intro') {
    const role = (args.find(a=>a.startsWith('--role='))||'').split('=')[1] || args[1];
    const cand = (args.find(a=>a.startsWith('--candidate='))||'').split('=')[1] || args[2];
    console.log(proposeIntro(role, cand));
    return;
  }
  if (cmd === 'present-startup') {
    const q = args[1] || '';
    presentForStartup(q);
    return;
  }
  if (cmd === 'present-candidate') {
    const id = args[1] || '';
    presentForCandidate(id);
    return;
  }
  if (cmd === 'log-outcome') {
    const key = args[1] || '';
    const outcome = args[2] || '';
    console.log(logOutcome(key, outcome));
    return;
  }
  if (cmd === 'migrate-pairs' || cmd === 'migrate') {
    console.log(JSON.stringify(migrateLegacyMatchesToPairs(), null, 2));
    return;
  }

  console.log(`Demigod Matching Engine (for revenue + highest quality matches)
Commands:
  suggest "Product Manager"          # scored candidates (JSON)
  suggest --role="Product Manager" --propose  # write proposed pairs
  propose-for-candidate CAND-ID [--threshold=60] [--propose]  # rank-only unless explicit
  present-startup "Product Manager"  # rich cards + next actions
  present-candidate CAND-ID          # roles for opt-in
  startup-interest --role-id=xxx --candidate-id=yyy
  candidate-optin --candidate-id=yyy --role="Founding Designer"
  mutual-intros
  propose-intro --role=xxx --candidate=yyy
  migrate-pairs                      # legacy DEMIGOD-MATCHES → DEMIGOD-PAIRS
  log-outcome INTRO-KEY hired|not|comp-180k   # track for proof & learning
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export function decideMatch(role, candidate, threshold=60) {
  // Design: human in loop. Auto scores based on 90d (key per research), skills, stage.
  // Return {score, match: bool, reasons}. Human approves.
  const score = scoreMatch(role, candidate); // existing
  const reasons = matchEvidence(role, candidate);
  const match = !compensationConflict(role, candidate) && locationCompatible(role, candidate) && score >= threshold;
  return {score, match, reasons, state: match ? "matched" : "reviewed" /* human confirm */ };
}
