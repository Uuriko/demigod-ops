#!/usr/bin/env node
/**
 * Publish freeze switch — hard-stop real publishes when site is green.
 *
 * State: DEMIGOD_ROOT/DEMIGOD-PUBLISH-FREEZE.json + env DEMIGOD_PUBLISH_FREEZE. The command does not publish.
 *
 * Usage:
 *   node demigod-publish-freeze.mjs status
 *   node demigod-publish-freeze.mjs on  [--why "site green"]
 *   node demigod-publish-freeze.mjs off
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson, opt } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}
function freezeFile() {
  return path.join(dataRoot(), 'DEMIGOD-PUBLISH-FREEZE.json');
}
const localFlags = { sent: false, liveMail: false, livePublish: false };

export function status() {
  const j = readJson(freezeFile());
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
    path: freezeFile(),
    ...localFlags,
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
  if (args.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  const cmd = args[0] || 'status';

  if (cmd === 'status') {
    console.log(JSON.stringify(status(), null, 2));
    process.exit(status().frozen ? 2 : 0);
  }

  if (cmd === 'on') {
    const rec = {
      on: true,
      at: new Date().toISOString(),
      by: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
      why: opt(args, '--why', 'site green — no thrash'),
    };
    atomicWrite(freezeFile(), JSON.stringify(rec, null, 2) + '\n');
    console.log(
      JSON.stringify(
        { ok: true, ...rec, path: freezeFile(), ...localFlags, hint: 'export DEMIGOD_PUBLISH_FREEZE=1 for child processes' },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  if (cmd === 'off') {
    const rec = {
      on: false,
      at: new Date().toISOString(),
      by: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
    };
    atomicWrite(freezeFile(), JSON.stringify(rec, null, 2) + '\n');
    console.log(JSON.stringify({ ok: true, ...rec, path: freezeFile(), ...localFlags }));
    process.exit(0);
  }

  console.error('usage: status | on [--why …] | off');
  process.exit(2);
}
