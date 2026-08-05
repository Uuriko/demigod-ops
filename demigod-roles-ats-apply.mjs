#!/usr/bin/env node
/**
 * Attach validated public ATS board URLs onto DEMIGOD-SF-STARTUP-MAP companies.
 *
 * Sources (read-only):
 *   - /tmp/dg-busy/x-hiring.json  (X posts; extract board URLs from text)
 *   - DEMIGOD-HN-HIRING.json or HN companies already on map with jobsUrl
 *
 * Honesty:
 *   - Never invents role titles or company names from tweet prose.
 *   - Only writes jobsUrl/atsSource when URL is a known public board host.
 *   - Does not set openRoles (jobs-enrich / role-ledger poll owns counts).
 *   - Does not touch DEMIGOD-BOARD.json (matching inventory stays sample-gated).
 *
 *   node demigod-roles-ats-apply.mjs [--dry] [--write]
 *   node demigod-roles-ats-apply.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { extractAtsBoards } from './demigod-roles-ats-links.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const X_HIRING = path.join(BUSY, 'x-hiring.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

/** Collect unique ATS boards from X staging + free text fields. */
export function collectDiscoveredBoards({ xHiring = null, extraTexts = [] } = {}) {
  const boards = [];
  const texts = [...extraTexts];
  if (xHiring?.rows && Array.isArray(xHiring.rows)) {
    for (const row of xHiring.rows) {
      if (row?.text) texts.push(row.text);
      if (row?.url) texts.push(row.url);
    }
  }
  for (const t of texts) boards.push(...extractAtsBoards(t));
  const seen = new Set();
  return boards.filter((b) => (seen.has(b.jobsUrl) ? false : (seen.add(b.jobsUrl), true)));
}

/**
 * PURE. Apply boards onto companies array.
 * Match strategy: jobsUrl host+slug already present → skip;
 * else match company.website host to slug (weak) only when unique slug equals registrable label;
 * else attach by exact jobsUrl slug match on existing jobsUrl; else leave unmatched.
 */
export function applyBoardsToCompanies(companies, boards) {
  const list = Array.isArray(companies) ? companies.map((c) => ({ ...c })) : [];
  const byJobs = new Map();
  for (const c of list) {
    if (c.jobsUrl) byJobs.set(String(c.jobsUrl).replace(/\/+$/, '').toLowerCase(), c);
  }
  const stats = { applied: 0, already: 0, unmatched: 0, boards: boards.length };
  const unmatched = [];

  for (const b of boards) {
    const key = b.jobsUrl.replace(/\/+$/, '').toLowerCase();
    if (byJobs.has(key)) { stats.already += 1; continue; }
    // Prefer company whose jobsUrl slug already matches or website host first label == slug
    let hit = list.find((c) => {
      if (!c.jobsUrl) return false;
      try {
        const u = new URL(c.jobsUrl);
        const slug = u.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
        return slug === b.slug;
      } catch { return false; }
    });
    if (!hit) {
      const candidates = list.filter((c) => {
        try {
          const host = new URL(c.website || '').hostname.replace(/^www\./, '').toLowerCase();
          const label = host.split('.')[0];
          return label === b.slug;
        } catch { return false; }
      });
      if (candidates.length === 1) hit = candidates[0];
    }
    if (!hit) {
      stats.unmatched += 1;
      unmatched.push(b);
      continue;
    }
    if (hit.jobsUrl) { stats.already += 1; continue; }
    hit.jobsUrl = b.jobsUrl;
    hit.atsSource = b.provider;
    hit.jobsSource = hit.jobsSource || 'roles-ats-apply';
    if (hit.hiring !== 'yes') hit.hiring = 'yes';
    byJobs.set(key, hit);
    stats.applied += 1;
  }
  return { companies: list, stats, unmatched };
}

function selftest() {
  const boards = collectDiscoveredBoards({
    xHiring: {
      rows: [
        { text: "We're hiring SF eng https://jobs.ashbyhq.com/AcmeCo/j/1", url: 'https://x.com/a/status/1' },
      ],
    },
  });
  assert.equal(boards.length, 1);
  assert.equal(boards[0].provider, 'Ashby');

  const { companies, stats } = applyBoardsToCompanies(
    [
      { name: 'Acme', website: 'https://acmeco.com/', jobsUrl: null, hiring: 'unknown' },
      { name: 'Other', website: 'https://other.io/', jobsUrl: null },
    ],
    boards,
  );
  assert.equal(stats.applied, 1);
  assert.equal(companies[0].jobsUrl, 'https://jobs.ashbyhq.com/acmeco');
  assert.equal(companies[0].atsSource, 'Ashby');
  assert.equal(companies[0].hiring, 'yes');

  const again = applyBoardsToCompanies(companies, boards);
  assert.equal(again.stats.already, 1);
  assert.equal(again.stats.applied, 0);

  console.log(JSON.stringify({ ok: true, selftest: 'roles-ats-apply' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); process.exit(0); }
  const dry = args.includes('--dry') || !args.includes('--write');
  const map = loadJson(MAP);
  if (!map || !Array.isArray(map.companies)) {
    console.error('roles-ats-apply: missing map companies');
    process.exit(1);
  }
  const xHiring = loadJson(X_HIRING);
  const boards = collectDiscoveredBoards({ xHiring });
  const { companies, stats, unmatched } = applyBoardsToCompanies(map.companies, boards);
  const receipt = {
    schema: 'demigod.roles-ats-apply/1',
    at: new Date().toISOString(),
    dry,
    stats,
    unmatched: unmatched.slice(0, 50),
  };
  fs.mkdirSync(BUSY, { recursive: true });
  atomicWrite(path.join(BUSY, 'roles-ats-apply.json'), JSON.stringify(receipt, null, 2));
  if (!dry && stats.applied > 0) {
    map.companies = companies;
    map.generatedAt = map.generatedAt || new Date().toISOString();
    atomicWrite(MAP, JSON.stringify(map));
  }
  console.log(JSON.stringify({ ok: true, dry, ...stats, unmatched: unmatched.length, receipt: path.join(BUSY, 'roles-ats-apply.json') }));
  if (dry && stats.applied > 0) console.log('re-run with --write to attach boards to map');
}
