#!/usr/bin/env node
/**
 * Identity review candidates — companies that may be one company listed twice.
 *
 *   node demigod-identity-review.mjs
 *   node demigod-identity-review.mjs --json
 *   node demigod-identity-review.mjs --selftest
 *
 * WHY
 * Cross-source dedupe in demigod-startup-map-data.mjs keys ONLY on website host. That is a
 * deliberate, well-argued choice — its comment explains that a false merge poisons every
 * downstream claim about both companies and is worse than carrying a duplicate. But it has a blind
 * spot: a row with no website has no key, so it can never merge no matter how obvious the match.
 * Measured 2026-07-31 on the live map: four companies appear twice, each as a YC row carrying the
 * website plus an HN row carrying none, because rejecting the ATS URL as a company website (the
 * correct fix for a different bug) removed the only dedupe key those rows had.
 *
 * WHY THIS DOES NOT MERGE ANYTHING
 * Name equality is not identity. The same live map holds Atlas (atlascard.com) and Atlas
 * (atlas.so), Alex (alexcodes.app) and Alex (alex.com), Candor (candor.security) and Candor
 * (usecandor.ai) — distinct companies with identical names. Auto-merging on name would silently
 * destroy them. So this reports candidates with the evidence for each and merges nothing, ever.
 * A human decides; the map is not touched.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeCompanyName } from './demigod-startup-atlas.mjs';
import { websiteHostKey } from './demigod-startup-map-data.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/**
 * PURE. Group companies by normalized name and classify each multi-row group.
 * Never mutates, never merges.
 */
export function identityReview(map) {
  const companies = Array.isArray(map?.companies) ? map.companies.filter((c) => c && typeof c === 'object') : [];
  const byName = new Map();
  for (const c of companies) {
    const key = normalizeCompanyName(c.name);
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(c);
  }
  const groups = [];
  for (const [name, rows] of byName) {
    if (rows.length < 2) continue;
    const hosts = new Set(rows.map((r) => websiteHostKey(r.website)).filter(Boolean));
    const missingWebsite = rows.filter((r) => !websiteHostKey(r.website)).length;
    const sources = new Set(rows.map((r) => r.source).filter(Boolean));
    // Three outcomes, and only one of them is a candidate.
    // - distinct-websites: different hosts => almost certainly different companies. NOT a candidate.
    // - unmergeable-missing-website: at least one row has no host, so host dedupe could never fire.
    //   This is the blind spot, and the only class worth a human's time.
    // - same-website-not-merged: identical host that survived dedupe — a real defect in the merge,
    //   not an identity question.
    let verdict;
    if (hosts.size > 1 && missingWebsite === 0) verdict = 'distinct-websites';
    else if (missingWebsite > 0) verdict = 'unmergeable-missing-website';
    else verdict = 'same-website-not-merged';
    groups.push({
      name,
      rows: rows.length,
      sources: [...sources],
      crossSource: sources.size > 1,
      distinctHosts: hosts.size,
      missingWebsite,
      verdict,
      // Evidence, not a decision. Everything a reviewer needs to judge it themselves.
      evidence: rows.map((r) => ({
        id: r.id,
        source: r.source || null,
        website: r.website || null,
        hostKey: websiteHostKey(r.website) || null,
        hiring: r.hiring === true || r.hiring === 'yes',
      })),
    });
  }
  groups.sort((a, b) => (a.verdict < b.verdict ? -1 : a.verdict > b.verdict ? 1 : 0) || (a.name < b.name ? -1 : 1));
  const candidates = groups.filter((g) => g.verdict === 'unmergeable-missing-website');
  return {
    schema: 'demigod.identity-review/1',
    companies: companies.length,
    counts: {
      nameGroups: groups.length,
      reviewCandidates: candidates.length,
      distinctWebsites: groups.filter((g) => g.verdict === 'distinct-websites').length,
      sameWebsiteNotMerged: groups.filter((g) => g.verdict === 'same-website-not-merged').length,
      // The directory publishes a company count; this is how many rows a reviewer might collapse.
      inflationUpperBound: candidates.reduce((n, g) => n + (g.rows - 1), 0),
    },
    groups,
  };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const co = (o) => ({ id: 'x', name: 'Acme', website: 'https://acme.com/', source: 'Y Combinator', ...o });
  const map = (rows) => ({ companies: rows });

  // Distinct websites => different companies, never a candidate. This is the Atlas/Alex/Candor case.
  {
    const r = identityReview(map([
      co({ id: 'yc:a', website: 'https://atlascard.com/' , name: 'Atlas' }),
      co({ id: 'yc:b', website: 'https://atlas.so/', name: 'Atlas' }),
    ]));
    assert(r.groups[0].verdict === 'distinct-websites', `distinct hosts are not a merge candidate, got ${r.groups[0].verdict}`);
    assert(r.counts.reviewCandidates === 0, 'and they never enter the review queue');
    assert(r.counts.inflationUpperBound === 0, 'nor inflate the count estimate');
  }

  // The real blind spot: one row has no website, so host dedupe could never fire.
  {
    const r = identityReview(map([
      co({ id: 'yc:middesk', name: 'Middesk', website: 'http://www.middesk.com/' }),
      co({ id: 'hn:jobs.ashbyhq.com/middesk', name: 'Middesk', website: null, source: 'Hacker News (Who is Hiring)' }),
    ]));
    const g = r.groups[0];
    assert(g.verdict === 'unmergeable-missing-website', `missing website is the candidate class, got ${g.verdict}`);
    assert(g.crossSource === true, 'cross-source is recorded as evidence');
    assert(g.missingWebsite === 1, 'the count of keyless rows is evidence too');
    assert(r.counts.reviewCandidates === 1 && r.counts.inflationUpperBound === 1, 'one collapsible row');
    assert(g.evidence.length === 2 && g.evidence.every((e) => 'hostKey' in e), 'evidence carries the key that failed');
  }

  // Identical host that survived dedupe is a merge defect, not an identity question.
  {
    const r = identityReview(map([co({ id: 'a' }), co({ id: 'b' })]));
    assert(r.groups[0].verdict === 'same-website-not-merged', 'same host is a merge defect');
    assert(r.counts.reviewCandidates === 0, 'and is not a review candidate');
  }

  // Single-row names and degenerate input produce nothing.
  assert(identityReview(map([co({})])).groups.length === 0, 'a unique name is not a group');
  assert(identityReview(null).groups.length === 0, 'null map -> empty');
  assert(identityReview({ companies: ['junk'] }).groups.length === 0, 'malformed rows ignored');

  console.log(JSON.stringify({ ok: true, selftest: 'identity-review' }));
  process.exitCode = 0;
} else if (isMain) {
  const r = identityReview(JSON.parse(fs.readFileSync(MAP, 'utf8')));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    const c = r.counts;
    console.log(
      `identity review · ${r.companies} companies · ${c.nameGroups} shared-name groups\n` +
      `  ${c.reviewCandidates} review candidate(s) — a row with no website can never host-dedupe ` +
      `(up to ${c.inflationUpperBound} collapsible row(s))\n` +
      `  ${c.distinctWebsites} group(s) are distinct companies sharing a name — NOT duplicates\n` +
      `  ${c.sameWebsiteNotMerged} group(s) share a website host and survived dedupe (merge defect)\n`,
    );
    for (const g of r.groups.filter((x) => x.verdict !== 'distinct-websites')) {
      console.log(`  ${g.verdict}  ${g.name}`);
      for (const e of g.evidence) console.log(`     ${String(e.id).padEnd(40)} ${e.source || '-'} · host=${e.hostKey || 'NONE'}`);
    }
  }
}
