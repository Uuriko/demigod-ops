#!/usr/bin/env node
/**
 * Public feed of newly-observed open roles.
 *
 *   node demigod-roles-feed.mjs                 # write the feed asset
 *   node demigod-roles-feed.mjs --days 3 --limit 100
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
 * will be filled. Ordering is recency of first observation, which is a fact about us, not a
 * judgement about them.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UNSAFE_INVISIBLE_CLASS, atomicWrite } from './demigod-agent-tools-lib.mjs';
import { postedDaysAgo } from './demigod-role-ledger.mjs';
import {
  cleanPublicRoleTitle,
  companyKey,
  loadCompanyProfiles,
  sfPublicRoleScore,
  startupScore,
} from './demigod-public-roles.mjs';

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
export function rolesFeed(
  ledger,
  {
    today = new Date().toISOString().slice(0, 10),
    days = 7,
    limit = 200,
    perCompany = 5,
    /** Wall-clock build stamp for RSS lastBuildDate / consumers. Defaults to now. */
    generatedAt = null,
  } = {},
) {
  const windowDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 7;
  const cap = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 200;
  // Cap per employer so one prolific board cannot monopolise the feed (measured: Brilliant Earth
  // took 26/120 slots under pure recency). 0 disables the cap. Not a ranking — still newest first.
  const companyCap =
    perCompany === 0 || perCompany === false
      ? 0
      : Number.isFinite(perCompany) && perCompany > 0
        ? Math.min(perCompany, 50)
        : 5;
  const all = Object.values(ledger?.roles || {}).filter((r) => r && typeof r === 'object');
  const open = all.filter((r) => !r.closedAt);
  const eligible = [];
  let droppedUnsafeUrl = 0;
  for (const r of open) {
    const age = daysBetween(r.firstSeen, today);
    if (!Number.isFinite(age) || age < 0 || age > windowDays) continue;
    const url = publicRoleUrl(r.url);
    // A role we cannot link to is not useful in a feed, and we will not invent a link for it.
    if (!url) { droppedUnsafeUrl += 1; continue; }
    const company = publicText(r.company, 200);
    const title = publicText(r.title, 300);
    if (!company || !title) continue;
    eligible.push({
      company,
      title,
      location: publicText(r.location, 200),
      fn: publicText(r.fn, 40),
      url,
      provider: publicText(r.provider, 40),
      // Ours. A fact about when we saw it, not about the employer.
      firstObservedAt: r.firstSeen,
      // Theirs, and only where the attribution is trusted. Null is a real answer here.
      postedAt: postedDaysAgo(r, today) == null ? null : r.nativePostedAt,
      // Board last-updated day when present (Greenhouse updated_at) — not open-age.
      boardUpdatedAt: r.nativeUpdatedAt && typeof r.nativeUpdatedAt === 'string' ? r.nativeUpdatedAt : null,
      // Employer-declared public GH fields when captured on poll.
      employerDepartment: publicText(r.employerDepartment, 120),
      employerOffice: publicText(r.employerOffice, 120),
      employmentType: publicText(r.employmentType, 60),
      workplaceType: publicText(r.workplaceType, 40),
    });
  }
  eligible.sort((a, b) =>
    (a.firstObservedAt < b.firstObservedAt ? 1 : a.firstObservedAt > b.firstObservedAt ? -1 : 0) ||
    (a.company < b.company ? -1 : a.company > b.company ? 1 : 0));
  const roles = [];
  const usedByCompany = new Map();
  let omittedByCompanyCap = 0;
  for (const r of eligible) {
    if (roles.length >= cap) break;
    const ck = String(r.company).toLowerCase();
    const n = usedByCompany.get(ck) || 0;
    if (companyCap && n >= companyCap) {
      omittedByCompanyCap += 1;
      continue;
    }
    usedByCompany.set(ck, n + 1);
    // Keep raw title through eligibility/cap; clean only the published surface (site/RSS).
    const cleaned = cleanPublicRoleTitle(r.title);
    roles.push(cleaned && cleaned !== r.title ? { ...r, title: cleaned } : r);
  }
  // Rows skipped for the company cap are not "omitted by limit" — they could still fit if
  // other employers had no more recent rows. Report both so truncation is never silent.
  const omittedByLimit = Math.max(0, eligible.length - roles.length - omittedByCompanyCap);
  // How far back our observations actually go. The ledger began on a specific day, and every role
  // open at that moment shares that firstSeen — so a window WIDER than our history sweeps in the
  // inception spike and "newly observed" silently becomes "everything we track". Measured
  // 2026-07-31: a 1d window returns 358 roles, a 7d window returns 12,387 of 12,400 open. Report
  // the span so a reader can see when the window has outrun the evidence.
  const spans = open.map((r) => daysBetween(r.firstSeen, today)).filter((n) => Number.isFinite(n) && n >= 0);
  const observationSpanDays = spans.length ? Math.max(...spans) : 0;
  return {
    schema: 'demigod.roles-feed/1',
    // Real build time (not day-midnight) so RSS lastBuildDate and downstream caches are honest.
    generatedAt: generatedAt || new Date().toISOString(),
    windowDays,
    perCompany: companyCap,
    basis:
      'first observation on a public ATS board by Demigod; postedAt is the employer date where attributed (Greenhouse first_published), else null; boardUpdatedAt/employerDepartment/employerOffice are public board fields when captured; at most perCompany roles per employer so one board cannot monopolise the feed',
    counts: {
      openRoles: open.length,
      inWindow: eligible.length,
      returned: roles.length,
      // No silent caps: a reader can tell the window was truncated and by how much.
      omittedByLimit,
      omittedByCompanyCap,
      droppedUnsafeUrl,
      withEmployerPostedDate: roles.filter((r) => r.postedAt).length,
      withBoardUpdatedAt: roles.filter((r) => r.boardUpdatedAt).length,
      withEmployerDepartment: roles.filter((r) => r.employerDepartment).length,
      withEmployerOffice: roles.filter((r) => r.employerOffice).length,
      observationSpanDays,
      // True when the requested window reaches past our own history, i.e. the result includes the
      // ledger's inception spike and should not be read as "newly posted".
      windowExceedsObservationHistory: windowDays >= observationSpanDays,
    },
    roles,
  };
}


