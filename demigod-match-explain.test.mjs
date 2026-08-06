#!/usr/bin/env node
// Guard: a match score must carry the reason it is what it is.
//
// scoreMatch returned a bare 0-100 and discarded the six terms that produced it, so a human
// reviewing a proposed pair saw "score=73" with no way to tell whether that was a real skills
// overlap or a stack of weak proxies. explainMatch surfaces the breakdown; scoreMatch now sums it.
//
// Two properties matter and both are easy to lose in a later edit:
//   1. the breakdown ADDS UP to the score — a decorative breakdown that drifts from the number is
//      worse than none, because it looks like evidence
//   2. the refactor stayed score-preserving — no candidate's ranking moved
//
//   node --test demigod-match-explain.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainMatch } from './demigod-matching-engine.mjs';

const role = {
  title: 'Senior Backend Engineer',
  stage: 'seed',
  comp: '$150k-$200k',
  location: 'San Francisco, CA',
  // roleMatchText reads title/skills/stack-needs/outcome — NOT description. Using description
  // here produced a score of 28 with no skills-overlap term at all, which is exactly the kind of
  // silently-wrong input the breakdown exists to expose.
  skills: 'python postgres kubernetes',
};
const candidate = {
  'skills-stack': 'python, postgres, kubernetes',
  location: 'SF Bay Area',
  'salary-expectation': '$160k',
  'why-this-role': 'want early stage impact',
  experience: 'built production systems',
};

test('the breakdown adds up to the score', () => {
  const out = explainMatch(role, candidate);
  const summed = Math.min(100, Math.round(out.terms.reduce((s, t) => s + t.points, 0)));
  assert.equal(out.score, summed, 'a breakdown that does not sum to the score is decoration, not evidence');
  assert.ok(out.score > 0, 'fixture must actually score — a zero proves nothing');
});

test('a strong candidate names skills-overlap as the load-bearing term', () => {
  const out = explainMatch(role, candidate);
  const names = out.terms.map((t) => t.name);
  assert.ok(names.includes('skills-overlap'), `expected skills-overlap in ${names.join(', ')}`);
  const top = [...out.terms].sort((a, b) => b.points - a.points)[0];
  assert.equal(top.name, 'skills-overlap', 'the biggest term for a matching candidate must be the skills, not a proxy');
  assert.match(top.detail, /python|postgres|kubernetes/, 'the detail must name the shared skills, not just a count');
});

test('a candidate with no overlap scores on proxies only — and that is visible', () => {
  const mismatched = { ...candidate, 'skills-stack': 'welding, carpentry', location: 'Austin' };
  const out = explainMatch(role, mismatched);
  const names = out.terms.map((t) => t.name);
  assert.equal(names.includes('skills-overlap'), false, 'no shared skills must not manufacture an overlap term');
  // This is the case the breakdown exists for: a nonzero score carried entirely by weak signals.
  assert.ok(out.score < explainMatch(role, candidate).score, 'a mismatched candidate must score below a matching one');
});

test('empty inputs score zero with no invented terms', () => {
  for (const [r, c] of [[{}, {}], [role, {}], [{}, candidate]]) {
    const out = explainMatch(r, c);
    assert.equal(out.terms.some((t) => t.points > 0 && !t.detail), false, 'no term may appear without a stated basis');
    assert.equal(out.score, Math.min(100, Math.round(out.terms.reduce((s, t) => s + t.points, 0))), 'sum holds on empties too');
  }
});
