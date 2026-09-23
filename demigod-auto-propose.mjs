#!/usr/bin/env node
/**
 * Auto-propose pairs from board roles × candidates (no board mint, freeze-safe).
 * The report stays under DEMIGOD_ROOT. This command does not publish.
 *
 *   node demigod-auto-propose.mjs [--limit 5] [--min-score 72] [--allow-sample] [--json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadBoard } from './demigod-submissions-lib.mjs';
import { proposePair, listPairs, loadPairs } from './demigod-pairs-lib.mjs';
import { suggestMatches } from './demigod-matching-engine.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-AUTO-PROPOSE.json');
}

export function runAutoPropose(argv = process.argv.slice(2)) {
  const asJson = argv.includes('--json');
  const allowSample = argv.includes('--allow-sample');
  const limit = Number(argv.includes('--limit') ? argv[argv.indexOf('--limit') + 1] : 5) || 5;
  const minScore =
    Number(argv.includes('--min-score') ? argv[argv.indexOf('--min-score') + 1] : 72) || 72;

  const board = loadBoard();
  let roles = board.roles || [];
  if (!allowSample) {
    const realRoles = roles.filter((row) => row && row.sample === false);
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
    for (const match of res.matches || []) {
      if (n >= limit) break;
      if ((match.score || 0) < minScore) {
        skipped.push({ role: role.id, cand: match.id, score: match.score, why: 'below_min' });
        continue;
      }
      try {
        const pair = proposePair({
          roleId: role.id || role.title,
          candId: match.id,
          score: Math.min(1, (match.score || 0) / 100),
          reasons: [
            `auto-propose score=${match.score}`,
            role.title || '',
            role.sample ? 'role-sample' : '',
          ].filter(Boolean),
          actor: 'auto-propose',
          sample: !!role.sample || !!match.sample,
        });
        proposed.push({
          pairId: pair.pairId,
          roleId: pair.roleId,
          candId: pair.candId,
          score: match.score,
          state: pair.state,
          sample: !!pair.sample,
        });
        n++;
      } catch (err) {
        skipped.push({ role: role.id, cand: match.id, error: String(err.message || err) });
      }
    }
  }

  const all = Object.values(loadPairs().pairs || {});
  let sampleCount = 0;
  let realProposed = 0;
  for (const pair of all) {
    if (pair.sample) sampleCount += 1;
    else if (pair.state === 'proposed') realProposed += 1;
  }

  const report = reportPath();
  const out = {
    at: new Date().toISOString(),
    minScore,
    allowSample,
    proposed,
    skipped: skipped.slice(0, 40),
    ledgerTotal: all.length,
    report,
    livePublish: false,
    sent: false,
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

  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(report, JSON.stringify(out, null, 2) + '\n');

  if (asJson) console.log(JSON.stringify(out));
  else {
    console.log(
      `auto-propose · ${proposed.length} new · min=${minScore} · ledger=${out.ledgerTotal} · realProposed=${realProposed}`,
    );
    for (const pair of proposed) {
      console.log(
        `  ${pair.pairId} · ${pair.roleId}↔${pair.candId} · score=${pair.score}${pair.sample ? ' · SAMPLE' : ''}`,
      );
    }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runAutoPropose();
