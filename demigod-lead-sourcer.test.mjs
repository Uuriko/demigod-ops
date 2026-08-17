import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertExportValid, buildExport } from './demigod-recruitai-export.mjs';

const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
// Strip every ambient DEMIGOD_*/DG_* override (agent sessions export e.g. DEMIGOD_ROLE_LEDGER,
// DEMIGOD_BUSY) so fixture children read only the roots each test sets explicitly.
for (const key of Object.keys(childEnv)) {
  if (/^(?:DEMIGOD|DG)_/.test(key)) delete childEnv[key];
}

/** Partner/export override env: scope must equal basename(BUSY) or override is ignored. */
function partnerChildEnv(dir, extra = {}) {
  return {
    ...childEnv,
    DEMIGOD_BUSY: dir,
    DEMIGOD_TEST_SCOPE: path.basename(dir),
    ...extra,
  };
}

test('limit excludes policy-ineligible leads before ranking', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const inbox = path.join(dir, 'inbox.json');
  fs.writeFileSync(inbox, JSON.stringify({ items: [
    { id: 'weak', form: 'engineer', raw: { location: 'Tampa Bay' } },
    {
      id: 'strong',
      form: 'candidate',
      status: 'reviewed',
      at: new Date().toISOString(),
      raw: {
        'full-name': 'Alice Example',
        'seeker-email': 'alice@example.test',
        'sf-bay': 'yes',
        location: 'SF alice@example.test',
        'skills-stack': 'React',
        experience: 'Built production React applications',
        availability: 'now',
        'salary-expectation': '$180k',
        'resume-url': 'https://example.test/alice-resume.pdf',
        'why-this-role': 'Ready; call +1 415 555 0123',
      },
    },
    { id: 'spam', form: 'candidate', status: 'spam', raw: { location: 'SF', 'skills-stack': 'AI', 'why-this-role': 'Ready' } },
    { id: 'rejected', form: 'engineer', status: 'rejected', rejectReasons: ['not eligible'], raw: { location: 'SF', 'skills-stack': 'AI', 'why-this-role': 'Ready' } },
  ] }));
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--type=talent', '--limit=1'], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: { ...childEnv, DEMIGOD_TEST_SCOPE: path.basename(dir), DEMIGOD_INBOX_PATH: inbox, DEMIGOD_BUSY: dir },
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  const output = path.join(dir, 'lead-sourcer-latest.json');
  const preview = JSON.parse(fs.readFileSync(output));
  assert.deepEqual(preview.leads.map(({ id }) => id), ['strong']);
  assert.doesNotMatch(JSON.stringify(preview), /alice@example\.test|415 555 0123/);
  assert.equal(fs.statSync(output).mode & 0o777, 0o600);
});

test('unknown flags fail as CLI usage errors', () => {
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--bogus'], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: childEnv,
    encoding: 'utf8',
  });
  assert.equal(run.status, 2);
});

test('duplicate flags fail before writing a preview', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--type=talent', '--type=partners'], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: { ...childEnv, DEMIGOD_BUSY: dir },
    encoding: 'utf8',
  });
  assert.equal(run.status, 2);
  assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
});

test('numeric arguments reject malformed, duplicate, and non-partner use before writing', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const args of [
    ['--limit=0x2'],
    ['--limit=01'],
    ['--limit=1e2'],
    ['--limit=+2'],
    ['--type=partners', '--offset='],
    ['--type=partners', '--offset=-1'],
    ['--type=partners', '--offset=1.5'],
    ['--type=partners', '--offset=1e2'],
    ['--type=partners', '--offset=01'],
    ['--type=partners', '--offset=1', '--offset=2'],
    ['--type=talent', '--offset=1'],
  ]) {
    const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', ...args], {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: { ...childEnv, DEMIGOD_BUSY: dir },
      encoding: 'utf8',
    });
    assert.equal(run.status, 2, `${args.join(' ')}\n${run.stderr}`);
    assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
  }
});

