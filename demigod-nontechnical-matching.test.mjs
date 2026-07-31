#!/usr/bin/env node
import assert from 'node:assert/strict';
import { anonymizeCandidate } from './demigod-submissions-lib.mjs';
import { decideMatch, matchEvidence } from './demigod-matching-engine.mjs';

const role = {
  title: 'Founding Growth Lead',
  skills: 'HubSpot, lifecycle marketing, partner pipeline',
  stageType: 'Seed',
  outcome90d: 'Build a repeatable partner pipeline',
  comp: '$170-190k',
};
const candidate = {
  'full-name': 'Maya Chen',
  'seeker-email': 'maya@example.com',
  'skills-stack': 'GTM operations and demand generation',
  experience: 'Built HubSpot lifecycle programs and a partner pipeline that doubled qualified opportunities.',
  'why-startups': 'I like building repeatable growth systems from zero.',
  'salary-expectation': '$170-190k',
  'sf-bay': 'yes',
};

const publicCard = anonymizeCandidate(candidate);
assert.doesNotMatch(JSON.stringify(publicCard), /Maya|maya@example\.com/i);
assert.match(publicCard.summary, /GTM operations|HubSpot/i);

const result = decideMatch(role, candidate, 60);
assert.equal(result.match, true, `nontechnical evidence should clear review threshold: ${result.score}`);
assert.ok(result.reasons.some((reason) => /work evidence:.*hubspot/i.test(reason)), result.reasons.join('; '));
assert.ok(result.reasons.includes('90-day outcome motivation provided'));
assert.ok(matchEvidence(role, candidate).includes('experience evidence provided'));

const copiedMotivation = decideMatch(role, {
  'skills-stack': 'Brand design and visual identity',
  experience: 'Designed consumer brand systems and campaign visuals.',
  'why-startups': 'Founding Growth Lead: HubSpot lifecycle marketing, partner pipeline, build a repeatable partner pipeline.',
  'sf-bay': 'yes',
}, 60);
assert.equal(copiedMotivation.match, false, `motivation must not masquerade as skills: ${copiedMotivation.score}`);
assert.equal(copiedMotivation.state, 'reviewed');
assert.doesNotMatch(copiedMotivation.reasons.join('; '), /skills:|work evidence:/i);

const genericOnly = decideMatch({
  title: 'Founding Operations Lead',
  skills: 'startup leadership, team building',
  stageType: 'Seed',
}, {
  'skills-stack': 'startup leadership and team building',
  experience: 'Led startup teams for years.',
  'sf-bay': 'yes',
}, 60);
assert.equal(genericOnly.match, false, `generic startup language must not clear threshold: ${genericOnly.score}`);
assert.equal(genericOnly.state, 'reviewed');
assert.doesNotMatch(genericOnly.reasons.join('; '), /skills:|work evidence:/i);

console.log('demigod nontechnical matching integrity: PASS');
