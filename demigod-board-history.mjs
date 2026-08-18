#!/usr/bin/env node
/**
 * demigod-board-history — how long roles were really open, from before we started watching.
 *
 * THE LIMIT THIS REMOVES
 * The role ledger opened 2026-08-04. Every lifespan it can compute is therefore censored by a
 * fourteen-day window: a role that closed on day ten looks like it lived ten days whether it was
 * posted last week or in 2023. "Median 10 days" is a fact about when we started, not about roles,
 * which is why nothing on the site publishes it.
 *
 * The Internet Archive has been snapshotting these same boards for years — Greenhouse back to 2020,
 * Lever to 2019, Ashby to 2021 — and a Greenhouse snapshot is server-rendered HTML with every job
 * id and title in it. A 2023 snapshot of one board yields 78 readable postings. So the history we
 * never observed was observed by somebody else, and it is addressable.
 *
 * WHY EVERY ANSWER IS A RANGE
 * Snapshots are irregular. If a job is absent on 1 March and present on 1 June, it appeared
 * somewhere in between and there is no way to narrow it further. Reporting the midpoint, or the
 * later date, would be inventing precision the archive does not have. So a first appearance is
 * `after`/`by` — a bracket — and a disappearance is the same.
 *
 * And an absence is not a closure. A snapshot can be partial, a fetch can fail, a board can move.
 * A job missing from ONE snapshot but present in the next was never gone; it is only treated as
 * closed when it stays missing.
 *
 *   node demigod-board-history.mjs --board Greenhouse:affirm
 *   node demigod-board-history.mjs --board Greenhouse:affirm --from 2024 --json
 *   node demigod-board-history.mjs --selftest
 *
 * Schema: demigod.board-history/1
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const UA = 'DemigodDirectoryBot/1.0 (+https://trydemigod.com; archived board history)';
const TIMEOUT_MS = 25000;

/** A job is only treated as closed after this many consecutive snapshots without it. */
export const ABSENCE_TOLERANCE = 1;

/** PURE. The board URL a provider+slug archives under. */
export function boardUrl(provider, slug) {
  const s = encodeURIComponent(String(slug || '').trim());
  if (!s) return null;
  if (provider === 'Greenhouse') return `boards.greenhouse.io/${s}`;
  if (provider === 'Lever') return `jobs.lever.co/${s}`;
  if (provider === 'Ashby') return `jobs.ashbyhq.com/${s}`;
  return null;
}

