#!/usr/bin/env node
/**
 * Creative directory repair — attach exact, owner-verified ATS boards to companies
 * already admitted by the canonical public-source pipeline.
 *
 * Honesty:
 * - Never changes directory membership. New membership must clear the admission review/gate.
 * - openRoles counts only US-posted/Remote-ish postings (same spirit as jobs-enrich).
 * - hiring:"yes" only when a public board returns ≥1 US-ish role.
 * - Default preview; --write mutates DEMIGOD-SF-STARTUP-MAP.json then regenerates static.
 *
 *   node demigod-directory-expand-creative.mjs
 *   node demigod-directory-expand-creative.mjs --write
 *   node demigod-directory-expand-creative.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import {
  fetchOwnedAtsBoard,
  updateJobsCoverage,
} from './demigod-startup-jobs-enrich.mjs';
import { buildStaticDirectory, stageStartupsPastePackage } from './demigod-directory-static.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const FEED = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const TODAY = new Date().toISOString().slice(0, 10);

/** Existing-map ATS repairs: map company id → board (must already exist on map). */
// From live Ashby discovery against YC rows that only had a YC /jobs page (2026-08-02).
const ATS_REPAIRS = [
  // Board hints never admit membership; the company must already exist in the canonical map.
  { id: 'wd:Q135683783', slug: 'cursor', provider: 'Ashby' },
  { id: 'wd:Q132249659', slug: 'harvey', provider: 'Ashby' },
  { id: 'wd:Q115517493', slug: 'character', provider: 'Ashby' },
  { id: 'wd:Q117340550', slug: 'langchain', provider: 'Ashby' },
  { id: 'wd:Q133141069', slug: 'pika', provider: 'Ashby' },
  { id: 'wd:Q140774682', slug: 'fireworks', provider: 'Ashby' },
  { id: 'wd:Q23016614', slug: 'airtable', provider: 'Greenhouse' },
  { id: 'wd:Q109592043', slug: 'gongio', provider: 'Greenhouse' },
  { id: 'wd:Q16248637', slug: 'datadog', provider: 'Greenhouse' },
  { id: 'wd:Q4546965', slug: 'mongodb', provider: 'Greenhouse' },
  { id: 'wd:Q22074922', slug: 'elastic', provider: 'Greenhouse' },
  { id: 'wd:Q111946817', slug: 'calendly', provider: 'Greenhouse' },
  { id: 'wd:Q125446413', slug: 'llamaindex', provider: 'Ashby' },
  { id: 'wd:Q81969219', slug: 'amplitude', provider: 'Ashby' },
  { id: 'wd:Q123190361', slug: 'ramp', provider: 'Ashby' },
  { id: 'wd:Q18155123', slug: 'robinhood', provider: 'Greenhouse' },
  { id: 'wd:Q2047336', slug: 'palantir', provider: 'Lever' },
  { id: 'wd:Q61918830', slug: 'andurilindustries', provider: 'Greenhouse' },
  { id: 'wd:Q119718658', slug: 'mistral.ai', provider: 'Ashby' },
  { id: 'wd:Q108943604', slug: 'huggingface', provider: 'Workable' },
  { id: 'wd:Q123592234', slug: 'stabilityai', provider: 'Greenhouse' },
  { id: 'wd:Q113270365', slug: 'inflectionai', provider: 'Greenhouse' },
  { id: 'yc:accord', slug: 'accord', provider: 'Ashby' },
  { id: 'yc:agave', slug: 'agave', provider: 'Ashby' },
  { id: 'yc:aios', slug: 'aios', provider: 'Ashby' },
  { id: 'yc:ambient-ai', slug: 'ambient.ai', provider: 'Ashby' },
  { id: 'yc:andromeda-surgical', slug: 'andromeda', provider: 'Ashby' },
  { id: 'yc:arlo-industries', slug: 'arlo', provider: 'Ashby' },
  { id: 'yc:ashby', slug: 'ashby', provider: 'Ashby' },
  { id: 'yc:asimov', slug: 'asimov', provider: 'Ashby' },
  { id: 'yc:assembly-hoa', slug: 'assembly', provider: 'Ashby' },
  { id: 'yc:astro-mechanica', slug: 'astro-mechanica', provider: 'Ashby' },
  { id: 'yc:atomic', slug: 'atomic', provider: 'Ashby' },
  { id: 'yc:automat', slug: 'automat', provider: 'Ashby' },
  { id: 'yc:axiom', slug: 'axiom', provider: 'Ashby' },
  { id: 'yc:bild-ai', slug: 'bild-ai', provider: 'Ashby' },
  { id: 'yc:bretton-ai', slug: 'brettonai', provider: 'Ashby' },
  { id: 'yc:candid-health', slug: 'candidhealth', provider: 'Ashby' },
  { id: 'yc:cardboard', slug: 'cardboard', provider: 'Ashby' },
  { id: 'yc:casca', slug: 'casca', provider: 'Ashby' },
  { id: 'yc:centralize', slug: 'centralize', provider: 'Ashby' },
  { id: 'yc:fieldguide', slug: 'fieldguide', provider: 'Ashby' },
  { id: 'yc:magic', slug: 'magic', provider: 'Ashby' },
  { id: 'hn:jobs.ashbyhq.com/bedrock', slug: 'bedrock', provider: 'Ashby' },
  { id: 'hn:jobs.ashbyhq.com/river', slug: 'river', provider: 'Ashby' },
  { id: 'hn:challenge.steel.dev', slug: 'steel', provider: 'Ashby' },
  { id: 'hn:turnstile.ai', slug: 'turnstile', provider: 'Ashby' },
  // Existing Wikidata/YC rows with validated public boards (2026-08-02).
  { id: 'wd:Q124071418', slug: 'togetherai', provider: 'Greenhouse' }, // Together AI
  { id: 'wd:Q138845452', slug: 'hextechnologies', provider: 'Greenhouse' }, // Hex
  { id: 'wd:Q7858039', slug: 'twilio', provider: 'Greenhouse', website: 'https://www.twilio.com/' },
  { id: 'yc:scale-ai', slug: 'scaleai', provider: 'Greenhouse' },
  { id: 'wd:Q116413452', slug: 'anyscale', provider: 'Ashby' }, // upgrade stale Lever count
  // Owner-matched Ashby (2026-08-02 discovery batch)
  { id: 'yc:aqua-voice', slug: 'aqua-voice', provider: 'Ashby' },
  { id: 'yc:chronicle-labs', slug: 'chronicle-labs', provider: 'Ashby' },
];

