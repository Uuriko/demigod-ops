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
import { fileURLToPath } from 'url';

export function status() {
  const j = readJson(FILE);
  const envOn =
    process.env.DEMIGOD_PUBLISH_FREEZE === '1' ||
    process.env.DEMIGOD_PUBLISH_FREEZE === 'true' ||
    process.env.DEMIGOD_PUBLISH_FREEZE === 'yes' ||
    process.env.DEMIGOD_PUBLISH_FREEZE === 'on';
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

/** Exit 1 if freeze is on (unless DEMIGOD_FORCE_PUBLISH=1). */
export function assertNotFrozen(label = 'publish') {
  if (process.env.DEMIGOD_FORCE_PUBLISH === '1') {
    console.warn(`[freeze] FORCE_PUBLISH override for ${label}`);
    return;
  }
  const s = status();
  if (s.frozen) {
    console.error(
      JSON.stringify(
        {
          error: 'publish_frozen',
          label,
          why: s.why,
          at: s.at,
          hint: 'node demigod-publish-freeze.mjs off   # or DEMIGOD_FORCE_PUBLISH=1',
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';

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
    console.log(
      JSON.stringify(
        { ok: true, ...rec, hint: 'export DEMIGOD_PUBLISH_FREEZE=1 for child processes' },
        null,
        2,
      ),
    );
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
}
