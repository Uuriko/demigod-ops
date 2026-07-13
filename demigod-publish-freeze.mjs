#!/usr/bin/env node
/**
 * Publish freeze switch — hard-stop real publishes when site is green.
 *
 * State: /tmp/dg-busy/publish-freeze.json + env DEMIGOD_PUBLISH_FREEZE
 *
 * Usage:
 *   node demigod-publish-freeze.mjs status
 *   node demigod-publish-freeze.mjs on  [--why "site green"]
 *   node demigod-publish-freeze.mjs off
 */
import fs from 'fs';
import path from 'path';
import { BUSY, ensureBusy, atomicWrite, readJson, opt } from './demigod-agent-tools-lib.mjs';

const FILE = path.join(BUSY, 'publish-freeze.json');
const args = process.argv.slice(2);
const cmd = args[0] || 'status';

function status() {
  const j = readJson(FILE);
  const envOn = process.env.DEMIGOD_PUBLISH_FREEZE === '1' || process.env.DEMIGOD_PUBLISH_FREEZE === 'true';
  const fileOn = Boolean(j?.on);
  return {
    frozen: envOn || fileOn,
    env: envOn,
    file: fileOn,
    why: j?.why || null,
    at: j?.at || null,
    by: j?.by || null,
    path: FILE,
  };
}

if (cmd === 'status') {
  console.log(JSON.stringify(status(), null, 2));
  process.exit(status().frozen ? 2 : 0);
}

if (cmd === 'on') {
  ensureBusy();
  const rec = {
    on: true,
    at: new Date().toISOString(),
    by: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
    why: opt(args, '--why', 'site green — no thrash'),
  };
  atomicWrite(FILE, JSON.stringify(rec, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, ...rec, hint: 'export DEMIGOD_PUBLISH_FREEZE=1 for child processes' }, null, 2));
  process.exit(0);
}

if (cmd === 'off') {
  ensureBusy();
  atomicWrite(
    FILE,
    JSON.stringify({
      on: false,
      at: new Date().toISOString(),
      by: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
    }, null, 2) + '\n',
  );
  console.log(JSON.stringify({ ok: true, on: false }));
  process.exit(0);
}

console.error('usage: status | on [--why …] | off');
process.exit(2);
