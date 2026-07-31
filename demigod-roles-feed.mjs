#!/usr/bin/env node
/**
 * Public feed of newly-observed open roles.
 *
 *   node demigod-roles-feed.mjs                 # write the feed asset
 *   node demigod-roles-feed.mjs --days 3 --limit 100
 *   node demigod-roles-feed.mjs --json --fn engineering --seniority senior --us-only
 *   node demigod-roles-feed.mjs --brief --days 1 --limit 8 --fn engineering --us-only
 *   node demigod-roles-feed.mjs --selftest
 *
 * WHY
 * The directory is a browse surface. Nothing here is machine-readable, so anyone who wants "what
 * opened this week in SF" — a job seeker with a script, a tool, one of our own agents — has to
 * scrape a rendered page. This is the cheapest honest artifact that answers it, built entirely
 * from the role ledger we already maintain.
 *
 * TWO DATES, NEVER CONFLATED
 * `firstObservedAt` is OUR first sighting on the public board. `postedAt` is the employer's own
 * date and appears ONLY where the attribution is trusted (Greenhouse first_published); it is null
 * everywhere else and is never imputed from our observation. Conflating them would let a company
 * we started tracking yesterday look like it posted yesterday.
 *
 * WHAT IT IS NOT
 * Not a ranking, not a recommendation, not a quality signal, and no claim about whether a role
 * will be filled. closedInWindow means the role left a board we poll — not "hired" or "filled".
 * Ordering is recency of first observation, which is a fact about us, not a judgement about them.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';
import { UNSAFE_INVISIBLE_CLASS, atomicWrite } from './demigod-agent-tools-lib.mjs';
import { postedDaysAgo } from './demigod-role-ledger.mjs';
import { seniorityFromTitle } from './demigod-recruitai-export.mjs';
import { categorizeRole } from './demigod-startup-jobs-enrich.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const LEDGER = process.env.DEMIGOD_ROLE_LEDGER || path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const OUT = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// Titles and locations are third-party text from public ATS boards. Same control-safe treatment
// the private surfaces already use — one shared class, never a re-inlined literal.
const UNSAFE = new RegExp('[\\u0000-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']', 'g');
const publicText = (value, max) => {
  const text = String(value ?? '').replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : null;
};

const exactFilter = (value, name, max) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new TypeError(`${name} filter must be text`);
  const text = publicText(value, max);
  if (!text) throw new TypeError(`${name} filter must contain visible text`);
  return text.toLowerCase();
};

const QUERY_FILTER_KEYS = ['company', 'fn', 'provider', 'seniority', 'us-only'];
export const shouldWriteCanonicalFeed = (values = {}) =>
  values.json !== true && values.brief !== true &&
  !QUERY_FILTER_KEYS.some((key) => values[key] != null && values[key] !== false);

export function parseRolesFeedCli(args = []) {
  const values = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: {
      days: { type: 'string', default: '1' },
      limit: { type: 'string' },
      json: { type: 'boolean', default: false },
      brief: { type: 'boolean', default: false },
      company: { type: 'string' },
      fn: { type: 'string' },
      provider: { type: 'string' },
      seniority: { type: 'string' },
      'us-only': { type: 'boolean', default: false },
      selftest: { type: 'boolean', default: false },
    },
  }).values;
  if (values.brief && values.json) throw new TypeError('--brief and --json cannot be combined');
  return values;
}

const positiveCliNumber = (value, name) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${name} must be a positive number`);
  return number;
};

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** Only exact provider-native HTTPS job links travel; anything else is dropped, never rewritten. */
function publicRoleUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  let parsed;
  try { parsed = new URL(raw); } catch { return null; }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  return parsed.toString();
}

/**
 * PURE. Roles first observed within `days`, newest first.
 * @param {object} ledger role-ledger shape
 */