function applyAtsRepair(company, board) {
  const us = Number(board?.count);
  if (!Number.isSafeInteger(us) || us < 1 || !board?.jobsUrl || !board?.ats) {
    return { company, changed: false, reason: 'invalid-owned-board' };
  }
  const next = {
    ...company,
    jobsUrl: board.jobsUrl,
    jobsSource: company.jobsSource === 'HN' ? 'HN' : board.ats,
    atsSource: board.ats,
    openRoles: us,
    openRolesAt: TODAY,
    hiring: 'yes',
    hiringEvidenceAt: TODAY,
    roleMix: board.roleMix || {},
  };
  return { company: next, changed: true, us };
}

async function expand(map, fetchBoard = fetchOwnedAtsBoard) {
  const byId = new Map(map.companies.map((c) => [c.id, { ...c }]));
  const repairs = [];
  const skipped = [];

  for (const repair of ATS_REPAIRS) {
    const { id, slug } = repair;
    const provider = repair.provider || 'Ashby';
    const cur0 = byId.get(id);
    if (!cur0) {
      skipped.push({ id, reason: 'not-in-map' });
      continue;
    }
    let cur = cur0;
    if (repair.website && cur.website !== repair.website) {
      cur = { ...cur, website: repair.website };
    }
    const board = await fetchBoard(cur, slug, provider);
    if (!board) {
      skipped.push({ id, reason: `${provider.toLowerCase()}-owner-or-board-unverified`, slug });
      continue;
    }
    const { company, changed, us, reason } = applyAtsRepair(cur, board);
    if (!changed) {
      skipped.push({ id, reason: reason || 'no-change', slug });
      continue;
    }
    byId.set(id, company);
    repairs.push({ id, name: company.name, slug, provider, openRoles: us });
  }

  const companies = [...byId.values()].map((company) => ({
    ...company,
    locationPrecision: 'city',
    neighborhood: null,
  })).sort(
    (a, b) => String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id)),
  );
  const next = { ...map, generatedAt: new Date().toISOString(), companies };
  updateJobsCoverage(next, TODAY, map.coverage?.boardDupesCollapsed || 0);
  return { map: next, repairs, skipped };
}

