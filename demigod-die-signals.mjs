#!/usr/bin/env node
/**
 * demigod-die-signals — what changed about a company, and how long ago.
 *
 * WHY
 * DIE can show what WE did (the activity feed is our own mutations) and what is true right now
 * (companies, roles). It has no answer for what changed in the world, which is the question a
 * hiring desk actually opens in the morning. The data has existed the whole time —
 * demigod-hiring-pulse.mjs has been appending a dated per-company role count to
 * DEMIGOD-HIRING-HISTORY.jsonl since 2026-07-24 — and nothing in DIE reads it.
 *
 * WHY IT DECAYS
 * Signal research is blunt that these things are perishable: a hiring change acted on within days
 * reads as attentive and the same change acted on three weeks later reads as spam, because the
 * situation that produced it has usually already resolved. So every signal carries its age and a
 * freshness band, and a stale one is labelled stale rather than quietly ranked alongside today's.
 *
 * THE FOUR OUTCOMES, AND WHY IT IS NOT TWO
 * A naive diff produces "changed" and "unchanged". Both are wrong most of the time here:
 *
 *   changed            two readable observations whose counts differ. The only one that is news.
 *   steady             two readable observations that agree.
 *   first_observation  the company is absent from the earlier snapshot. A first look is not a
 *                      change, and calling it "+14 roles" invents a delta out of arriving late.
 *   unreadable         the board could not be read on one of the two days. NOT a closure. This is
 *                      the error this codebase keeps finding, and the raw data already guards it —
 *                      each snapshot records `unread` precisely because, as the comment there says,
 *                      the question cannot be answered after the fact.
 *
 * A snapshot written before `unread` existed cannot support a readability claim at all, so those
 * compare as `unknown_readability` rather than being assumed fine.
 *
 *   node demigod-die-signals.mjs            # newest signals
 *   node demigod-die-signals.mjs --company yc:acme
 *   node demigod-die-signals.mjs --selftest
 *
 * Schema: demigod.die-signals/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const HISTORY = path.join(ROOT, 'DEMIGOD-HIRING-HISTORY.jsonl');

/**
 * Freshness bands, in days since the observation.
 *
 * Not a score. A band says how much weight the age alone justifies, and "expired" still shows —
 * hiding an old signal would leave a desk believing nothing has happened rather than that
 * something happened and the moment passed.
 */
export const BANDS = [
  { band: 'today', maxDays: 1 },
  { band: 'fresh', maxDays: 7 },
  { band: 'cooling', maxDays: 21 },
  { band: 'stale', maxDays: 60 },
  { band: 'expired', maxDays: Infinity },
];

