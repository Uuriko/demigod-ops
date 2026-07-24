#!/usr/bin/env node
/**
 * Demigod lead collection — Firecrawl + inbox + public X signals.
 * Outputs DEMIGOD-LEADS.json for human triage. NO auto-DM / auto-board.
 *
 *   node demigod-lead-collect.mjs
 *   node demigod-lead-collect.mjs --limit=40
 *   node demigod-lead-collect.mjs --enrich [--id=LEAD] [--limit=10]
 *
 * Env: FIRECRAWL_API_KEY (optional; CLI keyless works for search/scrape)
 * --enrich: scrape partner posting URLs; attach only contacts literally on-page
 * (never invents email). Cap 10/run (free plan). Skips provenance-present leads.
 */
import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadInbox, extractEmail } from './demigod-submissions-lib.mjs';
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const OUT = path.join(ROOT, 'DEMIGOD-LEADS.json');
const CRM_LOCK = `${OUT}.lock`;
const BUSY = '/tmp/dg-busy/leads';
const SCRAPE_DIR = path.join(BUSY, 'scrapes');

export function writeSeedIfMissing(file, value) {
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), { flag: 'wx' });
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}

/** Atomic JSON write (temp+rename). */
export function writeLeadsJson(file, value) {
  atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  fs.chmodSync(file, 0o600);
}

/** Draft released leads and expose child failures without rolling back CRM enrichment. */
export function redraftEnrichedLeads(results, runDraft = (id) => spawnSync(
  process.execPath,
  [path.join(ROOT, 'demigod-funnel.mjs'), 'draft', `--id=${id}`],
  { encoding: 'utf8', timeout: 30000, cwd: ROOT },
)) {
  const redrafted = [];
  const failures = [];
  for (const { id, usableContact } of results) {
    if (!usableContact) continue;
    const child = runDraft(id);
    if (!child.error && child.status === 0) redrafted.push(id);
    else failures.push({
      id,
      status: child.status ?? 1,
      error: child.error ? String(child.error) : null,
      stderr: String(child.stderr || '').slice(-1000),
    });
  }
  return { redrafted, failures };
}

/** Missing is a first run; unreadable existing CRM must fail closed. */
export function previousLeadsById(file) {
  if (!fs.existsSync(file)) return new Map();
  const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
  const partners = Array.isArray(prev?.partners) ? prev.partners : [];
  const talent = Array.isArray(prev?.talent) ? prev.talent : [];
  return new Map(
    [...partners, ...talent]
      .filter((row) => row?.id)
      .map((row) => [row.id, row]),
  );
}

export const leadId = (prefix, value) =>
  `${prefix}-${createHash('sha256').update(String(value)).digest('base64url').slice(0, 14)}`;

/** Normalize partner job URL for collision keys (hash/trailing slash only). */
export function partnerUrlDedupeKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.href.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/**
 * Partner collect dedupe: same posting URL → one lead (title/company scrape noise).
 * events-bot rows may share host pages — keep identity key there.
 */
export const partnerDedupeKey = (l) => {
  const src = String(l?.source || '');
  if (!src.startsWith('events-bot:')) {
    const uk = partnerUrlDedupeKey(l?.url || l?.applyUrl);
    if (uk) return `url:${uk}`;
  }
  return `${l?.company || ''}|${l?.title || ''}|${l?.url || l?.id || ''}`.toLowerCase();
};

export const talentDedupeKey = (l) =>
  `${l.name || l.handle || ''}|${l.email || ''}|${l.url || l.id}`.toLowerCase();

const LEGACY_SOURCE_STATUSES = new Set(['sourced', 'triage', 'warm', 'pipeline-source', 'review-inbox']);
const SUPPRESSED_STATUSES = new Set(['opted_out', 'quarantined', 'bounced', 'cold', 'disqualified', 'rejected', 'fell_through']);
/** Real funnel pipeline stages only — free-form labels (low-priority-local) must not wipe drafted. */
const FUNNEL_PIPELINE_STATES = new Set([
  'sourced',
  'enriched',
  'drafted',
  'approved',
  'sent',
  'replied',
  'form_filled',
  'in_review',
  'proposed',
  'mutual_yes',
  'intro_made',
  'interviewing',
  'hired',
  'invoiced',
  'paid',
  'nudged',
  'cold',
  'bounced',
  'opted_out',
  'rejected',
  'quarantined',
  'disqualified',
  'policy_hold',
  'enrich_failed',
  'stale_form',
  'one_side_no',
  'fell_through',
  'overdue',
]);

function funnelPipelineState(state, status) {
  const st = String(state || '').toLowerCase();
  const su = String(status || '').toLowerCase();
  // Terminal suppression on either field always wins (opt-out > stale replied state)
  if (st && SUPPRESSED_STATUSES.has(st)) return st;
  if (su && SUPPRESSED_STATUSES.has(su)) return su;
  // Prefer advanced funnel stage over legacy "sourced" when status is further along
  if (st && FUNNEL_PIPELINE_STATES.has(st) && !LEGACY_SOURCE_STATUSES.has(st)) return st;
  if (su && FUNNEL_PIPELINE_STATES.has(su) && !LEGACY_SOURCE_STATUSES.has(su)) return su;
  if (st && FUNNEL_PIPELINE_STATES.has(st)) return st;
  if (su && FUNNEL_PIPELINE_STATES.has(su)) return su;
  return null;
}

export const hasAdvancedState = (lead) => {
  const s = funnelPipelineState(lead?.state, lead?.status);
  return Boolean(s && !LEGACY_SOURCE_STATUSES.has(s));
};

export const shouldReattachLead = (lead) =>
  hasAdvancedState(lead) || /^(?:submissions-inbox|events-bot|manual)(?::|$)/i.test(String(lead?.source || ''));

export const isTalentLead = (lead) => lead?.type === 'talent' || lead?.side === 'talent';

export function mergeLeadState(current, previous) {
  if (!previous) return current;
  const merged = { ...current };
  const currentPipe = funnelPipelineState(current.state, current.status);
  const previousPipe = funnelPipelineState(previous.state, previous.status);
  const currentSuppression = SUPPRESSED_STATUSES.has(currentPipe || '')
    ? currentPipe
    : null;
  const currentProgress =
    currentPipe && !LEGACY_SOURCE_STATUSES.has(currentPipe) ? currentPipe : null;
  const previousState = SUPPRESSED_STATUSES.has(previousPipe || '')
    ? previousPipe
    : previousPipe && !LEGACY_SOURCE_STATUSES.has(previousPipe)
      ? previousPipe
      : previousPipe || String(previous.state || previous.status || '').toLowerCase() || null;
  for (const key of [
    'status',
    'stateHistory',
    'stateUpdatedAt',
    'history',
    'updatedAt',
    'sentAt',
    'sentReceipt',
    'receiptPath',
    'repliedAt',
    'note',
    'joinedSubmissionId',
    'pairId',
    'pilotId',
    'pilotBridgedAt',
    'hireEvidence',
    'invoiceId',
    'invoicePath',
    'feeCents',
    'nudgeCount',
    'policyHoldReason',
    'email',
    'contactEmail',
    'handle',
    'applyUrl',
    'companyUrl',
    'enrichAttemptCount',
    'enrichAttemptedAt',
    'enrichExhaustedAt',
    'collectLabel',
    'provenance',
    'contactProvenance',
  ]) {
    if (previous[key] != null && (merged[key] == null || merged[key] === '' || (['stateHistory', 'history'].includes(key) && !merged[key]?.length))) {
      merged[key] = previous[key];
    }
  }
  // Prefer higher enrich attempt counts (re-collect must not reset cooldown/exhaust)
  if (
    Number(previous.enrichAttemptCount) > 0 &&
    Number(previous.enrichAttemptCount) > Number(merged.enrichAttemptCount || 0)
  ) {
    merged.enrichAttemptCount = previous.enrichAttemptCount;
  }
  // Keep free-form labels (e.g. low-priority-local) as note, not as funnel state
  const freeLabel = String(current.status || '').toLowerCase();
  if (
    freeLabel &&
    !FUNNEL_PIPELINE_STATES.has(freeLabel) &&
    !LEGACY_SOURCE_STATUSES.has(freeLabel) &&
    merged.note == null
  ) {
    merged.collectLabel = freeLabel;
  }
  merged.pairIds = [
    ...new Set([
      ...(Array.isArray(previous.pairIds) ? previous.pairIds : []),
      ...(Array.isArray(current.pairIds) ? current.pairIds : []),
    ]),
  ];
  if (!merged.pairIds.length) delete merged.pairIds;
  if (
    currentSuppression ||
    (previousState && SUPPRESSED_STATUSES.has(previousState)) ||
    currentProgress ||
    (previousState && FUNNEL_PIPELINE_STATES.has(previousState) && !LEGACY_SOURCE_STATUSES.has(previousState))
  ) {
    merged.state = previousState === 'opted_out'
      ? previousState
      : currentSuppression ||
        (SUPPRESSED_STATUSES.has(previousState) ? previousState : null) ||
        (currentProgress === 'policy_hold' &&
        previousState &&
        FUNNEL_PIPELINE_STATES.has(previousState) &&
        !LEGACY_SOURCE_STATUSES.has(previousState)
          ? previousState
          : null) ||
        currentProgress ||
        previousState;
    // status mirrors funnel state (not free-form collect labels)
    if (merged.state && FUNNEL_PIPELINE_STATES.has(String(merged.state).toLowerCase())) {
      merged.status = merged.state;
    }
  }
  return attachPublicContact(merged);
}

/** Public poster handle from x.com status URL (not invented contact). Noise org/job-board handles never stamp. */
export function attachPublicContact(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  if (!lead.handle) {
    const m = String(lead.url || '').match(/x\.com\/([A-Za-z0-9_]+)\/status/i);
    if (m && isUsableOutreachHandle(m[1])) lead.handle = '@' + m[1];
  }
  if (!lead.handle) {
    const m2 = String(lead.source || '').match(/x:@([A-Za-z0-9_]+)/i);
    if (m2 && isUsableOutreachHandle(m2[1])) lead.handle = '@' + m2[1];
  }
  return lead;
}

/**
 * Noise / non-outbound addresses that appear on job pages or our own site.
 * Never invent contact — just refuse these as usable outreach targets.
 * Includes job-board platform mailboxes (WaaS footer workatastartup@ycombinator.com).
 */
