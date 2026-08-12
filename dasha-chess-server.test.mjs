#!/usr/bin/env node
/**
 * The rated side of chess: rating settlement, the clock, and flag-fall.
 *
 * dasha-chess-rules.test.mjs proves the rules. dasha-chess-worker.test.mjs proves the routes answer
 * with the right status codes. Neither touches the arithmetic that decides what a game was worth,
 * which is the part a player actually keeps — and it had no test at all.
 *
 * Pure logic: no Durable Object, no network, nothing written.
 *
 *   node dasha-chess-server.test.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const local = new URL('./dasha-chess.mjs', import.meta.url);
const url = existsSync(local) ? local : new URL('./.grok/worktrees/potter/dasha/dasha-chess.mjs', import.meta.url);
const { settleChessRatings, CHESS_START_RATING, CHESS_CLOCK_MS, CHESS_INCREMENT_MS, canMate,
        resignChess, newChessState, playMove, squareIndex } = await import(url.href);

const player = (rating, extra = {}) => ({ rating, games: 0, wins: 0, losses: 0, draws: 0, ...extra });

// ---- rating settlement ------------------------------------------------------
{
  // Equal ratings, decisive result: zero-sum, and K/2 either way.
  const { white, black } = settleChessRatings(player(1200), player(1200), '1-0');
  assert.equal(white.rating, 1212, 'an even win should be +12 at K=24');
  assert.equal(black.rating, 1188, 'an even loss should be -12 at K=24');
  assert.equal(white.rating - 1200, 1200 - black.rating, 'an even game must be zero-sum');
}
{
  const { white, black } = settleChessRatings(player(1200), player(1200), '1/2-1/2');
  assert.equal(white.rating, 1200, 'a draw between equals must not move a rating');
  assert.equal(black.rating, 1200, 'a draw between equals must not move a rating');
}
{
  // An upset is worth more than an expected win, and a favourite's draw costs it.
  const upset = settleChessRatings(player(1000), player(1600), '1-0');
  const expected = settleChessRatings(player(1600), player(1000), '1-0');
  assert.ok(upset.white.rating - 1000 > expected.white.rating - 1600,
    'beating a stronger player must gain more than beating a weaker one');
  const drawn = settleChessRatings(player(1600), player(1000), '1/2-1/2');
  assert.ok(drawn.white.rating < 1600, 'a favourite must lose rating for a draw');
  assert.ok(drawn.black.rating > 1000, 'an underdog must gain rating for a draw');
}
{
  // Colour must not matter: mirroring the pairing mirrors the result.
  const a = settleChessRatings(player(1400), player(1100), '1-0');
  const b = settleChessRatings(player(1100), player(1400), '0-1');
  assert.equal(a.white.rating - 1400, b.black.rating - 1400, 'the same result must settle the same for either colour');
}
{
  // The floor holds, and it is the one place points are created — worth knowing, not a bug.
  const { black } = settleChessRatings(player(1600), player(100), '1-0');
  assert.equal(black.rating, 100, 'ratings must not fall below the 100 floor');
}
{
  // Counters follow the result, not the colour.
  const { white, black } = settleChessRatings(player(1200, { games: 4, wins: 2 }), player(1200), '0-1');
  assert.deepEqual([white.games, white.wins, white.losses, white.draws], [5, 2, 1, 0], 'the loser records a loss');
  assert.deepEqual([black.games, black.wins, black.losses, black.draws], [1, 1, 0, 0], 'the winner records a win');
  const drawn = settleChessRatings(player(1200), player(1200), '1/2-1/2');
  assert.deepEqual([drawn.white.draws, drawn.black.draws], [1, 1], 'a draw is recorded for both');
}
{
  // A missing or junk rating falls back to the start rating rather than producing NaN.
  const { white, black } = settleChessRatings({}, { rating: 'nonsense' }, '1-0');
  assert.ok(Number.isFinite(white.rating) && Number.isFinite(black.rating), 'ratings must never be NaN');
  assert.equal(white.rating, CHESS_START_RATING + 12, 'an absent rating is treated as the start rating');
}

// ---- the clock --------------------------------------------------------------
/* Mirrors DashaLobby.clockAfterMove and .expireChessClock. Kept here as the arithmetic those two
   rely on, so a change to the increment or the floor has to be deliberate. */
