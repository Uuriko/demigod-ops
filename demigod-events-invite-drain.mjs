#!/usr/bin/env node
/**
 * Absorb human Partiful/Luma invite URLs + print drain board (FOCUS outbox).
 * Never invents URLs or RSVPs. Trust Ladder: human pastes real https URLs only.
 *
 *   node demigod-events-invite-drain.mjs
 */
import fs from 'fs';
import path from 'path';
import {
  runTool,
  loadStore,
  purgeFixtureOutboxFiles,
  purgeOrphanOutboxFiles,
} from './demigod-events-bot-agent.mjs';
import { fileURLToPath } from 'url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && ['-h', '--help'].includes(process.argv[2])) {
  console.log('usage: node demigod-events-invite-drain.mjs');
  process.exit(0);
}
if (isMain && process.argv.length > 2) {
  console.error('usage: node demigod-events-invite-drain.mjs');
  process.exit(2);
}

export function refreshInviteDrain({ dropDir = process.env.DEMIGOD_BUSY || '/tmp/dg-busy' } = {}) {
// Ensure human drop file exists with paste instructions (no invent templates as URLs)
const eventDir = path.join(dropDir, 'events-bot');
const dropPath = path.join(eventDir, 'HUMAN-INVITE-URLS.md');
try {
  fs.mkdirSync(eventDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(eventDir, 0o700);
  if (!fs.existsSync(dropPath)) {
    fs.writeFileSync(
      dropPath,
      [
        '# Human invite URL drop (Events Bot)',
        '',
        'Paste **real** Partiful or Luma https URLs only — one per line.',
        'Formats: bare URL · `platform=luma id=… url=https://…`',
        'Never invent RSVPs or fake invite links.',
        '',
        '',
      ].join('\n'),
      { mode: 0o600 },
    );
  }
  fs.chmodSync(dropPath, 0o600);
} catch {
  /* best-effort */
}

// Prod hygiene: fixture titles → store-unreferenced orphans.
// Referenced draft exports stay until published; age alone must not delete live work.
const purged = purgeFixtureOutboxFiles({ maxDelete: 5000 });
let storeSnap = {};
try {
  storeSnap = loadStore() || {};
} catch {
  storeSnap = {};
}
const orphans = purgeOrphanOutboxFiles({ store: storeSnap, maxDelete: 4000 });
try {
  fs.writeFileSync(
    path.join(eventDir, 'outbox-purge-latest.json'),
    JSON.stringify(
      {
        schema: 'demigod.outbox-purge/2',
        at: new Date().toISOString(),
        fixture: purged,
        orphan: orphans,
        deleted: (purged.deleted || 0) + (orphans.deleted || 0),
        scanned: Math.max(purged.scanned || 0, orphans.scanned || 0),
        capped: !!(purged.capped || orphans.capped),
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  );
} catch {
  /* best-effort */
}

const r = runTool('invite_drain_status', { busyDir: eventDir });
for (const file of [
  dropPath,
  path.join(eventDir, 'outbox-purge-latest.json'),
  path.join(eventDir, 'INVITE-DRAIN.md'),
  path.join(eventDir, 'invite-drain-latest.json'),
]) {
  try {
    if (fs.existsSync(file)) fs.chmodSync(file, 0o600);
  } catch {
    /* best-effort */
  }
}
// report uses hasUrl for recorded count (CLI was reading missing r.recorded → always 0)
const recorded = r?.hasUrl ?? r?.recorded ?? 0;
const out = {
  ok: !!r?.ok,
  eventId: r?.eventId || null,
  total: r?.total ?? 0,
  needsUrl: r?.needsUrl ?? 0,
  optional: r?.optional ?? 0,
  recorded,
  skippedSelftest: r?.skippedSelftest ?? 0,
  outboxPurge: {
    fixture: purged,
    orphan: orphans,
    deleted: (purged.deleted || 0) + (orphans.deleted || 0),
    capped: !!(purged.capped || orphans.capped),
  },
  absorbed: {
    applied: (r?.absorbed?.applied || []).length,
    failed: (r?.absorbed?.failed || []).length,
    dropPath: r?.absorbed?.dropPath || null,
  },
  brief: r?.brief || null,
  json: path.join(eventDir, 'invite-drain-latest.json'),
  purgeJson: path.join(eventDir, 'outbox-purge-latest.json'),
};
return out;
}

if (isMain) {
  const out = refreshInviteDrain();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}
