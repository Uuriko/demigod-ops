#!/usr/bin/env node
/**
 * Approve inbox submission → mintBoardEntry.
 * Reviewed startup submissions become locally real; explicit samples stay samples.
 */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import {
  loadInbox,
  approveSubmission,
  isSampleData,
  loadBoard,
} from './demigod-submissions-lib.mjs';

function usage() {
  console.log('Usage: node demigod-submissions-approve.mjs <sub-id|--latest|--list>');
  process.exit(1);
}

function pickId(arg) {
  const inbox = loadInbox();
  if (arg === '--list') {
    console.log(
      JSON.stringify(
        inbox.items.slice(0, 20).map((i) => ({
          id: i.id,
          at: i.at,
          form: i.form,
          status: i.status,
        })),
        null,
        2,
      ),
    );
    process.exit(0);
  }
  if (arg === '--latest') return inbox.items[0]?.id;
  return arg;
}

const arg = process.argv[2];
if (!arg) usage();

const subId = pickId(arg);
if (!subId) {
  console.error(JSON.stringify({ ok: false, error: 'no submissions in inbox' }));
  process.exit(1);
}

const inbox = loadInbox();
const item = inbox.items.find((i) => i.id === subId);
if (!item) {
  console.error(JSON.stringify({ ok: false, error: 'submission not found', subId }));
  process.exit(1);
}

const form = (item.form || '').toLowerCase();
if (!/startup|engineer|jobseeker|candidate/.test(form)) {
  console.error(JSON.stringify({ ok: false, error: 'unknown form', form }));
  process.exit(1);
}

const wantReal = /startup/.test(form) && !isSampleData(item);
if (wantReal) process.env.DEMIGOD_ALLOW_REAL_ROLES = '1';

let approval;
try {
  approval = approveSubmission(subId, {
    actor: process.env.USER || 'approve',
    reason: `approve:${subId}`,
    real: wantReal,
  });
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e), code: e.code }));
  process.exit(1);
}
if (!approval) {
  console.error(JSON.stringify({ ok: false, error: 'submission disappeared', subId }));
  process.exit(1);
}
const { featured } = approval;

const honesty = spawnSync('node', ['demigod-verify-board-honesty.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});

const boardNow = loadBoard();
console.log(
  JSON.stringify(
    {
      ok: honesty.status === 0,
      subId,
      via: 'mintBoardEntry',
      reused: approval.reused,
      repaired: !!approval.repaired,
      featured,
      sample: featured?.sample !== false,
      board: {
        roles: boardNow.roles?.length,
        candidates: boardNow.candidates?.length,
      },
      honesty: honesty.status === 0 ? 'OK' : (honesty.stderr || honesty.stdout || '').slice(0, 300),
    },
    null,
    2,
  ),
);
if (honesty.status !== 0) process.exit(1);