export const NOISE_EMAIL_RE =
  /noreply|no-reply|donotreply|do-not-reply|mailer-daemon|notifications?@|sentry\.|wixpress|example\.com|domain\.com|email\.com|your@|test@|@trydemigod\.com|@pending\.example|workatastartup@|@ycombinator\.com|@workatastartup\.com|@indeed\.com|@linkedin\.com|@wellfound\.com|@builtinsf?\.com|@ziprecruiter\.com/i;

/** Org / job-board X handles — not a person we cold-DM. */
export const NOISE_HANDLE_RE =
  /^(ycombinator|sfsoftwarejobs|securityblvd|linkedin|indeed|wellfound|angellist|builtin|techcrunch|producthunt|github|stackoverflow|workatastartup|jobs?with\w*|hiring\w*)$/i;

/** True when email is a real outbound contact (not self/noreply/fixture). */
export function isUsableOutreachEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(e)) return false;
  if (NOISE_EMAIL_RE.test(e)) return false;
  return true;
}

/** True when handle is a person-shaped X target (not org/job-board noise). */
export function isUsableOutreachHandle(handle) {
  const h = String(handle || '')
    .replace(/^@/, '')
    .trim();
  if (!/^[A-Za-z0-9_]{2,15}$/.test(h)) return false;
  if (NOISE_HANDLE_RE.test(h)) return false;
  if (/^(intent|share|home|search|i|settings|explore)$/i.test(h)) return false;
  return true;
}

/** Own product site — never scrape as "contact source" (footer yields potter@). */
export function isOwnSiteUrl(url) {
  return /(?:^|[/.])trydemigod\.com(?:[/:?]|$)/i.test(String(url || ''));
}

// Back-compat alias used in older call sites / comments
const SKIP_EMAIL_RE = NOISE_EMAIL_RE;

/**
 * Pure: extract ONLY contacts literally present on a scraped page.
 * Never constructs first@domain. Returns {contactEmail?, handle?, applyUrl?} (absent keys = not found).
 * Skips self-domain (trydemigod.com), noreply, pending.example — continues to next match.
 */
