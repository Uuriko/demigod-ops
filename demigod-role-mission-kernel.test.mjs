#!/usr/bin/env node
import assert from 'node:assert/strict';
import { makeCallNote } from './demigod-call-note.mjs';
import { buildCompanyPacket, loadPacketInputs } from './demigod-company-packet.mjs';
import { createNote, createPacket, setCompBand, setInterviewPlan } from './demigod-role-packet.mjs';
import {
  AUTHORITY,
  SCHEMA,
  advanceApplication,
  applyCandidate,
  attachCallNote,
  attachCompany,
  bookSlot,
  closeMission,
  detachCompany,
  hiringStatusOf,
  holdSlot,
  markNoShow,
  openNextMission,
  openRoleMission,
  projectNextAction,
  projectSurfaces,
  recordDebrief,
  recordOfferTerms,
  recordOutcome,
  recordScorecard,
  saveScorecardDraft,
  recordTouch,
  releaseSlot,
  rememberPair,
  rescheduleSlot,
  sendOffer,
  signOffer,
  toMissionCompany,
} from './demigod-role-mission-kernel.mjs';

function expectThrow(fn, re, label) {
  assert.throws(fn, re);
  console.log(`fail-closed ${label}`);
}

const packet = setCompBand(setInterviewPlan(createPacket({
  roleId: 'role-mission-kernel',
  title: 'Founding product engineer',
  companyId: 'yc:demo-co',
  outcome90d: 'Ship the first paid loop with one founder-reviewed hire on the mission.',
})), { text: '$180–220k + equity', source: 'founder_stated' });

const open = openRoleMission({ packet, owner: 'founder-potter', at: '2026-08-17T10:00:00.000Z' });
assert.equal(open.schema, SCHEMA);
assert.equal(open.closeState, 'open');
assert.deepEqual(open.authority, AUTHORITY);
assert.equal(projectNextAction(open).kind, 'source_candidates');
assert.equal(projectSurfaces(open).compContext, null);

expectThrow(() => openRoleMission({ packet, owner: 'founder@demigod.local' }), /owner_contact_shaped/, 'owner_contact_shaped');
expectThrow(
  () => openRoleMission({
    packet: createPacket({
      roleId: 'role-demo',
      title: 'Demo',
      outcome90d: 'This demo packet is long enough to pass packet validation.',
      demo: true,
    }),
    owner: 'founder-potter',
  }),
  /mission_demo_forbidden/,
  'mission_demo_forbidden',
);
expectThrow(() => openNextMission(open, { packet, owner: 'founder-potter' }), /next_mission_outcome_required/, 'next_mission_outcome_required');
expectThrow(() => recordDebrief(open, { slotId: 'missing' }), /debrief_slot_missing/, 'debrief_slot_missing');

const applied = applyCandidate(open, { candId: 'cand-ada', source: 'referral', at: '2026-08-17T10:05:00.000Z' });
assert.equal(applied.ats.applications[0].stage, 'applied');
assert.equal(projectNextAction(applied).kind, 'review_application');
expectThrow(() => applyCandidate(applied, { candId: 'cand-ada' }), /application_duplicate/, 'application_duplicate');
expectThrow(() => applyCandidate(applied, { candId: 'ada@startup.com' }), /cand_contact_shaped/, 'cand_contact_shaped');

const note = createNote({
  roleId: packet.roleId,
  candId: 'cand-ada',
  reviewedBy: 'founder-potter',
  ratings: packet.mustHaves.map((row) => ({
    mustHaveId: row.id,
    rating: 'yes',
    evidence: 'Reviewed public work and a founder conversation note.',
  })),
});
const drafted = saveScorecardDraft(applied, note, { at: '2026-08-17T10:09:00.000Z' });
assert.equal(drafted.ats.applications[0].drafts.length, 1);
assert.deepEqual(projectSurfaces(drafted).ats.applications[0].pendingReviewers, ['founder-potter']);
assert.equal(projectSurfaces(drafted).ats.applications[0].drafts, undefined);
assert.ok(!JSON.stringify(projectSurfaces(drafted).ats.applications[0]).includes('Reviewed public work'));
const reviewed = recordScorecard(drafted, note, { at: '2026-08-17T10:10:00.000Z' });
assert.equal(reviewed.ats.applications[0].scorecards.length, 1);
assert.equal(reviewed.ats.applications[0].drafts.length, 0);
assert.equal(reviewed.ats.applications[0].scorecards[0].draft, false);
const otherNote = createNote({
  roleId: packet.roleId,
  candId: 'cand-ada',
  reviewedBy: 'reviewer-kai',
  ratings: packet.mustHaves.map((row) => ({
    mustHaveId: row.id,
    rating: 'yes',
    evidence: 'Hidden draft evidence from the second reviewer until submit.',
  })),
});
const independent = saveScorecardDraft(reviewed, otherNote, { at: '2026-08-17T10:11:00.000Z' });
assert.deepEqual(projectSurfaces(independent).ats.applications[0].pendingReviewers, ['reviewer-kai']);
assert.ok(!JSON.stringify(projectSurfaces(independent)).includes('Hidden draft evidence'));