function partnerFixture({
  novelTwoName = 'Novel Two',
  novelTwoTitle = 'Engineer 2',
  withCompanyResearch = false,
  researchEndedAt = '2026-07-29T02:00:00.000Z',
} = {}) {
  const companies = [
    ['yc:novel-one', 'Novel One', 'novel-one'],
    ['yc:novel-one-copy', 'Novel One', 'novel-one-copy'],
    ['yc:novel-two', novelTwoName, 'novel-two'],
    ['yc:existing', 'Existing Co', 'existing'],
    ['yc:no-agencies', 'No Agencies Co', 'no-agencies'],
    ['yc:closed', 'Closed Co', 'closed'],
    ['yc:novel-three', 'Novel Three', 'novel-three'],
    ['wd:public', 'Non YC Co', 'non-yc'],
  ].map(([id, name, slug]) => ({
    id,
    name: id === 'yc:novel-three' ? `${slug}.test` : name,
    website: `https://${slug}.test`,
    jobsUrl: `https://boards.greenhouse.io/${slug}`,
    atsSource: 'Greenhouse',
    sourceLicense: id.startsWith('yc:') ? 'YC-public' : 'CC0-1.0',
    sourceUrl: id.startsWith('yc:')
      ? `https://www.ycombinator.com/companies/${slug}`
      : 'https://www.wikidata.org/wiki/Q1',
    retrievedAt: '2026-07-29',
  }));
  const roles = Object.fromEntries(companies.map((company, index) => {
    const slug = company.jobsUrl.split('/').pop();
    return [`Greenhouse|${slug}|${index}`, {
      provider: 'Greenhouse',
      slug,
      jobId: String(index),
      company: company.name,
      title:
        company.id === 'yc:novel-one'
          ? 'Talent Partner'
          : company.id === 'yc:novel-two'
            ? novelTwoTitle
            : `Engineer ${index}`,
      url: `${company.jobsUrl}/jobs/${index}`,
      firstSeen: ['yc:novel-one', 'yc:novel-one-copy'].includes(company.id)
        ? '2026-07-29'
        : company.id === 'yc:novel-three'
          ? '2026-07-29'
          : `2026-07-${String(20 + index).padStart(2, '0')}`,
      lastSeen: '2026-07-29',
      closedAt: company.id === 'yc:closed' ? '2026-07-29' : null,
      ...(company.id === 'yc:novel-one' ? {
        fn: 'people',
        reopenCount: 1,
        nativePostedAt: '2026-05-01',
        nativeDateField: 'first_published',
      } : {}),
      ...(company.id === 'yc:no-agencies' ? {
        agencyPolicyEvidence: {
          status: 'supported',
          quote: 'No agencies please.',
          url: `${company.jobsUrl}/jobs/${index}`,
        },
      } : {}),
    }];
  }));
  const supported = (value) => ({
    value,
    status: 'supported',
    url: 'https://novel-one.test/',
    quote: String(value),
  });
  return buildExport(
    { generatedAt: '2026-07-29T00:00:00.000Z', companies },
    { updatedAt: '2026-07-29T01:00:00.000Z', roles },
    {
      today: '2026-07-29',
      ...(withCompanyResearch ? {
        benchmark: {
          researchedAt: '2026-07-29',
          companies: Array.from({ length: 30 }, (_, index) => ({
            id: index === 0 ? 'yc:novel-one' : `gold:${index}`,
            fields: {
              canonicalCompany: supported(index === 0 ? 'Novel One' : `Gold ${index}`),
              productSummary: supported('Makes useful things'),
              productCategory: supported('Software'),
              likelyBuyer: supported('Operations teams'),
              pricingStatus: { value: null, status: 'unknown', url: null, quote: null },
            },
          })),
        },
        researchEvidence: {
          green: true,
          pass: true,
          fresh: true,
          reason: 'pass-fresh',
          runId: 'lead-sourcer-test',
          endedAt: researchEndedAt,
        },
      } : {}),
    },
  );
}

function writeCommittedPartnerGeneration(
  dir,
  artifact = partnerFixture(),
  generationName = '1-1',
  { current = true } = {},
) {
  if (current) {
    const day = new Date().toISOString().slice(0, 10);
    artifact.roleLedgerUpdatedAt = day;
    artifact.changeDate = day;
    const ledgerPath = path.join(dir, 'DEMIGOD-ROLE-LEDGER.json');
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({ schema: 'demigod.role-ledger/1', updatedAt: day, roles: {} }),
    );
    const mapPath = path.join(dir, 'DEMIGOD-SF-STARTUP-MAP.json');
    fs.writeFileSync(mapPath, JSON.stringify({ generatedAt: artifact.mapGeneratedAt }));
    artifact.generatedAt = new Date().toISOString();
    fs.utimesSync(ledgerPath, new Date(artifact.generatedAt), new Date(artifact.generatedAt));
    fs.utimesSync(mapPath, new Date(artifact.generatedAt), new Date(artifact.generatedAt));
  }
  const generations = path.join(dir, 'recruitai-export-generations');
  const generation = path.join(generations, generationName);
  const pointer = path.join(dir, 'recruitai-export');
  const jsonPath = path.join(generation, 'latest.json');
  const csvPath = path.join(generation, 'latest.csv');
  const commitPath = path.join(generation, 'commit.json');
  const json = Buffer.from(JSON.stringify(artifact));
  const csv = Buffer.from('id\n');
  fs.mkdirSync(generation, { recursive: true, mode: 0o700 });
  fs.chmodSync(generations, 0o700);
  fs.chmodSync(generation, 0o700);
  fs.writeFileSync(jsonPath, json, { mode: 0o600 });
  fs.writeFileSync(csvPath, csv, { mode: 0o600 });
  const commit = {
    schema: 'demigod.recruitai-export-commit/1',
    at: artifact.generatedAt,
    generation,
    rows: artifact.rows.length,
    rowLimit: artifact.rowLimit,
    files: {
      'latest.json': createHash('sha256').update(json).digest('hex'),
      'latest.csv': createHash('sha256').update(csv).digest('hex'),
    },
  };
  fs.writeFileSync(commitPath, JSON.stringify(commit), { mode: 0o600 });
  if (fs.existsSync(pointer)) fs.unlinkSync(pointer);
  fs.symlinkSync(generation, pointer, 'dir');
  return { artifact, commit, commitPath, csvPath, generation, json, jsonPath, pointer };
}