if (isMain && process.argv.includes('--selftest')) {
  const patched = applyAtsRepair(
    { id: 'yc:x', name: 'X' },
    { count: 2, jobsUrl: 'https://jobs.ashbyhq.com/x', ats: 'Ashby', roleMix: { engineering: 2 } },
  );
  if (!patched.changed || patched.company.openRoles !== 2) throw new Error('applyAtsRepair selftest');
  if (patched.company.roleMix?.engineering !== 2) throw new Error('applyAtsRepair role mix selftest');
  const invalid = applyAtsRepair({ id: 'yc:x', name: 'X' }, { count: 0, jobsUrl: '', ats: 'Ashby' });
  if (invalid.changed || invalid.reason !== 'invalid-owned-board') throw new Error('invalid board selftest');
  const empty = await expand({ schema: 'demigod.sf-startup-map/3', companies: [], coverage: {} });
  if (empty.map.companies.length !== 0 || empty.repairs.length !== 0) {
    throw new Error('repair-only tool changed empty-map membership');
  }
  let ownerChecks = 0;
  const legacy = await expand({
    schema: 'demigod.sf-startup-map/3',
    coverage: {},
    companies: [{
      id: 'wd:Q135683783',
      name: 'Anysphere',
      website: 'https://cursor.com/',
      jobsUrl: 'https://jobs.ashbyhq.com/cursor',
      atsSource: 'Ashby',
      openRoles: 2,
    }],
  }, async () => {
    ownerChecks += 1;
    return null;
  });
  if (ownerChecks !== 1 || legacy.repairs.length !== 0 || !legacy.skipped.some((row) => row.reason.includes('unverified'))) {
    throw new Error('already-enriched board bypassed owner revalidation');
  }
  console.log(JSON.stringify({ ok: true, selftest: 'directory-expand-creative' }));
  process.exit(0);
}

if (isMain) {
  const write = process.argv.includes('--write');
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const beforeOpen = map.companies.filter((c) => c.openRoles).length;
  const beforeRoles = map.companies.reduce((s, c) => s + (c.openRoles || 0), 0);
  const { map: next, repairs, skipped } = await expand(map);
  const afterOpen = next.companies.filter((c) => c.openRoles).length;
  const afterRoles = next.companies.reduce((s, c) => s + (c.openRoles || 0), 0);
  const report = {
    ok: true,
    write,
    at: new Date().toISOString(),
    before: { companies: map.companies.length, withOpenRoles: beforeOpen, totalOpenRoles: beforeRoles },
    after: { companies: next.companies.length, withOpenRoles: afterOpen, totalOpenRoles: afterRoles },
    repairs,
    skipped: skipped.slice(0, 40),
    skippedTotal: skipped.length,
  };
  fs.mkdirSync(BUSY, { recursive: true });
  atomicWrite(path.join(BUSY, 'directory-expand-creative.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (write) {
    atomicWrite(MAP, `${JSON.stringify(next)}\n`);
    let feed = null;
    try {
      feed = JSON.parse(fs.readFileSync(FEED, 'utf8'));
    } catch {
      /* optional */
    }
    const html = buildStaticDirectory(next, '', feed);
    atomicWrite(path.join(ROOT, 'sf-startups-static.html'), html);
    stageStartupsPastePackage(html, { busy: BUSY, sourcePath: MAP });
  }
  console.log(JSON.stringify(report, null, 2));
}
