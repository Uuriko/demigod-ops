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
  QUIZ_QUICK_LENGTH,
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

function walk(mode) {
  let attempt = startQuizAttempt({ now, mode });
  ok(`${mode}: total`, attempt.total === (mode === 'quick' ? QUIZ_QUICK_LENGTH : QUIZ_PATH_LENGTH));
  let step = answerQuizAttempt(attempt, 0, { now }); // cinema
  attempt = step.attempt;
  const seen = new Set(['route']);
  while (!step.done) {
    const id = step.question.id;
    assert(!seen.has(id), `${mode} repeat ${id}`);
    seen.add(id);
    if (mode === 'quick' && /^(cinema|podcast|lore)-[4-9]$/.test(attempt.current)) {
      throw new Error(`${mode} entered deep-only key ${attempt.current}`);
    }
    const privateQ = QUIZ_QUESTIONS.find((q) => q.id === id);
    step = answerQuizAttempt(attempt, privateQ.answer, { now });
    attempt = step.attempt;
  }
  ok(`${mode}: position`, attempt.position === attempt.total, `pos=${attempt.position}`);
  const result = quizResultForAttempt(attempt, { now, rng: flatRng });
  ok(`${mode}: result`, Boolean(result && result.mode === mode), JSON.stringify(result && result.mode));
  return attempt;
}

if (disk) {
  console.log('disk');
  const pub = quizPublic();
  ok('quizPublic version', pub.version === QUIZ_VERSION);
  ok('quizPublic no answers', !JSON.stringify(pub).includes('"answer"'));
  ok('modes', Array.isArray(pub.modes) && pub.modes.includes('quick') && pub.modes.includes('deep'));
  for (const mode of ['quick', 'deep']) walk(mode);
  for (let lane = 0; lane < QUIZ_LANES.length; lane++) {
    let step = answerQuizAttempt(startQuizAttempt({ now, mode: 'quick' }), lane, { now });
    let attempt = step.attempt;
    while (!step.done) {
      const privateQ = QUIZ_QUESTIONS.find((q) => q.id === step.question.id);
      step = answerQuizAttempt(attempt, privateQ.answer, { now });
      attempt = step.attempt;
    }
    ok(`quick lane ${lane}`, attempt.position === QUIZ_QUICK_LENGTH);
  }
  const first = questionForAttempt(startQuizAttempt({ now }));
  ok('default deep', first.progress.total === QUIZ_PATH_LENGTH);
  for (let lane = 0; lane < QUIZ_LANES.length; lane++) {
    const seen = [];
    let step = answerQuizAttempt(startQuizAttempt({ now, mode: 'quick' }), lane, { now });
    let attempt = step.attempt;
    while (!step.done) {
      seen.push(step.question.id);
      const privateQ = QUIZ_QUESTIONS.find((q) => q.id === step.question.id);
      step = answerQuizAttempt(attempt, privateQ.answer, { now });
      attempt = step.attempt;
    }
    ok(`quick lane ${lane} has account`, seen.includes('account'));
    ok(
      `quick lane ${lane} no receipt trivia`,
      !seen.some((id) => ['dunkinprice', 'chesstreak', 'materialistsdays', 'latehost'].includes(id)),
    );
  }
}

if (live) {
  console.log('live');
  try {
    const get = await fetch(QUIZ, { headers: { Origin: ORIGIN }, signal: AbortSignal.timeout(8000) });
    const getBody = await get.json();
    ok('GET /simp/quiz', get.ok && getBody.version === QUIZ_VERSION, `v=${getBody.version}`);
    ok('GET no answers', !JSON.stringify(getBody).includes('"answer"'));
    ok('GET modes', Array.isArray(getBody.modes) && getBody.quickTotal === QUIZ_QUICK_LENGTH);

    if (liveWrite) {
      console.log('  NOTE  synthetic production starts explicitly enabled');
      for (const mode of ['quick', 'deep']) {
        const res = await fetch(QUIZ, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
          body: JSON.stringify({ action: 'start', mode }),
          signal: AbortSignal.timeout(8000),
        });
        const body = await res.json();
        const want = mode === 'quick' ? QUIZ_QUICK_LENGTH : QUIZ_PATH_LENGTH;
        ok(
          `POST start ${mode}`,
          res.ok && body.mode === mode && body.progress?.total === want,
          `mode=${body.mode} total=${body.progress?.total}`,
        );
        ok(`POST start ${mode} question`, body.question?.id === 'route');
      }
    } else console.log('  SKIP  live quiz starts (use --live-write; mutates aggregate counters)');

    const client = await fetch('https://lobby.getdasha.com/client/simp-board.js', {
      signal: AbortSignal.timeout(8000),
    });
    const js = await client.text();
    ok('client 200', client.ok && js.length > 1000);
    ok('client quick start', js.includes("startQuiz('quick')"));
    ok('client deep start', js.includes("startQuiz('deep')"));
    ok('client no bare startQuiz()', !/\bstartQuiz\(\s*\)/.test(js));
    // Post-deploy soft checks (warn only if older client still live mid-ship)
    if (!js.includes('quizAnswerBusy')) {
      console.log('  WARN  live client missing answer guard — redeploy lobby assets');
    }
  } catch (e) {
    ok('live fetch', false, String(e.message || e));
  }
}

// Disk client contracts (always, independent of CDN lag)
if (disk) {
  console.log('disk-client');
  const { readFileSync } = await import('node:fs');
  const diskJs = readFileSync(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
  ok('disk answer guard', diskJs.includes('quizAnswerBusy'));
  ok('disk snappy feedback', diskJs.includes('650') && diskJs.includes('1100'));
  ok('disk retakeMode', diskJs.includes('retakeMode'));
  ok('disk mode label', diskJs.includes('QUICK ·'));
}

if (fails.length) {
  console.error(`\ndasha-quiz-smoke: FAIL (${fails.length})`);
  process.exit(1);
}
console.log('\ndasha-quiz-smoke: PASS');
