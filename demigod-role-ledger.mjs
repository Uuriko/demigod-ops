#!/usr/bin/env node
// Role first-seen ledger — tracks each SF-startup ATS role's lifetime (firstSeen → lastSeen → closed)
// so we can honestly say "this role has been observed open ≥ N days." Foundation for the role-truth
// tool + sharper Pulse findings.
//
// TWO HONESTY INVARIANTS (the whole point):
//   1. observedOpenDays uses firstSeen (OUR first observation) — never a board's date. A separate,
//      attributed postedDaysAgo carries the board's real posting date (Greenhouse first_published only).
//   2. A role is closed ONLY by a SUCCESSFUL board fetch that omits it. A failed/timed-out fetch
//      touches nothing — a flaky network must never manufacture "role closed".
//
//   node demigod-role-ledger.mjs poll        # fetch configured boards, upsert ledger (atomic, locked)
//   node demigod-role-ledger.mjs report [--days 30] [--fn engineering] [--json]
//   node demigod-role-ledger.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  categorizeRole,
  hasDeniedAtsBoard,
  isUsPostedLocation,
  sameWebsiteOwner,
} from './demigod-startup-jobs-enrich.mjs';
import {
  atomicWrite,
  withFileLock,
  isPlainObject,
  objectEntries,
  UNSAFE_INVISIBLE_CLASS,
} from './demigod-agent-tools-lib.mjs';
import { safeResearchUrl } from './demigod-evidence.mjs';
import { htmlToVisibleText } from './demigod-live-lib.mjs';
import {
  NEW_PROVIDERS,
  mapValidRoles,
  normalizeAtsJobId,
  normalizeAtsText,
} from './demigod-ats-providers.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const LEDGER = process.env.DEMIGOD_ROLE_LEDGER || path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const TARGETS = process.env.DEMIGOD_TARGETS || path.join(ROOT, 'DEMIGOD-TARGETS.json');
const SCHEMA = 'demigod.role-ledger/1';
const RETENTION_DAYS = 180;
// Volume-anomaly guard (data-observability "volume pillar"). A board fetch is rejected today only
// when the payload is MALFORMED; a well-formed but TRUNCATED response (pagination bug, rate limit,
// provider incident) is accepted as truth and can close hundreds of roles at once. Closure is a
// public claim, so a mass disappearance must persist before it lands.
// The absolute floor keeps every small board on the old immediate-close path — this targets mass
// closure only, never a company that genuinely closed its two openings.
const ANOMALY_MIN_PRIOR_OPEN = 10;
const ANOMALY_GRACE_DAYS = 2;
const TIMEOUT = 8000;
const CONCURRENCY = 12;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const roleKey = (provider, slug, jobId) => `${provider}|${slug}|${jobId}`;
const toDate = (x) => { if (x == null) return null; const d = typeof x === 'number' ? new Date(x) : new Date(String(x)); return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10); };
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isDay = (value) => typeof value === 'string' && toDate(value) === value;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const observedOpenDays = (row, today) => daysBetween(row.firstSeen, today);
// Attributed posting age — ONLY where the native field is a real posting date (Greenhouse first_published).
export const postedDaysAgo = (row, today) => (row.nativePostedAt && row.nativeDateField === 'first_published') ? daysBetween(row.nativePostedAt, today) : null;
/** Days since board last reported an update (Greenhouse updated_at). Not open-age. */
export const editedDaysAgo = (row, today) => (row.nativeUpdatedAt && isDay(row.nativeUpdatedAt) ? daysBetween(row.nativeUpdatedAt, today) : null);
/** Days from first_published → updated_at when both are real days (board-maintained signal). */
export const postedVsEditedDays = (row) => {
  if (!row?.nativePostedAt || !row?.nativeUpdatedAt || !isDay(row.nativePostedAt) || !isDay(row.nativeUpdatedAt)) return null;
  if (row.nativeDateField !== 'first_published') return null;
  return daysBetween(row.nativePostedAt, row.nativeUpdatedAt);
};

const clipAtsText = (value, max = 120) => {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
};

/**
 * Employer ATS fields already stored on a ledger row.
 * Dual clock: postedAt is the employer's first_published day only; firstObservedAt is ours.
 * Never copy firstObservedAt into postedAt. Ashby/Lever publishedAt/createdAt stay null.
 */
export function projectEmployerAtsFields(row = {}) {
  const nativeDateField = typeof row?.nativeDateField === 'string' && row.nativeDateField
    ? row.nativeDateField
    : null;
  const postedOk = nativeDateField === 'first_published' && isDay(row?.nativePostedAt);
  const nativePostedAt = postedOk ? row.nativePostedAt : null;
  return {
    employerDepartment: clipAtsText(row?.employerDepartment),
    employerOffice: clipAtsText(row?.employerOffice),
    workplaceType: clipAtsText(row?.workplaceType, 40),
    employmentType: clipAtsText(row?.employmentType, 60),
    nativeDeadline: isDay(row?.nativeDeadline) ? row.nativeDeadline : null,
    nativePostedAt,
    nativeDateField,
    nativeUpdatedAt: isDay(row?.nativeUpdatedAt) ? row.nativeUpdatedAt : null,
    postedAt: nativePostedAt,
    firstObservedAt: isDay(row?.firstSeen) ? row.firstSeen : null,
    postedVsEditedDays: postedVsEditedDays({
      nativePostedAt: row?.nativePostedAt,
      nativeUpdatedAt: row?.nativeUpdatedAt,
      nativeDateField,
    }),
  };
}

