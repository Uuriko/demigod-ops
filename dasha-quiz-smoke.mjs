#!/usr/bin/env node
/**
 * Quiz smoke — disk path integrity + optional live Worker checks.
 *
 *   node dasha-quiz-smoke.mjs              # disk only; never mutates production
 *   node dasha-quiz-smoke.mjs --live       # disk + read-only live checks
 *   node dasha-quiz-smoke.mjs --live-only  # read-only live checks
 *   node dasha-quiz-smoke.mjs --live-write # disk + synthetic live starts (explicit)
 */
import assert from 'node:assert/strict';
import {
  QUIZ_QUESTIONS,
  QUIZ_PATH_LENGTH,
  QUIZ_SCORED_LENGTH,
  QUIZ_LANES,
  QUIZ_VERSION,
  startQuizAttempt,
  answerQuizAttempt,
  questionForAttempt,
  quizResultForAttempt,
  quizPublic,
} from './dasha-simp-score.mjs';

const args = new Set(process.argv.slice(2));
const disk = !args.has('--live-only');
const live = args.has('--live') || args.has('--live-only') || args.has('--live-write');
const liveWrite = args.has('--live-write');
const ORIGIN = 'https://www.getdasha.com';
const QUIZ = 'https://lobby.getdasha.com/simp/quiz';
const now = Date.now();
const flatRng = () => 0.5;
const fails = [];

function ok(name, cond, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else {
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    fails.push(name);
  }
}

function walk(route) {
  let attempt = startQuizAttempt({ now });
  ok(`route ${route}: hidden total`, attempt.total === QUIZ_PATH_LENGTH);
  let step = answerQuizAttempt(attempt, route, { now });
  attempt = step.attempt;
  const seen = new Set(['route']);
  while (!step.done) {
    const id = step.question.id;
    assert(!seen.has(id), `repeat ${id}`);
    seen.add(id);
    const privateQ = QUIZ_QUESTIONS.find((q) => q.id === id);
    step = answerQuizAttempt(attempt, privateQ.answer, { now });
    attempt = step.attempt;
  }
  ok(`route ${route}: position`, attempt.position === QUIZ_PATH_LENGTH, `pos=${attempt.position}`);
  ok(`route ${route}: scorable`, attempt.scorable === QUIZ_SCORED_LENGTH);
  const result = quizResultForAttempt(attempt, { now, rng: flatRng });
  ok(`route ${route}: result`, Boolean(result && result.correct === QUIZ_SCORED_LENGTH && !('mode' in result)));
  return attempt;
}

if (disk) {
  console.log('disk');
  const pub = quizPublic();
  ok('quizPublic version', pub.version === QUIZ_VERSION);
  ok('quizPublic no answers', !JSON.stringify(pub).includes('"answer"'));
  ok('quizPublic no length', !('total' in pub) && !('quickTotal' in pub) && !('modes' in pub));
  ok('v10', QUIZ_VERSION === 'dasha-simp-quiz/v10');
  for (let lane = 0; lane < QUIZ_LANES.length; lane++) walk(lane);
  const first = questionForAttempt(startQuizAttempt({ now }));
  ok('progress shows scored total', first.progress.current === 0 && first.progress.total === QUIZ_SCORED_LENGTH);
}

if (live) {
  console.log('live');
  try {
    const get = await fetch(QUIZ, { headers: { Origin: ORIGIN }, signal: AbortSignal.timeout(8000) });
    const getBody = await get.json();
    ok('GET /simp/quiz', get.ok && getBody.version === QUIZ_VERSION, `v=${getBody.version}`);
    ok('GET no answers', !JSON.stringify(getBody).includes('"answer"'));
    ok('GET no modes', !('modes' in getBody) && !('quickTotal' in getBody));

    if (liveWrite) {
      console.log('  NOTE  synthetic production starts explicitly enabled');
      const res = await fetch(QUIZ, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({ action: 'start' }),
        signal: AbortSignal.timeout(8000),
      });
      const body = await res.json();
      ok(
        'POST start',
        res.ok && body.question?.id === 'route' && !body.progress?.total,
        `id=${body.question?.id} total=${body.progress?.total}`,
      );
    } else console.log('  SKIP  live quiz starts (use --live-write; mutates aggregate counters)');

    const client = await fetch('https://lobby.getdasha.com/client/simp-board.js', {
      signal: AbortSignal.timeout(8000),
    });
    const js = await client.text();
    ok('client 200', client.ok && js.length > 1000);
    ok('client one start', js.includes('startQuiz()') || js.includes('Take the quiz'));
  } catch (e) {
    ok('live fetch', false, String(e.message || e));
  }
}

if (disk) {
  console.log('disk-client');
  const { readFileSync } = await import('node:fs');
  const diskJs = readFileSync(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
  ok('disk answer guard', diskJs.includes('quizAnswerBusy'));
  ok('disk snappy feedback', diskJs.includes('650') && diskJs.includes('1100'));
  ok('disk retake', diskJs.includes('retakeQuiz'));
  ok('disk no Quick/Deep chrome', !diskJs.includes('QUICK ·') && !diskJs.includes('10Q') && !diskJs.includes('20Q'));
}

if (fails.length) {
  console.error(`\ndasha-quiz-smoke: FAIL (${fails.length})`);
  process.exit(1);
}
console.log('\ndasha-quiz-smoke: PASS');
