#!/usr/bin/env node
// Generate the paste-ready, crawlable Webflow footer fragment for /startups.
// The interactive directory is client-rendered; this native <details> fallback puts every verified
// hirer in served HTML without duplicating the app or claiming YC self-reports as verified.
//
//   node demigod-directory-static.mjs [--out <dir>] [--selftest]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  companyKey,
  publicRolesFromFeed,
  startupScore,
} from './demigod-public-roles.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const FEED = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const DEPLOYABLE_BYTES = 50000;
// Warn before the ceiling, not at it — a hard failure mid-pipeline is a worse first signal.
const HEADROOM_WARN_BYTES = 1500;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node demigod-directory-static.mjs [--out <dir>] | --selftest');
    process.exit(0);
  }
  const unknown = args.find((arg, i) => arg !== '--selftest' && arg !== '--out' && args[i - 1] !== '--out');
  const outAt = args.indexOf('--out');
  if (unknown || (outAt >= 0 && (!args[outAt + 1] || args[outAt + 1].startsWith('-')))) {
    console.error(`directory-static: invalid argument ${unknown || '--out requires a directory'}`);
    process.exit(2);
  }
}

/** Stage paste-ready package for /startups page custom code (publish uses the guarded foreground ship path). */
export function stageStartupsPastePackage(html, {
  busy = BUSY,
  sourcePath = path.join(ROOT, 'sf-startups-static.html'),
} = {}) {
  const dir = path.join(busy, 'startups-paste');
  fs.mkdirSync(dir, { recursive: true });
  const outHtml = path.join(dir, 'sf-startups-static.html');
  fs.writeFileSync(outHtml, html);
  const bytes = Buffer.byteLength(html);
  const sha256 = createHash('sha256').update(html).digest('hex');
  fs.writeFileSync(path.join(dir, 'SHA256'), `${sha256}  sf-startups-static.html\n`);
  const frag =
    html.match(
      /<details\b[^>]*\bclass=["'][^"']*\bdg-static\b[^"']*["'][^>]*>[\s\S]*?<\/details>/i,
    )?.[0] || '';
  const rec = {
    schema: 'demigod.startups-paste-prepare/1',
    at: new Date().toISOString(),
    ok: bytes <= DEPLOYABLE_BYTES,
    bytes,
    deployableCeilingBytes: DEPLOYABLE_BYTES,
    deployable: bytes <= DEPLOYABLE_BYTES,
    sha256,
    fragmentLen: frag.length,
    markers: {
      boardAging: html.includes('Greenhouse board date'),
      recentRoles: html.includes('<h2 id="dg-static-recent">Open roles</h2>'),
      dataGeneratedAt: (html.match(/data-generated-at=["']([^"']+)["']/) || [])[1] || null,
    },
    authBoundary:
      'Release the page-scoped /startups custom code with bin/dg ship run.',
    target: 'Webflow /startups page-settings custom code or before-</body> embed — page-scoped only',
    sourcePath,
    packagePath: dir + path.sep,
  };
  fs.writeFileSync(path.join(dir, 'prepare.json'), `${JSON.stringify(rec, null, 2)}\n`);
  return rec;
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = (v) => { try { const u = new URL(String(v || '')); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const loadFeed = () => { try { return JSON.parse(fs.readFileSync(FEED, 'utf8')); } catch { return null; } };

/**
 * Recent crawlable roles — same SF/startup ranking as the homepage public-roles rail.
 * profiles: companyKey → {teamSize, stage, tags} from the map (optional).
 */
function recentRoles(feed, limit = 8, profiles = {}) {
  if ((feed?.schema !== 'demigod.roles-feed/1' && feed?.schema !== 'demigod.roles-feed/8') || !Array.isArray(feed.roles)) {
    return [];
  }
  const pub = publicRolesFromFeed(feed, { limit, profiles, perCompany: 1 });
  return (pub.roles || [])
    .map((r) => {
      const observed = String(r.firstObservedAt || '').slice(0, 10);
      const time = Date.parse(`${observed}T00:00:00Z`);
      const url = safeUrl(r.url);
      if (
        !r.company ||
        !r.title ||
        !url ||
        !/^\d{4}-\d{2}-\d{2}$/.test(observed) ||
        !Number.isFinite(time) ||
        new Date(time).toISOString().slice(0, 10) !== observed
      ) {
        return null;
      }
      return {
        company: r.company,
        title: r.title,
        observed,
        url,
        department: r.employerDepartment || null,
        office: r.employerOffice || r.location || null,
        employmentType: r.employmentType || null,
        workplaceType: r.workplaceType || null,
        boardUpdated: r.boardUpdatedAt || null,
      };
    })
    .filter(Boolean);
}

function activitySummary(feed) {
  const counts = feed?.counts;
  const fields = ['inWindow', 'companiesInWindow', 'closedInWindow', 'companiesClosedInWindow', 'observationSpanDays', 'closureObservationSpanDays'];
  if ((feed?.schema !== 'demigod.roles-feed/1' && feed?.schema !== 'demigod.roles-feed/8') || !Number.isSafeInteger(feed.windowDays) ||
      feed.windowDays < 1 || !counts || fields.some((key) => !Number.isSafeInteger(counts[key]) || counts[key] < 0)) return '';
  const n = (value, noun, plural) => `${value} ${value === 1 ? noun : plural}`;
  return `Latest ${feed.windowDays}-day window: Demigod first observed ${n(counts.inWindow, 'role', 'roles')} across ${n(counts.companiesInWindow, 'company', 'companies')}; ` +
    `${n(counts.closedInWindow, 'role', 'roles')} left polled boards across ${n(counts.companiesClosedInWindow, 'company', 'companies')}. A role leaving a board does not mean filled or hired. ` +
    `Observation history spans ${n(counts.observationSpanDays, 'day', 'days')}; closure history spans ${n(counts.closureObservationSpanDays, 'day', 'days')}. These are board observations, not a hiring rate.`;
}

// Build the static directory HTML from a map object. Pure → testable.
// maxBytes: the Webflow footer ceiling this fragment must fit. The directory only grows, so rather
// than failing the whole refresh once it crosses the line ("paginate the fallback"), render the most
// rows that fit — startups first, then open-role count — and say plainly that the list is partial. The
// totals above the list stay whole-corpus, so nothing under-reports; only the listing is trimmed.
export function buildStaticDirectory(map, generatedAt = '', feed = null, maxBytes = DEPLOYABLE_BYTES) {
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const verified = companies.filter((c) => c.openRoles && c.atsSource && safeUrl(c.jobsUrl));
  const totalRoles = verified.reduce((s, c) => s + c.openRoles, 0);
  const aging = verified.filter((c) => Number.isSafeInteger(c.agingRoles) && c.agingRoles > 0 && c.agingRoles <= c.openRoles);
  const agingRoles = aging.reduce((sum, c) => sum + c.agingRoles, 0);
  // Startups first (same map signals as homepage public-roles rail), then open-role volume.
  // Totals stay whole-corpus; only order/truncation of the listing changes.
  const sorted = verified.slice().sort((a, b) => {
    const st =
      startupScore({
        teamSize: b.teamSize ?? null,
        stage: b.stage ?? null,
        tags: b.tags || [],
        openRoles: b.openRoles ?? null,
      }) -
      startupScore({
        teamSize: a.teamSize ?? null,
        stage: a.stage ?? null,
        tags: a.tags || [],
        openRoles: a.openRoles ?? null,
      });
    if (st) return st;
    return (b.openRoles || 0) - (a.openRoles || 0) || String(a.name).localeCompare(String(b.name));
  });
  // Same company signals the homepage rail uses — keep static "recent" list SF-startup shaped.
  const profiles = Object.fromEntries(
    companies.map((c) => [
      companyKey(c.name),
      {
        teamSize: c.teamSize ?? null,
        stage: c.stage ?? null,
        tags: c.tags || [],
        openRoles: Number.isFinite(c.openRoles) ? c.openRoles : null,
      },
    ]),
  );
  const recent = recentRoles(feed, 6, profiles);
  const activity = activitySummary(feed);

  // JSON-LD: ItemList of verified-hiring organizations only (honest — no self-reports).
  //
  // DELIBERATELY NOT JobPosting. Every SEO guide calls JobPosting markup "the highest-impact free
  // action" for getting listings into Google for Jobs, so this is a tempting and plausible-looking
  // improvement. It would be a mistake here for two reasons:
  //   1. We are not the posting authority. These roles live on the employers' own ATS boards and we
  //      link straight to them. Emitting JobPosting for someone else's posting claims an authority
  //      we do not have and duplicates their markup.
  //   2. Google increasingly treats a missing `validThrough` as a quality signal against a listing,
  //      and a site carrying many stale undated jobs can take a MANUAL ACTION that removes all of
  //      its jobs. Our corpus is deliberately full of long-open roles (407 past a year) and we hold
  //      no reliable expiry date for any of them — exactly the profile that earns that penalty.
  // ItemList of Organizations describes what we actually are: a directory of companies. The
  // selftest below asserts JobPosting never appears; do not "fix" that.
  // ponytail: 50KB Webflow footer ceiling; paginate when the schema needs every organization.
  const listed = sorted.slice(0, 50);
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'SF startups hiring — public ATS open roles',
    // Counts the list actually emitted, not the corpus. Declaring 339 items and then supplying 50
    // is the same over-claim the page copy goes out of its way to avoid ("Listing the N of these
    // M"), and it is bound to `listed` so a cap change cannot reintroduce the drift. The
    // whole-corpus total stays in the <summary>, where the reader sees its caveat alongside it.
    numberOfItems: listed.length,
    itemListElement: listed.map((c, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'Organization', name: c.name, url: safeUrl(c.website) || undefined },
    })),
  };

  // `noopener` is inert here — nothing in this fragment opens a new browsing context
  // (no target="_blank"), so window.opener is never populated. At ~350 anchors it cost
  // ~3.1KB against a 50KB ceiling that was already trimming companies off the listing.
  // Do not re-add it without also adding target="_blank"; `nofollow` is the load-bearing half.
  const row = (c) => {
    const jobs = safeUrl(c.jobsUrl);
    const label = `${c.name} — ${c.openRoles} open role${c.openRoles === 1 ? '' : 's'} on ${c.atsSource}`;
    return `<li><a href="${esc(jobs)}" rel="nofollow">${esc(label)}</a></li>`;
  };

  /* The date on this page is when the counts were OBSERVED, not when the file was built.
     They are not the same day: the map's generatedAt was 2026-08-16 while every counted row carried
     openRolesAt 2026-08-17, so the page said "10936 open roles observed 2026-08-16" about
     observations taken the day after. Stamping a count with the build date is the same restamping
     the methodology page promises we never do, just in the conservative direction.
     Oldest wins when rows disagree, because that is the only choice that cannot overstate
     freshness — the newest would advertise the whole corpus as being as fresh as its freshest row. */
  const observedDays = verified.map((c) => String(c.openRolesAt || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const at = generatedAt || observedDays[0] || (map?.generatedAt || '').slice(0, 10);
  const agingNote = agingRoles
    ? ` ${agingRoles} role${agingRoles === 1 ? '' : 's'} across ${aging.length} compan${aging.length === 1 ? 'y' : 'ies'} ${agingRoles === 1 ? 'was' : 'were'} posted 90–365 days ago, counted only among roles whose Greenhouse board date we can attribute — not out of the total above.`
    : '';
  // Top aging boards (by agingRoles) — crawlable filter signal; not a ghost-job rate.
  const agingTop = aging
    .slice()
    .sort((a, b) => (b.agingRoles || 0) - (a.agingRoles || 0) || String(a.name).localeCompare(String(b.name)))
    .slice(0, 8);
  const agingHtml = agingTop.length
    ? `<section aria-labelledby="dg-static-aging">
<h2 id="dg-static-aging">Posted 90–365 days ago (board date)</h2>
<p>Public Greenhouse first-published dates when present. Long-open is not a fill rate or ghost-job score — check the employer's board.</p>
<ul>
${agingTop.map((c) => {
      const jobs = safeUrl(c.jobsUrl);
      const n = c.agingRoles;
      const label = `${c.name} — ${n} role${n === 1 ? '' : 's'} still open after 90–365d on ${c.atsSource}`;
      return `<li><a href="${esc(jobs)}" rel="nofollow">${esc(label)}</a></li>`;
    }).join('\n')}
</ul>
</section>`
    : '';
  const recentHtml = recent.length
    ? `<section aria-labelledby="dg-static-recent">
<h2 id="dg-static-recent">Open roles</h2>
<p>First observed is Demigod's timestamp, not the employer's posting date. SF Bay / US-leaning locations preferred when boards list them; not matching inventory.</p>
<ul>
${recent.map((role) => (() => { const bits = [`first observed ${esc(role.observed)}`]; if (role.department) bits.push(esc(role.department)); if (role.office) bits.push(esc(role.office)); if (role.workplaceType) bits.push(esc(role.workplaceType)); if (role.employmentType) bits.push(esc(role.employmentType)); if (role.boardUpdated) bits.push(`board updated ${esc(role.boardUpdated)}`); return `<li><a href="${esc(role.url)}" rel="nofollow">${esc(role.company)} — ${esc(role.title)}</a> · ${bits.join(' · ')}</li>`; })()).join('\n')}
</ul>
</section>`
    : '';
  const jsonldText = JSON.stringify(jsonld).replace(/</g, '\\u003c');
  const page = (shown) => `<style>.dg-static{max-width:76rem;margin:2rem auto;padding:1rem}.dg-static li{margin:.35rem 0}</style>
<details class="dg-static" data-generated-at="${esc(at)}">
<summary>Browse ${verified.length} companies with public ATS open roles in this ${esc(at)} snapshot</summary>
<p>${totalRoles} open roles observed ${esc(at)}.${agingNote} Counts are a dated snapshot; follow each employer's public job board for current status.</p>
${activity ? `<p><strong>Observed hiring activity:</strong> ${esc(activity)}</p>` : ''}
${shown < sorted.length ? `<p>Listing the ${shown} of these ${verified.length} companies (startups first when size/stage is known, then by open-role count); the counts above cover all ${verified.length}.</p>\n` : ''}<ul>
${sorted.slice(0, shown).map(row).join('\n')}
</ul>
${agingHtml}
${recentHtml}
<p>Counts cover US-posted or remote roles from public boards. No signup.</p>
</details>
<script type="application/ld+json">${jsonldText}</script>`;

  const fits = (shown) => Buffer.byteLength(page(shown)) <= maxBytes;
  if (fits(sorted.length)) return page(sorted.length);
  // Largest row count that still fits. If even zero rows overflow, the non-list content is itself
  // over budget — return it anyway so the caller's ceiling check fails loudly instead of silently
  // publishing an empty directory.
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (fits(mid)) lo = mid;
    else hi = mid - 1;
  }
  // The truncation note's own length moves by a byte across a digit boundary, so confirm rather
  // than trust the search's monotonicity assumption.
  while (lo > 0 && !fits(lo)) lo -= 1;
  return page(lo);
}

if (isMain && (process.env.DEMIGOD_STATIC_SELFTEST === '1' || process.argv.includes('--selftest'))) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const cli = fileURLToPath(import.meta.url);
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  const bad = spawnSync(process.execPath, [cli, '--wat'], { encoding: 'utf8' });
  assert(help.status === 0 && /^Usage:/.test(help.stdout), '--help is read-only usage');
  assert(bad.status === 2, 'unknown arguments fail closed with exit 2');
  const fake = { generatedAt: '2026-07-24', companies: [
    {
      name: 'Alpha Robotics',
      website: 'https://alpha.io/',
      openRoles: 12,
      atsSource: 'Ashby',
      jobsUrl: 'https://jobs.ashbyhq.com/alpha',
      agingRoles: 3,
    },
    { name: 'Beta AI', website: 'https://beta.ai/', hiring: 'yes', jobsSource: 'YC', jobsUrl: 'https://www.ycombinator.com/companies/beta/jobs' },
    {
      name: 'Gamma </script><script>alert(1)</script>',
      website: 'javascript:alert(1)',
      openRoles: 1,
      atsSource: 'Lever',
      jobsUrl: 'https://jobs.lever.co/gamma',
    },
    { name: 'Delta unsafe URL', openRoles: 2, atsSource: 'Lever', jobsUrl: 'javascript:alert(1)' },
  ] };
  const fakeFeed = {
    schema: 'demigod.roles-feed/1',
    windowDays: 1,
    counts: {
      inWindow: 2,
      companiesInWindow: 2,
      closedInWindow: 1,
      companiesClosedInWindow: 1,
      observationSpanDays: 5,
      closureObservationSpanDays: 2,
    },
    roles: [
    { company: 'Alpha Robotics', title: 'Staff Engineer', firstObservedAt: '2026-07-24', url: 'https://jobs.ashbyhq.com/alpha/1', employerDepartment: 'Platform', employerOffice: 'SF', workplaceType: 'Hybrid', employmentType: 'FullTime', boardUpdatedAt: '2026-07-23' },
    { company: 'Gamma', title: 'Senior </a><script>alert(2)</script>', firstObservedAt: '2026-07-23', url: 'https://jobs.lever.co/gamma/2' },
    { company: 'Missing title', title: '', firstObservedAt: '2026-07-24', url: 'https://example.com/3' },
    { company: 'Unsafe URL', title: 'Engineer', firstObservedAt: '2026-07-24', url: 'javascript:alert(3)' },
    { company: 'Bad date', title: 'Engineer', firstObservedAt: '2026-02-30', url: 'https://example.com/4' },
  ] };
  const html = buildStaticDirectory(fake, '', fakeFeed);
  // Crawlable: real company + job content is served markup, with native no-JS disclosure.
  assert(html.includes('Alpha Robotics') && html.includes('12 open roles on Ashby'), 'verified company + count in served HTML');
  assert(html.includes('3 roles across 1 company were posted 90–365 days ago'), 'attributed board-aging aggregate is crawlable');
  /* The aging count is the one figure on this page drawn from a narrower universe than the headline:
     it counts only roles with an attributable Greenhouse first_published date (9,600 of 17,112 open
     roles ledger-wide), while the totals above it cover every verified board. Printed bare, a reader
     divides it by the headline and gets a rate that was never measured. Every other number here
     states its denominator; this one has to say which denominator it is NOT. */
  assert(/not out of the total above/.test(html), 'the aging count must refuse the denominator a reader would assume');

  /* The page date must come from when the counts were observed, not when the map was built.
     Live case that forced this: map generatedAt 2026-08-16, every counted row openRolesAt
     2026-08-17, page claiming "observed 2026-08-16". */
  {
    const dated = buildStaticDirectory({
      generatedAt: '2026-08-16T20:00:00.000Z',
      companies: [
        { id: 'a', name: 'Acme', website: 'https://acme.com/', openRoles: 3, atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/acme', openRolesAt: '2026-08-17' },
        { id: 'b', name: 'Beta', website: 'https://beta.com/', openRoles: 2, atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/beta', openRolesAt: '2026-08-18' },
      ],
    });
    assert(dated.includes('2026-08-17'), 'the page is dated by observation, not by map build time');
    assert(!dated.includes('2026-08-16'), 'the build date must not appear as the observation date');
    assert(!dated.includes('observed 2026-08-18'), 'the newest row must not date the whole corpus');
  }
  assert(html.includes('dg-static-aging') && html.includes('Posted 90–365 days ago (board date)'), 'aging section heading is crawlable');
  assert(html.includes('Alpha Robotics — 3 roles still open after 90–365d on Ashby'), 'aging company rows are crawlable');
  assert(html.includes('not a fill rate or ghost-job score'), 'aging section states inference limits');
  assert(!buildStaticDirectory({ ...fake, companies: fake.companies.map((c) => ({ ...c, agingRoles: 0 })) }).includes('Greenhouse board date'), 'board-aging claim is absent without evidence');
  assert(!buildStaticDirectory({ ...fake, companies: fake.companies.map((c) => ({ ...c, agingRoles: 0 })) }).includes('dg-static-aging'), 'aging section is absent without evidence');
  assert(html.includes('<details class="dg-static"') && html.includes('<summary>Browse 2 companies'), 'native collapsed fallback');
  const companyList = html.match(/<summary>[\s\S]*?<ul>\n([\s\S]*?)\n<\/ul>/)?.[1] || '';
  assert((companyList.match(/<li>/g) || []).length === 2, 'only verified hirers with safe job links render');
  assert(!html.includes('Beta AI') && !html.includes('Delta unsafe URL'), 'self-reports and unsafe links are excluded');
  assert(html.includes('Open roles') && html.includes('Alpha Robotics — Staff Engineer'), 'recent public role titles are crawlable');
  assert(html.includes('Platform') && html.includes('Hybrid') && html.includes('FullTime') && html.includes('board updated 2026-07-23'), 'employer meta from clay enrich is crawlable when present');
  assert(
    html.includes("Demigod's timestamp, not the employer's posting date") &&
      html.includes('SF Bay / US-leaning') &&
      html.includes('not matching inventory'),
    'recent-role dates and SF-prefer scope are honest',
  );
  assert(html.includes('Observed hiring activity:') && html.includes('1 role left polled boards across 1 company'), 'activity summary uses feed counts with honest singulars');
  assert(html.includes('does not mean filled or hired') && html.includes('not a hiring rate'), 'activity summary states its inference limits');
  assert(!buildStaticDirectory(fake, '', { ...fakeFeed, counts: { ...fakeFeed.counts, closedInWindow: -1 } }).includes('Observed hiring activity:'), 'malformed activity counts fail closed');
  assert(!html.includes('Missing title') && !html.includes('Unsafe URL') && !html.includes('Bad date'), 'malformed recent roles fail closed');
  assert(!html.includes('</a><script>alert(2)</script>') && html.includes('&lt;/a&gt;&lt;script&gt;alert(2)&lt;/script&gt;'), 'recent role text is escaped');
  assert(!buildStaticDirectory(fake).includes('dg-static-recent'), 'absent feed emits no empty recent-role section');
  assert(!buildStaticDirectory(fake, '', { schema: 'demigod.roles-feed/7', roles: fakeFeed.roles }).includes('dg-static-recent'), 'unknown feed schema fails closed');
  // Off-geo-only boards drop when any SF/US/unknown row exists (same rule as homepage rail).
  {
    const geoFeed = {
      ...fakeFeed,
      roles: [
        {
          company: 'OffGeo Co',
          title: 'SRE Bangalore',
          firstObservedAt: '2026-07-24',
          url: 'https://jobs.ashbyhq.com/offgeo/1',
          location: 'Bangalore, India',
        },
        {
          company: 'Alpha Robotics',
          title: 'Staff Engineer',
          firstObservedAt: '2026-07-23',
          url: 'https://jobs.ashbyhq.com/alpha/1',
          location: 'San Francisco, CA',
        },
      ],
    };
    const geoHtml = buildStaticDirectory(fake, '', geoFeed);
    assert(geoHtml.includes('Alpha Robotics — Staff Engineer'), 'SF-leaning recent role is kept');
    assert(!geoHtml.includes('OffGeo Co') && !geoHtml.includes('SRE Bangalore'), 'pure off-geo recent roles drop when SF rows exist');
  }
  assert(html.includes('application/ld+json') && html.includes('"@type":"ItemList"'), 'JSON-LD present');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert(ld.numberOfItems === 2 && ld.itemListElement[0].item.name === 'Alpha Robotics', 'JSON-LD verified-only (no YC self-report)');
  assert(!ld.itemListElement.some((e) => /Beta/.test(e.item.name)), 'YC self-report excluded from the directory schema');
  // We are not the posting authority and hold no reliable expiry dates, so emitting JobPosting for
  // employers' own roles risks the stale-undated-jobs manual action. Guard it at the artifact.
  assert(!/JobPosting/.test(html), 'directory must never emit JobPosting markup for roles it does not own');
  assert(ld['@type'] === 'ItemList', 'the directory describes a list of organizations, not postings');
  assert(!html.includes('</script><script>alert(1)</script>') && html.includes('\\u003c/script>'), 'escapes names in markup and JSON-LD');

  // Truncated listing prefers known startups over high-volume established firms.
  {
    const mixed = {
      companies: [
        { name: 'HugeCo', openRoles: 200, atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/huge', teamSize: 2000, stage: 'Growth' },
        { name: 'TinyCo', openRoles: 3, atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/tiny', teamSize: 8, stage: 'Early' },
      ],
    };
    const full = buildStaticDirectory(mixed);
    assert(full.indexOf('TinyCo') < full.indexOf('HugeCo'), 'startup ranks above established in listing order');
    const ldMixed = JSON.parse(full.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert(ldMixed.itemListElement[0].item.name === 'TinyCo', 'JSON-LD sample also prefers startups');
  }

  // Real-data ceiling: the check fails as soon as growth makes the footer undeployable again.
  const real = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const realFeed = loadFeed();
  const expected = real.companies.filter((c) => c.openRoles && c.atsSource && safeUrl(c.jobsUrl));
  const fallback = buildStaticDirectory(real, '', realFeed);
  const realLd = JSON.parse(fallback.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert(Buffer.byteLength(fallback) <= DEPLOYABLE_BYTES, 'real fallback fits Webflow footer ceiling');
  const realCompanyList = fallback.match(/<summary>[\s\S]*?<ul>\n([\s\S]*?)\n<\/ul>/)?.[1] || '';
  const realRows = (realCompanyList.match(/<li>/g) || []).length;
  assert(realRows === expected.length || fallback.includes(`Listing the ${realRows} of these ${expected.length} companies`),
    'every verified hirer renders, or the page says how many of them it is listing');
  // The byte fit is what keeps the directory publishable as it grows. Squeeze the ceiling on real
  // data and the listing must shrink, disclose, and still fit — never silently drop rows.
  {
    const squeezed = buildStaticDirectory(real, '', realFeed, 20000);
    const rows = ((squeezed.match(/<summary>[\s\S]*?<ul>\n([\s\S]*?)\n<\/ul>/)?.[1] || '').match(/<li>/g) || []).length;
    assert(Buffer.byteLength(squeezed) <= 20000, 'squeezed fallback respects the byte budget it was given');
    assert(rows > 0 && rows < expected.length, `squeezed listing is partial but non-empty (got ${rows}/${expected.length})`);
    assert(squeezed.includes(`Listing the ${rows} of these ${expected.length} companies (startups first when size/stage is known, then by open-role count)`),
      'a partial listing says so, in the served markup');
    assert(squeezed.includes(`Browse ${expected.length} companies with public ATS open roles`),
      'the whole-corpus total stays honest when the listing is trimmed');
    const unbounded = buildStaticDirectory(real, '', realFeed, 10 ** 9);
    const allRows = ((unbounded.match(/<summary>[\s\S]*?<ul>\n([\s\S]*?)\n<\/ul>/)?.[1] || '').match(/<li>/g) || []).length;
    assert(allRows === expected.length && !unbounded.includes('Listing the '),
      'an unreachable budget lists every verified company and adds no truncation note');
  }
  assert(
    realLd.itemListElement.length === Math.min(50, expected.length) &&
      realLd.numberOfItems === realLd.itemListElement.length,
    'JSON-LD sample is capped and numberOfItems counts what was actually emitted, not the corpus',
  );
  assert(!/<(?:!doctype|html|head|body)\b/i.test(fallback), 'output is a page-footer fragment');
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-startups-paste-'));
    try {
      const pkg = stageStartupsPastePackage(fallback, { busy: tmp, sourcePath: 'selftest' });
      assert(pkg.deployable === true && pkg.markers.boardAging === true, 'paste package marks board aging');
      assert(fs.existsSync(path.join(tmp, 'startups-paste', 'sf-startups-static.html')), 'paste html staged');
      assert(fs.existsSync(path.join(tmp, 'startups-paste', 'prepare.json')), 'paste prepare.json staged');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  console.log(JSON.stringify({ ok: true, selftest: 'directory-static' }));
  process.exit(0);
}

if (isMain) {
  const outDir = (() => { const i = process.argv.indexOf('--out'); return i > 0 ? process.argv[i + 1] : ROOT; })();
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const feed = loadFeed();
  const html = buildStaticDirectory(map, '', feed);
  const outPath = path.join(outDir, 'sf-startups-static.html');
  fs.writeFileSync(outPath, html);
  const bytes = Buffer.byteLength(html);
  const deployable = bytes <= DEPLOYABLE_BYTES;
  const headroomBytes = DEPLOYABLE_BYTES - bytes;
  if (!deployable) {
    console.error(
      `directory-static: ${bytes} bytes exceeds the ${DEPLOYABLE_BYTES} byte Webflow footer ceiling — paginate the fallback.`,
    );
  } else if (headroomBytes <= HEADROOM_WARN_BYTES) {
    /* Reports that the LISTING IS BEING TRIMMED, not that a failure is coming. buildStaticDirectory
       binary-searches the largest row count that fits and discloses "Listing the N of these M";
       whole-corpus totals are unaffected. An earlier version of this warning said "paginate before
       it fails closed", which described a failure mode that does not exist and would have sent an
       operator to do pagination work the builder already handles. Small headroom is the fitter
       working, not a wall being approached. */
    /* Point at where the bytes actually are. Page copy is ~1.6KB of ~50KB; the budget is ~83%
       anchor rows and ~12% the JSON-LD ItemList. "Trim page copy" sent a reader at the 3%. */
    console.error(
      `directory-static: ${headroomBytes} bytes headroom under the ${DEPLOYABLE_BYTES} byte Webflow ceiling — the listing is being trimmed to fit (totals stay whole-corpus). The budget is per-row anchor markup (~83%) and the JSON-LD ItemList (~12%); shorten a row or lower the ItemList cap to list more companies.`,
    );
  }
  const paste = stageStartupsPastePackage(html, { sourcePath: outPath });
  console.log(JSON.stringify({
    ok: deployable, outPath, companies: map.companies.length, bytes,
    recentRoles: recentRoles(feed).length,
    deployable, deployableCeilingBytes: DEPLOYABLE_BYTES, headroomBytes,
    pastePackage: paste.packagePath,
    pasteSha256: paste.sha256,
  }));
  if (!deployable) process.exitCode = 1;
}