/** PURE. Job ids in one archived page, per provider. */
export function jobIdsFromHtml(provider, slug, html) {
  const source = String(html || '');
  const out = new Set();
  const esc = String(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (provider === 'Greenhouse') {
    for (const m of source.matchAll(new RegExp(`/${esc}/jobs/(\\d+)`, 'g'))) out.add(m[1]);
  } else if (provider === 'Lever') {
    for (const m of source.matchAll(new RegExp(`/${esc}/([0-9a-f-]{16,})`, 'gi'))) out.add(m[1].toLowerCase());
  } else if (provider === 'Ashby') {
    for (const m of source.matchAll(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)) out.add(m[1].toLowerCase());
  }
  return [...out];
}

/** PURE. `20230127142238` -> `2023-01-27`. */
export function dayOf(timestamp) {
  const t = String(timestamp || '');
  return /^\d{8}/.test(t) ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}` : null;
}

/**
 * PURE. Turn an ordered list of {day, ids} observations into a lifespan per job.
 *
 * The bracket is the honest part. `firstAfter` is the last day we looked and did NOT see it —
 * null when it was already there in the earliest snapshot, which means it predates the archive and
 * we must not claim otherwise. `openDaysAtLeast` counts only the span we can actually see.
 */
export function lifespans(observations, { tolerance = ABSENCE_TOLERANCE } = {}) {
  const snaps = (observations || []).filter((o) => o && o.day && Array.isArray(o.ids));
  const jobs = new Map();
  snaps.forEach((snap, index) => {
    for (const id of snap.ids) {
      if (!jobs.has(id)) {
        jobs.set(id, { id, firstAfter: index ? snaps[index - 1].day : null, firstBy: snap.day, lastSeen: snap.day, missing: 0, gone: null });
      }
      const job = jobs.get(id);
      job.lastSeen = snap.day;
      job.missing = 0;
      job.gone = null;
    }
    for (const job of jobs.values()) {
      if (snap.ids.includes(job.id) || job.gone) continue;
      job.missing += 1;
      // One absence is noise — a partial capture, a slow render. Two in a row is a closure.
      if (job.missing > tolerance) job.gone = snap.day;
    }
  });
  return [...jobs.values()].map((job) => ({
    id: job.id,
    firstAfter: job.firstAfter,
    firstBy: job.firstBy,
    lastSeen: job.lastSeen,
    closedBy: job.gone,
    predatesArchive: job.firstAfter === null,
    openDaysAtLeast: Math.max(0, Math.round((Date.parse(job.lastSeen) - Date.parse(job.firstBy)) / 86400000)),
  }));
}

/* The archive throttles. Twelve boards in a row without a pause got one answer and eleven empty
   ones — and an empty CDX reply is byte-identical to "this board was never archived". That is the
   failure this whole codebase is organised against, written into a new tool on its first outing:
   an absent observation reported as an observation of absence. So requests are spaced, retried
   once on a throttle, and a refusal is returned as a refusal. */
export const POLITE_MS = Number(process.env.DEMIGOD_ARCHIVE_DELAY_MS || 3500);
let lastCall = 0;
async function polite() {
  const wait = POLITE_MS - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

/** Returns the body, or null ONLY when the archive answered and had nothing. Throttles throw. */
async function getText(url, { retries = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    await polite();
    let res;
    try {
      res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      if (attempt >= retries) throw new Error(`archive unreachable: ${String(err.message).slice(0, 60)}`);
      continue;
    }
    if (res.ok) return res.text();
    if (res.status === 404) return null;
    if (attempt >= retries) throw new Error(`archive refused: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
}

