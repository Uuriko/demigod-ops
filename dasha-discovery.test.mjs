#!/usr/bin/env node
/**
 * What machines see. Nothing was checking any of it.
 *
 * Every other gate in this repo asks whether a person can use the site. This one asks whether a
 * crawler, a link unfurler or an AI search index can understand it — and on 2026-08-08 the answers
 * were: sitemap.xml is a 404, robots.txt is 200 with an empty body, no route carries structured
 * data, and the live OG card was a stale upload still showing copy that had been removed from the
 * pages themselves. All four are invisible from inside a browser, which is why they survived four
 * audits.
 *
 * The OG card check matters most and is the least obvious. The card is not part of any page; it is a
 * separate binary uploaded to a CDN. It can rot independently of every source file in this repo, and
 * the only place anyone would notice is someone else's timeline.
 *
 *   node dasha-discovery.test.mjs            # live
 *   node dasha-discovery.test.mjs --local    # sources only: structured data, no network
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const local = process.argv.includes('--local');
const ORIGIN = 'https://www.getdasha.com';
const here = (f) => new URL(`./${f}`, import.meta.url);
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

/* Each route has its own share card now. They used to share the homepage one, which meant a link to
   the Studio unfurled as an ad for the site rather than for the tool — and the two pages people
   actually share are the ones that were wrong. The local file is named per route so drift is caught
   per route: a card can rot independently, and one comparison against one file would hide that. */
const ROUTES = [
  ['/', 'dasha-landing.html', 'WebSite', 'dasha-social-card.png'],
  ['/studio', 'dasha-studio-embed.html', 'SoftwareApplication', 'dasha-social-card-studio.png'],
  ['/dasha', 'dasha-desk/index.html', 'WebApplication', 'dasha-social-card-desk.png'],
];

/** Structured data must parse, be the right thing, and not claim anything we cannot support. */
function checkJsonLd(where, html, expectedType) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) { check(false, `${where}: no structured data — machines get no description`); return; }
  for (const [, raw] of blocks) {
    let data;
    try { data = JSON.parse(raw); } catch (e) { check(false, `${where}: structured data is not valid JSON — ${e.message}`); continue; }
    check(data['@context'] === 'https://schema.org', `${where}: structured data has no schema.org context`);
    check(!!data.name, `${where}: structured data has no name`);
    check(!!data.url || data['@type'] === 'WebSite', `${where}: structured data has no url`);
    /* Nothing here may assert a rating, a review count or a holder count. We have no such numbers,
       and a schema block is exactly where an invented one would never be seen by a human reviewer. */
    for (const banned of ['aggregateRating', 'ratingValue', 'reviewCount', 'interactionCount']) {
      check(!(banned in data), `${where}: structured data claims ${banned}, which we cannot support`);
    }
  }
  const types = blocks.map(([, raw]) => { try { return JSON.parse(raw)['@type']; } catch { return null; } });
  check(types.includes(expectedType), `${where}: expected ${expectedType} structured data, got ${types.join(', ') || 'none'}`);
}

// ---- sources ---------------------------------------------------------------
for (const [route, file, type] of ROUTES) {
  checkJsonLd(`${file} (${route})`, await readFile(here(file), 'utf8'), type);
}

/* The sitemap is a file in this repo that has to be pasted into Webflow's SEO settings. Checking it
   here at least guarantees the thing we would paste is well-formed and lists exactly the real routes. */
const sitemap = await readFile(here('dasha-sitemap.xml'), 'utf8');
for (const [route] of ROUTES) {
  check(sitemap.includes(`${ORIGIN}${route}`), `dasha-sitemap.xml is missing ${route}`);
}
check(!/webflow\.io/.test(sitemap), 'dasha-sitemap.xml advertises a staging URL');
check((sitemap.match(/<loc>/g) || []).length === ROUTES.length,
  `dasha-sitemap.xml lists ${(sitemap.match(/<loc>/g) || []).length} URLs; there are ${ROUTES.length} real routes`);

