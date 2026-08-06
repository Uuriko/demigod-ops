#!/usr/bin/env node
// Guard: scoring weights cannot change without someone deciding to change them.
//
// A weight edit in scoreMatch moves every candidate's ranking, breaks no test, throws no error,
// and produces a plausible number. It is the least visible damaging change in this codebase.
// Iteration X proved a scoring refactor safe with a differential harness — 4,000 pairs, new
// implementation vs old — and then threw the harness away, because comparing against a COPY of
// the old implementation only works during a refactor.
//
// So this pins scores against a committed golden file instead. A legitimate weight change means
// a deliberate, reviewable diff in DEMIGOD-MATCH-SCORE-GOLDEN.json; an accidental one is a red
// test naming the term that moved.
//
//   node --test demigod-match-score-drift.test.mjs
//   node demigod-match-score-drift.test.mjs --update    # after an INTENDED weight change
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { explainMatch } from './demigod-matching-engine.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(ROOT, 'DEMIGOD-MATCH-SCORE-GOLDEN.json');

/* Deterministic by construction — no Math.random(). A flaky scoring test gets disabled within a
   week, and this session has already shown how fast a standing red becomes background noise. */
const SKILLS = ['python postgres kubernetes', 'react typescript graphql', 'go rust distributed systems', 'welding carpentry'];
/* These are enum-ish, not free text. candidateLocationPreference reads `sf-bay`/`locationPref`
   and roleLocationPreference reads `locationPref`/`work-location`, each against a fixed regex —
   a plain `location: 'SF Bay Area'` matches neither, so the first version of this corpus never
   fired a single location term and topped out at 83. Same class as using `description` for role
   skills: a field the engine does not read scores silently as absent. */
const CAND_LOC = ['yes', 'sf bay area', 'remote', 'no', ''];
const ROLE_LOC = ['sf-onsite', 'sf-hybrid', 'remote-us', 'bay-flexible', ''];
const STAGES = ['seed', 'pre-seed', 'series a', ''];
const COMPS = ['$150k-$200k', ''];

export function corpus() {
  const pairs = [];
  for (const [ri, rSkills] of SKILLS.entries()) {
    for (const [si, stage] of STAGES.entries()) {
      for (const [li, loc] of ROLE_LOC.entries()) {
        for (const [ci, comp] of COMPS.entries()) {
          const cSkills = SKILLS[(ri + si) % SKILLS.length];
          pairs.push({
            id: `r${ri}-s${si}-l${li}-c${ci}`,
            role: { title: 'Engineer', skills: rSkills, stage, locationPref: loc, comp },
            candidate: {
              'skills-stack': cSkills,
              'sf-bay': CAND_LOC[(li + 1) % CAND_LOC.length],
              'salary-expectation': ci ? '' : '$160k',
              'why-this-role': si % 2 ? 'want early stage impact' : '',
              experience: li % 2 ? 'built production systems' : '',
            },
          });
        }
      }
    }
  }
  // Edge cases the generated grid does not reach.
  pairs.push({ id: 'empty-both', role: {}, candidate: {} });
  pairs.push({ id: 'empty-role', role: {}, candidate: { 'skills-stack': 'python postgres kubernetes' } });
  pairs.push({ id: 'empty-candidate', role: { title: 'Engineer', skills: 'python postgres kubernetes' }, candidate: {} });
  pairs.push({
    id: 'capped', // every term firing at once — must clamp at 100, not overflow
    role: { title: 'Engineer', skills: 'python postgres kubernetes react typescript go rust', stage: 'seed', locationPref: 'sf-onsite', comp: '$150k-$200k' },
    candidate: {
      'skills-stack': 'python postgres kubernetes react typescript go rust',
      'sf-bay': 'yes', 'salary-expectation': '$160k',
      'why-this-role': 'want early stage impact at a seed company',
      experience: 'built production distributed systems',
    },
  });
  return pairs;
}

const actual = () => Object.fromEntries(corpus().map((p) => {
  const out = explainMatch(p.role, p.candidate);
  return [p.id, { score: out.score, terms: Object.fromEntries(out.terms.map((t) => [t.name, t.points])) }];
}));

if (process.argv.includes('--update')) {
  fs.writeFileSync(GOLDEN, `${JSON.stringify({ schema: 'demigod.match-score-golden/1', scores: actual() }, null, 2)}\n`);
  console.log(`golden updated: ${Object.keys(actual()).length} pairs`);
  process.exit(0);
}

test('scoring has not drifted from the recorded golden', () => {
  assert.ok(fs.existsSync(GOLDEN), 'golden file missing — run: node demigod-match-score-drift.test.mjs --update');
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8')).scores;
  const now = actual();
  assert.ok(Object.keys(golden).length >= 40, `golden must cover a real corpus, has ${Object.keys(golden).length}`);

  const drift = [];
  for (const [id, want] of Object.entries(golden)) {
    const got = now[id];
    if (!got) { drift.push(`${id}: missing from corpus`); continue; }
    if (got.score !== want.score) {
      // Name the term that moved, not just the total — "expected 82 got 74" sends someone hunting.
      const moved = [...new Set([...Object.keys(want.terms), ...Object.keys(got.terms)])]
        .filter((t) => (want.terms[t] || 0) !== (got.terms[t] || 0))
        .map((t) => `${t} ${want.terms[t] ?? 0}→${got.terms[t] ?? 0}`);
      drift.push(`${id}: score ${want.score}→${got.score} (${moved.join(', ') || 'no term changed — check the cap or rounding'})`);
    }
  }
  assert.equal(drift.length, 0,
    `scoring changed for ${drift.length} pair(s). If intended, run --update and commit the golden:\n  ${drift.slice(0, 8).join('\n  ')}`);
});

test('every score equals the sum of its own breakdown', () => {
  // Without this the basis is decoration: a breakdown that drifts from the number looks like
  // evidence while being wrong, which is worse than showing no breakdown at all.
  let checked = 0;
  for (const p of corpus()) {
    const out = explainMatch(p.role, p.candidate);
    const summed = Math.min(100, Math.round(out.terms.reduce((s, t) => s + t.points, 0)));
    assert.equal(out.score, summed, `${p.id}: score ${out.score} but terms sum to ${summed}`);
    checked += 1;
  }
  assert.ok(checked >= 40, `expected a real corpus, checked ${checked}`);
});

test('the corpus actually exercises scoring, and the capped case really caps', () => {
  // A corpus that scores zero everywhere would pass the golden check forever while proving nothing.
  const scores = corpus().map((p) => explainMatch(p.role, p.candidate).score);
  assert.ok(scores.filter((s) => s > 0).length >= 20, `corpus is degenerate: only ${scores.filter((s) => s > 0).length} nonzero`);
  assert.ok(Math.max(...scores) >= 80, `corpus never reaches a strong match, max ${Math.max(...scores)}`);
  const capped = corpus().find((p) => p.id === 'capped');
  const out = explainMatch(capped.role, capped.candidate);
  assert.equal(out.score, 100, 'the capped fixture must hit the ceiling, or it is not testing the cap');
  assert.equal(out.capped, true, 'and must report that it was capped');
});
