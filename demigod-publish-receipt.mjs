#!/usr/bin/env node
/**
 * Local publish receipts for one data root.
 * A named note stays in that root. This command does not publish or send mail.
 *
 * Usage:
 *   node demigod-publish-receipt.mjs record --note="Harbor East foot" --sha=abc123
 *   node demigod-publish-receipt.mjs latest
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function receiptDir() {
  return path.join(dataRoot(), 'docs', 'receipts');
}

function latestPath() {
  return path.join(receiptDir(), 'PUBLISH-LATEST.json');
}

function logPath() {
  return path.join(receiptDir(), 'PUBLISH-LOG.jsonl');
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

function opt(argv, name) {
  const prefix = `--${name}=`;
  const hit = argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

export function writeReceipt(rec = {}) {
  fs.mkdirSync(receiptDir(), { recursive: true });
  const full = {
    ...rec,
    at: rec.at || new Date().toISOString(),
    schema: 1,
  };
  atomicWrite(latestPath(), JSON.stringify(full, null, 2) + '\n');
  fs.appendFileSync(logPath(), JSON.stringify(full) + '\n');
  return full;
}

export function readLatest() {
  try {
    return JSON.parse(fs.readFileSync(latestPath(), 'utf8'));
  } catch {
    return null;
  }
}

function logCount() {
  try {
    return fs.readFileSync(logPath(), 'utf8').split('\n').filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

function record(argv) {
  if (argv.includes('--publish')) fail('publish_refused');
  const note = opt(argv, 'note').trim();
  if (!note) fail('note_required');
  const sha = opt(argv, 'sha').trim() || null;
  const saved = writeReceipt({
    ok: true,
    note,
    sha,
    sent: false,
    liveMail: false,
    livePublish: false,
  });
  console.log(JSON.stringify({
    ok: true,
    note: saved.note,
    sha: saved.sha,
    count: logCount(),
    path: latestPath(),
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'latest';
  if (cmd === 'record') {
    record(argv.slice(1));
    return;
  }
  if (cmd === 'latest' || cmd === '--json') {
    const latest = readLatest();
    console.log(JSON.stringify({
      ok: true,
      latest,
      path: latestPath(),
      sent: false,
      liveMail: false,
      livePublish: false,
    }));
    return;
  }
  fail('command_invalid');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
