#!/usr/bin/env node
/**
 * Auto-propose pairs from board sample roles × inbox engineers (no board mint, freeze-safe).
 * Scores lightly; writes to DEMIGOD-PAIRS.json only.
 *
 *   node demigod-auto-propose.mjs [--limit 5] [--min-score 10] [--json]
 */
import { loadBoard, loadInbox, extractEmail } from './demigod-submissions-lib.mjs';
import { proposePair, listPairs } from './demigod-pairs-lib.mjs';
import { suggestMatches } from './demigod-matching-engine.mjs';
import fs from 'fs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const limit = Number(args.includes('--limit') ? args[args.indexOf('--limit') + 1] : 5) || 5;
const minScore = Number(args.includes('--min-score') ? args[args.indexOf('--min-score') + 1] : 10) || 10;

const board = loadBoard();
const roles = (board.roles || []).slice(0, 3);
const proposed = [];
const skipped = [];

for (const role of roles) {
  const res = suggestMatches(role.id || role.title, { propose: false, limit: 8 });
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
        reasons: [`auto-propose score=${m.score}`, role.title || ''].filter(Boolean),
        actor: 'auto-propose',
      });
      proposed.push({
        pairId: pair.pairId,
        roleId: pair.roleId,
        candId: pair.candId,
        score: m.score,
        state: pair.state,
      });
      n++;
    } catch (e) {
      skipped.push({ role: role.id, cand: m.id, error: String(e.message || e) });
    }
  }
}

const out = {
  at: new Date().toISOString(),
  proposed,
  skipped: skipped.slice(0, 40),
  ledgerTotal: listPairs({ limit: 500 }).length,
  actions: {
    review: 'bin/dg-matches list',
    approve: 'node demigod-match-review.mjs review <pairId> --decision approve',
  },
};

fs.mkdirSync('/tmp/dg-busy', { recursive: true });
fs.writeFileSync('/tmp/dg-busy/auto-propose-latest.json', JSON.stringify(out, null, 2) + '\n');

if (asJson) console.log(JSON.stringify(out, null, 2));
else {
  console.log(`auto-propose · ${proposed.length} pairs · ledger=${out.ledgerTotal}`);
  for (const p of proposed) {
    console.log(`  ${p.pairId} · ${p.roleId}↔${p.candId} · score=${p.score}`);
  }
}
