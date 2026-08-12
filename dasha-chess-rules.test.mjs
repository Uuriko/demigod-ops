#!/usr/bin/env node
/**
 * Chess rules, at the places engines actually get them wrong.
 *
 * dasha-chess.test.mjs already covers the happy path. This covers the edge cases that are easy to
 * implement almost-correctly and that no casual game will surface: the queenside-castling b-file
 * exception, castling through or out of check, en passant expiring after one move, an en passant
 * capture that would expose its own king, underpromotion, stalemate vs checkmate, and pins.
 *
 * Positions are built directly — the state is a plain object — so each case is exact rather than
 * reached by a move sequence that might not mean what it looks like.
 *
 *   node dasha-chess-rules.test.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const local = new URL('./dasha-chess.mjs', import.meta.url);
const url = existsSync(local) ? local : new URL('./.grok/worktrees/potter/dasha/dasha-chess.mjs', import.meta.url);
const F = await import(url.href);
const { legalMoves, playMove, squareIndex, squareName, newChessState } = F;
const F_newState = newChessState;

/** ranks[0] is rank 8. Uppercase = white. */
function pos(ranks, turn = 'w', castling = '-', enPassant = null) {
  assert.equal(ranks.length, 8);
  for (const r of ranks) assert.equal(r.length, 8, `bad rank: ${r}`);
  const state = {
    board: [...ranks.join('')], turn, castling, enPassant: enPassant ? squareIndex(enPassant) : null,
    halfmove: 0, fullmove: 1, moves: [], positions: {}, version: 0,
    status: 'active', result: null, reason: null,
  };
  return state;
}
const targets = (state, from) => legalMoves(state, squareIndex(from)).map((m) => squareName(m.to)).sort();
const can = (state, from, to) => targets(state, from).includes(to);

// ---- castling ---------------------------------------------------------------
{
  // Black rook on f8 attacks f1: the king would pass THROUGH check. Illegal.
  const s = pos(['....k...', '........', '........', '........', '........', '........', '........', '....K..R'], 'w', 'K');
  s.board[squareIndex('f8')] = 'r';
  assert.ok(!can(s, 'e1', 'g1'), 'castling through an attacked square must be illegal');
}
{
  // Black rook on e8 gives check: castling out of check is illegal.
  const s = pos(['....r...', '........', '........', '........', '........', '........', '........', '....K..R'], 'w', 'K');
  assert.ok(!can(s, 'e1', 'g1'), 'castling out of check must be illegal');
}
{
  // Black rook on g8 attacks the destination. Illegal.
  const s = pos(['......r.', '........', '........', '........', '........', '........', '........', '....K..R'], 'w', 'K');
  assert.ok(!can(s, 'e1', 'g1'), 'castling into check must be illegal');
}
{
  /* THE classic. Queenside: the king travels e1→c1, so only e1, d1 and c1 must be safe. b1 is
     crossed by the ROOK, not the king, and an attack on b1 does NOT forbid O-O-O. Engines that
     check every square between king and rook wrongly reject this. */
  const s = pos(['........', '........', '........', '........', '........', '........', '........', 'R...K...'], 'w', 'Q');
  s.board[squareIndex('b8')] = 'r'; // attacks b1 only
  assert.ok(can(s, 'e1', 'c1'), 'queenside castling must be legal when only b1 is attacked');
}
{
  // Same shape, but d1 attacked — genuinely illegal.
  const s = pos(['........', '........', '........', '........', '........', '........', '........', 'R...K...'], 'w', 'Q');
  s.board[squareIndex('d8')] = 'r';
  assert.ok(!can(s, 'e1', 'c1'), 'queenside castling must be illegal when d1 is attacked');
}
{
  // Blocked by an occupied b1 — the rook cannot pass through a piece.
  const s = pos(['........', '........', '........', '........', '........', '........', '........', 'RN..K...'], 'w', 'Q');
  assert.ok(!can(s, 'e1', 'c1'), 'queenside castling must be illegal when b1 is occupied');
}