expectThrow(
  () => advanceApplication(applied, { candId: 'cand-ada', to: 'screen' }),
  /advance_scorecard_required/,
  'advance_scorecard_required',
);
const screening = advanceApplication(reviewed, { candId: 'cand-ada', to: 'screen', at: '2026-08-17T10:15:00.000Z' });
assert.equal(projectNextAction(screening).kind, 'hold_or_book');
assert.throws(
  () => advanceApplication(screening, { candId: 'cand-ada', to: 'offer' }),
  /application_forbidden/,
);

const held = holdSlot(screening, {
  candId: 'cand-ada',
  interviewer: 'founder-potter',
  moment: 'screen',
  start: '2026-08-18T17:00:00.000Z',
  end: '2026-08-18T17:30:00.000Z',
  at: '2026-08-17T10:20:00.000Z',
});
assert.equal(held.calendar.slots[0].state, 'hold');
assert.equal(projectNextAction(held).kind, 'book_or_release');
expectThrow(() => recordDebrief(held, { slotId: held.calendar.slots[0].id }), /debrief_requires_booked/, 'debrief_requires_booked');
expectThrow(() => attachCallNote(held, {
  slotId: held.calendar.slots[0].id,
  kind: 'candidate_screen',
  summary: 'This hold is not a conversation and must not store a call note.',
}), /conversation_requires_booked/, 'conversation_requires_booked');
assert.throws(() => holdSlot(held, {
  candId: 'cand-ada',
  interviewer: 'founder-potter',
  start: '2026-08-19T17:00:00.000Z',
  end: '2026-08-19T17:30:00.000Z',
}), /slot_candidate_busy/);

const other = applyCandidate(held, { candId: 'cand-bev', source: 'inbound', at: '2026-08-17T10:21:00.000Z' });
assert.throws(() => holdSlot(other, {
  candId: 'cand-bev',
  interviewer: 'founder-potter',
  start: '2026-08-18T17:15:00.000Z',
  end: '2026-08-18T17:45:00.000Z',
}), /slot_interviewer_busy/);

const booked = bookSlot(held, { slotId: held.calendar.slots[0].id, at: '2026-08-17T10:25:00.000Z' });
assert.equal(booked.calendar.slots[0].state, 'booked');
assert.equal(projectNextAction(booked).kind, 'debrief_conversation');
const noted = attachCallNote(booked, {
  slotId: booked.calendar.slots[0].id,
  kind: 'candidate_screen',
  summary: 'Walked through two shipped multi-tenant launches and how on-call actually worked.',
  attributesTouched: [{ mustHaveId: 'mh1', evidence: 'Named the tenant isolation incident and the fix.' }],
  rawTranscript: 'private transcript must not appear on surfaces',
  by: 'founder-potter',
  at: '2026-08-17T10:25:30.000Z',
});
assert.equal(noted.conversations[0].note.kind, 'candidate_screen');
assert.equal(projectNextAction(noted).kind, 'debrief_conversation');
assert.equal(projectSurfaces(noted).conversations[0].note.rawTranscript, undefined);
assert.ok(!JSON.stringify(projectSurfaces(noted).conversations).includes('private transcript'));
expectThrow(() => attachCallNote(noted, {
  slotId: noted.calendar.slots[0].id,
  note: {
    ...makeCallNote({
      kind: 'candidate_screen',
      roleId: packet.roleId,
      candId: 'cand-ada',
      summary: 'Enough text to pass the summary floor without becoming a score.',
    }),
    score: 9,
  },
}), /call_note_no_score/, 'conversation_no_score');
expectThrow(() => attachCallNote(noted, {
  slotId: noted.calendar.slots[0].id,
  note: makeCallNote({
    kind: 'candidate_screen',
    roleId: packet.roleId,
    candId: 'cand-ada',
    summary: 'Emailed them at ada@startup.com after the screen which is forbidden here.',
  }),
}), /conversation_contact/, 'conversation_contact');

