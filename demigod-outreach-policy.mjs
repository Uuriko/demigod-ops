#!/usr/bin/env node
/**
 * demigod-outreach-policy — pure fail-closed decisions (no IO).
 * CLI: node demigod-outreach-policy.mjs selftest
 */
import { fileURLToPath } from 'url';
import path from 'path';

export const SUPPRESS_STATES = new Set([
  'opted_out',
  'quarantined',
  'bounced',
  'cold',
  'disqualified',
  'rejected',
  'fell_through',
]);

export function outreachPolicy({ mode, suppressed = false, approved = false } = {}) {
  if (suppressed) return { canDraft: false, canSend: false, reason: 'suppressed' };
  if (!mode) return { canDraft: false, canSend: false, reason: 'mode_required' };
  if (mode === 'draft-only') return { canDraft: true, canSend: false, reason: 'draft-only' };
  if (mode === 'approve-each' || mode === 'approve-batch') {
    if (!approved) return { canDraft: true, canSend: false, reason: 'approval-required' };
    return { canDraft: true, canSend: true, reason: 'approved' };
  }
  if (mode === 'auto' || mode === 'auto-audit') {
    return { canDraft: true, canSend: false, reason: 'auto_send_requires_transport_policy' };
  }
  return { canDraft: false, canSend: false, reason: 'unknown_mode:' + mode };
}

export function normalizeHandle(h) {
  if (!h) return '';
  return String(h).trim().replace(/^@+/, '').toLowerCase();
}

export function normalizeEmail(e) {
  if (!e) return '';
  return String(e).trim().toLowerCase();
}

function leadState(lead) {
  const states = [lead?.state, lead?.status].map((x) => String(x || '').toLowerCase());
  return states.find((x) => SUPPRESS_STATES.has(x)) || states.find(Boolean) || '';
}

/** Flatten partners+talent or a bare lead list (pure). */
export function flattenLeads(docOrList) {
  if (Array.isArray(docOrList)) return docOrList.filter(Boolean);
  if (!docOrList || typeof docOrList !== 'object') return [];
  return []
    .concat(docOrList.partners || [])
    .concat(docOrList.talent || [])
    .filter(Boolean);
}

/** Pure identity keys for one lead (email:… / handle:…). */
export function identityKeys(lead) {
  const keys = new Set();
  for (const email of [lead?.email, lead?.contactEmail].map(normalizeEmail)) {
    if (email) keys.add('email:' + email);
  }
  for (const handle of [lead?.handle, lead?.twitter, lead?.x].map(normalizeHandle)) {
    if (handle) keys.add('handle:' + handle);
  }
  return keys;
}

