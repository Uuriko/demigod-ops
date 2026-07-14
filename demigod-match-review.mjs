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

const BUSY = '/tmp/dg-busy';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const stateFlag = args.includes('--state') ? args[args.indexOf('--state') + 1] : null;

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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (args[0] === 'review') {
    const id = args[1];
    const di = args.indexOf('--decision');
    const decision = di >= 0 ? args[di + 1] : null;
    const ni = args.indexOf('--note');
    const note = ni >= 0 ? args[ni + 1] : '';
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
  fs.writeFileSync(path.join(BUSY, 'match-review-latest.json'), JSON.stringify(q, null, 2) + '\n');
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
