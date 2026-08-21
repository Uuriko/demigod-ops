#!/usr/bin/env node
/**
 * Compare live public Studio funnel to a saved baseline.
 *
 *   node dasha-funnel-delta.mjs              # vs /tmp/dasha-funnel/baseline-latest.json
 *   node dasha-funnel-delta.mjs --save        # also write a new snapshot
 *   BASELINE=/path/to.json node dasha-funnel-delta.mjs
 *
 * Exit 0 always (observation tool). Prints JSON + short human summary.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dir = process.env.DASHA_FUNNEL_DIR || '/tmp/dasha-funnel';
const baselinePath = process.env.BASELINE || join(dir, 'baseline-latest.json');
const save = process.argv.includes('--save');
const LOBBY = process.env.LOBBY_URL || 'https://lobby.getdasha.com';

const KEYS = [
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
];
const QUIZ_KEYS = ['starts', 'completions', 'startToComplete', 'replays', 'shareIntents', 'completeToShareIntent'];

function studio(j) {
  return j?.studio && typeof j.studio === 'object' ? j.studio : {};
}

function quiz(j) {
  return j?.quiz && typeof j.quiz === 'object' ? j.quiz : {};
}

function num(v) {
  return Number.isFinite(v) ? v : null;
}

async function main() {
  mkdirSync(dir, { recursive: true });
  const res = await fetch(`${LOBBY}/studio/metrics/public`, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(15_000),
  });
  const live = await res.json();
  if (!res.ok || live?.ok !== true) {
    console.error(JSON.stringify({ ok: false, error: 'live metrics fetch failed', status: res.status }));
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (save) {
    const path = join(dir, `snapshot-${stamp}.json`);
    writeFileSync(path, JSON.stringify(live, null, 2));
    writeFileSync(join(dir, 'baseline-latest.json'), JSON.stringify(live, null, 2));
  }

  let baseline = null;
  if (existsSync(baselinePath)) {
    try {
      baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    } catch {
      baseline = null;
    }
  }

  const L = studio(live);
  const B = studio(baseline);
  const delta = {};
  for (const k of KEYS) {
    const a = num(B[k]);
    const b = num(L[k]);
    delta[k] = {
      baseline: a,
      live: b,
      d: a != null && b != null ? Number((b - a).toFixed(4)) : null,
    };
  }
  const QL = quiz(live);
  const QB = quiz(baseline);
  const quizDelta = {};
  for (const k of QUIZ_KEYS) {
    const a = num(QB[k]);
    const b = num(QL[k]);
    quizDelta[k] = { baseline: a, live: b, d: a != null && b != null ? Number((b - a).toFixed(4)) : null };
  }

  const openToEdit = delta.openToEdit;
  const editToShare = delta.editToShareIntent;
  const summary = {
    ok: true,
    baselinePath: existsSync(baselinePath) ? baselinePath : null,
    liveSince: live.since,
    baselineSince: baseline?.since || null,
    headline: {
      openToEdit: openToEdit.live,
      openToEditDelta: openToEdit.d,
      editToShareIntent: editToShare.live,
      editToShareIntentDelta: editToShare.d,
      handoffMints: delta.handoffMints.live,
      handoffMintsDelta: delta.handoffMints.d,
      quizStartToComplete: quizDelta.startToComplete.live,
      quizStartToCompleteDelta: quizDelta.startToComplete.d,
      quizCompleteToShareIntent: quizDelta.completeToShareIntent.live,
      quizCompleteToShareIntentDelta: quizDelta.completeToShareIntent.d,
    },
    read: !baseline
      ? 'No baseline file — save with --save then compare again later.'
      : openToEdit.d == null
        ? 'openToEdit missing on baseline or live (suppressed or not exposed).'
        : openToEdit.d > 0.02
          ? 'openToEdit rose vs baseline.'
          : openToEdit.d < -0.02
            ? 'openToEdit fell vs baseline.'
            : 'openToEdit flat vs baseline.',
    delta,
    quiz: quizDelta,
  };

  writeFileSync(join(dir, 'delta-latest.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

const isMain =
  Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain || process.argv[1]?.endsWith('dasha-funnel-delta.mjs')) {
  main().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e?.stack || e).slice(0, 500) }));
    process.exit(1);
  });
}
