#!/usr/bin/env node
/**
 * The public URLs we know how to look for, and who owns each one.
 *
 * On 2026-08-08 getdasha.com/how-to-buy was found by accident. It is a real page with the mint on
 * it, served by a Cloudflare edge worker, absent from the Webflow page list, 404 on staging, touched
 * by no publish path in either repo — and it was still serving four pieces of copy the operator had
 * removed everywhere else, including a claim that had become false. Nothing was wrong with any gate.
 * The page simply was not in any of their lists, and a list is only as good as the thing that
 * questions it.
 *
 * So this widens the list rather than trusting one: it seeds from the paths we have historically
 * built and adds whatever the live sitemap and robots file announce, then asks of each live one:
 * does anything here own you?
 *
 * It is a bounded inventory audit, not true discovery, and the distinction matters — it queries no
 * Webflow or Cloudflare inventory, so a surface that is in none of those places and that nobody
 * thought to seed here is still invisible to it. That is exactly how /how-to-buy hid, and adding
 * those two APIs is the only thing that would close it properly. Calling this "every surface" would
 * recreate the false confidence it was written to remove.
 *
 * A 200 with no owner is the failure. It means content is being served to the public that no source
 * in this repo can update, no gate reads, and no sweep will ever reach.
 *
 *   node dasha-surfaces.test.mjs
 *   node dasha-surfaces.test.mjs --json
 */
import { readFile, stat } from 'node:fs/promises';

const ORIGIN = 'https://www.getdasha.com';
const asJson = process.argv.includes('--json');

/* Who owns what. "Owner" means: a file in a repo we control, reachable by a publish path we can
   name. If you cannot name both, it does not belong here — inventing an owner is how /how-to-buy
   looked fine on paper for as long as it did. */
const OWNERS = {
  '/': { source: 'dasha-landing.html', via: 'dasha-ship.mjs --only=home' },
  '/studio': { source: 'dasha-studio-embed.html', via: 'dasha-ship.mjs --only=studio' },
  '/dasha': { source: 'dasha-desk/src/body.html', via: 'dasha-ship.mjs --only=desk' },
  '/lobby': { source: 'dasha-lobby-page.html', via: 'dasha-ship.mjs --only=lobby' },
  /* Source nominally moved here on 2026-08-09, after the worker tree shipped its own copy of this
     page from a file no gate in this repo had ever seen — live had a stale card and no structured
     data while the main root believed it had both.

     This comment used to claim "the build now reads this file". It does not.
     .grok/worktrees/potter/dasha/dasha-lobby-assets-build.mjs:158 reads
     `join(root, 'dasha-how-to-buy.html')` with `root` set to its own directory (line 14), so the
     worker-tree copy is still the one that ships. The move was never finished, and the sentence
     saying it was is the same invented-owner failure the table above warns about — written here, in
     the file that exists to catch it. What actually holds the two in sync is
     dasha-how-to-buy.test.mjs, which byte-compares them and tells you to cp. `foreign` stays true. */
  '/how-to-buy': {
    source: 'dasha-how-to-buy.html',
    via: 'dasha-lobby-assets-build.mjs --write, then dasha:lobby:deploy in the worker tree',
    foreign: true,
  },
  /* Chess went live from the worker tree without an entry here, so a public route with games,
     ratings and shareable challenge links was answering 200 while nothing in this repo could
     update, gate or sweep it — which is the precise failure this table exists to make loud. */
  '/chess': {
    source: '.grok/worktrees/potter/dasha/dasha-chess-page.html',
    via: 'dasha-lobby-assets-build.mjs --write, then dasha:lobby:deploy in the worker tree',
    foreign: true,
  },
};

/* Paths we have built at some point, whether or not they are live. A 404 here is a fine answer and
   is reported as such; the point is to notice when one of them quietly starts answering 200.

   The /my-projects and /digital-illustrations entries are CMS item pages from the 2020 template this
   site was built on. Ten items are still published in the CMS — logo mockups and lorem-ipsum
   illustrations, "Voluptatum Distinctio" and friends — and their collection templates still exist.
   Their URLs 404 today, which is the answer we want, and it is worth checking rather than assuming:
   the items are one template publish away from being live pages on a crypto domain, and a sitemap
   cannot warn about a URL that does not exist yet. */
const HISTORICAL = ['/capsule', '/relay-lab', '/remix-pack', '/desk-rc', '/retired-dasha-draft',
  /* /rally was an owned route until its source was deleted from the worker tree. It now 308s to the
     homepage on both hosts and appears in no sitemap, so it is retired, not broken — it belongs on
     the watch list rather than in OWNERS. It sat in OWNERS naming a deleted file for as long as
     nothing checked. */
  '/rally',
  '/checkout', '/paypal-checkout', '/order-confirmation', '/simp', '/lobby',
  '/my-projects/earth-energy-concept-logo', '/digital-illustrations/omnis-dolor-adipisci',
  '/projects/optio', '/category/uncategorized', '/product/example'];

const failures = [];
const warnings = [];

/* The table above says an owner must be "a file in a repo we control" and warns that inventing one
   is how /how-to-buy looked fine on paper. Nothing enforced that, so the table could — and did —
   name a source that no longer exists while this file reported zero failures. An owner nobody can
   open is the same as no owner at all, so check the claim instead of trusting it. */