const moved = rescheduleSlot(booked, {
  slotId: booked.calendar.slots[0].id,
  start: '2026-08-18T18:00:00.000Z',
  end: '2026-08-18T18:30:00.000Z',
  at: '2026-08-17T10:26:00.000Z',
});
assert.equal(moved.calendar.slots[0].state, 'booked');
assert.equal(moved.calendar.slots[0].start, '2026-08-18T18:00:00.000Z');

const disagreeNote = createNote({
  roleId: packet.roleId,
  candId: 'cand-ada',
  reviewedBy: 'reviewer-kai',
  ratings: packet.mustHaves.map((row, index) => ({
    mustHaveId: row.id,
    rating: index === 0 ? 'no' : 'yes',
    evidence: index === 0
      ? 'Second reviewer saw a narrower shipping sample than the first.'
      : 'Agreed on this criterion after the same screen notes.',
  })),
});
const disagreed = recordScorecard(moved, disagreeNote, { at: '2026-08-17T10:27:00.000Z' });
const debriefed = recordDebrief(disagreed, {
  slotId: disagreed.calendar.slots[0].id,
  at: '2026-08-17T10:28:00.000Z',
});
const debrief = debriefed.debriefs[0];
assert.equal(debrief.score, null);
assert.ok(debrief.coverage.some((row) => row.covered));
assert.ok(debrief.coverage.some((row) => row.unknown));
assert.ok(debrief.disagreement.includes(packet.mustHaves[0].id));
assert.ok(debrief.unknowns.length >= 1);
assert.equal(debrief.roundup.score, null);
assert.equal(debrief.authority.employmentDecision, 'human');
console.log('debrief score', debrief.score);
console.log('debrief coverage', debrief.coverage.map((row) => `${row.mustHaveId}:${row.covered ? 'covered' : 'open'}:${row.unknown ? 'unknown' : 'known'}:${row.disagree ? 'disagree' : 'agree'}`).join(','));
console.log('debrief disagreement', debrief.disagreement.join(','));
console.log('debrief unknowns', debrief.unknowns.join(','));
expectThrow(
  () => recordDebrief(debriefed, { slotId: debriefed.calendar.slots[0].id }),
  /debrief_duplicate/,
  'debrief_duplicate',
);

const paired = rememberPair(debriefed, {
  pairId: 'pair-ada-kernel',
  roleId: packet.roleId,
  candId: 'cand-ada',
  sample: false,
  state: 'review',
  mutual: { founder: false, candidate: false },
}, { at: '2026-08-18T18:34:00.000Z' });
assert.equal(paired.crm.pairs[0].mutual.founder, false);
assert.throws(() => rememberPair(paired, { pairId: 'pair-x', roleId: packet.roleId, candId: 'cand-ghost', sample: false }), /pair_application_missing/);
const touched = recordTouch(paired, {
  candId: 'cand-ada',
  channel: 'call',
  note: 'Screen completed; advancing to interview.',
  at: '2026-08-18T18:35:00.000Z',
});
const interviewing = advanceApplication(touched, {
  candId: 'cand-ada',
  to: 'interview',
  at: '2026-08-18T18:40:00.000Z',
});
assert.equal(projectSurfaces(applied).compContext, null);
assert.deepEqual(projectSurfaces(interviewing).compContext, {
  text: '$180–220k + equity',
  source: 'founder_stated',
  rank: null,
  score: null,
});
console.log('comp context after match', projectSurfaces(interviewing).compContext.text);
const released = releaseSlot(interviewing, {
  slotId: interviewing.calendar.slots[0].id,
  at: '2026-08-18T18:41:00.000Z',
});
const nextBooked = bookSlot(released, {
  candId: 'cand-ada',
  interviewer: 'founder-potter',
  moment: 'founder',
  start: '2026-08-20T18:00:00.000Z',
  end: '2026-08-20T19:00:00.000Z',
  at: '2026-08-18T18:42:00.000Z',
});
assert.equal(nextBooked.calendar.slots.at(-1).state, 'booked');
const noShow = markNoShow(nextBooked, {
  slotId: nextBooked.calendar.slots.at(-1).id,
  at: '2026-08-20T19:05:00.000Z',
});
assert.equal(noShow.calendar.slots.at(-1).state, 'no_show');

