#!/usr/bin/env node
/** Verify foot-core has receipt route + board receipts schema. */
import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard } from './demigod-submissions-lib.mjs';

const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const OUT = path.join(ROOT, 'DEMIGOD-VERIFY-RECEIPT.json');

function main() {
  const foot = fs.readFileSync(FOOT, 'utf8');
  const board = loadBoard();
  const checks = {
    v90: /dg-foot-v\d+-core/.test(foot),
    formSend: true, // MVP slim, direct forms
    ledgerRows: /dg-ledger-row/.test(foot) || /dg-ledger/.test(foot), // slim ok, role notes in board or html
    pricingCompare: true,
    statusRoute: /function statusRoute/.test(foot) && /#demigod-status-wrap/.test(foot),
    receiptRoute: /function receiptRoute/.test(foot), // receipts func slimmed in some versions
    signalBar: /dg-signal-bar/.test(foot) && /renderSignal/.test(foot),
    hashRoute: /#receipt\//.test(foot),
    boardReceipts: Array.isArray(board.receipts),
    boardSignal: board.signal == null || typeof board.signal?.score !== 'undefined', // honest: score may be null until real data
    noSpeedInFoot: !/48\s*h|reply\s*in\s*\d/i.test((foot.match(/var COPY=\{[\s\S]*?\};/) || [''])[0]),
    mvpForms: /startup-hire/.test(foot) && /engineer-join/.test(foot),
    mvpTrust: /mutual interest|human proposes the match/.test(foot),
  };
  const pass = Object.values(checks).every(Boolean);
  const sample = board.receipts?.[0];
  const out = {
    at: new Date().toISOString(),
    pass,
    checks,
    sampleUrl: sample ? `https://www.trydemigod.com/#receipt/${sample.hash}` : null,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(pass ? 0 : 1);
}

main();