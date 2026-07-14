#!/usr/bin/env node
/**
 * demigod-version-ledger — append-only disk/live/cdn version history
 *
 *   import { appendFromTruth, readLedger, tail } from './demigod-version-ledger.mjs'
 *   node demigod-version-ledger.mjs tail|show [--n 20]
 *
 * File: DEMIGOD-VERSION-LEDGER.jsonl (repo root) + /tmp/dg-busy/version-ledger-tail.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.join(ROOT, 'DEMIGOD-VERSION-LEDGER.jsonl');
const BUSY = '/tmp/dg-busy';

export function appendFromTruth(facts) {
  if (!facts) return null;
  const line = {
    at: facts.at || new Date().toISOString(),
    diskVer: facts.foot?.ver ?? null,
    liveVer: facts.live?.footVer ?? null,
    manifestVer: facts.manifest?.version ?? null,
    diskSha12: facts.foot?.sha12 || (facts.foot?.sha256 || '').slice(0, 12) || null,
    liveSha12: (facts.live?.footSha256 || '').slice(0, 12) || null,
    freeze: Boolean(facts.freeze?.on),
    freezeWhy: facts.freeze?.why || null,
    pass: Boolean(facts.pass),
    driftExpected: Boolean(facts.driftExpected),
    fullyShipped: Boolean(facts.fullyShipped),
    evidenceRunId: facts.evidenceRunId || null,
  };
  fs.appendFileSync(LEDGER, JSON.stringify(line) + '\n');
  try {
    const t = tail(20);
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(path.join(BUSY, 'version-ledger-tail.json'), JSON.stringify(t, null, 2) + '\n');
  } catch {
    /* */
  }
  return line;
}

export function readLedger({ limit = 500 } = {}) {
  try {
    const lines = fs
      .readFileSync(LEDGER, 'utf8')
      .split('\n')
      .filter(Boolean);
    const slice = lines.slice(-limit);
    return slice.map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { raw: l };
      }
    });
  } catch {
    return [];
  }
}

export function tail(n = 10) {
  return readLedger({ limit: n });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const cmd = process.argv[2] || 'tail';
  const nIdx = process.argv.indexOf('--n');
  const n = nIdx >= 0 ? Number(process.argv[nIdx + 1]) || 20 : 20;
  if (cmd === 'tail' || cmd === 'show') {
    const rows = tail(n);
    console.log(JSON.stringify({ path: LEDGER, n: rows.length, rows }, null, 2));
  } else if (cmd === 'path') {
    console.log(LEDGER);
  } else {
    console.error('usage: tail|show [--n 20] | path');
    process.exit(2);
  }
}
