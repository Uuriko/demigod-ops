#!/usr/bin/env node
/** Mint intro receipt → board JSON + publish CDN. */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
import { mintReceipt, computeSignal } from './demigod-board-lib.mjs';

function parseArgs(argv) {
  const out = { intros: 3, status: 'delivered', note: '', publish: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--intros=')) out.intros = Number(a.slice(9)) || 3;
    else if (a.startsWith('--status=')) out.status = a.slice(9);
    else if (a.startsWith('--note=')) out.note = a.slice(7);
    else if (a === '--no-publish') out.publish = false;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const board = loadBoard();
  const receipt = mintReceipt(board, args);
  board.signal = computeSignal(board);
  saveBoard(board, { reason: 'receipt-mint', actor: process.env.USER || 'receipt-mint' });

  let publishNote = 'skipped';
  if (args.publish) {
    const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 90_000 });
    publishNote = pub.status === 0 ? 'ok' : `failed:${pub.status}`;
  }

  const url = `https://www.trydemigod.com/#receipt/${receipt.hash}`;
  console.log(JSON.stringify({ ok: true, receipt, url, publish: publishNote }, null, 2));
}

main();