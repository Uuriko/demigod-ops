#!/usr/bin/env node
/**
 * demigod-die-lifespan — how long roles actually stay open, per company, with what we cannot say.
 *
 * WHY THIS IS WORTH SURFACING
 * A hiring desk calibrates urgency against a guess. The archive reconstruction has 24,775 observed
 * role spans across 63 boards, and DIE shows none of it. "Roles at this company historically close
 * in about five weeks" is a different conversation from "we think this is urgent".
 *
 * WHY THE EXCLUSIONS ARE THE PRODUCT
 * Of those 24,775 spans, 1,105 can support a duration claim. The other 23,670 cannot, for three
 * separate reasons that a single "median 55 days" would quietly launder:
 *
 *   predatesArchive  the role was already posted in the earliest snapshot, so it has no measurable
 *                    start. Counting it understates nothing and overstates everything.
 *   stillOpen        no closure observed. Folding these in as "closed today" is the classic
 *                    right-censoring error and biases every duration downward.
 *   seenOnce         observed in exactly one capture. Its duration is unknown, not zero — including
 *                    them once moved the median from 51 days to 7.
 *
 * So every figure here ships with its denominator and the three exclusions beside it. A vendor that
 * reports the median without them is reporting a different, easier number.
 *
 * WHY IT REFUSES SMALL SAMPLES
 * A median over three spans is arithmetic, not evidence. Below the floor this returns the counts and
 * no median at all, because a confident-looking number from four observations is worse than none.
 *
 *   node demigod-die-lifespan.mjs                    # overall
 *   node demigod-die-lifespan.mjs --company yc:acme
 *   node demigod-die-lifespan.mjs --selftest
 *
 * Schema: demigod.die-lifespan/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const HISTORY = path.join(ROOT, 'DEMIGOD-BOARD-HISTORY.json');
export const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');

/**
 * Fewest measurable spans that will produce a median.
 *
 * Eight is a judgement, not a derivation, and it is deliberately stated as one. The point is that
 * some floor exists and is visible, so nobody has to wonder whether a company's "median" rests on
 * two closures.
 */
export const MIN_MEASURABLE = 8;

/** PURE. Is this span capable of supporting a duration claim, and if not, which reason. */
export function spanState(span) {
  if (!span || typeof span !== 'object') return 'unusable';
  if (span.predatesArchive) return 'predatesArchive';
  if (!span.closedBy) return 'stillOpen';
  if ((span.snapshotsSeen || 0) < 2) return 'seenOnce';
  if (!Number.isFinite(span.openDaysAtLeast)) return 'unusable';
  return 'measurable';
}

/** PURE. Percentile from a sorted array, or null when there is nothing to take one from. */
export function percentile(sortedDays, p) {
  if (!sortedDays.length) return null;
  return sortedDays[Math.min(sortedDays.length - 1, Math.floor(sortedDays.length * p))];
}

/**
 * PURE. Turn a set of spans into a claim, or into a refusal that says why.
 *
 * `openDaysAtLeast` is a floor, not a duration: the archive brackets a closure between two
 * snapshots, so the true figure sits between this and the next capture. Named `atLeast` throughout
 * so nobody rounds it into precision it does not have.
 */
export function summarize(spans, { minMeasurable = MIN_MEASURABLE } = {}) {
  const list = Array.isArray(spans) ? spans : [];
  const states = list.map(spanState);
  const excluded = {
    predatesArchive: states.filter((s) => s === 'predatesArchive').length,
    stillOpen: states.filter((s) => s === 'stillOpen').length,
    seenOnce: states.filter((s) => s === 'seenOnce').length,
    unusable: states.filter((s) => s === 'unusable').length,
  };
  const days = list.filter((s, i) => states[i] === 'measurable')
    .map((s) => s.openDaysAtLeast).sort((a, b) => a - b);

  const base = { observed: list.length, measurable: days.length, excluded };
  if (days.length < minMeasurable) {
    return {
      ...base,
      ok: false,
      why: `only ${days.length} of ${list.length} observed spans can support a duration claim (floor is ${minMeasurable})`,
      medianOpenDaysAtLeast: null,
    };
  }
  return {
    ...base,
    ok: true,
    medianOpenDaysAtLeast: percentile(days, 0.5),
    p25OpenDaysAtLeast: percentile(days, 0.25),
    p90OpenDaysAtLeast: percentile(days, 0.9),
    longestOpenDaysAtLeast: days[days.length - 1],
    over30: days.filter((d) => d > 30).length,
    over90: days.filter((d) => d > 90).length,
    /* Said in the payload, not just in a doc, because this is the number people quote. */
    basis: 'closures bracketed between two archive snapshots; openDaysAtLeast is a floor, not an exact duration',
  };
}

/** PURE. board key (`Provider:slug`) → company id, from the map. */
export function boardKeyToCompany(map) {
  const out = new Map();
  for (const c of map?.companies || []) {
    if (!c?.atsSource || !c?.jobsUrl) continue;
    const slug = String(c.jobsUrl).split('?')[0].replace(/\/+$/, '').split('/').pop();
    if (slug) out.set(`${c.atsSource}:${slug}`, { id: c.id, name: c.name });
  }
  return out;
}

