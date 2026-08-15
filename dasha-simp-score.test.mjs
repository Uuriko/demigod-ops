import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LINKED_X_POINTS,
  CREATIVE_POINTS,
  CREATIVE_CAP_28D,
  COMMUNITY_POINTS,
  COMMUNITY_CAP_28D,
  OSS_CAP_SEASON,
  ROLLING_MS,
  ZERO_POINT_SOURCES,
  isValidEvidenceUrl,
  isValidOssEvidenceUrl,
  scoreProfile,
  rankProfiles,
  buildPublicBoard,
  rulesPublic,
  proposeAward,
  joinBoard,
  leaveBoard,
  meStatus,
  enrollmentFromSession,
  publicPerryRow,
  badgesForProfile,
  assertPublicSafe,
  SCHEMA,
  QUIZ_QUESTIONS,
  QUIZ_VERSION,
  QUIZ_PATH_LENGTH,
  QUIZ_SCORED_LENGTH,
  QUIZ_PRACTICE_LENGTH,
  QUIZ_MAX_POINTS,
  QUIZ_LANES,
  QUIZ_SURPRISES,
  quizPublic,
  publicQuestion,
  startQuizAttempt,
  questionForAttempt,
  answerQuizAttempt,
  pickNextQuestion,
  quizTitle,
  quizRank,
  quizCopy,
  quizShareLine,
  quizResultForAttempt,
  diffOfTier,
  submitQuiz,
  applyLearnAward,
  learnAwardPoints,
  LEARN_CAP_28D,
  LEARN_CAP_LIFETIME,
} from './dasha-simp-score.mjs';

const now = Date.parse('2026-08-08T12:00:00Z');
const day = 86_400_000;

// --- evidence hosts ---
assert.equal(isValidEvidenceUrl('https://x.com/a/status/1'), true);
assert.equal(isValidEvidenceUrl('https://twitter.com/a/status/1'), true);
assert.equal(isValidEvidenceUrl('https://www.getdasha.com/studio'), true);
assert.equal(isValidEvidenceUrl('https://evil.com/x'), false);
assert.equal(isValidEvidenceUrl('http://x.com/a'), false);
assert.equal(isValidEvidenceUrl('https://user:pass@x.com/a'), false);
assert.equal(isValidOssEvidenceUrl('https://github.com/Uuriko/dasha-desk/pull/1'), true);
assert.equal(isValidOssEvidenceUrl('https://github.com/Uuriko/dasha-desk/pull/1/'), true);
assert.equal(isValidOssEvidenceUrl('https://github.com/Uuriko/dasha-desk/pull/1?diff=split'), false);
assert.equal(isValidOssEvidenceUrl('https://github.com/Uuriko/dasha-desk/issues/1'), false);
assert.equal(isValidOssEvidenceUrl('https://github.com/other/repo/pull/1'), false);
assert.equal(isValidOssEvidenceUrl('https://github.com/login/oauth/authorize'), false);
assert.equal(isValidOssEvidenceUrl('https://x.com/a/status/1'), false);
assert.equal(isValidOssEvidenceUrl('https://evil.com/pr/1'), false);

// --- linked_x once on enrollment ---
const bare = { handle: 'ava', enrolledAt: now, awards: [] };
const s0 = scoreProfile(bare, { now });
assert.equal(s0.components.linked_x, LINKED_X_POINTS);
assert.equal(s0.total, LINKED_X_POINTS);

