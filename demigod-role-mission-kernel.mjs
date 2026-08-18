#!/usr/bin/env node
/**
 * Role Mission OS kernel — the hire as one first-party object.
 *
 * composeRoleMission() is a read projection over the workspace.
 * This module is the writable hire: ATS pipeline + calendar + CRM
 * on the same Role Mission. No store, HTTP, send, consent, intro,
 * or employment-decision authority.
 *
 */
import crypto from 'node:crypto';
import { projectActivityList } from './demigod-die-activity-shape.mjs';
import { safeResearchUrl } from './demigod-evidence.mjs';
import { assertNote, assertPacket, debriefRoundup, INTERVIEW_MOMENTS } from './demigod-role-packet.mjs';
import { assertCallNote, makeCallNote } from './demigod-call-note.mjs';
import { isConsentWithdrawn, makeTouch } from './demigod-candidate-touch.mjs';

export const SCHEMA = 'demigod.role-mission-os/1';
export const APPLICATION_STAGES = [
  'applied',
  'screen',
  'interview',
  'offer',
  'hired',
  'declined',
  'withdrawn',
];
export const APPLICATION_TRANSITIONS = {
  applied: ['screen', 'declined', 'withdrawn'],
  screen: ['interview', 'declined', 'withdrawn'],
  interview: ['offer', 'declined', 'withdrawn'],
  offer: ['hired', 'declined', 'withdrawn'],
  hired: [],
  declined: [],
  withdrawn: [],
};
export const SLOT_STATES = ['hold', 'booked', 'rescheduled', 'no_show', 'released'];
export const ACTIVE_SLOT_STATES = ['hold', 'booked'];
export const CLOSE_STATES = ['open', 'paused', 'filled', 'closed'];
export const APPLY_SOURCES = ['inbound', 'referral', 'prior', 'applied'];
export const MISSION_COMPANY_SCHEMA = 'demigod.mission-company/1';
export const HIRING_STATUSES = ['quarantined', 'board_stale', 'board_observed', 'company_reported', 'unknown'];
export const LAST_ATTEMPTS = ['ok', 'rate_limited', 'error', 'missing'];
/* Employ 2025–26: time-to-fill 67.7→63.5d while 90-day retention 93.9%→84.6%.
   A filled hire is not an observed outcome. The check is dated, not scored. */
export const OUTCOME_CHECK_MS = 90 * 24 * 60 * 60 * 1000;
export const OUTCOME_CHECK_SCHEMA = 'demigod.role-mission-outcome-check/1';

/**
 * The one hiring-status ladder. It lived in two places — the company packet and the matching
 * engine — and both had to be told separately that `openRolesAt` alone stopped meaning "we watched
 * this board". A count carried across an unreadable read keeps its ORIGINAL date, and a YC
 * directory link used to be stamped with a date for a board nobody read; either one read as
 * `board_observed`, the strongest status in the enum, off a date the row did not earn.
 *
 * `board_observed` therefore requires a date AND a count. Zero is a count — a board we read and
 * found empty stays observed — so this tests the integer, not the truthiness.
 *
 * `openRoles` is passed separately because callers project it from more than the map row (the
 * role ledger, quarantine). The status must describe the count the caller actually reports.
 */
export function hiringStatusOf(company = {}, { quarantined = false, openRoles } = {}) {
  if (quarantined) return 'quarantined';
  if (company.openRolesStale) return 'board_stale';
  const count = openRoles === undefined ? company.openRoles : openRoles;
  if (company.openRolesAt && Number.isSafeInteger(count)) return 'board_observed';
  return company.hiring === 'yes' ? 'company_reported' : 'unknown';
}
const FORBIDDEN_COMPANY_KEYS = new Set(['score', 'fitScore', 'email', 'phone', 'candId', 'verdict', 'rank']);
export const AUTHORITY = {
  review: 'human',
  employmentDecision: 'human',
  consent: 'existing_pair_receipts_only',
  intro: 'existing_mutual_consent_gate_only',
  externalAction: 'none',
  calendarInvite: 'none',
};

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const ID_MAX = 80;

function now(at) {
  if (at == null) return new Date().toISOString();
  if (!Number.isFinite(Date.parse(at))) throw new Error('clock_invalid');
  return new Date(at).toISOString();
}

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

function requireId(value, label) {
  const id = String(value || '').trim();
  if (!id || id.length > ID_MAX) throw new Error(`${label}_id`);
  if (EMAIL.test(id) || id.includes('@')) throw new Error(`${label}_contact_shaped`);
  return id;
}

function clone(mission) {
  return structuredClone(mission);
}

function applicationOf(mission, candId) {
  return (mission.ats.applications || []).find((row) => row.candId === candId) || null;
}

function slotOf(mission, slotId) {
  return (mission.calendar.slots || []).find((row) => row.id === slotId) || null;
}

function optedOut(mission, candId) {
  return (mission.crm.touches || [])
    .filter((row) => row.candId === candId)
    .some((row) => isConsentWithdrawn(row.outcome));
}

function parseRange(start, end) {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) throw new Error('slot_range');
  return { start: new Date(a).toISOString(), end: new Date(b).toISOString() };
}

