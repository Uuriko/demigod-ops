import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHnPublicCompanies,
  buildYcPublicCompanies,
  isYcActiveStatus,
  isYcSfBayLocation,
  mapRebuildWritePath,
  mergeNamedCompanies,
  websiteHostKey,
} from './demigod-startup-map-data.mjs';

test('YC Active filter is exact (Inactive is not Active)', () => {
  assert.equal(isYcActiveStatus('Active'), true);
  assert.equal(isYcActiveStatus('active'), true);
  assert.equal(isYcActiveStatus('Inactive'), false);
  assert.equal(isYcActiveStatus('Acquired'), false);
  assert.equal(isYcActiveStatus('Public'), false);
});

test('YC SF Bay location gate', () => {
  assert.equal(isYcSfBayLocation('San Francisco, CA, USA'), true);
  assert.equal(isYcSfBayLocation('Palo Alto, CA, USA'), true);
  assert.equal(isYcSfBayLocation('London, England, United Kingdom'), false);
  assert.equal(isYcSfBayLocation(''), false);
});

test('buildYcPublicCompanies maps Active SF rows and drops inactive/foreign', () => {
  const rows = [
    {
      name: 'Active SF Co',
      slug: 'active-sf',
      status: 'Active',
      all_locations: 'San Francisco, CA, USA',
      website: 'https://activesf.example',
      one_liner: 'Does SF things',
      batch: 'Winter 2024',
      industries: ['B2B', 'Legal'],
      tags: ['SaaS', 'B2B'],
      team_size: 12,
      stage: 'Early',
      isHiring: true,
      launched_at: 1700000000,
    },
    {
      name: 'Inactive SF Co',
      slug: 'inactive-sf',
      status: 'Inactive',
      all_locations: 'San Francisco, CA, USA',
      website: 'https://inactive.example',
    },
    {
      name: 'Active London Co',
      slug: 'active-lon',
      status: 'Active',
      all_locations: 'London, England, United Kingdom',
      website: 'https://london.example',
    },
  ];
  const companies = buildYcPublicCompanies(rows, '2026-07-23');
  assert.equal(companies.length, 1);
  assert.equal(companies[0].id, 'yc:active-sf');
  assert.equal(companies[0].sourceLicense, 'YC-public');
  assert.equal(companies[0].source, 'Y Combinator');
  assert.equal(companies[0].hiring, 'yes');
  assert.ok(companies[0].tags.includes('yc'));
  assert.ok(companies[0].tags.includes('YC Winter 2024'));
  assert.deepEqual(companies[0].tags.slice(2), ['B2B', 'Legal', 'SaaS']);
  assert.equal(companies[0].teamSize, 12);
  assert.equal(companies[0].stage, 'Early');
  assert.match(companies[0].sourceUrl, /ycombinator\.com\/companies\/active-sf/);
});

test('known-dead company websites are omitted without dropping their attributed company row', () => {
  const [company] = buildYcPublicCompanies([{
    name: 'Dead Website Co', slug: 'dead-website-co', status: 'Active',
    all_locations: 'San Francisco, CA, USA', website: 'https://www.airware.com/',
  }], '2026-08-06');
  assert.equal(company.website, null);
  assert.match(company.sourceUrl, /ycombinator\.com\/companies\/dead-website-co/);
  const [assembly] = buildYcPublicCompanies([{
    name: 'Assembly', slug: 'assembly', status: 'Active',
    all_locations: 'San Francisco, CA, USA', website: 'https://asm.co/',
  }], '2026-08-06');
  assert.equal(assembly.website, null);
  assert.match(assembly.sourceUrl, /ycombinator\.com\/companies\/assembly/);
  const [onton] = buildHnPublicCompanies([{ name: 'Onton.com', website: 'https://careers.onton.com/', jobsUrl: 'https://jobs.ashbyhq.com/onton' }]);
  assert.equal(onton.website, null);
  assert.equal(onton.jobsUrl, 'https://jobs.ashbyhq.com/onton');
});

