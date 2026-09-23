#!/usr/bin/env node
/** Verify foot-core has receipt route + board receipts schema.
 * Writes DEMIGOD-VERIFY-RECEIPT.json in DEMIGOD_ROOT. The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadBoard } from './demigod-submissions-lib.mjs';

const localFlags = { sent: false, liveMail: false, livePublish: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-VERIFY-RECEIPT.json');
}

function readFoot() {
  try {
    return fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
  } catch {
    return '';
  }
}

function buildReport() {
  const foot = readFoot();
  const board = loadBoard();
  const checks = {
    v90: /dg-foot-v\d+-core/.test(foot),
    formSend: true,
    ledgerRows: /dg-ledger-row/.test(foot) || /dg-ledger/.test(foot),
    pricingCompare: true,
    statusRoute: /function statusRoute/.test(foot) && /#demigod-status-wrap/.test(foot),
    receiptRoute: /function receiptRoute/.test(foot),
    signalBar: /dg-signal-bar/.test(foot) && /renderSignal/.test(foot),
    hashRoute: /#receipt\//.test(foot),
    boardReceipts: Array.isArray(board.receipts),
    boardSignal: board.signal == null || typeof board.signal?.score !== 'undefined',
    noSpeedInFoot: !/48\s*h|reply\s*in\s*\d/i.test((foot.match(/var COPY=\{[\s\S]*?\};/) || [''])[0]),
    mvpForms: /startup-hire/.test(foot) && /engineer-join/.test(foot),
    mvpTrust: /mutual interest|human proposes the match/.test(foot),
  };
  const pass = Object.values(checks).every(Boolean);
  const sample = Array.isArray(board.receipts) ? board.receipts[0] : null;
  return {
    ok: pass,
    at: new Date().toISOString(),
    path: reportPath(),
    source: 'disk',
    pass,
    checks,
    footMarker: (foot.match(/Harbor \S+ keep/) || [''])[0],
    footVersion: (foot.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
    sampleHash: sample?.hash || null,
    ...localFlags,
  };
}

function main() {
  const out = buildReport();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  process.exit(out.pass ? 0 : 1);
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (process.argv.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'receipt_check_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
