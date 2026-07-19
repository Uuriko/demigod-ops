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
import { atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = '/home/potter';

// Tests must never write production SoRs. *.test.mjs polluted the inbox with 115 fixture rows that
// read as real demand, and the board (which feeds the live site) was corrupted twice the same way.
// node --test sets NODE_TEST_CONTEXT; the argv check covers direct `node foo.test.mjs` runs.
const IS_TEST = !!process.env.NODE_TEST_CONTEXT || /\.test\.mjs$/.test(process.argv[1] || '');
const TEST_DIR = '/tmp/dg-busy';

export const BOARD_PATH = IS_TEST
  ? path.join(TEST_DIR, 'test-board.json')
  : path.join(ROOT, 'DEMIGOD-BOARD.json');
export const BOARD_LOCK = BOARD_PATH + '.lock';
export const BOARD_AUDIT = IS_TEST
  ? path.join(TEST_DIR, 'test-board-audit.jsonl')
  : path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl');
export const INBOX_PATH = process.env.DEMIGOD_INBOX_PATH
  || (IS_TEST ? path.join(TEST_DIR, 'test-submissions-inbox.json') : path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json'));
// Mirror BOARD_LOCK: the leads inbox needs the same read-modify-write serialization the board has.
// atomicWrite stops a torn READ but not a LOST UPDATE -- two concurrent ingests both loadInbox() the
// same snapshot, both prepend, the second saveInbox() clobbers the first, and a real submission
// vanishes. ingestSubmission is the live webhook path, so simultaneous form posts hit exactly this.
export const INBOX_LOCK = INBOX_PATH + '.lock';

const STAGE_RE = /\b(pre-?seed|seed|series\s*[a-d]|yc|stealth)\b/i;
const VERTICAL_RE = /\b(b2b\s*saas?|consumer|fintech|healthtech|devtools|ai|marketplace|hardware)\b/i;
const DEDUPE_DAYS = Number(process.env.DEMIGOD_DEDUPE_DAYS || 30);
const ARCHIVE_DAYS = Number(process.env.DEMIGOD_ARCHIVE_DAYS || 14);
const TEST_RE = /\btest\b/i;
const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export function extractEmail(data = {}, formName = '') {
  const fn = String(formName).toLowerCase();
  if (/startup/.test(fn)) return String(data['contact-email'] || data.contactEmail || '').toLowerCase().trim();
  if (/partner/.test(fn)) return String(data['partner-email'] || data.partnerEmail || '').toLowerCase().trim();
  return String(data['seeker-email'] || data.seekerEmail || '').toLowerCase().trim();
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
  if (fa === fb) return true;
  // startup-hire ↔ startup, engineer-join ↔ engineer-join-sms
  const stem = (s) => s.split(/[-_]/)[0] || s;
  return stem(fa) === stem(fb) || fa.includes(stem(fb)) || fb.includes(stem(fa));
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
  const resumeSize = Number(data['resume-size'] || data.resumeSize || data._resumeBytes || 0);
  if (resumeSize > MAX_RESUME_BYTES) reasons.push('resume_too_large');

  const cutoff = Date.now() - DEDUPE_DAYS * 86400000;
  const dup = (inbox.items || []).find((item) => {
    if (item.status === 'rejected' || item.status === 'spam') return false;
    const itemEmail = extractEmail(item.raw || {}, item.form || '');
    return email && itemEmail && itemEmail === email && new Date(item.at).getTime() > cutoff;
  });
  if (dup) reasons.push('duplicate_email');

  return { reject: reasons.length > 0, reasons, email };
}

/** Drop featured cards older than ARCHIVE_DAYS (board filter stub). */
export function filterBoard(board = {}) {
  const cutoff = Date.now() - ARCHIVE_DAYS * 86400000;
  const fresh = (item) => {
    const at = item.featuredAt || item.at;
    if (!at) return true;
    return new Date(at).getTime() >= cutoff;
  };
  return {
    ...board,
    roles: (board.roles || []).filter(fresh).slice(0, 3),
    candidates: (board.candidates || []).filter(fresh).slice(0, 3),
  };
}

export function slugId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

// Redact email/phone from free-text before it is published. anonymize* already drops the structured
// PII fields, but the free-text skills/experience/stack-needs get concatenated into the published
// summary/tags/skills verbatim — a candidate/founder who types their email or phone there would
// otherwise leak it to the live board. Names aren't pattern-detectable; email+phone are the
// legal/trust-critical PII. (#23)
function scrubPII(text = '') {
  return String(text)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[contact removed]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone removed]')
    // A LinkedIn profile URL in a free-text field de-anonymizes the candidate (defeats anonymize*).
    // /in/ and /pub/ are always personal profiles — redact. (github/twitter left alone: repo/org refs
    // there are legit skill signal, and over-scrubbing them loses matching value.)
    .replace(/(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/(?:in|pub)\/[\w%-]+/gi, '[profile removed]');
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

/** startup-hire fields → anonymized open role */
export function anonymizeRole(raw = {}) {
  const title = clip(scrubPII(raw['role-title'] || raw.roleTitle || 'Open role'), 60);
  const skills = clip(scrubPII(raw['stack-needs'] || raw.stackNeeds || ''), 100);
  const comp = clip(raw['salary-range'] || raw.salaryRange || 'Comp on intro', 40);
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
  try {
    return JSON.parse(fs.readFileSync(BOARD_PATH, 'utf8'));
  } catch (_) {
    // Same guard as loadInbox: a board that EXISTS but won't parse must be copied aside before any
    // caller saves over the empty default, else the next saveBoard silently WIPES the board SoR
    // (roles/candidates). A MISSING file is a normal fresh start. Preserve corrupt bytes first.
    try {
      if (fs.existsSync(BOARD_PATH)) fs.copyFileSync(BOARD_PATH, `${BOARD_PATH}.corrupt.${Date.now()}`);
    } catch {
      /* best-effort preservation; never block the fresh start */
    }
    return { at: new Date().toISOString(), roles: [], candidates: [], cdnUrl: null };
  }
}

export function loadInbox() {
  try {
    return JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8'));
  } catch (_) {
    // A MISSING file is a normal fresh start -> empty. But a file that EXISTS and won't parse must be
    // preserved before any caller saves over it: otherwise the next ingestSubmission prepends to this
    // empty default and saveInbox() silently WIPES the entire leads SoR down to one row -- worse than
    // a crash, which would at least leave the bytes recoverable. Atomic writes (b8897b9) make this
    // near-impossible now, but a disk error or manual edit could still corrupt it, and the leads file
    // is the one place total silent loss is unacceptable. Copy the corrupt bytes aside first.
    try {
      if (fs.existsSync(INBOX_PATH)) fs.copyFileSync(INBOX_PATH, `${INBOX_PATH}.corrupt.${Date.now()}`);
    } catch {
      /* best-effort preservation; never let it block the fresh start */
    }
    return { at: new Date().toISOString(), items: [] };
  }
}

export function findSubmission(id) {
  const needle = String(id || '').trim();
  if (!needle) return null;
  return (loadInbox().items || []).find((i) => i.id === needle) || null;
}

/** Public status payload — no PII (no raw fields, no email). */
export function publicStatus(record = {}) {
  const form = String(record.form || 'submission').toLowerCase();
  const status = String(record.status || 'new');
  let kind = 'submission';
  let headline = 'Submission received';
  let lead = 'A human is reviewing your submission.';
  let steps = ['Received', 'Human review', 'hello@ follow-up on fit'];

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
  if (status === 'rejected') steps[1] = 'Declined — did not pass review gate';
  if (status === 'spam') steps[1] = 'Filtered — did not pass review gate';

  return {
    id: record.id,
    kind,
    form: record.form || '',
    status,
    headline,
    lead,
    steps,
    at: record.at || null,
    updatedAt: record.reviewedAt || record.at || null,
  };
}

export function saveInbox(inbox) {
  inbox.at = new Date().toISOString();
  // atomicWrite, not writeFileSync: this is the leads SoR and a plain write truncates-then-writes,
  // so a concurrent reader (triage, the dashboard, another agent) can catch it torn -- measured
  // 58.6% torn reads on a 340KB file. This same file already atomicWrites BOARD_PATH at :321 with
  // the helper imported at :12; the inbox was simply missed.
  atomicWrite(INBOX_PATH, JSON.stringify(inbox, null, 2));
  // PII (contacts) — atomicWrite preserves an existing 0600 but a FRESH file gets the umask default
  // (0644). Ensure 0600 on every save so a newly-created inbox is never world-readable.
  try { fs.chmodSync(INBOX_PATH, 0o600); } catch { /* best-effort */ }
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

/** Ingest raw webhook/form body; returns { inbox, board, record, featured } */
export function ingestSubmission(body = {}, opts = {}) {
  const formName = (body.name || body.formName || body['form-name'] || '').toLowerCase();
  const data = body.data || body.fields || body;
  const board = loadBoard();
  const autoFeature = opts.autoFeature === true || process.env.DEMIGOD_AUTO_FEATURE === '1';

  // Serialize the whole inbox read-modify-write, not just the write. atomicWrite already stops a
  // torn read; this stops a LOST UPDATE -- two concurrent ingests both loadInbox() the same snapshot,
  // both prepend, the second saveInbox() clobbers the first, dropping a real submission. The board
  // does exactly this via writeBoard()/withFileLock(BOARD_LOCK); the inbox was the asymmetry. The
  // dup-check (shouldAutoReject reads the inbox) belongs inside the lock too, or two identical posts
  // race the dedupe. record is captured out here for the featuring step below.
  let inbox;
  let record;
  withFileLock(
    INBOX_LOCK,
    () => {
      inbox = loadInbox();
      const gate = shouldAutoReject(data, formName, inbox);
      record = {
        id: slugId('sub'),
        at: new Date().toISOString(),
        form: formName,
        raw: { ...data },
        status: gate.reject ? (gate.reasons.includes('test_keyword') ? 'spam' : 'rejected') : 'new',
        rejectReasons: gate.reject ? gate.reasons : undefined,
      };
      // Cap the working inbox at 200 -- but ARCHIVE what falls off the end instead of dropping it.
      // The old `.slice(0, 200)` silently evicted the oldest lead on the 201st submission: a founder
      // who submitted early just vanished from the record. Same "never silently lose a lead" principle
      // as the lock (a5c881f) and the corrupt-preserve guard (665d0da). Append-only JSONL archive; the
      // working file stays bounded and every lead is recoverable. Runs inside the INBOX_LOCK, so the
      // archive append is serialized too.
      const combined = [record, ...(inbox.items || [])];
      if (combined.length > 200) {
        const evicted = combined.slice(200);
        try {
          fs.appendFileSync(INBOX_PATH + '.archive.jsonl', evicted.map((x) => JSON.stringify(x)).join('\n') + '\n');
        } catch {
          /* best-effort: never let archiving block the ingest of a new lead */
        }
      }
      inbox.items = combined.slice(0, 200);
      saveInbox(inbox);
    },
    { timeoutMs: 20000, staleMs: 120000 },
  );

  let featured = null;
  if (autoFeature) {
    if (/startup/.test(formName) && opts.featureRole !== false) {
      featured = anonymizeRole(data);
      board.roles = [featured, ...(board.roles || [])].slice(0, 3);
    } else if (/engineer|jobseeker|candidate/.test(formName) && opts.featureCandidate !== false) {
      featured = anonymizeCandidate(data);
      board.candidates = [featured, ...(board.candidates || [])].slice(0, 3);
    }
    if (featured) {
      record.status = 'featured';
      record.featuredId = featured.id;
      saveInbox(inbox);
      saveBoard(board, { reason: `feature-on-ingest:${record?.id || 'unknown'}`, actor: 'ingest' });
    }
  }

  return { inbox, board, record, featured };
}

/** Parse Webflow webhook POST body (v2 envelope + legacy shapes) */
export function parseWebhookPayload(buf) {
  const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
  try {
    const j = JSON.parse(text);
    if (j.triggerType === 'form_submission' && j.payload) {
      const p = j.payload;
      return { name: p.name || '', data: p.data || {} };
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
