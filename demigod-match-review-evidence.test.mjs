#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  proposeForCandidate,
  resolveCompanyEvidence,
  suggestMatches,
} from './demigod-matching-engine.mjs';
import { projectCompanyResearch } from './demigod-evidence.mjs';
import { BOARD_PATH, INBOX_PATH } from './demigod-submissions-lib.mjs';
import { planMatchAdvance } from './demigod-funnel.mjs';

const map = {
  generatedAt: '2026-07-24T17:20:32.575Z',
  companies: [
    { id: 'atlas-a', name: 'Atlas, Inc.', website: 'https://a.example' },
    { id: 'atlas-b', name: 'Atlas LLC', website: 'https://b.example' },
    {
      id: 'yc:abundant',
      name: 'Abundant',
      description: 'Agent simulation and RL for researchers',
      source: 'Y Combinator',
      sourceUrl: 'https://www.ycombinator.com/companies/abundant',
      sourceLicense: 'YC-public',
      retrievedAt: '2026-07-24',
      jobsUrl: 'https://jobs.ashbyhq.com/abundant',
      atsSource: 'Ashby',
      openRoles: 4,
      openRolesAt: '2026-07-24',
    },
  ],
};
const ledger = {
  roles: {
    'Ashby|abundant|rpm': {
      provider: 'Ashby',
      slug: 'abundant',
      title: 'Research Product Manager',
      location: 'San Francisco',
      url: 'https://jobs.ashbyhq.com/abundant/rpm',
      firstSeen: '2026-07-20',
      lastSeen: '2026-07-24',
      closedAt: null,
    },
  },
};

assert.deepEqual(resolveCompanyEvidence({}, map, ledger), {
  status: 'unknown',
  reason: 'company_missing',
});
assert.equal(resolveCompanyEvidence({ company: 'Bad map' }, { companies: {} }, {}).status, 'unknown');
assert.equal(resolveCompanyEvidence({ company: 'Atlas' }, map, ledger).status, 'ambiguous');

const evidence = resolveCompanyEvidence(
  { company: 'Abundant, Inc.', title: 'Research Product Manager' },
  map,
  ledger,
  '2026-07-28',
);
assert.equal(evidence.status, 'matched');
assert.equal(evidence.identityBasis, 'exact_unique_name');
assert.equal(evidence.role.title, 'Research Product Manager');
assert.equal(evidence.provenance.retrievedAt, '2026-07-24');
assert.equal(evidence.hiring.openRoles, 4);
assert.equal(evidence.roleEvidenceStatus, 'observed_open');
assert.deepEqual(evidence.reviewFlags, []);
assert.equal(evidence.roleObservations[0].observedDays, 8);
assert.equal(evidence.research, null);
const closedEvidence = resolveCompanyEvidence(
  { company: 'Abundant', title: 'Research Product Manager' },
  map,
  { roles: { rpm: { ...ledger.roles['Ashby|abundant|rpm'], closedAt: '2026-07-25' } } },
  '2026-07-28',
);
assert.equal(closedEvidence.roleEvidenceStatus, 'observed_closed');
assert.deepEqual(closedEvidence.reviewFlags, ['public_role_observed_closed']);
assert.equal(
  resolveCompanyEvidence({ company: 'Abundant', title: 'Research Product Manager' }, map, {}).roleEvidenceStatus,
  'ledger_unavailable',
);
assert.match(
  planMatchAdvance(
    { leadId: 'lead-evidence', mode: 'suggest', query: 'role-evidence', canAdvanceToInReview: true },
    { role: { id: 'role-evidence' }, matches: [], companyEvidence: evidence },
  ).evidenceText,
  /companyEvidence: matched[\s\S]*roleEvidence: observed_open/,
);