test('partner preview reuses validated novel YC evidence without queue or contact fields', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const artifact = partnerFixture({ withCompanyResearch: true });
  const novel = artifact.rows.find((row) => row.mapCompanyId === 'yc:novel-one');
  assert.ok(novel.companyResearch);
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  const crm = JSON.stringify({
    partners: [
      { company: '  Existing   Co ' },
      { id: 'yc:novel-two', company: 'Different display name' },
    ],
    talent: [],
  });
  fs.writeFileSync(exportPath, JSON.stringify(artifact));
  fs.writeFileSync(crmPath, crm);
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=1'], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: partnerChildEnv(dir, {
      DEMIGOD_RECRUITAI_EXPORT: exportPath,
      DEMIGOD_LEADS_PATH: crmPath,
    }),
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  const outputPath = path.join(dir, 'lead-sourcer-latest.json');
  const output = JSON.parse(fs.readFileSync(outputPath));
  const sourceRow = artifact.rows.find((row) => row.mapCompanyId === 'yc:novel-one');
  assert.deepEqual(output.leads.map((lead) => lead.id), ['yc:novel-one']);
  assert.deepEqual(Object.keys(output.leads[0]).sort(), [
    'company',
    'domain',
    'id',
    'jobsUrl',
    'openReqCount',
    'provenance',
    'reviewSignals',
    'sampleRoleTitle',
    'sampleRoleUrl',
    'type',
  ]);
  assert.equal(output.source.generatedAt, artifact.generatedAt);
  assert.equal(output.source.roleLedgerUpdatedAt, artifact.roleLedgerUpdatedAt);
  assert.deepEqual(output.source, {
    schema: artifact.schema,
    generatedAt: artifact.generatedAt,
    roleLedgerUpdatedAt: artifact.roleLedgerUpdatedAt,
    changeDate: artifact.changeDate,
    changeBasis: 'ledger-observation',
    ageBasis: 'observed-first-seen',
    attributedPostingBasis: 'Greenhouse:first_published',
    staleDaysThreshold: 45,
    evergreenDaysThreshold: 365,
  });
  assert.deepEqual(output.selectionReceipt, {
    inputRows: 8,
    rowsBeforeExportLimit: 8,
    upstreamOmitted: 0,
    emissionLimit: 1,
    emissionOffset: 0,
    eligibleBeforeWindow: 0,
    selected: 1,
    eligibleBeyondLimit: 1,
    abstentions: {
      notPublicYcIdentity: 1,
      quarantinedHiringEvidence: 0,
      noOpenRole: 1,
      positiveNoAgencyEvidence: 1,
      existingCrmId: 1,
      existingCrmName: 1,
      duplicateSourceIdentity: 1,
      /* Opt-in --startups screen (companies the map shows are startup-sized). Counted here even
         when the flag is off, so the receipt shape stays stable and every refusal remains
         auditable — the same reason the other seven reasons are always present. */
      notStartupSized: 0,
    },
  });
  assert.deepEqual(output.leads[0].reviewSignals, {
    firstObservedTodayReqCount: sourceRow.firstObservedTodayReqCount,
    firstObservedTodayOlderPostedReqCount:
      sourceRow.firstObservedTodayOlderPostedReqCount,
    closedTodayReqCount: sourceRow.closedTodayReqCount,
    reopenedOpenReqCount: sourceRow.reopenedOpenReqCount,
    attributedPostedReqCount: sourceRow.attributedPostedReqCount,
    staleAttributedPostedReqCount: sourceRow.staleAttributedPostedReqCount,
    evergreenAttributedPostedReqCount: sourceRow.evergreenAttributedPostedReqCount,
    maxAttributedPostedDays: sourceRow.maxAttributedPostedDays,
    peopleOpsRoleEvidence: {
      openRoleCount: 1,
      sampleRoleTitle: 'Talent Partner',
      sampleRoleUrl: 'https://boards.greenhouse.io/novel-one/jobs/0',
    },
  });
  assert.equal(fs.readFileSync(crmPath, 'utf8'), crm);
  assert.equal(fs.statSync(outputPath).mode & 0o777, 0o600);
  // Preview may use export research for quarantine abstentions, but must never project
  // research payload, score/contact, sourceHistory diagnostics, or abstention reasons
  // (unknownReason is research-internal; partners get public role signals only).
  const forbidden = new Set([
    'score', 'email', 'phone', 'contact', 'companyResearch', 'send', 'fee',
    'researchEvidence', 'sourceHistory', 'textStableFlaky', 'staleVerified',
    'unknownReason',
  ]);
  const keys = [];
  JSON.stringify(output, (key, value) => {
    keys.push(key);
    return value;
  });
  assert.equal(keys.some((key) => forbidden.has(key)), false);
  const body = JSON.stringify(output);
  assert.doesNotMatch(
    body,
    /LEAK-SENTINEL|PRIVATE-SENTINEL|companyResearch|sourceHistory|researchEvidence|textStableFlaky|unknownReason/,
  );
  const secondPage = spawnSync(
    process.execPath,
    [
      'demigod-lead-sourcer.mjs',
      '--type=partners',
      '--limit=1',
      '--offset=1',
    ],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_RECRUITAI_EXPORT: exportPath,
        DEMIGOD_LEADS_PATH: crmPath
      }),
      encoding: 'utf8',
    },
  );
  assert.equal(secondPage.status, 0, secondPage.stderr);
  const pageTwoOutput = JSON.parse(fs.readFileSync(outputPath));
  assert.deepEqual(
    pageTwoOutput.leads.map((lead) => lead.id),
    ['yc:novel-three'],
  );
  assert.equal(pageTwoOutput.leads[0].company, 'novel-three.test');
  assert.equal(pageTwoOutput.selectionReceipt.eligibleBeforeWindow, 1);
  assert.equal(pageTwoOutput.selectionReceipt.eligibleBeyondLimit, 0);
  assert.equal(fs.readFileSync(crmPath, 'utf8'), crm);
  const pastEnd = spawnSync(
    process.execPath,
    [
      'demigod-lead-sourcer.mjs',
      '--type=partners',
      '--limit=1',
      '--offset=99',
    ],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_RECRUITAI_EXPORT: exportPath,
        DEMIGOD_LEADS_PATH: crmPath
      }),
      encoding: 'utf8',
    },
  );
  assert.equal(pastEnd.status, 0, pastEnd.stderr);
  const pastEndOutput = JSON.parse(fs.readFileSync(outputPath));
  assert.deepEqual(pastEndOutput.leads, []);
  assert.equal(pastEndOutput.selectionReceipt.eligibleBeforeWindow, 2);
  assert.equal(pastEndOutput.selectionReceipt.eligibleBeyondLimit, 0);
});