export async function snapshots(provider, slug, { from = '2019', limit = 60 } = {}) {
  const target = boardUrl(provider, slug);
  if (!target) throw new Error(`board-history: no archive URL for ${provider}`);
  const cdx = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}`
    + `&output=json&from=${encodeURIComponent(from)}&fl=timestamp&filter=statuscode:200`
    + `&collapse=timestamp:6&limit=${limit}`;
  const raw = await getText(cdx);
  if (raw === null) return [];
  let rows;
  // A CDX body that will not parse is a broken answer, not an empty archive.
  try { rows = JSON.parse(raw); } catch { throw new Error('archive returned an unparseable index'); }
  return (rows.slice(1) || []).map((r) => r[0]).filter(Boolean);
}

export async function history(provider, slug, options = {}) {
  const stamps = await snapshots(provider, slug, options);
  const observations = [];
  for (const stamp of stamps) {
    // `id_` asks the archive for the original bytes rather than its rewritten viewer page.
    let html = null;
    try { html = await getText(`https://web.archive.org/web/${stamp}id_/https://${boardUrl(provider, slug)}`); }
    catch { continue; }  // one unavailable capture is not a finding about the board
    if (!html) continue;
    const ids = jobIdsFromHtml(provider, slug, html);
    // A snapshot that parsed to nothing is far more likely a failed capture than an empty board,
    // and treating it as empty would close every job on the board at once.
    if (!ids.length) continue;
    observations.push({ day: dayOf(stamp), ids });
  }
  const spans = lifespans(observations);
  return {
    schema: 'demigod.board-history/1',
    provider,
    slug,
    snapshots: observations.length,
    from: observations[0]?.day || null,
    to: observations[observations.length - 1]?.day || null,
    jobs: spans.length,
    predatingArchive: spans.filter((s) => s.predatesArchive).length,
    closed: spans.filter((s) => s.closedBy).length,
    spans,
  };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`board-history selftest: ${msg}`); };

  assert(boardUrl('Greenhouse', 'affirm') === 'boards.greenhouse.io/affirm', 'greenhouse url');
  assert(boardUrl('Lever', '15five') === 'jobs.lever.co/15five', 'lever url');
  assert(boardUrl('Rippling', 'x') === null && boardUrl('Greenhouse', '') === null, 'unknown provider or empty slug has no archive url');
  assert(dayOf('20230127142238') === '2023-01-27' && dayOf('nope') === null, 'timestamp to day');

  assert(jobIdsFromHtml('Greenhouse', 'affirm', '<a href="/affirm/jobs/4123">x</a><a href="/affirm/jobs/4123">dup</a>').length === 1,
    'the same job listed twice is one job');
  assert(jobIdsFromHtml('Greenhouse', 'affirm', '<a href="/other/jobs/999">x</a>').length === 0,
    'another company board on the same page is not ours');
  assert(jobIdsFromHtml('Greenhouse', 'a.b', '<a href="/a.b/jobs/7">x</a>').length === 1, 'a slug with a dot is escaped, not treated as a wildcard');

  // The bracket, which is the whole point.
  const spans = lifespans([
    { day: '2024-01-01', ids: ['a'] },
    { day: '2024-02-01', ids: ['a', 'b'] },
    { day: '2024-03-01', ids: ['a', 'b'] },
  ]);
  const a = spans.find((s) => s.id === 'a');
  const b = spans.find((s) => s.id === 'b');
  assert(a.predatesArchive && a.firstAfter === null,
    'a job present in the first snapshot predates what we can see, and must not be dated to it');
  assert(b.firstAfter === '2024-01-01' && b.firstBy === '2024-02-01',
    'a job that appears is bracketed by the last look that missed it and the first that saw it');
  assert(b.openDaysAtLeast === 29, `open time is what we can see, got ${b.openDaysAtLeast}`);
  assert(!a.closedBy && !b.closedBy, 'a job still present is not closed');

  // One absence is noise. Two is a closure.
  const flicker = lifespans([
    { day: '2024-01-01', ids: ['a'] },
    { day: '2024-02-01', ids: [] },
    { day: '2024-03-01', ids: ['a'] },
  ]);
  assert(!flicker[0].closedBy, 'a job missing from one snapshot and back in the next was never gone');
  const closed = lifespans([
    { day: '2024-01-01', ids: ['a'] },
    { day: '2024-02-01', ids: [] },
    { day: '2024-03-01', ids: [] },
  ]);
  assert(closed[0].closedBy === '2024-03-01', 'a job that stays missing is closed, dated to when we could tell');

  assert(lifespans([]).length === 0 && lifespans(null).length === 0, 'no observations, no claims');
  assert(lifespans([{ day: null, ids: ['a'] }]).length === 0, 'an undated snapshot is unusable');

  console.log(JSON.stringify({ ok: true, selftest: 'board-history' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else {
    const at = args.indexOf('--board');
    const spec = at >= 0 ? args[at + 1] : '';
    const [provider, slug] = String(spec).split(':');
    if (!provider || !slug) { console.error('usage: --board Provider:slug   (Greenhouse, Lever, Ashby)'); process.exit(2); }
    const fromAt = args.indexOf('--from');
    const report = await history(provider, slug, { from: fromAt >= 0 ? args[fromAt + 1] : '2019' });
    if (args.includes('--json')) { console.log(JSON.stringify(report, null, 1)); }
    else {
      console.log(`${provider}:${slug} · ${report.snapshots} snapshots ${report.from} → ${report.to} · ${report.jobs} jobs · ${report.closed} closed · ${report.predatingArchive} predate the archive`);
      const dated = report.spans.filter((s) => !s.predatesArchive && s.closedBy).sort((a, b) => b.openDaysAtLeast - a.openDaysAtLeast);
      for (const s of dated.slice(0, 12)) {
        console.log(`  job ${String(s.id).slice(0, 12).padEnd(13)} appeared after ${s.firstAfter} by ${s.firstBy} · closed by ${s.closedBy} · open at least ${s.openDaysAtLeast}d`);
      }
    }
  }
}
