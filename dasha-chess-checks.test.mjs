#!/usr/bin/env node
/**
 * Check, double check, and the rules about kings — the cases dasha-chess-rules.test.mjs does not
 * reach.
 *
 * That file covers castling, en passant, promotion, stalemate and pins. What is left is the family
 * of bugs that come from treating check as a flag rather than as a constraint on every move: a king
 * walking next to the other king, a double check answered by blocking one of the two lines, a
 * discovered check that the mover never notices because the piece that gives it did not move, and a
 * pawn that captures the square in front of it. Each of these is easy to get almost right, and none
 * of them shows up in a casual game.
 *
 * Positions are built directly, rank 8 first, so each case is exactly what it says.
 *
 *   node dasha-chess-checks.test.mjs
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const local = new URL('./dasha-chess.mjs', import.meta.url);
const url = existsSync(local) ? local : new URL('./.grok/worktrees/potter/dasha/dasha-chess.mjs', import.meta.url);
const { legalMoves, playMove, squareIndex, squareName, inCheck } = await import(url.href);

/** ranks[0] is rank 8. Uppercase = white. */
function pos(ranks, turn = 'w', castling = '-', enPassant = null) {
  assert.equal(ranks.length, 8);
  for (const r of ranks) assert.equal(r.length, 8, `bad rank: ${r}`);
  return {
    board: [...ranks.join('')], turn, castling, enPassant: enPassant ? squareIndex(enPassant) : null,
    halfmove: 0, fullmove: 1, moves: [], positions: {}, version: 0,
    status: 'active', result: null, reason: null,
  };
}
const targets = (state, from) => legalMoves(state, squareIndex(from)).map((m) => squareName(m.to)).sort();
const can = (state, from, to) => targets(state, from).includes(to);
const allMoves = (state) => {
  const out = [];
  for (let i = 0; i < 64; i++) for (const m of legalMoves(state, i)) out.push(`${squareName(i)}${squareName(m.to)}`);
  return out;
};

// ---- the two kings may never touch -------------------------------------------
{
  /* Kings on e1 and e3. White must not be able to step to d2/e2/f2 — every one of them is adjacent
     to the black king. An engine that tests "is this square attacked" using only piece move
     generation, and forgets the enemy king generates attacks too, allows all three. */
  const s = pos(['........', '........', '........', '........', '........', '........', '........', '........'], 'w');
  s.board[squareIndex('e1')] = 'K';
  s.board[squareIndex('e3')] = 'k';
  for (const square of ['d2', 'e2', 'f2']) {
    assert.ok(!can(s, 'e1', square), `the white king must not move to ${square}, adjacent to the black king`);
  }
  assert.ok(can(s, 'e1', 'd1') && can(s, 'e1', 'f1'), 'the king may still move along the back rank');
}
{
  // The same rule from the other side, so this is not passing by accident of colour.
  const s = pos(['........', '........', '........', '........', '........', '........', '........', '........'], 'b');
  s.board[squareIndex('e1')] = 'K';
  s.board[squareIndex('e3')] = 'k';
  for (const square of ['d2', 'e2', 'f2']) {
    assert.ok(!can(s, 'e3', square), `the black king must not move to ${square}, adjacent to the white king`);
  }
}

// ---- a king may not capture a defended piece ---------------------------------
{
  /* Black knight on d2 is defended by the rook on d8. The white king on e1 may not take it, even
     though the knight is adjacent and capturable. */
  const s = pos(['...r....', '........', '........', '........', '........', '........', '........', '........'], 'w');
  s.board[squareIndex('e1')] = 'K';
  s.board[squareIndex('d2')] = 'n';
  s.board[squareIndex('h8')] = 'k';
  assert.ok(!can(s, 'e1', 'd2'), 'the king must not capture a defended piece');
}

// ---- check must be answered ---------------------------------------------------
{
  /* Black rook on e8 checks the white king on e1. Only three answers exist: move the king off the
     e-file, block on the e-file, or capture the rook. Anything else must be illegal — including
     moves by pieces that have nothing to do with the check. */
  const s = pos(['....r...', '........', '........', '........', '........', '........', '........', '....K...'], 'w');
  /* The blocker goes on a2, not a1: e1 is the king's own square, so the only blocking squares are
     e2 through e7. A rook on the back rank has nowhere useful to go. */
  s.board[squareIndex('a2')] = 'R';
  s.board[squareIndex('h8')] = 'k';
  assert.ok(inCheck(s, 'w'), 'the position must actually be check');
  const moves = allMoves(s);
  assert.ok(moves.length > 0, 'check with a legal answer is not mate');
  assert.ok(!moves.includes('a2a3'), 'an unrelated piece must not move while the king is in check');
  assert.ok(moves.includes('a2e2'), 'blocking the check on e2 must be legal');
  for (const move of moves) {
    const next = playMove({ ...s, board: [...s.board] }, { from: move.slice(0, 2), to: move.slice(2) });
    assert.ok(next.ok, `${move} was offered as legal but was refused`);
    assert.ok(!inCheck(next.state, 'w'), `${move} was offered as legal but leaves white in check`);
  }
}