/** Requisition id is employer-freeform — abstain when not ID-shaped (Airbnb ONE/MULTI trap). */
export function classifyRequisitionId(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { requisitionId: null, requisitionSignal: null };
  const clipped = s.slice(0, 80);
  // Headcount / placeholder tokens — never count as distinct openings.
  if (/^(ONE|MULTI|MUL|TBD|N\/A|NA|NONE|NULL|UNKNOWN|-|—|–)$/i.test(clipped)) {
    return { requisitionId: clipped, requisitionSignal: 'abstain' };
  }
  if (clipped.length <= 2 && !/\d/.test(clipped)) {
    return { requisitionId: clipped, requisitionSignal: 'abstain' };
  }
  // ID-shaped: digits, or common ATS prefixes with structure.
  if (/\d/.test(clipped) || /^(JR|REQ|PIP|R-|ID[-_]?|#)/i.test(clipped)) {
    return { requisitionId: clipped, requisitionSignal: 'id' };
  }
  return { requisitionId: clipped, requisitionSignal: 'abstain' };
}

export function pickEmployerDepartment(job) {
  const depts = Array.isArray(job?.departments) ? job.departments : [];
  for (const d of depts) {
    const n = d?.name != null ? String(d.name).trim() : '';
    if (n) return n.slice(0, 120);
  }
  const meta = Array.isArray(job?.metadata) ? job.metadata : [];
  for (const m of meta) {
    if (/department/i.test(String(m?.name || '')) && m?.value != null && String(m.value).trim()) {
      return String(m.value).trim().slice(0, 120);
    }
  }
  return null;
}

export function pickEmployerOffice(job) {
  const offices = Array.isArray(job?.offices) ? job.offices : [];
  for (const o of offices) {
    const n = o?.name != null ? String(o.name).trim() : '';
    if (n) return n.slice(0, 120);
  }
  return null;
}

export function greenhouseEmployerFields(job) {
  const req = classifyRequisitionId(job?.requisition_id);
  const deadline = toDate(job?.application_deadline);
  return {
    ...req,
    employerDepartment: pickEmployerDepartment(job),
    employerOffice: pickEmployerOffice(job),
    nativeDeadline: deadline || null,
    employmentType: null,
    workplaceType: null,
  };
}


/** Structured employment type from public board fields only (never JD inference). */
export function pickEmploymentType(job, provider) {
  if (provider === 'Ashby') {
    const v = job?.employmentType != null ? String(job.employmentType).trim() : '';
    return v ? v.slice(0, 60) : null;
  }
  if (provider === 'Lever') {
    const v = job?.categories?.commitment || job?.commitment;
    const s = v != null ? String(v).trim() : '';
    return s ? s.slice(0, 60) : null;
  }
  return null;
}

export function pickWorkplaceType(job, provider) {
  if (provider === 'Ashby') {
    const v = job?.workplaceType != null ? String(job.workplaceType).trim() : '';
    if (v) return v.slice(0, 40);
    if (job?.isRemote === true) return 'Remote';
    return null;
  }
  if (provider === 'Lever') {
    const v = job?.workplaceType != null ? String(job.workplaceType).trim() : '';
    return v ? v.slice(0, 40) : null;
  }
  return null;
}

export function ashbyEmployerFields(job) {
  const dept = job?.department != null ? String(job.department).trim().slice(0, 120) : '';
  const team = job?.team != null ? String(job.team).trim().slice(0, 120) : '';
  return {
    requisitionId: null,
    requisitionSignal: null,
    employerDepartment: dept || team || null,
    employerOffice: typeof job?.location === 'string' ? String(job.location).trim().slice(0, 120) || null : null,
    nativeDeadline: null,
    employmentType: pickEmploymentType(job, 'Ashby'),
    workplaceType: pickWorkplaceType(job, 'Ashby'),
  };
}

export function leverEmployerFields(job) {
  const dept = job?.categories?.department || job?.categories?.team;
  const loc = job?.categories?.location || '';
  return {
    requisitionId: null,
    requisitionSignal: null,
    employerDepartment: dept != null && String(dept).trim() ? String(dept).trim().slice(0, 120) : null,
    employerOffice: loc ? String(loc).trim().slice(0, 120) : null,
    nativeDeadline: null,
    employmentType: pickEmploymentType(job, 'Lever'),
    workplaceType: pickWorkplaceType(job, 'Lever'),
  };
}


function loadLedger() {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const roles = ledger?.roles;
  if (
    ledger?.schema !== SCHEMA ||
    !isDay(ledger.updatedAt) ||
    !isRecord(roles) ||
    Object.entries(roles).some(([key, row]) =>
      !isRecord(row) ||
      !Object.hasOwn(POLLERS, row.provider) ||
      normalizeAtsJobId(row.slug) !== row.slug ||
      normalizeAtsJobId(row.jobId) !== row.jobId ||
      roleKey(row.provider, row.slug, row.jobId) !== key ||
      ['company', 'title', 'location', 'url', 'fn'].some((field) => typeof row[field] !== 'string') ||
      typeof row.usPosted !== 'boolean' ||
      !isDay(row.firstSeen) ||
      !isDay(row.lastSeen) ||
      row.firstSeen > row.lastSeen ||
      (row.closedAt !== null && (!isDay(row.closedAt) || row.closedAt < row.lastSeen)) ||
      !Number.isSafeInteger(row.reopenCount) ||
      row.reopenCount < 0 ||
      (row.nativePostedAt !== null && !isDay(row.nativePostedAt)) ||
      (row.nativeDateField !== null && typeof row.nativeDateField !== 'string')
    )
  ) throw new Error('invalid role ledger');
  return ledger;
}

export function extractAgencyPolicyEvidence(raw, url) {
  /* Apostrophes arrive three ways in a job description: literal U+2019, &#39;/&apos;, and
     &rsquo;/&#8217;. htmlToVisibleText only strips tags, and the entity list here handled nbsp
     and amp but not apostrophes — so "Agencies won&rsquo;t be paid" read as raw entity text and
     matched nothing. Decoding to the straight form is the same class of normalisation already
     applied to whitespace and ampersands; the source HTML is untouched, only the text being
     searched. The pattern below also accepts a literal U+2019 so an unencoded curly quote
     matches without relying on this decode. */
  const text = htmlToVisibleText(String(raw || ''))
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&(?:apos|#39|rsquo|#8217|lsquo|#8216);/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  // Positive-only: only flag when JD text explicitly rejects unsolicited agency submissions.
  // Never treat silence or "we use agencies" as evidence.
  const match = [
    /\b(?:we\s+)?(?:do|does|will)\s+not\s+accept\s+unsolicited\s+(?:agency|recruiter)\s+(?:resumes?|submissions?|applications?)\b/i,
    /\b(?:we\s+)?(?:do|does|will)\s+not\s+accept\s+unsolicited\s+(?:resumes?|submissions?|applications?)\s+from\s+(?:any\s+)?(?:recruiting|recruitment|staffing|employment|search)\s+(?:agencies|firms|companies|recruiters?)\b/i,
    /\bno\s+(?:third[- ]party\s+)?(?:agencies|agency recruiters?|recruiters?)\s+(?:please|submissions?)\b/i,
    /\b(?:agency|recruiter)\s+(?:submissions?|resumes?)\s+(?:are|will be)\s+not\s+accepted\b/i,
    /\bunsolicited\s+(?:agency|recruiter)\s+(?:resumes?|submissions?)\s+(?:are|will be)\s+(?:not\s+)?(?:accepted|considered)\b/i,
    /\bplease\s+do\s+not\s+contact\s+(?:us\s+)?(?:via|through|with)\s+(?:an?\s+)?(?:agency|recruiter|staffing)\b/i,
    /\bagencies?\s+(?:will\s+not|won['\u2019]t)\s+be\s+(?:paid|compensated|accepted)\b/i,
    /\bno\s+(?:fee|placement)\s+(?:agency|recruiter)\s+(?:calls|emails|submissions?)\b/i,
    /\bdirect\s+applicants?\s+only\b[^.!?]{0,40}\b(?:agency|recruiter)\b/i,
    /\b(?:we\s+)?(?:do|does|will)\s+not\s+work\s+with\s+(?:outside\s+)?(?:agencies|recruiters|staffing firms)\b/i,
  ].map((pattern) => text.match(pattern)?.[0]).find(Boolean);
  const evidenceUrl = safeResearchUrl(url);
  // Export contract caps evidence quotes at 20 tokens.
  if (!match || !evidenceUrl || match.split(/\s+/).length > 20) return null;
  return {
    value: 'no_unsolicited_agency_submissions',
    status: 'supported',
    quote: match,
    url: evidenceUrl,
  };
}

function normalizeAgencyPolicyEvidence(value) {
  if (
    value?.value !== 'no_unsolicited_agency_submissions' ||
    value?.status !== 'supported'
  ) return null;
  return extractAgencyPolicyEvidence(value.quote, value.url);
}

// ---- core: pure, deterministic given `today`; no clock, no network. All honesty logic lives here. ----
export function upsertLedger(prev, polledBoards, today, { onVolumeAnomaly = null } = {}) {
  const next = {};
  // Only a plain object of roles carries forward. A corrupt SoR whose `roles` is a string or array
  // spreads through Object.entries as index-keyed junk ("0", "1", …) and injects fabricated rows into
  // a ledger whose entire purpose is honest role observation. Found by an independent poison pass,
  // 2026-07-30 — same loose-input class as the three other malformed-input defects found today.
  for (const [k, v] of objectEntries(prev?.roles)) {
    if (isPlainObject(v)) next[k] = { ...v };
  }
  // Pass 1: upsert all polled roles; accumulate seen keys PER board-prefix, UNIONED across duplicate
  // board entries in one poll (a slug collision emitting the same prefix twice) — so an empty board
  // can't close a role that a sibling board with the same prefix populated in the same poll (no flap).
  const seenByPrefix = new Map(); // prefix → Set(roleKey); only prefixes fetched ok appear here
  for (const board of polledBoards || []) {
    const provider =
      typeof board?.provider === 'string' && Object.hasOwn(POLLERS, board.provider)
        ? board.provider
        : '';
    const slug = typeof board?.slug === 'string' ? normalizeAtsJobId(board.slug) : '';
    const company = normalizeAtsText(board?.company, 300);
    const website = normalizeAtsText(board?.website, 2048);
    const roles = Array.isArray(board?.roles) ? mapValidRoles(board.roles, (role) => role) : null;
    if (
      !board?.ok ||
      !provider ||
      !slug ||
      company == null ||
      website == null ||
      !roles
    ) continue; // INVARIANT 2: a failed/malformed fetch closes nothing, touches nothing.
    const normalizedBoard = { provider, slug, company, website };
    const prefix = `${provider}|${slug}|`;
    let seen = seenByPrefix.get(prefix);
    if (!seen) seenByPrefix.set(prefix, (seen = new Set()));
    for (const r of roles) {
      const jobId = normalizeAtsJobId(r.jobId);
      const key = roleKey(provider, slug, jobId);
      if (seen.has(key)) continue;
      seen.add(key);
      const ex = next[key];
      const rawUrl = r.url == null ? '' : String(r.url).trim();
      const roleUrl = ownedRoleUrl(rawUrl, normalizedBoard, jobId);
      const disp = { title: r.title || '', location: r.location || '', url: roleUrl };
      const policy = normalizeAgencyPolicyEvidence(r.agencyPolicyEvidence);
      const agencyPolicyEvidence = policy?.url === roleUrl ? policy : null;
      if (!ex) {
        next[key] = {
          provider, slug, jobId,
          company, ...disp,
          fn: categorizeRole(disp.title), usPosted: isUsPostedLocation(disp.location),
          firstSeen: today, lastSeen: today, closedAt: null, reopenCount: 0,
          nativePostedAt: r.nativePostedAt || null, nativeDateField: r.nativeDateField || null,
          // updated_at is a *current* board claim (refresh each poll); not a firstSeen floor.
          nativeUpdatedAt: r.nativeUpdatedAt || null,
          nativeUpdatedField: r.nativeUpdatedAt ? (r.nativeUpdatedField || 'updated_at') : null,
          agencyPolicyEvidence,
          requisitionId: r.requisitionId || null,
          requisitionSignal: r.requisitionSignal || null,
          employerDepartment: r.employerDepartment || null,
          employerOffice: r.employerOffice || null,
          nativeDeadline: r.nativeDeadline || null,
          employmentType: r.employmentType || null,
          workplaceType: r.workplaceType || null,
        };
      } else {
        if (ex.closedAt) { ex.closedAt = null; ex.reopenCount = (ex.reopenCount || 0) + 1; } // reopened
        ex.lastSeen = today; // firstSeen is MONOTONIC — never touched (INVARIANT 1)
        if (company) ex.company = company;
        if (!ex.nativePostedAt && r.nativePostedAt) { ex.nativePostedAt = r.nativePostedAt; ex.nativeDateField = r.nativeDateField || null; } // backfill only; never overwrite the earliest captured date
        else if (
          ex.nativePostedAt && r.nativePostedAt &&
          // Compare against what the board LAST said, not against our stored floor. Comparing to
          // the floor re-counts on every poll forever once a date has been recycled once.
          r.nativePostedAt !== (ex.lastReportedPostedAt || ex.nativePostedAt)
        ) {
          // The board now reports a DIFFERENT posting date for a role we already track. ATS
          // platforms auto-renew listings on a 30-90 day cycle, so a recycled date is expected —
          // and the stored date deliberately does not move, which keeps our posting ages an honest
          // LOWER BOUND. But silently discarding the change means we can never answer how often
          // boards recycle dates, and that number decides whether the public median-posting-age
          // claim needs qualifying. Count it instead. Absent field = no change ever observed.
          ex.postedDateChangeCount = (Number(ex.postedDateChangeCount) || 0) + 1;
        }
        // Track the board's current answer so the next poll compares like with like. The gap
        // between this and nativePostedAt IS the renewal evidence: floor vs what the board claims.
        if (r.nativePostedAt && r.nativePostedAt !== ex.nativePostedAt) ex.lastReportedPostedAt = r.nativePostedAt;
        // Refresh board-reported update day every successful poll (not a monotonic floor).
        if (r.nativeUpdatedAt) {
          ex.nativeUpdatedAt = r.nativeUpdatedAt;
          ex.nativeUpdatedField = r.nativeUpdatedField || 'updated_at';
        }
        // Employer-declared GH fields refresh each successful poll (current board claim).
        if (r.requisitionSignal) {
          ex.requisitionId = r.requisitionId || null;
          ex.requisitionSignal = r.requisitionSignal;
        }
        if (r.employerDepartment) ex.employerDepartment = r.employerDepartment;
        if (r.employerOffice) ex.employerOffice = r.employerOffice;
        if (r.nativeDeadline) ex.nativeDeadline = r.nativeDeadline;
        if (r.employmentType) ex.employmentType = r.employmentType;
        if (r.workplaceType) ex.workplaceType = r.workplaceType;
        if (disp.title) ex.title = disp.title;
        if (disp.location) { ex.location = disp.location; ex.usPosted = isUsPostedLocation(disp.location); }
        if (rawUrl) ex.url = disp.url;
        ex.fn = categorizeRole(ex.title);
        ex.agencyPolicyEvidence = agencyPolicyEvidence;
      }
    }
  }
  // Pass 2: ONE scan (O(roles), not O(boards×roles)) — close an open role iff its board was fetched ok
  // this poll (its prefix is present) and the role wasn't among the seen keys.
  const missingByPrefix = new Map();
  for (const [key, row] of Object.entries(next)) {
    if (row.closedAt) continue;
    const prefix = key.slice(0, key.lastIndexOf('|') + 1);
    const seen = seenByPrefix.get(prefix);
    if (!seen || seen.has(key)) continue;
    let list = missingByPrefix.get(prefix);
    if (!list) missingByPrefix.set(prefix, (list = []));
    list.push(row);
  }
  for (const [prefix, missing] of missingByPrefix) {
    const present = seenByPrefix.get(prefix).size;
    const priorOpen = present + missing.length;
    // More than half of a non-trivial board vanished in one poll: treat the RESPONSE as suspect,
    // not the roles as closed. Held roles keep their old lastSeen, so a drop that is real closes
    // on a later poll once it has persisted — no state added, no role field added (the row key
    // allowlist is enforced elsewhere and must stay exact).
    const anomalous = priorOpen >= ANOMALY_MIN_PRIOR_OPEN && missing.length * 2 > priorOpen;
    let held = 0;
    for (const row of missing) {
      if (anomalous && daysBetween(row.lastSeen, today) < ANOMALY_GRACE_DAYS) { held += 1; continue; }
      row.closedAt = today;
    }
    // No silent caps: a caller that cares is told exactly what was withheld and why.
    if (held && typeof onVolumeAnomaly === 'function') {
      const [provider, slug] = prefix.split('|');
      onVolumeAnomaly({ provider, slug, priorOpen, present, missing: missing.length, held });
    }
  }
  // Freshness means at least one valid board observation, not merely that a poll was attempted.
  return { schema: SCHEMA, updatedAt: seenByPrefix.size ? today : (prev?.updatedAt || today), roles: next };
}

// Drop long-closed roles (log the count — no silent caps).
export function pruneClosed(ledger, today, retentionDays = RETENTION_DAYS) {
  const roles = {}; let pruned = 0;
  for (const [k, r] of Object.entries(ledger.roles || {})) {
    if (r.closedAt && daysBetween(r.closedAt, today) > retentionDays) { pruned++; continue; }
    roles[k] = r;
  }
  return { ledger: { ...ledger, roles }, pruned };
}

export function summarize(ledger, today) {
  const rows = Object.values(ledger.roles || {});
  const open = rows.filter((r) => !r.closedAt);
  return {
    total: rows.length, open: open.length,
    closedToday: rows.filter((r) => r.closedAt === today).length,
    aging30: open.filter((r) => observedOpenDays(r, today) >= 30).length,
    aging60: open.filter((r) => observedOpenDays(r, today) >= 60).length,
    // Open roles whose board has recycled the posting date since we first captured it. Our stored
    // date never moves, so posting ages are a LOWER bound; this number says how much that matters.
    // A counter nobody surfaces is invisible, and this one decides whether the public
    // median-posting-age claim needs qualifying.
    postedDateRecycled: open.filter((r) => (r.postedDateChangeCount || 0) > 0).length,
    // Greenhouse updated_at cohort (board-edit signal; not observed open age).
    withUpdatedAt: open.filter((r) => r.nativeUpdatedAt).length,
    editedAfterPost: open.filter((r) => {
      const d = postedVsEditedDays(r);
      return d != null && d > 0;
    }).length,
    // Employer-declared GH enrich (public board).
    withEmployerDepartment: open.filter((r) => r.employerDepartment).length,
    withEmployerOffice: open.filter((r) => r.employerOffice).length,
    requisitionIdShaped: open.filter((r) => r.requisitionSignal === 'id').length,
    requisitionAbstain: open.filter((r) => r.requisitionSignal === 'abstain').length,
  };
}

export function summarizeProviderPoll(polled = []) {
  const providers = {};
  for (const row of polled) {
    const provider = String(row?.provider || '').trim();
    if (!provider) continue;
    const summary = providers[provider] ||= { boards: 0, ok: 0, failed: 0, roles: 0 };
    summary.boards++;
    if (row.ok) {
      summary.ok++;
      summary.roles += Array.isArray(row.roles) ? row.roles.length : 0;
    } else {
      summary.failed++;
    }
  }
  return Object.fromEntries(Object.entries(providers).sort(([a], [b]) => a.localeCompare(b)));
}

export const pollHasCoverage = (boardCount, okFetches) => boardCount === 0 || okFetches > 0;

// basis 'observed' = our first-seen age (accrues over daily polls; the conservative headline metric).
// basis 'posted'   = the board's own posting date, ATTRIBUTED, Greenhouse first_published only —
//   usable day 1. Roles older than evergreenDays (likely perennial talent-pool posts, not stuck
//   vacancies) are excluded from the aging list and counted separately, honestly.
export function report(ledger, { days = 30, fn = '', usOnly = true, today, basis = 'observed', evergreenDays = 365 } = {}) {
  const ageOf = (r) => (basis === 'posted' ? postedDaysAgo(r, today) : observedOpenDays(r, today));
  let rows = Object.values(ledger.roles || {})
    .filter((r) => !r.closedAt)
    .filter((r) => (usOnly ? r.usPosted : true))
    .filter((r) => (fn ? r.fn === fn : true))
    .map((r) => ({
      ...r,
      observedOpenDays: observedOpenDays(r, today),
      postedDaysAgo: postedDaysAgo(r, today),
      editedDaysAgo: editedDaysAgo(r, today),
      postedVsEditedDays: postedVsEditedDays(r),
      age: ageOf(r),
    }))
    .filter((r) => r.age != null && r.age >= days);
  let evergreen = 0;
  if (basis === 'posted') { const keep = rows.filter((r) => r.age <= evergreenDays); evergreen = rows.length - keep.length; rows = keep; }
  rows.sort((a, b) => b.age - a.age);
  const openAll = Object.values(ledger.roles || {}).filter((r) => !r.closedAt && (usOnly ? r.usPosted : true));
  const ghost = openAll.length ? Math.round((100 * openAll.filter((r) => observedOpenDays(r, today) >= 60).length) / openAll.length) : 0;
  const byFn = {}; for (const r of rows) byFn[r.fn] = (byFn[r.fn] || 0) + 1;
  // Long-posted but recently board-edited (maintained stale) — Greenhouse first_published + updated_at only.
  const maintainedStale = openAll
    .map((r) => ({
      company: r.company,
      title: r.title,
      postedDaysAgo: postedDaysAgo(r, today),
      editedDaysAgo: editedDaysAgo(r, today),
      url: r.url,
    }))
    .filter((r) => r.postedDaysAgo != null && r.postedDaysAgo >= 90 && r.editedDaysAgo != null && r.editedDaysAgo <= 14)
    .sort((a, b) => b.postedDaysAgo - a.postedDaysAgo)
    .slice(0, 12);
  return {
    agingRoles: rows,
    openUsRoles: openAll.length,
    ghostRatePct: ghost,
    byFunction: byFn,
    days,
    basis,
    evergreenExcluded: evergreen,
    maintainedStale,
  };
}

// ---- board fetch (I/O; ok:true ONLY on a valid parsed job array, else ok:false → closes nothing) ----
async function fetchJson(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
// SmartRecruiters/Workable/Recruitee/Personio come from the shared module; the original 3 are inline.
const PATH_ATS_HOSTS = {
  Greenhouse: ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'job-boards.eu.greenhouse.io'],
  Lever: ['jobs.lever.co'],
  Ashby: ['jobs.ashbyhq.com'],
  SmartRecruiters: ['jobs.smartrecruiters.com'],
  Workable: ['apply.workable.com'],
};
const SUBDOMAIN_ATS = {
  Recruitee: '.recruitee.com',
  Personio: '.jobs.personio.de',
};

function ownedRoleUrl(value, board, jobId) {
  try {
    const raw = String(value || '').trim();
    const safe = safeResearchUrl(raw);
    const url = safe ? new URL(safe) : null;
    const authority = /^https?:\/\/([^/?#]+)/i.exec(raw)?.[1]?.toLowerCase();
    if (!url || authority !== url.hostname) return '';
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const provider = board.provider;
    const slug = String(board.slug);
    if (
      provider === 'Greenhouse' &&
      PATH_ATS_HOSTS.Greenhouse.includes(url.hostname) &&
      parts[0] === slug &&
      parts[1] === 'jobs' &&
      parts[2] === jobId
    ) return safe;
    if (
      ['Lever', 'Ashby'].includes(provider) &&
      PATH_ATS_HOSTS[provider].includes(url.hostname) &&
      parts[0] === slug &&
      parts[1] === jobId
    ) return safe;
    if (
      provider === 'SmartRecruiters' &&
      PATH_ATS_HOSTS.SmartRecruiters.includes(url.hostname) &&
      parts[0] === slug &&
      (parts[1] === jobId || parts[1]?.startsWith(`${jobId}-`))
    ) return safe;
    if (
      provider === 'Workable' &&
      PATH_ATS_HOSTS.Workable.includes(url.hostname) &&
      (
        (parts[0] === 'j' && parts[1] === jobId) ||
        (parts[0] === slug && parts[1] === 'j' && parts[2] === jobId)
      )
    ) return safe;
    if (
      provider === 'Recruitee' &&
      url.hostname === `${slug}.recruitee.com`.toLowerCase() &&
      parts[0] === 'o' &&
      parts[1]
    ) return safe;
    if (
      provider === 'Personio' &&
      url.hostname === `${slug}.jobs.personio.de`.toLowerCase() &&
      parts[0] === 'job' &&
      parts[1] === jobId
    ) return safe;
    if (
      provider === 'Greenhouse' &&
      url.hostname === 'app.careerpuck.com' &&
      parts[0] === 'job-board' &&
      parts[1] === slug &&
      parts[2] === 'job' &&
      parts[3] === jobId
    ) return safe;
    const values = [...parts, ...url.searchParams.values()];
    return (
      parts.length > 0 &&
      sameWebsiteOwner(board.website, safe) &&
      (provider === 'Recruitee' || values.includes(jobId))
    ) ? safe : '';
  } catch {
    return '';
  }
}

export const POLLERS = {
  ...NEW_PROVIDERS,
  Greenhouse: async (slug) => {
    const d = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
    if (!d || !Array.isArray(d.jobs)) return { ok: false, roles: [] };
    const roles = mapValidRoles(d.jobs, (j) => ({
      jobId: normalizeAtsJobId(j.id),
      title: j.title || '',
      location: j.location?.name || '',
      url: j.absolute_url || '',
      nativePostedAt: toDate(j.first_published),
      nativeDateField: 'first_published',
      // Board-edit clock (not open-age). List endpoint includes updated_at when content=true.
      nativeUpdatedAt: toDate(j.updated_at),
      nativeUpdatedField: j.updated_at ? 'updated_at' : null,
      agencyPolicyEvidence: extractAgencyPolicyEvidence(j.content, j.absolute_url),
      // Employer-declared GH fields (public board bytes only).
      ...greenhouseEmployerFields(j),
    }));
    return { ok: Boolean(roles), roles: roles || [] };
  },
  Lever: async (slug) => {
    const d = await fetchJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!Array.isArray(d)) return { ok: false, roles: [] };
    const roles = mapValidRoles(d, (p) => ({
      jobId: normalizeAtsJobId(p.id),
      title: p.text || '',
      location: p.categories?.location || '',
      url: p.hostedUrl || '',
      nativePostedAt: toDate(p.createdAt),
      nativeDateField: 'createdAt',
      agencyPolicyEvidence: extractAgencyPolicyEvidence(
        [p.descriptionPlain, p.additionalPlain, ...(p.lists || []).map((item) => item?.content)].join(' '),
        p.hostedUrl,
      ),
      ...leverEmployerFields(p),
    }));
    return { ok: Boolean(roles), roles: roles || [] };
  },
  Ashby: async (slug) => {
    const d = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    if (!d || !Array.isArray(d.jobs)) return { ok: false, roles: [] };
    const roles = mapValidRoles(d.jobs, (j) => ({
      jobId: normalizeAtsJobId(j.id),
      title: j.title || '',
      location: typeof j.location === 'string' ? j.location : '',
      url: j.jobUrl || '',
      nativePostedAt: toDate(j.publishedAt),
      nativeDateField: 'publishedAt',
      agencyPolicyEvidence: extractAgencyPolicyEvidence(
        j.descriptionPlain || j.descriptionHtml || j.description,
        j.jobUrl,
      ),
      ...ashbyEmployerFields(j),
    }));
    return { ok: Boolean(roles), roles: roles || [] };
  },
};

/** Map company → {provider, slug, company} for exact ledger joins (no fuzzy name match). */
export function boardFromCompany(company) {
  if (!company?.atsSource || !company.jobsUrl || !POLLERS[company.atsSource]) return null;
  try {
    const raw = String(company.jobsUrl).trim();
    const url = new URL(raw);
    const authority = /^https:\/\/([^/?#]+)/i.exec(raw)?.[1]?.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      authority !== url.hostname ||
      url.search ||
      url.hash
    ) return null;
    const suffix = SUBDOMAIN_ATS[company.atsSource];
    let slug;
    if (suffix) {
      if (url.pathname !== '/' || !url.hostname.endsWith(suffix)) return null;
      slug = url.hostname.slice(0, -suffix.length);
      if (slug.includes('.')) return null;
    } else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (!PATH_ATS_HOSTS[company.atsSource]?.includes(url.hostname) || parts.length !== 1) {
        return null;
      }
      [slug] = parts;
    }
    return /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(slug)
      ? { provider: company.atsSource, slug, company: company.name || '' }
      : null;
  } catch {
    return null;
  }
}

export function boardsFromMap(map) {
  return (map?.companies || [])
    .filter((company) => !hasDeniedAtsBoard(company))
    .map((company) => {
      const board = boardFromCompany(company);
      return board ? { ...board, website: company.website || '' } : null;
    })
    .filter(Boolean);
}

export function purgeDeniedLedgerRows(ledger, map, today) {
  const prefixes = new Set(
    (map?.companies || [])
      .filter(hasDeniedAtsBoard)
      .map(boardFromCompany)
      .filter(Boolean)
      .map((board) => `${board.provider}|${board.slug}|`),
  );
  const roles = {};
  let removed = 0;
  for (const [key, row] of Object.entries(ledger?.roles || {})) {
    if (prefixes.has(key.slice(0, key.lastIndexOf('|') + 1))) {
      removed++;
      continue;
    }
    roles[key] = row;
  }
  return {
    ledger: { ...(ledger || {}), schema: ledger?.schema || SCHEMA, updatedAt: removed ? today : ledger?.updatedAt || today, roles },
    removed,
    prefixes: [...prefixes],
  };
}

async function pool(items, worker) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); } }));
  return out;
}

