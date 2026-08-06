#!/usr/bin/env node
/**
 * Demigod Matching Engine (ops tool)
 * Organize submissions, compute potential matches, and present evidence for human review.
 *
 * Usage examples:
 *   node demigod-matching-engine.mjs suggest --role="Product Manager"
 * Honest: human review always; this surfaces evidence and writes only proposed pairs.
 */

import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard, loadInbox, extractEmail, scrubPII, clip, startupRoleReadiness, candidateProfileReadiness, candidateAvailabilityFreshness, currentCandidateSubmissions, isSampleData } from './demigod-submissions-lib.mjs';
import { readJson } from './demigod-agent-tools-lib.mjs';
import { projectCompanyResearch, refuseIfStale } from './demigod-evidence.mjs';
import { normalizeCompanyName } from './demigod-startup-atlas.mjs';
import { boardsFromMap, observedOpenDays } from './demigod-role-ledger.mjs';
import {
  assertCurrentPairEligibility,
  hasValidPairConsentReceipt,
  proposePair,
  listPairs,
} from './demigod-pairs-lib.mjs';
import { listAcceptedRoles } from './demigod-accepted-role.mjs';

const EVIDENCE_ROOT = process.env.DEMIGOD_ROOT || ROOT;
const STARTUP_MAP_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const ROLE_LEDGER_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const COMPANY_RESEARCH_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json');
const COMPANY_RESEARCH_CATALOG_PATH = path.join(EVIDENCE_ROOT, 'DEMIGOD-COMPANY-RESEARCH.json');

function norm(s) { return String(s || '').toLowerCase().trim(); }

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
  const clean = text.replace(/\d+(?:\.\d+)?\s*%/g, '').replace(/\+?\s*equity.*$/, '');
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
  const candidateEnvelope = candidate;
  candidate = candidate.raw || candidate.data || candidate;
  const roleTerms = new Set(skillTerms(role.skills || role['stack-needs']));
  const overlap = candidateFeatureTerms(candidate, candidate.skills || candidate['skills-stack']).filter((x) => roleTerms.has(x));
  const roleWorkTerms = new Set(skillTerms(roleMatchText(role)));
  const experienceTerms = candidateFeatureTerms(candidate, candidate.experience || candidate['background & highlights']);
  const firstResultTerms = new Set(skillTerms(role.outcome90d || role.outcome || role['90day-outcome']));
  const firstResultOverlap = experienceTerms.filter((x) => firstResultTerms.has(x));
  const workOverlap = experienceTerms.filter(
    (x) => roleWorkTerms.has(x) && !overlap.includes(x) && !firstResultOverlap.includes(x),
  );
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
  if (overlap.length) evidence.push(`self-reported skills: ${overlap.slice(0, 4).join(', ')}`);
  if (firstResultOverlap.length) evidence.push(`self-reported first-result overlap: ${firstResultOverlap.slice(0, 4).join(', ')}`);
  if (workOverlap.length) evidence.push(`self-reported experience overlap: ${workOverlap.slice(0, 4).join(', ')}`);
  if (/\b(sf|bay area|san francisco)\b/i.test(String(candidate['sf-bay'] || candidate.locationPref || ''))) evidence.push('SF Bay Area preference');
  if (roleLocation && candidateLocation) evidence.push(locationCompatible(role, candidate) ? 'work-location preferences align' : 'work-location alignment needs review');
  if (roleComp && candidateComp) evidence.push(compAligned(roleComp, candidateComp) ? 'compensation ranges overlap' : 'compensation alignment needs review');
  if (availabilityLabel) {
    const freshness = candidateAvailabilityFreshness(candidateEnvelope);
    if (!freshness.applicable) evidence.push(`availability stated: ${availabilityLabel}`);
    else if (freshness.current) evidence.push(`availability: ${availabilityLabel} · ${freshness.source} ${freshness.ageDays}d ago`);
    else evidence.push(`availability unconfirmed · last ${freshness.source} ${freshness.ageDays == null ? 'date unavailable' : `${freshness.ageDays}d ago`} — reconfirm before introduction`);
  }
  if (
    (role.outcome || role.outcome90d || role['90day-outcome']) &&
    candidateFeatureTerms(candidate, candidate.why || candidate['why-this-role'] || candidate['why-startups']).length
  ) evidence.push('self-reported motivation supplied');
  if (experienceTerms.length) evidence.push('self-reported experience supplied');
  return evidence;
}

