#!/usr/bin/env node
/**
 * Append-only publish receipts (hash chain: disk → CDN → live).
 * Written by the canonical ship path; readable by claim-verify / ship-status / dashboard.
 *
 * CLI:
 *   node demigod-publish-receipt.mjs
 *   node demigod-publish-receipt.mjs latest
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUSY, ensureBusy, atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(ROOT, 'docs', 'receipts');
const LATEST = path.join(DIR, 'PUBLISH-LATEST.json');
const LOG = path.join(DIR, 'PUBLISH-LOG.jsonl');

export function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

export function writeReceipt(rec) {
  ensureDir();
  const full = {
    ...rec,
    at: rec.at || new Date().toISOString(),
    schema: 1,
  };
  atomicWrite(LATEST, JSON.stringify(full, null, 2) + '\n');
  fs.appendFileSync(LOG, JSON.stringify(full) + '\n');
  try {
    ensureBusy();
    atomicWrite(path.join(BUSY, 'publish-receipt-latest.json'), JSON.stringify(full, null, 2) + '\n');
  } catch {
    /* */
  }
  return full;
}

export function readLatest() {
  try {
    return JSON.parse(fs.readFileSync(LATEST, 'utf8'));
  } catch {
    return null;
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  if (process.argv[2] === 'latest') {
    console.log(JSON.stringify(readLatest(), null, 2));
  } else {
    console.log(JSON.stringify({ latestPath: LATEST, logPath: LOG, latest: readLatest() }, null, 2));
  }
}
