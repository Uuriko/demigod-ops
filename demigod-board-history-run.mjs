#!/usr/bin/env node
/**
 * demigod-board-history-run — walk every board we hold through the archive, resumably.
 *
 * WHY A RUNNER AND NOT A LOOP
 * demigod-board-history.mjs answers for one board. Asking it for all 494 takes hours, because being
 * polite to the Internet Archive is the difference between an answer and a throttle, and a throttle
 * looked exactly like "this board was never archived" until that was fixed. A run that long will be
 * interrupted — a laptop sleeps, a session ends, a rate limit lasts longer than patience — so the
 * only useful shape is one that can stop anywhere and continue.
 *
 * WHAT IT REFUSES TO DO
 * Record a board as having no history when the archive merely declined to answer. A board is only
 * written to the checkpoint once it produced a real result or a real 404. Anything else leaves it
 * untouched, so the next run tries again instead of inheriting a false zero forever. That is the
 * whole reason this exists as a checkpointed run rather than a single pass: a wrong "none" is
 * permanent in a way a missing entry is not.
 *
 *   node demigod-board-history-run.mjs                # start or resume
 *   node demigod-board-history-run.mjs --limit 25     # bounded slice
 *   node demigod-board-history-run.mjs --report       # aggregate what has been collected so far
 *   node demigod-board-history-run.mjs --selftest
 *
 * Schema: demigod.board-history-run/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { history } from './demigod-board-history.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const STATE = path.join(ROOT, 'DEMIGOD-BOARD-HISTORY.json');

/** Providers whose archived pages carry job ids in the HTML the archive stored. */
export const ARCHIVABLE = ['Greenhouse', 'Lever', 'Ashby'];

/** PURE. The boards worth asking about, newest-value first. */
export function boardsFrom(map) {
  return (map.companies || [])
    .filter((c) => c && ARCHIVABLE.includes(c.atsSource) && c.jobsUrl)
    .map((c) => {
      const slug = String(c.jobsUrl).split('?')[0].replace(/\/+$/, '').split('/').pop();
      return { id: c.id, name: c.name, provider: c.atsSource, slug, openRoles: c.openRoles ?? null };
    })
    .filter((b) => b.slug && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(b.slug))
    // Boards with more open roles today are the ones whose history is worth most.
    .sort((a, b) => (b.openRoles || 0) - (a.openRoles || 0));
}

export function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); }
  catch { return { schema: 'demigod.board-history-run/1', startedAt: null, boards: {} }; }
}

/**
 * PURE. Aggregate collected spans into the distribution the ledger cannot produce.
 *
 * Only spans with BOTH a bracketed first appearance and a closure are counted. A job already
 * present in the earliest snapshot has no measurable start, and one still open has no end; folding
 * either in would understate every number, which is the censoring this whole exercise exists to
 * escape.
 */
export function distribution(state) {
  const spans = Object.values(state.boards || {})
    .filter((b) => b && b.ok && Array.isArray(b.spans))
    .flatMap((b) => b.spans);
  const days = spans.filter((s) => !s.predatesArchive && s.closedBy)
    .map((s) => s.openDaysAtLeast).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const at = (p) => (days.length ? days[Math.min(days.length - 1, Math.floor(days.length * p))] : null);
  return {
    boards: Object.values(state.boards || {}).filter((b) => b?.ok).length,
    jobs: spans.length,
    measurable: days.length,
    predatingArchive: spans.filter((s) => s.predatesArchive).length,
    stillOpen: spans.filter((s) => !s.closedBy).length,
    openDays: { p25: at(0.25), median: at(0.5), p75: at(0.75), p90: at(0.9), max: days[days.length - 1] ?? null },
    over30: days.filter((d) => d > 30).length,
    over90: days.filter((d) => d > 90).length,
    over180: days.filter((d) => d > 180).length,
    over365: days.filter((d) => d > 365).length,
  };
}

