#!/usr/bin/env node
// BADHOST is enforced when an HN post is PARSED, but the parsed rows are cached and replayed into
// the map on every rebuild. So a row captured before a host joined BADHOST keeps re-entering
// forever — that is how a company shipped in the public directory with website
// "https://producthunt.com/". The map now re-applies the ban when it reads the cache.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isCompanyWebsiteHost, isPlausibleHnCompanyName } from './demigod-hn-hiring.mjs';

// Banned hosts are rejected however they are spelled.
assert.equal(isCompanyWebsiteHost('https://producthunt.com/'), false);
assert.equal(isCompanyWebsiteHost('https://www.producthunt.com/posts/fathom'), false);
assert.equal(isCompanyWebsiteHost('https://linkedin.com/company/x'), false);
assert.equal(isCompanyWebsiteHost('https://angel.co/'), false);

// Real company sites pass — including ones whose name merely contains a banned substring.
assert.equal(isCompanyWebsiteHost('https://stripe.com/'), true);
assert.equal(isCompanyWebsiteHost('https://brex.com/'), true, 'brex.com must not match x.com');
assert.equal(isCompanyWebsiteHost('https://getdex.com/'), true, 'getdex.com must not match x.com');
assert.equal(isCompanyWebsiteHost('http://www.lygos.com/'), true);

// A missing website is an honest state the directory renders as "no verified website on record".
// It must NOT be treated as a banned host, or the ATS-slug rows vanish instead of listing.
assert.equal(isCompanyWebsiteHost(null), true);
assert.equal(isCompanyWebsiteHost(''), true);
assert.equal(isCompanyWebsiteHost('not a url'), true);

// The map must actually apply it at the cache-read boundary, not just export it.
const mapSrc = fs.readFileSync(new URL('./demigod-startup-map-data.mjs', import.meta.url), 'utf8');
assert.match(mapSrc, /isPlausibleHnCompanyName\(row\.name\) && isCompanyWebsiteHost\(row\.website\)/);

// The four identities Grok's BLOCK review caught passing every targeted selftest.
for (const url of ['https://app.deel.com/', 'https://tally.so/', 'https://youtu.be/', 'https://grnh.se/']) {
  assert.equal(isCompanyWebsiteHost(url), false, `${url} is not a company identity`);
}
// ...and the registrable-domain fallback that catches subdomains of a banned host.
assert.equal(isCompanyWebsiteHost('https://app.deel.com/x'), false, 'subdomain of a banned host');
assert.equal(isCompanyWebsiteHost('https://jobs.deelicious.com/'), true, 'deelicious.com is not deel.com');

// Fail-capable on CONSTRUCTED rows, never on whatever the live cache happens to contain today.
// The cache has since been re-collected and holds none of these, so asserting against it would
// be a vacuous green — the filter would still "pass" if it stopped filtering entirely.
const filterRows = (rows) =>
  rows.filter((row) => isPlausibleHnCompanyName(row.name) && isCompanyWebsiteHost(row.website));
const synthetic = [
  { id: 'hn:producthunt.com', name: 'Cached Aggregator Co', website: 'https://producthunt.com/' },
  { id: 'hn:tally.so', name: 'Cached Form Co', website: 'https://tally.so/' },
  { id: 'hn:prose.example', name: 'I am a recruiter and this entire paragraph is not a company identity at all', website: 'https://prose.example/' },
  { id: 'hn:real.example', name: 'Real Co', website: 'https://real.example/' },
  { id: 'hn:boards.greenhouse.io/slugco', name: 'Slug Co', website: null },
];
assert.deepEqual(
  filterRows(synthetic).map((row) => row.id),
  ['hn:real.example', 'hn:boards.greenhouse.io/slugco'],
  'banned hosts drop; a real site and a null-website ATS-slug row both survive',
);

// Live cache is reported, not asserted on — it is context, not the gate.
const cache = JSON.parse(fs.readFileSync(new URL('./DEMIGOD-HN-HIRING.json', import.meta.url), 'utf8'));
const banned = cache.companies.filter((row) => !isCompanyWebsiteHost(row.website));
console.log(`hn cache badhost guard: PASS · live cache ${cache.companies.length} rows, ${banned.length} would be filtered`);
