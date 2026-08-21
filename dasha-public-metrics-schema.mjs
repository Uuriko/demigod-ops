/**
 * Shared public funnel allowlist — worker emits these keys; audit rejects anything else.
 * Keep identity-free: no nicks, wallets, captions, source slices, or tiny-cohort cells.
 */
export const PUBLIC_METRICS_THRESHOLD_MIN = 5;

export const PUBLIC_METRICS_KEYS = {
  root: Object.freeze([
    'ok',
    'since',
    'completionSince',
    'threshold',
    'studio',
    'quiz',
    'chess',
    'limits',
  ]),
  studio: Object.freeze([
    'opens',
    'firstEdits',
    'openToEdit',
    'completions',
    'editToCompletion',
    'exports',
    'editToExport',
    'shareIntents',
    'shareApiResolutions',
    'editToShareIntent',
    'intentToShareSuccess',
    'copyEditableLinks',
    'handoffMints',
    'handoffOpens',
    'mintToOpen',
  ]),
  quiz: Object.freeze([
    'starts',
    'completions',
    'startToComplete',
    'replays',
    'shareIntents',
    'completeToShareIntent',
  ]),
  chess: Object.freeze([
    'pageOpens',
    'localPlayIntents',
    'localCompletions',
    'localRematchIntents',
    'localShareIntents',
    'pageOpenToLocalPlayIntent',
    'localPlayToCompletion',
    'localCompletionToRematchIntent',
    'localCompletionToShareIntent',
    'linkIntents',
    'enrollmentIntents',
    'holderProofIntents',
    'queueIntents',
    'pageOpenToLinkIntent',
    'linkToEnrollmentIntent',
    'enrollmentToHolderProofIntent',
    'holderProofToQueueIntent',
    'buyIntents',
    'pageOpenToBuyIntent',
    'gamesStarted',
    'gamesCompleted',
    'gameStartToComplete',
    'rematchesOffered',
    'rematchesAccepted',
    'rematchOfferToAccept',
    'replayOpens',
    'replayPlayIntents',
    'replayOpenToPlay',
    'replayShareIntents',
    'replayShareHandoffs',
    'replayShareIntentToHandoff',
    'completionToReplayShare',
    'challengesCreated',
    'challengesAccepted',
    'challengeCreateToAccept',
    'challengeShareIntents',
    'tournamentsCreated',
    'tournamentJoins',
    'tournamentsStarted',
    'tournamentsCompleted',
    'tournamentShareIntents',
  ]),
};

const allowed = {
  root: new Set(PUBLIC_METRICS_KEYS.root),
  studio: new Set(PUBLIC_METRICS_KEYS.studio),
  quiz: new Set(PUBLIC_METRICS_KEYS.quiz),
  chess: new Set(PUBLIC_METRICS_KEYS.chess),
};

/** Public funnel is aggregate, thresholded, and deliberately identity-free. */
export function publicMetricsViolations(value) {
  if (!value || typeof value !== 'object') return ['not-object'];
  const violations = [];
  for (const key of Object.keys(value)) if (!allowed.root.has(key)) violations.push(`root:${key}`);
  for (const group of ['studio', 'quiz', 'chess']) {
    if (!value[group] || typeof value[group] !== 'object' || Array.isArray(value[group])) {
      violations.push(`${group}:missing`);
      continue;
    }
    for (const key of Object.keys(value[group])) {
      if (!allowed[group].has(key)) violations.push(`${group}:${key}`);
    }
    for (const [key, cell] of Object.entries(value[group])) {
      if (cell === null) continue;
      if (!Number.isFinite(cell) || cell < 0) violations.push(`${group}:${key}:value`);
      else if (/To/.test(key) && cell > 1) violations.push(`${group}:${key}:ratio`);
      else if (!/To/.test(key) && cell < value.threshold) violations.push(`${group}:${key}:unsuppressed`);
    }
  }
  if (value.ok !== true) violations.push('ok');
  if (!Number.isInteger(value.threshold) || value.threshold < PUBLIC_METRICS_THRESHOLD_MIN) {
    violations.push('threshold');
  }
  if (!Number.isFinite(Date.parse(value.since))) violations.push('since');
  if ('completions' in (value.studio || {}) && !Number.isFinite(Date.parse(value.completionSince))) {
    violations.push('completionSince');
  }
  if (!/aggregate/i.test(value.limits || '') || !/not unique-user/i.test(value.limits || '')) {
    violations.push('limits');
  }
  return violations;
}

/** Keys the worker publicFunnelSummary must emit (for source self-check). */
export function publicFunnelKeyChecklist(summarySource) {
  const missing = [];
  for (const key of PUBLIC_METRICS_KEYS.studio) {
    if (!summarySource.includes(`${key}:`)) missing.push(`studio:${key}`);
  }
  return missing;
}
