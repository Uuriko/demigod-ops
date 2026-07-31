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
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const FEED = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const DEPLOYABLE_BYTES = 50000;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Stage paste-ready package for /startups page custom code (publish still current-request-gated). */
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
      recentRoles: html.includes('Recently observed roles'),
      dataGeneratedAt: (html.match(/data-generated-at=["']([^"']+)["']/) || [])[1] || null,
    },
    authBoundary:
      'Paste into /startups page custom code (page-scoped, not site-wide) + Webflow publish requires current-request authorization. No auto-paste.',
    target: 'Webflow /startups page-settings custom code or before-</body> embed — page-scoped only',
    sourcePath,
    packagePath: dir + path.sep,
    publishUnauthorized: true,
  };
  fs.writeFileSync(path.join(dir, 'prepare.json'), `${JSON.stringify(rec, null, 2)}\n`);
  return rec;
}

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = (v) => { try { const u = new URL(String(v || '')); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const loadFeed = () => { try { return JSON.parse(fs.readFileSync(FEED, 'utf8')); } catch { return null; } };

function recentRoles(feed, limit = 8) {
  if (feed?.schema !== 'demigod.roles-feed/8' || !Array.isArray(feed.roles)) return [];
  return feed.roles.map((role) => {
    const company = String(role?.company || '').trim().slice(0, 160);
    const title = String(role?.title || '').trim().slice(0, 240);
    const observed = String(role?.firstObservedAt || '').slice(0, 10);
    const time = Date.parse(`${observed}T00:00:00Z`);
    const url = safeUrl(role?.url);
    if (!company || !title || !url || !/^\d{4}-\d{2}-\d{2}$/.test(observed) ||
        !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== observed) return null;
    return { company, title, observed, url };
  }).filter(Boolean)
    .sort((a, b) => b.observed.localeCompare(a.observed) || a.company.localeCompare(b.company) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function activitySummary(feed) {
  const counts = feed?.counts;
  const fields = ['inWindow', 'companiesInWindow', 'closedInWindow', 'companiesClosedInWindow', 'observationSpanDays', 'closureObservationSpanDays'];
  if (feed?.schema !== 'demigod.roles-feed/8' || !Number.isSafeInteger(feed.windowDays) ||
      feed.windowDays < 1 || !counts || fields.some((key) => !Number.isSafeInteger(counts[key]) || counts[key] < 0)) return '';
  const n = (value, noun, plural) => `${value} ${value === 1 ? noun : plural}`;
  return `Latest ${feed.windowDays}-day window: Demigod first observed ${n(counts.inWindow, 'role', 'roles')} across ${n(counts.companiesInWindow, 'company', 'companies')}; ` +
    `${n(counts.closedInWindow, 'role', 'roles')} left polled boards across ${n(counts.companiesClosedInWindow, 'company', 'companies')}. A role leaving a board does not mean filled or hired. ` +
    `Observation history spans ${n(counts.observationSpanDays, 'day', 'days')}; closure history spans ${n(counts.closureObservationSpanDays, 'day', 'days')}. These are board observations, not a hiring rate.`;
}

// Build the static directory HTML from a map object. Pure → testable.
// maxBytes: the Webflow footer ceiling this fragment must fit. The directory only grows, so rather
// than failing the whole refresh once it crosses the line ("paginate the fallback"), render the most
// rows that fit — highest open-role counts first — and say plainly that the list is partial. The
// totals above the list stay whole-corpus, so nothing under-reports; only the listing is trimmed.
export function buildStaticDirectory(map, generatedAt = '', feed = null, maxBytes = DEPLOYABLE_BYTES) {
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const verified = companies.filter((c) => c.openRoles && c.atsSource && safeUrl(c.jobsUrl));
  const totalRoles = verified.reduce((s, c) => s + c.openRoles, 0);
  const aging = verified.filter((c) => Number.isSafeInteger(c.agingRoles) && c.agingRoles > 0 && c.agingRoles <= c.openRoles);
  const agingRoles = aging.reduce((sum, c) => sum + c.agingRoles, 0);
  const sorted = verified.slice().sort((a, b) => (b.openRoles || 0) - (a.openRoles || 0) || String(a.name).localeCompare(String(b.name)));
  const recent = recentRoles(feed);
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
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'SF startups hiring — verified open roles',
    numberOfItems: verified.length,
    // ponytail: 50KB Webflow footer ceiling; paginate when the schema needs every organization.
    itemListElement: sorted.slice(0, 50).map((c, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'Organization', name: c.name, url: safeUrl(c.website) || undefined },
    })),
  };

  const row = (c) => {
    const jobs = safeUrl(c.jobsUrl);
    const label = `${c.name} — ${c.openRoles} open role${c.openRoles === 1 ? '' : 's'} on ${c.atsSource}`;
    return `<li><a href="${esc(jobs)}" rel="nofollow noopener">${esc(label)}</a></li>`;
  };

  const at = generatedAt || (map?.generatedAt || '').slice(0, 10);
  const agingNote = agingRoles
    ? ` ${agingRoles} role${agingRoles === 1 ? '' : 's'} across ${aging.length} compan${aging.length === 1 ? 'y' : 'ies'} ${agingRoles === 1 ? 'was' : 'were'} posted 90–365 days ago (Greenhouse board date).`
    : '';
  const recentHtml = recent.length
    ? `<section aria-labelledby="dg-static-recent">
<h2 id="dg-static-recent">Recently observed roles</h2>
<p>First observed is Demigod's timestamp, not the employer's posting date; this public-board feed can include roles outside the US.</p>
<ul>
${recent.map((role) => `<li><a href="${esc(role.url)}" rel="nofollow noopener">${esc(role.company)} — ${esc(role.title)}</a> · first observed ${esc(role.observed)}</li>`).join('\n')}
</ul>
</section>`
    : '';
  const jsonldText = JSON.stringify(jsonld).replace(/</g, '\\u003c');
  const page = (shown) => `<style>.dg-static{max-width:76rem;margin:2rem auto;padding:1rem}.dg-static li{margin:.35rem 0}</style>
<details class="dg-static" data-generated-at="${esc(at)}">
<summary>Browse ${verified.length} companies with verified open roles in this ${esc(at)} snapshot</summary>
<p>${totalRoles} open roles observed ${esc(at)}.${agingNote} Counts are a dated snapshot; follow each employer's public job board for current status.</p>
${activity ? `<p><strong>Observed hiring activity:</strong> ${esc(activity)}</p>` : ''}
${shown < sorted.length ? `<p>Listing the ${shown} of these ${verified.length} companies with the most open roles; the counts above cover all ${verified.length}.</p>\n` : ''}<ul>
${sorted.slice(0, shown).map(row).join('\n')}
</ul>
${recentHtml}
<p>Company counts above cover US-posted or remote roles from public employer job boards. No signup or private data.</p>
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
    schema: 'demigod.roles-feed/8',
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
    { company: 'Alpha Robotics', title: 'Staff Engineer', firstObservedAt: '2026-07-24', url: 'https://jobs.ashbyhq.com/alpha/1' },
    { company: 'Gamma', title: 'Senior </a><script>alert(2)</script>', firstObservedAt: '2026-07-23', url: 'https://jobs.lever.co/gamma/2' },
    { company: 'Missing title', title: '', firstObservedAt: '2026-07-24', url: 'https://example.com/3' },
    { company: 'Unsafe URL', title: 'Engineer', firstObservedAt: '2026-07-24', url: 'javascript:alert(3)' },
    { company: 'Bad date', title: 'Engineer', firstObservedAt: '2026-02-30', url: 'https://example.com/4' },
  ] };
  const html = buildStaticDirectory(fake, '', fakeFeed);
  // Crawlable: real company + job content is served markup, with native no-JS disclosure.
  assert(html.includes('Alpha Robotics') && html.includes('12 open roles on Ashby'), 'verified company + count in served HTML');
  assert(html.includes('3 roles across 1 company were posted 90–365 days ago (Greenhouse board date)'), 'attributed board-aging aggregate is crawlable');
  assert(!buildStaticDirectory({ ...fake, companies: fake.companies.map((c) => ({ ...c, agingRoles: 0 })) }).includes('Greenhouse board date'), 'board-aging claim is absent without evidence');
  assert(html.includes('<details class="dg-static"') && html.includes('<summary>Browse 2 companies'), 'native collapsed fallback');
  const companyList = html.match(/<summary>[\s\S]*?<ul>\n([\s\S]*?)\n<\/ul>/)?.[1] || '';
  assert((companyList.match(/<li>/g) || []).length === 2, 'only verified hirers with safe job links render');
  assert(!html.includes('Beta AI') && !html.includes('Delta unsafe URL'), 'self-reports and unsafe links are excluded');
  assert(html.includes('Recently observed roles') && html.includes('Alpha Robotics — Staff Engineer'), 'recent public role titles are crawlable');
  assert(html.includes("Demigod's timestamp, not the employer's posting date") && html.includes('outside the US'), 'recent-role dates and scope are honest');
  assert(html.includes('Observed hiring activity:') && html.includes('1 role left polled boards across 1 company'), 'activity summary uses feed counts with honest singulars');
  assert(html.includes('does not mean filled or hired') && html.includes('not a hiring rate'), 'activity summary states its inference limits');
  assert(!buildStaticDirectory(fake, '', { ...fakeFeed, counts: { ...fakeFeed.counts, closedInWindow: -1 } }).includes('Observed hiring activity:'), 'malformed activity counts fail closed');
  assert(!html.includes('Missing title') && !html.includes('Unsafe URL') && !html.includes('Bad date'), 'malformed recent roles fail closed');
  assert(!html.includes('</a><script>alert(2)</script>') && html.includes('&lt;/a&gt;&lt;script&gt;alert(2)&lt;/script&gt;'), 'recent role text is escaped');
  assert(!buildStaticDirectory(fake).includes('Recently observed roles'), 'absent feed emits no empty recent-role section');
  assert(!buildStaticDirectory(fake, '', { schema: 'demigod.roles-feed/7', roles: fakeFeed.roles }).includes('Recently observed roles'), 'unknown feed schema fails closed');
  assert(html.includes('application/ld+json') && html.includes('"@type":"ItemList"'), 'JSON-LD present');
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert(ld.numberOfItems === 2 && ld.itemListElement[0].item.name === 'Alpha Robotics', 'JSON-LD verified-only (no YC self-report)');
  assert(!ld.itemListElement.some((e) => /Beta/.test(e.item.name)), 'YC self-report excluded from the directory schema');
  // We are not the posting authority and hold no reliable expiry dates, so emitting JobPosting for
  // employers' own roles risks the stale-undated-jobs manual action. Guard it at the artifact.
  assert(!/JobPosting/.test(html), 'directory must never emit JobPosting markup for roles it does not own');
  assert(ld['@type'] === 'ItemList', 'the directory describes a list of organizations, not postings');
  assert(!html.includes('</script><script>alert(1)</script>') && html.includes('\\u003c/script>'), 'escapes names in markup and JSON-LD');

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
    assert(squeezed.includes(`Listing the ${rows} of these ${expected.length} companies with the most open roles`),
      'a partial listing says so, in the served markup');
    assert(squeezed.includes(`Browse ${expected.length} companies with verified open roles`),
      'the whole-corpus total stays honest when the listing is trimmed');
    const unbounded = buildStaticDirectory(real, '', realFeed, 10 ** 9);
    const allRows = ((unbounded.match(/<summary>[\s\S]*?<ul>\n([\s\S]*?)\n<\/ul>/)?.[1] || '').match(/<li>/g) || []).length;
    assert(allRows === expected.length && !unbounded.includes('Listing the '),
      'an unreachable budget lists every verified company and adds no truncation note');
  }
  assert(
    realLd.numberOfItems === expected.length && realLd.itemListElement.length === Math.min(50, expected.length),
    'JSON-LD total is honest and its embedded sample is capped',
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
  if (!deployable) {
    console.error(
      `directory-static: ${bytes} bytes exceeds the ${DEPLOYABLE_BYTES} byte Webflow footer ceiling — paginate the fallback.`,
    );
  }
  const paste = stageStartupsPastePackage(html, { sourcePath: outPath });
  console.log(JSON.stringify({
    ok: deployable, outPath, companies: map.companies.length, bytes,
    recentRoles: recentRoles(feed).length,
    deployable, deployableCeilingBytes: DEPLOYABLE_BYTES,
    pastePackage: paste.packagePath,
    pasteSha256: paste.sha256,
  }));
  if (!deployable) process.exitCode = 1;
}
