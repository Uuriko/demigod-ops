#!/usr/bin/env node
/**
 * demigod-replies-ingest — map reply-check / gmail dump → funnel transitions.
 * Never sends. Pure plan is fail-closed. Evidence under /tmp/dg-busy/funnel/replies/.
 *
 *   node demigod-replies-ingest.mjs              # scan-local + report
 *   node demigod-replies-ingest.mjs --apply      # transition allowed matches only
 *   node demigod-replies-ingest.mjs --file=/tmp/demigod-gmail-inbound.json
 *   node demigod-replies-ingest.mjs selftest
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';
import {
  identityKeys,
  isIdentitySuppressedByOther,
  normalizeEmail,
  normalizeHandle,
  suppressedIdentityKeys,
  SUPPRESS_STATES,
} from './demigod-outreach-policy.mjs';
import { canTransition, receiptLooksValid } from './demigod-funnel.mjs';

/** Re-export policy helpers (stable surface for funnel-selftest + CLI consumers). */
export { identityKeys as identityKeysFromLead, suppressedIdentityKeys, isIdentitySuppressedByOther };

/**
 * Pure: does this lead carry in-memory send-receipt evidence?
 * Fail-closed for the replied money path — bare state=sent is not enough.
 * Path-only claims (sentReceipt file ref without text) do not count here;
 * the IO apply path can revalidate via hasValidSendReceipt when disk is available.
 * Explicit lead.receiptBacked true/false wins when set.
 */
export function pureLeadReceiptBacked(lead) {
  if (!lead || typeof lead !== 'object') return false;
  if (lead.receiptBacked === true) return true;
  if (lead.receiptBacked === false) return false;
  const hist = Array.isArray(lead.stateHistory) ? lead.stateHistory : [];
  for (const h of hist) {
    if (!h || typeof h !== 'object') continue;
    if (
      h.to !== 'sent' &&
      h.to !== 'nudged' &&
      h.kind !== 'send' &&
      h.kind !== 'receipt' &&
      h.kind !== 'nudge'
    ) {
      continue;
    }
    const blob = [h.evidenceText, h.note, h.receiptText].filter(Boolean).join('\n');
    if (blob && receiptLooksValid(blob)) return true;
  }
  for (const blob of [lead.sentReceiptText, lead.receiptText, lead.nudgeReceiptText]) {
    if (blob && receiptLooksValid(String(blob))) return true;
  }
  return false;
}

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const LEADS = path.join(ROOT, 'DEMIGOD-LEADS.json');
const BUSY = '/tmp/dg-busy';
const EVIDENCE = path.join(BUSY, 'funnel', 'replies');
const REPORT_JSON = '/tmp/demigod-reply-check-latest.json';

/** States that may advance to replied (mirror funnel ALLOWED; fail-closed). */
export const REPLY_FROM = new Set(['sent', 'nudged']);
/** States that may advance to opted_out (mirror funnel ALLOWED; fail-closed). */
export const OPT_OUT_FROM = new Set(['sent', 'nudged', 'replied', 'form_filled']);
/** States that may advance to bounced via DSN (mirror funnel ALLOWED; fail-closed). */
export const BOUNCE_FROM = new Set(['sent', 'nudged']);

export function extractEmailsFromText(text) {
  const m = String(text || '').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return [...new Set(m.map(normalizeEmail).filter(Boolean))];
}

/** Parse RFC-ish From: "Name <a@b.com>" or bare email. */
export function extractEmailsFromFromHeader(from) {
  const s = String(from || '');
  const angle = s.match(/<([^>]+@[^>]+)>/g) || [];
  if (angle.length) {
    return [...new Set(angle.map((x) => normalizeEmail(x.replace(/[<>]/g, ''))).filter(Boolean))];
  }
  return extractEmailsFromText(s);
}

/** Strip emails so `user@domain.com` never yields fake handle `domain`. */
function stripEmailsForHandles(text) {
  return String(text || '')
    .replace(/<[^>]*@[^>]*>/g, ' ')
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, ' ');
}

export function extractHandlesFromText(text) {
  const m = stripEmailsForHandles(text).match(/@([A-Za-z0-9_]{2,30})/g) || [];
  return [...new Set(m.map((h) => normalizeHandle(h)).filter(Boolean))];
}

export function isOptOutBlob(blob) {
  return /unsubscribe|no thanks|stop\b|remove me|opt.?out|do not contact|leave me alone/i.test(
    String(blob || ''),
  );
}

function isNoiseEmail(e) {
  return (
    !e ||
    /@trydemigod\.com$/i.test(e) ||
    /^(noreply|no-reply|mailer-daemon|postmaster|bounce|notifications?)@/i.test(e)
  );
}

/**
 * Pure: hard bounce / DSN blobs (subset of auto). Opens bounced terminal, never replied.
 * Opt-out language still wins via isOptOutBlob (privacy).
 */
export function isBounceBlob(blob) {
  return /delivery status notification|mail delivery subsystem|undeliverable|returned mail|failure notice|mailbox (is )?full|delivery failure|address rejected|user unknown|recipient (?:address )?rejected|no such user|does not exist|550\s|551\s|552\s|553\s/i.test(
    String(blob || ''),
  );
}

/**
 * Pure: failed-recipient emails from a DSN / bounce blob only.
 * Prefer RFC DSN fields + narrative "undeliverable to …" — never every body address
 * (CC / support@ / list footers must not open bounce money path).
 * Fail-closed: empty → no bounce identity from body.
 */
export function extractBounceRecipients(text) {
  const s = String(text || '');
  const out = new Set();
  const push = (raw) => {
    const e = normalizeEmail(String(raw || '').replace(/[<>]/g, ''));
    if (e && !isNoiseEmail(e)) out.add(e);
  };
  // RFC 3464-ish fields
  const fieldRe =
    /(?:Final-Recipient|Original-Recipient|X-Failed-Recipients)\s*:\s*(?:rfc822;\s*)?([^\s,;<>]+@[^\s,;<>]+)/gi;
  let m;
  while ((m = fieldRe.exec(s))) push(m[1]);
  // Narrative failed-recipient phrases (keyword before email)
  const narrRe =
    /(?:undeliverable(?:\s+mail)?(?:\s+to)?|delivery(?:\s+has\s+failed)?\s+to|(?:failed|failure)\s+(?:for|to)|recipient(?:\s+address)?(?:\s+rejected)?|user unknown|no such user|does not exist)\s*:?\s*<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?/gi;
  while ((m = narrRe.exec(s))) push(m[1]);
  // "The address user@x was undeliverable" / "user@x … user unknown" (email before keyword)
  const preEmailRe =
    /(?:address|recipient|to)\s*:?\s*<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?\s+(?:was\s+)?(?:undeliverable|rejected|unknown|failed|not found|does not exist)/gi;
  while ((m = preEmailRe.exec(s))) push(m[1]);
  const postEmailRe =
    /<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?\s+(?:was\s+)?(?:undeliverable|user unknown|no such user)/gi;
  while ((m = postEmailRe.exec(s))) push(m[1]);
  // Bare "To: user@x failed" lines common in Google/MS DSN
  const toFailRe =
    /(?:^|\n)\s*(?:To|Original-To|X-Original-To)\s*:\s*<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?(?:[^\n]*(?:fail|undeliver|reject|unknown))?/gi;
  while ((m = toFailRe.exec(s))) {
    // Only count To: lines when the surrounding window looks like a bounce
    const start = Math.max(0, m.index - 40);
    const win = s.slice(start, m.index + m[0].length + 40);
    if (isBounceBlob(win) || /fail|undeliver|reject|unknown|550|551|552|553/i.test(win)) {
      push(m[1]);
    }
  }
  return [...out];
}