const realMap = JSON.parse(fs.readFileSync(new URL('./DEMIGOD-SF-STARTUP-MAP.json', import.meta.url), 'utf8'));
const researchBenchmark = JSON.parse(
  fs.readFileSync(new URL('./DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json', import.meta.url), 'utf8'),
);
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-match-research-'));
  try {
    fs.writeFileSync(
      path.join(root, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json'),
      JSON.stringify(researchBenchmark),
    );
    fs.writeFileSync(
      path.join(root, 'DEMIGOD-COMPANY-RESEARCH.json'),
      JSON.stringify({ version: 1, companies: [] }),
    );
    const probe = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `const {loadCompanyEvidenceSources}=await import(${JSON.stringify(new URL('./demigod-matching-engine.mjs', import.meta.url).href)});console.log(JSON.stringify(loadCompanyEvidenceSources()))`,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          DEMIGOD_ROOT: root,
          DEMIGOD_BUSY: path.join(root, 'busy'),
        },
      },
    );
    assert.equal(probe.status, 0, probe.stderr);
    const isolated = JSON.parse(probe.stdout);
    assert.deepEqual(isolated.research, {}, 'missing evidence seal withholds benchmark research');
    assert.deepEqual(isolated.researchCatalog, {}, 'missing evidence seal withholds catalog research');
    assert.equal(isolated.researchEvidence.reason, 'no-evidence');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