/** PURE. Days between two ISO dates, or null when either is unusable. */
export function daysBetween(fromIso, toIso) {
  const a = Date.parse(`${String(fromIso).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(toIso).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** PURE. Age in days to a freshness band. Unknown age is its own answer, never "fresh". */
export function freshness(ageDays) {
  if (!Number.isFinite(ageDays) || ageDays < 0) return 'unknown';
  return BANDS.find((b) => ageDays < b.maxDays)?.band || 'expired';
}

/** PURE. The dated per-company snapshots, oldest first. Rows without role counts are not snapshots. */
export function snapshots(lines) {
  return (lines || [])
    .filter((row) => row && row.roles && Number.isSafeInteger(row.totalRoles) && row.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * PURE. Was this company's board readable on this snapshot?
 *
 * Three answers, not two. A snapshot written before `unread` was added cannot support a readability
 * claim in either direction, and guessing "readable" there is how a crawler outage becomes a wave
 * of fake closures.
 */
export function readable(snapshot, companyId) {
  if (!snapshot) return 'unknown';
  if (!Array.isArray(snapshot.unread)) return 'unknown';
  return snapshot.unread.includes(companyId) ? 'no' : 'yes';
}

/**
 * PURE. Compare one company across two snapshots.
 *
 * `before` is the older observation and may be null, which is a first look rather than a change.
 */
export function classify(companyId, before, after) {
  const priorCount = before?.roles?.[companyId];
  const nowCount = after?.roles?.[companyId];
  const readBefore = readable(before, companyId);
  const readAfter = readable(after, companyId);

  if (!before || priorCount === undefined) {
    return { state: 'first_observation', from: null, to: nowCount ?? null, delta: null,
      why: 'absent from the earlier snapshot — a first look is not a change' };
  }
  if (readBefore === 'no' || readAfter === 'no') {
    return { state: 'unreadable', from: priorCount ?? null, to: nowCount ?? null, delta: null,
      why: `board unread on ${readBefore === 'no' ? 'the earlier' : 'the later'} day — unknown, not a closure` };
  }
  if (readBefore === 'unknown' || readAfter === 'unknown') {
    return { state: 'unknown_readability', from: priorCount ?? null, to: nowCount ?? null, delta: null,
      why: 'a snapshot predates the unread record, so readability cannot be established either way' };
  }
  if (nowCount === undefined) {
    return { state: 'unreadable', from: priorCount, to: null, delta: null,
      why: 'no count in the later snapshot — unknown, not a closure' };
  }
  if (nowCount === priorCount) {
    return { state: 'steady', from: priorCount, to: nowCount, delta: 0, why: 'both observations agree' };
  }
  return { state: 'changed', from: priorCount, to: nowCount, delta: nowCount - priorCount,
    why: 'two readable observations that differ' };
}

/**
 * PURE. Every company signal between the two most recent snapshots.
 *
 * Returns the comparison basis explicitly. A caller that cannot see which two days were compared
 * cannot tell a quiet week from a missing one.
 */
export function signalsFrom(lines, { now = new Date(), limit = 0, states = null } = {}) {
  const snaps = snapshots(lines);
  if (snaps.length === 0) return { ok: false, why: 'no snapshots recorded', signals: [], basis: null };
  const after = snaps[snaps.length - 1];
  const before = snaps.length > 1 ? snaps[snaps.length - 2] : null;
  if (!before) {
    return { ok: false, why: 'only one snapshot exists — nothing can be compared yet', signals: [],
      basis: { after: after.date, before: null, snapshots: snaps.length } };
  }

  const today = now.toISOString().slice(0, 10);
  const ageDays = daysBetween(after.date, today);
  const ids = new Set([...Object.keys(after.roles || {}), ...Object.keys(before.roles || {})]);
  let signals = [...ids].map((id) => ({ companyId: id, ...classify(id, before, after) }))
    .map((s) => ({ ...s, observedOn: after.date, ageDays, freshness: freshness(ageDays) }));

  if (states) signals = signals.filter((s) => states.includes(s.state));
  /* Biggest absolute move first: a company that went 0→14 and one that went 40→26 are both news,
     and ranking by signed delta would bury every closure under every opening. */
  signals.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  const counts = signals.reduce((acc, s) => ({ ...acc, [s.state]: (acc[s.state] || 0) + 1 }), {});
  return {
    ok: true,
    basis: { before: before.date, after: after.date, gapDays: daysBetween(before.date, after.date), snapshots: snaps.length },
    observedOn: after.date,
    ageDays,
    freshness: freshness(ageDays),
    counts,
    total: signals.length,
    signals: limit > 0 ? signals.slice(0, limit) : signals,
  };
}

/**
 * PURE. Narrow a feed to the companies actually being worked, and account for every one of them.
 *
 * Signals decay, so an unfiltered feed of 490 companies is close to useless: the two that matter
 * are buried under 488 that do not. The watchlist needs no new state — a company with an open
 * mission is a company someone is hiring against.
 *
 * The part that is easy to get wrong: a watched company with no signal is DROPPED by a plain
 * filter, and its absence then reads as "nothing changed about them". It is usually the opposite —
 * we are not tracking their board at all, which is a gap worth seeing precisely because someone
 * cared enough to open a mission. Those come back as `not_tracked` rather than vanishing.
 */
export function withWatchlist(feed, watchedIds) {
  const watched = [...new Set((watchedIds || []).filter(Boolean))];
  if (!watched.length) return { ...feed, watched: [], watchedTotal: 0, signals: [] };
  const bySignal = new Map((feed.signals || []).map((s) => [s.companyId, s]));
  const rows = watched.map((id) => bySignal.get(id) || {
    companyId: id,
    state: 'not_tracked',
    from: null,
    to: null,
    delta: null,
    why: 'no board observation on either day — we are not tracking this company, which is not the same as nothing changing',
    observedOn: feed.observedOn ?? null,
    ageDays: feed.ageDays ?? null,
    freshness: feed.freshness ?? 'unknown',
  });
  rows.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  return {
    ...feed,
    watched,
    watchedTotal: rows.length,
    counts: rows.reduce((acc, s) => ({ ...acc, [s.state]: (acc[s.state] || 0) + 1 }), {}),
    total: rows.length,
    signals: rows,
  };
}

/** Read the history file. Absent or unreadable is reported, never treated as an empty history. */
export function loadHistory(file = HISTORY) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  } catch (error) {
    return null;
  }
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`die-signals selftest: ${msg}`); };

  assert(freshness(0) === 'today' && freshness(3) === 'fresh' && freshness(14) === 'cooling', 'bands');
  assert(freshness(30) === 'stale' && freshness(400) === 'expired', 'old signals are labelled, not hidden');
  assert(freshness(null) === 'unknown' && freshness(-2) === 'unknown', 'an unknown age is never fresh');
  assert(daysBetween('2026-08-01', '2026-08-18') === 17, 'day maths');
  assert(daysBetween('nonsense', '2026-08-18') === null, 'unparseable dates yield null, not 0');

  const before = { date: '2026-08-17', totalRoles: 10, roles: { a: 5, b: 3, c: 2 }, unread: ['c'] };
  const after = { date: '2026-08-18', totalRoles: 14, roles: { a: 9, b: 3, c: 2, d: 7 }, unread: [] };

  assert(classify('a', before, after).state === 'changed', 'two readable differing counts is news');
  assert(classify('a', before, after).delta === 4, 'delta');
  assert(classify('b', before, after).state === 'steady', 'agreement is steady');
  assert(classify('d', before, after).state === 'first_observation',
    'a company absent earlier is a first look, not a +7 change');
  assert(classify('d', before, after).delta === null, 'and it claims no delta at all');
  // the one that matters
  assert(classify('c', before, after).state === 'unreadable',
    'a board unread on either day is unknown, NOT a closure');
  assert(classify('c', before, after).delta === null, 'and an unreadable comparison claims no delta');

  // a snapshot predating the unread field supports no readability claim in either direction
  const legacy = { date: '2026-08-16', totalRoles: 8, roles: { a: 5 } };
  assert(classify('a', legacy, after).state === 'unknown_readability',
    'without an unread record, readability is unknown rather than assumed');

  const feed = signalsFrom([before, after], { now: new Date('2026-08-19T00:00:00Z') });
  assert(feed.ok && feed.basis.before === '2026-08-17' && feed.basis.after === '2026-08-18',
    'the comparison basis is reported so a quiet week is distinguishable from a missing one');
  assert(feed.basis.gapDays === 1 && feed.ageDays === 1, 'gap and age');
  assert(feed.counts.changed === 1 && feed.counts.unreadable === 1 && feed.counts.first_observation === 1,
    `states counted, got ${JSON.stringify(feed.counts)}`);
  assert(feed.signals[0].companyId === 'a', 'largest absolute move ranks first');

  // closures must not sort below openings
  const closing = signalsFrom([
    { date: '2026-08-17', totalRoles: 50, roles: { big: 40, small: 1 }, unread: [] },
    { date: '2026-08-18', totalRoles: 12, roles: { big: 26, small: 3 }, unread: [] },
  ], { now: new Date('2026-08-18T00:00:00Z') });
  assert(closing.signals[0].companyId === 'big' && closing.signals[0].delta === -14,
    'a 14-role closure outranks a 2-role opening — ranking by signed delta would bury every closure');

  // --- watchlist ---
  const watchFeed = signalsFrom([before, after], { now: new Date('2026-08-19T00:00:00Z') });
  const w = withWatchlist(watchFeed, ['a', 'zzz-never-seen']);
  assert(w.watchedTotal === 2, 'every watched company is accounted for');
  assert(w.signals.find((s) => s.companyId === 'a').state === 'changed', 'a watched company keeps its signal');
  const missing = w.signals.find((s) => s.companyId === 'zzz-never-seen');
  assert(missing && missing.state === 'not_tracked',
    'a watched company with no observation comes back as not_tracked, not dropped — being dropped would read as "nothing changed"');
  assert(missing.delta === null, 'and claims no delta');
  assert(withWatchlist(watchFeed, []).signals.length === 0, 'an empty watchlist shows nothing rather than everything');

  const single = signalsFrom([after]);
  assert(!single.ok && /only one snapshot/.test(single.why),
    'one snapshot cannot produce a change, and says so rather than reporting nothing happened');
  assert(!signalsFrom([]).ok, 'no snapshots is reported, not an empty quiet feed');

  console.log(JSON.stringify({ ok: true, selftest: 'demigod-die-signals' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else {
    const lines = loadHistory();
    if (!lines) { console.error(`die-signals: cannot read ${HISTORY}`); process.exit(1); }
    const at = args.indexOf('--company');
    const feed = signalsFrom(lines, { limit: at >= 0 ? 0 : 15 });
    if (!feed.ok) { console.log(JSON.stringify(feed, null, 1)); process.exit(0); }
    if (at >= 0) {
      const id = args[at + 1];
      const one = feed.signals.find((s) => s.companyId === id);
      console.log(JSON.stringify(one || { companyId: id, state: 'not_tracked' }, null, 1));
    } else {
      console.log(`signals · ${feed.basis.before} → ${feed.basis.after} (${feed.basis.gapDays}d apart, observed ${feed.ageDays}d ago, ${feed.freshness})`);
      console.log(`  ${JSON.stringify(feed.counts)}  of ${feed.total} companies\n`);
      for (const s of feed.signals) {
        const move = s.delta === null ? '—' : (s.delta > 0 ? `+${s.delta}` : String(s.delta));
        console.log(`  ${String(move).padStart(5)}  ${s.companyId.padEnd(34)} ${s.state}`);
      }
    }
  }
}