/**
 * Pure: OOO / bounce / auto-reply / calendar / bulk-list blobs must not open replied.
 * Opt-out language still wins via isOptOutBlob (privacy).
 * Bounce is classified separately (isBounceBlob) so plan can land on bounced.
 */
export function isAutoReplyBlob(blob) {
  return (
    isBounceBlob(blob) ||
    /out of office|automatic reply|auto[- ]?reply|auto[- ]?response|vacation (reply|response)|i am currently (away|out|on leave)|this is an automated (message|response|email)|do not reply to this (message|email)|(?:^|\b)(?:accepted|declined|tentative):\s|invitation from calendar|auto-submitted\s*:|x-auto-response-suppress|list-unsubscribe|precedence:\s*(?:bulk|list|junk)|mailing list (?:message|footer)|this (?:is )?(?:a )?system[- ]generated/i.test(
      String(blob || ''),
    )
  );
}

/**
 * Normalize one inbound message-like object into a signal.
 * Pure. Fail-closed: empty identity → no usable signal (caller skips).
 * Identity emails + handles come from From: only — subject/body scrapes never match leads
 * (forwards / CC / "re: @someone" noise would false-open the money path).
 * Auto-reply/OOO flagged; planReplyApply denies replied (opt-out still allowed).
 */
export function signalFromMessage(m) {
  if (!m || typeof m !== 'object') return null;
  const from = m.from || m.sender || '';
  const preview = m.preview || m.snippet || m.body_preview || m.body || '';
  const subject = m.subject || '';
  const blob = [from, subject, preview, m.to || ''].join('\n');
  // Identity: From header only for replied money path (fail-closed)
  const identityEmails = extractEmailsFromFromHeader(from).filter((e) => !isNoiseEmail(e));
  // Body/subject emails: diagnostic only (never match replied). Bounce uses extractBounceRecipients.
  const bodyEmails = extractEmailsFromText([subject, preview].join('\n')).filter(
    (e) => !isNoiseEmail(e) && !identityEmails.includes(e),
  );
  // Handles: From only (identity). Subject @mentions are diagnostic — never match money path.
  const handles = extractHandlesFromText(from);
  const subjectHandles = extractHandlesFromText(subject).filter((h) => !handles.includes(h));
  const unsub = isOptOutBlob(blob);
  const bounce = !unsub && isBounceBlob(blob);
  // Hard bounce DSN often has From: mailer-daemon — failed-recipient fields only (not every body addr)
  const bounceRecipients = bounce
    ? extractBounceRecipients([subject, preview, m.to || ''].join('\n')).filter(
        (e) => !identityEmails.includes(e),
      )
    : [];
  const bounceBodyOnly =
    bounce && !identityEmails.length && !handles.length && bounceRecipients.length > 0;
  const emails = bounceBodyOnly ? bounceRecipients : identityEmails;
  if (!emails.length && !handles.length) return null;
  return {
    emails: [...new Set(emails)],
    bodyEmails: [...new Set(bodyEmails)],
    bounceRecipients: [...new Set(bounceRecipients)],
    handles: [...new Set(handles)],
    subjectHandles: [...new Set(subjectHandles)],
    unsub,
    bounce,
    bounceBodyOnly,
    // Auto-reply is diagnostic on opt-out (privacy wins); blocks replied only
    // Bounce is also auto (defense-in-depth) but plan may land on bounced
    auto: !unsub && (bounce || isAutoReplyBlob(blob)),
    id: m.message_id || m.id || m.thread_id || m.threadId || subject.slice(0, 40) || 'msg',
    snippet: String(subject || preview).slice(0, 120),
    from,
  };
}

/**
 * Build signals from reply-check JSON or raw gmail dump.
 * Supports current report shape (humans / humanSamples) + legacy threads/hits.
 */
export function signalsFromReport(report) {
  if (!report || typeof report !== 'object') return [];
  const signals = [];
  const seen = new Set();

  const pushMsg = (m) => {
    const sig = signalFromMessage(m);
    if (!sig) return;
    const key = `${sig.emails.join(',')}|${sig.handles.join(',')}|${sig.id}|${sig.unsub}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push(sig);
  };

  // Preferred: classified human lists from demigod-reply-check
  const humanLists = [report.humans, report.humanSamples, report.messages].filter(Array.isArray);
  for (const list of humanLists) {
    for (const m of list) pushMsg(m);
  }

  // Legacy / raw gmail: threads with nested messages
  const threads = report.threads || report.hits || [];
  if (Array.isArray(threads)) {
    for (const t of threads) {
      const msgs = t.messages || [t];
      for (const m of msgs) {
        pushMsg({
          from: m.from || t.from || '',
          subject: m.subject || t.subject || '',
          preview: m.body_preview || m.snippet || m.preview || t.snippet || '',
          message_id: m.message_id || m.id || t.thread_id || t.id,
          thread_id: t.thread_id || t.id,
          to: m.to || t.to || '',
        });
      }
    }
  }

  // Flattened top-level array payload
  if (Array.isArray(report) || Array.isArray(report.items)) {
    for (const m of report.items || report) pushMsg(m);
  }

  return signals;
}

function leadEmails(lead) {
  return [lead?.email, lead?.contactEmail].map(normalizeEmail).filter(Boolean);
}

function leadHandles(lead) {
  return [lead?.handle, lead?.twitter, lead?.x].map(normalizeHandle).filter(Boolean);
}

/** True when signal identity collides with a suppressed identity key set. */
export function signalHitsSuppressed(sig, suppressedKeys) {
  if (!sig || !suppressedKeys || !suppressedKeys.size) return false;
  for (const e of sig.emails || []) {
    if (suppressedKeys.has('email:' + e)) return true;
  }
  for (const h of sig.handles || []) {
    if (suppressedKeys.has('handle:' + h)) return true;
  }
  return false;
}

/**
 * Pure match: signals × leads by email or handle.
 * Suppress-terminal leads never match for replied (opt-out still allowed if same identity).
 * Sample/selftest leads never match for replied (money path); opt-out still allowed (privacy).
 * Identity on ANY suppress-terminal lead blocks replied matches for that identity (fail-closed).
 * Each match carries receiptBacked (pure in-memory receipt evidence) for planReplyApply.
 * Policy helpers live in demigod-outreach-policy (single SoR).
 */
export function matchSignalsToLeads(signals, leads) {
  const matches = [];
  const seen = new Set();
  const suppressed = suppressedIdentityKeys(leads);
  for (const sig of signals || []) {
    for (const lead of leads || []) {
      if (!lead || !lead.id) continue;
      const sampleLead = !!(lead.sample || lead.selftest || lead.test);
      // Sample leads: opt-out only (privacy); never open replied/bounced money path
      if (sampleLead && !sig.unsub) continue;
      const le = leadEmails(lead);
      const lh = leadHandles(lead);
      const emailHit = sig.emails?.some((e) => le.includes(e));
      const handleHit = sig.handles?.some((h) => lh.includes(h));
      if (!emailHit && !handleHit) continue;
      // Fail-closed money: identity already terminal on any lead → no replied open
      // (opt-out + bounce still match so terminal hygiene can land on the active lead)
      const identitySuppressed =
        !sig.unsub && !sig.bounce && signalHitsSuppressed(sig, suppressed);
      const kind = sig.unsub ? 'u' : sig.bounce ? 'b' : 'r';
      const key = `${lead.id}|${sig.id}|${kind}${identitySuppressed ? '|s' : ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        leadId: lead.id,
        email: le[0] || sig.emails?.[0] || null,
        handle: lh[0] || sig.handles?.[0] || null,
        state: String(lead.state || lead.status || '').toLowerCase(),
        unsub: !!sig.unsub,
        bounce: !!sig.bounce,
        auto: !!sig.auto,
        signalId: sig.id,
        snippet: sig.snippet,
        via: emailHit ? 'email' : 'handle',
        sample: sampleLead,
        // Bare state=sent without receipt text → false (replied money path fail-closed)
        receiptBacked: pureLeadReceiptBacked(lead),
        ...(identitySuppressed ? { blocked: 'identity_suppressed' } : {}),
      });
    }
  }
  return matches;
}

