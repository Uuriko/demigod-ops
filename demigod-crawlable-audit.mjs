#!/usr/bin/env node
/**
 * demigod-crawlable-audit — what an AI crawler actually receives, per route, as a number.
 *
 * WHY
 * GPTBot, ClaudeBot, PerplexityBot and the rest do not execute JavaScript. They issue one request,
 * read the HTML that comes back, and move on. Everything this site says is painted by
 * demigod-foot-core.js after load, so on 2026-08-17 fetching as GPTBot returned 590 characters for
 * /how, 590 for /faq and 591 for /blog — a page title and one boilerplate sentence — against 15,036
 * for /startups, the only route with a pre-rendered fragment.
 *
 * That is measurable, and it was never measured. site-health reported the symptom for weeks ("24
 * routes serve the same 576 characters") without anyone connecting it to AI discovery, because a
 * sentence in a log is not a tracked number.
 *
 * WHAT THIS IS NOT
 * Not a gate that fails the suite. Today's live state is red for a reason no local edit can clear —
 * the fragments exist and are staged, and only an authorized publish moves them. A check that stays
 * red until somebody else acts is a check people learn to skip, which is how site-health ended up
 * running by hand or never. The selftest IS wired, because the measuring logic can be wrong in ways
 * that no publish would fix.
 *
 *   node demigod-crawlable-audit.mjs               # live audit + receipt
 *   node demigod-crawlable-audit.mjs --json
 *   node demigod-crawlable-audit.mjs --selftest
 *
 * Schema: demigod.crawlable-audit/1
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const SITE = process.env.DEMIGOD_SITE || 'https://www.trydemigod.com';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Named so the receipt says which crawler's view was recorded, rather than "a fetch". */
export const CRAWLER_UA = 'GPTBot/1.0 (+https://openai.com/gptbot)';

/**
 * The floor a route must clear to be saying anything of its own.
 *
 * Not a guess. Fetched as GPTBot on 2026-08-17, every thin route returns the same thing: a page
 * title, one shared meta description, the nav menu and two email fallbacks — 590 characters for
 * /faq, 590 for /how, 591 for /blog, 592 for /about, and so on to 606. The only text that differs
 * between them is the title. A route that clears 900 is saying something the others are not; a
 * route at 590 is a nav bar with a heading on top.
 */
export const MIN_CRAWLABLE_CHARS = 900;

/**
 * PURE. Text with the leading page title removed, so routes can be compared on what they actually
 * say rather than on what they are called.
 *
 * Without this, nine routes serving byte-identical boilerplate look distinct because one says
 * "FAQ · Demigod" and the next says "How · Demigod". That is how a 24-route duplication went
 * unnoticed: at a glance the strings differ.
 */
export function bodyText(text, title = '') {
  const value = String(text || '');
  const head = String(title || '').trim();
  return (head && value.startsWith(head) ? value.slice(head.length) : value).trim();
}

export const AUDITED_ROUTES = [
  '/', '/how', '/faq', '/pricing', '/hire', '/talent', '/about',
  '/blog', '/startups', '/legal', '/refer', '/sample', '/press', '/contact', '/private',
];

/** PURE. The visible text a non-rendering crawler would read. */
export function crawlableText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * PURE. Routes serving byte-identical crawlable text, grouped.
 *
 * Duplication is the specific defect: 24 routes sharing 576 characters means a crawler sees one
 * page wearing 24 URLs, and every one of them is a near-duplicate of the others.
 */
export function duplicateGroups(rows = []) {
  const byText = new Map();
  for (const row of rows) {
    if (typeof row?.crawlableText !== 'string' || !row.crawlableText) continue;
    const key = bodyText(row.crawlableText, row.title);
    if (!key) continue;
    const list = byText.get(key) || [];
    list.push(row.route);
    byText.set(key, list);
  }
  return [...byText.values()]
    .filter((routes) => routes.length > 1)
    .map((routes) => routes.slice().sort())
    .sort((a, b) => b.length - a.length);
}

/** PURE. Routes below the floor — saying a title and nothing else. */
export function belowFloor(rows = [], min = MIN_CRAWLABLE_CHARS) {
  return rows
    .filter((row) => Number.isInteger(row?.chars) && row.chars < min)
    .map((row) => ({ route: row.route, chars: row.chars }))
    .sort((a, b) => a.chars - b.chars);
}