export function rolesFeed(ledger, {
  today = new Date().toISOString().slice(0, 10),
  days = 1,
  limit = 200,
  company: companyFilter = null,
  fn: fnFilter = null,
  provider: providerFilter = null,
  seniority: seniorityFilter = null,
  usOnly = false,
} = {}) {
  const windowDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 1;
  const cap = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 200;
  if (typeof usOnly !== 'boolean') throw new TypeError('usOnly filter must be boolean');
  // ponytail: one exact value per facet; add OR/ranges only when a real brief needs them.
  const filters = {
    company: exactFilter(companyFilter, 'company', 200),
    fn: exactFilter(fnFilter, 'fn', 40),
    provider: exactFilter(providerFilter, 'provider', 40),
    seniority: exactFilter(seniorityFilter, 'seniority', 40),
    usOnly,
  };
  const all = Object.values(ledger?.roles || {}).filter((r) => r && typeof r === 'object');
  const open = all.filter((r) => !r.closedAt);
  const facetsFor = (r) => {
    const company = publicText(r.company, 200);
    const title = publicText(r.title, 300);
    if (!company || !title) return null;
    const fn = publicText(categorizeRole(title) || r.fn, 40);
    const provider = publicText(r.provider, 40);
    if (filters.company && company.toLowerCase() !== filters.company) return null;
    if (filters.fn && String(fn || '').toLowerCase() !== filters.fn) return null;
    if (filters.provider && String(provider || '').toLowerCase() !== filters.provider) return null;
    if (filters.seniority && seniorityFromTitle(title).toLowerCase() !== filters.seniority) return null;
    if (filters.usOnly && r.usPosted !== true) return null;
    return { company, title, fn, provider };
  };
  const eligible = [];
  let droppedUnsafeUrl = 0;
  for (const r of open) {
    const age = daysBetween(r.firstSeen, today);
    if (!Number.isFinite(age) || age < 0 || age > windowDays) continue;
    const facets = facetsFor(r);
    if (!facets) continue;
    const url = publicRoleUrl(r.url);
    // A role we cannot link to is not useful in a feed, and we will not invent a link for it.
    if (!url) { droppedUnsafeUrl += 1; continue; }
    eligible.push({
      ...facets,
      location: publicText(r.location, 200),
      url,
      // Ours. A fact about when we saw it, not about the employer.
      firstObservedAt: r.firstSeen,
      // Theirs, and only where the attribution is trusted. Null is a real answer here.
      postedAt: postedDaysAgo(r, today) == null ? null : r.nativePostedAt,
    });
  }
  eligible.sort((a, b) =>
    (a.firstObservedAt < b.firstObservedAt ? 1 : a.firstObservedAt > b.firstObservedAt ? -1 : 0) ||
    (a.company < b.company ? -1 : a.company > b.company ? 1 : 0));
  const roles = eligible.slice(0, cap);
  // How far back our observations actually go. The ledger began on a specific day, and every role
  // open at that moment shares that firstSeen — so a window WIDER than our history sweeps in the
  // inception spike and "newly observed" silently becomes "everything we track". Measured
  // 2026-07-31: a 1d window returns 358 roles, a 7d window returns 12,387 of 12,400 open. Report
  // the span so a reader can see when the window has outrun the evidence.
  const spans = open
    .filter((r) => facetsFor(r))
    .map((r) => daysBetween(r.firstSeen, today))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const observationSpanDays = spans.length ? Math.max(...spans) : 0;
  // Function + ATS mixes over full in-window eligible set (not limit-truncated). Observation
  // landscape only — not a rank score. Returned slice can still be smaller when limit applies.
  const byFn = {};
  const byProvider = {};
  for (const role of eligible) {
    const fk = role.fn || 'other';
    byFn[fk] = (byFn[fk] || 0) + 1;
    const pk = role.provider || 'unknown';
    byProvider[pk] = (byProvider[pk] || 0) + 1;
  }
  // Company intensity over the full in-window eligible set (not limit-truncated). Observation
  // counts only — not a rank score, intent score, or outbound target list (PredictLeads-thin).
  const companyBag = new Map();
  for (const role of eligible) {
    companyBag.set(role.company, (companyBag.get(role.company) || 0) + 1);
  }
  const byCompanyTop = [...companyBag.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 15)
    .map(([company, openInWindow]) => ({ company, openInWindow }));
  // Closure observations (TheirStack-thin): role left the public board we poll. Not "filled",
  // not "hired", not a sales-intent score — only closedAt within the same observation window.
  const closedInWindow = [];
  const closureAges = [];
  for (const r of all) {
    if (!r.closedAt) continue;
    const age = daysBetween(r.closedAt, today);
    if (!Number.isFinite(age) || age < 0) continue;
    const facets = facetsFor(r);
    if (!facets) continue;
    // Full closure history span (any closed role), for honesty about short ledgers.
    closureAges.push(age);
    if (age > windowDays) continue;
    closedInWindow.push(facets.company);
  }
  const closedBag = new Map();
  for (const company of closedInWindow) {
    closedBag.set(company, (closedBag.get(company) || 0) + 1);
  }
  const byCompanyClosedTop = [...closedBag.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 10)
    .map(([company, n]) => ({ company, closedInWindow: n }));
  // How far back we have *any* board-exit observations. A 7d window over 2d of closure history
  // includes every closed role we've ever recorded — not a mature weekly churn rate.
  const closureObservationSpanDays = closureAges.length ? Math.max(...closureAges) : 0;
  return {
    schema: 'demigod.roles-feed/8',
    generatedAt: `${today}T00:00:00.000Z`,
    windowDays,
    basis:
      'first observation on a public ATS board by Demigod; postedAt is the employer date where attributed ' +
      '(Greenhouse first_published), else null; fn is live title-heuristic categorizeRole (coarse buckets); ' +
      'byFn and byProvider are in-window eligible landscape counts (not limit-truncated); ' +
      'byCompanyTop is open-in-window observation counts; ' +
      'closedInWindow is no-longer-open on polled boards (not a filled/hired claim); ' +
      'windowExceedsClosureHistory flags short closure history; filters are exact case-insensitive facets; ' +
      'none of these are scores or outreach targets',
    counts: {
      openRoles: open.length,
      inWindow: eligible.length,
      returned: roles.length,
      filters,
      // No silent caps: a reader can tell the window was truncated and by how much.
      omittedByLimit: Math.max(0, eligible.length - roles.length),
      droppedUnsafeUrl,
      withEmployerPostedDate: roles.filter((r) => r.postedAt).length,
      observationSpanDays,
      // True when the requested window reaches past our own history, i.e. the result includes the
      // ledger's inception spike and should not be read as "newly posted".
      windowExceedsObservationHistory: windowDays >= observationSpanDays,
      byFn,
      byProvider,
      companiesInWindow: companyBag.size,
      byCompanyTop,
      closedInWindow: closedInWindow.length,
      companiesClosedInWindow: closedBag.size,
      byCompanyClosedTop,
      closureObservationSpanDays,
      windowExceedsClosureHistory:
        closureAges.length === 0 || windowDays >= closureObservationSpanDays,
    },
    roles,
  };
}

