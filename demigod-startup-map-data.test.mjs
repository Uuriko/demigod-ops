import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildYcPublicCompanies,
  isYcActiveStatus,
  isYcSfBayLocation,
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
  assert.match(companies[0].sourceUrl, /ycombinator\.com\/companies\/active-sf/);
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
