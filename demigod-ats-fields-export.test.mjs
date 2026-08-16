#!/usr/bin/env node
/**
 * Clay-useful slice 2: employer ATS fields on export open-role nodes
 * and match-review observations. Hermetic. No network. No people data.
 */
import assert from 'node:assert/strict';
import { projectEmployerAtsFields } from './demigod-role-ledger.mjs';
import { projectRole } from './demigod-company-packet.mjs';
import { buildExport, assertExportValid } from './demigod-recruitai-export.mjs';
import { resolveCompanyEvidence } from './demigod-matching-engine.mjs';

const today = '2026-08-14';

const map = {
  generatedAt: '2026-08-14T12:00:00.000Z',
  companies: [
    {
      id: 't:acme',
      name: 'Acme',
      website: 'https://www.acme.example/',
      jobsUrl: 'https://boards.greenhouse.io/acme',
      atsSource: 'Greenhouse',
      sourceLicense: 'test-license',
      sourceUrl: 'https://example.com/acme',
      retrievedAt: '2026-08-01',
      openRoles: 1,
      openRolesAt: '2026-08-14',
    },
    {
      id: 't:ash',
      name: 'Ash Co',
      website: 'https://ash.example/',
      jobsUrl: 'https://jobs.ashbyhq.com/ash',
      atsSource: 'Ashby',
      sourceLicense: 'test-license',
      sourceUrl: 'https://example.com/ash',
      retrievedAt: '2026-08-01',
      openRoles: 1,
      openRolesAt: '2026-08-14',
    },
    {
      id: 't:lev',
      name: 'Lev Co',
      website: 'https://lev.example/',
      jobsUrl: 'https://jobs.lever.co/lev',
      atsSource: 'Lever',
      sourceLicense: 'test-license',
      sourceUrl: 'https://example.com/lev',
      retrievedAt: '2026-08-01',
      openRoles: 1,
      openRolesAt: '2026-08-14',
    },
  ],
};

const ledger = {
  updatedAt: today,
  roles: {
    'Greenhouse|acme|1': {
      provider: 'Greenhouse',
      slug: 'acme',
      jobId: '1',
      company: 'Acme',
      title: 'Staff Engineer',
      location: 'San Francisco, CA',
      url: 'https://boards.greenhouse.io/acme/jobs/1',
      firstSeen: '2026-07-01',
      lastSeen: today,
      closedAt: null,
      nativePostedAt: '2026-06-01',
      nativeDateField: 'first_published',
      nativeUpdatedAt: '2026-07-20',
      employerDepartment: 'Engineering',
      employerOffice: 'San Francisco',
      workplaceType: 'Hybrid',
      employmentType: 'Full-time',
      nativeDeadline: '2026-12-01',
    },
    'Ashby|ash|a1': {
      provider: 'Ashby',
      slug: 'ash',
      jobId: 'a1',
      company: 'Ash Co',
      title: 'Research Product Manager',
      location: 'San Francisco',
      url: 'https://jobs.ashbyhq.com/ash/a1',
      firstSeen: '2026-07-10',
      lastSeen: today,
      closedAt: null,
      nativePostedAt: '2026-04-27',
      nativeDateField: 'publishedAt',
      employerDepartment: 'Product',
      workplaceType: 'Remote',
      employmentType: 'FullTime',
    },
    'Lever|lev|l1': {
      provider: 'Lever',
      slug: 'lev',
      jobId: 'l1',
      company: 'Lev Co',
      title: 'Account Executive',
      location: 'New York',
      url: 'https://jobs.lever.co/lev/l1',
      firstSeen: '2026-07-05',
      lastSeen: today,
      closedAt: null,
      nativePostedAt: '2026-05-01',
      nativeDateField: 'createdAt',
      employerDepartment: 'Sales',
      employerOffice: 'New York',
    },
  },
};

// Helper: department/office when present; missing first_published stays null;
// firstObservedAt is never used as postedAt.
const gh = projectEmployerAtsFields(ledger.roles['Greenhouse|acme|1']);
assert.equal(gh.employerDepartment, 'Engineering');
assert.equal(gh.employerOffice, 'San Francisco');
assert.equal(gh.workplaceType, 'Hybrid');
assert.equal(gh.employmentType, 'Full-time');
assert.equal(gh.nativeDeadline, '2026-12-01');
assert.equal(gh.postedAt, '2026-06-01');
assert.equal(gh.nativePostedAt, '2026-06-01');
assert.equal(gh.firstObservedAt, '2026-07-01');
assert.notEqual(gh.postedAt, gh.firstObservedAt);
assert.equal(gh.postedVsEditedDays, 49);

const ash = projectEmployerAtsFields(ledger.roles['Ashby|ash|a1']);
assert.equal(ash.employerDepartment, 'Product');
assert.equal(ash.postedAt, null);
assert.equal(ash.nativePostedAt, null);
assert.equal(ash.nativeDateField, 'publishedAt');
assert.equal(ash.firstObservedAt, '2026-07-10');

