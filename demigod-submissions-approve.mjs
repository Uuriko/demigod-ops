#!/usr/bin/env node
/** Approve inbox submission → anonymized featured board card (+ CDN if freeze OFF). */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import {
  loadInbox,
  saveInbox,
  loadBoard,
  saveBoard,
  anonymizeRole,
  anonymizeCandidate,
} from './demigod-submissions-lib.mjs';
import { isFrozen } from './demigod-agent-tools-lib.mjs';

function usage() {
  console.log('Usage: node demigod-submissions-approve.mjs <sub-id|--latest|--list>');
  process.exit(1);
}

function pickId(arg) {
  const inbox = loadInbox();
  if (arg === '--list') {
    console.log(JSON.stringify(inbox.items.slice(0, 20).map((i) => ({
      id: i.id, at: i.at, form: i.form, status: i.status,
    })), null, 2));
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

const board = loadBoard();
const form = (item.form || '').toLowerCase();
let featured = null;

if (/startup/.test(form)) {
  featured = anonymizeRole(item.raw || {});
  featured.sample = true; // honesty: approve is not a delivered real proof
  featured.note = featured.note || 'Sample — human featured from inbox (not a paid placement receipt).';
  board.roles = [featured, ...(board.roles || [])].slice(0, 3);
} else if (/engineer|jobseeker|candidate/.test(form)) {
  featured = anonymizeCandidate(item.raw || {});
  featured.sample = true;
  featured.note = featured.note || 'Sample — human featured from inbox.';
  board.candidates = [featured, ...(board.candidates || [])].slice(0, 3);
} else {
  console.error(JSON.stringify({ ok: false, error: 'unknown form', form }));
  process.exit(1);
}

item.status = 'featured';
item.featuredId = featured.id;
item.reviewedAt = new Date().toISOString();
saveInbox(inbox);
saveBoard(board, { reason: `approve:${subId}`, actor: process.env.USER || 'approve' });

const freeze = isFrozen();
let publish = { skipped: true, reason: null };
if (freeze.on && process.env.DEMIGOD_FORCE_PUBLISH !== '1') {
  publish = {
    skipped: true,
    reason: 'publish_frozen',
    why: freeze.why,
    hint: 'board saved locally; CDN publish when freeze OFF or DEMIGOD_FORCE_PUBLISH=1',
  };
} else {
  const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8' });
  publish = {
    skipped: false,
    ok: pub.status === 0,
    out: (pub.stdout || pub.stderr || '').trim().slice(0, 500),
  };
}

// honesty gate after local board write
const honesty = spawnSync('node', ['demigod-verify-board-honesty.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});

console.log(
  JSON.stringify(
    {
      ok: honesty.status === 0,
      subId,
      featured,
      sample: true,
      board: { roles: board.roles?.length, candidates: board.candidates?.length },
      publish,
      honesty: honesty.status === 0 ? 'OK' : (honesty.stderr || honesty.stdout || '').slice(0, 300),
    },
    null,
    2,
  ),
);
if (honesty.status !== 0) process.exit(1);