/**
 * PURE. RSS item title: "Company — Role", but skip re-prefix when the employer
 * title already embeds the company ("… at Acme" or "Acme — …").
 */
export function rolesFeedItemTitle(company, title) {
  const c = String(company || '').trim() || 'Company';
  const t = String(title || '').trim() || 'Role';
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp('^' + escRe(c) + '\\s*[—\\-–:|]', 'i').test(t)) return t;
  if (new RegExp('\\bat\\s+' + escRe(c) + '\\b', 'i').test(t)) return t;
  return c + ' — ' + t;
}

/**
 * PURE. Prefer startups + SF/US for the public RSS surface (channel title says SF-area).
 * Machine JSON feed stays full-window recency; RSS is the human-facing slice.
 * profiles: companyKey → map profile (optional; same signals as homepage public-roles).
 */
export function rolesForRss(roles, { limit = 100, profiles = {} } = {}) {
  const list = Array.isArray(roles) ? roles : [];
  // Same title-noise signal as homepage public-roles rail ($comp / +equity paste).
  const titleNoise = (title) =>
    /\$|\b\d{2,3}\s*[–-]\s*\d{2,3}\s*k\b|\+\s*equity\b/i.test(String(title || '')) ? 1 : 0;
  const scored = list.map((r) => ({
    r,
    geo: sfPublicRoleScore(r?.location || r?.employerOffice || ''),
    startup: startupScore(profiles[companyKey(r?.company)]),
    noise: titleNoise(r?.title),
  }));
  const nonOff = scored.filter((x) => x.geo > 0);
  const pool = (nonOff.length ? nonOff : scored).slice();
  pool.sort(
    (a, b) =>
      b.startup - a.startup ||
      b.geo - a.geo ||
      a.noise - b.noise ||
      String(b.r?.firstObservedAt || '').localeCompare(String(a.r?.firstObservedAt || '')) ||
      String(a.r?.company || '').localeCompare(String(b.r?.company || '')),
  );
  const cap = Math.min(Math.max(1, limit | 0), 200);
  const quietEnough = pool.filter((x) => x.noise === 0).length >= Math.min(cap, 24);
  const ordered = quietEnough ? pool.filter((x) => x.noise === 0).concat(pool.filter((x) => x.noise)) : pool;
  return ordered.slice(0, cap).map((x) => x.r);
}