async function run({ limit = 0, from = '2022' } = {}) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const boards = boardsFrom(map);
  const state = loadState();
  state.startedAt = state.startedAt || new Date().toISOString();
  const todo = boards.filter((b) => !state.boards[`${b.provider}:${b.slug}`]);
  const slice = limit > 0 ? todo.slice(0, limit) : todo;
  process.stderr.write(`  ${boards.length} boards · ${boards.length - todo.length} already collected · ${slice.length} this run\n`);

  let throttled = 0;
  for (const b of slice) {
    const key = `${b.provider}:${b.slug}`;
    try {
      const r = await history(b.provider, b.slug, { from, limit: 18 });
      // A real answer, even an empty one: the archive replied and had nothing for this board.
      state.boards[key] = { ok: true, name: b.name, snapshots: r.snapshots, jobs: r.jobs, closed: r.closed, spans: r.spans, at: new Date().toISOString() };
      throttled = 0;
      process.stderr.write(`  ${key}: ${r.snapshots} snaps · ${r.jobs} jobs · ${r.closed} closed\n`);
    } catch (err) {
      /* Deliberately NOT written to the checkpoint. A refusal must not become a permanent "no
         history" — leaving the key absent is what makes the next run try again. */
      throttled += 1;
      process.stderr.write(`  ${key}: SKIPPED (${String(err.message).slice(0, 50)})\n`);
      if (throttled >= 5) { process.stderr.write('  five refusals in a row — stopping rather than hammering the archive\n'); break; }
      await new Promise((r) => setTimeout(r, 15000 * throttled));
    }
    fs.writeFileSync(STATE, `${JSON.stringify(state)}\n`);
  }
  return distribution(state);
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`board-history-run selftest: ${msg}`); };

  const boards = boardsFrom({ companies: [
    { id: 'a', name: 'A', atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/acme', openRoles: 5 },
    { id: 'b', name: 'B', atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/beta/', openRoles: 40 },
    { id: 'c', name: 'C', atsSource: 'Rippling', jobsUrl: 'https://ats.rippling.com/x', openRoles: 9 },
    { id: 'd', name: 'D', atsSource: 'Greenhouse' },
    { id: 'e', name: 'E', atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/../evil', openRoles: 1 },
  ] });
  assert(boards.length === 3, `only archivable boards with a usable slug, got ${boards.length}`);
  assert(boards[0].slug === 'beta', 'the board with the most open roles is worth asking about first');
  assert(!boards.some((b) => b.provider === 'Rippling'), 'a provider whose archived page has no ids is skipped');
  assert(!boards.some((b) => b.id === 'd'), 'a board with no jobsUrl has no slug to ask about');
  /* Only the last path segment is taken, so `.../../evil` yields `evil` and the traversal never
     reaches a URL. Asserting the slug is clean is the real check; expecting the row to vanish was
     my mistake, not the code's. */
  assert(boards.find((b) => b.id === 'e').slug === 'evil', 'a traversal-shaped path collapses to its final segment');
  assert(!boards.some((b) => b.slug.includes('/') || b.slug.includes('..')), 'no slug can carry a path');

  // The distribution must exclude what it cannot measure, or it understates everything.
  const state = { boards: { x: { ok: true, spans: [
    { predatesArchive: true, closedBy: '2024-01-01', openDaysAtLeast: 900 },
    { predatesArchive: false, closedBy: null, openDaysAtLeast: 40 },
    { predatesArchive: false, closedBy: '2024-06-01', openDaysAtLeast: 200 },
    { predatesArchive: false, closedBy: '2024-02-01', openDaysAtLeast: 10 },
  ] } } };
  const d = distribution(state);
  assert(d.measurable === 2, `only bracketed-and-closed spans are measurable, got ${d.measurable}`);
  assert(d.predatingArchive === 1 && d.stillOpen === 1, 'the excluded ones are counted and named, not dropped silently');
  assert(d.over180 === 1 && d.over30 === 1 && d.over365 === 0, 'thresholds count only the two measurable spans, 10d and 200d');
  assert(distribution({ boards: {} }).measurable === 0, 'nothing collected yields no claims');

  console.log(JSON.stringify({ ok: true, selftest: 'board-history-run' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else if (args.includes('--report')) console.log(JSON.stringify(distribution(loadState()), null, 1));
  else {
    const at = args.indexOf('--limit');
    console.log(JSON.stringify(await run({ limit: at >= 0 ? Number(args[at + 1]) : 0 }), null, 1));
  }
}
