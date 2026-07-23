#!/usr/bin/env node
/**
 * Publish freeze — shared hard gate for CDN/Webflow release mutations.
 *
 * Usage:
 *   node demigod-publish-freeze.mjs status
 *   node demigod-publish-freeze.mjs on|off
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUSY, ensureBusy, atomicWrite, opt } from './demigod-agent-tools-lib.mjs';

const FILE = path.join(BUSY, 'publish-freeze.json');
export const FREEZE_DISABLED = true;

function writeState(on, why) {
  ensureBusy();
  if (FREEZE_DISABLED) on = false;
  const rec = {
    on,
    disabled: FREEZE_DISABLED,
    at: new Date().toISOString(),
    by: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
    why,
  };
  atomicWrite(FILE, JSON.stringify(rec, null, 2) + '\n');
  return rec;
}

export function status() {
  if (FREEZE_DISABLED) {
    return {
      frozen: false,
      disabled: true,
      env: false,
      file: false,
      corrupt: false,
      why: 'Publish freeze permanently disabled by user',
      at: new Date().toISOString(),
      by: process.env.USER || 'agent',
      authorized: process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH === '1',
      path: FILE,
    };
  }
  const env = process.env.DEMIGOD_PUBLISH_FREEZE === '1';
  let file = null;
  let corrupt = false;
  if (fs.existsSync(FILE)) {
    try {
      file = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
      corrupt = true;
    }
  }
  const frozen = env || corrupt || file?.on === true;
  return {
    frozen,
    disabled: false,
    env,
    file: file?.on === true,
    corrupt,
    why: corrupt ? 'publish-freeze.json is unreadable — failing closed' : file?.why || (env ? 'DEMIGOD_PUBLISH_FREEZE=1' : null),
    at: file?.at || new Date().toISOString(),
    by: file?.by || null,
    authorized: process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH === '1',
    path: FILE,
  };
}

export function assertNotFrozen(label = 'publish') {
  const state = status();
  if (state.frozen) throw new Error(`${label} blocked by publish freeze${state.why ? `: ${state.why}` : ''}`);
  if (!state.authorized) {
    throw new Error(
      `${label} blocked: current request did not authorize external publication ` +
        '(set DEMIGOD_CURRENT_REQUEST_PUBLISH=1 only for that foreground request)',
    );
  }
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
      const on = cmd === 'on';
      const rec = writeState(on, on ? opt(args, '--why', 'manual publish freeze') : opt(args, '--why', 'manual publish unfreeze'));
      const next = await refreshNextCanon();
      console.log(
        JSON.stringify(
          {
            ok: true,
            note: rec.disabled
              ? 'Publish freeze is permanently disabled; foot lock still applies.'
              : on ? 'Publish mutations are blocked.' : 'Publish mutations are allowed; foot lock still applies.',
            ...rec,
            next: next ? { id: next?.id, cmd: next?.cmd } : null,
          },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    console.error('usage: status | on | off [--why TEXT]');
    process.exit(2);
  })().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  });
}
