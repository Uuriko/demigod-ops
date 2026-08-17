#!/usr/bin/env node
/**
 * demigod-role-ledger-archive — keep the part of the role ledger that cannot be polled again.
 *
 * WHY THIS EXISTS
 * `DEMIGOD-ROLE-LEDGER.json` is written with the comment "gitignored, re-pollable". Half of that is
 * true. The descriptive fields — title, location, url, department, employment type — are re-pollable
 * for as long as the role is on the board. Two things are not:
 *
 *   1. **Closed roles.** Once a role comes off a board it is gone. Nothing can re-fetch it, and
 *      `pruneClosed()` deletes it from the ledger 180 days after it closed. The ledger is on a timer
 *      to destroy the only copy.
 *   2. **Observation history.** `firstSeen` is the day *we* first saw a role, `closedAt` the day we
 *      watched it go, `postedDateChangeCount` the number of times a company rewrote its own posted
 *      date. No amount of re-polling recovers when you were watching. You cannot observe the past.
 *
 * That second category is the product's actual substance — the posting-age index and every
 * freshness-laundering claim rest on it — and it lived in one untracked file on one laptop.
 *
 * WHY IT MERGES AND NEVER REGENERATES
 * The obvious implementation reads today's ledger and writes an archive. That implementation deletes
 * data: the day a role is pruned out of the ledger, a regenerating archive drops it too, and the
 * backup faithfully reproduces the loss it existed to prevent. So the archive is a union — a role
 * that is in the archive and absent from the ledger stays, because an absent observation is not an
 * observation of absence.
 *
 *   node demigod-role-ledger-archive.mjs            # merge today's ledger into the archive
 *   node demigod-role-ledger-archive.mjs --json     # what would change, write nothing
 *   node demigod-role-ledger-archive.mjs --selftest
 *
 * Schema: demigod.role-ledger-archive/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const LEDGER = path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const ARCHIVE = path.join(ROOT, 'DEMIGOD-ROLE-LEDGER-ARCHIVE.json');

/**
 * The fields that exist only because someone was watching on a particular day.
 *
 * `nativePostedAt` is here despite being the company's own date: it is the field companies rewrite,
 * and holding our reading of it is what makes `postedDateChangeCount` checkable rather than asserted.
 */
export const OBSERVATION_FIELDS = [
  'firstSeen', 'lastSeen', 'closedAt', 'reopenCount',
  'postedDateChangeCount', 'lastReportedPostedAt', 'nativePostedAt',
];

/** PURE. The observation-only projection of an open role. */
export function observationOf(row = {}) {
  const out = {};
  for (const field of OBSERVATION_FIELDS) if (row[field] !== undefined) out[field] = row[field];
  return out;
}

/**
 * PURE. Merge a ledger into an archive. Never drops a key that is already archived.
 *
 * A role that closes gets promoted out of `observations` into `closed` with its full record, because
 * the moment it closes is the last moment its description can be captured at all.
 */
export function archiveMerge(prev, ledger, { at } = {}) {
  const closed = { ...(prev?.closed || {}) };
  const observations = { ...(prev?.observations || {}) };
  const roles = ledger?.roles || {};
  let promoted = 0;
  let added = 0;

  for (const [key, row] of Object.entries(roles)) {
    if (row?.closedAt) {
      // Full record: a closed role is unfetchable, so this is the last chance to hold its detail.
      if (!closed[key]) promoted += 1;
      closed[key] = { ...row };
      delete observations[key];
    } else {
      if (!observations[key] && !closed[key]) added += 1;
      // A role that reopened leaves `closed` — its detail is fetchable again, and the reopen is
      // itself recorded by reopenCount.
      if (closed[key]) { delete closed[key]; }
      observations[key] = observationOf(row);
    }
  }

  return {
    archive: {
      schema: 'demigod.role-ledger-archive/1',
      updatedAt: at || ledger?.updatedAt || null,
      closed,
      observations,
    },
    promoted,
    added,
    kept: Object.keys(prev?.closed || {}).length + Object.keys(prev?.observations || {}).length,
  };
}

