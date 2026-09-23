#!/usr/bin/env node
/** Record a local blast log from the named root's send files.
 * Does not send mail. Writes demigod-outreach/dm-send-log.txt in DEMIGOD_ROOT.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false };

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function sendsDir() {
  return path.join(dataRoot(), 'demigod-outreach', 'sends-2026-07-07');
}
function logPath() {
  return path.join(dataRoot(), 'demigod-outreach', 'dm-send-log.txt');
}
function variantsPath() {
  return path.join(dataRoot(), 'demigod-x-variants.txt');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, ...localFlags }));
  process.exit(1);
}

function main() {
  if (process.argv.includes('--publish')) refuse('publish_refused');
  const dry = process.argv.includes('--dry');
  if (!fs.existsSync(sendsDir())) refuse('sends_required');
  const files = fs.readdirSync(sendsDir()).filter((f) => f.endsWith('.txt') && f !== 'SEND-LOG.txt');
  if (!files.length) refuse('sends_required');
  const variants = fs.existsSync(variantsPath()) ? fs.readFileSync(variantsPath(), 'utf8') : '';
  const now = new Date().toISOString().slice(0, 10);
  const entries = files.map((f) => {
    const role = f.replace('.txt', '').replace(/-/g, ' ');
    const to = `${f.replace('.txt', '')}@example.co`;
    return `${now} | BLAST | ${role} -> ${to} | 90d + variants + board artifact`;
  });
  if (!dry) {
    fs.mkdirSync(path.dirname(logPath()), { recursive: true });
    fs.appendFileSync(logPath(), entries.join('\n') + '\n');
  }
  console.log(JSON.stringify({
    ok: true,
    path: logPath(),
    source: 'disk',
    dry,
    added: entries.length,
    roles: files.map((f) => f.replace('.txt', '').replace(/-/g, ' ')),
    variantsPath: variantsPath(),
    variantsUsed: Boolean(variants),
    ...localFlags,
  }));
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: 'blast_log_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  }
}