if (local) {
  report();
} else {
  // ---- live ----------------------------------------------------------------
  const get = async (url, opts) => {
    try { return await fetch(url, { redirect: 'follow', ...opts }); }
    catch (e) { check(false, `${url}: request failed — ${e.message}`); return null; }
  };

  for (const [route, file, type, card] of ROUTES) {
    const res = await get(ORIGIN + route);
    if (!res) continue;
    const html = await res.text();
    check(res.ok, `${route}: HTTP ${res.status}`);
    checkJsonLd(`live ${route}`, html, type);

    // Canonical must be absolute and point at the route it is on, or duplicates get indexed.
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    check(canonical === `${ORIGIN}${route}` || canonical === `${ORIGIN}${route}/`,
      `${route}: canonical is ${canonical || 'missing'}`);

    // The share card: a separate binary on a CDN that can rot with nothing in this repo changing.
    const image = html.match(/<meta[^>]*property="og:image"[^>]*>/)?.[0]?.match(/content="([^"]+)"/)?.[1]
      || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/)?.[1];
    check(!!image, `${route}: no og:image — shared links unfurl bare`);
    if (image) {
      const cardRes = await get(image);   // not `card` — that name holds the expected filename
      if (cardRes) {
        check(cardRes.ok, `${route}: og:image is HTTP ${cardRes.status} — every shared link unfurls broken`);
        const bytes = Buffer.from(await cardRes.arrayBuffer());
        check(bytes.subarray(1, 4).toString() === 'PNG', `${route}: og:image is not a PNG`);
        if (bytes.subarray(1, 4).toString() === 'PNG') {
          const [w, h] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
          check(w === 1200 && h === 630, `${route}: og:image is ${w}x${h}, not 1200x630`);
        }
        /* And it must be the card we actually built. An uploaded asset does not change when the
           source does: on 2026-08-08 the live card still carried copy that had been removed from
           every page, and nothing anywhere would have said so. */
        const localCard = await readFile(here(card));
        check(createHash('sha256').update(bytes).digest('hex') === createHash('sha256').update(localCard).digest('hex'),
          `${route}: the live og:image is not the current ${card} — re-upload it to Webflow`);
      }
    }
  }

  const robots = await get(`${ORIGIN}/robots.txt`);
  if (robots) {
    const body = (await robots.text()).trim();
    check(robots.ok, `robots.txt: HTTP ${robots.status}`);
    check(body.length > 0, 'robots.txt is empty — no rules and, more importantly, no Sitemap line');
    check(/^sitemap:/im.test(body), 'robots.txt does not point at the sitemap');
    check(!/^disallow:\s*\/\s*$/im.test(body), 'robots.txt disallows the whole site');
  }

  const map = await get(`${ORIGIN}/sitemap.xml`);
  if (map) {
    check(map.ok, `sitemap.xml: HTTP ${map.status} — search engines have no route list`);
    if (map.ok) {
      const body = await map.text();
      for (const [route] of ROUTES) {
        check(body.includes(`${ORIGIN}${route}`), `live sitemap.xml is missing ${route}`);
      }
    }
  }

  /* Three distinct cards. If two routes resolve to the same bytes, a repoint has silently fallen
     back to the shared card and the per-route work is gone with nothing else showing it. */
  const seen = new Map();
  for (const [route, , , card] of ROUTES) seen.set(card, (seen.get(card) || 0) + 1);
  check(seen.size === ROUTES.length, 'two routes share a card file — the per-route cards collapsed');

  report();
}

function report() {
  if (failures.length) {
    console.error(`Dasha discovery: ${failures.length} FAILURE(S)${local ? ' (sources)' : ` on ${ORIGIN}`}\n`);
    for (const f of failures) console.error('  · ' + f);
    process.exit(1);
  }
  console.log(local
    ? 'Dasha discovery: PASS (sources — structured data on every route, sitemap well-formed)'
    : `Dasha discovery: PASS (${ORIGIN} — structured data, canonicals, share cards resolve and match, robots, sitemap)`);
}