test('partner selection honors research quarantine and Unicode company identity', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const artifact = partnerFixture({
    novelTwoName: 'ＡＣＭＥ 東京',
    withCompanyResearch: true,
  });
  artifact.rows.find(
    (row) => row.mapCompanyId === 'yc:novel-one',
  ).companyResearch.quarantineHiring = true;
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  const crm = JSON.stringify({
    partners: [{ company: 'ACME 東京' }],
    talent: [],
  });
  fs.writeFileSync(exportPath, JSON.stringify(artifact));
  fs.writeFileSync(crmPath, crm);
  const run = spawnSync(
    process.execPath,
    ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=100'],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_RECRUITAI_EXPORT: exportPath,
        DEMIGOD_LEADS_PATH: crmPath,
      }),
      encoding: 'utf8',
    },
  );
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(
    fs.readFileSync(path.join(dir, 'lead-sourcer-latest.json')),
  );
  assert.equal(output.leads.some((lead) => lead.id === 'yc:novel-one'), false);
  assert.equal(output.leads.some((lead) => lead.id === 'yc:novel-two'), false);
  assert.equal(output.selectionReceipt.abstentions.quarantinedHiringEvidence, 1);
  assert.equal(output.selectionReceipt.abstentions.existingCrmName, 1);
  assert.equal(fs.readFileSync(crmPath, 'utf8'), crm);
});

test('partner projection rejects control-shaped titles and oversized domains', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const crmPath = path.join(dir, 'leads.json');
  const exportPath = path.join(dir, 'recruitai.json');
  const crm = JSON.stringify({ partners: [], talent: [] });
  fs.writeFileSync(crmPath, crm);
  for (const poison of ['title', 'domain']) {
    const artifact = partnerFixture();
    const row = artifact.rows.find(
      (candidate) => candidate.mapCompanyId === 'yc:novel-two',
    );
    if (poison === 'title') {
      const role = artifact.relationships.nodes.find(
        (node) => node.type === 'open_role' && node.url === row.sampleRoleUrl,
      );
      row.sampleRoleTitle += '\u200bpoison';
      role.title = row.sampleRoleTitle;
    } else {
      row.domain = `${'x'.repeat(250)}.test`;
      artifact.relationships.nodes.find(
        (node) => node.id === `company:${row.mapCompanyId}`,
      ).domain = row.domain;
    }
    fs.writeFileSync(exportPath, JSON.stringify(artifact));
    const run = spawnSync(
      process.execPath,
      ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=100'],
      {
        cwd: path.dirname(new URL(import.meta.url).pathname),
        env: partnerChildEnv(dir, {
          DEMIGOD_RECRUITAI_EXPORT: exportPath,
          DEMIGOD_LEADS_PATH: crmPath,
        }),
        encoding: 'utf8',
      },
    );
    assert.notEqual(run.status, 0, poison);
    assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
    assert.equal(fs.readFileSync(crmPath, 'utf8'), crm);
  }
});

test('partner preview ignores only exact agent junk tombstones during CRM dedupe', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  const crm = JSON.stringify({
    partners: [
      {
        id: 'wf-old-junk',
        mapCompanyId: 'yc:novel-one',
        company: 'Novel One',
        url: 'https://wellfound.com/jobs/1',
        state: 'disqualified',
        stateHistory: [{
          at: '2026-07-28T00:00:00.000Z',
          from: 'sourced',
          to: 'disqualified',
          actor: 'agent',
          evidence: null,
          note: 'junk-aggregator-or-fragment',
        }],
      },
      {
        id: 'wf-human-disqualified',
        mapCompanyId: 'yc:novel-two',
        company: 'Novel Two',
        url: 'https://wellfound.com/jobs/2',
        state: 'disqualified',
        stateHistory: [{
          at: '2026-07-28T00:00:00.000Z',
          from: 'sourced',
          to: 'disqualified',
          actor: 'human',
          evidence: null,
          note: 'junk-aggregator-or-fragment',
        }],
      },
      {
        id: 'wf-opted-out-mirror',
        mapCompanyId: 'yc:novel-three',
        company: 'Novel Three',
        url: 'https://wellfound.com/jobs/3',
        state: 'disqualified',
        status: 'opted_out',
        stateHistory: [{
          at: '2026-07-28T00:00:00.000Z',
          from: 'sourced',
          to: 'disqualified',
          actor: 'agent',
          evidence: null,
          note: 'junk-aggregator-or-fragment',
        }],
      },
    ],
    talent: [],
  });
  fs.writeFileSync(exportPath, JSON.stringify(partnerFixture()));
  fs.writeFileSync(crmPath, crm);
  const run = spawnSync(
    process.execPath,
    ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=100'],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_RECRUITAI_EXPORT: exportPath,
        DEMIGOD_LEADS_PATH: crmPath
      }),
      encoding: 'utf8',
    },
  );
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(
    fs.readFileSync(path.join(dir, 'lead-sourcer-latest.json')),
  );
  const ids = new Set(output.leads.map((lead) => lead.id));
  assert.equal(ids.has('yc:novel-one'), true, 'agent junk tombstone is not a company');
  assert.equal(ids.has('yc:novel-two'), false, 'human disqualification remains authoritative');
  assert.equal(ids.has('yc:novel-three'), false, 'opt-out mirror remains authoritative');
  assert.equal(output.selectionReceipt.abstentions.existingCrmId, 2);
  assert.equal(fs.readFileSync(crmPath, 'utf8'), crm);
});