test('two distinct entities sharing a host are NOT merged (false merges are worse than duplicates)', () => {
  // Wikidata really does carry RockLive (Q7354178) and Shots Podcast Network (Q15977863) as
  // separate entities both listing shots.com. Cross-source dedupe is a heuristic on a host key,
  // not an identity claim, so rows inside ONE source list must survive intact. Collapsing them
  // would poison every downstream claim about both companies. Do not "fix" this into a merge.
  const wikidata = [
    { id: 'wd:Q7354178', name: 'RockLive', website: 'https://www.shots.com/', sourceLicense: 'CC0-1.0' },
    { id: 'wd:Q15977863', name: 'Shots Podcast Network', website: 'https://shots.com/', sourceLicense: 'CC0-1.0' },
  ];
  const merged = mergeNamedCompanies([], wikidata);
  assert.deepEqual(merged.map((row) => row.id).sort(), ['wd:Q15977863', 'wd:Q7354178']);
  // ...and the same pair inside the PRIMARY list is equally safe.
  assert.equal(mergeNamedCompanies(wikidata, []).length, 2);
});

test('mergeNamedCompanies dedupes by website host and keeps YC primary', () => {
  assert.equal(websiteHostKey('https://www.Docker.com/path'), 'docker.com');
  const merged = mergeNamedCompanies(
    [
      {
        id: 'yc:docker',
        name: 'Docker',
        website: 'https://www.docker.com',
        description: 'YC desc',
        sourceLicense: 'YC-public',
        hiring: 'yes',
      },
    ],
    [
      {
        id: 'wd:Q1',
        name: 'Docker, Inc',
        website: 'http://docker.com',
        description: 'Wikidata longer description about containers',
        sourceLicense: 'CC0-1.0',
        openRoles: 3,
        jobsUrl: 'https://boards.greenhouse.io/docker',
        atsSource: 'Greenhouse',
        openRolesAt: '2026-07-23',
      },
      {
        id: 'wd:Q2',
        name: 'Only Wikidata',
        website: 'https://onlywd.example',
        sourceLicense: 'CC0-1.0',
      },
    ],
  );
  assert.equal(merged.length, 2);
  const docker = merged.find((c) => c.id === 'yc:docker');
  assert.ok(docker);
  assert.equal(docker.name, 'Docker');
  assert.equal(docker.openRoles, 3);
  assert.equal(docker.atsSource, 'Greenhouse');
  assert.ok(merged.some((c) => c.id === 'wd:Q2'));
});

test('an ATS-only HN shell absorbs into the row that owns that board, but a shared host still does not merge', () => {
  // Board identity: one ATS board belongs to one company, so a shell pointing at the same board is
  // the same company. This is the fix for HN rows that correctly reject an ATS URL as a website and
  // are therefore left with no host key at all — without it they inflate the published count.
  const yc = [{ id: 'yc:middesk', name: 'Middesk', website: 'https://middesk.com/', jobsUrl: 'https://jobs.ashbyhq.com/middesk', atsSource: 'Ashby' }];
  const shell = [{ id: 'hn:jobs.ashbyhq.com/middesk', name: 'Middesk', website: null, hiring: 'yes' }];
  const absorbed = mergeNamedCompanies(yc, shell);
  assert.deepEqual(absorbed.map((r) => r.id), ['yc:middesk'], 'ATS-only shell must absorb, not inflate');
  assert.equal(absorbed[0].hiring, 'yes', 'and its hiring signal carries over');

  // The asymmetry that must hold at the same time: a shared HOST is not identity. Indexing
  // secondary rows by host merges two genuinely distinct entities, which is worse than a duplicate.
  const sameHost = mergeNamedCompanies([], [
    { id: 'wd:Q7354178', name: 'RockLive', website: 'https://shots.com/' },
    { id: 'wd:Q15977863', name: 'Shots Podcast Network', website: 'https://shots.com/' },
  ]);
  assert.equal(sameHost.length, 2, 'distinct entities sharing a host are never collapsed');

  // A shell whose board nobody owns stays its own row rather than attaching to a same-named company.
  const orphan = mergeNamedCompanies(
    [{ id: 'yc:other', name: 'Middesk', website: 'https://other.example/' }],
    [{ id: 'hn:jobs.ashbyhq.com/middesk', name: 'Middesk', website: null }],
  );
  assert.equal(orphan.length, 2, 'a name match alone must never absorb a shell');
});

test('with-jobs rebuild stages beside the live map so a killed enrich cannot board-wipe production', () => {
  const finalPath = '/home/potter/DEMIGOD-SF-STARTUP-MAP.json';
  assert.equal(mapRebuildWritePath(finalPath, false), finalPath, 'bare rebuild may write in place');
  assert.equal(
    mapRebuildWritePath(finalPath, true),
    `${finalPath}.staging`,
    'jobs rebuild must stage first',
  );
});