// ---- selftest: each honesty invariant proven fail-capable (broken control must flip the result) ----
export const TARGET_STATES = ['observed', 'reviewing', 'ruled-out', 'contacted'];
const UNSAFE_NOTE = new RegExp('[\\u0000-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']');

/**
 * Missing file -> empty store (first run). Present but unparseable -> REFUSE.
 * Swallowing a parse error would let the next merge overwrite a human's triage with a fresh
 * derivation and report success. After 2026-08-02 the standing rule is never to silently discard
 * a file that holds human work.
 */
/** Company context for display only, from the public startup map. Never persisted into the store. */
export function companyContext(mapFile = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json')) {
  try {
    const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    const out = {};
    for (const c of map.companies || []) {
      const k = companyKeyFor(c.name);
      if (!k || out[k]) continue;
      out[k] = { description: c.description || null, website: c.website || null, teamSize: c.teamSize ?? null,
                 stage: c.stage || null, jobsUrl: c.jobsUrl || null, sourceLicense: c.sourceLicense || null };
    }
    return out;
  } catch { return {}; }
}

/** Same normalisation the startup screen uses, so a target row and a map row agree on identity. */
export function companyKeyFor(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function loadTargets(file = TARGETS) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) {
    if (e.code === 'ENOENT') return { schema: 'demigod.targets/1', companies: {} };
    throw e;
  }
  let d;
  try { d = JSON.parse(raw); }
  catch (e) { throw new Error(`targets_store_unreadable: ${file} is present but not valid JSON (${e.message}) — fix or move it; refusing to overwrite human triage`); }
  if (!d || typeof d !== 'object' || !d.companies || typeof d.companies !== 'object') {
    throw new Error(`targets_store_invalid: ${file} has no companies object — refusing to overwrite human triage`);
  }
  /* Migrate legacy keys. The store was first written with `trim().toLowerCase()`, which keeps
     spaces, while companyContext keys on alphanumerics only — so "general proximity" and
     "generalproximity" were two identities for one company and --detail could not join them.
     Rekey in place, preserving any human state/note, rather than orphaning triage. */
  const migrated = {};
  let changed = false;
  for (const [k, v] of Object.entries(d.companies)) {
    const canon = companyKeyFor(v.company || k);
    if (canon !== k) changed = true;
    migrated[canon] = migrated[canon] ? { ...migrated[canon], ...v } : v;
  }
  return changed ? { ...d, companies: migrated } : d;
}