/** PURE. Per-company summaries plus one overall, from a collected history and the map. */
export function lifespans(history, map, { minMeasurable = MIN_MEASURABLE } = {}) {
  const boards = Object.entries(history?.boards || {}).filter(([, b]) => b && b.ok);
  if (!boards.length) return { ok: false, why: 'no boards collected yet', companies: [], overall: null };
  const keyed = boardKeyToCompany(map || {});
  const companies = boards.map(([key, board]) => {
    const known = keyed.get(key) || null;
    return {
      boardKey: key,
      companyId: known?.id || null,
      name: known?.name || board.name || null,
      snapshots: board.snapshots ?? null,
      ...summarize(board.spans, { minMeasurable }),
    };
  }).sort((a, b) => (b.measurable - a.measurable));
  const overall = summarize(boards.flatMap(([, b]) => b.spans || []), { minMeasurable });
  return {
    ok: true,
    boardsCollected: boards.length,
    /* Named so a reader can tell "we measured every board" from "we measured 63 of 492". */
    companiesWithAClaim: companies.filter((c) => c.ok).length,
    overall,
    companies,
  };
}

export function load(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`die-lifespan selftest: ${msg}`); };

  const closed = (d, seen = 3) => ({ closedBy: '2026-01-01', snapshotsSeen: seen, openDaysAtLeast: d, predatesArchive: false });
  assert(spanState(closed(10)) === 'measurable', 'a bracketed closed span seen twice is measurable');
  assert(spanState({ predatesArchive: true, closedBy: '2026-01-01', snapshotsSeen: 9, openDaysAtLeast: 900 }) === 'predatesArchive',
    'a role already posted in the first snapshot has no measurable start');
  assert(spanState({ closedBy: null, snapshotsSeen: 9, openDaysAtLeast: 40 }) === 'stillOpen',
    'no observed closure is right-censored, not a 40-day role');
  assert(spanState(closed(0, 1)) === 'seenOnce',
    'one capture is an unknown duration, not a zero-day role — this moved a median from 51 to 7 once');
  assert(spanState({ closedBy: '2026-01-01', snapshotsSeen: 4 }) === 'unusable', 'no day count is unusable');

  // the refusal
  const thin = summarize([closed(10), closed(20), closed(30)]);
  assert(!thin.ok && thin.medianOpenDaysAtLeast === null,
    'three spans produce no median — a confident number from three observations is worse than none');
  assert(thin.measurable === 3 && thin.observed === 3, 'and it still reports what it had');

  const spans = [
    ...Array.from({ length: 9 }, (_, i) => closed((i + 1) * 10)),
    { predatesArchive: true, closedBy: '2026-01-01', snapshotsSeen: 5, openDaysAtLeast: 900 },
    { closedBy: null, snapshotsSeen: 5, openDaysAtLeast: 400 },
    closed(5, 1),
  ];
  const s = summarize(spans);
  assert(s.ok && s.measurable === 9, `nine measurable, got ${s.measurable}`);
  assert(s.observed === 12, 'the denominator is every observed span, not just the usable ones');
  assert(s.excluded.predatesArchive === 1 && s.excluded.stillOpen === 1 && s.excluded.seenOnce === 1,
    'each exclusion is counted separately — they are three different reasons, not one');
  assert(s.medianOpenDaysAtLeast === 50, `median over the measurable nine, got ${s.medianOpenDaysAtLeast}`);
  assert(s.over30 === 6 && s.over90 === 0, 'thresholds count only measurable spans');
  // the censoring test: the 400-day open role and the 900-day pre-archive one must not move the median
  assert(s.medianOpenDaysAtLeast < 100, 'excluded spans must not leak into the central figure');

  const map = { companies: [{ id: 'yc:acme', name: 'Acme', atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/acme' }] };
  assert(boardKeyToCompany(map).get('Ashby:acme').id === 'yc:acme', 'board key maps to company id');

  const feed = lifespans({ boards: { 'Ashby:acme': { ok: true, name: 'Acme', snapshots: 12, spans } } }, map);
  assert(feed.ok && feed.companies[0].companyId === 'yc:acme', 'company is identified');
  assert(feed.companiesWithAClaim === 1, 'and counted as having a claim');
  assert(feed.overall.measurable === 9, 'overall aggregates every board');
  assert(!lifespans({ boards: {} }, map).ok, 'no collected boards is reported, not an empty median');

  console.log(JSON.stringify({ ok: true, selftest: 'demigod-die-lifespan' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else {
    const feed = lifespans(load(HISTORY, {}), load(MAP, {}));
    if (!feed.ok) { console.log(JSON.stringify(feed, null, 1)); process.exit(0); }
    const at = args.indexOf('--company');
    if (at >= 0) {
      const id = args[at + 1];
      console.log(JSON.stringify(feed.companies.find((c) => c.companyId === id) || { companyId: id, ok: false, why: 'no archived board for this company' }, null, 1));
    } else {
      const o = feed.overall;
      console.log(`lifespan · ${feed.boardsCollected} boards collected · ${feed.companiesWithAClaim} with enough to claim`);
      console.log(`  observed ${o.observed} spans, ${o.measurable} measurable`);
      console.log(`  excluded: predatesArchive ${o.excluded.predatesArchive} · stillOpen ${o.excluded.stillOpen} · seenOnce ${o.excluded.seenOnce}`);
      if (o.ok) console.log(`  median ${o.medianOpenDaysAtLeast}d at least · p25 ${o.p25OpenDaysAtLeast} · p90 ${o.p90OpenDaysAtLeast} · over90 ${o.over90}`);
      console.log('\n  top boards by measurable spans:');
      for (const c of feed.companies.slice(0, 8)) {
        console.log(`   ${String(c.name || c.boardKey).slice(0, 24).padEnd(25)} measurable ${String(c.measurable).padStart(4)} / ${String(c.observed).padStart(5)}  ${c.ok ? `median ${c.medianOpenDaysAtLeast}d` : c.why.slice(0, 40)}`);
      }
    }
  }
}
