#!/usr/bin/env node
/**
 * The chess push contract, asserted from both ends at once.
 *
 * The worker broadcasts and the page listens, and nothing in between checks that the two agree.
 * They did not: the broadcast was first written to send {type:'chess_game'} carrying the whole
 * game, while dasha-chess-page.html has always ignored anything that is not {type:'chess'} with
 * the id of the game on screen. It would have deployed, sent frames, and changed nothing — the
 * board still waiting on the next poll, with no error anywhere to say why.
 *
 * So this reads the literal each side uses rather than trusting either one's comments.
 *
 *   node dasha-chess-push.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
const page = readFileSync(join(root, 'dasha-chess-page.html'), 'utf8');

// ---- what the page accepts ---------------------------------------------------
const listener = page.slice(page.indexOf('function connectPush'), page.indexOf('function disconnectPush'));
assert.ok(listener.includes("data.type!=='chess'"), 'the page filters on a literal message type');
assert.ok(listener.includes('data.id!==game.id'), 'the page filters on the game id');
assert.ok(/loadGame\(\)/.test(listener), 'the page re-fetches its own view rather than trusting the frame');

// ---- what the worker sends ---------------------------------------------------
/* Anchor the end AFTER the start: schedulePresence is called earlier in the file than it is
   defined, so searching from zero found the call site and sliced backwards into an empty string. */
const broadcastAt = worker.indexOf('broadcastChess(game) {');
assert.ok(broadcastAt > 0, 'broadcastChess must exist');
const broadcast = worker.slice(broadcastAt, worker.indexOf('schedulePresence() {', broadcastAt));
const frame = broadcast.match(/JSON\.stringify\(\{[^}]*\}\)/);
assert.ok(frame, 'broadcastChess must build a frame');
assert.ok(/type:\s*'chess'/.test(frame[0]), `the frame type must be exactly 'chess' — the page drops anything else (got ${frame[0]})`);
assert.ok(/id:\s*game\.id/.test(frame[0]), 'the frame must carry the game id the page matches on');

/* The frame must not carry the game. publicChessGame is viewer-relative — side, legal and drawOffer
   answer "what can I do" — so one shared frame would tell both players they were the same colour. */
assert.ok(!/game:\s*view/.test(broadcast), 'the frame must not embed a per-viewer game view');

// ---- only the two players are told -------------------------------------------
assert.ok(/publicChessGame\(game, att\.xId/.test(broadcast),
  'membership is tested with publicChessGame, which returns null for non-players');
assert.ok(/att\.xId/.test(broadcast), 'sockets without a linked identity are skipped');

// ---- every state change that ends a turn must broadcast ----------------------
for (const [what, anchor] of [
  ['a move, resignation or agreed draw', 'const next = this.chessFinish(timed, result.state);'],
  ['a draw offer', 'game.drawOfferBy = xId;'],
  ['flag-fall in the alarm', 'const result = this.expireChessClock(game, now);'],
]) {
  const at = worker.indexOf(anchor);
  assert.ok(at > 0, `anchor missing for ${what}`);
  assert.ok(worker.slice(at, at + 700).includes('this.broadcastChess('),
    `${what} must tell the other player — flag-fall especially, since no request is behind it`);
}

console.log('dasha chess push: PASS (frame shape matches the page filter, no per-viewer data on the wire, players only, all four state changes broadcast)');
