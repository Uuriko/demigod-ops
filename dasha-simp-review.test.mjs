import assert from 'node:assert/strict';
import { summarizeMetrics, summarizePublicMetrics } from './dasha-simp-review.mjs';

const summary = summarizeMetrics({
  ok: true,
  metrics: {
    since: 1_786_249_640_884,
    opens: 10,
    firstEdits: 4,
    completions: 2,
    exports: 2,
    shareIntents: 1,
    shareSuccesses: 1,
    sources: { home: 6, quiz: 2, direct: 2, other: 0 },
  },
  quizMetrics: { starts: 8, completions: 4, replays: 1, shares: 2 },
});

assert.equal(summary.studio.openToEdit, 0.4);
assert.equal(summary.studio.editToExport, 0.5);
assert.equal(summary.studio.editToCompletion, 0.5);
assert.equal(summary.quiz.startToComplete, 0.5);
assert.equal(summary.quiz.completeToShareIntent, 0.5);
assert.equal(summary.handoff.completionToStudioOpen, 0.5);
assert.match(summary.limits, /not unique-user conversion or retention/);
assert.equal(summarizeMetrics({ ok: true }).studio.openToEdit, null);

const publicSummary = summarizePublicMetrics({ ok: true }, { measured: [
  { components: { quiz: 40, creative: 25, community: 0, oss: 0, holder: 0 } },
  { components: { quiz: 20, creative: 0, community: 10, oss: 15, holder: 0 } },
] });
assert.deepEqual(publicSummary.board, {
  measuredProfiles: 2,
  activeProfiles: { quiz: 2, creative: 1, community: 1, oss: 1, holder: 0 },
  points: { quiz: 60, creative: 25, community: 10, oss: 15, holder: 0 },
});
assert.deepEqual(summarizePublicMetrics({ studio: { confirmedShares: 7 } }).studio, { shareApiResolutions: 7 });

console.log('dasha-simp-review: PASS');