function overlaps(a, b) {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

function bump(mission, { at, action, candId = null, result = 'ok' } = {}) {
  const next = clone(mission);
  const clock = now(at);
  const before = next.version;
  next.version += 1;
  next.updatedAt = clock;
  next.events.push({
    id: newId(),
    at: clock,
    actor: next.owner,
    entity: next.roleId,
    action,
    beforeVersion: before,
    afterVersion: next.version,
    idempotencyKey: `${next.roleId}:${action}:${before}`,
    result,
    candId,
  });
  return next;
}

function walkForbidden(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_COMPANY_KEYS.has(key)) throw new Error('mission_company_forbidden_field');
    if (typeof child === 'string' && (EMAIL.test(child) || child.includes('mailto:'))) {
      throw new Error('mission_company_contact');
    }
    if (child && typeof child === 'object') walkForbidden(child);
  }
}

export function assertMissionCompany(record) {
  if (!record || record.schema !== MISSION_COMPANY_SCHEMA) throw new Error('mission_company_schema');
  const companyId = String(record.companyId || '').trim();
  if (!companyId || companyId.length > ID_MAX) throw new Error('mission_company_id');
  if (EMAIL.test(companyId) || companyId.includes('@') || companyId.includes('mailto:')) {
    throw new Error('mission_company_contact');
  }
  walkForbidden(record);
  const identity = record.identity;
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) throw new Error('mission_company_identity');
  if (!String(identity.name || '').trim()) throw new Error('mission_company_identity');
  if (identity.website != null && !safeResearchUrl(identity.website)) throw new Error('mission_company_website');
  const hiring = record.hiring;
  if (!hiring || typeof hiring !== 'object' || Array.isArray(hiring)) throw new Error('mission_company_status');
  if (!HIRING_STATUSES.includes(hiring.status)) throw new Error('mission_company_status');
  const count = hiring.openRoles;
  if (count != null && (!Number.isInteger(count) || count < 0)) throw new Error('mission_company_count');
  if (hiring.lastAttempt != null && !LAST_ATTEMPTS.includes(hiring.lastAttempt)) throw new Error('mission_company_attempt');
  if (hiring.openRolesAt != null) {
    const at = Date.parse(hiring.openRolesAt);
    if (!Number.isFinite(at) || at > Date.now() + 1000) throw new Error('mission_company_clock');
  }
  if (record.quarantineHiring === true || hiring.status === 'quarantined') {
    if (count != null) throw new Error('mission_company_quarantine_count');
  }
  if (count === 0 && (hiring.status === 'board_stale' || hiring.lastAttempt !== 'ok')) {
    throw new Error('mission_company_count');
  }
  if (record.postings != null) {
    if (typeof record.postings !== 'object' || Array.isArray(record.postings)) throw new Error('mission_company_postings');
    if (record.postings.observedLifetimeUsable !== false) throw new Error('mission_company_observed_lifetime');
    if (record.postings.source != null && !['employer_declared', 'unknown'].includes(record.postings.source)) {
      throw new Error('mission_company_postings');
    }
  }
  return true;
}

export function presentCompany(record) {
  assertMissionCompany(record);
  const status = record.hiring.status;
  const attempt = record.hiring.lastAttempt ?? null;
  const n = record.hiring.openRoles;
  const at = record.hiring.openRolesAt;
  const failed = ['rate_limited', 'error', 'missing'].includes(attempt);
  if (status === 'quarantined' || record.quarantineHiring === true) {
    return { countIsCurrent: false, qualifier: 'hiring status withheld' };
  }
  if (failed) {
    return { countIsCurrent: false, qualifier: 'we could not read the board' };
  }
  if (status === 'board_stale') {
    return {
      countIsCurrent: false,
      qualifier: n == null
        ? 'we do not know the count'
        : at
          ? `${n} open roles as of ${at}, not re-verified`
          : `${n} open roles as of last observation, not re-verified`,
    };
  }
  if (status === 'board_observed' && attempt === 'ok' && Number.isInteger(n)) {
    if (n === 0) return { countIsCurrent: true, qualifier: 'we read the board and it was empty' };
    return {
      countIsCurrent: true,
      qualifier: at ? `${n} open roles, verified ${at}` : `${n} open roles, verified`,
    };
  }
  if (status === 'board_observed' && attempt == null && Number.isInteger(n)) {
    return {
      countIsCurrent: false,
      qualifier: at ? `${n} open roles as of ${at}` : `${n} open roles as of last observation`,
    };
  }
  if (status === 'company_reported') {
    return { countIsCurrent: false, qualifier: 'the company says it is hiring' };
  }
  if (n == null) return { countIsCurrent: false, qualifier: 'we do not know the count' };
  return { countIsCurrent: false, qualifier: 'we do not know' };
}

function withObservation(mission, action) {
  const record = mission.crm?.company;
  if (!record) return action;
  const presentation = presentCompany(record);
  return {
    ...action,
    observation: {
      status: record.hiring.status,
      blocked: presentation.countIsCurrent !== true,
      note: presentation.qualifier,
    },
  };
}