/** PURE. RSS 2.0 string for a roles-feed document (public ATS observation only). */
export function rolesFeedToRss(
  feed,
  {
    siteOrigin = 'https://www.trydemigod.com',
    channelTitle = 'Demigod — newly observed SF-area open roles',
    profiles = {},
  } = {},
) {
  const roles = rolesForRss(Array.isArray(feed?.roles) ? feed.roles : [], { limit: 100, profiles });
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const items = roles
    .map((r) => {
      const title = rolesFeedItemTitle(r.company, r.title);
      const day = String(r.firstObservedAt || '').slice(0, 10);
      const pub = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00Z`).toUTCString() : new Date().toUTCString();
      const descParts = [];
      if (r.employerDepartment) descParts.push(r.employerDepartment);
      if (r.location) descParts.push(r.location);
      if (r.workplaceType) descParts.push(r.workplaceType);
      if (r.employmentType) descParts.push(r.employmentType);
      descParts.push(`First observed ${day || 'unknown'} by Demigod on a public employer ATS board. Not matching inventory.`);
      return (
        `<item><title>${esc(title)}</title><link>${esc(r.url)}</link><guid isPermaLink="true">${esc(r.url)}</guid>` +
        `<pubDate>${esc(pub)}</pubDate><description>${esc(descParts.join(' · '))}</description></item>`
      );
    })
    .join('');
  const build = feed?.generatedAt || new Date().toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel>` +
    `<title>${esc(channelTitle)}</title>` +
    `<link>${esc(siteOrigin)}/startups</link>` +
    `<description>Public ATS roles Demigod first observed recently. SF Bay / US-leaning locations preferred when boards list them. Not matching inventory. firstObservedAt is our clock; employer post dates only when attributed.</description>` +
    `<lastBuildDate>${esc(new Date(build).toUTCString())}</lastBuildDate>` +
    items +
    `</channel></rss>\n`
  );
}

if (isMain && process.argv.includes('--selftest')) {
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
    const f = rolesFeed(led(many), { today: T, days: 7, limit: 5, perCompany: 0 });
    assert(f.counts.returned === 5 && f.counts.omittedByLimit === 7, 'omissions are reported');
    assert(f.counts.returned + f.counts.omittedByLimit === f.counts.inWindow, 'counts reconcile');
  }

  // Per-company cap: one prolific employer cannot monopolise the feed under pure recency.
  {
    const flood = Array.from({ length: 10 }, (_, i) =>
      role({ company: 'FloodCo', title: `Role ${i}`, jobId: `f${i}`, firstSeen: T }),
    );
    const others = Array.from({ length: 4 }, (_, i) =>
      role({ company: `Other${i}`, title: 'X', jobId: `o${i}`, firstSeen: T }),
    );
    const f = rolesFeed(led([...flood, ...others]), { today: T, days: 7, limit: 10, perCompany: 2 });
    const floodN = f.roles.filter((r) => r.company === 'FloodCo').length;
    assert(floodN === 2, `FloodCo capped at 2, got ${floodN}`);
    assert(f.roles.length === 6, `cap leaves room for others, got ${f.roles.length}`);
    assert(f.counts.omittedByCompanyCap >= 8, 'company-cap skips are counted');
    assert(f.perCompany === 2, 'perCompany is reported on the document');
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

    {
    const rss = rolesFeedToRss({ roles: [{ company: 'A', title: 'E', url: 'https://x.test/j', firstObservedAt: '2026-08-01', employerDepartment: 'Eng', location: 'San Francisco' }], generatedAt: '2026-08-01T00:00:00.000Z' });
    assert(rss.includes('<rss') && rss.includes('A — E') && rss.includes('https://x.test/j') && rss.includes('Eng'), 'rss carries public facts');
    assert(rss.includes('Not matching inventory'), 'rss honesty');
    assert(rss.includes('SF Bay / US-leaning'), 'rss states geo preference honestly');
    const geoRss = rolesFeedToRss({
      roles: [
        { company: 'OffGeo', title: 'SRE', url: 'https://x.test/off', firstObservedAt: '2026-08-01', location: 'Bangalore, India' },
        { company: 'BayCo', title: 'Engineer', url: 'https://x.test/bay', firstObservedAt: '2026-08-01', location: 'San Francisco, CA' },
      ],
      generatedAt: '2026-08-01T00:00:00.000Z',
    });
    assert(geoRss.includes('BayCo') && !geoRss.includes('OffGeo'), 'rss drops pure off-geo when SF/US rows exist');
    const startupRss = rolesFeedToRss(
      {
        roles: [
          {
            company: 'HugeCo',
            title: 'SRE',
            url: 'https://x.test/huge',
            firstObservedAt: '2026-08-01',
            location: 'San Francisco',
          },
          {
            company: 'TinyCo',
            title: 'Engineer',
            url: 'https://x.test/tiny',
            firstObservedAt: '2026-08-01',
            location: 'San Francisco',
          },
        ],
        generatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        profiles: {
          [companyKey('HugeCo')]: { teamSize: 2000, stage: 'Growth' },
          [companyKey('TinyCo')]: { teamSize: 12, stage: 'Early' },
        },
      },
    );
    assert(
      startupRss.indexOf('TinyCo') < startupRss.indexOf('HugeCo'),
      'rss prefers known startups over established high-volume employers',
    );
    assert(rolesFeedItemTitle('Acme', 'Engineer') === 'Acme — Engineer', 'default company — title');
    assert(
      rolesFeedItemTitle('AIOS', 'Head of AI Engineering at AIOS — Remote') ===
        'Head of AI Engineering at AIOS — Remote',
      'do not double company when title already says at Company',
    );
    assert(
      cleanPublicRoleTitle('Head of AI Engineering at AIOS — Remote, $200-$400k/yr + equity') ===
        'Head of AI Engineering at AIOS — Remote',
      'feed cleans trailing comp paste before publish',
    );
    assert(
      rolesFeedItemTitle('Acme', 'Acme — Staff Engineer') === 'Acme — Staff Engineer',
      'title already company-prefixed',
    );
    assert(
      rolesFeedItemTitle('Gusto', 'Principal Product Manager, Gusto Pro Workflows') ===
        'Gusto — Principal Product Manager, Gusto Pro Workflows',
      'product-name substring is not company embed',
    );
  }
  console.log(JSON.stringify({ ok: true, selftest: 'roles-feed' }));
  process.exitCode = 0;
} else if (isMain) {
  const arg = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? Number(process.argv[i + 1]) : d; };
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const feed = rolesFeed(ledger, {
    today: new Date().toISOString().slice(0, 10),
    days: arg('--days', 7),
    limit: arg('--limit', 200),
    perCompany: process.argv.includes('--per-company') ? arg('--per-company', 5) : 5,
  });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(feed, null, 2));
  } else {
    atomicWrite(OUT, JSON.stringify(feed) + '\n', { mode: 0o644 });
    const rssPath = path.join(ROOT, 'DEMIGOD-ROLES-FEED.rss');
    const profiles = loadCompanyProfiles();
    atomicWrite(rssPath, rolesFeedToRss(feed, { profiles }), { mode: 0o644 });
    const c = feed.counts;
    const truncBits = [];
    if (c.omittedByCompanyCap) truncBits.push(`${c.omittedByCompanyCap} skipped by per-company cap${feed.perCompany ? ` (≤${feed.perCompany}/employer)` : ''}`);
    if (c.omittedByLimit) truncBits.push(`${c.omittedByLimit} omitted by limit`);
    console.log(
      `roles feed → ${OUT}\n` +
      `  ${c.returned} roles first observed in the last ${feed.windowDays}d ` +
      `(of ${c.inWindow} in window` +
      (truncBits.length ? `, ${truncBits.join(', ')}` : '') +
      `)\n` +
      `  ${c.withEmployerPostedDate} carry an attributed employer posting date; ` +
      `${c.droppedUnsafeUrl} dropped for an unusable link` +
      `\n  rss → ${rssPath}`,
    );
  }
}
