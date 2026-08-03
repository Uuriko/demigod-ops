#!/usr/bin/env node
/** Mint intro receipt → local board JSON; CDN publish is explicit opt-in. */
import { spawnSync } from 'child_process';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
import { mintReceipt, computeSignal } from './demigod-board-lib.mjs';

function parseArgs(argv) {
  const out = { intros: 3, status: 'delivered', note: '', publish: false, noPublish: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--intros=')) out.intros = Number(a.slice(9)) || 3;
    else if (a.startsWith('--status=')) out.status = a.slice(9);
    else if (a.startsWith('--note=')) out.note = a.slice(7);
    else if (a === '--publish') out.publish = true;
    else if (a === '--no-publish') { out.publish = false; out.noPublish = true; }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const board = loadBoard();
  const receipt = mintReceipt(board, args);
  board.signal = computeSignal(board);
  // A delivered receipt is a real proof claim — the board write-guard refuses it unless BOTH this
  // allow-opt AND DEMIGOD_ALLOW_REAL_RECEIPTS=1 are set (env is the operator's deliberate authorization).
  // Without the opt, this tool could never mint even an authorized real receipt (regression after the
  // guard was corrected to key on status==='delivered'). Sample/demo receipts don't need either.
  try {
    saveBoard(board, { reason: 'receipt-mint', actor: process.env.USER || 'receipt-mint', allowRealReceipts: true });
  } catch (e) {
    if (e.code === 'REAL_RECEIPTS_REFUSED') {
      console.error('receipt-mint refused: set DEMIGOD_ALLOW_REAL_RECEIPTS=1 to mint a real delivered receipt.');
      process.exit(2);
    }
    throw e;
  }

  let publishNote = 'skipped';
  if (!args.noPublish && (args.publish || process.env.DEMIGOD_FORCE_PUBLISH === '1')) {
    const pub = spawnSync('node', ['demigod-board-publish.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 90_000 });
    publishNote = pub.status === 0 ? 'ok' : `failed:${pub.status}`;
  }

  const url = `https://www.trydemigod.com/#receipt/${receipt.hash}`;
  console.log(JSON.stringify({ ok: true, receipt, url, publish: publishNote }, null, 2));
}

main();
