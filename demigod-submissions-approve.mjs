#!/usr/bin/env node
/**
 * Approve inbox submission → mintBoardEntry (sample by default) + optional CDN.
 * Routes through mintBoardEntry so sample/review gates stay honest.
 */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import {
  loadInbox,
  saveInbox,
  mintBoardEntry,
  loadBoard,
} from './demigod-submissions-lib.mjs';
import { isFrozen } from './demigod-agent-tools-lib.mjs';

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

// Gate: mint requires reviewed|featured|approved
item.status = 'reviewed';
item.reviewedAt = new Date().toISOString();
saveInbox(inbox);

const wantReal =
  process.env.DEMIGOD_FORCE_REAL === '1' || process.env.DEMIGOD_FORCE_REAL === 'true';

let board;
try {
  board = mintBoardEntry(item, {
    actor: process.env.USER || 'approve',
    reason: `approve:${subId}`,
    real: wantReal,
  });
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e), code: e.code }));
  process.exit(1);
}

// Resolve featured id from board head entry
const featured =
  /startup/.test(form)
    ? (board.roles || [])[0]
    : (board.candidates || [])[0];

const inbox2 = loadInbox();
const item2 = inbox2.items.find((i) => i.id === subId);
if (item2) {
  item2.status = 'featured';
  item2.featuredId = featured?.id || null;
  item2.featuredAt = new Date().toISOString();
  saveInbox(inbox2);
}

const freeze = isFrozen();
let publish = { skipped: true, reason: null };
if (freeze.on && process.env.DEMIGOD_FORCE_PUBLISH !== '1') {
  publish = {
    skipped: true,
    reason: 'publish_frozen',
    why: freeze.why,
    hint: 'board minted locally; CDN when freeze OFF or DEMIGOD_FORCE_PUBLISH=1',
  };
} else {
  const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8' });
  publish = {
    skipped: false,
    ok: pub.status === 0,
    out: (pub.stdout || pub.stderr || '').trim().slice(0, 500),
  };
}

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
      featured,
      sample: featured?.sample !== false,
      board: {
        roles: boardNow.roles?.length,
        candidates: boardNow.candidates?.length,
      },
      publish,
      honesty: honesty.status === 0 ? 'OK' : (honesty.stderr || honesty.stdout || '').slice(0, 300),
    },
    null,
    2,
  ),
);
if (honesty.status !== 0) process.exit(1);
