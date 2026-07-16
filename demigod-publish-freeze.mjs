#!/usr/bin/env node
/**
 * Publish freeze — DISABLED for now (user request 2026-07-16).
 *
 * Module kept so imports/assertNotFrozen call sites stay stable.
 * Always reports unfrozen; on/off are no-ops that clear any stale file.
 *
 * State path (legacy): /tmp/dg-busy/publish-freeze.json
 *
 * Usage:
 *   node demigod-publish-freeze.mjs status
 *   node demigod-publish-freeze.mjs on|off   # no-op, forces off
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUSY, ensureBusy, atomicWrite, opt } from './demigod-agent-tools-lib.mjs';

const FILE = path.join(BUSY, 'publish-freeze.json');
/** Set false to re-enable real freeze behavior later. */
export const FREEZE_DISABLED = true;

function writeOff(why = 'freeze disabled — always off') {
  ensureBusy();
  const rec = {
    on: false,
    disabled: true,
    at: new Date().toISOString(),
    by: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
    why,
  };
  atomicWrite(FILE, JSON.stringify(rec, null, 2) + '\n');
  return rec;
}

export function status() {
  // Ignore env + file while disabled
  return {
    frozen: false,
    disabled: true,
    env: false,
    file: false,
    why: 'freeze disabled (entirely off for now)',
    at: new Date().toISOString(),
    by: null,
    path: FILE,
  };
}

/** No-op while freeze is disabled. */
export function assertNotFrozen(label = 'publish') {
  if (FREEZE_DISABLED) return;
  // re-enable path left for later restore
  if (process.env.DEMIGOD_FORCE_PUBLISH === '1') return;
  void label;
}

/** Dynamic import avoids cycle: control → next → freeze → control */
async function refreshNextCanon() {
  try {
    const { refreshNextCanon: refresh } = await import('./demigod-control.mjs');
    return refresh();
  } catch {
    return null;
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'status';

  (async () => {
    if (cmd === 'status') {
      console.log(JSON.stringify(status(), null, 2));
      process.exit(0);
    }

    if (cmd === 'on' || cmd === 'off') {
      const rec = writeOff(
        cmd === 'on'
          ? `freeze disabled — ignored on --why ${opt(args, '--why', 'n/a')}`
          : 'freeze disabled — off',
      );
      const next = await refreshNextCanon();
      console.log(
        JSON.stringify(
          {
            ok: true,
            on: false,
            disabled: true,
            note: 'Publish freeze removed for now; mutate allowed (foot-lock still applies).',
            ...rec,
            next: next ? { id: next?.id, cmd: next?.cmd } : null,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    console.error('usage: status | on | off  (all no-op while freeze disabled)');
    process.exit(2);
  })().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  });
}
