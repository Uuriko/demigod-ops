import assert from 'node:assert/strict';
import {
  createState,
  collectSignals,
  struggleCount,
  nextDifficulty,
  updateMastery,
  updateElo,
  applyStudyControl,
  skipOnChain,
  mergeProgress,
  pickNext,
  applyModule,
  ELO_K,
  ELO_D,
} from './dasha-learn-adapt.mjs';
import { MODULES, modulesForTrack } from './dasha-learn-bank.mjs';

const crypto = modulesForTrack('crypto');
assert.equal(crypto[0].id, 'C01');
assert.equal(MODULES.filter((row) => row.track === 'crypto').length, 12);
assert.equal(MODULES.filter((row) => row.track === 'crypto-ai').length, 10);
assert.equal(MODULES.filter((row) => row.track === 'ai').length, 10);

const cold = createState('crypto');
assert.equal(cold.difficulty, 1);
assert.equal(pickNext(cold, MODULES).id, 'C01');
assert.equal(pickNext(createState('crypto-ai'), MODULES).id, 'A01');
assert.equal(pickNext(createState('ai'), MODULES).id, 'I01');

assert.equal(applyStudyControl(cold, 'chill').difficulty, 0);
assert.equal(applyStudyControl(cold, 'mean').difficulty, 2);
assert.equal(applyStudyControl(cold, 'normal').difficulty, 1);

const skipped = skipOnChain(cold);
assert.equal(skipped.queue[0], 'C04');
assert.equal(skipped.skills.wallet.m, 1);
assert.equal(skipped.skills.sol.m, 1);
assert.equal(pickNext(skipped, MODULES).id, 'C04');

const easy = collectSignals({ passed: true, felt: 'easy', wrongs: 0, explainAgain: 0, dwellMs: 1000 });
assert.equal(easy.struggle, 0);
assert.equal(nextDifficulty(1, easy), 2);
const fail = collectSignals({ passed: false, felt: 'ok', wrongs: 1 });
assert.equal(nextDifficulty(1, fail), 0);
const door = collectSignals({ passed: true, felt: 'ok', easyDoor: true });
assert.equal(nextDifficulty(2, door), 1);
assert.equal(struggleCount({ wrongs: 1, explainAgain: 1, felt: 'ok' }), 2);
const hard = collectSignals({ passed: true, felt: 'hard', wrongs: 0, explainAgain: 1 });
assert.ok(hard.struggle >= 2);
assert.equal(nextDifficulty(2, hard), 1);
const dwell = collectSignals({ passed: true, felt: 'ok', dwellMs: 41_000 });
assert.equal(dwell.dwell, true);

let m = { m: 0, elo: 1000 };
m = updateMastery(m, true);
assert.equal(m.m, 1);
m = updateMastery(m, true);
m = updateMastery(m, true);
assert.equal(m.m, 3);
m = updateMastery(m, false);
assert.equal(m.m, 3, 'mastery locks at 3');
const down = updateMastery({ m: 2, elo: 1000 }, false);
assert.equal(down.m, 1);

const eloWin = updateElo({ m: 0, elo: 1000 }, true, 1);
assert.ok(eloWin.elo > 1000);
const eloLose = updateElo({ m: 0, elo: 1000 }, false, 1);
assert.ok(eloLose.elo < 1000);
assert.equal(ELO_K, 40);
assert.deepEqual(ELO_D, [800, 1000, 1200]);

let state = createState('crypto');
const first = pickNext(state, MODULES);
assert.equal(first.id, 'C01');
state = applyModule(state, first, { passed: true, felt: 'ok' });
assert.ok(state.done.includes('C01'));
const second = pickNext(state, MODULES);
assert.ok(second && second.id !== 'C01');
state = applyModule(state, second, { passed: true, felt: 'easy' });
const third = pickNext(state, MODULES);
assert.ok(state.done.includes(third.id) || third.id, 'after two new, picker may retrieve');
// Force the interleave: two fresh modules → retrieval from done
assert.equal(state.fresh, 2);
const retrieval = pickNext(state, MODULES);
assert.ok(state.done.includes(retrieval.id), 'interleave a retrieval after every 2 new');

const merged = mergeProgress(
  { ...createState('crypto'), skills: { wallet: { m: 1, elo: 900 } }, done: ['C01'] },
  { skills: { wallet: { m: 2, elo: 800 }, sol: { m: 1, elo: 1000 } }, done: ['C04'] },
);
assert.equal(merged.skills.wallet.m, 2);
assert.equal(merged.skills.wallet.elo, 900);
assert.ok(merged.done.includes('C01') && merged.done.includes('C04'));

// Unseen prefers {diff, diff-1}
const mean = { ...createState('crypto', { study: 'mean' }), done: ['C01'] };
const picked = pickNext(mean, MODULES);
assert.ok(picked.difficulty === 2 || picked.difficulty === 1);

console.log('dasha-learn-adapt: PASS');