// Events states (human-in-loop per EVENTS-FLOW.md): submitted -> reviewed(human) -> matched(human) -> introduced(human) -> piloted -> receipted -> invoiced(10% on hire) -> paid
export const MATCH_STATES = ['submitted','reviewed','matched','introduced','piloted','receipted','invoiced','paid'];

/* Why a score is what it is, component by component.
   scoreMatch returned a bare 0-100 and discarded the six terms that produced it, so a human
   reviewing a proposed pair saw "score=73" with no way to tell whether that was skills overlap
   or a location bonus — and no way to spot a score carried entirely by a weak proxy. The terms
   were already computed; only the total survived. Callers of scoreMatch are unchanged: it now
   sums this breakdown instead of accumulating a local.

   This also happens to be the record an automated-decision-system audit needs, which matters
   because Demigod scores candidates and California's FEHA ADS rules cover scoring even where a
   human makes the final call. Recording the basis is worth doing on the review-quality argument
   alone; the compliance posture is a consequence, not the justification. */
export function explainMatch(role, candidate) {
  const terms = [];
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
  const add = (name, points, detail) => { if (points > 0) terms.push({ name, points, detail }); };

  if (roleTerms.size && candidateTerms.length) {
    const shared = candidateTerms.filter((x) => roleTerms.has(x));
    add('skills-overlap', Math.min(55, shared.length * 18), `${shared.length} shared: ${shared.slice(0, 6).join(', ')}`);
  }
  if (cPref && (rStage.includes('seed') || rStage.includes('pre-seed'))) {
    const sf = cPref.includes('sf') || cPref.includes('bay');
    add('early-stage-location', sf ? 22 : 8, sf ? 'SF/Bay preference on an early-stage role' : 'non-SF preference');
  }
  if (rLocation && cPref && locationCompatible(role, candidate)) add('location-compatible', 12, cPref.slice(0, 60));
  if (rComp && (candidate['salary-range'] || candidate['salary-expectation'] || candidate.compExpect)) {
    const candComp = norm(candidate['salary-range'] || candidate['salary-expectation'] || candidate.compExpect);
    if (compAligned(rComp, candComp)) add('comp-aligned', 12, candComp.slice(0, 60));
  }
  if (cWhy.length && (rStage || roleTerms.size)) add('stated-motivation', 8, `${cWhy.length} terms`);
  if (candidateFeatureTerms(candidate, candidate.experience || candidate['background & highlights']).length) {
    add('experience-proxy', 8, 'experience text present');
  }

  const raw = terms.reduce((sum, t) => sum + t.points, 0);
  const score = Math.min(100, Math.round(raw));
  return { score, capped: raw > 100, terms };
}