/**
 * PURE. Record a human's judgement about one company. Touches state/note/stateSetAt ONLY —
 * observation fields stay derived, so the store never becomes two sources of truth.
 * `contacted` is a human asserting something that happened outside this tool; nothing here infers it.
 */
export function setTargetState(store, company, { state, note, at }) {
  const key = companyKeyFor(company);
  const existing = store.companies && store.companies[key];
  if (!existing) {
    const near = Object.keys(store.companies || {}).filter((k) => k.includes(key.slice(0, 4)) && key).slice(0, 3);
    throw new Error(`target_unknown: no company "${company}" in the store${near.length ? ` — did you mean ${near.join(', ')}?` : ''}`);
  }
  if (!TARGET_STATES.includes(state)) {
    throw new Error(`target_state_invalid: "${state}" — allowed: ${TARGET_STATES.join(', ')}`);
  }
  if (note != null) {
    const t = String(note);
    if (t.length > 400 || UNSAFE_NOTE.test(t)) throw new Error('target_note_invalid: max 400 chars, no control characters');
  }
  return {
    ...store,
    companies: {
      ...store.companies,
      [key]: { ...existing, state, stateSetAt: at, ...(note != null ? { note: String(note) } : {}) },
    },
  };
}

/**
 * PURE. Fold today's aging-startup rows into the durable store.
 *
 * Rules that make this safe to re-run:
 *  - a human's `state` and `note` are NEVER overwritten; only observation fields refresh
 *  - a company that drops out of the ledger is NOT deleted — it is stamped noLongerAgingAt,
 *    because disappearing from the list is information, not an absence
 *  - `state` starts at 'observed' and this function can never set anything else: no outbound has
 *    happened, and nothing here may imply one has
 *  - no contact is invented. The ledger has company, title, url and dates — no person, no email.
 */
