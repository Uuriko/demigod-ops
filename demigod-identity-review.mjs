#!/usr/bin/env node
/**
 * Identity review candidates — companies that may be one company listed twice.
 *
 *   node demigod-identity-review.mjs
 *   node demigod-identity-review.mjs --json
 *   node demigod-identity-review.mjs --apply-websites [--write] [--fill]
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
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/**
 * PURE proposal only: when exactly one sibling host exists, suggest that website for keyless rows.
 * Never applies; name equality is not identity (Atlas×2 etc.) — human confirms.
 */
export function proposeWebsiteBackfill(group) {
  if (!group || group.verdict !== 'unmergeable-missing-website') return null;
  const evidence = Array.isArray(group.evidence) ? group.evidence : [];
  const withHost = evidence.filter((e) => e?.hostKey);
  const uniqueHosts = [...new Set(withHost.map((e) => e.hostKey))];
  if (uniqueHosts.length !== 1) return null;
  const donor = withHost.find((e) => e.hostKey === uniqueHosts[0]);
  const targets = evidence.filter((e) => !e?.hostKey).map((e) => e.id).filter(Boolean);
  if (!donor?.website || !targets.length) return null;
  return {
    action: 'set-website',
    website: donor.website,
    hostKey: uniqueHosts[0],
    fromId: donor.id || null,
    targetIds: targets,
    note: 'proposal only until --apply-websites --write; never merges or deletes rows',
  };
}

/**
 * PURE. Act on unambiguous proposals.
 * mode=collapse (default): drop keyless target rows when a sibling already owns the only host
 *   (fixes directory inflation without inventing hosts on ATS-only HN shells).
 * mode=fill: set website on keyless rows, keep both rows (can create same-website-not-merged).
 * Never invents websites without a donor sibling. Caller writes if wanted.
 */
export function applyWebsiteProposals(map, { write = false, mode = 'collapse' } = {}) {
  const review = identityReview(map);
  const byId = new Map();
  for (const g of review.groups) {
    if (!g.proposal?.targetIds?.length || !g.proposal.website) continue;
    for (const id of g.proposal.targetIds) {
      byId.set(id, {
        website: g.proposal.website,
        fromId: g.proposal.fromId,
        name: g.name,
      });
    }
  }
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const applied = [];
  const skipped = [];
  const drop = new Set();
  let nextCompanies;
  if (mode === 'fill') {
    nextCompanies = companies.map((c) => {
      if (!c || typeof c !== 'object' || !c.id) return c;
      const prop = byId.get(c.id);
      if (!prop) return c;
      if (websiteHostKey(c.website)) {
        skipped.push({ id: c.id, reason: 'already-has-website' });
        return c;
      }
      applied.push({ id: c.id, action: 'fill', website: prop.website, fromId: prop.fromId, name: prop.name });
      return { ...c, website: prop.website };
    });
  } else {
    // collapse: remove keyless targets that have an unambiguous donor sibling
    for (const c of companies) {
      if (!c || typeof c !== 'object' || !c.id) continue;
      const prop = byId.get(c.id);
      if (!prop) continue;
      if (websiteHostKey(c.website)) {
        skipped.push({ id: c.id, reason: 'already-has-website' });
        continue;
      }
      // Refuse collapse if keyless row carries openRoles the donor lacks (would drop hiring facts).
      const donor = companies.find((x) => x?.id === prop.fromId);
      const targetRoles = Number(c.openRoles || 0);
      const donorRoles = Number(donor?.openRoles || 0);
      if (targetRoles > 0 && targetRoles > donorRoles) {
        skipped.push({ id: c.id, reason: 'keyless-has-more-openRoles', targetRoles, donorRoles });
        continue;
      }
      drop.add(c.id);
      applied.push({
        id: c.id,
        action: 'collapse',
        website: prop.website,
        fromId: prop.fromId,
        name: prop.name,
      });
    }
    nextCompanies = companies.filter((c) => c && !drop.has(c.id));
  }
  return {
    schema: 'demigod.identity-apply-websites/1',
    write: write === true,
    mode: mode === 'fill' ? 'fill' : 'collapse',
    applied,
    skipped,
    proposals: review.counts.proposals ?? applied.length,
    reviewCandidates: review.counts.reviewCandidates,
    map: { ...map, companies: nextCompanies },
  };
}