const lev = projectEmployerAtsFields(ledger.roles['Lever|lev|l1']);
assert.equal(lev.employerDepartment, 'Sales');
assert.equal(lev.employerOffice, 'New York');
assert.equal(lev.postedAt, null);
assert.equal(lev.nativePostedAt, null);
assert.equal(lev.nativeDateField, 'createdAt');
assert.equal(lev.firstObservedAt, '2026-07-05');

const sameDayWrongField = projectEmployerAtsFields({
  firstSeen: '2026-07-01',
  nativePostedAt: '2026-07-01',
  nativeDateField: 'createdAt',
});
assert.equal(sameDayWrongField.postedAt, null);
assert.equal(sameDayWrongField.firstObservedAt, '2026-07-01');

const packetRole = projectRole(ledger.roles['Greenhouse|acme|1']);
assert.equal(packetRole.employerDepartment, 'Engineering');
assert.equal(packetRole.nativePostedAt, '2026-06-01');
assert.equal(projectRole(ledger.roles['Ashby|ash|a1']).nativePostedAt, null);

// Export open-role nodes.
const doc = buildExport(map, ledger, { today });
assertExportValid(doc);
const roles = Object.fromEntries(
  doc.relationships.nodes.filter((n) => n.type === 'open_role').map((n) => [n.id, n]),
);
const ghNode = roles['role:Greenhouse|acme|1'];
const ashNode = roles['role:Ashby|ash|a1'];
const levNode = roles['role:Lever|lev|l1'];
assert.ok(ghNode && ashNode && levNode, 'all three open_role nodes present');
assert.equal(ghNode.employerDepartment, 'Engineering');
assert.equal(ghNode.employerOffice, 'San Francisco');
assert.equal(ghNode.workplaceType, 'Hybrid');
assert.equal(ghNode.employmentType, 'Full-time');
assert.equal(ghNode.nativeDeadline, '2026-12-01');
assert.equal(ghNode.postedAt, '2026-06-01');
assert.equal(ghNode.nativePostedAt, '2026-06-01');
assert.equal(ghNode.firstObservedAt, '2026-07-01');
assert.equal(ghNode.firstObservedAt, ghNode.firstSeen);
assert.notEqual(ghNode.postedAt, ghNode.firstObservedAt);
assert.equal(ghNode.nativeUpdatedAt, '2026-07-20');
assert.equal(ghNode.postedVsEditedDays, 49);

assert.equal(ashNode.employerDepartment, 'Product');
assert.equal(ashNode.postedAt, null);
assert.equal(ashNode.nativePostedAt, null);
assert.equal(ashNode.nativeDateField, 'publishedAt');
assert.equal(ashNode.firstObservedAt, '2026-07-10');

assert.equal(levNode.employerDepartment, 'Sales');
assert.equal(levNode.employerOffice, 'New York');
assert.equal(levNode.postedAt, null);
assert.equal(levNode.nativePostedAt, null);
assert.equal(levNode.nativeDateField, 'createdAt');
assert.equal(levNode.firstObservedAt, '2026-07-05');

const dumped = JSON.stringify(doc);
assert.ok(!/"email"/.test(dumped) && !/"phone"/.test(dumped) && !/"persona"/.test(dumped));
assert.ok(!/"score"/.test(dumped));
for (const row of doc.rows) {
  assert.ok(!('email' in row) && !('phone' in row) && !('persona' in row));
}

// Match-review sidecar observations.
const ghEvidence = resolveCompanyEvidence(
  { company: 'Acme', title: 'Staff Engineer' },
  map,
  ledger,
  today,
);
assert.equal(ghEvidence.status, 'matched');
assert.equal(ghEvidence.roleObservations.length, 1);
const ghObs = ghEvidence.roleObservations[0];
assert.equal(ghObs.employerDepartment, 'Engineering');
assert.equal(ghObs.employerOffice, 'San Francisco');
assert.equal(ghObs.postedAt, '2026-06-01');
assert.equal(ghObs.firstObservedAt, '2026-07-01');
assert.notEqual(ghObs.postedAt, ghObs.firstObservedAt);
assert.equal(ghObs.observedFrom, '2026-07-01');

const ashEvidence = resolveCompanyEvidence(
  { company: 'Ash Co', title: 'Research Product Manager' },
  map,
  ledger,
  today,
);
assert.equal(ashEvidence.roleObservations[0].postedAt, null);
assert.equal(ashEvidence.roleObservations[0].nativePostedAt, null);
assert.equal(ashEvidence.roleObservations[0].employerDepartment, 'Product');
assert.equal(ashEvidence.roleObservations[0].firstObservedAt, '2026-07-10');

const levEvidence = resolveCompanyEvidence(
  { company: 'Lev Co', title: 'Account Executive' },
  map,
  ledger,
  today,
);
assert.equal(levEvidence.roleObservations[0].postedAt, null);
assert.equal(levEvidence.roleObservations[0].nativeDateField, 'createdAt');
assert.equal(levEvidence.roleObservations[0].employerOffice, 'New York');

const evidenceDump = JSON.stringify({ ghEvidence, ashEvidence, levEvidence });
assert.ok(!/"email"/.test(evidenceDump) && !/"phone"/.test(evidenceDump) && !/"persona"/.test(evidenceDump));

console.log(JSON.stringify({ ok: true, selftest: 'ats-fields-export' }));
