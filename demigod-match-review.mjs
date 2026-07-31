#!/usr/bin/env node
/**
 * Match Review Queue — read/review pairs (no board mint).
 * CLI: node demigod-match-review.mjs [--json] [--state proposed] [--include-sample]
 *      node demigod-match-review.mjs review <pairId> --decision approve|reject|defer --i-reviewed --note "evidence"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listPairs, reviewPair, loadPairs } from './demigod-pairs-lib.mjs';
import {
  getStartupRoles,
  loadCompanyEvidenceSources,
  resolveCompanyEvidence,
} from './demigod-matching-engine.mjs';
import { loadBoard, loadInbox, scrubPII } from './demigod-submissions-lib.mjs';
import { listAcceptedRoles } from './demigod-accepted-role.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { loadPackets, loadNotes, projectForReview } from './demigod-role-packet.mjs';

// Prefer DEMIGOD_BUSY (same as evidence/export/pairs consumers); DG_BUSY legacy alias.
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
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
  const knownFlags = new Set(['--json', '--include-sample', '--state', '--decision', '--note', '--i-reviewed', '--help', '-h']);
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
  node demigod-match-review.mjs review <pairId> --decision approve|reject|defer --i-reviewed --note "evidence"`);
    process.exit(0);
  }
}

function buildQueue({ state = null, limit = 40, includeSample = false } = {}) {
  // Never auto-seed fixtures on list/status — honesty: empty means empty.
  // Seed only: node demigod-pairs-lib.mjs seed.
  const pairs = listPairs({ state, limit, includeSample });
  const all = Object.values(loadPairs().pairs || {});
  const byState = {};
  const sampleByState = {};
  let sampleCount = 0;
  let realProposed = 0;
  for (const p of all) {
    if (p.sample !== false) {
      sampleCount += 1;
      sampleByState[p.state] = (sampleByState[p.state] || 0) + 1;
    } else {
      byState[p.state] = (byState[p.state] || 0) + 1;
      if (p.state === 'proposed') realProposed += 1;
    }
  }
  const evidenceByRole = new Map();
  const board = loadBoard();
  // Read-only acceptance annotation (Codex PASS on receipt contract). Samples always null.
  // Does not affect score/order/filter/review state.
  const acceptedByRole = new Map();
  if (pairs.some((pair) => pair.sample === false)) {
    const roles = new Map(getStartupRoles(board).map((role) => [String(role.id), role]));
    const { map, ledger, research, researchCatalog } = loadCompanyEvidenceSources();
    const accepted = listAcceptedRoles(board, loadInbox());
    for (const rec of accepted.acceptedRoles || []) {
      acceptedByRole.set(String(rec.roleId), rec);
    }
    for (const pair of pairs) {
      if (pair.sample !== false || evidenceByRole.has(pair.roleId)) continue;
      const role = roles.get(String(pair.roleId));
      evidenceByRole.set(
        pair.roleId,
        role
          ? resolveCompanyEvidence(role, map, ledger, undefined, research, researchCatalog)
          : { status: 'unknown', reason: 'role_not_found' },
      );
    }
  }
  // Structured-hiring product surfaces (Ashby packet + evidence notes) — read-only attach.
  const packets = loadPackets().packets || {};
  const notes = loadNotes().notes || {};
  let packetsAttached = 0;
  let notesAttached = 0;

  return {
    at: new Date().toISOString(),
    summary: {
      total: all.length,
      byState,
      sampleByState,
      sampleCount,
      realCount: all.length - sampleCount,
      realProposed,
      includeSample,
      acceptedRoleCount: acceptedByRole.size,
      rolePackets: Object.keys(packets).length,
    },
    pairs: pairs.map((p) => {
      const packet = packets[String(p.roleId)] || null;
      const note = notes[`${p.roleId}|${p.candId}`] || null;
      let structured = null;
      if (packet) {
        packetsAttached += 1;
        try {
          structured = projectForReview(packet, note);
          if (note) notesAttached += 1;
        } catch {
          structured = { roleId: packet.roleId, title: packet.title, error: 'project_failed' };
        }
      }
      return {
        pairId: p.pairId,
        roleId: p.roleId,
        candId: p.candId,
        state: p.state,
        score: p.score,
        reasons: Array.isArray(p.reasons) ? p.reasons.map(scrubPII) : [],
        mutual: p.mutual || { founder: false, candidate: false },
        sample: p.sample !== false,
        updatedAt: p.updatedAt || p.at,
        reviewedBy: p.reviewedBy || null,
        companyEvidence: p.sample === false ? evidenceByRole.get(p.roleId) : null,
        acceptedRole: p.sample === false ? acceptedByRole.get(String(p.roleId)) || null : null,
        structuredHiring: structured,
      };
    }),
    structuredHiring: {
      packetsAttached,
      notesAttached,
      cmds: {
        status: 'node demigod-structured-hiring.mjs status',
        desk: 'node demigod-structured-hiring.mjs desk --role=ID',
        packet: 'node demigod-role-packet.mjs',
      },
    },
    actions: {
      review: 'node demigod-match-review.mjs review <pairId> --decision approve|reject|defer --i-reviewed --note "evidence"',
      seed: 'node demigod-pairs-lib.mjs seed   # explicit only — not auto',
      listSamples: 'node demigod-match-review.mjs --include-sample --json',
      introDraftRequires: 'pair.state === approved (and preferably mutual_yes)',
      structuredHiring: 'node demigod-structured-hiring.mjs status|desk --role=…',
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
      const p = reviewPair(id, {
        decision,
        note,
        reviewed: args.includes('--i-reviewed'),
        actor: 'human:cli',
      });
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
      const evidence = p.companyEvidence;
      console.log(
        `${p.pairId} · ${p.state}${p.sample ? ' · SAMPLE' : ''} · ${p.roleId}↔${p.candId} · score=${p.score ?? '—'}${evidence ? ` · companyEvidence=${evidence.status}${evidence.company?.name ? `:${evidence.company.name}` : ''}${evidence.research ? ` · research=${evidence.research.status}` : ''}` : ''} · ${(p.reasons || []).join('; ')}`,
      );
    }
    if (!q.pairs.length) {
      console.log('(empty queue — seed with: node demigod-pairs-lib.mjs seed)');
    }
  }
}

export { buildQueue };
