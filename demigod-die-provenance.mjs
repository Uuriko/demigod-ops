#!/usr/bin/env node
/**
 * demigod-die-provenance — for every field on a company, where it came from and how old it is.
 *
 * WHY
 * The company packet already carries the raw materials and scatters them: `asOf` holds a timestamp
 * per source, `identity.source` names an origin, `hiring.lastAttempt` records whether the last read
 * worked, and `unknowns` lists what is missing and why. Nothing assembles them, so the packet reads
 * as one uniformly-true object when in fact its parts were observed days apart and two of its
 * sources have never run at all.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * Produce a confidence percentage. Vendors publish those and they are mostly unfalsifiable — a
 * "93% confident" field cannot be checked by the person relying on it. What can be checked is the
 * origin, the observation time, and whether the last read of that source succeeded. So this reports
 * those three and stops, and a field whose age is unknown is reported as unknown rather than being
 * quietly scored.
 *
 * THE DISTINCTION THAT MATTERS
 * Three different states get flattened by every tool that shows a blank cell:
 *
 *   present     observed, with a time and an origin
 *   unknown     the source ran and did not find it. A real, dated negative.
 *   unobserved  the source never ran. Not a negative at all — nobody looked.
 *
 * A packet where `research` is null because research has never run is not the same as one where
 * research ran and found nothing, and treating them alike is how "no signal" becomes evidence.
 *
 *   node demigod-die-provenance.mjs --company yc:abundant
 *   node demigod-die-provenance.mjs --selftest
 *
 * Schema: demigod.die-provenance/1
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { daysBetween, freshness } from './demigod-die-signals.mjs';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/**
 * Which packet field comes from which source, and which `asOf` clock dates it.
 *
 * Declared rather than inferred, because inferring it from shape would silently mis-date a field
 * the day someone moves it. Each entry names the origin a reader could go and check themselves.
 */
export const FIELDS = [
  { field: 'identity', from: 'map', clock: 'mapGeneratedAt', originPath: 'identity.source', linkPath: 'identity.sourceUrl' },
  { field: 'hiring', from: 'ats-board', clock: 'hiring.openRolesAt', originPath: 'hiring.atsSource', linkPath: 'hiring.jobsUrl' },
  { field: 'roles', from: 'ats-board', clock: 'hiring.openRolesAt', originPath: 'hiring.atsSource', linkPath: 'hiring.jobsUrl' },
  { field: 'journal', from: 'role-ledger', clock: 'ledgerUpdatedAt', originPath: null, linkPath: null },
  { field: 'signals', from: 'hiring-pulse', clock: 'signalsAt', originPath: null, linkPath: null },
  { field: 'research', from: 'company-research', clock: 'researchedAt', originPath: null, linkPath: null },
  { field: 'peers', from: 'map', clock: 'mapGeneratedAt', originPath: 'peerBasis', linkPath: null },
];

/** PURE. Read a dotted path without throwing on a missing branch. */
export function at(object, dotted) {
  if (!dotted) return undefined;
  return dotted.split('.').reduce((node, key) => (node == null ? undefined : node[key]), object);
}

/** PURE. Is there anything here? An empty array and an empty object are not values. */
export function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * PURE. The state of one field on one packet.
 *
 * `unknowns` in the packet is the record of a source that RAN and found nothing, so a field listed
 * there is a dated negative. A field that is empty and unlisted was never looked for, and the two
 * are reported differently on purpose.
 */
export function fieldProvenance(packet, spec, { now = new Date() } = {}) {
  const value = at(packet, spec.field);
  const declaredUnknown = (packet?.unknowns || []).find((u) => u?.field === spec.field) || null;
  const observedAt = at(packet, `asOf.${spec.clock}`) ?? at(packet, spec.clock) ?? null;
  const ageDays = observedAt ? daysBetween(observedAt, now.toISOString()) : null;

  /*
   * Four states, and the fourth was found by building the other three.
   *
   * `signals` on a live packet arrives as {firstObservedToday:0, closedToday:0, reopenedOpen:0}
   * while `unknowns` simultaneously lists signals as not_found. Both cannot be true: either the
   * source ran and those zeros are observations, or it did not and they are placeholders being read
   * as "nothing happened today". That is the house error wearing a number — an absent observation
   * presented as an observation of absence — and smoothing it into `present` would hide it behind
   * three confident zeros.
   *
   * So it is reported as `contested` and the packet's own contradiction becomes visible instead of
   * being resolved by whichever check happened to run first.
   */
  let state;
  if (hasValue(value) && declaredUnknown) state = 'contested';
  else if (hasValue(value)) state = 'present';
  else if (declaredUnknown) state = 'unknown';
  else state = 'unobserved';

  return {
    field: spec.field,
    state,
    source: spec.from,
    origin: at(packet, spec.originPath) ?? null,
    link: at(packet, spec.linkPath) ?? null,
    observedAt: observedAt || null,
    ageDays,
    /* freshness('unknown') rather than a default band: an undated field is not fresh, and it is not
       stale either — nobody can say. */
    freshness: ageDays === null ? 'unknown' : freshness(ageDays),
    reason: declaredUnknown?.reason ?? null,
    /* Only meaningful for board-derived fields, and only when the read actually reported. A stale
       carried-forward count with a failed last read is the case that looks fine and is not. */
    lastReadOk: spec.from === 'ats-board'
      ? (at(packet, 'hiring.lastAttempt') === null ? null : at(packet, 'hiring.lastAttempt') === 'ok')
      : null,
  };
}

