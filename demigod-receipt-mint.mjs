#!/usr/bin/env node
/**
 * Record a named intro receipt on that data root's board.
 * Does not publish, send mail, or invent an intro count.
 *
 * Usage: node demigod-receipt-mint.mjs --note="Harbor East brief" --intros=2
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { loadBoard, saveBoard } from './demigod-submissions-lib.mjs';
import { mintReceipt } from './demigod-board-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function boardFile() {
  return path.join(dataRoot(), 'DEMIGOD-BOARD.json');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function parseArgs(argv) {
  const out = { intros: null, status: 'recorded_local', note: '', publish: false };
  for (const arg of argv) {
    if (arg.startsWith('--intros=')) out.intros = arg.slice(9);
    else if (arg.startsWith('--status=')) out.status = arg.slice(9);
    else if (arg.startsWith('--note=')) out.note = arg.slice(7);
    else if (arg === '--publish') out.publish = true;
    else if (arg === '--no-publish') out.publish = false;
  }
  return out;
}

function parseIntros(raw) {
  if (raw == null || String(raw).trim() === '') return { error: 'intros_required' };
  if (!/^\d+$/.test(String(raw).trim())) return { error: 'intros_invalid' };
  return { value: Number(String(raw).trim()) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.publish) fail('publish_refused');
  const note = String(args.note || '').trim();
  if (!note) fail('note_required');
  const intros = parseIntros(args.intros);
  if (intros.error) fail(intros.error);
  const status = String(args.status || '').trim();
  if (!status) fail('status_required');

  const board = loadBoard();
  const receipt = mintReceipt(board, { intros: intros.value, status, note });
  saveBoard(board, { reason: 'receipt-mint', actor: 'receipt-mint' });
  console.log(JSON.stringify({
    ok: true,
    receipt,
    path: boardFile(),
    sent: false,
    liveMail: false,
    livePublish: false,
    url: null,
  }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
