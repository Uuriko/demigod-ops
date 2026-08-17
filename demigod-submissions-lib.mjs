#!/usr/bin/env node
/**
 * demigod-submissions-lib — shared inbox/board helpers (no PII on public cards)
 *
 * Exports: loadInbox, saveInbox, loadBoard, mintBoardEntry, extractEmail, publicStatus, …
 * Paths: DEMIGOD-SUBMISSIONS-INBOX.json, DEMIGOD-BOARD.json, audit jsonl.
 * Used by: submissions-inbox/approve/ingest, auto-propose, matching. Keep sample-by-default honesty.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { UNSAFE_INVISIBLE_CLASS, atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';
import { recordDirectSubmission, recordReferralSubmission } from './demigod-referrals.mjs';

const ROOT = '/home/potter';

// Tests must never write production SoRs. *.test.mjs polluted the inbox with 115 fixture rows that
// read as real demand, and the board (which feeds the live site) was corrupted twice the same way.
// node --test sets NODE_TEST_CONTEXT; the argv check covers direct `node foo.test.mjs` runs.
const IS_TEST = !!process.env.NODE_TEST_CONTEXT || !!process.env.DEMIGOD_TEST_SCOPE ||
  !!process.env.DEMIGOD_TEST_ROOT || /\.test\.mjs$/.test(process.argv[1] || '');
const TEST_SCOPE = IS_TEST
  ? (process.env.DEMIGOD_TEST_SCOPE ||= String(process.pid)).replace(/[^A-Za-z0-9_.-]/g, '_')
  : '';
const REAL_TMP = fs.realpathSync(os.tmpdir());
const explicitTestRoot = process.env.DEMIGOD_TEST_ROOT
  ? fs.realpathSync(process.env.DEMIGOD_TEST_ROOT)
  : '';
if (explicitTestRoot && (path.dirname(explicitTestRoot) !== REAL_TMP || !path.basename(explicitTestRoot).startsWith('dg-'))) {
  throw new Error('unsafe DEMIGOD_TEST_ROOT');
}
const TEST_DIR = explicitTestRoot || path.join(REAL_TMP, 'dg-busy', 'tests', TEST_SCOPE);
const inboxOverride = process.env.DEMIGOD_INBOX_PATH ? path.resolve(process.env.DEMIGOD_INBOX_PATH) : '';
if (explicitTestRoot && inboxOverride && path.dirname(inboxOverride) !== explicitTestRoot) {
  throw new Error('DEMIGOD_INBOX_PATH must be inside DEMIGOD_TEST_ROOT');
}

export const BOARD_PATH = IS_TEST
  ? path.join(TEST_DIR, 'test-board.json')
  : path.join(ROOT, 'DEMIGOD-BOARD.json');
export const BOARD_LOCK = BOARD_PATH + '.lock';
export const BOARD_AUDIT = IS_TEST
  ? path.join(TEST_DIR, 'test-board-audit.jsonl')
  : path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl');
export const INBOX_PATH = inboxOverride
  || (IS_TEST ? path.join(TEST_DIR, 'test-submissions-inbox.json') : path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json'));
// Mirror BOARD_LOCK: the leads inbox needs the same read-modify-write serialization the board has.
// atomicWrite stops a torn READ but not a LOST UPDATE -- two concurrent ingests both loadInbox() the
// same snapshot, both prepend, the second saveInbox() clobbers the first, and a real submission
// vanishes. ingestSubmission is the live webhook path, so simultaneous form posts hit exactly this.
export const INBOX_LOCK = INBOX_PATH + '.lock';

const STAGE_RE = /\b(pre-?seed|seed|series\s*[a-d]|yc|stealth)\b/i;
const VERTICAL_RE = /\b(b2b\s*saas?|consumer|fintech|healthtech|devtools|ai|marketplace|hardware)\b/i;
const DEDUPE_DAYS = Number(process.env.DEMIGOD_DEDUPE_DAYS || 30);
const ARCHIVE_RETENTION_DAYS = Math.max(
  DEDUPE_DAYS,
  Number(process.env.DEMIGOD_ARCHIVE_RETENTION_DAYS) || 365,
);
export const ARCHIVE_DAYS = Math.max(1, Number(process.env.DEMIGOD_ARCHIVE_DAYS) || 14);
export const ROLE_OPEN_DAYS = 90;
export const CANDIDATE_INTENT_DAYS = 30;
const TEST_RE = /\btest\b/i;
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const CANDIDATE_BAY_OPTIONS = new Set(['yes', 'remote-bay', 'no']);
const CANDIDATE_AVAILABILITY_OPTIONS = new Set(['now', '2-4w', '1-3m', 'passive']);
const STARTUP_STAGE_OPTIONS = new Set(['pre-seed', 'seed', 'series-a', 'series-b']);
const STARTUP_LOCATION_OPTIONS = new Set([
  'sf-onsite', 'sf-hybrid', 'bay-flexible', 'remote-us', 'remote-global',
  'sf', 'san francisco, ca', 'san francisco, ca (in-person)',
]);
const UNSAFE_MATCH_CONTROL = new RegExp('[\\u0000-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']');

function validMatchConstraint(value, max = 120) {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  return Boolean(
    text &&
    text.length <= max &&
    !UNSAFE_MATCH_CONTROL.test(value) &&
    !/^(?:select(?: range)?|choose|tbd|unknown|n\/?a|none|-+)$/.test(text.toLowerCase()) &&
    scrubPII(text) === text
  );
}

function validContactEmail(value) {
  const email = typeof value === 'string' ? value.trim() : '';
  return email.length <= 254 &&
    !UNSAFE_MATCH_CONTROL.test(email) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function extractEmail(data = {}, formName = '') {
  const fn = String(formName).toLowerCase();
  if (/startup/.test(fn)) return String(data['contact-email'] || data.contactEmail || '').toLowerCase().trim();
  if (/partner/.test(fn)) return String(data['partner-email'] || data.partnerEmail || '').toLowerCase().trim();
  return String(data['seeker-email'] || data.seekerEmail || '').toLowerCase().trim();
}

export function startupRoleReadiness(item = {}) {
  const form = String(item.form || item.formName || '');
  if (!/hire|startup|founders/i.test(form)) return { applicable: false, matchReady: true, missing: [], lifecycleReady: true, policyReady: true };
  const raw = item.raw || item.data || {};
  const company = raw['company-name'] || raw.companyName;
  const stage = raw['company-stage'] || raw.companyStage;
  const title = raw['role-title'] || raw.roleTitle;
  const skills = raw['stack-needs'] || raw.stackNeeds;
  const outcome = raw['90day-outcome'] || raw.outcome90d;
  const location = raw['work-location'] || raw.workLocation;
  const compensation = raw['salary-range'] || raw.salaryRange;
  const interviewProcess = raw['interview-process'] || raw.interviewProcess;
  const email = extractEmail(raw, form);
  const required = [
    ['company-name', company],
    ['company-stage', stage],
    ['role-title', title],
    ['stack-needs', skills],
    ['90day-outcome', outcome],
    ['work-location', location],
    ['salary-range', compensation],
    ['interview-process', interviewProcess],
    ['contact-email', email],
  ];
  const missing = required.filter(([, value]) => !String(value || '').trim()).map(([key]) => key);
  for (const [key, ready] of [
    ['company-name', validMatchConstraint(company, 160)],
    ['company-stage', STARTUP_STAGE_OPTIONS.has(String(stage || '').trim().toLowerCase())],
    ['role-title', validMatchConstraint(title, 160)],
    ['stack-needs', validMatchConstraint(skills, 500)],
    ['90day-outcome', validMatchConstraint(outcome, 600)],
    ['work-location', STARTUP_LOCATION_OPTIONS.has(String(location || '').trim().toLowerCase())],
    ['salary-range', validMatchConstraint(compensation)],
    ['interview-process', validMatchConstraint(interviewProcess, 300)],
    ['contact-email', validContactEmail(email)],
  ]) {
    if (!ready && !missing.includes(key)) missing.push(key);
  }
  const lifecycleReady = item.status === 'reviewed' || item.status === 'featured';
  const policyReady = !['rejected', 'spam'].includes(item.status) && !(item.rejectReasons || []).length;
  return { applicable: true, matchReady: lifecycleReady && policyReady && !missing.length, missing, lifecycleReady, policyReady };
}

export function candidateAvailabilityFreshness(item = {}, now = Date.now()) {
  const form = String(item.form || item.formName || '');
  if (!/engineer|jobseeker|candidate/i.test(form)) {
    return { applicable: false, current: true, at: null, ageDays: null, source: null };
  }
  const source = item.availabilityConfirmedAt ? 'reconfirmed' : 'self-reported';
  const at = String(item.availabilityConfirmedAt || item.at || '').trim();
  const atMs = Date.parse(at);
  const ageMs = Number(now) - atMs;
  const valid = Number.isFinite(atMs) && Number.isFinite(Number(now)) && ageMs >= -5 * 60 * 1000;
  const ageDays = valid ? Math.max(0, Math.floor(ageMs / 86400000)) : null;
  return {
    applicable: true,
    current: valid && ageMs <= CANDIDATE_INTENT_DAYS * 86400000,
    at: valid ? at : null,
    ageDays,
    source,
  };
}

export function candidateProfileReadiness(item = {}) {
  const form = String(item.form || item.formName || '');
  if (!/engineer|jobseeker|candidate/i.test(form)) return { applicable: false, matchReady: true, missing: [], lifecycleReady: true, policyReady: true };
  const raw = item.raw || item.data || {};
  const bayPreference = String(raw['sf-bay'] || raw.sfBay || '').trim().toLowerCase();
  const availability = String(raw.availability || '').trim().toLowerCase();
  const compensation = raw['salary-expectation'] || raw['salary-range'] || raw.compExpect;
  const fullName = raw['full-name'] || raw.fullName;
  const email = extractEmail(raw, form);
  const skills = raw['skills-stack'] || raw.skillsStack;
  const experience = raw.experience || raw['background & highlights'];
  const resume = extractResumeReference(raw);
  const bayOptionReady = CANDIDATE_BAY_OPTIONS.has(bayPreference);
  const preferenceReady = bayPreference !== 'no';
  const availabilityReady = CANDIDATE_AVAILABILITY_OPTIONS.has(availability);
  const availabilityFreshness = candidateAvailabilityFreshness(item);
  const compensationReady = validMatchConstraint(compensation);
  const required = [
    ['full-name', fullName],
    ['seeker-email', email],
    ['skills-stack', skills],
    ['experience', experience],
    ['sf-bay', raw['sf-bay'] || raw.sfBay],
    ['availability', raw.availability],
    ['salary-expectation', compensation],
    ['resume', resume],
  ];
  const missing = required.filter(([, value]) => !String(value || '').trim()).map(([key]) => key);
  for (const [key, ready] of [
    ['full-name', validMatchConstraint(fullName)],
    ['seeker-email', validContactEmail(email)],
    ['skills-stack', validMatchConstraint(skills, 400)],
    ['experience', validMatchConstraint(experience, 600)],
    ['sf-bay', bayOptionReady],
    ['availability', availabilityReady],
    ['salary-expectation', compensationReady],
    ['resume', isValidResumeReference(resume)],
  ]) {
    if (!ready && !missing.includes(key)) missing.push(key);
  }
  const lifecycleReady = item.status === 'reviewed' || item.status === 'featured';
  const policyReady = !['rejected', 'spam'].includes(item.status) && !(item.rejectReasons || []).length;
  return {
    applicable: true,
    matchReady: lifecycleReady && policyReady && preferenceReady && availabilityFreshness.current && !missing.length,
    missing,
    lifecycleReady,
    policyReady,
    preferenceReady,
    availabilityCurrent: availabilityFreshness.current,
    availabilityAt: availabilityFreshness.at,
    availabilityAgeDays: availabilityFreshness.ageDays,
    availabilitySource: availabilityFreshness.source,
  };
}

/** Private resume reference from Webflow's native file field or the URL fallback. */
export function extractResumeReference(data = {}) {
  for (const value of [data.resume, data.Resume, data['resume-url'], data.resumeUrl]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function isValidResumeReference(value) {
  const reference = typeof value === 'string' ? value.trim() : '';
  if (!reference || reference.length > 2048 || UNSAFE_MATCH_CONTROL.test(reference)) return false;
  try {
    const parsed = new URL(reference);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function sourceSubmissionId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  return id && id.length <= 160 && /^[A-Za-z0-9._:-]+$/.test(id) ? id : '';
}

function emailFingerprint(email) {
  return crypto.createHash('sha256').update(String(email || '')).digest('hex');
}

function recentContacts(inbox = {}, now = Date.now()) {
  const cutoff = now - DEDUPE_DAYS * 86400000;
  return Array.isArray(inbox.recentContacts)
    ? inbox.recentContacts.filter((item) => {
        const at = item && new Date(item.at).getTime();
        return /^[a-f0-9]{64}$/.test(String(item && item.emailHash || '').toLowerCase()) &&
          Number.isFinite(at) && at > cutoff && at <= now + 300000;
      })
    : [];
}

/** Keep bounded raw recovery history; anchor malformed/future legacy bytes without discarding them. */
export function retainSubmissionArchive(text = '', now = Date.now()) {
  const cutoff = now - ARCHIVE_RETENTION_DAYS * 86400000;
  const maxFuture = now + 300000;
  return String(text).split('\n').filter(Boolean).flatMap((line) => {
    try {
      const row = JSON.parse(line);
      const anchor = Date.parse(row?.archiveRetentionAnchor || row?.at || '');
      if (Number.isFinite(anchor) && anchor <= maxFuture) return anchor >= cutoff ? [line] : [];
    } catch {
      // Preserve the exact legacy bytes below, under a trusted bounded anchor.
    }
    return [JSON.stringify({ archiveRetentionAnchor: new Date(now).toISOString(), archivedRaw: line })];
  });
}

/**
 * Parse Webflow form-notification email body into form name + field map.
 * Source: Gmail "New form submission on Webflow" previews (webhook often drops fields).
 * Never invents keys/values — only splits literally present "kebab-key: value" pairs.
 */
export function parseWebflowFormEmailBody(text) {
  const s = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  const formM = s.match(/\bForm\s+([a-z0-9_-]+)\s+Site\b/i);
  const form = formM ? formM[1].toLowerCase() : '';
  const contentIdx = s.search(/Submitted content\s*/i);
  const fieldBlob =
    contentIdx >= 0 ? s.slice(contentIdx).replace(/^Submitted content\s*/i, '') : s;
  const raw = {};
  const re = /([a-z][a-z0-9_-]*)\s*:\s*/gi;
  const parts = [];
  let m;
  while ((m = re.exec(fieldBlob)) !== null) {
    parts.push({ key: m[1].toLowerCase(), keyEnd: re.lastIndex, start: m.index });
  }
  for (let i = 0; i < parts.length; i++) {
    const end = i + 1 < parts.length ? parts[i + 1].start : fieldBlob.length;
    const val = fieldBlob.slice(parts[i].keyEnd, end).trim();
    if (val) raw[parts[i].key] = val;
  }
  return { form, raw, email: extractEmail(raw, form) || String(raw.email || '').toLowerCase().trim() };
}

/** Example/playtest contacts — never count as real form_filled / paid path. */
export function isSyntheticContact(email, raw = {}) {
  const e = String(email || '').toLowerCase().trim();
  const blob = JSON.stringify(raw || {}).toLowerCase();
  if (!e) return true;
  if (/@example\.(com|org|net)$|@test\.(com|co)|@pending\.example|mailinator\.|guerrillamail/i.test(e)) {
    return true;
  }
  if (/\b(acme labs|alex rivera|alex chen|founder@example|smoke check)\b/i.test(e + ' ' + blob)) {
    return true;
  }
  return false;
}

/**
 * Flatten Gmail dump threads → structured WIZ form candidates (report / rehydrate plan).
 * @returns {{ forms: object[], real: object[], synthetic: object[] }}
 */
export function planGmailFormCandidates(payload) {
  const threads = payload?.threads || payload?.messages || (Array.isArray(payload) ? payload : []);
  const forms = [];
  for (const t of threads) {
    const msgs = t.messages || [t];
    for (const msg of msgs) {
      const from = String(msg.from || '');
      const subject = String(msg.subject || t.subject || '');
      const body = String(msg.body_preview || msg.snippet || msg.body || t.snippet || '');
      if (!/no-reply-forms@webflow\.com/i.test(from) && !/form submission/i.test(subject)) continue;
      const parsed = parseWebflowFormEmailBody(`${subject}\n${body}`);
      if (!parsed.form && !Object.keys(parsed.raw).length) continue;
      const synthetic = isSyntheticContact(parsed.email, parsed.raw);
      forms.push({
        messageId: msg.message_id || msg.id || '',
        at: msg.date || '',
        form: parsed.form,
        raw: parsed.raw,
        email: parsed.email || '',
        synthetic,
        subject,
      });
    }
  }
  return {
    forms,
    real: forms.filter((f) => !f.synthetic && f.email),
    synthetic: forms.filter((f) => f.synthetic),
  };
}

/** Self/noise emails that must never rehydrate onto inbox (join money path). */
function isNonPatchableContactEmail(email) {
  const e = String(email || '')
    .toLowerCase()
    .trim();
  if (!e || !e.includes('@')) return true;
  if (isSyntheticContact(e)) return true;
  // Own product + noreply — same honesty as lead-collect usable gate (no circular import)
  if (/@trydemigod\.com$|noreply|no-reply|donotreply|do-not-reply|@pending\.example/i.test(e)) {
    return true;
  }
  return false;
}

function submissionDataBag(sub) {
  if (!sub || typeof sub !== 'object') return {};
  return sub.data || sub.payload || sub.raw || {};
}

function emailFieldKeyForForm(formName) {
  const fn = String(formName || '').toLowerCase();
  if (/partner/.test(fn)) return 'partner-email';
  if (/engineer|jobseeker|seeker|candidate/.test(fn)) return 'seeker-email';
  return 'contact-email';
}

function formFamilyMatch(a, b) {
  const fa = String(a || '').toLowerCase();
  const fb = String(b || '').toLowerCase();
  if (!fa || !fb) return true; // unknown form → allow title/company match
  return formFamily(fa) === formFamily(fb);
}

function formFamily(formName) {
  const value = String(formName || '').toLowerCase();
  if (/partner/.test(value)) return 'partner';
  if (/engineer|jobseeker|seeker|candidate|talent/.test(value)) return 'candidate';
  if (/startup|founder|^hire(?:-|$)/.test(value)) return 'startup';
  return value.split(/[-_]/)[0] || value;
}

/** Immutable submissions, projected to one current reviewed profile per explicit update chain. */
export function currentCandidateSubmissions(items = []) {
  const candidates = (Array.isArray(items) ? items : []).filter(
    (item) => formFamily(item?.form || item?.formName) === 'candidate',
  );
  const byId = new Map(candidates.map((item) => [item?.id, item]));
  const superseded = new Set();
  for (const next of candidates) {
    if (!['reviewed', 'featured'].includes(next?.status) || !next?.supersedes) continue;
    const prior = byId.get(next.supersedes);
    const nextEmail = extractEmail(next.raw || next.data || {}, next.form || next.formName);
    const priorEmail = prior && extractEmail(prior.raw || prior.data || {}, prior.form || prior.formName);
    if (prior && nextEmail && nextEmail === priorEmail &&
        formFamilyMatch(next.form || next.formName, prior.form || prior.formName)) {
      superseded.add(prior.id);
    }
  }
  return candidates.filter((item) => !superseded.has(item.id));
}

/**
 * Pure: patch incomplete webhook submissions with contacts from real Gmail form emails.
 * Webhook often stores role-title only; Gmail notification has contact-email.
 * Fail-closed: never invents; skips synthetic/self; ambiguous multi-sub match denied.
 * Does not mutate inputs.
 * @returns {{ patches: object[], skipped: object[] }}
 */
export function planInboxContactPatches(realForms = [], submissions = []) {
  const patches = [];
  const skipped = [];
  const claimedSubs = new Set();

  for (const f of realForms || []) {
    if (!f || typeof f !== 'object') continue;
    const email = String(f.email || '')
      .toLowerCase()
      .trim();
    if (!email) {
      skipped.push({ reason: 'no_email' });
      continue;
    }
    if (f.synthetic || isNonPatchableContactEmail(email)) {
      skipped.push({ email, reason: 'synthetic_or_self' });
      continue;
    }
    const raw = f.raw && typeof f.raw === 'object' ? f.raw : {};
    const title = String(raw['role-title'] || raw.role || raw['full-name'] || '').trim();
    const company = String(
      raw['company-name'] || raw.company || raw['partner-org'] || raw['partner-name'] || '',
    ).trim();
    if (!title && !company) {
      skipped.push({ email, reason: 'no_title_or_company' });
      continue;
    }

    const candidates = [];
    for (const sub of submissions || []) {
      if (!sub?.id || claimedSubs.has(sub.id)) continue;
      const formName = String(sub.form || sub.formName || '').toLowerCase();
      if (!formFamilyMatch(f.form, formName)) continue;
      const data = submissionDataBag(sub);
      const existing = extractEmail(data, formName || f.form);
      if (existing) continue; // already has contact — never overwrite
      const subTitle = String(data['role-title'] || data.role || data['full-name'] || '').trim();
      const subCompany = String(
        data['company-name'] || data.company || data['partner-org'] || data['partner-name'] || '',
      ).trim();
      let score = 0;
      if (title && subTitle && title.toLowerCase() === subTitle.toLowerCase()) score += 2;
      if (company && subCompany && company.toLowerCase() === subCompany.toLowerCase()) score += 2;
      // Need a strong signal (title or company exact) — role-only spam clones stay ambiguous
      if (score < 2) continue;
      candidates.push({ sub, score, formName });
    }

    if (!candidates.length) {
      skipped.push({ email, reason: 'no_incomplete_submission_match' });
      continue;
    }
    candidates.sort((a, b) => b.score - a.score);
    const topScore = candidates[0].score;
    const top = candidates.filter((c) => c.score === topScore);
    if (top.length > 1) {
      skipped.push({
        email,
        reason: 'ambiguous_submission_match',
        ids: top.map((c) => c.sub.id),
      });
      continue;
    }

    const { sub, formName } = top[0];
    const emailKey = emailFieldKeyForForm(formName || f.form);
    const data = submissionDataBag(sub);
    const fields = { [emailKey]: email };
    // Fill only missing identity fields literally present on the Gmail form
    for (const k of [
      'company-name',
      'company-stage',
      'full-name',
      'role-title',
      'stack-needs',
      'skills-stack',
      '90day-outcome',
      'salary-range',
      'partner-name',
      'partner-org',
    ]) {
      if (raw[k] && !data[k]) fields[k] = raw[k];
    }
    claimedSubs.add(sub.id);
    patches.push({
      submissionId: sub.id,
      email,
      emailKey,
      fields,
      form: formName || f.form || '',
      via: 'gmail-form-rehydrate',
      messageId: f.messageId || null,
      score: topScore,
    });
  }

  return { patches, skipped };
}

/**
 * Pure: clone submissions with Gmail contact patches applied in-memory (for join planning).
 * Never invents fields; never overwrites existing contact keys on the bag.
 */
export function submissionsWithGmailPatches(subs = [], patches = []) {
  if (!Array.isArray(subs) || !patches?.length) return Array.isArray(subs) ? subs.slice() : [];
  const byId = new Map(patches.map((p) => [p.submissionId, p]));
  return subs.map((sub) => {
    if (!sub?.id) return sub;
    const p = byId.get(sub.id);
    if (!p || !p.fields) return sub;
    const base = { ...(sub.raw || sub.data || sub.payload || {}) };
    for (const [k, v] of Object.entries(p.fields)) {
      if (v == null || v === '') continue;
      if (base[k]) continue; // never overwrite
      base[k] = v;
    }
    return { ...sub, raw: base, data: base };
  });
}

/**
 * Apply planned contact patches onto inbox item objects (mutates matching items).
 * Safe: only fills missing email keys; never overwrites existing contact.
 * @returns {number} count applied
 */
export function applyInboxContactPatches(items, patches = []) {
  if (!Array.isArray(items) || !patches?.length) return 0;
  const byId = new Map(items.map((it) => [it?.id, it]));
  let n = 0;
  for (const p of patches) {
    const it = byId.get(p.submissionId);
    if (!it) continue;
    // Prefer mutating the bag the record actually uses
    let bag = null;
    if (it.data && typeof it.data === 'object') bag = it.data;
    else if (it.payload && typeof it.payload === 'object') bag = it.payload;
    else if (it.raw && typeof it.raw === 'object') bag = it.raw;
    else {
      it.data = {};
      bag = it.data;
    }
    const formName = String(it.form || it.formName || p.form || '');
    if (extractEmail(bag, formName)) continue; // race: already has contact
    for (const [k, v] of Object.entries(p.fields || {})) {
      if (v && !bag[k]) bag[k] = v;
    }
    it.contactRehydratedAt = new Date().toISOString();
    it.contactRehydrateVia = p.via || 'gmail-form-rehydrate';
    if (p.messageId) it.contactRehydrateMessageId = p.messageId;
    n++;
  }
  return n;
}

/** Auto-reject spam/duplicates before inbox (Heavy review-gate spec). */
export function shouldAutoReject(data = {}, formName = '', inbox = {}) {
  const fn = String(formName).toLowerCase();
  const email = extractEmail(data, fn);
  const blobSansEmails = JSON.stringify(
    Object.fromEntries(Object.entries(data).filter(([k]) => !/email/i.test(k))),
  );
  const reasons = [];

  const textCaps = [];
  if (/startup/.test(fn)) textCaps.push(
    ['stack_needs_too_long', 500, data['stack-needs'], data.stackNeeds],
    ['why_this_role_too_long', 300, data['why-this-role'], data.whyThisRole],
  );
  if (/engineer|jobseeker|candidate/.test(fn)) textCaps.push(
    ['skills_stack_too_long', 400, data['skills-stack'], data.skillsStack],
    ['experience_too_long', 600, data.experience, data['background & highlights']],
  );
  for (const [reason, max, ...values] of textCaps) {
    if (values.some((value) => value != null && String(value).length > max)) reasons.push(reason);
  }

  if (email && !validContactEmail(email)) reasons.push('invalid_email');
  if (TEST_RE.test(blobSansEmails) && !/^(test@|demo@)/i.test(email)) reasons.push('test_keyword');
  if (/^smoke-(?:intake|startup|engineer)\+/i.test(email)) reasons.push('intake_smoke_probe');
  if (/intake smoke probe/i.test(String(data['partner-org'] || data.partnerOrg || data['stack-needs'] || data['skills-stack'] || ''))) reasons.push('intake_smoke_probe');
  if (data['company-name'] === 'Smoke Check Co' || data['full-name'] === 'Smoke Check') reasons.push('intake_smoke_probe');
  if (/engineer|jobseeker|candidate/.test(fn) && !String(data['skills-stack'] || data.skillsStack || '').trim()) {
    reasons.push('zero_skills');
  }
  if (/startup/.test(fn) && !String(data['stack-needs'] || data.stackNeeds || '').trim()) {
    reasons.push('zero_skills');
  }
  if (/partner/.test(fn)) {
    if (!String(data['partner-email'] || data.partnerEmail || '').trim()) reasons.push('missing_email');
    if (!String(data['partner-name'] || data.partnerName || '').trim()) reasons.push('missing_name');
    if (!String(data['referral-plan'] || data.referralPlan || '').trim()) reasons.push('missing_plan');
    if (!String(data['partner-type'] || data.partnerType || '').trim()) reasons.push('missing_type');
  }
  const resumeSizeRaw = data['resume-size'] ?? data.resumeSize ?? data._resumeBytes;
  const hasResumeSize = resumeSizeRaw != null && String(resumeSizeRaw).trim() !== '';
  const resumeSize = Number(resumeSizeRaw);
  if (hasResumeSize && (!Number.isFinite(resumeSize) || resumeSize < 0)) reasons.push('resume_size_invalid');
  else if (resumeSize > MAX_RESUME_BYTES) reasons.push('resume_too_large');
  const resumeType = String(data['resume-type'] || data.resumeType || data._resumeMime || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (resumeType && !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(resumeType)) {
    reasons.push('resume_type_unsupported');
  }
  const resumeUrl = extractResumeReference(data);
  const resumeReferences = [data.resume, data.Resume, data['resume-url'], data.resumeUrl];
  if (/engineer|jobseeker|candidate/.test(fn) && !resumeUrl) reasons.push('missing_resume');
  if (resumeReferences.some((value) => value != null && typeof value !== 'string')) reasons.push('resume_url_invalid');
  if (resumeUrl && !isValidResumeReference(resumeUrl)) reasons.push('resume_url_invalid');

  const cutoff = Date.now() - DEDUPE_DAYS * 86400000;
  const dup = (inbox.items || []).find((item) => {
    if (item.status === 'rejected' || item.status === 'spam') return false;
    if (!formFamilyMatch(item.form || item.formName, fn)) return false;
    const itemEmail = extractEmail(item.raw || {}, item.form || '');
    return email && itemEmail && itemEmail === email && new Date(item.at).getTime() > cutoff;
  });
  const family = formFamily(fn);
  const archivedDup = email && recentContacts(inbox).some((item) =>
    item.emailHash === emailFingerprint(email) && (!item.family || item.family === family));
  if (dup || archivedDup) reasons.push('duplicate_email');

  return {
    reject: reasons.some((reason) => reason !== 'duplicate_email'),
    duplicate: Boolean(dup || archivedDup),
    duplicateId: dup?.id || null,
    reasons,
    email,
  };
}

/** Drop stale cards; real roles share the 90-day open-confirmation window. */
export function filterBoard(board = {}) {
  const fresh = (item, days) => {
    const cutoff = Date.now() - days * 86400000;
    const at = item.featuredAt || item.at;
    if (!at) return true;
    return new Date(at).getTime() >= cutoff;
  };
  return {
    ...board,
    roles: (board.roles || [])
      .filter((item) => fresh(item, item?.sample === false ? ROLE_OPEN_DAYS : ARCHIVE_DAYS))
      .slice(0, 3),
    candidates: (board.candidates || []).filter((item) => fresh(item, ARCHIVE_DAYS)).slice(0, 3),
  };
}

export function slugId(prefix) {
  return `${prefix}-${crypto.randomBytes(16).toString('hex')}`;
}

// Redact contact-shaped PII from free text before publication. anonymize* already drops structured
// PII fields, but skills/experience/stack-needs feed public summaries and matching evidence.
export function scrubPII(text = '') {
  return String(text)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[contact removed]')
    // Obfuscated emails: name [at] host [dot] tld (and (at)/(dot) variants)
    .replace(
      /\b[\w.+-]+\s*(?:\[at\]|\(at\)|\bat\b)\s*[\w-]+(?:\s*(?:\[dot\]|\(dot\)|\bdot\b)\s*[\w.-]+)+\b/gi,
      '[contact removed]',
    )
    // International / E.164-ish first: +CC then 8–15 digits with common separators.
    // Digit-count callback avoids scrubbing "+5 years" or short codes; NANP runs next.
    .replace(/\+(?:\d[\d\s().-]{5,22}\d|\d{8,14})\b/g, (m) => {
      const digits = m.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 15 ? '[phone removed]' : m;
    })
    // NANP: treat (area) as one unit so we never leave a stray "(" before the marker.
    // Optional `\(?…\)?` matched area digits only and orphaned the open paren (public card leak shape).
    .replace(/(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone removed]')
    // Spoken digit phones: "four one five five five five …"
    .replace(
      /\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)[\s.-]?){7,15}\b/gi,
      '[phone removed]',
    )
    // US-ish street addresses: require a street number + street type (St/Ave/…) so
    // "Main Street marketing" / "Series A" / bare "SF Bay Area" stay. Optional unit + city/ZIP tail.
    // ponytail: high-precision regex, not NER — extend only when real free-text leaks appear.
    .replace(
      /\b\d{1,5}\s+(?:[A-Za-z0-9.'-]+\s+){0,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Circle|Cir)\.?(?:\s*(?:Apt|Apartment|Unit|#)\s*[A-Za-z0-9-]+)?(?:\s*,?\s*(?:[A-Za-z][A-Za-z.\s]{0,30}?,?\s*)?(?:[A-Z]{2}\s+)?\d{5}(?:-\d{4})?)?\b/gi,
      '[address removed]',
    )
    // City + ZIP without street number (still de-anonymizing when both present).
    .replace(
      /\b(?:San Francisco|South San Francisco|Oakland|Berkeley|Palo Alto|San Jose|Mountain View|Daly City|SF)\s*,?\s*(?:CA\s+)?\d{5}(?:-\d{4})?\b/gi,
      '[address removed]',
    )
    // PO Box lines (no street type): "PO Box 123, SF 94103" / "P.O. Box 456".
    .replace(
      /\bP\.?\s*O\.?\s*Box\s+\d{1,7}(?:\s*,?\s*(?:[A-Za-z][A-Za-z.\s]{0,30}?,?\s*)?(?:[A-Z]{2}\s+)?\d{5}(?:-\d{4})?)?\b/gi,
      '[address removed]',
    )
    // Any free-text link can de-anonymize a person or carry a signed-file secret. Keep the useful
    // surrounding words, never the URL; structured private links never belong on a public card.
    // TLDs include shortener-heavy endings (in/ly/to/cc/gg/tv/link) so lnkd.in/bit.ly cannot bypass.
    // `[` is excluded from the URL body so a URL that already had its digits scrubbed cannot
    // swallow the marker: wa.me/14155550123 became "[link removed] removed]" on a public card,
    // because the NANP rule turned it into wa.me/[phone removed] and this rule then matched
    // "wa.me/[phone". Real URLs percent-encode a bracket. Link-first would fix the order but is
    // strictly worse — `secret.com` inside ceo@secret.com would match, yielding "ceo@[link
    // removed]" and publishing the local part. Removal stays maximal either way; this only keeps
    // the replacement from garbling itself.
    .replace(/\b(?:(?:https?:\/\/|www\.)[^\s<>"'`[]+|(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|ai|co|me|app|xyz|tech|in|ly|to|cc|gg|gl|tv|link)(?:[/?#][^\s<>"'`[]*)?)/gi, (url) => {
      const punctuation = (url.match(/[),.;:!?]+$/) || [''])[0];
      return `[link removed]${punctuation}`;
    })
    // Bare social @handles after emails are gone. Skip npm-style @scope/pkg (@types/react).
    .replace(/(?<![\w./])@(?![a-z0-9_-]+\/)[a-zA-Z][a-zA-Z0-9_]{1,29}\b/g, '[handle removed]');
}

export function inferStageType(text = '') {
  const t = String(text);
  const stage = (t.match(STAGE_RE) || [])[0] || 'Seed-stage';
  const vert = (t.match(VERTICAL_RE) || [])[0] || 'SF startup';
  const stageNorm = stage.replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const vertNorm = vert.replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return `${stageNorm} · ${vertNorm}`;
}

export function clip(s, max = 120) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Bounded single-line Markdown-safe projection for untrusted private draft fields. */
export function projectDraftText(text = '', max = 240) {
  const value = clip(
    String(text).replace(
      new RegExp('[\\u0000-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']', 'g'),
      ' ',
    ),
    max,
  );
  if (/^https?:\/\/[^\s<>"'`]+$/i.test(value)) return value;
  return value.replace(/([\\`*_[\]<>#|])/g, '\\$1');
}

/** Keep one exact, credential-free HTTP(S) URL; discard adjacent draft prose. */
export function projectDraftUrl(text = '', max = 500) {
  const value = projectDraftText(
    String(text).split(
      new RegExp('[\\u0000-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']'),
      1,
    )[0],
    max,
  );
  if (!/^https?:\/\/[^\s<>"'`]+$/i.test(value)) return '';
  try {
    const url = new URL(value);
    return !url.username && !url.password && /^https?:$/.test(url.protocol) ? value : '';
  } catch {
    return '';
  }
}

/** startup-hire fields → anonymized open role */
export function anonymizeRole(raw = {}) {
  const title = clip(scrubPII(raw['role-title'] || raw.roleTitle || 'Open role'), 60);
  const skills = clip(scrubPII(raw['stack-needs'] || raw.stackNeeds || ''), 100);
  const comp = clip(scrubPII(raw['salary-range'] || raw.salaryRange || 'Comp on intro'), 40);
  const stageType = inferStageType(`${raw['company-stage'] || ''} ${raw['stack-needs'] || ''} ${raw['why-this-role'] || ''}`);
  return {
    id: slugId('role'),
    title,
    stageType,
    skills,
    comp,
    status: 'Active',
    featuredAt: new Date().toISOString(),
  };
}

/** engineer-join fields → anonymized candidate card */
export function anonymizeCandidate(raw = {}) {
  const skills = clip(scrubPII(raw['skills-stack'] || raw.skillsStack || ''), 80);
  const exp = clip(scrubPII(raw.experience || ''), 100);
  const summary = exp
    ? `${skills ? `${skills}. ` : ''}${exp}`
    : skills || 'SF Bay Area candidate open to startup roles';
  const tags = [];
  if (/yes|true|on/i.test(String(raw['sf-bay'] || raw.sfBay || ''))) tags.push('SF Bay Area');
  const links = String(raw.links || raw['github-url'] || raw.githubUrl || '');
  if (/github\.com|engineer|software/i.test(links)) tags.push('Engineer');
  const skillWords = skills.split(/[,·]/).map((w) => w.trim()).filter(Boolean).slice(0, 3);
  tags.push(...skillWords);
  return {
    id: slugId('cand'),
    summary: clip(summary, 140),
    tags: [...new Set(tags)].slice(0, 5),
    featuredAt: new Date().toISOString(),
  };
}

export function loadBoard() {
  let board;
  try {
    board = JSON.parse(fs.readFileSync(BOARD_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { at: new Date().toISOString(), roles: [], candidates: [], receipts: [], cdnUrl: null };
    }
    throw error;
  }
  if (
    !board ||
    typeof board !== 'object' ||
    Array.isArray(board) ||
    !Array.isArray(board.roles) ||
    !Array.isArray(board.candidates) ||
    (board.receipts != null && !Array.isArray(board.receipts))
  ) throw new Error('invalid board store');
  board.receipts ??= [];
  return board;
}

export function loadInbox() {
  let inbox;
  try {
    inbox = JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { at: new Date().toISOString(), items: [] };
    }
    throw error;
  }
  if (!inbox || typeof inbox !== 'object' || Array.isArray(inbox) || !Array.isArray(inbox.items)) {
    throw new Error('invalid inbox store');
  }
  return inbox;
}

export function findSubmission(id) {
  const needle = String(id || '').trim();
  if (!needle) return null;
  return (loadInbox().items || []).find((i) => i.id === needle) || null;
}

/** Public status payload — no PII (no raw fields, no email). */
export function publicStatus(record = {}) {
  const form = String(record.form || 'submission').toLowerCase();
  const internalStatus = String(record.status || 'new');
  const status = internalStatus === 'spam' || internalStatus === 'rejected' ? 'not_accepted' : internalStatus;
  let kind = 'submission';
  let headline = 'Submission received';
  let lead = 'A human is reviewing your submission.';
  // Public contact SoR is potter@ only (hello@ mailbox not set up).
  let steps = ['Received', 'Human review', 'potter@ follow-up on fit'];

  if (/partner/.test(form)) {
    kind = 'partner';
    headline = 'Partner application received';
    lead = 'We verify partner fit before sending your tracking code.';
    steps = ['Application received', 'Human review', 'Partner code sent if approved'];
  } else if (/startup/.test(form)) {
    kind = 'startup';
    headline = 'Brief received';
    lead = 'A human will review your role — not a bot.';
    steps = ['Brief received', 'Human review', 'Curated intros on fit only'];
  } else if (/engineer|jobseeker|candidate/.test(form)) {
    kind = 'engineer';
    headline = 'Profile saved';
    lead = 'Your resume stays private until a human sees a real fit.';
    steps = ['Profile stored securely', 'Human review', 'Email on strong Bay Area fit'];
  }

  if (status === 'featured') steps[1] = 'Approved · added to network signal';
  if (status === 'not_accepted') {
    headline = 'Submission not processed';
    lead = 'We could not accept this submission as sent.';
    steps = ['Received', 'Not processed', 'No further action'];
  }

  return {
    id: record.id,
    kind,
    status,
    headline,
    lead,
    steps,
    at: record.at || null,
    updatedAt: record.featuredAt || record.reviewedAt || record.at || null,
  };
}

export function saveInbox(inbox) {
  inbox.at = new Date().toISOString();
  // atomicWrite, not writeFileSync: this is the leads SoR and a plain write truncates-then-writes,
  // so a concurrent reader (triage, the dashboard, another agent) can catch it torn -- measured
  // 58.6% torn reads on a 340KB file. This same file already atomicWrites BOARD_PATH at :321 with
  // the helper imported at :12; the inbox was simply missed.
  atomicWrite(INBOX_PATH, JSON.stringify(inbox, null, 2), { mode: 0o600 });
}

/** Mutate the inbox under the same lock used by live form ingest. */
export function updateInbox(mutator) {
  return withFileLock(
    INBOX_LOCK,
    () => {
      const inbox = loadInbox();
      const result = mutator(inbox);
      saveInbox(inbox);
      return result;
    },
    { timeoutMs: 20000, staleMs: 120000 },
  );
}

export function saveBoard(board, opts = {}) {
  return withFileLock(
    BOARD_LOCK,
    () => persistBoardCore(board, opts),
    { timeoutMs: 20000, staleMs: 120000 },
  );
}

/**
 * Mutate board under a single lock: mutator(board) → board
 * Prefer this for multi-step mutations.
 */
export function writeBoard(mutator, opts = {}) {
  return withFileLock(
    BOARD_LOCK,
    () => {
      const board = loadBoard();
      const next = typeof mutator === 'function' ? mutator(JSON.parse(JSON.stringify(board))) : mutator;
      return persistBoardCore(next || board, opts);
    },
    { timeoutMs: 20000, staleMs: 120000 },
  );
}

function shaStable(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
}

export function submissionFingerprint(id) {
  return crypto.createHash('sha256').update(String(id || '')).digest('hex');
}

function appendBoardAudit(entry) {
  try {
    fs.appendFileSync(BOARD_AUDIT, JSON.stringify(entry) + '\n');
  } catch {
    /* */
  }
}

/**
 * Real roles/receipts require explicit env signal — caller boolean alone is not enough.
 * DEMIGOD_ALLOW_REAL_ROLES=1 and/or DEMIGOD_ALLOW_REAL_RECEIPTS=1
 * Board payload flags (filtered.allowRealRoles) are ignored for the gate (audit-only if set).
 */
function realRolesEnvOk() {
  return process.env.DEMIGOD_ALLOW_REAL_ROLES === '1' || process.env.DEMIGOD_ALLOW_REAL_ROLES === 'true';
}
function realReceiptsEnvOk() {
  return (
    process.env.DEMIGOD_ALLOW_REAL_RECEIPTS === '1' ||
    process.env.DEMIGOD_ALLOW_REAL_RECEIPTS === 'true' ||
    realRolesEnvOk()
  );
}

/**
 * A receipt that makes a real proof claim (status==='delivered', not sample/demo-labeled).
 * Single source of truth reused by the write-guard here AND computeSignal (board-lib) — three
 * slightly-different copies of this predicate drifted before (write-guard used sample===false while
 * computeSignal used status==='delivered'), which let a real minted receipt slip the guard (#439).
 * board-honesty's line-52 "delivered without sample label" is a DIFFERENT (labeling) check — leave it.
 */
export function isRealReceipt(r) {
  return !!r && r.status === 'delivered' && !/sample|demo/i.test(r.note || '') && !/^demo/i.test(r.hash || '');
}

export function isSampleData(item = {}) {
  return item.sample === true || item.selftest === true || item.real === false
    || item.raw?.sample === true || item.raw?.selftest === true
    || item.data?.sample === true || item.data?.selftest === true
    || item.payload?.sample === true || item.payload?.selftest === true;
}

/** Core persist — call only while holding BOARD_LOCK (via saveBoard/writeBoard). */
function persistBoardCore(board, opts = {}) {
  const actor = opts.actor || process.env.USER || process.env.DEMIGOD_ACTOR || 'agent';
  const reason = opts.reason || 'unspecified';
  let before = null;
  try {
    before = JSON.parse(fs.readFileSync(BOARD_PATH, 'utf8'));
  } catch {
    before = null;
  }
  const beforeHash = before ? shaStable(before) : null;
  const filtered = filterBoard(board || {});
  // Never trust board-payload honesty bypass flags
  delete filtered.allowRealRoles;
  delete filtered.allowRealReceipts;
  filtered.at = new Date().toISOString();
  const roles = filtered.roles || [];
  const realRoles = roles.filter((r) => r && r.sample === false);
  const realReceipts = (filtered.receipts || []).filter(isRealReceipt);
  if (roles.length > 3 && !opts.allowOverCap) {
    filtered.roles = roles.slice(0, 3);
  }
  const allowReal =
    (opts.allowRealRoles === true || opts.real === true) && realRolesEnvOk();
  const allowReceipts =
    (opts.allowRealReceipts === true || opts.real === true) && realReceiptsEnvOk();
  if (realRoles.length > 0 && !allowReal) {
    const err = new Error(
      `board_write_refused: realRoles=${realRoles.length} need DEMIGOD_ALLOW_REAL_ROLES=1 + opts.allowRealRoles (reason=${reason})`,
    );
    err.code = 'REAL_ROLES_REFUSED';
    throw err;
  }
  if (realReceipts.length > 0 && !allowReceipts) {
    const err = new Error(
      `board_write_refused: realReceipts=${realReceipts.length} need DEMIGOD_ALLOW_REAL_RECEIPTS=1 (or ROLES) + opts`,
    );
    err.code = 'REAL_RECEIPTS_REFUSED';
    throw err;
  }
  atomicWrite(BOARD_PATH, JSON.stringify(filtered, null, 2) + '\n');
  try { fs.chmodSync(BOARD_PATH, 0o600); } catch { /* PII: 0600 even on a fresh (umask) file */ }
  appendBoardAudit({
    at: filtered.at,
    actor,
    reason,
    beforeHash,
    afterHash: shaStable(filtered),
    roles: (filtered.roles || []).length,
    realRoles: realRoles.length,
    receipts: (filtered.receipts || []).length,
    allowRealEnv: realRolesEnvOk(),
    allowRealOpts: !!opts.allowRealRoles || !!opts.real,
  });
  return filtered;
}

/**
 * Mint public board entry only from reviewed submission (sample by default).
 */
export function mintBoardEntry(submission, opts = {}) {
  const status = String(submission?.status || '');
  // force only honored when env DEMIGOD_MINT_FORCE=1 (CLI/ops — never trust HTTP-only flags)
  const forceOk =
    opts.force === true &&
    (process.env.DEMIGOD_MINT_FORCE === '1' || process.env.DEMIGOD_MINT_FORCE === 'true');
  if (!['reviewed', 'featured', 'approved'].includes(status) && !forceOk) {
    const err = new Error(
      `mint_refused: submission status=${status} (need reviewed` +
        (opts.force ? '; force needs DEMIGOD_MINT_FORCE=1' : '') +
        ')',
    );
    err.code = 'NOT_REVIEWED';
    throw err;
  }
  // real featured cards need env + opts
  const wantReal = opts.real === true && realRolesEnvOk();
  return writeBoard(
    (board) => {
      const form = String(submission.form || '');
      const data = submission.raw || {};
      let featured = null;
      if (/startup/.test(form)) {
        featured = anonymizeRole(data);
        featured.sample = wantReal ? false : true;
        if (!wantReal) featured.outcome = featured.outcome || 'Sample · human review';
        board.roles = [featured, ...(board.roles || [])].slice(0, 3);
      } else if (/engineer|jobseeker|candidate/.test(form)) {
        featured = anonymizeCandidate(data);
        featured.sample = wantReal ? false : true;
        board.candidates = [featured, ...(board.candidates || [])].slice(0, 3);
      } else {
        return board;
      }
      featured.sourceSubmissionHash = submissionFingerprint(submission.id);
      return board;
    },
    {
      reason: opts.reason || `mint:${submission.id}`,
      actor: opts.actor,
      allowRealRoles: !!opts.real,
      allowRealReceipts: !!opts.real,
    },
  );
}

/** Mint at most once, keeping review → board → featured serialized by submission. */
export function submissionApprovalBlocker(submission = {}, items = []) {
  if (submission.featuredId) return null;
  if (submission.status === 'rejected' || submission.status === 'spam') return submission.status;
  if (formFamily(submission.form || submission.formName) === 'candidate' &&
      Array.isArray(items) && items.length &&
      !currentCandidateSubmissions(items).some((item) => item.id === submission.id)) {
    return 'superseded_candidate_profile';
  }
  if (submission.status === 'updated' || submission.supersedes) return 'duplicate_update';
  if (Array.isArray(submission.rejectReasons) && submission.rejectReasons.length) return 'rejected_by_intake';
  const startup = startupRoleReadiness(submission);
  const readiness = startup.applicable ? startup : candidateProfileReadiness(submission);
  if (readiness.applicable && readiness.missing.length) return 'missing_required_evidence';
  if (readiness.applicable && readiness.availabilityCurrent === false) return 'candidate_availability_reconfirmation_required';
  return null;
}

export function approveSubmission(submissionId, opts = {}) {
  return updateInbox((inbox) => {
    const submission = (inbox.items || []).find((item) => item.id === submissionId);
    if (!submission) return null;
    const blocker = submissionApprovalBlocker(submission, inbox.items);
    if (blocker) {
      const err = new Error(`approval_refused: ${blocker}`);
      err.code = 'NOT_APPROVABLE';
      throw err;
    }
    const boardBefore = loadBoard();
    const cards = [...(boardBefore.roles || []), ...(boardBefore.candidates || [])];
    if (submission.featuredId) {
      const featured = cards.find((item) => item.id === submission.featuredId) || { id: submission.featuredId };
      return { board: boardBefore, featured, reused: true };
    }
    const orphan = cards.find((item) => item.sourceSubmissionHash === submissionFingerprint(submissionId));
    if (orphan) {
      submission.status = 'featured';
      submission.featuredId = orphan.id;
      submission.featuredAt = orphan.featuredAt || new Date().toISOString();
      return { board: boardBefore, featured: orphan, reused: true, repaired: true };
    }

    submission.status = 'reviewed';
    submission.reviewedAt = new Date().toISOString();
    const board = mintBoardEntry(submission, opts);
    const featured = /startup/.test(String(submission.form || '').toLowerCase())
      ? (board.roles || [])[0]
      : (board.candidates || [])[0];
    submission.status = 'featured';
    submission.featuredId = featured?.id || null;
    submission.featuredAt = new Date().toISOString();
    return { board, featured, reused: false, repaired: false };
  });
}

/** Ingest raw webhook/form body; returns { inbox, board, record, featured } */
export function ingestSubmission(body = {}, opts = {}) {
  const formName = (body.name || body.formName || body['form-name'] || '').toLowerCase();
  const data = body.data || body.fields || body;
  const providerId = sourceSubmissionId(body.sourceSubmissionId);
  let board = loadBoard();
  const autoFeature = opts.autoFeature === true || process.env.DEMIGOD_AUTO_FEATURE === '1';

  // Serialize the whole inbox read-modify-write, not just the write. atomicWrite already stops a
  // torn read; this stops a LOST UPDATE -- two concurrent ingests both loadInbox() the same snapshot,
  // both prepend, the second saveInbox() clobbers the first, dropping a real submission. The board
  // does exactly this via writeBoard()/withFileLock(BOARD_LOCK); the inbox was the asymmetry. The
  // dup-check (shouldAutoReject reads the inbox) belongs inside the lock too, or two identical posts
  // race the dedupe. record is captured out here for the featuring step below.
  let inbox;
  let record;
  let reused = false;
  withFileLock(
    INBOX_LOCK,
    () => {
      inbox = loadInbox();
      if (providerId) {
        const existing = (inbox.items || []).find((item) => item.sourceSubmissionId === providerId);
        if (existing) {
          record = existing;
          reused = true;
          return;
        }
      }
      const gate = shouldAutoReject(data, formName, inbox);
      record = {
        id: slugId('sub'),
        at: new Date().toISOString(),
        form: formName,
        sourceSubmissionId: providerId || undefined,
        raw: { ...data },
        status: gate.reject ? (gate.reasons.includes('test_keyword') ? 'spam' : 'rejected') : gate.duplicate ? 'updated' : 'new',
        supersedes: gate.duplicateId || undefined,
        rejectReasons: gate.reject ? gate.reasons : undefined,
      };
      // Cap the working inbox at 200 -- but ARCHIVE what falls off the end instead of dropping it.
      // The old `.slice(0, 200)` silently evicted the oldest lead on the 201st submission: a founder
      // who submitted early just vanished from the record. Same "never silently lose a lead" principle
      // as the lock (a5c881f) and the corrupt-preserve guard (665d0da). Append-only JSONL archive; the
      // working file stays bounded and every recent lead is recoverable. Raw PII expires after the
      // configured retention window; the hash-only dedupe index remains independently bounded.
      // Runs inside the INBOX_LOCK, so archive compaction is serialized too.
      const combined = [record, ...(inbox.items || [])];
      const indexed = recentContacts(inbox);
      let evictedContacts = [];
      if (combined.length > 200) {
        const evicted = combined.slice(200);
        try {
          const archive = INBOX_PATH + '.archive.jsonl';
          const existing = fs.existsSync(archive) ? fs.readFileSync(archive, 'utf8') : '';
          const lines = [...retainSubmissionArchive(existing), ...evicted.map((x) => JSON.stringify(x))];
          atomicWrite(archive, lines.join('\n') + '\n', { mode: 0o600 });
        } catch {
          /* best-effort: never let archiving block the ingest of a new lead */
        }
        evictedContacts = evicted.flatMap((item) => {
          const email = extractEmail(item.raw || {}, item.form || '');
          return email && item.status !== 'rejected' && item.status !== 'spam'
            ? [{ emailHash: emailFingerprint(email), at: item.at, family: formFamily(item.form) }]
            : [];
        });
      }
      inbox.recentContacts = [...evictedContacts, ...indexed];
      inbox.items = combined.slice(0, 200);
      saveInbox(inbox);
    },
    { timeoutMs: 20000, staleMs: 120000 },
  );

  if (reused) return { inbox, board, record, featured: null, reused: true };

  // Referral attribution is downstream of the lossless inbox write: a broken/locked referral
  // ledger must never lose a real form submission. `sync` is the idempotent repair path.
  let referral = null;
  let directSource = null;
  const attributionEmail = extractEmail(data, formName);
  const attributionCompany = String(data['company-name'] || data.companyName || '').trim().toLowerCase();
  const attributionKind = /startup|hire|founder/.test(formName)
    ? 'company'
    : /engineer|jobseeker|candidate|talent/.test(formName) ? 'talent' : '';
  const attributionSubject = attributionKind === 'company'
    ? `company:${attributionCompany}`
    : attributionKind === 'talent' ? `talent:${attributionEmail}` : '';
  const attributionEligible = !!attributionKind && record.status === 'new' &&
    !submissionApprovalBlocker(record) && !isSyntheticContact(attributionEmail, data);
  if (data.referral) {
    try {
      referral = recordReferralSubmission({
        token: data.referral,
        submissionId: record.id,
        form: formName,
        at: record.at,
        eligible: attributionEligible,
        subjectKey: attributionSubject,
        actor: 'submission-ingest',
      });
    } catch {
      referral = { attached: false, reason: 'referral_hook_failed_sync_required' };
    }
  } else if (attributionEligible) {
    try {
      directSource = recordDirectSubmission({
        submissionId: record.id,
        form: formName,
        at: record.at,
        eligible: true,
        subjectKey: attributionSubject,
        actor: 'submission-ingest',
      });
    } catch {
      directSource = { recorded: false, reason: 'direct_source_hook_failed_sync_required' };
    }
  }

  let featured = null;
  if (autoFeature && !submissionApprovalBlocker(record)) {
    if (/startup/.test(formName) && opts.featureRole !== false) {
      featured = anonymizeRole(data);
    } else if (/engineer|jobseeker|candidate/.test(formName) && opts.featureCandidate !== false) {
      featured = anonymizeCandidate(data);
    }
    if (featured) {
      featured.sourceSubmissionHash = submissionFingerprint(record.id);
      board = writeBoard((current) => {
        if (/startup/.test(formName)) current.roles = [featured, ...(current.roles || [])].slice(0, 3);
        else current.candidates = [featured, ...(current.candidates || [])].slice(0, 3);
        return current;
      }, { reason: `feature-on-ingest:${record.id}`, actor: 'ingest' });
      const updated = updateInbox((current) => {
        const stored = (current.items || []).find((item) => item.id === record.id);
        if (!stored) throw new Error(`feature_on_ingest_missing: ${record.id}`);
        stored.status = 'featured';
        stored.featuredId = featured.id;
        stored.featuredAt = new Date().toISOString();
        return { inbox: current, record: stored };
      });
      inbox = updated.inbox;
      record = updated.record;
    }
  }

  return { inbox, board, record, featured, referral, directSource, reused: false };
}

/** Parse Webflow webhook POST body (v2 envelope + legacy shapes) */
export function parseWebhookPayload(buf) {
  const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
  try {
    const j = JSON.parse(text);
    if (j.triggerType === 'form_submission' && j.payload) {
      const p = j.payload;
      return { name: p.name || '', data: p.data || {}, sourceSubmissionId: sourceSubmissionId(p.id) || undefined };
    }
    const name = j.name || j.formName || j['form-name'] || j.payload?.name || '';
    const data = j.data || j.payload?.data || (j.payload && !j.payload.name ? j.payload : j);
    const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    return { name, data: fields };
  } catch (_) {
    const params = new URLSearchParams(text);
    const data = Object.fromEntries(params.entries());
    const name = data.name || data['form-name'] || data.formName || '';
    return { name, data };
  }
}
