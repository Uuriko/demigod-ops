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
export const BOARD_PATH = path.join(ROOT, 'DEMIGOD-BOARD.json');
export const BOARD_LOCK = path.join(ROOT, 'DEMIGOD-BOARD.json.lock');
export const BOARD_AUDIT = path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl');
// Tests must never write the production inbox SoR: *.test.mjs polluted it with 115 fixture rows
// that read as real demand. Redirect them to tmp unless DEMIGOD_INBOX_PATH says otherwise.
const IS_TEST = !!process.env.NODE_TEST_CONTEXT || /\.test\.mjs$/.test(process.argv[1] || '');
export const INBOX_PATH = process.env.DEMIGOD_INBOX_PATH
  || (IS_TEST ? '/tmp/dg-busy/test-submissions-inbox.json' : path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json'));

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
  const title = clip(raw['role-title'] || raw.roleTitle || 'Open role', 60);
  const skills = clip(raw['stack-needs'] || raw.stackNeeds || '', 100);
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
  const skills = clip(raw['skills-stack'] || raw.skillsStack || '', 80);
  const exp = clip(raw.experience || '', 100);
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
    return { at: new Date().toISOString(), roles: [], candidates: [], cdnUrl: null };
  }
}

export function loadInbox() {
  try {
    return JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8'));
  } catch (_) {
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
  fs.writeFileSync(INBOX_PATH, JSON.stringify(inbox, null, 2));
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
  const realReceipts = (filtered.receipts || []).filter(
    (r) => r && r.sample === false && !/sample|demo/i.test(r.note || '') && !/^demo/i.test(r.hash || ''),
  );
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
  const inbox = loadInbox();
  const board = loadBoard();
  const autoFeature = opts.autoFeature === true || process.env.DEMIGOD_AUTO_FEATURE === '1';
  const gate = shouldAutoReject(data, formName, inbox);

  const record = {
    id: slugId('sub'),
    at: new Date().toISOString(),
    form: formName,
    raw: { ...data },
    status: gate.reject ? (gate.reasons.includes('test_keyword') ? 'spam' : 'rejected') : 'new',
    rejectReasons: gate.reject ? gate.reasons : undefined,
  };
  inbox.items = [record, ...(inbox.items || [])].slice(0, 200);
  saveInbox(inbox);

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