/** PURE. Provenance for the whole packet, plus the counts a reader should see first. */
export function provenance(packet, { now = new Date(), fields = FIELDS } = {}) {
  if (!packet || typeof packet !== 'object') {
    return { ok: false, why: 'no packet', fields: [] };
  }
  const rows = fields.map((spec) => fieldProvenance(packet, spec, { now }));
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.state]: (acc[r.state] || 0) + 1 }), {});
  const dated = rows.filter((r) => Number.isFinite(r.ageDays));
  return {
    ok: true,
    companyId: packet.companyId ?? null,
    counts,
    /* The oldest dated field, because a packet is only as current as its stalest part and an
       average would hide exactly the field someone is about to rely on. */
    stalestField: dated.length ? dated.slice().sort((a, b) => b.ageDays - a.ageDays)[0].field : null,
    stalestAgeDays: dated.length ? Math.max(...dated.map((r) => r.ageDays)) : null,
    undated: rows.filter((r) => r.ageDays === null).map((r) => r.field),
    fields: rows,
  };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`die-provenance selftest: ${msg}`); };
  const now = new Date('2026-08-18T00:00:00Z');

  assert(hasValue([1]) && hasValue({ a: 1 }) && hasValue(0) && hasValue(false), 'zero and false are values');
  assert(!hasValue([]) && !hasValue({}) && !hasValue(null) && !hasValue(undefined),
    'an empty array or object is not a value — a packet full of [] is not a packet full of answers');
  assert(at({ a: { b: 2 } }, 'a.b') === 2 && at({}, 'a.b.c') === undefined, 'dotted read survives missing branches');

  const packet = {
    companyId: 'yc:acme',
    asOf: { mapGeneratedAt: '2026-08-16', ledgerUpdatedAt: '2026-08-18', signalsAt: null, researchedAt: null },
    identity: { name: 'Acme', source: 'Y Combinator', sourceUrl: 'https://example.test/acme' },
    hiring: { openRoles: 4, openRolesAt: '2026-08-18', lastAttempt: 'ok', atsSource: 'Ashby', jobsUrl: 'https://jobs.test/acme' },
    roles: [{ title: 'Eng' }],
    journal: [{ kind: 'opened' }],
    signals: {},
    research: null,
    peers: [{ id: 'x' }],
    peerBasis: 'sf-map + roleMix overlap',
    unknowns: [{ field: 'research', reason: 'not_found' }],
  };

  const p = provenance(packet, { now });
  const by = Object.fromEntries(p.fields.map((f) => [f.field, f]));

  assert(by.identity.state === 'present' && by.identity.origin === 'Y Combinator', 'identity carries its origin');
  assert(by.identity.link === 'https://example.test/acme', 'and a link a reader can check');
  assert(by.identity.ageDays === 2 && by.identity.freshness === 'fresh', 'identity is dated by the map clock');
  assert(by.hiring.ageDays === 0 && by.hiring.lastReadOk === true, 'board fields carry the read outcome');

  // the distinction the whole file exists for
  assert(by.research.state === 'unknown' && by.research.reason === 'not_found',
    'research ran and found nothing — a dated negative');
  assert(by.signals.state === 'unobserved',
    'signals is empty and unlisted in unknowns: nobody looked, which is not a negative');
  assert(by.signals.ageDays === null && by.signals.freshness === 'unknown',
    'an undated field is neither fresh nor stale — nobody can say');

  assert(p.stalestField === 'identity' && p.stalestAgeDays === 2,
    'the packet is only as current as its stalest dated part; an average would hide it');
  assert(p.undated.includes('signals') && p.undated.includes('research'), 'undated fields are named');
  assert(p.counts.present === 5 && p.counts.unknown === 1 && p.counts.unobserved === 1,
    `three states counted separately, got ${JSON.stringify(p.counts)}`);

  /* The fourth state, found on live data rather than imagined: a packet that supplies a value AND
     declares the same field unknown. Both cannot be true, and calling it `present` would hide the
     contradiction behind confident zeros. */
  const contested = provenance({
    ...packet,
    signals: { firstObservedToday: 0, closedToday: 0 },
    unknowns: [{ field: 'signals', reason: 'not_found' }],
  }, { now });
  const sig = contested.fields.find((f) => f.field === 'signals');
  assert(sig.state === 'contested',
    'a field that is both supplied and declared unknown is contested, not present');
  assert(sig.reason === 'not_found', 'and it keeps the declared reason so the conflict is legible');

  // a failed read must be visible even while a count survives from yesterday
  const stale = provenance({ ...packet, hiring: { ...packet.hiring, lastAttempt: 'error' } }, { now });
  const h = stale.fields.find((f) => f.field === 'hiring');
  assert(h.state === 'present' && h.lastReadOk === false,
    'a carried-forward count with a failed last read still reports the failure — this is the case that looks fine and is not');

  assert(!provenance(null).ok, 'no packet is reported, not an empty provenance');
  console.log(JSON.stringify({ ok: true, selftest: 'demigod-die-provenance' }));
}

if (isMain) {
  if (process.argv.includes('--selftest')) selftest();
  else console.log('usage: demigod-die-provenance.mjs --selftest   (library: provenance, fieldProvenance)');
}