export function assertMission(mission) {
  if (!mission || mission.schema !== SCHEMA) throw new Error('mission_schema');
  if (!String(mission.roleId || '').trim()) throw new Error('mission_roleId');
  if (!CLOSE_STATES.includes(mission.closeState)) throw new Error('mission_closeState');
  assertPacket(mission.packet);
  if (mission.packet.roleId !== mission.roleId) throw new Error('mission_packet_role');
  if (mission.packet.demo === true) throw new Error('mission_demo_packet');
  if (!Array.isArray(mission.ats?.applications) || !Array.isArray(mission.ats?.offers)) throw new Error('mission_ats');
  if (!Array.isArray(mission.calendar?.slots)) throw new Error('mission_calendar');
  if (!Array.isArray(mission.crm?.touches) || !Array.isArray(mission.crm?.pairs)) throw new Error('mission_crm');
  if (mission.crm.company != null) assertMissionCompany(mission.crm.company);
  if (!Array.isArray(mission.conversations)) throw new Error('mission_conversations');
  if (!Array.isArray(mission.debriefs)) throw new Error('mission_debriefs');
  if (mission.outcomeCheck) assertOutcomeCheck(mission.outcomeCheck);
  if (mission.authority?.externalAction !== 'none') throw new Error('mission_authority');
  return true;
}

function hiredApplication(mission) {
  return (mission.ats.applications || []).find((row) => row.stage === 'hired') || null;
}

function hiredAtOf(mission) {
  const row = hiredApplication(mission);
  return row?.hiredAt || row?.updatedAt || null;
}

function assertOutcomeCheck(check) {
  if (!check || check.schema !== OUTCOME_CHECK_SCHEMA) throw new Error('outcome_check_schema');
  if (!check.dueAt || Number.isNaN(Date.parse(check.dueAt))) throw new Error('outcome_check_due');
  if (check.lasted != null && typeof check.lasted !== 'boolean') throw new Error('outcome_check_lasted');
  return true;
}

export function openRoleMission({ packet, owner, at } = {}) {
  assertPacket(packet);
  if (packet.demo === true) throw new Error('mission_demo_forbidden');
  const clock = now(at);
  const mission = {
    schema: SCHEMA,
    roleId: packet.roleId,
    owner: requireId(owner, 'owner'),
    at: clock,
    updatedAt: clock,
    version: 1,
    closeState: 'open',
    packet: structuredClone(packet),
    ats: { applications: [], offers: [] },
    calendar: { slots: [] },
    crm: { touches: [], pairs: [], company: null },
    conversations: [],
    debriefs: [],
    events: [{
      id: newId(),
      at: clock,
      actor: requireId(owner, 'owner'),
      entity: packet.roleId,
      action: 'open',
      beforeVersion: 0,
      afterVersion: 1,
      idempotencyKey: `${packet.roleId}:open:0`,
      result: 'ok',
      candId: null,
    }],
    authority: { ...AUTHORITY },
  };
  assertMission(mission);
  return mission;
}

export function applyCandidate(mission, { candId, source = 'applied', at } = {}) {
  assertMission(mission);
  if (mission.closeState !== 'open') throw new Error('mission_not_open');
  const id = requireId(candId, 'cand');
  if (applicationOf(mission, id)) throw new Error('application_duplicate');
  if (!APPLY_SOURCES.includes(source)) throw new Error('application_source');
  if (optedOut(mission, id)) throw new Error('application_opt_out');
  const next = bump(mission, { at, action: 'apply', candId: id });
  next.ats.applications.push({
    candId: id,
    source,
    stage: 'applied',
    scorecards: [],
    appliedAt: next.updatedAt,
    updatedAt: next.updatedAt,
    drafts: [],
  });
  assertMission(next);
  return next;
}

export function advanceApplication(mission, { candId, to, at } = {}) {
  assertMission(mission);
  if (mission.closeState === 'closed') throw new Error('mission_closed');
  const id = requireId(candId, 'cand');
  const app = applicationOf(mission, id);
  if (!app) throw new Error('application_missing');
  if (!APPLICATION_STAGES.includes(to)) throw new Error('application_stage');
  const allowed = APPLICATION_TRANSITIONS[app.stage] || [];
  if (!allowed.includes(to)) throw new Error(`application_forbidden:${app.stage}->${to}`);
  if (optedOut(mission, id) && to !== 'withdrawn') throw new Error('application_opt_out');
  if (app.stage === 'applied' && to === 'screen' && !(app.scorecards || []).length) {
    throw new Error('advance_scorecard_required');
  }
  if (to === 'hired') {
    if (!(app.scorecards || []).length) throw new Error('hire_scorecard_required');
    if (!(mission.debriefs || []).some((row) => row.candId === id)) throw new Error('hire_debrief_required');
  }
  const next = bump(mission, { at, action: `advance:${to}`, candId: id });
  const row = applicationOf(next, id);
  row.stage = to;
  row.updatedAt = next.updatedAt;
  if (to === 'hired') {
    row.hiredAt = next.updatedAt;
    next.closeState = 'filled';
  }
  assertMission(next);
  return next;
}

export function saveScorecardDraft(mission, note, { at } = {}) {
  assertMission(mission);
  assertNote(note, mission.packet);
  if (!applicationOf(mission, note.candId)) throw new Error('scorecard_application_missing');
  const reviewer = requireId(note.reviewedBy, 'reviewer');
  const next = bump(mission, { at: at || note.reviewedAt, action: 'scorecard_draft', candId: note.candId });
  const row = applicationOf(next, note.candId);
  row.drafts = (row.drafts || []).filter((draft) => draft.reviewedBy !== reviewer);
  row.drafts.push({ ...structuredClone(note), reviewedBy: reviewer, draft: true });
  row.updatedAt = next.updatedAt;
  assertMission(next);
  return next;
}