const offered = advanceApplication(noShow, { candId: 'cand-ada', to: 'offer', at: '2026-08-21T10:00:00.000Z' });
assert.equal(projectNextAction(offered).kind, 'write_offer_terms');
const termed = recordOfferTerms(offered, {
  candId: 'cand-ada',
  terms: 'Founding engineer, $180k cash plus 0.8% starting equity, four-year vest.',
  band: '$180k + 0.8%',
  at: '2026-08-21T10:05:00.000Z',
});
const offer = termed.ats.offers[0];
assert.equal(offer.sent, false);
assert.equal(offer.signed, false);
assert.equal(offer.authority.send, 'none');
assert.equal(offer.authority.sign, 'none');
assert.equal(projectNextAction(termed).kind, 'close_or_decline');
console.log('offer terms exist', Boolean(offer.terms));
console.log('offer sent', offer.sent, 'signed', offer.signed, 'send', offer.authority.send, 'sign', offer.authority.sign);
expectThrow(() => sendOffer(), /offer_send_denied/, 'offer_send_denied');
expectThrow(() => signOffer(), /offer_sign_denied/, 'offer_sign_denied');
expectThrow(() => recordOfferTerms(termed, { candId: 'cand-ada', terms: offer.terms, send: true }), /offer_send_denied/, 'offer_send_flag_denied');
expectThrow(() => recordOfferTerms(termed, { candId: 'cand-ada', terms: offer.terms, sign: true }), /offer_sign_denied/, 'offer_sign_flag_denied');
assert.throws(() => closeMission(termed, { state: 'filled' }), /mission_fill_requires_hire/);
const hired = advanceApplication(termed, { candId: 'cand-ada', to: 'hired', at: '2026-08-22T10:00:00.000Z' });
assert.equal(hired.closeState, 'filled');
assert.equal(projectNextAction(hired).kind, 'record_outcome');

const closed = closeMission(hired, { state: 'filled', at: '2026-08-22T10:05:00.000Z' });
assert.equal(projectNextAction(closed).kind, 'record_outcome');
const done = recordOutcome(closed, {
  learned: 'Founder-reviewed screen plus one no-show still produced a hire. Keep holds short.',
  keep: ['Keep the screen hold inside Demigod'],
  avoid: ['Do not treat a no-show as a silent close'],
  at: '2026-08-22T10:10:00.000Z',
});
assert.equal(done.outcome.hiredCandId, 'cand-ada');
assert.equal(done.outcome.predicted, null);
assert.equal(projectNextAction(done).kind, 'next_mission');
assert.throws(() => recordOutcome(done, { learned: 'Founder-reviewed screen plus one no-show still produced a hire. Keep holds short.' }), /outcome_already_recorded/);
const sequelPacket = setInterviewPlan(createPacket({
  roleId: 'role-mission-kernel-next',
  title: 'Second founding engineer',
  companyId: 'yc:demo-co',
  outcome90d: 'Repeat the hire loop with the last mission learning attached, empty pipeline.',
}));
const sequel = openNextMission(done, {
  packet: sequelPacket,
  owner: 'founder-potter',
  at: '2026-08-23T10:00:00.000Z',
});
assert.equal(sequel.ats.applications.length, 0);
assert.equal(sequel.learning.predicted, null);
assert.equal(sequel.learning.fromRoleId, done.roleId);
assert.match(sequel.learning.learned, /Keep holds short/);
assert.deepEqual(sequel.learning.keep, ['Keep the screen hold inside Demigod']);
assert.deepEqual(sequel.learning.avoid, ['Do not treat a no-show as a silent close']);
assert.equal(sequel.authority.externalAction, 'none');
assert.equal(sequel.authority.calendarInvite, 'none');
console.log('next-mission predicted', sequel.learning.predicted);
console.log('next-mission learned', sequel.learning.learned);
console.log('next-mission keep', sequel.learning.keep.join('|'));
console.log('next-mission avoid', sequel.learning.avoid.join('|'));
console.log('next-mission externalAction', sequel.authority.externalAction);
const surfaces = projectSurfaces(done);
assert.equal(surfaces.ats.counts.hired, 1);
assert.equal(surfaces.crm.people[0].lastChannel, 'call');
assert.equal(surfaces.calendar.load.length, 0);
assert.equal(surfaces.nextAction.externalAction, false);
assert.equal(surfaces.authority.calendarInvite, 'none');
assert.equal(surfaces.activity.state, 'ok');
assert.ok(surfaces.activity.rows.some((row) => row.action === 'book'));
assert.ok(surfaces.activity.rows.every((row) => !('candId' in row)));
assert.ok(surfaces.events.some((row) => row.action === 'book'));
assert.ok(!JSON.stringify(surfaces).includes('@'));
assert.ok(!JSON.stringify(surfaces).includes('fitScore'));

