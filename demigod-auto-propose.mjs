#!/usr/bin/env node
/**
 * Auto-propose pairs from board roles × candidates (no board mint, freeze-safe).
 * Higher default min score; skips pure sample×sample noise unless --allow-sample.
 *
 *   node demigod-auto-propose.mjs [--limit 5] [--min-score 72] [--allow-sample] [--json]
 */
import { loadBoard } from './demigod-submissions-lib.mjs';
import { proposePair, listPairs, loadPairs } from './demigod-pairs-lib.mjs';
import { suggestMatches } from './demigod-matching-engine.mjs';
import fs from 'fs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const allowSample = args.includes('--allow-sample');
const limit = Number(args.includes('--limit') ? args[args.indexOf('--limit') + 1] : 5) || 5;
// scores from matching engine are 0–100
const minScore =
  Number(args.includes('--min-score') ? args[args.indexOf('--min-score') + 1] : 72) || 72;

const board = loadBoard();
let roles = board.roles || [];
if (!allowSample) {
  // Prefer non-sample roles; if none, still allow sample roles but mark pairs sample
  const realRoles = roles.filter((r) => r && r.sample === false);
  if (realRoles.length) roles = realRoles;
}
roles = roles.slice(0, 5);

const proposed = [];
const skipped = [];

for (const role of roles) {
  const res = suggestMatches(role.id || role.title, { propose: false, limit: 12 });
  if (res.error) {
    skipped.push({ role: role.id, error: res.error });
    continue;
  }
  let n = 0;
  for (const m of res.matches || []) {
    if (n >= limit) break;
    if ((m.score || 0) < minScore) {
      skipped.push({ role: role.id, cand: m.id, score: m.score, why: 'below_min' });
      continue;
    }
    try {
      const pair = proposePair({
        roleId: role.id || role.title,
        candId: m.id,
        score: Math.min(1, (m.score || 0) / 100),
        reasons: [
          `auto-propose score=${m.score}`,
          role.title || '',
          role.sample ? 'role-sample' : '',
        ].filter(Boolean),
        actor: 'auto-propose',
        sample: !!role.sample || !!m.sample,
      });
      proposed.push({
        pairId: pair.pairId,
        roleId: pair.roleId,
        candId: pair.candId,
        score: m.score,
        state: pair.state,
        sample: !!pair.sample,
      });
      n++;
    } catch (e) {
      skipped.push({ role: role.id, cand: m.id, error: String(e.message || e) });
    }
  }
}

const all = Object.values(loadPairs().pairs || {});
let sampleCount = 0;
let realProposed = 0;
for (const p of all) {
  if (p.sample) sampleCount += 1;
  else if (p.state === 'proposed') realProposed += 1;
}

const out = {
  at: new Date().toISOString(),
  minScore,
  allowSample,
  proposed,
  skipped: skipped.slice(0, 40),
  ledgerTotal: all.length,
  summary: {
    sampleCount,
    realCount: all.length - sampleCount,
    realProposed,
    listedNonSample: listPairs({ limit: 500 }).length,
  },
  actions: {
    review: 'bin/dg-matches list',
    approve: 'node demigod-match-review.mjs review <pairId> --decision approve',
  },
};

fs.mkdirSync('/tmp/dg-busy', { recursive: true });
fs.writeFileSync('/tmp/dg-busy/auto-propose-latest.json', JSON.stringify(out, null, 2) + '\n');

if (asJson) console.log(JSON.stringify(out, null, 2));
else {
  console.log(
    `auto-propose · ${proposed.length} new · min=${minScore} · ledger=${out.ledgerTotal} · realProposed=${realProposed}`,
  );
  for (const p of proposed) {
    console.log(
      `  ${p.pairId} · ${p.roleId}↔${p.candId} · score=${p.score}${p.sample ? ' · SAMPLE' : ''}`,
    );
  }
}
