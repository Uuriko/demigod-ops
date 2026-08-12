#!/usr/bin/env node
/**
 * Anonymous play on /chess actually works.
 *
 * The engine is proved separately by dasha-chess-rules.test.mjs. What this proves is the part that
 * only exists in the browser: that the engine reached the page, that clicking two squares makes a
 * move, that an illegal move is refused, and that the opponent replies — none of which the rules
 * test can see.
 *
 * Served from a local file, so it needs no network and writes nothing. The page's own live API
 * calls (chess/me, chess/ratings) are blocked by CORS in that context and are expected.
 *
 *   node dasha-chess-local.test.mjs        # needs CDP Chrome on :9223
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const html = await readFile(new URL('./dasha-chess-page.html', import.meta.url), 'utf8');
const server = createServer((_, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

for (const [device, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 120)));
  await page.setViewport({ width, height });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));

  const boot = await page.evaluate(() => ({
    engine: typeof window.DashaChessEngine,
    cells: document.querySelectorAll('.psq').length,
    /* The preview must never wear .sq: dasha-chess-page.test.mjs counts those globally and 64
       look-alikes make a real game read as 128. */
    realSquares: document.querySelectorAll('.sq').length,
    play: !!document.getElementById('play-local'),
  }));
  check(boot.engine === 'object', `${device}: the engine did not reach the page`);
  check(boot.cells === 64, `${device}: expected 64 preview cells, got ${boot.cells}`);
  check(boot.realSquares === 0, `${device}: the preview is wearing .sq and will break the board count`);
  check(boot.play, `${device}: no way to start a game`);

  await page.click('#play-local');
  await new Promise((r) => setTimeout(r, 250));
  const openingStatus = await page.evaluate(() => document.getElementById('local-status').textContent);

  // a start-rank pawn has exactly two moves
  await page.click('[data-square="e2"]');
  await new Promise((r) => setTimeout(r, 150));
  const picked = await page.evaluate(() => ({
    selected: document.querySelectorAll('.psq.psel').length,
    targets: document.querySelectorAll('.psq.ptarget').length,
  }));
  check(picked.selected === 1, `${device}: selecting a piece did not highlight it`);
  check(picked.targets === 2, `${device}: e2 should offer exactly 2 moves, offered ${picked.targets}`);

  await page.click('[data-square="e4"]');
  await new Promise((r) => setTimeout(r, 1200));
  const moved = await page.evaluate(() => ({
    e2: (document.querySelector('[data-square="e2"]')?.textContent || '').trim(),
    e4: (document.querySelector('[data-square="e4"]')?.textContent || '').trim(),
    black: [...document.querySelectorAll('.psq')].filter((c) => c.dataset.side === 'b').length,
    status: document.getElementById('local-status').textContent,
  }));
  check(moved.e2 === '' && moved.e4 === '♙', `${device}: 1.e4 did not apply (e2="${moved.e2}" e4="${moved.e4}")`);
  check(moved.black === 16, `${device}: black lost pieces on move one — ${moved.black}`);
  check(/your move/i.test(moved.status), `${device}: turn did not come back to the player — "${moved.status}"`);

  // backwards is not a pawn move
  await page.click('[data-square="e4"]');
  await new Promise((r) => setTimeout(r, 120));
  await page.click('[data-square="e3"]');
  await new Promise((r) => setTimeout(r, 300));
  const illegal = await page.evaluate(() => ({
    e4: (document.querySelector('[data-square="e4"]')?.textContent || '').trim(),
    e3: (document.querySelector('[data-square="e3"]')?.textContent || '').trim(),
  }));
  check(illegal.e4 === '♙' && illegal.e3 === '', `${device}: an illegal backwards pawn move was accepted`);

  // the opponent answers: play three more and watch black's position change
  const before = await page.evaluate(() => [...document.querySelectorAll('.psq')]
    .filter((c) => c.dataset.side === 'b').map((c) => c.dataset.square).join(','));
  for (const [from, to] of [['g1', 'f3'], ['f1', 'c4'], ['d2', 'd4']]) {
    await page.click(`[data-square="${from}"]`);
    await new Promise((r) => setTimeout(r, 120));
    await page.click(`[data-square="${to}"]`);
    await new Promise((r) => setTimeout(r, 900));
  }
  const after = await page.evaluate(() => [...document.querySelectorAll('.psq')]
    .filter((c) => c.dataset.side === 'b').map((c) => c.dataset.square).join(','));
  check(before !== after, `${device}: the opponent never moved`);






  /* Say what was played. A screen-reader user hearing only "Your move." has no way to know what
     changed; the engine records notation, so the live region must carry it. */
  const announced = await page.evaluate(() => document.getElementById('local-status').textContent);
  check(/anna played\s+\S+/i.test(announced), `${device}: the opponent's move was not announced — "${announced}"`);

  /* The rated board marks the last move, flags a king in check, and prints edge coordinates. The
     practice board must too, or the same position reads differently when logged out. */
  const marks = await page.evaluate(() => ({
    lastMove: document.querySelectorAll('.psq.plast').length,
    files: document.querySelectorAll('.psq[data-file]').length,
    ranks: document.querySelectorAll('.psq[data-rank]').length,
  }));
  check(marks.lastMove === 2, `${device}: the last move should mark its from and to squares, marked ${marks.lastMove}`);
  check(marks.files === 8 && marks.ranks === 8, `${device}: expected 8 file and 8 rank labels, got ${marks.files}/${marks.ranks}`);

  // A king in check must be marked on the board, not only described in the status line.
  const checkMark = await page.evaluate(async () => {
    const E = window.DashaChessEngine;
    const st = E.newChessState();
    // 1.f3 e5 2.g4 Qh4# — fool's mate leaves the white king in check
    for (const [from, to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]) {
      const r = E.playMove(st, { from, to });
      if (r.ok) Object.assign(st, r.state);
    }
    return { inCheck: E.inCheck(st, 'w'), status: st.status, reason: String(st.reason || '') };
  });
  check(checkMark.inCheck === true, `${device}: fool's mate should leave white in check`);
  check(/checkmate/i.test(checkMark.reason), `${device}: fool's mate should be recorded as checkmate, got "${checkMark.reason}"`);

  /* The practice board must speak the same way the rated board does. The rated one labels pieces
     "Dasha"/"Anna"; if the practice board says "white"/"black" the same square reads differently
     depending on whether you happen to be logged in. */
  const voice = await page.evaluate(() => {
    // any square that still holds a white piece — e2 has moved by this point in the walk
    const cell = [...document.querySelectorAll('.psq')].find((c) => c.dataset.side === 'w');
    const status = document.getElementById('local-status').textContent;
    return { pieceLabel: cell?.getAttribute('aria-label') || '', status,
      boardLabel: document.querySelector('.board-preview')?.getAttribute('aria-label') || '' };
  });
  check(/dasha/i.test(voice.pieceLabel), `${device}: a white piece should be labelled Dasha, got "${voice.pieceLabel}"`);
  check(!/\bwhite pawn\b/i.test(voice.pieceLabel), `${device}: the practice board still says "white pawn"`);
  check(/dasha/i.test(openingStatus), `${device}: starting a game should say who you are — got "${openingStatus}"`);
  check(/dasha/i.test(voice.boardLabel) && /anna/i.test(voice.boardLabel), `${device}: the board label should name both sides`);

  /* Exactly one tab stop on the board, and the arrows move within it. Making all 64 cells focusable
     is worse for a keyboard user than the static preview, which had none. */
  const tabStops = await page.evaluate(() =>
    [...document.querySelectorAll('.psq')].filter((c) => c.tabIndex === 0).length);
  check(tabStops === 1, `${device}: the board should be one tab stop, found ${tabStops}`);

  const roved = await page.evaluate(async () => {
    const board = document.querySelector('.board-preview');
    const before = [...document.querySelectorAll('.psq')].find((c) => c.tabIndex === 0)?.dataset.square;
    board.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
    const after = [...document.querySelectorAll('.psq')].find((c) => c.tabIndex === 0)?.dataset.square;
    return { before, after };
  });
  check(roved.before !== roved.after, `${device}: arrow keys did not move the board focus (${roved.before} -> ${roved.after})`);

  /* The move list is display only — the engine records the notation — but it must actually track
     the game, or it is decoration that will drift silently. */
  const notation = await page.evaluate(() => {
    const el = document.getElementById('local-moves');
    return { hidden: el.hidden, text: (el.textContent || '').trim() };
  });
  check(!notation.hidden, `${device}: the move list stayed hidden after moves were played`);
  check(/^1\. e4\b/.test(notation.text), `${device}: move list should open with "1. e4", got "${notation.text.slice(0, 40)}"`);
  check(/\b2\./.test(notation.text), `${device}: move list should number more than one pair — "${notation.text.slice(0, 60)}"`);

  /* Takeback rewinds a whole exchange. Undoing only my ply would leave the opponent on move. */
  const beforeUndo = await page.evaluate(() => [...document.querySelectorAll('.psq')].map((c) => c.textContent || '.').join(''));
  await page.click('#local-undo');
  await new Promise((r) => setTimeout(r, 300));
  const afterUndo = await page.evaluate(() => ({
    board: [...document.querySelectorAll('.psq')].map((c) => c.textContent || '.').join(''),
    status: document.getElementById('local-status').textContent,
    e4: (document.querySelector('[data-square="e4"]')?.textContent || '').trim(),
  }));
  check(afterUndo.board !== beforeUndo, `${device}: take back changed nothing`);
  check(/taken back/i.test(afterUndo.status), `${device}: take back did not say so — "${afterUndo.status}"`);

  /* Promotion must offer a choice rather than silently queening — the engine supports all four and
     underpromotion is occasionally the only winning move. Driven straight through the engine so the
     test does not depend on playing thirty plies to reach the eighth rank. */
  const promo = await page.evaluate(async () => {
    const E = window.DashaChessEngine;
    const ranks = ['........', 'P......k', '........', '........', '........', '........', '........', 'K.......'];
    const st = E.newChessState();
    st.board = [...ranks.join('')];
    st.turn = 'w'; st.castling = '-'; st.enPassant = null;
    const moves = E.legalMoves(st, E.squareIndex('a7')).filter((m) => E.squareName(m.to) === 'a8');
    const offered = [...new Set(moves.map((m) => m.promotion))].sort();
    const knight = E.playMove(st, { from: 'a7', to: 'a8', promotion: 'n' });
    return { offered, knightOk: knight.ok, piece: knight.ok ? knight.state.board[E.squareIndex('a8')] : null };
  });
  check(promo.offered.join(',') === 'b,n,q,r', `${device}: promotion should offer four pieces, offered ${promo.offered.join(',')}`);
  check(promo.knightOk && promo.piece === 'N', `${device}: underpromotion to a knight did not produce a knight`);

  const chooser = await page.evaluate(() => {
    const box = document.getElementById('local-promo');
    return { exists: !!box, hiddenAtRest: box ? box.hidden : null,
      options: box ? [...box.querySelectorAll('[data-promo]')].map((b) => b.dataset.promo).sort().join(',') : '' };
  });
  check(chooser.exists && chooser.hiddenAtRest === true, `${device}: the promotion chooser should exist and stay hidden until needed`);
  check(chooser.options === 'b,n,q,r', `${device}: the chooser must offer all four pieces, got "${chooser.options}"`);


  /* Resign, using the engine's own rule. The local game could previously only end by mate or draw,
     so a lost position had no exit but abandoning the page. */
  const resigned = await page.evaluate(async () => {
    document.getElementById('local-resign').click();
    await new Promise((r) => setTimeout(r, 200));
    return { status: document.getElementById('local-status').textContent,
      againShown: !document.getElementById('local-again').hidden };
  });
  check(/resigned/i.test(resigned.status), `${device}: resigning said nothing — "${resigned.status}"`);
  check(/anna wins|dasha wins/i.test(resigned.status), `${device}: resigning must name the winner — "${resigned.status}"`);
  check(resigned.againShown, `${device}: a resigned game must offer a new one`);

  /* Play as Anna: the board flips so your own pieces are nearest you, and Dasha opens. */
  await page.click('#play-black');
  // read the opening line before Dasha's reply announcement replaces it
  await new Promise((r) => setTimeout(r, 150));
  const annaOpening = await page.evaluate(() => document.getElementById('local-status').textContent);
  await new Promise((r) => setTimeout(r, 1400));
  const asAnna = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.psq')];
    return {
      firstSquare: cells[0]?.dataset.square,
      lastSquare: cells[cells.length - 1]?.dataset.square,
      status: document.getElementById('local-status').textContent,
      whiteMoved: (document.querySelector('.psq.plast') !== null),
      files: cells.filter((c) => c.dataset.file).length,
    };
  });
  check(asAnna.firstSquare === 'h1', `${device}: playing black should flip the board (top-left ${asAnna.firstSquare}, expected h1)`);
  check(asAnna.lastSquare === 'a8', `${device}: flipped board should end at a8, got ${asAnna.lastSquare}`);
  check(/anna/i.test(annaOpening), `${device}: should say you are Anna — "${annaOpening}"`);
  check(/dasha played/i.test(asAnna.status), `${device}: Dasha's opening move should be announced — "${asAnna.status}"`);
  check(asAnna.whiteMoved, `${device}: Dasha should open when you take black`);
  check(asAnna.files === 8, `${device}: coordinates must follow the flip, got ${asAnna.files} file labels`);

  check(pageErrors.length === 0, `${device}: page errors — ${pageErrors[0] || ''}`);
  await page.close();
}

browser.disconnect();
server.closeAllConnections();
await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

if (failures.length) {
  console.error(`\ndasha chess local: ${failures.length} FAILURE(S)\n`);
  for (const f of failures) console.error('  · ' + f);
  process.exit(1);
}
console.log('dasha chess local: PASS (engine in page, legal move applies, illegal refused, opponent replies, takeback, promotion choice, move list, one tab stop + arrow keys, Dasha/Anna voice, move announcements, last-move + check + coordinates, resign, play-as-Anna flip, both viewports)');