export function mergeTargets(store, rows, today) {
  const out = { schema: 'demigod.targets/1', updatedAt: today, companies: { ...(store.companies || {}) } };
  const seen = new Set();
  for (const r of rows) {
    const key = companyKeyFor(r.company);
    if (!key) continue;
    seen.add(key);
    const prev = out.companies[key] || {};
    out.companies[key] = {
      company: r.company,
      // Observation — refreshed every run.
      agingRoleCount: rows.filter((x) => companyKeyFor(x.company) === key).length,
      oldestRoleDays: Math.max(...rows.filter((x) => companyKeyFor(x.company) === key).map((x) => x.age)),
      sampleRoleTitle: r.title || null,
      sampleRoleUrl: r.url || null,
      provider: r.provider || null,
      firstSeenOnList: prev.firstSeenOnList || today,
      lastSeenOnList: today,
      noLongerAgingAt: null,
      // Human judgement — preserved across runs, never set by this function.
      state: prev.state || 'observed',
      note: prev.note || null,
      /* stateSetAt must survive too. The merge rebuilds each row from a fixed field list, so
         omitting this silently dropped the date a human set their verdict — and a "contacted"
         with no date is exactly the stale claim the field exists to expose. */
      stateSetAt: prev.stateSetAt || null,
    };
  }
  for (const [key, c] of Object.entries(out.companies)) {
    if (!seen.has(key) && !c.noLongerAgingAt) out.companies[key] = { ...c, noLongerAgingAt: today };
  }
  return out;
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const T0 = '2026-07-01', T1 = '2026-07-20';
  const board = (ok, roles) => [{ provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok, roles }];
  const R = (jobId, extra = {}) => ({ jobId, title: 'Senior Backend Engineer', location: 'San Francisco, CA', url: '', ...extra });
  const agencyPolicyEvidence = extractAgencyPolicyEvidence(
    '<p>We do not accept unsolicited resumes from staffing agencies.</p>',
    'https://boards.greenhouse.io/acme/jobs/policy',
  );
  assert(
    agencyPolicyEvidence?.status === 'supported' &&
      agencyPolicyEvidence.quote === 'We do not accept unsolicited resumes from staffing agencies',
    'explicit no-agency clause becomes bounded evidence',
  );
  assert(
    extractAgencyPolicyEvidence('We work with staffing agencies.', 'https://example.com/job') === null,
    'agency mention without an explicit refusal remains unknown',
  );
  assert(
    extractAgencyPolicyEvidence(
      'Agencies will not be paid for unsolicited candidate intros.',
      'https://boards.greenhouse.io/acme/jobs/p2',
    )?.status === 'supported',
    'broader no-pay-agency phrase is evidence',
  );

  // seed one open role
  let L = upsertLedger(null, board(true, [R('1')]), T0);
  const k = 'Greenhouse|acme|1';
  assert(L.roles[k] && L.roles[k].firstSeen === T0 && L.roles[k].closedAt === null, 'seed: role open, firstSeen set');
  assert(L.roles[k].fn === 'engineering' && L.roles[k].usPosted === true, 'seed: fn + usPosted via reuse');

  // INVARIANT 2 — failed fetch closes nothing (+ control: successful absence DOES close)
  const failed = upsertLedger(L, board(false, []), T1);
  assert(failed.roles[k].closedAt === null && failed.roles[k].lastSeen === T0, 'failed fetch: role stays open, lastSeen unchanged');
  assert(failed.updatedAt === T0, 'failed fetch: ledger freshness stays at last successful observation');
  const control = upsertLedger(L, board(true, []), T1); // successful fetch WITHOUT the role
  assert(control.roles[k].closedAt === T1, 'CONTROL: successful absence DOES close (proves test can fail)');
  for (const badId of [undefined, {}, 'bad|id']) {
    const malformed = upsertLedger(L, board(true, [R(badId)]), T1);
    assert(
      malformed.roles[k].closedAt === null && Object.keys(malformed.roles).length === 1,
      'malformed job id fails the whole board and closes nothing',
    );
  }
  {
    const poisonedPolls = [
      [{ provider: 'Greenhouse', slug: 'acme', company: 'C'.repeat(301), ok: true, roles: [R('2')] }],
      board(true, [R('2', { title: 'T'.repeat(501) })]),
      board(true, [R('2', { location: 'SF\u0000poison' })]),
      board(true, [R('2'), R('2', { title: 'duplicate poison' })]),
      [{
        provider: 'Recruitee',
        slug: 'acme',
        company: 'Acme',
        ok: true,
        roles: [
          R('api-1', { url: ' https://acme.recruitee.com/o/backend-engineer ' }),
          R('api-2', { url: 'https://acme.recruitee.com/o/backend-engineer' }),
        ],
      }],
      board(true, Array.from({ length: 501 }, (_, index) =>
        R(String(index + 2), { location: 'L'.repeat(1000), url: '' }))),
      board(true, Array.from({ length: 2001 }, (_, index) => R(String(index + 2), { url: '' }))),
    ];
    for (const poll of poisonedPolls) {
      assert(
        JSON.stringify(upsertLedger(L, poll, T1).roles) === JSON.stringify(L.roles),
        'oversized, controlled, duplicate-ID/URL, or over-count ATS data fails without ledger mutation',
      );
    }
    const collision = upsertLedger(null, [
      { provider: 'Greenhouse', slug: 'acme', company: 'First', ok: true, roles: [R('same', { title: 'first' })] },
      { provider: 'Greenhouse', slug: 'acme', company: 'Second', ok: true, roles: [R('same', { title: 'second' })] },
    ], T0).roles['Greenhouse|acme|same'];
    assert(collision.title === 'first' && collision.company === 'First', 'duplicate board role identity is first-observation-wins');
  }

  const policyKey = 'Greenhouse|acme|policy';
  const withPolicy = upsertLedger(
    null,
    board(true, [R('policy', { url: agencyPolicyEvidence.url, agencyPolicyEvidence })]),
    T0,
  );
  assert(
    withPolicy.roles[policyKey].agencyPolicyEvidence?.status === 'supported',
    'explicit no-agency evidence stored on role',
  );
  const policyCleared = upsertLedger(withPolicy, board(true, [R('policy')]), T1);
  assert(
    policyCleared.roles[policyKey].agencyPolicyEvidence === null,
    'successful later observation without the clause clears to unknown',
  );
  const policyPreserved = upsertLedger(withPolicy, board(false, []), T1);
  assert(
    policyPreserved.roles[policyKey].agencyPolicyEvidence?.quote === agencyPolicyEvidence.quote,
    'failed fetch preserves prior policy evidence',
  );

  // INVARIANT 1 — firstSeen monotonic; observedOpenDays from firstSeen not native date
  const reobs = upsertLedger(L, board(true, [R('1', { nativePostedAt: '2025-01-01', nativeDateField: 'first_published' })]), T1);
  assert(reobs.roles[k].firstSeen === T0 && reobs.roles[k].lastSeen === T1, 'firstSeen monotonic; lastSeen advances');
  assert(observedOpenDays(reobs.roles[k], T1) === 19, 'observedOpenDays from firstSeen (19d), NOT native 2025 date');
  assert(postedDaysAgo(reobs.roles[k], T1) > 500, 'postedDaysAgo separate + attributed (native first_published)');
  {
    const ed = { nativePostedAt: '2025-01-01', nativeDateField: 'first_published', nativeUpdatedAt: '2025-06-01' };
    assert(editedDaysAgo(ed, '2025-06-15') === 14, 'editedDaysAgo from nativeUpdatedAt');
    assert(postedVsEditedDays(ed) === 151, 'postedVsEditedDays first_published→updated_at');
    assert(postedVsEditedDays({ ...ed, nativeDateField: 'created_at' }) === null, 'postedVsEditedDays only first_published');
  }
  const renamed = upsertLedger(
    L,
    [{ provider: 'Greenhouse', slug: 'acme', company: 'Acme Canonical', ok: true, roles: [R('1')] }],
    T1,
  );
  assert(renamed.roles[k].company === 'Acme Canonical', 'successful exact-board reobservation heals stale company label');

  // reopen — closed then reappears
  const reopened = upsertLedger(control, board(true, [R('1')]), '2026-07-25');
  assert(reopened.roles[k].closedAt === null && reopened.roles[k].reopenCount === 1 && reopened.roles[k].firstSeen === T0, 'reopen: closedAt cleared, reopenCount++, firstSeen kept');

  // duplicate board (slug collision) in ONE poll: an empty sibling must NOT close/flap a role another
  // sibling with the same prefix populated (order-independent — empty listed first here).
  const dup = upsertLedger(L, [{ provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok: true, roles: [] }, { provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok: true, roles: [R('1')] }], '2026-07-28');
  assert(dup.roles[k].closedAt === null && dup.roles[k].reopenCount === 0, 'dup board same poll: empty sibling does not close/flap the populated role');

  // no PII / allowed shape only
  const allowed = new Set(['provider', 'slug', 'jobId', 'company', 'title', 'location', 'url', 'fn', 'usPosted', 'firstSeen', 'lastSeen', 'closedAt', 'reopenCount', 'nativePostedAt', 'nativeDateField', 'nativeUpdatedAt', 'nativeUpdatedField', 'agencyPolicyEvidence',
    'postedDateChangeCount', 'lastReportedPostedAt',
    'requisitionId', 'requisitionSignal', 'employerDepartment', 'employerOffice', 'nativeDeadline', 'employmentType', 'workplaceType']);
  // Same trap on a privacy guard: an empty row would satisfy `.every()` and report "no PII".
  assert(Object.keys(L.roles[k]).length > 0 && Object.keys(L.roles[k]).every((key) => allowed.has(key)), 'row has no fields outside the allowed (no PII)');
  {
    const withUpd = upsertLedger(null, board(true, [R('9', { nativeUpdatedAt: '2026-07-01', nativeUpdatedField: 'updated_at' })]), T0);
    const uk = Object.keys(withUpd.roles).find((x) => x.endsWith('|9'));
    assert(withUpd.roles[uk].nativeUpdatedAt === '2026-07-01' && withUpd.roles[uk].nativeUpdatedField === 'updated_at', 'upsert stores Greenhouse updated_at');
    const refreshed = upsertLedger(withUpd, board(true, [R('9', { nativeUpdatedAt: '2026-07-20', nativeUpdatedField: 'updated_at' })]), T1);
    assert(refreshed.roles[uk].nativeUpdatedAt === '2026-07-20', 'nativeUpdatedAt refreshes each poll (not a floor)');
  }

  // --- employer fields + requisition gate (Greenhouse public bytes) ---
  {
    assert(classifyRequisitionId('JR104169').requisitionSignal === 'id', 'JR id-shaped');
    assert(classifyRequisitionId('ONE').requisitionSignal === 'abstain', 'Airbnb ONE abstains');
    assert(classifyRequisitionId('MULTI').requisitionSignal === 'abstain', 'MULTI abstains');
    assert(classifyRequisitionId('').requisitionSignal === null, 'empty null');
    const emp = greenhouseEmployerFields({
      requisition_id: 'REQ #27298',
      departments: [{ name: 'Engineering' }],
      offices: [{ name: 'San Francisco' }],
      application_deadline: '2026-12-01T00:00:00Z',
      metadata: [{ name: 'External Department', value: 'Finance' }],
    });
    assert(emp.requisitionSignal === 'id' && emp.employerDepartment === 'Engineering' && emp.employerOffice === 'San Francisco', 'employer fields');
    const metaOnly = greenhouseEmployerFields({ metadata: [{ name: 'External Department', value: 'People' }] });
    assert(metaOnly.employerDepartment === 'People', 'metadata department fallback');
    const withEmp = upsertLedger(null, board(true, [R('emp1', {
      requisitionId: 'JR1', requisitionSignal: 'id',
      employerDepartment: 'Eng', employerOffice: 'SF',
      nativeDeadline: '2026-12-01',
    })]), T0);
    const ek = Object.keys(withEmp.roles).find((x) => x.endsWith('|emp1'));
    assert(withEmp.roles[ek].employerDepartment === 'Eng' && withEmp.roles[ek].requisitionSignal === 'id', 'upsert stores employer fields');
    const empRef = upsertLedger(withEmp, board(true, [R('emp1', {
      requisitionId: 'JR1', requisitionSignal: 'id',
      employerDepartment: 'Product', employerOffice: 'NYC',
    })]), T1);
    assert(empRef.roles[ek].employerDepartment === 'Product' && empRef.roles[ek].employerOffice === 'NYC', 'employer fields refresh');
    const ash = ashbyEmployerFields({ department: 'Eng', team: 'Platform', location: 'SF', employmentType: 'FullTime', workplaceType: 'Hybrid', isRemote: false });
    assert(ash.employerDepartment === 'Eng' && ash.employmentType === 'FullTime' && ash.workplaceType === 'Hybrid', 'ashby fields');
    const lev = leverEmployerFields({ categories: { department: 'R&D', location: 'Remote', commitment: 'Full Time' }, workplaceType: 'remote' });
    assert(lev.employerDepartment === 'R&D' && lev.employmentType === 'Full Time' && lev.workplaceType === 'remote', 'lever fields');
    const gh = projectEmployerAtsFields({
      firstSeen: '2026-07-01',
      nativePostedAt: '2026-06-01',
      nativeDateField: 'first_published',
      nativeUpdatedAt: '2026-07-15',
      employerDepartment: 'Engineering',
      employerOffice: 'San Francisco',
      workplaceType: 'Hybrid',
      employmentType: 'Full-time',
      nativeDeadline: '2026-12-01',
    });
    assert(gh.employerDepartment === 'Engineering' && gh.employerOffice === 'San Francisco', 'project dept/office');
    assert(gh.postedAt === '2026-06-01' && gh.nativePostedAt === '2026-06-01', 'gh posted clock');
    assert(gh.firstObservedAt === '2026-07-01' && gh.postedAt !== gh.firstObservedAt, 'dual clock not copied');
    assert(gh.postedVsEditedDays === 44 && gh.nativeDeadline === '2026-12-01', 'maintained-stale + deadline');
    const ashProj = projectEmployerAtsFields({
      firstSeen: '2026-07-01',
      nativePostedAt: '2026-04-27',
      nativeDateField: 'publishedAt',
      employerDepartment: 'Engineering',
    });
    assert(ashProj.postedAt === null && ashProj.nativePostedAt === null, 'ashby posted stays null');
    assert(ashProj.firstObservedAt === '2026-07-01' && ashProj.employerDepartment === 'Engineering', 'ashby observer + dept');
    const copied = projectEmployerAtsFields({
      firstSeen: '2026-07-01',
      nativePostedAt: '2026-07-01',
      nativeDateField: 'createdAt',
    });
    assert(copied.postedAt === null && copied.firstObservedAt === '2026-07-01', 'never copy firstObserved into posted');
  }

  // --- posting-date renewal detection (ATS auto-renew, 30-90d cycles) -----------------------
  {
    const fp = (d) => R('1', { nativePostedAt: d, nativeDateField: 'first_published' });
    const seed = upsertLedger(null, board(true, [fp('2026-01-01')]), T0);
    const key0 = Object.keys(seed.roles)[0];
    assert(seed.roles[key0].nativePostedAt === '2026-01-01', 'first posting date is captured');
    assert(!('postedDateChangeCount' in seed.roles[key0]), 'no change observed yet -> field absent');

    // Board recycles the date forward (the documented auto-renew behaviour).
    const renewed = upsertLedger(seed, board(true, [fp('2026-03-01')]), T1);
    const r1 = renewed.roles[key0];
    assert(r1.nativePostedAt === '2026-01-01', 'stored date must NOT move — ages stay a lower bound');
    assert(r1.postedDateChangeCount === 1, `renewal counted, got ${r1.postedDateChangeCount}`);
    assert(r1.lastReportedPostedAt === '2026-03-01', 'the board current claim is tracked alongside the floor');

    // Re-reporting the SAME recycled date must not double-count.
    const again = upsertLedger(renewed, board(true, [fp('2026-03-01')]), '2026-07-22');
    assert(again.roles[key0].postedDateChangeCount === 1, 'unchanged date does not re-count');

    // A second, different date counts again.
    const twice = upsertLedger(again, board(true, [fp('2026-05-01')]), '2026-07-23');
    assert(twice.roles[key0].postedDateChangeCount === 2, 'each distinct change counts');

    // An EARLIER date is still a change worth counting: it means our floor was too high.
    const earlier = upsertLedger(twice, board(true, [fp('2025-06-01')]), '2026-07-24');
    assert(earlier.roles[key0].postedDateChangeCount === 3, 'a backwards change is counted too');
    assert(earlier.roles[key0].nativePostedAt === '2026-01-01', 'stored date still pinned to first capture');

    // A board that reports no date at all must not be read as a change.
    const nodate = upsertLedger(earlier, board(true, [R('1')]), '2026-07-25');
    assert(nodate.roles[key0].postedDateChangeCount === 3, 'absent date is not a change');
  }

  // --- volume-anomaly quarantine: a truncated-but-valid board must not mass-close -----------
  {
    const many = (n) => Array.from({ length: n }, (_, i) => R(`v${i}`));
    const board2 = (roles, ok = true) => [{ provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok, roles }];
    const openCount = (l) => Object.values(l.roles).filter((r) => !r.closedAt).length;
    const full = upsertLedger(null, board2(many(40)), T0);
    assert(openCount(full) === 40, 'baseline: 40 roles observed open');

    // Truncated response the SAME day it was last seen: nothing may close.
    const held = [];
    const trunc = upsertLedger(full, board2(many(3)), T0, { onVolumeAnomaly: (e) => held.push(e) });
    assert(openCount(trunc) === 40, 'truncated board must not close 37 roles on first sight');
    assert(held.length === 1, 'the withheld closure must be reported, never silent');
    assert(held[0].held === 37 && held[0].priorOpen === 40 && held[0].present === 3,
      `anomaly report must be exact, got ${JSON.stringify(held[0])}`);

    // Recovery: the board comes back healthy — roles stay open, nothing was lost.
    const recovered = upsertLedger(trunc, board2(many(40)), '2026-07-02');
    assert(openCount(recovered) === 40, 'a transient truncation must leave no damage');

    // Persistence: still truncated once the disappearance is older than the grace window.
    const persisted = upsertLedger(trunc, board2(many(3)), '2026-07-04');
    assert(openCount(persisted) === 3, 'a drop that persists past the grace window does close');

    // A small board is unaffected — this guard targets mass closure only.
    const small = upsertLedger(null, board2([R('a'), R('b'), R('c')]), T0);
    const smallGone = upsertLedger(small, board2([R('a')]), T0);
    assert(openCount(smallGone) === 1, 'small boards keep closing immediately');

    // Healthy rotation: every role replaced at once is not a truncation.
    const rotated = upsertLedger(full, board2(Array.from({ length: 40 }, (_, i) => R(`w${i}`))), T0);
    assert(openCount(rotated) === 40, 'full rotation closes the old set and opens the new one');

    // A failed fetch still closes nothing and must not be reported as an anomaly.
    const failedHeld = [];
    const failed = upsertLedger(full, board2([], false), T0, { onVolumeAnomaly: (e) => failedHeld.push(e) });
    assert(openCount(failed) === 40 && failedHeld.length === 0, 'a failed fetch is not a volume anomaly');
  }

  // degenerate — empty map → empty; all-failed poll must NOT wipe state (vacuous-green guard)
  assert(Object.keys(upsertLedger(null, [], T0).roles).length === 0, 'empty poll → empty ledger, no crash');
  assert(boardsFromMap({ companies: [] }).length === 0, 'empty map → no boards');
  for (const [provider, jobsUrl, slug] of [
    ['Greenhouse', 'https://boards.greenhouse.io/acme', 'acme'],
    ['Lever', 'https://jobs.lever.co/acme', 'acme'],
    ['Ashby', 'https://jobs.ashbyhq.com/acme', 'acme'],
    ['SmartRecruiters', 'https://jobs.smartrecruiters.com/Acme', 'Acme'],
    ['Workable', 'https://apply.workable.com/acme/', 'acme'],
    ['Recruitee', 'https://acme.recruitee.com', 'acme'],
    ['Personio', 'https://acme.jobs.personio.de/', 'acme'],
  ]) {
    assert(boardFromCompany({ atsSource: provider, jobsUrl })?.slug === slug, `${provider}: canonical board route`);
  }
  for (const [provider, url] of [
    ['Greenhouse', 'https://job-boards.greenhouse.io/acme/jobs/J1'],
    ['Lever', 'https://jobs.lever.co/acme/J1'],
    ['Ashby', 'https://jobs.ashbyhq.com/acme/J1'],
    ['SmartRecruiters', 'https://jobs.smartrecruiters.com/acme/J1-role'],
    ['Workable', 'https://apply.workable.com/j/J1'],
    ['Recruitee', 'https://acme.recruitee.com/o/role'],
    ['Personio', 'https://acme.jobs.personio.de/job/J1'],
  ]) {
    const got = upsertLedger(null, [{
      provider,
      slug: 'acme',
      company: 'Acme',
      website: 'https://acme.example',
      ok: true,
      roles: [R('J1', { url })],
    }], T0).roles[`${provider}|acme|J1`];
    assert(got?.url === url, `${provider}: owned role URL survives ledger ingress`);
  }
  {
    const poisoned = upsertLedger(null, [{
      provider: 'Greenhouse',
      slug: 'acme',
      company: 'Acme',
      website: 'https://acme.example',
      ok: true,
      roles: [R('evil', {
        url: 'https://evil.example/phish/evil',
        agencyPolicyEvidence: {
          ...agencyPolicyEvidence,
          url: 'https://evil.example/phish/evil',
        },
      })],
    }], T0).roles['Greenhouse|acme|evil'];
    assert(
      poisoned?.url === '' && poisoned.agencyPolicyEvidence === null && poisoned.closedAt === null,
      'unowned role URL and its policy quote are stripped without false-closing the role',
    );
  }
  for (const jobsUrl of [
    'https://evil.example/acme',
    'https://boards.greenhouse.io.evil.example/acme',
    'http://boards.greenhouse.io/acme',
    'https://user:pass@boards.greenhouse.io/acme',
    'https://boards.greenhouse.io:443/acme',
    'https://boards.greenhouse.io:444/acme',
    'https://boards.greenhouse.io/acme?redirect=evil',
    'https://boards.greenhouse.io/acme#redirect',
    'https://boards.greenhouse.io/acme/jobs/1',
  ]) {
    assert(!boardFromCompany({ atsSource: 'Greenhouse', jobsUrl }), `Greenhouse: reject noncanonical route ${jobsUrl}`);
  }
  assert(
    !boardFromCompany({ atsSource: 'Recruitee', jobsUrl: 'https://evil.acme.recruitee.com/' }),
    'Recruitee: reject nested lookalike host',
  );
  {
    const badMap = { companies: [{ name: 'Pivotal Software', website: 'https://pivotal.io/', atsSource: 'Lever', jobsUrl: 'https://jobs.lever.co/pivotal' }] };
    assert(boardsFromMap(badMap).length === 0, 'denied board is never polled');
    const cleaned = purgeDeniedLedgerRows({
      schema: SCHEMA,
      roles: {
        'Lever|pivotal|wrong': { company: 'Pivotal Software' },
        'Lever|other|keep': { company: 'Other' },
      },
    }, badMap, T1);
    assert(cleaned.removed === 1 && cleaned.ledger.roles['Lever|other|keep'], 'denied board ledger rows are purged exactly');
  }
  assert(Object.keys(upsertLedger(L, board(false, []), T1).roles).length === 1, 'all-failed poll preserves existing roles (not wiped)');
  assert(
    JSON.stringify(summarizeProviderPoll([
      { provider: 'Greenhouse', ok: true, roles: [R('1'), R('2')] },
      { provider: 'Greenhouse', ok: false, roles: [] },
      { provider: 'Lever', ok: true, roles: [R('3')] },
    ])) === JSON.stringify({
      Greenhouse: { boards: 2, ok: 1, failed: 1, roles: 2 },
      Lever: { boards: 1, ok: 1, failed: 0, roles: 1 },
    }),
    'provider poll summary exposes coverage and failures without changing routing',
  );
  assert(
    !pollHasCoverage(3, 0) && pollHasCoverage(3, 1) && pollHasCoverage(0, 0),
    'poll coverage fails all-provider outages without failing an intentionally empty map',
  );

  // prune
  const old = { schema: SCHEMA, updatedAt: T0, roles: { x: { closedAt: '2026-01-01', firstSeen: '2025-12-01' } } };
  assert(pruneClosed(old, '2026-07-20').pruned === 1, 'prune drops long-closed role');

  // report shape
  const rep = report(reobs, { days: 10, today: T1 });
  assert(rep.agingRoles.length === 1 && rep.agingRoles[0].observedOpenDays === 19, 'report lists aging role w/ observedOpenDays');

  // report(): posted-basis + ghost-rate + evergreen + filters — the public honesty math (firstSeen 2026-05-01 == 90d open at T=2026-07-30)
  const RT = '2026-07-30';
  const mk = (o) => ({ provider: 'Greenhouse', slug: 's', jobId: 'j', company: 'C', title: 't', location: 'SF', fn: 'Engineering', usPosted: true, firstSeen: '2026-05-01', lastSeen: RT, closedAt: null, reopenCount: 0, nativePostedAt: null, nativeDateField: null, ...o });
  const led = (rows) => ({ schema: SCHEMA, roles: Object.fromEntries(rows.map((r, i) => [`k${i}`, r])) });
  { const r = report(led([mk({})]), { days: 30, today: RT, basis: 'observed' });
    assert(r.agingRoles.length === 1 && r.agingRoles[0].observedOpenDays === 90 && r.ghostRatePct === 100 && r.openUsRoles === 1, 'report observed: 90d role listed, ghost 100%, 1 open'); }
  assert(report(led([mk({}), mk({ firstSeen: '2026-07-20' })]), { days: 0, today: RT }).ghostRatePct === 50, 'report ghostRatePct is a ratio: one aged + one fresh => 50%');
  { const r = report(led([mk({ nativePostedAt: '2026-05-01', nativeDateField: 'first_published' }), mk({ nativePostedAt: '2026-05-01', nativeDateField: 'created_at' })]), { days: 30, today: RT, basis: 'posted' });
    assert(r.agingRoles.length === 1 && r.agingRoles[0].postedDaysAgo === 90, 'report posted: only first_published-attributed roles count (created_at excluded)'); }
  { const r = report(led([mk({ nativePostedAt: '2026-05-01', nativeDateField: 'first_published' })]), { days: 30, today: RT, basis: 'posted', evergreenDays: 60 });
    assert(r.agingRoles.length === 0 && r.evergreenExcluded === 1, 'report posted: role older than evergreenDays is excluded AND counted'); }
  assert(report(led([mk({ usPosted: false })]), { days: 30, today: RT }).agingRoles.length === 0, 'report usOnly (default): non-US role excluded');
  assert(report(led([mk({ usPosted: false })]), { days: 30, today: RT, usOnly: false }).agingRoles.length === 1, 'report usOnly:false: non-US role included');
  { const r = report(led([mk({ fn: 'Engineering' }), mk({ fn: 'Product' })]), { days: 30, today: RT });
    assert(r.byFunction.Engineering === 1 && r.byFunction.Product === 1, 'report byFunction aggregates per function'); }
  // `.every()` on [] is true: without the length assertion this passes identically whether the
  // filter keeps the Product role or drops every role, so it cannot catch an over-restrictive filter.
  { const fnFiltered = report(led([mk({ fn: 'Engineering' }), mk({ fn: 'Product' })]), { days: 30, today: RT, fn: 'Product' }).agingRoles;
    assert(fnFiltered.length === 1 && fnFiltered.every((x) => x.fn === 'Product'), 'report fn filter restricts to one function'); }
  assert(report(led([mk({ closedAt: RT })]), { days: 0, today: RT }).openUsRoles === 0, 'report never counts closed roles');

  {
    const tmp = fs.mkdtempSync('/tmp/dg-role-ledger-selftest-');
    const ledgerPath = path.join(tmp, 'ledger.json');
    const valid = `${JSON.stringify(L)}\n`;
    const withChange = (change) => {
      const copy = JSON.parse(valid);
      change(copy);
      return `${JSON.stringify(copy)}\n`;
    };
    const cases = [
      ['valid poll', ['poll'], valid, true],
      ['valid purge', ['purge-denied'], valid, true],
      ['valid report', ['report', '--json'], valid, true],
      ['missing poll', ['poll'], null, false],
      ['corrupt purge', ['purge-denied'], '{bad json\n', false],
      ['wrong schema report', ['report', '--json'], withChange((x) => { x.schema = 'wrong'; }), false],
      ['non-record roles poll', ['poll'], withChange((x) => { x.roles = []; }), false],
      ['non-record row purge', ['purge-denied'], withChange((x) => { x.roles[k] = 'bad'; }), false],
      ['bad identity report', ['report', '--json'], withChange((x) => { x.roles[k].jobId = 'other'; }), false],
      ['bad lifecycle poll', ['poll'], withChange((x) => { x.roles[k].firstSeen = 'not-a-day'; }), false],
    ];
    try {
      fs.writeFileSync(path.join(tmp, 'DEMIGOD-SF-STARTUP-MAP.json'), '{"companies":[]}\n');
      for (const [name, args, body, ok] of cases) {
        fs.rmSync(ledgerPath, { force: true });
        if (body !== null) fs.writeFileSync(ledgerPath, body, { mode: 0o600 });
        const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], {
          encoding: 'utf8',
          timeout: 10_000,
          env: {
            ...process.env,
            DEMIGOD_ROOT: tmp,
            DEMIGOD_ROLE_LEDGER: ledgerPath,
            DEMIGOD_LEDGER_DATE: T1,
          },
        });
        assert(ok ? run.status === 0 : run.status !== 0, `${name}: strict CLI exit`);
        if (ok) {
          assert(fs.existsSync(ledgerPath), `${name}: valid ledger survives`);
          if (args[0] === 'poll') assert(/"boards": 0/.test(run.stdout), `${name}: zero-network fixture`);
        } else {
          assert(
            body === null
              ? !fs.existsSync(ledgerPath)
              : fs.readFileSync(ledgerPath, 'utf8') === body,
            `${name}: invalid original bytes preserved`,
          );
        }
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  console.log(JSON.stringify({ ok: true, selftest: 'role-ledger' }));
  process.exit(0);
}

if (isMain) {
  const cmd = process.argv[2];
  const today = process.env.DEMIGOD_LEDGER_DATE || new Date().toISOString().slice(0, 10);
  if (cmd === 'purge-denied') {
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    let result;
    withFileLock(`${LEDGER}.lock`, () => {
      result = purgeDeniedLedgerRows(loadLedger(), map, today);
      atomicWrite(LEDGER, JSON.stringify(result.ledger) + '\n', { mode: 0o600 });
    });
    console.log(JSON.stringify({ ok: true, removed: result.removed, prefixes: result.prefixes, today }, null, 2));
  } else if (cmd === 'poll') {
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    const boards = boardsFromMap(map);
    const polled = await pool(boards, async (b) => { const r = await POLLERS[b.provider](b.slug); return { provider: b.provider, slug: b.slug, company: b.company, website: b.website, ok: r.ok, roles: r.roles }; });
    let summary, pruned = 0;
    // Surface withheld mass-closures in the poll receipt. A guard nobody can see is a silent cap.
    const volumeAnomalies = [];
    withFileLock(`${LEDGER}.lock`, () => {
      const prev = loadLedger();
      const up = upsertLedger(prev, polled, today, { onVolumeAnomaly: (e) => volumeAnomalies.push(e) });
      const pc = pruneClosed(up, today); pruned = pc.pruned;
      atomicWrite(LEDGER, JSON.stringify(pc.ledger) + '\n', { mode: 0o600 }); // compact — 13k+ roles, daily-changing local SoR (gitignored). Only the DESCRIPTION is re-pollable: closed roles and every firstSeen/closedAt are not, and pruneClosed deletes them at 180 days. demigod-role-ledger-archive.mjs holds that half.
      summary = summarize(pc.ledger, today);
    });
    const okFetches = polled.filter((p) => p.ok).length;
    console.log(JSON.stringify({ ok: pollHasCoverage(boards.length, okFetches), today, boards: boards.length, ok_fetches: okFetches, failed: polled.filter((p) => !p.ok).length, providers: summarizeProviderPoll(polled), pruned, volumeAnomalies, ...summary }, null, 2));
    if (!pollHasCoverage(boards.length, okFetches)) process.exitCode = 1;
  } else if (cmd === 'report') {
    const arg = (f, d) => { const i = process.argv.indexOf(f); const v = i > 0 ? process.argv[i + 1] : d; return (typeof v === 'string' && v.startsWith('--')) ? d : v; }; // reject a following flag as a value
    const basis = process.argv.includes('--posted') ? 'posted' : 'observed';
    const ledger = loadLedger();
    const dv = Number(arg('--days', 30));
    const rep = report(ledger, { days: Number.isFinite(dv) ? dv : 30, fn: arg('--fn', ''), today, basis });
    /* --startups: keep only companies the map says are actually startups. Without it this report is
       a targeting list topped by CircleCI, Vercel, Verkada, Instacart, Stripe, Okta, Figma, Brex and
       Anthropic — none of whom will ever hire through Demigod, so the aging signal is unusable for
       the one thing it is good for: finding a founder whose role has sat long enough to hurt.
       Reuses startupScore/loadCompanyProfiles from demigod-public-roles.mjs rather than re-deriving
       "is this a startup" a second time. */
    if (process.argv.includes('--startups')) {
      const { startupScore, companyKey, loadCompanyProfiles } = await import('./demigod-public-roles.mjs');
      const profiles = loadCompanyProfiles();
      const before = rep.agingRoles.length;
      rep.agingRoles = rep.agingRoles.filter((r) => startupScore(profiles[companyKey(r.company)]) === 2);
      rep.startupFilter = { applied: true, before, after: rep.agingRoles.length };
    }
    if (process.argv.includes('--json')) { console.log(JSON.stringify(rep, null, 2)); }
    else {
      const label = basis === 'posted' ? 'posted per board (attributed, Greenhouse)' : 'observed-open';
      console.log(`SF startup roles ${label} ≥${rep.days}d — ${rep.agingRoles.length} roles${rep.evergreenExcluded ? ` (+${rep.evergreenExcluded} evergreen >365d flagged separately)` : ''} · ghost-rate(observed≥60d) ${rep.ghostRatePct}% of ${rep.openUsRoles} US-posted open · by fn ${JSON.stringify(rep.byFunction)}`);
      for (const r of rep.agingRoles.slice(0, 40)) console.log(`  ${String(r.age).padStart(3)}d ${basis === 'posted' ? 'posted' : 'obs'}  ${r.company} — ${r.title}`.slice(0, 110));
    }
  } else if (cmd === 'targets' && process.argv[3] === 'set') {
    /* Record a human's judgement. Without this the store's whole promise -- that human triage
       survives a re-run -- was theoretical: nothing could set a state except hand-editing a
       mode-0600 JSON file, where one typo used to silently reset the store on the next merge. */
    const arg = (f, d) => { const i = process.argv.indexOf(f); const v = i > 0 ? process.argv[i + 1] : d; return (typeof v === 'string' && v.startsWith('--')) ? d : v; };
    const company = process.argv[4];
    const state = arg('--state', '');
    const note = process.argv.includes('--note') ? arg('--note', '') : null;
    if (!company || company.startsWith('--')) {
      console.error(`usage: demigod-role-ledger.mjs targets set <company> --state <${TARGET_STATES.join('|')}> [--note "..."]`);
      process.exit(2);
    }
    try {
      const next = setTargetState(loadTargets(), company, { state, note, at: today });
      atomicWrite(TARGETS, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
      const row = next.companies[company.trim().toLowerCase()];
      console.log(JSON.stringify({ ok: true, company: row.company, state: row.state, stateSetAt: row.stateSetAt, note: row.note }));
    } catch (e) {
      console.error(String(e.message || e));
      process.exit(2);
    }
  } else if (cmd === 'targets') {
    /* Persist the aging-startup target list so it survives closing a terminal. `report --json` is a
       snapshot with no state field, so a plain redirect loses any human judgement on the next run.
       This is private working state: never the board (which feeds the live site), never /tmp
       (which does not survive a reboot), and gitignored like every other company working file. */
    const ledger = loadLedger();
    const rep = report(ledger, { days: 30, today, basis: 'posted' });
    const { startupScore, companyKey, loadCompanyProfiles } = await import('./demigod-public-roles.mjs');
    const profiles = loadCompanyProfiles();
    const rows = rep.agingRoles.filter((r) => startupScore(profiles[companyKey(r.company)]) === 2);
    const store = mergeTargets(loadTargets(), rows, today);
    atomicWrite(TARGETS, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
    const active = Object.values(store.companies).filter((c) => !c.noLongerAgingAt);
    if (process.argv.includes('--json')) console.log(JSON.stringify(store, null, 2));
    else {
      /* --detail joins company context from the startup map at DISPLAY time only. Deliberately not
         persisted into the store: iteration O's rule is that the store holds judgement plus the
         ledger's own observations, so copying map columns in would create a third source of truth
         that goes stale silently. A company missing from the map renders without context rather
         than crashing — that happens the moment the map is regenerated without a company the
         ledger still sees. */
      const detail = process.argv.includes('--detail');
      const ctx = detail ? companyContext() : null;
      console.log(`targets · ${active.length} companies still aging · ${Object.keys(store.companies).length} tracked · ${TARGETS}`);
      if (detail) console.log('  context (description/size/stage/website) from DEMIGOD-SF-STARTUP-MAP.json — public open data, not Demigod claims');
      for (const c of active.sort((a, b) => b.oldestRoleDays - a.oldestRoleDays).slice(0, 20)) {
        console.log(`  ${String(c.oldestRoleDays).padStart(3)}d oldest · ${String(c.agingRoleCount).padStart(2)} roles · ${c.state.padEnd(9)} ${c.company}`);
        if (!detail) continue;
        const m = ctx[companyKeyFor(c.company)];
        if (!m) { console.log('       (no map row — context unavailable)'); continue; }
        const bits = [];
        if (Number.isSafeInteger(m.teamSize)) bits.push(`team ${m.teamSize}`);
        if (m.stage) bits.push(String(m.stage));
        if (m.website) bits.push(m.website);
        if (bits.length) console.log(`       ${bits.join(' · ')}`);
        if (m.description) console.log(`       ${String(m.description).replace(/\s+/g, ' ').slice(0, 96)}`);
        if (m.jobsUrl) console.log(`       board: ${m.jobsUrl}`);
      }
    }
  } else {
    console.log('usage: demigod-role-ledger.mjs poll | purge-denied | report [--days N] [--fn F] [--json] | targets [--json] | --selftest');
    process.exit(1);
  }
}
