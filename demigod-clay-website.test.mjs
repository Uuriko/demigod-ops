#!/usr/bin/env node
/**
 * Clay website product — hermetic proof of pure transforms + inject binding.
 * Run: node demigod-clay-website.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyRequisitionId,
  greenhouseEmployerFields,
  editedDaysAgo,
  postedDaysAgo,
} from './demigod-role-ledger.mjs';
import { rolesFeed } from './demigod-roles-feed.mjs';
import { publicRolesFromFeed } from './demigod-public-roles.mjs';
import { hiringVelocity, requisitionStats, clayWebsiteSummary, coverageFreshness } from './demigod-enrichment.mjs';
import { rolesFeedToRss } from './demigod-roles-feed.mjs';
import { ashbyEmployerFields, leverEmployerFields } from './demigod-role-ledger.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Requisition gate (Airbnb trap)
assert.equal(classifyRequisitionId('ONE').requisitionSignal, 'abstain');
assert.equal(classifyRequisitionId('MULTI').requisitionSignal, 'abstain');
assert.equal(classifyRequisitionId('JR104169').requisitionSignal, 'id');
assert.equal(classifyRequisitionId('REQ #27298').requisitionSignal, 'id');

// Employer field extract from GH-shaped job object
const emp = greenhouseEmployerFields({
  requisition_id: 'JR1',
  departments: [{ name: 'Engineering' }],
  offices: [{ name: 'San Francisco' }],
  updated_at: '2026-08-01T12:00:00Z',
  application_deadline: '2026-12-01',
});
assert.equal(emp.employerDepartment, 'Engineering');
assert.equal(emp.employerOffice, 'San Francisco');
assert.equal(emp.requisitionSignal, 'id');

// Feed never confuses firstObservedAt with unattributed postedAt
const T = '2026-08-01';
const ledger = {
  roles: {
    a: {
      provider: 'Greenhouse', slug: 'acme', jobId: '1', company: 'Acme', title: 'Engineer',
      location: 'San Francisco, CA', url: 'https://boards.greenhouse.io/acme/jobs/1',
      fn: 'engineering', usPosted: true, firstSeen: T, lastSeen: T, closedAt: null, reopenCount: 0,
      nativePostedAt: '2026-01-01', nativeDateField: 'first_published',
      nativeUpdatedAt: '2026-07-15', employerDepartment: 'Platform', employerOffice: 'SF',
    },
    b: {
      provider: 'Lever', slug: 'beta', jobId: '2', company: 'Beta', title: 'PM',
      location: 'Remote', url: 'https://jobs.lever.co/beta/2',
      fn: 'product', usPosted: true, firstSeen: T, lastSeen: T, closedAt: null, reopenCount: 0,
      nativePostedAt: '2026-01-01', nativeDateField: 'createdAt',
    },
  },
};
const feed = rolesFeed(ledger, { today: T, days: 7, limit: 50 });
assert.equal(feed.schema, 'demigod.roles-feed/1');
const acme = feed.roles.find((r) => r.company === 'Acme');
const beta = feed.roles.find((r) => r.company === 'Beta');
assert.equal(acme.postedAt, '2026-01-01');
assert.equal(beta.postedAt, null);
assert.equal(acme.firstObservedAt, T);
assert.equal(acme.employerDepartment, 'Platform');
assert.equal(acme.boardUpdatedAt, '2026-07-15');

const pub = publicRolesFromFeed(feed, { limit: 8 });
assert.equal(pub.schema, 'demigod.public-roles/1');
assert.ok(pub.roles.some((r) => r.employerDepartment === 'Platform'));
assert.ok(!/matching inventory/i.test(pub.basis) || /not.*matching inventory/i.test(pub.basis));

// Velocity uses observation clocks only
const vel = hiringVelocity(
  {
    roles: {
      x: { provider: 'Greenhouse', slug: 's', company: 'S', firstSeen: '2026-07-28', closedAt: null },
      y: { provider: 'Greenhouse', slug: 's', company: 'S', firstSeen: '2026-07-01', closedAt: '2026-07-30' },
    },
  },
  { today: '2026-08-01', days: 7 },
);
assert.equal(vel.counts.openedInWindow, 1);
assert.equal(vel.counts.closedInWindow, 1);

// Requisitions dual-count
const rq = requisitionStats({
  roles: {
    a: { closedAt: null, provider: 'Greenhouse', slug: 'airbnb', company: 'Airbnb', requisitionId: 'ONE', requisitionSignal: 'abstain' },
    b: { closedAt: null, provider: 'Greenhouse', slug: 'airbnb', company: 'Airbnb', requisitionId: 'JR1', requisitionSignal: 'id' },
    c: { closedAt: null, provider: 'Greenhouse', slug: 'airbnb', company: 'Airbnb', requisitionId: 'JR1', requisitionSignal: 'id' },
  },
});
assert.equal(rq.counts.openPostings, 3);
assert.equal(rq.counts.requisitionIdShaped, 2);
assert.equal(rq.counts.requisitionAbstain, 1);
assert.equal(rq.topBoards[0].requisitionIdDistinct, 1);

// Inject source binds employer meta (static/structural)
const foot = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
assert.match(foot, /employerOffice/);
assert.match(foot, /firstObservedAt/);
assert.match(foot, /matching inventory/);
assert.match(foot, /function injectObservedRoles/);

// Atlas directory shows employer meta
const atlas = fs.readFileSync(path.join(ROOT, 'demigod-startup-atlas-web.js'), 'utf8');
assert.match(atlas, /employerDepartment/);
assert.match(atlas, /boardUpdatedAt/);

const clay = clayWebsiteSummary({
  ledger: { updatedAt: T, roles: ledger.roles },
  feed,
  velocity: vel,
  requisitions: rq,
  publicRoles: pub,
});
assert.equal(clay.schema, 'demigod.enrichment-clay-website/1');
assert.ok(clay.publicRoles.count >= 1);

const ash = ashbyEmployerFields({ department: 'Eng', employmentType: 'FullTime', workplaceType: 'Remote', location: 'SF' });
assert.equal(ash.employmentType, 'FullTime');
const lev = leverEmployerFields({ categories: { department: 'Sales', commitment: 'Full Time' }, workplaceType: 'remote' });
assert.equal(lev.employerDepartment, 'Sales');

const cov = coverageFreshness(ledger, { today: T });
assert.equal(cov.schema, 'demigod.enrichment-coverage/1');
assert.ok(cov.fieldFill.employerDepartment.n >= 1);

const rss = rolesFeedToRss(feed);
assert.ok(rss.includes('<rss') && rss.includes('Acme — Engineer'));
assert.match(foot, /workplaceType|employmentType/);

console.log(JSON.stringify({ ok: true, selftest: 'clay-website' }));
