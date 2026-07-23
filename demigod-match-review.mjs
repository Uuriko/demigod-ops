#!/usr/bin/env node
/**
 * Match Review Queue — read/review pairs (no board mint).
 * CLI: node demigod-match-review.mjs [--json] [--state proposed] [--include-sample]
 *      node demigod-match-review.mjs review <pairId> --decision approve|reject|defer
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listPairs, reviewPair, loadPairs } from './demigod-pairs-lib.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const BUSY = '/tmp/dg-busy';
const args = process.argv.slice(2);
const asJson = args.includes('--json');

/** Require a non-flag value after `--name`; never steal the next `--flag` as a value. */
function requireFlagValue(flag) {
  const i = args.indexOf(flag);
  if (i < 0) return null;
  const v = args[i + 1];
  if (v == null || String(v).startsWith('-')) {
    const msg = `${flag} requires a value (got ${v == null ? 'nothing' : JSON.stringify(v)})`;
    if (asJson) console.error(JSON.stringify({ ok: false, error: msg }));
    else console.error(msg);
    process.exit(2);
  }
  return v;
}

const stateFlag = args.includes('--state') ? requireFlagValue('--state') : null;

const isMainEarly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainEarly) {
  // Known tokens: subcommand review, pair id, --json/--include-sample/--state/--decision/--note + values.
  const knownFlags = new Set(['--json', '--include-sample', '--state', '--decision', '--note', '--help', '-h']);
  const valueFlags = new Set(['--state', '--decision', '--note']);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('-')) continue;
    if (a.includes('=') && knownFlags.has(a.split('=')[0])) continue;
    if (!knownFlags.has(a)) {
      console.error(
        `match-review: unknown argument ${a} — try: node demigod-match-review.mjs [--json] [--state S] [--include-sample] | review <id> --decision …`,
      );
      process.exit(2);
    }
    if (valueFlags.has(a)) i += 1; // skip consumed value
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`match-review — list/review DEMIGOD-PAIRS

Usage:
  node demigod-match-review.mjs [--json] [--state proposed] [--include-sample]
  node demigod-match-review.mjs review <pairId> --decision approve|reject|defer`);
    process.exit(0);
  }
}

function buildQueue({ state = null, limit = 40, includeSample = false } = {}) {
  // Never auto-seed fixtures on list/status — honesty: empty means empty.
  // Seed only: node demigod-pairs-lib.mjs seed.
  const pairs = listPairs({ state, limit, includeSample });
  const all = Object.values(loadPairs().pairs || {});
  const byState = {};
  let sampleCount = 0;
  let realProposed = 0;
  for (const p of all) {
    byState[p.state] = (byState[p.state] || 0) + 1;
    if (p.sample) sampleCount += 1;
    else if (p.state === 'proposed') realProposed += 1;
  }
  return {
    at: new Date().toISOString(),
    summary: {
      total: all.length,
      byState,
      sampleCount,
      realCount: all.length - sampleCount,
      realProposed,
      includeSample,
    },
    pairs: pairs.map((p) => ({
      pairId: p.pairId,
      roleId: p.roleId,
      candId: p.candId,
      state: p.state,
      score: p.score,
      reasons: p.reasons || [],
      mutual: p.mutual || { founder: false, candidate: false },
      sample: !!p.sample,
      updatedAt: p.updatedAt || p.at,
      reviewedBy: p.reviewedBy || null,
    })),
    actions: {
      review: 'node demigod-match-review.mjs review <pairId> --decision approve|reject|defer',
      seed: 'node demigod-pairs-lib.mjs seed   # explicit only — not auto',
      listSamples: 'node demigod-match-review.mjs --include-sample --json',
      introDraftRequires: 'pair.state === approved (and preferably mutual_yes)',
      note: 'SoR is DEMIGOD-PAIRS via bin/dg matches. bin/dg-match is pilot shortlist (legacy).',
    },
  };
}

export function writeQueue(file, queue) {
  atomicWrite(file, JSON.stringify(queue, null, 2) + '\n', { mode: 0o600 });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (args[0] === 'review') {
    const id = args[1];
    const decision = args.includes('--decision') ? requireFlagValue('--decision') : null;
    const note = args.includes('--note') ? requireFlagValue('--note') : '';
    try {
      const p = reviewPair(id, { decision, note, actor: process.env.USER || 'agent' });
      console.log(JSON.stringify({ ok: true, pair: p }, null, 2));
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
    process.exit(0);
  }
  const includeSample = args.includes('--include-sample');
  const q = buildQueue({ state: stateFlag, includeSample });
  fs.mkdirSync(BUSY, { recursive: true });
  writeQueue(path.join(BUSY, 'match-review-latest.json'), q);
  if (asJson) console.log(JSON.stringify(q, null, 2));
  else {
    const s = q.summary;
    console.log(
      `Match review · total ${s.total} (sample ${s.sampleCount} · real ${s.realCount}) · realProposed ${s.realProposed} · ${JSON.stringify(s.byState)}`,
    );
    for (const p of q.pairs) {
      console.log(
        `${p.pairId} · ${p.state}${p.sample ? ' · SAMPLE' : ''} · ${p.roleId}↔${p.candId} · score=${p.score ?? '—'} · ${(p.reasons || []).join('; ')}`,
      );
    }
    if (!q.pairs.length) {
      console.log('(empty queue — seed with: node demigod-pairs-lib.mjs seed)');
    }
  }
}

export { buildQueue };
