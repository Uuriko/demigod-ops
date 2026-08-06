#!/usr/bin/env node
/**
 * demigod-phase2 — DIE Phase 2 gate + dry-run company context for match-review.
 *
 * Phase 2 = role-relevant company context on *real* match review.
 * Gate: accepted-for-delivery role (sample:false + featured startup-hire provenance).
 * Seeds never open the gate. Never invents roles.
 *
 *   node demigod-phase2.mjs status|--json
 *   node demigod-phase2.mjs dry-run [--json]   # uses live board; empty when closed
 *   node demigod-phase2.mjs --selftest
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAcceptedRoles } from './demigod-accepted-role.mjs';
import { loadBoard, loadInbox } from './demigod-submissions-lib.mjs';
import {
  getStartupRoles,
  resolveCompanyEvidence,
  loadCompanyEvidenceSources,
} from './demigod-matching-engine.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const asJson = args.includes('--json');

export function phase2Status(board = loadBoard(), inbox = loadInbox()) {
  const accepted = listAcceptedRoles(board, inbox);
  const open = accepted.counts.acceptedForDelivery > 0;
  return {
    schema: 'demigod.phase2-status/1',
    at: new Date().toISOString(),
    gateOpen: open,
    // Product claim still requires green research + real pair — match accepted-role honesty.
    phase2ProductReady: false,
    acceptedForDelivery: accepted.counts.acceptedForDelivery,
    boardRoles: accepted.counts.boardRoles,
    nonSampleRoles: accepted.counts.nonSampleRoles,
    note: open
      ? 'Accepted role receipts exist; product Phase 2 still needs green research + real match-review pair (phase2ProductReady=false until that stack is observed).'
      : 'No accepted-for-delivery roles. Phase 2 product surfaces stay closed. Seeds never count.',
    next: open
      ? 'Attach company evidence on match-review for real pairs (sample:false).'
      : 'Mint a real board role only after featured startup-hire with full truth fields — never flip sample seeds.',
  };
}

/** Role-relevant company context packets for accepted roles only (fail-closed empty). */
export function phase2DryRun(board = loadBoard(), inbox = loadInbox()) {
  const accepted = listAcceptedRoles(board, inbox);
  const roles = new Map(getStartupRoles(board).map((r) => [String(r.id), r]));
  const { map, ledger, research, researchCatalog } = loadCompanyEvidenceSources();
  const packets = [];
  for (const rec of accepted.acceptedRoles || []) {
    const role = roles.get(String(rec.roleId));
    const evidence = role
      ? resolveCompanyEvidence(role, map, ledger, undefined, research, researchCatalog)
      : { status: 'unknown', reason: 'role_not_on_board' };
    packets.push({
      roleId: rec.roleId,
      company: rec.company || role?.company || null,
      title: rec.title || role?.title || null,
      roleTruthHash: rec.roleTruthHash || null,
      companyEvidence: evidence,
    });
  }
  return {
    schema: 'demigod.phase2-dry-run/1',
    at: new Date().toISOString(),
    gateOpen: packets.length > 0,
    packetCount: packets.length,
    packets,
  };
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`phase2 selftest: ${m}`);
  };
  // Fixture board: only seeds → gate closed
  const board = {
    roles: [
      { id: 'role-seed1', sample: true, title: 'Seed', company: 'Demo' },
      { id: 'role-seed2', sample: true, title: 'Seed2', company: 'Demo' },
    ],
  };
  const st = phase2Status(board, { submissions: [] });
  assert(st.gateOpen === false, 'seeds do not open gate');
  assert(st.acceptedForDelivery === 0, 'no accepted');
  assert(st.phase2ProductReady === false, 'product ready always false here');
  const dry = phase2DryRun(board, { submissions: [] });
  assert(dry.packetCount === 0, 'dry-run empty when closed');
  assert(Array.isArray(dry.packets) && dry.packets.length === 0, 'no packets');
  // Live status must not throw
  const live = phase2Status();
  assert(typeof live.note === 'string' && live.note.length > 10, 'live note');
  assert(live.phase2ProductReady === false, 'live product ready stays false without full stack');
  console.log(JSON.stringify({ ok: true, selftest: 'phase2', liveGateOpen: live.gateOpen }));
}

if (isMain) {
  if (args.includes('--selftest')) {
    selftest();
    process.exit(0);
  }
  const cmd = args.find((a) => !a.startsWith('--')) || 'status';
  if (cmd === 'status' || cmd === '--json') {
    const st = phase2Status();
    console.log(asJson || cmd === '--json' ? JSON.stringify(st, null, 2) : [
      `# phase2 · gate=${st.gateOpen ? 'OPEN' : 'CLOSED'} · accepted=${st.acceptedForDelivery}`,
      `productReady: ${st.phase2ProductReady}`,
      st.note,
      `next: ${st.next}`,
    ].join('\n'));
    process.exit(st.gateOpen ? 0 : 2);
  }
  if (cmd === 'dry-run') {
    const dry = phase2DryRun();
    console.log(JSON.stringify(dry, null, 2));
    process.exit(dry.packetCount ? 0 : 2);
  }
  console.error('usage: demigod-phase2.mjs status|dry-run|--selftest [--json]');
  process.exit(1);
}
