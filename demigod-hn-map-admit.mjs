#!/usr/bin/env node
/**
 * Admit HN Who-is-Hiring rows into DEMIGOD-SF-STARTUP-MAP via mergeNamedCompanies.
 *
 * Manual appends (2026-08-06) re-created same-host shells (Hestus). This path always
 * merges by website host / ATS board key so YC rows absorb HN shells.
 *
 *   node demigod-hn-map-admit.mjs           # dry-run summary
 *   node demigod-hn-map-admit.mjs --write   # persist map
 *   node demigod-hn-map-admit.mjs --selftest
 *
 * Does not invent openRoles. Does not publish. After --write, run jobs-enrich or
 * targeted board counts for new jobsUrl rows if counts are needed.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import {
  mergeNamedCompanies,
  websiteHostKey,
  PUBLIC_STARTUP_MAP_PATH,
} from './demigod-startup-map-data.mjs';
import { isCompanyWebsiteHost, isPlausibleHnCompanyName } from './demigod-hn-hiring.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = process.env.DEMIGOD_STARTUP_MAP || PUBLIC_STARTUP_MAP_PATH || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const HN = path.join(ROOT, 'DEMIGOD-HN-HIRING.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** PURE. Filter HN cache rows that may be admitted (name + optional website host guards). */
export function hnAdmitCandidates(hnCompanies = []) {
  return (Array.isArray(hnCompanies) ? hnCompanies : []).filter(
    (row) =>
      row &&
      isPlausibleHnCompanyName(row.name) &&
      isCompanyWebsiteHost(row.website) &&
      (row.website || row.jobsUrl),
  );
}

/**
 * PURE. Merge HN candidates into existing map companies.
 * Returns { companies, before, after, absorbedHint }.
 */
export function admitHnIntoMap(map, hnCompanies = []) {
  const primary = Array.isArray(map?.companies) ? map.companies.map((c) => ({ ...c })) : [];
  const before = primary.length;
  const beforeIds = new Set(primary.map((c) => c.id).filter(Boolean));
  const secondary = hnAdmitCandidates(hnCompanies);
  const companies = mergeNamedCompanies(primary, secondary);
  const after = companies.length;
  const netNewIds = companies.filter((c) => c?.id && !beforeIds.has(c.id)).map((c) => c.id);
  return {
    companies,
    before,
    after,
    candidates: secondary.length,
    netNew: Math.max(0, after - before),
    netNewIds,
  };
}

function selftest() {
  const map = {
    companies: [
      {
        id: 'yc:hestus-inc',
        name: 'Hestus, Inc.',
        website: 'https://www.hestus.co/',
        teamSize: 3,
        stage: 'Early',
      },
    ],
  };
  const hn = [
    {
      id: 'hn:hestus.co',
      name: 'Hestus',
      website: 'https://hestus.co/',
      hiring: 'yes',
      tags: ['hn-hiring'],
      jobsUrl: null,
    },
    {
      id: 'hn:newco.example',
      name: 'NewCo Example',
      website: 'https://newco.example/',
      hiring: 'yes',
      tags: ['hn-hiring'],
      jobsUrl: 'https://jobs.ashbyhq.com/newco',
    },
  ];
  const r = admitHnIntoMap(map, hn);
  assert.equal(r.after, 2, 'one absorb + one new');
  assert.equal(r.netNew, 1, 'Hestus absorbed by host');
  assert.deepEqual(r.netNewIds, ['hn:newco.example'], 'netNewIds lists only truly new ids');
  const hestus = r.companies.find((c) => websiteHostKey(c.website) === 'hestus.co');
  assert.ok(hestus && hestus.id === 'yc:hestus-inc', 'YC row kept');
  assert.equal(hestus.hiring, 'yes', 'HN hiring absorbed');
  assert.ok(hnAdmitCandidates([{ name: 'Engineer', website: 'https://x.com' }]).length === 0, 'role-title name rejected');
  // boards.greenhouse vs job-boards.greenhouse must not re-inflate the same company
  const gh = admitHnIntoMap(
    {
      companies: [
        {
          id: 'hn:job-boards.greenhouse.io/kinelo',
          name: 'Kinelo',
          website: 'https://www.kinelo.com/',
          jobsUrl: 'https://boards.greenhouse.io/kinelo',
        },
      ],
    },
    [
      {
        id: 'hn:job-boards.greenhouse.io/kinelo',
        name: 'Kinelo',
        website: null,
        jobsUrl: 'https://job-boards.greenhouse.io/kinelo',
        hiring: 'yes',
        tags: ['hn-hiring'],
      },
    ],
  );
  assert.equal(gh.after, 1, 'greenhouse alias re-admit length');
  assert.equal(gh.netNew, 0, 'greenhouse alias re-admit netNew');
  assert.deepEqual(gh.netNewIds, [], 'greenhouse alias no new ids');
  console.log(JSON.stringify({ ok: true, selftest: 'hn-map-admit' }));
}

if (isMain) {
  if (process.argv.includes('--selftest')) {
    selftest();
    process.exit(0);
  }
  const write = process.argv.includes('--write');
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  let hnCompanies = [];
  try {
    hnCompanies = JSON.parse(fs.readFileSync(HN, 'utf8')).companies || [];
  } catch {
    hnCompanies = [];
  }
  const result = admitHnIntoMap(map, hnCompanies);
  if (write && result.netNew >= 0) {
    // Always write when --write so absorb-only tag/hiring updates persist even if count flat.
    const next = { ...map, companies: result.companies, generatedAt: new Date().toISOString() };
    if (next.coverage && typeof next.coverage === 'object') {
      next.coverage.namedCompanies = result.companies.length;
    }
    atomicWrite(MAP, `${JSON.stringify(next)}\n`, { mode: 0o644 });
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        write,
        candidates: result.candidates,
        before: result.before,
        after: result.after,
        netNew: result.netNew,
        netNewIds: (result.netNewIds || []).slice(0, 20),
        note: write
          ? 'map written via mergeNamedCompanies (host/board absorb)'
          : 'dry-run — pass --write to persist; then jobs-enrich if openRoles needed',
      },
      null,
      2,
    ),
  );
}