export function extractContactFromPage(text) {
  const raw = String(text || '');
  const out = {};
  if (!raw) return out;

  // mailto: first (often the intentional apply contact), then plain emails — first usable wins
  const mailtoRe = /mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let mm;
  while ((mm = mailtoRe.exec(raw)) !== null) {
    const cand = mm[1].toLowerCase();
    if (isUsableOutreachEmail(cand)) {
      out.contactEmail = cand;
      break;
    }
  }
  if (!out.contactEmail) {
    const plainRe = /(?<![\w.+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?![\w.-])/gi;
    let pm;
    while ((pm = plainRe.exec(raw)) !== null) {
      const cand = pm[1].toLowerCase();
      if (isUsableOutreachEmail(cand)) {
        out.contactEmail = cand;
        break;
      }
    }
  }

  const hxRe = /(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:\b|\/)/gi;
  let hx;
  while ((hx = hxRe.exec(raw)) !== null) {
    if (isUsableOutreachHandle(hx[1])) {
      out.handle = '@' + hx[1];
      break;
    }
  }

  // Job-board apply hosts only (not CDN/logo paths like app.ashbyhq.com/api/images/…)
  // Never accept aggregator index/apply shells (workatastartup.com/application).
  const applyRe =
    /https?:\/\/(?:jobs\.ashbyhq\.com|boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co|apply\.workable\.com)\/[^\s)"'<>]+/gi;
  let am;
  while ((am = applyRe.exec(raw)) !== null) {
    const u = am[0].replace(/[.,;:]+$/, '');
    if (/\.(png|jpe?g|gif|svg|webp|css|js)(\?|$)/i.test(u)) continue;
    if (/\/api\/images\//i.test(u)) continue;
    if (isAggregatorUrl(u)) continue;
    out.applyUrl = u;
    break;
  }
  if (!out.applyUrl) {
    const pathApply = raw.match(
      /https?:\/\/[^\s)"'<>]+\/(?:apply|application)(?:\/[^\s)"'<>]*)?/i,
    );
    if (pathApply) {
      const u = pathApply[0].replace(/[.,;:]+$/, '');
      if (
        !/\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(u) &&
        !/\/api\//i.test(u) &&
        !isAggregatorUrl(u)
      ) {
        out.applyUrl = u;
      }
    }
  }
  // Company website (not job boards / social) — hop target when listing is aggregator shell
  if (!out.companyUrl) {
    const siteRe = /https?:\/\/(?:www\.)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?:\/[^\s)"'<>]*)?/gi;
    let sm;
    while ((sm = siteRe.exec(raw)) !== null) {
      const u = sm[0].replace(/[.,;:]+$/, '');
      if (/\.(png|jpe?g|gif|svg|webp|css|js)(\?|$)/i.test(u)) continue;
      if (/\/api\//i.test(u)) continue;
      if (isJunkCompanyUrl(u)) continue;
      const host = String(sm[1] || '').toLowerCase();
      if (
        /^(twitter|x|linkedin|facebook|instagram|youtube|github|notion|typeform|google|apple|microsoft|amazon)\./i.test(
          host,
        ) ||
        /\.(twitter|x|linkedin|facebook|instagram|youtube|github|notion|typeform)\./i.test(host)
      ) {
        continue;
      }
      // Prefer bare origin or /careers|/about|/jobs|/team paths
      if (/\/(careers?|jobs?|about|team|company)(\/|$)/i.test(u) || !u.replace(/^https?:\/\/[^/]+/i, '')) {
        out.companyUrl = u.replace(/\/$/, '') || u;
        break;
      }
      if (!out.companyUrl) out.companyUrl = u.split('/').slice(0, 3).join('/'); // origin only
    }
  }
  return out;
}

/**
 * Drop scrape-stamped platform noise so retry/enrich can heal bad runs.
 * Mutates the given row (callers pass a copy when purity is required).
 */
export function scrubNoiseContact(lead) {
  if (!lead || typeof lead !== 'object') return lead;
  if (lead.contactEmail && !isUsableOutreachEmail(lead.contactEmail)) {
    delete lead.contactEmail;
  }
  if (lead.handle && !isUsableOutreachHandle(lead.handle)) {
    delete lead.handle;
  }
  if (lead.applyUrl && isAggregatorUrl(lead.applyUrl)) {
    delete lead.applyUrl;
  }
  // Job boards / YC corporate / social are not real company websites
  if (lead.companyUrl && isJunkCompanyUrl(lead.companyUrl)) {
    delete lead.companyUrl;
  }
  const email = String(lead.email || lead.contactEmail || '').trim();
  const handle = String(lead.handle || '').trim();
  const usable =
    isUsableOutreachEmail(email) || isUsableOutreachHandle(handle);
  const hasAtsApply = Boolean(lead.applyUrl && !isAggregatorUrl(lead.applyUrl));
  // Provenance with neither usable contact nor real ATS apply was a false stamp
  // (e.g. workatastartup@ycombinator.com + /application shell).
  if (lead.contactProvenance && !usable && !hasAtsApply) {
    delete lead.contactProvenance;
  }
  return lead;
}

/** Partner needs scrape-enrich: active, has url, and no usable email/handle. */
export function needsContactEnrich(lead) {
  if (!lead || typeof lead !== 'object') return false;
  const st = lead.state || lead.status || '';
  if (st === 'disqualified' || st === 'opted_out') return false;
  if (!lead.url) return false;
  // Never scrape our own site — footer email is not a lead contact
  if (isOwnSiteUrl(lead.url)) return false;
  scrubNoiseContact(lead);
  const email = String(lead.email || lead.contactEmail || '').trim();
  const handle = String(lead.handle || '').trim();
  // Usable contact already present → done
  if (isUsableOutreachEmail(email) || isUsableOutreachHandle(handle)) return false;
  return true;
}

/** Default: do not re-scrape the same no-contact hold every triage (Firecrawl thrash). */
export const ENRICH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Pure: true when lead was scrape-enriched recently (attempt stamp or provenance).
 * --id= force path ignores this in selectEnrichTargets.
 */
export function enrichRecentlyAttempted(
  lead,
  { now = Date.now(), cooldownMs = ENRICH_COOLDOWN_MS } = {},
) {
  if (!lead || typeof lead !== 'object') return false;
  const at = lead.enrichAttemptedAt || lead.contactProvenance?.at || null;
  if (!at) return false;
  const t = Date.parse(at);
  if (!Number.isFinite(t)) return false;
  const cd = Number(cooldownMs);
  if (!Number.isFinite(cd) || cd <= 0) return false;
  return now - t < cd;
}

/** Max empty scrapes before batch enrich stops retrying ( --id= still forces ). */
export const ENRICH_MAX_ATTEMPTS = 3;

/**
 * Pure: stamp enrich attempt after a scrape loop.
 * - scrapeCompleted: full attempt (counts toward ENRICH_MAX_ATTEMPTS)
 * - transportFailed: cooldown only (Firecrawl credits/spawn) — does not burn budget
 */
export function applyEnrichAttemptStamp(
  lead,
  { scrapeCompleted = false, transportFailed = false, at = null, transportError = null } = {},
) {
  if (!lead || typeof lead !== 'object') return lead;
  const ts = at || new Date().toISOString();
  if (scrapeCompleted) {
    lead.enrichAttemptedAt = ts;
    lead.enrichAttemptCount = (Number(lead.enrichAttemptCount) || 0) + 1;
    return lead;
  }
  if (transportFailed) {
    lead.enrichAttemptedAt = ts;
    lead.lastTransportFailedAt = ts;
    if (transportError) lead.lastTransportError = String(transportError).slice(0, 240);
  }
  return lead;
}

/**
 * Pure: too many failed enrich attempts without usable contact.
 */
export function enrichAttemptsExhausted(lead, { max = ENRICH_MAX_ATTEMPTS } = {}) {
  if (!lead || typeof lead !== 'object') return false;
  const n = Number(lead.enrichAttemptCount);
  const cap = Number(max);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (!Number.isFinite(cap) || cap <= 0) return false;
  return n >= cap;
}

/**
 * Pure: stamp or clear enrich-exhausted hold reason after scrape attempts.
 * Mutates lead. Never invents contact. Clears exhausted when usable contact appears.
 */
export function stampEnrichExhausted(
  lead,
  { at = null, max = ENRICH_MAX_ATTEMPTS } = {},
) {
  if (!lead || typeof lead !== 'object') return { exhausted: false };
  const email = String(lead.email || lead.contactEmail || '').trim();
  const handle = String(lead.handle || '').trim();
  const usable =
    isUsableOutreachEmail(email) || isUsableOutreachHandle(handle);
  if (usable) {
    if (lead.policyHoldReason === 'enrich-exhausted') delete lead.policyHoldReason;
    if (lead.enrichExhaustedAt) delete lead.enrichExhaustedAt;
    return { exhausted: false, cleared: true };
  }
  if (!enrichAttemptsExhausted(lead, { max })) return { exhausted: false };
  const ts = at || new Date().toISOString();
  lead.policyHoldReason = 'enrich-exhausted';
  lead.enrichExhaustedAt = ts;
  return { exhausted: true, at: ts };
}

/**
 * Pure: apply extracted page contacts onto a lead + provenance.
 * Only writes fields that were literally found AND usable (never invents; never self-domain).
 * Heals prior platform-noise stamps before merging.
 */
export function applyContactEnrich(lead, extracted, { url, at } = {}) {
  const next = scrubNoiseContact({ ...lead });
  const ex = extracted && typeof extracted === 'object' ? extracted : {};
  let found = false;
  if (
    ex.contactEmail &&
    !next.contactEmail &&
    !next.email &&
    isUsableOutreachEmail(ex.contactEmail)
  ) {
    next.contactEmail = ex.contactEmail;
    found = true;
  }
  if (ex.handle && !next.handle && isUsableOutreachHandle(ex.handle)) {
    next.handle = ex.handle;
    found = true;
  }
  if (ex.applyUrl && !next.applyUrl && !isAggregatorUrl(ex.applyUrl)) {
    next.applyUrl = ex.applyUrl;
    found = true;
  }
  if (ex.companyUrl && !next.companyUrl && !isJunkCompanyUrl(ex.companyUrl)) {
    next.companyUrl = ex.companyUrl;
    found = true;
  }
  if (found) {
    next.contactProvenance = {
      url: url || next.url || null,
      at: at || new Date().toISOString(),
      method: 'scrape',
    };
  }
  return next;
}

/**
 * Pure: scrape priority for --enrich (lower = first).
 * Free-tier cap is small — prefer ATS/company hosts that yield real contact
 * over aggregator job shells (WaaS/Wellfound) that almost never do.
 */
export function enrichUrlPriority(url) {
  const u = String(url || '');
  if (
    /jobs\.ashbyhq\.com|boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co|apply\.workable\.com/i.test(
      u,
    )
  ) {
    return 0;
  }
  if (isAggregatorUrl(u)) return 2;
  return 1;
}

/**
 * Pure: best URL to scrape for contact.
 * Prefer: ATS applyUrl → known company site (when listing is aggregator) → listing.
 */
export function enrichScrapeUrl(lead) {
  if (!lead || typeof lead !== 'object') return '';
  const listing = String(lead.url || '').trim();
  const apply = String(lead.applyUrl || '').trim();
  if (apply && !isAggregatorUrl(apply) && enrichUrlPriority(apply) < enrichUrlPriority(listing || apply)) {
    return apply;
  }
  // Prior enrich may have stamped companyUrl — scrape that before re-hitting WaaS shells
  const company = String(lead.companyUrl || '').trim();
  if (company && !isJunkCompanyUrl(company) && enrichUrlPriority(listing || company) >= 2) {
    return company;
  }
  return listing || apply || (!isJunkCompanyUrl(company) ? company : '') || '';
}

export const enrichScrapeUrlKey = (lead) => enrichScrapeUrl(lead).replace(/#.*$/, '').replace(/\/$/, '');

/**
 * Pure: policy_hold + usable email|handle → drafted (FOCUS release after enrich).
 * Never invents contact. Mutates lead in place when released.
 */
export function releaseHoldIfContactable(
  lead,
  { at = null, actor = 'enrich', note = 'enrich-found-contact' } = {},
) {
  if (!lead || typeof lead !== 'object') return { released: false, reason: 'no-lead' };
  const from = String(lead.state || lead.status || '');
  if (from !== 'policy_hold') return { released: false, reason: 'not-hold' };
  const email = String(lead.email || lead.contactEmail || '').trim();
  const handle = String(lead.handle || '').trim();
  if (!isUsableOutreachEmail(email) && !isUsableOutreachHandle(handle)) {
    return { released: false, reason: 'no-contact' };
  }
  const ts = at || new Date().toISOString();
  lead.state = 'drafted';
  lead.status = 'drafted';
  if (
    lead.policyHoldReason === 'no-usable-contact' ||
    lead.policyHoldReason === 'no-contact-email' ||
    lead.policyHoldReason === 'enrich-exhausted'
  ) {
    delete lead.policyHoldReason;
    if (lead.enrichExhaustedAt) delete lead.enrichExhaustedAt;
  }
  lead.stateUpdatedAt = ts;
  lead.stateHistory = Array.isArray(lead.stateHistory) ? lead.stateHistory : [];
  lead.stateHistory.push({ at: ts, from, to: 'drafted', actor, evidence: null, note });
  return { released: true, from, to: 'drafted' };
}

/**
 * Pure: after first scrape, if no usable email|handle, hop once:
 * 1) ATS applyUrl (best)
 * 2) company website (when listing was aggregator shell)
 * Never hops to aggregators or same URL.
 */
export function shouldEnrichSecondHop(lead, extracted, firstUrl) {
  if (!lead || typeof lead !== 'object') return null;
  const email = String(lead.email || lead.contactEmail || extracted?.contactEmail || '').trim();
  const handle = String(lead.handle || extracted?.handle || '').trim();
  if (isUsableOutreachEmail(email) || isUsableOutreachHandle(handle)) return null;
  const first = String(firstUrl || '').trim();
  const apply = String(lead.applyUrl || extracted?.applyUrl || '').trim();
  if (apply && !isAggregatorUrl(apply) && enrichUrlPriority(apply) === 0 && apply !== first) {
    return apply;
  }
  const company = String(lead.companyUrl || extracted?.companyUrl || '').trim();
  if (
    company &&
    !isJunkCompanyUrl(company) &&
    company !== first &&
    enrichUrlPriority(first) >= 2 // only hop off aggregator listings
  ) {
    return company;
  }
  return null;
}

/**
 * Pure: pick partner rows for --enrich (id filter + limit).
 * Order: ATS hosts first → company → aggregators; within band prefer
 * policy_hold (FOCUS parked no-usable-contact) then higher score.
 * Skips leads enriched within ENRICH_COOLDOWN_MS unless --id= forces one.
 */
export function selectEnrichTargets(
  partners,
  { id = null, limit = 10, now = Date.now(), cooldownMs = ENRICH_COOLDOWN_MS } = {},
) {
  const list = Array.isArray(partners) ? partners : [];
  const cap = Math.max(0, Math.min(Number.isFinite(Number(limit)) ? Number(limit) : 10, 50));
  const eligible = [];
  for (let i = 0; i < list.length; i++) {
    const lead = list[i];
    if (id && lead.id !== id) continue;
    if (!needsContactEnrich(lead)) continue;
    // Forced --id= always retries; batch path respects cooldown + max attempts
    if (!id && enrichRecentlyAttempted(lead, { now, cooldownMs })) continue;
    if (!id && enrichAttemptsExhausted(lead)) continue;
    eligible.push({ lead, i });
  }
  eligible.sort((a, b) => {
    const priA = enrichUrlPriority(enrichScrapeUrl(a.lead));
    const priB = enrichUrlPriority(enrichScrapeUrl(b.lead));
    if (priA !== priB) return priA - priB;
    const stA = String(a.lead.state || a.lead.status || '');
    const stB = String(b.lead.state || b.lead.status || '');
    const holdA = stA === 'policy_hold' ? 0 : 1;
    const holdB = stB === 'policy_hold' ? 0 : 1;
    if (holdA !== holdB) return holdA - holdB;
    // Prefer never-attempted over old attempts (outside cooldown both pass; never still first)
    const attA = a.lead.enrichAttemptedAt || a.lead.contactProvenance?.at ? 1 : 0;
    const attB = b.lead.enrichAttemptedAt || b.lead.contactProvenance?.at ? 1 : 0;
    if (attA !== attB) return attA - attB;
    const scA = Number(a.lead.score) || 0;
    const scB = Number(b.lead.score) || 0;
    if (scB !== scA) return scB - scA;
    return a.i - b.i;
  });
  const seenUrls = new Set();
  return eligible
    .filter(({ lead }) => {
      const url = enrichScrapeUrlKey(lead);
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    })
    .slice(0, cap)
    .map((x) => x.lead);
}

/** Replace the exact selected row; IDs are not guaranteed unique across sides. */
export function writeEnrichedLead(partners, talent, lead, enriched) {
  const list = partners.includes(lead) ? partners : talent;
  const index = list.indexOf(lead);
  if (index < 0) return false;
  list[index] = enriched;
  return true;
}

export function parseCollectLimit(value, fallback = 50) {
  const n = value == null ? fallback : Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
}

export function collectArgsValid(argv) {
  const enrich = argv.includes('enrich') || argv.includes('--enrich');
  return !(argv.includes('enrich') && argv.includes('--enrich')) &&
    new Set(argv.map((a) => a.split('=')[0])).size === argv.length && argv.every((a) =>
    enrich
      ? a === 'enrich' || a === '--enrich' || a === '--dry-run' || a === '--force-paused' || /^--(?:id=.+|limit=\d+)$/.test(a)
      : a === '--force-paused' || /^--limit=\d+$/.test(a),
  );
}

export const leadCollectionPaused = (focus) => /\blead funnel\b[\s\S]{0,200}\bpaused\b/i.test(focus);

/** Resolve lead-system FOCUS text (env override → DEMIGOD_ROOT → DEMIGOD_BUSY). Empty if missing. */
export function readLeadFocus({
  root = process.env.DEMIGOD_ROOT || ROOT,
  busy = process.env.DEMIGOD_BUSY || '/tmp/dg-busy',
  focusPath = process.env.DEMIGOD_FOCUS_PATH,
} = {}) {
  for (const fp of [focusPath, path.join(root, 'lead-system', 'FOCUS.md'), path.join(busy, 'lead-system', 'FOCUS.md')].filter(Boolean)) {
    try {
      if (fs.existsSync(fp)) return fs.readFileSync(fp, 'utf8');
    } catch {
      /* try next */
    }
  }
  return '';
}

const limit = parseCollectLimit(
  process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1],
);

function loadFcKey() {
  if (process.env.FIRECRAWL_API_KEY) return process.env.FIRECRAWL_API_KEY.trim();
  for (const p of [
    path.join(ROOT, '.env.firecrawl'),
    path.join(ROOT, '.firecrawl-key'),
    path.join(process.env.HOME || '', '.config/firecrawl/api_key'),
  ]) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const m = raw.match(/fc-[A-Za-z0-9]+/);
      if (m) return m[0];
    } catch {
      /* */
    }
  }
  return null;
}

function fcSearch(q, n = 8) {
  const env = { ...process.env };
  const key = loadFcKey();
  if (key) env.FIRECRAWL_API_KEY = key;
  const r = spawnSync('firecrawl', ['search', q, '--limit', String(n), '--json'], {
    encoding: 'utf8',
    timeout: 60000,
    env,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (r.error || r.status !== 0) {
    throw new Error(`Firecrawl search failed: ${r.error?.message || String(r.stderr || '').trim() || `exit ${r.status}`}`);
  }
  try {
    const j = JSON.parse(r.stdout || '{}');
    const web = j.data?.web || j.data || [];
    return Array.isArray(web) ? web : [];
  } catch (error) {
    throw new Error(`Firecrawl search returned invalid JSON: ${error.message}`);
  }
}

/** Keep successful searches; fail closed only when every query failed. */
export function runSearchQueries(queries, search = fcSearch, onAllFailed = () => {}) {
  const results = [];
  const errors = [];
  for (const q of queries) {
    try { results.push({ q, hits: search(q, 8) }); }
    catch (error) { errors.push({ q, error: String(error?.message || error) }); }
  }
  if (queries.length && errors.length === queries.length) {
    onAllFailed(errors);
    throw new Error(`all Firecrawl searches failed: ${errors.map((x) => x.error).join('; ')}`);
  }
  return { results, errors };
}

/** Last firecrawl scrape transport error (credits, spawn, etc.) — for enrich abort honesty. */
export let lastFcScrapeError = null;

/** Scrape one URL → markdown text (CLI). Null means transport failure. */
export function fcScrape(url) {
  lastFcScrapeError = null;
  if (!url) return null;
  const env = { ...process.env };
  const key = loadFcKey();
  if (key) env.FIRECRAWL_API_KEY = key;
  try {
    fs.mkdirSync(BUSY, { recursive: true });
  } catch {
    /* */
  }
  const out = path.join(BUSY, `enrich-scrape-${process.pid}-${randomUUID()}.md`);
  const r = spawnSync('firecrawl', ['scrape', String(url), '-o', out], {
    encoding: 'utf8',
    timeout: 90000,
    env,
    maxBuffer: 8 * 1024 * 1024,
  });
  try {
    if (r.status === 0 && fs.existsSync(out)) {
      const md = fs.readFileSync(out, 'utf8');
      try {
        fs.unlinkSync(out);
      } catch {
        /* */
      }
      return String(md || '');
    }
  } catch {
    /* */
  }
  const errText = String(r.stderr || r.stdout || r.error?.message || '').trim();
  if (/Insufficient credits/i.test(errText)) lastFcScrapeError = 'firecrawl_insufficient_credits';
  else if (r.error) lastFcScrapeError = `firecrawl_spawn:${r.error.message}`;
  else if (errText) lastFcScrapeError = errText.slice(0, 240);
  else lastFcScrapeError = `firecrawl_exit_${r.status ?? 'unknown'}`;
  try {
    if (fs.existsSync(out)) fs.unlinkSync(out);
  } catch {
    /* */
  }
  return null;
}

/**
 * --enrich [--id=LEAD] [--limit=10]
 * Scrape partner + talent posting URLs; attach only contacts literally on-page.
 */
export function cmdEnrich({ id = null, limit: lim = 10, dryRun = false } = {}) {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: 'leads_read_failed', detail: String(e.message || e) }));
    process.exitCode = 1;
    return { ok: false };
  }
  const partners = Array.isArray(doc.partners) ? doc.partners : [];
  const talent = Array.isArray(doc.talent) ? doc.talent : [];
  // Partner + talent (FOCUS: holds_scrape_due includes both sides)
  const pool = [...partners, ...talent];
  const targets = selectEnrichTargets(pool, { id, limit: lim });
  const results = [];
  const pending = [];
  const pages = new Map();
  const at = new Date().toISOString();
  let transportAbort = null; // e.g. firecrawl_insufficient_credits — stop burning API

  for (const lead of targets) {
    const url = enrichScrapeUrl(lead) || lead.url;
    let page = '';
    let scrapeOk = false;
    let scrapeCompleted = false;
    let hopUrl = null;
    let extracted = { contactEmail: null, handle: null, applyUrl: null };
    if (transportAbort) {
      pending.push({
        lead,
        extracted,
        url,
        hopUrl: null,
        scrapeOk: false,
        scrapeCompleted: false,
        skipped: transportAbort,
      });
      continue;
    }
    if (!dryRun && url) {
      const scraped = pages.has(url) ? pages.get(url) : fcScrape(url);
      pages.set(url, scraped);
      scrapeCompleted = scraped !== null;
      page = scraped || '';
      scrapeOk = page.length > 40;
      if (!scrapeCompleted && lastFcScrapeError === 'firecrawl_insufficient_credits') {
        transportAbort = lastFcScrapeError;
      }
    }
    extracted = extractContactFromPage(page);
    let enriched = applyContactEnrich(lead, extracted, { url, at });
    // Second hop: listing only gave ATS applyUrl → scrape that host for real contact
    const hop = shouldEnrichSecondHop(enriched, extracted, url);
    if (hop && !dryRun && !transportAbort) {
      hopUrl = hop;
      const page2 = pages.has(hop) ? pages.get(hop) : fcScrape(hop);
      pages.set(hop, page2);
      scrapeCompleted ||= page2 !== null;
      if (!page2 && lastFcScrapeError === 'firecrawl_insufficient_credits') {
        transportAbort = lastFcScrapeError;
      }
      if ((page2 || '').length > 40) {
        scrapeOk = true;
        const ex2 = extractContactFromPage(page2);
        enriched = applyContactEnrich(enriched, ex2, { url: hop, at });
        extracted = { ...extracted, ...ex2 };
      }
    }
    pending.push({ lead, extracted, url, hopUrl, scrapeOk, scrapeCompleted });
  }

  const finish = (current, item) => {
    const enriched = applyContactEnrich(current, item.extracted, { url: item.hopUrl || item.url, at });
    const transportFailed = !dryRun && !!item.url && !item.scrapeCompleted;
    applyEnrichAttemptStamp(enriched, {
      scrapeCompleted: !!item.scrapeCompleted,
      transportFailed,
      at,
      transportError:
        item.skipped ||
        transportAbort ||
        (!item.scrapeCompleted ? lastFcScrapeError : null) ||
        null,
    });
    const rel = releaseHoldIfContactable(enriched, { at, actor: 'enrich', note: 'enrich-found-contact' });
    const usableContact = !!(
      isUsableOutreachEmail(enriched.contactEmail || enriched.email) ||
      isUsableOutreachHandle(enriched.handle)
    );
    const exh = item.scrapeCompleted ? stampEnrichExhausted(enriched, { at }) : { exhausted: false };
    results.push({
      id: current.id,
      url: item.url,
      listingUrl: current.url || null,
      hopUrl: item.hopUrl,
      scrapeOk: item.scrapeOk,
      transportFailed,
      skipped: item.skipped || null,
      contactEmail: enriched.contactEmail || null,
      handle: enriched.handle || null,
      applyUrl: enriched.applyUrl || null,
      usableContact,
      found: Boolean(
        usableContact ||
          item.extracted.contactEmail ||
          item.extracted.handle ||
          item.extracted.applyUrl,
      ),
      released: !!rel.released,
      state: enriched.state || enriched.status || null,
      enrichAttemptedAt: enriched.enrichAttemptedAt || null,
      enrichAttemptCount: Number(enriched.enrichAttemptCount) || 0,
      enrichExhausted: !!exh.exhausted,
      policyHoldReason: enriched.policyHoldReason || null,
    });
    return enriched;
  };

  if (dryRun) {
    for (const item of pending) finish(item.lead, item);
  } else if (pending.length) {
    withFileLock(CRM_LOCK, () => {
      doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      const currentPartners = Array.isArray(doc.partners) ? doc.partners : [];
      const currentTalent = Array.isArray(doc.talent) ? doc.talent : [];
      for (const item of pending) {
        const list = isTalentLead(item.lead) ? currentTalent : currentPartners;
        const index = list.findIndex((row) => row.id === item.lead.id);
        if (index < 0) continue;
        list[index] = finish(list[index], item);
      }
      doc.partners = currentPartners;
      doc.talent = currentTalent;
      doc.at = at;
      writeLeadsJson(OUT, doc);
    });
  }

  // Re-draft only when usable email|handle (url/apply-only is not draftable — FOCUS)
  const { redrafted, failures: redraftFailures } = dryRun
    ? { redrafted: [], failures: [] }
    : redraftEnrichedLeads(results);

  const transportFailures = results.filter((r) => r.transportFailed).length;
  const report = {
    ok: transportFailures === 0 && redraftFailures.length === 0,
    mode: 'enrich',
    at,
    limit: lim,
    id: id || null,
    targets: targets.length,
    results,
    transportFailures,
    transportAbort: transportAbort || null,
    lastFcScrapeError: lastFcScrapeError || null,
    redrafted,
    redraftFailures,
    firecrawl: Boolean(loadFcKey()),
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
  return report;
}

