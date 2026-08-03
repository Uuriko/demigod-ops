#!/usr/bin/env node
import assert from 'node:assert/strict';
import { matchEvidence, decideMatch, founderMatchSummary, resolveCompanyEvidence } from './demigod-matching-engine.mjs';

const evidence = matchEvidence(
  { skills: 'AI, React, product', outcome90d: 'Ship onboarding' },
  { skills: 'React, product research', locationPref: 'SF Bay Area', why: 'I want to ship onboarding' },
);
assert.deepEqual(evidence, ['self-reported skills: react, product', 'SF Bay Area preference', 'self-reported motivation supplied']);
assert.equal(matchEvidence({ skills: 'AI' }, { skills: 'retail operations' }).length, 0, 'AI must not substring-match retail');
assert.ok(decideMatch({ skills: 'React' }, { skills: 'React' }, 1).reasons.includes('self-reported skills: react'));
assert.equal(decideMatch({ skills: 'React', locationPref: 'sf-onsite' }, { skills: 'React', 'sf-bay': 'remote-bay' }, 1).match, false);
assert.equal(decideMatch({ skills: 'React', locationPref: 'remote-us' }, { skills: 'React', 'sf-bay': 'remote-bay' }, 1).match, true);
assert.ok(matchEvidence({ locationPref: 'remote-us' }, { 'sf-bay': 'remote-bay' }).includes('work-location preferences align'));
for (const [availability, expected] of [['now', 'ready now'], ['2-4w', '2–4 weeks'], ['1-3m', '1–3 months'], ['passive', 'passively open']]) {
  assert.ok(matchEvidence({}, { availability }).includes(`availability stated: ${expected}`));
}
assert.deepEqual(
  matchEvidence({ comp: '$180-220k' }, { 'salary-expectation': '$170–190k base', availability: 'now' }),
  ['compensation ranges overlap', 'availability stated: ready now'],
);
const freshAvailability = matchEvidence({}, {
  form: 'engineer-join',
  at: new Date(Date.now() - 6 * 86400000).toISOString(),
  raw: { availability: 'now' },
});
assert.match(freshAvailability[0], /^availability: ready now · self-reported \d+d ago$/);
const staleAvailability = matchEvidence({}, {
  form: 'engineer-join',
  at: new Date(Date.now() - 31 * 86400000).toISOString(),
  raw: { availability: 'now' },
});
assert.deepEqual(staleAvailability, ['availability unconfirmed · last self-reported 31d ago — reconfirm before introduction']);
assert.doesNotMatch(staleAvailability.join(' '), /ready now/);
const privateConstraints = matchEvidence(
  { comp: '$100-120k' },
  { 'salary-expectation': '$180-200k', availability: 'Call private@example.com tomorrow' },
);
assert.deepEqual(privateConstraints, ['compensation alignment needs review']);
assert.doesNotMatch(JSON.stringify(privateConstraints), /100|120|180|200|private@example/);
const founderView = founderMatchSummary({
  id: 'sub-123',
  score: 72,
  evidence: ['skills: product'],
  candidate: { raw: { 'full-name': 'Private Person', 'seeker-email': 'private@example.com' } },
});
assert.deepEqual(founderView, { candidateId: 'sub-123', score: 72, evidence: ['skills: product'] });
assert.doesNotMatch(JSON.stringify(founderView), /Private Person|private@example\.com/);

const canaries = ['canary.audit+pii@invalid.example', '415-555-0199', 'linkedin.com/in/canary-private', 'https://files.invalid.example/resumes/private.pdf?token=canary-secret'];
const privateEvidence = founderMatchSummary({
  id: 'sub-canary',
  score: 80,
  evidence: matchEvidence(
    { skills: `React ${canaries.join(' ')}` },
    { 'skills-stack': `React ${canaries.join(' ')}`, experience: `Resume ${canaries[3]}` },
  ),
});
assert.ok(privateEvidence.evidence.some((line) => line.includes('react')), 'useful matching signal must survive privacy scrubbing');
for (const canary of canaries) assert.ok(!JSON.stringify(privateEvidence).includes(canary), 'contact/link canary must not reach founder evidence');
assert.doesNotMatch(JSON.stringify(privateEvidence), /invalid\.example|private\.pdf|canary-secret|linkedin\.com|555-0199/);

const protectedOnly = decideMatch(
  { skills: 'white male', stageType: 'Seed' },
  { 'skills-stack': 'white male', 'sf-bay': 'yes', 'why-startups': 'seed', experience: 'present' },
);
assert.equal(protectedOnly.match, false, 'protected attributes must not create a match');
assert.doesNotMatch(protectedOnly.reasons.join(' '), /white|male/);
for (const [label, candidate] of Object.entries({
  contact: {
    'skills-stack': 'react node',
    'sf-bay': 'victim@example.com',
    'why-startups': 'victim@example.com',
    experience: 'victim@example.com',
  },
  identity: {
    'full-name': 'Alice Smith',
    'skills-stack': 'react node Alice Smith',
    'sf-bay': 'yes',
    'why-startups': 'Alice Smith',
    experience: 'Alice Smith',
  },
})) {
  const result = decideMatch({ skills: 'react node', stageType: 'Seed', outcome: 'ship' }, candidate);
  assert.equal(result.match, false, `${label} text must not supply fit features`);
  assert.deepEqual(result.reasons, ['self-reported skills: react, node']);
}
assert.equal(
  decideMatch(
    { skills: 'react node', stageType: 'Seed', locationPref: 'victim@example.com', outcome: 'ship' },
    { 'skills-stack': 'react node', 'sf-bay': 'yes', 'why-startups': 'ship', experience: 'built' },
    65,
  ).match,
  false,
  'contact-shaped role location must not become a compatibility boost',
);
assert.equal(
  decideMatch(
    { skills: 'react node postgres', stageType: 'Seed' },
    { 'skills-stack': 'react node postgres' },
  ).match,
  false,
  'missing location preference must not receive an SF/seed boost',
);

const giantTokenEvidence = matchEvidence(
  { skills: 'x'.repeat(5000) },
  { 'skills-stack': 'x'.repeat(5000) },
);
assert.ok(giantTokenEvidence.every((reason) => reason.length <= 256), 'external match reasons stay bounded');

const poisonedProjection = resolveCompanyEvidence(
  { company: 'Poison', title: 'Engineer victim@example.com' },
  {
    companies: [{
      id: 'poison',
      name: 'Poison',
      description: 'Call victim@example.com or 415-555-0199',
      tags: ['private@example.com'],
      website: 'https://poison.example',
      atsSource: 'Ashby',
      jobsUrl: 'https://jobs.ashbyhq.com/poison',
    }],
  },
  {
    roles: {
      poison: {
        provider: 'Ashby',
        slug: 'poison',
        title: 'Engineer victim@example.com',
        location: '415-555-0199',
        url: 'https://jobs.ashbyhq.com/poison/engineer',
        firstSeen: '2026-07-20',
        lastSeen: '2026-07-21',
        closedAt: null,
      },
    },
  },
  '2026-07-29',
);
assert.doesNotMatch(JSON.stringify(poisonedProjection), /victim@example|private@example|415-555-0199/);
assert.match(poisonedProjection.company.description, /\[contact removed\].*\[phone removed\]/);

console.log('demigod evidence-backed matching: PASS');