test('invalid RecruitAI artifact fails before partner preview output', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  fs.writeFileSync(exportPath, JSON.stringify({ ...partnerFixture(), schema: 'invalid' }));
  fs.writeFileSync(crmPath, JSON.stringify({ partners: [], talent: [] }));
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--type=partners'], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: partnerChildEnv(dir, {
      DEMIGOD_RECRUITAI_EXPORT: exportPath,
      DEMIGOD_LEADS_PATH: crmPath
    }),
    encoding: 'utf8',
  });
  assert.notEqual(run.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
});

test('leaked DEMIGOD_TEST_SCOPE pid does not unlock export override', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  // Valid-looking artifact would be accepted if override unlocked; force committed path instead.
  fs.writeFileSync(exportPath, JSON.stringify(partnerFixture()));
  fs.writeFileSync(crmPath, JSON.stringify({ partners: [], talent: [] }));
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=1'], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: {
      ...childEnv,
      DEMIGOD_BUSY: dir,
      DEMIGOD_TEST_SCOPE: String(process.pid), // leaked shape — must NOT match basename(BUSY)
      DEMIGOD_RECRUITAI_EXPORT: exportPath,
      DEMIGOD_LEADS_PATH: crmPath,
    },
    encoding: 'utf8',
  });
  assert.notEqual(run.status, 0, 'override must be ignored without scope===basename(BUSY)');
  assert.match(run.stderr || '', /recruitai-export-generations|invalid committed RecruitAI export|ENOENT/);
  assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
});

test('unsafe partner evidence fails before preview output', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const artifact = partnerFixture();
  const row = artifact.rows.find((item) => item.mapCompanyId === 'yc:novel-one');
  row.jobsUrl = 'http://127.0.0.1/private';
  row.sourceUrl = 'file:///tmp/private';
  artifact.generatedAt = 'not-a-date';
  artifact.roleLedgerUpdatedAt = 'also-not-a-date';
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  fs.writeFileSync(exportPath, JSON.stringify(artifact));
  fs.writeFileSync(crmPath, JSON.stringify({ partners: [], talent: [] }));
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--type=partners'], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: partnerChildEnv(dir, {
      DEMIGOD_RECRUITAI_EXPORT: exportPath,
      DEMIGOD_LEADS_PATH: crmPath
    }),
    encoding: 'utf8',
  });
  assert.notEqual(run.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
});

test('safe cross-company role evidence fails before preview output', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const artifact = partnerFixture();
  artifact.rows.find(
    (row) => row.mapCompanyId === 'yc:novel-one',
  ).sampleRoleUrl = 'https://boards.greenhouse.io/other-company/jobs/999';
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  fs.writeFileSync(exportPath, JSON.stringify(artifact));
  fs.writeFileSync(crmPath, JSON.stringify({ partners: [], talent: [] }));
  const run = spawnSync(
    process.execPath,
    ['demigod-lead-sourcer.mjs', '--type=partners'],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_RECRUITAI_EXPORT: exportPath,
        DEMIGOD_LEADS_PATH: crmPath
      }),
      encoding: 'utf8',
    },
  );
  assert.notEqual(run.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
});

test('unsafe partner evidence beyond the preview limit still fails closed', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const artifact = partnerFixture();
  const poisoned = artifact.rows.find((row) => row.mapCompanyId === 'yc:novel-three');
  poisoned.jobsUrl = 'file:///etc/passwd';
  poisoned.sourceUrl = 'http://127.0.0.1/private';
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  fs.writeFileSync(exportPath, JSON.stringify(artifact));
  fs.writeFileSync(crmPath, JSON.stringify({ partners: [], talent: [] }));
  const run = spawnSync(
    process.execPath,
    ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=1'],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_RECRUITAI_EXPORT: exportPath,
        DEMIGOD_LEADS_PATH: crmPath
      }),
      encoding: 'utf8',
    },
  );
  assert.notEqual(run.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'lead-sourcer-latest.json')), false);
});