export function recordScorecard(mission, note, { at } = {}) {
  assertMission(mission);
  assertNote(note, mission.packet);
  const app = applicationOf(mission, note.candId);
  if (!app) throw new Error('scorecard_application_missing');
  const reviewer = requireId(note.reviewedBy, 'reviewer');
  const next = bump(mission, { at: at || note.reviewedAt, action: 'scorecard', candId: note.candId });
  const row = applicationOf(next, note.candId);
  row.scorecards.push({ ...structuredClone(note), reviewedBy: reviewer, draft: false });
  row.drafts = (row.drafts || []).filter((draft) => draft.reviewedBy !== reviewer);
  row.updatedAt = next.updatedAt;
  assertMission(next);
  return next;
}

function assertSchedulable(mission, candId) {
  const app = applicationOf(mission, candId);
  if (!app) throw new Error('slot_application_missing');
  if (['declined', 'withdrawn', 'hired'].includes(app.stage)) throw new Error('slot_terminal');
  if (optedOut(mission, candId)) throw new Error('slot_opt_out');
  if (mission.closeState !== 'open' && mission.closeState !== 'paused') throw new Error('slot_mission_closed');
}

function pairOf(mission, candId) {
  return (mission.crm.pairs || []).find((row) => row.candId === candId) || null;
}

/** Wellfound/daily.dev double opt-in: a booked slot is a conversation, not a hold. */
function hasMutualYes(mission, candId) {
  const pair = pairOf(mission, candId);
  return pair?.mutual?.founder === true && pair?.mutual?.candidate === true;
}

function assertSlotFree(mission, { interviewer, start, end, exceptId = null }) {
  for (const slot of mission.calendar.slots) {
    if (slot.id === exceptId) continue;
    if (!ACTIVE_SLOT_STATES.includes(slot.state)) continue;
    if (slot.interviewer === interviewer && overlaps(slot, { start, end })) {
      throw new Error('slot_interviewer_busy');
    }
  }
}

export function holdSlot(mission, {
  candId,
  start,
  end,
  interviewer,
  moment = null,
  at,
} = {}) {
  assertMission(mission);
  const id = requireId(candId, 'cand');
  assertSchedulable(mission, id);
  if ((mission.calendar.slots || []).some((row) => row.candId === id && ACTIVE_SLOT_STATES.includes(row.state))) {
    throw new Error('slot_candidate_busy');
  }
  const range = parseRange(start, end);
  const who = requireId(interviewer, 'interviewer');
  if (moment != null && !INTERVIEW_MOMENTS.includes(moment)) throw new Error('slot_moment');
  assertSlotFree(mission, { interviewer: who, ...range });
  const next = bump(mission, { at, action: 'hold', candId: id });
  next.calendar.slots.push({
    id: newId(),
    candId: id,
    interviewer: who,
    moment: moment || null,
    start: range.start,
    end: range.end,
    state: 'hold',
    createdAt: next.updatedAt,
    updatedAt: next.updatedAt,
  });
  assertMission(next);
  return next;
}

export function bookSlot(mission, { slotId, candId, start, end, interviewer, moment = null, at } = {}) {
  assertMission(mission);
  if (slotId) {
    const existing = slotOf(mission, slotId);
    if (!existing) throw new Error('slot_missing');
    if (existing.state !== 'hold') throw new Error(`slot_book_forbidden:${existing.state}`);
    assertSchedulable(mission, existing.candId);
    if (!hasMutualYes(mission, existing.candId)) throw new Error('book_requires_mutual');
    const next = bump(mission, { at, action: 'book', candId: existing.candId });
    const row = slotOf(next, slotId);
    row.state = 'booked';
    row.updatedAt = next.updatedAt;
    assertMission(next);
    return next;
  }
  const held = holdSlot(mission, { candId, start, end, interviewer, moment, at });
  const created = held.calendar.slots.at(-1);
  return bookSlot(held, { slotId: created.id, at });
}

export function rescheduleSlot(mission, { slotId, start, end, at } = {}) {
  assertMission(mission);
  const existing = slotOf(mission, slotId);
  if (!existing) throw new Error('slot_missing');
  if (!ACTIVE_SLOT_STATES.includes(existing.state)) throw new Error(`slot_reschedule_forbidden:${existing.state}`);
  assertSchedulable(mission, existing.candId);
  const range = parseRange(start, end);
  assertSlotFree(mission, {
    interviewer: existing.interviewer,
    ...range,
    exceptId: existing.id,
  });
  const next = bump(mission, { at, action: 'reschedule', candId: existing.candId });
  const row = slotOf(next, slotId);
  row.start = range.start;
  row.end = range.end;
  row.state = existing.state === 'booked' ? 'booked' : 'hold';
  row.rescheduledAt = next.updatedAt;
  row.updatedAt = next.updatedAt;
  assertMission(next);
  return next;
}

export function markNoShow(mission, { slotId, at } = {}) {
  assertMission(mission);
  const existing = slotOf(mission, slotId);
  if (!existing) throw new Error('slot_missing');
  if (existing.state !== 'booked') throw new Error(`slot_noshow_forbidden:${existing.state}`);
  const next = bump(mission, { at, action: 'no_show', candId: existing.candId });
  const row = slotOf(next, slotId);
  row.state = 'no_show';
  row.updatedAt = next.updatedAt;
  assertMission(next);
  return next;
}