// --- X-linked quiz enrolls, scores, allows scored retakes, never exposes answers ---
assert.equal(QUIZ_VERSION, 'dasha-simp-quiz/v10');
assert.equal(QUIZ_PATH_LENGTH, 22);
assert.equal(QUIZ_SCORED_LENGTH, 21);
assert.notEqual(QUIZ_PATH_LENGTH, 28);
assert.notEqual(QUIZ_SCORED_LENGTH, 10);
const pubMeta = quizPublic();
assert.equal(pubMeta.version, QUIZ_VERSION);
assert.equal(pubMeta.maxPoints, QUIZ_MAX_POINTS);
assert.equal('total' in pubMeta, false);
assert.equal('quickTotal' in pubMeta, false);
assert.equal('modes' in pubMeta, false);
assert.equal(JSON.stringify(pubMeta).includes('"answer"'), false);
assert.equal(QUIZ_QUESTIONS.filter(question => question.id === 'account').length, 0);
assert.ok(QUIZ_QUESTIONS.filter(question => question.answer != null).length >= 50, 'bank must have ≥50 scored items');
assert.equal(QUIZ_QUESTIONS.length, QUIZ_PRACTICE_LENGTH);
const quizSession = { xId: 'quiz-1', handle: 'quizsimp' };
assert.equal(submitQuiz({}, null, startQuizAttempt({ now }), { now }).status, 401);
assert.equal(submitQuiz({}, quizSession, startQuizAttempt({ now }), { now }).status, 400);
let attempt = startQuizAttempt({ now });
assert.equal(questionForAttempt(attempt).question.id, 'route');
assert.equal(questionForAttempt(attempt).progress.current, 1);
assert.equal(questionForAttempt(attempt).progress.total, QUIZ_PATH_LENGTH);
let step = answerQuizAttempt(attempt, 0, { now });
assert.ok(step.question.id);
assert.equal(QUIZ_QUESTIONS.find(question => question.id === step.question.id).tier, 1);
attempt = step.attempt;
while (!step.done) {
  const publicId = questionForAttempt(attempt).question.id;
  const privateQuestion = QUIZ_QUESTIONS.find(question => question.id === publicId);
  const exposed = publicQuestion(privateQuestion);
  assert.equal('answer' in exposed, false);
  assert.equal('next' in exposed, false);
  assert.equal('note' in exposed, false);
  assert.equal(exposed.media.kind, 'image');
  assert.match(exposed.media.src, /^\/simp\/photo\/[a-z0-9]+\.jpg$/);
  assert.equal(exposed.media.alt, 'Dasha');
  assert.doesNotMatch(JSON.stringify(exposed), /"answer"/);
  step = answerQuizAttempt(attempt, privateQuestion.answer, { now });
  attempt = step.attempt;
}
assert.equal(attempt.position, QUIZ_PATH_LENGTH);
assert.equal(attempt.scorable, QUIZ_SCORED_LENGTH);
// Deterministic vibe: rng always 0.5 → core noise 0 (see vibeDeltaForAttempt).
const flatRng = () => 0.5;
const quizDone = submitQuiz({}, quizSession, attempt, { now, rng: flatRng });
assert.equal(quizDone.ok, true);
assert.equal(quizDone.created, true);
assert.equal(quizDone.quiz.correct, QUIZ_PATH_LENGTH - 1);
assert.equal(typeof quizDone.quiz.vibe, 'number');
assert.ok(Math.abs(quizDone.quiz.vibe) <= 8, 'vibe must stay in ±8');
assert.equal(quizDone.quiz.points, quizDone.quiz.basePoints);
assert.equal(quizDone.quiz.lane, QUIZ_LANES[0]);
assert.equal(scoreProfile(quizDone.profile, { now }).components.quiz, quizDone.quiz.points);
// Same answers, different vibe → same rank points; vibe remains cosmetic.
const swingA = submitQuiz({}, { xId: 'v1', handle: 'va' }, attempt, { now: now + 10, rng: () => 0.01 });
const swingB = submitQuiz({}, { xId: 'v2', handle: 'vb' }, attempt, { now: now + 11, rng: () => 0.99 });
assert.equal(swingA.ok && swingB.ok, true);
assert.notEqual(swingA.quiz.vibe, swingB.quiz.vibe);
assert.equal(swingA.quiz.points, swingB.quiz.points);
assert.equal(scoreProfile(swingA.profile, { now: now + 11 }).components.quiz, scoreProfile(swingB.profile, { now: now + 11 }).components.quiz);
assert.equal(scoreProfile({ handle: 'legacy', quiz: { version: quizDone.quiz.version, points: 42 } }, { now }).components.quiz, 42, 'legacy quiz without basePoints must retain its stored score');
assert.equal(scoreProfile({ handle: 'migrated', quiz: { version: quizDone.quiz.version, points: 48, basePoints: 40 } }, { now }).components.quiz, 40, 'stored random vibe must not survive when accuracy is available');
assert.equal(meStatus(quizDone.store, quizSession).enrolled, true);
// Retake replaces score (no 409 one-shot lock).
const retake = submitQuiz(quizDone.store, quizSession, attempt, { now: now + 1, rng: flatRng });
assert.equal(retake.ok, true);
assert.equal(retake.retake, true);
assert.equal(retake.created, false);
// Perry-style session: retake + share payload must still work after prior score.
const perrySession = { xId: 'perry-x', handle: 'perryalpha' };
const perryFirst = submitQuiz({}, perrySession, attempt, { now: now + 2, rng: flatRng });
assert.equal(perryFirst.ok, true);
const perryAgain = submitQuiz(perryFirst.store, perrySession, attempt, { now: now + 3, rng: flatRng });
assert.equal(perryAgain.ok, true);
assert.equal(perryAgain.retake, true);
assert.equal(meStatus(perryAgain.store, perrySession).board.quiz.correct, attempt.correct);
const routeFirstQuestions = [];
for (let route = 0; route < QUIZ_LANES.length; route++) {
  let routed = answerQuizAttempt(startQuizAttempt({ now, practice: true }), route, { now });
  assert.equal(routed.attempt.lane, QUIZ_LANES[route]);
  routeFirstQuestions.push(routed.question.id);
  const seen = new Set(['route']);
  const answerPositions = [0, 0, 0, 0];
  while (!routed.done) {
    assert(!seen.has(routed.question.id), `route ${route} repeats ${routed.question.id}`);
    seen.add(routed.question.id);
    const privateQuestion = QUIZ_QUESTIONS.find(question => question.id === routed.question.id);
    answerPositions[privateQuestion.answer]++;
    routed = answerQuizAttempt(routed.attempt, privateQuestion.answer, { now });
  }
  assert.equal(routed.attempt.position, QUIZ_PRACTICE_LENGTH);
  assert.equal(seen.size, QUIZ_PRACTICE_LENGTH);
}
assert.equal(new Set(routeFirstQuestions).size, QUIZ_LANES.length, 'the opening answer must select distinct branches');
const sourcedIds = ['sailor-fuku', 'tatu-theme', 'comfry-job', 'klaasje-never', 'softness-poet', 'letterman', 'bad-behaviour', 'scary-cap', 'worms-brain', 'anna-cohost', 'freckle-pens', 'materialists-daisy', 'rachel-comey'];
for (const id of sourcedIds) assert(QUIZ_QUESTIONS.some(question => question.id === id), `missing sourced question ${id}`);
const publicQuizCopy = QUIZ_QUESTIONS.flatMap(question => [question.prompt, ...question.choices, question.note, question.source]).concat(
  Object.values(QUIZ_SURPRISES).flatMap(surprise => [surprise.title, surprise.body]),
).join(' ');
const askedCopy = QUIZ_QUESTIONS.flatMap(question => [question.prompt, ...question.choices]).join(' ');
assert.doesNotMatch(askedCopy, /\$dasha|\bmint\b|getdasha|faucet|\bBuy\b|\/studio|\/forum|\bchess\b|Jupiter/i);
assert.doesNotMatch(publicQuizCopy, /\$dasha|mint|Jupiter|getdasha|@getdasha|Simp Board|Perry|holder|\bcoin\b|(?:can|might|could|will) go to zero|go(?:es|ing)? to zero|not financial advice|\bNFA\b|price promise|high risk|rugcheck|lose (?:your )?money|lose it all|worthless/i);
assert.doesNotMatch(publicQuizCopy, /wikipedia/i);
const photoRoot = join(dirname(fileURLToPath(import.meta.url)), 'dasha-worker-assets/simp/photo');
for (const question of QUIZ_QUESTIONS) {
  assert.match(question.media.src, /^\/simp\/photo\/[a-z0-9]+\.jpg$/);
  const file = question.media.src.replace('/simp/photo/', '');
  assert.ok(existsSync(join(photoRoot, file)), `missing first-party still ${file}`);
  const exposed = publicQuestion(question);
  assert.equal(exposed.media.kind, 'image');
  assert.equal(exposed.media.alt, 'Dasha');
  assert.equal('answer' in exposed, false);
  assert.equal('image' in exposed, false);
}
for (let route = 0; route < QUIZ_LANES.length; route++) {
  const opened = questionForAttempt(startQuizAttempt({ now }));
  assert.match(opened.question.media.src, /^\/simp\/photo\/[a-z0-9]+\.jpg$/);
  let run = answerQuizAttempt(startQuizAttempt({ now }), route, { now }), prev = opened.question.media.src;
  while (!run.done) {
    assert.match(run.question.media.src, /^\/simp\/photo\/[a-z0-9]+\.jpg$/);
    assert.notEqual(run.question.media.src, prev, `consecutive questions must not reuse ${prev}`);
    prev = run.question.media.src;
    assert.equal(run.progress.total, QUIZ_PATH_LENGTH);
    assert.ok(run.progress.current >= 1 && run.progress.current <= QUIZ_PATH_LENGTH);
    const privateQuestion = QUIZ_QUESTIONS.find(question => question.id === run.question.id);
    run = answerQuizAttempt(run.attempt, privateQuestion.answer, { now });
  }
  assert.equal(run.attempt.position, QUIZ_PATH_LENGTH);
  assert.equal(run.attempt.scorable, QUIZ_SCORED_LENGTH);
}
assert.equal(answerQuizAttempt(startQuizAttempt({ now }), 99).status, 400);