function readScrapes() {
  const out = [];
  if (!fs.existsSync(SCRAPE_DIR)) return out;
  for (const f of fs.readdirSync(SCRAPE_DIR).filter((x) => x.endsWith('.md'))) {
    const md = fs.readFileSync(path.join(SCRAPE_DIR, f), 'utf8');
    out.push({ file: f, md, source: f.replace(/_/g, '.') });
  }
  return out;
}

/**
 * Aggregator/SERP hosts — scrape *sources*, not partner leads.
 * YC directory/jobs/events index pages included; company-specific YC job URLs also
 * match (recipe scrapes may re-parse real roles later; SERP noise is worse).
 * Recruiting agencies (RFS, Triplebyte-class boards) are not SF hireable founders.
 */
export const AGGREGATOR_URL_RE =
  /indeed\.|ziprecruiter\.|wellfound\.|builtinsf\.|startup\.jobs|topstartups\.io|workatastartup\.com|linkedin\.com\/jobs|join\.com|reddit\.com|events\.ycombinator\.com|ycombinator\.com\/(companies|jobs|careers|events|apply)|recruitingfromscratch\.com|triplebyte\.com|hired\.com\/jobs|otta\.com\/jobs|levels\.fyi\/jobs/i;

export function isAggregatorUrl(url) {
  return AGGREGATOR_URL_RE.test(String(url || ''));
}