test('safe but non-YC source evidence beyond the limit is an identity abstention', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const artifact = partnerFixture();
  artifact.rows.find(
    (row) => row.mapCompanyId === 'yc:novel-three',
  ).sourceUrl = 'https://example.com/companies/novel-three';
  const exportPath = path.join(dir, 'recruitai.json');
  const crmPath = path.join(dir, 'leads.json');
  fs.writeFileSync(exportPath, JSON.stringify(artifact));
  fs.writeFileSync(crmPath, JSON.stringify({
    partners: [
      { company: 'Existing Co' },
      { id: 'yc:novel-two', company: 'Different display name' },
    ],
    talent: [],
  }));
  const run = spawnSync(
    process.execPath,
    ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=1'],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_RECRUITAI_EXPORT: exportPath,
        DEMIGOD_LEADS_PATH: crmPath
      }),
      encoding: 'utf8',
    },
  );
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(
    fs.readFileSync(path.join(dir, 'lead-sourcer-latest.json')),
  );
  assert.equal(output.selectionReceipt.abstentions.notPublicYcIdentity, 2);
  assert.equal(output.selectionReceipt.eligibleBeyondLimit, 0);
});

test('shared selector committed mode ignores an uncommitted export override', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  writeCommittedPartnerGeneration(dir);
  const override = path.join(dir, 'uncommitted.json');
  fs.writeFileSync(override, JSON.stringify({ schema: 'poison', rows: [] }));
  const run = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      [
        'import { selectRecruitaiPartners } from "./demigod-lead-sourcer.mjs";',
        'const result = selectRecruitaiPartners(',
        '  { partners: [], talent: [] },',
        '  { limit: 1, committedOnly: true },',
        ');',
        'console.log(JSON.stringify(result.leads.map((lead) => lead.id)));',
      ].join('\n'),
    ],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: partnerChildEnv(dir, {
        DEMIGOD_ROOT: dir,
        DEMIGOD_RECRUITAI_EXPORT: override
      }),
      encoding: 'utf8',
    },
  );
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), ['yc:novel-two']);
});

test('shared committed selector binds the UTC day, role ledger, and startup map', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const artifact = partnerFixture();
  artifact.generatedAt = '2026-07-29T12:00:00.000Z';
  artifact.roleLedgerUpdatedAt = '2026-07-29';
  artifact.changeDate = '2026-07-29';
  writeCommittedPartnerGeneration(dir, artifact, '1-1', { current: false });
  const ledgerPath = path.join(dir, 'DEMIGOD-ROLE-LEDGER.json');
  fs.writeFileSync(
    ledgerPath,
    JSON.stringify({ schema: 'demigod.role-ledger/1', updatedAt: '2026-07-29', roles: {} }),
  );
  const mapPath = path.join(dir, 'DEMIGOD-SF-STARTUP-MAP.json');
  fs.writeFileSync(mapPath, JSON.stringify({ at: artifact.mapGeneratedAt }));
  const runAt = (now) => spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        [
          'import { selectRecruitaiPartners } from "./demigod-lead-sourcer.mjs";',
          'selectRecruitaiPartners(',
          '  { partners: [], talent: [] },',
          `  { limit: 1, committedOnly: true, now: Date.parse(${JSON.stringify(now)}) },`,
          ');',
        ].join('\n'),
      ],
      {
        cwd: path.dirname(new URL(import.meta.url).pathname),
        env: {
          ...childEnv,
          DEMIGOD_ROOT: dir,
          DEMIGOD_BUSY: dir,
        },
        encoding: 'utf8',
      },
    );
  fs.utimesSync(ledgerPath, new Date('2026-07-29T11:00:00.000Z'), new Date('2026-07-29T11:00:00.000Z'));
  fs.utimesSync(mapPath, new Date('2026-07-29T11:00:00.000Z'), new Date('2026-07-29T11:00:00.000Z'));
  assert.equal(runAt('2026-07-29T13:00:00.000Z').status, 0, 'current sealed source');
  fs.writeFileSync(mapPath, JSON.stringify({ at: '2026-07-29T00:00:00.001Z' }));
  fs.utimesSync(mapPath, new Date('2026-07-29T11:00:00.000Z'), new Date('2026-07-29T11:00:00.000Z'));
  assert.notEqual(runAt('2026-07-29T13:00:00.000Z').status, 0, 'map generation changed');
  fs.writeFileSync(mapPath, JSON.stringify({ at: artifact.mapGeneratedAt }));
  fs.utimesSync(mapPath, new Date('2026-07-29T12:00:00.500Z'), new Date('2026-07-29T12:00:00.500Z'));
  assert.notEqual(runAt('2026-07-29T13:00:00.000Z').status, 0, 'map changed after export');
  fs.utimesSync(mapPath, new Date('2026-07-29T11:00:00.000Z'), new Date('2026-07-29T11:00:00.000Z'));
  fs.utimesSync(ledgerPath, new Date('2026-07-29T12:00:00.500Z'), new Date('2026-07-29T12:00:00.500Z'));
  assert.notEqual(runAt('2026-07-29T13:00:00.000Z').status, 0, 'ledger changed after export');
  fs.utimesSync(ledgerPath, new Date('2026-07-29T11:00:00.000Z'), new Date('2026-07-29T11:00:00.000Z'));
  assert.notEqual(runAt('2026-07-30T12:00:00.000Z').status, 0, 'generation day expired');
});

