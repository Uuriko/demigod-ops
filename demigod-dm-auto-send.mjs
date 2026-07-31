#!/usr/bin/env node
/**
 * Legacy DM entry point retained for dry draft validation only.
 * Delivery is permanently disabled; no environment variable widens authority.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
// Prefer DEMIGOD_BUSY (same as demand/evidence/export); keep DG_BUSY as legacy alias.
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const OUTREACH = path.join(ROOT, 'demigod-outreach');
const OPS = path.join(ROOT, 'demigod-ops');

function parseArgs(argv) {
  const names = [];
  for (const arg of argv) {
    if (arg.startsWith('--name=')) names.push(arg.slice(7));
    else if (arg.startsWith('--names=')) names.push(...arg.slice(8).split(',').map((s) => s.trim()).filter(Boolean));
  }
  return { names, dry: argv.includes('--dry') };
}

function parseQueue() {
  const md = fs.readFileSync(path.join(OPS, 'SEND-QUEUE-PRIORITIZED.md'), 'utf8');
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('|') || /Prio|Name|----/.test(line)) continue;
    const cells = line.split('|').map((cell) => cell.trim()).slice(1, -1);
    if (cells.length >= 4 && cells[1]) rows.push({ name: cells[1], handle: cells[2] });
  }
  return rows;
}

function loadBody(name) {
  const slug = name.toLowerCase().replace(/\W+/g, '');
  try {
    const dir = path.join(OUTREACH, 'ready-emails');
    const hit = fs.readdirSync(dir).find((file) => file.endsWith('.txt') && file.includes(slug));
    if (hit) {
      return fs.readFileSync(path.join(dir, hit), 'utf8')
        .split('\n')
        .filter((line) => !line.startsWith('#') && !line.startsWith('//'))
        .join('\n')
        .trim();
    }
  } catch {
    // Fall through to the canonical draft command.
  }
  const result = spawnSync(process.execPath, [path.join(ROOT, 'demigod-demand.mjs'), 'draft', `--name=${name}`, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15000,
  });
  try {
    const parsed = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
    return String(parsed.body || '');
  } catch {
    return '';
  }
}

function writeReport(report, stream = process.stdout) {
  writeJsonAuto(path.join(BUSY, 'dm-auto-send.json'), report);
  stream.write(JSON.stringify(report, null, 2) + '\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dry) {
    writeReport({
      schema: 'demigod.dm-auto-send/1',
      at: new Date().toISOString(),
      policy: 'drafts-only',
      dry: false,
      error: 'auto_dm_stopped',
      overrideAllowed: false,
      hint: 'Use bin/dg demand draft --name=NAME; this tool has no delivery path.',
      results: [],
    }, process.stderr);
    process.exitCode = 2;
    return;
  }

  const queue = parseQueue();
  const names = args.names.length ? args.names : queue.slice(0, 3).map((row) => row.name);
  writeReport({
    schema: 'demigod.dm-auto-send/1',
    at: new Date().toISOString(),
    policy: 'drafts-only',
    dry: true,
    results: names.map((name) => {
      const row = queue.find((item) => item.name.toLowerCase() === name.toLowerCase());
      return { ok: true, dry: true, name, handle: row?.handle || '', bodyChars: loadBody(name).length };
    }),
  });
}

main();