const clockAfterMove = (clock, side, now) => {
  const remaining = Number(clock[side]) - Math.max(0, now - Number(clock.activeSince));
  return { ...clock, [side]: Math.max(0, remaining) + CHESS_INCREMENT_MS, activeSince: now };
};
const remainingFor = (clock, side, now) => Number(clock[side]) - Math.max(0, now - Number(clock.activeSince));
{
  const start = { w: CHESS_CLOCK_MS, b: CHESS_CLOCK_MS, active: 'w', activeSince: 1000 };
  const after = clockAfterMove(start, 'w', 1000 + 30_000);
  assert.equal(after.w, CHESS_CLOCK_MS - 30_000 + CHESS_INCREMENT_MS,
    'a move must deduct the time spent and add the increment');
  assert.equal(after.b, CHESS_CLOCK_MS, "a move must not touch the opponent's clock");
  assert.equal(after.activeSince, 1000 + 30_000, 'the clock must restart from the move');
}
{
  // Thinking longer than you have is a flag, and remaining goes negative — which is what
  // expireChessClock keys on. The move path must settle that before accepting anything.
  const start = { w: 5_000, b: CHESS_CLOCK_MS, active: 'w', activeSince: 1000 };
  const overrun = remainingFor(start, 'w', 1000 + 9_000);
  assert.ok(overrun < 0, 'overrunning the clock must leave a negative remainder');

  /* This is why handleChess must refuse a flagged move rather than just applying it: the floor
     clamps the negative remainder to zero first, so applying it anyway would hand a flagged player
     a fresh increment every time they moved. It already refuses — twice, in fact, once on load and
     again after parsing the body, because the clock can cross while the body is being read. This
     asserts the arithmetic that makes those guards necessary, so nobody removes them as redundant. */
  const resurrected = clockAfterMove(start, 'w', 1000 + 9_000);
  assert.equal(resurrected.w, CHESS_INCREMENT_MS,
    'a flagged player who is allowed to move would come back with a full increment');
}
{
  // Flag-fall with no mating material is a draw, not a win on time.
  const bareKings = { board: [...'k'.padEnd(1, '') + '.......' + '........'.repeat(6) + 'K.......'], turn: 'w' };
  assert.equal(canMate(bareKings, 'b'), false, 'a bare king cannot mate, so a flag there is a draw');
}

// ---- resignation ------------------------------------------------------------
/** A position built from eight rank strings, rank 8 first. */
function pos(ranks, turn = 'w') {
  return { board: [...ranks.join('')], turn, castling: '-', enPassant: null,
    halfmove: 0, fullmove: 1, moves: [], positions: {}, version: 3,
    status: 'active', result: null, reason: null };
}
{
  const game = newChessState();
  const white = resignChess(game, 'w');
  assert.ok(white.ok, 'white must be able to resign');
  assert.equal(white.state.result, '0-1', 'white resigning is a black win');
  assert.equal(white.state.reason, 'resignation');
  assert.equal(white.state.status, 'finished');
  assert.equal(white.state.version, (game.version || 0) + 1, 'resigning must advance the version');

  const black = resignChess(newChessState(), 'b');
  assert.equal(black.state.result, '1-0', 'black resigning is a white win');
}
{
  /* You cannot lose to someone who could never mate you. Resigning against a bare king is scored a
     draw, which mirrors the same rule on flag-fall — a nice piece of care that deserves a test. */
  const bare = pos(['k.......', '........', '........', '........', '........', '........', '.......P', 'K.......'], 'w');
  const out = resignChess(bare, 'w');
  assert.ok(out.ok);
  assert.equal(out.state.result, '1/2-1/2', 'resigning to a bare king must be a draw, not a loss');
  assert.match(String(out.state.reason), /no mating material/i);
}
{
  // A finished game cannot be resigned again, and neither can a nonsense colour.
  const done = { ...newChessState(), status: 'finished' };
  assert.equal(resignChess(done, 'w').ok, false, 'a finished game cannot be resigned');
  assert.equal(resignChess(newChessState(), 'x').ok, false, 'only w or b may resign');
  assert.equal(resignChess(null, 'w').ok, false, 'a missing game cannot be resigned');
}
{
  // Resignation settles ratings the same way any decisive result does.
  const resigned = resignChess(newChessState(), 'w');
  const { white, black } = settleChessRatings(player(1200), player(1200), resigned.state.result);
  assert.equal(white.rating, 1188, 'the resigning side loses rating');
  assert.equal(black.rating, 1212, 'the opponent gains it');
  assert.equal(white.losses, 1, 'a resignation is recorded as a loss');
}

console.log('dasha chess server: PASS (rating settlement, zero-sum, upsets, floor, counters, clock increment, flag-fall arithmetic, resignation outcomes)');
