#!/usr/bin/env node
/** Background watchdog — click Cursor Try again every N seconds when crashed. */
import { ROOT, log, sleep, loadState, saveState } from './collab-lib.mjs';
import { spawn } from 'child_process';
import path from 'path';

const INTERVAL_MS = Number(process.env.CURSOR_WATCH_MS || 90000);

log(`cursor-crash-watchdog start interval=${INTERVAL_MS}ms`);

while (true) {
  try {
    await new Promise((resolve) => {
      const child = spawn('node', [path.join(ROOT, 'cursor-retry-crash.mjs')], {
        cwd: ROOT,
        stdio: 'inherit',
      });
      child.on('close', resolve);
    });
    const state = loadState();
    state.lastCursorWatch = new Date().toISOString();
    saveState(state);
  } catch (e) {
    log(`cursor watchdog error: ${e.message || e}`);
  }
  await sleep(INTERVAL_MS);
}