for (const [path, owner] of Object.entries(OWNERS)) {
  const exists = await stat(new URL(`./${owner.source}`, import.meta.url)).then(() => true, () => false);
  if (!exists) failures.push(`${path}: OWNERS names ${owner.source}, which does not exist — the route has no real owner`);
}

async function probe(path) {
  const row = { path, get: 0, head: 0, edge: null, bytes: 0 };
  try {
    const res = await fetch(ORIGIN + path, { redirect: 'manual' });
    row.get = res.status;
    row.edge = res.headers.get('x-dasha-edge');
    if (res.status === 200) row.bytes = (await res.text()).length;
  } catch (e) { row.error = e.message; }
  try {
    const res = await fetch(ORIGIN + path, { method: 'HEAD', redirect: 'manual' });
    row.head = res.status;
  } catch { row.head = 0; }
  return row;
}

// ---- discover, rather than assume -------------------------------------------
const found = new Set(Object.keys(OWNERS));
for (const p of HISTORICAL) found.add(p);

const sitemapLive = await fetch(`${ORIGIN}/sitemap.xml`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
for (const m of sitemapLive.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
  try { found.add(new URL(m[1]).pathname.replace(/\/$/, '') || '/'); } catch {}
}
const robots = await fetch(`${ORIGIN}/robots.txt`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
for (const m of robots.matchAll(/^\s*(?:allow|disallow):\s*(\/\S*)/gim)) {
  if (m[1] !== '/') found.add(m[1].replace(/\/$/, ''));
}
const localSitemap = await readFile(new URL('./dasha-sitemap.xml', import.meta.url), 'utf8').catch(() => '');
for (const m of localSitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
  try { found.add(new URL(m[1]).pathname.replace(/\/$/, '') || '/'); } catch {}
}

const rows = [];
for (const path of [...found].sort()) rows.push(await probe(path));

for (const row of rows) {
  const owner = OWNERS[row.path];
  if (row.get === 200 && !owner) {
    failures.push(`${row.path} serves 200 and nothing in this repo owns it`
      + `${row.edge ? ` (x-dasha-edge: ${row.edge})` : ''} — it cannot be updated, gated or swept`);
  }
  /* /checkout, /paypal-checkout and /order-confirmation are Webflow ECOMMERCE SYSTEM pages, and the
     Data API cannot retire them. Setting draft:true returns success and changes nothing; changing
     the slug returns the new title and keeps the old slug. Both were tried on 2026-08-08 — recorded
     so the next person does not spend the same half hour discovering it.
     What did work, and this is the part worth remembering: the pages cannot be unpublished, but their
     CONTENTS can be hidden. Each is a single top-level commerce container — CommerceCheckoutFormContainer,
     CommercePaypalCheckoutFormContainer, CommerceOrderConfirmationContainer — and set_visibility false
     on that one element empties the page. They went from 28-58 KB of card-entry form to about 5 KB
     with zero payment fields. Reversible, and it needed no Designer session.

     The route still answers 200 and still has no owner, so this stays red — that is the real defect
     and it is unchanged. But it is now a stale empty page rather than a form asking strangers for
     card numbers on a domain whose whole pitch is not getting scammed. Removing them outright still
     wants Ecommerce disabled in the Designer, which also clears the leftover CMS collections. */
  /* HEAD and GET disagreeing is not cosmetic: crawlers and link unfurlers commonly send HEAD first
     and treat a 404 as a missing page, so the surface can be live and invisible at the same time. */
  if (row.get === 200 && row.head !== 200 && row.head !== 0) {
    warnings.push(`${row.path}: GET says 200 but HEAD says ${row.head} — HEAD-first crawlers see nothing`);
  }
  if (owner?.foreign && row.get === 200) {
    warnings.push(`${row.path}: live, but its publish path is outside this repo (${owner.via})`);
  }
  // A surface we own that has stopped answering is worth knowing about too.
  if (owner && !owner.foreign && row.get !== 200) {
    failures.push(`${row.path}: owned by ${owner.source} but returns ${row.get}`);
  }
}

if (asJson) {
  console.log(JSON.stringify({ ok: failures.length === 0, rows, failures, warnings }, null, 2));
} else {
  console.log(`\nPublic surfaces on ${ORIGIN}\n`);
  console.log('  path                      GET  HEAD    bytes  owner');
  for (const row of rows) {
    const owner = OWNERS[row.path];
    const label = owner ? (owner.foreign ? `${owner.source} (foreign publish path)` : owner.source)
      : (row.get === 200 ? 'NOBODY' : '—');
    console.log(`  ${row.path.padEnd(24)} ${String(row.get).padStart(3)} ${String(row.head).padStart(5)}`
      + ` ${String(row.bytes || '').padStart(8)}  ${label}`);
  }
  console.log();
  for (const w of warnings) console.log('  warn  ' + w);
  for (const f of failures) console.error('  FAIL  ' + f);
  console.log(`\n${rows.filter((r) => r.get === 200).length} live · ${failures.length} failure(s) · ${warnings.length} warning(s)`);
}

process.exit(failures.length ? 1 : 0);
