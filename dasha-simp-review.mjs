#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

const base = (process.env.DASHA_LOBBY_URL || 'https://lobby.getdasha.com').replace(/\/$/, '');

const ratio = (part, whole) => whole ? Number((part / whole).toFixed(3)) : null;

export function summarizeMetrics(data) {
  const studio = data?.metrics || {};
  const quiz = data?.quizMetrics || {};
  return {
    ok: data?.ok === true,
    since: Number.isFinite(studio.since) ? new Date(studio.since).toISOString() : null,
    completionSince: Number.isFinite(studio.completionSince) ? new Date(studio.completionSince).toISOString() : null,
    studio: {
      opens: studio.opens || 0,
      firstEdits: studio.firstEdits || 0,
      openToEdit: ratio(studio.firstEdits || 0, studio.opens || 0),
      completions: studio.completions || 0,
      editToCompletion: ratio(studio.completions || 0, studio.firstEdits || 0),
      exports: studio.exports || 0,
      editToExport: ratio(studio.exports || 0, studio.firstEdits || 0),
      shareIntents: studio.shareIntents || 0,
      confirmedShares: studio.shareSuccesses || 0,
      sources: studio.sources || {},
    },
    quiz: {
      starts: quiz.starts || 0,
      completions: quiz.completions || 0,
      startToComplete: ratio(quiz.completions || 0, quiz.starts || 0),
      replays: quiz.replays || 0,
      shareIntents: quiz.shares || 0,
      completeToShareIntent: ratio(quiz.shares || 0, quiz.completions || 0),
    },
    handoff: {
      quizCompletions: quiz.completions || 0,
      quizSourceStudioOpens: studio.sources?.quiz || 0,
      completionToStudioOpen: ratio(studio.sources?.quiz || 0, quiz.completions || 0),
    },
    limits: 'Aggregate page-load progression only; ratios are not unique-user conversion or retention.',
  };
}

export function summarizePublicMetrics(funnel, board = {}) {
  const profiles = Array.isArray(board.measured) ? board.measured : [];
  const components = ['quiz', 'creative', 'community', 'oss', 'holder'];
  const studio = funnel?.studio ? { ...funnel.studio } : funnel?.studio;
  if (studio && 'confirmedShares' in studio) {
    studio.shareApiResolutions = studio.confirmedShares;
    delete studio.confirmedShares;
  }
  return {
    ...funnel,
    ...(studio ? { studio } : {}),
    board: {
      measuredProfiles: profiles.length,
      activeProfiles: Object.fromEntries(components.map(key => [key, profiles.filter(profile => Number(profile.components?.[key]) > 0).length])),
      points: Object.fromEntries(components.map(key => [key, profiles.reduce((sum, profile) => sum + (Number(profile.components?.[key]) || 0), 0)])),
    },
  };
}

async function main() {
const [command, id, value] = process.argv.slice(2);
const secret = process.env.LOBBY_MOD_SECRET;
const publicCommand = command === 'metrics-public';

if (!['list', 'metrics', 'metrics-summary', 'metrics-public', 'metrics-reset', 'accept', 'decline', 'snapshot'].includes(command) || (!publicCommand && !secret)) {
  console.error('Usage: node dasha-simp-review.mjs metrics-public | LOBBY_MOD_SECRET=… node dasha-simp-review.mjs list|metrics|metrics-summary|metrics-reset|accept ID [OSS_POINTS]|decline ID [REASON]|snapshot ID TITLE');
  process.exit(2);
}

let path = '/simp/review';
let method = 'GET';
let body;
if (publicCommand) {
  path = '/studio/metrics/public';
} else if (command === 'metrics' || command === 'metrics-summary') {
  path = '/studio/metrics';
} else if (command === 'metrics-reset') {
  path = '/studio/metrics';
  method = 'POST';
  body = { action: 'reset' };
} else if (command !== 'list') {
  method = 'POST';
  if (command === 'snapshot') {
    path = '/simp/seasons/snapshot';
    body = { id, title: value };
  } else {
    body = { id, decision: command };
    if (command === 'accept' && value) body.ossPoints = Number(value);
    if (command === 'decline' && value) body.reason = value;
  }
}

const response = await fetch(base + path, {
  method,
  headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
let output = command === 'metrics-summary' && response.ok ? summarizeMetrics(data) : data;
if (publicCommand && response.ok) {
  const boardResponse = await fetch(base + '/simp/board');
  if (boardResponse.ok) output = summarizePublicMetrics(data, await boardResponse.json());
}
console.log(JSON.stringify(output, null, 2));
if (!response.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