const emptyResearchCatalog = JSON.parse(
  fs.readFileSync(new URL('./DEMIGOD-COMPANY-RESEARCH.json', import.meta.url), 'utf8'),
);
assert.equal(emptyResearchCatalog.version, 1);
assert.ok(Array.isArray(emptyResearchCatalog.companies), 'catalog companies must be an array');
assert.deepEqual(emptyResearchCatalog.companies, []);
const runtimeRow = {
  id: 'yc:abundant',
  researchedAt: '2026-07-29',
  fields: {
    productSummary: {
      value: 'Agent simulation and reinforcement-learning infrastructure for AI researchers.',
      status: 'supported',
      url: 'https://abundant.ai/',
      quote: 'Agent simulation and RL for researchers',
    },
    pricingStatus: {
      value: 'contact sales',
      status: 'supported',
      url: 'https://abundant.ai/',
      quote: 'Contact us',
    },
  },
};
const researchCatalog = {
  version: 1,
  researchedAt: '2026-07-29',
  companies: [runtimeRow],
};
// Non-array companies fail closed: object/map shapes must not invent catalog research.
{
  const objectShaped = {
    version: 1,
    researchedAt: '2026-07-29',
    companies: { [runtimeRow.id]: runtimeRow },
  };
  assert.equal(
    projectCompanyResearch({
      companyId: runtimeRow.id,
      benchmark: researchBenchmark,
      catalog: objectShaped,
    }),
    null,
    'object-shaped catalog.companies must not project research',
  );
  assert.equal(
    projectCompanyResearch({
      companyId: runtimeRow.id,
      benchmark: researchBenchmark,
      catalog: { version: 1, companies: 'not-an-array' },
    }),
    null,
    'string catalog.companies must not project research',
  );
  assert.equal(
    projectCompanyResearch({
      companyId: runtimeRow.id,
      benchmark: researchBenchmark,
      catalog: { version: 1, companies: [runtimeRow] },
    })?.source,
    'catalog',
    'array catalog.companies remains the only shape that projects',
  );
}
const researchedEvidence = resolveCompanyEvidence(
  { company: 'CommodityAI', title: 'Engineer' },
  realMap,
  {},
  '2026-07-28',
  researchBenchmark,
);
assert.equal(researchedEvidence.research.status, 'verified');
assert.equal(researchedEvidence.research.fields.productCategory.value, 'agentic AI workflow automation for commodity operations');
assert.equal(researchedEvidence.research.fields.pricingStatus, undefined);
assert.deepEqual(researchedEvidence.research.acceptedFields, [
  'canonicalCompany',
  'productSummary',
  'productCategory',
  'likelyBuyer',
]);
assert.equal(researchedEvidence.research.source, 'benchmark');
const runtimeEvidence = resolveCompanyEvidence(
  { company: 'Abundant', title: 'Research Product Manager' },
  map,
  ledger,
  '2026-07-29',
  researchBenchmark,
  researchCatalog,
);
assert.equal(runtimeEvidence.research.status, 'verified');
assert.equal(runtimeEvidence.research.source, 'catalog');
assert.equal(
  runtimeEvidence.research.fields.productSummary.value,
  'Agent simulation and reinforcement-learning infrastructure for AI researchers.',
);
assert.equal(runtimeEvidence.research.fields.pricingStatus, undefined);
const invalidRuntimeEvidence = resolveCompanyEvidence(
  { company: 'Abundant', title: 'Research Product Manager' },
  map,
  ledger,
  '2026-07-29',
  researchBenchmark,
  {
    companies: [{
      ...runtimeRow,
      fields: {
        productSummary: {
          ...runtimeRow.fields.productSummary,
          url: 'http://127.0.0.1/private',
        },
      },
    }],
  },
);
assert.equal(invalidRuntimeEvidence.research.status, 'unknown');
assert.equal(invalidRuntimeEvidence.research.fields.productSummary, undefined);
assert.equal(
  resolveCompanyEvidence(
    { company: 'Abundant', title: 'Research Product Manager' },
    map,
    ledger,
    '2026-07-29',
    researchBenchmark,
    { companies: [runtimeRow, { ...runtimeRow }] },
  ).research,
  null,
);
const conflictEvidence = resolveCompanyEvidence(
  { company: 'Tara AI', title: 'Engineer' },
  realMap,
  {},
  '2026-07-28',
  researchBenchmark,
);
assert.equal(conflictEvidence.research.status, 'verified_with_conflict');
assert.ok(conflictEvidence.reviewFlags.includes('company_research_conflict'));
const commodityRuntimeRow = {
  ...researchBenchmark.companies.find((row) => row.id === 'yc:commodityai'),
  quarantineHiring: true,
};
const quarantinedEvidence = resolveCompanyEvidence(
  { company: 'CommodityAI', title: 'Engineer' },
  realMap,
  {},
  '2026-07-28',
  researchBenchmark,
  { companies: [commodityRuntimeRow] },
);
assert.equal(quarantinedEvidence.research.quarantineHiring, true);
assert.equal(quarantinedEvidence.research.source, 'catalog');
assert.equal(quarantinedEvidence.roleEvidenceStatus, 'board_quarantined');
assert.equal(quarantinedEvidence.hiring.status, 'quarantined');
assert.equal(quarantinedEvidence.hiring.openRoles, null);
assert.ok(quarantinedEvidence.reviewFlags.includes('public_hiring_quarantined'));
for (const suffix of ['/distro', '/ion', '/noble', '/pivotal', '/unusual']) {
  assert.ok(!realMap.companies.some((company) => company.jobsUrl?.endsWith(suffix)), `false ATS board removed: ${suffix}`);
}
assert.match(
  planMatchAdvance(
    { leadId: 'lead-research', mode: 'suggest', query: 'role-research', canAdvanceToInReview: true },
    { role: { id: 'role-research' }, matches: [], companyEvidence: researchedEvidence },
  ).evidenceText,
  /researchEvidence: verified[\s\S]*researchFields: canonicalCompany,productSummary,productCategory,likelyBuyer/,
);

