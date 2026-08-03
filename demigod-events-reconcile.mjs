#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadStore,
  reconcilePlatformDrafts,
  saveStore,
  withEventsStoreLock,
} from './demigod-events-bot-agent.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-EVENTS.json');
const OUT = path.join(process.env.DEMIGOD_BUSY || '/tmp/dg-busy', 'events-bot');
const RECEIPT = path.join(OUT, 'preplan-native-cleanup-proposal.json');
const apply = process.argv.slice(2).includes('--apply-production-foreground');

if (process.argv.length > (apply ? 3 : 2) || (process.env.DEMIGOD_EVENTS_STORE && path.resolve(process.env.DEMIGOD_EVENTS_STORE) !== STORE)) {
  console.error(JSON.stringify({ ok: false, error: 'production_store_only' }));
  process.exit(2);
}

const result = withEventsStoreLock(() => {
  const store = loadStore();
  const proposed = structuredClone(store);
  const removed = reconcilePlatformDrafts(proposed);
  let backup = null;
  if (apply && removed) {
    fs.mkdirSync(OUT, { recursive: true });
    backup = path.join(OUT, `DEMIGOD-EVENTS.pre-reconcile.${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
    saveStore(proposed);
  }
  return { ok: true, applied: apply, removed, backup };
});

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(RECEIPT, JSON.stringify({ ...result, receipt: RECEIPT, at: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ ...result, receipt: RECEIPT }));
