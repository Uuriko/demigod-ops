#!/usr/bin/env node
/**
 * demigod-site-schema — the JSON-LD trydemigod.com does not have, built from data it does.
 *
 * WHY THESE THREE TYPES
 * Schema.org and Google published usage statistics for the whole web in June 2026, so the crowding
 * of each type is now a measured fact rather than a guess. `Organization` and `BreadcrumbList` sit
 * in the band found on over 10 million domains — universal enough that their absence is the
 * conspicuous thing. `Dataset` sits at 10K–100K domains, which for a site whose entire substance is
 * a dataset is an uncrowded slot nobody local is standing in.
 *
 * The reason to care is citation, not ranking: both Google and Microsoft have said structured data
 * is what lets their models understand and cite a page, and JSON-LD is the format every engine
 * reads. A page that renders its facts only in JavaScript is invisible to the crawlers that do the
 * citing — they fetch HTML once and never execute.
 *
 * NO INVENTED FIELDS
 * `temporalCoverage` is computed from the observation history, not typed in. `license` is omitted
 * rather than guessed — a licence is a legal claim, and asserting one in machine-readable form
 * because the schema has a slot for it is how a directory starts lying in a format built to be
 * trusted. Same for `sameAs`: only profiles that are verified to exist.
 *
 *   node demigod-site-schema.mjs --dataset      # Dataset JSON-LD for the startup map
 *   node demigod-site-schema.mjs --org
 *   node demigod-site-schema.mjs --breadcrumb /startups
 *   node demigod-site-schema.mjs --all --json
 *   node demigod-site-schema.mjs --selftest
 *
 * Schema: demigod.site-schema/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SITE = 'https://trydemigod.com';

/**
 * Render any JSON-LD object as an embeddable script tag.
 *
 * Escaping `<` is not cosmetic: a company name containing "</script>" would otherwise break out of
 * the tag. Same rule as demigod-faq-schema.mjs, which is where it was first needed.
 */
export function jsonLdScript(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

/** Read the artifacts the schema describes. Anything missing is omitted, never filled in. */
export function schemaFacts({ root = ROOT } = {}) {
  const read = (file) => {
    try { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); } catch { return null; }
  };
  const map = read('DEMIGOD-SF-STARTUP-MAP.json');
  const archive = read('DEMIGOD-ROLE-LEDGER-ARCHIVE.json');
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const counted = companies.filter((row) => Number.isSafeInteger(row?.openRoles));

  // temporalCoverage is the span we actually observed, taken from first and last sighting.
  const days = [];
  for (const row of Object.values(archive?.observations || {})) if (row.firstSeen) days.push(row.firstSeen);
  for (const row of Object.values(archive?.closed || {})) if (row.firstSeen) days.push(row.firstSeen);
  days.sort();

  return {
    companies: companies.length,
    boards: counted.length,
    openRoles: counted.reduce((sum, row) => sum + row.openRoles, 0),
    closedObserved: Object.keys(archive?.closed || {}).length,
    modified: map?.coverage?.openRolesAt || archive?.updatedAt || null,
    from: days[0] || null,
    to: days[days.length - 1] || null,
  };
}

/**
 * PURE. `Dataset` for the startup map.
 *
 * `variableMeasured` is where the differentiator becomes machine-readable: "roles observed closing"
 * is a measurement nobody can reconstruct after the fact, and naming it as a variable is what lets
 * an engine cite it as a distinct quantity rather than folding it into a generic count.
 */
export function datasetJsonLd(facts, { site = SITE } = {}) {
  if (!facts || !facts.companies) {
    throw new Error('site-schema: no map to describe — refusing to publish a Dataset for data that is not there');
  }
  const measured = [
    { '@type': 'PropertyValue', name: 'Companies tracked', value: facts.companies },
    { '@type': 'PropertyValue', name: 'Employer job boards read', value: facts.boards },
    { '@type': 'PropertyValue', name: 'Open roles held', value: facts.openRoles },
  ];
  if (facts.closedObserved) {
    measured.push({ '@type': 'PropertyValue', name: 'Roles observed closing', value: facts.closedObserved });
  }
  const out = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'San Francisco startup hiring signals',
    description: 'Open roles, board-read outcomes and observed role closures across San Francisco '
      + 'technology companies, read from public employer job boards. Boards that could not be read '
      + 'are recorded as unread rather than as empty.',
    url: `${site}/startups`,
    creator: { '@type': 'Organization', name: 'Demigod', url: site },
    isAccessibleForFree: true,
    variableMeasured: measured,
  };
  if (facts.modified) out.dateModified = String(facts.modified).slice(0, 10);
  if (facts.from && facts.to) out.temporalCoverage = `${facts.from}/${facts.to}`;
  return out;
}

