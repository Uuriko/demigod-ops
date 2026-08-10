import assert from 'node:assert/strict';
import {
  CHESS_CLOCK_MS,
  CHESS_INCREMENT_MS,
  canMate,
  legalMoves,
  isDeadPosition,
  newChessState,
  playMove,
  positionKey,
  publicChessGame,
  publicChessReplay,
  resignChess,
  settleChessRatings,
  squareIndex,
  squareName,
} from './dasha-chess.mjs';

let state = newChessState();
assert.equal(legalMoves(state).length, 20, 'initial position must have 20 legal moves');
function perft(position, depth) {
  if (!depth) return 1;
  return legalMoves(position).reduce((total, move) => {
    const result = playMove(position, { from: squareName(move.from), to: squareName(move.to), promotion: move.promotion });
    assert.equal(result.ok, true, 'every generated legal move must be playable');
    return total + perft(result.state, depth - 1);
  }, 0);
}
assert.deepEqual([1, 2, 3, 4].map(depth => perft(state, depth)), [20, 400, 8902, 197281], 'opening move tree must match canonical perft');
function fromFen(fen) {
  const [layout, turn, castling, enPassant, halfmove = '0', fullmove = '1'] = fen.split(' '), board = [];
  for (const rank of layout.split('/')) for (const token of rank) {
    if (/\d/.test(token)) board.push(...Array(Number(token)).fill('.')); else board.push(token);
  }
  return { board, turn, castling: castling === '-' ? '' : castling, enPassant: enPassant === '-' ? null : squareIndex(enPassant), halfmove: Number(halfmove), fullmove: Number(fullmove), moves: [], positions: {}, version: 0, status: 'active', result: null, reason: null };
}
for (const [fen, expected] of [
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486]],
]) assert.deepEqual([1, 2].map(depth => perft(fromFen(fen), depth)), expected, `adversarial perft mismatch: ${fen}`);
assert.equal(perft(fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'), 3), 97862, 'Kiwipete depth 3 must preserve castling, pins, and captures');
assert.equal(perft(fromFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'), 3), 2812, 'rook-and-pawn depth 3 must preserve checks, captures, and promotions');
function position(pieces, extra = {}) {
  const board = Array(64).fill('.');
  for (const [square, piece] of Object.entries(pieces)) board[squareIndex(square)] = piece;
  return { board, turn: 'w', castling: '', enPassant: null, halfmove: 0, fullmove: 1, moves: [], positions: {}, version: 0, status: 'active', result: null, reason: null, ...extra };
}
state = position({ e1: 'K', h1: 'R', a8: 'k', f8: 'r' }, { castling: 'K' });
assert.equal(legalMoves(state, squareIndex('e1')).some(move => squareName(move.to) === 'g1'), false, 'king cannot castle through an attacked square');
state = position({ e5: 'K', f5: 'P', h5: 'r', g5: 'p', a8: 'k' }, { enPassant: squareIndex('g6') });
assert.equal(legalMoves(state, squareIndex('f5')).some(move => squareName(move.to) === 'g6'), false, 'en passant cannot expose its own king');
state = newChessState();
for (const [from, to] of [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],['f1','b5']]) {
  const result = playMove(state, { from, to });
  assert.equal(result.ok, true, `${from}-${to} must be legal`);
  state = result.state;
}
assert.equal(state.turn, 'b');
assert.deepEqual(state.moves.map(move => move.san), ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
assert.equal(playMove(state, { from: 'e1', to: 'e2' }).ok, false, 'king cannot move onto its own pawn');

state = newChessState();
for (const [from, to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]) state = playMove(state, { from, to }).state;
assert.equal(state.status, 'finished');
assert.equal(state.result, '0-1');
assert.equal(state.reason, 'checkmate');
assert.equal(state.moves.at(-1).san, 'Qh4#');
const checkedGame = { id: 'mate', players: { w: { xId: '1', handle: 'white' }, b: { xId: '2', handle: 'black' } }, state, createdAt: 1, updatedAt: 1 };
assert.equal(publicChessGame(checkedGame, '1').check, true, 'public game must expose server-derived check state');

state = newChessState();
for (const [from, to] of [['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5'],['e5','d6']]) state = playMove(state, { from, to }).state;
assert.equal(state.board[squareIndex('d5')], '.', 'en-passant pawn must be removed');
assert.equal(state.board[squareIndex('d6')], 'P');
assert.equal(state.moves.at(-1).san, 'exd6');

state = playMove(newChessState(), { from: 'e2', to: 'e4' }).state;
assert.equal(positionKey(state).endsWith(' -'), true, 'irrelevant en-passant target must not split repetition identity');
state = newChessState();
for (const [from, to] of [['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5']]) state = playMove(state, { from, to }).state;
assert.equal(positionKey(state).endsWith(' d6'), true, 'legal en-passant target must remain in repetition identity');

state = newChessState();
for (const [from, to] of [['e2','e4'],['a7','a6'],['g1','f3'],['a6','a5'],['f1','e2'],['a5','a4'],['e1','g1']]) state = playMove(state, { from, to }).state;
assert.equal(state.board[squareIndex('g1')], 'K');
assert.equal(state.board[squareIndex('f1')], 'R');
assert.equal(state.moves.at(-1).san, 'O-O');

state = playMove(position({ a1: 'K', b1: 'N', f1: 'N', h8: 'k' }), { from: 'b1', to: 'd2' }).state;
assert.equal(state.moves.at(-1).san, 'Nbd2', 'ambiguous pieces must include the origin file');
state = playMove(position({ e1: 'K', a7: 'P', e8: 'k' }), { from: 'a7', to: 'a8', promotion: 'q' }).state;
assert.equal(state.moves.at(-1).san, 'a8=Q+', 'promotion and check must use standard algebraic notation');

state = newChessState();
for (const [from, to] of [...Array(2)].flatMap(() => [['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']])) state = playMove(state, { from, to }).state;
assert.equal(state.reason, 'threefold repetition', 'third occurrence must end the game without an arbiter flow');
state = playMove(position({ a1: 'K', h1: 'R', a8: 'k', h8: 'r' }, { halfmove: 99 }), { from: 'h1', to: 'g1' }).state;
assert.equal(state.reason, 'fifty-move rule', '100 halfmoves without pawn movement or capture must draw');
state = playMove(position({ e1: 'K', c1: 'B', e8: 'k' }), { from: 'c1', to: 'd2' }).state;
assert.equal(state.reason, 'insufficient material', 'king and bishop against king must draw');
assert.equal(isDeadPosition(position({ e1: 'K', e8: 'k' })), true, 'bare kings cannot produce mate');
assert.equal(isDeadPosition(position({ e1: 'K', a1: 'R', e8: 'k' })), false, 'rook material can produce mate');
assert.equal(canMate(position({ e1: 'K', a2: 'P', e8: 'k' }), 'b'), false, 'a bare king cannot win on time merely because the opponent has a pawn');
assert.equal(canMate(position({ e1: 'K', a2: 'P', e8: 'k', c8: 'b' }), 'b'), true, 'a minor piece can possibly mate when opposing material can block escape');
assert.equal(canMate(position({ e1: 'K', a1: 'R', e8: 'k', b8: 'n' }), 'b'), true, 'a lone knight can possibly mate when an opposing rook can block escape');
assert.equal(canMate(position({ e1: 'K', e8: 'k', b8: 'n', g8: 'n' }), 'b'), true, 'two knights can reach a mating position even though mate cannot be forced');
assert.equal(canMate(position({ e1: 'K', c1: 'B', e8: 'k', f8: 'b' }), 'w'), false, 'same-color bishop material cannot produce mate');
assert.equal(canMate(position({ e1: 'K', c1: 'B', e8: 'k', a8: 'q' }), 'w'), false, 'a lone bishop cannot mate merely because the opponent has a queen');
assert.equal(canMate(position({ e1: 'K', c1: 'B', e8: 'k', c8: 'b' }), 'w'), true, 'opposite-color bishops can produce a possible mating position');

const resigned = resignChess(newChessState(), 'w');
assert.equal(resigned.state.result, '0-1');
const bareKingResignation = resignChess(position({ e1: 'K', a2: 'P', e8: 'k' }), 'w');
assert.equal(bareKingResignation.state.result, '1/2-1/2', 'resignation is drawn when the opponent cannot possibly checkmate');
const ratings = settleChessRatings({ rating: 1200 }, { rating: 1200 }, '1-0');
assert.deepEqual([ratings.white.rating, ratings.black.rating], [1212, 1188]);
assert.deepEqual([ratings.white.wins, ratings.black.losses], [1, 1]);

const legacyReplay = publicChessReplay({
  id: 'legacy', players: { w: { handle: 'white' }, b: { handle: 'black' } },
  state: { status: 'finished', result: '1-0', reason: 'resignation', moves: [{ from: 'e2', to: 'e4', at: 1 }] }, updatedAt: 2,
});
assert.equal(legacyReplay.moves[0].san, 'e4', 'legacy replays must derive missing algebraic notation');
assert.equal(legacyReplay.frames[1].move.san, 'e4');
const undatedReplay = publicChessReplay({
  id: 'undated', players: { w: { handle: 'white' }, b: { handle: 'black' } },
  state: { status: 'finished', result: '1-0', reason: 'resignation', moves: [{ from: 'e2', to: 'e4' }] }, finishedAt: 123, updatedAt: 456,
});
assert.equal('at' in undatedReplay.moves[0], false, 'replay reconstruction must not invent a current timestamp for an undated legacy move');
assert.equal(undatedReplay.finishedAt, 123, 'undated legacy replay must retain its authoritative completion fallback');
assert.equal(publicChessReplay({ id: 'dated', players: { w: { handle: 'white' }, b: { handle: 'black' } }, state: { status: 'finished', result: '1/2-1/2', reason: 'resignation', moves: [] }, finishedAt: 1, updatedAt: 2 }).finishedAt, 1, 'replay completion time must survive later activity');

// Deterministic legal-game stress: generated moves must remain playable without mutating the
// previous state, and every terminal record must reconstruct to the exact board viewers receive.
let randomSeed = 0xd45a2026;
const random = limit => {
  randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
  return randomSeed % limit;
};
for (let gameNumber = 0; gameNumber < 8; gameNumber++) {
  state = newChessState();
  for (let ply = 0; ply < 80 && state.status === 'active'; ply++) {
    const moves = legalMoves(state);
    assert(moves.length, 'an active random position must have a legal continuation');
    const move = moves[random(moves.length)];
    const before = { board: state.board.join(''), turn: state.turn, version: state.version, moves: state.moves.length };
    const result = playMove(state, { from: squareName(move.from), to: squareName(move.to), promotion: move.promotion }, { now: gameNumber * 1000 + ply + 1 });
    assert.equal(result.ok, true, 'every randomly selected generated move must be accepted');
    assert.deepEqual({ board: state.board.join(''), turn: state.turn, version: state.version, moves: state.moves.length }, before, 'playing a move must not mutate the previous authoritative state');
    state = result.state;
    assert.equal(state.board.length, 64);
    assert.equal(state.board.filter(piece => piece === 'K').length, 1, 'white king must survive every legal sequence');
    assert.equal(state.board.filter(piece => piece === 'k').length, 1, 'black king must survive every legal sequence');
    assert.match(state.board.join(''), /^[prnbqkPRNBQK.]{64}$/);
    assert.match(state.castling, /^[KQkq]*$/);
    assert.equal(state.version, state.moves.length);
    assert.equal(state.fullmove, 1 + Math.floor(state.moves.length / 2));
    assert(state.halfmove >= 0);
    assert(state.moves.at(-1).san, 'every public move needs algebraic notation');
    assert((state.positions[positionKey(state)] || 0) >= 1, 'the current repetition identity must be counted');
  }
  if (state.status === 'active') state = resignChess(state, state.turn).state;
  const replay = publicChessReplay({
    id: `stress-${gameNumber}`,
    players: { w: { handle: 'white', rating: 1200 }, b: { handle: 'black', rating: 1200 } },
    state,
    finishedAt: 10_000 + gameNumber,
  });
  assert(replay, 'every terminal random game must produce a replay');
  assert.equal(replay.frames.length, state.moves.length + 1);
  assert.equal(replay.frames.at(-1).board, state.board.join(''), 'replay reconstruction must end on the authoritative board');
  assert.equal(replay.result, state.result);
  assert.equal(replay.reason, state.reason);
}

const clockNow = 1_000_000;
const clockGame = {
  id: 'clock-game',
  players: { w: { xId: '1', handle: 'dasha', rating: 1200 }, b: { xId: '2', handle: 'anna', rating: 1200 } },
  state: newChessState(),
  clock: { w: CHESS_CLOCK_MS, b: CHESS_CLOCK_MS, activeSince: clockNow - 2500 },
  createdAt: clockNow - 2500,
  updatedAt: clockNow - 2500,
};
const publicClock = publicChessGame(clockGame, '1', clockNow).clock;
assert.equal(publicClock.w, CHESS_CLOCK_MS - 2500, 'active clock must reflect server elapsed time');
assert.equal(publicClock.b, CHESS_CLOCK_MS);
assert.equal(publicClock.incrementMs, CHESS_INCREMENT_MS);

console.log('dasha-chess: PASS');