{
  let walk = answerQuizAttempt(startQuizAttempt({ now }), 0, { now });
  const first = QUIZ_QUESTIONS.find(question => question.id === walk.question.id);
  assert.equal(diffOfTier(first.tier), 'easy');
  assert.equal(first.lane, 'cinema');
  walk = answerQuizAttempt(walk.attempt, first.answer, { now });
  const second = QUIZ_QUESTIONS.find(question => question.id === walk.question.id);
  assert.equal(diffOfTier(second.tier), 'easy', 'Q1–Q2 stay easy');
  walk = answerQuizAttempt(walk.attempt, second.answer, { now });
  const third = QUIZ_QUESTIONS.find(question => question.id === walk.question.id);
  assert.equal(diffOfTier(third.tier), 'mid', `after two easy, lane is mid, got ${third.id} tier ${third.tier}`);
  assert.notEqual(diffOfTier(third.tier), 'deep', 'never skip a lane');
  walk = answerQuizAttempt(walk.attempt, third.answer, { now });
  const fourth = QUIZ_QUESTIONS.find(question => question.id === walk.question.id);
  assert.equal(diffOfTier(fourth.tier), 'mid', 'one correct does not promote');
  walk = answerQuizAttempt(walk.attempt, fourth.answer, { now });
  const fifth = QUIZ_QUESTIONS.find(question => question.id === walk.question.id);
  assert.equal(diffOfTier(fifth.tier), 'deep', '2/2 correct streak promotes one lane');
  const seeded = pickNextQuestion(['route', first.id], 'mid', 'cinema');
  assert.ok(seeded && diffOfTier(seeded.tier) === 'mid');
  let drop = answerQuizAttempt(startQuizAttempt({ now }), 0, { now });
  for (let i = 0; i < 2; i++) {
    const item = QUIZ_QUESTIONS.find(question => question.id === drop.question.id);
    drop = answerQuizAttempt(drop.attempt, item.answer, { now });
  }
  assert.equal(diffOfTier(QUIZ_QUESTIONS.find(question => question.id === drop.question.id).tier), 'mid');
  const missA = QUIZ_QUESTIONS.find(question => question.id === drop.question.id);
  drop = answerQuizAttempt(drop.attempt, (missA.answer + 1) % missA.choices.length, { now });
  const missB = QUIZ_QUESTIONS.find(question => question.id === drop.question.id);
  assert.equal(diffOfTier(missB.tier), 'mid', 'one miss does not demote');
  drop = answerQuizAttempt(drop.attempt, (missB.answer + 1) % missB.choices.length, { now });
  const afterMisses = QUIZ_QUESTIONS.find(question => question.id === drop.question.id);
  assert.equal(diffOfTier(afterMisses.tier), 'easy', '2/2 misses demote one lane');
  let climb = answerQuizAttempt(startQuizAttempt({ now }), 0, { now });
  const climbDiffs = [];
  while (!climb.done) {
    const item = QUIZ_QUESTIONS.find(question => question.id === climb.question.id);
    climbDiffs.push(diffOfTier(item.tier));
    climb = answerQuizAttempt(climb.attempt, item.answer, { now });
  }
  assert.ok(climbDiffs.slice(0, 2).every(d => d === 'easy'), `first two must be easy, got ${climbDiffs.slice(0, 2)}`);
  assert.equal(climbDiffs[2], 'mid', 'third is mid, never a skip to deep');
  assert.ok(climbDiffs.some(d => d === 'deep'), `perfect 2/2 streak must reach deep, got ${climbDiffs.join(',')}`);
  assert.ok(climbDiffs.slice(-2).every(d => d === 'deep'), `last two on a deep streak are deep, got ${climbDiffs.slice(-2)}`);
}

