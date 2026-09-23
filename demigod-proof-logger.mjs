#!/usr/bin/env node
/**
 * Record a named intro proof in that data root.
 * Does not publish, send mail, or post the local draft.
 *
 * Usage: node demigod-proof-logger.mjs --intro "Harbor East intro" --detail "2 interviews booked"
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function proofLogPath() {
  return path.join(dataRoot(), 'DEMIGOD-PROOF-LOG.json');
}

function embedPath() {
  return path.join(dataRoot(), 'DEMIGOD-PROOF-EMBED.json');
}

function assetsDir() {
  return path.join(dataRoot(), 'demigod-outreach', 'proof-assets');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
    posted: false,
  }));
  process.exit(1);
}

function parseArgs(argv) {
  const out = { intro: '', detail: '', type: 'strong_intro', force: false, publish: false, proof: '' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--intro' && argv[i + 1]) out.intro = argv[++i];
    else if (arg.startsWith('--intro=')) out.intro = arg.slice(8);
    else if (arg === '--detail' && argv[i + 1]) out.detail = argv[++i];
    else if (arg.startsWith('--detail=')) out.detail = arg.slice(9);
    else if (arg === '--type' && argv[i + 1]) out.type = argv[++i];
    else if (arg.startsWith('--type=')) out.type = arg.slice(7);
    else if (arg === '--proof' && argv[i + 1]) out.proof = argv[++i];
    else if (arg.startsWith('--proof=')) out.proof = arg.slice(8);
    else if (arg === '--force') out.force = true;
    else if (arg === '--publish') out.publish = true;
  }
  return out;
}

function loadLog() {
  try {
    const parsed = JSON.parse(fs.readFileSync(proofLogPath(), 'utf8'));
    return Array.isArray(parsed.entries) ? parsed : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function tweetTemplate(entry) {
  return [
    `SF startup hiring update — ${entry.intro}`,
    entry.detail ? entry.detail : 'Human-matched intro, no marketplace spam.',
    '',
    'Human-matched SF startup talent → trydemigod.com',
    '10% on hire only · hello@trydemigod.com',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.publish) fail('publish_refused');
  const intro = String(args.intro || '').trim();
  if (!intro) fail('intro_required');
  const detail = String(args.detail || '').trim();
  if (!args.force && /dummy|fake|test|shadow|placeholder/i.test(`${intro} ${detail}`)) fail('intro_refused');

  const id = `proof-${crypto.randomBytes(4).toString('hex')}`;
  const entry = {
    id,
    at: new Date().toISOString(),
    type: args.type || 'strong_intro',
    intro,
    detail,
    proofFile: null,
  };

  fs.mkdirSync(assetsDir(), { recursive: true });
  if (args.proof && fs.existsSync(args.proof)) {
    const ext = path.extname(args.proof) || '.png';
    const dest = path.join(assetsDir(), `${id}${ext}`);
    fs.copyFileSync(args.proof, dest);
    entry.proofFile = path.relative(dataRoot(), dest);
  }

  const log = loadLog();
  log.entries = (log.entries || []).slice(-99);
  log.entries.push(entry);
  fs.writeFileSync(proofLogPath(), JSON.stringify(log, null, 2) + '\n');
  fs.writeFileSync(embedPath(), JSON.stringify({
    at: entry.at,
    matchRows: log.entries.slice(-3).map((row) => [row.intro, row.detail || row.type]),
    count: log.entries.length,
    posted: false,
  }, null, 2) + '\n');
  const tweetPath = path.join(assetsDir(), `${id}-tweet.txt`);
  fs.writeFileSync(tweetPath, tweetTemplate(entry));

  console.log(JSON.stringify({
    ok: true,
    id,
    intro,
    detail,
    count: log.entries.length,
    path: proofLogPath(),
    tweetFile: tweetPath,
    sent: false,
    liveMail: false,
    livePublish: false,
    posted: false,
  }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