/** PURE. Roles the archive holds that the ledger no longer does — the reason merging matters. */
export function rescuedKeys(archive, ledger) {
  const live = new Set(Object.keys(ledger?.roles || {}));
  return [...Object.keys(archive?.closed || {}), ...Object.keys(archive?.observations || {})]
    .filter((key) => !live.has(key));
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function run({ write = true } = {}) {
  const ledger = readJson(LEDGER);
  if (!ledger || !ledger.roles || !Object.keys(ledger.roles).length) {
    throw new Error('role-ledger-archive: no ledger to archive — refusing to overwrite an archive with nothing');
  }
  const prev = readJson(ARCHIVE, null);
  const { archive, promoted, added, kept } = archiveMerge(prev, ledger);
  const total = Object.keys(archive.closed).length + Object.keys(archive.observations).length;

  // The archive may never shrink. If merging produced fewer roles than we already held, the merge
  // is wrong and writing it would be the data loss this file exists to prevent.
  if (total < kept) {
    throw new Error(`role-ledger-archive: merge would drop ${kept - total} roles — refusing to write`);
  }
  if (write) fs.writeFileSync(ARCHIVE, `${JSON.stringify(archive)}\n`);
  return {
    schema: 'demigod.role-ledger-archive/1',
    closed: Object.keys(archive.closed).length,
    observations: Object.keys(archive.observations).length,
    total,
    promoted,
    added,
    rescued: rescuedKeys(archive, ledger).length,
    bytes: JSON.stringify(archive).length,
    wrote: write ? ARCHIVE : null,
  };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`role-ledger-archive selftest: ${msg}`); };

  const open = { provider: 'Lever', company: 'A', title: 'Eng', url: 'u', firstSeen: '2026-08-04', lastSeen: '2026-08-17' };
  const shut = { provider: 'Lever', company: 'B', title: 'PM', url: 'v', firstSeen: '2026-08-04', lastSeen: '2026-08-10', closedAt: '2026-08-10' };

  const first = archiveMerge(null, { roles: { 'L|a|1': open, 'L|b|2': shut } }, { at: '2026-08-17' });
  assert(first.archive.closed['L|b|2'].title === 'PM', 'a closed role keeps its full record — nothing can re-fetch it');
  assert(first.archive.observations['L|a|1'].firstSeen === '2026-08-04', 'an open role keeps its observations');
  assert(first.archive.observations['L|a|1'].title === undefined, 'an open role does not keep re-pollable detail');

  // The whole point: pruning the ledger must not prune the archive.
  const afterPrune = archiveMerge(first.archive, { roles: { 'L|a|1': open } }, { at: '2026-08-18' });
  assert(afterPrune.archive.closed['L|b|2'], 'a role pruned from the ledger SURVIVES in the archive');
  assert(rescuedKeys(afterPrune.archive, { roles: { 'L|a|1': open } }).length === 1, 'the rescue is countable');

  // A role closing is promoted with its detail intact, at the last moment that detail exists.
  const closedLater = archiveMerge(first.archive, { roles: { 'L|a|1': { ...open, closedAt: '2026-08-18' } } });
  assert(closedLater.archive.closed['L|a|1'].title === 'Eng', 'a role that closes is captured in full, not as observations');
  assert(!closedLater.archive.observations['L|a|1'], 'and leaves the observations side');
  assert(closedLater.archive.closed['L|b|2'], 'while the earlier closure is untouched');

  // A reopened role goes back to being fetchable.
  const reopened = archiveMerge(closedLater.archive, { roles: { 'L|a|1': { ...open, reopenCount: 1 } } });
  assert(!reopened.archive.closed['L|a|1'] && reopened.archive.observations['L|a|1'].reopenCount === 1, 'a reopened role returns to observations');

  // An empty ledger must never be able to blank the archive.
  let threw = false;
  try { archiveMerge(first.archive, { roles: {} }); } catch { threw = true; }
  assert(!threw, 'an empty ledger merges to a no-op, not an error');
  const noop = archiveMerge(first.archive, { roles: {} });
  assert(Object.keys(noop.archive.closed).length + Object.keys(noop.archive.observations).length === 2, 'an empty ledger drops nothing');

  // Every observation field must actually survive, or the backup quietly loses the product.
  const rich = { firstSeen: '1', lastSeen: '2', closedAt: undefined, reopenCount: 3, postedDateChangeCount: 2, lastReportedPostedAt: '4', nativePostedAt: '5', title: 'drop me' };
  const proj = observationOf(rich);
  assert(proj.postedDateChangeCount === 2 && proj.nativePostedAt === '5' && proj.title === undefined, 'the observation projection keeps what cannot be re-polled and drops what can');
  assert(!('closedAt' in proj), 'an undefined field is not archived as present');

  console.log(JSON.stringify({ ok: true, selftest: 'role-ledger-archive' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else console.log(JSON.stringify(run({ write: !args.includes('--json') }), null, 2));
}