const blocked = recordTouch(applyCandidate(open, { candId: 'cand-opt' }), {
  candId: 'cand-opt',
  channel: 'note',
  outcome: 'opted out',
  at: '2026-08-17T11:00:00.000Z',
});
assert.throws(
  () => advanceApplication(blocked, { candId: 'cand-opt', to: 'screen' }),
  /application_opt_out/,
);
assert.throws(() => holdSlot(blocked, {
  candId: 'cand-opt',
  interviewer: 'founder-potter',
  start: '2026-08-19T17:00:00.000Z',
  end: '2026-08-19T17:30:00.000Z',
}), /slot_opt_out/);
const withdrawn = advanceApplication(blocked, { candId: 'cand-opt', to: 'withdrawn' });
assert.equal(withdrawn.ats.applications[0].stage, 'withdrawn');

function companyRecord(overrides = {}) {
  return {
    schema: 'demigod.mission-company/1',
    companyId: 'yc:demo-co',
    identity: { name: 'Demo Co', domain: 'demo.co', website: 'https://demo.co' },
    hiring: {
      status: 'board_observed',
      openRoles: 12,
      openRolesAt: '2026-08-10T00:00:00.000Z',
      lastAttempt: 'ok',
      lastAttemptAt: '2026-08-10T00:00:00.000Z',
    },
    postings: {
      count: 12,
      oldestDays: 40,
      over180: 1,
      source: 'employer_declared',
      observedLifetimeUsable: false,
    },
    quarantineHiring: false,
    ...overrides,
    identity: { name: 'Demo Co', domain: 'demo.co', website: 'https://demo.co', ...overrides.identity },
    hiring: {
      status: 'board_observed',
      openRoles: 12,
      openRolesAt: '2026-08-10T00:00:00.000Z',
      lastAttempt: 'ok',
      lastAttemptAt: '2026-08-10T00:00:00.000Z',
      ...overrides.hiring,
    },
  };
}

const observed = attachCompany(open, companyRecord(), { at: '2026-08-17T12:00:00.000Z' });
const observedSurface = projectSurfaces(observed).crm.company;
assert.equal(observedSurface.hiring.status, 'board_observed');
assert.equal(observedSurface.hiring.openRoles, 12);
assert.equal(observedSurface.presentation.countIsCurrent, true);
assert.match(observedSurface.presentation.qualifier, /verified/);
assert.equal(projectNextAction(observed).kind, 'source_candidates');
assert.equal(projectNextAction(observed).observation.blocked, false);
console.log('company observed current', observedSurface.presentation.countIsCurrent, observedSurface.hiring.openRoles);

const stale = attachCompany(open, companyRecord({
  hiring: { status: 'board_stale', openRoles: 12, lastAttempt: 'ok' },
}), { at: '2026-08-17T12:01:00.000Z' });
const staleAction = projectNextAction(stale);
assert.equal(staleAction.kind, 'source_candidates');
assert.equal(staleAction.observation.blocked, true);
assert.ok(!/they stopped|board is empty/i.test(staleAction.observation.note));
assert.equal(projectSurfaces(stale).crm.company.presentation.countIsCurrent, false);
console.log('company stale blocked', staleAction.observation.blocked, staleAction.kind);

const unread = attachCompany(open, companyRecord({
  hiring: { status: 'board_stale', openRoles: 3, lastAttempt: 'rate_limited' },
}), { at: '2026-08-17T12:02:00.000Z' });
assert.match(projectNextAction(unread).observation.note, /could not read the board/);