export function releaseSlot(mission, { slotId, at } = {}) {
  assertMission(mission);
  const existing = slotOf(mission, slotId);
  if (!existing) throw new Error('slot_missing');
  if (!ACTIVE_SLOT_STATES.includes(existing.state)) throw new Error(`slot_release_forbidden:${existing.state}`);
  const next = bump(mission, { at, action: 'release', candId: existing.candId });
  const row = slotOf(next, slotId);
  row.state = 'released';
  row.updatedAt = next.updatedAt;
  assertMission(next);
  return next;
}

export function recordTouch(mission, input = {}) {
  assertMission(mission);
  const touch = makeTouch({
    ...input,
    candId: requireId(input.candId, 'cand'),
    roleId: mission.roleId,
    channel: input.channel || 'note',
  });
  const next = bump(mission, { at: touch.at, action: 'touch', candId: touch.candId });
  next.crm.touches.push(touch);
  assertMission(next);
  return next;
}

export function closeMission(mission, { state, at } = {}) {
  assertMission(mission);
  if (!['paused', 'filled', 'closed'].includes(state)) throw new Error('mission_close_state');
  if (state === 'filled' && !(mission.ats.applications || []).some((row) => row.stage === 'hired')) {
    throw new Error('mission_fill_requires_hire');
  }
  const next = bump(mission, { at, action: `close:${state}` });
  next.closeState = state;
  assertMission(next);
  return next;
}

/** Pure projector. Never reads the map. Never invents lastAttempt=ok. */
export function toMissionCompany(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new Error('mission_company_packet');
  const companyId = String(packet.companyId || packet.identity?.id || '').trim();
  const identity = packet.identity || {};
  const hiring = packet.hiring || {};
  const lastAttempt = LAST_ATTEMPTS.includes(hiring.lastAttempt) ? hiring.lastAttempt : null;
  let openRoles = Number.isInteger(hiring.openRoles) ? hiring.openRoles : null;
  const status = HIRING_STATUSES.includes(hiring.status) ? hiring.status : 'unknown';
  if (status === 'quarantined' || packet.quarantineHiring === true) openRoles = null;
  if (openRoles === 0 && lastAttempt !== 'ok') openRoles = null;
  const record = {
    schema: MISSION_COMPANY_SCHEMA,
    companyId,
    identity: {
      name: String(identity.name || '').trim(),
      domain: identity.domain ? String(identity.domain) : null,
      website: identity.website ?? null,
    },
    hiring: {
      status,
      openRoles,
      openRolesAt: hiring.openRolesAt || null,
      lastAttempt,
      lastAttemptAt: lastAttempt ? (hiring.lastAttemptAt || null) : null,
    },
    quarantineHiring: status === 'quarantined' || packet.quarantineHiring === true,
  };
  if (packet.postings && typeof packet.postings === 'object' && !Array.isArray(packet.postings)) {
    record.postings = {
      count: Number.isInteger(packet.postings.count) ? packet.postings.count : null,
      oldestDays: Number.isInteger(packet.postings.oldestDays) ? packet.postings.oldestDays : null,
      over180: Number.isInteger(packet.postings.over180) ? packet.postings.over180 : null,
      source: ['employer_declared', 'unknown'].includes(packet.postings.source) ? packet.postings.source : 'unknown',
      observedLifetimeUsable: false,
    };
  }
  assertMissionCompany(record);
  return record;
}

export function attachCompany(mission, record, { at } = {}) {
  assertMission(mission);
  assertMissionCompany(record);
  const next = bump(mission, { at, action: 'attach_company' });
  next.crm.company = structuredClone(record);
  assertMission(next);
  return next;
}

export function detachCompany(mission, { at } = {}) {
  assertMission(mission);
  const next = bump(mission, { at, action: 'detach_company' });
  next.crm.company = null;
  assertMission(next);
  return next;
}

export function recordMutualYes(mission, { candId, side, at } = {}) {
  assertMission(mission);
  if (side !== 'founder' && side !== 'candidate') throw new Error('mutual_side');
  const id = requireId(candId, 'cand');
  const existing = pairOf(mission, id);
  if (!existing) throw new Error('mutual_pair_missing');
  if (existing.mutual?.[side] === true) throw new Error('mutual_already');
  const next = bump(mission, { at, action: `mutual:${side}`, candId: id });
  const row = pairOf(next, id);
  row.mutual = { ...row.mutual, [side]: true };
  row.updatedAt = next.updatedAt;
  assertMission(next);
  return next;
}

export function rememberPair(mission, pair, { at } = {}) {
  assertMission(mission);
  if (!pair || typeof pair !== 'object' || Array.isArray(pair)) throw new Error('pair_object');
  if (pair.sample !== false) throw new Error('pair_sample');
  const candId = requireId(pair.candId, 'cand');
  if (pair.roleId !== mission.roleId) throw new Error('pair_role');
  if (!applicationOf(mission, candId)) throw new Error('pair_application_missing');
  const pairId = String(pair.pairId || '').trim();
  if (!pairId || pairId.length > 64) throw new Error('pair_id');
  if ((mission.crm.pairs || []).some((row) => row.pairId === pairId)) throw new Error('pair_duplicate');
  const next = bump(mission, { at, action: 'pair', candId });
  next.crm.pairs.push({
    pairId,
    candId,
    state: String(pair.state || 'review').slice(0, 40),
    mutual: {
      founder: pair.mutual?.founder === true,
      candidate: pair.mutual?.candidate === true,
    },
    updatedAt: next.updatedAt,
  });
  assertMission(next);
  return next;
}