/** PURE. `Organization`. `sameAs` only carries profiles passed in — never a guessed handle. */
export function organizationJsonLd({ site = SITE, sameAs = [] } = {}) {
  const out = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Demigod',
    url: site,
    description: 'Hiring signals for San Francisco technology companies, read from public employer job boards.',
  };
  const links = (sameAs || []).map((s) => String(s).trim()).filter((s) => /^https:\/\//.test(s));
  if (links.length) out.sameAs = links;
  return out;
}

/** PURE. `BreadcrumbList` for a route. One level deep, because the site is one level deep. */
export function breadcrumbJsonLd(route, { site = SITE, name } = {}) {
  const clean = `/${String(route || '').replace(/^\/+|\/+$/g, '')}`;
  const items = [{ '@type': 'ListItem', position: 1, name: 'Demigod', item: site }];
  if (clean !== '/') {
    const label = name || clean.slice(1).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
    items.push({ '@type': 'ListItem', position: 2, name: label, item: `${site}${clean}` });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`site-schema selftest: ${msg}`); };
  const facts = schemaFacts();
  assert(facts.companies > 2000, `expected the live map, got ${facts.companies}`);

  const ds = datasetJsonLd(facts);
  assert(ds['@type'] === 'Dataset' && ds['@context'] === 'https://schema.org', 'root type and context');
  assert(ds.variableMeasured.some((v) => v.name === 'Roles observed closing'), 'the unreproducible measurement is named');
  assert(ds.variableMeasured.every((v) => Number.isSafeInteger(v.value)), 'every measured value is a real integer');
  assert(!('license' in ds), 'a licence is a legal claim and must not be invented to fill a slot');
  assert(/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(ds.temporalCoverage), `temporalCoverage is a real span, got ${ds.temporalCoverage}`);

  // Missing facts drop their fields rather than emitting null or a guess.
  const bare = datasetJsonLd({ companies: 5, boards: 1, openRoles: 2, closedObserved: 0, modified: null, from: null, to: null });
  assert(!('dateModified' in bare) && !('temporalCoverage' in bare), 'unknown dates are absent, not null');
  assert(!bare.variableMeasured.some((v) => v.name === 'Roles observed closing'), 'a zero observation is not advertised as a measurement');
  let threw = false;
  try { datasetJsonLd({ companies: 0 }); } catch { threw = true; }
  assert(threw, 'an empty map must not yield a confident Dataset');

  // sameAs must not accept a guess.
  assert(!('sameAs' in organizationJsonLd()), 'no profiles means no sameAs key');
  assert(organizationJsonLd({ sameAs: ['https://x.com/a', 'not a url', 'http://insecure'] }).sameAs.length === 1, 'only verified https links survive');

  const crumb = breadcrumbJsonLd('/startups');
  assert(crumb.itemListElement.length === 2 && crumb.itemListElement[1].item === 'https://trydemigod.com/startups', 'route breadcrumb');
  assert(breadcrumbJsonLd('/').itemListElement.length === 1, 'the homepage is its own only crumb');
  assert(breadcrumbJsonLd('startups').itemListElement[1].item === 'https://trydemigod.com/startups', 'a missing leading slash is tolerated');
  assert(breadcrumbJsonLd('/posting-age').itemListElement[1].name === 'Posting age', 'a hyphenated route gets a readable label');

  // The escape that stops a company name from closing the script tag.
  const evil = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });
  assert(!evil.includes('</script><img'), 'a payload must not break out of the JSON-LD tag');
  assert(evil.includes('\\u003c'), 'the escape is the documented one');

  console.log(JSON.stringify({ ok: true, selftest: 'site-schema', companies: facts.companies, span: `${facts.from}/${facts.to}` }));
}

if (isMain) {
  const args = process.argv.slice(2);
  const facts = () => schemaFacts();
  if (args.includes('--selftest')) selftest();
  else if (args.includes('--dataset')) console.log(args.includes('--json') ? JSON.stringify(datasetJsonLd(facts()), null, 2) : jsonLdScript(datasetJsonLd(facts())));
  else if (args.includes('--org')) console.log(args.includes('--json') ? JSON.stringify(organizationJsonLd(), null, 2) : jsonLdScript(organizationJsonLd()));
  else if (args.includes('--breadcrumb')) {
    const route = args[args.indexOf('--breadcrumb') + 1] || '/';
    console.log(args.includes('--json') ? JSON.stringify(breadcrumbJsonLd(route), null, 2) : jsonLdScript(breadcrumbJsonLd(route)));
  } else {
    const f = facts();
    console.log(JSON.stringify({ dataset: datasetJsonLd(f), organization: organizationJsonLd(), breadcrumb: breadcrumbJsonLd('/startups') }, null, 2));
  }
}