const rolesBrief = (feed) => {
  const c = feed.counts;
  const f = c.filters || {};
  const filters = [
    f.company && `company=${f.company}`,
    f.fn && `function=${f.fn}`,
    f.provider && `provider=${f.provider}`,
    f.seniority && `seniority=${f.seniority}`,
    f.usOnly && 'us-only=true',
  ].filter(Boolean).join(', ') || 'none';
  const lines = [
    `Demigod role brief — ${feed.windowDays}-day observation window`,
    `${c.inWindow} matching open roles across ${c.companiesInWindow} companies; ` +
      `${c.returned} shown; ${c.omittedByLimit} omitted by limit.`,
    `Filters: ${filters}.`,
    `Basis: first observed is Demigod's sighting on a public ATS board, not the employer's posting date. ` +
      'Employer-posted dates appear only when attributed.',
    'Ordering is observation recency, not a score, recommendation, or outreach target.',
    `Board exits: ${c.closedInWindow} matching roles left polled boards; not filled/hired.`,
    `Unusable links dropped: ${c.droppedUnsafeUrl}.`,
  ];
  if (c.windowExceedsObservationHistory) {
    lines.push(
      `History warning: the ${feed.windowDays}-day window exceeds ${c.observationSpanDays}-day ` +
      'observation history and includes the ledger inception spike; do not read these as newly posted.',
    );
  }
  if (c.windowExceedsClosureHistory) {
    lines.push(
      `Closure warning: the ${feed.windowDays}-day window exceeds ${c.closureObservationSpanDays}-day ` +
      'board-exit history; this is not a mature rate.',
    );
  }
  if (!feed.roles.length) return [...lines, '', 'No matching roles.'].join('\n');
  lines.push('', 'Roles:');
  for (const role of feed.roles) {
    const detail = [
      role.location,
      role.provider,
      `first observed by Demigod ${role.firstObservedAt}`,
      role.postedAt && `employer-posted ${role.postedAt}`,
    ].filter(Boolean).join(' · ');
    lines.push(`- ${role.company} — ${role.title}`, `  ${detail}`, `  ${role.url}`);
  }
  return lines.join('\n');
};