function walkIds(route) {
  const ids = [];
  const texts = [];
  let step = answerQuizAttempt(startQuizAttempt({ now }), route, { now });
  while (!step.done) {
    ids.push(step.question.id);
    texts.push(step.question.prompt, ...step.question.choices);
    const privateQuestion = QUIZ_QUESTIONS.find(question => question.id === step.question.id);
    step = answerQuizAttempt(step.attempt, privateQuestion.answer, { now });
  }
  return { ids, text: texts.join(' '), attempt: step.attempt };
}

for (let route = 0; route < QUIZ_LANES.length; route++) {
  const path = walkIds(route);
  assert.equal(path.ids.includes('route'), false);
  assert.equal(path.ids.includes('account'), false);
  assert.equal(path.ids.length, QUIZ_SCORED_LENGTH);
}
const comfry = QUIZ_QUESTIONS.find(question => question.id === 'comfry-job');
assert.match([comfry.prompt, ...comfry.choices, comfry.note].join(' '), /Comfry/);
assert.doesNotMatch(QUIZ_QUESTIONS.flatMap(question => [question.prompt, ...question.choices, question.note]).join(' '), /\bComfrey\b/);
assert.equal(walkIds(0).ids[0], 'sailor-fuku');
assert.equal(walkIds(1).ids[0], 'tatu-theme');
assert.equal(walkIds(2).ids[0], 'minsk-vegas');
assert.ok(quizDone.quiz.copy.split(/[.!?]+\s/).filter(Boolean).length >= 2, 'result copy must be 2–3 sentences');
assert.equal(quizDone.quiz.share, `${quizDone.quiz.title} · ${quizDone.quiz.lane}`);
assert.doesNotMatch(quizDone.quiz.share, /\d+\/\d+/);
assert.equal('disclaimer' in quizDone.quiz, false);
assert.equal(meStatus(quizDone.store, quizSession).board.quiz.disclaimer, undefined);
assert.equal('mode' in quizDone.quiz, false);
assert.equal(meStatus(quizDone.store, quizSession).board.quiz.share, quizDone.quiz.share);