function scoreMatch(role, candidate) {
  return explainMatch(role, candidate).score;
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
      id: i.featuredId || i.id,
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
  return currentCandidateSubmissions(inbox.items).filter(isMatchingReadyCandidate);
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
    evidence: matchEvidence(role, c),
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
/** Fail-closed: blank role/candidate never rank or mint pairs. */
export function proposeIntro(roleId, candId) {
  if (!String(roleId ?? '').trim() || !String(candId ?? '').trim()) {
    return { error: 'role and candidate required' };
  }
  // Role-scoped suggest only (no auto-consent). Blank queries already fail closed in suggestMatches.
  return suggestMatches(roleId, { propose: false });
}

export function proposeForCandidate(candId, { threshold = 60, propose = true } = {}) {
  const board = loadBoard();
  const inbox = loadInbox ? loadInbox() : { items: [] };
  const cand = getCandidates(inbox).find(
    (i) => i.id === candId || extractEmail(i.raw || {}, i.form) === candId,
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
    const evidence = matchEvidence(role, cand);
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

export function founderMatchSummary(match = {}) {
  return {
    candidateId: match.id || match.candidate?.id || 'candidate',
    score: Number(match.score) || 0,
    evidence: Array.isArray(match.evidence) ? match.evidence : [],
  };
}

function presentForStartup(roleTitleOrId) {
  const res = suggestMatches(roleTitleOrId);
  if (res.error) return res;
  console.log(`=== Matches for startup role: ${res.role.title} (${res.role.stageType}) ===`);
  console.log('To queue: rerun suggest with --propose, then review the proposed pair.');
  res.matches.forEach((m,i) => {
    const summary = founderMatchSummary(m);
    console.log(`${i+1}. score=${summary.score} | ${summary.candidateId}`);
    console.log(`   evidence: ${summary.evidence.join(' · ') || 'insufficient structured evidence'}`);
    console.log(`   To intro: human-review the pair, then record both observed consents`);
  });
  return {ok:true};
}

function presentForCandidate(candidateIdOrEmail) {
  const board = loadBoard();
  const inbox = loadInbox();
  const candidate = getCandidates(inbox).find(i =>
    i.id === candidateIdOrEmail || extractEmail(i.raw || {}, i.form) === candidateIdOrEmail);
  const candId = candidate?.id || candidateIdOrEmail;
  const roles = new Map(getStartupRoles(board).map(r => [String(r.id), r]));
  const acceptedRoles = new Map(
    listAcceptedRoles(board, inbox).acceptedRoles.map((role) => [String(role.roleId), role]),
  );
  const receipts = listPairs({ includeSample: true, limit: Number.MAX_SAFE_INTEGER })
    .filter(p => p.candId === candId && ['approved', 'mutual_yes'].includes(p.state))
    .filter(p => {
      if (p.sample !== false) return true;
      try { return assertCurrentPairEligibility(p, { pairKey: p.pairId, board, inbox }); }
      catch { return false; }
    })
    .map(p => ({
      pair: p,
      role: p.sample === false ? acceptedRoles.get(String(p.roleId)) : roles.get(String(p.roleId)),
    }))
    .filter(({ pair, role }) => role && (
      pair.sample !== false || hasValidPairConsentReceipt(pair, 'founder', role.roleTruthHash)
    ));
  console.log(`=== Role receipts for ${scrubPII(candidateIdOrEmail)} ===`);
  if (!receipts.length) console.log('No founder-authorized role receipt is waiting for this candidate.');
  receipts.forEach(({ pair, role: r }) => {
    const sample = pair.sample !== false || isSampleRole(r);
    const evidence = matchEvidence(r, candidate || {})
      .map((line) => clip(scrubPII(line), 256))
      .filter(Boolean);
    const openQuestions = evidence.filter((line) => /needs review/i.test(line));
    console.log(`- ${clip(scrubPII(r.title), 160)} (${clip(scrubPII(r.stageType), 80)})${sample ? ' · FICTIONAL SAMPLE' : ''}`);
    console.log(`  Pair: ${pair.pairId}`);
    if (!sample) {
      console.log(`  Company: ${clip(scrubPII(r.company), 160)}`);
      console.log(`  Role truth: ${r.roleTruthHash}`);
      console.log(`  Open role: confirmed ${String(r.openConfirmedAt).slice(0, 10)}`);
    }
    console.log(`  First result: ${clip(scrubPII(r.outcome90d || r.outcome || r['90day-outcome'] || 'not supplied'), 500)}`);
    console.log(`  Must-haves: ${clip(scrubPII(r.skills || r.stack || r['stack-needs'] || 'not supplied'), 500)}`);
    console.log(`  Constraints: ${clip(scrubPII(r.locationPref || r['work-location'] || 'work arrangement not supplied'), 160)} · ${clip(scrubPII(r.comp || r['salary-range'] || 'base salary not supplied'), 120)}`);
    console.log(`  Interview process: ${clip(scrubPII(r.interviewProcess || r['interview-process'] || 'not supplied'), 300)}`);
    console.log(`  Why this intro: ${evidence.join(' · ') || 'human review found potential fit; structured evidence is incomplete'}`);
    console.log(`  Open question: ${openQuestions.join(' · ') || 'What important constraint or missing evidence could make this a poor fit?'}`);
    console.log(`  Evidence source: role brief + your private profile · ${sample ? 'fictional demonstration' : 'human reviewed'}`);
    console.log('  Verification: Brief and profile are submitted by each side and human-reviewed for relevance; claims are not independently verified.');
    console.log('  Correction: Something wrong or missing? Correct it privately before deciding.');
    console.log(sample
      ? '  Fictional sample — no consent action.'
      : `  Candidate choice: YES lets Demigod share your identity and work profile with ${clip(scrubPII(r.company), 160)} for this exact role; PASS closes it privately. No explanation required.`);
  });
  return { ok: true, receipts: receipts.length };
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
  console.log(`Demigod Matching Engine
Commands:
  suggest "Product Manager"          # scored candidates (JSON)
  suggest --role="Product Manager" --propose  # write proposed pairs
  propose-for-candidate CAND-ID [--threshold=60] [--propose]  # rank-only unless explicit
  present-startup "Product Manager"  # rich cards + next actions
  present-candidate CAND-ID          # approved role receipt before candidate consent
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
