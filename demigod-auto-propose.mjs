#!/usr/bin/env node
/**
 * Auto-propose pairs from board roles × candidates (no board mint, freeze-safe).
 * Scores only real role/candidate pairs by default.
 *
 *   node demigod-auto-propose.mjs [--limit 5] [--min-score 0.72] [--allow-sample] [--json]
 */
import { loadBoard } from './demigod-submissions-lib.mjs';
import { proposePair, listPairs, loadPairs } from './demigod-pairs-lib.mjs';
import { isSampleCandidate, isSampleRole, suggestMatches } from './demigod-matching-engine.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import path from 'node:path';

const args = process.argv.slice(2);
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const AUTO_PROPOSE_FLAGS = new Set(['--json', '--allow-sample', '--limit', '--min-score', '--help', '-h']);
const unknownAuto = args.find(
  (a, i) =>
    a.startsWith('-') &&
    !AUTO_PROPOSE_FLAGS.has(a) &&
    !(args[i - 1] === '--limit' || args[i - 1] === '--min-score'),
);
if (unknownAuto) {
  console.error(
    `auto-propose: unknown argument ${unknownAuto} — try: node demigod-auto-propose.mjs [--json] [--limit N] [--min-score 0.72] [--allow-sample]`,
  );
  process.exit(2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`demigod-auto-propose — freeze-safe pair proposals (no board mint)

Usage: node demigod-auto-propose.mjs [--json] [--limit N] [--min-score 0.72] [--allow-sample]`);
  process.exit(0);
}
const asJson = args.includes('--json');
const allowSample = args.includes('--allow-sample');

function numberFlag(flag, fallback, valid) {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  const raw = args[i + 1];
  const value = Number(raw);
  if (raw == null || String(raw).startsWith('-') || !valid(value)) {
    console.error(`${flag} requires a valid value (got ${raw == null ? 'nothing' : JSON.stringify(raw)})`);
    process.exit(2);
  }
  return value;
}

const limit = numberFlag('--limit', 5, (value) => Number.isInteger(value) && value > 0);
const minScore = numberFlag('--min-score', 0.72, (value) => Number.isFinite(value) && value >= 0 && value <= 1);

const board = loadBoard();
let roles = board.roles || [];
if (!allowSample) {
  roles = roles.filter((r) => r && r.sample !== true);
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
    if (!allowSample && (m.sample === true || m.candidate?.sample === true || m.candidate?.raw?.sample === true)) {
      skipped.push({ role: role.id, cand: m.id, why: 'sample_pair' });
      continue;
    }
    const normalizedScore = Math.min(1, Math.max(0, (Number(m.score) || 0) / 100));
    if (normalizedScore < minScore) {
      skipped.push({ role: role.id, cand: m.id, score: normalizedScore, why: 'below_min' });
      continue;
    }
    try {
      const pair = proposePair({
        roleId: role.id || role.title,
        candId: m.id,
        score: normalizedScore,
        reasons: [
          `auto-propose score=${m.score}`,
          ...(m.evidence || []),
          role.sample ? 'role-sample' : '',
        ].filter(Boolean),
        actor: 'auto-propose',
        sample: isSampleRole(role) || m.sample === true || isSampleCandidate(m.candidate),
      });
      proposed.push({
        pairId: pair.pairId,
        roleId: pair.roleId,
        candId: pair.candId,
        score: normalizedScore,
        state: pair.state,
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
  if (p.sample !== false) sampleCount += 1;
  else if (p.state === 'proposed') realProposed += 1;
}

const out = {
  at: new Date().toISOString(),
  minScore,
  allowSample,
  proposed,
  skipped: skipped.slice(0, 40),
  ledgerTotal: all.length,
  stats: {
    sampleCount,
    realCount: all.length - sampleCount,
    realProposed,
    listedNonSample: listPairs({ limit: 500 }).length,
  },
  actions: {
    review: 'bin/dg-matches list',
    approve: 'node demigod-match-review.mjs review <pairId> --decision approve --i-reviewed --note "evidence"',
  },
};

atomicWrite(path.join(BUSY, 'auto-propose-latest.json'), JSON.stringify(out, null, 2) + '\n', { mode: 0o600 });

if (asJson) console.log(JSON.stringify(out, null, 2));
else {
  console.log(
    `auto-propose · ${proposed.length} new · min=${minScore} · ledger=${out.ledgerTotal} · realProposed=${realProposed}`,
  );
  for (const p of proposed) {
    console.log(
      `  ${p.pairId} · ${p.roleId}↔${p.candId} · score=${p.score}`,
    );
  }
}
