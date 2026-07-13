#!/usr/bin/env node
/**
 * Match Review Queue — read/review pairs (no board mint).
 * CLI: node demigod-match-review.mjs [--json] [--state proposed]
 *      node demigod-match-review.mjs review <pairId> --decision approve|reject|defer
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listPairs, reviewPair, seedFixturePairs, loadPairs } from './demigod-pairs-lib.mjs';

const BUSY = '/tmp/dg-busy';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const stateFlag = args.includes('--state') ? args[args.indexOf('--state') + 1] : null;

function buildQueue({ state = null, limit = 40 } = {}) {
  // Ensure some fixture pairs if empty (ops never blank for demos)
  let pairs = listPairs({ state, limit });
  if (!pairs.length) {
    seedFixturePairs();
    pairs = listPairs({ state, limit });
  }
  const byState = {};
  for (const p of Object.values(loadPairs().pairs || {})) {
    byState[p.state] = (byState[p.state] || 0) + 1;
  }
  return {
    at: new Date().toISOString(),
    summary: { total: Object.keys(loadPairs().pairs || {}).length, byState },
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
      seed: 'node demigod-pairs-lib.mjs seed',
      introDraftRequires: 'pair.state === approved (and preferably mutual_yes)',
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
  const q = buildQueue({ state: stateFlag });
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'match-review-latest.json'), JSON.stringify(q, null, 2) + '\n');
  if (asJson) console.log(JSON.stringify(q, null, 2));
  else {
    console.log(`Match review · ${q.summary.total} pairs · ${JSON.stringify(q.summary.byState)}`);
    for (const p of q.pairs) {
      console.log(`${p.pairId} · ${p.state} · ${p.roleId}↔${p.candId} · score=${p.score ?? '—'} · ${(p.reasons || []).join('; ')}`);
    }
  }
}

export { buildQueue };