/**
 * Pure: not a real startup company website for enrich hops.
 * Catches YC corporate /about, builtin company pages, job boards, social, self.
 */
export function isJunkCompanyUrl(url) {
  const u = String(url || '').trim();
  if (!u) return true;
  if (isOwnSiteUrl(u) || isAggregatorUrl(u)) return true;
  // Full YC host (not just /companies|/jobs) — footer links pollute WaaS scrapes
  if (/ycombinator\.com/i.test(u)) return true;
  if (/workatastartup\.com/i.test(u)) return true;
  if (/builtinsf?\.com/i.test(u)) return true;
  if (/wellfound\.com|angellist\.com/i.test(u)) return true;
  if (/linkedin\.com|indeed\.com|glassdoor\.com|levels\.fyi/i.test(u)) return true;
  if (/(?:^|[/.])(?:x|twitter|facebook|instagram|youtube|tiktok)\.com/i.test(u)) return true;
  if (/github\.com|notion\.(so|site)|typeform\.com|google\.com|calendly\.com/i.test(u)) return true;
  return false;
}

/** Junk mint ids from old companyHits / fragment parsers */
export function isJunkPartnerId(id) {
  return /^web(-co)?-/i.test(String(id || ''));
}

/**
 * True for aggregator/SERP noise that should never sit in draft/approve queues.
 * Exception: deliberate WaaS job scrapes (`waas-*` + /jobs/<id>) keep real postings.
 * Own product site is never a partner/talent lead (footer email pollution).
 * X status URLs from org/job-board accounts (NOISE_HANDLE_RE) are SERP noise, not people.
 */
export function isJunkAggregatorLead(lead) {
  if (!lead || typeof lead !== 'object') return false;
  const id = String(lead.id || '');
  if (isJunkPartnerId(id)) return true;
  const url = String(lead.url || '');
  if (isOwnSiteUrl(url)) return true;
  if (isTalentLead(lead) && /\/locations?\//i.test(url)) return true;
  // x.com/SFSoftwareJobs/status/… etc. — aggregator accounts, not hireable partners
  const xAcct = url.match(/(?:^|[/.])(?:x|twitter)\.com\/([A-Za-z0-9_]+)(?:\/|$|\?)/i);
  if (xAcct && NOISE_HANDLE_RE.test(xAcct[1])) return true;
  if (/^waas-/i.test(id) && /workatastartup\.com\/jobs\/\d+/i.test(url)) return false;
  return isAggregatorUrl(url);
}

/**
 * Pure: force-disqualify aggregator/SERP junk that still sits active.
 * Re-collect re-attach preserves advanced state — without this, drafted junk
 * resurfaces after AGG regex expands (e.g. recruitingfromscratch).
 * Idempotent: already-disqualified → demoted=false. Keeps history for audit.
 */
export function demoteJunkLead(
  lead,
  { actor = 'agent', note = 'junk-aggregator-or-fragment', at } = {},
) {
  if (!lead || typeof lead !== 'object') return { lead, demoted: false };
  if (!isJunkAggregatorLead(lead)) return { lead, demoted: false };
  const st = String(lead.state || lead.status || '').toLowerCase();
  if (st === 'disqualified') return { lead, demoted: false };
  const from = lead.state || lead.status || 'sourced';
  const ts = at || new Date().toISOString();
  const next = { ...lead };
  next.state = 'disqualified';
  next.status = 'disqualified';
  next.stateUpdatedAt = ts;
  next.stateHistory = [
    ...(Array.isArray(lead.stateHistory) ? lead.stateHistory : []),
    { at: ts, from, to: 'disqualified', actor, evidence: null, note },
  ];
  return { lead: next, demoted: true };
}

/** Company line is a SERP fragment / stopword, not a real startup name */
const COMPANY_STOP =
  /^(B2B|B2C|Saved|Top|Showed|Expanding|Rapidly|We|The)\b/i;

/** Title must look like a hireable role (not "Open role(s)" / marketing fluff) */
const ROLE_WORD =
  /engineer|founder|designer|manager|marketer|growth|sales|ops|product|security|hardware/i;

/**
 * Pull company/role-ish lines from board scrapes (pure).
 * No companyHits block — that minted web-co-* junk ("Top Companies").
 */
export function parsePartnerLines(md, source) {
  const leads = [];
  // Patterns: **Company** — Role, Company is hiring Role
  const re =
    /(?:^|\n)\s*(?:[-*•]|\d+\.)?\s*(?:\*\*)?([A-Z][A-Za-z0-9 .&'/-]{1,40})(?:\*\*)?\s*(?:[—–\-:|]|is hiring|hiring)\s+([A-Za-z][A-Za-z0-9 /+&-]{2,60})/g;
  let m;
  const blob = String(md || '').slice(0, 80000);
  while ((m = re.exec(blob)) && leads.length < 40) {
    const company = m[1].trim();
    const role = m[2].trim();
    if (/http|www\.|click|apply|view|more|cookie|privacy/i.test(company + role)) continue;
    if (company.length < 2 || role.length < 3) continue;
    if (COMPANY_STOP.test(company)) continue;
    if (!ROLE_WORD.test(role)) continue;
    leads.push({
      id: leadId('web', company + '|' + role),
      type: 'partner',
      company,
      title: role,
      location: 'SF Bay (from listing)',
      source: 'firecrawl:' + source,
      signal: 'public job listing',
      score: 55,
      status: 'triage',
    });
  }
  return leads;
}

export const isSfBayLocation = (location) => /\bSF\b|\bSan Francisco\b|\bBay Area\b/i.test(String(location || ''));

/**
 * Parse Work at a Startup / YC jobs markdown scrape into partner leads.
 * Prefer San Francisco (or Bay) locations; keep founding/eng/product roles.
 * Pure — no network. Job URL is public listing (not invented email).
 */
export function parseWorkAtAStartupJobs(md, { sfOnly = true, limit = 40 } = {}) {
  const leads = [];
  const text = String(md || '');
  // [Company (BATCH)•blurb](https://www.workatastartup.com/companies/slug)
  // [Role title](https://www.workatastartup.com/jobs/ID)
  // FulltimeSan Francisco, CA, US...
  const companyRe =
    /\[([^\]]+?)\s*\(([A-Z]\d{2}|[WP]\d{2}|S\d{2})\)[^\]]*\]\((https:\/\/www\.workatastartup\.com\/companies\/[a-z0-9-]+)\)/gi;
  const jobRe =
    /\[([^\]]{3,80})\]\((https:\/\/www\.workatastartup\.com\/jobs\/\d+)\)/gi;

  // Build job blocks: between job links, capture following location line
  const jobs = [];
  let jm;
  while ((jm = jobRe.exec(text)) && jobs.length < 200) {
    const title = jm[1].trim();
    const url = jm[2];
    if (/^Apply$/i.test(title)) continue;
    if (!ROLE_WORD.test(title) && !/founding|engineer|designer|product|growth|security/i.test(title)) {
      continue;
    }
    const after = text.slice(jm.index, jm.index + 400);
    const locM = after.match(
      /Fulltime\s*([^\[\n]{0,80}?)(?:Full stack|Backend|Frontend|Remote|\$|€|Apply)/i,
    );
    const loc = (locM?.[1] || after.match(/San Francisco|Bay Area|SF\b|Remote/i)?.[0] || '').trim();
    jobs.push({ title, url, loc, index: jm.index });
  }

  // nearest company before each job
  const companies = [];
  let cm;
  while ((cm = companyRe.exec(text))) {
    const rawName = cm[1].replace(/\s+/g, ' ').trim();
    const company = rawName.split(/[•·]/)[0].trim();
    companies.push({
      company,
      batch: cm[2],
      companyUrl: cm[3],
      index: cm.index,
    });
  }

  for (const j of jobs) {
    if (sfOnly && j.loc && !/San Francisco|Bay Area|\bSF\b|CA,\s*US/i.test(j.loc) && !/Remote/i.test(j.loc)) {
      // allow remote-US if SF mentioned elsewhere? stick to SF preference
      if (!isSfBayLocation(j.loc)) continue;
    }
    if (sfOnly && !j.loc) {
      // no location line — skip unless title implies SF later; keep founding eng carefully
      // Prefer skip to avoid non-SF noise
      continue;
    }
    if (sfOnly && /Remote/i.test(j.loc) && !isSfBayLocation(j.loc)) continue;

    let co = { company: '(YC startup)', batch: '', companyUrl: '' };
    for (let i = companies.length - 1; i >= 0; i--) {
      if (companies[i].index < j.index) {
        co = companies[i];
        break;
      }
    }
    const id = leadId('waas', j.url);
    leads.push({
      id,
      type: 'partner',
      company: co.company,
      title: j.title,
      location: j.loc || 'San Francisco',
      source: 'firecrawl:workatastartup',
      signal: `YC ${co.batch || 'WaaS'} · ${j.loc}`.slice(0, 200),
      url: j.url,
      companyUrl: co.companyUrl || undefined,
      score: /founding/i.test(j.title) ? 72 : /San Francisco/i.test(j.loc) ? 65 : 55,
      state: 'sourced',
      status: 'sourced',
    });
    if (leads.length >= limit) break;
  }
  return leads;
}

/**
 * Parse Wellfound SF location jobs scrape → partner leads.
 * Pure — public job URLs only; no invented emails. Prefer eng/founding/product roles.
 */
export function parseWellfoundSfJobs(md, { limit = 40 } = {}) {
  const leads = [];
  const text = String(md || '');
  // [**Checkr**](https://wellfound.com/company/checkr)
  const coRe = /\[\*\*([^*]+)\*\*\]\((https:\/\/wellfound\.com\/company\/[a-z0-9-]+)\)/gi;
  // [Role title](https://wellfound.com/jobs/12345-slug) Full-time
  const jobRe =
    /\[([^\]]{3,100})\]\((https:\/\/wellfound\.com\/jobs\/\d+[a-z0-9-]*)\)\s*Full-time/gi;

  const companies = [];
  let cm;
  while ((cm = coRe.exec(text))) {
    companies.push({ company: cm[1].trim(), companyUrl: cm[2], index: cm.index });
  }

  let jm;
  while ((jm = jobRe.exec(text)) && leads.length < limit) {
    const title = jm[1].trim();
    const url = jm[2];
    if (!ROLE_WORD.test(title) && !/founding|engineer|designer|product|growth|security|data/i.test(title)) {
      continue;
    }
    // skip non-SF title tags if explicit other geo in title only (page is SF list)
    if (/\b(Mexico|Bengaluru|India|London|Paris|Remote only)\b/i.test(title) && !/San Francisco|SF\b/i.test(title)) {
      continue;
    }
    let co = { company: '(Wellfound SF)', companyUrl: '' };
    for (let i = companies.length - 1; i >= 0; i--) {
      if (companies[i].index < jm.index) {
        co = companies[i];
        break;
      }
    }
    leads.push({
      id: leadId('wf', url),
      type: 'partner',
      company: co.company,
      title,
      location: 'San Francisco',
      source: 'firecrawl:wellfound',
      signal: 'Wellfound SF startup job listing',
      url,
      companyUrl: co.companyUrl || undefined,
      score: /founding/i.test(title) ? 70 : /senior|staff/i.test(title) ? 62 : 58,
      state: 'sourced',
      status: 'sourced',
    });
  }
  return leads;
}