// ---- en passant -------------------------------------------------------------
{
  // Black just played d7-d5; white pawn on e5 may take en passant this move only.
  const s = pos(['....k...', '........', '........', '...pP...', '........', '........', '........', '....K...'], 'w', '-', 'd6');
  assert.ok(can(s, 'e5', 'd6'), 'en passant must be available immediately after a double push');
}
{
  // Same position without the enPassant square set: the chance has expired.
  const s = pos(['....k...', '........', '........', '...pP...', '........', '........', '........', '....K...'], 'w', '-', null);
  assert.ok(!can(s, 'e5', 'd6'), 'en passant must expire after one move');
}
{
  /* The famous one. White K e5, white pawn f5, black pawn g5 (just double-pushed), black rook h5.
     fxg6 e.p. removes BOTH the white pawn from f5 and the black pawn from g5 off the fifth rank,
     exposing the white king to the rook along the rank. The capture is therefore illegal, and an
     engine that only tests the destination square misses it. */
  const s = pos(['....k...', '........', '........', 'K....Ppr', '........', '........', '........', '........'], 'w', '-', 'g6');
  assert.ok(!can(s, 'f5', 'g6'),
    'en passant that exposes its own king along the rank must be illegal');
}

// ---- promotion --------------------------------------------------------------
{
  const s = pos(['........', 'P......k', '........', '........', '........', '........', '........', 'K.......'], 'w');
  const moves = legalMoves(s, squareIndex('a7')).filter((m) => squareName(m.to) === 'a8');
  assert.deepEqual([...new Set(moves.map((m) => m.promotion))].sort(), ['b', 'n', 'q', 'r'],
    'a pawn reaching the last rank must offer all four promotions');
  const under = playMove(s, { from: 'a7', to: 'a8', promotion: 'n' });
  assert.ok(under.ok, `underpromotion to a knight must be allowed: ${under.error || ''}`);
  assert.equal(under.state.board[squareIndex('a8')], 'N', 'underpromotion must place a knight');
}

// ---- mate, stalemate, pins --------------------------------------------------
{
  // Black king a8, white queen b6, white king c6: stalemate, not mate.
  const s = pos(['k.......', '........', '.QK.....', '........', '........', '........', '........', '........'], 'b');
  assert.equal(legalMoves(s).length, 0, 'the stalemate position must have no legal moves');
  const after = playMove(pos(['k.......', '........', '.Q......', '..K.....', '........', '........', '........', '........'], 'w'),
    { from: 'c5', to: 'c6' });
  assert.ok(after.ok, 'setup move should be legal');
  assert.equal(after.state.status, 'finished', 'stalemate must end the game');
  assert.equal(after.state.result, '1/2-1/2', `stalemate must be a draw, got ${after.state.result}`);
  assert.match(String(after.state.reason), /stalemate/i, `reason should say stalemate, got ${after.state.reason}`);
}
{
  // Back-rank mate: black king g8 boxed by its own pawns, white rook delivers on e8.
  const s = pos(['....R.k.', '.....ppp', '........', '........', '........', '........', '........', 'K.......'], 'b');
  assert.equal(legalMoves(s).length, 0, 'back-rank mate must leave no legal moves');
}
{
  // The knight on e2 is pinned by the rook on e8; it cannot move.
  const s = pos(['....r...', '........', '........', '........', '........', '........', '....N...', '....K...'], 'w');
  assert.deepEqual(targets(s, 'e2'), [], 'a pinned piece must have no legal moves');
}

// ---- the opening position is sane ------------------------------------------
{
  const s = newChessState();
  assert.equal(legalMoves(s).length, 20, 'the start position must have exactly 20 legal moves');
  const e4 = playMove(s, { from: 'e2', to: 'e4' });
  assert.ok(e4.ok, '1.e4 must be legal');
  assert.equal(legalMoves(e4.state).length, 20, 'black must also have 20 replies after 1.e4');
}