test('shared committed selector binds green research to the current fresh seal', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const endedAt = new Date().toISOString();
  const artifact = partnerFixture({ withCompanyResearch: true, researchEndedAt: endedAt });
  writeCommittedPartnerGeneration(dir, artifact);
  const catalogPath = path.join(dir, 'DEMIGOD-COMPANY-RESEARCH.json');
  fs.writeFileSync(catalogPath, '{}');
  const run = () => spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      [
        'import { selectRecruitaiPartners } from "./demigod-lead-sourcer.mjs";',
        'selectRecruitaiPartners(',
        '  { partners: [], talent: [] },',
        '  { limit: 1, committedOnly: true },',
        ');',
      ].join('\n'),
    ],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: {
        ...childEnv,
        DEMIGOD_ROOT: dir,
        DEMIGOD_BUSY: dir,
      },
      encoding: 'utf8',
    },
  );
  assert.notEqual(run().status, 0, 'missing current research seal');

  const inputPath = path.join(dir, 'research-input.txt');
  fs.writeFileSync(inputPath, 'v1');
  const evidenceDir = path.join(dir, 'evidence');
  fs.mkdirSync(evidenceDir, { mode: 0o700 });
  const receiptPath = path.join(evidenceDir, 'latest-company-research-benchmark.json');
  const receipt = {
    producer: 'company-research-benchmark',
    runId: artifact.researchEvidence.runId,
    endedAt,
    ttlSec: 3600,
    result: { pass: true },
    inputsAtSeal: {
      files: {
        'research-input.txt': createHash('sha256').update('v1').digest('hex'),
      },
    },
  };
  const receiptBody = JSON.stringify(receipt);
  fs.writeFileSync(receiptPath, receiptBody, { mode: 0o600 });
  fs.writeFileSync(path.join(evidenceDir, `${receipt.runId}.json`), receiptBody, { mode: 0o600 });
  assert.equal(run().status, 0, 'matching fresh research seal');

  fs.writeFileSync(catalogPath, JSON.stringify({ companies: [] }));
  assert.notEqual(run().status, 0, 'changed research catalog');
  fs.writeFileSync(catalogPath, '{}');
  fs.writeFileSync(inputPath, 'v2');
  assert.notEqual(run().status, 0, 'stale research seal');
  fs.writeFileSync(inputPath, 'v1');
  fs.writeFileSync(
    receiptPath,
    JSON.stringify({ ...receipt, runId: 'different-research-run' }),
    { mode: 0o600 },
  );
  assert.notEqual(run().status, 0, 'different research seal');
});

test('default partner source requires a private hash-bound export generation', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const crmPath = path.join(dir, 'leads.json');
  const {
    commit,
    commitPath,
    csvPath,
    json,
    jsonPath,
    pointer,
  } = writeCommittedPartnerGeneration(dir);
  fs.writeFileSync(crmPath, JSON.stringify({ partners: [], talent: [] }));
  const seedOut = path.join(dir, 'seed-pack');
  const run = () => spawnSync(
    process.execPath,
    ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=1'],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: {
        ...childEnv,
        DEMIGOD_ROOT: dir,
        DEMIGOD_BUSY: dir,
        DEMIGOD_LEADS_PATH: crmPath,
      },
      encoding: 'utf8',
    },
  );
  const runSeedPack = () => spawnSync(
    process.execPath,
    ['demigod-recruitai-seed-pack.mjs', '--out', seedOut],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: {
        ...childEnv,
        DEMIGOD_ROOT: dir,
        DEMIGOD_BUSY: dir,
      },
      encoding: 'utf8',
    },
  );
  const runDeskPack = () => spawnSync(
    process.execPath,
    ['demigod-recruitai-desk.mjs', 'pack'],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: {
        ...childEnv,
        DEMIGOD_ROOT: dir,
        DEMIGOD_BUSY: dir,
      },
      encoding: 'utf8',
    },
  );
  const uncommittedOut = path.join(dir, 'uncommitted-seed-pack');
  const runUncommittedSeedPack = () => spawnSync(
    process.execPath,
    ['demigod-recruitai-seed-pack.mjs', '--from', jsonPath, '--out', uncommittedOut],
    {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: {
        ...childEnv,
        DEMIGOD_ROOT: dir,
        DEMIGOD_BUSY: dir,
      },
      encoding: 'utf8',
    },
  );

  assert.equal(run().status, 0, run().stderr || 'valid committed generation');
  assert.equal(runSeedPack().status, 0, 'seed pack accepts committed generation');
  assert.equal(runDeskPack().status, 0, 'desk pack accepts committed generation');
  assert.notEqual(runUncommittedSeedPack().status, 0, 'seed pack rejects explicit uncommitted source');
  assert.equal(fs.existsSync(uncommittedOut), false, 'uncommitted seed source writes nothing');
  fs.rmSync(seedOut, { recursive: true, force: true });
  fs.rmSync(path.join(dir, 'recruitai-handoff'), { recursive: true, force: true });
  fs.appendFileSync(jsonPath, ' ');
  assert.notEqual(run().status, 0, 'JSON hash mismatch');
  assert.notEqual(runSeedPack().status, 0, 'seed pack rejects JSON hash mismatch');
  assert.notEqual(runDeskPack().status, 0, 'desk pack rejects JSON hash mismatch');
  assert.equal(fs.existsSync(seedOut), false, 'seed pack fails before writing');
  assert.equal(
    fs.existsSync(path.join(dir, 'recruitai-handoff', 'latest.json')),
    false,
    'desk pack fails before writing',
  );
  fs.writeFileSync(jsonPath, '{', { mode: 0o600 });
  const malformed = run();
  assert.notEqual(malformed.status, 0, 'malformed JSON is refused');
  assert.match(malformed.stderr, /invalid committed RecruitAI export/);
  assert.doesNotMatch(malformed.stderr, /SyntaxError/, 'hash mismatch is diagnosed before JSON parsing');
  fs.writeFileSync(jsonPath, json, { mode: 0o600 });
  fs.chmodSync(csvPath, 0o644);
  assert.notEqual(run().status, 0, 'public export file');
  fs.chmodSync(csvPath, 0o600);
  fs.rmSync(commitPath);
  assert.notEqual(run().status, 0, 'missing commit');
  fs.writeFileSync(commitPath, JSON.stringify(commit), { mode: 0o600 });
  const externalJson = path.join(dir, 'external.json');
  fs.renameSync(jsonPath, externalJson);
  fs.symlinkSync(externalJson, jsonPath);
  assert.notEqual(run().status, 0, 'generation file symlink');
  fs.unlinkSync(pointer);
  fs.symlinkSync(dir, pointer, 'dir');
  assert.notEqual(run().status, 0, 'pointer outside generation root');
});