export function attachCallNote(mission, { slotId, note = null, at, ...fields } = {}) {
  assertMission(mission);
  const slot = slotOf(mission, slotId);
  if (!slot) throw new Error('conversation_slot_missing');
  if (slot.state !== 'booked') throw new Error('conversation_requires_booked');
  const built = note || makeCallNote({
    ...fields,
    roleId: fields.roleId || mission.roleId,
    candId: fields.candId || slot.candId,
    at: at || fields.at,
  });
  assertCallNote(built);
  if (built.roleId && built.roleId !== mission.roleId) throw new Error('conversation_role');
  if (built.candId && built.candId !== slot.candId) throw new Error('conversation_cand');
  requireId(built.by, 'reviewer');
  if (EMAIL.test(built.summary) || (built.rawTranscript && EMAIL.test(built.rawTranscript))) {
    throw new Error('conversation_contact');
  }
  const next = bump(mission, { at: at || built.at, action: 'call_note', candId: slot.candId });
  next.conversations.push({
    slotId: slot.id,
    moment: slot.moment,
    note: structuredClone(built),
  });
  assertMission(next);
  return next;
}

export function recordDebrief(mission, { slotId, at } = {}) {
  assertMission(mission);
  const slot = slotOf(mission, slotId);
  if (!slot) throw new Error('debrief_slot_missing');
  if (slot.state !== 'booked') throw new Error('debrief_requires_booked');
  if ((mission.debriefs || []).some((row) => row.slotId === slot.id)) throw new Error('debrief_duplicate');
  const notes = (applicationOf(mission, slot.candId)?.scorecards || []).filter((note) => note.draft !== true);
  const roundup = debriefRoundup(mission.packet, notes);
  const byMust = new Map((roundup.byMustHave || []).map((row) => [row.mustHaveId, row]));
  const plan = Array.isArray(mission.packet.interviewPlan) && mission.packet.interviewPlan.length
    ? mission.packet.interviewPlan
    : (mission.packet.mustHaves || []).map((row) => ({ mustHaveId: row.id, moment: null }));
  const coverage = plan.map((row) => {
    const cell = byMust.get(row.mustHaveId);
    const thisMoment = !row.moment || !slot.moment || row.moment === slot.moment;
    const rated = Boolean(cell && cell.n > 0);
    return {
      mustHaveId: row.mustHaveId,
      moment: row.moment || null,
      covered: thisMoment && rated,
      disagree: thisMoment && Boolean(cell?.disagree),
      unknown: !thisMoment || !rated,
    };
  });
  const next = bump(mission, { at, action: 'debrief', candId: slot.candId });
  next.debriefs.push({
    schema: 'demigod.role-mission-debrief/1',
    id: newId(),
    slotId: slot.id,
    candId: slot.candId,
    moment: slot.moment,
    at: next.updatedAt,
    coverage,
    disagreement: coverage.filter((row) => row.disagree).map((row) => row.mustHaveId),
    unknowns: coverage.filter((row) => row.unknown).map((row) => row.mustHaveId),
    roundup,
    score: null,
    authority: { employmentDecision: 'human', externalAction: 'none' },
  });
  assertMission(next);
  return next;
}

export function sendOffer() {
  throw new Error('offer_send_denied');
}

export function signOffer() {
  throw new Error('offer_sign_denied');
}

export function recordOfferTerms(mission, { candId, terms, band = null, send = false, sign = false, at } = {}) {
  assertMission(mission);
  if (send === true) throw new Error('offer_send_denied');
  if (sign === true) throw new Error('offer_sign_denied');
  const id = requireId(candId, 'cand');
  if (!applicationOf(mission, id)) throw new Error('offer_application_missing');
  if ((mission.ats.offers || []).some((row) => row.candId === id)) throw new Error('offer_duplicate');
  const text = String(terms || '').trim();
  if (text.length < 12 || text.length > 2000) throw new Error('offer_terms');
  const next = bump(mission, { at, action: 'offer_terms', candId: id });
  next.ats.offers.push({
    schema: 'demigod.role-mission-offer/1',
    id: newId(),
    candId: id,
    terms: text,
    band: band ? String(band).trim().slice(0, 200) : null,
    sent: false,
    signed: false,
    authority: {
      send: 'none',
      sign: 'none',
      employmentDecision: 'human',
      externalAction: 'none',
    },
  });
  assertMission(next);
  return next;
}

function boundList(values, label) {
  if (values == null) return [];
  if (!Array.isArray(values)) throw new Error(`${label}_array`);
  return values.map((row) => {
    const text = String(row || '').trim();
    if (text.length < 4 || text.length > 200) throw new Error(`${label}_item`);
    return text;
  }).slice(0, 8);
}