/**
 * Pure: empty or mail-client noise alone (Re:/Fwd:/… with no body).
 * signalFromMessage falls back to subject as both id and snippet when message_id
 * is absent — "Re:" alone must not open the money path.
 */
export function isVacuousMailSnippet(s) {
  const t = String(s || '').trim();
  if (!t) return true;
  // One or more pure reply/forward prefixes only (no human body text)
  return /^(?:(?:re|fw|fwd|aw|sv|antw|rif)(?:\s*\[\d+\])?\s*:\s*)+$/i.test(t);
}

/**
 * Pure fail-closed plan for one match.
 * Evidence must carry a real signal (snippet or signalId) — empty blob is vacuous-green.
 * Vacuous: empty, default id "msg", or pure Re:/Fwd: subject noise when both sides
 * lack a real message_id (subject-as-id fallback from signalFromMessage).
 * Priority: opt-out > bounce (DSN) > human reply. OOO/auto never open replied.
 * Replied money path: when match.receiptBacked === false, deny (bare state=sent is not enough).
 * receiptBacked undefined keeps direct unit plans working; matchSignalsToLeads always sets it.
 * Opt-out + bounce do not require receipt (privacy / DSN hygiene).
 * @returns {{ ok: boolean, to?: string, reason: string, evidenceText?: string }}
 */
export function planReplyApply(match) {
  if (!match || !match.leadId) return { ok: false, reason: 'no_match' };
  if (match.ambiguous) return { ok: false, reason: 'ambiguous_signal' };
  // Identity suppress blocks replied only; opt-out + bounce still land (terminal hygiene)
  const isBounce =
    !match.unsub &&
    (match.bounce || match.bounceSignal || isBounceBlob(match.snippet));
  if (match.blocked === 'identity_suppressed' && !match.unsub && !isBounce) {
    return { ok: false, reason: 'identity_suppressed' };
  }
  if ((match.sample || match.selftest || match.test) && !match.unsub) {
    return { ok: false, reason: 'sample_or_test' };
  }
  const from = String(match.state || '').toLowerCase();
  if (!from) return { ok: false, reason: 'state_required' };
  if (SUPPRESS_STATES.has(from) && !match.unsub) {
    return { ok: false, reason: 'lead_terminal:' + from };
  }
  const snippet = String(match.snippet || '').trim();
  const signalId = String(match.signalId || '').trim();
  // Fail-closed: need at least one non-vacuous evidence surface.
  // Vacuous id: empty, default "msg", or pure Re:/Fwd: (subject-as-id fallback).
  // Vacuous snippet: empty or pure Re:/Fwd: mail-client noise.
  // Real message_id + empty/"Re:" snippet still ok (id alone is a real bind).
  const vacuousId = !signalId || signalId === 'msg' || isVacuousMailSnippet(signalId);
  const vacuousSnippet = isVacuousMailSnippet(snippet);
  if (vacuousSnippet && vacuousId) {
    return { ok: false, reason: 'evidence_empty' };
  }

  // Bounce DSN → bounced (not replied). Before generic auto_reply deny.
  if (isBounce) {
    if (!BOUNCE_FROM.has(from)) {
      return { ok: false, reason: `${from} → bounced not allowed` };
    }
    const evidenceText = `BOUNCE signal\nlead: ${match.leadId}\nsignalId: ${signalId}\nsnippet: ${snippet}`;
    const check = canTransition(from, 'bounced', { evidenceText, actor: 'replies-ingest' });
    if (!check.ok) return { ok: false, reason: check.error || 'canTransition_denied' };
    return { ok: true, to: 'bounced', reason: 'allowed', evidenceText };
  }

  // OOO / auto-reply must not open replied money path (opt-out still allowed).
  // Defense-in-depth: sniff snippet even when match.auto was not set upstream.
  if (
    !match.unsub &&
    (match.auto || match.autoReply || isAutoReplyBlob(match.snippet))
  ) {
    return { ok: false, reason: 'auto_reply' };
  }

  const to = match.unsub ? 'opted_out' : 'replied';
  if (to === 'replied' && !REPLY_FROM.has(from)) {
    return { ok: false, reason: `${from} → replied not allowed` };
  }
  if (to === 'opted_out' && !OPT_OUT_FROM.has(from)) {
    return { ok: false, reason: `${from} → opted_out not allowed` };
  }
  // Fail-closed money: matched bare state=sent without receipt evidence cannot open replied.
  // (Direct unit plans omit receiptBacked → still allowed; matchSignalsToLeads always sets it.)
  if (to === 'replied' && match.receiptBacked === false) {
    return { ok: false, reason: 'sent_receipt_missing' };
  }
  const evidenceText = match.unsub
    ? `OPT-OUT signal\nlead: ${match.leadId}\nsignalId: ${signalId}\nsnippet: ${snippet}`
    : `REPLY signal\nlead: ${match.leadId}\nsignalId: ${signalId}\nsnippet: ${snippet}`;
  const check = canTransition(from, to, { evidenceText, actor: 'replies-ingest' });
  if (!check.ok) return { ok: false, reason: check.error || 'canTransition_denied' };
  return { ok: true, to, reason: 'allowed', evidenceText };
}

