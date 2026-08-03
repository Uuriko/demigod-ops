#!/usr/bin/env node
/**
 * demigod-ship-receipt — immutable ship attempt receipt
 *
 *   node demigod-ship-receipt.mjs write [--phase prepare|cdn|paste|verify|run] [--ok 0|1] [--note "…"]
 *   node demigod-ship-receipt.mjs latest [--json]
 *   node demigod-ship-receipt.mjs list [--json]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { getLockWho } from './demigod-foot-lock.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const DIR = path.join(BUSY, 'ship-receipts');
const args = process.argv.slice(2);
const cmd = args[0] || 'latest';
const asJson = args.includes('--json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function diskFoot() {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    return {
      ver: (src.match(/__dgFootVer='(\d+)'/) || [])[1] || null,
      sha256: crypto.createHash('sha256').update(src).digest('hex'),
      bytes: Buffer.byteLength(src),
    };
  } catch {
    return null;
  }
}

function writeReceipt() {
  fs.mkdirSync(DIR, { recursive: true });
  const phaseIdx = args.indexOf('--phase');
  const phase = phaseIdx >= 0 ? args[phaseIdx + 1] : 'manual';
  const allowed = ['prepare', 'cdn', 'paste', 'verify', 'run', 'manual', 'bugfix'];
  if (!allowed.includes(phase)) {
    console.error('invalid --phase; use ' + allowed.join('|'));
    process.exit(2);
  }
  const okIdx = args.indexOf('--ok');
  if (okIdx < 0 || !['0', '1'].includes(String(args[okIdx + 1] || ''))) {
    console.error('ship-receipt write requires --ok 0|1');
    process.exit(2);
  }
  const ok = args[okIdx + 1] === '1';
  const force = args.includes('--force') || args.includes('--manual');
  const noteIdx = args.indexOf('--note');
  const note = noteIdx >= 0 ? args[noteIdx + 1] : null;
  const freeze = freezeStatus();
  let lock = null;
  try {
    lock = getLockWho() || null;
  } catch {
    const raw = readJson(path.join(BUSY, 'foot-lock.json'));
    lock = raw ? { owner: raw.owner, pid: raw.pid, why: raw.why } : null;
  }
  const manifest = readJson(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'));
  const foot = diskFoot();
  const id = `ship_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const rec = {
    schema: 'demigod.ship-receipt/1',
    id,
    at: new Date().toISOString(),
    phase,
    ok,
    note,
    actor: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
    host: process.env.HOSTNAME || null,
    freeze: { on: !!freeze?.frozen, why: freeze?.why || null, by: freeze?.by || null },
    lock: lock ? { owner: lock.owner || null, pid: lock.pid || null, why: lock.why || null } : null,
    disk: foot,
    cdn: manifest
      ? { url: manifest.cdnUrl, ver: manifest.footVer || manifest.version, host: manifest.host, sha256: manifest.sha256 }
      : null,
    attest: readJson(path.join(BUSY, 'live-attest.json')),
  };
  const fp = path.join(DIR, `${id}.json`);
  fs.writeFileSync(fp, JSON.stringify(rec, null, 2));
  fs.writeFileSync(path.join(BUSY, 'ship-receipt-latest.json'), JSON.stringify(rec, null, 2));
  if (asJson) console.log(JSON.stringify(rec, null, 2));
  else console.log(`# ship-receipt ${id} phase=${phase} ok=${ok} foot=v${foot?.ver || '?'}`);
  return rec;
}

function listReceipts() {
  fs.mkdirSync(DIR, { recursive: true });
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 20);
  const rows = files.map((f) => readJson(path.join(DIR, f))).filter(Boolean);
  if (asJson) console.log(JSON.stringify({ at: new Date().toISOString(), n: rows.length, receipts: rows }, null, 2));
  else {
    console.log(`# ship-receipts n=${rows.length}`);
    for (const r of rows) {
      console.log(`  ${r.id} · ${r.phase} · ok=${r.ok} · v${r.disk?.ver || '?'} · ${r.at}`);
    }
  }
}

function latest() {
  const rec = readJson(path.join(BUSY, 'ship-receipt-latest.json'));
  if (!rec) {
    console.error('no ship-receipt-latest.json — write one with: node demigod-ship-receipt.mjs write');
    process.exit(1);
  }
  if (asJson) console.log(JSON.stringify(rec, null, 2));
  else console.log(`# ship-receipt latest ${rec.id} phase=${rec.phase} ok=${rec.ok} v${rec.disk?.ver}`);
}

if (cmd === 'write') writeReceipt();
else if (cmd === 'list') listReceipts();
else if (cmd === 'latest' || cmd === undefined || cmd === '--json') latest();
else {
  console.error('usage: demigod-ship-receipt.mjs write|list|latest [--json] [--ok 0|1] [--phase …]');
  process.exit(2);
}
