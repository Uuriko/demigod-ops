import test from 'node:test';
import assert from 'node:assert/strict';
import { isMatchingReadyRole, rolesFromPartnerInbox } from './demigod-matching-engine.mjs';
import { startupRoleReadiness } from './demigod-submissions-lib.mjs';

test('partial founder briefs stay in inbox but out of matching until compensation exists', () => {
  const base = {
    id: 'sub-founder',
    form: 'startup-hire',
    status: 'new',
    raw: { 'company-name': 'Acme', 'role-title': 'Founding PM', 'stack-needs': 'B2B SaaS' },
  };
  assert.deepEqual(rolesFromPartnerInbox({ items: [base] }), []);
  const completeRaw = {
    ...base.raw,
    'company-stage': 'seed',
    '90day-outcome': 'Ship onboarding v1',
    'work-location': 'sf-hybrid',
    'salary-range': '$180-220k',
    'contact-email': 'founder@example.com',
  };
  assert.equal(startupRoleReadiness({ ...base, status: 'new', raw: completeRaw }).matchReady, false);
  const reviewed = { ...base, status: 'reviewed', raw: completeRaw };
  assert.deepEqual(startupRoleReadiness(reviewed), { applicable: true, matchReady: true, missing: [], lifecycleReady: true, policyReady: true });
  const controlEmail = startupRoleReadiness({
    ...reviewed,
    raw: { ...completeRaw, 'contact-email': 'a\u0000@b.com' },
  });
  assert.equal(controlEmail.matchReady, false);
  assert.equal(controlEmail.missing.includes('contact-email'), true);
  for (const key of ['company-name', 'company-stage', 'role-title', 'stack-needs', '90day-outcome', 'work-location', 'salary-range', 'contact-email']) {
    const raw = { ...completeRaw }; delete raw[key];
    assert.equal(startupRoleReadiness({ ...reviewed, raw }).matchReady, false, key);
  }
  const contactPoison = startupRoleReadiness({
    ...reviewed,
    raw: {
      'company-name': 'victim@example.com',
      'company-stage': 'victim@example.com',
      'role-title': 'victim@example.com',
      'stack-needs': 'victim@example.com',
      '90day-outcome': 'victim@example.com',
      'work-location': 'victim@example.com',
      'salary-range': 'victim@example.com',
      'contact-email': 'not-an-email',
    },
  });
  assert.equal(contactPoison.matchReady, false);
  assert.deepEqual(contactPoison.missing, [
    'company-name', 'company-stage', 'role-title', 'stack-needs', '90day-outcome',
    'work-location', 'salary-range', 'contact-email',
  ]);
  assert.deepEqual(rolesFromPartnerInbox({ items: [reviewed] }), [{
    id: 'sub-founder', title: 'Founding PM', company: 'Acme', source: 'inbox', real: true,
    status: 'Active', stageType: 'seed', skills: 'B2B SaaS', outcome90d: 'Ship onboarding v1', locationPref: 'sf-hybrid', comp: '$180-220k',
  }]);
});

test('partner referrals stay in intake but out of matching without role evidence', () => {
  const roles = rolesFromPartnerInbox({ items: [{
    id: 'sub-partner', form: 'partner-apply', status: 'reviewed',
    raw: { 'partner-org': 'Seed Fund', 'role-title': 'Portfolio introduction' },
  }] });
  assert.equal(roles.length, 1);
  assert.equal(isMatchingReadyRole(roles[0]), false);
});