/** Pure minimum contact validity for an approved send. */
export function hasValidContact(lead) {
  const emails = [lead?.email, lead?.contactEmail].map(normalizeEmail);
  const handles = [lead?.handle, lead?.twitter, lead?.x].map(normalizeHandle);
  return (
    emails.some((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !/(?:^placeholder@|^(?:no-?reply|do-?not-?reply|notifications?|workatastartup)@|@trydemigod\.com$|@(?:[^@.]+\.)*example\.(?:com|org|net)$|@(?:ycombinator|workatastartup|indeed|linkedin|wellfound)\.com$)/.test(e)) ||
    handles.some((h) => /^[a-z0-9_]{1,15}$/.test(h) && !/^(?:ycombinator|workatastartup|indeed|linkedin|wellfound|hiring\w*|jobs?with\w*)$/.test(h))
  );
}

/**
 * Pure: identity keys belonging to any terminal/suppress lead.
 * Money path must not re-open for an identity already opted_out etc.
 * Accepts lead array or {partners, talent} doc.
 */
export function suppressedIdentityKeys(docOrList) {
  const keys = new Set();
  for (const lead of flattenLeads(docOrList)) {
    const st = leadState(lead);
    if (!SUPPRESS_STATES.has(st)) continue;
    for (const k of identityKeys(lead)) keys.add(k);
  }
  return keys;
}

/**
 * True when lead shares email/handle with a *different* suppress-terminal lead.
 * Fail-closed money path (match/intro/pair-sync/replies). Self-terminal is separate.
 */
export function isIdentitySuppressedByOther(lead, docOrList) {
  if (!lead || typeof lead !== 'object') return false;
  const myKeys = identityKeys(lead);
  if (!myKeys.size) return false;
  for (const o of flattenLeads(docOrList)) {
    if (!o || o.id === lead.id) continue;
    const st = leadState(o);
    if (!SUPPRESS_STATES.has(st)) continue;
    for (const k of identityKeys(o)) {
      if (myKeys.has(k)) return true;
    }
  }
  return false;
}

export function checkOutreach(lead, doc, opts = {}) {
  const mode = opts.mode;
  if (opts.action != null && !['draft', 'send'].includes(opts.action)) {
    return { ok: false, reason: 'unknown_action:' + opts.action };
  }
  if (mode == null || mode === '') {
    return { ok: false, reason: 'mode_required' };
  }
  const thin = outreachPolicy({
    mode,
    approved: opts.approved === true || mode === 'draft-only',
    suppressed: false,
  });
  if (!lead || typeof lead !== 'object') {
    return { ok: false, reason: 'no_lead' };
  }
  if (opts.action === 'send' && !thin.canSend) {
    return { ok: false, reason: thin.reason || 'cannot_send', mode };
  }
  if (!thin.canDraft && opts.action !== 'send') {
    return { ok: false, reason: thin.reason || 'cannot_draft', mode };
  }
  if (opts.action === 'send' && !hasValidContact(lead)) {
    return { ok: false, reason: 'contact_required' };
  }
  const st = leadState(lead);
  if (SUPPRESS_STATES.has(st)) {
    return { ok: false, reason: 'lead_terminal:' + st };
  }
  const myKeys = identityKeys(lead);
  for (const o of flattenLeads(doc)) {
    if (!SUPPRESS_STATES.has(leadState(o))) continue;
    if (o.id === lead.id) {
      return { ok: false, reason: 'lead_terminal:' + leadState(o), mode };
    }
    const oKeys = identityKeys(o);
    for (const k of myKeys) {
      if (oKeys.has(k)) {
        return { ok: false, reason: 'suppressed:' + o.id, suppressedBy: o.id, mode };
      }
    }
  }
  if ((mode === 'auto' || mode === 'auto-audit') && opts.action === 'send') {
    return { ok: false, reason: 'auto_send_requires_transport_policy' };
  }
  return { ok: true, mode };
}

function selftest() {
  let failed = 0;
  let passed = 0;
  const assert = (c, m) => {
    if (c) {
      passed++;
      console.log('  ok ', m);
    } else {
      failed++;
      console.error('  FAIL', m);
    }
  };
  assert(checkOutreach({ id: 'a' }, { partners: [] }, {}).ok === false, 'mode unset denies');
  assert(
    checkOutreach({ id: 'a', email: 'a@x.com' }, { partners: [] }, { mode: 'draft-only' }).ok === true,
    'clean draft-only ok',
  );
  const doc = { partners: [{ id: 'old', handle: '@Foo', state: 'opted_out' }], talent: [] };
  const r = checkOutreach({ id: 'new', handle: 'foo' }, doc, { mode: 'draft-only' });
  assert(r.ok === false && /suppressed/.test(r.reason || ''), 'opted_out handle suppresses new id');
  assert(
    checkOutreach({ id: 'x', state: 'opted_out' }, { partners: [] }, { mode: 'draft-only' }).ok === false,
    'lead opted_out denied',
  );
  assert(outreachPolicy().canDraft === false && outreachPolicy().canSend === false, 'thin default denies');
  assert(outreachPolicy({ mode: 'surprise' }).canSend === false, 'thin unknown mode denies');
  assert(outreachPolicy({ mode: 'approve-each', approved: true }).canSend === true, 'thin approved can send');
  assert(
    checkOutreach({ id: 's' }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok === false,
    'approved send without contact denied',
  );
  assert(
    checkOutreach(null, doc, { mode: 'approve-each', action: 'send', approved: true }).reason === 'no_lead',
    'approved send without lead fails at lead boundary',
  );
  assert(
    checkOutreach({ id: 's', email: 'not-an-email' }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok === false,
    'approved send with malformed contact denied',
  );
  assert(
    checkOutreach({ id: 's', email: 'person@mail.example.com' }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok === false,
    'approved send to reserved example subdomain denied',
  );
  assert(
    checkOutreach({ id: 's', email: 'workatastartup@ycombinator.com' }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok === false,
    'approved send to job-board mailbox denied',
  );
  assert(
    checkOutreach({ id: 's', email: 'notifications@startup.test' }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok === false,
    'approved send to notification mailbox denied',
  );
  assert(
    checkOutreach({ id: 's', handle: '@ycombinator' }, doc, { mode: 'approve-each', action: 'send', approved: true }).ok === false,
    'approved send to organization handle denied',
  );
  assert(checkOutreach({ id: 's' }, doc, { mode: 'auto', action: 'send' }).ok === false, 'auto send blocked');
  assert(checkOutreach({ id: 's' }, doc, { mode: 'draft-only', action: 'delete' }).ok === false, 'unknown action denied');
  // Shared identity suppress helpers (match/intro/replies money path)
  assert(identityKeys({ email: 'A@X.COM', handle: '@Bar' }).has('email:a@x.com'), 'identityKeys email');
  assert(identityKeys({ handle: '@Bar' }).has('handle:bar'), 'identityKeys handle');
  assert(suppressedIdentityKeys(doc).has('handle:foo'), 'suppressedIdentityKeys from opted_out');
  assert(
    isIdentitySuppressedByOther({ id: 'new', handle: 'foo' }, doc) === true,
    'isIdentitySuppressedByOther detects twin',
  );
  assert(
    isIdentitySuppressedByOther({ id: 'old', handle: 'foo', state: 'opted_out' }, doc) === false,
    'self-terminal is not "by other"',
  );
  assert(
    isIdentitySuppressedByOther({ id: 'clean', email: 'clean@x.com' }, doc) === false,
    'clean identity not suppressed',
  );
  assert(suppressedIdentityKeys([]).size === 0, 'empty suppress keys vacuous');
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.length === 3 && process.argv[2] === 'selftest') selftest();
  console.error('usage: node demigod-outreach-policy.mjs selftest');
  process.exit(2);
}
