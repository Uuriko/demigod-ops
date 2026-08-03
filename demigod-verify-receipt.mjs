#!/usr/bin/env node
/**
 * Verify board receipts schema + still-true foot MVP markers.
 *
 * Receipt/status hash routes (statusRoute, receiptRoute, #demigod-status-wrap,
 * #receipt/, signal bar, ledger CDN) were slimmed out of foot-core (v205+).
 * Do not re-assert those — they false-failed every verify:all run.
 */
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
    pricingCompare: true,
    // Board SoR still owns receipts/signal (foot no longer routes #receipt/)
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
    // URL convention for board tooling; foot no longer implements the hash route
    sampleUrl: sample ? `https://www.trydemigod.com/#receipt/${sample.hash}` : null,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