// ---- double check: only the king may move -------------------------------------
{
  /* Rook on e8 down the file and bishop on a5 along the diagonal both hit e1. Blocking one line
     leaves the other, so no block and no capture can save it — the king must move. This is the
     case an engine gets wrong when it answers check by asking "can anything reach the checking
     square", which is a correct question only when there is exactly one checker. */
  const s = pos(['....r...', '........', '........', 'b.......', '........', '........', '........', '....K...'], 'w');
  s.board[squareIndex('h8')] = 'k';
  s.board[squareIndex('h1')] = 'R';   // could block on e1 if there were only one checker
  assert.ok(inCheck(s, 'w'), 'the position must be check');
  const moves = allMoves(s);
  assert.ok(moves.length > 0, 'the king has squares, so this is not mate');
  for (const move of moves) {
    assert.equal(move.slice(0, 2), 'e1', `only the king may move in double check, got ${move}`);
  }
  assert.ok(!moves.includes('h1e1'), 'blocking one of two checking lines must not be legal');
}

// ---- a discovered check is a real check ----------------------------------------
{
  /* White rook on e1, white knight on e4, black king on e8. Moving the knight off the e-file
     discovers the rook's check. The knight never touches the king, so an engine that only asks
     whether the moved piece attacks the king will not see it — and will let black reply with
     something that leaves the king in check. */
  const s = pos(['....k...', '........', '........', '........', '....N...', '........', '........', '....R...'], 'w');
  s.board[squareIndex('a1')] = 'K';
  const played = playMove({ ...s, board: [...s.board] }, { from: 'e4', to: 'd6' });
  assert.ok(played.ok, 'the knight move is legal');
  assert.ok(inCheck(played.state, 'b'), 'moving the knight must discover check from the rook');
  assert.ok(played.state.moves.at(-1).check, 'the move record must mark it as check');

  /* And black must answer it: no black move may leave the king on the e-file in check. */
  for (const move of allMoves(played.state)) {
    const next = playMove({ ...played.state, board: [...played.state.board] }, { from: move.slice(0, 2), to: move.slice(2) });
    assert.ok(next.ok && !inCheck(next.state, 'b'), `${move} leaves black in check but was offered`);
  }
}

// ---- pawns ----------------------------------------------------------------------
{
  // A pawn may not capture the square directly in front of it, occupied or not.
  const s = pos(['....k...', '........', '........', '........', '........', '....n...', '....P...', '....K...'], 'w');
  assert.ok(!can(s, 'e2', 'e3'), 'a pawn must not advance onto an occupied square');
  assert.deepEqual(targets(s, 'e2'), [], 'a blocked pawn with nothing to capture has no moves');
}
{
  // Blocked on the first square, the two-square opening push is also unavailable.
  const s = pos(['....k...', '........', '........', '........', '........', '....n...', '....P...', '....K...'], 'w');
  assert.ok(!can(s, 'e2', 'e4'), 'a pawn must not jump over a piece on its first move');
}
{
  /* Diagonal capture is available, and only where there is something to take. The kings sit in the
     corners here on purpose: knights on d3 and f3 both attack e1, so a king there would be in double
     check and the pawn would correctly have no moves at all — which says nothing about pawns. */
  const s = pos(['.......k', '........', '........', '........', '........', '...n.n..', '....P...', 'K.......'], 'w');
  assert.deepEqual(targets(s, 'e2'), ['d3', 'e3', 'e4', 'f3'], 'a pawn captures diagonally and advances forward');
}

// ---- SAN must disambiguate --------------------------------------------------------
{
  /* Two knights on b1 and d1 can both reach c3. SAN that reads "Nc3" is ambiguous, and a game
     record that cannot be replayed unambiguously is not a game record. */
  const s = pos(['....k...', '........', '........', '........', '........', '........', '........', '.N.NK...'], 'w');
  const played = playMove({ ...s, board: [...s.board] }, { from: 'b1', to: 'c3' });
  assert.ok(played.ok, 'the knight move is legal');
  const san = played.state.moves.at(-1).san;
  assert.match(san, /^N[bd1]?c3$/, `SAN must disambiguate two knights reaching c3, got ${san}`);
  assert.notEqual(san, 'Nc3', 'bare Nc3 is ambiguous when both knights can reach it');
}

console.log('dasha chess checks: PASS (kings never adjacent, no capturing a defended piece, check must be answered, double check is king-only, discovered check counts, pawn blocking and capture, SAN disambiguation)');
