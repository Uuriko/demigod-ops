#!/usr/bin/env node
// Mine public X/Twitter posts where SF startups say they are hiring.
//
// Same contract as demigod-hn-hiring.mjs: a company's OWN public post is the evidence. We surface
// and attribute it; we never claim it. Freeform tweets are far noisier than HN's "COMPANY | ROLE |
// LOCATION" format, so this tool deliberately does NOT try to extract structured company rows —
// it captures the post, filters for a real SF + hiring signal, dedupes, and stages for human
// triage. Surfacing is the value; parsing prose into a company record is where honesty dies.
//
// Acquisition is the live CDP Chrome (:9223), reading public search results — the same read-only
// pattern demigod-conversion-audit.mjs uses. No X API: the free tier was discontinued in Feb 2026
// and pay-per-use bills $5/1000 reads.
//
//   node demigod-x-hiring.mjs                # collect → staging file
//   node demigod-x-hiring.mjs --queries      # print the search queries, no network
//   node demigod-x-hiring.mjs --selftest     # parser + freshness tests, no network
//   node demigod-x-hiring.mjs --review       # read the staged rows for triage (no network)
//   node demigod-x-hiring.mjs --review --hiring   # only rows classified hiring=yes
//
// Out: /tmp/dg-busy/x-hiring.json — staging for human triage. Never auto-merged into
// DEMIGOD-SF-STARTUP-MAP.json and never published: the board honesty gate owns that boundary.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { CDP_URL } from './cdp-config.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { extractAtsBoards } from './demigod-roles-ats-links.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const OUT = path.join(BUSY, 'x-hiring.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// A post older than this is a company that WAS hiring, not evidence it is hiring today.
// Mirrors the 120d rule in demigod-hn-hiring.mjs, tighter because tweets move faster.
export const FRESH_DAYS = 30;

export const QUERIES = [
  '("we\'re hiring" OR "we are hiring" OR "now hiring") (SF OR "San Francisco" OR "Bay Area") (engineer OR founding) -is:retweet',
  '("join our team" OR "first engineer" OR "founding engineer") ("San Francisco" OR SF) -is:retweet',
  '("hiring our first" OR "looking to hire") (startup OR seed OR "Series A") ("San Francisco" OR SF) -is:retweet',
];

// Accounts that post other people's jobs. Their posts are not a company hiring declaration.
// Seeded from the aggregator handling already in demigod-lead-collect.mjs.
const AGGREGATORS = new Set(
  ['sfsoftwarejobs', 'jobswithsowmya', 'securityblvd', 'remoteok', 'hiringcafe', 'workatastartup',
   'ycombinator', 'levelsfyi', 'techjobsdaily', 'startupjobs'].map((s) => s.toLowerCase()),
);

