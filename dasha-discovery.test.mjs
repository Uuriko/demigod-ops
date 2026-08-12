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
/* The general site card, used by any route that has not earned art of its own. Named because the
   distinctness check below has to tell "these two share on purpose" apart from "a repoint collapsed
   two routes onto one file", and a bare filename repeated in the table cannot say which it is. */
const SITE_CARD = 'dasha-social-card.png';

const ROUTES = [
  ['/', 'dasha-landing.html', 'WebSite', SITE_CARD],
  /* Hidden route-level app schema was deliberately retired; the pasteable Studio embed remains the
     context where the application description travels with visible content. */
  ['/studio', 'dasha-studio-embed.html', null, 'dasha-social-card-studio.png'],
  /* The lobby has no structured data of its own yet and shares the homepage card; it is listed so
     the sitemap count stays honest and so a missing/rotted card there is still caught. */
  ['/lobby', 'dasha-lobby-page.html', null, SITE_CARD],
  ['/dasha', 'dasha-desk/index.html', null, 'dasha-social-card-desk.png'],
  ['/how-to-buy', 'dasha-how-to-buy.html', null, SITE_CARD],
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

/* ---- sources ---------------------------------------------------------------
   Structured data for our own pages now lives in Webflow page settings, not in the embeds. That is
   deliberate and it is not tidiness: page settings survive a publish from another source tree, and
   embeds do not — this site is published from two trees, and the embed-borne JSON-LD was overwritten
   three times in a day. The one place it still belongs in a file is the pasteable embed, because
   that travels to pages we do not own, where nothing else describes the tool. */
checkJsonLd('dasha-studio-embed.html (pasteable)',
  await readFile(here('dasha-studio-embed.html'), 'utf8'), 'SoftwareApplication');

/* The sitemap is a file in this repo that has to be pasted into Webflow's SEO settings. Checking it
   here at least guarantees the thing we would paste is well-formed and lists exactly the real routes. */
const sitemap = await readFile(here('dasha-sitemap.xml'), 'utf8');
for (const [route] of ROUTES) {
  check(sitemap.includes(`${ORIGIN}${route}`), `dasha-sitemap.xml is missing ${route}`);
}
check(!/webflow\.io/.test(sitemap), 'dasha-sitemap.xml advertises a staging URL');
/* Chess is a real public route that lives on the lobby host and declares that host canonical, so it
   belongs in the sitemap while sitting outside the www ROUTES table above — which checks canonicals
   against ORIGIN and would demand chess claim a URL it deliberately does not. Listed here so the
   count stays exact: the point of that assertion is to catch a route quietly added or dropped, and
   it can only do that if every legitimate entry is accounted for somewhere. */
/* Forum joined chess here on 2026-08-12, on the same terms: a real public route, served from the
   Worker, declaring lobby.getdasha.com canonical, so that is the URL listed. It was held out of the
   sitemap while it was unreachable — listing a route nothing links to is how a crawler finds a page
   no visitor can — and it goes in now that the homepage links it and the page carries social meta. */
const OFF_ORIGIN_SITEMAP_URLS = ['https://lobby.getdasha.com/chess', 'https://lobby.getdasha.com/forum'];
for (const url of OFF_ORIGIN_SITEMAP_URLS) {
  check(sitemap.includes(url), `dasha-sitemap.xml is missing ${url}`);
}
const expectedLocs = ROUTES.length + OFF_ORIGIN_SITEMAP_URLS.length;
check((sitemap.match(/<loc>/g) || []).length === expectedLocs,
  `dasha-sitemap.xml lists ${(sitemap.match(/<loc>/g) || []).length} URLs; there are ${expectedLocs} real routes`);

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
    if (type) checkJsonLd(`live ${route}`, html, type);

    // Canonical must be absolute and point at the route it is on, or duplicates get indexed.
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    check(canonical === `${ORIGIN}${route}` || canonical === `${ORIGIN}${route}/`,
      `${route}: canonical is ${canonical || 'missing'}`);

    // The share card: a separate binary on a CDN that can rot with nothing in this repo changing.
    const imageTags = (html.match(/<meta\b[^>]*>/gi) || []).filter((tag) => /property=["']og:image["']/i.test(tag));
    const images = imageTags.map((tag) => tag.match(/content=["']([^"']+)["']/i)?.[1]).filter(Boolean);
    const image = images[0];
    check(!!image, `${route}: no og:image — shared links unfurl bare`);
    check(images.length === 1, `${route}: expected one og:image, found ${images.length} (${[...new Set(images)].join(', ')})`);
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

  /* The embed we invite other people to paste. Two lines on their page, one script on GitHub Pages,
     and from that moment their site's Studio is whatever that URL serves. If CI stops deploying it,
     or it drifts from what this repo tests, every site that took us up on the offer breaks or runs
     something nobody gated — and we would never see it, because it is not our page. Byte-comparing
     against the local file is the whole guarantee: the local one is already proven to mount inside
     a hostile host, and identical bytes mount identically. */
  const hosted = await get('https://uuriko.github.io/dasha-desk/studio/embed.js');
  if (hosted) {
    check(hosted.ok, `the pasteable embed is HTTP ${hosted.status} — every site that embedded us is broken`);
    if (hosted.ok) {
      const type = hosted.headers.get('content-type') || '';
      check(/javascript/i.test(type), `the pasteable embed is served as "${type}" — browsers with nosniff will refuse it`);
      const served = await hosted.text();
      const localEmbed = await readFile(here('dasha-studio-embed.js'), 'utf8');
      check(served === localEmbed,
        'the hosted embed has drifted from dasha-studio-embed.js — other people\'s sites are running something this repo did not gate');
    }
  }

  /* The Studio on /studio is not inline: the page ships a shell and pulls its client from the Worker
     to clear Webflow's ~50 KB embed cap, pinning the client's SHA-384 in the script tag. That makes
     the pin and the client one atomic unit split across two systems, and a Worker deploy changes the
     client without touching the pin. On 2026-08-10 exactly that happened: the deploy succeeded, the
     page returned 200, every content assertion passed, and browsers refused the script for a day
     while /studio rendered nothing but "Loading studio…". A live page can be correct in every string
     and still be dead. This is the check that says so — recompute the hash, compare it to the pin. */
  const studioPage = await get(`${ORIGIN}/studio`);
  if (studioPage?.ok) {
    const studioHtml = await studioPage.text();
    /* /studio has shipped two ways: a self-contained inline embed, and a shell that pulls its client
       from the Worker. Only the second can suffer this failure, and demanding a pin unconditionally
       would fail the safer arrangement for being safe. So require the pin only when an external
       client is actually loaded, and say so loudly if one is loaded without a pin. */
    const external = studioHtml.match(/<script[^>]*src="([^"]*client\/studio\.js)"[^>]*>/);
    const tag = studioHtml.match(/<script[^>]*src="([^"]*client\/studio\.js)"[^>]*integrity="([^"]+)"/);
    check(!external || !!tag,
      '/studio loads an external client with no integrity pin — a swapped client would run unchallenged');
    if (tag) {
      const [, clientUrl, pinned] = tag;
      /* Read the algorithm out of the pin rather than assuming sha384. Assuming it is how the first
         sweep for this bug reported every page's jQuery as dead — that pin is sha256, and comparing
         it against a sha384 digest fails every time while the site is perfectly healthy. A check that
         cries wolf about a working page is worse than no check, because the next real one gets
         waved through. */
      const [algorithm] = pinned.split('-');
      check(['sha256', 'sha384', 'sha512'].includes(algorithm),
        `/studio pins an unrecognised integrity algorithm (${algorithm}) — this check cannot verify it`);
      const clientRes = await get(clientUrl);
      if (clientRes?.ok && ['sha256', 'sha384', 'sha512'].includes(algorithm)) {
        const body = Buffer.from(await clientRes.arrayBuffer());
        const actual = `${algorithm}-${createHash(algorithm).update(body).digest('base64')}`;
        check(actual === pinned,
          `/studio pins ${pinned} but ${clientUrl} is ${actual} — the browser refuses the script and the Studio does not load at all`);
      }
    }
  }

  /* Every route that claims art of its own must actually have a distinct file: a repoint that fell
     back would otherwise leave two routes on one card with nothing else showing it. Routes on
     SITE_CARD share by decision, so they are excluded — counting them made this check unsatisfiable
     (four routes, three files) and it sat red for long enough to stop meaning anything. */
  const own = ROUTES.map(([, , , card]) => card).filter((card) => card !== SITE_CARD);
  check(new Set(own).size === own.length, 'two routes share a card file — the per-route cards collapsed');

  report();
}

function report() {
  if (failures.length) {
    console.error(`Dasha discovery: ${failures.length} FAILURE(S)${local ? ' (sources)' : ` on ${ORIGIN}`}\n`);
    for (const f of failures) console.error('  · ' + f);
    process.exit(1);
  }
  console.log(local
    ? 'Dasha discovery: PASS (sources — the pasteable embed carries structured data, sitemap well-formed). '
      + 'Route structured data lives in Webflow page settings and is only verifiable live.'
    : `Dasha discovery: PASS (${ORIGIN} — structured data, canonicals, share cards resolve and match, robots, sitemap)`);
}