export function scheduleOutcomeCheck(mission, { dueAt, at } = {}) {
  assertMission(mission);
  const hired = hiredApplication(mission);
  if (!hired) throw new Error('outcome_check_requires_hire');
  if (mission.outcomeCheck?.recordedAt) throw new Error('outcome_check_already');
  if (mission.outcomeCheck?.dueAt) throw new Error('outcome_check_scheduled');
  const hiredAt = hiredAtOf(mission);
  const earliest = Date.parse(hiredAt) + OUTCOME_CHECK_MS;
  const due = dueAt ? Date.parse(dueAt) : earliest;
  if (!Number.isFinite(due) || due < earliest) throw new Error('outcome_check_too_soon');
  const next = bump(mission, { at, action: 'schedule_90d_check', candId: hired.candId });
  next.outcomeCheck = {
    schema: OUTCOME_CHECK_SCHEMA,
    candId: hired.candId,
    hiredAt,
    dueAt: new Date(due).toISOString(),
    scheduledAt: next.updatedAt,
    lasted: null,
    note: null,
    recordedAt: null,
    authority: { employmentDecision: 'human', externalAction: 'none' },
  };
  assertMission(next);
  return next;
}

export function recordOutcomeCheck(mission, { lasted, note, at } = {}) {
  assertMission(mission);
  const check = mission.outcomeCheck;
  if (!check?.dueAt) throw new Error('outcome_check_not_scheduled');
  if (check.recordedAt) throw new Error('outcome_check_already');
  if (typeof lasted !== 'boolean') throw new Error('outcome_check_lasted');
  const text = String(note || '').trim();
  if (text.length < 20 || text.length > 2000) throw new Error('outcome_check_note');
  const clock = now(at);
  if (Date.parse(clock) < Date.parse(check.dueAt)) throw new Error('outcome_check_not_due');
  const next = bump(mission, { at: clock, action: 'record_90d_check', candId: check.candId });
  next.outcomeCheck = {
    ...check,
    lasted,
    note: text,
    recordedAt: next.updatedAt,
  };
  assertMission(next);
  return next;
}

export function recordOutcome(mission, { learned, keep = [], avoid = [], at } = {}) {
  assertMission(mission);
  if (!['filled', 'closed'].includes(mission.closeState)) throw new Error('outcome_not_closed');
  if (mission.outcome) throw new Error('outcome_already_recorded');
  if (mission.closeState === 'filled' && !mission.outcomeCheck?.recordedAt) {
    throw new Error('outcome_requires_90d_check');
  }
  const text = String(learned || '').trim();
  if (text.length < 20 || text.length > 2000) throw new Error('outcome_learned');
  const hired = hiredApplication(mission);
  const next = bump(mission, { at, action: 'outcome' });
  next.outcome = {
    schema: 'demigod.role-mission-outcome/1',
    at: next.updatedAt,
    closeState: next.closeState,
    hiredCandId: hired?.candId || null,
    lasted90d: mission.outcomeCheck?.lasted ?? null,
    learned: text,
    keep: boundList(keep, 'outcome_keep'),
    avoid: boundList(avoid, 'outcome_avoid'),
    predicted: null,
    authority: { employmentDecision: 'human', externalAction: 'none' },
  };
  assertMission(next);
  return next;
}

export function openNextMission(prior, { packet, owner, at } = {}) {
  if (!prior?.outcome) throw new Error('next_mission_outcome_required');
  assertMission(prior);
  if (prior.outcome.lasted90d === false && !(prior.outcome.avoid || []).length) {
    throw new Error('next_mission_avoid_required');
  }
  const next = openRoleMission({ packet, owner, at });
  next.priorRoleId = prior.roleId;
  next.learning = {
    fromRoleId: prior.roleId,
    learned: prior.outcome.learned,
    keep: [...(prior.outcome.keep || [])],
    avoid: [...(prior.outcome.avoid || [])],
    lasted90d: prior.outcome.lasted90d ?? null,
    predicted: null,
  };
  next.authority = { ...AUTHORITY };
  assertMission(next);
  return next;
}

export function interviewerLoad(mission) {
  assertMission(mission);
  const by = new Map();
  for (const slot of mission.calendar.slots) {
    if (!ACTIVE_SLOT_STATES.includes(slot.state)) continue;
    const row = by.get(slot.interviewer) || { interviewer: slot.interviewer, holds: 0, booked: 0 };
    if (slot.state === 'hold') row.holds += 1;
    else row.booked += 1;
    by.set(slot.interviewer, row);
  }
  return [...by.values()];
}