/** PURE. The report, so the shape can be tested without a network. */
export function summarize(rows = [], { min = MIN_CRAWLABLE_CHARS, at = null } = {}) {
  const measured = rows.filter((row) => Number.isInteger(row?.chars));
  return {
    schema: 'demigod.crawlable-audit/1',
    at,
    userAgent: CRAWLER_UA,
    routes: measured.length,
    // Absence of evidence is not evidence of absence: a route we could not fetch is reported as
    // unreachable rather than counted as an empty page.
    unreachable: rows.filter((row) => !Number.isInteger(row?.chars)).map((row) => row.route),
    totalCrawlableChars: measured.reduce((sum, row) => sum + row.chars, 0),
    medianCrawlableChars: measured.length
      ? measured.map((row) => row.chars).sort((a, b) => a - b)[Math.floor(measured.length / 2)]
      : 0,
    floor: min,
    belowFloor: belowFloor(measured, min),
    duplicateGroups: duplicateGroups(rows),
    rows: measured.map(({ route, bytes, chars }) => ({ route, bytes, chars })).sort((a, b) => b.chars - a.chars),
  };
}

async function fetchRoute(route, { base = SITE, userAgent = CRAWLER_UA } = {}) {
  try {
    const response = await fetch(base + route, { headers: { 'User-Agent': userAgent }, redirect: 'follow' });
    if (!response.ok) return { route, status: response.status };
    const html = await response.text();
    const text = crawlableText(html);
    const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim() || '';
    return { route, status: response.status, title, bytes: Buffer.byteLength(html), chars: text.length, crawlableText: text };
  } catch (error) {
    return { route, error: String(error?.message || error).slice(0, 80) };
  }
}

export async function auditLive({ base = SITE, routes = AUDITED_ROUTES, userAgent = CRAWLER_UA } = {}) {
  const rows = await Promise.all(routes.map((route) => fetchRoute(route, { base, userAgent })));
  return summarize(rows, { at: new Date().toISOString() });
}

/**
 * PURE. One durable line per day: what a crawler could read, and on how many routes.
 *
 * The receipt in /tmp answers "what is it now" and dies at reboot. This answers "did the work
 * matter", which is the only question worth asking after a publish — the fragments are built and
 * staged, and the number they are supposed to move is 590 characters on nine routes. Without a
 * before, the after proves nothing.
 *
 * One row per day, first write wins, same rule the hiring history uses. A re-run on the same day
 * must not overwrite the morning's measurement with the afternoon's.
 */
export function historyRow(report) {
  return {
    schema: 'demigod.crawlable-history/1',
    date: String(report?.at || '').slice(0, 10),
    userAgent: report?.userAgent || null,
    routes: report?.routes ?? 0,
    totalCrawlableChars: report?.totalCrawlableChars ?? 0,
    medianCrawlableChars: report?.medianCrawlableChars ?? 0,
    belowFloor: (report?.belowFloor || []).length,
    largestDuplicateGroup: (report?.duplicateGroups || [])[0]?.length || 0,
    perRoute: Object.fromEntries((report?.rows || []).map((row) => [row.route, row.chars])),
  };
}