/* The export declares pricingStatus non-exportable (EXPORTED_COMPANY_RESEARCH_FIELDS) but the
   projection still returned it, and assertExportValid rejects any acceptedField outside that
   allow-list — so ONE unexportable field failed the ENTIRE export with "malformed research
   shape". --top 40 passed only because no benchmarked company landed in the first 40 rows;
   --top 80 and above threw, and the real pipeline yielded 1 partner lead instead of 100.

   Uses the REAL benchmark on purpose. acceptedFields is decided by grading against that file's
   thresholds, and a hand-built benchmark grades pricingStatus out before it ever reaches the
   export — which is why the first version of this test passed with the fix reverted. The
   fixture has to reproduce the grading, not just the field name. */
test('a non-exportable research field is stripped, not fatal to the whole export', () => {
  const benchmark = JSON.parse(fs.readFileSync(new URL('./DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json', import.meta.url)));
  const graded = benchmark.companies.find((entry) => entry.fields && 'pricingStatus' in entry.fields);
  assert.ok(graded, 'benchmark must contain a company carrying the unexportable field');
  const company = {
    id: graded.id,
    name: graded.mapName || 'Benchmarked Co',
    website: 'https://benchmarked.test',
    jobsUrl: 'https://boards.greenhouse.io/benchmarked',
    atsSource: 'Greenhouse',
    sourceLicense: 'CC0-1.0',
    sourceUrl: 'https://www.wikidata.org/wiki/Q1',
    retrievedAt: '2026-07-29',
  };
  const doc = buildExport(
    { generatedAt: '2026-07-29T00:00:00.000Z', companies: [company] },
    { updatedAt: '2026-07-29T01:00:00.000Z', roles: { 'Greenhouse|benchmarked|0': {
      provider: 'Greenhouse', slug: 'benchmarked', jobId: '0', company: company.name,
      title: 'Engineer', url: `${company.jobsUrl}/jobs/0`,
      firstSeen: '2026-07-20', lastSeen: '2026-07-29', closedAt: null,
    } } },
    {
      today: '2026-07-29',
      benchmark,
      researchEvidence: { green: true, pass: true, fresh: true, reason: 'pass-fresh', runId: 'lead-sourcer-test', endedAt: '2026-07-29T02:00:00.000Z' },
    },
  );
  const researched = doc.rows.filter((row) => row.companyResearch);
  assert.equal(researched.length, 1, 'fixture must produce a researched row — otherwise this proves nothing');
  assert.doesNotThrow(() => assertExportValid(doc), 'one unexportable field must not fail the whole export');
  const research = researched[0].companyResearch;
  assert.equal('pricingStatus' in research.fields, false, 'pricingStatus must not be exported');
  assert.equal(research.acceptedFields.includes('pricingStatus'), false, 'acceptedFields must not advertise it');
  // status must describe what SURVIVED the filter, or projection and validator disagree again.
  assert.equal(research.status, 'verified', 'status must match the remaining fields');
});

// A missing committed export is the ordinary state after a reboot — BUSY defaults under /tmp, so
// the generations root disappears. The path checks are all fail-closed with one message, but they
// are raw fs calls: on a MISSING path lstatSync threw ENOENT before any check could run, so the
// deliberate refusal was unreachable exactly when it was needed and `--type=partners` died with a
// stack trace. Refuse, do not crash.
test('absent committed export refuses cleanly instead of throwing ENOENT', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lead-sourcer-absent-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // CI has no gitignored DEMIGOD-LEADS.json. Give a dummy CRM so this test is about the
  // export pointer, not a missing SoR — missing CRM is now the same fail-closed refusal.
  const crmPath = path.join(dir, 'leads.json');
  fs.writeFileSync(crmPath, JSON.stringify({ companies: [] }));
  const run = spawnSync(process.execPath, ['demigod-lead-sourcer.mjs', '--type=partners', '--limit=5'], {
    encoding: 'utf8',
    env: partnerChildEnv(dir, { DEMIGOD_LEADS_PATH: crmPath }),
  });
  const err = `${run.stderr}${run.stdout}`;
  assert.doesNotMatch(err, /ENOENT|lstat|SyntaxError/, `raw fs error leaked: ${err}`);
  assert.match(err, /invalid committed RecruitAI export/, `expected the deliberate refusal, got: ${err}`);
  assert.notEqual(run.status, 0, 'a refusal must not exit 0');
});