// ---- draw conditions -------------------------------------------------------
{
  // Threefold: shuffle both kings back and forth until the start position recurs three times.
  let s2 = F_newState();
  const shuffle = [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']];
  let reps = 0;
  for (let cycle = 0; cycle < 3 && s2.status === 'active'; cycle++) {
    for (const [from, to] of shuffle) {
      const r = F.playMove(s2, { from, to });
      if (!r.ok) break;
      s2 = r.state;
      if (s2.status !== 'active') break;
    }
    reps++;
  }
  assert.equal(s2.status, 'finished', `threefold repetition must end the game (stopped after ${reps} cycles, status ${s2.status})`);
  assert.equal(s2.result, '1/2-1/2', 'threefold repetition is a draw');
  assert.match(String(s2.reason), /repetition|threefold/i, `reason should name repetition, got ${s2.reason}`);
}
{
  // Fifty-move: halfmove clock at 99, one more quiet move must end it.
  const s2 = pos(['k.......', '........', '........', '........', '........', '........', '........', 'K......R'], 'w');
  s2.halfmove = 99;
  const r = F.playMove(s2, { from: 'h1', to: 'h2' });
  assert.ok(r.ok, 'the quiet move itself is legal');
  assert.equal(r.state.status, 'finished', 'the fifty-move rule must end the game');
  assert.equal(r.state.result, '1/2-1/2', 'the fifty-move rule is a draw');
}
{
  // The halfmove clock resets on a pawn move and on a capture.
  const s2 = pos(['k.......', '........', '........', '........', '........', '........', 'P.......', 'K......R'], 'w');
  s2.halfmove = 40;
  const pawn = F.playMove(s2, { from: 'a2', to: 'a3' });
  assert.ok(pawn.ok);
  assert.equal(pawn.state.halfmove, 0, 'a pawn move must reset the fifty-move clock');

  const cap = pos(['k.......', '........', '........', '........', '........', '........', '.......r', 'K......R'], 'w');
  cap.halfmove = 40;
  const took = F.playMove(cap, { from: 'h1', to: 'h2' });
  assert.ok(took.ok, 'the capture is legal');
  assert.equal(took.state.halfmove, 0, 'a capture must reset the fifty-move clock');
}
{
  // Insufficient material: bare kings, and king+bishop against a bare king.
  assert.ok(F.isDeadPosition(pos(['k.......', '........', '........', '........', '........', '........', '........', 'K.......'], 'w')),
    'king against king is a dead position');
  assert.ok(F.isDeadPosition(pos(['k.......', '........', '........', '........', '........', '........', '........', 'K.....B.'], 'w')),
    'king and bishop against king is a dead position');
  assert.ok(F.isDeadPosition(pos(['k.......', '........', '........', '........', '........', '........', '........', 'K.....N.'], 'w')),
    'king and knight against king is a dead position');
  assert.ok(!F.isDeadPosition(pos(['k.......', '........', '........', '........', '........', '........', '........', 'K....R..'], 'w')),
    'king and rook against king can still mate — not a dead position');
  assert.ok(!F.isDeadPosition(pos(['k.......', '.......p', '........', '........', '........', '........', '........', 'K.......'], 'w')),
    'a pawn can promote — not a dead position');
}

// ---- castling rights are lost, and stay lost -------------------------------
{
  const moveKing = pos(['....k...', '........', '........', '........', '........', '........', '........', 'R...K..R'], 'w', 'KQkq');
  const afterKing = F.playMove(moveKing, { from: 'e1', to: 'e2' });
  assert.ok(afterKing.ok);
  assert.ok(!/[KQ]/.test(afterKing.state.castling), `moving the king must drop both white rights, got "${afterKing.state.castling}"`);

  const moveRook = pos(['....k...', '........', '........', '........', '........', '........', '........', 'R...K..R'], 'w', 'KQkq');
  const afterRook = F.playMove(moveRook, { from: 'h1', to: 'h2' });
  assert.ok(afterRook.ok);
  assert.ok(!afterRook.state.castling.includes('K'), 'moving the h1 rook must drop kingside rights');
  assert.ok(afterRook.state.castling.includes('Q'), 'moving the h1 rook must NOT drop queenside rights');

  /* Capturing a rook on its home square removes that side's right too — the classic omission,
     because the right belongs to a rook that no longer exists. */
  const takeRook = pos(['....k...', '........', '........', '........', '........', '........', '.......q', 'R...K..R'], 'b', 'KQkq');
  const captured = F.playMove(takeRook, { from: 'h2', to: 'h1' });
  assert.ok(captured.ok, 'the rook capture is legal');
  assert.ok(!captured.state.castling.includes('K'),
    `capturing the h1 rook must remove white kingside rights, got "${captured.state.castling}"`);
}

// ---- promotion by capture ---------------------------------------------------
{
  const s2 = pos(['.r....k.', 'P.......', '........', '........', '........', '........', '........', 'K.......'], 'w');
  const promo = F.playMove(s2, { from: 'a7', to: 'b8', promotion: 'q' });
  assert.ok(promo.ok, `a capture that promotes must be legal: ${promo.error || ''}`);
  assert.equal(promo.state.board[F.squareIndex('b8')], 'Q', 'the captured square must hold the new queen');
  assert.equal(promo.state.board[F.squareIndex('a7')], '.', 'the pawn must leave its square');
}

console.log('dasha chess rules: PASS (castling exceptions + rights, en passant expiry + discovered check, promotion, draws by repetition/fifty-move/material, stalemate, pins)');