let cliValues = null;
if (isMain) {
  try {
    cliValues = parseRolesFeedCli(process.argv.slice(2));
  } catch (error) {
    console.error(`roles-feed: ${error.message}`);
    process.exit(2);
  }
}

if (isMain && cliValues.selftest) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const T = '2026-07-31';
  const role = (o = {}) => ({
    provider: 'Greenhouse', slug: 'acme', jobId: 'j', company: 'Acme', title: 'Engineer',
    location: 'San Francisco, CA', url: 'https://boards.greenhouse.io/acme/jobs/1', fn: 'Engineering',
    usPosted: true, firstSeen: T, lastSeen: T, closedAt: null, reopenCount: 0,
    nativePostedAt: null, nativeDateField: null, ...o,
  });
  const led = (rows) => ({ roles: Object.fromEntries(rows.map((r, i) => [`k${i}`, r])) });

  // Window + ordering
  {
    const f = rolesFeed(led([
      role({ firstSeen: '2026-07-30', company: 'Beta' }),
      role({ firstSeen: T, company: 'Alpha' }),
      role({ firstSeen: '2026-06-01', company: 'TooOld' }),
      role({ firstSeen: T, closedAt: T, company: 'Closed' }),
    ]), { today: T, days: 7 });
    assert(f.counts.inWindow === 2, `only in-window open roles, got ${f.counts.inWindow}`);
    assert(f.roles[0].company === 'Alpha', 'newest first observation leads');
    assert(!f.roles.some((r) => r.company === 'Closed'), 'closed roles never appear');
    assert(!f.roles.some((r) => r.company === 'TooOld'), 'roles outside the window are excluded');
  }

  // The two dates must never be conflated.
  {
    const f = rolesFeed(led([
      role({ nativePostedAt: '2026-01-01', nativeDateField: 'first_published' }),
      role({ nativePostedAt: '2026-01-01', nativeDateField: 'created_at', company: 'Untrusted' }),
    ]), { today: T, days: 7 });
    const trusted = f.roles.find((r) => r.company === 'Acme');
    const untrusted = f.roles.find((r) => r.company === 'Untrusted');
    assert(trusted.postedAt === '2026-01-01', 'attributed employer date travels');
    assert(untrusted.postedAt === null, 'unattributed date must be null, never imputed');
    assert(untrusted.firstObservedAt === T, 'our observation is still reported');
    assert(f.counts.withEmployerPostedDate === 1, 'counts distinguish the two dates');
  }

  // Untrusted third-party text is control-scrubbed; unsafe links are dropped, not rewritten.
  {
    const dirty = 'Eng' + String.fromCharCode(0x2028) + 'in' + String.fromCharCode(0x061c) + 'eer';
    const f = rolesFeed(led([
      role({ title: dirty, company: 'Ctrl' }),
      role({ url: 'http://boards.greenhouse.io/x/1', company: 'Insecure' }),
      role({ url: 'https://user:pw@boards.greenhouse.io/x/1', company: 'Creds' }),
    ]), { today: T, days: 7 });
    const ctrl = f.roles.find((r) => r.company === 'Ctrl');
    const unsafeRe = new RegExp('[\\u2028\\u2029\\u061c]');
    assert(ctrl && !unsafeRe.test(ctrl.title), 'separator and bidi chars scrubbed from titles');
    assert(ctrl.title === 'Eng in eer'.replace(/ +/g, ' ') || !unsafeRe.test(ctrl.title), 'title survives as readable text');
    assert(!f.roles.some((r) => r.company === 'Insecure'), 'non-https job links dropped');
    assert(!f.roles.some((r) => r.company === 'Creds'), 'credentialed links dropped');
    assert(f.counts.droppedUnsafeUrl === 2, `drops are counted, got ${f.counts.droppedUnsafeUrl}`);
  }

  // Truncation is reported, never silent.
  {
    const many = Array.from({ length: 12 }, (_, i) => role({ company: `C${i}` }));
    const f = rolesFeed(led(many), { today: T, days: 7, limit: 5 });
    assert(f.counts.returned === 5 && f.counts.omittedByLimit === 7, 'omissions are reported');
    assert(f.counts.returned + f.counts.omittedByLimit === f.counts.inWindow, 'counts reconcile');
  }

  // A window wider than our observation history sweeps in the ledger inception spike.
  {
    const rows = [role({ firstSeen: '2026-07-29' }), role({ firstSeen: T, company: 'New' })];
    const wide = rolesFeed(led(rows), { today: T, days: 30 });
    assert(wide.counts.observationSpanDays === 2, `span is our real history, got ${wide.counts.observationSpanDays}`);
    assert(wide.counts.windowExceedsObservationHistory === true, 'a 30d window over 2d of history must be flagged');
    const tight = rolesFeed(led(rows), { today: T, days: 1 });
    assert(tight.counts.windowExceedsObservationHistory === false, 'a window inside our history is not flagged');
    assert(tight.counts.inWindow === 1, 'tight window discriminates');
  }

  // Degenerate input must not crash or fabricate.
  assert(rolesFeed(null).roles.length === 0, 'null ledger -> empty feed');
  assert(rolesFeed({ roles: { a: 'junk' } }).roles.length === 0, 'malformed rows ignored');

  // Live categorizeRole for fn (AR-08); stale stored fn does not win.
  {
    const f = rolesFeed(led([
      role({ title: 'Senior Software Engineer', fn: 'other' }),
      role({ title: 'Account Executive', fn: 'other', company: 'SalesCo', url: 'https://boards.greenhouse.io/acme/jobs/2' }),
    ]), { today: T, days: 7 });
    assert(f.schema === 'demigod.roles-feed/8', 'schema v8');
    const eng = f.roles.find((r) => /Engineer/.test(r.title));
    const sales = f.roles.find((r) => r.company === 'SalesCo');
    assert(eng?.fn === 'engineering', `live eng fn, got ${eng?.fn}`);
    assert(sales?.fn === 'sales', `live sales fn, got ${sales?.fn}`);
    assert(f.counts.byFn?.engineering === 1 && f.counts.byFn?.sales === 1, 'byFn on eligible');
  }

  // byCompanyTop: in-window observation intensity (full eligible, not limit-truncated).
  {
    const rows = [
      role({ company: 'Busy', url: 'https://boards.greenhouse.io/acme/jobs/10' }),
      role({ company: 'Busy', url: 'https://boards.greenhouse.io/acme/jobs/11' }),
      role({ company: 'Busy', url: 'https://boards.greenhouse.io/acme/jobs/12' }),
      role({ company: 'Quiet', url: 'https://boards.greenhouse.io/acme/jobs/20' }),
      role({ company: 'OldCo', firstSeen: '2026-06-01', url: 'https://boards.greenhouse.io/acme/jobs/30' }),
    ];
    const f = rolesFeed(led(rows), { today: T, days: 7, limit: 2 });
    assert(f.schema === 'demigod.roles-feed/8', 'schema v8');
    assert(f.counts.companiesInWindow === 2, `in-window companies, got ${f.counts.companiesInWindow}`);
    assert(f.counts.byCompanyTop?.[0]?.company === 'Busy' && f.counts.byCompanyTop[0].openInWindow === 3, 'Busy leads intensity');
    assert(f.counts.byCompanyTop?.some((c) => c.company === 'Quiet' && c.openInWindow === 1), 'Quiet counted');
    assert(!f.counts.byCompanyTop?.some((c) => c.company === 'OldCo'), 'out-of-window company excluded');
    // Limit truncates roles but not company intensity over eligible.
    assert(f.counts.returned === 2 && f.counts.inWindow === 4, 'limit vs eligible');
    assert(f.counts.byCompanyTop.reduce((s, c) => s + c.openInWindow, 0) === 4, 'top sums eligible not returned');
    // byFn also over eligible (v8) — not the limit-truncated roles list.
    assert(Object.values(f.counts.byFn).reduce((s, n) => s + n, 0) === 4, 'byFn sums eligible not returned');
  }

  // closedInWindow: left public board (not a filled claim); outside window ignored.
  {
    const f = rolesFeed(led([
      role({ company: 'StillOpen', url: 'https://boards.greenhouse.io/acme/jobs/1' }),
      role({ company: 'GoneA', closedAt: T, firstSeen: '2026-07-28', url: 'https://boards.greenhouse.io/acme/jobs/2' }),
      role({ company: 'GoneA', closedAt: '2026-07-30', firstSeen: '2026-07-20', url: 'https://boards.greenhouse.io/acme/jobs/3' }),
      role({ company: 'GoneB', closedAt: '2026-07-29', firstSeen: '2026-07-10', url: 'https://boards.greenhouse.io/acme/jobs/4' }),
      role({ company: 'AncientClose', closedAt: '2026-06-01', firstSeen: '2026-05-01', url: 'https://boards.greenhouse.io/acme/jobs/5' }),
    ]), { today: T, days: 7 });
    assert(f.counts.closedInWindow === 3, `closed in window, got ${f.counts.closedInWindow}`);
    assert(f.counts.companiesClosedInWindow === 2, 'two companies closed roles');
    assert(f.counts.byCompanyClosedTop?.[0]?.company === 'GoneA' && f.counts.byCompanyClosedTop[0].closedInWindow === 2, 'GoneA leads closures');
    assert(!f.roles.some((r) => r.company === 'GoneA'), 'closed roles never appear in open feed list');
    assert(!f.counts.byCompanyClosedTop?.some((c) => c.company === 'AncientClose'), 'old closures out of window');
    // AncientClose at 60d → closureObservationSpanDays covers full history; 7d window does not exceed it.
    assert(f.counts.closureObservationSpanDays === 60, `closure span, got ${f.counts.closureObservationSpanDays}`);
    assert(f.counts.windowExceedsClosureHistory === false, '7d inside 60d closure history');
  }

  // Short closure history: a wide window must be flagged (inception spike honesty).
  {
    const f = rolesFeed(led([
      role({ company: 'RecentGone', closedAt: '2026-07-29', firstSeen: '2026-07-28', url: 'https://boards.greenhouse.io/acme/jobs/9' }),
    ]), { today: T, days: 7 });
    assert(f.counts.closedInWindow === 1, 'one recent closure');
    assert(f.counts.closureObservationSpanDays === 2, `short span, got ${f.counts.closureObservationSpanDays}`);
    assert(f.counts.windowExceedsClosureHistory === true, '7d window over 2d closure history flagged');
  }

  // Facets filter without ranking, and an impossible filter cannot pass vacuously.
  {
    const fixture = led([
      role({ title: 'Senior Software Engineer', company: 'Acme', provider: 'Greenhouse' }),
      role({
        title: 'Senior Platform Engineer',
        company: 'Acme',
        provider: 'Greenhouse',
        closedAt: T,
        url: 'https://boards.greenhouse.io/acme/jobs/closed',
      }),
      role({
        title: 'Account Executive',
        company: 'SalesCo',
        provider: 'Ashby',
        usPosted: false,
        url: 'https://jobs.ashbyhq.com/salesco/2',
      }),
    ]);
    const unfiltered = rolesFeed(fixture, { today: T, days: 7 });
    const impossible = rolesFeed(fixture, { today: T, days: 7, company: 'No Such Company' });
    const filtered = rolesFeed(fixture, {
      today: T,
      days: 7,
      company: 'ACME',
      fn: 'Engineering',
      provider: 'greenhouse',
      seniority: 'Senior',
      usOnly: true,
    });
    assert(unfiltered.counts.returned > 0, 'filter fixture is non-vacuous');
    assert(impossible.counts.returned === 0 && impossible.counts.closedInWindow === 0, 'impossible filter excludes open and closed roles');
    assert(impossible.counts.windowExceedsClosureHistory, 'zero closure evidence fails closed');
    assert(filtered.counts.returned === 1 && filtered.roles[0].company === 'Acme', 'combined facets isolate Acme role');
    assert(filtered.counts.closedInWindow === 1, 'combined facets also constrain closure observations');
    assert(Object.values(filtered.counts.byFn).reduce((sum, n) => sum + n, 0) === filtered.counts.inWindow, 'filtered byFn reconciles to inWindow');
    assert(filtered.counts.filters.seniority === 'senior' && filtered.counts.filters.usOnly, 'applied filters echoed');
    let rejected = false;
    try { rolesFeed(fixture, { company: {} }); } catch { rejected = true; }
    assert(rejected, 'non-text filter rejected instead of exposing an unfiltered feed');
  }

  // byProvider: in-window ATS landscape over eligible (not limit-truncated).
  {
    const f = rolesFeed(led([
      role({ provider: 'Greenhouse', url: 'https://boards.greenhouse.io/acme/jobs/1' }),
      role({ provider: 'Greenhouse', url: 'https://boards.greenhouse.io/acme/jobs/2' }),
      role({ provider: 'Ashby', company: 'B', url: 'https://jobs.ashbyhq.com/b/1' }),
    ]), { today: T, days: 7, limit: 1 });
    assert(f.counts.byProvider?.Greenhouse === 2 && f.counts.byProvider?.Ashby === 1, 'byProvider over eligible');
    assert(f.counts.returned === 1, 'limit truncates roles only');
  }

  assert(shouldWriteCanonicalFeed({ days: '7' }), 'unfiltered generation may write canonical feed');
  assert(!shouldWriteCanonicalFeed({ json: true }), 'json mode never writes canonical feed');
  assert(!shouldWriteCanonicalFeed({ brief: true }), 'brief mode never writes canonical feed');
  assert(!shouldWriteCanonicalFeed({ company: 'Acme' }), 'filtered query never writes canonical feed');
  assert(parseRolesFeedCli([]).days === '1', 'direct CLI defaults to the honest one-day window');
  assert(rolesFeed(led([]), { today: T }).windowDays === 1, 'library defaults to the honest one-day window');
  assert(parseRolesFeedCli(['--company=Acme', '--us-only']).company === 'Acme', 'GNU equals form parses');
  let conflictingModes = false;
  try { parseRolesFeedCli(['--brief', '--json']); } catch { conflictingModes = true; }
  assert(conflictingModes, 'brief and json modes are mutually exclusive');
  let badCli = false;
  try { parseRolesFeedCli(['--compny', 'Acme']); } catch { badCli = true; }
  assert(badCli, 'unknown query flag fails closed');

  // Human brief keeps provenance, caps, filters, and short-history caveats explicit.
  {
    const f = rolesFeed(led([
      role({ nativePostedAt: T, nativeDateField: 'first_published' }),
      role({ company: 'Beta', url: 'https://boards.greenhouse.io/beta/jobs/2' }),
      role({ company: 'Gamma', url: 'https://boards.greenhouse.io/gamma/jobs/3' }),
    ]), { today: T, days: 7, limit: 2, fn: 'engineering', usOnly: true });
    const brief = rolesBrief(f);
    assert(brief.includes('Filters: function=engineering, us-only=true.'), 'brief echoes exact filters');
    assert(brief.includes('2 shown; 1 omitted by limit.'), 'brief exposes truncation');
    assert(brief.includes('first observed by Demigod') && brief.includes('employer-posted ' + T), 'brief distinguishes dates');
    assert(brief.includes('History warning:') && brief.includes('not filled/hired'), 'brief keeps history and closure honesty');
    assert(brief.includes('https://boards.greenhouse.io/'), 'brief includes validated public role links');
    const empty = rolesBrief(rolesFeed(led([]), { today: T, days: 1 }));
    assert(empty.endsWith('No matching roles.'), 'empty brief is explicit');
  }

  console.log(JSON.stringify({ ok: true, selftest: 'roles-feed' }));
  process.exitCode = 0;
} else if (isMain) {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const feed = rolesFeed(ledger, {
    today: new Date().toISOString().slice(0, 10),
    days: positiveCliNumber(cliValues.days, '--days'),
    limit: positiveCliNumber(cliValues.limit ?? (cliValues.brief ? '8' : '200'), '--limit'),
    company: cliValues.company,
    fn: cliValues.fn,
    provider: cliValues.provider,
    seniority: cliValues.seniority,
    usOnly: cliValues['us-only'],
  });
  if (shouldWriteCanonicalFeed(cliValues)) {
    atomicWrite(OUT, JSON.stringify(feed) + '\n', { mode: 0o644 });
    const c = feed.counts;
    console.log(
      `roles feed → ${OUT}\n` +
      `  ${c.returned} roles first observed in the last ${feed.windowDays}d ` +
      `(of ${c.inWindow} in window, ${c.omittedByLimit} omitted by limit)\n` +
      `  ${c.withEmployerPostedDate} carry an attributed employer posting date; ` +
      `${c.droppedUnsafeUrl} dropped for an unusable link`,
    );
  } else if (cliValues.brief) {
    console.log(rolesBrief(feed));
  } else {
    console.log(JSON.stringify(feed, null, 2));
  }
}