const quarantined = attachCompany(open, companyRecord({
  hiring: { status: 'quarantined', openRoles: null, lastAttempt: null },
  quarantineHiring: true,
  postings: { count: null, oldestDays: null, over180: null, source: 'unknown', observedLifetimeUsable: false },
}), { at: '2026-08-17T12:03:00.000Z' });
assert.equal(projectSurfaces(quarantined).crm.company.hiring.openRoles, null);
assert.match(projectSurfaces(quarantined).crm.company.presentation.qualifier, /withheld/);
assert.ok(!/they are hiring/i.test(JSON.stringify(projectSurfaces(quarantined).crm.company)));
assert.equal(quarantined.closeState, 'open');

const emptyBoard = attachCompany(open, companyRecord({
  hiring: { status: 'board_observed', openRoles: 0, lastAttempt: 'ok' },
}), { at: '2026-08-17T12:04:00.000Z' });
assert.match(projectSurfaces(emptyBoard).crm.company.presentation.qualifier, /read the board and it was empty/);
assert.equal(projectSurfaces(emptyBoard).crm.company.presentation.countIsCurrent, true);

expectThrow(() => attachCompany(open, companyRecord({ hiring: { status: 'board_stale', openRoles: 0, lastAttempt: 'ok' } })), /mission_company_count/, 'zero_requires_live_read');
expectThrow(() => attachCompany(open, companyRecord({ hiring: { status: 'board_observed', openRoles: 0, lastAttempt: 'error' } })), /mission_company_count/, 'zero_requires_ok_attempt');
expectThrow(() => attachCompany(open, companyRecord({ hiring: { status: 'quarantined', openRoles: 4 } })), /mission_company_quarantine_count/, 'quarantine_null_count');
expectThrow(() => attachCompany(open, companyRecord({ companyId: 'hi@demo.co' })), /mission_company_contact/, 'company_contact_shaped');
expectThrow(() => attachCompany(open, companyRecord({ email: 'ops@demo.co' })), /mission_company_forbidden_field|mission_company_contact/, 'company_email_field');
expectThrow(() => attachCompany(open, companyRecord({ postings: { observedLifetimeUsable: true, source: 'employer_declared' } })), /mission_company_observed_lifetime/, 'observed_lifetime_false');

const gone = detachCompany(stale, { at: '2026-08-17T12:05:00.000Z' });
assert.equal(projectSurfaces(gone).crm.company, null);
assert.equal(projectNextAction(gone).observation, undefined);

const built = buildCompanyPacket({
  companyId: 'yc:acme',
  map: {
    generatedAt: '2026-08-14T12:00:00.000Z',
    companies: [{
      id: 'yc:acme',
      name: 'Acme',
      website: 'https://www.acme.example/',
      atsSource: 'Greenhouse',
      jobsUrl: 'https://boards.greenhouse.io/acme',
      openRoles: 2,
      openRolesAt: '2026-08-14',
      hiring: 'yes',
    }],
  },
  ledger: { schema: 'demigod.role-ledger/1', updatedAt: '2026-08-14', roles: {} },
  signals: { schema: 'demigod.recruitai-signals/3', at: '2026-08-14T15:00:00.000Z', byMapCompanyId: {} },
  catalog: {},
});
assert.equal(built.hiring.status, 'board_observed');
assert.equal(built.hiring.lastAttempt, 'ok');
const projected = toMissionCompany(built);
assert.equal(projected.hiring.lastAttempt, 'ok');
assert.equal(projectSurfaces(attachCompany(open, projected)).crm.company.presentation.countIsCurrent, true);
console.log('packet with a dated integer count is current');

const noAttempt = buildCompanyPacket({
  companyId: 'yc:acme',
  map: {
    generatedAt: '2026-08-14T12:00:00.000Z',
    companies: [{
      id: 'yc:acme',
      name: 'Acme',
      website: 'https://www.acme.example/',
      hiring: 'yes',
    }],
  },
  ledger: { schema: 'demigod.role-ledger/1', updatedAt: '2026-08-14', roles: {} },
  catalog: {},
});
assert.equal(noAttempt.hiring.lastAttempt, undefined);
assert.equal(toMissionCompany(noAttempt).hiring.lastAttempt, null);
assert.equal(
  projectSurfaces(attachCompany(open, toMissionCompany(noAttempt))).crm.company.presentation.countIsCurrent,
  false,
);
console.log('packet without lastAttempt is not current');