/** Pure: treat match row as auto/OOO (never opens replied; may shadow a later human). */
function matchIsAuto(m) {
  if (!m) return false;
  if (m.unsub || m.bounce || isBounceBlob(m.snippet)) return false;
  return !!(m.auto || m.autoReply || isAutoReplyBlob(m.snippet));
}

/**
 * Pure batch plan: one decision per leadId.
 * Priority per lead: opt-out > bounce > human reply > auto (fail-closed privacy + hygiene).
 * Auto must not permanently shadow a later human reply for the same lead.
 * Same non-unsub/non-bounce signal matching 2+ leads → all denied (ambiguous identity).
 * Bounce multi-lead is allowed (same DSN can mark every hit as bounced).
 * @returns {{ plans: object[], plannable: number }}
 */
export function planReplyBatch(matches) {
  // Ambiguous: one human-reply signalId → multiple leadIds (fail-closed money path)
  // Bounce/opt-out multi-lead is intentional (terminal hygiene).
  // Auto signals are not money-path replies — exclude from ambiguous collision set.
  const replyBySignal = new Map();
  for (const m of matches || []) {
    if (!m?.leadId || m.unsub || m.bounce || isBounceBlob(m.snippet)) continue;
    if (matchIsAuto(m)) continue;
    const sid = String(m.signalId || '').trim() || `anon:${m.email || m.handle || m.leadId}`;
    if (!replyBySignal.has(sid)) replyBySignal.set(sid, new Set());
    replyBySignal.get(sid).add(m.leadId);
  }
  const ambiguousLeads = new Set();
  for (const leadIds of replyBySignal.values()) {
    if (leadIds.size > 1) {
      for (const id of leadIds) ambiguousLeads.add(id);
    }
  }

  const byLead = new Map();
  for (const m of matches || []) {
    if (!m?.leadId) continue;
    const isBounce = !!(m.bounce || isBounceBlob(m.snippet));
    const row =
      ambiguousLeads.has(m.leadId) && !m.unsub && !isBounce
        ? { ...m, ambiguous: true }
        : m;
    const prev = byLead.get(m.leadId);
    if (!prev) {
      byLead.set(m.leadId, row);
      continue;
    }
    // Prefer unsub > bounce > human reply > auto (stable within tier)
    if (row.unsub && !prev.unsub) byLead.set(m.leadId, row);
    else if (
      !prev.unsub &&
      (row.bounce || isBounceBlob(row.snippet)) &&
      !(prev.bounce || isBounceBlob(prev.snippet))
    ) {
      byLead.set(m.leadId, row);
    } else if (
      !prev.unsub &&
      !(prev.bounce || isBounceBlob(prev.snippet)) &&
      matchIsAuto(prev) &&
      !matchIsAuto(row) &&
      !row.unsub &&
      !(row.bounce || isBounceBlob(row.snippet))
    ) {
      // Human reply beats a prior OOO/auto for the same lead
      byLead.set(m.leadId, row);
    }
  }
  const plans = [];
  for (const m of byLead.values()) {
    plans.push({
      leadId: m.leadId,
      unsub: !!m.unsub,
      bounce: !!(m.bounce || isBounceBlob(m.snippet)),
      state: m.state,
      ...planReplyApply(m),
    });
  }
  return { plans, plannable: plans.filter((p) => p.ok).length };
}