export function projectNextAction(mission) {
  assertMission(mission);
  if (mission.outcome) {
    return withObservation(mission, { kind: 'next_mission', externalAction: false, note: 'Observed outcome is on this mission. The next need starts a new one.' });
  }
  if (mission.closeState === 'filled' && !mission.outcomeCheck?.dueAt) {
    return withObservation(mission, { kind: 'schedule_90d_check', externalAction: false, note: 'A hire is not a 90-day outcome. Schedule the dated check.' });
  }
  if (mission.closeState === 'filled' && !mission.outcomeCheck?.recordedAt) {
    return withObservation(mission, { kind: 'wait_90d_check', dueAt: mission.outcomeCheck.dueAt, externalAction: false, note: 'Do not record learning until the 90-day check is due.' });
  }
  if (mission.closeState === 'filled') {
    return withObservation(mission, { kind: 'record_outcome', externalAction: false, note: 'The 90-day check is on the mission. Record what was learned.' });
  }
  if (mission.closeState === 'closed' || mission.closeState === 'paused') {
    return withObservation(mission, { kind: 'mission_idle', externalAction: false, note: 'Mission is not open.' });
  }
  const apps = mission.ats.applications;
  if (!apps.length) {
    return withObservation(mission, { kind: 'source_candidates', externalAction: false, note: 'Open applications on this mission. No spray, no bought list.' });
  }
  const booked = mission.calendar.slots.find((row) => row.state === 'booked');
  if (booked && !(mission.debriefs || []).some((row) => row.slotId === booked.id)) {
    return withObservation(mission, { kind: 'debrief_conversation', slotId: booked.id, candId: booked.candId, externalAction: false, note: 'Debrief coverage against the interview plan. No hire score.' });
  }
  if (apps.some((row) => row.stage === 'offer') && !(mission.ats.offers || []).some((row) => row.candId === apps.find((app) => app.stage === 'offer')?.candId)) {
    return withObservation(mission, { kind: 'write_offer_terms', externalAction: false, note: 'Offer terms stay on the mission. Software does not send or sign them.' });
  }
  if (apps.some((row) => row.stage === 'offer')) {
    return withObservation(mission, { kind: 'close_or_decline', externalAction: false, note: 'Offer is a human close. Software does not send it.' });
  }
  const interview = apps.find((row) => row.stage === 'interview' || row.stage === 'screen');
  if (interview) {
    const active = mission.calendar.slots.find((row) =>
      row.candId === interview.candId && ACTIVE_SLOT_STATES.includes(row.state));
    if (!active) {
      return withObservation(mission, { kind: 'hold_or_book', candId: interview.candId, externalAction: false, note: 'Book inside Demigod. No invite is sent.' });
    }
    if (active.state === 'hold') {
      return withObservation(mission, { kind: 'book_or_release', slotId: active.id, candId: interview.candId, externalAction: false, note: 'Hold is not a booking.' });
    }
    return withObservation(mission, { kind: 'wait_for_conversation', slotId: active.id, candId: interview.candId, externalAction: false, note: 'Conversation is human. No recording by default.' });
  }
  const applied = apps.find((row) => row.stage === 'applied');
  if (applied) {
    return withObservation(mission, { kind: 'review_application', candId: applied.candId, externalAction: false, note: 'Independent human review. No fit score.' });
  }
  return withObservation(mission, { kind: 'human_review', externalAction: false, note: 'Resolve inside the mission. No external action.' });
}

export function projectCompContext(mission) {
  assertMission(mission);
  const band = mission.packet?.compBand;
  if (!band || !String(band.text || '').trim()) return null;
  const ready = (mission.ats.applications || []).some((row) => ['interview', 'offer', 'hired'].includes(row.stage))
    || (mission.ats.offers || []).length > 0;
  if (!ready) return null;
  return {
    text: String(band.text).trim(),
    source: band.source || 'unknown',
    rank: null,
    score: null,
  };
}

export function projectSurfaces(mission) {
  assertMission(mission);
  const byStage = Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, 0]));
  for (const row of mission.ats.applications) byStage[row.stage] += 1;
  const people = new Map();
  for (const row of mission.ats.applications) {
    people.set(row.candId, {
      candId: row.candId,
      applicationStage: row.stage,
      lastTouchAt: null,
      lastChannel: null,
      consentWithdrawn: false,
    });
  }
  for (const touch of mission.crm.touches) {
    const person = people.get(touch.candId) || {
      candId: touch.candId,
      applicationStage: null,
      lastTouchAt: null,
      lastChannel: null,
      consentWithdrawn: false,
    };
    if (isConsentWithdrawn(touch.outcome)) person.consentWithdrawn = true;
    if (!person.lastTouchAt || Date.parse(touch.at) >= Date.parse(person.lastTouchAt)) {
      person.lastTouchAt = touch.at;
      person.lastChannel = touch.channel;
    }
    people.set(touch.candId, person);
  }
  return {
    schema: 'demigod.role-mission-surfaces/1',
    roleId: mission.roleId,
    closeState: mission.closeState,
    owner: mission.owner,
    outcome90d: mission.packet.outcome90d,
    mustHaves: mission.packet.mustHaves,
    interviewPlan: mission.packet.interviewPlan || [],
    compContext: projectCompContext(mission),
    ats: {
      counts: byStage,
      applications: mission.ats.applications.map((row) => ({
        ...row,
        drafts: undefined,
        pendingReviewers: (row.drafts || []).map((draft) => draft.reviewedBy),
      })),
    },
    calendar: { slots: mission.calendar.slots, load: interviewerLoad(mission) },
    crm: {
      people: [...people.values()],
      pairs: mission.crm.pairs,
      touches: mission.crm.touches,
      company: mission.crm.company
        ? { ...mission.crm.company, presentation: presentCompany(mission.crm.company) }
        : null,
    },
    conversations: (mission.conversations || []).map((row) => ({
      slotId: row.slotId,
      moment: row.moment,
      note: { ...row.note, rawTranscript: undefined },
    })),
    debriefs: mission.debriefs,
    offers: mission.ats.offers,
    learning: mission.learning || null,
    nextAction: projectNextAction(mission),
    events: mission.events,
    activity: projectActivityList({
      receipts: mission.events,
      entity: mission.roleId,
      limit: 50,
    }),
    outcomeCheck: mission.outcomeCheck || null,
    outcome: mission.outcome || null,
    authority: mission.authority,
  };
}