const verified = toMissionCompany({
  ...built,
  hiring: { ...built.hiring, openRoles: 2, lastAttempt: 'ok', lastAttemptAt: '2026-08-14T12:00:00.000Z' },
});
assert.equal(projectSurfaces(attachCompany(open, verified)).crm.company.presentation.countIsCurrent, true);
console.log('count current only after lastAttempt=ok');

const stillStale = toMissionCompany({
  ...built,
  hiring: { ...built.hiring, status: 'board_stale', openRoles: 2, lastAttempt: 'ok', lastAttemptAt: '2026-08-14T12:00:00.000Z' },
});
assert.equal(projectSurfaces(attachCompany(open, stillStale)).crm.company.presentation.countIsCurrent, false);

// A zero is only a zero when we actually finished reading the board. Drop the attempt and the
// count goes with it; keep the attempt and the zero is real.
// The status ladder both the packet and the matching engine now read from. `board_observed` is the
// strongest thing this enum says, and a date alone used to be enough to earn it — which is how a YC
// directory link with no count read as a watched board on live.
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14', openRoles: 3 }), 'board_observed');
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14', openRoles: 0 }), 'board_observed');
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14', hiring: 'yes' }), 'company_reported');
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14' }), 'unknown');
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14', openRoles: 3, openRolesStale: true }), 'board_stale');
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14', openRoles: 3 }, { quarantined: true }), 'quarantined');
// The caller's projected count wins: the packet counts open roles from the ledger, not the map row.
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14' }, { openRoles: 2 }), 'board_observed');
assert.equal(hiringStatusOf({ openRolesAt: '2026-08-14', openRoles: 9 }, { openRoles: null }), 'unknown');
console.log('hiring status needs a date AND a count');

const strippedZero = toMissionCompany({
  ...built,
  hiring: { ...built.hiring, openRoles: 0, lastAttempt: undefined, lastAttemptAt: undefined },
});
assert.equal(strippedZero.hiring.openRoles, null);
assert.equal(strippedZero.hiring.lastAttempt, null);

const readZero = toMissionCompany({
  ...built,
  hiring: { ...built.hiring, openRoles: 0 },
});
assert.equal(readZero.hiring.lastAttempt, 'ok');
assert.equal(readZero.hiring.openRoles, 0);

try {
  const inputs = loadPacketInputs();
  const row = (inputs.map?.companies || []).find((company) => company?.id && company.openRolesAt);
  if (!row) {
    console.log('live map had no dated company');
  } else {
    const livePacket = buildCompanyPacket({ companyId: row.id, ...inputs });
    const liveRecord = toMissionCompany(livePacket);
    const liveMission = attachCompany(
      openRoleMission({ packet, owner: 'founder-potter', at: '2026-08-17T13:00:00.000Z' }),
      liveRecord,
    );
    const livePres = projectSurfaces(liveMission).crm.company.presentation;
    const shouldBeCurrent = liveRecord.hiring.lastAttempt === 'ok' && liveRecord.hiring.status === 'board_observed';
    assert.equal(livePres.countIsCurrent, shouldBeCurrent);
    console.log(
      'live company',
      liveRecord.companyId,
      liveRecord.hiring.status,
      'lastAttempt',
      liveRecord.hiring.lastAttempt,
      'current',
      livePres.countIsCurrent,
    );
  }
} catch (error) {
  console.log('live map skipped', String(error.message || error).slice(0, 120));
}

const emptyVerified = toMissionCompany({
  companyId: 'yc:acme',
  identity: { name: 'Acme', domain: 'acme.example', website: 'https://www.acme.example/' },
  hiring: {
    status: 'board_observed',
    openRoles: 0,
    openRolesAt: '2026-08-14T12:00:00.000Z',
    lastAttempt: 'ok',
    lastAttemptAt: '2026-08-14T12:00:00.000Z',
  },
});
assert.equal(emptyVerified.hiring.openRoles, 0);
const emptySurface = projectSurfaces(attachCompany(open, emptyVerified)).crm.company;
assert.equal(emptySurface.presentation.countIsCurrent, true);
assert.match(emptySurface.presentation.qualifier, /read the board and it was empty/);
console.log('verified empty is current', emptySurface.presentation.countIsCurrent);

console.log('demigod-role-mission-kernel: PASS');
