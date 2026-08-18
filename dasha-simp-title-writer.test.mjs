#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  QUIZ_LANES,
  QUIZ_TITLE_FALLBACK,
  answerQuizAttempt,
  quizResultForAttempt,
  startQuizAttempt,
  storedQuizTitle,
  submitQuiz,
} from './dasha-simp-score.mjs';

/* Writer guard (SPEC-claude-title-writer 2026-08-16): a stored quiz result title is a real quiz
   title, else 'Dasha simp'. Never empty, never 'Still loading', never the lane. */
const PLACEHOLDERS = ['', ' ', 'Still loading', 'still loading…', 'Loading...', 'undefined', 'null', '—', '…', null, undefined];
for (const p of PLACEHOLDERS) {
  assert.equal(storedQuizTitle(p), QUIZ_TITLE_FALLBACK, `placeholder ${JSON.stringify(p)} → fallback`);
  assert.equal(storedQuizTitle(p, 9, 28), 'Dasha curious', `placeholder ${JSON.stringify(p)} + score → real title`);
}
for (const lane of QUIZ_LANES) assert.equal(storedQuizTitle(lane), QUIZ_TITLE_FALLBACK, `lane ${lane} never becomes the title`);
assert.equal(storedQuizTitle('Confirmed simp'), 'Confirmed simp');
assert.equal(storedQuizTitle('  Dasha scholar  ', 0, 1), 'Dasha scholar');

// Full finish through the same writer the Worker persists from (submitQuiz → quizResultForAttempt).
const now = 1_700_000_000_000;
let attempt = startQuizAttempt({ now, mode: 'quick' });
while (attempt.current) {
  const advanced = answerQuizAttempt(attempt, 0, { now: now + 1000 });
  assert(advanced.ok, advanced.error);
  attempt = advanced.attempt;
}
const result = quizResultForAttempt(attempt, { now, rng: () => 0.5 });
assert(result, 'quick attempt finishes');
assert.equal(result.title, storedQuizTitle(result.title, result.correct, result.total));
assert.notEqual(result.title.toLowerCase(), 'still loading');
assert(!QUIZ_LANES.includes(result.title), 'lane not written as title');

const submitted = submitQuiz({}, { xId: '1', handle: 'tester' }, attempt, { now, rng: () => 0.5 });
assert(submitted.ok, submitted.error);
assert.equal(submitted.quiz.title, result.title);
assert.equal(submitted.store['1'].quiz.title, result.title);
console.log('dasha-simp-title-writer: ok', { title: result.title, correct: result.correct, total: result.total });