const SF_RE = /\b(san francisco|bay area|\bsf\b|south bay|peninsula|silicon valley)\b/i;
const HIRING_RE = /\b(we'?re hiring|we are hiring|now hiring|join our team|hiring our first|looking to hire|founding engineer|first engineer)\b/i;
// A post that is asking FOR a job is supply, not demand — different pipeline.
const SEEKING_RE = /\b(looking for (a )?(job|role|work)|open to work|seeking (a )?(role|position)|#opentowork)\b/i;

/** Post age in days, or null when the timestamp is missing/unparseable. */
export function ageDays(postedAt, now = Date.now()) {
  const t = Date.parse(postedAt || '');
  if (!Number.isFinite(t)) return null;
  const d = (now - t) / 86400000;
  return d < 0 ? null : d; // future timestamps are not evidence
}

/** Fail closed: only a recent, dated post supports a live "is hiring" claim. */
export function isFreshPost(postedAt, now = Date.now()) {
  const d = ageDays(postedAt, now);
  return d !== null && d <= FRESH_DAYS;
}

/**
 * Classify one captured post. Returns a staged row or null.
 * Deliberately does not invent a company name or website — the handle and the post URL are the
 * only identity claims we can make honestly from a tweet.
 */
export function classifyPost(post = {}, now = Date.now()) {
  const text = String(post.text || '').trim();
  const handle = String(post.handle || '').replace(/^@/, '').toLowerCase();
  const url = String(post.url || '');
  if (!text || !handle || !/^https:\/\/(x|twitter)\.com\/[^/]+\/status\/\d+/.test(url)) return null;
  if (AGGREGATORS.has(handle)) return null;
  if (SEEKING_RE.test(text)) return null;
  if (!HIRING_RE.test(text)) return null;
  if (!SF_RE.test(text)) return null;

  const fresh = isFreshPost(post.postedAt, now);
  const atsBoards = extractAtsBoards(text);
  return {
    id: `x:${url.match(/status\/(\d+)/)[1]}`,
    handle,
    text: text.slice(0, 500),
    url,
    postedAt: post.postedAt || null,
    ageDays: ageDays(post.postedAt, now),
    // Same vocabulary as the map rows so a human merge is a copy, not a translation.
    hiring: fresh ? 'yes' : 'unknown',
    source: 'X',
    sourceUrl: url,
    sourceLicense: 'X-public',
    retrievedAt: new Date(now).toISOString().slice(0, 10),
    // Public board URLs found in the post (if any). Identity still needs map attach.
    atsBoards: atsBoards.length ? atsBoards : undefined,
    // Everything below is for the human, not a claim:
    needsReview: true,
    website: null,
    name: null,
  };
}

/* Dedupe on id AND on handle+text. Keying on id alone let one account's reposts of the same
   opening through three times as three separate leads — visible the moment --review printed
   them side by side, invisible while the rows sat in a staging JSON. Different status ids,
   identical post: for triage purposes that is one opening, not three. */
export function dedupe(rows) {
  const seenIds = new Set();
  const seenPosts = new Set();
  return rows.filter((r) => {
    if (seenIds.has(r.id)) return false;
    const body = String(r.text || '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 300);
    const postKey = `${String(r.handle || '').toLowerCase()}|${body}`;
    if (body && seenPosts.has(postKey)) return false;
    seenIds.add(r.id);
    if (body) seenPosts.add(postKey);
    return true;
  });
}

// Runs IN the page. Reads only what a person scrolling the public search page would see.
const EXTRACT_FN = `(() => {
  const arts = [...document.querySelectorAll('article')];
  return arts.slice(0, 40).map((a) => {
    const time = a.querySelector('time');
    const link = time && time.closest('a');
    const handleEl = [...a.querySelectorAll('a[href^="/"]')].map((x) => x.getAttribute('href'))
      .find((h) => /^\\/[A-Za-z0-9_]{1,15}$/.test(h));
    return {
      text: (a.innerText || '').trim(),
      handle: handleEl ? handleEl.slice(1) : null,
      postedAt: time ? time.getAttribute('datetime') : null,
      url: link ? new URL(link.getAttribute('href'), location.origin).href : null,
    };
  }).filter((p) => p.url && p.handle);
})()`;

// ponytail: CDP client duplicated from demigod-conversion-audit.mjs (~30 lines). Promote to
// demigod-agent-tools-lib.mjs if a third caller appears; not worth touching a tested file for two.
async function pickTarget() {
  const list = await (await fetch(CDP_URL + '/json/list')).json();
  const pages = (Array.isArray(list) ? list : []).filter((x) => x && x.type === 'page' && x.webSocketDebuggerUrl);
  let t =
    pages.find((x) => /(x|twitter)\.com/i.test(x.url || '')) ||
    pages.find((x) => !/webflow|grok\.com|chrome:\/\//i.test(x.url || '')) ||
    pages.find((x) => /^about:blank$/i.test(x.url || ''));
  if (!t) {
    // CDP often has only Designer tabs; open a blank page we can navigate (PUT only).
    try {
      const created = await (
        await fetch(CDP_URL + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })
      ).json();
      if (created?.webSocketDebuggerUrl) t = created;
    } catch {
      /* fall through */
    }
  }
  if (!t) t = pages[0];
  if (!t?.webSocketDebuggerUrl) {
    throw new Error('no usable page target on ' + CDP_URL + ' — run ~/agent-dev.sh up');
  }
  return t;
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map(); const waiters = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method) waiters.forEach((w) => w(m));
  });
  const ready = new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const onceEvent = (method, ms = 15000) => new Promise((res) => { const to = setTimeout(() => res(null), ms);
    const w = (m) => { if (m.method === method) { clearTimeout(to); const k = waiters.indexOf(w); if (k >= 0) waiters.splice(k, 1); res(m); } }; waiters.push(w); });
  return { ws, ready, send, onceEvent };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function collect() {
  const target = await pickTarget();
  const c = connect(target.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable'); await c.send('Runtime.enable');
  const captured = [];
  const perQuery = [];
  for (const q of QUERIES) {
    const url = 'https://x.com/search?f=live&q=' + encodeURIComponent(q);
    await c.send('Page.navigate', { url });
    await c.onceEvent('Page.loadEventFired', 15000);
    await sleep(4000); // X renders the timeline async
    const r = await c.send('Runtime.evaluate', { expression: EXTRACT_FN, returnByValue: true, awaitPromise: true });
    const posts = r.result?.result?.value;
    if (!Array.isArray(posts)) { perQuery.push({ q, error: r.result?.exceptionDetails?.text || 'eval failed', got: 0 }); continue; }
    perQuery.push({ q, got: posts.length });
    captured.push(...posts);
  }
  c.ws.close();
  return { captured, perQuery, target: target.url };
}

function selftest() {
  const now = Date.parse('2026-08-05T00:00:00Z');
  const ok = {
    text: "We're hiring a founding engineer in San Francisco. Come build with us.",
    handle: 'acmeco', postedAt: '2026-08-01T00:00:00Z',
    url: 'https://x.com/acmeco/status/1234567890',
  };
  const row = classifyPost(ok, now);
  assert(row && row.hiring === 'yes', 'fresh SF hiring post is a live claim');
  assert(row.sourceLicense === 'X-public' && row.sourceUrl === ok.url, 'provenance attributed to the post');
  assert(row.name === null && row.website === null, 'never invents company identity from prose');
  const withBoard = classifyPost({ ...ok, text: ok.text + ' https://jobs.ashbyhq.com/acme/job/1' }, now);
  assert(withBoard?.atsBoards?.length === 1 && withBoard.atsBoards[0].provider === 'Ashby', 'ATS board extracted from post text');
  assert(row.needsReview === true, 'staged rows are always human-review');

  // Freshness must actually gate — proven non-vacuous: same post, older date, different verdict.
  const stale = classifyPost({ ...ok, postedAt: '2026-01-01T00:00:00Z' }, now);
  assert(stale && stale.hiring === 'unknown', 'stale post is NOT a live hiring claim');
  assert(classifyPost({ ...ok, postedAt: null }, now).hiring === 'unknown', 'undated post is not a live claim');
  assert(classifyPost({ ...ok, postedAt: '2027-01-01T00:00:00Z' }, now).hiring === 'unknown', 'future post is not a live claim');

  // Each filter must reject on its own, or it is decoration.
  assert(classifyPost({ ...ok, text: 'We are hiring a founding engineer in Berlin.' }, now) === null, 'non-SF rejected');
  assert(classifyPost({ ...ok, text: 'Beautiful day in San Francisco.' }, now) === null, 'non-hiring rejected');
  assert(classifyPost({ ...ok, text: 'Looking for a job in San Francisco, open to work' }, now) === null, 'job-seeker post rejected');
  assert(classifyPost({ ...ok, handle: 'SFSoftwareJobs' }, now) === null, 'aggregator account rejected');
  assert(classifyPost({ ...ok, url: 'https://x.com/acmeco' }, now) === null, 'non-status URL rejected');

  assert(dedupe([row, { ...row }]).length === 1, 'dedupe by status id');
  console.log(JSON.stringify({ ok: true, selftest: 'x-hiring' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); }
  else if (args.includes('--queries')) { console.log(QUERIES.join('\n')); }
  /* The collector worked and nothing could read it. Rows land in a staging file under /tmp and
     the only flags were --selftest and --queries, so triaging 13 captured posts meant catting
     JSON by hand — which is why none of this has ever reached the site. Staging-only is the
     right policy for unverified social claims; having no way to review the staging is not.
     Read-only: prints what was captured, merges nothing, publishes nothing. */
  else if (args.includes('--review')) {
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    } catch {
      console.error(`x-hiring: no staging file at ${OUT} — run: node demigod-x-hiring.mjs`);
      process.exitCode = 1;
      doc = null;
    }
    if (doc) {
      const rows = Array.isArray(doc.rows) ? doc.rows : [];
      const onlyLive = args.includes('--hiring');
      const shown = onlyLive ? rows.filter((r) => r.hiring === 'yes') : rows;
      console.log(`x-hiring staging · captured ${doc.captured ?? '?'} · kept ${rows.length} · showing ${shown.length}`);
      console.log(`collected ${doc.at || '?'} · ${doc.note || ''}`);
      if (!shown.length) console.log('\n(nothing staged — the collector kept no rows on its last run)');
      for (const [i, r] of shown.entries()) {
        // One line of the post, whitespace collapsed. The raw text carries the rendered tweet
        // including the author block, so it is trimmed rather than printed whole.
        const snippet = String(r.text || '').replace(/\s+/g, ' ').trim().slice(0, 160);
        const age = Number.isFinite(r.ageDays) ? `${Math.round(r.ageDays)}d` : '?';
        console.log(`\n${i + 1}. @${r.handle || '?'} · ${age} old · hiring=${r.hiring || '?'}${r.needsReview ? ' · NEEDS REVIEW' : ''}`);
        console.log(`   ${snippet}`);
        console.log(`   ${r.url || r.sourceUrl || '(no url)'}  [${r.sourceLicense || 'unknown license'}]`);
      }
      console.log('\nNothing here is merged or published. Promotion to the site is a human decision.');
    }
  }
  else {
    fs.mkdirSync(BUSY, { recursive: true });
    const errPath = path.join(BUSY, 'x-hiring-last-error.json');
    try {
      const { captured, perQuery, target } = await collect();
      const rows = dedupe(captured.map((p) => classifyPost(p)).filter(Boolean));
      const out = {
        schema: 'demigod.x-hiring/1',
        at: new Date().toISOString(),
        ok: true,
        target,
        perQuery,
        captured: captured.length,
        kept: rows.length,
        freshDays: FRESH_DAYS,
        note: 'Staging only. Human triage before any map merge or publish.',
        rows,
      };
      atomicWrite(OUT, JSON.stringify(out, null, 2));
      try { fs.unlinkSync(errPath); } catch { /* no prior error */ }
      console.log(`x-hiring · captured=${captured.length} kept=${rows.length} live=${rows.filter((r) => r.hiring === 'yes').length} · ${OUT}`);
    } catch (e) {
      // Keep prior x-hiring.json staging; record failure for status/pipeline honesty.
      const fail = {
        schema: 'demigod.x-hiring-error/1',
        at: new Date().toISOString(),
        ok: false,
        error: String(e?.message || e),
        note: 'Collect failed; prior staging left intact. Staging only — no map merge.',
      };
      atomicWrite(errPath, JSON.stringify(fail, null, 2));
      console.error(`x-hiring · fail · ${fail.error} · ${errPath}`);
      process.exit(1);
    }
  }
}