assert.ok(QUIZ_QUESTIONS.length >= 51, `v10 bank is route + ≥50 sourced items, got ${QUIZ_QUESTIONS.length}`);
assert.equal(new Set(QUIZ_QUESTIONS.map(question => question.prompt)).size, QUIZ_QUESTIONS.length, 'quiz prompts must be unique');
const scoredBank = QUIZ_QUESTIONS.filter(question => question.answer != null);
assert.ok(scoredBank.filter(question => question.pic).length >= Math.ceil(scoredBank.length / 3), '≥1/3 of the bank must be picture-ID');
for (const question of QUIZ_QUESTIONS) {
  const words = question.prompt.trim().split(/\s+/).length;
  assert.ok(words <= 25, `${question.id}: stem is ${words} words`);
  assert(question.prompt.length >= 12 && question.prompt.length <= 110, `${question.id}: awkward prompt length ${question.prompt.length}`);
  assert.equal(question.choices.length, question.answer == null ? 3 : 4, `${question.id}: choice count`);
  assert.equal(new Set(question.choices.map(choice => choice.toLowerCase())).size, question.choices.length, `${question.id}: duplicate choice`);
  assert(question.answer == null || (Number.isInteger(question.answer) && question.answer < question.choices.length), `${question.id}: invalid answer`);
  assert.match(question.source, /^https:\/\//, `${question.id}: source required`);
  assert.doesNotMatch(question.prompt, /\bNOT\b|all of the above|none of the above/i, `${question.id}: no trick stems`);
  if (question.answer != null) {
    assert.ok(question.tier >= 1 && question.tier <= 5, `${question.id}: tier`);
    assert.ok(['easy', 'mid', 'deep'].includes(diffOfTier(question.tier)), `${question.id}: diff`);
  }
}
for (const id of ['scary-year', 'infowars-year', 'scary-street', 'comfry-show', 'succession-s3', 'wobble-year', 'red-scare-year', 'epstein-townhouse', 'encounters-sec', 'berry-boss']) {
  const item = QUIZ_QUESTIONS.find(question => question.id === id);
  assert.ok(item, `missing 2-sourced item ${id}`);
  assert.ok(Array.isArray(item.sources) && item.sources.length >= 2, `${id} needs two sources`);
}
assert.equal(quizTitle(74), 'Dasha scholar');
assert.equal(quizTitle(66), 'Dasha scholar');
assert.equal(quizTitle(45), 'Confirmed simp');
assert.equal(quizTitle(28), 'Deep in the lore');
assert.equal(quizTitle(14), 'Watching respectfully');
assert.equal(quizTitle(0), 'Dasha curious');
assert.doesNotMatch(['Dasha scholar', 'Confirmed simp', 'Deep in the lore', 'Watching respectfully', 'Dasha curious'].join(' '), /Lurker|Unwell/);
{
  const done = (weighted, deepCorrect) => ({
    version: QUIZ_VERSION,
    current: null,
    position: QUIZ_PATH_LENGTH,
    scorable: QUIZ_SCORED_LENGTH,
    correct: 10,
    total: QUIZ_PATH_LENGTH,
    lane: QUIZ_LANES[0],
    weighted,
    deepCorrect,
    startedAt: now,
    updatedAt: now,
  });
  const deepish = quizResultForAttempt(done(28, 8), { now, rng: () => 0.5 });
  const easyish = quizResultForAttempt(done(10, 0), { now, rng: () => 0.5 });
  assert.equal(deepish.correct, easyish.correct);
  assert.ok(deepish.points > easyish.points, 'rank uses weighted + deep-correct, not raw %');
  assert.notEqual(deepish.title, easyish.title);
  assert.equal(quizRank(done(28, 8)), 36);
}
assert.match(quizCopy('Confirmed simp', 'Cinema obsessive'), /Cinema obsessive/);
assert.equal(quizShareLine('Confirmed simp', 'Cinema obsessive'), 'Confirmed simp · Cinema obsessive');
assert.doesNotMatch(quizShareLine('Confirmed simp', 'Cinema obsessive'), /\d+\/\d+/);

// --- creative cap 100 / 28d ---
const creativeAwards = [];
for (let i = 0; i < 6; i++) {
  creativeAwards.push({
    kind: 'creative',
    points: CREATIVE_POINTS,
    evidenceUrl: `https://x.com/ava/status/${i + 1}`,
    at: now - i * day,
  });
}
const sCreative = scoreProfile({ handle: 'ava', enrolledAt: now, awards: creativeAwards }, { now });
assert.equal(sCreative.components.creative, CREATIVE_CAP_28D);
assert.ok(sCreative.total <= LINKED_X_POINTS + CREATIVE_CAP_28D);
assert.equal(
  scoreProfile({ handle: 'ava', enrolledAt: now, awards: [{ kind: 'creative', points: 1, evidenceUrl: 'https://x.com/ava/status/fixed', at: now }] }, { now }).components.creative,
  CREATIVE_POINTS,
  'creative awards are fixed-value, not caller-selected',
);

// old creative outside window scores 0
const oldOnly = scoreProfile(
  {
    handle: 'ava',
    enrolledAt: now - 60 * day,
    awards: [
      {
        kind: 'creative',
        points: CREATIVE_POINTS,
        evidenceUrl: 'https://x.com/ava/status/9',
        at: now - ROLLING_MS - day,
      },
    ],
  },
  { now },
);
assert.equal(oldOnly.components.creative, 0);

// --- community cap 40 / 28d ---
const communityAwards = Array.from({ length: 6 }, (_, i) => ({
  kind: 'community',
  points: COMMUNITY_POINTS,
  evidenceUrl: `https://x.com/ava/status/c${i}`,
  at: now - i * day,
}));
const sComm = scoreProfile({ handle: 'ava', enrolledAt: now, awards: communityAwards }, { now });
assert.equal(sComm.components.community, COMMUNITY_CAP_28D);

// --- invalid evidence host awards zero ---
const badEv = scoreProfile(
  {
    handle: 'ava',
    enrolledAt: now,
    awards: [{ kind: 'creative', points: 25, evidenceUrl: 'https://not-allowed.example/1', at: now }],
  },
  { now },
);
assert.equal(badEv.components.creative, 0);

// --- oss season cap 300 ---
const ossAwards = [
  { kind: 'oss', schema: 'dasha-simp-oss/v0', points: 200, evidenceUrl: 'https://github.com/Uuriko/dasha-desk/pull/1', at: now },
  { kind: 'oss', schema: 'dasha-simp-oss/v0', points: 200, evidenceUrl: 'https://github.com/Uuriko/dasha-desk/pull/2', at: now },
];
const sOss = scoreProfile({ handle: 'dev', enrolledAt: now, awards: ossAwards }, { now });
assert.equal(sOss.components.oss, OSS_CAP_SEASON);
assert.equal(
  scoreProfile({ handle: 'dev', enrolledAt: now, awards: [{ kind: 'oss', points: 300, evidenceUrl: 'https://github.com/Uuriko/dasha-desk/pull/3', at: now }] }, { now }).components.oss,
  0,
  'OSS points require the existing scorer schema',
);

// --- holder is badge only ---
const sHolder = scoreProfile({ handle: 'ava', enrolledAt: now, awards: [], holder: true }, { now });
assert.equal(sHolder.components.holder, 0);
assert.equal(sHolder.total, LINKED_X_POINTS);

// --- ranking order ---
const ranked = rankProfiles(
  [
    { handle: 'low', enrolledAt: now - 1000, awards: [] },
    {
      handle: 'high',
      enrolledAt: now - 500,
      awards: [{ kind: 'creative', points: 25, evidenceUrl: 'https://x.com/high/status/1', at: now }],
    },
    {
      handle: 'mid',
      enrolledAt: now - 2000,
      awards: [{ kind: 'community', points: 10, evidenceUrl: 'https://x.com/mid/status/1', at: now - 100 }],
    },
  ],
  { now },
);
assert.equal(ranked[0].handle, 'high');
assert.ok(ranked[0].total > ranked[1].total);

// tie-break: same total → most recent evidence
const tie = rankProfiles(
  [
    {
      handle: 'aaa',
      enrolledAt: now - 10,
      awards: [{ kind: 'community', points: 10, evidenceUrl: 'https://x.com/aaa/status/1', at: now - 50 }],
    },
    {
      handle: 'bbb',
      enrolledAt: now - 20,
      awards: [{ kind: 'community', points: 10, evidenceUrl: 'https://x.com/bbb/status/1', at: now - 10 }],
    },
  ],
  { now },
);
assert.equal(tie[0].handle, 'bbb');

// --- zero-point sources listed ---
const publicRules = rulesPublic();
assert.match(publicRules.identity, /control of one X account, not one unique human/i);
assert.match(publicRules.identity, /no prize, payment, governance, allocation, or airdrop entitlement/i);
for (const z of [
  'follower count',
  'verification tier',
  'likes',
  'chat messages',
  'referrals',
  'purchases',
  'token balances',
  'bag size',
]) {
  assert.ok(ZERO_POINT_SOURCES.includes(z), `missing zero rule: ${z}`);
}

// proposeAward rejects forbidden signals and bad hosts
const enrolled = { handle: 'ava', xId: '9', enrolledAt: now, awards: [] };
assert.equal(proposeAward(enrolled, { kind: 'creative', evidenceUrl: 'https://spam.com/1' }, { now }).ok, false);
assert.equal(
  proposeAward(enrolled, { kind: 'creative', evidenceUrl: 'https://x.com/a/1', followers: 9999 }, { now }).ok,
  false,
);
assert.equal(
  proposeAward(enrolled, { kind: 'creative', evidenceUrl: 'https://x.com/a/1', balance: 1e6 }, { now }).ok,
  false,
);
const okAward = proposeAward(
  enrolled,
  { kind: 'creative', evidenceUrl: 'https://x.com/ava/status/1', points: 25 },
  { now },
);
assert.equal(okAward.ok, true);
assert.equal(okAward.after.components.creative, CREATIVE_POINTS);
assert.deepEqual(badgesForProfile(okAward.profile, { now }), ['linked']);
const badgedAward = proposeAward(enrolled, { kind: 'creative', evidenceUrl: 'https://x.com/a/2', badge: 'maker' }, { now });
assert.deepEqual(badgesForProfile(badgedAward.profile, { now }), ['linked', 'maker']);
assert.equal(
  proposeAward(enrolled, { kind: 'oss', evidenceUrl: 'https://github.com/Uuriko/dasha-desk/pull/1', points: 40 }, { now }).ok,
  false,
  'OSS proposal without scorer schema must fail',
);

// --- join is opt-in + idempotent ---
const session = { xId: '111', handle: 'ava', avatar: 'https://pbs.twimg.com/a.jpg' };
const j1 = joinBoard({}, session, { now });
assert.equal(j1.ok, true);
assert.equal(j1.created, true);
const j2 = joinBoard(j1.store, session, { now: now + 1000 });
assert.equal(j2.ok, true);
assert.equal(j2.created, false);
assert.equal(j2.profile.enrolledAt, now); // preserved
assert.equal(Object.keys(j2.store).length, 1);

// OAuth session alone does not imply enrollment without join
const meUnenrolled = meStatus({}, session);
assert.equal(meUnenrolled.linked, true);
assert.equal(meUnenrolled.enrolled, false);

// --- leave requires session; unauthorized fails ---
const leftNo = leaveBoard(j2.store, null);
assert.equal(leftNo.ok, false);
assert.equal(leftNo.status, 401);
const leftWrong = leaveBoard(j2.store, { xId: 'other', handle: 'x' });
assert.equal(leftWrong.ok, true);
assert.equal(leftWrong.removed, false);
assert.ok(leftWrong.store['111']);
const leftOk = leaveBoard(j2.store, session);
assert.equal(leftOk.removed, true);
assert.equal(leftOk.store['111'], undefined);

// --- public board sanitization + Perry editorial ---
const store = joinBoard({}, session, { now }).store;
const board = buildPublicBoard(Object.values(store), { now });
assert.equal(board.schema, SCHEMA);
assert.equal(board.editorial[0].handle, 'perryalpha');
assert.equal(board.editorial[0].measured, false);
assert.equal(board.editorial[0].linked, false);
assert.equal(board.editorial[0].total, null);
assert.equal(board.measured[0].handle, 'ava');
assert.equal(board.measured[0].linked, true);
assert.equal(board.measured[0].components.linked_x, LINKED_X_POINTS);
assert.equal('enrolledAt' in board.measured[0], false, 'public Board must not expose enrollment time');
assert.equal('lastEvidenceAt' in board.measured[0], false, 'public Board must not expose evidence timing used only for ranking');
const boardWithPerry = buildPublicBoard([...Object.values(store), { handle: 'PerryAlpha', enrolledAt: now, awards: [] }], { now });
assert.equal(boardWithPerry.measured.some(row => row.handle.toLowerCase() === 'perryalpha'), false, 'editorial handle duplicated into measured ranks');
assert.equal(boardWithPerry.measured[0].rank, 2, 'measured ranks must still begin after editorial #1');
const safe = assertPublicSafe(board);
assert.equal(safe.ok, true, safe.reason);
const meSafe = assertPublicSafe(meStatus(store, session));
assert.equal(meSafe.ok, true, meSafe.reason);
assert.equal(meStatus(store, session).board.total, LINKED_X_POINTS);
assert.equal('enrolledAt' in meStatus(store, session).board, false);
assert.equal('lastEvidenceAt' in meStatus(store, session).board, false);
// no xId on public me
assert.equal(meStatus(store, session).x.handle, 'ava');
assert.equal(JSON.stringify(meStatus(store, session)).includes('111'), false);

// Perry must not be marked measured/linked/oauth
const perry = publicPerryRow();
assert.equal(perry.measured, false);
assert.equal(perry.linked, false);
assert.equal(perry.kind, 'editorial');

// enrollmentFromSession does not auto-run from OAuth helpers
assert.ok(enrollmentFromSession(session));
assert.equal(enrollmentFromSession(null), null);
assert.equal(enrollmentFromSession({ handle: 'x' }), null);

// followers / verification never appear as scoring inputs — score ignores them on profile
const fancy = scoreProfile(
  {
    handle: 'rich',
    enrolledAt: now,
    awards: [],
    followers: 1_000_000,
    verifiedType: 'blue',
    chatVolume: 999,
    referrals: 50,
    purchases: 3,
    balance: 99999,
  },
  { now },
);
assert.equal(fancy.total, LINKED_X_POINTS);

// --- learn component: first-pass only, caps, holder 0, forbidden signals ---
assert.equal(learnAwardPoints({}), 4);
assert.equal(learnAwardPoints({ difficulty: 2 }), 6);
assert.equal(learnAwardPoints({ tool: 'siws' }), 6);
assert.equal(learnAwardPoints({ difficulty: 2, tool: 'live-buy' }), 8);
assert.equal(s0.components.learn, 0);
assert.equal(publicRules.learn.cap_rolling_28d, LEARN_CAP_28D);
assert.equal(publicRules.learn.cap_lifetime, LEARN_CAP_LIFETIME);
assert.equal(applyLearnAward({}, null, { moduleId: 'C01' }, { now }).status, 401);
assert.equal(
  applyLearnAward({}, session, { moduleId: 'C01', purchases: 1 }, { now }).ok,
  false,
);
assert.equal(
  applyLearnAward({}, session, { moduleId: 'C01', balance: 9 }, { now }).error,
  'forbidden signal',
);
assert.equal(
  applyLearnAward({}, session, { moduleId: 'C01', bagSize: 2 }, { now }).ok,
  false,
);
assert.equal(
  applyLearnAward({}, session, { moduleId: 'C01', referrals: 1 }, { now }).ok,
  false,
);
const learnSession = { xId: 'learn-1', handle: 'pupil' };
const learnFirst = applyLearnAward({}, learnSession, { moduleId: 'C01', difficulty: 0 }, { now });
assert.equal(learnFirst.ok, true);
assert.equal(learnFirst.created, true);
assert.equal(learnFirst.awarded, true);
assert.equal(learnFirst.points, 4);
assert.equal(scoreProfile(learnFirst.profile, { now }).components.learn, 4);
assert.equal(scoreProfile(learnFirst.profile, { now }).components.holder, 0);
assert.equal(meStatus(learnFirst.store, learnSession).enrolled, true);
assert.equal(meStatus(learnFirst.store, learnSession).board.components.learn, 4);
const learnRetake = applyLearnAward(learnFirst.store, learnSession, { moduleId: 'C01', difficulty: 2, tool: 'siws' }, { now: now + 1 });
assert.equal(learnRetake.awarded, false);
assert.equal(learnRetake.retake, true);
assert.equal(scoreProfile(learnRetake.profile, { now: now + 1 }).components.learn, 4);
const learnHard = applyLearnAward(learnFirst.store, learnSession, { moduleId: 'C12', difficulty: 2, tool: 'live-buy' }, { now: now + 2 });
assert.equal(learnHard.points, 8);
assert.equal(scoreProfile(learnHard.profile, { now: now + 2 }).components.learn, 12);
const flood = [];
let floodStore = {};
for (let i = 0; i < 20; i++) {
  const id = `C${String((i % 12) + 1).padStart(2, '0')}`;
  const unique = i < 12 ? id : `A${String((i % 10) + 1).padStart(2, '0')}`;
  const row = applyLearnAward(floodStore, { xId: 'cap', handle: 'cap' }, { moduleId: unique, difficulty: 2, tool: 'siws' }, { now: now + i });
  floodStore = row.store;
  flood.push(row);
}
assert.equal(scoreProfile(floodStore.cap, { now: now + 20 }).components.learn <= LEARN_CAP_28D, true);
assert.equal(scoreProfile(floodStore.cap, { now: now + 20 }).components.holder, 0);
const lifeAwards = Array.from({ length: 20 }, (_, i) => ({
  kind: 'learn',
  moduleId: `I${String((i % 10) + 1).padStart(2, '0')}`,
  points: 8,
  at: now - (i < 10 ? 40 * day : i * day),
}));
assert.equal(scoreProfile({ handle: 'life', enrolledAt: now, awards: lifeAwards }, { now }).components.learn, LEARN_CAP_LIFETIME);
const learnBoard = buildPublicBoard(Object.values(learnHard.store), { now: now + 2 });
assert.equal(learnBoard.measured[0].components.learn, 12);
assert.equal(assertPublicSafe(learnBoard).ok, true);
assert.equal(assertPublicSafe(meStatus(learnHard.store, learnSession)).ok, true);
assert.equal(JSON.stringify(meStatus(learnHard.store, learnSession)).includes('learn-1'), false);

console.log('dasha-simp-score: PASS');