const testDir = path.dirname(BOARD_PATH);
fs.mkdirSync(testDir, { recursive: true });
try {
  fs.writeFileSync(BOARD_PATH, JSON.stringify({
    roles: [{
      id: 'role-evidence',
      title: 'Product Manager',
      company: '',
      status: 'Active',
      skills: 'product, SaaS',
      outcome90d: 'Ship the first customer workflow',
      comp: '$120k-$160k',
      stageType: 'Seed · B2B SaaS',
    }],
    candidates: [],
  }));
  fs.writeFileSync(INBOX_PATH, JSON.stringify({
    items: [{
      id: 'cand-evidence',
      form: 'engineer-join',
      status: 'reviewed',
      raw: {
        'full-name': 'Fixture Candidate',
        'seeker-email': 'fixture@example.test',
        'skills-stack': 'product, SaaS',
        experience: 'Five years shipping products',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$130k',
        'work-auth': 'authorized',
        'resume-url': 'https://example.test/resume.pdf',
      },
    }],
  }));

  assert.equal(suggestMatches('role-evidence').companyEvidence.reason, 'company_missing');
  const candidateResult = proposeForCandidate('cand-evidence', { threshold: 0, propose: false });
  assert.equal(
    candidateResult.ranked.find((row) => row.roleId === 'role-evidence')?.companyEvidence.reason,
    'company_missing',
  );
} finally {
  fs.rmSync(testDir, { recursive: true, force: true });
}

const dashboard = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
assert.match(dashboard, /p\.companyEvidence/);
assert.match(dashboard, /roleObservations/);
assert.match(dashboard, /researchFields\.productCategory/);
assert.match(dashboard, /researchFields\.likelyBuyer/);
assert.match(dashboard, /esc\(roleLabel\)/);
assert.match(dashboard, /esc\(evidenceLine\)/);
assert.match(dashboard, /Pair intelligence/);
assert.match(dashboard, /Fit signal · review only/);
assert.match(
  dashboard,
  /Fit signals explain evidence; they never approve, reject, defer, reorder, record consent, or draft an intro/,
);

// Queue sample gate (DIE §3.4 + accepted-role annotation): samples never attach companyEvidence
// or acceptedRole as real. Only sample===false may project either field.
// Hand-poison: !p.sample / p.sample? would treat undefined/string "false" as real and leak.
{
  const reviewSrc = fs.readFileSync(new URL('./demigod-match-review.mjs', import.meta.url), 'utf8');
  assert.match(
    reviewSrc,
    /companyEvidence:\s*p\.sample\s*===\s*false\s*\?\s*evidenceByRole\.get\(p\.roleId\)\s*:\s*null/,
    'samples force companyEvidence=null',
  );
  assert.match(
    reviewSrc,
    /acceptedRole:\s*p\.sample\s*===\s*false\s*\?\s*acceptedByRole\.get\(String\(p\.roleId\)\)\s*\|\|\s*null\s*:\s*null/,
    'samples force acceptedRole=null (never surface a real acceptance on fixtures)',
  );
  assert.match(
    reviewSrc,
    /if \(pairs\.some\(\(pair\) => pair\.sample === false\)\)/,
    'evidence/accepted-role sources load only when a real pair is present',
  );
  assert.doesNotMatch(reviewSrc, /companyEvidence:\s*!p\.sample\b/);
  assert.doesNotMatch(reviewSrc, /acceptedRole:\s*!p\.sample\b/);
  assert.match(
    reviewSrc,
    /process\.env\.DEMIGOD_BUSY\s*\|\|\s*process\.env\.DG_BUSY/,
    'match-review BUSY must prefer DEMIGOD_BUSY (queue receipts isolation)',
  );
}

// sample:false + gold company → research projects when sources are passed (no disk invent role/pair).
{
  const gold = resolveCompanyEvidence(
    { company: 'CommodityAI', title: 'Engineer', sample: false },
    realMap,
    {},
    '2026-07-28',
    researchBenchmark,
  );
  assert.equal(gold.research?.status, 'verified', 'real role maps research when sources green');
  assert.ok((gold.research?.acceptedFields || []).length >= 1);
  const sampleShaped = resolveCompanyEvidence(
    { company: 'CommodityAI', title: 'Engineer' }, // sample not consulted here — attachment is queue-side
    realMap,
    {},
    '2026-07-28',
    researchBenchmark,
  );
  assert.equal(sampleShaped.research?.status, 'verified');
  // Queue would still null this when pair.sample !== false (source canary above).
}

console.log('demigod match review company evidence: PASS');