export function appendHistory(report, { file = path.join(ROOT, 'DEMIGOD-CRAWLABLE-HISTORY.jsonl') } = {}) {
  const row = historyRow(report);
  if (!row.date) return { written: false, reason: 'no measurement date' };
  let existing = [];
  try {
    existing = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch { /* first run */ }
  if (existing.some((entry) => entry?.date === row.date)) {
    return { written: false, reason: `a measurement for ${row.date} already exists`, rows: existing.length };
  }
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`, { mode: 0o644 });
  return { written: true, date: row.date, rows: existing.length + 1, file };
}

/**
 * PURE. What a route would measure if its staged fragment were pasted into the live page.
 *
 * "We built fragments" is not a result. The claim worth making before anyone publishes is "this
 * fragment turns /faq from 590 characters into N", and that is checkable now: take the HTML the
 * site actually serves, insert the fragment where a Webflow page embed would land, and measure the
 * same way. It over-estimates nothing — the fragment is the exact bytes staged.
 */
export function projectWithFragment(liveHtml, fragmentHtml) {
  const live = String(liveHtml || '');
  const fragment = String(fragmentHtml || '');
  const before = crawlableText(live).length;
  if (!fragment) return { before, after: before, gain: 0 };
  const merged = /<\/body>/i.test(live) ? live.replace(/<\/body>/i, `${fragment}</body>`) : live + fragment;
  const after = crawlableText(merged).length;
  return { before, after, gain: after - before };
}

/** Route → staged package directory name, for the routes whose copy lives in DG_PAGES. */
export const STAGED_ROUTE_KEYS = {
  '/how': 'how', '/faq': 'faq', '/about': 'about', '/hire': 'hire', '/talent': 'talent',
  '/blog': 'blog', '/legal': 'legal', '/refer': 'refer', '/sample': 'sample',
  '/press': 'press', '/private': 'private', '/contact': 'contact', '/pricing': 'pricing',
};

export async function simulateStaged({ base = SITE, busy = BUSY, userAgent = CRAWLER_UA } = {}) {
  const rows = [];
  for (const [route, key] of Object.entries(STAGED_ROUTE_KEYS)) {
    const file = path.join(busy, 'route-paste', key, `dg-static-${key}.html`);
    let fragment = null;
    try { fragment = fs.readFileSync(file, 'utf8'); } catch { /* not staged */ }
    if (!fragment) { rows.push({ route, staged: false }); continue; }
    const live = await fetchRoute(route, { base, userAgent });
    if (!Number.isInteger(live.chars)) { rows.push({ route, staged: true, unreachable: true }); continue; }
    const projected = projectWithFragment(live.crawlableText ? live.crawlableText : '', fragment);
    // fetchRoute hands back stripped text, so re-measure against the raw HTML for an honest merge.
    const raw = await fetch(base + route, { headers: { 'User-Agent': userAgent } }).then((r) => r.text()).catch(() => '');
    const merged = projectWithFragment(raw, fragment);
    rows.push({ route, staged: true, before: merged.before || projected.before, after: merged.after, gain: merged.gain });
  }
  const measured = rows.filter((row) => Number.isInteger(row?.gain));
  return {
    schema: 'demigod.crawlable-simulation/1',
    at: new Date().toISOString(),
    routes: measured.length,
    notStaged: rows.filter((row) => row.staged === false).map((row) => row.route),
    unreachable: rows.filter((row) => row.unreachable).map((row) => row.route),
    totalBefore: measured.reduce((sum, row) => sum + row.before, 0),
    totalAfter: measured.reduce((sum, row) => sum + row.after, 0),
    rows: measured.sort((a, b) => b.gain - a.gain),
  };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`crawlable-audit selftest: ${msg}`); };
  assert(crawlableText('<p>Hello</p><script>var x=1;</script>') === 'Hello', 'script bodies are not readable text');
  assert(crawlableText('<style>p{}</style><p>Hi</p>') === 'Hi', 'style bodies are not readable text');
  assert(crawlableText('<!-- note --><p>Hi</p>') === 'Hi', 'comments are not readable text');
  assert(crawlableText(null) === '', 'nothing in, nothing out');

  const rows = [
    { route: '/a', bytes: 100, chars: 4, crawlableText: 'same' },
    { route: '/b', bytes: 100, chars: 4, crawlableText: 'same' },
    { route: '/c', bytes: 100, chars: 4, crawlableText: 'same' },
    { route: '/d', bytes: 900, chars: 600, crawlableText: 'a'.repeat(600) },
    { route: '/e', error: 'fetch failed' },
  ];
  const groups = duplicateGroups(rows);
  assert(groups.length === 1 && groups[0].join(',') === '/a,/b,/c', `duplicates not grouped: ${JSON.stringify(groups)}`);
  // The case that hid the live defect: identical bodies behind different titles.
  const titled = duplicateGroups([
    { route: '/faq', title: 'FAQ · Demigod', crawlableText: 'FAQ · Demigod Demigod matches SF Bay startups' },
    { route: '/how', title: 'How · Demigod', crawlableText: 'How · Demigod Demigod matches SF Bay startups' },
  ]);
  assert(titled.length === 1 && titled[0].join(',') === '/faq,/how',
    'routes whose only difference is the page title are duplicates');
  assert(bodyText('FAQ · Demigod rest of it', 'FAQ · Demigod') === 'rest of it', 'the title comes off the front');
  assert(bodyText('no title here', 'Other') === 'no title here', 'a title that does not lead is left alone');
  assert(duplicateGroups([{ route: '/x', crawlableText: 'one' }]).length === 0, 'a lone route is not a duplicate');

  const low = belowFloor(rows.filter((row) => Number.isInteger(row.chars)), 500);
  assert(low.length === 3 && low[0].chars === 4, `floor breach not detected: ${JSON.stringify(low)}`);
  assert(!low.some((row) => row.route === '/d'), 'a route above the floor must not be reported');
  // The live shape: 590 characters of shared boilerplate must breach the real floor.
  assert(belowFloor([{ route: '/faq', chars: 590 }]).length === 1, 'a boilerplate-only route breaches the floor');
  assert(belowFloor([{ route: '/hire', chars: 1071 }]).length === 0, 'a route with real copy clears it');

  const report = summarize(rows, { min: 500, at: '2026-08-17T00:00:00.000Z' });
  assert(report.routes === 4, `measured routes ${report.routes}`);
  assert(report.unreachable.join(',') === '/e', 'an unreachable route is named, not counted as empty');
  assert(report.totalCrawlableChars === 612, `total ${report.totalCrawlableChars}`);
  assert(report.rows[0].route === '/d', 'rows sort richest first');
  assert(report.userAgent === CRAWLER_UA, 'the receipt must say whose view this is');

  // What a fragment would do, before anyone publishes it.
  const live = '<html><body><p>Nav only</p></body></html>';
  const projected = projectWithFragment(live, '<section><p>Real copy that a crawler can read.</p></section>');
  assert(projected.before === 8, `before ${projected.before}`);
  assert(projected.after > projected.before, 'a fragment must raise the readable text');
  assert(projected.gain === projected.after - projected.before, 'gain is the difference, not a guess');
  assert(projectWithFragment(live, '').gain === 0, 'no fragment, no gain claimed');
  const noBody = projectWithFragment('<p>Nav only</p>', '<section><p>Copy</p></section>');
  assert(noBody.gain > 0, 'a page with no </body> still merges rather than silently returning zero');

  // The durable line. A re-run on the same day must not overwrite the earlier measurement, or the
  // history stops being a before-and-after and becomes whatever ran last.
  const row = historyRow(report);
  assert(row.date === '2026-08-17', `history row date ${row.date}`);
  assert(row.totalCrawlableChars === 612 && row.routes === 4, 'the row carries the run it describes');
  assert(row.perRoute['/d'] === 600, 'per-route numbers survive so a single page can be tracked');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-crawl-hist-'));
  try {
    const file = path.join(tmp, 'history.jsonl');
    assert(appendHistory(report, { file }).written === true, 'the first measurement of a day is written');
    const second = appendHistory(report, { file });
    assert(second.written === false && /already exists/.test(second.reason), 'the second is refused');
    assert(fs.readFileSync(file, 'utf8').trim().split('\n').length === 1, 'and leaves one line, not two');
    const later = appendHistory({ ...report, at: '2026-08-18T00:00:00.000Z' }, { file });
    assert(later.written === true && later.rows === 2, 'a new day appends');
    assert(appendHistory({ at: '' }, { file }).written === false, 'a measurement with no date is not history');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: true, selftest: 'crawlable-audit' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
  } else if (args.includes('--simulate')) {
    const report = await simulateStaged();
    console.log(`crawlable simulation · ${report.routes} staged routes, live HTML + staged fragment`);
    for (const row of report.rows) {
      console.log(`  ${String(row.before).padStart(6)} → ${String(row.after).padStart(6)}  (+${row.gain})  ${row.route}`);
    }
    console.log(`  total ${report.totalBefore} → ${report.totalAfter} (+${report.totalAfter - report.totalBefore})`);
    if (report.notStaged.length) console.log(`  not staged: ${report.notStaged.join(', ')}`);
    if (report.unreachable.length) console.log(`  unreachable: ${report.unreachable.join(', ')}`);
  } else {
    const report = await auditLive();
    fs.mkdirSync(BUSY, { recursive: true });
    const out = path.join(BUSY, 'crawlable-audit.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    const history = appendHistory(report);
    if (args.includes('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`crawlable-audit · ${report.routes} routes as ${report.userAgent.split('/')[0]}`);
      for (const row of report.rows) console.log(`  ${String(row.chars).padStart(6)} chars  ${row.route}`);
      if (report.belowFloor.length) {
        console.log(`  below the ${report.floor}-character floor: ${report.belowFloor.map((row) => `${row.route}(${row.chars})`).join(', ')}`);
      }
      for (const group of report.duplicateGroups) {
        console.log(`  identical crawlable text on ${group.length} routes: ${group.join(', ')}`);
      }
      if (report.unreachable.length) console.log(`  unreachable: ${report.unreachable.join(', ')}`);
      console.log(`  receipt: ${out}`);
      console.log(history.written ? `  history: +1 row (${history.rows} total)` : `  history: ${history.reason}`);
    }
  }
}