function runReplyCheck(fileArg) {
  const args = [path.join(ROOT, 'demigod-reply-check.mjs')];
  if (fileArg) args.push(fileArg);
  else if (fs.existsSync('/tmp/demigod-gmail-inbound.json')) {
    args.push('--file=/tmp/demigod-gmail-inbound.json');
  } else {
    args.push('--scan-local');
  }
  return spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

function loadReport(fileArg) {
  // Prefer full dump when --file given (richer than summary samples)
  if (fileArg) {
    const p = fileArg.replace(/^--file=/, '');
    if (p && fs.existsSync(p)) {
      const raw = readJson(p);
      if (raw) return raw;
    }
  }
  for (const p of [REPORT_JSON, '/tmp/demigod-gmail-inbound.json']) {
    const j = readJson(p);
    if (j) return j;
  }
  return {};
}

function main() {
  const apply = process.argv.includes('--apply');
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const rr = runReplyCheck(fileArg);
  const report = loadReport(fileArg);
  const doc = readJson(LEADS) || { partners: [], talent: [] };
  const leads = [...(doc.partners || []), ...(doc.talent || [])];

  const signals = signalsFromReport(report);
  const matches = matchSignalsToLeads(signals, leads);

  let applied = 0;
  const errors = [];
  const skipped = [];
  const plans = [];

  // Pure batch: one plan per lead; opt-out wins over reply
  const batch = planReplyBatch(matches);
  const planByLead = new Map(batch.plans.map((p) => [p.leadId, p]));
  const seenApply = new Set();

  for (const m of matches) {
    const plan = planByLead.get(m.leadId) || planReplyApply(m);
    // Only emit one plan row per lead (batch winner)
    if (!plans.some((p) => p.leadId === m.leadId)) {
      plans.push({ leadId: m.leadId, ...plan, unsub: plan.unsub ?? m.unsub, state: m.state });
    }
    if (!plan.ok) {
      if (!skipped.some((s) => s.leadId === m.leadId)) {
        skipped.push({ ...m, reason: plan.reason });
      }
      continue;
    }
    // Skip non-winning signals for this lead (e.g. reply when unsub/bounce won)
    if (plan.ok && plan.to === 'opted_out' && !m.unsub) continue;
    if (plan.ok && plan.to === 'bounced' && !(m.bounce || isBounceBlob(m.snippet))) continue;
    if (plan.ok && plan.to === 'replied' && (m.unsub || m.bounce || isBounceBlob(m.snippet))) continue;
    if (!apply) continue;
    if (seenApply.has(m.leadId)) continue;
    seenApply.add(m.leadId);

    fs.mkdirSync(EVIDENCE, { recursive: true });
    const evidenceName = `${m.leadId}-${m.signalId || 'signal'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ev = path.join(EVIDENCE, `${evidenceName}.txt`);
    const label =
      plan.to === 'opted_out' ? 'OPT-OUT signal' : plan.to === 'bounced' ? 'BOUNCE signal' : 'REPLY signal';
    atomicWrite(
      ev,
      [
        label,
        `lead: ${m.leadId}`,
        `email: ${m.email || ''}`,
        `handle: ${m.handle || ''}`,
        `via: ${m.via || ''}`,
        `snippet: ${m.snippet || ''}`,
        `signalId: ${m.signalId || ''}`,
        `at: ${new Date().toISOString()}`,
        '',
      ].join('\n'),
    );
    // Re-check with path evidence (receipt/file rails)
    const pathCheck = canTransition(m.state, plan.to, {
      evidencePath: ev,
      actor: 'replies-ingest',
    });
    if (!pathCheck.ok) {
      fs.rmSync(ev, { force: true });
      errors.push({ ...m, error: pathCheck.error || 'evidence_denied' });
      continue;
    }
    const tr = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'demigod-funnel.mjs'),
        'transition',
        `--id=${m.leadId}`,
        `--to=${plan.to}`,
        `--evidence=${ev}`,
        `--note=${m.unsub ? 'opt-out from reply-check' : 'reply from reply-check'}`,
        '--actor=replies-ingest',
      ],
      { encoding: 'utf8', timeout: 30000, cwd: ROOT },
    );
    if (tr.status === 0) applied++;
    else {
      fs.rmSync(ev, { force: true });
      errors.push({ ...m, error: (tr.stderr || tr.stdout || '').slice(-200) });
    }
  }

  const out = {
    ok: rr.status === 0 && errors.length === 0,
    replyCheckStatus: rr.status,
    signals: signals.length,
    matched: matches.length,
    plannable: plans.filter((p) => p.ok).length,
    applied,
    apply,
    matches,
    plans,
    skipped,
    errors,
    report:
      report.scanned != null
        ? { scanned: report.scanned, human: report.human }
        : report.at
          ? { at: report.at }
          : null,
    note: 'Never sends. Fail-closed: sent|nudged → replied|bounced; replied requires receiptBacked (bare state=sent denied); opt-out edges; From: identity for reply (DSN bounce identity = failed-recipient fields only); OOO/auto never opens replied; bounce → bounced; sample skip reply/bounce; identity suppress blocks replied; ambiguous multi-lead reply denied.',
  };
  atomicWrite(path.join(BUSY, 'funnel', 'replies-ingest-latest.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) process.exitCode = 1;
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
  console.log('demigod-replies-ingest selftest\n');

  // From header parse
  assert(
    extractEmailsFromFromHeader('Jane <founder@startup.test>').includes('founder@startup.test'),
    'From header extracts email',
  );
  assert(signalFromMessage({}) === null, 'empty message → no signal (fail closed)');
  assert(signalFromMessage({ from: 'noreply@x.ai', preview: 'hi' }) === null, 'noreply filtered');

  const sig = signalFromMessage({
    from: 'Founder <founder@acme.test>',
    subject: 'Re: eng hiring',
    preview: 'yes interested — send the form',
    message_id: 'm1',
  });
  assert(sig && sig.emails.includes('founder@acme.test') && !sig.unsub, 'human reply signal');

  const unsub = signalFromMessage({
    from: 'x@y.com',
    preview: 'please unsubscribe / remove me',
  });
  assert(unsub && unsub.unsub, 'opt-out classified');

  // Report shape from demigod-reply-check (humans / humanSamples — NOT threads)
  const report = {
    scanned: 2,
    human: 1,
    humanSamples: [
      {
        from: 'Founder <founder@acme.test>',
        subject: 'Re: Demigod',
        preview: 'curious — tell me more',
        message_id: 'h1',
      },
    ],
    humans: [
      {
        from: 'Founder <founder@acme.test>',
        subject: 'Re: Demigod',
        preview: 'curious — tell me more',
        message_id: 'h1',
      },
    ],
  };
  const sigs = signalsFromReport(report);
  assert(sigs.length === 1, 'dedupes humanSamples + humans');
  assert(sigs[0].emails.includes('founder@acme.test'), 'report shape yields email');

  const leads = [
    { id: 'L1', email: 'founder@acme.test', state: 'sent' },
    { id: 'L2', email: 'other@co.test', state: 'sent' },
    { id: 'L3', handle: '@foo', state: 'nudged' },
    { id: 'L4', email: 'gone@co.test', state: 'opted_out' },
    { id: 'L5', email: 'draft@co.test', state: 'drafted' },
  ];
  const matches = matchSignalsToLeads(sigs, leads);
  assert(matches.length === 1 && matches[0].leadId === 'L1', 'matches lead by email');

  // Handle identity: From only (subject @mention never opens money path)
  const handleSig = signalFromMessage({
    from: '@Foo via X',
    subject: 're: hiring',
    preview: 'we chatted',
    message_id: 'h-from',
  });
  const hm = matchSignalsToLeads([handleSig], leads);
  assert(hm.some((x) => x.leadId === 'L3' && x.via === 'handle'), 'matches by handle in From');
  const subjectOnlyHandle = signalFromMessage({
    from: 'someone without handle',
    subject: 're: @Foo',
    preview: 'we chatted',
    message_id: 'h-subj',
  });
  assert(subjectOnlyHandle === null, 'subject-only @handle → no signal (From identity required)');
  const fromEmailSubjectHandle = signalFromMessage({
    from: 'Other <other@co.test>',
    subject: 're: @Foo',
    preview: 'looping in',
    message_id: 'h-subj2',
  });
  assert(
    fromEmailSubjectHandle &&
      (fromEmailSubjectHandle.subjectHandles || []).includes('foo') &&
      !(fromEmailSubjectHandle.handles || []).includes('foo'),
    'subject @handle stays diagnostic-only, not identity',
  );
  assert(
    matchSignalsToLeads([fromEmailSubjectHandle], leads).every((x) => x.leadId !== 'L3'),
    'subject-scraped @handle does not match lead L3',
  );

  // Body-only email is NOT identity (fail-closed — no false lead open)
  const bodyOnly = signalFromMessage({
    from: 'Anonymous Forward',
    preview: 'please reply to founder@acme.test about hiring',
  });
  assert(bodyOnly === null, 'body-only email → no signal (From identity required)');
  const bodyWithFromNoise = signalFromMessage({
    from: 'Other <other@co.test>',
    preview: 'cc founder@acme.test',
  });
  assert(
    bodyWithFromNoise &&
      bodyWithFromNoise.emails.includes('other@co.test') &&
      !bodyWithFromNoise.emails.includes('founder@acme.test') &&
      (bodyWithFromNoise.bodyEmails || []).includes('founder@acme.test'),
    'body email stays diagnostic-only, not identity',
  );
  assert(
    matchSignalsToLeads([bodyWithFromNoise], leads).every((x) => x.leadId !== 'L1'),
    'body-scraped address does not match lead L1',
  );

  // Plan fail-closed (snippet/signalId required — vacuous evidence denied)
  assert(
    planReplyApply({ leadId: 'L1', state: 'sent', unsub: false, snippet: 'yes interested' }).ok === true,
    'sent → replied ok',
  );
  assert(
    planReplyApply({ leadId: 'L1', state: 'sent', unsub: false }).ok === false,
    'sent → replied denied without evidence',
  );
  // Default signalFromMessage id "msg" alone is vacuous (no message_id/subject)
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      signalId: 'msg',
    }).ok === false &&
      planReplyApply({
        leadId: 'L1',
        state: 'sent',
        unsub: false,
        signalId: 'msg',
      }).reason === 'evidence_empty',
    'vacuous signalId=msg without snippet denied',
  );
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      signalId: 'msg',
      snippet: 'yes — send the form',
    }).ok === true,
    'signalId=msg + real snippet still ok',
  );
  // Pure Re:/Fwd: subject noise (subject-as-id fallback) never opens money path
  assert(isVacuousMailSnippet('Re:') === true, 'Re: is vacuous snippet');
  assert(isVacuousMailSnippet('Fwd:') === true, 'Fwd: is vacuous snippet');
  assert(isVacuousMailSnippet('Re: Re:') === true, 'stacked Re: is vacuous');
  assert(isVacuousMailSnippet('yes interested') === false, 'real body not vacuous');
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      signalId: 'Re:',
      snippet: 'Re:',
    }).ok === false &&
      planReplyApply({
        leadId: 'L1',
        state: 'sent',
        unsub: false,
        signalId: 'Re:',
        snippet: 'Re:',
      }).reason === 'evidence_empty',
    'subject-as-id Re: + Re: snippet denied',
  );
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      signalId: 'msg',
      snippet: 'Fwd:',
    }).ok === false &&
      planReplyApply({
        leadId: 'L1',
        state: 'sent',
        unsub: false,
        signalId: 'msg',
        snippet: 'Fwd:',
      }).reason === 'evidence_empty',
    'msg + pure Fwd: snippet denied',
  );
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      signalId: 'mid-real-1',
      snippet: 'Re:',
    }).ok === true,
    'real message_id + Re: snippet still ok (id bind)',
  );
  assert(planReplyApply({ leadId: 'L1', state: 'sourced', unsub: false, snippet: 'x' }).ok === false, 'sourced → replied denied');
  assert(planReplyApply({ leadId: 'L5', state: 'drafted', unsub: false, snippet: 'x' }).ok === false, 'drafted → replied denied');
  assert(planReplyApply({ leadId: 'L5', state: 'drafted', unsub: true, snippet: 'stop' }).ok === false, 'drafted → opted_out denied (no funnel edge)');
  assert(planReplyApply({ leadId: 'L1', state: 'sent', unsub: true, snippet: 'unsubscribe' }).ok === true, 'sent → opted_out ok');
  assert(planReplyApply({ leadId: 'L4', state: 'opted_out', unsub: false, snippet: 'x' }).ok === false, 'terminal no re-reply');
  assert(planReplyApply({ leadId: 'L1', state: 'approved', unsub: false, snippet: 'x' }).ok === false, 'approved → replied denied');
  assert(planReplyApply({ leadId: 'x', state: '', unsub: false, snippet: 'x' }).ok === false, 'empty state denied');

  // Batch: opt-out wins over reply for same lead
  const batch = planReplyBatch([
    { leadId: 'L1', state: 'sent', unsub: false, snippet: 'curious' },
    { leadId: 'L1', state: 'sent', unsub: true, snippet: 'remove me' },
    { leadId: 'L3', state: 'nudged', unsub: false, signalId: 'sig-3' },
  ]);
  assert(batch.plans.length === 2, 'batch one plan per lead');
  assert(
    batch.plans.some((p) => p.leadId === 'L1' && p.ok && p.to === 'opted_out'),
    'batch prefers opt-out over reply',
  );
  assert(batch.plannable === 2, 'batch both plannable');

  // Vacuous: zero signals → zero matches (not silent "applied")
  assert(matchSignalsToLeads([], leads).length === 0, 'empty signals → zero matches');
  assert(signalsFromReport({}).length === 0, 'empty report → zero signals');
  assert(planReplyBatch([]).plannable === 0, 'empty batch plannable=0');

  // Sample leads: never open replied; opt-out still allowed
  const sampleLeads = [
    { id: 'S1', email: 'sample@acme.test', state: 'sent', sample: true },
    { id: 'S2', email: 'real@acme.test', state: 'sent' },
  ];
  const sampleSig = signalFromMessage({
    from: 'Sample <sample@acme.test>',
    subject: 'Re: hi',
    preview: 'yes interested',
    message_id: 's-1',
  });
  assert(
    matchSignalsToLeads([sampleSig], sampleLeads).length === 0,
    'sample lead not matched for reply',
  );
  const sampleUnsub = signalFromMessage({
    from: 'Sample <sample@acme.test>',
    preview: 'unsubscribe please',
    message_id: 's-u',
  });
  assert(
    matchSignalsToLeads([sampleUnsub], sampleLeads).some((x) => x.leadId === 'S1' && x.unsub),
    'sample lead still matches opt-out (privacy)',
  );

  // Ambiguous: same signal identity → two sent leads → deny both (fail-closed)
  const ambMatches = [
    { leadId: 'A1', state: 'sent', unsub: false, signalId: 'same-mid', snippet: 'yes' },
    { leadId: 'A2', state: 'sent', unsub: false, signalId: 'same-mid', snippet: 'yes' },
  ];
  const amb = planReplyBatch(ambMatches);
  assert(amb.plannable === 0, 'ambiguous multi-lead signal plannable=0');
  assert(
    amb.plans.every((p) => p.ok === false && p.reason === 'ambiguous_signal'),
    'ambiguous multi-lead → both denied',
  );
  // Opt-out still wins even if same signal id on two leads (privacy > ambiguity)
  const ambUnsub = planReplyBatch([
    { leadId: 'A1', state: 'sent', unsub: true, signalId: 'u-mid', snippet: 'stop' },
    { leadId: 'A2', state: 'sent', unsub: true, signalId: 'u-mid', snippet: 'stop' },
  ]);
  assert(
    ambUnsub.plannable === 2 && ambUnsub.plans.every((p) => p.to === 'opted_out'),
    'opt-out not blocked by multi-lead (privacy)',
  );

  // Identity suppress: opted_out twin blocks replied money path on active lead
  const suppressLeads = [
    { id: 'old-out', email: 'same@co.test', state: 'opted_out' },
    { id: 'new-sent', email: 'same@co.test', state: 'sent' },
  ];
  const yesSig = signalFromMessage({
    from: 'Same <same@co.test>',
    subject: 'Re: hiring',
    preview: 'yes interested',
    message_id: 'yes-1',
  });
  const supMatches = matchSignalsToLeads([yesSig], suppressLeads);
  assert(
    supMatches.some((m) => m.leadId === 'new-sent' && m.blocked === 'identity_suppressed'),
    'identity suppress marks active lead blocked',
  );
  assert(
    planReplyApply(supMatches.find((m) => m.leadId === 'new-sent')).ok === false &&
      planReplyApply(supMatches.find((m) => m.leadId === 'new-sent')).reason === 'identity_suppressed',
    'identity suppress → replied denied',
  );
  const stopSig = signalFromMessage({
    from: 'Same <same@co.test>',
    preview: 'unsubscribe / remove me',
    message_id: 'stop-1',
  });
  const stopMatches = matchSignalsToLeads([stopSig], suppressLeads);
  assert(
    stopMatches.some((m) => m.leadId === 'new-sent' && m.unsub && !m.blocked),
    'identity suppress does not block opt-out (privacy)',
  );
  assert(
    planReplyApply(stopMatches.find((m) => m.leadId === 'new-sent')).ok === true,
    'opt-out still plannable under identity suppress',
  );
  // Bounce under identity suppress still lands (terminal hygiene, not money open)
  const bounceUnderSup = planReplyApply({
    leadId: 'new-sent',
    state: 'sent',
    unsub: false,
    bounce: true,
    blocked: 'identity_suppressed',
    snippet: 'undeliverable — user unknown',
    signalId: 'b-sup',
  });
  assert(
    bounceUnderSup.ok === true && bounceUnderSup.to === 'bounced',
    'bounce still plannable under identity suppress',
  );
  // Clean identity (no suppress twin) still opens replied
  assert(
    planReplyApply({
      leadId: 'clean',
      state: 'sent',
      unsub: false,
      snippet: 'yes',
      signalId: 'c1',
    }).ok === true,
    'clean identity still opens replied',
  );
  assert(
    suppressedIdentityKeys(suppressLeads).has('email:same@co.test'),
    'suppressedIdentityKeys includes opted_out email',
  );
  // Shared policy helper: by-other suppress (match/intro parity)
  assert(
    isIdentitySuppressedByOther(
      { id: 'new-sent', email: 'same@co.test', state: 'sent' },
      suppressLeads,
    ) === true,
    'isIdentitySuppressedByOther twin true',
  );
  assert(
    isIdentitySuppressedByOther(
      { id: 'solo', email: 'solo@co.test', state: 'sent' },
      suppressLeads,
    ) === false,
    'isIdentitySuppressedByOther clean false',
  );
  // contactEmail is identity (not only email)
  assert(
    identityKeys({ contactEmail: 'Via.Contact@Co.Test' }).has('email:via.contact@co.test'),
    'identityKeys includes contactEmail',
  );

  // Auto-reply / OOO / bounce must not open replied money path
  assert(isAutoReplyBlob('Out of Office: I am currently away') === true, 'OOO classified auto');
  assert(isAutoReplyBlob('yes interested — send the form') === false, 'human reply not auto');
  assert(isAutoReplyBlob('Accepted: Intro chat') === true, 'calendar Accepted: is auto');
  assert(isAutoReplyBlob('This is an automated message') === true, 'automated message is auto');
  assert(isAutoReplyBlob('Auto-Submitted: auto-replied') === true, 'Auto-Submitted header is auto');
  assert(isAutoReplyBlob('Precedence: bulk\nList-Unsubscribe: <mailto:u@x>') === true, 'bulk list is auto');
  assert(
    isAutoReplyBlob('This is a system-generated notification') === true,
    'system-generated is auto',
  );
  const ooo = signalFromMessage({
    from: 'Founder <founder@acme.test>',
    subject: 'Out of Office',
    preview: 'I am currently away until next week',
    message_id: 'ooo-1',
  });
  assert(ooo && ooo.auto && !ooo.unsub, 'OOO signal flagged auto');
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      auto: true,
      snippet: 'Out of Office',
      signalId: 'ooo-1',
    }).ok === false &&
      planReplyApply({
        leadId: 'L1',
        state: 'sent',
        unsub: false,
        auto: true,
        snippet: 'Out of Office',
        signalId: 'ooo-1',
      }).reason === 'auto_reply',
    'auto-reply → replied denied',
  );
  // Defense-in-depth: snippet alone (no auto flag) still denies replied
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      snippet: 'Accepted: Sync tomorrow',
      signalId: 'cal-1',
    }).ok === false &&
      planReplyApply({
        leadId: 'L1',
        state: 'sent',
        unsub: false,
        snippet: 'Accepted: Sync tomorrow',
        signalId: 'cal-1',
      }).reason === 'auto_reply',
    'calendar snippet without auto flag → replied denied',
  );
  // Bounce From: mailer-daemon with no body recipient → no signal (still fail-closed)
  assert(
    signalFromMessage({
      from: 'Mail Delivery <mailer-daemon@google.com>',
      subject: 'Delivery Status Notification',
      preview: 'undeliverable',
    }) === null,
    'mailer-daemon From without body recipient → no signal',
  );
  // Bare support@/footer in DSN body is NOT bounce identity (fail-closed)
  assert(
    signalFromMessage({
      from: 'Mail Delivery <mailer-daemon@google.com>',
      subject: 'Delivery Status Notification (Failure)',
      preview: 'Delivery failed. Contact support@google.com for help.',
      message_id: 'dsn-noise',
    }) === null,
    'DSN with only support@ body email → no bounce identity',
  );
  assert(
    extractBounceRecipients('Contact support@acme.test about your mail').length === 0,
    'extractBounceRecipients ignores non-recipient body emails',
  );
  assert(
    extractBounceRecipients('Final-Recipient: rfc822; founder@acme.test').includes(
      'founder@acme.test',
    ),
    'extractBounceRecipients reads Final-Recipient',
  );
  // DSN with body envelope recipient → bounce-only signal (never replied)
  const dsn = signalFromMessage({
    from: 'Mail Delivery <mailer-daemon@google.com>',
    subject: 'Delivery Status Notification (Failure)',
    preview: 'undeliverable to founder@acme.test — user unknown',
    message_id: 'dsn-1',
  });
  assert(dsn && dsn.bounce && dsn.bounceBodyOnly, 'DSN body recipient → bounce signal');
  assert(dsn.emails.includes('founder@acme.test'), 'DSN matches envelope recipient email');
  // Final-Recipient field also opens bounce-only identity
  const dsnField = signalFromMessage({
    from: 'MAILER-DAEMON@mx.example',
    subject: 'Returned mail: see transcript for details',
    preview: 'Final-Recipient: rfc822; founder@acme.test\nAction: failed\nStatus: 5.1.1',
    message_id: 'dsn-field',
  });
  assert(
    dsnField && dsnField.bounceBodyOnly && dsnField.emails.includes('founder@acme.test'),
    'DSN Final-Recipient field → bounce identity',
  );
  const dsnMatches = matchSignalsToLeads([dsn], [
    { id: 'L1', email: 'founder@acme.test', state: 'sent' },
  ]);
  assert(
    dsnMatches.some((m) => m.leadId === 'L1' && m.bounce),
    'DSN matches sent lead as bounce',
  );
  assert(
    planReplyApply(dsnMatches.find((m) => m.leadId === 'L1')).ok === true &&
      planReplyApply(dsnMatches.find((m) => m.leadId === 'L1')).to === 'bounced',
    'DSN plan → bounced',
  );
  // OOO is auto but NOT bounce
  assert(isBounceBlob('Out of Office: I am currently away') === false, 'OOO is not bounce');
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      bounce: true,
      snippet: 'undeliverable',
      signalId: 'b1',
    }).to === 'bounced',
    'explicit bounce flag → bounced',
  );
  assert(
    planReplyApply({
      leadId: 'L1',
      state: 'drafted',
      unsub: false,
      bounce: true,
      snippet: 'undeliverable',
      signalId: 'b2',
    }).ok === false,
    'drafted → bounced denied (no edge)',
  );
  // Batch priority: unsub > bounce > human reply > auto
  const prio = planReplyBatch([
    { leadId: 'L1', state: 'sent', unsub: false, snippet: 'yes', signalId: 'r1' },
    { leadId: 'L1', state: 'sent', unsub: false, bounce: true, snippet: 'undeliverable', signalId: 'b1' },
    { leadId: 'L1', state: 'sent', unsub: true, snippet: 'stop', signalId: 'u1' },
  ]);
  assert(
    prio.plans.some((p) => p.leadId === 'L1' && p.ok && p.to === 'opted_out'),
    'batch unsub beats bounce and reply',
  );
  const prioB = planReplyBatch([
    { leadId: 'L2', state: 'sent', unsub: false, snippet: 'yes', signalId: 'r2' },
    { leadId: 'L2', state: 'nudged', unsub: false, bounce: true, snippet: 'mailbox full', signalId: 'b2' },
  ]);
  assert(
    prioB.plans.some((p) => p.leadId === 'L2' && p.ok && p.to === 'bounced'),
    'batch bounce beats reply',
  );
  // Human reply after OOO must win (auto must not shadow money-path reply forever)
  const prioAuto = planReplyBatch([
    {
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      auto: true,
      snippet: 'Out of Office: away',
      signalId: 'ooo-first',
    },
    {
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      snippet: 'yes interested — send the form',
      signalId: 'human-later',
    },
  ]);
  assert(
    prioAuto.plans.some((p) => p.leadId === 'L1' && p.ok && p.to === 'replied'),
    'batch human reply beats prior OOO/auto',
  );
  // Auto-only still denied
  const prioAutoOnly = planReplyBatch([
    {
      leadId: 'L1',
      state: 'sent',
      unsub: false,
      auto: true,
      snippet: 'Automatic reply: out of office',
      signalId: 'ooo-only',
    },
  ]);
  assert(
    prioAutoOnly.plannable === 0 &&
      prioAutoOnly.plans.some((p) => p.reason === 'auto_reply'),
    'batch auto-only remains denied',
  );
  // Email domain must not become a handle (user@google.com ↛ handle google)
  assert(
    extractHandlesFromText('Jane <jane@startup.test>').length === 0,
    'email in From does not yield handle',
  );
  assert(
    extractHandlesFromText('@Foo via X <foo@x.com>').includes('foo') &&
      !extractHandlesFromText('@Foo via X <foo@x.com>').includes('x'),
    'real @handle kept; email domain not a handle',
  );

  // Receipt-backed replied money path (parity with funnel sent_receipt_backed)
  assert(pureLeadReceiptBacked({ state: 'sent' }) === false, 'bare lead not receipt-backed');
  assert(
    pureLeadReceiptBacked({
      state: 'sent',
      stateHistory: [
        { to: 'sent', evidenceText: 'SENT-CONFIRMED\nMessage-ID: <mid@x>\nchannel: email' },
      ],
    }) === true,
    'history SENT-CONFIRMED → receipt-backed',
  );
  assert(
    pureLeadReceiptBacked({
      state: 'sent',
      stateHistory: [{ to: 'sent', evidenceText: 'DRAFT-ONLY placeholder@example.com' }],
    }) === false,
    'draft/sim history is not receipt-backed',
  );
  assert(
    pureLeadReceiptBacked({ receiptBacked: true }) === true,
    'explicit receiptBacked true wins',
  );
  assert(
    pureLeadReceiptBacked({
      receiptBacked: false,
      sentReceiptText: 'SENT-CONFIRMED Message-ID: <x@y>',
    }) === false,
    'explicit receiptBacked false wins over text',
  );
  // Bare state=sent match → receiptBacked false → replied denied
  const bareMatch = matchSignalsToLeads(
    [
      signalFromMessage({
        from: 'Bare <bare@co.test>',
        subject: 'Re: hi',
        preview: 'yes interested',
        message_id: 'bare-1',
      }),
    ],
    [{ id: 'bare', email: 'bare@co.test', state: 'sent' }],
  );
  assert(
    bareMatch.length === 1 && bareMatch[0].receiptBacked === false,
    'match flags bare sent as not receipt-backed',
  );
  assert(
    planReplyApply(bareMatch[0]).ok === false &&
      planReplyApply(bareMatch[0]).reason === 'sent_receipt_missing',
    'bare sent match → replied denied (sent_receipt_missing)',
  );
  // Receipt-backed lead still opens replied
  const backedMatch = matchSignalsToLeads(
    [
      signalFromMessage({
        from: 'Backed <backed@co.test>',
        subject: 'Re: hi',
        preview: 'yes — send the form',
        message_id: 'backed-1',
      }),
    ],
    [
      {
        id: 'backed',
        email: 'backed@co.test',
        state: 'sent',
        stateHistory: [
          {
            to: 'sent',
            evidenceText: 'SENT-CONFIRMED\nMessage-ID: <out@trydemigod.com>\nchannel: email',
          },
        ],
      },
    ],
  );
  assert(
    backedMatch.length === 1 &&
      backedMatch[0].receiptBacked === true &&
      planReplyApply(backedMatch[0]).ok === true &&
      planReplyApply(backedMatch[0]).to === 'replied',
    'receipt-backed sent → replied ok',
  );
  // Opt-out still works without receipt (privacy)
  assert(
    planReplyApply({
      leadId: 'bare',
      state: 'sent',
      unsub: true,
      receiptBacked: false,
      snippet: 'unsubscribe',
      signalId: 'u-bare',
    }).ok === true &&
      planReplyApply({
        leadId: 'bare',
        state: 'sent',
        unsub: true,
        receiptBacked: false,
        snippet: 'unsubscribe',
        signalId: 'u-bare',
      }).to === 'opted_out',
    'opt-out without receipt still ok (privacy)',
  );
  // Bounce still works without receipt (DSN hygiene)
  assert(
    planReplyApply({
      leadId: 'bare',
      state: 'sent',
      bounce: true,
      receiptBacked: false,
      snippet: 'undeliverable user unknown',
      signalId: 'b-bare',
    }).to === 'bounced',
    'bounce without receipt still ok (hygiene)',
  );
  // Direct unit plan (no receiptBacked field) still allows replied (compat)
  assert(
    planReplyApply({
      leadId: 'unit',
      state: 'sent',
      unsub: false,
      snippet: 'yes',
      signalId: 'unit-1',
    }).ok === true,
    'direct plan without receiptBacked field still allows replied',
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv[2] === 'selftest') selftest();
  else main();
}