/**
 * Keep-score for same-website collapse. Prefer YC/Wikidata rows with team/stage/openRoles
 * over HN shells that only restate the same host (Hestus Inc. vs Hestus, 2026-08-06).
 */
export function sameWebsiteKeepScore(c) {
  if (!c || typeof c !== 'object') return -1;
  let s = 0;
  const id = String(c.id || '');
  if (id.startsWith('yc:')) s += 100;
  if (id.startsWith('wd:')) s += 40;
  if (id.startsWith('hn:')) s += 5;
  if (Number(c.openRoles) > 0) s += Math.min(50, Number(c.openRoles));
  if (Number.isFinite(c.teamSize) && c.teamSize > 0) s += 15;
  if (String(c.stage || '').trim()) s += 10;
  if (c.jobsUrl) s += 5;
  if (c.description) s += 3;
  return s;
}

/**
 * PURE. Collapse same-website-not-merged defects: one host, multiple rows under one name.
 * Keeps the highest-scored row; drops the rest. Transfers hiring=yes and openRoles when
 * the survivor lacks them. Never invents websites or roles.
 */
export function collapseSameWebsiteDefects(map) {
  const review = identityReview(map);
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const byId = new Map(companies.filter((c) => c?.id).map((c) => [c.id, c]));
  const drop = new Set();
  const applied = [];
  const keepMut = new Map(); // id -> patch
  for (const g of review.groups) {
    if (g.verdict !== 'same-website-not-merged') continue;
    const rows = (g.evidence || []).map((e) => byId.get(e.id)).filter(Boolean);
    if (rows.length < 2) continue;
    rows.sort((a, b) => sameWebsiteKeepScore(b) - sameWebsiteKeepScore(a) || String(a.id).localeCompare(String(b.id)));
    const keep = rows[0];
    let patch = keepMut.get(keep.id) || {};
    for (const r of rows.slice(1)) {
      drop.add(r.id);
      if ((r.hiring === 'yes' || r.hiring === true) && keep.hiring !== 'yes' && keep.hiring !== true) {
        patch = { ...patch, hiring: 'yes' };
      }
      const rRoles = Number(r.openRoles || 0);
      const kRoles = Number(patch.openRoles ?? keep.openRoles ?? 0);
      if (rRoles > kRoles) {
        patch = {
          ...patch,
          openRoles: rRoles,
          atsSource: r.atsSource || keep.atsSource,
          jobsUrl: r.jobsUrl || keep.jobsUrl,
          openRolesAt: r.openRolesAt || keep.openRolesAt,
        };
      }
      const tags = new Set([...(keep.tags || []), ...(r.tags || []), ...((patch.tags) || [])]);
      if (tags.size) patch = { ...patch, tags: [...tags] };
      applied.push({
        action: 'collapse-same-host',
        dropId: r.id,
        keepId: keep.id,
        hostKey: websiteHostKey(keep.website) || websiteHostKey(r.website),
        name: g.name,
      });
    }
    if (Object.keys(patch).length) keepMut.set(keep.id, patch);
  }
  const next = companies
    .filter((c) => c && !drop.has(c.id))
    .map((c) => (keepMut.has(c.id) ? { ...c, ...keepMut.get(c.id) } : c));
  return {
    schema: 'demigod.identity-collapse-same-host/1',
    applied,
    dropped: [...drop],
    map: { ...map, companies: next },
  };
}

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
    const evidence = rows.map((r) => ({
      id: r.id,
      source: r.source || null,
      website: r.website || null,
      hostKey: websiteHostKey(r.website) || null,
      hiring: r.hiring === true || r.hiring === 'yes',
    }));
    const group = {
      name,
      rows: rows.length,
      sources: [...sources],
      crossSource: sources.size > 1,
      distinctHosts: hosts.size,
      missingWebsite,
      verdict,
      // Evidence, not a decision. Everything a reviewer needs to judge it themselves.
      evidence,
    };
    group.proposal = proposeWebsiteBackfill(group);
    groups.push(group);
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
      proposals: candidates.filter((g) => g.proposal).length,
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
    assert(g.proposal?.action === 'set-website' && g.proposal.targetIds.includes('hn:jobs.ashbyhq.com/middesk'), 'proposal targets keyless row');
    assert(g.proposal.website.includes('middesk.com'), 'proposal website from donor');
    assert(r.counts.proposals === 1, 'proposal counted');
    // Ambiguous: two different hosts + keyless third → no proposal
    assert(
      proposeWebsiteBackfill({
        verdict: 'unmergeable-missing-website',
        evidence: [
          { id: 'a', hostKey: 'a.com', website: 'https://a.com/' },
          { id: 'b', hostKey: 'b.com', website: 'https://b.com/' },
          { id: 'c', hostKey: null, website: null },
        ],
      }) === null,
      'ambiguous hosts → no proposal',
    );
    // collapse mode drops keyless inflation shell when donor owns host
    const collapsed = applyWebsiteProposals(
      map([
        co({ id: 'yc:middesk', name: 'Middesk', website: 'http://www.middesk.com/', openRoles: 22 }),
        co({
          id: 'hn:jobs.ashbyhq.com/middesk',
          name: 'Middesk',
          website: null,
          source: 'Hacker News (Who is Hiring)',
        }),
      ]),
      { write: false, mode: 'collapse' },
    );
    assert(collapsed.applied.length === 1 && collapsed.applied[0].action === 'collapse', 'collapse one keyless');
    assert(collapsed.map.companies.length === 1 && collapsed.map.companies[0].id === 'yc:middesk', 'donor kept');
    // fill mode keeps both rows and sets website
    const filled = applyWebsiteProposals(
      map([
        co({ id: 'yc:middesk', name: 'Middesk', website: 'http://www.middesk.com/' }),
        co({
          id: 'hn:jobs.ashbyhq.com/middesk',
          name: 'Middesk',
          website: null,
          source: 'Hacker News (Who is Hiring)',
        }),
      ]),
      { write: false, mode: 'fill' },
    );
    assert(filled.map.companies.length === 2, 'fill keeps both rows');
    assert(filled.map.companies.find((c) => c.id.includes('hn:')).website.includes('middesk.com'), 'fill sets website');
    // refuse collapse when keyless has more openRoles than donor
    const refuse = applyWebsiteProposals(
      map([
        co({ id: 'yc:x', name: 'X', website: 'https://x.com/', openRoles: 0 }),
        co({ id: 'hn:jobs.ashbyhq.com/x', name: 'X', website: null, openRoles: 5 }),
      ]),
      { mode: 'collapse' },
    );
    assert(refuse.applied.length === 0 && refuse.skipped[0]?.reason === 'keyless-has-more-openRoles', 'protect hiring facts');
  }

  // Identical host that survived dedupe is a merge defect, not an identity question.
  {
    const r = identityReview(map([co({ id: 'a' }), co({ id: 'b' })]));
    assert(r.groups[0].verdict === 'same-website-not-merged', 'same host is a merge defect');
    assert(r.counts.reviewCandidates === 0, 'and is not a review candidate');
    const collapsed = collapseSameWebsiteDefects(
      map([
        co({ id: 'yc:hestus-inc', name: 'Hestus, Inc.', website: 'https://www.hestus.co/', teamSize: 3, stage: 'Early' }),
        co({ id: 'hn:hestus.co', name: 'Hestus', website: 'https://hestus.co/', source: 'Hacker News (Who is Hiring)', hiring: 'yes', tags: ['hn-hiring'] }),
      ]),
    );
    assert(collapsed.applied.length === 1 && collapsed.applied[0].dropId === 'hn:hestus.co', 'drop HN shell');
    assert(collapsed.map.companies.length === 1 && collapsed.map.companies[0].id === 'yc:hestus-inc', 'keep YC');
    assert(collapsed.map.companies[0].hiring === 'yes', 'hiring signal preserved');
    assert((collapsed.map.companies[0].tags || []).includes('hn-hiring'), 'hn tag carried over');
  }

  // Single-row names and degenerate input produce nothing.
  assert(identityReview(map([co({})])).groups.length === 0, 'a unique name is not a group');
  assert(identityReview(null).groups.length === 0, 'null map -> empty');
  assert(identityReview({ companies: ['junk'] }).groups.length === 0, 'malformed rows ignored');

  console.log(JSON.stringify({ ok: true, selftest: 'identity-review' }));
  process.exitCode = 0;
} else if (isMain && process.argv.includes('--collapse-same-host')) {
  const live = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const wantWrite = process.argv.includes('--write');
  const result = collapseSameWebsiteDefects(live);
  if (wantWrite && result.applied.length) {
    if (result.map.coverage && typeof result.map.coverage === 'object') {
      result.map.coverage.namedCompanies = result.map.companies.length;
    }
    atomicWrite(MAP, `${JSON.stringify(result.map)}\n`, { mode: 0o644 });
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        write: wantWrite,
        applied: result.applied,
        companiesBefore: live.companies?.length ?? null,
        companiesAfter: result.map.companies?.length ?? null,
        note: wantWrite
          ? result.applied.length
            ? `collapsed ${result.applied.length} same-host shell(s)`
            : 'nothing to collapse'
          : 'dry-run — pass --write to persist',
      },
      null,
      2,
    ),
  );
} else if (isMain && process.argv.includes('--apply-websites')) {
  const live = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const wantWrite = process.argv.includes('--write');
  const mode = process.argv.includes('--fill') ? 'fill' : 'collapse';
  const result = applyWebsiteProposals(live, { write: wantWrite, mode });
  if (wantWrite && result.applied.length) {
    atomicWrite(MAP, `${JSON.stringify(result.map, null, 2)}\n`);
  }
  const out = {
    ok: true,
    write: wantWrite,
    mode: result.mode,
    applied: result.applied,
    skipped: result.skipped,
    companiesBefore: live.companies?.length ?? null,
    companiesAfter: result.map.companies?.length ?? null,
    reviewCandidates: result.reviewCandidates,
    note: wantWrite
      ? result.applied.length
        ? `wrote ${result.mode} ×${result.applied.length} to map`
        : 'nothing to write'
      : 'dry-run — pass --write to persist; default --collapse drops keyless shells; --fill keeps rows',
  };
  console.log(JSON.stringify(out, null, 2));
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
      `  ${c.sameWebsiteNotMerged} group(s) share a website host and survived dedupe (merge defect)\n` +
      `  ${c.proposals || 0} unambiguous website proposal(s) — dry-run: --apply-websites ; write: --apply-websites --write\n`,
    );
    for (const g of r.groups.filter((x) => x.verdict !== 'distinct-websites')) {
      console.log(`  ${g.verdict}  ${g.name}`);
      for (const e of g.evidence) console.log(`     ${String(e.id).padEnd(40)} ${e.source || '-'} · host=${e.hostKey || 'NONE'}`);
      if (g.proposal) {
        console.log(
          `     proposal: set website=${g.proposal.website} on ${g.proposal.targetIds.join(', ')}` +
            ` (from ${g.proposal.fromId}) — not auto-applied`,
        );
      }
    }
  }
}