/**
 * Parse Built In SF "companies hiring" scrape → partner leads (Engineering open roles).
 * Pure — company jobs URL only; no invented emails.
 */
export function parseBuiltinSfHiring(md, { limit = 40 } = {}) {
  const leads = [];
  const text = String(md || '');
  // [**Datadog**](https://www.builtinsf.com/company/datadog)
  const coRe = /\[\*\*([^*]+)\*\*\]\((https:\/\/www\.builtinsf\.com\/company\/[a-z0-9-]+)\)/gi;
  const seen = new Set();
  let m;
  while ((m = coRe.exec(text)) && leads.length < limit) {
    const company = m[1].trim();
    const companyUrl = m[2];
    if (seen.has(companyUrl)) continue;
    const after = text.slice(m.index, m.index + 800);
    const engM = after.match(/Engineering\s*\((\d+)\)/i);
    if (!engM) continue;
    const engOpen = Number(engM[1]) || 0;
    if (engOpen < 1) continue;
    seen.add(companyUrl);
    const jobsUrl = companyUrl.replace(/\/?$/, '') + '/jobs';
    leads.push({
      id: leadId('bis', companyUrl),
      type: 'partner',
      company,
      title: `Engineering roles open (${engOpen}) — Built In SF`,
      location: 'San Francisco',
      source: 'firecrawl:builtinsf',
      signal: `${engOpen} eng openings on Built In SF`,
      url: jobsUrl,
      companyUrl,
      score: engOpen >= 5 ? 62 : 55,
      state: 'sourced',
      status: 'sourced',
    });
  }
  return leads;
}

/**
 * Pure SERP index / board-listing titles — not a hireable company posting.
 * Residual P0-1: non-AGG hosts still mint "Founding Engineer jobs in SF Bay Area".
 */
export function isSerpListingTitle(title) {
  const t = String(title || '').trim();
  if (!t) return true;
  if (/\bjobs\s+(in|near|at)\b/i.test(t)) return true;
  if (/\b(remote\s+)?jobs\b.{0,40}\b(SF|San Francisco|Bay Area|, CA)\b/i.test(t)) return true;
  if (/^(top|best|latest|new)\s+\d*\s*jobs?\b/i.test(t)) return true;
  if (/\bjobs\s+at\s+startups?\b/i.test(t)) return true;
  if (/\bhiring\s+now\b/i.test(t) && !ROLE_WORD.test(t)) return true;
  return false;
}

/**
 * Pure: company + role from a search hit title/desc.
 * Prefer "Role @ Company" / "Role at Company"; never invent contact.
 */
export function parsePartnerHitFields(title, desc) {
  const t = String(title || '').trim();
  const d = String(desc || '').trim();
  const atCo = t.match(/^(.+?)\s+@\s+(.+)$/);
  if (atCo) {
    return {
      company: atCo[2].trim().slice(0, 80),
      title: atCo[1].trim().slice(0, 100) || d.slice(0, 100) || 'Hiring signal',
    };
  }
  const atWord = t.match(/^(.+?)\s+at\s+([A-Z][\w .&'/-]{1,50})$/);
  if (atWord && ROLE_WORD.test(atWord[1])) {
    return {
      company: atWord[2].trim().slice(0, 80),
      title: atWord[1].trim().slice(0, 100),
    };
  }
  // Title is already a short role-ish label → company unknown, keep title as company seed
  // only when desc carries the role (legacy ashby hits like "Clera founding eng").
  return {
    company: t.slice(0, 80),
    title: d.slice(0, 100) || 'Hiring signal',
  };
}

/** Firecrawl search hits → leads (pure). Drops aggregator/SERP URLs (partner + talent). */
export function parseSearchHits(hits, kind, query = '') {
  const out = [];
  const list = Array.isArray(hits) ? hits : [];
  for (let i = 0; i < list.length; i++) {
    const h = list[i] || {};
    const title = h.title || '';
    const url = h.url || '';
    const desc = h.description || '';
    // Aggregators are scrape sources, never people or hireable partners
    if (isAggregatorUrl(url)) continue;
    // Company location/service pages are not individual talent profiles.
    if (kind === 'talent' && /\/locations?\//i.test(url)) continue;
    if (kind === 'partner') {
      // Index-style titles are not partners even on real hosts (e.g. ashby board index)
      if (isSerpListingTitle(title)) continue;
      // Require a hireable role word somewhere (same bar as parsePartnerLines)
      if (!ROLE_WORD.test(title + ' ' + desc)) continue;
      if (COMPANY_STOP.test(title)) continue;
      const fields = parsePartnerHitFields(title, desc);
      if (COMPANY_STOP.test(fields.company)) continue;
      out.push({
        id: leadId('fc-p', url || title + i),
        type: 'partner',
        company: fields.company,
        title: fields.title,
        url,
        location: isSfBayLocation(title + desc) ? 'SF Bay' : 'unknown',
        source: 'firecrawl-search',
        provenance: { kind: 'firecrawl-search', query },
        signal: desc.slice(0, 200),
        score: /SF|San Francisco|YC|seed|founding/i.test(title + desc) ? 60 : 40,
        status: 'triage',
      });
      continue;
    }
    out.push({
      id: leadId('fc-t', url || title + i),
      type: 'talent',
      name: title.slice(0, 80),
      skills: desc.slice(0, 160),
      url,
      location: isSfBayLocation(title + desc) ? 'SF Bay' : 'unknown',
      source: 'firecrawl-search',
      provenance: { kind: 'firecrawl-search', query },
      signal: desc.slice(0, 200),
      score: /open to work|founding|engineer|designer|looking for/i.test(title + desc) ? 55 : 35,
      status: 'triage',
    });
  }
  return out;
}

/** Final CRM yield for one paid search query. */
export function searchQueryYield(rows, query, parsed) {
  const retained = rows.filter((lead) => lead?.provenance?.kind === 'firecrawl-search' && lead.provenance.query === query);
  return {
    hits: Array.isArray(parsed.hits) ? parsed.hits.length : 0,
    parsed: parsed.rows.length,
    retained: retained.length,
    disqualified: retained.filter((lead) => (lead.state || lead.status) === 'disqualified').length,
  };
}

/** SF Bay geo gate for Events Bot → lead export. Empty city = allow (store is SF-only). */
export function isEventsBotSf(loc = '') {
  const s = String(loc || '');
  if (!s.trim()) return true;
  return /SF|San Francisco|Bay|SoMa|Mission|Oakland|Berkeley|Peninsula/i.test(s);
}

/**
 * Consent gate for Events Bot people export. Never invents.
 * Offers: self-submitted form counts as consent unless declined/spam.
 * Contacts: require explicit consent|consented|consentedAt|optIn (or notes/rsvp-yes).
 */
export function isEventsBotConsented(row = {}, { kind = 'contact' } = {}) {
  if (!row || typeof row !== 'object') return false;
  const status = String(row.status || '').toLowerCase();
  if (/decline|reject|spam|unsubscribe|opt.?out|bounced/.test(status)) return false;
  if (row.consent === true || row.consented === true || row.optIn === true || row.opt_in === true) {
    return true;
  }
  if (row.consentedAt || row.consentAt) return true;
  if (kind === 'offer') {
    // Offer form submission with an email is explicit interest (not cold scrape)
    return Boolean(String(row.email || '').trim());
  }
  // contacts / attendees: fail-closed without explicit flag
  const blob = `${row.notes || ''} ${row.role || ''} ${row.source || ''}`;
  return /consent|opt.?in|rsvp.?yes|attendee.?yes|explicit/i.test(blob);
}

/**
 * Events Bot store → leads with provenance. Never invents emails.
 * Only exports consented offers/contacts that already carry an address, and SF
 * calendar/events as partner signals without fabricated people.
 */
export function eventsBotLeads(eventsPath = path.join(ROOT, 'DEMIGOD-EVENTS.json')) {
  const partners = [];
  const talent = [];
  let store;
  try {
    store = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  } catch {
    return { partners, talent, events: 0 };
  }
  const skipEmail = (e) =>
    !e ||
    !isUsableOutreachEmail(e) ||
    /offline-check@|noreply@|^potter@trydemigod\.com$/i.test(String(e));

  const offers = store.offers || {};
  for (const kind of ['volunteer', 'sponsor', 'venue']) {
    for (const o of offers[kind] || []) {
      const email = String(o.email || '').trim();
      if (skipEmail(email)) continue;
      if (!isEventsBotConsented(o, { kind: 'offer' })) continue;
      const city = String(o.city || '');
      if (city && !isEventsBotSf(city)) continue;
      const base = {
        email,
        location: city || 'San Francisco',
        source: 'events-bot:' + kind,
        signal: String(o.offer || o.notes || o.kind || kind).slice(0, 200),
        url: o.url || 'https://www.trydemigod.com/?p=events',
        eventId: o.eventId || store.activeEvent?.id || null,
        state: 'sourced',
        status: 'sourced',
        at: o.at,
        consented: true,
        provenance: { kind: 'events-bot-offer', offerKind: kind, offerId: o.id || null },
      };
      if (kind === 'volunteer') {
        talent.push({
          ...base,
          id: 'evt-' + (o.id || leadId('ev', email)),
          type: 'talent',
          name: o.name || email.split('@')[0],
          skills: o.capacity || o.offer || 'events volunteer',
          score: 50,
        });
      } else {
        partners.push({
          ...base,
          id: 'evt-' + (o.id || leadId('ev', email)),
          type: 'partner',
          company: o.org || o.name || kind,
          title: kind === 'sponsor' ? 'Event sponsor / partner' : 'Venue partner',
          score: kind === 'sponsor' ? 55 : 45,
        });
      }
    }
  }

  // Consented contacts / attendees (fail-closed: need explicit consent flag)
  for (const c of store.contacts || []) {
    const email = String(c.email || '').trim();
    if (skipEmail(email)) continue;
    if (!isEventsBotConsented(c, { kind: 'contact' })) continue;
    if (c.city && !isEventsBotSf(c.city)) continue;
    const role = String(c.role || 'contact').toLowerCase();
    const isTalent = /volunteer|talent|engineer|candidate|seeker|attendee/.test(role);
    const base = {
      email,
      location: c.city || 'San Francisco',
      source: 'events-bot:contact',
      signal: String(c.notes || c.role || 'events contact').slice(0, 200),
      url: 'https://www.trydemigod.com/?p=events',
      eventId: c.eventId || store.activeEvent?.id || null,
      state: 'sourced',
      status: 'sourced',
      at: c.at || c.consentedAt || c.consentAt,
      consented: true,
      provenance: { kind: 'events-bot-contact', contactId: c.id || null },
    };
    if (isTalent) {
      talent.push({
        ...base,
        id: 'evt-ct-' + (c.id || leadId('evc', email)),
        type: 'talent',
        name: c.name || email.split('@')[0],
        skills: c.notes || c.role || 'events attendee',
        score: 55,
      });
    } else {
      partners.push({
        ...base,
        id: 'evt-ct-' + (c.id || leadId('evc', email)),
        type: 'partner',
        company: c.org || c.name || 'Events contact',
        title: c.role || 'Events contact',
        score: 50,
      });
    }
  }

  // Count event signals for status; contactless events stay in the Events store.
  const events = [];
  if (store.activeEvent?.id) events.push(store.activeEvent);
  for (const e of store.events || []) {
    if (e && e.id && !events.some((x) => x.id === e.id)) events.push(e);
  }
  const cal = (store.calendarEvents || []).filter((e) => e && e.id && e.title).slice(0, 12);

  return { partners, talent, events: events.length + cal.length };
}

/** Incomplete WIZ bags stay in submissions-inbox until they identify a person/company. */
export function isActionableInboxItem(form, raw, email = '') {
  if (/startup|hire|partner/.test(form)) return Boolean(email || raw['company-name'] || raw.company);
  if (/engineer|talent|seeker|candidate|sms/.test(form)) {
    return Boolean(email || raw['linkedin-url'] || raw.linkedin || raw['full-name'] || raw.name);
  }
  return false;
}

function inboxLeads() {
  const partners = [];
  const talent = [];
  let inbox;
  try {
    inbox = loadInbox();
  } catch {
    return { partners, talent };
  }
  const items = inbox.items || [];
  for (const i of items) {
    const form = String(i.form || '').toLowerCase();
    const raw = i.raw || {};
    const status = String(i.status || 'new');
    if (/spam|reject|playtest|e2e/i.test(status + JSON.stringify(i.rejectReasons || []))) continue;

    // Same email helper as funnel join (extractEmail + fallbacks)
    const email =
      extractEmail(raw, form) ||
      String(raw['contact-email'] || raw.email || raw['partner-email'] || raw['seeker-email'] || '')
        .toLowerCase()
        .trim();

    if (!isActionableInboxItem(form, raw, email)) continue;

    if (/startup|hire|partner/.test(form)) {
      const lead = {
        id: 'inbox-' + i.id,
        type: 'partner',
        company: raw['company-name'] || raw.company || '(from WIZ)',
        title: raw['role-title'] || raw.role || 'Role',
        stage: raw['company-stage'] || raw.stage || '',
        skills: raw['stack-needs'] || raw.skills || '',
        outcome90d: raw['90day-outcome'] || '',
        email: email || '',
        location: 'SF Bay (WIZ focus)',
        source: 'submissions-inbox:' + form,
        signal: 'inbound WIZ',
        score: raw['90day-outcome'] ? 75 : 55,
        status: status === 'featured' ? 'warm' : 'triage',
        at: i.at,
      };
      // No email → cannot outbound-reply; park (synthetic/empty inbox era)
      if (!lead.email) {
        lead.state = 'policy_hold';
        lead.status = 'policy_hold';
        lead.policyHoldReason = 'no-contact-email';
      }
      partners.push(lead);
    } else if (/engineer|talent|seeker|candidate|sms/.test(form)) {
      // skip obvious mock/pending SMS fakes
      if (/@pending\.example|1415555/i.test(email + (raw.phone || ''))) continue;
      const lead = {
        id: 'inbox-' + i.id,
        type: 'talent',
        name: raw['full-name'] || raw.name || '(from WIZ)',
        email: email || '',
        skills: raw['skills-stack'] || raw.skills || '',
        experience: raw.experience || '',
        location: raw['sf-bay'] === 'yes' || isSfBayLocation(raw.location) ? 'SF Bay' : raw.location || '',
        linkedin: raw['linkedin-url'] || raw.linkedin || '',
        source: 'submissions-inbox:' + form,
        signal: 'inbound WIZ/SMS',
        score: (raw.experience ? 20 : 0) + (raw['skills-stack'] ? 25 : 0) + (/sf|bay|yes/i.test(String(raw['sf-bay'])) ? 25 : 0) + 20,
        status: 'triage',
        at: i.at,
      };
      if (!lead.email && !lead.linkedin) {
        lead.state = 'policy_hold';
        lead.status = 'policy_hold';
        lead.policyHoldReason = 'no-contact-email';
      }
      talent.push(lead);
    }
  }
  return { partners, talent };
}

/** Curated public X/web signals from this session (static seed; live X tool results folded in via file if present) */
export function sessionXLeads(xPath = path.join(BUSY, 'x-signals.json')) {
  if (fs.existsSync(xPath)) {
    try {
      const signals = JSON.parse(fs.readFileSync(xPath, 'utf8'));
      if (signals.sourceKind === 'static-fallback') {
        const observed = Date.parse(signals.observedAt);
        const expires = Date.parse(signals.expiresAt);
        if (!Number.isFinite(observed) || !Number.isFinite(expires) || observed > Date.now() || expires <= observed || expires <= Date.now()) {
          return { partners: [], talent: [] };
        }
      }
      return {
        ...signals,
        partners: Array.isArray(signals?.partners) ? signals.partners : [],
        talent: Array.isArray(signals?.talent) ? signals.talent : [],
      };
    } catch {
      /* */
    }
  }
  return { partners: [], talent: [] };
}

function dedupe(leads, keyFn) {
  const seen = new Set();
  const out = [];
  for (const l of leads) {
    const k = keyFn(l);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out;
}

function scorePartner(l) {
  let s = l.score || 40;
  if (isSfBayLocation(l.location)) s += 15;
  if (/founding|seed|pre-seed|yc/i.test(JSON.stringify(l))) s += 15;
  if (l.source?.startsWith('submissions-inbox')) s += 20;
  if (l.outcome90d) s += 10;
  if (l.email && !/@pending/i.test(l.email)) s += 10;
  return Math.min(100, s);
}

function scoreTalent(l) {
  let s = l.score || 30;
  if (isSfBayLocation(l.location)) s += 20;
  if (l.skills) s += 15;
  if (l.experience) s += 10;
  if (l.source?.startsWith('submissions-inbox')) s += 25;
  if (l.linkedin) s += 10;
  if (/founding|open to work|looking for/i.test(JSON.stringify(l))) s += 10;
  return Math.min(100, s);
}

function main() {
  fs.mkdirSync(BUSY, { recursive: true });

  // Write X signals from this agent session (public posts only)
  const xSignals = {
    sourceKind: 'static-fallback',
    observedAt: '2026-07-16T00:00:00Z',
    expiresAt: '2026-08-15T00:00:00Z',
    partners: [
      {
        id: 'x-tensorlake',
        type: 'partner',
        company: 'TensorLake',
        title: 'Distributed Systems Engineer',
        location: 'San Francisco',
        source: 'x:@theconsensusdev',
        signal: 'Public hiring mention Jul 2026',
        url: 'https://x.com/theconsensusdev/status/2077783117306195978',
        score: 70,
        status: 'triage',
      },
      {
        id: 'x-pantograph',
        type: 'partner',
        company: 'Pantograph',
        title: 'Software Engineer',
        location: 'San Francisco',
        source: 'x:@SFSoftwareJobs',
        signal: 'Early-stage creator tools; SF hire',
        url: 'https://x.com/SFSoftwareJobs/status/2077592582553526541',
        score: 65,
        status: 'triage',
      },
      {
        id: 'x-paddox',
        type: 'partner',
        company: 'Paddox Technologies',
        title: 'Product Designer',
        location: 'SF / Remote / Dallas',
        source: 'x:@Gorvmishra',
        signal: 'Public hiring post; equity + cash',
        url: 'https://x.com/Gorvmishra/status/2077670297990504675',
        score: 55,
        status: 'triage',
      },
      {
        id: 'x-magic-ai',
        type: 'partner',
        company: 'Magic AI',
        title: 'Security Engineer',
        location: 'San Francisco',
        source: 'x:@securityblvd',
        signal: 'High-comp security hire SF',
        url: 'https://x.com/securityblvd/status/2077053030805938528',
        score: 60,
        status: 'triage',
      },
      {
        id: 'x-robotics-sf',
        type: 'partner',
        company: '(Robotics lab — see post)',
        title: 'Hardware Engineer – Robotics',
        location: 'San Francisco, CA',
        source: 'x:@jobswithsowmya',
        signal: 'ROS2/hardware; $140–240k + equity',
        url: 'https://x.com/jobswithsowmya/status/2075724023804428715',
        score: 62,
        status: 'triage',
      },
    ],
    talent: [
      {
        id: 'x-kaveri',
        type: 'talent',
        name: 'Kaveri Mekala',
        handle: '@MekalaKave15955',
        skills: 'AI, full-stack, founding eng; open to YC/a16z startups; relocation OK',
        location: 'open to SF',
        source: 'x:public',
        signal: 'Public: seeking Founding Engineer at YC/a16z-backed startups',
        url: 'https://x.com/MekalaKave15955/status/2076587114695995826',
        score: 72,
        status: 'triage',
      },
      {
        id: 'x-tavares',
        type: 'talent',
        name: 'Tavares',
        handle: '@Moofaces',
        skills: 'designer + founder; ex-Meta/LinkedIn; CoHost SF',
        location: 'Bay Area',
        source: 'x:public',
        signal: 'Bay Area designer/founder building in public',
        url: 'https://x.com/Moofaces/status/2077020952479908013',
        score: 58,
        status: 'triage',
      },
    ],
  };
  writeSeedIfMissing(path.join(BUSY, 'x-signals.json'), xSignals);
  const liveXSignals = sessionXLeads();

  const scrapes = readScrapes();
  let partners = [];
  let talent = [];

  for (const s of scrapes) {
    partners.push(...parsePartnerLines(s.md, s.file));
    // Deep YC Work-at-a-Startup job board parse (SF filter; no invent emails)
    if (/workatastartup|ycombinator.*jobs/i.test(s.file + s.source)) {
      partners.push(...parseWorkAtAStartupJobs(s.md, { sfOnly: true, limit: 30 }));
    }
    // Built In SF companies actively hiring Engineering
    if (/builtinsf|builtin.*sf/i.test(s.file + s.source)) {
      partners.push(...parseBuiltinSfHiring(s.md, { limit: 30 }));
    }
    // Wellfound SF job board
    if (/wellfound/i.test(s.file + s.source)) {
      partners.push(...parseWellfoundSfJobs(s.md, { limit: 30 }));
    }
  }

  // Firecrawl searches
  const partnerQueries = [
    'San Francisco seed startups hiring founding engineer',
    'YC San Francisco companies hiring 2026',
    'SF Series A startups hiring product manager designer',
  ];
  const talentQueries = [
    'San Francisco engineer open to work startup',
    'founding engineer looking for startup SF Bay',
  ];

  const errorReceipt = (errors) => atomicWrite(
    path.join(BUSY, 'search-errors-latest.json'),
    JSON.stringify({ at: new Date().toISOString(), errors }, null, 2) + '\n',
  );
  const searches = runSearchQueries([...partnerQueries, ...talentQueries], fcSearch, errorReceipt);
  const searchReceipts = [];
  for (const { q, hits } of searches.results.filter(({ q }) => partnerQueries.includes(q))) {
    const rows = parseSearchHits(hits, 'partner', q);
    partners.push(...rows);
    searchReceipts.push({ q, hits, rows });
  }
  for (const { q, hits } of searches.results.filter(({ q }) => talentQueries.includes(q))) {
    const rows = parseSearchHits(hits, 'talent', q);
    talent.push(...rows);
    searchReceipts.push({ q, hits, rows });
  }
  errorReceipt(searches.errors);

  const inbox = inboxLeads();
  partners.push(...inbox.partners);
  talent.push(...inbox.talent);
  partners.push(...(liveXSignals.partners || []));
  talent.push(...(liveXSignals.talent || []));
  const events = eventsBotLeads();
  partners.push(...events.partners);
  talent.push(...events.talent);

  partners = dedupe(partners, partnerDedupeKey);
  talent = dedupe(talent, talentDedupeKey);
  // Aggregator hosts are scrape sources, not leads (wellfound/builtin parsers etc.)
  partners = partners.filter((l) => !isJunkAggregatorLead(l));
  talent = talent.filter((l) => !isJunkAggregatorLead(l));

  let payload;
  withFileLock(CRM_LOCK, () => {
  // Preserve funnel state/history from a fresh snapshot (re-collect must not wipe)
  const prevById = previousLeadsById(OUT);
  partners = partners.map((l) => {
    attachPublicContact(l);
    l.score = scorePartner(l);
    if (!l.state) l.state = l.status && l.status !== 'triage' ? l.status : 'sourced';
    if (!l.status || l.status === 'triage') l.status = l.state;
    return mergeLeadState(l, prevById.get(l.id));
  });
  talent = talent.map((l) => {
    attachPublicContact(l);
    l.score = scoreTalent(l);
    if (!l.state) l.state = l.status && l.status !== 'triage' ? l.status : 'sourced';
    if (!l.status || l.status === 'triage') l.status = l.state;
    return mergeLeadState(l, prevById.get(l.id));
  });

  partners.sort((a, b) => b.score - a.score);
  talent.sort((a, b) => b.score - a.score);

  partners = partners.slice(0, limit);
  talent = talent.slice(0, limit);

  // Re-attach funnel history and durable inbound/event/manual rows that fell off the scrape cap.
  for (const [id, p] of prevById) {
    if (!shouldReattachLead(p)) continue;
    const inP = partners.some((x) => x.id === id);
    const inT = talent.some((x) => x.id === id);
    if (inP || inT) continue;
    // After URL-collision merges, do not resurrect a twin with the same posting URL.
    if (
      !isTalentLead(p) &&
      !String(p.source || '').startsWith('events-bot:')
    ) {
      const uk = partnerUrlDedupeKey(p.url || p.applyUrl);
      if (
        uk &&
        partners.some(
          (x) =>
            !String(x.source || '').startsWith('events-bot:') &&
            partnerUrlDedupeKey(x.url || x.applyUrl) === uk,
        )
      ) {
        continue;
      }
    }
    if (isTalentLead(p)) talent.push(p);
    else partners.push(p);
  }

  // Queue integrity: re-attach resurrects advanced junk after AGG expands — demote
  partners = partners.map((l) => demoteJunkLead(l).lead);
  talent = talent.map((l) => demoteJunkLead(l).lead);

  payload = {
    schema: 'demigod.leads/2+funnel',
    at: new Date().toISOString(),
    honesty: {
      note: 'For human triage only. No auto-DM, no auto-board, no invented contact emails. Funnel state via demigod-funnel.mjs. Re-collect merges prior state.',
      autoDm: false,
      sources: [
        'firecrawl-search',
        'firecrawl-scrape',
        'submissions-inbox',
        'x-public',
        'events-bot',
      ],
      firecrawl: Boolean(loadFcKey()),
    },
    counts: {
      partners: partners.length,
      talent: talent.length,
      partnersInbox: inbox.partners.length,
      talentInbox: inbox.talent.length,
      eventsPartners: events.partners.length,
      eventsTalent: events.talent.length,
      scrapes: scrapes.length,
    },
    partners,
    talent,
    next: [
      'Review high-score partners (score≥65): personalize brief, optional WIZ link',
      'Review high-score talent (score≥65): invite private profile /?wiz=engineer if fit',
      'bin/dg-matches only after real mutual interest — never invent',
      'Do not blast; warm SF network first',
    ],
  };

  // Human-readable brief
  const lines = [
    '# Demigod lead collection',
    '',
    `At: ${payload.at}`,
    `Partners: ${partners.length} · Talent: ${talent.length}`,
    `Firecrawl key: ${payload.honesty.firecrawl ? 'yes' : 'keyless/cli'}`,
    '',
    '## Top hiring partners',
    ...partners.slice(0, 15).map(
      (p, i) =>
        `${i + 1}. **${p.company || '?'}** — ${p.title || ''} (${p.score}) · ${p.location || ''} · ${p.source || ''}${p.url ? ' · ' + p.url : ''}`,
    ),
    '',
    '## Top talent',
    ...talent.slice(0, 15).map(
      (t, i) =>
        `${i + 1}. **${t.name || t.handle || '?'}** — ${(t.skills || '').slice(0, 80)} (${t.score}) · ${t.location || ''} · ${t.source || ''}${t.url ? ' · ' + t.url : ''}`,
    ),
    '',
    '## Next (human)',
    ...payload.next.map((n) => `- ${n}`),
    '',
  ];
  atomicWrite(path.join(BUSY, 'LEADS-BRIEF.md'), lines.join('\n'));
  for (const receipt of searchReceipts) {
    atomicWrite(
      path.join(BUSY, 'search-' + Buffer.from(receipt.q).toString('base64url').slice(0, 20) + '.json'),
      JSON.stringify({ q: receipt.q, hits: receipt.hits, yield: searchQueryYield([...partners, ...talent], receipt.q, receipt) }, null, 2) + '\n',
    );
  }

  // Canonical CRM is the single source of truth and commits last.
  writeLeadsJson(OUT, payload);
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        brief: path.join(BUSY, 'LEADS-BRIEF.md'),
        partners: partners.length,
        talent: talent.length,
        topPartners: partners.slice(0, 5).map((p) => ({ company: p.company, title: p.title, score: p.score })),
        topTalent: talent.slice(0, 5).map((t) => ({ name: t.name || t.handle, score: t.score, source: t.source })),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (!collectArgsValid(argv)) {
    console.error('unknown or misplaced argument');
    process.exit(2);
  }
  const limArg = argv.find((a) => a.startsWith('--limit='));
  const cliLimit = parseCollectLimit(limArg?.split('=')[1]);
  if (cliLimit == null) {
    console.error('--limit must be an integer from 1 to 100');
    process.exit(2);
  }
  const focus = readLeadFocus();
  if (leadCollectionPaused(focus) && !argv.includes('--force-paused')) {
    console.error(JSON.stringify({ focusPaused: true, error: 'requires --force-paused' }));
    process.exit(2);
  }
  if (argv.includes('--enrich') || argv.includes('enrich')) {
    const idArg = argv.find((a) => a.startsWith('--id='));
    cmdEnrich({
      id: idArg ? idArg.split('=').slice(1).join('=') : null,
      limit: limArg ? cliLimit : 10,
      dryRun: argv.includes('--dry-run'),
    });
  } else {
    main();
  }
}
